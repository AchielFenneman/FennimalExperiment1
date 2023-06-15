
//Starts with a meaningless seed. Call to start with random seed
RandomNumberGenerator = function(participant_number){
    //Hashing function for small seeds
    function cyrb128(str) {
        let h1 = 1779033703, h2 = 3144134277,
            h3 = 1013904242, h4 = 2773480762;
        for (let i = 0, k; i < str.length; i++) {
            k = str.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }
        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
        return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
    }

    // Mulberry number generator
    function mulberry32(a) {
        return function() {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }

    let hash = cyrb128( "abcd " + participant_number + "random" )[0]

    //Call to get a single random number
    this.rand = mulberry32(hash)

    //Call to reset seed
    this.reseed = function(){
        mulberry32()
    }
}

//Uses Fisher-Yates to shuffle a provided array
function shuffleArray(arr) {
    var j, x, i;
    for (i = arr.length - 1; i > 0; i--) {
        j = Math.floor(RNG.rand() * (i + 1));
        x = arr[i];
        arr[i] = arr[j];
        arr[j] = x;
    }
    return arr;
}

//Creates an array of consequetive integers (inclusive on both ends)
function createConsecutiveArray(from, to){
    let Arr = [];
    for(let i = from; i<=to; i++){
        Arr.push(i)
    }
    return Arr
}

//Given an array, samples N valid index positions, with or without replacement. Returns sampled indexes as an array. If not enough draws can be made, prints a warning and returns false
function drawRandomArrayIndexes(arr, n, replace){
    if(n > arr.length && replace === false){
        console.warn("Attempting to draw " + n + " samples from array of length " + arr.length + " without replacement. Returning false")
        return(false)
    }

    let indexes = createConsecutiveArray(0,arr.length -1)
    let samples = []
    for(let i=0;i<n;i++){
        samples.push(shuffleArray(indexes)[0])
        if(replace === false){
            indexes.splice(0,1)
        }
    }
    return(samples)
}

//Samples N elements from array, with (true) or without (false) replacement. Returns an array of sampled elements
function drawRandomElementsFromArray(arr, n, replace){
    //Draw indexes
    let Sampled_indexes = drawRandomArrayIndexes(arr,n,replace)

    //Fetch the sampled elements
    let Sampled_elements = []
    for(let i =0;i<Sampled_indexes.length;i++){
        Sampled_elements.push(arr[Sampled_indexes[i]])
    }
    return(Sampled_elements)
}

// Returns an array of all indexes of the elements in arr that are equal to val.
function getAllIndexes(arr, val) {
    let indexes = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
}

//If given an array of numerical values, returns an array of indexes referring to the largest N elements of the provided array.
// In case of ties, picks randomly.
function getIndexesOfNSmallestElementsInArray(arr,n){
    //Sort a deep-copy of the array.
    let Sorted_arr = JSON.parse(JSON.stringify(arr))
    Sorted_arr.sort()
    Sorted_arr = [...new Set(Sorted_arr)];

    //Now we can start building a return array.
    // Since there may be ties, we will start filling this array until we get n elements.
    // If some values put us over n (ties), then randomly sample the tied indexes until n is reached
    let ReturnArr = []
    while(ReturnArr.length < n){
        //Splice the first index from the Sorted_arr
        let val = Sorted_arr.splice(0,1)[0]

        //Find all elements in arr that contain this value
        let Indices = getAllIndexes(arr,val)

        //Check if adding these indices to the return array would overshoot our number n.
        if(ReturnArr.length + Indices.length > n){
            // Now we need to randomly sample a few incides until we max out at n
            let sampledIndices = drawRandomElementsFromArray(Indices, n - ReturnArr.length, false)
            for(let i = 0;i<sampledIndices.length;i++){
                ReturnArr.push(sampledIndices[i])
            }
        }else{
            //Nope, were good. Add all the indices
            for(let i = 0;i<Indices.length;i++){
                ReturnArr.push(Indices[i])
            }
        }
    }
    return(ReturnArr)
}

//Returns EU distance between two two-dimensional points
function EUDist(x1,y1,x2,y2){
    let a = x1 - x2
    let b = y1 - y2
    return(Math.sqrt(a*a + b*b))
}

//Returns an SVG point denoting the VIEWBOX COORDINATES of the given Elem.
function getViewBoxCenterPoint(Elem) {
    let SVG = Elem.ownerSVGElement;

    //The untransformed coordinates
    let BBox = Elem.getBBox()

    //Set a point at the CENTER of the original position
    let pt = SVG.createSVGPoint();
    pt.x = BBox.x + 0.5 * BBox.width;
    pt.y = BBox.y + 0.5 * BBox.height;

    //Apply transformations and return
    return( pt.matrixTransform(getTransformToElement(Elem,SVG)))
}

function getTransformToElement(fromElement, toElement) {
    return toElement.getCTM().inverse().multiply(fromElement.getCTM());
}

function translate_pos_relative(Elem, delta_x,delta_y){
    let trans = Elem.transform.baseVal.getItem(0)
    let mat = trans.matrix
    mat = mat.translate( 1 *delta_x, 1 * delta_y );
    trans.setMatrix(mat)
}

//Translates center of the Elem element to a given x and y position
function MoveElemToCoords(Elem, x, y){
    //Get original positions of Elems, in the form of two svg points
    let original_pt = getViewBoxCenterPoint(Elem);

    //Now figure out how much we will have to translate the Element by
    let delta_x = x - original_pt.x
    let delta_y = y - original_pt.y

    //Transform the Elem
    let has_previous_transform = Elem.transform.baseVal.length !== 0
    let matrix = {}

    if(!has_previous_transform){
        Elem.setAttribute("transform","translate(0.00001,0.00001)")
    }

    let transform = Elem.transform.baseVal.getItem(0)
    matrix = transform.matrix;
    matrix = matrix.translate( delta_x,  delta_y );
    Elem.transform.baseVal.getItem(0).setMatrix( matrix );
}

//Rotates the Element via a transformation matrix (keeping original transformation intact)
function RotateElem(Elem, degrees){
    let has_previous_transform = Elem.transform.baseVal.length !== 0
    let matrix = {}

    if(!has_previous_transform){
        Elem.setAttribute("transform","translate(0.00001,0.00001)")
    }
    let transform = Elem.transform.baseVal.getItem(0)
    matrix = transform.matrix;
    matrix = matrix.rotate(degrees , )
    Elem.transform.baseVal.getItem(0).setMatrix( matrix );
}


//Get the mouse position ON THE SVG ELEMENT
function getMousePosition(evt) {
    let CTM = SVGObjects.SVG.getScreenCTM();
    if (evt.touches) { evt = evt.touches[0]; }
    return {
        x: Math.round((evt.clientX - CTM.e) / CTM.a),
        y: Math.round((evt.clientY - CTM.f) / CTM.d)
    };
}

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(RNG.rand() * (max - min + 1) + min)
}

//Shifts the indexes of an array by n values. That is, moves the last n elements to the front
function shift_array_values_by_n(Arr, n){
    let NewArr = JSON.parse(JSON.stringify(Arr))
    for(let i =0;i<n;i++){
        NewArr.push(NewArr.splice(0,1)[0])
    }
    return NewArr
}

//USES AN UNSEEDED RANDOM DRAW!
function draw_random_participant_seed(){
    //Draws a random integer between 1100 and 2000
    return Math.floor(Math.random() * (2000 - 1100 + 1) + 1100)

}

//When assigned to a button press, enables the fullscreen
function toggleFullscreen(event) {
    var element = document.body;

    if (event instanceof HTMLElement) {
        element = event;
    }

    var isFullscreen = document.webkitIsFullScreen || document.mozFullScreen || false;

    element.requestFullScreen = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || function() {
        return false;
    };
    document.cancelFullScreen = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || function() {
        return false;
    };

    isFullscreen ? document.cancelFullScreen() : element.requestFullScreen();
}
//Call to show an ingame hint. Note that this hint appears all the way at the top of the document.
function show_ingame_hint(x,y,width,height,text){
    //Make sure that the ingame hint layer is displayed
    SVGObjects.Layers.IngameHints.style.display = "inherit"

    //Clear the previous text (if any exists) by setting the innerHTML of the IngameHintbox empty
    SVGObjects.IngameHintBox.innerHTML = ""

    //Insert a foreignObject to contain the text HTML
    let TextBoxContainer = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
    TextBoxContainer.setAttribute("x", x)
    TextBoxContainer.setAttribute("y", y)
    TextBoxContainer.setAttribute("width", width)
    TextBoxContainer.setAttribute("height", height)
    TextBoxContainer.classList.add("ingame_hint_container")

    SVGObjects.IngameHintBox.appendChild(TextBoxContainer)

    //Insert a P to the foreignObject. Make sure to set the correct class for the CSS
    let TextBox = document.createElement("p")
    TextBox.classList.add("ingame_hint_text")
    TextBoxContainer.appendChild(TextBox)

    //Set text to the P
    TextBox.innerHTML = text
}

//Call to clear any existing in-game hints
function clear_ingame_hint(){
    SVGObjects.IngameHintBox.innerHTML = ""
}

//Splits an Array into sub-arrays of N elements each. Returns an array of arrays, and the remainder will form the last array
function SplitArrayIntoParts(arr, size_per_part){
    let Arrcopy = JSON.parse(JSON.stringify(arr))
    let Segments = []
    while(Arrcopy.length > size_per_part){
        Segments.push(Arrcopy.splice(0,size_per_part))
    }
    //Then take the remaining elements to form the final segment.
    Segments.push(Arrcopy)
    return(Segments)
}

