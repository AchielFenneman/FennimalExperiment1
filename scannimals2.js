
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

function getIndexesOfNLargestElementsInArray(arr,n){
    //Sort a deep-copy of the array.
    let Sorted_arr = JSON.parse(JSON.stringify(arr)).sort()

    //Since we want the largest elements, reverse this array
    Sorted_arr.reverse()

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

//Deletes all the elements with the given class name from the given element
function deleteClassNamesFromElement(Element, Classname){
    let Objects = Element.getElementsByClassName(Classname)
    while(Objects.length > 0){
        Objects[0].remove();
    }

}

//Returns an SVG group object with the requested Fennimal (all set to visible). Also includes the target.
function createFennimal(FennimalObj){
    //Create a new group to hold the Fennimal
    let Container = document.createElementNS("http://www.w3.org/2000/svg", 'g')

    //First copy the body
    let BodyObj = document.getElementById("body_" + FennimalObj.body).cloneNode(true)
    Container.appendChild(BodyObj)
    BodyObj.style.display = "inherit"

    //Then the head
    let HeadObj = document.getElementById("head_" + FennimalObj.head).cloneNode(true)
    Container.appendChild(HeadObj)
    HeadObj.style.display = "inherit"

    //Then the droptarget
    let TargetObj = document.getElementById("Fennimal_droptarget").cloneNode(true)
    Container.appendChild(TargetObj)

    //Color the BODY
    //Set primary color regions
    let Primary_regions = BodyObj.getElementsByClassName("Fennimal_primary_color")
    for(let i = 0; i< Primary_regions.length; i++){
        Primary_regions[i].style.fill = FennimalObj.body_color_scheme.primary_color
    }

    //Set secondary colors
    let Secondary_regions =  BodyObj.getElementsByClassName("Fennimal_secondary_color")
    for(let i = 0; i< Secondary_regions.length; i++){
        Secondary_regions[i].style.fill = FennimalObj.body_color_scheme.secondary_color
    }

    //Set tertiary colors
    let Tertiary_regions =  BodyObj.getElementsByClassName("Fennimal_tertiary_color")
    for(let i = 0; i< Tertiary_regions.length; i++){
        Tertiary_regions[i].style.fill = FennimalObj.body_color_scheme.tertiary_color
    }

    //Color the HEAD
    //Set primary color regions
    Primary_regions = HeadObj.getElementsByClassName("Fennimal_primary_color")
    for(let i = 0; i< Primary_regions.length; i++){
        Primary_regions[i].style.fill = FennimalObj.head_color_scheme.primary_color
    }

    //Set secondary colors
    Secondary_regions =  HeadObj.getElementsByClassName("Fennimal_secondary_color")
    for(let i = 0; i< Secondary_regions.length; i++){
        Secondary_regions[i].style.fill = FennimalObj.head_color_scheme.secondary_color
    }

    //Set tertiary colors
    Tertiary_regions =  HeadObj.getElementsByClassName("Fennimal_tertiary_color")
    for(let i = 0; i< Tertiary_regions.length; i++){
        Tertiary_regions[i].style.fill = FennimalObj.head_color_scheme.tertiary_color
    }

    //Set eye color
    let Eye_regions = HeadObj.getElementsByClassName("Fennimal_eye_color")
    for(let i = 0; i< Eye_regions.length; i++){
        Eye_regions[i].style.fill = FennimalObj.head_color_scheme.eye_color
    }

    //Resizing head and bodies
    HeadObj.style.transformOrigin = "50% 35%"
    HeadObj.style.transform = "scale(0.9)"

    BodyObj.style.transformOrigin = "50% 10%"
    BodyObj.style.transform = "scale(.9)"

    // Returns SVG layer
    return(Container)
}

//Returns an SVG group object with the requested Fennimal outline. Also contains the search targets
function createFennimalOutline(head,body, include_targets){
    let Container = document.createElementNS("http://www.w3.org/2000/svg", 'g')

    //Copy the body outline
    let BodyObj = document.getElementById("outline_body_" + body).cloneNode(true)
    BodyObj.id = "outline_body"
    Container.appendChild(BodyObj)
    BodyObj.style.display = "inherit"

    //Then the head
    let HeadObj = document.getElementById("outline_head_" + head).cloneNode(true)
    Container.appendChild(HeadObj)
    HeadObj.id = "outline_head"
    HeadObj.style.display = "inherit"

    //Then the targets for both the head and the body, if required
    if(include_targets){ //include_targets
        let BodyTargets = document.getElementById("targets_body_" + body).cloneNode(true)
        Container.appendChild(BodyTargets)
        let HeadTargets = document.getElementById("targets_head_" + head).cloneNode(true)
        Container.appendChild(HeadTargets)
    }


    //Resizing head and bodies
    HeadObj.style.transformOrigin = "50% 35%"
    //HeadObj.style.transform = "scale(1.25)"

    BodyObj.style.transformOrigin = "50% 10%"
    BodyObj.style.transform = "scale(0.9)"

    //Return SVG layer
    return(Container)

}

//Creates a name based on the letters of the head and body of a Fennimal. Note that the prefixes and suffixes are hardcoded based on the look of the parts
function createConjunctiveNameRegionHead(region, head){
    //return( Param.NamePrefixes_Body[body] + " " + Param.Names_Head[head])
    return( Param.RegionData[region].prefix + " " + Param.Names_Head[head])
}
//Creates a name based on the letters of the head and body of a Fennimal. Note that the prefixes and suffixes are hardcoded based on the look of the parts
function createConjunctiveNameHeadBody(body, head){
    return( Param.NamePrefixes_Body[body] + " " + Param.Names_Head[head])
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
    Title.setAttribute("y", 20)
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

//Transforms a prolific ID to a seed (first 4 numerical digits)
function ProlificIDToSeed(PID){
    let id = JSON.parse(JSON.stringify(PID))
    let number = id.replace(/\D/g, "")
    return(number.substring(0,4))
}

// Given an array, returns a group containing all unique groups of size k. Thanks chatGPT!
function combinations(arr, k) {
    const result = [];

    function combine(startIndex, currentCombination) {
        if (currentCombination.length === k) {
            result.push([...currentCombination]);
            return;
        }

        for (let i = startIndex; i < arr.length; i++) {
            currentCombination.push(arr[i]);
            combine(i + 1, currentCombination);
            currentCombination.pop();
        }
    }

    combine(0, []);

    return result;
}

//Given an array, get all permutations of elements
function all_permutations(array) {
    function p(array, temp) {
        var i, x;
        if (!array.length) {
            result.push(temp);
        }
        for (i = 0; i < array.length; i++) {
            x = array.splice(i, 1)[0];
            p(array, temp.concat(x));
            array.splice(i, 0, x);
        }
    }

    var result = [];
    p(array, []);
    return result;
}

//Experiment 1: Does the random walk increase the similarity between features (five max different features, 2 sets of equidistant heads)
STIMULUSDATA_EXP1 = function(participant_number){
    let experiment_code = "exp1"

    // RESETTING THE RNG SEED HERE //
    ////////////////////////////////
    // NO CALLS TO RANDOMIZATION SHOULD BE MADE ABOVE THIS LINE //
    RNG = new RandomNumberGenerator(participant_number)

    //Max time for the timed block
    let max_rt_tt = 4000
    let max_rt_tt_dist = 3500

    // SETTING THE CONTENTS OF THE FIRST SIMILARITY TASK (the rest of the Fennimals will be created according to these results)
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    let Head_Available_For_First_Sim_Task = shuffleArray(JSON.parse(JSON.stringify(Param.Available_Fennimal_Heads)))
    let FirstSimTaskStim = []
    for(let i = 0; i< Head_Available_For_First_Sim_Task.length; i++){
        FirstSimTaskStim.push({
            ID: Head_Available_For_First_Sim_Task[i],
            head: Head_Available_For_First_Sim_Task[i]
        })
    }

    //The results from the first sim task (and associated selected pairs) will be set here.
    let FirstSimResults, Selected_Pairs

    // DEFINING THE AVAILABLE FEATURES FROM THE PARAM OBJECT
    ///////////////////////////////////////////////////////////
    let Available_Regions = shuffleArray(["North","Desert","Village","Jungle","Flowerfields","Swamp", "Beach", "Mountains"])

    let Item_Details = generate_item_details(drawRandomElementsFromArray(Param.Available_items, 5, false ))
    let Random_Items = shuffleArray(JSON.parse(JSON.stringify(Item_Details.All_Items)))

    let Drawn_Training_Regions = Available_Regions.splice(0,3)
    let TrainingRegions = {
        IA: Drawn_Training_Regions[0],
        IB: Drawn_Training_Regions[0],
        DA: Drawn_Training_Regions[1],
        DB: Drawn_Training_Regions[1],
        C: Drawn_Training_Regions[2],
        //C2: Drawn_Training_Regions[3],
    }
    let I_Locations = shuffleArray( Param.RegionData[TrainingRegions.IA].Locations )
    let D_Locations = shuffleArray( Param.RegionData[TrainingRegions.DA].Locations )
    let TrainingLocations = {
        IA: I_Locations[0],
        IB: I_Locations[1],
        DA: D_Locations[0],
        DB: D_Locations[1],
        C: shuffleArray( Param.RegionData[TrainingRegions.C].Locations )[0],
        //C2: shuffleArray( Param.RegionData[TrainingRegions.C2].Locations )[0],
    }

    let Drawn_Binding_Phase_Regions = Available_Regions.splice(0,5)
    let BindingPhaseRegions = {
        IA: Drawn_Binding_Phase_Regions[0],
        IB: Drawn_Binding_Phase_Regions[1],
        DA: Drawn_Binding_Phase_Regions[2],
        DB: Drawn_Binding_Phase_Regions[3],
        C: Drawn_Binding_Phase_Regions[4],
        //C2: TrainingRegions.C2
    }
    let BindingPhaseLocations = {
        IA: shuffleArray( Param.RegionData[BindingPhaseRegions.IA].Locations ),
        IB: shuffleArray( Param.RegionData[BindingPhaseRegions.IB].Locations ),
        DA: shuffleArray( Param.RegionData[BindingPhaseRegions.DA].Locations ),
        DB: shuffleArray( Param.RegionData[BindingPhaseRegions.DB].Locations ),
        C: shuffleArray(  Param.RegionData[BindingPhaseRegions.C].Locations),
        //C2: shuffleArray( TrainingLocations.C2),
    }

    //These will only be filled after the first similarity task
    let TrainingFennimals, BindingPhaseTemplates, BindingPhaseSetup, TimedBlockTemplates

    this.create_Fennimals_from_sim_task_results = function(FirstSimData){
        //Storing the results from the first similarity task.
        FirstSimResults = JSON.parse(JSON.stringify(FirstSimData))

        set_all_Fennimals_equally_distinct(FirstSimResults.Data)

    }

    function set_all_Fennimals_equally_distinct (SimsArr){
        // First we need to find four heads.
        // Here we want the four most distinct Fennimals, in two maximally distinct pairs.
        // In addition, we want 2 pairs for the control stimuli. These should not be too similar to the previous pars, nor too similar within a pair.
        let Pairs = find_training_phase_heads_equally_distinct(SimsArr)

        //Randomly pick one pair to be the indirect pair, one to be the direct pair. In addition, controls should be randomly selected to be C1 and C2
        let Main_Pairs = shuffleArray([Pairs.Pair1, Pairs.Pair2])
        let I_Pair = Main_Pairs[0]
        let D_Pair = Main_Pairs[1]

        //Storing as  seperate object (easier for analyses down the line)
        Selected_Pairs = {
            I: I_Pair,
            D: D_Pair,
            C: Pairs.Control
        }

        //Now we can create all the Fennimals
        TrainingFennimals = {
            IA: createFennimalObj(TrainingRegions.IA, TrainingLocations.IA, Selected_Pairs.I.IDs[0],Param.RegionData[TrainingRegions.IA].preferredBodyType, Random_Items[0] ),
            IB: createFennimalObj(TrainingRegions.IB, TrainingLocations.IB, Selected_Pairs.I.IDs[1],Param.RegionData[TrainingRegions.IB].preferredBodyType, Random_Items[1] ),
            DA: createFennimalObj(TrainingRegions.DA, TrainingLocations.DA, Selected_Pairs.D.IDs[0],Param.RegionData[TrainingRegions.DA].preferredBodyType, Random_Items[2] ),
            DB: createFennimalObj(TrainingRegions.DB, TrainingLocations.DB, Selected_Pairs.D.IDs[1],Param.RegionData[TrainingRegions.DB].preferredBodyType, Random_Items[3] ),
            C: createFennimalObj(TrainingRegions.C, TrainingLocations.C, Pairs.Control,Param.RegionData[TrainingRegions.C].preferredBodyType, Random_Items[4] ),
            //C2: createFennimalObj(TrainingRegions.C2, TrainingLocations.C2, Selected_Pairs.C.IDs[1],Param.RegionData[TrainingRegions.C2].preferredBodyType, Random_Items[5] ),
        }

        BindingPhaseTemplates= {
            IA: {ID: "IA", head: TrainingFennimals.IA.head, body: Param.RegionData[BindingPhaseRegions.IA].preferredBodyType, region: BindingPhaseRegions.IA, location: BindingPhaseLocations.IA[0], item_direct: TrainingFennimals.IA.item, item_indirect: TrainingFennimals.IB.item },
            IB: {ID: "IB", head: TrainingFennimals.IB.head, body: Param.RegionData[BindingPhaseRegions.IB].preferredBodyType, region: BindingPhaseRegions.IB, location: BindingPhaseLocations.IB[0],item_direct: TrainingFennimals.IB.item, item_indirect: TrainingFennimals.IA.item},
            DA: {ID: "DA", head: TrainingFennimals.DA.head, body: Param.RegionData[BindingPhaseRegions.DA].preferredBodyType, region: BindingPhaseRegions.DA, location: BindingPhaseLocations.DA[0],item_direct: TrainingFennimals.DA.item, item_indirect: TrainingFennimals.DB.item},
            DB: {ID: "DB", head: TrainingFennimals.DB.head, body: Param.RegionData[BindingPhaseRegions.DB].preferredBodyType, region: BindingPhaseRegions.DB, location: BindingPhaseLocations.DB[0],item_direct: TrainingFennimals.DB.item, item_indirect: TrainingFennimals.DA.item},
            C: {ID: "C", head: TrainingFennimals.C.head, body: Param.RegionData[BindingPhaseRegions.C].preferredBodyType, region: BindingPhaseRegions.C, location: BindingPhaseLocations.C, item_direct: TrainingFennimals.C.item, item_indirect: false},
            //C2: {ID: "C2", head: TrainingFennimals.C2.head, body: Param.RegionData[BindingPhaseRegions.C2].preferredBodyType, region: BindingPhaseRegions.C2, location: BindingPhaseLocations.C2, item_direct: TrainingFennimals.C2.item, item_indirect: false},
        }

        //Setting all the trials for the Binding phase
        BindingPhaseSetup = [
            {
                Trials:  createBlockOfBindingTrials(["IA","IB","DA","DB", "C"], "direct", true,true ),
                type: "direct",
                hint_type: "text",
                number: 1
            },{
                Trials:  createBlockOfBindingTrials(["IA","IB","DA","DB","C"],  "indirect", false,true ),
                type: "indirect",
                hint_type: "text",
                number: 2
            },{
                Trials:  createBlockOfBindingTrials(["IA","IB","DA","DB","C"],  "indirect", false,true ),
                type: "indirect",
                hint_type: "text",
                number: 3
            },{
                Trials:  createBlockOfBindingTrials(["IA","IB","DA","DB","C"], "indirect", false,true ),
                type: "indirect",
                hint_type: "text",
                number: 4
            },{
                Trials:  createBlockOfBindingTrials(["IA","IB","DA","DB","C"],  "indirect", false,true ),
                type: "indirect",
                hint_type: "text",
                number: 5
            }, {
                type: "additional_similarity",
                number: 6
            },{
                Trials: createBlockOfRepeatTrainingTrials(true),
                type: "repeat_training",
                hint_type: "text",
                number: 8
            }]


        console.log(Selected_Pairs)
        console.log(TrainingFennimals)
        console.log(BindingPhaseTemplates)
        console.log(BindingPhaseSetup)



    }

    //Given a similarity setup, returns two pairs of maximally dis-similar IDs
    function find_training_phase_heads_equally_distinct(SimsArr){
        //First transform the arry of Sims into an object where each property only has points
        let SimPoints = {}
        for(let i =0; i<SimsArr.length; i++){
            SimPoints[SimsArr[i].ID] = {x : SimsArr[i].x, y: SimsArr[i].y}
        }

        //Create an array of all different IDs.
        let IDs = Object.getOwnPropertyNames(SimPoints)

        //Now we need to figure out all groups that we can make with 6 different Fennimals.
        let Combos = combinations(IDs,5)

        //For each group, calculate the distance between all of the elements. For each group, store the shortest distance in an array
        let GroupDistances = []
        let Shortest_Distances = []
        for(let i = 0; i<Combos.length;i++){
            let AllPairs = combinations(Combos[i], 2)
            let AllDistances = []
            let GroupInfo = {
                IDs: Combos[i],
                distances: []
            }
            for(let p=0; p<AllPairs.length;p++){
                //Calculating EU-distance between these pairs
                let point1 = SimPoints[AllPairs[p][0]]
                let point2 = SimPoints[AllPairs[p][1]]
                let dist = EUDist(point1.x,point1.y,point2.x,point2.y)

                AllDistances.push(dist)

                GroupInfo.distances.push( {
                    pair: AllPairs[p],
                    p1: point1,
                    p2: point2,
                    dist: dist
                }  )
            }

            GroupInfo.min = Math.min(... AllDistances)
            Shortest_Distances.push(Math.min(... AllDistances))
            GroupDistances.push(GroupInfo)
        }

        //We now need to find the group with the longest shortest distance. (That is, the group for which the closest two Fennimals are maximally apart).
        let longest_sortest_distance = Math.max(...Shortest_Distances)
        let PotentialGroups = []
        for(let i = 0; i<GroupDistances.length;i++){
            if(GroupDistances[i].min === longest_sortest_distance){
                PotentialGroups.push(GroupDistances[i])
            }
        }

        //Note: there may be multiple groups with this shortest distance (if some elements are perfectly overlapping). If so, pick one at random
        let SelectedGroup
        if(PotentialGroups.length > 1){
            SelectedGroup = drawRandomElementsFromArray(PotentialGroups,1,false)[0].IDs
        }else{
            SelectedGroup = PotentialGroups[0].IDs
        }

        console.log(SelectedGroup)

        //Now we have our winning group.
        //First, lets store these elements in a backup, so we can call onthese later (while still using splice)
        let SelectedGroupIds = JSON.parse(JSON.stringify(SelectedGroup))

        //Now we need to figure out all possible combinations to make from these elements
        let SelectedGroup_Permutations = all_permutations(SelectedGroupIds)
        let SelectedGroup_Dist_Diff = []
        for(let i =0; i<SelectedGroup_Permutations.length;i++){
            let p1 = SimPoints[SelectedGroup_Permutations[i][0]]
            let p2 = SimPoints[SelectedGroup_Permutations[i][1]]
            let dist1 = EUDist(p1.x,p1.y,p2.x,p2.y)

            let p3 = SimPoints[SelectedGroup_Permutations[i][2]]
            let p4 = SimPoints[SelectedGroup_Permutations[i][3]]
            let dist2 = EUDist(p3.x,p3.y,p4.x,p4.y)

            SelectedGroup_Dist_Diff.push(Math.abs(dist1 - dist2))
        }

        //Findings pairs with the lowest difference in distances
        let perm_smallest_range = Math.min(...SelectedGroup_Dist_Diff)
        let Potential_Pairs = []
        for(let i = 0; i<SelectedGroup_Permutations.length;i++){
            if(SelectedGroup_Dist_Diff[i] === perm_smallest_range){
                Potential_Pairs.push(SelectedGroup_Permutations[i])
            }
        }
        //These are massively over-counted (above we didnt take ordering into proper account). Randomly pick one here.
        let Sampled_Pair = shuffleArray(Potential_Pairs)[0]

        //Creating the selected pairs
        let Pair1 = [Sampled_Pair[0], Sampled_Pair[1]].flat()
        let Pair2 = [Sampled_Pair[2], Sampled_Pair[3]].flat()
        let Control = Sampled_Pair[4]

        //Now finally we want to keep track of the distance between these pairs (round to two numbers)
        let dist_pair1 = Math.round(EUDist(SimPoints[Pair1[0]].x, SimPoints[Pair1[0]].y, SimPoints[Pair1[1]].x, SimPoints[Pair1[1]].y) * 100)/100
        let dist_pair2 = Math.round(EUDist(SimPoints[Pair2[0]].x, SimPoints[Pair2[0]].y, SimPoints[Pair2[1]].x, SimPoints[Pair2[1]].y) * 100)/100

        let Selected_Pairs = {Pair1: {IDs: Pair1, dist_t1: dist_pair1}, Pair2: {IDs: Pair2, dist_t1: dist_pair2}, Control: Control}
        return(Selected_Pairs)
    }

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
    function createFennimalObj(region, location, head, body, item){
        let FenObj = {
            region: region,
            location: location,
            head: head,
            body: body,
        }

        if(item !== false){
            FenObj.item = item
        }

        //Adding name and color scheme
        FenObj.name = createConjunctiveNameHeadBody(body,head)//createConjunctiveNameRegionHead(region, head) //Param.Names_Head[head]//createConjunctiveNameHeadBody(body,head)//createConjunctiveNameRegionHead(region, head)
        FenObj.head_color_scheme = JSON.parse(JSON.stringify(Param.RegionData[region].Fennimal_location_colors))
        FenObj.body_color_scheme = JSON.parse(JSON.stringify(Param.RegionData[region].Fennimal_location_colors))
        FenObj.body_color_scheme.tertiary_color = Param.RegionData[region].contrast_color

        return(FenObj)
    }

    //Returns a block of inference-phase trials. items_allowed_... can be "direct" or "indirect.
    function createBlockOfBindingTrials(Array_of_Keys_Of_Fennimal_IDs_used, items_allowed_for_indirect_pair, include_feedback, shuffle_trials){
        let Block = []

        for(let key_ind = 0; key_ind<Array_of_Keys_Of_Fennimal_IDs_used.length; key_ind++){
            let key = Array_of_Keys_Of_Fennimal_IDs_used[key_ind]
            let FenObj = BindingPhaseTemplates[key]

            let TestObj = createFennimalObj(FenObj.region,FenObj.location, FenObj.head, FenObj.body, false)
            TestObj.name = createConjunctiveNameHeadBody(FenObj.body,FenObj.head)
            TestObj.feedback = include_feedback

            //Setting items available.
            // First we make sure that there are two distractors: the control item and one of the items belonging to the other pair.
            TestObj.item_direct = FenObj.item_direct

            //Finding the correct item
            let correct_item
            switch(key){
                case("IA"): if(items_allowed_for_indirect_pair === "direct"){correct_item = TrainingFennimals.IA.item} else {correct_item = TrainingFennimals.IB.item} break
                case("IB"): if(items_allowed_for_indirect_pair === "direct"){correct_item = TrainingFennimals.IB.item} else {correct_item = TrainingFennimals.IA.item} break
                case("DA"): correct_item = TrainingFennimals.DA.item; break
                case("DB"): correct_item = TrainingFennimals.DB.item; break
                case("C"): correct_item = TrainingFennimals.C.item; break;
                // case("C2"): correct_item = TrainingFennimals.C2.item; break;
            }

            //We will select one element from each of the arrays. So arrays with one element will always be selected
            let OtherPairItems
            switch(key){
                case("IA"): OtherPairItems = [ TrainingFennimals.C.item,[TrainingFennimals.DA.item, TrainingFennimals.DB.item]]; break
                case("IB"): OtherPairItems = [ TrainingFennimals.C.item,[TrainingFennimals.DA.item, TrainingFennimals.DB.item]]; break
                case("DA"): OtherPairItems = [ TrainingFennimals.C.item,[TrainingFennimals.IA.item, TrainingFennimals.IB.item]]; break
                case("DB"): OtherPairItems = [ TrainingFennimals.C.item,[TrainingFennimals.IA.item, TrainingFennimals.IB.item]]; break
                case("C"): OtherPairItems = [ [TrainingFennimals.IA.item,TrainingFennimals.IB.item],[TrainingFennimals.DA.item, TrainingFennimals.DB.item]]; break;
                // case("C2"): OtherPairItems = [ [TrainingFennimals.IA.item,TrainingFennimals.IB.item],[TrainingFennimals.DA.item, TrainingFennimals.DB.item]]; break;
            }

            //Creating an array containing all the trial's available items
            let Available_Items = [correct_item]
            for(let i=0;i<OtherPairItems.length;i++){
                if(typeof OtherPairItems[i] === "string"){
                    Available_Items.push(OtherPairItems[i])
                }else{
                    Available_Items.push(shuffleArray(OtherPairItems[i])[0] )
                }
            }

            //Assigning the properties to the TestObject.
            TestObj.items_available = Available_Items
            TestObj.correct_item = correct_item

            switch(key){
                case("IA"): TestObj.item_direct = TrainingFennimals.IA.item; TestObj.item_indirect = TrainingFennimals.IB.item; break
                case("IB"): TestObj.item_direct = TrainingFennimals.IB.item; TestObj.item_indirect = TrainingFennimals.IA.item; break
                case("DA"): TestObj.item_direct = TrainingFennimals.DA.item; TestObj.item_indirect = TrainingFennimals.DB.item; break
                case("DB"): TestObj.item_direct = TrainingFennimals.DB.item; TestObj.item_indirect = TrainingFennimals.DA.item; break
                case("C"): TestObj.item_direct = TrainingFennimals.C.item; TestObj.item_indirect = false; break
                //case("C2"): TestObj.item_direct = TrainingFennimals.C2.item; TestObj.item_indirect = false; break
            }

            TestObj.ID = FenObj.ID

            //Pushing to the DirectTestBlock
            Block.push(TestObj)
        }
        if(shuffle_trials){
            return(shuffleArray(Block))
        }else{
            return(Block)
        }

    }

    //Returns a block of the original training trials with all items available
    function createBlockOfRepeatTrainingTrials(shuffle_trials){
        let Block = []
        for(let key in TrainingFennimals){
            let NewFenObj = JSON.parse(JSON.stringify(TrainingFennimals[key]))
            delete NewFenObj.item

            NewFenObj.ID = key
            NewFenObj.items_available = Random_Items

            switch(key){
                case("IA"): NewFenObj.item_direct = TrainingFennimals.IA.item; NewFenObj.item_indirect = TrainingFennimals.IB.item; break
                case("IB"): NewFenObj.item_direct = TrainingFennimals.IB.item; NewFenObj.item_indirect = TrainingFennimals.IA.item; break
                case("DA"): NewFenObj.item_direct = TrainingFennimals.DA.item; NewFenObj.item_indirect = TrainingFennimals.DB.item; break
                case("DB"): NewFenObj.item_direct = TrainingFennimals.DB.item; NewFenObj.item_indirect = TrainingFennimals.DA.item; break
                case("C"): NewFenObj.item_direct = TrainingFennimals.C.item; NewFenObj.item_indirect = false; break
                //case("C2"): NewFenObj.item_direct = TrainingFennimals.C2.item; NewFenObj.item_indirect = false; break
            }

            NewFenObj.correct_item = NewFenObj.item_direct
            NewFenObj.feedback = false

            Block.push(NewFenObj)
        }

        if(shuffle_trials){
            return(shuffleArray(Block))
        }else{
            return(Block)
        }
    }


    // CALL FUNCTIONS //
    ////////////////////
    //Call to get return a deepcopy of the training set Fennimals, keyed on location.
    this.get_experiment_code = function(){
        return(experiment_code)
    }

    this.get_stim_for_first_sim_task = function(){
        return  {
            features: "heads",
            Stim: FirstSimTaskStim
        }}

    this.get_stim_for_second_sim_task = function(){
        return  {
            features: "heads",
            Stim: FirstSimTaskStim
        }}

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
        let Training_Stimuli_In_Array = this.getTrainingSetFennimalsInArray()
        for(let i = 0;i<Training_Stimuli_In_Array.length;i++){
            FennimalLocations[Training_Stimuli_In_Array[i].location] = Training_Stimuli_In_Array[i]
        }

        //Adding some meta-data
        FennimalLocations.MetaData = {
            total_number_of_Fennimals: 5,
            total_number_of_locations: Param.location_Names.length
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

    //Call to get the Training templates
    this.getTrainingTemplates = function(){
        return(JSON.parse(JSON.stringify(TrainingFennimals)))
    }

    //Call to get the Binding Templates
    this.getBindingTemplates = function(){
        return(JSON.parse(JSON.stringify(BindingPhaseTemplates)))
    }
    this.getBindingTemplatesInArray = function(){
        let Arr = []
        for (let key in BindingPhaseTemplates){
            Arr.push(BindingPhaseTemplates[key])
        }

        return(JSON.parse(JSON.stringify(Arr)))
    }

    //Call to get the features sampled after the first similarity task
    this.getFeaturesSampledAfterFirstSimilarityTask = function(){
        return(JSON.parse(JSON.stringify(Selected_Pairs)))
    }

    //Call to get a deep copy of the ItemDetails object (keyed on item)
    this.getItemDetails = function(){
        return(JSON.parse(JSON.stringify(Item_Details)))
    }

    //Returns an array containing all the blocks of the test phase
    this.getTestPhaseData = function(){
        return(JSON.parse(JSON.stringify(BindingPhaseSetup)))
    }

}

//Experiment 2: Does the random walk increase the similarity between semantic clusters (4 pairs of max close heads into 2 sets of equidistant heads and a distractor in the middle)
STIMULUSDATA_EXP2 = function(participant_number){
    let experiment_code = "exp2"

    // RESETTING THE RNG SEED HERE //
    ////////////////////////////////
    // NO CALLS TO RANDOMIZATION SHOULD BE MADE ABOVE THIS LINE //
    RNG = new RandomNumberGenerator(participant_number)

    // SETTING THE CONTENTS OF THE FIRST SIMILARITY TASK (the rest of the Fennimals will be created according to these results)
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    let Head_Available_For_First_Sim_Task = shuffleArray(JSON.parse(JSON.stringify(Param.Available_Fennimal_Heads)))
    let FirstSimTaskStim = []
    for(let i = 0; i< Head_Available_For_First_Sim_Task.length; i++){
        FirstSimTaskStim.push({
            ID: Head_Available_For_First_Sim_Task[i],
            head: Head_Available_For_First_Sim_Task[i]
        })
    }

    //The results from the first sim task (and associated selected pairs) will be set here.
    let FirstSimResults, Selected_Pairs

    // DEFINING THE AVAILABLE FEATURES FROM THE PARAM OBJECT
    ///////////////////////////////////////////////////////////
    let Available_Regions = shuffleArray(["North","Desert","Village","Jungle","Flowerfields","Swamp", "Beach", "Mountains"])

    let Item_Details = generate_item_details(drawRandomElementsFromArray(Param.Available_items, 5, false ))
    let Random_Items = shuffleArray(JSON.parse(JSON.stringify(Item_Details.All_Items)))

    let Drawn_Training_Regions = Available_Regions.splice(0,3)
    let TrainingRegions = {
        CA: Drawn_Training_Regions[0],
        CB: Drawn_Training_Regions[0],
        EA: Drawn_Training_Regions[1],
        EB: Drawn_Training_Regions[1],
        D: Drawn_Training_Regions[2],
    }
    let C_Locations = shuffleArray( Param.RegionData[TrainingRegions.CA].Locations )
    let E_Locations = shuffleArray( Param.RegionData[TrainingRegions.EA].Locations )
    let TrainingLocations = {
        CA: C_Locations[0],
        CB: C_Locations[1],
        EA: E_Locations[0],
        EB: E_Locations[1],
        D: shuffleArray( Param.RegionData[TrainingRegions.D].Locations )[0],
    }

    let Drawn_Binding_Phase_Regions = Available_Regions.splice(0,5)
    let BindingPhaseRegions = {
        CA: Drawn_Binding_Phase_Regions[0],
        CB: Drawn_Binding_Phase_Regions[1],
        EA: Drawn_Binding_Phase_Regions[2],
        EB: Drawn_Binding_Phase_Regions[3],
        D: Drawn_Binding_Phase_Regions[4],
    }
    let BindingPhaseLocations = {
        CA: shuffleArray( Param.RegionData[BindingPhaseRegions.CA].Locations ),
        CB: shuffleArray( Param.RegionData[BindingPhaseRegions.CB].Locations ),
        EA: shuffleArray( Param.RegionData[BindingPhaseRegions.EA].Locations ),
        EB: shuffleArray( Param.RegionData[BindingPhaseRegions.EB].Locations ),
        D: shuffleArray(  Param.RegionData[BindingPhaseRegions.D].Locations),
    }

    //These will only be filled after the first similarity task
    let TrainingFennimals, BindingPhaseTemplates, BindingPhaseSetup

    this.create_Fennimals_from_sim_task_results = function(FirstSimData){
        //Storing the results from the first similarity task.
        FirstSimResults = JSON.parse(JSON.stringify(FirstSimData))

        //Now we can update the stimuli in accordance to the setting outlined above
        // For two pairs of equally different (exp 1): "equally_distinct"
        // For one maximally close and one maximally distinct (exp 2, 3): "max_difference"
        set_all_Fennimals(FirstSimResults.Data)

    }

    function set_all_Fennimals (SimsArr){
        //Finding both pairs and a control head.
        //{Closest: {IDs: Closest_Pair, dist_t1: dist_pairC}, Furthest: {IDs: Furthest_Pair, dist_t1: dist_pairF}, Control: central_ID}
        let Pairs = find_stimulus_heads(SimsArr)

        //Storing as  seperate object (easier for analyses down the line)
        Selected_Pairs = Pairs

        //Now we can create all the Fennimals
        TrainingFennimals = {
            CA: createFennimalObj(TrainingRegions.CA, TrainingLocations.CA, Pairs.Pair_Control.used_in_exp[0],Param.RegionData[TrainingRegions.CA].preferredBodyType, Random_Items[0] ),
            CB: createFennimalObj(TrainingRegions.CB, TrainingLocations.CB, Pairs.Pair_Control.used_in_exp[1],Param.RegionData[TrainingRegions.CB].preferredBodyType, Random_Items[1] ),
            EA: createFennimalObj(TrainingRegions.EA, TrainingLocations.EA, Pairs.Pair_Experimental.used_in_exp[0],Param.RegionData[TrainingRegions.EA].preferredBodyType, Random_Items[2] ),
            EB: createFennimalObj(TrainingRegions.EB, TrainingLocations.EB, Pairs.Pair_Experimental.used_in_exp[1],Param.RegionData[TrainingRegions.EB].preferredBodyType, Random_Items[3] ),
            D: createFennimalObj(TrainingRegions.D, TrainingLocations.D, Pairs.distractor,Param.RegionData[TrainingRegions.D].preferredBodyType, Random_Items[4] ),
        }

        BindingPhaseTemplates= {
            CA: {ID: "CA", head: TrainingFennimals.CA.head, body: Param.RegionData[BindingPhaseRegions.CA].preferredBodyType, region: BindingPhaseRegions.CA, location: BindingPhaseLocations.CA[0], item_direct: TrainingFennimals.CA.item, item_indirect: TrainingFennimals.CB.item },
            CB: {ID: "CB", head: TrainingFennimals.CB.head, body: Param.RegionData[BindingPhaseRegions.CB].preferredBodyType, region: BindingPhaseRegions.CB, location: BindingPhaseLocations.CB[0],item_direct: TrainingFennimals.CB.item, item_indirect: TrainingFennimals.CA.item},
            EA: {ID: "EA", head: TrainingFennimals.EA.head, body: Param.RegionData[BindingPhaseRegions.EA].preferredBodyType, region: BindingPhaseRegions.EA, location: BindingPhaseLocations.EA[0],item_direct: TrainingFennimals.EA.item, item_indirect: TrainingFennimals.EB.item},
            EB: {ID: "EB", head: TrainingFennimals.EB.head, body: Param.RegionData[BindingPhaseRegions.EB].preferredBodyType, region: BindingPhaseRegions.EB, location: BindingPhaseLocations.EB[0],item_direct: TrainingFennimals.EB.item, item_indirect: TrainingFennimals.EA.item},
            D: {ID: "D", head: TrainingFennimals.D.head, body: Param.RegionData[BindingPhaseRegions.D].preferredBodyType, region: BindingPhaseRegions.D, location: BindingPhaseLocations.D[0], item_direct: TrainingFennimals.D.item, item_indirect: false},
        }

        //Setting all the trials for the Binding phase
        BindingPhaseSetup = [
            {
                Trials:  createBlockOfBindingTrials(["CA","CB","EA","EB", "D"], "direct", true,true ),
                type: "direct",
                hint_type: "text",
                number: 1
            },{
                Trials:  createBlockOfBindingTrials(["CA","CB","EA","EB", "D"],  "indirect", false,true ),
                type: "indirect",
                hint_type: "text",
                number: 2
            },{
                Trials:  createBlockOfBindingTrials(["CA","CB","EA","EB", "D"],  "indirect", false,true ),
                type: "indirect",
                hint_type: "text",
                number: 3
            },{
                Trials:  createBlockOfBindingTrials(["CA","CB","EA","EB", "D"], "indirect", false,true ),
                type: "indirect",
                hint_type: "text",
                number: 4
            },{
                Trials:  createBlockOfBindingTrials(["CA","CB","EA","EB", "D"],  "indirect", false,true ),
                type: "indirect",
                hint_type: "text",
                number: 5
            }, {
                type: "additional_similarity",
                number: 6
            }, {
                Trials: createBlockOfRepeatTrainingTrials(true),
                type: "repeat_training",
                hint_type: "text",
                number: 7
            }]

        /*
        BindingPhaseSetup = [
            {
                Trials:  createBlockOfBindingTrials(["CA","CB","EA","EB", "D"], "direct", true,true ),
                type: "direct",
                hint_type: "text",
                number: 1
            },{
                Trials:  createBlockOfBindingTrials(["CA","CB","EA","EB", "D"],  "indirect", false,true ),
                type: "indirect",
                hint_type: "text",
                number: 2
            },{
                Trials:  createBlockOfBindingTrials(["CA","CB","EA","EB", "D"],  "indirect", false,true ),
                type: "indirect",
                hint_type: "text",
                number: 3
            },{
                Trials:  createBlockOfBindingTrials(["CA","CB","EA","EB", "D"], "indirect", false,true ),
                type: "indirect",
                hint_type: "text",
                number: 4
            },{
                Trials:  createBlockOfBindingTrials(["CA","CB","EA","EB", "D"],  "indirect", false,true ),
                type: "indirect",
                hint_type: "text",
                number: 5
            }, {
                type: "additional_similarity",
                number: 6
            }, {
                Trials: createBlockOfRepeatTrainingTrials(true),
                type: "repeat_training",
                hint_type: "text",
                number: 7
            }]
         */


        console.log(Selected_Pairs)
        console.log(TrainingFennimals)
        console.log(BindingPhaseTemplates)
        console.log(BindingPhaseSetup)



    }

    //Given a similarity setup, returns two pairs of maximally dis-similar IDs
    function find_stimulus_heads(SimsArr){
        //First transform the arry of Sims into an object where each property only has points
        let SimPoints = {}
        for(let i =0; i<SimsArr.length; i++){
            SimPoints[SimsArr[i].ID] = {x : SimsArr[i].x, y: SimsArr[i].y}
        }

        //Create an array of all different IDs.
        let IDs = Object.getOwnPropertyNames(SimPoints)

        //Now we need to iteratively find the 4 pairs which are closest to each other.
        let Unassigned_IDs = JSON.parse(JSON.stringify(IDs))
        let Closests_Pairs = []

        let number_of_close_pairs_to_be_found = 4
        for(let pairnum =0; pairnum< number_of_close_pairs_to_be_found; pairnum++){
            let All_Possible_Pairs = combinations(Unassigned_IDs, 2)
            let smallest_found_dist = 99999
            let Current_Closest_Pair

            for(let i =0;i<All_Possible_Pairs.length; i++){
                //Calculating EU-distance between these pairs
                let point1 = SimPoints[All_Possible_Pairs[i][0]]
                let point2 = SimPoints[All_Possible_Pairs[i][1]]
                let dist = EUDist(point1.x,point1.y,point2.x,point2.y)

                if(dist < smallest_found_dist){
                    smallest_found_dist = dist
                    Current_Closest_Pair = All_Possible_Pairs[i]
                }
            }

            //Now we have found the closest pair. Append it to the pairs array and remove these cards from the unassigned array.
            // First we shuffle to randomize which of the two we pick to use in the experiment and which one will be held back
            Closests_Pairs.push(shuffleArray(Current_Closest_Pair))
            Unassigned_IDs = Unassigned_IDs.filter( ( el ) => !Current_Closest_Pair.includes( el ) );
        }

        //Figure out which combinations of two pairs have the most similar distance (the minimial difference) between the LEFT OUT heads.
        let Pair_indices = [0,1,2,3]
        let Pair_permutations = all_permutations(Pair_indices)
        let lowest_difference_in_distances = 9999

        //The permutations approach results in some duplicates (e.g., [0,1,2,3] results in the same as [1,0,3,2] and [2,3,0,1]). So we need to keep track of all permutations with the same minimal distance and then select one at random
        let Current_lowest_combinations = []

        for(let i=0; i <Pair_permutations.length; i++){
            let head_1 = Closests_Pairs[Pair_permutations[i][0]][1]
            let head_2 = Closests_Pairs[Pair_permutations[i][1]][1]

            let point1 = SimPoints[head_1]
            let point2 = SimPoints[head_2]
            let dist12 = EUDist(point1.x,point1.y,point2.x,point2.y)

            let head_3 = Closests_Pairs[Pair_permutations[i][2]][1]
            let head_4 = Closests_Pairs[Pair_permutations[i][3]][1]

            let point3 = SimPoints[head_3]
            let point4 = SimPoints[head_4]
            let dist34 = EUDist(point3.x,point3.y,point4.x,point4.y)

            let diff_distances = Math.abs(dist12 - dist34)
            if(diff_distances < lowest_difference_in_distances){
                //New minimum found!
                lowest_difference_in_distances = diff_distances
                Current_lowest_combinations = [Pair_permutations[i]]
            }

            if(diff_distances === lowest_difference_in_distances){
                //New variation on the current minimum found
                Current_lowest_combinations.push(Pair_permutations[i])
            }
        }

        //Randomly sample the combination of pairs with the lowest difference in distances
        let Lowest_Permutation = shuffleArray(Current_lowest_combinations)[0]

        //Now we need to find the distractor head. This is the remaining head with the lowest maximal distance to any of the four heads selected to be in the experiment already
        let Heads_in_exp = [Closests_Pairs[0][0], Closests_Pairs[1][0], Closests_Pairs[2][0], Closests_Pairs[3][0]]
        let distractor_head
        let current_minimal_max_distractor_distance = 999999

        for(let i = 0; i< Unassigned_IDs.length; i++){
            let point_head = SimPoints[Unassigned_IDs[i]]

            let point1 = SimPoints[Heads_in_exp[0]]
            let point2 = SimPoints[Heads_in_exp[1]]
            let point3 = SimPoints[Heads_in_exp[2]]
            let point4 = SimPoints[Heads_in_exp[3]]

            let dist1 = EUDist(point_head.x,point_head.y,point1.x,point1.y)
            let dist2 = EUDist(point_head.x,point_head.y,point2.x,point2.y)
            let dist3 = EUDist(point_head.x,point_head.y,point3.x,point3.y)
            let dist4 = EUDist(point_head.x,point_head.y,point4.x,point4.y)

            let max_distance = Math.max(...[dist1,dist2,dist3,dist4])
            if(max_distance < current_minimal_max_distractor_distance){
                distractor_head = Unassigned_IDs[i]
                current_minimal_max_distractor_distance = max_distance
            }
        }

        //Remove the distractor head from the unassigned IDs
        Unassigned_IDs = Unassigned_IDs.filter(e => e !== distractor_head)

        //Now we need to draw 2 unassigned heads to be used in the second card task
        shuffleArray(Unassigned_IDs)
        /*
        let Second_card_heads = []
        for(let i =0;i<2;i++){
            Second_card_heads.push(Unassigned_IDs[i])
        }

         */

        //Now we have all the heads we need to finalize the final Pairs object
        let Pairs = {
            Pair_Control : {
                used_in_exp : [ Closests_Pairs[Lowest_Permutation[0]][0], Closests_Pairs[Lowest_Permutation[1]][0] ],
                held_back: [ Closests_Pairs[Lowest_Permutation[0]][1], Closests_Pairs[Lowest_Permutation[1]][1] ],
            },
            Pair_Experimental : {
                used_in_exp : [ Closests_Pairs[Lowest_Permutation[2]][0], Closests_Pairs[Lowest_Permutation[3]][0] ],
                held_back: [ Closests_Pairs[Lowest_Permutation[2]][1], Closests_Pairs[Lowest_Permutation[3]][1] ],
            },
            distractor: distractor_head,
        }

        //Calculating the distiance of the heads used in the experiment for both pairs (this makes analyses of the data easier later)
        let point_control_held_backA = SimPoints[Pairs.Pair_Control.held_back[0]]
        let point_control_held_backB = SimPoints[Pairs.Pair_Control.held_back[1]]
        Pairs.Pair_Control.dist_held_back_t1 = EUDist(point_control_held_backA.x, point_control_held_backA.y, point_control_held_backB.x, point_control_held_backB.y)

        let point_control_expA = SimPoints[Pairs.Pair_Control.used_in_exp[0]]
        let point_control_expB = SimPoints[Pairs.Pair_Control.used_in_exp[1]]
        Pairs.Pair_Control.dist_exp_t1 = EUDist(point_control_expA.x, point_control_expA.y, point_control_expB.x, point_control_expB.y)

        let point_exp_held_backA = SimPoints[Pairs.Pair_Experimental.held_back[0]]
        let point_exp_held_backB = SimPoints[Pairs.Pair_Experimental.held_back[1]]
        Pairs.Pair_Experimental.dist_held_back_t1 = EUDist(point_exp_held_backA.x, point_exp_held_backA.y, point_exp_held_backB.x, point_exp_held_backB.y)

        let point_exp_expA = SimPoints[Pairs.Pair_Experimental.used_in_exp[0]]
        let point_exp_expB = SimPoints[Pairs.Pair_Experimental.used_in_exp[1]]
        Pairs.Pair_Experimental.dist_exp_t1 = EUDist(point_exp_expA.x, point_exp_expA.y, point_exp_expB.x, point_exp_expB.y)

        //Figuring out which heads to show during the second card task
        let Second_card_heads = []
        Second_card_heads.push(Pairs.Pair_Control.held_back[0],Pairs.Pair_Control.held_back[1],Pairs.Pair_Experimental.held_back[0],Pairs.Pair_Experimental.held_back[1])
        Pairs.Second_card_heads = shuffleArray(Second_card_heads)

        console.log(Pairs)
        return(Pairs)

    }

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
    function createFennimalObj(region, location, head, body, item){
        let FenObj = {
            region: region,
            location: location,
            head: head,
            body: body,
        }

        if(item !== false){
            FenObj.item = item
        }

        //Adding name and color scheme
        FenObj.name = createConjunctiveNameHeadBody(body,head)//createConjunctiveNameRegionHead(region, head) //Param.Names_Head[head]//createConjunctiveNameHeadBody(body,head)//createConjunctiveNameRegionHead(region, head)
        FenObj.head_color_scheme = JSON.parse(JSON.stringify(Param.RegionData[region].Fennimal_location_colors))
        FenObj.body_color_scheme = JSON.parse(JSON.stringify(Param.RegionData[region].Fennimal_location_colors))
        FenObj.body_color_scheme.tertiary_color = Param.RegionData[region].contrast_color

        return(FenObj)
    }

    //Returns a block of inference-phase trials. items_allowed_... can be "direct" or "indirect.
    function createBlockOfBindingTrials(Array_of_Keys_Of_Fennimal_IDs_used, items_allowed_for_indirect_pair, include_feedback, shuffle_trials){
        let Block = []

        for(let key_ind = 0; key_ind<Array_of_Keys_Of_Fennimal_IDs_used.length; key_ind++){
            let key = Array_of_Keys_Of_Fennimal_IDs_used[key_ind]
            let FenObj = BindingPhaseTemplates[key]

            let TestObj = createFennimalObj(FenObj.region,FenObj.location, FenObj.head, FenObj.body, false)
            TestObj.name = createConjunctiveNameHeadBody(FenObj.body,FenObj.head)
            TestObj.feedback = include_feedback

            //Setting items available.
            // First we make sure that there are two distractors: the control item and one of the items belonging to the other pair.
            TestObj.item_direct = FenObj.item_direct

            //Finding the correct item
            let correct_item
            switch(key){
                case("EA"): if(items_allowed_for_indirect_pair === "direct"){correct_item = TrainingFennimals.EA.item} else {correct_item = TrainingFennimals.EB.item} break
                case("EB"): if(items_allowed_for_indirect_pair === "direct"){correct_item = TrainingFennimals.EB.item} else {correct_item = TrainingFennimals.EA.item} break
                case("CA"): correct_item = TrainingFennimals.CA.item; break
                case("CB"): correct_item = TrainingFennimals.CB.item; break
                case("D"): correct_item = TrainingFennimals.D.item; break;
            }

            //We will select one element from each of the arrays. So arrays with one element will always be selected
            let OtherPairItems
            switch(key){
                case("CA"): OtherPairItems = [ TrainingFennimals.D.item,[TrainingFennimals.EA.item, TrainingFennimals.EB.item]]; break
                case("CB"): OtherPairItems = [ TrainingFennimals.D.item,[TrainingFennimals.EA.item, TrainingFennimals.EB.item]]; break
                case("EA"): OtherPairItems = [ TrainingFennimals.D.item,[TrainingFennimals.CA.item, TrainingFennimals.CB.item]]; break
                case("EB"): OtherPairItems = [ TrainingFennimals.D.item,[TrainingFennimals.CA.item, TrainingFennimals.CB.item]]; break
                case("D"): OtherPairItems = [ [TrainingFennimals.CA.item,TrainingFennimals.CB.item],[TrainingFennimals.EA.item, TrainingFennimals.EB.item]]; break;
            }

            //Creating an array containing all the trial's available items
            let Available_Items = [correct_item]
            for(let i=0;i<OtherPairItems.length;i++){
                if(typeof OtherPairItems[i] === "string"){
                    Available_Items.push(OtherPairItems[i])
                }else{
                    Available_Items.push(shuffleArray(OtherPairItems[i])[0] )
                }
            }

            //Assigning the properties to the TestObject.
            TestObj.items_available = Available_Items
            TestObj.correct_item = correct_item

            switch(key){
                case("CA"): TestObj.item_direct = TrainingFennimals.CA.item; TestObj.item_indirect = TrainingFennimals.CB.item; break
                case("CB"): TestObj.item_direct = TrainingFennimals.CB.item; TestObj.item_indirect = TrainingFennimals.CA.item; break
                case("EA"): TestObj.item_direct = TrainingFennimals.EA.item; TestObj.item_indirect = TrainingFennimals.EB.item; break
                case("EB"): TestObj.item_direct = TrainingFennimals.EB.item; TestObj.item_indirect = TrainingFennimals.EA.item; break
                case("D"): TestObj.item_direct = TrainingFennimals.D.item; TestObj.item_indirect = false; break
            }

            TestObj.ID = FenObj.ID

            //Pushing to the DirectTestBlock
            Block.push(TestObj)
        }
        if(shuffle_trials){
            return(shuffleArray(Block))
        }else{
            return(Block)
        }
    }
    //Returns a block of the original training trials with all items available
    function createBlockOfRepeatTrainingTrials(shuffle_trials){
        let Block = []
        for(let key in TrainingFennimals){
            let NewFenObj = JSON.parse(JSON.stringify(TrainingFennimals[key]))
            delete NewFenObj.item

            NewFenObj.ID = key
            NewFenObj.items_available = Random_Items

            switch(key){
                case("CA"): NewFenObj.item_direct = TrainingFennimals.CA.item; NewFenObj.item_indirect = TrainingFennimals.CB.item; break
                case("CB"): NewFenObj.item_direct = TrainingFennimals.CB.item; NewFenObj.item_indirect = TrainingFennimals.CA.item; break
                case("EA"): NewFenObj.item_direct = TrainingFennimals.EA.item; NewFenObj.item_indirect = TrainingFennimals.EB.item; break
                case("EB"): NewFenObj.item_direct = TrainingFennimals.EB.item; NewFenObj.item_indirect = TrainingFennimals.EA.item; break
                case("D"): NewFenObj.item_direct = TrainingFennimals.D.item; NewFenObj.item_indirect = false; break
            }

            NewFenObj.correct_item = NewFenObj.item_direct
            NewFenObj.feedback = false

            Block.push(NewFenObj)
        }

        if(shuffle_trials){
            return(shuffleArray(Block))
        }else{
            return(Block)
        }
    }

    // CALL FUNCTIONS //
    ////////////////////
    //Call to get return a deepcopy of the training set Fennimals, keyed on location.
    this.get_experiment_code = function(){
        return(experiment_code)
    }

    this.get_stim_for_first_sim_task = function(){
        return  {
            features: "heads",
            Stim: FirstSimTaskStim
        }}

    this.get_stim_for_second_sim_task = function(){
        let Head_Available_For_Second_Sim_Task = shuffleArray(JSON.parse(JSON.stringify(Selected_Pairs.Second_card_heads)))
        let SecondSimTaskStim = []
        for(let i = 0; i< Head_Available_For_Second_Sim_Task.length; i++){
            SecondSimTaskStim.push({
                ID: Head_Available_For_Second_Sim_Task[i],
                head: Head_Available_For_Second_Sim_Task[i]
            })
        }

        return  {
            features: "heads",
            Stim: SecondSimTaskStim
        }

    }

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
        let Training_Stimuli_In_Array = this.getTrainingSetFennimalsInArray()
        for(let i = 0;i<Training_Stimuli_In_Array.length;i++){
            FennimalLocations[Training_Stimuli_In_Array[i].location] = Training_Stimuli_In_Array[i]
        }

        //Adding some meta-data
        FennimalLocations.MetaData = {
            total_number_of_Fennimals: 5,
            total_number_of_locations: Param.location_Names.length
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

    //Call to get the Training templates
    this.getTrainingTemplates = function(){
        return(JSON.parse(JSON.stringify(TrainingFennimals)))
    }

    //Call to get the Binding Templates
    this.getBindingTemplates = function(){
        return(JSON.parse(JSON.stringify(BindingPhaseTemplates)))
    }
    this.getBindingTemplatesInArray = function(){
        let Arr = []
        for (let key in BindingPhaseTemplates){
            Arr.push(BindingPhaseTemplates[key])
        }

        return(JSON.parse(JSON.stringify(Arr)))
    }

    //Call to get the features sampled after the first similarity task
    this.getFeaturesSampledAfterFirstSimilarityTask = function(){
        return(JSON.parse(JSON.stringify(Selected_Pairs)))
    }

    //Call to get a deep copy of the ItemDetails object (keyed on item)
    this.getItemDetails = function(){
        return(JSON.parse(JSON.stringify(Item_Details)))
    }

    //Returns an array containing all the blocks of the test phase
    this.getTestPhaseData = function(){
        return(JSON.parse(JSON.stringify(BindingPhaseSetup)))
    }

}

//Experiment 1: Does semantic similarity influence the random walk (2 max similar, 2 max distant and a distractor)
STIMULUSDATA_SIMILARITY_ON_SEARCH = function(participant_number){
    let experiment_code = "exp_sim_on_search"
    this.is_stimulus_pilot = false

    // RESETTING THE RNG SEED HERE //
    ////////////////////////////////
    // NO CALLS TO RANDOMIZATION SHOULD BE MADE ABOVE THIS LINE //
    RNG = new RandomNumberGenerator(participant_number)

    // SELECTING A SET OF HEADS FOR THE EXPERIMENT.
    //  Here we need:
    //      Two heads from the same group (HSS pair)
    //      Three heads from different groups (2 for the LSS pair, one distractor)
    ////////////////////////////////////////////////////////////////////////////////
    let Available_Head_Pairs = shuffleArray(JSON.parse(JSON.stringify(Param.Heads_Semantic_Pairs)))
    shuffleArray(Available_Head_Pairs[0])
    shuffleArray(Available_Head_Pairs[1])
    shuffleArray(Available_Head_Pairs[2])
    shuffleArray(Available_Head_Pairs[3])
    shuffleArray(Available_Head_Pairs[4])

    let StimulusHeads = {
        HSS: [Available_Head_Pairs[0][0], Available_Head_Pairs[1][0]],
        LSS: [Available_Head_Pairs[2][0], Available_Head_Pairs[3][0]],
        distr: Available_Head_Pairs[4][0]
    }

    /*
    let StimulusHeads = {
        HSS: [Available_Head_Pairs[0][0], Available_Head_Pairs[0][1]],
        LSS: [Available_Head_Pairs[1][0], Available_Head_Pairs[2][0]],
        distr: Available_Head_Pairs[3][0]
    }
     */
    console.log(StimulusHeads)

    // DEFINING THE AVAILABLE NON-HEAD FEATURES FROM THE PARAM OBJECT
    ///////////////////////////////////////////////////////////
    let Available_Regions = shuffleArray(["North","Desert","Village","Jungle","Flowerfields","Swamp", "Beach", "Mountains"])

    let Item_Details = generate_item_details(drawRandomElementsFromArray(Param.Available_items, 5, false ))
    let Random_Items = shuffleArray(JSON.parse(JSON.stringify(Item_Details.All_Items)))

    let Drawn_Training_Regions = Available_Regions.splice(0,3)
    let TrainingRegions = {
        LA: Drawn_Training_Regions[0],
        LB: Drawn_Training_Regions[0],
        HA: Drawn_Training_Regions[1],
        HB: Drawn_Training_Regions[1],
        C: Drawn_Training_Regions[2],
    }
    let L_Locations = shuffleArray( Param.RegionData[TrainingRegions.LA].Locations )
    let H_Locations = shuffleArray( Param.RegionData[TrainingRegions.HA].Locations )
    let TrainingLocations = {
        LA: L_Locations[0],
        LB: L_Locations[1],
        HA: H_Locations[0],
        HB: H_Locations[1],
        C: shuffleArray( Param.RegionData[TrainingRegions.C].Locations )[0],
    }

    let Drawn_Binding_Phase_Regions = Available_Regions.splice(0,5)
    let BindingPhaseRegions = {
        LA: Drawn_Binding_Phase_Regions[0],
        LB: Drawn_Binding_Phase_Regions[1],
        HA: Drawn_Binding_Phase_Regions[2],
        HB: Drawn_Binding_Phase_Regions[3],
        C: Drawn_Binding_Phase_Regions[4],
    }
    let BindingPhaseLocations = {
        LA: shuffleArray( Param.RegionData[BindingPhaseRegions.LA].Locations ),
        LB: shuffleArray( Param.RegionData[BindingPhaseRegions.LB].Locations ),
        HA: shuffleArray( Param.RegionData[BindingPhaseRegions.HA].Locations ),
        HB: shuffleArray( Param.RegionData[BindingPhaseRegions.HB].Locations ),
        C: shuffleArray(  Param.RegionData[BindingPhaseRegions.C].Locations),
    }

    //Now we can create all the Fennimals
    let TrainingFennimals = {
        LA: createFennimalObj(TrainingRegions.LA, TrainingLocations.LA, StimulusHeads.LSS[0],Param.RegionData[TrainingRegions.LA].preferredBodyType, Random_Items[0] ),
        LB: createFennimalObj(TrainingRegions.LB, TrainingLocations.LB, StimulusHeads.LSS[1],Param.RegionData[TrainingRegions.LB].preferredBodyType, Random_Items[1] ),
        HA: createFennimalObj(TrainingRegions.HA, TrainingLocations.HA, StimulusHeads.HSS[0],Param.RegionData[TrainingRegions.HA].preferredBodyType, Random_Items[2] ),
        HB: createFennimalObj(TrainingRegions.HB, TrainingLocations.HB, StimulusHeads.HSS[1],Param.RegionData[TrainingRegions.HB].preferredBodyType, Random_Items[3] ),
        C: createFennimalObj(TrainingRegions.C, TrainingLocations.C, StimulusHeads.distr,Param.RegionData[TrainingRegions.C].preferredBodyType, Random_Items[4] ),
    }

    let BindingPhaseTemplates= {
        LA: {ID: "LA", head: TrainingFennimals.LA.head, body: Param.RegionData[BindingPhaseRegions.LA].preferredBodyType, region: BindingPhaseRegions.LA, location: BindingPhaseLocations.LA[0], item_direct: TrainingFennimals.LA.item, item_indirect: TrainingFennimals.LB.item },
        LB: {ID: "LB", head: TrainingFennimals.LB.head, body: Param.RegionData[BindingPhaseRegions.LB].preferredBodyType, region: BindingPhaseRegions.LB, location: BindingPhaseLocations.LB[0],item_direct: TrainingFennimals.LB.item, item_indirect: TrainingFennimals.LA.item},
        HA: {ID: "HA", head: TrainingFennimals.HA.head, body: Param.RegionData[BindingPhaseRegions.HA].preferredBodyType, region: BindingPhaseRegions.HA, location: BindingPhaseLocations.HA[0],item_direct: TrainingFennimals.HA.item, item_indirect: TrainingFennimals.HB.item},
        HB: {ID: "HB", head: TrainingFennimals.HB.head, body: Param.RegionData[BindingPhaseRegions.HB].preferredBodyType, region: BindingPhaseRegions.HB, location: BindingPhaseLocations.HB[0],item_direct: TrainingFennimals.HB.item, item_indirect: TrainingFennimals.HA.item},
        C: {ID: "C", head: TrainingFennimals.C.head, body: Param.RegionData[BindingPhaseRegions.C].preferredBodyType, region: BindingPhaseRegions.C, location: BindingPhaseLocations.C[0], item_direct: TrainingFennimals.C.item, item_indirect: false},
    }

    //Setting all the trials for the Binding phase
    let BindingPhaseSetup = [
        {
            Trials:  createBlockOfBindingTrials(["LA","LB","HA","HB", "C"], "direct", true,true ),
            type: "direct",
            hint_type: "text",
            number: 1
        },{
            Trials:  createBlockOfBindingTrials(["LA","LB","HA","HB", "C"],  "indirect", false,true ),
            type: "indirect",
            hint_type: "text",
            number: 2
        },{
            Trials:  createBlockOfBindingTrials(["LA","LB","HA","HB", "C"],  "indirect", false,true ),
            type: "indirect",
            hint_type: "text",
            number: 3
        },{
            Trials:  createBlockOfBindingTrials(["LA","LB","HA","HB", "C"], "indirect", false,true ),
            type: "indirect",
            hint_type: "text",
            number: 4
        },{
            Trials:  createBlockOfBindingTrials(["LA","LB","HA","HB", "C"],  "indirect", false,true ),
            type: "indirect",
            hint_type: "text",
            number: 5
        }, {
            Trials: createBlockOfRepeatTrainingTrials(true),
            type: "repeat_training",
            hint_type: "text",
            number: 6
        }]

    console.log(BindingPhaseSetup)

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
    function createFennimalObj(region, location, head, body, item){
        let FenObj = {
            region: region,
            location: location,
            head: head,
            body: body,
        }

        if(item !== false){
            FenObj.item = item
        }

        //Adding name and color scheme
        FenObj.name = createConjunctiveNameHeadBody(body,head)//createConjunctiveNameRegionHead(region, head) //Param.Names_Head[head]//createConjunctiveNameHeadBody(body,head)//createConjunctiveNameRegionHead(region, head)
        FenObj.head_color_scheme = JSON.parse(JSON.stringify(Param.RegionData[region].Fennimal_location_colors))
        FenObj.body_color_scheme = JSON.parse(JSON.stringify(Param.RegionData[region].Fennimal_location_colors))
        FenObj.body_color_scheme.tertiary_color = Param.RegionData[region].contrast_color

        return(FenObj)
    }

    //Returns a block of inference-phase trials. items_allowed_... can be "direct" or "indirect.
    function createBlockOfBindingTrials(Array_of_Keys_Of_Fennimal_IDs_used, items_allowed_for_indirect_pair, include_feedback, shuffle_trials){
        let Block = []

        for(let key_ind = 0; key_ind<Array_of_Keys_Of_Fennimal_IDs_used.length; key_ind++){
            let key = Array_of_Keys_Of_Fennimal_IDs_used[key_ind]
            let FenObj = BindingPhaseTemplates[key]

            let TestObj = createFennimalObj(FenObj.region,FenObj.location, FenObj.head, FenObj.body, false)
            TestObj.name = createConjunctiveNameHeadBody(FenObj.body,FenObj.head)
            TestObj.feedback = include_feedback

            //Setting items available.
            // First we make sure that there are two distractors: the control item and one of the items belonging to the other pair.
            TestObj.item_direct = FenObj.item_direct

            //Finding the correct item
            let correct_item
            switch(key){
                case("LA"): if(items_allowed_for_indirect_pair === "direct"){correct_item = TrainingFennimals.LA.item} else {correct_item = TrainingFennimals.LB.item} break
                case("LB"): if(items_allowed_for_indirect_pair === "direct"){correct_item = TrainingFennimals.LB.item} else {correct_item = TrainingFennimals.LA.item} break
                case("HA"): if(items_allowed_for_indirect_pair === "direct"){correct_item = TrainingFennimals.HA.item} else {correct_item = TrainingFennimals.HB.item} break
                case("HB"): if(items_allowed_for_indirect_pair === "direct"){correct_item = TrainingFennimals.HB.item} else {correct_item = TrainingFennimals.HA.item} break
                case("C"): correct_item = TrainingFennimals.C.item; break;
            }

            //We will select one element from each of the arrays. So arrays with one element will always be selected
            let OtherPairItems
            switch(key){
                case("LA"): OtherPairItems = [ TrainingFennimals.C.item,[TrainingFennimals.HA.item, TrainingFennimals.HB.item]]; break
                case("LB"): OtherPairItems = [ TrainingFennimals.C.item,[TrainingFennimals.HA.item, TrainingFennimals.HB.item]]; break
                case("HA"): OtherPairItems = [ TrainingFennimals.C.item,[TrainingFennimals.LA.item, TrainingFennimals.LB.item]]; break
                case("HB"): OtherPairItems = [ TrainingFennimals.C.item,[TrainingFennimals.LA.item, TrainingFennimals.LB.item]]; break
                case("C"): OtherPairItems = [ [TrainingFennimals.LA.item,TrainingFennimals.LB.item],[TrainingFennimals.HA.item, TrainingFennimals.HB.item]]; break;
            }

            //Creating an array containing all the trial's available items
            let Available_Items = [correct_item]
            for(let i=0;i<OtherPairItems.length;i++){
                if(typeof OtherPairItems[i] === "string"){
                    Available_Items.push(OtherPairItems[i])
                }else{
                    Available_Items.push(shuffleArray(OtherPairItems[i])[0] )
                }
            }

            //Assigning the properties to the TestObject.
            TestObj.items_available = Available_Items
            TestObj.correct_item = correct_item

            switch(key){
                case("LA"): TestObj.item_direct = TrainingFennimals.LA.item; TestObj.item_indirect = TrainingFennimals.LB.item; break
                case("LB"): TestObj.item_direct = TrainingFennimals.LB.item; TestObj.item_indirect = TrainingFennimals.LA.item; break
                case("HA"): TestObj.item_direct = TrainingFennimals.HA.item; TestObj.item_indirect = TrainingFennimals.HB.item; break
                case("HB"): TestObj.item_direct = TrainingFennimals.HB.item; TestObj.item_indirect = TrainingFennimals.HA.item; break
                case("C"): TestObj.item_direct = TrainingFennimals.C.item; TestObj.item_indirect = false; break
            }

            TestObj.ID = FenObj.ID

            //Pushing to the DirectTestBlock
            Block.push(TestObj)
        }
        if(shuffle_trials){
            return(shuffleArray(Block))
        }else{
            return(Block)
        }

    }

    //Returns a block of the original training trials with all items available
    function createBlockOfRepeatTrainingTrials(shuffle_trials){
        let Block = []
        for(let key in TrainingFennimals){
            let NewFenObj = JSON.parse(JSON.stringify(TrainingFennimals[key]))
            delete NewFenObj.item

            NewFenObj.ID = key
            NewFenObj.items_available = Random_Items

            switch(key){
                case("LA"): NewFenObj.item_direct = TrainingFennimals.LA.item; NewFenObj.item_indirect = TrainingFennimals.LB.item; break
                case("LB"): NewFenObj.item_direct = TrainingFennimals.LB.item; NewFenObj.item_indirect = TrainingFennimals.LA.item; break
                case("HA"): NewFenObj.item_direct = TrainingFennimals.HA.item; NewFenObj.item_indirect = TrainingFennimals.HB.item; break
                case("HB"): NewFenObj.item_direct = TrainingFennimals.HB.item; NewFenObj.item_indirect = TrainingFennimals.HA.item; break
                case("C"): NewFenObj.item_direct = TrainingFennimals.C.item; NewFenObj.item_indirect = false; break
            }

            NewFenObj.correct_item = NewFenObj.item_direct
            NewFenObj.feedback = false

            Block.push(NewFenObj)
        }

        if(shuffle_trials){
            return(shuffleArray(Block))
        }else{
            return(Block)
        }
    }

    // CALL FUNCTIONS //
    ////////////////////
    //Call to get return a deepcopy of the training set Fennimals, keyed on location.
    this.get_experiment_code = function(){
        return(experiment_code)
    }

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
        let Training_Stimuli_In_Array = this.getTrainingSetFennimalsInArray()
        for(let i = 0;i<Training_Stimuli_In_Array.length;i++){
            FennimalLocations[Training_Stimuli_In_Array[i].location] = Training_Stimuli_In_Array[i]
        }

        //Adding some meta-data
        FennimalLocations.MetaData = {
            total_number_of_Fennimals: 5,
            total_number_of_locations: Param.location_Names.length
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

    //Call to get the Training templates
    this.getTrainingTemplates = function(){
        return(JSON.parse(JSON.stringify(TrainingFennimals)))
    }

    //Call to get the Binding Templates
    this.getBindingTemplates = function(){
        return(JSON.parse(JSON.stringify(BindingPhaseTemplates)))
    }
    this.getBindingTemplatesInArray = function(){
        let Arr = []
        for (let key in BindingPhaseTemplates){
            Arr.push(BindingPhaseTemplates[key])
        }

        return(JSON.parse(JSON.stringify(Arr)))
    }

    //Call to get the features sampled after the first similarity task
    this.getFeaturesSampledAfterFirstSimilarityTask = function(){
        return(JSON.parse(JSON.stringify(Selected_Pairs)))
    }

    //Call to get a deep copy of the ItemDetails object (keyed on item)
    this.getItemDetails = function(){
        return(JSON.parse(JSON.stringify(Item_Details)))
    }

    //Returns an array containing all the blocks of the test phase
    this.getTestPhaseData = function(){
        return(JSON.parse(JSON.stringify(BindingPhaseSetup)))
    }

}

//Stimulus data for the calibration pilot
STIMULUSDATA_STIMPILOT = function(){
    RNG = new RandomNumberGenerator(participant_number)

    // There are two types of stimulus pilots:
    //      all: one screen containing all possible heads. Used to verify whether participants correctly identify the clusters of heads.
    //      split: two screens, each containing one member of all pairs
    let stim_pilot_type = "all"
    this.is_stimulus_pilot = true

    // Determining the stimulus heads
    let Stimulus_sets = []
    switch(stim_pilot_type){
        case("all"):
            let New_Set = {Stim: []}
            let Heads = shuffleArray(Param.Available_Fennimal_Heads)
            for(let i = 0; i< Heads.length; i++){
                New_Set.Stim.push({
                    ID: Heads[i],
                    head: Heads[i]
                })
            }
            Stimulus_sets.push(New_Set)

            break
        case("split"):
            //Present the two sets in random order
            let FirstSet_heads, SecondSet_heads

            if(Math.random() > 0.5){
                FirstSet_heads = shuffleArray(Param.Heads_Set_A)
                SecondSet_heads = shuffleArray(Param.Heads_Set_B)
            }else{
                FirstSet_heads = shuffleArray(Param.Heads_Set_B)
                SecondSet_heads = shuffleArray(Param.Heads_Set_A)
            }

            //Adding first set
            let FirstSet = {Stim: []}
            for(let i = 0; i< FirstSet_heads.length; i++){
                FirstSet.Stim.push({
                    ID: FirstSet_heads[i],
                    head: FirstSet_heads[i]
                })
            }
            Stimulus_sets.push(FirstSet)

            //Adding second set
            let SecondSet = {Stim: []}
            for(let i = 0; i< SecondSet_heads.length; i++){
                SecondSet.Stim.push({
                    ID: SecondSet_heads[i],
                    head: SecondSet_heads[i]
                })
            }
            Stimulus_sets.push(SecondSet)

            break
    }

    this.get_number_of_stim_sets = function(){
        return(Stimulus_sets.length)
    }

    this.getNextStimulusHeads = function(){
        return(Stimulus_sets.splice(0,1)[0])
    }

    this.get_experiment_code = function(){
        return("stimulus_pilot_" + stim_pilot_type)
    }



    //Submit block



}

//Defines all experiment parameters which are not part of the stimuli
PARAMETERS = function() {
    //Determines whether the text hints are based on the Fennimals location or region. Default is region.
    this.hints_based_on_location = false

    ////////////////////
    // MAP PARAMETERS //
    ////////////////////
    //Setting the walking speed in the map. Note that this is the number of ms per step, so a lower number corresponds to a higher walking speed
    this.walking_interval_time = .20
    this.total_zoom_time = 1500 //in ms
    this.location_movement_transition = ""

    /////////////////////////
    // LOCATION PARAMETERS //
    /////////////////////////
    this.location_Names = ["Pineforest", "Iceberg", "Windmill", "Garden", "Waterfall", "Mine", "Church", "Farm","Marsh", "Cottage","Oasis", "Cactus", "Beachbar", "Port", "Bush", "Jungleforest"]

    this.Available_Fennimal_Heads = [ "C", "D", "E", "F","G","H","I","J", "K", "L"]
    this.Available_Fennimal_Bodies = ["A", "B", "C", "D", "E", "F","G","H", "I","J","K","L","M", "N"] // ["A", "B", "C", "D", "F","G","H", "I","J","K"] //["A", "B", "C", "D", "E", "F","G","H", "I","J","K","L","M","N"]
    this.Regionfree_Fennimal_Bodies = ["A", "E", "F","H","K","M"] // ["A", "B", "C", "D", "F","G","H", "I","J","K"] //["A", "B", "C", "D", "E", "F","G","H", "I","J","K","L","M","N"]

    this.Heads_Set_A = ["C", "E", "G", "I", "K"]
    this.Heads_Set_B = ["D", "F", "H", "J", "L"]
    this.Heads_Semantic_Pairs = [ ["I", "J"], ["C", "D"], ["K", "L"], ["E", "F"], ["G", "H"]]

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

        location_Neutral : { zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Neutral",
            region: "Neutral",
            sky: "sky_basic",
            AdjacentRegions: []
        },

        //In addition, there are a number of general parameters.
        //These points allow for a non-linear zoom. Should contain 10 points, starting at 1 and ending at 10

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
            hint: "can be found in cold places...",
            Fennimal_location_colors:{
                primary_color: "#526785",
                secondary_color: "#b0c9d4",
                tertiary_color: "#1a46b8",
                eye_color: "#d2dfff",
            },
            contrast_color: "#edc25e",
            preferredBodyType: "B",
        },
        Jungle: {
            Locations : ["Bush", "Jungleforest"],
            lighter_color: "#b5e092",
            color: "#588b1e",
            darker_color: "#235412",
            prefix: "Jungle",
            hint: "lives in tropical forests...",
            Fennimal_location_colors:{
                primary_color: "#566e44",
                secondary_color: "#cfedbe",
                tertiary_color: "#78ab09",
                eye_color: "#dcff8f",
            },
            contrast_color: "#ac7dd7ff",
            preferredBodyType: "N",
        },
        Desert: {
            Locations : ["Oasis", "Cactus"],
            lighter_color: "#f5f55b",
            color: "#c7c602", //#fffe03
            darker_color: "#757500",
            prefix: "Desert",
            hint: "likes the extreme heat...",
            Fennimal_location_colors:{
                primary_color: "#969239",
                secondary_color: "#d1caa9",
                tertiary_color: "#d2d911",
                eye_color: "#f7fe25",
            },
            contrast_color: "#47395b",
            preferredBodyType: "I",
        },
        Mountains: {
            Locations : ["Waterfall", "Mine"],
            lighter_color: "#d6bba9",
            color: "#502d16",
            darker_color: "#26150a",
            prefix: "Mountain",
            hint: "can be found in high places...",
            Fennimal_location_colors:{
                primary_color: "#953f05", //"#ded3d6",
                secondary_color: "#b09a90",//"#dedcdc",
                tertiary_color: "#502d16",
                eye_color: "#47230a",
            },
            contrast_color: "#9fd8ee",
            preferredBodyType: "J",
        },
        Beach: {
            Locations : ["Beachbar", "Port"],
            lighter_color: "#ffd0b0",
            color: "#ffe6d5",
            darker_color: "#615c58",
            prefix: "Beach",
            hint: "lives near the shore...",
            Fennimal_location_colors:{
                primary_color: "#f5a149",//"#665244",
                secondary_color: "#ffe6d5",//"#dedcdc",//"#f7cdbc",
                tertiary_color: "#ffd0b0",//"#f2e7df",
                eye_color: "#f6e8da",
            },
            contrast_color: "#c30b69",
            preferredBodyType: "D",
        },
        Flowerfields: {
            Locations : ["Windmill", "Garden"],
            lighter_color: "#ffcffa",
            color: "#f472e6",
            darker_color: "#783771",
            prefix: "Flowerland",
            hint: "likes to live near flowers...",
            Fennimal_location_colors:{
                primary_color:  "#4d2f49",
                secondary_color: "#d3bfd9",
                tertiary_color: "#890fbd",
                eye_color: "#e8b3ff",
            },
            contrast_color: "#799742",
            preferredBodyType: "G",

        },
        Village: {
            Locations : ["Church", "Farm"],
            lighter_color: "#fcb1b1",
            color: "#f20000",
            darker_color: "#7d0101",
            prefix: "Domestic",
            hint: "likes to live near people...",
            Fennimal_location_colors:{
                primary_color: "#734b53",
                secondary_color: "#ccb1b8",
                tertiary_color: "#d10f0f",
                eye_color: "#ffbdbd",
            },
            contrast_color: "#80eeca",
            preferredBodyType: "L",

        },
        Swamp: {
            Locations : ["Marsh", "Cottage"],
            lighter_color: "#adffef",
            color: "#00fdcc",
            darker_color: "#025e4c",
            prefix: "Wetland",
            hint: "lives in the wetlands...",
            Fennimal_location_colors:{
                primary_color: "#5b7878",
                secondary_color: "#c2f0ea",
                tertiary_color:  "#00b3b3",
                eye_color: "#8affff",
            },
            contrast_color: "#cb156b",
            preferredBodyType: "C",
        },
        Home: {
            color: "#cccccc"
        },
        Neutral : {
            Locations : ["Neutral"],
            lighter_color: "#CCCCCC",
            color: "#AAAAAA",
            darker_color: "#333333",
            prefix: "Fog-covered ",
            Fennimal_location_colors:{
                primary_color: "#AAAAAA",
                secondary_color: "#DDDDDD",
                tertiary_color: "#777777",
                eye_color: "#CCCCCC",

            },
            contrast_color: "#444444"
        }
    }
    this.region_Names = Object.getOwnPropertyNames(this.RegionData)

    this.AbbreviatedLocationNames = {
        Pineforest: "Pifo",
        Iceberg: "Ice",
        Windmill: "Wnd",
        Garden: "Gar",
        Waterfall: "Wafa",
        Mine: "Min",
        Church: "Chu",
        Farm: "Frm",
        Marsh: "Mrs",
        Cottage: "Cot",
        Oasis: "Oas",
        Cactus: "Cac",
        Beachbar: "Bar",
        Port: "Prt",
        Bush: "Bsh",
        Jungleforest: "Jun",
        Neutral: "neu"
    }
    this.AbbreviatedRegionNames = {
        North : "no",
        Jungle: "ju",
        Desert: "de",
        Mountains: "mo",
        Beach: "be",
        Flowerfields: "fl",
        Village: "vi",
        Swamp: "sw",
        Neutral: "neu"
    }

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

    this.Available_items = ["ball", "duck", "car", "trumpet", "kite"] // ["car","spinner","boomerang","balloon","shovel","trumpet"]

    //Alternative colorscheme when the location should not be shown
    this.GrayColorScheme ={
        primary_color: "#AAAAAA",
        secondary_color: "#DDDDDD",
        tertiary_color: "#777777",
        eye_color: "#a7cdfe"
    }

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

    //Denotes the relative x-positions in which (multiple) items should be displayed on the item bar. Keyed by the number of items
    this.ItemRelativeXPositions = {
        1: [.5],
        2: [.333,.666],
        3: [.25,.50,.75],
        4: [.20,.40,.60,.80],
        5: [.167, .333, .50, .667, .833 ],
        6: [1/12, 3/12, 5/12, 7/12, 9/12, 11/12 ],
    }

    //Denotes the X and Y positions for all items. First key denotes the total number of items, next keys indicate the coords on-screen
    this.ItemCoords = {
        flashlight: {x: 0, y: 0},
        5: {
            0: {x: 126, y: 132},
            1: {x: 140, y: 203},
            2: {x: 252, y: 255},
            3: {x: 370, y: 203},
            4: {x: 389, y: 132},
        },
        6: {
            0: {x: 126, y: 132},
            1: {x: 140, y: 203},
            2: {x: 215, y: 256},
            3: {x: 300, y: 256},
            4: {x: 370, y: 203},
            5: {x: 389, y: 132},
        }
    }

    //NAMES
    // Adjective of a name based on the body
    this.NamePrefixes_Body = {
        A: "Striped",
        B: "Furry",
        C: "Sprouting",
        D: "Armoured",
        E: "Spotted",
        F: "Boxy",
        G: "Six-legged",
        H: "Big-armed",
        I: "Scaled",
        J: "Twiggy",
        K: "Spiked",
        L: "Chubby",
        M: "Bearded",
        N: "Long-necked"
    }
    // Description of the head
    this.Names_Head = {
        A: "Kitty",
        B: "Leo",
        C: "Worker",
        D: "Buzzer",
        E: "Chirpy",
        F: "Hoot",
        G: "Finny",
        H: "Hammer",
        I: "Piggy",
        J: "Boar",
        K: "Hisser",
        L: "Slither",
        M: "Squeaky",
        N: "Nibbler",
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

    //Can be "false" (no mention of recruitment platform in instructions), "mturk" or "prolific"
    this.ExperimentRecruitmentMethod = "prolific"

    //The bonus earned per star. If set to false, then no bonus is mentioned throughout the instructions
    this.BonusEarnedPerStar = {
        currency_symbol: "$",
        bonus_per_star: "0.50"
    }

    this.flashlight_radius = 30
    this.flashlight_target_sensitivity = 35

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

    //Check this flag before allowing participant to move to a different location
    let location_move_blocked_flag = false

    //Check this flag when trying to place new location arrows on the screen
    let available_to_show_location_arrows_flag = true

    //Making sure some levels are shown, whilst some others are hidden
    document.getElementById("interface_elements").style.display = "inherit"

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
                if(name !== "Neutral"){
                    LocationMarkerControllers[name].setState(new_state)
                }

            }
            if(typeof name === "object"){
                for(let i=0;i<name.length;i++){
                    if(name[i] !== "Neutral"){
                        LocationMarkerControllers[name[i]].setState(new_state)
                    }
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
            if(name !== "Neutral"){
                LocationMarkerControllers[name] = new LocationMarkerController(name, this)
            }
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
        //SVGReferences.Layers.Fennimals.style.display = "none"
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
            show_ingame_hint((508-230)/2+15,(285.8-140)/2,230,140,"You can move to any part of the island by pressing down (and holding) any of the flashing icons on the map. You can return to the instructions by pressing on the home button (H) in the center of the island.")
        }

        //No location arrows may be displayed on the map
        available_to_show_location_arrows_flag = false
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

        //Hide any Fennimals that may remain on the screen
        document.getElementById("Fennimal_Container").innerHTML = ""

        //Hide the home button
        SVGReferences.Buttons.Home_button.style.display = "none"

        //Hide the Regions layer
        SVGObjects.Layers.Regions.style.display = "none"

    }

    //Call when the Player Icon has reached the end of a point on the map. Call with string location
    function map_end_of_path_reached(location_string){
        //go_to_location("start_"+ location_string,false)
        go_to_location("intersection_"+ location_string,false)

        //To prevent double-clicks when moving away from the map, hold the currently_moving_to_location flag a bit longer before freeing it up again.
        setTimeout(function(){currently_moving_to_location_flag = false},200)
    }

    // REGION LOCATION FUNCTIONS //
    ///////////////////////////////
    let currentLocation, CurrentLocationData, CurrentLocationSVGObj

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
        // Check if there is no flag raised against showing the location arrows
        if(available_to_show_location_arrows_flag){
            //Find the arrow object
            let ArrowObj = document.getElementById(arrow_name)
            ArrowObj.style.display = "inherit"

            //Create event listener. Special case for the back-to-map arrow
            ArrowObj.addEventListener("click", function(){

                if(! currently_moving_to_location_flag){
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
                }
            })
        }

    }

    //Call when leaving a location with a possible Fennimal
    function leaving_location_with_possible_Fennimal(){
        ExpCont.location_left()
    }

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
        //While we are in transit, block the showing of location arrows
        available_to_show_location_arrows_flag = false
        currently_moving_to_location_flag = true

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
                setTimeout(function(){
                    CurrentLocationSVGObj.style.transform = "scale(10,10)"
                }, 5)

                //Show the arrows after a brief delay
                setTimeout(function(){
                    available_to_show_location_arrows_flag = true
                    currently_moving_to_location_flag = false
                    show_next_location_arrows(CurrentLocationData.AdjacentRegions)
                },100)

            }else{
                animate_movement_through_location(CurrentLocationSVGObj, CurrentLocationData)
            }
        }else{
            //Set any relevant next-region arrows on the screen
            available_to_show_location_arrows_flag = true
            currently_moving_to_location_flag = false
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
            show_ingame_hint((508-298)/2,5,350,120,"You can travel within a region of Fenneland by clicking on the highlighted buttons. <br> The map icon at the bottom of the screen returns you to the main map.")
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
        document.getElementById("item_bar_circular").style.fill = color_light + "AA"
        document.getElementById("item_bar_circular").style.stroke = color_dark + "AA"

        let FlashlightPrompt = document.getElementById("prompt_flashlight")
        FlashlightPrompt.getElementsByTagName("rect")[0].style.fill = color_light + "AA"
        FlashlightPrompt.getElementsByTagName("rect")[0].style.stroke= color_dark + "AA"
        FlashlightPrompt.getElementsByTagName("text")[0].childNodes[0].style.fill = color_dark

        let Feedback_Rect = document.getElementById("prompt_feedback").getElementsByTagName("rect")[0]
        Feedback_Rect.style.fill = color_light + "CC"
        Feedback_Rect.style.stroke = color_dark + "EE"
        document.getElementById("prompt_feedback").getElementsByTagName("text")[0].childNodes[0].style.fill = color_dark

    }

    //Animates the transfer across a location, ending at the last zoom level (11). Then shows all arrows in the provided array (should contain DOM element references)
    function animate_movement_through_location(LocationSVGObject, CurrentLocationData){
        //Resetting location if needed
        LocationSVGObject.style.transition = ""
        LocationSVGObject.style.transform = "scale(1,1)"

        setTimeout(function(){
            LocationSVGObject.style.transition = "all " + Param.total_zoom_time + "ms ease-in-out"
            setTimeout(function(){
                LocationSVGObject.style.transform = "scale(10,10)"
            }, 250)
        }, 10)

        setTimeout(function(){
            available_to_show_location_arrows_flag = true
            currently_moving_to_location_flag = false
            show_next_location_arrows(CurrentLocationData.AdjacentRegions)
        }, 400 + Param.total_zoom_time)
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
            location_move_blocked_flag = true
        }else{
            location_move_blocked_flag = false
            available_to_show_location_arrows_flag = true

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
    let that = this

    //We need the references to the SVG elements of the flashlight
    let FlashlightIcon = document.getElementById("flashlight")
    let FlashlightIcon_symbol = document.getElementById("flashlight_light")
    let FlashlightIcon_box = document.getElementById("flashlight_background")

    let Flashlight_Mask_Black = document.getElementById("spotlight_background_mask_black")
    let Flashlight_Mask_Yellow = document.getElementById("spotlight_background_mask")
    let FlashlightPrompt = document.getElementById("prompt_flashlight")

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
                Container.style.display = "inherit"
            }
        }else{
            if(FennimalObj !== false){
                Container.style.display = "none"
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
    function createTargets(List_of_Elem){
        //Get all target circles from the SVG
        let TargetCircles = List_of_Elem
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
        Container.style.display = "none"
        Container.style.opacity = 0
        Container.style.transition = "all 500ms ease-out"

        setTimeout(function(){
            Container.style.display = "inherit"
            HeadObject.style.stroke = "black"
            HeadObject.style.fill = "black"
            BodyObject.style.stroke = "black"
            BodyObject.style.fill = "black"

        }, 5)

        //Fade the outline in
        setTimeout(function(){
            Container.style.opacity = 1
        },100)

        //After a brief delay, fade the outline out and continue with the remaining portion of the trial
        setTimeout(function(){
            Container.style.opacity = 0
            //Wait for the animation to finish before hiding the outline
            setTimeout(function(){
                that.leaving_area();
                ExpCont.FennimalFound(FennimalObj)
                Container.style.transition = ""
                Container.style.opacity = 1
            },600)

        }, 750)



    }

    //Call when leaving the area (before deleting this controller
    this.leaving_area = function(){
        //Hide the prompt
        FlashlightPrompt.style.display = "none"

        //Hiding the item bar and the flashlight icon
        toggleFlashlight(false)
        hideFlashLightIcon()
        hide_Fennimal_background_mask()

        //Clear the Container
        document.getElementById("Fennimal_Container").innerHTML = ""

        if(try_first_use_hint_timeout !== "undefined"){
            clearTimeout(try_first_use_hint_timeout)
        }
        clear_ingame_hint()
    }

    /////////////////////
    // ON CONSTRUCTION //
    /////////////////////
    let Targets, Container, HeadObject, BodyObject
    document.getElementById("Fennimal_Container").innerHTML = ""

    //Check if there is a Fennimal in this location
    if(FennimalObj !== false){
        Container = document.getElementById("Fennimal_Container")
        //Creating the outline object and attaching it to the Container
        let OutlineObject = createFennimalOutline(FennimalObj.head,FennimalObj.body, true)
        Container.appendChild(OutlineObject)

        //Storing references to the head and body part of the outline
        HeadObject = document.getElementById("outline_head")
        BodyObject = document.getElementById("outline_body")

        //Setting the correct fills
        HeadObject.style.fill = "url(#spotlight_gradient)"
        HeadObject.style.stroke = "url(#spotlight_gradient)"
        BodyObject.style.fill = "url(#spotlight_gradient)"
        BodyObject.style.stroke = "url(#spotlight_gradient)"

        //Finding the targets
        let TargetsList = OutlineObject.getElementsByClassName("outline_target")
        Targets = createTargets(TargetsList)
    }
    LocCont.prevent_subject_from_leaving_location(false)

    //Showing the layers on screen
    SVGObjects.Layers.Stage.style.display = "inherit"

    //Creating and setting elements
    showFlashLightIcon()
    toggleFlashlight(false)

    Flashlight_Mask_Yellow.style.fill = "url(#spotlight_gradient_background)"
    FlashlightPrompt.style.display = "inherit"

    // DISPLAYING INGAME HINTS
    //When the first flashlight controller is generated, show subjects a hint on how to use the flashlight.
    let try_first_use_hint_timeout
    let amount_dragged = 0
    let no_fennimal_hint_shown = false

    function try_first_use_hint(){
        if(!IngameHintsGiven.flashlight_first_use){
            show_ingame_hint((508-400)/2,35,400,175,"A flashlight icon will automatically appear in some locations. These locations may contain a Fennimal. <br> <br> You can search for Fennimals by holding down the flashlight icon and dragging the light across the screen")
            IngameHintsGiven.flashlight_first_use = true
        }
    }

    if(!IngameHintsGiven.flashlight_first_use){
        try_first_use_hint_timeout =  setTimeout(function(){try_first_use_hint()},6500)
    }

}

//Manages all the Fennimal interestions. Needs to be created and destroyed for each interaction.
//    Should also be called for an empty slot. Instead of calling with a Fennimal object, call with false (flashlight still works, but no Fennimal outline will appear.
//Handles all the Fennimals and their interactions, including backgrounds and the draggable objects
TrainingPhaseFennimalController = function(FennimalObj, ItemDetails, ItemAvailability, LocCont, ExpCont){
    //ItemAvailability: should contain an object with one key for each element in ItemDetails.All_Items. Each key should be set to either invisible (item not displayed on the bar), "available" (present and availalbe) or "unavailable" (present, but grayed out).
    //The FennimalController gets created AFTER the subject has uncovered the Fennimal outline.

    //Subcontroller for the item interactions stored here
    let ItemCont = false
    let FeedbackCont = false

    SVGObjects.Splashscreen_Fennimal.Mask.style.opacity = 0

    function show_Fennimal_background_mask(){
        //SVGObjects.Splashscreen_Fennimal.Mask.style.opacity = 0
        SVGObjects.Splashscreen_Fennimal.Mask.style.transition = "all 500ms linear"
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "inherit"

        setTimeout(function(){
            SVGObjects.Splashscreen_Fennimal.Mask.style.opacity = 1
        },150)
    }
    function hide_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "none"
    }

    // Call when the interaction is aborted (probably by the subject leaving the area), before deletion of this controller
    this.interactionAborted = function(){
        document.getElementById("Fennimal_Container").innerHTML = ""
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

    //Remove any existing Fennimals on the screen
    document.getElementById("Fennimal_Container").innerHTML = ""

    //Creating the Fennimal SVG group and a container to hold it in
    let Fennimal = createFennimal(FennimalObj)
    Fennimal.style.opacity = 0
    Fennimal.style.transition = "all 500ms linear"
    let Container = document.getElementById("Fennimal_Container")
    Container.appendChild(Fennimal)
    Container.style.display = "inherit"
    SVGObjects.Layers.Stage.style.display = "inherit"

    //First give the prompt while animating in the background mask
    //Set and show the prompt text
    document.getElementById("item_bar_circular").style.display = "none"
    document.getElementById("item_bar").style.display = "none"
    SVGObjects.Layers.Item_Bar.style.display = "inherit"

    SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "You have found a "+ FennimalObj.name

    SVGObjects.Prompts.Feedback.Prompt.style.opacity = 1
    SVGObjects.Prompts.Feedback.Prompt.style.display = "inherit"
    setTimeout(function(){show_Fennimal_background_mask()}, 500)

    //Next animate in the Fennimal
    setTimeout(function(){
        Fennimal.style.opacity = 1
    }, 1000)

    //After a brief delay, show the items by creating an item subcontroller
    let that = this
    setTimeout(function(){
        ItemCont = new ItemController(FennimalObj, ItemAvailability, ItemDetails,LocCont, that, false)
    },2500)

}

//Displays all items as available. Assumes that the FennimalObj.item codes for the correct item and gives feedback accordingly
QuizFennimalController = function(FennimalObj, ItemDetails, LocCont, ExpCont){
    let that = this

    //Remove any existing Fennimals on the screen
    document.getElementById("Fennimal_Container").innerHTML = ""

    //Creating the Fennimal SVG group and a container to hold it in
    let Fennimal = createFennimal(FennimalObj)
    let Container = document.getElementById("Fennimal_Container")
    Container.appendChild(Fennimal)
    Container.style.display = "none"

    //Set all items to appear as available
    let ItemAvailability = {}
    for(let i=0;i<ItemDetails.All_Items.length;i++){
        ItemAvailability[ItemDetails.All_Items[i]] = "available"
    }
    let ItemCont

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
            let previous_Container_transition_style = Container.style.transition

            ItemObj.style.transition = "1000ms ease-out"
            Container.style.transition = "1000ms ease-out"

            setTimeout(function(){
                translate_pos_relative(ItemObj,0,250)
            },1000)

            //Animate the Fennimal Object disappearing
            setTimeout(function(){Container.style.opacity = 0},2000)

            //After both animations are concluded, reset the transition styles
            setTimeout(function(){
                ItemObj.style.transition = previous_item_transition_style
                Container.style.transition = previous_Container_transition_style
                Container.style.opacity = 1
                ItemObj.style.display = "none"
            },4000)

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
                document.getElementById("Fennimal_Container").innerHTML = ""
                hide_Fennimal_background_mask()
                SVGObjects.Prompts.Feedback.Prompt.style.display = "none"
            },500)
        },3000)
    }

    // ON CONSTRUCTION
    //Show the correct layers
    SVGObjects.Layers.Item_Bar.style.display = "inherit"
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
        Container.style.display = "inherit"

        setTimeout(function(){
            ItemCont =  new ItemController(FennimalObj, ItemAvailability, ItemDetails,LocCont, that, false)
        },2000)

    },750)


}

