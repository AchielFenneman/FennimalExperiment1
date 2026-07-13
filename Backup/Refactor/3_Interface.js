class PromptController {
    constructor() {
        this.PromptBox = document.getElementById("prompt_box");
        this.PromptTextElem = document.getElementById("prompt_text");
        this.Text = this.PromptTextElem.childNodes[0];

        this.margin = 10;
        this.max_opacity = 0.9;
        this.currentmessagetext = "";
        this.currentTimeout = null;
        this.auto_duration_timeout = null;
        this.base_speed = 250;
        this.state = "hidden";

        this.PromptBox.style.transition = `all ${this.base_speed}ms ease-in-out`;
        this.PromptTextElem.style.transition = `all ${0.5 * this.base_speed}ms ease-in-out`;
        this.PromptBox.style.pointerEvents = "none";

        this.hide();
    }

    hide() {
        this.PromptBox.style.opacity = 0;
        this.PromptTextElem.style.opacity = 0;
        this.state = "hidden";
        this.currentmessagetext = "";

        this.cancelTimeouts();
        this.reduce_box_to_minimal();
    }

    appear_from_hidden() {
        this.PromptBox.style.display = "inherit";
        this.PromptTextElem.style.display = "inherit";

        // Force reflow
        window.getComputedStyle(this.PromptBox).opacity;

        this.PromptBox.style.opacity = this.max_opacity;
        this.PromptTextElem.style.opacity = this.max_opacity;
        this.state = "shown";
    }

    reduce_box_to_minimal() {
        this.state = "minimized";
        this.PromptTextElem.style.opacity = 0;
        this.PromptTextElem.style.display = "none";
        this.PromptBox.style.opacity = 0;

        this.PromptBox.style.stroke = this.PromptBox.style.fill;
        this.PromptBox.setAttribute("width", 0);
        this.PromptBox.setAttribute("x", 0.5 * GenParam.SVG_width);

        this.currentTimeout = setTimeout(() => {
            this.Text.innerHTML = "";
            this.PromptTextElem.style.display = "inherit";
            this.currentmessagetext = "";
        }, this.base_speed);
    }

    expand_box_to_contain_text() {
        let bbox = this.PromptTextElem.getBBox();
        // Fallback for empty text BBox
        let w = bbox.width > 0 ? bbox.width : 200;
        let x = bbox.x !== 0 ? bbox.x : (0.5 * GenParam.SVG_width) - 100;

        this.PromptBox.setAttribute("x", x - this.margin);
        this.PromptBox.setAttribute("width", w + 2 * this.margin);
        this.PromptBox.style.opacity = this.max_opacity;
    }

    change_colors_based_on_region(region_name) {
        if (!GenParam.RegionData[region_name]) return;
        let color_light = GenParam.RegionData[region_name].lighter_color;
        let color_dark = GenParam.RegionData[region_name].darker_color;

        this.PromptBox.style.fill = color_light + "CC";
        this.PromptBox.style.stroke = color_dark + "00";
        this.Text.style.fill = color_dark;
    }

    show_message(text, auto_remove_after_duration = false) {
        this.cancelTimeouts();

        if (this.state === "hidden") this.appear_from_hidden();

        if (this.currentmessagetext !== text) {
            this.change_text(text);
            this.expand_box_to_contain_text();

            if (this.state === "minimized") {
                this.expand_box_to_contain_text();
                this.state = "shown";
            }
        }

        if (auto_remove_after_duration) {
            this.auto_duration_timeout = setTimeout(() => this.hide(), auto_remove_after_duration);
        }
    }

    change_text(new_text) {
        this.PromptTextElem.style.display = "none";
        this.PromptTextElem.style.opacity = 0;
        this.Text.innerHTML = new_text;
        this.currentmessagetext = new_text;
        this.PromptTextElem.style.display = "inherit";

        setTimeout(() => {
            this.PromptTextElem.style.opacity = this.max_opacity;
            this.expand_box_to_contain_text(); // Double check fit after text renders
        }, this.base_speed);
    }

    cancelTimeouts() {
        if (this.currentTimeout) clearTimeout(this.currentTimeout);
        if (this.auto_duration_timeout) clearTimeout(this.auto_duration_timeout);
        this.currentTimeout = null;
        this.auto_duration_timeout = null;
    }
}

class LocatorController {
    constructor() {
        this.Container = document.getElementById("interface_location");
        this.Text = document.getElementById("interface_location_text");
        this.Box = document.getElementById("interface_location_box");
        this.minwidth = 15;
    }

