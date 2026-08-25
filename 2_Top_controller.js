// ----------------------------------------------------
// retrieve_lost_box box_locations: weights (relative; default 1)
// ----------------------------------------------------
function boxLocationHasExplicitWeight(entry) {
    return !!(entry && Object.prototype.hasOwnProperty.call(entry, "weight")
        && entry.weight !== undefined
        && entry.weight !== null
        && entry.weight !== "");
}

function resolveRetrieveLostBoxWeight(entry, index) {
    if (!boxLocationHasExplicitWeight(entry)) {
        return 1;
    }
    let w = entry.weight;
    if (typeof w !== "number" || !Number.isFinite(w) || w <= 0) {
        throw new Error(
            `TrialGenerator: retrieve_lost_box box_locations[${index}] weight must be a positive finite number ` +
            `(got ${JSON.stringify(w)}).`
        );
    }
    return w;
}

function annotateRetrieveLostBoxPool(locs) {
    let entries = locs.map((e, i) => {
        let weight = resolveRetrieveLostBoxWeight(e, i);
        return {
            label: (e.label !== undefined && e.label !== null && e.label !== "") ? e.label : null,
            Fennimal_finding_box: e.Fennimal_finding_box,
            target_box: e.target_box,
            weight
        };
    });
    let pool_weight_sum = entries.reduce((acc, e) => acc + e.weight, 0);
    entries.forEach((e) => {
        e.weight_proportion = pool_weight_sum > 0 ? e.weight / pool_weight_sum : null;
    });
    return { entries, pool_weight_sum };
}

function pickWeightedIndicesWithoutReplacement(weights, nSample) {
    let remaining = weights.map((w, i) => ({ w, i }));
    let picked = [];
    for (let k = 0; k < nSample; k++) {
        let sum = remaining.reduce((acc, x) => acc + x.w, 0);
        let r = Math.random() * sum;
        let chosen = remaining.length - 1;
        for (let j = 0; j < remaining.length; j++) {
            r -= remaining[j].w;
            if (r < 0) {
                chosen = j;
                break;
            }
        }
        picked.push(remaining[chosen].i);
        remaining.splice(chosen, 1);
    }
    return picked;
}

function serializeBoxLocationWeightTable(annotatedEntries) {
    return annotatedEntries.map((e) => ({
        label: e.label,
        Fennimal_finding_box: e.Fennimal_finding_box,
        target_box: e.target_box,
        weight: e.weight,
        weight_proportion: e.weight_proportion
    }));
}

// ----------------------------------------------------
// 1. DATA CONTROLLER
// ----------------------------------------------------
class DataController {
    constructor(stimuli, attentionCheckController, startTime) {
        this.stimuli = stimuli;
        this.attentionCheckController = attentionCheckController;
        this.startTime = startTime;
        this.attemptDocId = null;
        this.didRestoreAssignment = false;
        this.refreshGuardArmed = false;

        this.experimentData = {
            expCode: this.stimuli.get_experiment_code(),
            startDate: new Date().toString(),
            browser: getBrowser(),
            pid: false,
            sessionId: null,
            attemptDocId: null,
            featureMap: null,
            assignmentRestored: false,
            sessionRestartCount: 0,
            timeStamps: [],
            storedData: [],
            questionnaire: [],
            paymentData: null,
            fennimals: [],
            colorAssignment: null,
            phaseRandomizations: {},
            // Easy-access between-subjects draw for hat_binding_task (also mirrored
            // under phaseRandomizations for Layer 1 refresh restore).
            hatBindingAssignment: null,
            avatar: null,
            attentionData: null,
            totalDuration: 0,
            experimentCompleted: false
        };

        this.paymentInfo = [];
        this.init();
    }

    init() {
        let url = new URL(window.location);
        let pid = url.searchParams.get("PROLIFIC_PID");
        if (pid) {
            this.experimentData.pid = pid.substring(0, 10);
        }

        // Delegated to StimulusTransformer for modularity
        this.experimentData.fennimals = this.stimuli.get_clean_Fennimal_templates();

        // Overview of algorithm-picked toy/box colors (null when flag is off)
        if (typeof this.stimuli.get_color_assignment_overview === "function") {
            this.experimentData.colorAssignment = this.stimuli.get_color_assignment_overview();
        }

        if (typeof this.stimuli.get_feature_map === "function") {
            this.experimentData.featureMap = this.stimuli.get_feature_map();
        }
    }

    getExpFolderName() {
        let expString = Array.isArray(this.experimentData.expCode)
            ? this.experimentData.expCode[0]
            : this.experimentData.expCode;
        return expString || "Default_Experiment";
    }

    /**
     * Layer 1: bind this browser boot to a session claim / attempt doc.
     * On refresh of an incomplete session, restores the same stimulus assignment
     * but restarts progress from the beginning.
     */
    async finalizeSession(earlySession) {
        earlySession = earlySession || { mode: "anonymous" };
        let pid = this.experimentData.pid;
        let folder = this.getExpFolderName();

        if (earlySession.mode === "anonymous" || !pid) {
            this.experimentData.sessionId = earlySession.sessionId || String(this.startTime);
            this.attemptDocId = "NO_PID_" + this.experimentData.sessionId;
            this.experimentData.attemptDocId = this.attemptDocId;
            return;
        }

        if (earlySession.mode === "continue_assignment") {
            this.experimentData.sessionId = earlySession.sessionId;
            this.attemptDocId = earlySession.attemptDocId || (pid + "__" + earlySession.sessionId);
            this.experimentData.attemptDocId = this.attemptDocId;
            this.experimentData.sessionRestartCount = (earlySession.priorRestartCount || 0) + 1;
            this.experimentData.progressResetReason = "layer1_same_assignment_restart";

            if (earlySession.assignment && earlySession.assignment.fennimals
                && typeof this.stimuli.hydrate_assignment === "function") {
                let ok = this.stimuli.hydrate_assignment(
                    earlySession.assignment.fennimals,
                    earlySession.assignment.featureMap,
                    earlySession.assignment.colorAssignment
                );
                if (ok) {
                    this.experimentData.fennimals = this.stimuli.get_clean_Fennimal_templates();
                    this.experimentData.colorAssignment = this.stimuli.get_color_assignment_overview();
                    this.experimentData.featureMap = this.stimuli.get_feature_map();
                    if (earlySession.assignment.phaseRandomizations
                        && typeof earlySession.assignment.phaseRandomizations === "object") {
                        this.experimentData.phaseRandomizations = JSON.parse(
                            JSON.stringify(earlySession.assignment.phaseRandomizations)
                        );
                    }
                    this.experimentData.assignmentRestored = true;
                    this.didRestoreAssignment = true;
                } else {
                    console.warn("Session continue: hydrate failed; keeping fresh randomization in the same attempt doc");
                    this.experimentData.assignmentRestored = false;
                }
            }
        } else {
            // New claim for this PID
            this.experimentData.sessionId = earlySession.sessionId;
            this.attemptDocId = pid + "__" + earlySession.sessionId;
            this.experimentData.attemptDocId = this.attemptDocId;
            this.experimentData.sessionRestartCount = 0;
            this.experimentData.assignmentRestored = false;

            try {
                localStorage.setItem(
                    "fennimals_session_v1_" + pid,
                    JSON.stringify({ expCode: folder, sessionId: earlySession.sessionId })
                );
            } catch (e) { /* ignore */ }
        }

        if (!this.experimentData.featureMap && typeof this.stimuli.get_feature_map === "function") {
            this.experimentData.featureMap = this.stimuli.get_feature_map();
        }

        // Clear in-memory progress for assignment-restore restarts (Layer 1).
        // First Firebase save replaces storedData on the attempt doc.
        this.experimentData.storedData = [];
        this.experimentData.questionnaire = [];
        this.experimentData.paymentData = null;
        this.experimentData.experimentCompleted = false;
        this.paymentInfo = [];

        await this.writeSessionClaim(false);
        await this.storeAllData(false);
    }

    async writeSessionClaim(experimentCompleted) {
        if (!this.experimentData.pid || !window.saveToFirebase || !window.SESSION_CLAIM_COLLECTION) {
            return false;
        }

        let payload = {
            pid: this.experimentData.pid,
            expCode: this.getExpFolderName(),
            activeSessionId: this.experimentData.sessionId,
            attemptDocId: this.attemptDocId,
            experimentCompleted: experimentCompleted === true,
            updatedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem(
                "fennimals_session_v1_" + this.experimentData.pid,
                JSON.stringify({
                    expCode: payload.expCode,
                    sessionId: payload.activeSessionId,
                    experimentCompleted: payload.experimentCompleted,
                    sessionRestartCount: this.experimentData.sessionRestartCount || 0,
                    assignment: {
                        fennimals: this.experimentData.fennimals,
                        featureMap: this.experimentData.featureMap,
                        colorAssignment: this.experimentData.colorAssignment,
                        phaseRandomizations: this.experimentData.phaseRandomizations || {}
                    }
                })
            );
        } catch (e) { /* ignore */ }

        return window.saveToFirebase(window.SESSION_CLAIM_COLLECTION, this.experimentData.pid, payload);
    }

    recordConsentGiven() {
        this.experimentData.consentGivenTime = Date.now() - this.startTime;
        this.refreshGuardArmed = true;
    }

    recordTimestamp(eventString) {
        this.experimentData.timeStamps.push({
            type: eventString,
            time: Math.round((Date.now() - this.startTime) / 1000)
        });
    }

    storePhaseData(cleanDataObj) {
        // Deep clone so we don't accidentally mutate the live game state
        let clonedPhaseData = JSON.parse(JSON.stringify(cleanDataObj));

        // Planned trial sequence is recoverable from phase config + templates; drop it from exports
        delete clonedPhaseData.Fennimals_in_phase;

        // DRY Helper: Compares a Fennimal to its template and strips redundancies
        const stripRedundantFennimalData = (fenObj) => {
            if (!fenObj || !fenObj.id) return fenObj;

            let template = this.experimentData.fennimals.find(f => f.id === fenObj.id);
            if (template) {
                for (let key in template) {
                    // We stringify for a safe deep-comparison of nested arrays/objects
                    if (fenObj[key] !== undefined && JSON.stringify(fenObj[key]) === JSON.stringify(template[key])) {
                        delete fenObj[key]; // Redundant! Strip it.
                    }
                }
            }

            // Always strip these internal / redundant fields from stored interaction records
            delete fenObj.search_status;
            delete fenObj.visited;
            delete fenObj.ColorScheme;
            // Phase-level ask-option stamps (and nested fen objects) — keep behavioral deltas only
            delete fenObj.fennimals_asked_objects;
            delete fenObj.fennimals_asked;
            delete fenObj.toys_asked;
            delete fenObj.boxes_asked;
            delete fenObj.ask_toy;
            delete fenObj.ask_box;
            delete fenObj.ask_Fennimal;
            delete fenObj.ask_name;
            delete fenObj.names_asked;

            return fenObj;
        };

        // Apply stripping to the completed interaction records
        if (clonedPhaseData.Data && Array.isArray(clonedPhaseData.Data)) {
            clonedPhaseData.Data = clonedPhaseData.Data.map(stripRedundantFennimalData);
        }

        this.experimentData.storedData.push(clonedPhaseData);
        this.recordTimestamp(clonedPhaseData.type);
        this.storeAllData(false);
    }

    /**
     * Between-subjects box_locations draw for retrieve_lost_box.
     * Restores a prior draw from phaseRandomizations when present (Layer 1 refresh).
     * Unequal weights: n=1 is a weighted choice; n>1 is sequential weighted without replacement.
     */
    getOrCreateBoxLocationSelection(randomizationKey, poolEntries, nSample) {
        if (!this.experimentData.phaseRandomizations
            || typeof this.experimentData.phaseRandomizations !== "object") {
            this.experimentData.phaseRandomizations = {};
        }

        let annotated = annotateRetrieveLostBoxPool(poolEntries);
        let byLabel = new Map(annotated.entries.map((e) => [e.label, e]));

        let existing = this.experimentData.phaseRandomizations[randomizationKey];
        if (existing && Array.isArray(existing.labels) && existing.labels.length > 0) {
            let restoredEntries = [];
            for (let lab of existing.labels) {
                let match = byLabel.get(lab);
                if (!match) {
                    throw new Error(
                        `DataController: restored retrieve_lost_box selection "${randomizationKey}" ` +
                        `has label "${lab}" which is not in the current box_locations pool.`
                    );
                }
                restoredEntries.push({
                    label: match.label,
                    Fennimal_finding_box: match.Fennimal_finding_box,
                    target_box: match.target_box,
                    weight: match.weight,
                    weight_proportion: match.weight_proportion
                });
            }
            return {
                labels: existing.labels.slice(),
                label: restoredEntries.length === 1 ? restoredEntries[0].label : (existing.label || null),
                entries: restoredEntries,
                pool_weight_sum: annotated.pool_weight_sum,
                pool_weights: serializeBoxLocationWeightTable(annotated.entries)
            };
        }

        if (nSample > 1 && annotated.entries.some((e) => e.weight !== 1)) {
            console.warn(
                `TrialGenerator: retrieve_lost_box n_trials_to_sample is ${nSample} (> 1), but some ` +
                `box_locations weights are not 1. Draws use sequential weighted sampling without replacement, ` +
                `so a row's chance of being included is not simply weight/sum. Prefer n_trials_to_sample: 1 ` +
                `when using unequal weights.`
            );
        }

        let weights = annotated.entries.map((e) => e.weight);
        let pickedIdx = pickWeightedIndicesWithoutReplacement(weights, nSample);
        let selected = pickedIdx.map((i) => ({
            label: annotated.entries[i].label,
            Fennimal_finding_box: annotated.entries[i].Fennimal_finding_box,
            target_box: annotated.entries[i].target_box,
            weight: annotated.entries[i].weight,
            weight_proportion: annotated.entries[i].weight_proportion
        }));
        let record = {
            labels: selected.map((e) => e.label),
            label: selected.length === 1 ? selected[0].label : null,
            entries: selected,
            pool_weight_sum: annotated.pool_weight_sum,
            pool_weights: serializeBoxLocationWeightTable(annotated.entries)
        };
        this.experimentData.phaseRandomizations[randomizationKey] = JSON.parse(JSON.stringify(record));
        // Persist immediately so a mid-phase refresh keeps the same between-subjects draw.
        this.storeAllData(false);
        this.writeSessionClaim(false);
        return record;
    }

    /**
     * Between-subjects binding-search condition (pair_based / group_based / control).
     * Restores a prior draw from phaseRandomizations when present.
     * conditionPool is sampled with replacement-style weighting (duplicates raise odds).
     */
    getOrCreateBindingSearchCondition(randomizationKey, conditionPool) {
        if (!this.experimentData.phaseRandomizations
            || typeof this.experimentData.phaseRandomizations !== "object") {
            this.experimentData.phaseRandomizations = {};
        }

        let allowed = ["pair_based", "group_based", "control"];
        let existing = this.experimentData.phaseRandomizations[randomizationKey];
        if (existing && allowed.includes(existing.condition)) {
            if (Array.isArray(conditionPool) && conditionPool.length
                && !conditionPool.includes(existing.condition)) {
                console.warn(
                    `HatBindingTask: restored condition "${existing.condition}" for "${randomizationKey}" ` +
                    `(not in current condition pool so refresh stays consistent).`
                );
            }
            return existing.condition;
        }

        let pool = (Array.isArray(conditionPool) ? conditionPool : []).filter((c) => allowed.includes(c));
        if (!pool.length) {
            throw new Error(
                'HatBindingTask: condition must be a non-empty array of "pair_based" | "group_based" | "control".'
            );
        }
        let condition = pool[Math.floor(Math.random() * pool.length)];
        this.experimentData.phaseRandomizations[randomizationKey] = { condition };
        this.storeAllData(false);
        this.writeSessionClaim(false);
        return condition;
    }

    /**
     * Between-subjects star arm pair for hat_binding_task.
     * Draws 2 arms from armIds (uniform over combinations) and restores on refresh.
     * Two-arm setups persist the only pair without sampling.
     */
    getOrCreateBindingArmPair(randomizationKey, armIds) {
        if (!this.experimentData.phaseRandomizations
            || typeof this.experimentData.phaseRandomizations !== "object") {
            this.experimentData.phaseRandomizations = {};
        }

        let arms = (Array.isArray(armIds) ? armIds : []).map(String);
        if (arms.length < 2) {
            throw new Error("HatBindingTask: arms must be an array of at least 2 Fennimal ids.");
        }

        let combos = [];
        for (let i = 0; i < arms.length; i++) {
            for (let j = i + 1; j < arms.length; j++) {
                combos.push([arms[i], arms[j]]);
            }
        }
        const comboKey = (pair) => pair.slice().sort().join("|");
        let comboKeys = new Set(combos.map(comboKey));

        let existing = this.experimentData.phaseRandomizations[randomizationKey];
        if (existing && Array.isArray(existing.arms) && existing.arms.length === 2) {
            let restored = existing.arms.map(String);
            if (comboKeys.has(comboKey(restored))) {
                return arms.filter((id) => restored.includes(id));
            }
            console.warn(
                `HatBindingTask: restored arm pair "${restored.join(",")}" for "${randomizationKey}" ` +
                `(not in current arms pool so refresh stays consistent).`
            );
            return restored;
        }

        let picked = (arms.length === 2)
            ? arms.slice()
            : combos[Math.floor(Math.random() * combos.length)].slice();
        this.experimentData.phaseRandomizations[randomizationKey] = { arms: picked.slice() };
        this.storeAllData(false);
        this.writeSessionClaim(false);
        return arms.filter((id) => picked.includes(id));
    }

    /**
     * Top-level export of the hat_binding_task between-subjects draw.
     * Analysts can read experimentData.hatBindingAssignment without digging through
     * phaseRandomizations or storedData. Layer 1 refresh still uses phaseRandomizations;
     * this mirror is rewritten whenever the binding phase constructs.
     */
    setHatBindingAssignment(record) {
        if (!record || typeof record !== "object") {
            this.experimentData.hatBindingAssignment = null;
            return null;
        }
        let prev = this.experimentData.hatBindingAssignment;
        let assignment = {
            condition: record.condition || null,
            selected_arms: Array.isArray(record.selected_arms) ? record.selected_arms.slice() : [],
            selected_triad: Array.isArray(record.selected_triad) ? record.selected_triad.slice() : [],
            hub: record.hub != null ? record.hub : null,
            fillers: Array.isArray(record.fillers) ? record.fillers.slice() : [],
            all_arms: Array.isArray(record.all_arms) ? record.all_arms.slice() : [],
            // Name-recall freebie. Binding reconstructs this object without these
            // fields; keep a prior pick unless the caller is explicitly setting them.
            starter_name_id: Object.prototype.hasOwnProperty.call(record, "starter_name_id")
                ? (record.starter_name_id != null ? record.starter_name_id : null)
                : (prev && prev.starter_name_id != null ? prev.starter_name_id : null),
            starter_name: Object.prototype.hasOwnProperty.call(record, "starter_name")
                ? (record.starter_name != null ? record.starter_name : null)
                : (prev && prev.starter_name != null ? prev.starter_name : null)
        };
        this.experimentData.hatBindingAssignment = assignment;
        this.storeAllData(false);
        this.writeSessionClaim(false);
        return assignment;
    }

    /**
     * Patch the name-recall freebie onto hatBindingAssignment (same top-level
     * export as the binding between-subjects draw). No-op if binding never ran.
     */
    setNameRecallStarter(id, name) {
        let prev = this.experimentData.hatBindingAssignment;
        if (!prev || typeof prev !== "object") return null;
        return this.setHatBindingAssignment({
            condition: prev.condition,
            selected_arms: prev.selected_arms,
            selected_triad: prev.selected_triad,
            hub: prev.hub,
            fillers: prev.fillers,
            all_arms: prev.all_arms,
            starter_name_id: id != null ? id : null,
            starter_name: name != null ? name : null
        });
    }

