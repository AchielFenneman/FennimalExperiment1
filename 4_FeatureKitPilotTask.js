/**
 * Feature-kit stimulus pilot: slot-duel 2AFC.
 *
 * Default: 1-vs-1 slot duels (share three, differ on two).
 * Combo mode (`combo: true` / `feature_kit_combo_pilot`): pick three disjoint
 * ensemble heads whose 3-vs-2 mixes can sit near 50/50. Coverage is every
 * morph-complete 3v2 split, twice (new token pairs each time). Adaptive
 * resamples splits near 50 and slots whose token pairs are still thin.
 * Shared-slot 1v2 / 2v2 families are out — those are not mixes of two
 * non-overlapping heads. Hair is excluded; stamps contest. All four SVG
 * tokens per slot are on stage (no between-subjects subsample). Scales stay 1.
 *
 * Size mode (`feature_kit_size_pilot`): same 3-up UI, frozen trio, one
 * between-subjects scale pack (baseline / mild / medium), 10 morph-complete
 * 3v2 splits × 3 pairs, one each, no adaptive, no token sampling. Pack is
 * drawn 1/3 in-session and persisted; pin with ?PACK=baseline|mild|medium.
 * No morphing, names, hats, map, or bonus stars.
 */
class FeatureKitPilotController {
    constructor(parentLayer, phaseData, returnfunc, expCont) {
        this.ParentLayer = parentLayer;
        this.phaseData = phaseData || {};
        this.returnfunc = returnfunc;
        this.expCont = expCont;
        this.params = (typeof GenParam !== "undefined" && GenParam.FeatureKitPilot) || {};
        this.size = phaseData.size === true
            || phaseData.mode === "size"
            || phaseData.type === "feature_kit_size_pilot";
        this.combo = !this.size && (phaseData.combo === true
            || phaseData.mode === "combo"
            || phaseData.type === "feature_kit_combo_pilot");
        if (this.size && typeof GenParam !== "undefined" && GenParam.FeatureKitSizePilot) {
            this.params = Object.assign({}, this.params, GenParam.FeatureKitSizePilot);
        } else if (this.combo && typeof GenParam !== "undefined" && GenParam.FeatureKitComboPilot) {
            this.params = Object.assign({}, this.params, GenParam.FeatureKitComboPilot);
        }
        this.W = GenParam.SVG_width;
        this.H = GenParam.SVG_height;
        this.trialSpeedMs = this._num("trialSpeedMs", this.phaseData.trial_speed || 7500);
        this.nTokensSampled = this._int("nTokensSampled", this.phaseData.n_tokens_sampled, this.combo || this.size ? 4 : 3);
        this.nDuelReps = this._int("nDuelReps", this.phaseData.n_duel_reps, 3);
        this.nCatch = this._int("nCatch", this.phaseData.n_catch, 3);
        this.nAdaptiveDuels = this._int("nAdaptiveDuels", this.phaseData.n_adaptive_duels, this.size ? 0 : 16);
        this.skipPractice = this.phaseData.skip_practice === true;
        this.minChoiceMs = this._num("minChoiceMs", 750);
        this.adaptive = this.size
            ? false
            : (this.phaseData.adaptive !== false && this.params.adaptive !== false);
        this.grayscaleFilter = this.params.grayscaleFilter || "grayscale(100%)";
        this.packId = null;
        this.packScales = null;
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
            this._assignPack();
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
        this.phaseData.n_adaptive_duels = this.nAdaptiveDuels;
        this.phaseData.queue_version = this._queueVersion();
        this.phaseData.slot_keys = (this.slotKeys || []).slice();
        this.phaseData.combo = !!this.combo;
        this.phaseData.size = !!this.size;
        this.phaseData.pack_id = this.packId;
        this.phaseData.pack_scales = this.packScales;
        if (this.size) this.phaseData.frozen_heads = JSON.parse(JSON.stringify(this._frozenHeads()));
        if (this.combo) this.phaseData.combo_partitions = this._coveragePartitions().map((p) => p.id);
        if (this.combo) this.phaseData.fish_partitions = this._fishPartitions().map((p) => p.id);
        if (typeof this.returnfunc === "function") this.returnfunc();
    }

