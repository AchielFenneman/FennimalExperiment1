// --- RIPPLE EFFECTS ---
function create_ripple(ParentElem, x, y, is_large) {
    let ripple_animation_time = 1500;
    let ripple_offset = 250;
    let base_class = is_large ? "ripple_circle_large" : "ripple_circle";

    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            let circle = create_SVG_circle(x, y, 1, base_class, undefined);
            ParentElem.appendChild(circle);
            setTimeout(() => circle.remove(), ripple_animation_time);
        }, i * ripple_offset);
    }
}

function create_ripple_single(ParentElem, x, y, is_large, speed) {
    let base_class = is_large ? "ripple_circle_large" : "ripple_circle";
    let circle = create_SVG_circle(x, y, 1, base_class, undefined);
    ParentElem.appendChild(circle);
    setTimeout(() => circle.remove(), speed);
}

// A global utility to firmly lock animated SVG parts to their pivot points
/*function apply_Fennimal_animation_pivots(FennimalSVG) {
    if (!FennimalSVG) return;

    let animatedParts = FennimalSVG.querySelectorAll('.animated_part');
    animatedParts.forEach(part => {
        let pivot = part.querySelector('.pivot_point');
        if (pivot) {
            let px = parseFloat(pivot.getAttribute("cx"));
            let py = parseFloat(pivot.getAttribute("cy"));
            part.style.transformOrigin = `${px}px ${py}px`;
            part.style.transformBox = "fill-box";
        }
    });

    let eyes = FennimalSVG.querySelectorAll(".eye_gaze");
    eyes.forEach(eye => {
        eye.style.transformOrigin = "center";
        eye.style.transformBox = "fill-box";
    });
}

 */

// --- ACTION BUTTON CLASS ---
class ActionButton {
    constructor(ParentElem, button_icon, TargetObject, warmup_time, keyboard_shortcut_arr, activationfunc) {
        this.button_functional = true;
        this.warmup_time = warmup_time;
        this.activationfunc = activationfunc;
        this.Countdown_Timer = null;

        if (!TargetObject) {
            this.Button = create_Action_Button_SVG_Element(button_icon, GenParam.ActionButtonParameters_Default, false, warmup_time);
            ParentElem.appendChild(this.Button);
        } else if (TargetObject === "center") {
            this.Button = create_Action_Button_SVG_Element(button_icon, GenParam.ActionButtonParameters_Center, false, warmup_time);
            ParentElem.appendChild(this.Button);
        } else {
            let Dims = TargetObject;
            if (TargetObject.nodeName) { // It's a DOM element
                let TargetCenter = get_center_coords_of_SVG_object(TargetObject);
                Dims = {
                    center_x: TargetCenter.x,
                    center_y: TargetCenter.y,
                    height: GenParam.ActionButtonParameters_OnObject.height,
                    width: GenParam.ActionButtonParameters_OnObject.width,
                };
                this.Button = create_Action_Button_SVG_Element(button_icon, Dims, true, warmup_time);
                document.getElementById("Map").appendChild(this.Button);
            } else {
                this.Button = create_Action_Button_SVG_Element(button_icon, Dims, false, warmup_time);
                ParentElem.appendChild(this.Button);
            }
        }

        let circles = this.Button.getElementsByClassName("warmup_circle");
        this.CountdownCircle = circles.length > 0 ? circles[0] : null;

        this.Button.onpointerdown = () => this.handle_pointer_down(button_icon);
        this.Button.onpointerup = () => this.break_countdown();
        this.Button.onpointerleave = () => this.break_countdown();

        if (Array.isArray(keyboard_shortcut_arr)) {
            add_keyboard_shortcuts_to_object(this.Button, keyboard_shortcut_arr, 500, activationfunc);
        }
    }

    start_countdown() {
        AudioCont.play_sound_effect("search_loop");
        if (this.CountdownCircle) {
            this.CountdownCircle.classList.add("warmup_circle_active");
            this.CountdownCircle.style.animation = `warmup_circle_animation ${this.warmup_time}ms linear`;
        }
        this.Countdown_Timer = setTimeout(() => {
            if (this.button_functional) this.activationfunc();
        }, this.warmup_time);
    }

    break_countdown() {
        if (this.warmup_time) {
            clearTimeout(this.Countdown_Timer);
            if (this.CountdownCircle) {
                this.CountdownCircle.classList.remove("warmup_circle_active");
                this.CountdownCircle.style.animation = "";
            }
        }
    }

    handle_pointer_down(button_icon) {
        let sound_effect = button_icon === "return_arrow" ? "close_menu" : "button_click";
        if (!this.warmup_time || this.warmup_time <= 0) {
            AudioCont.play_sound_effect(sound_effect);
            this.activationfunc();
        } else {
            this.start_countdown();
        }
    }

    delete() { this.Button.remove(); }
    disable_functionality() { this.button_functional = false; }
    getButtonElem() { return this.Button; }
}

class MapController {

    constructor(ExpCont, WorldState) {
        this.ExpCont = ExpCont;
        this.WorldState = WorldState;

        // Cache DOM Elements
        this.Map_Layer = document.getElementById("Map");
        this.Interface_Layer = document.getElementById("Interface");
        this.Location_Layer = document.getElementById("Location_layer");
        this.Sky_layer = document.getElementById("Sky_Layer");
        this.Transition_Mask = document.getElementById("transition_mask");
        this.SVGShield = document.getElementById("SVG_background_shield");
        this.PageContainer = document.getElementById("Scannimals_container_div");

        // Apply Base Styles
        this.SVGShield.style.transition = "opacity 1000ms ease-in-out";
        this.SVGShield.style.strokeWidth = "5px";
        this.SVGShield.style.stroke = "gray";
        this.PageContainer.style.transition = "all 1000ms ease-in-out";
        this.Map_Layer.style.transition = `all ${GenParam.map_zoom_animation_speed}ms ease-in-out`;

        // State Tracking
        this.current_region = "All";
        this.current_action_key_status = false;
        this.previous_action_key_status = false;
        this.Current_Action_Focal_Target = null;
        this.current_nearest_location = false;
        this.currently_in_location = false;

        this.ActiveActionButtonArr = [];
        this.CurrentFennimalIconsOnMap = [];
        this.Arr_IDs_of_Fennimals_currently_on_map = [];

        // Initialize Sub-Controllers
        this.DomeCont = new this.DomeController();
        this.Partner = new this.PartnerIconController(this);
        this.Player = new this.PlayerIconController(this);

        // Setup the Map
        this.assign_outline_IDs();
        this.set_all_map_regions_to_visible();
        this.reset_all_region_opacity_masks();
        this.create_request_instructions_button();

        // Boot Sequence
        this.Partner.jump_to_position(0.5 * GenParam.SVG_width, 0.48 * GenParam.SVG_height);
        this.Partner.update_behavior();

        this.Player.jump_to_map_center();
        this.Player.allow_movement();

        this.Map_Layer.style.display = "inherit";
    }

