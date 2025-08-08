//Loading SVG Elements
let SVG_loader = new SVG_LOADER()

//Creating a General Parameters object
const GenParam = new GENERALPARAM()

//Creating an interface controller
let Interface = new InterfaceController()

//Creating an audio controller
let AudioCont = new AudioControllerObject()


//Defining the world state object here
WorldStateObject = function(){
    let that = this
    //This keeps track of which Fennimals are on the map, which locations exist, which have been searched already etc.
    //Before use, call to update the list of available regions and locations.

    // State will be keyed on location: State[location] yields an object containing {state, region}
    let State

    //CREATION FUNCTIONS
    //////////////////////

    this.populate_map_with_array_of_Fennimals = function(Arr, require_search_before_entering){
        for(let i =0;i<Arr.length;i++){
            State[Arr[i].location] = Arr[i]
            if(require_search_before_entering){
                State[Arr[i].location].search_status = "unsearched"
            }else{
                State[Arr[i].location].search_status = "searched_Fennimal_not_visited"
            }
        }
    }

    this.add_Fennimal_to_map = function(Fennimal){
        State[Fennimal.location] = Fennimal
        State[Fennimal.location].search_status = "unsearched"
    }

    this.rebuild_state_from_available_locations = function(Array_of_visited_locations_and_regions){
        State = {}
        for(let i =0;i<Array_of_visited_locations_and_regions.length;i++){
            State[Array_of_visited_locations_and_regions[i][0]] = {state: "empty_unsearched", region: Array_of_visited_locations_and_regions[i][1] }
        }
    }

    this.clear_all_locations = function(require_search_before_entering){
        for(let key in State){
            if(require_search_before_entering){
                State[key] = {
                    search_status: "unsearched"
                }
            }else{
                State[key] = {
                    search_status: "searched_empty"
                }
            }
        }

    }

    // MAP SEARCH FUNCTIONS
    ////////////////////////

    //Returns true if the location is search-able, false if not
    this.check_if_location_can_be_searched = function(location_name){
        if(State.hasOwnProperty(location_name)){
            //If this location's state holds an object, then return this object (this is the Fennimal).
            if(typeof State[location_name].state === "object"){
                return(true)
            }

            // Same if this location's state is a string. However, in this case we want to make sure that any unsearched location is now updated to be searched
            if(typeof State[location_name].state === "string"){
                if(State[location_name].state === "empty_searched"){
                    return(true)
                }

                if(State[location_name].state === "empty_unsearched"){
                    return(true)
                }


            }

        }else{
            //console.error("Attempting to check searability of location not listed in Worldstate: " + location_name + ". Returning false")
            return(false)
        }
    }

    this.check_if_location_has_already_been_searched = function(location_name){
        if(State.hasOwnProperty(location_name)){
            if(State[location_name].state === "empty_searched"){
                return(true)
            }

        }else{
            console.error("Attempting to check location not listed in Worldstate: " + location_name + ". Returning false")

        }
        return(false)
    }

    //Returns whether the location has been searched. If searched, returns whether the location empty, has an unvisited Fennimal or a visited Fennimal.
    this.get_search_status_of_location = function(location_name){
        let search_status = false

        if(typeof State[location_name] === "object"){
            if(typeof State[location_name].search_status === "undefined"){
                return false
            }else{
                return State[location_name].search_status
            }
        }

        return(search_status)

    }

    //If a Fennimal is present at this location, return A REFERENCE TO the Fennimal Object. Else, returns a string "empty"
    this.perform_search_at_location = function(location_name){
        if(State.hasOwnProperty(location_name)){
            //If the object in this location has an property "name", then it is a Fennimal. Else, its an empty location
            if(typeof State[location_name].name === "undefined"){
                State[location_name].search_status = "searched_empty"
                return("empty")
            }else{
                // Return here depends on whether the Fennimal has already been visited or not
                let has_been_visited
                if(typeof State[location_name].visited === undefined){
                    has_been_visited = false
                }else{
                    if(State[location_name].visited){
                        has_been_visited = true
                    }else{
                        has_been_visited = false
                    }
                }

                if(has_been_visited){
                    State[location_name].search_status = "searched_Fennimal_visited"
                }else{
                    State[location_name].search_status = "searched_Fennimal_not_visited"
                }

                return(State[location_name].search_status)
            }


        }else{
            console.error("Attempting to search location not included in Worldstate: " + location_name + ". Returning false")
            return(false)
        }

    }

    // FENNIMAL INTERACTION FUNCTIONS
    /////////////////////////////////
    //NB: THIS DOES NOT PASS BY VALUE! THIS IS BY DESIGN.
    this.get_reference_to_Fennimal_object_at_location = function(location){
        if(typeof State[location] !== "undefined"){
            if(typeof State[location].name !== "undefined"){
                return State[location]
            }else{
                return false
            }
        }else{
            return false
        }
    }

    ///GENERAL RETRIEVAL FUNCTIONS
    //////////////////////////////

    this.get_location_states_in_array = function(){
        let Arr = []
        for(let key in State){
            let NewObj = JSON.parse(JSON.stringify(State[key]))
            NewObj.location = key
            Arr.push(NewObj)
        }
        return(Arr)
    }

    //Get an array of all Fennimals currently present on the map (deep copy!)
    this.get_array_of_Fennimals_on_map = function(){
        let Arr = []
        for(let key in State){
            if(typeof State[key] === 'object'){
                Arr.push(JSON.parse(JSON.stringify(State[key])))
            }
        }

        return(Arr)

    }



}

