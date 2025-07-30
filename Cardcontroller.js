

CardController = function(MainSVG, HeadSVG, ReservoirElem, GroupingCont){
    //Defining the key variables of the card
    let card_name, CardDiv, SVG_elem, NameP, SVG_innergroup, HeadSVGElem, current_station_name, CurrentStationElem, current_state, that = this, CurrentContainingBox, is_currently_in_box = false, is_fixed_in_place = false

    function initalize(){
        // The name can be extracted from the ID of the SVG
        card_name = HeadSVG.getAttribute("id").split("_")[2]

        //Creating the SVG element
        CardDiv = document.createElement("div")
        SVG_elem = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        SVG_elem.setAttribute("width", CardParam.Card_Size.width)
        SVG_elem.setAttribute("height", CardParam.Card_Size.height)
        CardDiv.classList.add("card")

        CardDiv.appendChild(SVG_elem)
        ReservoirElem.appendChild(CardDiv)

        SVG_innergroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
        SVG_elem.appendChild(SVG_innergroup)

        //Creating a card background
        SVG_innergroup.appendChild(create_SVG_rect(0,0,CardParam.Card_Size.width, CardParam.Card_Size.height, "card_background", undefined))

        //Adding the head SVG
        HeadSVGElem = create_SVG_group(0,0,"card_head", undefined)
        HeadSVGElem.appendChild(HeadSVG)
        SVG_innergroup.appendChild(HeadSVGElem)

        //Resizing the head
        let scale_x = 1/ ( HeadSVGElem.getBBox().width / CardParam.Card_Size.width)
        let scale_y = 1/ ( HeadSVGElem.getBBox().height / CardParam.Card_Size.height)

        //If either dimension is too large (either scale factor < 1), then shrink the head based on the lowest scale factor.
        //Else: if both dimensions are too small (both scale factors > 0, then inflate the head based on the lowest scale factor)
        let min_scale = Math.min(scale_x,scale_y)
        HeadSVGElem.style.transform = "scale(" + min_scale + ")"

        current_state = "attached"
        current_station_name = "reservoir"
        CurrentStationElem = ReservoirElem

        //Optionally adding a name to the top of the card

        if(CardParam.include_names_on_card){
            NameP = document.createElement("p")

            //TODO: change to subject-facing names
            NameP.innerHTML = card_name

            NameP.classList.add("card_name")

            CardDiv.appendChild(NameP)
        }


    }
    initalize()

    //This detaches the card from its station and makes it follow the cursor
    function detach_from_station(){
        current_state = "detached"
        SVG_innergroup.classList.add("active_card")

        //Move the card to the main SVG
        MainSVG.appendChild(SVG_innergroup)
        CurrentStationElem.removeChild(CardDiv)

        //Check if currently in a box. If so, inform the box that the card has been removed
        if(CurrentContainingBox !== undefined){
            CurrentContainingBox.remove_card_from_box(card_name)
            CurrentContainingBox = undefined
            CurrentStationElem = ReservoirElem
        }

    }

    this.attach_to_box = function(Box){
        if(Box !== false){
            let BoxElem = Box.request_to_add_card(card_name)
            CurrentContainingBox = Box
            CurrentStationElem = BoxElem
        }


        MainSVG.removeChild(SVG_innergroup)
        CurrentStationElem.appendChild(CardDiv)
        SVG_elem.appendChild(SVG_innergroup)
        current_state = "attached"
        is_currently_in_box = true
        SVG_innergroup.style.transform = ""
        SVG_innergroup.classList.remove("active_card")

        GroupingCont.check_reservoir_scroll()
        GroupingCont.update_continue_button()
    }

    //Call when the dragging is terminated without the card reaching a valid next position
    this.return_to_reservoir = function(){
        MainSVG.removeChild(SVG_innergroup)
        CurrentStationElem.appendChild(CardDiv)
        SVG_elem.appendChild(SVG_innergroup)
        current_state = "attached"
        SVG_innergroup.style.transform = ""
        GroupingCont.check_reservoir_scroll()
        GroupingCont.update_continue_button()
        SVG_innergroup.classList.remove("active_card")
        is_currently_in_box = false
    }

    //Event handlers
    SVG_elem.onpointerdown = function(event){
        //Check if a different card is already being dragged. If so, ignore this
        if(! is_fixed_in_place){
            detach_from_station()
            GroupingCont.call_attention_to_different_card_controller(that)
            let MouseCoords = GroupingCont.get_cursors_coords(event)
            that.move_card_to_cursor(MouseCoords.x,MouseCoords.y)
        }
    }

    this.move_card_to_cursor = function(mouse_x,mouse_y){
        let target_x = mouse_x -0.5 * CardParam.Card_Size.width
        let target_y = mouse_y -0.5 * CardParam.Card_Size.height
        SVG_innergroup.style.transform = "translate(" + target_x + "px," + target_y + "px)"
    }

    //Call with an array of names. If the card name is in this array, then move it back to reservoir
    this.check_if_card_back_to_reservoir = function(Array_of_names){
        if(Array_of_names.includes(card_name)){
            detach_from_station()
            that.return_to_reservoir()
        }
    }

    //Call to check if this card is currently placed in a box (true) or is in the reservoir (false
    this.has_been_placed_in_box = function(){

        if(CardDiv.parentElement === undefined){
            return(false)
        }else{
            if(CardDiv.parentElement === null){
                return(false)
            }else{
                return(CardDiv.parentElement.id !== "ReservoirCardDiv")
            }

        }

        //return(is_currently_in_box)
    }

    //Call when this card has to remain fixed in place (cannot be dragged away anymore)
    this.fix_card_in_place = function(){
        is_fixed_in_place = true
    }


}