    _sampleTokens() {
        let exclude = this._excludeSlots();
        let slotKeys = FeatureKit.slotKeys().filter((key) => {
            if (exclude.indexOf(key) >= 0) return false;
            return this.kit.tokensForPilot(key).length >= 2;
        });
        if (slotKeys.length < 2) {
            this._fail("need at least two feature groups with 2+ tokens in Heads features.svg.");
        }
        this.slotKeys = slotKeys;
        this.catalogTokens = {};
        slotKeys.forEach((key) => {
            this.catalogTokens[key] = this.kit.tokensForPilot(key).slice();
        });

        let stored = this._restore(this._storeKey("tokens"));
        let sampled = {};
        let validStored = stored
            && stored.tokens
            && typeof stored.tokens === "object"
            && this._catalogsMatch(stored.catalog, this.catalogTokens);
        slotKeys.forEach((key) => {
            let pool = this.catalogTokens[key].slice();
            if (this.size) {
                sampled[key] = pool.slice();
                return;
            }
            let keep = [];
            if (validStored && Array.isArray(stored.tokens[key])) {
                stored.tokens[key].forEach((token) => {
                    if (pool.indexOf(token) >= 0 && keep.indexOf(token) < 0) keep.push(token);
                });
            }
            let want = Math.max(2, Math.min(this.nTokensSampled, pool.length));
            if (keep.length >= want) {
                sampled[key] = keep.slice(0, want);
                return;
            }
            if (want >= pool.length) {
                sampled[key] = pool.slice();
                return;
            }
            sampled[key] = shuffleArray(pool.slice()).slice(0, want);
        });
        this.sampledTokens = sampled;
        this._persist(this._storeKey("tokens"), {
            tokens: JSON.parse(JSON.stringify(sampled)),
            catalog: JSON.parse(JSON.stringify(this.catalogTokens)),
            n_tokens_sampled: this.nTokensSampled,
            n_duel_reps: this.nDuelReps,
            n_catch: this.nCatch,
            slot_keys: slotKeys.slice(),
            exclude_slots: exclude.slice()
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
            scales: (typeof FeatureKit !== "undefined" && FeatureKit.defaultScales)
                ? FeatureKit.defaultScales()
                : { ear: 1, eye: 1, lowerFace: 1, hair: 1, stamp: 1 }
        };
    }

    _fillRecipe(spec) {
        let rec = Object.assign(this._blankRecipe(), spec || {});
        this.slotKeys.forEach((key) => {
            if (!rec[key]) rec[key] = this.sampledTokens[key][0];
        });
        rec = this.kit.normalizeRecipe(rec);
        rec.scales = Object.assign(
            (typeof FeatureKit !== "undefined" && FeatureKit.defaultScales)
                ? FeatureKit.defaultScales()
                : { ear: 1, eye: 1, lowerFace: 1, hair: 1, stamp: 1 },
            rec.scales || {}
        );
        if (this.size && this.packScales) {
            rec.scales = Object.assign(
                (typeof FeatureKit !== "undefined" && FeatureKit.defaultScales)
                    ? FeatureKit.defaultScales()
                    : { ear: 1, eye: 1, lowerFace: 1, hair: 1, stamp: 1 },
                this.packScales
            );
        } else {
            Object.keys(rec.scales).forEach((key) => { rec.scales[key] = 1; });
        }
        this._excludeSlots().forEach((key) => { rec[key] = "none"; });
        return rec;
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

    _storeKey(kind) {
        let prefix = this.size
            ? "feature_kit_size_pilot_"
            : (this.combo ? "feature_kit_combo_pilot_" : "feature_kit_pilot_");
        return prefix + kind;
    }

    _excludeSlots() {
        let fromPhase = this.phaseData.exclude_slots;
        let fromParams = this.params.excludeSlots;
        if (Array.isArray(fromPhase)) return fromPhase.slice();
        if (Array.isArray(fromParams)) return fromParams.slice();
        return ["hair"];
    }

    _packTable() {
        return (this.params && this.params.packs) || {
            baseline: { ear: 1, eye: 1, lowerFace: 1, stamp: 1 },
            mild: { ear: 0.92, eye: 1.12, lowerFace: 0.90, stamp: 1.18 },
            medium: { ear: 0.82, eye: 1.22, lowerFace: 0.85, stamp: 1.35 }
        };
    }

    _assignPack() {
        if (!this.size) {
            this.packId = null;
            this.packScales = null;
            return;
        }
        let packs = this._packTable();
        let ids = ["baseline", "mild", "medium"].filter((id) => !!packs[id]);
        if (!ids.length) this._fail("size pilot has no scale packs.");
        let fromUrl = "";
        if (typeof getUrlSearchParam === "function") {
            fromUrl = String(getUrlSearchParam("PACK") || getUrlSearchParam("pack") || "").toLowerCase();
        }
        if (fromUrl && packs[fromUrl]) {
            this.packId = fromUrl;
        } else {
            let stored = this._restore(this._storeKey("pack"));
            if (stored && stored.pack_id && packs[stored.pack_id]) {
                this.packId = stored.pack_id;
            } else {
                this.packId = ids[experimentRandomInt(ids.length)];
            }
        }
        this.packScales = Object.assign(
            (typeof FeatureKit !== "undefined" && FeatureKit.defaultScales)
                ? FeatureKit.defaultScales()
                : { ear: 1, eye: 1, lowerFace: 1, hair: 1, stamp: 1 },
            packs[this.packId]
        );
        this._persist(this._storeKey("pack"), {
            pack_id: this.packId,
            pack_scales: JSON.parse(JSON.stringify(this.packScales))
        });
        this.phaseData.pack_id = this.packId;
        this.phaseData.pack_scales = this.packScales;
        console.log(
            "%c FeatureKitSizePilot: pack " + this.packId + " " + JSON.stringify(this.packScales),
            "color:#0b6; font-weight:bold"
        );
    }

    _frozenHeads() {
        let heads = this.params && this.params.frozenHeads;
        if (!Array.isArray(heads) || heads.length < 3) {
            this._fail("size pilot needs three frozenHeads in GenParam.FeatureKitSizePilot.");
        }
        return heads;
    }

    _sizePairs() {
        let heads = this._frozenHeads();
        return [
            { id: heads[0].id + heads[1].id, a: heads[0], b: heads[1] },
            { id: heads[0].id + heads[2].id, a: heads[0], b: heads[2] },
            { id: heads[1].id + heads[2].id, a: heads[1], b: heads[2] }
        ];
    }

    _frozenRecipe(head) {
        (this.slotKeys || []).forEach((key) => {
            let token = head[key];
            if (!token || token === "none") return;
            if (!this.catalogTokens[key] || this.catalogTokens[key].indexOf(token) < 0) {
                this._fail('frozen head ' + (head.id || "?") + ' uses unknown ' + key + ' token "' + token + '".');
            }
        });
        return this._fillRecipe({
            shell: head.shell,
            ear: head.ear,
            eye: head.eye,
            lowerFace: head.lowerFace,
            stamp: head.stamp,
            hair: "none",
            expression: "happy"
        });
    }

    _canonSet(arr) {
        return (arr || []).slice().sort().join("+");
    }

    _partitionId(setA, setB, shared) {
        let a = this._canonSet(setA);
        let b = this._canonSet(setB);
        let left = a < b ? a : b;
        let right = a < b ? b : a;
        let sh = this._canonSet(shared);
        return left + " vs " + right + (sh ? " | " + sh : "");
    }

    _queueVersion() {
        if (this.size) return 1;
        return this.combo ? 6 : 3;
    }

    _coverageReps() {
        if (this.combo) return Math.max(1, this.nDuelReps);
        return this.adaptive ? 1 : this.nDuelReps;
    }

    _comboPartitions() {
        return this._coveragePartitions();
    }

    _kSubsets(arr, k) {
        let out = [];
        let rec = (start, acc) => {
            if (acc.length === k) {
                out.push(acc.slice());
                return;
            }
            for (let i = start; i < arr.length; i++) {
                acc.push(arr[i]);
                rec(i + 1, acc);
                acc.pop();
            }
        };
        rec(0, []);
        return out;
    }

    _pushPart(parts, family, setA, setB, shared) {
        parts.push({
            family: family,
            set_a: setA.slice(),
            set_b: setB.slice(),
            shared: (shared || []).slice(),
            id: this._partitionId(setA, setB, shared)
        });
        return parts;
    }

    _morphCompletePartitions(keys) {
        let n = keys.length;
        let parts = [];
        if (n < 2) return parts;
        let nA = Math.ceil(n / 2);
        let nB = n - nA;
        this._kSubsets(keys, nA).forEach((setA) => {
            let setB = keys.filter((k) => setA.indexOf(k) < 0);
            if (setB.length !== nB) return;
            if (nA === nB && this._canonSet(setA) > this._canonSet(setB)) return;
            this._pushPart(parts, "morph_complete", setA, setB, []);
        });
        return parts;
    }

    _oneVsTwoPartitions(keys) {
        let parts = [];
        keys.forEach((one) => {
            let rest = keys.filter((k) => k !== one);
            this._kSubsets(rest, 2).forEach((pair) => {
                let shared = rest.filter((k) => pair.indexOf(k) < 0);
                this._pushPart(parts, "hunt_1v2", [one], pair, shared);
            });
        });
        return parts;
    }

    _twoVsTwoSharedPartitions(keys) {
        let parts = [];
        if (keys.length < 5) return parts;
        keys.forEach((sharedSlot) => {
            let rest = keys.filter((k) => k !== sharedSlot);
            this._kSubsets(rest, 2).forEach((setA) => {
                let setB = rest.filter((k) => setA.indexOf(k) < 0);
                if (setB.length !== 2) return;
                if (this._canonSet(setA) > this._canonSet(setB)) return;
                this._pushPart(parts, "hunt_2v2_shared", setA, setB, [sharedSlot]);
            });
        });
        return parts;
    }

    _cyclic1v2Coverage(keys, want) {
        let picked = [];
        let seen = {};
        let n = keys.length;
        let add = (one, a, b) => {
            if (picked.length >= want) return;
            let pair = [keys[a], keys[b]];
            if (pair[0] === one || pair[1] === one || pair[0] === pair[1]) return;
            let shared = keys.filter((k) => k !== one && pair.indexOf(k) < 0);
            let id = this._partitionId([one], pair, shared);
            if (seen[id]) return;
            seen[id] = true;
            this._pushPart(picked, "hunt_1v2", [one], pair, shared);
        };
        for (let i = 0; i < n; i++) add(keys[i], (i + 1) % n, (i + 2) % n);
        for (let i = 0; i < n; i++) add(keys[i], (i + 1) % n, (i + 3) % n);
        this._oneVsTwoPartitions(keys).forEach((p) => {
            if (picked.length >= want || seen[p.id]) return;
            seen[p.id] = true;
            picked.push(p);
        });
        return picked.slice(0, want);
    }

    _cyclicMorphComplete(keys, want) {
        let all = this._morphCompletePartitions(keys);
        if (all.length <= want) return all;
        let picked = [];
        let seen = {};
        let n = keys.length;
        let nA = Math.ceil(n / 2);
        for (let i = 0; i < n && picked.length < want; i++) {
            let setA = [];
            for (let k = 0; k < nA; k++) setA.push(keys[(i + k) % n]);
            let setB = keys.filter((slot) => setA.indexOf(slot) < 0);
            if (!setB.length) continue;
            let id = this._partitionId(setA, setB, []);
            if (seen[id]) continue;
            seen[id] = true;
            this._pushPart(picked, "morph_complete", setA, setB, []);
        }
        all.forEach((part) => {
            if (picked.length >= want || seen[part.id]) return;
            seen[part.id] = true;
            picked.push(part);
        });
        return picked.slice(0, want);
    }

    _onePerShared2v2(keys) {
        let parts = [];
        if (keys.length < 5) return parts;
        keys.forEach((sharedSlot) => {
            let rest = keys.filter((k) => k !== sharedSlot);
            if (rest.length < 4) return;
            this._pushPart(parts, "hunt_2v2_shared", rest.slice(0, 2), rest.slice(2, 4), [sharedSlot]);
        });
        return parts;
    }

    _oneVsRestPartitions(keys) {
        let parts = [];
        keys.forEach((one) => {
            let rest = keys.filter((k) => k !== one);
            if (!rest.length) return;
            this._pushPart(parts, "morph_1vRest", [one], rest, []);
        });
        return parts;
    }

    _coveragePartitions() {
        if (this._coveragePartCache) return this._coveragePartCache;
        let keys = this.slotKeys || [];
        let complete = this._morphCompletePartitions(keys);
        if (!complete.length) this._fail("combo coverage is empty (need 2+ feature groups).");
        this._coveragePartCache = complete;
        return this._coveragePartCache;
    }

    _fishPartitions() {
        if (this._fishPartCache) return this._fishPartCache;
        let keys = this.slotKeys || [];
        let byId = {};
        let parts = [];
        this._morphCompletePartitions(keys)
            .concat(this._oneVsRestPartitions(keys))
            .forEach((p) => {
                if (byId[p.id]) return;
                byId[p.id] = true;
                parts.push(p);
            });
        if (!parts.length) this._fail("combo fishing pool is empty (need 2+ feature groups).");
        this._fishPartCache = parts;
        return this._fishPartCache;
    }

    _plannedCount() {
        return (this.skipPractice ? 0 : 2) + this._maxDuels() + this.nCatch;
    }

    _persistQueue() {
        this._persist(this._storeKey("trials"), {
            version: this._queueVersion(),
            combo: !!this.combo,
            size: !!this.size,
            pack_id: this.packId,
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
        if (this.size) {
            return this._sizePairs().length * this._morphCompletePartitions(this.slotKeys || []).length;
        }
        if (this.combo) {
            let cov = this._coveragePartitions().length * this._coverageReps();
            if (!this.adaptive) return cov;
            return cov + this.nAdaptiveDuels;
        }
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

    _partitionWinRates() {
        let wins = {};
        let n = {};
        this.answers.forEach((row) => {
            if (!row || row.kind !== "duel" || !row.partition_id) return;
            let id = row.partition_id;
            n[id] = (n[id] || 0) + 1;
            if (row.selected_parent === "A") wins[id] = (wins[id] || 0) + 1;
        });
        let rates = {};
        this._fishPartitions().forEach((p) => {
            let nn = n[p.id] || 0;
            let w = wins[p.id] || 0;
            rates[p.id] = nn ? w / nn : 0.5;
            rates[p.id + "__n"] = nn;
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
        let novelty = (sx === "stamp" || sy === "stamp") ? 1.2 : 1;
        return (0.45 * close + 0.35 * strong + 0.20 * explore) * novelty;
    }

    _canonPair(a, b) {
        let x = String(a || "");
        let y = String(b || "");
        return x < y ? x + ":" + y : y + ":" + x;
    }

    _tokenPairCounts() {
        let counts = {};
        (this.slotKeys || []).forEach((key) => { counts[key] = {}; });
        let eat = (trial) => {
            if (!trial || trial.kind !== "duel" || !trial.combo) return;
            let tokensA = trial.tokens_a || {};
            let tokensB = trial.tokens_b || {};
            (trial.set_a || []).concat(trial.set_b || []).forEach((slot) => {
                if (!tokensA[slot] || !tokensB[slot] || !counts[slot]) return;
                let id = this._canonPair(tokensA[slot], tokensB[slot]);
                counts[slot][id] = (counts[slot][id] || 0) + 1;
            });
        };
        (this.queue || []).forEach(eat);
        return counts;
    }

    _slotPairHunger(slot) {
        let tokens = (this.sampledTokens && this.sampledTokens[slot]) || [];
        let pairs = FeatureKit.unorderedPairs(tokens);
        if (!pairs.length) return 1;
        let seen = (this._tokenPairCounts()[slot]) || {};
        let hunger = 0;
        pairs.forEach((pair) => {
            hunger += 1 / (1 + (seen[this._canonPair(pair[0], pair[1])] || 0));
        });
        return hunger / pairs.length;
    }

    _partitionHunger(part) {
        let slots = (part.set_a || []).concat(part.set_b || []);
        if (!slots.length) return 1;
        let sum = 0;
        let n = 0;
        slots.forEach((slot) => {
            if (!this.sampledTokens || !this.sampledTokens[slot]) return;
            sum += this._slotPairHunger(slot);
            n += 1;
        });
        return n ? sum / n : 1;
    }

    _partitionWeight(part) {
        let rates = this._partitionWinRates();
        let p = rates[part.id];
        if (p == null) p = 0.5;
        let close = 1 - Math.abs(p - 0.5) * 2;
        let seen = this.queue.filter((t) => t.kind === "duel" && t.partition_id === part.id).length;
        let explore = 1 / (1 + seen);
        let hunger = this._partitionHunger(part);
        let familyBoost = part.family === "morph_complete" ? 1 : 0.8;
        return (0.50 * close + 0.20 * explore + 0.30 * hunger) * familyBoost;
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

    _pickAdaptivePartition() {
        let parts = this._fishPartitions();
        let weights = parts.map((p) => Math.max(0.02, this._partitionWeight(p)));
        let sum = weights.reduce((a, b) => a + b, 0);
        let pick = experimentRandom() * sum;
        for (let i = 0; i < parts.length; i++) {
            pick -= weights[i];
            if (pick <= 0) return parts[i];
        }
        return parts[parts.length - 1];
    }

    _makeComboTrial(part, wave) {
        let contested = {};
        let tokensA = {};
        let tokensB = {};
        (part.set_a.concat(part.set_b)).forEach((slot) => {
            if (contested[slot]) return;
            let pair = this._nextTokenPair(slot);
            contested[slot] = pair;
            tokensA[slot] = pair[0];
            tokensB[slot] = pair[1];
        });
        let shared = {};
        (part.shared || []).forEach((slot) => {
            let pool = this.sampledTokens[slot];
            shared[slot] = pool[experimentRandomInt(pool.length)];
        });
        let specA = Object.assign({}, shared, tokensA);
        let specB = Object.assign({}, shared, tokensB);
        let specP = Object.assign({}, shared);
        part.set_a.forEach((slot) => { specP[slot] = tokensA[slot]; });
        part.set_b.forEach((slot) => { specP[slot] = tokensB[slot]; });
        this._adaptiveSeq += 1;
        return {
            id: "duel_" + wave + "_" + part.family + "_" + this._adaptiveSeq,
            kind: "duel",
            is_practice: false,
            wave: wave,
            combo: true,
            family: part.family,
            partition_id: part.id,
            set_a: part.set_a.slice(),
            set_b: part.set_b.slice(),
            shared_slots: (part.shared || []).slice(),
            tokens_a: Object.fromEntries(part.set_a.map((s) => [s, tokensA[s]])),
            tokens_b: Object.fromEntries(part.set_b.map((s) => [s, tokensB[s]])),
            n_a: part.set_a.length,
            n_b: part.set_b.length,
            slot_x: part.set_a.length === 1 ? part.set_a[0] : null,
            slot_y: part.set_b.length === 1 ? part.set_b[0] : null,
            shared_tokens: shared,
            parentA: this._fillRecipe(specA),
            parentB: this._fillRecipe(specB),
            probe: this._fillRecipe(specP),
            left_parent: experimentRandom() < 0.5 ? "A" : "B",
            tutorial: null,
            partition_win_rates: wave === "adaptive" ? this._partitionWinRates() : null
        };
    }

    _makeSizeTrial(pair, part) {
        let recA = this._frozenRecipe(pair.a);
        let recB = this._frozenRecipe(pair.b);
        let polarity = experimentRandom() < 0.5 ? 1 : 0;
        let probe = this._fillRecipe(FeatureKit.mixRecipes(recA, recB, {
            set_a: part.set_a,
            set_b: part.set_b
        }, polarity));
        let donor3 = polarity === 0 ? recA : recB;
        let donor2 = polarity === 0 ? recB : recA;
        this._adaptiveSeq += 1;
        return {
            id: "duel_size_" + pair.id + "_" + this._adaptiveSeq,
            kind: "duel",
            is_practice: false,
            wave: "coverage",
            combo: false,
            size: true,
            family: part.family || "morph_complete",
            pair_id: pair.id,
            head_a_id: pair.a.id,
            head_b_id: pair.b.id,
            polarity: polarity,
            three_side_parent: polarity === 0 ? "A" : "B",
            pack_id: this.packId,
            pack_scales: JSON.parse(JSON.stringify(this.packScales)),
            partition_id: part.id,
            set_a: part.set_a.slice(),
            set_b: part.set_b.slice(),
            shared_slots: [],
            tokens_a: Object.fromEntries(part.set_a.map((s) => [s, donor3[s]])),
            tokens_b: Object.fromEntries(part.set_b.map((s) => [s, donor2[s]])),
            n_a: part.set_a.length,
            n_b: part.set_b.length,
            slot_x: null,
            slot_y: null,
            shared_tokens: null,
            parentA: recA,
            parentB: recB,
            probe: probe,
            left_parent: experimentRandom() < 0.5 ? "A" : "B",
            tutorial: null,
            partition_win_rates: null
        };
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
            size: !!this.size,
            pack_id: this.packId,
            pack_scales: this.packScales ? JSON.parse(JSON.stringify(this.packScales)) : null,
            parentA: parentA,
            parentB: parentB,
            probe: probeIsA ? parentA : parentB,
            catch_parent: probeIsA ? "A" : "B",
            left_parent: experimentRandom() < 0.5 ? "A" : "B"
        };
    }

    _nextAdaptiveTrial() {
        if (!this.adaptive || this.size) return null;
        let nDuel = this._countKind("duel");
        let nCatch = this._countKind("catch");
        let maxDuel = this._maxDuels();
        if (nDuel >= maxDuel && nCatch >= this.nCatch) return null;
        let duelsLeft = Math.max(0, maxDuel - nDuel);
        let catchLeft = Math.max(0, this.nCatch - nCatch);
        let takeCatch = catchLeft > 0 && (duelsLeft <= 0 || experimentRandom() < catchLeft / (duelsLeft + catchLeft));
        if (takeCatch) return this._makeCatchTrial("adaptive");
        if (this.combo) return this._makeComboTrial(this._pickAdaptivePartition(), "adaptive");
        let pair = this._pickAdaptivePair();
        return this._makeDuelTrial(pair[0], pair[1], "adaptive");
    }

    _buildQueue() {
        this._initTokenPairDecks();
        let stored = this._restore(this._storeKey("trials"));
        let wantVersion = this._queueVersion();
        if (stored && stored.version === wantVersion && Array.isArray(stored.queue) && stored.queue.length
            && !!stored.size === !!this.size
            && (!this.size || stored.pack_id === this.packId)
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

        let coverageReps = this._coverageReps();
        let coverageCatch = this.adaptive ? Math.max(0, this.nCatch - 1) : this.nCatch;
        let paid = [];
        if (this.size) {
            let parts = this._morphCompletePartitions(this.slotKeys);
            if (!parts.length) this._fail("size coverage is empty (need 2+ feature groups).");
            this._sizePairs().forEach((pair) => {
                parts.forEach((part) => {
                    paid.push(this._makeSizeTrial(pair, part));
                });
            });
        } else if (this.combo) {
            this._coveragePartitions().forEach((part) => {
                for (let r = 0; r < coverageReps; r++) {
                    paid.push(this._makeComboTrial(part, "coverage"));
                }
            });
        } else {
            FeatureKit.unorderedPairs(this.slotKeys).forEach((pair) => {
                for (let r = 0; r < coverageReps; r++) {
                    paid.push(this._makeDuelTrial(pair[0], pair[1], "coverage"));
                }
            });
        }
        for (let c = 0; c < coverageCatch; c++) {
            paid.push(this._makeCatchTrial("coverage"));
        }

        this.queue = queue.concat(shuffleArray(paid));
        let firstPaid = this.queue.find((trial) => trial && !trial.is_practice);
        if (firstPaid) firstPaid.tutorial = "paid";
        this._persistQueue();
        console.log(
            "%c FeatureKitPilot: " + (this.size ? ("size pack=" + this.packId + " ") : (this.combo ? "combo " : "")) +
            "coverage " + this._countKind("duel") + " duels / " +
            this._countKind("catch") + " catch" +
            (this.adaptive ? (" → adaptive to " + this._plannedCount() + " total") : (" → " + this._plannedCount() + " total")) +
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
                if (this.size) {
                    if (!trial.pair_id || !trial.partition_id || trial.pack_id !== this.packId) return false;
                    if (!Array.isArray(trial.set_a) || !Array.isArray(trial.set_b)) return false;
                } else if (this.combo) {
                    if (!trial.partition_id || !Array.isArray(trial.set_a) || !Array.isArray(trial.set_b)) {
                        return false;
                    }
                } else if (this.slotKeys.indexOf(trial.slot_x) < 0 || this.slotKeys.indexOf(trial.slot_y) < 0) {
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
            this._placeCoach("Press F for the left head, J for the right.", boxes);
        } else if (trial.tutorial === "paid") {
            this._placeCoach("Same keys: F for left, J for right.", boxes);
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
        this._fitHeadToWell(holder, composed.group, box);
    }

    // Fit the shell, not the full drawing. Ears and stamps (painted later) must
    // not shrink one choice relative to the other — that overall-size cue would
    // bias "which looks more like the top".
    _headFitBox(group) {
        let layer = group && group.querySelector(".kit_shell");
        let sil = null;
        if (layer) {
            let paths = layer.querySelectorAll("path");
            for (let i = 0; i < paths.length; i++) {
                let path = paths[i];
                if ((path.getAttribute("class") || "").indexOf("invisible_element") >= 0) continue;
                if (path.getAttribute("display") === "none") continue;
                let fill = path.getAttribute("fill");
                if (!fill || fill === "none") continue;
                let opacity = path.getAttribute("opacity");
                if (opacity != null && Number(opacity) < 0.5) continue;
                sil = path;
                break;
            }
        }
        try {
            let b = (sil || layer || group).getBBox();
            if (b && b.width > 0 && b.height > 0) return b;
        } catch (err) { /* not in the render tree yet */ }
        return null;
    }

    _fitHeadToWell(holder, group, box) {
        let b = this._headFitBox(group);
        if (!b) {
            holder.setAttribute("transform", "translate(" + (box.cx - 200) + " " + (box.cy - 200) + ")");
            return;
        }
        let pad = 0.86;
        let span = Math.max(b.width, b.height);
        let scale = (Math.min(box.w, box.h) * pad) / span;
        let cx = b.x + b.width / 2;
        let cy = b.y + b.height / 2;
        holder.setAttribute(
            "transform",
            "translate(" + box.cx + " " + box.cy + ") scale(" + scale + ") translate(" + (-cx) + " " + (-cy) + ")"
        );
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
            stamp: spec.stamp || null,
            expression: spec.expression || "happy",
            scales: spec.scales ? JSON.parse(JSON.stringify(spec.scales)) : null
        };
    }

    _logAnswer(trial, choice) {
        let selectedParent = choice.key === "F" ? trial.left_parent : (trial.left_parent === "A" ? "B" : "A");
        let winnerSlot = null;
        let loserSlot = null;
        let winnerToken = null;
        let loserToken = null;
        let winnerSlots = null;
        let loserSlots = null;
        let chose3 = null;
        let threeParent = null;
        if (trial.kind === "duel") {
            if (trial.size && Array.isArray(trial.set_a) && Array.isArray(trial.set_b)) {
                threeParent = trial.three_side_parent || (trial.polarity ? "B" : "A");
                chose3 = selectedParent === threeParent;
                winnerSlots = chose3 ? trial.set_a.slice() : trial.set_b.slice();
                loserSlots = chose3 ? trial.set_b.slice() : trial.set_a.slice();
                winnerSlot = this._canonSet(winnerSlots);
                loserSlot = this._canonSet(loserSlots);
            } else if (trial.combo && Array.isArray(trial.set_a) && Array.isArray(trial.set_b)) {
                winnerSlots = selectedParent === "A" ? trial.set_a.slice() : trial.set_b.slice();
                loserSlots = selectedParent === "A" ? trial.set_b.slice() : trial.set_a.slice();
                winnerSlot = this._canonSet(winnerSlots);
                loserSlot = this._canonSet(loserSlots);
            } else {
                winnerSlot = selectedParent === "A" ? trial.slot_x : trial.slot_y;
                loserSlot = selectedParent === "A" ? trial.slot_y : trial.slot_x;
                winnerToken = selectedParent === "A" ? trial.token_x_a : trial.token_y_b;
                loserToken = selectedParent === "A" ? trial.token_y_b : trial.token_x_a;
            }
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
            winner_slots: winnerSlots,
            loser_slots: loserSlots,
            winner_token: winnerToken,
            loser_token: loserToken,
            combo: !!trial.combo,
            size: !!trial.size || !!this.size,
            pack_id: trial.pack_id || this.packId || null,
            pack_scales: trial.pack_scales || this.packScales || null,
            pair_id: trial.pair_id || null,
            head_a_id: trial.head_a_id || null,
            head_b_id: trial.head_b_id || null,
            polarity: trial.polarity == null ? null : trial.polarity,
            three_side_parent: threeParent,
            chose_3_side: chose3,
            family: trial.family || null,
            partition_id: trial.partition_id || null,
            set_a: trial.set_a || null,
            set_b: trial.set_b || null,
            shared_slots: trial.shared_slots || null,
            tokens_a: trial.tokens_a || null,
            tokens_b: trial.tokens_b || null,
            n_a: trial.n_a || null,
            n_b: trial.n_b || null,
            catch_parent: trial.catch_parent || null,
            catch_correct: catchCorrect,
            reaction_time_ms: choice.rt,
            late: !!choice.late,
            wave: trial.wave || (trial.is_practice ? "practice" : "coverage"),
            slot_win_rates: trial.slot_win_rates || null,
            partition_win_rates: trial.partition_win_rates || null,
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
            catalog_tokens: JSON.parse(JSON.stringify(this.catalogTokens || {})),
            pack_id: this.packId,
            pack_scales: this.packScales
        };
        if (typeof dataCont.storeAllData === "function") dataCont.storeAllData(false);
    }

    _wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
