

DATACONTROLLER = function (Stimuli, AttentionCheckController, StartTime) {

    let ExperimentData = {
        Expcode: Stimuli.get_experiment_code(),
        start_date: new Date().toString(),
        browser: getBrowser(),
        TimeStamps: [],
        RawPhaseData: [],
        StoredData: [],
        Questionnaire: [],
        Fennimal_subgroups: Stimuli.get_Fennimal_subgroups()
    }

    //On creation, store the Fennimals and experiment code. We want to store these templates in minimal form

    function store_Fennimal_objects() {
        let FennArr = Stimuli.get_all_Fennimals_objects_in_array()

        ExperimentData.Fennimals = []
        for (let i = 0; i < FennArr.length; i++) {
            let NewObj = FennArr[i]

            //Check if we used a custom color. If not, delete this entry
            if (NewObj.color_scheme_origin !== "custom") {
                delete NewObj.ColorScheme
            }

            //Store this template
            ExperimentData.Fennimals.push(JSON.parse(JSON.stringify(NewObj)))
        }

    }

    store_Fennimal_objects()

    //On creation, check to see if there is a Prolific ID code. If so, store the first few digits
    function check_if_there_is_a_prolific_code() {
        let url_string = window.location;
        let url = new URL(url_string);
        let PID = url.searchParams.get("PROLIFIC_PID")
        if (PID != null) {
            let id = JSON.parse(JSON.stringify(PID))
            let number = id.replace(/\D/g, "")
            ExperimentData.PID = number.substring(0, 4)
        } else {
            ExperimentData.PID = false
        }
    }

    check_if_there_is_a_prolific_code()

    this.record_consent_given = function () {
        ExperimentData.consent_given = Date.now() - StartTime

    }

    this.store_phase_data = function (DataObj) {
        //Storing the draw data
        ExperimentData.RawPhaseData.push(JSON.parse(JSON.stringify(DataObj)))
        let phasetype

        //Storing a minimized version for data export
        let NewObj = JSON.parse(JSON.stringify(DataObj))

        //Clean up the Fennimal objects some more
        rename_object_key(NewObj, "Fennimal_interaction_type", "Fen_int_type")
        rename_object_key(NewObj, "number_interactions_in_phase", "num_Fens")
        rename_object_key(NewObj, "partner_behavior", "prtnr")
        delete NewObj.Fennimals_in_phase
        delete NewObj.Fennimals_encountered
        delete NewObj.question_options_food
        delete NewObj.question_options_toyboxes
        delete NewObj.question_options_toys
        delete NewObj.allowed_attempts_before_answer_given


        if(["jump_to_trial", "hint_and_search", "free_exploration"].includes(NewObj.type)){
            for(let trialnum = 0; trialnum < NewObj.Data.length; trialnum++) {
                //For safety, lets retrieve the template this Fennimal is based on, and start deleting elements which are not duplicated in the template.
                //  This ignores id for obvious reasons
                let TemplateF = search_array_of_objects_for_first_with_property_value(ExperimentData.Fennimals, "id",NewObj.Data[trialnum].id )
                remove_all_elements_from_A_if_the_same_in_B(NewObj.Data[trialnum], TemplateF, ["id"])

                if(NewObj.Data[trialnum].color_scheme_origin === "region" || TemplateF.color_scheme_origin === "region"){
                    delete NewObj.Data[trialnum].ColorScheme
                    rename_object_key(NewObj.Data[trialnum], "color_scheme_origin", "colors")
                }

                if(typeof NewObj.Fen_int_type === "string" ){
                    delete NewObj.Data[trialnum].interaction_type
                }

                delete NewObj.Data[trialnum].pos_on_screen
                delete NewObj.Data[trialnum].search_status
                delete NewObj.Data[trialnum].visited

            }

            if(NewObj.Fen_int_type.length === 1 ){
                NewObj.Fen_int_type = NewObj.Fen_int_type[0]
                phasetype = NewObj.Fen_int_type
            }else{
                phasetype = "mixed"
            }

        }

        ExperimentData.StoredData.push(NewObj)

        //Storing a timestamp
        ExperimentData.TimeStamps.push({
            type: DataObj.type,
            time: Math.round((Date.now() - StartTime) / 1000)
        })

    }

    this.store_card_data_when_included_in_general_instructions = function (CardData) {
        ExperimentData.CardTaskData = JSON.parse(JSON.stringify(CardData))
    }

    this.store_questionnaire_data = function (QuestionnaireAnswerObj) {
        ExperimentData.Questionnaire.push(JSON.parse(JSON.stringify(QuestionnaireAnswerObj)))
    }

    this.store_custom_icon_data = function(){
        let PlayerData = WorldState.get_player_icon_settings(), PartnerData = WorldState.get_partner_icon_settings()
        delete PlayerData.scale_factor
        delete PartnerData.scale_factor
        ExperimentData.Avatar = {Player: PlayerData, Partner: PartnerData}
    }

    //Call when stars have been earned
    let PaymentInfo = []
    this.record_stars_earned = function (daynum, phase_type, stars_earned, maximum_possible_stars) {
        PaymentInfo.push(JSON.parse(JSON.stringify({
            day: daynum,
            day_type: phase_type,
            stars_earned: stars_earned,
            maximum_possible_stars: maximum_possible_stars
        })))
    }

    //Call at the end of the experiment to retrieve the payment data. This also generates a completion code
    this.get_payment_data = function () {
        //Calculating total stars
        ExperimentData.PaymentData = {}
        ExperimentData.PaymentData.phases = JSON.parse(JSON.stringify(PaymentInfo))
        ExperimentData.PaymentData.total_stars = 0
        for (let i = 0; i < PaymentInfo.length; i++) {
            ExperimentData.PaymentData.total_stars = ExperimentData.PaymentData.total_stars + PaymentInfo[i].stars_earned
        }

        //Adding a summary entry
        ExperimentData.PaymentData.phases.push({
            day_type: "summary",
            stars_earned: ExperimentData.PaymentData.total_stars,
            maximum_possible_stars: Stimuli.get_maximum_number_of_bonus_stars(),
        })

        //Assigning a completion code
        let cc_word_1 = shuffleArray(["Happy", "Bright", "Clean", "Soft", "Funny", "Warm", "Sharp", "Small", "Kind", "Sweet", "Young", "White", "Tall"])[0]
        let cc_word_2 = shuffleArray(["Cat", "Rabbit", "Owl", "Fox", "Koala", "Frog", "Shark", "Zebra", "Bat", "Flower", "Panda", "Rose", "Poppy", "Lily", "Tulip"])[0]
        ExperimentData.PaymentData.completion_code = cc_word_1 + cc_word_2 + ExperimentData.PaymentData.total_stars

        //Registering the end time and total duration (in seconds)
        ExperimentData.total_duration = Math.round((Date.now() - StartTime) / 1000)

        //Storing the data on the form
        store_experiment_data()

        //Returning the payment object
        return (JSON.parse(JSON.stringify(ExperimentData.PaymentData)))


    }

    //Call to store all the experiment data on the form
    function store_experiment_data() {
        //Store the attention check data
        ExperimentData.AttentionData = AttentionCheckController.get_attention_rep()

        //Deep copy the experiment data
        let StoredData = JSON.parse(JSON.stringify(ExperimentData))

        //Delete some final data elements
        delete StoredData.RawPhaseData

        //Copy to the form
        document.getElementById("data_form_field").innerHTML = JSON.stringify(StoredData)

    }

    //Searches for the phase data of a given type, returns an array containing all matches (deep copies).
    //Returns false if there is no entry of a given type
    this.get_stored_phase_data_of_type = function (type) {
        let Arr = []
        for (let i = 0; i < ExperimentData.RawPhaseData.length; i++) {
            if (ExperimentData.RawPhaseData[i].type === type) {
                Arr.push(JSON.parse(JSON.stringify(ExperimentData.RawPhaseData[i])))
            }
        }
        if (Arr.length > 0) {
            return (Arr)
        } else {
            return false
        }
    }

    //Call only after payment data has been determined by the function above
    this.get_completion_code = function () {
        return (ExperimentData.PaymentData.completion_code)
    }

}

