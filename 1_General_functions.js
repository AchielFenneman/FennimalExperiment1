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

/**
 * Place a destination container at screen center; put the handheld item on a random
 * flanking side. Far ends (~20% each side) stay free for the recycle bin / partner.
 */
function pick_flanking_item_x(screenW, containerCenterX, containerHalfW, itemHalfW, options = {}) {
    const gap = options.gap != null ? options.gap : 70;
    const endReserve = options.endReserve != null ? options.endReserve : 0.2 * screenW;
    const minCenter = endReserve + itemHalfW;
    const maxCenter = screenW - endReserve - itemHalfW;

    let leftX = containerCenterX - containerHalfW - gap - itemHalfW;
    let rightX = containerCenterX + containerHalfW + gap + itemHalfW;

    let candidates = [];
    if (leftX >= minCenter && leftX <= maxCenter) candidates.push(leftX);
    if (rightX >= minCenter && rightX <= maxCenter) candidates.push(rightX);

    if (candidates.length === 0) {
        // Prefer whichever side stays farther from the reserved ends.
        let clampedLeft = Math.max(minCenter, Math.min(maxCenter, leftX));
        let clampedRight = Math.max(minCenter, Math.min(maxCenter, rightX));
        candidates = [clampedLeft, clampedRight];
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
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

    let BodyTemplate = document.getElementById("Fennimal_body_" + FenObj.body);
    if (!BodyTemplate) {
        throw new Error(
            `Missing SVG body template #Fennimal_body_${FenObj.body} for Fennimal id="${FenObj && FenObj.id}".`
        );
    }
    let BodySVG = BodyTemplate.cloneNode(true);
    BodySVG.removeAttribute("id");
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

    let headId = "Fennimal_head_" + FenObj.head;
    let HeadTemplate = document.getElementById(headId);
    if (!HeadTemplate) {
        throw new Error(
            `Missing SVG head template #${headId} for Fennimal id="${FenObj && FenObj.id}" name="${FenObj && FenObj.name}". ` +
            `Check FenObj.head and that SVGREDUCER did not remove this template.`
        );
    }
    let HeadSVG = HeadTemplate.cloneNode(true);
    HeadSVG.removeAttribute("id"); // avoid duplicate ids with the template in #All_Heads
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
    attach_hat_to_fennimal_head(HeadScaleGroup, HeadSVG, FenObj, head_scale_factor);

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

function attach_hat_to_fennimal_head(HeadScaleGroup, HeadSVG, FenObj, head_scale_factor, hat_visual_scale) {
    if (!FenObj || FenObj.hat === undefined || FenObj.hat === null || FenObj.hat === "") return null;
    if (!HeadSVG || HeadSVG.getElementsByClassName("Fennimal_head_hat_point").length === 0) {
        console.warn("Attempting to place a hat on an invalid Fennimal.");
        return null;
    }

    let hatId = "hat_" + String(FenObj.hat).replace(/^hat_/, "");
    let HatTemplate = document.getElementById(hatId);
    if (!HatTemplate) {
        console.warn("Missing SVG hat template #" + hatId + " for Fennimal id=\"" + (FenObj.id || "") + "\".");
        return null;
    }

    let HatGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    let HatScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    HatGroup.classList.add("hat");
    HatGroup.appendChild(HatScaleGroup);
    HeadScaleGroup.appendChild(HatGroup);

    let HatSVG = HatTemplate.cloneNode(true);
    HatSVG.removeAttribute("id");
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

    HatGroup.style.transform = `translate(${HeadHatPoint.x - HatConnectionPoint.x}px, ${HeadHatPoint.y - HatConnectionPoint.y}px)`;
    HatScaleGroup.style.transformOrigin = `${HatConnectionPoint.x}px ${HatConnectionPoint.y}px`;
    // Hat lives inside the head scale group, so divide out that scale to keep a constant visual size (default 2).
    let headScale = (head_scale_factor && isFinite(head_scale_factor) && head_scale_factor !== 0)
        ? head_scale_factor
        : 1;
    let visualHatScale = (hat_visual_scale && isFinite(hat_visual_scale) && hat_visual_scale !== 0)
        ? hat_visual_scale
        : 2;
    HatScaleGroup.style.transform = `scale(${visualHatScale / headScale})`;
    return HatGroup;
}

function _circle_center(el) {
    if (!el) return null;
    let cx = parseFloat(el.getAttribute("cx"));
    let cy = parseFloat(el.getAttribute("cy"));
    if (!isFinite(cx) || !isFinite(cy)) return null;
    return { x: cx, y: cy };
}

function _local_bbox_center(el) {
    if (!el) return null;
    try {
        let box = el.getBBox();
        if (!box || !(box.width > 0) || !(box.height > 0)) return null;
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    } catch (err) {
        return null;
    }
}

/**
 * Print a Fennimal's toy onto the body (retraining polaroids).
 * Snaps to .Fennimal_body_center_point so body SVGs can be overwritten without extra markers.
 * The toy is centered on that point (not grabbed by toy_pivot_point).
 */
function attach_toy_to_fennimal_body(ParentGroup, BodySVG, FenObj, toy_visual_scale) {
    if (!FenObj || FenObj.toy === undefined || FenObj.toy === null || FenObj.toy === "") return null;
    if (!ParentGroup || !BodySVG) {
        console.warn("Attempting to place a toy on a Fennimal with no body.");
        return null;
    }
    let bodyPointEl = BodySVG.getElementsByClassName("Fennimal_body_center_point")[0];
    if (!bodyPointEl) {
        console.warn(
            "Missing Fennimal_body_center_point on body \"" + (FenObj.body || "") +
            "\" (Fennimal id=\"" + (FenObj.id || "") + "\")."
        );
        return null;
    }
    let toyId = String(FenObj.toy).replace(/^toy_/, "");
    let ToyTemplate = document.getElementById("toy_" + toyId);
    if (!ToyTemplate) {
        console.warn("Missing SVG toy template #toy_" + toyId + " for Fennimal id=\"" + (FenObj.id || "") + "\".");
        return null;
    }

    let ToyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    let ToyScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    ToyGroup.classList.add("held_toy");
    ToyGroup.appendChild(ToyScaleGroup);
    ParentGroup.appendChild(ToyGroup);

    let ToySVG = ToyTemplate.cloneNode(true);
    ToySVG.removeAttribute("id");
    if (typeof strip_svg_ids_from_subtree === "function") strip_svg_ids_from_subtree(ToySVG);
    ToySVG.style.display = "inherit";
    ToySVG.querySelectorAll(".prep_element_hidden").forEach((el) => el.remove());
    ToyScaleGroup.appendChild(ToySVG);
    if (typeof set_toy_color_scheme === "function") set_toy_color_scheme(ToySVG, toyId, false);

    let BodyToyPoint = _circle_center(bodyPointEl);
    let ToyCenter = _local_bbox_center(ToySVG) || _local_bbox_center(ToyTemplate);
    if (!ToyCenter) {
        let toyPivotEl = ToySVG.getElementsByClassName("toy_pivot_point")[0]
            || ToySVG.getElementsByClassName("toy_attachment_point")[0];
        ToyCenter = _circle_center(toyPivotEl);
    }
    if (!BodyToyPoint || !ToyCenter) {
        console.warn("Toy attach: missing Fennimal_body_center_point coords or toy bounds.");
        ToyGroup.remove();
        return null;
    }

    ToyGroup.style.transform = `translate(${BodyToyPoint.x - ToyCenter.x}px, ${BodyToyPoint.y - ToyCenter.y}px)`;
    ToyScaleGroup.style.transformOrigin = `${ToyCenter.x}px ${ToyCenter.y}px`;
    let visualToyScale = (toy_visual_scale && isFinite(toy_visual_scale) && toy_visual_scale !== 0)
        ? toy_visual_scale
        : 2.2;
    ToyScaleGroup.style.transform = `scale(${visualToyScale})`;
    return ToyGroup;
}

function create_Fennimal_SVG_object_head_only(FenObj, outline_only, include_hat) {
    //Create the Fennimal SVG container. There are two layers here, one for transform (top), one for scale (second)
    let TranslationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    let ScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    TranslationGroup.appendChild(ScaleGroup)

    let HeadGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    let HeadScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    HeadGroup.appendChild(HeadScaleGroup)
    ScaleGroup.appendChild(HeadGroup)

    //Now we can find and copy the SVG code for the head
    let headId = "Fennimal_head_" + FenObj.head
    let HeadTemplate = document.getElementById(headId)
    if (!HeadTemplate) {
        throw new Error(
            `Missing SVG head template #${headId} for Fennimal id="${FenObj && FenObj.id}" name="${FenObj && FenObj.name}". ` +
            `Check FenObj.head and that SVGREDUCER did not remove this template.`
        )
    }
    let HeadSVG = HeadTemplate.cloneNode(true)
    HeadSVG.removeAttribute("id") // avoid duplicate ids with the template in #All_Heads
    HeadSVG.style.display = "inherit"
    HeadScaleGroup.appendChild(HeadSVG)

    if (include_hat) {
        attach_hat_to_fennimal_head(HeadScaleGroup, HeadSVG, FenObj, 1, 3);
    }

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

/**
 * Resolve the canonical toybox template from #All_Boxes / #Fennimal_Templates_Layer.
 * Prefer this over document.getElementById("toybox_*"): interaction clones historically
 * kept the same id, and Map sits before Templates in Main.svg — so getElementById can
 * return a map/instruction clone (or a BoxBase clone with front/lid stripped) instead.
 * Also: #All_Items used to hold a second unpainted toybox copy (class "item toybox");
 * getElementById would return that baked-yellow node instead of the painted All_Boxes one.
 */
function get_toybox_template(boxId) {
    if (!boxId) return null;
    if (typeof boxId === "string" && boxId.indexOf("toybox_") === 0) {
        boxId = boxId.slice("toybox_".length);
    }
    let id = "toybox_" + boxId;
    let escapeId = (typeof CSS !== "undefined" && CSS.escape)
        ? CSS.escape(id)
        : String(id).replace(/([^a-zA-Z0-9_-])/g, "\\$1");
    let boxes = document.getElementById("All_Boxes");
    if (boxes) {
        let scoped = boxes.querySelector("#" + escapeId);
        if (scoped) return scoped;
    }
    let templates = document.getElementById("Fennimal_Templates_Layer");
    if (templates) {
        let scoped = templates.querySelector("#" + escapeId);
        if (scoped) return scoped;
    }
    return document.getElementById(id);
}

/** Resolve a template id; toybox_* always goes through get_toybox_template. */
function resolve_svg_template(elementId) {
    if (!elementId) return null;
    if (typeof elementId === "string" && elementId.indexOf("toybox_") === 0) {
        return get_toybox_template(elementId);
    }
    return document.getElementById(elementId);
}

/** Strip id attributes from a cloned subtree so templates stay uniquely addressable. */
function strip_svg_ids_from_subtree(root) {
    if (!root || root.nodeType !== 1) return;
    // Only strip the clone root id (toybox_*, backpack, toy_*, …). Child ids such as
    // backpack_flap_closed / backpack_flap_open are used for local state toggles.
    root.removeAttribute("id");
}

/**
 * Toggle backpack open/closed flaps on a cloned backpack group.
 * Prefers id markers; falls back to class names / DOM order if ids were stripped.
 * Uses display (not only opacity) because the template marks the open flap with
 * the SVG presentation attribute display="none".
 */
function set_backpack_flaps_open(backpackRoot, open) {
    if (!backpackRoot) return;
    let flaps = backpackRoot.getElementsByClassName("backpack_flap");
    for (let i = 0; i < flaps.length; i++) {
        let flap = flaps[i];
        let id = flap.id || "";
        let isClosed = id.includes("closed") || flap.classList.contains("backpack_flap_closed");
        let isOpen = id.includes("open") || flap.classList.contains("backpack_flap_open");
        // Template order: closed first, open second — use as last resort.
        if (!isClosed && !isOpen) {
            isClosed = i === 0;
            isOpen = i === 1;
        }
        // Clear the baked-in presentation attribute so CSS display wins.
        flap.removeAttribute("display");
        if (isClosed) {
            flap.style.display = open ? "none" : "inline";
            flap.style.opacity = open ? 0 : 1;
        }
        if (isOpen) {
            flap.style.display = open ? "inline" : "none";
            flap.style.opacity = open ? 1 : 0;
        }
    }
}

function copy_scale_and_move_object_to_position(Elem,Parent, center_x, center_y, scale_factor, optional_new_id){
    //Copying the object and creating the group structure
    let SVG = Elem.cloneNode(true);
    // Clones must not keep the template root id — duplicate toybox_*/backpack ids break
    // later lookups (Map is before Fennimal_Templates_Layer, so getElementById prefers map clones).
    strip_svg_ids_from_subtree(SVG);
    let ZeroTranslationGroup = create_SVG_group(0,0,"zero_translate_group",undefined);
    let MainPosTranslationGroup = create_SVG_group(0,0,"main_translate_group",undefined);
    let ScaleGroup = create_SVG_group(0,0,"scale_group",undefined);

    ZeroTranslationGroup.appendChild(SVG);
    ScaleGroup.appendChild(ZeroTranslationGroup)
    MainPosTranslationGroup.appendChild(ScaleGroup)
    Parent.appendChild(MainPosTranslationGroup);

    //Zero the coordinates of the object first
    SVG.style.display = "inherit"
    let BaseCenter;
    try {
        BaseCenter = getSVGInternalCenter(ZeroTranslationGroup);
    } catch (err) {
        // getScreenCTM() is null when the map/parent is display:none — fall back to local bbox.
        let b = ZeroTranslationGroup.getBBox();
        BaseCenter = { x: b.x + 0.5 * b.width, y: b.y + 0.5 * b.height };
    }
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
 * Also applies lost-and-found tag visibility so every decoration call site stays in sync.
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
    apply_toybox_lost_found_tag_visibility_to_element(rootElem, boxtype);
    return decorated;
}

/**
 * Show/hide lost-and-found tags on a toybox clone according to WorldState.
 * Loose tags stay hidden outside the retrieve_lost_box tagging step.
 * Attached tags show when the box has been tagged.
 */
function apply_toybox_lost_found_tag_visibility_to_element(rootElem, boxtype) {
    if (!rootElem) return false;
    let tagged = false;
    if (typeof WorldState !== "undefined" && WorldState.get_toybox_has_lost_found_tag) {
        tagged = WorldState.get_toybox_has_lost_found_tag(boxtype) === true;
    }
    rootElem.querySelectorAll(".lost_found_tag_loose").forEach((el) => {
        el.classList.add("invisible_element");
        el.style.transition = "";
        el.style.opacity = "0";
        el.style.visibility = "hidden";
        el.style.pointerEvents = "none";
    });
    rootElem.querySelectorAll(".lost_found_tag_attached").forEach((el) => {
        el.classList.toggle("invisible_element", !tagged);
        el.style.transition = "";
        el.style.opacity = tagged ? "1" : "0";
        el.style.visibility = tagged ? "visible" : "hidden";
        el.style.pointerEvents = "none";
    });
    return tagged;
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

function set_box_color_scheme(BoxSVG, box_type_or_scheme){
    if (!BoxSVG) return;
    let scheme = null;
    if (box_type_or_scheme && typeof box_type_or_scheme === "object") {
        scheme = box_type_or_scheme;
    } else if (box_type_or_scheme && GenParam.BoxColorSchemes && GenParam.BoxColorSchemes[box_type_or_scheme]) {
        scheme = GenParam.BoxColorSchemes[box_type_or_scheme];
    }
    if (!scheme) return;

    let LightElem = BoxSVG.getElementsByClassName("box_color_light");
    for (let i = 0; i < LightElem.length; i++) {
        LightElem[i].style.fill = scheme.light_color;
    }
    let DarkElem = BoxSVG.getElementsByClassName("box_color_dark");
    for (let i = 0; i < DarkElem.length; i++) {
        DarkElem[i].style.fill = scheme.dark_color;
    }
    // Accents stay baked unless a scheme explicitly requests recoloring them.
    if (scheme.recolor_accents === true && scheme.accent_color) {
        let AccentElem = BoxSVG.getElementsByClassName("box_color_accent");
        for (let i = 0; i < AccentElem.length; i++) {
            AccentElem[i].style.fill = scheme.accent_color;
        }
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
    let painted = new Set();
    for (let box_id in GenParam.BoxColorSchemes) {
        let template = (typeof get_toybox_template === "function")
            ? get_toybox_template(box_id)
            : document.getElementById("toybox_" + box_id);
        if (template) {
            set_box_color_scheme(template, box_id);
            painted.add(template);
        }
    }
    // Belt-and-suspenders: any leftover duplicate .toybox node (e.g. old All_Items copy).
    Array.from(document.getElementsByClassName("toybox")).forEach((el) => {
        if (!el || painted.has(el)) return;
        let box_id = (el.id || "").replace(/^toybox_/, "");
        if (box_id && GenParam.BoxColorSchemes[box_id]) {
            set_box_color_scheme(el, box_id);
        }
    });
}

/**
 * Re-apply a previously saved colorAssignment overview (Layer 1 session restore).
 * Expects the object returned by assign_experiment_item_colors().
 */
function apply_saved_color_assignment(overview) {
    if (!overview || !GenParam) return false;

    GenParam.BoxColorSchemes = {};
    GenParam.BoxEffectiveHues = {};

    if (overview.boxes && typeof overview.boxes === "object") {
        for (let box_id in overview.boxes) {
            let box = overview.boxes[box_id];
            GenParam.BoxEffectiveHues[box_id] = box.hue_family;
            // Only paint templates for boxes that left their baked baseline.
            if (box.source === "swapped" && box.light_color && box.dark_color) {
                GenParam.BoxColorSchemes[box_id] = {
                    hue_family: box.hue_family,
                    light_color: box.light_color,
                    dark_color: box.dark_color,
                    recolor_accents: box.recolor_accents === true,
                    accent_color: box.accent_color,
                    source: "swapped",
                };
            }
        }
    }

    if (overview.toys && typeof overview.toys === "object"
        && GenParam.use_color_algorithm_for_toy_colors === true) {
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

/**
 * Clean assignment snapshots omit region-derived ColorSchemes. Rebuild them for runtime SVG painting.
 */
function ensure_fennimal_runtime_color_scheme(fenObj, useContrastColorForHead) {
    if (!fenObj) return fenObj;
    if (fenObj.ColorScheme && fenObj.ColorScheme.Head && fenObj.ColorScheme.Body) return fenObj;
    if (!fenObj.region || !GenParam || !GenParam.RegionData || !GenParam.RegionData[fenObj.region]) {
        console.warn("ensure_fennimal_runtime_color_scheme: cannot rebuild colors for", fenObj && fenObj.id);
        return fenObj;
    }

    let region = GenParam.RegionData[fenObj.region];
    let locColors = region.Fennimal_location_colors;
    let headTertiary = useContrastColorForHead === true
        ? region.contrast_color
        : locColors.tertiary_color;

    fenObj.ColorScheme = {
        Head: {
            primary_color: locColors.primary_color,
            secondary_color: locColors.secondary_color,
            tertiary_color: headTertiary,
            eye_color: locColors.eye_color
        },
        Body: {
            primary_color: locColors.primary_color,
            secondary_color: locColors.secondary_color,
            tertiary_color: locColors.tertiary_color
        }
    };
    if (!fenObj.color_scheme_origin) fenObj.color_scheme_origin = "region";
    return fenObj;
}

function get_region_hue_family(region_name) {
    if (!region_name || !GenParam.RegionData[region_name]) return null;
    let desc = GenParam.RegionData[region_name].color_description;
    if (desc && GenParam.ColorHuePalettes[desc]) return desc;
    if (region_name === "Home") return "gray";
    return null;
}

/** Expand a list of region/item hues with ColorAdjacentHueBans (e.g. green → teal). */
function expand_banned_hues_with_adjacents(hue_list) {
    let out = new Set();
    (hue_list || []).forEach((h) => {
        if (!h) return;
        out.add(h);
        let adj = (GenParam.ColorAdjacentHueBans && GenParam.ColorAdjacentHueBans[h]) || [];
        adj.forEach((a) => out.add(a));
    });
    return [...out];
}

/** Hues that should not co-occur as two different boxes (sand↔brown, etc.). */
function expand_box_pairwise_near_misses(hue_list) {
    let out = new Set();
    (hue_list || []).forEach((h) => {
        if (!h) return;
        out.add(h);
        let near = (GenParam.ColorBoxPairwiseNearMisses && GenParam.ColorBoxPairwiseNearMisses[h]) || [];
        near.forEach((n) => out.add(n));
    });
    return [...out];
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
 * Curated-set assignment for the pilot.
 * Picks one CuratedColorSet, then assigns box/toy colors with region-aware bans:
 * - box banned hues = union of region hues for every Fennimal using that box
 *   (+ adjacent near-misses from ColorAdjacentHueBans, e.g. green→teal)
 *   (+ already-assigned box hues and ColorBoxPairwiseNearMisses, e.g. brown→sand)
 * - toy banned hues = own region hue (+ adjacents) + own box hue (after boxes assigned)
 * - a candidate whose hue_family / primary_hue / secondary_hue is banned is skipped
 */
function pick_and_apply_curated_color_set(fennimalArr) {
    const sets = GenParam.CuratedColorSets;
    if (!Array.isArray(sets) || sets.length === 0) {
        throw new Error("pick_and_apply_curated_color_set: GenParam.CuratedColorSets is empty");
    }

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

    const boxes = Object.keys(box_regions);
    const toys = Object.keys(toy_region);
    const set = sets[Math.floor(Math.random() * sets.length)];

    function candidate_ok_for_bans(candidate, banned) {
        let hues = [];
        if (candidate.hue_family) hues.push(candidate.hue_family);
        if (candidate.primary_hue) hues.push(candidate.primary_hue);
        if (candidate.secondary_hue) hues.push(candidate.secondary_hue);
        return hues.every((h) => !banned.includes(h));
    }

    function pick_candidate(pool, banned, used_ids, prefer_punchy) {
        let available = pool.filter((c) => !used_ids.has(c.id) && candidate_ok_for_bans(c, banned));
        if (!available.length) {
            // Last resort: ignore chroma preference but still honour bans.
            available = pool.filter((c) => !used_ids.has(c.id) && candidate_ok_for_bans(c, banned));
        }
        if (!available.length) {
            // Absolute fallback: any unused candidate (should be rare with large pools).
            available = pool.filter((c) => !used_ids.has(c.id));
            console.warn("pick_and_apply_curated_color_set: no ban-safe candidates; relaxing bans", banned);
        }
        if (!available.length) return null;

        let preferred = prefer_punchy
            ? available.filter((c) => c.chroma === "punchy")
            : available.slice();
        if (!preferred.length) preferred = available;
        // Prefer free (non-region) hues slightly when prefer_punchy.
        if (prefer_punchy) {
            let freeish = preferred.filter((c) =>
                !["blue", "green", "red", "yellow"].includes(c.hue_family || c.primary_hue)
            );
            if (freeish.length) preferred = freeish;
        }
        return preferred[Math.floor(Math.random() * preferred.length)];
    }

    // Boxes: hardest bans first (shared boxes with 2 region hues).
    let box_order = boxes.slice().sort((a, b) => box_regions[b].size - box_regions[a].size);
    const used_box_cand = new Set();
    const box_hues = {};
    const used_box_hue_list = [];
    GenParam.BoxColorSchemes = {};

    box_order.forEach((box_id) => {
        let banned = expand_banned_hues_with_adjacents([...box_regions[box_id]]);
        // Keep boxes visually distinct from each other (no sand+brown, teal+blue, …).
        banned = [...new Set([
            ...banned,
            ...expand_box_pairwise_near_misses(used_box_hue_list),
        ])];
        let cand = pick_candidate(set.box_candidates, banned, used_box_cand, true);
        if (!cand) {
            // Soften only the pairwise near-misses; keep region bans.
            banned = expand_banned_hues_with_adjacents([...box_regions[box_id]]);
            banned = [...new Set([...banned, ...used_box_hue_list])];
            cand = pick_candidate(set.box_candidates, banned, used_box_cand, true);
            if (cand) {
                console.warn(
                    "pick_and_apply_curated_color_set: relaxed box pairwise near-misses for '" +
                    box_id + "' (still avoiding duplicate hues)"
                );
            }
        }
        if (!cand) {
            throw new Error(
                "pick_and_apply_curated_color_set: could not assign box '" + box_id +
                "' from set '" + set.id + "' (banned: " + banned.join(",") + ")"
            );
        }
        used_box_cand.add(cand.id);
        box_hues[box_id] = cand.hue_family;
        used_box_hue_list.push(cand.hue_family);
        GenParam.BoxColorSchemes[box_id] = {
            hue_family: cand.hue_family,
            accent_material: cand.accent_material,
            light_color: cand.light_color,
            dark_color: cand.dark_color,
            accent_color: cand.accent_color,
            chroma: cand.chroma,
            candidate_id: cand.id,
        };
    });

    // Toys: avoid own region (+ adjacents) + own box hue; keep candidates unique.
    let toy_order = toys.slice().sort((a, b) => {
        let ba = [toy_region[a], box_hues[toy_box[a]]].filter(Boolean).length;
        let bb = [toy_region[b], box_hues[toy_box[b]]].filter(Boolean).length;
        return bb - ba;
    });
    const used_toy_cand = new Set();
    const toy_assignments = {};

    toy_order.forEach((toy_id) => {
        let banned_core = [];
        if (toy_region[toy_id]) banned_core.push(toy_region[toy_id]);
        if (toy_box[toy_id] && box_hues[toy_box[toy_id]]) banned_core.push(box_hues[toy_box[toy_id]]);
        let banned = expand_banned_hues_with_adjacents(banned_core);

        let cand = pick_candidate(set.toy_candidates, banned, used_toy_cand, true);
        if (!cand) {
            throw new Error(
                "pick_and_apply_curated_color_set: could not assign toy '" + toy_id +
                "' from set '" + set.id + "' (banned: " + banned.join(",") + ")"
            );
        }
        used_toy_cand.add(cand.id);
        toy_assignments[toy_id] = cand;

        if (GenParam.use_color_algorithm_for_toy_colors === true) {
            if (GenParam.ToyData[toy_id]) {
                GenParam.ToyData[toy_id].ColorScheme = {
                    light_color: cand.light_color,
                    dark_color: cand.dark_color,
                };
            } else {
                console.warn("pick_and_apply_curated_color_set: no ToyData for toy '" + toy_id + "'");
            }
        }
    });

    return {
        algorithm: "curated_set_v1",
        set_id: set.id,
        set_label: set.label,
        used_regions: [...new Set(used_regions)],
        boxes: boxes.reduce((acc, b) => {
            let scheme = GenParam.BoxColorSchemes[b];
            acc[b] = {
                hue_family: scheme.hue_family,
                accent_material: scheme.accent_material,
                light_color: scheme.light_color,
                dark_color: scheme.dark_color,
                accent_color: scheme.accent_color,
                chroma: scheme.chroma,
                candidate_id: scheme.candidate_id,
                banned_hues: expand_banned_hues_with_adjacents([...box_regions[b]]),
                regions_using_box: [...box_regions[b]],
                toys_in_box: [...(box_toys[b] || [])],
            };
            return acc;
        }, {}),
        toys: toys.reduce((acc, t) => {
            let cand = toy_assignments[t];
            let banned_core = [toy_region[t], toy_box[t] ? box_hues[toy_box[t]] : null].filter(Boolean);
            acc[t] = {
                primary_hue: cand.primary_hue,
                secondary_hue: cand.secondary_hue,
                light_color: cand.light_color,
                dark_color: cand.dark_color,
                chroma: cand.chroma,
                candidate_id: cand.id,
                own_region_hue: toy_region[t],
                own_box: toy_box[t],
                own_box_hue: toy_box[t] ? box_hues[toy_box[t]] : null,
                banned_hues: expand_banned_hues_with_adjacents(banned_core),
            };
            return acc;
        }, {}),
    };
}

/**
 * Hybrid box + toy color assignment.
 * Boxes keep baked SVG colors unless they co-occur with a conflict region
 * (see GenParam.BoxRegionColorConflicts). Conflict boxes get a light/mid
 * algorithmic swap (accents stay baked). Toys are colored after boxes settle.
 *
 * Returns a serializable overview for DataController.
 */
function assign_experiment_item_colors(fennimalArr) {
    const chromatic_hues = Object.keys(GenParam.ColorHuePalettes).filter(
        (h) => GenParam.ColorHuePalettes[h].angle !== null
    );
    const all_assignable_hues = chromatic_hues.slice();
    if (!all_assignable_hues.includes("gray")) all_assignable_hues.push("gray");

    const baseline_map = GenParam.BoxBaselineHue || {};
    const conflict_map = GenParam.BoxRegionColorConflicts || {};
    const swap_preferred = (GenParam.BoxSwapPreferredHues || []).slice();
    const MIN_BOX_HUE_DIST = GenParam.ColorAlgorithmMinBoxHueDistance || 75;

    const box_region_names = {}; // boxId -> Set of region names
    const box_region_hues = {};  // boxId -> Set of hue families
    const box_toys = {};
    const toy_region = {};
    const toy_box = {};
    const used_regions = [];

    fennimalArr.forEach((fen) => {
        if (fen.region) used_regions.push(fen.region);
        let region_hue = get_region_hue_family(fen.region);
        if (fen.toybox) {
            if (!box_region_names[fen.toybox]) box_region_names[fen.toybox] = new Set();
            if (!box_region_hues[fen.toybox]) box_region_hues[fen.toybox] = new Set();
            if (!box_toys[fen.toybox]) box_toys[fen.toybox] = new Set();
            if (fen.region) box_region_names[fen.toybox].add(fen.region);
            if (region_hue) box_region_hues[fen.toybox].add(region_hue);
            if (fen.toy) box_toys[fen.toybox].add(fen.toy);
        }
        if (fen.toy) {
            toy_region[fen.toy] = region_hue;
            toy_box[fen.toy] = fen.toybox || null;
        }
    });

    const boxes = Object.keys(box_region_names);
    const toys = Object.keys(toy_region);

    function min_distance_to_set(hue, other_hues) {
        if (!other_hues.length) return 180;
        return Math.min(...other_hues.map((o) => hue_family_angular_distance(hue, o)));
    }

    function best_hue_from_candidates(candidates, avoid_hues, already_assigned) {
        let pool = candidates.length ? candidates : all_assignable_hues;
        let filtered = pool.filter((h) => !avoid_hues.includes(h));
        if (!filtered.length) filtered = pool.slice();

        let best = null;
        let best_score = -1;
        shuffleArray(filtered).forEach((h) => {
            let score = min_distance_to_set(h, already_assigned.concat(avoid_hues));
            if (score > best_score) {
                best_score = score;
                best = h;
            }
        });
        return best || "gray";
    }

    function get_swap_fills(hue) {
        let swap = GenParam.BoxSwapPalettes && GenParam.BoxSwapPalettes[hue];
        if (swap) {
            return { light_color: swap.light_color, dark_color: swap.mid_color };
        }
        let p = GenParam.ColorHuePalettes[hue];
        return {
            light_color: p.light_color,
            dark_color: p.toy_dark_color || p.dark_color,
        };
    }

    // --- Step 1: keep baked baselines; swap only on region conflict ---
    const box_meta = {};
    const reserved_hues = [];
    const conflict_boxes = [];

    boxes.forEach((box_id) => {
        let baseline = baseline_map[box_id] || null;
        let conflict_regions = conflict_map[box_id] || [];
        let hits = [...box_region_names[box_id]].filter((r) => conflict_regions.includes(r));
        if (hits.length) {
            conflict_boxes.push(box_id);
            box_meta[box_id] = {
                source: "swapped",
                baseline_hue: baseline,
                conflict_hits: hits,
            };
        } else {
            box_meta[box_id] = {
                source: "baseline",
                hue_family: baseline,
                baseline_hue: baseline,
                conflict_hits: [],
            };
            if (baseline) reserved_hues.push(baseline);
        }
    });

    conflict_boxes.forEach((box_id) => {
        let region_ban = expand_banned_hues_with_adjacents([...box_region_hues[box_id]]);
        let pairwise_ban = expand_box_pairwise_near_misses(reserved_hues);
        let hard_avoid = [...new Set([
            ...region_ban,
            ...pairwise_ban,
            ...reserved_hues,
            box_meta[box_id].baseline_hue,
        ].filter(Boolean))];

        // Chromatic preferred → chromatic fallback → gray only as last resort.
        let preferred = swap_preferred.filter((h) => h !== "gray" && !hard_avoid.includes(h));
        let chromatic_fallback = all_assignable_hues.filter(
            (h) => h !== "gray" && !hard_avoid.includes(h)
        );
        let pool = preferred.length ? preferred : chromatic_fallback;
        let used_gray_fallback = false;
        if (!pool.length) {
            pool = hard_avoid.includes("gray") ? [] : ["gray"];
            used_gray_fallback = pool.length > 0;
            if (used_gray_fallback) {
                console.warn(
                    "Color algorithm: no chromatic swap left for box '" + box_id +
                    "'; falling back to gray"
                );
            }
        }
        if (!pool.length) pool = swap_preferred.concat(all_assignable_hues).filter((h) => h !== "gray");
        if (!pool.length) pool = ["gray"];

        let best = null;
        let best_score = -1;
        shuffleArray(pool.slice()).forEach((h) => {
            if (hard_avoid.includes(h) && pool.some((c) => !hard_avoid.includes(c))) return;
            let d = min_distance_to_set(h, reserved_hues);
            if (d < MIN_BOX_HUE_DIST && pool.some((c) => !hard_avoid.includes(c)
                && min_distance_to_set(c, reserved_hues) >= MIN_BOX_HUE_DIST)) {
                return;
            }
            let score = d;
            if (swap_preferred.includes(h)) score += 20;
            // Never let gray win on distance alone when chromatics are in the pool.
            if (h === "gray") score -= 1000;
            if (score > best_score) {
                best_score = score;
                best = h;
            }
        });
        if (!best) best = pool.find((h) => h !== "gray") || pool[0] || "gray";

        let fills = get_swap_fills(best);
        box_meta[box_id].hue_family = best;
        box_meta[box_id].light_color = fills.light_color;
        box_meta[box_id].dark_color = fills.dark_color;
        box_meta[box_id].recolor_accents = false;
        box_meta[box_id].gray_fallback = best === "gray";
        reserved_hues.push(best);
    });

    GenParam.BoxColorSchemes = {};
    GenParam.BoxEffectiveHues = {};
    const effective_box_hues = {};

    boxes.forEach((box_id) => {
        let meta = box_meta[box_id];
        let hue = meta.hue_family;
        effective_box_hues[box_id] = hue;
        GenParam.BoxEffectiveHues[box_id] = hue;
        if (meta.source === "swapped") {
            GenParam.BoxColorSchemes[box_id] = {
                hue_family: hue,
                light_color: meta.light_color,
                dark_color: meta.dark_color,
                recolor_accents: false,
                source: "swapped",
            };
        }
    });

    // --- Step 2: toys (after effective box hues are known) ---
    const MIN_TOY_DUAL = GenParam.ColorAlgorithmMinToyDualToneDistance || 90;
    const MIN_TOY_PAIR = GenParam.ColorAlgorithmMinToyPairwiseDistance || 50;
    const toy_hues = {};
    const toy_secondary_hues = {};
    const assigned_toy_hues = [];

    function toy_palette_colors(hue) {
        let p = GenParam.ColorHuePalettes[hue] || GenParam.ColorHuePalettes.gray;
        return {
            light_color: p.toy_light_color || p.light_color,
            dark_color: p.toy_dark_color || p.dark_color,
        };
    }

    let toy_order = toys.slice().sort((a, b) => {
        let forbid_a = [toy_region[a], effective_box_hues[toy_box[a]]].filter(Boolean);
        let forbid_b = [toy_region[b], effective_box_hues[toy_box[b]]].filter(Boolean);
        return expand_banned_hues_with_adjacents(forbid_a).length
            - expand_banned_hues_with_adjacents(forbid_b).length;
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
        let hard_core = [];
        if (toy_region[toy_id]) hard_core.push(toy_region[toy_id]);
        if (toy_box[toy_id] && effective_box_hues[toy_box[toy_id]]) {
            hard_core.push(effective_box_hues[toy_box[toy_id]]);
        }
        let hard_avoid = expand_banned_hues_with_adjacents(hard_core);

        let candidates = all_assignable_hues.filter((h) => !hard_avoid.includes(h));
        let primary = best_hue_from_candidates(candidates, hard_avoid, assigned_toy_hues);
        if (hard_avoid.includes(primary)) {
            primary = all_assignable_hues.find((h) => !hard_avoid.includes(h)) || "gray";
        }
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

        if (GenParam.use_color_algorithm_for_toy_colors === true) {
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
        }
    });

    return {
        algorithm: "hybrid_baseline_v1",
        used_regions: [...new Set(used_regions)],
        boxes: boxes.reduce((acc, b) => {
            let meta = box_meta[b];
            acc[b] = {
                source: meta.source,
                hue_family: meta.hue_family,
                baseline_hue: meta.baseline_hue || null,
                conflict_hits: meta.conflict_hits || [],
                conflict_regions_defined: (conflict_map[b] || []).slice(),
                light_color: meta.source === "swapped" ? meta.light_color : null,
                dark_color: meta.source === "swapped" ? meta.dark_color : null,
                recolor_accents: false,
                gray_fallback: meta.source === "swapped" && meta.gray_fallback === true,
                regions_using_box: [...box_region_names[b]],
                region_hues_using_box: [...box_region_hues[b]],
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
                own_box_hue: toy_box[t] ? effective_box_hues[toy_box[t]] : null,
                own_box_source: toy_box[t] && box_meta[toy_box[t]] ? box_meta[toy_box[t]].source : null,
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
    // Optional siblings (e.g. box front/lid) that must share the drag transform + outline.
    let extraElements = Array.isArray(hooks.extraElements)
        ? hooks.extraElements.filter(Boolean)
        : [];
    let extraOriginalParents = extraElements.map((el) => el.parentNode);

    let current_delta_x = 0;
    let current_delta_y = 0;

    let DragGroup = create_SVG_group(0, 0);
    DragGroup.appendChild(DraggableElem);
    for (let i = 0; i < extraElements.length; i++) {
        DragGroup.appendChild(extraElements[i]);
    }
    ElemParentLayer.appendChild(DragGroup);

    if (typeof DraggableElem.id === "undefined") {
        DraggableElem.id = "DragControllerTargetID_" + Math.floor(Math.random() * 10000);
    }

    let Outline;
    if (extraElements.length > 0) {
        Outline = create_SVG_outline_of_multiple_groups(DraggableElem, ...extraElements);
    } else {
        Outline = create_SVG_outline_of_group_ID(DraggableElem);
    }
    Outline.removeAttribute("stroke");
    let allClonedChildren = Outline.querySelectorAll('*');
    allClonedChildren.forEach(child => child.removeAttribute("stroke"));

    DraggableElem.parentNode.insertBefore(Outline, DraggableElem);
    let OriginalPos = getSVGInternalCenter(DraggableElem);

    function restore_elements_from_drag_group() {
        if (OriginalParent) OriginalParent.appendChild(DraggableElem);
        for (let i = 0; i < extraElements.length; i++) {
            if (extraOriginalParents[i]) {
                extraOriginalParents[i].appendChild(extraElements[i]);
            }
        }
    }

    function bake_drag_delta_into_elements() {
        let delta = `translate(${current_delta_x}px, ${current_delta_y}px)`;
        DraggableElem.style.transform += delta;
        for (let i = 0; i < extraElements.length; i++) {
            extraElements[i].style.transform += delta;
        }
    }

    function enable_object_draggable() {
        DraggableElem.style.cursor = "pointer";
        DraggableElem.style.pointerEvents = "auto";
        DraggableElem.onpointerdown = start_dragging;
        for (let i = 0; i < extraElements.length; i++) {
            extraElements[i].style.cursor = "pointer";
            extraElements[i].style.pointerEvents = "auto";
            extraElements[i].onpointerdown = start_dragging;
        }
        Outline.classList.add("focus_on_SVG_outline");
        dragging_is_enabled = true;
    }

    function disable_object_draggable() {
        DraggableElem.style.cursor = "auto";
        for (let i = 0; i < extraElements.length; i++) {
            extraElements[i].style.cursor = "auto";
        }
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

            // 1. Move back to the original layer(s)
            restore_elements_from_drag_group();

            // 2. Apply the final dragged transform to every dragged part
            bake_drag_delta_into_elements();

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
            for (let i = 0; i < extraElements.length; i++) {
                extraElements[i].onpointerdown = null;
            }
            if (Mask) Mask.remove();
            if (Outline && Outline.parentNode) Outline.remove();
            // Leave elements in place; only tear down drag scaffolding.
            if (DragGroup.parentNode && DragGroup.contains(DraggableElem)) {
                restore_elements_from_drag_group();
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
 * Set the nested .scale_group transform on a copy_scale_and_move wrapper.
 */
function set_nested_scale(rootElement, scale, transitionMs = 0) {
    if (!rootElement) return;
    let scaleGroup = rootElement.getElementsByClassName("scale_group")[0];
    if (!scaleGroup) return;
    if (transitionMs > 0) {
        scaleGroup.style.transition = "transform " + transitionMs + "ms ease-in-out";
    } else {
        scaleGroup.style.transition = "none";
    }
    scaleGroup.style.transform = "scale(" + scale + ")";
}

/**
 * Automates the "Magnetic Drop" into a container using an exact target element.
 * options.shrinkFactor — if set, scales the nested .scale_group to (current * factor) during the drop.
 */
async function animate_magnetic_drop(ToyElement, TargetCenterpoint, MiddleLayer, options = {}) {
    return new Promise(resolve => {
        // 1. Lock the toy from further interaction
        ToyElement.style.pointerEvents = "none";
        ToyElement.style.transition = "transform 300ms ease-in-out";

        let svg = ToyElement.ownerSVGElement;
        let shrinkFactor = (typeof options.shrinkFactor === "number") ? options.shrinkFactor : null;
        let scaleGroup = ToyElement.getElementsByClassName("scale_group")[0];
        let baseScale = 1;
        if (scaleGroup && shrinkFactor != null) {
            let match = (scaleGroup.style.transform || "").match(/scale\(([^)]+)\)/);
            baseScale = match ? parseFloat(match[1]) : 1;
            if (!isFinite(baseScale) || baseScale <= 0) baseScale = 1;
        }

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

            if (scaleGroup && shrinkFactor != null) {
                scaleGroup.style.transition = "transform 300ms ease-in";
                scaleGroup.style.transform = "scale(" + (baseScale * shrinkFactor) + ")";
            }

            setTimeout(() => {
                resolve();
            }, 350);

        }, 350); // wait for hover to finish
    });
}

/**
 * Shared logic for dropping a toy into a box, updating world state, and closing the box.
 * options.updatePartnerBelief — default true; set false when partner was absent for the switch.
 * options.forceUserClose — default false; when true, always ask the player to close (ignore partner).
 */
async function shared_toy_drop_sequence(DroppedToyElement, BoxMod, BasicsMod, PartnerMod, FenObj, finish_callback, options = {}) {
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
    let updateBelief = options.updatePartnerBelief !== false;
    if (updateBelief && PartnerMod && PartnerMod.is_present) {
        WorldState.change_partner_belief_in_box_contents(FenObj.toybox, FenObj.toy);
    }

    // Restore box hit-testing so the participant can click to close (toy_to_box clears this while open).
    if (BoxMod && typeof BoxMod.set_pointer_events_enabled === "function") {
        BoxMod.set_pointer_events_enabled(true);
    }

    // 3. Branching Logic: Who closes the box?
    let partnerCloses = options.forceUserClose !== true && PartnerMod && PartnerMod.is_present;
    if (partnerCloses) {
        Interface.Prompt.show_message(PartnerMod.partnername + " closes the " + BoxMod.boxname);
        await PartnerMod.move_to_element_and_act(BoxMod.BoxBase, () => BoxMod.close_box());
        finish_callback();
    } else {
        BoxMod.wait_for_user_click("close", () => finish_callback());
    }
}

/**
 * Drop a toy into an open sack, update sack (+ synced box) world state, then close.
 * Toy shrinks on the way in; fades out when the sack closes.
 * options.shrinkFactor — relative scale while settling in the sack (default 0.82).
 */
async function shared_toy_to_sack_drop_sequence(DroppedToyElement, SackMod, BasicsMod, PartnerMod, FenObj, finish_callback, options = {}) {
    let sackTarget = SackMod.SackTop.getElementsByClassName("sack_target_centerpoint")[0];
    if (!sackTarget) {
        sackTarget = SackMod.ensure_target_centerpoint(SackMod.SackTop);
    }

    let shrinkFactor = (typeof options.shrinkFactor === "number") ? options.shrinkFactor : 0.82;

    await animate_magnetic_drop(
        DroppedToyElement,
        sackTarget,
        BasicsMod.ItemLayers.Plus1,
        { shrinkFactor: shrinkFactor }
    );

    WorldState.change_sack_contents(FenObj.sack, FenObj.toy);

    if (SackMod && typeof SackMod.set_pointer_events_enabled === "function") {
        SackMod.set_pointer_events_enabled(true);
    }

    const fade_toy_into_sack = async () => {
        if (!DroppedToyElement) return;
        DroppedToyElement.style.transition = "opacity 350ms ease-in";
        DroppedToyElement.style.opacity = 0;
        await wait(350);
    };

    if (PartnerMod.is_present) {
        Interface.Prompt.show_message(PartnerMod.partnername + " closes the " + SackMod.sackname);
        await PartnerMod.move_to_element_and_act(SackMod.SackBase, () => SackMod.close_sack());
        await fade_toy_into_sack();
        finish_callback();
    } else {
        SackMod.wait_for_user_click("close", async () => {
            await fade_toy_into_sack();
            finish_callback();
        });
    }
}

/**
 * Drop a closed sack into an open box, update box {toy, sack}, then close the box.
 * options.shrinkFactor — relative scale while settling in the box (default 0.65).
 */
async function shared_sack_to_box_drop_sequence(DroppedSackElement, BoxMod, BasicsMod, PartnerMod, FenObj, finish_callback, options = {}) {
    let boxTarget = BoxMod.BoxTop.getElementsByClassName("box_target_centerpoint")[0];
    let shrinkFactor = (typeof options.shrinkFactor === "number") ? options.shrinkFactor : 0.65;

    await animate_magnetic_drop(
        DroppedSackElement,
        boxTarget,
        BasicsMod.ItemLayers.Plus1,
        { shrinkFactor: shrinkFactor }
    );

    if (FenObj && FenObj.sack) {
        AudioCont.play_sound_effect("sack_placed_" + FenObj.sack);
    }

    let toyInSack = WorldState.get_sack_contents(FenObj.sack);
    WorldState.change_toybox_contents(FenObj.toybox, toyInSack, FenObj.sack);
    if (PartnerMod.is_present) {
        WorldState.change_partner_belief_in_box_contents(FenObj.toybox, toyInSack);
    }

    if (BoxMod && typeof BoxMod.set_pointer_events_enabled === "function") {
        BoxMod.set_pointer_events_enabled(true);
    }

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

            let template = (typeof get_toybox_template === "function")
                ? get_toybox_template(box_id)
                : document.getElementById("toybox_" + box_id);
            if (!template) {
                console.warn("BoxChoiceBar: missing toybox_" + box_id);
                return;
            }
            let RawBox = template.cloneNode(true);
            if (typeof strip_svg_ids_from_subtree === "function") {
                strip_svg_ids_from_subtree(RawBox);
            } else {
                RawBox.removeAttribute("id");
            }
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
 * Sack-choice panel mirroring BoxChoiceBar (clones closed sack templates).
 */
class SackChoiceBar {
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

    waitForSelection(sackIds) {
        return new Promise(resolve => {
            this.show(sackIds, (sack_id) => resolve(sack_id));
        });
    }

    show(sackIds, onSelect) {
        this.destroy();
        this._disabled = false;
        this._selectionHandler = onSelect;

        this.UIGroup = create_SVG_group(0, 0);
        this.parentLayer.appendChild(this.UIGroup);

        const btn_size = this.btn_size;
        const spacing = this.spacing;
        const total_width = (sackIds.length * btn_size) + ((sackIds.length - 1) * spacing);
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

        sackIds.forEach((sack_id, index) => {
            let btn_x = start_x + (index * (btn_size + spacing));
            let btn_y = panel_y;

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

            let template = document.getElementById(sack_id);
            if (!template) {
                console.warn("SackChoiceBar: missing sack id " + sack_id);
                return;
            }
            let RawSack = template.cloneNode(true);
            RawSack.style.display = "inherit";
            let openGroup = RawSack.querySelector(".sack_open");
            if (openGroup) openGroup.remove();
            let closedGroup = RawSack.querySelector(".sack_closed");
            if (closedGroup) closedGroup.style.display = "inline";
            Array.from(RawSack.getElementsByClassName("prep_element_hidden")).forEach((el) => {
                el.style.display = "none";
            });
            BtnGroup.appendChild(RawSack);

            let TBox = RawSack.getBBox();
            let max_dim = Math.max(TBox.width, TBox.height) || 100;
            let scale = (btn_size * 0.85) / max_dim;
            let raw_cx = TBox.x + (TBox.width / 2);
            let raw_cy = TBox.y + (TBox.height / 2);
            let target_cx = btn_x + (btn_size / 2);
            let target_cy = btn_y + (btn_size / 2);
            RawSack.style.transformOrigin = `${raw_cx}px ${raw_cy}px`;
            RawSack.style.transform = `translate(${target_cx - raw_cx}px, ${target_cy - raw_cy}px) scale(${scale})`;

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
                if (handler) handler(sack_id);
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

/**
 * Hat-choice bar for `ask_hat`. Clones `#hat_*` templates into gold buttons.
 */
class HatChoiceBar {
    constructor(parentLayer, W, H, options = {}) {
        this.parentLayer = parentLayer;
        this.W = W;
        this.H = H;
        this.bonus_stars = options.bonus_stars || 0;
        this.panel_y_ratio = options.panel_y_ratio != null ? options.panel_y_ratio : 0.76;
        this.btn_size = options.btn_size || 150;
        this.spacing = options.spacing || 18;
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

    waitForSelection(hatIds) {
        return new Promise(resolve => {
            this.show(hatIds, (hat_id) => resolve(hat_id));
        });
    }

    show(hatIds, onSelect) {
        this.destroy();
        this._disabled = false;
        this._selectionHandler = onSelect;

        this.UIGroup = create_SVG_group(0, 0);
        this.parentLayer.appendChild(this.UIGroup);

        const n = (hatIds || []).length;
        const btn_size = n >= 6 ? 140 : this.btn_size;
        const spacing = n >= 6 ? 16 : this.spacing;
        const total_width = (n * btn_size) + (Math.max(0, n - 1) * spacing);
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

        (hatIds || []).forEach((hat_id, index) => {
            let btn_x = start_x + (index * (btn_size + spacing));
            let btn_y = panel_y;

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

            let template = document.getElementById("hat_" + hat_id);
            if (!template) {
                console.warn("HatChoiceBar: missing hat_" + hat_id);
                return;
            }
            let RawHat = template.cloneNode(true);
            if (typeof strip_svg_ids_from_subtree === "function") strip_svg_ids_from_subtree(RawHat);
            else RawHat.removeAttribute("id");
            RawHat.style.display = "inherit";
            BtnGroup.appendChild(RawHat);

            let TBox = RawHat.getBBox();
            let max_dim = Math.max(TBox.width, TBox.height) || 100;
            let scale = (btn_size * 0.78) / max_dim;
            let raw_cx = TBox.x + (TBox.width / 2);
            let raw_cy = TBox.y + (TBox.height / 2);
            let target_cx = btn_x + (btn_size / 2);
            let target_cy = btn_y + (btn_size / 2);
            RawHat.style.transformOrigin = `${raw_cx}px ${raw_cy}px`;
            RawHat.style.transform = `translate(${target_cx - raw_cx}px, ${target_cy - raw_cy}px) scale(${scale})`;

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
                if (handler) handler(hat_id);
            };
        });

        this.UIGroup.style.transformOrigin = "center";
        this.UIGroup.style.transformBox = "fill-box";
        this.UIGroup.style.transform = "scale(0.8)";
        this.UIGroup.style.opacity = 0;
        this.UIGroup.style.transition = "all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)";
        void window.getComputedStyle(this.UIGroup).opacity;
        this.UIGroup.style.transform = "scale(1)";
        this.UIGroup.style.opacity = 1;
    }
}

/**
 * Face-choice bar for `ask_Fennimal` (region → head). Unique heads only.
 *
 * Trial controllers: before the trial Fennimal is visible, call
 *   await AskFennimalOverlay.run(this);
 * Optional `{ prompt }` overrides "Which Fennimal lives here?".
 * No-ops unless `FenObj.ask_Fennimal` is true.
 */
class AskFennimalOverlay {
    static uniqueOptionsByHead(optionObjs, trialFen) {
        let byHead = new Map();
        (optionObjs || []).forEach((f) => {
            if (!f) return;
            let key = f.head != null ? String(f.head) : ("id:" + f.id);
            let existing = byHead.get(key);
            if (!existing || (trialFen && f.id === trialFen.id)) {
                byHead.set(key, f);
            }
        });
        return Array.from(byHead.values());
    }

    static async run(trial, options = {}) {
        let fen = trial && trial.FenObj;
        if (!fen || !fen.ask_Fennimal) return null;

        let basics = trial.basics;
        if (!basics) {
            console.warn("ask_Fennimal: missing trial.basics; skipping question.");
            return null;
        }

        let layers = basics.ItemLayers || {};
        let layer = options.parentLayer || layers.Plus2 || layers.Main || layers.Partner;
        if (!layer) {
            console.warn("ask_Fennimal: no SVG layer to attach choice bar; skipping question.");
            return null;
        }

        fen.fennimal_errors_made = [];

        let optionObjs = Array.isArray(fen.fennimals_asked_objects)
            ? fen.fennimals_asked_objects.map((f) => JSON.parse(JSON.stringify(f)))
            : [];

        if (!optionObjs.some((f) => f.id === fen.id)) {
            optionObjs.push(JSON.parse(JSON.stringify(fen)));
            console.warn("ask_Fennimal: trial Fennimal was missing from fennimals_asked; added it.");
        }

        optionObjs = AskFennimalOverlay.uniqueOptionsByHead(optionObjs, fen);

        if (optionObjs.length === 0) {
            console.warn("ask_Fennimal: no fennimals_asked options; skipping question.");
            return null;
        }

        let bar = new FennimalChoiceBar(layer, basics.W, basics.H);
        let prompt = options.prompt || "Which Fennimal lives here?";

        while (true) {
            Interface.Prompt.show_message(prompt);
            let selected = await bar.waitForSelection(shuffleArray([...optionObjs]));
            let selectedObj = optionObjs.find((f) => f.id === selected);
            let headMatches = selectedObj && selectedObj.head === fen.head;
            if (selected === fen.id || headMatches) {
                AudioCont.play_sound_effect("positive");
                await bar.hide();
                Interface.Prompt.hide();
                return { correct: true, selected };
            }
            AudioCont.play_sound_effect("rejected");
            fen.fennimal_errors_made.push(selected);
            Interface.Prompt.show_message("Oops, you picked the wrong Fennimal!");
            await bar.hide();
            await wait(1000);
        }
    }
}

/**
 * Hat-choice overlay for `ask_hat`. Unique hats from the phase.
 *
 * Trial controllers: after the Fennimal is visible and after `ask_name`, call
 *   await AskHatOverlay.run(this);
 * Optional `{ prompt }` overrides "What hat did [name] wear?".
 * No-ops unless `FenObj.ask_hat` is true.
 *
 * When `ask_hat` is set, hide the worn hat before `ask_name` with
 *   AskHatOverlay.hideWornHat(this);
 * then reveal after a correct pick (except hat_laundry matching) with
 *   await AskHatOverlay.revealWornHat(this);
 */
class AskHatOverlay {
    static getWornHat(trial) {
        let fen = trial && trial.basics && trial.basics.Fennimal;
        return fen && fen.getElementsByClassName("hat")[0];
    }

    static hideWornHat(trial) {
        if (!trial || !trial.FenObj || !trial.FenObj.ask_hat) return;
        let hat = AskHatOverlay.getWornHat(trial);
        if (!hat) return;
        hat.style.opacity = 0;
        hat.style.pointerEvents = "none";
    }

    static revealWornHat(trial, ms = 350) {
        if (!trial || !trial.FenObj || !trial.FenObj.ask_hat) return wait(0);
        let hat = AskHatOverlay.getWornHat(trial);
        if (!hat) return wait(0);
        hat.style.pointerEvents = "none";
        hat.style.transition = `opacity ${ms}ms ease-out`;
        hat.style.opacity = 1;
        return wait(ms);
    }

    static async run(trial, options = {}) {
        let fen = trial && trial.FenObj;
        if (!fen || !fen.ask_hat) return null;

        let basics = trial.basics;
        if (!basics) {
            console.warn("ask_hat: missing trial.basics; skipping question.");
            return null;
        }
        if (!fen.hat) {
            console.warn("ask_hat: trial Fennimal has no hat; skipping question.");
            return null;
        }

        let layers = basics.ItemLayers || {};
        let layer = options.parentLayer || layers.Plus2 || layers.Main || layers.Partner;
        if (!layer) {
            console.warn("ask_hat: no SVG layer to attach choice bar; skipping question.");
            return null;
        }

        fen.ask_hat_errors_made = [];

        let hatIds = Array.isArray(fen.hats_asked) && fen.hats_asked.length > 0
            ? [...fen.hats_asked]
            : [fen.hat];
        if (!hatIds.includes(fen.hat)) {
            hatIds.unshift(fen.hat);
            console.warn("ask_hat: trial hat was missing from hats_asked; added it.");
        }
        hatIds = [...new Set(hatIds.filter(Boolean))];

        if (hatIds.length === 0) {
            console.warn("ask_hat: no hats_asked options; skipping question.");
            return null;
        }

        let bar = new HatChoiceBar(layer, basics.W, basics.H);
        let prompt = options.prompt || ("What hat did " + (fen.name || "this Fennimal") + " wear?");

        while (true) {
            Interface.Prompt.show_message(prompt);
            let selected = await bar.waitForSelection(shuffleArray([...hatIds]));
            if (selected === fen.hat) {
                AudioCont.play_sound_effect("positive");
                await bar.hide();
                Interface.Prompt.hide();
                return { correct: true, selected };
            }
            AudioCont.play_sound_effect("rejected");
            fen.ask_hat_errors_made.push(selected);
            Interface.Prompt.show_message("Oops, you picked the wrong hat!");
            await bar.hide();
            await wait(1000);
        }
    }
}

/**
 * Toy-choice overlay for `ask_toy` on Fennimal-on-screen trials that do not
 * already use the toy as an interactive prop.
 *
 * Trial controllers (after ask_hat / hat reveal when present):
 *   await AskToyOverlay.run(this);                        // quiz + confetti only
 *   await AskToyOverlay.run(this, { placement: "feet" }); // inert toy at feet
 *   await AskToyOverlay.run(this, { placement: "held" }); // inert toy on body
 *   await AskToyOverlay.run(this, { placement: "feet", fallToFloor: true });
 *
 * No-ops unless `FenObj.ask_toy` is true AND the Fennimal has a `.toy`.
 * Records `FenObj.toy_errors_made`. Stores the spawned SVG on `trial.askToyElement`.
 */
class AskToyOverlay {
    static hasToy(fen) {
        return !!(fen && fen.toy !== undefined && fen.toy !== null && fen.toy !== "");
    }

    static getBodyBurstCenter(trial) {
        let basics = trial && trial.basics;
        if (!basics) return null;
        let anchor = (basics.TargetPoints && basics.TargetPoints.Fennimal_body_center)
            || basics.Fennimal;
        if (!anchor) return null;
        try {
            return getSVGInternalCenter(anchor);
        } catch (err) {
            return null;
        }
    }

    static getFeetWorldPoint(trial) {
        let fen = trial && trial.basics && trial.basics.Fennimal;
        if (!fen || !fen.ownerSVGElement) return null;
        let svg = fen.ownerSVGElement;
        try {
            let bbox = fen.getBBox();
            let localPoint = svg.createSVGPoint();
            localPoint.x = bbox.x + bbox.width / 2;
            localPoint.y = bbox.y + bbox.height;
            let matrixToSVG = svg.getScreenCTM().inverse().multiply(fen.getScreenCTM());
            return localPoint.matrixTransform(matrixToSVG);
        } catch (err) {
            return null;
        }
    }

    static getFeetFloorPoint(trial) {
        let feet = AskToyOverlay.getFeetWorldPoint(trial);
        if (!feet) return null;
        let fen = trial.basics.Fennimal;
        let halfW = 80;
        try {
            let bbox = fen.getBBox();
            let ctm = fen.getCTM && fen.getCTM();
            let scaleX = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
            halfW = Math.max(60, (bbox.width * scaleX) / 2);
        } catch (err) { /* keep default */ }
        return {
            x: feet.x + halfW * 0.55 + 28,
            y: feet.y + 18
        };
    }

    static createInertToyElement(fen, parent, centerX, centerY, scale) {
        let toyId = String(fen.toy).replace(/^toy_/, "");
        let template = document.getElementById("toy_" + toyId);
        if (!template || !parent) return null;

        let toy = copy_scale_and_move_object_to_position(
            template,
            parent,
            centerX,
            centerY,
            scale,
            "ask_toy_" + toyId
        );
        if (typeof set_toy_color_scheme === "function") {
            set_toy_color_scheme(toy, toyId, false);
        }
        if (typeof ToyChoiceBar !== "undefined" && ToyChoiceBar.make_toy_static) {
            ToyChoiceBar.make_toy_static(toy, toyId);
        }
        toy.style.pointerEvents = "none";
        toy.style.cursor = "default";
        toy.onpointerdown = null;
        toy.onpointermove = null;
        toy.onpointerup = null;
        return toy;
    }

    static attachHeldToy(trial) {
        let fen = trial && trial.FenObj;
        let fennimal = trial && trial.basics && trial.basics.Fennimal;
        if (!AskToyOverlay.hasToy(fen) || !fennimal) return null;

        let bodyGroup = fennimal.getElementsByClassName("Fennimal_body")[0];
        let bodyScaleGroup = bodyGroup && bodyGroup.firstElementChild;
        let bodySvg = bodyScaleGroup && bodyScaleGroup.firstElementChild;
        if (!bodySvg) return null;

        let parent = fennimal.getElementsByClassName("Fennimal_scale_group")[0] || bodyScaleGroup;
        let toyGroup = attach_toy_to_fennimal_body(parent, bodySvg, fen, 2.2);
        if (!toyGroup) return null;
        toyGroup.style.pointerEvents = "none";
        toyGroup.style.cursor = "default";
        return toyGroup;
    }

    static async placeAtFeet(trial, options = {}) {
        let fen = trial && trial.FenObj;
        let basics = trial && trial.basics;
        if (!AskToyOverlay.hasToy(fen) || !basics) return null;

        let layers = basics.ItemLayers || {};
        // Prefer Plus2 so the toy sits with / in front of the Fennimal (not under Main).
        let layer = options.parentLayer || layers.Plus2 || layers.Plus1 || layers.Main;
        if (!layer) return null;

        let floor = AskToyOverlay.getFeetFloorPoint(trial);
        let body = AskToyOverlay.getBodyBurstCenter(trial);
        if (!floor) return null;

        let scale = options.scale != null ? options.scale : 3;
        let start = (options.fallToFloor && body) ? body : floor;
        let toy = AskToyOverlay.createInertToyElement(fen, layer, start.x, start.y, scale);
        if (!toy) return null;

        // If the Fennimal is already on this layer, draw the toy after it.
        if (basics.Fennimal && basics.Fennimal.parentNode === layer) {
            layer.appendChild(toy);
        }

        trial.askToyElement = toy;

        if (options.fallToFloor && body) {
            toy.style.transition = "none";
            window.getComputedStyle(toy).transform;
            await wait(40);
            toy.style.transition = "transform 520ms cubic-bezier(0.33, 0.9, 0.45, 1.15)";
            toy.style.transform = `translate(${floor.x}px, ${floor.y}px)`;
            await wait(540);
        }

        return toy;
    }

    static async run(trial, options = {}) {
        let fen = trial && trial.FenObj;
        if (!fen || !fen.ask_toy) return null;
        if (!AskToyOverlay.hasToy(fen)) return null;

        let basics = trial.basics;
        if (!basics) return null;

        let layers = basics.ItemLayers || {};
        let layer = options.parentLayer || layers.Questions || layers.Plus2 || layers.Main || layers.Partner;
        if (!layer) return null;

        fen.toy_errors_made = [];

        let toyOptions = Array.isArray(fen.toys_asked) ? [...fen.toys_asked] : [];
        if (fen.toy && !toyOptions.includes(fen.toy)) {
            toyOptions.push(fen.toy);
        }
        toyOptions = [...new Set(toyOptions.filter(Boolean))];
        if (toyOptions.length === 0) return null;

        let bar = new ToyChoiceBar(layer, basics.W, basics.H);
        let prompt = options.prompt
            || ("Which toy does this " + (fen.name || "Fennimal") + " like to play with?");

        while (true) {
            Interface.Prompt.show_message(prompt);
            let selected = await bar.waitForSelection(shuffleArray([...toyOptions]));

            if (selected === fen.toy) {
                AudioCont.play_sound_effect("positive");
                await bar.hide();
                Interface.Prompt.hide();

                let burstCenter = AskToyOverlay.getBodyBurstCenter(trial)
                    || { x: 0.5 * basics.W, y: 0.45 * basics.H };
                await spawn_confetti_burst(
                    layers.Plus2 || layer,
                    burstCenter.x,
                    burstCenter.y,
                    { awaitPopMs: 900 }
                );

                let placement = options.placement || null;
                if (placement === "held") {
                    trial.askToyElement = AskToyOverlay.attachHeldToy(trial);
                } else if (placement === "feet") {
                    await AskToyOverlay.placeAtFeet(trial, {
                        fallToFloor: !!options.fallToFloor,
                        parentLayer: options.toyParentLayer,
                        scale: options.toyScale
                    });
                }

                return { correct: true, selected, element: trial.askToyElement || null };
            }

            AudioCont.play_sound_effect("rejected");
            fen.toy_errors_made.push(selected);
            Interface.Prompt.show_message("Oops, you picked the wrong toy!");
            await bar.hide();
            await wait(1000);
        }
    }

    static cleanUp(trial) {
        if (!trial) return;
        let el = trial.askToyElement;
        if (el && el.parentNode) el.remove();
        trial.askToyElement = null;
    }
}

/**
 * Instruction-style overlay for typing a Fennimal name (`ask_name`).
 * Case-insensitive match; close misses use LevenshteinDistance.
 * After three failed attempts the correct name is shown; they must still type it.
 *
 * Trial controllers: after the Fennimal is visible, call
 *   await TypedNameAskOverlay.run(this);
 * No-ops unless `FenObj.ask_name` is true.
 */
class TypedNameAskOverlay {
    constructor(parentLayer, W, H, options = {}) {
        this.parentLayer = parentLayer;
        this.W = W;
        this.H = H;
        this.maxFailedAttempts = options.maxFailedAttempts != null ? options.maxFailedAttempts : 3;
        this.closeDistance = options.closeDistance != null ? options.closeDistance : 2;
        this.onWrongAttempt = typeof options.onWrongAttempt === "function" ? options.onWrongAttempt : null;
        this.anchorElement = options.anchorElement || null;
        this.getQuestionHtml = typeof options.getQuestionHtml === "function" ? options.getQuestionHtml : null;
        this.largePanel = options.largePanel === true;
        this.panelTop = (typeof options.panelTop === "number") ? options.panelTop : null;
        this.panelFill = options.panelFill || "rgba(247, 241, 228, 0.72)";
        this.UIGroup = null;
        this.panel = null;
        this.questionWrap = null;
        this.questionP = null;
        this.inputWrap = null;
        this.inputText = null;
        this.submitHolder = null;
        this.submitButton = null;
        this._placement = null;
        this._onKeyDown = null;
        this._disabled = false;
        this._resolve = null;
        this.correctName = "";
        this.failedAttempts = 0;
        this.lastSubmittedGuess = "";
        this.nameRevealed = false;
        this.feedbackKind = null;
        this.lastSubmitAt = 0;
    }

    static async run(trial, options = {}) {
        let fen = trial && trial.FenObj;
        if (!fen || !fen.ask_name) return null;
        if (!fen.name) {
            console.warn("ask_name: trial Fennimal has no name; skipping question.");
            return null;
        }
        let basics = trial.basics;
        if (!basics) {
            console.warn("ask_name: missing trial.basics; skipping question.");
            return null;
        }

        let layers = basics.ItemLayers || {};
        let layer = options.parentLayer || layers.Plus2 || layers.Main || layers.Partner;
        if (!layer) {
            console.warn("ask_name: no SVG layer to attach overlay; skipping question.");
            return null;
        }

        let pauseMs = options.pauseMs != null ? options.pauseMs : 400;
        if (pauseMs > 0) await wait(pauseMs);

        fen.name_errors_made = [];
        fen.name_was_revealed = false;
        if (typeof Interface !== "undefined" && Interface.Prompt) Interface.Prompt.hide();

        let overlay = new TypedNameAskOverlay(layer, basics.W, basics.H, {
            maxFailedAttempts: options.maxFailedAttempts != null ? options.maxFailedAttempts : 3,
            closeDistance: options.closeDistance != null ? options.closeDistance : 2,
            anchorElement: options.anchorElement || basics.Fennimal,
            onWrongAttempt: (typed, dist) => {
                fen.name_errors_made.push({ ans: typed, LSdist: dist });
            }
        });

        let result = await overlay.waitForCorrectName(fen.name);
        fen.name_was_revealed = !!(result && result.nameRevealed);

        if (options.playSuccess !== false) {
            AudioCont.play_sound_effect("positive");
            await TypedNameAskOverlay.playNameplateReveal(trial, fen.name, {
                parentLayer: layer
            });
        }
        return result;
    }

    static get_element_svg_bounds(element) {
        const svg = element && element.ownerSVGElement;
        if (!element || !svg) return null;
        try {
            const r = element.getBoundingClientRect();
            const screenCTM = svg.getScreenCTM();
            if (!screenCTM) return null;
            const inv = screenCTM.inverse();
            const toSvg = (x, y) => {
                const pt = svg.createSVGPoint();
                pt.x = x;
                pt.y = y;
                return pt.matrixTransform(inv);
            };
            const a = toSvg(r.left, r.top);
            const b = toSvg(r.right, r.bottom);
            const left = Math.min(a.x, b.x);
            const top = Math.min(a.y, b.y);
            const right = Math.max(a.x, b.x);
            const bottom = Math.max(a.y, b.y);
            return { left, top, right, bottom, width: right - left, height: bottom - top };
        } catch (err) {
            return null;
        }
    }

    static async playNameplateReveal(trial, name, options = {}) {
        let basics = trial && trial.basics;
        if (!basics) return;

        let layers = basics.ItemLayers || {};
        let layer = options.parentLayer || layers.Plus2 || layers.Main;
        if (!layer) return;

        let nameStr = String(name || "").trim();
        if (!nameStr) return;

        let head = basics.FennimalHead
            || (basics.Fennimal && basics.Fennimal.getElementsByClassName("Fennimal_head")[0]);
        let headBounds = TypedNameAskOverlay.get_element_svg_bounds(head || basics.Fennimal);
        let fenBounds = TypedNameAskOverlay.get_element_svg_bounds(basics.Fennimal);
        let cx = headBounds ? (headBounds.left + headBounds.right) / 2 : (basics.W / 2);
        let headTop = headBounds ? headBounds.top : (fenBounds ? fenBounds.top : basics.H * 0.3);
        if (fenBounds) headTop = Math.min(headTop, fenBounds.top);

        let fontSize = nameStr.length > 10 ? 56 : 72;
        let lettersY = Math.max(fontSize + 18, headTop - 28);
        cx = Math.max(80, Math.min(basics.W - 80, cx));

        let group = create_SVG_group(0, 0, undefined, "fennimal_nameplate");
        group.style.pointerEvents = "none";
        layer.appendChild(group);

        let probe = document.createElementNS("http://www.w3.org/2000/svg", "text");
        probe.setAttribute("font-family", "Arial, sans-serif");
        probe.setAttribute("font-weight", "bold");
        probe.setAttribute("font-size", String(fontSize));
        probe.setAttribute("visibility", "hidden");
        group.appendChild(probe);

        let widths = [];
        for (let i = 1; i <= nameStr.length; i++) {
            probe.textContent = nameStr.slice(0, i);
            widths.push(probe.getComputedTextLength() || (i * fontSize * 0.55));
        }
        probe.remove();

        let totalW = widths[widths.length - 1] || fontSize;
        let startX = cx - totalW / 2;
        startX = Math.max(20, Math.min(basics.W - totalW - 20, startX));

        let underline = document.createElementNS("http://www.w3.org/2000/svg", "line");
        underline.setAttribute("x1", startX);
        underline.setAttribute("y1", lettersY + fontSize * 0.42);
        underline.setAttribute("x2", startX);
        underline.setAttribute("y2", lettersY + fontSize * 0.42);
        underline.setAttribute("stroke", "#d4af37");
        underline.setAttribute("stroke-width", "6");
        underline.setAttribute("stroke-linecap", "round");
        underline.style.opacity = "0.9";
        underline.style.transition = "all 90ms linear";
        group.appendChild(underline);

        const spawnSparkle = (x, y) => {
            let sparkle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            sparkle.setAttribute("points", "0,-14 4,-4 14,0 4,4 0,14 -4,4 -14,0 -4,-4");
            sparkle.setAttribute("fill", "#FFE566");
            sparkle.setAttribute("stroke", "#E6B800");
            sparkle.setAttribute("stroke-width", "1.5");
            sparkle.style.pointerEvents = "none";
            sparkle.style.transformOrigin = "0px 0px";
            sparkle.style.transform = `translate(${x}px, ${y}px) scale(0.2) rotate(-20deg)`;
            sparkle.style.opacity = "1";
            group.appendChild(sparkle);
            window.getComputedStyle(sparkle).opacity;
            sparkle.style.transition = "transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 280ms ease-out";
            sparkle.style.transform = `translate(${x}px, ${y - 18}px) scale(1.15) rotate(25deg)`;
            setTimeout(() => {
                sparkle.style.transition = "transform 220ms ease-in, opacity 220ms ease-in";
                sparkle.style.transform = `translate(${x}px, ${y - 36}px) scale(0.2) rotate(50deg)`;
                sparkle.style.opacity = "0";
                setTimeout(() => sparkle.remove(), 240);
            }, 180);
        };

        let perLetter = Math.max(70, Math.min(130, 850 / Math.max(1, nameStr.length)));
        for (let i = 0; i < nameStr.length; i++) {
            let ch = nameStr[i];
            let left = i === 0 ? 0 : widths[i - 1];
            let right = widths[i];
            let letterX = startX + (left + right) / 2;

            if (ch !== " ") {
                let letter = document.createElementNS("http://www.w3.org/2000/svg", "text");
                letter.setAttribute("x", letterX);
                letter.setAttribute("y", lettersY);
                letter.setAttribute("text-anchor", "middle");
                letter.setAttribute("dominant-baseline", "middle");
                letter.setAttribute("font-family", "Arial, sans-serif");
                letter.setAttribute("font-weight", "bold");
                letter.setAttribute("font-size", String(fontSize));
                letter.setAttribute("fill", "#FFF6D8");
                letter.setAttribute("stroke", "#8A6A1A");
                letter.setAttribute("stroke-width", "2.5");
                letter.setAttribute("paint-order", "stroke fill");
                letter.style.filter = "drop-shadow(0px 3px 5px rgba(0,0,0,0.35))";
                letter.textContent = ch;
                letter.style.transformOrigin = `${letterX}px ${lettersY}px`;
                letter.style.transform = "translateY(22px) scale(0.35)";
                letter.style.opacity = "0";
                group.appendChild(letter);
                window.getComputedStyle(letter).opacity;
                letter.style.transition = "transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 140ms ease-out";
                letter.style.transform = "translateY(0px) scale(1)";
                letter.style.opacity = "1";
                spawnSparkle(letterX, lettersY - fontSize * 0.55);
            }

            underline.setAttribute("x2", startX + right);
            await wait(perLetter);
        }

        if (basics.Fennimal_jump) {
            basics.Fennimal_jump(56, { ms: 150, resolveMs: 300 });
        }
        spawn_confetti_burst(layer, cx, lettersY + 10, { count: 14, awaitPopMs: 0 });

        await wait(1100);
        group.style.transition = "transform 320ms ease-in, opacity 320ms ease-in";
        group.style.transformOrigin = `${cx}px ${lettersY}px`;
        group.style.transform = "scale(0.86)";
        group.style.opacity = "0";
        await wait(320);
        if (group.parentNode) group.remove();
    }

    destroy() {
        this._disabled = true;
        if (this.inputText && this._onKeyDown) {
            this.inputText.removeEventListener("keydown", this._onKeyDown);
        }
        this._onKeyDown = null;
        this.inputText = null;
        this.inputWrap = null;
        this.questionP = null;
        this.questionWrap = null;
        this.panel = null;
        this.submitHolder = null;
        this.submitButton = null;
        this._placement = null;
        this.lastSubmitAt = 0;
        if (this.UIGroup && this.UIGroup.parentNode) this.UIGroup.remove();
        this.UIGroup = null;
    }

    waitForCorrectName(correctName) {
        return new Promise((resolve) => {
            this.correctName = correctName;
            this._resolve = resolve;
            this.failedAttempts = 0;
            this.lastSubmittedGuess = "";
            this.nameRevealed = false;
            this.feedbackKind = null;
            this.lastSubmitAt = 0;
            this.show();
        });
    }

    show() {
        this.destroy();
        this._disabled = false;

        this.UIGroup = create_SVG_group(0, 0, undefined, "typed_name_ask_overlay");
        this.parentLayer.appendChild(this.UIGroup);

        this._placement = this.resolve_placement(this.anchorElement);
        let layout = this.get_panel_layout(this._placement);

        let catcher = create_SVG_rect(0, 0, this.W, this.H);
        catcher.setAttribute("fill", "#111");
        catcher.style.opacity = 0.12;
        catcher.style.pointerEvents = "all";
        this.UIGroup.appendChild(catcher);

        this.panel = create_SVG_rect(layout.panel.x, layout.panel.y, layout.panel.w, layout.panel.h);
        this.panel.setAttribute("rx", 24);
        this.panel.setAttribute("fill", this.panelFill);
        this.panel.setAttribute("stroke", "rgba(184, 159, 93, 0.85)");
        this.panel.setAttribute("stroke-width", "6");
        this.UIGroup.appendChild(this.panel);

        this.questionWrap = create_SVG_foreignElement(
            layout.question.x,
            layout.question.y,
            layout.question.w,
            layout.question.h
        );
        this.questionP = document.createElement("p");
        this.questionP.classList.add("instruction_element_text");
        this.questionP.style.width = "100%";
        this.questionP.style.height = "auto";
        this.questionP.style.margin = "0";
        this.questionP.style.fontSize = layout.fontSize + "px";
        this.questionP.style.textAlign = "center";
        this.questionP.style.lineHeight = "125%";
        this.questionP.style.color = "#3b2f14";
        this.questionP.style.overflow = "visible";
        this.questionWrap.appendChild(this.questionP);
        this.UIGroup.appendChild(this.questionWrap);

        this.inputWrap = create_SVG_foreignElement(
            layout.input.x,
            layout.input.y,
            layout.input.w,
            layout.input.h
        );
        this.inputText = document.createElement("input");
        this.inputText.type = "text";
        this.inputText.maxLength = 32;
        this.inputText.placeholder = "Enter name here";
        this.inputText.autocomplete = "off";
        this.inputText.spellcheck = false;
        this.inputText.style.width = "100%";
        this.inputText.style.height = "100%";
        this.inputText.style.boxSizing = "border-box";
        this.inputText.style.fontSize = "34px";
        this.inputText.style.fontFamily = "Arial, sans-serif";
        this.inputText.style.textAlign = "center";
        this.inputText.style.border = "3px solid #b89f5d";
        this.inputText.style.borderRadius = "12px";
        this.inputText.style.padding = "6px 14px";
        this.inputText.style.background = "rgba(255, 253, 246, 0.92)";
        this.inputText.style.color = "#3b2f14";
        this._onKeyDown = (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                this.submit();
            }
        };
        this.inputText.addEventListener("keydown", this._onKeyDown);
        this.inputWrap.appendChild(this.inputText);
        this.UIGroup.appendChild(this.inputWrap);

        this.submitHolder = create_SVG_group(0, 0);
        this.submitButton = create_SVG_buttonElement(
            layout.submit.cx,
            0,
            layout.submit.w,
            layout.submit.h,
            "Submit",
            40
        );
        this.submitButton.style.cursor = "pointer";
        this.submitButton.onpointerdown = () => this.submit();
        this.submitHolder.appendChild(this.submitButton);
        this.UIGroup.appendChild(this.submitHolder);

        this.update_question_copy();
        requestAnimationFrame(() => this.layoutToContent());

        setTimeout(() => {
            if (this.inputText) this.inputText.focus();
        }, 50);
    }

    resolve_placement(anchorElement) {
        let midX = this.W / 2;
        let b = this.get_element_svg_bounds(anchorElement);
        if (!b || !b.width) return "top";
        if (b.right <= midX) return "right";
        if (b.left >= midX) return "left";
        return "top";
    }

    get_element_svg_bounds(element) {
        return TypedNameAskOverlay.get_element_svg_bounds(element);
    }

    get_panel_layout(placement) {
        const W = this.W;
        const H = this.H;
        let panel;
        if (this.largePanel) {
            let top = (this.panelTop != null) ? this.panelTop : 0.03 * H;
            panel = { x: 0.10 * W, y: top, w: 0.80 * W, h: 0.55 * H };
        } else if (placement === "left") {
            panel = { x: 0.03 * W, y: 0.14 * H, w: 0.44 * W, h: 0.72 * H };
        } else if (placement === "right") {
            panel = { x: 0.53 * W, y: 0.14 * H, w: 0.44 * W, h: 0.72 * H };
        } else {
            panel = { x: 0.12 * W, y: 0.03 * H, w: 0.76 * W, h: 0.46 * H };
        }

        let padX = 0.06 * panel.w;
        let padY = 0.05 * panel.h;
        return {
            placement,
            fontSize: this.largePanel ? 34 : (placement === "top" ? 36 : 32),
            panel,
            question: {
                x: panel.x + padX,
                y: panel.y + padY,
                w: panel.w - 2 * padX,
                h: this.largePanel ? 0.50 * panel.h : 0.42 * panel.h
            },
            input: {
                x: panel.x + 0.10 * panel.w,
                y: panel.y + (this.largePanel ? 0.58 : 0.54) * panel.h,
                w: 0.80 * panel.w,
                h: Math.max(70, Math.min(0.10 * panel.h, 0.085 * H))
            },
            submit: {
                cx: panel.x + 0.5 * panel.w,
                cy: panel.y + (this.largePanel ? 0.86 : 0.84) * panel.h,
                w: Math.min(280, 0.58 * panel.w),
                h: 70
            }
        };
    }

    layoutToContent() {
        if (!this.panel || !this.questionP || !this.questionWrap || !this.inputWrap) return;
        let layout = this.get_panel_layout(this._placement || "top");
        let panel = layout.panel;
        let padX = 0.06 * panel.w;
        let padTop = 22;
        let padBot = 22;
        let gap = 16;
        let inputH = layout.input.h;
        let submitH = layout.submit.h;

        this.questionWrap.setAttribute("x", panel.x + padX);
        this.questionWrap.setAttribute("width", panel.w - 2 * padX);
        this.questionWrap.setAttribute("y", panel.y + padTop);
        this.questionWrap.setAttribute("height", Math.max(160, 0.55 * this.H));
        this.questionP.style.height = "auto";
        this.questionP.style.overflow = "visible";
        void this.questionP.offsetHeight;
        let qH = Math.max(this.questionP.scrollHeight, 44);
        let maxQH = this.H - panel.y - padTop - gap - inputH - gap - submitH - padBot - 8;
        qH = Math.min(qH, Math.max(44, maxQH));
        this.questionWrap.setAttribute("height", qH);
        if (this.questionP.scrollHeight > qH + 2) {
            this.questionP.style.height = "100%";
            this.questionP.style.overflow = "auto";
        }

        let inputY = panel.y + padTop + qH + gap;
        this.inputWrap.setAttribute("x", layout.input.x);
        this.inputWrap.setAttribute("y", inputY);
        this.inputWrap.setAttribute("width", layout.input.w);
        this.inputWrap.setAttribute("height", inputH);

        let submitCy = inputY + inputH + gap + submitH / 2;
        if (this.submitHolder) {
            this.submitHolder.style.transform = "translate(0px, " + submitCy + "px)";
        }

        let panelH = (submitCy + submitH / 2 + padBot) - panel.y;
        panelH = Math.min(Math.max(panelH, 220), this.H - panel.y - 12);
        this.panel.setAttribute("x", panel.x);
        this.panel.setAttribute("y", panel.y);
        this.panel.setAttribute("width", panel.w);
        this.panel.setAttribute("height", panelH);
    }

    update_question_copy() {
        if (!this.questionP) return;
        if (this.getQuestionHtml) {
            this.questionP.innerHTML = this.getQuestionHtml({
                feedbackKind: this.feedbackKind,
                nameRevealed: this.nameRevealed,
                correctName: this.correctName
            });
        } else {
            let html = "What is this Fennimal's name?<br>Please type down the name below.";
            if (this.feedbackKind === "close") {
                html += "<br><br>Close, but not quite yet";
            } else if (this.feedbackKind === "far") {
                html += "<br><br>Oops, that's not it!";
            }
            if (this.nameRevealed && this.correctName) {
                html += "<br><br><span style='display:inline-block;padding:8px 14px;background:#ffe566;border-radius:10px;'>This Fennimal is called <b>"
                    + this.correctName + "</b>. Please type it below.</span>";
            }
            this.questionP.innerHTML = html;
        }
        this.layoutToContent();
    }

    submit() {
        if (this._disabled) return;
        let raw = (this.inputText && this.inputText.value) ? this.inputText.value.trim() : "";
        if (!raw) return;

        let guess = raw.toLowerCase();
        let target = String(this.correctName || "").trim().toLowerCase();
        let now = (typeof performance !== "undefined") ? performance.now() : Date.now();
        // Ignore only accidental double-submits; repeated wrong guesses still count toward reveal.
        if (guess === this.lastSubmittedGuess && (now - (this.lastSubmitAt || 0)) < 350) return;
        this.lastSubmitAt = now;

        let dist = LevenshteinDistance(guess, target);

        if (dist === 0) {
            this._disabled = true;
            let resolve = this._resolve;
            this._resolve = null;
            let result = {
                nameRevealed: this.nameRevealed,
                failedAttempts: this.failedAttempts
            };
            this.destroy();
            if (resolve) resolve(result);
            return;
        }

        this.lastSubmittedGuess = guess;
        AudioCont.play_sound_effect("rejected");
        this.failedAttempts += 1;
        this.feedbackKind = dist <= this.closeDistance ? "close" : "far";
        if (this.failedAttempts >= this.maxFailedAttempts) this.nameRevealed = true;
        if (this.onWrongAttempt) this.onWrongAttempt(raw, dist);
        this.update_question_copy();
        if (this.inputText) {
            this.inputText.focus();
            this.inputText.select();
        }
    }
}