//Call to manage a test trial
TestPhaseFennimalController = function(FennimalObj, ItemDetails, LocCont, ExpCont, max_decision_time, jump_to_location){
    let timed_trial = (max_decision_time !== false)
    let that = this
    //Remove any existing Fennimals on the screen
    document.getElementById("Fennimal_Container").innerHTML = ""

    //Creating the Fennimal SVG group and a container to hold it in
    let Fennimal = createFennimal(FennimalObj)
    Fennimal.style.opacity = 0
    Fennimal.style.transition = "all 500ms linear"
    let Container = document.getElementById("Fennimal_Container")
    Container.appendChild(Fennimal)
    Container.style.display = "inherit"
    SVGObjects.Layers.Stage.style.display = "inherit"

    //Set all items
    let ItemCont
    function show_Fennimal_background_mask(){
        //SVGObjects.Splashscreen_Fennimal.Mask.style.opacity = 0
        SVGObjects.Splashscreen_Fennimal.Mask.style.transition = "all 500ms linear"
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "inherit"

        setTimeout(function(){
            SVGObjects.Splashscreen_Fennimal.Mask.style.opacity = 1
        },150)
    }
    function hide_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "none"
    }

    this.interactionCompleted = function(selected_item){
        if(timed_trial){
            deleteClassNamesFromElement(SVGObjects.Layers.Stage, "CountdownRect")
            clearTimeout(Timer_Countdown)
        }

        FennimalObj.selected_item = selected_item
        FennimalObj.reaction_time = Date.now() - StartTime
        console.log("stopping time measurement: " + (Date.now() - StartTime))
        FennimalObj.correct_item_selected = FennimalObj.selected_item === FennimalObj.correct_item

        if(selected_item !== "timed_out"){
            showFeedback()
        }else{
            ExpCont.test_trial_completed(FennimalObj)
            hide_Fennimal_background_mask()
        }

    }

    this.interactionAborted = function(){
        document.getElementById("Fennimal_Container").innerHTML = ""
        hide_Fennimal_background_mask()
        if(ItemCont !== false){
            ItemCont.interactionAborted()
        }
        SVGObjects.Prompts.Feedback.Prompt.style.display = "none"
    }

    //Shows the feedback (only for direct trials)
    let FeedbackGen = false
    function showFeedback(){
        let time_to_feedback_end = 2500
        //There are three types of feedback:
        //      None: the Fennimal takes the toy and leaves
        //      Correct: the Fennimal plays with the toy (hearts)
        //      Incorrect: the Fennimal throws the toy away

        //Finding relevant elements
        SVGObjects.Prompts.Feedback.Prompt.style.display = "inherit"
        //Fade out the Fennimal and the item over time
        let ItemObj = document.getElementById("item_" + FennimalObj.selected_item)

        //Store the original transition styles
        let previous_item_transition_style = ItemObj.style.transition
        let previous_Fennimal_transition_style = Container.style.transition

        ItemObj.style.transition = "1000ms ease-out"
        Container.style.transition = "1000ms ease-out"

        //ANIMATE NO FEEDBACK
        if(!FennimalObj.feedback){
            SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "The " + FennimalObj.name + " takes the toy to its home"

            //Animate the Fennimal and the item disappearing
            setTimeout(function(){
                Container.style.opacity = 0
                ItemObj.style.opacity = 0
            },1500)
        }

        //ANIMATE POSITVE FEEDBACK
        if(FennimalObj.feedback){
            //Determine positive or negative feedback
            if(FennimalObj.correct_item_selected ){
                //Correct item selected
                FeedbackGen = new ItemGivenPositiveFeedbackController(FennimalObj.selected_item, FennimalObj.name)
                SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Correct! The " + FennimalObj.name + " likes the " + FennimalObj.correct_item

                //After the animations, tell the feedback generator to reset
                setTimeout(function(){FeedbackGen.location_left(); ItemObj.style.display = "none"},time_to_feedback_end )

            }else{
                //Inform the subject that a mistake has been made
                SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Oops! The " + FennimalObj.name + " does NOT like the " + FennimalObj.selected_item

                setTimeout(function(){
                    translate_pos_relative(ItemObj,0,250)
                },1000)

            }
        }

        //Animate the Fennimal Object disappearing
        setTimeout(function(){Container.style.opacity = 0},time_to_feedback_end)

        //After animations are concluded, reset the transition styles
        setTimeout(function(){
            ItemObj.style.transition = previous_item_transition_style
            Container.style.transition = previous_Fennimal_transition_style
            Container.style.opacity = 1
            ItemObj.style.opacity = 1
            ItemObj.style.display = "none"
        },time_to_feedback_end + 500)


        //After a timeout, tell the ExpCon that this trial is completed.
        setTimeout(function(){
            ExpCont.test_trial_completed(FennimalObj)
            //Container.innerHTML = ""
            hide_Fennimal_background_mask()
        },time_to_feedback_end)
    }

    function start_nontimed_trial(){
        //Set the correct layers to be visible
        SVGObjects.Layers.Item_Bar.style.display = "inherit"
        SVGObjects.Prompts.Feedback.Prompt.style.opacity = 1
        SVGObjects.Prompts.Feedback.Prompt.style.display = "inherit"

        if(jump_to_location){
            LocCont.jump_to_static_location(FennimalObj.location)
        }

        setTimeout(function(){show_Fennimal_background_mask()}, 500)

        //Next animate in the Fennimal
        setTimeout(function(){
            Fennimal.style.opacity = 1
        }, 1000)

        //After a brief delay, show the items by creating an item subcontroller
        setTimeout(function(){

            StartTime = Date.now()
            console.log("starting time measurement")

            show_Fennimal_background_mask()
            Container.style.display = "inherit"

            //Figure out which items are available and put them into the correct format for the item controller
            let ItemAvailability = {}
            for(let i = 0;i<ItemDetails.All_Items.length;i++){
                if(FennimalObj.items_available.includes(ItemDetails.All_Items[i])){
                    ItemAvailability[ItemDetails.All_Items[i]] = "available"
                }else{
                    ItemAvailability[ItemDetails.All_Items[i]] = "unavailable"
                }
            }

            ItemCont = new ItemController(FennimalObj, ItemAvailability, ItemDetails,LocCont, that, false)

        },2500)

        //Set and show the prompt text. This should simply say which item was forgotten
        SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "You have found a "+ FennimalObj.name
    }

    //FUNCTIONS FOR TIMED TRIALS
    let MessageContainer
    function show_timed_trial_starting_page(){
        //Show the map as a background
        LocCont.jump_to_static_location(FennimalObj.location)

        //Create a container to hold the starting page elements
        MessageContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')

        let BackgroundRect = document.createElementNS("http://www.w3.org/2000/svg", 'rect')
        BackgroundRect.style.width = "100%"
        BackgroundRect.style.height = "100%"
        BackgroundRect.style.fill = "white"
        BackgroundRect.style.opacity = 0.9

        //Show the press-here circle
        let PressCircle = document.createElementNS("http://www.w3.org/2000/svg", 'circle')
        PressCircle.setAttribute("cx", 258)
        PressCircle.setAttribute("cy", 135)
        PressCircle.setAttribute("r", 10)
        PressCircle.style.cursor ="pointer"
        PressCircle.style.strokeWidth = "3px"
        PressCircle.style.animation = "highlighted_arrow 2s ease-in-out infinite alternate-reverse"

        //The text
        let Text = createTextField(30, 150, 508-2*30,20, "Click on the circle to continue")
        Text.style.textAlign = "center"
        Text.style.fontSize = "15px"

        MessageContainer.appendChild(BackgroundRect)
        MessageContainer.appendChild(PressCircle)
        MessageContainer.appendChild(Text)

        SVGObjects.Layers.Stage.appendChild(MessageContainer)

        PressCircle.onclick = function(){
            //Delete the Starting page container
            MessageContainer.remove()
            start_timed_trial()
        }
    }

    let Timer_Countdown
    function start_trial_timer(){
        //Show the countdown bars on the sides of the screens
        let CountdownRectLeft = document.createElementNS("http://www.w3.org/2000/svg", 'rect')
        //CountdownRectLeft.setAttribute("x",0)
        CountdownRectLeft.style.height = "100%"
        CountdownRectLeft.style.width = "15px"
        CountdownRectLeft.classList.add("CountdownRect")
        CountdownRectLeft.style.animation = "timed_Fennimal_trial_countdown_timer_vertical " + max_decision_time + "ms linear"
        CountdownRectLeft.style.opacity = 0.9
        CountdownRectLeft.setAttribute("y", 0)
        CountdownRectLeft.setAttribute("x", 493)
        CountdownRectLeft.style.transformOrigin = "center"
        CountdownRectLeft.style.transform= "rotate(180deg)"

        let CountdownRectRight = CountdownRectLeft.cloneNode(true)
        CountdownRectRight.setAttribute("x", 0)

        SVGObjects.Layers.Stage.appendChild(CountdownRectLeft)
        SVGObjects.Layers.Stage.appendChild(CountdownRectRight)
        Timer_Countdown = setTimeout(function(){trial_timed_out()}, max_decision_time)

    }

    function start_timed_trial(){
        Fennimal.style.transition = "all 100ms linear"

        //Set the correct layers to be visible
        SVGObjects.Layers.Item_Bar.style.display = "inherit"
        SVGObjects.Prompts.Feedback.Prompt.style.opacity = 1
        SVGObjects.Prompts.Feedback.Prompt.style.display = "inherit"

        show_Fennimal_background_mask()
        Fennimal.style.opacity = 1
        StartTime = Date.now()
        console.log("starting time measurement")

        Container.style.display = "inherit"

        //Figure out which items are available and put them into the correct format for the item controller
        let ItemAvailability = {}
        for(let i = 0;i<ItemDetails.All_Items.length;i++){
            if(FennimalObj.items_available.includes(ItemDetails.All_Items[i])){
                ItemAvailability[ItemDetails.All_Items[i]] = "available"
            }else{
                ItemAvailability[ItemDetails.All_Items[i]] = "unavailable"
            }
        }
        //Jump to the correct location. Note that we now jump to a static location, no movement needed nor allowed
        LocCont.jump_to_static_location(FennimalObj.location)

        ItemCont = new ItemController(FennimalObj, ItemAvailability, ItemDetails,LocCont, that, true)

        //Start the timer
        start_trial_timer()

    }

    function trial_timed_out(){
        ItemCont.interactionAborted()
        //Hide the countdown bars.
        deleteClassNamesFromElement(SVGObjects.Layers.Stage, "CountdownRect")

        //Show a message for a short duration
        //Create a container to hold the starting page elements
        MessageContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')

        let BackgroundRect = document.createElementNS("http://www.w3.org/2000/svg", 'rect')
        BackgroundRect.style.width = "100%"
        BackgroundRect.style.height = "100%"
        BackgroundRect.style.fill = "white"
        BackgroundRect.style.opacity = 0.9

        //The text
        let Text = createTextField(30, 125, 508-2*30,20, "Please give a toy before the time runs out!")
        Text.style.textAlign = "center"
        Text.style.fontSize = "15px"

        MessageContainer.appendChild(BackgroundRect)
        MessageContainer.appendChild(Text)
        SVGObjects.Layers.Stage.appendChild(MessageContainer)

        //Hide all elements and continue to the next trial
        setTimeout(function(){
            MessageContainer.remove()
            that.interactionCompleted("timed_out")
        }, 2000)


    }

    // ON CONSTRUCTION.
    let StartTime

    SVGObjects.Layers.Stage.style.display = "inherit"

    //The construction sequence differs between times and non-timed trials. For timed trials, dump all the information on-screen right away.
    if(timed_trial){
        show_timed_trial_starting_page()

    }else{
        start_nontimed_trial()
    }

}