STIMULUSDATA = function(participant_number){
    // SETTING STIMULUS PARAMETERS //
    /////////////////////////////////
    //Determines the number of location-based pairs in the training set (two different Fennimals in different locations of the same region)
    let location_pairs_in_training_set = 2
    //Determines the number of type-based pairs in the training set (two of the same Fennimals in different regions)
    let type_pairs_in_training_set = 1

    // TODO: REMOVE FOR ACTUAL EXPERIMENT. In actual experiment, define pairs directly. This is just for pilotting purposes!
    if(Math.random() > 0.5){
        location_pairs_in_training_set = 3
        type_pairs_in_training_set = 0
    }else{
        location_pairs_in_training_set = 0
        type_pairs_in_training_set = 3
    }

    //If set to TRUE, then the tertiary color of a Fennimal is always set to equal the location of the Fennimal.
    //If set to FALSE, then tertiary colors are (pseudo)randomly assigned
    let tertiary_colors_based_on_location = false

    // This governs the logic for the color scheme sampling. There are three ways to determine the primary and secondary color schemes.
    //      unique: all Fennimals will have a unique color scheme. Sampled to be differentiated (different primary colors) between training pairs AND between training / test.
    //      both_training_same: pairs in the same training pair will have the same color scheme, each of the test trials will have a different color scheme (sampled to be differentiated)
    //      training_test_same: each training trial will have a different color scheme (sampled to be differentiated within a pair), each test trial matches its associated training trial
    //      location: colors are always set to match the color schemes of the regions in which the Fennimals reside.
    let color_sampling_method = "location"

    // Defines the maximum number of test trials.
    // Note that for some combinations of location and type pairs, the actual number of possible unique test trials can be substantially lower than this.
    //      The strongest limiting factor here is the number of regions.
    //          There are 8 regions in total. Each type pair consumes 2 region, each location pair consumes 1 region.
    //          Each remaining region contributes 2 possible locations for each trial.
    // The number of possible test trials is determined as: (8-consumed regions)*2( locations per remaining region) * (total number of pairs)
    //  If the number of max test trials is set to lower than this amount, test trials will be sampled across pairs to be as uniform over the remaining locations as possible.
    let max_number_of_test_trials_per_training_trial = 2

    // If set to true, includes the training set Fennimals in the test phase. If set to false, then the test phase only includes new Fennimals
    let include_training_fennimals_in_test_set = true

    //Determines how the items are paired to the Fennimals. Allows for the following two inputs:
    //      unique: all training-set Fennimals will be associated to a different item. Requires 2*(total number of pairs) items to be available. Will throw an error if there are more Fennimals that need to be generated
    //      paired: each item occurs twice - but no two items ever co-occur more than once. Associates Fennimals in pair [i in 0 to n] with items [i, i+1]. Exception for pair n, which will take [i,0]\
    let item_sampling_method = "unique"

    //Do not touch. Determines the total number of test trials that are going to be generated with the specified parameters.
    //  Note that each unique trial will be shown twice: for both direct and indirect versions.
    function get_total_number_of_unique_test_trials(){
        let number_of_available_regions = Param.region_Names.length - 1 //Removing Home as an available region for Fennimal trials.
        let number_of_available_Fennimal_types = Param.Available_Fennimals.length

        let total_number_of_pairs = location_pairs_in_training_set + type_pairs_in_training_set

        let number_of_regions_consumed_during_training = location_pairs_in_training_set + 2*type_pairs_in_training_set
        let number_of_locations_available_for_test_trials = (number_of_available_regions - number_of_regions_consumed_during_training) * 2

        let number_of_types_consumed_during_training = number_of_available_Fennimal_types - (type_pairs_in_training_set + 2*location_pairs_in_training_set)
        let number_of_types_available_for_test_trials = number_of_available_Fennimal_types - number_of_types_consumed_during_training

        return( Math.min(
            max_number_of_test_trials_per_training_trial * total_number_of_pairs * 2, //Maximum number determined above.
            number_of_locations_available_for_test_trials * 2 * total_number_of_pairs ,//Maximum number constrained by the unconsumed locations. Test trials for the type pairs do not require any new locations, but each available location contributes 2 trials for each location pair
            number_of_types_available_for_test_trials * 2 * total_number_of_pairs //Maximum number as constrained by the unconsumed types. Test trials for the location pairs do not require any new types, but each type can contribute at most 2 trials for each available type pair.
        ))
    }
    let number_unique_test_trials = get_total_number_of_unique_test_trials()

    //Now we can print some data to the console to confirm the number of test and training trials. Note that each test trial comes in two flavors (with identical Fennimals / locations): a direct and indirect version.
    if(include_training_fennimals_in_test_set){
        console.log("%c Generating " + (2*(location_pairs_in_training_set + type_pairs_in_training_set)) + " training trials and " + (number_unique_test_trials*2 + 2*(location_pairs_in_training_set + type_pairs_in_training_set)) + " test trials (" + number_unique_test_trials + " direct and indirect, plus "+ 2*(location_pairs_in_training_set + type_pairs_in_training_set) +  " repeated training trials)", 'background:lightblue')
    }else{
        console.log("%c Generating " + (2*(location_pairs_in_training_set + type_pairs_in_training_set)) + " training trials and " + (number_unique_test_trials*2) + " test trials (" + number_unique_test_trials + " direct and indirect)", 'background:lightblue')
    }

    // RESETTING THE RNG SEED HERE //
    ////////////////////////////////
    // NO CALLS TO RANDOMIZATION SHOULD BE MADE ABOVE THIS LINE //
    RNG = new RandomNumberGenerator(participant_number)

    // CREATING ALL THE FENNIMAL OBJECTS (SANS COLORS) HERE //
    //The following two variables keep track of which regions have been assigned in the stimulus creating process.
    let Available_Types = JSON.parse(JSON.stringify(Param.Available_Fennimals))

    //Shuffling
    shuffleArray(Available_Types)

    //Creating each pair as an element in an array (each element containing an array of two objects). Here we initialize the FennimalObjects.
    // Regions are draw by order of inclusion (to maximize dis-similarity for the training pairs)
    let Available_Regions = JSON.parse(JSON.stringify(Param.region_names_by_order_of_inclusion))
    let Regions_for_training_pairs = shuffleArray( Available_Regions.splice(0,location_pairs_in_training_set + 2*type_pairs_in_training_set) )

    let TrainingPairs = []
    //Adding the location pairs
    for(let i = 0; i<location_pairs_in_training_set;i++){
        //Destructively draw a region and randomly sample the associated locations to A and B
        let sampled_region = Regions_for_training_pairs.splice(0,1)[0]
        let sampled_locations = shuffleArray(JSON.parse(JSON.stringify(Param.RegionData[sampled_region].Locations)))

        //Destructively draw two types (A and B)
        let sampled_type_A = Available_Types.splice(0,1)[0]
        let sampled_type_B = Available_Types.splice(0,1)[0]

        //Determine the names
        let name_A = Param.RegionData[sampled_region].prefix + " " + sampled_type_A
        let name_B = Param.RegionData[sampled_region].prefix + " " + sampled_type_B

        //Push to TrainingPairs
        TrainingPairs.push([
            {name: name_A, type: sampled_type_A, region: sampled_region, location: sampled_locations[0], pairtype: "location"},
            {name: name_B, type: sampled_type_B, region: sampled_region, location: sampled_locations[1], pairtype: "location"}, ])
    }

    //Adding the type pairs
    for(let i =0; i<type_pairs_in_training_set; i++){
        //Destructively draw two regions, and randomly sample a location from either
        let sampled_region_A = Regions_for_training_pairs.splice(0,1)[0]
        let sampled_region_B = Regions_for_training_pairs.splice(0,1)[0]

        let sampled_location_A = shuffleArray(JSON.parse(JSON.stringify(Param.RegionData[sampled_region_A].Locations)))[0]
        let sampled_location_B = shuffleArray(JSON.parse(JSON.stringify(Param.RegionData[sampled_region_B].Locations)))[0]

        //Destructively sample one type
        let sampled_type = Available_Types.splice(0,1)[0]

        //Determine the names
        let name_A = Param.RegionData[sampled_region_A].prefix + " " + sampled_type
        let name_B = Param.RegionData[sampled_region_B].prefix + " " + sampled_type

        // Push to TrainingPairs
        TrainingPairs.push([
            {name: name_A, type: sampled_type, region: sampled_region_A, location: sampled_location_A, pairtype: "type"},
            {name: name_B, type: sampled_type, region: sampled_region_B, location: sampled_location_B, pairtype: "type"}])
    }

    //Shuffle the pairs
    shuffleArray(TrainingPairs)

    // SETTING THE ITEMS USED
    // Algorithm used is defined above
    let Items_Used_In_Experiment
    switch(item_sampling_method){
        case("unique"):
            let number_of_items_required = 2 * (type_pairs_in_training_set + location_pairs_in_training_set)
            if(number_of_items_required > Param.Available_items.length){
                console.error("Attempting to assign more items (" + number_of_items_required + ") than available in Parameters (" + Param.Available_items.length + ")" )
            }else{
                Items_Used_In_Experiment = drawRandomElementsFromArray(Param.Available_items, number_of_items_required, false )
            }
            break
        case("paired"):
            Items_Used_In_Experiment = drawRandomElementsFromArray(Param.Available_items, type_pairs_in_training_set + location_pairs_in_training_set, false )
            break
    }

    //Given an array of used items, generates the set of items used and their color. Stores in Item_Details an object keyed on the item names, with two properties: location_on_screen (numeric) and backgroundColor
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
    let Item_Details = generate_item_details(Items_Used_In_Experiment)

    //Assign items to the pairs
    switch (item_sampling_method){
        case("unique"):
            let Random_Items = shuffleArray(JSON.parse(JSON.stringify(Item_Details.All_Items)))

            for(let i =0;i<TrainingPairs.length;i++){
                // The first pair should have items [0,1]. The second pair should have [2,3] ... the last pair should have [2n-1,2n], with n being the number of pairs.
                //      Hence: pair i should have items [2i, 2i+1], with i starting at 0
                TrainingPairs[i][0].item = Random_Items[2*i]
                TrainingPairs[i][1].item = Random_Items[2*i + 1]
            }
            break
        case("paired"):
                        for(let i =0;i<TrainingPairs.length;i++){
                // The first pair should have items [1,2]. The second pair should have [2,3] ... the last pair should have [n,1], with n being the number of pairs.
                //Select the correct two items. For all but the last pair this should be [i,i+1] of UsedItems. For the last pair it should be [i,0]

                let item_A = Item_Details.All_Items[i]
                let item_B
                if(i === TrainingPairs.length-1){
                    item_B = Item_Details.All_Items[0]
                }else {
                    item_B = Item_Details.All_Items[i+1]
                }

                //Assigning items
                TrainingPairs[i][0].item = item_A
                TrainingPairs[i][1].item = item_B
            }
            break
    }

    // GENERATING THE TEST TRIALS
    // If possible, we would like the test trials to be as unique as possible. Therefore, we'll spread out the available locations (not regions!) and types as much as possible
    let UseCountsOfAvailableTypes = {}
    for(let i = 0;i<Available_Types.length;i++){
        UseCountsOfAvailableTypes[Available_Types[i]] = 0
    }

    let UseCountsOfAvailableLocations = {}
    for(let i=0; i<Available_Regions.length;i++){
        UseCountsOfAvailableLocations[ Param.RegionData[Available_Regions[i]].Locations[0]  ] = 0
        UseCountsOfAvailableLocations[ Param.RegionData[Available_Regions[i]].Locations[1]  ] = 0
    }

    //Now we shuffle the training pairs again, to prevent any unwanted patterns to pop up later.
    shuffleArray(TrainingPairs)

    //This helper function takes a Count object (that is, an object where each property has a positive integer value) and returns an array of keys with n elements with the lowest counts (no replacements, ties broken randomly)
    function get_n_elements_with_lowest_counts(n, CountObj){
        let Arr = []
        let Properties = Object.getOwnPropertyNames(CountObj)
        for(let i=0;i<Properties.length;i++){
            Arr.push(CountObj[Properties[i]])
        }

        //Picking the element with the highest number of remaining options (i.e., the one least used yet). Break ties at random. This will be our P1 color
        let Sampled_Indexes = getIndexesOfNSmallestElementsInArray(Arr,n)
        let Arr_Out = []
        for(let i = 0;i<n;i++){
            Arr_Out.push(Properties[Sampled_Indexes[i]])
        }
        return(Arr_Out)
    }

    //Determining the maximum number of test trials that can be constructed for each training trial (NB: not per pair, but per individual trial!).
    //  For every location_pair training trial, we can construct one test trial for each available location (using the same Fennimal as from the training trial)
    //  For every type_pair training trial, we can construct one test trial for each available type (using the same Region [but different location] as the training trial).
    //  We want to avoid having different numbers of test trials for location versus type pairs, so the minimum of these restrictions counts.
    //      In addition, the number of test trials per training trial may be limited by the input given above.
    //      If there is a restriction, we want to vary the locations and types used as much as possible.
    let number_of_available_locations = Object.getOwnPropertyNames(UseCountsOfAvailableLocations).length
    let number_of_available_types = Object.getOwnPropertyNames(UseCountsOfAvailableTypes).length
    let number_of_test_trials_per_training_trial = Math.min(number_of_available_locations, number_of_available_types, max_number_of_test_trials_per_training_trial)

    let TestTrialsPerPair = []
    for(let i = 0; i<TrainingPairs.length;i++){
        let pair_type = TrainingPairs[i][0].pairtype
        let AssociatedTestTrials = [[],[]]

        if(pair_type === "location"){
            for(let num_in_pair = 0; num_in_pair <= 1; num_in_pair++){
                let TrainingTrial = TrainingPairs[i][num_in_pair]

                //Find the n least used locations.
                let Sampled_Locations = get_n_elements_with_lowest_counts(number_of_test_trials_per_training_trial, UseCountsOfAvailableLocations)

                //Creating the Fennimal object (sans color scheme!)
                for(let location_ind = 0; location_ind < Sampled_Locations.length; location_ind++){
                    //The test trials associated to a location pair always have one of the pair's Fennimals
                    let TestFennimal = {
                        type: TrainingTrial.type,
                        location: Sampled_Locations[location_ind],
                        region: Param.get_region_of_location(Sampled_Locations[location_ind]),
                        name: Param.RegionData[ Param.get_region_of_location(Sampled_Locations[location_ind]) ].prefix + " " + TrainingTrial.type,
                    }

                    //Finding direct and indirectly associated items
                    if(num_in_pair === 0 ){
                        TestFennimal.direct_item = TrainingPairs[i][0].item
                        TestFennimal.indirect_item = TrainingPairs[i][1].item
                    }else{
                        TestFennimal.direct_item = TrainingPairs[i][1].item
                        TestFennimal.indirect_item = TrainingPairs[i][0].item
                    }

                    //Incrementing the locations used count
                    UseCountsOfAvailableLocations[Sampled_Locations[location_ind]] = UseCountsOfAvailableLocations[Sampled_Locations[location_ind]] + 1

                    //Push to the output array
                    AssociatedTestTrials[num_in_pair].push(TestFennimal)
                }
            }
        }

        if(pair_type === "type"){
            for(let num_in_pair = 0; num_in_pair <= 1; num_in_pair++){
                let TrainingTrial = TrainingPairs[i][num_in_pair]

                //Find the n least used types
                let Sampled_Types = get_n_elements_with_lowest_counts(number_of_test_trials_per_training_trial, UseCountsOfAvailableTypes)

                //Creating the Fennimal object (sans color scheme!)
                for(let type_ind = 0; type_ind < Sampled_Types.length; type_ind++){
                    //The test trials associated to a location pair always have one of the pair's Fennimals
                    let TestFennimal = {
                        type: Sampled_Types[type_ind],
                        location: TrainingTrial.location,
                        region: Param.get_region_of_location(TrainingTrial.location),
                        name: Param.RegionData[ Param.get_region_of_location(TrainingTrial.location) ].prefix + " " + Sampled_Types[type_ind]
                    }

                    //Finding direct and indirectly associated items
                    if(num_in_pair === 0 ){
                        TestFennimal.direct_item = TrainingPairs[i][0].item
                        TestFennimal.indirect_item = TrainingPairs[i][1].item
                    }else{
                        TestFennimal.direct_item = TrainingPairs[i][1].item
                        TestFennimal.indirect_item = TrainingPairs[i][0].item
                    }

                    //Incrementing the locations used count
                    UseCountsOfAvailableTypes[Sampled_Types[type_ind]] = UseCountsOfAvailableTypes[Sampled_Types[type_ind]] + 1

                    //Push to the output array
                    AssociatedTestTrials[num_in_pair].push(TestFennimal)
                }
            }
        }
        TestTrialsPerPair.push(AssociatedTestTrials)
    }

    //Collapses the ColorAvailable object (assumed to be an object with one key for each color, each containing an array for available secondary colors) to a singe array of available color pairs.
    // Each color pair is represented as an object with {primary_color, secondary_color}  properties
    function collapse_ColorsAvailable_to_array(_ColorsAvailable){
        let Arr = []
        for(let color in _ColorsAvailable){
            for(let i =0;i<_ColorsAvailable[color].length;i++){
                Arr.push({primary_color: color, secondary_color: _ColorsAvailable[color][i]})
            }
        }
        return(Arr)
    }

    //Collapses a given object to an array. Ignores all keys, simply returns an array of all values
    function collapse_Obj_to_array(_Obj){
        let Arr = []
        for(let key in _Obj){
            Arr.push(_Obj[key])
        }
        return(Arr)
    }

    //Now we can assign all the colors. Here the process differs based on which sampling method is used.
    let ColorScheme, ColorsAvailable, Primary_Colors_Available, Secondary_Colors_Available, Tertiary_Colors_Available

    switch(color_sampling_method){
        case("unique"):
            // Here we take the most distinct approach: each Fennimal should have a unique color scheme.
            //      Training pairs should be selected to have the most distinct colors.
            //      Next, test trials should have color schemes that are distinct from both training pairs.
            ColorScheme = new FENNIMALCOLORSCHEMES(2 * (location_pairs_in_training_set + type_pairs_in_training_set))

            //First randomly shuffle all the availalbe colors
            Primary_Colors_Available = shuffleArray( ColorScheme.getColorBases())

            // Shifting the secondary colors by 3 indexes prevents unwanted patterns.
            Secondary_Colors_Available = shift_array_values_by_n(Primary_Colors_Available,3)

            // Tertiary colors can be sampled randomly
            Tertiary_Colors_Available = shift_array_values_by_n(Primary_Colors_Available,5)

            //Creating an object that holds all combinations of primary and secondary colors (monochrome pairs not allowed).
            ColorsAvailable = ColorScheme.getKeyedColorSchemeObject(true)

            //Store the colors used for the training pairs
            let ColorsUsedByTrainingPairs = []

            //Setting colors for all the training stimuli
            for(let i =0; i<TrainingPairs.length;i++){
                //Transforming to HEX values
                let primary_color_A = ColorScheme.getColorSchemes().PrimaryColors[Primary_Colors_Available[2*i]]
                let primary_color_B = ColorScheme.getColorSchemes().PrimaryColors[Primary_Colors_Available[2*i + 1]]
                let secondary_color_A = ColorScheme.getColorSchemes().SecondaryColors[Secondary_Colors_Available[2*i]]
                let secondary_color_B = ColorScheme.getColorSchemes().SecondaryColors[Secondary_Colors_Available[2*i +1]]
                let tertiary_color_A =  ColorScheme.getColorSchemes().TertiaryColors[Tertiary_Colors_Available[2*i]]
                let tertiary_color_B =  ColorScheme.getColorSchemes().TertiaryColors[Tertiary_Colors_Available[2*i + 1]]

                //If the tertiary colors should be based on the location, then overwrite these values
                if(tertiary_colors_based_on_location){
                    tertiary_color_A = Param.RegionData[TrainingPairs[i][0].region].color
                    tertiary_color_B = Param.RegionData[TrainingPairs[i][1].region].color
                }

                TrainingPairs[i][0].primary_color = primary_color_A
                TrainingPairs[i][0].secondary_color = secondary_color_A
                TrainingPairs[i][0].tertiary_color = tertiary_color_A

                TrainingPairs[i][1].primary_color = primary_color_B
                TrainingPairs[i][1].secondary_color = secondary_color_B
                TrainingPairs[i][1].tertiary_color = tertiary_color_B

                //Removing these color combinations from the ColorsAvailable object
                ColorsUsedByTrainingPairs.push([
                    {primary_color: Primary_Colors_Available[2*i], secondary_color: Secondary_Colors_Available[2*i], tertiary_color: Tertiary_Colors_Available[2*i]},
                    {primary_color: Primary_Colors_Available[2*i+1], secondary_color: Secondary_Colors_Available[2*i+1], tertiary_color: Tertiary_Colors_Available[2*i+1]}])

                ColorsAvailable[Primary_Colors_Available[2*i]] = ColorsAvailable[Primary_Colors_Available[2*i]].filter(e => e !== Secondary_Colors_Available[2*i])
                ColorsAvailable[Primary_Colors_Available[2*i+1]] = ColorsAvailable[Primary_Colors_Available[2*i+1]].filter(e => e !== Secondary_Colors_Available[2*i+1])
            }

            //For each set of test stimili, we draw primary and secondary colors NOT in the relevant training set.
            for(let i =0;i<TrainingPairs.length;i++){
                //Retrieve the primary and secondary colors already used by this pair
                let TrainingPair_ColorsUsed = ColorsUsedByTrainingPairs[i]

                //Make a deep copy of the ColorsAvailable
                let ColorsAvailableCopy = JSON.parse(JSON.stringify(ColorsAvailable))

                //Remove the primary colors already used
                delete ColorsAvailableCopy[TrainingPair_ColorsUsed[0].primary_color]
                delete ColorsAvailableCopy[TrainingPair_ColorsUsed[1].primary_color]
                delete ColorsAvailableCopy[TrainingPair_ColorsUsed[0].secondary_color]
                delete ColorsAvailableCopy[TrainingPair_ColorsUsed[1].secondary_color]

                //Remove the secondary colors already used
                for(let color in ColorsAvailableCopy){
                    ColorsAvailableCopy[color] = ColorsAvailableCopy[color].filter(e => e !== TrainingPair_ColorsUsed[0].primary_color &&
                        e !== TrainingPair_ColorsUsed[1].primary_color &&
                        e !== TrainingPair_ColorsUsed[0].secondary_color &&
                        e !== TrainingPair_ColorsUsed[1].secondary_color)
                }

                //Now for each training trial we draw one available primary color (trying to spread out the drawn primary colors as much as possible)
                // Then we draw one secondary color that is available for this primary color (again trying to spread out the drawn secondary colors as much as possible).
                let PrimaryColorsCount = {}
                let SecondaryColorsCount = {}
                for(let color in ColorsAvailableCopy){
                    PrimaryColorsCount[color] = 0
                    SecondaryColorsCount[color] = 0
                }

                for(let num_in_pair = 0;num_in_pair<=1;num_in_pair++){
                    for(let test_trial_index = 0; test_trial_index<TestTrialsPerPair[i][num_in_pair].length; test_trial_index++){
                        //Draw a primary color
                        let primary_color_name = get_n_elements_with_lowest_counts(1,PrimaryColorsCount)[0]

                        //Find which secondary colors are available
                        let Secondary_Colors_Available = ColorsAvailableCopy[primary_color_name]

                        //Create a copy of the SecondaryCount colors object, and delete any colors not currently available
                        let SecondaryColorsCountCopy = JSON.parse(JSON.stringify(SecondaryColorsCount))
                        for(let x = 0; x<Object.getOwnPropertyNames(SecondaryColorsCountCopy).length;x++){
                            if(! Secondary_Colors_Available.includes(Object.getOwnPropertyNames(SecondaryColorsCountCopy)[x])){
                                delete SecondaryColorsCountCopy[Object.getOwnPropertyNames(SecondaryColorsCountCopy)[x]]
                            }
                        }

                        //Draw the secondary color with the lowest usage in these test trials
                        let secondary_color_name = get_n_elements_with_lowest_counts(1,SecondaryColorsCountCopy)[0]

                        //Now we have the color names for the primary and secondary color. Transforming to HEX values.
                        let primary_color = ColorScheme.getColorSchemes().PrimaryColors[primary_color_name]
                        let secondary_color = ColorScheme.getColorSchemes().SecondaryColors[secondary_color_name]

                        // Determining tertiary color. This can be any color NOT used in the test sets.
                        let tertiary_colors_available = Object.getOwnPropertyNames(ColorScheme.getColorSchemes().TertiaryColors).filter(e =>
                            e !== TrainingPair_ColorsUsed[0].primary_color &&
                            e !== TrainingPair_ColorsUsed[1].primary_color &&
                            e !== TrainingPair_ColorsUsed[0].secondary_color &&
                            e !== TrainingPair_ColorsUsed[1].secondary_color &&
                            e !== TrainingPair_ColorsUsed[0].tertiary_color &&
                            e !== TrainingPair_ColorsUsed[1].tertiary_color )
                        let tertiary_color = ColorScheme.getColorSchemes().TertiaryColors[drawRandomElementsFromArray(tertiary_colors_available, 1, false)[0]]
                        if(tertiary_colors_based_on_location){
                            tertiary_color = Param.RegionData[TrainingPairs[i][num_in_pair].region].color // TestTrialsPerPair[i][num_in_pair][test_trial_index].location
                        }

                        //Setting the correct colors to the FennimalObj in the training trial
                        TestTrialsPerPair[i][num_in_pair][test_trial_index].primary_color = primary_color
                        TestTrialsPerPair[i][num_in_pair][test_trial_index].secondary_color = secondary_color
                        TestTrialsPerPair[i][num_in_pair][test_trial_index].tertiary_color = tertiary_color

                        //Increment the counting objects
                        PrimaryColorsCount[primary_color_name]++// = PrimaryColorsCount[primary_color_name] + 1
                        SecondaryColorsCount[secondary_color_name]++

                    }
                }
            }
            break
        case("train_test_same"):
            // Here each training pair has two distinct color schemes.
            // We need to draw for different colors for each pair. Plus, we want these colors to be as different as possible between pairs.
            //      We do this by having each pair have 2 primary colors drawn
            //      The next pair then has these secondary colors as its primary colors, and a new set as secondary colors.
            // Next, all test trials use the color scheme of their associated training trial.
            ColorScheme = new FENNIMALCOLORSCHEMES(2 * (location_pairs_in_training_set + type_pairs_in_training_set))

            //First randomly shuffle all the availalbe colors
            Primary_Colors_Available = shuffleArray( ColorScheme.getColorBases())

            // Shifting the secondary colors by 3 indexes prevents unwanted patterns.
            Secondary_Colors_Available = shift_array_values_by_n(Primary_Colors_Available,3)

            // Tertiary colors can be set to be the same hue as the secondary color
            Tertiary_Colors_Available = shift_array_values_by_n(Primary_Colors_Available,5)

            //Setting colors for all the training stimuli
            for(let i =0; i<TrainingPairs.length;i++){
                //Transforming to HEX values
                let primary_color_A = ColorScheme.getColorSchemes().PrimaryColors[Primary_Colors_Available[2*i]]
                let primary_color_B = ColorScheme.getColorSchemes().PrimaryColors[Primary_Colors_Available[2*i + 1]]
                let secondary_color_A = ColorScheme.getColorSchemes().SecondaryColors[Secondary_Colors_Available[2*i]]
                let secondary_color_B = ColorScheme.getColorSchemes().SecondaryColors[Secondary_Colors_Available[2*i +1]]
                let tertiary_color_A =  ColorScheme.getColorSchemes().TertiaryColors[Tertiary_Colors_Available[2*i]]
                let tertiary_color_B =  ColorScheme.getColorSchemes().TertiaryColors[Tertiary_Colors_Available[2*i + 1]]

                //If the tertiary colors should be based on the location, then overwrite these values
                if(tertiary_colors_based_on_location){
                    tertiary_color_A = Param.RegionData[TrainingPairs[i][0].region].color
                    tertiary_color_B = Param.RegionData[TrainingPairs[i][1].region].color
                }

                TrainingPairs[i][0].primary_color = primary_color_A
                TrainingPairs[i][0].secondary_color = secondary_color_A
                TrainingPairs[i][0].tertiary_color = tertiary_color_A

                TrainingPairs[i][1].primary_color = primary_color_B
                TrainingPairs[i][1].secondary_color = secondary_color_B
                TrainingPairs[i][1].tertiary_color = tertiary_color_B
            }

            //Now we can assign colors to the Test stimuli
            for(let i =0;i<TrainingPairs.length;i++){
                for(let num_in_pair = 0;num_in_pair<=1;num_in_pair++){
                    let AssociatedTrainingTrial = TrainingPairs[i][num_in_pair]
                    for(let test_trial_index = 0; test_trial_index<TestTrialsPerPair[i][num_in_pair].length; test_trial_index++){
                        TestTrialsPerPair[i][num_in_pair][test_trial_index].primary_color = AssociatedTrainingTrial.primary_color
                        TestTrialsPerPair[i][num_in_pair][test_trial_index].secondary_color = AssociatedTrainingTrial.secondary_color
                        TestTrialsPerPair[i][num_in_pair][test_trial_index].tertiary_color = AssociatedTrainingTrial.tertiary_color
                    }
                }
            }
            break
        case("both_training_same"):
        //Here each training pair has the same primary and second color schemes. The test trials can have any color scheme, as long as their colors do not overlap with this primary / secondary pair.
        //So: we first determine the colors for each training pair. We sample primary and secondary colors to equally spread over the available colors. Sample destructively from ColorsAvailable.
            //Creating colorscheme
            ColorScheme = new FENNIMALCOLORSCHEMES(location_pairs_in_training_set + type_pairs_in_training_set + number_of_test_trials_per_training_trial)
            ColorsAvailable = ColorScheme.getKeyedColorSchemeObject(true)
            let Color_Names = shuffleArray(Object.getOwnPropertyNames(ColorsAvailable))

            //Here we want each training PAIR to have a unique combination of colors. Hence, we can have each pair have the colors [n,n+1] (save for the last, which should be [n,0]
            let ColorsPerTrainingPair = []
            for(let i =0;i<TrainingPairs.length;i++){
                let primary_color = Color_Names[i]
                let secondary_color
                if(i === TrainingPairs.length-1){
                    secondary_color = Color_Names[0]
                }else{
                    secondary_color = Color_Names[i+1]
                }

                //Remove this color combo from ColorsAvailable and pushing the color scheme to the ColorsPerTrainingPair array
                ColorsAvailable[primary_color] = ColorsAvailable[primary_color].filter(e => e !== secondary_color)
                ColorsPerTrainingPair.push([{primary_color: primary_color, secondary_color: secondary_color}, {primary_color: primary_color, secondary_color: secondary_color}])

                //Determining tertiary color pairs. These can either be randomly sampled, or based on location
                let tertiary_color_A = ColorScheme.getColorSchemes().TertiaryColors[secondary_color]
                let tertiary_color_B = ColorScheme.getColorSchemes().TertiaryColors[secondary_color]

                if(tertiary_colors_based_on_location){
                    tertiary_color_A = Param.RegionData[TrainingPairs[i][0].region].color
                    tertiary_color_B = Param.RegionData[TrainingPairs[i][1].region].color
                }

                //Set the correct colors to the FennimalObj
                TrainingPairs[i][0].primary_color = ColorScheme.getColorSchemes().PrimaryColors[primary_color]
                TrainingPairs[i][0].secondary_color = ColorScheme.getColorSchemes().SecondaryColors[secondary_color]
                TrainingPairs[i][0].tertiary_color = tertiary_color_A

                TrainingPairs[i][1].primary_color = ColorScheme.getColorSchemes().PrimaryColors[primary_color]
                TrainingPairs[i][1].secondary_color = ColorScheme.getColorSchemes().SecondaryColors[secondary_color]
                TrainingPairs[i][1].tertiary_color = tertiary_color_B
            }

            //Now we can go over the test trials. Each test is NOT allowed to have any of the colors in the training pair.
            //  Any other color combination is allowed. Attempt to sample evenly over the remaining available color combinations.
            for(let i =0;i<TestTrialsPerPair.length;i++){
                //Make a deepcopy of the ColorsAvailable object and remove any color combinations which contain the primary and secondary colors of the training trial
                let primary_color_in_training_trials = ColorsPerTrainingPair[i][0].primary_color
                let secondary_color_in_training_trials = ColorsPerTrainingPair[i][0].secondary_color

                let ColorsAvailableCopy = JSON.parse(JSON.stringify(ColorsAvailable))
                delete ColorsAvailableCopy[primary_color_in_training_trials]
                delete ColorsAvailableCopy[secondary_color_in_training_trials]

                for(let color in ColorsAvailableCopy){
                    ColorsAvailableCopy[color] = ColorsAvailableCopy[color].filter(e => e !== primary_color_in_training_trials && e !== secondary_color_in_training_trials)
                }

                for(let num_in_pair = 0;num_in_pair<=1;num_in_pair++){
                    let Array_Of_Available_Color_Schemes = collapse_ColorsAvailable_to_array(ColorsAvailableCopy)
                    let CountOfAvailableArrayColors = {}
                    for(let i = 0;i<Array_Of_Available_Color_Schemes.length;i++){
                        CountOfAvailableArrayColors[i] = 0
                    }

                    //Now we can randomly sample from this list and add to easy of the TestTrials.
                    for(let test_trial_index = 0; test_trial_index<TestTrialsPerPair[i][num_in_pair].length; test_trial_index++){
                        //Sample the least_used available color pair, breaking ties randomly
                        let sampled_pair_index =  get_n_elements_with_lowest_counts(1,CountOfAvailableArrayColors)[0]
                        let Sampled_Pair = Array_Of_Available_Color_Schemes[sampled_pair_index]

                        //Increment the count object
                        CountOfAvailableArrayColors[sampled_pair_index] = CountOfAvailableArrayColors[sampled_pair_index] + 1

                        //Figure out which tertiary color to use.
                        let tertiary_color
                        if(tertiary_colors_based_on_location){
                            tertiary_color = Param.RegionData[TrainingPairs[i][num_in_pair].region].color // TestTrialsPerPair[i][num_in_pair][test_trial_index].location
                        }else{
                            tertiary_color = drawRandomElementsFromArray(collapse_Obj_to_array(ColorScheme.getColorSchemes().TertiaryColors).filter(e => e !== TrainingPairs[i][0].tertiary_color), 1, false)[0]
                        }

                        //Now we can assign all the colors as properties to the test trial
                        TestTrialsPerPair[i][num_in_pair][test_trial_index].primary_color = ColorScheme.getColorSchemes().PrimaryColors[Sampled_Pair.primary_color]
                        TestTrialsPerPair[i][num_in_pair][test_trial_index].secondary_color = ColorScheme.getColorSchemes().SecondaryColors[Sampled_Pair.secondary_color]
                        TestTrialsPerPair[i][num_in_pair][test_trial_index].tertiary_color = tertiary_color
                    }
                }
            }
            break
        case("location"):
            //Here all colors schemes are based on the Fennimal's location.
            //  Colors can be found in Param.RegionData
            for(let i =0;i<TrainingPairs.length;i++){
                TrainingPairs[i][0].primary_color = Param.RegionData[TrainingPairs[i][0].region].Fennimal_location_colors.primary
                TrainingPairs[i][0].secondary_color = Param.RegionData[TrainingPairs[i][0].region].Fennimal_location_colors.secondary
                TrainingPairs[i][0].tertiary_color = Param.RegionData[TrainingPairs[i][0].region].Fennimal_location_colors.tertiary

                TrainingPairs[i][1].primary_color = Param.RegionData[TrainingPairs[i][1].region].Fennimal_location_colors.primary
                TrainingPairs[i][1].secondary_color = Param.RegionData[TrainingPairs[i][1].region].Fennimal_location_colors.secondary
                TrainingPairs[i][1].tertiary_color = Param.RegionData[TrainingPairs[i][1].region].Fennimal_location_colors.tertiary
            }

            //Now we can go over the test trials. Each test is NOT allowed to have any of the colors in the training pair.
            //  Any other color combination is allowed. Attempt to sample evenly over the remaining available color combinations.
            for(let i =0;i<TestTrialsPerPair.length;i++){
                for(let num_in_pair = 0;num_in_pair<=1;num_in_pair++){
                    for(let test_trial_index = 0; test_trial_index<TestTrialsPerPair[i][num_in_pair].length; test_trial_index++){
                        TestTrialsPerPair[i][num_in_pair][test_trial_index].primary_color = Param.RegionData[TestTrialsPerPair[i][num_in_pair][test_trial_index].region].Fennimal_location_colors.primary
                        TestTrialsPerPair[i][num_in_pair][test_trial_index].secondary_color = Param.RegionData[TestTrialsPerPair[i][num_in_pair][test_trial_index].region].Fennimal_location_colors.secondary
                        TestTrialsPerPair[i][num_in_pair][test_trial_index].tertiary_color = Param.RegionData[TestTrialsPerPair[i][num_in_pair][test_trial_index].region].Fennimal_location_colors.tertiary
                    }
                }
            }
    }

    //Almost done. All that remains is to unlist all the TrainingPairs into the TrainingSetFennimals array, and the same for the TestTrialsPerPair into TestSetFennimals
    let TrainingSetFennimals = []

    //Unpacking the Training set Fennimals
    for(let i = 0;i<TrainingPairs.length;i++){
        let ObjA = TrainingPairs[i][0]
        ObjA.trialtype = "training"
        ObjA.pair_ID = i

        let ObjB = TrainingPairs[i][1]
        ObjB.trialtype = "training"
        ObjB.pair_ID = i
        TrainingSetFennimals.push(ObjA)
        TrainingSetFennimals.push(ObjB)
    }

    //ADDING STRUCTURE TO THE TEST TRIALS
    //  There will be a total of (number of unique Fennimals)x(number of trials per pair)x(direct v indirect) test trials, plus (number of unique Fennimals) repeated trials.
    //  These will be structured in three main segments:
    //     First show (number of unique training Fennimals)x(number of test trials per training pair) test trials. For each training pair-trials, pick EITHER the direct or Indirect trial for this block (selected at random)
    //     Then, at the half-way point, show a block of the original training Fennimals
    //     Finally, show the remaining (number of unique training Fennimals)x(number of test trials per training pair) test trials.
    //  To break of the pacing a bit, split the first and last segments into (number of test trials per training pair) blocks with each having (number of unique training Fennimals) trials each. Selected at random from their respective segments.
    let Segment_One = [], Repeat_Trials = [], Segment_Two = []

    //Assigning test trials to segments one and two
    for(let i = 0;i<TestTrialsPerPair.length;i++){
        for(let num_in_pair = 0;num_in_pair<=1;num_in_pair++){
            for(let test_trial_index = 0; test_trial_index<TestTrialsPerPair[i][num_in_pair].length; test_trial_index++){
                //NB: Each key should be set to either invisible (item not displayed on the bar), "available" (present and availalbe) or "unavailable" (present, but grayed out).
                let All_Items = Item_Details.All_Items

                //CREATING THE DIRECT TEST FENNIMAL.
                //  Here one item (which is neither the direct NOR the indirect item) is set to be unavailable
                let DirectFennimalObj = JSON.parse(JSON.stringify(TestTrialsPerPair[i][num_in_pair][test_trial_index]))
                let direct_trial_unavailable_item = drawRandomElementsFromArray(All_Items.filter(e => e !== DirectFennimalObj.direct_item && e !== DirectFennimalObj.indirect_item), 1, false)[0]

                let ItemKeysDirect = {}
                for(let x = 0; x<All_Items.length; x++){
                    if(All_Items[x] === direct_trial_unavailable_item){
                        ItemKeysDirect[All_Items[x]] = "unavailable"
                    }else{
                        ItemKeysDirect[All_Items[x]] = "available"
                    }
                }
                DirectFennimalObj.items_available = ItemKeysDirect
                DirectFennimalObj.trialtype = "test_direct"
                DirectFennimalObj.pair_ID = i

                //CREATING THE INDIRECT TEST FENNIMAL
                // Here the direct item should be set to unavailable.
                let IndirectFennimalObj = JSON.parse(JSON.stringify(TestTrialsPerPair[i][num_in_pair][test_trial_index]))

                let ItemKeysIndirect = {}
                for(let x = 0; x<All_Items.length; x++){
                    if(All_Items[x] ===DirectFennimalObj.direct_item){
                        ItemKeysIndirect[All_Items[x]] = "unavailable"
                    }else{
                        ItemKeysIndirect[All_Items[x]] = "available"
                    }
                }
                IndirectFennimalObj.items_available = ItemKeysIndirect
                IndirectFennimalObj.trialtype = "test_indirect"
                IndirectFennimalObj.pair_ID = i

                //Randomly assigning to segments here
                if(RNG.rand()>0.5){
                    Segment_One.push(DirectFennimalObj)
                    Segment_Two.push(IndirectFennimalObj)
                }else{
                    Segment_Two.push(DirectFennimalObj)
                    Segment_One.push(IndirectFennimalObj)
                }

            }
        }
    }
    // Assigns the Repeated trials
    for(let i = 0;i<TrainingPairs.length;i++){
        for(let num_in_pair = 0;num_in_pair<=1;num_in_pair++){
            //Setting all items to available
            let All_Items = Item_Details.All_Items

            let ItemKeys = {}
            for(let x = 0; x<All_Items.length; x++){
                ItemKeys[All_Items[x]] = "available"
            }

            //Adding to the array
            let FennimalObj = TrainingPairs[i][num_in_pair]
            FennimalObj.items_available = ItemKeys
            FennimalObj.trialtype = "test_training"
            FennimalObj.pair_ID = i
            Repeat_Trials.push(FennimalObj)
        }
    }

    //Creating blocks. Each block should an object containing a block_type (test or repeat) and an array of (number of unique training fennimals) trials.
    let Blocks = SplitArrayIntoParts(shuffleArray(Segment_One), TrainingSetFennimals.length)
    Blocks = Blocks.concat([Repeat_Trials])
    Blocks = Blocks.concat(SplitArrayIntoParts(shuffleArray(Segment_Two), TrainingSetFennimals.length))

    let TestPhaseData = []
    for(let i = 0; i<Blocks.length;i++){
        let blocktype = "test"
        if(i === Math.floor(Blocks.length / 2)) {blocktype = "repeat"}
        TestPhaseData.push({
            number: i+1,
            type: blocktype,
            Trials: Blocks[i]
        })
    }

    // CALL FUNCTIONS //
    ////////////////////
    //Call to get return a deepcopy of the training set Fennimals, keyed on location.
    this.getTrainingSetFennimalsKeyedOnLocation = function(){
        //Creating an object to hold all the Fennimals based on location. Empty locations should have a value of false, taken locations should have the Fennimal object.
        //Here we can rely on the assumption that each location will have been used only once.
        let FennimalLocations = {}

        //First retrieving all location names and setting their value in FennimalLocations to false. Note, here we cannot rely on Available_Regions!
        let All_Region_Names = Object.getOwnPropertyNames(Param.RegionData)
        for(let i=0;i<All_Region_Names.length;i++){
            if(All_Region_Names[i] !== "Home"){
                let Locations_In_Region = Param.RegionData[All_Region_Names[i]].Locations
                FennimalLocations[Locations_In_Region[0]] = false
                FennimalLocations[Locations_In_Region[1]] = false
            }
        }

        //Now we can go through all the Training set Fennimals and add them to the Fennimal locations
        for(let i = 0;i<TrainingSetFennimals.length;i++){
            FennimalLocations[TrainingSetFennimals[i].location] = TrainingSetFennimals[i]
        }

        //Adding some meta-data
        FennimalLocations.MetaData = {
            total_number_of_Fennimals: 2 * (location_pairs_in_training_set + type_pairs_in_training_set),
            total_number_of_locations: Param.location_Names.length
        }

        return(JSON.parse(JSON.stringify(FennimalLocations)))
    }

    //Call to return a deepcopy of the training set Fennimals, in an array. Each element is an object containing a single Fennimal. Order is not randomized!
    this.getTrainingSetFennimalsInArray = function(){
        //Create deep copy
        let TrainingSetCopy = JSON.parse(JSON.stringify(TrainingSetFennimals))
        let FennimalArray = []

        for (const Fennimal in TrainingSetCopy) {
            if(TrainingSetCopy[Fennimal] !== false){
                FennimalArray.push(TrainingSetCopy[Fennimal])
            }
        }

        return(FennimalArray)
    }

    //Call with an array of Fennimal objects to get these Fennimals into a single object, keyed on location. Empty locations are represented with false
    this.key_array_of_Fennimals_on_location = function(FennimalObjArr){
        //Get all locations
        let LocationObj = {}
        for(let i =0; i<Param.location_Names.length;i++){
            LocationObj[Param.location_Names[i]] = false
        }

        //Filling with Fennimals
        for(let i=0;i<FennimalObjArr.length;i++){
            LocationObj[FennimalObjArr[i].location] = FennimalObjArr[i]
        }

        return(LocationObj)
    }

    //Call to get a deep copy of the ItemDetails object (keyed on item)
    this.getItemDetails = function(){
        return(JSON.parse(JSON.stringify(Item_Details)))
    }

    //Returns an array containing all the TestsetFennimals (in unshuffled format!)
    this.getTestSetData = function(){
        return(JSON.parse(JSON.stringify(TestPhaseData)))
    }

    console.log(TrainingSetFennimals)
    console.log(TestPhaseData)
}

