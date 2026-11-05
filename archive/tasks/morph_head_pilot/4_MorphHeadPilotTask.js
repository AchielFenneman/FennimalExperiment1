/**
 * Stimulus-pilot morph (morph_head_pilot).
 *
 * Not the live semantic_learning_star DV. Participants see one polaroid with a
 * jumble and pick which parent head they see more clearly (F/J, head images).
 * No prime, name quiz, hats, map, or stars.
 *
 * Jumble mix math is the live MorphTask renderer: this class installs
 * MorphTaskController.prototype methods it does not override. Load
 * 4_MorphTask.js first. Do not add pilot flags to MorphTask.js.
 *
 * Head list: phase.heads only (SVG ids). StimulusSettings copies that onto
 * forced_heads and synthesizes Fennimals with an identity FeatureMap so the
 * SVG cleaner cannot strip the templates.
 */
class MorphHeadPilotController {
    constructor(parentLayer, phaseData, returnfunc, expCont) {
        this.ParentLayer = parentLayer;
        this.phaseData = phaseData;
        this.returnfunc = returnfunc;
        this.expCont = expCont;
        this.params = Object.assign(
            {},
            (typeof GenParam !== "undefined" && GenParam.MorphTask) || {},
            (typeof GenParam !== "undefined" && GenParam.MorphHeadPilot) || {}
        );
        // One photo well, no prime slot. MorphTask's jumble mixer reads jumbleSlot.
        this.params.jumbleSlot = this.params.jumbleSlot || { x: 0.04, y: 0.04, w: 0.92, h: 0.92 };
        this.W = GenParam.SVG_width;
        this.H = GenParam.SVG_height;

        this.fensById = this._indexFennimals(expCont && expCont.stimuli);
        this.trialSpeedMs = this._resolveTrialSpeed();
        this._sampleHeads();
        this._ensureTrialList();
        this._assignSubjectMorph();
        this.trialSpecs = this._readTrialSpecs();
        this.nameRoster = [];
        this.queue = this._buildTrialQueue();
        this.buttonSides = this._assignButtonSides();
        this.buttonOrderIds = [];
        this.buttonRingSpin = -Math.PI / 2;

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

        this._boundKeyDown = (evt) => this._onKeyDown(evt);
        this._boundKeyUp = (evt) => this._onKeyUp(evt);
        window.addEventListener("keydown", this._boundKeyDown);
        window.addEventListener("keyup", this._boundKeyUp);

        this.phaseData.answers = this.answers;
        this.phaseData.trial_speed = this.trialSpeedMs;
        this.phaseData.assigned_morph = this.assignedMorph || null;
        this.phaseData.morph_method = this.assignedMorph || null;
        this.phaseData.morphs_pool = (this.morphsPool || []).slice();
        this.phaseData.morph_trial_order = this.queue.map((t) => t.id);
        this.phaseData.morph_button_sides = this.buttonSides;
        this.phaseData.morph_heads = (this.phaseData.heads || []).slice();
        this.phaseData.sampled_heads = (this.sampledHeads || []).slice();
        this.phaseData.n_heads_sampled = this.sampledHeads ? this.sampledHeads.length : null;
        this.phaseData.morph_mix_levels = this._mixLevels();
        this._stampAnalysisMeta();
        this._assertSinglePaidMorph();
    }

    _fail(message) {
        throw new Error("MorphHeadPilot: " + message);
    }

    static morphKinds() {
        return MorphTaskController.morphKinds();
    }

    static isAllowedMix(raw) {
        return MorphTaskController.isAllowedMix(raw);
    }

    static countMaxEarnableStars() {
        return 0;
    }

