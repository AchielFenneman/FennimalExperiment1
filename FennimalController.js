GENERAL_FENNIMAL_INTERACTION_SETTINGS = function(){
    this.sequence_order = {
        "passive_observation": [ "fade_and_Fennimal_appear_center"],
        "polaroid_photo_passive": [ "Fennimal_appear_variable", "take_photo_passive"],
        "polaroid_photo_active": ["Fennimal_appear_variable", "take_photo_active"],
    }

    this.sequence_order_if_already_visited = {
        "polaroid_photo": [ "photo_already_collected"],
    }

    //DENOTES THE CENTER OF THE FENNIMAL
    this.FennimalVariablePositionLimits = { xmin: 250, xmax: 1700, ymin: 600, ymax:700 }
    this.FennimalVariableSizeLimits = {
        default: 1,
        size_min: 1.5,
        size_max: 2,
    }
    this.FennimalCenterPosition = {
        center_x: 0.5 * GenParam.SVG_width,
        center_y: 0.6 * GenParam.SVG_height,
        size: 2
    }

    this.OpacityMaskSettings = {
        opacity: 0.85,
        color: "white",
        relative_appearance_speed:0.5
    }

    this.step_speed = 1000

    this.photo_camera_allowed_error = 200
}

FENNIMALCONTROLLER = function(FenObj, ExpCont, interaction_type, OptionalAdditionalInformation){
    // GENERAL REFERENCES
    //////////////////////
    let Settings = new GENERAL_FENNIMAL_INTERACTION_SETTINGS()
    let ParentLayer = document.getElementById("Fennimals_Layer")
    let Clean_Up_Steps = []
    let OpacityMask, FennimalSVGObj, FennimalTranslationGroup, FennimalScaleGroup,
        CameraButton, CameraMask, camera_target_type, camera_task_type, Camera_ViewFinder, Camera_Polaroid_Frame, Camera_PhotoCloseButton, Camera_Photo_Name_Foreign, Camera_Photo_Name_Input,
        camera_active_name_attempts_left, camera_active_name_previous_attempt
    let Photo_Settings = {
        backgroundColor: GenParam.RegionData[FenObj.region].darker_color,
        offset_from_center_y: -100,
        animation_speed: 300,
        CloseButtonCoords:{
            x: 0.5* GenParam.SVG_width,
            y: 0.93 * GenParam.SVG_height,
            w: 100,
            h: 100
        },
        InputSettings:{
            normal_font_color: "dimgray",
            incorrect_font_color: "darkred"
        }
    }

    //Shorthand
    let participant_facing_location_name = GenParam.LocationDisplayNames[FenObj.location]

    //FINDING THE INTERACTION SEQUENCE
    //////////////////////////////////////

    //One interaction type is special: "already_visited". This interaction depends on the previously observed sequence
    let InteractionSequence
    if(interaction_type === "already_visited"){
        if(typeof FenObj.interaction_type !== "undefined"){
            if(FenObj.interaction_type.includes("polaroid")){
                InteractionSequence = Settings.sequence_order_if_already_visited["polaroid_photo"]
            }
        }else{
            InteractionSequence = Settings.sequence_order["passive_observation"]
        }
    }else{
        //Storing the interaction type in the Fennimal
        InteractionSequence = Settings.sequence_order[interaction_type]
        FenObj.interaction_type = interaction_type
    }

    // TOP LEVEL INTERACTIONS
    //////////////////////////

    function start_next_interaction_step(){
        if(InteractionSequence.length > 0){
            let next_step = InteractionSequence.shift()
            switch(next_step){
                case("enter_location"):
                    enter_location()
                    break
                case("fade_background"):
                    fade_background();
                    break;
                case("Fennimal_appear_variable"):
                    Fennimal_appear_variable()
                    break
                case("take_photo_passive"):
                    show_camera_button("head", "passive")
                    break
                case("take_photo_active_with_limited_attempts"):
                    show_camera_button("head", "active_with_limited_attempts")
                    break
                case("take_photo_active"):
                    show_camera_button("head", "active")
                    break
                case("fade_and_Fennimal_appear_center"):
                    fade_and_appear_Fennimal_center()
                    Interface.Prompt.show_message("This Fennimal is named " + FenObj.name)
                    break
                case("photo_already_collected"):
                    fade_and_appear_Fennimal_center()
                    Interface.Prompt.show_message("You already took a photo of " + FenObj.name)
                    break
                default:
                    console.error("Attempting to execute unknown interaction step: " + next_step + ". Skipping...")
                    start_next_interaction_step()
            }

        }else{
            //Interaction over! Inform the Experiment controller
            end_interation()
        }
    }

    // SUPPORTING FUNCTIONS
    ////////////////////////

    function end_interation(){
        ExpCont.Fennimal_interaction_completed(FenObj)
    }

    //Should be called by the experiment controller to clear all the interaction elements (before closing the trial)
    this.clear = function(){
        cleanup()
    }

    //Clean-up at the end of the interaction execute before leaving)
    function cleanup(){
        for(let i =0;i<Clean_Up_Steps.length;i++){
            switch(Clean_Up_Steps[i]){
                case("remove_opacity_mask"):
                    OpacityMask.remove();
                    break
                case("remove_Fennimal"):
                    FennimalSVGObj.remove()
                    break
                case("remove_camera_button"):
                    CameraButton.remove()
                    break
            }
        }
    }

    // SEQUENCE-SPECIFIC FUNCTIONS
    ////////////////////////////////
    function enter_location(){
        setTimeout(function(){
            Interface.Prompt.show_message("You are now at the " + participant_facing_location_name + "..." )
        }, 0.15 * Settings.step_speed)

        setTimeout(function(){
            start_next_interaction_step()
        }, 0.5 * Settings.step_speed)
    }

    function fade_background(){
        show_opacity_mask()

        setTimeout(function(){
            start_next_interaction_step()
        }, Settings.step_speed)
    }

    function Fennimal_appear_variable(){
        //Drawing random X and Y center coordinates from the allowed range
        let center_x = randomIntFromInterval(Settings.FennimalVariablePositionLimits.xmin, Settings.FennimalVariablePositionLimits.xmax)
        let center_y = randomIntFromInterval(Settings.FennimalVariablePositionLimits.ymin, Settings.FennimalVariablePositionLimits.ymax)

        //Drawing a Fennimal on the screen.
        let scale_factor_based_on_y = (center_y - Settings.FennimalVariablePositionLimits.ymax) /(Settings.FennimalVariablePositionLimits.ymin - Settings.FennimalVariablePositionLimits.ymax)
        let size = Settings.FennimalVariableSizeLimits.size_min + scale_factor_based_on_y * (Settings.FennimalVariableSizeLimits.size_max - Settings.FennimalVariableSizeLimits.size_min)

        draw_Fennimal_on_screen(center_x,center_y,size)
        Interface.Prompt.show_message("There is a Fennimal present here!")
        AudioCont.play_sound_effect("Fennimal_appears")

        setTimeout(function(){
            start_next_interaction_step()
        }, 1.5 * Settings.step_speed)


    }
    function fade_and_appear_Fennimal_center(){
        show_opacity_mask()
        draw_Fennimal_on_screen(Settings.FennimalCenterPosition.center_x, Settings.FennimalCenterPosition.center_y, Settings.FennimalCenterPosition.size)

        setTimeout(function(){
            start_next_interaction_step()
        }, 0.5 * Settings.step_speed)


    }

    //Creates the opacity mask (set to invisible unless show opacity mask is called)
    function create_opacity_mask(){
        OpacityMask = create_SVG_rect(0,0,GenParam.SVG_width, GenParam.SVG_height, undefined, undefined)
        ParentLayer.appendChild(OpacityMask)
        OpacityMask.style.fill = Settings.OpacityMaskSettings.color
        OpacityMask.style.opacity = 0
        OpacityMask.style.transition = "all " + (Settings.OpacityMaskSettings.relative_appearance_speed * Settings.step_speed) + "ms ease-in-out"

        Clean_Up_Steps.push("remove_opacity_mask")
    }
    function show_opacity_mask(){
        setTimeout(function(){
            OpacityMask.style.opacity = Settings.OpacityMaskSettings.opacity
        }, 5)

        setTimeout(function(){
            start_next_interaction_step()
        }, 1.5 * Settings.step_speed)

    }

    function draw_Fennimal_on_screen(center_x,center_y,size){

        //Create
        FennimalSVGObj = create_Fennimal_SVG_object(FenObj,GenParam.Fennimal_head_size, false)
        ParentLayer.appendChild(FennimalSVGObj)
        FennimalTranslationGroup= FennimalSVGObj
        FennimalScaleGroup= FennimalSVGObj.getElementsByClassName("Fennimal_scale_group")[0]

        //Translate
        move_Fennimal_to_new_location(center_x,center_y)

        //Scale
        FennimalScaleGroup.style.transform = "scale(" + size + ")"

        //Add to cleanup tasks
        Clean_Up_Steps.push("remove_Fennimal")

        //Store position in the Fennimal object
        FenObj.pos_on_screen = {
            cx: center_x,
            cy: center_y,
            size: size
        }
    }

    //Note: these two functions do NOT modify the stored position variables for the Fennimal Object.
    function move_Fennimal_to_new_location(center_x,center_y){
        let Box = FennimalSVGObj.getBBox()
        let delta_x = center_x - (Box.x + 0.5*Box.width)
        let delta_y = center_y - (Box.y + 0.5*Box.height)
        FennimalTranslationGroup.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

    }
    function resize_Fennimal_to_fit_dimensions(max_w,max_h){
        //FenObj.pos_on_screen.size = 1
        if(typeof FennimalScaleGroup.style.transform !== "undefined"){
           // FenObj.pos_on_screen.size = parseFloat(FennimalScaleGroup.style.transform.split("(")[1].split(")")[0])
        }

        FennimalScaleGroup.style.transform = ""
        let Box = FennimalSVGObj.getBBox()
        let scale_factor_w =    max_w / Box.width
        let scale_factor_h =    max_h / Box.height
        let min_factor = Math.min(scale_factor_w,scale_factor_h)
        FennimalScaleGroup.style.transform = "scale(" + min_factor + ")"


    }

    // FUNCTIONS FOR THE PHOTO INTERACTION TYPE
    function show_camera_button(target_type, camera_action_type){
        CameraButton = create_Action_Button_SVG_Element("camera", GenParam.ActionButtonParameters_Center,false,false )
        ParentLayer.appendChild(CameraButton)
        camera_target_type = target_type
        camera_task_type = camera_action_type
        Clean_Up_Steps.push("remove_camera_button")
        CameraButton.onpointerdown = function(){enter_camera_mode(); AudioCont.play_sound_effect("camera_pickup")}
        Interface.Prompt.show_message("Click on the button to open your camera...")
    }
    function enter_camera_mode(){
        Interface.Prompt.show_message("Take a photo of the Fennimal")
        CameraButton.style.display = "none"
        Camera_ViewFinder = document.getElementById("camera_viewfinder").cloneNode(true)
        Camera_ViewFinder.removeAttribute("id")

        //Set the window mask to be transparant
        Camera_ViewFinder.getElementsByClassName("camera_viewfinder_window")[0].style.opacity = 0

        Camera_ViewFinder.style.transform = "translate(0,0)"
        ParentLayer.appendChild(Camera_ViewFinder)

        //Storing the size of the photo window
        Photo_Settings.windowsize = {
            width: Camera_ViewFinder.getElementsByClassName("camera_viewfinder_window")[0].getBBox().width,
            height: Camera_ViewFinder.getElementsByClassName("camera_viewfinder_window")[0].getBBox().height
        }

        //This has to be last
        CameraMask = create_SVG_rect(0,0,GenParam.SVG_width, GenParam.SVG_height, undefined,undefined)
        CameraMask.style.opacity = 0
        ParentLayer.appendChild(CameraMask)

        CameraMask.onpointermove = function(event){
            move_camera_viewfinder(getMousePosition(event))
        }
        CameraMask.onpointerdown = function(event){
            take_photo_at_location(getMousePosition(event))
        }

    }
    function move_camera_viewfinder(Coords){
        if(typeof Camera_ViewFinder !== "undefined"){
            //Finding the transform needed to move the viewfinder such that its center is on the cursor
            let Box = Camera_ViewFinder.getBBox()
            let current_viewfinder_center_x = Box.x + 0.5 * Box.width
            let current_viewfinder_center_y = Box.y + 0.5 * Box.height

            let delta_x = Coords.x - current_viewfinder_center_x
            let delta_y = Coords.y - current_viewfinder_center_y

            Camera_ViewFinder.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"
        }

    }
    function take_photo_at_location(Coords){
        play_camera_shutter_effect(500)
        AudioCont.play_sound_effect("photo")

        setTimeout(function(){
            check_photo_target(Coords)
        },750)
    }
    function play_camera_shutter_effect(duration){
        let CameraShutterMask = create_SVG_rect(0,0,GenParam.SVG_width, GenParam.SVG_height, undefined,undefined)
        ParentLayer.appendChild(CameraShutterMask)

        CameraShutterMask.style.opacity = 0
        CameraShutterMask.style.fill = "white"
        CameraShutterMask.style.transition = "all " + (0.45*duration) + "ms ease-in"

        setTimeout(function(){CameraShutterMask.style.opacity = 0.8},10)
        setTimeout(function(){CameraShutterMask.style.opacity = 0},0.55*duration)
        setTimeout(function(){CameraShutterMask.remove()}, duration)


    }
    function leave_camera_mode(){
        CameraMask.remove()
        CameraMask = undefined
        Camera_ViewFinder.remove()
        Camera_ViewFinder = undefined
        CameraButton.style.display = "inherit"

    }
    function check_photo_target(Coords){
        //Finding the target
        let Target
        switch(camera_target_type){
            case("head"):
                Target = FennimalSVGObj.getElementsByClassName("Fennimal_head")[0]
                break
        }

        let TargetCenterCoords = getViewBoxCenterPoint(Target)

        //Finding the distance to the target
        let dist = EUDistPoints(Coords, TargetCenterCoords)

        if(dist <= Settings.photo_camera_allowed_error){
            show_succesful_photo()
        }else{
            AudioCont.play_sound_effect("rejected")
            Interface.Prompt.show_message("Oops, that wasn't it... please try again")
            leave_camera_mode()
        }

    }
    function show_succesful_photo(){
        AudioCont.play_sound_effect("success")
        //Remove the camera mask to prevent further movement
        CameraMask.remove()
        CameraMask = undefined

        //Start the animation to center
        Interface.Prompt.hide()
        CameraButton.style.display = "none"

        //Move the viewfinder to the center, strip it of the target elements and display the background solid color
        Camera_ViewFinder.getElementsByClassName("camera_viewfinder_window")[0].style.transition = "all " + Photo_Settings.animation_speed + "ms ease-in-out"
        OpacityMask.style.fill = GenParam.RegionData[FenObj.region].lighter_color
        Camera_ViewFinder.getElementsByClassName("camera_viewfinder_target_elements")[0].style.transition = "all " + Photo_Settings.animation_speed + "ms ease-in-out"
        Camera_ViewFinder.style.transition = "all " + Photo_Settings.animation_speed + "ms ease-in-out"
        FennimalSVGObj.style.transition = "all " + Photo_Settings.animation_speed + "ms ease-in-out"
        let VFBox = Camera_ViewFinder.getBBox()
        let delta_x = (0.5*GenParam.SVG_width) - (0.5 * VFBox.width)
        let delta_y = (0.5*GenParam.SVG_height) - (0.5* VFBox.height)

        //Quick timeout to make the transitions stick
        setTimeout(function(){
            //Move the view window and set the view finder background to black
            Camera_ViewFinder.style.transform = "translate(" + delta_x + "px, " + (delta_y+Photo_Settings.offset_from_center_y) +"px)"
            Camera_ViewFinder.getElementsByClassName("camera_viewfinder_opacity_mask")[0].style.opacity = 1
            Camera_ViewFinder.getElementsByClassName("camera_viewfinder_opacity_mask")[0].style.fill = Photo_Settings.backgroundColor
            OpacityMask.style.opacity = 1
            Camera_ViewFinder.getElementsByClassName("camera_viewfinder_target_elements")[0].style.opacity = 0
            //Interface.Locator.hide()

            //Move the Fennimal to the photo frame
            move_Fennimal_to_new_location(0.5*GenParam.SVG_width,(0.5*GenParam.SVG_height)  + Photo_Settings.offset_from_center_y )
            resize_Fennimal_to_fit_dimensions(Photo_Settings.windowsize.width, Photo_Settings.windowsize.height)

            //Show the polaroid frame
            show_polaroid_frame()

        },5)

    }
    function show_polaroid_frame(){
        Camera_Polaroid_Frame = document.getElementById("polaroid_frame").cloneNode(true)
        Camera_Polaroid_Frame.removeAttribute("id")

        //Showing the frame and moving it to the right position
        ParentLayer.appendChild(Camera_Polaroid_Frame)
        Camera_Polaroid_Frame.style.transform = ""

        let CenterPoint = Camera_Polaroid_Frame.getElementsByClassName("polaroid_photo_center")[0]
        let delta_x = (0.5*GenParam.SVG_width) -  CenterPoint.getAttribute("cx")
        let delta_y = (0.5*GenParam.SVG_height + Photo_Settings.offset_from_center_y) - CenterPoint.getAttribute("cy")
        Camera_Polaroid_Frame.style.transformOrigin = CenterPoint.getAttribute("cx") + "px " + CenterPoint.getAttribute("cy") + "px"
        Camera_Polaroid_Frame.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

        //If this is the passive version of the task, setting name here
        if(camera_task_type === "passive"){
            Interface.Prompt.show_message("This Fennimal is called " + FenObj.name)
            Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].innerHTML = FenObj.name
            show_photo_exit_button()
        }else{
            //If this is the active version, then we need to create a textbox input
            Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].style.opacity = 0
            add_photo_active_name_input()
            if(camera_task_type === "active"){
                if(typeof OptionalAdditionalInformation.allowed_attempts_before_answer_given !== "undefined"){
                    if(OptionalAdditionalInformation.allowed_attempts_before_answer_given !== false){
                        camera_active_name_attempts_left = OptionalAdditionalInformation.allowed_attempts_before_answer_given
                    }else{
                        camera_active_name_attempts_left = false
                    }
                }else{
                    //Defaulting to 1
                    camera_active_name_attempts_left = 1
                }

            }
        }



    }
    function show_photo_exit_button(){
        Camera_PhotoCloseButton = create_SVG_buttonElement(Photo_Settings.CloseButtonCoords.x,Photo_Settings.CloseButtonCoords.y,Photo_Settings.CloseButtonCoords.w,Photo_Settings.CloseButtonCoords.h,"🗙", 70)
        ParentLayer.appendChild(Camera_PhotoCloseButton)
        Camera_PhotoCloseButton.onpointerdown = exit_photo

        //Below allows for an event listener to make closing the photo respond to keyboard commands
        /*Camera_PhotoCloseButton.tabIndex = "0"
        setTimeout(function(){Camera_PhotoCloseButton.focus()},10)

        Camera_PhotoCloseButton.onkeydown = function(event){
            if(event.key === "Enter" || event.key === "Escape" || event.key === ""){
                exit_photo()
            }
        }
         */
        add_keyboard_shortcuts_to_object(Camera_PhotoCloseButton, ["Escape", "Enter", " "], 750, exit_photo)


    }
    function exit_photo(){
        AudioCont.play_sound_effect("close_menu")
        //Remove the Polaroid frame and set the background mask to invisible
        Camera_Polaroid_Frame.remove()
        Camera_ViewFinder.remove()
        Camera_PhotoCloseButton.remove()
        CameraButton.remove()
        OpacityMask.style.opacity = Settings.OpacityMaskSettings.opacity
        OpacityMask.style.fill = Settings.OpacityMaskSettings.color

        //Move the Fennimal back to its original location and size
        move_Fennimal_to_new_location(FenObj.pos_on_screen.cx, FenObj.pos_on_screen.cy)
        FennimalScaleGroup.style.transform = "scale(" + FenObj.pos_on_screen.size + ")"

        setTimeout(function(){
            start_next_interaction_step()

        }, 0.15*  Settings.step_speed)


    }
    function add_photo_active_name_input(){
        Interface.Prompt.show_message("What is this Fennimal's name? (Hit enter to confirm)")

        //Getting the x and y position for the input field
        let NameXY = getViewBoxCenterPoint(Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0])
        let width = Math.round(0.95* Camera_Polaroid_Frame.getBBox().width)
        let height = 100

        //Creating the Foreign element
        Camera_Photo_Name_Foreign = create_SVG_foreignElement(NameXY.x - 0.5*width, NameXY.y - 0.5*height, width, height, undefined,undefined)
        ParentLayer.appendChild(Camera_Photo_Name_Foreign)

        Camera_Photo_Name_Input = document.createElement("input")
        Camera_Photo_Name_Input.style.width = "100%"
        Camera_Photo_Name_Input.style.height = "100%"
        Camera_Photo_Name_Input.type = "text"
        Camera_Photo_Name_Input.style.fontWeight = 600
        Camera_Photo_Name_Input.style.fontSize = "80px"
        Camera_Photo_Name_Input.style.textAlign = "Center"
        Camera_Photo_Name_Input.placeholder = "Type here"
        setTimeout(function(){Camera_Photo_Name_Input.focus()},10)
        Camera_Photo_Name_Foreign.appendChild(Camera_Photo_Name_Input)

        Camera_Photo_Name_Input.onkeydown = function(event){
            if(event.key === "Enter"){
                try_submitted_Fennimal_photo_name(Camera_Photo_Name_Input.value)
            }else{
                Camera_Photo_Name_Input.style.color = "black"
            }
        }
    }
    function try_submitted_Fennimal_photo_name(name_submitted){
        //Get (case-insensitive) distance to the actual name.
        let name_distance = LevenshteinDistance(name_submitted.toLowerCase(), FenObj.name.toLowerCase())

        if(typeof FenObj.photo_name_attempts === "undefined"){
            FenObj.photo_name_attempts = {attempts:[], num_errors:0}
        }

        if(name_distance === 0){
            FenObj.photo_name_attempts.attempts.push(name_submitted)

            Interface.Prompt.show_message("Correct!")
            AudioCont.play_sound_effect("success")
            Camera_Photo_Name_Foreign.remove()
            Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].innerHTML = FenObj.name
            Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].style.opacity = 1
            setTimeout(function(){
                show_photo_exit_button()
            }, Settings.step_speed)
        }else{
            //Check if the name has been changed from the previous attempt
            AudioCont.play_sound_effect("rejected")
            if(name_submitted !== camera_active_name_previous_attempt){
                FenObj.photo_name_attempts.attempts.push(name_submitted)
                FenObj.photo_name_attempts.num_errors++

                camera_active_name_previous_attempt = name_submitted
                let failed_all_attempts = false
                //Check if there are limited attempts - and if so, whether there are any attempts left
                if(camera_active_name_attempts_left !== false){
                    camera_active_name_attempts_left--
                    if(camera_active_name_attempts_left === 0){
                        failed_all_attempts = true
                    }
                }

                //If all attempts have been made and failed, then show the correct name and give feedback.
                if(failed_all_attempts){
                    Interface.Prompt.show_message("Nope, that wasn't quite it either. The Fennimal's actual name is " + FenObj.name)
                    FenObj.failed_all_active_name_attempts = true
                    Camera_Photo_Name_Foreign.remove()
                    Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].innerHTML = FenObj.name
                    Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].style.opacity = 1
                    Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].style.fill = "darkred"

                    setTimeout(function(){
                        show_photo_exit_button()
                    }, Settings.step_speed)

                }else{
                    //If this distance is one or two, tell the participant that they're close
                    if(name_distance <= 2){
                        Camera_Photo_Name_Input.style.color = "orange"
                        Interface.Prompt.show_message("Almost there, but not quite right yet...")
                    }else{
                        Camera_Photo_Name_Input.style.color = "red"
                        Interface.Prompt.show_message("Nope, that's not it... Please try again!")
                    }
                }

            }
        }

    }






    //INITIALIZATION
    //////////////////
    ParentLayer.style.display = "inherit"
    Interface.Prompt.hide()
    create_opacity_mask()
    start_next_interaction_step()




}