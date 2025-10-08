ActionButton = function(ParentElem, button_icon, TargetObject, warmup_time, keyboard_shortcut_arr, activationfunc){
    //If this element has a warmup time, then we need to include a circle on the icon to represent this

    let Button, Countdown_Timer, CountdownCircle
    let button_functional = true

    //If there is no target object (set to false), then create the button on a fixed position on the screen
    if(TargetObject === false){
        Button = create_Action_Button_SVG_Element(button_icon, GenParam.ActionButtonParameters_Default, false, warmup_time)
        ParentElem.appendChild(Button)
    }else{
        if(TargetObject === "center"){
            Button = create_Action_Button_SVG_Element(button_icon, GenParam.ActionButtonParameters_Center, false, warmup_time)
            ParentElem.appendChild(Button)

        }else{
            if(typeof TargetObject === "object"){
                //Check if we are referring to a DOM element or to a JSON object
                if(typeof TargetObject.nodeName === "undefined"){
                    //Now its a JSON element, and we will just assume that it has a center_x, center_y, width and height attribute
                    Button = create_Action_Button_SVG_Element(button_icon,TargetObject, false, warmup_time)
                    ParentElem.appendChild(Button)
                }else{
                    //Now we need to present the button on the center of the target location
                    let TargetCenter = get_center_coords_of_SVG_object(TargetObject)
                    let Dims = {
                        center_x: TargetCenter.x,
                        center_y: TargetCenter.y,
                        height: GenParam.ActionButtonParameters_OnObject.height,
                        width: GenParam.ActionButtonParameters_OnObject.width,
                    }

                    Button = create_Action_Button_SVG_Element(button_icon, Dims, true, warmup_time)
                    document.getElementById("Map").appendChild(Button)
                }
            }


        }


    }

    //Fetching the coundown circle
    CountdownCircle = Button.getElementsByClassName("warmup_circle")
    if(CountdownCircle.length === 1){
        CountdownCircle = CountdownCircle[0]
    }


    function start_countdown(){
        AudioCont.play_sound_effect("search_loop")
        CountdownCircle.classList.add("warmup_circle_active")
        CountdownCircle.style.animation = "warmup_circle_animation " + warmup_time + "ms linear"
        Countdown_Timer = setTimeout(function(){if(button_functional){activationfunc(); }}, warmup_time)

    }
    function break_countdown(){
        if(warmup_time !== undefined){
            if(warmup_time !== false){
                clearTimeout(Countdown_Timer)
                CountdownCircle.classList.remove("warmup_circle_active")
                CountdownCircle.style.animation = ""
            }
        }

    }

    Button.onpointerdown = function(){
        let sound_effect = "button_click"
        if(button_icon === "return_arrow"){
            sound_effect = "close_menu"
        }

        if(warmup_time === undefined){
            AudioCont.play_sound_effect(sound_effect)
            activationfunc()
        }else{
            if(warmup_time === false){
                AudioCont.play_sound_effect(sound_effect)
                activationfunc()
            }else{
                if(warmup_time <= 0){
                    AudioCont.play_sound_effect(sound_effect)
                    activationfunc()
                }else{
                    start_countdown()
                }
            }
        }
    }

    Button.onpointerup = function(){ break_countdown()}
    Button.onpointerleave = function(){ break_countdown()}

    //Call to remove this button
    this.delete = function(){
        //Delete the icon from the screen
        Button.remove()
    }

    //Call to disable the button functionality
    this.disable_functionality = function(){
        button_functional = false
    }

    //Call to retrieve a reference to the button element
    this.getButtonElem = function(){
        return(Button)
    }

    //Optionally adding keyboard shortcuts
    if(typeof keyboard_shortcut_arr  !== "undefined"){
        if(Array.isArray(keyboard_shortcut_arr)){
            add_keyboard_shortcuts_to_object(Button,keyboard_shortcut_arr, 500, activationfunc )
        }
    }

}

//Creates a ripple-out circle effect at the given coordinates. See CSS for anmiation.
function create_ripple(ParentElem, x,y, is_large){
    let C1, C2, C3
    if(is_large){
        C1 = create_SVG_circle(x,y,1,"ripple_circle_large", undefined)
        C2 = create_SVG_circle(x,y,1,"ripple_circle_large", undefined)
        C3 = create_SVG_circle(x,y,1,"ripple_circle_large", undefined)
    }else{
        C1 = create_SVG_circle(x,y,1,"ripple_circle", undefined)
        C2 = create_SVG_circle(x,y,1,"ripple_circle", undefined)
        C3 = create_SVG_circle(x,y,1,"ripple_circle", undefined)
    }

    //Starting the three circles with a small offset
    let ripple_animation_time = 1500
    let ripple_offset = 250


    //First
    ParentElem.appendChild(C1)
    setTimeout(function(){C1.remove()}, ripple_animation_time)

    //Second
    setTimeout(function(){ParentElem.appendChild(C2)}, ripple_offset)
    setTimeout(function(){C2.remove()}, ripple_animation_time + ripple_offset)

    //Third
    setTimeout(function(){ParentElem.appendChild(C3)}, 2* ripple_offset)
    setTimeout(function(){C3.remove()}, ripple_animation_time + 2*ripple_offset)

}