    // All unordered pairs from phase.heads. Every mix (including 50) gets
    // both directions so each parent is the designated target once.
    static buildPairwiseTrialBlocks(phase) {
        phase = phase || {};
        let heads = MorphHeadPilotController._normalizeHeadList(phase.heads);
        let morphs = phase.morphs;
        let mixes = phase.mixes;
        if (!Array.isArray(morphs) || morphs.length === 0) {
            throw new Error('morph_head_pilot needs morphs: ["crossfade"|"mesh"|"silhouette", ...] when trials is omitted.');
        }
        if (!Array.isArray(mixes) || mixes.length === 0) {
            throw new Error("morph_head_pilot needs mixes: [integer percents 1–99, ...] when trials is omitted.");
        }
        if (heads.length < 2) {
            throw new Error("morph_head_pilot needs heads: at least two SVG head ids.");
        }
        let allowed = MorphHeadPilotController.morphKinds();
        morphs.forEach((morph, i) => {
            if (allowed.indexOf(morph) < 0) {
                throw new Error(`morph_head_pilot morphs[${i}] must be "crossfade" | "mesh" | "silhouette" (got "${morph}").`);
            }
        });
        mixes.forEach((mix, i) => {
            if (!MorphHeadPilotController.isAllowedMix(mix)) {
                throw new Error(`morph_head_pilot mixes[${i}] must be an integer percent from 1 to 99 (got "${mix}").`);
            }
        });
        return morphs.map((morph) => {
            let block = [];
            mixes.forEach((mix) => {
                let mixN = Number(mix);
                for (let i = 0; i < heads.length; i++) {
                    for (let j = i + 1; j < heads.length; j++) {
                        let a = heads[i];
                        let b = heads[j];
                        [
                            { target: a, distractor: b },
                            { target: b, distractor: a }
                        ].forEach((row) => {
                            block.push({
                                id: `${morph}_${a}-${b}_t${row.target}_m${mixN}`,
                                fenA: a,
                                fenB: b,
                                target: row.target,
                                distractor: row.distractor,
                                mix: mixN,
                                morph
                            });
                        });
                    }
                }
            });
            return block;
        });
    }

    static _normalizeHeadList(raw) {
        if (!Array.isArray(raw)) return [];
        let out = [];
        let seen = {};
        raw.forEach((item, i) => {
            let name = String(item == null ? "" : item).trim().replace(/^Fennimal_head_/, "");
            if (!name) {
                throw new Error(`morph_head_pilot heads[${i}] is empty.`);
            }
            if (seen[name]) {
                throw new Error(`morph_head_pilot duplicate head "${name}".`);
            }
            seen[name] = true;
            out.push(name);
        });
        return out;
    }

    static resolveSampledHeads(phase, persist) {
        let pool = MorphHeadPilotController._normalizeHeadList(phase && phase.heads);
        if (pool.length < 2) {
            throw new Error("morph_head_pilot needs heads: at least two SVG head ids.");
        }
        let raw = phase && phase.n_heads_sampled;
        if (raw === undefined || raw === null || raw === "") {
            return pool.slice();
        }
        let n = Number(raw);
        if (!Number.isInteger(n) || n < 2) {
            throw new Error(`morph_head_pilot n_heads_sampled must be an integer >= 2 (got "${raw}").`);
        }
        if (n > pool.length) {
            throw new Error(
                `morph_head_pilot n_heads_sampled (${n}) is larger than heads.length (${pool.length}).`
            );
        }
        if (n === pool.length) return pool.slice();
        let existing = persist && persist.existing;
        if (existing && Array.isArray(existing.heads)
            && existing.heads.length === n
            && new Set(existing.heads).size === n
            && existing.heads.every((h) => pool.indexOf(h) >= 0)) {
            return existing.heads.slice();
        }
        return shuffleArray(pool.slice()).slice(0, n);
    }

    _sampleHeads() {
        let existing = this._readRandomization("morph_head_pilot_sampled_heads");
        let sampled = MorphHeadPilotController.resolveSampledHeads(this.phaseData, { existing: existing });
        this.sampledHeads = sampled;
        this._persistRandomization("morph_head_pilot_sampled_heads", {
            heads: sampled.slice(),
            pool: MorphHeadPilotController._normalizeHeadList(this.phaseData.heads),
            n: sampled.length
        });
    }

    _ensureTrialList() {
        let spec = Object.assign({}, this.phaseData, { heads: this.sampledHeads || this.phaseData.heads });
        delete spec.trials;
        this.phaseData.trials = MorphHeadPilotController.buildPairwiseTrialBlocks(spec);
    }