//Defines all experiment parameters which are not part of the stimuli
PARAMETERS = function() {
    //Number of times each Fennimal is repeated during the Search and Delivery subphases of training
    this.number_of_search_repetitions = 2
    this.number_of_delivery_repetitions = 2

    //Determines whether the text hints are based on the Fennimals location or region. Default is region.
    this.hints_based_on_location = false

    ////////////////////
    // MAP PARAMETERS //
    ////////////////////
    //Setting the walking speed in the map. Note that this is the number of ms per step, so a lower number corresponds to a higher walking speed
    this.walking_interval_time = 1
    this.total_zoom_time = 2000 //in ms
    this.location_movement_transition = ""

    /////////////////////////
    // LOCATION PARAMETERS //
    /////////////////////////
    this.location_Names = ["Pineforest", "Iceberg", "Windmill", "Garden", "Waterfall", "Mine", "Church", "Farm","Marsh", "Cottage","Oasis", "Cactus", "Beachbar", "Port", "Bush", "Jungleforest"]
    this.Available_Fennimals = ["Mushroom","Giraffe","Flamingo","Grasshopper","Dragon","Walrus","Robot","Frog","Beaver"]
        //["Crab", "Snake", "Giraffe", "Mushroom", "Ant", "Beaver", "Spider","Flamingo","Grasshopper",
       // "Frog", "Dragon", "Bunny", "Bird", "Elephant", "Tiger", "Walrus", "Turtle", "Crocodile", "Gnome", "Plant", "Robot"]

    this.LocationTransitionData = {
        //This object holds all the location transitions.
        //  Each location (start, intersection, terminal) has the following properties
        //      zoomable: a bool indicating whether this area can be crossed by walking into it. Set to true for start and intersection, false for the terminal points.
        //          If set to true, makes the forward / backwards arrows dissapear.
        //      may_contain_fennimals: a bool indicated whether or not Fennimals can appear in this region. If set to yes, makes the item bar appear on region entry.
        //  AdjacentRegions: an array of objects, each indicating a potential successor to this region.
        //      Each object is keyed with its associated zoomDepth. If there are one or more arrows to-be-displayed at this depth, then they are stored in an array.
        //          Each array contains the following properties:
        //              arrow_ID: string referring to the SVG object.
        //              target_region: when the arrow is clicked, this is the region to transition to.
        //              target_zoom_depth: the zoom depth in which the target region is initalialized at
        start_North: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "North",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                },{
                    arrow_id: "arrow_start_North",
                    target_region: "intersection_North",
                },]

        },
        intersection_North: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "North",
            sky: "sky_North_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Pineforest",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Iceberg",
                },]
        },
        location_Pineforest : {
            zoomable: false,
            may_contain_Fennimals: true,
            region: "North",
            location_name: "Pineforest",
            sky: "sky_North_2x",
            AdjacentRegions: [{
                    arrow_id: "arrow_return_to_previous_region_right",
                    target_region: "intersection_North",
                }]

        },
        location_Iceberg : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Iceberg",
            region: "North",
            sky: "sky_North_3x",
            AdjacentRegions: [{
                    arrow_id: "arrow_return_to_previous_region_left",
                    target_region: "intersection_North",
                }]
        },

        start_Flowerfields: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Flowerfields",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                },{
                    arrow_id: "arrow_start_Flowerfields",
                    target_region: "intersection_Flowerfields",
                },
            ]

        },
        intersection_Flowerfields: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Flowerfields",
            sky: "sky_Flowerfields_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Windmill",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Garden",
                },]

        },
        location_Windmill : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Windmill",
            region: "Flowerfields",
            sky: "sky_Flowerfields_2x",
            AdjacentRegions: [{
                    arrow_id: "arrow_return_to_previous_region_right",
                    target_region: "intersection_Flowerfields",
                }]
        },
        location_Garden : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Garden",
            region: "Flowerfields",
            sky: "sky_Flowerfields_3x",
            AdjacentRegions: [{
                    arrow_id: "arrow_return_to_previous_region_left",
                    target_region: "intersection_Flowerfields",
                }]

        },

        start_Mountains: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Mountains",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                },{
                    arrow_id: "arrow_start_Mountains",
                    target_region: "intersection_Mountains",
                },
            ]

        },
        intersection_Mountains: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Mountains",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Waterfall",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Mine",
                },]

        },
        location_Waterfall : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Waterfall",
            region: "Mountains",
            AdjacentRegions: [{
                    arrow_id: "arrow_return_to_previous_region_right",
                    target_region: "intersection_Mountains",
                }]

        },
        location_Mine : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Mine",
            region: "Mountains",
            AdjacentRegions:  [{
                    arrow_id: "arrow_return_to_previous_region_left",
                    target_region: "intersection_Mountains",
                }]
        },

        start_Village: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Village",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                },{
                    arrow_id: "arrow_start_Village",
                    target_region: "intersection_Village",
                },
            ]

        },
        intersection_Village: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Village",
            sky: "sky_Village_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Church",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Farm",
                },]
        },
        location_Church: {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Church",
            region: "Village",
            sky: "sky_Village_2x",
            AdjacentRegions:  [{
                    arrow_id: "arrow_return_to_previous_region_right",
                    target_region: "intersection_Village",
                }]

        },
        location_Farm : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Farm",
            region: "Village",
            sky: "sky_Village_3x",
            AdjacentRegions:  [{
                    arrow_id: "arrow_return_to_previous_region_left",
                    target_region: "intersection_Village",
                }]
        },

        start_Swamp: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Swamp",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                },{
                    arrow_id: "arrow_start_Swamp",
                    target_region: "intersection_Swamp",
                },
            ]
        },
        intersection_Swamp: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Swamp",
            sky: "sky_Swamp_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Marsh",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Cottage",
                },]
        },
        location_Marsh: {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Marsh",
            region: "Swamp",
            sky: "sky_Swamp_2x",
            AdjacentRegions:  [{
                    arrow_id: "arrow_return_to_previous_region_right",
                    target_region: "intersection_Swamp",
                }]

        },
        location_Cottage : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Cottage",
            region: "Swamp",
            sky: "sky_Swamp_3x",
            AdjacentRegions: [{
                    arrow_id: "arrow_return_to_previous_region_left",
                    target_region: "intersection_Swamp",
                }]
        },

        start_Desert: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Desert",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                },{
                    arrow_id: "arrow_start_Desert",
                    target_region: "intersection_Desert",
                },
            ]

        },
        intersection_Desert: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Desert",
            sky: "sky_Desert_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Oasis",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Cactus",
                },]
        },
        location_Oasis: {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Oasis",
            region: "Desert",
            sky: "sky_Desert_2x",
            AdjacentRegions:  [{
                    arrow_id: "arrow_return_to_previous_region_right",
                    target_region: "intersection_Desert",
                }]
        },
        location_Cactus : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Cactus",
            region: "Desert",
            sky: "sky_Desert_3x",
            AdjacentRegions:  [{
                    arrow_id: "arrow_return_to_previous_region_left",
                    target_region: "intersection_Desert",
                }]
        },

        start_Beach: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Beach",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                },{
                    arrow_id: "arrow_start_Beach",
                    target_region: "intersection_Beach",
                },
            ]

        },
        intersection_Beach: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Beach",
            sky: "sky_Beach_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Beachbar",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Port",
                },]
        },
        location_Beachbar: {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Beachbar",
            region: "Beach",
            sky: "sky_Beach_2x",
            AdjacentRegions:  [{
                    arrow_id: "arrow_return_to_previous_region_right",
                    target_region: "intersection_Beach",
                }]
        },
        location_Port : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Port",
            region: "Beach",
            sky: "sky_Beach_3x",
            AdjacentRegions:  [{
                    arrow_id: "arrow_return_to_previous_region_left",
                    target_region: "intersection_Beach",
                }]
        },

        start_Jungle: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Jungle",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                },{
                    arrow_id: "arrow_start_Jungle",
                    target_region: "intersection_Jungle",
                },
            ]

        },
        intersection_Jungle: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Jungle",
            sky: "sky_Jungle_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Bush",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Jungleforest",
                },]
        },
        location_Bush: {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Bush",
            region: "Jungle",
            sky: "sky_Jungle_3x",
            AdjacentRegions:  [{
                    arrow_id: "arrow_return_to_previous_region_right",
                    target_region: "intersection_Jungle",
                }]
        },
        location_Jungleforest : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Jungleforest",
            region: "Jungle",
            sky: "sky_Jungle_2x",
            AdjacentRegions: [{
                    arrow_id: "arrow_return_to_previous_region_left",
                    target_region: "intersection_Jungle",
                }]
        },

        //In addition, there are a number of general parameters.
        //These points allow for a non-linear zoom. Should contain 10 points, starting at 1 and ending at 10
        Zoom_Points :[1,3.5,10],// [1,10],//[1,3.5,10],//[1,2,3.5, 6,10],

        //Time between steps before the forward / backwards arrows appear. Make sure that this matches with the animation time in the css
        zoom_arrow_reappear_speed : 1000,

        // The default sky
        default_sky: "sky_basic"
    }

    //NB: Home should always be the last element.
    this.RegionData = {
        North : {
            Locations : ["Pineforest", "Iceberg"],
            lighter_color: "#a2b2fc",
            color: "#0020ac",
            darker_color: "#001987",
            prefix: "Arctic",
            hint: "This Fennimal can be found in cold places...",
            Fennimal_location_colors:{
                primary: "#526785",
                secondary: "#b0c9d4",
                tertiary: "#1a46b8",
            }
        },
        Jungle: {
            Locations : ["Bush", "Jungleforest"],
            lighter_color: "#98e092",
            color: "#278b1e",
            darker_color: "#175412",
            prefix: "Jungle",
            hint: "This Fennimal lives in tropical forests...",
            Fennimal_location_colors:{
                primary: "#6c8a55",
                secondary: "#beedc6",
                tertiary: "#53ab09",
            }
        },
        Desert: {
            Locations : ["Oasis", "Cactus"],
            lighter_color: "#f5f55b",
            color: "#c7c602", //#fffe03
            darker_color: "#757500",
            prefix: "Desert",
            hint: "This Fennimal likes the extreme heat...",
            Fennimal_location_colors:{
                primary: "#8c8c15",
                secondary: "#d1caa9",
                tertiary: "#d2d911",
            }
        },
        Mountains: {
            Locations : ["Waterfall", "Mine"],
            lighter_color: "#d6bba9",
            color: "#502d16",
            darker_color: "#26150a",
            prefix: "Mountain",
            hint: "This Fennimal can be found in high places...",
            Fennimal_location_colors:{
                primary: "#ded3d6",
                secondary: "#dedcdc",
                tertiary: "#b09a90",
            }
        },
        Beach: {
            Locations : ["Beachbar", "Port"],
            lighter_color: "#ffd0b0",
            color: "#ffe6d5",
            darker_color: "#615c58",
            prefix: "Beach",
            hint: "This Fennimal lives near the shore...",
            Fennimal_location_colors:{
                primary: "#665244",
                secondary: "#f7cdbc",
                tertiary: "#8a7e76",
            }
        },
        Flowerfields: {
            Locations : ["Windmill", "Garden"],
            lighter_color: "#ffcffa",
            color: "#f472e6",
            darker_color: "#783771",
            prefix: "Flowerland",
            hint: "This Fennimal likes to live near flowers...",
            Fennimal_location_colors:{
                primary:  "#4d2f49",
                secondary: "#d5bfd9",
                tertiary: "#950fbd",
            }
        },
        Village: {
            Locations : ["Church", "Farm"],
            lighter_color: "#fcb1b1",
            color: "#f20000",
            darker_color: "#7d0101",
            prefix: "Domestic",
            hint: "This Fennimal likes to live near people...",
            Fennimal_location_colors:{
                primary: "#734b53",
                secondary: "#ccb1b8",
                tertiary: "#d10f0f",
            }
        },
        Swamp: {
            Locations : ["Marsh", "Cottage"],
            lighter_color: "#adffef",
            color: "#00fdcc",
            darker_color: "#025e4c",
            prefix: "Wetland",
            hint: "This Fennimal lives in the wetlands...",
            Fennimal_location_colors:{
                primary: "#5b7875",
                secondary: "#c2f0df",
                tertiary:  "#00b3a0"
            }
        },
        Home: {
            color: "#cccccc"
        }
    }
    this.region_Names = Object.getOwnPropertyNames(this.RegionData)
    this.region_names_by_order_of_inclusion = ["North","Desert","Village","Jungle","Mountains","Flowerfields","Swamp","Beach"]

    //This object contains the subject-facing names for the locations
    this.SubjectFacingLocationNames = {
        Pineforest: "The Pineforest",
        Iceberg: "The Iceberg",
        Windmill: "The Windmills",
        Garden: "The Walled Garden",
        Waterfall: "The Waterfall",
        Mine: "The Mines",
        Church: "The Church",
        Farm: "The Farm",
        Marsh: "The Marshes",
        Cottage: "The Cottage in the Swamp",
        Oasis: "The Oasis",
        Cactus: "The Cactus Garden",
        Beachbar: "The Beachbar",
        Port: "The Port",
        Bush: "The Bush",
        Jungleforest: "The Deep Jungle"
    }

    //Contains all the location-based hints
    this.HintsBasedOnLocation = {
        Pineforest: "This Fennimal lives in cold forests...",
        Iceberg: "This Fennimal can be found on or near ice-shelves...",
        Windmill: "This Fennimal  can often be found in large fields of flowers...",
        Garden: "This Fennimal enjoys being near fountains...",
        Waterfall: "This Fennimal likes to swim in fast-flowing streams...",
        Mine: "This Fennimal builds a home in or near dark caves...",
        Church: "This Fennimal often hangs out near tall, free-standing buildings...",
        Farm: "This Fennimal can typically be found near large open fields of wheat...",
        Marsh: "This Fennimal can often be found near water-lilies and murky ponds...",
        Cottage: "This Fennimal can often be found near abandoned houses...",
        Oasis: "This Fennimal lives near water in very hot regions...",
        Cactus: "This Fennimal is not afraid of thorny plants...",
        Beachbar: "This Fennimal likes to sunbathe on the beach...",
        Port: "This Fennimal likes to hang around near ships...",
        Bush: "This Fennimal likes colorful plants and forest clearings...",
        Jungleforest: "This Fennimal lives in dense forests..."
    }

    // COLOR SETTINGS //
    ////////////////////
    //Holds all the color schemes used to fill in the Fennimals.
    /*this.ColorSchemes = {
        //All colors are drawn via k-means random clustering in the HCL color space.

        //Here we define colors by their Hue (H) value. We use the following bins
        //  Some gaps are included between groups, to make them more distinct
        //  Red: 0 - 40
        //  Yellow: 60-100
        //  Green: 110 - 190
        //  Blue: 195 - 300
        //  Purple: 310 - 340
        // (Note: we can't just randomly sample X colors over the entire range, as some hues are easier to differentiate by humans than others.
        //      Hence, we want to over-sample yellows and greens, relative to blues and purples)

        //The color types (primary, secondary, tertiary) are all defined based on their Chroma (C) and Lightness (L) values.
        //PRIMARY COLORS:
        //  C: ranging between 50-100
        //: L: ranging between 50-70

        //SECONDARY COLORS:
        //  C: ranging between 10-50
        //  L: Ranging from 70-90

        //TERTIARY COLORS:
        //  C: ranging from 10-70
        //  L: ranging from 25-50

        //Within each of the color types (primary, secondary, tertiary), we next sample 5 clusters
        //  (randomly clustering random samples within the relevant color space).
        PrimaryColors : {
            Reds: ["#e94e78",
                "#d85f5e",
                "#ee4544",
                "#ec6e5a"] ,
            Yellows: ["#e78919",
                "#bd751f",
                "#c89032",
                "#ae9620"]  ,
            Greens: ["#7c9b2e",
                "#50ac2c",
                "#46a34c",
                "#23b677"] ,
            Blues: ["#3295e9",
                "#4483f2",
                "#6e8de9",
                "#6e73f3"] ,
            Purples: ["#b95fed",
                "#bb72d1",
                "#e546d9",
                "#d865c8"],
        },
        SecondaryColors : {
            Reds: ["#eba6b5",
                "#f79593",
                "#eab2ae",
                "#d59e9a"],
            Yellows: ["#c9aa8c",
                "#e8bc83",
                "#d8c3a7",
                "#e4c77a"],
            Greens: ["#a8d083",
                "#bcd5af",
                "#7ddab4",
                "#9dc2b3"] ,
            Blues: ["#6bd4e5",
                "#99cce7",
                "#9ab5f1",
                "#b6bfe1"],
            Purples: ["#cabad2",
                "#dbb7e0",
                "#e3adeb",
                "#eea1ec"],
        },
        TertiaryColors : {
            Reds: ["#9d2d4f",
                "#824548",
                "#be3c42",
                "#952927"],
            Yellows: ["#5b523a",
                "#8b6425",
                "#6b4c33",
                "#694917"],
            Greens: ["#416c21",
                "#405437",
                "#327249",
                "#406b5d"],
            Blues: ["#387185",
                "#3a546a",
                "#415789",
                "#3e56b0"],
            Purples: ["#772f8a",
                "#6b516f",
                "#7d4381",
                "#9f358c"],
        },
    }
     */

    this.Available_items = ["car","spinner","boomerang","balloon","shovel","trumpet"]// ["bear","ball","bone","car", "duck", "plane"]

    //Indexed first on the number of items, then left-to-right  = A,B, ... on the item bar
    //TODO: these are placeholder colors for now...
    this.ItemBackgroundColors = {
        1: ["#bc5090"],
        2: ["#003f5c","#ffa600"],
        3: ["#003f5c","#bc5090","#ffa600"],
        4: ["#003f5c","#7a5195","#ef5675","#ffa600"],
        5: ["#003f5c","#58508d","#bc5090","#ff6361","#ffa600"],
        6: ["#003f5c","#444e86","#955196","#dd5182","#ff6e54","#ffa600"],
    }

    //Radius for the flashlight cone
    this.flashlight_radius = 40

    //The distance to which the flashlight must approach the outline targets before a hit is registered
    this.flashlight_target_sensitivity = 40

    //Minimum distance to the target before a dropped item is registered as given
    this.minimum_drop_target_distance = 35

    //Determines how many hearts are generated (measured in ms between sets are constructed)
    this.time_between_feedback_hearts = 50

    ///////////////////////
    // TIMING PARAMETERS //
    ///////////////////////
    this.FennimalTimings = {
        time_to_show_flashlight : 2000,
        training_phase_feedback_animation_time: 5000,
        quiz_splashscreen_disappear: 2000,
        quiz_feedback_time: 1000,
    }

   /* this.ItemBackgroundColors = {
        1: ["#bc5090"],
        2: ["#003f5c","#ffa600"],
        3: ["#003f5c","#bc5090","#ffa600"],
        4: ["#003f5c","#7a5195","#ef5675","#ffa600"],
        5: ["#003f5c","#58508d","#bc5090","#ff6361","#ffa600"],
        6: ["#003f5c","#444e86","#955196","#dd5182","#ff6e54","#ffa600"],
    }

    */

    //Denotes the relative x-positions in which (multiple) items should be displayed on the item bar. Keyed by the number of items
    this.ItemRelativeXPositions = {
        1: [.5],
        2: [.333,.666],
        3: [.25,.50,.75],
        4: [.20,.40,.60,.80],
        5: [.167, .333, .50, .667, .833 ],
        6: [1/12, 3/12, 5/12, 7/12, 9/12, 11/12 ],
    }

    //Given a location name, returns its associated region. If no region contains this location, returns false
    this.get_region_of_location = function(location){
        let RegionNames = Object.getOwnPropertyNames(this.RegionData)
        for(let i = 0; i<RegionNames.length; i++){
            if(this.RegionData[RegionNames[i]].Locations.includes(location)){
                return(RegionNames[i])
            }
        }
        return(false)
    }

}

FENNIMALCOLORSCHEMES = function(number_of_base_pairs){
    //Set to true if the console should print the colors on creation (good for debugging)
    let print_colors_to_console = true
    //Currently allows color schemse with 4-10 bases. Add more toe the AllColorHueValues is additional schemes are required.
    //Some functions to easily transfer between color spaces
    function HEXtoHSL(hex) {
        hex = hex.replace(/#/g, '');
        if (hex.length === 3) {
            hex = hex.split('').map(function (hex) {
                return hex + hex;
            }).join('');
        }
        var result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})[\da-z]{0,0}$/i.exec(hex);
        if (!result) {
            return null;
        }
        var r = parseInt(result[1], 16);
        var g = parseInt(result[2], 16);
        var b = parseInt(result[3], 16);
        r /= 255, g /= 255, b /= 255;
        var max = Math.max(r, g, b),
            min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;
        if (max == min) {
            h = s = 0;
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }
        s = s * 100;
        s = Math.round(s);
        l = l * 100;
        l = Math.round(l);
        h = Math.round(360 * h);

        return {
            h: h,
            s: s,
            l: l
        };
    }

    function HSLtoHEX(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    //Saturation and lightness can either be specified as a specific value (which will then be used), or as a range of [min,max].
    // If a range is specified, then a random int in this range is specified is drawn for each color (one sample per color).
    //Defining which transformations in HSL space are used for the primary, secondary and tertiary colors.
    let primary_color_saturation = [90,100]
    let primary_color_lightness = [40,45]

    let secondary_color_saturation = [35,45]
    let secondary_color_lightness = [65,70]

    let tertiary_color_saturation = [50,60]
    let tertiary_color_lightness = [25,35]

    //Defining named primary colors, with different colors used for different numbers of required basepairs.
    let AllColorHueValues = {
        4: {
            red: 338,
            yellow: 60,
            green: 135,
            purple: 280
        },
        5:{
            red: 0,
            yellow: 61,
            green: 144,
            blue: 216,
            purple: 288,
        },
        6: {
            red: 0,
            yellow: 60,
            green: 100,
            lightblue: 180,
            darkblue: 260,
            purple: 300,
        },
        7:{
            red: 0,
            gold: 50,
            lightgreen: 75,
            bluegreen: 168,
            darkblue: 211,
            purple: 270,
            pink: 310
        },
        8: {
            red: 0,
            orange: 36,
            yellow: 62,
            green: 113,
            lightblue: 179,
            darkblue: 225,
            purple: 270,
            pink: 315,
        },
        9: {
            red: 0,
            orange: 40,
            limegreen: 61,
            green: 85,
            bluegreen: 160,
            lightblue: 185,
            darkblue: 240,
            purple: 278,
            pink: 302,
        },
        10 : {
            red: 0,
            darkorange: 28,
            lightgold: 52,
            lightgreen: 66,
            green: 114,
            bluegreen: 167,
            lightblue: 201,
            darkblue: 233,
            purple:288,
            pink:324,

        }
    }

    //Sets the color scheme object, with Primary, Secondary and Tertiary color objects.
    let ColorSchemeObj = {
        PrimaryColors: {},
        SecondaryColors: {},
        TertiaryColors: {}
    }
    let ColorsHues = AllColorHueValues[number_of_base_pairs]
    let Color_Names = Object.getOwnPropertyNames(ColorsHues)

    //Sampling and setting primary colors
    for(let i=0;i<Color_Names.length;i++){
        let saturation = primary_color_saturation
        if(typeof primary_color_saturation === "object"){
            saturation = randomIntFromInterval(primary_color_saturation[0], primary_color_saturation[1])
        }
        let lightness = primary_color_lightness
        if(typeof primary_color_lightness === "object"){
            lightness = randomIntFromInterval(primary_color_lightness[0], primary_color_lightness[1])
        }

        ColorSchemeObj.PrimaryColors[Color_Names[i]] = HSLtoHEX(ColorsHues[Color_Names[i]], saturation,lightness)
    }

    //Secondary colors
    for(let i=0;i<Color_Names.length;i++){
        let saturation = secondary_color_saturation
        if(typeof secondary_color_saturation === "object"){
            saturation = randomIntFromInterval(secondary_color_saturation[0], secondary_color_saturation[1])
        }
        let lightness = secondary_color_lightness
        if(typeof secondary_color_lightness === "object"){
            lightness = randomIntFromInterval(secondary_color_lightness[0], secondary_color_lightness[1])
        }

        ColorSchemeObj.SecondaryColors[Color_Names[i]] = HSLtoHEX(ColorsHues[Color_Names[i]], saturation,lightness)
    }

    //Tertiary colors
    for(let i=0;i<Color_Names.length;i++){
        let saturation = tertiary_color_saturation
        if(typeof tertiary_color_saturation === "object"){
            saturation = randomIntFromInterval(tertiary_color_saturation[0], tertiary_color_saturation[1])
        }
        let lightness = tertiary_color_lightness
        if(typeof tertiary_color_lightness=== "object"){
            lightness = randomIntFromInterval(tertiary_color_lightness[0], tertiary_color_lightness[1])
        }

        ColorSchemeObj.TertiaryColors[Color_Names[i]] = HSLtoHEX(ColorsHues[Color_Names[i]], saturation,lightness)
    }

    //Print all the examples to the console if required. This makes testing the colors a lot easier
    if(print_colors_to_console){
        console.log("GENERATING THE FOLLOWING " + number_of_base_pairs +  " COLOR SCHEMES: ")
        for(let i =0;i<Color_Names.length;i++){
            console.log("%c Color " + Color_Names[i] +  " primary", 'background:' + ColorSchemeObj.PrimaryColors[Color_Names[i]])
            console.log("%c Color " + Color_Names[i] +  " secondary", 'background:' + ColorSchemeObj.SecondaryColors[Color_Names[i]])
            console.log("%c Color " + Color_Names[i] +  " tertiary", 'background:' + ColorSchemeObj.TertiaryColors[Color_Names[i]])
        }
    }

    //Returns a deep copy of the ColorSchemeObj
    this.getColorSchemes = function(){
        return(JSON.parse(JSON.stringify(ColorSchemeObj)))
    }

    //Return an array of all unique combination of primary and secondary colors.
    // _remove_monochrome_pairs determines whether or not pairs with the same color are removed (true) from, or included in (true) this list.
    this.getArrayOfUniquePrimaryAndSecondaryColorCombinations = function(_remove_monochrome_pairs){
        let Arr = []
        for(let i = 0; i<Color_Names.length;i++){
            let primary_col_name = Color_Names[i]
            for(let j = 0; j<Color_Names.length;j++){
                let secondary_col_name = Color_Names[j]
                if(_remove_monochrome_pairs){
                    if(primary_col_name !== secondary_col_name){
                        Arr.push([primary_col_name,secondary_col_name])
                    }
                }else{
                    Arr.push([primary_col_name,secondary_col_name])
                }

            }
        }
        return(Arr)


    }

    //Returns an object keyed on primary colors, with each key containing an array of secondary colors
    this.getKeyedColorSchemeObject = function(_remove_monochrome_pairs){
        let Obj = {}
        for(let i = 0; i<Color_Names.length;i++){
            let Arr = []
            for(let j=0;j<Color_Names.length;j++){
                if(! _remove_monochrome_pairs){
                    Arr.push(Color_Names[j])
                }else{
                    if(i !== j ){
                        Arr.push(Color_Names[j])
                    }
                }
            }
            Obj[Color_Names[i]] = Arr
        }
        return(Obj)
    }

    //Returns an array of color base names
    this.getColorBases = function(){
        return(JSON.parse(JSON.stringify(Color_Names)))
    }

    //Returns an object with one property for each color base name, with an associated value of VAL
    this.getEmptyColorSchemeObj = function(val){
        let EmptyColorObj = {}
        for(let i=0;i<Color_Names.length; i++){
            EmptyColorObj[Color_Names[i]] = val
        }

        return {PrimaryColors: JSON.parse(JSON.stringify(EmptyColorObj)), SecondaryColors: JSON.parse(JSON.stringify(EmptyColorObj)), TertiaryColors: JSON.parse(JSON.stringify(EmptyColorObj))}
    }


}

