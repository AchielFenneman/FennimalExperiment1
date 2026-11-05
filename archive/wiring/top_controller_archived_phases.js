/*
 * ARCHIVED snippets from 2_Top_controller.js — not loaded.
 * Restore by pasting back into ExperimentController and adding the matching
 * script tags from archive/tasks/ (see MANIFEST.md).
 */

// --- StimulusSpec validation ---
            if (phase.type === "chimera_feature_id") {
                if (phase.names_options !== undefined && !Array.isArray(phase.names_options)) {
                    errors.push(`${label} names_options must be an array of Fennimal ids when set.`);
                }
                if (!Array.isArray(phase.trials) || phase.trials.length === 0) {
                    errors.push(`${label} requires a non-empty trials array (chimera trialset lives in stimulus settings).`);
                } else {
                    phase.trials.forEach((trial, i) => {
                        if (!trial || !trial.id) {
                            errors.push(`${label} trials[${i}] is missing an id.`);
                        }
                    });
                }
                let revealMode = phase.reveal_mode || "blur-silhouette";
                let allowedReveal = ["blur-silhouette", "patchy-holes", "patchy-holes-with-pixalation"];
                if (!allowedReveal.includes(revealMode)) {
                    errors.push(
                        `${label} reveal_mode must be ${allowedReveal.map((m) => `"${m}"`).join(" | ")} ` +
                        `(got "${phase.reveal_mode}").`
                    );
                }
                if (phase.skip_practice !== undefined && typeof phase.skip_practice !== "boolean") {
                    errors.push(`${label} skip_practice must be true or false when set.`);
                }
                if (phase.trial_speed !== undefined && phase.trial_speed !== null && phase.trial_speed !== "") {
                    let speed = Number(phase.trial_speed);
                    if (!Number.isFinite(speed) || speed <= 0) {
                        errors.push(`${label} trial_speed must be a positive number of milliseconds (got "${phase.trial_speed}").`);
                    }
                }
            }

            if (phase.type === "morph_task_two_stage_development") {
                if (!Array.isArray(phase.names_options) || phase.names_options.length === 0) {
                    errors.push(`${label} names_options is required (non-empty Fennimal ids) for ${phase.type}.`);
                } else {
                    phase.names_options.forEach((id, i) => {
                        if (id === undefined || id === null || String(id).trim() === "") {
                            errors.push(`${label} names_options[${i}] is empty.`);
                            return;
                        }
                        let sid = String(id).trim();
                        if (!knownIdSet.has(sid)) {
                            errors.push(
                                `${label} names_options[${i}] "${sid}" is not a Fennimal id ` +
                                `(known: ${[...knownIdSet].join(", ")}).`
                            );
                        }
                    });
                }
                let flatTrials = [];
                if (!Array.isArray(phase.trials) || phase.trials.length === 0) {
                    errors.push(`${label} requires a non-empty trials array (morph trialset lives in stimulus settings).`);
                } else {
                    let blocked = Array.isArray(phase.trials[0]);
                    for (let i = 0; i < phase.trials.length; i++) {
                        let entry = phase.trials[i];
                        if (blocked) {
                            if (!Array.isArray(entry)) {
                                errors.push(
                                    `${label} trials mixes blocks and bare trials (trials[${i}] is not an array).`
                                );
                                continue;
                            }
                            if (entry.length === 0) {
                                errors.push(`${label} trials[${i}] block is empty.`);
                                continue;
                            }
                            entry.forEach((trial, j) => {
                                flatTrials.push({ trial, path: `trials[${i}][${j}]` });
                            });
                        } else if (Array.isArray(entry)) {
                            errors.push(
                                `${label} trials mixes bare trials and blocks (trials[${i}] is an array).`
                            );
                        } else {
                            flatTrials.push({ trial: entry, path: `trials[${i}]` });
                        }
                    }
                    flatTrials.forEach(({ trial, path }) => {
                        if (!trial || !trial.id) {
                            errors.push(`${label} ${path} is missing an id.`);
                            return;
                        }
                        let usesHeadEndpoints = trial.headA != null || trial.headB != null || trial.targetHead != null;
                        if (usesHeadEndpoints) {
                            if (!trial.headA || !trial.headB) {
                                errors.push(`${label} ${path} needs headA and headB SVG head names.`);
                            }
                            if (!trial.targetHead) {
                                errors.push(`${label} ${path} needs targetHead (must equal headA or headB).`);
                            } else if (trial.headA && trial.headB
                                && trial.targetHead !== trial.headA && trial.targetHead !== trial.headB) {
                                errors.push(`${label} ${path} targetHead "${trial.targetHead}" must equal headA or headB.`);
                            }
                        } else {
                            if (!trial.fenA || !trial.fenB) {
                                errors.push(`${label} ${path} needs fenA and fenB Fennimal ids.`);
                            }
                            if (!trial.target) {
                                errors.push(`${label} ${path} needs a target (must equal fenA or fenB).`);
                            } else if (trial.fenA && trial.fenB && trial.target !== trial.fenA && trial.target !== trial.fenB) {
                                errors.push(`${label} ${path} target "${trial.target}" must equal fenA or fenB.`);
                            }
                        }
                        let centerpoint = Number(trial.morph_centerpoint);
                        if (!Number.isFinite(centerpoint) || centerpoint < 0 || centerpoint > 1) {
                            errors.push(`${label} ${path} morph_centerpoint must be a number in [0, 1] (got "${trial.morph_centerpoint}").`);
                        }
                        if (trial.noise !== undefined && trial.noise !== null && trial.noise !== "") {
                            let noise = Number(trial.noise);
                            if (!Number.isFinite(noise) || noise < 0 || noise > 1) {
                                errors.push(`${label} ${path} noise must be a number in [0, 1] when set (got "${trial.noise}").`);
                            }
                        }
                        if (trial.morph !== undefined && !["full", "shape", "color", "mesh"].includes(trial.morph)) {
                            errors.push(`${label} ${path} morph must be "full" | "shape" | "color" | "mesh" when set.`);
                        }
                        if (trial.view !== undefined && !["closeup", "full"].includes(trial.view)) {
                            errors.push(`${label} ${path} view must be "closeup" | "full" when set.`);
                        }
                        if (trial.grayscale !== undefined && trial.grayscale !== null && trial.grayscale !== "") {
                            if (typeof trial.grayscale !== "boolean") {
                                errors.push(`${label} ${path} grayscale must be true or false when set (got "${trial.grayscale}").`);
                            }
                        }
                        let blank = (v) => {
                            if (v === undefined || v === null) return true;
                            let s = String(v).trim().toLowerCase();
                            return s === "" || s === "none" || s === "null" || s === "neutral";
                        };
                        let gray = (v) => {
                            let s = String(v).trim().toLowerCase();
                            return s === "gray" || s === "grey" || s === "grayscale" || s === "greyscale";
                        };
                        if (trial.prime === undefined || trial.prime === null) {
                            errors.push(
                                `${label} ${path} requires prime: { head?, body?, hat?, toy?, color_scheme?, name } ` +
                                `with name and at least one of head/body/hat/toy.`
                            );
                        } else if (typeof trial.prime !== "object" || Array.isArray(trial.prime)) {
                            errors.push(`${label} ${path} prime must be an object.`);
                        } else {
                            ["head", "body", "hat", "toy", "name"].forEach((key) => {
                                if (blank(trial.prime[key])) return;
                                let id = String(trial.prime[key]).trim();
                                if (!knownIdSet.has(id)) {
                                    errors.push(
                                        `${label} ${path} prime.${key} "${id}" is not a Fennimal id ` +
                                        `(known: ${[...knownIdSet].join(", ")}).`
                                    );
                                }
                            });
                            if (blank(trial.prime.name)) {
                                errors.push(`${label} ${path} prime.name is required.`);
                            }
                            if (blank(trial.prime.head) && blank(trial.prime.body)
                                && blank(trial.prime.hat) && blank(trial.prime.toy)) {
                                errors.push(
                                    `${label} ${path} prime must include at least one of head, body, hat, or toy ` +
                                    `(empty {} not allowed).`
                                );
                            }
                            if (!blank(trial.prime.toy) && blank(trial.prime.body)) {
                                errors.push(
                                    `${label} ${path} prime.toy requires prime.body ` +
                                    `(toy attaches to the body).`
                                );
                            }
                            if (!blank(trial.prime.color_scheme)) {
                                let cs = String(trial.prime.color_scheme).trim();
                                if (!gray(cs) && !knownIdSet.has(cs)) {
                                    errors.push(
                                        `${label} ${path} prime.color_scheme "${cs}" must be a Fennimal id ` +
                                        `or gray/grey/grayscale/greyscale.`
                                    );
                                }
                            }
                        }
                    });
                }
                if (phase.skip_practice !== undefined && typeof phase.skip_practice !== "boolean") {
                    errors.push(`${label} skip_practice must be true or false when set.`);
                }
                if (phase.resolve_trial !== undefined && typeof phase.resolve_trial !== "boolean") {
                    errors.push(`${label} resolve_trial must be true or false when set.`);
                }
                if (phase.trial_speed !== undefined && phase.trial_speed !== null && phase.trial_speed !== "") {
                    let speed = Number(phase.trial_speed);
                    if (!Number.isFinite(speed) || speed <= 0) {
                        errors.push(`${label} trial_speed must be a positive number of milliseconds (got "${phase.trial_speed}").`);
                    }
                }
            }

            // morph_head_pilot: pairwise jumble 2AFC. Does not use names_options / prime.
            if (phase.type === "morph_head_pilot") {
                if (!Array.isArray(phase.heads) || phase.heads.length < 2) {
                    errors.push(`${label} heads must list at least two SVG head ids.`);
                } else {
                    phase.heads.forEach((id, i) => {
                        if (id === undefined || id === null || String(id).trim() === "") {
                            errors.push(`${label} heads[${i}] is empty.`);
                            return;
                        }
                        let sid = String(id).trim().replace(/^Fennimal_head_/, "");
                        if (!knownIdSet.has(sid)) {
                            errors.push(
                                `${label} heads[${i}] "${sid}" is not a Fennimal id ` +
                                `(known: ${[...knownIdSet].join(", ")}).`
                            );
                        }
                    });
                }
                let hasTrials = Array.isArray(phase.trials) && phase.trials.length > 0;
                if (!hasTrials) {
                    try {
                        if (typeof MorphHeadPilotController === "undefined"
                            || typeof MorphHeadPilotController.buildPairwiseTrialBlocks !== "function") {
                            throw new Error("trials is empty and MorphHeadPilot trial builder is not loaded.");
                        }
                        // Dry-run only. Do not stamp trials here — the controller
                        // samples n_heads_sampled at runtime.
                        let n = phase.n_heads_sampled;
                        if (n !== undefined && n !== null && n !== "") {
                            n = Number(n);
                            if (!Number.isInteger(n) || n < 2) {
                                throw new Error(`n_heads_sampled must be an integer >= 2 (got "${phase.n_heads_sampled}").`);
                            }
                            if (Array.isArray(phase.heads) && n > phase.heads.length) {
                                throw new Error(
                                    `n_heads_sampled (${n}) is larger than heads.length (${phase.heads.length}).`
                                );
                            }
                        }
                        MorphHeadPilotController.buildPairwiseTrialBlocks(phase);
                    } catch (err) {
                        errors.push(`${label} ${err && err.message ? err.message : err}`);
                    }
                }
                if (phase.skip_practice !== undefined && typeof phase.skip_practice !== "boolean") {
                    errors.push(`${label} skip_practice must be true or false when set.`);
                }
                if (phase.trial_speed !== undefined && phase.trial_speed !== null && phase.trial_speed !== "") {
                    let speed = Number(phase.trial_speed);
                    if (!Number.isFinite(speed) || speed <= 0) {
                        errors.push(`${label} trial_speed must be a positive number of milliseconds (got "${phase.trial_speed}").`);
                    }
                }
            }

            if (phase.type === "hat_drop_task" || phase.type === "hat_drop_gonogo") {
                if (!Array.isArray(phase.trials) || phase.trials.length === 0) {
                    errors.push(`${label} requires a non-empty trials array (hat-drop trialset lives in stimulus settings).`);
                } else {
                    let allowedInst = phase.type === "hat_drop_gonogo"
                        ? ["cousin", "neighbour"]
                        : ["most_similar", "cousin", "neighbour"];
                    phase.trials.forEach((trial, i) => {
                        if (!trial || !trial.id) {
                            errors.push(`${label} trials[${i}] is missing an id.`);
                        }
                        if (!trial || !allowedInst.includes(trial.instruction)) {
                            errors.push(`${label} trials[${i}] instruction must be ${allowedInst.map((k) => `"${k}"`).join(" | ")}.`);
                        }
                        if (!trial || !trial.dropped) {
                            errors.push(`${label} trials[${i}] dropped must be a Fennimal id.`);
                        }
                        if (phase.type === "hat_drop_gonogo") {
                            if (!trial || !trial.box) {
                                errors.push(`${label} trials[${i}] box must be a Fennimal id.`);
                            }
                            let resp = trial && (trial.response != null ? trial.response : trial.correct);
                            if (resp !== "go" && resp !== "nogo") {
                                errors.push(`${label} trials[${i}] correct/response must be "go" or "nogo".`);
                            }
                        } else {
                            let lure = trial && (trial.lure != null ? trial.lure : trial.incorrect);
                            if (!trial || !trial.correct) {
                                errors.push(`${label} trials[${i}] correct must be a Fennimal id.`);
                            }
                            if (!lure) {
                                errors.push(`${label} trials[${i}] lure must be a Fennimal id.`);
                            }
                        }
                    });
                }
                if (phase.skip_practice !== undefined && typeof phase.skip_practice !== "boolean") {
                    errors.push(`${label} skip_practice must be true or false when set.`);
                }
                if (phase.n_reps !== undefined && phase.n_reps !== null && phase.n_reps !== "") {
                    let reps = Number(phase.n_reps);
                    if (!Number.isInteger(reps) || reps < 1) {
                        errors.push(`${label} n_reps must be an integer >= 1 (got "${phase.n_reps}").`);
                    }
                }
                if (phase.instruction_order !== undefined) {
                    let allowed = phase.type === "hat_drop_gonogo"
                        ? ["cousin", "neighbour"]
                        : ["most_similar", "cousin", "neighbour"];
                    if (!Array.isArray(phase.instruction_order) || phase.instruction_order.length === 0) {
                        errors.push(`${label} instruction_order must be a non-empty array.`);
                    } else {
                        phase.instruction_order.forEach((key, i) => {
                            if (!allowed.includes(key)) {
                                errors.push(`${label} instruction_order[${i}] must be ${allowed.map((k) => `"${k}"`).join(" | ")} (got "${key}").`);
                            }
                        });
                    }
                }
                ["min_points", "max_points", "total_fall_time", "preview_ms", "preview_travel_ms"].forEach((field) => {
                    if (phase[field] !== undefined && phase[field] !== null && phase[field] !== "") {
                        let n = Number(phase[field]);
                        if (!Number.isFinite(n) || n < 0) {
                            errors.push(`${label} ${field} must be a non-negative number (got "${phase[field]}").`);
                        }
                    }
                });
            }

