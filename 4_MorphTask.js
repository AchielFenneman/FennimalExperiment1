/**
 * Morph task DV (single polaroid): one centered polaroid starts under a ?
 * occluder (caption ????; blank well). Click ? → the composite prime develops
 * in the well (opacity 0→1 over primeRevealMs; paper film lifts). A radial
 * name quiz (hat_drop keycaps; F ccw / J cw / Space confirm; retry on wrong
 * with shake + rejected SFX) identifies prime.name. Correct → true caption →
 * brief hold → prime→jumble morph with noise ramping 0→peak; jumble hold →
 * fenA/fenB morph over trial_speed with noise ramping peak→0.
 *
 * Identity 2AFC: larger F/J keycaps (keyboard only) name the morph parents;
 * sides from morph_button_sides. Points decay over trial_speed from morph start.
 * On answer: optional resolve_trial → m = 1; polaroid flies to chosen side
 * (F bottom-left, J bottom-right); scene fades.
 *
 * Paid trials require prime: { head?, body?, hat?, toy?, color_scheme?, name }
 * with prime.name and at least one visual part; {} is rejected.
 *
 * Rendering / morph clock / modes (full, shape, color, mesh), grayscale,
 * morph_centerpoint, noise, resolve_trial, and trial blocks match the
 * archived two-polaroid controller (4_MorphTaskTwoCards.js).
 *
 * Practice (unless skip_practice): unpaid shape trials (? → circle prime →
 * Circle/Diamond/Star name quiz → square↔triangle morph → F/J identity).
 *
 * Scoring: chimera scheme. Name quiz unpaid. resolve_trial as documented.
 */
class MorphTaskController {
    constructor(parentLayer, phaseData, returnfunc, expCont) {
        this.ParentLayer = parentLayer;
        this.phaseData = phaseData;
        this.returnfunc = returnfunc;
        this.expCont = expCont;
        this.params = (typeof GenParam !== "undefined" && GenParam.MorphTask) || {};
        this.W = GenParam.SVG_width;
        this.H = GenParam.SVG_height;

        this.fensById = this._indexFennimals(expCont && expCont.stimuli);
        this.trialSpeedMs = this._resolveTrialSpeed();
        this.resolveTrial = this._resolveResolveTrial();
        this.trialSpecs = this._readTrialSpecs();
        this.nameRoster = this._buildNameRoster();
        this.queue = this._buildTrialQueue();
        this.buttonSides = this._assignButtonSides();
        this.buttonOrderIds = this._assignPrimeNameButtonOrder();
        this.buttonRingSpin = this.buttonRingSpin != null ? this.buttonRingSpin : -Math.PI / 2;

        this.answers = [];
        this.sessionPoints = 0;
        this.destroyed = false;
        this.inputLocked = true;
        this.morphRaf = null;
        this.resolveRaf = null;
        this.sceneRoot = null;
        this.layers = null;
        this.currentTrial = null;
        this.currentTrialIndex = -1;
        this._inputStage = null;
        this._nameQuizFjTaught = false;
        this._nameQuizFjCoach = null;

        this._boundKeyDown = (evt) => this._onKeyDown(evt);
        this._boundKeyUp = (evt) => this._onKeyUp(evt);
        window.addEventListener("keydown", this._boundKeyDown);
        window.addEventListener("keyup", this._boundKeyUp);

        this.phaseData.answers = this.answers;
        this.phaseData.trial_speed = this.trialSpeedMs;
        this.phaseData.resolve_trial = this.resolveTrial;
        this.phaseData.morph_trial_order = this.queue.map((t) => t.id);
        this.phaseData.morph_button_sides = this.buttonSides;
        this.phaseData.morph_prime_button_order = this.buttonOrderIds;
        this.phaseData.morph_names_options = (this.nameRoster || []).map((fen) => fen.id);
        this.phaseData.morph_curve = {
            midpoint_min_frac: this._num("midpointMinFrac", 0.15),
            midpoint_max_frac: this._num("midpointMaxFrac", 0.85),
            tau_frac: this._num("tauFrac", 0.30),
            note: "m(t) = 0.5 + 0.5 * normalized logistic around t_mid = f(morph_centerpoint). 0 = resolves early, 1 = resolves late."
        };
    }

    _fail(message) {
        throw new Error("MorphTask: " + message);
    }

    _num(key, fallback) {
        let v = this.params[key];
        return (v !== undefined && v !== null && Number.isFinite(Number(v))) ? Number(v) : fallback;
    }

    _resolveTrialSpeed() {
        let raw = this.phaseData.trial_speed;
        if (raw === undefined || raw === null || raw === "") {
            raw = this.params.trialSpeedMs != null ? this.params.trialSpeedMs : 6000;
        }
        let ms = Number(raw);
        if (!Number.isFinite(ms) || ms <= 0) {
            this._fail(`trial_speed must be a positive number of milliseconds (got "${this.phaseData.trial_speed}").`);
        }
        return ms;
    }

    _resolveResolveTrial() {
        let raw = this.phaseData.resolve_trial;
        if (raw === undefined || raw === null || raw === "") {
            return this.params.resolveTrial !== false;
        }
        if (typeof raw !== "boolean") {
            this._fail(`resolve_trial must be true or false (got "${raw}").`);
        }
        return raw;
    }

    _indexFennimals(stimuli) {
        if (!stimuli || typeof stimuli.get_all_Fennimals_objects_in_array !== "function") {
            this._fail("missing stimuli accessor.");
        }
        let map = {};
        stimuli.get_all_Fennimals_objects_in_array().forEach((fen) => {
            if (fen && fen.id) map[fen.id] = fen;
        });
        return map;
    }

    _getFen(id, path) {
        let fen = this.fensById[String(id).trim()];
        if (!fen) this._fail(`${path || "id"} refers to unknown Fennimal "${id}".`);
        return fen;
    }

    _getFenByHead(head, path) {
        let wanted = String(head || "").trim().replace(/^Fennimal_head_/, "");
        let fen = Object.values(this.fensById).find((candidate) => candidate && candidate.head === wanted);
        if (!fen) {
            this._fail(`${path || "head"} refers to head "${wanted}", but no Fennimal was assigned that head.`);
        }
        return fen;
    }

    _fallbackBody() {
        let ids = Object.keys(this.fensById);
        for (let i = 0; i < ids.length; i++) {
            if (this.fensById[ids[i]].body) return this.fensById[ids[i]].body;
        }
        this._fail("no Fennimal body available for close-up polaroids.");
    }

    // ------------------------------------------------------------------
    // Trial specs, queue and per-trial randomizations
    // ------------------------------------------------------------------

    // trials may be a flat list of trial objects, or an array of blocks
    // (each block an array of trial objects). Block order is fixed; trials
    // are shuffled within each block. Mixing objects and arrays is rejected.
    _normalizeTrialBlocks(raw) {
        if (!Array.isArray(raw) || raw.length === 0) {
            this._fail("phase.trials must be a non-empty array (define the morph trialset in stimulus settings).");
        }
        let blocked = Array.isArray(raw[0]);
        for (let i = 0; i < raw.length; i++) {
            let entry = raw[i];
            if (blocked) {
                if (!Array.isArray(entry)) {
                    this._fail(
                        `trials mixes blocks and bare trials (trials[${i}] is not an array). ` +
                        `Use either a flat list of trials or an array of trial-blocks.`
                    );
                }
                if (entry.length === 0) {
                    this._fail(`trials[${i}] block is empty.`);
                }
                for (let j = 0; j < entry.length; j++) {
                    if (Array.isArray(entry[j])) {
                        this._fail(`trials[${i}][${j}] is nested too deep (blocks are one level of arrays only).`);
                    }
                }
            } else if (Array.isArray(entry)) {
                this._fail(
                    `trials mixes bare trials and blocks (trials[${i}] is an array). ` +
                    `Use either a flat list of trials or an array of trial-blocks.`
                );
            }
        }
        return blocked ? raw : [raw];
    }

    _readTrialSpecs() {
        let blocks = this._normalizeTrialBlocks(this.phaseData.trials);
        // Firestore rejects nested arrays — keep a flat trials list on the phase
        // plus block sizes so analysis can recover block membership.
        this.phaseData.trial_block_sizes = blocks.map((block) => block.length);
        this.phaseData.trials = blocks.reduce((acc, block) => acc.concat(block), []);

        let seen = {};
        this.trialBlocks = [];
        let flat = [];
        blocks.forEach((block, bi) => {
            let expanded = block.map((spec, ti) => {
                let path = blocks.length > 1 ? `trials block ${bi}[${ti}]` : `trials[${ti}]`;
                if (!spec || !spec.id) this._fail(`${path} is missing an id.`);
                if (seen[spec.id]) this._fail(`duplicate trial id "${spec.id}".`);
                seen[spec.id] = true;
                let trial = this._expandTrialSpec(spec);
                trial.blockIndex = bi;
                return trial;
            });
            this.trialBlocks.push(expanded);
            flat = flat.concat(expanded);
        });
        this.phaseData.morph_n_blocks = this.trialBlocks.length;
        return flat;
    }

    _expandTrialSpec(spec) {
        let usesHeadEndpoints = spec.headA != null || spec.headB != null || spec.targetHead != null;
        let fenA = usesHeadEndpoints
            ? this._getFenByHead(spec.headA, `trial "${spec.id}" headA`)
            : this._getFen(spec.fenA, `trial "${spec.id}" fenA`);
        let fenB = usesHeadEndpoints
            ? this._getFenByHead(spec.headB, `trial "${spec.id}" headB`)
            : this._getFen(spec.fenB, `trial "${spec.id}" fenB`);
        if (fenA.id === fenB.id) this._fail(`trial "${spec.id}" fenA and fenB must differ.`);
        let target = usesHeadEndpoints
            ? this._getFenByHead(spec.targetHead, `trial "${spec.id}" targetHead`)
            : this._getFen(spec.target, `trial "${spec.id}" target`);
        if (target.id !== fenA.id && target.id !== fenB.id) {
            this._fail(`trial "${spec.id}" target "${target.id}" must be fenA or fenB.`);
        }
        let centerpoint = Number(spec.morph_centerpoint);
        if (!Number.isFinite(centerpoint) || centerpoint < 0 || centerpoint > 1) {
            this._fail(`trial "${spec.id}" morph_centerpoint must be a number in [0, 1] (got "${spec.morph_centerpoint}").`);
        }
        let noise = spec.noise == null || spec.noise === "" ? 0 : Number(spec.noise);
        if (!Number.isFinite(noise) || noise < 0 || noise > 1) {
            this._fail(`trial "${spec.id}" noise must be a number in [0, 1] when set (got "${spec.noise}").`);
        }
        let morph = spec.morph || "full";
        if (["full", "shape", "color", "mesh"].indexOf(morph) < 0) {
            this._fail(`trial "${spec.id}" morph must be "full" | "shape" | "color" | "mesh" (got "${morph}").`);
        }
        let sameHead = fenA.head === fenB.head;
        if (morph === "color" && !sameHead) {
            this._fail(`trial "${spec.id}" morph "color" requires fenA and fenB to share a head (got "${fenA.head}" vs "${fenB.head}").`);
        }
        if (morph !== "color" && sameHead) {
            this._fail(`trial "${spec.id}" morph "${morph}" requires fenA and fenB to have different heads (both are "${fenA.head}"; use morph: "color").`);
        }
        let view = spec.view || "closeup";
        if (["closeup", "full"].indexOf(view) < 0) {
            this._fail(`trial "${spec.id}" view must be "closeup" | "full" (got "${view}").`);
        }
        let grayscale = false;
        if (spec.grayscale !== undefined && spec.grayscale !== null && spec.grayscale !== "") {
            if (typeof spec.grayscale !== "boolean") {
                this._fail(`trial "${spec.id}" grayscale must be true or false when set (got "${spec.grayscale}").`);
            }
            grayscale = spec.grayscale;
        }
        (["A", "B"]).forEach((side) => {
            let fen = side === "A" ? fenA : fenB;
            if (!fen.name) this._fail(`trial "${spec.id}" fen${side} "${fen.id}" is missing a name.`);
        });
        if (spec.prime === undefined || spec.prime === null) {
            this._fail(`trial "${spec.id}" requires a prime object with name (paid trials).`);
        }
        let prime = this._expandPrimeSpec(spec.prime, spec.id, true);
        return {
            id: spec.id,
            role: spec.role || spec.id,
            kind: spec.kind || "key",
            fenA,
            fenB,
            requestedHeadA: fenA.head || null,
            requestedHeadB: fenB.head || null,
            targetFen: target,
            otherFen: target.id === fenA.id ? fenB : fenA,
            correctId: target.id,
            morphCenterpoint: centerpoint,
            noise,
            morph,
            view,
            grayscale,
            prime,
            question: "Who is this?",
            options: [
                { id: fenA.id, label: fenA.name },
                { id: fenB.id, label: fenB.name }
            ]
        };
    }

    _isBlankPrimeToken(token) {
        if (token === undefined || token === null) return true;
        let s = String(token).trim().toLowerCase();
        return s === "" || s === "none" || s === "null" || s === "neutral";
    }

    _isGrayscaleSchemeToken(token) {
        if (token === undefined || token === null) return false;
        let s = String(token).trim().toLowerCase();
        return s === "gray" || s === "grey" || s === "grayscale" || s === "greyscale";
    }

    _expandPrimeSpec(raw, trialId, paid) {
        if (typeof raw !== "object" || Array.isArray(raw)) {
            this._fail(`trial "${trialId}" prime must be an object.`);
        }
        let headId = this._isBlankPrimeToken(raw.head) ? null : String(raw.head).trim();
        let bodyId = this._isBlankPrimeToken(raw.body) ? null : String(raw.body).trim();
        let hatId = this._isBlankPrimeToken(raw.hat) ? null : String(raw.hat).trim();
        let toyId = this._isBlankPrimeToken(raw.toy) ? null : String(raw.toy).trim();
        let nameId = this._isBlankPrimeToken(raw.name) ? null : String(raw.name).trim();
        let colorRaw = this._isBlankPrimeToken(raw.color_scheme) ? null : String(raw.color_scheme).trim();

        if (paid) {
            if (!nameId) this._fail(`trial "${trialId}" prime.name is required on paid trials.`);
            if (!headId && !bodyId && !hatId && !toyId) {
                this._fail(`trial "${trialId}" prime must include at least one of head, body, hat, or toy (empty {} not allowed).`);
            }
        }

        let headFen = headId ? this._getFen(headId, `trial "${trialId}" prime.head`) : null;
        let bodyFen = bodyId ? this._getFen(bodyId, `trial "${trialId}" prime.body`) : null;
        let hatFen = hatId ? this._getFen(hatId, `trial "${trialId}" prime.hat`) : null;
        let toyFen = toyId ? this._getFen(toyId, `trial "${trialId}" prime.toy`) : null;
        let nameFen = nameId ? this._getFen(nameId, `trial "${trialId}" prime.name`) : null;

        if (bodyFen && !bodyFen.body) {
            this._fail(`trial "${trialId}" prime.body "${bodyId}" has no body SVG assigned.`);
        }
        if (headFen && !headFen.head) {
            this._fail(`trial "${trialId}" prime.head "${headId}" has no head SVG assigned.`);
        }
        if (hatId && hatFen && !hatFen.hat) {
            this._fail(`trial "${trialId}" prime.hat "${hatId}" has no hat assigned.`);
        }
        if (toyId && toyFen && !toyFen.toy) {
            this._fail(`trial "${trialId}" prime.toy "${toyId}" has no toy assigned.`);
        }
        if (toyFen && !bodyFen) {
            this._fail(`trial "${trialId}" prime.toy requires prime.body (toy attaches to the body).`);
        }

        let schemeMode = "grayscale";
        let schemeFen = null;
        if (colorRaw) {
            if (this._isGrayscaleSchemeToken(colorRaw)) {
                schemeMode = "grayscale";
            } else {
                schemeFen = this._getFen(colorRaw, `trial "${trialId}" prime.color_scheme`);
                schemeMode = "fen";
            }
        } else if (nameFen) {
            // Default: palette of the named Fennimal (its region colors).
            schemeFen = nameFen;
            schemeMode = "fen";
        } else if (bodyFen) {
            schemeFen = bodyFen;
            schemeMode = "fen";
        }

        let trueCaption = nameFen && nameFen.name ? String(nameFen.name) : null;
        let needsNameQuiz = !!trueCaption;
        let caption = "????";
        let hasToy = !!(toyFen && toyFen.toy);
        return {
            headFen,
            bodyFen,
            hatFen,
            toyFen,
            nameFen,
            hasHead: !!headFen,
            hasBody: !!bodyFen,
            hasHat: !!(hatFen && hatFen.hat),
            hasToy,
            empty: !headFen && !bodyFen && !(hatFen && hatFen.hat) && !hasToy,
            schemeMode,
            schemeFen,
            needsNameQuiz,
            trueCaption,
            caption,
            log: {
                head: headId,
                body: bodyId,
                hat: hatId,
                toy: toyId,
                color_scheme: colorRaw,
                name: nameId,
                caption,
                needs_name_quiz: needsNameQuiz
            }
        };
    }

    _primeNeedsNameQuiz(trial) {
        return !!(trial && trial.prime && trial.prime.needsNameQuiz && trial.prime.nameFen);
    }

    _buildNameRoster() {
        let needsAny = (this.trialSpecs || []).some((t) => this._primeNeedsNameQuiz(t));
        if (!needsAny) return [];

        let declared = this.phaseData.names_options;
        if (declared != null && !Array.isArray(declared)) {
            this._fail("names_options must be an array of Fennimal ids.");
        }
        if (!Array.isArray(declared) || declared.length === 0) {
            this._fail("names_options is required (non-empty) when any trial has prime.name.");
        }

        let roster = [];
        let seen = {};
        const add = (raw, path) => {
            if (this._isBlankPrimeToken(raw)) return;
            let fen = this._getFen(String(raw).trim(), path);
            if (seen[fen.id]) return;
            seen[fen.id] = true;
            if (!fen.name) this._fail(`${path}: Fennimal "${fen.id}" is missing a name.`);
            roster.push(fen);
        };
        declared.forEach((id, i) => add(id, `names_options[${i}]`));
        (this.trialSpecs || []).forEach((spec) => {
            if (spec.prime && spec.prime.nameFen) {
                add(spec.prime.nameFen.id, `trial "${spec.id}" prime.name`);
            }
        });
        if (!roster.length) {
            this._fail("names_options plus named primes produced no name buttons.");
        }
        return roster;
    }

    _nameOptionsForTrial(trial) {
        if (trial && trial.is_practice) {
            return (trial.nameOptions && trial.nameOptions.length)
                ? trial.nameOptions.slice()
                : [
                    { id: "circle", label: "Circle" },
                    { id: "diamond", label: "Diamond" },
                    { id: "star", label: "Star" }
                ];
        }
        return (this.nameRoster || []).map((fen) => ({ id: fen.id, label: fen.name }));
    }

