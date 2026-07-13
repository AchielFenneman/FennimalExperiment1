GENERAL_FENNIMAL_INTERACTION_SETTINGS = function () {
    this.sequence_order = {
        passive_observation: ["fade_and_Fennimal_appear_center"],
        polaroid_photo_passive: ["Fennimal_appear_variable", "take_photo_passive"],
        polaroid_photo_active: ["Fennimal_appear_variable", "take_photo_active"],
        give_food: ["Fennimal_appear_left", "Fennimal_hungry", "open_backpack_food"],
        play_with_toy_no_box_active: ["fade_and_Fennimal_appear_center", "ask_toy", "play_with_toy"],
        play_with_toy_no_box_passive: ["fade_and_Fennimal_appear_center", "play_with_toy"],
        play_with_toy_box_active: ["Fennimal_appear_left", "ask_box", "box_appears", "ask_toy", "open_box","play_with_toy", "place_toy_in_box", "request_close_box", "take_box_away"],
        play_with_toy_box_passive: ["Fennimal_appear_left","box_appears", "request_open_box", "play_with_toy", "place_toy_in_box", "request_close_box", "take_box_away"],
        ask_belief_partner_contents_box: ["show_Fennimal_and_box",  "ask_belief_partner", "fade_elements_out"],
        ask_contents_box: ["show_Fennimal_and_box",  "ask_contents_box", "fade_elements_out"],
        ask_Fennimal_toy: ["fade_and_Fennimal_appear_center",  "ask_Fennimal_toy",  "fade_elements_out"],
        lost_hat: ["show_Fennimal_no_hat", "go_to_lost_and_found"],
        replacement_toy: ["Fennimal_appear_left", "Fennimal_bored_with_toy"],
        hide_and_seek: ["hide_and_seek"],
        find_box: ["find_box_task"],
        hat_blown_away: ["reach_hat_task"],
        fly_swatting: ["fly_swatting_task"],
        basic_intro_toybox: ["basic_intro_toybox"]

    }

    this.sequence_order_if_already_visited = {
        "polaroid_photo": ["photo_already_collected"],
        "passive_Fennimal": ["passive_Fennimal"]
    }

    //DENOTES THE CENTER OF THE FENNIMAL
    this.FennimalVariablePositionLimits = {xmin: 250, xmax: 1700, ymin: 600, ymax: 700}
    this.FennimalVariableSizeLimits = {
        default: 1,
        size_min: 1.5,
        size_max: 2,
        max_height: 0.5 * GenParam.SVG_height,
        max_width: 0.5 * GenParam.SVG_width,
    }
    this.FennimalCenterPosition = {
        center_x: 0.5 * GenParam.SVG_width,
        center_y: 0.6 * GenParam.SVG_height,
        size: 2,
        max_height: 0.70 * GenParam.SVG_height,
        max_width: 0.5 * GenParam.SVG_width,
    }
    this.FennimalLeftPosition = {
        center_x: 0.25 * GenParam.SVG_width,
        center_y: 0.6 * GenParam.SVG_height,
        size: 2,
        max_width: 0.5 * GenParam.SVG_width,
        max_height: 0.7 * GenParam.SVG_height,

    }

    this.OpacityMaskSettings = {
        opacity: 0.85,
        color: "white",
        relative_appearance_speed: 0.5
    }

    this.step_speed = 900

    this.photo_camera_allowed_error = 200

    this.BoxPosition = {
        center_x: 0.65 * GenParam.SVG_width,
        center_y: 0.65 * GenParam.SVG_height,
        size: 3.5,
        toy_offset_y: 100
    }

    //Settings for any question bars (toys or boxes)
    this.QuestionBar = {
        top_y: 0.725 * GenParam.SVG_height,
        height: 0.225 * GenParam.SVG_height,
    }
}

