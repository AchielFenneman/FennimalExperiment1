PromptController = function () {
    let that = this
    //The prompt on the top
    let PromptBox = document.getElementById("prompt_box")
    let PromptTextElem = document.getElementById("prompt_text")
    let Text = PromptTextElem.childNodes[0]

    let collapse_style = "center"
    let margin = 10
    let max_opacity = 0.9
    let currentmessagetext

    let currentTimeout = false
    let block_from_change = false

    //General parameters
    let base_speed = 250

    PromptBox.style.transition = "all " + base_speed + "ms ease-in-out"
    PromptTextElem.style.transition = "all " + 0.5 * base_speed + "ms ease-in-out"
    PromptBox.style.pointerEvents = "none"

    //Call to hide the prompt (resetting it)
    let state = "shown"
    this.hide = function () {
        PromptBox.style.opacity = 0;
        PromptTextElem.style.opacity = 0;
        state = "hidden"
        currentmessagetext = ""

        //Cancel any previous timeouts
        cancelTimeout()

        reduce_box_to_minimal()
    }

    function appear_from_hidden() {
        PromptBox.style.display = "inherit"
        PromptTextElem.style.display = "inherit"

        PromptBox.style.opacity = max_opacity
        PromptTextElem.style.opacity = max_opacity
        state = "shown"
    }

    //Call to minimize the prompt (this maintains its colors!)
    function reduce_box_to_minimal() {
        clearTimeout(currentTimeout)
        state = "minimized"
        PromptTextElem.style.opacity = 0;
        PromptTextElem.style.display = "none"
        PromptBox.style.opacity = 0

        //Cancel any previous timeouts
        cancelTimeout()

        switch (collapse_style) {
            case("center"):
                PromptBox.style.stroke = PromptBox.style.fill
                PromptBox.setAttribute("width", 0)
                PromptBox.setAttribute("x", 0.5 * GenParam.SVG_width)
        }

        currentTimeout = setTimeout(function () {
            Text.innerHTML = ""
            PromptTextElem.style.display = "inherit"

            currentmessagetext = ""
        }, base_speed)
    }

    function expand_box_to_contain_text() {
        PromptBox.setAttribute("x", PromptTextElem.getBBox().x - margin)
        PromptBox.setAttribute("width", PromptTextElem.getBBox().width + 2 * margin)
        PromptBox.style.opacity = max_opacity
    }

    //Changes the current color-scheme of the prompt. Note that this will be reset after the prompt is hidden
    this.change_colors_based_on_region = function (region_name) {
        //Given a location, get the region
        let color_light = GenParam.RegionData[region_name].lighter_color
        let color_dark = GenParam.RegionData[region_name].darker_color

        PromptBox.style.fill = color_light + "CC"
        PromptBox.style.stroke = color_dark + "00"
        Text.style.fill = color_dark

    }

    //Todo: update
    this.change_colors_based_on_location = function (location_name) {
        let region = GenParam.LocationTransitionData["location_" + location_name].region
        this.change_colors_based_on_region(region)


    }

    //Call to show a message
    let auto_duration_timeout
    this.show_message = function (text, auto_remove_after_duration) {
        clearTimeout(auto_duration_timeout)
        clearTimeout(currentTimeout)

        if (state === "hidden") {
            appear_from_hidden()
        }

        if (currentmessagetext !== text) {
            //Set the text
            change_text(text)
            expand_box_to_contain_text()

            if (state === "minimized") {
                //Text.innerHTML = text

                //Expand the box
                expand_box_to_contain_text()

                state = "shown"
            }
        }

        if (typeof auto_remove_after_duration !== "undefined") {
            if (auto_remove_after_duration !== false) {
                auto_duration_timeout = setTimeout(function () {
                    that.hide()
                }, auto_remove_after_duration)
            }
        }


    }

    //Call to show a message, but with a new set of colors
    this.show_message_with_new_colors = function (text, boxfill, boxstroke, textcol) {
        if (state === "hidden") {
            appear_from_hidden()
        }

        //Set the colors
        PromptBox.style.fill = boxfill
        PromptBox.style.stroke = boxstroke
        Text.style.fill = textcol

        //Set the text
        change_text(text)

    }

    //Call to show a feedback message
    this.show_feedback_message = function (text, valence) {
        if (state === "hidden") {
            appear_from_hidden()
        }

        let boxfill, textcol, boxstroke
        switch (valence) {
            case("unknown"): {
                boxfill = "#f2f2f2"
                boxstroke = "#4d4d4d99"
                textcol = "#4d4d4dff"
                break
            }
            case("neutral"): {
                boxfill = "#f2f2f2"
                boxstroke = "#4d4d4d99"
                textcol = "#4d4d4dff"
                break
            }
            case("heart"): {
                boxfill = "#b5d4a1"
                boxstroke = "#225500AA"
                textcol = "#225500"
                break
            }
            case("smile"): {
                boxfill = "#b5d4a1"
                boxstroke = "#225500AA"
                textcol = "#225500"
                break
            }
            case("frown"): {
                boxfill = "#ffd5d5"
                boxstroke = "#800000AA"
                textcol = "#800000ff"
                break
            }
            case("bites"): {
                boxfill = "#d4aa00ff"
                boxstroke = "red"
                textcol = "red"
                break
            }


        }

        //Set the colors
        PromptBox.style.fill = boxfill
        PromptBox.style.stroke = boxstroke
        Text.style.fill = textcol

        //Set the text
        change_text(text)


    }

    function impose_temporary_block() {
        block_from_change = true
        setTimeout(function () {
            block_from_change = false
        }, base_speed)
    }

    function change_text(new_text) {

        //The box is already shown. First we hide the text
        PromptTextElem.style.display = "none"
        PromptTextElem.style.opacity = 0
        Text.innerHTML = new_text
        currentmessagetext = new_text
        PromptTextElem.style.display = "inherit"

        setTimeout(function () {
            PromptTextElem.style.opacity = max_opacity
        }, base_speed)
    }

    //Cancel any previous timeouts
    function cancelTimeout() {
        if (currentTimeout !== false) {
            clearTimeout(currentTimeout)
            currentTimeout = false
        }
    }

    //On constructions
    this.hide()

    this.get_current_message_text = function () {
        return (currentmessagetext)
    }

}

