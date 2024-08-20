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

        //For the test phase, all items may be set to available (changes will be made by the FennimalController later on). If no valence assigned, assume neutral
        if(ItemResponseArr !== false){
            let special_item_candidates = []
            if(Array.isArray(ItemResponseArr)){
                let ItemResponseMap = {}
                for(let i=0;i<All_Items.length; i++){
                    ItemResponseMap[All_Items[i]] = "neutral"
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


    //Returns a block of inference-phase trials. items_allowed_... can be "direct" or "indirect.
    function createBlockOfSearchTrials(TrialsArr, cued_items_allowed, show_feedback, feedback_always_smile){
        let Block = []

        for(let ind = 0; ind<TrialsArr.length; ind++){
            let FenObj = JSON.parse(JSON.stringify(TrialsArr[ind]))

            //Finding which items should be available. If cued_items_allowed it true, then remove the search item. If its false, remove the cued item
            let available_items = JSON.parse(JSON.stringify(All_Items))
            if(cued_items_allowed){available_items = available_items.filter(x => x !== FenObj.search_item)} else{available_items = available_items.filter(x => x !== FenObj.cued_item)}

            //Creating the valenced feedback object. This may or may not be shown (depending on feedback setting) but always determines the outcomes at the end
            let ValencedFeedbackResponses  = {}
            for(let item_ind =0; item_ind < All_Items.length; item_ind++){
                let item = All_Items[item_ind]
                let valence

                if(available_items.includes(item)){
                    if(feedback_always_smile){
                        valence = "smile"
                    }else{
                        if(item === FenObj.cued_item || item === FenObj.search_item){
                            valence = "smile"
                        }else{
                            valence = "frown"
                        }
                    }
                }else{
                    valence = "unavailable"
                }

                ValencedFeedbackResponses[item] = valence
            }

            if(show_feedback){
                FenObj.ItemResponses = ValencedFeedbackResponses
            }else{
                //If feedback is not shown, create a participant-facing response object
                let ParticipantFacingItemResponses = {}
                for(let item_ind =0; item_ind < All_Items.length; item_ind++){
                    let item = All_Items[item_ind]
                    if(available_items.includes(item)){
                        ParticipantFacingItemResponses[item] = "unknown"
                    }else{
                        ParticipantFacingItemResponses[item] = "unavailable"
                    }

                }

                FenObj.ItemResponses = ParticipantFacingItemResponses
                FenObj.HiddenItemResponses = ValencedFeedbackResponses

            }

            //Pushing to the DirectTestBlock
            Block.push(FenObj)
        }

        return(shuffleArray(Block))
    }

    //Returns a block of induced-search trials. Provide with array of IDs denoting trials in which the search item is available (all others willbe assumed search trials)
    function createBlockOfInducedSearchTrials(TrialsArr, _IDs_search, show_feedback){
        let Block = []

        for(let ind = 0; ind<TrialsArr.length; ind++){
            let FenObj = JSON.parse(JSON.stringify(TrialsArr[ind]))

            //Finding which items should be available. If cued_items_allowed it true, then remove the search item. If its false, remove the cued item
            let available_items = JSON.parse(JSON.stringify(All_Items))
            if(_IDs_search.includes(FenObj.ID)){
                available_items = available_items.filter(x => x !== FenObj.cued_item)
            }else{
                available_items = available_items.filter(x => x !== FenObj.search_item)
            }

            //Creating the valenced feedback object. This may or may not be shown (depending on feedback setting) but always determines the outcomes at the end
            let ValencedFeedbackResponses  = {}
            for(let item_ind =0; item_ind < All_Items.length; item_ind++){
                let item = All_Items[item_ind]
                let valence

                if(available_items.includes(item)){
                    if(item === FenObj.cued_item || item === FenObj.search_item){
                        valence = "correct"
                    }else{
                        valence = "incorrect"
                    }
                }else{
                    valence = "unavailable"
                }

                ValencedFeedbackResponses[item] = valence
            }

            if(show_feedback){
                FenObj.ItemResponses = ValencedFeedbackResponses
            }else{
                //If feedback is not shown, create a participant-facing response object
                let ParticipantFacingItemResponses = {}
                for(let item_ind =0; item_ind < All_Items.length; item_ind++){
                    let item = All_Items[item_ind]
                    if(available_items.includes(item)){
                        ParticipantFacingItemResponses[item] = "unknown"
                    }else{
                        ParticipantFacingItemResponses[item] = "unavailable"
                    }

                }

                FenObj.ItemResponses = ParticipantFacingItemResponses
                FenObj.HiddenItemResponses = ValencedFeedbackResponses

            }

            //Pushing to the DirectTestBlock
            Block.push(FenObj)
        }

        return(shuffleArray(Block))
    }

    //Returns a block of the original training trials with all items available (no feedback provided)
    function createBlockOfRepeatTrainingTrials(shuffle_trials){
        let Block = []
        for(let key in TrainingFennimals){
            let NewFenObj = JSON.parse(JSON.stringify(TrainingFennimals[key]))

            //Note that here only the special item should be listed as correct, all the other items are incorrect
            let ItemResponseMap = {}, HiddenItemResponseMap = {}
            for(let i=0;i<All_Items.length; i++){
                if(NewFenObj.special_item === All_Items[i]){
                    HiddenItemResponseMap[All_Items[i]] = "correct"
                }else{
                    HiddenItemResponseMap[All_Items[i]] = "incorrect"
                }
                ItemResponseMap[All_Items[i]] = "unknown"
            }
            NewFenObj.ItemResponses = ItemResponseMap
            NewFenObj.HiddenItemResponses = HiddenItemResponseMap

            NewFenObj.ID = key
            Block.push(NewFenObj)
        }

        if(shuffle_trials){
            return(shuffleArray(Block))
        }else{
            return(Block)
        }
    }

    //Here we define the different experiment structures
    let TrainingFennimals,InducedRecallTemplates, SearchPhaseTemplates, SearchPhaseSetup, Item_Details, All_Items
    let Available_Regions = shuffleArray(["North","Desert","Village","Jungle","Flowerfields","Swamp", "Beach", "Mountains"])

    //Use this to store experiment-specific variables
    let AuxData = false

    //Test phase block types:
    //  cued_recall: shows search phase template Fennimals, allows cued item
    //  non_cued_search: shows

    //Determine the exact experiment contents here
    switch(exp_code){

        case("test") : {
            //Drawing Regions
            let Training_Regions = shuffleArray(["Desert", "North", "Village","Jungle"]) //"North", "Desert", "Village"
            let Search_Regions = shuffleArray([ "Mountains", "Beach", "Flowerfields", "Swamp"])// "Jungle", "Mountains", "Beach"

            //Shuffling locations for the regions
            let Training_Location_Arr = []
            for(let i = 0; i<Training_Regions.length;i++){
                Training_Location_Arr.push(shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[Training_Regions[i]].Locations))))
            }
            let Search_Location_Arr = []
            for(let i = 0; i<Search_Regions.length;i++){
                Search_Location_Arr.push(shuffleArray( JSON.parse(JSON.stringify(Param.RegionData[Search_Regions[i]].Locations))))
            }

            //Drawing 4 heads
            let Used_Heads  = shuffleArray(["E", "G", "I", "K"]) // ["D", "E", "G", "I", "K"]

            //Creating Item details
            Item_Details = generate_item_details(drawRandomElementsFromArray(Param.Available_items, 3, false ))
            All_Items = shuffleArray(JSON.parse(JSON.stringify(Item_Details.All_Items)))

            //Creating the training Fennimals (A1 and A2 share a semantic head pair, B and C do not)
            TrainingFennimals = {
                A: createTrainingFennimalObj("A", Training_Regions[0], Training_Location_Arr[0][0], Used_Heads[0],false, [ [All_Items[0], "frown"]], false),
                B: createTrainingFennimalObj("B",Training_Regions[0], Training_Location_Arr[0][1], Used_Heads[1],false, [ [All_Items[1], "heart"]], false),
                C1: createTrainingFennimalObj("C1",Training_Regions[1], Training_Location_Arr[1][0], Used_Heads[2],false, [ [All_Items[2], "heart"]], false ),
                C2: createTrainingFennimalObj("C2",Training_Regions[2], Training_Location_Arr[2][0], Used_Heads[3],false, [ [All_Items[2], "heart"]], false ),
            }

            //Setting the search phase rules
            let SearchPhaseRules = {
                hidden_feedback: true,
                cued_item_allowed: true,
                search_item_allowed: true
            }

            // TODO: add IDs and actual outcomes
            SearchPhaseSetup = [
                {
                    Trials: [
                        createTestFennimalObj("TestA", Search_Regions[0], Search_Location_Arr[0][0], TrainingFennimals.A.head,false, [[All_Items[0], "frown"],[All_Items[1], "heart"]], false, TrainingFennimals.A.special_item, TrainingFennimals.B.special_item,SearchPhaseRules),
                        createTestFennimalObj("TestB", Search_Regions[0], Search_Location_Arr[0][1], TrainingFennimals.B.head,false, [[All_Items[0], "frown"],[All_Items[1], "heart"]], false, TrainingFennimals.B.special_item, TrainingFennimals.A.special_item,SearchPhaseRules),
                        createTestFennimalObj("TestC", Search_Regions[0], Search_Location_Arr[0][2], TrainingFennimals.C1.head,false, [[All_Items[2], "heart"]], false, TrainingFennimals.C1.special_item, false,SearchPhaseRules)
                    ],
                    hint_type: "location",
                    type: "search"
                },

            ]

            console.log(JSON.parse(JSON.stringify(SearchPhaseSetup)))

            break;

        }

        case("test2") : {
            //Drawing Regions
            let Training_Regions = shuffleArray(["Desert", "North", "Village","Jungle"]) //"North", "Desert", "Village"
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
            let Used_Heads  = shuffleArray(["D", "E", "G", "I", "K"])

            //Creating Item details
            Item_Details = generate_item_details(drawRandomElementsFromArray(Param.Available_items, 3, false ))
            All_Items = shuffleArray(JSON.parse(JSON.stringify(Item_Details.All_Items)))

            //Drawing base color schemes
            let BaseCols = shuffleArray(Param.getColorSchemeArray(4, "baseline"))
            let UniqueCol = shuffleArray(Param.SpecialColorSchemes)
            console.log(BaseCols[0])

            //Creating the training Fennimals (A1 and A2 share a semantic head pair, B and C do not)
            TrainingFennimals = {
                A1: createTrainingFennimalObj("A1", Training_Regions[0], Training_Location_Arr[0][0], Used_Heads[0],false, [ [All_Items[0], "frown"]], false),
                A2: createTrainingFennimalObj("A2", Training_Regions[1], Training_Location_Arr[1][0], Used_Heads[1],false, [ [All_Items[0], "frown"]], false),
                B:  createTrainingFennimalObj("B",Training_Regions[0], Training_Location_Arr[0][1], Used_Heads[1],false, [ [All_Items[1], "heart"]], false),
                C:  createTrainingFennimalObj("C",Training_Regions[2], Training_Location_Arr[2][0], Used_Heads[2],false, [ [All_Items[2], "heart"]], false),
            }

            console.log(TrainingFennimals)

            // Give some of the Fennimals the adjective "Vivid"
            TrainingFennimals.A1.name = "Vivid " + TrainingFennimals.A1.name
            TrainingFennimals.C.name = "Vivid " + TrainingFennimals.C.name

            //Tell the param object that we want to see colors for the training phase hitns
            Param.show_colors_with_icon_hints = true

            //Setting the search phase rules
            let SearchPhaseRules = {
                hidden_feedback: true,
                cued_item_allowed: true,
                search_item_allowed: true
            }

            // TODO: add IDs and actual outcomes
            SearchPhaseSetup = [
                {
                    Trials: [
                        createTestFennimalObj("TestA1", Training_Regions[1], Training_Location_Arr[1][1],  Used_Heads[0],false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "heart"] ], false, false, false,SearchPhaseRules),
                        createTestFennimalObj("TestA1", Training_Regions[1], Training_Location_Arr[1][2],  Used_Heads[0],false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "heart"] ], false, false, false,SearchPhaseRules),
                        //createTestFennimalObj("TestA2", Search_Regions[1], Search_Location_Arr[1][0],  Used_Heads[0],false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "heart"] ],false, false, false,SearchPhaseRules),

                    ],
                    hint_type: "location",
                    type: "search"
                },

            ]

            console.log(JSON.parse(JSON.stringify(SearchPhaseSetup)))

            break;

        }

        case("baseline") : {
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
                B: createTrainingFennimalObj("B", Training_Regions[1], Training_Location_Arr[1][0], Used_Heads[2],false, [ [All_Items[1], "frown"]], false),
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
                        createTestFennimalObj("Test_Key", Search_Regions[0], Search_Location_Arr[0][0],  TrainingFennimals.A.head,false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "heart"],[All_Items[3],"neutral"] ], false, false, false,SearchPhaseRules_search),
                        createTestFennimalObj("Test_D_h", Search_Regions[1], Search_Location_Arr[1][0],  TrainingFennimals.D.head,false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "neutral"],[All_Items[3],"heart"] ], false, false, false,SearchPhaseRules_search),
                        //createTestFennimalObj("Test_E_l", Training_Regions[3], Training_Location_Arr[3][0],  Used_Heads[5],false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "neutral"],[All_Items[3],"heart"] ], false, false, false,SearchPhaseRules_search),
                    ],
                    hint_type: "location",
                    type: "search",
                    Rules: SearchPhaseRules_search
                },
                {
                    Trials: [
                        createTestFennimalObj("Test_Key", Search_Regions[0], Search_Location_Arr[0][0],  TrainingFennimals.A.head,false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "heart"],[All_Items[3],"neutral"] ], false, false, false,SearchPhaseRules_search),
                        createTestFennimalObj("Test_D_h", Search_Regions[1], Search_Location_Arr[1][0],  TrainingFennimals.D.head,false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "neutral"],[All_Items[3],"heart"] ], false, false, false,SearchPhaseRules_search),
                        // createTestFennimalObj("Test_E_l", Training_Regions[3], Training_Location_Arr[3][0],  Used_Heads[5],false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "neutral"],[All_Items[3],"heart"] ], false, false, false,SearchPhaseRules_search),
                    ],
                    hint_type: "location",
                    type: "search",
                    Rules: SearchPhaseRules_search
                },
                {
                    Trials: [
                        createTestFennimalObj("Test_Key", Search_Regions[0], Search_Location_Arr[0][0],  TrainingFennimals.A.head,false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "heart"],[All_Items[3],"neutral"] ], false, false, false,SearchPhaseRules_search),
                        createTestFennimalObj("Test_D_h", Search_Regions[1], Search_Location_Arr[1][0],  TrainingFennimals.D.head,false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "neutral"],[All_Items[3],"heart"] ], false, false, false,SearchPhaseRules_search),
                        //createTestFennimalObj("Test_E_l", Training_Regions[3], Training_Location_Arr[3][0],  Used_Heads[5],false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "neutral"],[All_Items[3],"heart"] ], false, false, false,SearchPhaseRules_search),
                    ],
                    hint_type: "location",
                    type: "search",
                    Rules: SearchPhaseRules_search
                },
                {
                    Trials: [
                        createTestFennimalObj("Test_Key", Search_Regions[0], Search_Location_Arr[0][0],  TrainingFennimals.A.head,false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "heart"],[All_Items[3],"neutral"] ], false, false, false,SearchPhaseRules_search),
                        createTestFennimalObj("Test_D_h", Search_Regions[1], Search_Location_Arr[1][0],  TrainingFennimals.D.head,false, [[All_Items[0], "frown"],[All_Items[1], "frown"],[All_Items[2], "neutral"],[All_Items[3],"heart"] ], false, false, false,SearchPhaseRules_search),
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

            console.log(TrainingFennimals)
            console.log(JSON.parse(JSON.stringify(SearchPhaseSetup)))

            break;

        }
    }

    // CALL FUNCTIONS //
    ////////////////////
    //Call to get return a deepcopy of the training set Fennimals, keyed on location.
    this.get_experiment_code = function(){
        return(exp_code)
    }

    this.getTrainingSetFennimalsKeyedOnLocation = function(){
        //Creating an object to hold all the Fennimals based on location. Empty locations should have a value of false, taken locations should have the Fennimal object.
        //Here we can rely on the assumption that each location will have been used only once.
        let FennimalLocations = {}

        //First retrieving all location names and setting their value in FennimalLocations to false. Note, here we cannot rely on Available_Regions!
        let LocationNames = Param.Available_Location_Names
        for(let i=0;i<LocationNames.length;i++){
            FennimalLocations[LocationNames[i]] = false
        }

        //Now we can go through all the Training set Fennimals and add them to the Fennimal locations
        let Training_Stimuli_In_Array = this.getTrainingSetFennimalsInArray()
        for(let i = 0;i<Training_Stimuli_In_Array.length;i++){
            FennimalLocations[Training_Stimuli_In_Array[i].location] = Training_Stimuli_In_Array[i]
        }


        return(JSON.parse(JSON.stringify(FennimalLocations)))
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

    //Returns the aux data (returns false if no aux data declared)
    this.getAuxData = function(){
        return(JSON.parse(JSON.stringify(AuxData)))
    }



}