//TODO: OptionalAdditionalInformation should contain {Distractor_Food_Items}
FENNIMALCONTROLLER = function (FenObj, ExpCont,  OptionalAdditionalInformation) {
    console.log(FenObj)
    let that = this
    // GENERAL REFERENCES
    //////////////////////
    let Settings = new GENERAL_FENNIMAL_INTERACTION_SETTINGS()
    let ParentLayer = document.getElementById("Fennimals_Layer")
    let BackgroundLayer, FennimalLayer, ItemLayer
    let Clean_Up_Steps = []
    let OpacityMask, FennimalSVGObj, FennimalTranslationGroup, FennimalScaleGroup,
        FennimalBaseTransform, FennimalBaseCenterCoords, FennimalBaseHandCoords,
        CameraButton, CameraMask, camera_target_type, camera_task_type, Camera_ViewFinder, Camera_Polaroid_Frame,
        Camera_PhotoCloseButton, Camera_Photo_Name_Foreign, Camera_Photo_Name_Input,
        camera_active_name_attempts_left, camera_active_name_previous_attempt
    let PartnerIcon, PartnerIconOutline, PartnerTranslateGroup, partner_is_present = false
    let CurrentQuestion, AllQuestionsAsked = [], toy_box_retrieval_type

    //Item layer objects (containing four different layers, representing different depths)
    let ItemObjects = {}, ItemLayerObj
    let Photo_Settings = {
        backgroundColor: GenParam.RegionData[FenObj.region].darker_color,
        offset_from_center_y: -100,
        animation_speed: 300,
        CloseButtonCoords: {
            x: 0.5 * GenParam.SVG_width,
            y: 0.93 * GenParam.SVG_height,
            w: 100,
            h: 100
        },
        InputSettings: {
            normal_font_color: "dimgray",
            incorrect_font_color: "darkred"
        }
    }

    //Shorthand
    let participant_facing_location_name = GenParam.LocationDisplayNames[FenObj.location]

    //FINDING THE INTERACTION SEQUENCE
    //////////////////////////////////////
    //One interaction type is special: "already_visited". This interaction depends on the previously observed sequence
    if(typeof FenObj.visited !== "undefined") { if(FenObj.visited){FenObj.interaction_type = "already_visited"} }
    let InteractionSequence
    switch(FenObj.interaction_type) {
        case("already_visited"):
            if (typeof FenObj.interaction_type !== "undefined") {
                if (FenObj.interaction_type.includes("polaroid")) {
                    InteractionSequence = Settings.sequence_order_if_already_visited["polaroid_photo"]
                }else{
                    InteractionSequence = Settings.sequence_order_if_already_visited["passive_Fennimal"]
                }
            } else {
                InteractionSequence = Settings.sequence_order["passive_observation"]
            }
            break
        case("play_with_toy_passive"):
            //The sequence of toy trials depends on whether or not there is a box present.
            if(typeof FenObj.toybox !== "undefined") {
                // Possible options:
                //  There is no toy in the box ("empty")
                //  The toy is already in the box ("retrieve")
                //  There is a different toy in the box ("swap")
                switch(WorldState.get_toybox_contents(FenObj.toybox)) {
                    case(false): toy_box_retrieval_type =  "empty"
                        break
                    case(FenObj.toy): toy_box_retrieval_type =  "retrieve"
                        break
                    default: toy_box_retrieval_type = "swap"
                }
                InteractionSequence = Settings.sequence_order.play_with_toy_box_passive
            }else{
                InteractionSequence = Settings.sequence_order.play_with_toy_no_box_passive
            }

            break
        case("play_with_toy_active"):
            if(typeof FenObj.toybox !== "undefined") {
                // Possible options:
                //  There is no toy in the box ("empty")
                //  The toy is already in the box ("retrieve")
                //  There is a different toy in the box ("swap")
                switch(WorldState.get_toybox_contents(FenObj.toybox)) {
                    case(false): toy_box_retrieval_type =  "empty"
                        break
                    case(FenObj.toy): toy_box_retrieval_type =  "retrieve"
                        break
                    default: toy_box_retrieval_type = "swap"
                }
                InteractionSequence = Settings.sequence_order.play_with_toy_box_active
            }else{
                InteractionSequence = Settings.sequence_order.play_with_toy_no_box_active
            }

            break
        default:
            InteractionSequence = Settings.sequence_order[FenObj.interaction_type]
            break
    }

    // TOP LEVEL INTERACTIONS
    //////////////////////////
    function start_next_interaction_step() {
        if (InteractionSequence.length > 0) {
            let next_step = InteractionSequence.shift()
            console.log(next_step)
            switch (next_step) {
                case("enter_location"):
                    enter_location()
                    break
                case("fade_background"):
                    fade_background();
                    break;
                case("Fennimal_appear_variable"):
                    Fennimal_appear_variable(true)
                    break
                case("Fennimal_appear_left"):
                    fade_and_appear_Fennimal_left(true, true, false)
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
                    fade_and_appear_Fennimal_center(true,true, false)
                    //Interface.Prompt.show_message("This Fennimal is named " + FenObj.name)
                    break
                case("photo_already_collected"):
                    fade_and_appear_Fennimal_center(true,true, false)
                    Interface.Prompt.show_message("You already took a photo of " + FenObj.name)
                    break
                case("passive_Fennimal"):
                    fade_and_appear_Fennimal_center(true,true, false)
                    Interface.Prompt.show_message(FenObj.name + " is happy to see you - but is not who you're looking for")
                    break

                case("Fennimal_hungry"):
                    Interface.Prompt.show_message(FenObj.name + " is hungry...")
                    add_foodbowl_below_Fennimal()
                    break
                case("open_backpack_food"):
                    open_backpack_food()
                    break
                case("ask_toy"):
                    ask_toy_questionbar();
                    break
                case("ask_box"):
                    ask_box_questionbar()
                    break
                case("show_box"):{
                    show_box()
                    break

                }
                case("play_with_toy"):
                    play_with_toy()
                    break
                case("open_backpack_box"):
                    open_backpack_box(0.65);
                    break
                case("box_appears"):
                    show_box(true)
                    break
                case("request_open_box"):
                    request_participant_to_open_box()
                    break
                case("place_toy_in_box"):
                    place_toy_in_box()
                    break
                case("open_box"):
                    that.box_has_been_opened()
                    break
                case("request_close_box"):
                    request_participant_to_close_box()
                    break
                case("take_box_away"):
                    take_box_away()
                    break

                case("show_Fennimal_and_box"):
                    show_Fennimal_and_box()
                    break
                case("ask_belief_partner"):
                    ask_belief_partner()
                    break
                case("ask_contents_box"):
                    ask_contents_box()
                    break
                case("ask_Fennimal_toy"):
                    ask_Fennimal_toy()
                    break

                case("fade_elements_out"):
                    fade_out_all_elements()
                    break

                case("show_Fennimal_no_hat"):
                    fade_and_appear_Fennimal_left(false,true, true)
                    Interface.Prompt.show_message("Uh oh! " + FenObj.name + "'s hat is missing...")
                    AudioCont.play_sound_effect("sad")
                    break
                case("go_to_lost_and_found"):
                    show_lost_and_found_button()
                    break

                case("Fennimal_bored_with_toy"):
                    show_Fennimal_bored();
                    break
                case("hide_and_seek"):
                    play_hide_and_seek();
                    break
                case("find_box_task"):
                    play_find_box_task()
                    break
                case("reach_hat_task"):
                    play_reach_hat_task()
                    break
                case("fly_swatting_task"):
                    play_fly_swatting_task()
                    break
                case("basic_intro_toybox"):
                    show_basic_intro_toybox_trial();
                    break

                default:
                    console.error("Attempting to execute unknown interaction step: " + next_step + ". Skipping...")
                    start_next_interaction_step()
            }

        } else {
            //Interaction over! Inform the Experiment controller
            end_interation()
        }
    }

    function check_for_partner_presence(){
        //There is a special exception for the "ask" interaction types which include a partner. In this case there should ALWAYS be a partner, but it should be on the right facing in.
        if(FenObj.interaction_type.includes("ask") && FenObj.interaction_type.includes("partner")){
            show_partner_icon(false, "left")
            partner_is_present = true
            PartnerIconOutline.classList.add("focus_on_SVG_outline")

            //Check if the partner has a name or not
            if(typeof WorldState.get_partner_icon_settings().name !== "undefined"){
                if(WorldState.get_partner_icon_settings().name !== false){
                    Interface.Prompt.show_message(WorldState.get_partner_icon_settings().name + " is also here right now...")
                }else{
                    Interface.Prompt.show_message("Your partner is also here right now...")
                }
            }

            //Stop highlighting and continue
            setTimeout(function(){
                PartnerIconOutline.classList.remove("focus_on_SVG_outline")
                PartnerIconOutline.style.opacity = "0";
                PartnerIcon.style.filter = "blur(.25px)"
                PartnerIcon.style.pointerEvents = "none";
                start_next_interaction_step()
            },2 * Settings.step_speed)

        }else{
            if(WorldState.get_current_partner_role() !== "undefined"  ){
                if(WorldState.get_current_partner_role() !== null && WorldState.get_current_partner_role() !== false && WorldState.get_current_partner_role() !== "absent"){
                    partner_is_present = true
                    Settings.FennimalVariablePositionLimits.xmax = 0.70 * GenParam.SVG_width

                    //Check if the partner has a name or not
                    let partner_name = false
                    if(typeof WorldState.get_partner_icon_settings().name !== "undefined"){
                        if(WorldState.get_partner_icon_settings().name !== false){
                            partner_name = WorldState.get_partner_icon_settings().name
                        }
                    }

                    //If the partner behavior is passive, let the participant know that the partner is NOT present
                    switch(WorldState.get_current_partner_role()){
                        case("passive"):
                            //Show the empty outline
                            show_partner_icon(true, "back")
                            PartnerIconOutline.classList.add("focus_on_SVG_outline")

                            if(partner_name === false){
                                Interface.Prompt.show_message("Your partner is NOT here right now...")
                            }else{
                                Interface.Prompt.show_message(partner_name + " is NOT here right now...")
                            }
                            setTimeout(function(){
                                PartnerIconOutline.remove()
                                Interface.Prompt.hide()
                                setTimeout(function(){
                                    start_next_interaction_step()
                                },300)

                            },2 * Settings.step_speed)

                            break
                        case("absent"):
                            //Show the empty outline
                            show_partner_icon(true, "back")
                            PartnerIconOutline.classList.add("focus_on_SVG_outline")

                            if(partner_name === false){
                                Interface.Prompt.show_message("Your partner is NOT here right now...")
                            }else{
                                Interface.Prompt.show_message(partner_name + " is NOT here right now...")
                            }
                            setTimeout(function(){
                                PartnerIconOutline.remove()
                                Interface.Prompt.hide()
                                setTimeout(function(){
                                    start_next_interaction_step()
                                },300)

                            },2 * Settings.step_speed)

                            break
                        case("active"):
                            //Show the icon
                            show_partner_icon(false, "back")
                            PartnerIconOutline.classList.add("focus_on_SVG_outline")

                            //Show the text
                            if(partner_name === false){
                                Interface.Prompt.show_message("Your partner is also here right now...")
                            }else{
                                Interface.Prompt.show_message(partner_name + " is also here right now...")
                            }

                            setTimeout(function(){
                                PartnerIconOutline.classList.remove("focus_on_SVG_outline")
                                PartnerIconOutline.style.opacity = "0";
                                PartnerIcon.style.filter = "blur(.25px)"
                                PartnerIcon.style.pointerEvents = "none";
                                start_next_interaction_step()
                            },2 * Settings.step_speed)
                            break
                    }
                }else{
                    //Do not include any references to a partner
                    start_next_interaction_step()
                }

            }else{
                //Do not include any references to a partner
                start_next_interaction_step()
            }
        }
    }
    function check_for_toybox_presence(){
        if(typeof FenObj.toybox !== "undefined"){
            if(! ( FenObj.interaction_type.includes("box") || FenObj.interaction_type.includes("toy_active") ) ){
                //show_box_not_focus()
            }
        }
    }

    function show_partner_icon(outline_only, direction){
        PartnerIcon = WorldState.get_person_icon("partner", direction)

        let scale_factor = 45, y_fraction = 0.9
        if(direction === "left"){ scale_factor = 30; y_fraction = 0.5 }

        PartnerIcon.style.transform = "scale(" + scale_factor + ")"
        PartnerTranslateGroup  = create_SVG_group(0,0,undefined,undefined);

        if(outline_only){
            PartnerIconOutline = PartnerIcon.getElementsByClassName("outline")[0]
            PartnerIconOutline.style.transform = "scale(" + scale_factor + ")"
            PartnerIconOutline.style.fill = "none"
            PartnerIconOutline.style.strokeWidth = "1px"

            PartnerTranslateGroup.appendChild(PartnerIconOutline);
            ItemLayerObj.Partner.appendChild(PartnerTranslateGroup);
            AudioCont.play_sound_effect("absent_chime")

        }else{
            PartnerIconOutline = PartnerIcon.getElementsByClassName("outline")[0]
            PartnerTranslateGroup.appendChild(PartnerIcon);
            ItemLayerObj.Partner.appendChild(PartnerTranslateGroup);
            PartnerIconOutline.style.strokeWidth = "2px"
            AudioCont.play_sound_effect("alert")
        }

        moveSVGCenterTo(PartnerTranslateGroup, 0.89 * GenParam.SVG_width, y_fraction * GenParam.SVG_height)


        PartnerIconOutline.style.opacity = 0.8

    }

    // SUPPORTING FUNCTIONS
    ////////////////////////
    function end_interation() {
        //If there is a toybox, make sure that we register its final state here
        if(typeof FenObj.toybox !== 'undefined'){
            FenObj.toy_in_box.end = WorldState.get_toybox_contents(FenObj.toybox)
        }
        FenObj.Questions = AllQuestionsAsked

        ExpCont.Fennimal_interaction_completed(FenObj)
    }

    //Should be called by the experiment controller to clear all the interaction elements (before closing the trial)
    this.clear = function () {
        cleanup()
    }

    //Clean-up at the end of the interaction execute before leaving)
    function cleanup() {
        for (let i = 0; i < Clean_Up_Steps.length; i++) {
            if(typeof Clean_Up_Steps[i] === "string"){
                switch (Clean_Up_Steps[i]) {
                    case("remove_opacity_mask"):
                        OpacityMask.remove();
                        break
                    case("remove_Fennimal"):
                        FennimalSVGObj.remove()
                        break
                    case("remove_camera_button"):
                        CameraButton.remove()
                        break
                    case("remove_items"):
                        ItemLayerObj.Layer.remove();
                        break
                }
            }
            if(typeof Clean_Up_Steps[i] === "object"){
                Clean_Up_Steps[i].target.clean_up()
            }
        }

        if(typeof ItemObjects.toy  !== "undefined"){
            ItemObjects.toy.remove()
        }


    }

    //LAYER CREATION FUNCTIONS
    ////////////////////////////
    function create_SVG_layers(){
        let ItemLayer = create_SVG_group(0,0,undefined,"ItemLayer")
        let ItemLayer_depth_minus_one = create_SVG_group(0,0,undefined,"ItemLayer_neg1")
        let ItemLayer_main = create_SVG_group(0,0,undefined,"ItemLayer_main")
        let ItemLayer_depth_plus_one = create_SVG_group(0,0,undefined,"ItemLayer_plus1")
        let ItemLayer_depth_plus_two = create_SVG_group(0,0,undefined,"ItemLayer_plus2")
        let ItemLayer_partner = create_SVG_group(0,0,undefined,"ItemLayer_partner")
        let ItemLayer_questions = create_SVG_group(0,0,undefined,"ItemLayer_partner")
        BackgroundLayer = create_SVG_group(0,0, undefined,"BackgroundLayer",)
        FennimalLayer = create_SVG_group(0,0,undefined,"FennimalLayer",)

        ItemLayer.appendChild(ItemLayer_depth_minus_one)
        ItemLayer.appendChild(ItemLayer_main)
        ItemLayer.appendChild(ItemLayer_depth_plus_one)
        ItemLayer.appendChild(ItemLayer_depth_plus_two)
        ItemLayer.appendChild(ItemLayer_partner)
        ItemLayer.appendChild(ItemLayer_questions)

        ParentLayer.appendChild(BackgroundLayer)
        ParentLayer.appendChild(FennimalLayer)
        ParentLayer.appendChild(ItemLayer)

        Clean_Up_Steps.push("remove_items")

        // For ease of reference, place them all into a single object
        ItemLayerObj = {
            Layer: ItemLayer,
            Neg1: ItemLayer_depth_minus_one,
            Main: ItemLayer_main,
            Plus1: ItemLayer_depth_plus_one,
            Plus2: ItemLayer_depth_plus_two,
            Partner: ItemLayer_partner,
            Questions: ItemLayer_questions
        }
    }

    function move_item_layers_to_top(){
        ItemLayerObj.Layer.remove()
        ParentLayer.appendChild(ItemLayerObj.Layer)
    }

    // SEQUENCE-SPECIFIC FUNCTIONS
    ////////////////////////////////
    function enter_location() {
        setTimeout(function () {
            Interface.Prompt.show_message("You are now at the " + participant_facing_location_name + "...")
        }, 0.15 * Settings.step_speed)

        setTimeout(function () {
            start_next_interaction_step()
        }, 0.5 * Settings.step_speed)
    }

    function fade_background() {
        show_opacity_mask()

        setTimeout(function () {
            start_next_interaction_step()
        }, Settings.step_speed)
    }

    //This shows the Fennimal on a random location on the screen, WITHOUT the opacity mask (good for visual search - like taking a photo)
    function Fennimal_appear_variable(auto_continue) {
        //Drawing random X and Y center coordinates from the allowed range
        let center_x = randomIntFromInterval(Settings.FennimalVariablePositionLimits.xmin, Settings.FennimalVariablePositionLimits.xmax)
        let center_y = randomIntFromInterval(Settings.FennimalVariablePositionLimits.ymin, Settings.FennimalVariablePositionLimits.ymax)

        //Drawing a Fennimal on the screen.
        let scale_factor_based_on_y = (center_y - Settings.FennimalVariablePositionLimits.ymax) / (Settings.FennimalVariablePositionLimits.ymin - Settings.FennimalVariablePositionLimits.ymax)
        let size = Settings.FennimalVariableSizeLimits.size_min + scale_factor_based_on_y * (Settings.FennimalVariableSizeLimits.size_max - Settings.FennimalVariableSizeLimits.size_min)
        draw_Fennimal_on_screen(center_x, center_y, size, Settings.FennimalVariablePositionLimits.max_width, Settings.FennimalVariablePositionLimits.max_height)
        introduce_Fennimal(auto_continue)

    }

    //These two functions show the Fennimal on a fixed location on the screen, WITH the opacity mask
    function fade_and_appear_Fennimal_center(show_introduction, auto_continue, hide_hat) {
        show_opacity_mask()
        draw_Fennimal_on_screen(Settings.FennimalCenterPosition.center_x, Settings.FennimalCenterPosition.center_y, Settings.FennimalCenterPosition.size, Settings.FennimalCenterPosition.max_width, Settings.FennimalCenterPosition.max_height)
        if(show_introduction){
            introduce_Fennimal(auto_continue)
        }
        if(hide_hat){
            FennimalSVGObj.getElementsByClassName("hat")[0].style.opacity = 0
        }
        if(!show_introduction && auto_continue){
            setTimeout(function () {
                start_next_interaction_step()
            },  Settings.step_speed)

        }
    }

    function fade_and_appear_Fennimal_left(show_introduction, auto_continue, hide_hat) {
        show_opacity_mask()
        draw_Fennimal_on_screen(Settings.FennimalLeftPosition.center_x, Settings.FennimalLeftPosition.center_y, Settings.FennimalLeftPosition.size , Settings.FennimalLeftPosition.max_width, Settings.FennimalLeftPosition.max_height)
        if(show_introduction){
            introduce_Fennimal(auto_continue)
        }
        if(hide_hat){
            FennimalSVGObj.getElementsByClassName("hat")[0].style.opacity = 0
        }
        if(!show_introduction && auto_continue){
            setTimeout(function () {
                start_next_interaction_step()
            },  Settings.step_speed)

        }

    }

    function introduce_Fennimal(auto_continue) {
        //The text and timing depends on wether the Fennimal has been encountered before already
        AudioCont.play_sound_effect("Fennimal_appears")

        if(WorldState.get_array_of_Fennimals_already_encounted_during_experiment().includes(FenObj.name)){
            Interface.Prompt.show_message("You found " + FenObj.name)
            if(auto_continue){
                setTimeout(function () {
                    start_next_interaction_step()
                }, 1 * Settings.step_speed)
            }
        }else{
            Interface.Prompt.show_message("There is a Fennimal present here!")
            setTimeout(function () {
                Interface.Prompt.show_message("This Fennimal is called " + FenObj.name)
                if(auto_continue){
                    setTimeout(function () {
                        start_next_interaction_step()
                    }, 1 * Settings.step_speed)
                }
            }, 1.5 * Settings.step_speed)



        }

    }

    //Creates the opacity mask (set to invisible unless show opacity mask is called)
    function create_opacity_mask() {
        OpacityMask = create_SVG_rect(0, 0, GenParam.SVG_width, GenParam.SVG_height, undefined, undefined)
        ParentLayer.appendChild(OpacityMask)
        OpacityMask.style.fill = Settings.OpacityMaskSettings.color
        OpacityMask.style.opacity = 0
        OpacityMask.style.transition = "all " + (Settings.OpacityMaskSettings.relative_appearance_speed * Settings.step_speed) + "ms ease-in-out"

        Clean_Up_Steps.push("remove_opacity_mask")
    }

    function show_opacity_mask() {
        setTimeout(function () {
            OpacityMask.style.opacity = Settings.OpacityMaskSettings.opacity
        }, 5)

        setTimeout(function () {
            //start_next_interaction_step()
        }, 1.5 * Settings.step_speed)

    }

    function draw_Fennimal_on_screen(center_x, center_y, size, max_width, max_height) {

        //Create
        FennimalSVGObj = create_Fennimal_SVG_object(FenObj, GenParam.Fennimal_head_size, false)
        FennimalLayer.appendChild(FennimalSVGObj)
        FennimalTranslationGroup = FennimalSVGObj
        FennimalScaleGroup = FennimalSVGObj.getElementsByClassName("Fennimal_scale_group")[0]
        move_item_layers_to_top()

        //Translate
        move_Fennimal_to_new_location(center_x, center_y)


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

        //If the Fennimal is too large, resize it
        if(FennimalSVGObj.getBBox().width > max_width || FennimalSVGObj.getBBox().height > max_height){
            resize_Fennimal_to_fit_dimensions(max_width, max_height)
        }

        //Storing the base transform of the Fennimal on the screen here
        FennimalBaseTransform = parse_x_and_y_from_transform_string(FennimalTranslationGroup.style.transform)
        FennimalBaseHandCoords = getSVGInternalCenter(FennimalSVGObj.getElementsByClassName("Fennimal_body_center_point")[0])
        FennimalBaseCenterCoords = getSVGInternalCenter(FennimalTranslationGroup)

    }

    //Note: these two functions do NOT modify the stored position variables for the Fennimal Object.
    function move_Fennimal_to_new_location(center_x, center_y) {
        let Box = FennimalSVGObj.getBBox()
        let delta_x = center_x - (Box.x + 0.5 * Box.width)
        let delta_y = center_y - (Box.y + 0.5 * Box.height)
        FennimalTranslationGroup.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"
    }

    //Note, this SHIFTS the Fennimal by a given X and Y
    function animate_Fennimal_moving_to_relative_position(delta_x, delta_y, animation_speed) {
        FennimalSVGObj.style.transition = "all "+ animation_speed + "ms ease-in-out"
        let Basetransform = parse_x_and_y_from_transform_string(FennimalTranslationGroup.style.transform)

        FennimalTranslationGroup.style.transform = "translate(" + (Basetransform.x + delta_x) + "px, " +(Basetransform.y + delta_y) + "px)"
    }
    function animate_Fennimal_returning_to_base_position(animation_speed) {
        FennimalSVGObj.style.transition = "all "+ animation_speed + "ms ease-in-out"
        FennimalTranslationGroup.style.transform = "translate(" + FennimalBaseTransform.x + "px, " + FennimalBaseTransform.y + "px)"

    }

    function resize_Fennimal_to_fit_dimensions(max_w, max_h) {
        //FenObj.pos_on_screen.size = 1
        if (typeof FennimalScaleGroup.style.transform !== "undefined") {
            // FenObj.pos_on_screen.size = parseFloat(FennimalScaleGroup.style.transform.split("(")[1].split(")")[0])
        }

        FennimalScaleGroup.style.transform = ""
        let Box = FennimalSVGObj.getBBox()
        let scale_factor_w = max_w / Box.width
        let scale_factor_h = max_h / Box.height
        let min_factor = Math.min(scale_factor_w, scale_factor_h)
        FennimalScaleGroup.style.transform = "scale(" + min_factor + ")"


    }

    function fade_out_all_elements(){
        Interface.Prompt.hide()
        //Partner (if present)
        if(partner_is_present){
            PartnerIcon.style.transition = "all "+ Settings.step_speed + "ms ease-in-out"
            PartnerIcon.style.opacity = "0"
        }

        //Fennimal
        FennimalSVGObj.style.transition = "all "+ Settings.step_speed + "ms ease-in-out"
        FennimalSVGObj.style.opacity = 0

        for(let key in ItemObjects){
            switch(key){
                case("backpack"):
                    ItemObjects.backpack.fade_out(Settings.step_speed)
                    break
                case("box"):
                    ItemObjects.box.animate_opacity(0, Settings.step_speed)
                    break
                case("questionbubble"):
                    ItemObjects.questionbubble.fade_out(Settings.step_speed)
                    break

            }
        }

        setTimeout(function(){OpacityMask.style.opacity=0}, 0.75*Settings.step_speed)
        setTimeout(function(){start_next_interaction_step()}, 1.5 * Settings.step_speed)



    }

    // FUNCTIONS FOR THE PHOTO INTERACTION TYPE
    ////////////////////////////////////////////
    function show_camera_button(target_type, camera_action_type) {
        CameraButton = create_Action_Button_SVG_Element("camera", GenParam.ActionButtonParameters_Center, false, false)
        ParentLayer.appendChild(CameraButton)
        camera_target_type = target_type
        camera_task_type = camera_action_type
        Clean_Up_Steps.push("remove_camera_button")
        CameraButton.onpointerdown = function () {
            enter_camera_mode();
            AudioCont.play_sound_effect("camera_pickup")
        }
        Interface.Prompt.show_message("Click on the button to open your camera...")
    }

    function enter_camera_mode() {
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
        CameraMask = create_SVG_rect(0, 0, GenParam.SVG_width, GenParam.SVG_height, undefined, undefined)
        CameraMask.style.opacity = 0
        ParentLayer.appendChild(CameraMask)

        CameraMask.onpointermove = function (event) {
            move_camera_viewfinder(getMousePosition(event))
        }
        CameraMask.onpointerdown = function (event) {
            take_photo_at_location(getMousePosition(event))
        }

    }

    function move_camera_viewfinder(Coords) {
        if (typeof Camera_ViewFinder !== "undefined") {
            //Finding the transform needed to move the viewfinder such that its center is on the cursor
            let Box = Camera_ViewFinder.getBBox()
            let current_viewfinder_center_x = Box.x + 0.5 * Box.width
            let current_viewfinder_center_y = Box.y + 0.5 * Box.height

            let delta_x = Coords.x - current_viewfinder_center_x
            let delta_y = Coords.y - current_viewfinder_center_y

            Camera_ViewFinder.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"
        }

    }

    function take_photo_at_location(Coords) {
        play_camera_shutter_effect(500)
        AudioCont.play_sound_effect("photo")

        setTimeout(function () {
            check_photo_target(Coords)
        }, 750)
    }

    function play_camera_shutter_effect(duration) {
        let CameraShutterMask = create_SVG_rect(0, 0, GenParam.SVG_width, GenParam.SVG_height, undefined, undefined)
        ParentLayer.appendChild(CameraShutterMask)

        CameraShutterMask.style.opacity = 0
        CameraShutterMask.style.fill = "white"
        CameraShutterMask.style.transition = "all " + (0.45 * duration) + "ms ease-in"

        setTimeout(function () {
            CameraShutterMask.style.opacity = 0.8
        }, 10)
        setTimeout(function () {
            CameraShutterMask.style.opacity = 0
        }, 0.55 * duration)
        setTimeout(function () {
            CameraShutterMask.remove()
        }, duration)


    }

    function leave_camera_mode() {
        CameraMask.remove()
        CameraMask = undefined
        Camera_ViewFinder.remove()
        Camera_ViewFinder = undefined
        CameraButton.style.display = "inherit"

    }

    function check_photo_target(Coords) {
        //Finding the target
        let Target
        switch (camera_target_type) {
            case("head"):
                Target = FennimalSVGObj.getElementsByClassName("Fennimal_head")[0]
                break
        }

        let TargetCenterCoords = getViewBoxCenterPoint(Target)

        //Finding the distance to the target
        let dist = EUDistPoints(Coords, TargetCenterCoords)

        if (dist <= Settings.photo_camera_allowed_error) {
            show_succesful_photo()
        } else {
            AudioCont.play_sound_effect("rejected")
            Interface.Prompt.show_message("Oops, that wasn't it... please try again")
            leave_camera_mode()
        }

    }

    function show_succesful_photo() {
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
        let delta_x = (0.5 * GenParam.SVG_width) - (0.5 * VFBox.width)
        let delta_y = (0.5 * GenParam.SVG_height) - (0.5 * VFBox.height)

        //Quick timeout to make the transitions stick
        setTimeout(function () {
            //Move the view window and set the view finder background to black
            Camera_ViewFinder.style.transform = "translate(" + delta_x + "px, " + (delta_y + Photo_Settings.offset_from_center_y) + "px)"
            Camera_ViewFinder.getElementsByClassName("camera_viewfinder_opacity_mask")[0].style.opacity = 1
            Camera_ViewFinder.getElementsByClassName("camera_viewfinder_opacity_mask")[0].style.fill = Photo_Settings.backgroundColor
            OpacityMask.style.opacity = 1
            Camera_ViewFinder.getElementsByClassName("camera_viewfinder_target_elements")[0].style.opacity = 0
            //Interface.Locator.hide()

            //Move the Fennimal to the photo frame
            move_Fennimal_to_new_location(0.5 * GenParam.SVG_width, (0.5 * GenParam.SVG_height) + Photo_Settings.offset_from_center_y)
            resize_Fennimal_to_fit_dimensions(Photo_Settings.windowsize.width, Photo_Settings.windowsize.height)

            //Show the polaroid frame
            show_polaroid_frame()

        }, 5)

    }

    function show_polaroid_frame() {
        Camera_Polaroid_Frame = document.getElementById("polaroid_frame").cloneNode(true)
        Camera_Polaroid_Frame.removeAttribute("id")

        //Showing the frame and moving it to the right position
        ParentLayer.appendChild(Camera_Polaroid_Frame)
        Camera_Polaroid_Frame.style.transform = ""

        let CenterPoint = Camera_Polaroid_Frame.getElementsByClassName("polaroid_photo_center")[0]
        let delta_x = (0.5 * GenParam.SVG_width) - CenterPoint.getAttribute("cx")
        let delta_y = (0.5 * GenParam.SVG_height + Photo_Settings.offset_from_center_y) - CenterPoint.getAttribute("cy")
        Camera_Polaroid_Frame.style.transformOrigin = CenterPoint.getAttribute("cx") + "px " + CenterPoint.getAttribute("cy") + "px"
        Camera_Polaroid_Frame.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

        //If this is the passive version of the task, setting name here
        if (camera_task_type === "passive") {
            Interface.Prompt.show_message("This Fennimal is called " + FenObj.name)
            Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].innerHTML = FenObj.name
            show_photo_exit_button()
        } else {
            //If this is the active version, then we need to create a textbox input
            Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].style.opacity = 0
            ask_photo_active_name_input()
            if (camera_task_type === "active") {
                if (typeof OptionalAdditionalInformation.allowed_attempts_before_answer_given !== "undefined") {
                    if (OptionalAdditionalInformation.allowed_attempts_before_answer_given !== false) {
                        camera_active_name_attempts_left = OptionalAdditionalInformation.allowed_attempts_before_answer_given
                    } else {
                        camera_active_name_attempts_left = false
                    }
                } else {
                    //Defaulting to 1
                    camera_active_name_attempts_left = 1
                }

            }
        }


    }

    function show_photo_exit_button() {


        Camera_PhotoCloseButton = create_SVG_buttonElement(Photo_Settings.CloseButtonCoords.x, Photo_Settings.CloseButtonCoords.y, Photo_Settings.CloseButtonCoords.w, Photo_Settings.CloseButtonCoords.h, "🗙", 70)
        ParentLayer.appendChild(Camera_PhotoCloseButton)
        Camera_PhotoCloseButton.onpointerdown = exit_photo

        //Below allows for an event listener to make closing the photo respond to keyboard commands
        add_keyboard_shortcuts_to_object(Camera_PhotoCloseButton, ["Escape", "Enter", " "], 750, exit_photo)


    }

    function exit_photo() {
        //Store the question results
        record_current_question_answer(undefined,true)

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

        setTimeout(function () {
            start_next_interaction_step()

        }, 0.15 * Settings.step_speed)


    }

    function ask_photo_active_name_input() {
        //Creating a new Questions objec (this has a different format than some of the others, so we do it manually
        CurrentQuestion = {
            type: "polaroid_name",
            t_start: Date.now(),
            max_attempts: camera_active_name_attempts_left,
            ans: [],
        }

        Interface.Prompt.show_message("What is this Fennimal's name? (Hit enter to confirm)")

        //Getting the x and y position for the input field
        let NameXY = getViewBoxCenterPoint(Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0])
        let width = Math.round(0.95 * Camera_Polaroid_Frame.getBBox().width)
        let height = 100

        //Creating the Foreign element
        Camera_Photo_Name_Foreign = create_SVG_foreignElement(NameXY.x - 0.5 * width, NameXY.y - 0.5 * height, width, height, undefined, undefined)
        ParentLayer.appendChild(Camera_Photo_Name_Foreign)

        Camera_Photo_Name_Input = document.createElement("input")
        Camera_Photo_Name_Input.style.width = "100%"
        Camera_Photo_Name_Input.style.height = "100%"
        Camera_Photo_Name_Input.type = "text"
        Camera_Photo_Name_Input.style.fontWeight = 600
        Camera_Photo_Name_Input.style.fontSize = "80px"
        Camera_Photo_Name_Input.style.textAlign = "Center"
        Camera_Photo_Name_Input.placeholder = "Type here"
        setTimeout(function () {
            Camera_Photo_Name_Input.focus()
        }, 10)
        Camera_Photo_Name_Foreign.appendChild(Camera_Photo_Name_Input)

        Camera_Photo_Name_Input.onkeydown = function (event) {
            if (event.key === "Enter") {
                try_submitted_Fennimal_photo_name(Camera_Photo_Name_Input.value)
            } else {
                Camera_Photo_Name_Input.style.color = "black"
            }
        }
    }

    function try_submitted_Fennimal_photo_name(name_submitted) {
        //Get (case-insensitive) distance to the actual name.
        let name_distance = LevenshteinDistance(name_submitted.toLowerCase(), FenObj.name.toLowerCase())
        record_current_question_partial_answer(name_submitted)

        if (name_distance === 0) {
                Interface.Prompt.show_message("Correct!")
            AudioCont.play_sound_effect("success")
            Camera_Photo_Name_Foreign.remove()
            Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].innerHTML = FenObj.name
            Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].style.opacity = 1

            //Record the total time and correct aswer
            record_current_question_answer(undefined,true)

            setTimeout(function () {
                show_photo_exit_button()
            }, Settings.step_speed)
        } else
        {
            //Check if the name has been changed from the previous attempt
            AudioCont.play_sound_effect("rejected")
            if (name_submitted !== camera_active_name_previous_attempt) {

                camera_active_name_previous_attempt = name_submitted
                let failed_all_attempts = false
                //Check if there are limited attempts - and if so, whether there are any attempts left
                if (camera_active_name_attempts_left !== false) {
                    camera_active_name_attempts_left--
                    if (camera_active_name_attempts_left === 0) {
                        failed_all_attempts = true
                    }
                }

                //If all attempts have been made and failed, then show the correct name and give feedback.
                if (failed_all_attempts) {
                    record_current_question_answer(undefined,false)

                    Interface.Prompt.show_message("Nope, that wasn't quite it either. The Fennimal's actual name is " + FenObj.name)
                    Camera_Photo_Name_Foreign.remove()
                    Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].innerHTML = FenObj.name
                    Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].style.opacity = 1
                    Camera_Polaroid_Frame.getElementsByClassName("polaroid_frame_name")[0].childNodes[0].style.fill = "darkred"

                    setTimeout(function () {
                        show_photo_exit_button()
                    }, Settings.step_speed)

                } else {
                    //If this distance is one or two, tell the participant that they're close
                    if (name_distance <= 2) {
                        Camera_Photo_Name_Input.style.color = "orange"
                        Interface.Prompt.show_message("Almost there, but not quite right yet...")
                    } else {
                        Camera_Photo_Name_Input.style.color = "red"
                        Interface.Prompt.show_message("Nope, that's not it... Please try again!")
                    }
                }

            }
        }

    }

    // FUNCTIONS FOR THE GIVE_FOOD INTERACTION TYPE
    /////////////////////////////////////////////////
    let FoodMask, DraggedBag, toy_question_type
    function add_foodbowl_below_Fennimal(){
        let FennimalBodyCenter =   FennimalSVGObj.getElementsByClassName("Fennimal_body_center_point")[0]
        FennimalBodyCenter.style.display = "inherit"
        let FenBodyCoords = getSVGInternalCenter(FennimalBodyCenter)
        ItemObjects.foodbowl = new Foodbowl(ItemLayerObj.Main,FennimalSVGObj, FenBodyCoords.x, FenBodyCoords.y +  0.15 * GenParam.SVG_height, true)
        ItemObjects.foodbowl.highlight_outline()

        //Todo: double check with show partner
        FennimalSVGObj.style.transition = "all 100ms ease-in"

        if(FennimalSVGObj.style.filter === ""){
            setTimeout(function () {
                FennimalSVGObj.style.filter = "blur(4px)"
            }, 50)
        }

        setTimeout(function(){
            ItemObjects.foodbowl.stop_highlight_outline()
            start_next_interaction_step()
            //FennimalSVGObj.style.filter = ""
        }, 1.5 * Settings.step_speed)

    }

    function open_backpack_food(){
        //TODO: if there is a partner, move the backpack a bit to the left
        let xpos = 0.75*GenParam.SVG_width
        if(partner_is_present) { xpos = 0.68 * GenParam.SVG_width}
        ItemObjects.backpack = new Backpack(ItemLayerObj.Main, xpos , 0.8*GenParam.SVG_height, that.backpack_food_opened, true)
        ItemObjects.foodbowl.setblur(2)
    }

    this.backpack_food_opened = function(){
        //Blue the backpack, but unblur the Fennimal and the bowl
        ItemObjects.backpack.setblur(1)

        //Now we need to reveal the foodbags
        let Foodbag_shown_type_array = [FenObj.food_preference]
        if(typeof OptionalAdditionalInformation.Distractor_Food_Items !== "undefined"){
            if(Array.isArray(OptionalAdditionalInformation.Distractor_Food_Items) ){
                Foodbag_shown_type_array = Foodbag_shown_type_array.concat(OptionalAdditionalInformation.Distractor_Food_Items)
            }
        }

        //Only one instance of each flavor is allowed
        Foodbag_shown_type_array = [...new Set(Foodbag_shown_type_array)]

        //Starting coordaes should be on the backpack position
        let start_coords = ItemObjects.backpack.getSVG_center()

        //Determining the target coordinates (only the y-values matter here)
        let Target_yvals = []
        let ymax = start_coords.y - 0.15* GenParam.SVG_height
        let ymin = 0.2* GenParam.SVG_height

        switch(Foodbag_shown_type_array.length ){
            case(1):
                Target_yvals = [ymin + .67 * ymax];
                break
            case(2):
                Target_yvals = [ymin + .33 * ymax, ymin + .67 * ymax ];
                break
            default:
                Target_yvals = []
                //let stepsize =(.67*ymax - ymin) / (Foodbag_shown_type_array.length - 1)
                for(let i = 0; i < Foodbag_shown_type_array.length; i++){
                    Target_yvals.push(ymin + i*((ymax - ymin) / (Foodbag_shown_type_array.length - 1)))
                }

        }

        //Shuffle the presentation order
        Foodbag_shown_type_array = shuffleArray(Foodbag_shown_type_array)

        //Creating the foodbags
        ItemObjects.Foodbags = {}
        for(let i = 0; i < Foodbag_shown_type_array.length; i++){
            setTimeout(function(){
                ItemObjects.Foodbags[Foodbag_shown_type_array[i]] = new FoodBag(ItemLayerObj.Main,Foodbag_shown_type_array[i],start_coords.x,start_coords.y, start_coords.x,Target_yvals[i], that)
            }, i * 200)
        }

        //After a brief delay, outline all the bags and change the cursor text
        if(Foodbag_shown_type_array.length > 1){
            Interface.Prompt.show_message("Drag one of the bags to " + FenObj.name + "'s bowl" )
        }else{
            Interface.Prompt.show_message("Drag the bag of " + Foodbag_shown_type_array[0] + " to " +  FenObj.name + "'s bowl" )
        }

        setTimeout(function(){
            for(let key in ItemObjects.Foodbags){
                ItemObjects.Foodbags[key].highlight_outline()
            }

        },750)

        //Creating a new Questions object.
        register_start_new_question("give_food",Foodbag_shown_type_array)
    }

    this.food_bag_picked_up = function(flavor){
        //Fade out all non-selected bags
        for(let key in ItemObjects.Foodbags){
            if(key !== flavor){
                ItemObjects.Foodbags[key].fade_out()
            }else{
                DraggedBag = ItemObjects.Foodbags[key]
            }
        }

        //Create a mask for the release elements
        FoodMask = create_SVG_rect(0,0,GenParam.SVG_width, GenParam.SVG_height)
        FoodMask.onpointerup = function(event){ food_bag_released(event)}
        FoodMask.onpointerdown = function(event){ food_bag_released(event)}

        FoodMask.onpointercancel = function(event){ food_bag_interaction_cancelled()}
        FoodMask.onpointerleave = function(event){ food_bag_interaction_cancelled()}

        FoodMask.onpointermove = function(event){ food_bag_interaction_move(event)}
        FoodMask.touchmove = function(event){ food_bag_interaction_move(event)}

        FoodMask.style.cursor = "pointer"
        FoodMask.style.opacity = 0
        ParentLayer.appendChild(FoodMask)

        //Highlight the foodbowl
        ItemObjects.foodbowl.highlight_outline()
        ItemObjects.foodbowl.setblur(false)


    }

    function reset_food_bags(){
        for(let key in ItemObjects.Foodbags){
            ItemObjects.Foodbags[key].reset_to_start()
            ItemObjects.Foodbags[key].highlight_outline()
        }
        ItemObjects.foodbowl.stop_highlight_outline()
        ItemObjects.foodbowl.setblur(2)

    }

    function food_bag_interaction_move(event){
        DraggedBag.move_bag_to_coords(getMousePosition(event))
    }

    function food_bag_released(event){
        end_food_bag_interaction()
        //Check if the bag is released sufficiently close to the bowl to count as a success - otherwise, reset
        let ReleaseCoords = getMousePosition(event)
        let BowlCoords = ItemObjects.foodbowl.getSVG_center()
        let dist_to_bowl = EUDistPoints(ReleaseCoords,BowlCoords)

        if(dist_to_bowl < 250){
            //Storing the answer
            record_current_question_partial_answer(DraggedBag.get_flavor())

            //Check if this is the correct food. If not, reset
            if(DraggedBag.get_flavor() === FenObj.food_preference){
                food_bag_given()
                AudioCont.play_sound_effect("success")
            }else{
                Interface.Prompt.show_message("Oops! " + FenObj.name + " does not like " + DraggedBag.get_flavor())
                reset_food_bags()
                AudioCont.play_sound_effect("rejected")
            }

        }else{
            reset_food_bags()
        }
    }

    function food_bag_interaction_cancelled(){
        end_food_bag_interaction()
        reset_food_bags()
    }

    function end_food_bag_interaction(){
        FoodMask.remove()
    }

    function food_bag_given(){
        //Remove the dragging elements and backpack
        Interface.Prompt.hide()
        end_food_bag_interaction()
        ItemObjects.backpack.remove()
        delete ItemObjects.backpack

        for(let key in ItemObjects.Foodbags){
            if(key === DraggedBag.get_flavor()){
                ItemObjects.Foodbags[key].open_in_bowl(ItemObjects.foodbowl.getSVG_center())
            }else{
                ItemObjects.Foodbags[key].remove()

            }
            delete ItemObjects.Foodbags[key]
        }

        //Reset the blur for the Fennimal and bowl
        FennimalSVGObj.style.filter = "blur(0px)"
        ItemObjects.foodbowl.setblur(false)
        ItemObjects.foodbowl.stop_highlight_outline()

        //Store the Question data
        record_current_question_answer(undefined,true)


        //Show the food being eaten
        setTimeout(function(){
            let pluraltext
            switch(DraggedBag.get_flavor()){
                case("noodle"): pluraltext = "savory noodles"; break;
                case("chili"): pluraltext = "spicy chilies"; break;
                case("grape"): pluraltext = "fresh grapes"; break;
                case("lime"): pluraltext = "sour limes"; break;
                case("canzy"): pluraltext = "sweet candies"; break;
                default: pluraltext = DraggedBag.get_flavor()
            }
            Interface.Prompt.show_message("Hmm! " + FenObj.name + " loves " + pluraltext)
            ItemObjects.foodbowl.fill_with_food_and_eat(DraggedBag.get_flavor())

            setTimeout(function(){
                ItemObjects.foodbowl.remove()
                delete ItemObjects.foodbowl
                start_next_interaction_step()
            },3500)
        },750)
    }

    // FUNCTIONS FOR THE TOY INTERACTION TYPE
    ////////////////////////////////////////////
    function open_backpack_box(rel_x_pos){
        //Interface.Prompt.show_message("Click to open your backpack")


        ItemObjects.backpack = new Backpack(ItemLayerObj.Main,rel_x_pos*GenParam.SVG_width , 0.8*GenParam.SVG_height, that.backpack_box_opened, true)
        //ItemObjects.backpack.highlight_outline()
    }

    function ask_toy_questionbar(){
        //Determine which kind of question this is.
        //  If there is a box:
        //     If the box contains an item: ask the contents of the box. ("in_box")
        //     If the box is empty: ask which toy previously associated to this Fennimal ("previous_play")
        //  If there is no box:
        //     Ask which toy previouly associated to the Fennimal ("previous_play")

        //Setting the text. This depends on whether this is a trial with a box or not
        if(typeof FenObj.toybox === "undefined"){
            toy_question_type = "previous_play"
            Interface.Prompt.show_message("Which toy did you previously see " + FenObj.name + " play with?")
        }else{
            if(WorldState.get_toybox_contents(FenObj.toybox) === false){
                toy_question_type = "previous_play"
                Interface.Prompt.show_message("Which toy did you previously see " + FenObj.name + " play with?")
            }else{
                toy_question_type = "in_box"
                Interface.Prompt.show_message("Which toy is currently in the " + GenParam.get_box_printed_name(FenObj.toybox) + "?")
            }
        }

        //Find all items. Ensure that the correct toy answer is in there.
        let AllToyOptions = []
        if(toy_question_type === "previous_play") { AllToyOptions.push(FenObj.toy)}
        if(toy_question_type === "in_box") { AllToyOptions.push(WorldState.get_toybox_contents(FenObj.toybox))}

        //Adding distractors
        if(typeof OptionalAdditionalInformation.Distractor_Toys !== undefined){
            AllToyOptions = AllToyOptions.concat(OptionalAdditionalInformation.Distractor_Toys)
        }
        AllToyOptions = [... new Set(AllToyOptions)]


        //Creating the itembar
        Settings.QuestionBar.backgroundcolor = GenParam.RegionData[FenObj.region].lighter_color
        ItemObjects.questionbar = new QuestionBar(ItemLayerObj.Partner, get_array_of_toys_for_question(true), Settings.QuestionBar,FenObj.bonus_stars_earnable, that.toy_question_answered)

        //Creating a new Questions object.
        register_start_new_question("toy_" + toy_question_type, AllToyOptions)


    }
    this.toy_question_answered = function(answer){
        //Record the answer
        record_current_question_partial_answer(answer)

        //Collapse the bar
        ItemObjects.questionbar.collapse_bar()

        //Check the answer
        let correctans
        if(toy_question_type === "previous_play"){correctans = answer === FenObj.toy}
        if(toy_question_type === "in_box"){correctans = answer === WorldState.get_toybox_contents(FenObj.toybox)}

        if(correctans){
            //Store the Question data
            record_current_question_answer(undefined,true)

            Interface.Prompt.show_message("Correct!")
            AudioCont.play_sound_effect("success")
            setTimeout(function(){
                start_next_interaction_step()
                ItemObjects.questionbar.remove()
                delete ItemObjects.questionbar
            },Math.max(Settings.step_speed, 500))

        }else{
            Interface.Prompt.show_message("Oops! Thats the wrong toy")
            AudioCont.play_sound_effect("rejected")
            setTimeout(function(){
                //If the answer is not correct, remove the wrong answer and re-expand
                ItemObjects.questionbar.remove_element(answer)
                ItemObjects.questionbar.expand_bar()
            },Math.max(Settings.step_speed, 500))

        }


    }

    function ask_box_questionbar(){
        //Drawing the box on screen
        //ItemObjects.box = new Box(ItemLayerObj, FenObj.toybox,  Settings.BoxPosition.size, Settings.BoxPosition.center_x, Settings.BoxPosition.center_y)

        //Hide it behind a curtain
        ItemObjects.curtain = new Curtain(ItemLayerObj.Plus2,Settings.BoxPosition.center_x, Settings.BoxPosition.center_y, 2* Settings.BoxPosition.size, FenObj.region )

        //Setting the text. This depends on whether this is a trial with a box or not
        Interface.Prompt.show_message("Which box has " + FenObj.name+ "'s toy?")

        //Find all items. Ensure that the correct toy is in there.
        // If no distrator items are included in the additional information, then just use the correc item
        let AllBoxOptions = [FenObj.toybox]
        if(typeof OptionalAdditionalInformation.Distractor_Toyboxes !== undefined){
            AllBoxOptions = AllBoxOptions.concat(OptionalAdditionalInformation.Distractor_Toyboxes)
        }
        AllBoxOptions = [... new Set(AllBoxOptions)]

        //Now we need to transform these options into an array. Each element should have a name and an SVG
        let Arr = []
        for(let boxnum = 0; boxnum < AllBoxOptions.length; boxnum++){
            //Getting the correct SVG. Here we need the FRONT and the LID (added in that order
            let SVG = create_SVG_group(0,0,undefined,undefined,undefined,undefined,undefined)
            let Front = document.getElementById("box_" + AllBoxOptions[boxnum] + "_front").cloneNode(true);
            let Lid = document.getElementById("box_" + AllBoxOptions[boxnum] + "_lid").cloneNode(true);
            Front.style.display = "inherit"
            Lid.style.display = "inherit"
            SVG.appendChild(Front)
            SVG.appendChild(Lid)
            SVG.style.display = "inherit"
            Arr.push({name: AllBoxOptions[boxnum], SVG: SVG})
        }

        //Shuffling the options
        Arr = shuffleArray(Arr)

        //Creating the itembar
        Settings.QuestionBar.backgroundcolor = GenParam.RegionData[FenObj.region].lighter_color
        ItemObjects.questionbar = new QuestionBar(ItemLayerObj.Partner, Arr, Settings.QuestionBar,FenObj.bonus_stars_earnable, that.box_question_answered)

        //Creating a new Questions object.
        register_start_new_question("box", AllBoxOptions)

    }
    this.box_question_answered = function(answer){
        //Record the answer
        record_current_question_partial_answer(answer)

        //Collapse the bar
        ItemObjects.questionbar.collapse_bar()

        //Check the answer
        if(answer === FenObj.toybox){
            //Store the Question data
            record_current_question_answer(undefined,true)
            Interface.Prompt.show_message("Correct!")
            AudioCont.play_sound_effect("success")
            ItemObjects.curtain.reveal(function(){
                start_next_interaction_step()
                ItemObjects.curtain.remove()
                delete ItemObjects.curtain
            })

            setTimeout(function(){
                //start_next_interaction_step()

                ItemObjects.questionbar.remove()
                delete ItemObjects.questionbar
            },Math.max(Settings.step_speed, 500))

        }else{
            Interface.Prompt.show_message("Oops! Thats the wrong box")
            AudioCont.play_sound_effect("rejected")
            setTimeout(function(){
                //If the answer is not correct, remove the wrong answer and re-expand
                ItemObjects.questionbar.remove_element(answer)
                ItemObjects.questionbar.expand_bar()
            },Math.max(Settings.step_speed, 500))

        }


    }

    this.backpack_box_opened = function(){
        //Blur the backpack, reveal the box
        ItemObjects.backpack.setblur(1)
        setTimeout(function(){
            show_box(false)
        }, 500)


    }
    function play_with_toy(){
        // Make sure that the focus is on the Fennimal
        FennimalSVGObj.style.filter = ""
        //If theres is not toy object yet, then create a toy on top of the Fennimal
        if(typeof ItemObjects.toy === "undefined" ){

            ItemObjects.toy = new Toy(ItemLayerObj.Main,ItemLayerObj.Neg1, FenObj.toy, FennimalBaseHandCoords.x, FennimalBaseHandCoords.y, false )
            Interface.Prompt.show_message(FenObj.name + " brought a " + FenObj.toy + " to play with")
        }

        //If there is a toy present, then check if it needs to be removed from the box
        if(toy_box_retrieval_type === "retrieve"){
            show_Fennimal_retrieve_toy_from_box()
        }else{
            setTimeout(function(){
                show_play_with_toy_then_continue()
            },Settings.step_speed)
        }


    }

    function show_play_with_toy_then_continue(){
        //The toy is already in-hand, and the Fennimal can play with it
        //After a brief delay, show the toy playing animation
        Interface.Prompt.show_message(FenObj.name + " loves to play with the " + FenObj.toy)
        ItemObjects.toy.animate_play()

        //Then finish the interation
        setTimeout(function(){start_next_interaction_step()},4000)
    }

    function show_box(highligh_outline){
        Interface.Prompt.show_message("You place the " +  GenParam.get_box_printed_name(FenObj.toybox) + " on the ground...")
        ItemObjects.box = new Box(ItemLayerObj, FenObj.toybox,  Settings.BoxPosition.size, Settings.BoxPosition.center_x, Settings.BoxPosition.center_y)

        FennimalSVGObj.style.filter = "blur(4px)"

        AudioCont.play_sound_effect("thumb")

        if(highligh_outline){
            ItemObjects.box.highlight_outline()
        }

        setTimeout(function () {
            start_next_interaction_step()
        }, Math.max(500, Settings.step_speed))
    }
    function show_box_not_focus(){
        //We draw a smaller version of the box behind the Fennimal. This box does not have any possible interaction functions.
        let BoxGroup = create_SVG_group(0,0,undefined,undefined);
        BackgroundLayer.appendChild(BoxGroup)
        let BoxObj = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + FenObj.toybox), BoxGroup, 0.40 * GenParam.SVG_width,0.72 * GenParam.SVG_height, 3.5 )
        BoxObj.style.filter = "blur(5px)"
    }

    function request_participant_to_open_box(){
        Interface.Prompt.show_message("Click to open the " +  GenParam.get_box_printed_name(FenObj.toybox))
        AudioCont.play_sound_effect("alert_minor")
        ItemObjects.box.highlight_outline()
        ItemObjects.box.set_clicked_event(that.box_has_been_opened)
    }
    this.box_has_been_opened = function(){
        AudioCont.play_sound_effect("box_open_" + FenObj.toybox)
        Interface.Prompt.hide()
        ItemObjects.box.open()
        ItemObjects.box.set_clicked_event(undefined)
        ItemObjects.box.stop_highlight_outline()

        //Check if we need to place an item in the box. This depends on the type of trial we have here
        switch(toy_box_retrieval_type){
            case("empty"):
                break
            case("swap"):
                ItemObjects.swapped_toy = new Toy(ItemLayerObj.Main,ItemLayerObj.Neg1, WorldState.get_toybox_contents(FenObj.toybox), Settings.BoxPosition.center_x, Settings.BoxPosition.center_y , false)
                break
            case("retrieve"):
                ItemObjects.toy = new Toy(ItemLayerObj.Main,ItemLayerObj.Neg1, WorldState.get_toybox_contents(FenObj.toybox), Settings.BoxPosition.center_x, Settings.BoxPosition.center_y , false)
                break
        }

        setTimeout(function () {
            reveal_box_contents()
        }, 500)
    }

    function request_participant_to_close_box(){
        ItemObjects.box.highlight_outline()
        Interface.Prompt.show_message("Click to close the " +  GenParam.get_box_printed_name(FenObj.toybox))
        AudioCont.play_sound_effect("alert_minor")
        ItemObjects.box.set_clicked_event(that.box_has_been_closed)
    }
    this.box_has_been_closed = function(){
        AudioCont.play_sound_effect("box_open_" + FenObj.toybox)
        Interface.Prompt.hide()
        ItemObjects.box.close()
        ItemObjects.box.set_clicked_event(undefined)
        ItemObjects.box.stop_highlight_outline()
        setTimeout(function () {
            start_next_interaction_step()
        }, Settings.step_speed)
    }

    function reveal_box_contents(){
        switch(toy_box_retrieval_type){
            case("empty"):
                Interface.Prompt.show_message("The " + GenParam.get_box_printed_name(FenObj.toybox) + " is empty...")
                break
            case("swap"):
                Interface.Prompt.show_message("The " +  GenParam.get_box_printed_name(FenObj.toybox) + " contains a " +  WorldState.get_toybox_contents(FenObj.toybox))
                break
            case("retrieve"):
                Interface.Prompt.show_message("The " +  GenParam.get_box_printed_name(FenObj.toybox) + " contains a " +  WorldState.get_toybox_contents(FenObj.toybox))
                break
        }

        setTimeout(function () {
            if(toy_box_retrieval_type === "swap" || toy_box_retrieval_type === "empty"){ ItemObjects.box.setblur(2)}
            if(toy_box_retrieval_type === "swap"){ItemObjects.swapped_toy.setblur(2)}
            start_next_interaction_step()
        },  1.5 * Settings.step_speed)



    }

    function show_Fennimal_retrieve_toy_from_box(){
        Interface.Prompt.show_message(FenObj.name + " takes the " + FenObj.toy + " from the " +  GenParam.get_box_printed_name(FenObj.toybox))

        //Move the Fennimal over to the box
        let movement_x = (Settings.BoxPosition.center_x - getSVGInternalCenter(FennimalSVGObj).x) - 100
        animate_Fennimal_moving_to_relative_position(movement_x,0,400)

        //Animate picking up the toy
        setTimeout(function () {
            ItemObjects.toy.animate_move_relative(0,-300,400)
            setTimeout(function(){
                animate_Fennimal_returning_to_base_position(400)
                ItemObjects.toy.animate_move_to_position(FennimalBaseHandCoords.x, FennimalBaseHandCoords.y,500)
                setTimeout(function(){
                    ItemObjects.box.setblur(2)
                    show_play_with_toy_then_continue()
                },400)
            },500)
        }, 500)
    }

    function place_toy_in_box(){
        //First show the Fennimal and the toy moving to the box position
        ItemObjects.toy.stop_play()
        Interface.Prompt.hide()
        ItemObjects.box.setblur(0)

        let movement_x = (Settings.BoxPosition.center_x - getSVGInternalCenter(FennimalSVGObj).x) - 350
        let animation_duration = 650
        animate_Fennimal_moving_to_relative_position(movement_x,0,animation_duration)
        ItemObjects.toy.animate_move_relative(movement_x,0,animation_duration)

        //Update the partners beliefs (but only if present)
        if(partner_is_present){
            WorldState.change_partner_belief_in_box_contents(FenObj.toybox, FenObj.toy)
        }

        //What happens here depends on the type of interaction with the box
        setTimeout(function () {
            if(toy_box_retrieval_type === "swap"){
                remove_swapped_toy_from_box()
            }else{
                toy_goes_into_box()
            }
        },animation_duration + 200)

    }
    function remove_swapped_toy_from_box(){
        Interface.Prompt.show_message(FenObj.name + " throws the " + WorldState.get_toybox_contents(FenObj.toybox) + " out of the " +  GenParam.get_box_printed_name(FenObj.toybox))

        //Show the toy being thrown out of the box
        ItemObjects.swapped_toy.setblur(0)
        setTimeout(function () {
            ItemObjects.swapped_toy.discard()
            setTimeout(function(){
                toy_goes_into_box()
            },2500)
        }, 500)


    }
    function toy_goes_into_box(){
        Interface.Prompt.show_message(FenObj.name + " places the " + FenObj.toy + " in the " +  GenParam.get_box_printed_name(FenObj.toybox))
        //Move the toy up and the Fennimal slightly to the right
        animate_Fennimal_moving_to_relative_position(100,0,800)
        ItemObjects.toy.animate_move_relative(10,-350,800)

        //Then lower the toy into the box
        setTimeout(function () {
            ItemObjects.toy.animate_move_to_position(Settings.BoxPosition.center_x,Settings.BoxPosition.center_y , 500)

            setTimeout(function(){AudioCont.play_sound_effect("thumb")},350)

            setTimeout(function(){
                //Then move the Fennimal back to its original position
                animate_Fennimal_returning_to_base_position(800)
                WorldState.change_toybox_contents(FenObj.toybox, FenObj.toy)
                setTimeout(function(){
                    start_next_interaction_step()
                },1000)
            },1000)
        },800)


    }

    function take_box_away(){
        Interface.Prompt.show_message("You return the " +  GenParam.get_box_printed_name(FenObj.toybox) + " to your backpack")

        //Remove the toy(s)
        ItemObjects.toy.fade_opacity(0,250)
        if(typeof ItemObjects.swapped_toy !== "undefined" ){
            ItemObjects.swapped_toy.fade_opacity(0,250)
        }

        //Animate the box down
        ItemObjects.box.animate_move_relative(0,600,1000)
        ItemObjects.box.set_all_SVG_transitions(1000)
        ItemObjects.box.setblur(0)

        if(typeof ItemObjects.backpack !== "undefined"){
            setTimeout(function () {
                ItemObjects.backpack.close(true)
                ItemObjects.backpack.setblur(0)
                setTimeout(function(){
                    start_next_interaction_step()
                }, Math.max(1000, 0.5*Settings.step_speed))
            }, 350)
        }else{
            setTimeout(function () {
                start_next_interaction_step()
            }, Math.max(1000, 0.5*Settings.step_speed))
        }








    }

    //LOST AND FOUND AND ALTERNATE TOY //
    ////////////////////
    function show_lost_and_found_button(){
        //Showing the button
        ItemObjects.lost_and_found_button = create_SVG_buttonElement(0.5*GenParam.SVG_width, 0.9 * GenParam.SVG_height, 0.4 * GenParam.SVG_width, 0.1 * GenParam.SVG_height, "Go to the lost & found", 50)
        ItemLayerObj.Plus2.appendChild(ItemObjects.lost_and_found_button)
        ItemObjects.lost_and_found_button.onpointerdown = function(){
            AudioCont.play_sound_effect("button_click")
            ItemObjects.lost_and_found_button.remove()
            delete ItemObjects.lost_and_found_button

            let qtext
            switch(FenObj.interaction_type){
                case("lost_hat"): qtext = "Do you see " + FenObj.name + "'s hat in the lost and found?"
                    break
                case("lost_toy"): qtext = "Do you see " + FenObj.name + "'s favorite toy in the lost and found?"
                    break
            }
            new HomeRoomController("lost_found", ParentLayer, WorldState.get_all_items_in_lost_and_found_array(), qtext, FenObj.hat, FenObj.region, FenObj.location, hat_retrieved_from_lost_and_found )
        }
    }
    function hat_retrieved_from_lost_and_found(){
        //Show the hat on the screen
        ItemObjects.hat = {}
        ItemObjects.hat.group = create_SVG_group(0,0)
        ItemLayerObj.Plus2.append(ItemObjects.hat.group)
        ItemObjects.hat.svg = copy_scale_and_move_object_to_position(document.getElementById("hat_" + FenObj.hat), ItemObjects.hat.group, 0.7 * GenParam.SVG_width, 0.8 * GenParam.SVG_height, 4, "dragging_hat")

        Interface.Prompt.show_message("Hand the " + FenObj.hat + " to " + FenObj.name)

        //Remove from the lost and found
        WorldState.remove_item_from_lost_and_found(FenObj.hat)

        //Make it draggable
        new SingleDraggableObject(ItemLayerObj.Plus2,ItemObjects.hat.group, "drag_to_Fennimal", FennimalSVGObj.getElementsByClassName("Fennimal_head_hat_point")[0], hat_handed_to_Fennimal)
    }
    function hat_handed_to_Fennimal(){
        AudioCont.play_sound_effect("positive")
        Interface.Prompt.show_message(FenObj.name + " is very grateful that you found the hat!")
        FennimalSVGObj.getElementsByClassName("hat")[0].style.transition = "all 750ms ease-in-out"
        FennimalSVGObj.getElementsByClassName("hat")[0].style.opacity = 1

        let number_of_hearts = 10
        let heart_start_coords = getSVGInternalCenter(FennimalSVGObj)

        setTimeout(function () {
            for(let i = 0; i < number_of_hearts; i++){
                let x_delta = randomIntFromInterval(-400,400)
                let y_delta = randomIntFromInterval(-750,-500)
                new SmallFeedbackSymbol(ItemLayerObj.Plus2,"heart",2000, heart_start_coords.x, heart_start_coords.y, heart_start_coords.x+ x_delta, heart_start_coords.y + y_delta)
            }
        }, 1000)


        setTimeout(function () {
            Interface.Prompt.hide()
            start_next_interaction_step()
        }, 3500)
    }

    function show_Fennimal_bored(){
        Interface.Prompt.show_message( FenObj.name + " has gotten a bit bored and would like to play with a different, but similar, toy")
        AudioCont.play_sound_effect("sad")

        //Animate Z's
        let ZGenerator = setInterval(function(){
            let x_delta = randomIntFromInterval(-1000,200)
            let y_delta = randomIntFromInterval(-950,-500)
            let heart_start_coords = getSVGInternalCenter(FennimalSVGObj.getElementsByClassName("Fennimal_head_mouth_point")[0])
            new SmallFeedbackSymbol( ItemLayerObj.Plus2,"bored",2000, heart_start_coords.x, heart_start_coords.y, heart_start_coords.x+ x_delta, heart_start_coords.y + y_delta)
        }, 0.5 *Settings.step_speed)

        //After a brief timeout, show the new message and the button
        setTimeout(function () {
            Interface.Prompt.show_message( "Let's go to the Toy Room to see if we can find something for " + FenObj.name + " to play with")

            //Showing the button
            ItemObjects.toy_room_button = create_SVG_buttonElement(0.5*GenParam.SVG_width, 0.9 * GenParam.SVG_height, 0.4 * GenParam.SVG_width, 0.1 * GenParam.SVG_height, "Go to the toy room", 50)
            ItemLayerObj.Plus2.appendChild(ItemObjects.toy_room_button)
            ItemObjects.toy_room_button.onpointerdown = function(){
                AudioCont.play_sound_effect("button_click")
                ItemObjects.toy_room_button.remove()
                delete ItemObjects.toy_room_button
                clearInterval(ZGenerator)

                let qtext = "Which of these is similar to " + FenObj.name + "'s previous toy?"
                new HomeRoomController("toy_room",ParentLayer,WorldState.get_all_items_in_toy_room_array(), qtext, FenObj.toy, FenObj.region, FenObj.location, new_toy_selected_from_toy_room )
            }

        },2*Settings.step_speed)

    }
    function new_toy_selected_from_toy_room(){
        //Show the hat on the screen
        ItemObjects.newtoy = {}
        ItemObjects.newtoy.group = create_SVG_group(0,0)
        ItemLayerObj.Plus2.append(ItemObjects.newtoy.group)
        ItemObjects.newtoy.svg = copy_scale_and_move_object_to_position(document.getElementById("toy_" + FenObj.toy), ItemObjects.newtoy.group, 0.7 * GenParam.SVG_width, 0.8 * GenParam.SVG_height, 5, "dragging_newtoy")
        set_toy_color_scheme(ItemObjects.newtoy.svg, FenObj.toy, true)

        Interface.Prompt.show_message("Hand the new " + FenObj.toy + " to " + FenObj.name)

        //Remove from the room
        WorldState.remove_item_from_toy_room(FenObj.toy)

        //Make it draggable
        new SingleDraggableObject(ItemLayerObj.Plus2,ItemObjects.newtoy.group, "drag_to_Fennimal", FennimalSVGObj, new_toy_handed_to_Fennimal, 200)
    }
    function new_toy_handed_to_Fennimal(){
        Interface.Prompt.hide()

        //Create a new interactive toy on top of the Fennimal
        ItemObjects.toy = new Toy(ItemLayerObj.Main,ItemLayerObj.Neg1, FenObj.toy, FennimalBaseHandCoords.x, FennimalBaseHandCoords.y, true )

        setTimeout(function(){
            AudioCont.play_sound_effect("positive")
            Interface.Prompt.show_message(FenObj.name + " also loves to play with this different " + FenObj.toy)
            ItemObjects.toy.animate_play()
        }, 0.5 * Settings.step_speed)

        setTimeout(function(){
            start_next_interaction_step()
        }, 0.5*Settings.step_speed + 3000)



    }

    // VARIOUS ORTHOGONAL TASKS
    function play_hide_and_seek(){
        //First we hide the Fennimal somehwere on the screen, and give it an event listener
        Interface.Prompt.show_message(FenObj.name + " is playing hide and seek!")
        let xmin = 0.1 * GenParam.SVG_width
        let xmax = 0.7 * GenParam.SVG_width
        let ypos = 0.575 * GenParam.SVG_height

        let site_positions = shuffleArray([0.2 * GenParam.SVG_width,0.4 * GenParam.SVG_width,0.6 * GenParam.SVG_width,0.8 * GenParam.SVG_width])

        let xpos =  shuffleArray(JSON.parse(JSON.stringify(site_positions)))[0]

        let size = 1.5
        let max_height = 0.4 * GenParam.SVG_height
        let max_width = 0.3 * GenParam.SVG_width
        draw_Fennimal_on_screen(xpos, ypos, size , max_width, max_height)

        //Adding interaction elements
        let HideAndSeekObjects = [new HideAndSeekObject(ItemLayerObj.Plus2, "curtain", site_positions[0], ypos + 0.05 * GenParam.SVG_height, 4.5, FenObj.region),
            new HideAndSeekObject(ItemLayerObj.Plus1, "barrel", site_positions[2], ypos, 4.5, FenObj.region),
            new HideAndSeekObject(ItemLayerObj.Plus2, "barrel", site_positions[3], ypos + 100, 4, FenObj.region),
            new HideAndSeekObject(ItemLayerObj.Plus2, "balloon", site_positions[1], ypos + 0.05 * GenParam.SVG_height, 4.5, FenObj.region)]

        //After a brief delay, show a new message
        setTimeout(function(){
            Interface.Prompt.show_message("Can you find " + FenObj.name + "?")
            //Now we set an event listener to the Fennimal - but this only counts if the mouse click is sufficiently close to its central mass
            FennimalSVGObj.style.cursor = "pointer"
            let FennimalCenterPoint = getSVGInternalCenter(FennimalSVGObj)
            FennimalSVGObj.onpointerdown = function(event) {
                let mouse_center = getMousePosition(event)
                let dist_to_center = EUDistPoints(FennimalCenterPoint, mouse_center)
                if(dist_to_center< 100){
                    FennimalSVGObj.onpointerdown = ""

                    //Fennimal has been found: clean up all the objects and continue onwards
                    for(let i in HideAndSeekObjects){
                        setTimeout(function(){
                            HideAndSeekObjects[i].remove()
                        }, i * 200)
                    }

                    setTimeout(function(){
                        AudioCont.play_sound_effect("success")
                        Interface.Prompt.show_message("You found " + FenObj.name + "!")
                        //Animate the Fennimal to the front
                        let NewGroup = create_SVG_group(0,0)
                        let ScaleGroup = create_SVG_group(0,0)

                        FennimalSVGObj.parentNode.appendChild(NewGroup)
                        NewGroup.appendChild(ScaleGroup)
                        ScaleGroup.appendChild(FennimalSVGObj)

                        NewGroup.style.transition = "all 750ms ease-in-out"
                        ScaleGroup.style.transition = "all 750ms ease-in-out"

                        let FennimalPos = getSVGInternalCenter(FennimalSVGObj)
                        let dx =   (0.45 * GenParam.SVG_width) - FennimalPos.x
                        ScaleGroup.style.transform = "scale(1.8)"
                        ScaleGroup.style.transformOrigin = "50% 50%"
                        NewGroup.style.transform = "translate(" + dx + "px, " + (- 0.15 * GenParam.SVG_height) + "px) ";

                        //Show some hearts
                        let HGenerator = setInterval(function(){
                            let x_delta = randomIntFromInterval(-1000,200)
                            let y_delta = randomIntFromInterval(-950,-500)
                            let heart_start_coords = getSVGInternalCenter(FennimalSVGObj.getElementsByClassName("Fennimal_head_mouth_point")[0])
                            heart_start_coords.x += randomIntFromInterval(-200,200)
                            heart_start_coords.y += randomIntFromInterval(-200,200)
                            new SmallFeedbackSymbol( ItemLayerObj.Plus2,"heart",2000, heart_start_coords.x, heart_start_coords.y, heart_start_coords.x+ x_delta, heart_start_coords.y + y_delta)
                        }, 250)

                        //Set an interval to continue
                        setTimeout(function(){
                            clearInterval(HGenerator)
                            start_next_interaction_step()
                        }, 3000)


                    }, 750)


                }

            }
        }, 1500)


    }

    function play_find_box_task(){
        console.log(PartnerIcon)
        let PartIcon = false
        if(partner_is_present){PartIcon = PartnerIcon}
        let BoxTask = new FindBoxTaskController(ItemLayerObj, FenObj,PartIcon, that.external_task_completed)
        Clean_Up_Steps.push({type: "clear_task", target: BoxTask})
    }

    function play_reach_hat_task(){
        let PartIcon = false
        if(partner_is_present){PartIcon = PartnerIcon}
        let ReachHatTask = new ReachHatTaskController(ItemLayerObj, FenObj,PartIcon, that.external_task_completed)
        Clean_Up_Steps.push({type: "clear_task", target: ReachHatTask})
    }

    function play_fly_swatting_task(){
        let PartIcon = false
        if(partner_is_present){PartIcon = PartnerIcon}
        let FlySwattingTask = new FlySwatController(ItemLayerObj, FenObj, PartIcon, that.external_task_completed)
        Clean_Up_Steps.push({type: "clear_task", target: FlySwattingTask})
    }

    function show_basic_intro_toybox_trial(){
        let PartIcon = false
        if(partner_is_present){PartIcon = PartnerIcon}
        let BasicIntroToyboxTask = new BasicIntroToyboxController(ItemLayerObj, FenObj, PartIcon, that.external_task_completed)
        //let InteractionController = new FennimalTrialController(ParentLayer, FenObj, partner_is_present,that.external_task_completed)
        //Clean_Up_Steps.push({type: "clear_task", target: BasicIntroToyboxTask})
    }

    this.external_task_completed = function(){
        start_next_interaction_step()
    }

    //FUNCTIONS FOR THE ASK_X QUESTIONS
    //////////////////////////////////////
    function show_Fennimal_and_box(){
        //Draw the Fennimal on the left
        fade_and_appear_Fennimal_left(true, false, false)

        //Move the Fennimal over to make some space
        animate_Fennimal_moving_to_relative_position(-100,0,500)

        //Draw the box in the middle after a brief introduction
        setTimeout(function(){
            open_backpack_box(0.5)
            Settings.BoxPosition.center_x = 0.5 * GenParam.SVG_width
        }, Settings.step_speed)
    }
    function ask_belief_partner(){
        //Set focus to partner
        PartnerIcon.style.filter = ""
        ItemObjects.box.stop_highlight_outline()
        ItemObjects.backpack.remove()
        FennimalSVGObj.style.filter = ""

        //Animate the partner to move to the box.
        if(typeof WorldState.get_partner_icon_settings().name !== "undefined"){
            if(WorldState.get_partner_icon_settings().name !== false){
                Interface.Prompt.show_message(WorldState.get_partner_icon_settings().name + " moves to open the box ...")
            }else{
                Interface.Prompt.show_message("Your partner moves to open the box ...")
            }
        }

        PartnerTranslateGroup.style.transition = "all 750ms ease-in-out"
        moveSVGCenterTo(PartnerTranslateGroup, 0.7 * GenParam.SVG_width, 0.5 * GenParam.SVG_height)

        //After a brief delay, show the question
        setTimeout(function(){
            //Setting the text
            if(typeof WorldState.get_partner_icon_settings().name !== "undefined"){
                if(WorldState.get_partner_icon_settings().name !== false){
                    Interface.Prompt.show_message("What toy does " + WorldState.get_partner_icon_settings().name.toUpperCase() + "  think is currently in the " +  GenParam.get_box_printed_name(FenObj.toybox) + "?")
                }else{
                    Interface.Prompt.show_message("What toy does your PARTNER think is currently in the " +  GenParam.get_box_printed_name(FenObj.toybox) + "?")
                }
            }

            //Highlight the box
            ItemObjects.box.highlight_outline()

            //Creating the bubble
            ItemObjects.questionbubble = new QuestionBubble(ItemLayerObj.Partner, 0.485*GenParam.SVG_width, 0.275 * GenParam.SVG_height, false)

            //Then offer the questionbar
            setTimeout(function(){
                Settings.QuestionBar.backgroundcolor = "gold"//"#faf8eb"
                ItemObjects.questionbar = new QuestionBar(ItemLayerObj.Partner, get_array_of_toys_for_question(true), Settings.QuestionBar,FenObj.bonus_stars_earnable, that.question_partner_belief_answered)

                //Creating a new Questions object.
                register_start_new_question("partner_belief_box", OptionalAdditionalInformation.Distractor_Toys)

            },Math.max(1200, 1.5 * Settings.step_speed))


        },Math.max(1200, 1.5 * Settings.step_speed))


    }
    this.question_partner_belief_answered = function(answer){
        //TODO: this should refer to the actual beliefs of the partner!

        //Collapse the bar
        ItemObjects.questionbar.collapse_bar()

        let answer_correct = answer === WorldState.get_partner_belief_in_box_contents(FenObj.toybox)

        //Recording the answer
        record_current_question_answer(answer, answer_correct)

        if(FenObj.bonus_stars_earnable > 0){
            if(answer_correct){
                FenObj.bonus_stars_earned = FenObj.bonus_stars_earnable
            }else{
                FenObj.bonus_stars_earned = false
            }

        }


        //Next step
        start_next_interaction_step()
    }

    function get_array_of_toys_for_question(shuffle){
        let Arr = []
        for(let toynum = 0; toynum < OptionalAdditionalInformation.Distractor_Toys.length; toynum++){
        //Getting the correct SVG
        let SVG =  document.getElementById("toy_" + OptionalAdditionalInformation.Distractor_Toys[toynum]).cloneNode(true);

        let LightElem = SVG.getElementsByClassName("item_col_light")
        for(let i =0;i<LightElem.length;i++){
            LightElem[i].style.fill = GenParam.ToyData[OptionalAdditionalInformation.Distractor_Toys[toynum]].ColorScheme.light_color
        }

        let DarkElem = SVG.getElementsByClassName("item_col_dark")
        for(let i =0;i<DarkElem.length;i++){
            DarkElem[i].style.fill = GenParam.ToyData[OptionalAdditionalInformation.Distractor_Toys[toynum]].ColorScheme.dark_color
        }
        SVG.style.display = "inherit"
        Arr.push({name: OptionalAdditionalInformation.Distractor_Toys[toynum], SVG: SVG})
    }
        if(shuffle){
            return(shuffleArray(Arr))
        }else{
            return(Arr)
        }
    }

    function ask_contents_box(){
        //Note that these questions are slightly different than the "normal" question of toys above.
        //  Here we specifically ask for which toy is in the box (no checks for whether or not there is a box - its assumed here)
        //  We also include a question mark, and award a star for a correct answer.

        //Move the box up a bit to center it
        Interface.Prompt.hide()
        ItemObjects.box.animate_move_relative(0, - 0.15 * GenParam.SVG_height, 500)


        setTimeout(function(){
            //Show the question-mark
            ItemObjects.questionbubble = new QuestionBubble(ItemLayerObj.Partner, 0.5*GenParam.SVG_width, 0.5 * GenParam.SVG_height, true)

            //Ask the question
            Interface.Prompt.show_message("What toy is currently in the " +  GenParam.get_box_printed_name(FenObj.toybox) + "?")

            Settings.QuestionBar.backgroundcolor = "gold"//"#faf8eb"
            ItemObjects.questionbar = new QuestionBar(ItemLayerObj.Partner, get_array_of_toys_for_question(true), Settings.QuestionBar,FenObj.bonus_stars_earnable, that.question_contents_box_answered)

            //Creating a new Questions object.
            register_start_new_question("partner_belief_box", OptionalAdditionalInformation.Distractor_Toys)

        }, 400)

    }
    this.question_contents_box_answered = function(answer){
        //Collapse the bar
        ItemObjects.questionbar.collapse_bar()

        let answer_correct = answer === WorldState.get_toybox_contents(FenObj.toybox)

        //Recording the answer
        record_current_question_answer(answer, answer_correct)

        if(FenObj.bonus_stars_earnable > 0){
            FenObj.bonus_stars_earned = answer_correct
        }

        //Next step
        start_next_interaction_step()

    }

    function ask_Fennimal_toy(){
        //Show the question mark
        Interface.Prompt.hide()

        //Show the question-mark
        ItemObjects.questionbubble = new QuestionBubble(ItemLayerObj.Partner, FennimalBaseHandCoords.x, FennimalBaseHandCoords.y-200, true)

        //Ask the question
        Interface.Prompt.show_message("What toy did you previously see " + FenObj.name + " play with?")

        Settings.QuestionBar.backgroundcolor = "gold"
        ItemObjects.questionbar = new QuestionBar(ItemLayerObj.Partner, get_array_of_toys_for_question(true), Settings.QuestionBar,FenObj.bonus_stars_earnable, that.question_Fennimal_toy_answered)

        //Creating a new Questions object.
        register_start_new_question("Fennimal_toy", OptionalAdditionalInformation.Distractor_Toys)



    }
    this.question_Fennimal_toy_answered = function(answer){
        //Collapse the bar
        ItemObjects.questionbar.collapse_bar()

        let answer_correct = answer === FenObj.toy

        //Recording the answer
        record_current_question_answer(answer, answer_correct)

        if(FenObj.bonus_stars_earnable > 0){
            FenObj.bonus_stars_earned = FenObj.bonus_stars_earnable
        }

        //Next step
        start_next_interaction_step()

    }

    function register_start_new_question(type, options){
        CurrentQuestion = {
            type: type,
            t_start: Date.now(),
            options: JSON.parse(JSON.stringify(options)),
            ans: [],
        }

    }
    function record_current_question_partial_answer(ans){
        CurrentQuestion.ans.push(ans)
    }
    function record_current_question_answer(answer, is_correct){
        if(answer !== undefined){CurrentQuestion.ans = answer}
        CurrentQuestion.time = Date.now() - CurrentQuestion.t_start
        CurrentQuestion.correct = is_correct
        delete CurrentQuestion.t_start
        AllQuestionsAsked.push(JSON.parse(JSON.stringify(CurrentQuestion)))
        CurrentQuestion = undefined
    }

    //INITIALIZATION
    //////////////////
    ParentLayer.style.display = "inherit"
    Interface.Prompt.hide()
    create_opacity_mask()
    create_SVG_layers()

    //At the start of the interaction, check if there is a partner present.
    check_for_partner_presence()

    //Check if there is a toybox present. If the Fennimal object has a toybox AND the trial type does not include a specific interaction with the box, then display it on the side
    check_for_toybox_presence()

    //If a toybox is defined, store which toy is currently in the box. We will store this as an object with two values: start and end
    if(typeof FenObj.toybox !== 'undefined'){
        FenObj.toy_in_box =  {start: WorldState.get_toybox_contents(FenObj.toybox)}
    }

}