    // ----------------------------------------------------
    // SETUP & INITIALIZATION
    // ----------------------------------------------------
    assign_outline_IDs() {
        let AllMarkers = document.getElementsByClassName("location_marker");
        for (let i = 0; i < AllMarkers.length; i++) {
            let marker_id = AllMarkers[i].getAttribute("id");
            let marker_region = AllMarkers[i].classList[1].split("_")[2];

            if (marker_id) {
                let MarkerBox = AllMarkers[i].getBBox();
                let MarkerCoords = { x: MarkerBox.x + 0.5 * MarkerBox.width, y: MarkerBox.y + 0.5 * MarkerBox.height };
                let OutlinesInRegion = document.getElementsByClassName("map_location_outline_" + marker_region);
                let ClosestOutline = get_closest_object(MarkerCoords, OutlinesInRegion);

                if (ClosestOutline) {
                    let marker_name = marker_id.split("_")[2];
                    ClosestOutline.Object.setAttribute("id", "location_outline_" + marker_name);

                    if (!GenParam.RegionData[marker_region].Locations) GenParam.RegionData[marker_region].Locations = [];
                    GenParam.RegionData[marker_region].Locations.push(marker_name);
                }
            }
        }
    }

    set_all_map_regions_to_visible() {
        let RegionElems = document.getElementById("Map_bottom_level").childNodes;
        for (let i = 0; i < RegionElems.length; i++) {
            if (RegionElems[i].id && RegionElems[i].id.includes("map_layer")) {
                RegionElems[i].style.display = "inherit";
            }
        }
    }

    // ----------------------------------------------------
    // MAP VIEW MANAGEMENT
    // ----------------------------------------------------
    zoom_map_to_region(region_name) {
        AudioCont.stop_all_region_sounds();

        let coords = GenParam.Map_Region_Centers_Percentage[region_name] || { x: 50, y: 50 };
        let zoom_level = region_name === "All" ? 1 : (region_name === "Home" ? GenParam.map_zoom_level_center : GenParam.map_zoom_level);
        let scale_level = 1 / zoom_level;

        const targetX = GenParam.SVG_width * (coords.x / 100);
        const targetY = GenParam.SVG_height * (coords.y / 100);
        const centerX = GenParam.SVG_width / 2;
        const centerY = GenParam.SVG_height / 2;

        const shiftX = Math.round(centerX - (targetX * scale_level));
        const shiftY = Math.round(centerY - (targetY * scale_level));

        this.Map_Layer.setAttribute('transform', `translate(${shiftX}, ${shiftY}) scale(${scale_level})`);
        this.reset_all_region_opacity_masks();

        if (region_name === "All") {
            Array.from(document.getElementsByClassName("map_region_opacity_mask")).forEach(m => m.style.opacity = 0);
        } else {
            AudioCont.play_region_sound(region_name);
            this.SVGShield.style.fill = GenParam.RegionData[region_name].surrounding_color;
            this.SVGShield.style.stroke = GenParam.RegionData[region_name].darker_color;
            this.PageContainer.style.background = GenParam.RegionData[region_name].surrounding_color;

            if (region_name !== "Home") {
                let activeMask = document.getElementById("map_region_opacity_mask_" + region_name);
                if (activeMask) activeMask.style.opacity = 0;
            }
        }

        if (GenParam.DisplayFoundFennimalIconsOnMap.show && GenParam.DisplayFoundFennimalIconsOnMap.display_only_in_current_region) {
            this.display_all_Fennimal_icon_on_map_for_region(region_name);
        }
    }

    reset_all_region_opacity_masks() {
        Array.from(document.getElementsByClassName("map_region_opacity_mask")).forEach(m => {
            m.style.opacity = GenParam.RegionMaskSetings.base_opacity;
            m.style.transition = "all 1000ms ease-in-out";
        });
    }

    // ----------------------------------------------------
    // PLAYER PROXIMITY & INTERACTION
    // ----------------------------------------------------
    test_player_proximity_to_map_elements() {
        if (this.currently_in_location || this.current_region === "All") return;

        if (this.current_region === "Home") {
            this.home_area_set_opacity_masks();
            this.home_area_check_distance_to_function_buildings();
        } else {
            this.check_location_marker_proximity();
        }

        this.update_action_button();
    }

    home_area_set_opacity_masks() {
        let RegionBoundaryElements = document.getElementsByClassName("map_region_enter");
        let ClosestRegionBoundary = get_closest_object(this.Player.CurrentPlayerPos, RegionBoundaryElements);

        this.reset_all_region_opacity_masks();
        if (ClosestRegionBoundary && ClosestRegionBoundary.dist < 75) {
            let region_name = ClosestRegionBoundary.Object.getAttribute("id").split("_")[3];
            let Mask = document.getElementById("map_region_opacity_mask_" + region_name);
            if (Mask) Mask.style.opacity = 0;
        }
    }

    home_area_check_distance_to_function_buildings() {
        this.current_action_key_status = false;
        let dist_to_watchtower = get_distance_to_object(this.Player.CurrentPlayerPos, document.getElementById("watchtower"));
        if (dist_to_watchtower < 200) {
            this.current_action_key_status = "watchtower";
        }
    }

