//Small controller to handle the animations and presentations for the text box at the top of the screen
PromptController = function(){
    //References to SVG elements
    let Layer = document.getElementById("prompt_layer")
    let Box = document.getElementById("prompt_box")
    let TextElem = document.getElementById("prompt_text")
    let Text = TextElem.childNodes[0]

    let page_width = 508
    let collapse_style = "center"
    let margin = 10
    let max_opacity = 0.9
    let currentmessagetext

    let currentTimeout = false

    //Making sure that the layer is visible
    Layer.style.display = "inherit"

    //General parameters
    let base_speed = 250

    Box.style.transition = "all " + base_speed + "ms ease-in-out"
    TextElem.style.transition = "all " + 0.5 * base_speed + "ms ease-in-out"

    //Default stroke and fill parameters
    let Defaults = {
        box_fill: "#EEEEEE",
        box_stroke: "gray",
        text_color: "black"
    }

    //Call to hide the prompt (resetting it)
    let state = "shown"
    this.hide = function(){
        Box.style.opacity = 0;
        TextElem.style.opacity = 0;
        state = "hidden"

        //Cancel any previous timeouts
        cancelTimeout()

        currentTimeout = setTimeout(function(){
            Box.style.stroke = Defaults.box_stroke;
            Box.style.fill = Defaults.box_fill;
            TextElem.fill = Defaults.text_color
            Text.innerHTML = ""
            currentTimeout = false

        }, base_speed+10)

        reduce_box_to_minimal()
    }
    function appear_from_hidden(){
        Layer.style.display = "inherit"
        Box.style.display = "inherit"
        TextElem.style.display = "inherit"

        Box.style.opacity = max_opacity
        TextElem.style.opacity = max_opacity
        state = "shown"
    }

    //Call to minimize the prompt (this maintains its colors!)
    this.minimize = function(){
        reduce_box_to_minimal()
    }
    function reduce_box_to_minimal(){
        state = "minimized"
        TextElem.style.opacity = 0;
        TextElem.style.display = "none"
        Box.style.opacity = 0

        //Cancel any previous timeouts
        cancelTimeout()

        switch(collapse_style){
            case("center"):
                Box.style.stroke = Box.style.fill
                Box.setAttribute("width", 0)
                Box.setAttribute("x", page_width/2)
        }

        currentTimeout = setTimeout(function(){
            Text.innerHTML = ""
            TextElem.style.display = "inherit"
            currentTimeout = false
        },base_speed)
    }
    function expand_box_to_contain_text(){
        Box.setAttribute("x", TextElem.getBBox().x  - margin)
        Box.setAttribute("width", TextElem.getBBox().width + 2*margin)
        Box.style.opacity = max_opacity
    }

    //Changes the current color-scheme of the prompt. Note that this will be reset after the prompt is hidden
    this.change_colors_based_on_location = function(location_name){
        //Given a location, get the region
        let color_light = Param.LocationData[location_name].lighter_color
        let color_dark = Param.LocationData[location_name].darker_color

        Box.style.fill = color_light + "CC"
        Box.style.stroke = color_dark + "00"
        Text.style.fill = color_dark
    }
    this.change_colors_to_default = function(){
        Box.style.fill = Defaults.box_fill
        Box.style.stroke = Defaults.box_stroke
        Text.style.fill = Defaults.text_color
    }


    //Call to show a message
    this.show_message = function(text){
        if(state === "hidden" ){ appear_from_hidden()}

        //Set the text
        change_text(text)
    }

    //Call to show a message, but with a new set of colors
    this.show_message_with_new_colors = function(text, boxfill, boxstroke, textcol){
        if(state === "hidden" ){ appear_from_hidden()}

        //Set the colors
        Box.style.fill = boxfill
        Box.style.stroke = boxstroke
        Text.style.fill = textcol

        //Set the text
        change_text(text)

    }

    function change_text(new_text){
        //Cancel any previous timeouts
        cancelTimeout()
        currentmessagetext = new_text

        if(state === "minimized"){
            //Sneakily change the text (while still hidden)
            Text.innerHTML = new_text

            //Expand the box
            currentTimeout = setTimeout(function(){
                expand_box_to_contain_text()

                //Show the text
                currentTimeout = setTimeout(function(){
                    TextElem.style.opacity = 1
                    currentTimeout = false
                }, base_speed)

            }, 5)

            state = "shown"

        }else{
            //The box is already shown. First we hide the text
            TextElem.style.display = "none"
            TextElem.style.opacity = 0

            //Then we update the text and show it again
            currentTimeout = setTimeout(function(){
                Text.innerHTML = new_text
                TextElem.style.display = "inherit"

                currentTimeout = setTimeout(function(){
                    expand_box_to_contain_text()

                    currentTimeout = setTimeout(function(){
                        TextElem.style.opacity = max_opacity
                        currentTimeout = false
                    },1.1 * base_speed)

                },5)

            },15)
        }

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
