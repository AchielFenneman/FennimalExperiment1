DATACONTROLLER = function (Stimuli, AttentionCheckController, StartTime) {

    let ExperimentData = {
        Expcode: Stimuli.get_experiment_code(),
        start_date: new Date().toString(),
        browser: getBrowser(),
        PID: false,
        TimeStamps: [],
        StoredData: [],
        Questionnaire: [],
        PaymentData: null
    };

    function init() {
        let url = new URL(window.location);
        let PID = url.searchParams.get("PROLIFIC_PID");
        if (PID) {
            ExperimentData.PID = PID.replace(/\D/g, "").substring(0, 4);
        }

        // Store minimal Fennimal templates
        let FennArr = Stimuli.get_all_Fennimals_objects_in_array();
        ExperimentData.Fennimals = FennArr.map(fen => {
            let cleanFen = JSON.parse(JSON.stringify(fen));
            if (cleanFen.color_scheme_origin !== "custom") delete cleanFen.ColorScheme;
            return cleanFen;
        });
    }
    init();

    this.record_consent_given = () => {
        ExperimentData.consent_given = Date.now() - StartTime;
    };

    this.record_timestamp = (event_string) => {
        ExperimentData.TimeStamps.push({
            type: event_string,
            time: Math.round((Date.now() - StartTime) / 1000)
        });
    };

    // ----------------------------------------------------
    // THE NEW, ULTRA-LIGHTWEIGHT DATA STORER
    // ----------------------------------------------------
    this.store_phase_data = (CleanDataObj) => {
        ExperimentData.StoredData.push(JSON.parse(JSON.stringify(CleanDataObj)));
        this.record_timestamp(CleanDataObj.type);
    };

    this.store_card_data_when_included_in_general_instructions = (CardData) => {
        ExperimentData.CardTaskData = JSON.parse(JSON.stringify(CardData));
    };

    this.store_questionnaire_data = (QuestionnaireAnswerObj) => {
        ExperimentData.Questionnaire.push(JSON.parse(JSON.stringify(QuestionnaireAnswerObj)));
    };

    this.store_custom_icon_data = () => {
        let PlayerData = WorldState.get_player_icon_settings();
        let PartnerData = WorldState.get_partner_icon_settings();
        delete PlayerData.scale_factor;
        delete PartnerData.scale_factor;
        ExperimentData.Avatar = { Player: PlayerData, Partner: PartnerData };
    };

    let PaymentInfo = [];
    this.record_stars_earned = (daynum, phase_type, stars_earned, maximum_possible_stars) => {
        PaymentInfo.push({ day: daynum, day_type: phase_type, stars_earned, maximum_possible_stars });
    };

    this.get_payment_data = () => {
        let total_stars = PaymentInfo.reduce((sum, phase) => sum + phase.stars_earned, 0);

        ExperimentData.PaymentData = {
            phases: [...PaymentInfo, {
                day_type: "summary",
                stars_earned: total_stars,
                maximum_possible_stars: Stimuli.get_maximum_number_of_bonus_stars()
            }],
            total_stars: total_stars
        };

        // Assigning a completion code
        let cc_word_1 = shuffleArray(["Happy", "Bright", "Clean", "Soft", "Warm", "Kind", "Sweet"])[0];
        let cc_word_2 = shuffleArray(["Cat", "Rabbit", "Owl", "Fox", "Koala", "Frog", "Panda"])[0];
        ExperimentData.PaymentData.completion_code = cc_word_1 + cc_word_2 + total_stars;

        ExperimentData.total_duration = Math.round((Date.now() - StartTime) / 1000);
        ExperimentData.AttentionData = AttentionCheckController.get_attention_rep();

        // Copy to the form
        document.getElementById("data_form_field").innerHTML = JSON.stringify(ExperimentData);

        return JSON.parse(JSON.stringify(ExperimentData.PaymentData));
    };

    this.get_completion_code = () => {
        return ExperimentData.PaymentData.completion_code;
    };
};