    check_location_marker_proximity() {
        let LocationMarkers = document.getElementsByClassName("location_marker_" + this.current_region);
        let ClosestMarker = get_closest_object(this.Player.CurrentPlayerPos, LocationMarkers);

        if (ClosestMarker && ClosestMarker.dist < 2 * GenParam.location_detection_distance) {
            let location_name = ClosestMarker.Object.getAttribute("id").split("_")[2];
            this.highlight_nearest_location(location_name);

            if (ClosestMarker.dist < GenParam.location_detection_distance) {
                let status = this.WorldState.get_search_status_of_location(location_name);
                switch (status) {
                    case "unsearched": this.current_action_key_status = "search"; break;
                    case "searched_empty": this.current_action_key_status = "empty_location"; break;
                    case "searched_Fennimal_not_visited": this.current_action_key_status = "enter_location_with_unvisited_Fennimal"; break;
                    case "searched_Fennimal_visited": this.current_action_key_status = "enter_location_with_already_visited_Fennimal"; break;
                    default: this.current_action_key_status = false;
                }
            } else {
                this.current_action_key_status = false;
            }
            this.Current_Action_Focal_Target = ClosestMarker.Object;
        } else {
            this.highlight_nearest_location(false);
            this.current_action_key_status = false;
        }
    }

    highlight_nearest_location(location_name) {
        if (location_name !== this.current_nearest_location) {
            this.current_nearest_location = location_name;
            this.update_nearest_location_highlights();
        }
    }

    update_nearest_location_highlights() {
        Array.from(document.getElementsByClassName("map_location_outline_active")).forEach(o => {
            o.classList.add("map_location_outline");
            o.classList.remove("map_location_outline_active");
        });

        if (!this.current_nearest_location) {
            Interface.Locator.change_locator_name(GenParam.RegionData[this.current_region].display_name);
        } else {
            let status = this.WorldState.get_search_status_of_location(this.current_nearest_location);
            if (status !== false) {
                Interface.Locator.change_locator_name(GenParam.get_display_name_of_location(this.current_nearest_location));
                let outline = document.getElementById("location_outline_" + this.current_nearest_location);
                if (outline) {
                    outline.classList.remove("map_location_outline");
                    if (status !== "searched_empty") outline.classList.add("map_location_outline_active");
                }
            }
        }
    }

    // ----------------------------------------------------
    // ACTION BUTTON MANAGEMENT
    // ----------------------------------------------------
    update_action_button() {
        if (this.previous_action_key_status !== this.current_action_key_status) {
            this.remove_all_action_buttons();

            switch (this.current_action_key_status) {
                case false:
                    Interface.Prompt.hide();
                    break;
                case "search":
                    Interface.Prompt.show_message("You can search around for Fennimals in this area", false);
                    this.show_action_button("magnifier", this.Current_Action_Focal_Target, false, GenParam.ActionButtonParameters_OnObject.warmup_time);
                    break;
                case "watchtower":
                    Interface.Prompt.show_message("You can climb up the tower to get a better view of Fenneland", false);
                    this.show_action_button("binoculars", document.getElementById("watchtower"), ["Enter"], false);
                    break;
                case "watchtower_down":
                    Interface.Prompt.show_message("Click anywhere to go back down again", 1500);
                    this.show_action_button("downstairs", false, ["Escape"], false);
                    break;
                case "empty_location":
                    Interface.Prompt.show_message("There is nothing here at the moment...", false);
                    AudioCont.play_sound_effect("rejected");
                    if (GenParam.can_enter_empty_locations) {
                        this.show_action_button("enter_location_" + this.current_nearest_location, this.Current_Action_Focal_Target, ["Enter"], false);
                    }
                    break;
                case "enter_location_with_unvisited_Fennimal":
                    Interface.Prompt.show_message("There is a Fennimal present at this location!", false);
                    AudioCont.play_sound_effect("success");
                    this.show_action_button("enter_location_" + this.current_nearest_location, this.Current_Action_Focal_Target, ["Enter"], false);
                    break;
            }
            this.previous_action_key_status = this.current_action_key_status;
        }
    }

    show_action_button(button_icon, TargetObject, keyboard_shortcuts_arr, warmup_time) {
        this.remove_all_action_buttons();
        if (button_icon !== false) {
            this.ActiveActionButtonArr.push(new ActionButton(this.Interface_Layer, button_icon, TargetObject, warmup_time, keyboard_shortcuts_arr, () => this.action_key_pressed()));
            AudioCont.play_sound_effect("alert_minimal");
        }
    }

    remove_all_action_buttons() {
        this.ActiveActionButtonArr.forEach(b => b.delete());
        this.ActiveActionButtonArr = [];
    }

    action_key_pressed() {
        this.remove_all_action_buttons();
        switch (this.current_action_key_status) {
            case "watchtower": this.Player.climb_watchtower(); break;
            case "watchtower_down": this.Player.leave_watchtower(); break;
            case "search": this.perform_search_at_current_location(); break;
            case "empty_location":
            case "enter_location_with_unvisited_Fennimal":
            case "enter_location_with_visited_Fennimal":
                this.enter_location(this.current_nearest_location);
                break;
            case "return_to_map": this.return_to_map(); break;
        }
    }

    perform_search_at_current_location() {
        let Closest_Marker = get_closest_object(this.Player.CurrentPlayerPos, document.getElementsByClassName("location_marker_" + this.current_region));
        let location_name = Closest_Marker.Object.getAttribute("id").split("_")[2];

        // FIX: Matrix Projection to bypass the Map's Zoom/Pan!
        let pt = GenParam.SVGObject.createSVGPoint();
        let bbox = Closest_Marker.Object.getBBox();
        pt.x = bbox.x + bbox.width / 2;
        pt.y = bbox.y + bbox.height / 2;

        let screenPt = pt.matrixTransform(Closest_Marker.Object.getScreenCTM());
        let localPt = screenPt.matrixTransform(this.Interface_Layer.getScreenCTM().inverse());

        // Append the ripple to the static Interface_Layer so it doesn't get massive!
        setTimeout(() => create_ripple(this.Interface_Layer, localPt.x, localPt.y, false), 100);

        let Search_outcome = this.WorldState.perform_search_at_location(location_name);
        if (Search_outcome !== "empty_unsearched") {
            this.current_action_key_status = "Fennimal_present";
        }

        this.update_action_button();
    }

    // ----------------------------------------------------
    // WATCHTOWER RIPPLE LOGIC
    // ----------------------------------------------------
    start_watchtower_ripples() {
        // Wait 1000ms for the map to finish zooming out before firing the first wave
        this.watchtower_ripple_timeout = setTimeout(() => {
            this.trigger_watchtower_ripples();
            this.watchtower_ripple_interval = setInterval(() => this.trigger_watchtower_ripples(), 3000);
        }, 900);
    }

