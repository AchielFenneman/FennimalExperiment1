HeadRegionSortingTask = function (Parent, FennimalObjectArray, TopController, returnfunc) {
    let that = this
    let number_of_mistakes_made = 0
    let correctly_placed_cards = 0
    let total_number_of_cards = FennimalObjectArray.length
    let incorrectly_placed_ids = []
    let task_finished = false


    //Defining the dimensions
    let Dims = {
        Cards: {
            width: 150,
            height: 150,
            default_background: "lightgray"
        },
        Reservoir: {
            x: 0.5 * GenParam.SVG_width,
            y: .12 * GenParam.SVG_height,
            width: 0.3 * GenParam.SVG_width,
            height: 0.2 * GenParam.SVG_height
        },
        TargetForeign: {
            x: 0.1 * GenParam.SVG_width,
            y: .35 * GenParam.SVG_height,
            width: 0.8 * GenParam.SVG_width,
            height: 0.4 * GenParam.SVG_height,
            spacing_between_boxes: 30

        }
    }

    let TargetDiv, TargetForeign

    function set_target_div() {
        TargetForeign = create_SVG_foreignElement(Dims.TargetForeign.x, Dims.TargetForeign.y, Dims.TargetForeign.width, Dims.TargetForeign.height, undefined, undefined)
        TargetDiv = document.createElement("div")
        TargetDiv.style.width = "100%"
        TargetDiv.style.height = "100%"
        TargetDiv.style.display = "flex"
        TargetForeign.style.transition = "all 500ms ease-in-out"
        Parent.appendChild(TargetForeign)
        TargetForeign.appendChild(TargetDiv)

    }

    ReservoirElem = function () {
        let ResElem = {}

        function initalize_elements() {
            //Reservoir
            ResElem.ReservoirForeign = create_SVG_foreignElement(Dims.Reservoir.x, Dims.Reservoir.y, Dims.Reservoir.width, Dims.Reservoir.height, undefined, undefined)
            ResElem.ReservoirDiv = document.createElement("div")
            ResElem.ReservoirDiv.style.width = "100%"
            ResElem.ReservoirDiv.style.height = "100%"
            ResElem.ReservoirDiv.style.display = "flex"
            ResElem.ReservoirDiv.style.wrap = "no-wrap"
            ResElem.ReservoirDiv.style.alignItems = "center"
            ResElem.ReservoirDiv.style.justifyContent = "center"


            Parent.appendChild(ResElem.ReservoirForeign)
            ResElem.ReservoirForeign.appendChild(ResElem.ReservoirDiv)

        }

        this.getElem = function () {
            return (ResElem.ReservoirDiv)
        }

        initalize_elements()

    }

    Card = function (FenObj, StartElem, Controller) {
        let CardElem = {}
        let is_fixed_in_place = false
        let current_state = "reservoir"
        let CurrentContainingBox
        let that = this

        function create_elems() {
            CardElem.Container = document.createElement("div")
            CardElem.Container.style.width = Dims.Cards.width + "px"
            CardElem.Container.style.height = Dims.Cards.height + "px"
            CardElem.Container.style.background = Dims.Cards.default_background
            CardElem.Container.style.margin = "2px"
            CardElem.Container.style.marginBottom = 0
            CardElem.Container.style.cursor = "pointer"
            CardElem.Container.style.border = "5px solid dimgray"
            CardElem.Container.style.borderRadius = "40px"

            CardElem.BlurContainer = document.createElement("div")
            CardElem.BlurContainer.style.width = "100%"
            CardElem.BlurContainer.style.height = "100%"
            CardElem.BlurContainer.style.transition = "all 250ms ease-in-out"

            //Creating the SVG to hold the icon
            CardElem.SVGObj = document.createElementNS("http://www.w3.org/2000/svg", "svg")
            CardElem.SVGObj.style.width = "100%"
            CardElem.SVGObj.style.height = "100%"
            CardElem.SVGObj.style.pointerEvents = "none"

            CardElem.Container.appendChild(CardElem.BlurContainer)
            CardElem.BlurContainer.appendChild(CardElem.SVGObj)
            StartElem.appendChild(CardElem.Container)

            //Creating the icon
            CardElem.Icon = create_Fennimal_SVG_object_head_only(FenObj, false)
            CardElem.SVGObj.appendChild(CardElem.Icon)

            //Resizing and translating the icon
            let scale_factor_w = 1 / (CardElem.Icon.getBBox().width / Dims.Cards.width)
            let scale_factor_h = 1 / (CardElem.Icon.getBBox().height / Dims.Cards.height)
            let min_scale_factor = Math.floor(Math.min(scale_factor_w, scale_factor_h) * 100) / 100

            //Applying to the Fennimal icon scale group
            let ScaleGroup = CardElem.Icon.getElementsByClassName("Fennimal_scale_group")[0]
            ScaleGroup.style.transform = "scale(" + min_scale_factor + ")"

            //Translation. This depends on whether there is a name. If no, center icon in the middle of the card. If yes, align it to the top instead
            let NewBox = CardElem.Icon.getBBox()
            let TargetCenter = {x: Math.round(0.5 * Dims.Cards.width), y: Math.round(0.5 * Dims.Cards.height)}
            let delta_x = TargetCenter.x - (NewBox.x + 0.5 * NewBox.width)
            let delta_y = TargetCenter.y - (NewBox.y + 0.5 * NewBox.height)
            CardElem.Icon.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

            //Setting grayscale
            CardElem.SVGObj.style.filter = "grayscale(100%)"


        }

        function append_to_new_Elem(Elem) {
            CurrentContainingBox = Elem

            CardElem.Container.remove()
            if (typeof CardElem.Wrapper !== "undefined") {
                CardElem.Wrapper.remove()
            }


            if (Elem.tagName === "g") {
                //Creating an SVG foreignobject, which functions as the wrapper when the card is placed on an SVG instead of the regular DOM
                CardElem.Wrapper = create_SVG_foreignElement(0, 0, 1.07 * Dims.Cards.width, 1.07 * Dims.Cards.height, undefined, undefined)
                CardElem.Wrapper.appendChild(CardElem.Container)
                CardElem.Wrapper.style.margin = "0"
                Elem.appendChild(CardElem.Wrapper)


            } else {
                CardElem.Wrapper = document.createElement("div")
                CardElem.Wrapper.style.width = Dims.Cards.width + "px"
                CardElem.Wrapper.style.height = Dims.Cards.height + "px"
                CardElem.Wrapper.style.margin = "10px"
                CardElem.Wrapper.appendChild(CardElem.Container)
                Elem.appendChild(CardElem.Wrapper)

            }

        }

        create_elems()

        this.toggle_blur = function (bool) {
            if (bool) {
                CardElem.BlurContainer.style.filter = "blur(15px)"
                CardElem.BlurContainer.classList.add("HeadRegionSortingTask_blurred_card")
            } else {
                CardElem.BlurContainer.style.filter = "none"
                CardElem.BlurContainer.classList.remove("HeadRegionSortingTask_blurred_card")
            }
        }

        //INTERACTION FUNCTIONS

        //Event handlers
        CardElem.Container.onpointerdown = function (event) {

            //Check if a different card is already being dragged. If so, ignore this
            if (!is_fixed_in_place) {
                AudioCont.play_sound_effect("card_placed")
                detach_from_station()
                Controller.call_attention_to_different_card_controller(that)
                let MouseCoords = Controller.get_cursors_coords(event)
                that.move_card_to_cursor(MouseCoords.x, MouseCoords.y)
            }
        }

        function detach_from_station() {
            current_state = "detached"
            append_to_new_Elem(Parent)
            CardElem.Wrapper.style.pointerEvents = "none"
        }

        //Call when the dragging is terminated without the card reaching a valid next position
        this.return_to_reservoir = function (ResElem) {
            append_to_new_Elem(ResElem)

        }

        this.move_card_to_cursor = function (mouse_x, mouse_y) {
            let target_x = mouse_x - 0.5 * Dims.Cards.width
            let target_y = mouse_y - 0.5 * Dims.Cards.height
            CardElem.Wrapper.style.transform = "translate(" + target_x + "px," + target_y + "px)"
        }

        this.get_FenObj = function () {
            return (FenObj)
        }

        this.move_card_to_new_container = function (NewCont) {
            append_to_new_Elem(NewCont)
        }

        this.fix_in_place = function () {
            is_fixed_in_place = true
            CardElem.SVGObj.style.filter = "none"
            CardElem.Container.style.background = GenParam.RegionData[FenObj.region].lighter_color
            CardElem.Container.style.border = "5px solid " + GenParam.RegionData[FenObj.region].color + "55"
        }

        append_to_new_Elem(StartElem)


    }

    RegionBox = function (RegionParent, region_name, region_num, number_of_regions) {
        //Creating the elements

        let Elems = {}

        function create_all_elements() {
            let title_height_percent = 15
            Elems.Container = document.createElement("div")
            Elems.Container.style.width = ((Dims.TargetForeign.width - (number_of_regions - 1) * Dims.TargetForeign.spacing_between_boxes) / number_of_regions) + "px"
            Elems.Container.style.height = "100%"

            //Setting correct spacing
            if (region_num < number_of_regions) {
                Elems.Container.style.marginRight = Dims.TargetForeign.spacing_between_boxes + "px"
            }

            //Setting colors and visual styling
            Elems.Container.style.background = GenParam.RegionData[region_name].lighter_color + "44"
            Elems.Container.style.borderRadius = "30px"

            //Adding the region name
            Elems.Name = document.createElement("div")
            Elems.Name.style.height = title_height_percent + "%"
            Elems.Name.style.background = GenParam.RegionData[region_name].darker_color
            Elems.Name.style.borderRadius = "20px"
            Elems.Name.style.color = "white"
            Elems.Name.style.display = "flex"
            Elems.Name.style.textAlign = "center"
            Elems.Name.style.alignItems = "center"

            Elems.NameText = document.createElement("p")
            Elems.NameText.style.width = "100%"
            Elems.NameText.innerHTML = GenParam.RegionData[region_name].display_name
            Elems.NameText.style.fontSize = "40px"

            //Adding the box which will contain the heads
            Elems.CardContainer = document.createElement("div")
            Elems.CardContainer.style.width = "100%"
            Elems.CardContainer.style.height = (100 - title_height_percent) + "%"
            Elems.CardContainer.style.display = "flex"
            Elems.CardContainer.style.flexWrap = "wrap"
            Elems.CardContainer.style.justifyContent = "center"
            Elems.CardContainer.style.alignItems = "center"

            RegionParent.appendChild(Elems.Container)
            Elems.Container.appendChild(Elems.Name)
            Elems.Name.append(Elems.NameText)
            Elems.Container.appendChild(Elems.CardContainer)

        }

        create_all_elements()


        // INTERACTION FUNCTIONS
        let box_active = false
        Elems.Container.onpointerenter = function () {
            box_active = true
        }
        Elems.Container.onpointerleave = function () {
            box_active = false
        }

        this.check_if_box_active = function () {
            return (box_active)
        }


        this.get_region = function () {
            return (region_name)
        }

        this.getContainerElem = function () {
            return (Elems.CardContainer)
        }


    }

    //Returns all the regions in the Fen array
    function get_all_regions_in_FenArr() {
        let reg = []
        for (let i = 0; i < FennimalObjectArray.length; i++) {
            reg.push(FennimalObjectArray[i].region)
        }
        return ([...new Set(reg)])
    }

    //On start
    let Reservoir = new ReservoirElem()
    set_target_div()

    let CardControllerArray = []
    let RegionControllerArray = []

    //Creating the finish button
    let FinishButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.75 * GenParam.SVG_height, 400, 75, "Continue", 40)
    Parent.appendChild(FinishButton)
    FinishButton.onpointerdown = function () {
        task_completed();
        AudioCont.play_sound_effect("button_click")
    }
    FinishButton.style.display = "none"

    //Instructions text
    let InstructionTextElem = create_SVG_text_in_foreign_element("In which region did you see this Fennimal?<br>" +
        "<tspan style='font-style:italic' > (Please drag this head to the correct box)</tspan>",
        0.2 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, 0.4 * GenParam.SVG_width, 0.2 * GenParam.SVG_height, undefined, undefined)
    Parent.appendChild(InstructionTextElem)
    InstructionTextElem.style.fontSize = "40px"
    InstructionTextElem.style.textAlign = "center"

    function task_completed() {
        returnfunc({error_ids: incorrectly_placed_ids})
    }

    //Interaction functions
    //Call when a card has been brought into focus (that is, when it is being dragged)
    let CurrentActiveCardController
    this.call_attention_to_different_card_controller = function (NewActiveController) {
        //If there is a currently active controller, then tell it to return to its last valid position
        if (CurrentActiveCardController !== undefined) {
            CurrentActiveCardController.return_to_reservoir()
        }

        //Now switch to the new controller (if there is one)
        if (NewActiveController === undefined) {
            CurrentActiveCardController = undefined
        } else {
            if (NewActiveController === false) {
                CurrentActiveCardController = undefined
            } else {
                CurrentActiveCardController = NewActiveController
            }
        }
    }

    let SVG_cursorpoint = GenParam.SVGObject.createSVGPoint()
    this.get_cursors_coords = function (event) {
        SVG_cursorpoint.x = event.clientX
        SVG_cursorpoint.y = event.clientY
        let newcoords = SVG_cursorpoint.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse())
        return (newcoords)
    }

    function check_card_release() {
        //Find out which box is currently active.
        let ActiveBox = false
        for (let i = 0; i < RegionControllerArray.length; i++) {
            if (RegionControllerArray[i].check_if_box_active()) {
                ActiveBox = RegionControllerArray[i]
            }
        }

        if (ActiveBox === false) {
            CurrentActiveCardController.return_to_reservoir(Reservoir.getElem())
        } else {
            //Here we check whether the card was correctly placed. If not, then return it to the reservoir
            if (CurrentActiveCardController.get_FenObj().region === ActiveBox.get_region()) {
                AudioCont.play_sound_effect("success")
                CurrentActiveCardController.move_card_to_new_container(ActiveBox.getContainerElem())
                CurrentActiveCardController.toggle_blur(true)
                CurrentActiveCardController.fix_in_place()
                card_correctly_placed()
            } else {
                AudioCont.play_sound_effect("rejected")
                CurrentActiveCardController.return_to_reservoir(Reservoir.getElem())
                number_of_mistakes_made++
                incorrectly_placed_ids.push([CurrentActiveCardController.get_FenObj().id,ActiveBox.get_region()])
            }

        }

        //that.update_continue_button()

    }

    function card_correctly_placed() {
        correctly_placed_cards++
        show_next_card()
        TopController.update_progress_within_day((correctly_placed_cards / total_number_of_cards) * 100)
    }

    function show_next_card() {
        if (FennimalObjectArray.length > 0) {
            let NewCard = new Card(FennimalObjectArray.shift(), Reservoir.getElem(), that)
            CardControllerArray.push(NewCard)
        } else {
            //All cards have correctly been placed

            InstructionTextElem.style.display = "none"
            InstructionTextElem.remove()
            TargetForeign.style.transform = "translate(0," + (-0.075 * GenParam.SVG_height) + "px)"
            //TargetForeign.setAttribute("y", 0.25 * GenParam.SVG_height)


            for (let i = 0; i < CardControllerArray.length; i++) {
                CardControllerArray[i].toggle_blur(false)
            }

            setTimeout(function () {
                FinishButton.style.display = "inherit"
            }, 1500)

        }
    }

    //Event handlers
    Parent.onpointermove = function (event) {
        if (CurrentActiveCardController !== undefined) {
            let MouseCoords = that.get_cursors_coords(event)
            CurrentActiveCardController.move_card_to_cursor(MouseCoords.x, MouseCoords.y)
            InstructionTextElem.style.display = "none"

        }
    }
    Parent.onpointerleave = function () {
        if (CurrentActiveCardController !== undefined) {
            CurrentActiveCardController.return_to_reservoir()
            if (!task_finished) {
                InstructionTextElem.style.display = "inherit"
            }

            that.update_continue_button()
        }
        CurrentActiveCardController = undefined
    }
    Parent.onpointerup = function () {
        if (CurrentActiveCardController !== undefined) {
            check_card_release()
            InstructionTextElem.style.display = "inherit"
        }
        CurrentActiveCardController = undefined
    }


    let Allregions = shuffleArray(get_all_regions_in_FenArr())
    for (let i = 0; i < Allregions.length; i++) {
        RegionControllerArray.push(new RegionBox(TargetDiv, Allregions[i], i + 1, Allregions.length))
    }

    show_next_card()

}