    _expandTrialSpec(spec) {
        let fenA = this._getFen(spec.fenA, `trial "${spec.id}" fenA`);
        let fenB = this._getFen(spec.fenB, `trial "${spec.id}" fenB`);
        if (fenA.id === fenB.id) this._fail(`trial "${spec.id}" fenA and fenB must differ.`);
        let target = this._getFen(spec.target, `trial "${spec.id}" target`);
        if (target.id !== fenA.id && target.id !== fenB.id) {
            this._fail(`trial "${spec.id}" target "${target.id}" must be fenA or fenB.`);
        }
        let mix = Number(spec.mix);
        if (!MorphHeadPilotController.isAllowedMix(mix)) {
            this._fail(`trial "${spec.id}" mix must be an integer percent from 1 to 99 (got "${spec.mix}").`);
        }
        let morph = spec.morph || "crossfade";
        if (MorphHeadPilotController.morphKinds().indexOf(morph) < 0) {
            this._fail(`trial "${spec.id}" morph must be "crossfade" | "mesh" | "silhouette" (got "${morph}").`);
        }
        if (fenA.head === fenB.head) {
            this._fail(`trial "${spec.id}" requires two different heads (both are "${fenA.head}").`);
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
            prime: { empty: true },
            question: this._identityPrompt({ is_practice: false }),
            options: [
                { id: fenA.id, label: fenA.name || fenA.head, fen: fenA },
                { id: fenB.id, label: fenB.name || fenB.head, fen: fenB }
            ]
        };
    }

    _identityPrompt(trial) {
        if (trial && trial.is_practice) {
            return this.params.identityPromptPractice || "Which shape does this most look like?";
        }
        return this.params.identityPrompt || "Which head do you see more clearly?";
    }

    _headNameFromId(id) {
        if (id == null) return null;
        let fen = this.fensById[id];
        if (fen && fen.head) return fen.head;
        return String(id);
    }

    _stampAnalysisMeta() {
        let paid = (this.queue || []).filter((t) => t && !t.is_practice);
        this.phaseData.n_paid_trials = paid.length;
        this.phaseData.n_practice_trials = (this.queue || []).length - paid.length;
        let dataCont = this.expCont && this.expCont.dataCont;
        if (dataCont && dataCont.experimentData) {
            dataCont.experimentData.morphAssignment = Object.assign(
                {},
                dataCont.experimentData.morphAssignment || {},
                {
                    morph: this.assignedMorph || null,
                    pool: (this.morphsPool || []).slice(),
                    sampled_heads: (this.sampledHeads || []).slice(),
                    heads_pool: MorphHeadPilotController._normalizeHeadList(this.phaseData.heads),
                    n_heads_sampled: this.sampledHeads ? this.sampledHeads.length : null,
                    mixes: this._mixLevels(),
                    n_paid_trials: paid.length
                }
            );
        }
        console.log(
            `%c MorphHeadPilot: ${paid.length} paid trials` +
            ` (${(this.sampledHeads || []).join(", ")}; mixes [${(this._mixLevels() || []).join(", ")}];` +
            ` morph="${this.assignedMorph}")`,
            "color:#6b4cff;font-weight:bold"
        );
    }

    _persistLiveAnswers() {
        let dataCont = this.expCont && this.expCont.dataCont;
        if (!dataCont || !dataCont.experimentData) return;
        dataCont.experimentData.morphHeadPilotProgress = {
            assigned_morph: this.assignedMorph || null,
            morphs_pool: (this.morphsPool || []).slice(),
            sampled_heads: (this.sampledHeads || []).slice(),
            n_heads_sampled: this.sampledHeads ? this.sampledHeads.length : null,
            n_answers: this.answers.length,
            n_queue: (this.queue || []).length,
            answers: this.answers
        };
        if (typeof dataCont.storeAllData === "function") dataCont.storeAllData(false);
    }

    _placeQuestion(trial) {
        let w = 980;
        let h = 78;
        let x = 0.5 * this.W - w / 2;
        let y = 14;
        let hud = this._placeHudBubble(x, y, w, h, this._identityPrompt(trial), "morph_question", 32);
        this.questionEl = hud.group;
        this.questionLabel = hud.label;
        this._questionHud = { x, y, w, h };
    }

    // Live morph_task right-aligns the jumble in a two-spot well. Center it in
    // this single well and fill most of the photo.
    async _placeRasterMorph(trial, opts) {
        let ready = await MorphTaskController.prototype._placeRasterMorph.call(this, trial, opts);
        if (!ready || !this.meshForeignObject) return ready;
        let slot = this._slotBox("jumble") || this._photoWellBox();
        if (!slot) return ready;
        let fit = this._num("jumbleFillFrac", 0.96);
        let side = Math.min(slot.width, slot.height) * fit;
        this.meshForeignObject.setAttribute("width", String(side));
        this.meshForeignObject.setAttribute("height", String(side));
        this.meshForeignObject.setAttribute("x", String(slot.x + (slot.width - side) / 2));
        this.meshForeignObject.setAttribute("y", String(slot.y + (slot.height - side) / 2));
        return ready;
    }