//Subcontrollers for various simple items
FoodBag = function(ParentElem, flavor, start_x, start_y, base_x, base_y, FenCont){
    let that = this
    let bagcolor, bag_ready = false, DragStartPos
    //On initalization, create the correct food bag, copy it to the parent elem (at the start coords), then move it to the base coors
    function get_foodbag_svg(){
        //Copying the raw svg (contains all flavors)
        let Raw = document.getElementById("foodbag").cloneNode(true);

        //Deleting the elements beloning to the incorrect flavors
        let AllFlavors = Raw.getElementsByClassName("foodbag_flavor")
        let ElementsToDelete = []
        let TargetFlavorElem
        for(let i = 0; i < AllFlavors.length; i++){
            if(AllFlavors[i].id.split("_")[2] === flavor){
                TargetFlavorElem = AllFlavors[i]
                TargetFlavorElem.style.display = "inherit"
            }else{
                ElementsToDelete.push(AllFlavors[i])
            }
        }
        for(let i = 0; i < ElementsToDelete.length; i++){
            ElementsToDelete[i].remove()
        }

        //Finding the correct bag color
        bagcolor = TargetFlavorElem.getAttribute("fill")
        if(bagcolor === null){
            bagcolor = TargetFlavorElem.children[0].getAttribute("fill")
        }

        //Setting correct bag color
        let AllBagColorElems = Raw.getElementsByClassName("foodbag_color")
        for(let i = 0; i < AllBagColorElems.length; i++){
            AllBagColorElems[i].style.fill = bagcolor
        }

        Raw.style.display = "inherit"
        Raw.style.cursor = "pointer"
        Raw.style.transition = "all 500ms ease-in-out"
        return(Raw)
    }

    let FoodBagSVG = get_foodbag_svg()
    let TranslationGroup = create_SVG_group(0,0,undefined,undefined);
    let RotationGroup = create_SVG_group(0,0,undefined,undefined);
    let DragTranslationGroup = create_SVG_group(0,0,undefined,undefined);
    let ScaleGroup = create_SVG_group(0,0,undefined,undefined);

    ScaleGroup.appendChild(FoodBagSVG)
    TranslationGroup.appendChild(ScaleGroup)
    RotationGroup.appendChild(TranslationGroup)
    DragTranslationGroup.appendChild(RotationGroup)
    ParentElem.appendChild(DragTranslationGroup);

    //On start, move the bag to the start position
    ScaleGroup.style.transform = "scale(4)"
    let Box = TranslationGroup.getBBox()
    let delta_x = start_x - (Box.x + 0.5 * Box.width)
    let delta_y = start_y - (Box.y + 0.5 * Box.height)
    TranslationGroup.style.transform = "translate(" + delta_x + "px ," + delta_y + "px)"

    //After a brief delay (to get everything settled), move the bag to the correct base position
    setTimeout(function(){
        delta_x = delta_x - (base_x - start_x)
        delta_y = delta_y + (base_y - start_y)
        TranslationGroup.style.transition = "all 500ms ease-in-out"
        TranslationGroup.style.transform = "translate(" + delta_x + "px ," + delta_y + "px)"

        //After a brief delay, the bag is ready
        setTimeout(function(){
            bag_ready_to_be_selected()
        },500)
    }, 50)

    function bag_ready_to_be_selected (){
        bag_ready = true
    }
    function bag_clicked(event){
        FoodBagSVG.style.transition = ""
        DragTranslationGroup.style.transition = ""
        DragStartPos = getMousePosition(event)
        TranslationGroup.style.transition = ""
        if(bag_ready){
            bag_ready = false
            FenCont.food_bag_picked_up(flavor)
        }
    }

    //Setting click event listener here
    FoodBagSVG.onpointerdown = function(event){bag_clicked(event)}

    //Call to have the bag follow the cursor

    //Call to have the bag return to its starting position (and no longer follow the cursor)

    this.highlight_outline = function(){
        FoodBagSVG.getElementsByClassName("item_outline")[0].classList.add("focus_on_SVG_outline")
    }
    this.stop_highlight_outline = function(){
        FoodBagSVG.getElementsByClassName("item_outline")[0].classList.remove("focus_on_SVG_outline")
    }

    this.fade_out = function(){
        that.stop_highlight_outline()
        bag_ready = false
        FoodBagSVG.style.opacity = 0
        TranslationGroup.style.transform = "translate(" + delta_x + "px ," + (delta_y + 500) + "px)"
    }
    this.reset_to_start = function(){
        DragTranslationGroup.style.transition = "all 500ms ease-in-out"
        FoodBagSVG.style.transition = "all 500ms ease-in-out"
        TranslationGroup.style.transition = "all 500ms ease-in-out"
        TranslationGroup.style.transform = "translate(" + delta_x + "px ," + delta_y + "px)"
        DragTranslationGroup.style.transform = ""
        FoodBagSVG.style.opacity = 1
        setTimeout(function(){bag_ready_to_be_selected()},500)
    }
    this.move_bag_to_coords = function(Coords){
        let new_delta_x =  Coords.x - DragStartPos.x
        let new_delta_y =  Coords.y - DragStartPos.y

        DragTranslationGroup.style.transform = "translate(" + new_delta_x + "px ," + new_delta_y + "px)"


    }
    this.remove = function(){
        DragTranslationGroup.remove()
    }
    this.open_in_bowl = function(BowlCenter){
        that.stop_highlight_outline()
        let Box = RotationGroup.getBBox()
        DragTranslationGroup.style.transition = "all 500ms ease-in-out"
        RotationGroup.style.transition = "all 500ms ease-in-out"
        RotationGroup.style.transformOrigin = (Box.x + 0.5*Box.width) + "px " + (Box.y + Box.height) + "px"


        that.move_bag_to_coords({x:BowlCenter.x + 150,y:BowlCenter.y-300})
        setTimeout(function(){
            RotationGroup.style.transform = "rotate(-90deg)"
            setTimeout(function(){
                RotationGroup.style.opacity = 0
            },250)
            setTimeout(function(){
                DragTranslationGroup.remove()
            },1000)
        }, 500)


    }

    this.get_flavor = function(){
        return(flavor)
    }



}
Foodbowl = function(ParentElem,FennimalSVG, center_x,center_y){
    let HeartGenerator
    //On creation, copy the foodbowl into the parent element and move it to the right location
    let BowlSVG = document.getElementById("foodbowl").cloneNode(true);
    let TranslationGroup = create_SVG_group(0,0,undefined,undefined);
    let ScaleGroup = create_SVG_group(0,0,undefined,undefined);

    ScaleGroup.appendChild(BowlSVG)
    TranslationGroup.appendChild(ScaleGroup)
    ParentElem.appendChild(TranslationGroup);

    BowlSVG.style.display = "inherit"
    ScaleGroup.style.transform = "scale(3)"

    let Box = TranslationGroup.getBBox()
    let delta_x = center_x - (Box.x + 0.5 * Box.width)
    let delta_y = center_y - (Box.y + 0.5 * Box.height)
    TranslationGroup.style.transform = "translate(" + delta_x + "px ," + delta_y + "px)"

    //On creation, the foodbowl is set to empty
    let AllFoodItems  = BowlSVG.getElementsByClassName("food")
    for(let i = 0; i < AllFoodItems.length; i++){
        AllFoodItems[i].style.display = "none"
    }

    //Interaction functions
    this.getSVG_center = function(){
        return(getSVGInternalCenter(BowlSVG))
    }

    this.highlight_outline = function(){
        let Outlines = BowlSVG.getElementsByClassName("item_outline")
        if(Outlines.length >0){
            for(let i=0; i<Outlines.length; i++){
                Outlines[i].classList.add("focus_on_SVG_outline")
            }
        }
    }
    this.stop_highlight_outline = function(){
        let Outlines = BowlSVG.getElementsByClassName("item_outline")
        if(Outlines.length >0){
            for(let i=0; i<Outlines.length; i++){
                Outlines[i].classList.remove("focus_on_SVG_outline")
            }
        }
    }

    this.setblur = function(x) {
        if(x === false || x === 0 || x === undefined || x === ""){
            BowlSVG.style.filter = "";
        }else{
            BowlSVG.style.filter = "blur(" + x + "px)";
        }

    }

    //Fills the bowl with food of a given flavor
    this.fill_with_food_and_eat = function(flavor){
        //Make the correct foodstuffs appear
        let CorrectFood = BowlSVG.getElementsByClassName(flavor)
        let FoodOrders = {}
        for(let i = 0; i < CorrectFood.length; i++){
            CorrectFood[i].style.display = "inherit"
            FoodOrders[CorrectFood[i].id.split("_")[2]] = CorrectFood[i]
        }
        FoodOrders = [FoodOrders.first,FoodOrders.second,FoodOrders.third]

        for(let i = 0; i < FoodOrders.length; i++){
            setTimeout(function(){
                animate_item_eaten(FoodOrders[i])
            }, 1000 + i * 400)
        }

    }

    function animate_item_eaten(Elem){
        Elem.style.transition = "all 500ms ease-in-out"
        let ElemCoords = getSVGInternalCenter(Elem)
        let MouthCoords = getSVGInternalCenter( FennimalSVG.getElementsByClassName("Fennimal_head_mouth_point")[0])
        let y_delta = Math.floor( (MouthCoords.y - ElemCoords.y) / 3)
        //Elem.style.transform = "translate(0,-110px)"
        Elem.style.transform = "translate(0," + y_delta + "px)"

        setTimeout(function(){
            Elem.style.transition = "all 100ms ease-in-out"
            Elem.style.opacity = 0
            AudioCont.play_sound_effect("chew")

            //Generating some hearts
            let number_of_hearts = 5
            let heart_start_coords = getSVGInternalCenter(Elem)
            for(let i = 0; i < number_of_hearts; i++){
                let x_delta = randomIntFromInterval(-400,400)
                let y_delta = randomIntFromInterval(-750,-500)

                let Heart = new SmallFeedbackSymbol(ParentElem,"heart",2000, heart_start_coords.x, heart_start_coords.y, heart_start_coords.x+ x_delta, heart_start_coords.y + y_delta)
            }

        },500)
    }

    this.remove = function(){
        BowlSVG.style.transition = "all 250ms ease-in"
        BowlSVG.style.opacity = 0
        setTimeout(function(){TranslationGroup.remove()
        }, 260)
    }

}
Backpack = function(ParentElem, center_x,center_y, openfunc, open_automatically){
    let that = this
    //On creation, copy the foodbowl into the parent element and move it to the right location
    let BackpackSVG = document.getElementById("backpack").cloneNode(true);
    let TranslationGroup = create_SVG_group(0,0,undefined,undefined);
    let ScaleGroup = create_SVG_group(0,0,undefined,undefined);

    ScaleGroup.appendChild(BackpackSVG)
    TranslationGroup.appendChild(ScaleGroup)
    ParentElem.appendChild(TranslationGroup);

    BackpackSVG.style.display = "inherit"
    ScaleGroup.style.transform = "scale(5)"

    let Box = TranslationGroup.getBBox()
    let delta_x = center_x - (Box.x + 0.5 * Box.width)
    let delta_y = center_y - (Box.y + 0.5 * Box.height)

    if( open_automatically){
        TranslationGroup.style.opacity = 0
    }else{
        setTimeout(function(){TranslationGroup.style.transition = "all 400ms ease-in"},100)
    }
    TranslationGroup.style.transform = "translate(" + delta_x + "px ," + delta_y + "px)"

    //Backpack is by default created closed
    let openstate = "closed"
    let Flap_open, Flap_closed, Flaps = BackpackSVG.getElementsByClassName("backpack_flap")
    for(let i =0;i<Flaps.length;i++){
        if(Flaps[i].id === "backpack_flap_closed") { Flap_closed = Flaps[i] }
        if(Flaps[i].id === "backpack_flap_open") { Flap_open = Flaps[i] }
    }
    Flap_open.style.display = "none"
    Flap_open.style.pointerEvents = "none"
    Flap_closed.style.pointerEvents = "none"

    //Interaction functions
    this.highlight_outline = function(){
        BackpackSVG.getElementsByClassName("item_outline")[0].classList.add("focus_on_SVG_outline")

    }
    this.stop_highlight_outline = function(){
        BackpackSVG.getElementsByClassName("item_outline")[0].classList.remove("focus_on_SVG_outline")
    }
    this.setblur = function(x) {
        if(x === false || x === 0 || x === undefined || x === ""){
            BackpackSVG.style.filter = "";
        }else{
            BackpackSVG.style.filter = "blur(" + x + "px)";
        }
    }
    this.getSVG_center = function(){
        return(getSVGInternalCenter(BackpackSVG))
    }
    this.fade_out = function(time){
        TranslationGroup.style.transition = "all " + time + " ease-in";
        TranslationGroup.style.opacity = 0
    }

    if(open_automatically){
        //Move the backpack down and then animate it going up and opening
        TranslationGroup.style.transform = "translate(" + delta_x + "px ," + (delta_y+200) + "px)"

        setTimeout(function(){
            TranslationGroup.style.transition = "all 200ms ease-in"
            TranslationGroup.style.opacity = 1


            setTimeout(function(){
                TranslationGroup.style.transition = "all 400ms ease-in"
                try_open_backpack()
            },200)
        },20)



    }else{
        AudioCont.play_sound_effect("alert_minor")
        Interface.Prompt.show_message("Click to open your backpack")
        this.highlight_outline()
        BackpackSVG.onclick = try_open_backpack
    }


    function try_open_backpack(){
        if(openstate === "closed"){
            //Opening the packpack (the Fennimalcontroller will know what to do
            //TODO: sound effect zipper here
            AudioCont.play_sound_effect("zipper")
            openstate = "open"
            Flap_open.style.display = "inherit"
            Flap_closed.style.display = "none"
            that.stop_highlight_outline()
            delta_y = delta_y + 350
            TranslationGroup.style.transform = "translate(" + delta_x + "px ," + delta_y + "px)"
            setTimeout(function(){openfunc()},100)
        }
    }
    this.close  = function(is_permanent){
        AudioCont.play_sound_effect("zipper")
        if(!is_permanent){
            openstate = "closed"
        }else{
            openstate = "closed_permanent"
        }
        Flap_open.style.display = "none"
        Flap_closed.style.display = "inherit"
        delta_y = delta_y - 150
        TranslationGroup.style.transform = "translate(" + delta_x + "px ," + delta_y + "px)"
    }
    this.remove = function(){
        TranslationGroup.remove()
    }

}

