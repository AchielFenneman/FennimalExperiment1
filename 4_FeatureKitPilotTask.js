/**
 * Feature-kit stimulus pilot: slot-duel 2AFC.
 *
 * Center probe is a recombination of two parent heads that share three slots
 * and differ on two. Choosing a parent means that parent's unique slot won
 * the duel. Between-subjects: 3 tokens sampled per slot from the live SVG.
 * No morphing, names, hats, map, or bonus stars.
 */
class FeatureKitPilotController {
    constructor(parentLayer, phaseData, returnfunc, expCont) {
        this.ParentLayer = parentLayer;
        this.phaseData = phaseData || {};
        this.returnfunc = returnfunc;
        this.expCont = expCont;
        this.params = (typeof GenParam !== "undefined" && GenParam.FeatureKitPilot) || {};
        this.W = GenParam.SVG_width;
        this.H = GenParam.SVG_height;
        this.trialSpeedMs = this._num("trialSpeedMs", this.phaseData.trial_speed || 7500);
        this.nTokensSampled = this._int("nTokensSampled", this.phaseData.n_tokens_sampled, 3);
        this.nDuelReps = this._int("nDuelReps", this.phaseData.n_duel_reps, 3);
        this.nCatch = this._int("nCatch", this.phaseData.n_catch, 3);
        this.skipPractice = this.phaseData.skip_practice === true;
        this.minChoiceMs = this._num("minChoiceMs", 750);
        this.adaptive = this.phaseData.adaptive !== false && this.params.adaptive !== false;
        this.grayscaleFilter = this.params.grayscaleFilter || "grayscale(100%)";
        this.plannedCount = 0;
        this._tokenPairs = {};
        this._tokenPairCursor = {};
        this._catchMade = 0;
        this._adaptiveSeq = 0;

        this.kit = new FeatureKit();
        this.answers = [];
        this.queue = [];
        this.destroyed = false;
        this.inputLocked = true;
        this.sceneRoot = null;
        this.layers = null;
        this.currentTrial = null;
        this.currentTrialIndex = -1;
        this._choiceResolve = null;
        this._barRaf = null;
        this._keyF = null;
        this._keyJ = null;
        this._boundKeyDown = (evt) => this._onKeyDown(evt);
        this._boundKeyUp = (evt) => this._onKeyUp(evt);

        this.phaseData.answers = this.answers;
        this.phaseData.trial_speed = this.trialSpeedMs;
        this.phaseData.bonus_stars_earned = 0;
    }

    static countMaxEarnableStars() {
        return 0;
    }

    _num(key, fallback) {
        let n = Number(this.params[key]);
        return Number.isFinite(n) ? n : fallback;
    }

    _int(key, phaseVal, fallback) {
        let n = Number(phaseVal);
        if (Number.isFinite(n) && n >= 0) return Math.round(n);
        n = Number(this.params[key]);
        if (Number.isFinite(n) && n >= 0) return Math.round(n);
        return fallback;
    }

    _fail(message) {
        throw new Error("FeatureKitPilot: " + message);
    }

    _persist(key, value) {
        let dataCont = this.expCont && this.expCont.dataCont;
        if (!dataCont || !dataCont.experimentData) return;
        if (!dataCont.experimentData.phaseRandomizations) dataCont.experimentData.phaseRandomizations = {};
        dataCont.experimentData.phaseRandomizations[key] = value;
        if (typeof dataCont.storeAllData === "function") dataCont.storeAllData(false);
    }

    _restore(key) {
        let dataCont = this.expCont && this.expCont.dataCont;
        if (!dataCont || !dataCont.experimentData || !dataCont.experimentData.phaseRandomizations) return null;
        return dataCont.experimentData.phaseRandomizations[key] || null;
    }

