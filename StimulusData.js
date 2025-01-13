
StimulusData = function(RNG){
    //Defining the number of repeated public-information blocks
    let number_of_repeated_public_blocks = 3
    let number_of_repeated_private_blocks = 3

    //Defining all pairs. A pair can be: "similar-congruent","similar-incongruent", "dissimilar-congruent", "dissimilar-incongruent"
    // For each pair: first show a regular trial for the public information
    // The contents of the private information stage differ between the pair types
    //      For congruent pairs: the Fennimal takes the item from the box, plays with it, and then returns it to the box
    //      For the incongruent pairs: the Fennimal brings a new item, plays with it, and then swaps it out for the old item in the box
    //      For the similar pairs: the new Fennimal is the same as the old Fennimal.
    //      For the dissimilar pairs: the new Fennimal is different from the old Fennimal
    //let Pairs_Used_In_Experiment = ["similar-congruent","similar-incongruent", "dissimilar-congruent", "dissimilar-incongruent"]
    let Pairs_Used_In_Experiment = ["similar-incongruent",  "dissimilar-incongruent","similar-incongruent",  "dissimilar-incongruent"]

    //Getting all available boxes, items, locations, Fennimal heads and bodies
    let Available_Boxes = shuffleArray(Object.getOwnPropertyNames(Param.BoxDescriptions))
    let Available_Items = shuffleArray(Object.getOwnPropertyNames(Param.ItemData))
    let Available_Locations = shuffleArray(Object.getOwnPropertyNames(Param.LocationData))
    let Available_Bodies = shuffleArray(JSON.parse(JSON.stringify(Param.Included_Bodies)))
    let Available_Heads = shuffleArray(JSON.parse(JSON.stringify(Param.Included_Heads)))

    //BLOCK CREATION
    ///////////////////
    //Keeping track of which items are used
    let ItemsUsed = [], BoxesUsed = [], ItemsUsedPublic = []

    //Now we create the public information trials
    let PublicInformationTrials = []
    for(let pairnum = 0;pairnum< Pairs_Used_In_Experiment.length;pairnum++){
        //let head = Available_Heads.shift()
        //let name = Param.draw_unique_name_by_head(head)
        let location = Available_Locations.shift()
        let ItemObj = Param.ItemData[Available_Items.shift()]
        let box = Available_Boxes.shift()

        ItemsUsed.push(JSON.parse(JSON.stringify(ItemObj)))
        ItemsUsedPublic.push(JSON.parse(JSON.stringify(ItemObj)))
        BoxesUsed.push(JSON.parse(JSON.stringify(box)))

        let Trial = {
            trial_type: Pairs_Used_In_Experiment[pairnum],
            box: box,
            Fennimal: {
                //head: head,
                //body: Available_Bodies.shift(),
                name: name,
                location: location,
                ColorScheme: Param.LocationData[location].Fennimal_location_colors,
                seen_before:false
            },
            NewItem: ItemObj,
            ItemInBox: false,
        }
        Trial.Fennimal.body = Param.LocationData[Trial.Fennimal.location].preferredBodyType
        Trial.Fennimal.head = Param.LocationData[Trial.Fennimal.location].preferredHeadType
        Trial.Fennimal.name = Param.draw_unique_name_by_head(Trial.Fennimal.head)
        PublicInformationTrials.push(Trial)
    }

    //Repeated public information trials
    let RepeatedPublicInformationTrials = []
    for(let pairnum = 0;pairnum< Pairs_Used_In_Experiment.length;pairnum++){

        let Trial = {
            trial_type: Pairs_Used_In_Experiment[pairnum],
            box: PublicInformationTrials[pairnum].box,
            Fennimal: JSON.parse(JSON.stringify(PublicInformationTrials[pairnum].Fennimal)),
            NewItem: false,
            ItemInBox: PublicInformationTrials[pairnum].NewItem,
        }
        Trial.Fennimal.seen_before = true
        RepeatedPublicInformationTrials.push(Trial)
    }

    //Creating the private information trials
    let PrivateInformationTrials = []
    for(let pairnum = 0;pairnum< Pairs_Used_In_Experiment.length;pairnum++){
       //What we do next depends on the trial type.
        let trialtype = Pairs_Used_In_Experiment[pairnum]
        //For similar trials, we copy the Fennimal from the partnered public trial. For dissimilar ones, we create a new one.
        let Fennimal
        if(trialtype === "similar-congruent" || trialtype==="similar-incongruent"){
            Fennimal = JSON.parse(JSON.stringify(PublicInformationTrials[pairnum].Fennimal))
            Fennimal.seen_before= true
        }
        else{
            //let head = Available_Heads.shift()
            //let name = Param.draw_unique_name_by_head(head)
            let location = Available_Locations.shift()
            Fennimal = {
                //head: head,
                //body: Available_Bodies.shift(),
                //name: name,
                location: location,
                ColorScheme: Param.LocationData[location].Fennimal_location_colors,
                seen_before: false
            }
            Fennimal.body = Param.LocationData[Fennimal.location].preferredBodyType
            Fennimal.head = Param.LocationData[Fennimal.location].preferredHeadType
            Fennimal.name = Param.draw_unique_name_by_head(Fennimal.head)
        }

        //For the congruent items, the Fennimal does not bring a new item. For incongruent pairs, the Fennimal brings a new item.
        let NewItem = false
        if(trialtype ==="similar-incongruent" ||  trialtype ==="dissimilar-incongruent" ){
            NewItem = Param.ItemData[Available_Items.shift()]
            ItemsUsed.push(JSON.parse(JSON.stringify(NewItem)))
        }

        let Trial = {
            trial_type: Pairs_Used_In_Experiment[pairnum],
            box: PublicInformationTrials[pairnum].box,
            Fennimal: Fennimal,
            ItemInBox: PublicInformationTrials[pairnum].NewItem,
            NewItem: NewItem
        }
        PrivateInformationTrials.push(Trial)
    }

    //Repeated private information trials
    let RepeatedPrivateInformationTrials = []
    for(let pairnum = 0;pairnum< Pairs_Used_In_Experiment.length;pairnum++){
        let Item
        if(PrivateInformationTrials[pairnum].NewItem !== false){
            Item = PrivateInformationTrials[pairnum].NewItem
        }else{
            Item = PrivateInformationTrials[pairnum].ItemInBox
        }

        let Trial = {
            trial_type: Pairs_Used_In_Experiment[pairnum],
            box: PrivateInformationTrials[pairnum].box,
            Fennimal: JSON.parse(JSON.stringify(PrivateInformationTrials[pairnum].Fennimal)),
            NewItem: false,
            ItemInBox: Item,
        }
        Trial.Fennimal.seen_before = true
        RepeatedPrivateInformationTrials.push(Trial)
    }

    //Creating the questions. As a cue, provide them with the PRIVATE phase Fennimal.
    let QuestionBlockSelf = []
    let QuestionBlockOther = []

    for(let pairnum = 0; pairnum<Pairs_Used_In_Experiment.length; pairnum++){
        let correct_answer_self
        let correct_answer_other
        let trialtype = Pairs_Used_In_Experiment[pairnum]

        if(trialtype === "dissimilar_incongruent" || trialtype === "similar_incongruent"){
            correct_answer_self = PrivateInformationTrials[pairnum].NewItem.name
            correct_answer_other = PublicInformationTrials[pairnum].NewItem.name
        }else{
            //TODO: double check these in the future (not in use now...)
            console.warn("WARNING: CHECK CODE")
            correct_answer_self = PrivateInformationTrials[pairnum].NewItem.name
            correct_answer_other = PublicInformationTrials[pairnum].NewItem.name
        }

        QuestionBlockSelf.push({
            trial_type: Pairs_Used_In_Experiment[pairnum],
            box: PrivateInformationTrials[pairnum].box,
            qtype: "self",
            //ItemArr: shuffleArray(JSON.parse(JSON.stringify(ItemsUsed))),
            correct_answer: correct_answer_self,
            Fennimal: JSON.parse(JSON.stringify(PrivateInformationTrials[pairnum].Fennimal))
        })
        QuestionBlockOther.push({
            trial_type: Pairs_Used_In_Experiment[pairnum],
            box: PublicInformationTrials[pairnum].box,
            qtype: "other",
            //ItemArr: shuffleArray(JSON.parse(JSON.stringify(ItemsUsed))),
            correct_answer: correct_answer_other,
            Fennimal: JSON.parse(JSON.stringify(PrivateInformationTrials[pairnum].Fennimal)),
            NewItem: false,
            ItemInBox: PublicInformationTrials[pairnum].NewItem,

        })

    }

    //Questions trials will start with the other-questions (random order), followed by the true state (random order)
    let QuestionTrials = [shuffleArray(JSON.parse(JSON.stringify(QuestionBlockOther))),shuffleArray(JSON.parse(JSON.stringify(QuestionBlockSelf)))].flat()
    //let QuestionTrials = [shuffleArray(JSON.parse(JSON.stringify(QuestionBlockOther)))].flat()

    // COMPILING ALL THE BLOCKS HERE
    ////////////////////////////////////
    //Now we can create all the blocks. This will be an array of objects
    let ExperimentBlocks = []

    //ExperimentBlocks.push({
    //    block_type: "consent",
    //})


    ExperimentBlocks.push({
        block_type: "fullscreen",
    })

    ExperimentBlocks.push({
        block_type: "general_instructions",
    })



    //Adding public block
    ExperimentBlocks.push({
        block_type: "public",
        Trials: shuffleArray(JSON.parse(JSON.stringify(PublicInformationTrials)))
    })

    //Adding the repetition blocks here
    for(let i =0;i<number_of_repeated_public_blocks; i++){
        ExperimentBlocks.push({
            block_type: "public_repeat",
            repetition_num: i,
            Trials: shuffleArray(JSON.parse(JSON.stringify(RepeatedPublicInformationTrials)))
        })
    }

    //Adding private block(s)
    ExperimentBlocks.push({
        block_type: "private",
        Trials: shuffleArray(JSON.parse(JSON.stringify(PrivateInformationTrials)))
    })
    for(let i =0;i<number_of_repeated_private_blocks; i++){
        ExperimentBlocks.push({
            block_type: "private_repeat",
            repetition_num: i,
            Trials: shuffleArray(JSON.parse(JSON.stringify(RepeatedPrivateInformationTrials)))
        })
    }

    //Adding the block of measurement trials.
    ExperimentBlocks.push({
        block_type: "questions",
        Trials: QuestionTrials
    })



    //RETRIEVAL FUNCTIONS
    ///////////////////////
    //Retrieved a copy of the Experiment stimuli
    this.get_block_data = function(){
        return(JSON.parse(JSON.stringify(ExperimentBlocks)))
    }

    this.get_string_of_boxes_used = function(){
        let string = ""
        for(let i = 0;i<BoxesUsed.length;i++){
            if(i < BoxesUsed.length - 1){
                string = string + "a " + Param.BoxDescriptions[BoxesUsed[i]] + ", "
            }else{
                //last element
                string = string + "and a " + Param.BoxDescriptions[BoxesUsed[i]]
            }
        }
        return(string)

    }

    this.get_number_of_boxes_used = function(){
        return(BoxesUsed.length)
    }

    //Returns the number of TRIAL BLOCKS any blocks wich has trials - thus ignoring text-only blocks
    this.get_number_of_trial_blocks = function(){
        let counter = 0
        for(let i =0;i<ExperimentBlocks.length;i++){
            if(typeof ExperimentBlocks[i].Trials !== "undefined"){
                counter ++
            }
        }
        return counter
    }

    this.get_number_of_measurement_questions = function(){
        return(QuestionTrials.length)
    }

    this.get_number_of_public_blocks = function(){
        return (number_of_repeated_public_blocks + 1)
    }

    this.get_number_of_private_blocks = function(){
        return (number_of_repeated_private_blocks + 1)
    }

    //Returns a copy of the array of all boxes used
    this.get_all_boxes_used_in_exp = function(){
        return(JSON.parse(JSON.stringify(BoxesUsed)))
    }

    //Returns a copy of the array of all items used
    this.get_all_toys_used_in_exp = function(){
        return(JSON.parse(JSON.stringify(ItemsUsed)))
    }

    //Returns a copy of the array of all items used during the public trials
    this.get_all_toys_used_in_public_phase = function(){
        return(JSON.parse(JSON.stringify(ItemsUsedPublic)))
    }


}