    /**
     * Persists which spoke is named in the name_recall_task prompt.
     * Restores the same id on Layer 1 refresh so the starter name does not re-roll.
     */
    getOrCreateNameRecallStarterArm(randomizationKey, candidateIds) {
        if (!this.experimentData.phaseRandomizations
            || typeof this.experimentData.phaseRandomizations !== "object") {
            this.experimentData.phaseRandomizations = {};
        }

        let pool = (Array.isArray(candidateIds) ? candidateIds : []).map(String).filter(Boolean);
        let existing = this.experimentData.phaseRandomizations[randomizationKey];
        if (existing && existing.id != null && String(existing.id) !== "") {
            let restored = String(existing.id);
            if (!pool.includes(restored)) {
                console.warn(
                    `NameRecall: restored starter arm "${restored}" for "${randomizationKey}" ` +
                    `(not in current candidate pool so refresh stays consistent).`
                );
            }
            return restored;
        }

        if (!pool.length) return null;
        let picked = pool[Math.floor(Math.random() * pool.length)];
        this.experimentData.phaseRandomizations[randomizationKey] = { id: picked };
        this.storeAllData(false);
        this.writeSessionClaim(false);
        return picked;
    }

    storeAllData(bool_experiment_completed) {
        console.log("Storing data...");

        if (bool_experiment_completed === true) {
            this.experimentData.experimentCompleted = true;
            this.refreshGuardArmed = false;
        }

        // FIX 4: Actively sync duration and attention checks on every partial save!
        this.experimentData.totalDuration = Math.round((Date.now() - this.startTime) / 1000);
        if (this.attentionCheckController) {
            this.experimentData.attentionData = this.attentionCheckController.get_attention_rep();
        }

        let folder_name = this.getExpFolderName();
        let doc_name = this.attemptDocId
            || (this.experimentData.pid
                ? (this.experimentData.pid + "__" + (this.experimentData.sessionId || this.startTime))
                : ("NO_PID_" + this.startTime));

        this.experimentData.attemptDocId = doc_name;

        let savePromise = window.saveToFirebase
            ? window.saveToFirebase(folder_name, doc_name, this.experimentData)
            : Promise.resolve(true);

        if (bool_experiment_completed === true && this.experimentData.pid) {
            return Promise.resolve(savePromise).then(() => this.writeSessionClaim(true));
        }
        return savePromise;
    }

    storeCardDataWhenIncludedInGeneralInstructions(cardData) {
        this.experimentData.cardTaskData = JSON.parse(JSON.stringify(cardData));
    }

    storeQuestionnaireData(questionnaireAnswerObj) {
        this.experimentData.questionnaire.push(JSON.parse(JSON.stringify(questionnaireAnswerObj)));
    }

    storeCustomIconData(worldState) {
        let playerData = worldState.get_player_icon_settings();
        let partnerData = worldState.get_partner_icon_settings();
        delete playerData.scale_factor;
        delete partnerData.scale_factor;
        this.experimentData.avatar = { player: playerData, partner: partnerData };
    }

    recordStarsEarned(dayNum, phaseType, starsEarned, maximumPossibleStars) {
        this.paymentInfo.push({
            day: dayNum,
            dayType: phaseType,
            starsEarned: starsEarned,
            maximumPossibleStars: maximumPossibleStars
        });
    }

    getPaymentData() {
        let totalStars = this.paymentInfo.reduce((sum, phase) => sum + phase.starsEarned, 0);

        // FIX: Calculate total maximum possible stars dynamically based on the recorded cards
        let totalMaxStars = this.paymentInfo.reduce((sum, phase) => sum + phase.maximumPossibleStars, 0);

        this.experimentData.paymentData = {
            phases: [...this.paymentInfo, {
                dayType: "summary",
                starsEarned: totalStars,
                maximumPossibleStars: totalMaxStars // FIX: Use the calculated total instead of the static estimate
            }],
            totalStars: totalStars
        };

        let ccWord1 = shuffleArray(["Happy", "Bright", "Clean", "Soft", "Warm", "Kind", "Sweet"])[0];
        let ccWord2 = shuffleArray(["Cat", "Rabbit", "Owl", "Fox", "Koala", "Frog", "Panda"])[0];
        this.experimentData.paymentData.completionCode = ccWord1 + ccWord2 + totalStars;

        this.experimentData.totalDuration = Math.round((Date.now() - this.startTime) / 1000);
        this.experimentData.attentionData = this.attentionCheckController.get_attention_rep();

        // Copy to the hidden form
        let formField = document.getElementById("data_form_field");
        if (formField) formField.innerHTML = JSON.stringify(this.experimentData);

        return JSON.parse(JSON.stringify(this.experimentData.paymentData));
    }

    getCompletionCode() {
        return this.experimentData.paymentData.completionCode;
    }
}


// ----------------------------------------------------
// 2. TRIAL GENERATOR (Decoupled Phase Logic)
// ----------------------------------------------------
// ----------------------------------------------------
// 2. TRIAL GENERATOR (Decoupled Phase Logic)
// ----------------------------------------------------
// ----------------------------------------------------
// 2. TRIAL GENERATOR (Decoupled Phase Logic)
// ----------------------------------------------------
class TrialGenerator {
    constructor(stimuli, dataCont = null) {
        this.stimuli = stimuli;
        this.dataCont = dataCont;
    }

    generateTrialsForPhase(phaseData) {
        if (phaseData && phaseData.type === "retrieve_lost_box") {
            phaseData.interaction_type = "retrieve_lost_box";
            phaseData.include_Fennefinder = true;
        }

        this.validatePhaseTrialSpec(phaseData);

        let mainTrials;
        let orthogonalTrials = [];

        if (Array.isArray(phaseData.trial_subblocks)) {
            // Ordered subblocks: shuffle within each, then concatenate (preserves subblock order).
            mainTrials = this.generateTrialsFromSubblocks(phaseData);
        } else if (phaseData.type === "retrieve_lost_box"
            && Array.isArray(phaseData.box_locations)
            && phaseData.box_locations.length > 0) {
            mainTrials = this.generateRetrieveLostBoxTrialsFromBoxLocations(phaseData);
        } else if (this.isPartnerBeliefInSituOnlyInteraction(phaseData.interaction_type)
            && Array.isArray(phaseData.target_boxes)
            && phaseData.target_boxes.length > 0) {
            mainTrials = this.generatePartnerBeliefInSituTrials(
                phaseData.target_boxes,
                phaseData,
                `phase type "${phaseData.type}" top-level target_boxes`
            );
        } else {
            mainTrials = this.generateCartesianMainTrials(
                phaseData.Fennimals_encountered,
                phaseData.interaction_type,
                phaseData
            );

            if (phaseData.included_orthogonal_tasks) {
                orthogonalTrials = this.getOrthogonalTaskTrials(phaseData);
            }
        }

        // Stamp block-level ask_toy / ask_box / ask_Fennimal / ask_name onto every trial in the block (main + orthogonal).
        mainTrials = this.applyAskToySettingsToTrials(mainTrials, phaseData);
        orthogonalTrials = this.applyAskToySettingsToTrials(orthogonalTrials, phaseData);
        mainTrials = this.applyAskBoxSettingsToTrials(mainTrials, phaseData);
        orthogonalTrials = this.applyAskBoxSettingsToTrials(orthogonalTrials, phaseData);
        mainTrials = this.applyAskFennimalSettingsToTrials(mainTrials, phaseData);
        orthogonalTrials = this.applyAskFennimalSettingsToTrials(orthogonalTrials, phaseData);
        mainTrials = this.applyAskNameSettingsToTrials(mainTrials, phaseData);
        orthogonalTrials = this.applyAskNameSettingsToTrials(orthogonalTrials, phaseData);
        mainTrials = this.applyAskHatSettingsToTrials(mainTrials, phaseData);
        orthogonalTrials = this.applyAskHatSettingsToTrials(orthogonalTrials, phaseData);
        mainTrials = this.applyIntroduceNameOnPolaroidToTrials(mainTrials, phaseData);
        orthogonalTrials = this.applyIntroduceNameOnPolaroidToTrials(orthogonalTrials, phaseData);
        mainTrials = this.stripAskFlagsForSpecialRoles(mainTrials);
        orthogonalTrials = this.stripAskFlagsForSpecialRoles(orthogonalTrials);
        mainTrials = this.applyPlacementQuizOptionsToTrials(mainTrials, phaseData);
        orthogonalTrials = this.applyPlacementQuizOptionsToTrials(orthogonalTrials, phaseData);
        mainTrials = this.applySwitchBoxWithoutPartnerSettingsToTrials(mainTrials);
        orthogonalTrials = this.applySwitchBoxWithoutPartnerSettingsToTrials(orthogonalTrials);
        mainTrials = this.applyHideAndSeekFennimalPartnerDefault(mainTrials, phaseData);
        orthogonalTrials = this.applyHideAndSeekFennimalPartnerDefault(orthogonalTrials, phaseData);
        mainTrials = this.applyHatLaundryHatsToTrials(mainTrials);
        orthogonalTrials = this.applyHatLaundryHatsToTrials(orthogonalTrials);

        mainTrials = this.applyPartnerBeliefInSituLureCycles(mainTrials, phaseData);
        orthogonalTrials = this.applyPartnerBeliefInSituLureCycles(orthogonalTrials, phaseData);

        if (phaseData.type === "retrieve_lost_box") {
            mainTrials = this.applyRetrieveLostBoxPhaseFlags(mainTrials, phaseData);
            orthogonalTrials = this.applyRetrieveLostBoxPhaseFlags(orthogonalTrials, phaseData);
        }

        if (Array.isArray(phaseData.trial_subblocks)) {
            // Subblock order is intentional; do not re-shuffle across subblock boundaries.
            return mainTrials;
        }

        return this.smartShuffleTrials(mainTrials, orthogonalTrials);
    }

    isPartnerBeliefInSituOnlyInteraction(interactionType) {
        let types = Array.isArray(interactionType) ? interactionType : [interactionType];
        return types.length === 1 && types[0] === "partner_belief_in_situ";
    }

    /**
     * Fail loud on ambiguous / conflicting trial specs so experiment setup mistakes are obvious in testing.
     */
    validatePhaseTrialSpec(phaseData) {
        let hasSubblocks = Array.isArray(phaseData.trial_subblocks);
        let hasTopLevelFennimals = phaseData.Fennimals_encountered !== undefined && phaseData.Fennimals_encountered !== null;
        let hasTopLevelInteractionType = phaseData.interaction_type !== undefined && phaseData.interaction_type !== null;
        let hasBoxLocations = Array.isArray(phaseData.box_locations) && phaseData.box_locations.length > 0;

        if (hasBoxLocations && phaseData.type !== "retrieve_lost_box") {
            throw new Error(
                `TrialGenerator: phase type "${phaseData.type}" sets box_locations, which is only allowed ` +
                `on retrieve_lost_box phases.`
            );
        }

        if (hasSubblocks) {
            if (phaseData.trial_subblocks.length === 0) {
                throw new Error(
                    `TrialGenerator: phase type "${phaseData.type}" has trial_subblocks as an empty array. ` +
                    `Remove trial_subblocks or add at least one subblock.`
                );
            }

            if (hasTopLevelFennimals) {
                throw new Error(
                    `TrialGenerator: phase type "${phaseData.type}" sets both trial_subblocks and top-level Fennimals_encountered. ` +
                    `Use one or the other — when trial_subblocks is present, put Fennimals only inside each subblock.`
                );
            }

            if (hasBoxLocations) {
                throw new Error(
                    `TrialGenerator: phase type "${phaseData.type}" sets both trial_subblocks and box_locations. ` +
                    `Use one or the other.`
                );
            }

            if (hasTopLevelInteractionType) {
                throw new Error(
                    `TrialGenerator: phase type "${phaseData.type}" sets both trial_subblocks and top-level interaction_type. ` +
                    `Use one or the other — when trial_subblocks is present, put interaction_type only inside each subblock (or on each explicit trial).`
                );
            }

            if (phaseData.included_orthogonal_tasks) {
                throw new Error(
                    `TrialGenerator: phase type "${phaseData.type}" sets both trial_subblocks and included_orthogonal_tasks. ` +
                    `Orthogonal mixing across ordered subblocks is not supported — remove one of these fields.`
                );
            }

            phaseData.trial_subblocks.forEach((subblock, index) => {
                this.validateSubblockSpec(subblock, index, phaseData.type);
            });
            return;
        }

        if (hasBoxLocations && hasTopLevelFennimals) {
            throw new Error(
                `TrialGenerator: phase type "${phaseData.type}" sets both Fennimals_encountered and box_locations. ` +
                `Use one or the other — box_locations already names the Fennimal per trial via Fennimal_finding_box.`
            );
        }

        if (hasBoxLocations) {
            this.validateRetrieveLostBoxLocations(phaseData);
            return;
        }

        if (!hasTopLevelFennimals) {
            let allowsTargetBoxes = this.isPartnerBeliefInSituOnlyInteraction(phaseData.interaction_type)
                && Array.isArray(phaseData.target_boxes)
                && phaseData.target_boxes.length > 0;
            if (!allowsTargetBoxes) {
                throw new Error(
                    `TrialGenerator: phase type "${phaseData.type}" is missing Fennimals_encountered ` +
                    `(and has no trial_subblocks). For partner_belief_in_situ, provide target_boxes instead. ` +
                    `For retrieve_lost_box, provide Fennimals_encountered or box_locations.`
                );
            }
        }

        if (!hasTopLevelInteractionType) {
            throw new Error(
                `TrialGenerator: phase type "${phaseData.type}" is missing interaction_type ` +
                `(and has no trial_subblocks).`
            );
        }
    }

