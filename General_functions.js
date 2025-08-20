
//Uses Fisher-Yates to shuffle a provided array
function shuffleArray(arr) {
    var j, x, i;
    for (i = arr.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = arr[i];
        arr[i] = arr[j];
        arr[j] = x;
    }
    return arr;
}

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function delete_elements_by_class_name(class_name){
    let Arr = document.getElementsByClassName(class_name)
    while(Arr.length > 0){
        Arr[0].remove()
    }
}

function EUDist(x1,y1,x2,y2){
    let a = x1 - x2
    let b = y1 - y2
    return(Math.sqrt(a*a + b*b))
}
function EUDistPoints(p1,p2){
    let a = p1.x - p2.x
    let b = p1.y - p2.y
    return(Math.sqrt(a*a + b*b))
}

//Calculates the Levenshtein distance between two strings (s,t). That is, the number of alterations needed for s to reach t. Taken from https://www.30secondsofcode.org/js/s/levenshtein-distance/
const LevenshteinDistance = (s, t) => {
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    const arr = [];
    for (let i = 0; i <= t.length; i++) {
        arr[i] = [i];
        for (let j = 1; j <= s.length; j++) {
            arr[i][j] =
                i === 0
                    ? j
                    : Math.min(
                        arr[i - 1][j] + 1,
                        arr[i][j - 1] + 1,
                        arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
                    );
        }
    }
    return arr[t.length][s.length];
};

//Returns all unique combinations of two elements from the array (excludes combinations with the same element twice)
function get_all_pairs_of_array_elements(Arr){

    let Out = Arr.flatMap(
        (v, i) => Arr.slice(i+1).map( w => [v ,w] )
    );

    return(Out)
}

function mean_of_array(Arr){
    let sum = 0
    for(let i =0;i<Arr.length;i++){
        sum = sum + Arr[i]
    }
    return(sum/Arr.length)
}

//Given a position and a list of elements, returns an object containing a reference to the closest object (object) and its distance to this given point (dist)
// Returns false if the Array is empty
function get_closest_object(ReferenceCoords, Arr){
    if(Arr.length === 0){
        return(false)
    }

    let current_min_distance = 900000
    let CurrentClosestObj = false
    for(let i=0;i<Arr.length; i++){
        //Get the centerpoint of this element
        let Box = Arr[i].getBBox()
        let CenterPoint = {x: Box.x + .5*Box.width, y: Box.y + 0.5*Box.height }
        let dist = EUDistPoints(ReferenceCoords, CenterPoint)
        if(dist < current_min_distance){
            current_min_distance = dist
            CurrentClosestObj = Arr[i]
        }
    }

    return({
        Object: CurrentClosestObj,
        dist: current_min_distance
    })
}
function get_distance_to_object(ReferenceCoords, Obj){
    //Get the centerpoint of this element
    //let Box = getViewBoxCenterPoint(Obj)
    //let CenterPoint = {x: Box.x + .5*Box.width, y: Box.y + 0.5*Box.height }
    let dist = EUDistPoints(ReferenceCoords, getViewBoxCenterPoint(Obj))
    return(dist)
}
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

