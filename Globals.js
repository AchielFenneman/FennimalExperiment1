// Public variable denoting which locations currently contain a Fennimal.
console.warn("CREATING GLOBALS")

WORLDSTATE = function(){
    let FennimalsInLocation = {}
    let LocationVisitedMarker = {}
    let LocationsOrderVisited = {}
    let counter_Fennimal_within_block = 0 // Gets reset whenever the world is cleared

    this.initialize_world = function(){
        for(let i = 0; i<Param.Available_Location_Names.length; i++){
            FennimalsInLocation[Param.Available_Location_Names[i]] = false
            LocationVisitedMarker[Param.Available_Location_Names[i]] = false
            LocationsOrderVisited[Param.Available_Location_Names[i]] = false
        }
    }

    this.clear_all_Fennimals = function(){
        for(let key in FennimalsInLocation){
            FennimalsInLocation[key] = false
        }
        counter_Fennimal_within_block = 0
    }

    this.remove_Fennimal_from_location = function(location){
        FennimalsInLocation[location] = false
    }

    this.add_Fennimal_to_location = function(location, FennimalObj){
        FennimalsInLocation[location] = FennimalObj
    }
    //Call when a Fennimal's data has been update (usually after a trial is completed. Note: this uses the counter of found-within-block
    this.update_Fennimal_in_location_after_interaction_completed = function(FennimalObj){
        counter_Fennimal_within_block++
        FennimalObj.encounter_order_in_block =counter_Fennimal_within_block
        FennimalObj.encounter_completed = true
        FennimalsInLocation[FennimalObj.location] = FennimalObj
        LocationVisitedMarker[FennimalObj.location] = "completed"

    }

    this.check_if_Fennimal_in_location = function(location){
        return(FennimalsInLocation[location])
    }

    this.get_Fennimals_state_object = function(){
        return JSON.parse(JSON.stringify(FennimalsInLocation))
    }

    //LOCATION VISITED MARKERS
    this.reset_locations_visited = function(){
        for(let key in FennimalsInLocation){
            LocationVisitedMarker[key] = false
        }
    }
    this.location_visited = function(location, order_visited){
        LocationVisitedMarker[location] = true
        if(LocationsOrderVisited[location] === false){
            LocationsOrderVisited[location] = [order_visited]
        }else{
            LocationsOrderVisited[location].push(order_visited)
        }
    }

    this.check_if_location_visited = function(location){
        return(LocationVisitedMarker[location])
    }
    this.get_location_visited_state_object = function(){
        return JSON.parse(JSON.stringify(LocationVisitedMarker))
    }
    this.get_locations_visited_order_object = function(){
        return JSON.parse(JSON.stringify(LocationsOrderVisited))
    }

    this.get_array_of_all_locations = function(){
        return( Object.keys(LocationVisitedMarker) )
    }

}

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
        box_fill: "lightgray",
        box_stroke: "gray",
        text_color: "gray"
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
        Box.style.opacity = 1
    }

    //Changes the current color-scheme of the prompt. Note that this will be reset after the prompt is hidden
    this.change_colors_based_on_region = function(region_name){
        //Given a location, get the region
        let color_light = Param.RegionData[region_name].lighter_color
        let color_dark = Param.RegionData[region_name].darker_color

        Box.style.fill = color_light + "CC"
        Box.style.stroke = color_dark + "00"
        Text.style.fill = color_dark

    }
    this.change_colors_based_on_location = function(location_name){
        let region = Param.LocationTransitionData["location_" +  location_name].region
        this.change_colors_based_on_region(region)


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



let Worldstate = new WORLDSTATE()
let Prompt = new PromptController()

let Items_In_Backpack = [];

//Keep track of the order in which Fennimals are encountered during a block