Toy = function(ParentElem,HeartLayerElem, type,start_x, start_y, use_alternate_colorscheme){

    let ToySVG, ToyZeroTranslationGroup,MainPosTranslationGroup,AnimationTranslationGroup, ScaleGroup, RotationGroup,
        HeartGenerator, current_x, current_y, Outline, showing_hearts = false

    //Initliazes all the SVG elements
    function create_SVG_elements(){
        //Creating the Toy and its accompanying layers
        ToySVG = document.getElementById("toy_" + type).cloneNode(true);
        ToyZeroTranslationGroup = create_SVG_group(0,0,undefined,undefined);
        MainPosTranslationGroup = create_SVG_group(0,0,undefined,undefined);
        AnimationTranslationGroup = create_SVG_group(0,0,undefined,undefined);
        ScaleGroup = create_SVG_group(0,0,undefined,undefined);
        RotationGroup = create_SVG_group(0,0,undefined,undefined);

        Outline = ToySVG.getElementsByClassName("item_outline")[0]

        ToyZeroTranslationGroup.appendChild(ToySVG);
        RotationGroup.appendChild(ToyZeroTranslationGroup)
        ScaleGroup.appendChild(RotationGroup)
        AnimationTranslationGroup.appendChild(ScaleGroup)
        MainPosTranslationGroup.appendChild(AnimationTranslationGroup)

        ParentElem.appendChild(MainPosTranslationGroup);

        //Zero the coordinates of the toy first
        ToySVG.style.display = "inherit"
        let ToyBaseCenter = getSVGInternalCenter(ToyZeroTranslationGroup)
        ToyZeroTranslationGroup.style.transform = "translate(" + (-ToyBaseCenter.x) + "px, " + (-ToyBaseCenter.y) + "px)";

        //Setting scale
        ScaleGroup.style.transform = "scale(3.5)"

        //Translate the entire group to the correct x and y
        current_x = start_x
        current_y = start_y
        MainPosTranslationGroup.style.transform = "translate(" + current_x + "px, " + current_y+ "px)";

    }

    //Shows the animation of the toy being placed with (defined in the CSS)
    this.animate_play = function(){
        RotationGroup.classList.add("rotation_" + type)
        AnimationTranslationGroup.classList.add("translation_" + type)
        showing_hearts = true
        Outline.classList.add("focus_on_SVG_outline")

        HeartGenerator = setInterval(function(){
            if(showing_hearts){
                let x_delta = randomIntFromInterval(-700,400)
                let y_delta = randomIntFromInterval(-950,-500)
                let heart_start_coords = getSVGInternalCenter(ToySVG)
                let Heart = new SmallFeedbackSymbol( HeartLayerElem ,"heart",2000, heart_start_coords.x, heart_start_coords.y, heart_start_coords.x+ x_delta, heart_start_coords.y + y_delta)
            }
        }, 200)

    }

    this.discard = function(){
        AnimationTranslationGroup.classList.add("discarded_toy")
        showing_hearts = false
    }

    this.stop_play = function(){
        RotationGroup.classList.remove("rotation_" + type)
        AnimationTranslationGroup.classList.remove("translation_" + type)
        showing_hearts = false
        Outline.classList.remove("focus_on_SVG_outline")
        clearInterval(HeartGenerator)
    }

    this.remove = function(){
        MainPosTranslationGroup.remove()
        showing_hearts = false
        clearInterval(HeartGenerator)
    }

    this.setblur = function(x) {
        if(x === false || x === 0 || x === undefined || x === ""){
            ToySVG.style.filter = "";
        }else{
            ToySVG.style.filter = "blur(" + x + "px)";
        }

    }

    this.animate_move_to_position = function(x,y,speed){
        MainPosTranslationGroup.style.transition = "all "+ speed + "ms ease-in-out"
        current_x = x
        current_y = y
        MainPosTranslationGroup.style.transform = "translate(" + current_x + "px, " + current_y+ "px)";
    }

    this.animate_move_relative = function(delta_x,delta_y,speed){
        MainPosTranslationGroup.style.transition = "all "+ speed + "ms ease-in-out"
        current_x = current_x + delta_x
        current_y = current_y + delta_y
        MainPosTranslationGroup.style.transform = "translate(" + current_x + "px, " + current_y+ "px)";
    }

    this.fade_opacity = function(opacity, speed){
        ToySVG.style.transition = "all "+ speed + "ms ease-in-out"
        ToySVG.style.opacity = opacity
    }

    create_SVG_elements()
    set_toy_color_scheme(ToySVG, type, use_alternate_colorscheme)


}
Box = function(ItemLayerObj, type, size, center_x, center_y){
    let SVGRefs = {}, clickfunc

    function create_single_SVG_elem(ParentElem, component){

        //Finding correct SVG
        let AlLSVGElems = document.getElementsByClassName(type)
        let SVG
        for(let i = 0; i < AlLSVGElems.length; i++){
            if(AlLSVGElems[i].id.split("_")[2] === component){
                SVG = AlLSVGElems[i].cloneNode(true)
            }
        }

        if(typeof SVG === "undefined"){
            console.error("UNABLE TO FIND SVG ELEMENT FOR BOX "+ type + ", " + component)
        }

        //Creating all the containers and storing their references
        let ZeroTransGroup = create_SVG_group(0,0,undefined,undefined);
        let MainTransGroup = create_SVG_group(0,0,undefined,undefined);
        let ScaleGroup = create_SVG_group(0,0,undefined,undefined);
        SVG.style.display = "inherit"

        ZeroTransGroup.appendChild(SVG);
        ScaleGroup.appendChild(ZeroTransGroup);
        MainTransGroup.appendChild(ScaleGroup);
        ParentElem.appendChild(MainTransGroup);

        SVGRefs[component] = {
            TranslateGroup: MainTransGroup,
            ScaleGroup: ScaleGroup,
            SVG: SVG
        }

        //Translating all elements to center on zero,zero first
        let CurrentPos = getSVGInternalCenter(SVG)
        ZeroTransGroup.style.transform = "translate(" + (-CurrentPos.x) + "px, " + (-CurrentPos.y) + "px)";

        //Scaling
        ScaleGroup.style.transform = "scale(" + size + ")"

        //Translating to target coordinates
        MainTransGroup.style.transform = "translate(" + center_x + "px, " + center_y + "px)";

        //Now set a transition
        //SVG.style.transition = "all 500ms ease-in-out"
        MainTransGroup.style.opacity = 0

        //Setting event handler
        SVG.onpointerdown = box_clicked
    }

    function create_all_SVG_elements(){
        create_single_SVG_elem(ItemLayerObj.Neg1, "outline")
        create_single_SVG_elem(ItemLayerObj.Neg1, "back")
        create_single_SVG_elem(ItemLayerObj.Plus1, "front")
        create_single_SVG_elem(ItemLayerObj.Plus2, "lid")

        for(let key in SVGRefs){
            SVGRefs[key].TranslateGroup.style.opacity = 0
        }



        setTimeout(function(){
            for(let key in SVGRefs){
                SVGRefs[key].TranslateGroup.style.opacity = 0
                SVGRefs[key].TranslateGroup.style.transition = "all 100ms ease-in-out"

                setTimeout(function(){
                    SVGRefs[key].TranslateGroup.style.opacity = 1
                },10)

            }
        },30)

        setTimeout(function(){
            SVGRefs.outline.SVG.getElementsByClassName("box_outline")[0].style.fill = "none"
            SVGRefs.lid.SVG.style.transition = "all 500ms ease-in-out"
        },250)
    }

    this.highlight_outline = function(){
        SVGRefs.outline.SVG.getElementsByClassName("box_outline")[0].style.display = "inherit"
        SVGRefs.outline.SVG.getElementsByClassName("box_outline")[0].classList.add("focus_on_SVG_outline")
    }
    this.stop_highlight_outline = function(){
        SVGRefs.outline.SVG.getElementsByClassName("box_outline")[0].classList.remove("focus_on_SVG_outline")
        SVGRefs.outline.SVG.getElementsByClassName("box_outline")[0].style.display = "none"
    }

    this.open = function(){
        SVGRefs.lid.SVG.style.opacity = 0;

    }

    this.close = function(){
        SVGRefs.lid.SVG.style.opacity = 1
    }

    function box_clicked(){
        if(typeof clickfunc === "function"){
            clickfunc();
        }
    }

    this.set_clicked_event = function(func){
        clickfunc = func
    }

    this.setblur = function(x) {

        if(x === false || x === 0 || x === undefined || x === ""){
            for(let key in SVGRefs){
                SVGRefs[key].SVG.style.filter = "";
            }
        }else{
            for(let key in SVGRefs){
                SVGRefs[key].SVG.style.filter = "blur(" + x + "px)";
            }

        }

    }

    this.animate_move_relative = function(delta_x, delta_y, speed){
        for(let key in SVGRefs){
            SVGRefs[key].TranslateGroup.style.transition = "all "+ speed + "ms ease-in-out"
            let CurrentPos = getSVGInternalCenter(SVGRefs[key].TranslateGroup)
            SVGRefs[key].TranslateGroup.style.transform = "translate(" + (CurrentPos.x + delta_x) + "px, " + (CurrentPos.y + delta_y)+ "px)";
        }
    }

    this.animate_opacity = function(opacity, speed){
        for(let key in SVGRefs){
            SVGRefs[key].SVG.style.transition = "all "+ speed + "ms ease-in-out"
            SVGRefs[key].SVG.style.opacity = opacity
        }
    }

    this.set_all_SVG_transitions = function(speed){
        for(let key in SVGRefs){
            SVGRefs[key].SVG.style.transition = "all "+ speed + "ms ease-in-out"
        }
    }



    create_all_SVG_elements()

}
Curtain = function(ParentLayer,  center_x,center_y, size, region){
    let that = this
    let CurtainObj = copy_scale_and_move_object_to_position(document.getElementById("box_hidden_curtain"), ParentLayer, center_x,center_y, size)
    let Tarp = CurtainObj.getElementsByClassName("tarp")[0]
    let TarpRopes = CurtainObj.getElementsByClassName("tarp_ropes")[0]
    let TarpShadow = CurtainObj.getElementsByClassName("tarp_shadow")[0]
    let Posts = CurtainObj.getElementsByClassName("tarp_posts")[0]

    //Coloring the tarp correctly
    Tarp.getElementsByClassName("tarp_canvas")[0].style.fill = GenParam.RegionData[region].surrounding_color
    Tarp.getElementsByClassName("tarp_canvas")[0].style.stroke =GenParam.RegionData[region].darker_color
    Tarp.getElementsByClassName("tarp_questionmark")[0].style.fill = GenParam.RegionData[region].color
    Tarp.getElementsByClassName("tarp_details")[0].style.stroke = GenParam.RegionData[region].darker_color

    Tarp.style.transition = "all 500ms ease-in-out"
    TarpRopes.style.transition = "all 100ms ease-in-out"
    TarpShadow.style.transition = "all 500ms ease-in-out"
    Posts.style.transition = "all 500ms ease-in-out"

    this.reveal = function(returnfunc){
        TarpRopes.style.opacity = 0
        TarpShadow.style.opacity = 0
        Tarp.style.transform = "translateY(200px)"
        Tarp.style.opacity = 0
        AudioCont.play_sound_effect("curtain")

        setTimeout(function(){
            Posts.style.opacity = 0
            setTimeout(function(){
                returnfunc()
            },400)
        },400)


    }
    this.remove = function(){
        setTimeout(function(){
            CurtainObj.remove()
        },400)
    }

    this.set_click_to_reveal = function(){
        Tarp.style.cursor = "pointer"
        Tarp.onpointerdown = function(){that.reveal()}
    }
    this.set_click_to_open = function(){
        Tarp.style.cursor = "pointer"
        Tarp.onpointerdown = function(){
            AudioCont.play_sound_effect("curtain")
            TarpRopes.style.opacity = 0
            TarpShadow.style.opacity = 0
            Tarp.style.transform = "translateY(200px)"
            Tarp.style.opacity = 0

        }
    }
}