EXPCONTROLLER = function () {
    let that = this
    let experiment_start_time = Date.now()

    //Generating a Stimuli object
    let Stimulus_settings = new StimulusSettings()
    let Stimuli = new StimulusTransformer(Stimulus_settings)

    //Load all the location images
    const Imageloader = new ImageLoader(Stimuli.get_all_locations_visited_during_experiment_with_regions(), document.getElementById("All_Locations"))

    //Creating a controller to keep track of the participants attention to the experiment
    let AtCheckCont = new AttentionCheckController(experiment_start_time, 20)

    //Create an object to track all the data throughout the experiment
    let DataCont = new DATACONTROLLER(Stimuli, AtCheckCont, experiment_start_time)

    //Removing unused elements from the map (and SVG in general)
    let SVG_Reducer = new SVGREDUCER(Stimuli)

    //Creating the world state (this keep tracks of which Fennimals are present on the map)
    WorldState.rebuild_state_from_available_locations(Stimuli.get_all_locations_visited_during_experiment_with_regions())

    //Creating an Audio and Map Controller
    let MapCont = new MapController(that, WorldState)

    //Creating an instructions controller
    let InstrCont = new INSTRUCTIONSCONTROLLER(that, WorldState, Stimuli)

    //Defining key variables
    let Remaining_experiment_phases = JSON.parse(JSON.stringify(Stimulus_settings.Experiment_Structure))
    let CurrentPhaseData, current_phase_type,
        flag_exploration_phase_has_been_completed_after_instructions_closed, current_phase_num = 0, current_day_num = 0, current_trial_num_in_day

    //GENERAL EXPERIMENT FLOW FUNCTIONS
    /////////////////////////////////////
    let CurrentTrial

    this.start_experiment = function () {
        show_next_general_instructions_page()
        MapCont.disable_map_interactions()
    }

    function filter_only_possible_trials(FullSetOfTrials ){
        let PossibleSetOfTrials = []

        //Note: we assume that all Fennimals have a body, head and name
        const RequiredPropertiesPerInteractionType = {
            give_food_active: ["food_preference"],
            give_food_passive: ["food_preference"],
            play_with_toy_active: ["toy"],
            play_with_toy_passive: ["toy"],
            ask_belief_partner_contents_box: ["toybox"],
            ask_contents_box: ["toybox"],
            ask_Fennimal_toy: ["toy"]
        }

        //Setting a flag for all Fennimals for which their properties CANNOT support the interaction type
        for(let i = 0; i < FullSetOfTrials.length; i++) {
            const required_set = RequiredPropertiesPerInteractionType[FullSetOfTrials[i].interaction_type]
            for(let elemnum in required_set) {
                if(typeof FullSetOfTrials[i][required_set[elemnum]] === "undefined"){
                    FullSetOfTrials[i].flag = true
                }
            }
        }

        for(let i = 0; i < FullSetOfTrials.length; i++) {
            if(typeof FullSetOfTrials[i].flag === "undefined"){
                PossibleSetOfTrials.push(FullSetOfTrials[i])
            }else{
                console.warn("Removed impossible trial from phase creation")
            }
        }



        return(PossibleSetOfTrials)
    }

    function filter_only_trials_with_possible_hints(TrialSet){

        let PossibleSetOfTrials = []

        //Note: we assume that all Fennimals have a body, head and name
        const RequiredPropertiesPerHintType = {
            location: ["location"],
            toy: ["toy"],
            toybox: ["toybox"],
            food: ["food_preference"],
            food_preference: ["food_preference"],
        }

        //Setting a flag for all Fennimals for which their properties CANNOT support the interaction type
        for(let i = 0; i < TrialSet.length; i++) {
            const required_set = RequiredPropertiesPerHintType[TrialSet[i].hint_type]

            for(let elemnum in required_set) {
                if(typeof TrialSet[i][required_set[elemnum]] === "undefined"){
                    TrialSet[i].flag = true
                }
            }
        }

        for(let i = 0; i < TrialSet.length; i++) {
            if(typeof TrialSet[i].flag === "undefined"){
                PossibleSetOfTrials.push(TrialSet[i])
            }else{
                console.warn("Removed impossible trial from phase creation (based on hint type)")
            }
        }



        return(PossibleSetOfTrials)
    }

    function get_trials_in_phase(){
        current_trial_num_in_day = 0

        //First: finding all interaction types and setting them into an array
        let interaction_types_arr = CurrentPhaseData.Fennimal_interaction_type
        if(typeof CurrentPhaseData.Fennimal_interaction_type === "string" ) {interaction_types_arr = [CurrentPhaseData.Fennimal_interaction_type]}

        //Storing a base set of Fennimals and an array to hold all the trials as we create them.
        const BaseFennimalSet = Stimuli.get_Fennimals_in_array(CurrentPhaseData.Fennimals_encountered)
        let TrialSet = []

        //Now, for each interaction type we want to create a set of trials. But first, we need to determine the ordering so that two Fennimals with the same IDs are not back-to-back
        const ordering = pseudo_randomize_order_of_ids_no_back_to_back(get_all_values_in_array_of_objects("id", BaseFennimalSet), interaction_types_arr.length)

        for(let i = 0; i<interaction_types_arr.length; i++) {
            let NewSet = JSON.parse(JSON.stringify(BaseFennimalSet))
            NewSet = set_property_to_all_elem_in_arr("interaction_type", interaction_types_arr[i], NewSet)

            //Now setting to the trials in their determined order
            for(let ordnum = 0; ordnum < ordering[i].length; ordnum++) {
                TrialSet.push(get_object_from_array_based_on_value("id", ordering[i][ordnum], NewSet, true))
            }

        }

        //Now we have a maximalist set of all trials - but some of these may not be possible (the required elements of the Fennimal objects may not be specified in the stimulus data).
        // Here we delete impossible trials: trials for which we cannot display a hint, and/or for which the interaction type is not supported
        TrialSet = filter_only_possible_trials(TrialSet )


        //These phase types optionally support multiple interaction types
        /*if(Array.isArray(CurrentPhaseData.Fennimal_interaction_type)){
            if(CurrentPhaseData.Fennimal_interaction_type.length > 1){
                CurrentPhaseData.Fennimals_in_phase = []
                for(let pnum = 0; pnum < CurrentPhaseData.Fennimal_interaction_type.length; pnum++){
                    let SubArr = shuffleArray(  )
                    SubArr = set_property_to_all_elem_in_arr("interaction_type", CurrentPhaseData.Fennimal_interaction_type[pnum], SubArr)
                    CurrentPhaseData.Fennimals_in_phase = CurrentPhaseData.Fennimals_in_phase.concat(shuffleArray(SubArr))
                }
            }else{
                CurrentPhaseData.Fennimal_interaction_type = CurrentPhaseData.Fennimal_interaction_type[0]
                CurrentPhaseData.Fennimals_in_phase = shuffleArray( Stimuli.get_Fennimals_in_array(CurrentPhaseData.Fennimals_encountered) )
                CurrentPhaseData.Fennimals_in_phase = set_property_to_all_elem_in_arr("interaction_type", CurrentPhaseData.Fennimal_interaction_type, CurrentPhaseData.Fennimals_in_phase)
            }
        }else{
            CurrentPhaseData.Fennimals_in_phase = shuffleArray( Stimuli.get_Fennimals_in_array(CurrentPhaseData.Fennimals_encountered) )
            CurrentPhaseData.Fennimals_in_phase = set_property_to_all_elem_in_arr("interaction_type", CurrentPhaseData.Fennimal_interaction_type, CurrentPhaseData.Fennimals_in_phase)
        }

         */


        //Figuring out which (if any) trials can earn stars. Right now, this only applies to ask_ trials!
        if(CurrentPhaseData.bonus_stars_per_correct_answer === true) { CurrentPhaseData.bonus_stars_per_correct_answer = 1 }
        if(CurrentPhaseData.bonus_stars_per_correct_answer > 0){
            let bonus_stars_per_correct_answer = CurrentPhaseData.bonus_stars_per_correct_answer

            for(let feni = 0 ; feni < TrialSet.length; feni++){
                if(TrialSet[feni].interaction_type.includes("ask_")){
                    TrialSet[feni].bonus_stars_earnable = bonus_stars_per_correct_answer
                }
            }
        }

        //If the current day is hint and search, then we need to create one duplicate of these trials FOR EACH HINT TYPE
        if(current_phase_type === "hint_and_search"){
            let hint_type_arr = CurrentPhaseData.hint_type
            if(typeof CurrentPhaseData.hint_type === "string"){
                hint_type_arr = [CurrentPhaseData.hint_type]
            }

            let BaseTrialSet = JSON.parse(JSON.stringify(TrialSet))
            TrialSet = []

            //As before, we want to determine a pseudo-random ordering. In this case, we want to maintain the block ordering, but want to prevent
            //Note: this ordering may not work as planned if there are multiple repetitions of each Fennimal in the TrialSet (ie. if there are multiple interaction types AND multiple hint types). In this case, throw a warning
            const ids_in_trials = get_all_values_in_array_of_objects("id", BaseTrialSet)
            const newordering = pseudo_randomize_order_of_ids_no_back_to_back(ids_in_trials, hint_type_arr.length)
            if(new Set(ids_in_trials).size !== ids_in_trials.length){
                console.warn("There are multiple repetitions in interaction types AND hints. Please manually check ordering in phase")
            }

            for(let hintnum = 0; hintnum<hint_type_arr.length; hintnum++) {
                let NewTrialSet = JSON.parse(JSON.stringify(BaseTrialSet))
                NewTrialSet = set_property_to_all_elem_in_arr("hint_type", hint_type_arr[hintnum], NewTrialSet)

                for(let ordnum = 0; ordnum < newordering[hintnum].length; ordnum++) {
                    TrialSet.push(get_object_from_array_based_on_value("id", newordering[hintnum][ordnum], NewTrialSet, true))
                }
            }

            //Filtering impossible trials: trials in which the hint type is not supported
            TrialSet = filter_only_trials_with_possible_hints(TrialSet)


        }


        return(TrialSet)


    }

    function start_next_experiment_phase() {
        MapCont.disable_map_interactions()

        if (Remaining_experiment_phases.length === 0) {
            start_post_experiment_questionnaire()
        } else {
            CurrentPhaseData = Remaining_experiment_phases.shift()

            current_phase_type = CurrentPhaseData.type
            current_phase_num++
            CurrentPhaseData.phasenum = current_phase_num
            if(CurrentPhaseData.type !== "pseudoday") {current_day_num++}

            current_interaction_num_in_phase = 0

            WorldState.clear_all_locations(true)
            if (GenParam.DisplayFoundFennimalIconsOnMap.show) {
                if(GenParam.DisplayFoundFennimalIconsOnMap.clear_Fennimal_icons_from_map_at_start_of_new_day) {
                    MapCont.clear_all_Fennimal_icons_from_map()
                }
            }

            //Updating the partner behavior
            if(typeof CurrentPhaseData.partner_behavior === "undefined" ) {
                WorldState.change_partner_role_behavior(null)
            }else{
                WorldState.change_partner_role_behavior(CurrentPhaseData.partner_behavior)
            }

            //Adding the trials. Note that there could be MULTIPLE Fennimal interaction types supported.
            //  Note: ONLY works for the interaction types "hint_and_search" and/or "jump_to_trial".
            //      If any other types occur in the array, then select the first in array and print a warning.
            /*if(typeof CurrentPhaseData.Fennimal_interaction_type === "object"){
                if(Array.isArray(CurrentPhaseData.Fennimal_interaction_type)){
                    if(CurrentPhaseData.Fennimal_interaction_type.length > 1){
                        if(! (current_phase_type === "hint_and_search" || current_phase_type === "jump_to_trial")){
                            console.warn("Experiment phase contains Fennimal interactions in multiple types, which this phase type does NOT support. Ignoring all but the first interaction type. CHECK STIMULUS SETTINGS!")
                            CurrentPhaseData.Fennimal_interaction_type = CurrentPhaseData.Fennimal_interaction_type[0]
                        }
                    }else{
                        CurrentPhaseData.Fennimal_interaction_type = CurrentPhaseData.Fennimal_interaction_type[0]
                    }
                }
            }

             */

            //Check if there are any instructions to be shown
            CurrentPhaseData.instructions_to_be_shown = CurrentPhaseData.type

            if(current_phase_type === "collect_items_in_warehouse"){
                delete CurrentPhaseData.instructions_to_be_shown

                //Currently, any attributes in this phase are coded with the ID variables. Exchanging these for the actual names
                if(typeof CurrentPhaseData.question_options_toys !== "undefined"){
                    CurrentPhaseData.question_options_toys = Stimuli.get_assigned_names_of_code_array("toy", CurrentPhaseData.question_options_toys)
                }
                if(typeof CurrentPhaseData.question_options_toyboxes !== "undefined"){
                    CurrentPhaseData.question_options_toyboxes = Stimuli.get_assigned_names_of_code_array("toybox", CurrentPhaseData.question_options_toyboxes)
                }
                InstrCont.start_warehouse_task(CurrentPhaseData,current_day_num, warehouse_task_completed)

            }

            //Special steps for the trial-based phases
            if(current_phase_type === "free_exploration" || current_phase_type === "hint_and_search" || current_phase_type === "jump_to_trial" || current_phase_type === "jump_to_trial_no_instructions"){
                CurrentPhaseData.Fennimals_in_phase = get_trials_in_phase()
                //Setting the trial data
                CurrentPhaseData.number_interactions_in_phase = CurrentPhaseData.Fennimals_in_phase.length
            }





            //After loading instructions and trials, prepare the world
            switch (current_phase_type) {
                case("free_exploration"):
                    flag_exploration_phase_has_been_completed_after_instructions_closed = false

                    //Populating the entire map at once
                    //CurrentPhaseData.Fennimals_in_phase = Stimuli.get_Fennimals_in_array(CurrentPhaseData.Fennimals_encountered)
                    WorldState.populate_map_with_array_of_Fennimals(CurrentPhaseData.Fennimals_in_phase, true)
                    InstrCont.initialize_free_exploration_instructions(CurrentPhaseData.Fennimal_interaction_type,current_day_num, CurrentPhaseData.bonus_stars_per_correct_answer === true, CurrentPhaseData.include_Fennefinder, CurrentPhaseData.Fennimals_in_phase)
                    MapCont.disable_map_interactions()
                    set_property_to_all_elem_in_arr("interaction_type", CurrentPhaseData.Fennimal_interaction_type, CurrentPhaseData.Fennimals_in_phase)
                    break

                case("jump_to_trial"):
                    MapCont.disable_map_interactions()
                    InstrCont.initialize_jump_to_trial_instructions(CurrentPhaseData.Fennimal_interaction_type,current_day_num, CurrentPhaseData.bonus_stars_per_correct_answer,CurrentPhaseData.include_Fennefinder, CurrentPhaseData.Fennimals_in_phase)
                    break
                case("jump_to_trial_no_instructions"):
                    MapCont.disable_map_interactions()
                    jump_to_next_trial()
                    break

                case("hint_and_search"):
                    flag_hint_and_search_phase_general_instructions_shown = false
                    MapCont.disable_map_interactions()
                    InstrCont.initialize_hint_and_search_phase_general_instructions(CurrentPhaseData.Fennimal_interaction_type,CurrentPhaseData.hint_type,current_day_num, CurrentPhaseData.bonus_stars_per_correct_answer,CurrentPhaseData.include_Fennefinder, CurrentPhaseData.Fennimals_in_phase)
                    break

                case("name_recall_task"):
                    MapCont.disable_map_interactions()
                    InstrCont.start_name_recall_task(current_day_num, CurrentPhaseData.award_star_for_each_correct_name)
                    break
                case("card_sorting_task"):
                    MapCont.disable_map_interactions()
                    InstrCont.start_card_sorting_task(current_day_num, CurrentPhaseData.SpecialSettings)
                    break
                case("quiz"):
                    MapCont.disable_map_interactions()
                    start_quiz()
                    break
                case("match_head_to_region"):
                    MapCont.disable_map_interactions()
                    start_match_head_to_region_task()
                    break
                case("head_region_sorting_task"):
                    MapCont.disable_map_interactions()
                    start_head_to_region_sorting_task()
                    break
                case("Fennimal_attribute_sorting_task"):
                    start_Fennimal_attribute_sorting_task()
                case("pseudoday"):
                    switch(CurrentPhaseData.information){
                        case("partner_leaves"):
                            InstrCont.show_pseudo_day_information_page(CurrentPhaseData.information)
                            break
                        case("partner_returns"):
                            InstrCont.show_pseudo_day_information_page(CurrentPhaseData.information)
                            break
                        case("new_Fennimals_spotted"):
                            InstrCont.show_pseudo_day_information_page(CurrentPhaseData.information, CurrentPhaseData.title, CurrentPhaseData.display_text, Stimuli.get_Fennimals_in_array(CurrentPhaseData.displayed_icons))
                    }

                    break
            }



        }
    }

    function check_if_Fennefinder_should_be_shown(){
        Interface.FenneFinder.change_display_mode(CurrentPhaseData.include_Fennefinder)
        //Logic for the Fennefinder
        if(CurrentPhaseData.include_Fennefinder === true || CurrentPhaseData.include_Fennefinder === "low_power_mode" ){

            let TargetArr = []
            if(CurrentPhaseData.type === "hint_and_search"){
                TargetArr = [CurrentTrial]
            }
            if(CurrentPhaseData.type === "free_exploration"){
                //Check all Fennimals in the world, select all of those which have not yet been found
                let FennimalsInWorld = WorldState.get_array_of_Fennimals_on_map()
                for(let i = 0; i<FennimalsInWorld.length; i++) {
                    if(typeof FennimalsInWorld[i].name !== "undefined") {
                        if(typeof FennimalsInWorld[i].visited === "undefined"){
                            TargetArr.push(FennimalsInWorld[i])
                        }else{
                            if(FennimalsInWorld[i].visited === false) {
                                TargetArr.push(FennimalsInWorld[i])
                            }
                        }

                    }
                }

            }

            if(CurrentPhaseData.include_Fennefinder === true){
                Interface.FenneFinder.update_targets(TargetArr)
                Interface.FenneFinder.change_low_power_mode(false)
                //Interface.FenneFinder.change_display_mode()
            }
            if(CurrentPhaseData.include_Fennefinder === "low_power_mode"){
                Interface.FenneFinder.change_low_power_mode(true)
                //Interface.FenneFinder.show()
            }
        }else{
            Interface.FenneFinder.hide()
        }

    }

    function start_next_trial_in_hint_and_search_phase() {
        if (CurrentPhaseData.Fennimals_in_phase.length > 0) {
            current_trial_num_in_day ++
            CurrentTrial = CurrentPhaseData.Fennimals_in_phase.shift()
            WorldState.add_Fennimal_to_map(CurrentTrial)


            InstrCont.initialize_hint_and_search_phase_trial_instructions(CurrentTrial, CurrentTrial.hint_type, ( (current_trial_num_in_day-1) / (CurrentPhaseData.number_interactions_in_phase)) * 100)
            AudioCont.play_sound_effect("alert")
            MapCont.allow_participant_to_leave_location(true)

            //Logic for the Fennefinder
            check_if_Fennefinder_should_be_shown()

        } else {
            phase_completed()
        }
    }

    //Generic function to jump straight to the location of the nex Fennimal (bypasses the map entirely)
    function jump_to_next_trial() {
        if (CurrentPhaseData.Fennimals_in_phase.length > 0) {
            CurrentTrial = CurrentPhaseData.Fennimals_in_phase.shift()
            WorldState.add_Fennimal_to_map(CurrentTrial)
            MapCont.jump_player_to_location(CurrentTrial.location, CurrentTrial.region)
        } else {
            phase_completed()
        }
    }

    let Remaining_Questionnaire_Pages

    function start_post_experiment_questionnaire() {
        Remaining_Questionnaire_Pages = Stimuli.get_questionnaire_pages_arr()
        start_next_questionnaire_page()
    }

    function start_next_questionnaire_page() {
        if (Remaining_Questionnaire_Pages.length > 0) {
            InstrCont.show_questionnaire_page(Remaining_Questionnaire_Pages.shift())
        } else {
            finish_experiment()
        }

    }

    this.questionnaire_page_completed = function (PageData) {
        DataCont.store_questionnaire_data(PageData)
        start_next_questionnaire_page()

    }

    function finish_experiment() {
        show_payment_screen()
    }

    this.submit_experiment = function () {
        alert("In case you pressed the button before submitting the completion code to prolific, your code is: " + DataCont.get_completion_code() + ". Press OK to finalize your submission.")
        console.log("EXPERIMENT SUBMITTED")

        //Submit after the alert
        document.getElementById("submitbutton").click()
    }

    //GENERAL INSTRUCTIONS
    ////////////////////////
    //On creation, deep copy the remaining instruction pages
    let Remaining_Instructions_Pages = Stimuli.get_instruction_pages_arr(), current_instructions_page

    function show_next_general_instructions_page() {
        //If we just finished the character creation screen, then store the details of the player icon and partner
        if(current_instructions_page === "character_creation"){ DataCont.store_custom_icon_data()}

        if (Remaining_Instructions_Pages.length > 0) {
            //Make sure that the attention check counter has not started yet
            AtCheckCont.toggle_recording_state("passive")

            //Show the next general instructions page
            current_instructions_page = Remaining_Instructions_Pages.shift()
            switch (current_instructions_page) {
                case("consent"):
                    InstrCont.show_consent_page();
                    break
                case("browser_check_and_full_screen_prompt"):
                    InstrCont.show_browser_check_and_fullscreen_page();
                    break
                case("overview"):
                    InstrCont.show_overview_page();
                    break
                case("single_sitting"):
                    InstrCont.show_single_sitting_page();
                    break
                case("card_sorting_task"):
                    MapCont.disable_map_interactions()
                    InstrCont.start_card_sorting_task(false, undefined)
                    break
                case("character_creation"):
                    InstrCont.show_character_creation_screen(MapCont.update_player_settings)
                    break
                case("partner_introduction"):
                    InstrCont.show_partner_introduction_screen()
                    break

            }


        } else {
            //General instructions have been completed, continue with the first main experiment phase.
            // Also make sure that the attention check controller knows to get started measuring
            AtCheckCont.toggle_recording_state("active")
            start_next_experiment_phase()
        }

    }

    this.consent_provided_by_participant = function () {
        DataCont.record_consent_given()
    }

    this.general_instructions_page_completed = function () {
        show_next_general_instructions_page()
    }

    //PHASE INSTRUCTIONS
    //////////////////

    //Call when the instructions page has been closed
    this.instructions_page_closed = function () {
        switch (current_phase_type) {
            case("free_exploration"):
                if (typeof flag_exploration_phase_has_been_completed_after_instructions_closed !== "undefined") {
                    if (flag_exploration_phase_has_been_completed_after_instructions_closed) {
                        phase_completed()
                    } else {
                        //Tell the map controller to re-enable movement (and show the instructions button on the top of the page)
                        MapCont.enable_map_interactions()
                        MapCont.show_request_instructions_button()
                        check_if_Fennefinder_should_be_shown()
                    }

                } else {
                    //Tell the map controller to re-enable movement (and show the instructions button on the top of the page)
                    MapCont.enable_map_interactions()
                    MapCont.show_request_instructions_button()
                    check_if_Fennefinder_should_be_shown()
                }
                break
            case("hint_and_search"):
                if (flag_hint_and_search_phase_general_instructions_shown === false) {
                    flag_hint_and_search_phase_general_instructions_shown = true
                    start_next_trial_in_hint_and_search_phase()

                } else {
                    MapCont.enable_map_interactions()
                    MapCont.show_request_instructions_button()
                }
                break
            case("jump_to_trial"):
                jump_to_next_trial()
                break
            case("jump_to_trial_no_instructions"):
                jump_to_next_trial()
                break

        }
    }

    //Call when the instructions have been requested by the participant
    this.instructions_requested = function () {
        MapCont.disable_map_interactions()
        InstrCont.instructions_requested_by_participant()

    }

    //FENNIMAL INTERACTIONS
    //////////////////////////
    let CurrentFennimal, current_interaction_num_in_phase

    this.entering_location = function (location) {
        //Check if there is a Fennimal present.
        let FennimalPresent = WorldState.get_reference_to_Fennimal_object_at_location(location)
        if (FennimalPresent !== false) {
            start_Fennimal_interaction_at_location(location)

        }

    }
    this.leaving_location = function () {
        if (typeof CurrentFennimal !== "undefined") {
            CurrentFennimal.clear()
        }
    }

    function start_Fennimal_interaction_at_location(location) {
        //Check if the Fennimal has already been visited in this phase. If so, default to passive observation only
        let FennimalObject = WorldState.get_reference_to_Fennimal_object_at_location(location)

        let AdditionalInformation = {}
        switch (FennimalObject.interaction_type) {
            case("polaroid_photo_active"):
                AdditionalInformation.allowed_attempts_before_answer_given = CurrentPhaseData.allowed_attempts_before_answer_given
                break
            case("give_food_passive"):
                FennimalObject.interaction_type = "give_food"
                break
            case("give_food_active"):
                FennimalObject.interaction_type = "give_food"
                AdditionalInformation.Distractor_Food_Items = Stimuli.get_all_map_codes_of_array("food",CurrentPhaseData.question_options_food)
                if(AdditionalInformation.Distractor_Food_Items === false){AdditionalInformation.Distractor_Food_Items = Stimuli.get_all_x_encountered_during_experiment("food_preference")}
                break
            case("play_with_toy_active"):{
                AdditionalInformation.Distractor_Toys = Stimuli.get_all_map_codes_of_array("toy",CurrentPhaseData.question_options_toys)
                if(AdditionalInformation.Distractor_Toys === false){AdditionalInformation.Distractor_Toys = Stimuli.get_all_x_encountered_during_experiment("toy")}

                if(typeof FennimalObject.toybox !== "undefined"){
                    AdditionalInformation.Distractor_Toyboxes = Stimuli.get_all_map_codes_of_array("toybox",CurrentPhaseData.question_options_toyboxes)

                    if(AdditionalInformation.Distractor_Toyboxes === false){AdditionalInformation.Distractor_Toyboxes = Stimuli.get_all_x_encountered_during_experiment("box")}
                }
                break
            }
        }

        //Some more additional information is needed if this is an ask_x interaction

        if(FennimalObject.interaction_type.includes("ask_")){
            if(FennimalObject.interaction_type.includes("contents_box") ||FennimalObject.interaction_type.includes("toy") ){
                AdditionalInformation.Distractor_Toys = Stimuli.get_all_map_codes_of_array("toy",CurrentPhaseData.question_options_toys)
                if(AdditionalInformation.Distractor_Toys === false){AdditionalInformation.Distractor_Toys = Stimuli.get_all_x_encountered_during_experiment("toy")}
            }


        }




        if (typeof FennimalObject.visited === "undefined") {
            if (FennimalObject.visited === false) {
                current_interaction_num_in_phase++
                FennimalObject.num_in_phase = current_interaction_num_in_phase
            }
        }
        CurrentFennimal = new FENNIMALCONTROLLER(FennimalObject, that, AdditionalInformation)

    }

    this.Fennimal_interaction_completed = function (FenObj) {
        let Fennimal_previously_visited = (typeof FenObj.visited) !== "undefined"
        WorldState.Fennimal_encounter_finshed(FenObj.name)
        FenObj.visited = true

        //If enabled, add a Fennimal icon to the map
        if (GenParam.DisplayFoundFennimalIconsOnMap.show) {
            MapCont.add_Fennimal_icon_on_map(FenObj)
        }

        //Make and store a copy of the data
        if (typeof CurrentPhaseData.Data === "undefined") {
            CurrentPhaseData.Data = []
        }
        CurrentPhaseData.Data.push(JSON.parse(JSON.stringify(FenObj)))


        // Check the structure of this phase. If its a trial-based setup, then go to the next trial.
        // If its free exploration, then check if the participant has met all conditions. If not, allow the participant to roam free
        switch (current_phase_type) {
            case("free_exploration"):
                //Update the progress bar in the instructions
                InstrCont.update_progress_within_day((current_interaction_num_in_phase / CurrentPhaseData.number_interactions_in_phase) * 100)

                if (Fennimal_previously_visited === false) {
                    if(CurrentPhaseData.Fennimal_interaction_type === "polaroid_photo_active" || CurrentPhaseData.Fennimal_interaction_type === "polaroid_photo_passive" ){
                        Interface.Prompt.show_message("This photo has been added to your collection!")

                    }
                    exploration_phase_add_photo()

                } else {
                    MapCont.allow_participant_to_leave_location(true)
                }

                //Update the Fennefinder (if applicable)
                check_if_Fennefinder_should_be_shown()

                break
            case("hint_and_search"):
                //Update the progress bar in the instructions
                InstrCont.update_progress_within_day((current_interaction_num_in_phase / CurrentPhaseData.number_interactions_in_phase) * 100)

                if (FenObj.name === CurrentTrial.name) {
                    start_next_trial_in_hint_and_search_phase()
                    Interface.Prompt.show_message("Time to find the next Fennimal!")
                } else {
                    MapCont.allow_participant_to_leave_location(true)
                }

                break
            case("jump_to_trial"):
               setTimeout(function () {
                   MapCont.return_to_map()
                   jump_to_next_trial()
               },500)
                break
            case("jump_to_trial_no_instructions"):
                setTimeout(function () {
                    MapCont.return_to_map()
                    jump_to_next_trial()
                },500)
                break

        }

    }

    // Phase-specific functions
    ///////////////////////////////

    //Exploration phase: check if all the locations and Fennimals have been visited. If so, finish the block. If not, allow participants to explore more...
    function exploration_phase_add_photo() {
        //AudioCont.play_sound_effect("alert")
        //Show the instructions page with the new photo added.
        //InstrCont.instructions_requested_by_participant()

        //Check if all Fennimals have been discovered. If not, allow the participant to continue. If yes, then this phase has been completed
        if (exploration_phase_check_if_all_Fennimals_visited()) {
            // Raise a flag: if the instructions page is now closed, then go to the next experiment phase.
            AudioCont.play_sound_effect("alert")
            InstrCont.instructions_requested_by_participant()

            flag_exploration_phase_has_been_completed_after_instructions_closed = true
            InstrCont.update_exploration_phase_instructions_to_show_completion()
        } else {
            MapCont.allow_participant_to_leave_location(true)
        }

    }

    function exploration_phase_check_if_all_Fennimals_visited() {
        //Check all Fennimals and whether they have been visited
        let FennimalsInWorld = WorldState.get_array_of_Fennimals_on_map()

        //If Fennimals have a name, then they should be visited. Otherwise, ignore for the count
        for(let i = 0; i<FennimalsInWorld.length; i++) {
            if(typeof FennimalsInWorld[i].name !== "undefined") {
                if(typeof FennimalsInWorld[i].visited === "undefined") {
                    return false
                }
                if(FennimalsInWorld[i].visited === false) {
                    return false
                }

            }


        }
        return true


    }

    function exploration_phase_completed() {
        //Leave the location and return to the map
        if (typeof CurrentFennimal !== "undefined") {
            CurrentFennimal.clear()
        }

        MapCont.reset_map_to_player_in_center()
        phase_completed()

    }

    //Recalled names task
    function process_recalled_names(RecalledNames, max_dist_for_match) {
        //Get an array of all the names encountered during the experiment
        // Each element should have an ID and a name

        let AllFennimals = Stimuli.get_all_Fennimals_objects_in_array()
        let All_Names_In_Exp = []
        for (let i = 0; i < AllFennimals.length; i++) {
            All_Names_In_Exp.push({name: AllFennimals[i].name, id: AllFennimals[i].id})
        }

        //Attempting to assign matches
        for (let i = 0; i < RecalledNames.length; i++) {
            let Possible_matches = []
            for (let x = 0; x < All_Names_In_Exp.length; x++) {
                let dist = LevenshteinDistance(RecalledNames[i].ans.toLowerCase(), All_Names_In_Exp[x].name.toLowerCase())
                if (dist <= max_dist_for_match) {
                    Possible_matches.push({matchedID: All_Names_In_Exp[x].id, dist: dist})
                }
            }

            //If there is a single match, pick it
            if (Possible_matches.length === 1) {
                RecalledNames[i].matchedID = Possible_matches[0].matchedID
                RecalledNames[i].LSdist = Possible_matches[0].dist
            }

            //If there are multiple matches, then send a warning! (This should not happen). Add a flag to the data
            if (Possible_matches.length > 1) {
                console.warn("WARNING: MULTIPLE MATCHES TO RECALLED NAME")
                let closestMatch = Possible_matches[0].matchedID
                let closestDist = Possible_matches[0].dist

                for (let n = 1; n < Possible_matches.length; n++) {
                    if (Possible_matches[n].dist < closestDist) {
                        closestMatch = Possible_matches[n].matchedID
                        closestDist = Possible_matches[n].dist

                    }
                }

                RecalledNames[i].matchedID = closestMatch
                RecalledNames[i].LSdist = closestDist
                RecalledNames[i].flagged_for_multiple_matches = true


            }

        }
        return (RecalledNames)

    }

    this.recalled_names_task_complete = function (RecalledNames) {
        CurrentPhaseData.RecalledNames = JSON.parse(JSON.stringify(process_recalled_names(RecalledNames, CurrentPhaseData.allowed_Levenshtein_distance_for_match)))

        //For recordkeeping: compile an array of all (unique) IDs which were correctly recalled
        let Array_recalled_IDs = []
        for (let i = 0; i < RecalledNames.length; i++) {
            if (typeof RecalledNames[i].matchedID !== "undefined") {
                Array_recalled_IDs.push(RecalledNames[i].matchedID)
            }
        }
        Array_recalled_IDs = [...new Set(Array_recalled_IDs)]
        CurrentPhaseData.Array_of_recalled_IDs = Array_recalled_IDs
        if (typeof CurrentPhaseData.award_star_for_each_correct_name !== "undefined") {
            if (CurrentPhaseData.award_star_for_each_correct_name) {
                DataCont.record_stars_earned(current_day_num, CurrentPhaseData.type, CurrentPhaseData.Array_of_recalled_IDs.length, Stimuli.get_all_Fennimals_objects_in_array().length)
            }
        }

        DataCont.store_phase_data(CurrentPhaseData)

        //TODO: calculate score here

        start_next_experiment_phase()

    }

    this.card_sorting_task_complete = function (CardData) {

        //Card data can be ran in either the instructions or as a separate day. What we do next depends on our current situation
        if (typeof CurrentPhaseData !== "undefined") {
            CurrentPhaseData.CardData = JSON.parse(JSON.stringify(CardData))
            DataCont.store_phase_data(CurrentPhaseData)
            start_next_experiment_phase()
        } else {
            DataCont.store_card_data_when_included_in_general_instructions(CardData)
            show_next_general_instructions_page()
        }

    }

    //QUIZ
    /////////
    function start_quiz() {
        create_quiz_questions()
        InstrCont.show_quiz_instructions(current_phase_num, CurrentPhaseData)

    }

    this.quiz_instructions_closed = function () {
        show_next_quiz_question()
    }

    //Assumes that the CurrentPhaseData is the quiz type, creates a set of Questions in the object
    function create_single_quiz_subquestion(subquestion_type, FenObj) {
        //Extracting some information
        let subject_facing_region_names = []
        let subject_facing_color_names = []
        let subject_facing_body_names = []

        let regions_in_experiment = Stimuli.get_all_x_encountered_during_experiment("region")
        for (let i = 0; i < regions_in_experiment.length; i++) {
            subject_facing_region_names.push(GenParam.RegionData[regions_in_experiment[i]].display_name)
            subject_facing_color_names.push(GenParam.RegionData[regions_in_experiment[i]].color_description)
        }

        let bodies_in_experiment = Stimuli.get_all_x_encountered_during_experiment("body")
        for (let i = 0; i < bodies_in_experiment.length; i++) {
            subject_facing_body_names.push(GenParam.BodyDisplayNames[bodies_in_experiment[i]])
        }

        let SubQ = {qtype: subquestion_type}

        switch (subquestion_type) {
            case("name"):
                SubQ.question_type = "text"
                SubQ.question_text = "What is this Fennimal's name?"
                SubQ.answer_options = "text"
                SubQ.correct_answer = FenObj.name
                break
            case("location"):
                SubQ.question_type = "dropdown"
                SubQ.question_text = "Where did you see this Fennimal?"
                SubQ.answer_options = Stimuli.get_all_locations_visited_during_experiment_as_participant_facing_names()
                SubQ.correct_answer = GenParam.LocationDisplayNames[FenObj.location]
                break
            case("region"):
                SubQ.question_type = "dropdown"
                SubQ.question_text = "In which part of the island did you see this Fennimal?"
                SubQ.answer_options = subject_facing_region_names
                SubQ.correct_answer = GenParam.RegionData[FenObj.region].display_name
                break
            case("color"):
                SubQ.question_type = "dropdown"
                SubQ.question_text = "What color did this Fennimal have?"
                SubQ.answer_options = subject_facing_color_names
                SubQ.correct_answer = GenParam.RegionData[FenObj.region].color_description
                break
            case("other_heads_in_region"):
                SubQ.question_type = "head_select"
                //The answer options should be an array of Fennimal object WHICH DOES NOT INCLUDE THIS TARGET FENNIMAL.
                //The correct answers should be an array of IDs
                SubQ.correct_answer = []

                let OtherFennimalArray = []
                let id_target = FenObj.id
                let AllFennimals = Stimuli.get_all_Fennimals_objects_in_array()
                for (let i = 0; i < AllFennimals.length; i++) {
                    if (AllFennimals[i].id !== id_target) {
                        OtherFennimalArray.push(AllFennimals[i])
                        if (AllFennimals[i].region === FenObj.region) {
                            SubQ.correct_answer.push(AllFennimals[i].id)
                        }
                    }
                }
                SubQ.answer_options = shuffleArray(OtherFennimalArray)

                SubQ.question_text = "Which " + SubQ.correct_answer.length + " other Fennimals did you see in the same region as this Fennimal?"
                break
            case("body_type"):
                SubQ.question_type = "dropdown"
                SubQ.question_text = "What description best matches the shape of this Fennimal's body?"
                SubQ.answer_options = subject_facing_body_names
                SubQ.correct_answer = GenParam.BodyDisplayNames[FenObj.body]
                break


        }
        return (SubQ)

    }

    //TODO: this depends on the no longer supported SUBGROUP structure.
    function create_quiz_questions() {
        //Each QuestionObject needs to have the following properties:
        //  A question_number
        //  A Fennimal Object
        //  A cue_type
        //  An array of subsquestions, each of which:
        //      Has a question_text, an answer_options ("text", or an array for dropdown) and a correct_answer
        let QuestionsArr = []

        for (let blocknum = 0; blocknum < CurrentPhaseData.QuestionSets.length; blocknum++) {
            let BlockQuestions = []

            if (typeof CurrentPhaseData.QuestionSets[blocknum].question_set_type === "undefined") {
                CurrentPhaseData.QuestionSets[blocknum].question_set_type = "normal"
            }

            //There are type main types of quiz questions supported: normal type (for checking whether partcipants memorized the Fennimals, which should go first, and treatment types, which differ between different Fennimals.
            switch (CurrentPhaseData.QuestionSets[blocknum].question_set_type) {
                case("normal"):
                    let FennimalsInSet = Stimuli.get_Fennimals_in_array(CurrentPhaseData.QuestionSets[blocknum].S)

                    for (let qnum = 0; qnum < FennimalsInSet.length; qnum++) {
                        let NewQ = {
                            FenObj: FennimalsInSet[qnum],
                            cue_type: CurrentPhaseData.QuestionSets[blocknum].cue,
                            subquestions: [],
                            award_star_for_correct_answer: CurrentPhaseData.award_star_for_correct_answer,
                            question_type: "normal"
                        }

                        for (let subnum = 0; subnum < CurrentPhaseData.QuestionSets[blocknum].questions_asked.length; subnum++) {
                            NewQ.subquestions.push(create_single_quiz_subquestion(CurrentPhaseData.QuestionSets[blocknum].questions_asked[subnum], FennimalsInSet[qnum]))
                        }
                        BlockQuestions.push(NewQ)

                    }
                    QuestionsArr.push(shuffleArray(BlockQuestions))
                    break
                case("treatment"):
                    let SetsOfQuestions = []
                    for (let questionsetnum = 0; questionsetnum < CurrentPhaseData.QuestionSets[blocknum].question_groups.length; questionsetnum++) {
                        //Get all the Fennimals in this set
                        let group_name = CurrentPhaseData.QuestionSets[blocknum].question_groups[questionsetnum].Fennimals_included
                        let FennimalsInSubset = Stimuli.get_Fennimals_in_subgroup(group_name)

                        //Now for each Fennimal in this subset we need to create a question element
                        for (let qnum = 0; qnum < FennimalsInSubset.length; qnum++) {

                            let NewQ = {
                                FenObj: FennimalsInSubset[qnum],
                                cue_type: CurrentPhaseData.QuestionSets[blocknum].cue,
                                show_name: CurrentPhaseData.QuestionSets[blocknum].show_name,
                                subquestions: [],
                                award_star_for_correct_answer: CurrentPhaseData.award_star_for_correct_answer,
                                question_type: "treatment"
                            }

                            for (let subnum = 0; subnum < CurrentPhaseData.QuestionSets[blocknum].question_groups[questionsetnum].questions_asked.length; subnum++) {
                                NewQ.subquestions.push(create_single_quiz_subquestion(CurrentPhaseData.QuestionSets[blocknum].question_groups[questionsetnum].questions_asked[subnum], FennimalsInSubset[qnum]))
                            }
                            SetsOfQuestions.push(NewQ)


                        }


                    }
                    QuestionsArr.push(shuffleArray(SetsOfQuestions.flat()))
            }
        }

        CurrentPhaseData.questions = QuestionsArr.flat()

        //Adding numbers
        for (let i = 0; i < CurrentPhaseData.questions.length; i++) {
            CurrentPhaseData.questions[i].question_num = (i + 1)
            CurrentPhaseData.total_num_questions_in_quiz = CurrentPhaseData.questions.length
            CurrentPhaseData.num_questions_correctly_answered = 0
            CurrentPhaseData.num_questions_answered = 0
        }

        //Cleaning up: we can now delete the QuestionSets from the CurrentPhaseData object
        delete CurrentPhaseData.questions_asked
        delete CurrentPhaseData.QuestionSets

        //Adding an array to hold all questions
        CurrentPhaseData.QuestionsAnswered = []

    }

    function phase_completed() {
        //Store the data
        DataCont.store_phase_data(CurrentPhaseData)

        //Leave the location and return to the map
        if (typeof CurrentFennimal !== "undefined") {
            CurrentFennimal.clear()
        }

        //Check if we need to store payment data
        let can_earn_bonus = CurrentPhaseData.bonus_stars_per_correct_answer === true || CurrentPhaseData.bonus_stars_per_correct_answer > 0

        let total_bonus_stars_earned = 0, max_bonus_stars = 0


        if(can_earn_bonus){

            if(["jump_to_trial", "hint_and_search", "free_exploration"].includes(CurrentPhaseData.type)){
                for(let trialnum = 0; trialnum < CurrentPhaseData.Data.length; trialnum++) {
                    if(CurrentPhaseData.Data[trialnum].bonus_stars_earned !== false){
                        if(CurrentPhaseData.Data[trialnum].bonus_stars_earned === true){
                            total_bonus_stars_earned = total_bonus_stars_earned + 1
                        }else{
                            total_bonus_stars_earned = total_bonus_stars_earned + CurrentPhaseData.Data[trialnum].bonus_stars_earned
                        }
                    }
                    max_bonus_stars = max_bonus_stars  + CurrentPhaseData.Data[trialnum].bonus_stars_earnable
                }
            }
            CurrentPhaseData.bonus_stars_earned = total_bonus_stars_earned
            DataCont.record_stars_earned(current_day_num,"", total_bonus_stars_earned, max_bonus_stars)
        }


        MapCont.reset_map_to_player_in_center()
        start_next_experiment_phase()

    }

    function show_next_quiz_question() {
        if (CurrentPhaseData.questions.length > 0) {
            InstrCont.show_next_quiz_question(CurrentPhaseData.questions.shift())
        } else {
            quiz_completed()
        }
    }

    this.quiz_question_answered = function (QuizQuestion) {
        let QuizQuestionReduced = {}

        if (typeof QuizQuestion.Answer_Head_Select !== "undefined") {
            QuizQuestionReduced = {
                id: QuizQuestion.FenObj.id,
                cue_type: QuizQuestion.cue_type,
                special_question_type: "head_select_task",
                answer: QuizQuestion.Answer_Head_Select,
                answers_correct: QuizQuestion.Answer_Head_Select.correct,
                num: QuizQuestion.question_num,

            }
            QuizQuestion.subquestions_correct_arr = [QuizQuestion.Answer_Head_Select.correct]
        } else {
            //Reduce information
            let ReducedSubquestions = []
            for (let i = 0; i < QuizQuestion.subquestions.length; i++) {
                ReducedSubquestions.push({
                    qtype: QuizQuestion.subquestions[i].qtype,
                    ans: QuizQuestion.subquestion_answer_arr[i],
                    cor: QuizQuestion.subquestions_correct_arr[i]
                })
            }

            QuizQuestionReduced = {
                id: QuizQuestion.FenObj.id,
                cue_type: QuizQuestion.cue_type,
                subquestions: ReducedSubquestions,
                answers_correct: !QuizQuestion.subquestions_correct_arr.includes(false),
                num: QuizQuestion.question_num
            }

        }


        //Store in array
        QuizQuestionReduced.question_type = QuizQuestion.question_type
        CurrentPhaseData.QuestionsAnswered.push(JSON.parse(JSON.stringify(QuizQuestionReduced)))

        //Update the counters for the completed quiz questions
        CurrentPhaseData.num_questions_answered++
        if (!QuizQuestion.subquestions_correct_arr.includes(false)) {
            CurrentPhaseData.num_questions_correctly_answered++
        }

        //Now check if we need to append this question to the back of the cue again. That is, if this question has one or more mistakes AND the quiz requires perfect answers
        if (CurrentPhaseData.require_perfect_answers) {
            if (QuizQuestion.subquestions_correct_arr.includes(false)) {
                //Delete the previous answer
                delete QuizQuestion.subquestions_correct_arr

                //Check if the quiz question already contains a value to denote that this is a repeat question. If not, add it
                if (typeof QuizQuestion.num_previous_incorrect_answers === "undefined") {
                    QuizQuestion.num_previous_incorrect_answers = 1
                } else {
                    QuizQuestion.num_previous_incorrect_answers++
                }

                //Push it back on the cue
                CurrentPhaseData.questions.push(JSON.parse(JSON.stringify(QuizQuestion)))

            }
        }

        //Updating the progress bar
        let percentage_completed = (CurrentPhaseData.num_questions_answered / CurrentPhaseData.total_num_questions_in_quiz) * 100
        if (typeof CurrentPhaseData.require_perfect_answers !== "undefined") {
            if (CurrentPhaseData.require_perfect_answers) {
                percentage_completed = (CurrentPhaseData.num_questions_correctly_answered / CurrentPhaseData.total_num_questions_in_quiz) * 100
            }
        }
        InstrCont.update_progress_within_day(percentage_completed)

        //Now continuing to the next question
        show_next_quiz_question()


    }

    function quiz_completed() {
        //Cleaning up
        delete CurrentPhaseData.questions


        if (typeof CurrentPhaseData.award_star_for_correct_answer) {
            if (CurrentPhaseData.award_star_for_correct_answer) {
                if (CurrentPhaseData.require_perfect_answers) {
                    DataCont.record_stars_earned(current_day_num, CurrentPhaseData.type, CurrentPhaseData.num_questions_correctly_answered, false)
                } else {
                    DataCont.record_stars_earned(current_day_num, CurrentPhaseData.type, CurrentPhaseData.num_questions_correctly_answered, CurrentPhaseData.num_questions_answered)
                }
            }
        }
        phase_completed()
    }

    // MATCH HEAD TO SAMPLE
    /////////////////////////
    function start_match_head_to_region_task() {
        let TaskData = create_match_head_to_region_data(Stimuli.get_Fennimals_in_array(CurrentPhaseData.Fennimals_encountered))
        InstrCont.start_match_head_to_region_task(current_day_num, TaskData)

    }

    function create_match_head_to_region_data(Array_of_Included_Fennimals) {
        //Returns an array containing one element per question. Each of these elements:
        //      Contains a property: "target_region"
        //      Contains an array of IDs for the "target_Fennimal_ids"
        //      Contains an array of FennimalObjects for  all "Fennimal_Object_Arr"

        //Finding all unique regions in the provided array
        let all_regions = []
        for (let i = 0; i < Array_of_Included_Fennimals.length; i++) {
            all_regions.push(Array_of_Included_Fennimals[i].region)
        }
        all_regions = [...new Set(all_regions)]

        //Now for each region we can create a question
        let Out = []
        for (let regnum = 0; regnum < all_regions.length; regnum++) {
            let target = all_regions[regnum]

            let NewObj = {
                target_region: target,
                target_Fennimal_ids: [],
                Fennimal_Object_Arr: Array_of_Included_Fennimals
            }

            //Finding all Fennimals in this region
            for (let i = 0; i < Array_of_Included_Fennimals.length; i++) {
                if (Array_of_Included_Fennimals[i].region === target) {
                    NewObj.target_Fennimal_ids.push(Array_of_Included_Fennimals[i].id)
                }
            }

            //Pushing
            Out.push(shuffleArray(NewObj))
        }

        return (Out)
    }

    // HEAD TO REGION SORTING TASK
    ////////////////////////////////
    function start_head_to_region_sorting_task() {
        InstrCont.start_head_to_region_sorting_task(current_day_num, Stimuli.get_Fennimals_in_array(CurrentPhaseData.Fennimals_encountered))
    }

    this.sorting_task_completed = function (Data) {
        CurrentPhaseData.Errors = JSON.parse(JSON.stringify(Data))
        DataCont.store_phase_data(CurrentPhaseData)

        if(CurrentPhaseData.maximum_earnable_stars > 0){
            DataCont.record_stars_earned(current_day_num, "Sorting Task", Math.max(0,CurrentPhaseData.maximum_earnable_stars - Data.length),CurrentPhaseData.maximum_earnable_stars)
        }
        start_next_experiment_phase()
    }

    function start_Fennimal_attribute_sorting_task(){
        InstrCont.start_Fennimal_attribute_sorting_task(current_day_num, Stimuli.get_Fennimals_in_array(CurrentPhaseData.Fennimals_encountered), CurrentPhaseData.attribute_order, CurrentPhaseData.maximum_earnable_stars)
    }

    //END OF EXPERIMENT FUCNTIONS
    function show_payment_screen() {
        InstrCont.show_payment_screen(DataCont.get_payment_data())

    }

    //Warehouse task
    function warehouse_task_completed(CollectedTaskData){
        DataCont.store_phase_data(CollectedTaskData)
        DataCont.record_stars_earned(current_day_num,"warehouse", CollectedTaskData.bonus_stars_earned, CollectedTaskData.max_bonus_stars)
        start_next_experiment_phase()

    }


}