DATACONTROLLER = function(Stimuli){
    let StartTime = Date.now()

    let ExperimentData = {
        Expcode: Stimuli.get_experiment_code(),
        start_date: new Date().toString(),
        browser: getBrowser(),
        TimeStamps: [],
        RawPhaseData: [],
        StoredData: [],
        Questionnaire: []
    }

    //On creation, store the Fennimals and experiment code. We want to store these templates in minimal form

    function store_Fennimal_objects(){
        let FennArr = Stimuli.get_Fennimals_objects_in_array()

        ExperimentData.Fennimals = []
        for(let i =0;i<FennArr.length;i++){
            let NewObj = FennArr[i]

            //Check if we used a custom color. If not, delete this entry
            if(NewObj.color_scheme_origin !== "custom"){
                delete NewObj.ColorScheme
            }

            //Store this template
            ExperimentData.Fennimals.push(JSON.parse(JSON.stringify(NewObj)))
        }

    }
    store_Fennimal_objects()

    //On creation, check to see if there is a Prolific ID code. If so, store the first few digits
    function check_if_there_is_a_prolific_code(){
        let url_string = window.location;
        let url = new URL(url_string);
        let PID =  url.searchParams.get("PROLIFIC_PID")
        if(PID != null){
            let id = JSON.parse(JSON.stringify(PID))
            let number = id.replace(/\D/g, "")
            ExperimentData.PID = number.substring(0,4)
        }else{
            ExperimentData.PID = false
        }
    }
    check_if_there_is_a_prolific_code()

    this.record_consent_given = function(){
        ExperimentData.consent_given = Date.now() - StartTime
        console.log(ExperimentData)

    }

    this.store_phase_data = function(DataObj){
        //Storing the draw data
        ExperimentData.RawPhaseData.push(JSON.parse(JSON.stringify(DataObj)))

        //Storing a minimized version for data export
        let NewObj = JSON.parse(JSON.stringify(DataObj))

        //Remove data depending on type
        if(["free_exploration", "hint_and_search"].includes(NewObj.type) ){
            switch(NewObj.Fennimal_interaction_type){
                case("polaroid_photo_passive"):
                    //Here participants only observed the Fennimal and took a photo. Thus, we only need to store the IDs of the Fennimals (in order)
                    delete NewObj.Fennimals_encountered
                    delete NewObj.Fennimals_in_phase
                    delete NewObj.number_interactions_in_phase

                    NewObj.Interactions = []
                    for(let i = 0; i<NewObj.Data.length;i++){
                        NewObj.Interactions.push({Fen_id: NewObj.Data[i].id })
                    }
                    delete NewObj.Data

                    break
                case("polaroid_photo_active"):

                    //For each trials Now we also need to store the number of attempts and the participants failed attempts
                    delete NewObj.Fennimals_encountered
                    delete NewObj.Fennimals_in_phase
                    delete NewObj.number_interactions_in_phase

                    NewObj.Interactions = []
                    for(let i = 0; i<NewObj.Data.length;i++){
                        let failed
                        if(typeof NewObj.Data[i].failed_all_active_name_attempts !== "undefined"){
                            failed = NewObj.Data[i].failed_all_active_name_attempts
                        }else{
                            failed= false
                        }
                        NewObj.Interactions.push({Fen_id: NewObj.Data[i].id , failed: failed, attempts: NewObj.Data[i].photo_name_attempts.attempts })
                    }
                    delete NewObj.Data

                    break

            }
        }

        ExperimentData.StoredData.push(NewObj)

        //Storing a timestamp
        ExperimentData.TimeStamps.push({
            type: DataObj.type,
            time: Math.round((Date.now() - StartTime) / 1000)
        })

    }

    this.store_card_data_when_included_in_general_instructions = function(CardData){
        ExperimentData.CardTaskData = JSON.parse(JSON.stringify(CardData))
    }

    this.store_questionnaire_data = function(QuestionnaireAnswerObj){
        ExperimentData.Questionnaire.push(JSON.parse(JSON.stringify(QuestionnaireAnswerObj)))
    }

    //Call when stars have been earned
    let PaymentInfo = []
    this.record_stars_earned = function(daynum, phase_type, stars_earned, maximum_possible_stars){
        PaymentInfo.push(JSON.parse(JSON.stringify({day: daynum, day_type: phase_type, stars_earned: stars_earned, maximum_possible_stars: maximum_possible_stars})))
        console.log(PaymentInfo)
    }

    //Call at the end of the experiment to retrieve the payment data. This also generates a completion code
    this.get_payment_data = function(){
        //Calculating total stars
        ExperimentData.PaymentData = {}
        ExperimentData.PaymentData.phases = JSON.parse(JSON.stringify(PaymentInfo))
        ExperimentData.PaymentData.total_stars = 0
        for(let i =0;i<PaymentInfo.length;i++){
            ExperimentData.PaymentData.total_stars = ExperimentData.PaymentData.total_stars + PaymentInfo[i].stars_earned
        }

        //Adding a summary entry
        ExperimentData.PaymentData.phases.push({
            day_type: "summary",
            stars_earned: ExperimentData.PaymentData.total_stars,
            maximum_possible_stars: Stimuli.get_maximum_number_of_bonus_stars(),
        })

        //Assigning a completion code
        let cc_word_1 = shuffleArray(["Happy", "Bright", "Clean","Soft", "Funny", "Warm", "Sharp", "Small", "Kind", "Sweet", "Young", "White", "Tall"])[0]
        let cc_word_2 = shuffleArray(["Cat", "Rabbit", "Owl","Fox","Koala", "Frog", "Shark", "Zebra", "Bat", "Flower", "Panda", "Rose", "Poppy", "Lily", "Tulip"  ])[0]
        ExperimentData.PaymentData.completion_code = cc_word_1 + cc_word_2 + ExperimentData.PaymentData.total_stars

        //Registering the end time and total duration (in seconds)
        ExperimentData.total_duration = Math.round((Date.now() - StartTime) /1000)

        //Storing the data on the form
        store_experiment_data()

        //Returning the payment object
        console.log(ExperimentData)
        return(JSON.parse(JSON.stringify(ExperimentData.PaymentData)))



    }


    //Call to store all the experiment data on the form
    function store_experiment_data(){
        let StoredData = JSON.parse(JSON.stringify(ExperimentData))

        //Delete some final data elements
        delete StoredData.RawPhaseData

        //Copy to the form
        document.getElementById("data_form_field").innerHTML = JSON.stringify(StoredData)
        console.log(StoredData)

    }

    //Searches for the phase data of a given type, returns an array containing all matches (deep copies).
    //Returns false if there is no entry of a given type
    this.get_stored_phase_data_of_type = function(type){
        let Arr = []
        for(let i = 0;i<ExperimentData.RawPhaseData.length;i++){
            if(ExperimentData.RawPhaseData[i].type === type){
                Arr.push(JSON.parse(JSON.stringify(ExperimentData.RawPhaseData[i])))
            }
        }
        if(Arr.length > 0){
            return(Arr)
        }else{
            return false
        }
    }

    //Call only after payment data has been determined by the function above
    this.get_completion_code = function(){
        return(ExperimentData.PaymentData.completion_code)
    }

}

