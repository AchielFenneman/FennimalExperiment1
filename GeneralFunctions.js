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

function set_fill_color_to_list_of_SVG_Elem(List, color){
    for(let i =0;i<List.length;i++){
        List[i].style.fill = color
    }
}

function hide_Elem_by_class_name(classname){
    let Elem = document.getElementsByClassName(classname)
    for(let i=0;i<Elem.length;i++){
        Elem[i].style.display = "none"
    }
}

function getTransformToElement(fromElement, toElement) {
    return toElement.getCTM().inverse().multiply(fromElement.getCTM());
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

function move_elem_to_coords(Elem, x, y){
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

function createNSElemWithDims(namespace,elem_name, x, y, w, h){
    let Elem = document.createElementNS(namespace,elem_name);
    Elem.setAttribute("x", x)
    Elem.setAttribute("y", y)
    Elem.setAttribute("width", w)
    Elem.setAttribute("height", h)
    return(Elem)
}

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(RNG.rand() * (max - min + 1) + min)
}


//These functions create and return SVG objects for the instructions page
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

//Returns an SVG button object with the specified dimensions, position, text and class.
function createSVGButtonElem(x,y,width,height,text,classname){
    let maxfontsize = 17

    let ButtonContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    ButtonContainer.setAttribute("x",x)
    ButtonContainer.setAttribute("y",y)
    ButtonContainer.setAttribute("width", width)
    ButtonContainer.setAttribute("height", height)
    ButtonContainer.classList.add(classname)

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

//Creates and manages a visually depicted Fennimal.
Fennimal = function(head, body, Scaling, ColorScheme,ParentElem){
    let BodyTranslateValues = {
        N: 100,
        C: 65,
        D: 65,
        E: 75,
        B: 75,
        default: 80
    }
    let HeadAdditionalTranslateValues = {

    }

    //Keeps track of the Fennimal's current tranlation coords.
    let CurrentCoords = {x:0,y:0}

    //Keeps track of the Fennimal's full current scale value
    let current_full_scale_value = 1

    //ColorSchemes should have primary, secondary, tertiary and eye-color keys and values.
    //Scaling can (but need not!) have properties head, body, and full. Head and body represent relative sizes of the parts, full comes on top to the entire object.

    //Creating the SVG elements
    let HeadObj = document.getElementById("head_" + head).cloneNode(true)
    let BodyObj = document.getElementById("body_" + body).cloneNode(true)
    HeadObj.style.display = "inherit"
    BodyObj.style.display = "inherit"

    //Setting colorschemes
    set_fill_color_to_list_of_SVG_Elem(HeadObj.getElementsByClassName("Fennimal_primary_color"), ColorScheme.primary_color)
    set_fill_color_to_list_of_SVG_Elem(HeadObj.getElementsByClassName("Fennimal_secondary_color"), ColorScheme.secondary_color)
    set_fill_color_to_list_of_SVG_Elem(HeadObj.getElementsByClassName("Fennimal_tertiary_color"), ColorScheme.tertiary_color)
    set_fill_color_to_list_of_SVG_Elem(HeadObj.getElementsByClassName("Fennimal_eye_color"), ColorScheme.eye_color)

    set_fill_color_to_list_of_SVG_Elem(BodyObj.getElementsByClassName("Fennimal_primary_color"), ColorScheme.primary_color)
    set_fill_color_to_list_of_SVG_Elem(BodyObj.getElementsByClassName("Fennimal_secondary_color"), ColorScheme.secondary_color)
    set_fill_color_to_list_of_SVG_Elem(BodyObj.getElementsByClassName("Fennimal_tertiary_color"), ColorScheme.tertiary_color)

    //Wrap bodies into groups and apply scaling (if requested in the Scaling object
    let BodyScaleG = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    let HeadScaleG = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    BodyScaleG.appendChild(BodyObj)
    HeadScaleG.appendChild(HeadObj)
    if(typeof Scaling.body !== "undefined"){
        BodyScaleG.style.transform = "scale(" + Scaling.body + ")"
    }
    if(typeof Scaling.head !== "undefined"){
        HeadScaleG.style.transform = "scale(" + Scaling.head + ")"
    }

    //Wrap the body into another group and translate it down (depends on the body type)
    let BodyTranslateG = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    BodyTranslateG.appendChild(BodyScaleG)
    let body_transform_value = BodyTranslateValues.default
    if(typeof BodyTranslateValues[body] !== "undefined"){
        body_transform_value = BodyTranslateValues[body]
    }
    BodyTranslateG.style.transform = "translate(0," + body_transform_value + "px)"

    //Creating a single group to hold both the head and body. Scale this group if requested
    let FullScaleG = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    FullScaleG.appendChild(BodyTranslateG)
    FullScaleG.appendChild(HeadScaleG)
    if(typeof Scaling.full !== "undefined"){
        FullScaleG.style.transform = "scale(" + Scaling.full + ")"
        current_full_scale_value = Scaling.full
    }

    //Wrap in a group to counteract the body translation
    let FullTranslateG = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    FullTranslateG.appendChild(FullScaleG)
    FullTranslateG.style.transform = "translate(0,-" + body_transform_value + "px)"

    //Create a group to translate the entire Fennimal. This is the final group layer (and this one should be moved around the screen when needed).
    let FennimalG = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    FennimalG.appendChild(FullTranslateG)
    FennimalG.style.transformOrigin = "center"

    //Initially setting the Fennimal opacity to zero, as well as adding a transition speed of 500ms
    FennimalG.style.opacity = 0
    FennimalG.style.transition = "500ms linear"

    //Appending the Fennimal to the Parent
    ParentElem.appendChild(FennimalG)

    //Moves the center of the Fennimal to a given location
    this.move_to_coords = function(x,y){
        CurrentCoords = {x:x,y:y}
        FennimalG.style.transform = "translate(" + x + "px, " + y + "px)"
    }

    this.move_relative = function(x_delta, y_delta){
        CurrentCoords.x = CurrentCoords.x + x_delta
        CurrentCoords.y = CurrentCoords.y + y_delta
        FennimalG.style.transform = "translate(" + CurrentCoords.x + "px, " + CurrentCoords.y + "px)"
    }

    this.rescale = function(new_scaling_factor){
        FullScaleG.style.transform = "scale(" + new_scaling_factor + ")"
        current_full_scale_value = new_scaling_factor
    }

    //Changes the opacity of the Fennimal
    this.change_opacity = function(new_opacity){
        FennimalG.style.opacity = new_opacity
    }

    //Removes the Fennimal from the SVG
    this.remove_from_SVG = function(){
        FennimalG.remove()
    }

}