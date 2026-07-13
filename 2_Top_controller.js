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
            this.experimentData.pid = pid.replace(/\D/g, "").substring(0, 4);
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
        this.experimentData.storedData.push(JSON.parse(JSON.stringify(cleanDataObj)));
        this.recordTimestamp(cleanDataObj.type);
        this.storeAllData(false)
    }

    storeAllData(bool_experiment_completed) {
        // e.g., "mentalizing"
        let folder_name = this.experimentData.expCode || "Default_Experiment";
        let doc_name = this.experimentData.pid ? this.experimentData.pid : "NO_PID_" + this.startTime;

        if (window.saveToFirebase) {
            window.saveToFirebase(folder_name, doc_name, this.experimentData);
        }
        if(bool_experiment_completed === true) { this.experimentData.experimentCompleted = true; }

        console.log("Storing data...")
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
class TrialGenerator {
    constructor(stimuli) {
        this.stimuli = stimuli;
    }

    generateTrialsForPhase(phaseData) {
        let interactionTypesArr = Array.isArray(phaseData.interaction_type) ? phaseData.interaction_type : [phaseData.interaction_type];
        const baseFennimalSet = this.stimuli.get_Fennimals_in_array(phaseData.Fennimals_encountered);

        // 1. Generate all main trials
        let mainTrials = [];
        for (let i = 0; i < interactionTypesArr.length; i++) {
            let newSet = set_property_to_all_elem_in_arr("interaction_type", interactionTypesArr[i], JSON.parse(JSON.stringify(baseFennimalSet)));
            mainTrials.push(...newSet);
        }

        // Apply hint types if applicable
        if (phaseData.type === "hint_and_search") {
            let hintTypeArr = Array.isArray(phaseData.hint_type) ? phaseData.hint_type : [phaseData.hint_type];
            mainTrials = set_property_to_all_elem_in_arr("hint_type", hintTypeArr[0], mainTrials);
        }

        // 2. Generate all orthogonal trials
        let orthogonalTrials = [];
        if (phaseData.included_orthogonal_tasks) {
            orthogonalTrials = this.getOrthogonalTaskTrials(phaseData);
        }

        // 3. Determine the grace period (0 means no grace period)
        let protectedCount = phaseData.orthogonal_tasks_possible_after_trial || 0;

        // 4. Run the Smart Shuffle
        return this.smartShuffleTrials(mainTrials, orthogonalTrials, protectedCount);
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

    smartShuffleTrials(mainTrials, orthogonalTrials, gracePeriod) {
        // Randomize the initial pools
        let shuffledMain = shuffleArray([...mainTrials]);
        let shuffledOrthogonal = shuffleArray([...orthogonalTrials]);

        // Enforce grace period: Pull the first N trials exclusively from the main pool
        let sequence = [];
        let actualGracePeriod = Math.min(gracePeriod, shuffledMain.length);

        for (let i = 0; i < actualGracePeriod; i++) {
            // Try to avoid back-to-backs even within the grace period if possible
            let lastId = sequence.length > 0 ? sequence[sequence.length - 1].id : null;
            let nextIndex = shuffledMain.findIndex(item => item.id !== lastId);

            if (nextIndex !== -1) {
                sequence.push(shuffledMain.splice(nextIndex, 1)[0]);
            } else {
                sequence.push(shuffledMain.shift()); // Unavoidable
            }
        }

        // Combine remaining main trials and orthogonal trials into one big pool
        let remainingPool = shuffleArray([...shuffledMain, ...shuffledOrthogonal]);

        // Smart sequencing loop
        while (remainingPool.length > 0) {
            let lastId = sequence.length > 0 ? sequence[sequence.length - 1].id : null;
            let nextIndex = remainingPool.findIndex(item => item.id !== lastId);

            if (nextIndex !== -1) {
                // Perfect fit: We found a trial with a different Fennimal
                sequence.push(remainingPool.splice(nextIndex, 1)[0]);
            } else {
                // Collision: All remaining trials belong to the same Fennimal!
                let problematicItem = remainingPool.shift();
                let swapped = false;

                // Look backwards to see if we can sneak this item in earlier
                for (let j = actualGracePeriod; j < sequence.length - 1; j++) {
                    let prevId = j > 0 ? sequence[j - 1].id : null;
                    let nextId = sequence[j + 1].id;
                    let candidateToMoveToEnd = sequence[j];

                    // Can we safely put the problematic item at index j?
                    if (problematicItem.id !== prevId && problematicItem.id !== nextId) {
                        // Can the displaced item safely sit at the end?
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
                    // Give up: No valid swap found, just append it
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
                this.flagPartnerBeliefInstructionsShown = false;
                let partnerName = WorldState.get_partner_icon_settings().name;
                let partnerPresent = WorldState.get_current_partner_role() === "active";
                this.instrCont.initializePartnerBeliefInstructions(partnerName, partnerPresent, this.currentPhaseData.bonus_stars_per_correct_answer, this.currentPhaseData.toyboxes_asked.length, this.currentDayNum);
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

                // THE FIX: Use the standard 'skip_instructions' parameter!
                if (!this.currentPhaseData.skip_instructions) {
                    this.flagOnCallInstructionsShown = false;
                    this.instrCont.initializeOnCallPhaseGeneralInstructions(this.currentDayNum, this.currentPhaseData.include_Fennefinder);
                } else {
                    this.flagOnCallInstructionsShown = true;
                    this.startNextTrialInOnCallPhase();
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
                    maxStars
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
    }

    setupPartnerBeliefPhase() {
        this.mapCont.disable_map_interactions();
        document.getElementById("Map").style.display = "none";

        // TRANSLATION FIX: Convert the config codes (A, B, C) into the actual assigned SVG names!
        this.currentPhaseData.toyboxes_asked = this.stimuli.get_assigned_names_of_code_array("toybox", this.currentPhaseData.toyboxes_asked);
        this.currentPhaseData.toys_asked = this.stimuli.get_assigned_names_of_code_array("toy", this.currentPhaseData.toys_asked);

        let pLayer = document.getElementById("Fennimals_Layer");
        let pbPartnerPresent = WorldState.get_current_partner_role() === "active";

        let currentTask = new PartnerBeliefTaskController(pLayer, this.currentPhaseData, pbPartnerPresent, () => {
            this.dataCont.storePhaseData({
                type: "partner_belief",
                day: this.currentDayNum,
                answers: this.currentPhaseData.PartnerBeliefAnswers
            });

            let earned = this.currentPhaseData.PartnerBeliefAnswers.reduce((sum, ans) => sum + (ans.stars_earned || 0), 0);
            let maxPossible = this.currentPhaseData.bonus_stars_per_correct_answer * this.currentPhaseData.toyboxes_asked.length;
            this.dataCont.recordStarsEarned(this.currentDayNum, "partner_belief", earned, maxPossible);

            currentTask.clean_up();
            document.getElementById("Map").style.display = "inherit";
            this.phaseCompleted();
        });
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
        if (this.currentPhaseData.Fennimals_in_phase.length > 0) {
            this.currentTrialNumInDay++;
            this.currentTrial = this.currentPhaseData.Fennimals_in_phase.shift();
            WorldState.add_Fennimal_to_map(this.currentTrial);

            this.instrCont.initializeHintAndSearchPhaseTrialInstructions(this.currentTrial, this.currentTrial.hint_type, ((this.currentTrialNumInDay - 1) / this.currentPhaseData.number_interactions_in_phase) * 100);
            AudioCont.play_sound_effect("alert");
            this.mapCont.allow_participant_to_leave_location(true);
        } else {
            this.phaseCompleted();
        }
    }

    jumpToNextTrial() {
        if (this.currentPhaseData.Fennimals_in_phase.length > 0) {
            this.currentTrial = this.currentPhaseData.Fennimals_in_phase.shift();
            WorldState.add_Fennimal_to_map(this.currentTrial);
            this.mapCont.jump_player_to_location(this.currentTrial.location, this.currentTrial.region);
        } else {
            this.phaseCompleted();
        }
    }

    // --- ON CALL PHASE LOGIC ---
    startNextTrialInOnCallPhase() {
        if (this.currentPhaseData.Fennimals_in_phase.length === 0) {
            this.phaseCompleted();
            return;
        }

        this.instrCont.parentElem.innerHTML = "";
        this.instrCont.parentElem.style.display = "none";

        this.currentFennimalToSearchFor = this.currentPhaseData.Fennimals_in_phase.shift();

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
        // Safety check to ensure the data is loaded
        if (!this.ExpData || !this.ExpData.sequence) return;

        // Scan the entire experiment sequence for any "on_call" phases
        let needsBooth = this.ExpData.sequence.some(phase => phase.phase_type === "on_call");

        if (!needsBooth) {
            this.mapCont.remove_phone_booth();
        }
    }

    phaseCompleted() {
        this.dataCont.storePhaseData(this.currentPhaseData);
        if (this.currentFennimal) this.currentFennimal.clean_up();

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

                // FIX: Moved these two lines INSIDE the if-statement so they don't overwrite custom phases like partner_belief!
                this.currentPhaseData.bonus_stars_earned = totalBonusStarsEarned;
                this.dataCont.recordStarsEarned(this.currentDayNum, this.currentPhaseType, totalBonusStarsEarned, maxBonusStars);
            }
        }

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
                if (!this.flagPartnerBeliefInstructionsShown) {
                    this.flagPartnerBeliefInstructionsShown = true;
                    this.setupPartnerBeliefPhase();
                }
                break;
            case "pseudoday":
                this.startNextExperimentPhase();
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
        if (this.currentFennimal) this.currentFennimal.clean_up();

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
        }
    }

    explorationPhaseAddPhoto() {
        let allFennimals = WorldState.get_array_of_Fennimals_on_map();
        let allFound = allFennimals.every(f => f.name === undefined || f.visited === true);

        if (allFound) {
            AudioCont.play_sound_effect("alert");
            this.instrCont.instructionsRequestedByParticipant();
            this.flagExplorationPhaseCompleted = true;
            this.instrCont.updateExplorationPhaseInstructionsToShowCompletion();
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
        this.dataCont.storePhaseData(this.currentPhaseData);

        if (this.currentPhaseData.maximum_earnable_stars > 0) {
            let starsEarned = Math.max(0, this.currentPhaseData.maximum_earnable_stars - data.length);
            this.dataCont.recordStarsEarned(this.currentDayNum, "Sorting Task", starsEarned, this.currentPhaseData.maximum_earnable_stars);
        }
        this.startNextExperimentPhase();
    }

    questionnairePageCompleted(pageData) {
        this.dataCont.storeQuestionnaireData(pageData);
        this.startNextQuestionnairePage();
    }

    submitExperiment() {
        // Final save, setting the boolean to reflect that the experiment has been completed.
        this.dataCont.storeAllData(true)

        /*

        if (window.saveToFirebase) {
            window.saveToFirebase(doc_name, this.experimentData).then(() => {

                // 2. Redirect the participant directly to Prolific!
                // REPLACE THIS URL WITH YOUR ACTUAL PROLIFIC COMPLETION URL
                window.location.href = "https://app.prolific.com/submissions/complete?cc=YOUR_CODE_HERE";

            });
        }

         */
    }
}