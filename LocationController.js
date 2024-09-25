//Manages all movement on the map and to the different regions / locations.
console.warn("RUNNING LOCATION CONTROLLER")

//The map movement controller does NOT handle the visual appearance of the map. Only its dynamic interactions.
Map_movement_controller = function(LocCont){
    let that = this
    let Player, LocationMarkerControllers
    let Home_button = document.getElementById("home_button")

    //Prevents double loading of regions when travelling
    let flag_hold_all_movement = false

    // LOCATION MARKER CONTROLLERS //
    //Object to manage the states and interactions for all of the location markers.
    // Given a name, finds the relevant SVG elements.
    // Initialized in inactive state
    LocationMarker = function(name, MapCon){
        let state = "inactve"
        let mouse_pressed_state = false
        let mouse_check_interval = false
        let Marker = document.getElementById("location_marker_"+name)
        let Boundary_element = document.getElementById("location_marker_"+name+"_boundary")

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
        Marker.onpointerleave= function(){
            mouse_pressed_state = false
            clearInterval(mouse_check_interval)
        }
        Marker.onpointerup= function(){
            mouse_pressed_state = false
            clearInterval(mouse_check_interval)
        }
        Marker.onpointerdown = function(){
            if(state === "active"){
                mouse_pressed_state = true
                mouse_check_interval = setInterval(function (){
                    MapCon.stepSelected(name)
                },2)
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

    // PLAYER ICON CONTROLLER //
    ////////////////////////////
    PlayerIconController = function(MapMovementCont){
        //Each path is assumed to have 100 steps. The speed by which these steps are taken can be set by the Parameter walking_interval_time
        let currentPath = false
        let currentStep = 0
        let SVG_Icon = document.getElementById("player_icon")
        let SVG_currentpath = false
        let currentPathLength = 0

        //Calculating offsets for the icon image
        let offset_W = 14
        let offset_H = 17

        //Setting the icon invisible to mouse events
        SVG_Icon.style.pointerEvents = "none"

        //Call when a step has been taken. If in the current direction, move forward. If in any other direction, move back and evaluate if a path needs to be changed.
        this.setStepOnPath = function(path_name){
            if(path_name === "Home"){
                if(currentStep > 0){
                    stepback()
                }
                if(currentStep === 0){
                    player_went_home()
                }
            }else{
                //Check if we need to switch to a different path
                if(currentStep === 0){
                    switchpath(path_name)
                }

                if(path_name === currentPath){
                    if(currentStep <= 99){
                        continuepath()
                    }else{
                        map_end_of_path_reached(path_name)
                    }
                }else{
                    stepback()
                }
            }

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

        function map_end_of_path_reached(region_string){
            MapMovementCont.endOfPathReached(region_string)

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

    //Call when a step has been made
    this.stepSelected = function(path_name){
        Player.setStepOnPath(path_name)
    }

    //This is called by the PlayerIconController to signify that the end of a path has been reached
    this.endOfPathReached = function(path_name){
        if(! flag_hold_all_movement){
            flag_hold_all_movement = true
            LocCont.player_moved_to_region(path_name)
            setTimeout(function(){flag_hold_all_movement=false}, 100)
        }
    }

    ////////////////////////
    function create_location_markers(){
        LocationMarkerControllers = {}
        for(let i=0; i<Param.Regions_Visited.length; i++){
            let name = Param.Regions_Visited[i]
            if(name !== "Neutral"){
                LocationMarkerControllers[name] = new LocationMarker(name, that)
            }
        }
        LocationMarkerControllers["Home"] = new LocationMarker("Home", that)
    }

    // Call to reset the map controller. Takes the available locations from Param.
    this.initalize_map = function(){
        create_location_markers();
        Player = new PlayerIconController(this)
        Home_button.style.display = "none"
    }
    this.reset_map_movement = function(){
        Player.reset_player_icon()
    }
    this.disable_map_movement = function(){
        toggleLocationMarker(false, Param.Regions_Visited)
        toggleLocationMarker(false, "Home")
        Player.hidePlayerIcon()
        Home_button.style.display = "none"
    }
    this.enable_map_movement = function(){
        toggleLocationMarker(true, Param.Regions_Visited)
        toggleLocationMarker(true, "Home")
        Player.showPlayerIcon()
        Home_button.style.display = "inherit"
    }
    function player_went_home(){
        if(! flag_hold_all_movement){
            LocCont.instructions_requested()
            flag_hold_all_movement = true
            setTimeout(function(){flag_hold_all_movement = false}, 10)
        }

    }

    //Setting an event handler for the home button
    Home_button.onclick = player_went_home
}

//Subcontroller just for the HUD
HUDcontroller = function(){
    let SVG_references = {
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
        quiz: document.getElementById("HUD_quiz"),
        locator: document.getElementById("HUD_locator")
    }

    //Stores the order in which the quiz boxes should be shown
    let QuizBoxesUsed = {
        1: [3],
        2: [3,4],
        3: [2,3,4],
        4: [2,3,4,5],
        5: [1,2,3,4,5],
        6: [1,2,3,4,5,6]
    }

    //During the exploration phase, call to update the counter. Assumes that Fennimal_found_number and location_visitation_counter are accurate.
    this.update_HUD_exploration = function(number_of_locations_visited, total_number_of_locations, number_of_Fennimals_Found, total_number_of_Fennimals){
        SVG_references.exploration_location_counter.childNodes[0].innerHTML = number_of_locations_visited + " / " + total_number_of_locations
        SVG_references.exploration_Fennimal_counter.childNodes[0].innerHTML = number_of_Fennimals_Found + " / " + total_number_of_Fennimals

        //Flash the HUD for a second
        let ExplorationHudElements = document.getElementsByClassName("HUD_exploration_element")
        for(let i =0;i<ExplorationHudElements.length; i++){
            ExplorationHudElements[i].classList.add("HUD_flash")
        }

        setTimeout(function(){
            for(let i =0;i<ExplorationHudElements.length; i++){
                ExplorationHudElements[i].classList.remove("HUD_flash")
            }
        },1500)

    }

    //Call to show which item is in the bagback during the delivery phase
    this.update_HUD_delivery = function(item_name, color){
        SVG_references["delivery_item_" + item_name].style.display = "inherit"
        SVG_references["delivery_item_" + item_name].getElementsByClassName("HUD_icon_box")[0].style.fill = color
        //SVGObjects.HUD.delivery_item_text.childNodes[0].style.fill = color
        //SVGObjects.HUD.delivery_item_text.childNodes[1].style.fill = color
    }

    this.update_HUD_quiz = function(results_array){
        //Find which boxes we need to use
        let boxes_used = QuizBoxesUsed[results_array.length]
        for(let i=0;i<results_array.length;i++){
            let boxnum = boxes_used[i]
            document.getElementById("quiz_results_" + boxnum + "_box").style.display = "inherit" //quiz_results_1_box

            if(results_array[i] !== "NA"){
                if(results_array[i] === "incorrect"){
                    document.getElementById("quiz_results_" + boxnum + "_cross").style.display = "inherit"
                }else{
                    document.getElementById("quiz_results_" + boxnum + "_check").style.display = "inherit"
                }
            }
        }
    }

    this.update_HUD_locator = function(location_name, box_color, text_color){

        if(location_name === false){
            SVG_references.locator.style.display = "none"
        }else{
            SVG_references.locator.style.display = "inherit"

            let Text = document.getElementById("HUD_locator_text")
            let Box = document.getElementById("HUD_locator_box")

            //Setting colors
            Text.style.fill = text_color
            Box.style.fill = box_color

            Text.style.opacity = 0

            let minwidth = 15
            Text.childNodes[0].innerHTML = location_name
            Text.style.transition = ""
            Text.style.opacity = 0

            Box.style.transition = "all 200ms ease-in-out"

            //First we are reducing the side of the box to the minimum
            setTimeout(function(){
                Box.setAttribute("width", minwidth)
                Text.style.transition = "all 300ms ease-in-out"
            },5)

            //Then we expand the box
            setTimeout(function(){
                Box.setAttribute("width", minwidth + Text.getBBox().width + 15)
            },205)

            //Then we show the text
            setTimeout(function(){
                Text.style.opacity = 1
            }, 405)

            //Later on, reset the transitions
            setTimeout(function(){
                Text.style.transition = ""
                Box.style.transition = ""
            }, 700)
        }

    }

    //Changes the state of the HUD. Call with false (no HUD), exploration or delivery
    this.changeHUD = function(string){

        //Hide all HUD elements
        let AllHUDElem = Object.getOwnPropertyNames(SVG_references)
        for(let i = 0; i<AllHUDElem.length ; i++){
            SVG_references[AllHUDElem[i]].style.display = "none"
        }
        SVG_references.Layer.style.display = "inherit"

        switch(string){
            case("exploration"):
                SVG_references.exploration_Fennimal_icon.style.display = "inherit"
                SVG_references.exploration_Fennimal_counter.style.display = "inherit"
                SVG_references.exploration_location_icon.style.display = "inherit"
                SVG_references.exploration_location_counter.style.display = "inherit"
                break;
            case("delivery"):
                SVG_references.delivery_item_text.style.display = "inherit"
                SVG_references.delivery_item_box.style.display = "inherit"
                break;
            case("quiz"):
                SVG_references.quiz.style.display = "inherit"
                for(let i = 1; i<7;i++){
                    document.getElementById("quiz_results_" + i + "_box").style.display = "none"
                    document.getElementById("quiz_results_" + i + "_cross").style.display = "none"
                    document.getElementById("quiz_results_" + i + "_check").style.display = "none"
                }


        }

    }

    //On construction, hide the HUD
    this.changeHUD(false)

}

//Inform the subject that an objective has been achieved, including the animated stars
ObjectiveAchievedController = function(text_top, text_bottom, show_mask, show_stars){
    let SVG_references = {
        Overlays: document.getElementById("Overlays"),
        Layer: document.getElementById("Objective_Achieved_Layer"),
        Text_Top: document.getElementById("objective_achieved_text_top"),
        Text_Bottom: document.getElementById("objective_achieved_text_bottom"),
    }
    //Storing references to the star and the layer
    let StarObj = document.getElementById("objective_achieved_star")
    StarObj.style.display = "none"

    if(show_mask === false){
        document.getElementById("objective_achieved_mask").style.display = "none"
    }else{
        document.getElementById("objective_achieved_mask").style.display = "inherit"
        if(show_mask!== true){
            document.getElementById("objective_achieved_mask").style.opacity = show_mask
        }
    }

    let ObjectiveAchievedLayer = SVG_references.Layer
    SVG_references.Layer.style.display = "inherit"
    SVG_references.Overlays.style.display = "inherit"

    //Setting the text
    let TopTextObj = SVG_references.Text_Top.childNodes[0]
    TopTextObj.innerHTML = text_top
    TopTextObj.style.display = "none"
    TopTextObj.style.opacity = 0

    let BottomTextObj = SVG_references.Text_Bottom.childNodes[0]
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
        AudioController.play_sound_effect("success")
    },20)

    setTimeout(function(){
        TopTextObj.style.opacity = 0
        BottomTextObj.style.opacity = 0
    },2500)

    //Creates a svg star at the x and y position that moves to A RANDOM DIRECTION, while fading out. Set animations with css.
    FeedbackStar = function(start_x,start_y, color){
        //Copy the heart svg element
        let NewStar = StarObj.cloneNode(true)
        ObjectiveAchievedLayer.appendChild(NewStar)
        NewStar.style.display="none"
        MoveElemToCoords(NewStar, start_x,start_y)
        NewStar.style.opacity = 0.5
        NewStar.style.fill = color
        NewStar.style.display = "inherit"
        NewStar.style.transition = "all 2s ease-out"

        setTimeout(function(){
            NewStar.style.opacity = 0

        },10)

        //After a brief waiting period, move upwards
        setTimeout(function(){
            //Select a random movement around the starting xposition to translate to
            let max_deviation = 120
            let random_x = randomIntFromInterval(start_x- max_deviation, start_x + max_deviation)
            let random_y = randomIntFromInterval(280, 290)
            MoveElemToCoords(NewStar, random_x,random_y)

            //NewStar.style.fill = "goldenrod"
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
                let random_x = randomIntFromInterval(20,480)
                let random_y = randomIntFromInterval(-30,-20) //randomIntFromInterval(20,263)

                //Generate a new heart
                let NewStar1 = new FeedbackStar(random_x,random_y, "gold")
                let NewStar2 = new FeedbackStar(random_x,random_y, "red")
                let NewStar3 = new FeedbackStar(random_x,random_y, "white")
                let NewStar4 = new FeedbackStar(random_x,random_y, "blue")

            },25)
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

    setTimeout(function(){stop_generating_hearts()}, 1500)
    setTimeout(function(){hide()}, 3000)

}

//Controls movement across the SVG (both the map and through the regions)
LocationController = function(ExpCont){
    let that = this
    let MC, HUDC, FenC

    function initialize(){
        SVGReferences.Layers.World.style.display = "inherit"
        SVGReferences.Layers.Regions.style.display = "none"
        create_map()
        MC = new Map_movement_controller(that)
        HUDC = new HUDcontroller()
        MC.initalize_map()
        show_static_map_background()
    }

    //Storing SVG references here
    let SVGReferences = {
        Layers: {
            World: document.getElementById("World"), // World contains both the locations and regions.
            Map: document.getElementById("Map_Layer"),
            Regions: document.getElementById("Regions_Layer"),
            Interface_elements: document.getElementById("interface_elements")
        },
        Map: {
            Map: document.getElementById("Map"),
            Masks: document.getElementById("masks_layer"),
        },
        Regions:{
            Sky_layer:  document.getElementById("Sky_Layer"),
        },
        Buttons:{
            Home_button: document.getElementById("home_button"),
            End_Of_Trial_Button: document.getElementById("return_to_home_button"),
        }
    }

    this.instructions_requested = function(){
        MC.disable_map_movement()

        if(typeof LocationsVisitedArray !== 'undefined'){
            LocationsVisitedArray.push("home")
        }

        ExpCont.instructions_page_requested()
    }

    //Creates the map (making sure all the correct regions are visible)
    function create_map(){
        for(let i =0;i<Param.Regions_Visited.length;i++){
            document.getElementById("map_region_" + Param.Regions_Visited[i]).style.display = "inherit"
        }
    }

    this.reset_and_enable_map_movement = function(){
        MC.reset_map_movement()
        MC.enable_map_movement()
        go_to_map()
    }

    //Shows the map on screen (setting regions, Fennimals and instructions to invisible)
    function go_to_map(){
        resetAllZoomLevels()
        leave_location()
        AudioController.stop_all_region_sounds()
        Prompt.hide()

        //Show the map layer, hide the regions, fennimals and instructions layers
        SVGReferences.Layers.Map.style.display = "inherit"
        SVGReferences.Layers.Regions.style.display = "none"
        SVGReferences.Layers.Interface_elements.style.display = "none"

        //Make sure the map elements and the masks are set to visible (but masks should have 0 opacity)
        SVGReferences.Map.Map.style.display = "inherit"

        let AllLocationArrows = document.getElementsByClassName("location_arrow")
        for(let i =0;i<AllLocationArrows.length;i++){
            AllLocationArrows[i].style.display = "none"
        }

        //No location arrows may be displayed on the map
        available_to_show_location_arrows_flag = false

        //No locator text shown on the map
        HUDC.update_HUD_locator(false)

        //Re-enable map movements
        MC.enable_map_movement()


    }

    //This is the default state of the map. After an interaction is completed or instructions requested, move back to this state.
    function show_static_map_background(){
        MC.disable_map_movement()
        SVGReferences.Layers.Map.style.display = "inherit"

    }

    // IN-REGION MOVEMENT
    let available_to_show_location_arrows_flag = false
    let currently_moving_to_location_flag = false
    let currentLocation, CurrentLocationData, CurrentLocationSVGObj, location_visitation_counter, LocationsVisitedArray

    //Depending on the experiment phase, we may need additional information
    this.reset_LocationVisitedArray = function(){
        LocationsVisitedArray = []
    }

    //Call when a region is entered on the map
    this.player_moved_to_region = function(region){
        AudioController.play_region_sound(region)
        MC.disable_map_movement()
        SVGReferences.Layers.Interface_elements.style.display = "inherit"
        //Find out all available locations in this region. If there is only one, jump to this location.
        let Visitable_Locations = get_locations_visitable_in_region(region)

        //If there are multiple, then go to the intersection. Else, jump straight to the only available location
        if(Visitable_Locations.length > 1){
            go_to_location("intersection_"+ region,false)
        }

        if(Visitable_Locations.length === 1){
            go_to_location("location_" + Visitable_Locations[0],false)
        }
    }

    function get_locations_visitable_in_region(region){
        let locations_arr = Param.Available_Location_Names.filter(v1 => Param.RegionData[region].Locations.includes(v1))
        return([... new Set(locations_arr)])
    }

    //Go to a specified location. Call with a string denoting the name of the location, and a zoom depth.
    function go_to_location(name, arriving_from_terminal_location){
        //While we are in transit, block the showing of location arrows
        available_to_show_location_arrows_flag = false
        currently_moving_to_location_flag = true

        //Hide all locations
        hide_all_location_backgrounds()
        leave_location()

        //Set the currentLocation and Get the information for the current location
        currentLocation = name
        CurrentLocationData = Param.LocationTransitionData[name]
        CurrentLocationSVGObj = document.getElementById(name)

        //Show the correct sky
        hide_sky_sublayers()
        SVGReferences.Regions.Sky_layer.style.display = "inherit"

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

        //If zoomable AND we did not come from a terminal location, then travel the entire location first.
        // If zoomable AND we arrived here from a terminal location, then set the zoom all the way to the end.
        hide_all_location_arrows()
        if(CurrentLocationData.zoomable){
            //Set the locator to display the REGION name
            HUDC.update_HUD_locator("The " + CurrentLocationData.region, Param.RegionData[CurrentLocationData.region].lighter_color, Param.RegionData[CurrentLocationData.region].darker_color)

            //Set a prompt

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
                    Prompt.change_colors_based_on_region(CurrentLocationData.region)
                    Prompt.show_message("Click on the arrows to go to a location, or the map to return")
                },100)


            }else{
                animate_movement_through_location(CurrentLocationSVGObj, CurrentLocationData)
            }
        }else{
            //Update the locator text
            HUDC.update_HUD_locator(Param.SubjectFacingLocationNames[CurrentLocationData.location_name], Param.RegionData[CurrentLocationData.region].lighter_color, Param.RegionData[CurrentLocationData.region].darker_color)

            //Set any relevant next-region arrows on the screen
            available_to_show_location_arrows_flag = true
            currently_moving_to_location_flag = false

            //If the location is not zoomable, then it is a terminal location. Enter this location.
            enter_location()
        }

    }

    function enter_location(){
        let delay_time = 200
        location_visitation_counter++
        Prompt.show_message("...")

        if(Worldstate.check_if_location_visited(CurrentLocationData.location_name) === false){
            //If we are in the exploration phase, check if we have been here before. If not, then give some positive feedback and update the HUD
            if(current_phase_of_the_experiment === "exploration"){
                exploration_phase_number_of_locations_found ++
                HUDC.update_HUD_exploration(exploration_phase_number_of_locations_found,total_number_of_locations,exploration_phase_number_of_Fennimals_found,exploration_phase_total_number_of_Fennimals)


                //Give a little feedback
                delay_time = 3000
                let x = new ObjectiveAchievedController("NEW LOCATION FOUND!", Param.SubjectFacingLocationNames[CurrentLocationData.location_name], .15, true)


            }
        }

        //Change the world state
        if(Worldstate.check_if_location_visited(CurrentLocationData.location_name) === false){
            Worldstate.location_visited(CurrentLocationData.location_name, location_visitation_counter)
        }

        //Keep track of this location being visited
        if(typeof LocationsVisitedArray !== 'undefined'){
            LocationsVisitedArray.push(JSON.parse(JSON.stringify(CurrentLocationData.location_name)))
        }

        setTimeout(function(){
            check_if_exploration_phase_complete()
            check_for_Fennimal_on_location()}, delay_time)
    }

    //Call when leaving a terminal location. Ends any Fennimal interaction on screen
    function leave_location(){
        AudioController.stop_all_sound_effects()
        if(typeof FenC !== "undefined"){
            if(FenC !== false){
                FenC.location_left()
                FenC = false
            }
        }
    }

    //Call when a terminal location has been reached. We now need to check if there are any Fennimals here. If there are, start an interaction with the Fennimal accordingly
    function check_for_Fennimal_on_location(){
        //Check if there is a Fennimal present on this location
        if(Worldstate.check_if_Fennimal_in_location(CurrentLocationData.location_name) !== false){
            //Fennimal found!
            let FenObj = Worldstate.check_if_Fennimal_in_location(CurrentLocationData.location_name)

            //If we're keeping track of the locations visited up until this point, then add them to the FennimalObject here
            if(typeof LocationsVisitedArray !== 'undefined'){
                FenObj.sequence_locations_visited = JSON.parse(JSON.stringify(LocationsVisitedArray))
            }

            //Idem for the items carried in the backpack during the trial
            if(record_of_items_carried !== false){
                FenObj.record_of_items_carried = JSON.parse(JSON.stringify(record_of_items_carried))
            }

            if(FenObj.flashlight_search && ! FenObj.hasOwnProperty("outcome_observed")){
                let temp = new Flashlight_Controller(FenObj, that)
            }else{
                show_Fennimal(FenObj)
            }

        }else{
            //Empty location, show the return arrows.

            Prompt.change_colors_based_on_location(CurrentLocationData.location_name)

            setTimeout(function(){
                Prompt.show_message("There is nothing here at the moment...")
                show_terminal_return_arrow()
            }, 500)
        }
    }
    this.flashlight_finished = function(FenObj){
        show_Fennimal(FenObj)
    }
    function show_Fennimal(FenObj){
        if(current_phase_of_the_experiment === "delivery"){
            if(items_in_backpack_array === false){
                FenC = new FennimalController(FenObj, that, [])
            }else{
                FenC = new FennimalController(FenObj, that, items_in_backpack_array)
            }
        }else{
            if(current_phase_of_the_experiment === "test"){
                FenObj.test_phase_trial = true
            }
            FenC = new FennimalController(FenObj, that, false)
        }

    }
    //Call to show the return arrows when in a terminal location
    function show_terminal_return_arrow(){
        show_next_location_arrows(CurrentLocationData.AdjacentRegions)
    }

    //Call when the partipant must be allowed to leave the location
    function allow_subject_to_leave(){
        show_terminal_return_arrow()
    }

    //Creates the Return to Home button, which ends the trial when pressed
    function show_return_to_home_button(FennimalObject){
        SVGReferences.Buttons.End_Of_Trial_Button.style.display = "inherit"
        SVGReferences.Buttons.End_Of_Trial_Button.getElementsByTagName("rect")[0].classList.add("location_arrow")
        SVGReferences.Buttons.End_Of_Trial_Button.getElementsByTagName("rect")[0].style.display = "inherit"
        SVGReferences.Buttons.End_Of_Trial_Button.onclick = function(){
            end_trial_button_pressed(FennimalObject)

        }
    }

    function end_trial_button_pressed(FennimalObj){
        SVGReferences.Buttons.End_Of_Trial_Button.style.display = "none"
        go_to_map()
        EC.Fennimal_trial_completed(FennimalObj)

    }

    this.Fennimal_interaction_completed = function(FennimalObj){
        let delay_time = 0

        //Check if this is the first encounter with the Fennimal AND we are in the exploration stage. If so, show some extra feedback
        if(Worldstate.check_if_location_visited(FennimalObj.location) !== "completed" && current_phase_of_the_experiment === "exploration"){
            exploration_phase_number_of_Fennimals_found++
            HUDC.update_HUD_exploration(exploration_phase_number_of_locations_found,total_number_of_locations,exploration_phase_number_of_Fennimals_found,exploration_phase_total_number_of_Fennimals)

            //Give a little feedback
            delay_time = 3000
            let x = new ObjectiveAchievedController("NEW FENNIMAL FOUND", FennimalObj.name, .15, true)
        }

        //If this is a quiz trial, check if we have been to this Fennimal before. If not, count it for the quiz
        if(Worldstate.check_if_location_visited(FennimalObj.location) !== "completed" && current_phase_of_the_experiment === "quiz" && FennimalObj.hasOwnProperty("outcome_observed")){
            register_new_quiz_result(FennimalObj.outcome_observed)

            if(quiz_Fennimals_completed === quiz_total_Fennimals){
                //Give a little feedback
                delay_time = 3000

                let subtext = "Perfect!"
                if(quiz_errors_made > 0){
                    if(quiz_errors_made === 1){
                        subtext = "one mistake made"
                    }else{
                        subtext = quiz_errors_made + " mistakes made"
                    }
                }
                let x = new ObjectiveAchievedController("QUIZ COMPLETED",subtext, .15, quiz_errors_made === 0)
            }
        }

        // Allowing some time to wrap up feedback
        setTimeout(function(){

            //If the Fennimal has a selected item, then the interaction was completed succesfully.
            if(FennimalObj.hasOwnProperty("outcome_observed")){

                //Update the Fennimal in the world state
                Worldstate.update_Fennimal_in_location_after_interaction_completed(FennimalObj)

                if(current_phase_of_the_experiment === "exploration"){
                    check_if_exploration_phase_complete()
                }

                if(current_phase_of_the_experiment === "quiz" ){
                    check_if_quiz_complete()
                }


                if(FennimalObj.end_of_interaction_event === "continue"){
                    allow_subject_to_leave()
                }
                if(FennimalObj.end_of_interaction_event === "end_trial"){

                    //If we just came from a confidence slider, then go straight to the next trial
                    let jump_to_next = false
                    if(typeof FennimalObj.test_phase_trial !== "undefined"){
                        if(typeof FennimalObj.TestPhaseRules !== "undefined"){
                            if(FennimalObj.TestPhaseRules.ask_confidence){
                                jump_to_next = true
                            }
                        }
                    }

                    if(jump_to_next){
                        end_trial_button_pressed(FennimalObj)
                    }else{
                        //Show a button allowing the participant to end the trial
                        show_return_to_home_button(FennimalObj)

                    }


                }
            }else{
                //If not, then the participant could not complete the interaction.
                allow_subject_to_leave()
            }


        },delay_time)

    }

    // REGION LOCATION FUNCTIONS //
    ///////////////////////////////

    //Hides all location arrows. This also removes any click eventListeners associated to them, as well as all the location display names
    function hide_all_location_arrows(){
        let AllArrows = document.getElementsByClassName("location_arrow")
        for(let i=0; i<AllArrows.length; i++){
            AllArrows[i].style.display = "none"

            //Replace the arrow by a clone, removing all event listerers in the process

            let NewElem = AllArrows[i].cloneNode(true);
            AllArrows[i].parentNode.replaceChild(NewElem, AllArrows[i]);
        }

        hide_all_location_display_names()
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
            let ArrowObj

            //Special case if the target is an intersection: now we may need to change the position of the return array if there is only one location in this region.
            if(target_location.includes("intersection")){
                //Check if this intersection links to more than one visitable location
                let region = target_location.split("_")[1]
                if(get_locations_visitable_in_region(region).length === 1){
                    ArrowObj = document.getElementById("arrow_back")
                }else{
                    ArrowObj = document.getElementById(arrow_name)
                }


            }else{
                ArrowObj = document.getElementById(arrow_name)
            }
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
                        //Here we need to know whether we are leaving a terminal location (that is, a location with Fennimals) or not.

                        //If we try to go to an intersection AND we come from a terminal location, then we need to check how many terminal locations can be reached from the intersection.
                        // If this value is exactly one, then we should not go to the intersection but instead skip straight to the map.
                        if(target_location.includes("intersection")){
                            //Find out which intersection we are trying to go to
                            let region = target_location.split("_")[1]

                            //Find out how many locations can be reached in this region
                            let location_arr = get_locations_visitable_in_region(region)

                            if(location_arr.length <= 1){
                                //We do not need to go to the intersection, as there is only one location in this region. Go to the map instead
                                go_to_map()
                            }else{
                                //Go to the intersection
                                go_to_location(target_location, Param.LocationTransitionData[currentLocation].may_contain_Fennimals )
                            }
                        }else{
                            //We are in a target location.
                            go_to_location(target_location, Param.LocationTransitionData[currentLocation].may_contain_Fennimals )
                        }

                    }
                }
            })
        }
    }

    //Shows the text above a location arrow
    function show_location_display_name(location){
        document.getElementById("location_display_name_" + location).style.display = "inherit"
    }

    //Hides all the location text
    function hide_all_location_display_names(){
        let All_Names = document.getElementsByClassName("location_display_name")
        for(let i =0;i<All_Names.length;i++){
            All_Names[i].style.display = "none"
        }
    }

    //Call when leaving a location with a possible Fennimal TOOD: check if needed?
    function leaving_location_with_possible_Fennimal(){
        //ExpCont.location_left()
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
                //If the arrow points at a location, only show it if the target location is in Param.Available_Location_Names
                if(Arrows_To_Be_Shown[i].target_region.includes("location")){
                    let location = Arrows_To_Be_Shown[i].target_region.split("_")[1]
                    if(Param.Available_Location_Names.includes(location)){
                        //The target location should be shown. Also show the text above it
                        create_next_location_arrow(Arrows_To_Be_Shown[i].arrow_id, Arrows_To_Be_Shown[i].target_region)
                        show_location_display_name(location)
                    }
                }else{
                    //Non-location arrows should always be shown
                    create_next_location_arrow(Arrows_To_Be_Shown[i].arrow_id, Arrows_To_Be_Shown[i].target_region)
                }


            }
        }
    }

    //Sets the interface colors based on the region
    function setInterfaceColors(name){
        //Given a location, get the region
        let color_light = Param.RegionData[Param.LocationTransitionData[name].region].lighter_color
        let color_dark = Param.RegionData[Param.LocationTransitionData[name].region].darker_color
        document.getElementById("item_bar_circular").style.fill = color_light + "AA"
        document.getElementById("item_bar_circular").style.stroke = color_dark + "AA"

        Prompt.change_colors_based_on_region(Param.LocationTransitionData[name].region)

    }

    //Animates the transfer across a location, ending at the last zoom level (11). Then shows all arrows in the provided array (should contain DOM element references)
    function animate_movement_through_location(LocationSVGObject, CurrentLocationData){
        //Resetting location if needed
        LocationSVGObject.style.transition = ""
        LocationSVGObject.style.transform = "scale(1,1)"

        setTimeout(function(){
            LocationSVGObject.style.transition = "all " + 1000 + "ms ease-in-out"
            setTimeout(function(){
                LocationSVGObject.style.transform = "scale(10,10)"
            }, 250)
        }, 10)

        setTimeout(function(){
            available_to_show_location_arrows_flag = true
            currently_moving_to_location_flag = false
            show_next_location_arrows(CurrentLocationData.AdjacentRegions)
            Prompt.change_colors_based_on_region(CurrentLocationData.region)
            Prompt.show_message("Click on the arrows to go to a location, or the map to return")
        }, 400 + 1000)
    }

    //Call after having jumped to home to reset all the zoom levels
    function resetAllZoomLevels(){
        for(let key in Param.LocationTransitionData){
            if(typeof Param.LocationTransitionData[key] === "object"){
                if("zoomable" in Param.LocationTransitionData[key]){
                    if(Param.LocationTransitionData[key].zoomable){
                        let SVGObj = document.getElementById(key)
                        if(SVGObj != null){
                            SVGObj.style.transform = "scale(1,1)"
                        }
                    }
                }
            }
        }
    }

    //DELIVERY PHASE FUNCTIONS
    ///////////////////////////
    let items_in_backpack_array = false, record_of_items_carried = false
    this.reset_record_of_items_carried = function(){
        record_of_items_carried = false
    }

    this.change_item_in_backpack = function(new_item, color){
        if(new_item === false){
            items_in_backpack_array = false
            HUDC.changeHUD(false)
        }else{
            items_in_backpack_array = [new_item]
            HUDC.changeHUD("delivery")
            HUDC.update_HUD_delivery(new_item,color)
        }

        if(new_item!==false){
            if(record_of_items_carried === false){
                record_of_items_carried = [new_item]
            }else{
                record_of_items_carried.push(new_item)
            }
        }
    }
    this.remove_item_from_backpack = function(item_name){
        that.change_item_in_backpack(false, false)
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

    //PHASE-SPECIFIC FUNCTIONS
    function check_if_exploration_phase_complete(){
        if(current_phase_of_the_experiment === "exploration" && exploration_phase_number_of_Fennimals_found === exploration_phase_total_number_of_Fennimals && exploration_phase_number_of_locations_found === total_number_of_locations){
            // Go to the instructions page
            go_to_map()
            Prompt.hide()
            that.instructions_requested()
            ExpCont.exploration_phase_all_targets_found()

        }else{

        }

    }

    function register_new_quiz_result(outcome_observed){
        //Log outcome
        quiz_results_array[quiz_Fennimals_completed] = outcome_observed
        HUDC.update_HUD_quiz(quiz_results_array)

        //Update the number of errors
        quiz_Fennimals_completed++
        if(outcome_observed === "incorrect"){
            quiz_errors_made++
        }

        //check_if_quiz_complete()


    }

    function check_if_quiz_complete(){
        if(quiz_Fennimals_completed === quiz_total_Fennimals){
            go_to_map()
            HUDC.changeHUD(false)
            ExpCont.all_quiz_Fennimals_found(quiz_errors_made)

        }

    }
    let current_phase_of_the_experiment
    let exploration_phase_number_of_locations_found,total_number_of_locations, exploration_phase_number_of_Fennimals_found, exploration_phase_total_number_of_Fennimals,
        quiz_total_Fennimals, quiz_Fennimals_completed, quiz_errors_made, quiz_results_array

    this.change_experiment_phase = function(new_phase){
        HUDC.changeHUD(false)
        current_phase_of_the_experiment = new_phase
        location_visitation_counter = 0
        if(new_phase === "exploration"){
            exploration_phase_number_of_Fennimals_found = 0
            exploration_phase_total_number_of_Fennimals = ExpCont.get_total_number_of_Fennimals_to_be_found()
            exploration_phase_number_of_locations_found = 0
            total_number_of_locations = Worldstate.get_array_of_all_locations().length
            HUDC.changeHUD("exploration")
            HUDC.update_HUD_exploration(exploration_phase_number_of_locations_found,total_number_of_locations,exploration_phase_number_of_Fennimals_found,exploration_phase_total_number_of_Fennimals)
        }

        if(new_phase === "quiz"){
            quiz_total_Fennimals = ExpCont.get_total_number_of_Fennimals_to_be_found()
            quiz_Fennimals_completed = 0
            quiz_errors_made = 0
            quiz_results_array = []
            for(let i = 0; i<quiz_total_Fennimals;i++){
                quiz_results_array.push("NA")
            }
            HUDC.changeHUD("quiz")
            HUDC.update_HUD_quiz(quiz_results_array)
        }
    }







    initialize()



}
