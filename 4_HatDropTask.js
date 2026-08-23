/**
 * Hat-drop 2AFC and go/no-go: falling cue hat, sled, decaying points.
 * Indoor machine room. No trial-by-trial accuracy feedback.
 * Phase type "hat_drop_gonogo" uses one box (keep under the chute or slide aside).
 *
 * Trials name Fennimals by id. The controller looks those ids up and
 * runs the row as written — no searched_triad / singletons roster.
 *
 * Stimulus gates: n_reps, instruction_order, min_points, max_points,
 * total_fall_time, preview_ms, preview_travel_ms, skip_practice,
 * skip_instructions.
 *
 * n_reps = 1 uses instruction_order as written. Extra reps rotate that
 * order (Latin square) and reshuffle trials inside each subblock.
 */
class HatDropTaskController {
    constructor(parentLayer, phaseData, returnfunc, expCont) {
        this.ParentLayer = parentLayer;
        this.phaseData = phaseData;
        this.returnfunc = returnfunc;
        this.expCont = expCont;
        this.params = (typeof GenParam !== "undefined" && GenParam.HatDrop) || {};
        this.W = GenParam.SVG_width;
        this.H = GenParam.SVG_height;

        this.fensById = this._indexFennimals(expCont && expCont.stimuli);
        this.isGng = this.phaseData && this.phaseData.type === "hat_drop_gonogo";
        this.nReps = this._resolveNReps();
        this.minPoints = this._resolveNumber("min_points", this.params.minPoints, 25);
        this.maxPoints = this._resolveNumber("max_points", this.params.maxPoints, 100);
        this.totalFallTime = this._resolveNumber("total_fall_time", this.params.totalFallTime, 4000);
        this.previewMs = this._resolveNumber("preview_ms", this.params.previewMs, 750);
        this.previewTravelMs = this._resolveNumber("preview_travel_ms", this.params.previewTravelMs, 320);
        this.warningMs = this.params.warningMs != null ? this.params.warningMs : 600;
        this.lockDropMs = this.params.lockDropMs != null ? this.params.lockDropMs : 250;
        this.holdMs = this.params.freezeAfterMs != null ? this.params.freezeAfterMs : 800;
        this.instructionOrder = this._resolveInstructionOrder();
        this.trialSpecs = this._readTrialSpecs();
        this.trialsByInstruction = this._groupTrialsByInstruction(this.trialSpecs);

        this.answers = [];
        this.sessionPoints = 0;
        this.destroyed = false;
        this.inputArmed = false;
        this.sledLocked = false;
        this._panelClose = null;
        this.shownInstructions = {};
        this.layers = null;
        this.sceneRoot = null;
        this.currentTrial = null;
        this.fallRaf = null;
        this._boundKeyDown = (evt) => this._onKeyDown(evt);
        this._boundKeyUp = (evt) => this._onKeyUp(evt);
        this._panelSpaceDown = false;
        this.panelKey = null;
        this.phaseProgressDone = 0;
        this.phaseProgressTotal = 1;
        this.geo = this._geometry();
        this.plan = this._buildPlan();

        this.phaseData.answers = this.answers;
        this.phaseData.n_reps = this.nReps;
        this.phaseData.min_points = this.minPoints;
        this.phaseData.max_points = this.maxPoints;
        this.phaseData.total_fall_time = this.totalFallTime;
        this.phaseData.preview_ms = this.previewMs;
        this.phaseData.preview_travel_ms = this.previewTravelMs;
        this.phaseData.hat_drop_plan = this.plan;
        this.phaseData.hat_drop_mode = this.isGng ? "gonogo" : "2afc";
    }