    /**
     * Fail loud on malformed retrieve_lost_box box_locations entries.
     * Each entry: { Fennimal_finding_box, target_box, label?, weight? }.
     * Rows must be unique (finder + label). Omitted weight defaults to 1.
     * When n_trials_to_sample is unset, every row runs — weight must be omitted or 1.
     * When n_trials_to_sample is set, every entry must have a unique label.
     */
    validateRetrieveLostBoxLocations(phaseData) {
        let locs = phaseData.box_locations;
        if (!Array.isArray(locs) || locs.length === 0) {
            throw new Error(
                `TrialGenerator: retrieve_lost_box box_locations must be a non-empty array.`
            );
        }

        let nSample = phaseData.n_trials_to_sample;
        let sampling = nSample !== undefined && nSample !== null;
        if (sampling) {
            if (!Number.isInteger(nSample) || nSample < 1) {
                throw new Error(
                    `TrialGenerator: retrieve_lost_box n_trials_to_sample must be a positive integer ` +
                    `(got ${JSON.stringify(nSample)}).`
                );
            }
            if (nSample > locs.length) {
                throw new Error(
                    `TrialGenerator: retrieve_lost_box n_trials_to_sample (${nSample}) exceeds ` +
                    `box_locations length (${locs.length}).`
                );
            }
        }

        let seenFindingIds = new Set();
        let seenLabels = new Set();
        locs.forEach((entry, index) => {
            if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
                throw new Error(
                    `TrialGenerator: retrieve_lost_box box_locations[${index}] must be an object ` +
                    `with Fennimal_finding_box and target_box.`
                );
            }
            if (entry.Fennimal_finding_box === undefined || entry.Fennimal_finding_box === null || entry.Fennimal_finding_box === "") {
                throw new Error(
                    `TrialGenerator: retrieve_lost_box box_locations[${index}] is missing Fennimal_finding_box.`
                );
            }
            if (entry.target_box === undefined || entry.target_box === null || entry.target_box === "") {
                throw new Error(
                    `TrialGenerator: retrieve_lost_box box_locations[${index}] is missing target_box.`
                );
            }
            if (seenFindingIds.has(entry.Fennimal_finding_box)) {
                throw new Error(
                    `TrialGenerator: retrieve_lost_box box_locations repeats Fennimal_finding_box ` +
                    `"${entry.Fennimal_finding_box}" — each finding Fennimal can appear only once ` +
                    `(map locations are unique per Fennimal).`
                );
            }
            seenFindingIds.add(entry.Fennimal_finding_box);

            let hasLabel = entry.label !== undefined && entry.label !== null && entry.label !== "";
            if (sampling && !hasLabel) {
                throw new Error(
                    `TrialGenerator: retrieve_lost_box box_locations[${index}] is missing required ` +
                    `"label" (needed when n_trials_to_sample is set).`
                );
            }
            if (hasLabel) {
                if (seenLabels.has(entry.label)) {
                    throw new Error(
                        `TrialGenerator: retrieve_lost_box box_locations repeats label ` +
                        `"${entry.label}" — labels must be unique.`
                    );
                }
                seenLabels.add(entry.label);
            }

            let weight = resolveRetrieveLostBoxWeight(entry, index);
            if (!sampling && boxLocationHasExplicitWeight(entry) && weight !== 1) {
                throw new Error(
                    `TrialGenerator: retrieve_lost_box box_locations[${index}] has weight ${weight}, ` +
                    `but n_trials_to_sample is not set (every location already runs). ` +
                    `Omit weight or set it to 1, or set n_trials_to_sample to subsample.`
                );
            }
        });
    }

    /**
     * Between-subjects draw from box_locations when n_trials_to_sample is set.
     * Stamps selected_box_location_label(s) / selected_box_locations onto phaseData for export,
     * including weight and weight_proportion (weight / pool sum) for every pool row and the draw.
     */
    applyRetrieveLostBoxSampling(phaseData) {
        if (!Array.isArray(phaseData.box_locations) || phaseData.box_locations.length === 0) {
            return phaseData.box_locations || [];
        }

        let nSample = phaseData.n_trials_to_sample;
        if (nSample === undefined || nSample === null) {
            // No sampling: run all options; still expose labels and default weights.
            let annotated = annotateRetrieveLostBoxPool(phaseData.box_locations);
            let labels = annotated.entries
                .map((e) => e.label)
                .filter((lab) => lab !== undefined && lab !== null && lab !== "");
            if (labels.length > 0) {
                phaseData.selected_box_location_labels = labels.slice();
                phaseData.selected_box_location_label = labels.length === 1 ? labels[0] : null;
            }
            phaseData.selected_box_locations = serializeBoxLocationWeightTable(annotated.entries);
            phaseData.box_location_pool_weight_sum = annotated.pool_weight_sum;
            phaseData.box_location_pool_weights = serializeBoxLocationWeightTable(annotated.entries);
            return phaseData.box_locations.map((entry, i) => Object.assign({}, entry, {
                weight: annotated.entries[i].weight,
                weight_proportion: annotated.entries[i].weight_proportion
            }));
        }

        if (!this.dataCont || typeof this.dataCont.getOrCreateBoxLocationSelection !== "function") {
            throw new Error(
                `TrialGenerator: retrieve_lost_box n_trials_to_sample requires DataController ` +
                `for between-subjects persistence.`
            );
        }

        let key = phaseData.randomization_id
            || `retrieve_lost_box__${phaseData.phasenum != null ? phaseData.phasenum : "unknown"}`;
        let record = this.dataCont.getOrCreateBoxLocationSelection(
            key,
            phaseData.box_locations,
            nSample
        );

        phaseData.randomization_key = key;
        phaseData.selected_box_location_labels = record.labels.slice();
        phaseData.selected_box_location_label = record.label;
        phaseData.selected_box_locations = record.entries.map((e) => ({ ...e }));
        phaseData.box_location_pool_weight_sum = record.pool_weight_sum;
        phaseData.box_location_pool_weights = (record.pool_weights || []).map((e) => ({ ...e }));
        // Convenient alias for the main between-subjects manipulation.
        phaseData.manipulation_label = record.label;

        // Preserve draw order (do not re-filter the pool, which would restore spec order).
        let byLabel = new Map(phaseData.box_locations.map((e) => [e.label, e]));
        return record.entries.map((selected) => {
            let match = byLabel.get(selected.label);
            if (!match) {
                throw new Error(
                    `TrialGenerator: retrieve_lost_box selected label "${selected.label}" ` +
                    `is not in box_locations.`
                );
            }
            return Object.assign({}, match, {
                weight: selected.weight,
                weight_proportion: selected.weight_proportion
            });
        });
    }

    validateSubblockSpec(subblock, index, phaseType) {
        if (!subblock || typeof subblock !== "object" || Array.isArray(subblock)) {
            throw new Error(
                `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}] must be an object.`
            );
        }

        let hasTrials = Array.isArray(subblock.trials);
        let hasCartesianFennimals = subblock.Fennimals_encountered !== undefined && subblock.Fennimals_encountered !== null;
        let hasCartesianInteraction = subblock.interaction_type !== undefined && subblock.interaction_type !== null;
        let hasTargetBoxes = Array.isArray(subblock.target_boxes) && subblock.target_boxes.length > 0;

        if (hasTrials && (hasCartesianFennimals || hasCartesianInteraction || hasTargetBoxes)) {
            throw new Error(
                `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}] mixes explicit trials with ` +
                `Fennimals_encountered / interaction_type / target_boxes. Use either a cartesian subblock ` +
                `({ Fennimals_encountered, interaction_type } or { target_boxes, interaction_type: "partner_belief_in_situ" }) ` +
                `OR an explicit list ({ trials: [...] }), not both.`
            );
        }

        if (hasTrials) {
            if (subblock.trials.length === 0) {
                throw new Error(
                    `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].trials is empty.`
                );
            }
            subblock.trials.forEach((trialSpec, trialIndex) => {
                if (!trialSpec || typeof trialSpec !== "object") {
                    throw new Error(
                        `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].trials[${trialIndex}] must be an object.`
                    );
                }
                if (trialSpec.interaction_type === undefined || trialSpec.interaction_type === null) {
                    throw new Error(
                        `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].trials[${trialIndex}] ` +
                        `is missing required field "interaction_type".`
                    );
                }

                let isBoxRoom = trialSpec.interaction_type === "box_room";
                let isBeliefInSitu = trialSpec.interaction_type === "partner_belief_in_situ";
                let hasSingle = trialSpec.Fennimal !== undefined && trialSpec.Fennimal !== null;
                let hasMulti = Array.isArray(trialSpec.Fennimals) && trialSpec.Fennimals.length > 0;
                let hasTargetBox = trialSpec.target_box !== undefined && trialSpec.target_box !== null;

                if (isBeliefInSitu) {
                    if (!hasTargetBox) {
                        throw new Error(
                            `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].trials[${trialIndex}] ` +
                            `is partner_belief_in_situ and must define "target_box".`
                        );
                    }
                    if (hasSingle || hasMulti) {
                        throw new Error(
                            `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].trials[${trialIndex}] ` +
                            `is partner_belief_in_situ and must not set "Fennimal" / "Fennimals" ` +
                            `(scene Fennimal is resolved from WorldState box contents).`
                        );
                    }
                } else if (isBoxRoom) {
                    if (!hasSingle && !hasMulti) {
                        throw new Error(
                            `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].trials[${trialIndex}] ` +
                            `is box_room and must define "Fennimal" or non-empty "Fennimals".`
                        );
                    }
                    if (hasSingle && hasMulti) {
                        throw new Error(
                            `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].trials[${trialIndex}] ` +
                            `is box_room and sets both "Fennimal" and "Fennimals". Use one or the other.`
                        );
                    }
                } else {
                    if (!hasSingle) {
                        throw new Error(
                            `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].trials[${trialIndex}] ` +
                            `is missing required field "Fennimal".`
                        );
                    }
                    if (hasMulti) {
                        throw new Error(
                            `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].trials[${trialIndex}] ` +
                            `sets "Fennimals", which is only allowed for interaction_type "box_room".`
                        );
                    }
                    if (hasTargetBox) {
                        throw new Error(
                            `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].trials[${trialIndex}] ` +
                            `sets "target_box", which is only allowed for interaction_type "partner_belief_in_situ".`
                        );
                    }
                }
            });
            return;
        }

        if (hasTargetBoxes) {
            if (hasCartesianFennimals) {
                throw new Error(
                    `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}] sets both target_boxes and ` +
                    `Fennimals_encountered. For partner_belief_in_situ use target_boxes only.`
                );
            }
            if (!hasCartesianInteraction || !this.isPartnerBeliefInSituOnlyInteraction(subblock.interaction_type)) {
                throw new Error(
                    `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}] sets target_boxes but ` +
                    `interaction_type must be exactly "partner_belief_in_situ".`
                );
            }
            return;
        }

        if (!hasCartesianFennimals || !hasCartesianInteraction) {
            throw new Error(
                `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}] must define either ` +
                `"trials: [...]" OR both "Fennimals_encountered" and "interaction_type" ` +
                `OR both "target_boxes" and interaction_type "partner_belief_in_situ".`
            );
        }

        if (!Array.isArray(subblock.Fennimals_encountered) || subblock.Fennimals_encountered.length === 0) {
            throw new Error(
                `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].Fennimals_encountered ` +
                `must be a non-empty array.`
            );
        }
    }

    /**
     * Fail loud at experiment boot so a broken structure cannot pass a "does it load" test
     * and then crash on a later phase. Checks sampling specs, Fennimal ids, feature codes,
     * phase types, and interaction types. Does not generate trials (no randomization / WorldState).
     */
    validateExperimentStructure(structure) {
        let expCode = this.stimuli && typeof this.stimuli.get_experiment_code === "function"
            ? this.stimuli.get_experiment_code()
            : "?";
        let errors = [];

        if (!Array.isArray(structure) || structure.length === 0) {
            throw new Error(
                `StimulusSpec: Experiment_Structure is missing or empty for experiment code "${expCode}". ` +
                `Check Experiment_Code against All_Experiment_Structures.`
            );
        }

        let knownIds = (this.stimuli && typeof this.stimuli.get_all_Fennimal_ids_in_experiment === "function")
            ? this.stimuli.get_all_Fennimal_ids_in_experiment()
            : [];
        let knownIdSet = new Set(knownIds);
        if (knownIdSet.size === 0) {
            throw new Error(
                `StimulusSpec: Fennimal set is empty for experiment code "${expCode}". ` +
                `Check Experiment_Code against All_Fennimal_Sets.`
            );
        }

        let knownPhaseTypes = this.getKnownPhaseTypes();
        let trialBasedTypes = this.getTrialBasedPhaseTypes();
        let knownInteractions = this.getKnownInteractionTypes();

        structure.forEach((phase, index) => {
            let label = `phase ${index + 1}`;
            if (!phase || typeof phase !== "object" || Array.isArray(phase)) {
                errors.push(`${label} must be an object with a type.`);
                return;
            }
            label = `phase ${index + 1} (type "${phase.type}")`;

            if (phase.type === undefined || phase.type === null || phase.type === "") {
                errors.push(`phase ${index + 1} is missing type.`);
            } else if (!knownPhaseTypes.has(phase.type)) {
                errors.push(
                    `${label} has unknown type "${phase.type}". Known types: ${[...knownPhaseTypes].join(", ")}.`
                );
            }

            if (phase.box_locations !== undefined && phase.type !== "retrieve_lost_box") {
                errors.push(`${label} sets box_locations, which is only allowed on retrieve_lost_box.`);
            }
            if (phase.n_trials_to_sample !== undefined && phase.type !== "retrieve_lost_box") {
                errors.push(`${label} sets n_trials_to_sample, which is only allowed on retrieve_lost_box.`);
            }

            if (phase.type === "hat_binding_task") {
                if (!phase.hub) {
                    errors.push(`${label} requires hub: a Fennimal id.`);
                }
                if (!Array.isArray(phase.arms) || phase.arms.length < 2) {
                    errors.push(`${label} requires arms: an array of at least 2 Fennimal ids.`);
                } else {
                    let armSet = new Set(phase.arms);
                    if (armSet.size !== phase.arms.length) {
                        errors.push(`${label} arms must not contain duplicates.`);
                    }
                    if (phase.hub && phase.arms.includes(phase.hub)) {
                        errors.push(`${label} hub "${phase.hub}" must not also appear in arms.`);
                    }
                }
                if (phase.fillers !== undefined && !Array.isArray(phase.fillers)) {
                    errors.push(`${label} fillers must be an array of Fennimal ids when set.`);
                }
                if (phase.binding_trials !== undefined && !Array.isArray(phase.binding_trials)) {
                    errors.push(`${label} binding_trials must be an array when set.`);
                }
                if (!Array.isArray(phase.blocks) || phase.blocks.length === 0) {
                    errors.push(`${label} requires a non-empty blocks array.`);
                }
                let allowedBinding = ["pair_based", "group_based", "control"];
                if (!Array.isArray(phase.condition) || phase.condition.length === 0) {
                    errors.push(
                        `${label} requires condition: a non-empty array of "pair_based" | "group_based" | "control".`
                    );
                } else {
                    phase.condition.forEach((c, i) => {
                        if (!allowedBinding.includes(c)) {
                            errors.push(
                                `${label} condition[${i}] must be "pair_based", "group_based", or "control" (got "${c}").`
                            );
                        }
                    });
                    if (Array.isArray(phase.binding_trials) && phase.binding_trials.length) {
                        let uniqueConditions = [...new Set(phase.condition.filter((c) => allowedBinding.includes(c)))];
                        uniqueConditions.forEach((cond) => {
                            let n = phase.binding_trials.filter((trial) => {
                                if (!trial) return false;
                                if (Array.isArray(trial.conditions) && trial.conditions.length
                                    && !trial.conditions.includes(cond)) {
                                    return false;
                                }
                                let hasNested = !!(trial.pair_based || trial.group_based || trial.control);
                                if (hasNested && !trial[cond] && (trial.cue == null || trial.cue === "")) {
                                    return false;
                                }
                                return true;
                            }).length;
                            if (n === 0) {
                                errors.push(`${label} has no binding_trials for condition "${cond}".`);
                            }
                        });
                    }
                }
            }

            if (phase.type === "name_recall_task") {
                if (phase.seed_recall_with_arm_name !== undefined
                    && typeof phase.seed_recall_with_arm_name !== "boolean") {
                    errors.push(`${label} seed_recall_with_arm_name must be true or false when set.`);
                }
            }

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

            if (phase.type === "morph_task") {
                if (!Array.isArray(phase.names_options) || phase.names_options.length === 0) {
                    errors.push(`${label} names_options is required (non-empty Fennimal ids) for morph_task.`);
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

            if (phase.type === "Fennimal_attribute_sorting_task" && phase.on_fail) {
                if (!phase.on_fail || typeof phase.on_fail !== "object" || Array.isArray(phase.on_fail)) {
                    errors.push(`${label} on_fail must be an object.`);
                } else {
                    let failType = phase.on_fail.type || "phone_room";
                    if (failType !== "phone_room") {
                        errors.push(`${label} on_fail.type must be "phone_room" (got "${failType}").`);
                    }
                    if (phase.on_fail.interaction_type === undefined || phase.on_fail.interaction_type === null || phase.on_fail.interaction_type === "") {
                        errors.push(`${label} on_fail.interaction_type is required.`);
                    }
                    if (phase.pass_if_errors_at_most !== undefined
                        && (typeof phase.pass_if_errors_at_most !== "number" || phase.pass_if_errors_at_most < 0)) {
                        errors.push(`${label} pass_if_errors_at_most must be a non-negative number.`);
                    }
                    if (phase.max_attempts !== undefined
                        && (typeof phase.max_attempts !== "number" || phase.max_attempts < 1)) {
                        errors.push(`${label} max_attempts must be a positive number.`);
                    }
                    try {
                        let failSpec = JSON.parse(JSON.stringify(phase.on_fail));
                        failSpec.type = failType;
                        failSpec.Fennimals_encountered = failSpec.Fennimals_encountered
                            || failSpec.Fennimals_asked
                            || phase.Fennimals_asked
                            || phase.Fennimals_encountered;
                        this.validatePhaseTrialSpec(failSpec);
                    } catch (err) {
                        errors.push(`${label} on_fail: ${err && err.message ? err.message : err}`);
                    }
                }
            }

            if (trialBasedTypes.has(phase.type)) {
                try {
                    let clone = JSON.parse(JSON.stringify(phase));
                    if (clone.type === "retrieve_lost_box") {
                        clone.interaction_type = "retrieve_lost_box";
                        clone.include_Fennefinder = true;
                    }
                    this.validatePhaseTrialSpec(clone);
                } catch (err) {
                    errors.push(`${label}: ${err && err.message ? err.message : err}`);
                }
            }

            this.collectFennimalIdRefsFromPhase(phase).forEach((ref) => {
                if (!knownIdSet.has(ref.id)) {
                    errors.push(
                        `${label} ${ref.path} refers to Fennimal "${ref.id}", which is not in the Fennimal set ` +
                        `(${knownIds.join(", ")}).`
                    );
                }
            });

            this.collectFeatureCodeRefsFromPhase(phase).forEach((ref) => {
                let knownCodes = this.getKnownFeatureCodes(ref.type);
                if (!knownCodes.includes(ref.code)) {
                    let listed = knownCodes.length > 0 ? knownCodes.join(", ") : "(none — no Fennimal in this set has that property)";
                    errors.push(
                        `${label} ${ref.path} refers to ${ref.type} code "${ref.code}", which is not in this ` +
                        `experiment's Fennimal set (${listed}).`
                    );
                }
            });

            this.collectInteractionTypeRefsFromPhase(phase).forEach((ref) => {
                if (!knownInteractions.has(ref.type)) {
                    errors.push(
                        `${label} ${ref.path} has unknown interaction_type "${ref.type}".`
                    );
                }
            });
        });

        if (errors.length > 0) {
            throw new Error(
                `StimulusSpec: ${errors.length} problem(s) in experiment "${expCode}" — fix these before running:\n- ` +
                errors.join("\n- ")
            );
        }

        console.log(
            `%c StimulusSpec: structure OK — ${structure.length} phase(s), Fennimals [${knownIds.join(", ")}]`,
            "color:green"
        );
    }

    getKnownPhaseTypes() {
        return new Set([
            "partner_belief",
            "partner_belief_multiple",
            "partner_belief_individual_boxes",
            "free_exploration",
            "retrieve_lost_box",
            "jump_to_trial",
            "hint_and_search",
            "on_call",
            "phone_room",
            "name_recall_task",
            "card_sorting_task",
            "Fennimal_attribute_sorting_task",
            "hat_binding_task",
            "chimera_feature_id",
            "morph_task",
            "morph_task_two_cards",
            "hat_drop_task",
            "hat_drop_gonogo",
            "pseudoday"
        ]);
    }

    getTrialBasedPhaseTypes() {
        return new Set([
            "free_exploration",
            "retrieve_lost_box",
            "jump_to_trial",
            "hint_and_search",
            "on_call",
            "phone_room"
        ]);
    }

    getKnownInteractionTypes() {
        return new Set([
            "fly_swat",
            "fly_swat_extended",
            "hat_blown_away",
            "hat_laundry",
            "hide_and_seek_Fennimal",
            "find_box",
            "find_box_extended",
            "basic_intro",
            "Fennimal_toy",
            "toy_to_box",
            "switch_box_without_partner",
            "toy_to_sack",
            "sack_to_box",
            "box_room",
            "partner_belief_in_situ",
            "photo_box",
            "photo_Fennimal",
            "scan_box_home",
            "scan_box_in_situ",
            "check_box_contents",
            "feed_Fennimal",
            "joint_box_cleaning",
            "joint_box_decoration",
            "retrieve_lost_box",
            "broken_toy_in_box",
            "broken_toy_no_box",
            "dirty_toy",
            "dirty_and_broken_toy"
        ]);
    }

    getKnownFeatureCodes(type) {
        let maps = this.stimuli && typeof this.stimuli.get_Feature_maps === "function"
            ? this.stimuli.get_Feature_maps()
            : null;
        if (!maps || !maps[type] || typeof maps[type] !== "object") return [];
        return Object.keys(maps[type]);
    }

    collectFennimalIdRefsFromPhase(phase) {
        let refs = [];
        const add = (id, path) => {
            if (id === undefined || id === null || id === "" || id === "all") return;
            if (typeof id === "string" && id.charAt(0) === "$") return;
            refs.push({ id: String(id), path });
        };
        const addList = (arr, path) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((id, i) => add(id, `${path}[${i}]`));
        };

        addList(phase.Fennimals_encountered, "Fennimals_encountered");
        addList(phase.Fennimals_asked, "Fennimals_asked");
        if (phase.on_fail) {
            addList(phase.on_fail.Fennimals_encountered, "on_fail.Fennimals_encountered");
            addList(phase.on_fail.Fennimals_asked, "on_fail.Fennimals_asked");
        }
        addList(phase.fennimals_asked, "fennimals_asked");
        addList(phase.displayed_icons, "displayed_icons");
        add(phase.hub, "hub");
        addList(phase.arms, "arms");
        addList(phase.fillers, "fillers");
        addList(phase.searched_triad, "searched_triad");
        addList(phase.unsearched_triad, "unsearched_triad");
        addList(phase.singletons, "singletons");
        addList(phase.names_options, "names_options");
        addList(phase.hats, "hats");
        addList(phase.retraining_fennimals, "retraining_fennimals");

        if (Array.isArray(phase.box_locations)) {
            phase.box_locations.forEach((entry, i) => {
                if (entry) add(entry.Fennimal_finding_box, `box_locations[${i}].Fennimal_finding_box`);
            });
        }

        if (Array.isArray(phase.trial_subblocks)) {
            phase.trial_subblocks.forEach((sb, si) => {
                if (!sb) return;
                addList(sb.Fennimals_encountered, `trial_subblocks[${si}].Fennimals_encountered`);
                if (Array.isArray(sb.trials)) {
                    sb.trials.forEach((t, ti) => {
                        if (!t) return;
                        add(t.Fennimal, `trial_subblocks[${si}].trials[${ti}].Fennimal`);
                        addList(t.Fennimals, `trial_subblocks[${si}].trials[${ti}].Fennimals`);
                    });
                }
            });
        }

        if (Array.isArray(phase.questions)) {
            phase.questions.forEach((q, qi) => {
                if (q) addList(q.fennimals, `questions[${qi}].fennimals`);
            });
        }

        if (Array.isArray(phase.binding_trials)) {
            phase.binding_trials.forEach((trial, ti) => {
                if (!trial) return;
                add(trial.cue, `binding_trials[${ti}].cue`);
                add(trial.target, `binding_trials[${ti}].target`);
                if (trial.pair_based) {
                    add(trial.pair_based.cue, `binding_trials[${ti}].pair_based.cue`);
                    add(trial.pair_based.target, `binding_trials[${ti}].pair_based.target`);
                }
                if (trial.group_based) {
                    add(trial.group_based.cue, `binding_trials[${ti}].group_based.cue`);
                    add(trial.group_based.target, `binding_trials[${ti}].group_based.target`);
                }
                if (trial.control) {
                    add(trial.control.cue, `binding_trials[${ti}].control.cue`);
                    add(trial.control.target, `binding_trials[${ti}].control.target`);
                }
            });
        }

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

        if (phase.type === "morph_task") {
            const walkMorphTrials = (arr, prefix) => {
                if (!Array.isArray(arr)) return;
                let blocked = arr.length > 0 && Array.isArray(arr[0]);
                arr.forEach((entry, i) => {
                    if (blocked) {
                        if (!Array.isArray(entry)) return;
                        entry.forEach((trial, j) => {
                            if (!trial) return;
                            let path = `${prefix}[${i}][${j}]`;
                            add(trial.fenA, `${path}.fenA`);
                            add(trial.fenB, `${path}.fenB`);
                            add(trial.target, `${path}.target`);
                            if (trial.prime && typeof trial.prime === "object" && !Array.isArray(trial.prime)) {
                                ["head", "body", "hat", "toy", "name", "color_scheme"].forEach((key) => {
                                    let v = trial.prime[key];
                                    if (v === undefined || v === null) return;
                                    let s = String(v).trim().toLowerCase();
                                    if (s === "" || s === "none" || s === "null" || s === "neutral") return;
                                    if (key === "color_scheme"
                                        && (s === "gray" || s === "grey" || s === "grayscale" || s === "greyscale")) {
                                        return;
                                    }
                                    add(trial.prime[key], `${path}.prime.${key}`);
                                });
                            }
                        });
                    } else if (!Array.isArray(entry) && entry) {
                        let path = `${prefix}[${i}]`;
                        add(entry.fenA, `${path}.fenA`);
                        add(entry.fenB, `${path}.fenB`);
                        add(entry.target, `${path}.target`);
                        if (entry.prime && typeof entry.prime === "object" && !Array.isArray(entry.prime)) {
                            ["head", "body", "hat", "toy", "name", "color_scheme"].forEach((key) => {
                                let v = entry.prime[key];
                                if (v === undefined || v === null) return;
                                let s = String(v).trim().toLowerCase();
                                if (s === "" || s === "none" || s === "null" || s === "neutral") return;
                                if (key === "color_scheme"
                                    && (s === "gray" || s === "grey" || s === "grayscale" || s === "greyscale")) {
                                    return;
                                }
                                add(entry.prime[key], `${path}.prime.${key}`);
                            });
                        }
                    }
                });
            };
            walkMorphTrials(phase.trials, "trials");
            addList(phase.names_options, "names_options");
        }

        if (Array.isArray(phase.blocks)) {
            phase.blocks.forEach((block, bi) => {
                if (block) addList(block.retraining_fennimals, `blocks[${bi}].retraining_fennimals`);
            });
        }

        return refs;
    }

    collectFeatureCodeRefsFromPhase(phase) {
        let refs = [];
        const add = (type, code, path) => {
            if (code === undefined || code === null || code === "") return;
            refs.push({ type, code, path });
        };
        const addList = (type, arr, path) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((code, i) => add(type, code, `${path}[${i}]`));
        };

        addList("toybox", phase.target_boxes, "target_boxes");
        addList("toybox", phase.gating_boxes, "gating_boxes");
        addList("toybox", phase.toyboxes_asked, "toyboxes_asked");
        addList("toy", phase.action_prediction_toys, "action_prediction_toys");
        addList("toy", phase.toys_asked, "toys_asked");

        if (Array.isArray(phase.box_locations)) {
            phase.box_locations.forEach((entry, i) => {
                if (entry) add("toybox", entry.target_box, `box_locations[${i}].target_box`);
            });
        }

        if (Array.isArray(phase.trial_subblocks)) {
            phase.trial_subblocks.forEach((sb, si) => {
                if (!sb) return;
                addList("toybox", sb.target_boxes, `trial_subblocks[${si}].target_boxes`);
                if (Array.isArray(sb.trials)) {
                    sb.trials.forEach((t, ti) => {
                        if (t) add("toybox", t.target_box, `trial_subblocks[${si}].trials[${ti}].target_box`);
                    });
                }
            });
        }

        if (Array.isArray(phase.questions)) {
            phase.questions.forEach((q, qi) => {
                if (q) add("toybox", q.target_box, `questions[${qi}].target_box`);
            });
        }

        return refs;
    }

    collectInteractionTypeRefsFromPhase(phase) {
        let refs = [];
        const add = (value, path) => {
            if (value === undefined || value === null || value === "") return;
            if (Array.isArray(value)) {
                value.forEach((v, i) => add(v, `${path}[${i}]`));
                return;
            }
            refs.push({ type: value, path });
        };

        add(phase.interaction_type, "interaction_type");
        add(phase.included_orthogonal_tasks, "included_orthogonal_tasks");
        if (phase.on_fail) {
            add(phase.on_fail.interaction_type, "on_fail.interaction_type");
            add(phase.on_fail.included_orthogonal_tasks, "on_fail.included_orthogonal_tasks");
        }
        if (Array.isArray(phase.trial_subblocks)) {
            phase.trial_subblocks.forEach((sb, si) => {
                if (!sb) return;
                add(sb.interaction_type, `trial_subblocks[${si}].interaction_type`);
                if (Array.isArray(sb.trials)) {
                    sb.trials.forEach((t, ti) => {
                        if (t) add(t.interaction_type, `trial_subblocks[${si}].trials[${ti}].interaction_type`);
                    });
                }
            });
        }
        return refs;
    }

    generateTrialsFromSubblocks(phaseData) {
        let allTrials = [];

        phaseData.trial_subblocks.forEach((subblock, subblockIndex) => {
            let subblockTrials;

            if (Array.isArray(subblock.trials)) {
                subblockTrials = this.generateExplicitTrials(subblock.trials, phaseData);
            } else if (Array.isArray(subblock.target_boxes) && subblock.target_boxes.length > 0) {
                subblockTrials = this.generatePartnerBeliefInSituTrials(
                    subblock.target_boxes,
                    phaseData,
                    `trial_subblocks[${subblockIndex}].target_boxes`
                );
            } else {
                subblockTrials = this.generateCartesianMainTrials(
                    subblock.Fennimals_encountered,
                    subblock.interaction_type,
                    phaseData
                );
            }

            subblockTrials = set_property_to_all_elem_in_arr("trial_subblock_index", subblockIndex, subblockTrials);
            subblockTrials = this.smartShuffleTrials(subblockTrials, []);
            allTrials.push(...subblockTrials);
        });

        return allTrials;
    }

    generateExplicitTrials(trialSpecs, phaseData) {
        let trials = [];

        trialSpecs.forEach((trialSpec, trialIndex) => {
            if (trialSpec.interaction_type === "box_room") {
                let ids = Array.isArray(trialSpec.Fennimals) && trialSpec.Fennimals.length > 0
                    ? trialSpec.Fennimals
                    : [trialSpec.Fennimal];
                trials.push(this.buildBoxRoomTrial(ids, phaseData, `explicit trials[${trialIndex}]`));
                return;
            }

            if (trialSpec.interaction_type === "partner_belief_in_situ") {
                trials.push(
                    this.buildPartnerBeliefInSituTrial(
                        trialSpec.target_box,
                        phaseData,
                        `explicit trials[${trialIndex}]`
                    )
                );
                return;
            }

            let fenArr = this.stimuli.get_Fennimals_in_array([trialSpec.Fennimal]);
            if (!fenArr || fenArr.length === 0) {
                throw new Error(
                    `TrialGenerator: unknown Fennimal id "${trialSpec.Fennimal}" in an explicit trial_subblocks trial ` +
                    `(phase type "${phaseData.type}", trials[${trialIndex}]).`
                );
            }

            let trial = JSON.parse(JSON.stringify(fenArr[0]));
            trial.interaction_type = trialSpec.interaction_type;
            if (trialSpec.interaction_type === "hat_laundry" && !trial.hat) {
                throw new Error(
                    `TrialGenerator: interaction_type "hat_laundry" requires a Fennimal with a hat ` +
                    `(phase type "${phaseData.type}", trials[${trialIndex}], Fennimal "${trialSpec.Fennimal}").`
                );
            }
            if (trialSpec.interaction_type === "scan_box_home") {
                trial.skip_phone_room_autotravel = true;
            }
            this.applyPhaseHintTypeIfNeeded(trial, phaseData);
            trials.push(trial);
        });

        return trials;
    }

    generatePartnerBeliefInSituTrials(boxCodes, phaseData, contextLabel) {
        if (!Array.isArray(boxCodes) || boxCodes.length === 0) {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ needs a non-empty target_boxes list ` +
                `(phase type "${phaseData.type}", ${contextLabel}).`
            );
        }
        return boxCodes.map((code, i) =>
            this.buildPartnerBeliefInSituTrial(code, phaseData, `${contextLabel}[${i}]`)
        );
    }

    /**
     * retrieve_lost_box alternative: one trial per (possibly sampled) box_locations entry.
     * Travel to a non-home location in Fennimal_finding_box's native region;
     * interaction uses target_box (overrides FenObj.toybox).
     */
    generateRetrieveLostBoxTrialsFromBoxLocations(phaseData) {
        let locs = this.applyRetrieveLostBoxSampling(phaseData);
        let occupied = new Set();
        // Prefer spare map spots: exclude every Fennimal's assigned home in this experiment.
        let allFens = this.stimuli.get_all_Fennimals_objects_in_array() || [];
        allFens.forEach((fen) => {
            if (fen && fen.location) occupied.add(fen.location);
        });

        return locs.map((entry, index) => {
            let trial = this.buildRetrieveLostBoxTrialFromBoxLocation(
                entry,
                phaseData,
                index,
                occupied
            );
            occupied.add(trial.location);
            return trial;
        });
    }

    /**
     * Pick a location in the Fennimal's region that is not their home (and not already taken).
     * Prefer unused region spots; fall back to any non-home location in the region.
     */
    pickAlternateLocationInRegion(homeLocation, region, occupiedSet, contextLabel) {
        let regionData = typeof GenParam !== "undefined" ? GenParam.RegionData[region] : null;
        let locations = regionData && Array.isArray(regionData.Locations)
            ? regionData.Locations.slice()
            : [];

        if (locations.length === 0) {
            throw new Error(
                `TrialGenerator: ${contextLabel} region "${region}" has no Locations in GenParam.RegionData ` +
                `(MapController must have initialized markers first).`
            );
        }

        let candidates = locations.filter(
            (loc) => loc !== homeLocation && !occupiedSet.has(loc)
        );
        if (candidates.length === 0) {
            candidates = locations.filter((loc) => loc !== homeLocation);
        }
        if (candidates.length === 0) {
            throw new Error(
                `TrialGenerator: ${contextLabel} cannot place encounter away from home location ` +
                `"${homeLocation}" — region "${region}" has no other location markers.`
            );
        }
        return shuffleArray(candidates)[0];
    }

    buildRetrieveLostBoxTrialFromBoxLocation(entry, phaseData, index, occupiedSet) {
        let fenId = entry.Fennimal_finding_box;
        let fenArr = this.stimuli.get_Fennimals_in_array([fenId]);
        if (!fenArr || fenArr.length === 0) {
            throw new Error(
                `TrialGenerator: retrieve_lost_box box_locations[${index}] unknown Fennimal_finding_box ` +
                `"${fenId}" (phase type "${phaseData.type}").`
            );
        }

        let mapped = this.stimuli.get_assigned_names_of_code_array("toybox", [entry.target_box]);
        let target_box = mapped && mapped[0];
        if (!target_box) {
            throw new Error(
                `TrialGenerator: retrieve_lost_box box_locations[${index}] failed to map target_box code ` +
                `"${entry.target_box}" (phase type "${phaseData.type}").`
            );
        }

        let trial = JSON.parse(JSON.stringify(fenArr[0]));
        trial.interaction_type = "retrieve_lost_box";
        // BoxModule / WorldState tag commits read FenObj.toybox — point it at the found box.
        trial.toybox = target_box;
        trial.target_box = target_box;
        trial.target_box_code = entry.target_box;
        trial.Fennimal_finding_box = fenId;

        if (entry.label !== undefined && entry.label !== null && entry.label !== "") {
            trial.label = entry.label;
            trial.manipulation_label = entry.label;
        }
        if (entry.weight !== undefined && entry.weight !== null) {
            trial.weight = entry.weight;
            trial.weight_proportion = entry.weight_proportion;
        }

        trial.home_location = trial.location;
        trial.location = this.pickAlternateLocationInRegion(
            trial.home_location,
            trial.region,
            occupiedSet || new Set(),
            `retrieve_lost_box box_locations[${index}] (Fennimal "${fenId}")`
        );

        return trial;
    }

    /**
     * Resolve target box → WorldState contents → Fennimal who owns that toy.
     * Carrier FenObj is that Fennimal (for map travel); target_box is stamped separately.
     */
    buildPartnerBeliefInSituTrial(targetBoxCode, phaseData, contextLabel = "partner_belief_in_situ") {
        if (targetBoxCode === undefined || targetBoxCode === null || targetBoxCode === "") {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ is missing target_box ` +
                `(phase type "${phaseData.type}", ${contextLabel}).`
            );
        }

        let mapped = this.stimuli.get_assigned_names_of_code_array("toybox", [targetBoxCode]);
        let target_box = mapped && mapped[0];
        if (!target_box) {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ failed to map target_box code "${targetBoxCode}" ` +
                `(phase type "${phaseData.type}", ${contextLabel}).`
            );
        }

        let contents = WorldState.get_toybox_contents(target_box);
        if (!contents || contents === false) {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ box "${target_box}" (code "${targetBoxCode}") ` +
                `has no current contents in WorldState — cannot resolve travel Fennimal ` +
                `(phase type "${phaseData.type}", ${contextLabel}).`
            );
        }

        let allFens = this.stimuli.get_Fennimals_in_array("all");
        let matches = (allFens || []).filter((fen) => fen.toy === contents);
        if (matches.length === 0) {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ box "${target_box}" contains toy "${contents}", ` +
                `but no Fennimal owns that toy (phase type "${phaseData.type}", ${contextLabel}).`
            );
        }
        if (matches.length > 1) {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ box "${target_box}" contains toy "${contents}", ` +
                `but multiple Fennimals own it: ${JSON.stringify(matches.map((f) => f.id))} ` +
                `(phase type "${phaseData.type}", ${contextLabel}).`
            );
        }

        let belief = WorldState.get_partner_belief_in_box_contents(target_box);
        if (belief === undefined || belief === false) {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ box "${target_box}" (code "${targetBoxCode}") ` +
                `has no partner belief in WorldState (phase type "${phaseData.type}", ${contextLabel}).`
            );
        }

        let carrier = JSON.parse(JSON.stringify(matches[0]));
        carrier.interaction_type = "partner_belief_in_situ";
        carrier.target_box = target_box;
        carrier.target_box_code = targetBoxCode;
        carrier.partner_belief_in_situ_scene_fennimal_id = matches[0].id;
        carrier.force_partner_present = true;
        this.applyPhaseHintTypeIfNeeded(carrier, phaseData);
        return carrier;
    }

    applyPartnerBeliefInSituLureCycles(trials, phaseData) {
        if (!trials || trials.length === 0) return trials;

        let inSitu = trials.filter((t) => t.interaction_type === "partner_belief_in_situ");
        if (inSitu.length === 0) return trials;

        let codes;
        if (Array.isArray(phaseData.lure_cycle) && phaseData.lure_cycle.length >= 2) {
            codes = [...phaseData.lure_cycle];
        } else {
            codes = [];
            inSitu.forEach((t) => {
                if (t.target_box_code && !codes.includes(t.target_box_code)) {
                    codes.push(t.target_box_code);
                }
            });
        }

        if (codes.length < 2) {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ needs a lure_cycle of at least 2 box codes ` +
                `(or at least 2 distinct target_box values in the phase). ` +
                `Got ${JSON.stringify(codes)} (phase type "${phaseData.type}").`
            );
        }

        let boxes = this.stimuli.get_assigned_names_of_code_array("toybox", codes);
        if (!boxes || boxes.includes(false) || boxes.some((b) => !b)) {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ failed to map lure_cycle codes ` +
                `${JSON.stringify(codes)} (phase type "${phaseData.type}").`
            );
        }

        inSitu.forEach((trial) => {
            if (!codes.includes(trial.target_box_code)) {
                throw new Error(
                    `TrialGenerator: partner_belief_in_situ target_box "${trial.target_box_code}" ` +
                    `is not in lure_cycle ${JSON.stringify(codes)} (phase type "${phaseData.type}").`
                );
            }
            trial.lure_cycle_codes = codes;
            trial.lure_cycle_boxes = boxes;
            this.validatePartnerBeliefInSituTriad(trial, phaseData);
        });

        return trials;
    }

    validatePartnerBeliefInSituTriad(trial, phaseData) {
        let cycleIndex = trial.lure_cycle_codes.indexOf(trial.target_box_code);
        let lureIndex = (cycleIndex + 1) % trial.lure_cycle_codes.length;
        let lure_source_box = trial.lure_cycle_boxes[lureIndex];
        let lure_source_box_code = trial.lure_cycle_codes[lureIndex];

        let belief = WorldState.get_partner_belief_in_box_contents(trial.target_box);
        let reality = WorldState.get_toybox_contents(trial.target_box);
        if (reality === false) reality = undefined;
        let lure = WorldState.get_partner_belief_in_box_contents(lure_source_box);
        if (lure === false) lure = undefined;

        if (belief === undefined || belief === false) {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ missing partner belief for box "${trial.target_box}" ` +
                `(phase type "${phaseData.type}").`
            );
        }
        if (reality === undefined) {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ missing current contents for box "${trial.target_box}" ` +
                `(phase type "${phaseData.type}").`
            );
        }
        if (lure === undefined) {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ missing partner belief for lure-source box ` +
                `"${lure_source_box}" (code "${lure_source_box_code}", phase type "${phaseData.type}").`
            );
        }
        if (belief === reality || belief === lure || reality === lure) {
            throw new Error(
                `TrialGenerator: partner_belief_in_situ belief/reality/lure are not three distinct toys for ` +
                `box "${trial.target_box}": belief=${belief}, reality=${reality}, lure=${lure} ` +
                `(from ${lure_source_box_code}; phase type "${phaseData.type}").`
            );
        }
    }

    /**
     * box_room is one multi-Fennimal warehouse trial (never cartesian-expanded per Fennimal).
     * Carrier FenObj (first id) is used for map placement / phone-room travel; full set is on box_room_fennimals.
     */
    buildBoxRoomTrial(fennimalIds, phaseData, contextLabel = "box_room") {
        let fenArr = this.stimuli.get_Fennimals_in_array(fennimalIds);
        if (!fenArr || fenArr.length === 0) {
            throw new Error(
                `TrialGenerator: no Fennimals found for box_room ids ${JSON.stringify(fennimalIds)} ` +
                `(phase type "${phaseData.type}", ${contextLabel}).`
            );
        }
        if (Array.isArray(fennimalIds) && fenArr.length !== fennimalIds.length) {
            let foundIds = fenArr.map(f => f.id);
            let missing = fennimalIds.filter(id => !foundIds.includes(id));
            if (missing.length > 0) {
                throw new Error(
                    `TrialGenerator: unknown Fennimal id(s) ${JSON.stringify(missing)} in box_room ` +
                    `(phase type "${phaseData.type}", ${contextLabel}).`
                );
            }
        }

        this.validateBoxRoomFennimalSet(fenArr, phaseData, contextLabel);

        let carrier = JSON.parse(JSON.stringify(fenArr[0]));
        carrier.interaction_type = "box_room";
        carrier.box_room_fennimals = JSON.parse(JSON.stringify(fenArr));
        carrier.box_room_fennimal_ids = fenArr.map(f => f.id);
        carrier.skip_phone_room_autotravel = true;
        this.applyPhaseHintTypeIfNeeded(carrier, phaseData);
        return carrier;
    }

    validateBoxRoomFennimalSet(fenArr, phaseData, contextLabel) {
        let toys = {};
        let boxes = {};
        fenArr.forEach((fen) => {
            if (!fen.toy) {
                throw new Error(
                    `TrialGenerator: box_room Fennimal "${fen.id}" has no toy ` +
                    `(phase type "${phaseData.type}", ${contextLabel}).`
                );
            }
            if (!fen.toybox) {
                throw new Error(
                    `TrialGenerator: box_room Fennimal "${fen.id}" has no toybox ` +
                    `(phase type "${phaseData.type}", ${contextLabel}).`
                );
            }
            if (toys[fen.toy]) {
                throw new Error(
                    `TrialGenerator: box_room has duplicate toy "${fen.toy}" ` +
                    `(Fennimals "${toys[fen.toy]}" and "${fen.id}"; phase type "${phaseData.type}", ${contextLabel}).`
                );
            }
            if (boxes[fen.toybox]) {
                throw new Error(
                    `TrialGenerator: box_room has duplicate toybox "${fen.toybox}" ` +
                    `(Fennimals "${boxes[fen.toybox]}" and "${fen.id}"; phase type "${phaseData.type}", ${contextLabel}).`
                );
            }
            toys[fen.toy] = fen.id;
            boxes[fen.toybox] = fen.id;
        });
    }

    generateCartesianMainTrials(fennimalsEncountered, interactionType, phaseData) {
        let interactionTypesArr = Array.isArray(interactionType) ? interactionType : [interactionType];
        const baseFennimalSet = this.stimuli.get_Fennimals_in_array(fennimalsEncountered);

        if (!baseFennimalSet || baseFennimalSet.length === 0) {
            throw new Error(
                `TrialGenerator: no Fennimals found for ids ${JSON.stringify(fennimalsEncountered)} ` +
                `(phase type "${phaseData.type}").`
            );
        }

        let mainTrials = [];
        for (let i = 0; i < interactionTypesArr.length; i++) {
            let type = interactionTypesArr[i];
            if (type === "box_room") {
                // One warehouse trial for the whole Fennimal set — do not cartesian-expand.
                mainTrials.push(
                    this.buildBoxRoomTrial(
                        fennimalsEncountered,
                        phaseData,
                        `cartesian interaction_type "box_room"`
                    )
                );
                continue;
            }
            if (type === "partner_belief_in_situ") {
                throw new Error(
                    `TrialGenerator: interaction_type "partner_belief_in_situ" cannot be crossed with ` +
                    `Fennimals_encountered. Use target_boxes (or explicit trials with target_box) ` +
                    `(phase type "${phaseData.type}").`
                );
            }

            let newSet = set_property_to_all_elem_in_arr(
                "interaction_type",
                type,
                JSON.parse(JSON.stringify(baseFennimalSet))
            );
            if (type === "hat_laundry") {
                newSet = newSet.filter((trial) => !!trial.hat);
                if (newSet.length === 0) {
                    throw new Error(
                        `TrialGenerator: interaction_type "hat_laundry" requires Fennimals with hats ` +
                        `(phase type "${phaseData.type}").`
                    );
                }
            }
            newSet.forEach(trial => {
                this.applyPhaseHintTypeIfNeeded(trial, phaseData);
                if (type === "scan_box_home") {
                    trial.skip_phone_room_autotravel = true;
                }
            });
            mainTrials.push(...newSet);
        }

        return mainTrials;
    }

    applyPhaseHintTypeIfNeeded(trial, phaseData) {
        if (phaseData.type !== "hint_and_search") return trial;
        let hintTypeArr = Array.isArray(phaseData.hint_type) ? phaseData.hint_type : [phaseData.hint_type];
        trial.hint_type = hintTypeArr[0];
        return trial;
    }

    applyRetrieveLostBoxPhaseFlags(trials, phaseData) {
        if (!trials || trials.length === 0) return trials;
        if (phaseData.include_decoration === true) {
            trials = set_property_to_all_elem_in_arr("include_decoration", true, trials);
        }
        return trials;
    }

    applyAskToySettingsToTrials(trials, phaseData) {
        if (!phaseData.ask_toy || !trials || trials.length === 0) return trials;

        let toysAskedMapped;
        if (Array.isArray(phaseData.toys_asked) && phaseData.toys_asked.length > 0) {
            toysAskedMapped = this.stimuli.get_assigned_names_of_code_array("toy", phaseData.toys_asked);
            if (!toysAskedMapped || toysAskedMapped.includes(false) || toysAskedMapped.some(t => !t)) {
                console.warn("ask_toy: failed to map toys_asked codes", phaseData.toys_asked);
                toysAskedMapped = (toysAskedMapped || []).filter(t => t);
            }
        } else {
            toysAskedMapped = this.collectUniqueAttributeFromPhaseFennimals(phaseData, "toy");
        }

        toysAskedMapped = this.expandSingletonAskOptions(toysAskedMapped, {
            experimentOptions: this.stimuli.get_all_x_encountered_during_experiment("toy"),
            softwareOptions: this.stimuli.get_all_software_options_of_type("toy"),
        });

        if (toysAskedMapped.length === 0) {
            console.warn("ask_toy is true but no toys_asked / phase toys could be resolved");
        }

        trials = set_property_to_all_elem_in_arr("ask_toy", true, trials);
        trials = set_property_to_all_elem_in_arr("toys_asked", toysAskedMapped, trials);
        return trials;
    }

    /**
     * Stamp distractor options for post-placement attention checks.
     * toy_to_sack: unique toys across all Fennimals in the phase (not just the subblock).
     * toy_to_box / sack_to_box: unique toys/sacks among sibling trials in the same subblock.
     * Singleton option sets widen to experiment-wide, then software-wide (see expandSingletonAskOptions).
     */
    applyPlacementQuizOptionsToTrials(trials, phaseData) {
        if (!trials || trials.length === 0) return trials;

        let phaseToys = this.collectUniqueAttributeFromPhaseFennimals(phaseData, "toy");
        let experimentToys = this.stimuli.get_all_x_encountered_during_experiment("toy");
        let experimentSacks = this.stimuli.get_all_x_encountered_during_experiment("sack");
        let softwareToys = this.stimuli.get_all_software_options_of_type("toy");
        let softwareSacks = this.stimuli.get_all_software_options_of_type("sack");

        let bySubblock = {};
        trials.forEach((trial) => {
            if (!trial) return;
            let key = (trial.trial_subblock_index != null) ? String(trial.trial_subblock_index) : "all";
            if (!bySubblock[key]) bySubblock[key] = [];
            bySubblock[key].push(trial);
        });

        Object.keys(bySubblock).forEach((key) => {
            let cohort = bySubblock[key];
            let toys = [];
            let sacks = [];

            cohort.forEach((trial) => {
                if (trial.toy && !toys.includes(trial.toy)) toys.push(trial.toy);
                if (trial.sack && !sacks.includes(trial.sack)) sacks.push(trial.sack);
            });

            cohort.forEach((trial) => {
                if (trial.interaction_type === "toy_to_sack") {
                    let opts = this.expandSingletonAskOptions(phaseToys, {
                        experimentOptions: experimentToys,
                        softwareOptions: softwareToys,
                        requiredValues: [trial.toy],
                    });
                    trial.placement_quiz_options = opts;
                } else if (trial.interaction_type === "toy_to_box") {
                    let opts = this.expandSingletonAskOptions(toys, {
                        experimentOptions: experimentToys,
                        softwareOptions: softwareToys,
                        requiredValues: [trial.toy],
                    });
                    trial.placement_quiz_options = opts;
                } else if (trial.interaction_type === "switch_box_without_partner") {
                    let opts = this.expandSingletonAskOptions(toys, {
                        experimentOptions: experimentToys,
                        softwareOptions: softwareToys,
                        requiredValues: [trial.toy],
                    });
                    trial.placement_quiz_options = opts;
                    trial.boxes_in_subblock = cohort
                        .map((t) => t.toybox)
                        .filter((box, idx, arr) => box && arr.indexOf(box) === idx);
                } else if (trial.interaction_type === "sack_to_box") {
                    let opts = this.expandSingletonAskOptions(sacks, {
                        experimentOptions: experimentSacks,
                        softwareOptions: softwareSacks,
                        requiredValues: [trial.sack],
                    });
                    trial.placement_quiz_options = opts;
                }
            });
        });

        return trials;
    }

    applySwitchBoxWithoutPartnerSettingsToTrials(trials) {
        if (!trials || trials.length === 0) return trials;
        trials.forEach((trial) => {
            if (!trial || trial.interaction_type !== "switch_box_without_partner") return;
            trial.force_partner_present = true;
            trial.return_travel = "manual";
        });
        return trials;
    }

    applyHideAndSeekFennimalPartnerDefault(trials, phaseData) {
        if (!trials || trials.length === 0) return trials;
        trials.forEach((trial) => {
            if (!trial || trial.interaction_type !== "hide_and_seek_Fennimal") return;
            if (trial.partner_behavior === undefined && phaseData && phaseData.partner_behavior !== undefined) {
                trial.partner_behavior = phaseData.partner_behavior;
            }
        });
        return trials;
    }

    /**
     * Unique hats among Fennimals in the same subblock/cohort, stamped onto hat_laundry trials.
     */
    applyHatLaundryHatsToTrials(trials) {
        if (!trials || trials.length === 0) return trials;

        let bySubblock = {};
        trials.forEach((trial) => {
            if (!trial) return;
            let key = (trial.trial_subblock_index != null) ? String(trial.trial_subblock_index) : "all";
            if (!bySubblock[key]) bySubblock[key] = [];
            bySubblock[key].push(trial);
        });

        Object.keys(bySubblock).forEach((key) => {
            let cohort = bySubblock[key];
            let hats = [];
            cohort.forEach((trial) => {
                if (trial.hat && !hats.includes(trial.hat)) hats.push(trial.hat);
            });
            cohort.forEach((trial) => {
                if (trial.interaction_type !== "hat_laundry") return;
                let list = hats.slice();
                if (trial.hat && !list.includes(trial.hat)) list.push(trial.hat);
                trial.laundry_hats = list;
            });
        });

        return trials;
    }

    applyAskBoxSettingsToTrials(trials, phaseData) {
        if (!phaseData.ask_box || !trials || trials.length === 0) return trials;

        let boxesAskedMapped;
        if (Array.isArray(phaseData.boxes_asked) && phaseData.boxes_asked.length > 0) {
            boxesAskedMapped = this.stimuli.get_assigned_names_of_code_array("toybox", phaseData.boxes_asked);
            if (!boxesAskedMapped || boxesAskedMapped.includes(false) || boxesAskedMapped.some(b => !b)) {
                console.warn("ask_box: failed to map boxes_asked codes", phaseData.boxes_asked);
                boxesAskedMapped = (boxesAskedMapped || []).filter(b => b);
            }
        } else {
            boxesAskedMapped = this.collectUniqueAttributeFromPhaseFennimals(phaseData, "toybox");
        }

        boxesAskedMapped = this.expandSingletonAskOptions(boxesAskedMapped, {
            experimentOptions: this.stimuli.get_all_x_encountered_during_experiment("toybox"),
            softwareOptions: this.stimuli.get_all_software_options_of_type("toybox"),
        });

        if (boxesAskedMapped.length === 0) {
            console.warn("ask_box is true but no boxes_asked / phase toyboxes could be resolved");
        }

        trials = set_property_to_all_elem_in_arr("ask_box", true, trials);
        trials = set_property_to_all_elem_in_arr("boxes_asked", boxesAskedMapped, trials);
        return trials;
    }

    /**
     * Unique assigned attribute values (e.g. toy / toybox) across Fennimals in this phase block.
     */
    collectUniqueAttributeFromPhaseFennimals(phaseData, attribute) {
        let ids = this.collectFennimalIdsInPhase(phaseData);
        let fenObjects = this.stimuli.get_Fennimals_in_array(ids);
        let values = [];
        (fenObjects || []).forEach((fen) => {
            if (fen && fen[attribute] && !values.includes(fen[attribute])) {
                values.push(fen[attribute]);
            }
        });
        return values;
    }

    /**
     * When a block-level ask_* / placement option set has ≤1 unique entry, widen it:
     * 1) all options of that type used in the experiment, then
     * 2) all options loaded in the software (SVG catalog).
     * Always ensures requiredValues (correct answer) are present.
     */
    expandSingletonAskOptions(options, { experimentOptions, softwareOptions, requiredValues } = {}) {
        let opts = [...new Set((options || []).filter(Boolean))];

        if (opts.length <= 1) {
            let experimentWide = [...new Set((experimentOptions || []).filter(Boolean))];
            if (experimentWide.length > 1) {
                opts = experimentWide;
            } else {
                let softwareWide = [...new Set((softwareOptions || []).filter(Boolean))];
                if (softwareWide.length > 0) {
                    opts = softwareWide;
                } else if (experimentWide.length > 0) {
                    opts = experimentWide;
                }
            }
        }

        (requiredValues || []).forEach((value) => {
            if (value && !opts.includes(value)) opts.push(value);
        });

        return opts;
    }

    /**
     * Stamp ask_Fennimal onto all trials. fennimals_asked defaults to every Fennimal id in the phase
     * (union across trial_subblocks when present). Also stamps fennimals_asked_objects for head UI.
     * Singleton sets widen to all experiment Fennimals (no broader software catalog of identities).
     */
    applyAskFennimalSettingsToTrials(trials, phaseData) {
        if (!phaseData.ask_Fennimal || !trials || trials.length === 0) return trials;

        let ids = Array.isArray(phaseData.fennimals_asked) && phaseData.fennimals_asked.length > 0
            ? [...phaseData.fennimals_asked]
            : this.collectFennimalIdsInPhase(phaseData);

        ids = this.expandSingletonAskOptions(ids, {
            experimentOptions: this.stimuli.get_all_Fennimal_ids_in_experiment(),
            softwareOptions: null,
        });

        if (!ids || ids.length === 0) {
            console.warn("ask_Fennimal is true but no fennimals_asked / phase Fennimals could be resolved");
            ids = [];
        }

        let fenObjects = this.stimuli.get_Fennimals_in_array(ids);

        trials = set_property_to_all_elem_in_arr("ask_Fennimal", true, trials);
        trials = set_property_to_all_elem_in_arr("fennimals_asked", ids, trials);
        trials = set_property_to_all_elem_in_arr("fennimals_asked_objects", fenObjects, trials);
        return trials;
    }

    /**
     * Photo trials: withhold the name in camera prompts; the polaroid caption introduces it.
     */
    applyIntroduceNameOnPolaroidToTrials(trials, phaseData) {
        if (!phaseData.introduce_name_on_polaroid || !trials || trials.length === 0) return trials;
        return set_property_to_all_elem_in_arr("introduce_name_on_polaroid", true, trials);
    }

    /**
     * Stamp ask_name onto all trials. names_asked defaults to unique names of Fennimals in the phase.
     * Singleton sets widen to all experiment Fennimal names.
     */
    applyAskNameSettingsToTrials(trials, phaseData) {
        if (!phaseData.ask_name || !trials || trials.length === 0) return trials;

        let names = Array.isArray(phaseData.names_asked) && phaseData.names_asked.length > 0
            ? [...phaseData.names_asked]
            : this.collectUniqueAttributeFromPhaseFennimals(phaseData, "name");

        names = this.expandSingletonAskOptions(names, {
            experimentOptions: this.stimuli.get_all_x_encountered_during_experiment("name"),
            softwareOptions: null,
        });

        if (!names || names.length === 0) {
            console.warn("ask_name is true but no names_asked / phase Fennimal names could be resolved");
            names = [];
        }

        trials = set_property_to_all_elem_in_arr("ask_name", true, trials);
        trials = set_property_to_all_elem_in_arr("names_asked", names, trials);
        return trials;
    }

    /**
     * Stamp ask_hat onto all trials. hats_asked defaults to unique hats of Fennimals in the phase.
     * Explicit hats_asked codes are mapped via FeatureMap. Singleton sets widen to experiment hats,
     * then the SVG hat catalog.
     */
    applyAskHatSettingsToTrials(trials, phaseData) {
        if (!phaseData.ask_hat || !trials || trials.length === 0) return trials;

        let hatsAskedMapped;
        if (Array.isArray(phaseData.hats_asked) && phaseData.hats_asked.length > 0) {
            hatsAskedMapped = this.stimuli.get_assigned_names_of_code_array("hat", phaseData.hats_asked);
            if (!hatsAskedMapped || hatsAskedMapped.includes(false) || hatsAskedMapped.some((h) => !h)) {
                console.warn("ask_hat: failed to map hats_asked codes", phaseData.hats_asked);
                hatsAskedMapped = (hatsAskedMapped || []).filter((h) => h);
            }
        } else {
            hatsAskedMapped = this.collectUniqueAttributeFromPhaseFennimals(phaseData, "hat");
        }

        hatsAskedMapped = this.expandSingletonAskOptions(hatsAskedMapped, {
            experimentOptions: this.stimuli.get_all_x_encountered_during_experiment("hat"),
            softwareOptions: this.stimuli.get_all_software_options_of_type("hat"),
        });

        if (hatsAskedMapped.length === 0) {
            console.warn("ask_hat is true but no hats_asked / phase hats could be resolved");
        }

        trials = set_property_to_all_elem_in_arr("ask_hat", true, trials);
        trials = set_property_to_all_elem_in_arr("hats_asked", hatsAskedMapped, trials);
        return trials;
    }

    /**
     * found_toy trials introduce a new Fennimal for packing only — skip identity/toy quizzes.
     */
    stripAskFlagsForSpecialRoles(trials) {
        if (!trials || trials.length === 0) return trials;
        trials.forEach((trial) => {
            if (trial && trial.special_role === "found_toy") {
                trial.ask_Fennimal = false;
                trial.ask_toy = false;
                trial.ask_name = false;
                trial.ask_hat = false;
            }
        });
        return trials;
    }

    collectFennimalIdsInPhase(phaseData) {
        let idSet = new Set();

        if (Array.isArray(phaseData.trial_subblocks)) {
            phaseData.trial_subblocks.forEach((subblock) => {
                if (Array.isArray(subblock.trials)) {
                    subblock.trials.forEach((trialSpec) => {
                        if (!trialSpec) return;
                        if (Array.isArray(trialSpec.Fennimals)) {
                            trialSpec.Fennimals.forEach((id) => idSet.add(id));
                        } else if (trialSpec.Fennimal) {
                            idSet.add(trialSpec.Fennimal);
                        }
                    });
                } else if (Array.isArray(subblock.Fennimals_encountered)) {
                    subblock.Fennimals_encountered.forEach((id) => idSet.add(id));
                } else if (subblock.Fennimals_encountered === "all") {
                    this.stimuli.get_Fennimals_in_array("all").forEach((fen) => idSet.add(fen.id));
                }
            });
            return Array.from(idSet);
        }

        if (phaseData.Fennimals_encountered === "all") {
            return this.stimuli.get_Fennimals_in_array("all").map((fen) => fen.id);
        }
        if (Array.isArray(phaseData.Fennimals_encountered)) {
            return [...phaseData.Fennimals_encountered];
        }
        if (Array.isArray(phaseData.box_locations)) {
            return phaseData.box_locations
                .map((entry) => entry && entry.Fennimal_finding_box)
                .filter((id) => id !== undefined && id !== null && id !== "");
        }
        return [];
    }

    getOrthogonalTaskTrials(phaseData) {
        let oTrials = [];
        let fenObjs = this.stimuli.get_Fennimals_in_array(phaseData.Fennimals_encountered);
        let specialFens = fenObjs.filter(f => f.play_orthogonal_tasks === true);

        for (let taskNum in phaseData.included_orthogonal_tasks) {
            for (let fenNum in specialFens) {
                let newFen = JSON.parse(JSON.stringify(specialFens[fenNum]));
                newFen.hint_type = "icon"; // Force icon hint for orthogonal tasks
                newFen.interaction_type = phaseData.included_orthogonal_tasks[taskNum];
                oTrials.push(newFen);
            }
        }
        return oTrials;
    }

    trialsShareIdentityCue(a, b) {
        if (!a || !b) return false;
        if (a.id != null && b.id != null && String(a.id) === String(b.id)) return true;
        if (a.region != null && b.region != null && String(a.region) === String(b.region)) return true;
        if (a.head != null && b.head != null && String(a.head) === String(b.head)) return true;
        return false;
    }

    countAdjacentIdentityCueConflicts(sequence) {
        let n = 0;
        for (let i = 1; i < sequence.length; i++) {
            if (this.trialsShareIdentityCue(sequence[i - 1], sequence[i])) n++;
        }
        return n;
    }

    greedyShuffleAvoidingAdjacentIdentityCues(shuffledPool) {
        let remainingPool = shuffledPool.slice();
        let sequence = [];

        while (remainingPool.length > 0) {
            let lastItem = sequence.length > 0 ? sequence[sequence.length - 1] : null;
            let nextIndex = remainingPool.findIndex((item) => !this.trialsShareIdentityCue(item, lastItem));

            if (nextIndex !== -1) {
                sequence.push(remainingPool.splice(nextIndex, 1)[0]);
                continue;
            }

            let problematicItem = remainingPool.shift();
            let swapped = false;
            let lastIdItem = sequence.length > 0 ? sequence[sequence.length - 1] : null;

            for (let j = 0; j < sequence.length - 1; j++) {
                let prevItem = j > 0 ? sequence[j - 1] : null;
                let nextItem = sequence[j + 1];
                let candidateToMoveToEnd = sequence[j];

                if (
                    !this.trialsShareIdentityCue(problematicItem, prevItem)
                    && !this.trialsShareIdentityCue(problematicItem, nextItem)
                    && !this.trialsShareIdentityCue(candidateToMoveToEnd, lastIdItem)
                ) {
                    sequence.splice(j, 1, problematicItem);
                    sequence.push(candidateToMoveToEnd);
                    swapped = true;
                    break;
                }
            }

            if (!swapped) sequence.push(problematicItem);
        }

        return sequence;
    }

    smartShuffleTrials(mainTrials, orthogonalTrials) {
        // Avoid consecutive trials that share a Fennimal id, region, or head.
        let combinedPool = [...mainTrials, ...orthogonalTrials];
        if (combinedPool.length <= 1) return combinedPool;

        let best = null;
        let bestConflicts = Infinity;
        let attempts = Math.min(48, Math.max(12, combinedPool.length * 4));

        for (let i = 0; i < attempts; i++) {
            let sequence = this.greedyShuffleAvoidingAdjacentIdentityCues(shuffleArray(combinedPool.slice()));
            let conflicts = this.countAdjacentIdentityCueConflicts(sequence);
            if (conflicts < bestConflicts) {
                best = sequence;
                bestConflicts = conflicts;
                if (conflicts === 0) break;
            }
        }

        return best || combinedPool;
    }
}

