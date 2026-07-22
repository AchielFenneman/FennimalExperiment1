// ----------------------------------------------------
// 1. DATA CONTROLLER
// ----------------------------------------------------
class DataController {
    constructor(stimuli, attentionCheckController, startTime) {
        this.stimuli = stimuli;
        this.attentionCheckController = attentionCheckController;
        this.startTime = startTime;

        this.experimentData = {
            expCode: this.stimuli.get_experiment_code(),
            startDate: new Date().toString(),
            browser: getBrowser(),
            pid: false,
            timeStamps: [],
            storedData: [],
            questionnaire: [],
            paymentData: null,
            fennimals: [],
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
    }

    recordConsentGiven() {
        this.experimentData.consentGivenTime = Date.now() - this.startTime;
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

    storeAllData(bool_experiment_completed) {
        console.log("Storing data...");

        if (bool_experiment_completed === true) {
            this.experimentData.experimentCompleted = true;
        }

        // FIX 4: Actively sync duration and attention checks on every partial save!
        this.experimentData.totalDuration = Math.round((Date.now() - this.startTime) / 1000);
        if (this.attentionCheckController) {
            this.experimentData.attentionData = this.attentionCheckController.get_attention_rep();
        }

        // FIX 1: Safely handle expCode whether it is an array ["mentalizing"] or a string "mentalizing"
        let expString = Array.isArray(this.experimentData.expCode) ? this.experimentData.expCode[0] : this.experimentData.expCode;
        let folder_name = expString || "Default_Experiment";

        let doc_name = this.experimentData.pid ? this.experimentData.pid : "NO_PID_" + this.startTime;

        if (window.saveToFirebase) {
            return window.saveToFirebase(folder_name, doc_name, this.experimentData);
        } else {
            return Promise.resolve(true);
        }
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
    constructor(stimuli) {
        this.stimuli = stimuli;
    }

    generateTrialsForPhase(phaseData) {
        this.validatePhaseTrialSpec(phaseData);

        let mainTrials;
        let orthogonalTrials = [];

        if (Array.isArray(phaseData.trial_subblocks)) {
            // Ordered subblocks: shuffle within each, then concatenate (preserves subblock order).
            mainTrials = this.generateTrialsFromSubblocks(phaseData);
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

        // Stamp block-level ask_toy / ask_box / ask_Fennimal onto every trial in the block (main + orthogonal).
        mainTrials = this.applyAskToySettingsToTrials(mainTrials, phaseData);
        orthogonalTrials = this.applyAskToySettingsToTrials(orthogonalTrials, phaseData);
        mainTrials = this.applyAskBoxSettingsToTrials(mainTrials, phaseData);
        orthogonalTrials = this.applyAskBoxSettingsToTrials(orthogonalTrials, phaseData);
        mainTrials = this.applyAskFennimalSettingsToTrials(mainTrials, phaseData);
        orthogonalTrials = this.applyAskFennimalSettingsToTrials(orthogonalTrials, phaseData);

        if (Array.isArray(phaseData.trial_subblocks)) {
            // Subblock order is intentional; do not re-shuffle across subblock boundaries.
            return mainTrials;
        }

        return this.smartShuffleTrials(mainTrials, orthogonalTrials);
    }

    /**
     * Fail loud on ambiguous / conflicting trial specs so experiment setup mistakes are obvious in testing.
     */
    validatePhaseTrialSpec(phaseData) {
        let hasSubblocks = Array.isArray(phaseData.trial_subblocks);
        let hasTopLevelFennimals = phaseData.Fennimals_encountered !== undefined && phaseData.Fennimals_encountered !== null;
        let hasTopLevelInteractionType = phaseData.interaction_type !== undefined && phaseData.interaction_type !== null;

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

        if (!hasTopLevelFennimals) {
            throw new Error(
                `TrialGenerator: phase type "${phaseData.type}" is missing Fennimals_encountered ` +
                `(and has no trial_subblocks).`
            );
        }

        if (!hasTopLevelInteractionType) {
            throw new Error(
                `TrialGenerator: phase type "${phaseData.type}" is missing interaction_type ` +
                `(and has no trial_subblocks).`
            );
        }
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

        if (hasTrials && (hasCartesianFennimals || hasCartesianInteraction)) {
            throw new Error(
                `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}] mixes explicit trials with ` +
                `Fennimals_encountered / interaction_type. Use either a cartesian subblock ` +
                `({ Fennimals_encountered, interaction_type }) OR an explicit list ({ trials: [...] }), not both.`
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
                if (!trialSpec.Fennimal) {
                    throw new Error(
                        `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].trials[${trialIndex}] ` +
                        `is missing required field "Fennimal".`
                    );
                }
                if (trialSpec.interaction_type === undefined || trialSpec.interaction_type === null) {
                    throw new Error(
                        `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].trials[${trialIndex}] ` +
                        `is missing required field "interaction_type".`
                    );
                }
            });
            return;
        }

        if (!hasCartesianFennimals || !hasCartesianInteraction) {
            throw new Error(
                `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}] must define either ` +
                `"trials: [...]" OR both "Fennimals_encountered" and "interaction_type".`
            );
        }

        if (!Array.isArray(subblock.Fennimals_encountered) || subblock.Fennimals_encountered.length === 0) {
            throw new Error(
                `TrialGenerator: phase type "${phaseType}" trial_subblocks[${index}].Fennimals_encountered ` +
                `must be a non-empty array.`
            );
        }
    }

    generateTrialsFromSubblocks(phaseData) {
        let allTrials = [];

        phaseData.trial_subblocks.forEach((subblock, subblockIndex) => {
            let subblockTrials;

            if (Array.isArray(subblock.trials)) {
                subblockTrials = this.generateExplicitTrials(subblock.trials, phaseData);
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
            let fenArr = this.stimuli.get_Fennimals_in_array([trialSpec.Fennimal]);
            if (!fenArr || fenArr.length === 0) {
                throw new Error(
                    `TrialGenerator: unknown Fennimal id "${trialSpec.Fennimal}" in an explicit trial_subblocks trial ` +
                    `(phase type "${phaseData.type}", trials[${trialIndex}]).`
                );
            }

            let trial = JSON.parse(JSON.stringify(fenArr[0]));
            trial.interaction_type = trialSpec.interaction_type;
            this.applyPhaseHintTypeIfNeeded(trial, phaseData);
            trials.push(trial);
        });

        return trials;
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
            let newSet = set_property_to_all_elem_in_arr(
                "interaction_type",
                interactionTypesArr[i],
                JSON.parse(JSON.stringify(baseFennimalSet))
            );
            newSet.forEach(trial => this.applyPhaseHintTypeIfNeeded(trial, phaseData));
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
            if (toysAskedMapped.length === 0) {
                console.warn("ask_toy is true but no toys_asked / phase toys could be resolved");
            }
        }

        trials = set_property_to_all_elem_in_arr("ask_toy", true, trials);
        trials = set_property_to_all_elem_in_arr("toys_asked", toysAskedMapped, trials);
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
            if (boxesAskedMapped.length === 0) {
                console.warn("ask_box is true but no boxes_asked / phase toyboxes could be resolved");
            }
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
     * Stamp ask_Fennimal onto all trials. fennimals_asked defaults to every Fennimal id in the phase
     * (union across trial_subblocks when present). Also stamps fennimals_asked_objects for head UI.
     */
    applyAskFennimalSettingsToTrials(trials, phaseData) {
        if (!phaseData.ask_Fennimal || !trials || trials.length === 0) return trials;

        let ids = Array.isArray(phaseData.fennimals_asked) && phaseData.fennimals_asked.length > 0
            ? [...phaseData.fennimals_asked]
            : this.collectFennimalIdsInPhase(phaseData);

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

    collectFennimalIdsInPhase(phaseData) {
        let idSet = new Set();

        if (Array.isArray(phaseData.trial_subblocks)) {
            phaseData.trial_subblocks.forEach((subblock) => {
                if (Array.isArray(subblock.trials)) {
                    subblock.trials.forEach((trialSpec) => {
                        if (trialSpec && trialSpec.Fennimal) idSet.add(trialSpec.Fennimal);
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

    smartShuffleTrials(mainTrials, orthogonalTrials) {
        // 1. Dump EVERYTHING into one single pool right away and shuffle it completely
        let combinedPool = [...mainTrials, ...orthogonalTrials];
        let remainingPool = shuffleArray(combinedPool);

        let sequence = [];

        // 2. Smart Shuffle Loop
        while (remainingPool.length > 0) {
            let lastId = sequence.length > 0 ? sequence[sequence.length - 1].id : null;
            let nextIndex = remainingPool.findIndex(item => item.id !== lastId);

            if (nextIndex !== -1) {
                // Perfect fit: We found a trial with a different Fennimal ID
                sequence.push(remainingPool.splice(nextIndex, 1)[0]);
            } else {
                // Collision! All remaining items in the pool belong to the exact same Fennimal.
                let problematicItem = remainingPool.shift();
                let swapped = false;

                // Look backwards through our already built sequence to find a safe place to swap it into
                for (let j = 0; j < sequence.length - 1; j++) {
                    let prevId = j > 0 ? sequence[j - 1].id : null;
                    let nextId = sequence[j + 1].id;
                    let candidateToMoveToEnd = sequence[j];

                    // Can we safely wedge the problematic item between index j-1 and j+1?
                    if (problematicItem.id !== prevId && problematicItem.id !== nextId) {
                        // If we move the item currently sitting at j to the very end, will it collide?
                        if (candidateToMoveToEnd.id !== lastId) {
                            // Swap successful!
                            sequence.splice(j, 1, problematicItem);
                            sequence.push(candidateToMoveToEnd);
                            swapped = true;
                            break;
                        }
                    }
                }

                if (!swapped) {
                    // Give up: It is mathematically impossible to separate them (e.g. four S1s in a 6-item list)
                    sequence.push(problematicItem);
                }
            }
        }

        return sequence;
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
        this.svgReducer = new SVGREDUCER(this.stimuli);
        this.trialGenerator = new TrialGenerator(this.stimuli);

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

        this.flagExplorationPhaseCompleted = false;
        this.flagHintAndSearchInstructionsShown = false;

        this.remainingInstructionsPages = this.stimuli.get_instruction_pages_arr();
        this.currentInstructionsPage = null;
        this.remainingQuestionnairePages = [];
    }

    startExperiment() {
        this.checkIfPhoneBoothIsNeeded();
        this.checkIfPhoneRoomAssetIsNeeded();
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

        WorldState.change_partner_role_behavior(this.currentPhaseData.partner_behavior || null);

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
                    (this.currentPhaseData.questions || []).length,
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
                this.instrCont.startNameRecallTask(this.currentDayNum, this.currentPhaseData.bonus_stars_per_correct_answer);
                break;
            case "card_sorting_task":
                this.instrCont.startCardSortingTask(this.currentDayNum, this.currentPhaseData.SpecialSettings);
                break;
            case "Fennimal_attribute_sorting_task":
                let fensToAsk = this.currentPhaseData.Fennimals_asked || this.currentPhaseData.Fennimals_encountered;
                let maxStars = this.currentPhaseData.maximum_bonus_stars_earned !== undefined ? this.currentPhaseData.maximum_bonus_stars_earned : this.currentPhaseData.maximum_earnable_stars;

                this.instrCont.startFennimalAttributeSortingTask(
                    this.currentDayNum,
                    this.stimuli.get_Fennimals_in_array(fensToAsk),
                    this.currentPhaseData.attribute_order,
                    maxStars,
                    this.currentPhaseData.presentation
                );
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

        // PartnerBeliefMultipleController (PartnerBeliefTaskController remains a deprecated alias).
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

                let experimentalAnswers = this.currentPhaseData.answers.filter(a =>
                    a.trial_kind === "belief" || a.trial_kind === "reality"
                );
                let bonusPerCorrect = this.currentPhaseData.bonus_stars_per_correct_answer || 0;
                let earned = experimentalAnswers.reduce(
                    (sum, ans) => sum + (ans.correct ? bonusPerCorrect : 0),
                    0
                );
                let nBlocks = (typeof this.currentPhaseData.num_belief_blocks === "number" && this.currentPhaseData.num_belief_blocks > 0)
                    ? this.currentPhaseData.num_belief_blocks
                    : ((typeof this.currentPhaseData.num_repeated_blocks === "number" && this.currentPhaseData.num_repeated_blocks > 0)
                        ? this.currentPhaseData.num_repeated_blocks
                        : 1);
                let nQuestions = (this.currentPhaseData.questions || []).length;
                let maxPossible = (this.currentPhaseData.bonus_stars_per_correct_answer || 0) * nQuestions * nBlocks;
                if (this.currentPhaseData.include_reality_block_at_end === true) {
                    maxPossible += (this.currentPhaseData.bonus_stars_per_correct_answer || 0) * nQuestions;
                }

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

    checkIfFennefinderShouldBeShown() {
        Interface.FenneFinder.change_display_mode(this.currentPhaseData.include_Fennefinder);
        if (this.currentPhaseData.include_Fennefinder === true || this.currentPhaseData.include_Fennefinder === "low_power_mode") {
            let targetArr = [];
            if (this.currentPhaseType === "hint_and_search") targetArr = [this.currentTrial];
            if (this.currentPhaseType === "free_exploration") {
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
        this.phoneRoomCont.exitRoomBeforeMap(() => {
            this.mapCont.autoTravelToTrialLocation(this.currentTrial, () => {
                this.mapCont.enter_location(this.currentTrial.location, this.currentTrial.region);
            });
        });
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
        this.mapCont.disable_map_interactions();
        this.mapCont.remove_all_action_buttons();

        if (this.mapCont.RequestInstructionsButton) {
            this.mapCont.RequestInstructionsButton.style.display = "none";
        }

        this.startNextTrialInPhoneRoomPhase();
    }


    startNextTrialInPhoneRoomPhase() {
        this.mapCont.disable_map_interactions();
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

        // Legacy star logic for trial-based phases
        let totalBonusStarsEarned = 0, maxBonusStars = 0;
        if (this.currentPhaseData.bonus_stars_per_correct_answer) {
            if (["jump_to_trial", "hint_and_search", "free_exploration"].includes(this.currentPhaseData.type)) {
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
                if (this.flagExplorationPhaseCompleted) {
                    this.phaseCompleted();
                } else {
                    this.mapCont.enable_map_interactions();
                    this.mapCont.show_request_instructions_button();
                    this.checkIfFennefinderShouldBeShown();
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
            case "pseudoday":
                this.startNextExperimentPhase();
                break;
            case "phone_room":
                if (!this.flagPhoneRoomInstructionsShown) {
                    this.flagPhoneRoomInstructionsShown = true;
                    this.startNextTrialInPhoneRoomPhase();
                } else if (this.waitingForPhoneRoomHintToClose) {
                    this.waitingForPhoneRoomHintToClose = false;
                    this.phoneRoomHintClosed();
                }
                break;
        }
    }

    instructionsRequested() {
        this.mapCont.disable_map_interactions();
        this.instrCont.instructionsRequestedByParticipant();
    }

    enteringLocation(location) {
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
    }

    fennimalInteractionCompleted(fenObj) {
        let fennimalPreviouslyVisited = fenObj.visited !== undefined;
        WorldState.Fennimal_encounter_finshed(fenObj.name);
        fenObj.visited = true;
        fenObj.search_status = "searched_Fennimal_visited";

        if (GenParam.DisplayFoundFennimalIconsOnMap.show) {
            this.mapCont.add_Fennimal_icon_on_map(fenObj);
        }

        this.currentPhaseData.Data.push(JSON.parse(JSON.stringify(fenObj)));

        switch (this.currentPhaseType) {
            case "free_exploration":
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
            this.instrCont.showFreeExplorationCompletionScreen();
        } else {
            this.mapCont.allow_participant_to_leave_location(true);
        }
    }

    // ----------------------------------------------------
    // EXTERNAL ORTHOGONAL TASK CALLBACKS
    // ----------------------------------------------------

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
        this.currentPhaseData.Errors = JSON.parse(JSON.stringify(data));

        if (this.currentPhaseData.maximum_earnable_stars > 0) {
            let starsEarned = Math.max(0, this.currentPhaseData.maximum_earnable_stars - data.length);
            this.dataCont.recordStarsEarned(this.currentDayNum, "Sorting Task", starsEarned, this.currentPhaseData.maximum_earnable_stars);
            this.currentPhaseData.bonus_stars_earned = starsEarned; // Good practice to attach it here too
        }

        // Store AFTER calculating stars
        this.dataCont.storePhaseData(this.currentPhaseData);
        this.startNextExperimentPhase();
    }

    questionnairePageCompleted(pageData) {
        this.dataCont.storeQuestionnaireData(pageData);
        this.startNextQuestionnairePage();
    }

    experimentIncludesPhaseType(phaseType) {
        if (!this.stimulusSettings || !Array.isArray(this.stimulusSettings.Experiment_Structure)) {
            return false;
        }

        return this.stimulusSettings.Experiment_Structure.some(phase => phase.type === phaseType);
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