//Controls movement across the SVG (both the map and through the regions)
LocationController = function(ExpCont){
    let LC = this

    //Storing SVG references here
    let SVGReferences = {
        Layers: {
            Map: document.getElementById("Map_Layer"),
            Regions: document.getElementById("Regions_Layer"),
            Fennimals: document.getElementById("Fennimals_layer"),
            Instructions: document.getElementById("Instructions_Layer"),
            Splashscreen: document.getElementById("Splashscreen_Layer"),
        },
        Map: {
            Map: document.getElementById("Map"),
            Masks: document.getElementById("masks_layer"),
        },
        Buttons:{
            Home_button: document.getElementById("home_button")
        }
    }

    // Prevents double clicks when travelling on the map.
    let currently_moving_to_location_flag = false

    //Making sure some levels are shown, whilst some others are hidden
    document.getElementById("interface_elements").style.display = "inherit"

    ///////////////////
    // MAP FUNCTIONS //
    ///////////////////
    //Controller to handle all the map-based interactions (player walking around etc.
    MAP_CONTROLLER = function(LocCont){
        // NB: LocationsAvailable should be an array containing all segments of the map visible to the player.
        //      This is assumed to be fixed within a single experiment!

        /////////////////////////////////
        // LOCATION MARKER CONTROLLERS //
        /////////////////////////////////
        //Object to manage the states and interactions for all of the location markers.
        // Given a name, finds the relevant SVG elements.
        // Initialized in inactive state
        LocationMarkerController = function(name, MapCon){
            let state = "inactve"
            let mouse_pressed_state = false
            let mouse_check_interval = false
            let Boundary_element = document.getElementById("location_marker_"+name+"_boundary")
            let Mask_element = document.getElementById("mask_map_"+name)

            //Sets the state of the controller. True for active, False for inactive
            this.setState = function(bool){
                if(bool){
                    state = "active"
                    Boundary_element.classList.add("shimmered_object")
                }else{
                    state = "inactive"
                    Boundary_element.classList.remove("shimmered_object")
                }
            }

            //Sets button-press event
            Mask_element.onmouseleave= function(){
                mouse_pressed_state = false
                clearInterval(mouse_check_interval)
            }
            Mask_element.onmouseup= function(){
                mouse_pressed_state = false
                clearInterval(mouse_check_interval)
            }
            Mask_element.onmousedown = function(){
                if(state === "active"){
                    mouse_pressed_state = true
                    mouse_check_interval = setInterval(function (){
                        MapCon.stepSelected(name)
                    },Param.walking_interval_time)
                }
            }
        }

        //Sets the state of any given activation marker. For name, takes either a string or an array.
        //     Assumes that all LocationMarkerControllers have been initialized!
        function toggleLocationMarker(new_state, name){
            if(typeof name === "string"){
                LocationMarkerControllers[name].setState(new_state)
            }
            if(typeof name === "object"){
                for(let i=0;i<name.length;i++){
                    LocationMarkerControllers[name[i]].setState(new_state)
                }
            }
        }

        ////////////////////////////
        // PLAYER ICON CONTROLLER //
        ////////////////////////////
        PlayerIconController = function(LocContr){
            //Each path is assumed to have 100 steps. The speed by which these steps are taken can be set by the Parameter walking_interval_time
            let currentPath = false
            let currentStep = 0
            let SVG_Icon = document.getElementById("player_icon")
            let SVG_currentpath = false
            let currentPathLength = 0

            //Calculating offsets for the icon image
            let offset_W = 14
            let offset_H = 17

            //Call when a step has been taken. If in the current direction, move forward. If in any other direction, move back and evaluate if a path needs to be changed.
            this.setStepOnPath = function(path_name){
                if(path_name === "Home"){
                    if(currentStep > 0){
                        stepback()
                    }
                    if(currentStep === 0){
                        LocCont.go_to_home()
                    }
                }else{
                    //Check if we need to switch to a different path
                    if(currentStep === 0){
                        switchpath(path_name)
                    }

                    if(path_name === currentPath){
                        if(currentStep <= 99){
                            continuepath()
                        }
                    }else{
                        stepback()
                    }
                }
                //Update the location controller on the current state of the player on the map
                LocContr.player_moved_on_map(currentPath,currentStep)
            }

            function switchpath(new_path){
                currentPath = new_path
                SVG_currentpath = document.getElementById("path_"+ new_path )
                currentPathLength = SVG_currentpath.getTotalLength()
            }
            function continuepath(){
                currentStep++
                moveIconOnPath()
            }
            function stepback(){
                currentStep--
                moveIconOnPath()
            }

            function moveIconOnPath(){
                let point = SVG_currentpath.getPointAtLength((currentStep/100) * currentPathLength)

                //Adding offsets
                point.x = point.x - offset_W
                point.y = point.y - offset_H

                SVG_Icon.setAttribute("transform", "translate("+ point.x + "," + point.y + ")");

            }

            //Resets the icon to its default position
            this.reset_player_icon = function(){
                currentPath = false
                currentStep = 0
                currentPathLength = 0

                //Reset icon to home icon
                let HomeBox = document.getElementById("location_marker_Home")
                let HomeBoxCoords = getViewBoxCenterPoint(HomeBox)

                SVG_Icon.style.display = "inherit"
                SVG_Icon.setAttribute("transform", "translate("+ (HomeBoxCoords.x -offset_W) + "," + (HomeBoxCoords.y-offset_H) + ")");

            }

            //Shows or hides the player icon
            this.hidePlayerIcon = function(){
                SVG_Icon.style.display = "none"
            }
            this.showPlayerIcon = function(){
                SVG_Icon.style.display = "inherit"
            }

            //On initialization, pre-position the player icon in the center
            this.reset_player_icon()

        }

        //This is called by the LocationMarkerControllers to signal that a step should be taken.
        this.stepSelected = function(name){
            Player.setStepOnPath(name)
        }

        //This is called by the PlayerIconController to signify that the end of a path has been reached
        this.endOfPathReached = function(path_name){
            LocCont.map_end_of_path_reached(path_name)
        }

        ////////////////////////
        // BUTTON CONTROLLERS //
        ////////////////////////
        //Setting an event handler for the home button
        SVGReferences.Buttons.Home_button.onclick = function(){
            LocCont.go_to_home()
        }

        ///////////////////////
        // GENERAL FUNCTIONS //
        ///////////////////////
        //Resets the variable parts of the map (player icon, splash screen)
        this.resetMap = function(){
            //Reset the player icon and show the home button
            Player.reset_player_icon()
            SVGReferences.Buttons.Home_button.style.display = "inherit"

            //Make sure all the correct locations are highlighted
            toggleLocationMarker(true, Param.region_Names)
           //toggleLocationMarker(true, "Home")
        }

        //Call to show a passive state of the map (just the figure, but no button interactions and no highlights)
        this.showPassiveMap = function(){
            //Hide the player icon
            Player.hidePlayerIcon()

            //Disable all location marker controllers
            toggleLocationMarker(false, Param.region_Names)

            //Make sure that the map layer is visible
            SVGReferences.Layers.Map.style.display = "inherit"
        }

        //Creating subcontrollers for the location icons and the player
        let Player = new PlayerIconController(LocCont)
        let LocationMarkerControllers = {}
        for(let i=0; i<Param.region_Names.length; i++){
            let name = Param.region_Names[i]
            LocationMarkerControllers[name] = new LocationMarkerController(name, this)
        }

        //Activating the home button to take a step back on any path
        LocationMarkerControllers["Home"] = new LocationMarkerController("Home", this)

        //Resetting the map on initalization
        this.resetMap()
    }
    let MC = new MAP_CONTROLLER(this)

    //Tells the map controller to reset the map (icon in the center, all regions available). Does not show the map yet
    function reset_map(){
        MC.resetMap()
    }

    //Shows the map on screen (setting regions, Fennimals and instructions to invisible)
    function go_to_map(){
        //Show the map layer, hide the regions, fennimals and instructions layers
        SVGReferences.Layers.Map.style.display = "inherit"
        SVGReferences.Layers.Regions.style.display = "none"
        SVGReferences.Layers.Fennimals.style.display = "none"
        SVGReferences.Layers.Instructions.style.display = "none"

        //Make sure the map elements and the masks are set to visible (but masks should have 0 opacity)
        SVGReferences.Map.Map.style.display = "inherit"
        SVGReferences.Map.Masks.style.display = "inherit"
        SVGReferences.Map.Masks.style.opacity = 0

        //Inform the experiment controller that we're passing through the map
        ExpCont.passing_through_location("map")

        //Hide any hints
        clear_ingame_hint()

        let AllLocationArrows = document.getElementsByClassName("location_arrow")
        for(let i =0;i<AllLocationArrows.length;i++){
            AllLocationArrows[i].style.display = "none"
        }

        //If the map is shown for the first time, then print a hint on top of the screen
        if(IngameHintsGiven.map_first_travel === false){
            show_ingame_hint((508-218)/2+15,(285.8-125)/2,218,125,"You can move to any part of the island by pressing down (and holding) any of the flashing icons on the map.")
        }
    }

    //Goes to the home page (showing instructions
    this.go_to_home = function(){
        clear_ingame_hint()
        ExpCont.home_button_pressed()
    }

    //Call when the player has moved on the map. Call with the current path of the player, as well as its position along this path
    this.player_moved_on_map = function(current_path, current_location_on_path){
        //If the player is sufficiently close to home, show the home button. Else hide it
        if(current_location_on_path < 10){
            SVGReferences.Buttons.Home_button.style.display = "inherit"
        }else{
            SVGReferences.Buttons.Home_button.style.display = "none"
        }

        //Check if player has reached the end of the path
        if(current_location_on_path === 100 && ! currently_moving_to_location_flag){
            //current_location_on_path = 95 // Jump back to prevent double clicks
            map_end_of_path_reached(current_path)
            currently_moving_to_location_flag = true
        }

        //Check if we need to delete the hint provided on first use of the map
        if(IngameHintsGiven.map_first_travel === false && current_location_on_path > 20){
            IngameHintsGiven.map_first_travel = true
            clear_ingame_hint()
        }
    }

    //Call to reset and show the map
    this.reset_map = function(){
        reset_map()
        //Goto the map
        go_to_map()
        resetAllZoomLevels()
    }

    this.show_passive_map = function(){
        MC.showPassiveMap()

        //Hide the home button
        SVGReferences.Buttons.Home_button.style.display = "none"

        //Hide the Regions layer
        SVGObjects.Layers.Regions.style.display = "none"

    }

    //Call when the Player Icon has reached the end of a point on the map. Call with string location
    function map_end_of_path_reached(location_string){
        go_to_location("start_"+ location_string,false)

        //To prevent double-clicks when moving away from the map, hold the currently_moving_to_location flag a bit longer before freeing it up again.
        setTimeout(function(){currently_moving_to_location_flag = false},200)
    }

    ///////////////////////////////
    // REGION LOCATION FUNCTIONS //
    ///////////////////////////////
    let currentLocation, CurrentLocationData, CurrentLocationSVGObj, currentZoomPoint

    //Hides all location arrows. This also removes any click eventListeners associated to them
    function hide_all_location_arrows(){
        let AllArrows = document.getElementsByClassName("location_arrow")
        for(let i=0; i<AllArrows.length; i++){
            AllArrows[i].style.display = "none"

            //Replace the arrow by a clone, removing all event listerers in the process

            let NewElem = AllArrows[i].cloneNode(true);
            AllArrows[i].parentNode.replaceChild(NewElem, AllArrows[i]);
        }
    }

    //Hides all location backgrounds
    function hide_all_location_backgrounds(){
        let AllLocations = document.getElementsByClassName("location")
        for(let i=0; i<AllLocations.length; i++){
            AllLocations[i].style.display = "none"
        }
    }

    //Shows an arrow and creates an event listener for a given target. DO NOT USE FOR THE ZOOM ARROWS
    function create_next_location_arrow(arrow_name, target_location){
        //Find the arrow object
        let ArrowObj = document.getElementById(arrow_name)
        ArrowObj.style.display = "inherit"

        //Create event listener. Special case for the back-to-map arrow
        ArrowObj.addEventListener("click", function(){

            //If we're leaving a location with possible Fennimals, then inform the experiment controller
            if(Param.LocationTransitionData[currentLocation].may_contain_Fennimals){
               leaving_location_with_possible_Fennimal()
            }

            if(target_location === "map"){
                go_to_map();
            }else{
                //Here we need to know whether we are leaving a terminal location (that is, a location with Fennimals) or not
                go_to_location(target_location, Param.LocationTransitionData[currentLocation].may_contain_Fennimals )
            }

        })
    }

    //Call when leaving a location with a possible Fennimal
    function leaving_location_with_possible_Fennimal(){
        ExpCont.location_left()
    }

    //Shows and creates a zoom arrow. Supply with either "forward" or "backward" as direction
  /*  function create_zoom_arrow(direction){
        //Find a reference to the correct arrow
        let ArrowObj
        if(direction === "forward"){
            ArrowObj = document.getElementById("arrow_zoom_forward")
        }else{
            ArrowObj = document.getElementById("arrow_zoom_back")
        }

        //After a brief delay to match with the zoom animation
        setTimeout(function(){
            //Show the Arrow on screen
            ArrowObj.style.display = "inherit"

            //Find out what index the currentZoomPoint is in, and which are the following points
            let currentZoomIndex = Param.LocationTransitionData.Zoom_Points.indexOf(currentZoomPoint)

            //Set the correct event listener
            if(direction === "forward"){
                ArrowObj.addEventListener("click", function(){
                    //move_within_location(currentZoomDepth + Param.LocationData.zoom_speed)
                    if(currentZoomIndex < (Param.LocationTransitionData.Zoom_Points.length - 1)){
                        move_within_location(Param.LocationTransitionData.Zoom_Points[currentZoomIndex +1] )
                    }
                })
            }else{
                ArrowObj.addEventListener("click", function(){
                    if(currentZoomIndex > 0){
                        move_within_location(Param.LocationTransitionData.Zoom_Points[currentZoomIndex -1] )
                    }

                })
            }
        },Param.LocationTransitionData.zoom_arrow_reappear_speed)

    }

   */
    //Hides all sky sublayers
    function hide_sky_sublayers(){
        let All_Skies = document.getElementsByClassName("location_sky")
        for(let i =0;i<All_Skies.length;i++){
            All_Skies[i].style.display = "none"
        }
    }

    //Call with the AdjacentRegions object to show all the next location arrows on the map
    function show_next_location_arrows(Arrows_To_Be_Shown){
        hide_all_location_arrows()
        if(Arrows_To_Be_Shown !== undefined){
            for(let i=0;i<Arrows_To_Be_Shown.length;i++){
                create_next_location_arrow(Arrows_To_Be_Shown[i].arrow_id, Arrows_To_Be_Shown[i].target_region)
            }
        }
    }

        //Go to a specified location. Call with a string denoting the name of the location, and a zoom depth.
    function go_to_location(name, arriving_from_terminal_location){
        //Hide the map and instructions
        SVGReferences.Layers.Map.style.display = "none"
        SVGReferences.Layers.Instructions.style.display = "none"

        //Hide all locations
        hide_all_location_backgrounds()

        //Hide any hints
        clear_ingame_hint()

        //Set the currentLocation and Get the information for the current location
        currentLocation = name
        CurrentLocationData = Param.LocationTransitionData[name]
        CurrentLocationSVGObj = document.getElementById(name)

        //If zoomable AND we did not come from a terminal location, then travel the entire location first.
        // If zoomable AND we arrived here from a terminal location, then set the zoom all the way to the end.
        hide_all_location_arrows()
        if(CurrentLocationData.zoomable){
            if(arriving_from_terminal_location){
                //Set zoom to end
                CurrentLocationSVGObj.style.transition = ""
                CurrentLocationSVGObj.style.transform = "scale(10,10)"

                //Show the arrows after a brief delay
                setTimeout(function(){
                    show_next_location_arrows(CurrentLocationData.AdjacentRegions)
                },500)

            }else{
                animate_movement_through_location(CurrentLocationSVGObj, CurrentLocationData)
            }
        }else{
            //Set any relevant next-region arrows on the screen
            show_next_location_arrows(CurrentLocationData.AdjacentRegions)
        }

        //Show the correct sky
        hide_sky_sublayers()
        SVGObjects.Layers.Sky.style.display = "inherit"

        //Find the correct sky name. Use default if none is provided in Param.LocationData
        let sky_name = Param.LocationTransitionData.default_sky
        if("sky" in CurrentLocationData){
            sky_name = CurrentLocationData.sky
        }
        document.getElementById(sky_name).style.display = "inherit"

        //Show the location layer
        SVGReferences.Layers.Regions.style.display = "inherit"

        //Show the current location background to the player
        CurrentLocationSVGObj.style.display = "inherit"

        //Set the correct interface colors
        setInterfaceColors(name)

        //Inform the experiment controller that we're passing through a new location
        ExpCont.passing_through_location(name)

        //If we're in a terminal LOCATION, then inform the experiment controller. There may be Fennimals here!
        if(Param.LocationTransitionData[name].may_contain_Fennimals){
            ExpCont.location_entered(Param.LocationTransitionData[name].location_name)
        }

        //On the first location, show a hint on how to use the arrows
        if(IngameHintsGiven.location_arrow_first_click === false){
            show_ingame_hint((508-268)/2,5,268,90,"You can travel within a region of Fenneland by clicking on the highlighted buttons. <br> The map icon at the bottom of the screen returns you to the main map.")
            IngameHintsGiven.location_arrow_first_click = true
        }

    }

    //Sets the interface colors based on the region
    function setInterfaceColors(name){
        //Given a location, get the region
        let color_light = Param.RegionData[Param.LocationTransitionData[name].region].lighter_color
        let color_dark = Param.RegionData[Param.LocationTransitionData[name].region].darker_color
        document.getElementById("item_bar").style.fill = color_light + "AA"
        document.getElementById("item_bar").style.stroke = color_dark + "AA"

        let FlashlightPrompt = document.getElementById("prompt_flashlight")
        FlashlightPrompt.getElementsByTagName("rect")[0].style.fill = color_light + "AA"
        FlashlightPrompt.getElementsByTagName("rect")[0].style.stroke= color_dark + "AA"
        FlashlightPrompt.getElementsByTagName("text")[0].childNodes[0].style.fill = color_dark

        let Feedback_Rect = document.getElementById("prompt_feedback").getElementsByTagName("rect")[0]
        Feedback_Rect.style.fill = color_light + "AA"
        Feedback_Rect.style.stroke = color_dark + "DD"
        document.getElementById("prompt_feedback").getElementsByTagName("text")[0].childNodes[0].style.fill = color_dark

    }

    //Moves within a location (changing only zoom and arrows). Faster to run when a location has already been loaded with go_to_location before.
    // Should only be used for the zoom forward / backward arrows!
    /*function move_within_location(new_zoom_point){
        currentZoomPoint = new_zoom_point

        //Set zoom depth to the svg
        CurrentLocationSVGObj.style.transform = "scale(" + new_zoom_point + "," + new_zoom_point + ")"

        //Remove all location arrows
        hide_all_location_arrows()

        //Creating new zoom arrows
        //Find out what index the currentZoomPoint is in, and which are the following points
        let currentZoomIndex = Param.LocationTransitionData.Zoom_Points.indexOf(currentZoomPoint)

        //The backward arrow should appear on anything but the first depth
        if(currentZoomIndex > 0){
            create_zoom_arrow("backward")
        }

        //The forward arrow should appear as long as the last zoom point hasnt been reached
        if(currentZoomIndex< Param.LocationTransitionData.Zoom_Points.length-1){
            create_zoom_arrow("forward")
        }

        //Depending on the new zoom point, more arrows may need to be created.
        let Arrows_To_Be_Shown = CurrentLocationData.AdjacentRegions[new_zoom_point]
        if(Arrows_To_Be_Shown !== undefined){
            for(let i=0;i<Arrows_To_Be_Shown.length;i++){
                create_next_location_arrow(Arrows_To_Be_Shown[i].arrow_id, Arrows_To_Be_Shown[i].target_region, Arrows_To_Be_Shown[i].target_zoom_point)
            }
        }
    }

     */

    //Animates the transfer across a location, ending at the last zoom level (11). Then shows all arrows in the provided array (should contain DOM element references)
    function animate_movement_through_location(LocationSVGObject, CurrentLocationData){
        //Resetting location if needed
        LocationSVGObject.style.transition = ""
        LocationSVGObject.style.transform = "scale(1,1)"

        setTimeout(function(){
            LocationSVGObject.style.transition = "all " + Param.total_zoom_time + "ms ease-in-out" // "all 3000ms linear" // + Param.total_zoom_time + "ms ease_in_out"
            setTimeout(function(){
                LocationSVGObject.style.transform = "scale(10,10)"
            }, 250)
        }, 10)

        setTimeout(function(){
            show_next_location_arrows(CurrentLocationData.AdjacentRegions)
        }, 250 + Param.total_zoom_time)
    }

    //Call after having jumped to home to reset all the zoom levels
    function resetAllZoomLevels(){
        for(let key in Param.LocationTransitionData){
            if(typeof Param.LocationTransitionData[key] === "object"){
                if("zoomable" in Param.LocationTransitionData[key]){
                    if(Param.LocationTransitionData[key].zoomable){
                        document.getElementById(key).style.transform = "scale(1,1)"
                    }
                }
            }
        }
    }

    //Call to prevent a subject from leaving a location by hiding (true) or re-appearing (false) the return arrows
    this.prevent_subject_from_leaving_location = function(bool){
        //throw "Deliberate Error!";
        if(bool){
            hide_all_location_arrows()
        }else{
            let Arrows_To_Be_Shown = CurrentLocationData.AdjacentRegions
            if(Arrows_To_Be_Shown !== undefined){
                for(let i=0;i<Arrows_To_Be_Shown.length;i++){
                    create_next_location_arrow(Arrows_To_Be_Shown[i].arrow_id, Arrows_To_Be_Shown[i].target_region)
                }
            }
        }
    }

    //Call to sidestep the map entirely and jump to the given location. This does NOT show the Flashlight icon or any movement arrows, but should be created in conjunction with a Fennimal controller
    this.jump_to_static_location = function(location){
        SVGReferences.Layers.Map.style.display = "inherit"
        SVGReferences.Layers.Regions.style.display = "none"
        SVGReferences.Layers.Fennimals.style.display = "none"
        SVGReferences.Layers.Instructions.style.display = "none"

        //Hide all locations
        hide_all_location_backgrounds()

        //Hide all arrows
        hide_all_location_arrows()

        //Set the currentLocation and Get the information for the current location
        let LocationData = Param.LocationTransitionData["location_" + location]
        let LocationSVGObj = document.getElementById("location_" + location)

        //Set the correct interface colors
        setInterfaceColors("location_" + location)

        //Show the correct sky
        hide_sky_sublayers()
        SVGObjects.Layers.Sky.style.display = "inherit"
        let sky_name = Param.LocationTransitionData.default_sky
        if("sky" in LocationData){
            sky_name = LocationData.sky
        }
        document.getElementById(sky_name).style.display = "inherit"

        //Show the location layer
        SVGReferences.Layers.Regions.style.display = "inherit"

        //Show the current location background to the player
        LocationSVGObj.style.display = "inherit"
    }

    //Call to show the "return to home" button. Once clicked, executes the associated function
    this.show_end_of_trial_button = function(outputfun){
        SVGObjects.Layers.Item_Bar.style.display = "inherit"
        SVGObjects.Return_to_Home_button.style.display = "inherit"
        SVGObjects.Return_to_Home_button.getElementsByTagName("rect")[0].classList.add("location_arrow")
        SVGObjects.Return_to_Home_button.getElementsByTagName("rect")[0].style.display = "inherit"
        SVGObjects.Return_to_Home_button.onclick = outputfun
    }

}

//Handles the flashlight elements. Presents the outline for a given FennimalObject (call with false if no Fennimal is present at this location).
//
Flashlight_Controller = function(FennimalObj,LocCont, ExpCont){
    SVGObjects.Layers.Stage.style.display = "inherit"
    //We need three sets of references: the Outline Object (outline of the Fennimal), the Flashlight and its sub-parts, plus a set of targets that need to be hit
    let FlashlightIcon = document.getElementById("flashlight")
    let FlashlightIcon_symbol = document.getElementById("flashlight_light")
    let FlashlightIcon_box = document.getElementById("flashlight_background")

    let OutlineContainerLayer = document.getElementById("Fennimal_outlines_layer")
    let Flashlight_Mask_Black = document.getElementById("spotlight_background_mask_black")
    let Flashlight_Mask_Yellow = document.getElementById("spotlight_background_mask")
    let FlashlightPrompt = document.getElementById("prompt_flashlight")

    let that = this

    //Check if there should a Fennimal here. If yes, then find the associated object.
    let OutlineLayer,OutlineObject
    if(FennimalObj !== false){
        OutlineLayer = document.getElementById("layer_outline_" + FennimalObj.type)
        OutlineObject = document.getElementById(FennimalObj.type + "_outline")
        OutlineObject.style.opacity = 1
        OutlineObject.style.display = "inherit"
    }

    //Stores the state of the flashlight. True is on, False is off. Toggle with the correct function.
    let flashlight_state_on = false

    //Creates a radial gradient object, appends it to the SVG and returns a reference
    function createRadialGradient(id, maxopacity, color){
        //Check if the gradient already exists or not
        if(document.getElementById(id) === null){
            let svgns = 'http://www.w3.org/2000/svg';
            let gradient = document.createElementNS(svgns, 'radialGradient');
            gradient.id = id
            gradient.setAttribute('cx', '9999');
            gradient.setAttribute('cy', '9999');
            gradient.setAttribute('r', Param.flashlight_radius);
            gradient.setAttribute("gradientUnits","userSpaceOnUse")
            SVGObjects.SVG.childNodes[1].appendChild(gradient)

            //Creating the stops
            let stop1 = document.createElementNS(svgns, 'stop');
            stop1.setAttribute("offset",0)
            stop1.setAttribute("stop-color", color)
            gradient.appendChild(stop1)

            let stop2 =  document.createElementNS(svgns, 'stop');
            stop2.setAttribute("offset",.7)
            stop2.setAttribute("stop-opacity",maxopacity)
            stop2.setAttribute("stop-color", color)
            gradient.appendChild(stop2)

            let stop3 =  document.createElementNS(svgns, 'stop');
            stop3.setAttribute("offset",1)
            stop3.setAttribute("stop-opacity",0)
            gradient.appendChild(stop3)

            return(gradient)
        }else{
            console.warn("Radial gradient called with pre-existing ID. Returning object with given ID instead.")
            return(document.getElementById(id))
        }

    }

    let SpotlightGradient_FennimalOutline = createRadialGradient("spotlight_gradient",1, "black")
    let SpotlightGradient_Background = createRadialGradient("spotlight_gradient_background",1, "yellow")

    function show_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "inherit"
    }

    function hide_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "none"
    }

    ///////////////////
    //EVENT HANDLERS //
    ///////////////////
    //Once the flashlight is active, we need to listen for mouseup and mouse leave events all over the documents.
    // Leaving the document or lifting the mouse should trigger the flashlight off (if it is on)
    document.onmouseup = function(){
        if(flashlight_state_on){
            toggleFlashlight(false)
        }
    }
    document.onmouseleave = function(){
        if(flashlight_state_on){
            toggleFlashlight(false)
        }
    }

    //The flashlight should be triggered to active once the icon has been pressed
    FlashlightIcon.onmousedown = function(){
        toggleFlashlight(true)
    }

    //If the mouse moves anywhere on the document AND the flashlight is active, then the gradient of the outline needs to be adjusted
    // (This gives the splotlight effect!)
    document.onmousemove = function(event){
        if(flashlight_state_on){
            //Get the correct mouse position in the SVG coordinates
            let mouse_pos = getMousePosition(event)

            //Keep track of how much the subject has searched across the screen
            amount_dragged++

            //Set the gradients
            changeOutlineGradient(mouse_pos.x,mouse_pos.y)

            if(FennimalObj !== false){
                //Scan if any Targets are in range
                scanForTargets(mouse_pos.x,mouse_pos.y)
            }else{
                if( (! no_fennimal_hint_shown) && amount_dragged>400){
                    show_ingame_hint((508-300)/2,50,300,100,"Some locations may not have any Fennimals present. Try searching in other locations!")
                    no_fennimal_hint_shown = true
                }
            }

            if(try_first_use_hint_timeout !== 'undefined'){
                if(amount_dragged === 200){
                    clear_ingame_hint()
                }
            }


        }
    }

    function changeOutlineGradient(mouseX,mouseY){
        //Change the Fennimal outline
        SpotlightGradient_FennimalOutline.setAttribute("cx", mouseX)
        SpotlightGradient_FennimalOutline.setAttribute("cy", mouseY)

        //Change the flashlight background shine
        SpotlightGradient_Background.setAttribute("cx", mouseX)
        SpotlightGradient_Background.setAttribute("cy", mouseY)

    }

    //Show the item bar with the flashlight icon
    function showFlashLightIcon(){
        //Make sure that the item layer is set to visible
        document.getElementById("Item_bar_layer").style.display = "inherit"

        //Make sure that the item bar is displayed
        document.getElementById("item_bar").style.display = "inherit"

        //Make sure that the Fennimals layer is displayed
        SVGObjects.Layers.Fennimals.style.display = "inherit"

        //Show the Flashlight icon on the item bar
        FlashlightIcon.style.display = "inherit"
    }

    function hideFlashLightIcon(){
        //Hidng the item bar
        document.getElementById("Item_bar_layer").style.display = "none"
        document.getElementById("item_bar").style.display = "inherit"

        //Hide the Flashlight icon on the item bar
        FlashlightIcon.style.display = "none"
    }

    //Call to display the Fennimal outline
    function showFennimalOutline(){
        //Show the layer containing the Fennimal outlines (each is stored as a separate sub-layer)
        SVGObjects.Layers.Outline.style.display = "inherit"

        //Show the outline layer
        OutlineLayer.style.display = "inherit"

    }
    //Call to hide the Fennimal outline
    function hideFennimalOutline(){
        SVGObjects.Layers.Outline.style.display = "none"
        OutlineLayer.style.display = "none"
    }

    //New state should be a bool. True for on, false for off.
    function toggleFlashlight(new_state){
        //Change the icon color
        if(new_state){
            FlashlightIcon_box.style.fill = "#2c5aa0"
            FlashlightIcon_symbol.style.fill =  "#ffff00"
            FlashlightIcon_box.classList.remove("shimmered_object")
            FlashlightPrompt.style.opacity = 0

        }else{
            FlashlightIcon_box.style.fill = "#b3b3b3"
            FlashlightIcon_symbol.style.fill = "black"
            FlashlightIcon_box.classList.add("shimmered_object")
            FlashlightPrompt.style.opacity = 1
        }

        //Set the correct state
        flashlight_state_on = new_state

        //Hide or show the outline
        if(new_state){
            if(FennimalObj !== false){
                showFennimalOutline(FennimalObj.type)
            }
        }else{
            if(FennimalObj !== false){
                showFennimalOutline(FennimalObj.type)
            }
        }

        //Set the masks (make the background darker, and show the spotlight yellow) and set the correct gradients
        if(new_state){
            Flashlight_Mask_Black.style.display = "inherit"
            Flashlight_Mask_Yellow.style.display = "inherit"
            document.getElementById("Fennimal_outlines_spotlight_background").style.display = "inherit"

        }else{
            Flashlight_Mask_Black.style.display = "none"
            Flashlight_Mask_Yellow.style.display = "none"
            document.getElementById("Fennimal_outlines_spotlight_background").style.display = "none"

            //Reset the gradients
            SpotlightGradient_FennimalOutline.setAttribute("cx", 9999)
            SpotlightGradient_FennimalOutline.setAttribute("cy", 9999)
            SpotlightGradient_Background.setAttribute("cx", 9999)
            SpotlightGradient_Background.setAttribute("cy", 9999)


        }
    }

    /////////////
    // TARGETS //
    /////////////
    //Returns an array of targets associated to the Fennimal. Each target has
    function createTargets(){
        //Get all target circles from the SVG
        let TargetCircles = OutlineLayer.getElementsByClassName("outline_target")
        let arr = []

        for(let i=0;i<TargetCircles.length;i++){
            let x = TargetCircles[i].getAttribute("cx")
            let y = TargetCircles[i].getAttribute("cy")
            arr.push(new Target(x,y, Param.flashlight_target_sensitivity))
        }
        return arr
    }

    Target = function(x,y, minimum_dist){
        this.has_been_found = false

        this.checkIfFound = function(mouseX,mouseY){
            if(!this.has_been_found){
                //Get the distance between the target and the mouse.
                let dist = EUDist(x,y, mouseX, mouseY)

                //If this distance is smaller than the threshold determined by Param, then this target has been found
                if(dist <= minimum_dist){
                    this.has_been_found = true

                }
            }
        }
    }

    //Call to check if the cursors is sufficiently close to any of the targets.
    function scanForTargets(mouseX,mouseY){
        for(let i=0;i<Targets.length;i++){
            Targets[i].checkIfFound(mouseX,mouseY)
        }

        //Check if all the targets have been found, if yes, call the proper function.
        if(checkIfAllTargetsFound()){
            AllTargetsFound()
        }
    }

    //Call to check how many Targets have not been found yet. Returns true if all targets have been found
    function checkIfAllTargetsFound(){
        let remainingTargets = 0
        for(let i=0;i<Targets.length;i++){
            if(! Targets[i].has_been_found){
                return false
            }
        }
        return true

    }

    //Call when all Targets have been found. This concludes the spotlight portion of the trial
    function AllTargetsFound(){
        //Turn off the flashlight
        toggleFlashlight(false)

        //Prevent the subject from leaving until the starting animation is completed
        LocCont.prevent_subject_from_leaving_location(true)

        //Hide the items bar
        document.getElementById("item_bar").style.display = "none"
        FlashlightPrompt.style.display = "none"

        //Mellow the background
        show_Fennimal_background_mask()

        //Hide the item bar
        FlashlightIcon.style.display = "none"

        //Prevent any hints from being shown and clear any existing hints
        clear_ingame_hint()
        if(try_first_use_hint_timeout !== "undefined"){clearTimeout(try_first_use_hint_timeout)}

        //For a short period, show the entire outline
        OutlineObject.style.display = "none"
        OutlineObject.style.fill = "black"
        OutlineObject.style.opacity = 0
        OutlineContainerLayer.style.display = "inherit"
        OutlineLayer.style.display = "inherit"

        setTimeout(function(){
            OutlineObject.style.display = "inherit"
        }, 5)

        //Fade the outline in
        setTimeout(function(){
            OutlineObject.style.opacity = 1
        },100)

        //After a brief delay, fade the outline out and continue with the remaining portion of the trial
        setTimeout(function(){
            OutlineObject.style.opacity = 0

            //Wait for the animation to finish before hiding the outline
            setTimeout(function(){
                hideFennimalOutline()
                OutlineContainerLayer.style.display = "none"
                that.leaving_area();
                ExpCont.FennimalFound(FennimalObj)

            },600)

        }, 750)



    }

    /////////////////////
    // ON CONSTRUCTION //
    /////////////////////
    //Creating and setting elements
    OutlineContainerLayer.style.display = "inherit"
    showFlashLightIcon()
    toggleFlashlight(false)

    Flashlight_Mask_Yellow.style.fill = "url(#spotlight_gradient_background)"
    FlashlightPrompt.style.display = "inherit"

    let Targets
    if(FennimalObj !== false){
        OutlineObject.style.fill = "url(#spotlight_gradient)"

        //Finding the targets
        Targets = createTargets()
    }

    //Call when leaving the area (before deleting this controller
    this.leaving_area = function(){
        //Hide the prompt
        FlashlightPrompt.style.display = "none"

        //Hiding the Fennimal outline
        if(FennimalObj !== false){
            OutlineObject.style.display = "none"
        }

        //Hiding the item bar and the flashlight icon
        toggleFlashlight(false)
        hideFlashLightIcon()
        hide_Fennimal_background_mask()
        OutlineContainerLayer.style.display = "none"

        if(try_first_use_hint_timeout !== "undefined"){
            clearTimeout(try_first_use_hint_timeout)
        }
        clear_ingame_hint()
    }

    // DISPLAYING INGAME HINTS
    //When the first flashlight controller is generated, show subjects a hint on how to use the flashlight.
    let try_first_use_hint_timeout
    let amount_dragged = 0
    let no_fennimal_hint_shown = false

    function try_first_use_hint(){
        show_ingame_hint((508-400)/2,35,400,175,"A flashlight icon will automatically appear in some locations. These locations may contain a Fennimal. <br> <br> You can search for Fennimals by holding down the flashlight icon and dragging the light across the screen")
        IngameHintsGiven.flashlight_first_use = true
    }

    if(!IngameHintsGiven.flashlight_first_use){
        try_first_use_hint_timeout =  setTimeout(function(){try_first_use_hint()},4500)
    }

}

//Manages all the Fennimal interestions. Needs to be created and destroyed for each interaction.
//    Should also be called for an empty slot. Instead of calling with a Fennimal object, call with false (flashlight still works, but no Fennimal outline will appear.
//Handles all the Fennimals and their interactions, including backgrounds and the draggable objects
TrainingPhaseFennimalController = function(FennimalObj, ItemDetails, ItemAvailability, LocCont, ExpCont){
    //ItemAvailability: should contain an object with one key for each element in ItemDetails.All_Items. Each key should be set to either invisible (item not displayed on the bar), "available" (present and availalbe) or "unavailable" (present, but grayed out).
    //The FennimalController gets created AFTER the subject has uncovered the Fennimal outline.

    let FennimalSVGObj = document.getElementById("Fennimal_"+FennimalObj.type)

    //Subcontroller for the item interactions stored here
    let ItemCont = false
    let FeedbackCont = false

    //Sets the correct color-scheme to the Fennimal
    function setFennimalColors(){
        //Set primary color regions
        let Primary_regions = FennimalSVGObj.getElementsByClassName("Fennimal_primary_color")
        for(let i = 0; i< Primary_regions.length; i++){
            Primary_regions[i].style.fill = FennimalObj.primary_color
        }

        //Set secondary colors
        let Secondary_regions =  FennimalSVGObj.getElementsByClassName("Fennimal_secondary_color")
        for(let i = 0; i< Secondary_regions.length; i++){
            Secondary_regions[i].style.fill = FennimalObj.secondary_color
        }

        //Set tertiary colors
        let Tertiary_regions =  FennimalSVGObj.getElementsByClassName("Fennimal_tertiary_color")
        for(let i = 0; i< Tertiary_regions.length; i++){
            Tertiary_regions[i].style.fill = FennimalObj.tertiary_color
        }
    }

    function showFennimal(){
        FennimalSVGObj.style.display = "inherit"
    }
    function hideFennimal(){
        FennimalSVGObj.style.display = "none"
    }

    function show_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "inherit"
    }
    function hide_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "none"
    }

    // Call when the interaction is aborted (probably by the subject leaving the area), before deletion of this controller
    this.interactionAborted = function(){
        hideFennimal()
        hide_Fennimal_background_mask()
        if(ItemCont !== false){
            ItemCont.interactionAborted()
        }
        SVGObjects.Prompts.Feedback.Prompt.style.display = "none"
        if(FeedbackCont !== false){
            FeedbackCont.location_left()
        }
    }

    this.interactionCompleted = function(selected_item){
        FeedbackCont = new ItemGivenPositiveFeedbackController(selected_item, FennimalObj.name)
        FennimalObj.selected_item = selected_item
        ExpCont.FennimalInteractionCompleted(FennimalObj)

    }

    // ON CONSTRUCTION
    setFennimalColors()
    show_Fennimal_background_mask()
    showFennimal()

    //Set and show the prompt text
    document.getElementById("item_bar").style.display = "none"
    SVGObjects.Layers.Item_Bar.style.display = "inherit"
    if(FennimalObj.region === "North"){
        SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "You have found an "+ FennimalObj.name
    }else{
        SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "You have found a "+ FennimalObj.name
    }
    SVGObjects.Prompts.Feedback.Prompt.style.opacity = 1
    SVGObjects.Prompts.Feedback.Prompt.style.display = "inherit"

    //After a brief delay, show the items by creating an item subcontroller
    let that = this
    setTimeout(function(){
        ItemCont = new ItemController(FennimalObj, ItemAvailability, ItemDetails,LocCont, that)
    },2000)

}