/*SmallFeedbackSymbol = function(Parent, feedback_type,speed,start_x, start_y, end_x, end_y){
    let ScaleGroup = create_SVG_group(0,0,undefined,undefined);
    let TranslationGroup = create_SVG_group(0,0,undefined,undefined);

    //Copy the heart svg element
    let Elem
    switch(feedback_type){
        case("heart"):
            Elem = document.getElementById("feedback_" + feedback_type + "_small").cloneNode(true)
            Elem.style.fill = "pink";
            break
        case("bored"):
            Elem = document.getElementById("feedback_bored").cloneNode(true)
            Elem.style.fill = "dimgray";
            Elem.style.stroke = "none"
            Elem.style.opacity = 0.5
            break
    }
    ScaleGroup.appendChild(Elem);
    TranslationGroup.appendChild(ScaleGroup);
    Parent.appendChild(TranslationGroup);
    Elem.style.display="inherit"

    ScaleGroup.style.transformOrigin = "350px 300px"
    ScaleGroup.style.transform = "scale(3)"

    moveSVGCenterTo(Elem, start_x, start_y)
    Elem.style.opacity = .85

    setTimeout(function(){
        TranslationGroup.style.transition = "all "+ speed + "ms ease-in-out"
        moveSVGCenterTo(TranslationGroup, end_x, end_y)

        Elem.style.transition = "all "+ speed + "ms ease-in-out"
        Elem.style.opacity = 0.2
        switch(feedback_type){
            case("heart"): Elem.style.fill = "red"; break
            case("bites"): Elem.style.fill = "gold"; break
            case("frown"): Elem.style.fill = "red"; break
            case("smile"): Elem.style.fill = "lightgreen"; Elem.style.stroke = "lightgreen"; break
        }

        ScaleGroup.style.transition = "all "+ speed + "ms ease-in-out"
        ScaleGroup.style.transform = "scale(5)"
    },10)


    //Self-destruct  to prevent cluttering the browser
    setTimeout(function(){
        Elem.style.transition = "all "+ (100) + "ms ease-in"
        Elem.style.fill = "darkblue"
        let CurrentPos = getSVGInternalCenter(Elem)

        Elem.style.opacity = 0.05
        //moveSVGCenterTo(Elem, CurrentPos.x, CurrentPos.y)

        ScaleGroup.style.transition = "all "+ (100) + "ms ease-in"
        //ScaleGroup.style.transformOrigin = ( (.35) *CurrentPos.x) + "px " + ( (1) *  CurrentPos.y) + "px"

        ScaleGroup.style.transformOrigin = "410px 350px"
        ScaleGroup.style.transform = "scale(6)"


        setTimeout(function(){
            Elem.remove()
            TranslationGroup.remove()
        }, 500)
        AudioCont.play_sound_effect("pop")
    },randomIntFromInterval(0.25*speed,speed))

}

 */

QuestionBubble = function(Parent, center_x, center_y, question_mark_only){
    let SVG = document.getElementById("partner_thought_bubble_right").cloneNode(true);
    if(question_mark_only){
        SVG = SVG.getElementsByClassName("partner_thought_bubble_questionmark")[0]
    }

    let ScaleGroup = create_SVG_group(0,0,undefined,undefined);
    let TranslateMain = create_SVG_group(0,0,undefined,undefined)
    let TranslateZero = create_SVG_group(0,0,undefined,undefined)

    TranslateZero.appendChild(SVG);
    ScaleGroup.appendChild(TranslateZero)
    TranslateMain.appendChild(ScaleGroup)

    Parent.appendChild(TranslateMain);

    //Zero the coordinates
    SVG.style.display = "inherit"
    let BaseCenter = getSVGInternalCenter(TranslateZero)
    TranslateZero.style.transform = "translate(" + (-BaseCenter.x) + "px, " + (-BaseCenter.y) + "px)";

    //Setting scale
    ScaleGroup.style.transform = "scale(4)"

    //Translate the entire group to the correct x and y
    TranslateMain.style.transform = "translate(" + center_x + "px, " + center_y+ "px)";

    //Setting basic style
    let OutlineElem, Qmark
    if(question_mark_only){

        SVG.classList.add("focus_on_SVG_outline")
        ScaleGroup.classList.add("scale_pulse_qmark")
        SVG.style.strokeWidth = "6px"

    }else{
        OutlineElem = SVG.getElementsByClassName("partner_thought_bubble_outline")[0]
        Qmark = SVG.getElementsByClassName("partner_thought_bubble_questionmark")[0]
        OutlineElem.classList.add("focus_on_SVG_outline")
        OutlineElem.style.strokeWidth = "5px"
        OutlineElem.style.fill = "white"
        Qmark.classList.add("focus_on_SVG_fill")
        ScaleGroup.classList.add("scale_pulse_qmark")
        OutlineElem.style.opacity = 1
        Qmark.style.opacity = 1
    }

    this.fade_out = function(time){
        SVG.style.transition = "all " + time + "ms ease-in"
        SVG.style.opacity = 0
    }









}


QuestionBar = function(Parent, Array_of_choices, Settings, num_bonus_stars_reward, outputfun) {
    let is_bonus_stars_earnable = false
    if(num_bonus_stars_reward > 0){
        is_bonus_stars_earnable = true;
    }

    let BackgroundRectCont, ForeignElem, MainDiv,ButtonContainerDiv, Buttons=[], Barthat = this, BonusStarContainer
    let bar_total_width = 0.95 * GenParam.SVG_width

    QButton = function(Parent, name, SVG, outputfun){
        let button_enabled = false
        let ButtonContainer = document.createElement("div");
        //ButtonContainer.style.height = "80%"
        //ButtonContainer.style.padding = "1%"
        ButtonContainer.style.opacity = 0
        //ButtonContainer.style.flex = 1
        ButtonContainer.classList.add("questionbar_button")
        ButtonContainer.style.maxHeight = "90%"
        //ButtonContainer.style.width = "100%"
        ButtonContainer.style.aspectRatio =  "1 / 1"
        ButtonContainer.style.flex = "0 1 auto"

        let ButtonSVGElem = document.createElementNS("http://www.w3.org/2000/svg", 'svg')
        ButtonSVGElem.style.width = "100%"
        ButtonSVGElem.style.height = "100%"
        ButtonSVGElem.setAttribute("viewBox", "0 0 150 150")
        ButtonSVGElem.style.display = "inherit"
        ButtonContainer.appendChild(ButtonSVGElem)
        Parent.appendChild(ButtonContainer)

        ButtonSVGElem.appendChild(SVG)
        let Box = SVG.getBBox()
        let bordersize = 3
        ButtonSVGElem.setAttribute("viewBox", (Math.floor(Box.x)-bordersize) + " " + (Math.floor(Box.y)-bordersize) + " " + (Math.ceil(Box.width) + 2* bordersize)+ " " + (Math.ceil(Box.height)+ 2*bordersize ));

        //Making the SVG invisible for pointer events
        SVG.style.pointerEvents = "none";

        ButtonContainer.style.transition = "all 200ms ease-in-out"
        //Show after a brief delay, then set the event listener
        setTimeout(function(){
            ButtonContainer.style.opacity = 1;
            button_enabled = true
            ButtonContainer.onpointerdown = function(){if(button_enabled){outputfun(name)}}
        },100)

        //Set to enable or disable button

        this.enable = function (){ button_enabled = true; }
        this.disable = function (){ button_enabled = false; }
        this.set_opacity = function(opacity) {ButtonContainer.style.opacity = opacity};
        this.set_display = function(display) {ButtonContainer.style.display = display};
        this.get_name = function(){ return name; }
        this.remove = function(){ButtonContainer.remove()}

    }

    BackgroundRect = function(Parent){
        //Creating the rect and appending it to the parent. At first, this a zero width rect.
        let Rect = create_SVG_rect(0.5*GenParam.SVG_width, Settings.top_y, 0, Settings.height, undefined,undefined)
        Rect.style.fill = "white"
        Rect.style.opacity = 0.8
        Rect.style.transition = "all 200ms ease-in-out"
        Rect.style.rx = "50px"
        Rect.style.ry = "50px"
        Parent.appendChild(Rect)

        if(typeof Settings.backgroundcolor === "undefined"){
            Rect.style.fill = "white"
        }else{
            Rect.style.fill = Settings.backgroundcolor
        }

        //Call to resize
        this.resize = function(TargetElem){
            const new_width  = 1.2* get_width_of_DOM_in_SVG_space(TargetElem)
            Rect.style.width = new_width + 'px'
            Rect.style.x = (0.5*GenParam.SVG_width) - (new_width / 2)
        }
    }

    function create_basic_SVG_elem(){
        let foreignheigt = Settings.height
        if(is_bonus_stars_earnable){ foreignheigt = 1.25* foreignheigt }

        BackgroundRectCont = new BackgroundRect(Parent)
        ForeignElem = create_SVG_foreignElement(0.5 * ( GenParam.SVG_width - bar_total_width ), Settings.top_y,bar_total_width,foreignheigt, undefined,undefined)
        Parent.appendChild(ForeignElem)

        MainDiv = document.createElement("div")
        ForeignElem.appendChild(MainDiv)
        MainDiv.style.height = "100%"
        if(is_bonus_stars_earnable){MainDiv.style.height = "78%"}
        MainDiv.style.display = "flex"
        MainDiv.style.justifyContent = "center"
        MainDiv.style.alignItems = "center"

        ButtonContainerDiv = document.createElement("div")
        MainDiv.appendChild(ButtonContainerDiv)

        ButtonContainerDiv.style.gap = "10px"
        ButtonContainerDiv.style.height = "100%"
        //ButtonContainerDiv.style.maxWidth = "100%"
        //ButtonContainerDiv.style.backgroundColor = "#FFFFFFAA"
        //ButtonContainerDiv.style.opacity = 0.45
        //ButtonContainerDiv.style.borderRadius = "50px"
        ButtonContainerDiv.style.display = "flex"
        ButtonContainerDiv.style.alignItems="center"
        ButtonContainerDiv.style.justifyContent="center"
        //ButtonContainerDiv.style.width = "max-content"
        //ButtonContainerDiv.style.padding = "20px"
        //ButtonContainerDiv.style.transition = "all 500ms ease-in-out"

        const max_width_per_box = 0

        if(is_bonus_stars_earnable){
            BonusStarContainer = document.createElement("div")
            BonusStarContainer.style.width = "100%"
            BonusStarContainer.style.textAlign = "center"
            //BonusStarContainer.style.paddingTop = "5px"
            //BonusStarContainer.style.fontStyle = "italic"
            if(num_bonus_stars_reward === 1 || num_bonus_stars_reward === true){
                BonusStarContainer.innerHTML = "You can earn a bonus star"
            }else{
                BonusStarContainer.innerHTML = "Earn " + num_bonus_stars_reward + " stars for a correct answer!"
            }

            BonusStarContainer.classList.add("questionbar_bonustext")

            //BonusStarContainer.style.height =
            ForeignElem.appendChild(BonusStarContainer)
            AudioCont.play_sound_effect("alert_minor")
        }


        for(let i = 0 ; i < Array_of_choices.length; i++){
            Buttons.push(new QButton(ButtonContainerDiv,Array_of_choices[i].name, Array_of_choices[i].SVG, Barthat.button_pressed ))
            BackgroundRectCont.resize(ButtonContainerDiv)
        }

    }

    this.button_pressed = function(name){
        AudioCont.play_sound_effect("button_click")
        outputfun(name)
    }

    function disable_buttons(){
        for(let i = 0;i < Buttons.length; i++){
            Buttons[i].disable()
        }
    }

    function enable_buttons(){
        for(let i = 0;i < Buttons.length; i++){
            Buttons[i].enable()
        }
    }

    this.collapse_bar = function(){
        //Disable all buttons
        disable_buttons()

        //Fade all buttons out
        for(let i = 0;i < Buttons.length; i++){
            Buttons[i].set_opacity(0)
        }

        if(typeof BonusStarContainer !== "undefined"){
            BonusStarContainer.style.opacity = 0
        }

        //Collapse the background bar
        setTimeout(function(){
            for(let i = 0;i < Buttons.length; i++){
                Buttons[i].set_display("none")
            }
            BackgroundRectCont.resize(ButtonContainerDiv)
        }, 200)

    }
    this.expand_bar = function(){
        //Reset the background bar
        for(let i = 0;i < Buttons.length; i++){
            Buttons[i].set_display("inherit")
        }
        BackgroundRectCont.resize(ButtonContainerDiv)

        //Fade buttons back in
        setTimeout(function(){
            for(let i = 0;i < Buttons.length; i++){
                Buttons[i].set_opacity(1)
            }
            if(typeof BonusStarContainer !== "undefined"){
                BonusStarContainer.style.opacity = 0
            }


            //Enable all buttons
            setTimeout(function(){
                enable_buttons()
            },200)

        },200)


    }
    this.remove_element = function(name){
        let NewButtons = []
        for(let i = 0;i < Buttons.length; i++){
            if(Buttons[i].get_name() === name){
                Buttons[i].remove()
            }else{
                NewButtons.push(Buttons[i])
            }
        }
        Buttons = NewButtons
    }
    this.remove = function(){
        //Remove all the buttons
        for(let i = 0;i < Buttons.length; i++){
            Buttons[i].remove()
        }

        //Remove the elements themselves
        ForeignElem.remove()

    }

    create_basic_SVG_elem()


}