// ----------------------------------------------------
// 3. TASK EVALUATOR (Decoupled Data Cleaning)
// ----------------------------------------------------
class TaskEvaluator {

    // Analyzes raw recalled names and matches them to valid Fennimal IDs via Levenshtein distance
    static evaluateRecallData(recalledNames, stimuli, allowedDistance) {
        let allFennimals = stimuli.get_all_Fennimals_objects_in_array();
        let allNamesInExp = allFennimals.map(f => ({ name: f.name, id: f.id }));
        let processedNames = JSON.parse(JSON.stringify(recalledNames));

        for (let i = 0; i < processedNames.length; i++) {
            let possibleMatches = [];
            for (let x = 0; x < allNamesInExp.length; x++) {
                let dist = LevenshteinDistance(processedNames[i].ans.toLowerCase(), allNamesInExp[x].name.toLowerCase());
                if (dist <= allowedDistance) {
                    possibleMatches.push({ matchedID: allNamesInExp[x].id, dist: dist });
                }
            }

            if (possibleMatches.length === 1) {
                processedNames[i].matchedID = possibleMatches[0].matchedID;
                processedNames[i].LSdist = possibleMatches[0].dist;
            } else if (possibleMatches.length > 1) {
                let closest = possibleMatches.reduce((prev, curr) => prev.dist < curr.dist ? prev : curr);
                processedNames[i].matchedID = closest.matchedID;
                processedNames[i].LSdist = closest.dist;
                processedNames[i].flagged_for_multiple_matches = true;
            }
        }

        let uniqueMatchedIds = [...new Set(processedNames.filter(r => r.matchedID).map(r => r.matchedID))];
        return {
            processedNames: processedNames,
            uniqueMatchedIds: uniqueMatchedIds,
            totalPossibleFennimals: allFennimals.length
        };
    }
}