LocatorController = function () {
    let Container = document.getElementById("interface_location")
    let Text = document.getElementById("interface_location_text")
    let Box = document.getElementById("interface_location_box")

    let minwidth = 15

    this.change_region_colors = function (region_name) {

        //Given a location, get the region
        let color_light = GenParam.RegionData[region_name].lighter_color
        let color_dark = GenParam.RegionData[region_name].darker_color

        Box.style.fill = color_light + "CC"
        Text.style.fill = color_dark

    }

    this.change_locator_name = function (location_name) {

        if (location_name === false) {
            Container.style.display = "none"
        } else {
            Container.style.display = "inherit"

            //Setting colors
            Text.style.opacity = 0
            Text.childNodes[0].innerHTML = location_name
            //Text.childNodes[0].innerHTML = "VERY LONG NAME HERE"
            Text.style.transition = ""
            Text.style.opacity = 0

            Box.style.transition = "all 200ms ease-in-out"

            //First we are reducing the side of the box to the minimum
            setTimeout(function () {
                Box.setAttribute("width", minwidth)
                Text.style.transition = "all 300ms ease-in-out"
            }, 5)

            //Then we expand the box
            setTimeout(function () {
                let new_width = minwidth + parseInt(Text.getBBox().width) + 60
                Box.setAttribute("width", new_width)
            }, 205)

            //Then we show the text
            setTimeout(function () {
                Text.style.opacity = 1
            }, 405)

            //Later on, reset the transitions
            setTimeout(function () {
                Text.style.transition = ""
                Box.style.transition = ""
            }, 700)
        }
    }

    //Show and hides the locator. DOES NOT CHANGE ITS VALUE OR COLOR
    this.hide = function () {
        Container.style.display = "none"
    }
    this.show = function () {
        Container.style.display = "inherit"
    }


}

InterfaceController = function () {
    document.getElementById("Interface").style.display = "inherit"

    this.Prompt = new PromptController()
    this.Locator = new LocatorController()

    this.player_moved_to_new_region = function (region_name) {
        this.Prompt.change_colors_based_on_region(region_name)
        this.Locator.change_region_colors(region_name)
        this.Locator.change_locator_name(GenParam.RegionData[region_name].display_name)
    }

    this.FenneFinder = new FenneFinder()
}

