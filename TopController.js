//Given a reference to an SVG object, sets the color classes for the Fennimal
function set_Fennimal_color_classes(Obj){
    //The Fennimal's colors are defined by their placeholder fills (as just in the inkscape format). Here we take these fill colors and append the correct classes
    //Get all children, grandchildren etc.
    let List_All = Obj.getElementsByTagName("*")
    for(let i = 0;i<List_All.length;i++){
        if(List_All[i].getAttribute("fill") !== undefined){
            let fill_color = List_All[i].getAttribute("fill")
            switch (fill_color){
                case("#ea6208"): List_All[i].classList.add("Fennimal_primary_color"); break
                case("#eed671"): List_All[i].classList.add("Fennimal_secondary_color"); break
                case("#812c2c"): List_All[i].classList.add("Fennimal_tertiary_color"); break
                case("#a7cdfe"): List_All[i].classList.add("Fennimal_eye_color"); break
            }
        }



    }
}

// Transforms the heads SVG data into an array of strings (one string per head)
function extract_all_SVG_heads_to_array(RawSVGString){
    //Insert the SVG into a hidden element
    let HiddenDiv = document.createElement("div")
    HiddenDiv.style.display = "none"
    document.getElementById("expdiv").appendChild(HiddenDiv)
    HiddenDiv.innerHTML =  RawSVGString

    //Now transforming all elements to an array of strings (one element per head)
    let OutputArr = []
    let RawHeads = HiddenDiv.getElementsByClassName("Fennimal_head")

    for(let i = 0;i<RawHeads.length;i++){
        set_Fennimal_color_classes(RawHeads[i])
        OutputArr.push( RawHeads[i])
    }

    //Deleting the hidden DIV and returning the array
    // HiddenDiv.remove()
    return(OutputArr)

}