// --- Fennimal id collection ---
        if (phase.type === "hat_drop_task" || phase.type === "hat_drop_gonogo") {
            (phase.trials || []).forEach((trial, i) => {
                if (!trial) return;
                add(trial.dropped, `trials[${i}].dropped`);
                add(trial.lure, `trials[${i}].lure`);
                add(trial.incorrect, `trials[${i}].incorrect`);
                add(trial.box, `trials[${i}].box`);
                if (trial.correct && trial.correct !== "go" && trial.correct !== "nogo") {
                    add(trial.correct, `trials[${i}].correct`);
                }
            });
        }

        if (phase.type === "chimera_feature_id") {
            const skipToken = (val) => {
                if (val === undefined || val === null || val === "") return true;
                let s = String(val).trim().toLowerCase();
                return s === "none" || s === "neutral" || s === "null";
            };
            (phase.trials || []).forEach((trial, i) => {
                if (!trial) return;
                if (!skipToken(trial.region)) add(trial.region, `trials[${i}].region`);
                if (!skipToken(trial.head)) add(trial.head, `trials[${i}].head`);
                if (!skipToken(trial.object != null ? trial.object : trial.hat)) {
                    add(trial.object != null ? trial.object : trial.hat, `trials[${i}].object`);
                }
                if (!skipToken(trial.answer)) add(trial.answer, `trials[${i}].answer`);
            });
        }

        if (phase.type === "morph_head_pilot") {
            addList(phase.heads, "heads");
        }

