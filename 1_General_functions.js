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

function sortArrayByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function delete_elements_by_class_name(class_name) {
    let Arr = document.getElementsByClassName(class_name)
    while (Arr.length > 0) {
        Arr[0].remove()
    }
}

function EUDistPoints(p1, p2) {
    let a = p1.x - p2.x
    let b = p1.y - p2.y
    return (Math.sqrt(a * a + b * b))
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

function set_property_to_all_elem_in_arr(property, value, Arr){
    let NewArr =[]

    for(let i = 0;i < Arr.length; i++){
        NewArr[i] = JSON.parse(JSON.stringify(Arr[i]))
        NewArr[i][property] = value
    }
    return NewArr
}

//Given a position and a list of elements, returns an object containing a reference to the closest object (object) and its distance to this given point (dist)
// Returns false if the Array is empty
function get_closest_object(ReferenceCoords, Arr) {
    if (Arr.length === 0) {
        return (false)
    }

    let current_min_distance = 900000
    let CurrentClosestObj = false
    for (let i = 0; i < Arr.length; i++) {
        //Get the centerpoint of this element
        let Box = Arr[i].getBBox()
        let CenterPoint = {x: Box.x + .5 * Box.width, y: Box.y + 0.5 * Box.height}
        let dist = EUDistPoints(ReferenceCoords, CenterPoint)
        if (dist < current_min_distance) {
            current_min_distance = dist
            CurrentClosestObj = Arr[i]
        }
    }

    return ({
        Object: CurrentClosestObj,
        dist: current_min_distance
    })
}

function get_distance_to_object(ReferenceCoords, Obj) {
    //Get the centerpoint of this element
    //let Box = getViewBoxCenterPoint(Obj)
    //let CenterPoint = {x: Box.x + .5*Box.width, y: Box.y + 0.5*Box.height }
    let dist = EUDistPoints(ReferenceCoords, getViewBoxCenterPoint(Obj))
    return (dist)
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
    return (pt.matrixTransform(getTransformToElement(Elem, SVG)))
}

function getTransformToElement(fromElement, toElement) {
    return toElement.getCTM().inverse().multiply(fromElement.getCTM());
}

//Translates center of the Elem element to a given x and y position
function MoveElemToCoords(Elem, x, y) {
    //Get original positions of Elems, in the form of two svg points
    let original_pt = getViewBoxCenterPoint(Elem);

    //Now figure out how much we will have to translate the Element by
    let delta_x = x - original_pt.x
    let delta_y = y - original_pt.y

    //Transform the Elem
    let has_previous_transform = Elem.transform.baseVal.length !== 0
    let matrix = {}

    if (!has_previous_transform) {
        Elem.setAttribute("transform", "translate(0.00001,0.00001)")
    }

    let transform = Elem.transform.baseVal.getItem(0)
    matrix = transform.matrix;
    matrix = matrix.translate(delta_x, delta_y);
    Elem.transform.baseVal.getItem(0).setMatrix(matrix);
}

function get_cursor_pos_in_svg(SVG, event) {
    let SVG_cursorpoint = SVG.createSVGPoint()
    SVG_cursorpoint.x = event.clientX
    SVG_cursorpoint.y = event.clientY
    let newcoords = SVG_cursorpoint.matrixTransform(SVG.getScreenCTM().inverse())
    return (newcoords)

}

//When assigned to a button press, enables the fullscreen
function toggleFullscreen(event) {
    var element = document.body;

    if (event instanceof HTMLElement) {
        element = event;
    }

    var isFullscreen = document.webkitIsFullScreen || document.mozFullScreen || false;

    element.requestFullScreen = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || function () {
        return false;
    };
    document.cancelFullScreen = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || function () {
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

function create_SVG_rect(x, y, width, height, class_name, id_name) {
    let Rect = document.createElementNS("http://www.w3.org/2000/svg", 'rect')
    Rect.setAttribute("x", x)
    Rect.setAttribute("y", y)
    Rect.setAttribute("width", width)
    Rect.setAttribute("height", height)
    if (class_name !== undefined) {
        Rect.classList.add(class_name)
    }
    if (id_name !== undefined) {
        Rect.setAttribute("id", id_name)
    }
    return (Rect)
}

function create_SVG_circle(center_x, center_y, radius, class_name, id_name) {
    let Rect = document.createElementNS("http://www.w3.org/2000/svg", 'circle')
    Rect.setAttribute("cx", center_x)
    Rect.setAttribute("cy", center_y)
    Rect.setAttribute("r", radius)
    if (class_name !== undefined) {
        Rect.classList.add(class_name)
    }
    if (id_name !== undefined) {
        Rect.setAttribute("id", id_name)
    }
    return (Rect)
}

/**
 * Tear down any leftover interaction/phone-room/belief DOM under #Fennimals_Layer.
 * Preserves #Fennimal_Templates_Layer (static SVG assets). Hides the layer so orphans
 * cannot sit above the map and steal clicks (watchtower / Fennefinder reports).
 */
function clear_Fennimals_interaction_layer() {
    let layer = document.getElementById("Fennimals_Layer");
    if (!layer) return;

    Array.from(layer.childNodes).forEach(child => {
        if (child.nodeType === 1 && child.id === "Fennimal_Templates_Layer") return;
        child.remove();
    });
    layer.style.display = "none";
}

function create_SVG_group(x, y, class_name, id_name) {
    let Group = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    if (x !== undefined) {
        Group.setAttribute("x", x)
    }
    if (y !== undefined) {
        Group.setAttribute("y", y)
    }

    if (class_name !== undefined) {
        Group.classList.add(class_name)
    }
    if (id_name !== undefined) {
        Group.setAttribute("id", id_name)
    }
    return (Group)
}

function create_SVG_text_elem(x, y, text, class_name, id_name) {
    let TextElem = document.createElementNS("http://www.w3.org/2000/svg", 'text')
    if (x !== undefined) {
        TextElem.setAttribute("x", x)
    }
    if (y !== undefined) {
        TextElem.setAttribute("y", y)
    }
    if (text !== undefined) {
        TextElem.innerHTML = text
    }

    if (class_name !== undefined) {
        TextElem.classList.add(class_name)
    }
    if (id_name !== undefined) {
        TextElem.setAttribute("id", id_name)
    }
    return (TextElem)

}

function create_SVG_text_in_foreign_element(text, x, y, width, height, text_class_name) {
    let ForeignElem = create_SVG_foreignElement(x, y, width, height, undefined, undefined)
    let TextElem = document.createElement("p")
    TextElem.style.width = "100%"
    TextElem.style.height = "100%"
    TextElem.classList.add(text_class_name)
    TextElem.innerHTML = text
    TextElem.style.lineHeight = "95%"
    ForeignElem.appendChild(TextElem)
    return (ForeignElem)
}

function create_SVG_foreignElement(x, y, width, height, class_name, id_name) {
    let ForElem = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject')
    ForElem.setAttribute("x", x)
    ForElem.setAttribute("y", y)
    ForElem.setAttribute("width", width)
    ForElem.setAttribute("height", height)

    if (class_name !== undefined) {
        ForElem.classList.add(class_name)
    }
    if (id_name !== undefined) {
        ForElem.setAttribute("id", id_name)
    }
    return (ForElem)
}

function create_SVG_buttonElement(center_x, center_y, width, height, text, text_size) {
    //Creating the group to hold all elements
    let ButtonContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    ButtonContainer.classList.add("button_element")

    let InnerDims = {
        width: 0.9 * width,
        height: 0.9 * height
    }

    //Adding the back rectangle, then the front rectangle
    let OuterRect = create_SVG_rect(center_x - 0.5 * width, center_y - 0.5 * height, width, height, "icon_button_background_outer", undefined)
    let InnerRect = create_SVG_rect(center_x - 0.5 * InnerDims.width, center_y - 0.5 * InnerDims.height, InnerDims.width, InnerDims.height, "icon_button_background_inner", undefined)

    OuterRect.classList.add("do_not_move_on_click")
    InnerRect.classList.add("do_not_move_on_click")

    ButtonContainer.appendChild(OuterRect)
    ButtonContainer.appendChild(InnerRect)

    //Adding styles
    OuterRect.classList.add("icon_button_on_map_background_outer")
    InnerRect.classList.add("icon_button_on_map_background_inner")

    //Adding the text
    let Text = create_SVG_text_elem(center_x, center_y - 3, text, undefined, undefined)
    Text.style.textAlign = "center"
    Text.style.fontSize = text_size + "px"
    Text.style.textAnchor = "middle"
    Text.style.dominantBaseline = "central"
    Text.style.pointerEvents = "none"
    ButtonContainer.appendChild(Text)


    //Returning
    return (ButtonContainer)
}

function create_DOM_buttonElement(text,text_size){
    let ButtonOuter = document.createElement("div")
    let ButtonInner = document.createElement("div")
    let TextElem = document.createElement("div")

    ButtonOuter.appendChild(ButtonInner)
    ButtonInner.appendChild(TextElem)

    TextElem.style.fontSize = text_size + "px"
    TextElem.style.textAnchor = "middle"
    TextElem.style.color = "navy"
    TextElem.style.fontWeight = 500
    //TextElem.style.pointerEvents = "none"
    TextElem.classList.add("DOM_button_text")

    TextElem.innerHTML = text

    ButtonOuter.style.background = "#b8860b" + "99"
    ButtonOuter.style.borderRadius = "20px"
    //ButtonOuter.style.opacity = 0.7
    ButtonOuter.style.cursor = "pointer"
    ButtonOuter.style.padding = "8px"
    ButtonOuter.style.paddingLeft = "20px"
    ButtonOuter.style.paddingRight = "20px"

    ButtonInner.style.background = "#FFD700" + "99"
    ButtonInner.style.borderRadius = "20px"
    ButtonInner.style.paddingLeft = "30px"
    ButtonInner.style.paddingRight = "30px"
    ButtonInner.style.textAlign = "center"
    //ButtonInner.style.pointerEvents = "none"
    ButtonInner.classList.add("DOM_button_inner")






    /*
    *  fill: gold;
            opacity: 0.4;
            rx: 40;
            ry: 40*/

    return(ButtonOuter)
}

//Returns a SVG object for the action button (with the correct coordinates and dimensions
function create_Action_Button_SVG_Element(icon_type, Dims, is_drawn_on_map, warmup_time) {
    //Creating the group to hold all elements
    let ButtonContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')

    let InnerDims = {
        width: 0.9 * Dims.width,
        height: 0.9 * Dims.height
    }

    //Adding the back rectangle, then the front rectangle
    let OuterRect = create_SVG_rect(Dims.center_x - 0.5 * Dims.width, Dims.center_y - 0.5 * Dims.height, Dims.width, Dims.height, "icon_button_background_outer", undefined)
    let InnerRect = create_SVG_rect(Dims.center_x - 0.5 * InnerDims.width, Dims.center_y - 0.5 * InnerDims.height, InnerDims.width, InnerDims.height, "icon_button_background_inner", undefined)

    ButtonContainer.appendChild(OuterRect)
    ButtonContainer.appendChild(InnerRect)
    InnerRect.classList.add("do_not_move_on_click")

    //Styles differ whether the icon is drawn on a map or on the screen (its a scaling thing)
    if (is_drawn_on_map) {
        OuterRect.classList.add("icon_button_on_map_background_outer")
        InnerRect.classList.add("icon_button_on_map_background_inner")
    } else {
        OuterRect.classList.add("icon_button_on_screen_background_outer")
        InnerRect.classList.add("icon_button_on_screen_background_inner")
    }

    //If this button has a warmup time,  then also include a circle to animate
    if (warmup_time !== undefined) {
        if (warmup_time !== false) {
            if (warmup_time > 0) {
                let radius = 0.9 * Math.min(0.5 * InnerDims.width, 0.5 * InnerDims.height)
                let circumference = 2 * Math.PI * radius
                let WarmupCircle = create_SVG_circle(Dims.center_x, Dims.center_y, radius, "warmup_circle", undefined)
                ButtonContainer.appendChild(WarmupCircle)

                //Setting the correct dashstroke and dasharray
                WarmupCircle.style.strokeDasharray = 1.1 * Math.round(circumference)
                WarmupCircle.style.strokeDashoffset = 1.1 * Math.round(circumference)

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
    if (icon_type.includes("enter_location_")) {
        //Now we need an icon to represent entering the stated location. This will be a compound icon
        let location = icon_type.split("_")[2]

        //The compound icon contains of two parts: an arrow (left-hand side), and the location icon.
        Icon = create_SVG_group(0, 0, undefined, undefined)

        //The location icons are created to have 50x50 max dimensions. Since we have some space left over, we will need to scale it
        let LocationIconGroup = create_SVG_group(0, 0, undefined, undefined)
        LocationIconGroup.style.transform = "scale(3)"

        let LocationIcon = document.getElementById("location_icon_" + location).cloneNode(true)
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

    } else {
        IconTemplate = document.getElementById("icon_" + icon_type)
        if (IconTemplate === undefined) {
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
    IconScaleGroup.style.transformOrigin = Dims.center_x + "px " + Dims.center_y + "px"
    IconScaleGroup.style.transform = "scale(" + scale_factor_x + "," + scale_factor_y + ")"

    //Removing any transition set to the icon (its all grouped at 0,0; but for ease-of-edit, they have been moved around a bit in the svg)
    Icon.style.transform = ""
    Icon.removeAttribute("transform")

    IconTranslateGroup.appendChild(Icon)

    Icon.style.display = "inherit"
    Icon.style.opacity = 1


    //Returning
    return (ButtonContainer)
}

//Get the mouse position ON THE SVG ELEMENT
function getMousePosition(evt) {
    let CTM = GenParam.SVGObject.getScreenCTM();
    if (evt.touches) {
        evt = evt.touches[0];
    }
    return {
        x: Math.round((evt.clientX - CTM.e) / CTM.a),
        y: Math.round((evt.clientY - CTM.f) / CTM.d)
    };
}

function getMousePosition_with_transforms(RefObj, event){
    let SVG = GenParam.SVGObject


    const point =SVG.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    // KEY CHANGE: Get the CTM of the transformed group, not the root SVG
    const ctm = RefObj.getScreenCTM();

    const Coords = point.matrixTransform(ctm.inverse());

    return({x: Coords.x, y: Coords.y});

}

//Returns ROUNDED x,y of Object viewbox center
function get_center_coords_of_SVG_object(Obj) {
    let Box = Obj.getBBox()
    return ({x: Math.round(Box.x + 0.5 * Box.width), y: Math.round(Box.y + 0.5 * Box.height)})
}

function getSVGInternalCenter(element) {
    const svg = element.ownerSVGElement;

    // 1. Find the local center (untouched by transforms)
    const bbox = element.getBBox();
    const localPoint = svg.createSVGPoint();
    localPoint.x = bbox.x + bbox.width / 2;
    localPoint.y = bbox.y + bbox.height / 2;

    // 2. Calculate the "Target-to-SVG" Matrix
    // We get the element's screen matrix and multiply it by
    // the inverse of the root SVG's screen matrix.
    const elementToScreen = element.getScreenCTM();
    const svgToScreenInverse = svg.getScreenCTM().inverse();
    const matrixToSVG = svgToScreenInverse.multiply(elementToScreen);

    // 3. Transform the local center point into the SVG's coordinate space
    const svgPoint = localPoint.matrixTransform(matrixToSVG);

    return { x: svgPoint.x, y: svgPoint.y };
}

function moveSVGCenterTo(element, targetX, targetY) {
    const svg = element.ownerSVGElement;

    // 1. Convert the desired root coordinates into an SVGPoint
    let point = svg.createSVGPoint();
    point.x = targetX;
    point.y = targetY;

    // 2. Calculate the matrix that maps root SVG space to the element's parent space
    // We want to know: "If I am at (targetX, targetY) in the root, where am I in this parent?"
    const CTM = element.parentElement.getScreenCTM();
    const rootCTM = svg.getScreenCTM();

    // This matrix represents all transformations from the Root to the Parent
    const parentMatrix = rootCTM.inverse().multiply(CTM);

    // 3. Transform our target point into the parent's coordinate system
    const localTarget = point.matrixTransform(parentMatrix.inverse());

    // 4. Adjust for the element's own center (BBox)
    // getBBox() returns coordinates in the element's local system
    const bbox = element.getBBox();
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    // 5. Calculate the translation needed to put the center at the target
    const dx = localTarget.x - centerX;
    const dy = localTarget.y - centerY;

    // 6. Apply as a translation transform to preserve existing attributes
    // We prepend/update a translate(dx, dy) to the element's transform list
    element.setAttribute("transform", `translate(${dx}, ${dy})`);
}

//Given a reference to an SVG object, sets the color classes for the Fennimal
/*function set_Fennimal_color_classes(Obj) {
    //The Fennimal's colors are defined by their placeholder fills (as just in the inkscape format). Here we take these fill colors and append the correct classes
    //Get all children, grandchildren etc.
    let List_All = Obj.getElementsByTagName("*")
    for (let i = 0; i < List_All.length; i++) {
        if (List_All[i].getAttribute("fill") !== undefined) {
            let fill_color = List_All[i].getAttribute("fill")
            switch (fill_color) {
                case("#ea6208"):
                    List_All[i].classList.add("Fennimal_primary_color");
                    break
                case("#eed671"):
                    List_All[i].classList.add("Fennimal_secondary_color");
                    break
                case("#812c2c"):
                    List_All[i].classList.add("Fennimal_tertiary_color");
                    break
                case("#812c2f"):
                    List_All[i].classList.add("Fennimal_tertiary_color");
                    break
                case("#a7cdfe"):
                    List_All[i].classList.add("Fennimal_eye_color");
                    break
            }

            let stroke_color = List_All[i].getAttribute("stroke")
            switch (stroke_color) {
                case("#ea6208"):
                    List_All[i].classList.add("Fennimal_primary_color_stroke");
                    break
                case("#eed671"):
                    List_All[i].classList.add("Fennimal_secondary_color_stroke");
                    break
                case("#812c2c"):
                    List_All[i].classList.add("Fennimal_tertiary_color_stroke");
                    break
                case("#812c2f"):
                    List_All[i].classList.add("Fennimal_tertiary_color_stroke");
                    break
                case("#a7cdfe"):
                    List_All[i].classList.add("Fennimal_eye_color_stroke");
                    break
            }
        }


    }
}

 */

// Given a reference to an SVG object, sets the color classes for the Fennimal
function set_Fennimal_color_classes(Obj) {
    let List_All = Obj.querySelectorAll("*");

    List_All.forEach(el => {
        // Grab the color, force lowercase, and STRIP ALL SPACES so "rgb(234, 98, 8)" becomes "rgb(234,98,8)"
        let fill_color = (el.getAttribute("fill") || el.style.fill || "").toLowerCase().replace(/\s/g, "");
        let stroke_color = (el.getAttribute("stroke") || el.style.stroke || "").toLowerCase().replace(/\s/g, "");

        let matchedFill = false;
        let matchedStroke = false;

        // --- Handle Fill Colors ---
        if (fill_color) {
            switch (fill_color) {
                // Primary Color
                case "#ea6208":
                case "rgb(234,98,8)":
                    el.classList.add("Fennimal_primary_color");
                    matchedFill = true;
                    break;
                // Secondary Color
                case "#eed671":
                case "rgb(238,214,113)":
                case "#efd771":
                case "rgb(239,215,113)":
                    el.classList.add("Fennimal_secondary_color");
                    matchedFill = true;
                    break;
                // Tertiary Color
                case "#812c2c":
                case "rgb(129,44,44)":
                case "#812c2f":
                case "rgb(129,44,47)":
                    el.classList.add("Fennimal_tertiary_color");
                    matchedFill = true;
                    break;
                // Eye Color
                case "#a7cdfe":
                case "rgb(167,205,254)":
                    el.classList.add("Fennimal_eye_color");
                    matchedFill = true;
                    break;
            }

            if (matchedFill) {
                el.removeAttribute("fill");
                el.style.fill = "";
            }
        }

        // --- Handle Stroke Colors ---
        if (stroke_color) {
            switch (stroke_color) {
                case "#ea6208":
                case "rgb(234,98,8)":
                    el.classList.add("Fennimal_primary_color_stroke");
                    matchedStroke = true;
                    break;
                case "#eed671":
                case "rgb(238,214,113)":
                case "#efd771":
                case "rgb(239,215,113)":
                    el.classList.add("Fennimal_secondary_color_stroke");
                    matchedStroke = true;
                    break;
                case "#812c2c":
                case "rgb(129,44,44)":
                case "#812c2f":
                case "rgb(129,44,47)":
                    el.classList.add("Fennimal_tertiary_color_stroke");
                    matchedStroke = true;
                    break;
                case "#a7cdfe":
                case "rgb(167,205,254)":
                    el.classList.add("Fennimal_eye_color_stroke");
                    matchedStroke = true;
                    break;
            }

            if (matchedStroke) {
                el.removeAttribute("stroke");
                el.style.stroke = "";
            }
        }
    });
}

function set_fill_for_all_elements_in_array(Arr, fill_color) {
    for (let i = 0; i < Arr.length; i++) {
        Arr[i].style.fill = fill_color
    }
}

function set_stroke_color_for_all_elements_in_array(Arr, stroke_color) {
    for (let i = 0; i < Arr.length; i++) {
        Arr[i].style.stroke = stroke_color
    }
}

// A global utility to firmly lock animated SVG parts to their pivot points
function apply_Fennimal_animation_pivots(FennimalSVG) {
    if (!FennimalSVG) return;

    let animatedParts = FennimalSVG.querySelectorAll('.animated_part');
    animatedParts.forEach(part => {
        let pivot = part.querySelector('.pivot_point');
        if (pivot) {
            let px = parseFloat(pivot.getAttribute("cx"));
            let py = parseFloat(pivot.getAttribute("cy"));

            // Apply the absolute SVG coordinates
            part.style.transformOrigin = `${px}px ${py}px`;

            // WE DELETED THE transformBox = "fill-box" HERE!
        }
    });

    let eyes = FennimalSVG.querySelectorAll(".eye_gaze");
    eyes.forEach(eye => {
        // The eyes use "center" instead of absolute coordinates,
        // so they STILL NEED fill-box to know where their own center is.
        eye.style.transformOrigin = "center";
        eye.style.transformBox = "fill-box";
    });
}

/**
 * Freeze all decorative CSS body/head flair on a Fennimal SVG
 * (snowflakes, spores, heat waves, tails, curious tilt, climber arms, …).
 */
function freeze_fennimal_decorative_animations(FennimalSVG) {
    if (!FennimalSVG) return;
    FennimalSVG.classList.add("fennimal_pose_frozen");
    // Inline fallback so mid-keyframe transforms also settle even if class CSS lags.
    FennimalSVG.querySelectorAll("*").forEach((el) => {
        el.style.animation = "none";
        el.style.animationPlayState = "paused";
    });
}

function create_Fennimal_SVG_object(FenObj, head_scale_factor, outline_only) {
    let TranslationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    let ScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    TranslationGroup.appendChild(ScaleGroup);

    // ----------------------------------------------------
    // 1. BODY SETUP
    // ----------------------------------------------------
    let BodyGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    let BodyScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');

    BodyGroup.classList.add("Fennimal_body");
    BodyGroup.appendChild(BodyScaleGroup);
    ScaleGroup.appendChild(BodyGroup);

    let BodySVG = document.getElementById("Fennimal_body_" + FenObj.body).cloneNode(true);
    //set_Fennimal_color_classes(BodySVG);
    BodySVG.style.display = "inherit";
    BodyScaleGroup.appendChild(BodySVG);

    // ----------------------------------------------------
    // 2. HEAD SETUP (The "Wrapper Group" Fix)
    // ----------------------------------------------------
    // HeadGroup: Holds the structural neck connection (immune to render loop)
    /*let HeadGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');

    // HeadAnimationGroup: The target for the breathing/gaze tracking render loop
    let HeadAnimationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    HeadAnimationGroup.classList.add("Fennimal_head");

    // Casts a soft, dark shadow straight down (18px) onto the collar!
    HeadAnimationGroup.style.filter = "drop-shadow(0px 18px 4px rgba(0, 0, 0, 0.35))";

    // HeadScaleGroup: Holds the scale factor
    let HeadScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');

    HeadGroup.appendChild(HeadAnimationGroup);
    HeadAnimationGroup.appendChild(HeadScaleGroup);
    ScaleGroup.appendChild(HeadGroup);

    let HeadSVG = document.getElementById("Fennimal_head_" + FenObj.head).cloneNode(true);
    HeadSVG.style.display = "inherit";
    //set_Fennimal_color_classes(HeadSVG);
    HeadScaleGroup.appendChild(HeadSVG);

    // --- Head Math ---
    let BodyCenterPoint = {
        x: parseFloat(BodySVG.getElementsByClassName("Fennimal_body_center_point")[0].getAttribute("cx")),
        y: parseFloat(BodySVG.getElementsByClassName("Fennimal_body_center_point")[0].getAttribute("cy"))
    };
    let BodyNeckPoint = {
        x: parseFloat(BodySVG.getElementsByClassName("Fennimal_body_neck_point")[0].getAttribute("cx")),
        y: parseFloat(BodySVG.getElementsByClassName("Fennimal_body_neck_point")[0].getAttribute("cy"))
    };
    let HeadNeckPoint = {
        x: parseFloat(HeadSVG.getElementsByClassName("Fennimal_head_neck_point")[0].getAttribute("cx")),
        y: parseFloat(HeadSVG.getElementsByClassName("Fennimal_head_neck_point")[0].getAttribute("cy"))
    };

    // Apply structural position strictly to HeadGroup so the animation loop doesn't delete it!
    let translate_x_delta = BodyNeckPoint.x - HeadNeckPoint.x;
    let translate_y_delta = BodyNeckPoint.y - HeadNeckPoint.y;
    HeadGroup.style.transform = `translate(${translate_x_delta}px, ${translate_y_delta}px)`;

    // Make sure the Animation loop rotates the head pivoting exactly at the neck joint!
    HeadAnimationGroup.style.transformOrigin = `${HeadNeckPoint.x}px ${HeadNeckPoint.y}px`;

    HeadScaleGroup.style.transformOrigin = `${HeadNeckPoint.x}px ${HeadNeckPoint.y}px`;
    HeadScaleGroup.style.transform = `scale(${head_scale_factor})`;

     */

    // ----------------------------------------------------
    // 2. HEAD SETUP (The "Wrapper Group" Fix)
    // ----------------------------------------------------
    let HeadGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');

    // 1. JS CONTROLS THIS: The target for the breathing/gaze tracking render loop
    let HeadAnimationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    HeadAnimationGroup.classList.add("Fennimal_head"); // Keeps your hover effects working!

    // 2. CSS CONTROLS THIS: The target for the Curious Tilt and Drop Shadow
    let HeadTiltGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    HeadTiltGroup.classList.add("Fennimal_head_tilt");
    HeadTiltGroup.style.filter = "drop-shadow(0px 10px 4px rgba(0, 0, 0, 0.45))";

    // 3. SCALE CONTROLS THIS: Holds the scale factor
    let HeadScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');

    // The New Assembly Order
    HeadGroup.appendChild(HeadAnimationGroup);
    HeadAnimationGroup.appendChild(HeadTiltGroup); // Tucked inside!
    HeadTiltGroup.appendChild(HeadScaleGroup);
    ScaleGroup.appendChild(HeadGroup);

    let HeadSVG = document.getElementById("Fennimal_head_" + FenObj.head).cloneNode(true);
    HeadSVG.style.display = "inherit";
    set_Fennimal_color_classes(HeadSVG); // Your dynamic color fix
    HeadScaleGroup.appendChild(HeadSVG);

    // --- Head Math ---
    let BodyCenterPoint = {
        x: parseFloat(BodySVG.getElementsByClassName("Fennimal_body_center_point")[0].getAttribute("cx")),
        y: parseFloat(BodySVG.getElementsByClassName("Fennimal_body_center_point")[0].getAttribute("cy"))
    };
    let BodyNeckPoint = {
        x: parseFloat(BodySVG.getElementsByClassName("Fennimal_body_neck_point")[0].getAttribute("cx")),
        y: parseFloat(BodySVG.getElementsByClassName("Fennimal_body_neck_point")[0].getAttribute("cy"))
    };
    let HeadNeckPoint = {
        x: parseFloat(HeadSVG.getElementsByClassName("Fennimal_head_neck_point")[0].getAttribute("cx")),
        y: parseFloat(HeadSVG.getElementsByClassName("Fennimal_head_neck_point")[0].getAttribute("cy"))
    };

    let translate_x_delta = BodyNeckPoint.x - HeadNeckPoint.x;
    let translate_y_delta = BodyNeckPoint.y - HeadNeckPoint.y;
    HeadGroup.style.transform = `translate(${translate_x_delta}px, ${translate_y_delta}px)`;

    // Apply the exact same pivot point to BOTH the JS group and the new CSS group!
    HeadAnimationGroup.style.transformOrigin = `${HeadNeckPoint.x}px ${HeadNeckPoint.y}px`;
    HeadTiltGroup.style.transformOrigin = `${HeadNeckPoint.x}px ${HeadNeckPoint.y}px`;

    HeadScaleGroup.style.transformOrigin = `${HeadNeckPoint.x}px ${HeadNeckPoint.y}px`;
    HeadScaleGroup.style.transform = `scale(${head_scale_factor})`;

    // ----------------------------------------------------
    // 3. HAT SETUP
    // ----------------------------------------------------
    if (typeof FenObj.hat !== "undefined") {
        if (HeadSVG.getElementsByClassName("Fennimal_head_hat_point").length > 0) {
            let HatGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
            let HatScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');

            HatGroup.classList.add("hat");
            HatGroup.appendChild(HatScaleGroup);
            HeadScaleGroup.appendChild(HatGroup);

            let HatSVG = document.getElementById("hat_" + FenObj.hat).cloneNode(true);
            HatSVG.style.display = "inherit";
            HatScaleGroup.appendChild(HatSVG);

            let HeadHatPoint = {
                x: parseFloat(HeadSVG.getElementsByClassName("Fennimal_head_hat_point")[0].getAttribute("cx")),
                y: parseFloat(HeadSVG.getElementsByClassName("Fennimal_head_hat_point")[0].getAttribute("cy"))
            };
            let HatConnectionPoint = {
                x: parseFloat(HatSVG.getElementsByClassName("hat_attachment_point")[0].getAttribute("cx")),
                y: parseFloat(HatSVG.getElementsByClassName("hat_attachment_point")[0].getAttribute("cy"))
            };

            let hat_translate_x_delta = HeadHatPoint.x - HatConnectionPoint.x;
            let hat_translate_y_delta = HeadHatPoint.y - HatConnectionPoint.y;
            HatGroup.style.transform = `translate(${hat_translate_x_delta}px, ${hat_translate_y_delta}px)`;

            HatScaleGroup.style.transformOrigin = `${HatConnectionPoint.x}px ${HatConnectionPoint.y}px`;

            // THE HAT SCALE FIX: Because it inherits the head's scale, we divide the original target
            // scale (2) by the head's scale to guarantee it stays the exact size you intended!
            HatScaleGroup.style.transform = `scale(${2 / head_scale_factor})`;
        } else {
            console.warn("Attempting to place a hat on an invalid Fennimal.");
        }
    }

    // ----------------------------------------------------
    // 4. COLORING & FINISHING
    // ----------------------------------------------------
    if (outline_only) {
        TranslationGroup.style.fill = "black";
        set_fill_for_all_elements_in_array(TranslationGroup.querySelectorAll("*"), "black");
        set_stroke_color_for_all_elements_in_array(TranslationGroup.querySelectorAll("*"), "black");
    } else {
        // [Your existing color assignment logic...]
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_primary_color"), FenObj.ColorScheme.Head.primary_color);
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_secondary_color"), FenObj.ColorScheme.Head.secondary_color)
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_tertiary_color"), FenObj.ColorScheme.Head.tertiary_color)

        set_fill_for_all_elements_in_array(BodyGroup.getElementsByClassName("Fennimal_primary_color"), FenObj.ColorScheme.Head.primary_color);
        set_fill_for_all_elements_in_array(BodyGroup.getElementsByClassName("Fennimal_secondary_color"), FenObj.ColorScheme.Head.secondary_color)
        set_fill_for_all_elements_in_array(BodyGroup.getElementsByClassName("Fennimal_tertiary_color"), FenObj.ColorScheme.Head.tertiary_color)

        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_eye_color"), FenObj.ColorScheme.Head.eye_color)
    }

    ScaleGroup.style.transformOrigin = `${BodyCenterPoint.x}px ${BodyCenterPoint.y}px`;
    ScaleGroup.classList.add("Fennimal_scale_group");
    TranslationGroup.classList.add("Fennimal_translation_group");

    apply_Fennimal_animation_pivots(TranslationGroup);

    return TranslationGroup;
}

function create_Fennimal_SVG_object_head_only(FenObj, outline_only) {
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
    if (outline_only) {
        TranslationGroup.style.fill = "black"
        set_fill_for_all_elements_in_array(TranslationGroup.querySelectorAll("*"), "black")
    } else {
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_primary_color"), FenObj.ColorScheme.Head.primary_color)
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_secondary_color"), FenObj.ColorScheme.Head.secondary_color)
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_tertiary_color"), FenObj.ColorScheme.Head.tertiary_color)
        set_fill_for_all_elements_in_array(HeadGroup.getElementsByClassName("Fennimal_eye_color"), FenObj.ColorScheme.Head.eye_color)
    }

    //Labelling some key groups for easy access
    ScaleGroup.classList.add("Fennimal_scale_group")
    TranslationGroup.classList.add("Fennimal_translation_group")

    apply_Fennimal_animation_pivots(TranslationGroup);

    //Returning
    return (TranslationGroup)
}

// NOTE: sets focus after delay, but will not work after focus lost...
function add_keyboard_shortcuts_to_object(Object, arr_keys, focusdelay, executefunction) {

    Object.tabIndex = "0"
    setTimeout(function () {
        Object.focus()
    }, focusdelay)

    Object.onkeydown = function (event) {

        if (arr_keys.includes(event.key)) {

            executefunction()
        }
    }
}

//Some parsing functions
function parse_float_from_string(string) {
    // Use regex to find digits, optional minus sign, and optional decimal point
    const match = string.match(/-?\d+(\.\d+)?/);

    // If a match is found, convert the string match to a Number
    return match ? Number(match[0]) : null;
}

function parse_x_and_y_from_transform_string(str){
    let broken = str.split(",")
    return({x:parse_float_from_string(broken[0]), y: parse_float_from_string(broken[1])})
}

function rename_object_key(Obj, old_key_name, new_key_name) {
    if(Object.keys(Obj).includes(old_key_name) ){
        if(Object.keys(Obj).includes(new_key_name) ){
            console.warn("Overwriting property when renaming: " + old_key_name + "," + new_key_name)
        }

        let temp = Obj[old_key_name]
        Obj[new_key_name] = temp
        delete Obj[old_key_name]
    }

}
function search_array_of_objects_for_first_with_property_value(Arr, property, value){
    for(let i = 0; i < Arr.length; i++){
        if(Arr[i][property] === value){
            return Arr[i]
        }
    }
    return false
}

function remove_all_elements_from_A_if_the_same_in_B(ObjA, ObjB, ignore_arr){
    for(let key in ObjA){
        if(! ignore_arr.includes(key)){
            if(key in ObjB){
                if(ObjA[key] === ObjB[key]){
                    delete ObjA[key]
                }
            }
        }
    }
}

function get_width_of_DOM_in_SVG_space(DOMElem){
    const svg = DOMElem.closest('svg'); // Find the parent SVG

// 1. Get the rendered width of the HTML element in pixels
    const htmlWidthPx = DOMElem.getBoundingClientRect().width;

// 2. Get the SVG's internal coordinate width (from viewBox)
    const svgInternalWidth = svg.viewBox.baseVal.width;

// 3. Get the SVG's actual rendered width on screen
    const svgScreenWidth = svg.getBoundingClientRect().width;

// 4. Calculate the scale and the final SVG-space width
    const scale = svgInternalWidth / svgScreenWidth;
    const widthInSvgSpace = htmlWidthPx * scale;

    return(widthInSvgSpace );
}

function capitalize_first_letter_in_string(str){
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}

/**
 * Set an SVG <image> href to a location PNG.
 * Tries Region_location.png (lowercase), then Region_Location.png if that 404s
 * (GitHub Pages is case-sensitive; Windows is not).
 */
function set_location_background_image(imgElem, regionName, locationName) {
    let region = String(regionName || "");
    let loc = String(locationName || "");
    let primary = `./Locations/${region}_${loc.toLowerCase()}.png`;
    let fallback = `./Locations/${region}_${capitalize_first_letter_in_string(loc.toLowerCase())}.png`;

    // assetUrl is defined in 0_Loader.js; fall back to raw path if unavailable.
    let withBust = (path) => (typeof assetUrl === "function" ? assetUrl(path) : path);

    imgElem.setAttribute("href", withBust(primary));
    if (primary === fallback) return;

    let onError = () => {
        imgElem.removeEventListener("error", onError);
        console.warn(`Location image not found: ${primary}; retrying ${fallback}`);
        imgElem.setAttribute("href", withBust(fallback));
    };
    imgElem.addEventListener("error", onError);
}

function copy_scale_and_move_object_to_position(Elem,Parent, center_x, center_y, scale_factor, optional_new_id){
    //Copying the object and creating the group structure
    let SVG = Elem.cloneNode(true);
    let ZeroTranslationGroup = create_SVG_group(0,0,"zero_translate_group",undefined);
    let MainPosTranslationGroup = create_SVG_group(0,0,"main_translate_group",undefined);
    let ScaleGroup = create_SVG_group(0,0,"scale_group",undefined);

    ZeroTranslationGroup.appendChild(SVG);
    ScaleGroup.appendChild(ZeroTranslationGroup)
    MainPosTranslationGroup.appendChild(ScaleGroup)
    Parent.appendChild(MainPosTranslationGroup);

    //Zero the coordinates of the object first
    SVG.style.display = "inherit"
    const BaseCenter = getSVGInternalCenter(ZeroTranslationGroup)
    ZeroTranslationGroup.style.transform = "translate(" + (-BaseCenter.x) + "px, " + (-BaseCenter.y) + "px)";

    //Setting scale
    if(typeof scale_factor !== "undefined" ){
        ScaleGroup.style.transform = "scale(" + scale_factor + ")"
    }

    //Translate the entire group to the correct x and y
    MainPosTranslationGroup.style.transform = "translate(" + center_x + "px, " + center_y+ "px)";

    if(typeof optional_new_id !== "undefined"){
        MainPosTranslationGroup.id = optional_new_id
    }



    return MainPosTranslationGroup
}

/**
 * Show/hide baked-in `.box_decoration` groups on a toybox clone according to WorldState.
 * Default (never set / false): decorations hidden.
 */
function apply_toybox_decoration_visibility_to_element(rootElem, boxtype) {
    if (!rootElem) return false;
    let decorated = false;
    if (typeof WorldState !== "undefined" && WorldState.get_toybox_is_decorated) {
        decorated = WorldState.get_toybox_is_decorated(boxtype) === true;
    }
    rootElem.querySelectorAll(".box_decoration").forEach((el) => {
        el.style.transition = "";
        el.style.opacity = decorated ? "1" : "0";
        el.style.visibility = decorated ? "visible" : "hidden";
        el.style.pointerEvents = "none";
    });
    return decorated;
}

function get_all_values_in_array_of_objects(key, Arr){
    let Out = []
    for(let i = 0; i < Arr.length; i++){
        if(typeof Arr[i][key] !== "undefined"){
            Out.push(Arr[i][key]);
        }
    }
    return Out;
}

function set_toy_color_scheme(ToySVG, toy_type, use_alternate_color){
    if (!ToySVG || !GenParam.ToyData[toy_type]) return;
    let LightElem = ToySVG.getElementsByClassName("item_col_light")
    for(let i =0;i<LightElem.length;i++){
        if(use_alternate_color === true){
            LightElem[i].style.fill = GenParam.ToyData[toy_type].AlternateColorScheme.light_color
        }else{
            LightElem[i].style.fill = GenParam.ToyData[toy_type].ColorScheme.light_color
        }
    }

    let DarkElem = ToySVG.getElementsByClassName("item_col_dark")
    for(let i =0;i<DarkElem.length;i++){
        if(use_alternate_color === true){
            DarkElem[i].style.fill = GenParam.ToyData[toy_type].AlternateColorScheme.dark_color
        }else{
            DarkElem[i].style.fill = GenParam.ToyData[toy_type].ColorScheme.dark_color
        }
    }
}

function set_box_color_scheme(BoxSVG, box_type){
    if (!BoxSVG || !GenParam.BoxColorSchemes || !GenParam.BoxColorSchemes[box_type]) return;
    let scheme = GenParam.BoxColorSchemes[box_type];

    let LightElem = BoxSVG.getElementsByClassName("box_color_light");
    for (let i = 0; i < LightElem.length; i++) {
        LightElem[i].style.fill = scheme.light_color;
    }
    let DarkElem = BoxSVG.getElementsByClassName("box_color_dark");
    for (let i = 0; i < DarkElem.length; i++) {
        DarkElem[i].style.fill = scheme.dark_color;
    }
    let AccentElem = BoxSVG.getElementsByClassName("box_color_accent");
    for (let i = 0; i < AccentElem.length; i++) {
        AccentElem[i].style.fill = scheme.accent_color;
    }
}

/** Paint every loaded toy_* template from current ToyData ColorSchemes (call once at experiment start). */
function paint_all_toy_color_templates() {
    if (!GenParam || !GenParam.ToyData) return;
    for (let toy_id in GenParam.ToyData) {
        let template = document.getElementById("toy_" + toy_id);
        if (template) set_toy_color_scheme(template, toy_id, false);
    }
}

/** Paint every box template that has an entry in BoxColorSchemes (call once after color assignment). */
function paint_all_box_color_templates() {
    if (!GenParam || !GenParam.BoxColorSchemes) return;
    for (let box_id in GenParam.BoxColorSchemes) {
        let template = document.getElementById("toybox_" + box_id);
        if (template) set_box_color_scheme(template, box_id);
    }
}

/**
 * Re-apply a previously saved colorAssignment overview (Layer 1 session restore).
 * Expects the object returned by assign_experiment_item_colors().
 */
function apply_saved_color_assignment(overview) {
    if (!overview || !GenParam) return false;

    if (overview.boxes && typeof overview.boxes === "object") {
        GenParam.BoxColorSchemes = {};
        for (let box_id in overview.boxes) {
            let box = overview.boxes[box_id];
            GenParam.BoxColorSchemes[box_id] = {
                hue_family: box.hue_family,
                accent_material: box.accent_material,
                light_color: box.light_color,
                dark_color: box.dark_color,
                accent_color: box.accent_color
            };
        }
    }

    if (overview.toys && typeof overview.toys === "object") {
        for (let toy_id in overview.toys) {
            let toy = overview.toys[toy_id];
            if (!GenParam.ToyData[toy_id]) {
                console.warn("apply_saved_color_assignment: no ToyData for toy '" + toy_id + "'");
                continue;
            }
            GenParam.ToyData[toy_id].ColorScheme = {
                light_color: toy.light_color,
                dark_color: toy.dark_color
            };
        }
    }

    return true;
}

function get_region_hue_family(region_name) {
    if (!region_name || !GenParam.RegionData[region_name]) return null;
    let desc = GenParam.RegionData[region_name].color_description;
    if (desc && GenParam.ColorHuePalettes[desc]) return desc;
    if (region_name === "Home") return "gray";
    return null;
}

function hue_family_angular_distance(hue_a, hue_b) {
    if (hue_a === hue_b) return 0;
    let pa = GenParam.ColorHuePalettes[hue_a];
    let pb = GenParam.ColorHuePalettes[hue_b];
    if (!pa || !pb) return 180;
    // Gray is treated as maximally distinct from chromatic hues.
    if (pa.angle === null || pb.angle === null) return 180;
    let d = Math.abs(pa.angle - pb.angle) % 360;
    return d > 180 ? 360 - d : d;
}

/**
 * Assign box + toy colors for this experiment's Fennimals.
 * Overwrites ToyData[toy].ColorScheme for used toys and fills GenParam.BoxColorSchemes.
 * Returns a serializable overview for DataController.
 *
 * Priorities: (1) boxes distinct (2) toys distinct (3) toy ≠ co-occurring box
 *             (4) box ≠ regions that use it (5) toy ≠ own region (hard).
 */
function assign_experiment_item_colors(fennimalArr) {
    const chromatic_hues = Object.keys(GenParam.ColorHuePalettes).filter(
        (h) => GenParam.ColorHuePalettes[h].angle !== null
    );
    const all_assignable_hues = chromatic_hues.concat(["gray"]);
    const accent_materials = Object.keys(GenParam.ColorAccentMaterials);

    const box_regions = {}; // boxId -> Set of hue families
    const box_toys = {};
    const toy_region = {};
    const toy_box = {};
    const used_regions = [];

    fennimalArr.forEach((fen) => {
        if (fen.region) used_regions.push(fen.region);
        let region_hue = get_region_hue_family(fen.region);
        if (fen.toybox) {
            if (!box_regions[fen.toybox]) box_regions[fen.toybox] = new Set();
            if (!box_toys[fen.toybox]) box_toys[fen.toybox] = new Set();
            if (region_hue) box_regions[fen.toybox].add(region_hue);
            if (fen.toy) box_toys[fen.toybox].add(fen.toy);
        }
        if (fen.toy) {
            toy_region[fen.toy] = region_hue;
            toy_box[fen.toy] = fen.toybox || null;
        }
    });

    const blocked_hues = [...new Set(
        used_regions.map(get_region_hue_family).filter(Boolean)
    )];
    const free_hues = all_assignable_hues.filter((h) => !blocked_hues.includes(h));
    // Prefer free hues, but gray is always available as a fallback identity.
    if (!free_hues.includes("gray")) free_hues.push("gray");

    const boxes = Object.keys(box_regions);
    const toys = Object.keys(toy_region);

    function min_distance_to_set(hue, other_hues) {
        if (!other_hues.length) return 180;
        return Math.min(...other_hues.map((o) => hue_family_angular_distance(hue, o)));
    }

    function best_hue_from_candidates(candidates, avoid_hues, already_assigned) {
        let pool = candidates.length ? candidates : all_assignable_hues;
        // Soft preference: drop hard-avoid hues if anything remains.
        let filtered = pool.filter((h) => !avoid_hues.includes(h));
        if (!filtered.length) filtered = pool.slice();

        let best = null;
        let best_score = -1;
        // Shuffle ties for participant-level variation.
        shuffleArray(filtered).forEach((h) => {
            let score = min_distance_to_set(h, already_assigned.concat(avoid_hues));
            // Prefer free hues slightly when scores tie.
            if (free_hues.includes(h)) score += 0.5;
            if (score > best_score) {
                best_score = score;
                best = h;
            }
        });
        return best || "gray";
    }

    // --- Step 1: box dominant hues (P1 + P4) ---
    // Prefer free hues, but also allow blocked hues that are not forbidden for *this* box
    // (so a warm-only free pool can still pair with blue/teal/etc. from unused-on-this-box regions).
    // Reject same perceptual cluster twice (e.g. sand+red) and pairs below min angular distance.
    const MIN_BOX_HUE_DIST = GenParam.ColorAlgorithmMinBoxHueDistance || 75;

    function box_hue_cluster(hue) {
        let p = GenParam.ColorHuePalettes[hue];
        return (p && p.cluster) ? p.cluster : "other";
    }

    function score_box_assignment(assignment) {
        let hues = Object.values(assignment);
        let min_pair = 180;
        let sum_pair = 0;
        let free_count = 0;
        let clusters = {};

        for (let i = 0; i < hues.length; i++) {
            if (free_hues.includes(hues[i])) free_count++;
            let c = box_hue_cluster(hues[i]);
            // Neutral (gray) may repeat; warm/cool may not.
            if (c !== "neutral") {
                clusters[c] = (clusters[c] || 0) + 1;
                if (clusters[c] > 1) {
                    return { valid: false, min_pair: -1, sum_pair: -1, free_count: 0 };
                }
            }
            for (let j = i + 1; j < hues.length; j++) {
                let d = hue_family_angular_distance(hues[i], hues[j]);
                min_pair = Math.min(min_pair, d);
                sum_pair += d;
            }
        }
        if (hues.length < 2) min_pair = 180;
        if (min_pair < MIN_BOX_HUE_DIST) {
            return { valid: false, min_pair: min_pair, sum_pair: sum_pair, free_count: free_count };
        }
        return { valid: true, min_pair: min_pair, sum_pair: sum_pair, free_count: free_count };
    }

    function is_better_box_score(sc, best) {
        if (!sc.valid) return false;
        if (!best.valid) return true;
        if (sc.min_pair !== best.min_pair) return sc.min_pair > best.min_pair;
        if (sc.free_count !== best.free_count) return sc.free_count > best.free_count;
        return sc.sum_pair > best.sum_pair;
    }

    function enumerate_box_assignments() {
        let candidate_lists = boxes.map((b) => {
            let forbidden = [...box_regions[b]];
            // Union of free + any assignable hue not forbidden for this box (cool blocked hues OK).
            let list = all_assignable_hues.filter((h) => !forbidden.includes(h));
            if (!list.length) list = ["gray"];
            // Stable preference: shuffle within free vs non-free so ties vary, but both are searched.
            let preferred = shuffleArray(list.filter((h) => free_hues.includes(h)));
            let other = shuffleArray(list.filter((h) => !free_hues.includes(h)));
            return preferred.concat(other);
        });

        let best_assignment = null;
        let best_score = { valid: false, min_pair: -1, sum_pair: -1, free_count: -1 };

        function recurse(idx, current) {
            if (idx === boxes.length) {
                let sc = score_box_assignment(current);
                if (is_better_box_score(sc, best_score)) {
                    best_score = sc;
                    best_assignment = Object.assign({}, current);
                }
                return;
            }
            let box = boxes[idx];
            candidate_lists[idx].forEach((hue) => {
                current[box] = hue;
                recurse(idx + 1, current);
            });
        }

        if (boxes.length === 0) return {};
        recurse(0, {});

        // Last resort if nothing met the distance/cluster rules: fall back to prior max-distance pick.
        if (!best_assignment) {
            let loose_best = null;
            let loose_score = { min_pair: -1, sum_pair: -1 };
            function loose_recurse(idx, current) {
                if (idx === boxes.length) {
                    let hues = Object.values(current);
                    let min_pair = 180;
                    let sum_pair = 0;
                    for (let i = 0; i < hues.length; i++) {
                        for (let j = i + 1; j < hues.length; j++) {
                            let d = hue_family_angular_distance(hues[i], hues[j]);
                            min_pair = Math.min(min_pair, d);
                            sum_pair += d;
                        }
                    }
                    if (hues.length < 2) min_pair = 180;
                    if (min_pair > loose_score.min_pair ||
                        (min_pair === loose_score.min_pair && sum_pair > loose_score.sum_pair)) {
                        loose_score = { min_pair, sum_pair };
                        loose_best = Object.assign({}, current);
                    }
                    return;
                }
                candidate_lists[idx].forEach((hue) => {
                    current[boxes[idx]] = hue;
                    loose_recurse(idx + 1, current);
                });
            }
            loose_recurse(0, {});
            console.warn("Color algorithm: no box assignment met min distance/cluster rules; using max-distance fallback.");
            return loose_best || {};
        }
        return best_assignment;
    }

    const box_hues = enumerate_box_assignments();

    // --- Box accents: unique materials ---
    const box_accents = {};
    const accent_pool = shuffleArray(accent_materials.slice());
    boxes.forEach((b, i) => {
        box_accents[b] = accent_pool[i % accent_pool.length];
    });

    // Write BoxColorSchemes
    GenParam.BoxColorSchemes = {};
    boxes.forEach((b) => {
        let hue = box_hues[b] || "gray";
        let palette = GenParam.ColorHuePalettes[hue];
        let accent_key = box_accents[b];
        GenParam.BoxColorSchemes[b] = {
            hue_family: hue,
            accent_material: accent_key,
            light_color: palette.light_color,
            dark_color: palette.dark_color,
            accent_color: GenParam.ColorAccentMaterials[accent_key].accent_color,
        };
    });

    // --- Step 2: toys (P2 + P3 + P5 hard) ---
    // Each toy gets a dual-tone pair: dark = primary identity hue, light = a second hue
    // far from the primary (and still avoiding own region / own box).
    // Toy fills use muted toy_* palette entries so they read softer than boxes.
    const MIN_TOY_DUAL = GenParam.ColorAlgorithmMinToyDualToneDistance || 90;
    const MIN_TOY_PAIR = GenParam.ColorAlgorithmMinToyPairwiseDistance || 50;
    const toy_hues = {};
    const toy_secondary_hues = {};
    // Track every hue already used on any toy (primary or secondary) to avoid teal-on-teal clashes.
    const assigned_toy_hues = [];

    function toy_palette_colors(hue) {
        let p = GenParam.ColorHuePalettes[hue];
        return {
            light_color: p.toy_light_color || p.light_color,
            dark_color: p.toy_dark_color || p.dark_color,
        };
    }

    // Least-flexible first: fewer candidate hues after hard constraints.
    let toy_order = toys.slice().sort((a, b) => {
        let forbid_a = [toy_region[a], box_hues[toy_box[a]]].filter(Boolean);
        let forbid_b = [toy_region[b], box_hues[toy_box[b]]].filter(Boolean);
        let cand_a = all_assignable_hues.filter((h) => !forbid_a.includes(h)).length;
        let cand_b = all_assignable_hues.filter((h) => !forbid_b.includes(h)).length;
        return cand_a - cand_b;
    });

    function pick_toy_secondary_hue(primary_hue, hard_avoid, used_hues) {
        let avoid = hard_avoid.concat([primary_hue]);
        let candidates = all_assignable_hues.filter((h) => !avoid.includes(h));
        if (!candidates.length) {
            candidates = all_assignable_hues.filter((h) => h !== primary_hue);
        }

        let best = null;
        let best_score = -1;
        shuffleArray(candidates).forEach((h) => {
            let d_primary = hue_family_angular_distance(h, primary_hue);
            if (d_primary < MIN_TOY_DUAL && candidates.some(
                (c) => hue_family_angular_distance(c, primary_hue) >= MIN_TOY_DUAL
            )) {
                return;
            }
            // Prefer hues not already used on other toys (and not near them).
            let d_others = min_distance_to_set(h, used_hues);
            if (d_others < MIN_TOY_PAIR && candidates.some(
                (c) => !avoid.includes(c) && min_distance_to_set(c, used_hues) >= MIN_TOY_PAIR
                    && hue_family_angular_distance(c, primary_hue) >= MIN_TOY_DUAL
            )) {
                return;
            }
            let score = d_primary + d_others;
            let p_cluster = GenParam.ColorHuePalettes[primary_hue]
                ? GenParam.ColorHuePalettes[primary_hue].cluster : null;
            let h_cluster = GenParam.ColorHuePalettes[h]
                ? GenParam.ColorHuePalettes[h].cluster : null;
            if (p_cluster && h_cluster && p_cluster !== h_cluster) score += 25;
            if (used_hues.includes(h)) score -= 80;
            if (score > best_score) {
                best_score = score;
                best = h;
            }
        });
        return best || (primary_hue === "gray" ? "yellow" : "gray");
    }

    toy_order.forEach((toy_id) => {
        let hard_avoid = [];
        if (toy_region[toy_id]) hard_avoid.push(toy_region[toy_id]); // P5
        if (toy_box[toy_id] && box_hues[toy_box[toy_id]]) hard_avoid.push(box_hues[toy_box[toy_id]]); // P3

        let candidates = all_assignable_hues.filter((h) => !hard_avoid.includes(h));
        // Prefer hues far from already-assigned toy hues (primary + secondary of others).
        let primary = best_hue_from_candidates(candidates, hard_avoid, assigned_toy_hues);
        if (hard_avoid.includes(primary)) {
            primary = all_assignable_hues.find((h) => !hard_avoid.includes(h)) || "gray";
        }
        // Soft-reject primaries that collide with an already-used toy hue when alternatives exist.
        if (assigned_toy_hues.includes(primary) || min_distance_to_set(primary, assigned_toy_hues) < MIN_TOY_PAIR) {
            let alt = shuffleArray(candidates.slice()).find((h) =>
                !assigned_toy_hues.includes(h) && min_distance_to_set(h, assigned_toy_hues) >= MIN_TOY_PAIR
            );
            if (alt) primary = alt;
        }

        let secondary = pick_toy_secondary_hue(primary, hard_avoid, assigned_toy_hues);

        toy_hues[toy_id] = primary;
        toy_secondary_hues[toy_id] = secondary;
        assigned_toy_hues.push(primary, secondary);

        let dark = toy_palette_colors(primary);
        let light = toy_palette_colors(secondary);
        if (GenParam.ToyData[toy_id]) {
            GenParam.ToyData[toy_id].ColorScheme = {
                light_color: light.light_color,
                dark_color: dark.dark_color,
            };
        } else {
            console.warn("assign_experiment_item_colors: no ToyData for toy '" + toy_id + "'");
        }
    });

    return {
        algorithm: "hue_space_v1",
        used_regions: [...new Set(used_regions)],
        blocked_hues: blocked_hues.slice(),
        free_hues: free_hues.slice(),
        boxes: boxes.reduce((acc, b) => {
            acc[b] = {
                hue_family: GenParam.BoxColorSchemes[b].hue_family,
                accent_material: GenParam.BoxColorSchemes[b].accent_material,
                light_color: GenParam.BoxColorSchemes[b].light_color,
                dark_color: GenParam.BoxColorSchemes[b].dark_color,
                accent_color: GenParam.BoxColorSchemes[b].accent_color,
                regions_using_box: [...box_regions[b]],
                toys_in_box: [...(box_toys[b] || [])],
            };
            return acc;
        }, {}),
        toys: toys.reduce((acc, t) => {
            acc[t] = {
                primary_hue: toy_hues[t],
                secondary_hue: toy_secondary_hues[t],
                light_color: GenParam.ToyData[t] ? GenParam.ToyData[t].ColorScheme.light_color : null,
                dark_color: GenParam.ToyData[t] ? GenParam.ToyData[t].ColorScheme.dark_color : null,
                own_region_hue: toy_region[t],
                own_box: toy_box[t],
                own_box_hue: toy_box[t] ? box_hues[toy_box[t]] : null,
            };
            return acc;
        }, {}),
    };
}

//Randomization functions
function pseudo_randomize_order_of_ids_no_back_to_back(Arr_ids, num_samples){
    //The first element can be any ordering
    let OutArr = [shuffleArray(JSON.parse(JSON.stringify(Arr_ids)))];

    if(num_samples > 1){
        for(let i =1;i<num_samples;i++){
            const end_of_last = OutArr[i-1][OutArr[i-1].length -1]
            const remainig_elem = shuffleArray(JSON.parse(JSON.stringify(Arr_ids)))
            remainig_elem.splice(remainig_elem.indexOf(end_of_last), 1)
            const new_starting_elem = remainig_elem.shift()
            const following_elem = shuffleArray([remainig_elem, end_of_last].flat())
            OutArr.push([new_starting_elem, following_elem].flat())
        }

    }

    return(OutArr)

}

function get_object_from_array_based_on_value(key,value, Arr, copy, remove_from_parent){
    for(let i =0;i<Arr.length;i++){
        if(Arr[i][key] === value){
            if(copy){
                return(JSON.parse(JSON.stringify(Arr[i])))
            }else{
                if(remove_from_parent){
                    return(Arr.splice(i,1)[0])
                }else{
                    return(Arr[i])
                }
            }
        }
    }
    return(false)
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

MakeObjectDraggableObject = function(ElemParentLayer, MaskLayer, DraggableElem, Target, required_minimum_distance, returnfunc, hooks) {
    hooks = hooks || {};
    let Mask, dragging_is_enabled = false;
    let OriginalParent = DraggableElem.parentNode;

    let current_delta_x = 0;
    let current_delta_y = 0;

    let DragGroup = create_SVG_group(0, 0);
    DragGroup.appendChild(DraggableElem);
    ElemParentLayer.appendChild(DragGroup);

    if (typeof DraggableElem.id === "undefined") {
        DraggableElem.id = "DragControllerTargetID_" + Math.floor(Math.random() * 10000);
    }

    let Outline = create_SVG_outline_of_group_ID(DraggableElem);
    Outline.removeAttribute("stroke");
    let allClonedChildren = Outline.querySelectorAll('*');
    allClonedChildren.forEach(child => child.removeAttribute("stroke"));

    DraggableElem.parentNode.insertBefore(Outline, DraggableElem);
    let OriginalPos = getSVGInternalCenter(DraggableElem);

    function enable_object_draggable() {
        DraggableElem.style.cursor = "pointer";
        Outline.classList.add("focus_on_SVG_outline");
        DraggableElem.onpointerdown = start_dragging;
        dragging_is_enabled = true;
    }

    function disable_object_draggable() {
        DraggableElem.style.cursor = "auto";
        Outline.classList.remove("focus_on_SVG_outline");
        dragging_is_enabled = false;
    }

    function start_dragging() {
        if (dragging_is_enabled) {
            Outline.classList.remove("focus_on_SVG_outline");
            if (typeof hooks.onStart === "function") hooks.onStart(DraggableElem);

            Mask = create_SVG_rect(0, 0, GenParam.SVG_width, GenParam.SVG_height);
            Mask.style.opacity = 0;
            MaskLayer.appendChild(Mask);

            Mask.onpointermove = pointer_moved;
            Mask.onpointerup = release_dragging;
            Mask.onpointerdown = release_dragging;
            Mask.onpointercancel = drag_cancelled;
            Mask.onpointerleave = drag_cancelled;
        }
    }

    function pointer_moved(event) {
        let NewPos = getMousePosition(event);
        current_delta_x = NewPos.x - OriginalPos.x;
        current_delta_y = NewPos.y - OriginalPos.y;

        if (hooks.axis === "x") current_delta_y = 0;
        if (hooks.axis === "y") current_delta_x = 0;
        if (typeof hooks.constrainDelta === "function") {
            let constrained = hooks.constrainDelta(current_delta_x, current_delta_y) || {};
            if (typeof constrained.dx === "number") current_delta_x = constrained.dx;
            if (typeof constrained.dy === "number") current_delta_y = constrained.dy;
        }

        DragGroup.style.transform = `translate(${current_delta_x}px, ${current_delta_y}px)`;
        if (typeof hooks.onMove === "function") {
            hooks.onMove(current_delta_x, current_delta_y, DraggableElem);
        }
    }

    function drag_cancelled() {
        AudioCont.play_sound_effect("rejected");
        current_delta_x = 0;
        current_delta_y = 0;

        if (Mask) Mask.remove();
        disable_object_draggable();

        DragGroup.style.transition = "transform 300ms ease-in-out";
        DragGroup.style.transform = "";

        setTimeout(() => {
            DragGroup.style.transition = "";
            if (typeof hooks.onMiss === "function") {
                // Caller is responsible for re-enabling / recreating drag state.
                hooks.onMiss(DraggableElem);
            } else {
                enable_object_draggable();
            }
        }, 350);
    }

    function release_dragging(event) {
        let dist_to_target = EUDistPoints(getMousePosition(event), getSVGInternalCenter(Target));

        let dropSucceeded;
        if (typeof hooks.validateDrop === "function") {
            dropSucceeded = hooks.validateDrop(dist_to_target, event) === true;
        } else {
            dropSucceeded = dist_to_target < required_minimum_distance;
        }

        if (dropSucceeded) {
            if (Mask) Mask.remove();

            // 1. Move back to the original layer
            OriginalParent.appendChild(DraggableElem);

            // 2. Apply the final dragged transform to the toy itself
            DraggableElem.style.transform += `translate(${current_delta_x}px, ${current_delta_y}px)`;

            // 3. Clean up DragGroup
            DragGroup.remove();
            disable_object_draggable();

            // 4. Execute the callback, passing the element so it can be animated!
            returnfunc(DraggableElem);

        } else {
            // Snaps back if they missed the expanded drop zone
            drag_cancelled();
        }
    }

    enable_object_draggable();

    return {
        disable: disable_object_draggable,
        enable: enable_object_draggable,
        destroy: function() {
            disable_object_draggable();
            DraggableElem.onpointerdown = null;
            if (Mask) Mask.remove();
            if (Outline && Outline.parentNode) Outline.remove();
            // Leave DraggableElem in place; only tear down drag scaffolding.
            if (DragGroup.parentNode && DragGroup.contains(DraggableElem)) {
                OriginalParent.appendChild(DraggableElem);
            }
            if (DragGroup.parentNode) DragGroup.remove();
        }
    };
}

function create_SVG_outline_of_group_ID(Group){
    // 2. Create the <use> element (must use the SVG namespace!)
    // 1. Physically clone the group and all its children
    const outlineGroup = Group.cloneNode(true);

    // 2. Change the ID so you don't have duplicates in the DOM
    outlineGroup.id = Group.id + '-outline';

    // 3. Find EVERY element inside the clone and strip its original styling
    const allChildren = outlineGroup.querySelectorAll('*');
    allChildren.forEach(child => {
        // Strip the hardcoded colors
        child.removeAttribute('stroke');
        child.style.stroke = '';

        // NEW: Strip the hardcoded thicknesses so they can inherit!
        child.removeAttribute('stroke-width');
        child.style.strokeWidth = '';
    });

// 4. (Optional but recommended) Remove the inline JS attributes completely
// and let your CSS class handle everything.

    outlineGroup.setAttribute('stroke-linejoin', 'round'); // Keep this, it makes thick corners look nice
    outlineGroup.setAttribute('class', 'dynamic-outline');

    return(outlineGroup)
}

// Using the rest parameter (...groups) allows you to pass in as many groups as you want
// Example usage: create_SVG_outline_of_multiple_groups(group1, group2, group3)
function create_SVG_outline_of_multiple_groups(...groups) {

    // 1. Create a master wrapper group using the proper SVG namespace
    const combinedOutlineWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // 2. Set the styling attributes on the master wrapper
    combinedOutlineWrapper.setAttribute('class', 'dynamic-outline');
    combinedOutlineWrapper.setAttribute('stroke-linejoin', 'round');

    // Optional: Give the master wrapper a unique ID
    combinedOutlineWrapper.id = 'combined-outline-' + Date.now();

    // 3. Loop through every group passed into the function
    groups.forEach((group, index) => {
        // Clone the group and all its children
        const clonedGroup = group.cloneNode(true);

        // Update the ID to prevent duplicates in the DOM
        clonedGroup.id = (group.id || 'unnamed-group') + '-outline-part-' + index;

        // Find EVERY element inside the clone and strip its original styling
        const allChildren = clonedGroup.querySelectorAll('*');
        allChildren.forEach(child => {
            // Strip the hardcoded colors
            child.removeAttribute('stroke');
            child.style.stroke = '';

            // Strip the hardcoded thicknesses
            child.removeAttribute('stroke-width');
            child.style.strokeWidth = '';

            // Depending on your CSS, you may also want to strip fills here
            // so the inner shapes don't obscure each other.
            // child.removeAttribute('fill');
            // child.style.fill = '';
        });

        // 4. Append the cleaned clone into our master wrapper
        combinedOutlineWrapper.appendChild(clonedGroup);
    });

    // Return the single master wrapper containing all the cloned outlines
    return combinedOutlineWrapper;
}

/**
 * Automates the "Magnetic Drop" into a container using an exact target element.
 */
async function animate_magnetic_drop(ToyElement, TargetCenterpoint, MiddleLayer) {
    return new Promise(resolve => {
        // 1. Lock the toy from further interaction
        ToyElement.style.pointerEvents = "none";
        ToyElement.style.transition = "transform 300ms ease-in-out";

        let svg = ToyElement.ownerSVGElement;

        // 2. Find the exact monitor pixels of the Final Resting Point (the invisible target)
        let targetBox = TargetCenterpoint.getBBox();
        let targetCenter = svg.createSVGPoint();
        targetCenter.x = targetBox.x + (targetBox.width / 2);
        targetCenter.y = targetBox.y + (targetBox.height / 2);

        let globalFinalPt = targetCenter.matrixTransform(TargetCenterpoint.getScreenCTM());

        // Calculate a hover point directly above it (e.g., 120 screen pixels higher)
        let globalHoverPt = svg.createSVGPoint();
        globalHoverPt.x = globalFinalPt.x;
        globalHoverPt.y = globalFinalPt.y - 120;

        // Convert the hover pixels into the toy's CURRENT local layer coordinates
        let currentLocalHover = globalHoverPt.matrixTransform(ToyElement.parentNode.getScreenCTM().inverse());

        let toyBox = ToyElement.getBBox();
        let toyCx = toyBox.x + (toyBox.width / 2);
        let toyCy = toyBox.y + (toyBox.height / 2);

        // Animate the glide to hover directly above the box
        ToyElement.style.transform = `translate(${currentLocalHover.x - toyCx}px, ${currentLocalHover.y - toyCy}px)`;

        setTimeout(() => {
            // 3. THE HANDOFF
            MiddleLayer.appendChild(ToyElement);

            // Convert the exact final point and hover point into the NEW middle layer's space
            let newLocalFinal = globalFinalPt.matrixTransform(MiddleLayer.getScreenCTM().inverse());
            let newLocalHover = globalHoverPt.matrixTransform(MiddleLayer.getScreenCTM().inverse());

            // Instantly apply the hover transform in the new layer so it doesn't visually jump
            ToyElement.style.transition = "none";
            ToyElement.style.transform = `translate(${newLocalHover.x - toyCx}px, ${newLocalHover.y - toyCy}px)`;

            // 4. THE DROP
            // Force a browser reflow so the instant transform locks in
            void ToyElement.getBoundingClientRect();

            ToyElement.style.transition = "transform 300ms ease-in";

            // Drop to the EXACT intended target center!
            ToyElement.style.transform = `translate(${newLocalFinal.x - toyCx}px, ${newLocalFinal.y - toyCy}px)`;

            setTimeout(() => {
                resolve();
            }, 350);

        }, 350); // wait for hover to finish
    });
}

/**
 * Shared logic for dropping a toy into a box, updating world state, and closing the box.
 */
async function shared_toy_drop_sequence(DroppedToyElement, BoxMod, BasicsMod, PartnerMod, FenObj, finish_callback) {
    // Grab the exact target from the specific box
    let boxTarget = BoxMod.BoxTop.getElementsByClassName("box_target_centerpoint")[0];

    // 1. Execute the Magnetic Drop (it will perfectly center on the boxTarget)
    await animate_magnetic_drop(
        DroppedToyElement,
        boxTarget,
        BasicsMod.ItemLayers.Plus1
    );

    // 2. Update Global World State
    WorldState.change_toybox_contents(FenObj.toybox, FenObj.toy);
    if (PartnerMod.is_present) {
        WorldState.change_partner_belief_in_box_contents(FenObj.toybox, FenObj.toy);
    }

    // Restore box hit-testing so the participant can click to close (toy_to_box clears this while open).
    if (BoxMod && typeof BoxMod.set_pointer_events_enabled === "function") {
        BoxMod.set_pointer_events_enabled(true);
    }

    // 3. Branching Logic: Who closes the box?
    if (PartnerMod.is_present) {
        Interface.Prompt.show_message(PartnerMod.partnername + " closes the " + BoxMod.boxname);
        await PartnerMod.move_to_element_and_act(BoxMod.BoxBase, () => BoxMod.close_box());
        finish_callback();
    } else {
        BoxMod.wait_for_user_click("close", () => finish_callback());
    }
}

/**
 * Cartoon confetti burst used by broken-toy repair and ask_toy success.
 * Pieces clean themselves up; resolve waits only for the outward pop.
 */
function spawn_confetti_burst(ParentLayer, centerX, centerY, options = {}) {
    const colors = options.colors || ['#FF3B30', '#4CD964', '#007AFF', '#FFCC00', '#AF52DE'];
    const numConfetti = options.count != null ? options.count : 24;
    const insertBefore = options.insertBefore || null;
    const awaitPopMs = options.awaitPopMs != null ? options.awaitPopMs : 700;

    for (let i = 0; i < numConfetti; i++) {
        let shapeType = Math.floor(Math.random() * 3);
        let confetti;

        if (shapeType === 0) {
            confetti = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            let w = 25 + Math.random() * 35;
            let h = 20 + Math.random() * 30;
            confetti.setAttribute('width', w);
            confetti.setAttribute('height', h);
            confetti.setAttribute('x', -w / 2);
            confetti.setAttribute('y', -h / 2);
        } else if (shapeType === 1) {
            confetti = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            let r = 12 + Math.random() * 18;
            confetti.setAttribute('r', r);
            confetti.setAttribute('cx', 0);
            confetti.setAttribute('cy', 0);
        } else {
            confetti = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            confetti.setAttribute('points', '0,-25 25,20 -25,20');
        }

        confetti.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);

        let angle = (i / numConfetti) * Math.PI * 2 + (Math.random() * 0.3);
        let dist = 200 + Math.random() * 150;
        let endX = centerX + Math.cos(angle) * dist;
        let endY = centerY + Math.sin(angle) * dist;
        let rot = (Math.random() - 0.5) * 1080;

        confetti.style.transformOrigin = "center";
        confetti.style.transformBox = "fill-box";
        confetti.style.transform = `translate(${centerX}px, ${centerY}px) scale(0)`;

        if (insertBefore && insertBefore.parentNode === ParentLayer) {
            ParentLayer.insertBefore(confetti, insertBefore);
        } else {
            ParentLayer.appendChild(confetti);
        }

        setTimeout(() => {
            confetti.style.transition = "transform 600ms cubic-bezier(0.25, 1, 0.5, 1)";
            confetti.style.transform = `translate(${endX}px, ${endY}px) scale(1) rotate(${rot}deg)`;
        }, 20);

        setTimeout(() => {
            confetti.style.transition = "all 2000ms ease-in";
            confetti.style.transform = `translate(${endX}px, ${endY + 300 + Math.random() * 200}px) scale(0.6) rotate(${rot + 360}deg)`;
            confetti.style.opacity = 0;
            setTimeout(() => confetti.remove(), 2000);
        }, 650);
    }

    return wait(awaitPopMs);
}

/**
 * Reusable bottom toy-choice panel (PartnerBelief / ask_toy).
 * Options are resolved SVG toy ids (e.g. "plane"), not stimulus codes.
 */
class ToyChoiceBar {
    constructor(parentLayer, W, H, options = {}) {
        this.parentLayer = parentLayer;
        this.W = W;
        this.H = H;
        this.bonus_stars = options.bonus_stars || 0;
        this.panel_y_ratio = options.panel_y_ratio != null ? options.panel_y_ratio : 0.76;
        this.btn_size = options.btn_size || 170;
        this.spacing = options.spacing || 25;
        this.UIGroup = null;
        this._selectionHandler = null;
        this._disabled = false;
    }

    static make_toy_static(SVG_Elem, toy_id) {
        let hidden_elements = Array.from(SVG_Elem.getElementsByClassName("prep_element_hidden"));
        hidden_elements.forEach(el => el.style.display = "none");

        if (toy_id === "plane") {
            let prop_alt = SVG_Elem.querySelector(".prop_alt");
            let prop_spinning = SVG_Elem.querySelector(".prop_spinning");
            if (prop_alt) prop_alt.style.display = "none";
            if (prop_spinning) prop_spinning.style.display = "none";
            let prop_base = SVG_Elem.querySelector(".prop_base");
            if (prop_base) { prop_base.style.opacity = 1; prop_base.style.display = "inherit"; }
        } else if (toy_id === "globe") {
            let arcs = Array.from(SVG_Elem.getElementsByClassName("arc"));
            arcs.forEach(a => a.style.display = "none");
            let lights = Array.from(SVG_Elem.querySelectorAll(".light_1, .light_2, .light_3, .light_4"));
            lights.forEach(l => l.style.fill = "#555555");
        } else if (toy_id === "robot") {
            let eye_lights = Array.from(SVG_Elem.getElementsByClassName("eye_light"));
            let antennas = Array.from(SVG_Elem.getElementsByClassName("antenna"));
            eye_lights.forEach(el => el.style.fill = "#444444");
            antennas.forEach(el => el.style.fill = "#444444");
            let switch_on = SVG_Elem.querySelector(".switch_toggle_on");
            if (switch_on) switch_on.style.display = "none";
            let switch_off = SVG_Elem.querySelector(".switch_toggle_off");
            if (switch_off) switch_off.style.opacity = 1;
        } else if (toy_id === "bubblewand") {
            let soap = SVG_Elem.querySelector(".wand_soap");
            if (soap) soap.style.display = "none";
        } else if (toy_id === "jack") {
            let crank_down = SVG_Elem.querySelector(".crank_down");
            if (crank_down) crank_down.style.display = "none";
            let lid_closed = SVG_Elem.querySelector(".box_lid_closed");
            if (lid_closed) lid_closed.style.display = "none";
        }
    }

    destroy() {
        this._disabled = true;
        this._selectionHandler = null;
        if (this.UIGroup && this.UIGroup.parentNode) {
            this.UIGroup.remove();
        }
        this.UIGroup = null;
    }

    async hide(fade_ms = 200) {
        this._disabled = true;
        this._selectionHandler = null;
        if (!this.UIGroup) return;
        this.UIGroup.style.transition = `all ${fade_ms}ms ease-in`;
        this.UIGroup.style.opacity = 0;
        this.UIGroup.style.transform = "scale(0.8)";
        await wait(fade_ms);
        this.destroy();
    }

    /**
     * Build the bar and resolve with the selected toy id when clicked.
     * @param {string[]} toyIds
     * @returns {Promise<string>}
     */
    waitForSelection(toyIds) {
        return new Promise(resolve => {
            this.show(toyIds, (toy_id) => resolve(toy_id));
        });
    }

    show(toyIds, onSelect) {
        this.destroy();
        this._disabled = false;
        this._selectionHandler = onSelect;

        this.UIGroup = create_SVG_group(0, 0);
        this.parentLayer.appendChild(this.UIGroup);

        const btn_size = this.btn_size;
        const spacing = this.spacing;
        const total_width = (toyIds.length * btn_size) + ((toyIds.length - 1) * spacing);
        const start_x = (this.W - total_width) / 2;
        const panel_y = this.panel_y_ratio * this.H;

        let panel_height = btn_size + 40;
        if (this.bonus_stars > 0) panel_height += 40;

        let panel = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        panel.setAttribute('x', start_x - 30);
        panel.setAttribute('y', panel_y - 20);
        panel.setAttribute('width', total_width + 60);
        panel.setAttribute('height', panel_height);
        panel.setAttribute('rx', 20);
        panel.setAttribute('fill', 'rgba(255, 215, 0, 0.45)');
        panel.setAttribute('stroke', '#d4af37');
        panel.setAttribute('stroke-width', '4');
        this.UIGroup.appendChild(panel);

        toyIds.forEach((toy_id, index) => {
            let btn_x = start_x + (index * (btn_size + spacing));
            let btn_y = panel_y;

            let BtnGroup = create_SVG_group(0, 0);
            this.UIGroup.appendChild(BtnGroup);

            let btn_bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            btn_bg.setAttribute('x', btn_x);
            btn_bg.setAttribute('y', btn_y);
            btn_bg.setAttribute('width', btn_size);
            btn_bg.setAttribute('height', btn_size);
            btn_bg.setAttribute('rx', 15);
            btn_bg.setAttribute('fill', '#d8c381');
            btn_bg.setAttribute('stroke', '#b89f5d');
            btn_bg.setAttribute('stroke-width', '3');
            btn_bg.style.transition = "all 150ms ease";
            BtnGroup.appendChild(btn_bg);

            let template = document.getElementById("toy_" + toy_id);
            if (!template) {
                console.warn("ToyChoiceBar: missing toy_" + toy_id);
                return;
            }
            let RawToy = template.cloneNode(true);
            RawToy.style.display = "inherit";
            set_toy_color_scheme(RawToy, toy_id, false);
            ToyChoiceBar.make_toy_static(RawToy, toy_id);
            BtnGroup.appendChild(RawToy);

            let TBox = RawToy.getBBox();
            let max_dim = Math.max(TBox.width, TBox.height) || 100;
            let scale = (btn_size * 0.85) / max_dim;
            let raw_cx = TBox.x + (TBox.width / 2);
            let raw_cy = TBox.y + (TBox.height / 2);
            let target_cx = btn_x + (btn_size / 2);
            let target_cy = btn_y + (btn_size / 2);
            RawToy.style.transformOrigin = `${raw_cx}px ${raw_cy}px`;
            RawToy.style.transform = `translate(${target_cx - raw_cx}px, ${target_cy - raw_cy}px) scale(${scale})`;

            let click_catcher = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            click_catcher.setAttribute('x', btn_x);
            click_catcher.setAttribute('y', btn_y);
            click_catcher.setAttribute('width', btn_size);
            click_catcher.setAttribute('height', btn_size);
            click_catcher.setAttribute('fill', 'transparent');
            click_catcher.style.cursor = "pointer";
            BtnGroup.appendChild(click_catcher);

            click_catcher.onpointerenter = () => {
                if (this._disabled) return;
                btn_bg.setAttribute('fill', '#ebd89b');
                btn_bg.setAttribute('stroke', 'gold');
            };
            click_catcher.onpointerleave = () => {
                btn_bg.setAttribute('fill', '#d8c381');
                btn_bg.setAttribute('stroke', '#b89f5d');
            };
            click_catcher.onpointerdown = () => {
                if (this._disabled) return;
                this._disabled = true;
                AudioCont.play_sound_effect("button_click");
                let handler = this._selectionHandler;
                this._selectionHandler = null;
                if (handler) handler(toy_id);
            };
        });

        if (this.bonus_stars > 0) {
            let bonus_text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            bonus_text.setAttribute('x', this.W / 2);
            bonus_text.setAttribute('y', panel_y + btn_size + 45);
            bonus_text.setAttribute('font-family', 'Arial, sans-serif');
            bonus_text.setAttribute('font-size', '30');
            bonus_text.setAttribute('font-weight', 'bold');
            bonus_text.setAttribute('fill', 'navy');
            bonus_text.setAttribute('text-anchor', 'middle');
            bonus_text.textContent = this.bonus_stars === 1
                ? "You can earn a bonus star for a correct answer!"
                : `You can earn ${this.bonus_stars} bonus stars for a correct answer!`;
            this.UIGroup.appendChild(bonus_text);
        }

        this.UIGroup.style.transformOrigin = `${this.W / 2}px ${panel_y + (btn_size / 2)}px`;
        this.UIGroup.style.transform = "scale(0.8)";
        this.UIGroup.style.opacity = 0;
        this.UIGroup.style.transition = "all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)";
        window.getComputedStyle(this.UIGroup).opacity;
        this.UIGroup.style.transform = "scale(1)";
        this.UIGroup.style.opacity = 1;
    }
}

/**
 * Box-choice panel mirroring ToyChoiceBar (clones #toybox_* templates).
 */
class BoxChoiceBar {
    constructor(parentLayer, W, H, options = {}) {
        this.parentLayer = parentLayer;
        this.W = W;
        this.H = H;
        this.bonus_stars = options.bonus_stars || 0;
        this.panel_y_ratio = options.panel_y_ratio != null ? options.panel_y_ratio : 0.76;
        this.btn_size = options.btn_size || 170;
        this.spacing = options.spacing || 25;
        this.UIGroup = null;
        this._selectionHandler = null;
        this._disabled = false;
    }

    destroy() {
        this._disabled = true;
        this._selectionHandler = null;
        if (this.UIGroup && this.UIGroup.parentNode) this.UIGroup.remove();
        this.UIGroup = null;
    }

    async hide(fade_ms = 200) {
        this._disabled = true;
        this._selectionHandler = null;
        if (!this.UIGroup) return;
        this.UIGroup.style.transition = `all ${fade_ms}ms ease-in`;
        this.UIGroup.style.opacity = 0;
        this.UIGroup.style.transform = "scale(0.8)";
        await wait(fade_ms);
        this.destroy();
    }

    waitForSelection(boxIds) {
        return new Promise(resolve => {
            this.show(boxIds, (box_id) => resolve(box_id));
        });
    }

    show(boxIds, onSelect) {
        this.destroy();
        this._disabled = false;
        this._selectionHandler = onSelect;

        this.UIGroup = create_SVG_group(0, 0);
        this.parentLayer.appendChild(this.UIGroup);

        const btn_size = this.btn_size;
        const spacing = this.spacing;
        const total_width = (boxIds.length * btn_size) + ((boxIds.length - 1) * spacing);
        const start_x = (this.W - total_width) / 2;
        const panel_y = this.panel_y_ratio * this.H;

        let panel_height = btn_size + 40;
        if (this.bonus_stars > 0) panel_height += 40;

        let panel = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        panel.setAttribute('x', start_x - 30);
        panel.setAttribute('y', panel_y - 20);
        panel.setAttribute('width', total_width + 60);
        panel.setAttribute('height', panel_height);
        panel.setAttribute('rx', 20);
        panel.setAttribute('fill', 'rgba(255, 215, 0, 0.45)');
        panel.setAttribute('stroke', '#d4af37');
        panel.setAttribute('stroke-width', '4');
        this.UIGroup.appendChild(panel);

        boxIds.forEach((box_id, index) => {
            let btn_x = start_x + (index * (btn_size + spacing));
            let btn_y = panel_y;

            let BtnGroup = create_SVG_group(0, 0);
            this.UIGroup.appendChild(BtnGroup);

            let btn_bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            btn_bg.setAttribute('x', btn_x);
            btn_bg.setAttribute('y', btn_y);
            btn_bg.setAttribute('width', btn_size);
            btn_bg.setAttribute('height', btn_size);
            btn_bg.setAttribute('rx', 15);
            btn_bg.setAttribute('fill', '#d8c381');
            btn_bg.setAttribute('stroke', '#b89f5d');
            btn_bg.setAttribute('stroke-width', '3');
            btn_bg.style.transition = "all 150ms ease";
            BtnGroup.appendChild(btn_bg);

            let template = document.getElementById("toybox_" + box_id);
            if (!template) {
                console.warn("BoxChoiceBar: missing toybox_" + box_id);
                return;
            }
            let RawBox = template.cloneNode(true);
            RawBox.style.display = "inherit";
            Array.from(RawBox.getElementsByClassName("prep_element_hidden")).forEach(el => {
                el.style.display = "none";
            });
            apply_toybox_decoration_visibility_to_element(RawBox, box_id);
            BtnGroup.appendChild(RawBox);

            let TBox = RawBox.getBBox();
            let max_dim = Math.max(TBox.width, TBox.height) || 100;
            let scale = (btn_size * 0.85) / max_dim;
            let raw_cx = TBox.x + (TBox.width / 2);
            let raw_cy = TBox.y + (TBox.height / 2);
            let target_cx = btn_x + (btn_size / 2);
            let target_cy = btn_y + (btn_size / 2);
            RawBox.style.transformOrigin = `${raw_cx}px ${raw_cy}px`;
            RawBox.style.transform = `translate(${target_cx - raw_cx}px, ${target_cy - raw_cy}px) scale(${scale})`;

            let click_catcher = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            click_catcher.setAttribute('x', btn_x);
            click_catcher.setAttribute('y', btn_y);
            click_catcher.setAttribute('width', btn_size);
            click_catcher.setAttribute('height', btn_size);
            click_catcher.setAttribute('fill', 'transparent');
            click_catcher.style.cursor = "pointer";
            BtnGroup.appendChild(click_catcher);

            click_catcher.onpointerenter = () => {
                if (this._disabled) return;
                btn_bg.setAttribute('fill', '#ebd89b');
                btn_bg.setAttribute('stroke', 'gold');
            };
            click_catcher.onpointerleave = () => {
                btn_bg.setAttribute('fill', '#d8c381');
                btn_bg.setAttribute('stroke', '#b89f5d');
            };
            click_catcher.onpointerdown = () => {
                if (this._disabled) return;
                this._disabled = true;
                AudioCont.play_sound_effect("button_click");
                let handler = this._selectionHandler;
                this._selectionHandler = null;
                if (handler) handler(box_id);
            };
        });

        if (this.bonus_stars > 0) {
            let bonus_text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            bonus_text.setAttribute('x', this.W / 2);
            bonus_text.setAttribute('y', panel_y + btn_size + 45);
            bonus_text.setAttribute('font-family', 'Arial, sans-serif');
            bonus_text.setAttribute('font-size', '30');
            bonus_text.setAttribute('font-weight', 'bold');
            bonus_text.setAttribute('fill', 'navy');
            bonus_text.setAttribute('text-anchor', 'middle');
            bonus_text.textContent = this.bonus_stars === 1
                ? "You can earn a bonus star for a correct answer!"
                : `You can earn ${this.bonus_stars} bonus stars for a correct answer!`;
            this.UIGroup.appendChild(bonus_text);
        }

        this.UIGroup.style.transformOrigin = `${this.W / 2}px ${panel_y + (btn_size / 2)}px`;
        this.UIGroup.style.transform = "scale(0.8)";
        this.UIGroup.style.opacity = 0;
        this.UIGroup.style.transition = "all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)";
        window.getComputedStyle(this.UIGroup).opacity;
        this.UIGroup.style.transform = "scale(1)";
        this.UIGroup.style.opacity = 1;
    }
}

/**
 * Fennimal-face choice panel mirroring ToyChoiceBar / BoxChoiceBar.
 * Options are FenObj snapshots (need .id, .head, .ColorScheme for head rendering).
 * Resolves with the selected FenObj.id.
 */
class FennimalChoiceBar {
    constructor(parentLayer, W, H, options = {}) {
        this.parentLayer = parentLayer;
        this.W = W;
        this.H = H;
        this.bonus_stars = options.bonus_stars || 0;
        this.panel_y_ratio = options.panel_y_ratio != null ? options.panel_y_ratio : 0.76;
        this.btn_size = options.btn_size || 170;
        this.spacing = options.spacing || 25;
        this.UIGroup = null;
        this._selectionHandler = null;
        this._disabled = false;
    }

    destroy() {
        this._disabled = true;
        this._selectionHandler = null;
        if (this.UIGroup && this.UIGroup.parentNode) this.UIGroup.remove();
        this.UIGroup = null;
    }

    async hide(fade_ms = 200) {
        this._disabled = true;
        this._selectionHandler = null;
        if (!this.UIGroup) return;
        this.UIGroup.style.transition = `all ${fade_ms}ms ease-in`;
        this.UIGroup.style.opacity = 0;
        this.UIGroup.style.transform = "scale(0.8)";
        await wait(fade_ms);
        this.destroy();
    }

    waitForSelection(fenObjs) {
        return new Promise(resolve => {
            this.show(fenObjs, (fen_id) => resolve(fen_id));
        });
    }

    show(fenObjs, onSelect) {
        this.destroy();
        this._disabled = false;
        this._selectionHandler = onSelect;

        this.UIGroup = create_SVG_group(0, 0);
        this.parentLayer.appendChild(this.UIGroup);

        const btn_size = this.btn_size;
        const spacing = this.spacing;
        const total_width = (fenObjs.length * btn_size) + ((fenObjs.length - 1) * spacing);
        const start_x = (this.W - total_width) / 2;
        const panel_y = this.panel_y_ratio * this.H;

        let panel_height = btn_size + 40;
        if (this.bonus_stars > 0) panel_height += 40;

        let panel = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        panel.setAttribute("x", start_x - 30);
        panel.setAttribute("y", panel_y - 20);
        panel.setAttribute("width", total_width + 60);
        panel.setAttribute("height", panel_height);
        panel.setAttribute("rx", 20);
        panel.setAttribute("fill", "rgba(255, 215, 0, 0.45)");
        panel.setAttribute("stroke", "#d4af37");
        panel.setAttribute("stroke-width", "4");
        this.UIGroup.appendChild(panel);

        fenObjs.forEach((fenObj, index) => {
            let btn_x = start_x + (index * (btn_size + spacing));
            let btn_y = panel_y;
            let fen_id = fenObj.id;

            let BtnGroup = create_SVG_group(0, 0);
            this.UIGroup.appendChild(BtnGroup);

            let btn_bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            btn_bg.setAttribute("x", btn_x);
            btn_bg.setAttribute("y", btn_y);
            btn_bg.setAttribute("width", btn_size);
            btn_bg.setAttribute("height", btn_size);
            btn_bg.setAttribute("rx", 15);
            btn_bg.setAttribute("fill", "#d8c381");
            btn_bg.setAttribute("stroke", "#b89f5d");
            btn_bg.setAttribute("stroke-width", "3");
            btn_bg.style.transition = "all 150ms ease";
            BtnGroup.appendChild(btn_bg);

            let headIcon = create_Fennimal_SVG_object_head_only(fenObj, false);
            headIcon.style.filter = "grayscale(100%)";
            BtnGroup.appendChild(headIcon);

            let TBox = headIcon.getBBox();
            let max_dim = Math.max(TBox.width, TBox.height) || 100;
            let scale = (btn_size * 0.85) / max_dim;
            let raw_cx = TBox.x + (TBox.width / 2);
            let raw_cy = TBox.y + (TBox.height / 2);
            let target_cx = btn_x + (btn_size / 2);
            let target_cy = btn_y + (btn_size / 2);
            headIcon.style.transformOrigin = `${raw_cx}px ${raw_cy}px`;
            headIcon.style.transform = `translate(${target_cx - raw_cx}px, ${target_cy - raw_cy}px) scale(${scale})`;

            let click_catcher = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            click_catcher.setAttribute("x", btn_x);
            click_catcher.setAttribute("y", btn_y);
            click_catcher.setAttribute("width", btn_size);
            click_catcher.setAttribute("height", btn_size);
            click_catcher.setAttribute("fill", "transparent");
            click_catcher.style.cursor = "pointer";
            BtnGroup.appendChild(click_catcher);

            click_catcher.onpointerenter = () => {
                if (this._disabled) return;
                btn_bg.setAttribute("fill", "#ebd89b");
                btn_bg.setAttribute("stroke", "gold");
            };
            click_catcher.onpointerleave = () => {
                btn_bg.setAttribute("fill", "#d8c381");
                btn_bg.setAttribute("stroke", "#b89f5d");
            };
            click_catcher.onpointerdown = () => {
                if (this._disabled) return;
                this._disabled = true;
                AudioCont.play_sound_effect("button_click");
                let handler = this._selectionHandler;
                this._selectionHandler = null;
                if (handler) handler(fen_id);
            };
        });

        if (this.bonus_stars > 0) {
            let bonus_text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            bonus_text.setAttribute("x", this.W / 2);
            bonus_text.setAttribute("y", panel_y + btn_size + 45);
            bonus_text.setAttribute("font-family", "Arial, sans-serif");
            bonus_text.setAttribute("font-size", "30");
            bonus_text.setAttribute("font-weight", "bold");
            bonus_text.setAttribute("fill", "navy");
            bonus_text.setAttribute("text-anchor", "middle");
            bonus_text.textContent = this.bonus_stars === 1
                ? "You can earn a bonus star for a correct answer!"
                : `You can earn ${this.bonus_stars} bonus stars for a correct answer!`;
            this.UIGroup.appendChild(bonus_text);
        }

        this.UIGroup.style.transformOrigin = `${this.W / 2}px ${panel_y + (btn_size / 2)}px`;
        this.UIGroup.style.transform = "scale(0.8)";
        this.UIGroup.style.opacity = 0;
        this.UIGroup.style.transition = "all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)";
        window.getComputedStyle(this.UIGroup).opacity;
        this.UIGroup.style.transform = "scale(1)";
        this.UIGroup.style.opacity = 1;
    }
}
