//Holds all generic functions.
console.warn("LOADING GENERIC FUNCTIONS")

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

//Get the mouse position ON THE SVG ELEMENT
function getMousePosition(evt) {
    let CTM = document.getElementById("SVG_container").childNodes[0].getScreenCTM();
    if (evt.touches) { evt = evt.touches[0]; }
    return {
        x: Math.round((evt.clientX - CTM.e) / CTM.a),
        y: Math.round((evt.clientY - CTM.f) / CTM.d)
    };
}

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(RNG.rand() * (max - min + 1) + min)
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
    let HeadTranslationContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    Container.appendChild(HeadTranslationContainer)
    HeadTranslationContainer.appendChild(HeadObj)
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
    HeadObj.style.transformOrigin = "50% 100%"
    HeadObj.style.transform = "scale(1)"

    BodyObj.style.transformOrigin = "50% 50%"
    BodyObj.style.transform = "scale(.7)"

    HeadTranslationContainer.style.transformOrigin = "center"
    HeadTranslationContainer.style.transform = "translate(0,12px)"

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
    HeadObj.style.transformOrigin = "50% 0%"
    HeadObj.style.transform = "scale(1.1)"
    //HeadObj.style.transform = "scale(1.25)"

    BodyObj.style.transformOrigin = "50% 50%"
    BodyObj.style.transform = "scale(0.8)"

    //Return SVG layer
    return(Container)

}

//Creates a name based on the letters of the head and body of a Fennimal. Note that the prefixes and suffixes are hardcoded based on the look of the parts
function createConjunctiveNameHeadBody(body, head){
    return( Param.NamePrefixes_Body[body] + " " + Param.Names_Head[head])
}
function createConjunctiveNameRegionHead(region, head){
    return( Param.NamePrefixes_Region[region] + " " + Param.Names_Head[head])
}


