/**
 * ARCHIVED: morph_task_two_cards (formerly morph_task).
 * Two-polaroid layout with a static prime polaroid beside the morph photo.
 * Live experiment structures use the redesigned single-polaroid morph_task.
 * Keep this file loadable for replay / recovery; do not point new stimuli here.
 *
 * Original DV: a polaroid shows an ambiguous cross-fade ("morph") between
 * TWO Fennimals. Over the trial window the blend resolves into one of them
 * (the target). The participant picks which of the two named parents the
 * photo truly shows (2AFC). Scoring is hidden; the HUD never reflects accuracy.
 *
 * Rendering: two aligned, same-size Fennimal renders stacked in the photo
 * well. The target sits on top at opacity m; the other parent below at
 * opacity min(1, 2*(1-m)). At m = 0.5 the overlap is an exact 50/50 pixel
 * mix; at m = 1 only the target remains. A blur + paper-film "ambiguity
 * veil" is strongest at m = 0.5 and gone at m = 1, hiding ghost edges early.
 *
 * Morph clock: m(t) = 0.5 + 0.5 * (sig(t) - sig(0)) / (1 - sig(0)),
 * sig(t) = logistic((t - t_mid) / tau). morph_centerpoint c in [0, 1] sets
 * ONLY the midpoint: t_mid = (midpointMinFrac + range * c) * trial_speed.
 * Lower values resolve early; higher values resolve late. Perceptual
 * ambiguity is controlled separately by fixed per-trial noise.
 *
 * Morph modes (per trial, "full" default):
 *   "full"  — each parent painted with its own region palette; shape AND
 *             colour blend together. Requires different heads.
 *   "shape" — both parents painted with the SAME 50/50-blended palette, so
 *             only geometry discriminates. Requires different heads.
 *   "color" — same head geometry (lookalike pair, e.g. A/B), each with its
 *             own palette; the cross-fade acts as pure colour interpolation.
 *             Requires a shared head.
 *   "mesh"  — rasterize both happy-state heads; automatically derive radial
 *             alpha contours plus eye/mouth/neck landmarks; geometrically
 *             warp both sources to one Delaunay mesh before opaque blending.
 *             The TV/Tube pilot may address endpoints by SVG head name.
 *
 * View (per trial, "closeup" default): "closeup" hides the body (head only);
 * "full" shows body + head, for pairs whose discrimination needs the body.
 *
 * grayscale (per trial, default false): if true, both morph parents are painted
 * with a fixed gray ColorScheme (primary/secondary/tertiary/eye fills — not a
 * CSS filter), including mesh sources before rasterize. Independent of
 * prime.color_scheme grayscale, which uses the same fixed palette on prime
 * fills (Fennimal parts, hats, toys).
 *
 * Optional per-trial prime (paid trials only):
 *   prime: { head?, body?, hat?, toy?, color_scheme?, name? }
 * Fields are Fennimal ids. The prime is a static second polaroid to the left
 * of the morph (more angled, slightly lower). It is appended before the main
 * polaroid so the reveal photo paints on top at any overlap. Starts under its
 * own ? cover; participants click that before the main ? arms.
 * toy requires body (attachment point). Empty prime: {} = gray blank photo.
 * If prime.name is set, after the prime ? the caption stays "????" until the
 * participant correctly picks that Fennimal from a radial name ring
 * (block names_options, stable per-participant order); then the true name
 * prints and the main ? unlocks. Unnamed primes keep caption "???" with no quiz.
 *
 * Scoring (chimera scheme): points decay linearly maxPoints -> 0 over
 * trial_speed from "?". Correct adds the remaining points; incorrect silently
 * costs incorrectPenalty (session floor 0). Late answers are still required
 * and score 0. Stars = floor(session_points / pointsPerStar). The prime name
 * quiz is unpaid (no points).
 *
 * resolve_trial (block field, else GenParam.MorphTaskTwoCards.resolveTrial):
 *   true  — on answer the morph rapidly completes to the TRUE Fennimal
 *           (implicit feedback), then freezes.
 *   false — the frame freezes exactly as it was on the click (no feedback).
 */
class MorphTaskTwoCardsController {
    constructor(parentLayer, phaseData, returnfunc, expCont) {
        this.ParentLayer = parentLayer;
        this.phaseData = phaseData;
        this.returnfunc = returnfunc;
        this.expCont = expCont;
        this.params = (typeof GenParam !== "undefined" && GenParam.MorphTaskTwoCards) || {};
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

        this.phaseData.answers = this.answers;
        this.phaseData.trial_speed = this.trialSpeedMs;
        this.phaseData.resolve_trial = this.resolveTrial;
        this.phaseData.morph_two_cards_trial_order = this.queue.map((t) => t.id);
        this.phaseData.morph_two_cards_button_sides = this.buttonSides;
        this.phaseData.morph_two_cards_prime_button_order = this.buttonOrderIds;
        this.phaseData.morph_names_options = (this.nameRoster || []).map((fen) => fen.id);
        this.phaseData.morph_curve = {
            midpoint_min_frac: this._num("midpointMinFrac", 0.15),
            midpoint_max_frac: this._num("midpointMaxFrac", 0.85),
            tau_frac: this._num("tauFrac", 0.07),
            note: "m(t) = 0.5 + 0.5 * normalized logistic around t_mid = f(morph_centerpoint). 0 = resolves early, 1 = resolves late."
        };
    }