    change_region_colors(region_name) {
        if (!GenParam.RegionData[region_name]) return;
        let color_light = GenParam.RegionData[region_name].lighter_color;
        let color_dark = GenParam.RegionData[region_name].darker_color;

        this.Box.style.fill = color_light + "CC";
        this.Text.style.fill = color_dark;
    }

    change_locator_name(location_name) {
        if (!location_name) {
            this.Container.style.display = "none";
            return;
        }

        this.Container.style.display = "inherit";
        this.Text.style.opacity = 0;
        this.Text.childNodes[0].innerHTML = location_name;
        this.Text.style.transition = "";

        this.Box.style.transition = "all 200ms ease-in-out";

        setTimeout(() => {
            this.Box.setAttribute("width", this.minwidth);
            this.Text.style.transition = "all 300ms ease-in-out";
        }, 5);

        setTimeout(() => {
            let new_width = this.minwidth + parseInt(this.Text.getBBox().width) + 60;
            this.Box.setAttribute("width", new_width);
        }, 205);

        setTimeout(() => this.Text.style.opacity = 1, 405);
        setTimeout(() => {
            this.Text.style.transition = "";
            this.Box.style.transition = "";
        }, 700);
    }

    hide() { this.Container.style.display = "none"; }
    show() { this.Container.style.display = "inherit"; }
}

class FenneFinderController {
    constructor() {
        this.ParentLayer = document.getElementById("Interface");

        // Clone and Setup DOM
        let rawFinder = document.getElementById("Fennefinder");
        if (!rawFinder) return;

        this.FenneFinder = rawFinder.cloneNode(true);
        this.FenneFinder.setAttribute("id", "");
        this.FenneFinder.classList.add("do_not_move_on_click");
        this.ParentLayer.appendChild(this.FenneFinder);

        // State variables
        this.TargetArr = [];
        this.current_display_mode = false;
        this.low_power = false;

        this.is_power_on = false;
        this.currently_powering_on = false;
        this.is_muted = false;

        this.current_level = 0;
        this.current_beep_frequency = 1000;
        this.BeepInterval = null;
        this.TargetLocationMarker = null;

        // Constants
        this.num_indicators = 8;
        this.off_distance = 350;
        this.max_activation_distance = 30;
        this.min_beep_frequency = 1000;
        this.max_beep_frequency = 400;

        this.Settings = {
            indicator_colors: {
                8: "#06f3f5", 7: "#1eed5e", 6: "#3ae61e", 5: "#66db21",
                4: "#92cf24", 3: "#c6c227", 2: "#d98c1b", 1: "#f62e06",
                off: "#333333"
            },
            levels: {}
        };

        this.assign_elements();
        this.set_all_indicators();
        this.set_threshold_levels();

        this.set_indicator_lights_to_value(0);
        this.change_display_mode(false);
    }

    assign_elements() {
        this.TopBall = this.FenneFinder.getElementsByClassName("Fennefinder_top")[0];
        this.TopBallPos = get_center_coords_of_SVG_object(this.TopBall);
        this.TopBall.style.fill = "dimgray";
        this.TopBall.style.transition = "all 50ms ease-in-out";

        let Buttons = Array.from(this.FenneFinder.getElementsByClassName("Fennefinder_button"));
        Buttons.forEach(btn => {
            if (btn.id === "Fennefinder_button_mute") {
                this.MuteButton = btn;
                this.MuteButton.style.cursor = "pointer";
                this.MuteButton.onpointerdown = () => this.toggle_mute_button();
            } else if (btn.id === "Fennefinder_button_on") {
                this.PowerButton = btn;
                this.PowerButton.style.cursor = "pointer";
                this.PowerButton.onpointerdown = () => this.toggle_power_button();
            }
        });

        this.BatteryScreen = this.FenneFinder.getElementsByClassName("Fennefinder_battery_screen")[0];
        this.BatteryScreen.style.fill = "black";
        this.BatteryScreen.style.transition = "all 100ms ease-in";

        this.BatteryScreenOutline = this.FenneFinder.getElementsByClassName("Fennefinder_battery_outline")[0];
        this.BatteryScreenOutline.style.opacity = 0;
        this.BatteryScreenOutline.style.transition = "all 100ms ease-in";

        let Indicators = Array.from(this.FenneFinder.getElementsByClassName("Fennefinder_battery_status"));
        Indicators.forEach(ind => {
            if (ind.id === "Fennefinder_battery_status_low") {
                this.BatteryLowIndicator = ind;
                this.BatteryLowIndicator.style.opacity = 0;
                this.BatteryLowIndicator.style.transition = "all 100ms ease-in";
            } else if (ind.id === "Fennefinder_battery_status_power") {
                this.BatteryNormalIndicator = ind;
                this.BatteryNormalIndicator.style.opacity = 0;
                this.BatteryNormalIndicator.style.transition = "all 100ms ease-in";
            }
        });
    }