HomeRoomController = function(room_type, ParentElem, Itemdetails, questiontext, target_item_name, original_region, original_location, returnfunction){
    let ContainerElem,Background, IntroMask, Outlines = [], ObjectSVGs = []

    function set_all_elements(){
        ContainerElem = create_SVG_group(0,0)
        ParentElem.appendChild(ContainerElem)

        show_background()

        Interface.player_moved_to_new_region("Home")

        switch(room_type){
            case("lost_found"): Interface.Locator.change_locator_name("Lost & Found"); break
            case("toy_room"): Interface.Locator.change_locator_name("Toy Room")
        }

    }

    function show_background(){
        Background = document.createElementNS("http://www.w3.org/2000/svg", 'image')
        switch(room_type){
            case("lost_found"): Background.setAttribute("href", "./Locations/Home_lostfound.png"); break
            case("toy_room"): Background.setAttribute("href", "./Locations/Home_toyroom.png"); break
        }
        Background.setAttribute("width", "100%")
        Background.setAttribute("height", "100%")
        Background.setAttribute('preserveAspectRatio', 'none')
        ContainerElem.appendChild( Background )

        IntroMask = create_SVG_rect(0,0,GenParam.SVG_width, GenParam.SVG_height);
        IntroMask.style.fill = GenParam.RegionData["Home"].surrounding_color
        IntroMask.style.opacity = 0
        IntroMask.style.transition = "all 500ms ease-in-out"
        IntroMask.style.pointerEvents = "none"


        ContainerElem.appendChild(IntroMask)
    }

    function display_all_items_on_shelf(){

        for(let i = 0;i < Itemdetails.length; i++){
            let SVGObj = copy_scale_and_move_object_to_position(document.getElementById(Itemdetails[i].SVG_name), ContainerElem, Itemdetails[i].shelf_position.x, Itemdetails[i].shelf_position.y,4)
            SVGObj.id = "LF_ELEM_" + i
            ObjectSVGs.push(SVGObj)
            let Outline = create_SVG_outline_of_group_ID(SVGObj)
            Outlines.push(Outline)

            // Inserting the outline
            SVGObj.parentNode.insertBefore(Outline, SVGObj);
            SVGObj.style.cursor = "pointer"

            //Setting event handler
            SVGObj.onpointerdown = function(){
                if(item_selection_enabled){
                    item_selected(Itemdetails[i].name)
                }

            }

            switch(Itemdetails[i].type){
                case("toy"): set_toy_color_scheme(SVGObj, Itemdetails[i].name, false); break
                case("alternate_toy"):set_toy_color_scheme(SVGObj, Itemdetails[i].name, true);  break

            }
        }

        //Set the opacity mask in front again
        ContainerElem.appendChild(IntroMask)
    }

    function enable_item_selection(){
        Interface.Prompt.show_message(questiontext)
        item_selection_enabled = true
        for(let i = 0; i<Outlines.length; i++){
            Outlines[i].classList.add("focus_on_SVG_outline")
            ObjectSVGs[i].style.cursor = "pointer"
        }
    }
    function disable_item_selection(){
        item_selection_enabled = false
        for(let i = 0; i<Outlines.length; i++){
            Outlines[i].classList.remove("focus_on_SVG_outline")
            ObjectSVGs[i].style.cursor = "auto"
        }
    }

    function item_selected(name){

        disable_item_selection()

        //Check whether this was correct
        if(name === target_item_name){
            AudioCont.play_sound_effect("success")
            Interface.Prompt.show_message("Correct!")
            setTimeout(function(){
                leave_room()
            }, 750)

        }else{
            AudioCont.play_sound_effect("rejected")
            Interface.Prompt.show_message("Oops, that's not correct...")
            setTimeout(function(){enable_item_selection()},1500)
        }
    }

    //Leave after succesfull completion
    function leave_room(){
        //Fade out
        //ContainerElem.appendChild(IntroMask)
        IntroMask.style.opacity = 1
        setTimeout(function(){
            Interface.Prompt.hide()
            // Remove all items
            for(let i = 0; i<Outlines.length; i++){
                Outlines[i].remove()
            }
            for(let i = 0; i<ObjectSVGs.length; i++){
                ObjectSVGs[i].remove()
            }

            //Remove the background
            Background.remove()


            //Return the interface colors back to normal
            Interface.player_moved_to_new_region(original_region)
            Interface.Locator.change_locator_name(GenParam.get_display_name_of_location(original_location))

            //Fade out the opacity mask
            IntroMask.style.opacity = 0

            setTimeout(function(){
                ContainerElem.remove()
                returnfunction()
            },500)


        }, 500)

    }

    //On creation
    set_all_elements()
    let item_selection_enabled = false
    IntroMask.style.opacity = 1
    Interface.Prompt.hide()
    setTimeout(function(){


        display_all_items_on_shelf()
        switch(room_type){
            case("lost_found"): Interface.Prompt.show_message("We are now at the Lost and Found department"); break
            case("toy_room"): Interface.Prompt.show_message("We are now at the Toy Room"); break
        }


        IntroMask.style.opacity = 0

        setTimeout(function(){

            setTimeout(function(){
                enable_item_selection()
            },1000)
        }, 500)
    }, 500)

}

SingleDraggableObject = function(ParentElem, DraggableElem, type, Target, returnfunc, optional_max_distance){
    let Mask, dragging_is_enabled = false, currentlydragging = false
    let maximum_allowed_distance_to_target = 150
    if(optional_max_distance > 0){ maximum_allowed_distance_to_target = optional_max_distance}

    let DragGroup = create_SVG_group(0,0)
    DragGroup.appendChild(DraggableElem)
    ParentElem.appendChild(DragGroup)

    if(typeof DraggableElem.id === "undefined" ){
        DraggableElem.id = "DragControllerTargetID1112"
    }
    let Outline = create_SVG_outline_of_group_ID(DraggableElem)
    DraggableElem.parentNode.insertBefore(Outline, DraggableElem);


    let OriginalPos = getSVGInternalCenter(DraggableElem)

    //For the object, create an event that triggers dragging mode
    function enable_object_draggable(){
        DraggableElem.style.cursor = "pointer"
        Outline.classList.add("focus_on_SVG_outline")
        DraggableElem.onpointerdown = start_dragging
        dragging_is_enabled = true
    }
    function disable_object_draggable(){
        DraggableElem.style.cursor = "auto"
        Outline.classList.remove("focus_on_SVG_outline")
        dragging_is_enabled = false
    }

    function start_dragging(){
        if(dragging_is_enabled){

            currentlydragging = true
            Outline.classList.remove("focus_on_SVG_outline")
            Mask = create_SVG_rect(0,0,GenParam.SVG_width,GenParam.SVG_height)
            Mask.style.opacity = 0
            ParentElem.appendChild(Mask)
            Mask.onpointermove = function(event){ pointer_moved(event)}
            Mask.onpointerup = function(event){ release_dragging(event)}
            Mask.onpointerdown = function(event){ release_dragging(event)}

            Mask.onpointercancel = function(event){ drag_cancelled()}
            Mask.onpointerleave = function(event){ drag_cancelled()}

        }
    }

    function pointer_moved(event){
        move_elem_to_location(getMousePosition(event))
    }

    function drag_cancelled(){
        AudioCont.play_sound_effect("rejected")
        //Return the element to its original position. While doing so, no new drags are allowed
        Mask.remove()
        disable_object_draggable()
        DragGroup.style.transition = "all 300ms ease-in-out"
        DragGroup.style.transform = ""
        setTimeout(function(){
            DragGroup.style.transition = ""
            enable_object_draggable()
        },350)

    }

    function release_dragging(event){
        let dist_to_target = EUDistPoints(getMousePosition(event), getSVGInternalCenter(Target))
        if(dist_to_target < maximum_allowed_distance_to_target){
            //Success! Delete all elements and execute the return function
            AudioCont.play_sound_effect("success")
            Mask.remove()
            disable_object_draggable()
            DragGroup.style.transition = "all 500ms ease-in-out"
            DragGroup.style.opacity = 0
            returnfunc()

            setTimeout(function(){DragGroup.remove()},500)


        }else{
            drag_cancelled()
        }

    }

    function move_elem_to_location(NewPos){
        let new_delta_x =  NewPos.x - OriginalPos.x
        let new_delta_y =  NewPos.y - OriginalPos.y

        DragGroup.style.transform = "translate(" + new_delta_x + "px ," + new_delta_y + "px)"
    }

    //When dragging, create a mask to catch all pointer events


    //The exact interaction depends on the type of draging objective.
    // Drag_to_Fennimal: assumes that the Target is the Fennimal SVG object. If released sufficiently close, then triggers a success.
    // Clean_Fennimal: assumes that the Target is a list of elements of class "dirt". Each element is deleted when sufficiently close. Triggers a success if all dirt has been removed.
    // Movable object: Can be released anywhere on the screen

    //On creation
    enable_object_draggable()


}

Balloon = function(ParentElem, center_x, center_y, size,){
    let BalloonObj = copy_scale_and_move_object_to_position(document.getElementById("balloon"), ParentElem, center_x,center_y, size)
    BalloonObj.classList.add("balloon")

    this.pop_on_click = function(){
        BalloonObj.onpointerdown = function(){
            AudioCont.play_sound_effect("balloon_pop")
            BalloonObj.classList.add('is-popped')
            setTimeout(function(){
                BalloonObj.remove()
            }, 300)
        }

    }

    this.remove = function(){
        //AudioCont.play_sound_effect("balloon_pop")
        BalloonObj.classList.add('is-popped')
        setTimeout(function(){
            BalloonObj.remove()
        }, 300)


    }

}

MovableBarrel = function(ParentElem, center_x, center_y, size){
    const move_speed = 0.05 * GenParam.SVG_width

    let currentpos = 0, currently_moving = false
    let BarrelObj = copy_scale_and_move_object_to_position(document.getElementById("barrel"), ParentElem, center_x,center_y, size)
    let TranslationGroup = create_SVG_group(0,0)
    TranslationGroup.appendChild(BarrelObj)
    ParentElem.appendChild(TranslationGroup)

    TranslationGroup.style.cursor = "pointer"
    TranslationGroup.style.transition = "all 500ms ease-in-out"
    let Centerpos = getSVGInternalCenter(TranslationGroup)

    function move_left(){
        currentpos -= move_speed
        update_position()
        AudioCont.play_sound_effect("drag_wood")
    }
    function move_right(){
        currentpos += move_speed
        update_position()
        AudioCont.play_sound_effect("drag_wood")
    }
    function update_position(){
        TranslationGroup.style.pointer = "auto"
        currently_moving = true
        TranslationGroup.style.transform = "translateX(" + currentpos + "px)"
        setTimeout(function(){
            TranslationGroup.style.pointer = "cursor"
            Centerpos = getSVGInternalCenter(TranslationGroup)
            currently_moving = false
        }, 500)
    }

    TranslationGroup.onpointerdown  = function(event){
        if(!currently_moving){
            let mouse_coords = getMousePosition(event)
            if(mouse_coords.x > Centerpos.x){
                move_left()
            }else{
                move_right()
            }
        }
    }

    this.remove = function(){
        currently_moving = true
        Centerpos = getSVGInternalCenter(TranslationGroup)
        if(Centerpos.x > 0.5 * GenParam.SVG_width){
            TranslationGroup.style.transform = "translateX(" + (currentpos + (GenParam.SVG_width - Centerpos.x) )  + "px)"
        }else{
            TranslationGroup.style.transform = "translateX(" + (currentpos - (Centerpos.x + currentpos) )  + "px)"
        }
        TranslationGroup.style.opacity = 0
        setTimeout(function(){
            TranslationGroup.remove()
        }, 500)

    }

}

HideAndSeekObject = function(ParentElem,object_type, start_x, start_y, size, region ){
    //Barrel: draggable
    //Curtain and balloon: click to dissapear
    let Object

    switch(object_type){
        case("curtain"):
            Object = new Curtain(ParentElem,start_x,start_y, size, region )
            Object.set_click_to_open()
            break
        case("balloon"):
            Object = new Balloon(ParentElem,start_x,start_y, size, region )
            Object.pop_on_click()
            break
        case("barrel"):
            Object = new MovableBarrel(ParentElem,start_x,start_y, size, region )
            break
    }

    this.remove = function(){
        Object.remove()
    }

}

// Orthogonal tasks, which are self-contained
FindBoxTaskController = function(ItemLayers, FenObj, PartnerIcon, returnfunc){
    let Fennimal, Box, box_layer, box_x_pos, AllFoliageControllers = [], RemainingFoliageControllersByLocation = {}
    const W = GenParam.SVG_width, H = GenParam.SVG_height
    const Spots = {
        Main: [.25, .35, .45, .55, .65, .75, .85, .95 ],
        Plus1: [.2, .4,.6, .8, .9],
        Plus2: [.10, .40, .70, .90],
    }
    const layer_y_pos = {
        Main: .6,
        Plus1: .7,
        Plus2: .75
    }
    const BoxSizes = {
        Main: 1.25,
        Plus1: 1.75,
        Plus2: 2.25,
    }
    const FoliageSizes = {
        Main: 2.25,
        Plus1: 2.75,
        Plus2: 3.25,
    }
    let foliage_base_health = 5

    //Check if partner is present. If so, then this function should have access to the partner icon. If not, then this will be false
    let  Partner, PartnerTranslateGroup
    const partner_is_present = typeof PartnerIcon === "object"
    if(partner_is_present){
        foliage_base_health = 7

        //Wrapping the partner icon into another group so we can set transforms without worries
        PartnerTranslateGroup = create_SVG_group(0,0)
        PartnerIcon.parentNode.appendChild(PartnerTranslateGroup)
        PartnerTranslateGroup.appendChild(PartnerIcon)

    }

    FoliageSubController = function(layer, xpos, ypos, size){
        let Layer = ItemLayers[layer]
        let Foliage = copy_scale_and_move_object_to_position(document.getElementById("foliage_" + FenObj.region), Layer, xpos, ypos, size)
        Foliage.style.cursor = "pointer"

        let Cut_Elem = Foliage.getElementsByClassName("cut_foliage")[0]
        let Uncut_Elem = Foliage.getElementsByClassName("uncut_foliage")[0]

        Cut_Elem.style.opacity = 0
        Uncut_Elem.style.transition = "all 300ms ease-out"
        let foliage_health = foliage_base_health
        //Cut_Elem.style.transition = "all 300ms ease-in"

        let is_cuttable = false, has_been_cut = false
        function cut(coords){
            AudioCont.play_sound_effect("chop")
            if(foliage_health > 1){
                foliage_health--

                const pt = GenParam.SVGObject.createSVGPoint();
                pt.x = coords.x
                pt.y = coords.y

                const svgPos = pt.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());

                // 3. Spawn particles at the calculated canvas position
                spawnParticles(coords.x, coords.y, ItemLayers.Plus2);
            }else{
                foliage_health = 0
                has_been_cut = true
                Cut_Elem.style.opacity = 1
                Uncut_Elem.style.opacity = 0
                Foliage.style.pointerEvents = "none"
                Foliage.style.cursor = "auto"
                delete RemainingFoliageControllersByLocation[layer][xpos]
            }
        }

        this.toggle_cuttable = function(bool){
            is_cuttable = bool
        }


        Foliage.onpointerdown = function(event){
            if(is_cuttable && ! has_been_cut){
                cut(getMousePosition(event))
            }
        }

        this.get_center_pos_on_screen = function(){
            return(getSVGInternalCenter(Foliage))
        }
        this.cut_external = function(Coords){
            cut(Coords)
        }
        this.get_health = function(){
            return(foliage_health)
        }

        this.remove = function(){
            Foliage.style.transition = "all 300ms ease-in"
            Foliage.style.opacity = 0
            is_cuttable = false
            setTimeout(function(){
                Foliage.remove()
            }, 400)

        }

    }

    //If a partner is present, then it will help by also cutting down trees.
    PartnerBehaviorSubcontroller = function(){
        let layers_by_order_of_target = ["Plus2", "Plus1", "Main"]
        let all_trees_cut = false
        let cutting_speed = 250
        let x_offset_position = 200
        let CurrentTargetController

        function cut_tree(){
            return new Promise(resolve => {
                let Cutsite = CurrentTargetController.get_center_pos_on_screen()
                Cutsite.x += (Math.random() - 0.5) * 100
                Cutsite.y += (Math.random() - 0.5) * 100

                CurrentTargetController.cut_external(Cutsite)

                setTimeout(() => {resolve()}, cutting_speed);
            });
        }

        async function cut_down_target_tree(){
            if(CurrentTargetController.get_health() > 0){
                await cut_tree()
                await cut_down_target_tree()
            }else{
                await help_cutting()
            }
        }

        function move_to_tree(){
            return new Promise(resolve => {
                PartnerTranslateGroup.style.transition = "all 500ms ease-in-out"
                let dx = CurrentTargetController.get_center_pos_on_screen().x - getSVGInternalCenter(PartnerTranslateGroup).x

                //Now we want to calculate the offset so the partner is not blocking the view.
                //We have a preference to go to the left, but if that puts us out of bounds then go right
                let applied_offset = -x_offset_position
                if(CurrentTargetController.get_center_pos_on_screen().x - x_offset_position < 0){
                    applied_offset = x_offset_position
                }

                PartnerTranslateGroup.style.transform += "translateX(" + (dx+applied_offset) + "px)"

                setTimeout(() => {resolve()}, 500);
            });
        }

        function set_new_target_tree(){
            if(Object.keys(RemainingFoliageControllersByLocation[layers_by_order_of_target[0]]).length > 0){
                let current_target_key = shuffleArray(Object.keys(RemainingFoliageControllersByLocation[layers_by_order_of_target[0]]))[0]
                CurrentTargetController = RemainingFoliageControllersByLocation[layers_by_order_of_target[0]][current_target_key]
            }else{
                if(Object.keys(RemainingFoliageControllersByLocation[layers_by_order_of_target[1]]).length > 0){
                    let current_target_key =  shuffleArray(Object.keys(RemainingFoliageControllersByLocation[layers_by_order_of_target[1]]))[0]
                    CurrentTargetController = RemainingFoliageControllersByLocation[layers_by_order_of_target[1]][current_target_key]
                }else{
                    if(Object.keys(RemainingFoliageControllersByLocation[layers_by_order_of_target[2]]).length > 0){
                        let current_target_key = shuffleArray(Object.keys(RemainingFoliageControllersByLocation[layers_by_order_of_target[2]]))[0]
                        CurrentTargetController = RemainingFoliageControllersByLocation[layers_by_order_of_target[2]][current_target_key]
                    }else{
                        all_trees_cut = true
                    }
                }
            }

            console.log(CurrentTargetController)
        }

        function move_out_of_the_way(){
            return new Promise(resolve => {
                let x_dist  = getSVGInternalCenter(Box).x - getSVGInternalCenter(PartnerTranslateGroup).x

                let movetime = 10

                if(Math.abs(x_dist)< 300){
                    let dx
                    if(x_dist < 0){
                        dx = 300
                    }else{
                        dx = -300
                    }

                    if( (getSVGInternalCenter(PartnerTranslateGroup).x + dx) < 0){
                        dx = 500
                    }
                    if( (getSVGInternalCenter(PartnerTranslateGroup).x + dx) > W){
                        dx = -500
                    }
                    PartnerTranslateGroup.style.transition = "all 500ms ease-in-out"
                    PartnerTranslateGroup.style.transform += "translateX(" + (dx) + "px)"
                    movetime = 500

                }



                setTimeout(() => {resolve()}, movetime);
            });

        }

        async function help_cutting(){
            //Set a new target
            set_new_target_tree()

            //If not all targets have been cut, then:
            if(! all_trees_cut){
                //Move to the target tree
                await move_to_tree()

                //Cut until the tree is gone
                await cut_down_target_tree()
            }else{
                move_out_of_the_way()
            }

        }

        this.return_to_start = function(){
            PartnerTranslateGroup.style.transition = "all 500ms ease-in-out"
            PartnerTranslateGroup.style.transform = ""
        }

        help_cutting();

    }

    function spawnParticles(clickX, clickY, svgElement) {
        // Cartoonish wood colors
        const colors = ['#8B4513', '#A0522D', '#CD853F', '#D2B48C'];
        const numParticles = 12; // How many chips fly out per hit

        for (let i = 0; i < numParticles; i++) {
            // Create an SVG rectangle to act as a wood chip
            const particle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

            // 1. Set the Object's Size and Starting Position
            const size = Math.random() * 50 + 20; // Random size between 10px and 12px
            particle.setAttribute('width', size);
            particle.setAttribute('height', size);
            // Offset the x/y by half the size so the particle centers on the click
            particle.setAttribute('x', clickX - size / 2);
            particle.setAttribute('y', clickY - size / 2);

            // Pick a random wood color
            particle.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);

            // Add the CSS class
            particle.classList.add('wood-splinter');

            // 2. Generate Random Trajectory Variables for the Arc
            const endX = (Math.random() - 0.5) * 650;
            const endY = Math.random() * 150 + 80;
            const jump = -(Math.random() * 140 + 20);
            const rot = (Math.random() - 0.5) * 720;

            // 3. Inject the CSS Variables into the element's inline style
            particle.style.setProperty('--x', `${endX}px`);
            particle.style.setProperty('--y', `${endY}px`);
            particle.style.setProperty('--jump', `${jump}px`);
            particle.style.setProperty('--rot', `${rot}deg`);

            // 4. Add to the SVG
            svgElement.appendChild(particle);

            // 5. Cleanup: Remove the element from the DOM after the animation finishes
            setTimeout(() => {
                particle.remove();
            }, 500); // Matches the 0.5s animation duration
        }
    }

    //On creation, we create a Fennimal on the left
    function create_Fennimal_object(){
        //Create
        Fennimal = create_Fennimal_SVG_object(FenObj, GenParam.Fennimal_head_size, false)
        ItemLayers.Neg1.appendChild(Fennimal)

        let ScaleGroup = Fennimal.getElementsByClassName("Fennimal_scale_group")[0]
        ScaleGroup.style.transform = "scale(1.25)"

        //Translate
        let Box = Fennimal.getBBox()
        let delta_x = (0.10 *W) - (Box.x + 0.5 * Box.width)
        let delta_y = (0.5*H)- (Box.y + 0.5 * Box.height)
        Fennimal.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"


    }

    function place_box(){
        //Randomly finding a layer (here we only allow Neg1 and Main
        box_layer = "Main"

        box_x_pos = shuffleArray(Spots[box_layer])[0]

        //Finding a x_position
        Box = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + FenObj.toybox), ItemLayers[box_layer], box_x_pos * W, (layer_y_pos[box_layer]+0.05) * H, BoxSizes[box_layer] )
        Box.onpointerdown = box_found
        Box.style.cursor = "pointer"
    }

    async function box_found(){
        Box.onpointerdown = ""
        Box.style.cursor = "auto"
        AudioCont.play_sound_effect("success")
        //Remove all elements
        for(let contnum in AllFoliageControllers){
            AllFoliageControllers[contnum].remove()
        }

        //If there is a partner, return to center
        if(partner_is_present){
            Partner.return_to_start()
        }

        //After a brief delay, move the box and Fennimal to the front
        setTimeout(function(){
            Interface.Prompt.show_message("Yay! You found the " +  GenParam.get_box_printed_name(FenObj.toybox) + "!" )

            //Moving the box
            Box.style.transition = "all 500ms ease-in-out"
            let Boxcenter = getSVGInternalCenter(Box)
            let delta_x = (0.6 *W) - (Boxcenter.x)
            let delta_y = (0.7*H)- (Boxcenter.y)
            Box.style.transform += "translate(" + delta_x + "px, " + delta_y + "px) scale(3)";

            //After a brief delay, move the Fennimal
            setTimeout(function(){
                AudioCont.play_sound_effect("positive")
                Interface.Prompt.show_message(FenObj.name + " is very grateful that you found the " +   GenParam.get_box_printed_name(FenObj.toybox) + "!" )
                Fennimal.style.transition = "all 500ms ease-in-out"
                let Fencenter = getSVGInternalCenter(Fennimal)
                let delta_x = (0.35 *W) - (Fencenter.x)
                let delta_y = (0.4*H)- (Fencenter.y)
                Fennimal.style.transform += "translate(" + delta_x + "px, " + delta_y + "px) scale(1.5)";

                //After the Fennimal finished moving, show some hearts
                setTimeout(async function(){
                    //Show some hearts
                    let HGenerator = setInterval(function(){
                        let x_delta = randomIntFromInterval(-1000,200)
                        let y_delta = randomIntFromInterval(-950,-500)
                        let heart_start_coords = getSVGInternalCenter(Fennimal.getElementsByClassName("Fennimal_head_mouth_point")[0])
                        heart_start_coords.x += randomIntFromInterval(-200,200)
                        heart_start_coords.y += randomIntFromInterval(-200,200)
                        new SmallFeedbackSymbol( ItemLayers.Plus2,"heart",2000, heart_start_coords.x, heart_start_coords.y, heart_start_coords.x+ x_delta, heart_start_coords.y + y_delta)
                    }, 250)

                    await Fennimal_jump(50)
                    await Fennimal_jump(75)
                    await Fennimal_jump(50)

                    //Set an interval to continue
                    setTimeout(function(){
                        clearInterval(HGenerator)
                        //Done with the task!
                        returnfunc()

                    }, 3000)

                },500)

            }, 750)

        },750)

    }

    function create_foliage(){
        for(let layer in Spots){
            if(typeof RemainingFoliageControllersByLocation[layer] === "undefined"){
                RemainingFoliageControllersByLocation[layer] = {}
            }
            for(let spotnum in Spots[layer]){
                let FoliageCont = new FoliageSubController(layer, Spots[layer][spotnum] * W, layer_y_pos[layer] * H, FoliageSizes[layer])
                AllFoliageControllers.push(FoliageCont)
                RemainingFoliageControllersByLocation[layer][Spots[layer][spotnum] * W] = FoliageCont
            }
        }
    }

    function make_foliage_cuttable(){
        Interface.Prompt.show_message("Please cut down the plants until you find the " +  GenParam.get_box_printed_name(FenObj.toybox) )
        for(let contnum in AllFoliageControllers){
            AllFoliageControllers[contnum].toggle_cuttable(true)
        }
    }

    function Fennimal_jump(amount){
        return new Promise(resolve => {
            let prejump_transform = Fennimal.style.transform
            AudioCont.play_sound_effect("jump")
            Fennimal.style.transition = "all 200ms ease-out"
            Fennimal.style.transform += "translateY(-" + amount + "px)"
            setTimeout(function(){
                Fennimal.style.transform = prejump_transform

            }, 200)

            // 2. Resolve the promise when the duration is up
            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, 500);
        });

    }

    //Call when a trial is over to clean up
    this.clean_up = function(){
        Fennimal.remove()
        Box.remove()
        AllFoliageControllers = ""
        PartnerIcon.parentNode.appendChild(PartnerIcon)
        PartnerTranslateGroup.remove()
    }

    create_Fennimal_object()
    place_box()
    create_foliage()

    Interface.Prompt.show_message("Uh oh! " + FenObj.name + " has lost the " + GenParam.get_box_printed_name(FenObj.toybox) + "!" )
    AudioCont.play_sound_effect("sad")

    setTimeout(function(){
        make_foliage_cuttable()
        Partner = new PartnerBehaviorSubcontroller()
    }, 1000)

}

