// Manages the instructions screen
console.warn("RUNNING INSTRUCTIONS CONTROLLER")

InstructionsController = function(ExpCont, LocCont){
    let that = this

    //For ease of access
    let SVG_references = {
        Layer: document.getElementById("Instructions_Layer"),
        OutlineIconLayer: document.getElementById("instructions_outline_icons"),
        Hint_and_pack_item_boxes: document.getElementById("hint_and_pack_item"),
        Pages : {
            Consent: document.getElementById("instructions_consent"),
            Welcome: document.getElementById("instructions_welcome"),
            Exploration: document.getElementById("instructions_exploration"),
            Search: document.getElementById("instructions_search"),
            Test: document.getElementById("instructions_test_phase"),
            Finished: document.getElementById("instructions_finished"),
            FinishedBonus: document.getElementById("instructions_finished_bonus"),
            Test_Target: document.getElementById("instructions_test_target"),
            Final_Block: document.getElementById("instructions_final_timed"),
            CardQuiz: document.getElementById("instructions_cardquiz")
        }
    }

    //Instructions shown to the participant
    let Instructions = {
        Training_Phase: {
            Exploration: {
                title: "EXPLORING THE ISLAND",
                text_top: "Hello Trainee, and welcome to your training. To get you started, let's first explore the island. " +
                    "There are various locations for you to discover, and Fennimals to be introduced to. " +
                    "Please find and interact with all of the Fennimals on the list below. You can visit all locations and Fennimals in any order.",
                text_bottom: "Click the continue button to start your training in Fenneland. You can always return to this screen by moving back to the center of the map through pressing on the Home (H) icon. "
            },
            Exploration_Completed: {
                title: "EXPLORATION COMPLETE",
                text_top: "Congratulations, you have completed your first expedition across Fenneland! You have found all locations and have interacted with a group of local Fennimals. ",
                text_bottom: "Click the continue button to continue with the next phase of your training. "
            },
            Search: {
                title: "FIND THAT FENNIMAL",
                text: "Well done! Now you have a feeling for the island and its inhabitants. " +
                    "For the next part of your training, you will learn to find different Fennimals all over the island. I'll give you a hint below. Please find this Fennimal on the island! "
            },
            Delivery: {
                title: "DELIVER TOYS TO THE FENNIMALS",
                text: "You're doing great! Let's kick it up a notch. As before, I will give you a hint. However, now your backpack only fits a single toy, and you have to select which toy to bring." +
                    " <b>You have to bring the toy that you have previously given to this Fennimal </b> "
            },
            Quiz: {
                title_first_attempt: "Quiz time!",
                title_additional_attempts: "Let's try that again!",
                first_quiz_start: "Well done, Trainee! You're well on your way to becoming an Expert Wildlife Ranger. Before we continue, we will first give you a quiz to review what you've learned so far. <br><br> ",
                additional_quiz_attempt_text: "Whoops, it looks like you made some mistakes on your last quiz. Let's try again!<br><br>",
                basic_instructions: "Please travel around the island and find all the Fennimals again. When you find a Fennimal, <b> please give it the same toy as you have given it before. </b> ",
                basic_instructions_negative: "(This could be a toy which the Fennimal did not like!).",
                insert_repeat_until_perfect : "You can only pass the quiz if you select all the correct toys. If you make any mistakes during the quiz, then you will have to retake it. Don't worry if that happens, you can try the quiz as many times as needed.<br><br>",
                quiz_closer_text: "Click on the button below to start the exam. "
            },

        },

    }

    //Keeps track of which instructions state we are currently in. Valid calls include "welcome", "exploration", "search"
    let current_instructions_state

    //Clears all instruction subpages
    function hide_all_instruction_pages(){
        cull_the_marked();
        let AllInstructionPages = document.getElementsByClassName("instruction_page")
        for(let i = 0; i < AllInstructionPages.length; i++){
            AllInstructionPages[i].style.display = "none"
        }
    }

    //Call when one of the starting instructions pages has been completed
    function starting_page_completed(){
        hide_all_instruction_pages();
        EC.starting_instructions_page_completed(false)
    }
    function consent_page_completed(){
        hide_all_instruction_pages()
        EC.starting_instructions_page_completed("consent")
    }

    //Shows the consent page
    this.show_consent_screen = function(){
        //Hide all pages
        hide_all_instruction_pages()

        //Show the instructions layer and the consent page
        SVG_references.Layer.style.display = "inherit"
        SVG_references.Pages.Consent.style.display = "inherit"

        //Hide the checkmark and continue button
        document.getElementById("consent_check_mark").style.display = "none"
        document.getElementById("consent_check_mark").style.pointerEvents = "none"
        document.getElementById("consent_continue_button").style.display = "none"

        let current_consent_state = false
        document.getElementById("consent_check_box").onclick = function(){
            if(current_consent_state){
                current_consent_state = false
                document.getElementById("consent_check_mark").style.display = "none"
                document.getElementById("consent_continue_button").style.display = "none"
            }else{
                current_consent_state = true
                document.getElementById("consent_check_mark").style.display = "inherit"
                document.getElementById("consent_continue_button").style.display = "inherit"
            }
        }

        document.getElementById("consent_continue_button").onclick = consent_page_completed


    }

    //Fullscreen prompt page
    this.show_fullscreen_prompt = function(){
        current_instructions_state = "start"

        //Hide all pages
        hide_all_instruction_pages()

        //Show the instructions layer and the welcome screen
        SVG_references.Layer.style.display = "inherit"


        //Set event listener for the fullscreen button
        // document.getElementById("button_instructions_fullscreen").addEventListener("mousedown", startScreenCompleted )

        //Create the instructions page with the title and text
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        SVG_references.Layer.style.display = "inherit"

        let TextTop = createTextField(30, 10, 508-2*30,250, "<b>This experiment is best experienced by setting your browser to full-screen mode.</b>")
        TextTop.style.textAlign = "center"
        TextTop.style.fontSize = "15px"
        Container.appendChild(TextTop)

        let Text2 = createTextField(30, 60, 508-2*30,250, "Pressing the button below will toggle full-screen mode")
        Text2.style.textAlign = "center"
        Text2.style.fontSize = "15px"
        Container.appendChild(Text2)

        let Text3 = createTextField(30, 90, 508-2*30,250, "On windows you can exit (and re-enter) full-screen mode at any time by pressing [F11]. On Mac, you can enter and leave full-screen mode at any time by pressing [Command]+[Cntrl]+[F].")
        Text3.style.textAlign = "center"
        Text3.style.fontSize = "15px"
        Container.appendChild(Text3)

        let Text4 = createTextField(30, 140, 508-2*30,250, "In addition, please make sure that your audio is on! (The sound will enhance your performance during this task. ")
        Text4.style.textAlign = "center"
        Text4.style.fontSize = "15px"
        Container.appendChild(Text4)

        let Text5 = createTextField(30, 190, 508-2*30,250, "<i>Important note: this experiment is only supported for Chrome. Using any other browsers may result in unforeseen errors! </i>")
        Text5.style.textAlign = "center"
        Text5.style.fontSize = "15px"
        Container.appendChild(Text5)

        let Button = createSVGButtonElem((508-200)/2,245,200,30,"GO TO FULL-SCREEN")
        Button.addEventListener("mousedown", toggleFullscreen)
        Button.addEventListener("mousedown", starting_page_completed)
        Container.appendChild(Button)
    }

    //Brief details on payment and duration
    this.show_payment_info = function(){
        //Create the instructions page with the title and text
        showNewInstructionsPage()

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        SVG_references.Layer.style.display = "inherit"

        Container.appendChild(createInstructionTitleElem("DURATION AND PAYMENT"))
        Container.appendChild(createTextField(30, 80, 508-2*30,250, "This experiment is expected to last around 30-35 minutes. <br>" +
            "<br>" +
            "Based on your decisions in the last part of the experiment you can earn up to six stars for your performance. " +
            "You will earn a bonus of " + Param.BonusEarnedPerStar.currency_symbol+ Param.BonusEarnedPerStar.bonus_per_star + " per star that you obtain. <br>" ))

        let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
        Button.onclick = function(){
            starting_page_completed()
        }
        Container.appendChild(Button)
    }

    // Basic instructions screen
    let basic_instructions_screen_completed = false
    let basic_instructions_screen_current_box_shown = 1
    let number_of_instruction_boxes = 7

    this.show_basic_instructions_screen = function(){
        hide_all_instruction_pages();

        //Show the instructions layer and the welcome screen
        SVG_references.Layer.style.display = "inherit"
        SVG_references.Pages.Welcome.style.display = "inherit"

        //Check whether or not we need to run through the instructions step-by-step
        if(! basic_instructions_screen_completed){
            //Hide all the action animation boxes. Note that all boxes are labeled in the svg as "instructions_welcome_block(i)x", with i ranging from 1 to 7.
            // Starting at 2, so the first step is already visible
            for(let i = 2; i<=number_of_instruction_boxes;i++){
                document.getElementById("instructions_welcome_block" + i + "x").style.display = "none"
            }
        }else{
            for(let i = 1; i<=number_of_instruction_boxes;i++){
                document.getElementById("instructions_welcome_block" + i + "x").style.display = "inherit"
            }
        }

        //Set the event handler
        document.getElementById("button_instructions_welcome").onclick = function(){basic_instructions_screen_button_pressed()}

    }

    function basic_instructions_screen_button_pressed(){
        if(!basic_instructions_screen_completed){
            //Check if all welcome screen boxes are already visible. If not, then show the next one. If yes, then tell the EC that the instruction page has been completed
            if(basic_instructions_screen_current_box_shown < number_of_instruction_boxes){
                //Increment the counter
                basic_instructions_screen_current_box_shown++

                //Show the next box
                document.getElementById("instructions_welcome_block" + basic_instructions_screen_current_box_shown + "x").style.display = "inherit"

            }else{
                hide_all_instruction_pages()
                basic_instructions_screen_completed = true
                EC.starting_instructions_page_completed("from_basic_instructions_screen")
            }

        }else{
            EC.starting_instructions_page_completed("from_basic_instructions_screen")
        }
    }

    // TRAINING PHASE
    ////////////////////
    // Exploration
    let TrainingStimuli, CurrentTrialHints

    this.showExplorationInstructions = function(TrainingStim){
        TrainingStimuli = TrainingStim
        showExplorationPage()
    }

    function showExplorationPage(){
        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVG_references.Layer.style.display = "inherit"
        SVG_references.Pages.Exploration.style.display = "inherit"

        //Set the correct state for the button.
        current_instructions_state = "welcome"

        // Show the title and text
        let Page = SVG_references.Pages.Exploration

        //Clear all the previous elements
        deleteClassNamesFromElement(Page, "instruction_title")
        deleteClassNamesFromElement(Page, "basic_instructions_text")
        deleteClassNamesFromElement(Page, "instructions_button")

        Page.appendChild(createInstructionTitleElem(Instructions.Training_Phase.Exploration.title))
        Page.appendChild(createTextField(10, 29, 508-2*10,200, Instructions.Training_Phase.Exploration.text_top))
        let BottomText = createTextField(40, 210, 508-2*40,100, Instructions.Training_Phase.Exploration.text_bottom)
        BottomText.style.textAlign = "center"
        BottomText.style.fontStyle = "italic"
        Page.appendChild(BottomText)

        //Showing the progress
        showExplorationPhaseProgressPage()

        //Creating the buttons at the bottom of the page
        let InstructionsButton = createSVGButtonElem(40,250,150,22,"Instructions")
        let ContinueButton = createSVGButtonElem(320,250,150,22,"Continue")
        Page.appendChild(InstructionsButton)
        Page.appendChild(ContinueButton)

        //Set the event handlers for the two buttons. Continue should go to the map, Instructions should go to the welcome page.
        ContinueButton.onclick = block_instructions_page_closed
        InstructionsButton.onclick = that.show_basic_instructions_screen
    }

    function block_instructions_page_closed(){
        hide_all_instruction_pages();
        SVG_references.Layer.style.display = "none"
        EC.block_instructions_page_closed()
    }

    //Call to show all the to-be-found location names and Fennimal icons during the exploration phase. Assumes that the exploration phase has already been started.
    function showExplorationPhaseProgressPage(){
        //Setting the correct text and state for the locations. These are assumed to be provided as an object with one key for each location.
        // If the value of this key is false, then the location has not yet been found. Any other values indicates that the location has been visited.
        let All_Locations = Param.Available_Location_Names

        for(let i = 0; i<All_Locations.length;i++){
            let location = All_Locations[i]
            //All locations are labeled as instructions_exploration_target_location_ix, with i ranging from 1 to 16
            let Box = document.getElementById("instructions_exploration_target_location_" + (i+1) + "x")
            Box.style.display = "inherit"

            //Setting the correct text
            Box.getElementsByTagName("text")[0].childNodes[0].innerHTML = Param.SubjectFacingLocationNames[location]

            //let region_color = Param.RegionData[Param.LocationTransitionData["location_"+keys[i]].region].color
            let region_color_light = Param.RegionData[Param.LocationTransitionData["location_"+location].region].lighter_color
            let region_color_dark = Param.RegionData[Param.LocationTransitionData["location_"+location].region].darker_color

            //Setting the visible state of the elements
            if(Worldstate.check_if_location_visited(location) === false){
                //Target has not been found
                Box.getElementsByTagName("path")[0].style.opacity = 0
                Box.getElementsByTagName("rect")[0].style.fill = region_color_light + "44"
                Box.getElementsByTagName("text")[0].childNodes[0].style.fill = region_color_dark + "55"
            }else{
                //Target has been found
                Box.getElementsByTagName("path")[0].style.opacity = 1
                Box.getElementsByTagName("rect")[0].style.fill = region_color_light
                Box.getElementsByTagName("text")[0].childNodes[0].style.fill = region_color_dark
            }

        }

        //Setting the Fennimal icons.
        // Deleting any previous outlines, if they exist
        if (document.contains(document.getElementById("Exploration_Icons"))) {
            document.getElementById("Exploration_Icons").remove();
        }

        let Page = SVG_references.Pages.Exploration
        let IconsContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        IconsContainer.id = "Exploration_Icons"
        Page.appendChild(IconsContainer)

        // Here we hardcode the x and y positions on the screen. Messy but easy
        let Positions = [
            {x:250,y:91},
            {x:250,y:143},
            {x:330,y:91},
            {x:330,y:143},
            {x:405,y:91},
            {x:405,y:143}]

        for(let i =0; i<TrainingStimuli.length; i++){
            let Fennimal = TrainingStimuli[i]

            //Get the box containing the outline and name
            let Box = document.getElementById("instructions_exploration_target_Fennimal_" + (i+1) + "x")
            Box.style.display = "inherit"

            //Set the name
            Box.getElementsByTagName("text")[0].childNodes[0].innerHTML = Fennimal.name

            //Finding the correct colors
            let region_color_light = Param.RegionData[Fennimal.region].lighter_color
            let region_color_dark = Param.RegionData[Fennimal.region].darker_color

            //Setting the visible state of the box elements (based on whether the Fennimal has already been found
            let fennimal_found = Worldstate.check_if_location_visited(Fennimal.location) === "completed"
            if(fennimal_found){
                Box.getElementsByTagName("path")[0].style.opacity = 1
                Box.getElementsByTagName("rect")[0].style.fill = region_color_light + "66"
                Box.getElementsByTagName("text")[0].childNodes[0].style.fill = region_color_dark
            }else{
                //Fennimal has not been found
                Box.getElementsByTagName("path")[0].style.opacity = 0
                Box.getElementsByTagName("rect")[0].style.fill = region_color_light + "33"
                Box.getElementsByTagName("text")[0].childNodes[0].style.fill = region_color_dark + "55"
            }

            //Creating the icon. If the Fennimal has not been found, this should be an outline. Otherwise color the Fennimal
            let IconObj
            if(! fennimal_found){
                IconObj = createFennimalIcon(Fennimal, Positions[i].x, Positions[i].y, 0.195, !fennimal_found, false)
                IconObj.style.opacity = 0.4
            }else{
                IconObj = createFennimalIcon(Fennimal, Positions[i].x, Positions[i].y, 0.18, !fennimal_found, false)
            }
            IconsContainer.appendChild(IconObj)

        }

    }

    // TARGETTED SEARCH
    let CurrentTrial, current_hint_type

    this.showSearchInstructions = function(Fennimal, hint_type){
        CurrentTrial = Fennimal
        current_hint_type = hint_type

        //Set the correct state for the button.
        current_instructions_state = "search"
        showSearchPage()
    }
    function showSearchPage(){
        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVG_references.Layer.style.display = "inherit"
        SVG_references.Pages.Search.style.display = "inherit"

        //Clear all the previous elements
        let Page = SVG_references.Pages.Search
        deleteClassNamesFromElement(Page, "instruction_title")
        deleteClassNamesFromElement(Page, "basic_instructions_text")
        deleteClassNamesFromElement(Page, "instructions_button")
        deleteClassNamesFromElement(Page, "Fennimal_Icon")

        //Show title and text
        Page.appendChild(createInstructionTitleElem(Instructions.Training_Phase.Search.title))
        Page.appendChild(createTextField(30, 40, 508-2*30,200, Instructions.Training_Phase.Search.text))

        if(current_hint_type === "icon"){
            Page.appendChild(createFennimalIcon(CurrentTrial,150, 120,0.4,false, ! Param.show_colors_with_icon_hints))
        }
        if(current_hint_type === "name"){
            let HintText = createTextField((508/2)-25, 130, 50,40, "<b> Hint: </b>")
            HintText.style.textAlign = "center"
            Page.appendChild(HintText)


            let NameText
            if(Param.get_used_unique_names().includes(CurrentTrial.name) ){
                NameText = createTextField((508/2)-125, 150, 250,55, "This Fennimal is named " + CurrentTrial.name)
            }else{
                NameText = createTextField((508/2)-125, 150, 250,55, "This Fennimal is a " + CurrentTrial.name)
            }

            NameText.style.fontSize = "20px"
            NameText.style.textAlign = "center"
            Page.appendChild(NameText)
        }
        if(current_hint_type === "location"){
            let HintText = createTextField((508/2)-25, 130, 50,40, "<b> Hint: </b>")
            HintText.style.textAlign = "center"
            Page.appendChild(HintText)
            let NameText = createTextField((508/2)-125, 150, 250,55,"This Fennimal lives at " + Param.SubjectFacingLocationNames[CurrentTrial.location])
            NameText.style.fontSize = "20px"
            NameText.style.textAlign = "center"
            Page.appendChild(NameText)
        }

        //Creating the buttons at the bottom of the page
        let InstructionsButton = createSVGButtonElem(40,250,150,22,"Instructions")
        let ContinueButton = createSVGButtonElem(320,250,150,22,"Continue")
        Page.appendChild(InstructionsButton)
        Page.appendChild(ContinueButton)

        ContinueButton.onclick = function(){
            block_instructions_page_closed()
        }
        InstructionsButton.onclick = that.show_basic_instructions_screen

    }

    // Creates and returns a miniature outline of a Fennimal.
    function createFennimalIcon(Fennimal, x, y, scale, outline_only, use_gray_color_scheme){
        let IconObj
        if(outline_only){
            IconObj = createFennimalOutline(Fennimal.head,Fennimal.body, false)
        }else{
            if(!use_gray_color_scheme){
                IconObj = createFennimal(Fennimal)
            }else{
                let NewFennimal = JSON.parse(JSON.stringify(Fennimal))
                NewFennimal.head_color_scheme = Param.GrayColorScheme
                NewFennimal.body_color_scheme = Param.GrayColorScheme
                IconObj = createFennimal(NewFennimal)
            }
        }

        IconObj.style.transform = "scale(" + scale + ")"
        let OutlineMoveContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        OutlineMoveContainer.appendChild(IconObj)
        OutlineMoveContainer.style.transform = "translate(" + x + "px," + y +"px)"
        OutlineMoveContainer.classList.add("Fennimal_Icon")
        return(OutlineMoveContainer)
    }

    // ITEM DELIVERY
    //Subcontroller and variables for the backpack item selection
    let ItemDetails, BackpackItemButtonControllers, delivery_text_updated = false
    let current_item_in_backpack = false

    BackpackItemButtonController = function(item_name, position, backgroundcolor, xpos,  InstrCon){
        //Get the correct SVG references
        let SVG_Element = document.getElementById("instructions_delivery_icon_" + item_name)
        let SVG_Box = SVG_Element.getElementsByClassName("instructions_delivery_icon_box")[0]
        let Container = document.getElementById("instructions_delivery_item_box")

        SVG_Element.style.cursor = "pointer"

        //Set the correct outline highlights
        SVG_Box.classList.add("shimmered_outline")

        //Get the correct x and y pos on the item bar
        let item_bar_x = parseFloat(Container.getAttribute("x")) + 5// - 20
        let item_bar_width = parseFloat(Container.getAttribute("width")) - 10  // + 40
        let item_bar_y = parseFloat(Container.getAttribute("y"))
        let item_bar_height = parseFloat(Container.getAttribute("height"))

        //Translate the icon to the right position on the item bar
        MoveElemToCoords(SVG_Element,item_bar_x + xpos*item_bar_width,item_bar_y + 0.5 * item_bar_height)

        //Call if the button has been selected (true) or if another item has been selected (false)
        let current_button_state
        function toggleButtonHighlighted(bool){
            if(bool){
                //Set the correct color to the background rect
                SVG_Box.style.fill = backgroundcolor
            }else{
                //Set the correct color to the background rect
                SVG_Box.style.fill = "lightgray"
            }
        }

        //Add an eventlistener to the element
        SVG_Element.onclick = function(){
            InstrCon.delivery_page_item_selected(item_name, backgroundcolor)
        }

        //On construction
        toggleButtonHighlighted(true)

        //Call when an item has been selected. If this is the correct item, then it will be higlighted. If not, then is will be de-emphasized
        this.item_has_been_selected = function(selected_item_name){
            toggleButtonHighlighted(selected_item_name === item_name)
        }


    }

    this.delivery_page_item_selected = function(selected_item_name, color){
        current_item_in_backpack = selected_item_name

        //Highlight the selected button
        for(let i =0; i<BackpackItemButtonControllers.length;i++){
            BackpackItemButtonControllers[i].item_has_been_selected(selected_item_name)
        }

        //Set the correct text
        document.getElementById("instructions_delivery_item_selected_text").childNodes[0].innerHTML = "You have selected to take the " + selected_item_name + " with you"

        //Tell the EC
        EC.backpack_item_selected(selected_item_name, color)

        //Show the continue button
        document.getElementById("DeliveryContinueButton").style.display = "inherit"

    }
    this.showDeliveryInstructions = function(Fennimal, hint_type, _ItemDetails, negative_valenced_items_encountered){
        CurrentTrial = Fennimal
        current_hint_type = hint_type
        ItemDetails = _ItemDetails

        //Set the correct state for the button.
        current_instructions_state = "delivery"
        //If negative items are allowed, then we need to slighly modify the instructions
        if(!delivery_text_updated){
            if(negative_valenced_items_encountered){
                Instructions.Training_Phase.Delivery.text = Instructions.Training_Phase.Delivery.text + " (this could be a toy that the Fennimal did not like!)"
            }else{
                Instructions.Training_Phase.Delivery.text = Instructions.Training_Phase.Delivery.text + "<br><br>If you pick the wrong toy, you can come back to Home to pick a different one. You can select which toy to bring by clicking on the icons below."
            }
            delivery_text_updated = true
        }
        showDeliveryPage()
    }
    this.reset_backpack_menu = function(){
        current_item_in_backpack = false;
        showDeliveryPage()

        //Hide the continue button
        document.getElementById("DeliveryContinueButton").style.display = "none"
    }
    function showDeliveryPage(){
        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVG_references.Layer.style.display = "inherit"
        SVG_references.Hint_and_pack_item_boxes.style.display = "inherit"

        //Clear all the previous elements
        let Page = SVG_references.Hint_and_pack_item_boxes
        deleteClassNamesFromElement(Page, "instruction_title")
        deleteClassNamesFromElement(Page, "basic_instructions_text")
        deleteClassNamesFromElement(Page, "instructions_button")
        deleteClassNamesFromElement(Page, "Fennimal_Icon")

        //Show title and text
        Page.appendChild(createInstructionTitleElem(Instructions.Training_Phase.Delivery.title))
        Page.appendChild(createTextField(15, 35, 508-2*15,200, Instructions.Training_Phase.Delivery.text))

        //Show the correct hint
        if(current_hint_type === "icon"){
            Page.appendChild(createFennimalIcon(CurrentTrial,-38, 120,0.47,false, ! Param.show_colors_with_icon_hints))
        }
        if(current_hint_type === "name"){
            let NameText
            if(Param.get_used_unique_names().includes(CurrentTrial.name) ){
                NameText = createTextField(22, 140, 125,90, "This Fennimal is named <br> " + CurrentTrial.name)
            }else{
                NameText = createTextField(22, 140, 125,90, "This Fennimal is a <br> " + CurrentTrial.name)
            }

            NameText.style.fontSize = "20px"
            NameText.style.textAlign = "center"
            Page.appendChild(NameText)
        }
        if(current_hint_type === "location"){
            let NameText = createTextField(22, 140, 125,90, "This Fennimal lives at <br> " + Param.SubjectFacingLocationNames[CurrentTrial.location])
            NameText.style.fontSize = "20px"
            NameText.style.textAlign = "center"
            Page.appendChild(NameText)
        }

        //Creating the buttons at the bottom of the page
        let InstructionsButton = createSVGButtonElem(40,250,150,22,"Instructions")
        let ContinueButton = createSVGButtonElem(320,250,150,22,"Continue")
        Page.appendChild(InstructionsButton)
        Page.appendChild(ContinueButton)

        //Set the event handlers for the two buttons. Continue should go to the map, Instructions should go to the welcome page.
        ContinueButton.onclick = block_instructions_page_closed
        InstructionsButton.onclick = that.show_basic_instructions_screen

        //Set the text to indicate that no item has been selected thus far
        document.getElementById("instructions_delivery_item_selected_text").childNodes[0].innerHTML = "Click to select one of the available items"

        //Hide the continue button until one item has been selected
        ContinueButton.id = "DeliveryContinueButton"
        ContinueButton.style.display = "none"

        //Create controllers for all of the items
        BackpackItemButtonControllers = []
        for(let i = 0;i<ItemDetails.All_Items.length; i++){
            let xpos = Param.ItemRelativeXPositions[ItemDetails.All_Items.length][i]

            BackpackItemButtonControllers.push( new BackpackItemButtonController(ItemDetails.All_Items[i], i, ItemDetails[ItemDetails.All_Items[i]].backgroundColor, xpos, that))
        }

        //If an item has already been selected (which can happen if we come from the instructions page, or from the map), then show this item being selected
        if(current_item_in_backpack !== false){
            that.delivery_page_item_selected(current_item_in_backpack, false)
        }


    }
    //Resets the delivery page to its default state (no item selected)
    this.empty_backpack = function(){
        current_item_in_backpack = false

    }

    //QUIZ
    /////////
    let quiz_first_attempt = true
    this.show_quiz_block_instructions = function(repeat_until_perfect, array_of_observed_outcomes){
        hide_all_instruction_pages()
        showNewInstructionsPage()
        SVG_references.Layer.style.display = "inherit"

        let negative_outcomes_observed = (array_of_observed_outcomes.includes("frown") || array_of_observed_outcomes.includes("bites") )

        let title_text, instruction_text
        if( quiz_first_attempt){
            title_text = Instructions.Training_Phase.Quiz.title_first_attempt
            instruction_text = Instructions.Training_Phase.Quiz.first_quiz_start + Instructions.Training_Phase.Quiz.basic_instructions
            if(negative_outcomes_observed){
                instruction_text = instruction_text + Instructions.Training_Phase.Quiz.basic_instructions_negative
            }
            instruction_text = instruction_text + "<br><br>"

            if(repeat_until_perfect){
                instruction_text = instruction_text + Instructions.Training_Phase.Quiz.insert_repeat_until_perfect
            }
            instruction_text = instruction_text + Instructions.Training_Phase.Quiz.quiz_closer_text
        }else{
            title_text = Instructions.Training_Phase.Quiz.title_additional_attempts
            instruction_text = Instructions.Training_Phase.Quiz.additional_quiz_attempt_text + Instructions.Training_Phase.Quiz.basic_instructions
            if(negative_outcomes_observed){
                instruction_text = instruction_text + Instructions.Training_Phase.Quiz.basic_instructions_negative
            }
            instruction_text = instruction_text + "<br><br>"
            if(repeat_until_perfect)
            {
                instruction_text = instruction_text + Instructions.Training_Phase.Quiz.insert_repeat_until_perfect
            }
            instruction_text = instruction_text + Instructions.Training_Phase.Quiz.quiz_closer_text
        }

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem(title_text))

        let TextField = createTextField(30, 35, 508-2*30,200, instruction_text)
        TextField.style.fontSize = "12px"
        TextField.style.textAlign = "left"
        Container.appendChild(TextField)

        let Button = createSVGButtonElem((508-150)/2,230,150,30,"START QUIZ")
        Container.appendChild(Button)
        Button.onclick = block_instructions_page_closed
    }
    this.quiz_has_been_failed = function(){
        quiz_first_attempt = false
    }

    //CARD QUIZ
    ///////////////
    let CurrentQuizCardFennimal // Check if needed
    this.show_cardquiz_instructions = function(){
        hide_all_instruction_pages()
        showNewInstructionsPage()
        SVG_references.Layer.style.display = "inherit"


        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem("Time for a quiz!"))

        let TextField = createTextField(30, 35, 508-2*30,200, "Well done, Trainee! You're well on your way to becoming an Expert Wildlife Ranger. " +
            "Before we continue, we will first give you a quiz to review what you've learned so far. <br>" +
            "<br>" +
            "The quiz will consist of multiple pages, each containing a few questions. You can select an answer to each question from the drop-down menu next to the question. If you make any mistakes on a page, then this page will come back up again later. The quiz is finished once you have successfully answered all the questions on all the pages." +
            "<br><br>" +
            "<b>Tip: </b>if your memory needs some refreshing, you can freely travel across the island to take another look at all the Fennimals you have so far encountered. You can do this by clicking on the 'Go to map' button and travelling to the location of each Fennimal. <br>" +
            "")
        TextField.style.fontSize = "12px"
        TextField.style.textAlign = "left"
        Container.appendChild(TextField)

        let Button = createSVGButtonElem((508-150)/2,230,150,30,"START QUIZ")
        Container.appendChild(Button)
        Button.onclick = function(){ExpCont.quiz_card_instructions_completed()}

    }
    this.create_cardquiz_card_Fennimal = function(FennimalObj, array_of_all_locations, array_of_all_names, array_of_all_items, array_of_valences){
        //Keeping track of which questions still need to be answered
        let Questions_To_Be_answered = ["name", "location", "toy"]
        CurrentQuizCardFennimal = FennimalObj
        let MapButton, CheckButton, ContinueButton
        let checked_map = false

        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVG_references.Layer.style.display = "inherit"
        SVG_references.Pages.CardQuiz.style.display = "inherit"
        document.getElementById("card_Fennimal").style.display = "inherit"
        document.getElementById("card_location").style.display = "none"

        //Clear all the previous elements
        let Page = SVG_references.Pages.CardQuiz
        deleteClassNamesFromElement(Page, "instruction_title")
        deleteClassNamesFromElement(Page, "basic_instructions_text")
        deleteClassNamesFromElement(Page, "instructions_button")
        deleteClassNamesFromElement(Page, "Fennimal_Icon")

        //Set the title
        Page.appendChild(createInstructionTitleElem("Questions about a Fennimal"))
        Page.appendChild(createTextField(15, 35, 508 - 2*15,30, "Please answer the questions below. <b>Tip:</b> When in doubt, you can freely go to the map to visit the Fennimals."))

        //Show the icon
        Page.appendChild(createFennimalIcon(FennimalObj,-58, 58,0.52,false, ! Param.show_colors_with_icon_hints))

        //Some parameters for all the answer boxes
        let box_x = 320
        let box_w = 160
        let box_h = 20

        //Adding the dropdown box for the name question
        let NameContainer = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
        NameContainer.setAttribute("x", box_x)
        NameContainer.setAttribute("y", 71)
        NameContainer.setAttribute("width", box_w)
        NameContainer.setAttribute("height", box_h)
        NameContainer.classList.add("cardquiz_box")
        Page.appendChild(NameContainer)

        //Adding the elements
        let NameList = document.createElement("select");
        NameContainer.appendChild(NameList)
        for(let namenum in array_of_all_names){
            let option = document.createElement("option");
            option.value = array_of_all_names[namenum]
            option.text = array_of_all_names[namenum]
            NameList.appendChild(option)
        }
        //Adding a hidden default
        NameList.value = ""

        //Adding the location question
        let LocationContainer = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
        LocationContainer.setAttribute("x", box_x)
        LocationContainer.setAttribute("y", 101)
        LocationContainer.setAttribute("width", box_w)
        LocationContainer.setAttribute("height", box_h)
        LocationContainer.classList.add("cardquiz_box")
        Page.appendChild(LocationContainer)

        //Adding the elements
        let LocList = document.createElement("select");
        LocationContainer.appendChild(LocList)
        for(let locnum in array_of_all_locations){
            let option = document.createElement("option");
            option.value = array_of_all_locations[locnum]
            option.text = Param.SubjectFacingLocationNames[array_of_all_locations[locnum]]
            LocList.appendChild(option)
        }
        //Adding a hidden default
        LocList.value = ""

        //Adding the toy question
        let ToyContainer = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
        ToyContainer.setAttribute("x", box_x)
        ToyContainer.setAttribute("y", 131)
        ToyContainer.setAttribute("width", box_w)
        ToyContainer.setAttribute("height", box_h)
        ToyContainer.classList.add("cardquiz_box")
        Page.appendChild(ToyContainer)

        //Adding the elements
        let ToyList = document.createElement("select");
        ToyContainer.appendChild(ToyList)
        for(let toynum in array_of_all_items){
            let option = document.createElement("option");
            option.value =array_of_all_items[toynum]
            option.text = "The "+ array_of_all_items[toynum]
            ToyList.appendChild(option)
        }
        //Adding a hidden default
        ToyList.value = ""

        //Setting event listeners for the selects
        function question_answered(question){
            Questions_To_Be_answered = Questions_To_Be_answered.filter(function(e) { return e !== question })
            if(Questions_To_Be_answered.length === 0){
                CheckButton.style.display = "inherit"
            }

        }
        NameList.onchange = function(){question_answered("name")}
        LocList.onchange = function(){question_answered("location")}
        ToyList.onchange = function(){question_answered("toy")}

        //Optionally adding the valence question
        let ValenceList
        if(array_of_valences !== false){
            Questions_To_Be_answered.push("valence")
            let ValenceContainer = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
            ValenceContainer.setAttribute("x", box_x)
            ValenceContainer.setAttribute("y", 161)
            ValenceContainer.setAttribute("width", box_w)
            ValenceContainer.setAttribute("height", box_h)
            ValenceContainer.classList.add("cardquiz_box")
            Page.appendChild(ValenceContainer)

            //Adding the elements
            let ValenceDisplayTexts = {
                bites: "Hated it",
                frown: "Did not like it",
                neutral: "Was indifferent",
                smiley: "Liked it",
                heart: "Loved it"
            }
            ValenceList = document.createElement("select");
            ValenceContainer.appendChild(ValenceList)
            for(let valnum in array_of_valences){
                let option = document.createElement("option");
                option.value = array_of_valences[valnum]
                option.text = ValenceDisplayTexts[array_of_valences[valnum]]
                ValenceList.appendChild(option)
            }
            //Adding a hidden default
            ValenceList.value = ""

            //Adding eventlistener
            ValenceList.onchange = function(){question_answered("valence")}

        }else{
            //Hide the valence box
            document.getElementById("cardquiz_valence").style.display = "none"
        }

        //Adding the two buttons: one to check the results and one to go to the map to recheck the Fennimals
        MapButton = createSVGButtonElem(40,250,150,22,"Go to map")
        CheckButton = createSVGButtonElem(320,250,150,22,"Check answers")
        ContinueButton = createSVGButtonElem(0.5*508 - 75,250,150,22,"Continue")
        Page.appendChild(MapButton)
        Page.appendChild(CheckButton)
        Page.appendChild(ContinueButton)
        CheckButton.style.display = "none"
        ContinueButton.style.display = "none"

        //Set the event handlers for the two buttons.
        let Errors = []
        CheckButton.onclick = function(){
            CheckButton.style.display = "none"
            MapButton.style.display = "none"

            if(NameList.value !== FennimalObj.name){
                Errors.push("name")
                NameList.style.backgroundColor = "#f2d0d0"
                NameList.style.color = "#B22222"
            }
            if(LocList.value !== FennimalObj.location){
                Errors.push("location")
                LocList.style.backgroundColor = "#f2d0d0"
                LocList.style.color = "#B22222"
            }
            if(ToyList.value !== FennimalObj.special_item){
                Errors.push("toy")
                ToyList.style.backgroundColor = "#f2d0d0"
                ToyList.style.color = "#B22222"
            }

            NameList.disabled = true
            LocList.disabled = true
            ToyList.disabled = true

            if(array_of_valences !== false){
                ValenceList.disabled = true
                if(ValenceList.value !== FennimalObj.ItemResponses[FennimalObj.special_item]){
                    Errors.push("valence")
                    ValenceList.style.backgroundColor = "#f2d0d0"
                    ValenceList.style.color = "#B22222"
                }
            }

            let TextField
            if(Errors.length === 0){
                TextField = createTextField((0.5*508-150),200 , 300,50, "Perfect!")
                TextField.style.color = "green"

            }else{
                let text = "Oops, you've made a mistake!"
                if(Errors.length > 1){text = "Oops, you've made multiple mistakes!"}
                TextField = createTextField((0.5*508-250),200 , 500,50, text)
                TextField.style.color = "#B22222"
            }
            TextField.style.fontSize = "25px"
            TextField.style.fontWeight = "bold"
            TextField.style.textAlign = "center"

            Page.appendChild(TextField)
            ContinueButton.style.display = "inherit"


        }
        MapButton.onclick = function(){
            checked_map = true
            block_instructions_page_closed()
        }
        ContinueButton.onclick = function(){
            clear_quizcard()
            ExpCont.quiz_card_answered(Errors, checked_map)
        }


    }
    this.create_cardquiz_card_location= function(FennimalObj, array_of_all_locations, array_of_all_names, array_of_all_items, array_of_valences){
        //Keeping track of which questions still need to be answered
        let Questions_To_Be_answered = ["name", "toy"]
        CurrentQuizCardFennimal = FennimalObj
        let MapButton, CheckButton, ContinueButton
        let checked_map = false

        //Show only the correct page (and the layer)
        hide_all_instruction_pages()
        SVG_references.Layer.style.display = "inherit"
        SVG_references.Pages.CardQuiz.style.display = "inherit"
        document.getElementById("card_Fennimal").style.display = "none"
        document.getElementById("card_location").style.display = "inherit"


        //Clear all the previous elements
        let Page = SVG_references.Pages.CardQuiz
        deleteClassNamesFromElement(Page, "instruction_title")
        deleteClassNamesFromElement(Page, "basic_instructions_text")
        deleteClassNamesFromElement(Page, "instructions_button")
        deleteClassNamesFromElement(Page, "Fennimal_Icon")

        //Set the title
        Page.appendChild(createInstructionTitleElem("Questions about a location"))
        Page.appendChild(createTextField(15, 35, 508 - 2*15,30, "Please answer the questions below.  <b>Tip: </b>When in doubt, you can freely go to the map to visit the Fennimals."))

        //Add the location text
        let QuestionText = createTextField(155, 62, 300,30, Param.SubjectFacingLocationNames[FennimalObj.location])
        QuestionText.style.fontSize = "20px"
        QuestionText.style.fontWeight = "bold"
        Page.appendChild(QuestionText)

        //Some parameters for all the answer boxes
        let box_x = 270
        let box_w = 160
        let box_h = 20

        //Adding the dropdown box for the name question
        let NameContainer = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
        NameContainer.setAttribute("x", box_x)
        NameContainer.setAttribute("y", 101)
        NameContainer.setAttribute("width", box_w)
        NameContainer.setAttribute("height", box_h)
        NameContainer.classList.add("cardquiz_box")
        Page.appendChild(NameContainer)

        //Adding the elements
        let NameList = document.createElement("select");
        NameContainer.appendChild(NameList)
        for(let namenum in array_of_all_names){
            let option = document.createElement("option");
            option.value = array_of_all_names[namenum]
            option.text = array_of_all_names[namenum]
            NameList.appendChild(option)
        }
        //Adding a hidden default
        NameList.value = ""

        //Adding the toy question
        let ToyContainer = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
        ToyContainer.setAttribute("x", box_x)
        ToyContainer.setAttribute("y", 129)
        ToyContainer.setAttribute("width", box_w)
        ToyContainer.setAttribute("height", box_h)
        ToyContainer.classList.add("cardquiz_box")
        Page.appendChild(ToyContainer)

        //Adding the elements
        let ToyList = document.createElement("select");
        ToyContainer.appendChild(ToyList)
        for(let toynum in array_of_all_items){
            let option = document.createElement("option");
            option.value =array_of_all_items[toynum]
            option.text = "The "+ array_of_all_items[toynum]
            ToyList.appendChild(option)
        }
        //Adding a hidden default
        ToyList.value = ""

        //Setting event listeners for the selects
        function question_answered(question){
            Questions_To_Be_answered = Questions_To_Be_answered.filter(function(e) { return e !== question })
            if(Questions_To_Be_answered.length === 0){
                CheckButton.style.display = "inherit"
            }

        }
        NameList.onchange = function(){question_answered("name")}
        ToyList.onchange = function(){question_answered("toy")}

        //Optionally adding the valence question
        let ValenceList
        if(array_of_valences !== false){
            Questions_To_Be_answered.push("valence")
            let ValenceContainer = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
            ValenceContainer.setAttribute("x", box_x)
            ValenceContainer.setAttribute("y", 159)
            ValenceContainer.setAttribute("width", box_w)
            ValenceContainer.setAttribute("height", box_h)
            ValenceContainer.classList.add("cardquiz_box")
            Page.appendChild(ValenceContainer)

            //Adding the elements
            let ValenceDisplayTexts = {
                bites: "Hated it",
                frown: "Did not like it",
                neutral: "Was indifferent",
                smiley: "Liked it",
                heart: "Loved it"
            }
            ValenceList = document.createElement("select");
            ValenceContainer.appendChild(ValenceList)
            for(let valnum in array_of_valences){
                let option = document.createElement("option");
                option.value = array_of_valences[valnum]
                option.text = ValenceDisplayTexts[array_of_valences[valnum]]
                ValenceList.appendChild(option)
            }
            //Adding a hidden default
            ValenceList.value = ""

            //Adding eventlistener
            ValenceList.onchange = function(){question_answered("valence")}

        }else{
            //Hide the valence box
            document.getElementById("cardquiz_valence").style.display = "none"
        }

        //Adding the two buttons: one to check the results and one to go to the map to recheck the Fennimals
        MapButton = createSVGButtonElem(40,250,150,22,"Go to map")
        CheckButton = createSVGButtonElem(320,250,150,22,"Check answers")
        ContinueButton = createSVGButtonElem(0.5*508 - 75,250,150,22,"Continue")
        Page.appendChild(MapButton)
        Page.appendChild(CheckButton)
        Page.appendChild(ContinueButton)
        CheckButton.style.display = "none"
        ContinueButton.style.display = "none"

        //Set the event handlers for the two buttons.
        let Errors = []
        CheckButton.onclick = function(){
            CheckButton.style.display = "none"
            MapButton.style.display = "none"

            if(NameList.value !== FennimalObj.name){
                Errors.push("name")
                NameList.style.backgroundColor = "#f2d0d0"
                NameList.style.color = "#B22222"
            }
            if(ToyList.value !== FennimalObj.special_item){
                Errors.push("toy")
                ToyList.style.backgroundColor = "#f2d0d0"
                ToyList.style.color = "#B22222"
            }

            NameList.disabled = true
            ToyList.disabled = true

            if(array_of_valences !== false){
                ValenceList.disabled = true
                if(ValenceList.value !== FennimalObj.ItemResponses[FennimalObj.special_item]){
                    Errors.push("valence")
                    ValenceList.style.backgroundColor = "#f2d0d0"
                    ValenceList.style.color = "#B22222"
                }
            }

            let TextField
            if(Errors.length === 0){
                TextField = createTextField((0.5*508-150),200 , 300,50, "Perfect!")
                TextField.style.color = "green"

            }else{
                let text = "Oops, you've made a mistake!"
                if(Errors.length > 1){text = "Oops, you've made multiple mistakes!"}
                TextField = createTextField((0.5*508-250),200 , 500,50, text)
                TextField.style.color = "#B22222"
            }
            TextField.style.fontSize = "25px"
            TextField.style.fontWeight = "bold"
            TextField.style.textAlign = "center"

            Page.appendChild(TextField)
            ContinueButton.style.display = "inherit"


        }
        MapButton.onclick = function(){
            checked_map = true
            block_instructions_page_closed()
        }
        ContinueButton.onclick = function(){
            clear_quizcard()
            ExpCont.quiz_card_answered(Errors, checked_map)
        }


    }

    //Shows the current quiz card
    this.showCurrentQuizCard = function(){
        SVG_references.Layer.style.display = "inherit"
        SVG_references.Pages.CardQuiz.style.display = "inherit"

    }

    //Deletes the current quiz card
    function clear_quizcard(){
        let Page = SVG_references.Pages.CardQuiz
        deleteClassNamesFromElement(Page, "instruction_title")
        deleteClassNamesFromElement(Page, "basic_instructions_text")
        deleteClassNamesFromElement(Page, "instructions_button")
        deleteClassNamesFromElement(Page, "Fennimal_Icon")
        deleteTagNamesFromElement(Page,"select")
        deleteTagNamesFromElement(Page,"foreignObject")


    }

    //TEST PHASE
    //////////////
    this.show_test_phase_start_instructions = function(total_number_of_test_phase_days, array_of_observed_outcomes){
        hide_all_instruction_pages()
        showNewInstructionsPage()
        SVG_references.Layer.style.display = "inherit"

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem("BASIC TRAINING COMPLETED!"))

        let instruction_text = "Congratulations! You have passed the quiz and now completed your basic training. You're almost an Expert Wildlife ranger, but first you need to complete " + total_number_of_test_phase_days + " days of practical experience. <br>" +
        "<br>" +
        "A new group of Fennimals have recently been spotted all over the island. Your task is to visit these new Fennimals and give them a toy that they may like. You have to rely on your past experience to select toys for these Fennimals. " +
            "<b> As a tip: similar Fennimals like the same toys.  </b> <br><br>" +
            "After you complete your practical experience you will automatically receive the title of Expert. " +
            "In addition, you can earn up to 5 stars, based on how well the Fennimals liked their interactions with you during this practical experience. Therefore, your earnings for this experiment depend on your performance on this part of the task! "

        let TextField = createTextField(30, 35, 508-2*30,200, instruction_text)
        TextField.style.fontSize = "12px"
        TextField.style.textAlign = "left"
        Container.appendChild(TextField)


        let Button = createSVGButtonElem((508-150)/2,230,150,30,"CONTINUE")
        Container.appendChild(Button)
        Button.onclick = function(){
            hide_all_instruction_pages()
            ExpCont.test_phase_starting_instructions_read()}

    }
    this.show_test_phase_block_instructions = function(block_type,Rules,array_of_observed_outcomes, current_day_number, total_number_of_days){
        hide_all_instruction_pages()
        showNewInstructionsPage()
        show_test_phase_instructions_counter(current_day_number, total_number_of_days)
        SVG_references.Layer.style.display = "inherit"

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        Container.appendChild(createBackgroundElem())

        //Figure out if there are negative outcomes in this experiment
        let negative_outcomes_observed = (array_of_observed_outcomes.includes("frown") || array_of_observed_outcomes.includes("bites") )

        let some_items_unavailable = false
        if(typeof Rules.cued_item_allowed !== "undefined"){
            if(! Rules.cued_item_allowed){
                some_items_unavailable = true
            }
        }
        if(typeof Rules.search_item_allowed !== "undefined"){
            if(! Rules.search_item_allowed){
                some_items_unavailable = true
            }
        }

        let hidden_feedback = false
        if(typeof Rules.hidden_feedback !== "undefined"){
            hidden_feedback = Rules.hidden_feedback
        }

        let text = ""

        switch (block_type){
            case("repeat"):
                Container.appendChild(createInstructionTitleElem("Visiting some old friends"));

                text = "The original Fennimals from your training period are starting to miss you. Time to pay a visit to your old friends! " +
                    "Do you still remember which toys these Fennimals liked? <br><br>" +
                    "Visit each of these Fennimals and give them the toy <b>that you've previously given them</b>. "

                if(negative_outcomes_observed){
                    text = text + "(This can be a toy which the Fennimal did not like!)."
                }

                if(some_items_unavailable){
                    text = text + "<br><br>" +
                        "Not all toys may be available. If the toy you want to give a Fennimal is not available, then think back of the other Fennimals you've previously encountered - what toys did they like?"
                }

                text = text + "<br><br>"

                if(hidden_feedback){
                    text = text + "Since you last saw them, these Fennimals have gotten a bit shy. After you give them a toy, they will take the toy to their homes and inspect them there. " +
                        "You will only find out whether they liked the toy at the end of the experiment! <br><br> "
                }
                break;
            case("search"):
                Container.appendChild(createInstructionTitleElem("New Fennimals spotted!"));
                text = "New Fennimals have been spotted on various locations on the island! " +
                    "Visit each of these Fennimals and give them a toy which they may like. " +
                    "You can apply your previously learned knowledge to select a fitting toy for these Fennimals. <br><br>" +
                    "You will <span style='color: green'>earn Stars</span>  if these new Fennimals like the toy you give to them. "

                if(negative_outcomes_observed){
                    text = text + "However, your Star-rating will be <span style='color: firebrick'>decreased </span> if these new Fennimals do not like the toys you give to them. "
                }

                text = text + "<br><br>"

                if(some_items_unavailable){
                    text = text + "Not all toys may be available. If the toy you want to give a Fennimal is not available, then think back of the other Fennimals you've previously encountered - what toys did they like?"
                }

                if(hidden_feedback){
                    text = text + "These new Fennimals are a bit shy. After you give them a toy, they will take the toy to their homes and inspect them there. " +
                        "You will only find out whether they liked the toy at the end of the experiment! <br><br> "
                }
                break;

        }

        //The contents are based on the Rules provided
        let TextField = createTextField(30, 35, 508-2*30,200, text)
        TextField.style.fontSize = "12px"
        TextField.style.textAlign = "left"
        Container.appendChild(TextField)

        let Button = createSVGButtonElem((508-150)/2,230,150,30,"CONTINUE")
        Container.appendChild(Button)
        Button.onclick = function(){
            hide_all_instruction_pages()
            ExpCont.test_phase_block_instructions_read()}
    }
    this.show_test_phase_trial_instructions = function(FennimalObj, block_type, hint_type){
        let Page = SVG_references.Pages.Test_Target
        deleteClassNamesFromElement(Page, "instruction_container")
        showNewInstructionsPage()

        SVG_references.Layer.style.display = "inherit"
        Page.style.display = "inherit"

        let Container = createInstructionContainer()
        Container.appendChild(createInstructionTitleElem("A new Fennimal has been spotted!"))
        Page.appendChild(Container)

        Container.classList.add("instruction_container")
        let TextTop = createTextField((508/2)-200, 50, 400,40, "<b> A Fennimal has been spotted! Please go visit it and give it a toy </b>")
        TextTop.style.textAlign = "center"
        Container.appendChild(TextTop)

        //Setting the hint
        let text
        if(hint_type === "location"){
            if(block_type === "repeat_training"){
                text = "An old friend has been spotted at " + Param.SubjectFacingLocationNames[FennimalObj.location]
                let LocationText = createTextField((508/2)-200, 150, 400,55, text)
                LocationText.style.fontSize = "20px"
                LocationText.style.textAlign = "center"
                Container.appendChild(LocationText)
            }else{
                text = "A new Fennimal has been spotted at " + Param.SubjectFacingLocationNames[FennimalObj.location]
                let LocationText = createTextField((508/2)-200, 150, 400,55, text)
                LocationText.style.fontSize = "20px"
                LocationText.style.textAlign = "center"
                Container.appendChild(LocationText)
            }
        }

        if(hint_type === "icon"){
            Container.appendChild(createFennimalIcon(FennimalObj,150, 120,0.4,false, true))
        }

        let ContinueButton = createSVGButtonElem((508-150)/2,245,150,30,"Go to the map")
        Container.appendChild(ContinueButton)
        ContinueButton.onclick = block_instructions_page_closed

    }

    function show_test_phase_instructions_counter(current_day, total_number_of_days){
        if(total_number_of_days > 10){
            console.error("Too many days to display on top of page. ")
            return false
        }
        SVG_references.Pages.Test.style.display = "inherit"

        //Determines the order of boxes used
        let BoxOrder = {
            1: [5],
            2: [5,6],
            3: [4,5,6],
            4: [4,5,6,7],
            5: [3,4,5,6,7],
            6: [3,4,5,6,7,8],
            7: [2,3,4,5,6,7,8],
            8: [2,3,4,5,6,7,8,9],
            9: [1,2,3,4,5,6,7,8,9],
            10: [1,2,3,4,5,6,7,8,9,10]
        }
        let UsedBoxOrder = BoxOrder[total_number_of_days]

        //Determines the width of the surrounding box based on the number of days
        let box_inner_margin = 7, box_side_screen_margin = 10, xmin = 425, wmin = 30, pagewidth = 508

        // The x-value is based on the x of the first used box
        let FirstBox = document.getElementById("test_phase_day_counter_" + UsedBoxOrder[0] + "_box")
        let x = Number(FirstBox.getAttribute("x"))
        if(x>xmin){x=xmin}

        // The width is the x of the last box, plus its width
        let LastBox = document.getElementById("test_phase_day_counter_" + UsedBoxOrder[UsedBoxOrder.length - 1] + "_box")
        let w = (Number(LastBox.getAttribute("x")) + Number( LastBox.getAttribute("width")) )- x
        if(w<wmin){w=wmin}

        document.getElementById("test_phase_day_display_box").setAttribute("x",x - box_inner_margin)
        document.getElementById("test_phase_day_display_box").setAttribute("width",w + 2 * box_inner_margin)

        //Setting all boxes to invisible
        for(let i = 1; i<11; i++){
            document.getElementById("test_phase_day_counter_" + i + "_text").style.display = "none"
            document.getElementById("test_phase_day_counter_" + i + "_box").style.display = "none"
        }

        //Showing the correct boxes
        for(let boxnum = 0;boxnum<UsedBoxOrder.length; boxnum++){
            let box = UsedBoxOrder[boxnum]
            //Set this box to visible
            document.getElementById("test_phase_day_counter_" + box + "_box").style.display = "inherit"

            if(boxnum + 1 < current_day){
                //Day completed: fill and show the checkmark
                document.getElementById("test_phase_day_counter_" + box + "_text").style.display = "inherit"
                document.getElementById("test_phase_day_counter_" + box + "_box").style.fill = "#daf5da"
                document.getElementById("test_phase_day_counter_" + box + "_box").style.stroke = "#93ad93"
            }else{
                if(boxnum+1 === current_day){
                    //Current day
                    document.getElementById("test_phase_day_counter_" + box + "_box").style.fill = "lightsteelblue"
                    document.getElementById("test_phase_day_counter_" + box + "_box").style.stroke = "#697585"
                }else{
                    //Not yet completed
                    document.getElementById("test_phase_day_counter_" + box + "_box").style.stroke = "#cccccc"
                }

            }
        }

        //Translate the box to the right
        let GroupDims = document.getElementById("test_phase_day_counter").getBBox()
        let highest_x_side = GroupDims.x + GroupDims.width
        let shift_amount = (pagewidth - highest_x_side) - box_side_screen_margin
        document.getElementById("test_phase_day_counter").style.transform = "translate(" + shift_amount + "px, 0)"

    }

    this.show_recall_task = function(){
        show_recall_page()
    }

    //QUESTIONNAIRE
    ////////////////////
    this.show_questionnaire_start_page = function(){
        hide_all_instruction_pages()
        showNewInstructionsPage()
        SVG_references.Layer.style.display = "inherit"

        //Creating the container to hold all elements
        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        Container.appendChild(createBackgroundElem())
        Container.appendChild(createInstructionTitleElem("Almost done!"))

        let instruction_text = "You've now completed the last day of your adventure on Fenneland. We're almost done with the experiment! Before we tell you your score, we want to ask you a few brief questions."

        let TextField = createTextField(30, 75, 508-2*30,200, instruction_text)
        TextField.style.fontSize = "12px"
        TextField.style.textAlign = "left"
        Container.appendChild(TextField)

        let Button = createSVGButtonElem((508-150)/2,230,150,30,"CONTINUE")
        Container.appendChild(Button)
        Button.onclick = function(){
            hide_all_instruction_pages()
            ExpCont.record_questionnaire_response(false, false)}

    }

    this.show_questionnaire_page = function(type){
        hide_all_instruction_pages()

        switch (type){
            case("gender"): show_questionnaire_gender(); break;
            case("age"): show_questionnaire_age(); break;
            case("open"): show_questionnaire_open(); break
            case("colorblindness"): show_questionnaire_colorblindness(); break;
            case("recall"): show_recall_page(); break;
            default: console.warn("INCORRECT QUESTIONNAIRE ITEM REQUESTED, SKIPPING")
                EC.record_questionnaire_response(false,false);
            break
        }
    }

    function show_recall_page(){
        hide_all_instruction_pages()
        showNewInstructionsPage()
        SVG_references.Layer.style.display = "inherit"

        let Page = createInstructionContainer()
        SVG_references.Layer.appendChild(Page)

        //Now we need to hide the map (don't want to provide accidental hints)
        document.getElementById("instructions_mask").style.opacity = 1

        //Retrieving the rules from the expcont
        let Rules = ExpCont.get_recall_question_bonus_rules()

        let errorplural = "s"
        if(Rules.allowed_errors === 1){ errorplural = ""}



        let text = "Today we will switch things up. Do you still remember the names of the Fennimals you encountered during your training period? " +
            "Please list all the names that you remember below <br>" +
            "<br> " +
            "<i>You can enter a name by typing in the box and clicking on the 'Add' button. " +
            "If you made a mistake, you can click on <span style='color:firebrick'> [x] </span> to remove an answer. " +
            "If you think you have listed all names, then you can click on the 'Done' button to continue (you will not be able to return after pressing the button!) <br>" +
            "Each incorrect answer or for each Fennimal that you could not name count as errors." +
            " <b>You will earn a bonus star if you do not make more than " +  Rules.allowed_errors + " error" + errorplural + "</b> " +
            "(Repeated names do not count as errors. The names are not case-sensitve, but watch out for typos!) </i> "

        let TextObj = createTextField(30, 12, 508-2*30,100, text)
        TextObj.style.fontSize = "11px"
        Page.appendChild(TextObj)

        let RBC =  new RecallBoxController(Page, 120, 90, false,true, "I do <span style='color: darkred'> not </span> remember any Fennimals", EC.recall_task_completed)

    }

    function show_questionnaire_gender(){
        hide_all_instruction_pages()
        showNewInstructionsPage()
        SVG_references.Layer.style.display = "inherit"

        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        Container.appendChild(createInstructionTitleElem("What is your gender?"))

        //Creating a button at the end
        let Button_M = createSVGButtonElem(10,125,110,30,"Male")
        let Button_F = createSVGButtonElem(110 + 20 ,125,110,30,"Female")
        let Button_O = createSVGButtonElem(220 + 30 ,125,110,30,"Other")
        let Button_NA = createSVGButtonElem(330 + 40,125,110,30,"Prefer not say")

        //let Button_M = createSVGButtonElem(254 - 80 ,75,160,30,"Male")
        //let Button_F = createSVGButtonElem(254 - 80 ,110,160,30,"Female")
        //let Button_O = createSVGButtonElem(254 - 80 ,145,160,30,"Other")
        //let Button_NA = createSVGButtonElem(254 - 80 ,180,160,30,"Prefer not to say")

        Button_M.onclick = function(){hide_all_instruction_pages(); EC.record_questionnaire_response("gender", "male")}
        Button_F.onclick = function(){hide_all_instruction_pages();EC.record_questionnaire_response("gender", "female")}
        Button_O.onclick = function(){hide_all_instruction_pages();EC.record_questionnaire_response("gender", "other")}
        Button_NA.onclick = function(){hide_all_instruction_pages();EC.record_questionnaire_response("gender", "prefer_not")}


        Container.appendChild(Button_M)
        Container.appendChild(Button_F)
        Container.appendChild(Button_O)
        Container.appendChild(Button_NA)
    }
    function show_questionnaire_age(){
        hide_all_instruction_pages()
        showNewInstructionsPage()
        SVG_references.Layer.style.display = "inherit"

        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        Container.appendChild(createInstructionTitleElem("What is your age?"))
        let Text = createTextField(30, 60, 508-2*30,100, "Please enter your age (in years) in the box below")
        Text.style.textAlign = "center"
        Text.style.fontSize = "20px"
        Container.appendChild(Text)


        let ForObj = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
        ForObj.setAttribute("x", 254-50)
        ForObj.setAttribute("y", 90)
        ForObj.setAttribute("width", 100)
        ForObj.setAttribute("height", 40)
        ForObj.style.padding = "10px"
        Container.appendChild(ForObj)
        /*
        let TextAreaObj = document.createElement('textarea');
        TextAreaObj.cols = 80;
        TextAreaObj.rows = 10;
        TextAreaObj.id = "age_question_area"
        TextAreaObj.classList.add("open_question_area")

        TextBoxContainer.appendChild(TextAreaObj)

         */
        let Input = document.createElement("input")
        Input.type = "number"
        Input.classList.add("open_question_area")
        Input.style.textAlign = "center"
        ForObj.appendChild(Input)


        //Creating a button at the end
        let Button = createSVGButtonElem(254 - 60 ,240,120,30,"Continue")

        Button.onclick = function(){
            hide_all_instruction_pages()
            EC.record_questionnaire_response("age", Input.value)
        }

        Container.appendChild(Button)

    }
    function show_questionnaire_open(){
        let special_name = ExpCont.get_open_question_special_Fennimal_name()
        hide_all_instruction_pages()
        showNewInstructionsPage()
        SVG_references.Layer.style.display = "inherit"

        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        Container.appendChild(createInstructionTitleElem("How did you decide on a toy?"))

        let text = "During the last part of your training to become an Wildlife Ranger, you could freely decide between different toys to give to a Fennimal. How did you decide on which toy to give to the Fennimals?"
        if(special_name !== false){
            if(Param.get_used_unique_names().includes(CurrentTrial.name) ){
                text = "During your practical experience, there were several times that you encountered a Fennimal named <b>" + special_name + "</b>. How did you decide on which toy to give to this Fennimal?"
            }else{
                text = "During your practical experience, there were several times that you encountered a <b>" + special_name + "</b>. How did you decide on which toy to give to this Fennimal?"
            }

        }
        Container.appendChild(createTextField(30, 40, 508-2*30,100, text))

        //Create a text area as a foreign object
        let TextBoxContainer = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
        TextBoxContainer.setAttribute("x", 30)
        TextBoxContainer.setAttribute("y", 85)
        TextBoxContainer.setAttribute("width", 508-2*30)
        TextBoxContainer.setAttribute("height", 140)
        TextBoxContainer.style.padding = "10px"
        Container.appendChild(TextBoxContainer)

        let TextAreaObj = document.createElement('textarea');
        TextAreaObj.cols = 80;
        TextAreaObj.rows = 40;
        TextAreaObj.id = "open_question_area"
        TextAreaObj.classList.add("open_question_area")

        TextBoxContainer.appendChild(TextAreaObj)

        //Creating a button at the end
        let Button = createSVGButtonElem((508-150)/2,245,160,30,"CONTINUE")
        Button.onclick = function(){hide_all_instruction_pages();EC.record_questionnaire_response("open", TextAreaObj.value)}
        Container.appendChild(Button)

    }
    function show_questionnaire_colorblindness(){
        hide_all_instruction_pages()
        showNewInstructionsPage()
        SVG_references.Layer.style.display = "inherit"

        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        Container.appendChild(createInstructionTitleElem("Do you have any form of color blindness?"))

        //Creating a button at the end
        let Button_Yes = createSVGButtonElem((508-410)/2 ,125,120,30,"Yes, I do")
        let Button_No = createSVGButtonElem((508-410)/2 + 150,125,120,30,"No, I don't")
        let Button_IDK = createSVGButtonElem((508-410)/2 + 300,125,120,30,"I don't know")

        Button_Yes.onclick = function(){hide_all_instruction_pages(); EC.record_questionnaire_response("colorblindness", "yes")}
        Button_No.onclick = function(){hide_all_instruction_pages(); EC.record_questionnaire_response("colorblindness", "yes")}
        Button_IDK.onclick = function(){hide_all_instruction_pages(); EC.record_questionnaire_response("colorblindness", "yes")}

        Container.appendChild(Button_Yes)
        Container.appendChild(Button_No)
        Container.appendChild(Button_IDK)
    }

    let ScoreObj
    this.show_payment_screen = function(ScoreObject){
        ScoreObj = ScoreObject
        hide_all_instruction_pages()
        showNewInstructionsPage()
        SVG_references.Layer.style.display = "inherit"


        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        Container.appendChild(createInstructionTitleElem("You are now an Expert Wildlife Ranger!"))

        //Showing the stars (depends on whether a bonus star is in play or not)
        let show_bonus_page = typeof ScoreObject.bonus_star !== "undefined"
        if(show_bonus_page){
            SVG_references.Pages.FinishedBonus.style.display = "inherit"
            //Showing the obtained normal stars
            let bonus_delay_time = 0
            for(let i = 1; i<=5;i++){
                if(ScoreObject.stars_obtained >= i){
                    setTimeout(function(){
                        document.getElementById("score_star_" + i + "x_bonus").classList.add("score_star_achieved")
                        bonus_delay_time = bonus_delay_time + 300
                    }, i*300)
                }
            }

            //After a delay, show the bonus star
            setTimeout(function(){
                if(ScoreObject.bonus_star === 1){
                    document.getElementById("score_star_bonus").classList.add("bonus_star_achieved")
                }
            },bonus_delay_time + 1000)


        }else{
            SVG_references.Pages.Finished.style.display = "inherit"

            //Showing the obtained normal stars
            for(let i = 1; i<=5;i++){
                if(ScoreObject.stars_obtained >= i){
                    setTimeout(function(){
                        document.getElementById("score_star_" + i + "x").classList.add("score_star_achieved")
                    }, i*300)
                }
            }
        }


        let text = "During your practical experience, you: <br><br>"

        let encountered_phases = Object.keys(ScoreObject.Outcomes)
        for(let phasenum = 0; phasenum<encountered_phases.length;phasenum++){
            let phase = encountered_phases[phasenum]
            let number_encounters = ScoreObject.NumberEncountersPerPhase[phase]
            let OutcomesObtained = Object.keys(ScoreObject.Outcomes[phase])
            switch(phase){
                case("test_search"):
                    text = text + "Had " + number_encounters + " encounters with new Fennimals, where you had to predict which toy they would like. "

                    if(OutcomesObtained.length === 1){
                        switch(OutcomesObtained[0]){
                            case("frown"): text = text + "All of these Fennimals <span style='color: firebrick'> disliked </span> the toys you gave to them. "; break
                            case("neutral"): text = text + "All of these Fennimals <span style='color: gray'> were indifferent </span> to the toys you gave to them. "; break
                            case("smile"): text = text + "All of these Fennimals <span style='color: green'> liked </span> the toys you gave to them. "; break
                            case("heart"): text = text + "All of these Fennimals <span style='color: green'> loved </span> the toys you gave to them. "; break
                        }
                    }else{
                        text = text + "Of these interactions, the Fennimals "
                        for(let i = 0; i<OutcomesObtained.length; i++){
                            let outcome = OutcomesObtained[i]
                            let frequency = ScoreObject.Outcomes[phase][outcome]

                            let plural = "s"
                            if(frequency === 1){plural = ""}

                            switch(outcome){
                                case("frown"): text = text + " <span style='color: firebrick'> disliked </span> " + frequency + " toy" + plural; break
                                case("neutral"): text = text + " <span style='color: gray'> were indifferent about </span> " + frequency + " toy" + plural; break
                                case("smile"): text = text + " <span style='color: green'> liked </span> " + frequency + " toy" + plural; break
                                case("heart"): text = text + " <span style='color: green'> loved </span> " + frequency + " toy" + plural; break
                            }

                            if(i === OutcomesObtained.length - 1){
                                text = text + "."
                            }else{
                                if(i === OutcomesObtained.length - 2){
                                    text = text + " and "
                                }else{
                                    text = text + ", "
                                }
                            }

                        }
                    }
                    break
                case("test_repeat"):
                    text = text + "Had " + number_encounters + " encounters with familar Fennimals, where you had to select the toy you previously gave them during your training. "

                    if(OutcomesObtained.length === 1){
                        switch(OutcomesObtained[0]){
                            case("incorrect"): text = text + "You gave all of these Fennimals the <span style='color: firebrick'> incorrect </span> toy. "; break
                            case("correct"): text = text + "You gave all of these Fennimals the <span style='color: green'> correct </span> toy. "; break
                        }
                    }else{
                        text = text + " Here you gave the <span style='color: green'> correct </span> toy to " + ScoreObject.Outcomes[phase].correct + " Fennimals, and the" +
                            "<span style='color: firebrick'> incorrect </span> toy to " + ScoreObject.Outcomes[phase].incorrect + " Fennimals."

                    }

            }
            text = text + "<br>"
        }

        //Adding optional bonus star text.
        if(show_bonus_page){
            let errorplural = "s"
            let onlytext = ""
            if(ScoreObject.bonus_star === 1){ onlytext = "only"}
            if(ScoreObject.bonus_star_errors_made === 1){errorplural=""}
            text = text + "<br>In addition, you " +onlytext +" made " + ScoreObject.bonus_star_errors_made + " error" + errorplural+" when entering the Fennimals' names. "
            if(ScoreObject.bonus_star === 0){
                text = text + "Unfortunately, you therefore did not earn the bonus star."
            }else{
                text = text + "You therefore won the bonus star!"
            }
        }

        text = text + "<br>Based on this performance, you earned the "
        if(ScoreObject.total_stars > 1) { text = text + "distinguished title of "}
        text = text + ScoreObject.total_stars + "-star Fennimal expert!"

        //Set the text to the screen
        Container.appendChild(createTextField(30, 35, 508-2*30,500, text))

        //Modify the position of the stars
        if(show_bonus_page){
            document.getElementById("instructions_finished_bonus").style.transform = "translate(0px,40px)"
        }else{
            document.getElementById("instructions_finished").style.transform = "translate(0px,30px)"
        }
        document.getElementById("instructions_finished").style.transition = "all 500ms ease-in-out"

        //Creating a button at the end
        let Button = createSVGButtonElem((508-150)/2,245,160,30,"Continue")
        Button.onclick = show_completion_code
        Container.appendChild(Button)
    }

    function show_completion_code(){
        hide_all_instruction_pages()
        showNewInstructionsPage()
        //SVG_references.Layer.style.display = "inherit"
        SVG_references.Pages.Finished.style.display = "none"

        let Container = createInstructionContainer()
        SVG_references.Layer.appendChild(Container)
        Container.appendChild(createInstructionTitleElem("Experiment finished!"))

        let text = "You have now completed the experiment. "
        if(ScoreObj.total_stars > 0){
            let plural = "s"
            if(ScoreObj.total_stars === 1) { plural = ""}

            text = text + "Because you obtained " + ScoreObj.total_stars+ " star" + plural + ", you have earned a bonus of " +
                Param.BonusEarnedPerStar.currency_symbol + (Param.BonusEarnedPerStar.bonus_per_star * ScoreObj.total_stars).toFixed(2)
        }

        text = text + "<br><br> Do NOT close or refresh this window before submitting your code to Prolific. Your completion code is: <b> " + ScoreObj.completion_code + " </b>. <br><br>" +
            "After you have submitted this code to Prolific, then press the button below. Do not close this window before clicking the button! Thank you for participating!"


        //Set the text to the screen
        Container.appendChild(createTextField(30, 120, 508-2*30,500, text))

        //Modify the position of the stars
        //document.getElementById("instructions_finished").style.transform = "translate(0px,-70px)"


        //Creating a button at the end
        let Button = createSVGButtonElem((508-150)/2,245,160,30,"Submit experiment")
        Button.onclick = function(){ EC.finish_experiment()}
        Container.appendChild(Button)

    }


    // BASE INSTRUCTION ELEMENTS
    //Clears all elements with a class-name marked_for_deletion
    function cull_the_marked(){
        let The_Damned = document.getElementsByClassName("marked_for_deletion")
        while(The_Damned.length > 0){
            The_Damned[0].parentNode.removeChild(The_Damned[0])
        }
    }

    //Resets the instructions page
    function showNewInstructionsPage(){
        //Hide all pages
        hide_all_instruction_pages()
        cull_the_marked();

        //Show the instructions layer
        SVG_references.Layer.style.display = "inherit"

    }






}

