/**
 * Morph task DV (extra-wide two-spot polaroid): one code-drawn polaroid with a
 * shared photo well. Prime (smaller, back-left) starts under a black [?];
 * jumble (larger, front-right) starts under a light-gray [?]. The prime hat
 * is already visible (head still [?]); a radial name quiz (F/J move,
 * Space confirm; keyboard only) identifies prime.name. Correct → head [?]
 * snaps off, pause primeRevealHoldMs, then the jumble [?] fades out over
 * jumbleFadeMs. Identity 2AFC: F/J keycaps show the two
 * jumble parents' hats (prime hat excluded). Polaroid flies to the chosen side.
 * No resolve / no trial-by-trial identity feedback. Caption stays ????.
 *
 * mix: 50 | 55 | 60 | 65 = percent target in the jumble.
 * morphs: ["crossfade"|"mesh"|"silhouette", ...] is a between-subjects pool;
 * one method is assigned per subject and used for every paid trial.
 * Parents are size-normalized from the opaque silhouette, then rotated
 * and translated from the eyes (not scaled from eye spacing).
 * 50% mix: either identity answer is scored correct.
 *
 * Paid prime: { head, hat, name } (Fennimal ids; head/hat default from name).
 * Practice (unless skip_practice): two unpaid shape trials on the same
 * two-spot polaroid (circle prime, square/triangle jumble).
 *
 * A snapshot of the previous developing-photo flow is
 * morph_task_two_stage_development (4_MorphTaskTwoStageDevelopment.js).
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
        this.resolveTrial = false;
        this._ensureTrialList();
        this._assignSubjectMorph();
        this.trialSpecs = this._readTrialSpecs();
        this.nameRoster = this._buildNameRoster();
        this.queue = this._buildTrialQueue();
        this.buttonSides = this._assignButtonSides();
        this.buttonOrderIds = this._assignPrimeNameButtonOrder();
        this.buttonRingSpin = this.buttonRingSpin != null ? this.buttonRingSpin : -Math.PI / 2;

        this.answers = [];
        this.sessionPoints = 0;
        this.phaseProgressDone = 0;
        this.phaseProgressTotal = Math.max(1, this.queue.length);
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
        this.phaseData.resolve_trial = false;
        this.phaseData.assigned_morph = this.assignedMorph || null;
        this.phaseData.morph_method = this.assignedMorph || null;
        this.phaseData.morphs_pool = (this.morphsPool || []).slice();
        this.phaseData.morph_trial_order = this.queue.map((t) => t.id);
        this.phaseData.morph_button_sides = this.buttonSides;
        this.phaseData.morph_prime_button_order = this.buttonOrderIds;
        this.phaseData.morph_names_options = (this.nameRoster || []).map((fen) => fen.id);
        this.phaseData.morph_mix_levels = [50, 55, 60, 65];
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
            raw = this.params.trialSpeedMs != null ? this.params.trialSpeedMs : 5000;
        }
        let ms = Number(raw);
        if (!Number.isFinite(ms) || ms <= 0) {
            this._fail(`trial_speed must be a positive number of milliseconds (got "${this.phaseData.trial_speed}").`);
        }
        return ms;
    }

    _mixWeight(trial) {
        let mix = trial && trial.mix != null ? Number(trial.mix) : 50;
        return Math.max(0, Math.min(1, mix / 100));
    }

    _identityPrompt(trial) {
        if (trial && trial.is_practice) {
            return this.params.identityPromptPractice || "Which shape does this most look like?";
        }
        return this.params.identityPrompt
            || this.params.identityPromptMesh
            || "Who does this most look like? Which is their hat?";
    }

    static morphKinds() {
        return ["crossfade", "mesh", "silhouette"];
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

    // Expand morphs × mixes × pairs × both targets into blocked trial lists.
    // Stimulus blocks define those constants; MorphTask then keeps only the
    // one morph assigned to this subject (between-subjects).
    static buildFactorialTrialBlocks(phase) {
        phase = phase || {};
        let morphs = phase.morphs;
        let mixes = phase.mixes;
        let pairs = phase.pairs;
        if (!Array.isArray(morphs) || morphs.length === 0) {
            throw new Error('morph_task needs morphs: ["crossfade"|"mesh"|"silhouette", ...] when trials is omitted.');
        }
        if (!Array.isArray(mixes) || mixes.length === 0) {
            throw new Error("morph_task needs mixes: [50|55|60|65, ...] when trials is omitted.");
        }
        if (!Array.isArray(pairs) || pairs.length === 0) {
            throw new Error("morph_task needs pairs: [{ prime, fenA, fenB }, ...] when trials is omitted.");
        }
        let allowed = MorphTaskController.morphKinds();
        morphs.forEach((morph, i) => {
            if (allowed.indexOf(morph) < 0) {
                throw new Error(`morph_task morphs[${i}] must be "crossfade" | "mesh" | "silhouette" (got "${morph}").`);
            }
        });
        mixes.forEach((mix, i) => {
            if ([50, 55, 60, 65].indexOf(Number(mix)) < 0) {
                throw new Error(`morph_task mixes[${i}] must be 50, 55, 60, or 65 (got "${mix}").`);
            }
        });
        return morphs.map((morph) => {
            let block = [];
            mixes.forEach((mix) => {
                pairs.forEach((pair, pi) => {
                    if (!pair || !pair.prime || !pair.fenA || !pair.fenB) {
                        throw new Error(`morph_task pairs[${pi}] needs prime, fenA, and fenB.`);
                    }
                    if (pair.fenA === pair.fenB) {
                        throw new Error(`morph_task pairs[${pi}] fenA and fenB must differ.`);
                    }
                    if (pair.prime === pair.fenA || pair.prime === pair.fenB) {
                        throw new Error(`morph_task pairs[${pi}] prime must not be fenA or fenB.`);
                    }
                    [pair.fenA, pair.fenB].forEach((target) => {
                        let distractor = target === pair.fenA ? pair.fenB : pair.fenA;
                        block.push({
                            id: `${morph}_p${pair.prime}_${pair.fenA}-${pair.fenB}_t${target}_m${mix}`,
                            fenA: pair.fenA,
                            fenB: pair.fenB,
                            target,
                            distractor,
                            mix: Number(mix),
                            morph,
                            prime: { head: pair.prime, hat: pair.prime, name: pair.prime }
                        });
                    });
                });
            });
            return block;
        });
    }

    _ensureTrialList() {
        let raw = this.phaseData.trials;
        if (Array.isArray(raw) && raw.length > 0) return;
        this.phaseData.trials = MorphTaskController.buildFactorialTrialBlocks(this.phaseData);
    }

    _morphPool() {
        let allowed = MorphTaskController.morphKinds();
        let listed = this.phaseData.morphs;
        if (Array.isArray(listed) && listed.length) {
            let pool = listed.map((m) => String(m).trim()).filter((m) => allowed.indexOf(m) >= 0);
            pool = pool.filter((m, i) => pool.indexOf(m) === i);
            if (!pool.length) {
                this._fail('morphs must list "crossfade", "mesh", and/or "silhouette".');
            }
            return pool;
        }
        let found = [];
        let walk = (entry) => {
            if (Array.isArray(entry)) entry.forEach(walk);
            else if (entry && entry.morph && allowed.indexOf(entry.morph) >= 0 && found.indexOf(entry.morph) < 0) {
                found.push(entry.morph);
            }
        };
        walk(this.phaseData.trials);
        return found.length ? found : ["crossfade"];
    }

    _assignSubjectMorph() {
        let pool = this._morphPool();
        let key = "morph_assigned_method";
        let existing = this._readRandomization(key);
        let stored = existing && typeof existing === "object" ? existing.morph : existing;
        let assigned = (stored && pool.indexOf(stored) >= 0) ? stored : shuffleArray(pool.slice())[0];
        this.morphsPool = pool;
        this.assignedMorph = assigned;
        this._persistRandomization(key, { morph: assigned, pool: pool.slice() });
        this.phaseData.assigned_morph = assigned;
        this.phaseData.morph_method = assigned;
        this.phaseData.morphs_pool = pool.slice();
        this._filterTrialsToAssignedMorph(assigned);
    }

    _filterTrialsToAssignedMorph(assigned) {
        let raw = this.phaseData.trials;
        if (!Array.isArray(raw) || !raw.length) return;
        const morphOf = (t) => (t && t.morph != null ? String(t.morph) : null);
        let blocked = Array.isArray(raw[0]);
        let stamp = (t) => { if (t) t.morph = assigned; };
        if (blocked) {
            let hasMorph = raw.some((block) => (block || []).some((t) => morphOf(t)));
            if (!hasMorph) {
                raw.forEach((block) => (block || []).forEach(stamp));
                return;
            }
            let filtered = raw
                .map((block) => (block || []).filter((t) => morphOf(t) === assigned))
                .filter((block) => block.length > 0);
            if (!filtered.length) this._fail(`assigned morph "${assigned}" produced no trials.`);
            this.phaseData.trials = filtered;
            return;
        }
        let hasMorph = raw.some((t) => morphOf(t));
        if (!hasMorph) {
            raw.forEach(stamp);
            return;
        }
        let filtered = raw.filter((t) => morphOf(t) === assigned);
        if (!filtered.length) this._fail(`assigned morph "${assigned}" produced no trials.`);
        this.phaseData.trials = filtered;
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
        let mix = Number(spec.mix);
        if ([50, 55, 60, 65].indexOf(mix) < 0) {
            this._fail(`trial "${spec.id}" mix must be 50, 55, 60, or 65 (got "${spec.mix}").`);
        }
        let morph = spec.morph || "crossfade";
        if (MorphTaskController.morphKinds().indexOf(morph) < 0) {
            this._fail(`trial "${spec.id}" morph must be "crossfade" | "mesh" | "silhouette" (got "${morph}").`);
        }
        if (fenA.head === fenB.head) {
            this._fail(`trial "${spec.id}" morph "${morph}" requires fenA and fenB to have different heads (both are "${fenA.head}").`);
        }
        (["A", "B"]).forEach((side) => {
            let fen = side === "A" ? fenA : fenB;
            if (!fen.name) this._fail(`trial "${spec.id}" fen${side} "${fen.id}" is missing a name.`);
            if (!fen.hat) this._fail(`trial "${spec.id}" fen${side} "${fen.id}" is missing a hat.`);
        });
        if (spec.prime === undefined || spec.prime === null) {
            this._fail(`trial "${spec.id}" requires a prime object with name (paid trials).`);
        }
        let prime = this._expandPrimeSpec(spec.prime, spec.id);
        if (prime.nameFen && (prime.nameFen.id === fenA.id || prime.nameFen.id === fenB.id)) {
            this._fail(`trial "${spec.id}" prime.name "${prime.nameFen.id}" must not be fenA or fenB (prime hat is excluded from the 2AFC).`);
        }
        let otherFen = target.id === fenA.id ? fenB : fenA;
        return {
            id: spec.id,
            role: spec.role || spec.id,
            kind: spec.kind || "key",
            fenA,
            fenB,
            requestedHeadA: fenA.head || null,
            requestedHeadB: fenB.head || null,
            targetFen: target,
            otherFen,
            correctId: target.id,
            mix,
            morph,
            view: "closeup",
            grayscale: true,
            prime,
            question: this.params.identityPrompt
                || this.params.identityPromptMesh
                || "Who does this most look like? Which is their hat?",
            options: [
                { id: fenA.id, label: fenA.name, hat: fenA.hat, fen: fenA },
                { id: fenB.id, label: fenB.name, hat: fenB.hat, fen: fenB }
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

    _expandPrimeSpec(raw, trialId) {
        if (typeof raw !== "object" || Array.isArray(raw)) {
            this._fail(`trial "${trialId}" prime must be an object.`);
        }
        let nameId = this._isBlankPrimeToken(raw.name) ? null : String(raw.name).trim();
        if (!nameId) this._fail(`trial "${trialId}" prime.name is required.`);
        let nameFen = this._getFen(nameId, `trial "${trialId}" prime.name`);
        let headId = this._isBlankPrimeToken(raw.head) ? nameId : String(raw.head).trim();
        let hatId = this._isBlankPrimeToken(raw.hat) ? nameId : String(raw.hat).trim();
        let headFen = this._getFen(headId, `trial "${trialId}" prime.head`);
        let hatFen = this._getFen(hatId, `trial "${trialId}" prime.hat`);
        if (!headFen.head) this._fail(`trial "${trialId}" prime.head "${headId}" has no head SVG assigned.`);
        if (!hatFen.hat) this._fail(`trial "${trialId}" prime.hat "${hatId}" has no hat assigned.`);
        if (!nameFen.name) this._fail(`trial "${trialId}" prime.name "${nameId}" is missing a name.`);
        return {
            headFen,
            hatFen,
            nameFen,
            hasHead: true,
            hasHat: true,
            hasBody: false,
            hasToy: false,
            empty: false,
            schemeMode: "grayscale",
            schemeFen: null,
            needsNameQuiz: true,
            trueCaption: String(nameFen.name),
            caption: "????",
            log: {
                head: headId,
                hat: hatId,
                name: nameId,
                caption: "????",
                needs_name_quiz: true
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
        let mix = Math.round(this._num("practiceMix", 80));
        const shapeOpts = () => ([
            { id: "square", label: "Square", shape: "square" },
            { id: "triangle", label: "Triangle", shape: "triangle" }
        ]);
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
                mix,
                morph: "shape",
                view: "closeup",
                grayscale: true,
                question: this.params.identityPromptPractice || "Which shape does this most look like?",
                options: shapeOpts()
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
                mix,
                morph: "shape",
                view: "closeup",
                grayscale: true,
                question: this.params.identityPromptPractice || "Which shape does this most look like?",
                options: shapeOpts()
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

    _schemesForMorphTrial(trial) {
        let gray = this._grayscaleScheme();
        return { target: gray, other: gray };
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
        root.querySelectorAll("g, path, circle, rect, polygon, ellipse, line, polyline").forEach((el) => {
            if (!el || !el.classList) return;
            for (let i = 0; i < el.classList.length; i++) {
                if (skipClass[el.classList[i]]) return;
            }
            let fill = el.getAttribute("fill");
            if (fill == null || fill === "" || fill === "inherit") fill = el.style && el.style.fill;
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
            this.phaseData.assigned_morph = this.assignedMorph || null;
            this.phaseData.morph_method = this.assignedMorph || null;
            this.phaseData.morphs_pool = (this.morphsPool || []).slice();
            this.phaseProgressTotal = Math.max(1, this.queue.length);

            for (let i = 0; i < this.queue.length; i++) {
                if (this.destroyed) return;
                this.currentTrialIndex = i;
                this.currentTrial = this.queue[i];
                this.phaseProgressDone = i;
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
        this.phaseData.assigned_morph = this.assignedMorph || this.phaseData.assigned_morph || null;
        this.phaseData.morph_method = this.assignedMorph || this.phaseData.morph_method || null;
        this.phaseData.morphs_pool = (this.morphsPool || this.phaseData.morphs_pool || []).slice();
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
        this.primeSlotOccluder = null;
        this.jumbleOccluder = null;
        this.primeHeadOccluder = null;
        this.questionEl = null;
        this.questionLabel = null;
        this.pointsEl = null;
        this.pointsDiv = null;
        this.progressEl = null;
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
        this.morphCanvas = null;
        this.meshCanvas = null;
        this.meshData = null;
        this.meshForeignObject = null;
        this.morphPair = null;
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
        let cx = (this.params.polaroidX != null ? this.params.polaroidX : 0.5) * this.W;
        let cy = (this.params.polaroidY != null ? this.params.polaroidY : 0.5) * this.H;
        let polaroidScale = this.params.polaroidScale != null ? this.params.polaroidScale : 0.86;
        let frameW = this._num("polaroidFrameW", 800);
        let frameH = this._num("polaroidFrameH", 740);
        let padX = this._num("polaroidWellPadX", 32);
        let padTop = this._num("polaroidWellPadTop", 36);
        let padBottom = this._num("polaroidWellPadBottom", 118);
        let paperRx = this._num("polaroidPaperRx", 36);
        let wellRx = this._num("polaroidWellRx", 28);
        let paperFill = this.params.polaroidPaperFill || "#f4efe4";
        let wellFill = this.params.polaroidWellFill || "#e2dfd8";
        let rotateDeg = this.params.polaroidRotateDeg != null ? this.params.polaroidRotateDeg : -2.5;

        let x0 = cx - frameW / 2;
        let y0 = cy - frameH / 2;
        let wellBox = {
            x: x0 + padX,
            y: y0 + padTop,
            width: frameW - padX * 2,
            height: frameH - padTop - padBottom,
            rx: String(wellRx),
            ry: String(wellRx)
        };

        let groupTranslate = create_SVG_group(0, 0, "morph_polaroid");
        let groupRotate = create_SVG_group(0, 0);
        let groupScale = create_SVG_group(0, 0);
        groupRotate.appendChild(groupScale);
        groupTranslate.appendChild(groupRotate);
        this.layers.Main.appendChild(groupTranslate);

        let paper = create_SVG_rect(x0, y0, frameW, frameH);
        paper.setAttribute("rx", String(paperRx));
        paper.setAttribute("ry", String(paperRx));
        paper.setAttribute("fill", paperFill);
        paper.setAttribute("stroke", "#d9d2c4");
        paper.setAttribute("stroke-width", "5");
        paper.style.pointerEvents = "none";
        groupScale.appendChild(paper);

        let ns = "http://www.w3.org/2000/svg";
        let defs = document.createElementNS(ns, "defs");
        let clipId = "morph_well_clip_" + String(Date.now());
        let clip = document.createElementNS(ns, "clipPath");
        clip.setAttribute("id", clipId);
        let clipRect = create_SVG_rect(wellBox.x, wellBox.y, wellBox.width, wellBox.height);
        clipRect.setAttribute("rx", wellBox.rx);
        clipRect.setAttribute("ry", wellBox.ry);
        clip.appendChild(clipRect);
        defs.appendChild(clip);
        groupScale.appendChild(defs);

        let wellHost = create_SVG_group(0, 0, "morph_photo_host");
        wellHost.setAttribute("clip-path", `url(#${clipId})`);
        wellHost.style.pointerEvents = "none";
        groupScale.appendChild(wellHost);

        let bgRect = create_SVG_rect(wellBox.x, wellBox.y, wellBox.width, wellBox.height);
        bgRect.setAttribute("rx", wellBox.rx);
        bgRect.setAttribute("ry", wellBox.ry);
        bgRect.setAttribute("fill", wellFill);
        bgRect.style.pointerEvents = "none";
        wellHost.appendChild(bgRect);

        let wellStroke = create_SVG_rect(wellBox.x, wellBox.y, wellBox.width, wellBox.height);
        wellStroke.setAttribute("rx", wellBox.rx);
        wellStroke.setAttribute("ry", wellBox.ry);
        wellStroke.setAttribute("fill", "none");
        wellStroke.setAttribute("stroke", "#cfc6b6");
        wellStroke.setAttribute("stroke-width", "4");
        wellStroke.style.pointerEvents = "none";
        wellStroke.classList.add("polaroid_frame_frame");
        groupScale.appendChild(wellStroke);

        let caption = create_SVG_text_elem(cx, y0 + frameH - padBottom * 0.42, "????", undefined, undefined);
        caption.style.fontFamily = "'Myriad Pro', 'Source Sans 3', sans-serif";
        caption.style.fontSize = "64px";
        caption.style.fontWeight = "700";
        caption.style.fill = this.params.polaroidCaptionFill || "#8a8680";
        caption.style.textAnchor = "middle";
        caption.style.dominantBaseline = "central";
        caption.style.pointerEvents = "none";
        caption.classList.add("polaroid_frame_name");
        groupScale.appendChild(caption);

        groupScale.style.transformOrigin = `${cx}px ${cy}px`;
        groupRotate.style.transformOrigin = `${cx}px ${cy}px`;
        groupScale.style.transform = `scale(${polaroidScale})`;
        groupRotate.style.transform = `rotate(${rotateDeg}deg)`;

        this.photoWellRect = bgRect;
        this.stimulusGroup = groupTranslate;
        this.polaroidMount = {
            groupTranslate, groupRotate, groupScale, cx, cy, scale: polaroidScale,
            bgRect, photoHost: wellHost, framePath: wellStroke, frame: groupScale,
            captionNode: caption, wellBox, clipId
        };
        return this.polaroidMount;
    }

    _mountPolaroidBaseTransform() {
        let m = this.polaroidMount || {};
        if (m.groupScale) m.groupScale.style.transform = `scale(${m.scale != null ? m.scale : 0.78})`;
        if (m.groupRotate) {
            let deg = this.params.polaroidRotateDeg != null ? this.params.polaroidRotateDeg : -2.5;
            m.groupRotate.style.transform = `rotate(${deg}deg)`;
        }
        if (m.groupTranslate) {
            m.groupTranslate.style.transition = "";
            m.groupTranslate.style.transform = "";
            m.groupTranslate.style.opacity = "1";
        }
    }

    _slotFrac(kind) {
        let key = kind === "prime" ? "primeSlot" : "jumbleSlot";
        let d = this.params[key] || (kind === "prime"
            ? { x: 0.02, y: 0.06, w: 0.42, h: 0.70 }
            : { x: 0.20, y: 0.10, w: 0.78, h: 0.88 });
        return d;
    }

    _slotBox(kind) {
        let well = this._photoWellBox();
        if (!well) return null;
        let f = this._slotFrac(kind);
        return {
            x: well.x + well.width * f.x,
            y: well.y + well.height * f.y,
            width: well.width * f.w,
            height: well.height * f.h,
            rx: "18",
            ry: "18"
        };
    }

    _jumbleCanvasBox(slot) {
        let side = Math.min(slot.width * 0.99, slot.height * 0.99);
        let pad = Math.max(4, slot.width * 0.012);
        return {
            side,
            x: slot.x + slot.width - side - pad,
            y: slot.y + (slot.height - side) / 2
        };
    }

    _slotCenterSvg(kind) {
        let slot = this._slotBox(kind);
        let m = this.polaroidMount || {};
        if (!slot || m.cx == null) return { x: this.W * 0.5, y: this.H * 0.48 };
        let lx = slot.x + slot.width / 2;
        let ly = slot.y + slot.height / 2;
        let s = m.scale != null ? m.scale : 1;
        return {
            x: m.cx + (lx - m.cx) * s,
            y: m.cy + (ly - m.cy) * s
        };
    }

    _preparePrimeNode(trial) {
        if (trial && trial.is_practice) return this._buildPracticePrimeIcon(trial);
        if (!trial.prime || trial.prime.empty) return null;
        return this._buildPrimeIcon(trial.prime);
    }

    _placeHiddenPrime(trial) {
        let built = this._preparePrimeNode(trial);
        if (!built || !built.node) return;
        let slot = this._slotBox("prime");
        if (!this._insertInPhotoWell(built.node, this.primeSlotOccluder) && this.polaroidMount && this.polaroidMount.photoHost) {
            this.polaroidMount.photoHost.appendChild(built.node);
        }
        this._fitNodeInBox(built.node, slot, built.widthFrac || 0.92, built.heightFrac || 0.92);
        this._installPrimeHeadOccluder(built.node, trial);
        this.primeGroup = built.node;
    }

    _installPrimeHeadOccluder(icon, trial) {
        if (!icon) return;
        this._clearPrimeHeadOccluder();
        let hat = icon.getElementsByClassName("hat")[0];
        let practiceHead = icon.querySelector(".practice_head");
        if (practiceHead) {
            let box = null;
            try {
                box = practiceHead.getBBox();
            } catch (e) {
                box = null;
            }
            if (!box || !(box.width > 0 && box.height > 0)) {
                box = { x: -90, y: -90, width: 180, height: 180 };
            }
            let pad = Math.max(8, box.width * 0.08);
            let well = {
                x: box.x - pad,
                y: box.y - pad,
                width: box.width + pad * 2,
                height: box.height + pad * 2,
                rx: "18",
                ry: "18"
            };
            let built = this._buildOccluderGroup(well, "morph_prime_head_occluder", { highlight: false });
            if (built.hit) {
                built.hit.style.pointerEvents = "none";
                built.hit.style.cursor = "default";
                built.hit.classList.remove("focus_on_SVG_outline");
            }
            let host = (hat && hat.parentNode) || icon;
            if (hat && hat.parentNode === host) host.insertBefore(built.g, hat);
            else host.appendChild(built.g);
            this.primeHeadOccluder = built.g;
            return;
        }
        let scale = icon.getElementsByClassName("Fennimal_scale_group")[0];
        let headGroup = scale ? scale.firstElementChild : null;
        let headScale = headGroup ? headGroup.firstElementChild : null;
        let headSvg = headScale ? headScale.firstElementChild : null;
        let host = (hat && hat.parentNode) || headScale || icon;
        let box = null;
        try {
            box = (headSvg && headSvg.getBBox) ? headSvg.getBBox() : null;
        } catch (e) {
            box = null;
        }
        if (!box || !(box.width > 0 && box.height > 0)) {
            box = { x: -80, y: -90, width: 160, height: 170 };
        }
        let pad = Math.max(8, box.width * 0.06);
        let well = {
            x: box.x - pad,
            y: box.y - pad,
            width: box.width + pad * 2,
            height: box.height + pad * 2,
            rx: "18",
            ry: "18"
        };
        let built = this._buildOccluderGroup(well, "morph_prime_head_occluder", { highlight: false });
        if (built.hit) {
            built.hit.style.pointerEvents = "none";
            built.hit.style.cursor = "default";
            built.hit.classList.remove("focus_on_SVG_outline");
        }
        if (hat && hat.parentNode === host) host.insertBefore(built.g, hat);
        else host.appendChild(built.g);
        this.primeHeadOccluder = built.g;
    }

    _clearPrimeHeadOccluder() {
        if (this.primeHeadOccluder && this.primeHeadOccluder.parentNode) {
            this.primeHeadOccluder.remove();
        }
        this.primeHeadOccluder = null;
    }

    async _animatePrimeReveal() {
        this._liftPrimeSlotOccluder();
        this._stackForPrimePhase();
        // Practice has no hat to name from, so lift the head [?] before the
        // Circle / Diamond / Star chips appear. Paid trials keep the [?]
        // through the name quiz (the hat is already visible).
        if (this.currentTrial && this.currentTrial.is_practice) {
            this._clearPrimeHeadOccluder();
            await this._waitForPaint();
            await wait(280);
            return;
        }
        this._setPrimeHeadOccluderHighlight(true);
    }

    _setPrimeHeadOccluderHighlight(on) {
        if (!this.primeHeadOccluder) return;
        this.primeHeadOccluder.style.filter = on
            ? (this.params.primeOccluderDropShadow
                || "drop-shadow(0px 0px 4px #ffffff) drop-shadow(0px 2px 12px rgba(255,255,255,0.95))")
            : "none";
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
        bg.setAttribute("fill", this.params.polaroidWellFill || this.params.polaroidPaperFill || "#e2dfd8");
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
        let contourCount = Math.max(12, Math.round(this._num("meshContourPoints", 48)));
        let contour = this._meshRadialContour(pixels, size, center, contourCount, threshold);
        let neck = { x: size * 0.5, y: size * 0.88 };
        let brow = this._meshNearestOpaque(pixels, size, {
            x: eyeMid.x,
            y: eyeMid.y - size * 0.10
        }, threshold);
        let chin = this._meshNearestOpaque(pixels, size, {
            x: mouthCenter.x,
            y: mouthCenter.y * 0.45 + neck.y * 0.55
        }, threshold);
        let points = [];
        points = points.concat(contour);
        points = points.concat(this._meshBoxPoints(null, leftCenter));
        points = points.concat(this._meshBoxPoints(null, rightCenter));
        points = points.concat(this._meshBoxPoints(null, mouthCenter));
        points.push(center);
        points.push(neck);
        points.push(brow);
        points.push(chin);
        return {
            canvas,
            points,
            anchors: {
                leftEye: leftCenter,
                rightEye: rightCenter,
                mouth: mouthCenter,
                neck,
                center
            },
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
            if (trial.morph === "mesh") {
                let saved = trial.morph;
                trial.morph = "crossfade";
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
            tctx.fillStyle = this.params.polaroidWellFill || this.params.polaroidPaperFill || "#e2dfd8";
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
        let nameNode = (this.polaroidMount && this.polaroidMount.captionNode)
            || (frame && frame.getElementsByTagName("text")[0]);
        if (!nameNode) return;
        let caption = question || "????";
        let fill = this.params.polaroidCaptionFill || "#8a8680";
        nameNode.style.display = "inherit";
        nameNode.style.fill = fill;
        nameNode.style.fontWeight = "700";
        nameNode.style.pointerEvents = "none";
        nameNode.textContent = caption;
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
        let host = (this.polaroidMount && this.polaroidMount.photoHost)
            || (this.photoWellRect && this.photoWellRect.parentNode);
        if (!host) return false;
        let before = beforeOverride || null;
        if (!before || before.parentNode !== host) {
            before = (this.jumbleOccluder && this.jumbleOccluder.parentNode === host)
                ? this.jumbleOccluder
                : ((this.primeSlotOccluder && this.primeSlotOccluder.parentNode === host)
                    ? this.primeSlotOccluder
                    : null);
        }
        if (before) host.insertBefore(node, before);
        else host.appendChild(node);
        return true;
    }

    _photoWellHost() {
        return (this.polaroidMount && this.polaroidMount.photoHost)
            || (this.photoWellRect && this.photoWellRect.parentNode)
            || null;
    }

    _stackWellNodes(nodes) {
        let host = this._photoWellHost();
        if (!host) return;
        (nodes || []).forEach((n) => {
            if (n && n.parentNode === host) host.appendChild(n);
        });
    }

    _stackForPrimePhase() {
        this._stackWellNodes([this.morphGroup, this.jumbleOccluder, this.primeGroup]);
    }

    _stackForJumblePhase() {
        this._stackWellNodes([this.primeGroup, this.morphGroup, this.jumbleOccluder]);
    }

    _fitNodeInBox(node, box, wFrac, hFrac, align) {
        if (!node || !box) return;
        let frameBox = box;
        let bbox;
        try {
            bbox = node.getBBox();
        } catch (e) {
            return;
        }
        if (!(bbox.width > 0 && bbox.height > 0)) return;
        let scale = Math.min(
            (frameBox.width * (wFrac != null ? wFrac : 0.92)) / bbox.width,
            (frameBox.height * (hFrac != null ? hFrac : 0.92)) / bbox.height
        );
        if (!Number.isFinite(scale) || scale <= 0) return;
        let cx = bbox.x + bbox.width / 2;
        let cy = bbox.y + bbox.height / 2;
        let pad = Math.max(4, frameBox.width * 0.015);
        let wellCx = (align === "right")
            ? frameBox.x + frameBox.width - pad - (bbox.width * scale) / 2
            : frameBox.x + frameBox.width / 2;
        let wellCy = frameBox.y + frameBox.height / 2;
        node.setAttribute(
            "transform",
            `translate(${wellCx}, ${wellCy}) scale(${scale}) translate(${-cx}, ${-cy})`
        );
    }

    _fitNodeInPhotoWell(node, wFrac, hFrac) {
        this._fitNodeInBox(node, this._photoWellBox(), wFrac, hFrac);
    }

    // ------------------------------------------------------------------
    // Morph stimulus (two stacked renders + ambiguity veil)
    // ------------------------------------------------------------------

    _buildParentIcon(trial, fen, scheme) {
        let display = {
            id: "morph_" + trial.id + "_" + fen.id,
            name: "",
            head: fen.head,
            ColorScheme: { Head: scheme }
        };
        let icon = create_Fennimal_SVG_object_head_only(display, false, false);
        this._prepareFennimalIcon(icon);
        this._applyPartColors(icon, scheme);
        this._applyJumbleComponentGrayscale(icon);
        icon.style.pointerEvents = "none";
        return icon;
    }

    _buildPracticePrimeIcon(trial) {
        let wrap = create_SVG_group(0, 0, "morph_practice_prime");
        let head = this._buildShapeNode(trial.primeShape || "circle");
        head.classList.add("practice_head");
        wrap.appendChild(head);
        wrap.style.pointerEvents = "none";
        return { node: wrap, widthFrac: 0.72, heightFrac: 0.72 };
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
        node.setAttribute("fill", "#6a6a6a");
        node.setAttribute("stroke", "#3a3a3a");
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
        let scheme = this._grayscaleScheme();
        let display = {
            id: "morph_prime_head",
            name: "",
            head: prime.headFen.head,
            hat: prime.hatFen.hat,
            ColorScheme: { Head: scheme }
        };
        let icon = create_Fennimal_SVG_object_head_only(display, false, true);
        this._preparePrimeIcon(icon);
        this._applyPartColors(icon, scheme);
        this._applyFixedGrayscaleAccessories(icon);
        icon.style.pointerEvents = "none";
        return { node: icon, widthFrac: 0.92, heightFrac: 0.92 };
    }

    _buildOccluderGroup(well, className, opts) {
        opts = opts || {};
        let g = create_SVG_group(0, 0, className);
        g.style.pointerEvents = "none";

        let rect = create_SVG_rect(well.x, well.y, well.width, well.height);
        rect.setAttribute("rx", well.rx);
        rect.setAttribute("ry", well.ry);
        rect.setAttribute("fill", opts.fill || this.params.occluderFill || "#3e3a44");
        rect.style.pointerEvents = "none";
        g.appendChild(rect);

        let cx = well.x + well.width / 2;
        let cy = well.y + well.height / 2;
        let qSize = Math.round(Math.min(well.width, well.height) * 0.42);
        let q = create_SVG_text_elem(cx, cy, "?", undefined, undefined);
        q.style.fontSize = qSize + "px";
        q.style.fill = opts.questionFill || this.params.occluderQuestionFill || "#f5f0e6";
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

    _jumbleGrayscaleFilter() {
        return "grayscale(100%)";
    }

    _applyJumbleComponentGrayscale(node) {
        if (!node) return;
        node.style.filter = this._jumbleGrayscaleFilter();
    }

    _grayscaleCanvas(canvas) {
        if (!canvas) return;
        let ctx = canvas.getContext("2d");
        if (!ctx) return;
        try {
            let img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let d = img.data;
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] === 0) continue;
                let g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
                d[i] = g;
                d[i + 1] = g;
                d[i + 2] = g;
            }
            ctx.putImageData(img, 0, 0);
        } catch (e) {
            /* tainted canvas — skip */
        }
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
                this._grayscaleCanvas(canvas);
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
        let contourCount = Math.max(12, Math.round(this._num("meshContourPoints", 48)));
        let contour = this._meshRadialContour(pixels, size, center, contourCount, threshold);

        let points = [];
        points = points.concat(contour);
        points = points.concat(this._meshBoxPoints(leftBox, leftCenter));
        points = points.concat(this._meshBoxPoints(rightBox, rightCenter));
        points = points.concat(this._meshBoxPoints(mouthBox, mouthCenter));
        points.push(center);
        let neck = neckMarker || { x: size * 0.5, y: size * 0.88 };
        points.push(neck);
        let brow = this._meshNearestOpaque(pixels, size, {
            x: eyeMid.x,
            y: eyeMid.y - size * 0.10
        }, threshold);
        let chin = this._meshNearestOpaque(pixels, size, {
            x: mouthCenter.x,
            y: mouthCenter.y * 0.45 + neck.y * 0.55
        }, threshold);
        points.push(brow);
        points.push(chin);

        return {
            canvas,
            points,
            anchors: {
                leftEye: leftCenter,
                rightEye: rightCenter,
                mouth: mouthCenter,
                neck,
                center
            },
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
        return triangles.filter((tri) => {
            if (!(tri[0] < n && tri[1] < n && tri[2] < n)) return false;
            let a = points[tri[0]], b = points[tri[1]], c = points[tri[2]];
            let area = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) * 0.5;
            return area >= 2;
        });
    }

    _ensureScratchCanvas(key, w, h) {
        let c = this[key];
        if (!c || c.width !== w || c.height !== h) {
            c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            this[key] = c;
        }
        return c;
    }

    _opaqueBBox(canvas, threshold) {
        let size = canvas.width;
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        let d = ctx.getImageData(0, 0, size, size).data;
        let minX = size, minY = size, maxX = -1, maxY = -1;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (d[(y * size + x) * 4 + 3] < threshold) continue;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
        if (maxX < minX) {
            return { x: 0, y: 0, width: size, height: size, maxSide: size };
        }
        let width = maxX - minX + 1;
        let height = maxY - minY + 1;
        return { x: minX, y: minY, width, height, maxSide: Math.max(width, height) };
    }

    _sourceEyeMid(src) {
        if (src.anchors && src.anchors.leftEye && src.anchors.rightEye) {
            return {
                x: (src.anchors.leftEye.x + src.anchors.rightEye.x) / 2,
                y: (src.anchors.leftEye.y + src.anchors.rightEye.y) / 2
            };
        }
        let b = this._opaqueBBox(src.canvas, 18);
        return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }

    _sourceEyeAngle(src) {
        if (!src.anchors || !src.anchors.leftEye || !src.anchors.rightEye) return 0;
        return Math.atan2(
            src.anchors.rightEye.y - src.anchors.leftEye.y,
            src.anchors.rightEye.x - src.anchors.leftEye.x
        );
    }

    _sourceExtents(src, threshold) {
        let b = this._opaqueBBox(src.canvas, threshold);
        let e = this._sourceEyeMid(src);
        return {
            size: Math.max(8, b.maxSide),
            up: Math.max(1, e.y - b.y),
            down: Math.max(1, b.y + b.height - e.y),
            left: Math.max(1, e.x - b.x),
            right: Math.max(1, b.x + b.width - e.x),
            eyeMid: e,
            angle: this._sourceEyeAngle(src)
        };
    }

    _meanAngle(a, b) {
        return Math.atan2(Math.sin(a) + Math.sin(b), Math.cos(a) + Math.cos(b));
    }

    // Equal printed size from the opaque silhouette; rotate/translate from the eyes.
    // Face-only similarity was scaling the stocking up to match rocket eye-spacing.
    _chooseMorphFrame(target, other, canvasSize, threshold) {
        let fitFrac = this._num("morphFitFrac", 0.86);
        let pad = Math.max(8, canvasSize * 0.04);
        let extA = this._sourceExtents(target, threshold);
        let extB = this._sourceExtents(other, threshold);
        let destSize = Math.min(
            canvasSize * fitFrac,
            Math.sqrt(extA.size * extB.size) || ((extA.size + extB.size) / 2)
        );
        destSize = Math.max(canvasSize * 0.42, destSize);
        let sA = destSize / extA.size;
        let sB = destSize / extB.size;
        let needUp = Math.max(sA * extA.up, sB * extB.up);
        let needDown = Math.max(sA * extA.down, sB * extB.down);
        let needLeft = Math.max(sA * extA.left, sB * extB.left);
        let needRight = Math.max(sA * extA.right, sB * extB.right);
        let avail = canvasSize - 2 * pad;
        let k = 1;
        if (needUp + needDown > avail) k = Math.min(k, avail / (needUp + needDown));
        if (needLeft + needRight > avail) k = Math.min(k, avail / (needLeft + needRight));
        if (k < 1) {
            sA *= k;
            sB *= k;
            destSize *= k;
            needUp *= k;
            needDown *= k;
            needLeft *= k;
            needRight *= k;
        }
        let needH = needUp + needDown;
        let needW = needLeft + needRight;
        return {
            size: destSize,
            angle: this._meanAngle(extA.angle, extB.angle),
            eyeMid: {
                x: pad + needLeft + (avail - needW) / 2,
                y: pad + needUp + (avail - needH) / 2
            },
            scaleA: sA,
            scaleB: sB
        };
    }

    _alignSourceToFrame(src, frame, scale, threshold) {
        let eyeMid = this._sourceEyeMid(src);
        let srcAngle = this._sourceEyeAngle(src);
        let dAngle = frame.angle - srcAngle;
        let xf = {
            s: scale,
            c: Math.cos(dAngle),
            sn: Math.sin(dAngle),
            tx: 0,
            ty: 0
        };
        xf.tx = frame.eyeMid.x - scale * (xf.c * eyeMid.x - xf.sn * eyeMid.y);
        xf.ty = frame.eyeMid.y - scale * (xf.sn * eyeMid.x + xf.c * eyeMid.y);
        let anchors = {};
        Object.keys(src.anchors || {}).forEach((key) => {
            anchors[key] = this._applySimilarity(src.anchors[key], xf);
        });
        let ext = this._sourceExtents(src, threshold);
        return {
            canvas: this._warpCanvasBySimilarity(src.canvas, xf),
            points: (src.points || []).map((p) => this._applySimilarity(p, xf)),
            anchors,
            diagnostics: Object.assign({}, src.diagnostics || {}, {
                silhouette_max_side: Math.round(ext.size * 10) / 10,
                align_scale: Math.round(scale * 1000) / 1000,
                dest_size: Math.round(frame.size * 10) / 10
            })
        };
    }

    _alignMorphSources(target, other, canvasSize, threshold) {
        let frame = this._chooseMorphFrame(target, other, canvasSize, threshold);
        return {
            target: this._alignSourceToFrame(target, frame, frame.scaleA, threshold),
            other: this._alignSourceToFrame(other, frame, frame.scaleB, threshold),
            frame
        };
    }

    _homologousMeshPoints(src, center, contourCount, innerFrac, threshold) {
        let canvas = src.canvas;
        let size = canvas.width;
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        let pixels = ctx.getImageData(0, 0, size, size).data;
        let contour = this._meshRadialContour(pixels, size, center, contourCount, threshold);
        let ring = innerFrac > 0
            ? contour.map((p) => ({
                x: center.x + (p.x - center.x) * innerFrac,
                y: center.y + (p.y - center.y) * innerFrac
            }))
            : [];
        let a = src.anchors || {};
        let points = contour.concat(ring);
        points.push(a.leftEye || { x: center.x - 24, y: center.y });
        points.push(a.rightEye || { x: center.x + 24, y: center.y });
        points.push(a.mouth || { x: center.x, y: center.y + 28 });
        points.push(a.neck || { x: center.x, y: center.y + 70 });
        points.push(center);
        return points;
    }

    _blurSignedDistance(sdf, size, passes) {
        passes = Math.max(0, Math.round(passes || 0));
        if (!passes) return sdf;
        let src = sdf;
        let dst = new Float32Array(sdf.length);
        for (let p = 0; p < passes; p++) {
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    let acc = 0;
                    let n = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        let yy = y + dy;
                        if (yy < 0 || yy >= size) continue;
                        for (let dx = -1; dx <= 1; dx++) {
                            let xx = x + dx;
                            if (xx < 0 || xx >= size) continue;
                            acc += src[yy * size + xx];
                            n++;
                        }
                    }
                    dst[y * size + x] = acc / n;
                }
            }
            src = dst;
            if (p + 1 < passes) dst = new Float32Array(sdf.length);
        }
        return src;
    }

    _sealAlphaCracks(canvas, passes) {
        passes = Math.max(0, Math.round(passes || 0));
        if (!passes) return;
        let size = canvas.width;
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        let img = ctx.getImageData(0, 0, size, size);
        let p = img.data;
        for (let pass = 0; pass < passes; pass++) {
            let copy = new Uint8ClampedArray(p);
            for (let y = 1; y < size - 1; y++) {
                for (let x = 1; x < size - 1; x++) {
                    let i = (y * size + x) * 4;
                    if (copy[i + 3] >= 12) continue;
                    let n = 0, r = 0, g = 0, b = 0, a = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (!dx && !dy) continue;
                            let j = ((y + dy) * size + (x + dx)) * 4;
                            if (copy[j + 3] < 16) continue;
                            n++;
                            r += copy[j];
                            g += copy[j + 1];
                            b += copy[j + 2];
                            a += copy[j + 3];
                        }
                    }
                    if (n < 4) continue;
                    p[i] = r / n;
                    p[i + 1] = g / n;
                    p[i + 2] = b / n;
                    p[i + 3] = a / n;
                }
            }
        }
        ctx.putImageData(img, 0, 0);
    }

    // 2D similarity (translate + rotate + uniform scale) via least squares.
    _fitSimilarity(fromPts, toPts) {
        let n = Math.min(fromPts.length, toPts.length);
        if (n < 1) return { s: 1, c: 1, sn: 0, tx: 0, ty: 0 };
        let mx = 0, my = 0, nx = 0, ny = 0;
        for (let i = 0; i < n; i++) {
            mx += fromPts[i].x;
            my += fromPts[i].y;
            nx += toPts[i].x;
            ny += toPts[i].y;
        }
        mx /= n;
        my /= n;
        nx /= n;
        ny /= n;
        let a = 0, b = 0, varP = 0;
        for (let i = 0; i < n; i++) {
            let px = fromPts[i].x - mx;
            let py = fromPts[i].y - my;
            let qx = toPts[i].x - nx;
            let qy = toPts[i].y - ny;
            a += px * qx + py * qy;
            b += px * qy - py * qx;
            varP += px * px + py * py;
        }
        if (varP < 1e-8) {
            return { s: 1, c: 1, sn: 0, tx: nx - mx, ty: ny - my };
        }
        let mag = Math.hypot(a, b);
        if (mag < 1e-12) {
            return { s: 1, c: 1, sn: 0, tx: nx - mx, ty: ny - my };
        }
        let s = mag / varP;
        let c = a / mag;
        let sn = b / mag;
        return {
            s,
            c,
            sn,
            tx: nx - s * (c * mx - sn * my),
            ty: ny - s * (sn * mx + c * my)
        };
    }

    _applySimilarity(pt, xf) {
        return {
            x: xf.s * (xf.c * pt.x - xf.sn * pt.y) + xf.tx,
            y: xf.s * (xf.sn * pt.x + xf.c * pt.y) + xf.ty
        };
    }

    _warpCanvasBySimilarity(src, xf) {
        let dst = document.createElement("canvas");
        dst.width = src.width;
        dst.height = src.height;
        let ctx = dst.getContext("2d", { willReadFrequently: true });
        ctx.setTransform(
            xf.s * xf.c,
            xf.s * xf.sn,
            -xf.s * xf.sn,
            xf.s * xf.c,
            xf.tx,
            xf.ty
        );
        ctx.imageSmoothingEnabled = true;
        if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
        ctx.drawImage(src, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        return dst;
    }

    // Premultiplied RGB lerp. At m=.5 the result is unchanged if parents swap.
    _lerpCanvases(a, b, m, dest) {
        let size = dest.width;
        let ctxA = a.getContext("2d", { willReadFrequently: true });
        let ctxB = b.getContext("2d", { willReadFrequently: true });
        let ctxD = dest.getContext("2d", { willReadFrequently: true });
        let da = ctxA.getImageData(0, 0, size, size);
        let db = ctxB.getImageData(0, 0, size, size);
        let out = ctxD.createImageData(size, size);
        let pa = da.data;
        let pb = db.data;
        let po = out.data;
        let wB = m;
        let wA = 1 - m;
        for (let i = 0; i < pa.length; i += 4) {
            let aA = pa[i + 3];
            let aB = pb[i + 3];
            let r = wA * pa[i] * aA + wB * pb[i] * aB;
            let g = wA * pa[i + 1] * aA + wB * pb[i + 1] * aB;
            let bl = wA * pa[i + 2] * aA + wB * pb[i + 2] * aB;
            let alpha = wA * aA + wB * aB;
            if (alpha > 0) {
                po[i] = r / alpha;
                po[i + 1] = g / alpha;
                po[i + 2] = bl / alpha;
            }
            po[i + 3] = alpha;
        }
        ctxD.putImageData(out, 0, 0);
    }

    _edt1d(f) {
        let n = f.length;
        let v = new Int32Array(n);
        let z = new Float64Array(n + 1);
        let d = new Float64Array(n);
        let k = 0;
        v[0] = 0;
        z[0] = -1e20;
        z[1] = 1e20;
        for (let q = 1; q < n; q++) {
            let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
            while (s <= z[k]) {
                k--;
                s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
            }
            k++;
            v[k] = q;
            z[k] = s;
            z[k + 1] = 1e20;
        }
        k = 0;
        for (let q = 0; q < n; q++) {
            while (z[k + 1] < q) k++;
            let p = v[k];
            d[q] = (q - p) * (q - p) + f[p];
        }
        return d;
    }

    _edt2d(seed, size) {
        let d = new Float64Array(seed);
        let row = new Float64Array(size);
        for (let y = 0; y < size; y++) {
            let off = y * size;
            for (let x = 0; x < size; x++) row[x] = d[off + x];
            let dr = this._edt1d(row);
            for (let x = 0; x < size; x++) d[off + x] = dr[x];
        }
        let col = new Float64Array(size);
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) col[y] = d[y * size + x];
            let dc = this._edt1d(col);
            for (let y = 0; y < size; y++) d[y * size + x] = dc[y];
        }
        return d;
    }

    _signedDistanceFromAlpha(canvas, threshold) {
        let size = canvas.width;
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        let pixels = ctx.getImageData(0, 0, size, size).data;
        let n = size * size;
        let inf = 1e12;
        let fOut = new Float64Array(n);
        let fIn = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            let inside = pixels[i * 4 + 3] >= threshold;
            fOut[i] = inside ? inf : 0;
            fIn[i] = inside ? 0 : inf;
        }
        let dOut = this._edt2d(fOut, size);
        let dIn = this._edt2d(fIn, size);
        let sdf = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            sdf[i] = pixels[i * 4 + 3] >= threshold
                ? Math.sqrt(dOut[i])
                : -Math.sqrt(dIn[i]);
        }
        return sdf;
    }

    _meanOpaqueGray(canvases, threshold) {
        let sum = 0;
        let n = 0;
        canvases.forEach((canvas) => {
            let ctx = canvas.getContext("2d", { willReadFrequently: true });
            let d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] < threshold) continue;
                sum += d[i];
                n++;
            }
        });
        let g = n ? Math.round(sum / n) : 160;
        return { r: g, g: g, b: g };
    }

    _meshDrawWarped(ctx, source, sourcePoints, destPoints, triangles, alpha) {
        triangles.forEach((tri) => {
            let s0 = sourcePoints[tri[0]], s1 = sourcePoints[tri[1]], s2 = sourcePoints[tri[2]];
            let d0 = destPoints[tri[0]], d1 = destPoints[tri[1]], d2 = destPoints[tri[2]];
            if (!s0 || !s1 || !s2 || !d0 || !d1 || !d2) return;
            let srcOri = (s1.x - s0.x) * (s2.y - s0.y) - (s1.y - s0.y) * (s2.x - s0.x);
            let dstOri = (d1.x - d0.x) * (d2.y - d0.y) - (d1.y - d0.y) * (d2.x - d0.x);
            if (srcOri * dstOri <= 0) return;
            if (Math.abs(dstOri) < 4) return;
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
            let cx = (d0.x + d1.x + d2.x) / 3;
            let cy = (d0.y + d1.y + d2.y) / 3;
            const bump = (p) => {
                let dx = p.x - cx, dy = p.y - cy;
                let len = Math.hypot(dx, dy) || 1;
                return { x: p.x + dx / len * 0.85, y: p.y + dy / len * 0.85 };
            };
            let c0 = bump(d0), c1 = bump(d1), c2 = bump(d2);

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.beginPath();
            ctx.moveTo(c0.x, c0.y);
            ctx.lineTo(c1.x, c1.y);
            ctx.lineTo(c2.x, c2.y);
            ctx.closePath();
            ctx.clip();
            ctx.globalAlpha = alpha;
            ctx.setTransform(a, b, c, d, e, f);
            ctx.drawImage(source, 0, 0);
            ctx.restore();
        });
    }

    _renderMeshMorph(m) {
        this._renderRefinedMesh(m);
    }

    _renderAlignedCrossfade(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.morphPair || this.meshData;
        if (!dest || !data) return;
        this._lerpCanvases(data.other.canvas, data.target.canvas, m, dest);
    }

    _renderRefinedMesh(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.meshData || this.morphPair;
        if (!dest || !data) return;
        let size = dest.width;
        if (!data.triangles || !data.triangles.length
            || data.other.points.length !== data.target.points.length) {
            this._lerpCanvases(data.other.canvas, data.target.canvas, m, dest);
            return;
        }
        let destPts = data.other.points.map((p, i) => ({
            x: p.x + (data.target.points[i].x - p.x) * m,
            y: p.y + (data.target.points[i].y - p.y) * m
        }));
        let warpA = this._ensureScratchCanvas("_morphWarpA", size, size);
        let warpB = this._ensureScratchCanvas("_morphWarpB", size, size);
        let ctxA = warpA.getContext("2d");
        let ctxB = warpB.getContext("2d");
        [ctxA, ctxB].forEach((ctx) => {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
            ctx.clearRect(0, 0, size, size);
        });
        this._meshDrawWarped(ctxA, data.other.canvas, data.other.points, destPts, data.triangles, 1);
        this._meshDrawWarped(ctxB, data.target.canvas, data.target.points, destPts, data.triangles, 1);
        this._lerpCanvases(warpA, warpB, m, dest);
        this._sealAlphaCracks(dest, 2);
    }

    _renderSilhouetteMorph(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.morphPair || this.meshData;
        if (!dest || !data || !data.other.sdf || !data.target.sdf) {
            this._renderAlignedCrossfade(m);
            return;
        }
        let size = dest.width;
        this._lerpCanvases(data.other.canvas, data.target.canvas, m, dest);
        let ctx = dest.getContext("2d", { willReadFrequently: true });
        let img = ctx.getImageData(0, 0, size, size);
        let p = img.data;
        let sdfA = data.other.sdf;
        let sdfB = data.target.sdf;
        let fill = data.fillGray || { r: 160, g: 160, b: 160 };
        let minLerpA = Math.max(8, Math.round(this._num("silhouetteMinLerpAlpha", 56)));
        let wB = m;
        let wA = 1 - m;
        for (let i = 0, px = 0; i < p.length; i += 4, px++) {
            let sdf = wA * sdfA[px] + wB * sdfB[px];
            let mask = sdf * 0.8 + 0.5;
            if (mask < 0) mask = 0;
            else if (mask > 1) mask = 1;
            if (mask <= 0) {
                p[i + 3] = 0;
                continue;
            }
            if (p[i + 3] < minLerpA) {
                p[i] = fill.r;
                p[i + 1] = fill.g;
                p[i + 2] = fill.b;
            }
            p[i + 3] = Math.round(mask * 255);
        }
        ctx.putImageData(img, 0, 0);
    }

    async _placeRasterMorph(trial, opts) {
        let slot = this._slotBox("jumble") || this._photoWellBox();
        if (!slot || !trial.targetFen || !trial.otherFen) return false;
        let size = Math.max(200, Math.round(this._num("meshRasterSize", 400)));
        let schemes = this._schemesForMorphTrial(trial);
        let kind = trial.morph || "crossfade";
        if (kind !== "crossfade" && kind !== "mesh" && kind !== "silhouette") {
            kind = "crossfade";
        }
        let ns = "http://www.w3.org/2000/svg";
        let foreign = document.createElementNS(ns, "foreignObject");
        let box = this._jumbleCanvasBox(slot);
        foreign.setAttribute("x", String(box.x));
        foreign.setAttribute("y", String(box.y));
        foreign.setAttribute("width", String(box.side));
        foreign.setAttribute("height", String(box.side));
        foreign.style.pointerEvents = "none";
        foreign.style.overflow = "visible";
        let canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        canvas.style.background = "transparent";
        canvas.getContext("2d", { willReadFrequently: true });
        foreign.appendChild(canvas);

        try {
            let raw = await Promise.all([
                this._meshRasterSource(trial.targetFen, schemes.target),
                this._meshRasterSource(trial.otherFen, schemes.other)
            ]);
            let threshold = Math.max(1, Math.min(255, Math.round(this._num("meshAlphaThreshold", 18))));
            let aligned = this._alignMorphSources(raw[0], raw[1], size, threshold);
            let target = aligned.target;
            let other = aligned.other;
            let fillGray = this._meanOpaqueGray([target.canvas, other.canvas], threshold);
            let contourCount = Math.max(12, Math.round(this._num("meshContourPoints", 48)));
            let innerFrac = Math.max(0, Math.min(0.9, this._num("meshInnerRingFrac", 0.55)));
            let center = aligned.frame.eyeMid;
            target.points = this._homologousMeshPoints(target, center, contourCount, innerFrac, threshold);
            other.points = this._homologousMeshPoints(other, center, contourCount, innerFrac, threshold);
            let triangles = null;
            if (kind === "mesh") {
                let average = other.points.map((p, i) => ({
                    x: (p.x + target.points[i].x) / 2,
                    y: (p.y + target.points[i].y) / 2
                }));
                triangles = this._meshDelaunay(average);
                if (!triangles.length) {
                    this.meshFallbackReason = "Delaunay triangulation produced no triangles.";
                    console.warn("MorphTask mesh renderer fell back to crossfade:", this.meshFallbackReason);
                    kind = "crossfade";
                    triangles = null;
                }
            }
            if (kind === "silhouette") {
                let blur = Math.max(0, Math.round(this._num("silhouetteSdfBlur", 1)));
                target.sdf = this._blurSignedDistance(
                    this._signedDistanceFromAlpha(target.canvas, threshold), size, blur
                );
                other.sdf = this._blurSignedDistance(
                    this._signedDistanceFromAlpha(other.canvas, threshold), size, blur
                );
            }
            let pair = {
                size,
                target,
                other,
                triangles,
                fillGray,
                renderer: kind
            };
            this.morphCanvas = canvas;
            this.meshCanvas = canvas;
            this.meshForeignObject = foreign;
            this.morphPair = pair;
            this.meshData = pair;
            this.morphGroup = foreign;
            this.activeRenderer = kind;
            this._applyMorph(this._mixWeight(trial));
            this._insertInPhotoWell(foreign, opts && opts.before ? opts.before : this.jumbleOccluder);
            foreign.style.opacity = "1";
            return true;
        } catch (err) {
            console.warn("MorphTask raster morph failed:", err);
            this.meshFallbackReason = err && err.message ? err.message : String(err);
            if (foreign.parentNode) foreign.remove();
            this.morphCanvas = null;
            this.meshCanvas = null;
            this.meshForeignObject = null;
            this.meshData = null;
            this.morphPair = null;
            this.morphGroup = null;
            this.activeRenderer = null;
            return false;
        }
    }

    // Overlay blend is unfiltered so each parent can be grayed before stacking.
    // Mesh sources are grayed on the raster, then warped/blended.
    _setMorphGroupFilter(extra) {
        if (!this.morphGroup) return;
        this.morphGroup.style.filter = (extra && extra !== "none") ? extra : "none";
    }

    async _placeMorphStimulus(trial, opts) {
        opts = opts || null;
        if (trial && trial.is_practice) {
            this._placePracticeJumble(trial, opts);
            return;
        }
        let mix = this._mixWeight(trial);
        let ready = await this._placeRasterMorph(trial, opts);
        if (!ready) {
            console.warn("MorphTask: could not place jumble morph", trial && trial.id, trial && trial.morph);
            return;
        }
        this._currentMorphLevel = mix;
        if (this.morphGroup) this.morphGroup.style.opacity = "1";
    }

    _placePracticeJumble(trial, opts) {
        let slot = this._slotBox("jumble");
        if (!slot) return false;
        let group = create_SVG_group(0, 0, "morph_stimulus");
        group.style.pointerEvents = "none";
        this.otherIcon = this._buildShapeNode(trial.shapeOther);
        this.targetIcon = this._buildShapeNode(trial.shapeTarget);
        group.appendChild(this.otherIcon);
        group.appendChild(this.targetIcon);
        this.morphGroup = group;
        this.activeRenderer = "shape-crossfade";
        this._insertInPhotoWell(group, opts && opts.before ? opts.before : this.jumbleOccluder);
        this._fitNodeInBox(this.otherIcon, slot, 0.88, 0.86, "right");
        this._fitNodeInBox(this.targetIcon, slot, 0.88, 0.86, "right");
        this._applyMorph(this._mixWeight(trial));
        group.style.opacity = "1";
        this._currentMorphLevel = this._mixWeight(trial);
        return true;
    }

    _applyMorph(m) {
        m = Math.max(0, Math.min(1, m));
        this._currentMorphLevel = m;
        let kind = this.activeRenderer || "crossfade";
        if (kind === "shape-crossfade") {
            if (this.targetIcon) this.targetIcon.style.opacity = String(m);
            if (this.otherIcon) this.otherIcon.style.opacity = String(1 - m);
        } else if (kind === "silhouette") this._renderSilhouetteMorph(m);
        else if (kind === "mesh") this._renderRefinedMesh(m);
        else this._renderAlignedCrossfade(m);
        if (this.morphGroup) this.morphGroup.style.filter = "none";
        if (this.filmRect) this.filmRect.style.opacity = "0";
    }

    // Keyboard-only identity keycaps + radial name-choice chips
    // ------------------------------------------------------------------

    _drawKeyCap(parent, x, y, w, h, style) {
        style = style || {};
        let g = parent;
        let faceFill = style.faceFill || "#f4efe4";
        let lipFill = style.lipFill || "#cfc8b8";
        let faceOpacity = style.faceOpacity != null ? style.faceOpacity : 1;
        let lipOpacity = style.lipOpacity != null ? style.lipOpacity : 1;
        let lip = create_SVG_rect(x - w / 2, y - h / 2 + 5, w, h);
        lip.setAttribute("rx", "16");
        lip.setAttribute("fill", lipFill);
        lip.setAttribute("fill-opacity", String(lipOpacity));
        lip.setAttribute("stroke", "#4b5563");
        lip.setAttribute("stroke-width", "4");
        lip.classList.add("hat_drop_key_lip");
        g.appendChild(lip);
        let face = create_SVG_rect(x - w / 2, y - h / 2 - 2, w, h);
        face.setAttribute("rx", "16");
        face.setAttribute("fill", faceFill);
        face.setAttribute("fill-opacity", String(faceOpacity));
        face.setAttribute("stroke", "#4b5563");
        face.setAttribute("stroke-width", "4");
        face.classList.add("hat_drop_key_face");
        g.appendChild(face);
        g._keyLip = lip;
        g._keyFace = face;
        g._keyFaceRestY = y - h / 2 - 2;
        g._keyLipRestY = y - h / 2 + 5;
        g._keyFaceRestFill = faceFill;
        g._keyLipRestFill = lipFill;
        g._keyFaceRestOpacity = faceOpacity;
        g._keyLipRestOpacity = lipOpacity;
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
        if (handlers.chip) {
            g.style.filter = this.params.nameChipDropShadow
                || "drop-shadow(0px 0px 3px #ffffff) drop-shadow(0px 1px 8px rgba(255,255,255,0.95)) drop-shadow(0px 2px 14px rgba(255,255,255,0.8))";
        }
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
        g._keyFace.setAttribute("fill-opacity", on ? "0.92" : String(g._keyFaceRestOpacity != null ? g._keyFaceRestOpacity : 1));
        if (g._keyLip) {
            g._keyLip.setAttribute("fill", on ? "#e0c46a" : (g._keyLipRestFill || "#cfc8b8"));
            g._keyLip.setAttribute("fill-opacity", on ? "0.92" : String(g._keyLipRestOpacity != null ? g._keyLipRestOpacity : 1));
            g._keyLip.setAttribute("stroke", on ? "#c9a227" : "#4b5563");
        }
        if (g._keyGlyph) {
            let glyphText = g._keyGlyph.tagName === "text"
                ? g._keyGlyph
                : g._keyGlyph.querySelector("text");
            if (glyphText) glyphText.setAttribute("fill", on ? "#5a3e00" : "#1e3a5f");
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
        let radius = n <= 2 ? 200 : this._num("radialRadius", this._num("primeNameRadialRadius", 250));
        let primeCenter = this._slotCenterSvg("prime");
        let cx = primeCenter.x;
        let cy = primeCenter.y;
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
            (this.currentTrial && this.currentTrial.is_practice)
                ? "Each polaroid has two pictures. Name the shape on the left — use F and J to move the highlighted name."
                : "Use F and J to move the highlighted name.",
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
        let resolveQuiz = this._nameQuizResolve;
        this._nameQuizResolve = null;
        if (resolveQuiz) resolveQuiz(result);
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
            leftX: this.W * this._num("identityKeyLeftXFrac", 0.265),
            rightX: this.W * this._num("identityKeyRightXFrac", 0.735),
            centerX: this.W * 0.5,
            w: this._num("identityKeyW", 112),
            h: this._num("identityKeyH", 88)
        };
    }

    _placeIdentityKeys(trial, opts) {
        opts = opts || {};
        let armed = !!opts.armed;
        this._clearIdentityKeys();
        let keyOpts = this._identityOptions(trial);
        let layout = this._identityKeyLayout();
        let group = create_SVG_group(0, 0, "morph_identity_keys");
        this.layers.Plus2.appendChild(group);
        this.identityKeysGroup = group;

        let leftFen = keyOpts.left && (keyOpts.left.fen || this.fensById[keyOpts.left.id]);
        let rightFen = keyOpts.right && (keyOpts.right.fen || this.fensById[keyOpts.right.id]);
        let leftSize = (keyOpts.left && keyOpts.left.shape)
            ? { width: 180, height: 180 }
            : this._identityHatNativeSize(leftFen);
        let rightSize = (keyOpts.right && keyOpts.right.shape)
            ? { width: 180, height: 180 }
            : this._identityHatNativeSize(rightFen);
        let maxW = Math.max(leftSize.width, rightSize.width, 1);
        let maxH = Math.max(leftSize.height, rightSize.height, 1);
        let slotW = this._num("identityHatSlotW", 150);
        let slotH = this._num("identityHatSlotH", 118);
        let hatScale = Math.min(slotW / maxW, slotH / maxH);
        if (!Number.isFinite(hatScale) || hatScale <= 0) hatScale = 1;

        let pad = this._num("identityFieldPad", 16);
        let gap = this._num("identityHatKeyGap", 10);
        let fieldW = Math.max(slotW, layout.w) + pad * 2;
        let fieldH = pad + slotH + gap + layout.h + pad;
        let field = { w: fieldW, h: fieldH, pad, gap, slotW, slotH, hatScale };

        this.identityKeyF = this._placeIdentityChoice(group, layout.leftX, layout.y, layout, "F", keyOpts.left, field);
        this.identityKeyJ = this._placeIdentityChoice(group, layout.rightX, layout.y, layout, "J", keyOpts.right, field);
        this._setIdentityKeysArmed(armed);
    }

    _identityHatNativeSize(fen) {
        let fallback = { width: 80, height: 80 };
        if (!fen || !fen.hat) return fallback;
        let hatId = "hat_" + String(fen.hat).replace(/^hat_/, "");
        let template = document.getElementById(hatId);
        if (!template) return fallback;
        let clone = template.cloneNode(true);
        if (typeof strip_svg_ids_from_subtree === "function") strip_svg_ids_from_subtree(clone);
        clone.style.display = "inherit";
        clone.setAttribute("display", "inline");
        clone.querySelectorAll(".invisible_element, .hat_attachment_point").forEach((el) => {
            el.setAttribute("display", "none");
            el.style.display = "none";
        });
        let host = (this.layers && this.layers.Plus2) || (this.layers && this.layers.Main);
        if (!host) return fallback;
        host.appendChild(clone);
        let b = fallback;
        try { b = clone.getBBox(); } catch (e) { b = fallback; }
        clone.remove();
        if (!(b.width > 0 && b.height > 0)) return fallback;
        return { width: b.width, height: b.height };
    }

    _placeIdentityChoice(parent, cx, cy, layout, letter, option, field) {
        let col = create_SVG_group(0, 0, "morph_identity_choice");
        col.style.pointerEvents = "none";
        parent.appendChild(col);
        let x0 = cx - field.w / 2;
        let y0 = cy - field.h / 2;
        let opacity = this._num("identityFieldOpacity", 0.72);
        let rx = this._num("identityFieldRx", 24);
        let backdrop = create_SVG_rect(x0, y0, field.w, field.h);
        backdrop.setAttribute("rx", String(rx));
        backdrop.setAttribute("ry", String(rx));
        backdrop.setAttribute("fill", "#ffffff");
        backdrop.setAttribute("fill-opacity", String(opacity));
        backdrop.setAttribute("stroke", "#d7d2c8");
        backdrop.setAttribute("stroke-width", "2");
        backdrop.style.pointerEvents = "none";
        col.appendChild(backdrop);

        let hatBox = {
            x: cx - field.slotW / 2,
            y: y0 + field.pad,
            width: field.slotW,
            height: field.slotH
        };
        let fen = option && (option.fen || this.fensById[option.id]);
        if (option && option.shape) this._placeShapeOnKey(col, option.shape, hatBox);
        else if (fen && fen.hat) this._placeHatOnKey(col, fen, hatBox, field.hatScale);

        let keyY = y0 + field.h - field.pad - layout.h / 2;
        let key = this._placeTextKey(cx, keyY, layout.w, layout.h, letter, {
            keyboardOnly: true,
            fontSize: this._num("identityKeyLetterSize", 40)
        });
        col.appendChild(key);
        return key;
    }

    _placeHatOnKey(parent, fen, box, uniformScale) {
        let hatId = "hat_" + String(fen.hat).replace(/^hat_/, "");
        let template = document.getElementById(hatId);
        if (!template || !box) return null;
        let clone = template.cloneNode(true);
        if (typeof strip_svg_ids_from_subtree === "function") strip_svg_ids_from_subtree(clone);
        clone.style.display = "inherit";
        clone.setAttribute("display", "inline");
        clone.style.pointerEvents = "none";
        clone.querySelectorAll(".invisible_element, .hat_attachment_point").forEach((el) => {
            el.setAttribute("display", "none");
            el.style.display = "none";
        });
        let zero = create_SVG_group(0, 0);
        let scaleG = create_SVG_group(0, 0);
        let pos = create_SVG_group(0, 0, "morph_identity_hat");
        pos.style.pointerEvents = "none";
        zero.appendChild(clone);
        scaleG.appendChild(zero);
        pos.appendChild(scaleG);
        parent.appendChild(pos);
        let b = { x: 0, y: 0, width: 80, height: 80 };
        try { b = clone.getBBox(); } catch (e) { /* keep fallback */ }
        if (!(b.width > 0 && b.height > 0)) b = { x: 0, y: 0, width: 80, height: 80 };
        let scale = uniformScale != null
            ? uniformScale
            : Math.min(box.width / b.width, box.height / b.height);
        if (!Number.isFinite(scale) || scale <= 0) scale = 1;
        zero.setAttribute("transform", `translate(${-(b.x + b.width / 2)}, ${-(b.y + b.height / 2)})`);
        scaleG.setAttribute("transform", `scale(${scale})`);
        pos.setAttribute("transform", `translate(${box.x + box.width / 2}, ${box.y + box.height / 2})`);
        return pos;
    }

    _placeShapeOnKey(parent, shape, box) {
        if (!box) return null;
        let node = this._buildShapeNode(shape);
        node.style.pointerEvents = "none";
        parent.appendChild(node);
        let b = { x: -90, y: -90, width: 180, height: 180 };
        try { b = node.getBBox(); } catch (e) { /* keep fallback */ }
        if (!(b.width > 0 && b.height > 0)) b = { x: -90, y: -90, width: 180, height: 180 };
        let scale = Math.min(box.width / b.width, box.height / b.height);
        if (!Number.isFinite(scale) || scale <= 0) scale = 1;
        let cx = b.x + b.width / 2;
        let cy = b.y + b.height / 2;
        node.setAttribute(
            "transform",
            `translate(${box.x + box.width / 2}, ${box.y + box.height / 2}) scale(${scale}) translate(${-cx}, ${-cy})`
        );
        return node;
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
        this._placeSlotOccluders();
    }

    _placeSlotOccluders() {
        this._liftPrimeSlotOccluder();
        this._liftJumbleOccluder();
        let jumbleSlot = this._slotBox("jumble");
        if (!jumbleSlot) this._fail("missing photo slots for occluders.");
        let jumbleBuilt = this._buildOccluderGroup(jumbleSlot, "morph_jumble_occluder", {
            highlight: false,
            fill: this.params.jumbleOccluderFill || "#cfcbc3",
            questionFill: this.params.jumbleOccluderQuestionFill || "#4a4640"
        });
        if (jumbleBuilt.hit) {
            jumbleBuilt.hit.style.pointerEvents = "none";
            jumbleBuilt.hit.style.cursor = "default";
            jumbleBuilt.hit.classList.remove("focus_on_SVG_outline");
        }
        let host = this.polaroidMount && this.polaroidMount.photoHost;
        if (!host) this._fail("missing photo host for occluders.");
        host.appendChild(jumbleBuilt.g);
        this.primeSlotOccluder = null;
        this.jumbleOccluder = jumbleBuilt.g;
        this.occluder = this.jumbleOccluder;
        this.occluderHit = jumbleBuilt.hit;
    }

    _liftPrimeSlotOccluder() {
        if (this.primeSlotOccluder && this.primeSlotOccluder.parentNode) {
            this.primeSlotOccluder.remove();
        }
        this.primeSlotOccluder = null;
        this.occluder = this.jumbleOccluder || null;
        this.occluderHit = null;
    }

    _liftJumbleOccluder() {
        if (this.jumbleOccluder && this.jumbleOccluder.parentNode) {
            this.jumbleOccluder.remove();
        }
        this.jumbleOccluder = null;
    }

    async _beginTrialReveal() {
        await this._animatePrimeReveal();
    }

    async _revealJumble(trial) {
        this._setPrimeHeadOccluderHighlight(false);
        this._clearPrimeHeadOccluder();
        this._keepMysteryCaption(trial);
        if (!this.morphGroup) {
            await this._placeMorphStimulus(trial, { before: this.jumbleOccluder });
        }
        if (this.morphGroup) this.morphGroup.style.opacity = "1";
        await wait(Math.max(0, Math.round(this._num("primeRevealHoldMs", 1000))));
        if (this.destroyed) return;
        this._stackForJumblePhase();
        await this._fadeOutJumbleOccluder();
    }

    async _fadeOutJumbleOccluder() {
        let node = this.jumbleOccluder;
        if (!node) return;
        let ms = Math.max(1, Math.round(this._num("jumbleFadeMs", 1400)));
        node.style.opacity = "1";
        let start = performance.now();
        await new Promise((resolve) => {
            const tick = (now) => {
                if (this.destroyed) return resolve();
                let t = Math.min(1, (now - start) / ms);
                let eased = t < 0.5
                    ? 4 * t * t * t
                    : 1 - Math.pow(-2 * t + 2, 3) / 2;
                node.style.opacity = String(1 - eased);
                if (t >= 1) return resolve();
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
        this._liftJumbleOccluder();
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
        let w = 980;
        let h = 78;
        let x = 0.5 * this.W - w / 2;
        let y = 14;
        let text = (trial && trial.is_practice)
            ? (this.params.primePromptPractice || "What shape is this?")
            : (this.params.primePrompt || "Whose hat is this?");
        let hud = this._placeHudBubble(x, y, w, h, text, "morph_question", 32);
        this.questionEl = hud.group;
        this.questionLabel = hud.label;
        this._questionHud = { x, y, w, h };
    }

    _setQuestionText(text) {
        if (this.questionLabel) this.questionLabel.textContent = text || "";
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

    _placeProgressHud() {
        let h = 78;
        let w = 176;
        let gap = 16;
        let q = this._questionHud || { x: 0.5 * this.W - 490, y: 14, w: 980, h: 78 };
        let x = q.x + q.w + gap;
        let y = q.y;
        let pal = this._bubblePalette();
        let g = create_SVG_group(0, 0, "morph_progress");
        g.style.pointerEvents = "none";

        let rect = create_SVG_rect(x, y, w, h);
        rect.setAttribute("rx", String(pal.radius != null ? pal.radius : 28));
        rect.setAttribute("ry", String(pal.radius != null ? pal.radius : 28));
        rect.setAttribute("fill", pal.fill);
        rect.setAttribute("fill-opacity", String(pal.fillOpacity));
        rect.setAttribute("stroke", pal.stroke);
        rect.setAttribute("stroke-width", String(pal.strokeWidth != null ? pal.strokeWidth : 4));
        g.appendChild(rect);

        let cx = x + w / 2;
        let cy = y + h / 2;
        let r = 26;
        let track = create_SVG_circle(cx, cy, r);
        track.setAttribute("fill", "#d4d4d4");
        g.appendChild(track);

        let t = this.phaseProgressTotal > 0
            ? Math.min(1, Math.max(0, this.phaseProgressDone / this.phaseProgressTotal))
            : 0;
        if (t >= 1) {
            let full = create_SVG_circle(cx, cy, r);
            full.setAttribute("fill", "navy");
            full.style.opacity = "0.7";
            g.appendChild(full);
        } else if (t > 0) {
            let slice = document.createElementNS("http://www.w3.org/2000/svg", "path");
            slice.setAttribute("d", this._pieSlicePath(cx, cy, r, t));
            slice.setAttribute("fill", "navy");
            slice.style.opacity = "0.7";
            g.appendChild(slice);
        }

        this.layers.Plus2.appendChild(g);
        this.progressEl = g;
    }

    _pieSlicePath(cx, cy, r, t) {
        let a = -Math.PI / 2 + t * 2 * Math.PI;
        let px = cx + r * Math.cos(a);
        let py = cy + r * Math.sin(a);
        let large = t > 0.5 ? 1 : 0;
        return "M " + cx + " " + cy +
            " L " + cx + " " + (cy - r) +
            " A " + r + " " + r + " 0 " + large + " 1 " + px + " " + py +
            " Z";
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
        this._setQuestionText(this._identityPrompt(trial));
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
                let scoreT = Math.min(1, elapsed / T);
                this._setBarsProgress(scoreT);
                if (!this._pointsFrozen) {
                    this._setPointsDisplay(maxPoints * (1 - scoreT));
                }
                if (scoreT >= 1 && !this._late) {
                    this._late = true;
                    this._setBarsProgress(1);
                    this._setPointsDisplay(0);
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
        this.inputLocked = true;
        await this._beginTrialReveal();
        await this._runNameQuiz(this.currentTrial);
        await this._revealJumble(this.currentTrial);
        await this._showBubble(
            this.morphGroup || this.stimulusGroup,
            "Now the bigger picture is a mix of two shapes."
        );
    }

    async _showPracticeIdentityBubbles() {
        await this._showBubble(
            this.identityKeyF || this.identityKeysGroup,
            "Use F and J to pick which shape it looks like."
        );
        await this._showBubble(
            this.barLeft || this.barRight,
            "The bars show how much time is left before the points reach zero."
        );
        await this._showBubble(
            this.pointsEl,
            "When the real photos start, faster correct answers leave more bonus stars. These practice rounds do not count."
        );
        await this._showBubble(
            this.barRight || this.barLeft,
            "If the bars run out, you still have to answer — you just will not earn points."
        );
    }

    async _runPaidTutorial() {
        this.inputLocked = true;
        await this._showBubble(
            this.questionEl,
            "Same two steps, now with Fennimals you know. Name who is wearing the hat, then decide which of the two the mix looks like."
        );
        await this._beginTrialReveal();
        await this._runNameQuiz(this.currentTrial);
        await this._revealJumble(this.currentTrial);
    }

    async _showPaidIdentityBubbles() {
        await this._showBubble(
            this.identityKeyF || this.identityKeysGroup,
            "F and J represent two hats. Your task is to select the hat which belongs to which Fennimal is most visible in the blurred part of the photo."
        );
    }

    async _runStandardTrialFlow() {
        await this._beginTrialReveal();
        await this._runNameQuiz(this.currentTrial);
        await this._revealJumble(this.currentTrial);
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
        this._placeProgressHud();
        this._placeTimeBars();
        this._placeOccluder();
        this._placeHiddenPrime(trial);
        await this._waitForPaint();
        try {
            await this._placeMorphStimulus(trial, { before: this.jumbleOccluder });
        } catch (err) {
            console.warn("MorphTask: jumble pre-place failed:", err);
        }
        this._stackForPrimePhase();

        if (trial.tutorial === "practice") {
            await this._runPracticeTutorial();
        } else if (trial.tutorial === "paid") {
            await this._runPaidTutorial();
        } else {
            await this._runStandardTrialFlow();
        }

        this._startMorphPhase(trial);
        if (trial.tutorial === "practice") {
            this.inputLocked = true;
            await this._showPracticeIdentityBubbles();
        } else if (trial.tutorial === "paid") {
            this.inputLocked = true;
            await this._showPaidIdentityBubbles();
        }
        let choice = await this._runMorphUntilResponse(trial);
        this._stopMorph();
        this._pointsFrozen = true;
        this._inputStage = null;

        let maxPoints = this.params.maxPoints || 100;
        let T = this.trialSpeedMs;
        let elapsed = choice.response_perf - this._morphStart;
        let rt = Math.round(elapsed);
        let scoreT = Math.min(1, Math.max(0, elapsed) / T);
        let remaining = Math.max(0, Math.round(maxPoints * (1 - scoreT)));
        let late = scoreT >= 1;
        let mixWeight = this._mixWeight(trial);
        this._setPointsDisplay(remaining);
        this._setBarsProgress(scoreT);

        let correctVsTarget = choice.selected_id === trial.correctId;
        let scoredCorrect = trial.mix === 50 ? true : correctVsTarget;
        let awarded = 0;
        if (!trial.is_practice) {
            if (scoredCorrect) {
                awarded = remaining;
                this.sessionPoints += awarded;
            } else {
                awarded = 0;
                this.sessionPoints = Math.max(0, this.sessionPoints - (this.params.incorrectPenalty || 25));
            }
        }

        this.answers.push({
            trial_index: this.currentTrialIndex,
            trial_id: trial.id,
            block_index: trial.blockIndex != null ? trial.blockIndex : null,
            kind: trial.kind || (trial.is_practice ? "practice" : null),
            role: trial.role,
            is_practice: !!trial.is_practice,
            question: this._identityPrompt(trial),
            fenA_id: trial.fenA ? trial.fenA.id : null,
            fenB_id: trial.fenB ? trial.fenB.id : null,
            fenA_head: trial.fenA ? trial.fenA.head : null,
            fenB_head: trial.fenB ? trial.fenB.head : null,
            target_id: trial.correctId,
            target_head: trial.targetFen ? trial.targetFen.head : (trial.shapeTarget || null),
            other_id: trial.otherFen ? trial.otherFen.id : (trial.shapeOther || null),
            distractor_id: trial.otherFen ? trial.otherFen.id : (trial.shapeOther || null),
            distractor_head: trial.otherFen ? trial.otherFen.head : (trial.shapeOther || null),
            correct_id: trial.correctId,
            selected_id: choice.selected_id,
            selected_side: choice.selected_side || null,
            correct_vs_target: correctVsTarget,
            scored_correct: scoredCorrect,
            correct: scoredCorrect,
            mix: trial.mix,
            mix_weight: mixWeight,
            late: late,
            timeout: late,
            reaction_time_ms: rt,
            grayscale: true,
            morph_level_at_click: Math.round(mixWeight * 1000) / 1000,
            assigned_morph: this.assignedMorph || null,
            morph_mode: trial.morph || null,
            morph_renderer: this.activeRenderer,
            mesh_fallback_reason: this.meshFallbackReason,
            mesh_target_diagnostics: this.meshData ? this.meshData.target.diagnostics : null,
            mesh_other_diagnostics: this.meshData ? this.meshData.other.diagnostics : null,
            mesh_triangle_count: (this.meshData && this.meshData.triangles) ? this.meshData.triangles.length : null,
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
            view: "closeup",
            resolve_trial: false,
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
