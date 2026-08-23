/**
 * Chimera feature-identification DV: speeded name choice while a Fennimal
 * (or a close-up) is revealed on an indoor polaroid.
 * Scoring is hidden; the HUD never reflects accuracy.
 *
 * Trial specs use Fennimal ids (A, B, C, D1, D2), not design-doc roles.
 * Name buttons come from phase.names_options, always unioned with every
 * trial answer so no paid trial can lack a valid name.
 *
 * Reveal modes (phase.reveal_mode):
 *   "blur-silhouette" — black silhouette + Gaussian blur, unblur + colour fade
 *   "patchy-holes"    — Gosselin & Schyns (2001, Vision Research) "bubbles"
 *   "patchy-holes-with-pixalation" — same bubbles plus a coarse-to-fine mosaic
 *
 * Reveal curve (phase.reveal_profile, else GenParam.ChimeraFeatureId.revealProfile):
 *   "lingering" — longer ambiguous-but-possible window (default)
 *   "steep"     — original knife-edge curve (backup)
 *
 * LEAD-LAG PRINT (do not collapse this back to a whole-object reveal)
 * ------------------------------------------------------------------
 * The polaroid is one photo, but prime and target do not print together.
 * Perception of the cue takes time; the DV is whether that cue then
 * facilitates the questioned feature.
 *
 *   prime  = body or head (the cue). Prints from "?" and is fully clear at
 *            GenParam.ChimeraFeatureId.primeEndFrac of trial_speed (default 0.40).
 *   target = trial.target (head / body / hat named by the question). Stays
 *            under an undeveloped-photo veil until targetLagFrac (default 0.35),
 *            then prints with the SAME outline-breaking tactics as the prime
 *            (bubbles / mosaic / colour), not a fading silhouette.
 *
 * Hats sit on the head, so the veil is clipped to the SVG part, not to a
 * screen region. Stranger faces on hat+body trials print with the prime.
 * Name choices: 5 per paid trial. Any on-screen Fennimal identity that is
 * not the correct answer is omitted (mismatch rule), so "whoever I can
 * see owns this" is not clickable. True-identity photos then drop one
 * extra name at random so chance rate stays 1/5.
 *
 * Clocks: until target lag, bars and points are frozen (bars pulse) and
 * name buttons stay locked. From target print they count down over a fresh
 * trial_speed window (5s in the test block). Practice / no-prime: clock from "?".
 * Logged RTs: reaction_time_ms from "?"; reaction_time_from_target_onset_ms
 * from target print (negative if they answered before the target appeared).
 */
class ChimeraFeatureIdController {
    constructor(parentLayer, phaseData, returnfunc, expCont) {
        this.ParentLayer = parentLayer;
        this.phaseData = phaseData;
        this.returnfunc = returnfunc;
        this.expCont = expCont;
        let base = (typeof GenParam !== "undefined" && GenParam.ChimeraFeatureId) || {};
        this.revealProfile = this._resolveRevealProfile(base);
        this.params = Object.assign({}, base, (base.revealProfiles && base.revealProfiles[this.revealProfile]) || {});
        this.W = GenParam.SVG_width;
        this.H = GenParam.SVG_height;

        this.fensById = this._indexFennimals(expCont && expCont.stimuli);
        this.trialSpecs = this._readTrialSpecs();
        this.roster = this._buildRoster();
        this.revealMode = this._resolveRevealMode();
        this.trialSpeedMs = this._resolveTrialSpeed();
        this.strangerHeads = this._assignStrangerHeads();
        this.buttonOrderIds = this._assignButtonOrder();
        this.queue = this._buildTrialQueue();
        this.holeLayouts = this._assignHoleLayouts();

        this.answers = [];
        this.sessionPoints = 0;
        this.destroyed = false;
        this.inputLocked = true;
        this.revealRaf = null;
        this.sceneRoot = null;
        this.layers = null;
        this.currentTrial = null;
        this.currentTrialIndex = -1;
        this.prevTrial = null;
        this.holeCircles = [];
        this.holeOverlay = null;
        this.patchyMask = null;

        this.phaseData.answers = this.answers;
        this.phaseData.reveal_mode = this.revealMode;
        this.phaseData.reveal_profile = this.revealProfile;
        this.phaseData.trial_speed = this.trialSpeedMs;
        this.phaseData.chimera_stranger_heads = this.strangerHeads;
        this.phaseData.chimera_button_order = this.buttonOrderIds;
        this.phaseData.chimera_names_options = this.roster.map((fen) => fen.id);
        this.phaseData.chimera_trial_order = this.queue.map((t) => t.id);
        this.phaseData.lead_lag = {
            prime_end_frac: this.params.primeEndFrac != null ? this.params.primeEndFrac : 0.40,
            target_lag_frac: this.params.targetLagFrac != null ? this.params.targetLagFrac : 0.35,
            note: "Prime prints first; target stays veiled until target_lag_frac of trial_speed. RTs: reaction_time_ms from ?, reaction_time_from_target_onset_ms from target print."
        };
    }

    _fail(message) {
        throw new Error("ChimeraFeatureId: " + message);
    }

    _resolveTrialSpeed() {
        let raw = this.phaseData.trial_speed;
        if (raw === undefined || raw === null || raw === "") {
            raw = this.params.revealMs != null ? this.params.revealMs : 2000;
        }
        let ms = Number(raw);
        if (!Number.isFinite(ms) || ms <= 0) {
            this._fail(`trial_speed must be a positive number of milliseconds (got "${this.phaseData.trial_speed}").`);
        }
        return ms;
    }

    _resolveRevealMode() {
        let allowed = ["blur-silhouette", "patchy-holes", "patchy-holes-with-pixalation"];
        let mode = this.phaseData.reveal_mode || "blur-silhouette";
        if (!allowed.includes(mode)) {
            this._fail(`reveal_mode must be ${allowed.map((m) => `"${m}"`).join(" | ")} (got "${mode}").`);
        }
        return mode;
    }

    _resolveRevealProfile(base) {
        let profiles = (base && base.revealProfiles) || {};
        let names = Object.keys(profiles);
        let name = (this.phaseData && this.phaseData.reveal_profile) || (base && base.revealProfile) || "lingering";
        if (names.length && names.indexOf(name) < 0) {
            this._fail(`reveal_profile must be ${names.map((n) => `"${n}"`).join(" | ")} (got "${name}").`);
        }
        return name;
    }

    _usesPatchyHoles() {
        return this.revealMode === "patchy-holes" || this.revealMode === "patchy-holes-with-pixalation";
    }

