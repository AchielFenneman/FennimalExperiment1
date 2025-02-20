console.warn("RUNNING STIMULUS DATA")

STIMULUSDATA = function(exp_code){
    // SUPPORTING FUNCTIONS
    ////////////////////////
    function generate_item_details(Items_Used){
        //Location on screen ranges from 1 - N
        let Background_Colors = Param.ItemBackgroundColors[Items_Used.length]

        let LocationArr = []
        for(let i =0; i<Items_Used.length;i++){
            LocationArr.push(i+1)
        }
        shuffleArray(LocationArr)

        let ItemObj = {All_Items: Items_Used}
        for(let i =0;i<Items_Used.length;i++){
            ItemObj[Items_Used[i]] = {
                //location_on_screen: LocationArr[i],
                backgroundColor: Background_Colors[i]
            }
        }
        return(ItemObj)
    }
    function createTrainingFennimalObj(ID, region, location, head, _optional_body, ItemResponseArr, _optional_ColorScheme){
        let FenObj = {
            ID: ID,
            region: region,
            location: location,
            head: head,
        }

        //If a body has been defined, add it to the object here. If not, then use the default optio: base body on region
        if(_optional_body !== false){
            FenObj.body = _optional_body
        }else{
            FenObj.body = Param.RegionData[region].preferredBodyType
        }

        //If a colorscheme has been defined, add it to the object here. If not, default to the region-specific head and body color schemes
        if(_optional_ColorScheme === false){
            //No custom color scheme requested. Use the region-based color scheme instead.
            FenObj.head_color_scheme = JSON.parse(JSON.stringify(Param.RegionData[region].Fennimal_location_colors))
            FenObj.body_color_scheme = JSON.parse(JSON.stringify(Param.RegionData[region].Fennimal_location_colors))


        }else{
            if(_optional_ColorScheme.length === 2){
                //Different colorschemes for head and body
                FenObj.head_color_scheme = _optional_ColorScheme[0]
                FenObj.body_color_scheme = _optional_ColorScheme[1]
            }else{
                //The custom color scheme can be gray.
                if(_optional_ColorScheme === "gray"){
                    FenObj.head_color_scheme = Param.GrayColorScheme
                    FenObj.body_color_scheme = Param.GrayColorScheme
                }else{
                    //A color object has been supplied. Apply it to both the head and body.
                    FenObj.head_color_scheme = _optional_ColorScheme
                    FenObj.body_color_scheme = _optional_ColorScheme

                }
            }
        }

        //If any item preferences are given, set them here. Otherwise, all items will default to unavailable. If only one item is given, this will be recorded as a "special item" (used to train)
        if(ItemResponseArr !== false){
            let special_item_candidates = []
            if(Array.isArray(ItemResponseArr)){
                let ItemResponseMap = {}
                for(let i=0;i<All_Items.length; i++){
                    ItemResponseMap[All_Items[i]] = "unavailable"
                }

                for(let i=0;i<ItemResponseArr.length;i++){
                    ItemResponseMap[ItemResponseArr[i][0]] = ItemResponseArr[i][1]
                    special_item_candidates.push(ItemResponseArr[i][0])
                }
                FenObj.ItemResponses = ItemResponseMap
                if(special_item_candidates.length === 1){
                    FenObj.special_item = special_item_candidates[0]
                }
            }
        }

        switch(Param.namingscheme){
            case("region_head"):
                FenObj.name = createConjunctiveNameRegionHead(FenObj.region,FenObj.head);
                break
            case("body_head"):
                FenObj.name = createConjunctiveNameHeadBody(FenObj.body,FenObj.head)
                break
            case("unique"):
                FenObj.name = Param.draw_unique_name()
                break
            case("unique_per_head"):
                FenObj.name = Param.draw_unique_name_by_head(head)
                break
            case("unique_per_region"):
                FenObj.name = Param.draw_unique_name_by_region(region)
                break
            case("unique_combo"):
                FenObj.name = Param.draw_unique_compound_name(region,head)
        }

        return(FenObj)
    }

    function createTestFennimalObj(ID, region, location, head, _optional_body, ItemResponseArr, _optional_ColorScheme, cued_item, search_item, TestPhaseRules){
        let FenObj = createTrainingFennimalObj(ID, region, location, head, _optional_body, ItemResponseArr, _optional_ColorScheme)
        FenObj.cued_item = cued_item
        FenObj.search_item = search_item
        FenObj.TestPhaseRules = TestPhaseRules

        //If requested, change the name of these Fennimals to be based on their location
        let set_unique_name = false
        if(typeof TestPhaseRules.unique_name !== "undefined"){
            set_unique_name = TestPhaseRules.unique_name
        }

        if(set_unique_name){
            if(typeof TestPhaseRules.name_based_on_location !== "undefined"){
                if(TestPhaseRules.name_based_on_location){
                    FenObj.name = createConjunctiveNameLocationHead(FenObj.location, FenObj.head)
                }
            }
        }else{
            FenObj.name = false
        }

        //For the test phase, all items may be set to available (changes will be made by the FennimalController later on). If no valence assigned, assume unavailable
        if(ItemResponseArr !== false){
            let special_item_candidates = []
            if(Array.isArray(ItemResponseArr)){
                let ItemResponseMap = {}
                for(let i=0;i<All_Items.length; i++){
                    ItemResponseMap[All_Items[i]] = "unavailable"
                }

                for(let i=0;i<ItemResponseArr.length;i++){
                    ItemResponseMap[ItemResponseArr[i][0]] = ItemResponseArr[i][1]
                    special_item_candidates.push(ItemResponseArr[i][0])
                }
                FenObj.ItemResponses = ItemResponseMap
                if(special_item_candidates.length === 1){
                    FenObj.special_item = special_item_candidates[0]
                }
            }
        }



        return(FenObj)
    }

    //Here we define the different experiment structures
    let TrainingFennimals, SearchPhaseSetup, Item_Details, All_Items

    //Call with the templates to define the locations. Returns an object with two keys: UnusedRegions (array), and RegionLoocationCodes (object)
    let determine_experiment_locations = function(TrainingTemplates, SearchPhaseBlockTemplates){

        let AvailableRegions = [shuffleArray(["Desert", "North", "Village", "Jungle"]), shuffleArray(["Mountains", "Beach", "Flowerfields", "Swamp"])].flat()

        let RegionLocationCodes = {}
        for(let i =0;i<TrainingTemplates.length;i++){
            if(typeof RegionLocationCodes[TrainingTemplates[i].region] === "undefined"){
                RegionLocationCodes[TrainingTemplates[i].region] = {region: AvailableRegions.shift(), training_phase_count: 1}
            }else{
                RegionLocationCodes[TrainingTemplates[i].region].training_phase_count++
            }
        }

        //Assigning regions and figuring out the number of locations visited in each region
        for(let i =0;i<SearchPhaseBlockTemplates.length;i++){
            let region = SearchPhaseBlockTemplates[i].region
            if(typeof RegionLocationCodes[region] === "undefined"){
                //This region has not been used in the training phase.
                RegionLocationCodes[region] = {region: AvailableRegions.shift(), search_phase_count: 1}
            }else{
                //This region has been used in the training phase.
                if(typeof RegionLocationCodes[region].search_phase_count === "undefined"){
                    RegionLocationCodes[region].search_phase_count = 1
                }else{
                    RegionLocationCodes[region].search_phase_count++
                }
            }
        }

        for(let key in RegionLocationCodes){
            let region = RegionLocationCodes[key].region

            if(typeof RegionLocationCodes[key].training_phase_count === "undefined"){
                // No training phase locations used
                if(typeof RegionLocationCodes[key].search_phase_count !== "undefined"){
                    if(RegionLocationCodes[key].search_phase_count === 1){
                        //Use preferred for search
                        RegionLocationCodes[key].search_locations = JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[1]))
                    }
                    if(RegionLocationCodes[key].search_phase_count === 2){
                        RegionLocationCodes[key].search_locations = shuffleArray(JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[2])))
                    }
                    if(RegionLocationCodes[key].search_phase_count === 3){
                        // Use all three locations for search
                        RegionLocationCodes[key].search_locations = shuffleArray(JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3])))
                    }
                }

            }else{
                if(RegionLocationCodes[key].training_phase_count === 1){
                    //Only a single training-phase location
                    if(typeof RegionLocationCodes[key].search_phase_count !== "undefined"){
                        if(RegionLocationCodes[key].search_phase_count === 1){
                            //Use the same (preferred) location for both training and search
                            RegionLocationCodes[key].training_locations = JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[1]))
                            RegionLocationCodes[key].search_locations = JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[1]))
                        }
                        if(RegionLocationCodes[key].search_phase_count === 2){
                            //Center location for training, both sides for search
                            RegionLocationCodes[key].search_locations = shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[2] )))
                            RegionLocationCodes[key].training_locations = JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3])).filter(x => !RegionLocationCodes[key].search_locations.includes(x))
                        }
                        if(RegionLocationCodes[key].search_phase_count === 3){
                            //Center location for training, all locations for search. This is not optimal and will need to be hardcoded...
                            RegionLocationCodes[key].training_locations = [JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3][0]))]
                            RegionLocationCodes[key].search_locations = shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[region].Locations )))
                        }
                    }else{
                        //Only used during training phase.
                        RegionLocationCodes[key].training_locations = JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[1]))
                    }
                }else{
                    if(RegionLocationCodes[key].training_phase_count === 2){
                        //Two training phase locations: use the sides for the training phase, center for the search phase.
                        RegionLocationCodes[key].training_locations = shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[2])) )
                        RegionLocationCodes[key].search_locations = JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3])).filter(x => !RegionLocationCodes[key].training_locations.includes(x))
                    }else{
                        // Three training phase locations for one region. For the CENTRALITY experiment, we have an additional requirement here: the first listed template should be in the MIDDLE position. So we don't need to shuffle the Regiondata
                        RegionLocationCodes[key].training_locations =  JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3] ))
                        //RegionLocationCodes[key].training_locations = shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3] )))
                        RegionLocationCodes[key].search_locations = shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3] )))
                    }
                }
            }
        }
        return({UnusedRegions:AvailableRegions, RegionLocationCodes: RegionLocationCodes})

    }

    let determine_head_codes = function(TrainingTemplates, SearchPhaseBlockTemplates){
        let Available_Heads  = shuffleArray(["C", "E", "I",  "B", "N", "K"]) //"K", "G", "D
        let HeadCodes = {}
        for(let i =0;i<TrainingTemplates.length;i++){
            let headcode = TrainingTemplates[i].head
            if(typeof HeadCodes[headcode] === "undefined"){
                HeadCodes[headcode] = Available_Heads.shift()
            }
        }
        for(let i =0;i<SearchPhaseBlockTemplates.length;i++){
            let headcode = SearchPhaseBlockTemplates[i].head
            if(typeof HeadCodes[headcode] === "undefined"){
                HeadCodes[headcode] = Available_Heads.shift()
            }
        }
        return({UnusedHeads: Available_Heads, HeadCodes: HeadCodes})
    }

    let determine_item_codes = function(TrainingTemplates, SearchPhaseBlockTemplates){
        let ItemCodes= {}
        for(let i =0;i<TrainingTemplates.length;i++){
            let itemcode = TrainingTemplates[i].special_item
            if(typeof ItemCodes[itemcode] === "undefined"){
                ItemCodes[itemcode] = false
            }
        }
        for(let i =0;i<SearchPhaseBlockTemplates.length;i++){
            let itemresponses = SearchPhaseBlockTemplates[i].ItemResponses
            for(let item in itemresponses){
                if(typeof ItemCodes[item] === "undefined"){
                    ItemCodes[item] = false
                    console.warn("WARNING: some items only used during search, not training. Double check if this is correct")
                }
            }
        }

        //Creating Item details and defining All_Items
        Item_Details = generate_item_details(drawRandomElementsFromArray(Param.Available_items, Object.keys(ItemCodes).length, false ))
        All_Items = shuffleArray(JSON.parse(JSON.stringify(Item_Details.All_Items)))

        //Assigning to keys
        for(let i=0;i<Object.keys(ItemCodes).length;i++){
            ItemCodes[Object.keys(ItemCodes)[i]] = All_Items[i]
        }

        return(ItemCodes)

    }

    let create_search_phase_single_block_order_array = function(SearchPhaseBlockTrials){
        let trial_types = []
        let all_indicides = []
        for(let i =0;i<SearchPhaseBlockTrials.length;i++){
            if(SearchPhaseBlockTrials[i].ID.includes("key")){
                trial_types.push("key")
            }else{
                trial_types.push("other")
            }
            all_indicides.push(i)
        }

        let valid_order_found = false
        let ordering = []

        while(! valid_order_found){
            //Creating a random order of trials
            ordering = shuffleArray(all_indicides)

            //Now we check if there are ever any two key trials in a row. If not, then we have found a good ordering!
            let previous_type = trial_types[ordering[0]]
            valid_order_found = true
            for(let i=1;i<ordering.length; i++){
                if(previous_type === "key" &&  trial_types[ordering[i]] === "key"){
                    valid_order_found = false
                    break;
                }
                previous_type = trial_types[ordering[i]]
            }
        }

        let BlockArr = []
        for(let i =0;i<ordering.length;i++){
            BlockArr.push(SearchPhaseBlockTrials[ordering[i]])
        }
        return(BlockArr)
    }

    //Given Training and SearchBlock Templates and a number of repeated search phase blocks, sets the TrainingFennimals and the SearchPhaseSetup (defining the experiment)
    let set_stimuli_for_basic_experiment_single_block = function(TrainingTemplates,SearchPhaseBlockTemplates, ask_follow_up_in_first_occurence_only, unique_names_for_search_phase){
        number_of_search_blocks_in_experiment = 1

        // If the naming scheme is based on unique names, then give the corresponding array in Parameters a shuffle
        if(Param.namingscheme === "unique"){
            Param.shuffle_unique_names()
        }

        //ASSIGNING REGIONS AND LOCATIONS
        //////////////////////////////////
        let RegionUsage = determine_experiment_locations(TrainingTemplates, SearchPhaseBlockTemplates)
        let AvailableRegions = RegionUsage.UnusedRegions
        let RegionLocationCodes = RegionUsage.RegionLocationCodes

        //ASSIGNING HEADS
        //////////////////
        //Shuffle heads
        let HeadCodesObj = determine_head_codes(TrainingTemplates,SearchPhaseBlockTemplates)
        let HeadCodes = HeadCodesObj.HeadCodes

        //ASSIGNING ITEMS
        //////////////////
        //Searching for all item codes
        let ItemCodes = determine_item_codes(TrainingTemplates,SearchPhaseBlockTemplates)

        //CREATING TRAINING PHASE OBJECTS
        //////////////////////////////////
        TrainingFennimals = {}
        for(let i=0; i<TrainingTemplates.length;i++){
            let Temp = TrainingTemplates[i]

            //Create item response array with the correct items
            let IRA = [ [ItemCodes[Temp.special_item], Temp.outcome]]
            TrainingFennimals[Temp.ID] = createTrainingFennimalObj(Temp.ID, RegionLocationCodes[Temp.region].region, RegionLocationCodes[Temp.region].training_locations.shift(), HeadCodes[Temp.head], false, IRA,false)
        }

        //If specified in param, we may need to change the tertiary colors of some Fennimals.
        //  Specifically: if the templates contain the property "borrowed_tertiary_color", then:
        //      If this is set to false, use the normal tertiary (NOT CONTRAST) color of the region.
        //      If this has a value equal to the ID of a Fennimal, then take the normal tertiary (NOT CONTRAST) color of this Fennimal's region
        let Unused_Regions_Used_For_Drawing_Unassigned_Colors = JSON.parse(JSON.stringify(AvailableRegions))
        let find_head_color = function(IDcode){
            //First figure out if the target color is an actual training-phase Fennimal. If it is, select these colors.
            //If it is not, then select the colors from an empty region (if available) or set to gray otherwise.
            if(typeof TrainingFennimals[IDcode] !== "undefined"){
                return(Param.RegionData[TrainingFennimals[IDcode].region].Fennimal_location_colors.tertiary_color)
            }else{
                //If the current code is not a Fennimal, then try to check if its a valid color string.
                if(isColor(IDcode)){
                    return(IDcode)
                }else{
                    //So we want to have a special color here, but the target is not defined and the input is not a color name.
                    //  In this case, we first try to select a tertiary color from one of the unused regions.
                    //      If these are not available (or have been used for other Fennimals with an unspecified color-scheme already), then make this region gray.
                    //      Also throw a warning, as this may or may not be intended
                    if(Unused_Regions_Used_For_Drawing_Unassigned_Colors.length > 0){
                        return(Param.RegionData[Unused_Regions_Used_For_Drawing_Unassigned_Colors.shift()].Fennimal_location_colors.tertiary_color)
                    }else{
                        //Set to gray and throw a warning
                        console.warn("WARNING: ASSIGNING GRAY AS TERTIARY COLOR TO FENNIMAL HEAD. IS THIS INTENDED BEHAVIOR?")
                        return("gray")
                    }
                }
            }
        }

        for(let i=0; i<TrainingTemplates.length;i++){
            let Template = TrainingTemplates[i]

            //Find the contrast color for this Fennimal, and use it to define the tertiary color of the body.
            let contrast_color = Param.RegionData[TrainingFennimals[Template.ID].region].contrast_color
            TrainingFennimals[Template.ID].body_color_scheme.tertiary_color = contrast_color

            if(typeof Template.borrowed_tertiary_color !== "undefined"){
                //For the head: take the tertiary color of the target Fennimal. If the value is false, then just keep it as the original color-scheme.
                if(Template.borrowed_tertiary_color !== false){
                    TrainingFennimals[Template.ID].head_color_scheme.tertiary_color = find_head_color(Template.borrowed_tertiary_color)
                }
            }else{
                TrainingFennimals[Template.ID].head_color_scheme.tertiary_color = contrast_color
            }
        }

        //DEFINING SEARCH PHASE STIMULI
        //////////////////////////////////
        //Setting the search phase rules
        let SearchPhaseRules_search = {
            hidden_feedback: true,
            cued_item_allowed: true,
            search_item_allowed: true,
            name_based_on_location: false,
            unique_name: unique_names_for_search_phase,
            ask_confidence: true,
            ask_decision_style: true,
            ask_follow_up_question: !ask_follow_up_in_first_occurence_only //If we ask in first only, then first set all to false (we will modify the correct ones later)
        }

        let SearchPhaseRules_repeat = {
            hidden_feedback: true,
            cued_item_allowed: true,
            search_item_allowed: true,
            is_repeat_trial: true
        }

        let SearchPhaseBlockTrials = []
        for(let i =0;i<SearchPhaseBlockTemplates.length;i++){
            let Temp = SearchPhaseBlockTemplates[i]
            let IRA = []
            for(let item in Temp.ItemResponses){
                IRA.push(  [ItemCodes[item], Temp.ItemResponses[item]] )
            }
            SearchPhaseBlockTrials.push(createTestFennimalObj(Temp.ID, RegionLocationCodes[Temp.region]. region, RegionLocationCodes[Temp.region].search_locations.shift(), HeadCodes[Temp.head], false, IRA,false, false, false,JSON.parse(JSON.stringify(SearchPhaseRules_search))))
        }

        // CHANGING THE CONTRAST / TERTIARY COLOR FOR THE SEARCH PHASE STIMULI
        for(let i =0;i<SearchPhaseBlockTemplates.length;i++){
            let Template = SearchPhaseBlockTemplates[i]

            //Find the contrast color for this Fennimal, and use it to define the tertiary color of the body.
            let contrast_color = Param.RegionData[SearchPhaseBlockTrials[i].region].contrast_color
            SearchPhaseBlockTrials[i].body_color_scheme.tertiary_color = contrast_color

            if(typeof Template.borrowed_tertiary_color !== "undefined"){
                //For the head: take the tertiary color of the target Fennimal. If the value is false, then just keep it as the original color-scheme.
                if(Template.borrowed_tertiary_color !== false){
                    SearchPhaseBlockTrials[i].head_color_scheme.tertiary_color = find_head_color(Template.borrowed_tertiary_color)
                }
            }else{
                SearchPhaseBlockTrials[i].head_color_scheme.tertiary_color = contrast_color
            }
        }

        let RepeatBlockTrials = []
        for(let i = 0;i<TrainingTemplates.length;i++){
            let Temp = TrainingTemplates[i]
            let FenObj = TrainingFennimals[Temp.ID]

            //Create item response array with the correct items
            let IRA = []
            let special_item
            for(let itemcode in ItemCodes){
                if(itemcode === Temp.special_item){
                    special_item = [ItemCodes[itemcode]][0]
                    IRA.push(  [ItemCodes[itemcode], "correct"] )
                }else{
                    IRA.push(  [ItemCodes[itemcode], "incorrect"] )
                }


            }

            let NewFen = createTestFennimalObj("Repeat" + Temp.ID, FenObj.region, FenObj.location,FenObj.head,FenObj.body,IRA, false,special_item,false,SearchPhaseRules_repeat )

            //Copy the name from the original Fennimal
            NewFen.name = FenObj.name

            //Copy the color-schemes from the original Fennimal
            NewFen.body_color_scheme = FenObj.body_color_scheme
            NewFen.head_color_scheme = FenObj.head_color_scheme

            RepeatBlockTrials.push(NewFen)

        }

        //Determining trials for the search block. Assuming that the trials can either be key or distractor, here we sample such that no two key trials occur in a row.
        SearchPhaseBlockTrials = create_search_phase_single_block_order_array(SearchPhaseBlockTrials)

        let SearchBlockObj = {
            Trials: SearchPhaseBlockTrials,
            hint_type: "location",
            type: "search_unique", //The unique part lets the instructions controller know to expect only a single block of search trials.
            Rules: JSON.parse(JSON.stringify(SearchPhaseRules_search))
        }

        //Determining when to ask follow-up question at the end
        if(ask_follow_up_in_first_occurence_only){
            //First: find the first occurences of both the key trials and other trials
            let first_key_trial_index = false
            let first_other_trial_index = false

            for(let i = 0;i<SearchBlockObj.Trials.length;i++){
                if(SearchBlockObj.Trials[i].ID.includes("key")){
                    if(first_key_trial_index === false){
                        first_key_trial_index = i
                    }
                }else{
                    if(first_other_trial_index === false){
                        first_other_trial_index = i
                    }
                }
            }

            //Now we modify the rules for these two entries
            SearchBlockObj.Trials[first_key_trial_index].TestPhaseRules.ask_follow_up_question = true
            SearchBlockObj.Trials[first_other_trial_index].TestPhaseRules.ask_follow_up_question = true
        }

        SearchPhaseSetup = [SearchBlockObj]

        //Adding the recall question
        SearchPhaseSetup.push({type:"recall_task"})

        //Adding the repeat trials at the end
        SearchPhaseSetup.push({
            Trials:shuffleArray(JSON.parse(JSON.stringify(RepeatBlockTrials))),
            hint_type: "location",
            type: "repeat",
            Rules: SearchPhaseRules_repeat
        })

        let url = new URL(window.location);
        if(url.searchParams.get("PROLIFIC_PID") === null){
            console.log(TrainingFennimals)
            console.log(SearchPhaseSetup)
        }



    }

    let set_stimuli_for_basic_experiment_multiple_blocks = function(TrainingTemplates,SearchPhaseBlockTemplates, number_search_blocks, follow_up_question_asked_in_blocks){
        number_of_search_blocks_in_experiment = number_search_blocks
        // If set to true, then the test phase Fennimals have names based on their LOCATION (not region)
        let search_phase_Fennimals_name_based_on_location = false

        // If the naming scheme is based on unique names, then give the corresponding array in Parameters a shuffle
        if(Param.namingscheme === "unique"){
            Param.shuffle_unique_names()
        }

        //ASSIGNING REGIONS AND LOCATIONS
        //////////////////////////////////
        let AvailableRegions = [shuffleArray(["Desert", "North", "Village", "Jungle"]), shuffleArray(["Mountains", "Beach", "Flowerfields", "Swamp"])].flat()

        //Finding out the count by which there are different locations within each region during the training phase
        let RegionLocationCodes = {}
        for(let i =0;i<TrainingTemplates.length;i++){
            if(typeof RegionLocationCodes[TrainingTemplates[i].region] === "undefined"){
                RegionLocationCodes[TrainingTemplates[i].region] = {region: AvailableRegions.shift(), training_phase_count: 1}
            }else{
                RegionLocationCodes[TrainingTemplates[i].region].training_phase_count++
            }
        }

        //Assigning regions and figuring out the number of locations visited in each region
        for(let i =0;i<SearchPhaseBlockTemplates.length;i++){
            let region = SearchPhaseBlockTemplates[i].region
            if(typeof RegionLocationCodes[region] === "undefined"){
                //This region has not been used in the training phase.
                RegionLocationCodes[region] = {region: AvailableRegions.shift(), search_phase_count: 1}
            }else{
                //This region has been used in the training phase.
                if(typeof RegionLocationCodes[region].search_phase_count === "undefined"){
                    RegionLocationCodes[region].search_phase_count = 1
                }else{
                    RegionLocationCodes[region].search_phase_count++
                }
            }
        }

        //Now that we have a count, we can start adding in locations. This takes a bit of logic.... Once these are determined, we have two arrays (one for training, one for test), which can be shifted when assigning later.
        for(let key in RegionLocationCodes){
            let region = RegionLocationCodes[key].region

            if(typeof RegionLocationCodes[key].training_phase_count === "undefined"){
                // No training phase locations used
                if(typeof RegionLocationCodes[key].search_phase_count !== "undefined"){
                    if(RegionLocationCodes[key].search_phase_count === 1){
                        //Use preferred for search
                        RegionLocationCodes[key].search_locations = JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[1]))
                    }
                    if(RegionLocationCodes[key].search_phase_count === 2){
                        RegionLocationCodes[key].search_locations = shuffleArray(JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[2])))
                    }
                    if(RegionLocationCodes[key].search_phase_count === 3){
                        // Use all three locations for search
                        RegionLocationCodes[key].search_locations = shuffleArray(JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3])))
                    }
                }

            }else{
                if(RegionLocationCodes[key].training_phase_count === 1){
                    //Only a single training-phase location
                    if(typeof RegionLocationCodes[key].search_phase_count !== "undefined"){
                        if(RegionLocationCodes[key].search_phase_count === 1){
                            //Use the same (preferred) location for both training and search
                            RegionLocationCodes[key].training_locations = JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[1]))
                            RegionLocationCodes[key].search_locations = JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[1]))
                        }
                        if(RegionLocationCodes[key].search_phase_count === 2){
                            //Center location for training, both sides for search
                            RegionLocationCodes[key].search_locations = shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[2] )))
                            RegionLocationCodes[key].training_locations = JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3])).filter(x => !RegionLocationCodes[key].search_locations.includes(x))
                        }
                        if(RegionLocationCodes[key].search_phase_count === 3){
                            //Center location for training, random allocation for search. This is not optimal and will need to be hardcoded...
                            console.error("WARNING: WEIRD SPECIFICATION FOR THE TRAINING AND SEARCH REGIONS. RETHINK DESIGN OR HARDCODE...")
                        }
                    }else{
                        //Only used during training phase.
                        RegionLocationCodes[key].training_locations = JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[1]))
                    }
                }else{
                    if(RegionLocationCodes[key].training_phase_count === 2){
                        //Two training phase locations: use the sides for the training phase, center for the search phase.
                        RegionLocationCodes[key].training_locations = shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[2])) )
                        RegionLocationCodes[key].search_locations = JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3])).filter(x => !RegionLocationCodes[key].training_locations.includes(x))
                    }else{
                        // Three training phase locations for one region. For the CENTRALITY experiment, we have an additional requirement here: the first listed template should be in the MIDDLE position. So we don't need to shuffle the Regiondata
                        RegionLocationCodes[key].training_locations =  JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3] ))
                        //RegionLocationCodes[key].training_locations = shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3] )))
                        RegionLocationCodes[key].search_locations = shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[region].Location_selection_order[3] )))
                    }
                }
            }
        }

        //ASSIGNING HEADS
        //////////////////
        //Shuffle heads
        let Available_Heads  = shuffleArray(["C", "E", "I",  "B", "N", "K"]) //"K", "G", "D
        let HeadCodes = {}
        for(let i =0;i<TrainingTemplates.length;i++){
            let headcode = TrainingTemplates[i].head
            if(typeof HeadCodes[headcode] === "undefined"){
                HeadCodes[headcode] = Available_Heads.shift()
            }
        }
        for(let i =0;i<SearchPhaseBlockTemplates.length;i++){
            let headcode = SearchPhaseBlockTemplates[i].head
            if(typeof HeadCodes[headcode] === "undefined"){
                HeadCodes[headcode] = Available_Heads.shift()
            }
        }

        //ASSIGNING ITEMS
        //////////////////
        //Searching for all item codes
        let ItemCodes= {}
        for(let i =0;i<TrainingTemplates.length;i++){
            let itemcode = TrainingTemplates[i].special_item
            if(typeof ItemCodes[itemcode] === "undefined"){
                ItemCodes[itemcode] = false
            }
        }
        for(let i =0;i<SearchPhaseBlockTemplates.length;i++){
            let itemresponses = SearchPhaseBlockTemplates[i].ItemResponses
            for(let item in itemresponses){
                if(typeof ItemCodes[item] === "undefined"){
                    ItemCodes[item] = false
                    console.warn("WARNING: some items only used during search, not training. Double check if this is correct")
                }
            }
        }

        //Creating Item details and defining All_Items
        Item_Details = generate_item_details(drawRandomElementsFromArray(Param.Available_items, Object.keys(ItemCodes).length, false ))
        All_Items = shuffleArray(JSON.parse(JSON.stringify(Item_Details.All_Items)))

        //Assigning to keys
        for(let i=0;i<Object.keys(ItemCodes).length;i++){
            ItemCodes[Object.keys(ItemCodes)[i]] = All_Items[i]
        }

        //CREATING TRAINING PHASE OBJECTS
        //////////////////////////////////
        TrainingFennimals = {}
        for(let i=0; i<TrainingTemplates.length;i++){
            let Temp = TrainingTemplates[i]

            //Create item response array with the correct items
            let IRA = [ [ItemCodes[Temp.special_item], Temp.outcome]]
            TrainingFennimals[Temp.ID] = createTrainingFennimalObj(Temp.ID, RegionLocationCodes[Temp.region].region, RegionLocationCodes[Temp.region].training_locations.shift(), HeadCodes[Temp.head], false, IRA,false)
        }

        //If specified in param, we may need to change the tertiary colors of some Fennimals.
        //  Specifically: if the templates contain the property "borrowed_tertiary_color", then:
        //      If this is set to false, use the normal tertiary (NOT CONTRAST) color of the region.
        //      If this has a value equal to the ID of a Fennimal, then take the normal tertiary (NOT CONTRAST) color of this Fennimal's region
        let Unused_Regions_Used_For_Drawing_Unassigned_Colors = JSON.parse(JSON.stringify(AvailableRegions))
        let find_head_color = function(IDcode){
            //First figure out if the target color is an actual training-phase Fennimal. If it is, select these colors.
            //If it is not, then select the colors from an empty region (if available) or set to gray otherwise.
            if(typeof TrainingFennimals[IDcode] !== "undefined"){
                return(Param.RegionData[TrainingFennimals[IDcode].region].Fennimal_location_colors.tertiary_color)
            }else{
                //If the current code is not a Fennimal, then try to check if its a valid color string.
                if(isColor(IDcode)){
                    return(IDcode)
                }else{
                    //So we want to have a special color here, but the target is not defined and the input is not a color name.
                    //  In this case, we first try to select a tertiary color from one of the unused regions.
                    //      If these are not available (or have been used for other Fennimals with an unspecified color-scheme already), then make this region gray.
                    //      Also throw a warning, as this may or may not be intended
                    if(Unused_Regions_Used_For_Drawing_Unassigned_Colors.length > 0){
                        return(Param.RegionData[Unused_Regions_Used_For_Drawing_Unassigned_Colors.shift()].Fennimal_location_colors.tertiary_color)
                    }else{
                        //Set to gray and throw a warning
                        console.warn("WARNING: ASSIGNING GRAY AS TERTIARY COLOR TO FENNIMAL HEAD. IS THIS INTENDED BEHAVIOR?")
                        return("gray")
                    }
                }
            }
        }

        for(let i=0; i<TrainingTemplates.length;i++){
            let Template = TrainingTemplates[i]

            //Find the contrast color for this Fennimal, and use it to define the tertiary color of the body.
            let contrast_color = Param.RegionData[TrainingFennimals[Template.ID].region].contrast_color
            TrainingFennimals[Template.ID].body_color_scheme.tertiary_color = contrast_color

            if(typeof Template.borrowed_tertiary_color !== "undefined"){
                //For the head: take the tertiary color of the target Fennimal. If the value is false, then just keep it as the original color-scheme.
                if(Template.borrowed_tertiary_color !== false){
                    TrainingFennimals[Template.ID].head_color_scheme.tertiary_color = find_head_color(Template.borrowed_tertiary_color)
                }
            }else{
                TrainingFennimals[Template.ID].head_color_scheme.tertiary_color = contrast_color
            }
        }

        //DEFINING SEARCH PHASE STIMULI
        //////////////////////////////////
        //Setting the search phase rules
        let SearchPhaseRules_search = {
            hidden_feedback: true,
            cued_item_allowed: true,
            search_item_allowed: true,
            name_based_on_location: search_phase_Fennimals_name_based_on_location,
            ask_confidence: true,
            ask_decision_style: true
        }
        let SearchPhaseRules_repeat = {
            hidden_feedback: true,
            cued_item_allowed: true,
            search_item_allowed: true,
            is_repeat_trial: true
        }

        let SearchPhaseBlockTrials = []
        for(let i =0;i<SearchPhaseBlockTemplates.length;i++){
            let Temp = SearchPhaseBlockTemplates[i]
            let IRA = []
            for(let item in Temp.ItemResponses){
                IRA.push(  [ItemCodes[item], Temp.ItemResponses[item]] )
            }


            SearchPhaseBlockTrials.push(createTestFennimalObj(Temp.ID, RegionLocationCodes[Temp.region]. region, RegionLocationCodes[Temp.region].search_locations.shift(), HeadCodes[Temp.head], false, IRA,false, false, false,SearchPhaseRules_search))
        }

        // CHANGING THE CONTRAST / TERTIARY COLOR FOR THE SEARCH PHASE STIMULI
        for(let i =0;i<SearchPhaseBlockTemplates.length;i++){
            let Template = SearchPhaseBlockTemplates[i]

            //Find the contrast color for this Fennimal, and use it to define the tertiary color of the body.
            let contrast_color = Param.RegionData[SearchPhaseBlockTrials[i].region].contrast_color
            SearchPhaseBlockTrials[i].body_color_scheme.tertiary_color = contrast_color

            if(typeof Template.borrowed_tertiary_color !== "undefined"){
                //For the head: take the tertiary color of the target Fennimal. If the value is false, then just keep it as the original color-scheme.
                if(Template.borrowed_tertiary_color !== false){
                    SearchPhaseBlockTrials[i].head_color_scheme.tertiary_color = find_head_color(Template.borrowed_tertiary_color)
                }
            }else{
                SearchPhaseBlockTrials[i].head_color_scheme.tertiary_color = contrast_color
            }

        }



        let RepeatBlockTrials = []
        for(let i = 0;i<TrainingTemplates.length;i++){
            let Temp = TrainingTemplates[i]
            let FenObj = TrainingFennimals[Temp.ID]

            //Create item response array with the correct items
            let IRA = []
            let special_item
            for(let itemcode in ItemCodes){
                if(itemcode === Temp.special_item){
                    special_item = [ItemCodes[itemcode]][0]
                    IRA.push(  [ItemCodes[itemcode], "correct"] )
                }else{
                    IRA.push(  [ItemCodes[itemcode], "incorrect"] )
                }


            }

            let NewFen = createTestFennimalObj("Repeat" + Temp.ID, FenObj.region, FenObj.location,FenObj.head,FenObj.body,IRA, false,special_item,false,SearchPhaseRules_repeat )

            //Copy the name from the original Fennimal
            NewFen.name = FenObj.name

            //Copy the color-schemes from the original Fennimal
            NewFen.body_color_scheme = FenObj.body_color_scheme
            NewFen.head_color_scheme = FenObj.head_color_scheme

            RepeatBlockTrials.push(NewFen)

        }

        SearchPhaseSetup = []

        //Adding the search blocks
        for(let blocknum = 0; blocknum<number_search_blocks; blocknum++){
            //TODO: This is a bit redunant coding...
            let BlockRules = JSON.parse(JSON.stringify(SearchPhaseRules_search))
            let need_to_modify_trial_rules = false
            if(follow_up_question_asked_in_blocks.includes(blocknum+1)){
                BlockRules.ask_follow_up_question = true
                need_to_modify_trial_rules = true
            }

            let NewBlock = {
                Trials: shuffleArray(JSON.parse(JSON.stringify(SearchPhaseBlockTrials))),
                hint_type: "location",
                type: "search",
                Rules: BlockRules
            }

            if(need_to_modify_trial_rules){
                for(let i = 0;i<NewBlock.Trials.length;i++){
                    NewBlock.Trials[i].TestPhaseRules = BlockRules
                }
            }

            SearchPhaseSetup.push(NewBlock)

        }

        //Adding the recall question
        SearchPhaseSetup.push({type:"recall_task"})

        //Adding the repeat trials at the end
        SearchPhaseSetup.push({
            Trials:shuffleArray(JSON.parse(JSON.stringify(RepeatBlockTrials))),
            hint_type: "location",
            type: "repeat",
            Rules: SearchPhaseRules_repeat
        })

        let url = new URL(window.location);
        if(url.searchParams.get("PROLIFIC_PID") === null){
            console.log(TrainingFennimals)
            console.log(SearchPhaseSetup)
        }



    }

    let number_of_search_blocks_in_experiment = false
    this.get_number_of_search_blocks = function(){
        return(number_of_search_blocks_in_experiment)
    }

    //Test phase block types:
    //  cued_recall: shows search phase template Fennimals, allows cued item
    //  non_cued_search: shows

    //Determine the exact experiment contents here
    switch(exp_code){

        case("baseline") : {
            //Tell the param object that we want to see colors for the training phase hints
            Param.show_colors_with_icon_hints = true

            // GENERAL STIMULI TEMPLATES
            //////////////////////////////
            let TrainingTemplates = [
                {ID: "A", region: "A", head: "A", special_item: "a", outcome: "frown", borrowed_tertiary_color: false},
                {ID: "B", region: "B", head: "B", special_item: "b", outcome: "frown", borrowed_tertiary_color: false},
                {ID: "C", region: "A", head: "B", special_item: "c", outcome: "heart", borrowed_tertiary_color: "B"},
                {ID: "D", region: "D", head: "D", special_item: "d", outcome: "heart", borrowed_tertiary_color: false},
            ]

            let SearchPhaseBlockTemplates = [
                {ID: "key", region: "B", head: "A", ItemResponses: {c: "heart", d: "neutral"}, borrowed_tertiary_color: "A"},
                {ID: "key2", region: "B", head: "A", ItemResponses: {c: "heart", d: "neutral"}, borrowed_tertiary_color: "A"},
                {ID: "key3", region: "B", head: "A", ItemResponses: {c: "heart", d: "neutral"}, borrowed_tertiary_color: "A"},
                {ID: "distr", region: "D", head: "F", ItemResponses: {c: "neutral", d: "heart"}, borrowed_tertiary_color: false },
                {ID: "distr2", region: "G", head: "D", ItemResponses: {c: "neutral", d: "heart"}, borrowed_tertiary_color: "D"},
                {ID: "distr3", region: "D", head: "G", ItemResponses: {c: "neutral", d: "heart"}, borrowed_tertiary_color: "D"},
            ]

            set_stimuli_for_basic_experiment_single_block(TrainingTemplates,SearchPhaseBlockTemplates, true, false)
            //SearchPhaseSetup = [SearchPhaseSetup[0]]
            //SearchPhaseSetup = []

            break;
        }

        case("partial_dead_end") : {
            //Tell the param object that we want to see colors for the training phase hints
            Param.show_colors_with_icon_hints = true

            // GENERAL STIMULI TEMPLATES
            //////////////////////////////
            let TrainingTemplates = [
                {ID: "A", region: "A", head: "A", special_item: "a", outcome: "frown", borrowed_tertiary_color: false},
                {ID: "B", region: "B", head: "B", special_item: "b", outcome: "frown", borrowed_tertiary_color: false},
                {ID: "C", region: "A", head: "C", special_item: "c", outcome: "heart", borrowed_tertiary_color: "Z"},
                {ID: "D", region: "D", head: "D", special_item: "d", outcome: "heart", borrowed_tertiary_color: false},
            ]

            let SearchPhaseBlockTemplates = [
                {ID: "key", region: "B", head: "A", ItemResponses: {c: "heart", d: "neutral"}, borrowed_tertiary_color: "A"},
                {ID: "key2", region: "B", head: "A", ItemResponses: {c: "heart", d: "neutral"}, borrowed_tertiary_color: "A"},
                {ID: "key3", region: "B", head: "A", ItemResponses: {c: "heart", d: "neutral"}, borrowed_tertiary_color: "A"},
                {ID: "distr", region: "D", head: "F", ItemResponses: {c: "neutral", d: "heart"}, borrowed_tertiary_color: false },
                {ID: "distr2", region: "G", head: "D", ItemResponses: {c: "neutral", d: "heart"}, borrowed_tertiary_color: "D" },
                {ID: "distr3", region: "D", head: "G", ItemResponses: {c: "neutral", d: "heart"}, borrowed_tertiary_color: "D"},
            ]

            set_stimuli_for_basic_experiment_single_block(TrainingTemplates,SearchPhaseBlockTemplates, true, false)
            //SearchPhaseSetup = [SearchPhaseSetup[0]]
            //SearchPhaseSetup = []

            break;
        }

        case("sequence_chain") : {
            //Tell the param object that we want to see colors for the training phase hints
            Param.show_colors_with_icon_hints = true

            // GENERAL STIMULI TEMPLATES
            //////////////////////////////
            let TrainingTemplates = [
                {ID: "A", region: "A", head: "A", special_item: "a", outcome: "frown", borrowed_tertiary_color: "Z"},
                {ID: "B", region: "A", head: "B", special_item: "b", outcome: "heart", borrowed_tertiary_color: false},
                {ID: "C", region: "C", head: "B", special_item: "c", outcome: "heart", borrowed_tertiary_color: false},
                {ID: "D", region: "D", head: "D", special_item: "c", outcome: "heart", borrowed_tertiary_color: false},
            ]

            let SearchPhaseBlockTemplates = [
                {ID: "key", region: "E", head: "A", ItemResponses: {b: "heart", c: "neutral"}, borrowed_tertiary_color: "A"},
                {ID: "key2", region: "F", head: "A", ItemResponses: {b: "heart", c: "neutral"}, borrowed_tertiary_color: "A"},
                {ID: "key3", region: "G", head: "A", ItemResponses: {b: "heart", c: "neutral"}, borrowed_tertiary_color: "A"},
                {ID: "distr", region: "E", head: "D", ItemResponses: {b: "neutral", c: "heart"}, borrowed_tertiary_color: "D" },
                {ID: "distr2", region: "F", head: "D", ItemResponses: {b: "neutral", c: "heart"}, borrowed_tertiary_color: "D" },
                {ID: "distr3", region: "G", head: "D", ItemResponses: {b: "neutral", c: "heart"}, borrowed_tertiary_color: "D"},
            ]

            set_stimuli_for_basic_experiment_single_block(TrainingTemplates,SearchPhaseBlockTemplates, true, false)
            //SearchPhaseSetup = [SearchPhaseSetup[0]]
            //SearchPhaseSetup = []

            break;
        }

        case("test"):
            //Tell the param object that we want to see colors for the training phase hints
            Param.show_colors_with_icon_hints = true

            // GENERAL STIMULI TEMPLATES
            //////////////////////////////
            let TrainingTemplates = [
                {ID: "A", region: "A", head: "A", special_item: "a", outcome: "frown", borrowed_tertiary_color: false},
                {ID: "B", region: "B", head: "B", special_item: "b", outcome: "frown", borrowed_tertiary_color: false},
                {ID: "C", region: "A", head: "B", special_item: "c", outcome: "heart", borrowed_tertiary_color: "B"},
                {ID: "D", region: "D", head: "D", special_item: "d", outcome: "heart", borrowed_tertiary_color: false},
            ]

            let SearchPhaseBlockTemplates = [
                {ID: "key", region: "B", head: "A", ItemResponses: {c: "heart", d: "neutral"}, borrowed_tertiary_color: "A"},
                {ID: "key2", region: "B", head: "A", ItemResponses: {c: "heart", d: "neutral"}, borrowed_tertiary_color: "A"},
                {ID: "key3", region: "B", head: "A", ItemResponses: {c: "heart", d: "neutral"}, borrowed_tertiary_color: "A"},
                {ID: "distr", region: "D", head: "F", ItemResponses: {c: "neutral", d: "heart"}, borrowed_tertiary_color: false },
                {ID: "distr2", region: "G", head: "D", ItemResponses: {c: "neutral", d: "heart"}, borrowed_tertiary_color: "D"},
                {ID: "distr3", region: "D", head: "G", ItemResponses: {c: "neutral", d: "heart"}, borrowed_tertiary_color: "D"},
            ]

            set_stimuli_for_basic_experiment_single_block(TrainingTemplates,SearchPhaseBlockTemplates, true, false)
            SearchPhaseSetup[0].Trials = [SearchPhaseSetup[0].Trials[0]]
            console.log(SearchPhaseSetup)
            //SearchPhaseSetup = [SearchPhaseSetup[0]]
            //SearchPhaseSetup = []

            break;


    }

    // CALL FUNCTIONS //
    ////////////////////
    //Call to get return a deepcopy of the training set Fennimals, keyed on location.
    this.get_experiment_code = function(){
        return(exp_code)
    }

    //Call to return a deepcopy of the training set Fennimals, in an array. Each element is an object containing a single Fennimal. Order is not randomized!
    this.getTrainingSetFennimalsInArray = function(){
        let Arr = []
        for(let key in TrainingFennimals){
            Arr.push(TrainingFennimals[key])
        }

        return(JSON.parse(JSON.stringify(Arr)))
    }

    //Call to get a deep copy of the ItemDetails object (keyed on item)
    this.getItemDetails = function(){
        return(JSON.parse(JSON.stringify(Item_Details)))
    }

    //Returns an array containing all the blocks of the test phase
    this.getTestPhaseData = function(){
        return(JSON.parse(JSON.stringify(SearchPhaseSetup)))
    }

    //Returns a list of all regions visited during the trials (both training and search phases)
    this.getRegionsVisited = function(){
        let Regions_Visited_During_Experiment = []
        for(let key in TrainingFennimals){
            Regions_Visited_During_Experiment.push(TrainingFennimals[key].region)
        }

        for(let blocknum =0;blocknum<SearchPhaseSetup.length; blocknum++){
            if(typeof SearchPhaseSetup[blocknum].Trials !== "undefined"){
                for(let trialnum =0;trialnum< SearchPhaseSetup[blocknum].Trials.length; trialnum++ ){
                    Regions_Visited_During_Experiment.push(SearchPhaseSetup[blocknum].Trials[trialnum].region)
                }
            }

        }
        /*for(let key in SearchPhaseTemplates){
            Regions_Visited_During_Experiment.push(SearchPhaseTemplates[key].region)
        }

         */

        return([... new Set(Regions_Visited_During_Experiment)])

    }

    // Returns a list of all locations visited during the trials (both training and search phases)
    this.getLocationsVisited = function(){
        let Locations_Visited_During_Experiment = []
        for(let key in TrainingFennimals){
            Locations_Visited_During_Experiment.push(TrainingFennimals[key].location)
        }

        for(let blocknum =0;blocknum<SearchPhaseSetup.length; blocknum++){
            if(typeof SearchPhaseSetup[blocknum].Trials !== "undefined"){
                for(let trialnum =0;trialnum< SearchPhaseSetup[blocknum].Trials.length; trialnum++ ){
                    Locations_Visited_During_Experiment.push(SearchPhaseSetup[blocknum].Trials[trialnum].location)
                }
            }
        }

        return([... new Set(Locations_Visited_During_Experiment)])

    }

    //Returns a list of all heads used during the trials (both training and search phases)
    this.getHeadsUsed = function(){
        let Heads_Used_During_Experiment = []
        for(let key in TrainingFennimals){
            Heads_Used_During_Experiment.push(TrainingFennimals[key].head)
        }

        for(let blocknum =0;blocknum<SearchPhaseSetup.length; blocknum++){
            if(typeof SearchPhaseSetup[blocknum].Trials !== "undefined"){
                for(let trialnum =0;trialnum< SearchPhaseSetup[blocknum].Trials.length; trialnum++ ){
                    Heads_Used_During_Experiment.push(SearchPhaseSetup[blocknum].Trials[trialnum].head)
                }
            }
        }

        return(Heads_Used_During_Experiment)
    }

    //Returns a list of all bodies used during the trials (both training and search phases
    this.getBodiesUsed = function(){
        let Bodies_Used_During_Experiment = []
        for(let key in TrainingFennimals){
            Bodies_Used_During_Experiment.push(TrainingFennimals[key].body)
        }

        for(let blocknum =0;blocknum<SearchPhaseSetup.length; blocknum++){
            if(typeof SearchPhaseSetup[blocknum].Trials !== "undefined"){
                for(let trialnum =0;trialnum< SearchPhaseSetup[blocknum].Trials.length; trialnum++ ){
                    Bodies_Used_During_Experiment.push(SearchPhaseSetup[blocknum].Trials[trialnum].body)
                }
            }
        }

        return(Bodies_Used_During_Experiment)
    }

    //Returns a list of all outcomes observed during the experiment
    this.getAllOutcomesObservedDuringTrainingPhase = function(){
        let Outcomes = []
        for(let key in TrainingFennimals){
            for(let item in TrainingFennimals[key].ItemResponses){
                if(TrainingFennimals[key].ItemResponses[item] !== "unavailable"){
                    Outcomes.push(TrainingFennimals[key].ItemResponses[item])
                }

            }
        }
        return([... new Set(Outcomes)])


    }

    //Returns an array of all valences observed during the training phase
    this.getTrainingPhaseNames = function(){
        let Arr = []
        for(let key in TrainingFennimals){
            Arr.push(TrainingFennimals[key].name)
        }
        return([... new Set(Arr)])
    }
    //Returns an array containing names of all Fennimals (both training and test)
    this.getAllNames = function(){
        //Getting the training phase names
        let Arr = this.getTrainingPhaseNames()

        //Adding names for the test phase
        for(let blocknum =0;blocknum<SearchPhaseSetup.length; blocknum++){
            if(typeof SearchPhaseSetup[blocknum].Trials !== "undefined"){
                for(let trialnum =0;trialnum< SearchPhaseSetup[blocknum].Trials.length; trialnum++ ){
                    Arr.push(SearchPhaseSetup[blocknum].Trials[trialnum].name)
                }
            }
        }

        return([... new Set(Arr)])
    }

    //Returns an object with a key ID and a property name for ALL Fennimals in the experiment
    this.getObjectOfIDsAndNames = function(){
        let Obj = {}

        for(let key in TrainingFennimals){
            if(typeof Obj[TrainingFennimals[key].ID] === "undefined"){
                Obj[TrainingFennimals[key].ID] = TrainingFennimals[key].name
            }
        }

        for(let blocknum =0;blocknum<SearchPhaseSetup.length; blocknum++){
            if(typeof SearchPhaseSetup[blocknum].Trials !== "undefined"){
                for(let trialnum =0;trialnum< SearchPhaseSetup[blocknum].Trials.length; trialnum++ ){
                    if(typeof Obj[SearchPhaseSetup[blocknum].Trials[trialnum].ID] === "undefined"){
                        Obj[SearchPhaseSetup[blocknum].Trials[trialnum].ID] = SearchPhaseSetup[blocknum].Trials[trialnum].name
                    }
                }
            }
        }

        return(JSON.parse(JSON.stringify(Obj)))
    }

    //Returns an array of all Training-phase Fennimal names
    this.getTrainingPhaseValences = function(){
        let Arr = []
        for(let key in TrainingFennimals){
            let ItemResponses = TrainingFennimals[key].ItemResponses
            for(let item in ItemResponses){
                if(ItemResponses[item] !== "unavailable" ){
                    Arr.push(ItemResponses[item])
                }
            }
        }
        return([... new Set(Arr)])
    }

    //Returns a search-phase Fennimal object with the given name. NOTE: if multiple exist, returns the first encounter! If none encountered, returns false
    this.getSearchPhaseFennimalByID = function(ID){
        for(let blocknum =0;blocknum<SearchPhaseSetup.length; blocknum++){
            if(typeof SearchPhaseSetup[blocknum].Trials !== "undefined"){
               for(let i =0;i<SearchPhaseSetup[blocknum].Trials.length;i++){
                   if(SearchPhaseSetup[blocknum].Trials[i].ID === ID){
                       return(JSON.parse(JSON.stringify(SearchPhaseSetup[blocknum].Trials[i])))
                   }
               }
            }
        }
        return(false)
    }

    //Returns the total number of trials in the search phase
    this.get_number_of_search_phase_encounters = function(){
        let count = 0

        for(let blocknum = 0; blocknum < SearchPhaseSetup.length; blocknum++){
            if(SearchPhaseSetup[blocknum].type.includes("search")){
                count = count + SearchPhaseSetup[blocknum].Trials.length
            }
        }
        return(count)
    }





}

console.log("NOW")