FenneFinder = function(){
    let BeepInterval, TargetLocationMarker, current_level = 0, current_dist,currently_powering_on = false, current_beep_frequency, is_muted = false, is_power_on = false
    const num_indicators = 8, off_distance = 350, max_activation_distance = 30, min_beep_frequency = 1000, max_beep_frequency = 400
    const Settings = {
        indicator_colors: {
            8: "#06f3f5",
            7: "#1eed5e",
            6: "#3ae61e",
            5: "#66db21",
            4: "#92cf24",
            3: "#c6c227",
            2: "#d98c1b",
            1: "#f62e06",
            off: "#333333"
        },
    }

    let TargetArr, low_power, current_display_mode
    let ParentLayer, FenneFinder, TopBall,TopBallPos, MuteButton, PowerButton, BatteryScreen, BatteryScreenOutline, BatteryLowIndicator, BatteryNormalIndicator
    function assign_all_elements(){
        //On creation, copy and show the Fennefinder in the bottom of the screen
        ParentLayer = document.getElementById("Interface")
        ParentLayer.style.display = "inherit"
        FenneFinder = document.getElementById("Fennefinder").cloneNode(true)
        FenneFinder.setAttribute("id", "")
        FenneFinder.classList.add("do_not_move_on_click")
        ParentLayer.appendChild(FenneFinder)
        FenneFinder.style.display = "inherit"

        TopBall = FenneFinder.getElementsByClassName("Fennefinder_top")[0]
        TopBallPos = get_center_coords_of_SVG_object(TopBall)
        TopBall.style.fill = "dimgray"
        TopBall.style.transition = "all 50ms ease-in-out"

        let Buttons = FenneFinder.getElementsByClassName("Fennefinder_button")
        for(let i =0;i<Buttons.length;i++){
            switch(Buttons[i].id){
                case("Fennefinder_button_mute"):
                    MuteButton = Buttons[i]
                    MuteButton.style.cursor = "pointer"
                    MuteButton.onpointerdown = toggle_mute_button
                    break
                case("Fennefinder_button_on"):
                    PowerButton = Buttons[i]
                    PowerButton.style.cursor = "pointer"
                    PowerButton.onpointerdown = toggle_power_button
                    break
            }
        }

        BatteryScreen = FenneFinder.getElementsByClassName("Fennefinder_battery_screen")[0]
        BatteryScreen.style.fill = "black"
        BatteryScreen.style.transition = "all 100ms ease-in"

        BatteryScreenOutline = FenneFinder.getElementsByClassName("Fennefinder_battery_outline")[0]
        BatteryScreenOutline.style.opacity = 0
        BatteryScreenOutline.style.transition = "all 100ms ease-in"

        let BatteryIndicators = FenneFinder.getElementsByClassName("Fennefinder_battery_status")
        for(let i =0;i<BatteryIndicators.length;i++){
            switch(BatteryIndicators[i].id){
                case("Fennefinder_battery_status_low"):
                    BatteryLowIndicator = BatteryIndicators[i]
                    BatteryLowIndicator.style.opacity = 0
                    BatteryLowIndicator.style.transition = "all 100ms ease-in"
                    break
                case("Fennefinder_battery_status_power"):
                    BatteryNormalIndicator = BatteryIndicators[i]
                    BatteryNormalIndicator.style.opacity = 0
                    BatteryNormalIndicator.style.transition = "all 100ms ease-in"
                    break
            }
        }


    }

    //Setting all indicators and levels
    let Indicators = {}
    function set_all_indicators(){
        let All_Indicators = FenneFinder.getElementsByClassName("Fennefinder_indicator")
        for(let i = 0; i < All_Indicators.length; i++){
            const id = All_Indicators[i].getAttribute("id")
            if(id !== null){
                const num = id.split("_")[1]
                Indicators[num] = All_Indicators[i]
                Indicators[num].style.transition = "all 25ms ease-in"
            }
        }
    }
    //Here we define the thresholds and beep frequencies for all the levels
    function set_threshold_levels(){
        Settings.levels = {}
        for(let i = 1 ; i <= num_indicators; i++){
            Settings.levels[i] = {
                threshold: Math.round(off_distance - (i-1) * ((off_distance-max_activation_distance)/(num_indicators-1))),
                frequency: Math.round(min_beep_frequency - (i-1) * ((min_beep_frequency - max_beep_frequency)/(num_indicators-1)))
            }
        }
    }
    function set_indicator_lights_to_value(val){
        for(let i = 1; i <= num_indicators; i++){
            Indicators[i].style.fill = Settings.indicator_colors.off

            if(i <= val){
                //setTimeout(function(){Indicators[i].style.fill = Settings.indicator_colors[i]}, i * 25)
                 Indicators[i].style.fill = Settings.indicator_colors[i]

            }else{
                Indicators[i].style.fill = Settings.indicator_colors.off
            }


        }
    }
    function get_activation_level(dist){
        let level = 0
        for(let i = 1;i <= num_indicators; i++ ){
            if(dist <= Settings.levels[i].threshold){
                level  =  i
            }
        }
        if(current_level !== level){
            change_activation_level(level)
        }
    }

    //Button and battery functions
    function toggle_mute_button(){
        AudioCont.play_sound_effect("button_click")
        if(is_muted){
            is_muted = false
            MuteButton.getElementsByTagName("circle")[0].style.fill = "#6869c8"
            MuteButton.getElementsByTagName("path")[0].style.fill = "black"

        }else{
            is_muted = true
            MuteButton.getElementsByTagName("circle")[0].style.fill = "#3e3f63"
            MuteButton.getElementsByTagName("path")[0].style.fill = "lightgray"

        }
    }

    function toggle_power_button(){
        AudioCont.play_sound_effect("button_click")
        if(! currently_powering_on){
            if(is_power_on){
                is_power_on= false
                PowerButton.getElementsByTagName("circle")[0].style.fill = "#6869c8"
                PowerButton.getElementsByTagName("path")[0].style.fill = "black"

                power_off()
            }else{
                PowerButton.getElementsByTagName("circle")[0].style.fill = "#3e3f63"
                if(low_power){
                    PowerButton.getElementsByTagName("path")[0].style.fill = "red"
                }else{
                    PowerButton.getElementsByTagName("path")[0].style.fill = "lightgreen"
                }
                power_on()
            }
        }
    }

    function power_on(){
        currently_powering_on = true
        show_battery_indicator()
    }
    function power_off(){
        set_indicator_lights_to_value(0)
        clearInterval(BeepInterval)

        is_power_on= false
        PowerButton.getElementsByTagName("circle")[0].style.fill = "#6869c8"
        PowerButton.getElementsByTagName("path")[0].style.fill = "black"

        if(low_power){
            PowerButton.getElementsByTagName("circle")[0].style.fill = "maroon"
            PowerButton.getElementsByTagName("path")[0].style.fill = "white"
        }

        BatteryNormalIndicator.style.opacity = 0
        BatteryLowIndicator.style.opacity = 0
        BatteryScreenOutline.style.opacity = 0
        setTimeout(function(){
            BatteryScreen.style.fill = "black"
        },100)
    }
    function show_battery_indicator(){
        BatteryScreen.style.fill = "lightgray"
        BatteryScreenOutline.style.opacity = 1
        setTimeout(function(){
            if(low_power){
                //Show the low-battery warning light
                show_low_power_and_switch_off()
            }else{
                BatteryNormalIndicator.style.opacity = 1
                setTimeout(function(){
                    change_activation_level(current_level)
                    currently_powering_on = false
                    is_power_on = true
                },100)
            }
        },100)
    }
    function show_low_power_and_switch_off(){
        BatteryLowIndicator.style.opacity = 1
        let AllPaths = BatteryLowIndicator.getElementsByTagName("path")
        let Paths = []

        for(let i = 0; i <= AllPaths.length; i++ ){
            if( AllPaths[i] !== undefined){
                AllPaths[i].style.transition = "all 100ms ease-in"
                AllPaths[i].style.strokeWidth = "1px"
                Paths.push(AllPaths[i])
            }
        }

        //Blinking to red
        setTimeout(function(){
            for(let i = 0; i < Paths.length; i++ ){
                Paths[i].style.stroke = "red"
            }
        },150)

        //Stroke off
        setTimeout(function(){
            for(let i = 0; i < Paths.length; i++ ){
                Paths[i].style.stroke = "none"
            }
        },300)

        //Back to red
        setTimeout(function(){
            for(let i = 0; i < Paths.length; i++ ){
                Paths[i].style.stroke = "red"
            }
        },450)

        //Stroke off again
        setTimeout(function(){
            for(let i = 0; i < Paths.length; i++ ){
                Paths[i].style.stroke = "none"
            }
        },600)

        //Red again
        setTimeout(function(){
            for(let i = 0; i < Paths.length; i++ ){
                Paths[i].style.stroke = "red"
            }
        },750)

        //Off again, then
        setTimeout(function(){
            for(let i = 0; i < Paths.length; i++ ){
                Paths[i].style.stroke = "none"
            }
        },1000)

        //Turn off the finder
        setTimeout(function(){
            currently_powering_on = false
            Interface.Prompt.show_message("Oops! The FenneFinder is out of battery...", 1500)
            //AudioCont.play_sound_effect("battery_low")
            power_off()
        },1150)

    }

    //Feedback functions
    function change_activation_level(newlevel){
        if(newlevel > current_level){
            if(! is_muted){
                AudioCont.play_sound_effect("alert_minor")
            }

        }

        current_level = newlevel
        show_indication_level()
        clearInterval(BeepInterval)
        if(newlevel === 0){

        }else{
            current_beep_frequency = Settings.levels[newlevel].frequency
            BeepInterval = setInterval(function () {beep()}, current_beep_frequency)
        }

    }

    function show_indication_level(){
        set_indicator_lights_to_value(current_level)
    }

    function beep(){

        pulse_highest_activation_bar()
        if(current_level >= 5){
            pulse_top()

        }
        if(current_level >= 6){
            let Coords = getSVGInternalCenter(TargetLocationMarker)
            create_ripple_single(ParentLayer,Coords.x, Coords.y, true, current_beep_frequency )
            create_ripple_single(ParentLayer,TopBallPos.x, TopBallPos.y, true, current_beep_frequency )
            if(! is_muted){
                AudioCont.play_sound_effect("beep")
            }
        }

    }
    function pulse_top(){
        TopBall.style.fill = "red"
        setTimeout(function () {
            TopBall.style.fill = "dimgray"
        }, 75)


    }
    function pulse_highest_activation_bar(){
        Indicators[current_level].style.fill = Settings.indicator_colors.off
        setTimeout(function () {Indicators[current_level].style.fill = Settings.indicator_colors[current_level]}, 50)
    }

    //Call with the player distance to update the signal strength
    this.update_player_location = function(Pos){
        if(is_power_on){
            get_activation_level(find_closest_target_distance(Pos))
        }
    }

    function find_closest_target_distance(Pos){
        let closestdist = 999999, ClosestMarker

        for(let i = 0; i < TargetArr.length; i++ ){
            let TargetMarker = document.getElementById("location_marker_" + TargetArr[i].location)

            let TargetPos = get_center_coords_of_SVG_object(TargetMarker)
            let dist = EUDistPoints(Pos,TargetPos)
            if(dist < closestdist){
                closestdist = dist
                ClosestMarker = TargetMarker
            }
        }

        TargetLocationMarker = ClosestMarker
        return(closestdist);
    }

    this.hide = function(){
        clearInterval(BeepInterval)
        FenneFinder.style.display = "none"
        current_level = 0
    }
    this.show = function(){
        if(current_display_mode === true || current_display_mode === "low_power_mode"){
            FenneFinder.style.display = "inherit"
            set_indicator_lights_to_value(0)
            current_level = 0
        }
        //toggle_power_button()
    }

    //Updates the targets to which the Fennefinder responds
    this.update_targets = function(NewTargetsArr){
        TargetArr = NewTargetsArr
    }
    this.change_low_power_mode = function(newmode){
        low_power = newmode
        //Shut down the Fennecontroller if it was on and low power mode is enabled
        if(is_power_on && newmode === true){
            power_off()
        }
        if( newmode === false ){
            power_on()
        }
    }
    this.change_display_mode = function(newmode){
        if(newmode !== "undefined"){
            current_display_mode = newmode
            switch(newmode){
                case("false"): this.hide(); break
                case("true"): this.show(); break
                case("lower_power_mode"): this.show()  ; break
            }
        }
    }

    //On creation
    assign_all_elements()
    set_all_indicators()
    set_threshold_levels()
    set_indicator_lights_to_value(0)
    toggle_power_button()
    this.change_display_mode(false)


    this.delete = function(){
        console.log( "deleting Finder")
        FenneFinder.remove()
    }
}