function get_cursor_pos_in_svg(SVG, event){
    let SVG_cursorpoint = SVG.createSVGPoint()
    SVG_cursorpoint.x = event.clientX
    SVG_cursorpoint.y = event.clientY
    let newcoords = SVG_cursorpoint.matrixTransform(SVG.getScreenCTM().inverse())
    return(newcoords)

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

function getBrowser() {
    let userAgent = navigator.userAgent;
    let browser = "Unknown";

    // Detect Chrome
    if (/Chrome/.test(userAgent) && !/Chromium/.test(userAgent)) {
        browser = "Chrome";
    }
    // Detect Chromium-based Edge
    else if (/Edg/.test(userAgent)) {
        browser = "Edge";
    }
    // Detect Firefox
    else if (/Firefox/.test(userAgent)) {
        browser = "Firefox";
    }
    // Detect Safari
    else if (/Safari/.test(userAgent)) {
        browser = "Safari";
    }
    // Detect Internet Explorer
    else if (/Trident/.test(userAgent)) {
        browser = "Internet Explorer";
    }

    return browser;
}

// Use the function
console.log("You are using " + getBrowser());


function create_SVG_rect(x,y,width,height,class_name,id_name){
    let Rect = document.createElementNS("http://www.w3.org/2000/svg", 'rect')
    Rect.setAttribute("x",x)
    Rect.setAttribute("y",y)
    Rect.setAttribute("width", width)
    Rect.setAttribute("height", height)
    if(class_name !== undefined){
        Rect.classList.add(class_name)
    }
    if(id_name !== undefined){
        Rect.setAttribute("id", id_name)
    }
    return(Rect)
}

function create_SVG_circle(center_x,center_y,radius,class_name,id_name){
    let Rect = document.createElementNS("http://www.w3.org/2000/svg", 'circle')
    Rect.setAttribute("cx",center_x)
    Rect.setAttribute("cy",center_y)
    Rect.setAttribute("r", radius)
    if(class_name !== undefined){
        Rect.classList.add(class_name)
    }
    if(id_name !== undefined){
        Rect.setAttribute("id", id_name)
    }
    return(Rect)
}

function create_SVG_group(x,y,class_name, id_name){
    let Group = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    if(x !== undefined){
        Group.setAttribute("x",x)
    }
    if(y!==undefined){
        Group.setAttribute("y",y)
    }

    if(class_name !== undefined){
        Group.classList.add(class_name)
    }
    if(id_name !== undefined){
        Group.setAttribute("id", id_name)
    }
    return(Group)
}

function create_SVG_text_elem(x,y,text, class_name, id_name){
    let TextElem = document.createElementNS("http://www.w3.org/2000/svg", 'text')
    if(x !== undefined){
        TextElem.setAttribute("x",x)
    }
    if(y!==undefined){
        TextElem.setAttribute("y",y)
    }
    if(text !== undefined){
        TextElem.innerHTML = text
    }

    if(class_name !== undefined){
        TextElem.classList.add(class_name)
    }
    if(id_name !== undefined){
        TextElem.setAttribute("id", id_name)
    }
    return(TextElem)

}

function create_SVG_text_in_foreign_element(text, x,y,width,height,text_class_name){
    let ForeignElem = create_SVG_foreignElement(x,y,width,height,undefined,undefined)
    let TextElem = document.createElement("p")
    TextElem.style.width = "100%"
    TextElem.style.height = "100%"
    TextElem.classList.add(text_class_name)
    TextElem.innerHTML = text
    ForeignElem.appendChild(TextElem)
    return(ForeignElem)
}

function create_SVG_foreignElement(x,y,width,height, class_name, id_name){
    let ForElem = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject')
    ForElem.setAttribute("x",x )
    ForElem.setAttribute("y",y)
    ForElem.setAttribute("width",width)
    ForElem.setAttribute("height",height)

    if(class_name !== undefined){
        ForElem.classList.add(class_name)
    }
    if(id_name !== undefined){
        ForElem.setAttribute("id", id_name)
    }
    return(ForElem)
}

function create_SVG_buttonElement(center_x, center_y,width,height,text, text_size){
    //Creating the group to hold all elements
    let ButtonContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    ButtonContainer.classList.add("button_element")

    let InnerDims = {
        width: 0.9 * width,
        height: 0.9 * height
    }

    //Adding the back rectangle, then the front rectangle
    let OuterRect = create_SVG_rect(center_x- 0.5*width,center_y - 0.5*height, width, height,"icon_button_background_outer",undefined )
    let InnerRect = create_SVG_rect(center_x - 0.5*InnerDims.width,center_y - 0.5*InnerDims.height, InnerDims.width, InnerDims.height,"icon_button_background_inner",undefined )

    OuterRect.classList.add("do_not_move_on_click")
    InnerRect.classList.add("do_not_move_on_click")

    ButtonContainer.appendChild(OuterRect)
    ButtonContainer.appendChild(InnerRect)

    //Adding styles
    OuterRect.classList.add("icon_button_on_map_background_outer")
    InnerRect.classList.add("icon_button_on_map_background_inner")

    //Adding the text
    let Text = create_SVG_text_elem(center_x,center_y - 3,text,undefined,undefined)
    Text.style.textAlign = "center"
    Text.style.fontSize = text_size + "px"
    Text.style.textAnchor = "middle"
    Text.style.dominantBaseline = "central"
    Text.style.pointerEvents = "none"
    ButtonContainer.appendChild(Text)


    //Returning
    return(ButtonContainer)
}

//Returns a SVG object for the action button (with the correct coordinates and dimensions
function create_Action_Button_SVG_Element(icon_type, Dims, is_drawn_on_map, warmup_time){
    console.log(Dims)
    //Creating the group to hold all elements
    let ButtonContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')

    let InnerDims = {
        width: 0.9 * Dims.width,
        height: 0.9 * Dims.height
    }

    //Adding the back rectangle, then the front rectangle
    let OuterRect = create_SVG_rect(Dims.center_x - 0.5*Dims.width,Dims.center_y - 0.5*Dims.height, Dims.width, Dims.height,"icon_button_background_outer",undefined )
    let InnerRect = create_SVG_rect(Dims.center_x - 0.5*InnerDims.width,Dims.center_y - 0.5*InnerDims.height, InnerDims.width, InnerDims.height,"icon_button_background_inner",undefined )

    ButtonContainer.appendChild(OuterRect)
    ButtonContainer.appendChild(InnerRect)
    InnerRect.classList.add("do_not_move_on_click")

    //Styles differ whether the icon is drawn on a map or on the screen (its a scaling thing)
    if(is_drawn_on_map){
        OuterRect.classList.add("icon_button_on_map_background_outer")
        InnerRect.classList.add("icon_button_on_map_background_inner")
    }else{
        OuterRect.classList.add("icon_button_on_screen_background_outer")
        InnerRect.classList.add("icon_button_on_screen_background_inner")
    }

    //If this button has a warmup time,  then also include a circle to animate
    if(warmup_time !== undefined){
        if(warmup_time !== false){
            if(warmup_time > 0){
                let radius = 0.9* Math.min(0.5*InnerDims.width, 0.5*InnerDims.height)
                let circumference = 2 * Math.PI * radius
                let WarmupCircle = create_SVG_circle(Dims.center_x, Dims.center_y, radius, "warmup_circle", undefined)
                ButtonContainer.appendChild(WarmupCircle)

                //Setting the correct dashstroke and dasharray
                WarmupCircle.style.strokeDasharray = 1.1* Math.round(circumference )
                WarmupCircle.style.strokeDashoffset =1.1* Math.round(circumference)

            }
        }
    }

    //Now we have to include the icon. Note that all icons are created to fit in a 200x200 button. So we need to scale accordingly
    let IconTemplate, Icon, IconBox
    let IconTranslateGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    let IconScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')

    IconScaleGroup.appendChild(IconTranslateGroup)
    ButtonContainer.appendChild(IconScaleGroup)

    //Check the icon type
    if(icon_type.includes("enter_location_")){
        //Now we need an icon to represent entering the stated location. This will be a compound icon
        let location = icon_type.split("_")[2]

        //The compound icon contains of two parts: an arrow (left-hand side), and the location icon.
        Icon = create_SVG_group(0,0,undefined,undefined)

        //The location icons are created to have 50x50 max dimensions. Since we have some space left over, we will need to scale it
        let LocationIconGroup = create_SVG_group(0,0,undefined,undefined)
        LocationIconGroup.style.transform = "scale(3)"


        console.log(location)
        let LocationIcon = document.getElementById("location_icon_"+location).cloneNode(true)
        LocationIcon.removeAttribute("id")
        LocationIcon.style.transform = "translate(-15px,-30px)"
        LocationIcon.style.display = "inherit"
        LocationIcon.style.opacity = 1

        LocationIconGroup.appendChild(LocationIcon)
        Icon.appendChild(LocationIconGroup)

        let Arrow = document.getElementById("icon_arrow_enter").cloneNode(true)
        Arrow.removeAttribute("id")
        Arrow.style.transform = "translate(-100px,0px)"
        Arrow.style.display = "inherit"
        Arrow.style.opacity = 1

        Icon.appendChild(Arrow)

        IconBox = Icon.getBBox()

    }else{
        IconTemplate = document.getElementById("icon_"+ icon_type)
        if(IconTemplate === undefined){
            IconTemplate = document.getElementById("icon_magnifier")
            console.error("Attempting to create invalid button type: " + icon_type + ". Defaulting to magnifier")
        }
        Icon = IconTemplate.cloneNode(true)
        Icon.removeAttribute("id")


        //Calculating the delta x and delta y of the Icon
        IconBox = IconTemplate.getBBox()

    }

    let icon_center_x = IconBox.x + 0.5 * IconBox.width
    let icon_center_y = IconBox.y + 0.5 * IconBox.height

    let delta_x = Math.round(Dims.center_x - icon_center_x)
    let delta_y = Math.round(Dims.center_y - icon_center_y)
    IconTranslateGroup.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

    //Calculating the scale of the Icon
    let scale_factor_x = (InnerDims.width / 200)
    let scale_factor_y = (InnerDims.height / 200)
    IconScaleGroup.style.transformOrigin = Dims.center_x + "px "  + Dims.center_y + "px"
    IconScaleGroup.style.transform = "scale(" + scale_factor_x + "," + scale_factor_y + ")"

    //Removing any transition set to the icon (its all grouped at 0,0; but for ease-of-edit, they have been moved around a bit in the svg)
    Icon.style.transform = ""
    Icon.removeAttribute("transform")

    IconTranslateGroup.appendChild(Icon)

    Icon.style.display = "inherit"
    Icon.style.opacity = 1


    //Returning
    return(ButtonContainer)
}



//Get the mouse position ON THE SVG ELEMENT
function getMousePosition(evt) {
    let CTM = GenParam.SVGObject.getScreenCTM();
    if (evt.touches) { evt = evt.touches[0]; }
    return {
        x: Math.round((evt.clientX - CTM.e) / CTM.a),
        y: Math.round((evt.clientY - CTM.f) / CTM.d)
    };
}

//Returns ROUNDED x,y of Object viewbox center
function get_center_coords_of_SVG_object(Obj){
    let Box = Obj.getBBox()
    return({x: Math.round( Box.x+0.5*Box.width), y: Math.round(Box.y + 0.5*Box.height)})
}

//Removes the SVG tag from the SVG strings
function remove_svg_tag_from_string(string){
    //Check the first four characters to see if there is an svg tag here. If not, then just pass it through
    if(string.substring(0,4) === "<svg"){

        //Find the end of the tag
        let start_tag_end = string.indexOf(">",0)
        string = string.substring(start_tag_end+1)

        //Find and remove the last </svg> part
        string = string.replace("</svg>", "")

        return(string)

    }else{
        return(string)
    }
}

//Given a reference to an SVG object, sets the color classes for the Fennimal
function set_Fennimal_color_classes(Obj){
    //The Fennimal's colors are defined by their placeholder fills (as just in the inkscape format). Here we take these fill colors and append the correct classes
    //Get all children, grandchildren etc.
    let List_All = Obj.getElementsByTagName("*")
    for(let i = 0;i<List_All.length;i++){
        if(List_All[i].getAttribute("fill") !== undefined){
            let fill_color = List_All[i].getAttribute("fill")
            switch (fill_color){
                case("#ea6208"): List_All[i].classList.add("Fennimal_primary_color"); break
                case("#eed671"): List_All[i].classList.add("Fennimal_secondary_color"); break
                case("#812c2c"): List_All[i].classList.add("Fennimal_tertiary_color"); break
                case("#a7cdfe"): List_All[i].classList.add("Fennimal_eye_color"); break
            }
        }



    }
}

// Transforms the heads SVG data into an array of strings (one string per head)
function extract_all_SVG_heads_to_array(RawSVGString){
    //Insert the SVG into a hidden element
    let HiddenDiv = document.createElement("div")
    HiddenDiv.style.display = "none"

    document.body.appendChild(HiddenDiv)
    HiddenDiv.innerHTML =  RawSVGString

    //Now transforming all elements to an array of strings (one element per head)
    let OutputArr = []
    let RawHeads = HiddenDiv.getElementsByClassName("Fennimal_head")

    for(let i = 0;i<RawHeads.length;i++){
        set_Fennimal_color_classes(RawHeads[i])
        OutputArr.push( RawHeads[i])
    }

    //Deleting the hidden DIV and returning the array
     HiddenDiv.remove()
    return(OutputArr)

}

function extract_all_SVG_bodies_to_array(RawSVGString){
    //Insert the SVG into a hidden element
    let HiddenDiv = document.createElement("div")
    HiddenDiv.style.display = "none"

    document.body.appendChild(HiddenDiv)
    HiddenDiv.innerHTML =  RawSVGString

    //Now transforming all elements to an array of strings (one element per head)
    let OutputArr = []
    let RawBodies = HiddenDiv.getElementsByClassName("Fennimal_body")

    for(let i = 0;i<RawBodies.length;i++){
        set_Fennimal_color_classes(RawBodies[i])
        OutputArr.push( RawBodies[i])
    }

    //Deleting the hidden DIV and returning the array
    HiddenDiv.remove()
    return(OutputArr)

}

function set_fill_for_all_elements_in_array(Arr, fill_color){
    for(let i =0;i<Arr.length;i++){
        Arr[i].style.fill = fill_color
    }
}

function set_stroke_color_for_all_elements_in_array(Arr, stroke_color){
    for(let i =0;i<Arr.length;i++){
        Arr[i].style.stroke = stroke_color
    }
}


function create_Fennimal_SVG_object(FenObj, head_scale_factor, outline_only){
    //Create the Fennimal SVG container. There are two layers here, one for transform (top), one for scale (second)
    let TranslationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    let ScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    TranslationGroup.appendChild(ScaleGroup)

    //Creating subcontainers for head and body. As above, these should have two layers of subgroups: top for translate, bottom for scale
    let BodyGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    let BodyScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    BodyGroup.appendChild(BodyScaleGroup)
    ScaleGroup.appendChild(BodyGroup)

    let HeadGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    let HeadScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    HeadGroup.appendChild(HeadScaleGroup)
    ScaleGroup.appendChild(HeadGroup)

    //Now we can find and copy the SVG code for the head and body
    let BodySVG = document.getElementById("Fennimal_body_" + FenObj.body).cloneNode(true)
    BodySVG.style.display = "inherit"
    BodyScaleGroup.appendChild(BodySVG)
    let HeadSVG = document.getElementById("Fennimal_head_" + FenObj.head).cloneNode(true)
    HeadSVG.style.display = "inherit"
    HeadScaleGroup.appendChild(HeadSVG)

    //Translating the body the line up the two neck points
    let BodyCenterPoint = {
        x: parseFloat( BodySVG.getElementsByClassName("Fennimal_body_center_point")[0].getAttribute("cx") ),
        y: parseFloat(BodySVG.getElementsByClassName("Fennimal_body_center_point")[0].getAttribute("cy"))
    }
    let BodyNeckPoint = {
        x: parseFloat( BodySVG.getElementsByClassName("Fennimal_body_neck_point")[0].getAttribute("cx") ),
        y: parseFloat(BodySVG.getElementsByClassName("Fennimal_body_neck_point")[0].getAttribute("cy"))
    }
    let HeadNeckPoint = {
        x: parseFloat( HeadSVG.getElementsByClassName("Fennimal_head_neck_point")[0].getAttribute("cx") ),
        y: parseFloat(HeadSVG.getElementsByClassName("Fennimal_head_neck_point")[0].getAttribute("cy"))
    }

    //Figuring out how much we need to translate the HEAD
    let translate_x_delta =  BodyNeckPoint.x - HeadNeckPoint.x
    let translate_y_delta =  BodyNeckPoint.y - HeadNeckPoint.y
    HeadGroup.style.transform = "translate(" + translate_x_delta + "px, " + translate_y_delta + "px)"

    //Scaling the head
    HeadScaleGroup.style.transformOrigin = HeadNeckPoint.x + "px " + HeadNeckPoint.y + "px"
    HeadScaleGroup.style.transform = "scale(" + head_scale_factor + ")"
    //Adding colors
    if(outline_only){
        TranslationGroup.style.fill = "black"
        set_fill_for_all_elements_in_array(TranslationGroup.querySelectorAll("*"), "black")
    }else{
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_primary_color"), FenObj.ColorScheme.Head.primary_color)
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_secondary_color"),  FenObj.ColorScheme.Head.secondary_color)
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_tertiary_color"),  FenObj.ColorScheme.Head.tertiary_color)
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_eye_color"),  FenObj.ColorScheme.Head.eye_color)

        set_fill_for_all_elements_in_array(BodyGroup.getElementsByClassName("Fennimal_primary_color"), FenObj.ColorScheme.Body.primary_color)
        set_fill_for_all_elements_in_array(BodyGroup.getElementsByClassName("Fennimal_secondary_color"),  FenObj.ColorScheme.Body.secondary_color)
        set_fill_for_all_elements_in_array(BodyGroup.getElementsByClassName("Fennimal_tertiary_color"),  FenObj.ColorScheme.Body.tertiary_color)

    }

    //Adding global scale. This will be based on the center of the Fennimal body.
    ScaleGroup.style.transformOrigin = BodyCenterPoint.x + "px " + BodyCenterPoint.y + "px"
    //ScaleGroup.style.transform = "scale(" + scale_factor + ")"

    //Labelling some key groups for easy access
    ScaleGroup.classList.add("Fennimal_scale_group")
    TranslationGroup.classList.add("Fennimal_translation_group")


    //Returning
    return(TranslationGroup)
}

function create_Fennimal_SVG_object_head_only(FenObj, outline_only){
    //Create the Fennimal SVG container. There are two layers here, one for transform (top), one for scale (second)
    let TranslationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    let ScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    TranslationGroup.appendChild(ScaleGroup)

    let HeadGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    let HeadScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    HeadGroup.appendChild(HeadScaleGroup)
    ScaleGroup.appendChild(HeadGroup)

    //Now we can find and copy the SVG code for the head
    let HeadSVG = document.getElementById("Fennimal_head_" + FenObj.head).cloneNode(true)
    HeadSVG.style.display = "inherit"
    HeadScaleGroup.appendChild(HeadSVG)

    //Adding colors
    if(outline_only){
        TranslationGroup.style.fill = "black"
        set_fill_for_all_elements_in_array(TranslationGroup.querySelectorAll("*"), "black")
    }else{
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_primary_color"), FenObj.ColorScheme.Head.primary_color)
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_secondary_color"),  FenObj.ColorScheme.Head.secondary_color)
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_tertiary_color"),  FenObj.ColorScheme.Head.tertiary_color)
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_eye_color"),  FenObj.ColorScheme.Head.eye_color)
    }

    //Labelling some key groups for easy access
    ScaleGroup.classList.add("Fennimal_scale_group")
    TranslationGroup.classList.add("Fennimal_translation_group")

    //Returning
    return(TranslationGroup)
}

// NOTE: sets focus after delay, but will not work after focus lost...
function add_keyboard_shortcuts_to_object(Object, arr_keys, focusdelay, executefunction){
    console.log(Object)
    Object.tabIndex = "0"
    setTimeout(function(){Object.focus()},focusdelay)

    Object.onkeydown = function(event){
        console.log(event.key)
        if(arr_keys.includes(event.key )){
            console.log("fire")
            executefunction()
        }
    }
}