//Call to create an already-disovered Fennimal. Paints the Fennimal itself and animates in the object / prompt.
CompletedFennimalController = function(FennimalObj, LocCont){
    //Remove any existing Fennimals on the screen
    document.getElementById("Fennimal_Container").innerHTML = ""

    //Creating the Fennimal SVG group and a container to hold it in
    let Fennimal = createFennimal(FennimalObj)
    let Container = document.getElementById("Fennimal_Container")
    Container.appendChild(Fennimal)
    Container.style.display = "inherit"

    //Show the correct layers
    SVGObjects.Layers.Stage.style.display = "inherit"

    //Item and associates
    let Item = document.getElementById("item_"+FennimalObj.item)
    let item_transition_style = Item.style.transition
    Item.style.transition = ""
    Item.style.display = "inherit"

    let DropTarget = document.getElementById("Fennimal_Container").getElementsByClassName("Fennimal_droptarget")[0]
    DropTarget.style.display = "inherit"

    setTimeout(function(){
        let drop_center = getViewBoxCenterPoint(DropTarget)
        MoveElemToCoords(Item, drop_center.x,drop_center.y)
        DropTarget.style.display = "none"
        setTimeout(function(){Item.style.transition = item_transition_style},10)
    },5)

    SVGObjects.Layers.Item_Bar.style.display = "inherit"
    document.getElementById("item_bar_circular").style.display = "none"
    document.getElementById("item_bar").style.display = "none"

    //Create a feedback generator
    let FeedbackGen = new ItemGivenPositiveFeedbackController(FennimalObj.item, FennimalObj.name)

    function show_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "inherit"
    }
    function hide_Fennimal_background_mask(){
        SVGObjects.Splashscreen_Fennimal.Mask.style.display = "none"
    }

    this.interactionAborted = function(){
        document.getElementById("Fennimal_Container").innerHTML = ""
        hide_Fennimal_background_mask()
        if(FeedbackGen !== false){
            FeedbackGen.location_left()
            FeedbackGen = false
        }
        Item.style.display = "none"
    }

    show_Fennimal_background_mask()

    //Since there is no interaction to be done here, the participant can leave whenever
    LocCont.prevent_subject_from_leaving_location(false)
}

