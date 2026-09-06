/**
 * Morph task DV (extra-wide two-spot polaroid): one code-drawn polaroid with a
 * shared photo well. Prime (smaller, back-left) starts under a black [?];
 * jumble (larger, front-right) starts under a light-gray [?]. The prime hat
 * is already visible (head still [?]); a radial name quiz (F/J move,
 * Space confirm; keyboard only) identifies prime.name. Correct → head [?]
 * snaps off: the head if show_head_on_prime, else empty space (hat only).
 * Pause primeRevealHoldMs, then the jumble [?] fades out over
 * jumbleFadeMs. Identity 2AFC: F/J keycaps show the two jumble
 * parents (prime excluded). phase.response_key_icons selects the
 * property on those keys: "hats" (default), "heads" (grayscale,
 * as in the archived morph_head_pilot), or "names". Polaroid flies to the chosen side.
 * No resolve / no trial-by-trial identity feedback. Caption stays ????.
 *
 * mix: integer percent target in the jumble (1–99). 50 is the unbiased
 * special case (either identity answer is scored correct).
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
 * A snapshot of the previous developing-photo flow is archived at
 * archive/tasks/morph_two_stage/4_MorphTaskTwoStageDevelopment.js.
 */
class MorphTaskController {
    constructor(parentLayer, phaseData, returnfunc, expCont) {
        this.ParentLayer = parentLayer;
        this.phaseData = phaseData;
        this.returnfunc = returnfunc;
        this.expCont = expCont;
        this.params = (typeof GenParam !== "undefined" && GenParam.MorphTask) || {};
        this.responseKeyIcons = this._resolveResponseKeyIcons();
        this.showHeadOnPrime = this._resolveShowHeadOnPrime();
        this.W = GenParam.SVG_width;
        this.H = GenParam.SVG_height;

        this.fensById = this._indexFennimals(expCont && expCont.stimuli);
        this.trialSpeedMs = this._resolveTrialSpeed();
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
        this.phaseData.morph_mix_levels = this._mixLevels();
        this.phaseData.response_key_icons = this.responseKeyIcons;
        this.phaseData.show_head_on_prime = this.showHeadOnPrime;
        this._assertSinglePaidMorph();
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

    _morphPairProfileKey(headA, headB) {
        return [headA, headB]
            .map((h) => String(h || "").trim().toLowerCase().replace(/^Fennimal_head_/, ""))
            .filter(Boolean)
            .sort()
            .join("|");
    }

    _morphPairProfile(trialOrHeadA, headB) {
        let key;
        if (trialOrHeadA && trialOrHeadA.targetFen && trialOrHeadA.otherFen) {
            key = this._morphPairProfileKey(
                trialOrHeadA.targetFen.head,
                trialOrHeadA.otherFen.head
            );
        } else {
            key = this._morphPairProfileKey(trialOrHeadA, headB);
        }
        let profiles = this.params.morphPairProfiles || {};
        let defaults = this.params.meshShellDefaults || {};
        return Object.assign({}, defaults, profiles[key] || {});
    }

    _displayMixWeight(trial, nominalM) {
        let m = nominalM != null
            ? Math.max(0, Math.min(1, Number(nominalM) || 0))
            : this._mixWeight(trial);
        let kind = this.activeRenderer || (trial && trial.morph);
        if (!trial || (kind !== "mesh_shell" && kind !== "feature_anchored_mesh")) return m;
        let profile = this._morphPairProfile(trial);
        let offset = profile && profile.mixOffset != null ? Number(profile.mixOffset) : 0;
        if (!Number.isFinite(offset)) offset = 0;
        return Math.max(0, Math.min(1, m + offset / 100));
    }

    static meshShellRoleKeys() {
        return ["nose", "ear_left", "ear_right", "crown"];
    }

    static responseKeyIconKinds() {
        return ["hats", "heads", "names"];
    }

    _resolveResponseKeyIcons() {
        let allowed = MorphTaskController.responseKeyIconKinds();
        let raw = this.phaseData && this.phaseData.response_key_icons;
        if (raw === undefined || raw === null || String(raw).trim() === "") {
            raw = this.params.responseKeyIcons;
        }
        if (raw === undefined || raw === null || String(raw).trim() === "") return "hats";
        let mode = String(raw).trim().toLowerCase();
        if (allowed.indexOf(mode) < 0) {
            this._fail(
                `response_key_icons must be "hats" | "heads" | "names" (got "${this.phaseData.response_key_icons}").`
            );
        }
        return mode;
    }

    _resolveShowHeadOnPrime() {
        let raw = this.phaseData && this.phaseData.show_head_on_prime;
        if (raw === undefined || raw === null || raw === "") {
            raw = this.params.showHeadOnPrime;
        }
        if (raw === undefined || raw === null || raw === "") return true;
        if (typeof raw === "boolean") return raw;
        let s = String(raw).trim().toLowerCase();
        if (s === "true" || s === "1" || s === "yes") return true;
        if (s === "false" || s === "0" || s === "no") return false;
        this._fail(`show_head_on_prime must be true or false (got "${this.phaseData.show_head_on_prime}").`);
    }

    _shouldHidePrimeHead(trial) {
        if (!trial || trial.is_practice) return false;
        return this.showHeadOnPrime === false;
    }

    _identityPrompt(trial) {
        if (trial && trial.is_practice) {
            return this.params.identityPromptPractice || "Which shape does this most look like?";
        }
        let mode = this.responseKeyIcons || "hats";
        if (mode === "heads") {
            return this.params.identityPromptHeads || "Who does this most look like? Which is their head?";
        }
        if (mode === "names") {
            return this.params.identityPromptNames || "Who does this most look like?";
        }
        return this.params.identityPrompt
            || this.params.identityPromptMesh
            || "Who does this most look like? Which is their hat?";
    }

    static morphKinds() {
        return ["crossfade", "mesh", "silhouette"];
    }

    // Z-order for compositional head morphing (shell → features → crown).
    static compositeLayerOrder() {
        return ["shell", "eyes", "nose", "mouth", "ear_left", "ear_right", "crown"];
    }

    static compositeCrownRoles() {
        return ["crown", "stem", "handle"];
    }

    static compositeShellOmitMorph() {
        return [
            "nose", "mouth", "ear_left", "ear_right", "crown", "stem", "handle",
            "texture", "bell_clapper"
        ];
    }

    // Standalone path-based feature morphs (compose onto head later).
    static featureMorphRoles() {
        return [
            "nose", "mouth", "eyes", "eye_left", "eye_right",
            "ear_left", "ear_right", "crown"
        ];
    }

    // Percent target in the jumble. Renderer is mix/100; 50 is the unbiased score case.
    static isAllowedMix(raw) {
        let n = Number(raw);
        return Number.isFinite(n) && n === Math.round(n) && n >= 1 && n <= 99;
    }

    // Max stars a subject can earn. morphs[] is between-subjects, so do not
    // multiply by the number of morph methods.
    static countMaxEarnableStars(phase) {
        phase = phase || {};
        let mixes = Array.isArray(phase.mixes) ? phase.mixes : [];
        let pairs = Array.isArray(phase.pairs) ? phase.pairs : [];
        if (mixes.length && pairs.length) {
            return mixes.length * pairs.length * 2;
        }
        const paidCount = (list) => (list || []).filter((t) => t && t.is_practice !== true).length;
        let trials = phase.trials;
        if (!Array.isArray(trials) || !trials.length) return 0;
        if (Array.isArray(trials[0])) {
            let sizes = trials.map((block) => paidCount(block));
            return sizes.length ? Math.max.apply(null, sizes) : 0;
        }
        let byMorph = {};
        trials.forEach((t) => {
            if (!t || t.is_practice) return;
            let m = t.morph != null ? String(t.morph) : "_none";
            byMorph[m] = (byMorph[m] || 0) + 1;
        });
        let keys = Object.keys(byMorph);
        if (!keys.length) return 0;
        return Math.max.apply(null, keys.map((k) => byMorph[k]));
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
            throw new Error("morph_task needs mixes: [integer percents 1–99, ...] when trials is omitted.");
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
            if (!MorphTaskController.isAllowedMix(mix)) {
                throw new Error(`morph_task mixes[${i}] must be an integer percent from 1 to 99 (got "${mix}").`);
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
        let dataCont = this.expCont && this.expCont.dataCont;
        if (dataCont && dataCont.experimentData) {
            dataCont.experimentData.morphAssignment = { morph: assigned, pool: pool.slice() };
        }
        this.phaseData.assigned_morph = assigned;
        this.phaseData.morph_method = assigned;
        this.phaseData.morphs_pool = pool.slice();
        this._filterTrialsToAssignedMorph(assigned);
        console.log(
            `%c MorphTask: assigned "${assigned}" from [${pool.join(", ")}]`,
            "color:#6b4cff;font-weight:bold"
        );
    }

    _mixLevels() {
        if (Array.isArray(this.phaseData.mixes) && this.phaseData.mixes.length) {
            return this.phaseData.mixes.map((m) => Number(m));
        }
        let seen = [];
        (this.trialSpecs || []).forEach((t) => {
            if (!t || t.is_practice) return;
            let mix = Number(t.mix);
            if (MorphTaskController.isAllowedMix(mix) && seen.indexOf(mix) < 0) seen.push(mix);
        });
        return seen;
    }

    _assertSinglePaidMorph() {
        let paid = (this.queue || []).filter((t) => t && !t.is_practice);
        let morphs = [];
        paid.forEach((t) => {
            let m = t.morph != null ? String(t.morph) : null;
            if (m && morphs.indexOf(m) < 0) morphs.push(m);
        });
        if (!paid.length) return;
        if (morphs.length !== 1) {
            this._fail(`paid trials must use one morph method; got [${morphs.join(", ")}].`);
        }
        if (this.assignedMorph && morphs[0] !== this.assignedMorph) {
            this._fail(`paid morph "${morphs[0]}" does not match assigned "${this.assignedMorph}".`);
        }
        console.log(
            `%c MorphTask: ${paid.length} paid trials, morph="${morphs[0]}", mixes=[${this.phaseData.morph_mix_levels.join(", ")}], response_key_icons="${this.responseKeyIcons}", show_head_on_prime=${this.showHeadOnPrime}`,
            "color:#6b4cff;font-weight:bold"
        );
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
        if (!MorphTaskController.isAllowedMix(mix)) {
            this._fail(`trial "${spec.id}" mix must be an integer percent from 1 to 99 (got "${spec.mix}").`);
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
            question: this._identityPrompt({ is_practice: false }),
            options: [
                { id: fenA.id, label: fenA.name, hat: fenA.hat, head: fenA.head, fen: fenA },
                { id: fenB.id, label: fenB.name, hat: fenB.hat, head: fenB.head, fen: fenB }
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
                needs_name_quiz: true,
                show_head_on_prime: this.showHeadOnPrime !== false
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
                sides[trial.id] = pickRandom(trial.options).id;
                changed = true;
            }
        });
        if (changed || !existing) this._persistRandomization(key, { sides });
        return sides;
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

    _stripMorphDecor(root, roles) {
        if (!root || !root.querySelectorAll) return;
        let omit = roles || ["texture"];
        omit.forEach((role) => {
            root.querySelectorAll(`[data-morph="${role}"]`).forEach((el) => el.remove());
        });
    }

    _stripMorphAnnotation(root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll(".morph_lm, .morph_poly, .morph_anchors").forEach((el) => el.remove());
    }

    _hideCompositeSubtree(root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll("path, circle, ellipse, line, polyline, polygon, rect, g").forEach((el) => {
            el.setAttribute("data-composite-hidden", "1");
        });
    }

    _unhideCompositeNode(el) {
        let node = el;
        while (node) {
            node.removeAttribute("data-composite-hidden");
            node = node.parentNode;
        }
        if (el && el.querySelectorAll) {
            el.querySelectorAll("[data-composite-hidden]").forEach((child) => {
                child.removeAttribute("data-composite-hidden");
            });
        }
    }

    _purgeCompositeHidden(root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll("[data-composite-hidden]").forEach((el) => el.remove());
    }

    _keepCompositeSelectors(root, selectors) {
        this._hideCompositeSubtree(root);
        (selectors || []).forEach((selector) => {
            root.querySelectorAll(selector).forEach((el) => this._unhideCompositeNode(el));
        });
        this._purgeCompositeHidden(root);
    }

    _stripForCompositeLayer(root, layer) {
        if (!root) return;
        this._stripHelperMarks(root);
        this._stripMorphAnnotation(root);
        this._stripMorphDecor(root, ["texture"]);

        if (layer === "shell") {
            MorphTaskController.compositeShellOmitMorph().forEach((role) => {
                root.querySelectorAll(`[data-morph="${role}"]`).forEach((el) => el.remove());
            });
            root.querySelectorAll(".eye, .mouth_happy, .mouth_sad, .eyebrow_happy, .eyebrow_sad")
                .forEach((el) => el.remove());
            return;
        }

        const keepByLayer = {
            eyes: [".eye"],
            nose: ['[data-morph="nose"]'],
            mouth: ['[data-morph="mouth"]', ".mouth_happy"],
            ear_left: ['[data-morph="ear_left"]'],
            ear_right: ['[data-morph="ear_right"]'],
            crown: MorphTaskController.compositeCrownRoles().map((role) => `[data-morph="${role}"]`)
        };
        let selectors = keepByLayer[layer];
        if (!selectors || !selectors.length) return;
        this._keepCompositeSelectors(root, selectors);
    }

    async _rasterHeadClone(head, size) {
        let ns = "http://www.w3.org/2000/svg";
        let exportSvg = document.createElementNS(ns, "svg");
        exportSvg.setAttribute("xmlns", ns);
        exportSvg.setAttribute("viewBox", "0 0 400 400");
        exportSvg.setAttribute("width", String(size));
        exportSvg.setAttribute("height", String(size));
        let exportHead = head.cloneNode(true);
        this._stripHelperMarks(exportHead);
        exportSvg.appendChild(exportHead);

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
                reject(new Error("composite layer raster timed out."));
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
                reject(new Error("could not rasterize composite layer."));
            };
            img.src = url;
        });
        return canvas;
    }

    async _compositeLayerRaster(fen, scheme, layer, size) {
        size = size || Math.max(200, Math.round(this._num("meshRasterSize", 400)));
        let head = this._meshHeadClone(fen, scheme);
        let k = size / 400;
        this._stripForCompositeLayer(head, layer);
        let canvas = await this._rasterHeadClone(head, size);
        return { canvas, scale: k };
    }

    async _buildCompositeLayerSet(fen, scheme, size) {
        let layers = MorphTaskController.compositeLayerOrder();
        let compositeLayers = {};
        await Promise.all(layers.map(async (layer) => {
            compositeLayers[layer] = (await this._compositeLayerRaster(fen, scheme, layer, size)).canvas;
        }));
        return compositeLayers;
    }

    _canvasHasOpaque(canvas, threshold) {
        if (!canvas) return false;
        threshold = threshold || Math.max(1, Math.min(255, Math.round(this._num("meshAlphaThreshold", 18))));
        let size = canvas.width;
        let d = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, size, size).data;
        for (let i = 3; i < d.length; i += 4) {
            if (d[i] >= threshold) return true;
        }
        return false;
    }

    _compositeLayerCanvas(src, layer, size) {
        if (src && src.compositeLayers && src.compositeLayers[layer]) {
            return src.compositeLayers[layer];
        }
        let key = "_compositeEmpty_" + layer;
        let c = this._ensureScratchCanvas(key, size, size);
        let ctx = c.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, size, size);
        return c;
    }

    // ------------------------------------------------------------------
    // Path-based feature morphs (build per-feature SVG, compose later)
    // ------------------------------------------------------------------

    _featureSelectorsForRole(role) {
        const map = {
            eyes: [".eye"],
            eye_left: [".eye.eye_left"],
            eye_right: [".eye.eye_right"],
            nose: ['[data-morph="nose"]'],
            mouth: ['[data-morph="mouth"]', ".mouth_happy"],
            ear_left: ['[data-morph="ear_left"]'],
            ear_right: ['[data-morph="ear_right"]'],
            crown: MorphTaskController.compositeCrownRoles().map((r) => `[data-morph="${r}"]`)
        };
        return map[role] || [];
    }

    _featureMeasureSvg() {
        let ns = "http://www.w3.org/2000/svg";
        if (!this._featureMeasureHost) {
            let svg = document.createElementNS(ns, "svg");
            svg.setAttribute("viewBox", "0 0 400 400");
            svg.setAttribute("width", "400");
            svg.setAttribute("height", "400");
            svg.style.position = "fixed";
            svg.style.left = "-10000px";
            svg.style.top = "-10000px";
            svg.style.pointerEvents = "none";
            document.body.appendChild(svg);
            this._featureMeasureHost = svg;
        }
        return this._featureMeasureHost;
    }

    _measureSvgNode(node) {
        let host = this._featureMeasureSvg();
        let ns = "http://www.w3.org/2000/svg";
        while (host.firstChild) host.removeChild(host.firstChild);
        let wrap = document.createElementNS(ns, "g");
        wrap.appendChild(node.cloneNode(true));
        host.appendChild(wrap);
        try {
            let b = wrap.getBBox();
            if (!(b.width > 0 && b.height > 0)) return null;
            return {
                x: b.x, y: b.y, width: b.width, height: b.height,
                cx: b.x + b.width / 2, cy: b.y + b.height / 2,
                maxSide: Math.max(b.width, b.height)
            };
        } catch (e) {
            return null;
        }
    }

    _extractIsolatedFeatureGroup(head, role) {
        let ns = "http://www.w3.org/2000/svg";
        let clone = head.cloneNode(true);
        this._stripHelperMarks(clone);
        this._stripMorphAnnotation(clone);
        this._stripMorphDecor(clone, ["texture"]);
        let selectors = this._featureSelectorsForRole(role);
        if (!selectors.length) return null;
        this._keepCompositeSelectors(clone, selectors);
        let group = document.createElementNS(ns, "g");
        group.setAttribute("class", "feature_morph_paths");
        group.setAttribute("data-morph-role", role);
        while (clone.firstChild) {
            group.appendChild(clone.firstChild);
        }
        if (!group.childNodes.length) return null;
        return group;
    }

    _headEyeSpan(head) {
        let left = this._meshBBox(head.querySelector(".eye.eye_left"));
        let right = this._meshBBox(head.querySelector(".eye.eye_right"));
        if (!left || !right) return 120;
        return Math.max(24, Math.hypot(
            (right.x + right.width / 2) - (left.x + left.width / 2),
            (right.y + right.height / 2) - (left.y + left.height / 2)
        ));
    }

    _headEyeMid(head) {
        let left = this._meshBBox(head.querySelector(".eye.eye_left"));
        let right = this._meshBBox(head.querySelector(".eye.eye_right"));
        if (!left || !right) return { x: 200, y: 200 };
        return {
            x: (left.x + left.width / 2 + right.x + right.width / 2) / 2,
            y: (left.y + left.height / 2 + right.y + right.height / 2) / 2
        };
    }

    _lmPoint(head, key, index) {
        let el = head.querySelector(`.morph_lm[data-morph="${key}"]`);
        if (!el) return null;
        let x = parseFloat(el.getAttribute("cx"));
        let y = parseFloat(el.getAttribute("cy"));
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { x, y };
    }

    _featurePlacement(head, role, group, bbox) {
        let eyeSpan = this._headEyeSpan(head);
        let eyeMid = this._headEyeMid(head);
        let mouth = this._meshMarker(head, ".Fennimal_head_mouth_point");
        let angle = 0;
        let anchor = bbox ? { x: bbox.cx, y: bbox.cy } : { x: eyeMid.x, y: eyeMid.y };
        let span = bbox ? Math.max(16, bbox.maxSide) : eyeSpan * 0.3;

        if (role === "eyes") {
            anchor = eyeMid;
            span = eyeSpan;
            let l = this._meshBBox(head.querySelector(".eye.eye_left"));
            let r = this._meshBBox(head.querySelector(".eye.eye_right"));
            if (l && r) {
                angle = Math.atan2(
                    (r.y + r.height / 2) - (l.y + l.height / 2),
                    (r.x + r.width / 2) - (l.x + l.width / 2)
                );
            }
        } else if (role === "eye_left" || role === "eye_right") {
            let side = role === "eye_left" ? ".eye.eye_left" : ".eye.eye_right";
            let box = this._meshBBox(head.querySelector(side));
            if (box) {
                anchor = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
                span = Math.max(box.width, box.height);
            }
        } else if (role === "mouth" && mouth) {
            anchor = mouth;
            span = eyeSpan * 0.44;
        } else if (role === "nose") {
            let nose = this._lmPoint(head, "nose");
            if (nose) anchor = nose;
            span = eyeSpan * 0.26;
        } else if (role === "ear_left" || role === "ear_right") {
            let side = role === "ear_left" ? "ear_left" : "ear_right";
            let up = this._lmPoint(head, side + "_base_upper");
            let lo = this._lmPoint(head, side + "_base_lower");
            if (up && lo) {
                anchor = { x: (up.x + lo.x) / 2, y: (up.y + lo.y) / 2 };
                span = Math.max(16, Math.hypot(lo.x - up.x, lo.y - up.y) * 2.2);
                angle = Math.atan2(lo.y - up.y, lo.x - up.x) + Math.PI / 2;
            }
        } else if (role === "crown") {
            let brow = this._lmPoint(head, "brow_mid");
            let topL = this._lmPoint(head, "outline_top_left");
            let topR = this._lmPoint(head, "outline_top_right");
            if (brow) anchor = { x: brow.x, y: brow.y - eyeSpan * 0.12 };
            else if (topL && topR) anchor = { x: (topL.x + topR.x) / 2, y: (topL.y + topR.y) / 2 };
            span = Math.max(bbox ? bbox.maxSide : 0, eyeSpan * 0.55);
        }

        return { anchor, span, angle, eyeSpan };
    }

    buildFeatureMorphSpec(fen, scheme, role) {
        let head = this._meshHeadClone(fen, scheme);
        let group = this._extractIsolatedFeatureGroup(head, role);
        if (!group) {
            return { role, head: fen.head, present: false };
        }
        let bbox = this._measureSvgNode(group);
        if (!bbox) {
            return { role, head: fen.head, present: false };
        }
        let placement = this._featurePlacement(head, role, group, bbox);
        return {
            role,
            head: fen.head,
            present: true,
            group,
            bbox,
            anchor: placement.anchor,
            span: placement.span,
            angle: placement.angle,
            eyeSpan: placement.eyeSpan,
            eyeMid: this._headEyeMid(head)
        };
    }

    _placementFromSpec(spec) {
        if (!spec || !spec.present) return null;
        let anchor = spec.anchor;
        if (!anchor || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) {
            anchor = spec.eyeMid || { x: 200, y: 200 };
        }
        return {
            anchor: { x: anchor.x, y: anchor.y },
            span: Math.max(1, Number.isFinite(spec.span) ? spec.span : 40),
            angle: Number.isFinite(spec.angle) ? spec.angle : 0
        };
    }

    _lerpFeaturePlacement(a, b, m) {
        let pa = this._placementFromSpec(a);
        let pb = this._placementFromSpec(b);
        if (!pa && !pb) return null;
        if (!pa) return pb;
        if (!pb) return pa;
        let da = pb.angle - pa.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        return {
            anchor: {
                x: pa.anchor.x + (pb.anchor.x - pa.anchor.x) * m,
                y: pa.anchor.y + (pb.anchor.y - pa.anchor.y) * m
            },
            span: pa.span + (pb.span - pa.span) * m,
            angle: pa.angle + da * m
        };
    }

    _featureShapeWeight(m, side, shapeMode) {
        shapeMode = shapeMode != null ? shapeMode : this._num("featureMorphShapeMode", 0);
        // m = 1 → specA (headA), m = 0 → specB (headB)
        if (shapeMode >= 1.5 && shapeMode < 2.5) return 1;
        if (shapeMode >= 0.5 && shapeMode < 1.5) return side === "a" ? m : (1 - m);
        if (m < 0.5) return side === "b" ? 1 : 0;
        if (m > 0.5) return side === "a" ? 1 : 0;
        return side === "b" ? 1 : 0;
    }

    _samplePathElementPoints(el, samples, closed) {
        if (!el || typeof el.getTotalLength !== "function") return null;
        let len = 0;
        try {
            len = el.getTotalLength();
        } catch (e) {
            return null;
        }
        if (!Number.isFinite(len) || len <= 0) return null;
        let pts = [];
        let count = Math.max(3, samples);
        for (let i = 0; i < count; i++) {
            let t = closed
                ? (i / count)
                : (count > 1 ? i / (count - 1) : 0);
            let pt = el.getPointAtLength(t * len);
            if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;
            pts.push({ x: pt.x, y: pt.y });
        }
        return pts.length >= 3 ? pts : null;
    }

    _sampleGroupPathPoints(group, samples, closed) {
        if (!group) return null;
        let paths = group.querySelectorAll("path");
        if (!paths.length) return null;
        if (paths.length === 1) {
            return this._samplePathElementPoints(paths[0], samples, closed);
        }
        let lengths = [];
        let total = 0;
        for (let i = 0; i < paths.length; i++) {
            let len = 0;
            try {
                len = paths[i].getTotalLength();
            } catch (e) {
                len = 0;
            }
            if (!Number.isFinite(len) || len < 0) len = 0;
            lengths.push(len);
            total += len;
        }
        if (total <= 0) return null;
        let count = Math.max(3, samples);
        let pts = [];
        for (let si = 0; si < count; si++) {
            let target = closed
                ? (si / count) * total
                : (count > 1 ? si / (count - 1) : 0) * total;
            let acc = 0;
            let pushed = false;
            for (let pi = 0; pi < paths.length; pi++) {
                if (acc + lengths[pi] >= target || pi === paths.length - 1) {
                    let local = lengths[pi] > 0 ? (target - acc) / lengths[pi] : 0;
                    local = Math.max(0, Math.min(1, local));
                    let pt;
                    try {
                        pt = paths[pi].getPointAtLength(local * lengths[pi]);
                    } catch (e) {
                        pt = null;
                    }
                    if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
                        pt = pts.length ? pts[pts.length - 1] : { x: 0, y: 0 };
                    }
                    pts.push({ x: pt.x, y: pt.y });
                    pushed = true;
                    break;
                }
                acc += lengths[pi];
            }
            if (!pushed) {
                pts.push(pts.length ? pts[pts.length - 1] : { x: 0, y: 0 });
            }
        }
        return pts.length >= 3 ? pts : null;
    }

    _featureMorphPoly(head, role) {
        if (!head) return null;
        let poly = head.querySelector(`.morph_poly[data-morph="${role}"]`);
        if (!poly && role === "crown") {
            poly = head.querySelector('.morph_poly[data-morph="crown"]');
        }
        return poly;
    }

    _prepareFeatureSampleLoop(points, anchor, closed) {
        if (!points || !points.length) return points;
        let pts = points.map((p) => ({ x: p.x, y: p.y }));
        if (closed) {
            if (anchor) pts = this._rotateBoundaryToAnchor(pts, anchor);
            pts = this._normalizeBoundaryWinding(pts, true);
        } else if (anchor) {
            pts = this._rotateBoundaryToAnchor(pts, anchor);
        }
        return pts;
    }

    _loopMatchCost(a, b) {
        let n = Math.min(a.length, b.length);
        let cost = 0;
        for (let i = 0; i < n; i++) {
            cost += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
        }
        return cost;
    }

    _alignClosedLoops(a, b) {
        if (!a.length || a.length !== b.length) return b;
        let n = a.length;
        let best = b.slice();
        let bestCost = Infinity;
        for (let rev = 0; rev < 2; rev++) {
            let bb = rev ? b.slice().reverse() : b.slice();
            for (let shift = 0; shift < n; shift++) {
                let rotated = bb.slice(shift).concat(bb.slice(0, shift));
                let cost = this._loopMatchCost(a, rotated);
                if (cost < bestCost) {
                    bestCost = cost;
                    best = rotated;
                }
            }
        }
        return best;
    }

    _alignOpenPolylines(a, b) {
        if (!a.length || a.length !== b.length) return b;
        let brev = b.slice().reverse();
        return this._loopMatchCost(a, brev) < this._loopMatchCost(a, b) ? brev : b;
    }

    _smoothPointLoop(points, closed, passes) {
        if (!points || points.length < 3 || passes <= 0) return points;
        let pts = points.map((p) => ({ x: p.x, y: p.y }));
        for (let pass = 0; pass < passes; pass++) {
            let next = [];
            for (let i = 0; i < pts.length; i++) {
                let prev = closed
                    ? pts[(i - 1 + pts.length) % pts.length]
                    : pts[Math.max(0, i - 1)];
                let cur = pts[i];
                let nxt = closed
                    ? pts[(i + 1) % pts.length]
                    : pts[Math.min(pts.length - 1, i + 1)];
                next.push({
                    x: cur.x * 0.5 + (prev.x + nxt.x) * 0.25,
                    y: cur.y * 0.5 + (prev.y + nxt.y) * 0.25
                });
            }
            pts = next;
        }
        return pts;
    }

    _denseFeatureLoop(spec, role, closed, denseCount) {
        if (!spec || !spec.present) return null;
        let head = document.getElementById("Fennimal_head_" + spec.head);
        let preferPoly = this._num("featureMorphPreferPoly", 1) > 0;
        let pts = null;
        if (preferPoly) {
            let poly = this._featureMorphPoly(head, role);
            if (poly) pts = this._samplePathElementPoints(poly, denseCount, closed);
        }
        if (!pts && spec.group) {
            pts = this._sampleGroupPathPoints(spec.group, denseCount, closed);
        }
        return pts;
    }

    _raySegmentDist(orig, dx, dy, p1, p2) {
        let sx = p2.x - p1.x;
        let sy = p2.y - p1.y;
        let denom = dx * sy - dy * sx;
        if (Math.abs(denom) < 1e-9) return 0;
        let t = ((p1.x - orig.x) * sy - (p1.y - orig.y) * sx) / denom;
        let u = ((p1.x - orig.x) * dy - (p1.y - orig.y) * dx) / denom;
        if (t >= 0 && u >= 0 && u <= 1) return t;
        return 0;
    }

    _raycastRadius(points, anchor, angle) {
        if (!points || !points.length || !anchor) return 0;
        let rdx = Math.cos(angle);
        let rdy = Math.sin(angle);
        let maxR = 0;
        let n = points.length;
        for (let i = 0; i < n; i++) {
            let p1 = points[i];
            let p2 = points[(i + 1) % n];
            let r = this._raySegmentDist(anchor, rdx, rdy, p1, p2);
            if (r > maxR) maxR = r;
        }
        return maxR;
    }

    _resamplePolarLoop(densePts, anchor, samples) {
        let pts = [];
        for (let i = 0; i < samples; i++) {
            let angle = (i / samples) * 2 * Math.PI;
            let r = this._raycastRadius(densePts, anchor, angle);
            pts.push({
                x: anchor.x + Math.cos(angle) * r,
                y: anchor.y + Math.sin(angle) * r
            });
        }
        return pts;
    }

    _polarRadiiCanonical(densePts, anchor, angle, span, samples) {
        let polarWorld = this._resamplePolarLoop(densePts, anchor, samples);
        return polarWorld.map((p) => {
            let c = this._pointToCanonical(p, anchor, angle, span);
            return Math.hypot(c.x, c.y);
        });
    }

    _rebuildFromPolarRadii(radii, anchor, angle, span) {
        let pts = [];
        let n = radii.length;
        for (let i = 0; i < n; i++) {
            let theta = (i / n) * 2 * Math.PI;
            let c = {
                x: Math.cos(theta) * radii[i],
                y: Math.sin(theta) * radii[i]
            };
            pts.push(this._pointFromCanonical(c, anchor, angle, span));
        }
        return pts;
    }

    _smoothRadii(radii, passes) {
        if (!radii || radii.length < 3 || passes <= 0) return radii;
        let vals = radii.slice();
        let n = vals.length;
        for (let pass = 0; pass < passes; pass++) {
            let next = [];
            for (let i = 0; i < n; i++) {
                let prev = vals[(i - 1 + n) % n];
                let cur = vals[i];
                let nxt = vals[(i + 1) % n];
                next.push(cur * 0.5 + (prev + nxt) * 0.25);
            }
            vals = next;
        }
        return vals;
    }

    _pairedFeatureSamples(specA, specB, samples, role) {
        let closed = role !== "mouth";
        let srcA = specA.present ? specA : specB;
        let srcB = specB.present ? specB : specA;
        let headA = document.getElementById("Fennimal_head_" + srcA.head);
        let headB = document.getElementById("Fennimal_head_" + srcB.head);
        let placeA = this._placementFromSpec(srcA);
        let placeB = this._placementFromSpec(srcB);
        let preferPoly = this._num("featureMorphPreferPoly", 1) > 0;
        let ptsA = null;
        let ptsB = null;
        let homologous = false;

        if (preferPoly) {
            let polyA = this._featureMorphPoly(headA, role);
            let polyB = this._featureMorphPoly(headB, role);
            if (polyA && polyB) {
                ptsA = this._samplePathElementPoints(polyA, samples, closed);
                ptsB = this._samplePathElementPoints(polyB, samples, closed);
                homologous = !!(ptsA && ptsB);
            }
        }

        if (!ptsA && srcA.present) {
            ptsA = this._sampleGroupPathPoints(srcA.group, samples, closed);
        }
        if (!ptsB && srcB.present) {
            ptsB = this._sampleGroupPathPoints(srcB.group, samples, closed);
        }

        if (!ptsA && !ptsB) return null;
        if (!ptsA) ptsA = ptsB.slice();
        if (!ptsB) ptsB = ptsA.slice();

        let n = Math.min(ptsA.length, ptsB.length, samples);
        ptsA = ptsA.slice(0, n);
        ptsB = ptsB.slice(0, n);

        if (placeA && placeA.anchor) {
            ptsA = this._prepareFeatureSampleLoop(ptsA, placeA.anchor, closed);
        }
        if (placeB && placeB.anchor) {
            ptsB = this._prepareFeatureSampleLoop(ptsB, placeB.anchor, closed);
        }

        return { ptsA, ptsB, closed, homologous };
    }

    _featureWorldSamples(spec, samples, closed) {
        if (!spec || !spec.present) return null;
        closed = closed !== false && spec.role !== "mouth";
        let fromGroup = this._sampleGroupPathPoints(spec.group, samples, closed);
        if (fromGroup) return fromGroup;
        let head = document.getElementById("Fennimal_head_" + spec.head);
        let poly = this._featureMorphPoly(head, spec.role);
        if (poly) return this._samplePathElementPoints(poly, samples, closed);
        return null;
    }

    _pointToCanonical(p, anchor, angle, span) {
        if (!p || !anchor) return { x: 0, y: 0 };
        let dx = p.x - anchor.x;
        let dy = p.y - anchor.y;
        let cos = Math.cos(-angle);
        let sin = Math.sin(-angle);
        let rx = dx * cos - dy * sin;
        let ry = dx * sin + dy * cos;
        let s = Math.max(1, span);
        return { x: rx / s, y: ry / s };
    }

    _pointFromCanonical(p, anchor, angle, span) {
        if (!p || !anchor) return { x: 200, y: 200 };
        let s = Math.max(1, span);
        let sx = p.x * s;
        let sy = p.y * s;
        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        return {
            x: anchor.x + sx * cos - sy * sin,
            y: anchor.y + sx * sin + sy * cos
        };
    }

    _lerpPoints(a, b, m) {
        return a.map((p, i) => {
            let q = b[i];
            if (!p || !q) return p || q || { x: 0, y: 0 };
            return {
                x: p.x + (q.x - p.x) * m,
                y: p.y + (q.y - p.y) * m
            };
        });
    }

    _pointsToPathD(points, closed) {
        if (!points || points.length < 2) return "";
        if (points.length === 2) {
            return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
        }
        let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
        let n = points.length;
        for (let i = 0; i < n; i++) {
            let p0 = points[(i - 1 + n) % n];
            let p1 = points[i];
            let p2 = points[(i + 1) % n];
            let p3 = points[(i + 2) % n];
            if (!closed) {
                if (i === 0) continue;
                if (i >= n - 1) {
                    d += ` L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
                    break;
                }
                p0 = points[Math.max(0, i - 1)];
                p3 = points[Math.min(n - 1, i + 2)];
            }
            let cp1x = p1.x + (p2.x - p0.x) / 6;
            let cp1y = p1.y + (p2.y - p0.y) / 6;
            let cp2x = p2.x - (p3.x - p1.x) / 6;
            let cp2y = p2.y - (p3.y - p1.y) / 6;
            d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
            if (!closed && i >= n - 2) break;
        }
        if (closed) d += " Z";
        return d;
    }

    _headWorldToView(p, morphed, viewCenter, frame) {
        if (frame === "head") return p;
        return {
            x: p.x - morphed.anchor.x + viewCenter.x,
            y: p.y - morphed.anchor.y + viewCenter.y
        };
    }

    _featurePathStyle(spec, weight) {
        let fill = "#8e8e8e";
        let stroke = "#1f2a33";
        let strokeWidth = "3";
        if (spec && spec.group) {
            let path = spec.group.querySelector("path");
            if (path) {
                if (path.getAttribute("fill") && path.getAttribute("fill") !== "none") {
                    fill = path.getAttribute("fill");
                }
                if (path.getAttribute("stroke")) stroke = path.getAttribute("stroke");
                if (path.getAttribute("stroke-width")) strokeWidth = path.getAttribute("stroke-width");
            }
        }
        return { fill, stroke, strokeWidth, opacity: Math.max(0, Math.min(1, weight)) };
    }

    _appendGeometryMorphLayer(svg, specA, specB, m, morphed, viewCenter, frame, role) {
        let ns = "http://www.w3.org/2000/svg";
        let samples = Math.max(12, Math.round(this._num("featureMorphPathSamples", 48)));
        let smoothPasses = Math.max(0, Math.round(this._num("featureMorphSmoothPasses", 2)));
        let srcA = specA.present ? specA : specB;
        let srcB = specB.present ? specB : specA;
        let placeA = this._placementFromSpec(srcA);
        let placeB = this._placementFromSpec(srcB);
        if (!placeA || !placeB || !morphed || !morphed.anchor) return false;

        let closed = role !== "mouth";
        let useRadial = closed && this._num("featureMorphUseRadial", 1) > 0;
        let viewPts = null;

        if (useRadial) {
            let denseN = Math.max(samples * 3, 96);
            let denseA = specA.present
                ? this._denseFeatureLoop(specA, role, closed, denseN)
                : null;
            let denseB = specB.present
                ? this._denseFeatureLoop(specB, role, closed, denseN)
                : null;
            if (!denseA && !denseB) return false;
            if (!denseA) denseA = denseB.slice();
            if (!denseB) denseB = denseA.slice();

            let radA = specA.present
                ? this._polarRadiiCanonical(
                    denseA, placeA.anchor, placeA.angle, placeA.span, samples
                )
                : new Array(samples).fill(0);
            let radB = specB.present
                ? this._polarRadiiCanonical(
                    denseB, placeB.anchor, placeB.angle, placeB.span, samples
                )
                : new Array(samples).fill(0);
            let radM = radA.map((r, i) => r * (1 - m) + radB[i] * m);
            radM = this._smoothRadii(radM, smoothPasses);
            let worldM = this._rebuildFromPolarRadii(
                radM, morphed.anchor, morphed.angle, morphed.span
            );
            viewPts = worldM.map((p) => this._headWorldToView(p, morphed, viewCenter, frame));
        } else {
            let paired = this._pairedFeatureSamples(specA, specB, samples, role);
            if (!paired || !paired.ptsA.length) return false;
            let ptsA = paired.ptsA;
            let ptsB = paired.ptsB;
            closed = paired.closed;

            let canonA = ptsA.map((p) => this._pointToCanonical(
                p, placeA.anchor, placeA.angle, placeA.span
            ));
            let canonB = ptsB.map((p) => this._pointToCanonical(
                p, placeB.anchor, placeB.angle, placeB.span
            ));
            if (closed) {
                canonB = this._alignClosedLoops(canonA, canonB);
            } else {
                canonB = this._alignOpenPolylines(canonA, canonB);
            }
            let canonM = this._lerpPoints(canonA, canonB, m);
            canonM = this._smoothPointLoop(canonM, closed, smoothPasses);
            let worldM = canonM.map((p) => this._pointFromCanonical(
                p, morphed.anchor, morphed.angle, morphed.span
            ));
            viewPts = worldM.map((p) => this._headWorldToView(p, morphed, viewCenter, frame));
        }

        if (!viewPts || !viewPts.length) return false;

        let path = document.createElementNS(ns, "path");
        path.setAttribute("d", this._pointsToPathD(viewPts, closed));
        path.setAttribute("class", "feature_morph_geometry");
        let styleA = this._featurePathStyle(srcA, 1);
        let styleB = this._featurePathStyle(srcB, 1);
        path.setAttribute("fill", m < 0.5 ? styleB.fill : styleA.fill);
        path.setAttribute("stroke", m < 0.5 ? styleB.stroke : styleA.stroke);
        path.setAttribute("stroke-width", styleA.strokeWidth);
        path.setAttribute("stroke-linejoin", "round");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("vector-effect", "non-scaling-stroke");
        path.setAttribute("opacity", "0.95");
        svg.appendChild(path);
        return true;
    }

    _lerpFeatureEyeMid(specA, specB, m) {
        let a = (specA.present && specA.eyeMid) || (specA.present && specA.anchor);
        let b = (specB.present && specB.eyeMid) || (specB.present && specB.anchor);
        if (!a && !b) return { x: 200, y: 200 };
        if (!a) return { x: b.x, y: b.y };
        if (!b) return { x: a.x, y: a.y };
        return { x: a.x + (b.x - a.x) * m, y: a.y + (b.y - a.y) * m };
    }

    _featurePlacementTransform(spec, morphed, viewCenter) {
        let place = this._placementFromSpec(spec);
        if (!place || !morphed || !morphed.anchor) return "";
        let ax = place.anchor.x;
        let ay = place.anchor.y;
        let scale = morphed.span / Math.max(1, place.span);
        let rot = (morphed.angle - place.angle) * 180 / Math.PI;
        return [
            `translate(${viewCenter.x} ${viewCenter.y})`,
            `rotate(${rot.toFixed(4)})`,
            `scale(${scale.toFixed(6)})`,
            `translate(${(-ax).toFixed(3)} ${(-ay).toFixed(3)})`
        ].join(" ");
    }

    _shellOutlinePath(head) {
        let poly = head.querySelector('.morph_poly[data-morph="head_shell"]');
        if (!poly || typeof poly.getTotalLength !== "function") return null;
        let len = poly.getTotalLength();
        if (!Number.isFinite(len) || len <= 0) return null;
        let samples = Math.max(12, Math.round(this._num("meshRegionPolySamples", 32)));
        let pts = [];
        for (let i = 0; i < samples; i++) {
            let pt = poly.getPointAtLength((i / samples) * len);
            pts.push({ x: pt.x, y: pt.y });
        }
        if (!pts.length) return null;
        let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
        for (let i = 1; i < pts.length; i++) {
            d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
        }
        return d + " Z";
    }

    _morphedShellPathD(specA, specB, m) {
        let headA = document.getElementById("Fennimal_head_" + specA.head);
        let headB = document.getElementById("Fennimal_head_" + specB.head);
        if (!headA || !headB) return null;
        let polyA = headA.querySelector('.morph_poly[data-morph="head_shell"]');
        let polyB = headB.querySelector('.morph_poly[data-morph="head_shell"]');
        if (!polyA || !polyB) return null;
        let samples = Math.max(12, Math.round(this._num("meshRegionPolySamples", 32)));
        let ptsA = [];
        let ptsB = [];
        try {
            let lenA = polyA.getTotalLength();
            let lenB = polyB.getTotalLength();
            for (let i = 0; i < samples; i++) {
                let t = i / samples;
                ptsA.push(polyA.getPointAtLength(t * lenA));
                ptsB.push(polyB.getPointAtLength(t * lenB));
            }
        } catch (e) {
            return null;
        }
        if (ptsA.length !== ptsB.length || !ptsA.length) return null;
        let pts = ptsA.map((p, i) => ({
            x: p.x + (ptsB[i].x - p.x) * m,
            y: p.y + (ptsB[i].y - p.y) * m
        }));
        let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
        for (let i = 1; i < pts.length; i++) {
            d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
        }
        return d + " Z";
    }

    /**
     * Build morphed feature as live SVG (vector paths). mix 0 = specA, 1 = specB.
     * opts.frame: "isolated" (default) | "head"
     * opts.showShell: faint head outline for spatial context
     */
    renderFeatureMorphSvg(specA, specB, mix, opts) {
        opts = opts || {};
        let m = Math.max(0, Math.min(1, Number(mix) || 0));
        let ns = "http://www.w3.org/2000/svg";
        let frame = opts.frame || "isolated";
        let size = frame === "head" ? 400 : 200;
        let viewCenter = frame === "head"
            ? { x: 200, y: 200 }
            : { x: size / 2, y: size / 2 };

        let svg = document.createElementNS(ns, "svg");
        svg.setAttribute("xmlns", ns);
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
        svg.setAttribute("width", String(size));
        svg.setAttribute("height", String(size));
        svg.setAttribute("class", "feature_morph_svg");

        if (!specA.present && !specB.present) return svg;

        let morphed = this._lerpFeaturePlacement(specA, specB, m);
        if (!morphed) return svg;

        if (opts.showShell) {
            let shellD = this._morphedShellPathD(
                specA.present ? specA : specB,
                specB.present ? specB : specA,
                m
            );
            if (shellD) {
                let shell = document.createElementNS(ns, "path");
                shell.setAttribute("d", shellD);
                shell.setAttribute("fill", "none");
                shell.setAttribute("stroke", "#9aa3ad");
                shell.setAttribute("stroke-width", frame === "head" ? "2.5" : "1.5");
                shell.setAttribute("stroke-dasharray", "6 5");
                shell.setAttribute("opacity", "0.55");
                shell.setAttribute("class", "feature_morph_shell");
                if (frame === "isolated") {
                    let shellMid = this._lerpFeatureEyeMid(specA, specB, m);
                    shell.setAttribute("transform", [
                        `translate(${viewCenter.x} ${viewCenter.y})`,
                        `translate(${(-shellMid.x).toFixed(2)} ${(-shellMid.y).toFixed(2)})`
                    ].join(" "));
                }
                svg.appendChild(shell);
            }
        }

        let shapeMode = opts.shapeMode != null ? opts.shapeMode : this._num("featureMorphShapeMode", 0);
        let dualOutline = shapeMode >= 1.5 && shapeMode < 2.5;
        let geometryMode = shapeMode >= 2.5;

        if (geometryMode) {
            let role = (specA.present && specA.role) ? specA.role : specB.role;
            if (!this._appendGeometryMorphLayer(
                svg, specA, specB, m, morphed, viewCenter, frame, role
            )) {
                geometryMode = false;
            }
        }

        if (!geometryMode) {
        ["a", "b"].forEach((side) => {
            let spec = side === "a" ? specA : specB;
            if (!spec || !spec.present) return;
            let weight = this._featureShapeWeight(m, side, shapeMode);
            if (weight <= 0.001 && !dualOutline) return;

            let layer = document.createElementNS(ns, "g");
            layer.setAttribute("class", "feature_morph_layer feature_morph_layer_" + side);
            layer.setAttribute("data-source-head", spec.head);
            layer.setAttribute("transform", this._featurePlacementTransform(spec, morphed, viewCenter));

            let shape = spec.group.cloneNode(true);
            if (dualOutline) {
                shape.querySelectorAll("path, circle, ellipse, line, polyline, polygon").forEach((el) => {
                    el.setAttribute("fill", "none");
                    el.setAttribute("stroke", side === "a" ? "#5a6f86" : "#2f6b4f");
                    el.setAttribute("stroke-width", "2.5");
                });
                layer.setAttribute("opacity", "0.9");
            } else {
                layer.setAttribute("opacity", String(Math.max(0, Math.min(1, weight))));
            }
            layer.appendChild(shape);
            svg.appendChild(layer);
        });
        }

        let marker = document.createElementNS(ns, "circle");
        marker.setAttribute("cx", String(viewCenter.x));
        marker.setAttribute("cy", String(viewCenter.y));
        marker.setAttribute("r", "2.5");
        marker.setAttribute("fill", "#c45c26");
        marker.setAttribute("opacity", "0.65");
        marker.setAttribute("class", "feature_morph_anchor");
        if (this._num("featureMorphShowAnchor", 1) > 0) {
            svg.appendChild(marker);
        }

        return svg;
    }

    renderFeatureMorphForPair(headA, headB, role, mixPercent, targetHead, opts) {
        let m = Math.max(0, Math.min(1, (Number(mixPercent) || 0) / 100));
        let targetIsA = targetHead === headA;
        if (!targetIsA) m = 1 - m;

        let trial = {
            targetFen: { id: headA, head: headA },
            otherFen: { id: headB, head: headB }
        };
        let schemes = this._schemesForMorphTrial(trial);
        let specA = this.buildFeatureMorphSpec(trial.targetFen, schemes.target, role);
        let specB = this.buildFeatureMorphSpec(trial.otherFen, schemes.other, role);
        return this.renderFeatureMorphSvg(specA, specB, m, opts);
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
            : { x: 0.34, y: 0.06, w: 0.64, h: 0.90 });
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
        if (this._shouldHidePrimeHead(trial)) this._hidePrimeHead(built.node);
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

    // Drop the head SVG so only the hat remains (empty space where the face was).
    _hidePrimeHead(fenIcon) {
        if (!fenIcon) this._fail("missing prime icon to hide the head.");
        let hat = fenIcon.getElementsByClassName("hat")[0];
        let host = (hat && hat.parentNode) || null;
        if (!host) {
            let scaleGroup = fenIcon.getElementsByClassName("Fennimal_scale_group")[0];
            let headGroup = scaleGroup && scaleGroup.firstElementChild;
            host = headGroup && headGroup.firstElementChild;
        }
        if (!host) this._fail("could not find prime head host to hide.");
        Array.from(host.children).forEach((node) => {
            if (!node || !node.classList) return;
            if (node.classList.contains("hat")) return;
            if (node.classList.contains("morph_prime_head_occluder")) return;
            node.remove();
        });
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
        let drawnW = bbox.width * scale;
        let inset = Math.max(4, frameBox.width * 0.02);
        let wellCx = (align === "right")
            ? (frameBox.x + frameBox.width - inset - drawnW / 2)
            : (frameBox.x + frameBox.width / 2);
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

    _meshMorphLandmarks(root) {
        let landmarks = {};
        if (!root || !root.querySelectorAll) return landmarks;
        root.querySelectorAll(".morph_lm[data-morph]").forEach((el) => {
            let key = el.getAttribute("data-morph");
            if (!key) return;
            let x = parseFloat(el.getAttribute("cx"));
            let y = parseFloat(el.getAttribute("cy"));
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            let optional = el.classList.contains("morph_lm_optional");
            if (!landmarks[key]) {
                landmarks[key] = { points: [], optional };
            } else {
                landmarks[key].optional = landmarks[key].optional && optional;
            }
            landmarks[key].points.push({ x, y });
        });
        Object.keys(landmarks).forEach((key) => {
            if (landmarks[key].points.length > 1) {
                landmarks[key].points.sort((a, b) => a.x - b.x || a.y - b.y);
            }
        });
        return landmarks;
    }

    _sharedMorphLandmarkSlots(target, other) {
        let slots = [];
        let keys = new Set([
            ...Object.keys((target && target.landmarks) || {}),
            ...Object.keys((other && other.landmarks) || {})
        ]);
        [...keys].sort().forEach((key) => {
            let ta = target.landmarks[key];
            let tb = other.landmarks[key];
            if (!ta || !tb || !ta.points.length || !tb.points.length) return;
            let count = Math.min(ta.points.length, tb.points.length);
            for (let i = 0; i < count; i++) {
                slots.push({ key, index: i });
            }
        });
        return slots;
    }

    _meshMorphPolys(root, scale) {
        let regions = {};
        if (!root || !root.querySelectorAll) return regions;
        let samples = Math.max(8, Math.round(this._num("meshRegionPolySamples", 32)));
        root.querySelectorAll(".morph_poly[data-morph]").forEach((el) => {
            let role = el.getAttribute("data-morph");
            if (!role || regions[role]) return;
            let len = 0;
            try {
                len = el.getTotalLength();
            } catch (err) {
                return;
            }
            if (!Number.isFinite(len) || len <= 0) return;
            let points = [];
            for (let i = 0; i < samples; i++) {
                let pt = el.getPointAtLength((i / samples) * len);
                points.push({ x: pt.x * scale, y: pt.y * scale });
            }
            regions[role] = { points, samples };
        });
        return regions;
    }

    _sharedMorphRegionRoles(target, other) {
        let keys = new Set([
            ...Object.keys((target && target.regions) || {}),
            ...Object.keys((other && other.regions) || {})
        ]);
        return [...keys].sort().filter((role) => {
            let a = target.regions[role];
            let b = other.regions[role];
            return a && b && a.points && a.points.length && b.points && b.points.length;
        });
    }

    _shellLandmarkSlots(landmarkSlots) {
        return (landmarkSlots || []).filter((slot) => {
            return !slot.key.startsWith("ear_") && !slot.key.startsWith("outline_");
        });
    }

    _copyRegionBoundary(src, role) {
        let region = (src.regions || {})[role];
        if (!region || !region.points || !region.points.length) return false;
        let points = region.points.map((p) => ({ x: p.x, y: p.y }));
        let anchor = this._regionBoundaryAnchor(src);
        if (anchor) points = this._rotateBoundaryToAnchor(points, anchor);
        src["regionBoundary_" + role] = this._normalizeBoundaryWinding(points, true);
        return true;
    }

    _regionBoundaryAnchor(src) {
        let lm = (src && src.landmarks) || {};
        if (lm.outline_top_left && lm.outline_top_left.points[0]) {
            return lm.outline_top_left.points[0];
        }
        if (lm.brow_mid && lm.brow_mid.points[0]) {
            return lm.brow_mid.points[0];
        }
        let a = (src && src.anchors) || {};
        return a.center || a.leftEye || null;
    }

    _rotateBoundaryToAnchor(points, anchor) {
        if (!points.length || !anchor) return points;
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < points.length; i++) {
            let d = Math.hypot(points[i].x - anchor.x, points[i].y - anchor.y);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        if (!best) return points;
        return points.slice(best).concat(points.slice(0, best));
    }

    _boundarySignedArea(points) {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            let j = (i + 1) % points.length;
            area += points[i].x * points[j].y - points[j].x * points[i].y;
        }
        return area * 0.5;
    }

    _normalizeBoundaryWinding(points, counterClockwise) {
        if (!points.length) return points;
        let ccw = this._boundarySignedArea(points) > 0;
        if (ccw !== counterClockwise) {
            return points.slice().reverse();
        }
        return points;
    }

    _regionOverlayMeshPointsFromBoundary(src, role) {
        let boundary = src["regionBoundary_" + role];
        if (!boundary || !boundary.length) return null;
        let points = boundary.map((p) => ({ x: p.x, y: p.y }));
        let cx = 0;
        let cy = 0;
        points.forEach((p) => {
            cx += p.x;
            cy += p.y;
        });
        cx /= points.length;
        cy /= points.length;
        points.push({ x: cx, y: cy });
        return points;
    }

    _overlayMeshTriangles(boundaryCount, centroidIndex, points) {
        let average = points;
        let tris = this._meshDelaunay(average);
        if (!tris.length) {
            return this._meshFanTriangles(boundaryCount, centroidIndex);
        }
        let maxIdx = boundaryCount;
        return tris.filter((tri) => tri.every((idx) => idx <= maxIdx));
    }

    _meshFanTriangles(boundaryCount, centroidIndex) {
        let triangles = [];
        for (let i = 0; i < boundaryCount; i++) {
            let j = (i + 1) % boundaryCount;
            triangles.push([centroidIndex, i, j]);
        }
        return triangles;
    }

    _prepareMeshRegionsPair(target, other, landmarkSlots) {
        if (!target.regions || !other.regions
            || !target.regions.head_shell || !other.regions.head_shell) {
            return null;
        }
        if (!this._copyRegionBoundary(target, "head_shell")
            || !this._copyRegionBoundary(other, "head_shell")) {
            return null;
        }
        let regionData = { head_shell: { maskOnly: true } };
        let overlayRoles = [];
        const overlayOrder = ["ear_left", "ear_right", "crown", "nose"];

        let setupPairedOverlay = (role) => {
            if (!this._copyRegionBoundary(target, role)
                || !this._copyRegionBoundary(other, role)) {
                return false;
            }
            let ptsO = this._regionOverlayMeshPointsFromBoundary(other, role);
            let ptsT = this._regionOverlayMeshPointsFromBoundary(target, role);
            if (!ptsO || !ptsT || ptsO.length !== ptsT.length) return false;
            let boundaryCount = ptsO.length - 1;
            let centroidIndex = boundaryCount;
            let triangles = this._overlayMeshTriangles(boundaryCount, centroidIndex, ptsO);
            if (!triangles.length) return false;
            other["regionPoints_" + role] = ptsO;
            target["regionPoints_" + role] = ptsT;
            regionData[role] = { triangles, paired: true, boundaryCount };
            return true;
        };

        let setupSingleOverlay = (role, side) => {
            let src = side === "target" ? target : other;
            if (!this._copyRegionBoundary(src, role)) return false;
            let pts = this._regionOverlayMeshPointsFromBoundary(src, role);
            if (!pts) return false;
            let boundaryCount = pts.length - 1;
            let centroidIndex = boundaryCount;
            let triangles = this._overlayMeshTriangles(boundaryCount, centroidIndex, pts);
            if (!triangles.length) return false;
            src["regionPoints_" + role] = pts;
            regionData[role] = { triangles, single: side, boundaryCount };
            return true;
        };

        overlayOrder.forEach((role) => {
            let hasO = other.regions[role];
            let hasT = target.regions[role];
            if (hasO && hasT) {
                if (setupPairedOverlay(role)) overlayRoles.push(role);
            } else if (hasT && setupSingleOverlay(role, "target")) {
                overlayRoles.push(role);
            } else if (hasO && setupSingleOverlay(role, "other")) {
                overlayRoles.push(role);
            }
        });

        return {
            regionData,
            baseRole: "head_shell",
            overlayRoles
        };
    }

    _resolveMeshShellRoleMode(profile, role, regionData) {
        let mode = profile && profile[role];
        if (!mode || mode === "auto") {
            let meta = regionData && regionData[role];
            if (meta && (meta.paired || meta.single)) return "regional";
            return "singular";
        }
        return mode;
    }

    _prepareMeshShellPair(target, other, profile) {
        profile = profile || this.params.meshShellDefaults || {};
        let base = this._prepareMeshRegionsPair(target, other, null);
        if (!base) return null;

        let shellRoleModes = {};
        MorphTaskController.meshShellRoleKeys().forEach((role) => {
            shellRoleModes[role] = this._resolveMeshShellRoleMode(
                profile, role, base.regionData
            );
            if (shellRoleModes[role] !== "regional") {
                delete base.regionData[role];
                base.overlayRoles = (base.overlayRoles || []).filter((r) => r !== role);
            }
            if (shellRoleModes[role] === "off") {
                delete base.regionData[role];
                base.overlayRoles = (base.overlayRoles || []).filter((r) => r !== role);
            }
        });

        return Object.assign(base, {
            shellProfile: profile,
            shellRoleModes
        });
    }

    _meshShellFeather(profile) {
        if (profile && profile.feather != null) {
            return Math.max(0.08, Math.min(0.65, Number(profile.feather)));
        }
        return Math.max(0.08, Math.min(0.65, this._num("layerMorphFeather", 0.38)));
    }

    _meshShellRoleRadius(role, eyeSpan, profile) {
        profile = profile || {};
        if (role === "nose") {
            return eyeSpan * (profile.noseRadiusFrac != null
                ? profile.noseRadiusFrac
                : this._num("layerMorphNoseRadiusFrac", 0.26));
        }
        if (role === "crown") {
            return eyeSpan * (profile.crownRadiusFrac != null
                ? profile.crownRadiusFrac
                : this._num("layerMorphCrownRadiusFrac", 0.52));
        }
        if (role === "ear_left" || role === "ear_right") {
            return eyeSpan * (profile.earRadiusFrac != null
                ? profile.earRadiusFrac
                : this._num("meshShellEarRadiusFrac", 0.38));
        }
        return eyeSpan * 0.3;
    }

    _meshShellRoleCenter(data, m, role, eyeSpan) {
        if (role === "nose") return this._morphedLandmarkPoint(data, m, "nose");
        if (role === "crown") return this._layerMorphCrownCenter(data, m, eyeSpan);
        if (role === "ear_left" || role === "ear_right") {
            let boundary = this._interpolatedRegionBoundary(data, m, role);
            if (boundary && boundary.length) {
                let cx = 0;
                let cy = 0;
                boundary.forEach((p) => {
                    cx += p.x;
                    cy += p.y;
                });
                return { x: cx / boundary.length, y: cy / boundary.length };
            }
            let side = role === "ear_left" ? "left" : "right";
            let lo = this._morphedLandmarkPoint(data, m, "ear_" + side + "_base_lower");
            let hi = this._morphedLandmarkPoint(data, m, "ear_" + side + "_base_upper");
            if (lo && hi) return { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2 };
            return lo || hi;
        }
        return null;
    }

    _buildMeshShellSingularZones(data, m) {
        let profile = data.shellProfile || this.params.meshShellDefaults || {};
        let roleModes = data.shellRoleModes || {};
        let anchors = this._morphedAnchors(data, m);
        let L = anchors.leftEye;
        let R = anchors.rightEye;
        let M = anchors.mouth;
        if (!L || !R) return [];
        let eyeSpan = Math.max(12, Math.hypot(R.x - L.x, R.y - L.y));
        let feather = this._meshShellFeather(profile);
        let zones = [];

        if (profile.eyes !== "off") {
            let r = eyeSpan * (profile.eyeRadiusFrac != null
                ? profile.eyeRadiusFrac
                : this._num("layerMorphEyeRadiusFrac", 0.36));
            zones.push({ x: L.x, y: L.y, r, feather });
            zones.push({ x: R.x, y: R.y, r, feather });
        }
        if (profile.mouth !== "off" && M) {
            zones.push({
                x: M.x,
                y: M.y,
                r: eyeSpan * (profile.mouthRadiusFrac != null
                    ? profile.mouthRadiusFrac
                    : this._num("layerMorphMouthRadiusFrac", 0.44)),
                feather
            });
        }
        MorphTaskController.meshShellRoleKeys().forEach((role) => {
            if (roleModes[role] !== "singular") return;
            let center = this._meshShellRoleCenter(data, m, role, eyeSpan);
            if (!center) return;
            zones.push({
                x: center.x,
                y: center.y,
                r: this._meshShellRoleRadius(role, eyeSpan, profile),
                feather: role === "crown" ? feather * 0.92 : feather
            });
        });
        return zones;
    }

    _composeSingularZonesDirected(warpA, warpB, dest, zones, m) {
        if (!zones || !zones.length) return;
        let size = dest.width;
        let ctxA = warpA.getContext("2d", { willReadFrequently: true });
        let ctxB = warpB.getContext("2d", { willReadFrequently: true });
        let ctxD = dest.getContext("2d", { willReadFrequently: true });
        let a = ctxA.getImageData(0, 0, size, size);
        let b = ctxB.getImageData(0, 0, size, size);
        let d = ctxD.getImageData(0, 0, size, size);
        let pa = a.data;
        let pb = b.data;
        let po = d.data;
        let preferTarget = m > 0.5 ? true : (m < 0.5 ? false : null);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let w = 0;
                for (let zi = 0; zi < zones.length; zi++) {
                    let z = zones[zi];
                    w = Math.max(w, this._landmarkZoneWeight(x, y, z.x, z.y, z.r, z.feather));
                }
                if (w <= 0) continue;
                let i = (y * size + x) * 4;
                let aA = pa[i + 3];
                let aB = pb[i + 3];
                if (aA < 8 && aB < 8) continue;
                let pickTarget;
                if (preferTarget === true) pickTarget = true;
                else if (preferTarget === false) pickTarget = false;
                else {
                    let sa = pa[i] * aA + pa[i + 1] * aA + pa[i + 2] * aA;
                    let sb = pb[i] * aB + pb[i + 1] * aB + pb[i + 2] * aB;
                    pickTarget = aB > aA || (aB === aA && sb > sa);
                }
                let wr = pickTarget ? pb[i] : pa[i];
                let wg = pickTarget ? pb[i + 1] : pa[i + 1];
                let wb = pickTarget ? pb[i + 2] : pa[i + 2];
                let wa = pickTarget ? aB : aA;
                po[i] = Math.round(po[i] + (wr - po[i]) * w);
                po[i + 1] = Math.round(po[i + 1] + (wg - po[i + 1]) * w);
                po[i + 2] = Math.round(po[i + 2] + (wb - po[i + 2]) * w);
                po[i + 3] = Math.round(po[i + 3] + (wa - po[i + 3]) * w);
            }
        }
        ctxD.putImageData(d, 0, 0);
    }

    _renderMeshShell(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.meshData || this.morphPair;
        if (!dest || !data || !data.regionData) {
            this._renderLayerMorph(m);
            return;
        }

        this._paintShellMeshMasked(data, m, dest);

        const overlayOrder = ["ear_left", "ear_right", "crown", "nose"];
        overlayOrder.forEach((role) => {
            if (data.shellRoleModes && data.shellRoleModes[role] !== "regional") return;
            let alpha = this._regionLayerAlpha(data, role, m);
            if (alpha <= 0.001) return;
            this._paintRegionOverlay(data, m, dest, role, alpha);
        });

        let warps = this._drawDualMeshWarps(data, m, dest.width);
        if (warps) {
            let zones = this._buildMeshShellSingularZones(data, m);
            this._composeSingularZonesDirected(warps.warpA, warps.warpB, dest, zones, m);
        }

        let profile = data.shellProfile || {};
        if (profile.outline !== false) {
            let shell = this._interpolatedRegionBoundary(data, m, "head_shell");
            if (shell && warps) {
                this._composeOutlineRing(warps.warpA, warps.warpB, dest, shell);
            }
        }

        this._sealAlphaCracks(dest, 2);
    }

    _pointInPolygon(x, y, poly) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            let xi = poly[i].x;
            let yi = poly[i].y;
            let xj = poly[j].x;
            let yj = poly[j].y;
            if (((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-6) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    _polygonBBox(poly) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        poly.forEach((p) => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        return { minX, minY, maxX, maxY };
    }

    _interpolatedRegionBoundary(data, m, role) {
        let key = "regionBoundary_" + role;
        let ptsO = data.other[key];
        let ptsT = data.target[key];
        if (!ptsO && !ptsT) return null;
        if (!ptsO) return ptsT.map((p) => ({ x: p.x, y: p.y }));
        if (!ptsT) return ptsO.map((p) => ({ x: p.x, y: p.y }));
        if (ptsO.length !== ptsT.length) return ptsT;
        return ptsO.map((p, i) => ({
            x: p.x + (ptsT[i].x - p.x) * m,
            y: p.y + (ptsT[i].y - p.y) * m
        }));
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
        let morphLandmarks = this._meshMorphLandmarks(head);
        let k = size / 400;
        let morphRegions = this._meshMorphPolys(head, k);

        let exportSvg = document.createElementNS(ns, "svg");
        exportSvg.setAttribute("xmlns", ns);
        exportSvg.setAttribute("viewBox", "0 0 400 400");
        exportSvg.setAttribute("width", String(size));
        exportSvg.setAttribute("height", String(size));
        let exportHead = head.cloneNode(true);
        if (this._num("morphOmitTextures", 1) > 0) {
            this._stripMorphDecor(exportHead, ["texture"]);
        }
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
        const scalePoint = (p) => p ? ({ x: p.x * k, y: p.y * k }) : null;
        const scaleBox = (b) => b ? ({
            x: b.x * k, y: b.y * k, width: b.width * k, height: b.height * k
        }) : null;
        leftBox = scaleBox(leftBox);
        rightBox = scaleBox(rightBox);
        mouthBox = scaleBox(mouthBox);
        mouthMarker = scalePoint(mouthMarker);
        neckMarker = scalePoint(neckMarker);
        let landmarks = {};
        Object.keys(morphLandmarks).forEach((key) => {
            landmarks[key] = {
                optional: morphLandmarks[key].optional,
                points: morphLandmarks[key].points.map(scalePoint)
            };
        });

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
            landmarks,
            regions: morphRegions,
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
                mouth_found: !!mouthBox,
                morph_landmarks: Object.keys(landmarks),
                morph_regions: Object.keys(morphRegions)
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
        let fitFrac = this._num("morphFitFrac", 0.76);
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
        let landmarks = {};
        Object.keys(src.landmarks || {}).forEach((key) => {
            let entry = src.landmarks[key];
            landmarks[key] = {
                optional: entry.optional,
                points: entry.points.map((p) => this._applySimilarity(p, xf))
            };
        });
        let regions = {};
        Object.keys(src.regions || {}).forEach((key) => {
            let entry = src.regions[key];
            regions[key] = {
                samples: entry.samples,
                points: entry.points.map((p) => this._applySimilarity(p, xf))
            };
        });
        let ext = this._sourceExtents(src, threshold);
        return {
            canvas: this._warpCanvasBySimilarity(src.canvas, xf),
            points: (src.points || []).map((p) => this._applySimilarity(p, xf)),
            landmarks,
            regions,
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

    _homologousMeshPoints(src, center, contourCount, innerFrac, threshold, landmarkSlots) {
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
        points.push(a.center || center);
        (landmarkSlots || []).forEach((slot) => {
            let entry = (src.landmarks || {})[slot.key];
            if (!entry || !entry.points[slot.index]) return;
            points.push(entry.points[slot.index]);
        });
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

    _usesMeshTriangulation(kind) {
        return kind === "mesh" || kind === "mesh_landmark" || kind === "mesh_regions"
            || kind === "mesh_shell" || kind === "feature_anchored_mesh"
            || kind === "layer_morph" || kind === "composite_morph";
    }

    _usesLayerMorph(kind) {
        return kind === "layer_morph";
    }

    _usesCompositeMorph(kind) {
        return kind === "composite_morph";
    }

    _usesMeshRegions(kind) {
        return kind === "mesh_regions";
    }

    _usesMeshShell(kind) {
        return kind === "mesh_shell";
    }

    _usesFeatureAnchoredMesh(kind) {
        return kind === "feature_anchored_mesh";
    }

    _prepareFeatureAnchoredPair(target, other, profile, headA, headB) {
        profile = profile || {};
        if (!target.regions || !other.regions
            || !target.regions.head_shell || !other.regions.head_shell) {
            return null;
        }
        if (!this._copyRegionBoundary(target, "head_shell")
            || !this._copyRegionBoundary(other, "head_shell")) {
            return null;
        }

        let regionData = { head_shell: { maskOnly: true } };
        let overlayRoles = [];
        let roles = this._resolveChimeraRoles(profile, headA, headB, null);
        if (!Array.isArray(roles)) roles = ["crown", "nose"];

        let setupPairedOverlay = (role) => {
            if (!this._copyRegionBoundary(target, role)
                || !this._copyRegionBoundary(other, role)) {
                return false;
            }
            let ptsO = this._regionOverlayMeshPointsFromBoundary(other, role);
            let ptsT = this._regionOverlayMeshPointsFromBoundary(target, role);
            if (!ptsO || !ptsT || ptsO.length !== ptsT.length) return false;
            let boundaryCount = ptsO.length - 1;
            let centroidIndex = boundaryCount;
            let triangles = this._overlayMeshTriangles(boundaryCount, centroidIndex, ptsO);
            if (!triangles.length) return false;
            other["regionPoints_" + role] = ptsO;
            target["regionPoints_" + role] = ptsT;
            regionData[role] = { triangles, paired: true, boundaryCount };
            return true;
        };

        let setupSingleOverlay = (role, side) => {
            let src = side === "target" ? target : other;
            if (!this._copyRegionBoundary(src, role)) return false;
            let pts = this._regionOverlayMeshPointsFromBoundary(src, role);
            if (!pts) return false;
            let boundaryCount = pts.length - 1;
            let centroidIndex = boundaryCount;
            let triangles = this._overlayMeshTriangles(boundaryCount, centroidIndex, pts);
            if (!triangles.length) return false;
            src["regionPoints_" + role] = pts;
            regionData[role] = { triangles, single: side, boundaryCount };
            return true;
        };

        roles.forEach((role) => {
            let hasO = other.regions[role];
            let hasT = target.regions[role];
            if (hasO && hasT) {
                if (setupPairedOverlay(role)) overlayRoles.push(role);
            } else if (hasT && setupSingleOverlay(role, "target")) {
                overlayRoles.push(role);
            } else if (hasO && setupSingleOverlay(role, "other")) {
                overlayRoles.push(role);
            }
        });

        return {
            regionData,
            overlayRoles,
            chimeraRoles: roles.slice(),
            baseRole: "head_shell"
        };
    }

    _normalizeHeadRoleKey(head) {
        return String(head || "").trim().toLowerCase().replace(/^fennimal_head_/, "");
    }

    _headHeroRoles(headName) {
        let key = this._normalizeHeadRoleKey(headName);
        let profile = (this.params.headHeroProfiles || {})[key];
        if (profile && profile.chimera && profile.chimera.length) {
            return profile.chimera.map((entry) => entry.role);
        }
        let heroes = this.params.headHeroElements || {};
        let roles = heroes[key];
        if (!roles) return [];
        return Array.isArray(roles) ? roles.slice() : [];
    }

    _headHeroChimeraEntries(headName) {
        let key = this._normalizeHeadRoleKey(headName);
        let profile = (this.params.headHeroProfiles || {})[key];
        if (profile && profile.chimera && profile.chimera.length) {
            return profile.chimera.map((entry) => Object.assign({ mode: "native", strength: 1 }, entry));
        }
        return this._headHeroRoles(headName).map((role) => ({
            role,
            mode: role === "bell_clapper" ? "zone" : "native",
            strength: role === "crown" ? 0.92 : 0.85
        }));
    }

    _headHeroOutlineEntries(headName) {
        let key = this._normalizeHeadRoleKey(headName);
        let profile = (this.params.headHeroProfiles || {})[key];
        if (profile && profile.outline && profile.outline.length) {
            return profile.outline.map((entry) => Object.assign({
                role: "head_shell",
                native: true,
                strength: 0.8,
                parent: "self"
            }, entry));
        }
        let outlineHero = (this.params.headOutlineHero || {})[key];
        if (outlineHero) {
            return [{ role: outlineHero, native: true, strength: 0.9, parent: "self" }];
        }
        return [];
    }

    _resolveChimeraRoles(profile, headA, headB, data) {
        profile = profile || {};
        if (profile.chimeraRoles && profile.chimeraRoles.length) {
            return profile.chimeraRoles.slice();
        }
        if (data && data.chimeraRoles && data.chimeraRoles.length) {
            return data.chimeraRoles.slice();
        }
        let roles = new Set();
        this._headHeroRoles(headA).forEach((role) => roles.add(role));
        this._headHeroRoles(headB).forEach((role) => roles.add(role));
        if (!roles.size) {
            return (this.params.featureAnchoredChimeraRoles || ["crown", "nose"]).slice();
        }
        return [...roles];
    }

    _regionBoundaryCentroid(src, role) {
        let boundary = src && src["regionBoundary_" + role];
        if (!boundary || !boundary.length) return null;
        let cx = 0;
        let cy = 0;
        boundary.forEach((p) => {
            cx += p.x;
            cy += p.y;
        });
        return { x: cx / boundary.length, y: cy / boundary.length };
    }

    _chimeraZoneCenter(data, role, side) {
        let src = side === "target" ? data.target : data.other;
        if (!src) return null;
        if (role === "bell_clapper") {
            let chin = (src.landmarks || {}).chin;
            let bottom = (src.landmarks || {}).outline_bottom;
            let chinPt = chin && chin.points && chin.points[0];
            let bottomPt = bottom && bottom.points && bottom.points[0];
            if (chinPt && bottomPt) {
                return {
                    x: chinPt.x * 0.25 + bottomPt.x * 0.75,
                    y: chinPt.y * 0.2 + bottomPt.y * 0.8
                };
            }
            if (chinPt) return { x: chinPt.x, y: chinPt.y };
            if (bottomPt) return { x: bottomPt.x, y: bottomPt.y };
        }
        return this._regionBoundaryCentroid(src, role);
    }

    _chimeraZoneRadius(role, eyeSpan, profile) {
        profile = profile || {};
        if (role === "crown") {
            let frac = profile.chimeraCrownRadiusFrac != null
                ? Number(profile.chimeraCrownRadiusFrac)
                : this._num("featureAnchoredChimeraCrownRadiusFrac", 0.34);
            return eyeSpan * frac;
        }
        if (role === "bell_clapper") {
            let frac = profile.chimeraClapperRadiusFrac != null
                ? Number(profile.chimeraClapperRadiusFrac)
                : this._num("featureAnchoredChimeraClapperRadiusFrac", 0.48);
            return eyeSpan * frac;
        }
        let frac = profile.chimeraRegionalRadiusFrac != null
            ? Number(profile.chimeraRegionalRadiusFrac)
            : this._num("featureAnchoredChimeraRegionalRadiusFrac", 0.4);
        return eyeSpan * frac;
    }

    _chimeraSalienceWeight(m, profile) {
        profile = profile || {};
        let strength = profile.chimeraStrength != null
            ? Number(profile.chimeraStrength)
            : this._num("featureAnchoredChimeraStrength", 0.72);
        if (!Number.isFinite(strength) || strength <= 0) return 0;
        strength = Math.max(0, Math.min(1, strength));
        // Peaks at m=0.5, fades toward 0 and 1 (keeps ladder endpoints clean).
        let bell = 4 * m * (1 - m);
        return strength * bell;
    }

    _composeForcedParentZones(warpA, warpB, dest, zones, strength) {
        if (!zones || !zones.length) return;
        strength = strength == null ? 1 : Math.max(0, Math.min(1, strength));
        if (strength <= 0.001) return;
        let size = dest.width;
        let ctxA = warpA.getContext("2d", { willReadFrequently: true });
        let ctxB = warpB.getContext("2d", { willReadFrequently: true });
        let ctxD = dest.getContext("2d", { willReadFrequently: true });
        let a = ctxA.getImageData(0, 0, size, size);
        let b = ctxB.getImageData(0, 0, size, size);
        let d = ctxD.getImageData(0, 0, size, size);
        let pa = a.data;
        let pb = b.data;
        let po = d.data;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let w = 0;
                let pickFromA = false;
                for (let zi = 0; zi < zones.length; zi++) {
                    let z = zones[zi];
                    let zw = this._landmarkZoneWeight(x, y, z.x, z.y, z.r, z.feather);
                    if (zw <= w) continue;
                    w = zw;
                    pickFromA = z.parent === "other";
                }
                if (w <= 0) continue;
                w *= strength;
                let i = (y * size + x) * 4;
                let aA = pa[i + 3];
                let aB = pb[i + 3];
                if (aA < 8 && aB < 8) continue;
                let wr = pickFromA ? pa[i] : pb[i];
                let wg = pickFromA ? pa[i + 1] : pb[i + 1];
                let wb = pickFromA ? pa[i + 2] : pb[i + 2];
                let wa = pickFromA ? aA : aB;
                po[i] = Math.round(po[i] + (wr - po[i]) * w);
                po[i + 1] = Math.round(po[i + 1] + (wg - po[i + 1]) * w);
                po[i + 2] = Math.round(po[i + 2] + (wb - po[i + 2]) * w);
                po[i + 3] = Math.round(po[i + 3] + (wa - po[i + 3]) * w);
            }
        }
        ctxD.putImageData(d, 0, 0);
    }

    _paintParentNativeRegionSalience(data, dest, role, side, alpha, warps, partition) {
        if (alpha <= 0.001 || !warps) return;
        let meta = data.regionData && data.regionData[role];
        if (meta && side === "target" && meta.single === "other") return;
        if (meta && side === "other" && meta.single === "target") return;
        let srcSide = side === "target" ? data.target : data.other;
        let mask = srcSide && srcSide["regionBoundary_" + role];
        if (!mask || !mask.length) return;
        let scratch = this._ensureScratchCanvas("_chimeraSalience", dest.width, dest.height);
        let ctx = scratch.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, dest.width, dest.height);
        let src = side === "target" ? warps.warpB : warps.warpA;
        ctx.drawImage(src, 0, 0);
        this._compositeRegionLayer(dest, scratch, mask, alpha, partition);
    }

    _dualHeroRoleCentroids(data, role) {
        let meta = data.regionData && data.regionData[role];
        if (!meta || !meta.paired) return null;
        let targetC = this._regionBoundaryCentroid(data.target, role);
        let otherC = this._regionBoundaryCentroid(data.other, role);
        if (!targetC || !otherC) return null;
        return { target: targetC, other: otherC };
    }

    _heroRolePartition(data, role, side, eyeSpan, anchors) {
        let dual = this._dualHeroRoleCentroids(data, role);
        if (!dual) return null;
        let ownCenter = side === "target" ? dual.target : dual.other;
        let rivalCenter = side === "target" ? dual.other : dual.target;
        let band = eyeSpan * this._num("featureAnchoredChimeraPartitionBandFrac", 0.07);
        let closeFrac = this._num("featureAnchoredChimeraCentroidCloseFrac", 0.18);
        let close = Math.hypot(ownCenter.x - rivalCenter.x, ownCenter.y - rivalCenter.y)
            < eyeSpan * closeFrac;
        let midX = anchors && anchors.leftEye && anchors.rightEye
            ? (anchors.leftEye.x + anchors.rightEye.x) / 2
            : (ownCenter.x + rivalCenter.x) / 2;
        return {
            ownCenter,
            rivalCenter,
            band: Math.max(2, band),
            midX,
            useLateral: close,
            side
        };
    }

    _pairUsesHeroRole(headA, headB, role) {
        let hasA = this._headHeroChimeraEntries(headA).some((h) => h.role === role);
        let hasB = this._headHeroChimeraEntries(headB).some((h) => h.role === role);
        return hasA && hasB;
    }

    _paintChimeraHeroSalience(data, m, dest, profile, warps) {
        let baseWeight = this._chimeraSalienceWeight(m, profile);
        if (baseWeight <= 0.001 || !warps) return;
        let headA = data.headTarget || (this.morphRenderTrial && this.morphRenderTrial.targetFen
            && this.morphRenderTrial.targetFen.head);
        let headB = data.headOther || (this.morphRenderTrial && this.morphRenderTrial.otherFen
            && this.morphRenderTrial.otherFen.head);
        let anchors = this._morphedAnchors(data, m);
        if (!anchors.leftEye || !anchors.rightEye) return;
        let eyeSpan = Math.max(12, Math.hypot(
            anchors.rightEye.x - anchors.leftEye.x,
            anchors.rightEye.y - anchors.leftEye.y
        ));
        let feather = Math.max(0.06, Math.min(0.45, profile.chimeraFeather != null
            ? Number(profile.chimeraFeather)
            : this._num("featureAnchoredChimeraFeather", 0.22)));

        [
            { side: "target", head: headA },
            { side: "other", head: headB }
        ].forEach(({ side, head }) => {
            this._headHeroChimeraEntries(head).forEach((hero) => {
                let strength = baseWeight * (hero.strength != null ? Number(hero.strength) : 1);
                if (!Number.isFinite(strength) || strength <= 0.001) return;
                let mode = hero.mode || (hero.role === "bell_clapper" ? "zone" : "native");
                if (mode === "native" || hero.role === "crown" || hero.role === "nose") {
                    if (data.regionData && data.regionData[hero.role]) {
                        let partition = null;
                        if (this._pairUsesHeroRole(headA, headB, hero.role)) {
                            partition = this._heroRolePartition(
                                data, hero.role, side, eyeSpan, anchors
                            );
                        }
                        this._paintParentNativeRegionSalience(
                            data, dest, hero.role, side, strength, warps, partition
                        );
                        return;
                    }
                    if (hero.role !== "bell_clapper") return;
                    mode = "zone";
                }
                if (mode !== "zone") return;
                let center = this._chimeraZoneCenter(data, hero.role, side);
                if (!center) return;
                this._composeForcedParentZones(warps.warpA, warps.warpB, dest, [{
                    x: center.x,
                    y: center.y,
                    r: this._chimeraZoneRadius(hero.role, eyeSpan, profile),
                    feather,
                    parent: side
                }], strength);
            });
        });
    }

    _paintChimeraCrispSalience(data, m, dest, profile, warps) {
        let weight = this._chimeraSalienceWeight(m, profile);
        if (weight <= 0.001 || !warps) return;
        let headA = data.headTarget || (this.morphRenderTrial && this.morphRenderTrial.targetFen
            && this.morphRenderTrial.targetFen.head);
        let headB = data.headOther || (this.morphRenderTrial && this.morphRenderTrial.otherFen
            && this.morphRenderTrial.otherFen.head);
        let roles = this._resolveChimeraRoles(profile, headA, headB, data);
        let anchors = this._morphedAnchors(data, m);
        if (!anchors.leftEye || !anchors.rightEye) return;
        let eyeSpan = Math.max(12, Math.hypot(
            anchors.rightEye.x - anchors.leftEye.x,
            anchors.rightEye.y - anchors.leftEye.y
        ));
        let feather = Math.max(0.08, Math.min(0.55, profile.chimeraFeather != null
            ? Number(profile.chimeraFeather)
            : this._num("featureAnchoredChimeraFeather", 0.26)));
        let zones = [];

        roles.forEach((role) => {
            ["target", "other"].forEach((side) => {
                let center = this._chimeraZoneCenter(data, role, side);
                if (!center) return;
                let meta = data.regionData && data.regionData[role];
                if (meta && side === "target" && meta.single === "other") return;
                if (meta && side === "other" && meta.single === "target") return;
                zones.push({
                    x: center.x,
                    y: center.y,
                    r: this._chimeraZoneRadius(role, eyeSpan, profile),
                    feather,
                    parent: side
                });
            });
        });
        if (!zones.length) return;
        this._composeForcedParentZones(warps.warpA, warps.warpB, dest, zones, weight);
    }

    _paintParentRegionSalience(data, m, dest, role, side, alpha) {
        if (alpha <= 0.001) return;
        let meta = data.regionData && data.regionData[role];
        if (!meta) return;
        if (side === "target" && meta.single === "other") return;
        if (side === "other" && meta.single === "target") return;

        let warps = this._drawDualRegionWarps(data, m, dest.width, role);
        if (!warps) return;
        let scratch = this._ensureScratchCanvas("_chimeraSalience", dest.width, dest.height);
        let ctx = scratch.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, dest.width, dest.height);
        let src = side === "target" ? warps.warpB : warps.warpA;
        ctx.drawImage(src, 0, 0);
        let mask = this._interpolatedRegionBoundary(data, m, role);
        if (!mask) return;
        this._compositeRegionLayer(dest, scratch, mask, alpha);
    }

    _paintChimeraSalienceOverlays(data, m, dest, profile, warps) {
        if (!this._num("featureAnchoredChimeraSalience", 1)) return;
        profile = profile || {};
        let mode = profile.chimeraMode
            || this.params.featureAnchoredChimeraMode
            || "hero";
        if (mode === "hero" || mode === "crisp") {
            if (mode === "hero") {
                this._paintChimeraHeroSalience(data, m, dest, profile, warps);
            } else {
                this._paintChimeraCrispSalience(data, m, dest, profile, warps);
            }
            return;
        }
        let weight = this._chimeraSalienceWeight(m, profile);
        if (weight <= 0.001) return;
        let headA = data.headTarget || (this.morphRenderTrial && this.morphRenderTrial.targetFen
            && this.morphRenderTrial.targetFen.head);
        let headB = data.headOther || (this.morphRenderTrial && this.morphRenderTrial.otherFen
            && this.morphRenderTrial.otherFen.head);
        let roles = this._resolveChimeraRoles(profile, headA, headB, data);
        roles.forEach((role) => {
            this._paintParentRegionSalience(data, m, dest, role, "target", weight);
            this._paintParentRegionSalience(data, m, dest, role, "other", weight);
        });
    }

    _usesMeanShapeWarp(kind) {
        return kind === "mean_shape";
    }

    _sparseMorphPoints(src, center, contourCount, threshold) {
        let canvas = src.canvas;
        let size = canvas.width;
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        let pixels = ctx.getImageData(0, 0, size, size).data;
        let contour = this._meshRadialContour(pixels, size, center, contourCount, threshold);
        let a = src.anchors || {};
        let samples = Math.max(4, Math.round(this._num("meanShapeContourSamples", 8)));
        let points = [];
        for (let i = 0; i < samples; i++) {
            let idx = Math.round(i * contourCount / samples) % contourCount;
            points.push(contour[idx]);
        }
        points.push(a.leftEye || { x: center.x - 24, y: center.y });
        points.push(a.rightEye || { x: center.x + 24, y: center.y });
        points.push(a.mouth || { x: center.x, y: center.y + 28 });
        points.push(a.neck || { x: center.x, y: center.y + 70 });
        points.push(a.center || center);
        return points;
    }

    _buildBeierNeelyLines(src, contourCount) {
        let a = src.anchors || {};
        let L = a.leftEye;
        let R = a.rightEye;
        let M = a.mouth;
        let N = a.neck;
        let C = a.center;
        let pts = src.points || [];
        let contour = pts.length >= contourCount ? pts.slice(0, contourCount) : [];
        let lines = [];
        let add = (p, q) => {
            if (!p || !q) return;
            if (Math.hypot(q.x - p.x, q.y - p.y) < 3) return;
            lines.push({ p0: { x: p.x, y: p.y }, p1: { x: q.x, y: q.y } });
        };
        add(L, R);
        if (M) {
            let span = (L && R) ? Math.hypot(R.x - L.x, R.y - L.y) * 0.44 : 30;
            add({ x: M.x - span, y: M.y }, { x: M.x + span, y: M.y });
        }
        add(L, M);
        add(R, M);
        add(M, N);
        add(C, N);
        add(L, C);
        add(R, C);
        if (contour.length >= 8 && C) {
            let step = Math.max(1, Math.floor(contourCount / 8));
            for (let i = 0; i < contourCount; i += step) add(C, contour[i]);
        }
        if (contour.length >= 12) {
            let seg = Math.max(1, Math.floor(contourCount / 12));
            for (let i = 0; i < contourCount; i += seg) {
                add(contour[i], contour[(i + seg) % contourCount]);
            }
        }
        return lines;
    }

    _beierNeelyLineWeight(x, y, line, aPow, bPow, pPow) {
        let px = line.p0.x;
        let py = line.p0.y;
        let qx = line.p1.x;
        let qy = line.p1.y;
        let dx = qx - px;
        let dy = qy - py;
        let len = Math.hypot(dx, dy);
        if (len < 1e-6) return 0;
        let dist = Math.abs(dy * (x - px) - dx * (y - py)) / len;
        return Math.pow(len, pPow) / Math.pow(aPow + dist, bPow);
    }

    _beierNeelyWarpPoint(x, y, destLine, srcLine) {
        let dp = destLine.p0;
        let dq = destLine.p1;
        let sp = srcLine.p0;
        let sq = srcLine.p1;
        let ddx = dq.x - dp.x;
        let ddy = dq.y - dp.y;
        let sdx = sq.x - sp.x;
        let sdy = sq.y - sp.y;
        let dd2 = ddx * ddx + ddy * ddy;
        if (dd2 < 1e-6) return { x, y };
        let xmd = x - dp.x;
        let ymd = y - dp.y;
        let u = (xmd * ddx + ymd * ddy) / dd2;
        let v = (xmd * (-ddy) + ymd * ddx) / dd2;
        return {
            x: sp.x + u * sdx - v * sdy,
            y: sp.y + u * sdy + v * sdx
        };
    }

    _beierNeelySourceAt(x, y, destLines, srcLines, aPow, bPow, pPow) {
        let sumX = 0;
        let sumY = 0;
        let sumW = 0;
        for (let i = 0; i < destLines.length; i++) {
            let w = this._beierNeelyLineWeight(x, y, destLines[i], aPow, bPow, pPow);
            if (w <= 0) continue;
            let pt = this._beierNeelyWarpPoint(x, y, destLines[i], srcLines[i]);
            sumX += w * pt.x;
            sumY += w * pt.y;
            sumW += w;
        }
        if (sumW < 1e-8) return { x, y };
        return { x: sumX / sumW, y: sumY / sumW };
    }

    _interpolateBeierNeelyLines(linesA, linesB, m) {
        let n = Math.min(linesA.length, linesB.length);
        let out = [];
        for (let i = 0; i < n; i++) {
            let a = linesA[i];
            let b = linesB[i];
            out.push({
                p0: {
                    x: a.p0.x + (b.p0.x - a.p0.x) * m,
                    y: a.p0.y + (b.p0.y - a.p0.y) * m
                },
                p1: {
                    x: a.p1.x + (b.p1.x - a.p1.x) * m,
                    y: a.p1.y + (b.p1.y - a.p1.y) * m
                }
            });
        }
        return out;
    }

    _sampleRGBA(data, size, x, y) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return [0, 0, 0, 0];
        if (x < 0 || y < 0 || x >= size - 1 || y >= size - 1) {
            let ix = Math.max(0, Math.min(size - 1, Math.round(x)));
            let iy = Math.max(0, Math.min(size - 1, Math.round(y)));
            let i = (iy * size + ix) * 4;
            return [data[i], data[i + 1], data[i + 2], data[i + 3]];
        }
        let x0 = Math.floor(x);
        let y0 = Math.floor(y);
        let fx = x - x0;
        let fy = y - y0;
        let i00 = (y0 * size + x0) * 4;
        let i10 = i00 + 4;
        let i01 = i00 + size * 4;
        let i11 = i01 + 4;
        let r = data[i00] * (1 - fx) * (1 - fy) + data[i10] * fx * (1 - fy)
            + data[i01] * (1 - fx) * fy + data[i11] * fx * fy;
        let g = data[i00 + 1] * (1 - fx) * (1 - fy) + data[i10 + 1] * fx * (1 - fy)
            + data[i01 + 1] * (1 - fx) * fy + data[i11 + 1] * fx * fy;
        let b = data[i00 + 2] * (1 - fx) * (1 - fy) + data[i10 + 2] * fx * (1 - fy)
            + data[i01 + 2] * (1 - fx) * fy + data[i11 + 2] * fx * fy;
        let a = data[i00 + 3] * (1 - fx) * (1 - fy) + data[i10 + 3] * fx * (1 - fy)
            + data[i01 + 3] * (1 - fx) * fy + data[i11 + 3] * fx * fy;
        return [r, g, b, a];
    }

    _drawDualMeshWarps(data, m, size, pointKey) {
        pointKey = pointKey || "points";
        let otherPts = data.other[pointKey];
        let targetPts = data.target[pointKey];
        if (!data.triangles || !data.triangles.length
            || !otherPts || !targetPts || otherPts.length !== targetPts.length) {
            return null;
        }
        let destPts = otherPts.map((p, i) => ({
            x: p.x + (targetPts[i].x - p.x) * m,
            y: p.y + (targetPts[i].y - p.y) * m
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
        this._meshDrawWarped(ctxA, data.other.canvas, otherPts, destPts, data.triangles, 1);
        this._meshDrawWarped(ctxB, data.target.canvas, targetPts, destPts, data.triangles, 1);
        return { warpA, warpB };
    }

    _drawDualRegionWarps(data, m, size, role) {
        let pointKey = "regionPoints_" + role;
        let regionMeta = data.regionData && data.regionData[role];
        if (!regionMeta) return null;
        let triangles = regionMeta.triangles;
        if (!triangles || !triangles.length) return null;

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

        if (regionMeta.single === "target") {
            let targetPts = data.target[pointKey];
            if (!targetPts) return null;
            this._meshDrawWarped(ctxB, data.target.canvas, targetPts, targetPts, triangles, 1);
            return { warpA, warpB };
        }
        if (regionMeta.single === "other") {
            let otherPts = data.other[pointKey];
            if (!otherPts) return null;
            this._meshDrawWarped(ctxA, data.other.canvas, otherPts, otherPts, triangles, 1);
            return { warpA, warpB };
        }

        let otherPts = data.other[pointKey];
        let targetPts = data.target[pointKey];
        if (!otherPts || !targetPts || otherPts.length !== targetPts.length) return null;
        let destPts = otherPts.map((p, i) => ({
            x: p.x + (targetPts[i].x - p.x) * m,
            y: p.y + (targetPts[i].y - p.y) * m
        }));
        this._meshDrawWarped(ctxA, data.other.canvas, otherPts, destPts, triangles, 1);
        this._meshDrawWarped(ctxB, data.target.canvas, targetPts, destPts, triangles, 1);
        return { warpA, warpB };
    }

    _compositeRegionLayer(dest, source, maskPoly, layerAlpha, partition) {
        if (!maskPoly || !maskPoly.length || layerAlpha <= 0.001) return;
        partition = partition || null;
        let size = dest.width;
        let bbox = this._polygonBBox(maskPoly);
        let minX = Math.max(0, Math.floor(bbox.minX) - 1);
        let minY = Math.max(0, Math.floor(bbox.minY) - 1);
        let maxX = Math.min(size - 1, Math.ceil(bbox.maxX) + 1);
        let maxY = Math.min(size - 1, Math.ceil(bbox.maxY) + 1);
        let ctxD = dest.getContext("2d", { willReadFrequently: true });
        let ctxS = source.getContext("2d", { willReadFrequently: true });
        let d = ctxD.getImageData(0, 0, size, size);
        let s = ctxS.getImageData(0, 0, size, size);
        let pd = d.data;
        let ps = s.data;
        let la = Math.max(0, Math.min(1, layerAlpha));
        let ownCenter = partition && partition.ownCenter;
        let rivalCenter = partition && partition.rivalCenter;
        let band = partition && partition.band != null ? partition.band : 0;
        let midX = partition && partition.midX != null ? partition.midX : null;
        let side = partition && partition.side;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (!this._pointInPolygon(x + 0.5, y + 0.5, maskPoly)) continue;
                let partW = 1;
                if (partition && rivalCenter && ownCenter) {
                    if (midX != null && partition.useLateral) {
                        let edge = side === "target" ? (midX - x) : (x - midX);
                        if (edge <= -band) partW = 0;
                        else if (edge >= band) partW = 1;
                        else partW = (edge + band) / Math.max(1, 2 * band);
                    } else if (band > 0) {
                        let distOwn = Math.hypot(x + 0.5 - ownCenter.x, y + 0.5 - ownCenter.y);
                        let distRival = Math.hypot(x + 0.5 - rivalCenter.x, y + 0.5 - rivalCenter.y);
                        let edge = distRival - distOwn;
                        if (edge <= -band) partW = 0;
                        else if (edge >= band) partW = 1;
                        else partW = (edge + band) / (2 * band);
                    }
                }
                if (partW <= 0.001) continue;
                let i = (y * size + x) * 4;
                let sa = (ps[i + 3] / 255) * la * partW;
                if (sa < 0.02) continue;
                let sr = ps[i];
                let sg = ps[i + 1];
                let sb = ps[i + 2];
                let da = pd[i + 3] / 255;
                let outA = sa + da * (1 - sa);
                if (outA < 0.02) {
                    pd[i + 3] = 0;
                    continue;
                }
                pd[i] = Math.round((sr * sa + pd[i] * da * (1 - sa)) / outA);
                pd[i + 1] = Math.round((sg * sa + pd[i + 1] * da * (1 - sa)) / outA);
                pd[i + 2] = Math.round((sb * sa + pd[i + 2] * da * (1 - sa)) / outA);
                pd[i + 3] = Math.round(outA * 255);
            }
        }
        ctxD.putImageData(d, 0, 0);
    }

    _paintShellMeshMasked(data, m, dest) {
        let warps = this._drawDualMeshWarps(data, m, dest.width);
        if (!warps) {
            this._lerpCanvases(data.other.canvas, data.target.canvas, m, dest);
            return;
        }
        let scratch = this._ensureScratchCanvas("_regionBlend", dest.width, dest.height);
        this._lerpCanvases(warps.warpA, warps.warpB, m, scratch);
        let ctx = dest.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, dest.width, dest.height);
        let mask = this._interpolatedRegionBoundary(data, m, "head_shell");
        if (!mask) {
            ctx.drawImage(scratch, 0, 0);
            return;
        }
        this._compositeRegionLayer(dest, scratch, mask, 1);
    }

    _paintRegionOverlay(data, m, dest, role, layerAlpha) {
        if (layerAlpha <= 0.001) return;
        let warps = this._drawDualRegionWarps(data, m, dest.width, role);
        if (!warps) return;
        let scratch = this._ensureScratchCanvas("_regionOverlay", dest.width, dest.height);
        this._lerpCanvases(warps.warpA, warps.warpB, m, scratch);
        let mask = this._interpolatedRegionBoundary(data, m, role);
        if (!mask) return;
        this._compositeRegionLayer(dest, scratch, mask, layerAlpha);
    }

    _regionLayerAlpha(data, role, m) {
        let meta = data.regionData && data.regionData[role];
        if (!meta) return 0;
        if (meta.paired) return 1;
        if (meta.single === "target") return m;
        if (meta.single === "other") return 1 - m;
        return 0;
    }

    _morphedAnchors(data, m) {
        let o = (data.other && data.other.anchors) || {};
        let t = (data.target && data.target.anchors) || {};
        let lerp = (key) => {
            let a = o[key];
            let b = t[key];
            if (!a || !b) return null;
            return { x: a.x + (b.x - a.x) * m, y: a.y + (b.y - a.y) * m };
        };
        return { leftEye: lerp("leftEye"), rightEye: lerp("rightEye"), mouth: lerp("mouth") };
    }

    _landmarkZoneWeight(x, y, cx, cy, radius, feather) {
        let dist = Math.hypot(x - cx, y - cy);
        if (dist >= radius) return 0;
        let inner = radius * (1 - feather);
        if (dist <= inner) return 1;
        return 1 - (dist - inner) / Math.max(1, radius * feather);
    }

    _morphedLandmarkPoint(data, m, key) {
        let o = (data.other.landmarks || {})[key];
        let t = (data.target.landmarks || {})[key];
        let po = o && o.points && o.points[0];
        let pt = t && t.points && t.points[0];
        if (!po && !pt) return null;
        if (!po) return { x: pt.x, y: pt.y };
        if (!pt) return { x: po.x, y: po.y };
        return { x: po.x + (pt.x - po.x) * m, y: po.y + (pt.y - po.y) * m };
    }

    _prepareLayerMorphPair(target, other) {
        if (!target.regions || !other.regions) return false;
        this._copyRegionBoundary(target, "head_shell");
        this._copyRegionBoundary(other, "head_shell");
        if (target.regions.crown) this._copyRegionBoundary(target, "crown");
        if (other.regions.crown) this._copyRegionBoundary(other, "crown");
        return true;
    }

    _layerMorphCrownCenter(data, m, eyeSpan) {
        let boundary = this._interpolatedRegionBoundary(data, m, "crown");
        if (boundary && boundary.length) {
            let cx = 0;
            let cy = 0;
            boundary.forEach((p) => {
                cx += p.x;
                cy += p.y;
            });
            return { x: cx / boundary.length, y: cy / boundary.length };
        }
        let topL = this._morphedLandmarkPoint(data, m, "outline_top_left");
        let topR = this._morphedLandmarkPoint(data, m, "outline_top_right");
        if (topL && topR) {
            return { x: (topL.x + topR.x) / 2, y: (topL.y + topR.y) / 2 };
        }
        let brow = this._morphedLandmarkPoint(data, m, "brow_mid");
        if (brow) return { x: brow.x, y: brow.y - eyeSpan * 0.55 };
        return null;
    }

    _buildLayerMorphZones(data, m) {
        let anchors = this._morphedAnchors(data, m);
        let L = anchors.leftEye;
        let R = anchors.rightEye;
        let M = anchors.mouth;
        if (!L || !R) return [];
        let eyeSpan = Math.max(12, Math.hypot(R.x - L.x, R.y - L.y));
        let feather = Math.max(0.08, Math.min(0.65, this._num("layerMorphFeather", 0.38)));
        let zones = [
            {
                x: L.x,
                y: L.y,
                r: eyeSpan * this._num("layerMorphEyeRadiusFrac", 0.36),
                feather
            },
            {
                x: R.x,
                y: R.y,
                r: eyeSpan * this._num("layerMorphEyeRadiusFrac", 0.36),
                feather
            }
        ];
        if (M) {
            zones.push({
                x: M.x,
                y: M.y,
                r: eyeSpan * this._num("layerMorphMouthRadiusFrac", 0.44),
                feather
            });
        }
        let nose = this._morphedLandmarkPoint(data, m, "nose");
        if (nose) {
            zones.push({
                x: nose.x,
                y: nose.y,
                r: eyeSpan * this._num("layerMorphNoseRadiusFrac", 0.26),
                feather
            });
        }
        let crown = this._layerMorphCrownCenter(data, m, eyeSpan);
        if (crown) {
            zones.push({
                x: crown.x,
                y: crown.y,
                r: eyeSpan * this._num("layerMorphCrownRadiusFrac", 0.52),
                feather: feather * 0.92
            });
        }
        return zones;
    }

    _pointToSegmentDistance(px, py, x0, y0, x1, y1) {
        let dx = x1 - x0;
        let dy = y1 - y0;
        let len2 = dx * dx + dy * dy;
        if (len2 < 1e-8) return Math.hypot(px - x0, py - y0);
        let t = ((px - x0) * dx + (py - y0) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
    }

    _distanceToPolygonBoundary(x, y, poly) {
        let minD = Infinity;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            let d = this._pointToSegmentDistance(x, y, poly[j].x, poly[j].y, poly[i].x, poly[i].y);
            if (d < minD) minD = d;
        }
        return minD;
    }

    _outlineRingWeight(x, y, boundary, width, feather) {
        let dist = this._distanceToPolygonBoundary(x + 0.5, y + 0.5, boundary);
        if (dist > width + feather) return 0;
        if (dist <= width) return 1;
        return 1 - (dist - width) / Math.max(1, feather);
    }

    _composeSingularZones(warpA, warpB, dest, zones) {
        if (!zones || !zones.length) return;
        let size = dest.width;
        let ctxA = warpA.getContext("2d", { willReadFrequently: true });
        let ctxB = warpB.getContext("2d", { willReadFrequently: true });
        let ctxD = dest.getContext("2d", { willReadFrequently: true });
        let a = ctxA.getImageData(0, 0, size, size);
        let b = ctxB.getImageData(0, 0, size, size);
        let d = ctxD.getImageData(0, 0, size, size);
        let pa = a.data;
        let pb = b.data;
        let po = d.data;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let w = 0;
                for (let zi = 0; zi < zones.length; zi++) {
                    let z = zones[zi];
                    w = Math.max(w, this._landmarkZoneWeight(x, y, z.x, z.y, z.r, z.feather));
                }
                if (w <= 0) continue;
                let i = (y * size + x) * 4;
                let aA = pa[i + 3];
                let aB = pb[i + 3];
                if (aA < 8 && aB < 8) continue;
                let sa = pa[i] * aA + pa[i + 1] * aA + pa[i + 2] * aA;
                let sb = pb[i] * aB + pb[i + 1] * aB + pb[i + 2] * aB;
                let pickA = aA > aB || (aA === aB && sa >= sb);
                let wr = pickA ? pa[i] : pb[i];
                let wg = pickA ? pa[i + 1] : pb[i + 1];
                let wb = pickA ? pa[i + 2] : pb[i + 2];
                let wa = pickA ? aA : aB;
                po[i] = Math.round(po[i] + (wr - po[i]) * w);
                po[i + 1] = Math.round(po[i + 1] + (wg - po[i + 1]) * w);
                po[i + 2] = Math.round(po[i + 2] + (wb - po[i + 2]) * w);
                po[i + 3] = Math.round(po[i + 3] + (wa - po[i + 3]) * w);
            }
        }
        ctxD.putImageData(d, 0, 0);
    }

    _composeOutlineRing(warpA, warpB, dest, boundary, opts) {
        if (!boundary || boundary.length < 3) return;
        opts = opts || {};
        let size = dest.width;
        let widthFrac = opts.widthFrac != null
            ? opts.widthFrac
            : this._num("layerMorphOutlineWidthFrac", 0.022);
        let width = Math.max(2, size * widthFrac);
        let featherMul = opts.featherFrac != null
            ? opts.featherFrac
            : 1.4;
        let feather = width * featherMul;
        let bbox = this._polygonBBox(boundary);
        let minX = Math.max(0, Math.floor(bbox.minX - width - feather - 2));
        let minY = Math.max(0, Math.floor(bbox.minY - width - feather - 2));
        let maxX = Math.min(size - 1, Math.ceil(bbox.maxX + width + feather + 2));
        let maxY = Math.min(size - 1, Math.ceil(bbox.maxY + width + feather + 2));
        let ctxA = warpA.getContext("2d", { willReadFrequently: true });
        let ctxB = warpB.getContext("2d", { willReadFrequently: true });
        let ctxD = dest.getContext("2d", { willReadFrequently: true });
        let a = ctxA.getImageData(0, 0, size, size);
        let b = ctxB.getImageData(0, 0, size, size);
        let d = ctxD.getImageData(0, 0, size, size);
        let pa = a.data;
        let pb = b.data;
        let po = d.data;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                let w = this._outlineRingWeight(x, y, boundary, width, feather);
                if (w <= 0) continue;
                let i = (y * size + x) * 4;
                let aA = pa[i + 3];
                let aB = pb[i + 3];
                if (aA < 8 && aB < 8) continue;
                let sa = pa[i] * aA + pa[i + 1] * aA + pa[i + 2] * aA;
                let sb = pb[i] * aB + pb[i + 1] * aB + pb[i + 2] * aB;
                let pickA;
                if (opts.parent === "other") pickA = true;
                else if (opts.parent === "target") pickA = false;
                else pickA = aA > aB || (aA === aB && sa >= sb);
                let ringStrength = opts.strength != null ? Math.max(0, Math.min(1, opts.strength)) : 1;
                w *= ringStrength;
                if (w <= 0) continue;
                let wr = pickA ? pa[i] : pb[i];
                let wg = pickA ? pa[i + 1] : pb[i + 1];
                let wb = pickA ? pa[i + 2] : pb[i + 2];
                let wa = pickA ? aA : aB;
                po[i] = Math.round(po[i] + (wr - po[i]) * w);
                po[i + 1] = Math.round(po[i + 1] + (wg - po[i + 1]) * w);
                po[i + 2] = Math.round(po[i + 2] + (wb - po[i + 2]) * w);
                po[i + 3] = Math.round(po[i + 3] + (wa - po[i + 3]) * w);
            }
        }
        ctxD.putImageData(d, 0, 0);
    }

    _composeLandmarkWarped(warpA, warpB, m, dest, data) {
        let size = dest.width;
        this._lerpCanvases(warpA, warpB, m, dest);
        let anchors = this._morphedAnchors(data, m);
        if (!anchors.leftEye || !anchors.rightEye || !anchors.mouth) return;

        let L = anchors.leftEye;
        let R = anchors.rightEye;
        let M = anchors.mouth;
        let eyeSpan = Math.max(12, Math.hypot(R.x - L.x, R.y - L.y));
        let eyeR = eyeSpan * this._num("meshLandmarkEyeRadiusFrac", 0.36);
        let mouthR = eyeSpan * this._num("meshLandmarkMouthRadiusFrac", 0.44);
        let feather = Math.max(0.08, Math.min(0.65, this._num("meshLandmarkFeather", 0.38)));
        this._composeSingularZones(warpA, warpB, dest, [
            { x: L.x, y: L.y, r: eyeR, feather },
            { x: R.x, y: R.y, r: eyeR, feather },
            { x: M.x, y: M.y, r: mouthR, feather }
        ]);
    }

    _composeFeatureAnchoredLandmarks(warpA, warpB, m, dest, data) {
        this._lerpCanvases(warpA, warpB, m, dest);
        let anchors = this._morphedAnchors(data, m);
        if (!anchors.leftEye || !anchors.rightEye || !anchors.mouth) return;

        let M = anchors.mouth;
        let eyeSpan = Math.max(12, Math.hypot(
            anchors.rightEye.x - anchors.leftEye.x,
            anchors.rightEye.y - anchors.leftEye.y
        ));
        let mouthR = eyeSpan * this._num("meshLandmarkMouthRadiusFrac", 0.44);
        let mouthFeather = Math.max(0.08, Math.min(0.65, this._num("meshLandmarkFeather", 0.38)));
        let zones = [{ x: M.x, y: M.y, r: mouthR, feather: mouthFeather }];
        let brow = this._morphedLandmarkPoint(data, m, "brow_mid");
        if (brow) {
            let browR = eyeSpan * this._num("featureAnchoredBrowRadiusFrac", 0.24);
            let browFeather = Math.max(0.08, Math.min(0.55, this._num("featureAnchoredBrowFeather", 0.3)));
            zones.push({
                x: brow.x,
                y: brow.y - eyeSpan * 0.08,
                r: browR,
                feather: browFeather
            });
        }
        this._composeSingularZones(warpA, warpB, dest, zones);
    }

    _featureAnchoredOutlineWeight(m) {
        let bell = 4 * m * (1 - m);
        return 0.72 + 0.28 * bell;
    }

    _composeFeatureAnchoredOutlines(data, m, warps, dest, profile) {
        profile = profile || {};
        let headA = data.headTarget || (this.morphRenderTrial && this.morphRenderTrial.targetFen
            && this.morphRenderTrial.targetFen.head);
        let headB = data.headOther || (this.morphRenderTrial && this.morphRenderTrial.otherFen
            && this.morphRenderTrial.otherFen.head);
        let outlineWeight = this._featureAnchoredOutlineWeight(m);
        let outlineOpts = {
            widthFrac: this._num("featureAnchoredOutlineWidthFrac", 0.034),
            featherFrac: this._num("featureAnchoredOutlineFeatherFrac", 0.72)
        };
        let entries = [];
        [
            { side: "target", head: headA },
            { side: "other", head: headB }
        ].forEach(({ side, head }) => {
            this._headHeroOutlineEntries(head).forEach((entry) => {
                entries.push(Object.assign({ side }, entry));
            });
        });

        if (!entries.length) {
            let shell = this._interpolatedRegionBoundary(data, m, "head_shell");
            if (shell) {
                this._composeOutlineRing(warps.warpA, warps.warpB, dest, shell, outlineOpts);
            }
            return;
        }

        entries.forEach((entry) => {
            let src = entry.side === "target" ? data.target : data.other;
            let boundary = src && src["regionBoundary_" + (entry.role || "head_shell")];
            if (!boundary || !boundary.length) return;
            let strength = outlineWeight * (entry.strength != null ? Number(entry.strength) : 0.8);
            this._composeOutlineRing(warps.warpA, warps.warpB, dest, boundary, Object.assign({}, outlineOpts, {
                strength,
                parent: entry.side
            }));
        });
    }

    _featureAnchoredOutlineShellMix(data, m, profile) {
        profile = profile || {};
        if (profile.outlineShellMix != null && Number.isFinite(Number(profile.outlineShellMix))) {
            return Math.max(0, Math.min(1, Number(profile.outlineShellMix)));
        }
        let bias = profile.outlineShellBias;
        let headA = data.headTarget || (this.morphRenderTrial && this.morphRenderTrial.targetFen
            && this.morphRenderTrial.targetFen.head);
        let headB = data.headOther || (this.morphRenderTrial && this.morphRenderTrial.otherFen
            && this.morphRenderTrial.otherFen.head);
        let outlineHero = this.params.headOutlineHero || {};
        let cloudKey = this._normalizeHeadRoleKey("cloud");
        let targetKey = this._normalizeHeadRoleKey(headA);
        let otherKey = this._normalizeHeadRoleKey(headB);
        let cloudSide = null;
        if (targetKey === cloudKey) cloudSide = "target";
        else if (otherKey === cloudKey) cloudSide = "other";
        if (!bias && cloudSide && outlineHero[cloudKey]) {
            bias = "cloud";
        }
        if (!bias) return m;
        let mix = this._num("featureAnchoredOutlineShellMix", 0.38);
        if (bias === "cloud" && cloudSide) {
            return cloudSide === "target" ? mix : 1 - mix;
        }
        if (bias === "target") return mix;
        if (bias === "other") return 1 - mix;
        let biasKey = this._normalizeHeadRoleKey(bias);
        if (biasKey === targetKey) return mix;
        if (biasKey === otherKey) return 1 - mix;
        return m;
    }

    _pruneAlphaSpecks(canvas, minNeighbors) {
        minNeighbors = Math.max(2, Math.round(minNeighbors || 4));
        let size = canvas.width;
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        let img = ctx.getImageData(0, 0, size, size);
        let p = img.data;
        let copy = new Uint8ClampedArray(p);
        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                let i = (y * size + x) * 4;
                if (copy[i + 3] < 20) continue;
                let n = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (!dx && !dy) continue;
                        let j = ((y + dy) * size + (x + dx)) * 4;
                        if (copy[j + 3] >= 48) n++;
                    }
                }
                if (n < minNeighbors) p[i + 3] = 0;
            }
        }
        ctx.putImageData(img, 0, 0);
    }

    _renderLayerMorph(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.meshData || this.morphPair;
        if (!dest || !data) return;
        let warps = this._drawDualMeshWarps(data, m, dest.width);
        if (!warps) {
            this._lerpCanvases(data.other.canvas, data.target.canvas, m, dest);
            return;
        }
        this._lerpCanvases(warps.warpA, warps.warpB, m, dest);
        let zones = this._buildLayerMorphZones(data, m);
        this._composeSingularZones(warps.warpA, warps.warpB, dest, zones);
        let shell = this._interpolatedRegionBoundary(data, m, "head_shell");
        if (shell) this._composeOutlineRing(warps.warpA, warps.warpB, dest, shell);
        this._sealAlphaCracks(dest, 2);
    }

    _prepareCompositePair(target, other, landmarkSlots) {
        if (!target.regions || !other.regions
            || !target.regions.head_shell || !other.regions.head_shell) {
            return null;
        }
        if (!this._copyRegionBoundary(target, "head_shell")
            || !this._copyRegionBoundary(other, "head_shell")) {
            return null;
        }

        let threshold = Math.max(1, Math.min(255, Math.round(this._num("meshAlphaThreshold", 18))));
        let regionData = { head_shell: { maskOnly: true } };
        let compositeMeta = {};
        let overlayRoles = [];

        let noteLayer = (layer, opts) => {
            let hasO = this._canvasHasOpaque(target.compositeLayers && target.compositeLayers[layer], threshold);
            let hasT = this._canvasHasOpaque(other.compositeLayers && other.compositeLayers[layer], threshold);
            if (!hasO && !hasT) return;
            let meta = Object.assign({
                hasOther: hasO,
                hasTarget: hasT,
                warp: "global",
                singular: false,
                regionWarp: false
            }, opts || {});
            if (hasO && hasT) {
                meta.paired = true;
                meta.single = null;
            } else if (hasT) {
                meta.paired = false;
                meta.single = "target";
            } else {
                meta.paired = false;
                meta.single = "other";
            }
            compositeMeta[layer] = meta;
        };

        noteLayer("shell", { singular: false });

        const setupPairedOverlay = (role) => {
            if (!this._copyRegionBoundary(target, role)
                || !this._copyRegionBoundary(other, role)) {
                return false;
            }
            let ptsO = this._regionOverlayMeshPointsFromBoundary(other, role);
            let ptsT = this._regionOverlayMeshPointsFromBoundary(target, role);
            if (!ptsO || !ptsT || ptsO.length !== ptsT.length) return false;
            let boundaryCount = ptsO.length - 1;
            let centroidIndex = boundaryCount;
            let triangles = this._overlayMeshTriangles(boundaryCount, centroidIndex, ptsO);
            if (!triangles.length) return false;
            other["regionPoints_" + role] = ptsO;
            target["regionPoints_" + role] = ptsT;
            regionData[role] = { triangles, paired: true, boundaryCount };
            return true;
        };

        const setupSingleOverlay = (role, side) => {
            let src = side === "target" ? target : other;
            if (!this._copyRegionBoundary(src, role)) return false;
            let pts = this._regionOverlayMeshPointsFromBoundary(src, role);
            if (!pts) return false;
            let boundaryCount = pts.length - 1;
            let centroidIndex = boundaryCount;
            let triangles = this._overlayMeshTriangles(boundaryCount, centroidIndex, pts);
            if (!triangles.length) return false;
            src["regionPoints_" + role] = pts;
            regionData[role] = { triangles, single: side, boundaryCount };
            return true;
        };

        noteLayer("eyes", { singular: true });
        noteLayer("nose", { singular: true });
        noteLayer("mouth", { singular: true });

        ["ear_left", "ear_right", "crown"].forEach((role) => {
            let hasO = this._canvasHasOpaque(target.compositeLayers && target.compositeLayers[role], threshold);
            let hasT = this._canvasHasOpaque(other.compositeLayers && other.compositeLayers[role], threshold);
            if (!hasO && !hasT) return;
            let regional = false;
            if (hasO && hasT) {
                regional = setupPairedOverlay(role);
            } else if (hasT) {
                regional = setupSingleOverlay(role, "target");
            } else {
                regional = setupSingleOverlay(role, "other");
            }
            if (regional) overlayRoles.push(role);
            noteLayer(role, { singular: false, regionWarp: regional });
        });

        if (!compositeMeta.shell) return null;

        return {
            regionData,
            compositeMeta,
            baseRole: "head_shell",
            overlayRoles
        };
    }

    _drawDualLayerMeshWarps(data, m, size, layer) {
        let patch = {
            other: Object.assign({}, data.other, {
                canvas: this._compositeLayerCanvas(data.other, layer, size)
            }),
            target: Object.assign({}, data.target, {
                canvas: this._compositeLayerCanvas(data.target, layer, size)
            }),
            triangles: data.triangles
        };
        return this._drawDualMeshWarps(patch, m, size);
    }

    _drawDualRegionWarpsOnLayers(data, m, size, role) {
        let patch = {
            other: Object.assign({}, data.other, {
                canvas: this._compositeLayerCanvas(data.other, role, size)
            }),
            target: Object.assign({}, data.target, {
                canvas: this._compositeLayerCanvas(data.target, role, size)
            }),
            regionData: data.regionData
        };
        return this._drawDualRegionWarps(patch, m, size, role);
    }

    _compositeLayerAlpha(meta, m) {
        if (!meta) return 0;
        if (meta.paired) return 1;
        if (meta.single === "target") return m;
        if (meta.single === "other") return 1 - m;
        return 0;
    }

    _compositeFeatureFrame(src, layer) {
        let a = (src && src.anchors) || {};
        let L = a.leftEye;
        let R = a.rightEye;
        let M = a.mouth;
        let eyeSpan = (L && R) ? Math.max(12, Math.hypot(R.x - L.x, R.y - L.y)) : 48;
        if (layer === "eyes" && L && R) {
            return {
                x: (L.x + R.x) / 2,
                y: (L.y + R.y) / 2,
                span: eyeSpan,
                angle: Math.atan2(R.y - L.y, R.x - L.x)
            };
        }
        if (layer === "mouth" && M) {
            return { x: M.x, y: M.y, span: eyeSpan * 0.44, angle: 0 };
        }
        if (layer === "nose") {
            let nose = (src.landmarks || {}).nose;
            let p = nose && nose.points && nose.points[0];
            if (!p) return null;
            return { x: p.x, y: p.y, span: eyeSpan * 0.26, angle: 0 };
        }
        return null;
    }

    _morphedCompositeFrame(data, m, layer) {
        let o = this._compositeFeatureFrame(data.other, layer);
        let t = this._compositeFeatureFrame(data.target, layer);
        if (!o && !t) return null;
        if (!o) return { x: t.x, y: t.y, span: t.span, angle: t.angle };
        if (!t) return { x: o.x, y: o.y, span: o.span, angle: o.angle };
        let da = t.angle - o.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        return {
            x: o.x + (t.x - o.x) * m,
            y: o.y + (t.y - o.y) * m,
            span: o.span + (t.span - o.span) * m,
            angle: o.angle + da * m
        };
    }

    _blitAnchoredLayer(destCanvas, sourceCanvas, srcFrame, dstFrame) {
        if (!sourceCanvas || !srcFrame || !dstFrame) return;
        let ctx = destCanvas.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        let scale = dstFrame.span / Math.max(1, srcFrame.span);
        ctx.save();
        ctx.translate(dstFrame.x, dstFrame.y);
        ctx.rotate(dstFrame.angle - srcFrame.angle);
        ctx.scale(scale, scale);
        ctx.translate(-srcFrame.x, -srcFrame.y);
        ctx.drawImage(sourceCanvas, 0, 0);
        ctx.restore();
    }

    _paintCompositeSingularAnchored(data, m, dest, layer, meta) {
        let morphed = this._morphedCompositeFrame(data, m, layer);
        if (!morphed) return;

        let size = dest.width;
        let placedA = this._ensureScratchCanvas("_compositePlacedA", size, size);
        let placedB = this._ensureScratchCanvas("_compositePlacedB", size, size);
        [placedA, placedB].forEach((c) => {
            let ctx = c.getContext("2d");
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, size, size);
        });

        let frameO = this._compositeFeatureFrame(data.other, layer);
        let frameT = this._compositeFeatureFrame(data.target, layer);
        if (meta.hasOther && frameO) {
            this._blitAnchoredLayer(
                placedA,
                this._compositeLayerCanvas(data.other, layer, size),
                frameO,
                morphed
            );
        }
        if (meta.hasTarget && frameT) {
            this._blitAnchoredLayer(
                placedB,
                this._compositeLayerCanvas(data.target, layer, size),
                frameT,
                morphed
            );
        }

        let scratch = this._ensureScratchCanvas("_compositeBlend", size, size);
        let sctx = scratch.getContext("2d");
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.clearRect(0, 0, size, size);

        if (meta.paired) {
            let zones = this._buildCompositeSingularZones(data, m, layer);
            this._composeSingularZones(placedA, placedB, scratch, zones);
        } else if (meta.single === "target") {
            sctx.drawImage(placedB, 0, 0);
        } else {
            sctx.drawImage(placedA, 0, 0);
        }

        let mask = (layer === "eyes")
            ? this._interpolatedRegionBoundary(data, m, "head_shell")
            : null;
        this._compositeRegionLayer(dest, scratch, mask, this._compositeLayerAlpha(meta, m));
    }

    _buildCompositeSingularZones(data, m, layer) {
        let anchors = this._morphedAnchors(data, m);
        let L = anchors.leftEye;
        let R = anchors.rightEye;
        let M = anchors.mouth;
        if (!L || !R) return [];
        let eyeSpan = Math.max(12, Math.hypot(R.x - L.x, R.y - L.y));
        let feather = Math.max(0.08, Math.min(0.65, this._num("layerMorphFeather", 0.38)));
        if (layer === "eyes") {
            let r = eyeSpan * this._num("layerMorphEyeRadiusFrac", 0.36);
            return [
                { x: L.x, y: L.y, r, feather },
                { x: R.x, y: R.y, r, feather }
            ];
        }
        if (layer === "mouth" && M) {
            return [{
                x: M.x,
                y: M.y,
                r: eyeSpan * this._num("layerMorphMouthRadiusFrac", 0.44),
                feather
            }];
        }
        if (layer === "nose") {
            let nose = this._morphedLandmarkPoint(data, m, "nose");
            if (!nose) return [];
            return [{
                x: nose.x,
                y: nose.y,
                r: eyeSpan * this._num("layerMorphNoseRadiusFrac", 0.26),
                feather
            }];
        }
        return [];
    }

    _paintCompositeLayer(data, m, dest, layer) {
        let meta = data.compositeMeta && data.compositeMeta[layer];
        if (!meta) return;
        let alpha = this._compositeLayerAlpha(meta, m);
        if (alpha <= 0.001) return;

        if (meta.singular && (layer === "eyes" || layer === "nose" || layer === "mouth")) {
            this._paintCompositeSingularAnchored(data, m, dest, layer, meta);
            return;
        }

        let useRegion = meta.regionWarp && data.regionData && data.regionData[layer];
        let warps = useRegion
            ? this._drawDualRegionWarpsOnLayers(data, m, dest.width, layer)
            : this._drawDualLayerMeshWarps(data, m, dest.width, layer);
        if (!warps) return;

        let scratch = this._ensureScratchCanvas("_compositeBlend", dest.width, dest.height);
        let sctx = scratch.getContext("2d");
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.globalAlpha = 1;
        sctx.globalCompositeOperation = "source-over";
        sctx.clearRect(0, 0, dest.width, dest.height);

        if (meta.paired) {
            this._lerpCanvases(warps.warpA, warps.warpB, m, scratch);
        } else if (meta.single === "target") {
            sctx.drawImage(warps.warpB, 0, 0);
        } else {
            sctx.drawImage(warps.warpA, 0, 0);
        }

        let mask = null;
        if (layer === "shell") {
            mask = this._interpolatedRegionBoundary(data, m, "head_shell");
        } else if (useRegion) {
            mask = this._interpolatedRegionBoundary(data, m, layer);
        }
        this._compositeRegionLayer(dest, scratch, mask, alpha);
    }

    _renderCompositeMorph(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.meshData || this.morphPair;
        if (!dest || !data || !data.compositeMeta) {
            this._renderLayerMorph(m);
            return;
        }

        let ctx = dest.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, dest.width, dest.height);

        MorphTaskController.compositeLayerOrder().forEach((layer) => {
            this._paintCompositeLayer(data, m, dest, layer);
        });

        if (this._num("compositeMorphOutline", 1) > 0) {
            let shell = this._interpolatedRegionBoundary(data, m, "head_shell");
            if (shell) {
                let warps = this._drawDualLayerMeshWarps(data, m, dest.width, "shell");
                if (warps) {
                    this._composeOutlineRing(warps.warpA, warps.warpB, dest, shell);
                }
            }
        }

        this._sealAlphaCracks(dest, 2);
    }

    _renderAlignedCrossfade(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.morphPair || this.meshData;
        if (!dest || !data) return;
        this._lerpCanvases(data.other.canvas, data.target.canvas, m, dest);
    }

    _interlaceCanvases(canvasOther, canvasTarget, m, dest) {
        if (!canvasOther || !canvasTarget || !dest) return;
        let size = dest.width;
        if (canvasOther.width !== size || canvasTarget.width !== size) return;
        m = Math.max(0, Math.min(1, m));
        let ctxD = dest.getContext("2d", { willReadFrequently: true });
        ctxD.setTransform(1, 0, 0, 1, 0, 0);
        ctxD.globalAlpha = 1;
        ctxD.globalCompositeOperation = "source-over";
        ctxD.clearRect(0, 0, size, size);

        if (m <= 0) {
            ctxD.drawImage(canvasOther, 0, 0);
            return;
        }
        if (m >= 1) {
            ctxD.drawImage(canvasTarget, 0, 0);
            return;
        }

        // CRT scanlines: copy whole horizontal bands from one parent, then alternate.
        let rowHeight = Math.max(1, Math.round(this._num("interlaceRowHeight", 8)));
        let phase = Math.round(this._num("interlacePhase", 0)) & 1;
        ctxD.imageSmoothingEnabled = false;

        for (let y = 0; y < size; y += rowHeight) {
            let band = Math.floor(y / rowHeight);
            let useTarget = ((band + phase) & 1) === 1;
            let src = useTarget ? canvasTarget : canvasOther;
            let h = Math.min(rowHeight, size - y);
            ctxD.drawImage(src, 0, y, size, h, 0, y, size, h);
        }
    }

    _renderInterlaceMorph(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.morphPair || this.meshData;
        if (!dest || !data) return;
        this._interlaceCanvases(data.other.canvas, data.target.canvas, m, dest);
    }

    _renderMeanShapeMorph(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.meshData || this.morphPair;
        if (!dest || !data) return;
        let warps = this._drawDualMeshWarps(data, m, dest.width, "sparsePoints");
        if (!warps) {
            this._lerpCanvases(data.other.canvas, data.target.canvas, m, dest);
            return;
        }
        this._lerpCanvases(warps.warpA, warps.warpB, m, dest);
        this._sealAlphaCracks(dest, 2);
    }

    _renderBeierNeelyMorph(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.meshData || this.morphPair;
        if (!dest || !data || !data.otherLines || !data.targetLines
            || !data.otherLines.length || data.otherLines.length !== data.targetLines.length) {
            this._renderAlignedCrossfade(m);
            return;
        }
        let size = dest.width;
        let step = Math.max(1, Math.round(this._num("beierNeelyStep", 1)));
        let aPow = Math.max(0.5, this._num("beierNeelyA", 10));
        let bPow = Math.max(0.25, this._num("beierNeelyB", 1));
        let pPow = this._num("beierNeelyP", 0);
        let morphLines = this._interpolateBeierNeelyLines(data.otherLines, data.targetLines, m);
        let ctxA = data.other.canvas.getContext("2d", { willReadFrequently: true });
        let ctxB = data.target.canvas.getContext("2d", { willReadFrequently: true });
        let ctxD = dest.getContext("2d", { willReadFrequently: true });
        let pa = ctxA.getImageData(0, 0, size, size).data;
        let pb = ctxB.getImageData(0, 0, size, size).data;
        let out = ctxD.createImageData(size, size);
        let po = out.data;
        let wB = m;
        let wA = 1 - m;
        for (let y = 0; y < size; y += step) {
            for (let x = 0; x < size; x += step) {
                let srcA = this._beierNeelySourceAt(x, y, morphLines, data.otherLines, aPow, bPow, pPow);
                let srcB = this._beierNeelySourceAt(x, y, morphLines, data.targetLines, aPow, bPow, pPow);
                let sa = this._sampleRGBA(pa, size, srcA.x, srcA.y);
                let sb = this._sampleRGBA(pb, size, srcB.x, srcB.y);
                let r = wA * sa[0] * sa[3] + wB * sb[0] * sb[3];
                let g = wA * sa[1] * sa[3] + wB * sb[1] * sb[3];
                let bl = wA * sa[2] * sa[3] + wB * sb[2] * sb[3];
                let alpha = wA * sa[3] + wB * sb[3];
                let rr = alpha > 0 ? r / alpha : 0;
                let gg = alpha > 0 ? g / alpha : 0;
                let bb = alpha > 0 ? bl / alpha : 0;
                for (let dy = 0; dy < step && y + dy < size; dy++) {
                    for (let dx = 0; dx < step && x + dx < size; dx++) {
                        let i = ((y + dy) * size + (x + dx)) * 4;
                        po[i] = rr;
                        po[i + 1] = gg;
                        po[i + 2] = bb;
                        po[i + 3] = alpha;
                    }
                }
            }
        }
        ctxD.putImageData(out, 0, 0);
        this._sealAlphaCracks(dest, 1);
    }

    _renderRefinedMesh(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.meshData || this.morphPair;
        if (!dest || !data) return;
        let warps = this._drawDualMeshWarps(data, m, dest.width);
        if (!warps) {
            this._lerpCanvases(data.other.canvas, data.target.canvas, m, dest);
            return;
        }
        this._lerpCanvases(warps.warpA, warps.warpB, m, dest);
        this._sealAlphaCracks(dest, 2);
    }

    _renderMeshRegions(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.meshData || this.morphPair;
        if (!dest || !data || !data.regionData) {
            this._renderRefinedMesh(m);
            return;
        }
        this._paintShellMeshMasked(data, m, dest);
        const overlayOrder = ["ear_left", "ear_right", "crown", "nose"];
        overlayOrder.forEach((role) => {
            let alpha = this._regionLayerAlpha(data, role, m);
            if (alpha <= 0.001) return;
            this._paintRegionOverlay(data, m, dest, role, alpha);
        });
        this._sealAlphaCracks(dest, 2);
    }

    _renderLandmarkMesh(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.meshData || this.morphPair;
        if (!dest || !data) return;
        let warps = this._drawDualMeshWarps(data, m, dest.width);
        if (!warps) {
            this._lerpCanvases(data.other.canvas, data.target.canvas, m, dest);
            return;
        }
        this._composeLandmarkWarped(warps.warpA, warps.warpB, m, dest, data);
        this._sealAlphaCracks(dest, 2);
    }

    _renderFeatureAnchoredMesh(m) {
        let dest = this.morphCanvas || this.meshCanvas;
        let data = this.meshData || this.morphPair;
        if (!dest || !data) return;
        let warps = this._drawDualMeshWarps(data, m, dest.width);
        if (!warps) {
            this._lerpCanvases(data.other.canvas, data.target.canvas, m, dest);
            return;
        }
        this._composeFeatureAnchoredLandmarks(warps.warpA, warps.warpB, m, dest, data);
        let profile = (data.shellProfile)
            || (this.morphRenderTrial && this._morphPairProfile(this.morphRenderTrial))
            || {};
        this._paintChimeraSalienceOverlays(data, m, dest, profile, warps);
        if (this._num("featureAnchoredMeshOutline", 1)) {
            this._composeFeatureAnchoredOutlines(data, m, warps, dest, profile);
        }
        this._sealAlphaCracks(dest, 2);
        this._pruneAlphaSpecks(dest, 5);
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
        if (kind !== "crossfade" && kind !== "interlace" && kind !== "mesh" && kind !== "mesh_landmark"
            && kind !== "feature_anchored_mesh" && kind !== "layer_morph" && kind !== "mesh_regions"
            && kind !== "mesh_shell" && kind !== "mean_shape" && kind !== "beier_neely"
            && kind !== "silhouette" && kind !== "composite_morph") {
            kind = "crossfade";
        }
        let ns = "http://www.w3.org/2000/svg";
        let foreign = document.createElementNS(ns, "foreignObject");
        let side = Math.min(slot.width * 0.98, slot.height * 0.98);
        let inset = Math.max(4, slot.width * 0.02);
        foreign.setAttribute("x", String(slot.x + slot.width - inset - side));
        foreign.setAttribute("y", String(slot.y + (slot.height - side) / 2));
        foreign.setAttribute("width", String(side));
        foreign.setAttribute("height", String(side));
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
            let landmarkSlots = this._sharedMorphLandmarkSlots(target, other);
            target.points = this._homologousMeshPoints(
                target, center, contourCount, innerFrac, threshold, landmarkSlots
            );
            other.points = this._homologousMeshPoints(
                other, center, contourCount, innerFrac, threshold, landmarkSlots
            );
            let triangles = null;
            let sparseTriangles = null;
            if (this._usesMeshTriangulation(kind)) {
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
            if (this._usesMeanShapeWarp(kind)) {
                target.sparsePoints = this._sparseMorphPoints(target, center, contourCount, threshold);
                other.sparsePoints = this._sparseMorphPoints(other, center, contourCount, threshold);
                let average = other.sparsePoints.map((p, i) => ({
                    x: (p.x + target.sparsePoints[i].x) / 2,
                    y: (p.y + target.sparsePoints[i].y) / 2
                }));
                sparseTriangles = this._meshDelaunay(average);
                if (!sparseTriangles.length) {
                    console.warn("MorphTask mean_shape fell back to crossfade.");
                    kind = "crossfade";
                    sparseTriangles = null;
                }
            }
            let otherLines = null;
            let targetLines = null;
            if (kind === "beier_neely") {
                otherLines = this._buildBeierNeelyLines(other, contourCount);
                targetLines = this._buildBeierNeelyLines(target, contourCount);
                if (!otherLines.length || otherLines.length !== targetLines.length) {
                    console.warn("MorphTask beier_neely fell back to crossfade.");
                    kind = "crossfade";
                    otherLines = null;
                    targetLines = null;
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
                triangles: kind === "mean_shape" ? sparseTriangles : triangles,
                otherLines,
                targetLines,
                fillGray,
                renderer: kind,
                headTarget: trial.targetFen.head,
                headOther: trial.otherFen.head
            };
            if (this._usesLayerMorph(kind)) {
                this._prepareLayerMorphPair(target, other);
            }
            if (this._usesCompositeMorph(kind)) {
                target.compositeLayers = await this._buildCompositeLayerSet(
                    trial.targetFen, schemes.target, size
                );
                other.compositeLayers = await this._buildCompositeLayerSet(
                    trial.otherFen, schemes.other, size
                );
                let compositeSetup = this._prepareCompositePair(target, other, landmarkSlots);
                if (!compositeSetup) {
                    console.warn("MorphTask composite_morph fell back to layer_morph (missing head_shell).");
                    kind = "layer_morph";
                    pair.renderer = kind;
                    this._prepareLayerMorphPair(target, other);
                } else {
                    Object.assign(pair, compositeSetup);
                }
            }
            if (this._usesMeshRegions(kind)) {
                let regionSetup = this._prepareMeshRegionsPair(target, other, landmarkSlots);
                if (!regionSetup) {
                    console.warn("MorphTask mesh_regions fell back to mesh (missing head_shell regions).");
                    kind = "mesh";
                    pair.renderer = kind;
                    let average = other.points.map((p, i) => ({
                        x: (p.x + target.points[i].x) / 2,
                        y: (p.y + target.points[i].y) / 2
                    }));
                    pair.triangles = this._meshDelaunay(average);
                } else {
                    Object.assign(pair, regionSetup);
                }
            }
            if (this._usesMeshShell(kind)) {
                let profile = this._morphPairProfile(trial);
                let shellSetup = this._prepareMeshShellPair(target, other, profile);
                if (!shellSetup) {
                    console.warn("MorphTask mesh_shell fell back to layer_morph (missing head_shell regions).");
                    kind = "layer_morph";
                    pair.renderer = kind;
                    this._prepareLayerMorphPair(target, other);
                } else {
                    Object.assign(pair, shellSetup);
                }
            }
            if (this._usesFeatureAnchoredMesh(kind)) {
                let profile = this._morphPairProfile(trial);
                let anchoredSetup = this._prepareFeatureAnchoredPair(
                    target, other, profile, trial.targetFen.head, trial.otherFen.head
                );
                if (!anchoredSetup) {
                    console.warn("MorphTask feature_anchored_mesh fell back to mesh_landmark (missing head_shell).");
                    kind = "mesh_landmark";
                    pair.renderer = kind;
                } else {
                    Object.assign(pair, anchoredSetup);
                    pair.shellProfile = profile;
                }
            }
            this.morphRenderTrial = trial;
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
        this._fitNodeInBox(this.otherIcon, slot, 0.78, 0.72, "right");
        this._fitNodeInBox(this.targetIcon, slot, 0.78, 0.72, "right");
        this._applyMorph(this._mixWeight(trial));
        group.style.opacity = "1";
        this._currentMorphLevel = this._mixWeight(trial);
        return true;
    }

    _applyMorph(m) {
        m = Math.max(0, Math.min(1, m));
        this._currentMorphLevel = m;
        let kind = this.activeRenderer || "crossfade";
        let renderM = m;
        if ((kind === "mesh_shell" || kind === "feature_anchored_mesh") && this.morphRenderTrial) {
            renderM = this._displayMixWeight(this.morphRenderTrial, m);
        }
        if (kind === "shape-crossfade") {
            if (this.targetIcon) this.targetIcon.style.opacity = String(renderM);
            if (this.otherIcon) this.otherIcon.style.opacity = String(1 - renderM);
        } else if (kind === "interlace") this._renderInterlaceMorph(renderM);
        else if (kind === "silhouette") this._renderSilhouetteMorph(renderM);
        else if (kind === "mesh_landmark") this._renderLandmarkMesh(renderM);
        else if (kind === "feature_anchored_mesh") this._renderFeatureAnchoredMesh(renderM);
        else if (kind === "layer_morph") this._renderLayerMorph(renderM);
        else if (kind === "mesh_shell") this._renderMeshShell(renderM);
        else if (kind === "composite_morph") this._renderCompositeMorph(renderM);
        else if (kind === "mesh_regions") this._renderMeshRegions(renderM);
        else if (kind === "mean_shape") this._renderMeanShapeMorph(renderM);
        else if (kind === "beier_neely") this._renderBeierNeelyMorph(renderM);
        else if (kind === "mesh") this._renderRefinedMesh(renderM);
        else this._renderAlignedCrossfade(renderM);
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
        let leftSize = this._identityIconNativeSize(keyOpts.left, leftFen);
        let rightSize = this._identityIconNativeSize(keyOpts.right, rightFen);
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

    _identityIconNativeSize(option, fen) {
        if (option && option.shape) return { width: 180, height: 180 };
        let mode = this.responseKeyIcons || "hats";
        if (mode === "names") {
            return {
                width: this._num("identityHatSlotW", 150),
                height: this._num("identityHatSlotH", 118)
            };
        }
        if (mode === "heads") return this._identityHeadNativeSize(fen);
        return this._identityHatNativeSize(fen);
    }

    _measureSvgTemplateSize(template, hideSelectors) {
        let fallback = { width: 80, height: 80 };
        if (!template) return fallback;
        let clone = template.cloneNode(true);
        if (typeof strip_svg_ids_from_subtree === "function") strip_svg_ids_from_subtree(clone);
        clone.style.display = "inherit";
        clone.setAttribute("display", "inline");
        if (hideSelectors) {
            clone.querySelectorAll(hideSelectors).forEach((el) => {
                el.setAttribute("display", "none");
                el.style.display = "none";
            });
        }
        let host = (this.layers && this.layers.Plus2) || (this.layers && this.layers.Main);
        if (!host) return fallback;
        host.appendChild(clone);
        let b = fallback;
        try { b = clone.getBBox(); } catch (e) { b = fallback; }
        clone.remove();
        if (!(b.width > 0 && b.height > 0)) return fallback;
        return { width: b.width, height: b.height };
    }

    _identityHatNativeSize(fen) {
        if (!fen || !fen.hat) return { width: 80, height: 80 };
        let hatId = "hat_" + String(fen.hat).replace(/^hat_/, "");
        return this._measureSvgTemplateSize(
            document.getElementById(hatId),
            ".invisible_element, .hat_attachment_point"
        );
    }

    _identityHeadNativeSize(fen) {
        if (!fen || !fen.head) return { width: 80, height: 80 };
        return this._measureSvgTemplateSize(document.getElementById("Fennimal_head_" + fen.head));
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
        let mode = this.responseKeyIcons || "hats";
        if (option && option.shape) this._placeShapeOnKey(col, option.shape, hatBox);
        else if (mode === "names") {
            this._placeNameOnKey(col, (option && option.label) || (fen && fen.name), hatBox);
        } else if (mode === "heads") {
            this._placeHeadOnKey(col, fen, hatBox, field.hatScale);
        } else if (fen && fen.hat) {
            this._placeHatOnKey(col, fen, hatBox, field.hatScale);
        }

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

    _placeHeadOnKey(parent, fen, box, uniformScale) {
        if (!fen || !fen.head || !box) return null;
        let display = {
            id: "morph_key_" + fen.id,
            name: "",
            head: fen.head,
            ColorScheme: { Head: this._grayscaleScheme() }
        };
        let icon = create_Fennimal_SVG_object_head_only(display, false, false);
        this._prepareFennimalIcon(icon);
        this._applyPartColors(icon, this._grayscaleScheme());
        this._applyJumbleComponentGrayscale(icon);
        icon.style.pointerEvents = "none";
        parent.appendChild(icon);
        let b = { x: -90, y: -90, width: 180, height: 180 };
        try { b = icon.getBBox(); } catch (e) { /* keep fallback */ }
        if (!(b.width > 0 && b.height > 0)) b = { x: -90, y: -90, width: 180, height: 180 };
        let scale = uniformScale != null
            ? uniformScale
            : Math.min(box.width / b.width, box.height / b.height);
        if (!Number.isFinite(scale) || scale <= 0) scale = 1;
        let cx = b.x + b.width / 2;
        let cy = b.y + b.height / 2;
        icon.setAttribute(
            "transform",
            `translate(${box.x + box.width / 2}, ${box.y + box.height / 2}) scale(${scale}) translate(${-cx}, ${-cy})`
        );
        return icon;
    }

    _placeNameOnKey(parent, name, box) {
        let label = String(name == null ? "" : name).trim();
        if (!label || !box) return null;
        let g = create_SVG_group(0, 0, "morph_identity_name");
        g.style.pointerEvents = "none";
        let cx = box.x + box.width / 2;
        let cy = box.y + box.height / 2;
        let text = create_SVG_text_elem(cx, cy, label, undefined, undefined);
        text.classList.add("morph_identity_name_glyph");
        text.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
        text.style.fontWeight = "700";
        text.style.textAnchor = "middle";
        text.style.dominantBaseline = "central";
        text.setAttribute("fill", "#1e3a5f");
        text.style.pointerEvents = "none";
        g.appendChild(text);
        parent.appendChild(g);
        let maxSize = this._num("identityNameFontSize", 36);
        let minSize = this._num("identityNameFontSizeMin", 18);
        let size = maxSize;
        text.style.fontSize = size + "px";
        let maxW = Math.max(12, box.width - 12);
        try {
            while (size > minSize && text.getComputedTextLength() > maxW) {
                size -= 1;
                text.style.fontSize = size + "px";
            }
        } catch (e) { /* keep maxSize */ }
        return g;
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

    _paidIdentityCoachText() {
        let mode = this.responseKeyIcons || "hats";
        if (mode === "heads") {
            return this.params.paidIdentityCoachHeads
                || "F and J represent two heads. Your task is to select the head of the Fennimal that is most visible in the blurred part of the photo.";
        }
        if (mode === "names") {
            return this.params.paidIdentityCoachNames
                || "F and J show two names. Your task is to select the name of the Fennimal that is most visible in the blurred part of the photo.";
        }
        return this.params.paidIdentityCoachHats
            || "F and J represent two hats. Your task is to select the hat which belongs to which Fennimal is most visible in the blurred part of the photo.";
    }

    async _showPaidIdentityBubbles() {
        await this._showBubble(
            this.identityKeyF || this.identityKeysGroup,
            this._paidIdentityCoachText()
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
            response_key_icons: this.responseKeyIcons || "hats",
            show_head_on_prime: this.showHeadOnPrime !== false,
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