    set_all_indicators() {
        this.Indicators = {};
        let All = Array.from(this.FenneFinder.getElementsByClassName("Fennefinder_indicator"));
        All.forEach(ind => {
            if (ind.id) {
                let num = ind.id.split("_")[1];
                this.Indicators[num] = ind;
                this.Indicators[num].style.transition = "all 25ms ease-in";
            }
        });
    }

    set_threshold_levels() {
        for (let i = 1; i <= this.num_indicators; i++) {
            this.Settings.levels[i] = {
                threshold: Math.round(this.off_distance - (i - 1) * ((this.off_distance - this.max_activation_distance) / (this.num_indicators - 1))),
                frequency: Math.round(this.min_beep_frequency - (i - 1) * ((this.min_beep_frequency - this.max_beep_frequency) / (this.num_indicators - 1)))
            };
        }
    }

    set_indicator_lights_to_value(val) {
        for (let i = 1; i <= this.num_indicators; i++) {
            if (i <= val) {
                this.Indicators[i].style.fill = this.Settings.indicator_colors[i];
            } else {
                this.Indicators[i].style.fill = this.Settings.indicator_colors.off;
            }
        }
    }

    get_activation_level(dist) {
        let level = 0;
        for (let i = 1; i <= this.num_indicators; i++) {
            if (dist <= this.Settings.levels[i].threshold) level = i;
        }
        if (this.current_level !== level) {
            this.change_activation_level(level);
        }
    }

    // --- BUTTON LOGIC ---
    toggle_mute_button() {
        AudioCont.play_sound_effect("button_click");
        this.is_muted = !this.is_muted;

        let circle = this.MuteButton.getElementsByTagName("circle")[0];
        let path = this.MuteButton.getElementsByTagName("path")[0];

        if (this.is_muted) {
            circle.style.fill = "#3e3f63";
            path.style.fill = "lightgray";
        } else {
            circle.style.fill = "#6869c8";
            path.style.fill = "black";
        }
    }

    toggle_power_button() {
        AudioCont.play_sound_effect("button_click");
        if (this.currently_powering_on) return;

        if (this.is_power_on) {
            this.power_off();
        } else {
            let path = this.PowerButton.getElementsByTagName("path")[0];
            let circle = this.PowerButton.getElementsByTagName("circle")[0];

            circle.style.fill = "#3e3f63";
            path.style.fill = this.low_power ? "red" : "lightgreen";
            this.power_on();
        }
    }

    power_on() {
        this.currently_powering_on = true;
        this.show_battery_indicator();
    }

    power_off() {
        this.set_indicator_lights_to_value(0);
        if (this.BeepInterval) clearInterval(this.BeepInterval);

        this.is_power_on = false;

        let circle = this.PowerButton.getElementsByTagName("circle")[0];
        let path = this.PowerButton.getElementsByTagName("path")[0];

        if (this.low_power) {
            circle.style.fill = "maroon";
            path.style.fill = "white";
        } else {
            circle.style.fill = "#6869c8";
            path.style.fill = "black";
        }

        this.BatteryNormalIndicator.style.opacity = 0;
        this.BatteryLowIndicator.style.opacity = 0;
        this.BatteryScreenOutline.style.opacity = 0;

        setTimeout(() => this.BatteryScreen.style.fill = "black", 100);
    }

    show_battery_indicator() {
        this.BatteryScreen.style.fill = "lightgray";
        this.BatteryScreenOutline.style.opacity = 1;

        setTimeout(() => {
            if (this.low_power) {
                this.show_low_power_and_switch_off();
            } else {
                this.BatteryNormalIndicator.style.opacity = 1;
                setTimeout(() => {
                    this.change_activation_level(this.current_level);
                    this.currently_powering_on = false;
                    this.is_power_on = true;
                }, 100);
            }
        }, 100);
    }

    show_low_power_and_switch_off() {
        this.BatteryLowIndicator.style.opacity = 1;
        let Paths = Array.from(this.BatteryLowIndicator.getElementsByTagName("path"));

        Paths.forEach(p => {
            p.style.transition = "all 100ms ease-in";
            p.style.strokeWidth = "1px";
        });

        const blink = (color, time) => setTimeout(() => Paths.forEach(p => p.style.stroke = color), time);

        blink("red", 150);
        blink("none", 300);
        blink("red", 450);
        blink("none", 600);
        blink("red", 750);
        blink("none", 1000);

        setTimeout(() => {
            this.currently_powering_on = false;
            Interface.Prompt.show_message("Oops! The FenneFinder is out of battery...", 1500);
            this.power_off();
        }, 1150);
    }