//Given an array  of items, manages all the item interactions.
ItemController = function(FennimalObj, ItemAvailability, ItemDetails,LocCont, FenCont, timed_trial){
    //References to the item bar
    let ItemBar = document.getElementById("item_bar_circular")
    SVGObjects.Layers.Item_Bar.style.display = "inherit"

    //Reference to the open-backpack icon
    let OpenBackpackIcon = document.getElementById("open_backpack_icon")
    let OpenBackpackIconPressable = document.getElementById("open_backpack_icon_center")

    //Calculate which items should be shown on the screen
    let Available_Items_On_Screen = []
    for(let key in ItemAvailability){
        if(ItemAvailability[key] === "available"){
            Available_Items_On_Screen.push(key)
        }
    }

    //Keep track of the drop target
    let DropTarget = document.getElementById("Fennimal_Container").getElementsByClassName("Fennimal_droptarget")[0]

    //Reference to the feedback controller
    let FeedbackCont = false

    //Controls the interactions for a single button. Create with an item name and the relative X location on the item bar
    ItemIcon = function (item_name, index, background_color, Controller){
        //Find a reference to the icon element in the SVG
        let IconElem = document.getElementById("item_icon_" + item_name)
        IconElem.style.display = "inherit"

        //Set the correct color to the background rect
        let IconElem_background = document.getElementById("item_icon_" + item_name + "_background")
        IconElem_background.style.fill = background_color

        //Get the correct x and y pos on the screen
        let x = Param.ItemCoords[ItemDetails.All_Items.length][index].x
        let y = Param.ItemCoords[ItemDetails.All_Items.length][index].y

        //Translate the icon to the right position on the item bar
        MoveElemToCoords(IconElem,x,y)

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
    NotAvailableIcon = function(item_name, index){
        //Find a reference to the icon element in the SVG
        let IconElem = document.getElementById("item_icon_" + item_name + "_not_available")
        IconElem.style.display = "inherit"

        //Get the correct x and y pos on the item bar
        let x = Param.ItemCoords[ItemDetails.All_Items.length][index].x
        let y = Param.ItemCoords[ItemDetails.All_Items.length][index].y

        //Translate the icon to the right position on the item bar
        MoveElemToCoords(IconElem,x,y)

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
            document.getElementById("item_bar_circular").style.display = "inherit"

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

            if(item_available === "available"){
                IconButtons[itemname] = new ItemIcon(itemname, i, backgroundcolor,that)
            }

            if(item_available === "unavailable"){
                IconNotAvailable[itemname] = new NotAvailableIcon(itemname,i)
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
        document.getElementById("item_bar_circular").style.display = "none"

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
        OpenBackpackIcon.style.display = "none"
        hideIconButtons()
        hide_all_items()
        if(dragging_state !== false && dragging_state!== "frozen"){

            stoppedDragging(0,0)
        }

        if(FeedbackCont !== false){
            FeedbackCont.location_left()
            FeedbackCont = false
        }
    }

    //Call after feedback to resolve the Fennimal interaction.
    function Fennimal_interaction_completed(selected_item){
        //Inform the FC that a Fennimal interaction has been completed
        //LocCont.prevent_subject_from_leaving_location(false)
        FenCont.interactionCompleted(selected_item)

    }

    //Call when the backpack is opened
    function backpack_opened(){
        OpenBackpackIcon.style.display = "none"
        ItemBar.style.display = "inherit"
        createIconButtonObjects()
        shimmerAllButtons()

        //Set and show the prompt text
        if(Available_Items_On_Screen.length === 0){
            SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Oops! You did not bring the correct toy with you"
            LocCont.prevent_subject_from_leaving_location(false)
        }else{
            if(Available_Items_On_Screen.length === 1){
                SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Give the " + FennimalObj.item + " to the " + FennimalObj.name
            }else{
                SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Give one of the available toys to " + FennimalObj.name
            }
        }

    }

    //Create objects for the icons on the item bar
    let IconButtons = {}
    let IconNotAvailable = []

    // CONSTRUCTION ///
    //Hide the rectangular bar
    document.getElementById("item_bar").style.display = "none"

    //Prevent the subject from leaving during this interaction
    LocCont.prevent_subject_from_leaving_location(true)

    if(timed_trial){
        backpack_opened()

    }else{
        ItemBar.style.display = "none"
        //Show the backpack open icon
        OpenBackpackIcon.style.display = "inherit"
        SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "Click on the icon to open your backpack"
        OpenBackpackIconPressable.onclick = function(){backpack_opened()}


        SVGObjects.Prompts.Feedback.Prompt.style.opacity = 1
        SVGObjects.Prompts.Feedback.Prompt.style.display = "inherit"
    }
}

//Given an item name, generates the feedback hearts and movement until stopped. Includes the prompt on top of the screen
ItemGivenPositiveFeedbackController = function(item_name, fennimal_name){
    SVGObjects.Layers.Feedback.style.display = "inherit"
    let Item = document.getElementById("item_"+item_name)
    Item.classList.add("item_selected")
    let feedbacktime = Param.FennimalTimings.training_phase_feedback_animation_time
    let original_transition_style = Item.style.transition
    let animation_interval = false

    //Set and show the prompt text
    SVGObjects.Prompts.Feedback.Text.childNodes[0].innerHTML = "The " +  fennimal_name + " likes the " + item_name
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

        //Hide the smiley
        document.getElementById("feedback_smiley").style.display = "none"

        Item.classList.remove("item_selected")
    }

    // CONSTRUCTION //
    //Now we can set an interval to create the hearts and movement
    let heartgenerator = false

    //Show the feedback smiley
    document.getElementById("feedback_smiley").style.display = "inherit"

    setTimeout(function(){
        heartgenerator = setInterval(function(){
            //Get a random location within the range. For some reason the heart path seems to be mis-centered, so the constants are to adjust for this
            let ItemCoords = getViewBoxCenterPoint(Item)
            // let random_x = randomIntFromInterval(Math.round(ItemCoords.x) - max_deviation, Math.round(ItemCoords.x) + max_deviation) + 20
            // let random_y = randomIntFromInterval(Math.round(ItemCoords.y) - max_deviation, Math.round(ItemCoords.y) + max_deviation) + 20
            let random_x = randomIntFromInterval(50,458)
            let random_y = randomIntFromInterval(20,263)

            //Generate a new heart
            let NewHeart = new FeedbackHeart(random_x,random_y)
        },2*Param.time_between_feedback_hearts)
        //setTimeout(function(){animate_item_movement()},450)
    },50)
}

//Inform the subject that an objective has been achieved, including the animated stars
ObjectiveAchievedController = function(text_top, text_bottom, show_mask, show_stars){
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
    SVGObjects.Layers.Stage.style.display = "inherit"

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
        TopTextObj.style.opacity = 1
        BottomTextObj.style.opacity = 1
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
    if(show_stars){
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
    }


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
InstructionsController = function(ExpCont, LocCont, DataCont){
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
    let number_of_instruction_boxes = 8

    //Shows the screen with the completion code (if page is reloaded after submission)
    this.show_completion_code_reloaded_screen = function(code){
        //Hide all pages
        hide_all_instruction_pages()

        //Show the instructions layer and the welcome screen
        SVGObjects.Instructions.Layer.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Create the instructions page with the title and text
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)
        SVGObjects.Instructions.Layer.style.display = "inherit"

        let TextTop = createTextField(30, 40, 508-2*30,250, "<b>Your completion code </b>")
        TextTop.style.textAlign = "center"
        TextTop.style.fontSize = "15px"
        Container.appendChild(TextTop)

        let Text2 = createTextField(30, 100, 508-2*30,250, "Do NOT close or refresh this window before submitting your code to Prolific. Your completion code is:  <b>" + code + "</b>")
        Text2.style.textAlign = "center"
        Text2.style.fontSize = "15px"
        Container.appendChild(Text2)

        let Text3 = createTextField(30, 175, 508-2*30,250, "After you have submitted this code to Prolific, it is safe to close this window. Thank you for participating!")
        Text3.style.textAlign = "center"
        Text3.style.fontSize = "15px"
        Container.appendChild(Text3)
    }

    //Shows the consent page
    this.show_consent_screen = function(){
        //Hide all pages
        hide_all_instruction_pages()

        //Show the instructions layer and the consent page
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Consent.style.display = "inherit"

        //Hide the checkmark and continue button
        document.getElementById("consent_check_mark").style.display = "none"
        document.getElementById("consent_check_mark").style.pointerEvents = "none"
        document.getElementById("consent_continue_button").style.display = "none"

        let current_consent_state = false
        document.getElementById("consent_check_box").onclick = function(){
            if(current_consent_state){
                current_consent_state = false
                document.getElementById("consent_check_mark").style.display = "none"
                document.getElementById("consent_continue_button").style.display = "none"
            }else{
                current_consent_state = true
                document.getElementById("consent_check_mark").style.display = "inherit"
                document.getElementById("consent_continue_button").style.display = "inherit"
            }

            DataCont.consent_provided(current_consent_state)

        }

        document.getElementById("consent_continue_button").onclick = function(){ EC.showStartScreen()}


    }

    //Shows the start screen with the F11 prompt\
    this.gotoStartScreen = function(){
        current_instructions_state = "start"

        //Hide all pages
        hide_all_instruction_pages()

        //Show the instructions layer and the welcome screen
        SVGObjects.Instructions.Layer.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Set event listener for the fullscreen button
        // document.getElementById("button_instructions_fullscreen").addEventListener("mousedown", startScreenCompleted )

        //Create the instructions page with the title and text
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)
        SVGObjects.Instructions.Layer.style.display = "inherit"

        let TextTop = createTextField(30, 40, 508-2*30,250, "<b>This experiment is best experienced by setting your browser to full-screen mode.</b>")
        TextTop.style.textAlign = "center"
        TextTop.style.fontSize = "15px"
        Container.appendChild(TextTop)

        let Text2 = createTextField(30, 90, 508-2*30,250, "Pressing the button below will toggle full-screen mode")
        Text2.style.textAlign = "center"
        Text2.style.fontSize = "15px"
        Container.appendChild(Text2)

        let Text3 = createTextField(30, 120, 508-2*30,250, "On windows you can exit (and re-enter) full-screen mode at any time by pressing [F11]. On Mac, you can enter and leave full-screen mode at any time by pressing [Command]+[Cntrl]+[F].")
        Text3.style.textAlign = "center"
        Text3.style.fontSize = "15px"
        Container.appendChild(Text3)

        let Text4 = createTextField(30, 180, 508-2*30,250, "<i>Important note: this experiment is only supported for Chrome. Using any other browsers may result in unforeseen errors! </i>")
        Text4.style.textAlign = "center"
        Text4.style.fontSize = "15px"
        Container.appendChild(Text4)

        let Button = createSVGButtonElem((508-200)/2,245,200,30,"GO TO FULL-SCREEN")
        Button.addEventListener("mousedown", toggleFullscreen)
        Button.addEventListener("mousedown", showgeneralstartscreen)
        Container.appendChild(Button)
    }

    //Give to participants who join for an Mturk experiment. Gives an overview of
    function showgeneralstartscreen(){
        //Create the instructions page with the title and text
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)
        SVGObjects.Instructions.Layer.style.display = "inherit"

        switch(Param.ExperimentRecruitmentMethod){
            case("mturk"):
                Container.appendChild(createInstructionTitleElem("INSTRUCTIONS FOR THIS HIT"))
                Container.appendChild(createTextField(30, 35, 508-2*30,250, "In this HIT you will be a participant in an experiment conducted at the University of Vienna. At no point during this HIT will we provide deceiving of erroneous information to you. <br>" +
                    "<br>" +
                    "This HIT is expected to last around 40-45 minutes. Based on your decisions in the last part of the experiment you can earn up to seven stars for your performance. You will earn a bonus of " + Param.BonusEarnedPerStar.currency_symbol+ Param.BonusEarnedPerStar.bonus_per_star + " per star that you obtain.  <br>" +
                    "<br>" +
                    "All the answers and data that you provide are completely anonymous. You will only be known to us via your Mturk Worker ID. We will not store or record any personally identifiable information at any point during the experiment. Your anonymized data will be exclusively used for research-related goals. Your data will be archived and may be shared with other researchers in the future. <br>" +
                    "<br>" +
                    "By clicking on the button below you state that you are above the age of 18 and consent to the terms outlined above. <br>" +
                    "<br>" +
                    "Note: this HIT is only supported for Chrome. It is not recommended that you use any other browsers when completing this HIT, as unforeseen bugs may prevent you from completing the experiment. "))

                break
            case("prolific"):
                Container.appendChild(createInstructionTitleElem("INSTRUCTIONS FOR THIS EXPERIMENT"))
                Container.appendChild(createTextField(30, 35, 508-2*30,250, "In this experiment you will be a participant in an experiment conducted at the University of Vienna. We will not provide any deceiving or erroneous information to you at any point throughout the experiment. <br>" +
                    "<br>" +
                    "This experiment is expected to last around 45 minutes. Based on your decisions in the last part of the experiment you can earn up to five stars for your performance. You will earn a bonus of " + Param.BonusEarnedPerStar.currency_symbol+ Param.BonusEarnedPerStar.bonus_per_star + " per star that you obtain. <br>" +
                    "<br>" +
                    "All the answers and data that you provide are completely anonymous. You will only be known to us via your Prolific ID. We will not store or record any personally identifiable information at any point during the experiment. Your anonymized data will be exclusively used for research-related goals. Your data will be archived and may be shared with other researchers in the future. <br>" +
                    "<br>" +
                    "By clicking on the button below you state that you are above the age of 18 and consent to the terms outlined above. <br>" +
                    "<br>" +
                    "Note: this experiment is only supported for Chrome. It is not recommended that you use any other browsers, as unforeseen bugs may prevent you from completing the experiment. "))

                break
            case(false):
                Container.appendChild(createInstructionTitleElem("INSTRUCTIONS FOR THIS EXPERIMENT"))
                Container.appendChild(createTextField(30, 35, 508-2*30,250, "In this experiment you will be a participant in an experiment conducted at the University of Vienna. At no point during this experiment will we provide deceiving of erroneous information to you. <br>" +
                    "<br>" +
                    "This experiment is expected to last around 30-40 minutes. All the answers and data that you provide are completely anonymous. We will not store or record any personally identifiable information at any point during the experiment. Your anonymized data will be exclusively used for research-related goals. Your data will be archived and may be shared with other researchers in the future. <br>" +
                    "<br>" +
                    "By clicking on the button below you state that you are above the age of 18 and consent to the terms outlined above. <br>" +
                    "<br>" +
                    "Note: this experiment is only supported for Chrome. It is not recommended that you use any other browsers, as unforeseen bugs may prevent you from completing the experiment. "))

                break
        }


        let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
        Button.onclick = function(){
            hide_all_instruction_pages()
            EC.start_screen_completed()
        }
        Container.appendChild(Button)
    }

    //Shows the basic instructions
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

    // Creates and returns a miniature outline of a Fennimal.
    function createFennimalIcon(Fennimal, x, y, scale, outline_only, use_gray_color_scheme){
        let IconObj
        if(outline_only){
            IconObj = createFennimalOutline(Fennimal.head,Fennimal.body, false)
        }else{
            if(!use_gray_color_scheme){
                IconObj = createFennimal(Fennimal)
            }else{
                let NewFennimal = JSON.parse(JSON.stringify(Fennimal))
                NewFennimal.head_color_scheme = Param.GrayColorScheme
                NewFennimal.body_color_scheme = Param.GrayColorScheme
                IconObj = createFennimal(NewFennimal)
            }
        }

        IconObj.style.transform = "scale(" + scale + ")"
        let OutlineMoveContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        OutlineMoveContainer.appendChild(IconObj)
        OutlineMoveContainer.style.transform = "translate(" + x + "px," + y +"px)"
        OutlineMoveContainer.classList.add("Fennimal_Icon")
        return(OutlineMoveContainer)
    }

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
    let CurrentLocationVisitationObject, CurrentFennimalsPresentOnMap, TrainingStimuli
    this.showExplorationInstructions = function(LocationVisitationObject, FennimalsPresentOnMap, TrainingStim){
        CurrentLocationVisitationObject = LocationVisitationObject
        CurrentFennimalsPresentOnMap = FennimalsPresentOnMap
        TrainingStimuli = TrainingStim

        showExplorationPage()
    }

    //Call to show all the to-be-found location names and Fennimal icons during the exploration phase. Assumes that the exploration phase has already been started.
    function showExplorationPhaseProgressPage(){
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

        //Setting the Fennimal icons.
        // Deleting any previous outlines, if they exist
        if (document.contains(document.getElementById("Exploration_Icons"))) {
            document.getElementById("Exploration_Icons").remove();
        }

        let Page = SVGObjects.Instructions.Pages.Exploration
        let IconsContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        IconsContainer.id = "Exploration_Icons"
        Page.appendChild(IconsContainer)

        // Here we hardcode the x and y positions on the screen. Messy but easy
        let Positions = [
            {x:260,y:98},
            {x:260,y:150},
            {x:340,y:98},
            {x:340,y:150},
            {x:415,y:98},
            {x:415,y:150}]

        for(let i =0; i<TrainingStimuli.length; i++){
            let Fennimal = TrainingStimuli[i]

            //Get the box containing the outline and name
            let Box = document.getElementById("instructions_exploration_target_Fennimal_" + (i+1) + "x")
            Box.style.display = "inherit"

            //Set the name
            Box.getElementsByTagName("text")[0].childNodes[0].innerHTML = Fennimal.name

            //Finding the correct colors
            let region_color_light = Param.RegionData[Fennimal.region].lighter_color
            let region_color_dark = Param.RegionData[Fennimal.region].darker_color

            //Figuring out whether or not the Fennimal has been found
            let fennimal_found = ("order_found" in CurrentFennimalsPresentOnMap[Fennimal.location])

            //Setting the visible state of the box elements
            if(fennimal_found){
                Box.getElementsByTagName("path")[0].style.opacity = 1
                Box.getElementsByTagName("rect")[0].style.fill = region_color_light + "66"
                Box.getElementsByTagName("text")[0].childNodes[0].style.fill = region_color_dark
            }else{
                //Fennimal has not been found
                Box.getElementsByTagName("path")[0].style.opacity = 0
                Box.getElementsByTagName("rect")[0].style.fill = region_color_light + "33"
                Box.getElementsByTagName("text")[0].childNodes[0].style.fill = region_color_dark + "55"
            }

            //Creating the icon. If the Fennimal has not been found, this should be an outline. Otherwise color the Fennimal
            let IconObj
            if(! fennimal_found){
                IconObj = createFennimalIcon(Fennimal, Positions[i].x, Positions[i].y, 0.165, !fennimal_found, false)
                IconObj.style.opacity = 0.4
            }else{
                IconObj = createFennimalIcon(Fennimal, Positions[i].x, Positions[i].y, 0.15, !fennimal_found, false)
            }
            IconsContainer.appendChild(IconObj)

        }

    }

    //Call to show the exploration instructions, assuming that the exploration phase has been started
    function showExplorationPage(){
        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Exploration.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Set the correct state for the button.
        current_instructions_state = "welcome"

        // Show the title and text
        let Page = SVGObjects.Instructions.Pages.Exploration

        //Clear all the previous elements
        deleteClassNamesFromElement(Page, "instruction_title")
        deleteClassNamesFromElement(Page, "basic_instructions_text")
        deleteClassNamesFromElement(Page, "instructions_button")

        Page.appendChild(createInstructionTitleElem(Instructions.Training_Phase.Exploration.title))
        Page.appendChild(createTextField(10, 29, 508-2*10,200, Instructions.Training_Phase.Exploration.text_top))
        let BottomText = createTextField(40, 210, 508-2*40,100, Instructions.Training_Phase.Exploration.text_bottom)
        BottomText.style.textAlign = "center"
        BottomText.style.fontStyle = "italic"
        Page.appendChild(BottomText)

        //Showing the progress
        showExplorationPhaseProgressPage()

        //Creating the buttons at the bottom of the page
        let InstructionsButton = createSVGButtonElem(40,250,150,22,"Instructions")
        let ContinueButton = createSVGButtonElem(320,250,150,22,"Continue")
        Page.appendChild(InstructionsButton)
        Page.appendChild(ContinueButton)

        //Set the event handlers for the two buttons. Continue should go to the map, Instructions should go to the welcome page.
        ContinueButton.onclick = function(){
            ExpCont.exploration_instruction_page_closed()
        }
        InstructionsButton.onclick = function(){
            showWelcomeScreen()
        }


    }

    //Call when the exploration phase is completed to show the all the found locations and Fennimals. Assumes that the exploration phase has been started
    this.showExplorationCompletedPage = function(ContinueButtonFunc){
        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Exploration.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Clear all the previous elements
        let Page = SVGObjects.Instructions.Pages.Exploration
        deleteClassNamesFromElement(Page, "instruction_title")
        deleteClassNamesFromElement(Page, "basic_instructions_text")
        deleteClassNamesFromElement(Page, "instructions_button")

        // Show the title and text
        Page.appendChild(createInstructionTitleElem(Instructions.Training_Phase.Exploration_Completed.title))
        Page.appendChild(createTextField(10, 38, 508-2*10,200, Instructions.Training_Phase.Exploration_Completed.text_top))
        let BottomText = createTextField(40, 220, 508-2*40,100, Instructions.Training_Phase.Exploration_Completed.text_bottom)
        BottomText.style.textAlign = "center"
        BottomText.style.fontStyle = "italic"
        Page.appendChild(BottomText)

        //Showing the progress
        showExplorationPhaseProgressPage()

        //Creating the buttons at the bottom of the page
        let ContinueButton = createSVGButtonElem((508-150)/2,250,150,22,"Continue")
        Page.appendChild(ContinueButton)

        //Set the event handlers for the two buttons. Continue should go to the map, Instructions should go to the welcome page.
        ContinueButton.onclick = ContinueButtonFunc

    }

    // SEARCH PHASE //
    //////////////////
    //Search hint can either be "icon" (showing a small icon) or "name" (showing the name)
    let Current_Search_Trial_Fennimal, current_hint_type
    this.showSearchInstructions = function(Fennimal, hint_type){
        Current_Search_Trial_Fennimal = Fennimal
        current_hint_type = hint_type

        //Set the correct state for the button.
        current_instructions_state = "search"
        showSearchPage()
    }
    function showSearchPage(){
        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Search.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Clear all the previous elements
        let Page = SVGObjects.Instructions.Pages.Search
        deleteClassNamesFromElement(Page, "instruction_title")
        deleteClassNamesFromElement(Page, "basic_instructions_text")
        deleteClassNamesFromElement(Page, "instructions_button")
        deleteClassNamesFromElement(Page, "Fennimal_Icon")

        //Show title and text
        Page.appendChild(createInstructionTitleElem(Instructions.Training_Phase.Search.title))
        Page.appendChild(createTextField(30, 40, 508-2*30,200, Instructions.Training_Phase.Search.text))

        if(current_hint_type === "icon"){
            Page.appendChild(createFennimalIcon(Current_Search_Trial_Fennimal,150, 120,0.4,false, true))
        }
        if(current_hint_type === "name"){
            let HintText = createTextField((508/2)-25, 130, 50,40, "<b> Hint: </b>")
            HintText.style.textAlign = "center"
            Page.appendChild(HintText)
            let NameText = createTextField((508/2)-125, 150, 250,55, "This Fennimal is a " + Current_Search_Trial_Fennimal.name)
            NameText.style.fontSize = "20px"
            NameText.style.textAlign = "center"
            Page.appendChild(NameText)
        }

        //Creating the buttons at the bottom of the page
        let InstructionsButton = createSVGButtonElem(40,250,150,22,"Instructions")
        let ContinueButton = createSVGButtonElem(320,250,150,22,"Continue")
        Page.appendChild(InstructionsButton)
        Page.appendChild(ContinueButton)

        ContinueButton.onclick = function(){
            ExpCont.search_instruction_page_closed()
        }
        InstructionsButton.onclick = function(){
            showWelcomeScreen()
        }

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
        document.getElementById("DeliveryContinueButton").style.display = "inherit"

    }
    this.showDeliveryInstructions = function(Fennimal, hint_type, _ItemDetails){
        Current_Search_Trial_Fennimal = Fennimal
        current_hint_type = hint_type
        ItemDetails = _ItemDetails

        //Set the correct state for the button.
        current_instructions_state = "delivery"

        showDeliveryPage()
    }
    function showDeliveryPage(){
        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Hint_and_pack_item_boxes.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Clear all the previous elements
        let Page = SVGObjects.Instructions.Hint_and_pack_item_boxes
        deleteClassNamesFromElement(Page, "instruction_title")
        deleteClassNamesFromElement(Page, "basic_instructions_text")
        deleteClassNamesFromElement(Page, "instructions_button")
        deleteClassNamesFromElement(Page, "Fennimal_Icon")

        //Show title and text
        Page.appendChild(createInstructionTitleElem(Instructions.Training_Phase.Delivery.title))
        Page.appendChild(createTextField(15, 35, 508-2*15,200, Instructions.Training_Phase.Delivery.text))

        //Show the correct hint
        if(current_hint_type === "icon"){
            Page.appendChild(createFennimalIcon(Current_Search_Trial_Fennimal,-38, 120,0.47,false, true))
        }
        if(current_hint_type === "name"){
            let NameText = createTextField(22, 140, 125,90, "This Fennimal is a <br> " + Current_Search_Trial_Fennimal.name)
            NameText.style.fontSize = "20px"
            NameText.style.textAlign = "center"
            Page.appendChild(NameText)
        }
        if(current_hint_type === "location"){
            let NameText = createTextField(22, 140, 125,90, "This Fennimal lives at <br> " + Param.SubjectFacingLocationNames[Current_Search_Trial_Fennimal.location])
            NameText.style.fontSize = "20px"
            NameText.style.textAlign = "center"
            Page.appendChild(NameText)
        }

        //Creating the buttons at the bottom of the page
        let InstructionsButton = createSVGButtonElem(40,250,150,22,"Instructions")
        let ContinueButton = createSVGButtonElem(320,250,150,22,"Continue")
        Page.appendChild(InstructionsButton)
        Page.appendChild(ContinueButton)

        //Set the event handlers for the two buttons. Continue should go to the map, Instructions should go to the welcome page.
        ContinueButton.onclick = function(){
            ExpCont.delivery_instruction_page_closed(current_item_in_backpack)
        }
        InstructionsButton.onclick = function(){
            showWelcomeScreen()
        }

        //Set the text to indicate that no item has been selected thus far
        document.getElementById("instructions_delivery_item_selected_text").childNodes[0].innerHTML = "Click to select one of the available items"

        //Hide the continue button until one item has been selected
        ContinueButton.id = "DeliveryContinueButton"
        ContinueButton.style.display = "none"

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


    }
    //Resets the delivery page to its default state (no item selected)
    this.resetDeliveryPage = function(){
        current_item_in_backpack = false;
        showDeliveryPage()

        //Hide the continue button
        document.getElementById("DeliveryContinueButton").style.display = "none"
    }

    // QUIZ //
    //////////
    let first_quiz_instructions_given = false
    this.showQuizInstructions = function(){
        current_instructions_state = "quiz"
        showQuizPage()
    }
    function showQuizPage(){
        showNewInstructionsPage()

        //Create a container for the title and text elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)

        if(!first_quiz_instructions_given){
            first_quiz_instructions_given = true
            Container.appendChild(createInstructionTitleElem(Instructions.Training_Phase.Quiz_Start_First.title))
            Container.appendChild(createTextField(30, 60, 508-2*30,200, Instructions.Training_Phase.Quiz_Start_First.text))
        }else{
            Container.appendChild(createInstructionTitleElem(Instructions.Training_Phase.Quiz_Start_Second.title))
            Container.appendChild(createTextField(30, 60, 508-2*30,200, Instructions.Training_Phase.Quiz_Start_Second.text))
        }

        //Creating the continue button at the bottom of the page
        let ContinueButton = createSVGButtonElem((508-150)/2,245,150,20,"Continue")
        Container.appendChild(ContinueButton)

        //Set the event handlers for the two buttons. Continue should start the quiz, Instructions should go to the welcome page.
        ContinueButton.onclick = function(){
            ExpCont.quiz_instructions_page_closed()
        }

    }

    this.showQuizFailedPage = function(continue_button_func){
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)

        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem(Instructions.Training_Phase.Quiz_Failed.title))
        let TextField = createTextField(30, 75, 508-2*30,200, Instructions.Training_Phase.Quiz_Failed.text)
        Container.appendChild(TextField)

        let Button = createSVGButtonElem((508-150)/2,245,150,20,"Continue")
        Button.onclick = continue_button_func
        Container.appendChild(Button)
    }

    // BASE INSTRUCTION ELEMENTS
    //Clears all elements with a class-name marked_for_deletion
    function cull_the_marked(){
        let The_Damned = document.getElementsByClassName("marked_for_deletion")
        while(The_Damned.length > 0){
            The_Damned[0].parentNode.removeChild(The_Damned[0])
        }
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

    this.clearInstructionPage = function(){
        hide_all_instruction_pages()
        cull_the_marked()
        SVGObjects.Instructions.Layer.style.display = "none"
    }

    //Creates and returns a ForeignObject containing an input field
    // TEST PHASE //
    ////////////////
    this.showQuizPassedInstructions = function(buttonfunction){
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)
        SVGObjects.Instructions.Layer.style.display = "inherit"

        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem(Instructions.Test_Phase.Quiz_Passed.title))

        let text = Instructions.Test_Phase.Quiz_Passed.textTop
        if(Param.ExperimentRecruitmentMethod === "mturk" || Param.ExperimentRecruitmentMethod === "prolific"){
            text = text + " You will earn a bonus of "  + Param.BonusEarnedPerStar.currency_symbol+ Param.BonusEarnedPerStar.bonus_per_star + " for each star earned. "
        }

        text = text + "<br><br>" +  Instructions.Test_Phase.Quiz_Passed.textBottom
        Container.appendChild(createTextField(10, 40, 508-2*10,250, text))


        setTimeout(function(){
            let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
            Container.appendChild(Button)
            Button.onclick = buttonfunction
        },1000)
    }

    // Shows the "Day X" screen. Next_screen can be either "novel_block" or "repeat_training"
    function showTestPhaseDayScreen(current_day, total_days,next_screen, passthrough_buttonfunction){
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)
        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem("Starting day " + current_day))

        let instruction_text = "You're about to start the next day of your practical experience in Fenneland. There will be " + total_days +  " days in total.  "
        if(current_day === 1) { instruction_text = "You're about to start the very first day of your practical experience in Fenneland. There will be  " + total_days +  " days in total. "}
        if(current_day === total_days) { instruction_text = "You're about to start the last day of your practical experience in Fenneland! "}

        let TextField = createTextField(30, 115, 508-2*30,100, instruction_text)
        TextField.style.fontSize = "13px"
        TextField.style.textAlign = "center"
        Container.appendChild(TextField)

        // All the day icons (making sure that the completed ones are checked and the current day is higlighted)
        /*
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
            if(next_screen === "direct_block"){  Button.onclick = function(){showTestPhaseDirectBlockText(passthrough_buttonfunction)} }
            if(next_screen === "indirect_block"){  Button.onclick = function(){showTestPhaseIndirectBlockText(passthrough_buttonfunction)} }
            if(next_screen === "repeat_block"){  Button.onclick = function(){showTestPhaseRepeatBlockText(passthrough_buttonfunction)} }

            },500+ current_day*500)

         */
        let Button = createSVGButtonElem((508-150)/2,230,150,30,"CONTINUE")
        Container.appendChild(Button)
        if(next_screen === "direct_block"){  Button.onclick = function(){showTestPhaseDirectBlockText(passthrough_buttonfunction)} }
        if(next_screen === "indirect_block"){  Button.onclick = function(){showTestPhaseIndirectBlockText(passthrough_buttonfunction)} }
        if(next_screen === "repeat_block"){  Button.onclick = function(){showTestPhaseRepeatBlockText(passthrough_buttonfunction)} }
        if(next_screen === "final_block"){  Button.onclick = function(){showTestPhaseFinalBlockText(passthrough_buttonfunction)} }

    }

    //Shows the intructions for one of the non-repeat-training test phase blocks
    function showTestPhaseDirectBlockText(buttonfunction){
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)

        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem(Instructions.Test_Phase.Direct.title))
        let TextField = createTextField(30, 20, 508-2*30,220, Instructions.Test_Phase.Direct.text)
        Container.appendChild(TextField)

        setTimeout(function(){
            let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
            Container.appendChild(Button)
            Button.onclick = buttonfunction
        },1000)
    }
    function showTestPhaseIndirectBlockText(buttonfunction){
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)

        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem(Instructions.Test_Phase.Indirect.title))
        let TextField = createTextField(30, 15, 508-2*30,220, Instructions.Test_Phase.Indirect.text)
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
        let TextField = createTextField(30, 30, 508-2*30,200, Instructions.Test_Phase.Repeat_Training_Block.text)
        TextField.style.fontSize = "13px"
        Container.appendChild(TextField)

        setTimeout(function(){
            let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
            Container.appendChild(Button)
            Button.onclick = buttonfunction
        },1000)
    }

    function showTestPhaseFinalBlockText(buttonfunction){
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)

        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem(Instructions.Test_Phase.Final.title))
        let TextField = createTextField(30, 30, 508-2*30,210, Instructions.Test_Phase.Final.text)
        TextField.style.fontSize = "13px"
        Container.appendChild(TextField)

        setTimeout(function(){
            let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
            Container.appendChild(Button)
            Button.onclick = buttonfunction
        },1000)

    }

    this.show_test_phase_instructions_direct_block = function(current_day, total_days, button_function){
        showTestPhaseDayScreen(current_day,total_days,"direct_block", button_function)
    }
    this.show_test_phase_instructions_indirect_block = function(current_day, total_days, button_function){
        showTestPhaseDayScreen(current_day,total_days,"indirect_block", button_function)
    }
    this.show_test_phase_instructions_repeat_block = function(current_day, total_days, button_function){
        showTestPhaseDayScreen(current_day,total_days,"repeat_block", button_function)
    }
    this.show_test_phase_instructions_final_block = function(current_day, total_days, button_function){
        //showTestPhaseDayScreen(current_day,total_days,"final_block", button_function)

        //Show the final day instructions for the timed trials
        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVGObjects.Instructions.Layer.style.display = "inherit"
        SVGObjects.Instructions.Pages.Final_Block.style.display = "inherit"

        //Show the map background
        show_map_background()

        //Clear all the previous elements
        let Page = SVGObjects.Instructions.Pages.Final_Block
        deleteClassNamesFromElement(Page, "instruction_title")
        deleteClassNamesFromElement(Page, "basic_instructions_text")
        deleteClassNamesFromElement(Page, "instructions_button")
        deleteClassNamesFromElement(Page, "Fennimal_Icon")

        //Creating the buttons at the bottom of the page
        setTimeout(function(){
            let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
            Page.appendChild(Button)
            Button.onclick = button_function
        },1000)

    }

    //Shows the target for a test phase round
    this.show_test_phase_target_screen = function(Fennimal,block_type, hint_type){
        let Page = SVGObjects.Instructions.Pages.Test_Target
        deleteClassNamesFromElement(Page, "instruction_container")
        showNewInstructionsPage()

        SVGObjects.Instructions.Layer.style.display = "inherit"
        Page.style.display = "inherit"

        //Show the map background
        show_map_background()

        let Container = createInstructionContainer()
        Container.appendChild(createInstructionTitleElem("A new Fennimal has been spotted!"))
        Page.appendChild(Container)

        Container.classList.add("instruction_container")
        let TextTop = createTextField((508/2)-200, 50, 400,40, "<b> A Fennimal has been spotted! Please go visit it and give it a toy </b>")
        TextTop.style.textAlign = "center"
        Container.appendChild(TextTop)

        //Setting the hint
        let text
        if(hint_type === "text"){
            if(block_type === "training"){
                Container.appendChild(createFennimalIcon(Fennimal,150, 120,0.4,false, true))
            }
            if(block_type === "direct" || block_type === "indirect" || block_type === "final_block" ){
                text = "A new Fennimal has been spotted at " + Param.SubjectFacingLocationNames[Fennimal.location]
                let LocationText = createTextField((508/2)-200, 150, 400,55, text)
                LocationText.style.fontSize = "20px"
                LocationText.style.textAlign = "center"
                Container.appendChild(LocationText)
            }
            if(block_type === "repeat_training"){
                text = "An old friend has been spotted at " + Param.SubjectFacingLocationNames[Fennimal.location]
                let LocationText = createTextField((508/2)-200, 150, 400,55, text)
                LocationText.style.fontSize = "20px"
                LocationText.style.textAlign = "center"
                Container.appendChild(LocationText)
            }

        }

        if(hint_type === "icon"){
            Container.appendChild(createFennimalIcon(Fennimal,150, 120,0.4,false, true))
        }

        let ContinueButton = createSVGButtonElem((508-150)/2,245,150,30,"Go to the map")
        Container.appendChild(ContinueButton)
        ContinueButton.onclick = function(){
            ExpCont.test_target_instruction_page_closed()
        }
    }

    //Show the screen with the open question
    this.show_open_question_screen = function(ScoreObject, datasubmissionfunc){
        //Create the instructions page with the title and text
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)
        SVGObjects.Instructions.Layer.style.display = "inherit"

        Container.appendChild(createInstructionTitleElem("AN OPEN QUESTION"))
        Container.appendChild(createTextField(30, 40, 508-2*30,100, "During the the last part of your training to become an Expert Wildlife Ranger, you could freely decide between different toys to give to a Fennimal. How did you decide which toy to give to the Fennimals? What did you do if the toy you wanted to give to the Fennimal was not available?"))

        //Create a text area as a foreign object
        let TextBoxContainer = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
        TextBoxContainer.setAttribute("x", 30)
        TextBoxContainer.setAttribute("y", 85)
        TextBoxContainer.setAttribute("width", 508-2*30)
        TextBoxContainer.setAttribute("height", 140)
        TextBoxContainer.style.padding = "10px"
        Container.appendChild(TextBoxContainer)

        let TextAreaObj = document.createElement('textarea');
        TextAreaObj.cols = 80;
        TextAreaObj.rows = 40;
        TextAreaObj.id = "open_question_area"
        TextAreaObj.classList.add("open_question_area")

        TextBoxContainer.appendChild(TextAreaObj)

        //The text area is not part of the hidden form, so to preserve the data we need to transfer it
        TextAreaObj.onchange = function(){
            DataCont.update_open_question_answer( TextAreaObj.value)
        }
        TextAreaObj.onfocusout = function(){
            DataCont.update_open_question_answer( TextAreaObj.value)
        }

        //Creating a button at the end
        let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
        Button.onclick = function(){that.show_gender_question_screen(ScoreObject, datasubmissionfunc)}
        Container.appendChild(Button)
    }

    //Show the gender question
    this.show_gender_question_screen = function(ScoreObj, datasubmissionfunc){
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)
        SVGObjects.Instructions.Layer.style.display = "inherit"

        Container.appendChild(createInstructionTitleElem("What is your gender?"))

        //Creating a button at the end
        let Button_M = createSVGButtonElem(254 - 80 ,75,160,30,"Male")
        let Button_F = createSVGButtonElem(254 - 80 ,110,160,30,"Female")
        let Button_O = createSVGButtonElem(254 - 80 ,145,160,30,"Other")
        let Button_NA = createSVGButtonElem(254 - 80 ,180,160,30,"Prefer not to say")

        Button_M.onclick = function(){
            DataCont.update_gender_answer("M")
            that.show_age_question_screen(ScoreObj, datasubmissionfunc)
        }
        Button_F.onclick = function(){
            DataCont.update_gender_answer("F")
            that.show_age_question_screen(ScoreObj, datasubmissionfunc)
        }
        Button_O.onclick = function(){
            DataCont.update_gender_answer("O")
            that.show_age_question_screen(ScoreObj, datasubmissionfunc)
        }
        Button_NA.onclick = function(){
            DataCont.update_gender_answer("NA")
            that.show_age_question_screen(ScoreObj, datasubmissionfunc)
        }

        Container.appendChild(Button_M)
        Container.appendChild(Button_F)
        Container.appendChild(Button_O)
        Container.appendChild(Button_NA)


    }

    //Show the age question
    this.show_age_question_screen = function(ScoreObject, datasubmissionfunc){
        //Create the instructions page with the title and text
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)
        SVGObjects.Instructions.Layer.style.display = "inherit"

        Container.appendChild(createInstructionTitleElem("WHAT IS YOUR AGE?"))
        let Text = createTextField(30, 60, 508-2*30,100, "Please enter your age (in years) in the box below")
        Text.style.textAlign = "center"
        Text.style.fontSize = "20px"
        Container.appendChild(Text)


        let ForObj = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
        ForObj.setAttribute("x", 254-50)
        ForObj.setAttribute("y", 90)
        ForObj.setAttribute("width", 100)
        ForObj.setAttribute("height", 40)
        ForObj.style.padding = "10px"
        Container.appendChild(ForObj)
        /*
        let TextAreaObj = document.createElement('textarea');
        TextAreaObj.cols = 80;
        TextAreaObj.rows = 10;
        TextAreaObj.id = "age_question_area"
        TextAreaObj.classList.add("open_question_area")

        TextBoxContainer.appendChild(TextAreaObj)

         */
        let Input = document.createElement("input")
        Input.type = "number"
        Input.classList.add("open_question_area")
        Input.style.textAlign = "center"
        ForObj.appendChild(Input)


        //Creating a button at the end
        let Button = createSVGButtonElem(254 - 60 ,240,120,30,"Continue")

        Button.onclick = function(){
            DataCont.update_age_answer(Input.value)
            that.show_color_blindness_question_screen(ScoreObject, datasubmissionfunc)
        }

        Container.appendChild(Button)


    }

    this.show_color_blindness_question_screen = function(ScoreObject, datasubmissionfunc){
        //Create the instructions page with the title and text
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)
        SVGObjects.Instructions.Layer.style.display = "inherit"

        Container.appendChild(createInstructionTitleElem("ONE LAST QUESTION"))
        let Text = createTextField(30, 80, 508-2*30,100, "One last question: do you have any form of color-blindness?")
        Text.style.textAlign = "center"
        Text.style.fontSize = "20px"
        Container.appendChild(Text)

        //Creating a button at the end
        let Button_Yes = createSVGButtonElem((508-410)/2 ,200,120,30,"YES, I DO")
        let Button_No = createSVGButtonElem((508-410)/2 + 150,200,120,30,"NO, I DONT")
        let Button_IDK = createSVGButtonElem((508-410)/2 + 300,200,120,30,"Don't know")

        Button_Yes.onclick = function(){
            DataCont.update_color_blindness_answer("Y")
            that.show_submission_screen(ScoreObject, datasubmissionfunc)
        }
        Button_No.onclick = function(){
            DataCont.update_color_blindness_answer("N")
            that.show_submission_screen(ScoreObject, datasubmissionfunc)
        }
        Button_IDK.onclick = function(){
            DataCont.update_color_blindness_answer("IDK")
            that.show_submission_screen(ScoreObject, datasubmissionfunc)
        }

        Container.appendChild(Button_Yes)
        Container.appendChild(Button_No)
        Container.appendChild(Button_IDK)

    }

    //Shows the score screen with the download button
    this.show_score_screen = function(ScoreObject, datasubmissionFunc){
        showNewInstructionsPage()

        //Show the instructions layer and the welcome screen
        SVGObjects.Instructions.Layer.style.display = "inherit"
        //SVGObjects.Instructions.Layer.style.pointerEvents = "none"
        SVGObjects.Instructions.Pages.Finished.style.display = "inherit"

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Pages.Finished.appendChild(Container)
        Container.appendChild(createInstructionTitleElem("EXPERIMENT FINISHED"))

        //Fill the stars
        for(let i = 1; i<=5;i++){
            if(ScoreObject.star_rating >= i){
                document.getElementById("score_star_" + i + "x").classList.add("score_star_achieved")
            }
        }

        //Check if there were any bonus stars to be earned during this experiment
        let text

        if("num_bonus_stars" in ScoreObject){
            //Set the correct text
            text = "Congratulations! You are now an <b> Expert Wildlife Ranger! </b>During your practical experience, you interacted with " + ScoreObject.num_total_Fennimals + " different Fennimals. Of these Fennimals, " + ScoreObject.num_liked_item + " liked the item you gave them! <br>" +
                "<br>" +
                "Based on your performance, you earned the distinguished title of " + ScoreObject.star_rating + "-star Fennimal Expert! " +
                "" +
                "In addition, you earned " + ScoreObject.num_bonus_stars + " bonus stars for your performance on rating the familiarity of the Fennimals. In total you have earned " + (ScoreObject.star_rating + ScoreObject.num_bonus_stars) + " stars during this experiment. "

            //Fill the bonus stars
            for(let i = 1; i<=5;i++){
                if(ScoreObject.num_bonus_stars >= i){
                    document.getElementById("bonus_star_" + i + "x").classList.add("bonus_star_achieved")
                }
            }

        }else{
            text = "Congratulations! You are now an <b> Expert Wildlife Ranger! </b>During your practical experience, you interacted with " + ScoreObject.num_total_Fennimals + " different Fennimals. Of these Fennimals, " + ScoreObject.num_liked_item + " liked the item you gave them! <br>" +
                "<br>" +
                "Based on your performance, you earned the distinguished title of " + ScoreObject.star_rating + "-star Fennimal Expert! "
        }

        //Set the text to the screen
        Container.appendChild(createTextField(30, 50, 508-2*30,500, text))

        //Set the text at the bottom
        let BottomTextField = createTextField(30, 190, 508-2*30,500, "Before your time in Fenneland is over, on the next page we would like to ask you a question on how you made your decisions.")
        BottomTextField.style.textAlign = "center"
        // DownloadTextField.style.userSelect = "text"
        Container.appendChild(BottomTextField)

        //Creating a button at the end
        let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
        Button.onclick = function(){ that.show_open_question_screen(ScoreObject, datasubmissionFunc)}
        Container.appendChild(Button)
    }

    //Shows the final screen with the Token (if in Mturk) telling participants to hit the submit button
    this.show_submission_screen = function(ScoreObject, datasubmissionFunc){
        //Create the instructions page with the title and text
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVGObjects.Instructions.Layer.appendChild(Container)
        SVGObjects.Instructions.Layer.style.display = "inherit"

        Container.appendChild(createInstructionTitleElem("EXPERIMENT COMPLETED!"))


        switch(Param.ExperimentRecruitmentMethod){
            case("mturk"):
                let MturkTokenField = createTextField(30, 60, 508-2*30,200, "You have now completed the HIT. Please press [ESC] or [F11] in Windows or [Command]+[Cntrl]+[F] in Mac to leave full-screen mode. <br>" +
                    "<br>" +
                    "<b>DO NOT LEAVE THIS PAGE YET AND DO NOT CLICK THE BUTTON BELOW BEFORE SUBMITTING YOUR TOKEN TO MTURK!</b>. <br><br>" +
                    "You earned as a bonus of "+  Param.BonusEarnedPerStar.currency_symbol +  Param.BonusEarnedPerStar.bonus_per_star + " per star, resulting in o a total earnings of " + Param.BonusEarnedPerStar.currency_symbol +  ScoreObject.bonus + " <br><br> Your participation Token is <b><u>" + ScoreObject.token + "</b></u> . " +
                    "<br><br>" +
                    "Please go to the MTURK assignment page now and submit this Token. " +
                    "Then come back to this page and press the button below. <br><br><b> We can only pay you for your performance if you submitted both the Token AND submitted this page! </b>")
                Container.appendChild(MturkTokenField)
                break
            case("prolific"):
                let ProlificTokenField = createTextField(30, 60, 508-2*30,200, "You have now completed the experiment. Please press [ESC] or [F11] in Windows or [Command]+[Cntrl]+[F] in Mac to leave full-screen mode. <br> " +
                    "<br>" +
                    "<b>DO NOT LEAVE THIS PAGE YET AND DO NOT CLICK THE BUTTON BELOW BEFORE SUBMITTING YOUR COMPLETION CODE TO PROLIFIC!</b> <br>" +
                    "<br>" +
                    "You earned a "+  Param.BonusEarnedPerStar.currency_symbol +  Param.BonusEarnedPerStar.bonus_per_star + " per star, resulting in a bonus of " + Param.BonusEarnedPerStar.currency_symbol +  ScoreObject.earned_bonus + ". <br>" +
                    "<br>" +
                    "The completion code is <b><u>" + ScoreObject.token + "</b></u> . " +
                    "<br><br>" +
                    "Please go to the Prolific page now and submit this code. " +
                    "Then come back to this page and press the button below. <br><br><b> We can only pay you for your performance if you submitted both the code AND submitted this page! </b>")
                Container.appendChild(ProlificTokenField)
                break
            case(false):
                Container.appendChild(createTextField(30, 40, 508-2*30,30, "Congratulations! You are now an Expert Wildlife Ranger and your time in Fenneland has come to an end. "))
                let DownloadTextField = createTextField(30, 70, 508-2*30,100, "You have now completed the HIT. Please press [ESC] or [F11] in Windows or [Command]+[Cntrl]+[F] in Mac to leave full-screen mode. <i><b>DO NOT YET LEAVE THIS PAGE </b>. In order to finish the experiment and submit your data, please press the button below. </i>")
                DownloadTextField.style.textAlign = "center"
                Container.appendChild(DownloadTextField)
                break
        }

        let DownloadButton = createSVGButtonElem((508-190)/2,245,190,30,"FINISH EXPERIMENT")
        Container.appendChild(DownloadButton)

        DownloadButton.onclick = datasubmissionFunc
    }
}

