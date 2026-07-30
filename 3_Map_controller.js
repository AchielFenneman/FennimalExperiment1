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
        this.register_map_locations()
        this.initialize_phone_booth();
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

    register_map_locations() {
        let AllMarkers = document.getElementsByClassName("location_marker");

        for (let i = 0; i < AllMarkers.length; i++) {
            let marker_id = AllMarkers[i].getAttribute("id"); // e.g., "location_marker_lake"

            if (marker_id) {
                // e.g., from "map_marker_Jungle"
                let marker_region = AllMarkers[i].classList[1].split("_")[2];
                let marker_name = marker_id.split("_")[2]; // "lake"

                // DEFENSIVE: Restore the GenParam array!
                if (!GenParam.RegionData[marker_region].Locations) {
                    GenParam.RegionData[marker_region].Locations = [];
                }

                // Prevent duplicates just in case
                if (!GenParam.RegionData[marker_region].Locations.includes(marker_name)) {
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
    should_play_travel_sound() {
        // Skip behind-the-scenes zooms (phase resets, phone room off-map setup, etc.)
        let mapRoot = document.getElementById("Map");
        if (!mapRoot || mapRoot.style.display === "none") return false;
        if (!this.Map_Layer || this.Map_Layer.style.display === "none") return false;
        if (this.currently_in_location) return false;

        // Audible while freely exploring, or while watching an on-screen auto-travel.
        return !!this.player_allowed_to_move || !!this.autoTravelWash || !!this.autoTravelFrameId;
    }

    zoom_map_to_region(region_name) {
        AudioCont.stop_all_region_sounds();
        if (region_name !== "All" && this.should_play_travel_sound()) {
            AudioCont.play_sound_effect("travel");
        }

        let coords = GenParam.Map_Region_Centers_Percentage[region_name] || { x: 50, y: 50 };
        let zoom_level = region_name === "All" ? 1 : (region_name === "Home" ? GenParam.map_zoom_level_center : GenParam.map_zoom_level);
        let scale_level = 1 / zoom_level;

        const targetX = GenParam.SVG_width * (coords.x / 100);
        const targetY = GenParam.SVG_height * (coords.y / 100);
        const centerX = GenParam.SVG_width / 2;
        const centerY = GenParam.SVG_height / 2;

        const shiftX = Math.round(centerX - (targetX * scale_level));
        const shiftY = Math.round(centerY - (targetY * scale_level));

        // STRATEGY 1 REMAINS: Offload math to the GPU via CSS
        this.Map_Layer.style.transform = `translate(${shiftX}px, ${shiftY}px) scale(${scale_level})`;

        // (Strategy 2 Culling has been entirely removed)

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
            // Reverted back to your smooth, semi-transparent masks!
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

        let phone_marker = document.getElementById("map_phone_booth_marker");
        if (phone_marker) {
            let dist_to_phone = get_distance_to_object(this.Player.CurrentPlayerPos, phone_marker);

            // It only becomes an active button IF it is currently ringing!
            if (dist_to_phone < 150 && this.ExpCont.isPhoneRinging) {
                this.current_action_key_status = "phone_booth";
            }
        }
    }

    check_location_marker_proximity() {
        // During manual phone-room return, ignore location markers (only #phone_room completes).
        if (this.awaitingPhoneRoomProximityReturn) {
            this.current_nearest_location = false;
            this.update_nearest_location_highlights();
            this.current_action_key_status = false;
            return;
        }

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
        // 1. Remove the glow from ALL location graphics
        Array.from(document.getElementsByClassName("map_location_graphic_active")).forEach(icon => {
            icon.classList.remove("map_location_graphic_active");
            icon.style.filter = "none"; // Strip the CSS drop-shadow
        });

        if (!this.current_nearest_location) {
            Interface.Locator.change_locator_name(GenParam.RegionData[this.current_region].display_name);
        } else {
            let status = this.WorldState.get_search_status_of_location(this.current_nearest_location);
            if (status !== false) {
                Interface.Locator.change_locator_name(GenParam.get_display_name_of_location(this.current_nearest_location));

                // 2. Find the actual visual graphic!
                // --- THE FIX: Force the location name to lowercase to match your SVG IDs! ---
                let search_id = "map_location_icon_" + String(this.current_nearest_location).toLowerCase();
                let iconGraphic = document.getElementById(search_id);
                // ----------------------------------------------------------------------------

                if (iconGraphic && status !== "searched_empty") {
                    iconGraphic.classList.add("map_location_graphic_active");

                    // 3. Apply a dynamic, perfectly contoured glow!
                    let glowColor = GenParam.RegionData[this.current_region].darker_color || "gold";
                    iconGraphic.style.filter = `drop-shadow(0px 0px 8px ${glowColor}) drop-shadow(0px 0px 30px ${glowColor})`;
                    iconGraphic.style.transition = "filter 300ms ease-in-out";
                } else if (!iconGraphic && status !== "searched_empty") {
                    // DEFENSIVE DEBUGGING: If it fails, print exactly what it was looking for!
                    console.warn(`Glow failed: Could not find element with ID '${search_id}'`);
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
                case "enter_location_with_already_visited_Fennimal":
                    Interface.Prompt.show_message("You have already visited this Fennimal.", false);
                    break;
                case "phone_booth":
                    Interface.Prompt.show_message("Answer the call", false);
                    // Changed "magnifier" to "phone" to use your new icon!
                    this.show_action_button("phone", document.getElementById("phone_booth"), ["Enter"], false);
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
                this.enter_location(this.current_nearest_location); // <-- Restored this command!
                break;
            case "return_to_map": this.return_to_map(); break;
            case "phone_booth": this.ExpCont.phoneBoothAnswered(); break;
        }
    }

    perform_search_at_current_location() {
        let Closest_Marker = get_closest_object(this.Player.CurrentPlayerPos, document.getElementsByClassName("location_marker_" + this.current_region));
        let location_name = Closest_Marker.Object.getAttribute("id").split("_")[2];

        // Matrix Projection to bypass the Map's Zoom/Pan!
        let pt = GenParam.SVGObject.createSVGPoint();
        let bbox = Closest_Marker.Object.getBBox();
        pt.x = bbox.x + bbox.width / 2;
        pt.y = bbox.y + bbox.height / 2;

        let screenPt = pt.matrixTransform(Closest_Marker.Object.getScreenCTM());
        let localPt = screenPt.matrixTransform(this.Interface_Layer.getScreenCTM().inverse());

        // Append the ripple to the static Interface_Layer so it doesn't get massive!
        setTimeout(() => create_ripple(this.Interface_Layer, localPt.x, localPt.y, false), 100);

        // FIX: Perform the search, then use the standard proximity check to perfectly map the new button state!
        this.WorldState.perform_search_at_location(location_name);
        this.check_location_marker_proximity();
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
    // PHONE BOOTH
    // ----------------------------------------------------
    initialize_phone_booth() {
        let assembly = document.getElementById("phone_booth_antenna_assembly");
        let pivot = document.getElementById("phone_booth_dish_pivot_point");

        if (assembly && pivot) {
            // 1. Get the LOCAL coordinates directly from the pivot's bounding box
            let box = pivot.getBBox();
            let px = box.x + (box.width / 2);
            let py = box.y + (box.height / 2);

            // Set the origin using those precise local coordinates
            assembly.style.transformOrigin = `${px}px ${py}px`;
            assembly.classList.add("scanning_antenna");
        }

        let light = document.getElementById("phone_booth_light");
        let tip = document.getElementById("phone_booth_dish_antenna_tip");

        if (light) {
            light.style.opacity = 1;
            light.classList.remove("ringing_police_light");
        }
        if (tip) {
            tip.style.opacity = 1;
            tip.classList.remove("ringing_antenna_tip");
        }
    }

    start_phone_ringing() {
        let assembly = document.getElementById("phone_booth_antenna_assembly");
        if (assembly) assembly.classList.remove("scanning_antenna");

        let light = document.getElementById("phone_booth_light");
        let tip = document.getElementById("phone_booth_dish_antenna_tip");
        if (light) light.classList.add("ringing_police_light");
        if (tip) tip.classList.add("ringing_antenna_tip");

        const trigger_ring_cycle = () => {
            AudioCont.play_sound_effect("phone_ring");

            if (tip && tip.parentNode) {

                // 1. BULLETPROOF MATRIX MATH: Find the absolute local center!
                let pt = GenParam.SVGObject.createSVGPoint();
                let box = tip.getBBox();
                pt.x = box.x + (box.width / 2);
                pt.y = box.y + (box.height / 2);

                // Project the local bounding box to screen pixels, then down into the parent's layer
                let screenTip = pt.matrixTransform(tip.getScreenCTM());
                let localTip = screenTip.matrixTransform(tip.parentNode.getScreenCTM().inverse());

                const spawnWave = (delayTime) => {
                    setTimeout(() => {
                        let ripple = document.createElementNS("http://www.w3.org/2000/svg", 'circle');

                        // 2. Draw the circle exactly at the translated coordinates
                        ripple.setAttribute("cx", localTip.x);
                        ripple.setAttribute("cy", localTip.y);
                        ripple.setAttribute("r", "15");

                        ripple.style.fill = "none";
                        ripple.style.stroke = "#80e5ff";
                        ripple.style.strokeWidth = "8px";
                        ripple.style.opacity = "0.9";

                        // 3. Anchor the CSS scale perfectly to the circle itself
                        ripple.style.transformOrigin = "center";
                        ripple.style.transformBox = "fill-box";
                        ripple.style.transform = "scale(1)";

                        tip.parentNode.insertBefore(ripple, tip);

                        // Force browser reflow to register the starting state
                        void ripple.getBoundingClientRect();

                        setTimeout(() => {
                            ripple.style.transition = "all 1.2s cubic-bezier(0.1, 0.8, 0.3, 1)";
                            ripple.style.transform = `scale(15)`;
                            ripple.style.strokeWidth = "0.5px";
                            ripple.style.opacity = "0";
                        }, 10);

                        setTimeout(() => ripple.remove(), 1300);
                    }, delayTime);
                };

                // Fire 3 waves in rapid succession
                spawnWave(0);
                spawnWave(250);
                spawnWave(500);

                spawnWave(2000);
                spawnWave(2250);
                spawnWave(2500);
            }
        };

        // Fire the first ring cycle immediately
        setTimeout(() => trigger_ring_cycle(), 100);

        // Then start the interval for subsequent rings
        this.phone_ring_interval = setInterval(() => {
            trigger_ring_cycle();
        }, 4500);
    }

    stop_phone_ringing() {
        if (this.phone_ring_interval) {
            clearInterval(this.phone_ring_interval);
            this.phone_ring_interval = null;
        }

        // 1. Turn off the emergency lights
        let light = document.getElementById("phone_booth_light");
        let tip = document.getElementById("phone_booth_dish_antenna_tip");
        if (light) light.classList.remove("ringing_police_light");
        if (tip) tip.classList.remove("ringing_antenna_tip");

        // 2. Restart the Scanning Animation
        let assembly = document.getElementById("phone_booth_antenna_assembly");
        if (assembly) {
            // Remove the class first
            assembly.classList.remove("scanning_antenna");

            // THE FIX: Request the offsetWidth to force a "DOM Reflow".
            // This guarantees the browser registers that the class was removed before adding it back!
            void assembly.offsetWidth;

            // Add it back, triggering a fresh animation start
            assembly.classList.add("scanning_antenna");
        }
    }

    remove_phone_booth() {
        let boothBase = document.getElementById("phone_booth");
        let boothTop = document.getElementById("phone_booth_top");

        if (boothBase) boothBase.remove();
        if (boothTop) boothTop.remove();
    }

    //-----------------------------
    // PHONE ROOM
    //-----------------------------
    remove_phone_room_asset() {
        let phoneRoomAsset = document.getElementById("phone_room");

        if (phoneRoomAsset) {
            phoneRoomAsset.remove();
        }
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
        this.resetAutoTravelCharacterIconOpacity();
        this.Player.jump_to_map_center();

        if (GenParam.DisplayFoundFennimalIconsOnMap.show && GenParam.DisplayFoundFennimalIconsOnMap.display_only_in_current_region) {
            this.display_all_Fennimal_icon_on_map_for_region("Home");
        }

        this.Partner.jump_to_map_center();
        this.Partner.update_behavior();
    }

    // ----------------------------------------------------
    // AUTOMATED MAP TRAVEL
    // ----------------------------------------------------
    getMapPointFromElement(element) {
        if (!element) return false;

        try {
            // Auto-travel coordinates must match the coordinate space used by PlayerIconGroup,
            // because PlayerIconController stores positions as transforms inside #Map_player_level.
            let playerLayer = document.getElementById("Map_player_level");
            if (!playerLayer) {
                console.warn("Could not find #Map_player_level. Falling back to root SVG coordinates.");
                let bbox = element.getBBox();
                return {
                    x: Math.round(bbox.x + 0.5 * bbox.width),
                    y: Math.round(bbox.y + 0.5 * bbox.height)
                };
            }

            let bbox = element.getBBox();
            let localPoint = GenParam.SVGObject.createSVGPoint();
            localPoint.x = bbox.x + 0.5 * bbox.width;
            localPoint.y = bbox.y + 0.5 * bbox.height;

            // Convert from this element's local coordinate space into the player layer's
            // local coordinate space. This avoids contamination from current map zoom/pan.
            let elementToPlayerLayer = playerLayer.getCTM().inverse().multiply(element.getCTM());
            let playerLayerPoint = localPoint.matrixTransform(elementToPlayerLayer);

            return {
                x: Math.round(playerLayerPoint.x),
                y: Math.round(playerLayerPoint.y)
            };
        } catch (error) {
            console.warn("Could not derive player-layer map point from element:", element, error);
            return false;
        }
    }

    getHomeCenterPoint() {
        return {
            x: Math.round(0.5 * GenParam.SVG_width),
            y: Math.round(0.5 * GenParam.SVG_height)
        };
    }

    getPhoneRoomMapPoint() {
        let phoneRoomElement = document.getElementById("phone_room");
        let phoneRoomPoint = this.getMapPointFromElement(phoneRoomElement);

        if (phoneRoomPoint) return phoneRoomPoint;

        console.warn("Could not find #phone_room on the map. Falling back to Home center.");
        return this.getHomeCenterPoint();
    }

    getLocationMarkerPoint(location) {
        let marker = document.getElementById("location_marker_" + location);
        let markerPoint = this.getMapPointFromElement(marker);

        if (markerPoint) return markerPoint;

        console.warn(`Could not find location marker for '${location}'. Falling back to Home center.`);
        return this.getHomeCenterPoint();
    }

    getRegionWaypoints(region) {
        let waypoints = Array.from(document.getElementsByClassName("waypoint_" + region));

        if (waypoints.length === 0) {
            console.warn(`No waypoints found for region '${region}'. Auto-travel will use a direct route.`);
            return [];
        }

        return waypoints
            .map(element => {
                let id = element.id || "";
                let match = id.match(/^waypoint_([A-Z])_/);
                let order = match ? match[1].charCodeAt(0) : 999;

                if (!match) {
                    console.warn(`Waypoint '${id}' does not follow expected id pattern waypoint_A_${region}. It will be sorted last.`);
                }

                return {
                    element: element,
                    order: order,
                    point: this.getMapPointFromElement(element)
                };
            })
            .filter(wp => wp.point !== false)
            .sort((a, b) => a.order - b.order)
            .map(wp => wp.point);
    }

    forceAutoTravelRegion(region) {
        if (!region || !GenParam.RegionData[region]) return;

        // disable_map_interactions() stops ambient audio without clearing current_region.
        // Auto-travel (especially phone_room return legs) can therefore already be "in" a
        // region with no soundscape playing — always ensure audio is running.
        if (this.current_region === region) {
            AudioCont.stop_all_region_sounds();
            AudioCont.play_region_sound(region);
            return;
        }

        this.current_region = region;
        this.zoom_map_to_region(region);
        Interface.player_moved_to_new_region(region);

        if (region === "Home" && this.ExpCont.playerReturnedHome) {
            this.ExpCont.playerReturnedHome();
        }
    }

    ensureAutoTravelRegionSound() {
        if (!this.current_region || this.current_region === "All") return;
        if (!GenParam.RegionData[this.current_region]) return;

        AudioCont.stop_all_region_sounds();
        AudioCont.play_region_sound(this.current_region);
    }

    buildAutoRouteToLocation(trialObj) {
        let start = this.getPhoneRoomMapPoint();
        let waypoints = this.getRegionWaypoints(trialObj.region);
        let destination = this.getLocationMarkerPoint(trialObj.location);

        return [start, ...waypoints, destination];
    }

    buildAutoRouteBackToPhoneRoom(trialObj) {
        let start = this.getLocationMarkerPoint(trialObj.location);
        let waypoints = this.getRegionWaypoints(trialObj.region).reverse();
        let destination = this.getPhoneRoomMapPoint();

        return [start, ...waypoints, destination];
    }

    resolveAutoTravelOptions(options = {}) {
        let role = this.WorldState.get_current_partner_role();
        let partnerPresent = role === "active" || role === "passive";

        let leader = options.leader || GenParam.AutoTravel.defaultLeader || "partner";
        if (leader === "partner" && !partnerPresent) {
            leader = "player";
        }

        let statusLabel = options.statusLabel;
        if (!statusLabel) {
            if (leader === "partner") {
                let partnerName = this.WorldState.get_partner_icon_settings().name || "partner";
                statusLabel = `${GenParam.AutoTravel.followingLabelPrefix} ${partnerName}`;
            } else {
                statusLabel = GenParam.AutoTravel.travellingLabel;
            }
        }

        return Object.assign({}, options, { leader, statusLabel, partnerPresent });
    }

    prepareForAutoTravel(startPoint, options = {}) {
        this.autoTravelOptions = this.resolveAutoTravelOptions(options);

        this.disable_map_interactions();
        this.remove_all_action_buttons();
        Interface.Prompt.hide();
        Interface.FenneFinder.hide();

        if (this.RequestInstructionsButton) {
            this.RequestInstructionsButton.style.display = "none";
        }

        this.current_action_key_status = false;
        this.previous_action_key_status = false;
        this.current_nearest_location = false;
        this.update_nearest_location_highlights();

        this.currently_in_location = false;
        this.Map_Layer.style.display = "inherit";
        this.Interface_Layer.style.display = "inherit";
        this.hide_all_locations();

        let followerOffset = GenParam.AutoTravel.followerStartOffset || GenParam.AutoTravel.partnerStartOffset || { x: 0, y: 0 };
        let leader = this.autoTravelOptions.leader;

        if (leader === "partner" && this.autoTravelOptions.partnerPresent) {
            // Partner leads: place them on the route start, player trails behind.
            this.Partner.jump_to_position(startPoint.x, startPoint.y);
            this.Partner.setAutoTravelLeadMode(true);
            this.Player.force_move_to_coords(
                startPoint.x + followerOffset.x,
                startPoint.y + followerOffset.y,
                { notifyPartner: false }
            );
        } else {
            // Player leads: partner starts offset (legacy / fallback when partner absent).
            this.Player.force_move_to_coords(startPoint.x, startPoint.y, { notifyPartner: false });
            if (this.autoTravelOptions.partnerPresent) {
                let legacyOffset = GenParam.AutoTravel.partnerStartOffset || followerOffset;
                this.Partner.jump_to_position(
                    startPoint.x - legacyOffset.x,
                    startPoint.y - legacyOffset.y
                );
                this.Partner.setAutoTravelLeadMode(false);
            }
        }

        // Always sync visibility: absent partners must be hidden here, otherwise the
        // previous phase's icon stays visible until return_to_map after the first trial.
        this.Partner.update_behavior();
        if (leader === "partner" && this.autoTravelOptions.partnerPresent) {
            // update_behavior() clears lead mode flags via role sync — re-assert lead.
            this.Partner.setAutoTravelLeadMode(true);
        }

        // disable_map_interactions() stops region audio; phone_room never re-enables the map,
        // so restart ambient for the region we are about to travel through.
        this.ensureAutoTravelRegionSound();

        this.setAutoTravelCharacterIconOpacity(0, false);
        this.syncAutoTravelIconStackOrder();
        this.showAutoTravelChrome(this.autoTravelOptions.statusLabel);
    }

    syncAutoTravelIconStackOrder() {
        let playerLayer = document.getElementById("Map_player_level");
        if (!playerLayer || !this.Player || !this.Player.PlayerIcon) return;

        let leader = this.autoTravelOptions && this.autoTravelOptions.leader;
        let partnerPresent = this.autoTravelOptions && this.autoTravelOptions.partnerPresent;
        let partnerIcon = this.Partner && this.Partner.PartnerIcon;

        // Later siblings paint above earlier ones in SVG.
        if (leader === "partner" && partnerPresent && partnerIcon) {
            playerLayer.appendChild(this.Player.PlayerIcon);
            playerLayer.appendChild(partnerIcon);
        } else {
            if (partnerIcon) playerLayer.appendChild(partnerIcon);
            playerLayer.appendChild(this.Player.PlayerIcon);
        }
    }

    getAutoTravelCharacterIcons() {
        let icons = [];

        if (this.Player && this.Player.PlayerIcon) {
            icons.push(this.Player.PlayerIcon);
        }

        let role = this.WorldState.get_current_partner_role();
        if (this.Partner && this.Partner.PartnerIcon && (role === "active" || role === "passive")) {
            icons.push(this.Partner.PartnerIcon);
        }

        return icons;
    }

    setAutoTravelCharacterIconOpacity(opacity, useTransition) {
        let fadeTime = GenParam.AutoTravel.iconFadeTime;
        this.getAutoTravelCharacterIcons().forEach((icon) => {
            icon.style.transition = useTransition ? `opacity ${fadeTime}ms ease-in-out` : "none";
            icon.style.opacity = opacity;
        });
    }

    resetAutoTravelCharacterIconOpacity() {
        this.getAutoTravelCharacterIcons().forEach((icon) => {
            icon.style.transition = "none";
            icon.style.opacity = 1;
        });
    }

    fadeInAutoTravelCharacterIcons(onComplete) {
        this.setAutoTravelCharacterIconOpacity(0, false);
        this.getAutoTravelCharacterIcons().forEach((icon) => {
            void icon.getBoundingClientRect();
        });
        this.setAutoTravelCharacterIconOpacity(1, true);
        setTimeout(() => {
            if (onComplete) onComplete();
        }, GenParam.AutoTravel.iconFadeTime);
    }

    fadeOutAutoTravelCharacterIcons(onComplete) {
        this.setAutoTravelCharacterIconOpacity(0, true);
        setTimeout(() => {
            if (onComplete) onComplete();
        }, GenParam.AutoTravel.iconFadeTime);
    }

    showAutoTravelChrome(statusLabel) {
        this.clearAutoTravelChrome();

        let taskSvg = GenParam.SVGObject || document.getElementById("Scannimals_Task_SVG");
        if (taskSvg) {
            taskSvg.classList.add("auto_travel_sepia");
        }

        this.autoTravelWash = create_SVG_rect(
            0,
            0,
            GenParam.SVG_width,
            GenParam.SVG_height,
            "auto_travel_wash",
            "AutoTravelWash"
        );
        this.autoTravelWash.style.pointerEvents = "none";
        this.Interface_Layer.appendChild(this.autoTravelWash);

        this.autoTravelStatusText = create_SVG_text_elem(
            0.5 * GenParam.SVG_width,
            GenParam.SVG_height - 55,
            statusLabel || GenParam.AutoTravel.travellingLabel,
            "auto_travel_status_text",
            "AutoTravelStatusText"
        );
        this.autoTravelStatusText.style.textAnchor = "middle";
        this.autoTravelStatusText.style.pointerEvents = "none";
        this.Interface_Layer.appendChild(this.autoTravelStatusText);
    }

    clearAutoTravelChrome() {
        let taskSvg = GenParam.SVGObject || document.getElementById("Scannimals_Task_SVG");
        if (taskSvg) {
            taskSvg.classList.remove("auto_travel_sepia");
            taskSvg.style.filter = "";
        }

        if (this.Interface_Layer) {
            this.Interface_Layer.classList.remove("auto_travel_interface_sepia");
            this.Interface_Layer.style.filter = "";
        }

        if (this.autoTravelWash) {
            this.autoTravelWash.remove();
            this.autoTravelWash = null;
        }

        if (this.autoTravelStatusText) {
            this.autoTravelStatusText.remove();
            this.autoTravelStatusText = null;
        }

        ["AutoTravelStatusText", "AutoTravelWash"].forEach((id) => {
            let leftover = document.getElementById(id);
            if (leftover) leftover.remove();
        });
    }

    runAutoTravelStartSequence(onReadyToMove) {
        AudioCont.play_sound_effect("alert_minimal");
        this.fadeInAutoTravelCharacterIcons(() => {
            this.autoTravelStartTimeout = setTimeout(() => {
                this.autoTravelStartTimeout = null;
                if (onReadyToMove) onReadyToMove();
            }, GenParam.AutoTravel.iconHoldDelay);
        });
    }

    runAutoTravelArrivalSequence(onComplete) {
        AudioCont.play_sound_effect("alert_minimal");
        this.autoTravelStartTimeout = setTimeout(() => {
            this.autoTravelStartTimeout = null;
            this.fadeOutAutoTravelCharacterIcons(() => {
                // Keep icons invisible until the map is hidden / interactions resume,
                // otherwise they briefly pop back in during the location transition.
                this.clearAutoTravelChrome();
                if (onComplete) onComplete();
            });
        }, GenParam.AutoTravel.iconHoldDelay);
    }

    getAutoTravelLeaderPos() {
        if (this.autoTravelOptions && this.autoTravelOptions.leader === "partner" && this.Partner) {
            return this.Partner.PartnerIconPos;
        }
        return this.Player.CurrentPlayerPos;
    }

    moveAutoTravelLeaderTo(x, y) {
        if (this.autoTravelOptions && this.autoTravelOptions.leader === "partner" && this.Partner) {
            this.Partner.force_move_to_coords(x, y);
            this.moveAutoTravelFollowerTowardLeader();
            return;
        }

        this.Player.force_move_to_coords(x, y);
    }

    beginAutoTravelFollowerLag() {
        this.autoTravelFollowerEngaged = false;
        this.autoTravelFollowerMayMoveAt = performance.now() + (GenParam.AutoTravel.followerStartDelay || 0);
    }

    moveAutoTravelFollowerTowardLeader(forceCatchup = false) {
        if (!this.autoTravelOptions || this.autoTravelOptions.leader !== "partner" || !this.Partner) {
            return;
        }

        if (!forceCatchup && performance.now() < (this.autoTravelFollowerMayMoveAt || 0)) {
            return;
        }

        let leaderPos = this.Partner.PartnerIconPos;
        let followerPos = this.Player.CurrentPlayerPos;
        let dist = EUDistPoints(followerPos, leaderPos);

        let engageDistance = GenParam.AutoTravel.followerEngageDistance;
        let holdDistance = GenParam.AutoTravel.followerHoldDistance;
        let trailDistance = GenParam.AutoTravel.followerTrailDistance;
        let stopDistance = forceCatchup
            ? GenParam.AutoTravel.partnerFollowStopDistance
            : (this.autoTravelFollowerEngaged ? holdDistance : engageDistance);

        if (dist <= stopDistance) {
            if (!forceCatchup) this.autoTravelFollowerEngaged = false;
            return;
        }

        this.autoTravelFollowerEngaged = true;

        let angleRad = Math.atan2(leaderPos.y - followerPos.y, leaderPos.x - followerPos.x);
        let baseSpeed = forceCatchup
            ? Math.max(GenParam.AutoTravel.followerSpeed, GenParam.AutoTravel.speed + 1.5)
            : GenParam.AutoTravel.followerSpeed;
        // Mild rubber-band: close larger gaps a bit faster without matching the leader 1:1.
        let gapBeyondTrail = Math.max(0, dist - trailDistance);
        let dynamicSpeed = baseSpeed + gapBeyondTrail * (GenParam.AutoTravel.followerRubberBand || 0);
        let maxSpeed = forceCatchup ? 6 : GenParam.AutoTravel.followerMaxSpeed;
        let stepSize = Math.min(maxSpeed, dynamicSpeed, dist - (forceCatchup ? 0 : trailDistance * 0.35));
        if (stepSize <= 0) return;

        this.Player.force_move_to_coords(
            followerPos.x + stepSize * Math.cos(angleRad),
            followerPos.y + stepSize * Math.sin(angleRad),
            { notifyPartner: false }
        );
    }

    autoTravelAlongRoute(routePoints, onComplete, options = {}) {
        if (!Array.isArray(routePoints) || routePoints.length === 0) {
            console.warn("Auto-travel requested without valid route points.");
            this.resetAutoTravelCharacterIconOpacity();
            this.clearAutoTravelChrome();
            if (onComplete) onComplete();
            return;
        }

        // prepareForAutoTravel may already have resolved options; merge route hooks in.
        if (!this.autoTravelOptions) {
            this.autoTravelOptions = this.resolveAutoTravelOptions(options);
        } else {
            this.autoTravelOptions = Object.assign({}, this.autoTravelOptions, options);
        }

        let currentTargetIndex = 1;
        let triggeredRoutePointHooks = {};

        if (routePoints.length === 1) {
            this.moveAutoTravelLeaderTo(routePoints[0].x, routePoints[0].y);
            this.spawnAutoTravelArrivalRipples(routePoints[0].x, routePoints[0].y);
            this.autoTravelStartTimeout = setTimeout(() => {
                this.autoTravelStartTimeout = null;
                this.runAutoTravelStartSequence(() => {
                    this.finishAutoTravelWithFollowerCatchup(onComplete);
                });
            }, GenParam.AutoTravel.startDelay);
            return;
        }

        const triggerRoutePointHook = (routePointIndex) => {
            if (triggeredRoutePointHooks[routePointIndex]) return;
            triggeredRoutePointHooks[routePointIndex] = true;

            if (options.regionAtRoutePoint && options.regionAtRoutePoint[routePointIndex]) {
                this.forceAutoTravelRegion(options.regionAtRoutePoint[routePointIndex]);
            }
        };

        const step = () => {
            let currentPos = this.getAutoTravelLeaderPos();
            let target = routePoints[currentTargetIndex];
            let dist = EUDistPoints(currentPos, target);

            if (dist <= GenParam.AutoTravel.arrivalDistance) {
                this.moveAutoTravelLeaderTo(target.x, target.y);
                if (currentTargetIndex >= routePoints.length - 1) {
                    this.spawnAutoTravelArrivalRipples(target.x, target.y);
                }
                triggerRoutePointHook(currentTargetIndex);

                currentTargetIndex++;

                if (currentTargetIndex >= routePoints.length) {
                    this.autoTravelFrameId = null;
                    this.autoTravelDistanceSinceTrackmark = 0;
                    this.finishAutoTravelWithFollowerCatchup(onComplete);
                    return;
                }

                target = routePoints[currentTargetIndex];
                dist = EUDistPoints(this.getAutoTravelLeaderPos(), target);
            }

            let leaderPos = this.getAutoTravelLeaderPos();
            let angleRad = Math.atan2(target.y - leaderPos.y, target.x - leaderPos.x);
            let stepSize = Math.min(GenParam.AutoTravel.speed, dist);
            let nextX = leaderPos.x + stepSize * Math.cos(angleRad);
            let nextY = leaderPos.y + stepSize * Math.sin(angleRad);

            this.moveAutoTravelLeaderTo(nextX, nextY);
            this.autoTravelFrameId = requestAnimationFrame(step);
            this.maybeSpawnAutoTravelTrackmark(stepSize);
        };

        if (this.autoTravelFrameId) cancelAnimationFrame(this.autoTravelFrameId);
        if (this.autoTravelStartTimeout) clearTimeout(this.autoTravelStartTimeout);

        this.autoTravelDistanceSinceTrackmark = 0;

        this.autoTravelStartTimeout = setTimeout(() => {
            this.autoTravelStartTimeout = null;
            this.runAutoTravelStartSequence(() => {
                this.beginAutoTravelFollowerLag();
                this.autoTravelFrameId = requestAnimationFrame(step);
            });
        }, GenParam.AutoTravel.startDelay);
    }

    spawnAutoTravelArrivalRipples(x, y) {
        if (!x && x !== 0) return;
        if (!y && y !== 0) return;

        let playerLayer = document.getElementById("Map_player_level");
        if (!playerLayer) return;

        // Burst ripples at the destination (auto travel only).
        const rippleDelays = [0, 140, 280];
        const removeDelayMs = 950;

        rippleDelays.forEach((delay) => {
            setTimeout(() => {
                let circle = create_SVG_circle(x, y, 1, "arrival_ripple_circle", undefined);
                circle.style.opacity = 0.9;

                // Render behind the player icon if possible.
                if (this.Player && this.Player.PlayerIcon && this.Player.PlayerIcon.parentNode === playerLayer) {
                    playerLayer.insertBefore(circle, this.Player.PlayerIcon);
                } else {
                    playerLayer.appendChild(circle);
                }

                setTimeout(() => circle.remove(), removeDelayMs);
            }, delay);
        });
    }

    finishAutoTravelWithFollowerCatchup(onComplete) {
        const finish = () => {
            if (this.Partner) {
                this.Partner.setAutoTravelFollowMode(false);
                this.Partner.setAutoTravelLeadMode(false);
            }

            // Snap follower onto the leader so arrival looks clean.
            let leaderPos = this.getAutoTravelLeaderPos();
            if (this.autoTravelOptions && this.autoTravelOptions.leader === "partner" && this.Partner) {
                this.Player.force_move_to_coords(leaderPos.x, leaderPos.y, { notifyPartner: false });
            } else if (this.Partner && this.autoTravelOptions && this.autoTravelOptions.partnerPresent) {
                this.Partner.jump_to_position(leaderPos.x, leaderPos.y);
            }

            this.autoTravelOptions = null;
            this.runAutoTravelArrivalSequence(onComplete);
        };

        let leader = this.autoTravelOptions && this.autoTravelOptions.leader;

        // Partner-led: wait for the player to close the trail gap.
        if (leader === "partner" && this.Partner) {
            this.autoTravelFollowerMayMoveAt = 0;
            this.autoTravelFollowerEngaged = true;
            const catchupStartedAt = performance.now();
            const waitForPlayer = () => {
                this.moveAutoTravelFollowerTowardLeader(true);
                let dist = EUDistPoints(this.Player.CurrentPlayerPos, this.Partner.PartnerIconPos);
                let timedOut = performance.now() - catchupStartedAt >= GenParam.AutoTravel.partnerCatchupDelay;

                if (dist <= GenParam.AutoTravel.partnerFollowStopDistance || timedOut) {
                    finish();
                    return;
                }

                requestAnimationFrame(waitForPlayer);
            };

            requestAnimationFrame(waitForPlayer);
            return;
        }

        // Player-led: wait for the partner to catch up (legacy behavior).
        if (!this.Partner || !this.Partner.currently_following_player) {
            setTimeout(finish, GenParam.AutoTravel.partnerCatchupDelay);
            return;
        }

        this.Partner.setAutoTravelFollowMode(true);
        this.Partner.player_moved_to_location(this.Player.CurrentPlayerPos.x, this.Player.CurrentPlayerPos.y);

        const catchupStartedAt = performance.now();
        const waitForPartner = () => {
            let dist = EUDistPoints(this.Partner.PartnerIconPos, this.Player.CurrentPlayerPos);
            let timedOut = performance.now() - catchupStartedAt >= GenParam.AutoTravel.partnerCatchupDelay;

            if (dist <= GenParam.AutoTravel.partnerFollowStopDistance || timedOut) {
                if (timedOut && dist > GenParam.AutoTravel.partnerFollowStopDistance) {
                    this.Partner.jump_to_position(this.Player.CurrentPlayerPos.x, this.Player.CurrentPlayerPos.y);
                }
                finish();
                return;
            }

            requestAnimationFrame(waitForPartner);
        };

        requestAnimationFrame(waitForPartner);
    }

    maybeSpawnAutoTravelTrackmark(distanceMoved) {
        if (!GenParam.MapFlair || !GenParam.MapFlair.showAutoTravelTrackmarks) return;
        if (!distanceMoved || distanceMoved <= 0) return;

        this.autoTravelDistanceSinceTrackmark = (this.autoTravelDistanceSinceTrackmark || 0) + distanceMoved;

        if (this.autoTravelDistanceSinceTrackmark < GenParam.MapFlair.trackmarkSpacing) return;

        this.autoTravelDistanceSinceTrackmark = 0;
        let leaderPos = this.getAutoTravelLeaderPos();
        this.spawnAutoTravelTrackmark(leaderPos.x, leaderPos.y);
    }

    spawnAutoTravelTrackmark(x, y) {
        if (!GenParam.MapFlair) return;

        let playerLayer = document.getElementById("Map_player_level");
        if (!playerLayer) return;

        let mark = create_SVG_circle(x, y, GenParam.MapFlair.trackmarkRadius, "auto_travel_trackmark", undefined);
        mark.style.fill = GenParam.MapFlair.trackmarkColor;
        mark.style.opacity = GenParam.MapFlair.trackmarkOpacity;
        mark.style.setProperty("--auto-travel-trackmark-fade-time", `${GenParam.MapFlair.trackmarkFadeTime}ms`);

        if (this.Player && this.Player.PlayerIcon && this.Player.PlayerIcon.parentNode === playerLayer) {
            playerLayer.insertBefore(mark, this.Player.PlayerIcon);
        } else {
            playerLayer.appendChild(mark);
        }

        setTimeout(() => mark.remove(), GenParam.MapFlair.trackmarkFadeTime + 50);
    }

    autoTravelToTrialLocation(trialObj, onComplete, travelOptions = {}) {
        let route = this.buildAutoRouteToLocation(trialObj);
        this.prepareForAutoTravel(route[0], travelOptions);

        // Route index 0 = phone room.
        // Route index 1 = first regional waypoint, if present.
        // Force the region at index 1 so thin SVG transition triggers cannot be skipped.
        let regionAtRoutePoint = {};
        if (route.length > 2) {
            regionAtRoutePoint[1] = trialObj.region;
        }

        this.autoTravelAlongRoute(route, () => {
            this.forceAutoTravelRegion(trialObj.region);
            if (onComplete) onComplete();
        }, { regionAtRoutePoint: regionAtRoutePoint });
    }

    autoTravelBackToPhoneRoom(trialObj, onComplete, travelOptions = {}) {
        let route = this.buildAutoRouteBackToPhoneRoom(trialObj);
        this.prepareForAutoTravel(route[0], travelOptions);

        // The final route point is the phone room/Home fallback.
        // Also flip to Home at the last regional waypoint (was the region-entry waypoint
        // on the outbound leg) so partner-led returns don't wait until the phone room.
        let regionAtRoutePoint = {};
        regionAtRoutePoint[route.length - 1] = "Home";
        if (route.length > 2) {
            regionAtRoutePoint[route.length - 2] = "Home";
        }

        this.autoTravelAlongRoute(route, () => {
            this.forceAutoTravelRegion("Home");
            if (onComplete) onComplete();
        }, { regionAtRoutePoint: regionAtRoutePoint });
    }

    /**
     * Walk the map partner icon to the player's current position (player stays fixed).
     */
    animatePartnerToPlayer(durationMs = 1200) {
        return new Promise((resolve) => {
            if (!this.Partner || !this.Player) {
                resolve();
                return;
            }

            this.Partner.setAutoTravelLeadMode(true);
            let start = {
                x: this.Partner.PartnerIconPos.x,
                y: this.Partner.PartnerIconPos.y
            };
            let end = {
                x: this.Player.CurrentPlayerPos.x,
                y: this.Player.CurrentPlayerPos.y
            };
            let startedAt = performance.now();

            const step = (now) => {
                let t = Math.min(1, (now - startedAt) / durationMs);
                // ease-in-out
                let e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                let x = start.x + (end.x - start.x) * e;
                let y = start.y + (end.y - start.y) * e;
                this.Partner.force_move_to_coords(x, y);
                if (t < 1) {
                    requestAnimationFrame(step);
                } else {
                    this.Partner.jump_to_position(end.x, end.y);
                    this.Partner.setAutoTravelLeadMode(false);
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });
    }

    startPhoneRoomProximityReturnWatch(onArrive) {
        this.stopPhoneRoomProximityReturnWatch();
        this.awaitingPhoneRoomProximityReturn = true;
        this.phoneRoomProximityReturnCallback = onArrive;

        const threshold = Math.max(GenParam.location_detection_distance * 1.4, 48);
        this.phoneRoomProximityReturnInterval = setInterval(() => {
            if (!this.awaitingPhoneRoomProximityReturn) return;
            if (!this.Player) return;
            let phonePoint = this.getPhoneRoomMapPoint();
            let dist = EUDistPoints(this.Player.CurrentPlayerPos, phonePoint);
            if (dist <= threshold) {
                let cb = this.phoneRoomProximityReturnCallback;
                this.stopPhoneRoomProximityReturnWatch();
                if (cb) cb();
            }
        }, 200);
    }

    stopPhoneRoomProximityReturnWatch() {
        this.awaitingPhoneRoomProximityReturn = false;
        this.phoneRoomProximityReturnCallback = null;
        if (this.phoneRoomProximityReturnInterval) {
            clearInterval(this.phoneRoomProximityReturnInterval);
            this.phoneRoomProximityReturnInterval = null;
        }
    }

    /**
     * Manual walk-home arrival: lock movement, magnetically settle on the phone room,
     * then fade icons like a normal autotravel arrival before continuing the phone-room queue.
     */
    runManualPhoneRoomArrivalSequence(onComplete) {
        this.disable_map_interactions();
        this.remove_all_action_buttons();

        let dest = this.getPhoneRoomMapPoint();
        let start = {
            x: this.Player.CurrentPlayerPos.x,
            y: this.Player.CurrentPlayerPos.y
        };
        let durationMs = 550;
        let startedAt = performance.now();

        if (this.Partner) {
            this.Partner.setAutoTravelFollowMode(true);
            this.Partner.player_moved_to_location(dest.x, dest.y);
        }

        const step = (now) => {
            let t = Math.min(1, (now - startedAt) / durationMs);
            let e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            let x = start.x + (dest.x - start.x) * e;
            let y = start.y + (dest.y - start.y) * e;
            this.Player.force_move_to_coords(x, y, { notifyPartner: true });
            if (t < 1) {
                requestAnimationFrame(step);
                return;
            }

            this.Player.force_move_to_coords(dest.x, dest.y, { notifyPartner: true });
            if (this.Partner) {
                this.Partner.jump_to_position(dest.x, dest.y);
                this.Partner.setAutoTravelFollowMode(false);
            }
            this.forceAutoTravelRegion("Home");
            this.runAutoTravelArrivalSequence(() => {
                if (onComplete) onComplete();
            });
        };
        requestAnimationFrame(step);
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
        this.resetAutoTravelCharacterIconOpacity();
        this.clearAutoTravelChrome();
        if (this.Partner) {
            this.Partner.setAutoTravelFollowMode(false);
            this.Partner.setAutoTravelLeadMode(false);
        }
        this.autoTravelOptions = null;
        // Restore default stack: player above partner.
        this.syncAutoTravelIconStackOrder();
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

        force_move_to_coords(x, y, options = {}) {
            if (x === this.CurrentPlayerPos.x && y === this.CurrentPlayerPos.y) return;

            let delta_x = x - this.CurrentPlayerPos.x;
            let delta_y = y - this.CurrentPlayerPos.y;

            this.CurrentPlayerPos = { x: parseFloat(x), y: parseFloat(y) };
            this.update_icon_position();

            if (Math.abs(delta_x) > Math.abs(delta_y)) {
                this.update_player_icon_direction(delta_x > 0 ? "right" : "left");
            } else {
                this.update_player_icon_direction(delta_y > 0 ? "down" : "up");
            }

            if (options.notifyPartner !== false && this.MapCont.Partner) {
                this.MapCont.Partner.player_moved_to_location(x, y);
            }
            Interface.FenneFinder.update_player_location(this.CurrentPlayerPos);

            this.check_for_region_shift();
        }


        check_for_region_shift() {
            // During auto-travel, region changes are driven exclusively by route waypoints
            // (see regionAtRoutePoint). Player trail / partner lead positions must not
            // flicker Home↔region by brushing invisible enter/leave polygons.
            if (this.MapCont.autoTravelOptions || this.MapCont.autoTravelFrameId) {
                return;
            }

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
                        if (this.MapCont.ExpCont.playerReturnedHome) this.MapCont.ExpCont.playerReturnedHome();
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
            this.autoTravelFollowMode = false;
            this.autoTravelLeadMode = false;
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

        setAutoTravelFollowMode(enabled) {
            this.autoTravelFollowMode = !!enabled;
            if (enabled) {
                this.autoTravelLeadMode = false;
                this.currently_on_the_move = true;
            }
        }

        setAutoTravelLeadMode(enabled) {
            this.autoTravelLeadMode = !!enabled;
            if (enabled) {
                this.autoTravelFollowMode = false;
                this.TargetPos = false;
                this.currently_on_the_move = true;
            }
        }

        force_move_to_coords(x, y) {
            if (x === this.PartnerIconPos.x && y === this.PartnerIconPos.y) return;

            let delta_x = x - this.PartnerIconPos.x;
            let delta_y = y - this.PartnerIconPos.y;

            this.PartnerIconPos = { x: parseFloat(x), y: parseFloat(y) };
            this.PartnerIcon.style.transform = `translate(${this.PartnerIconPos.x}px, ${this.PartnerIconPos.y}px)`;

            if (Math.abs(delta_x) > Math.abs(delta_y)) {
                this.update_icon_direction(delta_x > 0 ? "right" : "left");
            } else {
                this.update_icon_direction(delta_y > 0 ? "down" : "up");
            }
        }

        step_logic() {
            if (this.autoTravelLeadMode) return;

            if (this.currently_following_player && this.TargetPos) {
                let dist_to_player = EUDistPoints(this.PartnerIconPos, this.TargetPos);
                let critical_movement_distance = this.autoTravelFollowMode
                    ? GenParam.AutoTravel.partnerFollowStopDistance
                    : (this.currently_on_the_move ? 40 : 70);

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
                        let base_speed = this.autoTravelFollowMode
                            ? Math.max(3.5, GenParam.AutoTravel.speed + 1.5)
                            : 3.5; // Solid starting speed, no crawling

                        // Rubber-banding: speed increases slightly if they fall far behind
                        let dynamic_speed = base_speed + (dist_to_player * 0.000);

                        // HARD CAP: Never exceed 6.5 (fast enough to catch up to the player's 4.8, but never teleporting)
                        let active_speed = Math.min(this.autoTravelFollowMode ? 6 : 4, dynamic_speed);

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