    _assignPrimeNameButtonOrder() {
        let ids = (this.nameRoster || []).map((opt) => opt.id);
        if (!ids.length) {
            this.buttonRingSpin = -Math.PI / 2;
            return [];
        }
        let key = "morph_prime_button_order";
        let existing = this._readRandomization(key);
        if (existing && Array.isArray(existing.ids)
            && existing.ids.length === ids.length
            && ids.every((id) => existing.ids.indexOf(id) !== -1)) {
            this.buttonRingSpin = (typeof existing.spin === "number") ? existing.spin : -Math.PI / 2;
            return existing.ids.slice();
        }
        let order = shuffleArray(ids.slice());
        this.buttonRingSpin = -Math.PI / 2;
        this._persistRandomization(key, { ids: order, spin: this.buttonRingSpin });
        return order;
    }

    _sortByButtonOrder(options) {
        let rank = {};
        (this.buttonOrderIds || []).forEach((id, i) => { rank[id] = i; });
        return (options || []).slice().sort((a, b) => {
            let ia = rank[a.id];
            let ib = rank[b.id];
            if (ia == null && ib == null) return 0;
            if (ia == null) return 1;
            if (ib == null) return -1;
            return ia - ib;
        });
    }

    _practiceTrials() {
        if (this.phaseData.skip_practice === true) return [];
        let nameOptions = [
            { id: "circle", label: "Circle" },
            { id: "diamond", label: "Diamond" },
            { id: "star", label: "Star" }
        ];
        return [
            {
                id: "practice_square",
                role: "practice",
                kind: "practice",
                is_practice: true,
                tutorial: "practice",
                shapeTarget: "square",
                shapeOther: "triangle",
                primeShape: "circle",
                nameCorrectId: "circle",
                nameOptions,
                correctId: "square",
                morphCenterpoint: 0.5,
                noise: 0.15,
                morph: "shape",
                view: "closeup",
                question: "What shape?",
                options: [
                    { id: "square", label: "Square" },
                    { id: "triangle", label: "Triangle" }
                ]
            },
            {
                id: "practice_triangle",
                role: "practice",
                kind: "practice",
                is_practice: true,
                tutorial: false,
                shapeTarget: "triangle",
                shapeOther: "square",
                primeShape: "circle",
                nameCorrectId: "circle",
                nameOptions,
                correctId: "triangle",
                morphCenterpoint: 0.5,
                noise: 0.15,
                morph: "shape",
                view: "closeup",
                question: "What shape?",
                options: [
                    { id: "square", label: "Square" },
                    { id: "triangle", label: "Triangle" }
                ]
            }
        ];
    }

    _persistRandomization(key, value) {
        let dataCont = this.expCont && this.expCont.dataCont;
        if (!dataCont || !dataCont.experimentData) return;
        if (!dataCont.experimentData.phaseRandomizations) dataCont.experimentData.phaseRandomizations = {};
        dataCont.experimentData.phaseRandomizations[key] = value;
        if (typeof dataCont.storeAllData === "function") dataCont.storeAllData(false);
    }

    _readRandomization(key) {
        let dataCont = this.expCont && this.expCont.dataCont;
        if (!dataCont || !dataCont.experimentData || !dataCont.experimentData.phaseRandomizations) return null;
        return dataCont.experimentData.phaseRandomizations[key] || null;
    }

    _buildTrialQueue() {
        let practice = this._practiceTrials();
        let byId = {};
        this.trialSpecs.forEach((t) => { byId[t.id] = t; });
        let blocks = this.trialBlocks || [this.trialSpecs];
        let blockIdSets = blocks.map((block) => block.map((t) => t.id));
        let paidIds = blockIdSets.reduce((acc, ids) => acc.concat(ids), []);
        let blockSizes = blockIdSets.map((ids) => ids.length);

        let key = "morph_trial_order";
        let existing = this._readRandomization(key);

        // Preferred restore: flat ids + block_sizes (Firestore-safe; no nested arrays).
        if (existing && Array.isArray(existing.ids) && Array.isArray(existing.block_sizes)
            && existing.block_sizes.length === blockSizes.length
            && existing.block_sizes.every((n, i) => n === blockSizes[i])) {
            let cursor = 0;
            let ok = true;
            let restoredBlocks = [];
            for (let bi = 0; bi < blockSizes.length; bi++) {
                let n = blockSizes[bi];
                let slice = existing.ids.slice(cursor, cursor + n);
                cursor += n;
                let want = blockIdSets[bi].slice().sort();
                let unique = slice.filter((id, i) => slice.indexOf(id) === i && byId[id]);
                let gotSorted = unique.slice().sort();
                if (unique.length !== want.length || want.some((id, i) => id !== gotSorted[i])) {
                    ok = false;
                    break;
                }
                restoredBlocks.push(unique.map((id) => byId[id]));
            }
            if (ok && cursor === existing.ids.length) {
                let paid = restoredBlocks.reduce((acc, block) => acc.concat(block), []);
                let queue = practice.concat(paid);
                this._markFirstPaidTutorial(queue);
                this._persistRandomization(key, {
                    ids: paid.map((t) => t.id),
                    block_sizes: blockSizes.slice()
                });
                return queue;
            }
        }

        // Legacy in-memory restore with nested block_ids (pre-Firestore-safe format).
        if (existing && Array.isArray(existing.block_ids) && existing.block_ids.length === blockIdSets.length) {
            let ok = true;
            let restoredBlocks = [];
            for (let bi = 0; bi < blockIdSets.length; bi++) {
                let want = blockIdSets[bi].slice().sort();
                let got = (existing.block_ids[bi] || []).filter((id) => byId[id]);
                let unique = got.filter((id, i) => got.indexOf(id) === i);
                let gotSorted = unique.slice().sort();
                if (unique.length !== want.length || want.some((id, i) => id !== gotSorted[i])) {
                    ok = false;
                    break;
                }
                restoredBlocks.push(unique.map((id) => byId[id]));
            }
            if (ok) {
                let paid = restoredBlocks.reduce((acc, block) => acc.concat(block), []);
                let queue = practice.concat(paid);
                this._markFirstPaidTutorial(queue);
                this._persistRandomization(key, {
                    ids: paid.map((t) => t.id),
                    block_sizes: blockSizes.slice()
                });
                return queue;
            }
        }

        // Legacy flat restore: only valid when there is a single block.
        if (existing && Array.isArray(existing.ids) && blockIdSets.length === 1
            && !Array.isArray(existing.block_sizes)) {
            let restored = existing.ids.filter((id) => byId[id]);
            let unique = restored.filter((id, i) => restored.indexOf(id) === i);
            if (unique.length === paidIds.length && paidIds.every((id) => unique.indexOf(id) !== -1)) {
                let queue = practice.concat(unique.map((id) => byId[id]));
                this._markFirstPaidTutorial(queue);
                this._persistRandomization(key, {
                    ids: unique,
                    block_sizes: [unique.length]
                });
                return queue;
            }
        }

        let shuffledBlocks = blocks.map((block) => shuffleArray(block.slice()));
        let paid = shuffledBlocks.reduce((acc, block) => acc.concat(block), []);
        let queue = practice.concat(paid);
        this._markFirstPaidTutorial(queue);
        this._persistRandomization(key, {
            ids: paid.map((t) => t.id),
            block_sizes: shuffledBlocks.map((block) => block.length)
        });
        return queue;
    }

    _markFirstPaidTutorial(queue) {
        (queue || []).forEach((t) => {
            if (t && !t.is_practice && t.tutorial) t.tutorial = false;
        });
        let firstPaid = (queue || []).find((t) => t && !t.is_practice);
        if (firstPaid) firstPaid.tutorial = "paid";
    }

    // Per trial: which option id sits on the RIGHT button (the other goes left).
    _assignButtonSides() {
        let key = "morph_button_sides";
        let existing = this._readRandomization(key);
        let sides = (existing && existing.sides && typeof existing.sides === "object") ? existing.sides : {};
        let changed = false;
        this.queue.forEach((trial) => {
            let stored = sides[trial.id];
            let valid = stored && trial.options.some((o) => o.id === stored);
            if (!valid) {
                sides[trial.id] = trial.options[Math.floor(Math.random() * trial.options.length)].id;
                changed = true;
            }
        });
        if (changed || !existing) this._persistRandomization(key, { sides });
        return sides;
    }

    // ------------------------------------------------------------------
    // Morph math
    // ------------------------------------------------------------------

    _morphSpec(trial) {
        if (trial._morphSpec) return trial._morphSpec;
        let T = this.trialSpeedMs;
        let minF = this._num("midpointMinFrac", 0.15);
        let maxF = this._num("midpointMaxFrac", 0.85);
        let c = trial.morphCenterpoint != null ? trial.morphCenterpoint : 0.5;
        let tMid = (minF + (maxF - minF) * c) * T;
        let tau = Math.max(1, this._num("tauFrac", 0.30) * T);
        trial._morphSpec = { T, tMid, tau };
        return trial._morphSpec;
    }

    _morphWeightAt(elapsedMs, trial) {
        let spec = this._morphSpec(trial);
        const sig = (t) => 1 / (1 + Math.exp(-(t - spec.tMid) / spec.tau));
        let s0 = sig(0);
        let m = 0.5 + 0.5 * (sig(Math.max(0, elapsedMs)) - s0) / Math.max(1e-9, 1 - s0);
        return Math.max(0.5, Math.min(1, m));
    }

    // ------------------------------------------------------------------
    // Colour helpers
    // ------------------------------------------------------------------

    _schemeFromRegion(region) {
        let data = GenParam.RegionData && GenParam.RegionData[region];
        let c = data && data.Fennimal_location_colors;
        if (!c) this._fail(`region "${region}" has no Fennimal_location_colors.`);
        return {
            primary_color: c.primary_color,
            secondary_color: c.secondary_color,
            tertiary_color: c.tertiary_color,
            eye_color: c.eye_color
        };
    }

    _schemeFromFen(fen) {
        if (fen && fen.ColorScheme && fen.ColorScheme.Head) {
            return JSON.parse(JSON.stringify(fen.ColorScheme.Head));
        }
        return this._schemeFromRegion(fen.region);
    }

    // Fixed primary/secondary/tertiary/eye grays (GenParam.MorphTask.grayscaleScheme).
    _grayscaleScheme() {
        let s = this.params.grayscaleScheme || {};
        return {
            primary_color: s.primary_color || "#c4c4c4",
            secondary_color: s.secondary_color || "#8e8e8e",
            tertiary_color: s.tertiary_color || "#5a5a5a",
            eye_color: s.eye_color || "#3a3a3a"
        };
    }

    _grayscaleToyScheme() {
        let scheme = this._grayscaleScheme();
        let t = this.params.grayscaleToyScheme || {};
        return {
            light_color: t.light_color || scheme.primary_color,
            dark_color: t.dark_color || scheme.tertiary_color
        };
    }

    // Morph parent palette: fixed grays when trial.grayscale, else Fennimal / blend.
    _schemesForMorphTrial(trial) {
        if (trial.grayscale) {
            let gray = this._grayscaleScheme();
            return { target: gray, other: gray };
        }
        if (trial.morph === "shape") {
            let blended = this._blendSchemes(
                this._schemeFromFen(trial.fenA),
                this._schemeFromFen(trial.fenB),
                0.5
            );
            return { target: blended, other: blended };
        }
        return {
            target: this._schemeFromFen(trial.targetFen),
            other: this._schemeFromFen(trial.otherFen)
        };
    }