    _fail(message) {
        throw new Error("MorphTaskTwoCards: " + message);
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
        let prime = this._expandPrimeSpec(spec.prime, spec.id);
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

    // Optional static cue polaroid. Fields are Fennimal ids (not FeatureMap
    // codes). Empty object {} is valid (gray blank photo). Practice trials
    // never receive a prime — callers should omit the field there.
    _expandPrimeSpec(raw, trialId) {
        if (raw === undefined || raw === null) return null;
        if (typeof raw !== "object" || Array.isArray(raw)) {
            this._fail(`trial "${trialId}" prime must be an object when set.`);
        }
        let headId = this._isBlankPrimeToken(raw.head) ? null : String(raw.head).trim();
        let bodyId = this._isBlankPrimeToken(raw.body) ? null : String(raw.body).trim();
        let hatId = this._isBlankPrimeToken(raw.hat) ? null : String(raw.hat).trim();
        let toyId = this._isBlankPrimeToken(raw.toy) ? null : String(raw.toy).trim();
        let nameId = this._isBlankPrimeToken(raw.name) ? null : String(raw.name).trim();
        let colorRaw = this._isBlankPrimeToken(raw.color_scheme) ? null : String(raw.color_scheme).trim();

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
        } else if (bodyFen) {
            schemeFen = bodyFen;
            schemeMode = "fen";
        }

        let trueCaption = nameFen && nameFen.name ? String(nameFen.name) : null;
        let needsNameQuiz = !!trueCaption;
        let caption = trueCaption || "???";
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

    _nameOptions() {
        return (this.nameRoster || []).map((fen) => ({ id: fen.id, label: fen.name }));
    }

    _assignPrimeNameButtonOrder() {
        let ids = this._nameOptions().map((opt) => opt.id);
        if (!ids.length) {
            this.buttonRingSpin = -Math.PI / 2;
            return [];
        }
        let key = "morph_two_cards_prime_button_order";
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
        return [
            {
                id: "practice_square",
                role: "practice",
                kind: "practice",
                is_practice: true,
                tutorial: "practice",
                shapeTarget: "square",
                shapeOther: "triangle",
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

        let key = "morph_two_cards_trial_order";
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
        let paid = (queue || []).filter((t) => t && !t.is_practice);
        let firstPaid = paid[0];
        let firstPrime = paid.find((t) => t && t.prime);
        if (!firstPaid) return;
        if (firstPrime && firstPaid === firstPrime) {
            firstPaid.tutorial = "prime_pair";
        } else {
            firstPaid.tutorial = "pair";
            if (firstPrime) firstPrime.tutorial = "prime_pair";
        }
    }

    // Per trial: which option id sits on the RIGHT button (the other goes left).
    _assignButtonSides() {
        let key = "morph_two_cards_button_sides";
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
        let tau = Math.max(1, this._num("tauFrac", 0.07) * T);
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

    // Fixed primary/secondary/tertiary/eye grays (GenParam.MorphTaskTwoCards.grayscaleScheme).
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
                "morph_task_two_cards",
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
        this.sceneRoot = create_SVG_group(0, 0, "morph_two_cards_root", "morph_two_cards_root");
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
        this._clearLayer(this.layers && this.layers.Neg1);
        this._clearLayer(this.layers && this.layers.Main);
        this._clearLayer(this.layers && this.layers.Plus1);
        this._clearLayer(this.layers && this.layers.Plus2);
        this.stimulusGroup = null;
        this.photoWellRect = null;
        this.polaroidMount = null;
        this.primePolaroidMount = null;
        this.primeGroup = null;
        this.primeOccluder = null;
        this.primeOccluderHit = null;
        this.occluder = null;
        this.occluderHit = null;
        this.questionEl = null;
        this.pointsEl = null;
        this.pointsDiv = null;
        this.barLeft = null;
        this.barRight = null;
        this.optionButtons = [];
        this.optionsGroup = null;
        this.primeNameButtons = [];
        this.primeNameOptionsGroup = null;
        this.primeNameLayout = [];
        this._primeNameQuizResult = null;
        this._waitingForPrimeName = false;
        this.morphGroup = null;
        this.targetIcon = null;
        this.otherIcon = null;
        this.filmRect = null;
        this.noiseGroup = null;
        this.noiseInterval = null;
        this.noiseFadeTimeout = null;
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

    _placePolaroidChrome(trial, opts) {
        opts = opts || {};
        let isPrime = !!opts.isPrime;
        let hasPrime = !!(trial && trial.prime);
        let template = document.getElementById("polaroid_frame");
        if (!template) this._fail("missing SVG polaroid_frame template.");

        let mainY = (this.params.polaroidY != null ? this.params.polaroidY : 0.48) * this.H;
        let cx;
        let cy;
        let polaroidScale;
        let rotateDeg;
        if (isPrime) {
            cx = (this.params.primePolaroidX != null ? this.params.primePolaroidX : 0.34) * this.W;
            let yOff = this.params.primePolaroidYOffset != null ? this.params.primePolaroidYOffset : 0.04;
            cy = mainY + yOff * this.H;
            polaroidScale = this.params.primePolaroidScale != null ? this.params.primePolaroidScale : 0.82;
            rotateDeg = this.params.primePolaroidRotateDeg != null ? this.params.primePolaroidRotateDeg : -8;
        } else {
            let xFrac = hasPrime
                ? (this.params.polaroidXWithPrime != null ? this.params.polaroidXWithPrime : 0.62)
                : (this.params.polaroidX != null ? this.params.polaroidX : 0.5);
            cx = xFrac * this.W;
            cy = mainY;
            polaroidScale = this.params.polaroidScale != null ? this.params.polaroidScale : 0.9;
            rotateDeg = -3;
        }

        let groupTranslate = create_SVG_group(0, 0, isPrime ? "morph_prime_polaroid" : "morph_polaroid");
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
            if (!isPrime) this.photoWellRect = bgRect;
        }
        let caption;
        if (isPrime) {
            if (trial.prime && trial.prime.needsNameQuiz) caption = "????";
            else caption = (trial.prime && trial.prime.caption) || "???";
        } else {
            caption = trial.question || "";
        }
        this._setPolaroidCaption(frame, caption);

        let framePath = null;
        let photoHost = bgRect && bgRect.parentNode;
        if (photoHost) photoHost.style.pointerEvents = "none";
        if (!isPrime) {
            framePath = this._photoWellPath();
            if (framePath) framePath.style.pointerEvents = "none";
        } else if (photoHost) {
            framePath = photoHost.querySelector(".polaroid_frame_frame")
                || photoHost.getElementsByTagName("path")[0]
                || null;
            if (framePath) framePath.style.pointerEvents = "none";
        }

        groupScale.style.transformOrigin = "center";
        groupRotate.style.transformOrigin = `${cx}px ${cy}px`;
        groupScale.style.transform = `scale(${polaroidScale})`;
        groupRotate.style.transform = `rotate(${rotateDeg}deg)`;

        let mount = { groupTranslate, groupScale, cx, cy, bgRect, photoHost, framePath, frame };
        if (isPrime) {
            this.primePolaroidMount = mount;
            this.primeGroup = groupTranslate;
        } else {
            this.stimulusGroup = groupTranslate;
            this.polaroidMount = mount;
        }
        return mount;
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

    _primePhotoWellBox() {
        let r = this.primePolaroidMount && this.primePolaroidMount.bgRect;
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

    _fitNodeInPhotoWell(node, wFrac, hFrac) {
        if (!node) return;
        let mount = this.polaroidMount || {};
        let bgRect = mount.bgRect || this.photoWellRect;
        let box = node.getBBox();
        let frameBox = bgRect ? bgRect.getBBox() : { x: 0, y: 0, width: 500, height: 600 };
        let scale = Math.min(
            (frameBox.width * wFrac) / Math.max(box.width, 1),
            (frameBox.height * hFrac) / Math.max(box.height, 1)
        );
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
        let node = document.createElementNS("http://www.w3.org/2000/svg", shape === "triangle" ? "polygon" : "rect");
        if (shape === "triangle") {
            node.setAttribute("points", "0,-90 100,80 -100,80");
        } else {
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

    _placeNoiseOverlay(trial) {
        if (!trial) return;
        this._stopNoise();
        let amount = trial.noise == null ? 0 : Number(trial.noise);
        if (!Number.isFinite(amount) || amount <= 0) return;
        amount = Math.max(0, Math.min(1, amount));
        let well = this._photoWellBox();
        if (!well) return;

        let cell = Math.max(2, Math.round(this._num("noiseCellSizePx", 8)));
        let cols = Math.max(1, Math.ceil(well.width / cell));
        let rows = Math.max(1, Math.ceil(well.height / cell));
        let nCells = cols * rows;
        let nCovered = Math.round(nCells * amount);
        let rand = this._seededRand(this._hashString(String(trial.id || "") + "|morph_noise"));
        let cells = [];
        for (let i = 0; i < nCells; i++) cells.push(i);

        let g = create_SVG_group(0, 0, "morph_noise_overlay");
        g.style.pointerEvents = "none";
        for (let i = 0; i < nCovered; i++) {
            let r = create_SVG_rect(0, 0, cell, cell);
            r.setAttribute("stroke", "none");
            r.setAttribute("stroke-width", "0");
            r.style.pointerEvents = "none";
            g.appendChild(r);
        }
        this._insertInPhotoWell(g);
        this.noiseGroup = g;

        let rects = Array.from(g.children);
        const redraw = () => {
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
                let r = rects[i];
                let fill = rand() < 0.5 ? "#000000" : "#ffffff";
                r.setAttribute("x", String(x));
                r.setAttribute("y", String(y));
                r.setAttribute("width", String(Math.max(0, w)));
                r.setAttribute("height", String(Math.max(0, h)));
                r.setAttribute("fill", fill);
                r.setAttribute("stroke", fill);
                r.setAttribute("stroke-width", "0");
            }
        };
        redraw();
        let refreshMs = Math.max(16, Math.round(this._num("noiseRefreshMs", 90)));
        this.noiseInterval = setInterval(redraw, refreshMs);
    }

    _stopNoise(removeOverlay) {
        if (this.noiseInterval) {
            clearInterval(this.noiseInterval);
            this.noiseInterval = null;
        }
        if (this.noiseFadeTimeout) {
            clearTimeout(this.noiseFadeTimeout);
            this.noiseFadeTimeout = null;
        }
        if (removeOverlay && this.noiseGroup) {
            this.noiseGroup.remove();
            this.noiseGroup = null;
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
        }, ms + 40);
    }

    // After a choice: resolve_trial true fades static away so the truth photo
    // is unobstructed; false freezes the current static frame in place.
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

    _insertInPrimeWell(node) {
        let mount = this.primePolaroidMount || {};
        let host = mount.photoHost || (mount.bgRect && mount.bgRect.parentNode);
        if (!host || !node) return false;
        let before = (this.primeOccluder && this.primeOccluder.parentNode === host)
            ? this.primeOccluder
            : (mount.framePath
                || host.querySelector(".polaroid_frame_frame")
                || host.getElementsByTagName("path")[0]
                || null);
        if (before) host.insertBefore(node, before);
        else host.appendChild(node);
        return true;
    }

    _fitNodeInPrimeWell(node, widthFrac, heightFrac) {
        let mount = this.primePolaroidMount || {};
        let wellRect = mount.bgRect;
        if (!node || !wellRect) return;
        let well;
        try {
            well = {
                x: parseFloat(wellRect.getAttribute("x")),
                y: parseFloat(wellRect.getAttribute("y")),
                width: parseFloat(wellRect.getAttribute("width")),
                height: parseFloat(wellRect.getAttribute("height"))
            };
            if (![well.x, well.y, well.width, well.height].every(Number.isFinite)) {
                let b = wellRect.getBBox();
                well = { x: b.x, y: b.y, width: b.width, height: b.height };
            }
        } catch (e) {
            return;
        }
        let box;
        try { box = node.getBBox(); } catch (e) { return; }
        if (!(box.width > 0 && box.height > 0)) return;
        let scale = Math.min(
            (well.width * (widthFrac != null ? widthFrac : 0.72)) / box.width,
            (well.height * (heightFrac != null ? heightFrac : 0.62)) / box.height
        );
        let wellCx = well.x + well.width / 2;
        let wellCy = well.y + well.height / 2;
        let cx = box.x + box.width / 2;
        let cy = box.y + box.height / 2;
        node.setAttribute(
            "transform",
            `translate(${wellCx}, ${wellCy}) scale(${scale}) translate(${-cx}, ${-cy})`
        );
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

    _placePrimeStimulus(trial) {
        if (!trial || !trial.prime || trial.is_practice) return;
        let prime = trial.prime;
        this._placePolaroidChrome(trial, { isPrime: true });
        let mount = this.primePolaroidMount;
        if (!mount || !mount.bgRect) this._fail(`trial "${trial.id}" prime polaroid failed to mount.`);

        if (prime.empty) {
            let well;
            try {
                well = {
                    x: parseFloat(mount.bgRect.getAttribute("x")),
                    y: parseFloat(mount.bgRect.getAttribute("y")),
                    width: parseFloat(mount.bgRect.getAttribute("width")),
                    height: parseFloat(mount.bgRect.getAttribute("height")),
                    rx: mount.bgRect.getAttribute("rx") || "0",
                    ry: mount.bgRect.getAttribute("ry") || "0"
                };
            } catch (e) {
                well = null;
            }
            if (well && [well.x, well.y, well.width, well.height].every(Number.isFinite)) {
                let fill = create_SVG_rect(well.x, well.y, well.width, well.height);
                fill.setAttribute("rx", well.rx);
                fill.setAttribute("ry", well.ry);
                fill.setAttribute("fill", this.params.primeEmptyFill || "#9a9590");
                fill.style.pointerEvents = "none";
                this._insertInPrimeWell(fill);
            }
            return;
        }

        let built = this._buildPrimeIcon(prime);
        if (!this._insertInPrimeWell(built.node) && mount.groupScale) {
            mount.groupScale.appendChild(built.node);
        }
        this._fitNodeInPrimeWell(built.node, built.widthFrac, built.heightFrac);
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

    _placePrimeOccluder() {
        let well = this._primePhotoWellBox();
        if (!well) this._fail("missing prime photo well for occluder.");
        let built = this._buildOccluderGroup(well, "morph_prime_occluder");
        this._insertInPrimeWell(built.g);
        this.primeOccluder = built.g;
        this.primeOccluderHit = built.hit;
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
            img.onload = () => {
                ctx.clearRect(0, 0, size, size);
                ctx.drawImage(img, 0, 0, size, size);
                resolve();
            };
            img.onerror = () => reject(new Error(`could not rasterize head "${fen.head}".`));
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

    async _placeMeshStimulus(trial) {
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
        this._insertInPhotoWell(foreign);

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
            return true;
        } catch (err) {
            console.warn("MorphTaskTwoCards mesh renderer fell back to cross-fade:", err);
            this.meshFallbackReason = err && err.message ? err.message : String(err);
            if (foreign.parentNode) foreign.remove();
            this.meshCanvas = null;
            this.meshForeignObject = null;
            this.meshData = null;
            return false;
        }
    }

    // Veil blur only (grayscale is painted into fills / mesh sources, not filtered).
    _setMorphGroupFilter(extra) {
        if (!this.morphGroup) return;
        this.morphGroup.style.filter = (extra && extra !== "none") ? extra : "none";
    }

    async _placeMorphStimulus(trial) {
        if (!trial.is_practice && trial.morph === "mesh") {
            let ready = await this._placeMeshStimulus(trial);
            if (ready) {
                this._setMorphGroupFilter("none");
                this._applyMorph(0.5);
                return;
            }
        }
        let group = create_SVG_group(0, 0, "morph_stimulus");
        group.style.pointerEvents = "none";
        this._insertInPhotoWell(group);
        this.morphGroup = group;
        this.activeRenderer = trial.is_practice ? "shape-crossfade" : "crossfade";

        if (trial.is_practice) {
            this.otherIcon = this._buildShapeNode(trial.shapeOther);
            this.targetIcon = this._buildShapeNode(trial.shapeTarget);
            group.appendChild(this.otherIcon);
            group.appendChild(this.targetIcon);
            this._fitNodeInPhotoWell(this.otherIcon, 0.62, 0.55);
            this._fitNodeInPhotoWell(this.targetIcon, 0.62, 0.55);
        } else {
            let schemes = this._schemesForMorphTrial(trial);
            this.otherIcon = this._buildParentIcon(trial, trial.otherFen, schemes.other);
            this.targetIcon = this._buildParentIcon(trial, trial.targetFen, schemes.target);
            group.appendChild(this.otherIcon);
            group.appendChild(this.targetIcon);
            let showBody = trial.view === "full";
            let wFrac = showBody ? 0.78 : 0.72;
            let hFrac = showBody ? 0.78 : 0.62;
            this._fitNodeInPhotoWell(this.otherIcon, wFrac, hFrac);
            this._fitNodeInPhotoWell(this.targetIcon, wFrac, hFrac);
        }

        // Ambiguity film above the stacked renders (below frame + occluder).
        let well = this._photoWellBox();
        if (well) {
            let film = create_SVG_rect(well.x, well.y, well.width, well.height);
            film.setAttribute("rx", well.rx);
            film.setAttribute("ry", well.ry);
            film.setAttribute("fill", this.params.filmFill || this.params.polaroidPaperFill || "#f4efe4");
            film.style.pointerEvents = "none";
            this._insertInPhotoWell(film);
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

    // ------------------------------------------------------------------
    // HUD: occluder, question, points, time bars, answer buttons
    // ------------------------------------------------------------------

    _placeOccluder() {
        let well = this._photoWellBox();
        if (!well) this._fail("missing photo well for occluder.");
        let needsPrimeFirst = !!(this.currentTrial && this.currentTrial.prime && !this.currentTrial.is_practice);
        let built = this._buildOccluderGroup(well, "morph_occluder", { highlight: !needsPrimeFirst });
        this._insertInPhotoWell(built.g);
        this.occluder = built.g;
        this.occluderHit = built.hit;

        if (needsPrimeFirst) {
            this._setMainOccluderPending(true);
        }
    }

    _setMainOccluderPending(pending) {
        if (!this.occluderHit) return;
        this.occluderHit.style.pointerEvents = pending ? "none" : "all";
        this.occluderHit.style.cursor = pending ? "default" : "pointer";
        if (pending) {
            this.occluderHit.classList.remove("focus_on_SVG_outline");
        } else {
            this.occluderHit.classList.add("focus_on_SVG_outline");
        }
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
        let hud = this._placeHudBubble(x, y, w, h, String(Math.round(value)), "morph_points", 34);
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

    _placeAnswerButtons(trial) {
        let rightId = this.buttonSides[trial.id];
        let ordered = trial.options.slice().sort((a, b) => {
            // Right button first for logging symmetry; layout below assigns sides.
            if (a.id === rightId) return -1;
            if (b.id === rightId) return 1;
            return 0;
        });
        let right = ordered[0];
        let left = ordered[1];

        let btnW = this.params.buttonW || 200;
        let btnH = this.params.buttonH || 72;
        let radius = this.params.buttonRadius != null ? this.params.buttonRadius : 260;
        let mount = this.polaroidMount || {};
        let cx = mount.cx != null ? mount.cx : 0.5 * this.W;
        let cy = mount.cy != null ? mount.cy : 0.48 * this.H;
        let minX = 16 + btnW / 2;
        let maxX = this.W - 16 - btnW / 2;

        let group = create_SVG_group(0, 0, "morph_options");
        this.layers.Plus1.appendChild(group);
        this.optionsGroup = group;
        this.optionButtons = [];
        this.optionSides = { left_id: left.id, right_id: right.id };

        [{ opt: left, x: Math.max(minX, cx - radius), side: "left" },
         { opt: right, x: Math.min(maxX, cx + radius), side: "right" }].forEach((slot) => {
            let btn = create_SVG_buttonElement(slot.x, cy, btnW, btnH, slot.opt.label, 28);
            btn.style.cursor = "default";
            btn.style.opacity = "1";
            btn.style.pointerEvents = "none";
            group.appendChild(btn);
            this.optionButtons.push({ id: slot.opt.id, label: slot.opt.label, el: btn, side: slot.side });
            btn.onpointerdown = (evt) => {
                if (!this._waitingForChoice) return;
                if (evt) evt.stopPropagation();
                this._onSelect(slot.opt.id, evt);
            };
        });
    }

    _hideMorphAnswerButtons() {
        if (this.optionsGroup) this.optionsGroup.style.display = "none";
        (this.optionButtons || []).forEach((b) => {
            if (!b.el) return;
            b.el.style.pointerEvents = "none";
            b.el.style.cursor = "default";
        });
    }

    _showMorphAnswerButtonsLocked() {
        if (this.optionsGroup) this.optionsGroup.style.display = "";
        this._lockAnswerButtons();
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

    // ------------------------------------------------------------------
    // Prime name quiz (radial ring after named prime reveal)
    // ------------------------------------------------------------------

    _placePrimeNameButtons(trial) {
        let options = this._sortByButtonOrder(this._nameOptions());
        if (!options.length) this._fail(`trial "${trial.id}" prime name quiz has no name options.`);
        let n = options.length;
        let btnW = this.params.buttonW || 200;
        let btnH = this.params.buttonH || 72;
        let radius = n <= 2 ? 240 : (this.params.primeNameRadialRadius != null
            ? this.params.primeNameRadialRadius
            : (this.params.radialRadius != null ? this.params.radialRadius : 300));
        let mount = this.primePolaroidMount || this.polaroidMount || {};
        let cx = mount.cx != null ? mount.cx : 0.34 * this.W;
        let cy = mount.cy != null ? mount.cy : 0.52 * this.H;
        let minX = 16 + btnW / 2;
        let maxX = this.W - 16 - btnW / 2;
        let minY = 110 + btnH / 2;
        let maxY = this.H - 18 - btnH / 2;
        let spin = n > 2 ? (this.buttonRingSpin != null ? this.buttonRingSpin : -Math.PI / 2) : 0;
        let layout = this._fitAnswerRing(n, cx, cy, radius, false, minX, maxX, minY, maxY, spin);

        this._clearPrimeNameButtons();
        let group = create_SVG_group(0, 0, "morph_prime_name_options");
        this.layers.Plus1.appendChild(group);
        this.primeNameOptionsGroup = group;
        this.primeNameButtons = [];
        this.primeNameLayout = [];

        options.forEach((opt, i) => {
            let x = layout.points[i].x;
            let y = layout.points[i].y;
            let btn = create_SVG_buttonElement(x, y, btnW, btnH, opt.label, 28);
            btn.style.cursor = "pointer";
            btn.style.opacity = "1";
            btn.style.pointerEvents = "all";
            group.appendChild(btn);
            this.primeNameLayout.push({
                option_id: opt.id,
                label: opt.label,
                x: Math.round(x),
                y: Math.round(y),
                ring: layout.mode,
                clock_hour: this._clockHour(x, y, cx, cy)
            });
            this.primeNameButtons.push({ id: opt.id, label: opt.label, el: btn, x, y });
            btn.onpointerdown = (evt) => {
                if (!this._waitingForPrimeName || this._primeNameFeedbackBusy) return;
                if (evt) evt.stopPropagation();
                this._onPrimeNameSelect(opt.id, evt);
            };
        });
    }

    _clearPrimeNameButtons() {
        if (this.primeNameOptionsGroup) {
            this.primeNameOptionsGroup.remove();
            this.primeNameOptionsGroup = null;
        }
        this.primeNameButtons = [];
    }

    _hidePrimeNameButtons() {
        if (this.primeNameOptionsGroup) this.primeNameOptionsGroup.style.display = "none";
        (this.primeNameButtons || []).forEach((b) => {
            if (!b.el) return;
            b.el.style.pointerEvents = "none";
        });
    }

    _showPrimeNameButtons() {
        if (this.primeNameOptionsGroup) this.primeNameOptionsGroup.style.display = "";
        (this.primeNameButtons || []).forEach((b) => {
            if (!b.el) return;
            b.el.style.pointerEvents = "all";
            b.el.style.cursor = "pointer";
            b.el.style.opacity = "1";
        });
    }

    async _shakePrimePolaroid() {
        let el = this.primeGroup
            || (this.primePolaroidMount && this.primePolaroidMount.groupTranslate);
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

    async _feedbackPrimeNameIncorrect() {
        if (this._primeNameFeedbackBusy) return;
        this._primeNameFeedbackBusy = true;
        this.inputLocked = true;
        this._waitingForPrimeName = false;
        this._hidePrimeNameButtons();
        this._hideMorphAnswerButtons();
        if (this._primeNameTutorialActive
            && typeof Interface !== "undefined"
            && Interface.PartnerSpeechBubble) {
            Interface.PartnerSpeechBubble.hide(true);
        }
        if (typeof AudioCont !== "undefined" && AudioCont.play_sound_effect) {
            AudioCont.play_sound_effect("rejected");
        }
        let shakeDone = this._shakePrimePolaroid();
        await wait(this.params.primeNameIncorrectMs != null ? this.params.primeNameIncorrectMs : 1000);
        await shakeDone;
        if (this.destroyed) return;
        this._showPrimeNameButtons();
        if (this._primeNameTutorialActive) {
            this._showPrimeNameTutorialBubble(this.currentTrial);
        }
        this._primeNameFeedbackBusy = false;
        this._waitingForPrimeName = true;
        this.inputLocked = false;
    }

    _primeNameCorrectButtonEl(trial) {
        let id = trial && trial.prime && trial.prime.nameFen && trial.prime.nameFen.id;
        let btn = (this.primeNameButtons || []).find((b) => b.id === id);
        return (btn && btn.el) || this.primeGroup || this.questionEl;
    }

    // Non-blocking: hideButton bubble aimed at the correct name; dismissed on
    // correct pick (or hidden/re-shown after an incorrect pick during tutorial).
    _showPrimeNameTutorialBubble(trial) {
        let target = this._primeNameCorrectButtonEl(trial);
        if (!target) return null;
        return this._showBubble(
            target,
            "First name who is on the preview photo. The names stay in the same places.",
            { hideButton: true, preferredSide: "left" }
        );
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

    _revealPrimeTrueCaption(trial) {
        let frame = this.primePolaroidMount && this.primePolaroidMount.frame;
        let text = (trial.prime && (trial.prime.trueCaption || trial.prime.caption)) || "???";
        if (frame) this._setPolaroidCaption(frame, text);
        if (trial.prime && trial.prime.log) trial.prime.log.caption = text;
    }

    _onPrimeNameSelect(id, evt) {
        if (this.inputLocked || this._primeNameFeedbackBusy) return;
        if (!this._waitingForPrimeName) return;
        let result = this._primeNameQuizResult;
        if (!result) return;
        let now = performance.now();
        result.attempts.push({
            selected_id: id,
            t_ms: Math.round(now - result.start_perf),
            input_type: (evt && evt.pointerType) ? evt.pointerType : "unknown"
        });
        if (id !== result.correct_id) {
            this._feedbackPrimeNameIncorrect();
            return;
        }

        this.inputLocked = true;
        this._waitingForPrimeName = false;
        if (this._primeNameTutorialActive
            && typeof Interface !== "undefined"
            && Interface.PartnerSpeechBubble) {
            Interface.PartnerSpeechBubble.confirm();
        }
        this._primeNameTutorialActive = false;
        if (typeof AudioCont !== "undefined" && AudioCont.play_sound_effect) {
            AudioCont.play_sound_effect("button_click");
        }
        let presented = (this.primeNameLayout || []).map((o) => ({
            id: o.option_id,
            label: o.label,
            clock_hour: o.clock_hour
        }));
        this._revealPrimeTrueCaption(this.currentTrial);
        this._clearPrimeNameButtons();
        this._showMorphAnswerButtonsLocked();
        result.reaction_time_ms = Math.round(now - result.start_perf);
        result.n_errors = Math.max(0, result.attempts.length - 1);
        result.selected_id = id;
        result.correct = true;
        result.presented_options = presented;
        result.button_order_ids = (this.buttonOrderIds || []).slice();
        if (this._primeNameResolve) {
            let r = this._primeNameResolve;
            this._primeNameResolve = null;
            r(result);
        }
    }

    _runPrimeNameQuiz(trial) {
        this._hideMorphAnswerButtons();
        this._placePrimeNameButtons(trial);
        this._primeNameQuizResult = {
            correct_id: trial.prime.nameFen.id,
            attempts: [],
            start_perf: performance.now()
        };
        return new Promise((resolve) => {
            this._waitingForPrimeName = true;
            this.inputLocked = false;
            this._primeNameResolve = resolve;
        });
    }

    // After the prime photo is fully handled (revealed, and named if required),
    // show the morph L/R buttons locked until the main ? starts the clock.
    _revealMorphAnswerButtonsAfterPrime(trial) {
        if (!(trial && trial.prime && !trial.is_practice)) return;
        this._showMorphAnswerButtonsLocked();
    }

    // ------------------------------------------------------------------
    // Trial start, tutorials
    // ------------------------------------------------------------------

    _waitForPrimeOccluderClick() {
        return new Promise((resolve) => {
            this.inputLocked = false;
            const hit = (evt) => {
                if (this.inputLocked) return;
                if (evt) evt.stopPropagation();
                this.inputLocked = true;
                if (this.primeOccluderHit) this.primeOccluderHit.onpointerdown = null;
                resolve();
            };
            if (this.primeOccluderHit) this.primeOccluderHit.onpointerdown = hit;
            else resolve();
        });
    }

    _waitForOccluderClick() {
        return new Promise((resolve) => {
            this.inputLocked = false;
            const hit = (evt) => {
                if (this.inputLocked) return;
                if (evt) evt.stopPropagation();
                this.inputLocked = true;
                if (this.occluderHit) this.occluderHit.onpointerdown = null;
                resolve();
            };
            if (this.occluderHit) this.occluderHit.onpointerdown = hit;
            else resolve();
        });
    }

    _liftPrimeOccluder(opts) {
        opts = opts || {};
        if (this.primeOccluder) {
            this.primeOccluder.remove();
            this.primeOccluder = null;
        }
        this.primeOccluderHit = null;
        if (opts.unlockMain !== false) {
            this._setMainOccluderPending(false);
        }
    }

    _liftOccluder() {
        if (this.occluder) {
            this.occluder.remove();
            this.occluder = null;
        }
        this.occluderHit = null;
    }

    _afterStartClick() {
        this._liftOccluder();
        this._showTimeBars();
        this._setBarsProgress(0);
        this._setPointsDisplay(this.params.maxPoints || 100);
        this._applyMorph(0.5);
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
            this.morphGroup || this.stimulusGroup,
            "The picture starts as a blurry mix of two things. Over time it settles into just one of them."
        );
        await this._showBubble(
            (this.optionButtons[0] && this.optionButtons[0].el) || this.questionEl,
            "The two buttons name the two possibilities. Click the one the picture is really showing — you cannot change your answer afterwards."
        );
        await this._showBubble(
            this.pointsEl,
            "These points count down from the start. Answering earlier leaves you with more points, which become bonus stars at the end — but only if you are right."
        );
        await this._showBubble(
            this.barLeft || this.barRight,
            "The bars show how much time is left before the points reach zero. If they run out, you still have to answer — you just will not earn points for that trial."
        );
    }

    async _runPairTutorial() {
        this.inputLocked = true;
        await this._showBubble(
            (this.optionButtons[0] && this.optionButtons[0].el) || this.questionEl,
            "From now on, each photo is a mix of two Fennimals you know. The two buttons name them — click who the photo really shows."
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

    async _runPrimePairTutorial(trial) {
        this.inputLocked = true;
        let includeNamesIntro = !!(trial && this.queue && this.queue.find((t) => t && !t.is_practice) === trial);
        if (includeNamesIntro) {
            await this._showBubble(
                this.questionEl,
                "From now on, each photo is a mix of two Fennimals you know. The two buttons name them — click who the photo really shows."
            );
        }
        let primeBubbleDone = this._showBubble(
            this.primeOccluderHit || this.primeOccluder,
            "This trial has two photos — click the ? on the left preview first.",
            { hideButton: true, preferredSide: "right" }
        );
        await this._waitForPrimeOccluderClick();
        let needsQuiz = this._primeNeedsNameQuiz(trial);
        this._liftPrimeOccluder({ unlockMain: !needsQuiz });
        if (Interface && Interface.PartnerSpeechBubble) Interface.PartnerSpeechBubble.confirm();
        await primeBubbleDone;

        if (needsQuiz) {
            this._hideMorphAnswerButtons();
            this._placePrimeNameButtons(trial);
            this._primeNameTutorialActive = true;
            this._showPrimeNameTutorialBubble(trial);
            this._primeNameQuizResult = {
                correct_id: trial.prime.nameFen.id,
                attempts: [],
                start_perf: performance.now()
            };
            await new Promise((resolve) => {
                this._waitingForPrimeName = true;
                this.inputLocked = false;
                this._primeNameResolve = resolve;
            });
            this._primeNameTutorialActive = false;
            this._setMainOccluderPending(false);
        } else {
            this._revealMorphAnswerButtonsAfterPrime(trial);
        }

        let mainBubbleDone = this._showBubble(
            this.occluderHit || this.occluder,
            "Click the ? when you are ready.",
            { hideButton: true, preferredSide: "left" }
        );
        await this._waitForOccluderClick();
        if (Interface && Interface.PartnerSpeechBubble) Interface.PartnerSpeechBubble.confirm();
        await mainBubbleDone;
        this._afterStartClick();
    }

    async _awaitPrimeThenMainReveal() {
        if (this.currentTrial && this.currentTrial.prime && !this.currentTrial.is_practice) {
            await this._waitForPrimeOccluderClick();
            let needsQuiz = this._primeNeedsNameQuiz(this.currentTrial);
            this._liftPrimeOccluder({ unlockMain: !needsQuiz });
            if (needsQuiz) {
                await this._runPrimeNameQuiz(this.currentTrial);
                this._setMainOccluderPending(false);
            } else {
                this._revealMorphAnswerButtonsAfterPrime(this.currentTrial);
            }
        }
        await this._waitForOccluderClick();
        this._afterStartClick();
    }

    // ------------------------------------------------------------------
    // Morph clock and response
    // ------------------------------------------------------------------

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

    _runMorphUntilResponse(trial) {
        return new Promise((resolve) => {
            this._waitingForChoice = true;
            this.inputLocked = false;
            this._armAnswerButtons();
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

    // Rapidly complete the morph to the TRUE Fennimal (m -> 1).
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

    _freezeChoice(selectedId) {
        (this.optionButtons || []).forEach((b) => {
            if (b.id === selectedId) {
                b.el.style.opacity = "1";
                b.el.style.pointerEvents = "none";
                let inner = b.el.querySelector(".icon_button_background_inner");
                if (inner) inner.style.stroke = "#d4af37";
            } else {
                b.el.remove();
            }
        });
    }

    // ------------------------------------------------------------------
    // Trial driver
    // ------------------------------------------------------------------

    async _runTrial(trial) {
        this._clearScene();
        this._pointsFrozen = false;
        this._late = false;
        this.inputLocked = true;
        this._primeNameQuizResult = null;
        this._waitingForPrimeName = false;
        this._primeNameResolve = null;
        this._primeNameFeedbackBusy = false;
        this._primeNameTutorialActive = false;

        this._paintBackdrop();
        if (trial.prime && !trial.is_practice) {
            this._placePrimeStimulus(trial);
        }
        this._placePolaroidChrome(trial);
        this._placeQuestion(trial);
        this._placePointsHud(this.params.maxPoints || 100);
        this._placeTimeBars();
        this._placeOccluder();
        if (trial.prime && !trial.is_practice) {
            this._placePrimeOccluder();
        }
        await this._waitForPaint();
        await this._placeMorphStimulus(trial);
        this._placeNoiseOverlay(trial);
        this._placeAnswerButtons(trial);
        this._lockAnswerButtons();
        if (trial.prime && !trial.is_practice) {
            this._hideMorphAnswerButtons();
        }

        if (trial.tutorial === "practice") {
            await this._runPracticeTutorial();
        } else if (trial.tutorial === "prime_pair") {
            await this._runPrimePairTutorial(trial);
        } else if (trial.tutorial === "pair") {
            await this._runPairTutorial();
        } else {
            await this._awaitPrimeThenMainReveal();
        }

        let choice = await this._runMorphUntilResponse(trial);
        this._stopMorph();
        this._handleNoiseAfterChoice();
        this._pointsFrozen = true;

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
            selected_side: (this.optionSides && this.optionSides.right_id === choice.selected_id) ? "right"
                : ((this.optionSides && this.optionSides.left_id === choice.selected_id) ? "left" : null),
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
            presented_ids: (this.optionButtons || []).map((b) => b.id),
            presented_options: (this.optionButtons || []).map((b) => ({ id: b.id, label: b.label, side: b.side })),
            n_options: (this.optionButtons || []).length,
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
        await wait(this.params.freezeAfterMs != null ? this.params.freezeAfterMs : 1000);
        this._clearScene();
    }

    clean_up() {
        this.destroyed = true;
        this._stopMorph();
        this._stopResolveAnim();
        this._stopNoise(true);
        if (typeof Interface !== "undefined" && Interface.PartnerSpeechBubble) {
            Interface.PartnerSpeechBubble.hide(true);
        }
        if (this.sceneRoot && this.sceneRoot.parentNode) this.sceneRoot.remove();
        this.sceneRoot = null;
        this.layers = null;
    }
}
