PromptController = function(){
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

    //Call to hide the prompt (resetting it)
    let state = "shown"
    this.hide = function(){
        PromptBox.style.opacity = 0;
        PromptTextElem.style.opacity = 0;
        state = "hidden"
        currentmessagetext = ""

        //Cancel any previous timeouts
        cancelTimeout()

        reduce_box_to_minimal()
    }
    function appear_from_hidden(){
        PromptBox.style.display = "inherit"
        PromptTextElem.style.display = "inherit"

        PromptBox.style.opacity = max_opacity
        PromptTextElem.style.opacity = max_opacity
        state = "shown"
    }

    //Call to minimize the prompt (this maintains its colors!)
    function reduce_box_to_minimal(){
        clearTimeout(currentTimeout)
        state = "minimized"
        PromptTextElem.style.opacity = 0;
        PromptTextElem.style.display = "none"
        PromptBox.style.opacity = 0

        //Cancel any previous timeouts
        cancelTimeout()

        switch(collapse_style){
            case("center"):
                PromptBox.style.stroke = PromptBox.style.fill
                PromptBox.setAttribute("width", 0)
                PromptBox.setAttribute("x",0.5* GenParam.SVG_width)
        }

        currentTimeout = setTimeout(function(){
            Text.innerHTML = ""
            PromptTextElem.style.display = "inherit"

            currentmessagetext = ""
        },base_speed)
    }
    function expand_box_to_contain_text(){
        PromptBox.setAttribute("x", PromptTextElem.getBBox().x  - margin)
        PromptBox.setAttribute("width", PromptTextElem.getBBox().width + 2*margin)
        PromptBox.style.opacity = max_opacity
    }

    //Changes the current color-scheme of the prompt. Note that this will be reset after the prompt is hidden
    this.change_colors_based_on_region = function(region_name){
        //Given a location, get the region
        let color_light = GenParam.RegionData[region_name].lighter_color
        let color_dark = GenParam.RegionData[region_name].darker_color

        PromptBox.style.fill = color_light + "CC"
        PromptBox.style.stroke = color_dark + "00"
        Text.style.fill = color_dark

    }

    //Todo: update
    this.change_colors_based_on_location = function(location_name){
        let region = GenParam.LocationTransitionData["location_" +  location_name].region
        this.change_colors_based_on_region(region)


    }

    //Call to show a message
    let auto_duration_timeout
    this.show_message = function(text, auto_remove_after_duration){
        clearTimeout(auto_duration_timeout)
        clearTimeout(currentTimeout)

        if(state === "hidden" ){
            appear_from_hidden()
        }

        if(currentmessagetext !== text){
            //Set the text
            change_text(text)
            expand_box_to_contain_text()

            if(state === "minimized"){
                //Text.innerHTML = text

                //Expand the box
                expand_box_to_contain_text()

                state = "shown"
            }
        }

        if(typeof auto_remove_after_duration !== "undefined"){
            if(auto_remove_after_duration !== false){
                auto_duration_timeout= setTimeout(function(){that.hide()}, auto_remove_after_duration)
            }
        }



    }

    //Call to show a message, but with a new set of colors
    this.show_message_with_new_colors = function(text, boxfill, boxstroke, textcol){
        if(state === "hidden" ){ appear_from_hidden()}

        //Set the colors
        PromptBox.style.fill = boxfill
        PromptBox.style.stroke = boxstroke
        Text.style.fill = textcol

        //Set the text
        change_text(text)

    }

    //Call to show a feedback message
    this.show_feedback_message = function(text, valence){
        if(state === "hidden" ){ appear_from_hidden()}

        let boxfill, textcol, boxstroke
        switch(valence){
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

    function impose_temporary_block(){
        block_from_change = true
        setTimeout(function(){
            block_from_change = false
        }, base_speed)
    }

    function change_text(new_text){

        //The box is already shown. First we hide the text
        PromptTextElem.style.display = "none"
        PromptTextElem.style.opacity = 0
        Text.innerHTML = new_text
        currentmessagetext = new_text
        PromptTextElem.style.display = "inherit"

        setTimeout(function(){
           PromptTextElem.style.opacity = max_opacity
        },base_speed)
    }

    //Cancel any previous timeouts
    function cancelTimeout(){
        if(currentTimeout !== false){
            clearTimeout(currentTimeout)
            currentTimeout = false
        }
    }

    //On constructions
    this.hide()

    this.get_current_message_text = function(){
        return(currentmessagetext)
    }

}

LocatorController = function(){
    let Container = document.getElementById("interface_location")
    let Text = document.getElementById("interface_location_text")
    let Box = document.getElementById("interface_location_box")

    let minwidth = 15

    this.change_region_colors = function(region_name){

        //Given a location, get the region
        let color_light = GenParam.RegionData[region_name].lighter_color
        let color_dark = GenParam.RegionData[region_name].darker_color

        Box.style.fill = color_light + "CC"
        Text.style.fill = color_dark

    }

    this.change_locator_name = function(location_name){

        if(location_name === false){
            Container.style.display = "none"
        }else{
            Container.style.display = "inherit"

            //Setting colors
            Text.style.opacity = 0
            Text.childNodes[0].innerHTML = location_name
            //Text.childNodes[0].innerHTML = "VERY LONG NAME HERE"
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
                let new_width = minwidth +  parseInt(Text.getBBox().width)+ 60
                Box.setAttribute("width", new_width)
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

    //Show and hides the locator. DOES NOT CHANGE ITS VALUE OR COLOR
    this.hide = function(){
        Container.style.display = "none"
    }
    this.show = function(){
        Container.style.display = "inherit"
    }




}

InterfaceController = function(){
    document.getElementById("Interface").style.display = "inherit"

    this.Prompt = new PromptController()
    this.Locator = new LocatorController()

    this.player_moved_to_new_region = function(region_name){
        this.Prompt.change_colors_based_on_region(region_name)
        this.Locator.change_region_colors(region_name)
        this.Locator.change_locator_name(GenParam.RegionData[region_name].display_name)
    }
}