//Create to animate the jeep moving home. Will animate in the mask, animate the
//TODO: set and refer to direction
TopLayerMaskController = function(_outputfunction, direction, text){
    function clearSVG(){
        //Remove any existing Fennimals on the screen
        document.getElementById("Fennimal_Container").innerHTML = ""

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
    //clearSVG()

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

CategoryPhaseController_Arena = function(ExpCont, CardStimData, LocCont, instructions_type){
    let that = this
    // General parameters
    let ArenaParam = {
        centerx: 254,
        centery: 142.875,
    }

    console.log(CardStimData)
    let CardStimArray = CardStimData.Stim

    //Keeping track of which instruction step is currently shown
    let current_instruction_step = 1

    //Some easy references to the main SVG layer objects
    let PhaseLayer = document.getElementById("Category_Layer")
    let ArenaLayer = document.getElementById("category_screen_layer")
    let InstructionsLayer

    if(instructions_type === "additional" || instructions_type === "stimulus_pilot_additional"){
        document.getElementById("category_instructions_first_time").style.display = "none"
        document.getElementById("category_instructions_additional").style.dislplay = "inherit"
        InstructionsLayer = document.getElementById("category_instructions_additional")
    }else{
        document.getElementById("category_instructions_additional").style.display = "none"
        document.getElementById("category_instructions_first_time").style.dislplay = "inherit"
        InstructionsLayer = document.getElementById("category_instructions_first_time")
    }

    if(instructions_type === "stimulus_pilot_first" || instructions_type === "stimulus_pilot_additional"){
        document.getElementById("cat_instr_top_stimpilot").style.display = "inherit"
        document.getElementById("cat_instr_top_normal").style.display = "none"
        document.getElementById("cat_instr_top_additional_normal").style.display = "none"
        document.getElementById("cat_instr_top_additional_stimpilot").style.display = "inherit"

        document.getElementById("cat_instr_title").childNodes[0].innerHTML = "Your task in this experiment"
        document.getElementById("cat_instr_title_additional").childNodes[0].innerHTML = "Sorting some more cards"
    }else{
        document.getElementById("cat_instr_top_stimpilot").style.display = "none"
        document.getElementById("cat_instr_top_normal").style.display = "inherit"
        document.getElementById("cat_instr_top_additional_normal").style.display = "inherit"
        document.getElementById("cat_instr_top_additional_stimpilot").style.display = "none"

    }

    // Arena functions
    let ArenaGroup = document.getElementById("similarity_arena")
    let AllCards = {}
    let CurrentSelectedCard = false

    let all_cards_have_been_touched = false
    let CompletionButton
    let ArenaStartTime

    // FUNCTIONS
    //Functions to start the instructions and to continue to the arena screen
    //Call to start the category matching phase.
    this.start_category_phase = function(){
        //Make sure that the correct layers are set to visible
        PhaseLayer.style.display = "inherit"
        ArenaLayer.style.display = "none"
        InstructionsLayer.style.display = "inherit"

        //Show the map as a background
        LocCont.show_passive_map()

        // Create the instructions button
        let Button = createSVGButtonElem((508-150)/2,255,160,25,"CONTINUE")
        InstructionsLayer.appendChild(Button)
        Button.onclick = go_to_next_instruction_step
    }
    function go_to_next_instruction_step(){
        if(instructions_type === "first" || instructions_type === "stimulus_pilot_first"){
            switch(current_instruction_step){
                case(1): {
                    document.getElementById("sim_instructions_groupA").style.opacity = 1
                    break
                }
                case(2):
                    document.getElementById("sim_instructions_groupA").style.opacity = 0.5
                    document.getElementById("sim_instructions_groupB").style.opacity = 1
                    break
                case(3):
                    document.getElementById("sim_instructions_groupB").style.opacity = 0.5
                    document.getElementById("sim_instructions_groupC").style.opacity = 1
                    break
                case(4):
                    document.getElementById("sim_instructions_groupC").style.opacity = 0.5
                    document.getElementById("sim_instructions_groupD").style.opacity = 1
                    break
                case(5):
                    document.getElementById("sim_instructions_groupD").style.opacity = 0.5
                    document.getElementById("sim_instructions_groupE").style.opacity = 1
                    break
                case(6):
                    document.getElementById("sim_instructions_groupE").style.opacity = 0.5
                    document.getElementById("sim_instructions_groupF").style.opacity = 1
                    break
                case(7):
                    instructions_completed()
                    break
            }

            current_instruction_step++
        }else{
            instructions_completed()
        }
    }

    function instructions_completed(){
        PhaseLayer.style.display = "inherit"
        ArenaLayer.style.display = "inherit"
        InstructionsLayer.style.display = "none"

        //Start the arena phase
        initialize_arena()
    }

    function initialize_arena(){
        //Adding all the cards
        for(let i=0; i<CardStimArray.length;i++){
            let Stim = CardStimArray[i]

            //Check if the card contains a head and body. If not, add as false
            if(! Object.hasOwn(Stim, "head") ){ Stim.head = false}
            if(! Object.hasOwn(Stim, "body") ){ Stim.body = false}

            let NewCard = new Card(Stim.ID, Stim.head, Stim.body, ArenaGroup, ArenaParam.centerx + 2*i - CardStimArray.length, ArenaParam.centery + 2*i - CardStimArray.length, that)
            AllCards[Stim.ID] = NewCard
        }

        //Appending the Arena to the main layer
        ArenaLayer.appendChild(ArenaGroup)

        //Setting all the event listeners
        ArenaGroup.onmouseup = function(event){
            if(CurrentSelectedCard !== false){
                let mouse_pos = getMousePosition(event)
                CurrentSelectedCard.dropped_on_new_location(mouse_pos.x,mouse_pos.y)
                CurrentSelectedCard = false
                reclear_all_cards()
            }
        }
        ArenaGroup.onmouseleave = function(event){
            if(CurrentSelectedCard !== false){
                return_all_cards_to_last_valid_location()

                //Reclear all cards
                reclear_all_cards()
            }
        }
        ArenaGroup.onmousemove = function(event){
            if(CurrentSelectedCard !==false ){
                //Get the correct mouse position in the SVG coordinates
                let mouse_pos = getMousePosition(event)
                CurrentSelectedCard.drag_card_to_new_location(mouse_pos.x,mouse_pos.y)
            }
        }

        //Recording the starting time
        ArenaStartTime = Date.now()
    }

    //Call when a new card has been selected
    this.new_card_selected = function(ID){
        //Make all cards transparant
        let CardIDs = Object.getOwnPropertyNames(AllCards)
        for(CardIDs in AllCards){
            AllCards[CardIDs].set_pointer_events_to_none()
        }
        CurrentSelectedCard = AllCards[ID]

        //Now check if all cards have been touched at least once. If yes, then show the completion button
        if(check_if_all_cards_touched()){
            create_completion_button()
        }

    }

    //Returns true if all cards have been touched at least once
    function check_if_all_cards_touched(){
        let CardIDs = Object.getOwnPropertyNames(AllCards)
        for(CardIDs in AllCards){
            if(AllCards[CardIDs].check_if_card_has_been_touched() === false){
                return false
            }
        }
        return true
    }

    //Creates the completion button and sets its events handler
    function create_completion_button(){
        CompletionButton = createSVGButtonElem(405,270,100,25,"Continue")
        ArenaGroup.appendChild(CompletionButton)

        //Show the text on the bottom of the arena
        document.getElementById("similarity_arena_bottom_text").style.opacity = 0.75
        document.getElementById("similarity_arena_bottom_text").style.fill = "darkred"
        CompletionButton.onclick = task_completed
    }

    //Call when the task has been completed (when the completion button has been pressed)
    function task_completed(){
        CompletionButton.style.display = "none"

        //Get the output
        let Output = JSON.parse(JSON.stringify(get_output_object()))

        //Delete all the cards
        let CardIDs = Object.getOwnPropertyNames(AllCards)
        for(CardIDs in AllCards){
            AllCards[CardIDs].remove_card()
        }

        //Tell the experiment controller that this part of the experiment is finished
        if(instructions_type === "first" || instructions_type === "stimulus_pilot_first"){
            ExpCont.first_similarity_task_completed(Output)
        }
        if(instructions_type === "additional" || instructions_type === "stimulus_pilot_additional"){
            ExpCont.additional_similarity_phase_finished(Output)
        }
    }

    //When called, returns with an object containing all the positions of the cards and total time spend
    function get_output_object(){
        let CardData = []
        let CardIDs = Object.getOwnPropertyNames(AllCards)
        for(CardIDs in AllCards){
            CardData.push(AllCards[CardIDs].get_card_data(true))
        }

        let Out = {
            time: Date.now() - ArenaStartTime,
            Data: CardData
        }
        return(JSON.parse(JSON.stringify(Out)))
    }

    function return_all_cards_to_last_valid_location(){
        let CardIDs = Object.getOwnPropertyNames(AllCards)
        for(CardIDs in AllCards){
            AllCards[CardIDs].return_card_to_last_valid_location()
        }
        CurrentSelectedCard = false
    }

    //Sometimes cards get stuck in a pointer-events = none position. Whenever a card is released, call this to re-clear all the cards
    function reclear_all_cards(){
        let CardIDs = Object.getOwnPropertyNames(AllCards)
        for(CardIDs in AllCards){
            AllCards[CardIDs].set_pointer_events_to_auto()
        }
    }

    //Creates a movable card. Input "false" for features not shown. Size of the card depends on the non-false features and the properties defined above
    Card = function(ID, Head, Body, ParentNode, start_center_x, start_center_y, Controller){
        //Keep track of whether the card has moved from its original location
        let card_has_been_touched = false

        //Find the correct dimensions for the card. This depends on its contents
        let card_type
        if(Head !== false){
            if(Body === false){
                card_type = "only_head"
            }else{
                card_type = "head_and_body"
            }
        }else{
            if(Body === false){
                card_type = "only_body"
            }else{
                card_type = "empty"
            }
        }
        let CardDims
        switch(card_type){
            case("only_head"):
                //Finding the correct card sizes for the heads. A few heads need slightly different proportions
                //dx and dy are small shims to translate the heads to the center of the card
                switch(Head){
                    case("A"): CardDims = {w:50,h:50, scale: 0.44, dx:0, dy: 2.75}; break // Kitty
                    case("B"): CardDims = {w:50,h:50, scale: 0.45, dx:0, dy: -3.5}; break // Leo
                    case("C"): CardDims = {w:50,h:50, scale: 0.39, dx:0, dy: -5}; break // Worker
                    case("D"): CardDims = {w:50,h:50, scale: 0.42, dx:0, dy: 1}; break // Buzzer
                    case("E"): CardDims = {w:50,h:50, scale: 0.38, dx:0, dy: -4}; break // Chirpie
                    case("F"): CardDims = {w:50,h:50, scale: 0.41, dx:0, dy: -4}; break // Hoot
                    case("G"): CardDims = {w:50,h:50, scale: 0.32, dx:0, dy: 0}; break // SHARK
                    case("H"): CardDims = {w:50,h:50, scale: 0.33, dx:0, dy: 0}; break // HAMMERHEAD
                    case("I"): CardDims = {w:50,h:50, scale: 0.41, dx:0, dy: 0}; break // Piggy
                    case("J"): CardDims = {w:50,h:50, scale: 0.45, dx:0, dy: 5}; break // BOAR
                    case("K"): CardDims = {w:50,h:50, scale: 0.43, dx:0, dy: -3}; break // SNAKE
                    case("L"): CardDims = {w:50,h:50, scale: 0.39, dx:0, dy: 0}; break // Slither
                    case("M"): CardDims = {w:50,h:50, scale: 0.47, dx:0, dy: 0}; break // RAT
                    case("N"): CardDims = {w:50,h:50, scale: 0.43, dx:0, dy: 4}; break // MOUSE

                    //case("E"): CardDims = {w:50,h:50, scale: 0.43, dx:0, dy: 1}; break // Moo
                    //case("F"): CardDims = {w:50,h:50, scale: 0.38, dx:0, dy: 2.5}; break // Fawn
                    //case("H"): CardDims = {w:50,h:50, scale: 0.48, dx:0, dy: -1}; break // Lizzy
                    //case("I"): CardDims = {w:50,h:50, scale: 0.39, dx:0, dy: -5}; break // Trunkie
                    //case("J"): CardDims = {w:50,h:50, scale: 0.45, dx:1, dy: 3}; break // Nosey
                    //case("K"): CardDims = {w:50,h:50, scale: 0.39, dx:0, dy: 2}; break // Hoppy
                    //case("L"): CardDims = {w:50,h:50, scale: 0.48, dx:2, dy: -2}; break // Nibbles
                    //case("O"): CardDims = {w:50,h:50, scale: 0.43, dx:0, dy: 6}; break // SNAIL



                    default: CardDims = {w:50,h:50, scale: 0.45, dx:0, dy: 0}; break
                }


        }

        //Create the container element
        let CardContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        CardContainer.style.cursor = "pointer"

        //Create the card background.
        let Background = document.createElementNS("http://www.w3.org/2000/svg", 'rect')
        Background.setAttribute("x", start_center_x - 0.5 * CardDims.w)
        Background.setAttribute("y", start_center_y - 0.5 * CardDims.h)
        Background.setAttribute("width", CardDims.w)
        Background.setAttribute("height", CardDims.h)
        Background.setAttribute("ry", 5)
        Background.classList.add("similarity_card_background")
        CardContainer.appendChild(Background)

        //Creating the card contents
        let CardContents
        if(card_type !== "empty"){
            switch(card_type){
                case("only_head"):
                    let scale = 0.4
                    CardContents = createFennimalHead(Head, CardDims.scale, start_center_x + CardDims.dx, start_center_y + CardDims.dy)
                    CardContainer.appendChild(CardContents)

                    break;
                case("only_body"):
                    console.warn("Body cards not yet supported")
                    break
                case("head_and_body"):
                    console.warn("Full Fennimal cards not yet supported")
                    break;
            }
        }

        //Add the DOM element to the container
        ParentNode.appendChild(CardContainer)

        //Movement interaction functions
        let LastLocation = {x: start_center_x, y: start_center_y}

        //Set an event listener for when the card is clicked on
        CardContainer.onmousedown = function(event){
            LastLocation = getViewBoxCenterPoint(CardContainer)
            card_has_been_touched = true

            move_card_to_top()
            Controller.new_card_selected(ID)
        }

        //INTERACTION FUNCTIONS
        //Call to move the card to the top of the stack by re-adding it to its parent node
        function move_card_to_top(){
            ParentNode.removeChild(CardContainer)
            ParentNode.appendChild(CardContainer)
        }

        //If the Card is dragged out of bounds, call this to reset it to its last known (valid) position
        this.return_card_to_last_valid_location = function(){
            MoveElemToCoords(CardContainer, LastLocation.x, LastLocation.y)
        }

        this.set_pointer_events_to_none = function(){
            CardContainer.style.pointerEvents = "none"
        }

        this.set_pointer_events_to_auto = function(){
            CardContainer.style.pointerEvents = "auto"
        }

        this.dropped_on_new_location = function(x,y){
            LastLocation = {x:x,y:y}
        }

        this.drag_card_to_new_location = function(x,y){
            MoveElemToCoords(CardContainer, x,y)
        }

        //Call to determine whether or not the card has been moved from its original location
        this.check_if_card_has_been_touched = function(){
            return(card_has_been_touched)
        }

        //Call to get an object containing the card id, its features and its x and y position
        this.get_card_data = function(standardize_coords){
            let out_x, out_y
            if(standardize_coords){
                let Box = document.getElementById("similarity_surface").getBBox()
                out_x = Math.round(LastLocation.x - Box.x)
                out_y = Math.round(LastLocation.y - Box.y)

            }else{
                out_x = LastLocation.x
                out_y = LastLocation.y
            }

            return({
                ID: ID,
                head: Head,
                //body: Body,
                x: out_x,
                y: out_y,
            })
        }

        //Removes the card from the arena
        this.remove_card = function(){
            ParentNode.removeChild(CardContainer)
        }

    }
    //Returns a Fennimal head SVG object.
    function createFennimalHead(head, scale, cx, cy){
        //Create a new group to hold the Fennimal
        let HeadContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')

        //Setting color schenme
        let ColorScheme = Param.GrayColorScheme

        //Copy and color the head
        let HeadObj = document.getElementById("head_" + head).cloneNode(true)
        HeadContainer.appendChild(HeadObj)
        HeadObj.style.display = "inherit"

        //Color the HEAD
        //Set primary color regions
        let Primary_regions = HeadObj.getElementsByClassName("Fennimal_primary_color")
        for(let i = 0; i< Primary_regions.length; i++){
            Primary_regions[i].style.fill = ColorScheme.primary_color
        }

        //Set secondary colors
        let Secondary_regions =  HeadObj.getElementsByClassName("Fennimal_secondary_color")
        for(let i = 0; i< Secondary_regions.length; i++){
            Secondary_regions[i].style.fill = ColorScheme.secondary_color
        }

        //Set tertiary colors
        let Tertiary_regions =  HeadObj.getElementsByClassName("Fennimal_tertiary_color")
        for(let i = 0; i< Tertiary_regions.length; i++){
            Tertiary_regions[i].style.fill = ColorScheme.tertiary_color
        }

        let Eye_regions =  HeadObj.getElementsByClassName("Fennimal_eye_color")
        for(let i = 0; i< Eye_regions.length; i++){
            Eye_regions[i].style.fill = ColorScheme.eye_color
        }

        //Create a group to move the center of the head to 0,0 (this is somewhat approximately and hacky, needs to be changed at some point in the future)
        let TranslateOriginContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        TranslateOriginContainer.appendChild(HeadContainer)
        TranslateOriginContainer.style.transform = "translate(-254px,-75px)"

        //Rescale the head in a new group
        let ScaleContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        ScaleContainer.appendChild(TranslateOriginContainer)
        ScaleContainer.style.transform = "scale(" + scale + ")"

        //Now we have a head with the right proportions centered on 0,0. All we have to do now is to translate this group (with yet another group) to the right coords.
        //Technically this could be done with the last group already, but this is easier to work with for me...
        let TranslateDestinationContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        TranslateDestinationContainer.appendChild(ScaleContainer)
        TranslateDestinationContainer.style.transform = "translate(" + cx + "px, " + Math.floor( cy ) + "px)"

        // Returns SVG layer
        return(TranslateDestinationContainer)
    }
}

// Manages all data that needs to be preserved. Call at the end of the experiment to download / store a JSON containing all subject-relevant data.
DataController = function(seed_number, Stimuli){
    let that = this
    //Always store data here as a deep copy!
    let Data = {
        experiment_type: Stimuli.get_experiment_code(),
        seed: seed_number,
        FirstSimTask: {}, //Outdated
        SimilarityTasks : [],
        Training_Templates : [],
        Binding_Templates: [],
        Selected_Pairs: [],
        AdditionalSimTask: {}, // Outdated
        Targeted_Search: [],
        Delivery: [],
        Quiz: [],
        Remedial: [],
        TestTrials: [],
    }
    let startTime = Date.now()

    //Create a Token / completion code here
    let cc_word_1 = shuffleArray(["Happy", "Bright", "Clean","Soft", "Funny", "Warm", "Sharp", "Small", "Kind", "Sweet", "Young", "White", "Tall"])[0]
    let cc_word_2 = shuffleArray(["Cat", "Rabbit", "Owl","Fox","Koala", "Frog", "Shark", "Zebra", "Bat", "Flower", "Panda", "Rose", "Poppy", "Lily", "Tulip"  ])[0]
    let completion_code = cc_word_1 + cc_word_2

    //If participants are recruited via prolific, then add some additional data
    if(Param.ExperimentRecruitmentMethod === "prolific"){
        let url_string = window.location;
        let url = new URL(url_string);
        Data.Prolific = {
            PID: url.searchParams.get("PROLIFIC_PID"),
            STID: url.searchParams.get("STUDY_ID"),
            SEID: url.searchParams.get("SESSION_ID"),
        }
        console.log(Data.Prolific)
    }

    //Register the moment consent was provided
    this.consent_provided = function(bool){
        if(bool){
            //Finding the current date and time
            let today = new Date();
            let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
            let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
            let dateTime = date+' '+time;

            console.log(dateTime)
            Data.consentProvided = dateTime
        }else{
            Data.consentProvided = false
            console.log("no consent")
        }
    }

    //Stores the results from a similarity task
    this.store_similarity_task_output = function(Output){
        console.log(Output)
        Data.SimilarityTasks.push(JSON.parse(JSON.stringify(Output)))
    }
    this.store_training_phase_templates = function(TemplatesArr){
        Data.Training_Templates = JSON.parse(JSON.stringify(TemplatesArr))
    }

    this.store_binding_phase_templates = function(TemplatesArr){
        Data.Binding_Templates = JSON.parse(JSON.stringify(TemplatesArr))
    }

    //Stores the features selected for both pairs
    this.store_selected_pairs = function(SelectedPairs){
        Data.Selected_Pairs = JSON.parse(JSON.stringify(SelectedPairs))
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
    this.store_targeted_search_trial = function(FennimalObj, Locations_Visited, hint_type){
        let NewObj = JSON.parse(JSON.stringify(FennimalObj))
        NewObj.Locations_Visited_During_Trial = JSON.parse(JSON.stringify(Locations_Visited))
        NewObj.number_of_locations_travelled = Locations_Visited.length
        NewObj.hint_type = hint_type

        Data.Targeted_Search.push(NewObj)
    }

    // DELIVERY PHASE DATA //
    /////////////////////////
    // Call when a delivery phase has finished
    this.store_delivery_trial = function(FennimalObj, Items_Brought, Locations_Visited, hint_type, delivery_round){
        let NewObj = JSON.parse(JSON.stringify(FennimalObj))
        NewObj.Locations_Visited_During_Trial = JSON.parse(JSON.stringify(Locations_Visited))
        NewObj.number_of_locations_travelled = Locations_Visited.length
        NewObj.Items_Brought_In_Backpack = JSON.parse(JSON.stringify(Items_Brought))
        NewObj.remedial_block = delivery_round
        NewObj.hint = hint_type

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

    // TEST PHASE //
    ////////////////
    this.store_test_trial = function(FennimalObj){
        Data.TestTrials.push(JSON.parse(JSON.stringify(FennimalObj)))
    }

    // CATEGORY PHASE
    //////////////////
    this.store_category_data = function(CategoryTrials){
        Data.CategoryPhase.push(JSON.parse(JSON.stringify(CategoryTrials)))
    }

    // CALL AT EXPERIMENT END TO STORE EXPERIMENT TIME.
    this.experiment_completed = function(){
        Data.experiment_time =  Date.now() - startTime
    }

    //Call after experiment is completed to return the subject's score. Also updates the completion code to include the star rating
    this.get_score = function(){
        //Calculating base stars (from the test trials)
        let total = 0, liked = 0
        for(let i =0;i<Data.TestTrials.length;i++){
            total++
            if(Data.TestTrials[i].correct_item_selected) {liked++;}
        }
        let percentage = liked / total

        let star_rating = 1
        if(percentage > .30){ star_rating = 2}
        if(percentage > .50){ star_rating = 3}
        if(percentage > .70){ star_rating = 4}
        if(percentage > .90){ star_rating = 5}

        //Calculating bonus start (from the category task)
        let total_category_trials, correct_categories, percentage_category, bonus

        //Calculating USD reward (if given)
        bonus =  ( (star_rating ) * Param.BonusEarnedPerStar.bonus_per_star).toFixed(2)

        //Updating the completion code
        completion_code = cc_word_1 + cc_word_2 + (star_rating )

        return({
            num_total_Fennimals: total,
            num_liked_item: liked,
            star_rating: star_rating,
            token: completion_code,
            earned_bonus: bonus
        })
    }

    //Call to record the open question answer
    let open_question_answer
    this.update_open_question_answer = function (text){
        open_question_answer = text
    }

    let colorblindness, age, gender
    this.update_color_blindness_answer = function(ans){
        colorblindness = ans
    }
    this.update_age_answer = function(ans){
        console.log(ans)
        age = ans
    }
    this.update_gender_answer = function(ans){
        gender = ans
    }

    // Call to the optimize the data, so that we don't have to send a huge amount of redundant data
    function optimize_data(){
        function reduce_location_name(long_name){
            switch(long_name){
                case("map"): return("map");
                case("start_North"): return("s_Nor");
                case("intersection_North"): return("i_Nor");
                case("location_Pineforest"): return("Pine");
                case("location_Iceberg"): return("Ice");

                case("start_Mountains"): return("s_Mnt");
                case("intersection_Mountains"): return("i_Mnt");
                case("location_Waterfall"): return("WFall");
                case("location_Mine"): return("Mine");

                case("start_Village"): return("s_Vil");
                case("intersection_Village"): return("i_Vil");
                case("location_Church"): return("Chur");
                case("location_Farm"): return("Farm");

                case("start_Swamp"): return("s_Swa");
                case("intersection_Swamp"): return("i_Swa");
                case("location_Cottage"): return("Cott");
                case("location_Marsh"): return("Mar");

                case("start_Desert"): return("s_Des");
                case("intersection_Desert"): return("i_Des");
                case("location_Cactus"): return("Cact");
                case("location_Oasis"): return("Oas");

                case("start_Beach"): return("s_Bea");
                case("intersection_Beach"): return("i_Bea");
                case("location_Beachbar"): return("BBar");
                case("location_Port"): return("Port");

                case("start_Jungle"): return("s_Jun");
                case("intersection_Jungle"): return("i_Jun");
                case("location_Bush"): return("Bush");
                case("location_Jungleforest"): return("Jfor");

                case("start_Flowerfields"): return("s_Flo");
                case("intersection_Flowerfields"): return("i_Flo");
                case("location_Windmill"): return("Wind");
                case("location_Garden"): return("Gard");
            }
        }

        // Instead of copying all the Fennimal properties for each trial, we can simply store the ID codes
        // Optimizing the Exploration phase
        // Here we only want to preserve the order in which Fennimals have been found and the location sequence (the location visitation order can be extracted from this later)
        let FennimalsFoundOrder = {}
        let NewLocationSequence = []

        if("Exploration_Phase" in Data){
            // Storing the order in which Fennimals have been found
            for(let key in Data.Exploration_Phase.Fennimals){
                if(Data.Exploration_Phase.Fennimals[key] !== false){
                    let FenObj = Data.Exploration_Phase.Fennimals[key]
                    FennimalsFoundOrder[FenObj.ID] = FenObj.order_found
                }
            }

            //Reducing the array size of the location sequence
            for(let i =0;i<Data.Exploration_Phase.Location_Sequence.length; i++){
                NewLocationSequence.push(reduce_location_name(Data.Exploration_Phase.Location_Sequence[i]))
            }

        }

        //Optimizing the Target Search phase
        let NewOptSearchData = []
        for(let i =0;i<Data.Targeted_Search.length;i++){
            let NewLocVisited = []
            for(let loc =0;loc < Data.Targeted_Search[i].Locations_Visited_During_Trial.length;loc++){
                NewLocVisited.push(reduce_location_name(Data.Targeted_Search[i].Locations_Visited_During_Trial[loc]))
            }

            NewOptSearchData.push({
                tnum: i+1,
                ID: Data.Targeted_Search[i].ID,
                locVis: NewLocVisited,
                numLoc: Data.Targeted_Search[i].number_of_locations_travelled.length
            })
        }

        //Optimizing the Delivery phase
        let NewDeliveryData = []
        for(let i =0; i<Data.Delivery.length;i++){
            let NewLocVisited = []
            for(let loc =0;loc < Data.Delivery[i].Locations_Visited_During_Trial.length;loc++){
                NewLocVisited.push(reduce_location_name(Data.Delivery[i].Locations_Visited_During_Trial[loc]))
            }
            NewDeliveryData.push({
                tnum: i+1,
                ID: Data.Delivery[i].ID,
                locVis: NewLocVisited,
                numLoc: Data.Delivery[i].number_of_locations_travelled,
                bpack: Data.Delivery[i].Items_Brought_In_Backpack,
                bpack_num: Data.Delivery[i].Items_Brought_In_Backpack.length,
                remed_block: Data.Delivery[i].remedial_block,
                hint: Data.Delivery[i].hint
            })
        }

        //Optimizing the Quiz data
        let NewQuizData =[]
        for(let i =0; i<Data.Quiz.length;i++){
            let QuizAttempt = []
            for(let trial =0;trial<Data.Quiz[i].length;trial++){
                QuizAttempt.push({
                    tnum: trial + 1,
                    ID: Data.Quiz[i][trial].ID,
                    correct_item: Data.Quiz[i][trial].item,
                    sel_item: Data.Quiz[i][trial].selected_item,
                    correct: Data.Quiz[i][trial].correct_answer,
                    rt: Data.Quiz[i][trial].reaction_time
                })
            }
            NewQuizData.push(QuizAttempt)
        }

        //Optimizing the TEST PHASE
        let OptTestData = []
        for(let i = 0; i<Data.TestTrials.length;i++){
            let TrialData = {
                type: Data.TestTrials[i].type,
                tnum: i + 1,
                ID: Data.TestTrials[i].ID,
                h: Data.TestTrials[i].head,
                b: Data.TestTrials[i].body,
                l: Param.AbbreviatedLocationNames[Data.TestTrials[i].location],
                rt: Data.TestTrials[i].reaction_time,
                avail: Data.TestTrials[i].items_available,
                select: Data.TestTrials[i].selected_item,
                dir: Data.TestTrials[i].item_direct,
                ind: Data.TestTrials[i].item_indirect,
                cor: Data.TestTrials[i].correct_item_selected,
                fb: Data.TestTrials[i].feedback,
            }
            if("max_decision_time" in Data.TestTrials[i]){
                TrialData.max_time = Data.TestTrials[i].max_decision_time
            }

            OptTestData.push(TrialData)
        }

        //Putting all the non-experiment-specific data together
        let ReturnData = {
            Exp: Data.experiment_type,
            Date: new Date().toDateString(),
            Exptime: Data.experiment_time,
            Seed: Data.seed,
            Token: completion_code,
            FirstSim: Data.FirstSimTask,
            TrainTemp: Stimuli.getTrainingSetFennimalsInArray(),
            BindTemp: Stimuli.getBindingTemplatesInArray(),
            Expl: {
                FoundOrdr: FennimalsFoundOrder,
                LocSeq: NewLocationSequence
            },
            TSearch: NewOptSearchData,
            Delivery: NewDeliveryData,
            Quiz: NewQuizData,
            Test: OptTestData,
            open: open_question_answer,
            age: age,
            gndr: gender,
            c_blind: colorblindness,
            cnsnt: Data.consentProvided,
        }

        if(Param.ExperimentRecruitmentMethod === "prolific"){ ReturnData.Prlfc = Data.Prolific}

        //Adding experiment-specific data
        let SimPoints_S2, Pairs
        switch(Data.experiment_type){
            case("exp1"):
                //Here participants completed two similarity tasks. Storing the second task here
                ReturnData.SecondSim = Data.AdditionalSimTask

                //Calculating the differences between pairs for the second task
                SimPoints_S2 = {}
                for(let i =0; i<Data.AdditionalSimTask.Data.length; i++){
                    SimPoints_S2[Data.AdditionalSimTask.Data[i].ID] = {x : Data.AdditionalSimTask.Data[i].x, y: Data.AdditionalSimTask.Data[i].y}
                }

                Pairs = Object.getOwnPropertyNames(Data.Selected_Pairs)
                for(let i =0;i< Pairs.length;i++){
                    if(Pairs[i] !== "C"){
                        //Finding Ids
                        let ID1 = Data.Selected_Pairs[Pairs[i]].IDs[0]
                        let ID2 = Data.Selected_Pairs[Pairs[i]].IDs[1]

                        //Finding points on the second task
                        let p1 = SimPoints_S2[ID1]
                        let p2 = SimPoints_S2[ID2]

                        //Calculating distance
                        let dist = EUDist(p1.x,p1.y, p2.x,p2.y)

                        //Adding to the Selected Pairs object
                        Data.Selected_Pairs[Pairs[i]].dist_t2 = Math.round( dist * 100)/100
                    }
                }

                //Storing in the return data
                ReturnData.Selected_Pairs = Data.Selected_Pairs
                break
            case("exp2"):
                //Participants also completed two similarity tasks.
                ReturnData.SecondSim = Data.AdditionalSimTask

                //This time, we need to calculate the T2 distance in the held-back heads.
                SimPoints_S2 = {}
                for(let i =0; i<Data.AdditionalSimTask.Data.length; i++){
                    SimPoints_S2[Data.AdditionalSimTask.Data[i].ID] = {x : Data.AdditionalSimTask.Data[i].x, y: Data.AdditionalSimTask.Data[i].y}
                }


                let point_control_held_backA = SimPoints_S2[Data.Selected_Pairs.Pair_Control.held_back[0]]
                let point_control_held_backB = SimPoints_S2[Data.Selected_Pairs.Pair_Control.held_back[1]]
                Data.Selected_Pairs.Pair_Control.dist_held_back_t2 = EUDist(point_control_held_backA.x, point_control_held_backA.y, point_control_held_backB.x, point_control_held_backB.y)

                let point_exp_held_backA = SimPoints_S2[Data.Selected_Pairs.Pair_Experimental.held_back[0]]
                let point_exp_held_backB = SimPoints_S2[Data.Selected_Pairs.Pair_Experimental.held_back[1]]
                Data.Selected_Pairs.Pair_Experimental.dist_held_back_t2 = EUDist(point_exp_held_backA.x, point_exp_held_backA.y, point_exp_held_backB.x, point_exp_held_backB.y)

                //Storing in the return data
                ReturnData.Selected_Pairs = Data.Selected_Pairs
        }
        return(ReturnData)
    }

    function optimize_data_stim_pilot(){
        let ReturnData = {
            Exp: "Stim pilot",
            Date: new Date().toDateString(),
            Exptime: Data.experiment_time,
            Seed: Data.seed,
            Sim: Data.SimilarityTasks
        }
        return(ReturnData)
    }

    //Call to submit the hidden form with the subject's data
    this.submitDataForm = function(){
        Data.experiment_time = Date.now() - startTime
        //Downloading hard copy
        // downloadObjectAsJson(Data, "data participant "+ participant_number + ".json")
        console.log(Data)

        //Populating the form
        if(Stimuli.is_stimulus_pilot){
            document.getElementById("data_form_field").innerHTML = JSON.stringify(optimize_data_stim_pilot())
            completion_code = "CPIYE0PO"
            alert("Your completion code is: " + completion_code + ". Please enter this code on Prolific now, and then press the button below to complete the experiment. PLEASE DO NOT CLOSE THIS WINDOW WITHOUT PRESSING THE BUTTON!")
            console.log(optimize_data_stim_pilot())
        }else{
            console.log(optimize_data())
            document.getElementById("data_form_field").innerHTML = JSON.stringify(optimize_data())

            //Give some feedback to the participant
            let alertmessage
            switch(Param.ExperimentRecruitmentMethod){
                case("mturk"):
                    alertmessage = "You are now submitting this page. After submitting you will not be able to go back. If you did not yet submit your token on MTURK, then please do so now! Your token is: " + completion_code
                    break
                case("prolific"):
                    alertmessage = "You are now submitting this page. After submitting you will not be able to go back. If you did not yet submit the completion code on Prolific, then please do so now! The completion code is: " + completion_code
                    break;
                case(false):
                    alertmessage = "Experiment completed, thanks for participating!"
                    break

            }
            alert(alertmessage)
        }

        //Store the completion code locally, for when the website reloads after submitting the form.
        localStorage.setItem("experiment_completion_code", completion_code )

        //Automatically submit
        document.getElementById("submitbutton").click()

    }
}

//Manages the top-level flow of the experiment
ExperimentController = function(Stimuli, DataController){
    //Check if we're doing a stimulus pilot, as this has a radically different experiment flow
    let that = this

    // At the start of the experiment, we first need to calibrate the Fennimal head similarities. Store the results of this calibration here.
    let StartingSimilarityResults

    //Keep track of which Fennimals are currently roaming free in Fenneland
    let FennimalsPresentOnMap = {}

    //Create a location controller
    let LocCont = new LocationController(this)

    //Create a controller to handle all the instructions
    let InstrCont = new InstructionsController(this,LocCont, DataController)

    //Create a controller to handle the HUD
    let HUDCont = new HUDController()

    //Keeping track of the FennimalController
    let FenCont = false
    let FlashCont = false

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
        let delay_time = 0
        if(current_phase_of_the_experiment === "training" && current_training_subphase === "exploration" ){
            if(LocationVisitationOrder[location_name] === false){
                let x = new ObjectiveAchievedController("NEW LOCATION FOUND!", Param.SubjectFacingLocationNames[location_name], false, true)
                delay_time = 3000
                number_of_locations_visited++
                LocCont.prevent_subject_from_leaving_location(true)

                //Prevent the subject from leaving until the animation has been completed
                //LocCont.prevent_subject_from_leaving_location(true)
                setTimeout(function(){
                    // If there is no Fennimal here, then the subject is free to leave. If there is, then the participant first has to interact with the Fennimal
                    LocCont.prevent_subject_from_leaving_location(false)
                    check_if_exploration_subphase_completed()
                },delay_time)
            }
        }

        if(current_phase_of_the_experiment === "training"){
            //Record the visitation of this location
            if(LocationVisitationOrder[location_name] === false){
                LocationVisitationOrder[location_name] = [location_visitation_counter]
            }else{
                LocationVisitationOrder[location_name].push(location_visitation_counter)
            }
        }

        // Now check whether there is a Fennimal present in this region.
        if(FennimalsPresentOnMap[location_name] !== false){
            if("order_found" in FennimalsPresentOnMap[location_name]){
                //Fennimal has been found: show the feedback
                FenCont = new CompletedFennimalController(FennimalsPresentOnMap[location_name], LocCont)

            }else{
                //Fennimal has not been found yet. Show after a brief delay if this is the first visit to the locaiton
                setTimeout(function(){
                    //Check if a spotlight search needs to be done first
                    if(current_phase_of_the_experiment === "training" && current_training_subphase === "exploration"){
                        console.log("Creating spotlight")
                        FlashCont= new Flashlight_Controller(FennimalsPresentOnMap[location_name] , LocCont, that)
                    }else{
                        //No spotlight search needed, go straight to Fennimal
                        that.FennimalFound(FennimalsPresentOnMap[location_name] )
                    }
                }, delay_time)

                //FlashCont = new Flashlight_Controller(FennimalsPresentOnMap[location_name],LocCont, this)
            }
        }else{
            // No Fennimal here, but show the Flashlight to the participant anyway
            //FlashCont = new Flashlight_Controller(FennimalsPresentOnMap[location_name],LocCont, this)
        }
    }

    //Call when a terminal location is left. This deletes the FennimalController
    this.location_left = function(){
        if(FenCont !== false){
            FenCont.interactionAborted()
            FenCont = false
        }

        if(FlashCont !== false){
            FlashCont.leaving_area()
            FlashCont= false
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
                    HUDCont.update_HUD_exploration(number_of_locations_visited, 16, Fennimal_found_number, Stimuli.getTrainingSetFennimalsInArray().length)
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
                case("targeted_search"): HUDCont.changeHUD(false); break;
            }

        }
    }

    //Call when a Fennimal has been found at a location.
    this.FennimalFound = function(FennimalObj){
        //Determining which items are invisible, which are unavailalbe and which are available.
        let ItemAvailability = {}
        LocCont.prevent_subject_from_leaving_location(true)

        if(current_phase_of_the_experiment === "training"){
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

        if(current_phase_of_the_experiment === "test"){
            for(let i=0;i<Stimuli.getItemDetails().All_Items.length; i++){
                let item = Stimuli.getItemDetails().All_Items[i]
                if(FennimalObj.items_available.includes(item)){
                    ItemAvailability[item] = "available"
                }else{
                    ItemAvailability[item] = "unavailable"
                }

            }
            FenCont = new TestPhaseFennimalController(FennimalObj,Stimuli.getItemDetails(), LocCont,that, false, false)
        }
    }

    //Call when the Fennimal interaction has been completed. Assumes that the FennimalObject now contains a property for "item_selected"
    this.FennimalInteractionCompleted = function(FennimalObj){
        //Next steps depend on the phase of the experiment
        switch (current_training_subphase){
            case("exploration"): exploration_subphase_Fennimal_completed(FennimalObj); break
            case("targeted_search"): targeted_search_subphase_Fennimal_completed(CurrentSearchTrial); break
            case("delivery"):
                delivery_subphase_Fennimal_completed(CurrentDeliveryTrial);
                LocCont.prevent_subject_from_leaving_location(true)
                break
            case("quiz"):
                if(!FennimalObj.correct_answer) {number_of_quiz_errors++}
                start_next_quiz_trial()
                break
        }

    }

    //Call when the Go Home button is pressed. This re-shows the instructions to the subject again, with the exact screen depending on the state of the experiment
    this.home_button_pressed = function(){
        HUDCont.changeHUD(false)
        if(current_phase_of_the_experiment === "training"){
            switch(current_training_subphase){
                case("exploration"):
                    InstrCont.showExplorationInstructions(LocationVisitationOrder,FennimalsPresentOnMap, Stimuli.getTrainingSetFennimalsInArray())
                    break;
                case("targeted_search"):
                    InstrCont.showSearchInstructions(CurrentSearchTrial.Fennimal, CurrentSearchTrial.hint_type)
                    break;
                case("delivery"):
                    InstrCont.showDeliveryInstructions(CurrentDeliveryTrial.Fennimal, CurrentDeliveryTrial.hint_type, Stimuli.getItemDetails())
                    break
            }
        }
        if(current_phase_of_the_experiment === "test"){
            InstrCont.show_test_phase_target_screen(CurrentTestTrial, CurrentBlockData.type, CurrentBlockData.hint_type)

        }
    }

    // INSTRUCTION FUNCTIONS //
    //Call to show the first set of instructions

    //On start, check if there exists an "experiment_completion_code" in the windowStorage.
    this.startExperiment = function(){
        //If there is no exp completion code, then start the experiment.
        //If there is an exp completion code, then the experiment has already been completed and we just show this code to the subject.

        if(localStorage.getItem("experiment_completion_code") === null){
            //Start the experiment
            if(Stimuli.is_stimulus_pilot){
                this.start_first_similarity_task()

            }else{
                this.showConsentScreen()
            }
        }else{
            InstrCont.show_completion_code_reloaded_screen(localStorage.getItem("experiment_completion_code"))
        }
    }

    this.showConsentScreen = function(){
        InstrCont.show_consent_screen()
    }
    this.showStartScreen = function(){
        InstrCont.gotoStartScreen()
    }

    this.start_screen_completed = function(){
        show_starting_instructions()
    }

    //Starts the first similarity task. We can only calibrate the stimuli afterwards.
    this.start_first_similarity_task = function(){
        let CatCont
        if(Stimuli.is_stimulus_pilot){
            CatCont = new CategoryPhaseController_Arena(that, Stimuli.getNextStimulusHeads(), LocCont, "stimulus_pilot_first")
        }else{
            CatCont = new CategoryPhaseController_Arena(that, Stimuli.get_stim_for_first_sim_task(), LocCont, "first")
        }

        CatCont.start_category_phase();
    }
    //Call when the first similarity task has been completed. We can then pass the outcomes of the first sim task to the stimuli object to set all the Fennimals.
    this.first_similarity_task_completed = function(StimTaskOutput){
        StartingSimilarityResults = JSON.parse(JSON.stringify(StimTaskOutput))

        //Log these results to the Data Controller
        DataController.store_similarity_task_output(StartingSimilarityResults)

        if(Stimuli.is_stimulus_pilot){
            if(Stimuli.get_number_of_stim_sets() === 0){
                experiment_complete()
            }else{
                start_second_category_phase()
            }
        }else{
            //Tell the Stimuli object to generate the Fennimals for the rest of the experiment
            Stimuli.create_Fennimals_from_sim_task_results(StimTaskOutput)

            //Store the Training stimuli
            DataController.store_training_phase_templates(Stimuli.getTrainingTemplates())
            DataController.store_binding_phase_templates(Stimuli.getBindingTemplates())
            DataController.store_selected_pairs(Stimuli.getFeaturesSampledAfterFirstSimilarityTask())

            //Continue to the starting instructions
            show_starting_instructions()
        }

        //Testing
        //this.start_test_phase()
    }

    function show_starting_instructions(){
        InstrCont.gotoWelcomeScreen()
    }
    //Call when the initial instructions have been read.
    this.starting_instructions_finished = function(){
        //Go to the exploration phase
        start_exploration_subphase()
    }
    //Shows the GOING HOME black screen
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

    // EXPLORATION SUBPHASE //
    //Starts the exploration subphase. Here the map is populated with all training set Fennimals, and the participant has to find all Fennimals and visit all locations at least once.
    //  No jumping back to home at any point.
    let Exploration_Phase_Location_Visited_Sequence
    function start_exploration_subphase(){
        if(current_training_subphase !== "exploration"){
            current_training_subphase = "exploration"
            Exploration_Phase_Location_Visited_Sequence = []

            //Resettting trackers and counters
            Fennimal_found_number = 0
            location_visitation_counter = 1
            number_of_locations_visited = 0
            resetVisitionOrderObj()

            //Populating the world with Fennimals
            FennimalsPresentOnMap = Stimuli.getTrainingSetFennimalsKeyedOnLocation()
        }

        //Show the exploration phase instructions screen
        InstrCont.showExplorationInstructions(LocationVisitationOrder,FennimalsPresentOnMap, Stimuli.getTrainingSetFennimalsInArray())

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
        LocCont.prevent_subject_from_leaving_location(true)

        setTimeout(function(){
            let x = new ObjectiveAchievedController("NEW FENNIMAL FOUND!", FennimalObj.name, false, false)

            //Prevent the subject from leaving until the animation has been completed

            setTimeout(function(){
                LocCont.prevent_subject_from_leaving_location(false)
                check_if_exploration_subphase_completed()
            },3000)

        },2500)

    }
    //Call to check if the exploration subphase has been completed
    function check_if_exploration_subphase_completed(){
        if(number_of_locations_visited === Param.location_Names.length && Fennimal_found_number === Stimuli.getTrainingSetFennimalsInArray().length){
            LocCont.prevent_subject_from_leaving_location(true)
            setTimeout(function(){
                exploration_subphase_completed()
            },2000)
        }
    }
    //Call when the exploration subphase has been completed. That is, when all locations and all Fennimals have been found
    function exploration_subphase_completed(){
        //Storing data
        DataController.store_exploration_phase_data(FennimalsPresentOnMap,LocationVisitationOrder, Exploration_Phase_Location_Visited_Sequence)

        //Cancelling all hints from this point on
        IngameHintsGiven.location_arrow_first_click = true
        IngameHintsGiven.map_first_travel = true
        IngameHintsGiven.flashlight_first_use = true

        //Changing the HUD
        HUDCont.changeHUD(false)

        //Show a screen indicating that the exploration subphase is completed
        MaskCont = new TopLayerMaskController(that.go_to_exploration_completed_page, "none", "Exploration complete!")

    }
    this.go_to_exploration_completed_page = function(){
        HUDCont.changeHUD(false)
        InstrCont.showExplorationCompletedPage(that.start_targeted_search_subphase)
    }

    // TARGETED SEARCH SUBPHASE //
    //Starts the targeted_search subphase. In the home screen, the participant is given an outline and a hint (tied to location) and has to go out to this location to interact with the Fennimal.
    //  After the item is given to this Fennimal, then jump back to the home screen (no need to walk all the way back).
    // Starts with the first Fennimal already populated
    let ArrayOfFennimalsToBeFound, CurrentSearchTrial, Search_Trial_Locations_Visited
    this.start_targeted_search_subphase = function(){
        //Reset the state of the world
        clearFennimalsFromMap()
        HUDCont.changeHUD(false)

        //Close any open Fennimal interactions
        that.location_left()

        if(current_training_subphase !== "targeted_search"){
            current_training_subphase = "targeted_search"

            //Reset the state of the world
            clearFennimalsFromMap()

            //Keep an array with all the Fennimals that need to be found during this subphase. First show all training Fennimals by their icon (random order), then all with their name (random order again)
            ArrayOfFennimalsToBeFound = []

            let RandomOrderedStimuli = shuffleArray(JSON.parse(JSON.stringify(Stimuli.getTrainingSetFennimalsInArray())))
            for(let i = 0; i<RandomOrderedStimuli.length; i++){
                ArrayOfFennimalsToBeFound = ArrayOfFennimalsToBeFound.concat([{Fennimal: RandomOrderedStimuli[i], hint_type: "icon"}])
            }

            RandomOrderedStimuli = shuffleArray(JSON.parse(JSON.stringify(Stimuli.getTrainingSetFennimalsInArray())))
            for(let i = 0; i<RandomOrderedStimuli.length; i++){
                ArrayOfFennimalsToBeFound = ArrayOfFennimalsToBeFound.concat([{Fennimal: RandomOrderedStimuli[i], hint_type: "name"}])
            }
        }
        //Start the first search trial
        that.start_next_search_round()
    }
    //Call to start the next round in the search phase
    this.start_next_search_round = function(){
        //Pop the top element from Array of Fennimals to be found. If there are none, then this part of the training phase is completed
        if(ArrayOfFennimalsToBeFound.length > 0){
            CurrentSearchTrial = ArrayOfFennimalsToBeFound.splice(0,1)[0]

            //Reset the visitation order
            resetVisitionOrderObj()

            //Populate the world with this Fennimal
            FennimalsPresentOnMap[CurrentSearchTrial.Fennimal.location] = CurrentSearchTrial.Fennimal

            //Show the instructions screen.
            InstrCont.showSearchInstructions(CurrentSearchTrial.Fennimal, CurrentSearchTrial.hint_type)

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
    function targeted_search_subphase_Fennimal_completed(SearchTrial){
        //Update the Fennimal in the world state
        SearchTrial.Fennimal.order_found = true
        FennimalsPresentOnMap[SearchTrial.Fennimal.location] = SearchTrial.Fennimal

        //Store the data
        DataController.store_targeted_search_trial(SearchTrial.Fennimal,Search_Trial_Locations_Visited, SearchTrial.hint_type)

        //Allow the participant to jump back to the home screen
        LocCont.prevent_subject_from_leaving_location(true)
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
    let current_item_in_inventory, ArrayOfFennimalsToBeDelivered,CurrentDeliveryTrial, Items_Taken_In_Backpack_During_Trial, Delivery_Locations_Visited
    //This counter will be zero for the first delivery round. Any higher numbers indicate a remedial round after failing a quiz
    let current_delivery_round =0
    //Call to start the delivery subphase
    this.start_delivery_subphase = function(){
        if(current_training_subphase !== "delivery"){
            current_training_subphase = "delivery"
            Items_Taken_In_Backpack_During_Trial = []
            Delivery_Locations_Visited = []

            //Reset the state of the world
            clearFennimalsFromMap()

            //Keep an array with all the Fennimals that need to be found during this subphase. This starts with all training phase Fennimals (in random order), and then destructively pops Fennimals one-by-one. As with search, we do one set with an icon, and one set with a hint
            ArrayOfFennimalsToBeDelivered = []
            let RandomOrderedStimuli

            if(current_delivery_round === 0){
                RandomOrderedStimuli = shuffleArray(JSON.parse(JSON.stringify(Stimuli.getTrainingSetFennimalsInArray())))
                for(let i = 0; i<RandomOrderedStimuli.length; i++){
                    ArrayOfFennimalsToBeDelivered = ArrayOfFennimalsToBeDelivered.concat([{Fennimal: RandomOrderedStimuli[i], hint_type: "icon"}])
                }
            }

            RandomOrderedStimuli = shuffleArray(JSON.parse(JSON.stringify(Stimuli.getTrainingSetFennimalsInArray())))
            for(let i = 0; i<RandomOrderedStimuli.length; i++){
                ArrayOfFennimalsToBeDelivered = ArrayOfFennimalsToBeDelivered.concat([{Fennimal: RandomOrderedStimuli[i], hint_type: "location"}])
            }
        }
        //Start the first search trial
        that.start_next_delivery_round()
    }
    this.start_next_delivery_round = function(){
        //Pop the top element from Array of Fennimals to be found. If there are none, then this part of the training phase is completed
        if(ArrayOfFennimalsToBeDelivered.length > 0){
            CurrentDeliveryTrial = ArrayOfFennimalsToBeDelivered.splice(0,1)[0]

            //Reset the visitation order
            resetVisitionOrderObj()

            //Add or reset this Fennimal in the world
            FennimalsPresentOnMap[CurrentDeliveryTrial.Fennimal.location] = CurrentDeliveryTrial.Fennimal

            //Show the instructions screen.
            InstrCont.showDeliveryInstructions(CurrentDeliveryTrial.Fennimal, CurrentDeliveryTrial.hint_type, Stimuli.getItemDetails())

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
    function delivery_subphase_Fennimal_completed(DeliveryTrial){
        DataController.store_delivery_trial(DeliveryTrial.Fennimal,Items_Taken_In_Backpack_During_Trial,Delivery_Locations_Visited, DeliveryTrial.hint_type, current_delivery_round)

        //Update the Fennimal in the world state
        DeliveryTrial.Fennimal.order_found = true
        FennimalsPresentOnMap[DeliveryTrial.location] = DeliveryTrial

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

        //Check if we need to store a previous quiz trial and update the number of errors
        if(CurrentQuizTrial !== false){
            DataController.store_quiz_trial(CurrentQuizTrial)
        }


        //Check if there are more trials to be done. If yes, then show the next trial. If not, then the quiz has been completed
        if(QuizTrials.length > 0){
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
        //If the subject made any errors during the quiz, then show a round of remedial delivery trials (this automatically starts a new quiz afterwards). If not, then the training phase has been completed!
        if(number_of_quiz_errors > 0){
            quizFailed()
        }else{

            new ObjectiveAchievedController("EXAM PASSED!", "Congratulations!", true, true)
            setTimeout(function (){that.start_test_phase()},2500)
        }
    }
    function quizFailed(){
        current_delivery_round++
        InstrCont.showQuizFailedPage(that.start_delivery_subphase)
    }

    // INFERENCE PHASE //
    ////////////////
    let AllTestTrails, CurrentTestTrial,  CurrentBlockData, CurrentBlockTrials, total_number_of_blocks
    this.start_test_phase = function(){
        //Load in all the test trial data. This is stored as an array with each element containing a block of trials
        AllTestTrails = Stimuli.getTestPhaseData()
        total_number_of_blocks = JSON.parse(JSON.stringify(AllTestTrails.length))

        //Show the quiz completed screen. After the continue button is pressed on this screen, start the first block of trials
        InstrCont.showQuizPassedInstructions(start_next_test_phase_block)

        current_phase_of_the_experiment = "test"
    }
    function start_next_test_phase_block(){
        //Splice the next block of trials
        if(AllTestTrails.length >= 1){
            CurrentBlockData = AllTestTrails.splice(0,1)[0]

            //Figure out what to do next. The "normal days" (everything but the category task) is controlled by this object.
            //  For the category task, create a subcontroller to handle all the interactions.
            switch(CurrentBlockData.type){
                case("direct"):
                    CurrentBlockTrials = CurrentBlockData.Trials
                    InstrCont.show_test_phase_instructions_direct_block(CurrentBlockData.number, total_number_of_blocks,function(){that.start_next_test_trial()})
                    break
                case("indirect"):
                    CurrentBlockTrials = CurrentBlockData.Trials
                    InstrCont.show_test_phase_instructions_indirect_block(CurrentBlockData.number, total_number_of_blocks,function(){that.start_next_test_trial()})
                    break
                case("repeat_training"):
                    CurrentBlockTrials = CurrentBlockData.Trials
                    InstrCont.show_test_phase_instructions_repeat_block(CurrentBlockData.number, total_number_of_blocks,function(){that.start_next_test_trial()})
                    break
                case("additional_similarity"):
                    InstrCont.clearInstructionPage()
                    start_second_category_phase()
                    break
                case("final_block"):
                    CurrentBlockTrials = CurrentBlockData.Trials
                    InstrCont.show_test_phase_instructions_final_block(CurrentBlockData.number, total_number_of_blocks, function(){that.start_next_test_trial()})
                    break
            }

        }else{
            //Test phase completed
            experiment_complete()
        }
    }
    function test_phase_day_completed(){
        if(CurrentBlockData.number < total_number_of_blocks){
            new ObjectiveAchievedController("Day completed!", "", true, true)
            setTimeout(function (){start_next_test_phase_block()},2000)
        }else{
            start_next_test_phase_block()
        }
    }

    this.start_next_test_trial=function(){
        //Check if there are more test trials to be done. If yes, show the starting animation and then load the next Test trial.
        //If not, then the experiment has been completed.
        if(CurrentBlockTrials.length > 0){
            CurrentTestTrial = CurrentBlockTrials.splice(0,1)[0]

            //Copy the block data to the trial
            CurrentTestTrial.type = CurrentBlockData.type

            show_next_test_trial_Fennimal()
        }else{
            test_phase_day_completed()
        }
    }
    this.test_target_instruction_page_closed = function(){
        //Reset the map, and we're good to go.
        LocCont.reset_map()
    }

    function show_next_test_trial_Fennimal(){
        //Reset the state of the world
        clearFennimalsFromMap()
        HUDCont.changeHUD(false)

        //Close any open Fennimal interactions
        that.location_left()

        //In case of the final block, we need to teleport directly to the next Fennimal. Otherwise, show instructions and go to the map
        if(CurrentBlockData.type === "final_block"){
            //Start the trial
            FenCont = new TestPhaseFennimalController(CurrentTestTrial,Stimuli.getItemDetails(), LocCont,that, CurrentTestTrial.max_decision_time, true)

        }else{
            //Populate the world with this Fennimal
            FennimalsPresentOnMap[CurrentTestTrial.location] = CurrentTestTrial

            //Show the instructions screen.
            InstrCont.show_test_phase_target_screen(CurrentTestTrial, CurrentBlockData.type, CurrentBlockData.hint_type)

            //Keep track of which locations are visited
            Search_Trial_Locations_Visited = []

            //Create a new FennimalController


            //Show the correct Fennimal. Note that here we use a specialized FennimalController, which skips the flashlight and the intro animation.
            //FenCont = new TestPhaseFennimalController(CurrentTestTrial,Stimuli.getItemDetails(), LocCont, that)
        }


    }
    this.test_trial_completed = function(FennimalObj){
        //Store data
        DataController.store_test_trial(FennimalObj)

        //Start next test trial
        this.start_next_test_trial()
    }

    //CATEGORY PHASE
    function start_second_category_phase(){
        //Here the controller handles all the interactions
        let CatCont
        if(Stimuli.is_stimulus_pilot){
            CatCont = new CategoryPhaseController_Arena(that, Stimuli.getNextStimulusHeads(), LocCont, "stimulus_pilot_additional")
        }else{
            CatCont = CatCont = new CategoryPhaseController_Arena(that, Stimuli.get_stim_for_second_sim_task(), LocCont, "additional")
        }

        CatCont.start_category_phase();
    }
    this.additional_similarity_phase_finished = function(sim_data){

        //Log these results to the Data Controller
        DataController.store_similarity_task_output(sim_data)

        if(Stimuli.is_stimulus_pilot){
            if(Stimuli.get_number_of_stim_sets() === 0){
                experiment_complete()
            }else{
                start_second_category_phase()
            }
        }else{
            //Start the next block
            start_next_test_phase_block()
        }

    }

    function experiment_complete(){
        console.log("EXPERIMENT COMPLETED")

        if(Stimuli.is_stimulus_pilot){
            DataCont.submitDataForm()
        }else{
            DataCont.experiment_completed()
            InstrCont.show_score_screen(DataCont.get_score(), DataCont.submitDataForm)
        }
    }

}

//Instructions shown to the participant
let Instructions = {
    Training_Phase: {
        Exploration: {
            title: "EXPLORING THE ISLAND",
            text_top: "Hello Trainee, and welcome to your training. To get you started, let's first explore the island. " +
                "There are 16 locations for you to discover. " +
                "While you're out there, there are a number of Fennimals you need to be introduced to. " +
                "Please find and interact with all of the Fennimals on the list below. You can visit all locations and Fennimals in any order.",
            text_bottom: "Click the continue button to start your training in Fenneland. You can always return to this screen by moving back to the center of the map through pressing on the Home (H) icon. "
        },
        Exploration_Completed: {
            title: "EXPLORATION COMPLETE",
            text_top: "Congratulations, you have completed your first expedition across Fenneland! You have found all 16 locations and have interacted with 6 of the local Fennimals. ",
            text_bottom: "Click the continue button to continue with the next phase of your training. "
        },
        Search: {
            title: "FIND THAT FENNIMAL",
            text: "Well done! Now you have a feeling for the island and its inhabitants. " +
                "For the next part of your training, you will learn to find different Fennimals all over the island. I'll give you a hint below. Please find this Fennimal and give it the toy it likes! "
        },
        Delivery: {
            title: "DELIVER TOYS TO THE FENNIMALS",
            text: "You're starting to get a feeling for the Fennimals that live in Fenneland. Let's kick it up a notch. As before, I will give you a hint below. However, now we will make things a bit more difficult: you will have to decide which item to bring with you. Your backpack only fits one item, so pick wisely! If you pick the wrong item, you can come back to Home to pick an different one. You can select which item to bring by clicking on the icon on the right.  "
        },
        Quiz_Start_First: {
            title: "THE EXAM TO BECOME A NOVICE",
            text: "Well done, Trainee! You are now ready to take the exam to become a <b> Novice </b> wildlife ranger. <br>" +
                "During this exam you will be driven around the island to meet all the Fennimals you have encountered thus far. " +
                "Your job is to give each Fennimal the toy that it previously liked. <br>" +
                "<br>" +
                "You pass the exam if you select all the correct toys. <br>" +
                "However, if you make any mistakes during the exam then you will visit all the Fennimals one more time before you can take another shot at the exam. " +
                "Don't worry if that happens, you can try the exam as many times as needed. <br><br>" +
                "Click on the button below to start the exam. "
        },
        Quiz_Start_Second: {
            title: "TAKING THE EXAM AGAIN",
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
        Quiz_Failed:{
            title: "LET'S GO OVER THE FENNIMALS AGAIN",
            text: "Unfortunately, you made at least one mistake during the exam. No problem! <br><br> " +
                "Let's review all the Fennimals one more time. As before, I will give you an outline of a Fennimal and a hint. Pack the correct toy in your backpack an deliver it to this Fennimal. After you've revisited all the Fennimals you have previously encountered, you can take the exam again! \n"
        },

    },
    Test_Phase :{
        Quiz_Passed: {
            title: "BECOMING AN EXPERT",
            textTop: "Congratulations! You have passed the exam and you're now a Novice Wildlife Ranger! All that stands " +
                "between you and the title of 'Expert Wildlife Ranger' are several days of practical experience in Fenneland. " +
                "During these days you will be sent across the island to interact with various Fennimals, " +
                "where you can apply your previously learned knowledge to select toys for these Fennimals. <br> <br>" +
                "There will <u> not </u> be another exam at the end of the experiment. " +
                "After you complete your practical experience you will automatically receive the title of Expert. " +
                "In addition, you will recieve between 0 and 5 stars based on how well the Fennimals liked their interactions with you during this practical experience. " ,
            textBottom: "Unfortunately, there is a small problem: there is a tear in your bag, and sometimes some toys may fall out. If this happens, then you will have to make do with whatever toys are available."
        },
        Direct: {
            title: "NEW FENNIMALS HAVE BEEN SPOTTED!",
            text: "<br><br> A new group of Fennimals has recently started to appear on the island. This is a good time to build a connection with them! <br>" +
                "<br>" +
                "While you have not encountered these new Fennimals before, <u> you can apply your previously learned knowledge </u> to select a fitting toy for these Fennimals. <br>" +
                "<br>" +
                "Some toys occasionally drop out of your bag as you make your way across the island. You will have to make do with whatever toys are available.<br>" +
                "<br>" +
                "<i>There is no time limit on your decision - you can take as long as you like. After you have selected an item, the Fennimal will either approve of the toy or reject it. </i>"
        },
        Indirect: {
            title: "NEW FENNIMALS HAVE BEEN SPOTTED!",
            text: "<br><br> A new group of Fennimals recently started to appear on the island. <br>" +
                "<br>" +
                "It seems that this group is a little bit shy though. " +
                "After you give them a toy, the Fennimals will return to their homes and inspect the toys there. <u>You won't learn whether or not they liked the toys you gave them until the end of this experiment. </u>  <br>" +
                "<br>" +
                "<u> You can apply your previously learned knowledge to select a fitting toy for these Fennimals.</u> <br>" +
                "<br>" +
                "Some toys occasionally drop out of your bag as you make your way across the island. You will have to make do with whatever toys are available.<br>" +
                "<br>" +
                "<i>There is no time limit on your decision - you can take as long as you like. After you have selected an item, the Fennimal will return to its home and inspect the provided toy. </i>"
        },
        Repeat_Training_Block: {
            title: "VISITING OLD FRIENDS",
            text: "<br><br> The original Fennimals from your training period are starting to miss you. Time to pay a visit to your old friends again! <br><br>" +
                "Do you still remember which toys these Fennimals liked? <br>" +
                "<br>" +
                "There is no time limit on your decision - you can take as long as you like. The Fennimals have grown a bit shy since the last time you saw them. After you have selected an item, the Fennimal will return to its home and inspect the toy there."
        },
        Final:{
            title: "NEW FENNIMALS HAVE BEEN SPOTTED!",
            text: "It's the last day of your training, and you're in luck! A whole bunch of new Fennimals have been spotted on the island. <br>" +
                "As before, these Fennimals are a little shy. After you give them a toy, they will return to their homes and inspect the toys there.  <u>You won't learn whether or not they liked the toys you gave them until the end of this experiment. </u><br>" +
                "<u>You can apply your previously learned knowledge to select a fitting toy for these Fennimals.</u> <br>" +
                "<br>" +
                "Some toys occasionally drop out of your bag as you make your way across the island. You will have to make do with whatever toys are available.<br>" +
                "<br>" +
                "<i>There is no time limit on your decision - you can take as long as you like. After you have selected an item, the Fennimal will return to its home and inspect the provided toy. </i>"
        }
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
            Consent: document.getElementById("instructions_consent"),
            Welcome: document.getElementById("instructions_welcome"),
            Exploration: document.getElementById("instructions_exploration"),
            Search: document.getElementById("instructions_search"),
            Test: document.getElementById("instructions_test_phase"),
            Finished: document.getElementById("instructions_finished"),
            Test_Target: document.getElementById("instructions_test_target"),
            Final_Block: document.getElementById("instructions_final_timed"),
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
        Instructions: document.getElementById("Instructions_Layer"),
        Feedback: document.getElementById("Feedback_layer"),
        Item_Bar: document.getElementById("Item_bar_layer"),
        Item_Bar_rectangle: document.getElementById("item_bar"),
        Item_Bar_circle: document.getElementById("item_bar_circular"),
        Sky: document.getElementById("Sky_Layer"),
        ObjectiveAchieved : {
            Layer: document.getElementById("Objective_Achieved_Layer"),
            Text_Top: document.getElementById("objective_achieved_text_top"),
            Text_Bottom: document.getElementById("objective_achieved_text_bottom"),
        },
        Mask: document.getElementById("Mask_Layer"),
        IngameHints : document.getElementById("Ingame_Hints_Layer"),
        Category_Phase: document.getElementById("Category_Layer")
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
        delivery_item_kite: document.getElementById("HUD_item_icon_kite"),

    },
    Home_button: document.getElementById("home_button"),
    Return_to_Home_button : document.getElementById("return_to_home_button"),
    IngameHintBox: document.getElementById("hint_box"),
}

// ON PAGE START //
// Generate the RNG here. This takes the participant number as a random seed. Request participant number with a prompt
let Param = new PARAMETERS()
let participant_number

if(Param.ExperimentRecruitmentMethod === "prolific"){
    let url_string = window.location;
    let url = new URL(url_string);
    let PID =  url.searchParams.get("PROLIFIC_PID")
    if(PID != null){
        participant_number = ProlificIDToSeed(PID)
        console.warn("SEEDED " + participant_number)
    }else{
        participant_number =  draw_random_participant_seed() //6402
        console.warn("NO PID FOUND. Defaulting to random seed " + participant_number)
    }
}
else{
    participant_number = draw_random_participant_seed()
}

participant_number = 19901
let RNG = new RandomNumberGenerator(participant_number)
let Stimuli = new STIMULUSDATA_STIMPILOT(participant_number);
//let Stimuli = new STIMULUSDATA_SIMILARITY_ON_SEARCH()

// Creating controllers. NOTE THE LAST PARAMETER: set to false for the experiments, true for the stimulus pilot
let DataCont = new DataController(participant_number, Stimuli)
let EC = new ExperimentController(Stimuli, DataCont)


EC.startExperiment()
//EC.start_first_similarity_task()
//EC.showStartScreen()
//EC.show_starting_instructions()
//EC.start_targeted_search_subphase()
//EC.start_delivery_subphase()
//EC.start_quiz()
//EC.start_test_phase()


console.log("Version: 30.01.23")

// Instructions repeat block showing last panel too early
// Instructios number of days
// No repeat block for second experiemnt

//TODO: add selected pairs for experiment 3


//localStorage.setItem("experiment_completion_code", completion_code )
//localStorage.removeItem("experiment_completion_code")

// Reintroduce spotlight to exploration phase