//Displays all items as available. Assumes that the FennimalObj.item codes for the correct item and gives feedback accordingly
QuizFennimalController = function(FennimalObj, ItemDetails, LocCont, ExpCont){
    let that = this
    let FennimalSVGObj = document.getElementById("Fennimal_"+FennimalObj.type)

    //Set all items to appear as available
    let ItemAvailability = {}
    for(let i=0;i<ItemDetails.All_Items.length;i++){
        ItemAvailability[ItemDetails.All_Items[i]] = "available"
    }
    let ItemCont

    //Sets the correct color-scheme to the Fennimal
    function setFennimalColors(){
        //Set primary color regions

        let Primary_regions = FennimalSVGObj.getElementsByClassName("Fennimal_primary_color")
        for(let i = 0; i< Primary_regions.length; i++){
            Primary_regions[i].style.fill = FennimalObj.primary_color
        }

        //Set secondary colors
        let Secondary_regions =  FennimalSVGObj.getElementsByClassName("Fennimal_secondary_color")
        for(let i = 0; i< Secondary_regions.length; i++){
            Secondary_regions[i].style.fill = FennimalObj.secondary_color
        }

        //Set tertiary colors
        let Tertiary_regions =  FennimalSVGObj.getElementsByClassName("Fennimal_tertiary_color")
        for(let i = 0; i< Tertiary_regions.length; i++){
            Tertiary_regions[i].style.fill = FennimalObj.tertiary_color
        }
    }
    function showFennimal(){
        FennimalSVGObj.style.display = "inherit"
    }
    function hideFennimal(){
        FennimalSVGObj.style.display = "none"
    }

    function show_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "inherit"
    }
    function hide_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "none"
    }

    this.interactionCompleted = function(selected_item){
        FennimalObj.reaction_time = Date.now() - StartTime

        FennimalObj.selected_item = selected_item
        FennimalObj.correct_answer = (FennimalObj.item === selected_item)
        showFeedback(selected_item, FennimalObj.item)
    }

    //Shows the feedback for the quiz trial
    let FeedbackGen = false
    showFeedback = function(answer_given, correct_answer){
        if(answer_given === correct_answer){
            FeedbackGen = new ItemGivenPositiveFeedbackController(FennimalObj.item, FennimalObj.name)
            SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Correct! The " + FennimalObj.name + " likes the " + correct_answer
        }else{
            //Inform the subject that a mistake has been made
            SVGObjects.Prompts.Feedback.Prompt.style.display = "inherit"
            SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Oops! The " + FennimalObj.name + " likes the " + correct_answer

            //Animate the item being thrown back
            let ItemObj = document.getElementById("item_" + answer_given)

            //Store the original transition styles
            let previous_item_transition_style = ItemObj.style.transition
            let previous_Fennimal_transition_style = FennimalSVGObj.style.transition

            ItemObj.style.transition = "1000ms ease-out"
            FennimalSVGObj.style.transition = "1000ms ease-out"

            setTimeout(function(){
                translate_pos_relative(ItemObj,0,250)
            },1000)

            //Animate the Fennimal Object disappearing
            setTimeout(function(){FennimalSVGObj.style.opacity = 0},2000)

            //After both animations are concluded, reset the transition styles
            setTimeout(function(){
                ItemObj.style.transition = previous_item_transition_style
                FennimalSVGObj.style.transition = previous_Fennimal_transition_style
                FennimalSVGObj.style.opacity = 1
                ItemObj.style.display = "none"
            },5000)

        }

        //After a timeout, tell the ExpCon that this quiz trial is completed
        setTimeout(function(){
            setTimeout(function(){
                if(FeedbackGen !== false){
                    FeedbackGen.location_left()
                    //FeedbackGen = false
                    document.getElementById("item_" + answer_given).style.display = "none"
                }

                ExpCont.FennimalInteractionCompleted(FennimalObj)
                hideFennimal()
                hide_Fennimal_background_mask()
                SVGObjects.Prompts.Feedback.Prompt.style.display = "none"
            },500)
        },4000)
    }

    // ON CONSTRUCTION
    setFennimalColors()

    //Set and show the prompt text
    SVGObjects.Layers.Item_Bar.style.display = "inherit"


    //Show the Fennimals layer
    SVGObjects.Layers.Fennimals.style.display = "inherit"
    SVGObjects.Layers.Stage.style.display = "inherit"

    let StartTime
    // We set a brief delay on showing the Fennimal and the items to make sure any starting animations have finished (this is to get a good RT measure)
    setTimeout(function(){
        // Reaction time measurement
        StartTime = Date.now()

        SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "What toy did the "+ FennimalObj.name + " like?"
        SVGObjects.Prompts.Feedback.Prompt.style.opacity = 1
        SVGObjects.Prompts.Feedback.Prompt.style.display = "inherit"

        show_Fennimal_background_mask()
        showFennimal()
        setTimeout(function(){
            ItemCont =  new ItemController(FennimalObj, ItemAvailability, ItemDetails,LocCont, that)
        },2000)

    },750)


}

//Call to manage a test trial
TestPhaseFennimalController = function(FennimalObj, ItemDetails, LocCont, ExpCont){
    let that = this
    let FennimalSVGObj = document.getElementById("Fennimal_"+FennimalObj.type)

    //Set all items
    let ItemCont

    //Sets the correct color-scheme to the Fennimal
    function setFennimalColors(){
        //Set primary color regions

        let Primary_regions = FennimalSVGObj.getElementsByClassName("Fennimal_primary_color")
        for(let i = 0; i< Primary_regions.length; i++){
            Primary_regions[i].style.fill = FennimalObj.primary_color
        }

        //Set secondary colors
        let Secondary_regions =  FennimalSVGObj.getElementsByClassName("Fennimal_secondary_color")
        for(let i = 0; i< Secondary_regions.length; i++){
            Secondary_regions[i].style.fill = FennimalObj.secondary_color
        }

        //Set tertiary colors
        let Tertiary_regions =  FennimalSVGObj.getElementsByClassName("Fennimal_tertiary_color")
        for(let i = 0; i< Tertiary_regions.length; i++){
            Tertiary_regions[i].style.fill = FennimalObj.tertiary_color
        }
    }
    function showFennimal(){
        FennimalSVGObj.style.display = "inherit"
    }
    function hideFennimal(){
        FennimalSVGObj.style.display = "none"
    }

    function show_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "inherit"
    }
    function hide_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "none"
    }

    this.interactionCompleted = function(selected_item){
        FennimalObj.selected_item = selected_item
        FennimalObj.reaction_time = Date.now() - StartTime
        console.log("stopping time measurement: " + (Date.now() - StartTime))

        //TODO: store the reaction time
        showFeedback()
    }

    //Shows the feedback for the quiz trial
    let FeedbackGen = false
    showFeedback = function(){
        SVGObjects.Prompts.Feedback.Prompt.style.display = "none"
        //Fade out the Fennimal and the item over time
        let ItemObj = document.getElementById("item_" + FennimalObj.selected_item)

        //Store the original transition styles
        let previous_item_transition_style = ItemObj.style.transition
        let previous_Fennimal_transition_style = FennimalSVGObj.style.transition

        ItemObj.style.transition = "1000ms ease-out"
        FennimalSVGObj.style.transition = "1000ms ease-out"

        //Animate the Fennimal and the item disappearing
        setTimeout(function(){
            FennimalSVGObj.style.opacity = 0
            ItemObj.style.opacity = 0
        },1500)

        //After both animations are concluded, reset the transition styles
        setTimeout(function(){
            ItemObj.style.transition = previous_item_transition_style
            FennimalSVGObj.style.transition = previous_Fennimal_transition_style
            FennimalSVGObj.style.opacity = 1
            ItemObj.style.opacity = 1
            ItemObj.style.display = "none"
        },3000)


        //After a timeout, tell the ExpCon that this quiz trial is completed
        setTimeout(function(){
            ExpCont.test_trial_completed(FennimalObj)
            hideFennimal()
            hide_Fennimal_background_mask()
        },2500)
    }

    // ON CONSTRUCTION.
    let StartTime
    // We set a brief delay on showing the Fennimal and the items to make sure any starting animations have finished (this is to get a good RT measure)
    setTimeout(function(){
        // Reaction time measurement
        StartTime = Date.now()
        console.log("starting time measurement")

        show_Fennimal_background_mask()
        showFennimal()
        ItemCont =  new ItemController(FennimalObj, FennimalObj.items_available, ItemDetails,LocCont, that)

    },750)
    setFennimalColors()

    //Set and show the prompt text. This should simply say which item was forgotten
    let forgotten_items = []
    for(let item in FennimalObj.items_available){
        if(FennimalObj.items_available[item] === "unavailable"){
            forgotten_items.push(item)
        }
    }
    if(forgotten_items.length === 0){
        SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Give one of the items to this Fennimal"
    }else{
        if(forgotten_items.length === 1){
            SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Oops! Your assistant forgot to bring the " + forgotten_items[0]
        }else{
            SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Oops! Your assistant forgot to bring some of the items"
        }
    }
    SVGObjects.Layers.Item_Bar.style.display = "inherit"

    SVGObjects.Prompts.Feedback.Prompt.style.opacity = 1
    SVGObjects.Prompts.Feedback.Prompt.style.display = "inherit"

    //Show the Fennimals layer
    SVGObjects.Layers.Fennimals.style.display = "inherit"
    SVGObjects.Layers.Stage.style.display = "inherit"

}

//Call to create an already-disovered Fennimal. Paints the Fennimal itself and animates in the object / prompt.
CompletedFennimalController = function(FennimalObj){
    let FennimalSVGObj = document.getElementById("Fennimal_"+FennimalObj.type)
    let Item = document.getElementById("item_"+FennimalObj.item)
    let item_transition_style = Item.style.transition
    Item.style.transition = ""
    Item.style.display = "inherit"

    let DropTarget = document.getElementById("Fennimal_" + FennimalObj.type + "_droptarget")
    DropTarget.style.display = "inherit"

    setTimeout(function(){
        let drop_center = getViewBoxCenterPoint(DropTarget)
        MoveElemToCoords(Item, drop_center.x,drop_center.y)
        DropTarget.style.display = "none"
        setTimeout(function(){Item.style.transition = item_transition_style},10)
    },5)

    SVGObjects.Layers.Item_Bar.style.display = "inherit"
    document.getElementById("item_bar").style.display = "none"

    //Show the correct layers: Fennimals Layer and the Fennimals stage layer
    SVGObjects.Layers.Fennimals.style.display = "inherit"
    SVGObjects.Layers.Stage.style.display = "inherit"

    let FeedbackGen = new ItemGivenPositiveFeedbackController(FennimalObj.item, FennimalObj.name)

    //Sets the correct color-scheme to the Fennimal
    function setFennimalColors(){
        //Set primary color regions

        let Primary_regions = FennimalSVGObj.getElementsByClassName("Fennimal_primary_color")
        for(let i = 0; i< Primary_regions.length; i++){
            Primary_regions[i].style.fill = FennimalObj.primary_color
        }

        //Set secondary colors
        let Secondary_regions =  FennimalSVGObj.getElementsByClassName("Fennimal_secondary_color")
        for(let i = 0; i< Secondary_regions.length; i++){
            Secondary_regions[i].style.fill = FennimalObj.secondary_color
        }

        //Set tertiary colors
        let Tertiary_regions =  FennimalSVGObj.getElementsByClassName("Fennimal_tertiary_color")
        for(let i = 0; i< Tertiary_regions.length; i++){
            Tertiary_regions[i].style.fill = FennimalObj.tertiary_color
        }
    }

    function showFennimal(){
        FennimalSVGObj.style.display = "inherit"
    }
    function hideFennimal(){
        FennimalSVGObj.style.display = "none"
    }

    function show_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "inherit"
    }
    function hide_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "none"
    }

    this.interactionAborted = function(){
        hideFennimal()
        hide_Fennimal_background_mask()
        if(FeedbackGen !== false){
            FeedbackGen.location_left()
            FeedbackGen = false
        }
        Item.style.display = "none"
        //MoveElemToCoords(Item, -500,-500)
    }

    setFennimalColors()
    show_Fennimal_background_mask()
    showFennimal()


}

//Given an array  of items, manages all the item interactions.
ItemController = function(FennimalObj, ItemAvailability, ItemDetails,LocCont, FenCont){
    //References to the item bar
    let ItemBar = document.getElementById("item_bar")
    SVGObjects.Layers.Item_Bar.style.display = "inherit"

    //Calculate which items should be shown on the screen
    let Available_Items_On_Screen = []
    for(let key in ItemAvailability){
        if(ItemAvailability[key] === "available"){
            Available_Items_On_Screen.push(key)
        }
    }

    //Keep track of the drop target
    let DropTarget = document.getElementById("Fennimal_" + FennimalObj.type + "_droptarget")

    //Reference to the feedback controller
    let FeedbackCont = false

    //Controls the interactions for a single button. Create with an item name and the relative X location on the item bar
    ItemIcon = function (item_name, relative_x_pos_on_bar, background_color, Controller){
        //Find a reference to the icon element in the SVG
        let IconElem = document.getElementById("item_icon_" + item_name)
        IconElem.style.display = "inherit"
        let ItemBar = document.getElementById("item_bar")

        //Set the correct color to the background rect
        let IconElem_background = document.getElementById("item_icon_" + item_name + "_background")
        IconElem_background.style.fill = background_color

        //Get the correct x and y pos on the item bar
        let item_bar_x = parseFloat(ItemBar.getAttribute("x"))
        let item_bar_width = parseFloat(ItemBar.getAttribute("width"))
        let item_bar_y = parseFloat(ItemBar.getAttribute("y"))
        let item_bar_height = parseFloat(ItemBar.getAttribute("height"))

        //Translate the icon to the right position on the item bar
        MoveElemToCoords(IconElem,item_bar_x + relative_x_pos_on_bar*item_bar_width,item_bar_y + 0.5 * item_bar_height)

        //Hides the icon button element
        this.hideButton = function(){
            IconElem.style.display = "none"
        }

        //Shows the icon button element
        this.showButton = function(){
            IconElem.style.display = "inherit"
        }

        //Shimmers the icon button element
        this.shimmerButton = function(){
            IconElem_background.classList.add("shimmered_object")
        }

        //Set an event listener for when the icon is pressed. If so, then let the subcontroller know
        IconElem.onmousedown = function(event){
            let mouse_pos = getMousePosition(event)
            Controller.buttonSelected(item_name, mouse_pos.x,mouse_pos.y)
        }

    }

    //Adds a not-available icon on the item bar
    NotAvailableIcon = function(item_name, relative_x_pos_on_bar){
        //Find a reference to the icon element in the SVG
        let IconElem = document.getElementById("item_icon_" + item_name + "_not_available")
        IconElem.style.display = "inherit"
        let ItemBar = document.getElementById("item_bar")

        //Get the correct x and y pos on the item bar
        let item_bar_x = parseFloat(ItemBar.getAttribute("x"))
        let item_bar_width = parseFloat(ItemBar.getAttribute("width"))
        let item_bar_y = parseFloat(ItemBar.getAttribute("y"))
        let item_bar_height = parseFloat(ItemBar.getAttribute("height"))

        //Translate the icon to the right position on the item bar
        MoveElemToCoords(IconElem,item_bar_x + relative_x_pos_on_bar*item_bar_width,item_bar_y + 0.5 * item_bar_height - 3)

        this.hideButton = function(){
            IconElem.style.display = "none"
        }
        //Shows the icon button element
        this.showButton = function(){
            IconElem.style.display = "inherit"
        }


    }

    // DRAGGING STATE //
    //Keeps track of the dragging state, which determines whether (and which) items are being dragged by the subject
    let dragging_state = false

    //Dragging state functions
    function stoppedDragging(mouse_x,mouse_y){
        //Get distance between the mouse and the center of the drop target
        let drop_center = getViewBoxCenterPoint(DropTarget)
        let distance_to_target = EUDist(mouse_x,mouse_y,drop_center.x,drop_center.y)

        //Hide the drop target
        DropTarget.style.display = "none"

        if(distance_to_target <= Param.minimum_drop_target_distance){
            //Snap item to the center of the target
            let ItemObj = document.getElementById("item_"+dragging_state)
            MoveElemToCoords(ItemObj, drop_center.x,drop_center.y)

            //Item has been given. Freeze for feedback
            let item_selected_by_subject = dragging_state
            dragging_state = "frozen"

           Fennimal_interaction_completed(item_selected_by_subject)

        }else{
            //Nothing has been given yet
            resetDraggedItem()

            //Change the dragging state to false
            dragging_state = false

            //Show all item icons
            showIconButtons();
            document.getElementById("item_bar").style.display = "inherit"

            //Show the prompt
            SVGObjects.Prompts.Item.Prompt.style.opacity = 1
        }

    }
    function resetDraggedItem(){
        //Remove the currently dragged item
        let ItemObj = document.getElementById("item_"+dragging_state)
        ItemObj.style.display = "none"
        MoveElemToCoords(ItemObj,-500,-500)
    }
    function dragItemtoCursor(mouse_x,mouse_y){
        //Find the correct item, based on the current dragging state
        let ItemObj = document.getElementById("item_"+dragging_state)
        MoveElemToCoords(ItemObj, mouse_x,mouse_y)
    }

    document.onmouseup = function(event){
        if(dragging_state !== false && dragging_state!== "frozen"){
            let mouse_pos = getMousePosition(event)
            stoppedDragging(mouse_pos.x,mouse_pos.y)
        }
    }
    document.onmouseleave = function(event){
        if(dragging_state !== false && dragging_state!== "frozen"){
            let mouse_pos = getMousePosition(event)
            stoppedDragging(mouse_pos.x,mouse_pos.y)
        }
    }
    document.onmousemove = function(event){
        if(dragging_state!==false && dragging_state!== "frozen"){
            //Get the correct mouse position in the SVG coordinates
            let mouse_pos = getMousePosition(event)
            dragItemtoCursor(mouse_pos.x,mouse_pos.y)
        }
    }

    //Call on construction to generate all the item icon buttons.
    // If an item is not included in Available_Items_On_Screen, then shows the not_available icon instead
    let that = this
    function createIconButtonObjects(){
        for(let i=0;i<ItemDetails.All_Items.length;i++){
            let itemname = ItemDetails.All_Items[i]

            let item_available = ItemAvailability[itemname]
            let backgroundcolor = ItemDetails[itemname].backgroundColor
            let xpos = Param.ItemRelativeXPositions[ItemDetails.All_Items.length][i]

            if(item_available === "available"){
                IconButtons[itemname] = new ItemIcon(itemname, xpos, backgroundcolor,that)
            }

            if(item_available === "unavailable"){
                IconNotAvailable[itemname] = new NotAvailableIcon(itemname,xpos)
            }
        }

    }

    //Shimmer all icon buttons
    function shimmerAllButtons(){
        let buttonrefs = Object.keys(IconButtons)

        for(let i=0;i<buttonrefs.length;i++){
            IconButtons[buttonrefs[i]].shimmerButton()
        }
    }

    //Hide all icon buttons
    function hideIconButtons(){
        let buttonrefs = Object.keys(IconButtons)

        for(let i=0;i<buttonrefs.length;i++){
            IconButtons[buttonrefs[i]].hideButton()
        }

        let notavailable_refs = Object.keys(IconNotAvailable)
        for(let i=0;i<notavailable_refs.length;i++){
            IconNotAvailable[notavailable_refs[i]].hideButton()
        }
    }

    //Hides all items
    function hide_all_items(){
        for(let i =0;i<ItemDetails.All_Items.length;i++){
            let SVGobj = document.getElementById("item_"+ItemDetails.All_Items[i])
            MoveElemToCoords(SVGobj, -200,-200)
        }

    }

    //Show all icon buttons
    function showIconButtons(){
        let buttonrefs = Object.keys(IconButtons)

        for(let i=0;i<buttonrefs.length;i++){
            IconButtons[buttonrefs[i]].showButton()
        }

        let notavailable_refs = Object.keys(IconNotAvailable)
        for(let i=0;i<notavailable_refs.length;i++){
            IconNotAvailable[notavailable_refs[i]].showButton()
        }
    }

    // BUTTON INTERACTIONS //
    //Call when one of the icon buttons is clicked
    this.buttonSelected = function (item_name, mouse_x,mouse_y){
        //Hide all item icons
        hideIconButtons();
        document.getElementById("item_bar").style.display = "none"

        //Set the correct dragging state
        dragging_state = item_name

        //Hide the prompt
        SVGObjects.Prompts.Item.Prompt.style.opacity = 0

        //Show the dragged item
        let ItemObj = document.getElementById("item_"+dragging_state)
        ItemObj.style.display = "inherit"
        ItemObj.style.transition = ""
        MoveElemToCoords(ItemObj, mouse_x,mouse_y)

        //Show the target outline
        DropTarget.style.display = "inherit"

    }

    //Call when the interaction is aborted
    this.interactionAborted = function(){
        ItemBar.style.display = "none"
        hideIconButtons()
        hide_all_items()
        if(FeedbackCont !== false){
            FeedbackCont.location_left()
            FeedbackCont = false
        }
    }

    //Call the prevent the subject from leaving the Fennimal location. True to block leaving, false to release the block
    function block_subject_from_leaving(bool){
        LocCont.prevent_subject_from_leaving_location(bool)
    }

    //Call after feedback to resolve the Fennimal interaction.
    function Fennimal_interaction_completed(selected_item){
        //Inform the FC that a Fennimal interaction has been completed
        FenCont.interactionCompleted(selected_item)

    }

    // CONSTRUCTION ///
    ItemBar.style.display = "inherit"
    //Create objects for the icons on the item bar
    let IconButtons = {}
    let IconNotAvailable = []
    createIconButtonObjects()
    shimmerAllButtons()

    //Set and show the prompt text
    if(Available_Items_On_Screen.length === 0){
        SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Oops! You did not bring the correct item with you"
    }else{
        if(Available_Items_On_Screen.length === 1){
            SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Give the " + FennimalObj.item + " to the " + FennimalObj.name
        }else{
            SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Give one of the available items to the " + FennimalObj.name
        }
    }

    SVGObjects.Prompts.Feedback.Prompt.style.opacity = 1
    SVGObjects.Prompts.Feedback.Prompt.style.display = "inherit"

}

//Given an item name, generates the feedback hearts and movement until stopped. Includes the prompt on top of the screen
ItemGivenPositiveFeedbackController = function(item_name, fennimal_name){
    SVGObjects.Layers.Feedback.style.display = "inherit"
    let Item = document.getElementById("item_"+item_name)
    let feedbacktime = Param.FennimalTimings.training_phase_feedback_animation_time
    let original_transition_style = Item.style.transition
    let animation_interval = false

    //Set and show the prompt text
    SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "The "+ fennimal_name + " likes the " + item_name
    SVGObjects.Prompts.Feedback.Prompt.style.opacity = 1
    SVGObjects.Prompts.Feedback.Prompt.style.display = "inherit"

    //Setting the maximum x and y deviation from the center item in which hearts can be generated
    let max_deviation = 25

    // Animation for the ball-bounce. Bounces are _height high and are set on an interval, which each bounce taking _time ms. The animation is terminated after _rep repetitions.
    function BounceElem(_height, _time){
        function bounce(){
            //Going down
            Item.style.transition = 0.3*_time + "ms ease-in"
            translate_pos_relative(Item,0,_height)

            //Back up again
            setTimeout(function(){
                Item.style.transition = 0.7*_time + "ms ease-out"
                translate_pos_relative(Item,0,0-_height)
            },0.3*_time)
        }

        animation_interval = setInterval(function(){
            bounce()
        },_time)
    }

    // Animation for the car-ride
    //TODO: make repeat via interval
    function RideElem(_total_time){
        Item.style.transition = "all " + (0.10*_total_time) + "ms ease-out"

        function ride(){
            //Moving the car down (the first 10% of animation time)
            translate_pos_relative(Item, 50, 50)

            //Travel the car to the left (first iteration)
            setTimeout(function(){
                Item.style.transition = "all " + (0.10*_total_time) + "ms ease-out"
                translate_pos_relative(Item, -100, 0)
            }, 0.10 * _total_time)

            //Travel the car back to the right (first iteration)
            setTimeout(function(){
                Item.style.transition = "all " + (0.20*_total_time) + "ms ease-out"
                translate_pos_relative(Item, 100, 0)
            }, 0.20 * _total_time)

            //Travel the car to the left (second iteration)
            setTimeout(function(){
                Item.style.transition = "all " + (0.10*_total_time) + "ms ease-out"
                translate_pos_relative(Item, -100, 0)
            }, 0.40 * _total_time)

            //Travel the car back to the right (second iteration)
            setTimeout(function(){
                Item.style.transition = "all " + (0.20*_total_time) + "ms ease-out"
                translate_pos_relative(Item, 100, 0)
            }, 0.50 * _total_time)

            //Travel the car to the left (third iteration)
            setTimeout(function(){
                Item.style.transition = "all " + (0.10*_total_time) + "ms linear"
                translate_pos_relative(Item, -100, 0)
            }, 0.70 * _total_time)

            //Travel the car back to the right (third iteration)
            setTimeout(function(){
                Item.style.transition = "all " + (0.15*_total_time) + "ms linear"
                translate_pos_relative(Item, 100, 0)
            }, 0.80 * _total_time)

            setTimeout(function(){
                Item.style.transition = "all " + (0.05*_total_time) + "ms linear"
                translate_pos_relative(Item, -50, -50)
            }, 0.95 * _total_time)

            //At the end of animation, reset the original transition style
            setTimeout(function(){Item.style.transition = original_transition_style},_total_time)
        }

        ride()
        animation_interval = setInterval(function(){
            ride()
        }, _total_time)
    }

    //Animates a number of squeezes in an y and/or y direction
    function SqueezeElem(_amountX, _amountY, _time_per_squeeze){
        //Sqeeze actions.
        function ScaleAtCenter(sx,sy){
            Item.transform.baseVal.getItem(0).matrix.a = sx
            Item.transform.baseVal.getItem(0).matrix.d = sy
        }

        //Setting the offsets to move the center
        let x_offset = (1-_amountX)*75
        let y_offset = (1-_amountY)*40

        function squeeze(){
            //Compress and reset center
            Item.style.transition = 0.4*_time_per_squeeze + "ms ease-out"
            ScaleAtCenter(_amountX,_amountY)
            if(_amountX !== 1) { translate_pos_relative(Item,x_offset,0) }
            if(_amountY !== 1) { translate_pos_relative(Item,0,y_offset) }

            //Return and return center
            setTimeout(function(){
                Item.style.transition = 0.6*_time_per_squeeze + "ms ease-out"
                ScaleAtCenter(1,1)
                if(_amountX !== 1) { translate_pos_relative(Item,-x_offset*_amountX,0) }
                if(_amountY !== 1) { translate_pos_relative(Item,0,-y_offset*_amountY) }
            },0.4*_time_per_squeeze)
        }

        //Squeezing interval
        squeeze()
        animation_interval = setInterval(function(){
           squeeze()
        },_time_per_squeeze)

    }

    function ThrowElem(_height, _time){
        function throwing(){
            //Going up
            Item.style.transition = 0.35*_time + "ms ease-out"
            translate_pos_relative(Item,0,-(_height))

            //Back down again
            setTimeout(function(){
                Item.style.transition = 0.7*_time + "ms ease-in"
                translate_pos_relative(Item,0,_height)
            },0.3*_time)

        }
        throwing()
        animation_interval = setInterval(function(){
            throwing()
        },_time)
    }

    function FlyElement(_time_per_round){
        function fly(){
            let start_x = getViewBoxCenterPoint(Item).x
            let start_y = getViewBoxCenterPoint(Item).y

            //Storing original transform and transition style
            let Original_Transform = Item.getAttribute("transform")
            let original_transition_style = Item.style.transition

            //Setting animation for the up-swing
            Item.style.transition = "all " + 0.4 * _time_per_round +  "ms ease-out"
            RotateElem(Item,-179)
            MoveElemToCoords(Item, start_x -70, start_y + 90)

            //Set a timer for the downswing
            setTimeout(function(){
                Item.style.transition = "all " + 0.4*_time_per_round +  "ms ease-in"
                RotateElem(Item,-175)
                MoveElemToCoords(Item, start_x - 70, start_y - 70)
            },0.4 * _time_per_round)

            //Right before the end of the animation, reset the element to its original transform (especially important with the rotation
            setTimeout(function(){
                Item.style.transition = "all " + 0.09*_time_per_round +  "ms linear"
                Item.setAttribute("transform", Original_Transform)
            },0.8* _time_per_round )

            //At end, reset the transition attribute
            setTimeout(function(){
                Item.style.transition = original_transition_style
            }, 0.85 * _time_per_round )
        }

        fly()
        animation_interval = setInterval(function(){
            fly()
        }, _time_per_round)



    }

    //Creates a svg heart at the x and y position that moves to the top of the y axis, while fading out. Set animations with css.
    FeedbackHeart = function(start_x,start_y){
        //Copy the heart svg element
        let HeartObj = document.getElementById("feedback_heart")
        let FeedbackLayer = document.getElementById("Feedback_layer")

        let NewHeart = HeartObj.cloneNode(true)
        FeedbackLayer.appendChild(NewHeart)
        NewHeart.style.display="none"
        MoveElemToCoords(NewHeart, start_x,start_y)
        NewHeart.style.opacity = .75

        setTimeout(function(){
            NewHeart.style.display = "inherit"
        },10)

        //After a brief waiting period, move upwards
        setTimeout(function(){
            //Select a random movement around the starting xposition to translate to
            let max_deviation = 100
            let random_x = randomIntFromInterval(start_x- max_deviation, start_x + max_deviation)
            MoveElemToCoords(NewHeart, random_x,-50)
            NewHeart.style.opacity = 0
            NewHeart.style.fill = "red"
        },100)

        //Self-destruct after 5 seconds to prevent cluttering the browser
        setTimeout(function(){
            FeedbackLayer.removeChild(NewHeart)
        },5000)

    }

    //Showing the item animation
    function animate_item_movement(){
        switch(item_name){
            case("ball"): BounceElem(50,feedbacktime/5); break;
            case("car"): Item.getElementsByClassName("movement_container")[0].classList.add("movement_container_active"); break;
            case("duck"): SqueezeElem(1,0.5,feedbacktime/5); break;
            case("bear"): SqueezeElem(0.5,1,feedbacktime/5); break;
            case("bone"): ThrowElem(50,feedbacktime/5); break;
            case("plane"): FlyElement(feedbacktime); break;
            case("shovel"):
                // Shovel uses a subcontainer to animate the movement
                Item.getElementsByClassName("movement_container")[0].classList.add("movement_container_active");
                break
            case("balloon"):
                //Balloon uses a subcontainer to animate the movement
                Item.getElementsByClassName("movement_container")[0].classList.add("movement_container_active");
                break;
            case("trumpet"):
                Item.getElementsByClassName("rotation_container")[0].classList.add("swing_container_active")
                break;
            case("spinner"):
                Item.getElementsByClassName("item_container")[0].classList.add("item_container_active")
                break;
            case("boomerang"):
                Item.getElementsByClassName("spin_container")[0].classList.add("spin_container_active")
                Item.getElementsByClassName("movement_container")[0].classList.add("movement_container_active")
                break;

        }
    }

    //Call when leaving an area to clear the intervals
    this.location_left = function(){
        SVGObjects.Prompts.Feedback.Prompt.style.display = "none"
        clearInterval(heartgenerator)
        clearInterval(animation_interval)
        Item.style.transition = original_transition_style

        //Clear all remaining hearts
        let Remaining_hearts = document.getElementsByClassName("feedback_heart")
        for(let i=0; i<Remaining_hearts.length ; i++){
            Remaining_hearts[i].style.display = "none"
        }

        //For some of the items, reset the classname
        switch(item_name){
            case("shovel"):
                // Shovel uses a subcontainer to animate the movement
                Item.getElementsByClassName("movement_container")[0].classList.remove("movement_container_active");
                break
            case("balloon"):
                //Balloon uses a subcontainer to animate the movement
                Item.getElementsByClassName("movement_container")[0].classList.remove("movement_container_active");
                break;
            case("trumpet"):
                Item.getElementsByClassName("rotation_container")[0].classList.remove("swing_container_active")
                break;
            case("spinner"):
                Item.getElementsByClassName("item_container")[0].classList.remove("item_container_active")
                break;
            case("boomerang"):
                Item.getElementsByClassName("spin_container")[0].classList.remove("spin_container_active")
                Item.getElementsByClassName("movement_container")[0].classList.remove("movement_container_active")
                break
            case("car"): Item.getElementsByClassName("movement_container")[0].classList.remove("movement_container_active");break;


        }
    }

    // CONSTRUCTION //
    //Now we can set an interval to create the hearts and movement
    let heartgenerator = false

    setTimeout(function(){
        animate_item_movement()
        heartgenerator = setInterval(function(){
            //Get a random location within the range. For some reason the heart path seems to be mis-centered, so the constants are to adjust for this
            let ItemCoords = getViewBoxCenterPoint(Item)
            let random_x = randomIntFromInterval(Math.round(ItemCoords.x) - max_deviation, Math.round(ItemCoords.x) + max_deviation) + 20
            let random_y = randomIntFromInterval(Math.round(ItemCoords.y) - max_deviation, Math.round(ItemCoords.y) + max_deviation) + 20

            //Generate a new heart
            let NewHeart = new FeedbackHeart(random_x,random_y)
        },Param.time_between_feedback_hearts)
    },500)



}