ReachHatTaskController = function(ItemLayers, FenObj, PartnerIcon, returnfunc){
    let boxname = GenParam.get_box_printed_name(FenObj.toybox)
    let Fennimal, Pole, Hat, Box, BackgroundMask, BoxOutline
    const W = GenParam.SVG_width, H = GenParam.SVG_height
    let baseline_y = 0.85 * H, pole_dx = 0.7 * W, Fen_base_x = 0.1 * W, box_base_x = 0.2 * W,
        hat_starting_point, FennimalBaseTransform, PoleHatTarget
    let number_of_dragging_steps = 5, draggin_step_counter = 0, drag_time = 500, box_is_movable = false,
        box_moving_step_distance = 0
    const AllPoleNames = {
        North: "Pine tree",
        Mountains: "rock",
        Village: "telephone pole",
        Swamp: "dead tree",
        Desert: "ruin",
        Beach: "palm tree",
        Jungle: "tree",
        Flowerfields: "pillar",
    }
    const polename = AllPoleNames[FenObj.region]

    //Check if partner is present. If so, then this function should have access to the partner icon. If not, then this will be false
    let  Partner, PartnerTranslateGroup
    const partner_is_present = typeof PartnerIcon === "object"
    if(partner_is_present){
        number_of_dragging_steps +=4

        //Wrapping the partner icon into another group so we can set transforms without worries
        PartnerTranslateGroup = create_SVG_group(0,0)
        PartnerIcon.parentNode.appendChild(PartnerTranslateGroup)
        PartnerTranslateGroup.appendChild(PartnerIcon)
    }

    PartnerController = function(){
        const offset_after_turn = 600
        const offset_while_dragging = 200
        const movement_speed = 500

        function move_to_box(){
            return new Promise(resolve => {
                PartnerTranslateGroup.style.transition = "all " + movement_speed + "ms ease-in-out"
                let dx = (getSVGInternalCenter(Box).x - getSVGInternalCenter(PartnerTranslateGroup).x) + offset_while_dragging
                PartnerTranslateGroup.style.transform += "translateX(" + dx +"px)"

                setTimeout(() => {resolve()}, movement_speed);
            });
        }

        function move_after_drag(){
            return new Promise(resolve => {
                PartnerTranslateGroup.style.transition = "all " + movement_speed + "ms ease-out"
                let dx = (getSVGInternalCenter(Box).x - getSVGInternalCenter(PartnerTranslateGroup).x) + offset_after_turn
                PartnerTranslateGroup.style.transform += "translateX(" + dx +"px)"

                setTimeout(() => {resolve()}, movement_speed);
            });
        }


        this.take_turn = async function(){
            //Move
            await move_to_box()

            //Drag
            move_box()

            //Return to an offset position to the right
            await move_after_drag()

        }

    }

    function spawnDust(clickX, clickY, svgElement) {
        // Cartoonish dust colors (light grays and beige)
        const colors = ['#D3D3D3', '#C0C0C0', '#A9A9A9', '#E5E4E2', "#000000"];
        const numParticles = 6; // A nice small puff of dust

        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

            // 1. Set the Object's Size and Starting Position
            const radius = Math.random() * 20 + 20;
            particle.setAttribute('r', radius);

            // For circles, we use cx and cy instead of x and y
            particle.setAttribute('cx', clickX);
            particle.setAttribute('cy', clickY);

            particle.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);
            particle.classList.add('dust-cloud');

            // 2. Generate Random Trajectory Variables
            // Horizontal spread:
            const endX = ((Math.random() - 0.5) * 120) - 200 ;
            // Vertical drift: drifts UP
            const endY = -(Math.random() * 50 + 40);
            // Final Scale: grows
            const finalScale = Math.random() * 1.5 + 2.5;

            // 3. Inject the CSS Variables
            particle.style.setProperty('--x', `${endX}px`);
            particle.style.setProperty('--y', `${endY}px`);
            particle.style.setProperty('--s', finalScale);

            // 4. Add to SVG
            svgElement.appendChild(particle);

            // 5. Cleanup
            setTimeout(() => {
                particle.remove();
            }, 800); // Matches the 0.8s animation duration
        }
    }

    function create_background_mask(){
        BackgroundMask = create_SVG_rect(0,0,W,H)
        BackgroundMask.style.fill = "white"
        ItemLayers.Neg1.appendChild(BackgroundMask)
        BackgroundMask.style.opacity = 0
        BackgroundMask.style.transition = "all 500ms ease-in-out"

        setTimeout(function(){
            BackgroundMask.style.opacity = 0.8
        },5)

    }

    function create_Fennimal(){
        Fennimal = create_Fennimal_SVG_object(FenObj, GenParam.Fennimal_head_size, false)
        ItemLayers.Plus2.appendChild(Fennimal)

        let ScaleGroup = Fennimal.getElementsByClassName("Fennimal_scale_group")[0]
        ScaleGroup.style.transform = "scale(1.5)"

        //Translate
        let Box = Fennimal.getBBox()
        let delta_x = (Fen_base_x) - (Box.x + 0.5 * Box.width)
        let delta_y = (baseline_y)- (Box.y +  Box.height)
        Fennimal.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

        //Hide hat
        Fennimal.getElementsByClassName("hat")[0].style.opacity = 0

        //Store the basic starting position
        FennimalBaseTransform = Fennimal.style.transform

    }

    function create_pole(){
        Pole = copy_scale_and_move_object_to_position(document.getElementById("tall_post_" + FenObj.region), ItemLayers.Neg1, Fen_base_x, 0.4* H, 6 )
        let Box = Pole.getBBox()
        PoleHatTarget = Pole.getElementsByClassName("tall_post_target")[0]
        let TargetBox = getSVGInternalCenter(PoleHatTarget)
        let delta_x = (Fen_base_x + pole_dx) - (TargetBox.x )
        let delta_y = (baseline_y)- (Box.y +  Box.height)

        Pole.style.transform = "translate(" + delta_x + "px, " + (delta_y - 20 ) + "px)"
    }

    function create_box(){
        Box = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + FenObj.toybox), ItemLayers.Plus1, box_base_x, baseline_y , 3 )
        Box.id = "reach_hat_task_box"

        let trash = Box.getElementsByClassName("alignment_field")
        while(trash.length > 0){
            trash[0].remove()
        }

        let BBox = Box.getBBox()
        let Centerpoint = getSVGInternalCenter(Box)


        let delta_y = (baseline_y)- (Centerpoint.y + 0.5* BBox.height)
        Box.style.transform += "translateY(" + (delta_y) + "px)"



    }

    function create_hat(){
        hat_starting_point = getSVGInternalCenter(Pole.getElementsByClassName("tall_post_target")[0])
        Hat = copy_scale_and_move_object_to_position(document.getElementById("hat_" + FenObj.hat), ItemLayers.Plus1, hat_starting_point.x, hat_starting_point.y, 2 )
    }

    function Fennimal_jump(amount){
        return new Promise(resolve => {
            let prejump_transform = Fennimal.style.transform
            AudioCont.play_sound_effect("jump")
            Fennimal.style.transition = "all 200ms ease-out"
            Fennimal.style.transform += "translateY(-" + amount + "px)"
            setTimeout(function(){
                Fennimal.style.transform = prejump_transform

            }, 200)

            // 2. Resolve the promise when the duration is up
            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, 500);
        });

    }

    function move_Fennimal_to_box(){
        return new Promise(resolve => {
            Fennimal.style.transition = "all 500ms ease-in-out"
            let x_distance_to_hat =  getSVGInternalCenter(PoleHatTarget).x - getSVGInternalCenter(Fennimal).x
            Fennimal.style.transform += "translateX(" + x_distance_to_hat+ "px)"

            // 2. Resolve the promise when the duration is up
            setTimeout(() => {
                resolve();
            }, 750);
        });

    }

    function Fennimal_return_to_start(){
        return new Promise(resolve => {
            Fennimal.style.transition = "all 700ms ease-in-out"
            Fennimal.style.transform = FennimalBaseTransform

            // 2. Resolve the promise when the duration is up
            setTimeout(() => {
                resolve();
            }, 850);
        });
    }

    async function show_first_attempt_to_reach_box(){
        //First: Fennimal moves to pole
        await wait(1000)
        await move_Fennimal_to_box()
        await Fennimal_jump(200)
        await Fennimal_jump(275)
        await Fennimal_jump(250)
        Interface.Prompt.show_message("Oh no, " + FenObj.name + " can't reach the " + FenObj.hat + "!")
        AudioCont.play_sound_effect("sad")
        await Fennimal_return_to_start()
        Interface.Prompt.show_message("The " + boxname + " can be used as a step-stool!" )
        await wait(1500)
        if(partner_is_present){
            Interface.Prompt.show_message("Take turns with " + WorldState.get_partner_icon_settings().name  +  " to  move the " + boxname + " to the " + polename)
        }else{
            Interface.Prompt.show_message("Help " + FenObj.name + " by moving the " + boxname + " to the " + polename)
        }

        //Now participant can start moving the box
        allow_box_being_moved()
    }

    function allow_box_being_moved(){
        box_is_movable = true
        Box.style.cursor = "pointer"
        Box.onpointerdown = try_moving_box
        box_moving_step_distance = Math.round((getSVGInternalCenter(PoleHatTarget).x - getSVGInternalCenter(Box).x) / number_of_dragging_steps)

        BoxOutline = create_SVG_outline_of_group_ID(Box)
        Box.parentNode.insertBefore(BoxOutline, Box);
        BoxOutline.classList.add("focus_on_SVG_outline")

        Box.style.transition = "all " + drag_time + "ms ease-in-out"
        BoxOutline.style.transition = "all " + drag_time + "ms ease-in-out"
    }

    async function try_moving_box(){
        if(box_is_movable){
            box_is_movable = false
            BoxOutline.classList.remove("focus_on_SVG_outline")
            await move_box()

            if(draggin_step_counter === number_of_dragging_steps){
                box_moved_to_final_position()
            }else{
                if(partner_is_present){
                    await Partner.take_turn()
                }

                //No partner, so the participant can go again
                box_is_movable = true
                Box.style.cursor = "pointer"
                BoxOutline.classList.add("focus_on_SVG_outline")
            }
        }
    }
    function move_box(){
        return new Promise(resolve => {

            AudioCont.play_sound_effect("drag_wood")
            draggin_step_counter++
            Box.style.cursor = "auto"

            Box.style.transform += "translateX(" + box_moving_step_distance + "px)"
            BoxOutline.style.transform += "translateX(" + box_moving_step_distance + "px)"

            let Boxpos = getSVGInternalCenter(Box)
            spawnDust(Boxpos.x  , Boxpos.y + 0.45 * Box.getBBox().height, ItemLayers.Main)

            setTimeout(() => {
                resolve();
            }, 750);
        });


    }

    function Fennimal_jump_on_box(amount){
        return new Promise(resolve => {
            AudioCont.play_sound_effect("jump")
            Fennimal.style.transition = "all 200ms ease-out"
            Fennimal.style.transform += "translateY(-" + (2*amount) + "px)"
            setTimeout(function(){
                Fennimal.style.transition = "all 100ms ease-out"
                Fennimal.style.transform += "translateY(" + (amount) + "px)"
            }, 200)

            // 2. Resolve the promise when the duration is up
            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, 500);
        });
    }

    function Fennimal_grabs_hat(){
        return new Promise(resolve => {
            let start_transform = Fennimal.style.transform

            //Jump and grab
            AudioCont.play_sound_effect("jump")
            Fennimal.style.transition = "all 200ms ease-out"
            Fennimal.style.transform += "translateY(-" + (250) + "px)"

            setTimeout(function(){
                Hat.style.transform = "all 50ms ease-out"
                Hat.style.opacity = 0
                Fennimal.style.transition = "all 100ms ease-out"
                Fennimal.style.transform = start_transform
            }, 200)

            setTimeout(function(){
                AudioCont.play_sound_effect("success")
                Fennimal.getElementsByClassName("hat")[0].style.opacity = 1
            }, 300)

            // 2. Resolve the promise when the duration is up
            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, 500);
        });
    }

    function Fennimal_jumps_back_to_ground(ground_transform){
        return new Promise(resolve => {
            AudioCont.play_sound_effect("jump")
            Fennimal.style.transition = "all 200ms ease-out"
            Fennimal.style.transform += "translateY(-" + (50) + "px)"
            setTimeout(function(){
                Fennimal.style.transform = ground_transform
            }, 200)


            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, 500);
        });
    }

    function Fennimal_moves_to_center(){
        return new Promise(resolve => {
            let delta_x = (0.5*W) - getSVGInternalCenter(Fennimal).x
            Fennimal.style.transition = "all 500ms ease-out"
            Fennimal.style.transform += "translateX(" + Math.round(delta_x) + "px)"

            setTimeout(() => {
                resolve();
            }, 500);
        });
    }

    async function box_moved_to_final_position(){
        AudioCont.play_sound_effect("success")
        Interface.Prompt.hide()

        await wait(1000)
        await move_Fennimal_to_box()


        let prejump_transform = Fennimal.style.transform

        await Fennimal_jump_on_box(175)
        await wait(500)
        await Fennimal_jump(250)
        await wait(100)
        await Fennimal_grabs_hat()
        await wait(300)
        await Fennimal_jumps_back_to_ground(prejump_transform)
        await wait(200)
        await Fennimal_moves_to_center()

        //Showing appreciation
        AudioCont.play_sound_effect("positive")
        Interface.Prompt.show_message(FenObj.name + " really appreciates your help!")
        let HGenerator = setInterval(function(){
            let x_delta = randomIntFromInterval(-1000,200)
            let y_delta = randomIntFromInterval(-950,-500)
            let heart_start_coords = getSVGInternalCenter(Fennimal.getElementsByClassName("Fennimal_head_mouth_point")[0])
            heart_start_coords.x += randomIntFromInterval(-200,200)
            heart_start_coords.y += randomIntFromInterval(-200,200)
            new SmallFeedbackSymbol( ItemLayers.Plus2,"heart",2000, heart_start_coords.x, heart_start_coords.y, heart_start_coords.x+ x_delta, heart_start_coords.y + y_delta)
        }, 250)
        await Fennimal_jump(100)
        await Fennimal_jump(100)
        await Fennimal_jump(100)
        await wait(2000)
        clearInterval(HGenerator)
        returnfunc()

    }

    //Call when a trial is over to clean up
    this.clean_up = function(){
        Fennimal.remove()
        Box.remove()
        Hat.remove()
        Pole.remove()
        BackgroundMask.remove()
        PartnerIcon.parentNode.appendChild(PartnerIcon)
        PartnerTranslateGroup.remove()
    }

    create_background_mask()
    create_pole()
    create_Fennimal()
    create_hat()
    create_box()
    if(partner_is_present){
        Partner = new PartnerController()
    }
    Interface.Prompt.show_message("Oh no! " + FenObj.name + "'s " + FenObj.hat + " has blown onto a " + polename)
    AudioCont.play_sound_effect("sad")

    show_first_attempt_to_reach_box()


}

FlySwatController = function(ItemLayers, FenObj, PartnerIcon, returnfunc){
    let Fennimal, Box,  BackgroundMask
    let boxname = GenParam.get_box_printed_name(FenObj.toybox)
    const W = GenParam.SVG_width, H = GenParam.SVG_height
    AudioCont.load_audio("splat", "splat.wav", false);
    AudioCont.load_audio("fly_buzzing", "fly_buzzing.wav", true);

    let number_of_flies = 5, RemainingFlyControllers = {}, current_fly_count

    //Check if partner is present. If so, then this function should have access to the partner icon. If not, then this will be false
    let  Partner, PartnerTranslateGroup
    const partner_is_present = typeof PartnerIcon === "object"
    if(partner_is_present){
        number_of_flies +=5

        //Wrapping the partner icon into another group so we can set transforms without worries
        PartnerTranslateGroup = create_SVG_group(0,0)
        PartnerIcon.parentNode.appendChild(PartnerTranslateGroup)
        PartnerTranslateGroup.appendChild(PartnerIcon)
    }

    function create_background_mask(){
        BackgroundMask = create_SVG_rect(0,0,W,H)
        BackgroundMask.style.fill = "white"
        ItemLayers.Neg1.appendChild(BackgroundMask)
        BackgroundMask.style.opacity = 0
        BackgroundMask.style.transition = "all 500ms ease-in-out"

        setTimeout(function(){
            BackgroundMask.style.opacity = 0.8
        },5)

    }

    function create_Fennimal(){
        Fennimal = create_Fennimal_SVG_object(FenObj, GenParam.Fennimal_head_size, false)
        ItemLayers.Neg1.appendChild(Fennimal)

        let ScaleGroup = Fennimal.getElementsByClassName("Fennimal_scale_group")[0]
        ScaleGroup.style.transform = "scale(1.8)"

        //Translate
        let Box = Fennimal.getBBox()
        let delta_x = (0.35*W) - (Box.x + 0.5 * Box.width)
        let delta_y = (0.85*H)- (Box.y +  Box.height)
        Fennimal.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

    }

    function create_box(){
        Box = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + FenObj.toybox), ItemLayers.Main, 0.5*W, 0.7*H, 4 )
        Box.id = "reach_hat_task_box"

        let trash = Box.getElementsByClassName("alignment_field")
        while(trash.length > 0){
            trash[0].remove()
        }

    }

    create_background_mask()
    create_Fennimal()
    create_box()

    function move_Fennimal_x(dx, time){
        return new Promise(resolve => {
            Fennimal.style.transition = "all " + time + "ms ease-in-out"
            Fennimal.style.transform += "translateX(" + dx+ "px)"

            // 2. Resolve the promise when the duration is up
            setTimeout(() => {
                resolve();
            }, time);
        });

    }
    function fly_swatted(index_num){
        current_fly_count--
        delete RemainingFlyControllers[index_num];
        if(current_fly_count <= 0){
            all_flies_swatted()
        }
    }

    function all_flies_swatted(){
        AudioCont.play_sound_effect("success")
        AudioCont.stop_audio("fly_buzzing")
        Interface.Prompt.show_message("All the flies are gone!")
        task_completed()
    }

    SwattableFly = function(Parent, TargetObject, index_num, returnfunc) {
        const TargetCoords = getSVGInternalCenter(TargetObject);
        const targetX = TargetCoords.x +  (Math.random() - 0.5) * 200
        const targetY = TargetCoords.y - 200 - (Math.random() - 0.5) * 100
        const that = this

        const StartPos = {
            x: targetX + (Math.random() - 0.5) * 200,
            y: targetY + (Math.random() - 0.5) * 200
        };

        let vx = 0, vy = 0;
        let x = StartPos.x, y = StartPos.y;
        let is_dead = false;
        const flyScale = 3;

        // NEW: Give the fly an initial random heading (in radians)
        let wanderAngle = Math.random() * Math.PI * 2;

        const templateFly = document.getElementById("swattable_fly");
        const Fly = templateFly.cloneNode(true);

        Fly.removeAttribute("id");
        Fly.classList.add("swattable_fly")
        Fly.style.display = "inherit";
        Parent.appendChild(Fly);

        function animate_fly() {
            if (is_dead) return;

            // 1. SMOOTH STEERING: Randomly drift the steering wheel left or right
            // A smaller number means wider, lazier turns.
            wanderAngle += (Math.random() - 0.5) * 0.3;

            // 2. FORWARD THRUST: Push the fly forward in the direction it's facing
            // Lower numbers = slower fly
            vx += Math.cos(wanderAngle) * 2;
            vy += Math.sin(wanderAngle) * 2;

            // 3. GRAVITY: Keep the bias toward the box
            // Reduced from 0.01 to 0.005 so it doesn't "snap" back to the center as harshly
            const distanceX = targetX - x;
            const distanceY = targetY - y;
            vx += distanceX * 0.007;
            vy += distanceY * 0.007;

            // 4. FRICTION: Determines how much "glide" the fly has
            // Increased from 0.85 to 0.90 for a smoother, floatier feel
            vx *= 0.95;
            vy *= 0.95;

            x += vx;
            y += vy;

            const angle = Math.atan2(vy, vx) * (180 / Math.PI);

            Fly.setAttribute('transform', `translate(${x}, ${y}) rotate(${angle}) scale(${flyScale})`);

            requestAnimationFrame(animate_fly);
        }

        Fly.onpointerdown = function(){
           that.swat()
        }

        this.get_position = function (){
            return(getSVGInternalCenter(Fly))
        }
        this.swat = function(){
            if (is_dead) return;
            is_dead = true;
            AudioCont.play_sound_effect("splat")

            // Add the CSS class to trigger the visual splat
            Fly.classList.add('dead');

            //Fly is dead!
            returnfunc(index_num)

            // Optional: Fade out and remove the fly from the DOM after 2 seconds
            setTimeout(() => {
                Fly.style.transition = 'opacity 1s';
                Fly.style.opacity = '0';
                setTimeout(() => Fly.remove(), 1000);

            }, 2000);
        }

        animate_fly();
    }

    PartnerController = function(){
        let target_offset_x = 200
        let movement_speed = 200, return_speed = 500
        let retarget_speed = 1500
        let TargetFly
        let max_kill_count = 5, kill_count = 0

        function move_to_target_fly(){
            return new Promise(resolve => {
                PartnerTranslateGroup.style.transition = "all " + movement_speed + "ms ease-in-out"
                let dx = Math.round((TargetFly.get_position().x - getSVGInternalCenter(PartnerTranslateGroup).x) + target_offset_x)
                PartnerTranslateGroup.style.transform += "translateX(" + dx + "px)"

                setTimeout(() => {resolve()}, movement_speed);
            });
        }

        function return_to_start(){
            return new Promise(resolve => {
                PartnerTranslateGroup.style.transition = "all " + return_speed + "ms ease-in-out"
                PartnerTranslateGroup.style.transform = ""

                setTimeout(() => {resolve()}, return_speed);
            });
        }

        function swat_target_fly(){
            if(typeof TargetFly !== "undefined"){
                TargetFly.swat()
                kill_count++
            }
        }

        function target_new_fly(){
            let target_key = shuffleArray(Object.keys(RemainingFlyControllers))[0]
            TargetFly = RemainingFlyControllers[target_key]
        }

        async function help_swat(){
            if(Object.keys(RemainingFlyControllers).length > 0 && kill_count < max_kill_count){
                //Target new fly
                target_new_fly()

                //Move to it
                await move_to_target_fly()

                //Swat it (if its still alive)
                swat_target_fly()

                //Return to starting position
                await return_to_start()

                //Wait for retargetting
                await wait(retarget_speed)

                //Recurse
                help_swat()
            }
        }

        help_swat()

    }

    async function show_starting_animation(){
        Interface.Prompt.hide()
        await wait(1000)
        Interface.Prompt.show_message("Ew! There's a bunch of flies around the " + boxname + "! Gross!")
        AudioCont.play_sound_effect("sad")
        await wait(100)
        current_fly_count = number_of_flies
        for(let i = 0;i < number_of_flies;i++){
            RemainingFlyControllers[i] = new SwattableFly(ItemLayers.Plus2,  Box, i, fly_swatted)
        }
        AudioCont.play_sound_effect("fly_buzzing")
        await wait(500)
        await move_Fennimal_x(-0.2*W, 250)
        await wait(500)
        Interface.Prompt.show_message("Help " + FenObj.name + " by swatting all the flies!")
        if(partner_is_present){
            Partner = new PartnerController()
        }


    }

    function Fennimal_jump(amount){
        return new Promise(resolve => {
            let prejump_transform = Fennimal.style.transform
            AudioCont.play_sound_effect("jump")
            Fennimal.style.transition = "all 200ms ease-out"
            Fennimal.style.transform += "translateY(-" + amount + "px)"
            setTimeout(function(){
                Fennimal.style.transform = prejump_transform

            }, 200)

            // 2. Resolve the promise when the duration is up
            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, 500);
        });

    }

    async function task_completed(){
        //Move the Fennimal back
        await wait(1000)
        await move_Fennimal_x(0.2*W, 500)
        await wait(500)

        //Showing appreciation
        AudioCont.play_sound_effect("positive")
        Interface.Prompt.show_message(FenObj.name + " really appreciates your help!")
        let HGenerator = setInterval(function(){
            let x_delta = randomIntFromInterval(-1000,200)
            let y_delta = randomIntFromInterval(-950,-500)
            let heart_start_coords = getSVGInternalCenter(Fennimal.getElementsByClassName("Fennimal_head_mouth_point")[0])
            heart_start_coords.x += randomIntFromInterval(-200,200)
            heart_start_coords.y += randomIntFromInterval(-200,200)
            new SmallFeedbackSymbol( ItemLayers.Plus2,"heart",2000, heart_start_coords.x, heart_start_coords.y, heart_start_coords.x+ x_delta, heart_start_coords.y + y_delta)
        }, 250)
        await Fennimal_jump(100)
        await Fennimal_jump(100)
        await Fennimal_jump(100)
        await wait(2000)
        clearInterval(HGenerator)
        returnfunc()

        //End task
    }

    this.clean_up = function(){
        Fennimal.remove()
        Box.remove()
        BackgroundMask.remove()
        PartnerIcon.parentNode.appendChild(PartnerIcon)
        PartnerTranslateGroup.remove()
    }

    show_starting_animation()








}