    stop_watchtower_ripples() {
        // Clear both the initial delay and the ongoing interval!
        if (this.watchtower_ripple_timeout) {
            clearTimeout(this.watchtower_ripple_timeout);
            this.watchtower_ripple_timeout = null;
        }
        if (this.watchtower_ripple_interval) {
            clearInterval(this.watchtower_ripple_interval);
            this.watchtower_ripple_interval = null;
        }
    }
    trigger_watchtower_ripples() {
        // Filter out only the Fennimals we still need to visit
        let unvisitedFennimals = this.WorldState.get_array_of_Fennimals_on_map().filter(f => !f.visited);

        unvisitedFennimals.forEach(f => {
            let marker = document.getElementById("location_marker_" + f.location);
            if (marker) {
                // Calculate the exact center of the marker
                let pt = GenParam.SVGObject.createSVGPoint();
                let bbox = marker.getBBox();
                pt.x = bbox.x + bbox.width / 2;
                pt.y = bbox.y + bbox.height / 2;

                // Project from the zoomed-out Map layer onto the static Interface layer!
                // This ensures the ripples are drawn at a consistent size regardless of zoom.
                let screenPt = pt.matrixTransform(marker.getScreenCTM());
                let localPt = screenPt.matrixTransform(this.Interface_Layer.getScreenCTM().inverse());

                create_ripple(this.Interface_Layer, localPt.x, localPt.y, true);
            }
        });
    }

    // ----------------------------------------------------
    // SCENE TRANSITIONS
    // ----------------------------------------------------
    hide_all_locations() {
        Array.from(document.getElementsByClassName("location")).forEach(l => l.style.display = "none");
        Array.from(document.getElementsByClassName("location_sky")).forEach(s => s.style.display = "none");
        this.Location_Layer.style.display = "none";
        this.Sky_layer.style.display = "none";
    }

    enter_location(location, optional_switched_region) {
        this.currently_in_location = true;
        this.hide_all_locations();
        this.flash_location_transition_mask(this.current_region);

        if(this.RequestInstructionsButton) this.RequestInstructionsButton.style.display = "none";
        Interface.FenneFinder.hide();

        setTimeout(() => {
            this.Map_Layer.style.display = "none";
            this.Location_Layer.style.display = "inherit";
            document.getElementById("location_" + location).style.display = "inherit";

            this.Sky_layer.style.display = "inherit";
            let sky_id = "sky_" + (optional_switched_region || this.current_region);
            document.getElementById(sky_id).style.display = "inherit";

            // FIX: CAMEL CASED CALL
            this.ExpCont.enteringLocation(location);
        }, 0.5 * GenParam.map_to_location_transition_speed);
    }

    jump_player_to_location(location, region) {
        this.current_region = region;
        this.enter_location(location, region);
        Interface.player_moved_to_new_region(region);
        this.SVGShield.style.fill = GenParam.RegionData[region].surrounding_color;
        this.SVGShield.style.stroke = GenParam.RegionData[region].color;
        this.PageContainer.style.background = GenParam.RegionData[region].surrounding_color;
    }

    allow_participant_to_leave_location(add_keyboard_shortcut) {
        if (this.currently_in_location) {
            this.show_action_button("return_arrow", "center", add_keyboard_shortcut ? ["Escape", "Enter", " "] : false, false);
            this.current_action_key_status = "return_to_map";
        }
    }

    return_to_map() {
        if (this.currently_in_location) {
            this.flash_location_transition_mask(this.current_region);
            setTimeout(() => {
                this.Map_Layer.style.display = "inherit";
                this.hide_all_locations();
                this.ExpCont.checkIfFennefinderShouldBeShown();

            }, 0.5 * GenParam.map_to_location_transition_speed);
            if(this.RequestInstructionsButton) this.RequestInstructionsButton.style.display = "inherit";
        } else {
            this.Map_Layer.style.display = "inherit";
            this.hide_all_locations();
            this.ExpCont.checkIfFennefinderShouldBeShown();
        }

        this.currently_in_location = false;

        // FIX: CAMEL CASED CALL
        this.ExpCont.leavingLocation();

        this.Partner.update_behavior();

    }

    reset_map_to_player_in_center() {
        this.return_to_map();
        this.Player.jump_to_map_center();

        if (GenParam.DisplayFoundFennimalIconsOnMap.show && GenParam.DisplayFoundFennimalIconsOnMap.display_only_in_current_region) {
            this.display_all_Fennimal_icon_on_map_for_region("Home");
        }

        this.Partner.jump_to_map_center();
        this.Partner.update_behavior();
    }

    flash_location_transition_mask(optional_region) {
        let color = "black";
        if (optional_region && optional_region !== "All" && GenParam.RegionData[optional_region]) {
            color = GenParam.RegionData[optional_region].lighter_color;
        }
        document.getElementById("transition_mask_rect").style.fill = color;

        this.Transition_Mask.style.animation = `map_transition_animation ${GenParam.map_to_location_transition_speed}ms ease-in-out forwards`;
        setTimeout(() => this.Transition_Mask.style.animation = "", GenParam.map_to_location_transition_speed);
    }

    // ----------------------------------------------------
    // GLOBAL STATE HOOKS
    // ----------------------------------------------------
    disable_map_interactions() {
        this.Player.disable_movement();
        AudioCont.stop_all_region_sounds();
    }

    enable_map_interactions() {
        this.Player.allow_movement();
        AudioCont.play_region_sound(this.current_region);
        this.Partner.update_behavior();
    }

    create_request_instructions_button() {
        this.RequestInstructionsButton = create_SVG_buttonElement(GenParam.RequestInstructionButtonSettings.center_x, GenParam.RequestInstructionButtonSettings.center_y, GenParam.RequestInstructionButtonSettings.width, GenParam.RequestInstructionButtonSettings.height, GenParam.RequestInstructionButtonSettings.text, GenParam.RequestInstructionButtonSettings.textsize);
        this.Interface_Layer.appendChild(this.RequestInstructionsButton);
        this.RequestInstructionsButton.style.display = "none";
        this.RequestInstructionsButton.style.fontWeight = GenParam.RequestInstructionButtonSettings.fontWeight;
        this.RequestInstructionsButton.classList.add("do_not_move_on_click");

        this.RequestInstructionsButton.onpointerdown = () => {
            AudioCont.play_sound_effect("button_click");

            // FIX: CAMEL CASED CALL
            this.ExpCont.instructionsRequested();
        };
    }