// ----------------------------------------------------
// 4. EXPERIMENT CONTROLLER (The Traffic Cop)
// ----------------------------------------------------
class ExperimentController {
    constructor() {
        this.experimentStartTime = Date.now();
        this.experimentStartPerf = performance.now();
        this.stimulusSettings = new StimulusSettings();
        this.stimuli = new StimulusTransformer(this.stimulusSettings);
        console.log(this.stimuli.get_all_Fennimals_objects_in_array());

        // Sub-Controllers & Utilities
        this.imageLoader = new ImageLoader(this.stimuli.get_all_locations_visited_during_experiment_with_regions(), document.getElementById("All_Locations"));
        this.atCheckCont = new AttentionCheckController(this.experimentStartTime, 20);
        this.dataCont = new DataController(this.stimuli, this.atCheckCont, this.experimentStartTime);
        // SVGREDUCER runs in finalizeSession AFTER optional assignment restore.
        // Otherwise a fresh randomization can delete heads that the restored session still needs.
        this.svgReducer = null;
        this.trialGenerator = new TrialGenerator(this.stimuli, this.dataCont);
        this.trialGenerator.validateExperimentStructure(this.stimulusSettings.Experiment_Structure);

        WorldState.rebuild_state_from_available_locations(this.stimuli.get_all_locations_visited_during_experiment_with_regions());

        this.mapCont = new MapController(this, WorldState);
        this.instrCont = new InstructionsController(this, WorldState, this.stimuli);
        this.phoneRoomCont = new PhoneRoomController(this, WorldState, this.instrCont); //TODO: this should probably be moved to a different section (not all experiments will use a phoneroomcontroller)

        // State Tracking
        this.remainingExperimentPhases = JSON.parse(JSON.stringify(this.stimulusSettings.Experiment_Structure));
        this.currentPhaseData = null;
        this.currentPhaseType = null;

        this.currentPhaseNum = 0;
        this.currentDayNum = 0;
        this.currentTrialNumInDay = 0;
        this.currentInteractionNumInPhase = 0;

        this.currentTrial = null;
        this.currentFennimal = null;
        this.sortingCriterionState = null;

        this.flagExplorationPhaseCompleted = false;
        this.flagHintAndSearchInstructionsShown = false;

        this.remainingInstructionsPages = this.stimuli.get_instruction_pages_arr();
        this.currentInstructionsPage = null;
        this.remainingQuestionnairePages = [];
    }