    _usesPixelation() {
        return this.revealMode === "patchy-holes-with-pixalation";
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

    _assignHoleLayouts() {
        let count = this.params.patchyHoleCount != null ? this.params.patchyHoleCount : 4;
        let existing = this._readRandomization("chimera_hole_layouts");
        if (existing && existing.layouts && typeof existing.layouts === "object") {
            let sameCount = existing.count === count;
            let sameProfile = existing.profile === this.revealProfile;
            let ok = sameCount && sameProfile && this.queue.every((t) => Array.isArray(existing.layouts[t.id]) && existing.layouts[t.id].length === count);
            if (ok) return existing.layouts;
        }

        let layouts = {};
        this.queue.forEach((trial) => {
            layouts[trial.id] = this._drawHolePositions(count);
        });
        this._persistRandomization("chimera_hole_layouts", {
            layouts,
            count,
            profile: this.revealProfile
        });
        return layouts;
    }

    _drawHolePositions(count) {
        let holes = [];
        let minDist = Math.min(0.36, 0.68 / Math.sqrt(Math.max(1, count)));
        let stagger = this.params.patchyHoleStagger != null ? this.params.patchyHoleStagger : 0;
        let scales = this.params.patchyHoleScales;
        for (let n = 0; n < count; n++) {
            let placed = null;
            for (let attempt = 0; attempt < 80; attempt++) {
                let u = 0.18 + Math.random() * 0.64;
                let v = 0.18 + Math.random() * 0.64;
                let far = holes.every((h) => {
                    let du = h.u - u;
                    let dv = h.v - v;
                    return (du * du + dv * dv) >= (minDist * minDist);
                });
                if (far || holes.length === 0) {
                    placed = { u, v };
                    break;
                }
            }
            let scale = 1;
            if (Array.isArray(scales) && scales.length) {
                scale = scales[n % scales.length];
            }
            holes.push({
                u: placed ? placed.u : (0.18 + Math.random() * 0.64),
                v: placed ? placed.v : (0.18 + Math.random() * 0.64),
                scale: scale,
                delay: count <= 1 ? 0 : stagger * n / (count - 1)
            });
        }
        return holes;
    }

    _holeRecord(hole, el, hx, hy) {
        return {
            el: el,
            cx: hx,
            cy: hy,
            u: hole.u,
            v: hole.v,
            scale: hole.scale != null ? hole.scale : 1,
            delay: hole.delay != null ? hole.delay : 0
        };
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
        let fen = this.fensById[id];
        if (!fen) this._fail(`${path || "id"} refers to unknown Fennimal "${id}".`);
        return fen;
    }

    _buildRoster() {
        let declared = this.phaseData.names_options;
        if (declared != null && !Array.isArray(declared)) {
            this._fail("names_options must be an array of Fennimal ids.");
        }
        let roster = [];
        let seen = {};
        const add = (raw, path) => {
            if (this._isBlankToken(raw)) return;
            let fen = this._getFen(String(raw).trim(), path);
            if (seen[fen.id]) return;
            seen[fen.id] = true;
            if (!fen.name) this._fail(`${path}: Fennimal "${fen.id}" is missing a name.`);
            roster.push(fen);
        };
        (declared || []).forEach((id, i) => add(id, `names_options[${i}]`));
        (this.trialSpecs || []).forEach((spec) => {
            add(spec.answer, `trial "${spec.id}" answer`);
        });
        if (!roster.length) {
            this._fail("names_options plus trial answers produced no name buttons.");
        }
        return roster;
    }

    _fallbackBody() {
        for (let i = 0; i < (this.roster || []).length; i++) {
            if (this.roster[i] && this.roster[i].body) return this.roster[i].body;
        }
        this._fail("no Fennimal body available for close-up polaroids.");
    }

    _readTrialSpecs() {
        let specs = this.phaseData.trials;
        if (!Array.isArray(specs) || specs.length === 0) {
            this._fail("phase.trials must be a non-empty array (define the chimera trialset in stimulus settings).");
        }
        let seen = {};
        specs.forEach((spec, i) => {
            if (!spec || !spec.id) this._fail(`trials[${i}] is missing an id.`);
            if (seen[spec.id]) this._fail(`duplicate trial id "${spec.id}".`);
            seen[spec.id] = true;
        });
        return specs.slice();
    }

    _isBlankToken(token) {
        if (token == null) return true;
        let s = String(token).trim().toLowerCase();
        return s === "" || s === "none" || s === "neutral" || s === "null";
    }

    _resolveFenId(token, path) {
        if (this._isBlankToken(token)) return null;
        return this._getFen(String(token).trim(), path);
    }

    _parseQuestion(spec) {
        let raw = spec.q || spec.question || "";
        let s = String(raw).toLowerCase();
        if (s.indexOf("hat") !== -1) return { target: "hat", question: "Whose hat?" };
        if (s.indexOf("body") !== -1) return { target: "body", question: "Whose body?" };
        return { target: "head", question: "Whose head?" };
    }

    _inferPrimePart(bodyFen, target) {
        if (target === "shape") return null;
        if (!bodyFen) return target === "hat" ? "head" : null;
        if (target === "body") return "head";
        return "body";
    }

    _isFillerSpec(spec) {
        if (!spec) return false;
        if (spec.kind === "filler") return true;
        let id = String(spec.id || "");
        let role = String(spec.role || "");
        return /^fill/i.test(id) || /^filler/i.test(role);
    }

    _isFillerTrial(trial) {
        if (!trial || trial.is_practice) return false;
        if (trial.kind === "filler") return true;
        return /^fill/i.test(String(trial.id || "")) || /^filler/i.test(String(trial.role || ""));
    }

    _specNeedsStranger(spec) {
        if (!spec) return false;
        if (spec.stranger_head === true) return true;
        let hasHat = !this._isBlankToken(spec.object != null ? spec.object : spec.hat);
        let hasHead = !this._isBlankToken(spec.head);
        return hasHat && !hasHead;
    }

    _assignStrangerHeads() {
        let neededIds = (this.trialSpecs || [])
            .filter((spec) => this._specNeedsStranger(spec))
            .map((spec) => spec.id);
        if (!neededIds.length) return {};
        let key = "chimera_stranger_heads";
        let dataCont = this.expCont && this.expCont.dataCont;
        if (dataCont && dataCont.experimentData && dataCont.experimentData.phaseRandomizations) {
            let existing = dataCont.experimentData.phaseRandomizations[key];
            if (existing && existing.heads && neededIds.every((id) => existing.heads[id])) {
                return existing.heads;
            }
        }

        let leftovers = this.expCont.stimuli.get_leftover_forced_heads
            ? this.expCont.stimuli.get_leftover_forced_heads()
            : [];
        if (leftovers.length < neededIds.length) {
            this._fail(
                `need ${neededIds.length} leftover forced_heads for stranger faces, ` +
                `but only ${leftovers.length} remain (${leftovers.join(", ") || "none"}).`
            );
        }
        leftovers = shuffleArray(leftovers.slice());
        let heads = {};
        neededIds.forEach((id, i) => { heads[id] = leftovers[i]; });

        if (dataCont && dataCont.experimentData) {
            if (!dataCont.experimentData.phaseRandomizations) dataCont.experimentData.phaseRandomizations = {};
            dataCont.experimentData.phaseRandomizations[key] = { heads };
            if (typeof dataCont.storeAllData === "function") dataCont.storeAllData(false);
        }
        return heads;
    }

    _nameOptions() {
        return (this.roster || []).map((fen) => ({ id: fen.id, label: fen.name }));
    }

    _assignButtonOrder() {
        let ids = this._nameOptions().map((opt) => opt.id);
        let key = "chimera_button_order";
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

    _isFaceTrial(trial) {
        if (!trial || trial.is_practice) return false;
        if (trial.kind === "face") return true;
        return trial.role === "true_head";
    }

    _answerIds() {
        let ids = [];
        let seen = {};
        (this.trialSpecs || []).forEach((spec) => {
            if (this._isBlankToken(spec.answer)) return;
            let id = String(spec.answer).trim();
            if (seen[id]) return;
            seen[id] = true;
            ids.push(id);
        });
        return ids;
    }

    _nameOptionCount() {
        let nNames = this._nameOptions().length;
        let nAnswers = this._answerIds().length;
        return Math.max(nAnswers, Math.min(5, nNames));
    }

    _mismatchExcludeIds(trial) {
        let omit = {};
        const consider = (fen) => {
            if (!fen || !fen.id || fen.id === trial.correctId) return;
            omit[fen.id] = true;
        };
        // Prime first: "the animal I can already see" must not be clickable.
        if (trial.primePart === "body") consider(trial.bodyFen);
        else if (trial.primePart === "head") consider(trial.headFen);
        consider(trial.bodyFen);
        if (!trial.strangerHead) consider(trial.headFen);
        consider(trial.hatFen);
        return Object.keys(omit);
    }

    _lookalikeExcludeIds(trial) {
        let omit = {};
        let roster = this.roster || [];
        let target = trial && trial.target;
        roster.forEach((fen) => {
            if (!fen || !fen.id || fen.id === trial.correctId) return;
            if (target === "head" && trial.headFen && fen.head && fen.head === trial.headFen.head) {
                omit[fen.id] = true;
            }
            if (target === "hat" && trial.hatFen && fen.hat && fen.hat === trial.hatFen.hat) {
                omit[fen.id] = true;
            }
            if (target === "body" && trial.bodyFen && fen.region && fen.region === trial.bodyFen.region) {
                omit[fen.id] = true;
            }
        });
        return Object.keys(omit);
    }

    _assignNameExclusions(trial) {
        if (!trial || trial.options) return trial;
        let nameIds = this._nameOptions().map((opt) => opt.id);
        let keep = this._nameOptionCount();
        let mismatch = this._mismatchExcludeIds(trial);
        let lookalike = this._lookalikeExcludeIds(trial);
        let omit = {};
        mismatch.forEach((id) => { omit[id] = true; });
        lookalike.forEach((id) => { omit[id] = true; });
        let extra = [];
        if (!trial.is_practice && nameIds.length - Object.keys(omit).length > keep) {
            let answerLock = {};
            this._answerIds().forEach((id) => { answerLock[id] = true; });
            let remaining = nameIds.filter((id) => id !== trial.correctId && !omit[id] && !answerLock[id]);
            while (nameIds.length - Object.keys(omit).length > keep && remaining.length) {
                let pick = remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0];
                omit[pick] = true;
                extra.push(pick);
            }
        }
        trial.excludeOptionIds = Object.keys(omit);
        trial.mismatchExcludedIds = mismatch.slice();
        trial.lookalikeExcludedIds = lookalike.slice();
        trial.extraExcludedIds = extra;
        let kept = nameIds.filter((id) => !omit[id]);
        if (kept.indexOf(trial.correctId) === -1) {
            this._fail(`trial "${trial.id}" answer "${trial.correctId}" is not among the name buttons.`);
        }
        return trial;
    }

    _clonePaidTrial(trial, storedExcludes) {
        let copy = JSON.parse(JSON.stringify(trial));
        this._assignNameExclusions(copy);
        return copy;
    }

    _storedExcludesMap(existing) {
        if (!existing || !existing.excludes || typeof existing.excludes !== "object") return null;
        return existing.excludes;
    }

    _expandTrialSpec(spec) {
        let bodyFen = this._resolveFenId(spec.region, `trial "${spec.id}" region`);
        let headFen = this._resolveFenId(spec.head, `trial "${spec.id}" head`);
        let hatFen = this._resolveFenId(
            spec.object != null ? spec.object : spec.hat,
            `trial "${spec.id}" object`
        );
        let answerFen = this._resolveFenId(spec.answer, `trial "${spec.id}" answer`);
        if (!answerFen) this._fail(`trial "${spec.id}" is missing an answer.`);
        let qInfo = this._parseQuestion(spec);
        let needsStranger = this._specNeedsStranger(spec);
        let strangerHead = needsStranger ? (this.strangerHeads && this.strangerHeads[spec.id]) : null;
        if (needsStranger && !strangerHead) {
            this._fail(`trial "${spec.id}" needs a stranger head but none was assigned.`);
        }
        if (needsStranger) headFen = null;
        if (!headFen && !bodyFen) this._fail(`trial "${spec.id}" has neither a region nor a head.`);
        let kind = spec.kind || (this._isFillerSpec(spec) ? "filler" : "key");
        return {
            id: spec.id,
            role: spec.role || spec.id,
            kind,
            region_id: bodyFen ? bodyFen.id : null,
            head_id: headFen ? headFen.id : null,
            hat_id: hatFen ? hatFen.id : null,
            presentation: "polaroid",
            target: qInfo.target,
            primePart: this._inferPrimePart(bodyFen, qInfo.target),
            hostFen: bodyFen || headFen,
            bodyFen,
            headFen,
            hatFen,
            strangerHead,
            correctId: answerFen.id,
            question: qInfo.question
        };
    }

    _paidTrialsFromSpecs() {
        return (this.trialSpecs || []).map((spec) => this._expandTrialSpec(spec));
    }

    _buildTrialQueue() {
        let key = "chimera_trial_order";
        let dataCont = this.expCont && this.expCont.dataCont;
        let byId = {};
        this._paidTrialsFromSpecs().forEach((t) => {
            byId[t.id] = t;
        });

        let skipPractice = this.phaseData.skip_practice === true;
        let practice = skipPractice ? [] : [
            {
                id: "practice_square",
                role: "practice",
                is_practice: true,
                tutorial: "practice",
                presentation: "polaroid",
                target: "shape",
                primePart: null,
                shape: "square",
                question: "What shape?",
                correctId: "square",
                options: [
                    { id: "square", label: "Square" },
                    { id: "triangle", label: "Triangle" }
                ]
            },
            {
                id: "practice_triangle",
                role: "practice",
                is_practice: true,
                tutorial: false,
                presentation: "polaroid",
                target: "shape",
                primePart: null,
                shape: "triangle",
                question: "What shape?",
                correctId: "triangle",
                options: [
                    { id: "square", label: "Square" },
                    { id: "triangle", label: "Triangle" }
                ]
            }
        ];

        let paidIds = Object.keys(byId);
        if (dataCont && dataCont.experimentData && dataCont.experimentData.phaseRandomizations) {
            let existing = dataCont.experimentData.phaseRandomizations[key];
            if (existing && Array.isArray(existing.ids)) {
                let restoredPaid = existing.ids.filter((id) => byId[id]);
                let uniquePaid = restoredPaid.filter((id, i) => restoredPaid.indexOf(id) === i);
                if (
                    uniquePaid.length === paidIds.length &&
                    paidIds.every((id) => uniquePaid.indexOf(id) !== -1) &&
                    this._faceThenRestOrderOk(uniquePaid, byId)
                ) {
                    let queue = practice.concat(uniquePaid.map((id) => this._clonePaidTrial(byId[id], null)));
                    this._markFirstPaidNamesTutorial(queue);
                    this._persistTrialOrder(queue, key, dataCont);
                    return queue;
                }
            }
        }

        let paid = Object.values(byId);
        let faces = paid.filter((t) => this._isFaceTrial(t)).map((t) => this._clonePaidTrial(t, null));
        let rest = paid.filter((t) => !this._isFaceTrial(t)).map((t) => this._clonePaidTrial(t, null));
        faces = shuffleArray(faces);
        rest = shuffleArray(rest);
        let queue = practice.concat(faces, rest);
        this._markFirstPaidNamesTutorial(queue);
        this._persistTrialOrder(queue, key, dataCont);
        return queue;
    }

    _persistTrialOrder(queue, key, dataCont) {
        if (!dataCont || !dataCont.experimentData) return;
        if (!dataCont.experimentData.phaseRandomizations) dataCont.experimentData.phaseRandomizations = {};
        let excludes = {};
        (queue || []).forEach((t) => {
            if (!t || t.is_practice) return;
            excludes[t.id] = (t.excludeOptionIds || []).slice();
        });
        dataCont.experimentData.phaseRandomizations[key] = {
            ids: (queue || []).map((t) => t.id),
            excludes
        };
        if (typeof dataCont.storeAllData === "function") dataCont.storeAllData(false);
    }

    _faceThenRestOrderOk(ids, byId) {
        let faceIds = Object.keys(byId).filter((id) => this._isFaceTrial(byId[id]));
        if (!faceIds.length) return true;
        let nFace = 0;
        let sawRest = false;
        for (let i = 0; i < ids.length; i++) {
            let trial = byId[ids[i]];
            if (!trial) continue;
            if (this._isFaceTrial(trial)) {
                if (sawRest) return false;
                nFace++;
            } else {
                sawRest = true;
            }
        }
        return nFace === faceIds.length;
    }

    _rhHrPairs() {
        return [
            ["searched_key_RH", "searched_key_HR"],
            ["unsearched_key_RH", "unsearched_key_HR"]
        ];
    }

    _rhHrOrderOk(ids) {
        return this._rhHrPairs().every(([rh, hr]) => {
            let i = ids.indexOf(rh);
            let j = ids.indexOf(hr);
            if (i < 0 || j < 0) return true;
            return j >= i + 2;
        });
    }

    _orderPaidRest(restPool, firstId) {
        for (let attempt = 0; attempt < 120; attempt++) {
            let rest = shuffleArray(restPool.slice());
            let ids = [firstId].concat(rest.map((t) => t.id));
            if (this._rhHrOrderOk(ids)) return rest;
        }
        return this._repairRhHrOrder(restPool.slice(), firstId);
    }

    _repairRhHrOrder(rest, firstId) {
        let list = shuffleArray(rest);
        this._rhHrPairs().forEach(([rh, hr]) => {
            let ids = () => [firstId].concat(list.map((t) => t.id));
            let i = ids().indexOf(rh);
            let j = ids().indexOf(hr);
            if (i < 0 || j < 0) return;
            let restI = i - 1;
            let restJ = j - 1;
            let later = restJ >= 0 ? list.splice(restJ, 1)[0] : null;
            if (!later) return;
            i = ids().indexOf(rh);
            restI = i - 1;
            let minSlot = Math.max(0, restI + 2);
            if (minSlot > list.length) minSlot = list.length;
            let span = list.length - minSlot + 1;
            let slot = minSlot + Math.floor(Math.random() * Math.max(1, span));
            list.splice(Math.min(slot, list.length), 0, later);
        });
        if (!this._rhHrOrderOk([firstId].concat(list.map((t) => t.id)))) {
            this._rhHrPairs().forEach(([rh, hr]) => {
                let i = list.findIndex((t) => t.id === rh);
                let j = list.findIndex((t) => t.id === hr);
                if (i < 0 || j < 0) return;
                if (j < i) {
                    let tmp = list[i];
                    list[i] = list[j];
                    list[j] = tmp;
                    i = list.findIndex((t) => t.id === rh);
                    j = list.findIndex((t) => t.id === hr);
                }
                if (j < i + 2 && j + 1 <= list.length) {
                    let item = list.splice(j, 1)[0];
                    list.splice(Math.min(i + 2, list.length), 0, item);
                }
            });
        }
        return list;
    }

    _markFirstPaidNamesTutorial(queue) {
        (queue || []).forEach((t) => {
            if (t && !t.is_practice && t.tutorial === "names") t.tutorial = false;
        });
        let firstPaid = (queue || []).find((t) => t && !t.is_practice);
        if (firstPaid) firstPaid.tutorial = "names";
    }

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
                await this.expCont.prepareChimeraTrialTravel(this.currentTrial, this.prevTrial);
                this._setLocator();
                if (this.destroyed) return;
                await this._runTrial(this.currentTrial);
                this.prevTrial = this.currentTrial;
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
                "chimera_feature_id",
                starsEarned,
                maxStars
            );
        }
        if (typeof this.returnfunc === "function") this.returnfunc();
    }

    _ensureLayers() {
        if (this.layers) return;
        this.sceneRoot = create_SVG_group(0, 0, "chimera_feature_id_root", "chimera_feature_id_root");
        this.layers = {
            Neg1: create_SVG_group(0, 0, "chimera_layer_neg1", "chimera_layer_neg1"),
            Main: create_SVG_group(0, 0, "chimera_layer_main", "chimera_layer_main"),
            Plus1: create_SVG_group(0, 0, "chimera_layer_plus1", "chimera_layer_plus1"),
            Plus2: create_SVG_group(0, 0, "chimera_layer_plus2", "chimera_layer_plus2")
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
        this._stopReveal();
        this._teardownPatchyHoles();
        this._clearLayer(this.layers && this.layers.Neg1);
        this._clearLayer(this.layers && this.layers.Main);
        this._clearLayer(this.layers && this.layers.Plus1);
        this._clearLayer(this.layers && this.layers.Plus2);
        this.stimulusGroup = null;
        this.targetNode = null;
        this.photoWellRect = null;
        this.polaroidMount = null;
        this.occluder = null;
        this.occluderHit = null;
        this.questionEl = null;
        this.pointsEl = null;
        this.barLeft = null;
        this.barRight = null;
        this.optionButtons = [];
        this.optionLayout = [];
        this.ringAnchor = null;
        this.holeCircles = [];
        this.holeOverlay = null;
        this.patchyMask = null;
        this.patchyFilter = null;
        if (this.patchyDefs && this.patchyDefs.parentNode) this.patchyDefs.remove();
        this.patchyDefs = null;
        this._teardownTargetVeil();
        this.revealPrimeEls = [];
        this.revealTargetEl = null;
        this.leadLagHasLag = false;
        this.veilBox = null;
    }

    _paintBackdrop(trial) {
        if (trial.presentation !== "polaroid") return;
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

    _paintFog() {
        let wash = create_SVG_rect(0, 0, this.W, this.H);
        wash.setAttribute("fill", "#f4f7fb");
        wash.style.opacity = String(this.params.fogWashOpacity != null ? this.params.fogWashOpacity : 0.10);
        wash.style.pointerEvents = "none";
        this.layers.Neg1.appendChild(wash);

        let blobs = [
            { cx: 0.18, cy: 0.22, rx: 280, ry: 120 },
            { cx: 0.72, cy: 0.18, rx: 320, ry: 140 },
            { cx: 0.42, cy: 0.12, rx: 260, ry: 90 },
            { cx: 0.88, cy: 0.55, rx: 220, ry: 160 },
            { cx: 0.12, cy: 0.62, rx: 240, ry: 130 },
            { cx: 0.55, cy: 0.78, rx: 300, ry: 110 }
        ];
        blobs.forEach((b, i) => {
            let el = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            el.setAttribute("cx", String(b.cx * this.W));
            el.setAttribute("cy", String(b.cy * this.H));
            el.setAttribute("rx", String(b.rx));
            el.setAttribute("ry", String(b.ry));
            el.setAttribute("fill", "#ffffff");
            el.style.opacity = i % 2 === 0 ? "0.18" : "0.12";
            el.style.pointerEvents = "none";
            el.classList.add("chimera_fog_blob");
            el.style.animationDelay = `${i * 0.7}s`;
            this.layers.Neg1.appendChild(el);
        });
    }

    _cloneFen(fen, extra) {
        let obj = JSON.parse(JSON.stringify(fen));
        extra = extra || {};
        Object.keys(extra).forEach((k) => {
            if (extra[k] === undefined) delete obj[k];
            else obj[k] = extra[k];
        });
        return obj;
    }

    _placeStimulusChrome(trial) {
        this._placePolaroidChrome(trial);
    }

    _placeStimulusImage(trial) {
        if (trial.target === "shape") {
            this._placePolaroidShape(trial);
            return;
        }
        this._placePolaroidFennimal(trial);
    }

    _placePracticeShape(trial) {
        this._placePolaroidShape(trial);
    }

    _placePolaroidShape(trial) {
        let mount = this.polaroidMount || {};
        let group = create_SVG_group(0, 0, "chimera_stimulus");
        let shape = document.createElementNS("http://www.w3.org/2000/svg", trial.shape === "triangle" ? "polygon" : "rect");
        if (trial.shape === "triangle") {
            shape.setAttribute("points", "0,-90 100,80 -100,80");
        } else {
            shape.setAttribute("x", "-90");
            shape.setAttribute("y", "-90");
            shape.setAttribute("width", "180");
            shape.setAttribute("height", "180");
            shape.setAttribute("rx", "12");
        }
        shape.setAttribute("fill", "#5b7c99");
        shape.setAttribute("stroke", "#2c3e50");
        shape.setAttribute("stroke-width", "6");
        group.appendChild(shape);
        group.style.pointerEvents = "none";
        if (!this._insertInPhotoWell(group) && mount.groupScale) {
            mount.groupScale.appendChild(group);
        }
        this._fitNodeInPhotoWell(group, 0.62, 0.55);
        this.targetNode = group;
    }

    _fitNodeInPhotoWell(node, wFrac, hFrac) {
        if (!node) return;
        let mount = this.polaroidMount || {};
        let bgRect = mount.bgRect || this.photoWellRect;
        let circle = mount.circle;
        let box = node.getBBox();
        let frameBox = bgRect ? bgRect.getBBox() : { x: 0, y: 0, width: 500, height: 600 };
        let scale = Math.min(
            (frameBox.width * wFrac) / Math.max(box.width, 1),
            (frameBox.height * hFrac) / Math.max(box.height, 1)
        );
        let cx = box.x + box.width / 2;
        let cy = box.y + box.height / 2;
        let iconCx = circle && circle.hasAttribute("cx")
            ? parseFloat(circle.getAttribute("cx"))
            : (frameBox.x + frameBox.width / 2);
        let iconCy = circle && circle.hasAttribute("cy")
            ? parseFloat(circle.getAttribute("cy"))
            : (frameBox.y + frameBox.height / 2);
        if (!mount.photoHost) {
            let targetCircle = circle && typeof getSVGInternalCenter === "function"
                ? getSVGInternalCenter(circle)
                : { x: mount.cx, y: mount.cy };
            iconCx = targetCircle.x;
            iconCy = targetCircle.y;
        }
        node.setAttribute(
            "transform",
            `translate(${iconCx}, ${iconCy}) scale(${scale}) translate(${-cx}, ${-cy})`
        );
    }

    _buildDisplayFen(trial) {
        let hatFen = trial.hatFen;
        let headFen = trial.headFen;
        let bodyFen = trial.bodyFen;
        let hostFen = trial.hostFen;

        let display = {
            id: "chimera_" + trial.id,
            name: "",
            head: trial.strangerHead || (headFen && headFen.head),
            body: bodyFen ? bodyFen.body : (headFen && headFen.body),
            region: hostFen ? hostFen.region : (headFen && headFen.region)
        };
        if (hatFen && hatFen.hat) display.hat = hatFen.hat;

        let hostScheme = hostFen ? this._schemeFromRegion(hostFen.region) : null;
        let bodyScheme = bodyFen ? this._schemeFromFen(bodyFen) : hostScheme;
        let nativeHeadScheme;
        if (trial.strangerHead) {
            nativeHeadScheme = hostScheme || this._schemeFromFen(bodyFen || headFen);
        } else if (headFen) {
            nativeHeadScheme = this._schemeFromFen(headFen);
        } else {
            nativeHeadScheme = hostScheme;
        }

        // One palette for the whole chimera: the prime's, so colour does not
        // give away whose head vs whose body. Head-only / no-prime: native part.
        let scheme;
        if (trial.primePart === "body") {
            scheme = bodyScheme || nativeHeadScheme;
        } else if (trial.primePart === "head") {
            scheme = nativeHeadScheme || bodyScheme;
        } else {
            scheme = (bodyFen ? bodyScheme : nativeHeadScheme) || hostScheme;
        }
        if (!scheme) this._fail(`trial "${trial.id}" has no colour scheme.`);

        display.ColorScheme = { Head: scheme, Body: scheme };
        display._headScheme = scheme;
        display._bodyScheme = scheme;
        return display;
    }

    _applyPartColors(icon, headScheme, bodyScheme) {
        let scheme = headScheme || bodyScheme;
        if (!icon || !scheme) return;
        const paint = (root) => {
            if (!root) return;
            set_fill_for_all_elements_in_array(root.getElementsByClassName("Fennimal_primary_color"), scheme.primary_color);
            set_fill_for_all_elements_in_array(root.getElementsByClassName("Fennimal_secondary_color"), scheme.secondary_color);
            set_fill_for_all_elements_in_array(root.getElementsByClassName("Fennimal_tertiary_color"), scheme.tertiary_color);
            set_fill_for_all_elements_in_array(root.getElementsByClassName("Fennimal_eye_color"), scheme.eye_color);
        };
        paint(icon);
    }

    _stripHelperMarks(root) {
        if (!root || !root.querySelectorAll) return;
        // Hat/neck/mouth alignment dots are CSS-hidden in the live SVG, but
        // mosaic snapshots serialize without that stylesheet.
        root.querySelectorAll(".invisible_element, .prep_element_hidden").forEach((el) => el.remove());
    }

    _prepareFennimalIcon(icon) {
        if (!icon) return;
        this._stripHelperMarks(icon);
        freeze_fennimal_decorative_animations(icon);
        this._freezeHappyExpression(icon);
    }

    _freezeHappyExpression(root) {
        if (!root || !root.querySelectorAll) return;
        // Mosaic snapshots serialize a CSS-less clone, so both mouths would
        // otherwise print. Force the happy state with attributes AND inline
        // styles so the snapshot and the live SVG match from reveal start.
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

    _placeLocationFennimal(trial) {
        let display = this._buildDisplayFen(trial);
        let icon = create_Fennimal_SVG_object(display, GenParam.Fennimal_head_size, false);
        this._prepareFennimalIcon(icon);
        this._applyPartColors(icon, display._headScheme, display._bodyScheme);
        icon.style.pointerEvents = "none";
        this.layers.Main.appendChild(icon);

        let cx = (this.params.fennimalX != null ? this.params.fennimalX : 0.5) * this.W;
        let cy = (this.params.fennimalY != null ? this.params.fennimalY : 0.7) * this.H;
        let scale = this.params.fennimalScale != null ? this.params.fennimalScale : 2.35;
        let box = icon.getBBox();
        let fenCx = box.x + box.width / 2;
        let fenCy = box.y + box.height * 0.72;
        icon.setAttribute(
            "transform",
            `translate(${cx}, ${cy}) scale(${scale}) translate(${-fenCx}, ${-fenCy})`
        );
        this.stimulusGroup = icon;
        this.targetNode = trial.target === "hat"
            ? (icon.querySelector(".hat") || icon.querySelector(".Fennimal_head"))
            : icon.querySelector(".Fennimal_head");
        if (!this.targetNode) this._fail(`trial "${trial.id}" is missing a target node.`);
    }

    _placePolaroidChrome(trial) {
        let template = document.getElementById("polaroid_frame");
        if (!template) this._fail("missing SVG polaroid_frame template.");

        let cx = (this.params.polaroidX != null ? this.params.polaroidX : 0.5) * this.W;
        let cy = (this.params.polaroidY != null ? this.params.polaroidY : 0.48) * this.H;
        let polaroidScale = this.params.polaroidScale != null ? this.params.polaroidScale : 0.9;

        let groupTranslate = create_SVG_group(0, 0, "chimera_polaroid");
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
        this._setPolaroidCaption(frame, trial.question);

        let circle = frame.getElementsByTagName("circle")[0];
        let framePath = this._photoWellPath();
        let photoHost = bgRect && bgRect.parentNode;
        if (photoHost) photoHost.style.pointerEvents = "none";
        if (framePath) framePath.style.pointerEvents = "none";

        groupScale.style.transformOrigin = "center";
        groupRotate.style.transformOrigin = `${cx}px ${cy}px`;
        groupScale.style.transform = `scale(${polaroidScale})`;
        groupRotate.style.transform = "rotate(-3deg)";

        this.stimulusGroup = groupTranslate;
        this.polaroidMount = { groupScale, cx, cy, circle, bgRect, photoHost };
    }

    _placePolaroidFennimal(trial) {
        let mount = this.polaroidMount || {};
        let display = this._buildDisplayFen(trial);
        if (!display.body) display.body = this._fallbackBody();

        let icon = create_Fennimal_SVG_object(display, GenParam.Fennimal_head_size, false);
        this._prepareFennimalIcon(icon);
        this._applyPartColors(icon, display._headScheme, display._bodyScheme);
        let showBody = !!trial.bodyFen;
        let body = icon.getElementsByClassName("Fennimal_body")[0];
        if (body && !showBody) body.style.display = "none";
        icon.style.pointerEvents = "none";
        if (!this._insertInPhotoWell(icon) && mount.groupScale) {
            mount.groupScale.appendChild(icon);
        }
        this._fitNodeInPhotoWell(icon, showBody ? 0.78 : 0.72, showBody ? 0.78 : 0.62);
        this.targetNode = icon;
        if (!this.targetNode) this._fail(`trial "${trial.id}" polaroid is missing a Fennimal.`);
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

    _insertInPhotoWell(node) {
        let host = this.photoWellRect && this.photoWellRect.parentNode;
        if (!host) return false;
        let before = (this.occluder && this.occluder.parentNode === host)
            ? this.occluder
            : (this._photoWellPath() || null);
        if (before) host.insertBefore(node, before);
        else host.appendChild(node);
        return true;
    }

    _targetBox() {
        if (this.photoWellRect && typeof getVisualBBoxInSvg === "function") {
            try {
                let well = getVisualBBoxInSvg(this.photoWellRect);
                if (well && well.width > 0) return well;
            } catch (e) { /* fall through */ }
        }
        if (!this.targetNode) {
            return { x: 0.5 * this.W - 110, y: 0.48 * this.H - 110, width: 220, height: 220 };
        }
        try {
            void this.targetNode.getBoundingClientRect();
            if (typeof getVisualBBoxInSvg === "function") {
                return getVisualBBoxInSvg(this.targetNode);
            }
            return this.targetNode.getBBox();
        } catch (e) {
            return { x: 0.5 * this.W - 80, y: 0.4 * this.H - 80, width: 160, height: 160 };
        }
    }

    _placeOccluder() {
        let well = this._photoWellBox();
        let g = create_SVG_group(0, 0, "chimera_occluder");
        let rect;
        let cx;
        let cy;
        let qSize;

        if (well) {
            rect = create_SVG_rect(well.x, well.y, well.width, well.height);
            rect.setAttribute("rx", well.rx);
            rect.setAttribute("ry", well.ry);
            rect.setAttribute("fill", this.params.patchyOverlayFillPolaroid || "#3e3a44");
            rect.style.pointerEvents = "none";
            rect.style.cursor = "default";
            g.appendChild(rect);
            g.style.pointerEvents = "none";
            cx = well.x + well.width / 2;
            cy = well.y + well.height / 2;
            qSize = Math.round(Math.min(well.width, well.height) * 0.42);
        } else {
            let box = this._targetBox();
            let pad = 18;
            let x = box.x - pad;
            let y = box.y - pad;
            let w = Math.max(box.width + 2 * pad, 110);
            let h = Math.max(box.height + 2 * pad, 110);
            rect = create_SVG_rect(x, y, w, h);
            rect.setAttribute("rx", "14");
            rect.setAttribute("fill", "#111111");
            rect.setAttribute("stroke", "#f5f0e6");
            rect.setAttribute("stroke-width", "5");
            rect.style.cursor = "default";
            rect.style.pointerEvents = "none";
            g.appendChild(rect);
            g.style.pointerEvents = "none";
            cx = x + w / 2;
            cy = y + h / 2;
            qSize = Math.round(Math.min(w, h) * 0.55);
        }

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
        hit.setAttribute("stroke-linejoin", "round");
        hit.classList.add("focus_on_SVG_outline");
        hit.style.cursor = "pointer";
        hit.style.pointerEvents = "all";
        g.insertBefore(hit, q);

        if (well) this._insertInPhotoWell(g);
        else this.layers.Plus1.appendChild(g);

        this.occluder = g;
        this.occluderRect = rect;
        this.occluderHit = hit;
        if (well && typeof getSVGInternalCenter === "function") {
            let center = getSVGInternalCenter(rect);
            this.ringAnchor = { cx: center.x, cy: center.y };
        } else {
            this.ringAnchor = { cx, cy };
        }
    }

    async _waitForPaint() {
        let node = this.occluder || this.photoWellRect || this.stimulusGroup;
        if (node && node.getBoundingClientRect) {
            void node.getBoundingClientRect();
        }
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (node && node.getBoundingClientRect) {
            void node.getBoundingClientRect();
        }
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
        let hud = this._placeHudBubble(x, y, w, h, trial.question, "chimera_question", 36);
        this.questionEl = hud.group;
    }

    _placePointsHud(value) {
        let w = 150;
        let h = 78;
        let x = 0.5 * this.W - w / 2;
        let y = 0.86 * this.H;
        let frame = this.stimulusGroup;
        if (frame && typeof getVisualBBoxInSvg === "function") {
            try {
                let box = getVisualBBoxInSvg(frame);
                if (box && box.width > 0) {
                    x = box.x + box.width / 2 - w / 2;
                    y = box.y + box.height + 10;
                }
            } catch (e) { /* keep fallback */ }
        }
        y = Math.min(y, this.H - h - 12);
        x = Math.max(16, Math.min(x, this.W - w - 16));
        let hud = this._placeHudBubble(x, y, w, h, String(Math.round(value)), "chimera_points", 34);
        this.pointsEl = hud.group;
        this.pointsDiv = hud.label;
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
            this.layers.Plus2.appendChild(rect);
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

    _setBarsProgress(progress, hold) {
        let g = this._barGeometry();
        [this.barLeft, this.barRight].forEach((bar) => {
            if (!bar) return;
            if (hold) {
                bar.setAttribute("y", String(g.top));
                bar.setAttribute("height", String(g.height));
                bar.style.opacity = "";
                bar.classList.add("is-on");
                bar.classList.add("hold");
                bar.classList.remove("pulse");
                return;
            }
            bar.classList.remove("hold");
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

    _scoreProgress(elapsedMs) {
        let spec = this._leadLagSpec(this.currentTrial);
        let elapsed = Math.max(0, elapsedMs);
        if (!spec.hasLag) return Math.min(1, elapsed / spec.trialMs);
        if (elapsed <= spec.lagMs) return 0;
        return Math.min(1, (elapsed - spec.lagMs) / spec.trialMs);
    }

    _showTimeBars() {
        [this.barLeft, this.barRight].forEach((bar) => {
            if (!bar) return;
            bar.style.opacity = "";
            bar.classList.add("is-on");
        });
    }

    _leadLagSpec(trial) {
        let T = this.trialSpeedMs;
        let primeEndFrac = this.params.primeEndFrac != null ? this.params.primeEndFrac : 0.40;
        let lagFrac = this.params.targetLagFrac != null ? this.params.targetLagFrac : 0.35;
        let hasLag = !!(trial && trial.primePart && trial.target && trial.target !== "shape");
        if (!hasLag) {
            return { hasLag: false, lagMs: 0, primeEndMs: T, trialMs: T };
        }
        let primeEndMs = Math.max(1, Math.round(primeEndFrac * T));
        let lagMs = Math.max(0, Math.round(lagFrac * T));
        if (lagMs >= T) lagMs = Math.max(0, T - 1);
        return { hasLag: true, lagMs, primeEndMs, trialMs: T };
    }

    _clocksAt(elapsedMs) {
        let spec = this._leadLagSpec(this.currentTrial);
        let elapsed = Math.max(0, elapsedMs);
        let tPhoto = Math.min(1, elapsed / spec.trialMs);
        if (!spec.hasLag) {
            return {
                hasLag: false,
                tPhoto, tPrime: tPhoto, tTarget: tPhoto,
                lagMs: 0, primeEndMs: spec.primeEndMs, elapsed
            };
        }
        let tPrime = Math.min(1, elapsed / spec.primeEndMs);
        let tTarget = elapsed <= spec.lagMs ? 0 : Math.min(1, (elapsed - spec.lagMs) / spec.trialMs);
        return {
            hasLag: true,
            tPhoto, tPrime, tTarget,
            lagMs: spec.lagMs, primeEndMs: spec.primeEndMs, elapsed
        };
    }

    _headFaceNode(icon) {
        if (!icon) return null;
        let hat = icon.querySelector(".hat");
        if (hat && hat.parentNode) {
            let face = Array.from(hat.parentNode.children).find((n) => n !== hat);
            if (face) return face;
        }
        return icon.querySelector(".Fennimal_head");
    }

    _partNode(kind) {
        let icon = this.targetNode;
        if (!icon || !kind) return null;
        if (kind === "body") return icon.querySelector(".Fennimal_body");
        if (kind === "hat") return icon.querySelector(".hat");
        if (kind === "head") return this._headFaceNode(icon);
        return null;
    }

    _bindRevealParts(trial) {
        this.revealPrimeEls = [];
        this.revealTargetEl = null;
        this.leadLagHasLag = false;
        this.veilBox = null;
        let spec = this._leadLagSpec(trial);
        if (!spec.hasLag || !this.targetNode || trial.target === "shape") return;

        this.revealTargetEl = this._partNode(trial.target);
        if (!this.revealTargetEl) {
            this._fail(`lead-lag trial "${trial.id}" is missing target part "${trial.target}".`);
        }

        if (trial.primePart === "body") {
            let body = this._partNode("body");
            if (body && body.style.display !== "none") this.revealPrimeEls.push(body);
            if (trial.target !== "head") {
                let face = this._headFaceNode(this.targetNode);
                if (face && face !== this.revealTargetEl) this.revealPrimeEls.push(face);
            }
        } else if (trial.primePart === "head") {
            let face = this._headFaceNode(this.targetNode);
            if (face && face !== this.revealTargetEl) this.revealPrimeEls.push(face);
            if (trial.target !== "body") {
                let body = this._partNode("body");
                if (body && body.style.display !== "none") this.revealPrimeEls.push(body);
            }
        }

        this.leadLagHasLag = true;
        this.veilBox = this._targetVeilBox();
    }

    _bboxInAncestor(el, ancestor) {
        if (!el || !ancestor || !el.ownerSVGElement) return null;
        let svg = el.ownerSVGElement;
        let bb;
        try { bb = el.getBBox(); } catch (e) { return null; }
        if (!(bb.width > 0 && bb.height > 0)) return null;
        let elCtm = el.getScreenCTM();
        let ancCtm = ancestor.getScreenCTM();
        if (!elCtm || !ancCtm) return null;
        let m = ancCtm.inverse().multiply(elCtm);
        let xs = [];
        let ys = [];
        [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].forEach((xy) => {
            let p = svg.createSVGPoint();
            p.x = xy[0];
            p.y = xy[1];
            p = p.matrixTransform(m);
            xs.push(p.x);
            ys.push(p.y);
        });
        let x = Math.min.apply(null, xs);
        let y = Math.min.apply(null, ys);
        return { x, y, width: Math.max.apply(null, xs) - x, height: Math.max.apply(null, ys) - y };
    }

    _targetVeilBox() {
        let host = this.photoWellRect && this.photoWellRect.parentNode;
        let el = this.revealTargetEl;
        if (!host || !el) return null;
        let box = this._bboxInAncestor(el, host);
        if (!box) return null;
        let pad = this.params.targetVeilPad != null ? this.params.targetVeilPad : 22;
        let well = this._photoWellBox();
        box.x -= pad;
        box.y -= pad;
        box.width += pad * 2;
        box.height += pad * 2;
        if (well) {
            let x2 = Math.min(box.x + box.width, well.x + well.width);
            let y2 = Math.min(box.y + box.height, well.y + well.height);
            box.x = Math.max(box.x, well.x);
            box.y = Math.max(box.y, well.y);
            box.width = Math.max(8, x2 - box.x);
            box.height = Math.max(8, y2 - box.y);
        }
        return box;
    }

    _setupTargetVeil(trial) {
        this._teardownTargetVeil();
        if (!this.leadLagHasLag || !this.photoWellRect) return;
        let box = this.veilBox || this._targetVeilBox();
        if (!box) return;
        this.veilBox = box;
        let ns = "http://www.w3.org/2000/svg";
        let veil = document.createElementNS(ns, "rect");
        veil.setAttribute("class", "chimera_target_veil");
        veil.setAttribute("x", String(box.x));
        veil.setAttribute("y", String(box.y));
        veil.setAttribute("width", String(box.width));
        veil.setAttribute("height", String(box.height));
        veil.setAttribute("rx", "18");
        veil.setAttribute("ry", "18");
        veil.setAttribute("fill", this.params.patchyOverlayFillPolaroid || "#3e3a44");
        veil.style.pointerEvents = "none";
        veil.style.opacity = "1";

        this.targetHoleCircles = [];
        this.targetPatchyRMax = Math.hypot(box.width, box.height) *
            (this.params.patchyRMaxFactor != null ? this.params.patchyRMaxFactor : 1.15);

        if (this._usesPatchyHoles()) {
            let uid = this.patchyUid || ("chimera_patchy_" + String(trial.id).replace(/[^a-zA-Z0-9_]/g, "_"));
            if (!this.patchyDefs) {
                this.patchyDefs = document.createElementNS(ns, "defs");
                this._insertInPhotoWell(this.patchyDefs);
            }
            let mask = document.createElementNS(ns, "mask");
            mask.setAttribute("id", uid + "_target_mask");
            mask.setAttribute("maskUnits", "userSpaceOnUse");
            mask.setAttribute("maskContentUnits", "userSpaceOnUse");
            let cover = document.createElementNS(ns, "rect");
            cover.setAttribute("x", String(box.x));
            cover.setAttribute("y", String(box.y));
            cover.setAttribute("width", String(box.width));
            cover.setAttribute("height", String(box.height));
            cover.setAttribute("fill", "white");
            mask.appendChild(cover);

            let holeGroup = document.createElementNS(ns, "g");
            holeGroup.setAttribute("filter", `url(#${uid}_soft)`);
            let layout = (this.holeLayouts && this.holeLayouts[trial.id]) || this._drawHolePositions(
                this.params.patchyHoleCount != null ? this.params.patchyHoleCount : 4
            );
            layout.forEach((hole) => {
                let hx = box.x + hole.u * box.width;
                let hy = box.y + hole.v * box.height;
                let c = document.createElementNS(ns, "circle");
                c.setAttribute("cx", String(hx));
                c.setAttribute("cy", String(hy));
                c.setAttribute("r", "0");
                c.setAttribute("fill", "black");
                holeGroup.appendChild(c);
                this.targetHoleCircles.push(this._holeRecord(hole, c, hx, hy));
            });
            mask.appendChild(holeGroup);
            this.patchyDefs.appendChild(mask);
            veil.setAttribute("mask", `url(#${uid}_target_mask)`);
        }

        this._insertInPhotoWell(veil);
        this.targetVeil = veil;
        if (this._usesPixelation()) this._setupTargetPixelateOverlay(ns, box);
    }

    _teardownTargetVeil() {
        if (this.targetVeil && this.targetVeil.parentNode) this.targetVeil.remove();
        if (this.targetPixelImage && this.targetPixelImage.parentNode) this.targetPixelImage.remove();
        this.targetVeil = null;
        this.targetHoleCircles = [];
        this.targetPatchyRMax = 0;
        this.targetPixelImage = null;
        this.targetPixelSourceReady = false;
        this.targetPixelSource = null;
        this.targetPixelTmp = null;
        this.targetPixelOut = null;
    }

    _filterRecipe(k) {
        let t = Math.max(0, Math.min(1, k));
        let patchy = this._usesPatchyHoles();
        let startBlur = patchy
            ? (this.params.patchyMinBlurPx != null ? this.params.patchyMinBlurPx : 28)
            : (this.params.startBlurPx != null ? this.params.startBlurPx : 24);
        let colorK = patchy
            ? Math.pow(t, this.params.patchyColorPower != null ? this.params.patchyColorPower : 1.7)
            : t;
        return {
            k: t,
            blur: startBlur * (1 - t),
            gray: 1 - colorK,
            bright: colorK
        };
    }

    _applyPartFilter(el, k) {
        if (!el) return;
        let rec = this._filterRecipe(k);
        if (rec.k >= 0.999) {
            el.style.opacity = "1";
            el.style.filter = "none";
            return;
        }
        el.style.opacity = "1";
        el.style.filter = `grayscale(${rec.gray}) brightness(${rec.bright}) blur(${rec.blur}px)`;
    }

    _setRevealFilter(tOrElapsed, asElapsed) {
        if (!this.targetNode) return;
        let clocks;
        if (tOrElapsed === 1 && !asElapsed) {
            let spec = this._leadLagSpec(this.currentTrial);
            clocks = {
                hasLag: spec.hasLag,
                tPhoto: 1, tPrime: 1, tTarget: 1,
                lagMs: spec.lagMs, primeEndMs: spec.primeEndMs, elapsed: spec.trialMs
            };
        } else if (asElapsed) {
            clocks = this._clocksAt(tOrElapsed);
        } else {
            clocks = this._clocksAt(Math.max(0, tOrElapsed) * this.trialSpeedMs);
        }
        this._lastRevealK = clocks.tPhoto;
        this._lastClocks = clocks;
        this._applyRevealClocks(clocks);
    }

    _applyRevealClocks(clocks) {
        if (!this.targetNode) return;
        let recPrime = this._filterRecipe(clocks.tPrime);
        let pixReady = this._usesPixelation() && this.pixelSourceReady;

        if (!clocks.hasLag) {
            if (pixReady && clocks.tPrime < 0.999) {
                this.targetNode.style.opacity = "0";
                this.targetNode.style.filter = "none";
                this._paintPixelOverlay(clocks.tPrime, recPrime.gray, recPrime.bright);
            } else {
                this.targetNode.style.opacity = "1";
                this.targetNode.style.filter = clocks.tPrime >= 0.999
                    ? "none"
                    : `grayscale(${recPrime.gray}) brightness(${recPrime.bright}) blur(${recPrime.blur}px)`;
                if (this.pixelImage) this.pixelImage.style.opacity = "0";
            }
            if (this._usesPatchyHoles()) this._setPatchyProgress(clocks.tPrime);
            if (this.targetVeil) this.targetVeil.style.opacity = "0";
            return;
        }

        this.targetNode.style.filter = "none";
        this.targetNode.style.opacity = "1";

        let recTarget = this._filterRecipe(clocks.tTarget);
        let targetPixReady = this._usesPixelation() && this.targetPixelSourceReady;

        if (pixReady && clocks.tPrime < 0.999) {
            this.revealPrimeEls.forEach((el) => { el.style.opacity = "0"; el.style.filter = "none"; });
            this._paintPixelOverlay(clocks.tPrime, recPrime.gray, recPrime.bright);
        } else {
            if (this.pixelImage) this.pixelImage.style.opacity = "0";
            this.revealPrimeEls.forEach((el) => this._applyPartFilter(el, clocks.tPrime));
        }

        if (targetPixReady && clocks.tTarget < 0.999) {
            if (this.revealTargetEl) {
                this.revealTargetEl.style.opacity = "0";
                this.revealTargetEl.style.filter = "none";
            }
            this._paintTargetPixelOverlay(clocks.tTarget, recTarget.gray, recTarget.bright);
        } else {
            if (this.targetPixelImage) this.targetPixelImage.style.opacity = "0";
            this._applyPartFilter(this.revealTargetEl, clocks.tTarget);
        }

        if (this._usesPatchyHoles()) {
            this._setPatchyProgress(clocks.tPrime);
            this._setTargetPatchyProgress(clocks.tTarget);
        } else if (this.targetVeil) {
            this.targetVeil.style.opacity = clocks.tTarget >= 0.999 ? "0" : String(1 - clocks.tTarget);
        }
    }

    _setupPatchyHoles(trial) {
        this._teardownPatchyHoles();
        if (!this._usesPatchyHoles() || !this.targetNode) return;

        let well = this._photoWellBox();
        let box;
        let x;
        let y;
        let w;
        let h;
        let rx = "0";
        let ry = "0";
        if (well) {
            box = well;
            x = well.x;
            y = well.y;
            w = well.width;
            h = well.height;
            rx = well.rx;
            ry = well.ry;
        } else {
            box = this._targetBox();
            let pad = this.params.patchyOverlayPad != null ? this.params.patchyOverlayPad : 72;
            x = box.x - pad;
            y = box.y - pad;
            w = box.width + 2 * pad;
            h = box.height + 2 * pad;
            box = { x, y, width: w, height: h };
        }
        if (w < 40 || h < 40) return;

        let ns = "http://www.w3.org/2000/svg";
        let uid = "chimera_patchy_" + String(trial.id).replace(/[^a-zA-Z0-9_]/g, "_");
        this.patchyUid = uid;
        let softness = this.params.patchyHoleSoftness != null ? this.params.patchyHoleSoftness : 10;

        this.patchyDefs = document.createElementNS(ns, "defs");
        let filter = document.createElementNS(ns, "filter");
        filter.setAttribute("id", uid + "_soft");
        filter.setAttribute("x", "-50%");
        filter.setAttribute("y", "-50%");
        filter.setAttribute("width", "200%");
        filter.setAttribute("height", "200%");
        let blur = document.createElementNS(ns, "feGaussianBlur");
        blur.setAttribute("in", "SourceGraphic");
        blur.setAttribute("stdDeviation", String(softness));
        filter.appendChild(blur);
        this.patchyDefs.appendChild(filter);

        let mask = document.createElementNS(ns, "mask");
        mask.setAttribute("id", uid + "_mask");
        mask.setAttribute("maskUnits", "userSpaceOnUse");
        mask.setAttribute("maskContentUnits", "userSpaceOnUse");
        let cover = document.createElementNS(ns, "rect");
        cover.setAttribute("x", String(x));
        cover.setAttribute("y", String(y));
        cover.setAttribute("width", String(w));
        cover.setAttribute("height", String(h));
        cover.setAttribute("fill", "white");
        mask.appendChild(cover);

        let holeGroup = document.createElementNS(ns, "g");
        holeGroup.setAttribute("filter", `url(#${uid}_soft)`);
        let layout = (this.holeLayouts && this.holeLayouts[trial.id]) || this._drawHolePositions(
            this.params.patchyHoleCount != null ? this.params.patchyHoleCount : 4
        );
        this.holeCircles = [];
        layout.forEach((hole) => {
            let hx = x + hole.u * w;
            let hy = y + hole.v * h;
            let c = document.createElementNS(ns, "circle");
            c.setAttribute("cx", String(hx));
            c.setAttribute("cy", String(hy));
            c.setAttribute("r", "0");
            c.setAttribute("fill", "black");
            holeGroup.appendChild(c);
            this.holeCircles.push(this._holeRecord(hole, c, hx, hy));
        });
        mask.appendChild(holeGroup);
        this.patchyDefs.appendChild(mask);

        let overlay = document.createElementNS(ns, "rect");
        overlay.setAttribute("x", String(x));
        overlay.setAttribute("y", String(y));
        overlay.setAttribute("width", String(w));
        overlay.setAttribute("height", String(h));
        overlay.setAttribute("rx", rx);
        overlay.setAttribute("ry", ry);
        overlay.setAttribute("mask", `url(#${uid}_mask)`);
        overlay.style.pointerEvents = "none";
        let fill = trial.presentation === "location"
            ? (this.params.patchyOverlayFill || "#c5d0dc")
            : (this.params.patchyOverlayFillPolaroid || "#3e3a44");
        overlay.setAttribute("fill", fill);

        if (well) {
            this._insertInPhotoWell(this.patchyDefs);
            this._insertInPhotoWell(overlay);
        } else {
            this.sceneRoot.appendChild(this.patchyDefs);
            this.layers.Plus1.appendChild(overlay);
        }

        this.holeOverlay = overlay;
        this.patchyMask = mask;
        this.patchyRMax = Math.hypot(w, h) * (this.params.patchyRMaxFactor != null ? this.params.patchyRMaxFactor : 1.15);
        if (this._usesPixelation()) this._setupPixelateOverlay(ns, { x, y, width: w, height: h });
        this._setPatchyProgress(0);
    }

    _setupPixelateOverlay(ns, box) {
        this.pixelBox = box;
        this.pixelSourceReady = false;
        this.pixelSource = document.createElement("canvas");
        this.pixelTmp = document.createElement("canvas");

        let fo = document.createElementNS(ns, "foreignObject");
        fo.setAttribute("x", String(box.x));
        fo.setAttribute("y", String(box.y));
        fo.setAttribute("width", String(Math.max(1, box.width)));
        fo.setAttribute("height", String(Math.max(1, box.height)));
        fo.style.pointerEvents = "none";
        fo.style.overflow = "hidden";

        let canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(box.width));
        canvas.height = Math.max(1, Math.round(box.height));
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        canvas.style.imageRendering = "pixelated";
        canvas.style.setProperty("image-rendering", "crisp-edges");
        fo.appendChild(canvas);

        if (this.holeOverlay && this.holeOverlay.parentNode) {
            this.holeOverlay.parentNode.insertBefore(fo, this.holeOverlay);
        } else {
            this.layers.Plus1.appendChild(fo);
        }
        this.pixelImage = fo;
        this.pixelOut = canvas;

        this._rasterizeTargetSource().then((ok) => {
            if (!ok || this.destroyed || !this.pixelOut) return;
            this.pixelSourceReady = true;
            let k = this._lastClocks ? this._lastClocks.elapsed : 0;
            this._setRevealFilter(k, true);
        }).catch(() => {});
    }

    _setupTargetPixelateOverlay(ns, box) {
        this.targetPixelSourceReady = false;
        this.targetPixelSource = document.createElement("canvas");
        this.targetPixelTmp = document.createElement("canvas");

        let fo = document.createElementNS(ns, "foreignObject");
        fo.setAttribute("x", String(box.x));
        fo.setAttribute("y", String(box.y));
        fo.setAttribute("width", String(Math.max(1, box.width)));
        fo.setAttribute("height", String(Math.max(1, box.height)));
        fo.style.pointerEvents = "none";
        fo.style.overflow = "hidden";

        let canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(box.width));
        canvas.height = Math.max(1, Math.round(box.height));
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        canvas.style.imageRendering = "pixelated";
        canvas.style.setProperty("image-rendering", "crisp-edges");
        fo.appendChild(canvas);

        if (this.targetVeil && this.targetVeil.parentNode) {
            this.targetVeil.parentNode.insertBefore(fo, this.targetVeil);
        } else {
            this._insertInPhotoWell(fo);
        }
        this.targetPixelImage = fo;
        this.targetPixelOut = canvas;

        this._rasterizeTargetPart().then((ok) => {
            if (!ok || this.destroyed || !this.targetPixelOut) return;
            this.targetPixelSourceReady = true;
            let k = this._lastClocks ? this._lastClocks.elapsed : 0;
            this._setRevealFilter(k, true);
        }).catch(() => {});
    }

    _rasterizeTargetSource() {
        if (this.photoWellRect) return this._rasterizePhotoWell();
        return this._rasterizeNodeCrop();
    }

    _rasterizePhotoWell() {
        let well = this._photoWellBox();
        let node = this.targetNode;
        if (!well || !node) return Promise.resolve(false);

        let prevFilter = node.style.filter;
        let prevOpacity = node.style.opacity;
        let prevVis = node.style.visibility;
        node.style.filter = "none";
        node.style.opacity = "1";
        node.style.visibility = "visible";

        let targetEl = this.revealTargetEl;
        let prevTargetVis;
        if (this.leadLagHasLag && targetEl) {
            prevTargetVis = targetEl.style.visibility;
            targetEl.style.visibility = "hidden";
        }

        let ns = "http://www.w3.org/2000/svg";
        let svg = document.createElementNS(ns, "svg");
        svg.setAttribute("xmlns", ns);
        svg.setAttribute("viewBox", `${well.x} ${well.y} ${well.width} ${well.height}`);
        let outW = Math.max(1, Math.round(well.width));
        let outH = Math.max(1, Math.round(well.height));
        svg.setAttribute("width", String(outW));
        svg.setAttribute("height", String(outH));

        let paper = this.photoWellRect.cloneNode(true);
        paper.style.display = "inherit";
        svg.appendChild(paper);
        let icon = node.cloneNode(true);
        icon.style.filter = "none";
        icon.style.opacity = "1";
        icon.style.visibility = "visible";
        this._freezeHappyExpression(icon);
        this._stripHelperMarks(icon);
        svg.appendChild(icon);

        if (this.leadLagHasLag && targetEl) targetEl.style.visibility = prevTargetVis;
        node.style.filter = prevFilter;
        node.style.opacity = prevOpacity;
        node.style.visibility = prevVis;

        let punch = this.leadLagHasLag ? this.veilBox : null;
        let punchRect = punch ? {
            x: punch.x - well.x,
            y: punch.y - well.y,
            w: punch.width,
            h: punch.height
        } : null;

        let xml = new XMLSerializer().serializeToString(svg);
        let url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
        return new Promise((resolve) => {
            let img = new Image();
            img.onload = () => {
                try {
                    this.pixelSource.width = outW;
                    this.pixelSource.height = outH;
                    let ctx = this.pixelSource.getContext("2d");
                    ctx.clearRect(0, 0, outW, outH);
                    ctx.drawImage(img, 0, 0, outW, outH);
                    if (punchRect) {
                        ctx.clearRect(punchRect.x, punchRect.y, punchRect.w, punchRect.h);
                    }
                    resolve(outW > 1 && outH > 1);
                } catch (e) {
                    resolve(false);
                }
            };
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    _rasterizeTargetPart() {
        let box = this.veilBox;
        let node = this.targetNode;
        if (!box || !node || !this.photoWellRect) return Promise.resolve(false);

        let prevFilter = node.style.filter;
        let prevOpacity = node.style.opacity;
        let prevVis = node.style.visibility;
        let targetEl = this.revealTargetEl;
        let prevTargetVis;
        let prevTargetOp;
        let prevTargetFilt;
        node.style.filter = "none";
        node.style.opacity = "1";
        node.style.visibility = "visible";
        if (targetEl) {
            prevTargetVis = targetEl.style.visibility;
            prevTargetOp = targetEl.style.opacity;
            prevTargetFilt = targetEl.style.filter;
            targetEl.style.visibility = "visible";
            targetEl.style.opacity = "1";
            targetEl.style.filter = "none";
        }

        let ns = "http://www.w3.org/2000/svg";
        let svg = document.createElementNS(ns, "svg");
        svg.setAttribute("xmlns", ns);
        svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
        let outW = Math.max(1, Math.round(box.width));
        let outH = Math.max(1, Math.round(box.height));
        svg.setAttribute("width", String(outW));
        svg.setAttribute("height", String(outH));

        let paper = this.photoWellRect.cloneNode(true);
        paper.style.display = "inherit";
        svg.appendChild(paper);
        let icon = node.cloneNode(true);
        icon.style.filter = "none";
        icon.style.opacity = "1";
        icon.style.visibility = "visible";
        this._freezeHappyExpression(icon);
        this._stripHelperMarks(icon);
        svg.appendChild(icon);

        node.style.filter = prevFilter;
        node.style.opacity = prevOpacity;
        node.style.visibility = prevVis;
        if (targetEl) {
            targetEl.style.visibility = prevTargetVis;
            targetEl.style.opacity = prevTargetOp;
            targetEl.style.filter = prevTargetFilt;
        }

        let xml = new XMLSerializer().serializeToString(svg);
        let url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
        return new Promise((resolve) => {
            let img = new Image();
            img.onload = () => {
                try {
                    this.targetPixelSource.width = outW;
                    this.targetPixelSource.height = outH;
                    let ctx = this.targetPixelSource.getContext("2d");
                    ctx.clearRect(0, 0, outW, outH);
                    ctx.drawImage(img, 0, 0, outW, outH);
                    resolve(outW > 1 && outH > 1);
                } catch (e) {
                    resolve(false);
                }
            };
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    _rasterizeNodeCrop() {
        let node = this.targetNode;
        let svg = node && node.ownerSVGElement;
        if (!node || !svg) return Promise.resolve(false);

        let prevFilter = node.style.filter;
        let prevOpacity = node.style.opacity;
        let prevVis = node.style.visibility;
        node.style.filter = "none";
        node.style.opacity = "1";
        node.style.visibility = "visible";

        let svgRect = svg.getBoundingClientRect();
        let nodeRect = node.getBoundingClientRect();
        let clone = svg.cloneNode(true);
        clone.setAttribute("width", String(Math.max(1, Math.round(svgRect.width))));
        clone.setAttribute("height", String(Math.max(1, Math.round(svgRect.height))));
        if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        this._freezeHappyExpression(clone);
        this._stripHelperMarks(clone);
        ["chimera_layer_plus1", "chimera_layer_plus2"].forEach((id) => {
            let layer = clone.querySelector("#" + id) || clone.querySelector("." + id);
            if (layer) layer.setAttribute("visibility", "hidden");
        });

        node.style.filter = prevFilter;
        node.style.opacity = prevOpacity;
        node.style.visibility = prevVis;

        if (!(nodeRect.width > 1 && nodeRect.height > 1 && svgRect.width > 1)) {
            return Promise.resolve(false);
        }

        let xml = new XMLSerializer().serializeToString(clone);
        let url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
        return new Promise((resolve) => {
            let img = new Image();
            img.onload = () => {
                try {
                    let sx = (nodeRect.left - svgRect.left) * (img.width / svgRect.width);
                    let sy = (nodeRect.top - svgRect.top) * (img.height / svgRect.height);
                    let sw = nodeRect.width * (img.width / svgRect.width);
                    let sh = nodeRect.height * (img.height / svgRect.height);
                    let w = Math.max(1, Math.round(sw));
                    let h = Math.max(1, Math.round(sh));
                    this.pixelSource.width = w;
                    this.pixelSource.height = h;
                    let ctx = this.pixelSource.getContext("2d");
                    ctx.clearRect(0, 0, w, h);
                    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
                    resolve(w > 1 && h > 1);
                } catch (e) {
                    resolve(false);
                }
            };
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    _pixelSizeAt(k) {
        k = Math.max(0, Math.min(1, k));
        let stops = this.params.patchyPixelStops;
        if (Array.isArray(stops) && stops.length >= 2) {
            if (k <= stops[0].t) return stops[0].size;
            for (let i = 1; i < stops.length; i++) {
                let a = stops[i - 1];
                let b = stops[i];
                if (k <= b.t) {
                    let u = (k - a.t) / Math.max(1e-6, b.t - a.t);
                    return a.size + (b.size - a.size) * u;
                }
            }
            return stops[stops.length - 1].size;
        }
        let start = this.params.patchyPixelSizeStart != null ? this.params.patchyPixelSizeStart : 36;
        let end = this.params.patchyPixelSizeEnd != null ? this.params.patchyPixelSizeEnd : 2;
        let power = this.params.patchyPixelPower != null ? this.params.patchyPixelPower : 1.6;
        let t = Math.pow(k, 1 / power);
        return Math.max(end, start + (end - start) * t);
    }

    _paintPixelOverlay(k, gray, bright) {
        if (!this.pixelSourceReady || !this.pixelOut || !this.pixelSource) return;
        let size = this._pixelSizeAt(k);
        let srcW = this.pixelSource.width;
        let srcH = this.pixelSource.height;
        let cols = Math.max(2, Math.round(srcW / size));
        let rows = Math.max(2, Math.round(srcH / size));
        let outW = this.pixelOut.width;
        let outH = this.pixelOut.height;

        this.pixelTmp.width = cols;
        this.pixelTmp.height = rows;
        let tmpCtx = this.pixelTmp.getContext("2d");
        tmpCtx.imageSmoothingEnabled = false;
        tmpCtx.clearRect(0, 0, cols, rows);
        tmpCtx.drawImage(this.pixelSource, 0, 0, cols, rows);

        let outCtx = this.pixelOut.getContext("2d");
        outCtx.imageSmoothingEnabled = false;
        outCtx.filter = "none";
        outCtx.clearRect(0, 0, outW, outH);
        outCtx.drawImage(this.pixelTmp, 0, 0, outW, outH);
        this.pixelOut.style.filter = `grayscale(${gray}) brightness(${bright})`;
        this.pixelImage.style.opacity = "1";
        this.pixelImage.style.visibility = "visible";
    }

    _paintTargetPixelOverlay(k, gray, bright) {
        if (!this.targetPixelSourceReady || !this.targetPixelOut || !this.targetPixelSource) return;
        let size = this._pixelSizeAt(k);
        let srcW = this.targetPixelSource.width;
        let srcH = this.targetPixelSource.height;
        let cols = Math.max(2, Math.round(srcW / size));
        let rows = Math.max(2, Math.round(srcH / size));
        let outW = this.targetPixelOut.width;
        let outH = this.targetPixelOut.height;

        this.targetPixelTmp.width = cols;
        this.targetPixelTmp.height = rows;
        let tmpCtx = this.targetPixelTmp.getContext("2d");
        tmpCtx.imageSmoothingEnabled = false;
        tmpCtx.clearRect(0, 0, cols, rows);
        tmpCtx.drawImage(this.targetPixelSource, 0, 0, cols, rows);

        let outCtx = this.targetPixelOut.getContext("2d");
        outCtx.imageSmoothingEnabled = false;
        outCtx.filter = "none";
        outCtx.clearRect(0, 0, outW, outH);
        outCtx.drawImage(this.targetPixelTmp, 0, 0, outW, outH);
        this.targetPixelOut.style.filter = `grayscale(${gray}) brightness(${bright})`;
        this.targetPixelImage.style.opacity = "1";
        this.targetPixelImage.style.visibility = "visible";
    }

    _setPatchyProgress(k) {
        this._setHoleOverlayProgress(this.holeCircles, this.holeOverlay, this.patchyRMax, k);
    }

    _setTargetPatchyProgress(k) {
        this._setHoleOverlayProgress(this.targetHoleCircles, this.targetVeil, this.targetPatchyRMax, k);
    }

    _setHoleOverlayProgress(circles, overlay, rMax, k) {
        if (!circles || circles.length === 0) {
            if (overlay && k >= 0.999) overlay.style.opacity = "0";
            return;
        }
        let power = this.params.patchyGrowthPower != null ? this.params.patchyGrowthPower : 3.2;
        circles.forEach((hole) => {
            let delay = hole.delay != null ? hole.delay : 0;
            let scale = hole.scale != null ? hole.scale : 1;
            let local = (k - delay) / Math.max(0.001, 1 - delay);
            local = Math.max(0, Math.min(1, local));
            let r = Math.pow(local, power) * (rMax || 0) * scale;
            hole.el.setAttribute("r", String(r));
        });
        if (overlay) {
            overlay.style.opacity = k >= 0.999 ? "0" : "1";
        }
    }

    _teardownPatchyHoles() {
        if (this.targetNode) {
            this.targetNode.style.opacity = "1";
            this.targetNode.style.filter = "none";
        }
        (this.revealPrimeEls || []).forEach((el) => {
            el.style.opacity = "1";
            el.style.filter = "none";
        });
        if (this.revealTargetEl) {
            this.revealTargetEl.style.opacity = "1";
            this.revealTargetEl.style.filter = "none";
        }
        if (this.pixelImage && this.pixelImage.parentNode) this.pixelImage.remove();
        if (this.holeOverlay && this.holeOverlay.parentNode) this.holeOverlay.remove();
        if (this.patchyDefs && this.patchyDefs.parentNode) this.patchyDefs.remove();
        this.holeOverlay = null;
        this.patchyDefs = null;
        this.patchyMask = null;
        this.holeCircles = [];
        this.patchyRMax = 0;
        this.patchyUid = null;
        this.pixelImage = null;
        this.pixelSourceReady = false;
        this.pixelSource = null;
        this.pixelTmp = null;
        this.pixelOut = null;
        this.pixelBox = null;
        this.pixelFilterId = null;
        this.pixelTile = null;
        this.pixelMorph = null;
        this.pixelFlood = null;
    }

    _placeAnswerButtons(trial) {
        let options = trial.options || this._nameOptions();
        let omit = {};
        (trial.excludeOptionIds || []).forEach((id) => { omit[id] = true; });
        options = options.filter((opt) => !omit[opt.id]);
        if (!trial.options) options = this._sortByButtonOrder(options);
        let n = options.length;
        let btnW = this.params.buttonW || 168;
        let btnH = this.params.buttonH || 72;
        let radius = n <= 2 ? 240 : (this.params.radialRadius || 300);
        let mount = this.polaroidMount;
        let anchor = (trial.presentation === "polaroid" && mount && mount.cx != null)
            ? { cx: mount.cx, cy: mount.cy }
            : (this.ringAnchor || this._fallbackRingAnchor(trial));
        let cx = anchor.cx;
        let cy = anchor.cy;
        let minX = 16 + btnW / 2;
        let maxX = this.W - 16 - btnW / 2;
        let minY = 110 + btnH / 2;
        let maxY = this.H - 18 - btnH / 2;
        let spin = n > 2 ? (this.buttonRingSpin != null ? this.buttonRingSpin : -Math.PI / 2) : 0;
        let layout = this._fitAnswerRing(n, cx, cy, radius, false, minX, maxX, minY, maxY, spin);
        this.answerRingLayout = layout.mode;

        this.optionButtons = [];
        this.optionLayout = [];
        let group = create_SVG_group(0, 0, "chimera_options");
        this.layers.Plus1.appendChild(group);
        this.optionsGroup = group;

        options.forEach((opt, i) => {
            let x = layout.points[i].x;
            let y = layout.points[i].y;
            let btn = create_SVG_buttonElement(x, y, btnW, btnH, opt.label, 28);
            btn.style.cursor = "default";
            btn.style.opacity = "1";
            btn.style.pointerEvents = "none";
            group.appendChild(btn);
            this.optionLayout.push({
                option_id: opt.id,
                label: opt.label,
                x: Math.round(x),
                y: Math.round(y),
                ring: layout.mode,
                clock_hour: this._clockHour(x, y, cx, cy)
            });
            this.optionButtons.push({ id: opt.id, el: btn, x, y });
            btn.onpointerdown = (evt) => {
                if (!this._waitingForChoice) return;
                if (evt) evt.stopPropagation();
                this._onSelect(opt.id, evt);
            };
        });
    }

    _fallbackRingAnchor(trial) {
        let box = this._targetBox();
        if (box && box.width > 0) {
            return { cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
        }
        return {
            cx: 0.5 * this.W,
            cy: trial.presentation === "polaroid" || trial.target === "shape"
                ? 0.48 * this.H
                : (this.params.fennimalY != null ? this.params.fennimalY : 0.7) * this.H
        };
    }

    // SVG y-down: 12 o'clock is up. Returns 1–12 (12 = top).
    _clockHour(x, y, cx, cy) {
        let dx = x - cx;
        let dy = y - cy;
        if (dx === 0 && dy === 0) return null;
        let from12 = Math.atan2(dy, dx) + Math.PI / 2;
        if (from12 < 0) from12 += 2 * Math.PI;
        let hour = Math.round(from12 / (2 * Math.PI) * 12) % 12;
        return hour === 0 ? 12 : hour;
    }

    _presentedOptionsLog() {
        return (this.optionLayout || []).map((o) => ({
            id: o.option_id,
            label: o.label,
            clock_hour: o.clock_hour
        }));
    }

    _answerAngles(n, mode, extraSpin) {
        if (n <= 2) {
            return [0, Math.PI];
        }
        if (mode === "half") {
            return Array.from({ length: n }, (_, i) => Math.PI * (i + 0.5) / n);
        }
        let spin = extraSpin != null ? extraSpin : (this.buttonRingSpin != null ? this.buttonRingSpin : -Math.PI / 2);
        return Array.from({ length: n }, (_, i) => spin + (i * 2 * Math.PI / n));
    }

    _ringPoints(cx, cy, radius, angles) {
        return angles.map((a) => ({
            x: cx + Math.cos(a) * radius,
            y: cy + Math.sin(a) * radius
        }));
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

    _lockAnswerButtons() {
        (this.optionButtons || []).forEach((b) => {
            if (!b.el) return;
            b.el.style.pointerEvents = "none";
            b.el.style.cursor = "default";
            b.el.style.opacity = "0.55";
        });
    }

    _armAnswerButtons() {
        (this.optionButtons || []).forEach((b) => {
            if (!b.el) return;
            b.el.style.pointerEvents = "all";
            b.el.style.cursor = "pointer";
            b.el.style.opacity = "1";
        });
    }

    _showAnswerButtons() {
        (this.optionButtons || []).forEach((b) => {
            if (b.el) b.el.style.opacity = "1";
        });
    }

    _lowestOptionButton() {
        let list = this.optionButtons || [];
        if (list.length === 0) return this.occluder;
        return list.slice().sort((a, b) => b.y - a.y)[0].el;
    }

    _waitForOccluderClick() {
        return new Promise((resolve) => {
            this.inputLocked = false;
            const hit = (evt) => {
                if (this.inputLocked) return;
                if (evt) evt.stopPropagation();
                this.inputLocked = true;
                if (this.occluderHit) this.occluderHit.onpointerdown = null;
                if (this.occluder) this.occluder.onpointerdown = null;
                resolve();
            };
            if (this.occluderHit) this.occluderHit.onpointerdown = hit;
            else if (this.occluder) this.occluder.onpointerdown = hit;
        });
    }

    _liftOccluder() {
        if (this.occluder) {
            this.occluder.remove();
            this.occluder = null;
        }
        this.occluderHit = null;
        this._setRevealFilter(0);
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
        let startTarget = this.occluderHit || this.occluder;
        let bubbleDone = this._showBubble(
            startTarget,
            "Something is hidden here. Click the ? when you are ready to start.",
            { hideButton: true, preferredSide: "left" }
        );
        await this._waitForOccluderClick();
        if (Interface && Interface.PartnerSpeechBubble) Interface.PartnerSpeechBubble.confirm();
        await bubbleDone;
        this._afterStartClick();
        this.inputLocked = true;
        await this._showBubble(
            this.questionEl,
            "A question appears at the top. Choose the matching answer as quickly as you can."
        );
        await this._showBubble(
            this._lowestOptionButton(),
            "The buttons around the picture are your answer options. Click one to lock it in — you cannot change it afterwards."
        );
        await this._showBubble(
            this.targetNode || this.stimulusGroup,
            "The picture starts as a dark silhouette. It will become clearer over time."
        );
        await this._showBubble(
            this.pointsEl,
            "As soon as the reveal starts, these points count down. Faster correct answers leave you with more points, which become bonus stars at the end."
        );
        await this._showBubble(
            this.barLeft || this.barRight,
            "The bars show how much time is left before the points reach zero."
        );
        await this._showBubble(
            this.barRight || this.barLeft,
            "If the bars run out, you still have to give an answer. You just will not earn points for that trial."
        );
    }

    async _runNamesLayoutTutorial() {
        this.inputLocked = true;
        await this._showBubble(
            this._lowestOptionButton(),
            "From now on, each button is the name of a Fennimal you know. The names stay in the same places for every photo, so you can learn where each one sits."
        );
        let startTarget = this.occluderHit || this.occluder;
        let bubbleDone = this._showBubble(
            startTarget,
            "Click the ? when you are ready.",
            { hideButton: true, preferredSide: "left" }
        );
        await this._waitForOccluderClick();
        if (Interface && Interface.PartnerSpeechBubble) Interface.PartnerSpeechBubble.confirm();
        await bubbleDone;
        this._afterStartClick();
    }

    _afterStartClick() {
        this._liftOccluder();
        this._showTimeBars();
        let spec = this._leadLagSpec(this.currentTrial);
        this._setBarsProgress(0, spec.hasLag);
        this._setPointsDisplay(this.params.maxPoints || 100);
        this._setRevealFilter(0);
    }

    _onSelect(id, evt) {
        if (this.inputLocked) return;
        if (!this._waitingForChoice) return;
        this.inputLocked = true;
        this._waitingForChoice = false;
        let now = performance.now();
        this._choice = {
            selected_id: id,
            input_type: (evt && evt.pointerType) ? evt.pointerType : "unknown",
            response_perf: now
        };
        if (this._choiceResolve) {
            let r = this._choiceResolve;
            this._choiceResolve = null;
            r(this._choice);
        }
    }

    _runRevealUntilResponse(trial) {
        return new Promise((resolve) => {
            let spec = this._leadLagSpec(trial);
            this._waitingForChoice = !spec.hasLag;
            this.inputLocked = spec.hasLag;
            this._targetStageArmed = !spec.hasLag;
            if (spec.hasLag) this._lockAnswerButtons();
            else this._armAnswerButtons();
            this._choiceResolve = resolve;
            this._choice = null;

            let maxPoints = this.params.maxPoints || 100;
            let start = performance.now();
            this._revealStart = start;
            this._late = false;

            const tick = (now) => {
                if (this.destroyed) return;
                let elapsed = now - start;
                if (spec.hasLag && !this._targetStageArmed && elapsed >= spec.lagMs) {
                    this._targetStageArmed = true;
                    this.inputLocked = false;
                    this._waitingForChoice = true;
                    this._armAnswerButtons();
                }
                let scoreT = this._scoreProgress(elapsed);
                let hold = spec.hasLag && elapsed < spec.lagMs;
                this._setRevealFilter(elapsed, true);
                this._setBarsProgress(scoreT, hold);
                if (!this._pointsFrozen) {
                    this._setPointsDisplay(maxPoints * (1 - scoreT));
                }
                if (scoreT >= 1 && !this._late) {
                    this._late = true;
                    this._setRevealFilter(1);
                    this._setBarsProgress(1, false);
                    this._setPointsDisplay(0);
                }
                this.revealRaf = requestAnimationFrame(tick);
            };
            this.revealRaf = requestAnimationFrame(tick);
        });
    }

    _stopReveal() {
        if (this.revealRaf) {
            cancelAnimationFrame(this.revealRaf);
            this.revealRaf = null;
        }
        this._waitingForChoice = false;
        this._choiceResolve = null;
    }

    _freezeChoice(selectedId) {
        (this.optionButtons || []).forEach((b) => {
            if (b.id === selectedId) {
                b.el.style.opacity = "1";
                let inner = b.el.querySelector(".icon_button_background_inner");
                if (inner) inner.style.stroke = "#d4af37";
            } else {
                b.el.remove();
            }
        });
        this._setRevealFilter(1);
        this._setBarsProgress(this._scoreProgress(performance.now() - (this._revealStart || performance.now())), false);
    }

    async _runTrial(trial) {
        this._clearScene();
        this._pointsFrozen = false;
        this._late = false;
        this.inputLocked = true;

        this._paintBackdrop(trial);
        if (trial.presentation === "location") this._paintFog();
        this._placeStimulusChrome(trial);
        this._placeQuestion(trial);
        this._placePointsHud(this.params.maxPoints || 100);
        this._placeTimeBars();
        this._placeOccluder();
        await this._waitForPaint();
        this._placeStimulusImage(trial);
        this._bindRevealParts(trial);
        this._setupPatchyHoles(trial);
        this._setupTargetVeil(trial);
        this._setRevealFilter(0);
        this._placeAnswerButtons(trial);

        if (trial.tutorial === "practice") {
            await this._runPracticeTutorial();
        } else if (trial.tutorial === "names") {
            await this._runNamesLayoutTutorial();
        } else {
            await this._waitForOccluderClick();
            this._afterStartClick();
        }

        let choice = await this._runRevealUntilResponse(trial);
        this._stopReveal();
        this._pointsFrozen = true;

        let spec = this._leadLagSpec(trial);
        let maxPoints = this.params.maxPoints || 100;
        let rt = Math.round(choice.response_perf - this._revealStart);
        let rtFromTarget = Math.round(choice.response_perf - (this._revealStart + spec.lagMs));
        let scoreT = this._scoreProgress(choice.response_perf - this._revealStart);
        let remaining = Math.max(0, Math.round(maxPoints * (1 - scoreT)));
        let late = scoreT >= 1;
        this._setPointsDisplay(remaining);
        this._freezeChoice(choice.selected_id);

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

        let presented = this._presentedOptionsLog();
        let selectedClock = null;
        presented.forEach((o) => {
            if (o.id === choice.selected_id) selectedClock = o.clock_hour;
        });

        this.answers.push({
            trial_index: this.currentTrialIndex,
            trial_id: trial.id,
            kind: trial.kind || (trial.is_practice ? "practice" : null),
            role: trial.role,
            region_id: trial.region_id || null,
            head_id: trial.head_id || null,
            hat_id: trial.hat_id || null,
            is_practice: !!trial.is_practice,
            presentation: trial.presentation,
            target: trial.target,
            question: trial.question,
            correct_id: trial.correctId,
            selected_id: choice.selected_id,
            selected_clock_hour: selectedClock,
            correct: correct,
            late: late,
            timeout: late,
            reaction_time_ms: rt,
            reaction_time_from_target_onset_ms: rtFromTarget,
            clicked_before_target_onset: spec.hasLag && rt < spec.lagMs,
            prime_part: trial.primePart || null,
            target_part: trial.target || null,
            target_lag_ms: spec.lagMs,
            prime_end_ms: spec.primeEndMs,
            reveal_progress_at_click: Math.round(scoreT * 1000) / 1000,
            excluded_options: (trial.excludeOptionIds || []).slice(),
            mismatch_excluded: (trial.mismatchExcludedIds || []).slice(),
            lookalike_excluded: (trial.lookalikeExcludedIds || []).slice(),
            extra_excluded: (trial.extraExcludedIds || []).slice(),
            n_options: (this.optionButtons || []).length,
            presented_ids: presented.map((o) => o.id),
            presented_options: presented,
            button_order_ids: (this.buttonOrderIds || []).slice(),
            points_at_click: remaining,
            points_awarded: awarded,
            session_points_after: this.sessionPoints,
            option_layout: this.optionLayout,
            input_type: choice.input_type,
            show_body: !!trial.bodyFen,
            query: trial.target,
            host_fennimal: trial.hostFen ? trial.hostFen.id : null,
            body_fennimal: trial.bodyFen ? trial.bodyFen.id : null,
            head_fennimal: trial.headFen ? trial.headFen.id : null,
            hat_fennimal: trial.hatFen ? trial.hatFen.id : null,
            stranger_head: trial.strangerHead || null,
            location: trial.hostFen ? trial.hostFen.location : null,
            region: trial.hostFen ? trial.hostFen.region : "Home",
            reveal_mode: this.revealMode,
            trial_speed: this.trialSpeedMs,
            hole_layout: this._usesPatchyHoles()
                ? ((this.holeLayouts && this.holeLayouts[trial.id]) || null)
                : null
        });

        if (typeof AudioCont !== "undefined" && AudioCont.play_sound_effect) {
            AudioCont.play_sound_effect("button_click");
        }
        await wait(this.params.freezeAfterMs != null ? this.params.freezeAfterMs : 1000);
        this._clearScene();
    }

    clean_up() {
        this.destroyed = true;
        this._stopReveal();
        if (typeof Interface !== "undefined" && Interface.PartnerSpeechBubble) {
            Interface.PartnerSpeechBubble.hide(true);
        }
        if (this.sceneRoot && this.sceneRoot.parentNode) this.sceneRoot.remove();
        this.sceneRoot = null;
        this.layers = null;
    }
}