    show_request_instructions_button() {
        if(this.RequestInstructionsButton) this.RequestInstructionsButton.style.display = "inherit";
    }

    // ----------------------------------------------------
    // FENNIMAL ICONS ON MAP
    // ----------------------------------------------------
    add_Fennimal_icon_on_map(FenObj) {
        if (!this.Arr_IDs_of_Fennimals_currently_on_map.includes(FenObj.id)) {
            this.CurrentFennimalIconsOnMap.push(new this.FennimalIconOnMap(FenObj, this.Map_Layer));
            this.Arr_IDs_of_Fennimals_currently_on_map.push(FenObj.id);
        }
    }

    clear_all_Fennimal_icons_from_map() {
        this.CurrentFennimalIconsOnMap.forEach(icon => icon.remove());
        this.CurrentFennimalIconsOnMap = [];
        this.Arr_IDs_of_Fennimals_currently_on_map = [];
    }

    display_all_Fennimal_icon_on_map_for_region(region) {
        this.CurrentFennimalIconsOnMap.forEach(icon => icon.display_only_if_in_region(region));
    }

    update_player_settings() {
        this.Partner.update_settings();
        this.Player.update_settings();
    }

    enforce_dome_until_tower_climbed() {
        Interface.Prompt.show_message("First climb the watchtower to get an overview of Fenneland");
        this.DomeCont.raise_dome_with_arrow();
        this.DomeCont.dome_visible_until_tower_climbed = true;
        this.DomeCont.dome_message_interval = setInterval(() => {
            Interface.Prompt.show_message("First climb the watchtower to get an overview of Fenneland");
        }, 1000);
    }

    // ====================================================
    // SUB-CLASSES (Tightly coupled logic)
    // ====================================================

    DomeController = class {
        constructor() {
            this.Dome = document.getElementById("centerdome");
            this.DomeBlock = document.getElementById("dome_block_element");
            this.DomeArrow = document.getElementById("dome_arrow");

            this.Dome.style.opacity = 0;
            this.DomeBlock.style.opacity = 0;
            this.Dome.style.display = "none";
            this.DomeBlock.classList.remove("map_block");
            this.DomeArrow.style.display = "none";
            this.DomeArrow.style.opacity = 0;
            this.Dome.style.transition = "all 500ms ease-in-out";
            this.DomeArrow.style.transition = "all 500ms ease-in-out";
            this.dome_visible_until_tower_climbed = false;
        }
        raise_dome_with_arrow() {
            this.Dome.style.display = "inherit";
            this.DomeBlock.classList.add("map_block");
            this.DomeArrow.style.display = "inherit";

            // Force reflow
            window.getComputedStyle(this.Dome).opacity;
            this.Dome.style.opacity = 1;
            setTimeout(() => this.DomeArrow.style.opacity = 1, 500);
        }
        collapse_dome() {
            this.DomeArrow.style.opacity = 0;
            setTimeout(() => {
                this.Dome.style.opacity = 0;
                this.DomeBlock.classList.remove("map_block");
            }, 500);
            setTimeout(() => {
                this.Dome.style.display = "none";
                this.DomeArrow.style.display = "none";
            }, 1000);
        }
    };

    FennimalIconOnMap = class {
        constructor(FenObj, MapLayer) {
            this.FenObj = FenObj;
            this.BoxSettings = { width: 60, height: 60, offset_x: -5, offset_y: -50, inner_size_factor: 0.9, max_opacity: 0.8 };

            // Manual tweaks per location
            switch (FenObj.location) {
                case "Lake": this.BoxSettings.offset_x = -30; this.BoxSettings.offset_y = 10; break;
                case "Statue": this.BoxSettings.offset_x = 20; break;
                case "Fountain": this.BoxSettings.offset_y = 0; this.BoxSettings.offset_x = -30; break;
                case "Farm": this.BoxSettings.offset_y = 0; this.BoxSettings.offset_x = 30; break;
                case "Dam": this.BoxSettings.offset_y = -60; this.BoxSettings.offset_x = 10; break;
                case "Waterfall": this.BoxSettings.offset_x = -20; break;
                case "Cliff": this.BoxSettings.offset_x = 30; this.BoxSettings.offset_y = 30; break;
                case "Rainforest": this.BoxSettings.offset_x = -20; break;
                case "Bush": this.BoxSettings.offset_y = 0; this.BoxSettings.offset_x = -20; break;
                case "Port": this.BoxSettings.offset_y = 0; break;
                case "Iceberg": this.BoxSettings.offset_y = -10; this.BoxSettings.offset_x = -25; break;
                case "Igloo": this.BoxSettings.offset_y = 0; this.BoxSettings.offset_x = -25; break;
                case "Pineforest": this.BoxSettings.offset_y = -10; break;
            }

            let TargetLocationMaker = document.getElementById("location_marker_" + FenObj.location);
            let MapCoords = { x: TargetLocationMaker.getBBox().x, y: TargetLocationMaker.getBBox().y };

            this.FennimalIconGroup = create_SVG_group(0, 0);
            let Outer = create_SVG_rect(0, 0, this.BoxSettings.width + "px", this.BoxSettings.height + "px");
            Outer.style.fill = GenParam.RegionData[FenObj.region].color; Outer.style.rx = "5px";

            let Inner = create_SVG_rect((0.5 * (1 - this.BoxSettings.inner_size_factor) * this.BoxSettings.width) + "px",
                (0.5 * (1 - this.BoxSettings.inner_size_factor) * this.BoxSettings.height) + "px",
                (this.BoxSettings.inner_size_factor * this.BoxSettings.width) + "px",
                (this.BoxSettings.inner_size_factor * this.BoxSettings.height) + "px");
            Inner.style.fill = GenParam.RegionData[FenObj.region].lighter_color; Inner.style.rx = "3px";

            let Icon = GenParam.DisplayFoundFennimalIconsOnMap.icon_type === "full" ?
                create_Fennimal_SVG_object(FenObj, GenParam.Fennimal_head_size, false) :
                create_Fennimal_SVG_object_head_only(FenObj, false);


            this.FennimalIconGroup.appendChild(Outer);
            this.FennimalIconGroup.appendChild(Inner);
            this.FennimalIconGroup.appendChild(Icon);
            MapLayer.appendChild(this.FennimalIconGroup);

            let scale_factor_w = 1 / (Icon.getBBox().width / (this.BoxSettings.inner_size_factor * this.BoxSettings.width));
            let scale_factor_h = 1 / (Icon.getBBox().height / (this.BoxSettings.inner_size_factor * this.BoxSettings.height));
            let min_scale_factor = Math.floor(Math.min(scale_factor_w, scale_factor_h) * 100) / 100;

            let ScaleGroup = Icon.getElementsByClassName("Fennimal_scale_group")[0];
            ScaleGroup.style.transform = `scale(${min_scale_factor})`;

            let NewBox = Icon.getBBox();
            let TargetCenter = { x: Math.round(0.5 * this.BoxSettings.width), y: Math.round(0.5 * this.BoxSettings.height) };
            Icon.style.transform = `translate(${TargetCenter.x - (NewBox.x + 0.5 * NewBox.width)}px, ${TargetCenter.y - (NewBox.y + 0.5 * NewBox.height)}px)`;

            this.FennimalIconGroup.style.transform = `translate(${Math.round(MapCoords.x + this.BoxSettings.offset_x)}px, ${Math.round(MapCoords.y + this.BoxSettings.offset_y)}px)`;
            this.FennimalIconGroup.style.opacity = this.BoxSettings.max_opacity;
            this.FennimalIconGroup.style.transition = "all 1000ms ease-in-out";
        }
        remove() { this.FennimalIconGroup.remove(); }
        display_only_if_in_region(region) {
            let should_display = (this.FenObj.region === region) || (GenParam.DisplayFoundFennimalIconsOnMap.display_all_icons_on_watchtower && region === "All");
            this.FennimalIconGroup.style.opacity = should_display ? this.BoxSettings.max_opacity : 0;
        }
    };

