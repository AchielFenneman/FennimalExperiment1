

CardSortingParam = function(){
    let that = this
    this.Card_Size = {
        width: 180,
        height: 180,
        width_cards_in_category_box: 2
    }

    this.Reservoir_Dims = {
        x: 100,
        y:800,
        width:1720,
        height: 200
    }

    this.include_names_on_card = true
    if(this.include_names_on_card){
        this.Reservoir_Dims.height = 250
    }

    //If set to false, allows the participant to create any number of group. If set to a number, then participants are given a fixed number of groups.
    //Note that each group is forced to have at least two elements.
    this.fix_number_of_groups = 4

    //If not set to false, determines the minimum number of cards each box needs to have
    this.minimum_group_size = 4

    this.SecondStageStartPos = {
        x: 960,
        y: 450
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
            if(that.minimum_group_size !== false){
                instructions_first_block = instructions_first_block.replace("%EXTRA_RULES%", "<b>Extra Rules</b><br>Each group must contain at least " + that.minimum_group_size + " heads.")
            }else{
                instructions_first_block = instructions_first_block.replace("%EXTRA_RULES%", "<b>Extra Rules</b><br> Each head must be grouped together with at least one other head.")
            }
        }else{
            instructions_first_block = instructions_first_block.replace("%FIXED_GROUP_NUM%", that.fix_number_of_groups)
            instructions_first_block = instructions_first_block.replace("%CAN_CREATE_EXTRA_GROUPS%", "")

            if(that.minimum_group_size !== false){
                instructions_first_block = instructions_first_block.replace("%EXTRA_RULES%", "<b>Extra Rules</b><br>Each group must contain at least " + that.minimum_group_size + " heads.")
            }else{
                instructions_first_block = instructions_first_block.replace("%EXTRA_RULES%", "<b>Extra Rules</b><br>Each group must contain at least one head.")
            }

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

CARDSORTINGTASK = function(currentdaynum, HostElem, Stimuli, returnfunction){

    let Task_SVG_Data = new CardSortingTaskSVG().string
    let CardParam = new CardSortingParam()
    let MainContainer = create_SVG_group(0,0,"card_sorting_task_container")
    let BackgroundRect = create_SVG_rect(0,0,GenParam.SVG_width, GenParam.SVG_height, "card_sorting_task_background_rect", undefined)
    let SVGDIV = create_SVG_group(0,0,undefined)


    //TODO: background rect
    HostElem.appendChild(MainContainer)
    MainContainer.appendChild(BackgroundRect)
    MainContainer.appendChild(SVGDIV)

    //First: insert the SVG task data into the correct element
    SVGDIV.innerHTML = Task_SVG_Data

    let that = this
    let current_phase = 1

    //Creating all the cards from the SVG
    function get_SVG_of_all_heads(){
        let HeadSVGArr = []
        let heads_in_exp = Stimuli.get_all_heads_encountered_during_experiment()
        for(let i =0;i<heads_in_exp.length;i++){
            let HeadSVG = document.getElementById("Fennimal_head_" + heads_in_exp[i]).cloneNode(true)
            //HeadSVG.removeAttribute("id")
            HeadSVGArr.push(HeadSVG)
        }

        return(HeadSVGArr)

    }

    let HeadSVGArray = get_SVG_of_all_heads()
    CardParam.update_number_of_cards(HeadSVGArray.length)

    //Find the SVG element
    let SVG = document.getElementsByTagName("svg")[0],
        Card_layer = document.getElementById("task_layer"),
        GroupsTooSmallWarningText = document.getElementById("continue_button_too_small_groups_text")
    let SVG_cursorpoint = SVG.createSVGPoint()

    Card_layer.style.display = "inherit"

    //Hiding the finish button
 //   let FinishButton = document.getElementById("finish_button"), FinishButtonText = document.getElementById("finish_button_warning_text")
 //   FinishButton.style.display = "none"
 //   FinishButtonText.style.display = "none"

    //INSTRUCTIONS
    let Instructions_First_Stage_Layer = document.getElementById("instructions_page_first_stage"),
        Instructions_First_Stage_Instructions_Foreign, Instructions_First_Stage_Instructions_Div,
        Instructions_Second_Stage_Layer = document.getElementById("instructions_page_second_stage"),
        Instructions_Second_Stage_Instructions_Foreign, Instructions_Second_Stage_Instructions_Div
    Instructions_First_Stage_Layer.style.display = "none"
    Instructions_Second_Stage_Layer.style.display = "none"

    function show_first_instructions_page(){
        //Add the instructions text in a foreignobject\
        Instructions_First_Stage_Instructions_Foreign = create_SVG_text_in_foreign_element(CardParam.get_instruction_text_first_block(), 40,120,1200,850,"card_instructions_text")
        Instructions_First_Stage_Instructions_Foreign.style.fontSize = "32px"
        Instructions_First_Stage_Layer.appendChild(Instructions_First_Stage_Instructions_Foreign)

        Instructions_First_Stage_Instructions_Div = document.createElement("div")
        Instructions_First_Stage_Instructions_Div.innerHTML = CardParam.get_instruction_text_first_block()
        Instructions_First_Stage_Instructions_Foreign.appendChild(Instructions_First_Stage_Instructions_Div)

        let title_text
        if(currentdaynum === false){
            title_text = "First, let's sort some cards"
        }else{
            title_text = "Day " + currentdaynum + ": organizing some cards"
        }

        let Title = create_SVG_text_elem(0.5 * GenParam.SVG_width, 75,title_text, "instructions_element_title","Instructions_Title")
        Title.style.fontWeight = 700
        Title.classList.add("instruction_element_nonbackground")
        Instructions_First_Stage_Layer.appendChild(Title)

        //As for the animation: we may need to hide the names
        if(CardParam.include_names_on_card === false){
            let Names = document.getElementsByClassName("card_calibration_instructions_first_stage_card_name")
            for(let i =0;i<Names.length;i++){
                Names[i].style.display = "none"
            }
        }
        //Setting event listener for the button
        let Button = create_SVG_buttonElement(1920/2,950,200,75,"Start", 50)
        Instructions_First_Stage_Layer.appendChild(Button)
        Button.style.fontWeight = 900

        Button.onpointerdown = function(){close_instruction_page(); AudioCont.play_sound_effect("close_menu")}

        Instructions_First_Stage_Layer.style.display = "inherit"

    }

    function show_second_instructions_page(){
        //Add the instructions text in a foreignobject
        //Instructions_Second_Stage_Instructions_Foreign = create_SVG_foreignElement(40,150,1000,850, "card_instructions_text", undefined)
        //Instructions_Second_Stage_Layer.appendChild(Instructions_Second_Stage_Instructions_Foreign)

        //Instructions_Second_Stage_Instructions_Div = document.createElement("div")
        //Instructions_Second_Stage_Instructions_Div.innerHTML = CardParam.get_instruction_text_second_block()
        //Instructions_Second_Stage_Instructions_Foreign.appendChild(Instructions_Second_Stage_Instructions_Div)
        //Add the instructions text in a foreignobject\
        Instructions_Second_Stage_Instructions_Foreign = create_SVG_text_in_foreign_element(CardParam.get_instruction_text_second_block(), 40,150,1100,850,"card_instructions_text")
        Instructions_Second_Stage_Instructions_Foreign.style.fontSize = "32px"
        Instructions_Second_Stage_Layer.appendChild(Instructions_Second_Stage_Instructions_Foreign)

        //As for the animation: we may need to hide the names
        if(CardParam.include_names_on_card === false){
            let Names = document.getElementsByClassName("card_calibration_instructions_second_stage_card_name")
            for(let i =0;i<Names.length;i++){
                Names[i].style.display = "none"
            }
        }

        //Title
        let Title = create_SVG_text_elem(0.5 * GenParam.SVG_width, 90,"ORGANIZING THE GROUPS", "instructions_element_title","Instructions_Title")
        Title.style.fontWeight = 700
        Title.classList.add("instruction_element_nonbackground")
        Instructions_Second_Stage_Layer.appendChild(Title)

        //Creating and setting event listener for the button
        let Button = create_SVG_buttonElement(1920/2,900,200,75,"Start", 50)
        Button.style.fontWeight = 900
        Instructions_Second_Stage_Layer.appendChild(Button)

        Button.onpointerdown = function(){close_instruction_page(); AudioCont.play_sound_effect("close_menu")}

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
        that.check_reservoir_scroll()
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
    let ReservoirForeignElement, ReservoirGroupDiv, ReservoirCardDiv, ReservoirScrollLeft, ReservoirScrollRight, CategoryContinueButton, Title, SubTitle, RequestInstructionsButton

    //Initalize the reservoir
    function initalize_reservoir_elements(){
        ReservoirForeignElement = create_SVG_foreignElement(CardParam.Reservoir_Dims.x, CardParam.Reservoir_Dims.y,CardParam.Reservoir_Dims.width,CardParam.Reservoir_Dims.height,undefined,"Reservoir")

        ReservoirGroupDiv = document.createElement("div")
        ReservoirGroupDiv.id = "ReservoirGroupDiv"

        ReservoirCardDiv = document.createElement("div")
        ReservoirCardDiv.id = "ReservoirCardDiv"

        //Creating the buttons
        ReservoirScrollLeft = document.createElement("div")
        ReservoirScrollLeft.innerHTML = "◀"
        ReservoirScrollLeft.id = "reservoir_scoll_left_button"
        ReservoirScrollLeft.classList.add("reservoir_scroll_button")

        ReservoirScrollRight = document.createElement("div")
        ReservoirScrollRight.innerHTML = "▶"
        ReservoirScrollRight.id = "reservoir_scoll_right_button"
        ReservoirScrollRight.classList.add("reservoir_scroll_button")

        ReservoirGroupDiv.appendChild(ReservoirScrollLeft)
        ReservoirGroupDiv.appendChild(ReservoirCardDiv)
        ReservoirGroupDiv.appendChild(ReservoirScrollRight)

        //Setting event listeners
        ReservoirScrollLeft.onpointerdown = function(){ReservoirCardDiv.scrollLeft -=100; that.check_reservoir_scroll(); AudioCont.play_sound_effect("button_click")}
        ReservoirScrollRight.onpointerdown = function(){ReservoirCardDiv.scrollLeft +=100; that.check_reservoir_scroll(); AudioCont.play_sound_effect("button_click")}

        //Instructions button
        RequestInstructionsButton = create_SVG_buttonElement(GenParam.RequestInstructionButtonSettings.center_x,GenParam.RequestInstructionButtonSettings.center_y,GenParam.RequestInstructionButtonSettings.width,GenParam.RequestInstructionButtonSettings.height,GenParam.RequestInstructionButtonSettings.text, GenParam.RequestInstructionButtonSettings.textsize)
        Card_layer.appendChild(RequestInstructionsButton)
        RequestInstructionsButton.style.fontWeight = 900
        RequestInstructionsButton.onpointerdown = function(){open_instructions_page(); AudioCont.play_sound_effect("button_click")}
        //TODO

        //Continue button and associated text
        let ContinueButtonGuideText = create_SVG_text_in_foreign_element("<b>Are you confident about these groups?</b><br>If so - please press the button to continue. <br> (You will not be able to return to this screen afterwards)", 230,800, 0.5*GenParam.SVG_width, 300,"category_continue_button_element")
        ContinueButtonGuideText.style.fontSize = "35px"
        Card_layer.appendChild(ContinueButtonGuideText)

        CategoryContinueButton = create_SVG_buttonElement(1400,900,300,100,"Continue", 60)
        Card_layer.appendChild(CategoryContinueButton)
        CategoryContinueButton.style.fontWeight = 900
        CategoryContinueButton.onpointerdown =  function(){start_second_stage(); AudioCont.play_sound_effect("button_click")}


        //Creating various text elements
        //Title and subtitle
        Title = create_SVG_text_elem(0.5 * GenParam.SVG_width, 50,"Which of these groups go together?", "instructions_element_title","Instructions_Title")
        Title.style.fontWeight = 700
        Card_layer.appendChild(Title)

        SubTitle = create_SVG_text_elem(0.5 * GenParam.SVG_width, 95,"Please place heads together if they belong to the same theme, topic or type.", "instructions_element_title","Instructions_Title")
        SubTitle.style.fontStyle = "italic"
        Card_layer.appendChild(SubTitle)

        //Warning text
        GroupsTooSmallWarningText = create_SVG_text_elem(200,900,"Please make sure that each group contains at least two heads", undefined,"GroupTooSmalLText")
        GroupsTooSmallWarningText.style.fontSize = "50px"
        GroupsTooSmallWarningText.style.fontStyle = "italic"
        GroupsTooSmallWarningText.style.fill = "darkred"
        Card_layer.appendChild(GroupsTooSmallWarningText)
        GroupsTooSmallWarningText.setAttribute("x", 0.5* GenParam.SVG_width - 0.5* GroupsTooSmallWarningText.getBBox().width)
        GroupsTooSmallWarningText.style.display = "none"

        //Appending elements to the Reservoir foreign element
        ReservoirForeignElement.appendChild(ReservoirGroupDiv)
        Card_layer.appendChild(ReservoirForeignElement)

        that.check_reservoir_scroll()


        //Adding event listener for the instructions button
        //document.getElementById("button_request_instructions").onpointerdown = open_instructions_page


        //Hiding some warning texts
       // GroupsTooSmallWarningText.style.display = "none"


    }


    //Call this whenever there is a change to the card reservoir. Updates the scroll buttons.
    this.check_reservoir_scroll = function(){
        if(ReservoirCardDiv.scrollLeft === 0){
            ReservoirScrollLeft.style.display = "none"
        }else{
            ReservoirScrollLeft.style.display = "inherit"
        }

        let  maxScrollLeft = ReservoirCardDiv.scrollWidth - ReservoirCardDiv.clientWidth;
        if(Math.ceil(ReservoirCardDiv.scrollLeft) === maxScrollLeft){
            ReservoirScrollRight.style.display = "none"
        }else{
            ReservoirScrollRight.style.display = "inherit"
        }
    }

    initalize_reservoir_elements()

    function hide_main_continue_button(){
        let ContinueButtonElementsArr = document.getElementsByClassName("category_continue_button_element")
        for(let i =0; i<ContinueButtonElementsArr.length;i++){
            ContinueButtonElementsArr[i].style.display = "none"
        }
        CategoryContinueButton.style.display = "none"


    }
    function show_main_continue_button(){
        let ContinueButtonElementsArr = document.getElementsByClassName("category_continue_button_element")
        for(let i =0; i<ContinueButtonElementsArr.length;i++){
            ContinueButtonElementsArr[i].style.display = "inherit"
        }
        CategoryContinueButton.style.display = "inherit"
    }
    //Check whenever there is a change to the card reservoir to count the number of remaining (unplaced) cards.
    this.update_continue_button = function(){
        if(current_phase === 1){
            if(check_if_all_cards_placed()){
                ReservoirForeignElement.style.display = "none"

                //ADDITION (rest of function)
                //Running some checks to test if all the groups are correctly created and filled, according to the rules
                let correct_elements_per_group = false

                //First we need to check if there is a minimum group size. If not, then other rules apply
                if(CardParam.minimum_group_size !== false){
                    if(check_if_all_groups_have_the_minimum_number_of_elements()){
                        //All groups have the minimum number of elements
                        GroupsTooSmallWarningText.style.display = "none"
                        show_main_continue_button()
                    }else{
                        //At least one group is too small
                        GroupsTooSmallWarningText.childNodes[0].innerHTML = "Please make sure that each group contains at least " + CardParam.minimum_group_size + " heads"
                        GroupsTooSmallWarningText.style.display = "inherit"
                        hide_main_continue_button()
                    }

                }else{
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

    //ADDITION
    function check_if_all_groups_have_the_minimum_number_of_elements(){
        let AllBoxContentsArr = BoxCont.get_all_box_contents()
        for(let i=0;i<AllBoxContentsArr.length;i++){
            if(AllBoxContentsArr[i].length < CardParam.minimum_group_size){
                return(false)
            }
        }
        return(true)
    }

    //Now we can create a set of cards and their constituent elements.
    let CardArr = []
    for(let i =0;i<HeadSVGArray.length;i++){
        CardArr.push(new CardController(Card_layer, HeadSVGArray[i], ReservoirCardDiv, that))
        //that.check_reservoir_scroll()
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
        Title.innerHTML = "Which groups are more closely related to each other?"
        SubTitle.innerHTML = "Please move groups closer together if they are more related"

        //Transform all boxes to draggable groups, move them to the center
        BoxCont.transform_all_boxes_to_draggable_elements(SVG,Card_layer)

        //Show instructions for the second stage
        current_phase = 2
        show_second_instructions_page()

        //Hide the continue button
        hide_main_continue_button()

    }

    let FinishButton, FinishButtonGuideText
    this.all_boxes_have_been_moved_from_original_location = function(){
        if(typeof FinishButton === "undefined"){
            FinishButtonGuideText = create_SVG_text_in_foreign_element("<b>Please press the button once you are satisfied with the position of all groups</b> <br> (You will not be able to return to this screen afterwards)", 230,800, 0.5*GenParam.SVG_width, 300,undefined)
            FinishButtonGuideText.style.fontSize = "35px"
            FinishButtonGuideText.style.pointerEvents = "none"
            Card_layer.appendChild(FinishButtonGuideText)

            FinishButton = create_SVG_buttonElement(1400,920,300,100,"Continue", 60)
            FinishButton.style.fontWeight = 900
            Card_layer.appendChild(FinishButton)
            FinishButton.onpointerdown = function(){finish_task(); AudioCont.play_sound_effect("close_menu")}
        }
    }
    function finish_task(){
        //Returning data
        returnfunction(JSON.parse(JSON.stringify(BoxCont.get_all_box_data())))

        //Delete all elements
        MainContainer.remove()

    }

}


BoxController = function(ParentElem, GroupingCont){
    //Creating the foreignelement which will contain all the boxes.
    let that = this
    let CardParam = new CardSortingParam()

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

        AddButton.onpointerdown = function(){create_new_box(); AudioCont.play_sound_effect("thud")}

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
            if(CardParam.minimum_group_size !== false){
                if(Names_of_cards_in_box.length < CardParam.minimum_group_size){
                    BoxDiv.style.border = "5px dashed red"
                }else{
                    BoxDiv.style.border = "inherit"
                }
            }else{
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
            DeleteButton.onpointerdown =  function(){delete_box(); AudioCont.play_sound_effect("button_click")}
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

        //ADDITION
        update_box_border()



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

CardController = function(MainSVG, HeadSVG, ReservoirElem, GroupingCont){
    let CardParam = new CardSortingParam()
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

            if(GenParam.HeadDisplayNames[card_name] !== undefined){
                NameP.innerHTML = GenParam.HeadDisplayNames[card_name]
            }else{
                NameP.innerHTML = card_name
            }

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
        AudioCont.play_sound_effect("card_placed")
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