    _parseCssColor(raw) {
        if (raw == null) return null;
        let s = String(raw).trim().toLowerCase();
        if (!s || s === "none" || s === "transparent" || s === "currentcolor") return null;
        if (s === "black") return [0, 0, 0];
        if (s === "white") return [255, 255, 255];
        if (s[0] === "#") {
            let hex = s.slice(1);
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            if (hex.length !== 6 || /[^0-9a-f]/.test(hex)) return null;
            return [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16)
            ];
        }
        let m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
        if (!m) return null;
        return [Number(m[1]), Number(m[2]), Number(m[3])];
    }

    _grayLevelForLuminance(lum, scheme) {
        if (lum >= 170) return scheme.primary_color;
        if (lum >= 85) return scheme.secondary_color;
        return scheme.tertiary_color;
    }

    // Hats (and any leftover colored fills) lack Fennimal_* classes; map each
    // non-black fill onto the fixed gray palette by luminance bin.
    _remapBareFillsToGrayPalette(root, scheme) {
        if (!root || !root.querySelectorAll) return;
        scheme = scheme || this._grayscaleScheme();
        let skipClass = {
            Fennimal_primary_color: 1,
            Fennimal_secondary_color: 1,
            Fennimal_tertiary_color: 1,
            Fennimal_eye_color: 1,
            item_col_light: 1,
            item_col_dark: 1,
            invisible_element: 1,
            prep_element_hidden: 1
        };
        root.querySelectorAll("path, circle, rect, polygon, ellipse, line, polyline").forEach((el) => {
            if (!el || !el.classList) return;
            for (let i = 0; i < el.classList.length; i++) {
                if (skipClass[el.classList[i]]) return;
            }
            let fill = el.getAttribute("fill");
            if (fill == null || fill === "") fill = el.style && el.style.fill;
            let rgb = this._parseCssColor(fill);
            if (!rgb) return;
            let lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
            if (lum < 18) return; // keep near-black (outlines)
            let gray = this._grayLevelForLuminance(lum, scheme);
            el.setAttribute("fill", gray);
            if (el.style) el.style.fill = gray;
        });
    }

    _applyFixedGrayscaleAccessories(root) {
        if (!root) return;
        let scheme = this._grayscaleScheme();
        let toy = this._grayscaleToyScheme();
        this._applyPartColors(root, scheme);
        set_fill_for_all_elements_in_array(root.getElementsByClassName("item_col_light"), toy.light_color);
        set_fill_for_all_elements_in_array(root.getElementsByClassName("item_col_dark"), toy.dark_color);
        this._remapBareFillsToGrayPalette(root, scheme);
    }

    _lerpHex(from, to, t) {
        t = Math.min(1, Math.max(0, t));
        const parse = (hex) => [
            parseInt(hex.slice(1, 3), 16),
            parseInt(hex.slice(3, 5), 16),
            parseInt(hex.slice(5, 7), 16)
        ];
        let a = parse(from);
        let b = parse(to);
        let hex = "#";
        for (let i = 0; i < 3; i++) {
            hex += Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, "0");
        }
        return hex;
    }

    _blendSchemes(schemeA, schemeB, t) {
        let out = {};
        ["primary_color", "secondary_color", "tertiary_color", "eye_color"].forEach((k) => {
            let a = schemeA[k];
            let b = schemeB[k];
            out[k] = (a && b) ? this._lerpHex(a, b, t) : (a || b);
        });
        return out;
    }

    // ------------------------------------------------------------------
    // Fennimal icon helpers (same tactics as the chimera task)
    // ------------------------------------------------------------------

    _stripHelperMarks(root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll(".invisible_element, .prep_element_hidden").forEach((el) => el.remove());
    }

    _freezeHappyExpression(root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('[class*="_sad"]').forEach((el) => {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            el.style.display = "none";
            el.setAttribute("opacity", "0");
            el.setAttribute("visibility", "hidden");
            el.setAttribute("display", "none");
        });
        root.querySelectorAll('[class*="_happy"]').forEach((el) => {
            el.style.opacity = "1";
            el.style.visibility = "visible";
            el.style.display = "";
            el.setAttribute("opacity", "1");
            el.setAttribute("visibility", "visible");
            el.removeAttribute("display");
        });
    }

    _prepareFennimalIcon(icon) {
        if (!icon) return;
        this._stripHelperMarks(icon);
        freeze_fennimal_decorative_animations(icon);
        this._freezeHappyExpression(icon);
    }

    // Prime polaroids must be a completely static portrait — no CSS/SMIL
    // decorative loops, no mid-keyframe transforms, no transitions.
    _preparePrimeIcon(icon) {
        if (!icon) return;
        this._stripHelperMarks(icon);
        this._freezeHappyExpression(icon);
        if (typeof freeze_fennimal_decorative_animations === "function") {
            freeze_fennimal_decorative_animations(icon);
        }
        icon.querySelectorAll("animate, animateTransform, animateMotion, set").forEach((el) => el.remove());
        let animatedSelectors = [
            ".Fennimal_head_tilt",
            ".eye_gaze",
            "[class*='snowflake_']",
            "[class*='spore_']",
            "[class*='heat_wave_']",
            "[class*='jungle_firefly_']",
            "[class*='dust_cloud_']",
            "[class*='climber_arm_']",
            "[class*='leaf_']",
            "[class*='toe_tap']",
            "[class*='bone_rattle']",
            "[class*='gear_swing']",
            "[class*='mushroom_cap_']",
            "[class*='icy_']",
            "[class*='tail-']",
            "[class*='scarf-']"
        ].join(", ");
        icon.querySelectorAll(animatedSelectors).forEach((el) => {
            el.style.animation = "none";
            el.style.transition = "none";
            el.style.transform = "none";
        });
        icon.querySelectorAll("*").forEach((el) => {
            el.style.animation = "none";
            el.style.animationPlayState = "paused";
            el.style.transition = "none";
        });
    }

    _applyPartColors(icon, scheme) {
        if (!icon || !scheme) return;
        set_fill_for_all_elements_in_array(icon.getElementsByClassName("Fennimal_primary_color"), scheme.primary_color);
        set_fill_for_all_elements_in_array(icon.getElementsByClassName("Fennimal_secondary_color"), scheme.secondary_color);
        set_fill_for_all_elements_in_array(icon.getElementsByClassName("Fennimal_tertiary_color"), scheme.tertiary_color);
        set_fill_for_all_elements_in_array(icon.getElementsByClassName("Fennimal_eye_color"), scheme.eye_color);
    }

    // ------------------------------------------------------------------
    // Phase lifecycle
    // ------------------------------------------------------------------

    _setLocator() {
        if (typeof Interface === "undefined" || !Interface.Locator) return;
        if (Interface.player_moved_to_new_region) Interface.player_moved_to_new_region("Home");
        if (Interface.Locator.change_locator_name) Interface.Locator.change_locator_name("Photo room");
    }

    async start_sequence() {
        try {
            this._ensureLayers();
            this.ParentLayer.style.display = "inherit";
            if (typeof Interface !== "undefined") {
                if (Interface.FenneFinder && Interface.FenneFinder.hide) Interface.FenneFinder.hide();
                if (Interface.Prompt) Interface.Prompt.hide();
                this._setLocator();
            }

            this.phaseData.number_interactions_in_phase = this.queue.length;
            this.phaseData.Data = this.answers;

            for (let i = 0; i < this.queue.length; i++) {
                if (this.destroyed) return;
                this.currentTrialIndex = i;
                this.currentTrial = this.queue[i];
                if (this.expCont && this.expCont.instrCont && this.expCont.instrCont.updateProgressWithinDay) {
                    this.expCont.instrCont.updateProgressWithinDay((i / this.queue.length) * 100);
                }
                await this.expCont.prepareMorphTrialTravel(this.currentTrial);
                this._setLocator();
                if (this.destroyed) return;
                await this._runTrial(this.currentTrial);
            }

            this._finishPhase();
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    _finishPhase() {
        let perStar = this.params.pointsPerStar || 100;
        let starsEarned = Math.floor(Math.max(0, this.sessionPoints) / perStar);
        let maxStars = this.queue.filter((t) => t && !t.is_practice).length;
        this.phaseData.bonus_stars_earned = starsEarned;
        this.phaseData.session_points = this.sessionPoints;
        if (this.expCont && this.expCont.dataCont && this.expCont.dataCont.recordStarsEarned) {
            this.expCont.dataCont.recordStarsEarned(
                this.expCont.currentDayNum,
                "morph_task",
                starsEarned,
                maxStars
            );
        }
        if (typeof this.returnfunc === "function") this.returnfunc();
    }

    // ------------------------------------------------------------------
    // Scene scaffolding
    // ------------------------------------------------------------------

    _ensureLayers() {
        if (this.layers) return;
        this.sceneRoot = create_SVG_group(0, 0, "morph_task_root", "morph_task_root");
        this.layers = {
            Neg1: create_SVG_group(0, 0, "morph_layer_neg1", "morph_layer_neg1"),
            Main: create_SVG_group(0, 0, "morph_layer_main", "morph_layer_main"),
            Plus1: create_SVG_group(0, 0, "morph_layer_plus1", "morph_layer_plus1"),
            Plus2: create_SVG_group(0, 0, "morph_layer_plus2", "morph_layer_plus2")
        };
        this.sceneRoot.appendChild(this.layers.Neg1);
        this.sceneRoot.appendChild(this.layers.Main);
        this.sceneRoot.appendChild(this.layers.Plus1);
        this.sceneRoot.appendChild(this.layers.Plus2);
        this.ParentLayer.appendChild(this.sceneRoot);
    }

    _clearLayer(layer) {
        if (!layer) return;
        while (layer.firstChild) layer.removeChild(layer.firstChild);
    }


    _clearScene() {
        this._stopMorph();
        this._stopResolveAnim();
        this._stopNoise(true);
        this._clearNameQuizUi();
        this._clearIdentityKeys();
        this._clearStartSpaceKey();
        this._nameQuizResolve = null;
        this._startResolve = null;
        this._waitingForStart = false;
        this._inputStage = null;
        this._clearLayer(this.layers && this.layers.Neg1);
        this._clearLayer(this.layers && this.layers.Main);
        this._clearLayer(this.layers && this.layers.Plus1);
        this._clearLayer(this.layers && this.layers.Plus2);
        this.stimulusGroup = null;
        this.photoWellRect = null;
        this.polaroidMount = null;
        this.primeGroup = null;
        this.primeFilmRect = null;
        this.occluder = null;
        this.occluderHit = null;
        this.questionEl = null;
        this.pointsEl = null;
        this.pointsDiv = null;
        this.barLeft = null;
        this.barRight = null;
        this.optionSides = null;
        this.identityKeyF = null;
        this.identityKeyJ = null;
        this._primeNameQuizResult = null;
        this.morphGroup = null;
        this.targetIcon = null;
        this.otherIcon = null;
        this.filmRect = null;
        this.noiseGroup = null;
        this.noiseInterval = null;
        this.noiseFadeTimeout = null;
        this._noisePeak = 0;
        this._noiseAmount = 0;
        this._noiseRedraw = null;
        this._noiseRampRaf = null;
        this.meshCanvas = null;
        this.meshData = null;
        this.meshForeignObject = null;
        this.activeRenderer = null;
        this.meshFallbackReason = null;
    }

    _paintBackdrop() {
        let p = this.params;
        let backdrop = create_SVG_rect(0, 0, this.W, this.H);
        backdrop.setAttribute("fill", "#e6e6e6");
        this.layers.Neg1.appendChild(backdrop);
        if (p.indoorBackground) {
            let photo = document.createElementNS("http://www.w3.org/2000/svg", "image");
            photo.setAttribute("href", p.indoorBackground);
            photo.setAttribute("width", "100%");
            photo.setAttribute("height", "100%");
            photo.setAttribute("preserveAspectRatio", "none");
            this.layers.Neg1.appendChild(photo);
        }
        if (p.indoorOverlayOpacity) {
            let wash = create_SVG_rect(0, 0, this.W, this.H);
            wash.setAttribute("fill", "white");
            wash.style.opacity = String(p.indoorOverlayOpacity);
            wash.style.pointerEvents = "none";
            this.layers.Neg1.appendChild(wash);
        }
    }

    _placePolaroidChrome(trial) {
        let template = document.getElementById("polaroid_frame");
        if (!template) this._fail("missing SVG polaroid_frame template.");

        let cx = (this.params.polaroidX != null ? this.params.polaroidX : 0.5) * this.W;
        let cy = (this.params.polaroidY != null ? this.params.polaroidY : 0.48) * this.H;
        let polaroidScale = this.params.polaroidScale != null ? this.params.polaroidScale : 0.9;

        let groupTranslate = create_SVG_group(0, 0, "morph_polaroid");
        let groupRotate = create_SVG_group(0, 0);
        let groupScale = create_SVG_group(0, 0);
        groupRotate.appendChild(groupScale);
        groupTranslate.appendChild(groupRotate);
        this.layers.Main.appendChild(groupTranslate);

        let frame = copy_scale_and_move_object_to_position(template, groupScale, cx, cy, 1);
        let bgRect = frame.getElementsByTagName("rect")[0];
        if (bgRect) {
            bgRect.style.fill = this.params.polaroidPaperFill || "#f4efe4";
            bgRect.style.display = "inherit";
            this.photoWellRect = bgRect;
        }
        this._setPolaroidCaption(frame, "????");

        let photoHost = bgRect && bgRect.parentNode;
        if (photoHost) photoHost.style.pointerEvents = "none";
        let framePath = this._photoWellPath();
        if (framePath) framePath.style.pointerEvents = "none";

        groupScale.style.transformOrigin = "center";
        groupRotate.style.transformOrigin = `${cx}px ${cy}px`;
        groupScale.style.transform = `scale(${polaroidScale})`;
        groupRotate.style.transform = `rotate(-3deg)`;

        this.stimulusGroup = groupTranslate;
        this.polaroidMount = { groupTranslate, groupRotate, groupScale, cx, cy, bgRect, photoHost, framePath, frame };
        return this.polaroidMount;
    }

    _mountPolaroidBaseTransform() {
        let m = this.polaroidMount || {};
        if (m.groupScale) m.groupScale.style.transform = `scale(${this.params.polaroidScale != null ? this.params.polaroidScale : 0.9})`;
        if (m.groupRotate) m.groupRotate.style.transform = "rotate(-3deg)";
        if (m.groupTranslate) {
            m.groupTranslate.style.transition = "";
            m.groupTranslate.style.transform = "";
            m.groupTranslate.style.opacity = "1";
        }
    }

    _preparePrimeNode(trial) {
        if (trial.is_practice) {
            let shape = trial.primeShape || trial.shapeTarget;
            let node = this._buildShapeNode(shape);
            return { node, widthFrac: 0.55, heightFrac: 0.5 };
        }
        if (!trial.prime || trial.prime.empty) return null;
        return this._buildPrimeIcon(trial.prime);
    }

    _placeHiddenPrime(trial) {
        let built = this._preparePrimeNode(trial);
        if (!built || !built.node) return;
        // Insert first, then fit — getBBox on a detached SVG node often returns
        // empty/zeros and leaves the prime with a broken transform (invisible).
        if (!this._insertInPhotoWell(built.node) && this.polaroidMount && this.polaroidMount.groupScale) {
            this.polaroidMount.groupScale.appendChild(built.node);
        }
        this._fitNodeInPhotoWell(built.node, built.widthFrac, built.heightFrac);
        built.node.style.opacity = "0";
        built.node.setAttribute("opacity", "0");
        this.primeGroup = built.node;
        let well = this._photoWellBox();
        if (well) {
            let film = create_SVG_rect(well.x, well.y, well.width, well.height);
            film.setAttribute("rx", well.rx);
            film.setAttribute("ry", well.ry);
            film.setAttribute("fill", this.params.filmFill || this.params.polaroidPaperFill || "#f4efe4");
            film.style.pointerEvents = "none";
            film.style.opacity = String(this._num("filmMaxOpacity", 0.18));
            this._insertInPhotoWell(film);
            this.primeFilmRect = film;
        }
    }

    async _animatePrimeReveal() {
        if (!this.primeGroup) return;
        // Re-fit after the occluder is gone so layout/bbox is final.
        let trial = this.currentTrial;
        let wFrac = 0.78;
        let hFrac = 0.78;
        if (trial && trial.is_practice) {
            wFrac = 0.55;
            hFrac = 0.5;
        } else if (trial && trial.prime) {
            let p = trial.prime;
            if (!p.hasHead && !p.hasBody && p.hasHat) {
                wFrac = 0.62;
                hFrac = 0.55;
            } else if (p.hasHead && !p.hasBody) {
                wFrac = 0.72;
                hFrac = 0.62;
            }
        }
        try {
            this._fitNodeInPhotoWell(this.primeGroup, wFrac, hFrac);
        } catch (e) { /* keep prior transform */ }

        let ms = Math.max(1, Math.round(this._num("primeRevealMs", 900)));
        let node = this.primeGroup;
        let film = this.primeFilmRect;
        let filmMax = this._num("filmMaxOpacity", 0.18);
        let start = performance.now();
        await new Promise((resolve) => {
            const tick = (now) => {
                if (this.destroyed) return resolve();
                let t = Math.min(1, (now - start) / ms);
                let eased = 1 - Math.pow(1 - t, 2);
                node.style.opacity = String(eased);
                node.setAttribute("opacity", String(eased));
                if (film) film.style.opacity = String(filmMax * (1 - eased));
                if (t >= 1) return resolve();
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
        node.style.opacity = "1";
        node.setAttribute("opacity", "1");
        if (film) {
            film.remove();
            this.primeFilmRect = null;
        }
    }

    async _holdThenClearPrime() {
        await wait(Math.max(0, Math.round(this._num("primeHoldMs", 400))));
    }

    _clearPrimeFromWell() {
        if (this.primeGroup && this.primeGroup.parentNode) this.primeGroup.remove();
        this.primeGroup = null;
        if (this.primeFilmRect) {
            this.primeFilmRect.remove();
            this.primeFilmRect = null;
        }
    }

    _loadCanvasFromSvgElement(svgEl, canvas) {
        let ctx = canvas.getContext("2d");
        let xml = new XMLSerializer().serializeToString(svgEl);
        if (xml.indexOf("xmlns") < 0) {
            xml = xml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        let url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
        return new Promise((resolve, reject) => {
            let img = new Image();
            let settled = false;
            let timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                reject(new Error("prime/jumble raster timed out."));
            }, 8000);
            img.onload = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas);
            };
            img.onerror = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                reject(new Error("prime/jumble raster failed to decode."));
            };
            img.src = url;
        });
    }

    // Rasterize well-local SVG nodes onto a square canvas (paper bg + clones).
    async _rasterizeWellNodes(nodes, well, size) {
        let ns = "http://www.w3.org/2000/svg";
        let svg = document.createElementNS(ns, "svg");
        svg.setAttribute("xmlns", ns);
        svg.setAttribute("viewBox", `${well.x} ${well.y} ${well.width} ${well.height}`);
        svg.setAttribute("width", String(size));
        svg.setAttribute("height", String(size));
        let bg = document.createElementNS(ns, "rect");
        bg.setAttribute("x", String(well.x));
        bg.setAttribute("y", String(well.y));
        bg.setAttribute("width", String(well.width));
        bg.setAttribute("height", String(well.height));
        bg.setAttribute("rx", String(well.rx || 0));
        bg.setAttribute("ry", String(well.ry || 0));
        bg.setAttribute("fill", this.params.polaroidPaperFill || "#f4efe4");
        svg.appendChild(bg);
        (nodes || []).forEach((node) => {
            if (!node) return;
            try {
                svg.appendChild(node.cloneNode(true));
            } catch (e) { /* skip undonable node */ }
        });
        let canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        await this._loadCanvasFromSvgElement(svg, canvas);
        return canvas;
    }

    _placeWellCanvasOverlay(well, size) {
        let ns = "http://www.w3.org/2000/svg";
        let foreign = document.createElementNS(ns, "foreignObject");
        foreign.setAttribute("x", String(well.x));
        foreign.setAttribute("y", String(well.y));
        foreign.setAttribute("width", String(well.width));
        foreign.setAttribute("height", String(well.height));
        foreign.style.pointerEvents = "none";
        foreign.style.overflow = "hidden";
        foreign.classList.add("morph_prime_jumble_crossfade");
        let canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        foreign.appendChild(canvas);
        // On top of photo content, under the polaroid frame path.
        this._insertInPhotoWell(foreign, this._photoWellPath());
        return { foreign, canvas, ctx: canvas.getContext("2d") };
    }

    _cloneCanvas(src) {
        let c = document.createElement("canvas");
        c.width = src.width;
        c.height = src.height;
        c.getContext("2d").drawImage(src, 0, 0);
        return c;
    }

    // Build mesh landmarks from a raster (same topology as _meshRasterSource).
    _meshSourceFromCanvas(canvas, diagnostics) {
        let size = canvas.width;
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        let pixels = ctx.getImageData(0, 0, size, size).data;
        let threshold = Math.max(1, Math.min(255, Math.round(this._num("meshAlphaThreshold", 18))));
        let leftCenter = { x: size * 0.36, y: size * 0.42 };
        let rightCenter = { x: size * 0.64, y: size * 0.42 };
        let eyeMid = {
            x: (leftCenter.x + rightCenter.x) / 2,
            y: (leftCenter.y + rightCenter.y) / 2
        };
        let mouthCenter = { x: eyeMid.x, y: size * 0.65 };
        let proposedCenter = {
            x: eyeMid.x * 0.72 + mouthCenter.x * 0.28,
            y: eyeMid.y * 0.58 + mouthCenter.y * 0.42
        };
        let center = this._meshNearestOpaque(pixels, size, proposedCenter, threshold);
        let contourCount = Math.max(12, Math.round(this._num("meshContourPoints", 24)));
        let contour = this._meshRadialContour(pixels, size, center, contourCount, threshold);
        let points = [
            { x: 0, y: 0 }, { x: size - 1, y: 0 },
            { x: size - 1, y: size - 1 }, { x: 0, y: size - 1 }
        ];
        points = points.concat(contour);
        points = points.concat(this._meshBoxPoints(null, leftCenter));
        points = points.concat(this._meshBoxPoints(null, rightCenter));
        points = points.concat(this._meshBoxPoints(null, mouthCenter));
        points.push(center);
        points.push({ x: size * 0.5, y: size * 0.88 });
        return {
            canvas,
            points,
            diagnostics: diagnostics || { raster_size: size, contour_points: contourCount, center }
        };
    }

    // Rasterize the live prime SVG into the mesh FO square, then landmark it.
    async _meshRasterPrimeNode(primeNode, foreign) {
        let size = Math.max(200, Math.round(this._num("meshRasterSize", 400)));
        let fx = parseFloat(foreign.getAttribute("x"));
        let fy = parseFloat(foreign.getAttribute("y"));
        let fw = parseFloat(foreign.getAttribute("width"));
        let fh = parseFloat(foreign.getAttribute("height"));
        if (![fx, fy, fw, fh].every(Number.isFinite)) {
            throw new Error("mesh FO geometry missing for prime raster.");
        }
        let ns = "http://www.w3.org/2000/svg";
        let svg = document.createElementNS(ns, "svg");
        svg.setAttribute("xmlns", ns);
        svg.setAttribute("viewBox", `${fx} ${fy} ${fw} ${fh}`);
        svg.setAttribute("width", String(size));
        svg.setAttribute("height", String(size));
        // Transparent bg — paper is composited by _renderMeshMorph.
        svg.appendChild(primeNode.cloneNode(true));
        let canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        await this._loadCanvasFromSvgElement(svg, canvas);
        return this._meshSourceFromCanvas(canvas, { kind: "prime", raster_size: size });
    }

    // Morph weight 0→1 over a fixed window, using the same logistic shape as
    // the scored morph (tauFrac), but with duration = windowMs (not trial_speed).
    _meshWeightOverWindow(elapsedMs, windowMs) {
        let T = Math.max(1, windowMs);
        let tau = Math.max(1, this._num("tauFrac", 0.30) * T);
        let tMid = 0.5 * T;
        const sig = (t) => 1 / (1 + Math.exp(-(t - tMid) / tau));
        let s0 = sig(0);
        let s1 = sig(T);
        let m = (sig(Math.max(0, Math.min(T, elapsedMs))) - s0) / Math.max(1e-9, s1 - s0);
        return Math.max(0, Math.min(1, m));
    }

    async _animateMeshMorphWindow(fromM, toM, windowMs) {
        let ms = Math.max(1, Math.round(windowMs));
        let start = performance.now();
        await new Promise((resolve) => {
            const tick = (now) => {
                if (this.destroyed) return resolve();
                let elapsed = now - start;
                let u = this._meshWeightOverWindow(elapsed, ms);
                let m = fromM + (toM - fromM) * u;
                this._renderMeshMorph(m);
                this._currentMorphLevel = m;
                if (elapsed >= ms) {
                    this._renderMeshMorph(toM);
                    this._currentMorphLevel = toM;
                    return resolve();
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }

    // Build jumble (mesh), then mesh-morph prime → jumble while noise ramps
    // 0 → peak, pause at peak, hand off to jumble → target (noise peak → 0).
    async _transitionPrimeToMorph(trial) {
        await this._holdThenClearPrime();
        let well = this._photoWellBox();
        let prime = this.primeGroup;
        let dissolveMs = Math.max(1, Math.round(this._num("primeToJumbleMs", 3000)));

        if (!well || !prime) {
            await this._placeMorphStimulus(trial);
            this._placeNoiseOverlay(trial);
            this._bringNoiseToFront();
            this._clearPrimeFromWell();
            this._clearNameQuizHint();
            await this._rampNoise(0, this._noisePeak, dissolveMs);
            await wait(Math.max(0, Math.round(this._num("jumbleHoldMs", 1000))));
            return;
        }

        let placeOpts = { before: prime };
        try {
            await this._placeMorphStimulus(trial, placeOpts);
        } catch (err) {
            console.error("MorphTask: failed to place morph stimulus after prime name:", err);
            this.meshFallbackReason = err && err.message ? err.message : String(err);
            if (!trial.is_practice && trial.morph === "mesh") {
                let saved = trial.morph;
                trial.morph = "full";
                try {
                    await this._placeMorphStimulus(trial, placeOpts);
                } finally {
                    trial.morph = saved;
                }
            } else {
                throw err;
            }
        }
        this._placeNoiseOverlay(trial);
        this._stackPrimeAboveJumble();
        this._bringNoiseToFront();

        // Mesh path: geometric warp prime → jumble (same renderer as jumble→target).
        if (this.activeRenderer === "mesh" && this.meshCanvas && this.meshData && this.meshForeignObject) {
            try {
                await Promise.all([
                    this._runPrimeToJumbleMeshMorph(prime, dissolveMs),
                    this._rampNoise(0, this._noisePeak, dissolveMs)
                ]);
                this._clearNameQuizHint();
                await wait(Math.max(0, Math.round(this._num("jumbleHoldMs", 1000))));
                return;
            } catch (err) {
                console.warn("MorphTask: prime→jumble mesh morph failed, falling back to still blend:", err);
                this._setNoiseAmount(0);
            }
        }

        // Non-mesh / fallback: still-image canvas crossfade + noise ramp.
        await Promise.all([
            this._runPrimeToJumbleStillBlend(prime, well, dissolveMs),
            this._rampNoise(0, this._noisePeak, dissolveMs)
        ]);
        this._clearNameQuizHint();
        await wait(Math.max(0, Math.round(this._num("jumbleHoldMs", 1000))));
    }

    async _runPrimeToJumbleMeshMorph(prime, dissolveMs) {
        let foreign = this.meshForeignObject;
        let parentData = this.meshData;
        let primeSource = await this._meshRasterPrimeNode(prime, foreign);

        // Jumble still = current live mesh frame at m=0.5; landmarks = midpoint
        // of the fenA/fenB sources so topology stays compatible.
        this._renderMeshMorph(0.5);
        let jumbleCanvas = this._cloneCanvas(this.meshCanvas);
        let jumblePoints = parentData.other.points.map((p, i) => ({
            x: (p.x + parentData.target.points[i].x) / 2,
            y: (p.y + parentData.target.points[i].y) / 2
        }));
        if (primeSource.points.length !== jumblePoints.length) {
            // Remake prime landmarks with the fen topology length by resampling
            // is awkward; fall back to alpha landmarks on the jumble canvas.
            let jumbleSourceAlt = this._meshSourceFromCanvas(jumbleCanvas, { kind: "jumble" });
            if (primeSource.points.length !== jumbleSourceAlt.points.length) {
                throw new Error(
                    `prime/jumble landmark mismatch (${primeSource.points.length} vs ${jumbleSourceAlt.points.length}).`
                );
            }
            jumblePoints = jumbleSourceAlt.points;
        }
        let jumbleSource = {
            canvas: jumbleCanvas,
            points: jumblePoints,
            diagnostics: { kind: "jumble_m05" }
        };

        let average = primeSource.points.map((p, i) => ({
            x: (p.x + jumbleSource.points[i].x) / 2,
            y: (p.y + jumbleSource.points[i].y) / 2
        }));
        let triangles = this._meshDelaunay(average);
        if (!triangles.length) throw new Error("prime→jumble Delaunay produced no triangles.");

        this.meshData = {
            other: primeSource,   // m=0
            target: jumbleSource, // m=1
            triangles
        };
        this._renderMeshMorph(0);
        this._currentMorphLevel = 0;

        // Hide the SVG prime; the mesh FO carries the morph.
        prime.style.visibility = "hidden";
        // Ensure mesh FO is under the live noise overlay.
        this._insertInPhotoWell(foreign, this._photoWellPath());
        this._bringNoiseToFront();

        await this._waitForPaint();
        await this._animateMeshMorphWindow(0, 1, dissolveMs);

        // Hand off to scored jumble→target mesh (resume at m=0.5).
        this.meshData = parentData;
        this._renderMeshMorph(0.5);
        this._currentMorphLevel = 0.5;
        this._clearPrimeFromWell();
        this._bringNoiseToFront();
    }

    async _runPrimeToJumbleStillBlend(prime, well, dissolveMs) {
        let size = Math.max(280, Math.round(Math.min(well.width, well.height)));
        let fromCanvas = null;
        let toCanvas = null;
        try {
            fromCanvas = await this._rasterizeWellNodes([prime], well, size);
        } catch (err) {
            console.warn("MorphTask: prime snapshot failed:", err);
        }
        let jumbleNodes = [this.morphGroup, this.filmRect].filter(Boolean);
        if (this.activeRenderer === "mesh" && this.meshCanvas) {
            toCanvas = document.createElement("canvas");
            toCanvas.width = size;
            toCanvas.height = size;
            let tctx = toCanvas.getContext("2d");
            tctx.fillStyle = this.params.polaroidPaperFill || "#f4efe4";
            tctx.fillRect(0, 0, size, size);
            tctx.drawImage(this.meshCanvas, 0, 0, size, size);
        } else {
            try {
                toCanvas = await this._rasterizeWellNodes(jumbleNodes, well, size);
            } catch (err) {
                console.warn("MorphTask: jumble snapshot failed:", err);
            }
        }
        if (!fromCanvas || !toCanvas) {
            this._clearPrimeFromWell();
            return;
        }
        let overlay = this._placeWellCanvasOverlay(well, size);
        this._bringNoiseToFront();
        overlay.ctx.drawImage(fromCanvas, 0, 0, size, size);
        prime.style.visibility = "hidden";
        jumbleNodes.forEach((n) => { n.style.visibility = "hidden"; });
        await this._waitForPaint();
        let start = performance.now();
        await new Promise((resolve) => {
            const tick = (now) => {
                if (this.destroyed) return resolve();
                let elapsed = now - start;
                let u = this._meshWeightOverWindow(elapsed, dissolveMs);
                let ctx = overlay.ctx;
                ctx.clearRect(0, 0, size, size);
                ctx.globalAlpha = 1 - u;
                ctx.drawImage(fromCanvas, 0, 0, size, size);
                ctx.globalAlpha = u;
                ctx.drawImage(toCanvas, 0, 0, size, size);
                ctx.globalAlpha = 1;
                if (elapsed >= dissolveMs) return resolve();
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
        if (overlay.foreign && overlay.foreign.parentNode) overlay.foreign.remove();
        jumbleNodes.forEach((n) => { n.style.visibility = ""; });
        this._clearPrimeFromWell();
        this._bringNoiseToFront();
    }

    _keepMysteryCaption(trial) {
        let frame = this.polaroidMount && this.polaroidMount.frame;
        if (frame) this._setPolaroidCaption(frame, "????");
        if (trial && trial.prime && trial.prime.log) trial.prime.log.caption = "????";
    }

    _setPolaroidCaption(frame, question) {
        let nameNode = frame && frame.getElementsByTagName("text")[0];
        if (!nameNode) return;
        let caption = question || "";
        let fill = this.params.polaroidCaptionFill || "#8a8680";
        nameNode.style.display = "inherit";
        nameNode.style.fill = fill;
        nameNode.style.fontWeight = "600";
        nameNode.style.pointerEvents = "none";
        let tspans = nameNode.getElementsByTagName("tspan");
        if (tspans.length) {
            tspans[0].textContent = caption;
            tspans[0].style.fill = fill;
            tspans[0].style.fontWeight = "600";
            for (let i = 1; i < tspans.length; i++) tspans[i].textContent = "";
        } else {
            nameNode.textContent = caption;
        }
    }

    _photoWellPath() {
        let host = this.photoWellRect && this.photoWellRect.parentNode;
        if (!host) return null;
        return host.querySelector(".polaroid_frame_frame") || host.getElementsByTagName("path")[0] || null;
    }

    _photoWellBox() {
        let r = this.photoWellRect;
        if (!r) return null;
        return this._rectToWellBox(r);
    }

    _rectToWellBox(r) {
        if (!r) return null;
        let box = {
            x: parseFloat(r.getAttribute("x")),
            y: parseFloat(r.getAttribute("y")),
            width: parseFloat(r.getAttribute("width")),
            height: parseFloat(r.getAttribute("height")),
            rx: r.getAttribute("rx") || r.getAttribute("ry") || "0",
            ry: r.getAttribute("ry") || r.getAttribute("rx") || "0"
        };
        if (![box.x, box.y, box.width, box.height].every(Number.isFinite)) {
            try {
                let b = r.getBBox();
                box.x = b.x;
                box.y = b.y;
                box.width = b.width;
                box.height = b.height;
            } catch (e) {
                return null;
            }
        }
        return box;
    }

    _insertInPhotoWell(node, beforeOverride) {
        let host = this.photoWellRect && this.photoWellRect.parentNode;
        if (!host) return false;
        let before = beforeOverride || null;
        if (!before || before.parentNode !== host) {
            before = (this.occluder && this.occluder.parentNode === host)
                ? this.occluder
                : (this._photoWellPath() || null);
        }
        if (before) host.insertBefore(node, before);
        else host.appendChild(node);
        return true;
    }

    // Keep the prime on top of jumble layers so a dissolve can reveal them.
    _stackPrimeAboveJumble() {
        let prime = this.primeGroup;
        if (!prime || !prime.parentNode) return;
        let host = prime.parentNode;
        let frame = this._photoWellPath();
        if (frame && frame.parentNode === host) host.insertBefore(prime, frame);
        else host.appendChild(prime);
    }

    _fitNodeInPhotoWell(node, wFrac, hFrac) {
        if (!node) return;
        let mount = this.polaroidMount || {};
        let bgRect = mount.bgRect || this.photoWellRect;
        if (!bgRect) return;
        let frameBox;
        try {
            frameBox = {
                x: parseFloat(bgRect.getAttribute("x")),
                y: parseFloat(bgRect.getAttribute("y")),
                width: parseFloat(bgRect.getAttribute("width")),
                height: parseFloat(bgRect.getAttribute("height"))
            };
            if (![frameBox.x, frameBox.y, frameBox.width, frameBox.height].every(Number.isFinite)) {
                let b = bgRect.getBBox();
                frameBox = { x: b.x, y: b.y, width: b.width, height: b.height };
            }
        } catch (e) {
            return;
        }
        let box;
        try {
            box = node.getBBox();
        } catch (e) {
            return;
        }
        if (!(box.width > 0 && box.height > 0)) return;
        let scale = Math.min(
            (frameBox.width * (wFrac != null ? wFrac : 0.72)) / box.width,
            (frameBox.height * (hFrac != null ? hFrac : 0.62)) / box.height
        );
        if (!Number.isFinite(scale) || scale <= 0) return;
        let cx = box.x + box.width / 2;
        let cy = box.y + box.height / 2;
        let wellCx = frameBox.x + frameBox.width / 2;
        let wellCy = frameBox.y + frameBox.height / 2;
        node.setAttribute(
            "transform",
            `translate(${wellCx}, ${wellCy}) scale(${scale}) translate(${-cx}, ${-cy})`
        );
    }

    // ------------------------------------------------------------------
    // Morph stimulus (two stacked renders + ambiguity veil)
    // ------------------------------------------------------------------

    _buildParentIcon(trial, fen, scheme) {
        let display = {
            id: "morph_" + trial.id + "_" + fen.id,
            name: "",
            head: fen.head,
            body: fen.body || this._fallbackBody(),
            region: fen.region,
            ColorScheme: { Head: scheme, Body: scheme }
        };
        let icon = create_Fennimal_SVG_object(display, GenParam.Fennimal_head_size, false);
        this._prepareFennimalIcon(icon);
        this._applyPartColors(icon, scheme);
        if (trial.view !== "full") {
            let body = icon.getElementsByClassName("Fennimal_body")[0];
            if (body) body.style.display = "none";
        }
        icon.style.pointerEvents = "none";
        return icon;
    }

    _buildShapeNode(shape) {
        let kind = String(shape || "square").toLowerCase();
        let node;
        if (kind === "triangle") {
            node = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            node.setAttribute("points", "0,-90 100,80 -100,80");
        } else if (kind === "circle") {
            node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            node.setAttribute("cx", "0");
            node.setAttribute("cy", "0");
            node.setAttribute("r", "88");
        } else if (kind === "diamond") {
            node = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            node.setAttribute("points", "0,-95 95,0 0,95 -95,0");
        } else if (kind === "star") {
            node = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            // Regular-ish 5-point star centered at origin.
            let pts = [];
            for (let i = 0; i < 5; i++) {
                let aOut = -Math.PI / 2 + i * (2 * Math.PI / 5);
                let aIn = aOut + Math.PI / 5;
                pts.push(`${Math.cos(aOut) * 95},${Math.sin(aOut) * 95}`);
                pts.push(`${Math.cos(aIn) * 40},${Math.sin(aIn) * 40}`);
            }
            node.setAttribute("points", pts.join(" "));
        } else {
            node = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            node.setAttribute("x", "-90");
            node.setAttribute("y", "-90");
            node.setAttribute("width", "180");
            node.setAttribute("height", "180");
            node.setAttribute("rx", "12");
        }
        node.setAttribute("fill", "#5b7c99");
        node.setAttribute("stroke", "#2c3e50");
        node.setAttribute("stroke-width", "6");
        let wrap = create_SVG_group(0, 0);
        wrap.appendChild(node);
        wrap.style.pointerEvents = "none";
        return wrap;
    }

    // ------------------------------------------------------------------
    // Moving binary static overlay. Coverage stays fixed; individual speckles refresh.
    // ------------------------------------------------------------------

    _hashString(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    _seededRand(seed) {
        let s = seed >>> 0;
        return function () {
            s = Math.imul(1664525, s) + 1013904223;
            return ((s >>> 0) / 4294967296);
        };
    }

    // Keep the moving static above photo content (mesh/prime/film), under the
    // polaroid frame stroke.
    _bringNoiseToFront() {
        let g = this.noiseGroup;
        if (!g || !g.parentNode) return;
        let host = g.parentNode;
        let frame = this._photoWellPath();
        if (frame && frame.parentNode === host) host.insertBefore(g, frame);
        else host.appendChild(g);
    }

    // trial.noise = peak coverage fraction. Overlay starts at 0 and is driven
    // by _setNoiseAmount / _rampNoise (0→peak over prime→jumble, peak→0 over
    // trial_speed).
    _placeNoiseOverlay(trial) {
        if (!trial) return;
        this._stopNoise(true);
        let peak = trial.noise == null ? 0 : Number(trial.noise);
        if (!Number.isFinite(peak) || peak <= 0) {
            this._noisePeak = 0;
            this._noiseAmount = 0;
            return;
        }
        peak = Math.max(0, Math.min(1, peak));
        this._noisePeak = peak;
        this._noiseAmount = 0;

        let well = this._photoWellBox();
        if (!well) return;

        let cell = Math.max(2, Math.round(this._num("noiseCellSizePx", 8)));
        let cols = Math.max(1, Math.ceil(well.width / cell));
        let rows = Math.max(1, Math.ceil(well.height / cell));
        let nCells = cols * rows;
        let nPeak = Math.max(1, Math.round(nCells * peak));
        let rand = this._seededRand(this._hashString(String(trial.id || "") + "|morph_noise"));
        let cells = [];
        for (let i = 0; i < nCells; i++) cells.push(i);

        let g = create_SVG_group(0, 0, "morph_noise_overlay");
        g.style.pointerEvents = "none";
        for (let i = 0; i < nPeak; i++) {
            let r = create_SVG_rect(0, 0, 0, 0);
            r.setAttribute("stroke", "none");
            r.setAttribute("stroke-width", "0");
            r.style.pointerEvents = "none";
            g.appendChild(r);
        }
        this._insertInPhotoWell(g, this._photoWellPath());
        this.noiseGroup = g;
        this._bringNoiseToFront();

        let rects = Array.from(g.children);
        // Fixed layout: shuffle + fills once; density envelope only shows/hides
        // that static pattern (no reshuffle while the trial runs).
        for (let i = cells.length - 1; i > 0; i--) {
            let j = Math.floor(rand() * (i + 1));
            let tmp = cells[i];
            cells[i] = cells[j];
            cells[j] = tmp;
        }
        for (let i = 0; i < rects.length; i++) {
            let idx = cells[i];
            let col = idx % cols;
            let row = Math.floor(idx / cols);
            let x = well.x + col * cell;
            let y = well.y + row * cell;
            let w = Math.min(cell, well.x + well.width - x);
            let h = Math.min(cell, well.y + well.height - y);
            let fill = rand() < 0.5 ? "#000000" : "#ffffff";
            let r = rects[i];
            r.setAttribute("x", String(x));
            r.setAttribute("y", String(y));
            r.setAttribute("width", "0");
            r.setAttribute("height", "0");
            r.setAttribute("data-noise-w", String(Math.max(0, w)));
            r.setAttribute("data-noise-h", String(Math.max(0, h)));
            r.setAttribute("fill", fill);
            r.setAttribute("stroke", fill);
            r.setAttribute("stroke-width", "0");
        }
        const paint = () => {
            let amount = this._noiseAmount || 0;
            let nActive = Math.max(0, Math.min(rects.length, Math.round(nCells * amount)));
            for (let i = 0; i < rects.length; i++) {
                let r = rects[i];
                if (i >= nActive) {
                    r.setAttribute("width", "0");
                    r.setAttribute("height", "0");
                } else {
                    r.setAttribute("width", r.getAttribute("data-noise-w") || "0");
                    r.setAttribute("height", r.getAttribute("data-noise-h") || "0");
                }
            }
        };
        this._noiseRedraw = paint;
        paint();
    }

    _setNoiseAmount(amount) {
        let peak = this._noisePeak || 0;
        let next = Number(amount);
        if (!Number.isFinite(next)) next = 0;
        this._noiseAmount = Math.max(0, Math.min(peak, next));
        if (this._noiseRedraw) this._noiseRedraw();
    }

    async _rampNoise(fromAmount, toAmount, ms) {
        let peak = this._noisePeak || 0;
        if (peak <= 0 || !this.noiseGroup) {
            this._setNoiseAmount(toAmount);
            return;
        }
        let from = Math.max(0, Math.min(peak, fromAmount));
        let to = Math.max(0, Math.min(peak, toAmount));
        let dur = Math.max(0, Math.round(ms));
        if (dur <= 0) {
            this._setNoiseAmount(to);
            return;
        }
        if (this._noiseRampRaf) {
            cancelAnimationFrame(this._noiseRampRaf);
            this._noiseRampRaf = null;
        }
        let start = performance.now();
        await new Promise((resolve) => {
            const tick = (now) => {
                if (this.destroyed) {
                    this._noiseRampRaf = null;
                    return resolve();
                }
                let u = Math.min(1, (now - start) / dur);
                this._setNoiseAmount(from + (to - from) * u);
                if (u >= 1) {
                    this._noiseRampRaf = null;
                    return resolve();
                }
                this._noiseRampRaf = requestAnimationFrame(tick);
            };
            this._noiseRampRaf = requestAnimationFrame(tick);
        });
    }

    _stopNoise(removeOverlay) {
        if (this._noiseRampRaf) {
            cancelAnimationFrame(this._noiseRampRaf);
            this._noiseRampRaf = null;
        }
        if (this.noiseInterval) {
            clearInterval(this.noiseInterval);
            this.noiseInterval = null;
        }
        if (this.noiseFadeTimeout) {
            clearTimeout(this.noiseFadeTimeout);
            this.noiseFadeTimeout = null;
        }
        this._noiseRedraw = null;
        if (removeOverlay && this.noiseGroup) {
            this.noiseGroup.remove();
            this.noiseGroup = null;
        }
        if (removeOverlay) {
            this._noisePeak = 0;
            this._noiseAmount = 0;
        }
    }

    _fadeOutNoise() {
        this._stopNoise(false);
        let g = this.noiseGroup;
        if (!g) return;
        let ms = Math.max(0, Math.round(this._num("noiseFadeMs", 350)));
        if (ms <= 0) {
            this._stopNoise(true);
            return;
        }
        g.style.pointerEvents = "none";
        g.style.transition = `opacity ${ms}ms ease-out`;
        g.style.opacity = "1";
        void g.getBoundingClientRect();
        g.style.opacity = "0";
        this.noiseFadeTimeout = setTimeout(() => {
            this.noiseFadeTimeout = null;
            if (this.noiseGroup === g) {
                g.remove();
                this.noiseGroup = null;
            }
            this._noisePeak = 0;
            this._noiseAmount = 0;
            this._noiseRedraw = null;
        }, ms + 40);
    }

    // After a choice: resolve_trial true fades leftover static; false freezes
    // the current speckles (noise normally already ramped toward 0).
    _handleNoiseAfterChoice() {
        if (this.resolveTrial) this._fadeOutNoise();
        else this._stopNoise(false);
    }

    // ------------------------------------------------------------------
    // Optional static prime polaroid (paid trials only)
    // ------------------------------------------------------------------

    _primeScheme(prime) {
        if (prime && prime.schemeMode === "fen" && prime.schemeFen) {
            return this._schemeFromFen(prime.schemeFen);
        }
        return this._grayscaleScheme();
    }

    _primeUsesFixedGrayscale(prime) {
        return !(prime && prime.schemeMode === "fen" && prime.schemeFen);
    }

    _buildHatOnlyIcon(hatFen) {
        let hatId = "hat_" + String(hatFen.hat).replace(/^hat_/, "");
        let template = document.getElementById(hatId);
        if (!template) this._fail(`missing hat template #${hatId} for prime hat Fennimal "${hatFen.id}".`);
        let wrap = create_SVG_group(0, 0, "morph_prime_hat");
        let hat = template.cloneNode(true);
        hat.removeAttribute("id");
        hat.style.display = "inherit";
        wrap.appendChild(hat);
        wrap.style.pointerEvents = "none";
        return wrap;
    }

    _buildHeadlessBodyIcon(bodyFen, scheme) {
        let bodyId = "Fennimal_body_" + bodyFen.body;
        let template = document.getElementById(bodyId);
        if (!template) this._fail(`missing body template #${bodyId} for prime body Fennimal "${bodyFen.id}".`);

        let wrap = create_SVG_group(0, 0, "morph_prime_headless");
        let scaleGroup = create_SVG_group(0, 0, "Fennimal_scale_group");
        let bodyGroup = create_SVG_group(0, 0, "Fennimal_body");
        let bodyScaleGroup = create_SVG_group(0, 0);
        let body = template.cloneNode(true);
        body.removeAttribute("id");
        body.style.display = "inherit";
        bodyScaleGroup.appendChild(body);
        bodyGroup.appendChild(bodyScaleGroup);
        scaleGroup.appendChild(bodyGroup);
        wrap.appendChild(scaleGroup);

        if (scheme) {
            set_fill_for_all_elements_in_array(wrap.getElementsByClassName("Fennimal_primary_color"), scheme.primary_color);
            set_fill_for_all_elements_in_array(wrap.getElementsByClassName("Fennimal_secondary_color"), scheme.secondary_color);
            set_fill_for_all_elements_in_array(wrap.getElementsByClassName("Fennimal_tertiary_color"), scheme.tertiary_color);
        }

        let neck = body.getElementsByClassName("Fennimal_body_neck_point")[0];
        let nx = neck ? parseFloat(neck.getAttribute("cx")) : 0;
        let ny = neck ? parseFloat(neck.getAttribute("cy")) : 0;
        if (!Number.isFinite(nx)) nx = 0;
        if (!Number.isFinite(ny)) ny = 0;

        let size = 90;
        let placeholder = create_SVG_group(0, 0, "morph_prime_missing_head");
        let square = create_SVG_rect(nx - size / 2, ny - size * 0.85, size, size);
        square.setAttribute("rx", "8");
        square.setAttribute("fill", this.params.occluderFill || "#3e3a44");
        placeholder.appendChild(square);
        let q = create_SVG_text_elem(nx, ny - size * 0.35, "?", undefined, undefined);
        q.style.fontSize = Math.round(size * 0.55) + "px";
        q.style.fill = "#f5f0e6";
        q.style.textAnchor = "middle";
        q.style.dominantBaseline = "central";
        q.style.fontWeight = "700";
        placeholder.appendChild(q);
        // After body so the ? sits on top of the neck; toys attach after this in _attachPrimeToy.
        scaleGroup.appendChild(placeholder);

        wrap.style.pointerEvents = "none";
        return wrap;
    }

    // Same attachment + white rim as photo_Fennimal / hat-binding retraining polaroids.
    _attachPrimeToy(icon, prime) {
        if (!icon || !prime || !prime.hasToy || !prime.toyFen || !prime.bodyFen) return null;
        let bodyGroup = icon.getElementsByClassName("Fennimal_body")[0];
        let bodyScaleGroup = bodyGroup && bodyGroup.firstElementChild;
        let bodySvg = bodyScaleGroup && bodyScaleGroup.firstElementChild;
        if (!bodySvg) {
            this._fail(`prime toy: body Fennimal "${prime.bodyFen.id}" has no body SVG to attach to.`);
        }
        if (!bodySvg.getElementsByClassName("Fennimal_body_center_point")[0]) {
            this._fail(
                `prime toy: body "${prime.bodyFen.body}" (Fennimal "${prime.bodyFen.id}") ` +
                `is missing Fennimal_body_center_point.`
            );
        }
        let parent = icon.getElementsByClassName("Fennimal_scale_group")[0] || bodyScaleGroup;
        let toyCarrier = {
            id: prime.toyFen.id,
            toy: prime.toyFen.toy,
            body: prime.bodyFen.body
        };
        let toyScale = this.params.primeToyScale != null ? this.params.primeToyScale : 2.2;
        let toyGroup = attach_toy_to_fennimal_body(parent, bodySvg, toyCarrier, toyScale);
        if (!toyGroup) {
            this._fail(`prime toy: could not print toy "${prime.toyFen.toy}" from Fennimal "${prime.toyFen.id}".`);
        }
        // Draw after head / ? placeholder so the held toy is not buried.
        if (parent && toyGroup.parentNode === parent) parent.appendChild(toyGroup);
        toyGroup.style.filter = this.params.primeToyDropShadow ||
            "drop-shadow(0px 0px 2px rgba(255,255,255,0.95)) drop-shadow(0px 1px 5px rgba(255,255,255,0.7))";
        toyGroup.style.pointerEvents = "none";
        toyGroup.querySelectorAll("*").forEach((el) => {
            el.style.animation = "none";
            el.style.animationPlayState = "paused";
            el.style.transition = "none";
        });
        return toyGroup;
    }

    _buildPrimeIcon(prime) {
        let scheme = this._primeScheme(prime);
        let paintGray = this._primeUsesFixedGrayscale(prime);

        // Hat alone — no host head.
        if (!prime.hasHead && !prime.hasBody && prime.hasHat) {
            let hat = this._buildHatOnlyIcon(prime.hatFen);
            this._preparePrimeIcon(hat);
            if (paintGray) this._applyFixedGrayscaleAccessories(hat);
            return { node: hat, widthFrac: 0.62, heightFrac: 0.55 };
        }

        // Head (+ optional hat), no body → close-up (toys require a body).
        if (prime.hasHead && !prime.hasBody) {
            let display = {
                id: "morph_prime_head",
                name: "",
                head: prime.headFen.head,
                ColorScheme: { Head: scheme }
            };
            if (prime.hasHat) display.hat = prime.hatFen.hat;
            let icon = create_Fennimal_SVG_object_head_only(display, false, !!prime.hasHat);
            this._preparePrimeIcon(icon);
            this._applyPartColors(icon, scheme);
            if (paintGray) this._applyFixedGrayscaleAccessories(icon);
            icon.style.pointerEvents = "none";
            return { node: icon, widthFrac: 0.72, heightFrac: 0.62 };
        }

        // Body present, no head → headless body + ? square (+ optional toy).
        if (prime.hasBody && !prime.hasHead) {
            let icon = this._buildHeadlessBodyIcon(prime.bodyFen, scheme);
            // Toy needs Fennimal_body_center_point before _preparePrimeIcon strips it.
            this._attachPrimeToy(icon, prime);
            this._preparePrimeIcon(icon);
            if (paintGray) this._applyFixedGrayscaleAccessories(icon);
            return { node: icon, widthFrac: 0.78, heightFrac: 0.78 };
        }

        // Body + head (+ optional hat / toy).
        let display = {
            id: "morph_prime_full",
            name: "",
            head: prime.headFen.head,
            body: prime.bodyFen.body || this._fallbackBody(),
            region: prime.bodyFen.region || prime.headFen.region,
            ColorScheme: { Head: scheme, Body: scheme }
        };
        if (prime.hasHat) display.hat = prime.hatFen.hat;
        let icon = create_Fennimal_SVG_object(display, GenParam.Fennimal_head_size, false);
        this._applyPartColors(icon, scheme);
        // Toy needs Fennimal_body_center_point before _preparePrimeIcon strips it.
        this._attachPrimeToy(icon, prime);
        this._preparePrimeIcon(icon);
        if (paintGray) this._applyFixedGrayscaleAccessories(icon);
        icon.style.pointerEvents = "none";
        return { node: icon, widthFrac: 0.78, heightFrac: 0.78 };
    }

    _buildOccluderGroup(well, className, opts) {
        opts = opts || {};
        let g = create_SVG_group(0, 0, className);
        g.style.pointerEvents = "none";

        let rect = create_SVG_rect(well.x, well.y, well.width, well.height);
        rect.setAttribute("rx", well.rx);
        rect.setAttribute("ry", well.ry);
        rect.setAttribute("fill", this.params.occluderFill || "#3e3a44");
        rect.style.pointerEvents = "none";
        g.appendChild(rect);

        let cx = well.x + well.width / 2;
        let cy = well.y + well.height / 2;
        let qSize = Math.round(Math.min(well.width, well.height) * 0.42);
        let q = create_SVG_text_elem(cx, cy, "?", undefined, undefined);
        q.style.fontSize = qSize + "px";
        q.style.fill = "#f5f0e6";
        q.style.textAnchor = "middle";
        q.style.dominantBaseline = "central";
        q.style.pointerEvents = "none";
        q.style.fontWeight = "700";
        g.appendChild(q);

        let hitR = Math.max(42, Math.round(qSize * 0.62));
        let hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hit.setAttribute("cx", String(cx));
        hit.setAttribute("cy", String(cy));
        hit.setAttribute("r", String(hitR));
        hit.setAttribute("fill", "transparent");
        if (opts.highlight !== false) {
            hit.classList.add("focus_on_SVG_outline");
        }
        hit.style.cursor = "pointer";
        hit.style.pointerEvents = "all";
        g.insertBefore(hit, q);
        return { g, hit };
    }

    _meshHeadClone(fen, scheme) {
        let template = document.getElementById("Fennimal_head_" + fen.head);
        if (!template) this._fail(`missing head template for mesh source "${fen.head}".`);
        let head = template.cloneNode(true);
        head.removeAttribute("id");
        head.removeAttribute("display");
        head.style.display = "inline";
        if (typeof set_Fennimal_color_classes === "function") set_Fennimal_color_classes(head);
        this._applyPartColors(head, scheme);
        this._freezeHappyExpression(head);
        return head;
    }

    _meshBBox(el) {
        if (!el || typeof el.getBBox !== "function") return null;
        try {
            let b = el.getBBox();
            if (!(b.width > 0 && b.height > 0)) return null;
            return { x: b.x, y: b.y, width: b.width, height: b.height };
        } catch (e) {
            return null;
        }
    }

    _meshMarker(root, selector) {
        let el = root && root.querySelector(selector);
        if (!el) return null;
        let x = parseFloat(el.getAttribute("cx"));
        let y = parseFloat(el.getAttribute("cy"));
        return (Number.isFinite(x) && Number.isFinite(y)) ? { x, y } : null;
    }

    _meshBoxPoints(box, fallback) {
        if (!box) {
            return [
                { x: fallback.x - 20, y: fallback.y },
                { x: fallback.x, y: fallback.y },
                { x: fallback.x + 20, y: fallback.y },
                { x: fallback.x, y: fallback.y - 15 },
                { x: fallback.x, y: fallback.y + 15 }
            ];
        }
        return [
            { x: box.x, y: box.y + box.height / 2 },
            { x: box.x + box.width / 2, y: box.y + box.height / 2 },
            { x: box.x + box.width, y: box.y + box.height / 2 },
            { x: box.x + box.width / 2, y: box.y },
            { x: box.x + box.width / 2, y: box.y + box.height }
        ];
    }

    _meshNearestOpaque(alpha, size, point, threshold) {
        let px = Math.max(0, Math.min(size - 1, Math.round(point.x)));
        let py = Math.max(0, Math.min(size - 1, Math.round(point.y)));
        const opaque = (x, y) => alpha[(y * size + x) * 4 + 3] >= threshold;
        if (opaque(px, py)) return { x: px, y: py };
        for (let radius = 1; radius <= Math.round(size * 0.25); radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    let x = px + dx;
                    let y = py + dy;
                    if (x >= 0 && x < size && y >= 0 && y < size && opaque(x, y)) {
                        return { x, y };
                    }
                }
            }
        }
        return { x: px, y: py };
    }

    _meshRadialContour(alpha, size, center, count, threshold) {
        let points = [];
        let maxR = Math.ceil(Math.SQRT2 * size);
        for (let i = 0; i < count; i++) {
            let angle = -Math.PI / 2 + i * 2 * Math.PI / count;
            let dx = Math.cos(angle);
            let dy = Math.sin(angle);
            let farthest = null;
            for (let r = 0; r <= maxR; r++) {
                let x = Math.round(center.x + dx * r);
                let y = Math.round(center.y + dy * r);
                if (x < 0 || x >= size || y < 0 || y >= size) continue;
                if (alpha[(y * size + x) * 4 + 3] >= threshold) {
                    farthest = { x, y };
                }
            }
            if (!farthest) {
                farthest = {
                    x: Math.max(0, Math.min(size - 1, center.x + dx * size * 0.35)),
                    y: Math.max(0, Math.min(size - 1, center.y + dy * size * 0.35))
                };
            }
            points.push(farthest);
        }
        return points;
    }

    async _meshRasterSource(fen, scheme) {
        let size = Math.max(200, Math.round(this._num("meshRasterSize", 400)));
        let ns = "http://www.w3.org/2000/svg";
        let measureSvg = document.createElementNS(ns, "svg");
        measureSvg.setAttribute("viewBox", "0 0 400 400");
        measureSvg.setAttribute("width", "400");
        measureSvg.setAttribute("height", "400");
        measureSvg.style.position = "fixed";
        measureSvg.style.left = "-10000px";
        measureSvg.style.top = "-10000px";
        measureSvg.style.pointerEvents = "none";

        let head = this._meshHeadClone(fen, scheme);
        measureSvg.appendChild(head);
        document.body.appendChild(measureSvg);

        let leftBox = this._meshBBox(head.querySelector(".eye.eye_left"));
        let rightBox = this._meshBBox(head.querySelector(".eye.eye_right"));
        let mouthBox = this._meshBBox(head.querySelector(".mouth_happy"));
        let mouthMarker = this._meshMarker(head, ".Fennimal_head_mouth_point");
        let neckMarker = this._meshMarker(head, ".Fennimal_head_neck_point");

        let exportSvg = document.createElementNS(ns, "svg");
        exportSvg.setAttribute("xmlns", ns);
        exportSvg.setAttribute("viewBox", "0 0 400 400");
        exportSvg.setAttribute("width", String(size));
        exportSvg.setAttribute("height", String(size));
        let exportHead = head.cloneNode(true);
        this._stripHelperMarks(exportHead);
        exportSvg.appendChild(exportHead);
        measureSvg.remove();

        let xml = new XMLSerializer().serializeToString(exportSvg);
        let url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
        let canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        await new Promise((resolve, reject) => {
            let img = new Image();
            let settled = false;
            let timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                reject(new Error(`mesh raster timed out for head "${fen.head}".`));
            }, 8000);
            img.onload = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                ctx.clearRect(0, 0, size, size);
                ctx.drawImage(img, 0, 0, size, size);
                resolve();
            };
            img.onerror = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                reject(new Error(`could not rasterize head "${fen.head}".`));
            };
            img.src = url;
        });

        // Landmarks are measured in the native 400-unit head coordinates.
        // Scale them to the raster so source points and source pixels match.
        let k = size / 400;
        const scalePoint = (p) => p ? ({ x: p.x * k, y: p.y * k }) : null;
        const scaleBox = (b) => b ? ({
            x: b.x * k, y: b.y * k, width: b.width * k, height: b.height * k
        }) : null;
        leftBox = scaleBox(leftBox);
        rightBox = scaleBox(rightBox);
        mouthBox = scaleBox(mouthBox);
        mouthMarker = scalePoint(mouthMarker);
        neckMarker = scalePoint(neckMarker);

        let leftCenter = leftBox
            ? { x: leftBox.x + leftBox.width / 2, y: leftBox.y + leftBox.height / 2 }
            : { x: size * 0.36, y: size * 0.42 };
        let rightCenter = rightBox
            ? { x: rightBox.x + rightBox.width / 2, y: rightBox.y + rightBox.height / 2 }
            : { x: size * 0.64, y: size * 0.42 };
        let eyeMid = {
            x: (leftCenter.x + rightCenter.x) / 2,
            y: (leftCenter.y + rightCenter.y) / 2
        };
        let mouthCenter = mouthMarker || (mouthBox
            ? { x: mouthBox.x + mouthBox.width / 2, y: mouthBox.y + mouthBox.height / 2 }
            : { x: eyeMid.x, y: size * 0.65 });

        let pixels = ctx.getImageData(0, 0, size, size).data;
        let threshold = Math.max(1, Math.min(255, Math.round(this._num("meshAlphaThreshold", 18))));
        let proposedCenter = {
            x: eyeMid.x * 0.72 + mouthCenter.x * 0.28,
            y: eyeMid.y * 0.58 + mouthCenter.y * 0.42
        };
        let center = this._meshNearestOpaque(pixels, size, proposedCenter, threshold);
        let contourCount = Math.max(12, Math.round(this._num("meshContourPoints", 24)));
        let contour = this._meshRadialContour(pixels, size, center, contourCount, threshold);

        let points = [
            { x: 0, y: 0 }, { x: size - 1, y: 0 },
            { x: size - 1, y: size - 1 }, { x: 0, y: size - 1 }
        ];
        points = points.concat(contour);
        points = points.concat(this._meshBoxPoints(leftBox, leftCenter));
        points = points.concat(this._meshBoxPoints(rightBox, rightCenter));
        points = points.concat(this._meshBoxPoints(mouthBox, mouthCenter));
        points.push(center);
        points.push(neckMarker || { x: size * 0.5, y: size * 0.88 });

        return {
            canvas,
            points,
            diagnostics: {
                head: fen.head,
                raster_size: size,
                contour_points: contourCount,
                center: center,
                left_eye_found: !!leftBox,
                right_eye_found: !!rightBox,
                mouth_found: !!mouthBox
            }
        };
    }

    _meshCircumcircle(a, b, c) {
        let d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
        if (Math.abs(d) < 1e-8) return null;
        let aa = a.x * a.x + a.y * a.y;
        let bb = b.x * b.x + b.y * b.y;
        let cc = c.x * c.x + c.y * c.y;
        let x = (aa * (b.y - c.y) + bb * (c.y - a.y) + cc * (a.y - b.y)) / d;
        let y = (aa * (c.x - b.x) + bb * (a.x - c.x) + cc * (b.x - a.x)) / d;
        let dx = x - a.x;
        let dy = y - a.y;
        return { x, y, r2: dx * dx + dy * dy };
    }

    _meshDelaunay(inputPoints) {
        let points = inputPoints.map((p) => ({ x: p.x, y: p.y }));
        let n = points.length;
        let extent = points.reduce((m, p) => Math.max(m, Math.abs(p.x), Math.abs(p.y)), 400);
        let span = Math.max(1000, extent * 20);
        points.push(
            { x: -span, y: -span },
            { x: span * 2, y: -span },
            { x: -span, y: span * 2 }
        );
        let triangles = [[n, n + 1, n + 2]];

        for (let i = 0; i < n; i++) {
            let bad = [];
            triangles.forEach((tri, ti) => {
                let circle = this._meshCircumcircle(points[tri[0]], points[tri[1]], points[tri[2]]);
                if (!circle) return;
                let dx = points[i].x - circle.x;
                let dy = points[i].y - circle.y;
                if (dx * dx + dy * dy <= circle.r2 + 1e-5) bad.push(ti);
            });

            let edgeCounts = {};
            bad.forEach((ti) => {
                let tri = triangles[ti];
                [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]].forEach((edge) => {
                    let lo = Math.min(edge[0], edge[1]);
                    let hi = Math.max(edge[0], edge[1]);
                    let key = lo + ":" + hi;
                    if (!edgeCounts[key]) edgeCounts[key] = { edge, count: 0 };
                    edgeCounts[key].count++;
                });
            });
            let badSet = {};
            bad.forEach((ti) => { badSet[ti] = true; });
            triangles = triangles.filter((tri, ti) => !badSet[ti]);
            Object.values(edgeCounts).forEach((record) => {
                if (record.count === 1) triangles.push([record.edge[0], record.edge[1], i]);
            });
        }
        return triangles.filter((tri) => tri[0] < n && tri[1] < n && tri[2] < n);
    }

    _meshDrawWarped(ctx, source, sourcePoints, destPoints, triangles, alpha) {
        triangles.forEach((tri) => {
            let s0 = sourcePoints[tri[0]], s1 = sourcePoints[tri[1]], s2 = sourcePoints[tri[2]];
            let d0 = destPoints[tri[0]], d1 = destPoints[tri[1]], d2 = destPoints[tri[2]];
            let den = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
            if (Math.abs(den) < 1e-8) return;
            let a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / den;
            let c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / den;
            let e = (d0.x * (s1.x * s2.y - s2.x * s1.y)
                + d1.x * (s2.x * s0.y - s0.x * s2.y)
                + d2.x * (s0.x * s1.y - s1.x * s0.y)) / den;
            let b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / den;
            let d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / den;
            let f = (d0.y * (s1.x * s2.y - s2.x * s1.y)
                + d1.y * (s2.x * s0.y - s0.x * s2.y)
                + d2.y * (s0.x * s1.y - s1.x * s0.y)) / den;

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.beginPath();
            ctx.moveTo(d0.x, d0.y);
            ctx.lineTo(d1.x, d1.y);
            ctx.lineTo(d2.x, d2.y);
            ctx.closePath();
            ctx.clip();
            ctx.globalAlpha = alpha;
            ctx.setTransform(a, b, c, d, e, f);
            ctx.drawImage(source, 0, 0);
            ctx.restore();
        });
    }

    _renderMeshMorph(m) {
        if (!this.meshCanvas || !this.meshData) return;
        let ctx = this.meshCanvas.getContext("2d");
        let data = this.meshData;
        let size = this.meshCanvas.width;
        let dest = data.other.points.map((p, i) => ({
            x: p.x + (data.target.points[i].x - p.x) * m,
            y: p.y + (data.target.points[i].y - p.y) * m
        }));
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, size, size);
        // Add the two premultiplied warped sources at complementary weights.
        // This yields an exact 50/50 blend at m=.5 and a pure target at m=1;
        // destination-over paper then makes the final canvas fully opaque.
        ctx.globalCompositeOperation = "source-over";
        this._meshDrawWarped(ctx, data.other.canvas, data.other.points, dest, data.triangles, 1 - m);
        ctx.globalCompositeOperation = "lighter";
        this._meshDrawWarped(ctx, data.target.canvas, data.target.points, dest, data.triangles, m);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = this.params.polaroidPaperFill || "#f4efe4";
        ctx.fillRect(0, 0, size, size);
        ctx.globalCompositeOperation = "source-over";
    }

    async _placeMeshStimulus(trial, opts) {
        let well = this._photoWellBox();
        if (!well || !trial.targetFen || !trial.otherFen) return false;
        let size = Math.max(200, Math.round(this._num("meshRasterSize", 400)));
        let schemes = this._schemesForMorphTrial(trial);
        let targetScheme = schemes.target;
        let otherScheme = schemes.other;
        let ns = "http://www.w3.org/2000/svg";
        let foreign = document.createElementNS(ns, "foreignObject");
        let side = Math.min(well.width * 0.76, well.height * 0.82);
        foreign.setAttribute("x", String(well.x + (well.width - side) / 2));
        foreign.setAttribute("y", String(well.y + (well.height - side) / 2));
        foreign.setAttribute("width", String(side));
        foreign.setAttribute("height", String(side));
        foreign.style.pointerEvents = "none";
        foreign.style.overflow = "hidden";
        let canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        foreign.appendChild(canvas);
        // Do NOT insert until the first jumble frame is painted — inserting early
        // flashes an empty/partial canvas on top of the prime.

        try {
            let sources = await Promise.all([
                this._meshRasterSource(trial.targetFen, targetScheme),
                this._meshRasterSource(trial.otherFen, otherScheme)
            ]);
            if (sources[0].points.length !== sources[1].points.length) {
                throw new Error("mesh sources produced different landmark counts.");
            }
            let average = sources[0].points.map((p, i) => ({
                x: (p.x + sources[1].points[i].x) / 2,
                y: (p.y + sources[1].points[i].y) / 2
            }));
            let triangles = this._meshDelaunay(average);
            if (!triangles.length) throw new Error("Delaunay triangulation produced no triangles.");
            this.meshCanvas = canvas;
            this.meshForeignObject = foreign;
            this.meshData = {
                target: sources[0],
                other: sources[1],
                triangles
            };
            this.morphGroup = foreign;
            this.activeRenderer = "mesh";
            this._renderMeshMorph(0.5);
            let before = opts && opts.before ? opts.before : null;
            this._insertInPhotoWell(foreign, before);
            return true;
        } catch (err) {
            console.warn("MorphTask mesh renderer fell back to cross-fade:", err);
            this.meshFallbackReason = err && err.message ? err.message : String(err);
            if (foreign.parentNode) foreign.remove();
            this.meshCanvas = null;
            this.meshForeignObject = null;
            this.meshData = null;
            this.morphGroup = null;
            return false;
        }
    }

    // Veil blur only (grayscale is painted into fills / mesh sources, not filtered).
    _setMorphGroupFilter(extra) {
        if (!this.morphGroup) return;
        this.morphGroup.style.filter = (extra && extra !== "none") ? extra : "none";
    }

    async _placeMorphStimulus(trial, opts) {
        opts = opts || null;
        let before = opts && opts.before ? opts.before : null;
        if (!trial.is_practice && trial.morph === "mesh") {
            let ready = await this._placeMeshStimulus(trial, opts);
            if (ready) {
                this._setMorphGroupFilter("none");
                this._applyMorph(0.5);
                return;
            }
        }
        let group = create_SVG_group(0, 0, "morph_stimulus");
        group.style.pointerEvents = "none";
        this.morphGroup = group;
        this.activeRenderer = trial.is_practice ? "shape-crossfade" : "crossfade";

        if (trial.is_practice) {
            this.otherIcon = this._buildShapeNode(trial.shapeOther);
            this.targetIcon = this._buildShapeNode(trial.shapeTarget);
            group.appendChild(this.otherIcon);
            group.appendChild(this.targetIcon);
        } else {
            let schemes = this._schemesForMorphTrial(trial);
            this.otherIcon = this._buildParentIcon(trial, trial.otherFen, schemes.other);
            this.targetIcon = this._buildParentIcon(trial, trial.targetFen, schemes.target);
            group.appendChild(this.otherIcon);
            group.appendChild(this.targetIcon);
        }

        // Insert under the prime (when transitioning) only after children exist.
        this._insertInPhotoWell(group, before);
        if (trial.is_practice) {
            this._fitNodeInPhotoWell(this.otherIcon, 0.62, 0.55);
            this._fitNodeInPhotoWell(this.targetIcon, 0.62, 0.55);
        } else {
            let showBody = trial.view === "full";
            let wFrac = showBody ? 0.78 : 0.72;
            let hFrac = showBody ? 0.78 : 0.62;
            this._fitNodeInPhotoWell(this.otherIcon, wFrac, hFrac);
            this._fitNodeInPhotoWell(this.targetIcon, wFrac, hFrac);
        }

        // Ambiguity film above the stacked renders (still under the prime when dissolving).
        let well = this._photoWellBox();
        if (well) {
            let film = create_SVG_rect(well.x, well.y, well.width, well.height);
            film.setAttribute("rx", well.rx);
            film.setAttribute("ry", well.ry);
            film.setAttribute("fill", this.params.filmFill || this.params.polaroidPaperFill || "#f4efe4");
            film.style.pointerEvents = "none";
            this._insertInPhotoWell(film, before);
            this.filmRect = film;
        }

        this._applyMorph(0.5);
    }

    // m in [0.5, 1]: 0.5 = fully ambiguous 50/50 blend, 1 = pure target.
    // Target on top at opacity m; other below fading out over m in [0.5, 1].
    _applyMorph(m) {
        m = Math.max(0.5, Math.min(1, m));
        this._currentMorphLevel = m;
        if (this.activeRenderer === "mesh") {
            this._renderMeshMorph(m);
            this._setMorphGroupFilter("none");
            if (this.filmRect) this.filmRect.style.opacity = "0";
            return;
        }
        if (!this.targetIcon || !this.otherIcon) return;
        let resolved = m >= 0.999;
        this.targetIcon.style.opacity = String(m);
        this.otherIcon.style.opacity = resolved ? "0" : String(Math.min(1, 2 * (1 - m)));

        let ambiguity = Math.max(0, Math.min(1, 2 * (1 - m)));
        if (this.morphGroup) {
            if (resolved || ambiguity <= 0.001) {
                this._setMorphGroupFilter("none");
            } else {
                let blurMax = this._num("blurMaxPx", 7);
                let power = this._num("blurPower", 1.4);
                let blur = blurMax * Math.pow(ambiguity, power);
                this._setMorphGroupFilter(blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none");
            }
        }
        if (this.filmRect) {
            let filmMax = this._num("filmMaxOpacity", 0.18);
            this.filmRect.style.opacity = String(resolved ? 0 : filmMax * ambiguity);
        }
    }

    // Keyboard-only identity keycaps + radial name-choice chips
    // ------------------------------------------------------------------

    _drawKeyCap(parent, x, y, w, h) {
        let g = parent;
        let lip = create_SVG_rect(x - w / 2, y - h / 2 + 5, w, h);
        lip.setAttribute("rx", "16");
        lip.setAttribute("fill", "#cfc8b8");
        lip.setAttribute("stroke", "#4b5563");
        lip.setAttribute("stroke-width", "4");
        lip.classList.add("hat_drop_key_lip");
        g.appendChild(lip);
        let face = create_SVG_rect(x - w / 2, y - h / 2 - 2, w, h);
        face.setAttribute("rx", "16");
        face.setAttribute("fill", "#f4efe4");
        face.setAttribute("stroke", "#4b5563");
        face.setAttribute("stroke-width", "4");
        face.classList.add("hat_drop_key_face");
        g.appendChild(face);
        g._keyLip = lip;
        g._keyFace = face;
        g._keyFaceRestY = y - h / 2 - 2;
        g._keyLipRestY = y - h / 2 + 5;
        g._keyFaceRestFill = "#f4efe4";
        g._keyLipRestFill = "#cfc8b8";
        g._keyPressDy = 7;
        return face;
    }

    // Name options: soft chips (not 3D keycaps) so they don't read as keyboard keys.
    _drawNameChip(parent, x, y, w, h) {
        let g = parent;
        let face = create_SVG_rect(x - w / 2, y - h / 2, w, h);
        face.setAttribute("rx", "22");
        face.setAttribute("fill", "#d7e4f0");
        face.setAttribute("stroke", "#5a6f86");
        face.setAttribute("stroke-width", "3");
        face.classList.add("morph_name_chip_face");
        g.appendChild(face);
        g._keyLip = null;
        g._keyFace = face;
        g._keyFaceRestY = y - h / 2;
        g._keyLipRestY = y - h / 2;
        g._keyFaceRestFill = "#d7e4f0";
        g._keyLipRestFill = null;
        g._keyPressDy = 0;
        g.classList.add("morph_name_chip");
        return face;
    }

    _setKeyPressed(g, pressed) {
        if (!g) return;
        pressed = !!pressed;
        if (g._keyPressed === pressed) return;
        g._keyPressed = pressed;
        g.classList.toggle("is-pressed", pressed);
        let dy = pressed ? (g._keyPressDy || 7) : 0;
        if (g._keyFace) g._keyFace.setAttribute("y", g._keyFaceRestY + dy);
        if (g._keyLip) g._keyLip.setAttribute("y", g._keyLipRestY + dy);
        if (g._keyGlyph) {
            if (g._keyGlyph.tagName === "text") {
                g._keyGlyph.setAttribute("y", g._keyGlyphRestY + dy);
            } else {
                g._keyGlyph.setAttribute("transform", dy ? `translate(0, ${dy})` : "");
            }
        }
    }

    _placeTextKey(x, y, w, h, label, handlers) {
        handlers = handlers || {};
        let g = create_SVG_group(0, 0, handlers.chip ? "morph_name_chip" : "hat_drop_key");
        if (handlers.chip) this._drawNameChip(g, x, y, w, h);
        else this._drawKeyCap(g, x, y, w, h);
        let text = create_SVG_text_elem(x, y - 2, label, undefined, undefined);
        text.classList.add(handlers.chip ? "morph_name_chip_glyph" : "hat_drop_key_glyph");
        text.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
        let fontSize = handlers.fontSize || (w >= 200 ? 28 : 24);
        text.style.fontSize = fontSize + "px";
        text.style.fontWeight = "700";
        text.setAttribute("fill", "#1e3a5f");
        text.style.textAnchor = "middle";
        text.style.dominantBaseline = "central";
        text.style.pointerEvents = "none";
        g.appendChild(text);
        g._keyGlyph = text;
        g._keyGlyphRestY = y - 2;
        let keyboardOnly = handlers.keyboardOnly;
        if (keyboardOnly) {
            g.style.cursor = "default";
            g.style.pointerEvents = "none";
        } else {
            g.style.cursor = "pointer";
            g.style.pointerEvents = "all";
        }
        return g;
    }

    _setKeyGoldHighlight(g, on) {
        if (!g || !g._keyFace) return;
        let isChip = g.classList.contains("morph_name_chip");
        g._keyFace.setAttribute("stroke", on ? "#c9a227" : (isChip ? "#5a6f86" : "#4b5563"));
        g._keyFace.setAttribute("stroke-width", on ? "5" : (isChip ? "3" : "4"));
        g._keyFace.setAttribute("fill", on ? "#ffe9a8" : (g._keyFaceRestFill || (isChip ? "#d7e4f0" : "#f4efe4")));
        if (g._keyLip) {
            g._keyLip.setAttribute("fill", on ? "#e0c46a" : (g._keyLipRestFill || "#cfc8b8"));
            g._keyLip.setAttribute("stroke", on ? "#c9a227" : "#4b5563");
        }
        if (g._keyGlyph) {
            g._keyGlyph.setAttribute("fill", on ? "#5a3e00" : "#1e3a5f");
        }
    }

    _placeNameQuizHint() {
        // F/J + Space are coached via speech bubbles on first name quiz.
        this._clearNameQuizHint();
    }

    _clearNameQuizHint() {
        if (this.nameQuizHint && this.nameQuizHint.parentNode) this.nameQuizHint.remove();
        this.nameQuizHint = null;
    }

    _dismissNameQuizCoachBubble() {
        if (typeof Interface !== "undefined" && Interface.PartnerSpeechBubble) {
            Interface.PartnerSpeechBubble.hide(true);
            Interface.PartnerSpeechBubble.confirm();
        }
    }

    _clearNameQuizUi() {
        this._clearNameQuizHint();
        if (this._nameQuizFjCoach) {
            let coach = this._nameQuizFjCoach;
            this._nameQuizFjCoach = null;
            if (coach.resolveMove) {
                let r = coach.resolveMove;
                coach.resolveMove = null;
                r();
            }
            this._dismissNameQuizCoachBubble();
        }
        if (this.nameQuizGroup) {
            this.nameQuizGroup.remove();
            this.nameQuizGroup = null;
        }
        this.nameQuizKeys = [];
        this.nameQuizLayout = [];
        this._nameQuizHighlight = 0;
        this._nameQuizFeedbackBusy = false;
        this._waitingForNameQuiz = false;
        // Do NOT null _nameQuizResolve here — correct answers clear the UI
        // before calling the resolver; wiping it stalls the trial forever.
    }

    _clearIdentityKeys() {
        if (this.identityKeysGroup) {
            this.identityKeysGroup.remove();
            this.identityKeysGroup = null;
        }
        this.identityKeyF = null;
        this.identityKeyJ = null;
        this._identityArmed = false;
        this._waitingForChoice = false;
        this._choiceResolve = null;
    }

    _clockHour(x, y, cx, cy) {
        let dx = x - cx;
        let dy = y - cy;
        if (dx === 0 && dy === 0) return null;
        let from12 = Math.atan2(dy, dx) + Math.PI / 2;
        if (from12 < 0) from12 += 2 * Math.PI;
        let hour = Math.round(from12 / (2 * Math.PI) * 12) % 12;
        return hour === 0 ? 12 : hour;
    }

    _answerAngles(n, mode, extraSpin) {
        if (n <= 2) return [0, Math.PI];
        if (mode === "half") return Array.from({ length: n }, (_, i) => Math.PI * (i + 0.5) / n);
        let spin = extraSpin != null ? extraSpin : (this.buttonRingSpin != null ? this.buttonRingSpin : -Math.PI / 2);
        return Array.from({ length: n }, (_, i) => spin + (i * 2 * Math.PI / n));
    }

    _ringPoints(cx, cy, radius, angles) {
        return angles.map((a) => ({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius }));
    }

    _fitAnswerRing(n, cx, cy, radius, preferHalf, minX, maxX, minY, maxY, spin) {
        const inBounds = (pts) => pts.every((p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
        const tryMode = (mode, modeSpin) => {
            let R = radius;
            let angles = this._answerAngles(n, mode, modeSpin);
            while (R >= 140) {
                let points = this._ringPoints(cx, cy, R, angles);
                if (inBounds(points)) return { mode, points, radius: R };
                R -= 12;
            }
            return null;
        };
        if (!preferHalf) {
            let full = tryMode("full", spin);
            if (full) return full;
        }
        let half = tryMode("half");
        if (half) return half;
        let fallbackAngles = this._answerAngles(n, "half");
        return {
            mode: "half",
            points: this._ringPoints(cx, cy, 140, fallbackAngles).map((p) => ({
                x: Math.max(minX, Math.min(maxX, p.x)),
                y: Math.max(minY, Math.min(maxY, p.y))
            })),
            radius: 140
        };
    }

    _placeNameQuizKeys(trial) {
        this._clearNameQuizUi();
        let options = trial.is_practice
            ? this._nameOptionsForTrial(trial)
            : this._sortByButtonOrder(this._nameOptionsForTrial(trial));
        if (!options.length) this._fail(`trial "${trial.id}" name quiz has no options.`);

        let n = options.length;
        let btnW = this._num("nameKeyW", 200);
        let btnH = this._num("nameKeyH", 72);
        let radius = n <= 2 ? 240 : this._num("radialRadius", this._num("primeNameRadialRadius", 300));
        let mount = this.polaroidMount || {};
        let cx = mount.cx != null ? mount.cx : 0.5 * this.W;
        let cy = mount.cy != null ? mount.cy : 0.48 * this.H;
        let minX = 16 + btnW / 2;
        let maxX = this.W - 16 - btnW / 2;
        let minY = 110 + btnH / 2;
        let maxY = this.H - 18 - btnH / 2;
        let spin = n > 2 ? (this.buttonRingSpin != null ? this.buttonRingSpin : -Math.PI / 2) : 0;
        let layout = this._fitAnswerRing(n, cx, cy, radius, false, minX, maxX, minY, maxY, spin);

        let group = create_SVG_group(0, 0, "morph_name_quiz_keys");
        this.layers.Plus1.appendChild(group);
        this.nameQuizGroup = group;
        this.nameQuizKeys = [];
        this.nameQuizLayout = [];

        options.forEach((opt, i) => {
            let x = layout.points[i].x;
            let y = layout.points[i].y;
            let key = this._placeTextKey(x, y, btnW, btnH, opt.label, {
                keyboardOnly: true,
                fontSize: 28,
                chip: true
            });
            group.appendChild(key);
            this.nameQuizLayout.push({
                option_id: opt.id,
                label: opt.label,
                x: Math.round(x),
                y: Math.round(y),
                ring: layout.mode,
                clock_hour: this._clockHour(x, y, cx, cy)
            });
            this.nameQuizKeys.push({ id: opt.id, label: opt.label, el: key, x, y });
        });
        this._nameQuizHighlight = 0;
        this._updateNameQuizHighlight();
        this._placeNameQuizHint();
    }

    _updateNameQuizHighlight() {
        (this.nameQuizKeys || []).forEach((k, i) => {
            this._setKeyGoldHighlight(k.el, i === this._nameQuizHighlight);
        });
    }

    _nameQuizCorrectId(trial) {
        if (trial.is_practice) return trial.nameCorrectId;
        return trial.prime && trial.prime.nameFen ? trial.prime.nameFen.id : null;
    }

    _nudgeNameQuiz(dir) {
        let n = (this.nameQuizKeys || []).length;
        if (n <= 1) return;
        this._nameQuizHighlight = (this._nameQuizHighlight + dir + n) % n;
        this._updateNameQuizHighlight();
        if (typeof AudioCont !== "undefined" && AudioCont.play_sound_effect) {
            AudioCont.play_sound_effect("button_click");
        }
    }

    _noteNameQuizFj() {
        let coach = this._nameQuizFjCoach;
        if (!coach || coach.phase !== "move") return;
        // First F/J after the "move" bubble: dismiss it and continue the coach.
        this._dismissNameQuizCoachBubble();
        let r = coach.resolveMove;
        coach.resolveMove = null;
        coach.phase = "space";
        if (r) r();
    }

    async _coachNameQuizFjIfNeeded() {
        if (this._nameQuizFjTaught || this.destroyed) return;
        let keys = this.nameQuizKeys || [];
        if (!keys.length) return;

        // Start on / point at an incorrect option so F/J clearly changes the highlight.
        let correctId = this._nameQuizCorrectId(this.currentTrial);
        let wrongIdx = keys.findIndex((k) => k.id !== correctId);
        if (wrongIdx < 0) wrongIdx = Math.min(1, keys.length - 1);
        this._nameQuizHighlight = wrongIdx;
        this._updateNameQuizHighlight();
        let wrongEl = keys[wrongIdx].el;

        let moveBubbleDone = this._showBubble(
            wrongEl,
            "Use F and J to move the highlighted name.",
            { hideButton: true, preferredSide: "up" }
        );
        await new Promise((resolve) => {
            this._nameQuizFjCoach = { phase: "move", resolveMove: resolve };
        });
        await moveBubbleDone;
        if (this.destroyed) return;

        let selected = keys[this._nameQuizHighlight];
        let spaceTarget = (selected && selected.el) || this.nameQuizGroup || this.stimulusGroup;
        let spaceBubbleDone = this._showBubble(
            spaceTarget,
            "Press Space to confirm your choice.",
            { hideButton: true, preferredSide: "up" }
        );
        this._nameQuizFjCoach = { phase: "space", spaceBubbleDone };
        this._nameQuizFjTaught = true;
        // Don't await Space here — the quiz promise handles confirm; bubble
        // is dismissed when they confirm (or if the quiz UI clears).
        void spaceBubbleDone;
    }

    async _shakePolaroid() {
        let el = this.stimulusGroup;
        if (!el) {
            await wait(420);
            return;
        }
        el.classList.remove("photo_trial_polaroid_shake");
        void el.getBoundingClientRect();
        el.classList.add("photo_trial_polaroid_shake");
        await wait(420);
        el.classList.remove("photo_trial_polaroid_shake");
    }

    async _feedbackNameQuizIncorrect() {
        if (this._nameQuizFeedbackBusy) return;
        this._nameQuizFeedbackBusy = true;
        this._waitingForNameQuiz = false;
        if (this.nameQuizGroup) this.nameQuizGroup.style.display = "none";
        if (typeof AudioCont !== "undefined" && AudioCont.play_sound_effect) {
            AudioCont.play_sound_effect("rejected");
        }
        let shakeDone = this._shakePolaroid();
        await wait(this._num("primeNameIncorrectMs", 1000));
        await shakeDone;
        if (this.destroyed) return;
        if (this.nameQuizGroup) this.nameQuizGroup.style.display = "";
        this._nameQuizFeedbackBusy = false;
        this._waitingForNameQuiz = true;
    }

    _confirmNameQuizSelection() {
        let coach = this._nameQuizFjCoach;
        if (coach && coach.phase === "move") return;
        if (coach && coach.phase === "space") {
            this._nameQuizFjCoach = null;
            this._dismissNameQuizCoachBubble();
        }
        if (!this._waitingForNameQuiz || this._nameQuizFeedbackBusy) return;
        let keys = this.nameQuizKeys || [];
        if (!keys.length) return;
        let pick = keys[this._nameQuizHighlight];
        if (!pick) return;
        this._onNameQuizSelect(pick.id);
    }

    _onNameQuizSelect(id) {
        let trial = this.currentTrial;
        let result = this._primeNameQuizResult;
        if (!result || !trial) return;
        let now = performance.now();
        result.attempts.push({
            selected_id: id,
            t_ms: Math.round(now - result.start_perf),
            input_type: "keyboard"
        });
        let correctId = this._nameQuizCorrectId(trial);
        if (id !== correctId) {
            this._feedbackNameQuizIncorrect();
            return;
        }
        this._waitingForNameQuiz = false;
        if (typeof AudioCont !== "undefined" && AudioCont.play_sound_effect) {
            AudioCont.play_sound_effect("button_click");
        }
        result.reaction_time_ms = Math.round(now - result.start_perf);
        result.n_errors = Math.max(0, result.attempts.length - 1);
        result.selected_id = id;
        result.correct = true;
        result.presented_options = (this.nameQuizLayout || []).map((o) => ({
            id: o.option_id,
            label: o.label,
            clock_hour: o.clock_hour
        }));
        result.button_order_ids = trial.is_practice ? [] : (this.buttonOrderIds || []).slice();
        this._keepMysteryCaption(trial);
        this._clearNameQuizUi();
        this.inputLocked = true;
        this._inputStage = null;
        // Show F/J early (dimmed); arm them when the score timer starts.
        this._placeIdentityKeys(trial, { armed: false });
        let resolveQuiz = this._nameQuizResolve;
        this._nameQuizResolve = null;
        this._shakePolaroid().then(() => {
            if (resolveQuiz) resolveQuiz(result);
        });
    }

    async _runNameQuiz(trial) {
        this._placeNameQuizKeys(trial);
        this._primeNameQuizResult = {
            correct_id: this._nameQuizCorrectId(trial),
            attempts: [],
            start_perf: performance.now()
        };
        // Arm input before the coach so F/J/Space work during coaching.
        this._waitingForNameQuiz = true;
        this._inputStage = "name_quiz";
        this.inputLocked = false;
        let quizPromise = new Promise((resolve) => {
            this._nameQuizResolve = resolve;
        });
        await this._coachNameQuizFjIfNeeded();
        if (this.destroyed) return null;
        if (this._primeNameQuizResult) {
            this._primeNameQuizResult.start_perf = performance.now();
        }
        return quizPromise;
    }

    _identityOptions(trial) {
        let rightId = this.buttonSides[trial.id];
        let left = trial.options.find((o) => o.id !== rightId);
        let right = trial.options.find((o) => o.id === rightId);
        if (!left || !right) {
            left = trial.options[0];
            right = trial.options[1];
        }
        this.optionSides = { left_id: left.id, right_id: right.id };
        return { left, right };
    }

    _identityKeyLayout() {
        // Prefer photo-well center so F/J sit beside the head, not the caption.
        let headY = null;
        if (this.photoWellRect && typeof getSVGInternalCenter === "function") {
            try {
                let c = getSVGInternalCenter(this.photoWellRect);
                if (c && Number.isFinite(c.y)) headY = c.y;
            } catch (e) { /* fall through */ }
        }
        if (headY == null && this.polaroidMount && this.polaroidMount.cy != null) {
            headY = this.polaroidMount.cy;
        }
        if (headY == null) headY = this.H * this._num("identityKeyYFrac", 0.44);
        return {
            y: headY,
            startY: this.H * this._num("startSpaceKeyYFrac", 0.82),
            leftX: this.W * this._num("identityKeyLeftXFrac", 0.30),
            rightX: this.W * this._num("identityKeyRightXFrac", 0.70),
            centerX: this.W * 0.5,
            w: this._num("identityKeyW", 240),
            h: this._num("identityKeyH", 88)
        };
    }

    _placeIdentityKeys(trial, opts) {
        opts = opts || {};
        let armed = !!opts.armed;
        this._clearIdentityKeys();
        let keyOpts = this._identityOptions(trial);
        let layout = this._identityKeyLayout();
        // Above the time bars (bars live on Plus1).
        let group = create_SVG_group(0, 0, "morph_identity_keys");
        this.layers.Plus2.appendChild(group);
        this.identityKeysGroup = group;
        this.identityKeyF = this._placeTextKey(
            layout.leftX, layout.y, layout.w, layout.h,
            "F: " + keyOpts.left.label,
            { keyboardOnly: true, fontSize: 28 }
        );
        this.identityKeyJ = this._placeTextKey(
            layout.rightX, layout.y, layout.w, layout.h,
            "J: " + keyOpts.right.label,
            { keyboardOnly: true, fontSize: 28 }
        );
        group.appendChild(this.identityKeyF);
        group.appendChild(this.identityKeyJ);
        this._setIdentityKeysArmed(armed);
    }

    _setIdentityKeysArmed(armed) {
        this._identityArmed = !!armed;
        if (!this.identityKeysGroup) return;
        this.identityKeysGroup.style.opacity = this._identityArmed ? "1" : "0.38";
        this.identityKeysGroup.style.pointerEvents = "none";
    }

    _placeStartSpaceKey() {
        this._clearStartSpaceKey();
        let layout = this._identityKeyLayout();
        let w = this._num("startSpaceKeyW", 280);
        let h = this._num("startSpaceKeyH", layout.h);
        let group = create_SVG_group(0, 0, "morph_start_space_key");
        this.layers.Plus1.appendChild(group);
        this.startSpaceKeyGroup = group;
        this.startSpaceKey = this._placeTextKey(
            layout.centerX, layout.startY, w, h,
            "Space",
            { keyboardOnly: true, fontSize: 30 }
        );
        group.appendChild(this.startSpaceKey);
        group.style.opacity = "1";
    }

    _clearStartSpaceKey() {
        if (this.startSpaceKeyGroup && this.startSpaceKeyGroup.parentNode) {
            this.startSpaceKeyGroup.remove();
        }
        this.startSpaceKeyGroup = null;
        this.startSpaceKey = null;
    }

    async _fadeOutStartSpaceKey() {
        let group = this.startSpaceKeyGroup;
        if (!group) return;
        let ms = 280;
        let start = performance.now();
        await new Promise((resolve) => {
            const tick = (now) => {
                if (this.destroyed) return resolve();
                let t = Math.min(1, (now - start) / ms);
                group.style.opacity = String(1 - t);
                if (t >= 1) return resolve();
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
        this._clearStartSpaceKey();
    }

    _onKeyDown(evt) {
        if (this.destroyed || this.inputLocked) return;
        if (evt.repeat) return;
        let key = evt.key;
        let isSpace = key === " " || key === "Spacebar" || evt.code === "Space";
        if (isSpace) evt.preventDefault();

        if (this._inputStage === "start" && this._waitingForStart) {
            if (isSpace) {
                this._setKeyPressed(this.startSpaceKey, true);
                this._confirmSpaceStart();
            }
            return;
        }

        if (this._inputStage === "name_quiz" && this._waitingForNameQuiz) {
            // F = clockwise, J = counter-clockwise; Space confirms (after F/J coach).
            if (key === "f" || key === "F" || evt.code === "KeyF") {
                evt.preventDefault();
                this._nudgeNameQuiz(1);
                this._noteNameQuizFj();
            } else if (key === "j" || key === "J" || evt.code === "KeyJ") {
                evt.preventDefault();
                this._nudgeNameQuiz(-1);
                this._noteNameQuizFj();
            } else if (isSpace) {
                this._confirmNameQuizSelection();
            }
            return;
        }

        if (this._inputStage === "identity" && this._waitingForChoice) {
            if (!this._identityArmed) return;
            if (key === "f" || key === "F" || evt.code === "KeyF") {
                evt.preventDefault();
                this._setKeyPressed(this.identityKeyF, true);
                this._onIdentitySelect("F");
            } else if (key === "j" || key === "J" || evt.code === "KeyJ") {
                evt.preventDefault();
                this._setKeyPressed(this.identityKeyJ, true);
                this._onIdentitySelect("J");
            }
        }
    }

    _onKeyUp(evt) {
        if (this.destroyed) return;
        let key = evt.key;
        let isSpace = key === " " || key === "Spacebar" || evt.code === "Space";
        if (key === "f" || key === "F" || evt.code === "KeyF") this._setKeyPressed(this.identityKeyF, false);
        else if (key === "j" || key === "J" || evt.code === "KeyJ") this._setKeyPressed(this.identityKeyJ, false);
        if (isSpace) this._setKeyPressed(this.startSpaceKey, false);
    }

    _onIdentitySelect(side) {
        if (this.inputLocked || !this._waitingForChoice) return;
        let trial = this.currentTrial;
        if (!trial || !this.optionSides) return;
        let id = side === "J" ? this.optionSides.right_id : this.optionSides.left_id;
        this.inputLocked = true;
        this._waitingForChoice = false;
        let now = performance.now();
        this._choice = {
            selected_id: id,
            selected_side: side === "J" ? "right" : "left",
            input_type: "keyboard",
            response_perf: now
        };
        if (this._choiceResolve) {
            let r = this._choiceResolve;
            this._choiceResolve = null;
            r(this._choice);
        }
        if (side === "F") this._setKeyGoldHighlight(this.identityKeyF, true);
        else this._setKeyGoldHighlight(this.identityKeyJ, true);
    }

    _placeOccluder() {
        let well = this._photoWellBox();
        if (!well) this._fail("missing photo well for occluder.");
        // Visual ? only — start is keyboard Space (see _placeStartSpaceKey).
        let built = this._buildOccluderGroup(well, "morph_occluder", { highlight: false });
        if (built.hit) {
            built.hit.style.pointerEvents = "none";
            built.hit.style.cursor = "default";
            built.hit.classList.remove("focus_on_SVG_outline");
        }
        this._insertInPhotoWell(built.g);
        this.occluder = built.g;
        this.occluderHit = built.hit;
    }

    _confirmSpaceStart() {
        if (!this._waitingForStart) return;
        this._waitingForStart = false;
        this.inputLocked = true;
        this._inputStage = null;
        // Drop the "Press Space" bubble immediately (confirm alone fades ~280ms).
        if (typeof Interface !== "undefined" && Interface.PartnerSpeechBubble) {
            Interface.PartnerSpeechBubble.hide(true);
            Interface.PartnerSpeechBubble.confirm();
        }
        if (typeof AudioCont !== "undefined" && AudioCont.play_sound_effect) {
            AudioCont.play_sound_effect("button_click");
        }
        if (this._startResolve) {
            let r = this._startResolve;
            this._startResolve = null;
            r();
        }
    }

    _waitForSpaceStart() {
        if (!this.startSpaceKey) this._placeStartSpaceKey();
        return new Promise((resolve) => {
            this.inputLocked = false;
            this._inputStage = "start";
            this._waitingForStart = true;
            this._startResolve = resolve;
        });
    }

    async _beginTrialReveal() {
        await this._waitForSpaceStart();
        await this._fadeOutStartSpaceKey();
        this._liftOccluder();
        await this._shakePolaroid();
        await this._animatePrimeReveal();
    }

    _liftOccluder() {
        if (this.occluder) {
            this.occluder.remove();
            this.occluder = null;
        }
        this.occluderHit = null;
    }

    async _waitForPaint() {
        let node = this.occluder || this.photoWellRect || this.stimulusGroup;
        if (node && node.getBoundingClientRect) void node.getBoundingClientRect();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (node && node.getBoundingClientRect) void node.getBoundingClientRect();
    }

    _bubblePalette() {
        let p = (typeof GenParam !== "undefined" && GenParam.PartnerSpeechBubble) || {};
        return {
            fill: p.fill || "#faf8eb",
            fillOpacity: p.fillOpacity != null ? p.fillOpacity : 0.92,
            stroke: p.stroke || "#4b5563",
            strokeWidth: p.strokeWidth || 3,
            radius: p.cornerRadius || 28,
            textColor: p.textColor || "#1e3a5f"
        };
    }

    _placeHudBubble(x, y, w, h, text, className, fontSize) {
        let pal = this._bubblePalette();
        let g = create_SVG_group(0, 0, className);
        g.style.pointerEvents = "none";
        let rect = create_SVG_rect(x, y, w, h);
        rect.setAttribute("rx", String(pal.radius));
        rect.setAttribute("ry", String(pal.radius));
        rect.setAttribute("fill", pal.fill);
        rect.setAttribute("fill-opacity", String(pal.fillOpacity));
        rect.setAttribute("stroke", pal.stroke);
        rect.setAttribute("stroke-width", String(pal.strokeWidth));
        g.appendChild(rect);
        let label = create_SVG_text_elem(x + w / 2, y + h / 2, text, undefined, undefined);
        label.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
        label.style.fontSize = fontSize + "px";
        label.style.fontWeight = "700";
        label.style.fill = pal.textColor;
        label.style.textAnchor = "middle";
        label.style.dominantBaseline = "central";
        label.style.pointerEvents = "none";
        g.appendChild(label);
        this.layers.Plus2.appendChild(g);
        return { group: g, label: label };
    }

    _placeQuestion(trial) {
        let w = 720;
        let h = 78;
        let x = 0.5 * this.W - w / 2;
        let y = 18;
        let hud = this._placeHudBubble(x, y, w, h, trial.question, "morph_question", 36);
        this.questionEl = hud.group;
        this._questionHud = { x, y, w, h };
    }

    _starPoints(cx, cy, outer, inner) {
        let pts = [];
        for (let i = 0; i < 10; i++) {
            let r = (i % 2 === 0) ? outer : inner;
            let a = -Math.PI / 2 + i * Math.PI / 5;
            pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
        }
        return pts.join(" ");
    }

    _placePointsHud(value) {
        // Hat-drop layout: points chip to the left of the top question bar.
        let h = 78;
        let w = 176;
        let gap = 16;
        let q = this._questionHud || { x: 0.5 * this.W - 360, y: 18, w: 720, h: 78 };
        let x = q.x - gap - w;
        let y = q.y;
        let pal = this._bubblePalette();
        let g = create_SVG_group(0, 0, "morph_points");
        g.style.pointerEvents = "none";

        let rect = create_SVG_rect(x, y, w, h);
        rect.setAttribute("rx", String(pal.radius));
        rect.setAttribute("ry", String(pal.radius));
        rect.setAttribute("fill", pal.fill);
        rect.setAttribute("fill-opacity", String(pal.fillOpacity));
        rect.setAttribute("stroke", pal.stroke);
        rect.setAttribute("stroke-width", String(pal.strokeWidth));
        g.appendChild(rect);

        let star = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        star.setAttribute("points", this._starPoints(x + 36, y + h / 2, 16, 7));
        star.setAttribute("fill", "#f5c518");
        star.setAttribute("stroke", pal.stroke);
        star.setAttribute("stroke-width", "2.5");
        star.setAttribute("stroke-linejoin", "round");
        g.appendChild(star);

        let label = create_SVG_text_elem(x + 112, y + h / 2, String(Math.round(value)), undefined, undefined);
        label.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
        label.style.fontSize = "36px";
        label.style.fontWeight = "800";
        label.style.fill = pal.textColor;
        label.style.textAnchor = "middle";
        label.style.dominantBaseline = "central";
        label.style.pointerEvents = "none";
        g.appendChild(label);

        this.layers.Plus2.appendChild(g);
        this.pointsEl = g;
        this.pointsDiv = label;
        this._setPointsDisplay(value);
    }

    _setPointsDisplay(value) {
        if (this.pointsDiv) this.pointsDiv.textContent = String(Math.max(0, Math.round(value)));
    }

    _barGeometry() {
        let p = this.params;
        let width = p.barWidth != null ? p.barWidth : 68;
        let top = (p.barTop != null ? p.barTop : 0.12) * this.H;
        let bottom = (p.barBottom != null ? p.barBottom : 0.92) * this.H;
        let height = bottom - top;
        let leftFrac = p.barLeftX != null ? p.barLeftX : 0.25;
        let rightFrac = p.barRightX != null ? p.barRightX : 0.75;
        return {
            width, top, bottom, height,
            leftX: leftFrac * this.W - width / 2,
            rightX: rightFrac * this.W - width / 2
        };
    }

    _placeTimeBars() {
        let g = this._barGeometry();
        const makeBar = (x) => {
            let rect = create_SVG_rect(x, g.top, g.width, g.height);
            rect.setAttribute("rx", "10");
            rect.setAttribute("fill", "#43a047");
            rect.classList.add("chimera_time_bar");
            rect.style.opacity = "0";
            // Under identity keys (keys are on Plus2).
            this.layers.Plus1.appendChild(rect);
            return rect;
        };
        this.barLeft = makeBar(g.leftX);
        this.barRight = makeBar(g.rightX);
        this._setBarsProgress(0);
    }

    _barColor(progress) {
        let remaining = 1 - progress;
        if (remaining > 0.5) return "#43a047";
        if (remaining > 0.25) return "#f9a825";
        return "#c62828";
    }

    _setBarsProgress(progress) {
        let g = this._barGeometry();
        [this.barLeft, this.barRight].forEach((bar) => {
            if (!bar) return;
            let remaining = Math.max(0, 1 - progress);
            let h = g.height * remaining;
            let y = g.bottom - h;
            bar.setAttribute("y", String(y));
            bar.setAttribute("height", String(Math.max(h, 0)));
            bar.classList.toggle("pulse", remaining > 0 && remaining <= 0.25);
            if (!(remaining > 0 && remaining <= 0.25)) {
                bar.setAttribute("fill", this._barColor(progress));
            }
        });
    }

    _showTimeBars() {
        [this.barLeft, this.barRight].forEach((bar) => {
            if (!bar) return;
            bar.style.opacity = "";
            bar.classList.add("is-on");
        });
    }

    _startMorphPhase(trial) {
        this._liftOccluder();
        this._showTimeBars();
        this._setBarsProgress(0);
        this._setPointsDisplay(this.params.maxPoints || 100);
        if (!this.identityKeysGroup) {
            this._placeIdentityKeys(trial, { armed: true });
        } else {
            this._setIdentityKeysArmed(true);
        }
        this._inputStage = "identity";
    }

    _runMorphUntilResponse(trial) {
        return new Promise((resolve) => {
            this._waitingForChoice = true;
            this.inputLocked = false;
            this._choiceResolve = resolve;
            this._choice = null;

            let maxPoints = this.params.maxPoints || 100;
            let T = this.trialSpeedMs;
            let start = performance.now();
            this._morphStart = start;
            this._late = false;

            const tick = (now) => {
                if (this.destroyed) return;
                let elapsed = now - start;
                this._applyMorph(this._morphWeightAt(elapsed, trial));
                let scoreT = Math.min(1, elapsed / T);
                this._setBarsProgress(scoreT);
                if (!this._pointsFrozen) {
                    this._setPointsDisplay(maxPoints * (1 - scoreT));
                }
                // Linear peak → 0 over trial_speed (noise:X is peak only).
                if (this._noisePeak > 0) {
                    this._setNoiseAmount(this._noisePeak * (1 - scoreT));
                }
                if (scoreT >= 1 && !this._late) {
                    this._late = true;
                    this._setBarsProgress(1);
                    this._setPointsDisplay(0);
                    this._setNoiseAmount(0);
                }
                this.morphRaf = requestAnimationFrame(tick);
            };
            this.morphRaf = requestAnimationFrame(tick);
        });
    }

    _stopMorph() {
        if (this.morphRaf) {
            cancelAnimationFrame(this.morphRaf);
            this.morphRaf = null;
        }
        this._waitingForChoice = false;
        this._choiceResolve = null;
    }

    _stopResolveAnim() {
        if (this.resolveRaf) {
            cancelAnimationFrame(this.resolveRaf);
            this.resolveRaf = null;
        }
    }

    _resolveToTruth() {
        return new Promise((resolve) => {
            let fromM = this._currentMorphLevel != null ? this._currentMorphLevel : 0.5;
            let dur = Math.max(1, this._num("resolveAnimMs", 450));
            let start = performance.now();
            const tick = (now) => {
                if (this.destroyed) return resolve();
                let t = Math.min(1, (now - start) / dur);
                let eased = 1 - Math.pow(1 - t, 2);
                this._applyMorph(fromM + (1 - fromM) * eased);
                if (t >= 1) {
                    this.resolveRaf = null;
                    resolve();
                    return;
                }
                this.resolveRaf = requestAnimationFrame(tick);
            };
            this.resolveRaf = requestAnimationFrame(tick);
        });
    }

    async _flyPolaroidToSide(side) {
        let mount = this.polaroidMount;
        if (!mount || !mount.groupTranslate) return;
        let el = mount.groupTranslate;
        let ms = Math.max(1, Math.round(this._num("flyMs", 650)));
        let scaleEnd = this._num("flyScale", 0.35);
        let startCx = mount.cx != null ? mount.cx : this.W * 0.5;
        let startCy = mount.cy != null ? mount.cy : this.H * 0.48;
        let endX = side === "J" ? this.W * 0.82 : this.W * 0.18;
        let endY = this.H * 0.82;
        let dx = endX - startCx;
        let dy = endY - startCy;
        el.style.transformOrigin = `${startCx}px ${startCy}px`;
        let start = performance.now();
        await new Promise((resolve) => {
            const tick = (now) => {
                if (this.destroyed) return resolve();
                let t = Math.min(1, (now - start) / ms);
                let eased = 1 - Math.pow(1 - t, 3);
                let x = startCx + dx * eased;
                let y = startCy + dy * eased;
                let s = 1 - (1 - scaleEnd) * eased;
                el.style.transform = `translate(${x - startCx}px, ${y - startCy}px) scale(${s})`;
                if (t >= 1) return resolve();
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }

    async _fadeSceneOut() {
        if (!this.sceneRoot) return;
        let ms = Math.max(0, Math.round(this._num("trialFadeMs", 450)));
        if (ms <= 0) return;
        this.sceneRoot.style.transition = `opacity ${ms}ms ease-out`;
        this.sceneRoot.style.opacity = "1";
        void this.sceneRoot.getBoundingClientRect();
        this.sceneRoot.style.opacity = "0";
        await wait(ms + 30);
    }

    async _showBubble(target, text, opts) {
        if (!Interface || !Interface.PartnerSpeechBubble) return;
        if (!target) return;
        opts = opts || {};
        await Interface.PartnerSpeechBubble.show({
            target,
            text,
            context: "map",
            dimOpacity: this.params.tutorialDimOpacity != null ? this.params.tutorialDimOpacity : 0.1,
            buttonLabel: opts.hideButton ? "" : "Continue",
            hideButton: !!opts.hideButton,
            preferredSide: opts.preferredSide || null
        });
    }

    async _runPracticeTutorial() {
        this._placeStartSpaceKey();
        let startTarget = this.startSpaceKey || this.occluder || this.questionEl;
        let bubbleDone = this._showBubble(
            startTarget,
            "Something is hidden here. Press Space when you are ready to start.",
            { hideButton: true, preferredSide: "up" }
        );
        await this._beginTrialReveal();
        await bubbleDone;
        await this._showBubble(
            this.stimulusGroup || this.questionEl,
            "First, name the shape you see."
        );
        await this._runNameQuiz(this.currentTrial);
        await this._transitionPrimeToMorph(this.currentTrial);
        await this._showBubble(
            this.morphGroup || this.stimulusGroup,
            "The picture is now a blurry mix. It will settle into one shape — your job is to identify which shape it becomes. Use F and J to answer."
        );
        await this._showBubble(
            this.barLeft || this.barRight,
            "The bars show how much time is left before the points reach zero."
        );
        await this._showBubble(
            this.pointsEl,
            "Points count down from the start. Faster correct answers leave you with more bonus stars."
        );
    }

    async _runPaidTutorial() {
        this.inputLocked = true;
        await this._showBubble(
            this.questionEl,
            "Each trial starts with a preview photo. Name who you see, then decide which of two Fennimals the morph really shows."
        );
        this._placeStartSpaceKey();
        let startTarget = this.startSpaceKey || this.occluder || this.questionEl;
        let bubbleDone = this._showBubble(
            startTarget,
            "Press Space when you are ready.",
            { hideButton: true, preferredSide: "up" }
        );
        await this._beginTrialReveal();
        await bubbleDone;
        await this._runNameQuiz(this.currentTrial);
        await this._transitionPrimeToMorph(this.currentTrial);
    }

    async _runStandardTrialFlow() {
        await this._beginTrialReveal();
        await this._runNameQuiz(this.currentTrial);
        await this._transitionPrimeToMorph(this.currentTrial);
    }

    async _runTrial(trial) {
        this._clearScene();
        this._pointsFrozen = false;
        this._late = false;
        this.inputLocked = true;
        this._primeNameQuizResult = null;
        this.meshFallbackReason = null;

        this._paintBackdrop();
        this._placePolaroidChrome(trial);
        this._placeQuestion(trial);
        this._placePointsHud(this.params.maxPoints || 100);
        this._placeTimeBars();
        this._placeOccluder();
        this._placeHiddenPrime(trial);
        await this._waitForPaint();

        if (trial.tutorial === "practice") {
            await this._runPracticeTutorial();
        } else if (trial.tutorial === "paid") {
            await this._runPaidTutorial();
        } else {
            await this._runStandardTrialFlow();
        }

        this._startMorphPhase(trial);
        let choice = await this._runMorphUntilResponse(trial);
        this._stopMorph();
        this._handleNoiseAfterChoice();
        this._pointsFrozen = true;
        this._inputStage = null;

        let maxPoints = this.params.maxPoints || 100;
        let T = this.trialSpeedMs;
        let elapsed = choice.response_perf - this._morphStart;
        let rt = Math.round(elapsed);
        let scoreT = Math.min(1, Math.max(0, elapsed) / T);
        let remaining = Math.max(0, Math.round(maxPoints * (1 - scoreT)));
        let late = scoreT >= 1;
        let morphAtClick = this._currentMorphLevel != null ? this._currentMorphLevel : this._morphWeightAt(elapsed, trial);
        this._setPointsDisplay(remaining);
        this._setBarsProgress(scoreT);

        let correct = choice.selected_id === trial.correctId;
        let awarded = 0;
        if (!trial.is_practice) {
            if (correct) {
                awarded = remaining;
                this.sessionPoints += awarded;
            } else {
                awarded = 0;
                this.sessionPoints = Math.max(0, this.sessionPoints - (this.params.incorrectPenalty || 25));
            }
        }

        let spec = this._morphSpec(trial);
        this.answers.push({
            trial_index: this.currentTrialIndex,
            trial_id: trial.id,
            block_index: trial.blockIndex != null ? trial.blockIndex : null,
            kind: trial.kind || (trial.is_practice ? "practice" : null),
            role: trial.role,
            is_practice: !!trial.is_practice,
            question: trial.question,
            fenA_id: trial.fenA ? trial.fenA.id : null,
            fenB_id: trial.fenB ? trial.fenB.id : null,
            fenA_head: trial.fenA ? trial.fenA.head : null,
            fenB_head: trial.fenB ? trial.fenB.head : null,
            target_id: trial.correctId,
            other_id: trial.otherFen ? trial.otherFen.id : null,
            correct_id: trial.correctId,
            selected_id: choice.selected_id,
            selected_side: choice.selected_side || null,
            correct: correct,
            late: late,
            timeout: late,
            reaction_time_ms: rt,
            morph_centerpoint: trial.morphCenterpoint != null ? trial.morphCenterpoint : null,
            noise: trial.noise != null ? trial.noise : 0,
            grayscale: !!trial.grayscale,
            t_mid_ms: Math.round(spec.tMid),
            tau_ms: Math.round(spec.tau),
            morph_level_at_click: Math.round(morphAtClick * 1000) / 1000,
            morph_mode: trial.morph || null,
            morph_renderer: this.activeRenderer,
            mesh_fallback_reason: this.meshFallbackReason,
            mesh_target_diagnostics: this.meshData ? this.meshData.target.diagnostics : null,
            mesh_other_diagnostics: this.meshData ? this.meshData.other.diagnostics : null,
            mesh_triangle_count: this.meshData ? this.meshData.triangles.length : null,
            prime: (trial.prime && trial.prime.log) ? Object.assign({}, trial.prime.log) : null,
            prime_name_quiz: this._primeNameQuizResult ? {
                correct_id: this._primeNameQuizResult.correct_id,
                selected_id: this._primeNameQuizResult.selected_id || null,
                correct: !!this._primeNameQuizResult.correct,
                n_errors: this._primeNameQuizResult.n_errors != null ? this._primeNameQuizResult.n_errors : null,
                reaction_time_ms: this._primeNameQuizResult.reaction_time_ms != null
                    ? this._primeNameQuizResult.reaction_time_ms : null,
                attempts: (this._primeNameQuizResult.attempts || []).slice(),
                presented_options: (this._primeNameQuizResult.presented_options || []).slice(),
                button_order_ids: (this._primeNameQuizResult.button_order_ids || []).slice()
            } : null,
            view: trial.view || null,
            resolve_trial: this.resolveTrial,
            button_sides: this.optionSides ? Object.assign({}, this.optionSides) : null,
            presented_ids: trial.options.map((o) => o.id),
            presented_options: trial.options.map((o) => ({ id: o.id, label: o.label })),
            n_options: trial.options.length,
            points_at_click: remaining,
            points_awarded: awarded,
            session_points_after: this.sessionPoints,
            input_type: choice.input_type,
            trial_speed: this.trialSpeedMs,
            region: "Home",
            location: "Photo room"
        });

        if (typeof AudioCont !== "undefined" && AudioCont.play_sound_effect) {
            AudioCont.play_sound_effect("button_click");
        }

        if (this.resolveTrial) {
            await this._resolveToTruth();
        }
        this._clearIdentityKeys();
        await this._flyPolaroidToSide(choice.selected_side === "right" ? "J" : "F");
        await this._fadeSceneOut();
        this._clearScene();
        if (this.sceneRoot) this.sceneRoot.style.opacity = "1";
    }

    clean_up() {
        this.destroyed = true;
        this._stopMorph();
        this._stopResolveAnim();
        this._stopNoise(true);
        if (this._boundKeyDown) window.removeEventListener("keydown", this._boundKeyDown);
        if (this._boundKeyUp) window.removeEventListener("keyup", this._boundKeyUp);
        if (typeof Interface !== "undefined" && Interface.PartnerSpeechBubble) {
            Interface.PartnerSpeechBubble.hide(true);
        }
        if (this.sceneRoot && this.sceneRoot.parentNode) this.sceneRoot.remove();
        this.sceneRoot = null;
        this.layers = null;
    }
}
