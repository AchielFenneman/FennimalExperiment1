// Controls the flow of the experiment
console.warn("RUNNING EXPERIMENT CONTROLLER")

DataController = function(){
    let DataObj = {
        Training_Stim: [],
        Training_Phase: [],
        Test_Phase: [],
        Timestamps: [],
        Questionnaire: {}
    }

    let experiment_start_time = Date.now()

    //Stores a generic (top-level) variable
    this.store_variable = function (variable,value){
        DataObj[variable] = JSON.parse(JSON.stringify(value))
    }

    this.storeTrainingStimuli = function(Array){
        DataObj.Training_Stim = JSON.parse(JSON.stringify(Array))
    }

    this.storeExplorationPhaseData = function(LocationVisitationObj){
        DataObj.Training_Phase.push({type: "exploration", order: JSON.parse(JSON.stringify(LocationVisitationObj)) })
        DataObj.Timestamps.push(["exploration phase complete", Date.now() - experiment_start_time])
    }

    //Starts a new Buffer, containing all the trials during the block. Must be closed by the end_block call
    let TrialBuffer = [], current_block_type, current_block_phase
    this.start_next_block = function(block_type, experiment_phase){
        if(TrialBuffer.length > 0){
            console.warn("%c WARNING: starting new block before existing block has been closed. Loss of data probable!", "color: white; background: red")
        }
        TrialBuffer = []
        current_block_type = block_type
        current_block_phase = experiment_phase
    }

    this.storeTrialData = function(FennimalObj){
        TrialBuffer.push(JSON.parse(JSON.stringify(FennimalObj)))
    }

    this.block_completed = function(){
        if(current_block_phase === "training"){
            DataObj.Training_Phase.push({type: current_block_type, Trials: JSON.parse(JSON.stringify(TrialBuffer))})
            DataObj.Timestamps.push(["training phase " + current_block_type + " completed", Date.now() - experiment_start_time])
        }

        if(current_block_phase === "test"){
            let ReducedTrialBuffer = []

            for(let i=0;i<TrialBuffer.length;i++){
                //Storing a reduced version of the trial object
                ReducedTrialBuffer.push(reduce_trial_data_object(TrialBuffer[i]))

                //Keeping track of which outcomes are observed, organized by type of block
                if(typeof Test_Phase_Outcomes[current_block_type] === "undefined"){
                    Test_Phase_Outcomes[current_block_type] = []
                }

                if(TrialBuffer[i].outcome_observed !== 'unknown'){
                    Test_Phase_Outcomes[current_block_type].push(TrialBuffer[i].outcome_observed)
                }else{
                    Test_Phase_Outcomes[current_block_type].push(TrialBuffer[i].hidden_outcome_observed)
                }

            }
            DataObj.Test_Phase.push({type: current_block_type, Trials: JSON.parse(JSON.stringify(ReducedTrialBuffer))})
            DataObj.Timestamps.push(["Test phase block completed", Date.now() - experiment_start_time])
        }

        TrialBuffer = []
    }

    this.store_quiz_results = function(state_of_the_world){
        DataObj.Training_Phase.push({type: "quiz", world: JSON.parse(JSON.stringify(state_of_the_world)) })
        DataObj.Timestamps.push(["quiz complete", Date.now() - experiment_start_time])
    }

    //Reduces the contents of the test trial to minimize the data stores (lots of internal variables are not needed for further analysis)
    function reduce_trial_data_object(FennimalObj){
        let Available_Items_Arr = []
        for(let key = 0; key< Object.keys(FennimalObj.ItemResponses).length; key++){
            if(FennimalObj.ItemResponses[Object.keys(FennimalObj.ItemResponses)[key]] !== "unavailable"){
                Available_Items_Arr.push(Object.keys(FennimalObj.ItemResponses)[key])
            }
        }

        let NewObj = {
            ID: FennimalObj.ID,
            b: FennimalObj.body,
            h: FennimalObj.head,
            r: FennimalObj.region,
            l: FennimalObj.location,
            n: FennimalObj.name,
            num_in_block: FennimalObj.encounter_order_in_block,
            rt: FennimalObj.rt,

            c_toy: FennimalObj.cued_item,
            s_toy: FennimalObj.search_item,
            avail: Available_Items_Arr,
            selected: FennimalObj.selected_item,

            out_obs: FennimalObj.outcome_observed,
            out_hid: FennimalObj.hidden_outcome_observed,

        }

        if(typeof FennimalObj.sequence_locations_visited !== "undefined"){
            let ShortLocationsArr = []
            for(let i = 0; i< FennimalObj.sequence_locations_visited.length;i++){
                ShortLocationsArr.push(abbreviate_location_name(FennimalObj.sequence_locations_visited[i]))
            }
            NewObj.locvisar = ShortLocationsArr

        }

        if(typeof FennimalObj.record_of_items_carried !== "undefined"){
            NewObj.items_backpack = FennimalObj.record_of_items_carried
        }

        return(NewObj)
    }

    // Keeps track of the results throughout the test phase
    let Test_Phase_Outcomes = {}
    this.get_test_phase_outcomes = function(){
        return(JSON.parse(JSON.stringify(Test_Phase_Outcomes)))
    }

    //Records a questionnaire answer
    let flag_questionnaire_started = false
    this.record_questionnaire_answer = function(variable, value){
        DataObj.Questionnaire[variable] = JSON.parse(JSON.stringify(value))
        if(flag_questionnaire_started === false){
            DataObj.Timestamps.push(["start questionnaire", Date.now() - experiment_start_time])
            flag_questionnaire_started = true
        }
    }

    //Stores the participant's score
    this.storeScoreObject = function(ScoreObj){
        DataObj.Score = JSON.parse(JSON.stringify(ScoreObj))
    }

    this.updateForm = function(){
        console.log(DataObj)
        DataObj.Timestamps.push(["experiment_completed", Date.now() - experiment_start_time])
        document.getElementById("data_form_field").innerHTML = JSON.stringify(DataObj)
    }

}