// --- setupPartnerBeliefPhase (controller lives in archive/controllers/) ---
    setupPartnerBeliefPhase() {
        this.mapCont.disable_map_interactions();
        document.getElementById("Map").style.display = "none";

        this.currentPhaseData.toyboxes_asked = this.stimuli.get_assigned_names_of_code_array("toybox", this.currentPhaseData.toyboxes_asked);
        this.currentPhaseData.toys_asked = this.stimuli.get_assigned_names_of_code_array("toy", this.currentPhaseData.toys_asked);

        let pLayer = document.getElementById("Fennimals_Layer");
        let pbPartnerPresent = WorldState.get_current_partner_role() === "active";

        // PartnerBeliefMultipleController is archived in 3_InteractiveFennimalController_archive.js
        // (not loaded by index.html). PartnerBeliefTaskController remains a deprecated alias there.
        if (typeof PartnerBeliefMultipleController === "undefined") {
            console.error(
                '[TopController] Phase type "partner_belief_multiple" is archived ' +
                "(PartnerBeliefMultipleController in 3_InteractiveFennimalController_archive.js, " +
                "not loaded by index.html). Add that script tag after 3_InteractiveFennimalController.js to restore it."
            );
            return;
        }

        let currentTask = new PartnerBeliefMultipleController(pLayer, this.currentPhaseData, pbPartnerPresent, () => {

            // FIX: Attach the answers, then delete the duplicate source array to prevent JSON bloat!
            this.currentPhaseData.answers = this.currentPhaseData.PartnerBeliefAnswers;
            delete this.currentPhaseData.PartnerBeliefAnswers;

            // Calculate using the new .answers array
            let earned = this.currentPhaseData.answers.reduce((sum, ans) => sum + (ans.stars_earned || 0), 0);
            let maxPossible = this.currentPhaseData.bonus_stars_per_correct_answer * this.currentPhaseData.toyboxes_asked.length;

            this.currentPhaseData.bonus_stars_earned = earned; // Tag it locally for easy access in R
            this.dataCont.recordStarsEarned(this.currentDayNum, this.currentPhaseType, earned, maxPossible);

            currentTask.clean_up();
            clear_Fennimals_interaction_layer();
            document.getElementById("Map").style.display = "inherit";

            // This naturally calls phaseCompleted(), which will now properly store this rich object!
            this.phaseCompleted();
        });
        currentTask.start_sequence();
    }