//Todo: for the repeat question, modify the output criteria and the dimensions. Previous defaults: ypos = 110, height = 120
RecallBoxController = function(Page, ypos, answer_box_height,allow_empty_input,add_checkbox_no_answer, checkbox_no_answer_text, returnfunc){
    let StartTime = Date.now()
    let Dims = {
        Field: {
            x: 50,
            y: ypos,
            h: answer_box_height,
            w: 408
        },
        Answer: {
            min_w: 50,
            max_w: 200,
            h: 20
        },
        InputLine: {
            x: 52,
            y: 238,
            h:30,
            w:155,

        },
        InputButton: {
            x: 200,
            y: 240,
            h:22,
            w:50
        },
        ContinueButton: {
            x: 350,
            y: 240,
            h:22,
            w:100
        },
        No_Answer_Checkbox : {
            x: 50,
            y: 250,
            h: 25,
            w: 408
        }

    }
    let max_input_length  = 30

    //Setting the y values for the input line and buttons
    Dims.InputLine.y = ypos + Dims.Field.h + 4
    Dims.InputButton.y = ypos + Dims.Field.h + 5
    Dims.ContinueButton.y = ypos + Dims.Field.h + 5
    Dims.No_Answer_Checkbox.y = Dims.ContinueButton.y + Dims.ContinueButton.h + 5

    let ForObjBox, Box, BoxPlaceholderText, ForObjInput, InputText, InputButton,CheckBox, CheckBoxContainer, CheckBoxText, ContinueButton, AnswerArray = [], box_active, answer_id =0
    let RemovableElements = []

    //Creates the elements
    function initialize_elements(){
        //CREATING MAIN COMPONENTS
        ForObjBox = createNSElemWithDims('http://www.w3.org/2000/svg',"foreignObject",  Dims.Field.x, Dims.Field.y, Dims.Field.w, Dims.Field.h)
        ForObjBox.style.padding = "1%"
        Page.appendChild(ForObjBox)
        RemovableElements.push(ForObjBox)

        //The Box contains all the answers
        Box = document.createElement("div")
        Box.classList.add("recall_input_answerbox_start")
        ForObjBox.appendChild(Box)

        //Adding a placeholder for the box
        reset_box()

        //Adding input line
        ForObjInput = createNSElemWithDims('http://www.w3.org/2000/svg',"foreignObject",  Dims.InputLine.x, Dims.InputLine.y, Dims.InputLine.w, Dims.InputLine.h)
        ForObjInput.style.padding = "1%"
        Page.appendChild(ForObjInput)
        RemovableElements.push(ForObjInput)

        InputText = document.createElement("input")
        InputText.maxLength = max_input_length
        InputText.placeholder = "Enter name here"
        InputText.classList.add("recall_input_line")
        ForObjInput.appendChild(InputText)

        InputButton = createSVGButtonElem(Dims.InputButton.x, Dims.InputButton.y, Dims.InputButton.w, Dims.InputButton.h, "Add")
        InputButton.onclick = add_answer_button_pressed
        Page.appendChild(InputButton)
        RemovableElements.push(InputButton)

        ContinueButton = createSVGButtonElem(Dims.ContinueButton.x, Dims.ContinueButton.y, Dims.ContinueButton.w, Dims.ContinueButton.h, "Done")
        ContinueButton.onclick = finish_question
        Page.appendChild(ContinueButton)

        RemovableElements.push(ContinueButton)

        if(! allow_empty_input){
            ContinueButton.style.display = "none"
        }

        //Finally, we may need to add a checkbox for the no-answer option
        if(add_checkbox_no_answer){
            //The container holding both the checkbox and the text
            CheckBoxContainer = createNSElemWithDims('http://www.w3.org/2000/svg',"foreignObject",  Dims.No_Answer_Checkbox.x, Dims.No_Answer_Checkbox.y, Dims.No_Answer_Checkbox.w, Dims.No_Answer_Checkbox.h)
            CheckBoxContainer.style.padding = "1%"
            CheckBoxContainer.classList.add("recall_no_answer_container")
            Page.appendChild(CheckBoxContainer)
            RemovableElements.push(CheckBoxContainer)

            //Adding the checkbox
            CheckBox = document.createElement("input")
            CheckBox.setAttribute("type", "checkbox");
            CheckBox.classList.add("recall_no_answer_checkbox")
            CheckBoxContainer.appendChild(CheckBox)
            CheckBox.onchange = toggle_no_answer_checkbox

            //Adding the text
            CheckBoxText = document.createElement("p")
            CheckBoxText.innerHTML = checkbox_no_answer_text
            CheckBoxText.classList.add("recall_no_answer_text")
            CheckBoxContainer.appendChild(CheckBoxText)

        }
    }

    //Call then a first answer is submitted to remove the placeholder text in the box
    function activate_box(){
        box_active = true
        BoxPlaceholderText.remove()
        Box.classList.remove("recall_input_answerbox_start")
        Box.classList.add("recall_input_answerbox_active")
    }

    function reset_box(){
        BoxPlaceholderText = document.createElement("p")
        BoxPlaceholderText.innerHTML = "Your answers will be shown here"
        BoxPlaceholderText.classList.add("recall_input_box_placeholder")
        Box.appendChild(BoxPlaceholderText)
        box_active = false

        Box.classList.add("recall_input_answerbox_start")
        Box.classList.remove("recall_input_answerbox_active")
    }

    //Call when the add answer button is pressed
    function add_answer_button_pressed(){
        if(!box_active){
            activate_box()
        }

        let inputval = InputText.value
        if(inputval!== ""){
            answer_added(InputText.value)
            InputText.value = ""
        }

    }

    //Call when an answer has been entered
    function answer_added(answertext){
        AnswerArray.push(new Answer(answertext, answer_id, Date.now() - StartTime))
        answer_id++
        number_of_answers_changed()
    }

    //Object for the answer displayed in the box
    Answer = function(text, id, time){
        let removed_by_user = false
        let AnswerDiv = document.createElement("div")
        AnswerDiv.classList.add("recall_input_answer_div")

        let AnswerText = document.createElement("p")
        AnswerText.classList.add("recall_input_answer_text")
        AnswerText.innerHTML = text
        AnswerDiv.appendChild(AnswerText)

        let RemoveAnswerMark = document.createElement("p")
        RemoveAnswerMark.classList.add("recall_input_answer_remove")
        RemoveAnswerMark.innerHTML = "[x]"
        RemoveAnswerMark.onclick = delete_answer_from_screen
        AnswerDiv.appendChild(RemoveAnswerMark)

        Box.appendChild(AnswerDiv)

        function delete_answer_from_screen(){
            AnswerDiv.remove()
            removed_by_user = true
            number_of_answers_changed()
        }

        this.get_value_obj = function(){
            return({
                ans: text,
                id: id,
                time:time,
                removed_by_user: removed_by_user
            })
        }

    }

    //Call when the checkbox for no input has been toggled
    function toggle_no_answer_checkbox(){
        if(CheckBox.checked){
            //Disable the text input and hide the add button.
            InputButton.style.display = "none"
            InputText.disabled = true

            //Show the continue button
            ContinueButton.style.display = "inherit"
        }else{
            //Enable text input and show the add button
            InputButton.style.display = "inherit"
            InputText.disabled = false

            //Hide the continue button
            ContinueButton.style.display = "none"
        }
    }

    //Call when the number of answers is updated (either when adding or when removing answer)
    function number_of_answers_changed(){
        //Find the number of answers displayed on-screen
        let number_of_answers_on_screen =0
        for(let i =0;i<AnswerArray.length;i++){
            if(AnswerArray[i].get_value_obj().removed_by_user === false){
                number_of_answers_on_screen++
            }
        }

        if(number_of_answers_on_screen === 0){
            //Reset the placeholder text
            ContinueButton.style.display = "none"
            reset_box()

            //If enabled, show the no-answer box
            if(add_checkbox_no_answer){
                CheckBox.disabled = false
                CheckBoxText.style.color = "black"
            }

        }else{
            //Show the continue button
            ContinueButton.style.display = "inherit"
            //If enabled, hide the no-answer box
            if(add_checkbox_no_answer){
                CheckBox.disabled = true
                CheckBoxText.style.color = "gray"
            }
        }
    }

    //Call when the question has been finished
    function finish_question(){
        let GivenAnswers = []
        for(let i =0;i<AnswerArray.length;i++){
            let An = AnswerArray[i]
            GivenAnswers.push(An.get_value_obj())
        }
        //Show the map again
        document.getElementById("instructions_mask").style.opacity = 0.94

        clearElements()

        returnfunc(GivenAnswers)

        //ExpCont.recall_task_completed(GivenAnswers)

    }

    //Call to delete all elements from the page
    function clearElements(){
        for(let i =0;i<RemovableElements.length;i++){
            RemovableElements[i].remove()
        }
        RemovableElements = []
    }
    initialize_elements()

}