ExperimentController = function(){
    let that = this
    let participant_number, Stimuli
    let experiment_design = "baseline"
    let retake_quiz_until_perfect = true

    //Subcontrollers
    let InstrCont, LocCont, DC, GarbageCleaner

    //DENOTES THE SEQUENCE OF STAGES (the contents of this array are removed during the experiment
    let current_experiment_stage = "starting_instructions"

    let ExperimentStages = {
        Instructions: ["consent", "full_screen_prompt", "payment_info", "basic_instructions"], //["consent", "full_screen_prompt", "payment_info", "basic_instructions"]
        Training: ["exploration", "search_location", "search_name",  "delivery_icon", "quiz" ], // "exploration", "search_name",  "delivery_icon", "delivery_location", "quiz"      "exploration", "search_icon",  "delivery_icon", "delivery_location", "quiz"    "exploration", "search_icon", "search_name", "delivery_icon", "delivery_name"
        Test: [], //Updated on initialization, defined by the Stimuli.
        Questionnaire: ["open","gender", "age", "colorblindness"], //"open","gender", "age", "colorblindness"
    }

    //Retrieve participant number
    function set_participant_number(){
        let url_string = window.location;
        let url = new URL(url_string);
        let PID =  url.searchParams.get("PROLIFIC_PID")
        if(PID != null){
            participant_number = ProlificIDToSeed(PID)
            console.warn("SEEDED RNG " + participant_number)
        }else{
            participant_number = 1726963  //draw_random_participant_seed() //17032024
            console.warn("NO PID FOUND. Defaulting to random seed " + participant_number)
        }
    }

    //Cleans the SVG of unused Fennimal parts and locations
    function remove_unused_elements_from_SVG(){
        //After stimuli are defined, delete unused SVG layers to enhance performance
        GarbageCleaner.remove_unused_locations_from_SVG(Param.All_Possible_Locations, Param.Available_Location_Names)
        //One exception for the heads: we want to preserve them in the Search-on-sim experiment
        if(Stimuli.get_experiment_code() !== "exp_search_on_sim"){
            GarbageCleaner.remove_unused_heads_from_SVG(Param.Available_Fennimal_Heads, Stimuli.getHeadsUsed())
            GarbageCleaner.remove_unused_bodies_from_SVG(Param.Available_Fennimal_Bodies, Stimuli.getBodiesUsed())
        }

    }

    // Call to initialize all subcontrollers and supporting objects
    function initialize_experiment(){
        //Retrieving the participant number
        set_participant_number()

        //Set the RNG
        RNG = new RandomNumberGenerator(participant_number)

        //Create the stimulus data object
        Stimuli = new STIMULUSDATA(experiment_design)

        //Create a garbage cleaner
        GarbageCleaner = new SVGGarbageCollector()

        //Create a datacontroller, and store the training stimuli
        DC = new DataController()
        DC.storeTrainingStimuli(Stimuli.getTrainingSetFennimalsInArray())
        DC.store_variable("exp_code", experiment_design)
        DC.store_variable("participant_num", participant_number)
        DC.store_variable("Date", new Date().toDateString())

        //Update the Test phase of the experiment.
        ExperimentStages.Test = Stimuli.getTestPhaseData()

        //Once the stimuli are created, change the available locations in the Parameter object. This prevents subjects from having to (or being able to) travel to regions which simply do not exist
        Param.Available_Location_Names = Stimuli.getLocationsVisited()
        Param.Regions_Visited = Stimuli.getRegionsVisited()

        //Clear the SVG
        remove_unused_elements_from_SVG()

        //Initialize the WorldState
        Worldstate.initialize_world()

        //Create subcontrollers for the Locations and Instructions
        InstrCont = new InstructionsController(that, false)
        LocCont = new LocationController(that)

    }

    // STARTING INSTRUCTIONS
    /////////////////////////
    function start_instructions(){
        show_current_instructions()
    }

    function show_current_instructions(){
        switch(ExperimentStages.Instructions[0]){
            case("consent"):  InstrCont.show_consent_screen(); break;
            case("full_screen_prompt"): InstrCont.show_fullscreen_prompt(); break;
            case("payment_info"): InstrCont.show_payment_info(); break
            case("basic_instructions"): InstrCont.show_basic_instructions_screen(); break
        }
    }

    function show_next_starting_instruction_screen(){
        // Remove the current instructions for the array
        ExperimentStages.Instructions.shift()
        if(ExperimentStages.Instructions.length > 0){
            show_current_instructions();
        }else{
            all_starting_instructions_completed()
        }
    }

    function all_starting_instructions_completed(){
        start_training_phase()
    }

    //Call when a starting instructions page has been completed
    this.starting_instructions_page_completed = function(special_note){
        switch(special_note){
            case(false): show_next_starting_instruction_screen(); break
            case("consent"):
                DC.store_variable("consent_given", new Date().toLocaleString())
                show_next_starting_instruction_screen(); break
            case("from_basic_instructions_screen"):
                switch(current_experiment_stage){
                    case("starting_instructions"): show_next_starting_instruction_screen(); break
                    case("exploration"): InstrCont.showExplorationInstructions( Stimuli.getTrainingSetFennimalsInArray()); break
                    case("search"): show_block_instructions(); break;
                    case("delivery"): show_block_instructions(); break
                }

        }

    }

    // TRAININING PHASE
    let CurrentTrial, RemainingTrialsInBlock, block_hint_type

    this.block_instructions_page_closed = function(){
        if(current_experiment_stage === "exploration"){
            if(exploration_block_completed_flag){
                exploration_phase_block_completed()
            }else{
                LocCont.reset_and_enable_map_movement()
            }

        }else{
            LocCont.reset_and_enable_map_movement()
        }

    }
    this.instructions_page_requested = function (){
        show_block_instructions()
    }
    function show_block_instructions(){
        switch(current_experiment_stage){
            case("exploration"): InstrCont.showExplorationInstructions( Stimuli.getTrainingSetFennimalsInArray()); break;
            case("search"): InstrCont.showSearchInstructions(CurrentTrial,block_hint_type); break;
            case("delivery"):
                LocCont.change_item_in_backpack(false, false)
                InstrCont.showDeliveryInstructions(CurrentTrial,block_hint_type, Stimuli.getItemDetails());
                InstrCont.reset_backpack_menu();
                break;
            case("quiz"):
                InstrCont.show_quiz_block_instructions(retake_quiz_until_perfect, Stimuli.getAllOutcomesObservedDuringTrainingPhase()); break;
            case("test"):
                InstrCont.show_test_phase_trial_instructions(CurrentTrial, CurrentTestBlockObject.type, CurrentTestBlockObject.hint_type)

        }
    }
    function start_training_phase(){
        //Some pages can be deleted from the SVG after the page has been closed
        GarbageCleaner.remove_consent_page_from_SVG()


        start_next_block()
    }

    function start_next_block(){
        //First check if there are any stages left in the training phase. If not, see if theres anything to do in the test phase. If thats not the case either, then we can start wrapping up
        if(ExperimentStages.Training.length > 0){
            //If we just finished the exploration page, then delete the page itself to speed up the SVG a bit
            if(current_experiment_stage === "exploration"){
                console.log("deleting exploration page from SVG")
                GarbageCleaner.remove_exploration_page_from_SVG()
            }

            current_experiment_stage = ExperimentStages.Training.shift()
            console.log(current_experiment_stage)

            switch (current_experiment_stage){
                case("exploration"): start_exploration_block(); break
                case("search_icon"): start_search_block("icon");  break
                case("search_name"): start_search_block("name"); break
                case("search_location"): start_search_block("location"); break
                case("delivery_icon"): start_delivery_block("icon"); break
                case("delivery_name"): start_delivery_block("name"); break
                case("delivery_location"): start_delivery_block("location"); break
                case("quiz"): start_training_quiz_block("location"); break
            }

        }else{
            if(ExperimentStages.Test.length > 0){
                if(!test_phase_general_instructions_shown){
                    start_test_phase()
                    test_phase_general_instructions_shown = true
                }else{
                    start_test_phase_block()
                }
            }else{
                //Training and test completed
                test_phase_completed()
            }
        }

    }

    // TRAINING PHASE: EXPLORATION
    /////////////////////////////////
    let exploration_block_completed_flag
    function start_exploration_block(){
        current_experiment_stage = "exploration"
        exploration_block_completed_flag = false
        Worldstate.clear_all_Fennimals()
        Worldstate.reset_locations_visited()
        LocCont.change_experiment_phase("exploration")
        InstrCont.showExplorationInstructions( Stimuli.getTrainingSetFennimalsInArray())

        //Now populate the world
        for(let i =0; i<Stimuli.getTrainingSetFennimalsInArray().length; i++){
            let Fen = Stimuli.getTrainingSetFennimalsInArray()[i]
            populate_world_with_Fennimal(Fen, current_experiment_stage  )
        }
    }
    this.exploration_phase_all_targets_found = function(){
        exploration_block_completed_flag = true
    }
    function exploration_phase_block_completed(){
        //Store the sequence by which the world was explored
        DC.storeExplorationPhaseData(Worldstate.get_locations_visited_order_object())

        //Start the next block
        start_next_block()

    }
    this.get_total_number_of_Fennimals_to_be_found = function(){
        return(Stimuli.getTrainingSetFennimalsInArray().length)
    }

    // TRAINING PHASE: TARGETTED SEARCH
    //////////////////////////////////
    function start_search_block(hint_type){
        current_experiment_stage = "search"
        DC.start_next_block("search_" + hint_type, "training");

        Worldstate.clear_all_Fennimals()
        Worldstate.reset_locations_visited()
        LocCont.change_experiment_phase("search")
        block_hint_type = hint_type

        //Store all trials in our buffer
        RemainingTrialsInBlock = shuffleArray(Stimuli.getTrainingSetFennimalsInArray())

        start_next_trial()
    }

    function start_next_trial(){
        if(RemainingTrialsInBlock.length > 0){
            //Load next trial
            CurrentTrial = RemainingTrialsInBlock.shift()

            //Populating the world
            populate_world_with_Fennimal(CurrentTrial, current_experiment_stage )

            //Clear out the backpack
            item_in_backpack = false
            InstrCont.empty_backpack()

            //Reset the sequence of locations visited
            LocCont.reset_LocationVisitedArray()
            LocCont.reset_record_of_items_carried()

            //Go to the instructions
            show_block_instructions()
        }else{
            block_of_trials_completed()
        }


    }

    function block_of_trials_completed(){
        DC.block_completed()
        start_next_block()
    }

    // TRAINING PHASE: DELIVERY
    ////////////////////////////////
    let item_in_backpack = false
    function start_delivery_block(hint_type){
        current_experiment_stage = "delivery"
        DC.start_next_block("delivery_" + hint_type, "training");

        Worldstate.clear_all_Fennimals()
        Worldstate.reset_locations_visited()
        LocCont.change_experiment_phase("delivery")
        block_hint_type = hint_type

        //Store all trials in our buffer
        RemainingTrialsInBlock = shuffleArray(Stimuli.getTrainingSetFennimalsInArray())

        start_next_trial()

    }

    this.backpack_item_selected = function(selected_item, color){
        item_in_backpack = selected_item
        LocCont.change_item_in_backpack(selected_item, color)
    }


    // TRAINING PHASE: QUIZ BLOCK
    ////////////////////////////////
    let first_quiz_attempt = true
    function start_training_quiz_block(){
        Worldstate.clear_all_Fennimals()
        Worldstate.reset_locations_visited()
        LocCont.change_experiment_phase("quiz")
        current_experiment_stage = "quiz"

        //Populate the world
        for(let i =0; i<Stimuli.getTrainingSetFennimalsInArray().length; i++){
            let Fen = Stimuli.getTrainingSetFennimalsInArray()[i]
            populate_world_with_Fennimal(Fen, current_experiment_stage  )
        }

        InstrCont.show_quiz_block_instructions(retake_quiz_until_perfect, Stimuli.getAllOutcomesObservedDuringTrainingPhase())

    }
    this.all_quiz_Fennimals_found = function(number_of_errors_made){
        //Store results
        DC.store_quiz_results(Worldstate.get_Fennimals_state_object())

        if(number_of_errors_made > 0 && retake_quiz_until_perfect){
            InstrCont.quiz_has_been_failed()
            first_quiz_attempt = false
            ExperimentStages.Training.unshift("quiz")

        }

        start_next_block();
    }

    // TEST PHASE
    ////////////////
    let CurrentTestBlockObject, current_test_day_num = 0, total_number_of_test_days
    let test_phase_general_instructions_shown = false
    function start_test_phase(){
        Worldstate.clear_all_Fennimals()
        Worldstate.reset_locations_visited()
        LocCont.change_experiment_phase("test")
        current_experiment_stage = "test"
        total_number_of_test_days = JSON.parse(JSON.stringify(ExperimentStages.Test.length))

        InstrCont.show_test_phase_start_instructions(ExperimentStages.Test.length, Stimuli.getAllOutcomesObservedDuringTrainingPhase())
        GarbageCleaner.remove_basic_instructions_from_SVG()

    }

    this.test_phase_starting_instructions_read = function(){
        start_next_block()
    }
    function start_test_phase_block(){
        Worldstate.clear_all_Fennimals()
        Worldstate.reset_locations_visited()
        LocCont.change_experiment_phase("test")
        current_test_day_num++

        CurrentTestBlockObject = ExperimentStages.Test.shift()

        RemainingTrialsInBlock = shuffleArray(CurrentTestBlockObject.Trials)

        DC.start_next_block("test_" + CurrentTestBlockObject.type, "test");
        block_hint_type = CurrentTestBlockObject.hint_type

        //Showing the block-specific instructions
        InstrCont.show_test_phase_block_instructions(CurrentTestBlockObject.type,CurrentTestBlockObject.Rules,Stimuli.getAllOutcomesObservedDuringTrainingPhase(), current_test_day_num, total_number_of_test_days)
    }
    this.test_phase_block_instructions_read = function(){
        start_next_trial()
    }
    this.Fennimal_trial_completed = function(FenObj){
        //Store data
        DC.storeTrialData(FenObj)

        // Start next trial
        start_next_trial()

    }

    function populate_world_with_Fennimal(FenObj, current_experiment_stage){
        //Making a deep copy
        let FennimalObj = JSON.parse(JSON.stringify(FenObj))

        //Adding all the information needed by the location controller to complete this interaction
        if(current_experiment_stage === "exploration"){
            FennimalObj.end_of_interaction_event = "continue"
            FennimalObj.flashlight_search = false
        }else{
            FennimalObj.end_of_interaction_event = "end_trial"
            FennimalObj.flashlight_search = false
        }

        if(current_experiment_stage === "quiz"){
            FennimalObj.end_of_interaction_event = "continue"
            FennimalObj.quiz_trial = true
        }

        FennimalObj.can_abort_interaction = false
        FennimalObj.encounter_completed = false

        FennimalObj.ItemDetails = Stimuli.getItemDetails()

        //Add to the world
        Worldstate.add_Fennimal_to_location(FennimalObj.location, FennimalObj)

    }

    //Call when all the test phase blocks have been completed, to wrap up the experiment
    function test_phase_completed(){
        //Start the questionnaire
        start_questionnaire()
    }

    //QUESTIONAIRE AND PAYMENT
    // Creates an object containing all the payment-relevant information for the participants
    function create_score_object(){
        let OutcomeObject = DC.get_test_phase_outcomes()

        //Creating a summary of all outcomes
        let SummaryOutcomes = {}
        let PointsPerPhase = {}
        let NumberEncountersPerPhase = {}
        let encountered_phases = Object.keys(OutcomeObject)
        let total_points = 0, total_number_of_test_phase_encounters = 0

        for(let i =0;i<encountered_phases.length;i++){
            let points = 0
            SummaryOutcomes[encountered_phases[i]] = {}
            NumberEncountersPerPhase[encountered_phases[i]] = OutcomeObject[encountered_phases[i]].length

            for(let j=0; j<OutcomeObject[encountered_phases[i]].length; j++){
                points = points + Param.OutcomesToPoints[OutcomeObject[encountered_phases[i]][j] ]
                total_number_of_test_phase_encounters++

                if(typeof SummaryOutcomes[encountered_phases[i]][OutcomeObject[encountered_phases[i]][j] ] == "undefined"){
                    SummaryOutcomes[encountered_phases[i]][OutcomeObject[encountered_phases[i]][j] ] = 1
                }else{
                    SummaryOutcomes[encountered_phases[i]][OutcomeObject[encountered_phases[i]][j] ]++
                }
            }

            PointsPerPhase[encountered_phases[i]] = points
            total_points = total_points + points

        }

        //Calculating a score
        let star_rating
        let max_possible_points = total_number_of_test_phase_encounters

        if(total_points <= 0){
            star_rating = 0
        }else{
            let relative_score = total_points / max_possible_points
            star_rating = 1
            if(relative_score >= .20){ star_rating = 2}
            if(relative_score >= .40){ star_rating = 3}
            if(relative_score >= .60){ star_rating = 4}
            if(relative_score >= .80){ star_rating = 5}
        }

        //Create a Token / completion code here
        let cc_word_1 = shuffleArray(["Happy", "Bright", "Clean","Soft", "Funny", "Warm", "Sharp", "Small", "Kind", "Sweet", "Young", "White", "Tall"])[0]
        let cc_word_2 = shuffleArray(["Cat", "Rabbit", "Owl","Fox","Koala", "Frog", "Shark", "Zebra", "Bat", "Flower", "Panda", "Rose", "Poppy", "Lily", "Tulip"  ])[0]
        let completion_code = cc_word_1 + cc_word_2 + star_rating

        let ScoreObj = {
            total_number_of_test_phase_Fennimals: total_number_of_test_phase_encounters,
            Outcomes: SummaryOutcomes,
            NumberEncountersPerPhase: NumberEncountersPerPhase,
            stars_obtained: star_rating,
            completion_code: completion_code

        }
        return(ScoreObj)
    }

    //Call to start the questionnaire
    function start_questionnaire(){
        //Show the general questionnaire intro page
        if(ExperimentStages.Questionnaire.length > 0){
            InstrCont.show_questionnaire_start_page()
        }else{
            //This triggers the program to go to the payment screen instead
            show_next_questionnaire_item()
        }
    }

    //Logs the response to a questionnaire page and moves to the next page. If there are no more pages, then it moves to the final payment screen
    function show_next_questionnaire_item(){
        if(ExperimentStages.Questionnaire.length > 0){
            //Go to the next questionnaire item
            let upcoming_questionnaire_item = ExperimentStages.Questionnaire.shift()
            InstrCont.show_questionnaire_page(upcoming_questionnaire_item)
        }else{
            //The questionnaire has been completed, time to finish the experiment!
            show_payment_screen()
        }
    }

    //If variable is set to false, then no response is recorded (for instruction pages)
    this.record_questionnaire_response = function(variable, value){
        //Record the value
        if(variable !== false){
            DC.record_questionnaire_answer(variable,value)
        }

        //Go to the next questionnaire item
        show_next_questionnaire_item()
    }

    //Last page of the experiment: show the payment screen
    let ScoreObject
    function show_payment_screen(){
        ScoreObject = create_score_object()
        DC.storeScoreObject(ScoreObject)

        //Tell the DC to update the form
        DC.updateForm()

        //Show the screen
        InstrCont.show_payment_screen(ScoreObject)

    }

    //Call to submit the data and complete the experiment
    this.finish_experiment = function(){
        let alertmessage = "You are now submitting this page. After submitting you will not be able to go back. If you did not yet submit the completion code on Prolific, then please do so now! The completion code is: " + ScoreObject.completion_code
        alert(alertmessage)

        //Submit after the alert
        document.getElementById("submitbutton").click()
    }

    initialize_experiment()
    start_instructions()

}

let EC = new ExperimentController()

// Clean up SVG by removing instructions when no longer needed.
// Add loading screen

// Consent