//NEW VERSIONS OF ALL THE BASIC INTERACTIONS

MakeObjectDraggableObject = function(ElemParentLayer,MaskLayer, DraggableElem, Target, required_minimum_distance, returnfunc){
    let Mask, dragging_is_enabled = false, currentlydragging = false
    let maximum_allowed_distance_to_target = required_minimum_distance
    let OriginalParent = DraggableElem.parentNode

    // NEW: Track the last known valid positions
    let current_delta_x = 0;
    let current_delta_y = 0;

    let DragGroup = create_SVG_group(0,0)
    DragGroup.appendChild(DraggableElem)
    ElemParentLayer.appendChild(DragGroup)

    if(typeof DraggableElem.id === "undefined" ){
        DraggableElem.id = "DragControllerTargetID1112"
    }
    let Outline = create_SVG_outline_of_group_ID(DraggableElem)

    //Stripping existing strokes from the outline
    Outline.removeAttribute("stroke");
    let allClonedChildren = Outline.querySelectorAll('*');
    allClonedChildren.forEach(child => child.removeAttribute("stroke"));

    DraggableElem.parentNode.insertBefore(Outline, DraggableElem);

    let OriginalPos = getSVGInternalCenter(DraggableElem)

    //For the object, create an event that triggers dragging mode
    function enable_object_draggable(){
        DraggableElem.style.cursor = "pointer"
        Outline.classList.add("focus_on_SVG_outline")
        DraggableElem.onpointerdown = start_dragging
        dragging_is_enabled = true
    }
    function disable_object_draggable(){
        DraggableElem.style.cursor = "auto"
        Outline.classList.remove("focus_on_SVG_outline")
        dragging_is_enabled = false
    }

    function is_colliding_with_unpassable() {
        // 1. Define your "core" leeway radius (Adjust X here)
        const core_radius = 30; // The radius in pixels that cannot cross the boundary

        // 2. Calculate the exact center of the dragged element's bounding box
        let dragRect = DraggableElem.getBoundingClientRect();
        let center_x = dragRect.left + (dragRect.width / 2);
        let center_y = dragRect.top + (dragRect.height / 2);

        let barriers = document.querySelectorAll('.drag_boundary');

        for (let i = 0; i < barriers.length; i++) {
            let barrierRect = barriers[i].getBoundingClientRect();

            // 3. Find the closest point on the barrier's rectangle to the toy's center
            let closest_x = Math.max(barrierRect.left, Math.min(center_x, barrierRect.right));
            let closest_y = Math.max(barrierRect.top, Math.min(center_y, barrierRect.bottom));

            // 4. Calculate the distance between the toy's center and that closest point
            let distance_x = center_x - closest_x;
            let distance_y = center_y - closest_y;

            // We use squared distance (a^2 + b^2 = c^2) to save the CPU from doing heavy square root math!
            let distance_squared = (distance_x * distance_x) + (distance_y * distance_y);

            // 5. If the distance is smaller than the radius, the core has hit the wall
            if (distance_squared < (core_radius * core_radius)) {
                return true;
            }
        }
        return false;
    }

    function start_dragging(){
        if(dragging_is_enabled){

            currentlydragging = true
            Outline.classList.remove("focus_on_SVG_outline")
            Mask = create_SVG_rect(0,0,GenParam.SVG_width,GenParam.SVG_height)
            Mask.style.opacity = 0
            MaskLayer.appendChild(Mask)
            Mask.onpointermove = function(event){ pointer_moved(event)}
            Mask.onpointerup = function(event){ release_dragging(event)}
            Mask.onpointerdown = function(event){ release_dragging(event)}

            Mask.onpointercancel = function(event){ drag_cancelled()}
            Mask.onpointerleave = function(event){ drag_cancelled()}

        }
    }

    function pointer_moved(event){
        move_elem_to_location(getMousePosition(event))
    }

    function drag_cancelled(){
        AudioCont.play_sound_effect("rejected")
        current_delta_x = 0;
        current_delta_y = 0;
        //Return the element to its original position. While doing so, no new drags are allowed
        Mask.remove()
        disable_object_draggable()
        DragGroup.style.transition = "all 300ms ease-in-out"
        DragGroup.style.transform = ""
        setTimeout(function(){
            DragGroup.style.transition = ""
            enable_object_draggable()
        },350)

    }

    function release_dragging(event){
        let dist_to_target = EUDistPoints(getMousePosition(event), getSVGInternalCenter(Target));

        if(dist_to_target < maximum_allowed_distance_to_target){
            // 1. Clean up the mask
            if (Mask) Mask.remove();

            // 2. Move the toy back to its original home in the DOM
            OriginalParent.appendChild(DraggableElem);

            // 3. Apply the total distance dragged directly to the toy itself
            DraggableElem.style.transform += "translate(" + current_delta_x + "px ," + current_delta_y + "px)";

            // 4. Clean up the temporary drag group
            DragGroup.remove();

            // 5. Reset states
            disable_object_draggable();
            current_delta_x = 0;
            current_delta_y = 0;

            // 6. Execute the callback
            returnfunc();

        } else {
            // Failed to reach target
            drag_cancelled();
        }
    }

    function move_elem_to_location(NewPos){
        let intended_delta_x = NewPos.x - OriginalPos.x;
        let intended_delta_y = NewPos.y - OriginalPos.y;

        // 1. Try moving ONLY on the X axis
        DragGroup.style.transform = "translate(" + intended_delta_x + "px ," + current_delta_y + "px)";
        if (is_colliding_with_unpassable()) {
            // Hitting a wall on X! Revert intended X to our last safe X.
            intended_delta_x = current_delta_x;
        } else {
            // Safe to move on X. Update our safe state.
            current_delta_x = intended_delta_x;
        }

        // 2. Try moving ONLY on the Y axis (using the updated X)
        DragGroup.style.transform = "translate(" + current_delta_x + "px ," + intended_delta_y + "px)";
        if (is_colliding_with_unpassable()) {
            // Hitting a wall on Y! Revert intended Y to our last safe Y.
            intended_delta_y = current_delta_y;
        } else {
            // Safe to move on Y. Update our safe state.
            current_delta_y = intended_delta_y;
        }

        // 3. Apply the final, validated transform
        DragGroup.style.transform = "translate(" + current_delta_x + "px ," + current_delta_y + "px)";
    }

    //When dragging, create a mask to catch all pointer events


    //The exact interaction depends on the type of draging objective.
    // Drag_to_Fennimal: assumes that the Target is the Fennimal SVG object. If released sufficiently close, then triggers a success.
    // Clean_Fennimal: assumes that the Target is a list of elements of class "dirt". Each element is deleted when sufficiently close. Triggers a success if all dirt has been removed.
    // Movable object: Can be released anywhere on the screen

    //On creation
    enable_object_draggable()


}

BasicIntroToyboxController = function(ItemLayers, FenObj, PartnerIcon, returnfunc){

    const boxname = GenParam.get_box_printed_name(FenObj.toybox)
    let BackgroundMask, Fennimal, FennimalOutline, BoxBase, BoxTop, BoxOutline, Toy, ToyOutline, Partner, PartnerTranslateGroup, PartnerOutline
    let TargetPoints = {}
    const W = GenParam.SVG_width, H = GenParam.SVG_height
    const partner_is_present = typeof PartnerIcon === "object", partner_box_x_offset = 200
    let partnername
    if(partner_is_present){
        //Wrapping the partner icon into another group so we can set transforms without worries
        PartnerTranslateGroup = create_SVG_group(0,0)
        PartnerIcon.parentNode.appendChild(PartnerTranslateGroup)
        PartnerTranslateGroup.appendChild(PartnerIcon)
        partnername = WorldState.get_partner_icon_settings().name
    }

    function create_background_mask(already_fade_in, fade_in_time){
        return new Promise(resolve => {
            BackgroundMask = create_SVG_rect(0,0,W,H)
            BackgroundMask.id = "task_background_mask"
            BackgroundMask.style.fill = "white"
            ItemLayers.Neg1.appendChild(BackgroundMask)
            BackgroundMask.style.opacity = 0
            let returntime = 0
            if(already_fade_in){
                BackgroundMask.style.transition = "all " + fade_in_time + "ms ease-in-out"
                window.getComputedStyle(BackgroundMask).opacity; // Forcing reflow

                BackgroundMask.style.opacity = 0.8
                returntime = fade_in_time
            }
            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, returntime);
        });



    }

    function create_and_appear_Fennimal(Parent, center_x, base_y, scale, fade_in_time){
        return new Promise(resolve => {
            Fennimal = create_Fennimal_SVG_object(FenObj, GenParam.Fennimal_head_size, false)
            Fennimal.id = "task_Fennimal"
            Fennimal.style.opacity = 0;
            Parent.appendChild(Fennimal)

            let ScaleGroup = Fennimal.getElementsByClassName("Fennimal_scale_group")[0]
            ScaleGroup.style.transform = "scale(" + scale + ")"

            //Translate
            let BBox = Fennimal.getBBox()
            let delta_x = (center_x) - (BBox.x + 0.5 * BBox.width)
            let delta_y = (base_y)- (BBox.y +  BBox.height)
            Fennimal.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"
            window.getComputedStyle(Fennimal).opacity; // Forcing reflow
            Fennimal.style.transition = "all " + fade_in_time + "ms ease-in-out"
            Fennimal.style.opacity = 1

            //Adding target points
            TargetPoints.Fennimal_body_center = Fennimal.getElementsByClassName("Fennimal_body_center_point")[0]
            TargetPoints.Fennimal_mouth = Fennimal.getElementsByClassName("Fennimal_head_mouth_point")[0]

            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, fade_in_time);
        });
    }

    function create_and_appear_toy(Parent, id, center_x, center_y, scale, fade_in_time){
        return new Promise(resolve => {
            Toy = copy_scale_and_move_object_to_position(document.getElementById("toy_" + FenObj.toy), Parent, center_x, center_y , scale )
            Toy.id = "task_toy_" + id
            Toy.style.opacity = 0
            window.getComputedStyle(Fennimal).opacity; // Forcing reflow
            Toy.style.transition = "all " + fade_in_time + "ms ease-in-out"

            Toy.style.opacity = 1
            set_toy_color_scheme(Toy,FenObj.toy, false)


            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, fade_in_time);
        });

    }

    function create_and_appear_box(ParentBase, ParentTop, center_x, center_y, scale, fade_in_time){
        return new Promise(resolve => {
            BoxBase = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + FenObj.toybox), ParentBase, center_x, center_y , scale )
            BoxBase.getElementsByClassName("front")[0].remove()
            BoxBase.getElementsByClassName("lid")[0].remove()
            BoxBase.id = "task_box_base"
            BoxBase.style.opacity = 0

            BoxTop = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + FenObj.toybox), ParentTop, center_x, center_y , scale )
            BoxTop.id = "task_box_top"
            BoxTop.getElementsByClassName("back")[0].remove()
            BoxTop.style.opacity = 0


            console.log(BoxBase)
            window.getComputedStyle(BoxBase).opacity; // Forcing reflow
            BoxTop.style.transition = "all " + fade_in_time + "ms ease-in-out"
            BoxBase.style.transition = "all " + fade_in_time + "ms ease-in-out"
            BoxBase.style.opacity = 1
            BoxTop.style.opacity = 1

            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, fade_in_time);
        });

    }

    function partner_opens_box(){
        return new Promise(resolve => {
            let basetransform = PartnerTranslateGroup.style.transform
            //Move the partner over to the box
            let dx = getSVGInternalCenter(BoxBase).x -  getSVGInternalCenter(PartnerTranslateGroup).x
            PartnerTranslateGroup.style.transition = "all 400ms ease-in-out"
            PartnerTranslateGroup.style.transform += "translateX(" + dx + "px)"

            setTimeout(function(){
                open_box()
            },500)

            setTimeout(function(){
                PartnerTranslateGroup.style.transform = basetransform
            },600)


            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, 1000);
        });

    }

    function partner_closes_box(){
        return new Promise(resolve => {
            let basetransform = PartnerTranslateGroup.style.transform
            //Move the partner over to the box
            let dx = getSVGInternalCenter(BoxBase).x -  getSVGInternalCenter(PartnerTranslateGroup).x
            PartnerTranslateGroup.style.transition = "all 400ms ease-in-out"
            PartnerTranslateGroup.style.transform += "translateX(" + dx + "px)"

            setTimeout(function(){
                close_box()
            },500)

            setTimeout(function(){
                PartnerTranslateGroup.style.transform = basetransform
            },600)


            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, 1000);
        });

    }

    function click_to_open_box(){
        Interface.Prompt.show_message(  "Click to open the box")
        AudioCont.play_sound_effect("alert_minor")
        //Now we want to draw an outline around the entire box
        BoxOutline = create_SVG_outline_of_multiple_groups(BoxBase, BoxTop)
        BoxBase.parentNode.insertBefore(BoxOutline, BoxBase);
        BoxOutline.classList.add("focus_on_SVG_outline")

        BoxBase.style.cursor = "pointer"
        BoxTop.style.cursor = "pointer"

        function box_clicked(){
            BoxBase.onpointerdown = ""
            BoxTop.onpointerdown = ""
            BoxBase.style.cursor = "auto"
            BoxTop.style.cursor = "auto"
            BoxOutline.remove()
            open_box()
            box_has_been_opened()
        }

        BoxBase.onpointerdown = box_clicked
        BoxTop.onpointerdown = box_clicked
    }

    function click_to_close_box(){
        Interface.Prompt.show_message("Click to close the box")
        AudioCont.play_sound_effect("alert_minor")
        BoxOutline = create_SVG_outline_of_multiple_groups(BoxBase, BoxTop)
        BoxBase.parentNode.insertBefore(BoxOutline, BoxBase);
        BoxOutline.classList.add("focus_on_SVG_outline")

        BoxBase.style.cursor = "pointer"
        BoxTop.style.cursor = "pointer"

        function box_clicked(){
            BoxBase.onpointerdown = ""
            BoxTop.onpointerdown = ""
            BoxBase.style.cursor = "auto"
            BoxTop.style.cursor = "auto"
            BoxOutline.remove()
            close_box()
            box_has_been_closed()
        }

        BoxBase.onpointerdown = box_clicked
        BoxTop.onpointerdown = box_clicked
    }

    function open_box(){
        AudioCont.play_sound_effect("box_open_" + FenObj.toybox)
        BoxTop.getElementsByClassName("lid")[0].style.opacity = 0
    }
    function close_box(){
        AudioCont.play_sound_effect("box_open_" + FenObj.toybox)
        BoxTop.getElementsByClassName("lid")[0].style.opacity = 1
    }

    function shimmy_toy_to_box_center(){
        return new Promise(resolve => {

            let TargetPoint = getSVGInternalCenter(BoxTop.getElementsByClassName("box_target_centerpoint")[0])
            let CurrentPoint = getSVGInternalCenter(Toy)
            Toy.style.transition = "all 100ms ease-in-out"

            let dx = TargetPoint.x - CurrentPoint.x
            let dy = TargetPoint.y - CurrentPoint.y
            Toy.style.transform += "translate(" + dx + "px, " + dy + "px)"

            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, 100);
        });
    }

    async function player_drag_toy_to_box_action_completed(){
        await shimmy_toy_to_box_center()
        if(partner_is_present){
            Interface.Prompt.show_message(partnername + " closes the " + boxname)
            await partner_closes_box()
            box_has_been_closed()
        }else{
            click_to_close_box()
        }
    }

    async function box_has_been_closed(){
        Interface.Prompt.show_message(FenObj.name + " is happy that you're keeping the " + FenObj.toy + " safe!")
        await Fennimal_jump(50)
        await Fennimal_jump(100)
        await Fennimal_jump(50)
        returnfunc()
    }

    async function box_has_been_opened(){
        //Make toy traggable
        Interface.Prompt.show_message(  "Place the " + FenObj.toy + " into the "+ boxname)
        AudioCont.play_sound_effect("alert_minor")
        new MakeObjectDraggableObject(ItemLayers.Main,ItemLayers.Plus2,Toy,BoxBase,75,player_drag_toy_to_box_action_completed)
    }

    function Fennimal_move_relative(dx,dy, time){
        return new Promise(resolve => {
            Fennimal.style.transition = "all " + time + "ms ease-in-out"
            Fennimal.style.transform += "translate(" + dx + "px, " + dy + "px)"

            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, time);
        });
    }

    function Fennimal_jump(amount){
        return new Promise(resolve => {
            let prejump_transform = Fennimal.style.transform
            AudioCont.play_sound_effect("jump")
            Fennimal.style.transition = "all 200ms ease-out"
            Fennimal.style.transform += "translateY(-" + amount + "px)"
            setTimeout(function(){
                Fennimal.style.transform = prejump_transform

            }, 200)

            // 2. Resolve the promise when the duration is up
            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, 500);
        });

    }

    function Fennimal_play_with_toy(){

        return new Promise(resolve => {
            Interface.Prompt.show_message(FenObj.name + " loves to play with the " + FenObj.toy)
            console.log(Toy)
            let ToyCenter = getSVGInternalCenter(Toy)
            console.log(ToyCenter)

            let ToyAnimationRotationGroup = create_SVG_group(0,0)
            let ToyAnimationTranslationGroup = create_SVG_group(0,0)
            let ToyParent = Toy.parentNode
            ToyAnimationRotationGroup.appendChild(Toy)

            switch(FenObj.toy){
                case("spinner"): ToyAnimationRotationGroup.style.transformOrigin = ToyCenter.x + "px " + ToyCenter.y + "px" ; break
                case("duck"): ToyAnimationRotationGroup.style.transformOrigin = ToyCenter.x + "px " + ToyCenter.y + "px" ; break
                case("boomerang"): ToyAnimationRotationGroup.style.transformOrigin = ToyCenter.x + "px " + ToyCenter.y + "px" ; break
                case("plane"): ToyAnimationRotationGroup.style.transformOrigin = ToyCenter.x + "px " + ToyCenter.y + "px" ; break
                default: ToyAnimationRotationGroup.style.transformOrigin = "center"
            }

            ToyAnimationTranslationGroup.appendChild(ToyAnimationRotationGroup)
            ToyParent.appendChild(ToyAnimationTranslationGroup)

            ToyAnimationRotationGroup.classList.add("rotation_" + FenObj.toy)
            ToyAnimationTranslationGroup.classList.add("translation_" + FenObj.toy)

            ToyOutline = create_SVG_outline_of_group_ID(Toy)
            Toy.parentNode.insertBefore(ToyOutline, Toy);
            ToyOutline.classList.add("focus_on_SVG_outline")

            let HeartGenerator = setInterval(function(){
                let x_delta = randomIntFromInterval(-700,400)
                let y_delta = randomIntFromInterval(-950,-500)
                let heart_start_coords = getSVGInternalCenter(Toy)
                let Heart = new SmallFeedbackSymbol( ToyParent ,"heart",2000, heart_start_coords.x, heart_start_coords.y, heart_start_coords.x+ x_delta, heart_start_coords.y + y_delta)
            }, 200)

            // 2. Resolve the promise when the duration is up
            setTimeout(() => {
                ToyParent.appendChild(Toy)
                ToyOutline.remove()
                ToyAnimationTranslationGroup.remove()
                clearInterval(HeartGenerator)
                resolve();
                }, 4000);
        });
    }

    function Fennimal_done_playing(){
        return new Promise(resolve => {
            //Move the Fennimal left
            Fennimal_move_relative(-400,0,500)

            //Discard the toy
            Toy.style.transition = "all 200ms ease-out"
            Toy.style.transform += "translate(50px, 150px)"

            setTimeout(() => {
                resolve(); // This signals that the animation is done!
            }, 1000);
        });
    }

    //ON START
    async function initalize_elements(){
        //Start elements
        await create_background_mask(true, 500);
        await create_and_appear_Fennimal(ItemLayers.Main, 0.4 * W, 0.8* H, 1.75, 250)
        AudioCont.play_sound_effect("alert")
        Interface.Prompt.show_message("This Fennimal is called " +  FenObj.name)
        await wait(500)

        //Show toy
        await create_and_appear_toy(ItemLayers.Plus1, "main", getSVGInternalCenter(TargetPoints.Fennimal_body_center).x, getSVGInternalCenter(TargetPoints.Fennimal_body_center).y, 4, 200)

        //Play with toy, leaving it on the floor
        await Fennimal_play_with_toy()
        await wait(500)
        Interface.Prompt.show_message(  FenObj.name + " has finished playing with the " + FenObj.toy)
        await wait(500)
        await Fennimal_done_playing()

        //Show box and open
        Interface.Prompt.show_message(  "Let's keep the " + FenObj.toy + " safe in the " + boxname)
        await create_and_appear_box(ItemLayers.Main,ItemLayers.Plus2, 0.7 * W, 0.7 * H, 4, 100)
        await wait(1500)

        if(partner_is_present){
            Interface.Prompt.show_message(  partnername + " opens the " + boxname)
            await partner_opens_box()
            await wait(500)
            box_has_been_opened()
        }else{
            click_to_open_box()
        }


    }

    initalize_elements()


    this.clean_up = function(){
        let Arr = [BackgroundMask, Fennimal, BoxBase, BoxTop, Toy]
        for(let i = 0; i < Arr.length; i++){
            if(typeof Arr[i] !== "undefined"){
                Arr[i].remove()
            }
        }
    }

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

