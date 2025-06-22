
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

function create_SVG_group(x,y,class_name, id_name){
    let Group = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    Group.setAttribute("x",x)
    Group.setAttribute("y",y)

    if(class_name !== undefined){
        Group.classList.add(class_name)
    }
    if(id_name !== undefined){
        Group.setAttribute("id", id_name)
    }
    return(Group)
}

function get_cursor_pos_in_svg(SVG, event){
    let SVG_cursorpoint = SVG.createSVGPoint()
    SVG_cursorpoint.x = event.clientX
    SVG_cursorpoint.y = event.clientY
    let newcoords = SVG_cursorpoint.matrixTransform(SVG.getScreenCTM().inverse())
    return(newcoords)

}