    // Measure the head template so F/J slots size to the face, not a hat.
    _identityHatNativeSize(fen) {
        let fallback = { width: 80, height: 80 };
        if (!fen || !fen.head) return fallback;
        let template = document.getElementById("Fennimal_head_" + fen.head);
        if (!template) return fallback;
        let clone = template.cloneNode(true);
        if (typeof strip_svg_ids_from_subtree === "function") strip_svg_ids_from_subtree(clone);
        clone.style.display = "inherit";
        clone.setAttribute("display", "inline");
        let host = (this.layers && this.layers.Plus2) || (this.layers && this.layers.Main);
        if (!host) return fallback;
        host.appendChild(clone);
        let b = fallback;
        try { b = clone.getBBox(); } catch (e) { b = fallback; }
        clone.remove();
        if (!(b.width > 0 && b.height > 0)) return fallback;
        return { width: b.width, height: b.height };
    }

    // Called from inherited _placeIdentityChoice. Live morph_task puts a hat
    // here; the pilot puts the unmorphed parent head.
    _placeHatOnKey(parent, fen, box, uniformScale) {
        if (!fen || !fen.head || !box) return null;
        let display = {
            id: "pilot_key_" + fen.id,
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

    // Inherited MorphTask version only draws a hat (fen.hat). Pilot Fennimals
    // have no hats — draw the head instead.
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
        else if (fen) this._placeHatOnKey(col, fen, hatBox, field.hatScale);

        let keyY = y0 + field.h - field.pad - layout.h / 2;
        let key = this._placeTextKey(cx, keyY, layout.w, layout.h, letter, {
            keyboardOnly: true,
            fontSize: this._num("identityKeyLetterSize", 40)
        });
        col.appendChild(key);
        return key;
    }

    async _runTrial(trial) {
        this._clearScene();
        this._pointsFrozen = false;
        this._late = false;
        this.inputLocked = true;
        this.meshFallbackReason = null;

        this._paintBackdrop();
        this._placePolaroidChrome(trial);
        this._placeQuestion(trial);
        this._placeProgressHud();
        await this._waitForPaint();
        try {
            await this._placeMorphStimulus(trial, {});
        } catch (err) {
            console.warn("MorphHeadPilot: jumble place failed:", err);
        }

        this._placeIdentityKeys(trial, { armed: true });
        this._inputStage = "identity";
        this._identityArmed = true;

        let choice = await this._runMorphUntilResponse(trial);
        this._stopMorph();
        this._pointsFrozen = true;
        this._inputStage = null;

        let elapsed = choice.response_perf - this._morphStart;
        let rt = Math.round(elapsed);
        let mixWeight = this._mixWeight(trial);
        let selectedHead = choice.selected_id;
        if (this.fensById[choice.selected_id] && this.fensById[choice.selected_id].head) {
            selectedHead = this.fensById[choice.selected_id].head;
        } else if (trial.options) {
            let opt = trial.options.find((o) => o.id === choice.selected_id);
            if (opt && opt.fen && opt.fen.head) selectedHead = opt.fen.head;
            else if (opt && opt.shape) selectedHead = opt.shape;
        }
        let correctVsTarget = choice.selected_id === trial.correctId;
        let scoredCorrect = trial.mix === 50 ? true : correctVsTarget;
        let fenAHead = trial.fenA ? trial.fenA.head : (trial.shapeTarget || null);
        let fenBHead = trial.fenB ? trial.fenB.head : (trial.shapeOther || null);
        let targetHead = trial.targetFen ? trial.targetFen.head : (trial.shapeTarget || null);
        let distractorHead = trial.otherFen ? trial.otherFen.head : (trial.shapeOther || null);
        let pairHeads = (fenAHead && fenBHead)
            ? [fenAHead, fenBHead].slice().sort()
            : null;
        let leftId = this.optionSides ? this.optionSides.left_id : null;
        let rightId = this.optionSides ? this.optionSides.right_id : null;
        let leftHead = this._headNameFromId(leftId);
        let rightHead = this._headNameFromId(rightId);
        let selectedKey = choice.selected_side === "right" ? "J"
            : (choice.selected_side === "left" ? "F" : null);
        let morphMethod = trial.morph || this.assignedMorph || null;

        this.answers.push({
            trial_index: this.currentTrialIndex,
            trial_id: trial.id,
            block_index: trial.blockIndex != null ? trial.blockIndex : null,
            kind: trial.kind || (trial.is_practice ? "practice" : null),
            role: trial.role,
            is_practice: !!trial.is_practice,
            question: this._identityPrompt(trial),
            pair_heads: pairHeads,
            fenA_id: trial.fenA ? trial.fenA.id : null,
            fenB_id: trial.fenB ? trial.fenB.id : null,
            fenA_head: fenAHead,
            fenB_head: fenBHead,
            target_id: trial.correctId,
            target_head: targetHead,
            mix_toward_head: targetHead,
            other_id: trial.otherFen ? trial.otherFen.id : (trial.shapeOther || null),
            distractor_id: trial.otherFen ? trial.otherFen.id : (trial.shapeOther || null),
            distractor_head: distractorHead,
            selected_id: choice.selected_id,
            selected_head: selectedHead,
            selected_side: choice.selected_side || null,
            selected_key: selectedKey,
            left_id: leftId,
            right_id: rightId,
            left_head: leftHead,
            right_head: rightHead,
            correct_vs_target: correctVsTarget,
            selected_is_target: correctVsTarget,
            scored_correct: scoredCorrect,
            correct: scoredCorrect,
            balanced_mix: trial.mix === 50,
            mix: trial.mix,
            mix_weight: mixWeight,
            late: false,
            timeout: false,
            reaction_time_ms: rt,
            grayscale: true,
            morph: morphMethod,
            assigned_morph: this.assignedMorph || null,
            morph_mode: morphMethod,
            morph_renderer: this.activeRenderer,
            mesh_fallback_reason: this.meshFallbackReason,
            sampled_heads: (this.sampledHeads || []).slice(),
            n_heads_sampled: this.sampledHeads ? this.sampledHeads.length : null,
            view: "closeup",
            button_sides: this.optionSides ? Object.assign({}, this.optionSides) : null,
            presented_ids: (trial.options || []).map((o) => o.id),
            presented_heads: (trial.options || []).map((o) => {
                let fen = o.fen || this.fensById[o.id];
                return fen && fen.head ? fen.head : (o.shape || o.id);
            }),
            n_options: (trial.options || []).length,
            input_type: choice.input_type,
            trial_speed: this.trialSpeedMs,
            region: "Home",
            location: "Photo room"
        });
        this._persistLiveAnswers();

        if (typeof AudioCont !== "undefined" && AudioCont.play_sound_effect) {
            AudioCont.play_sound_effect("button_click");
        }

        this._clearIdentityKeys();
        await this._flyPolaroidToSide(choice.selected_side === "right" ? "J" : "F");
        await this._fadeSceneOut();
        this._clearScene();
        if (this.sceneRoot) this.sceneRoot.style.opacity = "1";
    }

    _finishPhase() {
        this.phaseData.bonus_stars_earned = 0;
        this.phaseData.session_points = 0;
        this.phaseData.assigned_morph = this.assignedMorph || this.phaseData.assigned_morph || null;
        this.phaseData.morph_method = this.assignedMorph || this.phaseData.morph_method || null;
        this.phaseData.morphs_pool = (this.morphsPool || this.phaseData.morphs_pool || []).slice();
        this._stampAnalysisMeta();
        this._persistLiveAnswers();
        if (this.expCont && this.expCont.dataCont && this.expCont.dataCont.recordStarsEarned) {
            this.expCont.dataCont.recordStarsEarned(
                this.expCont.currentDayNum,
                "morph_head_pilot",
                0,
                0
            );
        }
        if (typeof this.returnfunc === "function") this.returnfunc();
    }
}

(function installSharedMorphRenderer(Pilot, Morph) {
    if (typeof Morph === "undefined") {
        throw new Error("MorphHeadPilot: 4_MorphTask.js must load before 4_MorphHeadPilotTask.js.");
    }
    Object.getOwnPropertyNames(Morph.prototype).forEach((name) => {
        if (name === "constructor") return;
        if (Object.prototype.hasOwnProperty.call(Pilot.prototype, name)) return;
        Pilot.prototype[name] = Morph.prototype[name];
    });
})(MorphHeadPilotController, MorphTaskController);
