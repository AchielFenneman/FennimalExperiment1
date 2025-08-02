SVG_LOADER = function(){
    //Finding the SVG
    let SVGObj = document.getElementById("Scannimals_Task_SVG")

    //Loading data objects
    let All_data_objects_arr = [new SVG_MAP_DATA()]

    //Adding all SVG code for the map
    while(All_data_objects_arr.length > 0){
        SVGObj.innerHTML = SVGObj.innerHTML + remove_svg_tag_from_string(All_data_objects_arr[0].SVG_string)
        All_data_objects_arr.shift()
    }

    //Adding SVG for the heads and bodies
    // In both cases I previosly added a placeholder element to this layer, to ensure it gets properly parsed by the optimizer
    document.getElementById("Fennimal_Templates_Layer").innerHTML = ""

    let SVG_Heads = extract_all_SVG_heads_to_array(new RawSVGHeadsData().string)
    let SVG_Heads_Group = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    SVG_Heads_Group.id = "All_Heads"
    document.getElementById("Fennimal_Templates_Layer").appendChild(SVG_Heads_Group)

    for(let i =0;i<SVG_Heads.length;i++){
        SVG_Heads_Group.appendChild(SVG_Heads[i])
    }

    let SVG_Bodies= extract_all_SVG_bodies_to_array(new RawSVGBodiesData().string)
    let SVG_Bodies_Group = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    SVG_Bodies_Group.id = "All_Bodies"
    document.getElementById("Fennimal_Templates_Layer").appendChild(SVG_Bodies_Group)

    for(let i =0;i<SVG_Bodies.length;i++){
        SVG_Bodies_Group.appendChild(SVG_Bodies[i])
    }

}


console.warn("RESOURCES - COMPLETED LOADING SVG ELEMENTS")