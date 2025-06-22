
BoxController = function(ParentElem, GroupingCont){
    //Creating the foreignelement which will contain all the boxes.
    let that = this

    let Box_Foreign = create_SVG_foreignElement(10,100,1900, 750)
    Box_Foreign.id = "BoxForeign"
    ParentElem.appendChild(Box_Foreign)

    let BoxContainer = document.createElement("div")
    BoxContainer.id = "BoxContainer"
    Box_Foreign.appendChild(BoxContainer)

    let foreign_element_active = false
    Box_Foreign.onpointerenter = function(){foreign_element_active = true}
    Box_Foreign.onpointerleave = function(){foreign_element_active = false}

    //Create the add-new-box button
    let AddButtonContainer, AddButtonSVG,AddButton
    function create_add_box_button(){
        AddButtonContainer = document.createElement("div")
        BoxContainer.appendChild(AddButtonContainer)
        AddButtonContainer.classList.add("CategoryBox")
        AddButtonContainer.classList.add("AddButtonBox")

        AddButtonSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        AddButtonSVG.setAttribute("width",90)
        AddButtonSVG.setAttribute("height", 90)
        AddButtonContainer.appendChild(AddButtonSVG)
        AddButton = document.getElementById("button_add_box").cloneNode(true)
        AddButton.classList.add("button_add_box")
        AddButton.classList.remove("dynamic_element")
        AddButton.removeAttribute("id")
        AddButtonSVG.appendChild(AddButton)

        AddButton.onpointerdown = create_new_box

    }

    //Defines functions for a single box element
    let Box = function(box_number, Cont){
        this.removed_by_user = false
        this.active = false
        let that = this
        let Names_of_cards_in_box = []

        let BoxDiv, CardHolderDiv, PlaceholderText,DeleteButtonSVG, DeleteButton
        //Creates all box elements
        function initalize_box(){
            //Create a div to hold this box.
            BoxDiv = document.createElement("div")
            BoxDiv.classList.add("CategoryBox")

            //In this div, add a subdiv to contain all cards (this ensures the position of the delete-box remains fixed
            CardHolderDiv = document.createElement("div")
            CardHolderDiv.style.maxWidth = CardParam.Card_Size.width_cards_in_category_box * CardParam.Card_Size.width + 20 + "px"
            BoxDiv.appendChild(CardHolderDiv)

            //Add the Box to the container
            BoxContainer.appendChild(BoxDiv)

            //Add a placeholder text
            PlaceholderText = document.createElement("p")
            PlaceholderText.classList.add("PlaceholderText")
            PlaceholderText.innerHTML = "You can drag cards here"
            CardHolderDiv.appendChild(PlaceholderText)

            //Add the delete element on the top-right (but only if groups are not fixed)
            if(CardParam.fix_number_of_groups === false){
                DeleteButtonSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg")
                DeleteButton = document.getElementById("button_remove_box").cloneNode(true)
                DeleteButton.classList.add("button_delete_box")
                DeleteButtonSVG.setAttribute("width", 60)
                DeleteButtonSVG.setAttribute("height", 60)

                DeleteButton.removeAttribute("id")
                DeleteButton.classList.add("delete_box_button")
                DeleteButton.classList.remove("dynamic_element")
                DeleteButtonSVG.appendChild(DeleteButton)
                BoxDiv.appendChild(DeleteButtonSVG)
            }
        }
        initalize_box()

        function activate_box(){
            that.active = true
            BoxDiv.classList.add("active_box")
        }
        function deactivate_box(){
            that.active = false
            BoxDiv.classList.remove("active_box")

        }

        //Call when a card is added or removed to display (or remove) the placeholder text
        function update_placeholder_text(){
            if(Names_of_cards_in_box.length > 0){
                PlaceholderText.style.display = "none"
            }else{
                PlaceholderText.style.display = "inherit"
            }
        }

        function update_box_border(){
            if(CardParam.fix_number_of_groups === false){
                //If this box only has a single element, then color it red.
                if(Names_of_cards_in_box.length === 1){
                    BoxDiv.style.border = "5px dashed red"
                }else{
                    BoxDiv.style.border = "inherit"
                }
            }else{
                //If this box only has a single element, then color it red.
                if(Names_of_cards_in_box.length === 0){
                    BoxDiv.style.border = "5px dashed red"
                }else{
                    BoxDiv.style.border = "inherit"
                }
            }
        }

        //Set event handlers for activation
        BoxDiv.onpointerenter = activate_box
        BoxDiv.onpointerleave = deactivate_box

        //Adds a card to the box (returns a reference to the CardHolderDiv
        this.request_to_add_card = function(cardname){
            Names_of_cards_in_box.push(cardname)

            update_placeholder_text()

            update_box_border()
            return(CardHolderDiv)
        }

        this.remove_card_from_box = function(cardname){
            Names_of_cards_in_box =  Names_of_cards_in_box.filter(function(e) { return e !== cardname })
            update_placeholder_text()
            //If there are no more cards in the box, delete it
            if(Names_of_cards_in_box.length === 0 && CardParam.fix_number_of_groups === false){
                delete_box()
            }else{
                update_box_border()
            }
        }

        //Deletes the box. Also moves all the Cards back to the reservoir
        function delete_box(){
            //Move all constituent cards back to the reservoir
            Cont.return_contents_of_deleted_box(Names_of_cards_in_box)

            //Delete the box
            BoxDiv.remove()
            that.removed_by_user = true
            Cont.refresh_Box_arr()


        }
        if(CardParam.fix_number_of_groups === false){
            DeleteButton.onpointerdown = delete_box
        }


        this.get_names_in_box = function(){
            return(JSON.parse(JSON.stringify(Names_of_cards_in_box)))
        }

        //SECOND STAGE FUNCTIONS
        let has_been_dragged_from_original_position = false

        this.fix_all_elements = function(){
            if(CardParam.fix_number_of_groups === false){
                DeleteButtonSVG.remove()
            }

        }

        this.delete_if_empty = function(){

            if(Names_of_cards_in_box.length === 0){
                BoxDiv.remove()
                that.removed_by_user = true
            }
        }

        let DraggableGroupElem, DraggableForeignElem, num_card_cols, num_card_rows
        this.transform_to_draggable_svg_element = function(){
            //Add a nice border
            BoxDiv.style.border = "10px solid darkgreen"

            //Remove box padding
            BoxDiv.style.padding = 0

            //Remove the placeholder text permanently
            PlaceholderText.remove()

            //Make all constituent cards transparant to the cursor
            let CardElems = CardHolderDiv.childNodes
            for(let i =0;i<CardElems.length;i++){
                CardElems[i].style.pointerEvents = "none"
            }

            //Get the box dimensions
            let num_cards_in_box = Names_of_cards_in_box.length
            num_card_cols = Math.min(CardParam.Card_Size.width_cards_in_category_box, num_cards_in_box)
            num_card_rows = Math.ceil(num_cards_in_box / CardParam.Card_Size.width_cards_in_category_box)

            let box_width_in_px = num_card_cols * CardParam.Card_Size.width + 80
            let box_height_in_px = num_card_rows * CardParam.Card_Size.height + 80

            if(CardParam.include_names_on_card){
                box_height_in_px = box_height_in_px + num_card_rows * 25
            }

            //Now wrap the Box into an SVG group (group -> foreign -> box) and append it to the new parent SVG
            //DraggableGroupElem = document.createElementNS("http://www.w3.org/2000/svg", "g")
            DraggableForeignElem = create_SVG_foreignElement(0,0,box_width_in_px, box_height_in_px, "draggable_box", undefined)

            BoxDiv.remove()
            DraggableForeignElem.appendChild(BoxDiv)

            //Little flourishings
            BoxDiv.style.cursor = "move"
            DraggableForeignElem.style.opacity = 0.85

            //Set event hander for the keypress
            DraggableForeignElem.onpointerdown = function(){
                Cont.box_has_been_pressed_on(that,DraggableForeignElem)
                has_been_dragged_from_original_position = true
            }

            //Return the element
            return(DraggableForeignElem)


        }

        this.check_if_moved_from_original_position = function(){
            return has_been_dragged_from_original_position
        }

        //Call to get all the relevant data for this box (contents and position)
        this.get_box_data = function(){
            let BBox = DraggableForeignElem.getBBox()

            let BoxPos = {
                x: parseFloat(DraggableForeignElem.style.transform.split(",")[0].replace(/[^\d.-]/g, '')),
                y: parseFloat(DraggableForeignElem.style.transform.split(",")[1].replace(/[^\d.-]/g, ''))
            }

            let Data = {
                contents: Names_of_cards_in_box,
                position: {
                    x: BoxPos.x,
                    y: BoxPos.y,
                    width: BBox.width,
                    height: BBox.height
                },
                num_rows: num_card_rows,
                num_cols: num_card_cols
            }

            //Calculating centerpoint (for easy analysis)
            Data.centerpoint = {
                x: BoxPos.x + 0.5* BBox.width,
                y: BoxPos.y + 0.5* BBox.height,
            }

            // Return
            return(JSON.parse(JSON.stringify(Data)))
        }



    }

    if(CardParam.fix_number_of_groups === false){
        create_add_box_button()
    }

    //Keeps track of all boxes
    let Boxes = []

    //Creates a new box
    function create_new_box(){
        let NewBox = new Box( Boxes.length + 1, that)

        Boxes.push(NewBox)

        //Remove and re-append the add-box button (to maintain its position
        if(CardParam.fix_number_of_groups === false){
            AddButtonContainer.remove()
            BoxContainer.appendChild(AddButtonContainer)
        }


    }

    //Call when a box is created by other means than pressing the plus button. Returns a reference to the created box
    this.create_new_box_auto = function(){
        create_new_box()
        return(Boxes[Boxes.length -1])
    }

    //Call when a box is deleted to update the array
    this.refresh_Box_arr = function(){
        let NewArr = []
        for(let i =0;i<Boxes.length;i++){
            if(Boxes[i].removed_by_user === false){
                NewArr.push(Boxes[i])
            }
        }
        Boxes = NewArr
    }

    //Called when a box is deleted to inform which cards need to be pushed back
    this.return_contents_of_deleted_box = function(Arr){
        GroupingCont.return_cards_when_box_deleted(Arr)
    }

    //Returns the active box
    // If there is an active box, returns a reference to the controller object.
    // If the cursors is on the foreign object, but there is no box, then returns "area".
    // If the cursor is outside of the foreignobject, returns false.
    this.get_active_box = function(){
        //Check if any one box is active
        for(let i =0;i<Boxes.length;i++){
            if(Boxes[i].active){
                return(Boxes[i])
            }
        }

        //If no boxes are active, check if the foreignobject is active
        if(foreign_element_active === true){
            return("area")
        }

        //Else returns false
        return(false)

    }

    //Call to fix the contents of all the boxes
    this.fix_all_boxes_in_place = function(){
        this.refresh_Box_arr()
        //Delete empty boxes
        for(let i = 0;i<Boxes.length;i++){
            Boxes[i].delete_if_empty()
        }
        this.refresh_Box_arr()

        //Remove the add-button box
        if(CardParam.fix_number_of_groups === false){
            AddButtonContainer.remove()
        }


        //Fix all the elements in all existing boxes
        for(let i =0;i<Boxes.length;i++){
            Boxes[i].fix_all_elements()
        }
    }

    //Call to get an array of arrays, containing the elements of all boxes
    this.get_all_box_contents = function(){
        let OutArr = []
        for(let i =0;i<Boxes.length;i++){
            OutArr.push(Boxes[i].get_names_in_box())
        }
        return(OutArr)
    }

    let DraggableBoxesElementsArray = [], ActiveDraggingElem, ActiveDragging_Mouse_Start_Coords, ActiveDragging_StartingCoords

    //SECOND STAGE
    let CardLayer, SVGParent
    this.transform_all_boxes_to_draggable_elements = function(SVGparent, Cardlayer){
        CardLayer = Cardlayer
        SVGParent = SVGparent
        //Transform all boxes to their draggable state and append to array
        for(let i =0;i<Boxes.length;i++){
            let DraggableBox = Boxes[i].transform_to_draggable_svg_element()
            CardLayer.appendChild(DraggableBox)
            DraggableBoxesElementsArray.push(DraggableBox)

            //Move the box to the center point
            let DraggableBoxDims = DraggableBox.getBBox()
            DraggableBox.style.transform = "translate("+ (CardParam.SecondStageStartPos.x - 0.5 * DraggableBoxDims.width) + "px, " +
                (CardParam.SecondStageStartPos.y - 0.5*DraggableBoxDims.height) + "px)"

        }

        //Setting some new event listerers
        CardLayer.onpointerup = function(){
            ActiveDraggingElem = undefined
        }
        CardLayer.onpointerleave = function(){
            ActiveDraggingElem = undefined
        }
        CardLayer.onpointermove = function(event){
            if(ActiveDraggingElem !== undefined){
                //Get mouse position
                let CurrentMousePos = get_cursor_pos_in_svg(SVGParent, event)

                //Calculating the difference between the current mouse position and the position of the mouse when the dragging started
                let delta_x = Math.round( CurrentMousePos.x - ActiveDragging_Mouse_Start_Coords.x )
                let delta_y = Math.round( CurrentMousePos.y - ActiveDragging_Mouse_Start_Coords.y)

                //Now we need to move the box by this difference
                ActiveDraggingElem.style.transform = "translate(" + (ActiveDragging_StartingCoords.x + delta_x) + "px," + (delta_y+ActiveDragging_StartingCoords.y) + "px)"

                //Check if all boxes have now been moved from their original position. If so, tell the top controller
                if(check_if_all_boxes_moved_from_original_position()){
                    GroupingCont.all_boxes_have_been_moved_from_original_location()
                }
            }
        }


    }

    this.box_has_been_pressed_on = function(Controller, DraggableBox){
        //Remove and re-append to make this box the top
        DraggableBox.remove()
        CardLayer.appendChild(DraggableBox)
        ActiveDraggingElem = DraggableBox

        //Get the current mouse position in the SVG
        ActiveDragging_Mouse_Start_Coords = get_cursor_pos_in_svg(SVGParent, event)
        ActiveDragging_StartingCoords = {x:0, y:0}

        if(ActiveDraggingElem.style.transform !== ""){
            ActiveDragging_StartingCoords = {
                x: parseFloat(ActiveDraggingElem.style.transform.split(",")[0].replace(/[^\d.-]/g, '')),
                y: parseFloat(ActiveDraggingElem.style.transform.split(",")[1].replace(/[^\d.-]/g, ''))
            }
        }


    }
    //During the second stage, call to check if all boxes have been moved from their initial position.
    function check_if_all_boxes_moved_from_original_position(){
        for(let i =0;i<Boxes.length;i++){
            if(Boxes[i].check_if_moved_from_original_position() === false){
                return(false)
            }
        }
        return true

    }

    //Call to get all the box data
    this.get_all_box_data = function(){
        let Out = []
        for(let i =0;i<Boxes.length;i++){
            Out.push(Boxes[i].get_box_data())
        }
        return(Out)
    }

    //Creating groups at the start
    if(CardParam.fix_number_of_groups === false){
        create_new_box()
        create_new_box()
    }else{
        for(let i=0; i<CardParam.fix_number_of_groups;i++){
            create_new_box()
        }
    }


}

