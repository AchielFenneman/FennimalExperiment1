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
        let ReducedTrialBuffer = []

        for(let i=0;i<TrialBuffer.length;i++){
            //Storing a reduced version of the trial object
            ReducedTrialBuffer.push(reduce_trial_data_object(TrialBuffer[i], current_block_phase === "training"))


        }


        if(current_block_phase === "training"){
            DataObj.Training_Phase.push({type: current_block_type, Trials: JSON.parse(JSON.stringify(ReducedTrialBuffer))})
            DataObj.Timestamps.push(["training phase " + current_block_type + " completed", Date.now() - experiment_start_time])
        }

        if(current_block_phase === "test"){
            for(let i=0;i<TrialBuffer.length;i++){
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
        let NewState = JSON.parse(JSON.stringify(state_of_the_world))

        for(let location in NewState){
            if(NewState[location] !== false){
                NewState[location] = reduce_trial_data_object(NewState[location], true)
            }
        }

        DataObj.Training_Phase.push({type: "quiz", world: JSON.parse(JSON.stringify(NewState)) })
        DataObj.Timestamps.push(["quiz complete", Date.now() - experiment_start_time])
    }

    this.store_card_quiz_array = function(CardErrorsArray){
        DataObj.Training_Phase.push({type: "cardquiz", results: JSON.parse(JSON.stringify(CardErrorsArray))})
        DataObj.Timestamps.push(["card quiz complete", Date.now() - experiment_start_time])
    }

    //Reduces the contents of the test trial to minimize the data stores (lots of internal variables are not needed for further analysis)
    function reduce_trial_data_object(FennimalObj, absolute_minimum){
        let Available_Items_Arr = []
        for(let key = 0; key< Object.keys(FennimalObj.ItemResponses).length; key++){
            if(FennimalObj.ItemResponses[Object.keys(FennimalObj.ItemResponses)[key]] !== "unavailable"){
                Available_Items_Arr.push(Object.keys(FennimalObj.ItemResponses)[key])
            }
        }

        let NewObj = {}
        if(absolute_minimum){
            NewObj = {
                ID: FennimalObj.ID,
                rt: FennimalObj.rt,
                selected: FennimalObj.selected_item,
                out_obs: FennimalObj.outcome_observed,
                out_hid: FennimalObj.hidden_outcome_observed,
            }

        }else{
            NewObj = {
                ID: FennimalObj.ID,
                b: FennimalObj.body,
                h: FennimalObj.head,
                r: FennimalObj.region,
                l: FennimalObj.location,
                n: FennimalObj.name,
                rt: FennimalObj.rt,

                c_toy: FennimalObj.cued_item,
                s_toy: FennimalObj.search_item,
                avail: Available_Items_Arr,
                selected: FennimalObj.selected_item,

                out_obs: FennimalObj.outcome_observed,
                out_hid: FennimalObj.hidden_outcome_observed,

            }

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

        if(typeof FennimalObj.confidence_rating !== "undefined") {NewObj.conf = FennimalObj.confidence_rating}
        if(typeof FennimalObj.decision_style !== "undefined") {NewObj.d_style = FennimalObj.decision_style}
        if(typeof FennimalObj.remembered_Fennimals !== "undefined") {NewObj.rem_Fen = FennimalObj.remembered_Fennimals}
        if(typeof FennimalObj.alt_strategy !== "undefined") {NewObj.alt_strat = FennimalObj.alt_strategy}

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

    this.record_recallled_Fennimals = function(Array){
        if(typeof DataObj.RecalledNames === "undefined"){
            DataObj.RecalledNames = [Array]
        }else{
            DataObj.RecalledNames.push(Array)
        }
        DataObj.Timestamps.push(["recalled names complete", Date.now() - experiment_start_time])
        console.log(DataObj)
    }
    this.get_recalled_Fennimal_names = function(){
        return(JSON.parse(JSON.stringify(DataObj.RecalledNames)))
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
    let open_question_special_Fennimal_ID = false // "key" // Set to false to have a general open question. If not set to false, then the open question specificially asks about this Fennimal.

    //Set to false if not used.
    let Recall_Question_Payment = {
        allowed_errors: 1, //This is how many mistakes (omission and commission the participant is allowed to make)
        max_allowed_Levenshtein_distance: 2, //For each answer given, this determines maximum amount of errors (typos) allowed before an answer cannot be tied to a Fennimal
        max_allowed_distance_to_count_error: 4 //To make it a bit easier on subjects, we give them the benefit of the doubt: if an answer vaguely resembles a Fennimal name, then its not counted as an error-by-commission (although still as ommision!)
    }

    this.get_recall_question_bonus_rules = function(){return Recall_Question_Payment}
    //Subcontrollers
    let InstrCont, LocCont, DC, GarbageCleaner

    //DENOTES THE SEQUENCE OF STAGES (the contents of this array are removed during the experiment
    let current_experiment_stage = "starting_instructions"

    let ExperimentStages = {
        Instructions: [ "consent", "full_screen_prompt", "payment_info", "basic_instructions"], //"consent", "full_screen_prompt", "payment_info", "basic_instructions"
        Training: ["exploration", "search_icon", "search_location",  "delivery_icon", "delivery_name", "cardquiz"],  // "exploration", "search_icon", "search_location",  "delivery_icon", "delivery_name", "cardquiz"
        Test: [], //Updated on initialization, defined by the Stimuli.
        Questionnaire: ["gender", "age", "colorblindness"], //"open","gender", "age", "colorblindness"
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
            participant_number = draw_random_participant_seed() //17032024
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

    this.get_all_training_phase_Fennimal_names = function(){
        let Obj = {}
        let TStim = Stimuli.getTrainingSetFennimalsInArray()
        for(let i =0;i<TStim.length;i++){
            Obj[TStim[i].ID] = TStim[i].name
        }
        return(Obj)
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
            case("payment_info"): InstrCont.show_payment_info(get_maximum_number_of_stars_earnable_single_block_setup()); break
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
                InstrCont.showDeliveryInstructions(CurrentTrial,block_hint_type, Stimuli.getItemDetails(), check_if_negative_valences_during_training());
                InstrCont.reset_backpack_menu();
                break;
            case("quiz"):
                InstrCont.show_quiz_block_instructions(retake_quiz_until_perfect, Stimuli.getAllOutcomesObservedDuringTrainingPhase()); break;
            case("cardquiz"):
                InstrCont.showCurrentQuizCard()
                break;
            case("test"):
                InstrCont.show_test_phase_trial_instructions(CurrentTrial, CurrentTestBlockObject.type, CurrentTestBlockObject.hint_type)
                break


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

            switch (current_experiment_stage){
                case("exploration"): start_exploration_block(); break
                case("search_icon"): start_search_block("icon");  break
                case("search_name"): start_search_block("name"); break
                case("search_location"): start_search_block("location"); break
                case("delivery_icon"): start_delivery_block("icon"); break
                case("delivery_name"): start_delivery_block("name"); break
                case("delivery_location"): start_delivery_block("location"); break
                case("quiz"): start_training_quiz_block("location"); break
                case("cardquiz"): start_training_cardquiz_block(); break
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

    //TRAINING PHASE: CARD QUIZ
    ///////////////////////////
    let CurrentQuizCard, CardQuizResultArr
    function start_training_cardquiz_block(){
        //Determine the different cards. Theres one card for each training phase Fennimal. Should have a reference to the FennimalObj and to the
        current_experiment_stage = "cardquiz"
        DC.start_next_block("cardquiz", "training");

        LocCont.change_experiment_phase("cardquiz")

        //Create all trials. Starting with the Fennimal types
        RemainingTrialsInBlock = []
        let TrainingFennimals = shuffleArray( Stimuli.getTrainingSetFennimalsInArray() )
        for(let i =0;i<TrainingFennimals.length;i++){
            //if(TrainingFennimals[i].ID === "A"){ RemainingTrialsInBlock.push({type: "Fennimal", FenObj: TrainingFennimals[i]}) }
            RemainingTrialsInBlock.push({type: "Fennimal", FenObj: TrainingFennimals[i]})
        }

        //Now adding location types
        TrainingFennimals = shuffleArray( Stimuli.getTrainingSetFennimalsInArray() )
        for(let i =0;i<TrainingFennimals.length;i++){
            RemainingTrialsInBlock.push({type: "location", FenObj: TrainingFennimals[i]})
        }


        //Fill the world with completed Fennimals
        Worldstate.reset_locations_visited()
        for(let i =0; i<Stimuli.getTrainingSetFennimalsInArray().length; i++){
            let Fen = Stimuli.getTrainingSetFennimalsInArray()[i]
            Fen.selected_item = Fen.special_item
            Fen.outcome_observed = Fen.ItemResponses[Fen.special_item]
            populate_world_with_Fennimal(Fen)
        }

        //Initialzing our results array
        CardQuizResultArr = []

        //Show general quiz instructions
        InstrCont.show_cardquiz_instructions()
    }
    function next_quiz_card(){
        if(RemainingTrialsInBlock.length > 0){
            CurrentQuizCard = RemainingTrialsInBlock.shift()
            switch(CurrentQuizCard.type){
                case("Fennimal"): InstrCont.create_cardquiz_card_Fennimal(CurrentQuizCard.FenObj, Stimuli.getLocationsVisited(), shuffleArray(Stimuli.getTrainingPhaseNames()), Stimuli.getItemDetails().All_Items, Stimuli.getTrainingPhaseValences()); break
                case("location"): InstrCont.create_cardquiz_card_location(CurrentQuizCard.FenObj, Stimuli.getLocationsVisited(), shuffleArray(Stimuli.getTrainingPhaseNames()), Stimuli.getItemDetails().All_Items, Stimuli.getTrainingPhaseValences()); break// TODO
            }
        }else{
            //Quiz completed

            //Store data
            DC.store_card_quiz_array(CardQuizResultArr)

            //Continue experiment after a brief timeout
            start_next_block()

        }
    }

    this.quiz_card_answered = function(error_array, checked_map){
        //Store the data
        let Obj = {
            type: CurrentQuizCard.type,
            checked_map: checked_map
        }
        switch (CurrentQuizCard.type){
            case("Fennimal"):
                Obj.target= CurrentQuizCard.FenObj.ID
                break
            case("location"):
                break

        }
        Obj.errors = error_array
        CardQuizResultArr.push(JSON.parse(JSON.stringify(Obj)))

        //If mistakes have been made AND the we set the quiz to repeat until perfect, then move this card back to the bottom of the stack
        if(error_array.length > 0 && retake_quiz_until_perfect){
            RemainingTrialsInBlock.push(JSON.parse(JSON.stringify(CurrentQuizCard)))
        }

        //Try for the next quiz card
        next_quiz_card()

    }
    this.quiz_card_instructions_completed = function(){
        next_quiz_card()
    }
    function check_if_negative_valences_during_training(){
        let Observed = Stimuli.getTrainingPhaseValences()
        return(Observed.includes("frown") || Observed.includes("bites"))
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

        InstrCont.show_test_phase_start_instructions(ExperimentStages.Test.length, Stimuli.get_number_of_search_blocks())
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

        if(CurrentTestBlockObject.type === "recall_task"){
            RemainingTrialsInBlock = []
            InstrCont.show_test_phase_block_instructions(CurrentTestBlockObject.type,false,false, current_test_day_num, total_number_of_test_days,false, true)

        }else{
            RemainingTrialsInBlock = CurrentTestBlockObject.Trials

            DC.start_next_block("test_" + CurrentTestBlockObject.type, "test");
            block_hint_type = CurrentTestBlockObject.hint_type

            //Showing the block-specific instructions
            InstrCont.show_test_phase_block_instructions(CurrentTestBlockObject.type,CurrentTestBlockObject.Rules,Stimuli.getAllOutcomesObservedDuringTrainingPhase(), current_test_day_num, total_number_of_test_days,RemainingTrialsInBlock.length, true)
        }
    }
    this.test_phase_block_instructions_read = function(){
        start_next_trial()
    }
    this.Fennimal_trial_completed = function(FenObj){
        Worldstate.clear_all_Fennimals()
        Worldstate.reset_locations_visited()

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

    // RECALL TASK
    /////////////////

    //Logs the results of the recall questionnaire, computes the number of correct answers.
    this.recall_task_completed = function(AnswerArray){
        let ProcessedData = process_recall_data(AnswerArray)

        // For payment: keep track of the number of errors made
        Recall_Question_Payment.errors_made = ProcessedData.errors_made

        //Record data
        DC.record_recallled_Fennimals(ProcessedData.Answers)

        // Go to the next part of the experiment. Note: since the recall task can take place in either the test phase or the questionnaire, check for this first
        //this.record_questionnaire_response("recall", ProcessedData.Answers)
        switch(current_experiment_stage){
            case("questionnaire"): show_next_questionnaire_item(); break
            case("test"):start_next_block(); break;
        }



    }

    //QUESTIONAIRE AND PAYMENT
    /////////////////////////////



    //Call with the answers of the recall questionnaire to compute errors. Also stores the data and the erros
    function process_recall_data(AnswerArray){
        //Use only lower-case for the correct answers
        let IDNames = Stimuli.getObjectOfIDsAndNames()
        for(let key in IDNames){
            if(IDNames[key] === false){
                delete IDNames[key]
            }else{
                IDNames[key] = IDNames[key].toLowerCase()
            }

        }

        //Now find all the names that where input by the participant.
        // Here we also use lower-case only, and remove potential starter string "the " and "a "
        // We can also start keeping track of the errors-by-commission (invalid inputs)
        let errors = 0
        let Fennimals_matched = []
        let Names_matched = []

        for(let i =0;i<AnswerArray.length;i++){
            if(! AnswerArray[i].removed_by_user){
                //First: add a new property for the modified name
                let newans = AnswerArray[i].ans.toLowerCase()

                if(newans.startsWith("the ")){newans = newans.slice(4)}
                if(newans.startsWith("a ")){newans = newans.slice(2)}

                AnswerArray[i].ans_mod = newans

                //Now we need to figure out which Fennimal the participant probably had in mind.
                // We do this by calculating the Levenshtein distance between the provided answer.
                // We then select the name with the lowest Leven-distance.
                // If this Leven-distance is below a given threshold, then we have a correct placement. If not, then we have an error.
                let LevenDistances = []
                let IDs = []
                for(let key in IDNames){
                    IDs.push(key)
                    LevenDistances.push( LevenshteinDistance(IDNames[key], newans))
                }

                //Get the ID with the lowest distance
                let lowest_ID = IDs[LevenDistances.indexOf(Math.min(...LevenDistances))]
                let lowest_distance_val = Math.min(...LevenDistances)

                if(lowest_distance_val <= Recall_Question_Payment.max_allowed_Levenshtein_distance ){
                    AnswerArray[i].matchedID = lowest_ID
                    Fennimals_matched.push(lowest_ID)
                    Names_matched.push(IDNames[lowest_ID])
                }else{
                    AnswerArray[i].matchedID = false
                    if(lowest_distance_val > Recall_Question_Payment.max_allowed_distance_to_count_error){
                        //This is so far off, count it as an error of commission too
                        errors++
                    }
                }
            }
        }

        //Now we start calculating the errors made by omission (that is, the TRAINING-phase Fennimals which did not have their IDS assigned in any of the answers
        // Note that we are a bit lenient here: adding the names of the search-phase Fennimals won't be counted as an error of commission (and missing them is not an error of ommision)
        let TrainingIDs = []
        let TrainingFennimalArr = Stimuli.getTrainingSetFennimalsInArray()
        for(let i=0;i<TrainingFennimalArr.length;i++){
            TrainingIDs.push(TrainingFennimalArr[i].ID)
        }
        let Missed_Training_IDS = TrainingIDs.filter(x => !Fennimals_matched.includes(x))
        errors = errors + Missed_Training_IDS.length

        //Returning
        return({
            errors_made: errors,
            Answers: AnswerArray
        })

    }

    //Call to start the questionnaire
    function start_questionnaire(){
        current_experiment_stage = "questionnaire"
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

    //Call to fetch a special Fennimal (if one exists) for the open question.
    this.get_open_question_special_Fennimal_name = function(){
        if(open_question_special_Fennimal_ID !== false){
            return(Stimuli.getSearchPhaseFennimalByID(open_question_special_Fennimal_ID).name)
        }else{
            return false
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

    // PAYMENT
    //Last page of the experiment: show the payment screen
    let ScoreObject

    //Returns the maximum number of stars that can be earned during the experiment
    function get_maximum_number_of_stars_earnable_single_block_setup(){
        if(Stimuli.get_number_of_search_blocks() === 1){
            let num_stars = 0

            //One star per search-phase Fennimal
            num_stars = num_stars + Stimuli.get_number_of_search_phase_encounters()

            //A possible perfection bonus
            if(typeof Param.BonusEarnedPerStar.single_block_perfection_bonus_stars !== "undefined"){
                if(Param.BonusEarnedPerStar.single_block_perfection_bonus_stars !== false ){
                    num_stars = num_stars + Param.BonusEarnedPerStar.single_block_perfection_bonus_stars
                }
            }

            //One star for each recalled Fennimal name
            num_stars = num_stars + Stimuli.getTrainingSetFennimalsInArray().length

            //One star for each repeat trial
            num_stars = num_stars + Stimuli.getTrainingSetFennimalsInArray().length

            return(num_stars)

        }else{
            console.error("ERROR: PAYMENT NOT DEFINED FOR THIS SEARCH PHASE SETUP")
            return(0)
        }

    }

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
        let star_rating, total_stars
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

        total_stars = star_rating

        //Figuring out if a bonus star was included
        let bonus_star = false
        if(Recall_Question_Payment !== false){
            if(Recall_Question_Payment.errors_made > Recall_Question_Payment.allowed_errors){
                bonus_star = 0
            }else{
                bonus_star = 1
                total_stars++
            }
        }



        let ScoreObj = {
            total_number_of_test_phase_Fennimals: total_number_of_test_phase_encounters,
            Outcomes: SummaryOutcomes,
            NumberEncountersPerPhase: NumberEncountersPerPhase,
            stars_obtained: star_rating,
            total_stars: total_stars
        }

        if(bonus_star!== false){
            ScoreObj.bonus_star= bonus_star
            ScoreObj.bonus_star_errors_made = Recall_Question_Payment.errors_made
        }

        //Create a Token / completion code here
        let cc_word_1 = shuffleArray(["Happy", "Bright", "Clean","Soft", "Funny", "Warm", "Sharp", "Small", "Kind", "Sweet", "Young", "White", "Tall"])[0]
        let cc_word_2 = shuffleArray(["Cat", "Rabbit", "Owl","Fox","Koala", "Frog", "Shark", "Zebra", "Bat", "Flower", "Panda", "Rose", "Poppy", "Lily", "Tulip"  ])[0]
        ScoreObj.completion_code = cc_word_1 + cc_word_2 + total_stars

        return(ScoreObj)
    }

    function create_score_object_single_search_block(){
        let OutcomeObject = DC.get_test_phase_outcomes()

        //Determining which names have been recalled (and which ones not)
        let TrainingPhaseNames = that.get_all_training_phase_Fennimal_names()
        let RecalledNames = DC.get_recalled_Fennimal_names()
        let correctly_recalled_IDs = []
        for(let i=0;i<RecalledNames[0].length;i++){
            if(RecalledNames[0][i].matchedID !== false){
                correctly_recalled_IDs.push(RecalledNames[0][i].matchedID)
            }
        }
        correctly_recalled_IDs = [...new Set(correctly_recalled_IDs)]

        let training_names_arr = []
        for(let key in TrainingPhaseNames){
            training_names_arr.push(TrainingPhaseNames[key])
        }

        //Creating a summary of all outcomes
        // For the search phase: the number of Fennimals encountered, the number of stars earned for Fennimals, wether the perfection bonus was earned, and total stars
        //  For the recalled names: the total number of Fennimal names, the number of correctly recalled names (=number of stars earned)
        //  For the repeat trials: the total number of repeat trials, the number of Fennimals which liked their toy (=number of stars earned)
        //  Total number of stars earned across all blocks
        let SummaryOutcomes = {
            search_phase: {
                total_search_Fennimals: OutcomeObject.test_search_unique.length,
                stars_earned: OutcomeObject.test_search_unique.filter(item => item === "heart").length,
                possible_stars: OutcomeObject.test_search_unique.length,
            },
            recalled_names: {
                total_Fennimal_names: training_names_arr.length,
                correctly_remembered_names: correctly_recalled_IDs.length
            },
            repeat_trials:{
                total_repeat_Fennimals: OutcomeObject.test_repeat.length,
                stars_earned: OutcomeObject.test_repeat.filter(item => item === "correct").length
            }
        }

        //Calculating additional bonus for the search phase
        if(typeof Param.BonusEarnedPerStar.single_block_perfection_bonus_stars !== "undefined"){
            if(Param.BonusEarnedPerStar.single_block_perfection_bonus_stars !== false && Param.BonusEarnedPerStar.single_block_perfection_bonus_stars !== 0 ){
                SummaryOutcomes.search_phase.perfection_bonus_amount = Param.BonusEarnedPerStar.single_block_perfection_bonus_stars
                SummaryOutcomes.search_phase.possible_stars = SummaryOutcomes.search_phase.possible_stars + SummaryOutcomes.search_phase.perfection_bonus_amount

                if(SummaryOutcomes.search_phase.total_search_Fennimals === SummaryOutcomes.search_phase.stars_earned){
                    SummaryOutcomes.search_phase.perfection_bonus_earned = true
                    SummaryOutcomes.search_phase.total_stars_earned = SummaryOutcomes.search_phase.stars_earned + SummaryOutcomes.search_phase.perfection_bonus_amount
                }else{
                    SummaryOutcomes.search_phase.perfection_bonus_earned = false
                    SummaryOutcomes.search_phase.total_stars_earned = SummaryOutcomes.search_phase.stars_earned
                }
            }
        }

        //Calculating total stars earned for the entire experiment
        SummaryOutcomes.total_stars_earned_in_experiment = SummaryOutcomes.search_phase.total_stars_earned + SummaryOutcomes.recalled_names.correctly_remembered_names + SummaryOutcomes.repeat_trials.stars_earned
        SummaryOutcomes.total_stars_possible_in_experiment = get_maximum_number_of_stars_earnable_single_block_setup()
        SummaryOutcomes.USD_per_star = Param.BonusEarnedPerStar.bonus_per_star
        SummaryOutcomes.USD_earned = (SummaryOutcomes.total_stars_earned_in_experiment * SummaryOutcomes.USD_per_star).toFixed(2)

        //Create a Token / completion code here
        let cc_word_1 = shuffleArray(["Happy", "Bright", "Clean","Soft", "Funny", "Warm", "Sharp", "Small", "Kind", "Sweet", "Young", "White", "Tall"])[0]
        let cc_word_2 = shuffleArray(["Cat", "Rabbit", "Owl","Fox","Koala", "Frog", "Shark", "Zebra", "Bat", "Flower", "Panda", "Rose", "Poppy", "Lily", "Tulip"  ])[0]
        SummaryOutcomes.completion_code = cc_word_1 + cc_word_2 + SummaryOutcomes.total_stars_earned_in_experiment
        SummaryOutcomes.payment_scheme = "single_block"

        return(SummaryOutcomes)
    }

    function show_payment_screen(){
        if(Stimuli.get_number_of_search_blocks() === 1){
            ScoreObject = create_score_object_single_search_block()
        }else{
            ScoreObject = create_score_object()
        }

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

// FREE RECALL BLOCK IN S PHASE (BEFORE REPEAT)

// OPEN QUESTIONS
//      ALL names based on location? (retrieval stage)
//      Hide answers during retrieval?
//      Collapse test trials to region