//Inform the subject that an objective has been achieved, including the animated stars
ObjectiveAchievedController = function(text_top, text_bottom, show_mask){
    //Storing references to the star and the layer
    let StarObj = document.getElementById("objective_achieved_star")
    StarObj.style.display = "none"

    if(! show_mask){
        document.getElementById("objective_achieved_mask").style.display = "none"
    }else{
        document.getElementById("objective_achieved_mask").style.display = "inherit"
    }

    let ObjectiveAchievedLayer = SVGObjects.Layers.ObjectiveAchieved.Layer
    ObjectiveAchievedLayer.style.display = "inherit"

    //Setting the text
    let TopTextObj = SVGObjects.Layers.ObjectiveAchieved.Text_Top.childNodes[0]
    TopTextObj.innerHTML = text_top
    TopTextObj.style.display = "none"
    TopTextObj.style.opacity = 0

    let BottomTextObj = SVGObjects.Layers.ObjectiveAchieved.Text_Bottom.childNodes[0]
    BottomTextObj.innerHTML = text_bottom
    BottomTextObj.style.display = "none"
    BottomTextObj.style.opacity = 0

    setTimeout(function(){
        TopTextObj.style.display = "inherit"
        BottomTextObj.style.display = "inherit"
    },10)

    setTimeout(function(){
        TopTextObj.style.opacity = .8
        BottomTextObj.style.opacity = .8
    },20)

    setTimeout(function(){
        TopTextObj.style.opacity = 0
        BottomTextObj.style.opacity = 0
    },3000)

    //Creates a svg star at the x and y position that moves to A RANDOM DIRECTION, while fading out. Set animations with css.
    FeedbackStar = function(start_x,start_y){
        //Copy the heart svg element
        let NewStar = StarObj.cloneNode(true)
        ObjectiveAchievedLayer.appendChild(NewStar)
        NewStar.style.display="none"
        MoveElemToCoords(NewStar, start_x,start_y)
        NewStar.style.opacity = .5

        setTimeout(function(){
            NewStar.style.display = "inherit"
        },10)

        //After a brief waiting period, move upwards
        setTimeout(function(){
            //Select a random movement around the starting xposition to translate to
            let max_deviation = 500
            let random_x = randomIntFromInterval(start_x- max_deviation, start_x + max_deviation)
            let random_y = randomIntFromInterval(start_y- max_deviation, start_y + max_deviation)
            MoveElemToCoords(NewStar, random_x,random_y)
            NewStar.style.opacity = 0
            NewStar.style.fill = "goldenrod"
        },25)

        //Self-destruct after 3 seconds to prevent cluttering the browser
        setTimeout(function(){
            ObjectiveAchievedLayer.removeChild(NewStar)
        },3000)

    }

    let stargenerator = false
    setTimeout(function(){
        stargenerator = setInterval(function(){
            //Get a random location within the range. For some reason the heart path seems to be mis-centered, so the constants are to adjust for this
            let random_x = randomIntFromInterval(50,458)
            let random_y = randomIntFromInterval(20,263)

            //Generate a new heart
            let NewStar1 = new FeedbackStar(random_x,random_y)
            let NewStar2 = new FeedbackStar(random_x,random_y)
            let NewStar3 = new FeedbackStar(random_x,random_y)
            let NewStar4 = new FeedbackStar(random_x,random_y)
        },150)
    }, 250)

   //After a period of time, hide all feedback and stop generating new starts
    function hide(){

       // document.querySelectorAll('.objective_achieved_star').forEach(e => e.remove());
        ObjectiveAchievedLayer.style.display = "none"
    }
    function stop_generating_hearts(){
        clearInterval(stargenerator)
    }

    setTimeout(function(){stop_generating_hearts()}, 3000)
    setTimeout(function(){hide()}, 4000)

}

//Controls all the interactions for the instructions and the home buttom
InstructionsController = function(ExpCont, LocCont){
    let that = this

    //Keep track of whether the Welcome stage has already been seen in its entiretey before
    let welcome_screen_completed = false

    //Keeps track of which instructions state we are currently in. Valid calls include "welcome", "exploration", "search"
    let current_instructions_state

    //Shows the map in the background
    function show_map_background(){
        LocCont.show_passive_map()
    }

    //Clears all instruction subpages
    function hide_all_instruction_pages(){
        cull_the_marked();
        let AllInstructionPages = document.getElementsByClassName("instruction_page")
        for(let i = 0; i < AllInstructionPages.length; i++){
            AllInstructionPages[i].style.display = "none"
        }
    }

    //Call to show the first iteration of the welcome screen
    let welcome_screen_current_box_shown = 1
    let number_of_instruction_boxes = 7

    //Shows the start screen with the F11 prompt\
    this.gotoStartScreen = function(){
        current_instructions_state = "start"

        //Hide all pages
        hide_all_instruction_pages()

        //Show the instructions layer and the welcome screen
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Start.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Set event listener for the fullscreen button
        document.getElementById("button_instructions_fullscreen").addEventListener("mousedown", toggleFullscreen)
        document.getElementById("button_instructions_fullscreen").addEventListener("mousedown", that.gotoWelcomeScreen)
    }

    this.gotoWelcomeScreen = function(){
        current_instructions_state = "welcome"
        showWelcomeScreen()
    }
    function showWelcomeScreen(){
        //Hide all pages
        hide_all_instruction_pages()

        //Show the instructions layer and the welcome screen
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Welcome.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Check whether or not we need to run through the instructions step-by-step
        if(current_instructions_state === "welcome" && ! welcome_screen_completed){
            //Hide all the action animation boxes. Note that all boxes are labeled in the svg as "instructions_welcome_block(i)x", with i ranging from 1 to 7.
            // Starting at 2, so the first step is already visible
            for(let i = 2; i<=number_of_instruction_boxes;i++){
                document.getElementById("instructions_welcome_block" + i + "x").style.display = "none"
            }
        }else{
            for(let i = 1; i<=number_of_instruction_boxes;i++){
                document.getElementById("instructions_welcome_block" + i + "x").style.display = "inherit"
            }
        }

        //Set the event handler
        document.getElementById("button_instructions_welcome").onclick = function(){welcome_screen_button_pressed()}

    }

    function welcome_screen_button_pressed(){
        switch(current_instructions_state){
            case("welcome"):
                next_welcome_screen_box()
                break
            case("exploration"):
                showExplorationPage()
                break
            case("search"):
                showSearchPage()
                break;
            case("delivery"):
                showDeliveryPage()
                break
            case("quiz"):
                showQuizPage()
                break
            case("remedial"):
                showRemedialPage()
                break

        }

    }

    //Call to advance the welcome screen
    function next_welcome_screen_box(){
        //Check if all welcome screen boxes are already visible. If not, then show the next one. If yes, then tell the EC that the instruction page has been completed
        if(welcome_screen_current_box_shown < number_of_instruction_boxes){
            //Increment the counter
            welcome_screen_current_box_shown++

            //Show the next box
            document.getElementById("instructions_welcome_block" + welcome_screen_current_box_shown + "x").style.display = "inherit"

        }else{
            hide_all_instruction_pages()
            welcome_screen_completed = true
            ExpCont.starting_instructions_finished()
        }
    }

    //Subcontroller and variables for the backpack item selection
    let current_item_in_backpack = false

    BackpackItemButtonController = function(item_name, position, backgroundcolor, xpos,  InstrCon){
        //Get the correct SVG references
        let SVG_Element = document.getElementById("instructions_delivery_icon_" + item_name)
        let SVG_Box = SVG_Element.getElementsByClassName("instructions_delivery_icon_box")[0]
        let Container = document.getElementById("instructions_delivery_item_box")

        //Set the correct outline highlights
        SVG_Box.classList.add("shimmered_outline")

        //Get the correct x and y pos on the item bar
        let item_bar_x = parseFloat(Container.getAttribute("x")) + 5// - 20
        let item_bar_width = parseFloat(Container.getAttribute("width")) - 10  // + 40
        let item_bar_y = parseFloat(Container.getAttribute("y"))
        let item_bar_height = parseFloat(Container.getAttribute("height"))

        //Translate the icon to the right position on the item bar
        MoveElemToCoords(SVG_Element,item_bar_x + xpos*item_bar_width,item_bar_y + 0.5 * item_bar_height)

        //Call if the button has been selected (true) or if another item has been selected (false)
        let current_button_state
        function toggleButtonHighlighted(bool){
            if(bool){
                //Set the correct color to the background rect
                SVG_Box.style.fill = backgroundcolor
            }else{
                //Set the correct color to the background rect
                SVG_Box.style.fill = "lightgray"
            }
        }

        //Add an eventlistener to the element
        SVG_Element.onclick = function(){
            if(current_instructions_state === "delivery"){InstrCon.delivery_page_item_selected(item_name)}
            if(current_instructions_state === "remedial"){ InstrCon.remedial_page_item_selected(item_name)}
        }

        //On construction
        toggleButtonHighlighted(true)

        //Call when an item has been selected. If this is the correct item, then it will be higlighted. If not, then is will be de-emphasized
        this.item_has_been_selected = function(selected_item_name){
            toggleButtonHighlighted(selected_item_name === item_name)
        }


    }

    // EXPLORATION PHASE //
    //Shows and updates the exploration instructions screen. Call with the LocationVisitationObject and the FennimalsPresentOnMap object.
    let CurrentLocationVisitationObject, CurrentFennimalsPresentOnMap
    this.showExplorationInstructions = function(LocationVisitationObject, FennimalsPresentOnMap){
        CurrentLocationVisitationObject = LocationVisitationObject
        CurrentFennimalsPresentOnMap = FennimalsPresentOnMap

        showExplorationPage()
    }

    //Call to show the exploration instructions, assuming the CurrentLocationVisitationObject and CurrentFennimalsPresentOnMap have been declared
    function showExplorationPage(){
        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Exploration.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Set the correct state for the button.
        current_instructions_state = "welcome"

        //Setting the correct text and state for the locations. These are assumed to be provided as an object with one key for each location.
        // If the value of this key is false, then the location has not yet been found. Any other values indicates that the location has been visited.
        let keys = Object.getOwnPropertyNames(CurrentLocationVisitationObject)
        for(let i = 0; i<keys.length;i++){
            //All locations are labeled as instructions_exploration_target_location_ix, with i ranging from 1 to 16
            let Box = document.getElementById("instructions_exploration_target_location_" + (i+1) + "x")
            Box.style.display = "inherit"

            //Setting the correct text
            Box.getElementsByTagName("text")[0].childNodes[0].innerHTML = Param.SubjectFacingLocationNames[keys[i]]

            let region_color = Param.RegionData[Param.LocationTransitionData["location_"+keys[i]].region].color
            let region_color_light = Param.RegionData[Param.LocationTransitionData["location_"+keys[i]].region].lighter_color
            let region_color_dark = Param.RegionData[Param.LocationTransitionData["location_"+keys[i]].region].darker_color

            //Setting the visible state of the elements
            if(CurrentLocationVisitationObject[keys[i]] === false){
                //Target has not been found
                Box.getElementsByTagName("path")[0].style.opacity = 0
                Box.getElementsByTagName("rect")[0].style.fill = region_color_light + "44"
                Box.getElementsByTagName("text")[0].childNodes[0].style.fill = region_color_dark + "55"
            }else{
                //Target has been found
                Box.getElementsByTagName("path")[0].style.opacity = 1
                Box.getElementsByTagName("rect")[0].style.fill = region_color_light
                Box.getElementsByTagName("text")[0].childNodes[0].style.fill = region_color_dark
            }

        }

        //Now we can do the same for the Fennimals. These are indexed by locations, so we first have to transform them into a new object.
        let FennimalsByNameObj = {}
        let Fennimal_Locations = []

        for(let key in CurrentFennimalsPresentOnMap){
            if(CurrentFennimalsPresentOnMap[key] !== false && key !== "MetaData"){
                FennimalsByNameObj[CurrentFennimalsPresentOnMap[key].name] = !("order_found" in CurrentFennimalsPresentOnMap[key])
                Fennimal_Locations.push(key)
            }
        }

        //Now we have a list of Fennimal names and wether (true) or not (false) they have already been found. Setting the boxes correctly
        keys = Object.getOwnPropertyNames(FennimalsByNameObj)
        for(let i=0;i<keys.length;i++){
            //All locations are labeled as instructions_exploration_target_location_ix, with i ranging from 1 to 16
            let Box = document.getElementById("instructions_exploration_target_Fennimal_" + (i+1) + "x")
            Box.style.display = "inherit"

            //Setting the correct text
            Box.getElementsByTagName("text")[0].childNodes[0].innerHTML = keys[i]

            //Finding correct colors
            let region_color_light = Param.RegionData[Param.LocationTransitionData["location_"+Fennimal_Locations[i]].region].lighter_color
            let region_color_dark = Param.RegionData[Param.LocationTransitionData["location_"+Fennimal_Locations[i]].region].darker_color


            //Setting the visible state of the elements
            if(FennimalsByNameObj[keys[i]]){
                //Fennimal has not been found
                Box.getElementsByTagName("path")[0].style.opacity = 0
                Box.getElementsByTagName("rect")[0].style.fill = region_color_light + "44"
                Box.getElementsByTagName("text")[0].childNodes[0].style.fill = region_color_dark + "55"
            }else{
                //
                Box.getElementsByTagName("path")[0].style.opacity = 1
                Box.getElementsByTagName("rect")[0].style.fill = region_color_light
                Box.getElementsByTagName("text")[0].childNodes[0].style.fill = region_color_dark
            }

        }

        //Set the event handlers for the two buttons. Continue should go to the map, Instructions should go to the welcome page.
        document.getElementById("button_instructions_exploration_continue").onclick = function(){
            ExpCont.exploration_instruction_page_closed()
        }
        document.getElementById("button_instructions_exploration_welcome").onclick = function(){
            showWelcomeScreen()
        }


    }

    // SEARCH PHASE //
    //////////////////
    let current_search_location, current_search_type
    this.showSearchInstructions = function(type_name, location_name){
        current_search_location = location_name
        current_search_type = type_name

        //Set the correct state for the button.
        current_instructions_state = "search"
        showSearchPage()
    }
    function showSearchPage(){

        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Search.style.display = "inherit"
        SVGObjects.Instructions.OutlineIconLayer.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Show the correct hint and outline
        set_outline()

        //Create a container for the title and text elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Pages.Search.appendChild(Container)

        Container.appendChild(createInstructionTitleElem(Instructions.Test_Phase.Search.title))
        Container.appendChild(createTextField(30, 50, 508-2*30,200, Instructions.Test_Phase.Search.text))

        //Show the correct hint
        if(Param.hints_based_on_location){
            document.getElementById("instructions_search_hint").childNodes[0].innerHTML = Param.HintsBasedOnLocation[current_search_location]
        }else{
            document.getElementById("instructions_search_hint").childNodes[0].innerHTML = Param.RegionData[Param.LocationTransitionData["location_"+ current_search_location].region].hint
        }

        //Set the event handlers for the two buttons. Continue should go to the map, Instructions should go to the welcome page.
        document.getElementById("button_instructions_search_continue").onclick = function(){
           ExpCont.search_instruction_page_closed()
        }
        document.getElementById("button_instructions_search_welcome").onclick = function(){
            showWelcomeScreen()
        }

    }

    //Assumes that current_search_type has already been correctly set
    function set_outline(){
        //Hide all outline icons and show only the correct one
        let AllIcons = document.getElementsByClassName("Fennimal_Search_Target")
        for(let i=0;i<AllIcons.length;i++){
            AllIcons[i].style.display = "none"
        }
        document.getElementById("Fennimal_Search_Target_" + current_search_type).style.display = "inherit"

    }

    // DELIVERY PHASE //
    ////////////////////
    let ItemDetails, BackpackItemButtonControllers
    this.delivery_page_item_selected = function(selected_item_name){
        current_item_in_backpack = selected_item_name

        //Highlight the selected button
        for(let i =0; i<BackpackItemButtonControllers.length;i++){
            BackpackItemButtonControllers[i].item_has_been_selected(selected_item_name)
        }

        //Set the correct text
        document.getElementById("instructions_delivery_item_selected_text").childNodes[0].innerHTML = "You have selected to take the " + selected_item_name + " with you"

        //Show the continue button
        document.getElementById("button_instructions_delivery_continue").style.display = "inherit"

    }
    this.showDeliveryInstructions = function(type_name, location_name, _ItemDetails){
        ItemDetails = _ItemDetails
        current_search_location = location_name
        current_search_type = type_name

        //Set the correct state for the button.
        current_instructions_state = "delivery"

        showDeliveryPage()
    }
    function showDeliveryPage(){
        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Delivery.style.display = "inherit"
        SVGObjects.Instructions.OutlineIconLayer.style.display = "inherit"
        SVGObjects.Instructions.Hint_and_pack_item_boxes.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Show the correct hint and outline
        set_outline()
        if(Param.hints_based_on_location){
            document.getElementById("instructions_delivery_hint").childNodes[0].innerHTML = Param.HintsBasedOnLocation[current_search_location]
        }else{
            document.getElementById("instructions_delivery_hint").childNodes[0].innerHTML = Param.RegionData[Param.LocationTransitionData["location_"+ current_search_location].region].hint
        }

        //Set the text to indicate that no item has been selected thus far
        document.getElementById("instructions_delivery_item_selected_text").childNodes[0].innerHTML = "Click to select one of the available items"

        //Hide the continue button until one item has been selected
        document.getElementById("button_instructions_delivery_continue").style.display = "none"

        //Create controllers for all of the items
        BackpackItemButtonControllers = []
        for(let i = 0;i<ItemDetails.All_Items.length; i++){
            let xpos = Param.ItemRelativeXPositions[ItemDetails.All_Items.length][i]

            BackpackItemButtonControllers.push( new BackpackItemButtonController(ItemDetails.All_Items[i], i, ItemDetails[ItemDetails.All_Items[i]].backgroundColor, xpos, that))
        }

        //If an item has already been selected (which can happen if we come from the instructions page, or from the map), then show this item being selected
        if(current_item_in_backpack !== false){
            that.delivery_page_item_selected(current_item_in_backpack)
        }

        //Set the event handlers for the two buttons. Continue should go to the map, Instructions should go to the welcome page.
        document.getElementById("button_instructions_delivery_continue").onclick = function(){
            ExpCont.delivery_instruction_page_closed(current_item_in_backpack)
        }
        document.getElementById("button_instructions_delivery_welcome").onclick = function(){
            showWelcomeScreen()
        }
    }
    //Resets the delivery page to its default state (no item selected)
    this.resetDeliveryPage = function(){
        current_item_in_backpack = false;
        showDeliveryPage()

        //Hide the continue button
        document.getElementById("button_instructions_delivery_continue").style.display = "none"


    }

    // QUIZ //
    //////////
    let first_quiz_instructions_given = false
    this.showQuizInstructions = function(){
        current_instructions_state = "quiz"



        showQuizPage()
    }
    function showQuizPage(){
        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Quiz.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Create a container for the title and text elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Pages.Quiz.appendChild(Container)

        if(!first_quiz_instructions_given){
            first_quiz_instructions_given = true
            Container.appendChild(createInstructionTitleElem(Instructions.Test_Phase.Quiz_Start_First.title))
            Container.appendChild(createTextField(30, 80, 508-2*30,200, Instructions.Test_Phase.Quiz_Start_First.text))
        }else{
            Container.appendChild(createInstructionTitleElem(Instructions.Test_Phase.Quiz_Start_Second.title))
            Container.appendChild(createTextField(30, 80, 508-2*30,200, Instructions.Test_Phase.Quiz_Start_Second.text))
        }

        //Set the event handlers for the two buttons. Continue should start the quiz, Instructions should go to the welcome page.
        document.getElementById("button_instructions_quiz_start").onclick = function(){
            ExpCont.quiz_instructions_page_closed()
        }
        document.getElementById("button_instructions_quiz_welcome").onclick = function(){
            showWelcomeScreen()
        }




    }

    // REMEDIAL TRAINING //
    ///////////////////////
    this.remedial_page_item_selected = function(selected_item_name){
        current_item_in_backpack = selected_item_name

        //Highlight the selected button
        for(let i =0; i<BackpackItemButtonControllers.length;i++){
            BackpackItemButtonControllers[i].item_has_been_selected(selected_item_name)
        }

        //Set the correct text
        document.getElementById("instructions_delivery_item_selected_text").childNodes[0].innerHTML = "You have selected to take the " + selected_item_name + " with you"

        //Show the continue button
        document.getElementById("button_instructions_remedial_continue").style.display = "inherit"

    }
    this.showRemedialInstructions = function(type_name, location_name, _ItemDetails){
        ItemDetails = _ItemDetails
        current_search_location = location_name
        current_search_type = type_name

        //Set the correct state for the button.
        current_instructions_state = "remedial"

        showRemedialPage()
    }
    function showRemedialPage(){
        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Remedial.style.display = "inherit"
        SVGObjects.Instructions.OutlineIconLayer.style.display = "inherit"
        SVGObjects.Instructions.Hint_and_pack_item_boxes.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Show the correct hint and outline
        set_outline()
        if(Param.hints_based_on_location){
            document.getElementById("instructions_delivery_hint").childNodes[0].innerHTML = Param.HintsBasedOnLocation[current_search_location]
        }else{
            document.getElementById("instructions_delivery_hint").childNodes[0].innerHTML = Param.RegionData[Param.LocationTransitionData["location_"+ current_search_location].region].hint
        }

        //Set the text to indicate that no item has been selected thus far
        document.getElementById("instructions_delivery_item_selected_text").childNodes[0].innerHTML = "Click to select one of the available items"

        //Hide the continue button until one item has been selected
        document.getElementById("button_instructions_remedial_continue").style.display = "none"

        //Create controllers for all of the items
        BackpackItemButtonControllers = []
        for(let i = 0;i<ItemDetails.All_Items.length; i++){
            let xpos = Param.ItemRelativeXPositions[ItemDetails.All_Items.length][i]
            //Calculating scale factor. With 6 or more, reduce the scaling to  fit all items on the bar
            let scalefactor = 1
            if(ItemDetails.All_Items.length >=6){ scalefactor = 0.9 }

            BackpackItemButtonControllers.push( new BackpackItemButtonController(ItemDetails.All_Items[i], i, ItemDetails[ItemDetails.All_Items[i]].backgroundColor, xpos, that))
        }

        //If an item has already been selected (which can happen if we come from the instructions page, or from the map), then show this item being selected
        if(current_item_in_backpack !== false){
            that.remedial_page_item_selected(current_item_in_backpack)
        }

        //Set the event handlers for the two buttons. Continue should go to the map, Instructions should go to the welcome page.
        document.getElementById("button_instructions_remedial_continue").onclick = function(){
            ExpCont.remedial_instruction_page_closed(current_item_in_backpack)
        }
        document.getElementById("button_instructions_remedial_welcome").onclick = function(){
            showWelcomeScreen()
        }
    }
    //Resets the delivery page to its default state (no item selected)
    this.resetRemedialPage = function(){
        current_item_in_backpack = false;
        showRemedialPage()

        //Hide the continue button
        document.getElementById("button_instructions_remedial_continue").style.display = "none"
    }

    // BASE INSTRUCTION ELEMENTS
    //Clears all elements with a class-name marked_for_deletion
    function cull_the_marked(){
        let The_Damned = document.getElementsByClassName("marked_for_deletion")
        while(The_Damned.length > 0){
            The_Damned[0].parentNode.removeChild(The_Damned[0])
        }
    }

    //Returns an SVG button object with the specified dimensions, position and text.
    function createSVGButtonElem(x,y,width,height,text){
        let ButtonContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        ButtonContainer.setAttribute("x",x)
        ButtonContainer.setAttribute("y",y)
        ButtonContainer.setAttribute("width", width)
        ButtonContainer.setAttribute("height", height)
        ButtonContainer.classList.add("instructions_button")

        let ButtonBackground = document.createElementNS("http://www.w3.org/2000/svg", 'rect')
        ButtonBackground.setAttribute("x",x)
        ButtonBackground.setAttribute("y",y)
        ButtonBackground.setAttribute("width", width)
        ButtonBackground.setAttribute("height", height)
        ButtonBackground.setAttribute("rx", "1.5%")

        let Text = document.createElementNS("http://www.w3.org/2000/svg", 'text')
        Text.setAttribute("x", x + 0.5*width)
        Text.setAttribute("y", y + 0.5*height + 2)
        Text.style.dominantBaseline = "middle"
        Text.style.textAnchor = "middle"
        Text.append(document.createTextNode(text))

        ButtonContainer.appendChild(ButtonBackground)
        ButtonContainer.appendChild(Text)
        return(ButtonContainer)
    }

    //Returns a title at the top of the instruction screens
    function createInstructionTitleElem(text){
        let Title = document.createElementNS("http://www.w3.org/2000/svg", 'text')
        Title.setAttribute("x", 508/2)
        Title.setAttribute("y", 30)
        Title.append(document.createTextNode(text))
        Title.classList.add("instruction_title")
        return(Title)
    }

    //Returns a rect that spans the entire instruction layer
    function createBackgroundElem(){
        let Background = document.createElementNS("http://www.w3.org/2000/svg", 'rect')
        Background.style.width = 508
        Background.style.height = 286
        Background.classList.add("instruction_background")
        return(Background)
    }

    //Call to create a container to hold the instruction page elements. Will be deleted whenever the marked are culled.
    function createInstructionContainer(){
        //Creating the container
        let Container = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        Container.classList.add("marked_for_deletion")
        return(Container)
    }

    //Resets the instructions page
    function showNewInstructionsPage(){
        //Hide all pages
        hide_all_instruction_pages()
        cull_the_marked();

        //Show the instructions layer
        SVGObjects.Instructions.Layer.style.display = "inherit"

        // Background and title
        LocCont.show_passive_map()
    }

    //Creates a ForeignObject containing a P with the provided text
    function createTextField(x,y,width,height,text){
        let TextBoxContainer = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
        TextBoxContainer.setAttribute("x", x)
        TextBoxContainer.setAttribute("y", y)
        TextBoxContainer.setAttribute("width", width)
        TextBoxContainer.setAttribute("height", height)
        TextBoxContainer.classList.add("basic_instructions_text")

        //Insert a P to the foreignObject. Make sure to set the correct class for the CSS
        let TextBox = document.createElement("p")
        TextBox.innerHTML = text
        TextBoxContainer.appendChild(TextBox)
        return(TextBoxContainer)
    }

    // TEST PHASE //
    ////////////////
    this.showQuizPassedInstructions = function(buttonfunction){
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)

        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem(Instructions.Test_Phase.Quiz_Passed.title))
        Container.appendChild(createTextField(10, 42, 508-2*10,200, Instructions.Test_Phase.Quiz_Passed.text))

        setTimeout(function(){
            let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
            Container.appendChild(Button)
            Button.onclick = buttonfunction
        },1000)
    }

    this.showTestPhaseInstructions = function(){
        //Set the correct state for the button.
        current_instructions_state = "test"

        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Test.style.display = "inherit"

        //Show the map background
        show_map_background()

        document.getElementById("button_instructions_test_start").onclick = function(){
            ExpCont.start_next_test_trial()
        }
    }

    // Shows the "Day X" screen. Next_screen can be either "novel_block" or "repeat_training"
    function showTestPhaseDayScreen(current_day, total_days,next_screen, passthrough_buttonfunction){
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)
        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem("Starting day " + current_day))

        let instruction_text = "You're about to start the next day of your practical experience in Fenneland. If you would like to take a brief break, this would be a good time to do so. "
        if(current_day === 1) { instruction_text = "You're about to start the very first day of your practical experience in Fenneland. If you would like to take a brief break, this would be a good time to do so. "}
        if(current_day === total_days) { instruction_text = "You're about to start the last day of your practical experience in Fenneland. If you would like to take a brief break, this would be a good time to do so. "}

        let TextField = createTextField(30, 75, 508-2*30,100, instruction_text)
        TextField.style.fontSize = "13px"
        TextField.style.textAlign = "center"
        Container.appendChild(TextField)

        // All the day icons (making sure that the completed ones are checked and the current day is higlighted)
        let Box_states = []
        for(let i = 0;i<total_days;i++){
            if(i < (current_day-1)) {Box_states.push("past")}
            if(i === (current_day-1)) {Box_states.push("present")}
            if(i > (current_day-1)) {Box_states.push("future")}
        }

        let box_width = 60
        let box_midpoint = (508-box_width)/2
        let box_y = 130
        let Box_X_Positions

        //Hardcoding the x positions of the boxes for different number of days
        switch(total_days){
            case(5): Box_X_Positions = [box_midpoint-2.5*(box_width),box_midpoint-1.25*(box_width), box_midpoint, box_midpoint + 1.25*box_width, box_midpoint + 2.5*box_width]; break
        }
        for(let i = 0; i <Box_states.length;i++){
            let Box = document.createElementNS("http://www.w3.org/2000/svg", 'rect')
            Box.style.width = box_width
            Box.style.height = box_width
            Box.style.x = Box_X_Positions[i]
            Box.style.y = box_y
            Box.setAttribute("rx", 15)

            let BoxNum = document.createElementNS("http://www.w3.org/2000/svg", 'text')
            BoxNum.setAttribute("x", Box_X_Positions[i] + 0.5*box_width)
            BoxNum.setAttribute("y", box_y + 0.55* box_width)
            if(Box_states[i] === "past"){
                BoxNum.append(document.createTextNode("✔"))
            }else{
                BoxNum.append(document.createTextNode(i+1))
            }

            let Day_Box = document.createElementNS("http://www.w3.org/2000/svg", 'g')
            Day_Box.appendChild(Box)
            Day_Box.appendChild(BoxNum)
            Container.appendChild(Day_Box)
            Day_Box.classList.add("day_box")

            // After a brief delay, set the correct class name
            setTimeout(function(){
                Day_Box.classList.add("day_box_"+ Box_states[i])
            },500 + i*400)

            if(Box_states[i] === "past"){
                setTimeout(function(){Day_Box.style.opacity = 0.5}, 800 + i * 600)
            }
        }

        // Creating he continue button at the bottom
        setTimeout(function(){
            let Button = createSVGButtonElem((508-150)/2,230,150,30,"CONTINUE")
            Container.appendChild(Button)
            if(next_screen === "novel_block"){  Button.onclick = function(){showTestPhaseNovelBlockText(passthrough_buttonfunction)} }
            if(next_screen === "repeat_block"){  Button.onclick = function(){showTestPhaseRepeatBlockText(passthrough_buttonfunction)} }

            },500+ current_day*500)
    }

    //Shows the intructions for one of the non-repeat-training test phase blocks
    function showTestPhaseNovelBlockText(buttonfunction){
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)

        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem(Instructions.Test_Phase.Novel_Fennimal_Block.title))
        let TextField = createTextField(30, 50, 508-2*30,200, Instructions.Test_Phase.Novel_Fennimal_Block.text)
        TextField.style.fontSize = "13px"
        Container.appendChild(TextField)

        setTimeout(function(){
            let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
            Container.appendChild(Button)
            Button.onclick = buttonfunction
        },1000)
    }

    function showTestPhaseRepeatBlockText(buttonfunction){
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)

        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem(Instructions.Test_Phase.Repeat_Training_Block.title))
        let TextField = createTextField(30, 50, 508-2*30,200, Instructions.Test_Phase.Repeat_Training_Block.text)
        TextField.style.fontSize = "13px"
        Container.appendChild(TextField)

        setTimeout(function(){
            let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
            Container.appendChild(Button)
            Button.onclick = buttonfunction
        },1000)
    }

    this.show_test_phase_instructions_novel_block = function(current_day, total_days, button_function){
        showTestPhaseDayScreen(current_day,total_days,"novel_block", button_function)
    }
    this.show_test_phase_instructions_repeat_block = function(current_day, total_days, button_function){
        showTestPhaseDayScreen(current_day,total_days,"repeat_block", button_function)
    }

    //Shows the final screen with the download button
    this.show_final_screen = function(ScoreObject, datasubmissionFunc){
        showNewInstructionsPage()

        //Show the instructions layer and the welcome screen
        SVGObjects.Instructions.Layer.style.display = "inherit"
        //SVGObjects.Instructions.Layer.style.pointerEvents = "none"
        SVGObjects.Instructions.Pages.Finished.style.display = "inherit"

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Pages.Finished.appendChild(Container)

        Container.appendChild(createInstructionTitleElem("Experiment Finished"))
        Container.appendChild(createTextField(30, 50, 508-2*30,500, "Congratulations! You are now an <b> Expert Wildlife Ranger! </b>During your practical experience, you interacted with " + ScoreObject.num_total_Fennimals + " different Fennimals. Of these Fennimals, " + ScoreObject.num_liked_item + " liked the item you gave them! <br>" +
            "<br>" +
            "Based on your performance, you earned the distinguished title of " + ScoreObject.star_rating + "-star Fennimal Expert!"))

        //Fill the stars
        for(let i = 1; i<=5;i++){
            if(ScoreObject.star_rating >= i){
                document.getElementById("score_star_" + i + "x").classList.add("score_star_achieved")
            }
        }

        //Set the dowload instructions
        let DownloadTextField = createTextField(30, 190, 508-2*30,500, "<i><b>DO NOT YET LEAVE THIS PAGE </b>. In order to finish the experiment and submit your data, please press the button below. </i>")
        DownloadTextField.style.textAlign = "center"
       // DownloadTextField.style.userSelect = "text"
        Container.appendChild(DownloadTextField)

        function downloadButtonFunc(){
            alert("Please send the downloaded file as an attachment to achiel.fenneman@univie.ac.at . Many thanks for your participation! ")
            datasubmissionFunc()
        }

        let DownloadButton = createSVGButtonElem((508-190)/2,245,190,30,"FINISH EXPERIMENT")
        Container.appendChild(DownloadButton)
        DownloadButton.onclick = datasubmissionFunc


        //let EmailButton = createSVGButtonElem(300,245,140,30,"SEND EMAIL")
        //Container.appendChild(EmailButton)
        //EmailButton.onclick = sendEmail






    }
}