    /**
     * Layer 1: apply claim/assignment continuity after construction, before startExperiment.
     */
    async finalizeSession(earlySession) {
        await this.dataCont.finalizeSession(earlySession);

        if (this.dataCont.didRestoreAssignment) {
            this.ensureLocationImagesLoaded(
                this.stimuli.get_all_locations_visited_during_experiment_with_regions()
            );
            WorldState.rebuild_state_from_available_locations(
                this.stimuli.get_all_locations_visited_during_experiment_with_regions()
            );
        }

        // Prune unused SVG assets only after the final Fennimal assignment is known.
        this.svgReducer = new SVGREDUCER(this.stimuli);

        this.installRefreshGuard();
    }

    ensureLocationImagesLoaded(arrayOfVisitedRegionsAndLocations) {
        let holder = document.getElementById("All_Locations");
        if (!holder || !arrayOfVisitedRegionsAndLocations) return;

        for (let i = 0; i < arrayOfVisitedRegionsAndLocations.length; i++) {
            let locationName = arrayOfVisitedRegionsAndLocations[i][0];
            let regionName = arrayOfVisitedRegionsAndLocations[i][1];
            if (document.getElementById("location_" + locationName)) continue;

            let NewGroup = create_SVG_group(0, 0, "location", "location_" + locationName);
            let Img = document.createElementNS("http://www.w3.org/2000/svg", "image");
            set_location_background_image(Img, regionName, locationName);
            Img.setAttribute("width", "100%");
            Img.setAttribute("height", "100%");
            Img.setAttribute("preserveAspectRatio", "none");
            NewGroup.appendChild(Img);
            holder.appendChild(NewGroup);
        }
    }

    installRefreshGuard() {
        window.addEventListener("beforeunload", (event) => {
            if (!this.dataCont || !this.dataCont.refreshGuardArmed) return;
            if (this.dataCont.experimentData.experimentCompleted) return;
            event.preventDefault();
            event.returnValue = "";
        });
    }

    startExperiment() {
        this.checkIfPhoneBoothIsNeeded();
        this.checkIfPhoneRoomAssetIsNeeded();
        // Arm even when the instruction list has no consent page (e.g. test configs).
        if (this.dataCont) this.dataCont.refreshGuardArmed = true;
        this.showNextGeneralInstructionsPage();
        this.mapCont.disable_map_interactions();
    }

    startNextExperimentPhase() {
        this.mapCont.disable_map_interactions();

        if (this.remainingExperimentPhases.length === 0) {
            this.startPostExperimentQuestionnaire();
            this.dataCont.recordTimestamp("main phase complete");
            return;
        }

        this.currentPhaseData = this.remainingExperimentPhases.shift();
        this.currentPhaseType = this.currentPhaseData.type;
        this.currentPhaseNum++;
        this.currentPhaseData.phasenum = this.currentPhaseNum;

        if (this.currentPhaseType !== "pseudoday") this.currentDayNum++;
        this.currentInteractionNumInPhase = 0;

        WorldState.clear_all_locations(true);

        if (GenParam.DisplayFoundFennimalIconsOnMap.show && GenParam.DisplayFoundFennimalIconsOnMap.clear_Fennimal_icons_from_map_at_start_of_new_day) {
            this.mapCont.clear_all_Fennimal_icons_from_map();
        }
        this.mapCont.clear_all_lost_box_icons_from_map();

        WorldState.change_partner_role_behavior(this.currentPhaseData.partner_behavior || null);
        // Apply role to the map icon immediately (WorldState alone does not hide/show it).
        if (this.mapCont && this.mapCont.Partner && this.mapCont.Partner.update_behavior) {
            this.mapCont.Partner.update_behavior();
        }

        // Route to the appropriate setup logic
        switch (this.currentPhaseType) {
            case "partner_belief":
            case "partner_belief_multiple":
                // "partner_belief" is a deprecated alias for "partner_belief_multiple" (spring-cleaning candidate).
                this.flagPartnerBeliefInstructionsShown = false;
                let partnerName = WorldState.get_partner_icon_settings().name;
                let partnerPresent = WorldState.get_current_partner_role() === "active";
                this.instrCont.initializePartnerBeliefInstructions(
                    partnerName,
                    partnerPresent,
                    this.currentPhaseData.bonus_stars_per_correct_answer,
                    this.currentPhaseData.toyboxes_asked.length,
                    this.currentDayNum
                );
                break;
            case "partner_belief_individual_boxes":
                this.flagPartnerBeliefInstructionsShown = false;
                let pbIndPartnerName = WorldState.get_partner_icon_settings().name;
                this.instrCont.initializePartnerBeliefIndividualBoxesInstructions(
                    pbIndPartnerName,
                    this.currentPhaseData.bonus_stars_per_correct_answer,
                    (this.currentPhaseData.questions || []).filter((q) =>
                        q && !String(q.kind || "").startsWith("memory_probe_")
                    ).length,
                    this.currentPhaseData.num_belief_blocks ?? this.currentPhaseData.num_repeated_blocks,
                    this.currentPhaseData.include_practice_trial === true,
                    this.currentPhaseData.include_reality_block_at_end === true,
                    this.currentDayNum
                );
                break;
            case "free_exploration":
                this.setupTrialBasedPhase();
                this.flagExplorationPhaseCompleted = false;
                WorldState.populate_map_with_array_of_Fennimals(this.currentPhaseData.Fennimals_in_phase, true);
                if (this.currentPhaseData.force_climbing_tower_first) this.mapCont.enforce_dome_until_tower_climbed();
                this.instrCont.initializeFreeExplorationInstructions(this.currentPhaseData.interaction_type, this.currentDayNum, this.currentPhaseData.bonus_stars_per_correct_answer === true, this.currentPhaseData.include_Fennefinder, this.currentPhaseData.force_climbing_tower_first === true, this.currentPhaseData.Fennimals_in_phase);
                break;
            case "retrieve_lost_box":
                // Phase always uses retrieve_lost_box trials and forces Fennefinder on.
                this.currentPhaseData.interaction_type = "retrieve_lost_box";
                this.currentPhaseData.include_Fennefinder = true;
                this.setupTrialBasedPhase();
                this.flagExplorationPhaseCompleted = false;
                // box_locations trials may sit at non-home spots — preload those backgrounds.
                this.ensureLocationImagesLoaded(
                    (this.currentPhaseData.Fennimals_in_phase || []).map((t) => [t.location, t.region])
                );
                WorldState.populate_map_with_array_of_Fennimals(this.currentPhaseData.Fennimals_in_phase, true);
                this.mapCont.add_lost_box_icons_on_map(this.currentPhaseData.Fennimals_in_phase);
                if (this.currentPhaseData.force_climbing_tower_first) this.mapCont.enforce_dome_until_tower_climbed();
                this.instrCont.initializeRetrieveLostBoxInstructions(
                    this.currentDayNum,
                    this.currentPhaseData.force_climbing_tower_first === true,
                    this.currentPhaseData.Fennimals_in_phase
                );
                break;
            case "jump_to_trial":
                this.setupTrialBasedPhase();
                if (this.currentPhaseData.skip_instructions) {
                    this.jumpToNextTrial();
                } else {
                    this.instrCont.initializeJumpToTrialInstructions(this.currentPhaseData.interaction_type, this.currentDayNum, this.currentPhaseData.bonus_stars_per_correct_answer, this.currentPhaseData.include_Fennefinder, this.currentPhaseData.Fennimals_in_phase);
                }
                break;
            case "hint_and_search":
                this.setupTrialBasedPhase();
                this.flagHintAndSearchInstructionsShown = false;
                this.instrCont.initializeHintAndSearchPhaseGeneralInstructions(this.currentPhaseData.interaction_type, this.currentPhaseData.hint_type, this.currentDayNum, this.currentPhaseData.bonus_stars_per_correct_answer, this.currentPhaseData.include_Fennefinder, this.currentPhaseData.Fennimals_in_phase);
                if (this.currentPhaseData.skip_instructions) this.instructionsPageClosed();
                break;
            case "on_call":
                this.setupTrialBasedPhase();

                if (!this.currentPhaseData.skip_instructions) {
                    this.flagOnCallInstructionsShown = false;
                    this.instrCont.initializeOnCallPhaseGeneralInstructions(this.currentDayNum, this.currentPhaseData.include_Fennefinder);
                } else {
                    this.flagOnCallInstructionsShown = true;
                    this.startNextTrialInOnCallPhase();
                }
                break;
            case "phone_room":
                this.setupTrialBasedPhase();

                if (this.currentPhaseData.skip_instructions === true) {
                    this.flagPhoneRoomInstructionsShown = true;
                    this.startNextTrialInPhoneRoomPhase();
                } else {
                    this.flagPhoneRoomInstructionsShown = false;
                    this.instrCont.initializePhoneRoomPhaseGeneralInstructions(this.currentDayNum);
                }
                break;
            case "name_recall_task":
                this.instrCont.startNameRecallTask(
                    this.currentDayNum,
                    this.currentPhaseData.bonus_stars_per_correct_answer,
                    this.resolveNameRecallStarterName()
                );
                break;
            case "card_sorting_task":
                this.instrCont.startCardSortingTask(this.currentDayNum, this.currentPhaseData.SpecialSettings);
                break;
            case "Fennimal_attribute_sorting_task":
                this.launchFennimalAttributeSortingTask();
                break;
            case "hat_binding_task":
                this.flagHatBindingInstructionsShown = false;
                if (this.currentPhaseData.skip_instructions === true) {
                    this.flagHatBindingInstructionsShown = true;
                    this.setupHatBindingPhase();
                } else {
                    this.instrCont.initializeHatBindingInstructions(
                        this.currentDayNum,
                        this.currentPhaseData.day_title,
                        this.currentPhaseData.day_body
                    );
                }
                break;
            case "chimera_feature_id":
                this.flagChimeraFeatureIdInstructionsShown = false;
                if (this.currentPhaseData.skip_instructions === true) {
                    this.flagChimeraFeatureIdInstructionsShown = true;
                    this.setupChimeraFeatureIdPhase();
                } else {
                    this.instrCont.initializeChimeraFeatureIdInstructions(
                        this.currentDayNum,
                        this.currentPhaseData.day_title,
                        this.currentPhaseData.day_body
                    );
                }
                break;
            case "morph_task":
                this.flagMorphTaskInstructionsShown = false;
                if (this.currentPhaseData.skip_instructions === true) {
                    this.flagMorphTaskInstructionsShown = true;
                    this.setupMorphTaskPhase();
                } else {
                    this.instrCont.initializeMorphTaskInstructions(
                        this.currentDayNum,
                        this.currentPhaseData.day_title,
                        this.currentPhaseData.day_body
                    );
                }
                break;
            case "morph_task_two_cards":
                // Archived two-polaroid morph; not used by live structures.
                this.flagMorphTaskInstructionsShown = false;
                if (this.currentPhaseData.skip_instructions === true) {
                    this.flagMorphTaskInstructionsShown = true;
                    this.setupMorphTaskTwoCardsPhase();
                } else {
                    this.instrCont.initializeMorphTaskInstructions(
                        this.currentDayNum,
                        this.currentPhaseData.day_title,
                        this.currentPhaseData.day_body
                    );
                }
                break;
            case "hat_drop_task":
            case "hat_drop_gonogo":
                this.flagHatDropInstructionsShown = false;
                if (this.currentPhaseData.skip_instructions === true) {
                    this.flagHatDropInstructionsShown = true;
                    this.setupHatDropPhase();
                } else {
                    this.instrCont.initializeHatDropInstructions(
                        this.currentDayNum,
                        this.currentPhaseData.day_title,
                        this.currentPhaseData.day_body,
                        this.currentPhaseData.type
                    );
                }
                break;
            case "pseudoday":
                if (this.currentPhaseData.information === "new_Fennimals_spotted") {
                    this.instrCont.showPseudoDayInformationPage(this.currentPhaseData.information, this.currentPhaseData.title, this.currentPhaseData.display_text, this.stimuli.get_Fennimals_in_array(this.currentPhaseData.displayed_icons));
                } else {
                    this.instrCont.showPseudoDayInformationPage(this.currentPhaseData.information);
                }
                break;
        }
    }

    setupTrialBasedPhase() {
        this.currentPhaseData.Fennimals_in_phase = this.trialGenerator.generateTrialsForPhase(this.currentPhaseData);
        this.currentPhaseData.number_interactions_in_phase = this.currentPhaseData.Fennimals_in_phase.length;
        this.currentPhaseData.Data = [];
        this.currentTrialNumInDay = 0;
        this.executionQueue = [...this.currentPhaseData.Fennimals_in_phase];
    }

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

    setupPartnerBeliefIndividualBoxesPhase() {
        this.mapCont.disable_map_interactions();
        document.getElementById("Map").style.display = "none";

        // Ensure partner is treated as present for this DV task.
        WorldState.change_partner_role_behavior("active");

        let pLayer = document.getElementById("Fennimals_Layer");
        let currentTask = new PartnerBeliefIndividualBoxesController(
            pLayer,
            this.currentPhaseData,
            () => {
                this.currentPhaseData.answers = this.currentPhaseData.PartnerBeliefAnswers;
                delete this.currentPhaseData.PartnerBeliefAnswers;

                // All answered trial kinds earn stars (practice, distractors, gating/belief/action/reality, probes).
                let starEligibleAnswers = this.currentPhaseData.answers.filter(a =>
                    a.trial_kind === "practice" ||
                    a.trial_kind === "distractor" ||
                    a.trial_kind === "gating" ||
                    a.trial_kind === "belief" ||
                    a.trial_kind === "action_prediction" ||
                    a.trial_kind === "reality" ||
                    a.trial_kind === "memory_probe_box_to_fennimal" ||
                    a.trial_kind === "memory_probe_fennimal_to_toy" ||
                    a.trial_kind === "memory_probe_box_to_sack" ||
                    a.trial_kind === "memory_probe_sack_to_toy"
                );
                let bonusPerCorrect = this.currentPhaseData.bonus_stars_per_correct_answer || 0;
                let earned = starEligibleAnswers.reduce(
                    (sum, ans) => sum + (ans.correct ? bonusPerCorrect : 0),
                    0
                );
                let maxPossible = bonusPerCorrect * starEligibleAnswers.length;

                this.currentPhaseData.bonus_stars_earned = earned;
                this.dataCont.recordStarsEarned(this.currentDayNum, "partner_belief_individual_boxes", earned, maxPossible);

                currentTask.clean_up();
                clear_Fennimals_interaction_layer();
                document.getElementById("Map").style.display = "inherit";
                this.phaseCompleted();
            },
            this
        );
        currentTask.start_sequence();
    }