EXPCONTROLLER = function(){
    let that = this

    //Generating a Stimuli object
    let Stimulus_settings = new StimulusSettings()
    let Stimuli = new StimulusTransformer(Stimulus_settings)
    let DataCont = new DATACONTROLLER(Stimuli)

    //Removing unused elements from the map (and SVG in general)
    let SVG_Reducer = new SVGREDUCER(Stimuli)

    //Creating the world state (this keep tracks of which Fennimals are present on the map)
    let WorldState = new WorldStateObject()
    WorldState.rebuild_state_from_available_locations(Stimuli.get_all_locations_visited_during_experiment_with_regions())

    //Creating an Audio and Map Controller
    let MapCont = new MapController(that,WorldState)

    //Creating an instructions controller
    let InstrCont = new INSTRUCTIONSCONTROLLER(that, WorldState, Stimuli)

    //Defining key variables
    let Remaining_experiment_phases = JSON.parse(JSON.stringify(Stimulus_settings.Experiment_Structure))
    let CurrentPhaseData, current_phase_of_the_experiment, flag_exploration_phase_has_been_completed_after_instructions_closed, current_phase_num =0,
        flag_hint_and_search_phase_general_instructions_shown

    //GENERAL EXPERIMENT FLOW FUNCTIONS
    /////////////////////////////////////
    let CurrentSearchTrial

    this.start_experiment = function(){
        show_next_general_instructions_page()
        MapCont.disable_map_interactions()
    }

    function start_next_experiment_phase(){

        if(Remaining_experiment_phases.length === 0){
            start_post_experiment_questionnaire()
        }else{
            CurrentPhaseData = Remaining_experiment_phases.shift()

            if(CurrentPhaseData.type === "pseudoday"){
                console.log("STARTING PSEUDO")
                switch(CurrentPhaseData.event_type){
                    case("screener_based_on_card_sorting_task"):
                        screener_for_card_task()
                        break
                }
            }else{

                current_phase_of_the_experiment = CurrentPhaseData.type
                current_phase_num++
                CurrentPhaseData.phasenum = current_phase_num

                current_interaction_num_in_phase = 0

                WorldState.clear_all_locations(true)
                if(GenParam.DisplayFoundFennimalIconsOnMap.show){
                    MapCont.clear_all_Fennimal_icons_from_map()
                }


                switch(current_phase_of_the_experiment){

                    case("free_exploration"):
                        flag_exploration_phase_has_been_completed_after_instructions_closed = false

                        //Populating the entire map at once
                        switch(CurrentPhaseData.Fennimals_encountered){
                            case("all"):
                                WorldState.populate_map_with_array_of_Fennimals(Stimuli.get_Fennimals_objects_in_array(),true)
                                CurrentPhaseData.number_interactions_in_phase = Stimuli.get_Fennimals_objects_in_array().length
                                CurrentPhaseData.Fennimals_in_phase = WorldState.get_array_of_Fennimals_on_map()
                                break
                        }
                        //Block map interactions and show the instructions
                        MapCont.disable_map_interactions()
                        InstrCont.initialize_free_exploration_instructions(CurrentPhaseData.phasenum, CurrentPhaseData.Fennimals_in_phase)
                        break
                    case("hint_and_search"):
                        flag_hint_and_search_phase_general_instructions_shown = false
                        //Creating an array of all Fennimals to visit during the trial
                        let Trials = sort_Fennimal_array_by_features(Stimuli.get_Fennimals_objects_in_array(), CurrentPhaseData.sort_trials_by)

                        switch(CurrentPhaseData.Fennimals_encountered){
                            case("all"):
                                CurrentPhaseData.number_interactions_in_phase = Trials.length
                                CurrentPhaseData.Fennimals_in_phase = Trials
                                break
                        }

                        //Showing the general phase instuctions.
                        MapCont.disable_map_interactions()
                        InstrCont.initialize_hint_and_search_phase_general_instructions(CurrentPhaseData.phasenum, CurrentPhaseData.Fennimals_in_phase, CurrentPhaseData.hint_type, "bottom-center")
                        break
                    case("name_recall_task"):
                        MapCont.disable_map_interactions()
                        InstrCont.start_name_recall_task(CurrentPhaseData.phasenum, CurrentPhaseData.award_star_for_each_correct_name)
                        break
                    case("card_sorting_task"):
                        MapCont.disable_map_interactions()
                        InstrCont.start_card_sorting_task(CurrentPhaseData.phasenum)
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
                }
            }

        }
    }

    function start_next_trial_in_hint_and_search_phase(){
        if(CurrentPhaseData.Fennimals_in_phase.length > 0){
            CurrentSearchTrial= CurrentPhaseData.Fennimals_in_phase.shift()
            WorldState.add_Fennimal_to_map(CurrentSearchTrial)

            InstrCont.initialize_hint_and_search_phase_trial_instructions(CurrentSearchTrial, CurrentPhaseData.hint_type)
            AudioCont.play_sound_effect("alert")
            MapCont.allow_participant_to_leave_location()

        }else{
            phase_completed()
        }
    }

    let Remaining_Questionnaire_Pages
    function start_post_experiment_questionnaire(){
        Remaining_Questionnaire_Pages  = Stimuli.get_questionnaire_pages_arr()
        start_next_questionnaire_page()
    }

    function start_next_questionnaire_page(){
        if(Remaining_Questionnaire_Pages.length > 0){
            InstrCont.show_questionnaire_page(Remaining_Questionnaire_Pages.shift())
        }else{
            finish_experiment()
        }

    }

    this.questionnaire_page_completed = function(PageData){
        DataCont.store_questionnaire_data(PageData)
        start_next_questionnaire_page()

    }

    function finish_experiment(){
        show_payment_screen()
    }

    this.submit_experiment = function(){
        alert("In case you pressed the button before submitting the completion code to prolific, your code is: " + DataCont.get_completion_code() + ". Press OK to finalize your submission.")
        console.log("EXPERIMENT SUBMITTED")

        //Submit after the alert
        document.getElementById("submitbutton").click()
    }

    function sort_Fennimal_array_by_features(Arr, sort_type){
        //Default to random ordering
        if(typeof sort_type === "undefined"){
            console.warn("Trial order sequence not defined. Defaulting to random order.")
            return(shuffleArray(Arr))
        }

        switch(sort_type){
            case("region"):
                //Here we first want to find all regions.
                // Next we randomize the order of regions...
                // And then within each region we randomize the trials
                let all_regions_in_Arr = []
                for(let i =0;i<Arr.length;i++){
                    all_regions_in_Arr.push(Arr[i].region)
                }
                all_regions_in_Arr = shuffleArray( [... new Set(all_regions_in_Arr)] )

                //Now we find the trials within each region.
                let Trial_Order = []
                for(let i =0;i<all_regions_in_Arr.length;i++){
                    let Trials_in_region = []
                    for(let j=0;j<Arr.length;j++){
                        if(Arr[j].region === all_regions_in_Arr[i]){
                            Trials_in_region.push(Arr[j])
                        }
                    }
                    Trial_Order.push(shuffleArray(Trials_in_region))
                }

                return(Trial_Order.flat())
            case("head_group"):
                //First we will want to find all head groups, randomize their order, and then randomize witin a head group
                let all_groups_in_Arr = []
                for(let i =0;i<Arr.length;i++){
                    all_groups_in_Arr.push(Arr[i].head_group)
                }
                all_groups_in_Arr = shuffleArray( [... new Set(all_groups_in_Arr)] )

                //Now we find the trials within each region.
                let Trial_Group_Order = []
                for(let i =0;i<all_groups_in_Arr.length;i++){
                    let Trials_in_group = []
                    for(let j=0;j<Arr.length;j++){
                        if(Arr[j].head_group === all_groups_in_Arr[i]){
                            Trials_in_group.push(Arr[j])
                        }
                    }
                    Trial_Group_Order.push(shuffleArray(Trials_in_group))
                }


                return(Trial_Group_Order.flat())



            default:
                console.warn("Unknown trial sorting parameter. Defaulting to random order")
                return(shuffleArray(Arr))
        }
    }

    //SCREENER FUNCTIONS
    //////////////////////
    function screener_for_card_task(){
        let participant_screened_out = false

        //Get the featuremap from stimuli.
        let Featuremap = Stimuli.get_Feature_maps().head_group


        //Get the card sorting data from the datacontroller
        let CardTaskData = DataCont.get_stored_phase_data_of_type("card_sorting_task")
        if(CardTaskData === false){
            console.error("CARD DATA SCREENER ERROR: CANNOT RETRIEVE CARD DATA...")
            participant_screened_out = true
        }else{
            let CardData = CardTaskData[0].CardData
            //Now we need to first check whether participants have correctly assigned all heads to the same groups
            // That is, we will check the head class of each head in the carddata groups.
            // If any one group contains multiple types, then the participant needs to be screened out
            for(let i = 0; i<CardData.length;i++){

                //Finding all the classes of the heads in this group.
                let types_in_group = []
                for(let c=0;c<CardData[i].contents.length; c++){
                    let head = CardData[i].contents[c]
                    let headclass = []

                    //Search the feature-map for this head
                    for(let groupcode in Featuremap){
                        if(Featuremap[groupcode].Heads.includes(head)){
                            headclass.push(Featuremap[groupcode].class)
                        }
                    }

                    if(headclass.length === 1){
                        types_in_group.push(headclass[0])
                    }else{
                        console.error("ERROR: HEAD CLASS DOES NOT CONTAIN A SINGLE ELEMENT: " + head + " ; " + headclass)
                    }
                }

                //Removing duplicates
                types_in_group = [...new Set(types_in_group)]

                //If the group contains more than one class, then this participant will be screened out. If not, assign the class to the object
                if(types_in_group.length === 1){
                    CardData[i].class = types_in_group[0]
                }else{
                    participant_screened_out = true
                }
            }

            //At this point, participants may have passed the first check. If they did, then we go to the next check:
            //  Here we want to know whether the groups themselves have been placed correctly
            if(participant_screened_out === false){
                //For each group, we determine its closest neighbor

                //We then check whether the type of this closest neighbor is also the similar group type




                //First calculating the distance between all pairs
                let Classes = []
                for(let c = 0;c<CardData.length;c++){
                    Classes.push(CardData[c].class)
                }
                let AllPairs = get_all_pairs_of_array_elements(Classes)
                let distances_of_similar_pairs = []
                let distances_of_other_pairs = []

                for(let p=0;p<AllPairs.length;p++){
                    //Finding the coordinates of both groups
                    let centerpoint0, centerpoint1
                    for(let c = 0; c<CardData.length;c++){
                        if(CardData[c].class === AllPairs[p][0]) {
                            centerpoint0 = CardData[c].centerpoint
                        }

                        if(CardData[c].class === AllPairs[p][1]) {
                            centerpoint1 = CardData[c].centerpoint
                        }
                    }

                    //Finding the distance
                    let dist = EUDistPoints(centerpoint0,centerpoint1)

                    //Determine whether this is a similar pair or an other-pair
                    if( (AllPairs[p].includes("xmas") && AllPairs[p].includes("halloween")) || (AllPairs[p].includes("safari") && AllPairs[p].includes("bird")) ){
                        distances_of_similar_pairs.push(dist)
                    }else{
                        distances_of_other_pairs.push(dist)
                    }
                }

                let mean_similar = mean_of_array(distances_of_similar_pairs)
                let mean_other = mean_of_array(distances_of_other_pairs)

                if(mean_similar >= mean_other){
                    participant_screened_out = true
                }
            }

            //Last check: make sure that the mean distance between groups is sufficiently high
        }

        //At this point we can determine whether the participants should be screened out or not...
        //If the participant has been screened out, then:
        //      Assign a completion code
        //      Show the screened-out page WITH THE ONLY OPTION TO SUBMIT DATA

        // If not, then check whether the participant has the option to voluntarily screen out...1
        //      Give the participant the option to continue OR to screen out

    }

    //GENERAL INSTRUCTIONS
    ////////////////////////
    //On creation, deep copy the remaining instruction pages
    let Remaining_Instructions_Pages = Stimuli.get_instruction_pages_arr()
    function show_next_general_instructions_page(){
        if(Remaining_Instructions_Pages.length > 0){
            let NextInstructionPage = Remaining_Instructions_Pages.shift()
            switch(NextInstructionPage){
                case("consent"): InstrCont.show_consent_page(); break
                case("browser_check_and_full_screen_prompt"): InstrCont.show_browser_check_and_fullscreen_page(); break
                case("overview"): InstrCont.show_overview_page(); break
                case("card_sorting_task"):
                    MapCont.disable_map_interactions()
                    InstrCont.start_card_sorting_task(false)
                    break

            }


        }else{
            //General instructions have been completed, continue with the first main experiment phase
            start_next_experiment_phase()
        }

    }

    this.consent_provided_by_participant = function(){
        DataCont.record_consent_given()
    }

    this.general_instructions_page_completed = function(){
        show_next_general_instructions_page()
    }

    //PHASE INSTRUCTIONS
    //////////////////

    //Call when the instructions page has been closed
    this.instructions_page_closed = function(){
        switch(current_phase_of_the_experiment){
            case("free_exploration"):
                if(typeof flag_exploration_phase_has_been_completed_after_instructions_closed !== "undefined"){
                    if(flag_exploration_phase_has_been_completed_after_instructions_closed){
                        phase_completed()
                    }else{
                        //Tell the map controller to re-enable movement (and show the instructions button on the top of the page)
                        MapCont.enable_map_interactions()
                        MapCont.show_request_instructions_button()
                    }

                }else{
                    //Tell the map controller to re-enable movement (and show the instructions button on the top of the page)
                    MapCont.enable_map_interactions()
                    MapCont.show_request_instructions_button()
                }
                break
            case("hint_and_search"):
                if(flag_hint_and_search_phase_general_instructions_shown === false){
                    flag_hint_and_search_phase_general_instructions_shown = true
                    start_next_trial_in_hint_and_search_phase()

                }else{
                    MapCont.enable_map_interactions()
                    MapCont.show_request_instructions_button()
                }

        }
    }

    //Call when the instructions have been requested by the participant
    this.instructions_requested = function(){
        MapCont.disable_map_interactions()
        InstrCont.instructions_requested_by_participant()

    }

    //FENNIMAL INTERACTIONS
    //////////////////////////
    let CurrentFennimal, current_interaction_num_in_phase

    this.entering_location = function(location){
        //Check if there is a Fennimal present.
        let FennimalPresent = WorldState.get_reference_to_Fennimal_object_at_location(location)
        if(FennimalPresent !== false){
            start_Fennimal_interaction_at_location(location)

        }

    }
    this.leaving_location = function(){
        if(typeof CurrentFennimal !== "undefined"){
            CurrentFennimal.clear()
        }
    }

    function start_Fennimal_interaction_at_location(location){


        //Check if the Fennimal has already been visited in this phase. If so, default to passive observation only
        let interaction_type = CurrentPhaseData.Fennimal_interaction_type
        let AdditionalInformation = {}
        switch(interaction_type){
            case("polaroid_photo_active"): AdditionalInformation.allowed_attempts_before_answer_given = CurrentPhaseData.allowed_attempts_before_answer_given
        }
        let FennimalObject = WorldState.get_reference_to_Fennimal_object_at_location(location)

        if(typeof FennimalObject.visited !== "undefined"){
            if(FennimalObject.visited === true){
                CurrentFennimal = new FENNIMALCONTROLLER(FennimalObject,that,"already_visited", AdditionalInformation)
            }else{
                CurrentFennimal = new FENNIMALCONTROLLER(FennimalObject,that,interaction_type, AdditionalInformation)
            }
        }else{
            current_interaction_num_in_phase++
            FennimalObject.num_in_phase = current_interaction_num_in_phase
            CurrentFennimal = new FENNIMALCONTROLLER(FennimalObject,that,interaction_type, AdditionalInformation)
        }

    }
    this.Fennimal_interaction_completed = function(FenObj){
        let Fennimal_previously_visited = (typeof FenObj.visited) !== "undefined"
        FenObj.visited = true

        //If enabled, add a Fennimal icon to the map
        if(GenParam.DisplayFoundFennimalIconsOnMap.show){
            MapCont.add_Fennimal_icon_on_map(FenObj)
        }

        //Make and store a copy of the data
        if(typeof CurrentPhaseData.Data === "undefined"){
            CurrentPhaseData.Data = []
        }
        CurrentPhaseData.Data.push(JSON.parse(JSON.stringify(FenObj)))

        //Update the progress bar in the instructions
        InstrCont.update_progress_within_day( (current_interaction_num_in_phase / CurrentPhaseData.number_interactions_in_phase) * 100 )


        // Check the structure of this phase. If its a trial-based setup, then go to the next trial.
        // If its free exploration, then check if the participant has met all conditions. If not, allow the participant to roam free
        switch(current_phase_of_the_experiment){
            case("free_exploration"):
                if(Fennimal_previously_visited === false ){
                    Interface.Prompt.show_message("This photo has been added to your collection!")
                    exploration_phase_add_photo()
                }else{
                    MapCont.allow_participant_to_leave_location()
                }
                break
            case("hint_and_search"):
                if(FenObj.name === CurrentSearchTrial.name){
                    start_next_trial_in_hint_and_search_phase()
                    Interface.Prompt.show_message("Time to find the next Fennimal!")
                }else{
                    MapCont.allow_participant_to_leave_location()
                }

                break




        }

    }

    // Phase-specific functions
    ///////////////////////////////

    //Exploration phase: check if all the locations and Fennimals have been visited. If so, finish the block. If not, allow participants to explore more...
    function exploration_phase_add_photo(){
        //AudioCont.play_sound_effect("alert")
        //Show the instructions page with the new photo added.
        //InstrCont.instructions_requested_by_participant()

        //Check if all Fennimals have been discovered. If not, allow the participant to continue. If yes, then this phase has been completed
        if(exploration_phase_check_if_all_Fennimals_visited()){
            // Raise a flag: if the instructions page is now closed, then go to the next experiment phase.
            AudioCont.play_sound_effect("alert")
            InstrCont.instructions_requested_by_participant()

            flag_exploration_phase_has_been_completed_after_instructions_closed = true
            InstrCont.update_exploration_phase_instructions_to_show_completion()
        }else{
            MapCont.allow_participant_to_leave_location()
        }

    }
    function exploration_phase_check_if_all_Fennimals_visited(){
        //Check all Fennimals and whether they have been visited
        let FennimalsInWorld = WorldState.get_array_of_Fennimals_on_map()
        for(let i=0;i<FennimalsInWorld.length;i++){
            if(typeof FennimalsInWorld[i].visited === "undefined"){
                return false
            }else{
                if(FennimalsInWorld[i].visited !== true){
                    return false
                }
            }
        }

        return true

    }
    function exploration_phase_completed(){
        //Leave the location and return to the map
        if(typeof CurrentFennimal !== "undefined"){
            CurrentFennimal.clear()
        }

        MapCont.reset_map_to_player_in_center()
        phase_completed()

    }

    //Recalled names task
    function process_recalled_names(RecalledNames, max_dist_for_match){
        //Get an array of all the names encountered during the experiment
        // Each element should have an ID and a name

        let AllFennimals = Stimuli.get_Fennimals_objects_in_array()
        let All_Names_In_Exp = []
        for(let i =0;i<AllFennimals.length;i++){
            All_Names_In_Exp.push({name: AllFennimals[i].name, id: AllFennimals[i].id})
        }

        //Attempting to assign matches
        for(let i =0;i<RecalledNames.length;i++){
            let Possible_matches = []
            for(let x=0;x<All_Names_In_Exp.length; x++){
                let dist = LevenshteinDistance(RecalledNames[i].ans.toLowerCase(), All_Names_In_Exp[x].name.toLowerCase())
                if(dist <= max_dist_for_match ){
                    Possible_matches.push({matchedID: All_Names_In_Exp[x].id, dist: dist })
                }
            }

            //If there is a single match, pick it
            if(Possible_matches.length ===1){
                RecalledNames[i].matchedID = Possible_matches[0].matchedID
                RecalledNames[i].LSdist = Possible_matches[0].dist
            }

            //If there are multiple matches, then send a warning! (This should not happen). Add a flag to the data
            if(Possible_matches.length > 1){
                console.warn("WARNING: MULTIPLE MATCHES TO RECALLED NAME")
                let closestMatch = Possible_matches[0].matchedID
                let closestDist = Possible_matches[0].dist

                for(let n=1; n<Possible_matches.length;n++){
                    if(Possible_matches[n].dist < closestDist){
                        closestMatch = Possible_matches[n].matchedID
                        closestDist = Possible_matches[n].dist

                    }
                }

                RecalledNames[i].matchedID = closestMatch
                RecalledNames[i].LSdist = closestDist
                RecalledNames[i].flagged_for_multiple_matches = true


            }

        }
        return(RecalledNames)

    }

    this.recalled_names_task_complete = function(RecalledNames){
        CurrentPhaseData.RecalledNames = JSON.parse(JSON.stringify(process_recalled_names(RecalledNames, CurrentPhaseData.allowed_Levenshtein_distance_for_match)))

        //For recordkeeping: compile an array of all (unique) IDs which were correctly recalled
        let Array_recalled_IDs = []
        for(let i =0;i<RecalledNames.length;i++){
            if(typeof RecalledNames[i].matchedID !=="undefined"){
                Array_recalled_IDs.push(RecalledNames[i].matchedID)
            }
        }
        Array_recalled_IDs = [...new Set(Array_recalled_IDs)]
        CurrentPhaseData.Array_of_recalled_IDs = Array_recalled_IDs
        if(typeof CurrentPhaseData.award_star_for_each_correct_name !=="undefined"){
            if(CurrentPhaseData.award_star_for_each_correct_name){
                DataCont.record_stars_earned(CurrentPhaseData.phasenum, CurrentPhaseData.type,CurrentPhaseData.Array_of_recalled_IDs.length, Stimuli.get_Fennimals_objects_in_array().length)
            }
        }

        DataCont.store_phase_data(CurrentPhaseData)

        //TODO: calculate score here

        start_next_experiment_phase()

    }

    this.card_sorting_task_complete = function(CardData){

        //Card data can be ran in either the instructions or as a separate day. What we do next depends on our current situation
        if(typeof CurrentPhaseData !== "undefined"){
            CurrentPhaseData.CardData = JSON.parse(JSON.stringify(CardData))
            DataCont.store_phase_data(CurrentPhaseData)
            start_next_experiment_phase()
        }else{
            DataCont.store_card_data_when_included_in_general_instructions(CardData)
            show_next_general_instructions_page()
        }

    }

    //QUIZ
    /////////
    function start_quiz(){
        create_quiz_questions()
        InstrCont.show_quiz_instructions(current_phase_num, CurrentPhaseData)

    }
    this.quiz_instructions_closed = function(){
        show_next_quiz_question()
    }
    //Assumes that the CurrentPhaseData is the quiz type, creates a set of Questions in the object
    function create_quiz_questions(){
        //Each QuestionObject needs to have the following properties:
        //  A question_number
        //  A Fennimal Object
        //  A cue_type
        //  An array of subsquestions, each of which:
        //      Has a question_text, an answer_options ("text", or an array for dropdown) and a correct_answer
        let QuestionsArr = []

        for(let blocknum =0; blocknum < CurrentPhaseData.QuestionSets.length; blocknum++){
            let BlockQuestions = []
            let FennimalsInSet = []
            switch (CurrentPhaseData.QuestionSets[blocknum].Fennimals_included){
                case("all"):
                    FennimalsInSet = Stimuli.get_Fennimals_objects_in_array()
                    break

            }

            for(let qnum = 0;qnum< FennimalsInSet.length; qnum++){
                let NewQ = {
                    FenObj:FennimalsInSet[qnum],
                    cue_type: CurrentPhaseData.QuestionSets[blocknum].cue,
                    subquestions: [],
                    award_star_for_correct_answer: CurrentPhaseData.award_star_for_correct_answer
                }

                for(let subnum = 0;subnum<CurrentPhaseData.QuestionSets[blocknum].questions_asked.length; subnum++){
                    let SubQ = {qtype: CurrentPhaseData.QuestionSets[blocknum].questions_asked[subnum]}
                    switch(CurrentPhaseData.QuestionSets[blocknum].questions_asked[subnum]){
                        case("name"):
                            SubQ.question_text = "What is this Fennimal's name?"
                            SubQ.answer_options = "text"
                            SubQ.correct_answer = FennimalsInSet[qnum].name
                            break
                        case("location"):
                            SubQ.question_text = "Where did you see this Fennimal?"
                            SubQ.answer_options = Stimuli.get_all_locations_visited_during_experiment_as_participant_facing_names()
                            SubQ.correct_answer = GenParam.LocationDisplayNames[FennimalsInSet[qnum].location]
                            break
                        case("region"):
                            SubQ.question_text = "In which part of the island did you see this Fennimal?"
                            let regions_in_experiment = Stimuli.get_all_regions_visited_during_experiment()
                            let subject_facing_region_names = []
                            for(let i =0;i<regions_in_experiment.length;i++){
                                subject_facing_region_names.push(GenParam.RegionData[regions_in_experiment[i]].display_name)
                            }
                            SubQ.answer_options = subject_facing_region_names
                            SubQ.correct_answer = GenParam.RegionData[FennimalsInSet[qnum].region].display_name
                            break
                    }
                    NewQ.subquestions.push(SubQ)
                }
                BlockQuestions.push(NewQ)
            }
            QuestionsArr.push(shuffleArray(BlockQuestions))
        }

        CurrentPhaseData.questions = QuestionsArr.flat()

        //Adding numbers
        for(let i =0;i<CurrentPhaseData.questions.length; i++){
            CurrentPhaseData.questions[i].question_num = (i+1)
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

    function phase_completed(){
        //Store the data
        DataCont.store_phase_data(CurrentPhaseData)

        //Leave the location and return to the map
        if(typeof CurrentFennimal !== "undefined"){
            CurrentFennimal.clear()
        }

        MapCont.reset_map_to_player_in_center()
        start_next_experiment_phase()

    }

    function show_next_quiz_question(){
        if(CurrentPhaseData.questions.length > 0){


            InstrCont.show_next_quiz_question(CurrentPhaseData.questions.shift())
        }else{
            quiz_completed()
        }
    }

    this.quiz_question_answered = function(QuizQuestion){
        //Reduce information
        let ReducedSubquestions = []
        for(let i =0;i<QuizQuestion.subquestions.length;i++){
            ReducedSubquestions.push({
                qtype: QuizQuestion.subquestions[i].qtype,
                ans: QuizQuestion.subquestion_answer_arr[i],
                cor: QuizQuestion.subquestions_correct_arr[i]
            })
        }

        let QuizQuestionReduced = {
            id: QuizQuestion.FenObj.id,
            cue_type: QuizQuestion.cue_type,
            subquestions: ReducedSubquestions,
            answers_correct: ! QuizQuestion.subquestions_correct_arr.includes(false),
            num: QuizQuestion.question_num
        }

        //Store in array
        CurrentPhaseData.QuestionsAnswered.push(JSON.parse(JSON.stringify(QuizQuestionReduced)))

        //Update the counters for the completed quiz questions
        CurrentPhaseData.num_questions_answered++
        if(! QuizQuestion.subquestions_correct_arr.includes(false)){
            CurrentPhaseData.num_questions_correctly_answered++
        }

        //Now check if we need to append this question to the back of the cue again. That is, if this question has one or more mistakes AND the quiz requires perfect answers
        if(CurrentPhaseData.require_perfect_answers){
            if(QuizQuestion.subquestions_correct_arr.includes(false)){
                //Delete the previous answer
                delete QuizQuestion.subquestions_correct_arr

                //Check if the quiz question already contains a value to denote that this is a repeat question. If not, add it
                if(typeof QuizQuestion.num_previous_incorrect_answers === "undefined"){
                    QuizQuestion.num_previous_incorrect_answers = 1
                }else{
                    QuizQuestion.num_previous_incorrect_answers++
                }

                //Push it back on the cue
                CurrentPhaseData.questions.push(JSON.parse(JSON.stringify(QuizQuestion)))

            }
        }

        //Updating the progress bar
        let percentage_completed = (CurrentPhaseData.num_questions_answered / CurrentPhaseData.total_num_questions_in_quiz) * 100
        if(typeof CurrentPhaseData.require_perfect_answers !== "undefined"){
            if(CurrentPhaseData.require_perfect_answers){
                percentage_completed = (CurrentPhaseData.num_questions_correctly_answered / CurrentPhaseData.total_num_questions_in_quiz) * 100
            }
        }
        InstrCont.update_progress_within_day(percentage_completed)

        //Now continuing to the next question
        show_next_quiz_question()


    }
    function quiz_completed(){
        //Cleaning up
        delete CurrentPhaseData.questions


        if(typeof CurrentPhaseData.award_star_for_correct_answer){
            if(CurrentPhaseData.award_star_for_correct_answer){
                if(CurrentPhaseData.require_perfect_answers){
                    DataCont.record_stars_earned(CurrentPhaseData.phasenum,CurrentPhaseData.type, CurrentPhaseData.num_questions_correctly_answered, false)
                }else{
                    DataCont.record_stars_earned(CurrentPhaseData.phasenum,CurrentPhaseData.type, CurrentPhaseData.num_questions_correctly_answered, CurrentPhaseData.num_questions_answered)
                }
            }
        }
        phase_completed()
    }

    // MATCH HEAD TO SAMPLE
    /////////////////////////
    function start_match_head_to_region_task(){
        let TaskData
        switch(CurrentPhaseData.Fennimals_encountered){
            case("all"):
                TaskData = create_match_head_to_region_data(Stimuli.get_Fennimals_objects_in_array())
        }

        InstrCont.start_match_head_to_region_task(current_phase_num, TaskData)

    }

    function create_match_head_to_region_data(Array_of_Included_Fennimals){
        //Returns an array containing one element per question. Each of these elements:
        //      Contains a property: "target_region"
        //      Contains an array of IDs for the "target_Fennimal_ids"
        //      Contains an array of FennimalObjects for  all "Fennimal_Object_Arr"

        //Finding all unique regions in the provided array
        let all_regions = []
        for(let i =0;i<Array_of_Included_Fennimals.length;i++){
            all_regions.push(Array_of_Included_Fennimals[i].region)
        }
        all_regions = [... new Set(all_regions)]

        //Now for each region we can create a question
        let Out = []
        for(let regnum =0;regnum < all_regions.length; regnum++ ){
            let target = all_regions[regnum]

            let NewObj = {
                target_region:target,
                target_Fennimal_ids: [],
                Fennimal_Object_Arr : Array_of_Included_Fennimals
            }

            //Finding all Fennimals in this region
            for(let i =0;i<Array_of_Included_Fennimals.length; i++){
                if(Array_of_Included_Fennimals[i].region === target){
                    NewObj.target_Fennimal_ids.push(Array_of_Included_Fennimals[i].id)
                }
            }

            //Pushing
            Out.push(shuffleArray(NewObj))
        }

        return(Out)
    }

    // HEAD TO REGION SORTING TASK
    ////////////////////////////////
    function start_head_to_region_sorting_task(){
        let TaskData
        switch(CurrentPhaseData.Fennimals_included){
            case("all"):
                TaskData = Stimuli.get_Fennimals_objects_in_array()
        }

        InstrCont.start_head_to_region_sorting_task(current_phase_num, TaskData)
    }

    this.head_to_region_sorting_task_completed = function(Data){
        CurrentPhaseData.Errors = JSON.parse(JSON.stringify(Data))
        DataCont.store_phase_data(CurrentPhaseData)
        start_next_experiment_phase()
    }

    //END OF EXPERIMENT FUCNTIONS
    function show_payment_screen(){
        InstrCont.show_payment_screen(DataCont.get_payment_data())

    }


}


let EC = new EXPCONTROLLER()
EC.start_experiment()





console.log("READY")