//Returns an SVG button object with the specified dimensions, position and text.
function createSVGButtonElem(x,y,width,height,text){
    let maxfontsize = 17

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
    Text.style.fontSize = maxfontsize + "px"
    Text.append(document.createTextNode(text))

    //font-size: 20px;

    //If needed, reduce the size of the text to fit
    function try_resize(currentfontsize){
        let text_width = Text.getBBox().width
        if(text_width > 0.95* width){
            //Resize the text, and try again (small delay to allow the screen to update)
            let newfontsize = currentfontsize - 1
            Text.style.fontSize = newfontsize + "px"
            setTimeout(function(){try_resize(newfontsize)},25)

        }
    }

    setTimeout(function(){try_resize(maxfontsize )}, 5)

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

//Given a Hue, Saturation and Lightness, returns a HEX color string.
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function create_basic_color_scheme_value(hue, primary_secondary_tertiary, modifier){
    // Primary colors:
    // Secondary colors:

}

//Transforms a prolific ID to a seed (first 4 numerical digits)
function ProlificIDToSeed(PID){
    let id = JSON.parse(JSON.stringify(PID))
    let number = id.replace(/\D/g, "")
    return(number.substring(0,4))
}


//DATA FLOW AND STORAGE
function abbreviate_location_name(long_name){
    //TODO: INCOMPLETE LIST

    switch(long_name){
        case("Pineforest"): return "N_pi"
        case("Igloo"): return "N_ig"
        case("Iceberg"): return "N_ic"

        case("Windmill"): return "F_wi"
        case("Garden"): return "F_ga"
        case("Orchard"): return "F_or"

        case("Waterfall"): return "M_wa"
        case("Mine"): return "M_mi"
        case("Cliff"): return "M_cl"

        case("Church"): return "V_ch"
        case("Farm"): return "V_fa"
        case("Manor"): return "V_ma"

        case("Marsh"): return "S_ma"
        case("Cottage"): return "S_cot"
        case("Creek"): return "S_cr"

        case("Oasis"): return "D_oa"
        case("Cactus"): return "D_cac"
        case("Camp"): return "D_cam"

        case("Beachbar"): return "B_ba"
        case("Port"): return "B_po"
        case("Dunes"): return "B_du"

        case("Bush"): return "J_bu"
        case("Jungleforest"): return "J_ju"
        case("Lake"): return "J_la"

        case("Neutral"): return "Neu"
        case("Home"): return "H"
        case("home"): return "H"
    }
}
function abbreviate_region_name(long_name){
    switch(long_name){
        case("North"): return "NO"
        case("Jungle"): return "JU"
        case("Desert"): return "DE"
        case("Mountains"): return "MO"
        case("Beach"): return "BE"
        case("Flowerfields"): return "FL"
        case("Village"): return "VI"
        case("Swamp"): return "SW"
        case("Neutral"): return "NE"


    }
}

//Starts with a meaningless seed. Call to start with random seed
RandomNumberGenerator = function(seed){
    console.log("Resetting RNG to seed " + seed)
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

    let hash = cyrb128( "abcd " + seed + "random" )[0]

    //Call to get a single random number
    this.rand = mulberry32(hash)

    //Call to reset seed
    this.reseed = function(){
        mulberry32()
    }
}

let RNG = new RandomNumberGenerator("169784")

//Used to delete unused SVG layers after the stimuli have been defined
SVGGarbageCollector = function(){
    //Call to delete unused locations.
    this.remove_unused_locations_from_SVG = function(All_Location_Names, Used_Location_Names){
        let To_Remove = []

        //Add any locations that are not used
        for(let i=0;i<All_Location_Names.length; i++){
            if(! Used_Location_Names.includes(All_Location_Names[i])){
                To_Remove.push("location_" + All_Location_Names[i])
            }
        }

        //Add any intersections that we do not need (using Param.RegionData)
        for(let key in Param.RegionData){
            if(key !== "Home" && key!=="Neutral"){
                let locations_in_region_used = Param.RegionData[key].Locations.filter(v => Used_Location_Names.includes(v))
                if(locations_in_region_used.length <= 1){
                    To_Remove.push("intersection_" + key)
                }
            }
        }

        //Removing unused locations from the SVG
        for(let i=0;i<To_Remove.length;i++){
            document.getElementById(To_Remove[i]).remove()
        }

    }

    //Call to delete unused heads from the SVG
    this.remove_unused_heads_from_SVG = function(All_heads, Used_heads){
        let To_Remove = []

        for(let i =0;i< All_heads.length;i++){
            if(! Used_heads.includes(All_heads[i])){
                To_Remove.push(All_heads[i])
            }
        }

        for(let i=0;i<To_Remove.length;i++){
            document.getElementById("head_" + To_Remove[i]).remove()
            document.getElementById("outline_head_" + To_Remove[i]).remove()
        }

    }

    //Call to delete all unused bodies from the SVG
    this.remove_unused_bodies_from_SVG = function(All_bodies,Used_bodies){

        let To_Remove = []

        for(let i =0;i< All_bodies.length;i++){
            if(! Used_bodies.includes(All_bodies[i])){
                To_Remove.push(All_bodies[i])
            }
        }

        for(let i=0;i<To_Remove.length;i++){
            document.getElementById("body_" + To_Remove[i]).remove()
            document.getElementById("outline_body_" + To_Remove[i]).remove()
        }

    }

    this.remove_consent_page_from_SVG = function(){
        let ConsentPage = document.getElementById("instructions_consent")

        if(ConsentPage!== "undefined"){
            ConsentPage.remove()
        }
    }

    this.remove_basic_instructions_from_SVG = function(){
        let Page = document.getElementById("instructions_welcome")

        if(Page!== "undefined"){
            Page.remove()
        }
    }
    this.remove_exploration_page_from_SVG = function(){

        let Page = document.getElementById("instructions_exploration")

        if(Page!== "undefined"){
            Page.remove()
        }
    }



}