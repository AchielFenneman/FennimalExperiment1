GENERAL_FENNIMAL_INTERACTION_SETTINGS = function () {
    this.sequence_order = {
        passive_observation: ["fade_and_Fennimal_appear_center"],
        polaroid_photo_passive: ["Fennimal_appear_variable", "take_photo_passive"],
        polaroid_photo_active: ["Fennimal_appear_variable", "take_photo_active"],
        give_food: ["Fennimal_appear_left", "Fennimal_hungry", "open_backpack_food"],
        play_with_toy_no_box_active: ["fade_and_Fennimal_appear_center", "ask_toy", "play_with_toy"],
        play_with_toy_no_box_passive: ["fade_and_Fennimal_appear_center", "play_with_toy"],
        play_with_toy_box_active: ["Fennimal_appear_left", "ask_box", "open_backpack_box", "ask_toy", "request_open_box","play_with_toy", "place_toy_in_box", "request_close_box", "take_box_away"],
        play_with_toy_box_passive: ["Fennimal_appear_left","open_backpack_box", "request_open_box", "play_with_toy", "place_toy_in_box", "request_close_box", "take_box_away"],
        ask_belief_partner_contents_box: ["show_Fennimal_and_box",  "ask_belief_partner", "fade_elements_out"],
        ask_contents_box: ["show_Fennimal_and_box",  "ask_contents_box", "fade_elements_out"],
        ask_Fennimal_toy: ["fade_and_Fennimal_appear_center",  "ask_Fennimal_toy",  "fade_elements_out"],



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

    this.step_speed = 1000

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
    //WorldState.change_toybox_contents(FenObj.toybox, "car")
   // WorldState.change_toybox_contents(FenObj.toybox, FenObj.toy)
    //delete FenObj.toybox

    let that = this
    // GENERAL REFERENCES
    //////////////////////
    let Settings = new GENERAL_FENNIMAL_INTERACTION_SETTINGS()
    let ParentLayer = document.getElementById("Fennimals_Layer")
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
                    fade_and_appear_Fennimal_left(true)
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
                    fade_and_appear_Fennimal_center(true)
                    //Interface.Prompt.show_message("This Fennimal is named " + FenObj.name)
                    break
                case("photo_already_collected"):
                    fade_and_appear_Fennimal_center(true)
                    Interface.Prompt.show_message("You already took a photo of " + FenObj.name)
                    break
                case("passive_Fennimal"):
                    fade_and_appear_Fennimal_center(true)
                    Interface.Prompt.show_message(FenObj.name + " is happy to see you")
                    break

                case("Fennimal_hungry"):
                    Interface.Prompt.show_message(FenObj.name + " is hungry...")
                    add_foodbowl_below_Fennimal()
                    break
                case("open_backpack_food"):
                    Interface.Prompt.show_message("Click to open your backpack")
                    open_backpack_food()
                    break
                case("ask_toy"):
                    ask_toy_questionbar();
                    break
                case("ask_box"):
                    ask_box_questionbar()
                    break
                case("play_with_toy"):
                    play_with_toy()
                    break
                case("open_backpack_box"):
                    request_open_backpack_box(0.65);
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
                if(WorldState.get_current_partner_role() !== null && WorldState.get_current_partner_role() !== false){
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

        if(typeof ItemObjects.toy  !== "undefined"){
            ItemObjects.toy.remove()
        }


    }

    //LAYER CREATION FUNCTIONS
    ////////////////////////////
    function create_item_layers(){
        let ItemLayer = create_SVG_group(0,0,undefined,"ItemLayer")
        let ItemLayer_depth_minus_one = create_SVG_group(0,0,undefined,"ItemLayer_neg1")
        let ItemLayer_main = create_SVG_group(0,0,undefined,"ItemLayer_main")
        let ItemLayer_depth_plus_one = create_SVG_group(0,0,undefined,"ItemLayer_plus1")
        let ItemLayer_depth_plus_two = create_SVG_group(0,0,undefined,"ItemLayer_plus2")
        let ItemLayer_partner = create_SVG_group(0,0,undefined,"ItemLayer_partner")
        let ItemLayer_questions = create_SVG_group(0,0,undefined,"ItemLayer_partner")

        ItemLayer.appendChild(ItemLayer_depth_minus_one)
        ItemLayer.appendChild(ItemLayer_main)
        ItemLayer.appendChild(ItemLayer_depth_plus_one)
        ItemLayer.appendChild(ItemLayer_depth_plus_two)
        ItemLayer.appendChild(ItemLayer_partner)
        ItemLayer.appendChild(ItemLayer_questions)

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
    function fade_and_appear_Fennimal_center(auto_continue) {
        show_opacity_mask()
        draw_Fennimal_on_screen(Settings.FennimalCenterPosition.center_x, Settings.FennimalCenterPosition.center_y, Settings.FennimalCenterPosition.size, Settings.FennimalCenterPosition.max_width, Settings.FennimalCenterPosition.max_height)
        introduce_Fennimal(auto_continue)
    }

    function fade_and_appear_Fennimal_left(auto_continue) {
        show_opacity_mask()
        draw_Fennimal_on_screen(Settings.FennimalLeftPosition.center_x, Settings.FennimalLeftPosition.center_y, Settings.FennimalLeftPosition.size , Settings.FennimalLeftPosition.max_width, Settings.FennimalLeftPosition.max_height)
        introduce_Fennimal(auto_continue)

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
        ParentLayer.appendChild(FennimalSVGObj)
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
        ItemObjects.backpack = new Backpack(ItemLayerObj.Main, xpos , 0.8*GenParam.SVG_height, that.backpack_food_opened)
        ItemObjects.backpack.highlight_outline()
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
    function request_open_backpack_box(rel_x_pos){
        Interface.Prompt.show_message("Click to open your backpack")
        AudioCont.play_sound_effect("alert_minor")

        ItemObjects.backpack = new Backpack(ItemLayerObj.Main,rel_x_pos*GenParam.SVG_width , 0.8*GenParam.SVG_height, that.backpack_box_opened)
        ItemObjects.backpack.highlight_outline()
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
        ItemObjects.questionbar = new QuestionBar(ItemLayerObj.Partner, get_array_of_toys_for_question(true), Settings.QuestionBar,FenObj.bonus_star_earnable, that.toy_question_answered)

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
        ItemObjects.questionbar = new QuestionBar(ItemLayerObj.Partner, Arr, Settings.QuestionBar,FenObj.bonus_star_earnable, that.box_question_answered)

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
            setTimeout(function(){
                start_next_interaction_step()
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

            ItemObjects.toy = new Toy(ItemLayerObj.Main,ItemLayerObj.Neg1, FenObj.toy, FennimalBaseHandCoords.x, FennimalBaseHandCoords.y )
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
        setTimeout(function(){start_next_interaction_step()},5000)
    }

    function show_box(highligh_outline){
        Interface.Prompt.show_message("You place the " +  GenParam.get_box_printed_name(FenObj.toybox) + " on the ground...")
        FennimalSVGObj.style.filter = "blur(4px)"
        ItemObjects.box = new Box(ItemLayerObj, FenObj.toybox,  Settings.BoxPosition.size, Settings.BoxPosition.center_x, Settings.BoxPosition.center_y)
        AudioCont.play_sound_effect("thumb")

        if(highligh_outline){
            ItemObjects.box.highlight_outline()
        }

        setTimeout(function () {
            start_next_interaction_step()
        }, Math.max(500, Settings.step_speed))
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
                ItemObjects.swapped_toy = new Toy(ItemLayerObj.Main,ItemLayerObj.Neg1, WorldState.get_toybox_contents(FenObj.toybox), Settings.BoxPosition.center_x, Settings.BoxPosition.center_y )
                break
            case("retrieve"):
                ItemObjects.toy = new Toy(ItemLayerObj.Main,ItemLayerObj.Neg1, WorldState.get_toybox_contents(FenObj.toybox), Settings.BoxPosition.center_x, Settings.BoxPosition.center_y )
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
        animate_Fennimal_moving_to_relative_position(movement_x,0,500)

        //Animate picking up the toy
        setTimeout(function () {
            ItemObjects.toy.animate_move_relative(0,-300,500)
            setTimeout(function(){
                animate_Fennimal_returning_to_base_position(500)
                ItemObjects.toy.animate_move_to_position(FennimalBaseHandCoords.x, FennimalBaseHandCoords.y,500)
                setTimeout(function(){
                    ItemObjects.box.setblur(2)
                    show_play_with_toy_then_continue()
                },500)
            },500)
        }, 700)
    }

    function place_toy_in_box(){
        //First show the Fennimal and the toy moving to the box position
        ItemObjects.toy.stop_play()
        Interface.Prompt.hide()
        ItemObjects.box.setblur(0)

        let movement_x = (Settings.BoxPosition.center_x - getSVGInternalCenter(FennimalSVGObj).x) - 350
        let animation_duration = 800
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

        setTimeout(function () {
            ItemObjects.backpack.close(true)
            ItemObjects.backpack.setblur(0)
            setTimeout(function(){
                start_next_interaction_step()
            }, Math.max(1000, 0.5*Settings.step_speed))
        }, 350)






    }

    //FUNCTIONS FOR THE ASK_X QUESTIONS
    //////////////////////////////////////
    function show_Fennimal_and_box(){
        //Draw the Fennimal on the left
        fade_and_appear_Fennimal_left(false)

        //Move the Fennimal over to make some space
        animate_Fennimal_moving_to_relative_position(-100,0,500)

        //Draw the box in the middle after a brief introduction
        setTimeout(function(){
            request_open_backpack_box(0.5)
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

            //Creating the bubble
            ItemObjects.questionbubble = new QuestionBubble(ItemLayerObj.Partner, 0.485*GenParam.SVG_width, 0.275 * GenParam.SVG_height, false)

            //Then offer the questionbar
            setTimeout(function(){
                Settings.QuestionBar.backgroundcolor = "gold"//"#faf8eb"
                ItemObjects.questionbar = new QuestionBar(ItemLayerObj.Partner, get_array_of_toys_for_question(true), Settings.QuestionBar,FenObj.bonus_star_earnable, that.question_partner_belief_answered)

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

        if(FenObj.bonus_star_earnable === true){
            if(answer_correct){
                FenObj.bonus_star_earned = true
            }else{
                FenObj.bonus_star_earned = false
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
            ItemObjects.questionbar = new QuestionBar(ItemLayerObj.Partner, get_array_of_toys_for_question(true), Settings.QuestionBar,FenObj.bonus_star_earnable, that.question_contents_box_answered)

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

        if(FenObj.bonus_star_earnable === true){
            FenObj.bonus_star_earned = answer_correct
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
        ItemObjects.questionbar = new QuestionBar(ItemLayerObj.Partner, get_array_of_toys_for_question(true), Settings.QuestionBar,FenObj.bonus_star_earnable, that.question_Fennimal_toy_answered)

        //Creating a new Questions object.
        register_start_new_question("Fennimal_toy", OptionalAdditionalInformation.Distractor_Toys)



    }
    this.question_Fennimal_toy_answered = function(answer){
        //Collapse the bar
        ItemObjects.questionbar.collapse_bar()

        let answer_correct = answer === FenObj.toy

        //Recording the answer
        record_current_question_answer(answer, answer_correct)

        if(FenObj.bonus_star_earnable === true){
            FenObj.bonus_star_earned = answer_correct
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
    create_item_layers()

    //At the start of the interaction, check if there is a partner present.
    check_for_partner_presence()

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
Backpack = function(ParentElem, center_x,center_y, openfunc){
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
    TranslationGroup.style.transform = "translate(" + delta_x + "px ," + delta_y + "px)"
    setTimeout(function(){TranslationGroup.style.transition = "all 400ms ease-in"},100)

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

    BackpackSVG.onclick = try_open_backpack

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

Toy = function(ParentElem,HeartLayerElem, type,start_x, start_y){

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
    set_toy_color_scheme(ToySVG, type)


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
        SVG.style.transition = "all 500ms ease-in-out"

        //Setting event handler
        SVG.onpointerdown = box_clicked
    }

    function create_all_SVG_elements(){
        create_single_SVG_elem(ItemLayerObj.Neg1, "outline")
        create_single_SVG_elem(ItemLayerObj.Neg1, "back")
        create_single_SVG_elem(ItemLayerObj.Plus1, "front")
        create_single_SVG_elem(ItemLayerObj.Plus2, "lid")

        SVGRefs.outline.SVG.getElementsByClassName("box_outline")[0].style.fill = "none"
        SVGRefs.lid.SVG.style.transition = "all 500ms ease-in-out"
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

SmallFeedbackSymbol = function(Parent, feedback_type,speed,start_x, start_y, end_x, end_y){
    let ScaleGroup = create_SVG_group(0,0,undefined,undefined);
    let TranslationGroup = create_SVG_group(0,0,undefined,undefined);

    //Copy the heart svg element
    let Elem = document.getElementById("feedback_" + feedback_type + "_small").cloneNode(true)
    ScaleGroup.appendChild(Elem);
    TranslationGroup.appendChild(ScaleGroup);
    Parent.appendChild(TranslationGroup);
    Elem.style.display="inherit"

    ScaleGroup.style.transformOrigin = "350px 300px"
    ScaleGroup.style.transform = "scale(3)"

    switch(feedback_type){
        case("heart"): Elem.style.fill = "pink"; break
        case("bites"): Elem.style.fill = "gold"; break
        case("frown"): Elem.style.fill = "red"; break
        case("smile"): Elem.style.fill = "lightgreen"; Elem.style.stroke = "lightgreen"; break
    }


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
        }, 500)
        AudioCont.play_sound_effect("pop")
    },randomIntFromInterval(0.25*speed,speed))

}
QuestionBubble = function(Parent, center_x, center_y, question_mark_only){
    let SVG = document.getElementById("partner_thought_bubble").cloneNode(true);
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


QuestionBar = function(Parent, Array_of_choices, Settings, is_bonus_star_earnable, outputfun) {
    if(typeof is_bonus_star_earnable == "undefined"){
        is_bonus_star_earnable = false;
    }

    let BackgroundRectCont, ForeignElem, MainDiv,ButtonContainerDiv, Buttons=[], Barthat = this, BonusStarContainer
    let bar_total_width = 0.95 * GenParam.SVG_width

    QButton = function(Parent, name, SVG, outputfun){
        let button_enabled = false
        let ButtonContainer = document.createElement("div");
        //ButtonContainer.style.height = "80%"
        ButtonContainer.style.padding = "1%"
        ButtonContainer.style.margin = "5px"
        ButtonContainer.style.opacity = 0
        //ButtonContainer.style.maxWidth = max_box_width + "px"
        //ButtonContainer.style.flexGrow = 1;
        //ButtonContainer.style.flexBasis = 0;
        ButtonContainer.style.flex = 1
        ButtonContainer.classList.add("questionbar_button")

        let ButtonSVGElem = document.createElementNS("http://www.w3.org/2000/svg", 'svg')
        //ButtonSVGElem.style.width = "100%"
        //ButtonSVGElem.style.height = "100%"
        ButtonSVGElem.style.display = "inherit"
        ButtonContainer.appendChild(ButtonSVGElem)
        Parent.appendChild(ButtonContainer)

        //Adding the SVG elements
        let ToyZeroTranslationGroup = create_SVG_group(0,0,undefined,undefined);
        let MainPosTranslationGroup = create_SVG_group(0,0,undefined,undefined);
        let ScaleGroup = create_SVG_group(0,0,undefined,undefined);

        ToyZeroTranslationGroup.appendChild(SVG);
        ScaleGroup.appendChild(ToyZeroTranslationGroup)
        MainPosTranslationGroup.appendChild(ScaleGroup)
        ButtonSVGElem.appendChild(MainPosTranslationGroup);

        //Finding SVG dims
        let svgWidth = ButtonSVGElem.viewBox.baseVal.width || ButtonSVGElem.width.baseVal.value;
        const svgHeight = ButtonSVGElem.viewBox.baseVal.height || ButtonSVGElem.height.baseVal.value;

        //Zeroing the toy coordinates
        const ToyBaseCenter = getSVGInternalCenter(ToyZeroTranslationGroup)
        ToyZeroTranslationGroup.style.transform = "translate(" + (-ToyBaseCenter.x) + "px, " + (-ToyBaseCenter.y) + "px)";

        //Scaling to just fit the box
        let ToyBBox = SVG.getBBox()

        const scale_w_max = ( (0.9*svgWidth) / ToyBBox.width)
        const scale_h_max = ( (0.9*svgHeight) / ToyBBox.height)
        const scale_factor = Math.min(scale_w_max, scale_h_max)
        ScaleGroup.style.transform = "scale(" + scale_factor + ")"

        ButtonSVGElem.style.width = 1.1* MainPosTranslationGroup.getBBox().width
        svgWidth = ButtonSVGElem.viewBox.baseVal.width || ButtonSVGElem.width.baseVal.value;

        //Translating to the center of the box
        const delta_x = (0.5*svgWidth)
        const delta_y = (0.5*svgHeight)
        MainPosTranslationGroup.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)";

        //Making the SVG invisible for pointer events
        SVG.style.pointerEvents = "none";

        ButtonContainer.style.transition = "all 200ms ease-in-out"
        //Show after a brief delay, then set the event listener
        setTimeout(function(){
            ButtonContainer.style.opacity = 1;
            button_enabled = true

            //Setting event listener

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
        if(is_bonus_star_earnable){ foreignheigt = 1.25* foreignheigt }

        BackgroundRectCont = new BackgroundRect(Parent)
        ForeignElem = create_SVG_foreignElement(0.5 * ( GenParam.SVG_width - bar_total_width ), Settings.top_y,bar_total_width,foreignheigt, undefined,undefined)
        Parent.appendChild(ForeignElem)

        MainDiv = document.createElement("div")
        ForeignElem.appendChild(MainDiv)
        MainDiv.style.height = "100%"
        if(is_bonus_star_earnable){MainDiv.style.height = "78%"}
        MainDiv.style.display = "flex"
        MainDiv.style.justifyContent = "center"
        MainDiv.style.alignItems = "center"

        ButtonContainerDiv = document.createElement("div")
        MainDiv.appendChild(ButtonContainerDiv)

        ButtonContainerDiv.style.height = "100%"
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

        if(is_bonus_star_earnable){
            BonusStarContainer = document.createElement("div")
            BonusStarContainer.style.width = "100%"
            BonusStarContainer.style.textAlign = "center"
            //BonusStarContainer.style.paddingTop = "5px"
            //BonusStarContainer.style.fontStyle = "italic"
            BonusStarContainer.innerHTML = "You can earn a bonus star"

            BonusStarContainer.classList.add("questionbar_bonustext")

            //BonusStarContainer.style.height =
            ForeignElem.appendChild(BonusStarContainer)
        }


        for(let i = 0 ; i < Array_of_choices.length; i++){
            Buttons.push(new QButton(ButtonContainerDiv,Array_of_choices[i].name, Array_of_choices[i].SVG, Barthat.button_pressed ))
            BackgroundRectCont.resize(ButtonContainerDiv)
        }

    }

    this.button_pressed = function(name){
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

