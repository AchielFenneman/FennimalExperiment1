ExperimentController = function(){
    //Defining mean time predictions and payment variables
    let TimeAndEarnings = {
        predicted_time: 20,
        bonus_currency_symbol: "$",
        bonus_per_correct_answer: 0.10,
    }
    let PaymentData

    let that = this

    //Defining RNG
    RNG = new RandomNumberGenerator(Math.round(Math.random() *10000))

    //Defining stimulus data and to-be-shown blocks
    let Stimuli = new StimulusData(RNG)
    let RemainingBlocks = Stimuli.get_block_data()
    TimeAndEarnings.max_bonus = (Stimuli.get_number_of_measurement_questions() * TimeAndEarnings.bonus_per_correct_answer).toFixed(2)

    //Defining subcontrollers
    let PromptC = new PromptController()
    let SC = new ScreenController(that, PromptC)

    //Stores all the data
    let Data = {
        //Stimuli: JSON.parse(JSON.stringify(Stimuli.get_block_data())),
        Blocks: [],
        start_time: Date.now(),
        start_date: new Date().toLocaleString()
    }
    let BlockDataBuffer = []

    // BLOCK MANAGEMENT FUNCTIONS
    let CurrentBlock, current_trial_block_num= 0, experiment_has_been_finished = false
    //Call to continue to the next block of trials
    this.block_completed = function(){
        start_next_block()
    }

    this.storeTrialData = function(TrialData){
        BlockDataBuffer.push(JSON.parse(JSON.stringify(TrialData)))
        console.log(BlockDataBuffer)
    }

    function start_next_block(){
        //Store the data of the remaining block (if any is stored)
        if(BlockDataBuffer.length > 0){
            Data.Blocks.push({
                block_type: CurrentBlock.block_type,
                Trials: JSON.parse(JSON.stringify(BlockDataBuffer))
            })
            BlockDataBuffer = []
        }

        if(RemainingBlocks.length > 0){
            CurrentBlock = RemainingBlocks.shift()
            if(typeof CurrentBlock.Trials !== "undefined"){current_trial_block_num++}
            SC.start_next_block(CurrentBlock.block_type, CurrentBlock.Trials)
        }else{
            if(!experiment_has_been_finished){
                go_to_payment()
            }else{
                submit_data()
            }
        }
    }

    //Variable transfer functions
    //Returns an array containing the names of all boxes used during the experiment
    this.get_array_of_all_boxes_in_exp = function(){
        return(Stimuli.get_all_boxes_used_in_exp())
    }
    this.get_array_of_all_toys_in_exp = function(){
        return(Stimuli.get_all_toys_used_in_exp())
    }
    this.get_array_of_all_toys_in_public_phase = function(){
        return(Stimuli.get_all_toys_used_in_public_phase())
    }

    //Call to retrieve filled-in instruction texts
    this.get_instruction_text_object = function(screen_name){
        //Retrieving the raw title and text.
        let TextObj

        switch (screen_name){
            case("consent"): break;
            case("fullscreen"): TextObj = JSON.parse(JSON.stringify(Param.Instructions.Fullscreen_Prompt)); break;
            case("general_instructions"): TextObj = JSON.parse(JSON.stringify( Param.Instructions.Start ))
                break;
            case("public"): TextObj = JSON.parse(JSON.stringify( Param.Instructions.Public_information_initial));
                break;
            case("public_repeat"): TextObj = JSON.parse(JSON.stringify(Param.Instructions.Public_information_repeat))
                break;
            case("private"): TextObj = JSON.parse(JSON.stringify(Param.Instructions.Private_information_initial))
                break;
            case("private_repeat"):TextObj =JSON.parse(JSON.stringify( Param.Instructions.Private_information_repeat))
                break;
            case("questions"):TextObj = JSON.parse(JSON.stringify( Param.Instructions.Questions))
                break;
            case("payment"):TextObj = JSON.parse(JSON.stringify( Param.Instructions.Payment))
                break;
        }

        //Swapping out the variables in the text
        TextObj.title = swap_variables_in_text(TextObj.title)
        TextObj.text = swap_variables_in_text(TextObj.text)

        //Returning
        return(TextObj)
    }

    function swap_variables_in_text(string){
        let new_string = JSON.parse(JSON.stringify(string))

        new_string = new_string.replace("%EXPERIMENT_MEAN_TIME%", TimeAndEarnings.predicted_time)
        new_string = new_string.replace("%NUMBER_OF_BLOCKS%", Stimuli.get_number_of_trial_blocks)
        new_string = new_string.replace("%BONUS_CURRENCY_SYMBOL%", TimeAndEarnings.bonus_currency_symbol)
        new_string = new_string.replace("%MAX_BONUS_AMOUNT%", TimeAndEarnings.max_bonus)
        new_string = new_string.replace("%NUMBER_OF_BOXES%",Stimuli.get_number_of_boxes_used())
        new_string = new_string.replace("%BOXES_USED_STRING%",Stimuli.get_string_of_boxes_used())
        new_string = new_string.replace("%NUMBER_OF_PUBLIC_BLOCKS%", Stimuli.get_number_of_public_blocks)
        new_string = new_string.replace("%NUMBER_OF_PRIVATE_BLOCKS%", Stimuli.get_number_of_private_blocks)
        new_string = new_string.replace("%TRIALBLOCKNUM%", current_trial_block_num)
        new_string = new_string.replace("%BONUS_AMOUNT_PER_QUESTION%", TimeAndEarnings.bonus_per_correct_answer)
        new_string = new_string.replace("%BONUS_NUMBER_OF_QUESTIONS%", Stimuli.get_number_of_measurement_questions())

        //
        if(typeof PaymentData !== "undefined"){
            new_string = new_string.replace("%BONUS_QUESTIONS_CORRECT%", PaymentData.number_correct_answers)
            new_string = new_string.replace("%BONUS_TOTAL%", PaymentData.total_earnings)
            new_string = new_string.replace("%COMPLETION_CODE%", PaymentData.completion_code)
        }
        return(new_string)

    }

    //Call at the end of the experiment to go to the payment page
    function go_to_payment(){
        determine_payment()

        //Register that the experiment has been completed
        experiment_has_been_finished = true

        //Show the payment screen
        SC.show_payment_page()
    }

    //Call at the end of the questions block to determine payment
    function determine_payment(){
        PaymentData = {}

        //Finding the number of correctly answered questions...
        let correct_counter = 0
        //Find the block(s) with questions
        for(let b = 0;b<Data.Blocks.length; b++){
            if(Data.Blocks[b].block_type === "questions"){
                for(let q =0;q<Data.Blocks[b].Trials.length;q++){
                    if(Data.Blocks[b].Trials[q].correct_answer_given){
                        correct_counter++
                    }
                }
            }
        }

        PaymentData.number_correct_answers = correct_counter
        PaymentData.total_earnings = (correct_counter * TimeAndEarnings.bonus_per_correct_answer).toFixed(2)

        let cc_word_1 = shuffleArray(["Happy", "Bright", "Clean","Soft", "Funny", "Warm", "Sharp", "Small", "Kind", "Sweet", "Young", "White", "Tall"])[0]
        let cc_word_2 = shuffleArray(["Cat", "Rabbit", "Owl","Fox","Koala", "Frog", "Shark", "Zebra", "Bat", "Flower", "Panda", "Rose", "Poppy", "Lily", "Tulip"  ])[0]
        PaymentData.completion_code = cc_word_1 + cc_word_2 + correct_counter

        //Updating the payment data to the data store
        Data.Payment = PaymentData
        Data.exp_time = Date.now() - Data.start_time

        console.log(Data)
        console.log(PaymentData)

    }

    function submit_data(){
        //Updating the hidden form
        document.getElementById("data_form_field").innerHTML = JSON.stringify(Data)

        let alertmessage = "You are now submitting this page. After submitting you will not be able to go back. If you did not yet submit the completion code on Prolific, then please do so now! The completion code is: " + PaymentData.completion_code
        alert(alertmessage)

        //Submit after the alert
        document.getElementById("submitbutton").click()
    }

    start_next_block()


}

let RNG
let ExpCont = new ExperimentController()

console.log("A")