    // --- FEEDBACK & LOGIC ---
    change_activation_level(newlevel) {
        if (newlevel > this.current_level && !this.is_muted) {
            AudioCont.play_sound_effect("alert_minor");
        }

        this.current_level = newlevel;
        this.set_indicator_lights_to_value(this.current_level);

        if (this.BeepInterval) clearInterval(this.BeepInterval);

        if (newlevel > 0) {
            this.current_beep_frequency = this.Settings.levels[newlevel].frequency;
            this.BeepInterval = setInterval(() => this.beep(), this.current_beep_frequency);
        }
    }

    beep() {
        this.pulse_highest_activation_bar();

        if (this.current_level >= 5) {
            this.TopBall.style.fill = "red";
            setTimeout(() => this.TopBall.style.fill = "dimgray", 75);
        }

        if (this.current_level >= 6 && this.TargetLocationMarker) {
            let MapLayer = document.getElementById("Map");
            if (MapLayer && MapLayer.style.display !== "none") {

                // FIX: Matrix Projection to bypass the Map's Zoom/Pan!
                let pt = GenParam.SVGObject.createSVGPoint();
                let bbox = this.TargetLocationMarker.getBBox();
                pt.x = bbox.x + bbox.width / 2;
                pt.y = bbox.y + bbox.height / 2;

                // Project from the marker's local space to the screen, then down to the unscaled Interface layer
                let screenPt = pt.matrixTransform(this.TargetLocationMarker.getScreenCTM());
                let localPt = screenPt.matrixTransform(this.ParentLayer.getScreenCTM().inverse());

                create_ripple_single(this.ParentLayer, localPt.x, localPt.y, true, this.current_beep_frequency);
            }

            create_ripple_single(this.ParentLayer, this.TopBallPos.x, this.TopBallPos.y, true, this.current_beep_frequency);

            if (!this.is_muted) AudioCont.play_sound_effect("beep");
        }
    }

    pulse_highest_activation_bar() {
        if (!this.Indicators[this.current_level]) return;
        this.Indicators[this.current_level].style.fill = this.Settings.indicator_colors.off;
        setTimeout(() => {
            if (this.Indicators[this.current_level]) {
                this.Indicators[this.current_level].style.fill = this.Settings.indicator_colors[this.current_level];
            }
        }, 50);
    }

    update_player_location(Pos) {
        if (this.is_power_on) {
            this.get_activation_level(this.find_closest_target_distance(Pos));
        }
    }

    find_closest_target_distance(Pos) {
        let closestdist = 999999;
        this.TargetLocationMarker = null;

        this.TargetArr.forEach(target => {
            let marker = document.getElementById("location_marker_" + target.location);
            if (marker) {
                let TargetPos = get_center_coords_of_SVG_object(marker);
                let dist = EUDistPoints(Pos, TargetPos);
                if (dist < closestdist) {
                    closestdist = dist;
                    this.TargetLocationMarker = marker;
                }
            }
        });
        return closestdist;
    }

    update_targets(NewTargetsArr) {
        this.TargetArr = NewTargetsArr || [];
    }

    change_low_power_mode(newmode) {
        this.low_power = newmode;
        if (this.is_power_on && newmode) this.power_off();
        if (!this.is_power_on && !newmode) this.power_on(); // Auto turn back on when recharged
    }

    change_display_mode(newmode) {
        this.current_display_mode = newmode;
        if (newmode === true || newmode === "low_power_mode") {
            this.show();
        } else {
            this.hide();
        }
    }

    hide() {
        if (this.BeepInterval) clearInterval(this.BeepInterval);
        this.FenneFinder.style.display = "none";
        this.current_level = 0;
    }

    show() {
        this.FenneFinder.style.display = "inherit";
        this.set_indicator_lights_to_value(0);
        this.current_level = 0;
    }
}

class InterfaceController {
    constructor() {
        document.getElementById("Interface").style.display = "inherit";

        this.Prompt = new PromptController();
        this.Locator = new LocatorController();
        this.FenneFinder = new FenneFinderController();
    }

    player_moved_to_new_region(region_name) {
        this.Prompt.change_colors_based_on_region(region_name);
        this.Locator.change_region_colors(region_name);
        if (GenParam.RegionData[region_name]) {
            this.Locator.change_locator_name(GenParam.RegionData[region_name].display_name);
        }
    }
}