//Create to animate the jeep moving home. Will animate in the mask, animate the
//TODO: set and refer to direction
TopLayerMaskController = function(_outputfunction, direction, text){
    function clearSVG(){
        //Hide all layers
        for(let layer in SVGObjects.Layers){
            let x =  Object.getOwnPropertyNames(SVGObjects.Layers[layer])
            if(x.length === 0){
                SVGObjects.Layers[layer].style.display = "none"
            }
        }

        //Hide all locations
        let AllLocations = document.getElementsByClassName("location")
        for(let i=0; i<AllLocations.length; i++){
            AllLocations[i].style.display = "none"
        }

        //Hide all items

        let AllItems = document.getElementsByClassName("item_icon")
        for(let i = 0;i<AllItems.length; i++){
            AllItems[i].style.display = "none"
        }

        //Hide all skies
        let All_Skies = document.getElementsByClassName("location_sky")
        for(let i =0;i<All_Skies.length;i++){
            All_Skies[i].style.display = "none"
        }

        //Hide all Fennimal sublayers (this incldues the Fennimals themselves)
        let Sublayers = document.getElementsByClassName("Fennimals_layer")
        for(let i =0; i< Sublayers.length; i++){
            Sublayers[i].style.display = "none"
        }
    }
    clearSVG()

    //Hide both jeeps
    document.getElementById("mask_jeep_outbound").style.display = "none"
    document.getElementById("mask_jeep_inbound").style.display = "none"

    let TextObj = document.getElementById("mask_text")
    let BackgroundObj = document.getElementById("mask_background")

    //Show the top-level mask, but make sure all elements are hidden
    TextObj.childNodes[0].innerHTML = text
    TextObj.style.transition = ""
    TextObj.style.opacity = 0
    TextObj.style.display = "inherit"

    BackgroundObj.style.transition = ""
    BackgroundObj.style.opacity = 0
    BackgroundObj.style.display = "inherit"

    //direction can be either "outbound", "inbound", or "none".
    let JeepObj
    if(direction !== "none"){
        JeepObj = document.getElementById("mask_jeep_" + direction)
        JeepObj.style.transition = ""
        JeepObj.style.opacity = 0
        JeepObj.style.display = "inherit"
    }

    SVGObjects.Layers.Mask.style.display = "inherit"

    //After a brief timer to allow the SVG to catch up, animate the black cover in
    setTimeout(function(){
        BackgroundObj.style.transition = "all 1000ms ease-in"
        BackgroundObj.style.opacity = 1
    },10)

    //After the black cover is in place, animate the text in
    setTimeout(function(){
        TextObj.style.transition = "all 500ms ease-in"
        TextObj.style.opacity = 1

    }, 750)

    //Once the text is in place, animate the jeep to appear
    if(direction !== "none"){
        setTimeout(function(){
            JeepObj.style.transition = "all 500ms ease-in"
            JeepObj.style.opacity = 1
        }, 1000)

        //Set the Jeep to start moving
        setTimeout(function(){
            JeepObj.classList.add("moving_jeep_" + direction)
        }, 1500)
    }

    //After the animation is over, reset all elements that need resetting and execute the output function
    setTimeout(function(){
        _outputfunction()
        BackgroundObj.style.opacity = 0
        TextObj.style.opacity = 0

        if(direction !== "none"){
            JeepObj.style.opacity = 0
        }

        setTimeout(function(){
            SVGObjects.Layers.Mask.style.display = "none"
            if(direction !== "none"){
                JeepObj.classList.remove("moving_jeep_" + direction)
            }
        },500)
    },2200)

    //Hiding the layer





}

//Controls the HUD
HUDController = function(){

    //During the exploration phase, call to update the counter. Assumes that Fennimal_found_number and location_visitation_counter are accurate.
    this.update_HUD_exploration = function(number_of_locations_visited, total_number_of_locations, number_of_Fennimals_Found, total_number_of_Fennimals){
        SVGObjects.HUD.exploration_location_counter.childNodes[0].innerHTML = number_of_locations_visited + " / " + total_number_of_locations
        SVGObjects.HUD.exploration_Fennimal_counter.childNodes[0].innerHTML = number_of_Fennimals_Found + " / " + total_number_of_Fennimals
    }

    //Call to show which item is in the bagback during the delivery phase
    this.update_HUD_delivery = function(item_name, color){
        SVGObjects.HUD["delivery_item_" + item_name].style.display = "inherit"
        SVGObjects.HUD["delivery_item_" + item_name].getElementsByClassName("HUD_icon_box")[0].style.fill = color
        //SVGObjects.HUD.delivery_item_text.childNodes[0].style.fill = color
        //SVGObjects.HUD.delivery_item_text.childNodes[1].style.fill = color
    }

    //Changes the state of the HUD. Call with false (no HUD), exploration or delivery
    this.changeHUD = function(string){
        //Hide all HUD elements
        let AllHUDElem = Object.getOwnPropertyNames(SVGObjects.HUD)
        for(let i = 0; i<AllHUDElem.length ; i++){
            SVGObjects.HUD[AllHUDElem[i]].style.display = "none"
        }

        //Make sure that the HUD is visible (if string is not equal to false. If it is, then hide the layer and call it a day.
        if(string === false){
            SVGObjects.HUD.Layer.style.display = "none"
            return false
        }
        SVGObjects.HUD.Layer.style.display = "inherit"

        switch(string){
            case("exploration"):
                SVGObjects.HUD.exploration_Fennimal_icon.style.display = "inherit"
                SVGObjects.HUD.exploration_Fennimal_counter.style.display = "inherit"
                SVGObjects.HUD.exploration_location_icon.style.display = "inherit"
                SVGObjects.HUD.exploration_location_counter.style.display = "inherit"
                break;
            case("delivery"):
                SVGObjects.HUD.delivery_item_text.style.display = "inherit"
                SVGObjects.HUD.delivery_item_box.style.display = "inherit"
        }

    }

    //On construction, hide the HUD
    this.changeHUD(false)

}

// Manages all data that needs to be preserved. Call at the end of the experiment to download / store a JSON containing all subject-relevant data.
DataController = function(participant_number, Stimuli){
    //Always store data here as a deep copy!
    let Data = {
        participant_number: participant_number,
        Training_Data: JSON.parse(JSON.stringify(Stimuli.getTrainingSetFennimalsInArray())),
        Targeted_Search: [],
        Delivery: [],
        Quiz: [],
        Remedial: [],
        TestTrials: [],
    }
    let startTime = Date.now()

    function downloadObjectAsJson(exportObj, exportName){
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", exportName + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    this.force_download = function(){
        console.log(Data)
        downloadObjectAsJson(Data, "data participant "+ participant_number + ".json")
    }

    this.getDataString = function(){
        return(JSON.stringify(Data))
    }

    //Stores the data collected at the end of the exploration phase
    this.store_exploration_phase_data = function(FennimalLocationObj, LocationVisitationObj, Location_Sequence){
        Data.Exploration_Phase = {
            Fennimals: JSON.parse(JSON.stringify(FennimalLocationObj)),
            LocationVisitationOrder: JSON.parse(JSON.stringify(LocationVisitationObj)),
            Location_Sequence: Location_Sequence
        }
    }

    // TARGETTED SEARCH //
    //////////////////////
    //Stores the data collected at the end of each trial of the target_search phase
    this.store_targeted_search_trial = function(FennimalObj, Locations_Visited){
        let NewObj = JSON.parse(JSON.stringify(FennimalObj))
        NewObj.Locations_Visited_During_Trial = JSON.parse(JSON.stringify(Locations_Visited))
        NewObj.number_of_locations_travelled = Locations_Visited.length

        Data.Targeted_Search.push(NewObj)
    }

    // DELIVERY PHASE DATA //
    /////////////////////////
    // Call when a delivery phase has finished
    this.store_delivery_trial = function(FennimalObj, Items_Brought, Locations_Visited){
        let NewObj = JSON.parse(JSON.stringify(FennimalObj))
        NewObj.Locations_Visited_During_Trial = JSON.parse(JSON.stringify(Locations_Visited))
        NewObj.number_of_locations_travelled = Locations_Visited.length
        NewObj.Items_Brought_In_Backpack = JSON.parse(JSON.stringify(Items_Brought))

        Data.Delivery.push(NewObj)
    }

    // QUIZ DATA //
    ///////////////
    // Call when a quiz has been started
    let current_quiz_number = 0
    this.new_quiz_started = function(){
        current_quiz_number++
        Data.Quiz.push([])
    }
    this.store_quiz_trial = function(FennimalObj){
        Data.Quiz[current_quiz_number-1].push(JSON.parse(JSON.stringify(FennimalObj)))
    }

    // REMEDIAL PHASE //
    ///////////////////
    // Call when a new remedial phase has been started
    let current_remedial_number = 0
    this.new_remedial_block_started = function(){
        current_remedial_number++
        Data.Remedial.push([])
    }
    this.store_remedial_trial = function(FennimalObj, Items_Brought, Locations_Visited){
        let NewObj = JSON.parse(JSON.stringify(FennimalObj))
        NewObj.Locations_Visited_During_Trial = JSON.parse(JSON.stringify(Locations_Visited))
        NewObj.number_of_locations_travelled = Locations_Visited.length
        NewObj.Items_Brought_In_Backpack = JSON.parse(JSON.stringify(Items_Brought))

        Data.Remedial[current_remedial_number-1].push(NewObj)
    }

    // TEST PHASE //
    ////////////////
    this.store_test_trial = function(FennimalObj){
        Data.TestTrials.push(JSON.parse(JSON.stringify(FennimalObj)))
    }

    // CALL AT EXPERIMENT END TO STORE EXPERIMENT TIME.
    this.experiment_completed = function(){
        Data.experiment_time =  Date.now() - startTime
    }

    //Call after experiment is completed to return the subject's score. Score is an object containing "total_number_of_Fennimals_in_test_phase" (int), "test_phase_Fennimals_who_liked_item" (int) and "star rating" (int, out of 5)
    this.get_score = function(){
        let total = 0, liked = 0
        for(let i =0;i<Data.TestTrials.length;i++){
            total++
            switch(Data.TestTrials[i].trialtype){
                case("test_training"):
                    if(Data.TestTrials[i].selected_item === Data.TestTrials[i].item) {liked++;}
                    break;
                case("test_direct"):
                    if(Data.TestTrials[i].selected_item === Data.TestTrials[i].direct_item) {liked++;}
                    break;
                case("test_indirect"):
                    if(Data.TestTrials[i].selected_item === Data.TestTrials[i].indirect_item) {liked++;}
                    break;
            }
        }
        let percentage = liked / total

        let star_rating = 1
        if(percentage > .20){ star_rating = 2}
        if(percentage > .40){ star_rating = 3}
        if(percentage > .50){ star_rating = 4}
        if(percentage > .60){ star_rating = 5}

        return({
            num_total_Fennimals: total,
            num_liked_item: liked,
            star_rating: star_rating
        })
    }

    //Call to submit the hidden form with the subject's data
    this.submitDataForm = function(){
        //Populating the form
        document.getElementById("data_form_field").innerHTML = JSON.stringify(Data)

        //Automatically submit
        document.getElementById("submitbutton").click()

        //Give some feedback to the participant
        alert("Experiment finished! Thank you for participating!")


    }

}

//Manages the top-level flow of the experiment
ExperimentController = function(Stimuli, DataController){
    let that = this

    //Keep track of which Fennimals are currently roaming free in Fenneland
    let FennimalsPresentOnMap = {}

    //Create a location controller
    let LocCont = new LocationController(this)

    //Create a controller to handle all the instructions
    let InstrCont = new InstructionsController(this,LocCont)

    //Create a controller to handle the HUD
    let HUDCont = new HUDController()

    //Keeping track of the Flashlight and FennimalController
    let FlashCont = false
    let FenCont = false

    //Keeps track of the order in which the Fennimals are encountered
    let Fennimal_found_number, number_of_locations_visited, location_visitation_counter, current_training_subphase, MaskCont

    //Keep track of which phase of the experiment we're in. If set to "training",then participants will receive positive feedback for selecting an item.
    let current_phase_of_the_experiment = "training"

    //Keep track of the order by which locations are visited
    let LocationVisitationOrder = {}

    //Call to reset the visition order object (resulting in it being reset to an object with one key for each location, with value equal to false
    function resetVisitionOrderObj(){
        LocationVisitationOrder = {}
        for(let i = 0; i<Param.location_Names.length;i++){
            LocationVisitationOrder[Param.location_Names[i]] = false
        }
    }

    // LOCATION FUNCTIONS //
    //Call when a terminal location is reached. This initiates the searching procedure (flashlight and Fennimal controller) and hides the HUD
    this.location_entered = function(location_name){
        location_visitation_counter++
        HUDCont.changeHUD(false)

        //Check if this is the first time this location is visited during the exploration phase
        if(current_phase_of_the_experiment === "training" && current_training_subphase === "exploration" && LocationVisitationOrder[location_name] === false){
            let x = new ObjectiveAchievedController("NEW LOCATION FOUND!", Param.SubjectFacingLocationNames[location_name], false)
            number_of_locations_visited++

            //Prevent the subject from leaving until the animation has been completed
            LocCont.prevent_subject_from_leaving_location(true)
            setTimeout(function(){
                LocCont.prevent_subject_from_leaving_location(false)
                check_if_exploration_subphase_completed()
            },3000)
        }

        //Record the visitation of this location
        if(LocationVisitationOrder[location_name] === false){
            LocationVisitationOrder[location_name] = [location_visitation_counter]
        }else{
            LocationVisitationOrder[location_name].push(location_visitation_counter)
        }

        // Now check whether there is a Fennimal present in this region.
        if(FennimalsPresentOnMap[location_name] !== false){
            if("order_found" in FennimalsPresentOnMap[location_name]){
                //Fennimal has been found: show the feedback
                FenCont = new CompletedFennimalController(FennimalsPresentOnMap[location_name])

            }else{
                //Fennimal has not been found currently
                FlashCont = new Flashlight_Controller(FennimalsPresentOnMap[location_name],LocCont, this)
            }
        }else{
            // No Fennimal here, but show the Flashlight to the participant anyway
            FlashCont = new Flashlight_Controller(FennimalsPresentOnMap[location_name],LocCont, this)
        }
    }

    //Call when a terminal location is left. This deletes the FennimalController
    this.location_left = function(){
        if(FlashCont !== false){
            FlashCont.leaving_area()
            FlashCont = false
        }
        if(FenCont !== false){
            FenCont.interactionAborted()
            FenCont = false
        }

        //Show the HUD again
        if(current_phase_of_the_experiment === "training"){
            if(current_training_subphase === "exploration" || current_training_subphase === "delivery" || current_training_subphase === "remedial"){
                updateHUD()
            }
        }

        //Hide the return to home button
        SVGObjects.Return_to_Home_button.style.display = "none"

    }

    //Call when any (including intermediary!) locations have been visited
    this.passing_through_location = function(location_name){
        if(current_training_subphase === "exploration"){
            Exploration_Phase_Location_Visited_Sequence.push(location_name)
        }
        if(current_training_subphase === "targeted_search"){
            Search_Trial_Locations_Visited.push(location_name)
        }
        if(current_training_subphase === "delivery"){
            Delivery_Locations_Visited.push(location_name)
        }
        if(current_training_subphase === "remedial"){
            Remedial_Locations_Visited.push(location_name)
        }
    }

    function updateHUD(){
        if(current_phase_of_the_experiment === "training"){
            switch(current_training_subphase){
                case("exploration"): {
                    HUDCont.changeHUD("exploration")
                    HUDCont.update_HUD_exploration(number_of_locations_visited, 16, Fennimal_found_number, Stimuli.getTrainingSetFennimalsKeyedOnLocation().MetaData.total_number_of_Fennimals)
                    break
                }
                case("delivery"): {
                    HUDCont.changeHUD("delivery")
                    HUDCont.update_HUD_delivery(current_item_in_inventory, Stimuli.getItemDetails()[current_item_in_inventory].backgroundColor)
                    break
                }
                case("remedial"): {
                    HUDCont.changeHUD("delivery")
                    HUDCont.update_HUD_delivery(current_item_in_inventory, Stimuli.getItemDetails()[current_item_in_inventory].backgroundColor)
                    break
                }
            }

        }
    }

    //Call when a Fennimal has been found at a location.
    this.FennimalFound = function(FennimalObj){
        //Determining which items are invisible, which are unavailalbe and which are available.
        let ItemAvailability = {}
        console.log("FennimalFound")

        //In the training phase, we sometimes show all items (most set to unavailable), with exception of the delivery phase (in which case only the correct item should be shown)
        if(current_training_subphase === "delivery" || current_training_subphase === "remedial"){

            //Displaying only one item on the screen
            for(let i=0;i<Stimuli.getItemDetails().All_Items.length; i++){
                ItemAvailability[Stimuli.getItemDetails().All_Items[i]] = "invisible"
            }

            if(FennimalObj.item === current_item_in_inventory){
                ItemAvailability[FennimalObj.item] = "available"
            }else{
                ItemAvailability[FennimalObj.item] = "unavailable"
            }
        }else{
            //In the exploration and search subphases, show all items - but only the correct item should be set to available
            for(let i=0;i<Stimuli.getItemDetails().All_Items.length; i++){
                ItemAvailability[Stimuli.getItemDetails().All_Items[i]] = "unavailable"
            }
            ItemAvailability[FennimalObj.item] = "available"

        }
        if(current_training_subphase === "exploration"){
            LocCont.prevent_subject_from_leaving_location(true)
        }
        //Blocking the participant from leaving during the search, delivery and remedial stages
        if(current_training_subphase === "targeted_search"){
            LocCont.prevent_subject_from_leaving_location(true)
        }
        if(current_training_subphase === "delivery" || current_training_subphase === "remedial"){
            setTimeout(function(){
                LocCont.prevent_subject_from_leaving_location(false)
            },2500)
        }


        FenCont = new TrainingPhaseFennimalController(FennimalObj,Stimuli.getItemDetails(),ItemAvailability, LocCont,this)


    }

    //Call when the Fennimal interaction has been completed. Assumes that the FennimalObject now contains a property for "item_selected"
    this.FennimalInteractionCompleted = function(FennimalObj){

        //Next steps depend on the phase of the experiment
        if(current_phase_of_the_experiment === "training" ){
            switch (current_training_subphase){
                case("exploration"): exploration_subphase_Fennimal_completed(FennimalObj); break
                case("targeted_search"): targeted_search_subphase_Fennimal_completed(FennimalObj); break
                case("delivery"):
                    delivery_subphase_Fennimal_completed(FennimalObj);
                    LocCont.prevent_subject_from_leaving_location(true)
                    break
                case("quiz"):
                    if(!FennimalObj.correct_answer) {number_of_quiz_errors++}
                    start_next_quiz_trial()
                    //TODO: store data
                    break
                case("remedial"): remedial_subphase_Fennimal_completed(FennimalObj); break
            }

        }

    }

    //Call when the Go Home button is pressed. This re-shows the instructions to the subject again, with the exact screen depending on the state of the experiment
    this.home_button_pressed = function(){
        HUDCont.changeHUD(false)
        if(current_phase_of_the_experiment === "training"){
            switch(current_training_subphase){
                case("exploration"):
                    InstrCont.showExplorationInstructions(LocationVisitationOrder,FennimalsPresentOnMap)
                    break;
                case("targeted_search"):
                    InstrCont.showSearchInstructions(CurrentSearchedFennimal.type,CurrentSearchedFennimal.location)
                    break;
                case("delivery"):
                    InstrCont.showDeliveryInstructions(CurrentSearchedFennimal.type,CurrentSearchedFennimal.location, Stimuli.getItemDetails())
                    break
                case("remedial"):
                    InstrCont.showRemedialInstructions(CurrentSearchedFennimal.type,CurrentSearchedFennimal.location, Stimuli.getItemDetails())
                    break
            }
        }
    }

    // INSTRUCTION FUNCTIONS //
    //Call to show the first set of instructions
    this.showStartScreen = function(){
        InstrCont.gotoStartScreen()
    }
    this.show_starting_instructions = function(){
        InstrCont.gotoWelcomeScreen()
    }
    //Call when the initial instructions have been read.
    this.starting_instructions_finished = function(){
        //Go to the exploration phase
        start_exploration_subphase()
    }
    //Shows the GOING HOME black screen
    function fade_to_travel_screen_home (_func){
        MaskCont = new TopLayerMaskController(_func, "inbound", "Returning to Home")
        LocCont.prevent_subject_from_leaving_location(true)
    }
    function fade_to_next_fennimal(_func){
        MaskCont = new TopLayerMaskController(_func, "outbound", "Driving to the next Fennimal")
    }

    //Sets the world to be empty
    function clearFennimalsFromMap(){
        FennimalsPresentOnMap = {}
        for(let i = 0; i<Param.location_Names.length; i++){
            FennimalsPresentOnMap[Param.location_Names[i]] = false
        }
    }

    //////////////////////////////
    // TRAINING PHASE FUNCTIONS //
    //////////////////////////////

    // EXPLORATION SUBPHASE //
    //Starts the exploration subphase. Here the map is populated with all training set Fennimals, and the participant has to find all Fennimals and visit all locations at least once.
    //  No jumping back to home at any point.
    let Exploration_Phase_Location_Visited_Sequence
    function start_exploration_subphase(){
        if(current_training_subphase !== "exploration"){
            current_training_subphase = "exploration"
            Exploration_Phase_Location_Visited_Sequence = []
            console.log("starting exploration phase")

            //Resettting trackers and counters
            Fennimal_found_number = 0
            location_visitation_counter = 1
            number_of_locations_visited = 0
            resetVisitionOrderObj()

            //Populating the world with Fennimals
            FennimalsPresentOnMap = Stimuli.getTrainingSetFennimalsKeyedOnLocation()
        }

        //Show the exploration phase instructions screen
        InstrCont.showExplorationInstructions(LocationVisitationOrder,FennimalsPresentOnMap)

    }
    //Call when the exploration instructions page is closed
    this.exploration_instruction_page_closed = function(){
        //Setting the HUD
        updateHUD()

        //Reset the map, and we're good to go.
        LocCont.reset_map()
    }
    //Call when a Fennimal interaction has been completed during the exploration phase
    function exploration_subphase_Fennimal_completed(FennimalObj){
        FennimalObj.order_found = Fennimal_found_number
        Fennimal_found_number++
        FennimalsPresentOnMap[FennimalObj.location] = FennimalObj

        setTimeout(function(){
            let x = new ObjectiveAchievedController("NEW FENNIMAL FOUND!", FennimalObj.name, false)
            //Prevent the subject from leaving until the animation has been completed

            setTimeout(function(){
                LocCont.prevent_subject_from_leaving_location(false)
                check_if_exploration_subphase_completed()
            },3000)

        },2500)

    }
    //Call to check if the exploration subphase has been completed
    function check_if_exploration_subphase_completed(){
        if(number_of_locations_visited === Param.location_Names.length && Fennimal_found_number === Stimuli.getTrainingSetFennimalsKeyedOnLocation().MetaData.total_number_of_Fennimals){
            setTimeout(function(){
                exploration_subphase_completed()
            },2000)
        }
    }
    //Call when the exploration subphase has been completed. That is, when all locations and all Fennimals have been found
    function exploration_subphase_completed(){
        //Storing data
        DataController.store_exploration_phase_data(FennimalsPresentOnMap,LocationVisitationOrder, Exploration_Phase_Location_Visited_Sequence)

        //Show a screen indicating that the exploration subphase is completed
        MaskCont = new TopLayerMaskController(that.start_targeted_search_subphase, "none", "Exploration complete!")

    }

    // TARGETED SEARCH SUBPHASE //
    //Starts the targeted_search subphase. In the home screen, the participant is given an outline and a hint (tied to location) and has to go out to this location to interact with the Fennimal.
    //  After the item is given to this Fennimal, then jump back to the home screen (no need to walk all the way back).
    // Starts with the first Fennimal already populated
    let ArrayOfFennimalsToBeFound, CurrentSearchedFennimal, Search_Trial_Locations_Visited
    this.start_targeted_search_subphase = function(){
        //Reset the state of the world
        clearFennimalsFromMap()

        //Close any open Fennimal interactions
        that.location_left()

        if(current_training_subphase !== "targeted_search"){
            current_training_subphase = "targeted_search"

            //Reset the state of the world
            clearFennimalsFromMap()

            //Keep an array with all the Fennimals that need to be found during this subphase. This starts with all training phase Fennimals (in random order), and then destructively pops Fennimals one-by-one
            ArrayOfFennimalsToBeFound = []
            for(let i = 0; i<Param.number_of_search_repetitions; i++){
                //Make a shuffled deep copy of the training phase Fennimals and append it to the Array
                let x = shuffleArray( Stimuli.getTrainingSetFennimalsInArray() )
                ArrayOfFennimalsToBeFound = ArrayOfFennimalsToBeFound.concat(shuffleArray(JSON.parse(JSON.stringify(x)) ))
            }

        }
        //Start the first search trial
        that.start_next_search_round()
    }
    //Call to start the next round in the search phase
    this.start_next_search_round = function(){
        //Pop the top element from Array of Fennimals to be found. If there are none, then this part of the training phase is completed
        if(ArrayOfFennimalsToBeFound.length > 0){
            CurrentSearchedFennimal = ArrayOfFennimalsToBeFound.splice(0,1)[0]

            //Reset the visitation order
            resetVisitionOrderObj()

            //Populate the world with this Fennimal
            FennimalsPresentOnMap[CurrentSearchedFennimal.location] = CurrentSearchedFennimal

            //Show the instructions screen.
            InstrCont.showSearchInstructions(CurrentSearchedFennimal.type, CurrentSearchedFennimal.location)

            //Keep track of which locations are visited
            Search_Trial_Locations_Visited = []

        }else{
            search_subphase_completed()
        }
    }
    //Call when the continue button is pressed on the search phase instructions
    this.search_instruction_page_closed = function(){
        //Reset the map, and we're good to go.
        LocCont.reset_map()

    }
    //Call when all search trials have been completed
    function search_subphase_completed(){
        //Show a screen indicating that the search subphase is completed
        that.start_delivery_subphase()
        //MaskCont = new TopLayerMaskController(that.start_delivery_subphase, "none", "Well done!")

    }
    //Call when a Fennimal interaction has been completed
    function targeted_search_subphase_Fennimal_completed(FennimalObj){
        //Update the Fennimal in the world state
        FennimalObj.order_found = true
        FennimalsPresentOnMap[FennimalObj.location] = FennimalObj

        //Store the data
        DataController.store_targeted_search_trial(FennimalObj,Search_Trial_Locations_Visited)

        //Allow the participant to jump back to the home screen
        setTimeout(function(){
            LocCont.show_end_of_trial_button(function(){
                that.location_left()
                LocCont.show_passive_map()
                that.start_next_search_round()
            })

        }, 3500)

    }

    // ITEM DELIVERY SUBPHASE //
    //Starts the item_deliversy subphase. As in the targetted_search subphase, the subject has to find a specific Fennimal, one at a time.
    // However, now the participant can carry at most one item with them (selected in the Home screen)
    //  After the item is given to the Fennimal, jump back home.
    //// Clear the array that keeps track of which items have been taken during this trial
    let current_item_in_inventory, ArrayOfFennimalsToBeDelivered, Items_Taken_In_Backpack_During_Trial, Delivery_Locations_Visited
    //Call to start the delivery subphase
    this.start_delivery_subphase = function(){
        if(current_training_subphase !== "delivery"){
            current_training_subphase = "delivery"
            Items_Taken_In_Backpack_During_Trial = []
            Delivery_Locations_Visited = []

            //Reset the state of the world
            clearFennimalsFromMap()

            //Keep an array with all the Fennimals that need to be found during this subphase. This starts with all training phase Fennimals (in random order), and then destructively pops Fennimals one-by-one
            ArrayOfFennimalsToBeDelivered = []
            for(let i = 0; i<Param.number_of_delivery_repetitions; i++){
                //Make a shuffled deep copy of the training phase Fennimals and append it to the Array
                let x = shuffleArray(Stimuli.getTrainingSetFennimalsInArray())
                ArrayOfFennimalsToBeDelivered = ArrayOfFennimalsToBeDelivered.concat(shuffleArray(JSON.parse(JSON.stringify(x)) ))
            }

        }
        //Start the first search trial
        that.start_next_delivery_round()
    }
    this.start_next_delivery_round = function(){
        //Pop the top element from Array of Fennimals to be found. If there are none, then this part of the training phase is completed
        if(ArrayOfFennimalsToBeDelivered.length > 0){
            CurrentSearchedFennimal = ArrayOfFennimalsToBeDelivered.splice(0,1)[0]

            //Reset the visitation order
            resetVisitionOrderObj()

            //Add or reset this Fennimal in the world
            FennimalsPresentOnMap[CurrentSearchedFennimal.location] = CurrentSearchedFennimal

            //Show the instructions screen.
            InstrCont.showDeliveryInstructions(CurrentSearchedFennimal.type, CurrentSearchedFennimal.location, Stimuli.getItemDetails())

            //Reset the items in backpack and locations visited
            Items_Taken_In_Backpack_During_Trial = []
            Delivery_Locations_Visited = []
        }else{
            delivery_subphase_completed()
        }
    }
    this.delivery_instruction_page_closed = function(item_selected){
        current_item_in_inventory = item_selected
        Items_Taken_In_Backpack_During_Trial.push(item_selected)
        updateHUD()
        LocCont.reset_map()
    }
    function delivery_subphase_Fennimal_completed(FennimalObj){
        //TODO: store data
        DataController.store_delivery_trial(FennimalObj,Items_Taken_In_Backpack_During_Trial,Delivery_Locations_Visited)

        //Update the Fennimal in the world state
        FennimalObj.order_found = true
        FennimalsPresentOnMap[FennimalObj.location] = FennimalObj

        //Allow the participant to jump back to the home screen
        setTimeout(function(){
            LocCont.show_end_of_trial_button(function(){
                that.location_left()
                LocCont.show_passive_map()
                InstrCont.resetDeliveryPage()
                HUDCont.changeHUD(false)
                that.start_next_delivery_round()
            })
        }, 3500)
    }
    function delivery_subphase_completed(){
        that.start_quiz()
    }

    // QUIZ //
    //////////
    let number_of_quiz_errors, QuizTrials
    let CurrentQuizTrial = false
    this.start_quiz = function(){
        if(current_training_subphase !== "quiz"){
            current_training_subphase = "quiz"

            //Let the datacontroller know that we started a new quiz
            DataController.new_quiz_started()

            //Creating QuizTrials. These are an array of randomly sufflied Training trials
            QuizTrials = shuffleArray( Stimuli.getTrainingSetFennimalsInArray())

            //Reset the error count
            number_of_quiz_errors = 0
        }

        //Show the quiz instructions
        InstrCont.showQuizInstructions()


    }
    function start_next_quiz_trial(){
        //Check if there are more trials to be done. If yes, then show the next trial. If not, then the quiz has been completed
        if(QuizTrials.length > 0){
            //Check if we need to store a previous quiz trial
            if(CurrentQuizTrial !== false){
                DataController.store_quiz_trial(CurrentQuizTrial)
            }

            //Splice the first element of the QuizTrials as a new trial
            CurrentQuizTrial = QuizTrials.splice(0,1)[0]

            //Show the outbound animation
            fade_to_next_fennimal(that.show_next_quiz_Fennimal)
        }else{
            quizCompleted()
        }


    }
    this.show_next_quiz_Fennimal = function(){
        //Jump to the correct location. Note that we now jump to a static location, no movement needed nor allowed
        LocCont.jump_to_static_location(CurrentQuizTrial.location)

        //Show the correct Fennimal. Note that here we use a specialized FennimalController, which skips the flashlight and the intro animation.
        FenCont = new QuizFennimalController(CurrentQuizTrial,Stimuli.getItemDetails(), LocCont, that)
    }
    this.quiz_instructions_page_closed = function(){
        start_next_quiz_trial()
    }
    function quizCompleted(){
        FenCont = false
        //TODO: store quiz data
        //If the subject made any errors during the quiz, then show a round of remedial delivery trials (this automatically starts a new quiz afterwards). If not, then the training phase has been completed!
        if(number_of_quiz_errors > 0){
            that.start_remedial_subphase()
        }else{
            new ObjectiveAchievedController("EXAM PASSED!", "Congratulations!", true)
            setTimeout(function (){that.start_test_phase()},2000)
        }
    }

    // REMEDIAL TRAINING //
    ///////////////////////
    let Remedial_Locations_Visited
    this.start_remedial_subphase = function(){
        if(current_training_subphase !== "remedial"){
            current_training_subphase = "remedial"

            //Inform the datacontroller that a new remedial phase has started
            DataController.new_remedial_block_started()

            //Keep an array with all the Fennimals that need to be found during this subphase. This starts with all training phase Fennimals (in random order), and then destructively pops Fennimals one-by-one
            ArrayOfFennimalsToBeDelivered =shuffleArray(JSON.parse(JSON.stringify(Stimuli.getTrainingSetFennimalsInArray())) )

            //Reset the Fennimals on the map
            clearFennimalsFromMap()
        }
        //Start the first search trial
        this.start_next_remedial_round()

    }
    this.start_next_remedial_round = function(){
        //Pop the top element from Array of Fennimals to be found. If there are none, then this part of the training phase is completed
        if(ArrayOfFennimalsToBeDelivered.length > 0){
            CurrentSearchedFennimal = ArrayOfFennimalsToBeDelivered.splice(0,1)[0]

            //Reset the visitation order
            resetVisitionOrderObj()
            Items_Taken_In_Backpack_During_Trial = []
            Remedial_Locations_Visited = []

            //Populate the world with this Fennimal
            FennimalsPresentOnMap[CurrentSearchedFennimal.location] = CurrentSearchedFennimal

            //Show the instructions screen.
            InstrCont.showRemedialInstructions(CurrentSearchedFennimal.type, CurrentSearchedFennimal.location, Stimuli.getItemDetails())
        }else{
            remedial_subphase_completed()
        }
    }
    this.remedial_instruction_page_closed = function(item_selected){
        current_item_in_inventory = item_selected
        Items_Taken_In_Backpack_During_Trial.push(item_selected)
        updateHUD()
        LocCont.reset_map()
    }
    function remedial_subphase_Fennimal_completed(FennimalObj){
        //Update the Fennimal in the world state
        FennimalObj.order_found = true
        FennimalsPresentOnMap[FennimalObj.location] = FennimalObj

        //Store data
        DataController.store_remedial_trial(FennimalObj,Items_Taken_In_Backpack_During_Trial,Remedial_Locations_Visited)

        //Allow the participant to jump back to the home screen
        setTimeout(function(){
            LocCont.show_end_of_trial_button(function(){
                that.location_left()
                LocCont.show_passive_map()
                InstrCont.resetRemedialPage()
                HUDCont.changeHUD(false)
                that.start_next_remedial_round()
            })
        }, 3500)
    }
    function remedial_subphase_completed(){
        //Remedial training completed, show another quiz.
        that.start_quiz()

    }

    // TEST PHASE //
    ////////////////
    let AllTestTrails, CurrentTestTrial,  CurrentBlockData, CurrentBlockTrials, total_number_of_blocks
    this.start_test_phase = function(){
        //Load in all the test trial data. This is stored as an array with each element containing a block of trials
        AllTestTrails = Stimuli.getTestSetData()
        total_number_of_blocks = AllTestTrails.length
        //AllTestTrails.splice(0,4)

        //Show the quiz completed screen. After the continue button is pressed on this screen, start the first block of trials
        InstrCont.showQuizPassedInstructions(this.start_next_test_phase_block)
    }
    this.start_next_test_phase_block = function(){
        //Splice the next block of trials
        if(AllTestTrails.length >= 1){
            CurrentBlockData = AllTestTrails.splice(0,1)[0]

            //Extract the Trials
            CurrentBlockTrials = CurrentBlockData.Trials

            //Show the correct day and instructions
            if(CurrentBlockData.type === "test"){
                InstrCont.show_test_phase_instructions_novel_block(CurrentBlockData.number, total_number_of_blocks,function(){that.start_next_test_trial()})
            }
            if(CurrentBlockData.type === "repeat"){
                InstrCont.show_test_phase_instructions_repeat_block(CurrentBlockData.number, total_number_of_blocks,function(){that.start_next_test_trial()})
            }
        }else{
            //Test phase completed
            experiment_complete()
        }
    }
    function test_phase_day_completed(){
        if(CurrentBlockData.number < total_number_of_blocks){
            new ObjectiveAchievedController("Day completed!", "Time for a break", true)
            setTimeout(function (){that.start_next_test_phase_block()},2000)
        }else{
            that.start_next_test_phase_block()
        }
    }

    this.start_next_test_trial = function(){
        //Check if there are more test trials to be done. If yes, show the starting animation and then load the next Test trial.
        //If not, then the experiment has been completed.
        if(CurrentBlockTrials.length > 0){
            CurrentTestTrial = CurrentBlockTrials.splice(0,1)[0]
            fade_to_next_fennimal(that.show_next_test_trial_Fennimal)
        }else{
            test_phase_day_completed()
        }
    }
    this.show_next_test_trial_Fennimal = function(){
        //Create a new FennimalController
        //Jump to the correct location. Note that we now jump to a static location, no movement needed nor allowed
        LocCont.jump_to_static_location(CurrentTestTrial.location)

        //Show the correct Fennimal. Note that here we use a specialized FennimalController, which skips the flashlight and the intro animation.
        FenCont = new TestPhaseFennimalController(CurrentTestTrial,Stimuli.getItemDetails(), LocCont, that)
    }
    this.test_trial_completed = function(FennimalObj){
        //Store data
        DataController.store_test_trial(FennimalObj)

        //Start next test trial
        that.start_next_test_trial()
    }

    function experiment_complete(){
        console.log("EXPERIMENT COMPLETED")
        DataCont.experiment_completed()
        InstrCont.show_final_screen(DataCont.get_score(), DataCont.submitDataForm)
    }

    experiment_complete()

}