CardSortingParam = function(){
    let that = this
    this.Card_Size = {
        width: 180,
        height: 180,
        width_cards_in_category_box: 2
    }

    this.Reservoir_Dims = {
        x: 100,
        y:860,
        width:1720,
        height: 200
    }

    this.include_names_on_card = true
    if(this.include_names_on_card){
        this.Reservoir_Dims.height = 250
    }

    //If set to false, allows the participant to create any number of group. If set to a number, then participants are given a fixed number of groups.
    //Note that each group is forced to have at least two elements.
    this.fix_number_of_groups = false

    this.SecondStageStartPos = {
        x: 960,
        y: 450
    }

    this.PublicNames = {
        rhino: "Nosey",
        giraffe: "Necky",
        elephant: "Trunko",
        cow: "Moo",
        sheep: "Softy",
        pig: "Oinkers",
        chicken: "Rooster",
        jackolantern: "Jack-o",
        ghost: "Spooky",
        witch: "Witchy",
        skull: "Skully",
        snowman: "Snowy",
        elf: "Elf",
        christmastree: "Xmashead",
        candycane: "Candy",
        lion: "Pridey",
        santa: "Santa",
        owl: "Hoot",
        bird: "Cresty",
        parrot: "Re-pete-y",



    }

    let number_of_cards
    this.update_number_of_cards = function(num){
        number_of_cards = num
    }

    let instructions_first_block = "<b>Your job in this task is to organize cartoon heads into different groups.</b> <br>" +
        "You should move heads to the same box if you believe that these heads go together - that is, if they share a theme. " +
        "All heads within a group should have the same theme, topic or type - and different groups should have different themes, topics or types.<br>" +
        "<br>" +
        "<b>You can organize these groups on the next page. </b> <br>" +
        "On the top of the screen you will find %FIXED_GROUP_NUM% boxes. Each box represents a different group. " +
        "%CAN_CREATE_EXTRA_GROUPS% <br>" +
        "On the bottom of the screen you fill find %NUMCARDS% different cartoon heads%INCLUDE_NAMES_TEXT%. <br>" +
        "Your task is to move these heads from the bottom part to the different boxes in the top part.<br>" +
        "You can move a head to a group by holding down your mouse and dragging / releasing the head op top of one of the groups.<br>" +
        "<br>" +
        "%EXTRA_RULES% "
    let instructions_second_block = "<b>Well done, you have now placed all the heads into different groups.</b> <br>" +
        "But some of these groups may be more closely related than others... <br>" +
        "<br>" +
        "<b>Your task is to sort these groups.</b> <br>" +
        "On the next page you can use your cursor to drag the groups to different positions. <br> " +
        "You can place these groups anywhere on the screen. Please sort these groups by how closely related you think they are. <br> " +
        "If you think two groups are more closely related to eachother, then move them closer together. " +
        "If you think two groups are not at all related to eachother, then move them further apart. <br>"

    //let instructions_first_block = "Your job in this task is to organize cartoon heads into different groups. <br>" +
    //         "<br>" +
    //         "The next page contains two parts. <br>" +
    //         "On the top of the screen you will find %FIXED_GROUP_NUM% boxes. Each box represents a different group. " +
    //         "%CAN_CREATE_EXTRA_GROUPS% <br><br>" +
    //         "On the bottom of the screen you fill find %NUMCARDS% different cartoon heads%INCLUDE_NAMES_TEXT%. <br>" +
    //         "<br>" +
    //         "Your task is to move these heads from the bottom part to the different boxes in the top part.<br>" +
    //         " " +
    //         "<b>You should move heads to the same box if you believe that these heads go together - that is, if they share a theme. " +
    //         "All heads within a group should have the same theme - and different groups should have different themes.</b><br>" +
    //         "<br>" +
    //         "You can move a head to a group by holding down your mouse and dragging / releasing the head in one of the groups.<br>" +
    //         "<br>" +
    //         "%EXTRA_RULES% "

    //Modifying the instructions based on the used parameters
    function update_instructions_first_block(){
        if(that.fix_number_of_groups === false){
            instructions_first_block = instructions_first_block.replace("%FIXED_GROUP_NUM%", "multiple")
            instructions_first_block = instructions_first_block.replace("%CAN_CREATE_EXTRA_GROUPS%", "You can add as many boxes as you want.")
            instructions_first_block = instructions_first_block.replace("%EXTRA_RULES%", "<b>Extra Rules</b><br> Each head must be grouped together with at least one other head.")
        }else{
            instructions_first_block = instructions_first_block.replace("%FIXED_GROUP_NUM%", that.fix_number_of_groups)
            instructions_first_block = instructions_first_block.replace("%CAN_CREATE_EXTRA_GROUPS%", "")
            instructions_first_block = instructions_first_block.replace("%EXTRA_RULES%", "<b>Extra Rules</b><br>Each group must contain at least one head.")
        }

        instructions_first_block = instructions_first_block.replace("%NUMCARDS%", number_of_cards)

        if(that.include_names_on_card){
            instructions_first_block = instructions_first_block.replace("%INCLUDE_NAMES_TEXT%", ", each of which has a different name.")
        }else{
            instructions_first_block = instructions_first_block.replace("%INCLUDE_NAMES_TEXT%", "")
        }

        return(instructions_first_block)

    }
    function update_instructions_second_block(){
        return(instructions_second_block)
    }

    //Call to retrieve instructions
    this.get_instruction_text_first_block = function(){
        return(update_instructions_first_block(instructions_first_block))
    }
    this.get_instruction_text_second_block = function(){
        return(update_instructions_second_block())
    }
}