    setupHatBindingPhase() {
        this.mapCont.disable_map_interactions();
        document.getElementById("Map").style.display = "inherit";
        if (typeof Interface !== "undefined" && Interface.FenneFinder && Interface.FenneFinder.hide) {
            Interface.FenneFinder.hide();
        }

        this.currentPhaseData.Data = [];
        let pLayer = document.getElementById("Fennimals_Layer");
        let currentTask = new HatBindingTaskController(
            pLayer,
            this.currentPhaseData,
            () => {
                this.currentPhaseData.Data = this.currentPhaseData.answers || [];
                currentTask.clean_up();
                clear_Fennimals_interaction_layer();
                document.getElementById("Map").style.display = "inherit";
                this.phaseCompleted();
            },
            this
        );
        currentTask.start_sequence();
    }

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

    setupMorphTaskPhase() {
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

        let currentTask = new MorphTaskController(
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

    prepareChimeraTrialTravel(trial, prevTrial) {
        return new Promise((resolve) => {
            this.mapCont.disable_map_interactions();
            if (this.mapCont.hide_request_instructions_button) this.mapCont.hide_request_instructions_button();
            this.mapCont.Map_Layer.style.display = "none";
            this.mapCont.hide_all_locations();
            this.mapCont.currently_in_location = false;
            let layer = document.getElementById("Fennimals_Layer");
            if (layer) layer.style.display = "inherit";
            if (typeof Interface !== "undefined" && Interface.player_moved_to_new_region) {
                Interface.player_moved_to_new_region("Home");
            }
            resolve("overlay");
        });
    }

    checkIfFennefinderShouldBeShown() {
        Interface.FenneFinder.change_display_mode(this.currentPhaseData.include_Fennefinder);
        if (this.currentPhaseData.include_Fennefinder === true || this.currentPhaseData.include_Fennefinder === "low_power_mode") {
            let targetArr = [];
            if (this.currentPhaseType === "hint_and_search") targetArr = [this.currentTrial];
            if (this.currentPhaseType === "free_exploration" || this.currentPhaseType === "retrieve_lost_box") {
                let fennimalsInWorld = WorldState.get_array_of_Fennimals_on_map();
                targetArr = fennimalsInWorld.filter(f => f.name && !f.visited);
            }
            if (this.currentPhaseType === "on_call") {
                if (this.currentFennimalToSearchFor) targetArr = [this.currentFennimalToSearchFor];
            }

            if (this.currentPhaseData.include_Fennefinder === true) {
                Interface.FenneFinder.update_targets(targetArr);
                Interface.FenneFinder.change_low_power_mode(false);
            }
            if (this.currentPhaseData.include_Fennefinder === "low_power_mode") {
                Interface.FenneFinder.change_low_power_mode(true);
            }
        } else {
            Interface.FenneFinder.hide();
        }
    }

    startNextTrialInHintAndSearchPhase() {
        if (this.executionQueue.length > 0) {
            this.currentTrialNumInDay++;
            this.currentTrial = this.executionQueue.shift();
            WorldState.add_Fennimal_to_map(this.currentTrial);

            this.instrCont.initializeHintAndSearchPhaseTrialInstructions(this.currentTrial, this.currentTrial.hint_type, ((this.currentTrialNumInDay - 1) / this.currentPhaseData.number_interactions_in_phase) * 100);
            AudioCont.play_sound_effect("alert");
            this.mapCont.allow_participant_to_leave_location(true);
        } else {
            this.phaseCompleted();
        }
    }

    jumpToNextTrial() {
        if (this.executionQueue.length > 0) {
            this.currentTrial = this.executionQueue.shift();
            WorldState.add_Fennimal_to_map(this.currentTrial);
            this.mapCont.jump_player_to_location(this.currentTrial.location, this.currentTrial.region);
        } else {
            this.phaseCompleted();
        }
    }

    // --- ON CALL PHASE LOGIC ---
    startNextTrialInOnCallPhase() {
        if (this.executionQueue.length === 0) {
            this.phaseCompleted();
            return;
        }

        this.instrCont.parentElem.innerHTML = "";
        this.instrCont.parentElem.style.display = "none";

        this.currentFennimalToSearchFor = this.executionQueue.shift();

        // --- IDEA 3: THE AUDITORY NUDGE ---
        // Instantly start the ringing beacon, no matter where they are!
        this.isPhoneRinging = true;
        this.mapCont.start_phone_ringing();

        if (this.mapCont.current_region === "Home") {
            this.waitingForPlayerToReturnHome = false;
        } else {
            this.waitingForPlayerToReturnHome = true;
            Interface.Prompt.show_message("I should head back to the phone booth...", 3000);
        }
        // -----------------------------------

        this.mapCont.show_request_instructions_button();
        Interface.FenneFinder.hide();

        this.mapCont.enable_map_interactions();
    }

    playerReturnedHome() {
        if (this.currentPhaseType === "on_call" && this.waitingForPlayerToReturnHome) {
            this.waitingForPlayerToReturnHome = false;
            // We no longer call mapCont.start_phone_ringing() here,
            // because it is already ringing from across the island!
        }
    }

    phoneBoothAnswered() {
        this.isPhoneRinging = false;
        this.mapCont.stop_phone_ringing();
        this.mapCont.disable_map_interactions();

        // FIX 1: Use the global WorldState with a capital W!
        WorldState.rebuild_state_from_available_locations([]);
        WorldState.populate_map_with_array_of_Fennimals([this.currentFennimalToSearchFor], false);


        this.instrCont.setup_on_call_trial_elements(this.currentFennimalToSearchFor);

        // 2. Animate it open!
        this.instrCont.show_on_call_hint();
    }

    checkIfPhoneBoothIsNeeded() {
        let needsBooth = this.experimentIncludesPhaseType("on_call");

        if (!needsBooth) {
            this.mapCont.remove_phone_booth();
        }
    }

    checkIfPhoneRoomAssetIsNeeded() {
        let needsPhoneRoom = this.experimentIncludesPhaseType("phone_room");

        if (!needsPhoneRoom) {
            this.mapCont.remove_phone_room_asset();
        } else if (!document.getElementById("phone_room")) {
            console.warn("Experiment uses phone_room, but #phone_room was not found on the map. Auto-travel will use Home center fallback.");
        }
    }

    phoneRoomAnswered() {
        this.waitingForPhoneRoomHintToClose = true;
        this.instrCont.setupPhoneRoomHintElements(this.currentTrial);
        this.instrCont.showPhoneRoomHint();
    }

    phoneRoomHintClosed() {
        // Capture before any async phone-room teardown.
        let trial = this.currentTrial;
        let skipTravel = this.isHomeOverlayPhoneRoomTrial(trial);

        // closeInstructions() only hides chrome — clear lingering toybox clones so their
        // (legacy) ids cannot pollute later getElementById lookups.
        if (this.instrCont) this.instrCont.clearInstructions();

        if (skipTravel) {
            // Stay at Home narratively: tear down the phone UI without revealing the map
            // (exitRoomBeforeMap would flash the map and look like travel is starting).
            this.phoneRoomCont.exitRoomKeepInteractionLayer(() => {
                this.startPhoneRoomHomeOverlayTrial();
            });
            return;
        }

        this.phoneRoomCont.exitRoomBeforeMap(() => {
            this.mapCont.autoTravelToTrialLocation(this.currentTrial, () => {
                this.mapCont.enter_location(this.currentTrial.location, this.currentTrial.region);
            });
        });
    }

    isHomeOverlayPhoneRoomTrial(trial) {
        if (!trial) return false;
        if (trial.skip_phone_room_autotravel === true) return true;
        let type = trial.interaction_type;
        return type === "box_room" || type === "scan_box_home";
    }

    /**
     * Start a Home overlay trial after the phone-room hint (no travel / enter_location).
     * exitRoomBeforeMap hides Fennimals_Layer; re-show it so the warehouse UI can draw.
     */
    startPhoneRoomHomeOverlayTrial() {
        let fenObj = this.currentTrial;
        if (!fenObj) return;

        // Interface stays visible for locator/prompts, but help has no reopen target mid-overlay.
        this.mapCont.hide_request_instructions_button();

        if (fenObj.visited === false || fenObj.visited === undefined) {
            this.currentInteractionNumInPhase++;
            fenObj.num_in_phase = this.currentInteractionNumInPhase;
        }

        if (this.currentFennimal) {
            try { this.currentFennimal.clean_up(); } catch (err) { console.warn(err); }
            this.currentFennimal = null;
        }
        clear_Fennimals_interaction_layer();

        let interactionLayer = document.getElementById("Fennimals_Layer");
        if (interactionLayer) interactionLayer.style.display = "inherit";

        let partnerPresent = false;
        let role = WorldState.get_current_partner_role();
        if (role && role !== "absent") partnerPresent = true;

        fenObj.time_since_start = Math.round(
            (Date.now() - this.experimentStartTime) / 1000
        );

        this.currentFennimal = TrialFactory.build(
            fenObj.interaction_type,
            fenObj,
            partnerPresent,
            () => this.fennimalInteractionCompleted(fenObj)
        );
        if (this.currentFennimal) this.currentFennimal.start_sequence();
    }

    shouldReturnToPhoneRoomAfterCurrentTrial() {
        let phaseSetting = this.currentPhaseData.return_to_phone_room_after_final_trial;
        let shouldReturnAfterFinalTrial = phaseSetting !== undefined
            ? phaseSetting
            : GenParam.PhoneRoom.returnToPhoneRoomAfterFinalTrial;

        let isFinalPhoneRoomTrial = this.executionQueue.length === 0;

        return !isFinalPhoneRoomTrial || shouldReturnAfterFinalTrial;
    }

    completePhoneRoomTrialAndReturnHome(fenObj) {
        this.mapCont.disable_map_interactions();

        // First leave the location visually, then start the automated return leg.
        this.mapCont.return_to_map();

        setTimeout(() => {
            this.mapCont.autoTravelBackToPhoneRoom(fenObj, () => {
                this.phoneRoomReturnCompleted();
            });
        }, GenParam.map_to_location_transition_speed);
    }

    phoneRoomReturnCompleted() {
        this.mapCont.autoTravelActive = false;
        this.mapCont.disable_map_interactions();
        this.mapCont.remove_all_action_buttons();
        this.mapCont.hide_request_instructions_button();

        this.startNextTrialInPhoneRoomPhase();
    }


    startNextTrialInPhoneRoomPhase() {
        this.mapCont.disable_map_interactions();
        this.mapCont.hide_request_instructions_button();
        Interface.FenneFinder.hide();

        if (this.executionQueue.length === 0) {
            this.phaseCompleted();
            return;
        }

        this.currentTrialNumInDay++;
        this.currentTrial = this.executionQueue.shift();

        WorldState.rebuild_state_from_available_locations([]);
        WorldState.populate_map_with_array_of_Fennimals([this.currentTrial], false);

        this.phoneRoomCont.showRoom(this.currentTrial, () => this.phoneRoomAnswered());
    }


    phaseCompleted() {
        if (this.currentFennimal) {
            try { this.currentFennimal.clean_up(); } catch (err) { console.warn(err); }
            this.currentFennimal = null;
        }
        clear_Fennimals_interaction_layer();

        if (this.sortingCriterionState && this.sortingCriterionState.awaitingRemedial) {
            this.finishSortingCriterionRemedial();
            return;
        }

        // Legacy star logic for trial-based phases
        let totalBonusStarsEarned = 0, maxBonusStars = 0;
        if (this.currentPhaseData.bonus_stars_per_correct_answer) {
            if (["jump_to_trial", "hint_and_search", "free_exploration", "retrieve_lost_box"].includes(this.currentPhaseData.type)) {
                for (let trialNum = 0; trialNum < this.currentPhaseData.Data.length; trialNum++) {
                    if (this.currentPhaseData.Data[trialNum].bonus_stars_earned !== undefined) {
                        totalBonusStarsEarned += this.currentPhaseData.Data[trialNum].bonus_stars_earned === true ? 1 : this.currentPhaseData.Data[trialNum].bonus_stars_earned;
                    }
                    maxBonusStars += this.currentPhaseData.Data[trialNum].bonus_stars_earnable || 0;
                }

                this.currentPhaseData.bonus_stars_earned = totalBonusStarsEarned;
                this.dataCont.recordStarsEarned(this.currentDayNum, this.currentPhaseType, totalBonusStarsEarned, maxBonusStars);
            }
        }

        // FIX 2: Store the phase data NOW, after all stars and variables have been attached!
        this.dataCont.storePhaseData(this.currentPhaseData);

        this.mapCont.reset_map_to_player_in_center();
        this.startNextExperimentPhase();
    }

    // ----------------------------------------------------
    // INSTRUCTIONS & CALLBACKS
    // ----------------------------------------------------

    startPostExperimentQuestionnaire() {
        this.remainingQuestionnairePages = this.stimuli.get_questionnaire_pages_arr();
        this.startNextQuestionnairePage();
    }

    startNextQuestionnairePage() {
        if (this.remainingQuestionnairePages.length > 0) {
            this.instrCont.showQuestionnairePage(this.remainingQuestionnairePages.shift());
        } else {
            this.instrCont.showPaymentScreen(this.dataCont.getPaymentData());
        }
    }

    showNextGeneralInstructionsPage() {
        if (this.currentInstructionsPage === "character_creation") this.dataCont.storeCustomIconData(WorldState);

        if (this.remainingInstructionsPages.length > 0) {
            this.atCheckCont.toggle_recording_state("passive");
            this.currentInstructionsPage = this.remainingInstructionsPages.shift();
            switch (this.currentInstructionsPage) {
                case "consent":
                    this.instrCont.showConsentPage();
                    break;
                case "browser_check_and_full_screen_prompt":
                    this.instrCont.showBrowserCheckAndFullscreenPage();
                    break;
                case "overview":
                    this.instrCont.showOverviewPage();
                    break;
                case "single_sitting":
                    this.instrCont.showSingleSittingPage();
                    break;
                case "card_sorting_task":
                    this.mapCont.disable_map_interactions();
                    this.instrCont.startCardSortingTask(false, undefined);
                    break;
                case "character_creation":
                    this.instrCont.showCharacterCreationScreen(() => this.mapCont.update_player_settings());
                    break;
                case "partner_introduction":
                    this.instrCont.showPartnerIntroductionScreen();
                    break;
            }
        } else {
            this.atCheckCont.toggle_recording_state("active");
            this.startNextExperimentPhase();
            this.dataCont.recordTimestamp("instructions complete");
        }
    }

    // Hook Methods exposed to Instructions/Tasks
    consentProvidedByParticipant() {
        this.dataCont.recordConsentGiven();
    }

    generalInstructionsPageCompleted() {
        this.showNextGeneralInstructionsPage();
    }

    instructionsPageClosed() {
        switch (this.currentPhaseType) {
            case "free_exploration":
            case "retrieve_lost_box":
                if (this.flagExplorationPhaseCompleted) {
                    this.phaseCompleted();
                } else {
                    this.mapCont.enable_map_interactions();
                    this.mapCont.show_request_instructions_button();
                    this.checkIfFennefinderShouldBeShown();
                    if (this.currentPhaseType === "retrieve_lost_box") {
                        // Icons may have been measured while Map was hidden after phone-room.
                        this.mapCont.refresh_lost_box_icons_on_map();
                    }
                }
                break;
            case "hint_and_search":
                if (!this.flagHintAndSearchInstructionsShown) {
                    this.flagHintAndSearchInstructionsShown = true;
                    this.startNextTrialInHintAndSearchPhase();
                } else {
                    this.mapCont.enable_map_interactions();
                    this.mapCont.show_request_instructions_button();
                    this.checkIfFennefinderShouldBeShown();
                }
                break;
            case "jump_to_trial":
            case "jump_to_trial_no_instructions":
                this.jumpToNextTrial();
                break;
            case "on_call":
                if (!this.flagOnCallInstructionsShown) {
                    // 1. The General Instructions page just closed. Start the block!
                    this.flagOnCallInstructionsShown = true;
                    this.startNextTrialInOnCallPhase();
                } else {
                    // 2. The Phone Booth hint just closed. Turn the map back on!
                    this.mapCont.enable_map_interactions();
                    this.mapCont.show_request_instructions_button();
                    this.checkIfFennefinderShouldBeShown();
                }
                break;
            case "partner_belief":
            case "partner_belief_multiple":
                if (!this.flagPartnerBeliefInstructionsShown) {
                    this.flagPartnerBeliefInstructionsShown = true;
                    this.setupPartnerBeliefPhase();
                }
                break;
            case "partner_belief_individual_boxes":
                if (!this.flagPartnerBeliefInstructionsShown) {
                    this.flagPartnerBeliefInstructionsShown = true;
                    this.setupPartnerBeliefIndividualBoxesPhase();
                }
                break;
            case "hat_binding_task":
                if (!this.flagHatBindingInstructionsShown) {
                    this.flagHatBindingInstructionsShown = true;
                    this.setupHatBindingPhase();
                }
                break;
            case "chimera_feature_id":
                if (!this.flagChimeraFeatureIdInstructionsShown) {
                    this.flagChimeraFeatureIdInstructionsShown = true;
                    this.setupChimeraFeatureIdPhase();
                }
                break;
            case "morph_task":
                if (!this.flagMorphTaskInstructionsShown) {
                    this.flagMorphTaskInstructionsShown = true;
                    this.setupMorphTaskPhase();
                }
                break;
            case "morph_task_two_cards":
                if (!this.flagMorphTaskInstructionsShown) {
                    this.flagMorphTaskInstructionsShown = true;
                    this.setupMorphTaskTwoCardsPhase();
                }
                break;
            case "hat_drop_task":
            case "hat_drop_gonogo":
                if (!this.flagHatDropInstructionsShown) {
                    this.flagHatDropInstructionsShown = true;
                    this.setupHatDropPhase();
                }
                break;
            case "pseudoday":
                this.startNextExperimentPhase();
                break;
            case "phone_room":
                if (this.waitingForSwitchBoxReturnReminder) {
                    this.waitingForSwitchBoxReturnReminder = false;
                    this.instrCont.clearInstructions();
                    if (this.instrCont.parentElem) this.instrCont.parentElem.style.display = "none";
                    this.manualReturnTrial = null;
                    if (this.shouldReturnToPhoneRoomAfterCurrentTrial()) {
                        this.phoneRoomReturnCompleted();
                    } else {
                        this.phaseCompleted();
                    }
                    return;
                }
                if (!this.flagPhoneRoomInstructionsShown) {
                    this.flagPhoneRoomInstructionsShown = true;
                    this.startNextTrialInPhoneRoomPhase();
                } else if (this.waitingForPhoneRoomHintToClose) {
                    this.waitingForPhoneRoomHintToClose = false;
                    this.phoneRoomHintClosed();
                } else if (this.instrCont.helpReopenActive) {
                    // Mid-phase help reopen — do not restart travel / overlay.
                    this.instrCont.helpReopenActive = false;
                    if (this.waitingForManualPhoneRoomReturn) {
                        this.mapCont.enable_map_interactions();
                    }
                }
                break;
        }
    }

    instructionsRequested() {
        this.mapCont.disable_map_interactions();
        this.instrCont.instructionsRequestedByParticipant();
    }

    enteringLocation(location) {
        if (this.currentPhaseType === "chimera_feature_id") {
            let layer = document.getElementById("Fennimals_Layer");
            if (layer) layer.style.display = "inherit";
            if (this._chimeraEnterResolve) {
                let done = this._chimeraEnterResolve;
                this._chimeraEnterResolve = null;
                done();
            }
            return;
        }

        let fennimalObject = WorldState.get_reference_to_Fennimal_object_at_location(location);
        if (fennimalObject) {
            if (fennimalObject.visited === false || fennimalObject.visited === undefined) {
                this.currentInteractionNumInPhase++;
                fennimalObject.num_in_phase = this.currentInteractionNumInPhase;
            }

            // Never stack a new scene on top of an uncleared previous interaction.
            if (this.currentFennimal) {
                try { this.currentFennimal.clean_up(); } catch (err) { console.warn(err); }
                this.currentFennimal = null;
            }
            clear_Fennimals_interaction_layer();

            let partnerPresent = false;
            let role = WorldState.get_current_partner_role();
            if (role && role !== "absent") partnerPresent = true;
            if (fennimalObject.interaction_type === "partner_belief_in_situ"
                || fennimalObject.force_partner_present === true) {
                partnerPresent = true;
            }

            // Seconds since experiment start (coarse; stamped at interaction onset).
            fennimalObject.time_since_start = Math.round(
                (Date.now() - this.experimentStartTime) / 1000
            );

            this.currentFennimal = TrialFactory.build(
                fennimalObject.interaction_type,
                fennimalObject,
                partnerPresent,
                () => this.fennimalInteractionCompleted(fennimalObject)
            );
            this.currentFennimal.start_sequence();
        }
    }

    leavingLocation() {
        if (this.currentFennimal) {
            try { this.currentFennimal.clean_up(); } catch (err) { console.warn(err); }
            this.currentFennimal = null;
        }
        // Belt-and-suspenders: wipe any orphan partner/toy/UI nodes left above the map.
        clear_Fennimals_interaction_layer();

        // FIX: Start the next on_call trial only AFTER they have successfully returned to the map
        if (this.currentPhaseType === "on_call" && this.readyForNextOnCallTrial) {
            this.readyForNextOnCallTrial = false;

            // Wait 400ms for the visual screen wipe transition to finish before ringing the phone
            setTimeout(() => {
                this.startNextTrialInOnCallPhase();
            }, 400);
        }

        if (this.waitingForManualPhoneRoomReturn && this.manualReturnTrial) {
            let trial = this.manualReturnTrial;
            setTimeout(() => {
                this.beginManualPhoneRoomReturn(trial);
            }, Math.max(400, 0.5 * GenParam.map_to_location_transition_speed));
        }
    }

    /**
     * After switch_box_without_partner: partner waits at diversion location, walks to player,
     * speech bubble, then player leads home to #phone_room (proximity completes the trial).
     */
    async beginManualPhoneRoomReturn(fenObj) {
        this.waitingForManualPhoneRoomReturn = false;
        this.mapCont.remove_all_action_buttons();
        this.mapCont.Player.disable_movement();

        // Icons may still be opacity-0 from the outbound autotravel arrival fade.
        this.mapCont.resetAutoTravelCharacterIconOpacity();
        this.mapCont.clearAutoTravelChrome();

        // Ensure map chrome is up and partner is visible/active.
        WorldState.change_partner_role_behavior("active");
        this.mapCont.Partner.update_behavior();
        this.mapCont.Partner.setAutoTravelLeadMode(false);
        this.mapCont.Partner.setAutoTravelFollowMode(false);

        let diversion = fenObj.partner_diversion_location;
        let diversionPoint = diversion
            ? this.mapCont.getLocationMarkerPoint(diversion)
            : this.mapCont.getHomeCenterPoint();
        this.mapCont.Partner.jump_to_position(diversionPoint.x, diversionPoint.y);

        // Zoom/region to the trial region so the diversion marker is on-screen.
        if (fenObj.region) {
            this.mapCont.forceAutoTravelRegion(fenObj.region);
        }

        // Make sure both icons are visible before the approach / speech bubble.
        this.mapCont.resetAutoTravelCharacterIconOpacity();

        await wait(350);
        await this.mapCont.animatePartnerToPlayer(1200);

        await Interface.showPartnerSpeechBubble({
            target: this.mapCont.Partner.PartnerIcon,
            context: "map",
            text: "Lets go back home — you lead the way!",
            buttonLabel: "Got it!"
        });

        this.mapCont.Partner.setAutoTravelFollowMode(false);
        this.mapCont.Partner.update_behavior();
        Interface.Prompt.show_message("Lets go back home!");
        this.mapCont.enable_map_interactions();
        this.mapCont.startPhoneRoomProximityReturnWatch(() => {
            Interface.Prompt.hide();
            this.mapCont.stopPhoneRoomProximityReturnWatch();
            this.mapCont.runManualPhoneRoomArrivalSequence(() => {
                this.showSwitchBoxReturnReminder(fenObj);
            });
        });
    }

    showSwitchBoxReturnReminder(fenObj) {
        this.waitingForSwitchBoxReturnReminder = true;
        this.manualReturnTrial = fenObj;

        let partnerName = WorldState.get_partner_icon_settings().name || "your partner";
        let boxName = GenParam.get_box_printed_name(fenObj.toybox);

        this.mapCont.disable_map_interactions();
        this.instrCont.showSimpleInformationPage({
            title: "One more thing...",
            text:
                `After returning back to the phone room, you forgot to tell ${partnerName} ` +
                `that you replaced the contents of the ${boxName}.`
        });
    }

    fennimalInteractionCompleted(fenObj) {
        let fennimalPreviouslyVisited = fenObj.visited !== undefined;
        WorldState.Fennimal_encounter_finshed(fenObj.name);
        fenObj.visited = true;
        fenObj.search_status = "searched_Fennimal_visited";

        if (GenParam.DisplayFoundFennimalIconsOnMap.show) {
            this.mapCont.add_Fennimal_icon_on_map(fenObj);
        }

        if (this.currentPhaseType === "retrieve_lost_box") {
            this.mapCont.remove_lost_box_icon_at_location(fenObj.location);
        }

        this.currentPhaseData.Data.push(JSON.parse(JSON.stringify(fenObj)));

        switch (this.currentPhaseType) {
            case "free_exploration":
            case "retrieve_lost_box":
                this.instrCont.updateProgressWithinDay((this.currentInteractionNumInPhase / this.currentPhaseData.number_interactions_in_phase) * 100);
                if (!fennimalPreviouslyVisited) {
                    this.explorationPhaseAddPhoto();
                } else {
                    this.mapCont.allow_participant_to_leave_location(true);
                }
                break;
            case "hint_and_search":
                this.instrCont.updateProgressWithinDay((this.currentInteractionNumInPhase / this.currentPhaseData.number_interactions_in_phase) * 100);
                if (fenObj.name === this.currentTrial.name) {
                    Interface.Prompt.show_message("Time to find the next Fennimal!");
                    this.startNextTrialInHintAndSearchPhase();
                } else {
                    this.mapCont.allow_participant_to_leave_location(true);
                }
                break;
            case "jump_to_trial":
            case "jump_to_trial_no_instructions":
                setTimeout(() => {
                    this.mapCont.return_to_map();
                    this.jumpToNextTrial();
                }, 500);
                break;
            case "on_call":
                this.instrCont.updateProgressWithinDay((this.currentInteractionNumInPhase / this.currentPhaseData.number_interactions_in_phase) * 100);

                // FIX: Flag that we are ready, then allow them to leave the location first!
                this.readyForNextOnCallTrial = true;
                this.mapCont.allow_participant_to_leave_location(true);
                break;
            case "phone_room":
                this.instrCont.updateProgressWithinDay(
                    (this.currentInteractionNumInPhase / this.currentPhaseData.number_interactions_in_phase) * 100
                );

                // The return leg is part of the trial lifecycle unless this is the final trial
                // and final-return has explicitly been disabled.
                setTimeout(() => {
                    // Home overlays never left Home / never autotraveled — skip the return walk.
                    if (this.isHomeOverlayPhoneRoomTrial(fenObj)) {
                        if (this.currentFennimal) {
                            try { this.currentFennimal.clean_up(); } catch (err) { console.warn(err); }
                            this.currentFennimal = null;
                        }
                        clear_Fennimals_interaction_layer();
                        if (this.shouldReturnToPhoneRoomAfterCurrentTrial()) {
                            this.phoneRoomReturnCompleted();
                        } else {
                            this.phaseCompleted();
                        }
                        return;
                    }

                    // Manual walk-home (e.g. switch_box_without_partner): show return arrow.
                    if (fenObj.return_travel === "manual") {
                        this.waitingForManualPhoneRoomReturn = true;
                        this.manualReturnTrial = fenObj;
                        this.mapCont.allow_participant_to_leave_location(true);
                        return;
                    }

                    if (this.shouldReturnToPhoneRoomAfterCurrentTrial()) {
                        this.completePhoneRoomTrialAndReturnHome(fenObj);
                    } else {
                        this.phaseCompleted();
                    }
                }, 500);
                break;
        }
    }

    explorationPhaseAddPhoto() {
        let allFennimals = WorldState.get_array_of_Fennimals_on_map();
        let allFound = allFennimals.every(f => f.name === undefined || f.visited === true);

        if (allFound) {
            this.flagExplorationPhaseCompleted = true;
            if (this.currentPhaseType === "retrieve_lost_box") {
                this.instrCont.showRetrieveLostBoxCompletionScreen();
            } else {
                this.instrCont.showFreeExplorationCompletionScreen();
            }
        } else {
            this.mapCont.allow_participant_to_leave_location(true);
        }
    }

    // ----------------------------------------------------
    // EXTERNAL ORTHOGONAL TASK CALLBACKS
    // ----------------------------------------------------

    /**
     * Optional name_recall_task seed. Prompt-only. Missing hatBindingAssignment
     * silently falls back to unseeded copy.
     *
     * pair_based / group_based: one of the two selected triad arms (never hub).
     * control: no bound pair — one of all_arms (the spokes; never hub).
     */
    resolveNameRecallStarterName() {
        let phase = this.currentPhaseData;
        if (!phase || phase.seed_recall_with_arm_name !== true) return null;

        const stampStarter = (id, name) => {
            phase.starter_name_id = id != null ? id : null;
            phase.starter_name = name != null ? name : null;
            if (this.dataCont && this.dataCont.setNameRecallStarter) {
                this.dataCont.setNameRecallStarter(phase.starter_name_id, phase.starter_name);
            }
        };

        let assignment = (this.dataCont && this.dataCont.experimentData)
            ? this.dataCont.experimentData.hatBindingAssignment
            : null;
        if (!assignment) {
            stampStarter(null, null);
            return null;
        }

        let hubId = assignment.hub != null ? String(assignment.hub) : null;
        let selectedArms = Array.isArray(assignment.selected_arms)
            ? assignment.selected_arms.map(String)
            : [];
        let allArms = Array.isArray(assignment.all_arms)
            ? assignment.all_arms.map(String)
            : [];
        // Control never binds a pair, so sample from all spokes. Bound
        // conditions use the two selected triad arms.
        let pool = (assignment.condition === "control") ? allArms : selectedArms;
        let candidates = pool.filter((id) => id && id !== hubId);

        if (!candidates.length) {
            stampStarter(null, null);
            return null;
        }

        let pickedId = null;
        if (this.dataCont && this.dataCont.getOrCreateNameRecallStarterArm) {
            pickedId = this.dataCont.getOrCreateNameRecallStarterArm("name_recall_starter_arm", candidates);
        } else {
            pickedId = candidates[Math.floor(Math.random() * candidates.length)];
        }

        let fens = (pickedId && this.stimuli && typeof this.stimuli.get_Fennimals_in_array === "function")
            ? this.stimuli.get_Fennimals_in_array([pickedId])
            : [];
        let fen = (fens && fens[0]) || null;
        if (!fen || !fen.name) {
            stampStarter(pickedId || null, null);
            return null;
        }

        stampStarter(fen.id, fen.name);
        return fen.name;
    }

    recalledNamesTaskComplete(recalledNames) {
        let evaluationResult = TaskEvaluator.evaluateRecallData(recalledNames, this.stimuli, this.currentPhaseData.allowed_Levenshtein_distance_for_match);

        this.currentPhaseData.RecalledNames = evaluationResult.processedNames;
        this.currentPhaseData.Array_of_recalled_IDs = evaluationResult.uniqueMatchedIds;

        if (this.currentPhaseData.bonus_stars_per_correct_answer > 0) {
            let starsEarned = evaluationResult.uniqueMatchedIds.length * this.currentPhaseData.bonus_stars_per_correct_answer;
            let maxStars = evaluationResult.totalPossibleFennimals * this.currentPhaseData.bonus_stars_per_correct_answer;
            this.dataCont.recordStarsEarned(this.currentDayNum, this.currentPhaseType, starsEarned, maxStars);
        }

        this.dataCont.storePhaseData(this.currentPhaseData);
        this.startNextExperimentPhase();
    }

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

    sortingTaskCompleted(data) {
        let errors = JSON.parse(JSON.stringify(data || []));
        this.currentPhaseData.Errors = errors;

        if (this.isSortingCriterionPhase(this.currentPhaseData)) {
            this.handleSortingCriterionAttempt(errors);
            return;
        }

        if (this.currentPhaseData.maximum_earnable_stars > 0) {
            let starsEarned = Math.max(0, this.currentPhaseData.maximum_earnable_stars - errors.length);
            this.dataCont.recordStarsEarned(this.currentDayNum, "Sorting Task", starsEarned, this.currentPhaseData.maximum_earnable_stars);
            this.currentPhaseData.bonus_stars_earned = starsEarned; // Good practice to attach it here too
        }

        // Store AFTER calculating stars
        this.dataCont.storePhaseData(this.currentPhaseData);
        this.startNextExperimentPhase();
    }

    isSortingCriterionPhase(phase) {
        return !!(phase && phase.type === "Fennimal_attribute_sorting_task" && (phase.on_fail || phase.max_attempts));
    }

    launchFennimalAttributeSortingTask() {
        let fensToAsk = this.currentPhaseData.Fennimals_asked || this.currentPhaseData.Fennimals_encountered;
        let maxStars = this.currentPhaseData.maximum_bonus_stars_earned !== undefined
            ? this.currentPhaseData.maximum_bonus_stars_earned
            : this.currentPhaseData.maximum_earnable_stars;

        this.instrCont.startFennimalAttributeSortingTask(
            this.currentDayNum,
            this.stimuli.get_Fennimals_in_array(fensToAsk),
            this.currentPhaseData.attribute_order,
            maxStars,
            this.currentPhaseData.presentation
        );
    }

    handleSortingCriterionAttempt(errors) {
        let phase = this.currentPhaseData;
        if (!Array.isArray(phase.quiz_attempts)) phase.quiz_attempts = [];

        let passAtMost = (typeof phase.pass_if_errors_at_most === "number") ? phase.pass_if_errors_at_most : 0;
        let maxAttempts = (typeof phase.max_attempts === "number") ? phase.max_attempts : 3;
        let passed = errors.length <= passAtMost;
        let attemptIndex = phase.quiz_attempts.length + 1;

        phase.quiz_attempts.push({
            attempt: attemptIndex,
            n_errors: errors.length,
            passed: passed,
            errors: errors
        });

        if (passed) {
            this.finishSortingCriterion(true);
            return;
        }

        if (attemptIndex < maxAttempts && phase.on_fail) {
            this.instrCont.showSortingCriterionRetryPage();
            return;
        }

        this.finishSortingCriterion(false);
    }

    finishSortingCriterion(passed) {
        let phase = this.currentPhaseData;
        let maxStars = (typeof phase.maximum_earnable_stars === "number") ? phase.maximum_earnable_stars : 0;
        let starsEarned = passed ? maxStars : 0;

        phase.quiz_passed = passed;
        phase.bonus_stars_earned = starsEarned;
        this.sortingCriterionState = null;

        if (maxStars > 0) {
            this.dataCont.recordStarsEarned(this.currentDayNum, "Sorting Task", starsEarned, maxStars);
        }
        this.dataCont.storePhaseData(phase);

        if (passed) {
            this.startNextExperimentPhase();
            return;
        }

        this.instrCont.showSortingCriterionFailPage();
    }

    startSortingCriterionRemedial() {
        if (this.instrCont) this.instrCont.clearInstructions();

        let host = this.currentPhaseData;
        let spec = JSON.parse(JSON.stringify(host.on_fail || {}));
        spec.type = spec.type || "phone_room";
        spec.interaction_type = spec.interaction_type || "photo_Fennimal";
        spec.Fennimals_encountered = spec.Fennimals_encountered
            || spec.Fennimals_asked
            || host.Fennimals_asked
            || host.Fennimals_encountered;
        if (spec.skip_instructions !== false) spec.skip_instructions = true;
        if (spec.include_Fennefinder !== true) spec.include_Fennefinder = false;
        if (spec.return_to_phone_room_after_final_trial !== false) spec.return_to_phone_room_after_final_trial = true;
        if (spec.partner_behavior === undefined) spec.partner_behavior = "absent";

        this.sortingCriterionState = {
            hostPhase: host,
            hostDayNum: this.currentDayNum,
            hostPhaseNum: this.currentPhaseNum,
            awaitingRemedial: true
        };

        this.currentPhaseData = spec;
        this.currentPhaseType = spec.type;
        this.currentInteractionNumInPhase = 0;
        this.waitingForPhoneRoomHintToClose = false;

        WorldState.clear_all_locations(true);
        WorldState.change_partner_role_behavior(spec.partner_behavior || null);
        if (this.mapCont && this.mapCont.Partner && this.mapCont.Partner.update_behavior) {
            this.mapCont.Partner.update_behavior();
        }

        this.setupTrialBasedPhase();
        this.flagPhoneRoomInstructionsShown = true;
        this.startNextTrialInPhoneRoomPhase();
    }

    finishSortingCriterionRemedial() {
        let state = this.sortingCriterionState;
        let host = state && state.hostPhase;
        if (!host) {
            this.sortingCriterionState = null;
            this.startNextExperimentPhase();
            return;
        }

        let remedial = this.currentPhaseData;
        if (!Array.isArray(host.remedial_runs)) host.remedial_runs = [];
        host.remedial_runs.push({
            after_attempt: (host.quiz_attempts || []).length,
            type: remedial.type,
            interaction_type: remedial.interaction_type,
            Data: remedial.Data || []
        });

        this.currentPhaseData = host;
        this.currentPhaseType = "Fennimal_attribute_sorting_task";
        this.currentDayNum = state.hostDayNum;
        this.currentPhaseNum = state.hostPhaseNum;
        this.sortingCriterionState.awaitingRemedial = false;

        this.mapCont.reset_map_to_player_in_center();
        this.mapCont.disable_map_interactions();
        this.launchFennimalAttributeSortingTask();
    }

    sortingCriterionFailedContinue() {
        this.remainingExperimentPhases = [];
        if (this.dataCont && this.dataCont.experimentData) {
            this.dataCont.experimentData.quiz_criterion_failed = true;
        }
        this.startPostExperimentQuestionnaire();
    }

    questionnairePageCompleted(pageData) {
        this.dataCont.storeQuestionnaireData(pageData);
        this.startNextQuestionnairePage();
    }

    experimentIncludesPhaseType(phaseType) {
        if (!this.stimulusSettings || !Array.isArray(this.stimulusSettings.Experiment_Structure)) {
            return false;
        }

        return this.stimulusSettings.Experiment_Structure.some((phase) => {
            if (!phase) return false;
            if (phase.type === phaseType) return true;
            if (phase.on_fail && phase.on_fail.type === phaseType) return true;
            return false;
        });
    }

    submitExperiment() {
        let completionCode = this.dataCont.getCompletionCode();
        let prolificURL = `https://app.prolific.com/submissions/complete?cc=${completionCode}`;

        // Call your new DRY function, passing true for the final save
        this.dataCont.storeAllData(true)
            .then(() => {
                // SUCCESS: Redirect instantly
                window.location.href = prolificURL;
            })
            .catch((error) => {
                // FAILSAFE: If the internet drops at the exact moment they finish
                console.error("Final save failed:", error);
                alert("Your data is safe, but we had a connection hiccup. Your Prolific completion code is: " + completionCode + ". Click OK to return to Prolific.");
                window.location.href = prolificURL;
            });
    }
}