    async start_sequence() {
        try {
            await this.kit.load();
            this._sampleTokens();
            this._buildQueue();
            this._ensureLayers();
            this.ParentLayer.style.display = "inherit";
            if (typeof Interface !== "undefined") {
                if (Interface.FenneFinder && Interface.FenneFinder.hide) Interface.FenneFinder.hide();
                if (Interface.Prompt) Interface.Prompt.hide();
                if (Interface.player_moved_to_new_region) Interface.player_moved_to_new_region("Home");
                if (Interface.Locator && Interface.Locator.change_locator_name) {
                    Interface.Locator.change_locator_name("Photo room");
                }
            }
            this.plannedCount = this._plannedCount();
            this.phaseData.number_interactions_in_phase = this.plannedCount;
            this.phaseData.Data = this.answers;
            window.addEventListener("keydown", this._boundKeyDown);
            window.addEventListener("keyup", this._boundKeyUp);

            for (let i = 0; i < this.queue.length; i++) {
                if (this.destroyed) return;
                this.currentTrialIndex = i;
                this.currentTrial = this.queue[i];
                if (this.expCont && this.expCont.instrCont && this.expCont.instrCont.updateProgressWithinDay) {
                    this.expCont.instrCont.updateProgressWithinDay((i / this.plannedCount) * 100);
                }
                if (this.expCont && this.expCont.prepareMorphTrialTravel) {
                    await this.expCont.prepareMorphTrialTravel(this.currentTrial);
                }
                if (typeof Interface !== "undefined" && Interface.Locator && Interface.Locator.change_locator_name) {
                    Interface.Locator.change_locator_name("Photo room");
                }
                if (this.destroyed) return;
                await this._runTrial(this.currentTrial);
                if (i === this.queue.length - 1) {
                    let extra = this._nextAdaptiveTrial();
                    if (extra) {
                        this.queue.push(extra);
                        this._persistQueue();
                    }
                }
            }
            this._finishPhase();
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    clean_up() {
        this.destroyed = true;
        this.inputLocked = true;
        this._stopBars();
        if (this._choiceResolve) {
            this._choiceResolve = null;
        }
        window.removeEventListener("keydown", this._boundKeyDown);
        window.removeEventListener("keyup", this._boundKeyUp);
        if (this.sceneRoot && this.sceneRoot.parentNode) this.sceneRoot.parentNode.removeChild(this.sceneRoot);
        this.sceneRoot = null;
        this.layers = null;
    }

    _finishPhase() {
        this.phaseData.answers = this.answers;
        this.phaseData.Data = this.answers;
        this.phaseData.bonus_stars_earned = 0;
        this.phaseData.sampled_tokens = this.sampledTokens;
        this.phaseData.catalog_tokens = this.catalogTokens;
        this.phaseData.n_tokens_sampled = this.nTokensSampled;
        this.phaseData.n_duel_reps = this.nDuelReps;
        this.phaseData.n_catch = this.nCatch;
        this.phaseData.slot_keys = (this.slotKeys || []).slice();
        if (typeof this.returnfunc === "function") this.returnfunc();
    }

    _sampleTokens() {
        let slotKeys = FeatureKit.slotKeys().filter((key) => this.kit.tokensForPilot(key).length >= 2);
        if (slotKeys.length < 2) {
            this._fail("need at least two feature groups with 2+ tokens in Heads features.svg.");
        }
        this.slotKeys = slotKeys;
        this.catalogTokens = {};
        slotKeys.forEach((key) => {
            this.catalogTokens[key] = this.kit.tokensForPilot(key).slice();
        });

        let stored = this._restore("feature_kit_pilot_tokens");
        let sampled = {};
        let validStored = stored
            && stored.tokens
            && typeof stored.tokens === "object"
            && this._catalogsMatch(stored.catalog, this.catalogTokens);
        slotKeys.forEach((key) => {
            let pool = this.catalogTokens[key].slice();
            let keep = [];
            if (validStored && Array.isArray(stored.tokens[key])) {
                stored.tokens[key].forEach((token) => {
                    if (pool.indexOf(token) >= 0 && keep.indexOf(token) < 0) keep.push(token);
                });
            }
            if (keep.length >= 2) {
                sampled[key] = keep.slice(0, Math.max(2, Math.min(this.nTokensSampled, pool.length)));
                return;
            }
            let shuffled = shuffleArray(pool.slice());
            let n = Math.max(2, Math.min(this.nTokensSampled, shuffled.length));
            sampled[key] = shuffled.slice(0, n);
        });
        this.sampledTokens = sampled;
        this._persist("feature_kit_pilot_tokens", {
            tokens: JSON.parse(JSON.stringify(sampled)),
            catalog: JSON.parse(JSON.stringify(this.catalogTokens)),
            n_tokens_sampled: this.nTokensSampled,
            n_duel_reps: this.nDuelReps,
            n_catch: this.nCatch,
            slot_keys: slotKeys.slice()
        });
        this.phaseData.sampled_tokens = sampled;
        this.phaseData.catalog_tokens = this.catalogTokens;
        console.log(
            "%c FeatureKitPilot: sampled tokens " + JSON.stringify(sampled),
            "color:#0b6; font-weight:bold"
        );
    }

    _blankRecipe() {
        return {
            expression: "happy",
            scales: { ear: 1, eye: 1, lowerFace: 1, hair: 1 }
        };
    }

    _fillRecipe(spec) {
        let rec = Object.assign(this._blankRecipe(), spec || {});
        this.slotKeys.forEach((key) => {
            if (!rec[key]) rec[key] = this.sampledTokens[key][0];
        });
        return this.kit.normalizeRecipe(rec);
    }

    _randomFullRecipe(avoid) {
        let rec = this._blankRecipe();
        this.slotKeys.forEach((key) => {
            let pool = this.sampledTokens[key].slice();
            if (avoid && avoid[key]) {
                pool = pool.filter((t) => t !== avoid[key]);
                if (!pool.length) pool = this.sampledTokens[key].slice();
            }
            rec[key] = pool[experimentRandomInt(pool.length)];
        });
        return this._fillRecipe(rec);
    }

    _plannedCount() {
        let nPairs = FeatureKit.unorderedPairs(this.slotKeys || []).length;
        return (this.skipPractice ? 0 : 2) + nPairs * this.nDuelReps + this.nCatch;
    }

    _persistQueue() {
        this._persist("feature_kit_pilot_trials", {
            version: 2,
            adaptive: this.adaptive,
            queue: this.queue
        });
        this.phaseData.morph_trial_order = this.queue.map((t) => t.id);
    }

    _initTokenPairDecks() {
        this._tokenPairs = {};
        this._tokenPairCursor = {};
        (this.slotKeys || []).forEach((key) => {
            this._tokenPairs[key] = shuffleArray(FeatureKit.unorderedPairs(this.sampledTokens[key]));
            this._tokenPairCursor[key] = 0;
        });
    }

    _nextTokenPair(slot) {
        let pairs = this._tokenPairs[slot] || [];
        if (!pairs.length) return [this.sampledTokens[slot][0], this.sampledTokens[slot][1]];
        let i = this._tokenPairCursor[slot] % pairs.length;
        this._tokenPairCursor[slot] += 1;
        let pair = pairs[i].slice();
        if (experimentRandom() < 0.5) pair.reverse();
        return pair;
    }

    _countKind(kind) {
        return this.queue.filter((t) => t && t.kind === kind && !t.is_practice).length;
    }

    _maxDuels() {
        return FeatureKit.unorderedPairs(this.slotKeys || []).length * this.nDuelReps;
    }

    _slotWinRates() {
        let wins = {};
        let n = {};
        (this.slotKeys || []).forEach((key) => {
            wins[key] = 0;
            n[key] = 0;
        });
        this.answers.forEach((row) => {
            if (!row || row.kind !== "duel" || !row.winner_slot) return;
            n[row.winner_slot] = (n[row.winner_slot] || 0) + 1;
            n[row.loser_slot] = (n[row.loser_slot] || 0) + 1;
            wins[row.winner_slot] = (wins[row.winner_slot] || 0) + 1;
        });
        let rates = {};
        (this.slotKeys || []).forEach((key) => {
            rates[key] = n[key] ? wins[key] / n[key] : 0.5;
        });
        return rates;
    }

    _pairWeight(sx, sy) {
        let rates = this._slotWinRates();
        let close = 1 - Math.abs((rates[sx] || 0.5) - (rates[sy] || 0.5));
        let strong = Math.max(rates[sx] || 0.5, rates[sy] || 0.5);
        let seen = this.queue.filter((t) => t.kind === "duel" && (
            (t.slot_x === sx && t.slot_y === sy) || (t.slot_x === sy && t.slot_y === sx)
        )).length;
        let explore = 1 / (1 + seen);
        return 0.45 * close + 0.35 * strong + 0.20 * explore;
    }

    _pickAdaptivePair() {
        let pairs = FeatureKit.unorderedPairs(this.slotKeys);
        let weights = pairs.map((p) => Math.max(0.02, this._pairWeight(p[0], p[1])));
        let sum = weights.reduce((a, b) => a + b, 0);
        let pick = experimentRandom() * sum;
        for (let i = 0; i < pairs.length; i++) {
            pick -= weights[i];
            if (pick <= 0) return pairs[i];
        }
        return pairs[pairs.length - 1];
    }

    _makeDuelTrial(sx, sy, wave) {
        let px = this._nextTokenPair(sx);
        let py = this._nextTokenPair(sy);
        let shared = {};
        this.slotKeys.forEach((key) => {
            if (key === sx || key === sy) return;
            let pool = this.sampledTokens[key];
            shared[key] = pool[experimentRandomInt(pool.length)];
        });
        let parentA = this._fillRecipe(Object.assign({}, shared, { [sx]: px[0], [sy]: py[0] }));
        let parentB = this._fillRecipe(Object.assign({}, shared, { [sx]: px[1], [sy]: py[1] }));
        let probe = this._fillRecipe(Object.assign({}, shared, { [sx]: px[0], [sy]: py[1] }));
        this._adaptiveSeq += 1;
        return {
            id: "duel_" + wave + "_" + sx + "_" + sy + "_" + this._adaptiveSeq,
            kind: "duel",
            is_practice: false,
            wave: wave,
            slot_x: sx,
            slot_y: sy,
            token_x_a: px[0],
            token_x_b: px[1],
            token_y_a: py[0],
            token_y_b: py[1],
            shared_tokens: shared,
            parentA: parentA,
            parentB: parentB,
            probe: probe,
            left_parent: experimentRandom() < 0.5 ? "A" : "B",
            tutorial: null,
            slot_win_rates: wave === "adaptive" ? this._slotWinRates() : null
        };
    }

    _makeCatchTrial(wave) {
        let parentA = this._randomFullRecipe(null);
        let parentB = this._randomFullRecipe(parentA);
        let probeIsA = experimentRandom() < 0.5;
        this._catchMade += 1;
        return {
            id: "catch_" + wave + "_" + this._catchMade,
            kind: "catch",
            is_practice: false,
            wave: wave,
            parentA: parentA,
            parentB: parentB,
            probe: probeIsA ? parentA : parentB,
            catch_parent: probeIsA ? "A" : "B",
            left_parent: experimentRandom() < 0.5 ? "A" : "B"
        };
    }

    _nextAdaptiveTrial() {
        if (!this.adaptive) return null;
        let nDuel = this._countKind("duel");
        let nCatch = this._countKind("catch");
        let maxDuel = this._maxDuels();
        if (nDuel >= maxDuel && nCatch >= this.nCatch) return null;
        let duelsLeft = Math.max(0, maxDuel - nDuel);
        let catchLeft = Math.max(0, this.nCatch - nCatch);
        let takeCatch = catchLeft > 0 && (duelsLeft <= 0 || experimentRandom() < catchLeft / (duelsLeft + catchLeft));
        if (takeCatch) return this._makeCatchTrial("adaptive");
        let pair = this._pickAdaptivePair();
        return this._makeDuelTrial(pair[0], pair[1], "adaptive");
    }

    _buildQueue() {
        this._initTokenPairDecks();
        let stored = this._restore("feature_kit_pilot_trials");
        if (stored && stored.version === 2 && Array.isArray(stored.queue) && stored.queue.length
            && this._queueUsesCurrentTokens(stored.queue)) {
            this.queue = stored.queue;
            this.phaseData.morph_trial_order = this.queue.map((t) => t.id);
            return;
        }

        let queue = [];
        if (!this.skipPractice) {
            queue.push(this._practiceTrial("practice_circle", "circle", "square", "circle"));
            queue.push(this._practiceTrial("practice_square", "square", "circle", "square"));
        }

        let coverageReps = this.adaptive ? 1 : this.nDuelReps;
        let coverageCatch = this.adaptive ? Math.max(0, this.nCatch - 1) : this.nCatch;
        let paid = [];
        FeatureKit.unorderedPairs(this.slotKeys).forEach((pair) => {
            for (let r = 0; r < coverageReps; r++) {
                paid.push(this._makeDuelTrial(pair[0], pair[1], "coverage"));
            }
        });
        for (let c = 0; c < coverageCatch; c++) {
            paid.push(this._makeCatchTrial("coverage"));
        }

        this.queue = queue.concat(shuffleArray(paid));
        let firstPaid = this.queue.find((trial) => trial && !trial.is_practice);
        if (firstPaid) firstPaid.tutorial = "paid";
        this._persistQueue();
        console.log(
            "%c FeatureKitPilot: coverage " + this._countKind("duel") + " duels / " +
            this._countKind("catch") + " catch" +
            (this.adaptive ? (" → adaptive to " + this._plannedCount() + " total") : "") +
            ", " + (this.skipPractice ? 0 : 2) + " practice",
            "color:#0b6"
        );
    }

    _practiceTrial(id, leftShape, rightShape, probeShape) {
        return {
            id: id,
            kind: "practice",
            is_practice: true,
            tutorial: id === "practice_circle" ? "practice" : null,
            left_parent: "A",
            parentA: { shape: leftShape },
            parentB: { shape: rightShape },
            probe: { shape: probeShape },
            catch_parent: probeShape === leftShape ? "A" : "B"
        };
    }

    _catalogsMatch(a, b) {
        if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
        let keys = this.slotKeys || FeatureKit.slotKeys();
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let aa = ((a[key] || []).slice()).sort().join("\n");
            let bb = ((b[key] || []).slice()).sort().join("\n");
            if (aa !== bb) return false;
        }
        return true;
    }

    _queueUsesCurrentTokens(queue) {
        if (!Array.isArray(queue) || !queue.length) return false;
        let sampled = this.sampledTokens || {};
        for (let t = 0; t < queue.length; t++) {
            let trial = queue[t];
            if (!trial || trial.kind === "practice") continue;
            if (trial.kind === "duel") {
                if (this.slotKeys.indexOf(trial.slot_x) < 0 || this.slotKeys.indexOf(trial.slot_y) < 0) {
                    return false;
                }
            }
            let recs = [trial.parentA, trial.parentB, trial.probe];
            for (let r = 0; r < recs.length; r++) {
                let rec = recs[r];
                if (!rec || rec.shape) continue;
                for (let s = 0; s < this.slotKeys.length; s++) {
                    let key = this.slotKeys[s];
                    let token = rec[key];
                    if (!token) continue;
                    if (!sampled[key] || sampled[key].indexOf(token) < 0) return false;
                }
            }
        }
        return true;
    }

    _ensureLayers() {
        if (this.sceneRoot) return;
        this.sceneRoot = create_SVG_group(0, 0, "kit_pilot_root", "kit_pilot_root");
        let defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        let filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
        filter.setAttribute("id", "kit_pilot_gray");
        let matrix = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix");
        matrix.setAttribute("type", "saturate");
        matrix.setAttribute("values", "0");
        filter.appendChild(matrix);
        defs.appendChild(filter);
        this.sceneRoot.appendChild(defs);
        this.layers = {
            Back: create_SVG_group(0, 0, "kit_pilot_back"),
            Main: create_SVG_group(0, 0, "kit_pilot_main"),
            Hud: create_SVG_group(0, 0, "kit_pilot_hud")
        };
        this.sceneRoot.appendChild(this.layers.Back);
        this.sceneRoot.appendChild(this.layers.Main);
        this.sceneRoot.appendChild(this.layers.Hud);
        this.ParentLayer.appendChild(this.sceneRoot);
    }

    _clearMain() {
        while (this.layers.Main.firstChild) this.layers.Main.removeChild(this.layers.Main.firstChild);
        while (this.layers.Hud.firstChild) this.layers.Hud.removeChild(this.layers.Hud.firstChild);
        while (this.layers.Back.firstChild) this.layers.Back.removeChild(this.layers.Back.firstChild);
        this._keyF = null;
        this._keyJ = null;
        this.barLeft = null;
        this.barRight = null;
    }

    _paintBackdrop() {
        let src = this.params.indoorBackground || "./Locations/Home_photoroom.png";
        let img = document.createElementNS("http://www.w3.org/2000/svg", "image");
        img.setAttribute("href", src);
        img.setAttributeNS("http://www.w3.org/1999/xlink", "href", src);
        img.setAttribute("x", "0");
        img.setAttribute("y", "0");
        img.setAttribute("width", String(this.W));
        img.setAttribute("height", String(this.H));
        img.setAttribute("preserveAspectRatio", "xMidYMid slice");
        this.layers.Back.appendChild(img);
        let veil = create_SVG_rect(0, 0, this.W, this.H);
        veil.setAttribute("fill", "#f4efe4");
        veil.setAttribute("fill-opacity", String(this.params.indoorOverlayOpacity != null ? this.params.indoorOverlayOpacity : 0.42));
        this.layers.Back.appendChild(veil);
    }

    _boxes() {
        let well = this._num("wellSize", 390);
        let probe = {
            cx: this.W * (this.params.probeX || 0.50),
            cy: this.H * (this.params.probeY || 0.34),
            w: well,
            h: well
        };
        let left = {
            cx: this.W * (this.params.answerLeftX || 0.33),
            cy: this.H * (this.params.answerY || 0.72),
            w: well,
            h: well
        };
        let right = {
            cx: this.W * (this.params.answerRightX || 0.67),
            cy: this.H * (this.params.answerY || 0.72),
            w: well,
            h: well
        };
        return {
            probe: probe,
            left: left,
            right: right,
            promptY: this.H * (this.params.promptY || 0.072),
            keyY: left.cy + well / 2 + this._num("keyGap", 48)
        };
    }

    async _runTrial(trial) {
        this._clearMain();
        this.inputLocked = true;
        this._paintBackdrop();

        let boxes = this._boxes();
        let leftSpec = trial.left_parent === "A" ? trial.parentA : trial.parentB;
        let rightSpec = trial.left_parent === "A" ? trial.parentB : trial.parentA;
        this._placeWell(boxes.probe, { role: "probe" });
        this._placeWell(boxes.left, { role: "answer" });
        this._placeWell(boxes.right, { role: "answer" });
        await this._placeHead(trial.probe, boxes.probe);
        await this._placeHead(leftSpec, boxes.left);
        await this._placeHead(rightSpec, boxes.right);
        this._placePrompt(trial);
        this._placeKeys(boxes);
        this._placeTimeBars(boxes);
        this._placeProgress();

        if (trial.tutorial === "practice") {
            this._placeCoach("Press F for the left head, J for the right. Go with your first impression.", boxes);
        } else if (trial.tutorial === "paid") {
            this._placeCoach("Same idea — go with your first impression.", boxes);
        }

        this._setBarsProgress(0);
        this._setKeysPressed(false, false);
        let choice = await this._waitForChoice();
        this._stopBars();
        this.inputLocked = true;
        this._logAnswer(trial, choice);
        await this._wait(this._num("itiMs", 280));
    }

    _placePrompt(trial) {
        let text = trial.is_practice
            ? (this.params.practicePrompt || "Which one looks more like the top head?")
            : (this.params.prompt || "Which one looks more like the top head?");
        let y = this._boxes().promptY;
        let fontSize = this.params.promptSize || 34;
        let chipW = Math.min(this.W * 0.72, Math.max(720, text.length * fontSize * 0.52));
        let chipH = 64;
        let chip = create_SVG_rect(this.W / 2 - chipW / 2, y - chipH / 2, chipW, chipH);
        chip.setAttribute("rx", "18");
        chip.setAttribute("fill", "#f7f3ea");
        chip.setAttribute("fill-opacity", "0.94");
        chip.setAttribute("stroke", "#4b5563");
        chip.setAttribute("stroke-width", "3");
        chip.setAttribute("class", "kit_pilot_prompt_chip");
        this.layers.Hud.appendChild(chip);
        let el = create_SVG_text_elem(this.W / 2, y, text, "kit_pilot_prompt");
        el.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
        el.style.fontSize = fontSize + "px";
        el.style.fontWeight = "700";
        el.setAttribute("fill", "#1f2a33");
        el.style.textAnchor = "middle";
        el.style.dominantBaseline = "middle";
        this.layers.Hud.appendChild(el);
    }

    _placeCoach(message, boxes) {
        let y = boxes ? boxes.promptY + 52 : this.H * 0.12;
        let el = create_SVG_text_elem(this.W / 2, y, message, "kit_pilot_coach");
        el.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
        el.style.fontSize = "22px";
        el.setAttribute("fill", "#1f2a33");
        el.style.textAnchor = "middle";
        this.layers.Hud.appendChild(el);
    }

    _placeProgress() {
        let n = this.plannedCount || this.queue.length;
        let i = this.currentTrialIndex + 1;
        let el = create_SVG_text_elem(this.W - 56, 36, i + " / " + n, "kit_pilot_progress");
        el.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
        el.style.fontSize = "20px";
        el.setAttribute("fill", "#4b5563");
        el.style.textAnchor = "end";
        this.layers.Hud.appendChild(el);
    }

    _placeWell(box, opts) {
        opts = opts || {};
        let x = box.cx - box.w / 2;
        let y = box.cy - box.h / 2;
        let rect = create_SVG_rect(x, y, box.w, box.h);
        let isAnswer = opts.role === "answer";
        rect.setAttribute("rx", "20");
        rect.setAttribute("fill", isAnswer ? "#ffffff" : "#f4efe6");
        rect.setAttribute("stroke", isAnswer ? "#1e3a5f" : "#8a8478");
        rect.setAttribute("stroke-width", "8");
        this.layers.Main.appendChild(rect);
        return rect;
    }

    async _placeHead(spec, box) {
        let holder = create_SVG_group(0, 0, "kit_pilot_head");
        holder.style.filter = this.grayscaleFilter;
        holder.setAttribute("filter", "url(#kit_pilot_gray)");
        this.layers.Main.appendChild(holder);
        if (spec && spec.shape) {
            this._drawPracticeShape(holder, spec.shape, box);
            return;
        }
        let composed = this.kit.compose(spec || this.kit.defaultRecipe(), { showMarkers: false });
        holder.appendChild(composed.group);
        try {
            let b = composed.group.getBBox();
            if (b && b.width > 0 && b.height > 0) {
                let pad = 0.86;
                let scale = Math.min(box.w / b.width, box.h / b.height) * pad;
                let cx = b.x + b.width / 2;
                let cy = b.y + b.height / 2;
                holder.setAttribute(
                    "transform",
                    "translate(" + box.cx + " " + box.cy + ") scale(" + scale + ") translate(" + (-cx) + " " + (-cy) + ")"
                );
            }
        } catch (err) {
            holder.setAttribute("transform", "translate(" + (box.cx - 200) + " " + (box.cy - 200) + ")");
        }
    }

    _drawPracticeShape(parent, shape, box) {
        let g = create_SVG_group(0, 0, "kit_practice_shape");
        g.setAttribute("transform", "translate(" + box.cx + " " + box.cy + ")");
        parent.appendChild(g);
        if (shape === "square") {
            let r = create_SVG_rect(-90, -90, 180, 180);
            r.setAttribute("rx", "18");
            r.setAttribute("fill", "#5c5c5c");
            r.setAttribute("stroke", "#1f2a33");
            r.setAttribute("stroke-width", "6");
            g.appendChild(r);
        } else {
            let c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            c.setAttribute("r", "96");
            c.setAttribute("fill", "#d8d8d8");
            c.setAttribute("stroke", "#1f2a33");
            c.setAttribute("stroke-width", "6");
            g.appendChild(c);
        }
        ["-36", "36"].forEach((cx) => {
            let eye = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            eye.setAttribute("cx", cx);
            eye.setAttribute("cy", "-18");
            eye.setAttribute("r", "10");
            eye.setAttribute("fill", "#1f2a33");
            g.appendChild(eye);
        });
    }

    _placeKeys(boxes) {
        this._keyF = this._makeKey(boxes.left.cx, boxes.keyY, "F");
        this._keyJ = this._makeKey(boxes.right.cx, boxes.keyY, "J");
        this.layers.Hud.appendChild(this._keyF);
        this.layers.Hud.appendChild(this._keyJ);
        this._makeClickTarget(boxes.left, "F");
        this._makeClickTarget(boxes.right, "J");
    }

    _makeKey(x, y, letter) {
        let w = this._num("keyW", 92);
        let h = this._num("keyH", 72);
        let g = create_SVG_group(0, 0, "hat_drop_key");
        let lip = create_SVG_rect(x - w / 2, y - h / 2 + 5, w, h);
        lip.setAttribute("rx", "16");
        lip.setAttribute("fill", "#cfc8b8");
        lip.setAttribute("stroke", "#4b5563");
        lip.setAttribute("stroke-width", "4");
        g.appendChild(lip);
        let face = create_SVG_rect(x - w / 2, y - h / 2 - 2, w, h);
        face.setAttribute("rx", "16");
        face.setAttribute("fill", "#f4efe4");
        face.setAttribute("stroke", "#4b5563");
        face.setAttribute("stroke-width", "4");
        g.appendChild(face);
        let text = create_SVG_text_elem(x, y - 4, letter);
        text.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
        text.style.fontSize = "40px";
        text.style.fontWeight = "700";
        text.setAttribute("fill", "#1e3a5f");
        text.style.textAnchor = "middle";
        text.style.dominantBaseline = "central";
        text.style.pointerEvents = "none";
        g.appendChild(text);
        g._keyFace = face;
        g._keyLip = lip;
        g._keyFaceRestY = y - h / 2 - 2;
        g._keyLipRestY = y - h / 2 + 5;
        g.style.cursor = "pointer";
        g.style.pointerEvents = "all";
        g.addEventListener("pointerdown", (evt) => {
            evt.preventDefault();
            this._choose(letter, "click");
        });
        return g;
    }

    _makeClickTarget(box, letter) {
        let hit = create_SVG_rect(box.cx - box.w / 2, box.cy - box.h / 2, box.w, box.h);
        hit.setAttribute("fill", "#000");
        hit.setAttribute("fill-opacity", "0");
        hit.style.cursor = "pointer";
        hit.style.pointerEvents = "all";
        hit.addEventListener("pointerdown", (evt) => {
            evt.preventDefault();
            this._choose(letter, "click");
        });
        this.layers.Hud.appendChild(hit);
    }

    _setKeyPressed(g, pressed) {
        if (!g || !g._keyFace) return;
        let dy = pressed ? 7 : 0;
        g._keyFace.setAttribute("y", g._keyFaceRestY + dy);
        if (g._keyLip) g._keyLip.setAttribute("y", g._keyLipRestY + dy);
    }

    _setKeysPressed(f, j) {
        this._setKeyPressed(this._keyF, f);
        this._setKeyPressed(this._keyJ, j);
    }

    _placeTimeBars(boxes) {
        boxes = boxes || this._boxes();
        let width = this._num("barWidth", 52);
        let top = boxes.probe.cy - boxes.probe.h / 2;
        let bottom = Math.max(boxes.left.cy + boxes.left.h / 2, boxes.keyY - 10);
        let height = bottom - top;
        const makeTrackAndBar = (cx) => {
            let x = cx - width / 2;
            let track = create_SVG_rect(x, top, width, height);
            track.setAttribute("rx", "12");
            track.setAttribute("fill", "#ece8df");
            track.setAttribute("stroke", "#4b5563");
            track.setAttribute("stroke-width", "3");
            this.layers.Hud.appendChild(track);
            let rect = create_SVG_rect(x, top, width, height);
            rect.setAttribute("rx", "12");
            rect.setAttribute("fill", "#43a047");
            rect.classList.add("chimera_time_bar");
            rect.classList.add("is-on");
            this.layers.Hud.appendChild(rect);
            return rect;
        };
        let leftX = boxes.left.cx - boxes.left.w / 2 - width - 18;
        let rightX = boxes.right.cx + boxes.right.w / 2 + width + 18;
        this.barLeft = makeTrackAndBar(leftX);
        this.barRight = makeTrackAndBar(rightX);
        this._barGeom = { top: top, bottom: bottom, height: height, width: width };
    }

    _setBarsProgress(progress) {
        let g = this._barGeom;
        if (!g) return;
        [this.barLeft, this.barRight].forEach((bar) => {
            if (!bar) return;
            let remaining = Math.max(0, 1 - progress);
            let h = g.height * remaining;
            bar.setAttribute("y", String(g.bottom - h));
            bar.setAttribute("height", String(Math.max(h, 0)));
            let fill = remaining > 0.5 ? "#43a047" : (remaining > 0.25 ? "#f9a825" : "#c62828");
            bar.setAttribute("fill", fill);
            bar.classList.toggle("pulse", remaining > 0 && remaining <= 0.25);
        });
    }

    _stopBars() {
        if (this._barRaf) {
            cancelAnimationFrame(this._barRaf);
            this._barRaf = null;
        }
    }

    _waitForChoice() {
        return new Promise((resolve) => {
            this._choiceResolve = resolve;
            this._choiceStart = performance.now();
            this.inputLocked = false;
            const tick = () => {
                if (!this._choiceResolve || this.destroyed) return;
                let elapsed = performance.now() - this._choiceStart;
                let t = Math.min(1, elapsed / this.trialSpeedMs);
                this._setBarsProgress(t);
                this._barRaf = requestAnimationFrame(tick);
            };
            this._barRaf = requestAnimationFrame(tick);
        });
    }

    _choose(letter, mode) {
        if (this.inputLocked || !this._choiceResolve) return;
        if (letter !== "F" && letter !== "J") return;
        let now = performance.now();
        let rt = Math.round(now - this._choiceStart);
        if (rt < this.minChoiceMs) return;
        this.inputLocked = true;
        this._setKeysPressed(letter === "F", letter === "J");
        let late = rt >= this.trialSpeedMs;
        let resolve = this._choiceResolve;
        this._choiceResolve = null;
        this._stopBars();
        resolve({ key: letter, mode: mode || "key", rt: rt, late: late });
    }

    _onKeyDown(evt) {
        if (this.destroyed || this.inputLocked) return;
        let k = evt.key && evt.key.toLowerCase();
        if (k === "f") {
            evt.preventDefault();
            this._setKeyPressed(this._keyF, true);
            this._choose("F", "key");
        } else if (k === "j") {
            evt.preventDefault();
            this._setKeyPressed(this._keyJ, true);
            this._choose("J", "key");
        }
    }

    _onKeyUp(evt) {
        let k = evt.key && evt.key.toLowerCase();
        if (k === "f") this._setKeyPressed(this._keyF, false);
        if (k === "j") this._setKeyPressed(this._keyJ, false);
    }

    _snapshotHead(spec) {
        if (!spec) return null;
        if (spec.shape) return { shape: spec.shape };
        return {
            shell: spec.shell || null,
            ear: spec.ear || null,
            eye: spec.eye || null,
            lowerFace: spec.lowerFace || null,
            hair: spec.hair || null,
            expression: spec.expression || "happy"
        };
    }

    _logAnswer(trial, choice) {
        let selectedParent = choice.key === "F" ? trial.left_parent : (trial.left_parent === "A" ? "B" : "A");
        let winnerSlot = null;
        let loserSlot = null;
        let winnerToken = null;
        let loserToken = null;
        if (trial.kind === "duel") {
            winnerSlot = selectedParent === "A" ? trial.slot_x : trial.slot_y;
            loserSlot = selectedParent === "A" ? trial.slot_y : trial.slot_x;
            winnerToken = selectedParent === "A" ? trial.token_x_a : trial.token_y_b;
            loserToken = selectedParent === "A" ? trial.token_y_b : trial.token_x_a;
        }
        let catchCorrect = null;
        if (trial.kind === "catch" || trial.kind === "practice") {
            catchCorrect = selectedParent === trial.catch_parent;
        }
        let leftSpec = trial.left_parent === "A" ? trial.parentA : trial.parentB;
        let rightSpec = trial.left_parent === "A" ? trial.parentB : trial.parentA;
        let row = {
            trial_index: this.currentTrialIndex,
            trial_id: trial.id,
            kind: trial.kind,
            is_practice: !!trial.is_practice,
            slot_x: trial.slot_x || null,
            slot_y: trial.slot_y || null,
            token_x_a: trial.token_x_a || null,
            token_x_b: trial.token_x_b || null,
            token_y_a: trial.token_y_a || null,
            token_y_b: trial.token_y_b || null,
            shared_tokens: trial.shared_tokens || null,
            parent_a: this._snapshotHead(trial.parentA),
            parent_b: this._snapshotHead(trial.parentB),
            probe: this._snapshotHead(trial.probe),
            head_top: this._snapshotHead(trial.probe),
            head_left: this._snapshotHead(leftSpec),
            head_right: this._snapshotHead(rightSpec),
            left_parent: trial.left_parent,
            selected_key: choice.key,
            selected_side: choice.key === "F" ? "left" : "right",
            selected_parent: selectedParent,
            response_mode: choice.mode,
            winner_slot: winnerSlot,
            loser_slot: loserSlot,
            winner_token: winnerToken,
            loser_token: loserToken,
            catch_parent: trial.catch_parent || null,
            catch_correct: catchCorrect,
            reaction_time_ms: choice.rt,
            late: !!choice.late,
            wave: trial.wave || (trial.is_practice ? "practice" : "coverage"),
            slot_win_rates: trial.slot_win_rates || null,
            sampled_tokens: this.sampledTokens,
            catalog_tokens: this.catalogTokens
        };
        this.answers.push(row);
        this.phaseData.answers = this.answers;
        this.phaseData.Data = this.answers;
        this._persistProgress();
    }

    _persistProgress() {
        let dataCont = this.expCont && this.expCont.dataCont;
        if (!dataCont || !dataCont.experimentData) return;
        dataCont.experimentData.featureKitPilotProgress = {
            answers: JSON.parse(JSON.stringify(this.answers)),
            sampled_tokens: JSON.parse(JSON.stringify(this.sampledTokens || {})),
            catalog_tokens: JSON.parse(JSON.stringify(this.catalogTokens || {}))
        };
        if (typeof dataCont.storeAllData === "function") dataCont.storeAllData(false);
    }

    _wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