    _fail(message) {
        throw new Error("HatDropTask: " + message);
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

    _trialFen(id, path) {
        if (!id) this._fail(`${path} is missing a Fennimal id.`);
        let fen = this._getFen(id, path);
        if (!fen.hat) this._fail(`${path} Fennimal "${id}" has no hat.`);
        return fen;
    }

    _allowedInstructions() {
        return this.isGng ? ["cousin", "neighbour"] : ["most_similar", "cousin", "neighbour"];
    }

    _readTrialSpecs() {
        let specs = this.phaseData.trials;
        if (!Array.isArray(specs) || specs.length === 0) {
            this._fail("phase.trials must be a non-empty array (define the hat-drop trialset in stimulus settings).");
        }
        let allowedInst = this._allowedInstructions();
        let seen = {};
        return specs.map((raw, i) => {
            if (!raw || !raw.id) this._fail(`trials[${i}] is missing an id.`);
            if (seen[raw.id]) this._fail(`duplicate trial id "${raw.id}".`);
            seen[raw.id] = true;
            let instruction = raw.instruction;
            if (!allowedInst.includes(instruction)) {
                this._fail(`trials[${i}] ("${raw.id}") instruction must be ${allowedInst.map((k) => `"${k}"`).join(" | ")} (got "${instruction}").`);
            }
            this._trialFen(raw.dropped, `trials[${i}].dropped`);
            if (this.isGng) {
                this._trialFen(raw.box, `trials[${i}].box`);
                let responseRaw = raw.response != null ? raw.response : raw.correct;
                let response = String(responseRaw || "").toLowerCase();
                if (response !== "go" && response !== "nogo") {
                    this._fail(`trials[${i}] ("${raw.id}") correct/response must be "go" or "nogo" (got "${responseRaw}").`);
                }
                return {
                    id: String(raw.id),
                    instruction,
                    dropped: raw.dropped,
                    box: raw.box,
                    response,
                    role: raw.role || null
                };
            }
            let lure = raw.lure != null ? raw.lure : raw.incorrect;
            this._trialFen(raw.correct, `trials[${i}].correct`);
            this._trialFen(lure, `trials[${i}].lure`);
            if (raw.dropped === raw.correct || raw.dropped === lure || raw.correct === lure) {
                this._fail(`trials[${i}] ("${raw.id}") dropped / correct / lure must be three different Fennimals.`);
            }
            return {
                id: String(raw.id),
                instruction,
                dropped: raw.dropped,
                correct: raw.correct,
                lure,
                role: raw.role || null
            };
        });
    }

    _groupTrialsByInstruction(specs) {
        let map = {};
        specs.forEach((spec) => {
            if (!map[spec.instruction]) map[spec.instruction] = [];
            map[spec.instruction].push(spec);
        });
        this.instructionOrder.forEach((key) => {
            if (!map[key] || !map[key].length) {
                this._fail(`instruction_order includes "${key}" but trials[] has no rows for it.`);
            }
        });
        Object.keys(map).forEach((key) => {
            if (!this.instructionOrder.includes(key)) {
                this._fail(`trials[] includes instruction "${key}" which is not in instruction_order — those trials would never run.`);
            }
        });
        return map;
    }

    _sourceFingerprint() {
        return JSON.stringify(this.trialSpecs.map((s) => ({
            id: s.id,
            instruction: s.instruction,
            dropped: s.dropped,
            correct: s.correct || null,
            lure: s.lure || null,
            box: s.box || null,
            response: s.response || null,
            role: s.role || null
        })));
    }

    _nPaidTrials() {
        return this.instructionOrder.reduce((n, key) => n + ((this.trialsByInstruction[key] || []).length), 0) * this.nReps;
    }

    _resolveNumber(phaseKey, paramVal, fallback) {
        let raw = this.phaseData[phaseKey];
        if (raw === undefined || raw === null || raw === "") raw = paramVal;
        if (raw === undefined || raw === null || raw === "") raw = fallback;
        let n = Number(raw);
        if (!Number.isFinite(n)) this._fail(`${phaseKey} must be a number (got "${raw}").`);
        return n;
    }

    _resolveNReps() {
        let n = this._resolveNumber("n_reps", this.params.nReps, 1);
        if (n < 1 || !Number.isInteger(n)) this._fail(`n_reps must be an integer >= 1 (got "${n}").`);
        return n;
    }

    _resolveInstructionOrder() {
        let allowed = this._allowedInstructions();
        let fallback = this.isGng ? ["neighbour", "cousin"] : allowed.slice();
        let raw = this.phaseData.instruction_order;
        if (raw == null) raw = (this.isGng ? this.params.gngInstructionOrder : this.params.instructionOrder) || fallback;
        if (!Array.isArray(raw) || raw.length === 0) {
            this._fail("instruction_order must be a non-empty array.");
        }
        raw.forEach((key, i) => {
            if (!allowed.includes(key)) {
                this._fail(`instruction_order[${i}] must be ${allowed.map((k) => `"${k}"`).join(" | ")} (got "${key}").`);
            }
        });
        return raw.slice();
    }

    _persist(key, value) {
        let dataCont = this.expCont && this.expCont.dataCont;
        if (!dataCont || !dataCont.experimentData) return;
        if (!dataCont.experimentData.phaseRandomizations) dataCont.experimentData.phaseRandomizations = {};
        dataCont.experimentData.phaseRandomizations[key] = value;
        if (typeof dataCont.storeAllData === "function") dataCont.storeAllData(false);
    }

    _readPersisted(key) {
        let dataCont = this.expCont && this.expCont.dataCont;
        if (!dataCont || !dataCont.experimentData || !dataCont.experimentData.phaseRandomizations) return null;
        return dataCont.experimentData.phaseRandomizations[key] || null;
    }

    _copyForInstruction(instruction) {
        if (this.isGng) {
            let map = {
                cousin: {
                    prompt: "Only keep the box if it shows the cousin's hat.",
                    cover: "For the next hats, visualize the owner of the falling hat. Keep the box under the chute only if it shows the hat of this Fennimal's cousin. If it shows any other hat, slide the box out of the way."
                },
                neighbour: {
                    prompt: "Only keep the box if it shows the neighbor's hat.",
                    cover: "For the next hats, visualize the owner of the falling hat. Keep the box under the chute only if it shows the hat of this Fennimal's neighbor. If it shows any other hat, slide the box out of the way."
                }
            };
            return map[instruction];
        }
        let map = {
            most_similar: {
                prompt: "Place with a hat from the same group.",
                cover: "For the next hats, visualize the owner of the hat. Then place it with the hat of another Fennimal from the same group."
            },
            cousin: {
                prompt: "Place together with the cousin's hat.",
                cover: "For the next hats, visualize the owner of the hat. Then place the hat together with the hat owned by this Fennimal's cousin."
            },
            neighbour: {
                prompt: "Place together with the neighbor's hat.",
                cover: "For the next hats, visualize the owner of the hat. Then place the hat together with the hat owned by the neighbor of this Fennimal."
            }
        };
        return map[instruction];
    }

    _rotate(arr, k) {
        let n = arr.length;
        let s = ((k % n) + n) % n;
        return arr.slice(s).concat(arr.slice(0, s));
    }

    _assignSides(trials) {
        let order = shuffleArray(trials.slice());
        order.forEach((t, i) => {
            t.correct_side = (i % 2 === 0) ? "left" : "right";
        });
        trials.forEach((t) => {
            if (!t.correct_side) t.correct_side = Math.random() < 0.5 ? "left" : "right";
        });
        return trials;
    }

    _expandSpec(spec, instruction, repIndex, indexInBlock) {
        if (this.isGng) return this._expandGngSpec(spec, instruction, repIndex, indexInBlock);
        let droppedFen = this._trialFen(spec.dropped, "dropped");
        let correctFen = this._trialFen(spec.correct, "correct");
        let lureToken = spec.lure != null ? spec.lure : spec.incorrect;
        let incorrectFen = this._trialFen(lureToken, "lure");
        let copy = this._copyForInstruction(instruction);
        let sourceId = spec.id || spec.source_id;
        return {
            id: `r${repIndex}_${sourceId}`,
            source_id: sourceId,
            is_practice: false,
            tutorial: false,
            instruction,
            role: spec.role || null,
            contrast: spec.role || spec.contrast || null,
            triad: null,
            rep_index: repIndex,
            index_in_block: indexInBlock,
            dropped_role: spec.dropped,
            correct_role: spec.correct,
            incorrect_role: lureToken,
            lure_role: lureToken,
            dropped_id: droppedFen.id,
            correct_id: correctFen.id,
            incorrect_id: incorrectFen.id,
            droppedFen,
            correctFen,
            incorrectFen,
            prompt: copy.prompt,
            cover: copy.cover,
            correct_side: spec.correct_side
        };
    }

    _expandGngSpec(spec, instruction, repIndex, indexInBlock) {
        let droppedFen = this._trialFen(spec.dropped, "dropped");
        let boxFen = this._trialFen(spec.box, "box");
        let copy = this._copyForInstruction(instruction);
        let sourceId = spec.id || spec.source_id;
        let response = spec.response != null ? spec.response : spec.correct;
        return {
            id: `r${repIndex}_${sourceId}`,
            source_id: sourceId,
            is_practice: false,
            tutorial: false,
            instruction,
            role: spec.role || null,
            contrast: spec.role || spec.contrast || null,
            triad: null,
            rep_index: repIndex,
            index_in_block: indexInBlock,
            response,
            dropped_role: spec.dropped,
            box_role: spec.box,
            dropped_id: droppedFen.id,
            box_id: boxFen.id,
            droppedFen,
            boxFen,
            prompt: copy.prompt,
            cover: copy.cover
        };
    }

    _practiceTrials() {
        if (this.isGng) return this._gngPracticeTrials();
        const orange = "#e67e22";
        const blue = "#2980b9";
        let colorLeft = Math.random() < 0.5;
        let shapeLeft = Math.random() < 0.5;
        return [
            {
                id: "practice_color",
                is_practice: true,
                tutorial: true,
                instruction: "practice_color",
                contrast: "practice",
                triad: null,
                rep_index: null,
                prompt: "Put this shape in the box with the matching color",
                cover: null,
                correct_side: colorLeft ? "left" : "right",
                falling: { kind: "rect", color: orange },
                left: colorLeft
                    ? { kind: "triangle", color: orange, role: "correct" }
                    : { kind: "triangle", color: blue, role: "incorrect" },
                right: colorLeft
                    ? { kind: "triangle", color: blue, role: "incorrect" }
                    : { kind: "triangle", color: orange, role: "correct" }
            },
            {
                id: "practice_shape",
                is_practice: true,
                tutorial: false,
                instruction: "practice_shape",
                contrast: "practice",
                triad: null,
                rep_index: null,
                prompt: "Put this shape in the box with the matching shape",
                cover: null,
                correct_side: shapeLeft ? "left" : "right",
                falling: { kind: "triangle", color: blue },
                left: shapeLeft
                    ? { kind: "triangle", color: orange, role: "correct" }
                    : { kind: "rect", color: orange, role: "incorrect" },
                right: shapeLeft
                    ? { kind: "rect", color: orange, role: "incorrect" }
                    : { kind: "triangle", color: orange, role: "correct" }
            }
        ];
    }

    _gngPracticeTrials() {
        const orange = "#e67e22";
        return [
            {
                id: "practice_go_color",
                is_practice: true,
                tutorial: true,
                instruction: "practice_go",
                contrast: "practice",
                triad: null,
                rep_index: null,
                response: "go",
                prompt: "Only keep the box if the color matches.",
                cover: null,
                falling: { kind: "rect", color: orange },
                box: { kind: "triangle", color: orange }
            },
            {
                id: "practice_nogo_shape",
                is_practice: true,
                tutorial: false,
                instruction: "practice_nogo",
                contrast: "practice",
                triad: null,
                rep_index: null,
                response: "nogo",
                prompt: "Slide the box away if the shape does not match.",
                cover: null,
                falling: { kind: "triangle", color: orange },
                box: { kind: "rect", color: orange }
            }
        ];
    }

    _buildPlan() {
        const PLAN_SCHEMA = "hatdrop_trials_only_v1";
        let key = this.isGng ? "hat_drop_gonogo_plan" : "hat_drop_plan";
        let existing = this._readPersisted(key);
        let fingerprint = this._sourceFingerprint();
        let expectedBlocks = this.nReps * this.instructionOrder.length;
        if (
            existing &&
            existing.plan_schema === PLAN_SCHEMA &&
            existing.source_fingerprint === fingerprint &&
            existing.n_reps === this.nReps &&
            Array.isArray(existing.instruction_orders) &&
            existing.instruction_orders.length === this.nReps &&
            !existing.instruction_orders.some((row) => Array.isArray(row)) &&
            Array.isArray(existing.blocks) &&
            existing.blocks.length === expectedBlocks
        ) {
            return existing;
        }

        let orders = [];
        for (let r = 0; r < this.nReps; r++) {
            orders.push(r === 0 ? this.instructionOrder.slice() : this._rotate(this.instructionOrder, r));
        }

        let blocks = [];
        orders.forEach((order, r) => {
            order.forEach((instruction) => {
                let specs = (this.trialsByInstruction[instruction] || []).map((s) => Object.assign({}, s));
                if (!this.isGng) this._assignSides(specs);
                specs = shuffleArray(specs);
                let trials = specs.map((spec, i) => this._expandSpec(spec, instruction, r, i));
                blocks.push({
                    rep: r,
                    instruction,
                    trial_ids: trials.map((t) => t.id),
                    trials
                });
            });
        });

        let orderRows = orders.map((order, r) => ({ rep: r, order: order }));
        let plan = {
            plan_schema: PLAN_SCHEMA,
            source_fingerprint: fingerprint,
            n_reps: this.nReps,
            instruction_order: this.instructionOrder.slice(),
            instruction_orders: orderRows,
            blocks: blocks.map((b) => ({
                rep: b.rep,
                instruction: b.instruction,
                trial_ids: b.trial_ids,
                trials: b.trials.map((t) => this.isGng ? {
                    id: t.source_id,
                    dropped: t.dropped_role,
                    box: t.box_role,
                    response: t.response,
                    role: t.role
                } : {
                    id: t.source_id,
                    dropped: t.dropped_role,
                    correct: t.correct_role,
                    lure: t.lure_role,
                    role: t.role,
                    correct_side: t.correct_side
                })
            }))
        };
        this._persist(key, plan);
        this._liveBlocks = blocks;
        return plan;
    }

    _livePaidBlocks() {
        if (this._liveBlocks) return this._liveBlocks;
        this._liveBlocks = this.plan.blocks.map((b) => ({
            rep: b.rep,
            instruction: b.instruction,
            trials: (b.trials || []).map((spec, i) => this._expandSpec(this.isGng ? {
                id: spec.id,
                dropped: spec.dropped,
                box: spec.box,
                response: spec.response,
                role: spec.role
            } : {
                id: spec.id,
                dropped: spec.dropped,
                correct: spec.correct,
                lure: spec.lure != null ? spec.lure : spec.incorrect,
                role: spec.role,
                correct_side: spec.correct_side
            }, b.instruction, b.rep, i))
        }));
        return this._liveBlocks;
    }

    _geometry() {
        let p = this.params;
        let columnX = (p.columnX != null ? p.columnX : 0.5) * this.W;
        let slotGap = p.slotGap != null ? p.slotGap : 260;
        let boxW = p.boxW != null ? p.boxW : 300;
        let boxH = p.boxH != null ? p.boxH : 240;
        let boxY = (p.boxY != null ? p.boxY : 0.80) * this.H;
        return {
            columnX,
            slotGap,
            boxW,
            boxH,
            boxY,
            promptY: (p.promptY != null ? p.promptY : 0.035) * this.H,
            promptH: p.promptH != null ? p.promptH : 72,
            spigotY: (p.spigotY != null ? p.spigotY : 0.135) * this.H,
            lockY: p.lockY != null ? p.lockY * this.H : boxY - boxH / 2 - 8,
            landY: p.landY != null ? p.landY * this.H : boxY - 18,
            floorY: p.floorY != null ? p.floorY * this.H : boxY + boxH / 2 + 24,
            arrowY: (p.arrowY != null ? p.arrowY : 0.945) * this.H,
            boxHatScale: p.boxHatScale != null ? p.boxHatScale : 2.45,
            fallingHatScale: p.fallingHatScale != null ? p.fallingHatScale : 2.56,
            pipeHalfW: p.pipeHalfW != null ? p.pipeHalfW : 52,
            nozzleHalfW: p.nozzleHalfW != null ? p.nozzleHalfW : 155
        };
    }

    _easeInQuad(t) {
        return t * t;
    }

    _easeInCubic(t) {
        return t * t * t;
    }

    _fallYAtProgress(progress) {
        let p = Math.min(1, Math.max(0, progress));
        return this.hatStartY + this._easeInQuad(p) * (this.geo.lockY - this.hatStartY);
    }

    _sledGroupX() {
        if (this.isGng) return this.geo.columnX + this.sledPos * this.geo.slotGap;
        return this.geo.columnX - this.sledPos * this.geo.slotGap;
    }

    _boxUnderChute() {
        return this.isGng ? this.sledPos === 0 : this.sledPos !== 0;
    }

    async start_sequence() {
        try {
            this._ensureLayers();
            this.ParentLayer.style.display = "inherit";
            window.addEventListener("keydown", this._boundKeyDown);
            window.addEventListener("keyup", this._boundKeyUp);
            if (typeof Interface !== "undefined") {
                if (Interface.FenneFinder && Interface.FenneFinder.hide) Interface.FenneFinder.hide();
                if (Interface.Prompt) Interface.Prompt.hide();
                if (Interface.Locator && Interface.Locator.change_locator_name) {
                    if (Interface.player_moved_to_new_region) Interface.player_moved_to_new_region("Home");
                    Interface.Locator.change_locator_name("Warehouse");
                }
            }

            this._paintBackdrop();
            let paidBlocks = this._livePaidBlocks();
            let practice = this.phaseData.skip_practice === true ? [] : this._practiceTrials();
            let nPaid = paidBlocks.reduce((n, b) => n + b.trials.length, 0);
            let nAll = practice.length + nPaid;
            this.phaseData.number_interactions_in_phase = nAll;
            this.phaseData.Data = this.answers;

            this.phaseProgressTotal = Math.max(1, nAll);
            let done = 0;
            const bumpProgress = () => {
                this.phaseProgressDone = done;
                if (this.expCont && this.expCont.instrCont && this.expCont.instrCont.updateProgressWithinDay) {
                    this.expCont.instrCont.updateProgressWithinDay(nAll ? (done / nAll) * 100 : 0);
                }
            };

            for (let i = 0; i < practice.length; i++) {
                if (this.destroyed) return;
                bumpProgress();
                await this._runPracticeUntilCorrect(practice[i]);
                done += 1;
            }

            for (let b = 0; b < paidBlocks.length; b++) {
                if (this.destroyed) return;
                let block = paidBlocks[b];
                await this._showCoverStory(this._copyForInstruction(block.instruction).cover);
                if (this.destroyed) return;
                for (let t = 0; t < block.trials.length; t++) {
                    if (this.destroyed) return;
                    bumpProgress();
                    await this._runTrial(block.trials[t]);
                    done += 1;
                }
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
        let nPaid = this._nPaidTrials();
        let maxStars = Math.floor((this.maxPoints * nPaid) / perStar);
        this.phaseData.bonus_stars_earned = starsEarned;
        this.phaseData.session_points = this.sessionPoints;
        if (this.expCont && this.expCont.dataCont && this.expCont.dataCont.recordStarsEarned) {
            this.expCont.dataCont.recordStarsEarned(
                this.expCont.currentDayNum,
                this.phaseData.type || "hat_drop_task",
                starsEarned,
                maxStars
            );
        }
        if (typeof this.returnfunc === "function") this.returnfunc();
    }

    _ensureLayers() {
        if (this.layers) return;
        this.sceneRoot = create_SVG_group(0, 0, "hat_drop_root", "hat_drop_root");
        this.layers = {
            Neg1: create_SVG_group(0, 0, "hat_drop_neg1", "hat_drop_neg1"),
            Main: create_SVG_group(0, 0, "hat_drop_main", "hat_drop_main"),
            Plus1: create_SVG_group(0, 0, "hat_drop_plus1", "hat_drop_plus1"),
            Plus2: create_SVG_group(0, 0, "hat_drop_plus2", "hat_drop_plus2")
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

    _clearForeground() {
        this._stopFall();
        this._panelClose = null;
        this._clearLayer(this.layers && this.layers.Main);
        this._clearLayer(this.layers && this.layers.Plus1);
        this._clearLayer(this.layers && this.layers.Plus2);
        this.questionEl = null;
        this.pointsEl = null;
        this.pointsDiv = null;
        this.pointsRect = null;
        this.pointsStar = null;
        this.progressEl = null;
        this.spigotEl = null;
        this.spigotLight = null;
        this.sledGroup = null;
        this.leftBoxEl = null;
        this.rightBoxEl = null;
        this.arrowLeft = null;
        this.arrowRight = null;
        this.lockBtn = null;
        this.panelKey = null;
        this.fallingEl = null;
        this._hatVisible = false;
        this._panelSpaceDown = false;
        this.previewWindowEl = null;
        this.previewHatEl = null;
        this.boxMysteryEls = [];
        this.boxContentEls = [];
    }

    _paintBackdrop() {
        this._clearLayer(this.layers.Neg1);
        let p = this.params;
        let backdrop = create_SVG_rect(0, 0, this.W, this.H);
        backdrop.setAttribute("fill", "#d9c7a8");
        this.layers.Neg1.appendChild(backdrop);
        let src = p.indoorBackground || "./Locations/Home_machineroom.png";
        let photo = document.createElementNS("http://www.w3.org/2000/svg", "image");
        photo.setAttribute("href", src);
        photo.setAttribute("width", "100%");
        photo.setAttribute("height", "100%");
        photo.setAttribute("preserveAspectRatio", "none");
        this.layers.Neg1.appendChild(photo);
        let wash = create_SVG_rect(0, 0, this.W, this.H);
        wash.setAttribute("fill", "white");
        wash.style.opacity = String(p.indoorOverlayOpacity != null ? p.indoorOverlayOpacity : 0.5);
        wash.style.pointerEvents = "none";
        this.layers.Neg1.appendChild(wash);
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

    _placeQuestion(text) {
        let w = 820;
        let h = this.geo.promptH;
        let x = 0.5 * this.W - w / 2;
        let hud = this._placeHudBubble(x, this.geo.promptY, w, h, text, "hat_drop_question", 32);
        this.questionEl = hud.group;
        this.questionLabel = hud.label;
    }

    _placePointsHud(value) {
        let h = this.geo.promptH;
        let w = 176;
        let gap = 16;
        let qW = 820;
        let qX = 0.5 * this.W - qW / 2;
        let x = qX - gap - w;
        let y = this.geo.promptY;
        let g = create_SVG_group(0, 0, "hat_drop_points");
        g.style.pointerEvents = "none";

        let rect = create_SVG_rect(x, y, w, h);
        rect.setAttribute("rx", "28");
        rect.setAttribute("ry", "28");
        rect.setAttribute("stroke-width", "4");
        g.appendChild(rect);

        let star = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        star.setAttribute("points", this._starPoints(x + 36, y + h / 2, 16, 7));
        star.setAttribute("stroke-width", "2.5");
        star.setAttribute("stroke-linejoin", "round");
        g.appendChild(star);

        let label = create_SVG_text_elem(x + 112, y + h / 2, String(Math.round(value)), undefined, undefined);
        label.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
        label.style.fontSize = "36px";
        label.style.fontWeight = "800";
        label.style.textAnchor = "middle";
        label.style.dominantBaseline = "central";
        label.style.pointerEvents = "none";
        g.appendChild(label);

        this.layers.Plus2.appendChild(g);
        this.pointsEl = g;
        this.pointsRect = rect;
        this.pointsStar = star;
        this.pointsDiv = label;
        this._setPointsDisplay(value);
    }

    _placeProgressHud() {
        let h = this.geo.promptH;
        let w = 176;
        let gap = 16;
        let qW = 820;
        let qX = 0.5 * this.W - qW / 2;
        let x = qX + qW + gap;
        let y = this.geo.promptY;
        let pal = this._bubblePalette();
        let g = create_SVG_group(0, 0, "hat_drop_progress");
        g.style.pointerEvents = "none";

        let rect = create_SVG_rect(x, y, w, h);
        rect.setAttribute("rx", "28");
        rect.setAttribute("ry", "28");
        rect.setAttribute("fill", pal.fill);
        rect.setAttribute("fill-opacity", String(pal.fillOpacity));
        rect.setAttribute("stroke", pal.stroke);
        rect.setAttribute("stroke-width", "4");
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
        let x = cx + r * Math.cos(a);
        let y = cy + r * Math.sin(a);
        let large = t > 0.5 ? 1 : 0;
        return "M " + cx + " " + cy +
            " L " + cx + " " + (cy - r) +
            " A " + r + " " + r + " 0 " + large + " 1 " + x + " " + y +
            " Z";
    }

    _starPoints(cx, cy, outer, inner) {
        let pts = [];
        for (let i = 0; i < 10; i++) {
            let r = (i % 2 === 0) ? outer : inner;
            let a = -Math.PI / 2 + i * Math.PI / 5;
            pts.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1));
        }
        return pts.join(" ");
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

    _setPointsDisplay(value) {
        let n = Math.max(0, Math.round(value));
        if (this.pointsDiv) this.pointsDiv.textContent = String(n);
        let span = Math.max(1, this.maxPoints - this.minPoints);
        let t = (n - this.minPoints) / span;
        t = Math.min(1, Math.max(0, t));
        let fill = this._lerpHex("#d4cfc4", "#f3c84a", t);
        let stroke = this._lerpHex("#8a8680", "#b8860b", t);
        let star = this._lerpHex("#b8b3a8", "#ffe566", t);
        if (this.pointsRect) {
            this.pointsRect.setAttribute("fill", fill);
            this.pointsRect.setAttribute("stroke", stroke);
        }
        if (this.pointsStar) {
            this.pointsStar.setAttribute("fill", star);
            this.pointsStar.setAttribute("stroke", stroke);
        }
        if (this.pointsDiv) this.pointsDiv.style.fill = "#3b2f14";
    }

    _pointsAtProgress(progress) {
        let p = Math.min(1, Math.max(0, progress));
        return this.maxPoints + (this.minPoints - this.maxPoints) * p;
    }

    _placeSpigot() {
        let g = create_SVG_group(0, 0, "hat_drop_spigot");
        let x = this.geo.columnX;
        let spoutTop = this.geo.promptY + this.geo.promptH + 4;
        let pipeW = this.geo.pipeHalfW;
        let nozW = this.geo.nozzleHalfW;
        let spoutH = 52;

        let pipe = create_SVG_rect(x - pipeW, 0, pipeW * 2, spoutTop + 6);
        pipe.setAttribute("fill", "#6d6a66");
        pipe.setAttribute("stroke", "#3b3a38");
        pipe.setAttribute("stroke-width", "4");
        g.appendChild(pipe);

        let collar = create_SVG_rect(x - pipeW * 0.82, spoutTop - 12, pipeW * 1.64, 20);
        collar.setAttribute("rx", "5");
        collar.setAttribute("fill", "#6d6a66");
        collar.setAttribute("stroke", "#3b3a38");
        collar.setAttribute("stroke-width", "4");
        g.appendChild(collar);

        let nozzle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        nozzle.setAttribute(
            "points",
            `${x - nozW},${spoutTop} ${x + nozW},${spoutTop} ${x + nozW * 0.58},${spoutTop + spoutH} ${x - nozW * 0.58},${spoutTop + spoutH}`
        );
        nozzle.setAttribute("fill", "#8a8680");
        nozzle.setAttribute("stroke", "#3b3a38");
        nozzle.setAttribute("stroke-width", "4");
        g.appendChild(nozzle);

        let light = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        light.setAttribute("cx", String(x));
        light.setAttribute("cy", String(spoutTop + spoutH * 0.42));
        light.setAttribute("r", "20");
        light.setAttribute("fill", "#5a4a20");
        light.setAttribute("stroke", "#2c2414");
        light.setAttribute("stroke-width", "4");
        light.classList.add("hat_drop_spigot_light");
        g.appendChild(light);

        g.style.pointerEvents = "none";
        this.layers.Main.appendChild(g);
        this.spigotEl = g;
        this.spigotLight = light;
        this.hatStartY = spoutTop + spoutH + 14;
    }

    _previewWindowCenter() {
        let size = 124;
        return {
            x: this.geo.columnX - this.geo.pipeHalfW - 22 - size / 2,
            y: this.hatStartY - 6,
            size
        };
    }

    _placePreview(trial) {
        let loc = this._previewWindowCenter();
        let x = loc.x;
        let y = loc.y;
        let w = loc.size;
        let h = loc.size + 8;
        let frame = create_SVG_group(0, 0, "hat_drop_preview_window");
        frame.style.pointerEvents = "none";

        let shadow = create_SVG_rect(x - w / 2 + 4, y - h / 2 + 6, w, h);
        shadow.setAttribute("rx", "16");
        shadow.setAttribute("fill", "#2a2824");
        shadow.style.opacity = "0.35";
        frame.appendChild(shadow);

        let outer = create_SVG_rect(x - w / 2, y - h / 2, w, h);
        outer.setAttribute("rx", "16");
        outer.setAttribute("fill", "#6d6a66");
        outer.setAttribute("stroke", "#3b3a38");
        outer.setAttribute("stroke-width", "5");
        frame.appendChild(outer);

        let glass = create_SVG_rect(x - w / 2 + 12, y - h / 2 + 12, w - 24, h - 24);
        glass.setAttribute("rx", "10");
        glass.setAttribute("fill", "#d9e3ea");
        glass.setAttribute("fill-opacity", "0.72");
        glass.setAttribute("stroke", "#8a9aa6");
        glass.setAttribute("stroke-width", "3");
        frame.appendChild(glass);

        let sheen = create_SVG_rect(x - w / 2 + 18, y - h / 2 + 16, w * 0.28, h - 36);
        sheen.setAttribute("rx", "8");
        sheen.setAttribute("fill", "white");
        sheen.style.opacity = "0.28";
        sheen.style.pointerEvents = "none";
        frame.appendChild(sheen);

        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((d) => {
            let rivet = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            rivet.setAttribute("cx", String(x + d[0] * (w / 2 - 11)));
            rivet.setAttribute("cy", String(y + d[1] * (h / 2 - 11)));
            rivet.setAttribute("r", "3.5");
            rivet.setAttribute("fill", "#c4c0b8");
            rivet.setAttribute("stroke", "#3b3a38");
            rivet.setAttribute("stroke-width", "1.5");
            frame.appendChild(rivet);
        });

        this.layers.Plus1.appendChild(frame);
        this.previewWindowEl = frame;

        let mover = create_SVG_group(0, 0, "hat_drop_preview_hat");
        mover.style.pointerEvents = "none";
        this.layers.Plus1.appendChild(mover);
        this.previewHatEl = mover;
        this._previewOrigin = { x, y };
        this._setPreviewTransform(x, y, 1, 1);

        let previewScale = this.params.previewHatScale != null ? this.params.previewHatScale : 1.35;
        if (trial.is_practice) {
            this._drawShape(mover, trial.falling, 0, 0, 36);
        } else {
            this._placeHatOn(mover, trial.droppedFen, 0, 0, previewScale, "hat_drop_preview_hat");
        }
    }

    _setPreviewTransform(x, y, scale, opacity) {
        if (!this.previewHatEl) return;
        this.previewHatEl.setAttribute("transform", `translate(${x}, ${y}) scale(${scale})`);
        this.previewHatEl.style.opacity = String(opacity);
    }

    _revealBoxContents() {
        (this.boxMysteryEls || []).forEach((el) => {
            if (!el) return;
            el.style.transition = "opacity 140ms ease-out";
            el.style.opacity = "0";
        });
        (this.boxContentEls || []).forEach((el) => {
            if (!el) return;
            el.style.transition = "opacity 140ms ease-out";
            el.style.opacity = "1";
        });
    }

    _showFallingHat() {
        this._hatVisible = true;
        if (this.fallingEl) this.fallingEl.style.opacity = "1";
    }

    _hidePreviewHat() {
        if (this.previewHatEl) this.previewHatEl.style.opacity = "0";
    }

    _animatePreviewIntoSpigot() {
        return new Promise((resolve) => {
            if (!this.previewHatEl || !this._previewOrigin) {
                resolve();
                return;
            }
            let dur = Math.max(1, this.previewTravelMs);
            let x0 = this._previewOrigin.x;
            let y0 = this._previewOrigin.y;
            let x1 = this.geo.columnX;
            let y1 = this.hatStartY;
            let start = performance.now();
            const tick = (now) => {
                if (this.destroyed) {
                    resolve();
                    return;
                }
                let t = Math.min(1, (now - start) / dur);
                let e = t * t;
                this._setPreviewTransform(
                    x0 + (x1 - x0) * e,
                    y0 + (y1 - y0) * e,
                    1 - 0.55 * e,
                    1 - 0.15 * e
                );
                if (t >= 1) {
                    resolve();
                    return;
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }

    async _runPreview() {
        this.inputArmed = false;
        if (this.spigotLight) this.spigotLight.setAttribute("fill", "#c4a035");
        if (this.previewMs > 0) await wait(this.previewMs);
        if (this.destroyed) return;
        if (this.spigotLight) this.spigotLight.setAttribute("fill", "#ffe566");
        if (this.previewTravelMs > 0) await this._animatePreviewIntoSpigot();
        if (this.destroyed) return;
        this._hidePreviewHat();
        this._revealBoxContents();
        this._showFallingHat();
        if (this.spigotLight) this.spigotLight.setAttribute("fill", "#5a4a20");
    }

    _placeMysteryMark(parent, x, y) {
        let g = create_SVG_group(0, 0, "hat_drop_mystery");
        g.style.pointerEvents = "none";
        let disk = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        disk.setAttribute("cx", String(x));
        disk.setAttribute("cy", String(y));
        disk.setAttribute("r", "46");
        disk.setAttribute("fill", "#f3eee4");
        disk.setAttribute("stroke", "#4a3f32");
        disk.setAttribute("stroke-width", "5");
        g.appendChild(disk);
        let q = create_SVG_text_elem(x, y + 18, "?");
        q.setAttribute("text-anchor", "middle");
        q.setAttribute("font-size", "56");
        q.setAttribute("font-weight", "800");
        q.setAttribute("fill", "#2c3e6b");
        q.style.pointerEvents = "none";
        g.appendChild(q);
        parent.appendChild(g);
        return g;
    }

    _fillCrate(parent, x, y, trial, slot) {
        let mystery = this._placeMysteryMark(parent, x, y);
        this.boxMysteryEls.push(mystery);
        let content = create_SVG_group(0, 0, "hat_drop_box_content");
        content.style.opacity = "0";
        content.style.pointerEvents = "none";
        parent.appendChild(content);
        if (trial.is_practice) {
            let spec = slot === "left" ? trial.left : (slot === "right" ? trial.right : trial.box);
            this._drawShape(content, spec, x, y, 48);
        } else if (slot === "single") {
            this._placeHatOn(content, trial.boxFen, x, y, this.geo.boxHatScale, "hat_drop_box_hat");
        } else {
            let fen = (slot === "left")
                ? (trial.correct_side === "left" ? trial.correctFen : trial.incorrectFen)
                : (trial.correct_side === "right" ? trial.correctFen : trial.incorrectFen);
            let id = slot === "left" ? "hat_drop_box_left_hat" : "hat_drop_box_right_hat";
            this._placeHatOn(content, fen, x, y, this.geo.boxHatScale, id);
        }
        this.boxContentEls.push(content);
    }

    _drawCrate(parent, x, y, w, h) {
        let body = create_SVG_rect(x - w / 2, y - h / 2, w, h);
        body.setAttribute("rx", "14");
        body.setAttribute("fill", "#c4a574");
        body.setAttribute("stroke", "#5c4a2a");
        body.setAttribute("stroke-width", "6");
        parent.appendChild(body);
        let well = create_SVG_rect(x - w / 2 + 14, y - h / 2 + 16, w - 28, h - 36);
        well.setAttribute("rx", "8");
        well.setAttribute("fill", "#a88858");
        well.setAttribute("stroke", "#5c4a2a");
        well.setAttribute("stroke-width", "3");
        parent.appendChild(well);
        return { body, well };
    }

    _drawShape(parent, spec, x, y, size) {
        size = size || 56;
        let el;
        if (spec.kind === "triangle") {
            el = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            el.setAttribute("points", `${x},${y - size} ${x + size},${y + size * 0.7} ${x - size},${y + size * 0.7}`);
        } else {
            el = create_SVG_rect(x - size, y - size, size * 2, size * 2);
            el.setAttribute("rx", "8");
        }
        el.setAttribute("fill", spec.color);
        el.setAttribute("stroke", "#2c2414");
        el.setAttribute("stroke-width", "5");
        el.style.pointerEvents = "none";
        parent.appendChild(el);
        return el;
    }

    _placeHatOn(parent, fen, x, y, scale, id) {
        let template = document.getElementById("hat_" + fen.hat);
        if (!template) this._fail(`missing SVG hat_${fen.hat} for Fennimal "${fen.id}".`);
        let clone = template.cloneNode(true);
        if (typeof strip_svg_ids_from_subtree === "function") strip_svg_ids_from_subtree(clone);
        clone.style.display = "inherit";
        clone.setAttribute("display", "inline");
        clone.style.pointerEvents = "none";

        let zero = create_SVG_group(0, 0, "zero_translate_group");
        let scaleG = create_SVG_group(0, 0, "scale_group");
        let pos = create_SVG_group(0, 0, "hat_drop_hat");
        if (id) pos.setAttribute("id", id);
        pos.style.pointerEvents = "none";
        zero.appendChild(clone);
        scaleG.appendChild(zero);
        pos.appendChild(scaleG);
        parent.appendChild(pos);

        let b = clone.getBBox();
        zero.setAttribute("transform", `translate(${-(b.x + b.width / 2)}, ${-(b.y + b.height / 2)})`);
        scaleG.setAttribute("transform", `scale(${scale || 2.45})`);
        pos.setAttribute("transform", `translate(${x}, ${y})`);
        return pos;
    }

    _placeSled(trial) {
        this.boxMysteryEls = [];
        this.boxContentEls = [];
        if (this.isGng) {
            this._placeGngSled(trial);
            return;
        }
        let g = create_SVG_group(0, 0, "hat_drop_sled", "hat_drop_sled");
        g.style.transition = "transform 160ms ease-out";
        let d = this.geo.slotGap;
        let hw = this.geo.boxW / 2;
        let plank = create_SVG_rect(-d - hw - 24, this.geo.boxH / 2 - 8, d * 2 + this.geo.boxW + 48, 32);
        plank.setAttribute("rx", "10");
        plank.setAttribute("fill", "#8d6e4c");
        plank.setAttribute("stroke", "#4a3724");
        plank.setAttribute("stroke-width", "4");
        g.appendChild(plank);
        [-d - hw + 8, d + hw - 8].forEach((x) => {
            let runner = create_SVG_rect(x - 12, this.geo.boxH / 2 + 20, 24, 18);
            runner.setAttribute("rx", "4");
            runner.setAttribute("fill", "#5c4a2a");
            g.appendChild(runner);
        });

        this._drawCrate(g, -d, 0, this.geo.boxW, this.geo.boxH);
        this._drawCrate(g, d, 0, this.geo.boxW, this.geo.boxH);

        this.layers.Main.appendChild(g);
        this.sledGroup = g;

        let contentY = 0;
        this._fillCrate(g, -d, contentY, trial, "left");
        this._fillCrate(g, d, contentY, trial, "right");
        this.leftBoxEl = g;
        this.rightBoxEl = g;
        this.sledPos = 0;
        this._applySledPos(true);
    }

    _placeGngSled(trial) {
        let g = create_SVG_group(0, 0, "hat_drop_sled", "hat_drop_sled");
        g.style.transition = "transform 160ms ease-out";
        let hw = this.geo.boxW / 2;
        let plank = create_SVG_rect(-hw - 24, this.geo.boxH / 2 - 8, this.geo.boxW + 48, 32);
        plank.setAttribute("rx", "10");
        plank.setAttribute("fill", "#8d6e4c");
        plank.setAttribute("stroke", "#4a3724");
        plank.setAttribute("stroke-width", "4");
        g.appendChild(plank);
        [-hw + 8, hw - 8].forEach((x) => {
            let runner = create_SVG_rect(x - 12, this.geo.boxH / 2 + 20, 24, 18);
            runner.setAttribute("rx", "4");
            runner.setAttribute("fill", "#5c4a2a");
            g.appendChild(runner);
        });
        this._drawCrate(g, 0, 0, this.geo.boxW, this.geo.boxH);
        this.layers.Main.appendChild(g);
        this.sledGroup = g;
        this._fillCrate(g, 0, 0, trial, "single");
        this.leftBoxEl = g;
        this.rightBoxEl = g;
        this.sledPos = 0;
        this._applySledPos(true);
    }

    _applySledPos(instant) {
        if (!this.sledGroup) return;
        if (instant) this.sledGroup.style.transition = "none";
        this.sledGroup.style.transform = `translate(${this._sledGroupX()}px, ${this.geo.boxY}px)`;
        if (instant) {
            void this.sledGroup.getBoundingClientRect();
            this.sledGroup.style.transition = "transform 160ms ease-out";
        }
    }

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
        g._keyFace = face;
        g._keyFaceRestY = y - h / 2 - 2;
        g._keyPressDy = 7;
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
        if (g._keyGlyph) {
            if (g._keyGlyph.tagName === "text") {
                g._keyGlyph.setAttribute("y", g._keyGlyphRestY + dy);
            } else {
                g._keyGlyph.setAttribute("transform", dy ? `translate(0, ${dy})` : "");
            }
        }
    }

    _bindKeyCap(g, handlers) {
        handlers = handlers || {};
        g.addEventListener("pointerdown", (evt) => {
            if (evt.button != null && evt.button !== 0) return;
            evt.stopPropagation();
            evt.preventDefault();
            try { g.setPointerCapture(evt.pointerId); } catch (e) {}
            this._setKeyPressed(g, true);
            if (typeof handlers.onPress === "function") handlers.onPress();
        });
        g.addEventListener("pointerup", (evt) => {
            evt.stopPropagation();
            this._setKeyPressed(g, false);
            if (typeof handlers.onRelease === "function") handlers.onRelease();
        });
        g.addEventListener("pointercancel", () => {
            this._setKeyPressed(g, false);
        });
    }

    _placeTextKey(x, y, w, h, label, handlers) {
        let g = create_SVG_group(0, 0, "hat_drop_key");
        this._drawKeyCap(g, x, y, w, h);
        let text = create_SVG_text_elem(x, y - 2, label, undefined, undefined);
        text.classList.add("hat_drop_key_glyph");
        text.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
        text.style.fontSize = "26px";
        text.style.fontWeight = "700";
        text.setAttribute("fill", "#1e3a5f");
        text.style.textAnchor = "middle";
        text.style.dominantBaseline = "central";
        text.style.pointerEvents = "none";
        g.appendChild(text);
        g._keyGlyph = text;
        g._keyGlyphRestY = y - 2;
        let keyboardOnly = handlers && handlers.keyboardOnly;
        if (keyboardOnly) {
            g.style.cursor = "default";
            g.style.pointerEvents = "none";
        } else {
            g.style.cursor = "pointer";
            g.style.pointerEvents = "all";
            this._bindKeyCap(g, handlers);
        }
        return g;
    }

    _placeControls() {
        let y = this.geo.arrowY;
        let spaceW = 420;
        let arrowW = 108;
        let gap = 18;
        let cx = this.W / 2;
        let arrowX = spaceW / 2 + gap + arrowW / 2;
        this.arrowLeft = this._placeArrowButton(-1, cx - arrowX, y);
        this.arrowRight = this._placeArrowButton(1, cx + arrowX, y);
        let btn = this._placeTextKey(cx, y, spaceW, 72, "Space: lock in", {
            onPress: () => this._tryLock("space")
        });
        this.layers.Plus2.appendChild(btn);
        this.lockBtn = btn;
    }

    _placeArrowButton(dir, x, y) {
        let g = create_SVG_group(0, 0, "hat_drop_key");
        this._drawKeyCap(g, x, y, 108, 72);
        let poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        if (dir < 0) poly.setAttribute("points", `${x + 22},${y - 20} ${x - 26},${y} ${x + 22},${y + 20}`);
        else poly.setAttribute("points", `${x - 22},${y - 20} ${x + 26},${y} ${x - 22},${y + 20}`);
        poly.setAttribute("fill", "#1e3a5f");
        poly.classList.add("hat_drop_key_glyph");
        poly.style.pointerEvents = "none";
        g.appendChild(poly);
        g._keyGlyph = poly;
        g.style.cursor = "pointer";
        g.style.pointerEvents = "all";
        this._bindKeyCap(g, { onPress: () => this._nudge(dir) });
        this.layers.Plus2.appendChild(g);
        return g;
    }

    _placeFalling(trial) {
        let g = create_SVG_group(0, 0, "hat_drop_falling", "hat_drop_falling");
        g.style.pointerEvents = "none";
        g.style.opacity = "0";
        this.layers.Main.appendChild(g);
        this.fallingEl = g;
        this._hatVisible = false;
        if (trial.is_practice) {
            this._drawShape(g, trial.falling, 0, 0, 70);
        } else {
            this._placeHatOn(g, trial.droppedFen, 0, 0, this.geo.fallingHatScale, "hat_drop_falling_hat");
        }
        this.hatY = this.hatStartY;
        this._setFallingY(this.hatStartY);
    }

    _setFallingY(y) {
        this.hatY = y;
        if (this.fallingEl) {
            this.fallingEl.style.transform = `translate(${this.geo.columnX}px, ${y}px)`;
        }
        this._updateFallingFade();
    }

    _updateFallingFade() {
        if (!this.fallingEl || !this._hatVisible) return;
        if (!this._boxUnderChute()) {
            this.fallingEl.style.opacity = "1";
            return;
        }
        let boxTop = this.geo.boxY - this.geo.boxH / 2;
        let landY = this.geo.landY;
        if (this.hatY <= boxTop) {
            this.fallingEl.style.opacity = "1";
            return;
        }
        let t = (this.hatY - boxTop) / Math.max(1, landY - boxTop);
        this.fallingEl.style.opacity = String(1 - Math.min(1, Math.max(0, t)));
    }

    _nudge(dir) {
        if (!this.inputArmed || this.sledLocked) return;
        let next;
        if (this.isGng) {
            next = this.sledPos + (dir < 0 ? -1 : 1);
            next = Math.max(-1, Math.min(1, next));
        } else {
            // dir is sled movement: left key slides the sled left,
            // which parks the right-hand box under the chute.
            next = dir < 0 ? 1 : -1;
        }
        if (this.sledPos === next) return;
        let now = performance.now();
        if (this.firstMoveAt == null) this.firstMoveAt = now;
        this.lastMoveAt = now;
        this.sledPos = next;
        this.positionHistory.push({
            t_ms: Math.round(now - (this._fallStart || now)),
            pos: this._slotName(next)
        });
        this._applySledPos(false);
        this._updateFallingFade();
        if (typeof AudioCont !== "undefined" && AudioCont.play_sound_effect) {
            AudioCont.play_sound_effect("button_click");
        }
    }

    _slotName(pos) {
        if (pos < 0) return "left";
        if (pos > 0) return "right";
        return "middle";
    }

    _onKeyDown(evt) {
        if (this.destroyed) return;
        if (evt.repeat) return;
        let key = evt.key;
        let isSpace = key === " " || key === "Spacebar";
        if (isSpace) evt.preventDefault();

        if (this._panelClose) {
            if (isSpace) {
                this._panelSpaceDown = true;
                this._setKeyPressed(this.panelKey, true);
            }
            return;
        }
        if (!this.inputArmed || this.sledLocked) return;
        if (key === "ArrowLeft" || key === "a" || key === "A") {
            evt.preventDefault();
            this._setKeyPressed(this.arrowLeft, true);
            this._nudge(-1);
        } else if (key === "ArrowRight" || key === "d" || key === "D") {
            evt.preventDefault();
            this._setKeyPressed(this.arrowRight, true);
            this._nudge(1);
        } else if (isSpace) {
            this._setKeyPressed(this.lockBtn, true);
            this._tryLock("space");
        }
    }

    _onKeyUp(evt) {
        if (this.destroyed) return;
        let key = evt.key;
        let isSpace = key === " " || key === "Spacebar";
        if (isSpace) evt.preventDefault();

        if (key === "ArrowLeft" || key === "a" || key === "A") this._setKeyPressed(this.arrowLeft, false);
        else if (key === "ArrowRight" || key === "d" || key === "D") this._setKeyPressed(this.arrowRight, false);

        if (!isSpace) return;
        this._setKeyPressed(this.lockBtn, false);
        this._setKeyPressed(this.panelKey, false);
        if (this._panelClose && this._panelSpaceDown) {
            this._panelSpaceDown = false;
            this._panelClose();
            return;
        }
        this._panelSpaceDown = false;
    }

    _tryLock(reason) {
        if (!this.inputArmed || this.sledLocked) return;
        this._lockSled(reason, performance.now());
    }

    _fallTime() {
        let scale = 1;
        if (this.currentTrial && this.currentTrial.is_practice) {
            scale = this.params.practiceFallScale != null ? this.params.practiceFallScale : 1.5;
        }
        return this.totalFallTime * scale;
    }

    _stopFall() {
        if (this.fallRaf) {
            cancelAnimationFrame(this.fallRaf);
            this.fallRaf = null;
        }
    }

    _lockSled(reason, now) {
        if (this.sledLocked) return;
        this.sledLocked = true;
        this.inputArmed = false;
        this.lockReason = reason;
        this._stopFall();
        let elapsed = now - (this._fallStart || now);
        let progress = Math.min(1, Math.max(0, elapsed / this._fallTime()));
        this.lockProgress = progress;
        this.lockPoints = Math.round(this._pointsAtProgress(progress));
        this.lockTimeMs = Math.round(elapsed);
        this._setPointsDisplay(this.lockPoints);
        this._setFallingY(this._fallYAtProgress(progress));
        if (typeof AudioCont !== "undefined" && AudioCont.play_sound_effect) {
            AudioCont.play_sound_effect("button_click");
        }
        this._slamHat().then(() => {
            if (this._fallResolve) {
                let done = this._fallResolve;
                this._fallResolve = null;
                done();
            }
        });
    }

    _slamHat() {
        return new Promise((resolve) => {
            if (!this.fallingEl) {
                resolve();
                return;
            }
            let startY = this.hatY;
            let endY = this._boxUnderChute() ? this.geo.landY : this.geo.floorY;
            let dur = this.lockReason === "timeout" ? Math.min(this.lockDropMs, 180) : this.lockDropMs;
            let start = performance.now();
            const tick = (now) => {
                if (this.destroyed) return;
                let t = Math.min(1, (now - start) / Math.max(1, dur));
                this._setFallingY(startY + (endY - startY) * this._easeInCubic(t));
                if (t >= 1) {
                    resolve();
                    return;
                }
                this.fallRaf = requestAnimationFrame(tick);
            };
            this.fallRaf = requestAnimationFrame(tick);
        });
    }

    _runFall() {
        return new Promise((resolve) => {
            this._fallResolve = resolve;
            this.inputArmed = true;
            this.sledLocked = false;
            this._hatVisible = true;
            if (this.fallingEl) this.fallingEl.style.opacity = "1";
            let start = performance.now();
            this._fallStart = start;
            const tick = (now) => {
                if (this.destroyed || this.sledLocked) return;
                let elapsed = now - start;
                let progress = Math.min(1, elapsed / this._fallTime());
                this._setFallingY(this._fallYAtProgress(progress));
                this._setPointsDisplay(this._pointsAtProgress(progress));
                if (progress >= 1) {
                    this._lockSled("timeout", now);
                    return;
                }
                this.fallRaf = requestAnimationFrame(tick);
            };
            this.fallRaf = requestAnimationFrame(tick);
        });
    }

    async _runWarning() {
        if (!this.spigotLight) return;
        let flashes = 3;
        let onMs = this.warningMs / (flashes * 2);
        for (let i = 0; i < flashes; i++) {
            if (this.destroyed) return;
            this.spigotLight.setAttribute("fill", "#ffe566");
            await wait(onMs);
            this.spigotLight.setAttribute("fill", "#5a4a20");
            await wait(onMs);
        }
    }

    async _showBubble(target, text, extra) {
        if (!Interface || !Interface.PartnerSpeechBubble) return;
        if (!target) return;
        await Interface.PartnerSpeechBubble.show(Object.assign({
            target,
            text,
            context: "map",
            dimOpacity: this.params.tutorialDimOpacity != null ? this.params.tutorialDimOpacity : 0.1,
            buttonLabel: "Continue"
        }, extra || {}));
    }

    async _runPracticeTutorial() {
        this.inputArmed = false;
        if (this.isGng) {
            await this._showBubble(
                this.spigotEl,
                "Shapes first appear in the little window beside the chute. Watch that one, then it is pulled into the chute and the boxes open."
            );
            await this._showBubble(
                this.sledGroup,
                "One box starts under the chute, covered with a ? until the object is pulled in. Then keep it there if it matches the rule. If not, slide the box out of the way with the arrow keys. You can move it back.",
                { preferredSide: "up" }
            );
            await this._showBubble(
                this.lockBtn,
                "If the box should stay, you may wait or press space. If you slide the box away, press space to lock in. The sooner you press space, the more points you keep.",
                { preferredSide: "up", tipGap: 200 }
            );
            await this._showBubble(
                this.pointsEl,
                "You start with 100 points. They count down as the object falls. Faster correct answers leave more points, which become bonus stars at the end. You will not be told whether you were right until the end of the experiment."
            );
            return;
        }
        await this._showBubble(
            this.spigotEl,
            "This line tells you what to do with the falling object. For these practice rounds, match the color or the shape."
        );
        await this._showBubble(
            this.spigotEl,
            "Shapes first appear in the little window beside the chute. Watch that one, then it is pulled into the chute and the boxes open."
        );
        await this._showBubble(
            this.sledGroup,
            "The boxes stay covered with a ? until the object is pulled into the chute. Then you can move them so the object falls in the correct box. Use the arrow keys to move the sled.",
            { preferredSide: "up" }
        );
        await this._showBubble(
            this.lockBtn,
            "You can still move the boxes until the object reaches them. Once you are sure, press space to lock in. The sooner you press space, the more points you keep.",
            { preferredSide: "up", tipGap: 200 }
        );
        await this._showBubble(
            this.pointsEl,
            "You start with 100 points. They count down as the object falls. Faster correct answers leave more points, which become bonus stars at the end. You will not be told whether you were right until the end of the experiment."
        );
    }

    _showPanel(html) {
        return new Promise((resolve) => {
            let group = create_SVG_group(0, 0, "hat_drop_panel", "hat_drop_panel");
            this.layers.Plus2.appendChild(group);
            let catcher = create_SVG_rect(0, 0, this.W, this.H);
            catcher.setAttribute("fill", "#111");
            catcher.style.opacity = "0.28";
            catcher.style.pointerEvents = "all";
            group.appendChild(catcher);

            let panelW = 0.72 * this.W;
            let panelX = (this.W - panelW) / 2;
            let panel = create_SVG_rect(panelX, 0, panelW, 200);
            panel.setAttribute("rx", 28);
            panel.setAttribute("fill", "rgba(250, 246, 236, 0.96)");
            panel.setAttribute("stroke", "rgba(184, 159, 93, 0.9)");
            panel.setAttribute("stroke-width", "6");
            group.appendChild(panel);

            let wrap = create_SVG_foreignElement(panelX + 40, 0, panelW - 80, 800);
            let div = document.createElement("div");
            div.style.width = "100%";
            div.style.display = "flex";
            div.style.alignItems = "center";
            div.style.justifyContent = "center";
            div.style.textAlign = "center";
            div.style.fontSize = "34px";
            div.style.lineHeight = "140%";
            div.style.color = "#3b2f14";
            div.style.fontFamily = "Arial, sans-serif";
            div.innerHTML = html;
            wrap.appendChild(div);
            group.appendChild(wrap);

            let btnHolder = create_SVG_group(0, 0);
            const close = () => {
                if (!this._panelClose) return;
                this._panelClose = null;
                this._panelSpaceDown = false;
                this._setKeyPressed(this.panelKey, false);
                this.panelKey = null;
                if (typeof AudioCont !== "undefined") AudioCont.play_sound_effect("button_click");
                if (group.parentNode) group.remove();
                resolve();
            };
            let btn = this._placeTextKey(this.W / 2, 0, 420, 72, "Space: continue", {
                keyboardOnly: true
            });
            this.panelKey = btn;
            btnHolder.appendChild(btn);
            group.appendChild(btnHolder);

            const layout = () => {
                let padTop = 36;
                let padBot = 28;
                let gap = 24;
                let btnH = 72;
                wrap.setAttribute("width", panelW - 80);
                wrap.setAttribute("height", 900);
                void div.offsetHeight;
                let textH = Math.max(div.scrollHeight, 48);
                let panelH = Math.min(padTop + textH + gap + btnH + padBot, 0.9 * this.H);
                let panelY = Math.max(0.08 * this.H, (this.H - panelH) / 2);
                panel.setAttribute("x", panelX);
                panel.setAttribute("y", panelY);
                panel.setAttribute("width", panelW);
                panel.setAttribute("height", panelH);
                wrap.setAttribute("x", panelX + 40);
                wrap.setAttribute("y", panelY + padTop);
                wrap.setAttribute("height", textH);
                btnHolder.style.transform = "translate(0px, " + (panelY + panelH - padBot - btnH / 2) + "px)";
            };
            layout();
            requestAnimationFrame(layout);
            this._panelClose = close;
        });
    }

    _showCoverStory(text) {
        return this._showPanel(`<div>${text}</div>`);
    }

    _showReminder(trial) {
        return this._showPanel(`<div>${trial.prompt}</div>`);
    }

    _buildScene(trial) {
        this._clearForeground();
        this._placeSpigot();
        this._placePreview(trial);
        this._placeFalling(trial);
        this._placeSled(trial);
        this._placeQuestion(trial.prompt);
        this._placePointsHud(this.maxPoints);
        this._placeProgressHud();
        this._placeControls();
        this.firstMoveAt = null;
        this.lastMoveAt = null;
        this.positionHistory = [{ t_ms: 0, pos: "middle" }];
        this.sledPos = 0;
        this.sledLocked = false;
        this.inputArmed = false;
        this.lockReason = null;
        this.lockPoints = this.maxPoints;
        this.lockProgress = 0;
        this.lockTimeMs = null;
    }

    _choiceOf(trial) {
        if (this.isGng) {
            let slot = this._slotName(this.sledPos);
            let under = this._boxUnderChute();
            let isGo = trial.response === "go";
            let correct = isGo ? under : !under;
            let chosen = trial.is_practice
                ? (trial.box ? trial.box.kind + "_" + trial.box.color : null)
                : (trial.boxFen ? trial.boxFen.id : null);
            return {
                slot,
                chosen_id: under ? chosen : null,
                chosen_role: under ? (trial.box_role || (isGo ? "go" : "nogo")) : null,
                correct,
                box_under_chute: under,
                moved: this.sledPos !== 0
            };
        }
        let slot = this._slotName(this.sledPos);
        if (slot === "middle") return { slot, chosen_id: null, chosen_role: null, correct: false };
        let choseLeft = slot === "left";
        if (trial.is_practice) {
            let spec = choseLeft ? trial.left : trial.right;
            return {
                slot,
                chosen_id: spec.kind + "_" + spec.color,
                chosen_role: spec.role,
                correct: spec.role === "correct"
            };
        }
        let chosenFen = (slot === trial.correct_side) ? trial.correctFen : trial.incorrectFen;
        let chosenRole = (slot === trial.correct_side) ? trial.correct_role : trial.incorrect_role;
        return {
            slot,
            chosen_id: chosenFen.id,
            chosen_role: chosenRole,
            correct: slot === trial.correct_side
        };
    }

    _logTrial(trial, choice) {
        let awarded = 0;
        if (!trial.is_practice) {
            awarded = choice.correct ? this.lockPoints : 0;
            this.sessionPoints += awarded;
        }
        let isCorrect = !!choice.correct;
        let selectedAction = this.isGng
            ? ((choice.box_under_chute != null ? choice.box_under_chute : this._boxUnderChute()) ? "go" : "nogo")
            : null;
        let row = {
            trial_id: trial.id,
            is_practice: !!trial.is_practice,
            practice_attempt: trial.is_practice ? (trial.practice_attempt || 1) : null,
            task: this.isGng ? "gonogo" : "2afc",
            instruction: trial.instruction,
            role: trial.role || null,
            contrast: trial.contrast,
            triad: trial.triad,
            rep_index: trial.rep_index,
            dropped_role: trial.dropped_role || null,
            correct_role: trial.correct_role || null,
            incorrect_role: trial.incorrect_role || null,
            lure_role: trial.lure_role || trial.incorrect_role || null,
            dropped_id: trial.dropped_id || null,
            box_id: trial.box_id || null,
            box_role: trial.box_role || null,
            response: trial.response || null,
            required_response: this.isGng ? (trial.response || null) : null,
            selected_action: selectedAction,
            correct_id: trial.correct_id || null,
            incorrect_id: trial.incorrect_id || null,
            correct_side: trial.correct_side || null,
            selected_side: choice.slot,
            selected_id: choice.chosen_id,
            selected_role: choice.chosen_role,
            box_under_chute: this.isGng
                ? (choice.box_under_chute != null ? choice.box_under_chute : this._boxUnderChute())
                : null,
            moved: choice.moved != null ? choice.moved : (this.sledPos !== 0),
            chose_target: trial.correct_side ? choice.slot === trial.correct_side : null,
            chose_lure: trial.correct_side ? (choice.slot !== "middle" && choice.slot !== trial.correct_side) : null,
            timeout: this.lockReason === "timeout",
            timeout_no_choice: !this.isGng && choice.slot === "middle",
            correct: isCorrect,
            is_correct: isCorrect,
            outcome: isCorrect ? "correct" : "incorrect",
            lock_reason: this.lockReason,
            reaction_time_ms: this.lockTimeMs,
            time_to_first_move_ms: this.firstMoveAt != null ? Math.round(this.firstMoveAt - this._fallStart) : null,
            time_to_last_move_ms: this.lastMoveAt != null ? Math.round(this.lastMoveAt - this._fallStart) : null,
            position_history: (this.positionHistory || []).slice(),
            points_at_lock: this.lockPoints,
            points_awarded: awarded,
            session_points_after: this.sessionPoints,
            fall_progress_at_lock: Math.round(this.lockProgress * 1000) / 1000,
            total_fall_time: this._fallTime(),
            preview_ms: this.previewMs,
            preview_travel_ms: this.previewTravelMs,
            min_points: this.minPoints,
            max_points: this.maxPoints
        };
        this.answers.push(row);
    }

    _flipPracticeSides(trial) {
        let tmp = trial.left;
        trial.left = trial.right;
        trial.right = tmp;
        trial.correct_side = trial.correct_side === "left" ? "right" : "left";
    }

    async _runPracticeUntilCorrect(trial) {
        let showTutorial = !!trial.tutorial;
        let attempt = 0;
        while (!this.destroyed) {
            attempt += 1;
            trial.tutorial = showTutorial && attempt === 1;
            trial.practice_attempt = attempt;
            await this._runTrial(trial);
            if (this.destroyed) return;
            let last = this.answers[this.answers.length - 1];
            if (this.isGng) {
                let needSpace = trial.response === "nogo";
                let lockedIn = last && last.lock_reason !== "timeout";
                if (last && last.correct && (!needSpace || lockedIn)) return;
                if (needSpace && last && last.correct && last.lock_reason === "timeout") {
                    await this._showPanel("<div>Press space to lock in your choice before the object lands.</div>");
                    if (this.destroyed) return;
                }
                continue;
            }
            let lockedIn = last && last.lock_reason !== "timeout";
            if (last && last.correct && lockedIn) return;
            if (last && last.lock_reason === "timeout") {
                await this._showPanel("<div>Press space to lock in your choice before the object lands.</div>");
                if (this.destroyed) return;
            }
            if (!(last && last.correct && last.lock_reason === "timeout")) {
                this._flipPracticeSides(trial);
            }
        }
    }

    async _runTrial(trial) {
        this.currentTrial = trial;
        this._buildScene(trial);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (trial.tutorial) {
            await this._runPracticeTutorial();
            if (this.destroyed) return;
        }
        await this._runPreview();
        if (this.destroyed) return;
        await this._runFall();
        if (this.destroyed) return;
        let choice = this._choiceOf(trial);
        this._logTrial(trial, choice);
        await wait(this.holdMs);
        this._clearForeground();
    }

    clean_up() {
        this.destroyed = true;
        this.inputArmed = false;
        this._stopFall();
        window.removeEventListener("keydown", this._boundKeyDown);
        window.removeEventListener("keyup", this._boundKeyUp);
        if (this.sceneRoot && this.sceneRoot.parentNode) this.sceneRoot.parentNode.removeChild(this.sceneRoot);
        this.sceneRoot = null;
        this.layers = null;
    }
}