    PlayerIconController = class {
        constructor(MapCont) {
            this.MapCont = MapCont;
            this.player_speed = GenParam.Speedlimits.default;
            this.CurrentPlayerPos = { x: 0, y: 0 };
            this.player_current_direction = null;

            this.is_dragging = false;
            this.MouseTargetCoords = { x: 0, y: 0 };

            this.PlayerIconData = {};
            this.populate_player_icon_data();

            this.PlayerIcon = create_SVG_group(false, false, false, "PlayerIconGroup");
            this.PlayerIcon.style.pointerEvents = "none";
            this.PlayerIcon.style.transition = "none";
            document.getElementById("Map_player_level").appendChild(this.PlayerIcon);

            this.animationFrameId = null;

            // FIX: Use DOM Level 0 events to guarantee nothing blocks the clicks!
            document.onpointerdown = (e) => {
                if (!this.MapCont.currently_in_location && this.MapCont.player_allowed_to_move) {
                    if (!e.target.classList.contains("do_not_move_on_click")) {
                        this.is_dragging = true;
                        this.setMouseTargetCoords(e);
                    }
                    if (this.MapCont.current_player_status === "in_watchtower") {
                        this.leave_watchtower();
                    }
                }
            };

            document.onpointerup = () => { this.is_dragging = false; };
            document.onpointerleave = () => { this.is_dragging = false; };

            document.onpointermove = (e) => {
                if (this.is_dragging && this.MapCont.player_allowed_to_move) {
                    this.setMouseTargetCoords(e);
                }
            };
        }

        populate_player_icon_data() {
            this.PlayerIconData.FrontElem = this.MapCont.WorldState.get_person_icon("player", "front");
            this.PlayerIconData.BackElem = this.MapCont.WorldState.get_person_icon("player", "back");
            this.PlayerIconData.LeftElem = this.MapCont.WorldState.get_person_icon("player", "left");
            this.PlayerIconData.RightElem = this.MapCont.WorldState.get_person_icon("player", "right");

            let scale = this.MapCont.WorldState.get_player_icon_settings().scale_factor;
            if (typeof scale === "number") {
                ["FrontElem", "BackElem", "LeftElem", "RightElem"].forEach(el => this.PlayerIconData[el].style.transform = `scale(${scale})`);
            }
        }

        update_settings() {
            this.populate_player_icon_data();
            this.update_player_icon_direction("up", true);
            this.update_player_icon_direction("down", true);
        }

        update_player_icon_direction(new_direction, force = false) {
            if (this.player_current_direction !== new_direction || force) {
                this.PlayerIcon.innerHTML = "";
                switch(new_direction) {
                    case "up": this.PlayerIcon.appendChild(this.PlayerIconData.BackElem.cloneNode(true)); break;
                    case "down": this.PlayerIcon.appendChild(this.PlayerIconData.FrontElem.cloneNode(true)); break;
                    case "left": this.PlayerIcon.appendChild(this.PlayerIconData.LeftElem.cloneNode(true)); break;
                    case "right": this.PlayerIcon.appendChild(this.PlayerIconData.RightElem.cloneNode(true)); break;
                }
                this.player_current_direction = new_direction;
            }
        }

        allow_movement() {
            this.MapCont.player_allowed_to_move = true;
            this.Check_Proximity_Interval = setInterval(() => this.MapCont.test_player_proximity_to_map_elements(), 250);
            this.start_render_loop();
        }

        disable_movement() {
            this.MapCont.player_allowed_to_move = false;
            this.is_dragging = false;
            clearInterval(this.Check_Proximity_Interval);

            // Kill the loop to save memory
            if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        update_icon_position() {
            this.PlayerIcon.style.transform = `translate(${this.CurrentPlayerPos.x}px, ${this.CurrentPlayerPos.y}px)`;
        }

        jump_to_map_center() {
            this.MapCont.current_region = "Home";
            this.MapCont.zoom_map_to_region("Home");
            this.CurrentPlayerPos = { x: 0.5 * GenParam.SVG_width, y: 0.5 * GenParam.SVG_height };
            this.update_icon_position();
            this.update_player_icon_direction("down");
        }

        check_if_coords_valid(x, y) {
            if (x < 0 || y < 0 || x > GenParam.SVG_width || y > GenParam.SVG_height) return false;

            let PointObj = GenParam.SVGObject.createSVGPoint();
            PointObj.x = x; PointObj.y = y;

            let blocks = GenParam.SVGObject.getElementsByClassName("map_block");
            for (let i = 0; i < blocks.length; i++) if (blocks[i].isPointInFill(PointObj)) return false;

            let region_blocks = GenParam.SVGObject.getElementsByClassName("map_block_" + this.MapCont.current_region);
            for (let i = 0; i < region_blocks.length; i++) if (region_blocks[i].isPointInFill(PointObj)) return false;

            return true;
        }

        attempt_to_move_to_coords(x, y) {
            if (x !== this.CurrentPlayerPos.x || y !== this.CurrentPlayerPos.y) {
                if (this.check_if_coords_valid(x, y)) {
                    let delta_x = x - this.CurrentPlayerPos.x;
                    let delta_y = y - this.CurrentPlayerPos.y;

                    this.CurrentPlayerPos = { x: parseFloat(x), y: parseFloat(y) };
                    this.update_icon_position();

                    if (Math.abs(delta_x) > Math.abs(delta_y)) {
                        this.update_player_icon_direction(delta_x > 0 ? "right" : "left");
                    } else {
                        this.update_player_icon_direction(delta_y > 0 ? "down" : "up");
                    }

                    if (this.MapCont.Partner) this.MapCont.Partner.player_moved_to_location(x, y);
                    Interface.FenneFinder.update_player_location(this.CurrentPlayerPos);

                    this.check_for_region_shift();
                }
            }
        }

        check_for_region_shift() {
            let PointObj = GenParam.SVGObject.createSVGPoint();
            PointObj.x = this.CurrentPlayerPos.x; PointObj.y = this.CurrentPlayerPos.y;

            if (this.MapCont.current_region === "Home") {
                let enters = GenParam.SVGObject.getElementsByClassName("map_region_enter");
                for (let i = 0; i < enters.length; i++) {
                    if (enters[i].isPointInFill(PointObj)) {
                        let new_region = enters[i].id.replace("map_region_enter_", "");
                        this.MapCont.current_region = new_region;
                        this.MapCont.zoom_map_to_region(new_region);
                        Interface.player_moved_to_new_region(new_region);
                        break;
                    }
                }
            } else {
                let leaves = GenParam.SVGObject.getElementsByClassName("map_region_leave");
                for (let i = 0; i < leaves.length; i++) {
                    if (leaves[i].isPointInFill(PointObj)) {
                        this.MapCont.current_region = "Home";
                        this.MapCont.zoom_map_to_region("Home");
                        Interface.player_moved_to_new_region("Home");
                        break;
                    }
                }
            }
        }

        setMouseTargetCoords(event) {
            let mousepos = getMousePosition_with_transforms(this.MapCont.Map_Layer, event);
            this.MouseTargetCoords = { x: mousepos.x, y: mousepos.y };
        }

        start_render_loop() {
            if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

            const loop = () => {
                if (this.is_dragging && this.MapCont.player_allowed_to_move) {
                    this.move_icon_towards_mouse_target_coords();
                }
                this.animationFrameId = requestAnimationFrame(loop);
            };
            this.animationFrameId = requestAnimationFrame(loop);
        }

        move_icon_towards_mouse_target_coords() {
            this.player_speed = GenParam.Speedlimits.default;
            let PointObj = GenParam.SVGObject.createSVGPoint();
            PointObj.x = this.CurrentPlayerPos.x; PointObj.y = this.CurrentPlayerPos.y;

            let roads = GenParam.SVGObject.getElementsByClassName("map_road_" + this.MapCont.current_region);
            for (let i = 0; i < roads.length; i++) if (roads[i].isPointInFill(PointObj)) this.player_speed = GenParam.Speedlimits.road;

            // FIX: Apply a 60% speed reduction multiplier to the final speed!
            let active_speed = this.player_speed * 0.6;

            let dist_to_mouse = EUDistPoints(this.CurrentPlayerPos, this.MouseTargetCoords);
            if (dist_to_mouse > GenParam.player_minimum_move_distance) {
                let angleRad = Math.atan2(this.MouseTargetCoords.y - this.CurrentPlayerPos.y, this.MouseTargetCoords.x - this.CurrentPlayerPos.x);
                let x_delta = active_speed * Math.cos(angleRad);
                let y_delta = active_speed * Math.sin(angleRad);
                this.attempt_to_move_to_coords(Math.round(this.CurrentPlayerPos.x + x_delta), Math.round(this.CurrentPlayerPos.y + y_delta));
            }
        }

        climb_watchtower() {
            this.MapCont.current_action_key_status = false;
            this.MapCont.current_player_status = "transition";
            this.MapCont.current_region = "All";
            this.disable_movement();

            this.PlayerIcon.style.transition = "all 500ms ease-out";
            setTimeout(() => {
                let Base_marker = document.getElementById("map_watchtower_start");
                this.attempt_to_move_to_coords(Base_marker.getAttribute("cx"), Base_marker.getAttribute("cy"));

                setTimeout(() => {
                    this.PlayerIcon.style.transition = "all 2s ease-out";
                    let Top_marker = document.getElementById("map_watchtower_end");
                    this.attempt_to_move_to_coords(Top_marker.getAttribute("cx"), Top_marker.getAttribute("cy"));

                    setTimeout(() => {
                        this.MapCont.zoom_map_to_region("All");
                        this.MapCont.current_player_status = "in_watchtower";
                        this.MapCont.current_action_key_status = "watchtower_down";
                        this.MapCont.update_action_button();
                        this.MapCont.start_watchtower_ripples();

                    }, 2000);
                }, 500);
            }, 10);

            if (this.MapCont.DomeCont.dome_visible_until_tower_climbed) {
                setTimeout(() => {
                    clearInterval(this.MapCont.DomeCont.dome_message_interval);
                    this.MapCont.DomeCont.dome_visible_until_tower_climbed = false;
                    this.MapCont.DomeCont.collapse_dome();
                }, 1000);
            }
        }

        leave_watchtower() {
            this.MapCont.current_action_key_status = false;
            this.MapCont.current_region = "Home";
            this.MapCont.zoom_map_to_region("Home");
            this.MapCont.stop_watchtower_ripples();

            this.PlayerIcon.style.transition = "all 2s ease-in";
            Interface.Prompt.hide();
            this.MapCont.current_player_status = "transition";

            setTimeout(() => {
                let Base_marker = document.getElementById("map_watchtower_start");
                this.attempt_to_move_to_coords(Base_marker.getAttribute("cx"), Base_marker.getAttribute("cy"));

                setTimeout(() => {
                    this.MapCont.current_action_key_status = "watchtower";
                    this.MapCont.current_player_status = false;
                    this.PlayerIcon.style.transition = "none";
                    this.allow_movement();
                }, 2200);
            }, 100);
        }
    };

    PartnerIconController = class {
        constructor(MapCont) {
            this.MapCont = MapCont;
            this.PartnerIconPos = { x: 0, y: 0 };
            this.TargetPos = false;
            this.currently_following_player = false;
            this.currently_on_the_move = false;
            this.animationFrameId = null;

            this.PartnerIcon = create_SVG_group(false, false, false, "PartnerIconGroup");
            this.PartnerIcon.style.pointerEvents = "none";
            this.PartnerIcon.style.transition = "none";
            document.getElementById("Map_player_level").appendChild(this.PartnerIcon);

            this.PartnerIconData = {};
            this.populate_partner_icon_data();
            this.icon_current_direction = null;
        }

        populate_partner_icon_data() {
            this.PartnerIconData.FrontElem = this.MapCont.WorldState.get_person_icon("partner", "front");
            this.PartnerIconData.BackElem = this.MapCont.WorldState.get_person_icon("partner", "back");
            this.PartnerIconData.LeftElem = this.MapCont.WorldState.get_person_icon("partner", "left");
            this.PartnerIconData.RightElem = this.MapCont.WorldState.get_person_icon("partner", "right");

            // FIX: Fetch the partner's scale factor.
            // We use the player's scale as a fallback just in case it wasn't explicitly defined!
            let scale = this.MapCont.WorldState.get_partner_icon_settings().scale_factor;
            if (typeof scale !== "number") {
                scale = this.MapCont.WorldState.get_player_icon_settings().scale_factor;
            }

            // Apply the scale to all 4 directional views
            if (typeof scale === "number") {
                ["FrontElem", "BackElem", "LeftElem", "RightElem"].forEach(el => {
                    this.PartnerIconData[el].style.transform = `scale(${scale})`;
                });
            }
        }

        update_settings() {
            this.populate_partner_icon_data();
            this.update_icon_direction("up", true);
            this.update_icon_direction("down", true);
        }

        update_icon_direction(new_direction, force = false) {
            if (this.icon_current_direction !== new_direction || force) {
                this.PartnerIcon.innerHTML = "";
                switch(new_direction){
                    case "up": this.PartnerIcon.appendChild(this.PartnerIconData.BackElem.cloneNode(true)); break;
                    case "down": this.PartnerIcon.appendChild(this.PartnerIconData.FrontElem.cloneNode(true)); break;
                    case "left": this.PartnerIcon.appendChild(this.PartnerIconData.LeftElem.cloneNode(true)); break;
                    case "right": this.PartnerIcon.appendChild(this.PartnerIconData.RightElem.cloneNode(true)); break;
                }
                this.icon_current_direction = new_direction;
            }
        }

        start_render_loop() {
            if(this.animationFrameId) return;
            const loop = () => {
                this.step_logic();
                this.animationFrameId = requestAnimationFrame(loop);
            };
            this.animationFrameId = requestAnimationFrame(loop);
        }

        step_logic() {
            if (this.currently_following_player && this.TargetPos) {
                let dist_to_player = EUDistPoints(this.PartnerIconPos, this.TargetPos);
                let critical_movement_distance = this.currently_on_the_move ? 40 : 70;

                if (this.MapCont.WorldState.get_current_partner_role() === "active") {
                    if (dist_to_player > critical_movement_distance) {
                        this.currently_on_the_move = true;

                        let x_delta = this.TargetPos.x - this.PartnerIconPos.x;
                        let y_delta = this.TargetPos.y - this.PartnerIconPos.y;

                        // 1. Visual direction updating
                        if (Math.abs(x_delta) > Math.abs(y_delta)) {
                            this.update_icon_direction(x_delta > 0 ? "right" : "left");
                        } else {
                            this.update_icon_direction(y_delta > 0 ? "down" : "up");
                        }

                        // 2. Trigonometric trajectory (Matches the Player's math!)
                        let angleRad = Math.atan2(y_delta, x_delta);

                        // 3. Speed Calculation
                        let base_speed = 3.5; // Solid starting speed, no crawling

                        // Rubber-banding: speed increases slightly if they fall far behind
                        let dynamic_speed = base_speed + (dist_to_player * 0.000);

                        // HARD CAP: Never exceed 6.5 (fast enough to catch up to the player's 4.8, but never teleporting)
                        let active_speed = Math.min(4, dynamic_speed);

                        // Ensure we don't mathematically overshoot the target in the final frame
                        active_speed = Math.min(active_speed, dist_to_player);

                        // 4. Apply vector velocity
                        this.PartnerIconPos.x += active_speed * Math.cos(angleRad);
                        this.PartnerIconPos.y += active_speed * Math.sin(angleRad);

                        this.PartnerIcon.style.transform = `translate(${this.PartnerIconPos.x}px, ${this.PartnerIconPos.y}px)`;
                    } else {
                        this.currently_on_the_move = false;
                    }
                }
            }
        }

        player_moved_to_location(new_location_x, new_location_y) {
            this.TargetPos = { x: new_location_x, y: new_location_y };
        }

        jump_to_position(x, y) {
            this.PartnerIconPos = { x: x, y: y };
            this.TargetPos = false;
            this.PartnerIcon.style.transform = `translate(${x}px, ${y}px)`;
            this.update_icon_direction("down");
        }

        jump_to_map_center() {
            this.jump_to_position(0.5 * GenParam.SVG_width, 0.5 * GenParam.SVG_height);
            if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        update_behavior() {
            let role = this.MapCont.WorldState.get_current_partner_role();
            if (role === "active" || role === "passive") {
                this.PartnerIcon.style.display = "inherit";
                this.currently_following_player = (role === "active");
                this.start_render_loop();
            } else {
                this.PartnerIcon.style.display = "none";
                this.currently_following_player = false;
                if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }
    };
}

console.log("%c SCRIPTS - LOADED MAP CONTROLLER", "color:darkgreen")