EXPCONTROLLER = function () {
    let that = this;
    let experiment_start_time = Date.now();

    let Stimulus_settings = new StimulusSettings();
    let Stimuli = new StimulusTransformer(Stimulus_settings);

    const Imageloader = new ImageLoader(Stimuli.get_all_locations_visited_during_experiment_with_regions(), document.getElementById("All_Locations"));
    let AtCheckCont = new AttentionCheckController(experiment_start_time, 20);
    let DataCont = new DATACONTROLLER(Stimuli, AtCheckCont, experiment_start_time);
    let SVG_Reducer = new SVGREDUCER(Stimuli);

    WorldState.rebuild_state_from_available_locations(Stimuli.get_all_locations_visited_during_experiment_with_regions());

    let MapCont = new MapController(that, WorldState);
    let InstrCont = new INSTRUCTIONSCONTROLLER(that, WorldState, Stimuli);

    let Remaining_experiment_phases = JSON.parse(JSON.stringify(Stimulus_settings.Experiment_Structure));
    let CurrentPhaseData, current_phase_type, flag_exploration_phase_has_been_completed_after_instructions_closed;
    let current_phase_num = 0, current_day_num = 0, current_trial_num_in_day = 0;
    let CurrentTrial, CurrentFennimal, current_interaction_num_in_phase;

    this.start_experiment = function () {
        show_next_general_instructions_page();
        MapCont.disable_map_interactions();
    };

    // ----------------------------------------------------
    // PHASE GENERATION (Simplified)
    // ----------------------------------------------------
    function merge_sets_of_trials(baseArray, insertArray, protectedCount) {
        const result = [...baseArray];
        const itemsToInsert = shuffleArray(insertArray);
        const startIndex = Math.min(protectedCount, baseArray.length);

        for (const item of itemsToInsert) {
            const validIndices = [];
            for (let i = startIndex; i <= result.length; i++) {
                const prevId = i > 0 ? result[i - 1].id : null;
                const nextId = i < result.length ? result[i].id : null;
                if (item.id !== prevId && item.id !== nextId) validIndices.push(i);
            }

            let targetIndex = validIndices.length > 0
                ? validIndices[Math.floor(Math.random() * validIndices.length)]
                : startIndex + Math.floor(Math.random() * (result.length - startIndex + 1));

            result.splice(targetIndex, 0, item);
        }
        return result;
    }

    function get_all_orthogonal_task_trials() {
        let Otrials = [];
        let FenObjs = Stimuli.get_Fennimals_in_array(CurrentPhaseData.Fennimals_encountered);
        let SpecialFens = FenObjs.filter(f => f.play_orthogonal_tasks === true);

        for (let tasknum in CurrentPhaseData.included_orthogonal_tasks) {
            for (let fennum in SpecialFens) {
                let NewFen = JSON.parse(JSON.stringify(SpecialFens[fennum]));
                NewFen.hint_type = "icon";
                NewFen.interaction_type = CurrentPhaseData.included_orthogonal_tasks[tasknum];
                Otrials.push(NewFen);
            }
        }
        return Otrials;
    }

    function get_trials_in_phase() {
        current_trial_num_in_day = 0;
        let interaction_types_arr = Array.isArray(CurrentPhaseData.interaction_type) ? CurrentPhaseData.interaction_type : [CurrentPhaseData.interaction_type];

        const BaseFennimalSet = Stimuli.get_Fennimals_in_array(CurrentPhaseData.Fennimals_encountered);
        let TrialSet = [];

        const ordering = pseudo_randomize_order_of_ids_no_back_to_back(get_all_values_in_array_of_objects("id", BaseFennimalSet), interaction_types_arr.length);

        for (let i = 0; i < interaction_types_arr.length; i++) {
            let NewSet = set_property_to_all_elem_in_arr("interaction_type", interaction_types_arr[i], JSON.parse(JSON.stringify(BaseFennimalSet)));
            for (let ordnum = 0; ordnum < ordering[i].length; ordnum++) {
                TrialSet.push(get_object_from_array_based_on_value("id", ordering[i][ordnum], NewSet, true, false));
            }
        }

        if (current_phase_type === "hint_and_search") {
            let hint_type_arr = Array.isArray(CurrentPhaseData.hint_type) ? CurrentPhaseData.hint_type : [CurrentPhaseData.hint_type];
            TrialSet = set_property_to_all_elem_in_arr("hint_type", hint_type_arr[0], TrialSet);
        }

        if (CurrentPhaseData.included_orthogonal_tasks) {
            let OrthogonalTrials = get_all_orthogonal_task_trials();
            let first_x_trials_from_base_set = CurrentPhaseData.orthogonal_tasks_possible_after_trial || 0;
            TrialSet = merge_sets_of_trials(TrialSet, OrthogonalTrials, first_x_trials_from_base_set);
        }

        return TrialSet;
    }

    // ----------------------------------------------------
    // THE PHASE ROUTER
    // ----------------------------------------------------
    function start_next_experiment_phase() {
        MapCont.disable_map_interactions();

        if (Remaining_experiment_phases.length === 0) {
            start_post_experiment_questionnaire();
            DataCont.record_timestamp("main phase complete");
            return;
        }

        CurrentPhaseData = Remaining_experiment_phases.shift();
        current_phase_type = CurrentPhaseData.type;
        current_phase_num++;
        CurrentPhaseData.phasenum = current_phase_num;
        if (CurrentPhaseData.type !== "pseudoday") current_day_num++;

        current_interaction_num_in_phase = 0;
        WorldState.clear_all_locations(true);

        if (GenParam.DisplayFoundFennimalIconsOnMap.show && GenParam.DisplayFoundFennimalIconsOnMap.clear_Fennimal_icons_from_map_at_start_of_new_day) {
            MapCont.clear_all_Fennimal_icons_from_map();
        }

        WorldState.change_partner_role_behavior(CurrentPhaseData.partner_behavior || null);

        // Prep data for trial-based phases
        if (["free_exploration", "hint_and_search", "jump_to_trial"].includes(current_phase_type)) {
            CurrentPhaseData.Fennimals_in_phase = get_trials_in_phase();
            CurrentPhaseData.number_interactions_in_phase = CurrentPhaseData.Fennimals_in_phase.length;
            CurrentPhaseData.Data = []; // Initialize empty array for results
        }

        // ROUTER
        switch (current_phase_type) {

            case "partner_belief":
                MapCont.disable_map_interactions();
                document.getElementById("Map").style.display = "none";

                let PLayer = document.getElementById("Fennimals_Layer");
                let pb_partner_present = WorldState.get_current_partner_role() === "active";

                let CurrentTask = new PartnerBeliefTaskController(PLayer, CurrentPhaseData, pb_partner_present, () => {
                    // When the DV task finishes, save its array and move on!
                    DataCont.store_phase_data({
                        type: "partner_belief",
                        day: current_day_num,
                        answers: CurrentPhaseData.PartnerBeliefAnswers
                    });

                    // Tally any earned stars dynamically
                    let earned = CurrentPhaseData.PartnerBeliefAnswers.reduce((sum, ans) => sum + (ans.stars_earned || 0), 0);
                    if (earned > 0) {
                        let max_possible = CurrentPhaseData.bonus_stars_per_correct_answer * CurrentPhaseData.toyboxes_asked.length;
                        DataCont.record_stars_earned(current_day_num, "partner_belief", earned, max_possible);
                    }

                    CurrentTask.clean_up();
                    document.getElementById("Map").style.display = "inherit"; // Restore map
                    phase_completed();
                });
                CurrentTask.start_sequence();
                break;

            case "free_exploration":
                flag_exploration_phase_has_been_completed_after_instructions_closed = false;
                WorldState.populate_map_with_array_of_Fennimals(CurrentPhaseData.Fennimals_in_phase, true);
                if (CurrentPhaseData.force_climbing_tower_first) MapCont.enforce_dome_until_tower_climbed();
                InstrCont.initialize_free_exploration_instructions(CurrentPhaseData.interaction_type, current_day_num, CurrentPhaseData.bonus_stars_per_correct_answer === true, CurrentPhaseData.include_Fennefinder, CurrentPhaseData.force_climbing_tower_first === true, CurrentPhaseData.Fennimals_in_phase);
                break;

            case "jump_to_trial":
                if (CurrentPhaseData.skip_instructions) {
                    jump_to_next_trial();
                } else {
                    InstrCont.initialize_jump_to_trial_instructions(CurrentPhaseData.interaction_type, current_day_num, CurrentPhaseData.bonus_stars_per_correct_answer, CurrentPhaseData.include_Fennefinder, CurrentPhaseData.Fennimals_in_phase);
                }
                break;

            case "hint_and_search":
                flag_hint_and_search_phase_general_instructions_shown = false;
                InstrCont.initialize_hint_and_search_phase_general_instructions(CurrentPhaseData.interaction_type, CurrentPhaseData.hint_type, current_day_num, CurrentPhaseData.bonus_stars_per_correct_answer, CurrentPhaseData.include_Fennefinder, CurrentPhaseData.Fennimals_in_phase);
                if (CurrentPhaseData.skip_instructions) that.instructions_page_closed();
                break;

            case "name_recall_task":
                InstrCont.start_name_recall_task(current_day_num, CurrentPhaseData.bonus_stars_per_correct_answer);
                break;

            case "card_sorting_task":
                InstrCont.start_card_sorting_task(current_day_num, CurrentPhaseData.SpecialSettings);
                break;

            case "Fennimal_attribute_sorting_task":
                InstrCont.start_Fennimal_attribute_sorting_task(current_day_num, Stimuli.get_Fennimals_in_array(CurrentPhaseData.Fennimals_encountered), CurrentPhaseData.attribute_order, CurrentPhaseData.maximum_earnable_stars);
                break;

            case "pseudoday":
                if (CurrentPhaseData.information === "new_Fennimals_spotted") {
                    InstrCont.show_pseudo_day_information_page(CurrentPhaseData.information, CurrentPhaseData.title, CurrentPhaseData.display_text, Stimuli.get_Fennimals_in_array(CurrentPhaseData.displayed_icons));
                } else {
                    InstrCont.show_pseudo_day_information_page(CurrentPhaseData.information);
                }
                break;
        }
    }

    function check_if_Fennefinder_should_be_shown() {
        Interface.FenneFinder.change_display_mode(CurrentPhaseData.include_Fennefinder);
        if (CurrentPhaseData.include_Fennefinder === true || CurrentPhaseData.include_Fennefinder === "low_power_mode") {
            let TargetArr = [];
            if (CurrentPhaseData.type === "hint_and_search") TargetArr = [CurrentTrial];
            if (CurrentPhaseData.type === "free_exploration") {
                let FennimalsInWorld = WorldState.get_array_of_Fennimals_on_map();
                TargetArr = FennimalsInWorld.filter(f => f.name && !f.visited);
            }

            if (CurrentPhaseData.include_Fennefinder === true) {
                Interface.FenneFinder.update_targets(TargetArr);
                Interface.FenneFinder.change_low_power_mode(false);
            }
            if (CurrentPhaseData.include_Fennefinder === "low_power_mode") {
                Interface.FenneFinder.change_low_power_mode(true);
            }
        } else {
            Interface.FenneFinder.hide();
        }
    }

    function start_next_trial_in_hint_and_search_phase() {
        if (CurrentPhaseData.Fennimals_in_phase.length > 0) {
            current_trial_num_in_day++;
            CurrentTrial = CurrentPhaseData.Fennimals_in_phase.shift();
            WorldState.add_Fennimal_to_map(CurrentTrial);

            InstrCont.initialize_hint_and_search_phase_trial_instructions(CurrentTrial, CurrentTrial.hint_type, ((current_trial_num_in_day - 1) / CurrentPhaseData.number_interactions_in_phase) * 100);
            AudioCont.play_sound_effect("alert");
            MapCont.allow_participant_to_leave_location(true);
            check_if_Fennefinder_should_be_shown();
        } else {
            phase_completed();
        }
    }

    function jump_to_next_trial() {
        if (CurrentPhaseData.Fennimals_in_phase.length > 0) {
            CurrentTrial = CurrentPhaseData.Fennimals_in_phase.shift();
            WorldState.add_Fennimal_to_map(CurrentTrial);
            MapCont.jump_player_to_location(CurrentTrial.location, CurrentTrial.region);
        } else {
            phase_completed();
        }
    }

    // ----------------------------------------------------
    // INSTRUCTIONS & CALLBACKS
    // ----------------------------------------------------
    let Remaining_Questionnaire_Pages;
    function start_post_experiment_questionnaire() {
        Remaining_Questionnaire_Pages = Stimuli.get_questionnaire_pages_arr();
        start_next_questionnaire_page();
    }

    function start_next_questionnaire_page() {
        if (Remaining_Questionnaire_Pages.length > 0) {
            InstrCont.show_questionnaire_page(Remaining_Questionnaire_Pages.shift());
        } else {
            InstrCont.show_payment_screen(DataCont.get_payment_data());
        }
    }

    this.questionnaire_page_completed = function (PageData) {
        DataCont.store_questionnaire_data(PageData);
        start_next_questionnaire_page();
    };

    this.submit_experiment = function () {
        alert("In case you pressed the button before submitting the completion code to prolific, your code is: " + DataCont.get_completion_code() + ". Press OK to finalize your submission.");
        document.getElementById("submitbutton").click();
    };

    let Remaining_Instructions_Pages = Stimuli.get_instruction_pages_arr(), current_instructions_page;

    function show_next_general_instructions_page() {
        if (current_instructions_page === "character_creation") DataCont.store_custom_icon_data();

        if (Remaining_Instructions_Pages.length > 0) {
            AtCheckCont.toggle_recording_state("passive");
            current_instructions_page = Remaining_Instructions_Pages.shift();
            switch (current_instructions_page) {
                case "consent":
                    InstrCont.show_consent_page();
                    break;
                case "browser_check_and_full_screen_prompt":
                    InstrCont.show_browser_check_and_fullscreen_page();
                    break;
                case "overview":
                    InstrCont.show_overview_page();
                    break;
                case "single_sitting":
                    InstrCont.show_single_sitting_page();
                    break;
                case "card_sorting_task":
                    MapCont.disable_map_interactions();
                    InstrCont.start_card_sorting_task(false, undefined);
                    break;
                case "character_creation":
                    // FIX: Wrapped in an arrow function to preserve 'this' context!
                    InstrCont.show_character_creation_screen(() => MapCont.update_player_settings());
                    break;
                case "partner_introduction":
                    InstrCont.show_partner_introduction_screen();
                    break;
            }
        } else {
            AtCheckCont.toggle_recording_state("active");
            start_next_experiment_phase();
            DataCont.record_timestamp("instructions complete");
        }
    }
    this.consent_provided_by_participant = () => DataCont.record_consent_given();
    this.general_instructions_page_completed = () => show_next_general_instructions_page();

    this.instructions_page_closed = function () {
        switch (current_phase_type) {
            case "free_exploration":
                if (flag_exploration_phase_has_been_completed_after_instructions_closed) {
                    phase_completed();
                } else {
                    MapCont.enable_map_interactions();
                    MapCont.show_request_instructions_button();
                    check_if_Fennefinder_should_be_shown();
                }
                break;
            case "hint_and_search":
                if (!flag_hint_and_search_phase_general_instructions_shown) {
                    flag_hint_and_search_phase_general_instructions_shown = true;
                    start_next_trial_in_hint_and_search_phase();
                } else {
                    MapCont.enable_map_interactions();
                    MapCont.show_request_instructions_button();
                }
                break;
            case "jump_to_trial":
            case "jump_to_trial_no_instructions":
                jump_to_next_trial();
                break;
            case "pseudoday":
                start_next_experiment_phase();
                break;
        }
    };

    this.instructions_requested = function () {
        MapCont.disable_map_interactions();
        InstrCont.instructions_requested_by_participant();
    };

    // ----------------------------------------------------
    // MAP INTERACTION HOOKS
    // ----------------------------------------------------
    this.entering_location = function (location) {
        let FennimalObject = WorldState.get_reference_to_Fennimal_object_at_location(location);
        if (FennimalObject) {
            if (FennimalObject.visited === false || FennimalObject.visited === undefined) {
                current_interaction_num_in_phase++;
                FennimalObject.num_in_phase = current_interaction_num_in_phase;
            }

            let partner_present = false;
            let role = WorldState.get_current_partner_role();
            if (role && role !== "absent") partner_present = true;

            // NEW: The beautifully clean TrialFactory injection!
            CurrentFennimal = TrialFactory.build(
                FennimalObject.interaction_type,
                FennimalObject,
                partner_present,
                () => that.Fennimal_interaction_completed(FennimalObject)
            );
            CurrentFennimal.start_sequence();
        }
    };

    this.leaving_location = function () {
        if (CurrentFennimal) CurrentFennimal.clean_up();
    };

    this.Fennimal_interaction_completed = function (FenObj) {
        let Fennimal_previously_visited = FenObj.visited !== undefined;
        WorldState.Fennimal_encounter_finshed(FenObj.name);
        FenObj.visited = true;

        if (GenParam.DisplayFoundFennimalIconsOnMap.show) {
            MapCont.add_Fennimal_icon_on_map(FenObj);
        }

        // Save Trial Data directly to Phase Data
        CurrentPhaseData.Data.push(JSON.parse(JSON.stringify(FenObj)));

        switch (current_phase_type) {
            case "free_exploration":
                InstrCont.update_progress_within_day((current_interaction_num_in_phase / CurrentPhaseData.number_interactions_in_phase) * 100);
                if (!Fennimal_previously_visited) {
                    exploration_phase_add_photo();
                } else {
                    MapCont.allow_participant_to_leave_location(true);
                }
                check_if_Fennefinder_should_be_shown();
                break;
            case "hint_and_search":
                InstrCont.update_progress_within_day((current_interaction_num_in_phase / CurrentPhaseData.number_interactions_in_phase) * 100);
                if (FenObj.name === CurrentTrial.name) {
                    Interface.Prompt.show_message("Time to find the next Fennimal!");
                    start_next_trial_in_hint_and_search_phase();
                } else {
                    MapCont.allow_participant_to_leave_location(true);
                }
                break;
            case "jump_to_trial":
            case "jump_to_trial_no_instructions":
                setTimeout(() => {
                    MapCont.return_to_map();
                    jump_to_next_trial();
                }, 500);
                break;
        }
    };

    function exploration_phase_add_photo() {
        let AllFennimals = WorldState.get_array_of_Fennimals_on_map();
        let all_found = AllFennimals.every(f => f.name === undefined || f.visited === true);

        if (all_found) {
            AudioCont.play_sound_effect("alert");
            InstrCont.instructions_requested_by_participant();
            flag_exploration_phase_has_been_completed_after_instructions_closed = true;
            InstrCont.update_exploration_phase_instructions_to_show_completion();
        } else {
            MapCont.allow_participant_to_leave_location(true);
        }
    }

    function phase_completed() {
        DataCont.store_phase_data(CurrentPhaseData);
        if (CurrentFennimal) CurrentFennimal.clean_up();

        // Trial-based phases legacy star logic (Keep if orthogonal tasks earn stars)
        let total_bonus_stars_earned = 0, max_bonus_stars = 0;
        if (CurrentPhaseData.bonus_stars_per_correct_answer) {
            if (["jump_to_trial", "hint_and_search", "free_exploration"].includes(CurrentPhaseData.type)) {
                for (let trialnum = 0; trialnum < CurrentPhaseData.Data.length; trialnum++) {
                    if (CurrentPhaseData.Data[trialnum].bonus_stars_earned !== undefined) {
                        total_bonus_stars_earned += CurrentPhaseData.Data[trialnum].bonus_stars_earned === true ? 1 : CurrentPhaseData.Data[trialnum].bonus_stars_earned;
                    }
                    max_bonus_stars += CurrentPhaseData.Data[trialnum].bonus_stars_earnable || 0;
                }
            }
            CurrentPhaseData.bonus_stars_earned = total_bonus_stars_earned;
            DataCont.record_stars_earned(current_day_num, current_phase_type, total_bonus_stars_earned, max_bonus_stars);
        }

        MapCont.reset_map_to_player_in_center();
        start_next_experiment_phase();
    }

    // ----------------------------------------------------
    // EXTERNAL ORTHOGONAL TASK CALLBACKS
    // ----------------------------------------------------
    this.recalled_names_task_complete = function (RecalledNames) {
        let AllFennimals = Stimuli.get_all_Fennimals_objects_in_array();
        let All_Names_In_Exp = AllFennimals.map(f => ({ name: f.name, id: f.id }));

        for (let i = 0; i < RecalledNames.length; i++) {
            let Possible_matches = [];
            for (let x = 0; x < All_Names_In_Exp.length; x++) {
                let dist = LevenshteinDistance(RecalledNames[i].ans.toLowerCase(), All_Names_In_Exp[x].name.toLowerCase());
                if (dist <= CurrentPhaseData.allowed_Levenshtein_distance_for_match) {
                    Possible_matches.push({ matchedID: All_Names_In_Exp[x].id, dist: dist });
                }
            }

            if (Possible_matches.length === 1) {
                RecalledNames[i].matchedID = Possible_matches[0].matchedID;
                RecalledNames[i].LSdist = Possible_matches[0].dist;
            } else if (Possible_matches.length > 1) {
                let closest = Possible_matches.reduce((prev, curr) => prev.dist < curr.dist ? prev : curr);
                RecalledNames[i].matchedID = closest.matchedID;
                RecalledNames[i].LSdist = closest.dist;
                RecalledNames[i].flagged_for_multiple_matches = true;
            }
        }

        CurrentPhaseData.RecalledNames = JSON.parse(JSON.stringify(RecalledNames));

        let Array_recalled_IDs = [...new Set(RecalledNames.filter(r => r.matchedID).map(r => r.matchedID))];
        CurrentPhaseData.Array_of_recalled_IDs = Array_recalled_IDs;

        if (CurrentPhaseData.bonus_stars_per_correct_answer > 0) {
            DataCont.record_stars_earned(current_day_num, CurrentPhaseData.type, Array_recalled_IDs.length * CurrentPhaseData.bonus_stars_per_correct_answer, AllFennimals.length * CurrentPhaseData.bonus_stars_per_correct_answer);
        }

        DataCont.store_phase_data(CurrentPhaseData);
        start_next_experiment_phase();
    };

    this.card_sorting_task_complete = function (CardData) {
        if (CurrentPhaseData) {
            CurrentPhaseData.CardData = JSON.parse(JSON.stringify(CardData));
            DataCont.store_phase_data(CurrentPhaseData);
            start_next_experiment_phase();
        } else {
            DataCont.store_card_data_when_included_in_general_instructions(CardData);
            show_next_general_instructions_page();
        }
    };

    this.sorting_task_completed = function (Data) {
        CurrentPhaseData.Errors = JSON.parse(JSON.stringify(Data));
        DataCont.store_phase_data(CurrentPhaseData);

        if (CurrentPhaseData.maximum_earnable_stars > 0) {
            DataCont.record_stars_earned(current_day_num, "Sorting Task", Math.max(0, CurrentPhaseData.maximum_earnable_stars - Data.length), CurrentPhaseData.maximum_earnable_stars);
        }
        start_next_experiment_phase();
    };
};