MapController = function(ExpCont, WorldState){
    let Map_Layer = document.getElementById("Map"), Interface_Layer = document.getElementById("Interface"),
        Location_Layer = document.getElementById("Location_layer"), Sky_layer = document.getElementById("Sky_Layer"),
        Transition_Mask = document.getElementById("transition_mask"), RequestInstructionsButton
    Map_Layer.style.transition = "all " + GenParam.map_zoom_animation_speed + "ms ease-in-out"
    let that = this

    //Keeps track of which region we are presently in
    let current_region, CurrentPlayerPos,current_action_key_status, previous_action_key_status, Current_Action_Focal_Target
    let player_allowed_to_move = false
    let current_player_status = false
    let currently_in_location = false

    //Returns an array containing the names of all the locations on the map (that is, those having a valid marker element). Each element contains a name and a region
    this.get_all_present_location_names = function(){
        let AllMarkers = document.getElementsByClassName("location_marker")
        let Arr = []

        for(let i =0;i<AllMarkers.length;i++){
            //We can get the name from the ID
            let name = AllMarkers[i].getAttribute("id").split("_")[2]

            //The region is encoded in the classlist. In particular, we want the second classname
            let region = AllMarkers[i].classList[1].split("_")[2]
            Arr.push([name,region])

        }

        return(Arr)
    }

    //Call on creation to assign the correct ID codes to all the location outlines
    function assign_outline_IDs(){
        let AllMarkers = document.getElementsByClassName("location_marker")

        for(let i = 0;i<AllMarkers.length;i++){
            //Find out if the marker has a unique ID
            let marker_id = AllMarkers[i].getAttribute("id")
            let marker_region = AllMarkers[i].classList[1].split("_")[2]

            //If it does: then find the closest outline element
            if(marker_id !== null && marker_id !== "undefined"){
                //Finding the marker coordinates
                let MarkerBox  = AllMarkers[i].getBBox()
                let MarkerCoords = {x: MarkerBox.x + 0.5*MarkerBox.width, y: MarkerBox.y + 0.5*MarkerBox.height}

                //Finding all marker outlines in this region
                let OutlinesInRegion = document.getElementsByClassName("map_location_outline_"+marker_region)
                let ClosestOutline = get_closest_object(MarkerCoords,OutlinesInRegion)

                if(ClosestOutline !== false){
                    //Now we will assign the correct ID to this outline object. However, we also do some checks
                    if(ClosestOutline.Object.getAttribute("id") !== "null"){
                        if(ClosestOutline.dist > 150){
                            console.error("The outline for " + marker_id + " has a suspicious distance of " + ClosestOutline.dist + ". Check map data!")
                        }

                        let marker_name = marker_id.split("_")[2]

                        ClosestOutline.Object.setAttribute("id", "location_outline_" + marker_name)

                        //Now we also update the RegionData in the General Parameters object
                        if(typeof GenParam.RegionData[marker_region].Locations === "undefined"){
                            GenParam.RegionData[marker_region].Locations = []
                        }
                        GenParam.RegionData[marker_region].Locations.push(marker_name)


                    }else{
                        console.error("Double-assigned a location outline ID! " + marker_id)
                    }
                }
            }else{
                console.error("Found a marker without a valid ID. Check map data! (Ignoring this marker for now)")
            }

        }

    }

    //Moves and zooms the map to a given region. Special case: "All" zooms the map out
    function zoom_map_to_region(region_name){
        AudioCont.stop_all_region_sounds()

        //Get coordinates of center
        let coords = GenParam.Map_Region_Centers_Percentage[region_name]

        //Find the correct zoom level
        let zoom_level = GenParam.map_zoom_level
        if(region_name === "All"){
            zoom_level = 1
            coords = {x:50,y:50}
        }
        if(region_name === "Home"){
            zoom_level = GenParam.map_zoom_level_center
        }

        //Setting zoom level to the correct scale level
        let scale_level = 1/zoom_level

        //Setting the correct origin point for the map
        Map_Layer.style.transformOrigin = coords.x + "% " + coords.y + "%"

        //Setting the correct scale
        Map_Layer.style.transform = "scale(" + scale_level + ")"

        //Setting the opacity masks (exception for "all")
        reset_all_region_opacity_masks()
        if(region_name === "All"){
            //Hide all opacity masks
            let Masks = document.getElementsByClassName("map_region_opacity_mask")
            for(let i = 0;i<Masks.length;i++){
                Masks[i].style.opacity =0
            }
            AudioCont.stop_all_region_sounds()
        }else{
            AudioCont.play_region_sound(region_name)
            if(region_name !== "Home"){
                let Mask = document.getElementById("map_region_opacity_mask_" + region_name).style.opacity = 0

            }else{

            }
        }

        //Optionally show some of the icons
        if(GenParam.DisplayFoundFennimalIconsOnMap.show){
            if(GenParam.DisplayFoundFennimalIconsOnMap.display_only_in_current_region){
                display_all_Fennimal_icon_on_map_for_region(region_name)
            }
        }
    }

    //Resets the opacity masks for all regions
    function reset_all_region_opacity_masks(){
        let Masks = document.getElementsByClassName("map_region_opacity_mask")
        for(let i = 0;i<Masks.length;i++){
            Masks[i].style.opacity = GenParam.RegionMaskSetings.base_opacity
            Masks[i].style.fill = GenParam.RegionMaskSetings.color
            Masks[i].style.transition = "all 1000ms ease-in-out"
        }

    }

    //Run this periodically to check the proximity of the player to various objects (for performance reasons, only run this rather infrequently)
    let Check_Proximity_Interval, current_nearest_location = false

    function home_area_set_opacity_masks(){
        let RegionBoundaryElements = document.getElementsByClassName("map_region_enter")
        //Find the closest region boundary
        let ClosestRegionBoundary = get_closest_object(CurrentPlayerPos, RegionBoundaryElements)

        //If we are sufficiently nearby, then start reducing the opacity for the mask of the target region
        reset_all_region_opacity_masks()
        if(ClosestRegionBoundary.dist < 75){
            //Find the name of the closest region
            let region_name = ClosestRegionBoundary.Object.getAttribute("id").split("_")[3]

            let Mask = document.getElementById("map_region_opacity_mask_" + region_name)
            if(Mask !== null){
                Mask.style.opacity = 0
            }


        }
    }
    function home_area_check_distance_to_function_buildings(){
        let PointObj = GenParam.SVGObject.createSVGPoint()
        PointObj.x = CurrentPlayerPos.x
        PointObj.y = CurrentPlayerPos.y

        //For computational efficiency, we perform checks only for the relevant region.
        current_action_key_status = false

        //Check if the player is sufficiently close to the watchtower
        /*if(document.getElementById("map_watchtower_action_region").isPointInFill(PointObj) === true){
            if(current_player_status !== "transition"){
                current_action_key_status = "watchtower"
            }
        }

         */


        //If no locations are nearby, then maybe the watchtower is (but only if there are no nearby locations...)
        let dist_to_watchtower = get_distance_to_object(CurrentPlayerPos, document.getElementById("watchtower"))
        if(dist_to_watchtower < 200){
            current_action_key_status = "watchtower"

        }

    }

    function check_location_marker_proximity(){
        //If any other region we want to find the distance to all of the location markers
        let LocationMarkers = document.getElementsByClassName("location_marker_" + current_region)

        //Finding the closest marker
        let ClosestMarker = get_closest_object(CurrentPlayerPos, LocationMarkers)

        if(ClosestMarker.dist < 2 * GenParam.location_detection_distance){
            //We are within the sphere of influence for a location
            let location_name = ClosestMarker.Object.getAttribute("id").split("_")[2]
            highlight_nearest_location(location_name)

            //If we are sufficiently close, we can maybe search this location
            if(ClosestMarker.dist < GenParam.location_detection_distance){
                //Finding the status of the location name in terms of searchability.
                let location_search_status = WorldState.get_search_status_of_location(location_name)

                switch(location_search_status){
                    case("unsearched"):current_action_key_status = "search";  break
                    case("searched_empty"): current_action_key_status = "empty_location"; break
                    case("searched_Fennimal_not_visited"): current_action_key_status = "enter_location_with_unvisited_Fennimal"; break
                    case("searched_Fennimal_visited"): current_action_key_status = "enter_location_with_already_visited_Fennimal"; break
                    case(false): current_action_key_status = false
                }

            }else{

                current_action_key_status = false
            }

            //Storing the reference to this closest marker
            Current_Action_Focal_Target = ClosestMarker.Object


        }else{
            highlight_nearest_location(false)
            current_action_key_status = false

        }
    }

    function test_player_proximity_to_map_elements(){
        if(! currently_in_location){
            //If we're in the All region, then nothing happens
            if(current_region === "All"){
                return false
            }

            //These functions will update all the proximity-related status settings. This includes the action key status.
            if(current_region === "Home"){
                home_area_set_opacity_masks()
                home_area_check_distance_to_function_buildings()
            }else{
                check_location_marker_proximity()
            }

            //Update the action button
            update_action_button()
        }
    }

    function reset_active_location_highlights(){
        let AllActiveOutlines = document.getElementsByClassName("map_location_outline_active")

        for(let i =0;i<AllActiveOutlines.length;i++){
            AllActiveOutlines[i].classList.add("map_location_outline")
            AllActiveOutlines[i].classList.remove("map_location_outline_active")
        }

    }
    function highlight_nearest_location(location_name){

        //For efficiency, only apply this process if the current nearest location is not the one which has previously been updated
        if(location_name !== current_nearest_location){
            current_nearest_location = location_name
            update_nearest_location_highlights()
        }
        current_nearest_location = location_name
    }
    function update_nearest_location_highlights(){
        // Remove the active status of all locations (resets)
        reset_active_location_highlights()

        //Update the locator
        if(current_nearest_location === false){
            Interface.Locator.change_locator_name(GenParam.RegionData[current_region].display_name)
            //AudioCont.play_sound_effect("nearby_location")
        }else{
            //Check if the location is searchable, or has been searched
            let location_search_status = WorldState.get_search_status_of_location(current_nearest_location)

            if(location_search_status !== false){
                //We're now near a location, so lets update the locator and highlight the location
                Interface.Locator.change_locator_name(GenParam.get_display_name_of_location(current_nearest_location))
                let Location_Outline = document.getElementById("location_outline_" + current_nearest_location)

                Location_Outline.classList.remove("map_location_outline")

                if(location_search_status === "searched_empty"){
                    //Location_Outline.classList.add("map_location_outline_searched")
                }else{
                    Location_Outline.classList.add("map_location_outline_active")
                }

            }
        }



    }

    //Keep track of which icons are displayed on the map (if enabled)
    let CurrentFennimalIconsOnMap = [], Arr_IDs_of_Fennimals_currently_on_map = []

    FennimalIconOnMap = function(FenObj){
        let BoxSettings = {
            width: 60,
            height: 60,
            offset_x: -5,
            offset_y : -50,
            inner_size_factor: 0.9,
            max_opacity: 0.8
        }

        //Some locations needs a manual tweak for fit
        switch(FenObj.location){
            case("Lake"): BoxSettings.offset_x = -30; BoxSettings.offset_y = 10; break
            case("Statue"): BoxSettings.offset_x = 20; break
            case("Fountain"): BoxSettings.offset_y = 0; BoxSettings.offset_x =-30; break
            case("Farm"): BoxSettings.offset_y = 0; BoxSettings.offset_x =30; break
            case("Dam"): BoxSettings.offset_y = -60; BoxSettings.offset_x =10; break
            case("Waterfall"):  BoxSettings.offset_x =-20; break
            case("Cliff"): BoxSettings.offset_x = 30; BoxSettings.offset_y = 30; break
            case("Rainforest"): BoxSettings.offset_x = -20; break
            case("Bush"): BoxSettings.offset_y = 0;  BoxSettings.offset_x = -20; break
            case("Port"): BoxSettings.offset_y = 0; break
            case("Iceberg"): BoxSettings.offset_y = -10; BoxSettings.offset_x = - 25 ; break
            case("Igloo"): BoxSettings.offset_y = 0; BoxSettings.offset_x = - 25; break
            case("Pineforest"): BoxSettings.offset_y = -10;  break

        }

        //First we want to grab the target coordinates of the location. For this we can piggy-back off of the location markers
        let TargetLocationMaker = document.getElementById("location_marker_" + FenObj.location)
        let MapCoords = {x: TargetLocationMaker.getBBox().x , y:  TargetLocationMaker.getBBox().y }

        //Now we create a small Fennimal icon in a box
        let FennimalIconGroup= create_SVG_group(0,0,0,0,undefined,undefined)
        let FennimalIconBoxOuter = create_SVG_rect(0,0,BoxSettings.width + "px", BoxSettings.height + "px", undefined,undefined)
        FennimalIconBoxOuter.style.fill = GenParam.RegionData[FenObj.region].color
        FennimalIconBoxOuter.style.rx = "5px"
        let FennimalIconBoxInner = create_SVG_rect( (0.5*(1-BoxSettings.inner_size_factor)*BoxSettings.width) + "px" , (0.5*(1-BoxSettings.inner_size_factor)*BoxSettings.height ) + "px", (BoxSettings.inner_size_factor * BoxSettings.width) + "px", (BoxSettings.inner_size_factor * BoxSettings.height) + "px", undefined,undefined )
        FennimalIconBoxInner.style.fill = GenParam.RegionData[FenObj.region].lighter_color
        FennimalIconBoxInner.style.rx = "3px"


        //Creating and adding the correct icon
        let Icon
        switch (GenParam.DisplayFoundFennimalIconsOnMap.icon_type){
            case("full"):
                Icon = create_Fennimal_SVG_object(FenObj, GenParam.Fennimal_head_size, false)
                break
            case("head"):
                Icon =create_Fennimal_SVG_object_head_only(FenObj, false)
                break
        }


        //Adding elements on the map
        FennimalIconGroup.appendChild(FennimalIconBoxOuter)
        FennimalIconGroup.appendChild(FennimalIconBoxInner)
        FennimalIconGroup.appendChild(Icon)
        Map_Layer.appendChild(FennimalIconGroup)

        //Scaling the icon
        let scale_factor_w = 1/( Icon.getBBox().width / (BoxSettings.inner_size_factor * BoxSettings.width))
        let scale_factor_h = 1/( Icon.getBBox().height / (BoxSettings.inner_size_factor * BoxSettings.height))
        let min_scale_factor = Math.floor( Math.min(scale_factor_w, scale_factor_h) * 100) / 100

        //Applying to the Fennimal icon scale group
        let ScaleGroup = Icon.getElementsByClassName("Fennimal_scale_group")[0]
        ScaleGroup.style.transform = "scale(" + min_scale_factor + ")"

        //Translation. This depends on whether there is a name. If no, center icon in the middle of the card. If yes, align it to the top instead
        let NewBox = Icon.getBBox()
        let TargetCenter = {x:Math.round(0.5*BoxSettings.width), y:Math.round(0.5*BoxSettings.height)}
        let delta_x = TargetCenter.x - (NewBox.x + 0.5*NewBox.width)
        let delta_y = TargetCenter.y - (NewBox.y + 0.5*NewBox.height)
        Icon.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

        //Moving the box to the right location
        FennimalIconGroup.style.transform = "translate(" + Math.round(MapCoords.x + BoxSettings.offset_x) + "px," + Math.round(MapCoords.y + BoxSettings.offset_y) + "px)"
        FennimalIconGroup.style.opacity = BoxSettings.max_opacity

        //Setting transform
        FennimalIconGroup.style.transition = "all 1000ms ease-in-out"

        this.remove = function(){
            FennimalIconGroup.remove()

        }

        this.display_only_if_in_region = function(region){
            let should_display = false
            if(FenObj.region === region){
                should_display = true
            }else{
                if(GenParam.DisplayFoundFennimalIconsOnMap.display_all_icons_on_watchtower && region === "All"){
                    should_display = true
                }
            }

            if(should_display){
                FennimalIconGroup.style.opacity = BoxSettings.max_opacity
            }else{
                FennimalIconGroup.style.opacity = 0
            }
        }
    }

    this.clear_all_Fennimal_icons_from_map = function(){
        Arr_IDs_of_Fennimals_currently_on_map = []

        for(let i =0;i<CurrentFennimalIconsOnMap.length;i++){
            CurrentFennimalIconsOnMap[i].remove()
        }

        CurrentFennimalIconsOnMap = []



    }

    function display_all_Fennimal_icon_on_map_for_region(region){
        for(let i =0;i<CurrentFennimalIconsOnMap.length;i++){
            CurrentFennimalIconsOnMap[i].display_only_if_in_region(region)
        }

    }

    this.add_Fennimal_icon_on_map = function(FenObj){
        //Check if this Fennimal is already displayed (prevents duplicates)
        if(! Arr_IDs_of_Fennimals_currently_on_map.includes(FenObj.id)){
            CurrentFennimalIconsOnMap.push(new FennimalIconOnMap(FenObj))
            Arr_IDs_of_Fennimals_currently_on_map.push(FenObj.id)
        }
    }

    //ACTION BUTTON FUNCTIONS
    function update_action_button(){

        //Check if there is a change is status. If not, then we don't have to change anything
        if(previous_action_key_status !== current_action_key_status){
            remove_all_action_buttons()

            //Upddating the action key status.
            switch(current_action_key_status){
                case(false):
                    Interface.Prompt.hide()
                    break;
                case("search"):
                    Interface.Prompt.show_message("You can search around for Fennimals in this area", false)
                    show_action_button("magnifier", Current_Action_Focal_Target, false, GenParam.ActionButtonParameters_OnObject.warmup_time)
                    break;
                case("watchtower"):
                    Interface.Prompt.show_message("You can climb up the tower to get a better view of Fenneland", false)
                    //show_action_button("binoculars", false, false);
                    show_action_button("binoculars", document.getElementById("watchtower"), ["Enter"], false);
                    break

                case("watchtower_down"):
                    Interface.Prompt.show_message("Click anywhere to go back down again", 1500)
                    show_action_button("downstairs", false, ["Escape"], false);
                    break;
                case("empty_location"):
                    Interface.Prompt.show_message("There is nothing here at the moment...", false)
                    AudioCont.play_sound_effect("rejected")
                    if(GenParam.can_enter_empty_locations){
                        show_action_button("enter_location_" + current_nearest_location, Current_Action_Focal_Target,["Enter"] ,false)
                    }
                    break

               //case("Fennimal_present_but_not_visited"):
               //     Interface.Prompt.show_message("There is a Fennimal in this location!", false)
               //     show_action_button("enter_location_" + current_nearest_location, Current_Action_Focal_Target,false )
               //
                case("enter_location_with_unvisited_Fennimal"):
                    Interface.Prompt.show_message("There is a Fennimal present at this location!", false)
                    AudioCont.play_sound_effect("success")
                    show_action_button("enter_location_" + current_nearest_location, Current_Action_Focal_Target,["Enter"], false )
                    break
            }

            //Update the previous status
            previous_action_key_status = current_action_key_status
        }
    }

    function action_key_pressed(){
        remove_all_action_buttons()
        switch(current_action_key_status){
            case("watchtower"): Player.climb_watchtower(); break
            case("watchtower_down"): Player.leave_watchtower(); break
            case("search"): perform_search_at_current_location(); break
            case("empty_location"):
                if(GenParam.can_enter_empty_locations){
                    enter_location(current_nearest_location)
                    //TODO: REMOVE, NEEDS TO BE ROUTED VIA EXP CONTROLLER
                    that.allow_participant_to_leave_location()
                }
                break
            case("enter_location_with_unvisited_Fennimal"):
                enter_location(current_nearest_location)
                break
            case("enter_location_with_visited_Fennimal"):
                enter_location(current_nearest_location)
                that.allow_participant_to_leave_location(true)
                break

            case("return_to_map"):
                that.return_to_map()
                break
        }
    }

    function remove_all_action_buttons(){
        for(let i=0;i<ActiveActionButtonArr.length; i++){
            ActiveActionButtonArr[i].delete()
        }
        ActiveActionButtonArr = []
    }
    function show_action_button(button_icon, TargetObject,keyboard_shortcuts_arr, warmup_time, ){
        //Remove all buttons
        remove_all_action_buttons()

        //Create a new button
        ActiveActionButtonArr.push(new ActionButton(Interface_Layer, button_icon, TargetObject, warmup_time, keyboard_shortcuts_arr, action_key_pressed))

        //If button icon is false, then we're done
        if(button_icon ===  false){
            return true
        }


    }

    //Shows the action button on the map level. Assumes that there can be only a single button at the same time. If called with false will remove all buttons.
    let ActiveActionButtonArr = []

    //SEARCH AND TRANSITION FUNCTIONS
    function perform_search_at_current_location(){
        let Closest_Marker = get_closest_object(CurrentPlayerPos, document.getElementsByClassName("location_marker_" + current_region))
        let location_name = Closest_Marker.Object.getAttribute("id").split("_")[2]

        //Create a ripple to provide feedback on search competed
        let Coords = get_center_coords_of_SVG_object(Closest_Marker.Object)
        setTimeout(function(){create_ripple(Map_Layer, Coords.x,Coords.y, false)}, 100)

        //Performing search at location
        let Search_outcome = WorldState.perform_search_at_location(location_name)
        if(Search_outcome === "empty_unsearched"){
            //let Location_Outline = document.getElementById("location_outline_" + location_name)
            //Location_Outline.classList.add("map_location_outline_searched")
            //Location_Outline.classList.remove("map_location_outline")

            update_nearest_location_highlights()
            //test_player_proximity_to_map_elements()
        }else{
            //If an object is returned, then this is a Fennimal
            current_action_key_status = "Fennimal_present"

        }

        //current_action_key_status = false
        update_action_button()



    }

    // LOCATION FUNCTIONS
    function hide_all_locations(){
        let All_Location_Backgrounds = document.getElementsByClassName("location")
        for(let i=0;i<All_Location_Backgrounds.length;i++){
            All_Location_Backgrounds[i].style.display = "none"
        }

        let All_Sky_Layers = document.getElementsByClassName("location_sky")
        for(let i=0;i<All_Sky_Layers.length;i++){
            All_Sky_Layers[i].style.display = "none"
        }
        Location_Layer.style.display = "none"
        Sky_layer.style.display = "none"

    }
    function enter_location(location, optional_switched_region){
        currently_in_location = true
        hide_all_locations()
        flash_location_transition_mask(current_region)

        RequestInstructionsButton.style.display = "none"

        setTimeout(function(){
            //Hide the map
            Map_Layer.style.display = "none"

            //Show the location layer and the correct background
            Location_Layer.style.display = "inherit"
            document.getElementById("location_" + location).style.display = "inherit"

            //Show the sky layer and sky
            Sky_layer.style.display = "inherit"
            if(optional_switched_region !== undefined){
                document.getElementById("sky_" + optional_switched_region).style.display = "inherit"
            }else{
                document.getElementById("sky_" + current_region).style.display = "inherit"
            }
            ExpCont.entering_location(location)

        }, 0.5 * GenParam.map_to_location_transition_speed)
    }

    function flash_location_transition_mask(optional_region){
        if(optional_region!== undefined){
            if(optional_region !== false){
                //Find the region colors
                document.getElementById("transition_mask_rect").style.fill = GenParam.RegionData[optional_region].lighter_color

            }else{
                //Set to default black
                document.getElementById("transition_mask_rect").style.fill = "black"
            }
        }else{
            //Set to default black
            document.getElementById("transition_mask_rect").style.fill = "black"
        }

        //Show the transition mask animation
        Transition_Mask.style.animation = "map_transition_animation " + GenParam.map_to_location_transition_speed + "ms ease-in-out forwards"

        setTimeout(function(){
            Transition_Mask.style.animation = ""
        }, GenParam.map_to_location_transition_speed)


    }

    //Call to allow the participant to leave a location
    this.allow_participant_to_leave_location = function(add_keyboard_shortcut){
        if(currently_in_location){
            show_action_button("return_arrow", "center", ["Escape", "Enter", " "], false);
            current_action_key_status = "return_to_map"
        }

        if(add_keyboard_shortcut){

        }
    }

    //Call to leave a location and return to the map
    this.return_to_map = function(){
        if(currently_in_location){
            flash_location_transition_mask(current_region)
            setTimeout(function(){
                Map_Layer.style.display = "inherit"
                hide_all_locations()
            },0.5* GenParam.map_to_location_transition_speed)
            RequestInstructionsButton.style.display = "inherit"
        }else{
            Map_Layer.style.display = "inherit"
            hide_all_locations()
        }

        currently_in_location = false
        ExpCont.leaving_location()
    }

    //Call to return the participant to the center of the map
    this.reset_map_to_player_in_center = function(){
        this.return_to_map()
        Player.jump_to_map_center()
        if(GenParam.DisplayFoundFennimalIconsOnMap.show){
            if(GenParam.DisplayFoundFennimalIconsOnMap.display_only_in_current_region){
                display_all_Fennimal_icon_on_map_for_region("Home")
            }
        }

    }

    //Call to disable or enable map interations
    this.disable_map_interactions = function(){
        player_allowed_to_move = false
        AudioCont.stop_all_region_sounds()

    }
    this.enable_map_interactions = function(){
        player_allowed_to_move = true
        AudioCont.play_region_sound(current_region)
    }

    //Call to show the request-instructions button on the top of the page
    this.show_request_instructions_button = function(){
        RequestInstructionsButton.style.display = "inherit"

    }
    function create_request_instructions_button(){
        RequestInstructionsButton = create_SVG_buttonElement(GenParam.RequestInstructionButtonSettings.center_x,GenParam.RequestInstructionButtonSettings.center_y,GenParam.RequestInstructionButtonSettings.width,GenParam.RequestInstructionButtonSettings.height,GenParam.RequestInstructionButtonSettings.text, GenParam.RequestInstructionButtonSettings.textsize)
        Interface_Layer.appendChild(RequestInstructionsButton)
        RequestInstructionsButton.style.display = "none"
        RequestInstructionsButton.onpointerdown = function(){request_instructions_button_clicked(); AudioCont.play_sound_effect("button_click")}
        RequestInstructionsButton.style.fontWeight = GenParam.RequestInstructionButtonSettings.fontWeight
        RequestInstructionsButton.classList.add("do_not_move_on_click")

    }
    function request_instructions_button_clicked(){
        ExpCont.instructions_requested()
    }

    //HINTS
    function flash_hints_from_watchtower(){
        //Find out which locations have a Fennimal and have not been searched
        let TargetLocations = []
        let CurrentStates = WorldState.get_location_states_as_object()
        for(let key in CurrentStates){
            if(CurrentStates[key].search_status === 'unsearched'){
                if(typeof CurrentStates[key].id !== "undefined"){
                    TargetLocations.push(key)
                }
            }
        }

        for(let i =0;i<TargetLocations.length;i++){
            flash_hint_at_location(TargetLocations[i])
        }

    }

    function flash_hint_at_location(location_name){
        let Marker =  document.getElementById("location_marker_" + location_name)
        create_ripple(Map_Layer,Marker.getBBox().x, Marker.getBBox().y,true)
    }


    //On start
    reset_all_region_opacity_masks()

    //Subcontroller for the player icon movement
    PlayerIconController = function(){
        let playerthat = this
        let player_speed = GenParam.Speedlimits.default
        let default_transition = "all 100ms linear"

        let PlayerIcon = document.getElementById("player_icon")
        //PlayerIcon.style.transformOrigin = "center"
        PlayerIcon.style.transition = default_transition
        let IconDims = {w: PlayerIcon.getBBox().width, h: PlayerIcon.getBBox().height}

        this.allow_movement = function(){
            player_allowed_to_move = true
            Check_Proximity_Interval = setInterval(test_player_proximity_to_map_elements, 250)
        }
        this.disable_movement = function(){
            player_allowed_to_move = false
            clearInterval(Check_Proximity_Interval)
        }

        //Updates the player icon to its current location
        function update_icon_position(){
            PlayerIcon.style.transform = "translate(" + (CurrentPlayerPos.x ) + "px, " + (CurrentPlayerPos.y ) + "px)"
        }

        //Resets the player icon to the center of the map
        this.jump_to_map_center = function(){
            move_to_region("Home")
            CurrentPlayerPos = { x: 0.5*GenParam.SVG_width, y: 0.5*GenParam.SVG_height }
            update_icon_position()
        }

        //General movement functions
        //Checks if a given coordinate is valid to move to
        function check_if_coords_valid(x,y){
            if(x < 0 || y < 0 || x > GenParam.SVG_width || y > GenParam.SVG_height){
                return(false)
            }

            let PointObj = GenParam.SVGObject.createSVGPoint()
            PointObj.x = x
            PointObj.y = y

            //These objects are always checked
            let General_Blocking_objects = GenParam.SVGObject.getElementsByClassName("map_block")
            for(let i=0;i<General_Blocking_objects.length;i++){
                if(General_Blocking_objects[i].isPointInFill(PointObj) === true){
                    return(false)
                }
            }

            //Depending on the region, we want to check some more blocking elements
            let Region_Blocking_objects = GenParam.SVGObject.getElementsByClassName("map_block_" + current_region)
            for(let i=0;i<Region_Blocking_objects.length;i++){
                if(Region_Blocking_objects[i].isPointInFill(PointObj) === true){
                    return(false)
                }
            }
            return(true)

        }
        function check_if_pressing_on_do_not_move_area(Target){
            return(! Target.classList.contains("do_not_move_on_click"))
        }

        //Attempts to move to a given coordinate (if the location is not valid, or the mouse is pressing a do-not-move area, then nothing happens)
        function attempt_to_move_to_coords(x,y){
            if( !(x === CurrentPlayerPos.x && y === CurrentPlayerPos.y)){
                if(check_if_coords_valid(x,y) ){
                    move_to_coords(x,y)
                }
            }
        }
        function move_to_coords(x,y){
            CurrentPlayerPos = {x: parseFloat(x), y:parseFloat(y)}
            update_icon_position()
            check_for_region_shift()
            update_action_button()
            check_for_auto_events()
        }

        //Triggers any events that occur when the player touches some specific areas. Note that this only fires if the player is not currently in the middle of something...
        function check_for_auto_events(){
            if(current_player_status === false){
                let PointObj = GenParam.SVGObject.createSVGPoint()
                PointObj.x = CurrentPlayerPos.x
                PointObj.y = CurrentPlayerPos.y

                //For computational efficiency, we perform checks only for the relevant region.
                if(current_region === "Home"){
                    //Check if the player touched the auto-move region
                    //if(document.getElementById("map_watchtower_forced_region").isPointInFill(PointObj) === true){
                    //    playerthat.climb_watchtower()
                   // }
                }
            }

        }

        function move_to_region(new_region){
            current_region = new_region
            zoom_map_to_region(new_region)

            //Inform the Interface that we have moved to a new region
            Interface.player_moved_to_new_region(new_region)

        }

        //Detects the current speed (depends on the substrate the player is standing on)
        function update_player_speed(){
            //Reset to default
            player_speed = GenParam.Speedlimits.default

            //Create a point at the current location
            let PointObj = GenParam.SVGObject.createSVGPoint()
            PointObj.x = CurrentPlayerPos.x
            PointObj.y = CurrentPlayerPos.y

            //Checks are done by region

            //Detect whether the player is standing on a road
            let Road_objects = GenParam.SVGObject.getElementsByClassName("map_road_" + current_region)
            for(let i=0;i<Road_objects.length;i++){
                if(Road_objects[i].isPointInFill(PointObj) === true){
                    player_speed = GenParam.Speedlimits.road
                }
            }

            //Detect whether the player is standing on a path
            let Path_objects = GenParam.SVGObject.getElementsByClassName("map_road"+  + current_region)
            for(let i=0;i<Path_objects.length;i++){
                if(Path_objects[i].isPointInFill(PointObj) === true){
                    player_speed = GenParam.Speedlimits.road
                }
            }

        }

        /*window.onkeydown = function(e){
            let code = e.key
            //Movement
            if(player_allowed_to_move){
                if(GenParam.player_movement_allowed_schemes.includes("keyboard_arrows")){
                    if(code === "ArrowUp"){move_cardinal_direction("up") }
                    if(code === "ArrowDown"){move_cardinal_direction("down") }
                    if(code === "ArrowLeft"){move_cardinal_direction("left") }
                    if(code === "ArrowRight"){move_cardinal_direction("right") }
                }

                if(GenParam.player_movement_allowed_schemes.includes("keyboard_WASD")){
                    if(code === "w"){move_cardinal_direction("up") }
                    if(code === "s"){move_cardinal_direction("down") }
                    if(code === "a"){move_cardinal_direction("left") }
                    if(code === "d"){move_cardinal_direction("right") }
                }
            }

            //Action key
            if(GenParam.Keymaps.actionkey.includes(code)){
                //The action key is pressed.
                action_key_pressed()
            }



        }

         */

        //Mouse movement function
        let MouseMoveInterval, moving_to_mouse = false, MouseTargetCoords

        function setMouseTargetCoords(x,y){
            MouseTargetCoords = {x:x,y:y}
        }
        function start_mouse_moving_interval(){
            MouseMoveInterval = setInterval(function(){
                if(moving_to_mouse){
                    move_icon_towards_mouse_target_coords()
                }
            }, 30)
        }
        function move_icon_towards_mouse_target_coords(){
            //Update the player speed depending on the current substrate
            update_player_speed()

            //Find own location ON SCREEN (not in SVG coordinates)
            let Bounds = PlayerIcon.getBoundingClientRect()
            let Own_location = {x: Bounds.x, y: Bounds.y }

            //Find the distance to the mouse. Only move if theres a minimum distance (prevents wiggling)
            let dist_to_mouse = EUDistPoints(Own_location,MouseTargetCoords)

            if(dist_to_mouse > GenParam.player_minimum_move_distance){
                // Finding the angle to move in
                //let angleDeg = Math.atan2(MouseTargetCoords.y - Own_location.y, MouseTargetCoords.x - Own_location.x) * 180 / Math.PI;
                let angleRad = Math.atan2(MouseTargetCoords.y - Own_location.y, MouseTargetCoords.x - Own_location.x);

                //Calculate the point that we want to move towards
                let x_delta = player_speed * Math.cos(angleRad)
                let y_delta = player_speed * Math.sin(angleRad)

                attempt_to_move_to_coords(Math.round(CurrentPlayerPos.x + x_delta), Math.round(CurrentPlayerPos.y + y_delta))
            }



        }

        document.onpointerup = function(event){
            moving_to_mouse = false
            clearInterval(MouseMoveInterval)
        }
        document.onpointerleave = function(event){
            moving_to_mouse = false
            clearInterval(MouseMoveInterval)
        }

        document.onpointerdown = function(event){
            //First check if we are clicking on a do-not-move area. If not, then try moving.
            if(! currently_in_location){
                if(check_if_pressing_on_do_not_move_area(event.target)){
                    moving_to_mouse = false
                    clearInterval(MouseMoveInterval)

                    if(player_allowed_to_move){
                        moving_to_mouse = true
                        setMouseTargetCoords(event.x,event.y)
                        start_mouse_moving_interval()
                    }else{

                    }

                    //Clicking anywhere on the map while in the watchtower will move the player down
                    if(current_player_status === "in_watchtower"){
                        playerthat.leave_watchtower()
                    }
                }
            }




        }

        document.onpointermove = function(event){
            if(player_allowed_to_move){
                moving_to_mouse = true
                setMouseTargetCoords(event.x,event.y)
            }
        }

        //Region transition functions
        function check_for_region_shift(){
            //Create a point at the current location
            let PointObj = GenParam.SVGObject.createSVGPoint()
            PointObj.x = CurrentPlayerPos.x
            PointObj.y = CurrentPlayerPos.y

            //If we are in the "Home" region, then we need to check if the player is touching any of the available region entering zones
            if(current_region === "Home"){
                let Region_enter_objects = GenParam.SVGObject.getElementsByClassName("map_region_enter")
                for(let i=0;i<Region_enter_objects.length;i++){
                    if(Region_enter_objects[i].isPointInFill(PointObj) === true){
                        //Entering a new region! Get the name from the id
                        let new_region_name = Region_enter_objects[i].id.replace("map_region_enter_", "")
                        move_to_region(new_region_name)
                    }
                }


            }else{
                //If we are in a non-Home region, then we need to check if the player is touching a Home-transition area
                let Region_leave_objects = GenParam.SVGObject.getElementsByClassName("map_region_leave")
                for(let i=0;i<Region_leave_objects.length;i++){
                    if(Region_leave_objects[i].isPointInFill(PointObj) === true){
                        //Going back to the center
                        move_to_region("Home")
                    }
                }

            }



        }

        //Action key functions
        //This updates whenever the player is moving around. Use to check if the action key may be primed for action.

        //Watchtower functions
        //////////////////////

        //Interval to show hints on top of the watchtower
        let Watchtower_hint_interval, watchtower_hint_speed = 3000

        this.climb_watchtower = function(){
            //Remove the action key status
            current_action_key_status = false
            current_player_status = "transition"
            current_region = "All"

            //Disable player movement while in the watchtower
            player_allowed_to_move = false
            clearInterval(MouseMoveInterval)

            //Move the player to the starting point
            PlayerIcon.style.transition = "all 500ms ease-out"
            setTimeout(function(){
                //Find starting location coords
                let Base_marker = document.getElementById("map_watchtower_start")
                let Base_coords = {x: Base_marker.getAttribute("cx"), y: Base_marker.getAttribute("cy")}
                move_to_coords(Base_coords.x,Base_coords.y)
                update_icon_position()


                setTimeout(function(){
                    PlayerIcon.style.transition = "all 2s ease-out"

                    let Top_marker = document.getElementById("map_watchtower_end")
                    let Top_coords = {x: Top_marker.getAttribute("cx"), y: Top_marker.getAttribute("cy")}
                    move_to_coords(Top_coords.x,Top_coords.y)
                    update_icon_position()

                    setTimeout(function(){
                        zoom_map_to_region("All")
                        current_player_status = "in_watchtower"
                        current_action_key_status = "watchtower_down"
                        update_action_button()

                    },2000)

                },500)
            },10)

            if(GenParam.get_hint_on_top_of_watchtower){
                Watchtower_hint_interval = setInterval(function(){flash_hints_from_watchtower()}, watchtower_hint_speed)
            }

        }

        this.leave_watchtower = function(){
            current_action_key_status = false
            current_region = "Home"
            //Return to normal zoom levels
            zoom_map_to_region("Home")
            PlayerIcon.style.transition = "all 2s ease-in"
            Interface.Prompt.hide()
            current_player_status = "transition"

            clearInterval(Watchtower_hint_interval)

            setTimeout(function(){
                //Move down the ladder
                let Base_marker = document.getElementById("map_watchtower_start")
                let Base_coords = {x: Base_marker.getAttribute("cx"), y: Base_marker.getAttribute("cy")}
                move_to_coords(Base_coords.x,Base_coords.y)
                update_icon_position()

                setTimeout(function(){
                    //Re-allow movement
                    current_action_key_status = "watchtower"
                    current_player_status = false
                    player_allowed_to_move = true
                    PlayerIcon.style.transition = default_transition
                    current_player_status = false

                },2200)

            },100)





            //Enable movement
            //
        }


        //Mouse input for entering the watchtower
        /*
        document.getElementById("map_watchtower_action_region").onpointerdown = function(){
            //Check if the participant is within bounds
            let PointObj = GenParam.SVGObject.createSVGPoint()
            PointObj.x = CurrentPlayerPos.x
            PointObj.y = CurrentPlayerPos.y

            if(document.getElementById("map_watchtower_action_region").isPointInFill(PointObj) === true){
                // If we're not in the watchtower, then climb up
                if(current_player_status === false){
                    climb_watchtower()
                }
            }

            //If we're in the watchtower, climb down
            if(current_player_status === "in_watchtower"){
                leave_watchtower()
            }

        }

         */
        //Clicking anywhere on the map while in the watchtower will move the player down






    }

    assign_outline_IDs()
    let Player = new PlayerIconController()


    //On start
    Player.jump_to_map_center()
    Player.allow_movement()
    create_request_instructions_button()



}

console.warn("SCRIPTS - LOADED MAP CONTROLLER")