FennimalAttributeSortingTask = function(Parent, Title, FennimalObjectArray, attributes_asked, max_earnable_stars, TopController, returnfunc){
    //SUPPORTING SUBOBJECTS
    ReservoirElem = function () {
        let ResElem = {}

        function initalize_elements() {
            //Reservoir
            ResElem.ReservoirForeign = create_SVG_foreignElement(Dims.Reservoir.x, Dims.Reservoir.y, Dims.Reservoir.width, Dims.Reservoir.height, undefined, undefined)
            ResElem.ReservoirDiv = document.createElement("div")
            ResElem.ReservoirDiv.style.width = "100%"
            ResElem.ReservoirDiv.style.height = "100%"
            ResElem.ReservoirDiv.style.display = "flex"
            ResElem.ReservoirDiv.style.wrap = "no-wrap"
            ResElem.ReservoirDiv.style.alignItems = "center"
            ResElem.ReservoirDiv.style.justifyContent = "center"


            Parent.appendChild(ResElem.ReservoirForeign)
            ResElem.ReservoirForeign.appendChild(ResElem.ReservoirDiv)

        }

        this.getElem = function () {
            return (ResElem.ReservoirDiv)
        }

        initalize_elements()

    }

    AttributeCard = function (type,value, StartElem, Controller) {
        let CardElem = {}
        let is_fixed_in_place = false
        let current_state = "reservoir"
        let CurrentContainingBox
        let that = this

        function create_elems() {
            CardElem.Container = document.createElement("div")
            CardElem.Container.style.width = Dims.Cards.width + "px"
            CardElem.Container.style.height = Dims.Cards.height + "px"
            CardElem.Container.style.background = Dims.Cards.default_background
            CardElem.Container.style.margin = "2px"
            CardElem.Container.style.marginBottom = 0
            CardElem.Container.style.cursor = "pointer"
            CardElem.Container.style.border = "5px solid dimgray"
            CardElem.Container.style.borderRadius = "40px"
            CardElem.Container.style.opacity = 0
            CardElem.Container.style.transition = "opacity 200ms ease-in-out"

            switch(type){
                case("region"): set_card_region(); break
                case("head"): set_card_head(); break
                case("toybox"): set_card_toybox(); break
                case("toy"): set_card_toy(); break
            }

            setTimeout(function(){
                CardElem.Container.style.opacity = 1
            }, 200)

        }

        function set_card_region(){
            //Change the size of the card
            CardElem.Text = document.createElement("p")
            CardElem.Text.innerHTML = GenParam.RegionData[ value].display_name
            CardElem.Text.style.fontSize = "50px"
            CardElem.Container.style.display = "flex"
            CardElem.Container.style.alignItems = "center"

            CardElem.Text.style.textAlign = "center"
            CardElem.Text.style.lineHeight = 0.8
            CardElem.Text.style.color = "white"//GenParam.RegionData[value].darker_color

            CardElem.Container.appendChild(CardElem.Text)

            CardElem.Container.style.borderColor = GenParam.RegionData[value].darker_color
            CardElem.Container.style.background = GenParam.RegionData[value].darker_color

        }
        function set_card_head(){
            let FenObj = get_FenObj_with_head(value)


            //Creating the SVG to hold the icon
            CardElem.SVGObj = document.createElementNS("http://www.w3.org/2000/svg", "svg")
            CardElem.SVGObj.style.width = "100%"
            CardElem.SVGObj.style.height = "100%"
            CardElem.SVGObj.style.pointerEvents = "none"

            CardElem.Container.appendChild(CardElem.SVGObj)

            //StartElem.appendChild(CardElem.Container)

            //Creating the icon
            CardElem.Icon = create_Fennimal_SVG_object_head_only(FenObj, false)
            CardElem.SVGObj.appendChild(CardElem.Icon)
            //Setting grayscale
            CardElem.SVGObj.style.filter = "grayscale(100%)"

            setTimeout(function(){
                //Resizing and translating the icon
                let scale_factor_w = 1 / (CardElem.Icon.getBBox().width / Dims.Cards.width)
                let scale_factor_h = 1 / (CardElem.Icon.getBBox().height / Dims.Cards.height)
                let min_scale_factor = Math.floor(Math.min(scale_factor_w, scale_factor_h) * 100) / 100

                //Applying to the Fennimal icon scale group
                let ScaleGroup = CardElem.Icon.getElementsByClassName("Fennimal_scale_group")[0]
                ScaleGroup.style.transform = "scale(" + min_scale_factor + ")"

                //Translation. This depends on whether there is a name. If no, center icon in the middle of the card. If yes, align it to the top instead
                let NewBox = CardElem.Icon.getBBox()
                let TargetCenter = {x: Math.round(0.5 * Dims.Cards.width), y: Math.round(0.5 * Dims.Cards.height)}
                let delta_x = TargetCenter.x - (NewBox.x + 0.5 * NewBox.width)
                let delta_y = TargetCenter.y - (NewBox.y + 0.5 * NewBox.height)
                CardElem.Icon.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"


            },50)
        }
        function set_card_toybox(){
            append_SVG_and_element_on_card(document.getElementById("toybox_" + value).cloneNode(true), 1.2)
        }
        function set_card_toy(){
            append_SVG_and_element_on_card(document.getElementById("toy_" + value).cloneNode(true),0.9)
            set_toy_color_scheme(CardElem.SVGObj, value)
        }

        function append_to_new_Elem(Elem) {
            CurrentContainingBox = Elem

            CardElem.Container.remove()
            if (typeof CardElem.Wrapper !== "undefined") {
                CardElem.Wrapper.remove()
            }


            if (Elem.tagName === "g") {
                //Creating an SVG foreignobject, which functions as the wrapper when the card is placed on an SVG instead of the regular DOM
                CardElem.Wrapper = create_SVG_foreignElement(0, 0, 1.07 * Dims.Cards.width, 1.07 * Dims.Cards.height, undefined, undefined)
                CardElem.Wrapper.appendChild(CardElem.Container)
                CardElem.Wrapper.style.margin = "0"
                Elem.appendChild(CardElem.Wrapper)


            } else {
                CardElem.Wrapper = document.createElement("div")
                CardElem.Wrapper.style.width = Dims.Cards.width + "px"
                CardElem.Wrapper.style.height = Dims.Cards.height + "px"
                CardElem.Wrapper.style.margin = "10px"
                CardElem.Wrapper.appendChild(CardElem.Container)
                Elem.appendChild(CardElem.Wrapper)

            }

        }

        function append_SVG_and_element_on_card(Elem, scale_factor_modifier){
            //Creating the SVG to hold the icon
            CardElem.SVGObj = document.createElementNS("http://www.w3.org/2000/svg", "svg")
            CardElem.SVGObj.style.width = "100%"
            CardElem.SVGObj.style.height = "100%"
            CardElem.SVGObj.style.pointerEvents = "none"
            CardElem.SVGObj.setAttribute('viewBox', '0 0 100 100')
            CardElem.Container.appendChild(CardElem.SVGObj)

            Elem.style.display = "inherit"
            let ZeroTGroup =  create_SVG_group(0,0,undefined,undefined)
            let ScaleGroup = create_SVG_group(0,0,undefined,undefined)
            let MainTGroup =  create_SVG_group(0,0,undefined,undefined)
            ZeroTGroup.appendChild(Elem)
            ScaleGroup.appendChild(ZeroTGroup)
            MainTGroup.appendChild(ScaleGroup)
            CardElem.SVGObj.appendChild(MainTGroup)

            setTimeout(function(){
                const Box = Elem.getBBox()
                ZeroTGroup.style.transform = "translate(" + ( -( 0.5* Box.width + Box.x) ) + "px, " +  ( -( 0.5* Box.height + Box.y) ) + "px)"

                const scale_factor_w = 1 / (Box.width / 100)
                const scale_factor_h = 1 / (Box.height / 100)
                const min_scale_factor = Math.floor(Math.min(scale_factor_w, scale_factor_h) * 100) / 100
                ScaleGroup.style.transform = "scale(" + (scale_factor_modifier*min_scale_factor) + ")"

                MainTGroup.style.transform = "translate(50px,50px)"

            },10)
        }

        create_elems()

        //INTERACTION FUNCTIONS

        //Event handlers
        CardElem.Container.onpointerdown = function (event) {

            //Check if a different card is already being dragged. If so, ignore this
            if (!is_fixed_in_place) {
                AudioCont.play_sound_effect("card_placed")
                detach_from_station()
                Controller.call_attention_to_different_card_controller(that)
                let MouseCoords = Controller.get_cursors_coords(event)
                that.move_card_to_cursor(MouseCoords.x, MouseCoords.y)
            }
        }

        function detach_from_station() {
            current_state = "detached"
            append_to_new_Elem(Parent)
            CardElem.Wrapper.style.pointerEvents = "none"
        }

        //Call when the dragging is terminated without the card reaching a valid next position
        this.return_to_reservoir = function (ResElem) {
            append_to_new_Elem(ResElem)

        }

        this.move_card_to_cursor = function (mouse_x, mouse_y) {
            let target_x = mouse_x - 0.5 * Dims.Cards.width
            let target_y = mouse_y - 0.5 * Dims.Cards.height
            CardElem.Wrapper.style.transform = "translate(" + target_x + "px," + target_y + "px)"
        }

        this.move_card_to_new_container = function (NewCont) {
            append_to_new_Elem(NewCont)
        }

        this.fix_in_place = function () {
            is_fixed_in_place = true
            CardElem.SVGObj.style.filter = "none"
            CardElem.Container.style.background = GenParam.RegionData[FenObj.region].lighter_color
            CardElem.Container.style.border = "5px solid " + GenParam.RegionData[FenObj.region].color + "55"
        }

        this.get_value = function(){
            return value
        }
        this.get_type = function(){
            return type
        }
        this.delete = function(){
            CardElem.Container.remove()
        }

        append_to_new_Elem(StartElem)


    }

    FennimalBox = function (Parent, FenObj, num_in_row) {
        let attributes_currently_displayed = []
        //Creating the elements
        let Elems = {}

        function create_all_elements() {
            let title_height_percent = 15
            Elems.Container = document.createElement("div")
            Elems.Container.style.width = ((Dims.TargetForeign.width - (total_num_Fennimals - 1) * Dims.TargetForeign.spacing_between_boxes) / total_num_Fennimals) + "px"
            Elems.Container.style.height = "100%"

            //Setting correct spacing
            if (num_in_row < total_num_Fennimals) {
                Elems.Container.style.marginRight = Dims.TargetForeign.spacing_between_boxes + "px"
            }

            Elems.Container.style.borderRadius = "30px"

            //Elements to contain the Fennimals name
            Elems.Name = document.createElement("div")
            Elems.Name.style.height = title_height_percent + "%"

            Elems.Name.style.borderRadius = "20px"
            Elems.Name.style.color = "white"
            Elems.Name.style.display = "flex"
            Elems.Name.style.textAlign = "center"
            Elems.Name.style.alignItems = "center"

            Elems.NameText = document.createElement("p")
            Elems.NameText.style.width = "100%"
            Elems.NameText.style.fontSize = "40px"
            Elems.NameText.innerHTML = FenObj.name

            //Setting colors and visual styling
            Elems.Container.style.background = GenParam.RegionData["Home"].lighter_color + "44"
            Elems.Name.style.background = GenParam.RegionData["Home"].darker_color

            //Adding the box which will contain the SVG
            Elems.CardContainer = document.createElement("div")
            Elems.CardContainer.style.width = "100%"
            Elems.CardContainer.style.height = (100 - title_height_percent) + "%"
            Elems.CardContainer.style.display = "flex"
            Elems.CardContainer.style.flexWrap = "wrap"
            Elems.CardContainer.style.justifyContent = "center"
            Elems.CardContainer.style.alignItems = "center"

            Parent.appendChild(Elems.Container)
            Elems.Container.appendChild(Elems.Name)
            Elems.Name.append(Elems.NameText)
            Elems.Container.appendChild(Elems.CardContainer)

            //Now we add an SVG
            Elems.SVG = document.createElementNS("http://www.w3.org/2000/svg", 'svg')
            Elems.SVG.setAttribute('viewBox', '0 0 500 500')
            Elems.SVG.setAttribute("width", "100%")
            Elems.SVG.setAttribute("height", "100%")
            Elems.SVG.setAttribute("preserveAspectRatio", "xMidYMid slice")
            Elems.CardContainer.appendChild(Elems.SVG)

            //Adding the layers
            Elems.BottomLayer = create_SVG_group(0,0,undefined,undefined)
            Elems.MiddleLayer = create_SVG_group(0,0,undefined,undefined)
            Elems.TopLayer = create_SVG_group(0,0,undefined,undefined)
            Elems.SVG.appendChild(Elems.BottomLayer)
            Elems.SVG.appendChild(Elems.MiddleLayer)
            Elems.SVG.appendChild(Elems.TopLayer)
            Elems.SVG.style.borderRadius = "20px"

            Elems.Container.style.maxWidth = (1.1 * Elems.Container.offsetHeight) + "px"


        }

        // On creation
        create_all_elements()
        if(! attributes_asked.includes("region")){
            show_region()
        }

        if(attributes_asked.includes("name")){
            Elems.Container.style.opacity = 0
            setTimeout(function(){Elems.Container.style.transition = "opacity 500ms ease-in-out"},1000)
        }

        // INTERACTION FUNCTIONS
        let box_active = false
        Elems.Container.onpointerenter = function () {
            box_active = true
        }
        Elems.Container.onpointerleave = function () {
            box_active = false
        }

        this.check_if_box_active = function () {
            return (box_active)
        }

        this.show_box = function(){
            Elems.Container.style.opacity = 1
        }

        this.get_region = function () {
            return (name)
        }

        this.getContainerElem = function () {
            return (Elems.CardContainer)
        }


        this.get_value_of_type = function(type){
            return(FenObj[type])
        }

        this.display_value_of_type = function(type){
            attributes_currently_displayed.push(type)
            switch(type){
                case("region"): show_region(); break;
                case("head"): show_Fennimal(); break
                case("toybox"): show_toybox(); break
                case("toy"): show_toy(); break
            }
        }

        function show_region(){
            Elems.Container.style.background = GenParam.RegionData[FenObj.region].lighter_color + "44"
            Elems.Name.style.background = GenParam.RegionData[FenObj.region].darker_color
            Elems.BackgroundImage = document.getElementById("location_" + FenObj.location).childNodes[0].cloneNode(true)
            Elems.BackgroundImage.setAttribute("preserveAspectRatio", "xMidYMid slice")
            Elems.BackgroundImage.style.opacity = 0
            Elems.BackgroundImage.style.transition = "opacity 500ms ease-in-out"
            setTimeout(function(){Elems.BackgroundImage.style.opacity = 0.8},100)

            Elems.BottomLayer.appendChild(Elems.BackgroundImage)

        }
        function show_Fennimal(){
            if(typeof Elems.BackgroundImage !== "undefined"){
                Elems.BackgroundImage.style.opacity = 0.4
            }

            //TextElem_Main_Instructions = create_SVG_text_elem(0.5 * GenParam.SVG_width, 475,"", "instructions_element_title",undefined)
            let FenSVG = create_Fennimal_SVG_object(FenObj, GenParam.Fennimal_head_size, false)
            FenSVG.style.opacity = 0
            Elems.MiddleLayer.appendChild(FenSVG)

            //Scaling
            const max_height = 2 * 230
            const max_width = 2 * 230
            const FennimalScaleGroup = FenSVG.getElementsByClassName("Fennimal_scale_group")[0]
            const ScaleBox = FenSVG.getBBox()
            const scale_factor_w = 1 / (ScaleBox.width / max_width)
            const scale_factor_h = 1 / (ScaleBox.height /max_height)

            const min_scale_factor = Math.floor(Math.min(scale_factor_w, scale_factor_h) * 100) / 100
            FennimalScaleGroup.style.transform = "scale(" + min_scale_factor +  ")"

            //Translate
            const Box = FenSVG.getBBox()
            let delta_x
            if(attributes_asked.includes("toybox") || attributes_asked.includes("toy")){
                delta_x = (150) - (Box.x + 0.5 * Box.width)
            }else{
                delta_x = (250) - (Box.x + 0.5 * Box.width)
            }
            const delta_y = (250) - (Box.y + 0.5 * Box.height)
            FenSVG.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

            //Set opacity animation
            FenSVG.style.transition = "opacity 500ms ease-in-out"
            setTimeout(function(){FenSVG.style.opacity = 1},100)

        }
        function show_toybox(){
            let ToyBox = document.getElementById("toybox_" + FenObj.toybox).cloneNode(true)
            ToyBox.style.opacity = 0
            ToyBox.style.transition = "opacity 500ms ease-in-out"

            ToyBox.style.display = "inherit"
            let ZeroTGroup =  create_SVG_group(0,0,undefined,undefined)
            let ScaleGroup = create_SVG_group(0,0,undefined,undefined)
            let MainTGroup =  create_SVG_group(0,0,undefined,undefined)
            ZeroTGroup.appendChild(ToyBox)
            ScaleGroup.appendChild(ZeroTGroup)
            MainTGroup.appendChild(ScaleGroup)
            Elems.TopLayer.appendChild(MainTGroup)

            setTimeout(function(){
                const Box = ToyBox.getBBox()
                ZeroTGroup.style.transform = "translate(" + ( -( 0.5* Box.width + Box.x) ) + "px, " +  ( -( 0.5* Box.height + Box.y) ) + "px)"

                ScaleGroup.style.transform = "scale(2)"

                MainTGroup.style.transform = "translate(350px,350px)"
                ToyBox.style.opacity = 1

            },10)
        }
        function show_toy(){
            let Toy = document.getElementById("toy_" + FenObj.toy).cloneNode(true)
            Toy.style.display = "inherit"
            Toy.style.opacity = 0
            Toy.style.transition = "opacity 500ms ease-in-out"
            set_toy_color_scheme(Toy, FenObj.toy)
            let ZeroTGroup =  create_SVG_group(0,0,undefined,undefined)
            let ScaleGroup = create_SVG_group(0,0,undefined,undefined)
            let MainTGroup =  create_SVG_group(0,0,undefined,undefined)
            ZeroTGroup.appendChild(Toy)
            ScaleGroup.appendChild(ZeroTGroup)
            MainTGroup.appendChild(ScaleGroup)
            Elems.TopLayer.appendChild(MainTGroup)

            setTimeout(function(){
                const Box = Toy.getBBox()
                ZeroTGroup.style.transform = "translate(" + ( -( 0.5* Box.width + Box.x) ) + "px, " +  ( -( 0.5* Box.height + Box.y) ) + "px)"

                ScaleGroup.style.transform = "scale(2.5)"

                MainTGroup.style.transform = "translate(350px,150px)"
                Toy.style.opacity = 1

            },10)
        }


    }

    let that = this

    let number_of_completed_attributes = 0
    let number_of_total_attributes = attributes_asked.length
    let remaining_attributes = JSON.parse(JSON.stringify(attributes_asked))
    let current_attribute_set, values_in_set, values_completed

    let number_of_mistakes_made = 0
    let Mistakes_Made = []
    let task_finished = false

    const total_num_Fennimals = FennimalObjectArray.length
    const AllFennimals = shuffleArray(FennimalObjectArray)

    let ElementsCurrentlyInReservoir = []
    let FennimalBoxControllerArray = []

    //Defining the dimensions
    let Dims = {
        Cards: {
            width: 150,
            height: 150,
            default_background: "lightgray"
        },
        Reservoir: {
            x: 0.1 * GenParam.SVG_width,
            y: .12 * GenParam.SVG_height,
            width: 0.8 * GenParam.SVG_width,
            height: 0.2 * GenParam.SVG_height
        },
        TargetForeign: {
            x: 0.1 * GenParam.SVG_width,
            y: .35 * GenParam.SVG_height,
            width: 0.8 * GenParam.SVG_width,
            height: 0.4 * GenParam.SVG_height,
            spacing_between_boxes: 30

        }
    }

    let TargetDiv, TargetForeign, FinishButton, InstructionTextElem, Reservoir, BonusStarIcon, BonusStarAmount
    function create_elements_on_screen(){
        TargetForeign = create_SVG_foreignElement(Dims.TargetForeign.x, Dims.TargetForeign.y, Dims.TargetForeign.width, Dims.TargetForeign.height, undefined, undefined)
        TargetDiv = document.createElement("div")
        TargetDiv.style.width = "100%"
        TargetDiv.style.height = "100%"
        TargetDiv.style.display = "flex"
        TargetDiv.style.justifyContent = "center"
        TargetDiv.style.alignItems = "center"
        TargetForeign.style.transition = "all 500ms ease-in-out"
        Parent.appendChild(TargetForeign)
        TargetForeign.appendChild(TargetDiv)

        //Creating the finish button
        FinishButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.825 * GenParam.SVG_height, 400, 75, "Continue", 40)
        Parent.appendChild(FinishButton)
        FinishButton.onpointerdown = function () {
            task_completed();
            AudioCont.play_sound_effect("button_click")
        }
        FinishButton.style.display = "none"

        /*InstructionTextElem = create_SVG_text_in_foreign_element("placeholder",
            0.2 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, 0.4 * GenParam.SVG_width, 0.2 * GenParam.SVG_height, undefined, undefined)
        Parent.appendChild(InstructionTextElem)
        InstructionTextElem.style.fontSize = "40px"
        InstructionTextElem.style.textAlign = "center"

         */
        Reservoir = new ReservoirElem()

    }

    //On start
    create_elements_on_screen()

    function task_completed() {
        if(typeof TargetDiv !== "undefined") {TargetDiv.remove()}
        if(typeof TargetForeign !== "undefined") {TargetForeign.remove()}
        if(typeof BonusStarAmount !== "undefined") {BonusStarAmount.remove()}
        if(typeof BonusStarIcon !== "undefined") {BonusStarIcon.remove()}

         returnfunc(Mistakes_Made)
    }

    //Interaction functions
    //Call when a card has been brought into focus (that is, when it is being dragged)
    let CurrentActiveCardController
    this.call_attention_to_different_card_controller = function (NewActiveController) {
        //If there is a currently active controller, then tell it to return to its last valid position
        if (CurrentActiveCardController !== undefined) {
            CurrentActiveCardController.return_to_reservoir()
        }

        //Now switch to the new controller (if there is one)
        if (NewActiveController === undefined) {
            CurrentActiveCardController = undefined
        } else {
            if (NewActiveController === false) {
                CurrentActiveCardController = undefined
            } else {
                CurrentActiveCardController = NewActiveController
            }
        }
    }

    let SVG_cursorpoint = GenParam.SVGObject.createSVGPoint()
    this.get_cursors_coords = function (event) {
        SVG_cursorpoint.x = event.clientX
        SVG_cursorpoint.y = event.clientY
        let newcoords = SVG_cursorpoint.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse())
        return (newcoords)
    }

    function display_bonus_star_amount(optional_flash_color, optional_show_mini_star_burst){
        const anim_time = 500, base_text_color = "black", base_outline_color = "#540", base_fill_color = "#fc0"
        //If there are no icon and text yet, create them
        if(BonusStarIcon === undefined){
            BonusStarIcon = show_bonus_star_on_screen(Parent, 0.9 * GenParam.SVG_width, 0.12* GenParam.SVG_height, optional_show_mini_star_burst, undefined, 1)
            BonusStarIcon.childNodes[1].style.transition = "all " + anim_time + "ms ease-in-out"
        }

        if(BonusStarAmount === undefined){
            BonusStarAmount = create_SVG_text_elem(0.93 * GenParam.SVG_width, 0.17* GenParam.SVG_height,"x" + remaining_earnable_stars)
            BonusStarAmount.style.fontSize = "80px"
            BonusStarAmount.style.fontWeight = "700"
            BonusStarAmount.style.transition = "all " + anim_time + "ms ease-in-out"
            BonusStarAmount.style.fill = base_text_color

            setTimeout(function(){
                Parent.appendChild(BonusStarAmount)
            },300)
        }else{
            BonusStarAmount.innerHTML = "x" + remaining_earnable_stars
        }

        //Check if we need to flash with some color
        if(optional_flash_color !== undefined && optional_flash_color !== false){
            BonusStarAmount.style.fill = optional_flash_color
            //BonusStarIcon.childNodes[1].stroke = optional_flash_color
            BonusStarIcon.childNodes[1].setAttribute("stroke", optional_flash_color)
            BonusStarIcon.childNodes[1].setAttribute("fill", optional_flash_color)

            setTimeout(function(){
                BonusStarAmount.style.fill = base_text_color
                BonusStarIcon.childNodes[1].setAttribute("stroke", base_outline_color)
                BonusStarIcon.childNodes[1].setAttribute("fill", base_fill_color)
            }, anim_time)
        }

    }

    function get_FenObj_with_head(head){
        for(let i = 0; i < FennimalObjectArray.length; i++){
            if(FennimalObjectArray[i].head === head){
                return(FennimalObjectArray[i])
            }
        }
    }

    function check_card_release() {
        //Find out which box is currently active.
        let ActiveBox = false
        for (let i = 0; i < FennimalBoxControllerArray.length; i++) {
            if (FennimalBoxControllerArray[i].check_if_box_active()) {
                ActiveBox = FennimalBoxControllerArray[i]
            }
        }

        if (ActiveBox === false) {
            CurrentActiveCardController.return_to_reservoir(Reservoir.getElem())
        } else {
            //Here we check whether the card was correctly placed. If not, then return it to the reservoir
            if (CurrentActiveCardController.get_value() === ActiveBox.get_value_of_type(CurrentActiveCardController.get_type())) {
                ActiveBox.display_value_of_type(CurrentActiveCardController.get_type())
                number_of_completed_attributes++
                AudioCont.play_sound_effect("success")
                CurrentActiveCardController.delete()

                //Removing this value from the attribute set
                values_in_set.splice(values_in_set.indexOf(CurrentActiveCardController.get_value()), 1)

                //Checking if there are more attributes that need to be placed from this set
                if(values_in_set.length === 0){
                    setTimeout(function () {
                        populate_reservoir_with_new_elements()
                    },200)
                }

            } else {
                AudioCont.play_sound_effect("rejected")
                CurrentActiveCardController.return_to_reservoir(Reservoir.getElem())
                mistake_made(ActiveBox.get_value_of_type("id"), CurrentActiveCardController.get_value() , ActiveBox.get_value_of_type(CurrentActiveCardController.get_type()))


            }

        }

        //that.update_continue_button()

    }

    function mistake_made(id_of_target_fennimal, given_answer, correct_answer){
        number_of_mistakes_made++
        Mistakes_Made.push({id: id_of_target_fennimal, correct: correct_answer, selected: correct_answer})
        if(can_earn_bonus_stars){
            if(remaining_earnable_stars > 0){
                remaining_earnable_stars --
                display_bonus_star_amount("red", false)
            }
        }

    }

    function get_all_values_of_attribute(type){
        let Arr = []
        for(let i =0;i<FennimalObjectArray.length;i++){
            if(typeof FennimalObjectArray[i][type] !== "undefined" ){
                Arr.push(JSON.parse(JSON.stringify(FennimalObjectArray[i][type])))
            }
        }
        return Arr
    }

    let NameInputDiv, EscapeForeign, EscapeText, EscapeButton
    function show_name_entry_field(){
        //Making sure all names are lower case in the values set
        for(let i = 0;i< values_in_set.length;i++){
            values_in_set[i] = values_in_set[i].toLowerCase()
        }

        //Creating a div to hold the input area and supporting elements
        NameInputDiv = document.createElement("div")
        Reservoir.getElem().appendChild(NameInputDiv)

        //Creating some detailed instructions
        let DetailedInstructionsDiv = document.createElement("div")
        DetailedInstructionsDiv.style.textAlign = "center"
        DetailedInstructionsDiv.style.fontSize = "30px"
        DetailedInstructionsDiv.innerHTML = "Write down the names of the Fennimals one at a time, then press enter or hit the button to check your answer."
        NameInputDiv.appendChild(DetailedInstructionsDiv)

        //Creating a div for the input element and button
        let InputDiv = document.createElement("div")
        NameInputDiv.appendChild(InputDiv)
        InputDiv.style.display = "flex"
        InputDiv.style.marginTop = "2%"

        //Creating a text input field
        let InputField = document.createElement("input")
        InputField.maxLength = 30
        InputField.placeholder = "Enter name here"
        InputField.style.width = "50%"
        InputField.style.pointerEvents = "auto"
        InputField.style.fontSize = "50px"
        InputField.style.resize = "none"
        InputField.style.marginTop = "1%"
        InputDiv.appendChild(InputField)

        //Creating the button to submit
        let InputButton = create_DOM_buttonElement("Check", "50")
        InputButton.style.marginLeft = "1%"
        InputDiv.appendChild(InputButton)

        InputButton.onclick = function () {
            check_name_input(InputField.value)
            InputField.value = ""
            //AudioCont.play_sound_effect("button_click")
        }

        InputField.classList.add("recall_input_line")
        InputField.addEventListener("keyup", function (event) {
            if (event.key === "Enter") {
                if (InputField.value !== "") {
                    //AudioCont.play_sound_effect("button_click")
                    check_name_input(InputField.value)
                    InputField.value = ""
                }


            }
        })

        //Finally, we want to give participant an escape to prevent them from becoming stuck if they dont remember a name
        EscapeForeign = create_SVG_foreignElement(0.1 * GenParam.SVG_width, 0.77 * GenParam.SVG_height, 0.8 * GenParam.SVG_width, 0.1 * GenParam.SVG_height)
        EscapeForeign.style.display = "flex"
        let EscapeDiv = document.createElement("div")
        EscapeDiv.style.display = "flex"
        EscapeDiv.style.justifyContent = "center"
        EscapeForeign.appendChild(EscapeDiv)
        Parent.appendChild(EscapeForeign)

        EscapeButton =create_DOM_buttonElement("Buy name", "40")
        EscapeButton.style.width = "300px"
        EscapeDiv.appendChild(EscapeButton)

        EscapeText = document.createElement("div")
        EscapeText.style.fontSize = "35px"
        EscapeText.style.lineHeight = 0.9
        EscapeText.style.marginLeft = "20px"
        EscapeText.style.textAlign = "center"
        EscapeText.style.display = "flex"
        EscapeText.style.alignItems = "center"
        EscapeText.innerHTML = "Stuck? Click this button to buy a name. <br><i> This will cost you a star! </i>"

        EscapeDiv.appendChild(EscapeText)
        EscapeButton.onpointerdown = escape_button_pressed

        EscapeForeign.style.display = "none"



        console.log(EscapeForeign)

    }

    function match_name(input){
        for(let i =0;i<values_in_set.length;i++){
            let distance = LevenshteinDistance(input.toLowerCase(), values_in_set[i].toLowerCase())
            if(distance <=2 ){
                return(values_in_set[i])
            }
        }

        //Return true if the names has already been listed
        for(let i =0;i<values_completed.length;i++){
            let distance = LevenshteinDistance(input.toLowerCase(), values_completed[i].toLowerCase())
            if(distance <=2 ){
                return(true)
            }
        }

        //Return false if the name does not match anything
        return false
    }

    function check_name_input(name){
        //Check if there is a correct name
        let matched_name = match_name(name)
        hide_escape_option()

        clearTimeout(EscapeTimeout)
        EscapeTimeout = setTimeout(function () {
            show_escape_option()
        }, input_escape_minimum_time)

        if(matched_name === false || matched_name === true){
            if(matched_name === false){
                AudioCont.play_sound_effect("rejected")
                mistake_made("NA", name, "NA")
            }
        }else{
            AudioCont.play_sound_effect("success")
            matched_name = matched_name.toLowerCase()
            values_completed.push(matched_name)


            values_in_set.splice(values_in_set.indexOf(matched_name), 1)


            for(let fennum = 0; fennum < FennimalBoxControllerArray.length; fennum++){
                let boxname = FennimalBoxControllerArray[fennum].get_value_of_type("name").toLowerCase()
                if(boxname === matched_name){
                    FennimalBoxControllerArray[fennum].show_box()
                }
            }

            //Check if there are more names left - if not, go to the next attribute
            if(values_in_set.length === 0){
                NameInputDiv.remove()
                EscapeForeign.remove()
                clearTimeout(EscapeTimeout)

                populate_reservoir_with_new_elements()
            }
        }


        //Check if there are more names left - if not, delete the name input div
    }

    function populate_reservoir_with_new_elements() {
        TopController.update_progress_within_day((number_of_completed_attributes / number_of_total_attributes) * 100)
        if (remaining_attributes.length > 0) {
            //Theres a new set of attributes to add to the reservoir
            current_attribute_set = remaining_attributes.shift()
            switch(current_attribute_set) {
                case("region"): Title.innerHTML = "Match all each region with the correct Fennimals"; break
                case("head"): Title.innerHTML = "Match each head to the correct Fennimal"; break
                case("toybox"): Title.innerHTML = "Which box contains each Fennimal's toy?"; break
                case("toy"): Title.innerHTML = "Match each Fennimal with its correct toy"; break
                case("name"): Title.innerHTML = "Write down all the names of the Fennimals"; break
            }

            //Get the values of this attribute
            values_in_set = shuffleArray(get_all_values_of_attribute(current_attribute_set))

            if(current_attribute_set === "name"){
                values_completed = []
                show_name_entry_field()
            }else{
                if(values_in_set.length >0){
                    ElementsCurrentlyInReservoir = []
                    for(let i = 0; i < values_in_set.length ; i++){
                        setTimeout(function () {
                            ElementsCurrentlyInReservoir.push( new AttributeCard(current_attribute_set, values_in_set[i], Reservoir.getElem(), that) )
                        }, i * 100)
                    }
                }else{
                    console.warn("NO PLACEABLE ELEMENTS OF TYPE " + current_attribute_set + ". SKIPPING.")
                    populate_reservoir_with_new_elements()
                }
            }



        } else {
            //Attributes have been assigned
            //InstructionTextElem.style.display = "none"
            //InstructionTextElem.remove()
            Title.innerHTML = "Well done!"
            Title.style.fill = "darkgreen"
            TargetForeign.style.transform = "translate(0," + (-0.075 * GenParam.SVG_height) + "px)"
            //TargetForeign.setAttribute("y", 0.25 * GenParam.SVG_height)

            setTimeout(function () {
                FinishButton.style.display = "inherit"
            },500)


        }
    }

    //The name input needs an escape, to prevent participants from getting stuck on the task
    let input_escape_minimum_time = 1000, EscapeTimeout
    function show_escape_option(){
        //If there are starts to be earned AND there are more than one stars left, then present this is a buy option.
        //Otherwise, its a reveal option (no cost in stars
        if(can_earn_bonus_stars && remaining_earnable_stars > 0){
            EscapeButton.childNodes[0].childNodes[0].innerHTML = "Buy name"
            EscapeText.innerHTML = "Stuck? Click this button to buy a name. <br><i> This will cost you a star! </i>"
        }else{
            EscapeButton.childNodes[0].childNodes[0].innerHTML = "Reveal name"
            EscapeText.innerHTML = "Stuck? Click this button to reveal the next name"
        }

        EscapeForeign.style.display= "inherit"
    }
    function hide_escape_option(){
        EscapeForeign.style.display = "none"
    }
    function escape_button_pressed(){
        //Pick one of the remaining names and feed it as an input - but we will register this as an error
        let random_name = shuffleArray(values_in_set)[0]
        check_name_input(random_name)

        mistake_made("NA", "BOUGHT_NAME", "NA")

        hide_escape_option()

    }

    //Event handlers
    Parent.onpointermove = function (event) {
        if (CurrentActiveCardController !== undefined) {
            let MouseCoords = that.get_cursors_coords(event)
            CurrentActiveCardController.move_card_to_cursor(MouseCoords.x, MouseCoords.y)
           // InstructionTextElem.style.display = "none"

        }
    }
    Parent.onpointerleave = function () {
        if (CurrentActiveCardController !== undefined) {
            CurrentActiveCardController.return_to_reservoir()
            if (!task_finished) {
               // InstructionTextElem.style.display = "inherit"
            }

            that.update_continue_button()
        }
        CurrentActiveCardController = undefined
    }
    Parent.onpointerup = function () {
        if (CurrentActiveCardController !== undefined) {
            check_card_release()
            //InstructionTextElem.style.display = "inherit"
        }
        CurrentActiveCardController = undefined
    }

     //Creating subcontrollers for the target boxes
    for (let i = 0; i < AllFennimals.length; i++) {
        FennimalBoxControllerArray.push(new FennimalBox(TargetDiv, FennimalObjectArray[i], i + 1))
    }

    populate_reservoir_with_new_elements()

    //Checking if we can earn stars
    let can_earn_bonus_stars = false, remaining_earnable_stars = max_earnable_stars
    if(max_earnable_stars !== undefined && max_earnable_stars !== false && max_earnable_stars > 0) {
        can_earn_bonus_stars = true
        display_bonus_star_amount("green", true)
    }


}