//Create this object to generate and store all the different Fennimals encountered for a participant number.
// Since chrome doesn't allow for screenshots to be easily made (and the SVG code doesn't lend itself to existing methods), this is going to be a low-tech approach to creating static images.
// Call to start this generator, and then manually synch up some external software to take screenshots on an interval...
// DO NOT RUN IN CONJUCTION WITH THE EXPERIMENT CONTROLLER!
FennimalSlideShowGenerator = function(Stimuli){
    //Delay at the start of the slideshow
    let starting_delay = 3000

    //Feed speed per Fennimal
    let feed_speed = 1000

   //Set to true if there should be two slides per Fennimal: one with just the fennimal and one with the items. If set to false, shows items and Fennimals on the same slide
    let separate_items_and_fennimals = false

    //Set to true if items should be shown on a separate page from the Fennimals themselves. If not, then items are presented with the Fennimals.
    let show_items_on_separate_screen = false

    let item_screen_background_color = "black"

    // If set to true, then only shows the item associated to a training trial (applies to training trials only)
    let training_trials_show_only_related_item

    // Loading relevant information
    let ItemDetails = Stimuli.getItemDetails()
    let TrainingTrials = Stimuli.getTrainingSetFennimalsInArray()

    let TestBlocks = Stimuli.getTestSetData()
    let TestTrails = []
    for(let i = 0; i<TestBlocks.length;i++){
        for(let j =0; j<TestBlocks[i].Trials.length;j++){
            TestTrails.push(TestBlocks[i].Trials[j])
        }
    }
    console.log(TestTrails)

    // HELPER FUNCTIONS ///
    ///////////////////////
    //Clears the SVG
    function clearSVG(){
        //Hide all layers
        for(let layer in SVGObjects.Layers){
            let x =  Object.getOwnPropertyNames(SVGObjects.Layers[layer])
            if(x.length === 0){
                SVGObjects.Layers[layer].style.display = "none"
            }
        }

        //Hide all locations
        let AllLocations = document.getElementsByClassName("location")
        for(let i=0; i<AllLocations.length; i++){
            AllLocations[i].style.display = "none"
        }

        //Hide all items

        let AllItems = document.getElementsByClassName("item_icon")
        for(let i = 0;i<AllItems.length; i++){
            AllItems[i].style.display = "none"
        }

        //Hide all skies
        let All_Skies = document.getElementsByClassName("location_sky")
        for(let i =0;i<All_Skies.length;i++){
            All_Skies[i].style.display = "none"
        }

        //Hide all Fennimal sublayers (this incldues the Fennimals themselves)
        let Sublayers = document.getElementsByClassName("Fennimals_layer")
        for(let i =0; i< Sublayers.length; i++){
            Sublayers[i].style.display = "none"
        }
    }

    //Shows a black screen with the provided text
    function showTitlePage(text){
        let TextObj = document.getElementById("mask_text")
        let BackgroundObj = document.getElementById("mask_background")
        document.getElementById("mask_jeep_outbound").style.display = "none"
        document.getElementById("mask_jeep_inbound").style.display = "none"
        TextObj.childNodes[0].innerHTML = text
        TextObj.style.display = "inherit"

        BackgroundObj.style.display = "inherit"
        SVGObjects.Layers.Mask.style.display = "inherit"
    }

    //Shows the location background
    function showLocationBackground(name){
        //Set the currentLocation and Get the information for the current location
        let LocationData = Param.LocationTransitionData["location_" + name]
        let LocationSVGObj = document.getElementById("location_" + name)

        //Show the correct sky
        SVGObjects.Layers.Sky.style.display = "inherit"
        let sky_name = Param.LocationTransitionData.default_sky
        if("sky" in LocationData){
            sky_name = LocationData.sky
        }
        document.getElementById(sky_name).style.display = "inherit"

        //Show the location layer
        SVGObjects.Layers.Regions.style.display = "inherit"

        //Show the current location background to the player
        LocationSVGObj.style.display = "inherit"
    }

    //Shows the Fennimal, including the background mask
    function showFennimal(FennimalObj){
        //Show the Fennimals stage layer
        SVGObjects.Layers.Fennimals.style.display = "inherit"
        SVGObjects.Layers.Stage.style.display = "inherit"

        //Show the opague background mask
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "inherit"

        //Find the SVG object of the Fennimal
        let FennimalSVGObj = document.getElementById("Fennimal_"+FennimalObj.type)

        //Set the correct colors
        //Set primary color regions
        let Primary_regions = FennimalSVGObj.getElementsByClassName("Fennimal_primary_color")
        for(let i = 0; i< Primary_regions.length; i++){
            Primary_regions[i].style.fill = FennimalObj.primary_color
        }

        //Set secondary colors
        let Secondary_regions =  FennimalSVGObj.getElementsByClassName("Fennimal_secondary_color")
        for(let i = 0; i< Secondary_regions.length; i++){
            Secondary_regions[i].style.fill = FennimalObj.secondary_color
        }

        //Set tertiary colors
        let Tertiary_regions =  FennimalSVGObj.getElementsByClassName("Fennimal_tertiary_color")
        for(let i = 0; i< Tertiary_regions.length; i++){
            Tertiary_regions[i].style.fill = FennimalObj.tertiary_color
        }

        //Show the Fennimal
        FennimalSVGObj.style.display = "inherit"
    }

    //Shows the items on whathever screen is currently being shown.
    function show_items_on_screen(FennimalObj, showItemBar){
        // Properties should be keyed on an item name, and contain one of the following values:
        //      "available": item will be shown with active background colors
        //      "unavailable": item will shown as "not available"
        // During training trials, all items will be shown to be available!
        //Show the Fennimals stage layer
        SVGObjects.Layers.Fennimals.style.display = "inherit"
        SVGObjects.Layers.Stage.style.display = "inherit"

        //Show the item bar
        let ItemBar = document.getElementById("item_bar")
        if(showItemBar){
            ItemBar.style.display = "inherit"
        }
        SVGObjects.Layers.Item_Bar.style.display = "inherit"

        //Determine which items to present as available or unavailable
        let ItemAvailability
        if(FennimalObj.trialtype === "training"){
            ItemAvailability = {}
            for(let i =0;i<ItemDetails.All_Items.length; i++){
                ItemAvailability[ItemDetails.All_Items[i]] = "available"
            }
        }else{
            ItemAvailability = FennimalObj.items_available
        }

        //Setting the buttons to their correct place
        for(let i =0;i<ItemDetails.All_Items.length;i++){
            let item_name = ItemDetails.All_Items[i]
            let IconObj

            if(ItemAvailability[item_name] === "available"){
                IconObj = document.getElementById("item_icon_" + item_name)
                let IconElem_background = document.getElementById("item_icon_" + item_name + "_background")
                IconElem_background.style.fill = ItemDetails[item_name].backgroundColor
            }else{
                IconObj = document.getElementById("item_icon_" + item_name + "_not_available")
            }

            //Moving the item to the correct position
            let item_bar_x = parseFloat(ItemBar.getAttribute("x"))
            let item_bar_width = parseFloat(ItemBar.getAttribute("width"))
            let item_bar_y = parseFloat(ItemBar.getAttribute("y"))
            let item_bar_height = parseFloat(ItemBar.getAttribute("height"))
            let xpos = Param.ItemRelativeXPositions[ItemDetails.All_Items.length][i]

            //Translate the icon to the right position on the item bar
            if(ItemAvailability[item_name] === "available"){
                MoveElemToCoords(IconObj,item_bar_x + xpos*item_bar_width,item_bar_y + 0.5 * item_bar_height )
            }else{
                MoveElemToCoords(IconObj,item_bar_x + xpos*item_bar_width,item_bar_y + 0.5 * item_bar_height -3.75)
            }

            IconObj.style.display = "inherit"

        }
    }

    // FEED TIMING FUNCTIONS //
    ///////////////////////////
    //On startup, first give a starting delay to get the external screengrab software ready.
    //  Then, give a "start" screen to indicate that the software can start running.
    //  Next, on a regular interval, we show the next Fennimal. We start with the Training Fennimals, followed by the Test Fennimals.
    //  To make the output easier to categorize, we print a title screen between test and training trials.

    //Starts slideshow sequence.
    function start_slideshow(){
        //For the initial delay, show "Get ready..." on the screen
        showTitlePage("Get ready...")

        //Then, for one unit of time, show "Start recording"
        setTimeout(function(){
            showTitlePage("Start recording now")
        }, 2*feed_speed)

        //For one more unit of time, show the title screen for the training Fennimals
        setTimeout(function(){
            showTitlePage("Training stimuli for: " + participant_number)
        }, 3* feed_speed)

        //Then after two units of time, start showing the training Fennimals
        setTimeout(function(){
            show_next_training_Fennimal()
        }, 4* feed_speed)
    }

    //Checks if there is another training Fennimal to show. If yes, then splices it from the TrainingTrials array. If not, then calls "start_test_trials"
    function show_next_training_Fennimal(){
        if(TrainingTrials.length > 0){
            //Get the next trial
            let TrialObj = TrainingTrials.splice(0,1)[0]

            //Show the new Fennimal (sans items) on screen for the first unit of time.
            clearSVG()

            showLocationBackground(TrialObj.location)
            showFennimal(TrialObj)

            if(separate_items_and_fennimals){
                setTimeout(function(){
                    //For the second unit of time, show the items
                    if(show_items_on_separate_screen){
                        clearSVG()
                        show_items_on_screen(TrialObj, false)
                    }else{
                        show_items_on_screen(TrialObj, true)
                    }
                }, feed_speed)

                setTimeout(function(){
                    //Call recursively after two units of time have passed
                    show_next_training_Fennimal()
                },2 * feed_speed)

            }else{
                show_items_on_screen(TrialObj, true)

                setTimeout(function(){
                    //Call recursively after two units of time have passed
                    show_next_training_Fennimal()
                },feed_speed)

            }


        }else{
            start_test_images()
        }
    }

    //Checks if there is another test Fennimal to show. If yes, then splice it form the TestTrials array. If not, then show a title page indicating that the recording can be stopped
    function show_next_test_Fennimal(){
        if(TestTrails.length > 0){
            //Get the next trial
            let TrialObj = TestTrails.splice(0,1)[0]

            //Show the new Fennimal (sans items) on screen for the first unit of time.
            clearSVG()

            showLocationBackground(TrialObj.location)
            showFennimal(TrialObj)

            //If items do not have to be separated, we only need one unit of time. Otherwise, we need two captures here: one with and one without the items
            if(separate_items_and_fennimals){

                setTimeout(function(){
                    //For the second unit of time, show the items
                    if(show_items_on_separate_screen){
                        clearSVG()
                        show_items_on_screen(TrialObj, false)
                    }else{
                        show_items_on_screen(TrialObj, true)
                    }
                }, feed_speed)

                setTimeout(function(){
                    //Call recursively after two units of time have passed
                    show_next_test_Fennimal()
                },2 * feed_speed)
            }else{

                show_items_on_screen(TrialObj, false)

                setTimeout(function(){
                    //Call recursively after two units of time have passed
                    show_next_test_Fennimal()
                }, feed_speed)
            }
        }else{
            showTitlePage("Stop recording now")
        }

    }

    // SHows a new title page and then continues to the training Fennimals
    function start_test_images(){
        clearSVG()

        //Show the title page
        showTitlePage("Test stimuli for: " + participant_number)

        setTimeout(function(){show_next_test_Fennimal()}, feed_speed)
    }


    // ON CONSTRUCTION //
    /////////////////////
    SVGObjects.SVG.style.background = item_screen_background_color
    clearSVG()


    ////////
    //let x = Stimuli.getTrainingSetFennimalsInArray(false)[0]
    start_slideshow()
    //show_next_training_Fennimal()




}

// ON PAGE START //
// Generate the RNG here. This takes the participant number as a random seed. Request participant number with a prompt
let participant_number = draw_random_participant_seed() //120// window.prompt("Please enter participant number")
console.log(participant_number)
let RNG = new RandomNumberGenerator(participant_number)

let Param = new PARAMETERS()
let Stimuli = new STIMULUSDATA(participant_number);

//Instructions shown to the participant
let Instructions = {
    Test_Phase: {
        Search: {
            title: "Find that Fennimal",
            text: "Well done! Now you have a feeling for the island and its inhabitants. <br> " +
                "For the next part of your training, you will learn to find different Fennimals all over the island. I'll give you an outline of a Fennimal and a hint. Please find this Fennimal and give it a toy! "
        },
        Quiz_Start_First: {
            title: "The exam to become a Novice!",
            text: "Well done, Trainee! You are now ready to take the exam to become a <b> Novice </b> wildlife ranger. <br>" +
                "During this exam you will be driven around the island to meet all the Fennimals you have encountered thus far. " +
                "Your job is to give each Fennimal the toy that it previously liked. <br>" +
                "<br>" +
                "You pass the exam if you select all the correct toys. <br>" +
                "However, if you make any mistakes during the exam then you will need to go through another round of instrcutions before you can take another shot at the exam. " +
                "Don't worry if that happens, you can try the exam as many times as needed. <br><br>" +
                "Click on the button below to start the exam. "
        },
        Quiz_Start_Second: {
            title: "Taking the exam again",
            text: "You're ready to take the exam again! <br>" +
                "As before, you will now be driven around the island to meet up with all the Fennimals you have encountered thus far. " +
                "Your job is to give each Fennimal the toy it previously liked.<br>" +
                "<br>" +
                " If you select all the correct toys, " +
                "then you pass the exam and become a Novice Wildlife Ranger! " +
                "However, if you make any mistakes on the exam then you will need to go through another round of instructions " +
                "before you can take another shot at the exam. Don't worry if that happens, you can try the exam as many times as needed. <br>" +
                "<br> " +
                "Click on the button below to start the exam"
        },
        Quiz_Passed: {
            title: "Becoming an expert",
            text: "Congratulations! You passed the exam and you are now a Novice Wildlife Ranger! All that stands between you and the title of 'Expert Wildlife Ranger' are five days of practical experience in Fenneland. <br>" +
                "There will <b> not </b> be another exam at the end of the experiment. After you complete your practical experience you will automatically receive the title of Expert.<br> " +
                "<br>" +
                "For the remainder of your training, you will be sent across the island to interact with various Fennimals. During these interactions you can apply your previously learned knowledge to select toys for these Fennimals.<br>" +
                "Because the Fennimals are very shy and you are still unfamiliar to them, you will not get any feedback on whether or not they like the provided toy. Instead, they will investigate the toys by themselves later. You will only learn how many Fennimals liked the toys you gave them at the end of your training.<br>" +
                "<br>" +
                "To help you travel across the island more efficiently, you will be assigned a Junior Assistant who will drive you to any new Fennimals that have been spotted. However, your assistant is a bit scatter-brained and often forgets to bring some of the toys. If this happens, then you have to make do with whatever toys are available.  "
        },
        Novel_Fennimal_Block: {
            title: "New Fennimals have been spotted!",
            text: "<br><br> A new group of Fennimals has recently started to appear all over the island. While these Fennimals are still very shy, this is a good time to build a connection with them! <br>" +
                "<br>" +
                "While you have not encountered these new Fennimals before, you can apply your previously learned knowledge to select a fitting toy for these Fennimals. <br>" +
                "<br>" +
                "There is no time limit on your decision - you can take as long as you like. After you have selected an item, the Fennimal will return to its home and play with the provided toy. You will then automatically drive to the next Fennimal."
        },
        Repeat_Training_Block: {
            title: "Visiting old friends",
            text: "<br><br> The original Fennimals from your training period are starting to miss you. Time to pay a visit to your old friends again! <br><br>" +
                "Do you still remember which items these Fennimals liked? <br>" +
                "<br>" +
                "There is no time limit on your decision - you can take as long as you like. After you have selected an item, the Fennimal will return to its home and play with the provided toy. You will then automatically drive to the next Fennimal."
        },
    }
}

//Keeps track of which ingame hints have been provided to participants already
let IngameHintsGiven = {
    flashlight_first_use:  false,
    map_first_travel: false,
    location_arrow_first_click: false,
}

//General references to SVG objects
let SVGObjects = {
    SVG: document.getElementById("SVG_container").childNodes[0],
    Instructions: {
        Layer: document.getElementById("Instructions_Layer"),
        OutlineIconLayer: document.getElementById("instructions_outline_icons"),
        Hint_and_pack_item_boxes: document.getElementById("hint_and_pack_item"),
        Pages : {
            Start: document.getElementById("instructions_start"),
            Welcome: document.getElementById("instructions_welcome"),
            Exploration: document.getElementById("instructions_exploration"),
            Search: document.getElementById("instructions_search"),
            Delivery: document.getElementById("instructions_delivery"),
            Quiz: document.getElementById("instructions_quiz"),
            Remedial: document.getElementById("instruction_remedial"),
            Test: document.getElementById("instructions_test_phase"),
            Finished: document.getElementById("instructions_finished"),
        },
        TextAlternatives: {
            First_Quiz: document.getElementById("instructions_quiz_text_first_attempt"),
            Follow_Quiz: document.getElementById("instructions_quiz_text_next_attempts")
        }
    },
    Splashscreen_Fennimal : {
        Background: document.getElementById("splashscreen_fennimals"),
        Text: document.getElementById("splashscreen_fennimals_text"),
        Entering_text: document.getElementById("splashscreen_fennimals_entering"),
        Mask: document.getElementById("Fennimals_Mask_Layer"),
    },
    Location: {
        Sky : document.getElementById("Sky_layer"),
    },
    Layers : {
        Stage: document.getElementById("Fennimals_Stage_Layer"),
        Splashscreen: document.getElementById("Fennimals_Splashscreen_Layer"),
        Map: document.getElementById("Map_Layer"),
        Regions: document.getElementById("Regions_Layer"),
        Fennimals: document.getElementById("Fennimals_layer"),
        Instructions: document.getElementById("Instructions_Layer"),
        Outline: document.getElementById("Fennimal_outlines_layer"),
        Feedback: document.getElementById("Feedback_layer"),
        Item_Bar: document.getElementById("Item_bar_layer"),
        Sky: document.getElementById("Sky_Layer"),
        ObjectiveAchieved : {
            Layer: document.getElementById("Objective_Achieved_Layer"),
            Text_Top: document.getElementById("objective_achieved_text_top"),
            Text_Bottom: document.getElementById("objective_achieved_text_bottom"),
        },
        Mask: document.getElementById("Mask_Layer"),
        IngameHints : document.getElementById("Ingame_Hints_Layer")
    },
    Prompts : {
        Fennimal_found: {
            Prompt : document.getElementById("prompt_found"),
            Name : document.getElementById("prompt_found_name"),
            Top_text : document.getElementById("prompt_found_name_top")
        },
        Item: {
            Prompt : document.getElementById("prompt_item"),
            Text: document.getElementById("prompt_item_text"),
        },
        Feedback: {
            Prompt : document.getElementById("prompt_feedback"),
            Text: document.getElementById("prompt_feedback_text"),
        }
    },
    HUD: {
        Layer: document.getElementById("HUD_Layer"),
        exploration_Fennimal_icon: document.getElementById("HUD_icon_Fennimal"),
        exploration_Fennimal_counter: document.getElementById("HUD_icon_Fennimal_text"),
        exploration_location_icon: document.getElementById("HUD_icon_location"),
        exploration_location_counter: document.getElementById("HUD_icon_location_text"),
        delivery_item_text: document.getElementById("HUD_item_icon_text"),
        delivery_item_box: document.getElementById("HUD_delivery_box"),
        delivery_item_bear: document.getElementById("HUD_item_icon_bear"),
        delivery_item_ball: document.getElementById("HUD_item_icon_ball"),
        delivery_item_bone: document.getElementById("HUD_item_icon_bone"),
        delivery_item_car: document.getElementById("HUD_item_icon_car"),
        delivery_item_duck: document.getElementById("HUD_item_icon_duck"),
        delivery_item_plane: document.getElementById("HUD_item_icon_plane"),
        delivery_item_balloon: document.getElementById("HUD_item_icon_balloon"),
        delivery_item_boomerang: document.getElementById("HUD_item_icon_boomerang"),
        delivery_item_trumpet: document.getElementById("HUD_item_icon_trumpet"),
        delivery_item_spinner: document.getElementById("HUD_item_icon_spinner"),
        delivery_item_shovel: document.getElementById("HUD_item_icon_shovel"),

    },
    Home_button: document.getElementById("home_button"),
    Return_to_Home_button : document.getElementById("return_to_home_button"),
    IngameHintBox: document.getElementById("hint_box"),
}

//Creating a data controller to handle all the data that we need to store throughout the experiment
let DataCont = new DataController(participant_number, Stimuli)

let EC = new ExperimentController(Stimuli, DataCont)
//EC.showStartScreen()
//EC.show_starting_instructions()
//EC.start_targeted_search_subphase()
//EC.start_delivery_subphase()
//EC.start_quiz()
//EC.start_remedial_subphase()
//EC.start_test_phase()


