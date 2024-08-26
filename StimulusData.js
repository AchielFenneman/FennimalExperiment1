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
            FenObj.head_color_scheme.tertiary_color = Param.RegionData[region].contrast_color
            FenObj.body_color_scheme.tertiary_color = Param.RegionData[region].contrast_color
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

        //Adding name and color scheme
        switch(Param.namingscheme){
            case("region_head"):
                FenObj.name = createConjunctiveNameRegionHead(FenObj.region,FenObj.head);
                break
            case("body_head"):
                FenObj.name = createConjunctiveNameHeadBody(FenObj.body,FenObj.head)
                break
        }



        return(FenObj)
    }

    function createTestFennimalObj(ID, region, location, head, _optional_body, ItemResponseArr, _optional_ColorScheme, cued_item, search_item, TestPhaseRules){
        let FenObj = createTrainingFennimalObj(ID, region, location, head, _optional_body, ItemResponseArr, _optional_ColorScheme)
        FenObj.cued_item = cued_item
        FenObj.search_item = search_item
        FenObj.TestPhaseRules = TestPhaseRules

        //If requested, change the name of these Fennimals to be based on their location
        if(typeof TestPhaseRules.name_based_on_location !== "undefined"){
            if(TestPhaseRules.name_based_on_location){
                FenObj.name = createConjunctiveNameLocationHead(FenObj.location, FenObj.head)
            }
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

    //Given Training and SearchBlock Templates and a number of repeated search phase blocks, sets the TrainingFennimals and the SearchPhaseSetup (defining the experiment)
    let set_stimuli_for_basic_experiment = function(TrainingTemplates,SearchPhaseBlockTemplates, number_search_blocks){
        // If set to true, then the test phase Fennimals have names based on their LOCATION (not region)
        let search_phase_Fennimals_name_based_on_location = true

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
        let Available_Heads  = shuffleArray(["C", "E", "I",  "B", "N"]) //"K", "G", "D
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

        //DEFINING SEARCH PHASE STIMULI
        //////////////////////////////////
        //Setting the search phase rules
        let SearchPhaseRules_search = {
            hidden_feedback: true,
            cued_item_allowed: true,
            search_item_allowed: true,
            name_based_on_location: search_phase_Fennimals_name_based_on_location
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
            RepeatBlockTrials.push(createTestFennimalObj("Repeat" + Temp.ID, FenObj.region, FenObj.location,FenObj.head,FenObj.body,IRA, false,special_item,false,SearchPhaseRules_repeat ))
        }

        SearchPhaseSetup = []

        //Adding the search blocks
        for(let blocknum = 0; blocknum<number_search_blocks; blocknum++){
            let NewBlock = {
                Trials: shuffleArray(JSON.parse(JSON.stringify(SearchPhaseBlockTrials))),
                hint_type: "location",
                type: "search",
                Rules: SearchPhaseRules_search
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

    }


    //Test phase block types:
    //  cued_recall: shows search phase template Fennimals, allows cued item
    //  non_cued_search: shows

    //Determine the exact experiment contents here
    switch(exp_code){

        case("convergence") : {
            //Tell the param object that we want to see colors for the training phase hints
            Param.show_colors_with_icon_hints = true

            // GENERAL STIMULI TEMPLATES
            //////////////////////////////
            let TrainingTemplates = [
                {ID: "A", region: "A", head: "A", special_item: "a", outcome: "frown"},
                {ID: "B", region: "B", head: "B", special_item: "a", outcome: "frown"},
                {ID: "C", region: "A", head: "B", special_item: "b", outcome: "heart"},
                {ID: "D", region: "D", head: "D", special_item: "c", outcome: "heart"},
            ]

            let SearchPhaseBlockTemplates = [
                {ID: "key", region: "B", head: "A", ItemResponses: {b: "heart", c: "neutral"} },
                {ID: "key2", region: "B", head: "A", ItemResponses: {b: "heart", c: "neutral"} },
                {ID: "distr", region: "F", head: "D", ItemResponses: {b: "neutral", c: "heart"} },
                {ID: "distr2", region: "G", head: "D", ItemResponses: {b: "neutral", c: "heart"} },
            ]

            set_stimuli_for_basic_experiment(TrainingTemplates,SearchPhaseBlockTemplates,3)
            //SearchPhaseSetup = [SearchPhaseSetup[0]]
            //SearchPhaseSetup = []

            break;

        }

        case("divergence") : {
            //Tell the param object that we want to see colors for the training phase hints
            Param.show_colors_with_icon_hints = true

            // GENERAL STIMULI TEMPLATES
            //////////////////////////////
            let TrainingTemplates = [
                {ID: "A", region: "A", head: "A", special_item: "a", outcome: "frown"},
                {ID: "B", region: "B", head: "B", special_item: "a", outcome: "frown"},
                {ID: "C", region: "A", head: "C", special_item: "b", outcome: "heart"},
                {ID: "D", region: "D", head: "C", special_item: "c", outcome: "heart"},
            ]

            let SearchPhaseBlockTemplates = [
                {ID: "key", region: "B", head: "A", ItemResponses: {b: "heart", c: "neutral"} },
                {ID: "key2", region: "B", head: "A", ItemResponses: {b: "heart", c: "neutral"} },
                {ID: "distr", region: "D", head: "E", ItemResponses: {b: "neutral", c: "heart"} },
                {ID: "distr2", region: "D", head: "F", ItemResponses: {b: "neutral", c: "heart"} },
            ]

            set_stimuli_for_basic_experiment(TrainingTemplates,SearchPhaseBlockTemplates,3)
            //SearchPhaseSetup = [SearchPhaseSetup[0]]
            //SearchPhaseSetup = []

            break;

        }

        case("divergence_min") : {
            //Tell the param object that we want to see colors for the training phase hints
            Param.show_colors_with_icon_hints = true

            // GENERAL STIMULI TEMPLATES
            //////////////////////////////
            let TrainingTemplates = [
                {ID: "A", region: "A", head: "A", special_item: "a", outcome: "frown"},
                {ID: "B", region: "B", head: "B", special_item: "a", outcome: "frown"},
                {ID: "C", region: "A", head: "C", special_item: "b", outcome: "heart"},
                {ID: "D", region: "D", head: "D", special_item: "c", outcome: "heart"},
            ]

            let SearchPhaseBlockTemplates = [
                {ID: "key", region: "B", head: "A", ItemResponses: {b: "heart", c: "neutral"} },
                {ID: "key2", region: "B", head: "A", ItemResponses: {b: "heart", c: "neutral"} },
                {ID: "distr", region: "F", head: "D", ItemResponses: {b: "neutral", c: "heart"} },
                {ID: "distr2", region: "G", head: "D", ItemResponses: {b: "neutral", c: "heart"} },
            ]

            set_stimuli_for_basic_experiment(TrainingTemplates,SearchPhaseBlockTemplates,3)
            //SearchPhaseSetup = [SearchPhaseSetup[0]]
            //SearchPhaseSetup = []

            break;

        }

        case("centrality") : {
            //Tell the param object that we want to see colors for the training phase hints
            Param.show_colors_with_icon_hints = true

            // GENERAL STIMULI TEMPLATES
            //////////////////////////////
            let TrainingTemplates = [
                {ID: "A", region: "A", head: "A", special_item: "a", outcome: "frown"},

                {ID: "B", region: "B", head: "B", special_item: "a", outcome: "frown"}, // B should be listed first, so that its in the middle of the location (making C and E equally distant)
                {ID: "C", region: "B", head: "A", special_item: "c", outcome: "heart"},
                {ID: "D", region: "D", head: "A", special_item: "d", outcome: "heart"},
                {ID: "E", region: "B", head: "E", special_item: "e", outcome: "heart"},
            ]

            let SearchPhaseBlockTemplates = [
                {ID: "key_A1", region: "A", head: "F", ItemResponses: { c: "heart",d: "heart", e:"neutral"} },
                {ID: "key_A2", region: "A", head: "G", ItemResponses: { c: "heart",d: "heart", e:"neutral"} },
                {ID: "key_B1", region: "E", head: "B", ItemResponses: { c: "heart",d: "neutral", e:"heart"} },
                {ID: "key_B2", region: "F", head: "B", ItemResponses: { c: "heart",d: "neutral", e:"heart"} },
            ]

            set_stimuli_for_basic_experiment(TrainingTemplates,SearchPhaseBlockTemplates,3)
            //SearchPhaseSetup = [SearchPhaseSetup[0]]
            //SearchPhaseSetup = []
            console.log(SearchPhaseSetup)

            break;

        }

        case("convergence_base") : {
            //Drawing Regions
            let Training_Regions = shuffleArray(["Desert", "North", "Village", "Jungle"]) //"North", "Desert", "Village"
            let Search_Regions = shuffleArray(["Mountains", "Beach", "Flowerfields", "Swamp"])// "Jungle", "Mountains", "Beach"

            //Shuffling locations for the regions
            let Training_Location_Arr = []
            for(let i = 0; i<Training_Regions.length;i++){
                Training_Location_Arr.push(shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[Training_Regions[i]].Locations))))
            }
            let Search_Location_Arr = []
            for(let i = 0; i<Search_Regions.length;i++){
                Search_Location_Arr.push(shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[Search_Regions[i]].Locations))))
            }

            //Shuffle heads
            let Used_Heads  = shuffleArray(["D", "E", "G", "I", "K", "B", "N"])

            //Creating Item details
            Item_Details = generate_item_details(drawRandomElementsFromArray(Param.Available_items, 4, false ))
            All_Items = shuffleArray(JSON.parse(JSON.stringify(Item_Details.All_Items)))

            //Creating the training Fennimals (A1 and A2 share a semantic head pair, B and C do not)
            TrainingFennimals = {
                A: createTrainingFennimalObj("A", Training_Regions[0], Training_Location_Arr[0][0], Used_Heads[0],false, [ [All_Items[0], "frown"]], false),
                B: createTrainingFennimalObj("B", Training_Regions[1], Training_Location_Arr[1][0], Used_Heads[1],false, [ [All_Items[1], "frown"]], false),
                C:  createTrainingFennimalObj("C",Training_Regions[0], Training_Location_Arr[0][1], Used_Heads[1],false, [ [All_Items[2], "heart"]], false),
                D:  createTrainingFennimalObj("D",Training_Regions[2], Training_Location_Arr[2][0], Used_Heads[3],false, [ [All_Items[3], "heart"]], false),
                E:  createTrainingFennimalObj("E",Training_Regions[3], Training_Location_Arr[3][0], Used_Heads[4],false, [ [All_Items[3], "heart"]], false),
            }

            //Tell the param object that we want to see colors for the training phase hitns
            Param.show_colors_with_icon_hints = false

            //Setting the search phase rules
            let SearchPhaseRules_search = {
                hidden_feedback: true,
                cued_item_allowed: true,
                search_item_allowed: true,
            }
            let SearchPhaseRules_repeat = {
                hidden_feedback: true,
                cued_item_allowed: true,
                search_item_allowed: true,
                is_repeat_trial: true
            }

            // TODO: add IDs and actual outcomes
            SearchPhaseSetup = [
                {
                    Trials: [
                        createTestFennimalObj("Test_Key", Training_Regions[1], Training_Location_Arr[1][0],  TrainingFennimals.A.head,false, [[All_Items[2], "heart"],[All_Items[3], "neutral"] ], false, false, All_Items[2],SearchPhaseRules_search),
                        createTestFennimalObj("Test_D_h", Search_Regions[1], Search_Location_Arr[1][0],  TrainingFennimals.D.head,false, [[All_Items[2], "neutral"],[All_Items[3], "heart"] ], false, All_Items[3], false,SearchPhaseRules_search),
                        //createTestFennimalObj("Test_E_l", Training_Regions[3], Training_Location_Arr[3][0],  Used_Heads[5],false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "neutral"],[All_Items[3],"heart"] ], false, false, false,SearchPhaseRules_search),
                    ],
                    hint_type: "location",
                    type: "search",
                    Rules: SearchPhaseRules_search
                },
                {
                    Trials: [
                        createTestFennimalObj("Test_Key", Training_Regions[1], Training_Location_Arr[1][0],  TrainingFennimals.A.head,false, [[All_Items[2], "heart"],[All_Items[3], "neutral"] ], false, false, All_Items[2],SearchPhaseRules_search),
                        createTestFennimalObj("Test_D_h", Search_Regions[1], Search_Location_Arr[1][0],  TrainingFennimals.D.head,false, [[All_Items[2], "neutral"],[All_Items[3], "heart"] ], false, All_Items[3], false,SearchPhaseRules_search),
                        // createTestFennimalObj("Test_E_l", Training_Regions[3], Training_Location_Arr[3][0],  Used_Heads[5],false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "neutral"],[All_Items[3],"heart"] ], false, false, false,SearchPhaseRules_search),
                    ],
                    hint_type: "location",
                    type: "search",
                    Rules: SearchPhaseRules_search
                },
                {
                    Trials: [
                        createTestFennimalObj("Test_Key", Training_Regions[1], Training_Location_Arr[1][0],  TrainingFennimals.A.head,false, [[All_Items[2], "heart"],[All_Items[3], "neutral"] ], false, false, All_Items[2],SearchPhaseRules_search),
                        createTestFennimalObj("Test_D_h", Search_Regions[1], Search_Location_Arr[1][0],  TrainingFennimals.D.head,false, [[All_Items[2], "neutral"],[All_Items[3], "heart"] ], false, All_Items[3], false,SearchPhaseRules_search),
                        //createTestFennimalObj("Test_E_l", Training_Regions[3], Training_Location_Arr[3][0],  Used_Heads[5],false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "neutral"],[All_Items[3],"heart"] ], false, false, false,SearchPhaseRules_search),
                    ],
                    hint_type: "location",
                    type: "search",
                    Rules: SearchPhaseRules_search
                },
                {
                    Trials: [
                        createTestFennimalObj("Test_Key", Training_Regions[1], Training_Location_Arr[1][0],  TrainingFennimals.A.head,false, [[All_Items[2], "heart"],[All_Items[3], "neutral"] ], false, false, All_Items[2],SearchPhaseRules_search),
                        createTestFennimalObj("Test_D_h", Search_Regions[1], Search_Location_Arr[1][0],  TrainingFennimals.D.head,false, [[All_Items[2], "neutral"],[All_Items[3], "heart"] ], false, All_Items[3], false,SearchPhaseRules_search),
                        // createTestFennimalObj("Test_E_l", Training_Regions[3], Training_Location_Arr[3][0],  Used_Heads[5],false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "neutral"],[All_Items[3],"heart"] ], false, false, false,SearchPhaseRules_search),
                    ],
                    hint_type: "location",
                    type: "search",
                    Rules: SearchPhaseRules_search
                },

                {
                    Trials: [
                        createTestFennimalObj("RepeatA", TrainingFennimals.A.region, TrainingFennimals.A.location,  TrainingFennimals.A.head,false, [[All_Items[0], "correct"],[All_Items[1], "incorrect"],[All_Items[2], "incorrect"],[All_Items[3], "incorrect"] ], false, All_Items[0], false,SearchPhaseRules_repeat),
                        createTestFennimalObj("RepeatB", TrainingFennimals.B.region, TrainingFennimals.B.location,  TrainingFennimals.B.head,false, [[All_Items[0], "incorrect"],[All_Items[1], "correct"],[All_Items[2], "incorrect"],[All_Items[3], "incorrect"] ], false, All_Items[1], false,SearchPhaseRules_repeat),
                        createTestFennimalObj("RepeatC", TrainingFennimals.C.region, TrainingFennimals.C.location,  TrainingFennimals.C.head,false, [[All_Items[0], "incorrect"],[All_Items[1], "incorrect"],[All_Items[2], "correct"],[All_Items[3], "incorrect"] ], false, All_Items[2], false,SearchPhaseRules_repeat),
                        createTestFennimalObj("RepeatD", TrainingFennimals.D.region, TrainingFennimals.D.location,  TrainingFennimals.D.head,false, [[All_Items[0], "incorrect"],[All_Items[1], "incorrect"],[All_Items[2], "incorrect"],[All_Items[3], "correct"] ], false, All_Items[3], false,SearchPhaseRules_repeat),
                        createTestFennimalObj("RepeatE", TrainingFennimals.E.region, TrainingFennimals.E.location,  TrainingFennimals.E.head,false, [[All_Items[0], "incorrect"],[All_Items[1], "incorrect"],[All_Items[2], "incorrect"],[All_Items[3], "correct"] ], false, All_Items[3], false,SearchPhaseRules_repeat),
                    ],
                    hint_type: "location",
                    type: "repeat",
                    Rules: SearchPhaseRules_repeat
                },














            ]

            break;

        }
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





}