// --- indoor DV setup methods ---
    setupChimeraFeatureIdPhase() {
        this.mapCont.disable_map_interactions();
        if (this.mapCont.hide_request_instructions_button) this.mapCont.hide_request_instructions_button();
        document.getElementById("Map").style.display = "none";
        let iface = document.getElementById("Interface");
        if (iface) iface.style.display = "inherit";
        if (typeof Interface !== "undefined" && Interface.FenneFinder && Interface.FenneFinder.hide) {
            Interface.FenneFinder.hide();
        }

        this.currentPhaseData.Data = [];
        let pLayer = document.getElementById("Fennimals_Layer");
        if (pLayer) pLayer.style.display = "inherit";
        if (this.mapCont && this.mapCont.Map_Layer) this.mapCont.Map_Layer.style.display = "none";
        this.mapCont.hide_all_locations();
        this.mapCont.currently_in_location = false;

        let currentTask = new ChimeraFeatureIdController(
            pLayer,
            this.currentPhaseData,
            () => {
                this.currentPhaseData.Data = this.currentPhaseData.answers || [];
                currentTask.clean_up();
                this.chimeraCont = null;
                clear_Fennimals_interaction_layer();
                document.getElementById("Map").style.display = "inherit";
                this.phaseCompleted();
            },
            this
        );
        this.chimeraCont = currentTask;
        currentTask.start_sequence();
    }

    // Stimulus pilot: jumble + head 2AFC. Same indoor overlay as morph_task.
    setupMorphHeadPilotPhase() {
        this.mapCont.disable_map_interactions();
        if (this.mapCont.hide_request_instructions_button) this.mapCont.hide_request_instructions_button();
        document.getElementById("Map").style.display = "none";
        let iface = document.getElementById("Interface");
        if (iface) iface.style.display = "inherit";
        if (typeof Interface !== "undefined" && Interface.FenneFinder && Interface.FenneFinder.hide) {
            Interface.FenneFinder.hide();
        }

        this.currentPhaseData.Data = [];
        let pLayer = document.getElementById("Fennimals_Layer");
        if (pLayer) pLayer.style.display = "inherit";
        if (this.mapCont && this.mapCont.Map_Layer) this.mapCont.Map_Layer.style.display = "none";
        this.mapCont.hide_all_locations();
        this.mapCont.currently_in_location = false;

        let currentTask = new MorphHeadPilotController(
            pLayer,
            this.currentPhaseData,
            () => {
                this.currentPhaseData.Data = this.currentPhaseData.answers || [];
                currentTask.clean_up();
                this.morphHeadPilotCont = null;
                clear_Fennimals_interaction_layer();
                document.getElementById("Map").style.display = "inherit";
                this.phaseCompleted();
            },
            this
        );
        this.morphHeadPilotCont = currentTask;
        currentTask.start_sequence();
    }

    // Archived: two-polaroid morph_task_two_cards (MorphTaskTwoCardsController).
    setupMorphTaskTwoCardsPhase() {
        this.mapCont.disable_map_interactions();
        if (this.mapCont.hide_request_instructions_button) this.mapCont.hide_request_instructions_button();
        document.getElementById("Map").style.display = "none";
        let iface = document.getElementById("Interface");
        if (iface) iface.style.display = "inherit";
        if (typeof Interface !== "undefined" && Interface.FenneFinder && Interface.FenneFinder.hide) {
            Interface.FenneFinder.hide();
        }

        this.currentPhaseData.Data = [];
        let pLayer = document.getElementById("Fennimals_Layer");
        if (pLayer) pLayer.style.display = "inherit";
        if (this.mapCont && this.mapCont.Map_Layer) this.mapCont.Map_Layer.style.display = "none";
        this.mapCont.hide_all_locations();
        this.mapCont.currently_in_location = false;

        let currentTask = new MorphTaskTwoCardsController(
            pLayer,
            this.currentPhaseData,
            () => {
                this.currentPhaseData.Data = this.currentPhaseData.answers || [];
                currentTask.clean_up();
                this.morphCont = null;
                clear_Fennimals_interaction_layer();
                document.getElementById("Map").style.display = "inherit";
                this.phaseCompleted();
            },
            this
        );
        this.morphCont = currentTask;
        currentTask.start_sequence();
    }

    // Archived: developing-photo morph_task_two_stage_development
    // (MorphTaskTwoStageDevelopmentController).
    setupMorphTaskTwoStageDevelopmentPhase() {
        this.mapCont.disable_map_interactions();
        if (this.mapCont.hide_request_instructions_button) this.mapCont.hide_request_instructions_button();
        document.getElementById("Map").style.display = "none";
        let iface = document.getElementById("Interface");
        if (iface) iface.style.display = "inherit";
        if (typeof Interface !== "undefined" && Interface.FenneFinder && Interface.FenneFinder.hide) {
            Interface.FenneFinder.hide();
        }

        this.currentPhaseData.Data = [];
        let pLayer = document.getElementById("Fennimals_Layer");
        if (pLayer) pLayer.style.display = "inherit";
        if (this.mapCont && this.mapCont.Map_Layer) this.mapCont.Map_Layer.style.display = "none";
        this.mapCont.hide_all_locations();
        this.mapCont.currently_in_location = false;

        let currentTask = new MorphTaskTwoStageDevelopmentController(
            pLayer,
            this.currentPhaseData,
            () => {
                this.currentPhaseData.Data = this.currentPhaseData.answers || [];
                currentTask.clean_up();
                this.morphCont = null;
                clear_Fennimals_interaction_layer();
                document.getElementById("Map").style.display = "inherit";
                this.phaseCompleted();
            },
            this
        );
        this.morphCont = currentTask;
        currentTask.start_sequence();
    }

    // Morph trials never travel: same indoor overlay bookkeeping as chimera.
    prepareMorphTrialTravel(trial, prevTrial) {
        return this.prepareChimeraTrialTravel(trial, prevTrial);
    }

    setupHatDropPhase() {
        this.mapCont.disable_map_interactions();
        if (this.mapCont.hide_request_instructions_button) this.mapCont.hide_request_instructions_button();
        document.getElementById("Map").style.display = "none";
        let iface = document.getElementById("Interface");
        if (iface) iface.style.display = "inherit";
        if (typeof Interface !== "undefined" && Interface.FenneFinder && Interface.FenneFinder.hide) {
            Interface.FenneFinder.hide();
        }

        this.currentPhaseData.Data = [];
        let pLayer = document.getElementById("Fennimals_Layer");
        if (pLayer) pLayer.style.display = "inherit";
        if (this.mapCont && this.mapCont.Map_Layer) this.mapCont.Map_Layer.style.display = "none";
        this.mapCont.hide_all_locations();
        this.mapCont.currently_in_location = false;

        let currentTask = new HatDropTaskController(
            pLayer,
            this.currentPhaseData,
            () => {
                this.currentPhaseData.Data = this.currentPhaseData.answers || [];
                currentTask.clean_up();
                this.hatDropCont = null;
                clear_Fennimals_interaction_layer();
                document.getElementById("Map").style.display = "inherit";
                this.phaseCompleted();
            },
            this
        );
        this.hatDropCont = currentTask;
        currentTask.start_sequence();
    }

    _chimeraRevealMapThen(next) {
        this.mapCont.disable_map_interactions();
        if (this.mapCont.hide_request_instructions_button) this.mapCont.hide_request_instructions_button();
        if (this.mapCont.remove_all_action_buttons) this.mapCont.remove_all_action_buttons();
        let layer = document.getElementById("Fennimals_Layer");
        if (layer) layer.style.display = "none";

        const showMap = () => {
            this.mapCont.Map_Layer.style.display = "inherit";
            this.mapCont.hide_all_locations();
            this.mapCont.currently_in_location = false;
            next();
        };

        if (this.mapCont.currently_in_location) {
            this.mapCont.flash_location_transition_mask(this.mapCont.current_region);
            setTimeout(showMap, 0.5 * GenParam.map_to_location_transition_speed);
        } else {
            showMap();
        }
    }

// --- card sorting hook ---
    cardSortingTaskComplete(cardData) {
        if (this.currentPhaseData) {
            this.currentPhaseData.CardData = JSON.parse(JSON.stringify(cardData));
            this.dataCont.storePhaseData(this.currentPhaseData);
            this.startNextExperimentPhase();
        } else {
            this.dataCont.storeCardDataWhenIncludedInGeneralInstructions(cardData);
            this.showNextGeneralInstructionsPage();
        }
    }