GroupController = function(HostElem, HeadSVGArray, Task_SVG_Data){
    //First: insert the SVG task data into the correct element
    HostElem.innerHTML = Task_SVG_Data

    let that = this
    let current_phase = 1

    //Creating all the cards from the SVG
    CardParam.update_number_of_cards(HeadSVGArray.length)

    //Find the SVG element
    let SVG = document.getElementsByTagName("svg")[0],
        Card_layer = document.getElementById("task_layer"),
        GroupsTooSmallWarningText = document.getElementById("continue_button_too_small_groups_text")
    let SVG_cursorpoint = SVG.createSVGPoint()

    Card_layer.style.display = "inherit"

    //Hiding the finish button
    let FinishButton = document.getElementById("finish_button"), FinishButtonText = document.getElementById("finish_button_warning_text")
    FinishButton.style.display = "none"
    FinishButtonText.style.display = "none"

    //INSTRUCTIONS
    let Instructions_First_Stage_Layer = document.getElementById("instructions_page_first_stage"),
        Instructions_First_Stage_Instructions_Foreign, Instructions_First_Stage_Instructions_Div,
        Instructions_Second_Stage_Layer = document.getElementById("instructions_page_second_stage"),
        Instructions_Second_Stage_Instructions_Foreign, Instructions_Second_Stage_Instructions_Div
    Instructions_First_Stage_Layer.style.display = "none"
    Instructions_Second_Stage_Layer.style.display = "none"

    function show_first_instructions_page(){
        //Add the instructions text in a foreignobject
        Instructions_First_Stage_Instructions_Foreign = create_SVG_foreignElement(40,150,1200,850, "card_instructions_text", undefined)
        Instructions_First_Stage_Layer.appendChild(Instructions_First_Stage_Instructions_Foreign)

        Instructions_First_Stage_Instructions_Div = document.createElement("div")
        Instructions_First_Stage_Instructions_Div.innerHTML = CardParam.get_instruction_text_first_block()
        Instructions_First_Stage_Instructions_Foreign.appendChild(Instructions_First_Stage_Instructions_Div)

        //As for the animation: we may need to hide the names
        if(CardParam.include_names_on_card === false){
            let Names = document.getElementsByClassName("card_calibration_instructions_first_stage_card_name")
            for(let i =0;i<Names.length;i++){
                Names[i].style.display = "none"
            }
        }
        //Setting event listener for the button
        document.getElementById("card_calibration_instructions_first_stage_start_button").onpointerdown = close_instruction_page

        Instructions_First_Stage_Layer.style.display = "inherit"

    }

    function show_second_instructions_page(){
        //Add the instructions text in a foreignobject
        Instructions_Second_Stage_Instructions_Foreign = create_SVG_foreignElement(40,150,1000,850, "card_instructions_text", undefined)
        Instructions_Second_Stage_Layer.appendChild(Instructions_Second_Stage_Instructions_Foreign)

        Instructions_Second_Stage_Instructions_Div = document.createElement("div")
        Instructions_Second_Stage_Instructions_Div.innerHTML = CardParam.get_instruction_text_second_block()
        Instructions_Second_Stage_Instructions_Foreign.appendChild(Instructions_Second_Stage_Instructions_Div)

        //As for the animation: we may need to hide the names
        if(CardParam.include_names_on_card === false){
            let Names = document.getElementsByClassName("card_calibration_instructions_second_stage_card_name")
            for(let i =0;i<Names.length;i++){
                Names[i].style.display = "none"
            }
        }
        //Setting event listener for the button
        document.getElementById("card_calibration_instructions_second_stage_start_button").onpointerdown = close_instruction_page

        Instructions_Second_Stage_Layer.style.display = "inherit"

    }

    show_first_instructions_page()

    function close_instruction_page(){
        let Pages = document.getElementsByClassName("instructions_page")

        for(let i =0;i<Pages.length;i++){
            Pages[i].style.display = "none"
            Card_layer.style.display = "inherit"
        }

        that.update_continue_button()
    }

    //Call when the instructions button is pressed
    let open_instructions_page = function(){

        if(current_phase === 1){
            Instructions_First_Stage_Layer.style.display = "inherit"
        }
        if(current_phase === 2){
            Instructions_Second_Stage_Layer.style.display = "inherit"
        }
    }

    //INTERACTION ELEMENTS
    //Creating the elements for the reservoir
    let ReservoirForeignElement, ReservoirGroupDiv, ReservoirCardDiv, ReservoirScrollLeft, ReservoirScrollRight

    //Initalize the reservoir
    function initalize_reservoir_elements(){
        ReservoirForeignElement = create_SVG_foreignElement(CardParam.Reservoir_Dims.x, CardParam.Reservoir_Dims.y,CardParam.Reservoir_Dims.width,CardParam.Reservoir_Dims.height,undefined,"Reservoir")

        ReservoirGroupDiv = document.createElement("div")
        ReservoirGroupDiv.id = "ReservoirGroupDiv"
        ReservoirCardDiv = document.createElement("div")
        ReservoirCardDiv.id = "ReservoirCardDiv"

        //Creating the buttons
        let ButtonLeftForeign = document.createElementNS("http://www.w3.org/2000/svg", 'svg')
        let ButtonRightForeign = document.createElementNS("http://www.w3.org/2000/svg", 'svg')
        ButtonLeftForeign.classList.add("SVG_scrollbutton_foreign")
        ButtonRightForeign.classList.add("SVG_scrollbutton_foreign")
        ReservoirScrollLeft = document.getElementById("card_reservoir_button_left")
        ReservoirScrollRight = document.getElementById("card_reservoir_button_right")

        ReservoirScrollLeft.remove()
        ReservoirScrollRight.remove()
        ButtonLeftForeign.appendChild(ReservoirScrollLeft)
        ButtonRightForeign.appendChild(ReservoirScrollRight)

        //Appending elements to the Reservoir foreign element
        ReservoirForeignElement.appendChild(ReservoirGroupDiv)
        Card_layer.appendChild(ReservoirForeignElement)

        ReservoirGroupDiv.appendChild(ButtonLeftForeign)
        ReservoirGroupDiv.appendChild(ReservoirCardDiv)
        ReservoirGroupDiv.appendChild(ButtonRightForeign)

        //Setting event listeners
        ReservoirScrollLeft.onpointerdown = function(){ReservoirCardDiv.scrollLeft -=100; that.check_reservoir_scroll()}
        ReservoirScrollRight.onpointerdown = function(){ReservoirCardDiv.scrollLeft +=100; that.check_reservoir_scroll()}

        //Adding event listener for the instructions button
        document.getElementById("button_request_instructions").onpointerdown = open_instructions_page


        //Hiding some warning texts
        GroupsTooSmallWarningText.style.display = "none"


    }
    initalize_reservoir_elements()

    //Set an event handler for the continue buttons
    document.getElementById("category_continue_button").onpointerdown = start_second_stage

    //Call this whenever there is a change to the card reservoir. Updates the scroll buttons.
    this.check_reservoir_scroll = function(){
        if(ReservoirCardDiv.scrollLeft === 0){
            ReservoirScrollLeft.style.display = "none"
        }else{
            ReservoirScrollLeft.style.display = "inherit"
        }

        let  maxScrollLeft = ReservoirCardDiv.scrollWidth - ReservoirCardDiv.clientWidth;
        if(Math.ceil(ReservoirCardDiv.scrollLeft) === maxScrollLeft){
            document.getElementById("card_reservoir_button_right").style.display = "none"
        }else{
            document.getElementById("card_reservoir_button_right").style.display = "inherit"
        }
    }
    this.check_reservoir_scroll()

    function hide_main_continue_button(){
        let ContinueButtonElementsArr = document.getElementsByClassName("category_continue_button_element")
        for(let i =0; i<ContinueButtonElementsArr.length;i++){
            ContinueButtonElementsArr[i].style.display = "none"
        }
        document.getElementById("category_continue_button").style.display = "none"


    }
    function show_main_continue_button(){
        let ContinueButtonElementsArr = document.getElementsByClassName("category_continue_button_element")
        for(let i =0; i<ContinueButtonElementsArr.length;i++){
            ContinueButtonElementsArr[i].style.display = "inherit"
        }
        document.getElementById("category_continue_button").style.display = "inherit"
    }
    //Check whenever there is a change to the card reservoir to count the number of remaining (unplaced) cards.
    this.update_continue_button = function(){
        if(current_phase === 1){
            if(check_if_all_cards_placed()){
                ReservoirForeignElement.style.display = "none"

                //The reservoir is empty.
                //What we do next depends on the setup of the task. If the participant can define any number of groups, we want to check if each group has at least two elements.
                // If there are a fixed number of groups, then check if each box has at least one element
                if(CardParam.fix_number_of_groups === false){
                    if(check_if_all_non_empty_groups_have_at_least_two_elements()){
                        //All good. Now the participant can continue
                        //Show the continue button elements and hide the reservoir
                        GroupsTooSmallWarningText.style.display = "none"

                        show_main_continue_button()
                    }else{
                        //Oops, at least one box contains only a single card. Inform the participant
                        GroupsTooSmallWarningText.childNodes[0].innerHTML = "Please make sure that each group contains at least two heads"
                        GroupsTooSmallWarningText.style.display = "inherit"

                        hide_main_continue_button()
                    }
                }else{
                    if(check_if_all_groups_have_at_least_one_element()){
                        GroupsTooSmallWarningText.style.display = "none"
                        show_main_continue_button()
                    }else{
                        GroupsTooSmallWarningText.childNodes[0].innerHTML = "Please make sure that all groups contain at least one head"
                        GroupsTooSmallWarningText.style.display = "inherit"
                        hide_main_continue_button()
                    }
                }





            }else{
                //Re-show the reservoir and hide the continue button elements
                GroupsTooSmallWarningText.style.display = "none"
                ReservoirForeignElement.style.display = "inherit"
                hide_main_continue_button()
            }

        }



    }

    function check_if_all_cards_placed(){

        for(let i =0;i<CardArr.length;i++){

            if(CardArr[i].has_been_placed_in_box() === false){
                return(false)
            }
        }
        return(true)

    }

    //Call when all cards have been placed (that is, the reservoir is empty) to check if each non-empty box has at least two heads
    function check_if_all_non_empty_groups_have_at_least_two_elements(){
        let AllBoxContentsArr = BoxCont.get_all_box_contents()
        for(let i=0;i<AllBoxContentsArr.length;i++){
            if(AllBoxContentsArr[i].length === 1){
                return(false)
            }
        }
        return(true)


    }

    function check_if_all_groups_have_at_least_one_element(){
        let AllBoxContentsArr = BoxCont.get_all_box_contents()
        for(let i=0;i<AllBoxContentsArr.length;i++){
            if(AllBoxContentsArr[i].length === 0){
                return(false)
            }
        }
        return(true)


    }

    //Now we can create a set of cards and their constituent elements.
    let CardArr = []
    for(let i =0;i<HeadSVGArray.length;i++){
        CardArr.push(new CardController(Card_layer, HeadSVGArray[i], ReservoirCardDiv, that))
        that.check_reservoir_scroll()
    }

    //Call when a card has been brought into focus (that is, when it is being dragged)
    let CurrentActiveController
    this.call_attention_to_different_card_controller = function(NewActiveController){
        //If there is a currently active controller, then tell it to return to its last valid position
        if(CurrentActiveController !== undefined){
            CurrentActiveController.return_to_reservoir()
        }

        //Now switch to the new controller (if there is one)
        if(NewActiveController === undefined){
            CurrentActiveController = undefined
        }else{
            if(NewActiveController === false){
                CurrentActiveController = undefined
            }else{
                CurrentActiveController = NewActiveController
            }
        }
    }

    this.get_cursors_coords = function(event){
        SVG_cursorpoint.x = event.clientX
        SVG_cursorpoint.y = event.clientY
        let newcoords = SVG_cursorpoint.matrixTransform(SVG.getScreenCTM().inverse())
        return(newcoords)
    }

    //BOX FUNCTIONS
    let BoxCont = new BoxController(Card_layer, that)

    this.return_cards_when_box_deleted = function(Arr_of_names){
        for(let i = 0;i<CardArr.length;i++){
            CardArr[i].check_if_card_back_to_reservoir(Arr_of_names)
        }
        this.update_continue_button()
    }

    //RELEASE FUNCTIONS
    function check_card_release(){
        //Find out which box is currently active.
        let ActiveBox = BoxCont.get_active_box()

        if(ActiveBox === "false"){
            CurrentActiveController.return_to_reservoir()

        }else{
            if(ActiveBox === "area"){
                //The card is released in the box-containing area, but not in a box.
                // Create a new box and add this element (that is, if new boxes are allowed.
                if(CardParam.fix_number_of_groups === false){
                    let NewBox = BoxCont.create_new_box_auto()
                    CurrentActiveController.attach_to_box(NewBox)
                }else{
                    CurrentActiveController.return_to_reservoir()
                }


            }else{
                //A box was selected!
                CurrentActiveController.attach_to_box(ActiveBox)

            }
        }

        that.update_continue_button()

    }

    //Event handlers
    SVG.onpointermove = function(event){
        if(CurrentActiveController !== undefined){
            let MouseCoords = that.get_cursors_coords(event)
            CurrentActiveController.move_card_to_cursor(MouseCoords.x,MouseCoords.y)

        }
    }
    SVG.onpointerleave = function(){
        if(CurrentActiveController!== undefined){
            CurrentActiveController.return_to_reservoir()
            that.update_continue_button()
        }
        CurrentActiveController = undefined
    }
    SVG.onpointerup = function(){
        if(CurrentActiveController!== undefined){
            check_card_release()
        }
        CurrentActiveController = undefined
    }

    //Hands off the boxes to a second stage (relative position) controller
    function start_second_stage(){
        //Hide the previous continue button and associated elements
        let ContinueButtonElementsArr = document.getElementsByClassName("category_continue_button_element")
        for(let i =0; i<ContinueButtonElementsArr.length;i++){
            ContinueButtonElementsArr[i].style.display = "none"
        }

        //Fix all cards in place
        for(let i =0;i<CardArr.length;i++){
            CardArr[i].fix_card_in_place()
        }

        //Remove all the buttons in the boxes (and on the SVG)
        BoxCont.fix_all_boxes_in_place()

        //Change the text at the top of the screen
        document.getElementById("title_text").childNodes[0].innerHTML = "Which groups are more closely related to each other?"
        document.getElementById("subtitle_text").childNodes[0].innerHTML = "Please move groups closer together if they are more related"

        //Transform all boxes to draggable groups, move them to the center
        BoxCont.transform_all_boxes_to_draggable_elements(SVG,Card_layer)

        //Show instructions for the second stage
        current_phase = 2
        show_second_instructions_page()

        //Hide the continue button
        hide_main_continue_button()

    }


    this.all_boxes_have_been_moved_from_original_location = function(){
        FinishButton.style.display = "inherit"
        FinishButtonText.style.display = "inherit"

        FinishButton.onclick = finish_task

    }
    function finish_task(){
        console.log(BoxCont.get_all_box_data())
        document.getElementById("data_form_field").innerHTML = JSON.stringify(BoxCont.get_all_box_data())
        document.getElementById("submitbutton").click()
    }

}

//On initalization
let CardParam = new CardSortingParam()
let CardSortCont = new GroupController(document.getElementById("expdiv"), shuffleArray( extract_all_SVG_heads_to_array(new RawSVGHeadsData().string)), new CardSortingSVG().string)



//TODO
//  Instructions phase 2
//  Compile into single file
//  Nice wrapper