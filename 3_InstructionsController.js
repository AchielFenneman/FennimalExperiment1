
INSTRUCTIONSCONTROLLER = function (ExpCont, WorldState, Stimuli) {
    //GENERAL VALUES and functions
    let current_instruction_type
    let ParentElem = document.getElementById("Instructions_Layer")
    let CurrentInstructionsSVG
    let boundary_size = 30
    let that = this
    let number_of_interactions_in_current_day, current_interaction_num_in_day

    //Clears the instructions page
    function clear_instructions() {
        ParentElem.style.display = "none"
        ParentElem.innerHTML = ""

        if (typeof CurrentInstructionsSVG !== "undefined") {
            CurrentInstructionsSVG.remove()
        }
    }

    //Creates the basic elements of all instructions pages
    function create_basic_instruction_elements() {
        //Creating the group to hold all elements
        let GroupElem = document.createElementNS("http://www.w3.org/2000/svg", 'g')

        //Creating the full-screen cover
        let CoverRect = create_SVG_rect(0, 0, GenParam.SVG_width, GenParam.SVG_height, "instructions_element_cover", undefined)
        CoverRect.classList.add("instruction_element_nonbackground")
        CoverRect.classList.add("instruction_cover_rect")
        GroupElem.appendChild(CoverRect)

        //Creating the background rect element (the opague shield)
        let BackGroundRect = create_SVG_rect(boundary_size, boundary_size, GenParam.SVG_width - 2 * boundary_size, GenParam.SVG_height - 2 * boundary_size, "instructions_element_background", undefined)
        GroupElem.appendChild(BackGroundRect)

        //Creating the instructions title
        let Title = create_SVG_text_elem(0.5 * GenParam.SVG_width, 90, "TESTING TITLE HERE", "instructions_element_title", "Instructions_Title")
        Title.style.fontWeight = 700
        Title.classList.add("instruction_element_nonbackground")
        GroupElem.appendChild(Title)

        //Adding the progress elements
        GroupElem.appendChild(create_progress_elements())

        //Returning elements
        return (GroupElem)

    }

    let ProgressForeign, ProgressDiv, ProgressDayNumberIndicators, ProgressDayNumberNumbers, ProgressWithinDayBar,
        progress_elements_height, progress_bar_width

    function create_progress_elements() {
        progress_elements_height = 50
        progress_bar_width = 500
        ProgressForeign = create_SVG_foreignElement(2 * boundary_size, GenParam.SVG_height - boundary_size - 70, GenParam.SVG_width - 4 * boundary_size, progress_elements_height, "instruction_element_nonbackground", undefined)
        ProgressDiv = document.createElement("div")
        ProgressDiv.style.display = "flex"
        ProgressDiv.style.justifyContent = "center"
        ProgressDiv.style.alignItems = "center"
        ProgressForeign.appendChild(ProgressDiv)
        ProgressDayNumberIndicators = []
        ProgressDayNumberNumbers = []
        ProgressDiv.style.transition = "all 200ms ease-in-out"

        //Adding the day number indicators
        let DayIndicatorDiv = document.createElement("div")
        DayIndicatorDiv.style.display = "flex"
        DayIndicatorDiv.style.alignItems = "center"
        ProgressDiv.appendChild(DayIndicatorDiv)

        for (let i = 0; i < Stimuli.get_number_of_days_in_experiment(); i++) {
            //Creating an SVG
            let SVG = document.createElementNS("http://www.w3.org/2000/svg", 'svg')
            SVG.style.height = progress_elements_height
            SVG.style.width = progress_elements_height

            //Adding the circle. We want to preserve a reference to this element
            let Circle = create_SVG_circle(0.5 * progress_elements_height, 0.5 * progress_elements_height, 0.5 * progress_elements_height, "instruction_element_day_indicator_future", undefined)
            SVG.appendChild(Circle)
            ProgressDayNumberIndicators.push(Circle)

            DayIndicatorDiv.appendChild(SVG)
            Circle.style.transition = "all 200ms ease-in-out"

            //Adding a number
            let Number = create_SVG_text_elem(0.5 * progress_elements_height, 0.55 * progress_elements_height, i + 1, undefined, undefined)
            Number.style.fontSize = "30px"
            Number.style.textAnchor = "middle"
            Number.style.alignmentBaseline = "middle"
            ProgressDayNumberNumbers.push(Number)
            SVG.appendChild(Number)
        }

        //Adding the current day progress bar background
        let ProgressBarContainer = document.createElement("div")
        ProgressBarContainer.style.height = progress_elements_height + "px"
        ProgressBarContainer.style.width = progress_bar_width + "px"
        ProgressBarContainer.style.background = "lightgray"
        ProgressBarContainer.style.marginLeft = "20px"
        ProgressBarContainer.style.opacity = 0.5
        ProgressBarContainer.style.borderRadius = "20px"
        ProgressDiv.appendChild(ProgressBarContainer)

        //Now the top part
        ProgressWithinDayBar = document.createElement("div")
        ProgressWithinDayBar.style.height = "100%"
        ProgressWithinDayBar.style.background = "goldenrod"
        ProgressWithinDayBar.style.width = "0%"
        ProgressWithinDayBar.style.borderRadius = "20px"
        ProgressWithinDayBar.style.transition = "all 200ms ease-in-out"
        ProgressBarContainer.appendChild(ProgressWithinDayBar)

        return (ProgressForeign)


    }

    //Pass false to hide the entire progress bar
    this.update_progress_within_day = function (percentage_complete) {
        console.log(percentage_complete)
        if (percentage_complete === false) {
            ProgressWithinDayBar.parentElement.style.display = "none"
        } else {
            ProgressWithinDayBar.parentElement.style.display = "inherit"
            ProgressWithinDayBar.style.width = percentage_complete + "%"
        }

    }

    function update_progress_new_day(currentday) {
        if (currentday === false) {
            for (let i = 0; i < ProgressDayNumberIndicators.length; i++) {

                ProgressDayNumberIndicators[i].style.display = "none"
                ProgressDayNumberNumbers[i].style.display = "none"
            }

        } else {
            for (let i = 0; i < ProgressDayNumberIndicators.length; i++) {

                //Previous days
                if ((i + 1) < currentday) {
                    ProgressDayNumberIndicators[i].style.fill = "navy"
                    ProgressDayNumberIndicators[i].style.opacity = 0.7
                    ProgressDayNumberIndicators[i].setAttribute("r", 0.7 * 0.5 * progress_elements_height)

                    ProgressDayNumberNumbers[i].style.fill = "white"
                    ProgressDayNumberNumbers[i].style.fontSize = "30px"

                }

                //Current day
                if ((i + 1) === currentday) {
                    ProgressDayNumberIndicators[i].style.fill = "goldenrod"
                    ProgressDayNumberIndicators[i].style.opacity = 0.75
                    ProgressDayNumberIndicators[i].setAttribute("r", 0.5 * progress_elements_height)

                    ProgressDayNumberNumbers[i].style.fill = "navy"
                    ProgressDayNumberNumbers[i].style.fontSize = "40px"
                    ProgressDayNumberNumbers[i].style.fontWeight = 600
                }

                //Future days
                if ((i + 1) > currentday) {
                    ProgressDayNumberIndicators[i].style.fill = "gray"
                    ProgressDayNumberIndicators[i].style.opacity = 0.5
                    ProgressDayNumberIndicators[i].setAttribute("r", 0.7 * 0.5 * progress_elements_height)

                    ProgressDayNumberNumbers[i].style.fill = "white"
                    ProgressDayNumberNumbers[i].style.fontSize = "30px"
                }
            }
        }


    }

    function add_closing_button_to_Parent(position, add_keyboard_shortcut_for_closing, optional_additional_function, optional_delay_time) {
        switch (position) {
            case("top-right"):
                ClosingButton = create_SVG_buttonElement(1820, 3 * boundary_size, 75, 75, "🗙", 70)
                break;
            case("bottom-center"):
                ClosingButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 70)
        }
        ParentElem.appendChild(ClosingButton)
        ClosingButton.classList.add("instruction_element_nonbackground")
        AudioCont.play_sound_effect("alert_minimal")
        ClosingButton.onpointerdown = function () {
            if(optional_additional_function !== undefined) {
                optional_additional_function()
            }
            close_instructions();
            AudioCont.play_sound_effect("close_menu")
        }

        if (typeof add_keyboard_shortcut_for_closing !== "undefined") {
            if (add_keyboard_shortcut_for_closing) {
                add_keyboard_shortcuts_to_object(ClosingButton, ["Escape", "Enter", " "], 700, function () {
                    close_instructions();
                    AudioCont.play_sound_effect("close_menu")
                })
            }
        }

        if(optional_delay_time!== undefined) {
            if(optional_delay_time > 0){
                ClosingButton.style.display = "none"
                setTimeout(function () {ClosingButton.style.display = "inherit"}, optional_delay_time)
            }
        }

    }

    //GENERAL INTERACTIONS
    ///////////////////////////
    let ClosingButton

    this.instructions_requested_by_participant = function () {
        switch (current_instruction_type) {
            case("exploration"):
                update_and_show_free_exploration_instructions()
                break
            case("hint_and_search"):
                open_instructions_page()
                break
        }
    }

    function close_instructions() {
        //Hide all the instruction elements apart from the background
        let NonBackGroundElem = ParentElem.getElementsByClassName("instruction_element_nonbackground")
        for (let i = 0; i < NonBackGroundElem.length; i++) {
            NonBackGroundElem[i].style.display = "none"
        }

        //Animate the background to shrink
        let Background = ParentElem.getElementsByClassName("instructions_element_background")[0]
        Background.style.transition = "all 150ms ease-in-out"

        setTimeout(function () {
            Background.setAttribute("x", GenParam.RequestInstructionButtonSettings.center_x - 0.5 * GenParam.RequestInstructionButtonSettings.width)
            Background.setAttribute("y", GenParam.RequestInstructionButtonSettings.center_y - 0.5 * GenParam.RequestInstructionButtonSettings.height)
            Background.setAttribute("width", GenParam.RequestInstructionButtonSettings.width)
            Background.setAttribute("height", GenParam.RequestInstructionButtonSettings.height)
        },)

        setTimeout(function () {
            Background.style.display = "none"
            ParentElem.style.display = "none"
            ExpCont.instructions_page_closed()
        }, 150)

        ClosingButton.remove()

    }

    function open_instructions_page() {
        let Background = ParentElem.getElementsByClassName("instructions_element_background")[0]
        Background.style.display = "inherit"
        Background.style.transition = "all 200ms ease-in-out"
        ParentElem.style.display = "inherit"
        add_closing_button_to_Parent("top-left", true, undefined)


        setTimeout(function () {
            Background.setAttribute("x", boundary_size)
            Background.setAttribute("y", boundary_size)
            Background.setAttribute("width", GenParam.SVG_width - 2 * boundary_size)
            Background.setAttribute("height", GenParam.SVG_height - 2 * boundary_size)
        },)

        setTimeout(function () {
            //Show all the instruction elements apart from the background
            let NonBackGroundElem = ParentElem.getElementsByClassName("instruction_element_nonbackground")
            for (let i = 0; i < NonBackGroundElem.length; i++) {
                NonBackGroundElem[i].style.display = "inherit"
            }
        }, 250)
    }

    //GENERAL INSTRUCTIONS PAGES (AT THE START OF EXPERIMENT)
    //////////////////////////////////////////////////////////
    function show_empty_page(include_map_background) {
        current_instruction_type = "general"
        clear_instructions()
        CurrentInstructionsSVG = create_basic_instruction_elements()
        ParentElem.appendChild(CurrentInstructionsSVG)
        ParentElem.style.display = "inherit"
        ProgressDiv.style.display = "none"

        if(include_map_background){
            document.getElementById("Map").style.display = "inherit"
            let CoverRect = document.getElementsByClassName("instruction_cover_rect")[0]
            if(typeof CoverRect !== "undefined" ) {CoverRect.style.opacity = 0.2}
        }else{
            document.getElementById("Map").style.display = "none"
            document.getElementById("Interface").style.display = "none"
        }
    }

    this.show_consent_page = function () {
        //Create the basic elements
        show_empty_page(true)

        //Add the text
        document.getElementById("Instructions_Title").innerHTML = "Your consent to participate in this study"

        let LeftTextElem = create_SVG_text_in_foreign_element(GenParam.GeneralInstructions.Consent.left_column, 2 * boundary_size, 110, 0.45 * GenParam.SVG_width, 0.8 * GenParam.SVG_height, "instructions_element_text")
        let RightTextElem = create_SVG_text_in_foreign_element(GenParam.GeneralInstructions.Consent.right_column, 0.51 * GenParam.SVG_width, 110, 0.45 * GenParam.SVG_width, 0.8 * GenParam.SVG_height, "instructions_element_text")
        LeftTextElem.childNodes[0].style.fontSize = "30px"
        RightTextElem.childNodes[0].style.fontSize = "30px"
        CurrentInstructionsSVG.appendChild(LeftTextElem)
        CurrentInstructionsSVG.appendChild(RightTextElem)

        //Now adding the consent tickbox
        let tickboxdims = 0.05 * GenParam.SVG_width
        let TickBoxForeign = create_SVG_foreignElement(0.3 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, tickboxdims, tickboxdims, undefined, undefined)
        let ConsentTickBox = document.createElement("input")
        ConsentTickBox.type = "checkbox"
        ConsentTickBox.style.width = "90%"
        ConsentTickBox.style.height = "90%"
        ConsentTickBox.style.cursor = "pointer"
        ConsentTickBox.style.outline = "5px solid darkred"

        TickBoxForeign.appendChild(ConsentTickBox)
        CurrentInstructionsSVG.appendChild(TickBoxForeign)

        //Adding the consent box text
        let ConsentBoxText = create_SVG_text_elem(0.3 * GenParam.SVG_width + 1.5 * tickboxdims, 0.85 * GenParam.SVG_height + 0.6 * tickboxdims, "I consent to these terms", "instructions_element_text", undefined)
        ConsentBoxText.style.fontSize = "50px"
        ConsentBoxText.style.fill = "darkred"
        ConsentBoxText.style.fontWeight = 700
        CurrentInstructionsSVG.appendChild(ConsentBoxText)

        //Creating the continue button (hidden on start)
        let ContinueButton = create_SVG_buttonElement(0.8 * GenParam.SVG_width, 0.85 * GenParam.SVG_height + 0.5 * tickboxdims, 400, 75, "Continue", 40)
        CurrentInstructionsSVG.appendChild(ContinueButton)
        ContinueButton.style.display = "none"

        //Interactivity
        ConsentTickBox.onchange = function () {
            if (ConsentTickBox.checked) {
                //Consent has been given, inform the top controller
                ExpCont.consent_provided_by_participant()
                ContinueButton.style.display = "inherit"
                ConsentTickBox.style.outline = "5px solid navy"
                ConsentBoxText.style.fill = "navy"
            } else {
                //No consent
                ContinueButton.style.display = "none"
                ConsentTickBox.style.outline = "5px solid darkred"
                ConsentBoxText.style.fill = "darkred"
            }
        }

        ContinueButton.onpointerdown = function () {
            ExpCont.general_instructions_page_completed();
            AudioCont.play_sound_effect("button_click")
        }


    }

    this.show_browser_check_and_fullscreen_page = function () {
        //Start a new page
        show_empty_page(true)

        //Check the browser
        let browser = getBrowser()

        //If the browser is not Chrome, then this is as far as the experiment will go...
        if (browser !== "Chrome") {
            document.getElementById("Instructions_Title").innerHTML = "Oops! This experiment only works in Chrome..."
            let WrongBrowserTextElem = create_SVG_text_in_foreign_element("This experiment is only tested and validated in Chrome. Since you are using a different browser you will not be able to participate in this experiment. Please return this task on Prolific. Our apologies for your inconvenience :(",
                4 * boundary_size, 0.35 * GenParam.SVG_height, GenParam.SVG_width - 8 * boundary_size, 0.5 * GenParam.SVG_height, "instructions_element_text", undefined)
            WrongBrowserTextElem.childNodes[0].style.fontWeight = 600
            WrongBrowserTextElem.childNodes[0].style.fontStyle = "italic"
            CurrentInstructionsSVG.appendChild(WrongBrowserTextElem)

        } else {
            //We're using chrome! Now give a button to start full-screen mode.
            document.getElementById("Instructions_Title").innerHTML = "This experiment is best experienced in full-screen mode"
            let FullScreenTextElem = create_SVG_text_in_foreign_element("Pressing the button below will toggle full-screen mode. <br>" +
                "On windows, you can exit (and-re-enter) full-screen mode at any time by pressing [F11]. On Mac, you can exit and re-enter full-screen mode by pressing [Command]+[Cntrl]+[F]. <br>" +
                "<br>" +
                "In addition, please make sure that your audio is on! (The sound will enhance your performance during this task). ",
                4 * boundary_size, 0.25 * GenParam.SVG_height, GenParam.SVG_width - 8 * boundary_size, 0.4 * GenParam.SVG_height, "instructions_element_text", undefined)
            CurrentInstructionsSVG.appendChild(FullScreenTextElem)

            //Adding the button
            let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 500, 75, "Go to full-screen mode", 40)
            ContinueButton.onpointerdown = function (event) {
                toggleFullscreen(event)
                ExpCont.general_instructions_page_completed()

            }
            //ContinueButton.onpointerdown = toggleFullscreen
            //ContinueButton.onpointerdown = ExpCont.general_instructions_page_completed
            CurrentInstructionsSVG.appendChild(ContinueButton)


        }
    }

    this.show_single_sitting_page = function () {
        //Start a new page
        show_empty_page(true)

        //Add the attention icon
        let Icon = document.getElementById("icon_attention").cloneNode(true)
        Icon.style.display = "inherit"
        Icon.style.stroke = "darkred"
        CurrentInstructionsSVG.appendChild(Icon)
        MoveElemToCoords(Icon, 0.1 * GenParam.SVG_width,0.4 * GenParam.SVG_height)


        //Show the title and text
        document.getElementById("Instructions_Title").innerHTML = "Please complete this experiment in a single setting"
        let FullScreenTextElem = create_SVG_text_in_foreign_element(
            "For this experiment (and your earnings at the end), it is important that you <u>pay close attention throughout the entire experiment.</u> " +
            "Please avoid any distractions (either on this screen or on a different screen) and complete the experiment in a single sitting. This will help you to complete the experiment faster, and earn more money at the end. ",
            0.2 * GenParam.SVG_width , 0.275 * GenParam.SVG_height, 0.8 * GenParam.SVG_width - 8 * boundary_size, 0.4 * GenParam.SVG_height, "instructions_element_text", undefined)
        CurrentInstructionsSVG.appendChild(FullScreenTextElem)
        FullScreenTextElem.style.color = "darkred"

        //Adding the button
        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 40)
        ContinueButton.onpointerdown = function (event) {
            ExpCont.general_instructions_page_completed()
        }
        CurrentInstructionsSVG.appendChild(ContinueButton)


    }

    this.show_character_creation_screen = function(map_update_func){
        show_empty_page(true)
        document.getElementById("Instructions_Title").innerHTML = "Select your icon"

        //Creating the menu
        let CCCont = new CharacterCreationController(CurrentInstructionsSVG, map_update_func)

        //Adding a continue button
        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.875 * GenParam.SVG_height, 400, 75, "Continue", 40)
        ContinueButton.onpointerdown = function (event) {
            ExpCont.general_instructions_page_completed()
            //CurrentInstructionsSVG.remove()
        }
        CurrentInstructionsSVG.appendChild(ContinueButton)

    }

    this.show_partner_introduction_screen = function(){
        show_empty_page(true)
        let PartnerInfo = WorldState.get_partner_icon_settings()
        document.getElementById("Instructions_Title").innerHTML = "Meet " + PartnerInfo.name
        let pronoun = "he"
        if(PartnerInfo.type === "female") {pronoun = "she"}
        AudioCont.play_sound_effect("alert")

        //Show icon on the right
        let IconBox = create_SVG_rect(0.6*GenParam.SVG_width,0.2 * GenParam.SVG_height,540, 640, undefined,undefined)
        IconBox.style.rx = "50"
        IconBox.style.fill = "#FFFFFF99"
        CurrentInstructionsSVG.appendChild(IconBox)

        let IconSVG = WorldState.get_person_icon("partner", "front")
        IconSVG.style.transform = "scale(20)"
        let IconTranslateGroup  = create_SVG_group(0,0,undefined,undefined);

        IconTranslateGroup.appendChild(IconSVG);
        CurrentInstructionsSVG.appendChild(IconTranslateGroup);

        moveSVGCenterTo(IconTranslateGroup, IconBox.getBBox().x + 0.5 * IconBox.getBBox().width, IconBox.getBBox().y + 0.5 * IconBox.getBBox().height)

        //Adding text
        let introtext = PartnerInfo.name + " is an intern on the island, who will be shadowing you for the next couple of days to " +
            "get a feel of what's it like to be a caretaker on the island. " + pronoun + " will observe your interactions with the Fennimals on the island, but " +
            pronoun + " will not interact with any of the Fennimals directly. "
        let TextObj = create_SVG_text_in_foreign_element(introtext, 0.1 * GenParam.SVG_width, 0.3 * GenParam.SVG_height, 0.5 * GenParam.SVG_width, 0.3 * GenParam.SVG_height, undefined,undefined)
        TextObj.style.fontSize = "40px"
        CurrentInstructionsSVG.appendChild(TextObj)


        //Continue button
        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.875 * GenParam.SVG_height, 400, 75, "Continue", 40)
        ContinueButton.onpointerdown = function (event) {
            ExpCont.general_instructions_page_completed()
            //CurrentInstructionsSVG.remove()
        }
        CurrentInstructionsSVG.appendChild(ContinueButton)





    }

    let OverviewPage_remaining_steps, OverviewPage_PreviousTextElem = [], OverviewPage_ContinueButton,
        OverviewPage_SearchButton, OverviewPage_Search_ContinueText
    this.show_overview_page = function () {

        //Check if stars can be earned
        let stars_can_be_earned = Stimuli.get_maximum_number_of_bonus_stars() > 0

        let story_text_offset = 0
        if (!stars_can_be_earned) {
            story_text_offset = 0.175 * GenParam.SVG_height
            OverviewPage_remaining_steps = ["movement", "search", "lookout", "instructions"]
        } else {
            OverviewPage_remaining_steps = ["stars", "movement", "search", "lookout", "instructions"]
        }
        show_empty_page(true)

        //Set the title
        document.getElementById("Instructions_Title").innerHTML = "Overview"

        //The main story
        GenParam.GeneralInstructions.Overview.story = GenParam.GeneralInstructions.Overview.story.replace("%NUMBERDAYS%", Stimuli.get_number_of_days_in_experiment())
        let StoryTextElem = create_SVG_text_in_foreign_element(GenParam.GeneralInstructions.Overview.story, 2 * boundary_size, 110 + story_text_offset, 0.45 * GenParam.SVG_width, 0.4 * GenParam.SVG_height, "instructions_element_text")
        OverviewPage_PreviousTextElem.push(StoryTextElem)
        StoryTextElem.childNodes[0].style.textAlign = "justify"
        CurrentInstructionsSVG.appendChild(StoryTextElem)

        //The continue button
        OverviewPage_ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.92 * GenParam.SVG_height, 400, 75, "Continue", 40)
        CurrentInstructionsSVG.appendChild(OverviewPage_ContinueButton)
        OverviewPage_ContinueButton.onpointerdown = function () {
            overview_page_next_step();
            AudioCont.play_sound_effect("button_click")
        }
    }
    function overview_page_next_step() {
        if (OverviewPage_remaining_steps.length > 0) {
            let background_color = "#EDEDED"
            let boxheight = 0.175 * GenParam.SVG_height, box_offset_top = 150
            let spacing_boxes = 0.01 * GenParam.SVG_height

            //Draw the next step
            let nextstep = OverviewPage_remaining_steps.shift()

            //Special steps for the continue button (and search button)
            OverviewPage_ContinueButton.style.display = "inherit"
            if (typeof OverviewPage_SearchButton !== "undefined") {
                OverviewPage_SearchButton.disable_functionality()
                OverviewPage_Search_ContinueText.style.display = "none"
            }

            for (let i = 0; i < OverviewPage_PreviousTextElem.length; i++) {
                OverviewPage_PreviousTextElem[i].childNodes[0].style.color = "gray"
            }

            switch (nextstep) {
                case("stars"):
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace("%CURRENCYSYMBOL%", Stimuli.get_bonus_details().currency_symbol)
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace("%CURRENCYSYMBOL%", Stimuli.get_bonus_details().currency_symbol)
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace("%AMOUNTPERSTAR%", Stimuli.get_bonus_details().bonus_per_star.toFixed(2))
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace("%MAXNUMBERSTARS%", Stimuli.get_maximum_number_of_bonus_stars())
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace("%MAXBONUSAMOUNT%", (Stimuli.get_maximum_number_of_bonus_stars() * Stimuli.get_bonus_details().bonus_per_star).toFixed(2))
                    show_bonus_star_on_screen(CurrentInstructionsSVG, 0.075 * GenParam.SVG_width, 110 + 0.57 * GenParam.SVG_height, true, undefined, undefined)

                    let StarTextElem = create_SVG_text_in_foreign_element(GenParam.GeneralInstructions.Overview.bonus, 0.15 * GenParam.SVG_width, 110 + 0.42 * GenParam.SVG_height, 0.33 * GenParam.SVG_width, 0.8 * GenParam.SVG_height, "instructions_element_text")
                    OverviewPage_PreviousTextElem.push(StarTextElem)
                    StarTextElem.childNodes[0].style.textAlign = "justify"
                    CurrentInstructionsSVG.appendChild(StarTextElem)
                    break
                case("movement"):
                    let BackgroundRect_Movement = create_SVG_rect(0.51 * GenParam.SVG_width, box_offset_top, 0.45 * GenParam.SVG_width, boxheight, undefined, undefined)
                    BackgroundRect_Movement.style.fill = background_color
                    BackgroundRect_Movement.setAttribute("rx", 30)
                    CurrentInstructionsSVG.appendChild(BackgroundRect_Movement)



                    let PlayerIcon = WorldState.get_person_icon("player", "front")
                    PlayerIcon.style.transform = "scale(5)"

                    let PlayerIconContainer = create_SVG_group(0, 0, 0, 0, undefined, undefined)
                    PlayerIconContainer.appendChild(PlayerIcon)

                    CurrentInstructionsSVG.appendChild(PlayerIconContainer)
                    PlayerIconContainer.style.transform = "translate(" + 0.55 * GenParam.SVG_width + "px, " + (box_offset_top + 0.5 * boxheight) + "px)"

                    let MovementText = create_SVG_text_in_foreign_element("This icon represents you. You can move this icon across the map by pressing down with your mouse. ",
                        0.58 * GenParam.SVG_width, box_offset_top, 0.375 * GenParam.SVG_width, boxheight, "instructions_element_text")

                    CurrentInstructionsSVG.appendChild(MovementText)


                    break
                case("search"):
                    //SEARCH ICON
                    let BackgroundRect_Search = create_SVG_rect(0.51 * GenParam.SVG_width, box_offset_top + boxheight + spacing_boxes, 0.45 * GenParam.SVG_width, boxheight, undefined, undefined)
                    BackgroundRect_Search.style.fill = background_color
                    BackgroundRect_Search.setAttribute("rx", 30)
                    CurrentInstructionsSVG.appendChild(BackgroundRect_Search)

                    //let SearchButton = create_Action_Button_SVG_Element("magnifier", {center_x: 500,center_y:500, width: .5*boxheight, height: .5*boxheight}, false, 3000)
                    let SearchButtonDims = {
                        center_x: 0.545 * GenParam.SVG_width,
                        center_y: box_offset_top + 1.5 * boxheight + 1 * spacing_boxes,
                        width: .55 * boxheight,
                        height: .55 * boxheight
                    }
                    OverviewPage_SearchButton = new ActionButton(CurrentInstructionsSVG, "magnifier", SearchButtonDims, 1000, false, function () {
                        overview_page_next_step();
                        AudioCont.play_sound_effect("success");
                        create_ripple(CurrentInstructionsSVG, SearchButtonDims.center_x, SearchButtonDims.center_y, true, AudioCont)
                    })
                    OverviewPage_ContinueButton.style.display = "none"
                    //CurrentInstructionsSVG.appendChild(SearchButton)

                    let SearchButtonText = create_SVG_text_in_foreign_element("Some locations on the map contain Fennimals. Once you are close to a location, a magnifying glass will appear. You can search for a Fennimal by holding down on this button.",
                        0.58 * GenParam.SVG_width, box_offset_top + 0.85 * boxheight + 1 * spacing_boxes, 0.375 * GenParam.SVG_width, 1.1 * boxheight, "instructions_element_text")
                    CurrentInstructionsSVG.appendChild(SearchButtonText)

                    //Add some text in lieu of the continuebutton
                    OverviewPage_Search_ContinueText = create_SVG_text_elem(0.5 * GenParam.SVG_width, 0.92 * GenParam.SVG_height, "Hold down on the search button to continue...", "instructions_element_text", undefined)
                    OverviewPage_Search_ContinueText.style.fontStyle = "italic"
                    OverviewPage_Search_ContinueText.style.textAnchor = "middle"
                    CurrentInstructionsSVG.appendChild(OverviewPage_Search_ContinueText)
                    break;
                case("lookout"):
                    //LOOKOUT TOWER
                    let BackgroundRect_Lookout = create_SVG_rect(0.51 * GenParam.SVG_width, box_offset_top + 2 * boxheight + 2 * spacing_boxes, 0.45 * GenParam.SVG_width, boxheight, undefined, undefined)
                    BackgroundRect_Lookout.style.fill = background_color
                    BackgroundRect_Lookout.setAttribute("rx", 30)
                    CurrentInstructionsSVG.appendChild(BackgroundRect_Lookout)

                    let LookoutTowerCopy = document.getElementById("watchtower").cloneNode(true)
                    LookoutTowerCopy.removeAttribute("id")
                    let LookoutTowerScale = create_SVG_group(0, 0, 0, 0, undefined, undefined)
                    let LookoutTowerTranslate = create_SVG_group(0, 0, 0, 0, undefined, undefined)
                    LookoutTowerTranslate.appendChild(LookoutTowerCopy)
                    LookoutTowerScale.appendChild(LookoutTowerTranslate)
                    CurrentInstructionsSVG.appendChild(LookoutTowerScale)

                    LookoutTowerScale.style.transformOrigin = "center"
                    LookoutTowerScale.style.transform = "scale(2)"
                    MoveElemToCoords(LookoutTowerTranslate, 0.52 * GenParam.SVG_width, box_offset_top + 2 * boxheight + 2 * spacing_boxes - 45)
                    let LookoutTowerText = create_SVG_text_in_foreign_element("There is a lookout tower located at the center of the island. If you are unsure where to go, climbing this tower will give you a hint!",
                        0.58 * GenParam.SVG_width, box_offset_top + 2 * boxheight + 2 * spacing_boxes, 0.375 * GenParam.SVG_width, boxheight, "instructions_element_text")
                    CurrentInstructionsSVG.appendChild(LookoutTowerText)
                    break
                case("instructions"):
                    //REQUEST INSTRUCTIONS
                    let BackgroundRect_Instructions = create_SVG_rect(0.51 * GenParam.SVG_width, box_offset_top + 3 * boxheight + 3 * spacing_boxes, 0.45 * GenParam.SVG_width, boxheight, undefined, undefined)
                    BackgroundRect_Instructions.style.fill = background_color
                    BackgroundRect_Instructions.setAttribute("rx", 30)
                    CurrentInstructionsSVG.appendChild(BackgroundRect_Instructions)

                    //let ExampleButton = create_SVG_buttonElement(0.51 *GenParam.SVG_width,box_offset_top + 3*boxheight + 3*spacing_boxes,75,75,"🗙", 70)
                    let ExampleButton = create_SVG_buttonElement(0.545 * GenParam.SVG_width, box_offset_top + 3.5 * boxheight + 3 * spacing_boxes, GenParam.RequestInstructionButtonSettings.width, GenParam.RequestInstructionButtonSettings.height, GenParam.RequestInstructionButtonSettings.text, GenParam.RequestInstructionButtonSettings.textsize)
                    let InstructionsText = create_SVG_text_in_foreign_element("On the top-left of the screen you will find a button labelled '" + GenParam.RequestInstructionButtonSettings.text + "' . Click this button if you are unsure about what to do next.",
                        0.58 * GenParam.SVG_width, box_offset_top + 3 * boxheight + 3 * spacing_boxes, 0.375 * GenParam.SVG_width, boxheight, "instructions_element_text")

                    CurrentInstructionsSVG.appendChild(ExampleButton)
                    CurrentInstructionsSVG.appendChild(InstructionsText)

                    break


            }
        } else {
            ExpCont.general_instructions_page_completed()
        }
    }

    //FREE EXPLORATION PHASE
    ///////////////////////////
    let Exploration_Array_Fennimal_Objects, Array_of_Locations_in_game, FennimalBox, LocationBox,
        TextElem_Main_Instructions, Fennimals_in_phase
    this.initialize_free_exploration_instructions = function (interaction_type, current_block_num, can_earn_stars, fennefinder_status, Fennimals_in_phase_Array) {
        Fennimals_in_phase = Fennimals_in_phase_Array
        current_instruction_type = "exploration"
        let NewArr = []
        for(let i = 0; i < Fennimals_in_phase_Array.length; i++) {
            if(typeof Fennimals_in_phase_Array[i].name !== "undefined") {
                NewArr.push(Fennimals_in_phase_Array[i])
            }
        }
        Fennimals_in_phase_Array = NewArr

        //Clearing any previous instructions
        clear_instructions()

        //Creating the basic elements
        CurrentInstructionsSVG = create_basic_instruction_elements()

        //Append to page
        ParentElem.appendChild(CurrentInstructionsSVG)

        //Show instructions layer
        ParentElem.style.display = "inherit"

        //Creating the scrollable box containing all the FENNIMALS
        FennimalBox = new Vertical_scollable_box(ParentElem, (0.5 * 1920 - 0.5 * 1800), 400, 1800, 500)
        FennimalBox.change_opacity(0)
        FennimalBox.add_array_of_Fennimal_icons(Fennimals_in_phase_Array, 200, 200, true)
        //LocationBox.add_array_of_Location_icons(WorldState.get_location_states_in_array(), 175,175, true )

        //Adding the closing button on the top-right
        add_closing_button_to_Parent("top-right", false, undefined)

        //Setting all the text here
        console.log(fennefinder_status)
        let Fennefinder_text = ""
        if(fennefinder_status === true){
            Fennefinder_text = "The Fennefinder on the bottom-right of the screen will help guide you to the different Fennimals. "
        }
        if(fennefinder_status === "low_power_mode"){
            Fennefinder_text = "Unfortunately, the Fennefinder has run out of battery - so you'll have to find all Fennimals by memory! "
        }
        document.getElementById("Instructions_Title").innerHTML = "Day " + current_block_num + ": find all the Fennimals on the island"

        let instruction_text = "Your task today is to explore the island and find all Fennimals on the island. There are currenly " + Fennimals_in_phase_Array.length + " Fennimals spread across the different regions of Fenneland.  <br>" +
            "You can search different locations. If there is a Fennimal present, then please enter the location and follow the instructions. " +
            Fennefinder_text+  "<br>" +
            "Press the X to close this page and travel the island."
        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 100, 100, (GenParam.SVG_width - 2 * 100), 500, "instruction_element_text")
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground")
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px"
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

        setTimeout(function () {
            FennimalBox.change_opacity(1)
        }, 5)

        //Updating the number of days in the progress bar
        update_progress_new_day(current_block_num)

    }

    this.update_exploration_phase_instructions_to_show_completion = function () {
        AudioCont.play_sound_effect("alert")
        TextElem_Main_Instructions.remove()
        TextElem_Main_Instructions = create_SVG_text_in_foreign_element("Well done! You have photographed all the Fennimals! You will continue to the next phase of the experiment after closing these instructions!", 100, 150, (1920 - 2 * 100), 500, "instruction_element_text")
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground")
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px"
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontWeight = 700
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.color = "darkgreen"
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

        ClosingButton.style.opacity = 0
        setTimeout(function () {
            ClosingButton.style.opacity = 1
        }, 2500)

    }

    //Call to update the state of the free exploration instructions
    function update_and_show_free_exploration_instructions() {
        //AudioCont.play_sound_effect("alert")
        ParentElem.style.display = "inherit"

        //Animate the page being opened
        FennimalBox.change_opacity(0)
        open_instructions_page()

        //Show all the basic items
        setTimeout(function () {
            //LocationBox.clear_all_icons()
            FennimalBox.clear_all_icons()

            //Add new icons based on their search status
            let VisitedFennimals = []
            let UnvisitedFennimals = []

            let AllFennimals = WorldState.get_array_of_Fennimals_on_map()
            for (let i = 0; i < AllFennimals.length; i++) {
                let visited = false
                if (typeof AllFennimals[i].visited !== "undefined") {
                    if (AllFennimals[i].visited) {
                        visited = true
                    }
                }

                if (visited) {
                    VisitedFennimals.push(AllFennimals[i])
                } else {
                    UnvisitedFennimals.push(AllFennimals[i])
                }
            }

            //Sorting visited Fennimals by order visited
            VisitedFennimals = VisitedFennimals.sort(function (a, b) {
                return a.num_in_phase - b.num_in_phase
            })

            FennimalBox.add_array_of_Fennimal_icons([VisitedFennimals, UnvisitedFennimals].flat(), 200, 200, true)
            //FennimalBox.add_array_of_Fennimal_icons(Fennimals_in_phase, 200, 200, true)
            setTimeout(function () {
                FennimalBox.change_opacity(1)
            }, 5)

            //If at least one Fennimal has been found, we can simplify this page a bit by removing the text
            if (VisitedFennimals.length > 0) {
                TextElem_Main_Instructions.remove()
                TextElem_Main_Instructions = create_SVG_text_in_foreign_element("Your task today is to explore the island and find all Fennimals on the island. You have already found these Fennimals:", 100, 150, (1920 - 2 * 100), 500, "instruction_element_text")
                TextElem_Main_Instructions.classList.add("instruction_element_nonbackground")
                TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px"
                CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

                FennimalBox.change_position("y", 0.3 * GenParam.SVG_height)

            }

        }, 210)


    }

    // HINT AND SEARCH PHASES
    /////////////////////////
    this.initialize_hint_and_search_phase_general_instructions = function (interaction_type,hint_type, current_block_num, num_bonus_stars_per_question, fennefinder_status, Fennimals_in_phase_Array) {
        let close_button_pos = "bottom-center", bonus_star_id
        current_instruction_type = "hint_and_search"
        let continue_button_time = 500

        if(num_bonus_stars_per_question === true){num_bonus_stars_per_question = 1}
        let can_earn_stars = num_bonus_stars_per_question > 0


        if(Array.isArray(interaction_type)){
            //Multiple types are included in this trial, which should be included in the instructions.
            for(let i = 0; i < interaction_type.length; i++) {
                if(interaction_type[i].includes("ask_")){
                    interaction_type = "ask"
                    break
                }
            }

            if(interaction_type!== "ask"){
                interaction_type = "multiple"
            }
        }
        if(interaction_type.includes("ask_")){
            interaction_type = "ask"
        }

        //Clearing any previous instructions
        clear_instructions()

        //Creating the basic elements
        CurrentInstructionsSVG = create_basic_instruction_elements()

        //Append to page
        ParentElem.appendChild(CurrentInstructionsSVG)

        //Show instructions layer
        ParentElem.style.display = "inherit"

        let task_type_text, Fennimal_state_text, verb_text, ask_insert_text = ""
        switch(interaction_type) {
            case("polaroid_photo_active"): task_type_text = "It's time to check in on the Fennimals. Let's go take some photos of them! "; Fennimal_state_text = " need to be checked in on."; verb_text = "photographed"; break
            case("polaroid_photo_passive"): task_type_text = "It's time to check in on the Fennimals. Let's go take some photos of them! "; Fennimal_state_text = " need to be checked in on."; verb_text = "photographed"; break
            case("give_food_active"): task_type_text = "It's dinner time for the Fennimals. Let's go out and give them some food! "; Fennimal_state_text = " are hungry."; verb_text = "fed"; break
            case("give_food_passive"): task_type_text = "It's dinner time for the Fennimals. Let's go out and give them some food! "; Fennimal_state_text = " are hungry."; verb_text = "fed"; break
            case("play_with_toy_active"): task_type_text = "The Fennimals are getting a bit bored. Let's go play with them! "; Fennimal_state_text = " are bored."; verb_text = "played with"; break
            case("play_with_toy_passive"): task_type_text = "The Fennimals are getting a bit bored. Let's go play with them! "; Fennimal_state_text = " are bored."; verb_text = "played with"; break
            case("multiple"): task_type_text = "It's time to visit some more Fennimals! "; Fennimal_state_text = " are waiting for you."; verb_text = "interacted with"; break
            case("ask"): task_type_text = "Time for some questions! "; Fennimal_state_text = " are waiting for you."; verb_text = "interacted with"; ask_insert_text = " When visiting these Fennimals, there will be some questions for you to answer. "; break
        }

        //Setting all the text here
        document.getElementById("Instructions_Title").innerHTML = "Day " + current_block_num + ": time to visit some Fennimals!"

        let can_earn_stars_text = "", text_y = 300, text_h = 500
        if(can_earn_stars){
            continue_button_time =  continue_button_time + num_bonus_stars_per_question * 500
            const dx = 0.08 * GenParam.SVG_width
            const center = 0.5 * GenParam.SVG_width
            const AllXpos = {
                1: [center],
                2: [center - 0.5*dx, center + 0.5 * dx],
                3: [center - dx,center, center +  dx],
                4: [center - 1.5*dx,center - 0.5*dx, center + 0.5 * dx, center + 1.5 * dx],
                5: [center - 2*dx,center - dx,center, center +  dx, center + 2*dx],
            }
            const starpos = AllXpos[num_bonus_stars_per_question]

            for(let i =0;i<num_bonus_stars_per_question; i++){
                setTimeout(function(){
                    show_bonus_star_on_screen(ParentElem, starpos[i], 0.53 * GenParam.SVG_height, true, "deletable_bonus_star", 1, undefined)
                },(i+1)*300)
            }
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned

            let numtext = "a bonus star"
            if(num_bonus_stars_per_question > 1){
                numtext = num_bonus_stars_per_question + " bonus stars"
            }
            can_earn_stars_text = "<b><br><br> Please answer carefully, as you will earn " + numtext + " for each question you correctly answer! </b><br><br><br><br><br>";
            text_y = 200
            text_h = 600
        }

        let hint_type_text, next_hint_text
        if(typeof hint_type === "object"){
            if(hint_type.length === 1){
                hint_type = hint_type[0]
            }
            else{hint_type = "multiple"}}


        switch (hint_type) {
            case("location"):
                hint_type_text = " told a location where a Fennimal was recently spotted";
                next_hint_text = "instructed where to go next";
                break
            case("icon"):
                hint_type_text = " shown which Fennimal to visit";
                next_hint_text = "shown the next Fennimal to visit";
                break
            case("name"):
                hint_type_text = " given the name of the Fennimals which you have to find next";
                next_hint_text = "given the name of the next Fennimal to visit";
                break
            case("toy"):
                hint_type_text = " given a toy which you have to bring to its owner";
                next_hint_text = "given the next toy to bring to its owner";
                break
            case("food"):
                hint_type_text = " shown which type of food this Fennimal likes";
                next_hint_text = "shown the next type of food to bring to a Fennimal";
                break
            case("multiple"):
                hint_type_text = " given a given a hint on which Fennimal to find";
                next_hint_text = "given the next hint";
                break
        }

        let Fennefinder_text = ""
        if(fennefinder_status === true){
            Fennefinder_text = "The Fennefinder on the bottom-right of the screen will help guide you to the different Fennimals. "
        }
        if(fennefinder_status === "low_power_mode"){
            Fennefinder_text = "Unfortunately, the Fennefinder has run out of battery - so you'll have to find all Fennimals by memory! "
        }

        let number_of_trials_text = ", until you have " + verb_text + " all " + Fennimals_in_phase_Array.length + " Fennimals which " + Fennimal_state_text
        if(hint_type === "multiple"){number_of_trials_text = "."}

        let instruction_text = task_type_text + "One at a time, you will be " + hint_type_text + ". " + ask_insert_text +
            "After you have done so, you will be " + next_hint_text + "  " +number_of_trials_text +
            can_earn_stars_text +
            Fennefinder_text + "<br>" + "<i>Tip: don't know where to go next? Try climbing the watchtower!</i>"

        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 100, text_y, (1920 - 2 * 100), text_h, "instruction_element_text")
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground")
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px"
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

        //Updating the number of days in the progress bar
        update_progress_new_day(current_block_num)

        //Adding the closing button the bottom of the page
        function delete_bonus_star_icons(){
            let Stars = document.getElementsByClassName("deletable_bonus_star")
            while(Stars.length > 0){
                Stars[0].remove()
            }
        }
        add_closing_button_to_Parent(close_button_pos, false, delete_bonus_star_icons, continue_button_time)



    }

    this.initialize_hint_and_search_phase_trial_instructions = function (FenObj, hint_type, percentage_complete) {
        this.update_progress_within_day(percentage_complete)
        let continue_button_time = 500

        current_instruction_type = "hint_and_search"
        ParentElem.style.display = "inherit"

        //Setting all the text here
        if(hint_type === "location" || hint_type === "icon" || hint_type === "name"){
            document.getElementById("Instructions_Title").innerHTML = "Find this Fennimal!"
        }
        if(hint_type === "toy"){
            document.getElementById("Instructions_Title").innerHTML = "Bring this toy to its owner!"
        }
        if(hint_type === "toybox"){
            document.getElementById("Instructions_Title").innerHTML = "Bring this box to the correct Fennimal!"
        }
        if(hint_type === "toybox"){
            document.getElementById("Instructions_Title").innerHTML = "Find the Fennimal which likes this food!"
        }

        TextElem_Main_Instructions.remove()

        //Displaying the actual hint here
        let icon_y = 0.45 * GenParam.SVG_height
        if(FenObj.bonus_stars_earnable === true || FenObj.bonus_stars_earnable > 0){icon_y = 0.375 * GenParam.SVG_height}
        switch (hint_type) {
            case("location"):
                TextElem_Main_Instructions = create_SVG_text_in_foreign_element("Hint: this Fennimal can be found at the <b> " + GenParam.LocationDisplayNames[FenObj.location] + "</b>", 100, 400, (1920 - 2 * 100), 200, "instruction_element_text")
                TextElem_Main_Instructions.classList.add("instruction_element_nonbackground")
                TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "50px"
                TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.textAlign = "center"
                TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontStyle = "italic"
                //TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontWeight = 800
                TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.display = "none"
                setTimeout(function () {
                    TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.display = "inherit"
                }, 200)

                CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

                break
            case("icon"):
                //TextElem_Main_Instructions = create_SVG_text_elem(0.5 * GenParam.SVG_width, 475,"", "instructions_element_title",undefined)
                let Icon = create_Fennimal_SVG_object(FenObj, GenParam.Fennimal_head_size, false)
                CurrentInstructionsSVG.appendChild(Icon)
                let FennimalScaleGroup = Icon.getElementsByClassName("Fennimal_scale_group")[0]
                let Box = FennimalScaleGroup.getBBox()
                let delta_x = (0.5 * GenParam.SVG_width) - (Box.x + 0.5 * Box.width)
                let delta_y = (icon_y) - (Box.y + 0.45 * Box.height)
                Icon.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"
                Icon.classList.add("instruction_element_nonbackground")

                //Dirty fix....
                TextElem_Main_Instructions = Icon
                CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

                Icon.style.display = "none"
                setTimeout(function () {
                    Icon.style.display = "inherit"
                }, 200)

                break
            case("name"):
                TextElem_Main_Instructions = create_SVG_text_in_foreign_element("Hint: this Fennimal is called <b> " + FenObj.name + "</b>", 100, 400, (1920 - 2 * 100), 200, "instruction_element_text")
                TextElem_Main_Instructions.classList.add("instruction_element_nonbackground")
                TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "50px"
                TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.textAlign = "center"
                TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontStyle = "italic"
                TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.display = "none"
                setTimeout(function () {
                    TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.display = "inherit"
                }, 200)
                CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)
                break
            case("toy"):

                TextElem_Main_Instructions = create_SVG_group(0,0,undefined,undefined)
                CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)
                let ToyIcon = copy_scale_and_move_object_to_position(document.getElementById("toy_" + FenObj.toy), TextElem_Main_Instructions, 0.5 * GenParam.SVG_width, 0.5 * GenParam.SVG_height, 4 )
                set_toy_color_scheme(ToyIcon, FenObj.toy)
                ToyIcon.style.display = "none"
                ToyIcon.classList.add("instruction_element_nonbackground")
                CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

                setTimeout(function () {
                    ToyIcon.style.display = "inherit"
                }, 200)

                break
            case("toybox"):
                TextElem_Main_Instructions = create_SVG_group(0,0,undefined,undefined)
                CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)
                let BoxIcon = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + FenObj.toybox), TextElem_Main_Instructions, 0.5 * GenParam.SVG_width, 0.5 * GenParam.SVG_height, 4 )
                BoxIcon.style.display = "none"
                BoxIcon.classList.add("instruction_element_nonbackground")
                CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)


                setTimeout(function () {
                    BoxIcon.style.display = "inherit"
                }, 200)

                break
            case("food"):
                TextElem_Main_Instructions = create_SVG_group(0,0,undefined,undefined)
                CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)
                let FoodIcon = copy_scale_and_move_object_to_position(document.getElementById("food_" + FenObj.food_preference + "_first"), TextElem_Main_Instructions, 0.5 * GenParam.SVG_width, 0.5 * GenParam.SVG_height, 7 )
                FoodIcon.style.display = "none"
                FoodIcon.classList.add("instruction_element_nonbackground")
                CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)


                setTimeout(function () {
                    FoodIcon.style.display = "inherit"
                }, 200)
                break


        }

        //Optionally add stars if any can be earned
        if(FenObj.bonus_stars_earnable === true || FenObj.bonus_stars_earnable > 0){

            let num_bonus_stars = FenObj.bonus_stars_earnable
            if(num_bonus_stars === true){num_bonus_stars = 1}

            let bonustext = "You can earn a bonus star"
            if(num_bonus_stars > 1){bonustext = "You can earn up to " + num_bonus_stars + " stars!"}


            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned
            let BonusText = create_SVG_text_in_foreign_element(bonustext, -0.175 * GenParam.SVG_width, 0.29*GenParam.SVG_height, 0.5 * GenParam.SVG_width, 0.1 * GenParam.SVG_height, "questionbar_bonustext")
            BonusText.style.fontSize = "40px"
            BonusText.style.textAlign = "center"
            BonusText.classList.add("instruction_element_nonbackground")

            TextElem_Main_Instructions.appendChild(BonusText)
            console.log(TextElem_Main_Instructions)

            //Bonus stars
            const dx = 0.06 * GenParam.SVG_width
            const center = 0.5 * GenParam.SVG_width
            const AllXpos = {
                1: [center],
                2: [center - 0.5*dx, center + 0.5 * dx],
                3: [center - dx,center, center +  dx],
                4: [center - 1.5*dx,center - 0.5*dx, center + 0.5 * dx, center + 1.5 * dx],
                5: [center - 2*dx,center - dx,center, center +  dx, center + 2*dx],
            }
            const starpos = AllXpos[num_bonus_stars]

            for(let i =0 ; i <num_bonus_stars; i++){
                setTimeout(function(){
                    let X = show_bonus_star_on_screen(TextElem_Main_Instructions,  starpos[i], 0.75* GenParam.SVG_height, true, "instruction_element_nonbackground", 0.75)
                    console.log(X)
                }, (i+1) * 400)
            }

            console.log(ParentElem)
            console.log(ParentElem.getElementsByClassName("button_element")[0])
            continue_button_time = num_bonus_stars * 500

        }else{
            document.getElementsByClassName("instructions_element_background")[0].style.fill = ""

        }


        open_instructions_page()

    }

    //NAME RECALL TASK
    ////////////////////////////
    this.start_name_recall_task = function (current_block_num, can_earn_stars) {
        current_instruction_type = "name_recall_task"

        //Show the instructions background as usual
        clear_instructions()
        CurrentInstructionsSVG = create_basic_instruction_elements()
        ParentElem.appendChild(CurrentInstructionsSVG)
        ParentElem.style.display = "inherit"

        //But now tha background should be fully opague (dont want to give the participant any accidental hints
        CurrentInstructionsSVG.getElementsByClassName("instructions_element_cover")[0].style.opacity = 1

        let RBC = new RecallBoxController(CurrentInstructionsSVG, 1700, 400, false, true, "I do not remember any names", name_recall_task_complete)
        RBC.translate_elements(100, 420)

        //Setting the title and moving it up a bit. Also tweak the visuals a bit if participants can earn stars here
        if (can_earn_stars) {
            document.getElementById("Instructions_Title").innerHTML = "Day " + current_block_num + ": which Fennimals do you remember? (BONUS STAR DAY)"
            show_bonus_star_on_screen(ParentElem, 0.025 * GenParam.SVG_width, 0.05 * GenParam.SVG_height, false, undefined, 0.5)
            show_bonus_star_on_screen(ParentElem, 0.975 * GenParam.SVG_width, 0.05 * GenParam.SVG_height, false, undefined, 0.5)
            show_bonus_star_on_screen(ParentElem, 0.025 * GenParam.SVG_width, 0.95 * GenParam.SVG_height, false, undefined, 0.5)
            show_bonus_star_on_screen(ParentElem, 0.975 * GenParam.SVG_width, 0.95 * GenParam.SVG_height, false, undefined, 0.5)
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned
            document.getElementsByClassName("instructions_element_cover")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned


        } else {
            document.getElementById("Instructions_Title").innerHTML = "Day " + current_block_num + ": which Fennimals do you remember?"
        }

        document.getElementById("Instructions_Title").style.transform = "translate(0px, -50px)"

        //Setting the instructions text
        let instruction_text = "Today you can earn some bonus stars! Please write down all the names of the different Fennimals which you can remember. <br>" +
            "<br> " +
            "<i>You can enter a name by typing in the box and clicking on the 'Add' button. " +
            "Your previous answers will be blurred, but if you made a mistake you can click on <span style='color:firebrick'> [x] </span> to remove an answer. " +
            "If you have listed all the names you remember, then you can click on the 'Done' button to continue (you will not be able to return after pressing the button!) <br>"
        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 100, 50, (1920 - 2 * 100), 350, "instruction_element_text")
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground")
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "35px"
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

        //Progress bar: show days only (no within-day progress here)
        update_progress_new_day(current_block_num)
        this.update_progress_within_day(false)


    }

    function name_recall_task_complete(RecalledNames) {
        //Delete the elements
        clear_instructions()

        ExpCont.recalled_names_task_complete(RecalledNames)
    }

    // JUMP TO TRIAL
    ///////////////////
    this.initialize_jump_to_trial_instructions = function(interaction_type, current_block_num, num_bonus_stars_per_question, fennefinder_status, Fennimals_in_phase_Array){
        let close_button_pos = "bottom-center", bonus_star_id
        current_instruction_type = "hint_and_search"
        let continue_button_time = 500

        if(num_bonus_stars_per_question === true){num_bonus_stars_per_question = 1}
        let can_earn_stars = num_bonus_stars_per_question > 0
        console.log(can_earn_stars)

        if(Array.isArray(interaction_type)){
            //Multiple types are included in this trial, which should be included in the instructions.
            for(let i = 0; i < interaction_type.length; i++) {
                if(interaction_type[i].includes("ask_")){
                    interaction_type = "ask"
                    break
                }
            }

            if(interaction_type!== "ask"){
                interaction_type = "multiple"
            }
        }
        if(interaction_type.includes("ask_")){
            interaction_type = "ask"
        }

        //Clearing any previous instructions
        clear_instructions()

        //Creating the basic elements
        CurrentInstructionsSVG = create_basic_instruction_elements()

        //Append to page
        ParentElem.appendChild(CurrentInstructionsSVG)

        //Show instructions layer
        ParentElem.style.display = "inherit"

        let task_type_text, Fennimal_state_text, verb_text, ask_insert_text = "", verb_text_present
        switch(interaction_type) {
            case("polaroid_photo_active"): task_type_text = "It's time to check in on the Fennimals. Let's go take some photos of them! "; Fennimal_state_text = " need to be checked in on."; verb_text = "photographed"; verb_text_present = "photograph"; break
            case("polaroid_photo_passive"): task_type_text = "It's time to check in on the Fennimals. Let's go take some photos of them! "; Fennimal_state_text = " need to be checked in on."; verb_text = "photographed"; verb_text_present = "photograph"; break
            case("give_food_active"): task_type_text = "It's dinner time for the Fennimals. Let's go out and give them some food! "; Fennimal_state_text = " are hungry."; verb_text = "fed"; verb_text_present = "feed"; break
            case("give_food_passive"): task_type_text = "It's dinner time for the Fennimals. Let's go out and give them some food! "; Fennimal_state_text = " are hungry."; verb_text = "fed"; verb_text_present = "feed"; break
            case("play_with_toy_active"): task_type_text = "The Fennimals are getting a bit bored. Let's go play with them! "; Fennimal_state_text = " are bored."; verb_text = "played with"; verb_text_present = "play with"; break
            case("play_with_toy_passive"): task_type_text = "The Fennimals are getting a bit bored. Let's go play with them! "; Fennimal_state_text = " are bored."; verb_text = "played with"; verb_text_present = "play with"; break
            case("multiple"): task_type_text = "It's time to visit some more Fennimals! "; Fennimal_state_text = " are waiting for you."; verb_text = "interacted with"; verb_text_present = "interact_with"; break
            case("ask"): task_type_text = "Time for some questions! "; Fennimal_state_text = " are waiting for you."; verb_text = "interacted with"; verb_text_present = "interact with"; ask_insert_text = " When visiting these Fennimals, there will be some questions for you to answer. "; break
        }

        //Setting all the text here
        document.getElementById("Instructions_Title").innerHTML = "Day " + current_block_num + ": time to visit some Fennimals!"

        let can_earn_stars_text = "", text_y = 100, text_h = 500
        if(can_earn_stars){
            continue_button_time =  continue_button_time + num_bonus_stars_per_question * 500
            const dx = 0.08 * GenParam.SVG_width
            const center = 0.5 * GenParam.SVG_width
            const AllXpos = {
                1: [center],
                2: [center - 0.5*dx, center + 0.5 * dx],
                3: [center - dx,center, center +  dx],
                4: [center - 1.5*dx,center - 0.5*dx, center + 0.5 * dx, center + 1.5 * dx],
                5: [center - 2*dx,center - dx,center, center +  dx, center + 2*dx],
            }
            const starpos = AllXpos[num_bonus_stars_per_question]

            for(let i =0;i<num_bonus_stars_per_question; i++){
                setTimeout(function(){
                    show_bonus_star_on_screen(ParentElem, starpos[i], 0.48 * GenParam.SVG_height, true, "deletable_bonus_star", 1, undefined)
                },(i+1)*300)
            }
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned

            let numtext = "a bonus star"
            if(num_bonus_stars_per_question > 1){
                numtext = num_bonus_stars_per_question + " bonus stars"
            }
            can_earn_stars_text = "<b> Please answer carefully, as you will earn " + numtext + " for each question you correctly answer! </b><br><br><br><br><br>";
            text_y = 100
            text_h = 700
        }

        let Fennefinder_text = ""
        if(fennefinder_status === true){
            Fennefinder_text = "The Fennefinder on the bottom-right of the screen will help guide you to the different Fennimals. "
        }
        if(fennefinder_status === "low_power_mode"){
            Fennefinder_text = "Unfortunately, the Fennefinder has run out of battery - so you'll have to find all Fennimals by memory! "
        }

        let instruction_text = task_type_text + "To help speed things up, you will be driven across the island (you won't have to walk yourself). " +
            "You will then " + verb_text + " the Fennimals one at a time. " + ask_insert_text +
            "You will then be taken to the next Fennimal until you have " + verb_text + " all " + Fennimals_in_phase_Array.length + " Fennimals which " + Fennimal_state_text +" <br><br>" +
            can_earn_stars_text +
            Fennefinder_text + "<br>" + "<i>Tip: don't know where to go next? Try climbing the watchtower!</i>"

        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 100, text_y, (1920 - 2 * 100), text_h, "instruction_element_text")
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground")
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px"
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

        //Updating the number of days in the progress bar
        update_progress_new_day(current_block_num)

        //Adding the closing button the bottom of the page
        function delete_bonus_star_icons(){
            let Stars = document.getElementsByClassName("deletable_bonus_star")
            while(Stars.length > 0){
                Stars[0].remove()
            }
        }
        //Adding the closing button the bottom of the page=
        add_closing_button_to_Parent(close_button_pos, false, delete_bonus_star_icons, continue_button_time)



    }

    //MATCH HEAD TO REGION TASK
    ///////////////////////////
    let HeadToRegionTaskData, current_head_to_region_task_pagenumber, number_of_pages_in_head_to_region_task
    this.start_match_head_to_region_task = function (phasenum, TaskData) {
        HeadToRegionTaskData = TaskData
        current_head_to_region_task_pagenumber = 0
        number_of_pages_in_head_to_region_task = TaskData.length
        show_match_head_to_region_instructions(phasenum)

    }

    function show_match_head_to_region_instructions(phasenum) {
        current_instruction_type = "match_head_to_region"

        //Clearing any previous instructions
        clear_instructions()
        CurrentInstructionsSVG = create_basic_instruction_elements()
        ParentElem.appendChild(CurrentInstructionsSVG)
        ParentElem.style.display = "inherit"
        document.getElementById("Instructions_Title").innerHTML = "Day " + phasenum + " : which Fennimals did you see where?"

        let instruction_text = "Text here"
        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 100, 300, (1920 - 2 * 100), 500, "instruction_element_text")
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground")
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px"
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

        //Updating the number of days in the progress bar
        update_progress_new_day(phasenum)
        that.update_progress_within_day(false)

        //Add the start button
        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 40)
        CurrentInstructionsSVG.appendChild(ContinueButton)
        ContinueButton.onpointerdown = function () {
            show_match_head_to_region_next_page(phasenum);
            AudioCont.play_sound_effect("button_click")
        }


    }

    function show_match_head_to_region_next_page(phasenum) {
        clear_instructions()

        if (HeadToRegionTaskData.length > 0) {
            let Task = HeadToRegionTaskData.shift()

            //Show the next day
            current_head_to_region_task_pagenumber++
            CurrentInstructionsSVG = create_basic_instruction_elements()
            ParentElem.appendChild(CurrentInstructionsSVG)
            ParentElem.style.display = "inherit"

            update_progress_new_day(phasenum)
            that.update_progress_within_day(current_head_to_region_task_pagenumber / number_of_pages_in_head_to_region_task)

            //Now show the actual task
            let TaskController = new HeadToRegionTask(CurrentInstructionsSVG, Task)


        } else {
            //Task finished!

        }

    }

    HeadToRegionTask = function (Parent, Data) {
        let number_of_spots_in_target = Data.target_Fennimal_ids.length
        let number_of_attempts = 0

        //Creating the foreign elements to hold everything, as well as their container divs
        let ForeignTargetArea = create_SVG_foreignElement(0.25 * GenParam.SVG_width, 0.125 * GenParam.SVG_height, 0.5 * GenParam.SVG_width, 0.2 * GenParam.SVG_height, undefined, undefined)
        Parent.appendChild(ForeignTargetArea)

        let TargetContainer = document.createElement("div")
        TargetContainer.style.width = "100%"
        TargetContainer.style.height = "100%"
        TargetContainer.style.display = "flex"
        TargetContainer.style.alignItems = "center"
        TargetContainer.style.justifyContent = "center"
        TargetContainer.style.border = "3px dashed black"
        TargetContainer.style.background = "white"
        TargetContainer.style.borderRadius = "30px"

        ForeignTargetArea.appendChild(TargetContainer)

        let ForeignReservoirArea = create_SVG_foreignElement(0.1 * GenParam.SVG_width, 0.35 * GenParam.SVG_height, 0.8 * GenParam.SVG_width, 0.4 * GenParam.SVG_height, undefined, undefined)
        Parent.appendChild(ForeignReservoirArea)

        let ReservoirContainer = document.createElement("div")
        ReservoirContainer.style.width = "100%"
        ReservoirContainer.style.height = "100%"
        ReservoirContainer.style.display = "flex"
        ReservoirContainer.style.flexWrap = "Wrap"
        ReservoirContainer.style.alignItems = "center"
        ReservoirContainer.style.justifyContent = "center"
        ForeignReservoirArea.appendChild(ReservoirContainer)

        //Placeholder for the empty target box
        let PlaceholderElement = document.createElement("div")
        PlaceholderElement.innerHTML = "Click on a head to move them here. <br>Once you have selected all heads you think are in this region, then press the button to check your answers"
        PlaceholderElement.style.fontSize = "35px"
        PlaceholderElement.style.fontStyle = "italic"
        PlaceholderElement.style.color = "dimgray"
        PlaceholderElement.style.textAlign = "center"
        TargetContainer.appendChild(PlaceholderElement)

        //Adding the check and continue buttons
        let CheckButton = create_SVG_buttonElement(0.30 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Check answer", 40)
        Parent.appendChild(CheckButton)
        CheckButton.onpointerdown = function () {
            check_all_card_positions();
            AudioCont.play_sound_effect("button_click")
        }

        let ContinueButton = create_SVG_buttonElement(0.70 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 40)
        Parent.appendChild(ContinueButton)
        ContinueButton.onpointerdown = function () {
            AudioCont.play_sound_effect("button_click")
        }
        ContinueButton.style.display = "none"

        //Defining the card functions
        let CardSettings = {
            width: 175,
            height: 175,
            default_background: "lightgray",
            incorrect_background: "darkred"
        }

        Card = function (Reservoir, Target, FenObj, Controller) {
            //Creating the card
            let CardContainer, current_position, SVGObj
            let card_background_if_correct = "lightgray"//GenParam.RegionData[FenObj.region].lighter_color
            let card_is_frozen = false

            function set_card_container() {
                CardContainer = document.createElement("div")
                CardContainer.style.width = CardSettings.width + "px"
                CardContainer.style.height = CardSettings.height + "px"
                CardContainer.style.background = CardSettings.default_background
                CardContainer.style.margin = "2px"
                CardContainer.style.marginBottom = 0
                CardContainer.style.cursor = "pointer"
                CardContainer.classList.add("HeadToRegionCard_Reservoir")
                CardContainer.style.border = "5px solid dimgray"
                CardContainer.style.borderRadius = "40px"

                //Creating the SVG to hold the icon
                SVGObj = document.createElementNS("http://www.w3.org/2000/svg", "svg")
                SVGObj.style.width = "100%"
                SVGObj.style.height = "100%"
                CardContainer.appendChild(SVGObj)

                Reservoir.appendChild(CardContainer)
                current_position = "reservoir"

                //Creating the icon
                let Icon = create_Fennimal_SVG_object_head_only(FenObj, false)
                SVGObj.appendChild(Icon)

                //Resizing and translating the icon
                let scale_factor_w = 1 / (Icon.getBBox().width / CardSettings.width)
                let scale_factor_h = 1 / (Icon.getBBox().height / CardSettings.height)
                let min_scale_factor = Math.floor(Math.min(scale_factor_w, scale_factor_h) * 100) / 100

                //Applying to the Fennimal icon scale group
                let ScaleGroup = Icon.getElementsByClassName("Fennimal_scale_group")[0]
                ScaleGroup.style.transform = "scale(" + min_scale_factor + ")"

                //Translation. This depends on whether there is a name. If no, center icon in the middle of the card. If yes, align it to the top instead
                let NewBox = Icon.getBBox()
                let TargetCenter = {x: Math.round(0.5 * CardSettings.width), y: Math.round(0.5 * CardSettings.height)}
                let delta_x = TargetCenter.x - (NewBox.x + 0.5 * NewBox.width)
                let delta_y = TargetCenter.y - (NewBox.y + 0.5 * NewBox.height)
                Icon.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

                //Setting grayscale
                SVGObj.style.filter = "grayscale(100%)"

                CardContainer.onpointerdown = change_card_position


            }

            set_card_container()

            function change_card_position() {
                if (!card_is_frozen) {
                    if (current_position === "reservoir") {
                        if (Controller.can_card_be_moved_to_target()) {
                            CardContainer.remove()
                            TargetContainer.appendChild(CardContainer)
                            current_position = "target"
                            CardContainer.classList.remove("HeadToRegionCard_Reservoir")
                            AudioCont.play_sound_effect("card_placed")

                        } else {
                            AudioCont.play_sound_effect("rejected")
                        }
                    } else {
                        CardContainer.remove()
                        ReservoirContainer.appendChild(CardContainer)
                        current_position = "reservoir"
                        CardContainer.classList.add("HeadToRegionCard_Reservoir")
                        CardContainer.style.background = CardSettings.default_background
                        SVGObj.style.filter = "grayscale(100%)"
                        AudioCont.play_sound_effect("card_placed")

                    }

                    Controller.card_positions_changed()
                }

            }

            this.get_current_position = function () {
                return (current_position)
            }

            this.show_card_incorrect = function () {
                CardContainer.style.background = CardSettings.incorrect_background
                SVGObj.style.filter = "grayscale(100%)"
            }
            this.show_card_correct = function () {
                SVGObj.style.filter = "none"
                CardContainer.style.background = card_background_if_correct
            }

            this.get_card_Fennimal_ID = function () {
                return (FenObj.id)
            }

            this.freeze_in_position = function () {
                card_is_frozen = true
            }

        }

        //Called when a card has been moved to a different box
        this.card_positions_changed = function () {
            //check if there is a card in the target. If not, show the placeholder
            let target_empty = true
            for (let i = 0; i < CardControllerArray.length; i++) {
                if (CardControllerArray[i].get_current_position() === "target") {
                    target_empty = false
                }
            }

            if (target_empty) {
                TargetContainer.appendChild(PlaceholderElement)
            } else {
                PlaceholderElement.remove()
            }


        }

        function freeze_all_cards() {
            for (let i = 0; i < CardControllerArray.length; i++) {
                CardControllerArray[i].freeze_in_position()
            }
        }

        function check_all_card_positions() {
            let answers_correct = true

            for (let i = 0; i < CardControllerArray.length; i++) {
                let card_position = CardControllerArray[i].get_current_position()
                let card_id = CardControllerArray[i].get_card_Fennimal_ID()

                //Now check if this card was placed incorrectly
                if (card_position === "target") {
                    if (!Data.target_Fennimal_ids.includes(card_id)) {
                        answers_correct = false
                        CardControllerArray[i].show_card_incorrect()
                    } else {
                        CardControllerArray[i].show_card_correct()
                    }
                } else {
                    if (Data.target_Fennimal_ids.includes(card_id)) {
                        answers_correct = false
                    }
                }


            }

            if (answers_correct) {
                ContinueButton.style.display = "inherit"
                CheckButton.style.display = "none"
                freeze_all_cards()
            } else {
                number_of_attempts++
            }

        }

        //Check if the card can be moved (that is, if there are empty spots
        this.can_card_be_moved_to_target = function () {
            let number_of_cards_now_in_target = 0
            for (let i = 0; i < CardControllerArray.length; i++) {
                if (CardControllerArray[i].get_current_position() === "target") {
                    number_of_cards_now_in_target++
                }
            }
            return (number_of_cards_now_in_target < number_of_spots_in_target)

        }

        //Creating all the objects in the reservoir (in random order)
        let CardControllerArray = []
        shuffleArray(Data.Fennimal_Object_Arr)
        for (let i = 0; i < Data.Fennimal_Object_Arr.length; i++) {
            CardControllerArray.push(new Card(ReservoirContainer, TargetContainer, Data.Fennimal_Object_Arr[i], this))
        }

    }

    // SORTING TASKS
    ////////////////////////////////////

    this.start_head_to_region_sorting_task = function (phasenum, TaskData) {
        current_instruction_type = "match_head_to_region"

        //Clearing any previous instructions
        clear_instructions()
        CurrentInstructionsSVG = create_basic_instruction_elements()
        ParentElem.appendChild(CurrentInstructionsSVG)
        ParentElem.style.display = "inherit"
        document.getElementById("Instructions_Title").innerHTML = "Day " + phasenum + " : sorting the different Fennimals"

        let instruction_text = "Do you remember where you saw all the different Fennimals? <br>" +
            "<br>" +
            "Today you will be tasked with sorting all the different Fennimals you encountered so far. On the next page you will find different boxes, one for each region of the island. " +
            "On the top you will see the head of a Fennimal. " +
            "Please place this head in the box associated to the region in which you encountered this Fennimal. " +
            "You will then see a next head, and so forth - until you have placed all the Fennimals in their home region."
        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 0.1 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, 0.8 * GenParam.SVG_width, 0.5 * GenParam.SVG_height, "instruction_element_text")
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground")
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px"
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

        //Updating the number of days in the progress bar
        update_progress_new_day(phasenum)
        that.update_progress_within_day(false)

        //Add the start button
        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 40)
        CurrentInstructionsSVG.appendChild(ContinueButton)
        ContinueButton.onpointerdown = function () {
            start_head_to_region_sorting_task(phasenum, TaskData);
            AudioCont.play_sound_effect("button_click")
        }
    }

    function start_head_to_region_sorting_task(phasenum, TaskData) {
        //Clearing any previous instructions
        clear_instructions()
        CurrentInstructionsSVG = create_basic_instruction_elements()
        ParentElem.appendChild(CurrentInstructionsSVG)
        ParentElem.style.display = "inherit"
        document.getElementById("Instructions_Title").innerHTML = "Please move each Fennimal to the region of Fenneland in which you saw it"

        //Updating the number of days in the progress bar
        update_progress_new_day(phasenum)
        that.update_progress_within_day(0)

        let HeadToRegionSortCont = new HeadRegionSortingTask(CurrentInstructionsSVG, TaskData, that, completed_sorting_task)
    }

    function completed_sorting_task(Data) {
        clear_instructions()
        ExpCont.sorting_task_completed(Data)
    }

    this.start_Fennimal_attribute_sorting_task = function(phasenum, TaskData, attributes_arr, max_earnable_stars){
        current_instruction_type = "match_head_to_region"

        //Clearing any previous instructions
        clear_instructions()
        CurrentInstructionsSVG = create_basic_instruction_elements()
        ParentElem.appendChild(CurrentInstructionsSVG)
        ParentElem.style.display = "inherit"
        document.getElementById("Instructions_Title").innerHTML = "Day " + phasenum + " : do you remember the Fennimals you just encountered?"


        let task_instruction = "On the next page you will see " + TaskData.length +  " different boxes, each for a different Fennimal. " +
            "On the top of the page you will see a set of smaller boxes, each containing a different piece of information. " +
            "Your task is to match each of these smaller boxes with the correct Fennimal by dragging the smaller boxes to the correct larger box." +
            "Once you have placed all smaller boxes they will be replaced with a different set of information until you have completed all questions. "
        if(attributes_arr.includes("name")){
            task_instruction = "On the next page you be asked a set of questions. " +
                "First, you will be asked to write down the names of all " + TaskData.length +  " Fennimals you encountered yesterday. " +
                "Then  a set of smaller boxes will appear on the top of the page, each containing a different piece of information. " +
                "Your task is to match each of these smaller boxes with the correct Fennimal." +
                "Once you have placed all smaller boxes they will be replaced with a different set of information until you have completed all questions. "
        }

        let reward_instruction = ""
        if(max_earnable_stars > 0){
            show_bonus_star_on_screen(CurrentInstructionsSVG,0.5*GenParam.SVG_width, 0.52 * GenParam.SVG_height, true)
            reward_instruction = "<br><br><br><br><br>Please pay close attention while answering the questions. You will start the day with " + max_earnable_stars + " bonus stars - but you will lose one star for each mistake you make!"
        }

        let instruction_text = task_instruction + reward_instruction
        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 0.1 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, 0.8 * GenParam.SVG_width, 0.6 * GenParam.SVG_height, "instruction_element_text")
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground")
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px"
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

        //Updating the number of days in the progress bar
        update_progress_new_day(phasenum)
        that.update_progress_within_day(false)

        //If stars can be earned, change the background color
        if(max_earnable_stars !== undefined && max_earnable_stars !== false && max_earnable_stars > 0) {
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned
        }

        //Add the start button
        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 40)
        CurrentInstructionsSVG.appendChild(ContinueButton)
        ContinueButton.onpointerdown = function () {
            start_Fennimal_attribute_sorting_task(phasenum, TaskData, attributes_arr, max_earnable_stars);
            AudioCont.play_sound_effect("button_click")
        }

    }

    function start_Fennimal_attribute_sorting_task(phasenum, TaskData, attributes_arr, max_earnable_stars) {
        //Clearing any previous instructions
        clear_instructions()
        CurrentInstructionsSVG = create_basic_instruction_elements()
        ParentElem.appendChild(CurrentInstructionsSVG)
        ParentElem.style.display = "inherit"
        //document.getElementById("Instructions_Title").innerHTML = "Please move each Fennimal to the region of Fenneland in which you saw it"
        //Updating the number of days in the progress bar
        update_progress_new_day(phasenum)
        that.update_progress_within_day(0)

        //If stars can be earned, change the background color
        if(max_earnable_stars !== undefined && max_earnable_stars !== false && max_earnable_stars > 0) {
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned
        }


        let HeadToRegionSortCont = new FennimalAttributeSortingTask(CurrentInstructionsSVG, document.getElementById("Instructions_Title"),  TaskData, attributes_arr, max_earnable_stars, that, completed_sorting_task)
    }

    //CARD SORTING TASK
    ///////////////////////

    this.start_card_sorting_task = function (current_block_num, SpecialSettings) {
        current_instruction_type = "card_sorting_task"

        //Show the instructions background as usual
        clear_instructions()

        CurrentInstructionsSVG = create_SVG_group(0, 0, undefined, undefined)
        ParentElem.appendChild(CurrentInstructionsSVG)
        ParentElem.style.display = "inherit"

        let CardSortCont = new CARDSORTINGTASK(current_block_num, ParentElem, Stimuli, this.card_sorting_task_completed, SpecialSettings)
        let ProgressElem = create_progress_elements()
        ProgressElem.setAttribute("y", 1025)
        ProgressElem.style.opacity = 0.5
        ParentElem.appendChild(ProgressElem)

        update_progress_new_day(current_block_num)
        this.update_progress_within_day(false)


    }
    this.card_sorting_task_completed = function (Data) {
        ExpCont.card_sorting_task_complete(Data)

    }

    //WAREHOUSE TASKS
    this.start_warehouse_task = function(PhaseData,daynum, outputfun){
        //Show the warehouse task instructions
        current_instruction_type = "warehouse_task"

        //Clearing any previous instructions
        clear_instructions()
        CurrentInstructionsSVG = create_basic_instruction_elements()
        ParentElem.appendChild(CurrentInstructionsSVG)
        ParentElem.style.display = "inherit"
        let partner_name = WorldState.get_partner_icon_settings().name
        document.getElementById("Instructions_Title").innerHTML = "Day " + daynum + ": collect some items at the warehouse"
        const can_earn_stars = PhaseData.bonus_stars_per_correct_answer > 0
        let text_y = 0.5 * GenParam.SVG_height
        let button_appear_time = 500

        let instruction_text = "Today we will go to warehouse to collect some things that the Fennimals will need. While collecting these items, you will be asked to answer some questions."

        if(can_earn_stars){
            text_y = 0.2 * GenParam.SVG_height
            button_appear_time = 500 + 500 * PhaseData.bonus_stars_per_correct_answer
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned
            instruction_text = instruction_text + "<br><br>Please pay close attention to these questions and take your time to think about your answer! For each question you correctly answer, you will earn "
            if(PhaseData.bonus_stars_per_correct_answer === 1){
                instruction_text = instruction_text + " a bonus star!"
            }else{
                instruction_text = instruction_text + PhaseData.bonus_stars_per_correct_answer + " bonus stars!"
            }

            //Now we display the number of bonus stars.
            let center = 0.5*GenParam.SVG_width
            let dx = 0.1 * GenParam.SVG_width
            let AllStarPos  = {
                1: [center],
                2: [center - 0.5*dx, center + 0.5*dx],
                3: [center - dx, center, center + dx],
                4: [center - 1.5*dx,center - 0.5*dx, center + 0.5*dx, center + 1.5*dx],
                5: [center - 2*dx,center - dx, center, center + dx, center + 2*dx],
            }
            let star_x_pos = AllStarPos[PhaseData.bonus_stars_per_correct_answer]

            for(let i = 0; i<PhaseData.bonus_stars_per_correct_answer; i ++){
                //new Animated_Starburst_star(CurrentInstructionsSVG, star_x_pos[i], 0.6 * GenParam.SVG_height, )
                setTimeout(function(){
                    show_bonus_star_on_screen(CurrentInstructionsSVG,star_x_pos[i], 0.6 * GenParam.SVG_height, true,undefined,1.25,undefined)
                }, i * 500)

            }

        }


        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 0.1 * GenParam.SVG_width, text_y, 0.8 * GenParam.SVG_width, 0.5 * GenParam.SVG_height, "instruction_element_text")
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground")
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px"
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions)

        //Updating the number of days in the progress bar
        update_progress_new_day(daynum)
        that.update_progress_within_day(false)

        //Add the start button
        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 40)
        setTimeout(function(){
            CurrentInstructionsSVG.appendChild(ContinueButton)
            ContinueButton.onpointerdown = function () {
                start_warehouse_task(PhaseData, outputfun)
                clear_instructions()
                AudioCont.play_sound_effect("button_click")
            }

        },button_appear_time)


    }
    function start_warehouse_task(PhaseData, outputfun){
        let WarehouseController = new ItemsCollectionFromWarehouseController(PhaseData, outputfun)
    }

    //PSEUDODAY CARDS
    ////////////////////
    this.show_pseudo_day_information_page = function(information_type,title, text, OptionalInformation) {
        //Modifying text (if any is provided)
        if(typeof text !== "undefined") {
            text = text.replaceAll("%PARTNERNAME%", WorldState.get_partner_icon_settings().name)
        }

        //Clearing any previous instructions
        clear_instructions()
        CurrentInstructionsSVG = create_basic_instruction_elements()
        ParentElem.appendChild(CurrentInstructionsSVG)
        ParentElem.style.display = "inherit"
        show_empty_page(true)
        AudioCont.play_sound_effect("alert")

        //Contents of the card depend on the type of information
        if(information_type === "partner_leaves" || information_type === "partner_returns"){
            //Getting partner details
            let Partner = WorldState.get_partner_icon_settings(), pronoun = "he", pronounC = "He", posses = "his"
            if(Partner.type === "female") {pronoun = "she"; pronounC = "She", posses = "her"}

            //Setting the title
            let title
            if(information_type === "partner_leaves"){
                if(typeof Partner.name !== "undefined"){
                    title = Partner.name + " has left the island"
                }else{
                    title = "Your partner has left the island"
                }
            }
            if(information_type === "partner_returns"){
                if(typeof Partner.name !== "undefined"){
                    title = Partner.name + " has returned to the island!"
                }else{
                    title = "Your partner has returned to the island!"
                }
            }
            document.getElementById("Instructions_Title").innerHTML = title

            //Setting the text on the left-hand side
            let text
            if(information_type === "partner_leaves"){
                if(typeof Partner.name !== "undefined"){
                    text = Partner.name + " has to attend some classes away from the island. Until further notice, " + pronoun + " will not be present while you take care of the Fennimals.  " +
                        pronounC + " will not learn what will happen on the island for the duration of the time that " + pronoun + " will be gone."
                }else{
                    text = "Your partner has to attend some classes away from the island. Until further notice, " + pronoun + " will not be present while you take care of the Fennimals.  " +
                        pronounC + " will not learn what will happen on the island for the duration of the time that " + pronoun + " will be gone."
                }
            }
            if(information_type === "partner_returns"){
                if(typeof Partner.name !== "undefined"){
                    text = Partner.name + " has returned from " + posses + " classes away from the island. " + pronounC + " has only just stepped of the boat, and has not been told about anything that happened on the island while " +
                        pronoun + " was away."
                }else{
                    text = "Your partner has returned from " + posses + " classes away from the island. " + pronounC + " has only just stepped of the boat, and has not been told about anything that happened on the island while " +
                        pronoun + " was away."
                }
            }
            let TextObj = create_SVG_text_in_foreign_element(text, 0.05 * GenParam.SVG_width, 0.3 * GenParam.SVG_height, 0.4 * GenParam.SVG_width, 0.3 * GenParam.SVG_height, undefined,undefined)
            TextObj.style.fontSize = "40px"
            CurrentInstructionsSVG.appendChild(TextObj)

            //Determining direction
            let direction
            if(information_type === "partner_leaves"){direction = "right"}
            if(information_type === "partner_returns"){direction = "left"}

            //Showing arrow
            let ArrowSVG = document.getElementById("block_arrow_left").cloneNode(true);
            let AZeroT = create_SVG_group(0,0,undefined, undefined)
            let Scale =  create_SVG_group(0,0,undefined, undefined)
            let Inv = create_SVG_group(0,0,undefined, undefined)
            let Trans = create_SVG_group(0,0,undefined, undefined)
            AZeroT.appendChild(ArrowSVG)
            Scale.appendChild(AZeroT)
            Inv.appendChild(Scale)
            Trans.appendChild(Inv)
            CurrentInstructionsSVG.appendChild(Trans)

            ArrowSVG.style.display = "inherit"
            AZeroT.style.transform = "translate(" + (-getSVGInternalCenter(AZeroT).x) + "px, " + (-getSVGInternalCenter(AZeroT).y) + "px)";
            Scale.style.transform = "scale(2.5)"
            if(direction === "left"){Inv.style.transform = "scaleX(-1)"}
            Trans.style.transform = "translate(" + (0.75*GenParam.SVG_width) + "px, " + (0.45 * GenParam.SVG_height)+ "px)";
            ArrowSVG.style.opacity = 0.5
            ArrowSVG.classList.add("focus_on_SVG_fill")

            //Adding partner icon
            let IconSVG = WorldState.get_person_icon("partner", direction)
            IconSVG.style.transform = "scale(15)"
            let IconTranslateGroup  = create_SVG_group(0,0,undefined,undefined);
            let IconAnimationGroup = create_SVG_group(0,0,undefined,undefined);

            IconTranslateGroup.appendChild(IconSVG);
            IconAnimationGroup.appendChild(IconTranslateGroup);
            CurrentInstructionsSVG.appendChild(IconAnimationGroup);
            moveSVGCenterTo(IconTranslateGroup, 0.6 * GenParam.SVG_width, 0.5 * GenParam.SVG_height)
            if(information_type === "partner_leaves"){IconAnimationGroup.classList.add("pseudoday_player_icon_leaving_island_translate_group")}
            if(information_type === "partner_returns"){IconAnimationGroup.classList.add("pseudoday_player_icon_returning_to_island_translate_group")}


            //Continue button
            let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.875 * GenParam.SVG_height, 400, 75, "Continue", 40)
            ContinueButton.onpointerdown = function (event) {
                ExpCont.general_instructions_page_completed()
                //CurrentInstructionsSVG.remove()
            }
            CurrentInstructionsSVG.appendChild(ContinueButton)


        }

        if(information_type === "new_Fennimals_spotted"){
            let text_w = 0.9 * GenParam.SVG_width, text_y = 0.4 * GenParam.SVG_height, text_align = "center"
            if(typeof OptionalInformation !== "undefined"){
                text_w = 0.4 * GenParam.SVG_width
                text_y = 0.3 * GenParam.SVG_height
                text_align = "left"
            }
            document.getElementById("Instructions_Title").innerHTML = title
            let TextObj = create_SVG_text_in_foreign_element(text, 0.05 * GenParam.SVG_width, text_y, text_w, 0.3 * GenParam.SVG_height, undefined,undefined)
            TextObj.style.textAlign = text_align
            TextObj.style.fontSize = "40px"
            CurrentInstructionsSVG.appendChild(TextObj)

            //Show the continue button
            let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.875 * GenParam.SVG_height, 400, 75, "Continue", 40)
            ContinueButton.onpointerdown = function (event) {
                ExpCont.general_instructions_page_completed()
            }
            CurrentInstructionsSVG.appendChild(ContinueButton)

            //Optionally display the icons here (currently supports up X icons)
            let AllIconPositions = {
                1: [{x: 0, y: 0, rotation: 10}],
                2: [
                    {x: 100, y: 0, rotation: 10},
                    {x: -100, y: 0, rotation: -10}
                ],
                3: [
                    {x: 0, y: 0, rotation: 5},
                    {x: 200, y: 0, rotation: 10},
                    {x: -200, y: 0, rotation: -10}
                ],
                4: [
                    {x: 200, y: 0, rotation: -10},
                    {x: -200, y: 0, rotation: 10},
                    {x: -75, y: -50, rotation: 0},
                    {x: 150, y: 150, rotation: -10},
                ],
                5: [
                    {x: 250, y: 0, rotation: -10},
                    {x: -250, y: 0, rotation: 10},
                    {x: -75, y: -50, rotation: 0},
                    {x: 150, y: 150, rotation: -10},
                    {x: -150, y: 150, rotation: 10},
                ]
            }
            let icon_move_positions = AllIconPositions[OptionalInformation.length]
            if(typeof OptionalInformation !== "undefined"){
                let IconScreenStartCoords = {x:  0.85 * GenParam.SVG_width , y: 0.4 * GenParam.SVG_height}
                for(let iconnum = 0; iconnum < OptionalInformation.length; iconnum++){
                    let GroupTranslate = create_SVG_group(0,0,undefined,undefined);
                    let GroupRotate = create_SVG_group(0,0,undefined,undefined);
                    let GroupScale = create_SVG_group(0,0,undefined,undefined);
                    GroupRotate.appendChild(GroupScale);
                    GroupTranslate.appendChild(GroupRotate);
                    CurrentInstructionsSVG.appendChild(GroupTranslate);

                    //Adding the frame
                    let Frame = copy_scale_and_move_object_to_position(document.getElementById("polaroid_frame"), GroupScale, IconScreenStartCoords.x, IconScreenStartCoords.y, 1)
                    Frame.getElementsByTagName("rect")[0].style.fill = GenParam.RegionData[OptionalInformation[iconnum].region].surrounding_color
                    Frame.getElementsByTagName("rect")[0].style.display = "inherit"
                    Frame.getElementsByTagName("text")[0].childNodes[0].innerHTML = OptionalInformation[iconnum].name
                    let TargetCircle = getSVGInternalCenter(Frame.getElementsByTagName("circle")[0])

                    //Adding the Fennimal
                    let Icon = create_Fennimal_SVG_object(OptionalInformation[iconnum], GenParam.Fennimal_head_size, true)
                    GroupScale.appendChild(Icon)
                    let FennimalScaleGroup = Icon.getElementsByClassName("Fennimal_scale_group")[0]
                    let Box = Icon.getBBox()
                    let delta_x = (TargetCircle.x) - (Box.x + 0.5 * Box.width)
                    let delta_y = (TargetCircle.y) - (Box.y + 0.5 * Box.height) + 50

                    let FrameBox = Frame.getElementsByTagName("rect")[0].getBBox()
                    let scale_factor_w = 1 / (Box.width / FrameBox.width)
                    let scale_factor_h = 1 / (Box.height / FrameBox.height)
                    let min_scale_factor = Math.floor(Math.min(scale_factor_w, 0.8 * scale_factor_h) * 100) / 100

                    FennimalScaleGroup.style.transform = "scale(" + min_scale_factor + ")"
                    Icon.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

                    //Rescaling, rotating and setting transform to the box
                    GroupScale.style.transformOrigin = "center"
                    GroupRotate.style.transformOrigin =  (.6 * GenParam.SVG_width)  + "px " + (0.4 * GenParam.SVG_height) + "px"
                    GroupScale.style.transform = "scale(0.5)"
                    GroupTranslate.style.transition = "all 500ms ease-in-out"
                    GroupRotate.style.transition = "all 500ms ease-in-out"

                    if(iconnum < icon_move_positions.length){
                        GroupRotate.style.transform = "rotate(" + icon_move_positions[iconnum].rotation + "deg)"
                        GroupTranslate.style.transform = "translate(" + icon_move_positions[iconnum].x + "px, " + icon_move_positions[iconnum].y + "px)"
                    }

                }
            }

        }
    }

    //QUIZ FUNCTIONS
    ///////////////////

    let CurrentQuizQuestion, CurrentSubQuestions, QuizAnswerButton, QuizFinishButton,
        flag_quiz_instructions_given = false
    this.show_quiz_instructions = function (current_block_num, QuizData) {
        current_instruction_type = "quiz"

        //Show the instructions background as usual
        clear_instructions()
        CurrentInstructionsSVG = create_basic_instruction_elements()
        ParentElem.appendChild(CurrentInstructionsSVG)
        ParentElem.style.display = "inherit"

        //Updating the progress bar elements
        update_progress_new_day(current_block_num)
        this.update_progress_within_day(false)

        //Determining some variables about the instructions contents
        let perfect_answers_required = false
        if (typeof QuizData.require_perfect_answers !== "undefined") {
            if (QuizData.require_perfect_answers) {
                perfect_answers_required = true
            }
        }
        let can_earn_stars = false
        if (typeof QuizData.award_star_for_correct_answer !== "undefined") {
            if (QuizData.award_star_for_correct_answer) {
                can_earn_stars = true
            }
        }
        let can_travel_island = false
        if (typeof QuizData.allow_participant_to_travel_map !== "undefined") {
            if (QuizData.allow_participant_to_travel_map !== false) {
                can_travel_island = true
            }
        }

        //Adding instruction title and text
        if (can_earn_stars) {
            document.getElementById("Instructions_Title").innerHTML = "Day " + current_block_num + ": time for a quiz! (BONUS STAR DAY)"
        } else {
            document.getElementById("Instructions_Title").innerHTML = "Day " + current_block_num + ": time for a quiz!"
        }

        let instructions_text = "Well done! You're well on your way towards becoming an expert on the Fennimals on the island. " +
            "Before we continue, we will first give you a quiz to review what you've learned so far. <br>" +
            "<br>" +
            "The quiz will consist of " + QuizData.questions.length + " pages, each containing questions about a specific Fennimal. " +
            "You can select an answer to each question either by typing or by selecting an option from the drop-down menu next to the question. "

        if (perfect_answers_required) {
            instructions_text = instructions_text + " If you make any mistakes on a page, then this page will come back up again later. " +
                "The quiz is finished once you have successfully answered all the questions on all the pages." +
                "<br><br>"
            ""
        } else {
            instructions_text = instructions_text + " The quiz is finished once you have answered all the questions on all the pages."
        }

        if (can_earn_stars) {
            instructions_text = instructions_text + "<br><br> You will earn one <b><span style='color: darkgoldenrod'>Star</span> </b> for each question page that you correctly answer!."

            //Adding the star icons
            show_bonus_star_on_screen(ParentElem, 0.05 * GenParam.SVG_width, 0.075 * GenParam.SVG_height, false, undefined, 0.5)
            //show_bonus_star_on_screen(ParentElem, 0.1 * GenParam.SVG_width, 0.075 * GenParam.SVG_height,  false, "quiz_question_element", 0.5)
            // show_bonus_star_on_screen(ParentElem, 0.15 * GenParam.SVG_width, 0.075 * GenParam.SVG_height,  false, "quiz_question_element", 0.5)

            // show_bonus_star_on_screen(ParentElem, 0.85 * GenParam.SVG_width, 0.075 * GenParam.SVG_height,  false, "quiz_question_element", 0.5)
            // show_bonus_star_on_screen(ParentElem, 0.9 * GenParam.SVG_width, 0.075 * GenParam.SVG_height,  false, "quiz_question_element", 0.5)
            show_bonus_star_on_screen(ParentElem, 0.95 * GenParam.SVG_width, 0.075 * GenParam.SVG_height, false, undefined, 0.5)

            show_bonus_star_on_screen(ParentElem, 0.05 * GenParam.SVG_width, 0.9 * GenParam.SVG_height, false, undefined, 0.5)
            show_bonus_star_on_screen(ParentElem, 0.95 * GenParam.SVG_width, 0.9 * GenParam.SVG_height, false, undefined, 0.5)
            //show_bonus_star_on_screen(ParentElem, 0.1 * GenParam.SVG_width, 0.9 * GenParam.SVG_height,  false, "quiz_question_element", 0.5)
            //show_bonus_star_on_screen(ParentElem, 0.15 * GenParam.SVG_width, 0.9 * GenParam.SVG_height,  false, "quiz_question_element", 0.5)

            //Adding a bit of color to the background rect
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned

        }

        if (can_travel_island) {
            instructions_text = instructions_text + "<br><br>" +
                "<b>Tip: </b>if your memory needs some refreshing, you can freely travel across the island to take another look at all the Fennimals you have so far encountered. You can do this by clicking on the 'Go to map' button and travelling to the location of each Fennimal. "
        }

        //Adding to page
        let TextElem_Instructions = create_SVG_text_in_foreign_element(instructions_text, 100, 125, (GenParam.SVG_width - 2 * 100), 500, "quiz_question_element")
        TextElem_Instructions.classList.add("instructions_element_text")
        ParentElem.appendChild(TextElem_Instructions)

        //Adding the continue button
        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 40)
        ContinueButton.classList.add("quiz_question_element")
        ParentElem.appendChild(ContinueButton)
        ContinueButton.onpointerdown = function () {
            ExpCont.quiz_instructions_closed()
            that.update_progress_within_day(0)
            AudioCont.play_sound_effect("button_click")
        }

    }

    this.show_next_quiz_question = function (QuizQuestion) {
        CurrentQuizQuestion = QuizQuestion
        //Remove any prior questions
        delete_elements_by_class_name("quiz_question_element")

        let QuestionGroup = create_SVG_group(0, 0, "quiz_question_element", undefined)
        ParentElem.appendChild(QuestionGroup)

        //Showing the question number
        document.getElementById("Instructions_Title").innerHTML = "Question " + QuizQuestion.question_num

        //Showing the cue type on the left-most third of the page
        let cue_type = QuizQuestion.cue_type
        if (QuizQuestion.cue_type.includes("icon")) {
            cue_type = "icon"
        }
        if (QuizQuestion.cue_type.includes("head")) {
            cue_type = "head"
        }

        //Check whether we need to display the Fennimal's name on the screen
        let show_name_on_screen = false
        if (typeof QuizQuestion.show_name !== "undefined") {
            if (QuizQuestion.show_name) {
                show_name_on_screen = true
            }
        }

        let FrameG, Frame, IconSVG
        switch (cue_type) {
            case("icon"):
                //Adding the photo frame
                FrameG = create_SVG_group(0, 0, undefined, undefined)
                Frame = document.getElementById("polaroid_frame").cloneNode(true)
                Frame.removeAttribute("id")
                Frame.style.transform = "translate(" + (.06 * GenParam.SVG_width) + "px, " + (0.25 * GenParam.SVG_height) + "px)"
                FrameG.style.transform = "scale(0.8)"
                QuestionGroup.appendChild(FrameG)
                FrameG.appendChild(Frame)

                //Setting the photo frame text
                if (show_name_on_screen) {
                    Frame.getElementsByClassName("polaroid_frame_name")[0].innerHTML = QuizQuestion.FenObj.name
                } else {
                    Frame.getElementsByClassName("polaroid_frame_name")[0].innerHTML = "???"
                }

                //Adding the icon
                IconSVG = create_Fennimal_SVG_object(QuizQuestion.FenObj, GenParam.Fennimal_head_size, false)

                //Transforming and scaling the icon
                IconSVG.style.transform = "translate(" + (.1 * GenParam.SVG_width) + "px, " + (0.35 * GenParam.SVG_height) + "px)"

                //If its a gray icon, then apply grayscale
                if (QuizQuestion.cue_type === "gray_icon") {
                    IconSVG.style.filter = "grayscale(100%)"
                }
                if (QuizQuestion.cue_type === "sepia_icon") {
                    IconSVG.style.filter = "sepia(100%)"
                }


                QuestionGroup.appendChild(IconSVG)
                break

            case("head"):
                //Adding the photo frame
                FrameG = create_SVG_group(0, 0, undefined, undefined)
                Frame = document.getElementById("polaroid_frame").cloneNode(true)
                Frame.removeAttribute("id")
                Frame.style.transform = "translate(" + (.06 * GenParam.SVG_width) + "px, " + (0.25 * GenParam.SVG_height) + "px)"
                FrameG.style.transform = "scale(0.8)"
                QuestionGroup.appendChild(FrameG)
                FrameG.appendChild(Frame)

                //Setting the photo frame text
                if (show_name_on_screen) {
                    Frame.getElementsByClassName("polaroid_frame_name")[0].innerHTML = QuizQuestion.FenObj.name
                } else {
                    Frame.getElementsByClassName("polaroid_frame_name")[0].innerHTML = "???"
                }


                //Adding the icon
                IconSVG = create_Fennimal_SVG_object_head_only(QuizQuestion.FenObj, false)

                //Transforming and scaling the icon
                IconSVG.style.transform = "translate(" + (.07 * GenParam.SVG_width) + "px, " + (0.3 * GenParam.SVG_height) + "px)"

                //If its a gray icon, then apply grayscale
                if (QuizQuestion.cue_type === "gray_head") {
                    IconSVG.style.filter = "grayscale(100%)"
                }
                if (QuizQuestion.cue_type === "sepia_head") {
                    IconSVG.style.filter = "sepia(100%)"
                }


                QuestionGroup.appendChild(IconSVG)
                break
        }

        //Adding the subquestions on the right two-thirds of the page
        let QuestionForeign = create_SVG_foreignElement(.35 * GenParam.SVG_width, 0.175 * GenParam.SVG_height, .6 * GenParam.SVG_width, 0.6 * GenParam.SVG_height, undefined, undefined)
        let QuestionContainer = document.createElement("div")
        QuestionContainer.style.height = "100%"
        QuestionGroup.appendChild(QuestionForeign)
        QuestionForeign.appendChild(QuestionContainer)

        CurrentSubQuestions = []
        for (let i = 0; i < QuizQuestion.subquestions.length; i++) {
            let NewSubQ = new Quiz_Subquestion(QuizQuestion.subquestions[i], this.check_if_all_questions_have_been_answered)
            QuestionContainer.appendChild(NewSubQ.getDOM())
            CurrentSubQuestions.push(NewSubQ)
        }

        //Adding a check-answer button
        QuizAnswerButton = create_SVG_buttonElement(QuestionForeign.getBBox().x + 0.5 * QuestionForeign.getBBox().width, 0.7 * GenParam.SVG_height, 400, 75, "Check answers", 40)
        QuizAnswerButton.classList.add("quiz_question_element")
        QuizAnswerButton.onpointerdown = function () {
            check_quiz_answers();
            AudioCont.play_sound_effect("button_click")
        }
        ParentElem.appendChild(QuizAnswerButton)
        QuizAnswerButton.style.display = "none"

        QuizFinishButton = create_SVG_buttonElement(QuestionForeign.getBBox().x + 0.5 * QuestionForeign.getBBox().width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 40)
        QuizFinishButton.classList.add("quiz_question_element")
        QuizFinishButton.onpointerdown = function () {
            quiz_question_completed();
            AudioCont.play_sound_effect("button_click")
        }
        ParentElem.appendChild(QuizFinishButton)
        QuizFinishButton.style.display = "none"

        //this.update_progress_within_day(percentage_quiz_completed)
    }
    Quiz_Subquestion = function (SubQuestionObj, onchangecheckfunc) {
        //Shorthand
        let fontsize = "35px"

        //Create the DOM elements
        let SubQDiv = document.createElement("div")
        SubQDiv.style.width = "100%"
        SubQDiv.style.marginBottom = "50px"

        let SubQ_MainDiv = document.createElement("div")
        let SubQ_FeedbackDiv = document.createElement("div")
        SubQ_MainDiv.style.width = "100%"

        SubQ_FeedbackDiv.style.width = "100%"
        SubQDiv.appendChild(SubQ_MainDiv)
        SubQDiv.appendChild(SubQ_FeedbackDiv)

        SubQ_FeedbackDiv.style.fontSize = fontsize
        SubQ_FeedbackDiv.style.textAlign = "center"
        SubQ_FeedbackDiv.style.fontStyle = "italic"

        //The subquestion can either be presented in_row (question next to answer) or in_column (question on top of answer)
        let SubQ_QuestionDiv = document.createElement("div"), SubQ_AnswerDiv = document.createElement("div"), InputObj

        function create_subquestion_in_row() {
            //Question text
            SubQ_QuestionDiv.style.width = "60%"
            SubQ_QuestionDiv.style.fontSize = fontsize
            SubQ_QuestionDiv.innerHTML = SubQuestionObj.question_text
            SubQ_MainDiv.appendChild(SubQ_QuestionDiv)

            SubQ_AnswerDiv.style.width = "38%"
            SubQ_MainDiv.appendChild(SubQ_AnswerDiv)
            SubQ_MainDiv.style.display = "flex"

        }

        function create_subquestion_in_column() {
            //Question text
            SubQ_QuestionDiv.style.width = "100%"
            SubQ_QuestionDiv.style.fontSize = fontsize
            SubQ_QuestionDiv.innerHTML = SubQuestionObj.question_text
            SubQ_QuestionDiv.style.marginBottom = "20px"
            SubQ_MainDiv.appendChild(SubQ_QuestionDiv)

            SubQ_AnswerDiv.style.width = "100%"
            SubQ_MainDiv.appendChild(SubQ_AnswerDiv)


        }

        function create_answer_box_for_dropdown() {
            //For some of the dropdown menus we may need to color the answer.
            //Unfortunately, the names here are already coded in the participants language, so we need a small object to back-translate
            let RegionNameTranslation, LocationNameTranslation, ColorNameTranslation = {}
            if (GenParam.Quiz_settings.show_color_when_asking_for_region || GenParam.Quiz_settings.show_color_when_asking_for_location) {
                RegionNameTranslation = {}
                for (let i in GenParam.RegionData) {
                    RegionNameTranslation[GenParam.RegionData[i].display_name] = i
                }

                LocationNameTranslation = {}
                for (let i in GenParam.LocationDisplayNames) {
                    LocationNameTranslation[GenParam.LocationDisplayNames[i]] = i
                }

            }

            ColorNameTranslation = {}
            for (let i in GenParam.RegionData) {
                ColorNameTranslation[GenParam.RegionData[i].color_description] = i
            }

            InputObj = document.createElement("select");
            for (let namenum in SubQuestionObj.answer_options) {

                let option = document.createElement("option");
                option.value = SubQuestionObj.answer_options[namenum]
                option.text = SubQuestionObj.answer_options[namenum]
                InputObj.appendChild(option)

                //Check if we need to color the answers
                if (GenParam.Quiz_settings.show_color_when_asking_for_region || GenParam.Quiz_settings.show_color_when_asking_for_location) {
                    //Check if these answers are a region or a location
                    let is_region = Object.keys(RegionNameTranslation).includes(option.value)
                    let is_location = Object.keys(LocationNameTranslation).includes(option.value)

                    if (is_region && GenParam.Quiz_settings.show_color_when_asking_for_region) {
                        option.style.background = GenParam.RegionData[RegionNameTranslation[option.value]].lighter_color + "22"
                        option.style.color = GenParam.RegionData[RegionNameTranslation[option.value]].darker_color
                    }

                    if (is_location && GenParam.Quiz_settings.show_color_when_asking_for_location) {
                        //Finding the region
                        let region_name = GenParam.find_region_of_location(LocationNameTranslation[option.value])
                        option.style.background = GenParam.RegionData[region_name].lighter_color + "22"
                        option.style.color = GenParam.RegionData[region_name].darker_color
                    }
                }


                if (Object.keys(ColorNameTranslation).includes(option.value)) {
                    option.style.background = GenParam.RegionData[ColorNameTranslation[option.value]].lighter_color + "22"
                    option.style.color = GenParam.RegionData[ColorNameTranslation[option.value]].darker_color
                }

            }
            //Adding a hidden default
            InputObj.value = ""

        }

        //Creating the question elements depending on its type
        switch (SubQuestionObj.question_type) {
            case("text"):
                create_subquestion_in_row()
                InputObj = document.createElement("input")
                InputObj.type = "text"
                break
            case("dropdown"):
                create_subquestion_in_row()
                create_answer_box_for_dropdown()
                break
            case("head_select"):
                create_subquestion_in_column()
                let SelectBox = new HeadSelectTask(CurrentInstructionsSVG, SubQ_AnswerDiv, SubQuestionObj.answer_options, SubQuestionObj.correct_answer, check_if_answer_correct_by_head_select_task)
                break

        }

        if (SubQuestionObj.question_type !== "head_select") {
            InputObj.style.width = "100%"
            InputObj.style.height = "100%"
            InputObj.style.fontSize = fontsize
            InputObj.style.textAlign = "center"
            SubQ_AnswerDiv.appendChild(InputObj)
            InputObj.onchange = onchangecheckfunc
        }


        //Returns the DOM elements for the subquestion
        this.getDOM = function () {
            return (SubQDiv)
        }

        //Returns the answer and whether this answer was correct. Also shows feedback (including a possible star if one would be awarded here)
        this.check_if_answer_correct = function () {
            //Fix the input
            InputObj.disabled = true

            let answer_correct = InputObj.value.toLowerCase() === SubQuestionObj.correct_answer.toLowerCase()

            //For text inputs: if the answer is correct, make sure its correctly capitalized. If its not correct, check if theres a single typo (and if so, we allow it anyways
            if (SubQuestionObj.answer_options === 'text') {
                if (answer_correct) {
                    InputObj.value = SubQuestionObj.correct_answer
                } else {
                    if (LevenshteinDistance(InputObj.value.toLowerCase(), SubQuestionObj.correct_answer.toLowerCase()) < 2) {
                        answer_correct = true
                        InputObj.value = SubQuestionObj.correct_answer
                    }
                }
            }

            //Color-code for feedback
            if (answer_correct) {
                InputObj.style.background = "palegreen"
                InputObj.style.color = "darkgreen"
                SubQ_QuestionDiv.innerHTML = "<tspan style = 'color: darkgreen'>✔</tspan> " + SubQuestionObj.question_text


            } else {
                InputObj.style.background = "#f9dcd6"
                InputObj.style.color = "firebrick"

                SubQ_FeedbackDiv.innerHTML = "Oops! The correct answer was: " + SubQuestionObj.correct_answer
                SubQ_FeedbackDiv.style.color = "firebrick"
                SubQ_QuestionDiv.innerHTML = "<tspan style = 'color: firebrick'>✘</tspan> " + SubQuestionObj.question_text

            }

            return (answer_correct)

        }

        //Alternative way to check if the answer was correct, can be called by other objects (assumes that it is passed with the correct properties)
        function check_if_answer_correct_by_head_select_task(Answer) {
            if (Answer.num_errors === 0) {
                SubQ_QuestionDiv.innerHTML = "<tspan style = 'color: darkgreen'>✔</tspan> " + SubQuestionObj.question_text

            } else {
                SubQ_FeedbackDiv.innerHTML = "Oops! You did not select all the correct Fennimals..."
                SubQ_FeedbackDiv.style.color = "firebrick"
                SubQ_QuestionDiv.innerHTML = "<tspan style = 'color: firebrick'>✘</tspan> " + SubQuestionObj.question_text
            }
            check_quiz_answers_bypass(Answer)
        }

        this.get_value = function () {
            return (InputObj.value)
        }

    }
    this.check_if_all_questions_have_been_answered = function () {
        let num_unanswered_questions = 0
        for (let i = 0; i < CurrentSubQuestions.length; i++) {
            if (CurrentSubQuestions[i].get_value() === "") {
                num_unanswered_questions++
            }
        }

        if (num_unanswered_questions === 0) {
            QuizAnswerButton.style.display = "inherit"
        } else {
            QuizAnswerButton.style.display = "none"
        }

    }

    function check_quiz_answers() {
        //Block the check answers button
        QuizAnswerButton.style.display = "none"
        CurrentQuizQuestion.subquestions_correct_arr = []
        CurrentQuizQuestion.subquestion_answer_arr = []

        //First check if all questions have been answered. If not, then give feedback
        //Check if all answers are correct (automatically also gives feedback)
        for (let i = 0; i < CurrentSubQuestions.length; i++) {
            CurrentQuizQuestion.subquestions_correct_arr.push(CurrentSubQuestions[i].check_if_answer_correct())
            CurrentQuizQuestion.subquestion_answer_arr.push(CurrentSubQuestions[i].get_value())
        }

        //Check if we need to show a star when all questions have been answered correctly. (And then if all questions have been answered correctly)
        if (typeof CurrentQuizQuestion.award_star_for_correct_answer !== "undefined") {
            if (CurrentQuizQuestion.award_star_for_correct_answer) {
                if (!CurrentQuizQuestion.subquestions_correct_arr.includes(false)) {
                    show_bonus_star_on_screen(ParentElem, QuizFinishButton.getBBox().x + 0.5 * QuizFinishButton.getBBox().width, QuizFinishButton.getBBox().y - 250, true, "quiz_question_element", false)

                    //Add some text
                    setTimeout(function () {
                        let BonusText = create_SVG_text_elem(QuizFinishButton.getBBox().x + 0.5 * QuizFinishButton.getBBox().width, QuizFinishButton.getBBox().y - 100, "You earned a Star!", "quiz_question_element", undefined)
                        BonusText.style.fontStyle = "italic"
                        BonusText.style.fontSize = "70px"
                        BonusText.style.fontWeight = 900
                        BonusText.style.fill = "goldenrod"
                        BonusText.style.strokeWidth = "2px"
                        BonusText.style.stroke = "black"
                        BonusText.style.textAnchor = "middle"

                        ParentElem.appendChild(BonusText)
                    }, 1000)
                }

            }
        }

        //Sound a chime if there are any errors
        if (CurrentQuizQuestion.subquestions_correct_arr.includes(false)) {
            AudioCont.play_sound_effect("rejected")
        }

        //Show the continue button
        setTimeout(function () {
            QuizFinishButton.style.display = "inherit"
        }, 1000)

    }

    function check_quiz_answers_bypass(Answer) {

        if (CurrentQuizQuestion.award_star_for_correct_answer) {
            if (Answer.correct) {
                show_bonus_star_on_screen(ParentElem, QuizFinishButton.getBBox().x + 0.5 * QuizFinishButton.getBBox().width, QuizFinishButton.getBBox().y - 250, true, "quiz_question_element", false)

                //Add some text
                setTimeout(function () {
                    let BonusText = create_SVG_text_elem(QuizFinishButton.getBBox().x + 0.5 * QuizFinishButton.getBBox().width, QuizFinishButton.getBBox().y - 100, "You earned a Star!", "quiz_question_element", undefined)
                    BonusText.style.fontStyle = "italic"
                    BonusText.style.fontSize = "70px"
                    BonusText.style.fontWeight = 900
                    BonusText.style.fill = "goldenrod"
                    BonusText.style.strokeWidth = "2px"
                    BonusText.style.stroke = "black"
                    BonusText.style.textAnchor = "middle"
                    ParentElem.appendChild(BonusText)
                }, 1000)
            }

        }

        if (!Answer.correct) {
            AudioCont.play_sound_effect("rejected")
        }

        CurrentQuizQuestion.Answer_Head_Select = Answer
        setTimeout(function () {
            QuizFinishButton.style.display = "inherit"
        }, 1500)

    }

    function quiz_question_completed() {
        //Remove all quiz question elements
        delete_elements_by_class_name("quiz_question_element")

        //Inform the experiment controller that this question has been answered
        ExpCont.quiz_question_answered(CurrentQuizQuestion)

    }

    //QUESTIONNAIRE PAGES
    //////////////////////////
    let QuestionnaireForeign, QuestionnaireItemsOnScreen, QuestionnaireContinueButton
    this.show_questionnaire_page = function (page_type) {
        show_empty_page(true)
        document.getElementById("Instructions_Title").innerHTML = "A few questions before we finish..."

        //Add some text
        let Text = create_SVG_text_in_foreign_element("You're almost done! Just a few questions left:",
            0.05 * GenParam.SVG_width, 0.12 * GenParam.SVG_height, 0.9 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, "instruction_element_text")
        Text.style.textAlign = "center"
        Text.style.fontSize = "35px"
        CurrentInstructionsSVG.appendChild(Text)

        //Add a box to contain all the question elements
        QuestionnaireForeign = create_SVG_foreignElement(0.2 * GenParam.SVG_width, 0.35 * GenParam.SVG_height, 0.6 * GenParam.SVG_width, 0.5 * GenParam.SVG_height, undefined, undefined)

        CurrentInstructionsSVG.appendChild(QuestionnaireForeign)

        //Now add questions to this box
        let questions_on_screen
        switch (page_type) {
            case("demographics_questionnaire"):
                questions_on_screen = ["age", "gender", "colorblind"];
                break
        }

        QuestionnaireItemsOnScreen = []
        for (let i = 0; i < questions_on_screen.length; i++) {
            QuestionnaireItemsOnScreen.push(new QuestionnaireItem(QuestionnaireForeign, questions_on_screen[i], questionaire_item_value_changed))
        }

        //Adding the continue button (but hiding it for now)
        QuestionnaireContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.90 * GenParam.SVG_height, 400, 75, "Continue", 40)
        CurrentInstructionsSVG.appendChild(QuestionnaireContinueButton)
        QuestionnaireContinueButton.onpointerdown = function () {
            questionaire_page_completed();
            AudioCont.play_sound_effect("button_click")
        }
        QuestionnaireContinueButton.style.display = "none"

    }

    function questionaire_item_value_changed() {
        //Check if all questions have been answered
        let all_questions_answered = true
        for (let i = 0; i < QuestionnaireItemsOnScreen.length; i++) {
            if (QuestionnaireItemsOnScreen[i].get_value() === "") {
                all_questions_answered = false
            }
        }

        if (all_questions_answered) {
            QuestionnaireContinueButton.style.display = "inherit"
        }

    }

    function questionaire_page_completed() {
        clear_instructions()
        //Create an object containing all the data
        let AnswerObj = {}
        for (let i = 0; i < QuestionnaireItemsOnScreen.length; i++) {
            AnswerObj[QuestionnaireItemsOnScreen[i].get_type()] = QuestionnaireItemsOnScreen[i].get_value()
        }

        ExpCont.questionnaire_page_completed(AnswerObj)
    }

    QuestionnaireItem = function (Parent, question_type, onchangefunc) {

        //Creating the div to hold the question, with the subdivs for the question and the answer
        let ContainerDiv = document.createElement("div")
        ContainerDiv.style.width = "100%"
        //ContainerDiv.style.border = "2px dotted dimgray"
        //ContainerDiv.style.borderRadius = "20px"
        ContainerDiv.style.marginBottom = "20px"
        ContainerDiv.style.display = "flex"

        let QuestionDiv = document.createElement("div")
        QuestionDiv.style.width = "70%"
        QuestionDiv.style.fontSize = "35px"
        QuestionDiv.style.fontStyle = "italic"

        ContainerDiv.appendChild(QuestionDiv)

        let AnswerDiv = document.createElement("div")
        AnswerDiv.style.width = "30%"
        ContainerDiv.appendChild(AnswerDiv)
        Parent.appendChild(ContainerDiv)

        //Now adding the text
        let InputObj, options
        switch (question_type) {
            case("age"):
                QuestionDiv.innerHTML = "What is your age?"
                InputObj = document.createElement("input")
                InputObj.type = "number"
                InputObj.min = 0
                InputObj.max = 100

                break
            case("gender"):
                QuestionDiv.innerHTML = "What gender do you identify as?"

                InputObj = document.createElement("select");
                options = ["man", "woman", "other", "don't want to say"]
                for (let i in options) {
                    let option = document.createElement("option");
                    option.value = options[i]
                    option.text = options[i]
                    InputObj.appendChild(option)
                }
                InputObj.value = ""
                break
            case("colorblind"):
                QuestionDiv.innerHTML = "Do you have any form of color-blindness?"

                InputObj = document.createElement("select");
                options = ["yes", "no", "don't know"]
                for (let i in options) {
                    let option = document.createElement("option");
                    option.value = options[i]
                    option.text = options[i]
                    InputObj.appendChild(option)
                }
                InputObj.value = ""
                break

        }
        AnswerDiv.appendChild(InputObj)
        InputObj.style.width = "80%"
        InputObj.style.height = "90%"
        InputObj.style.fontSize = "35px"
        InputObj.style.textAlign = "center"

        //Some functions
        this.get_value = function () {
            return (InputObj.value)
        }
        this.get_type = function () {
            return (question_type)
        }

        InputObj.onchange = onchangefunc

    }

    //PAYMENT SCREEN AND FINAL SCREENS
    //////////////////////////////////////
    let ExpPaymentData, PaymentCardContainer, AllCardsOnScreen, payment_card_width = 0.15 * GenParam.SVG_width,
        payment_card_height = 0.275 * GenParam.SVG_height

    //Holds the details for a single day
    PaymentCard = function (Parent, DayData) {
        //Creating the top element
        let CardDiv = document.createElement("div")
        CardDiv.style.width = payment_card_width + "px"
        CardDiv.style.height = payment_card_height + "px"
        CardDiv.style.marginLeft = "20px"

        //Creating the SVG to hold the card
        let SVG = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        SVG.style.width = "100%"
        SVG.style.height = "100%"
        SVG.style.borderRadius = "15px"

        let stars_have_been_earned = DayData.stars_earned > 0
        let is_summary_card = DayData.day_type === "summary"
        let top_text, card_text_color

        if (is_summary_card) {
            top_text = "Total Stars Earned"
            card_text_color = "white"
            if (stars_have_been_earned) {
                SVG.style.background = "darkgoldenrod"
                SVG.style.border = "3px solid darkgoldenrod"
            } else {
                SVG.style.background = "darkgray"
                SVG.style.border = "3px solid darkgray"
            }

        } else {
            let type_text
            switch (DayData.day_type) {
                case("name_recall_task"):
                    type_text = "recalled names";
                    break
                case("quiz"):
                    type_text = "quiz";
                    break
                default:
                    type_text = DayData.day_type
                    break
            }

            top_text = "Day " + DayData.day

            if (stars_have_been_earned) {
                SVG.style.background = GenParam.background_fill_for_instructions_where_stars_can_be_earned
                SVG.style.border = "3px solid darkgoldenrod"
                card_text_color = "darkgoldenrod"
            } else {
                SVG.style.background = "#EEEEEE"
                SVG.style.border = "3px solid darkgray"
                card_text_color = "dimgray"
            }
        }

        CardDiv.appendChild(SVG)
        Parent.appendChild(CardDiv)
        AudioCont.play_sound_effect("thud")

        //Adding theday number at the top

        let DayText = create_SVG_text_elem(0.5 * payment_card_width, 0.15 * payment_card_height, top_text, "instruction_element_text")
        DayText.style.textAnchor = "middle"
        DayText.style.fontSize = "35px"
        DayText.style.fill = card_text_color
        SVG.appendChild(DayText)

        if (is_summary_card) {
            DayText.style.fontWeight = 900
        } else {
            DayText.style.fontStyle = "italic"
        }

        //Adding the star. If no stars are earned, color it gray. Else do the anmiation

        if (stars_have_been_earned) {
            show_bonus_star_on_screen(SVG, 0.35 * payment_card_width, 0.4 * payment_card_width, true, undefined, 1.1, undefined)
        } else {
            let NewStar = show_bonus_star_on_screen(SVG, 0.35 * payment_card_width, 0.4 * payment_card_width, true, undefined, 1, undefined)
            let ChildrenPaths = NewStar.getElementsByTagName("path")
            ChildrenPaths[0].style.fill = "lightgray"
            ChildrenPaths[0].style.stroke = "dimgray"
        }

        //Add the amount earned
        setTimeout(function () {
            let AmountText = create_SVG_text_elem(0.5 * payment_card_width, 0.8 * payment_card_height, "×" + DayData.stars_earned, "instruction_element_text")
            AmountText.style.textAnchor = "middle"
            AmountText.style.fontSize = "90px"
            AmountText.style.fontWeight = 700
            AmountText.style.fill = card_text_color
            SVG.appendChild(AmountText)
        }, 500)


        //Add the maximum number of stars
        setTimeout(function () {
            let TotalText = create_SVG_text_elem(0.4 * payment_card_width, 0.95 * payment_card_height, "(out of " + DayData.maximum_possible_stars + ")", "instruction_element_text")
            TotalText.style.textAnchor = "middle"
            TotalText.style.fontSize = "35px"
            TotalText.style.fontStyle = "italic"
            TotalText.style.fill = card_text_color
            SVG.appendChild(TotalText)
        }, 1000)


    }

    function show_next_payment_card(Parent, Remaining_cards, time_between_cards) {
        if (Remaining_cards.length > 0) {
            AllCardsOnScreen.push(new PaymentCard(Parent, Remaining_cards.shift()))
            setTimeout(function () {
                show_next_payment_card(Parent, Remaining_cards, time_between_cards)
            }, time_between_cards)

        } else {
            all_payment_cards_are_on_screen()
        }

    }

    function all_payment_cards_are_on_screen() {
        //Show the warning text and the continue button
        let WarningText = create_SVG_text_in_foreign_element("DO NOT CLOSE THIS PAGE YET <br> On the next page you will find your completion code...",
            0.05 * GenParam.SVG_width, 0.7 * GenParam.SVG_height, 0.9 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, "instruction_element_text")
        WarningText.style.textAlign = "center"
        WarningText.style.fontSize = "35px"
        WarningText.style.fontWeight = 600
        CurrentInstructionsSVG.appendChild(WarningText)

        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.90 * GenParam.SVG_height, 400, 75, "Continue", 40)
        CurrentInstructionsSVG.appendChild(ContinueButton)
        ContinueButton.onpointerdown = function () {
            show_completion_code_screen();
            AudioCont.play_sound_effect("button_click")
        }

    }

    function show_completion_code_screen() {
        show_empty_page(true)
        document.getElementById("Instructions_Title").innerHTML = "Do <u>NOT</u> close this page yet..."

        let text = "Do NOT close or refresh this window before submitting your code to Prolific. <br>" +
            " Your completion code is: <tspan style = 'user-select:all'><b> " + ExpPaymentData.completion_code + " </b></tspan>. <br>" +
            "<br> " +
            "Please go to Prolific now to submit this code. After you have submitted this code to Prolific, then press the button below <br>" +
            "<br>" +
            "<u>Do not close or refresh this window before clicking the button! </u> We can only approve your work if you submitted the code to Prolific and have clicked the button below! <br>" +
            "<br>" +
            "Thank you for participating! :)"

        let CCText = create_SVG_text_in_foreign_element(text, 0.05 * GenParam.SVG_width, 0.2 * GenParam.SVG_height, 0.9 * GenParam.SVG_width, 0.6 * GenParam.SVG_height, "instruction_element_text")
        CCText.style.textAlign = "center"
        CCText.style.fontSize = "35px"
        CurrentInstructionsSVG.appendChild(CCText)

        //Create the submitbutton
        let SubmitButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.90 * GenParam.SVG_height, 500, 75, "Submit your data", 40)
        CurrentInstructionsSVG.appendChild(SubmitButton)
        SubmitButton.onpointerdown = ExpCont.submit_experiment
    }

    this.show_payment_screen = function (PaymentData) {
        console.log(PaymentData)
        ExpPaymentData = PaymentData
        let timer = 1000
        //Create the empty screen
        show_empty_page(true)
        //document.getElementsByClassName("instructions_element_background")[0].style.fill = background_fill_for_instructions_where_stars_can_be_earned
        document.getElementById("Instructions_Title").innerHTML = "Your bonus for this experiment"

        //Adding explanation text
        let ExplanationText = create_SVG_text_in_foreign_element("Congratulations, you just finished the last day! Below is an overview of the stars you earned during the experiment: ",
            0.05 * GenParam.SVG_width, 0.18 * GenParam.SVG_height, 0.9 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, "instruction_element_text")
        ExplanationText.style.textAlign = "center"
        ExplanationText.style.fontSize = "35px"
        CurrentInstructionsSVG.appendChild(ExplanationText)

        //Create a container to hold all the payment cards. Each card will detail the day number , the type, the stars earned and the maximum number of stars
        let ForeignDiv = create_SVG_foreignElement(0.1 * GenParam.SVG_width, 0.35 * GenParam.SVG_height, 0.8 * GenParam.SVG_width, 0.4 * GenParam.SVG_height, undefined, undefined)
        CurrentInstructionsSVG.appendChild(ForeignDiv)
        PaymentCardContainer = document.createElement("div")
        PaymentCardContainer.style.display = "flex"
        PaymentCardContainer.style.justifyContent = "center"
        ForeignDiv.appendChild(PaymentCardContainer)

        //Slowely antimate in the different cards.
        AllCardsOnScreen = []

        show_next_payment_card(PaymentCardContainer, JSON.parse(JSON.stringify(PaymentData.phases)), timer)


    }


}

Vertical_scollable_box = function (ParentElem, x, y, width, height) {
    let that = this
    //Easy-to-tweak parameters
    let BoxParam = {
        scroll_button_height: 30,
        border_radius_value: "35px",
        scroll_symbol_size: "55px",
        scroll_speed: 30,
        icon_name_size: 30
    }

    //On initializing, create the basic elements (the two arrows and the container in the middle)
    let TopForeignElement, TopDiv, ButtonUpDiv, AreaDiv, ButtonDownDiv, ElementArray = []

    function create_scroll_button_element(direction) {
        let Div = document.createElement("div")
        Div.style.width = "100%"
        Div.style.height = BoxParam.scroll_button_height + "px"
        Div.classList.add("instructions_scroll_button_element")

        let SymbolElem = document.createElement("div")
        SymbolElem.style.width = "100%"
        SymbolElem.style.height = "100%"
        SymbolElem.style.fontSize = BoxParam.scroll_symbol_size
        SymbolElem.style.display = "flex"
        SymbolElem.style.justifyContent = "center"


        Div.appendChild(SymbolElem)

        if (direction === "up") {
            Div.style.borderRadius = BoxParam.border_radius_value + " " + BoxParam.border_radius_value + " 0 0"
            SymbolElem.innerHTML = "⯅"
            SymbolElem.style.alignItems = "center"
        }
        if (direction === "down") {
            Div.style.borderRadius = "0 0 " + BoxParam.border_radius_value + " " + BoxParam.border_radius_value
            SymbolElem.innerHTML = "⯆"
            SymbolElem.style.alignItems = "end"
            SymbolElem.style.paddingTop = "15px"
        }

        return (Div)
    }

    function create_area_element() {
        let MainDiv = document.createElement("div")
        MainDiv.style.width = "98%"
        MainDiv.style.height = (height - 2 * BoxParam.scroll_button_height) + "px"
        MainDiv.style.background = "#FFFFFF"
        MainDiv.style.display = "flex"
        MainDiv.style.flexWrap = "wrap"
        MainDiv.style.overflow = "hidden"
        MainDiv.style.alignItems = "center"
        //MainDiv.style.gap = "10px"
        MainDiv.style.justifyContent = "center"
        MainDiv.style.borderRadius = "25px"
        MainDiv.style.border = "2px solid black"
        return (MainDiv)
    }

    function initialize() {
        TopForeignElement = create_SVG_foreignElement(x, y, width, height, undefined, undefined)
        ParentElem.appendChild(TopForeignElement)
        TopForeignElement.classList.add("instruction_element_nonbackground")

        TopDiv = document.createElement("div")
        ButtonUpDiv = create_scroll_button_element("up")
        AreaDiv = create_area_element()
        ButtonDownDiv = create_scroll_button_element("down")

        TopForeignElement.appendChild(TopDiv)
        TopDiv.appendChild(ButtonUpDiv)
        TopDiv.appendChild(AreaDiv)
        TopDiv.appendChild(ButtonDownDiv)

        ButtonUpDiv.onpointerdown = scroll_area_up
        ButtonDownDiv.onpointerdown = scroll_area_down

    }

    function scroll_area_up() {
        AreaDiv.scrollTop = AreaDiv.scrollTop - BoxParam.scroll_speed
        update_scroll_button_visibility()
    }

    function scroll_area_down() {
        AreaDiv.scrollTop = AreaDiv.scrollTop + BoxParam.scroll_speed
        update_scroll_button_visibility()
    }

    function update_scroll_button_visibility() {
        if (AreaDiv.scrollTop === 0) {
            ButtonUpDiv.style.visibility = "hidden"
        } else {
            ButtonUpDiv.style.visibility = "visible"
        }

        if ((AreaDiv.scrollHeight - AreaDiv.clientHeight) === AreaDiv.scrollTop) {
            ButtonDownDiv.style.visibility = "hidden"
        } else {
            ButtonDownDiv.style.visibility = "visible"
        }

    }

    FennimalIcon = function (AreaElem, SVG, OtherProperties) {
        console.log(OtherProperties)

        //Wrapping the SVG code into an SVG element, that one into a div, then appending that one to the Area
        let SVGElem = document.createElementNS("http://www.w3.org/2000/svg", 'svg')
        SVGElem.appendChild(SVG)

        //Creating the container to hold the image
        let CardDiv = document.createElement("div")

        //If we want to add a name, insert a separate DIV here
        let NameDiv, icon_card_width, icon_card_height
        CardDiv.style.width = OtherProperties.width + "px"
        CardDiv.style.height = OtherProperties.height + "px"
        CardDiv.style.borderRadius = "5%"
        CardDiv.style.margin = "4px"
        CardDiv.style.border = "4px solid black"
        CardDiv.appendChild(SVGElem)
        CardDiv.style.opacity = 0

        if (OtherProperties.blur) {
            CardDiv.style.filter = "blur(1px)"
        }

        if (typeof OtherProperties.name === "undefined") {
            icon_card_height = OtherProperties.height
            icon_card_width = OtherProperties.width
            SVGElem.style.width = "100%"
            SVGElem.style.height = "100%"

        } else {
            NameDiv = document.createElement("div")
            NameDiv.innerHTML = OtherProperties.name
            NameDiv.style.fontSize = "38px"// BoxParam.icon_name_size + "px"
            NameDiv.style.textAlign = "center"
            NameDiv.style.fontWeight = 900
            NameDiv.style.color = "white"
            NameDiv.style.borderRadius = "10px"
            icon_card_height = OtherProperties.height - BoxParam.icon_name_size
            icon_card_width = OtherProperties.width - BoxParam.icon_name_size
        }

        if (typeof OtherProperties.backgroundColor === "undefined") {
            CardDiv.style.background = "lightgray"
        } else {
            CardDiv.style.background = OtherProperties.backgroundColor
        }

        if (typeof OtherProperties.nameColor !== "undefined") {
            NameDiv.style.background = OtherProperties.nameColor
            CardDiv.style.border = "4px solid " + OtherProperties.nameColor

        } else {
            NameDiv.style.background = "dimgray"
        }


        AreaElem.appendChild(CardDiv)
        if (typeof OtherProperties.name !== "undefined") {
            CardDiv.appendChild(NameDiv)
        }

        //RESIZING ICON
        // Our resize depends on whether we need to include the name at the bottom
        setTimeout(function () {
            let CurrentBox = SVG.getBBox()

            //Calculating the scale factor for the x and y axes. Note: here we will use the smalles of these two to actually scale the Fennimal
            let scale_factor_w = 1 / (CurrentBox.width / icon_card_width)
            let scale_factor_h = 1 / (CurrentBox.height / icon_card_height)
            let min_scale_factor = Math.floor(Math.min(scale_factor_w, scale_factor_h) * 100) / 100

            //Applying to the Fennimal icon scale group
            let ScaleGroup = SVG.getElementsByClassName("Fennimal_scale_group")[0]
            ScaleGroup.style.transform = "scale(" + min_scale_factor + ")"

            //Translation. This depends on whether there is a name. If no, center icon in the middle of the card. If yes, align it to the top instead
            let NewBox = SVG.getBBox()
            let delta_x, delta_y
            if (typeof OtherProperties.name === "undefined") {
                //Translating the Fennimal so that its centered
                let TargetCenter = {x: 0.5 * OtherProperties.width, y: 0.5 * OtherProperties.height}
                delta_x = TargetCenter.x - (NewBox.x + 0.5 * NewBox.width)
                delta_y = TargetCenter.y - (NewBox.y + 0.5 * NewBox.height)
            } else {
                delta_x = (0.5 * OtherProperties.width) - (NewBox.x + 0.5 * NewBox.width)
                delta_y = -NewBox.y
            }
            SVG.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

            if(OtherProperties.bonus_star_earnable === true){

                show_bonus_star_on_screen(SVG, 0.25 * OtherProperties.width, 0.15 * OtherProperties.height, false, 0, 0.5)
                //NameDiv.innerHTML = OtherProperties.name + " ★"

            }


            CardDiv.style.transition = "opacity 200ms ease-in-out"
            CardDiv.style.opacity = 1

        }, 75)




        //FUNCTIONS AND INTERACTIONS
        this.remove_icon = function () {
            CardDiv.remove()
        }


    }

    LocationIcon = function (AreaElem, SVG, OtherProperties) {
        //Wrapping the SVG code into an SVG element, that one into a div, then appending that one to the Area
        let SVGElem = document.createElementNS("http://www.w3.org/2000/svg", 'svg')
        let ScaleGroup = create_SVG_group(undefined, undefined, undefined, undefined)
        let TranslateGroup = create_SVG_group(undefined, undefined, undefined, undefined)
        TranslateGroup.appendChild(ScaleGroup)
        ScaleGroup.appendChild(SVG)
        SVGElem.appendChild(TranslateGroup)

        //Creating the container to hold the image
        let CardDiv = document.createElement("div")

        //If we want to add a name, insert a separate DIV here
        let NameDiv, icon_card_width, icon_card_height
        CardDiv.style.width = OtherProperties.width + "px"
        CardDiv.style.height = OtherProperties.height + "px"
        CardDiv.style.borderRadius = "5%"
        CardDiv.style.margin = "5px"
        CardDiv.appendChild(SVGElem)

        if (typeof OtherProperties.name === "undefined") {
            icon_card_height = OtherProperties.height
            icon_card_width = OtherProperties.width
            SVGElem.style.width = "100%"
            SVGElem.style.height = "100%"
        } else {
            NameDiv = document.createElement("div")
            NameDiv.innerHTML = OtherProperties.name
            NameDiv.style.fontSize = BoxParam.icon_name_size + "px"
            NameDiv.style.textAlign = "center"
            NameDiv.style.marginTop = -(BoxParam.icon_name_size / 2) + "px"
            icon_card_height = OtherProperties.height - BoxParam.icon_name_size
            icon_card_width = OtherProperties.width
        }

        if (typeof OtherProperties.backgroundColor === "undefined") {
            CardDiv.style.background = "lightgray"
        } else {
            CardDiv.style.background = OtherProperties.backgroundColor + "44"
        }

        AreaElem.appendChild(CardDiv)
        if (typeof OtherProperties.name !== "undefined") {
            CardDiv.appendChild(NameDiv)
        }

        //At this point we need to move and resize the icon provided. First, we want to know the current dimensions of the SVG.
        let CurrentBox = SVG.getBBox()
        SVG.removeAttribute("transform")

        //Calculating the scale factor for the x and y axes. Note: here we will use the smalles of these two to actually scale the icon
        let scale_factor_w = 1 / (CurrentBox.width / icon_card_width)
        let scale_factor_h = 1 / (CurrentBox.height / icon_card_height)
        let min_scale_factor = 0.98 * Math.floor(Math.min(scale_factor_w, scale_factor_h) * 100) / 100
        ScaleGroup.style.transform = "scale(" + min_scale_factor + ")"

        //If there is no name, translate the icon to the middle of the box. If there is, align it on the bottom of the box
        let NewBox = TranslateGroup.getBBox()
        let delta_x, delta_y
        if (typeof OtherProperties.name === "undefined") {
            let TargetCenter = {x: 0.5 * icon_card_width, y: 0.5 * icon_card_height}
            delta_x = (TargetCenter.x - (NewBox.x + 0.5 * NewBox.width))
            delta_y = (TargetCenter.y - (NewBox.y + 0.5 * NewBox.height))

        } else {
            let TargetCenter = {x: 0.5 * icon_card_width, y: 0.5 * icon_card_height}
            delta_x = TargetCenter.x - (NewBox.x + 0.5 * NewBox.width)
            delta_y = icon_card_height - (NewBox.y + NewBox.height)
        }
        TranslateGroup.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)"

        //FUNCTIONS AND INTERACTIONS
        this.remove_icon = function () {
            CardDiv.remove()
        }

    }
    //Call with array to add elements. Each element should be an object containing and Icon (SVG icon) and optional other alternatives.
    this.add_array_of_elements = function (Arr) {

        for (let i = 0; i < Arr.length; i++) {
            ElementArray.push(new FennimalIcon(AreaDiv, Arr[i].Icon, Arr[i].other_properties))
        }
        update_scroll_button_visibility()
    }

    this.add_array_of_Fennimal_icons = function (FenObjArr, icon_width, icon_height, include_names) {
        //First a filtering pass: if a Fennimal object has no name, then it doesnt get a card (filters out empty entries)
        //Removing all empty locations (we dont need to provide instructions for these)
        let NewArr = []
        for(let i = 0; i < FenObjArr.length; i++) {
            if(typeof  FenObjArr[i].name !== "undefined") {
                NewArr.push(JSON.parse(JSON.stringify(FenObjArr[i])))
            }
        }
        FenObjArr = NewArr

        for (let i = 0; i < FenObjArr.length; i++) {
            //Creating the Fennimal object icon. Here we need to check if the Fennimal has a property lablled "visited". If so, and the value is true, then show the actual Fennimal.
            // Otherwise, show the outline.
            let background_color = "#DDDDDD44"


            let name_color
            let Fennimal_has_been_found = false
            if (typeof FenObjArr[i].visited !== "undefined") {
                if (FenObjArr[i].visited) {
                    Fennimal_has_been_found = true
                    background_color = GenParam.RegionData[FenObjArr[i].region].lighter_color
                    name_color = GenParam.RegionData[FenObjArr[i].region].darker_color
                }
            }

            let IconSVG = create_Fennimal_SVG_object(FenObjArr[i], GenParam.Fennimal_head_size, !Fennimal_has_been_found)
            let OtherProperties = {width: icon_width, height: icon_height, backgroundColor: background_color}
            if (Fennimal_has_been_found) {
                OtherProperties.blur = false
                OtherProperties.nameColor = name_color
            } else {
                OtherProperties.blur = true
            }

            if (include_names) {

                if (Fennimal_has_been_found) {
                    OtherProperties.name = FenObjArr[i].name
                } else {
                    OtherProperties.name = "?"
                }
            }

            if(FenObjArr[i].bonus_star_earnable === true && FenObjArr[i].search_status === "unsearched") {
                OtherProperties.backgroundColor = "#D4AF3744"
                OtherProperties.bonus_star_earnable = true

            }

            //Now we can create the icon on the screen
            ElementArray.push(new FennimalIcon(AreaDiv, IconSVG, OtherProperties))
        }

        update_scroll_button_visibility()
        //The SVG doesnt always upate immediately, so we wait a few ms before updating the size of the boxes. This can also influence the scroll state, so after a brief delay double-check this...
        // Hacky, I know...
        setTimeout(function () {
            update_scroll_button_visibility()
        }, 25)

    }

    this.add_array_of_Location_icons = function (Arr_of_location_states, icon_width, icon_height, include_names) {

        for (let i = 0; i < Arr_of_location_states.length; i++) {
            //Get the icon svg
            let IconSVG = document.getElementById("location_icon_" + Arr_of_location_states[i].location).cloneNode(true)
            IconSVG.removeAttribute("id")

            //If the location has not been visited, show it as an outline
            let location_has_been_visited = true

            if (Arr_of_location_states[i].state === "empty_unsearched") {
                location_has_been_visited = false
            } else {
                if (typeof Arr_of_location_states[i] === "object") {
                    if (typeof Arr_of_location_states[i].visited === "undefined") {
                        location_has_been_visited = false
                    } else {
                        if (Arr_of_location_states[i].visited === true) {
                            location_has_been_visited = true
                        }
                    }
                }
            }


            if (!location_has_been_visited) {
                set_fill_for_all_elements_in_array(IconSVG.querySelectorAll("*"), "black")
                set_stroke_color_for_all_elements_in_array(IconSVG.querySelectorAll("*"), "black")
            }

            //Figure out the background color
            let background_color = "#DDDDDD"
            let OtherProperties = {width: icon_width, height: icon_height, backgroundColor: background_color}
            if (include_names) {
                OtherProperties.name = Arr_of_location_states[i].location
            }

            //Add the icon on the screen
            ElementArray.push(new LocationIcon(AreaDiv, IconSVG, OtherProperties))

        }

        update_scroll_button_visibility()

    }

    this.clear_all_icons = function () {
        for (let i = 0; i < ElementArray.length; i++) {
            ElementArray[i].remove_icon()
        }

        update_scroll_button_visibility()

    }

    //Call to change opacity of the main div
    this.change_opacity = function (opacity) {
        TopForeignElement.style.opacity = opacity
    }

    this.change_position = function (dimension, newvalue) {
        TopForeignElement.setAttribute(dimension, newvalue)
    }


    //ON START
    initialize()
    update_scroll_button_visibility()


}

RecallBoxController = function (Page, answer_box_width, answer_box_height, allow_empty_input, add_checkbox_no_answer, checkbox_no_answer_text, returnfunc) {
    let StartTime = Date.now()
    let ypos = 0

    let Dims = {
        Field: {
            x: 0,
            y: ypos,
            h: answer_box_height,
            w: answer_box_width
        },
        Answer: {
            min_w: 50,
            max_w: 200,
            h: 50
        },
        InputLine: {
            x: 10,
            y: 238,
            h: 120,
            w: 750,

        },
        InputButton: {
            x: 720,
            y: 275,
            h: 70,
            w: 130
        },
        ContinueButton: {
            x: (770 + 130),
            y: 240,
            h: 70,
            w: 200
        },
        No_Answer_Checkbox: {
            x: 500,
            y: 750,
            h: 100,
            w: 408
        }

    }
    let max_input_length = 30

    //Setting the y values for the input line and buttons
    Dims.InputLine.y = ypos + Dims.Field.h + 4
    Dims.InputButton.y = ypos + Dims.Field.h + 5
    Dims.ContinueButton.y = ypos + Dims.Field.h + 5
    Dims.No_Answer_Checkbox.y = Dims.ContinueButton.y + Dims.ContinueButton.h + 5

    let TopGroup, ForObjBox, Box, BoxPlaceholderText, ForObjInput, InputText, InputButton, CheckBox, CheckBoxContainer,
        CheckBoxText, ContinueButton, AnswerArray = [], box_active, answer_id = 0
    let RemovableElements = []

    //Various flags
    let flag_done_button_pressed_once = false
    let WarningTextForArmedButton

    //Some legacy functions
    function createNSElemWithDims(namespace, elem_name, x, y, w, h) {
        let Elem = document.createElementNS(namespace, elem_name);
        Elem.setAttribute("x", x)
        Elem.setAttribute("y", y)
        Elem.setAttribute("width", w)
        Elem.setAttribute("height", h)
        return (Elem)
    }

    //Returns an SVG button object with the specified dimensions, position and text.
    function createSVGButtonElem(x, y, width, height, text) {
        let maxfontsize = 50

        let ButtonContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        ButtonContainer.setAttribute("x", x)
        ButtonContainer.setAttribute("y", y)
        ButtonContainer.setAttribute("width", width)
        ButtonContainer.setAttribute("height", height)
        ButtonContainer.classList.add("instructions_button")

        let ButtonBackground = document.createElementNS("http://www.w3.org/2000/svg", 'rect')
        ButtonBackground.setAttribute("x", x)
        ButtonBackground.setAttribute("y", y)
        ButtonBackground.setAttribute("width", width)
        ButtonBackground.setAttribute("height", height)
        ButtonBackground.setAttribute("rx", "1.5%")

        let Text = document.createElementNS("http://www.w3.org/2000/svg", 'text')
        Text.setAttribute("x", x + 0.5 * width)
        Text.setAttribute("y", y + 0.5 * height + 2)
        Text.style.dominantBaseline = "middle"
        Text.style.textAnchor = "middle"
        Text.style.fontSize = maxfontsize + "px"
        Text.append(document.createTextNode(text))

        //font-size: 20px;

        //If needed, reduce the size of the text to fit
        function try_resize(currentfontsize) {
            let text_width = Text.getBBox().width
            if (text_width > 0.95 * width) {
                //Resize the text, and try again (small delay to allow the screen to update)
                let newfontsize = currentfontsize - 1
                Text.style.fontSize = newfontsize + "px"
                setTimeout(function () {
                    try_resize(newfontsize)
                }, 25)

            }
        }

        setTimeout(function () {
            try_resize(maxfontsize)
        }, 5)

        ButtonContainer.appendChild(ButtonBackground)
        ButtonContainer.appendChild(Text)
        return (ButtonContainer)
    }

    //Creates the elements
    function initialize_elements() {
        //CREATING MAIN COMPONENTS
        TopGroup = create_SVG_group(0, 0, undefined, undefined)
        Page.appendChild(TopGroup)

        ForObjBox = createNSElemWithDims('http://www.w3.org/2000/svg', "foreignObject", Dims.Field.x, Dims.Field.y, Dims.Field.w, Dims.Field.h)
        ForObjBox.style.padding = "1%"
        TopGroup.appendChild(ForObjBox)
        RemovableElements.push(ForObjBox)

        //The Box contains all the answers
        Box = document.createElement("div")
        Box.classList.add("recall_input_answerbox_start")
        ForObjBox.appendChild(Box)

        //Adding a placeholder for the box
        reset_box()

        //Adding input line
        ForObjInput = createNSElemWithDims('http://www.w3.org/2000/svg', "foreignObject", Dims.InputLine.x, Dims.InputLine.y, Dims.InputLine.w, Dims.InputLine.h)
        ForObjInput.style.padding = "1%"
        TopGroup.appendChild(ForObjInput)
        RemovableElements.push(ForObjInput)

        InputText = document.createElement("input")
        InputText.maxLength = max_input_length
        InputText.placeholder = "Enter name here"
        InputText.classList.add("recall_input_line")
        InputText.addEventListener("keyup", function (event) {
            if (event.key === "Enter") {
                if (InputText.value !== "") {
                    AudioCont.play_sound_effect("button_click")
                    add_answer_button_pressed()
                }


            } else {
                if (InputText.value === "") {
                    ContinueButton.style.display = "inherit"
                } else {
                    ContinueButton.style.display = "none"
                    if (flag_done_button_pressed_once) {
                        arm_or_disarm_done_button(false)
                    }
                }
            }
        })
        ForObjInput.appendChild(InputText)

        InputButton = createSVGButtonElem(Dims.InputButton.x, Dims.InputButton.y, Dims.InputButton.w, Dims.InputButton.h, "Add")
        InputButton.onclick = function () {
            add_answer_button_pressed();
            AudioCont.play_sound_effect("button_click")
        }
        TopGroup.appendChild(InputButton)
        RemovableElements.push(InputButton)

        ContinueButton = createSVGButtonElem(Dims.ContinueButton.x, Dims.ContinueButton.y, Dims.ContinueButton.w, Dims.ContinueButton.h, "Done")
        ContinueButton.onpointerdown = function () {
            done_button_pressed();
            AudioCont.play_sound_effect("button_click")
        }
        TopGroup.appendChild(ContinueButton)

        RemovableElements.push(ContinueButton)

        if (!allow_empty_input) {
            ContinueButton.style.display = "none"
        }

        //Finally, we may need to add a checkbox for the no-answer option
        if (add_checkbox_no_answer) {
            //The container holding both the checkbox and the text
            CheckBoxContainer = createNSElemWithDims('http://www.w3.org/2000/svg', "foreignObject", Dims.No_Answer_Checkbox.x, Dims.No_Answer_Checkbox.y, Dims.No_Answer_Checkbox.w, Dims.No_Answer_Checkbox.h)
            CheckBoxContainer.style.padding = "1%"
            CheckBoxContainer.classList.add("recall_no_answer_container")
            TopGroup.appendChild(CheckBoxContainer)
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
    function activate_box() {
        box_active = true
        BoxPlaceholderText.remove()
        Box.classList.remove("recall_input_answerbox_start")
        Box.classList.add("recall_input_answerbox_active")
    }

    function reset_box() {
        BoxPlaceholderText = document.createElement("p")
        BoxPlaceholderText.innerHTML = "Your answers will be shown here"
        BoxPlaceholderText.classList.add("recall_input_box_placeholder")
        Box.appendChild(BoxPlaceholderText)
        box_active = false

        Box.classList.add("recall_input_answerbox_start")
        Box.classList.remove("recall_input_answerbox_active")
    }

    //Call when the add answer button is pressed
    function add_answer_button_pressed() {

        let inputval = InputText.value
        if (inputval !== "") {
            if (!box_active) {
                activate_box()
            }
            answer_added(InputText.value)
            InputText.value = ""
        } else {
            if (allow_empty_input) {
                if (!box_active) {
                    activate_box()
                }
            }
        }


    }

    //Call when an answer has been entered
    function answer_added(answertext) {
        AnswerArray.push(new Answer(answertext, answer_id, Date.now() - StartTime))
        answer_id++
        number_of_answers_changed()
    }

    //Object for the answer displayed in the box
    Answer = function (text, id, time) {
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
        RemoveAnswerMark.onpointerdown = function () {
            delete_answer_from_screen();
            AudioCont.play_sound_effect("close_menu")
        }
        AnswerDiv.appendChild(RemoveAnswerMark)

        Box.appendChild(AnswerDiv)

        function delete_answer_from_screen() {
            AnswerDiv.remove()
            removed_by_user = true
            number_of_answers_changed()
        }

        this.get_value_obj = function () {
            return ({
                ans: text,
                id: id,
                time: time,
                removed_by_user: removed_by_user
            })
        }

    }

    //Call when the checkbox for no input has been toggled
    function toggle_no_answer_checkbox() {
        if (CheckBox.checked) {
            //Disable the text input and hide the add button.
            InputButton.style.display = "none"
            InputText.disabled = true

            //Show the continue button
            ContinueButton.style.display = "inherit"
        } else {
            //Enable text input and show the add button
            InputButton.style.display = "inherit"
            InputText.disabled = false

            //Hide the continue button
            ContinueButton.style.display = "none"
        }
    }

    //Call when the number of answers is updated (either when adding or when removing answer)
    function number_of_answers_changed() {
        //Find the number of answers displayed on-screen
        let number_of_answers_on_screen = 0
        for (let i = 0; i < AnswerArray.length; i++) {
            if (AnswerArray[i].get_value_obj().removed_by_user === false) {
                number_of_answers_on_screen++
            }
        }

        if (number_of_answers_on_screen === 0) {
            //Reset the placeholder text
            ContinueButton.style.display = "none"
            reset_box()

            //If enabled, show the no-answer box
            if (add_checkbox_no_answer) {
                CheckBox.disabled = false
                CheckBoxText.style.color = "black"
            }

        } else {
            //Show the continue button
            ContinueButton.style.display = "inherit"
            //If enabled, hide the no-answer box
            if (add_checkbox_no_answer) {
                CheckBox.disabled = true
                CheckBoxText.style.color = "gray"
            }
        }
    }

    //Call when the DONE button is pressed
    function done_button_pressed() {
        if (flag_done_button_pressed_once) {
            finish_question()
        } else {
            arm_or_disarm_done_button(true)
        }

    }

    function arm_or_disarm_done_button(is_now_armed) {
        if (is_now_armed) {
            //Change the look of the done button
            ContinueButton.childNodes[0].style.animation = "none"
            ContinueButton.childNodes[0].style.fill = "darkred"
            ContinueButton.childNodes[1].style.fill = "white"

            //Show some text to indicate that the done button is now armed
            WarningTextForArmedButton = create_SVG_text_in_foreign_element("<b>Are you sure?</b> You will not be able to return to this page after you press this button again. ", Dims.ContinueButton.x + Dims.ContinueButton.w + 30, Dims.ContinueButton.y, 550, 150, "instruction_element_text")
            WarningTextForArmedButton.style.fontSize = "35px"
            WarningTextForArmedButton.childNodes[0].style.margin = "0"
            WarningTextForArmedButton.childNodes[0].style.lineHeight = "90%"
            WarningTextForArmedButton.childNodes[0].style.fontStyle = "italic"
            WarningTextForArmedButton.style.color = "darkred"
            TopGroup.appendChild(WarningTextForArmedButton)

            //After a brief timeout (to prevent double-clicking by accident), raise the flag
            setTimeout(function () {
                flag_done_button_pressed_once = true
            }, 500)

        } else {
            ContinueButton.childNodes[0].style.removeProperty("animation")
            flag_done_button_pressed_once = false
            WarningTextForArmedButton.remove()
            WarningTextForArmedButton = undefined

        }
    }

    //Call when the question has been finished
    function finish_question() {
        let GivenAnswers = []
        for (let i = 0; i < AnswerArray.length; i++) {
            let An = AnswerArray[i]
            GivenAnswers.push(An.get_value_obj())
        }


        clearElements()

        returnfunc(GivenAnswers)

        //ExpCont.recall_task_completed(GivenAnswers)

    }

    //Call to delete all elements from the page
    function clearElements() {
        for (let i = 0; i < RemovableElements.length; i++) {
            RemovableElements[i].remove()
        }
        RemovableElements = []
    }

    initialize_elements()

    this.translate_elements = function (x, y) {

        TopGroup.style.transform = "translate(" + x + "px, " + y + "px)"
    }

}

HeadSelectTask = function (SVGParent, DivParent, FennimalObjectArray, Arr_of_Correct_Ids, returnfunc) {
    //Some general parameters
    let Dims = {
        Container: {
            height: (0.5 * GenParam.SVG_height) + "px",
            width: "100%"
        },
        Cards: {
            width: 170,
            height: 170,
            background_not_selected: "lightgray",
            background_selected: "dimgray",
            border_selected: "5px solid black",
            border_not_selected: "5px solid gray",
            opacity_selected: 1,
            opacity_not_selected: 0.5,
            background_correct: "green",
            background_incorrect_comission: "darkred",
            background_incorrect_omission: "pink"
        },
        CheckAnswerButton: {
            x: .46 * GenParam.SVG_width,
            y: 0.8 * GenParam.SVG_height
        },
        FinishButton: {
            x: .80 * GenParam.SVG_width,
            y: 0.8 * GenParam.SVG_height
        }
    }


    //Creating the container element
    let Container, CardControllers = [], RemainingCardsToBePlaced, CheckAnswerButton, FinishButton,
        all_cards_fixed_in_place = false

    function start_task() {
        Container = document.createElement("div")
        Container.style.width = Dims.Container.width
        Container.style.height = Dims.Container.height
        Container.style.display = "flex"
        Container.style.flexWrap = "wrap"
        DivParent.appendChild(Container)

        //Creating the check and continue buttons
        CheckAnswerButton = create_SVG_buttonElement(Dims.CheckAnswerButton.x, Dims.CheckAnswerButton.y, 400, 75, "Check answers", 40)
        CheckAnswerButton.classList.add("quiz_question_element")
        CheckAnswerButton.onpointerdown = function () {
            check_answer();
            AudioCont.play_sound_effect("button_click")
        }
        SVGParent.appendChild(CheckAnswerButton)
        CheckAnswerButton.style.display = "none"

        //FinishButton = create_SVG_buttonElement(Dims.FinishButton.x,Dims.FinishButton.y,400, 75,"Continue", 40)
        //FinishButton.classList.add("quiz_question_element")
        //FinishButton.onpointerdown = function(){ AudioCont.play_sound_effect("button_click") }
        //SVGParent.appendChild(FinishButton)
        //FinishButton.style.display = "none"

        setTimeout(function () {
            for (let i = 0; i < FennimalObjectArray.length; i++) {
                CardControllers.push(new Card(FennimalObjectArray[i], Container))
            }
        }, 100)
    }

    //Defining a card
    Card = function (FenObj, ContainerObj) {
        let CardElem = {}, is_currently_selected = false

        function create_elems() {
            CardElem.Container = document.createElement("div")
            CardElem.Container.style.width = Dims.Cards.width + "px"
            CardElem.Container.style.height = Dims.Cards.height + "px"
            CardElem.Container.style.background = Dims.Cards.background_not_selected
            CardElem.Container.style.margin = "2px"
            CardElem.Container.style.marginBottom = 0
            CardElem.Container.style.cursor = "pointer"
            CardElem.Container.style.border = Dims.Cards.border_not_selected
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
            CardElem.SVGObj.style.opacity = Dims.Cards.opacity_not_selected

            CardElem.Container.appendChild(CardElem.BlurContainer)
            CardElem.BlurContainer.appendChild(CardElem.SVGObj)
            ContainerObj.appendChild(CardElem.Container)

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

            //Setting event listener
            CardElem.Container.onpointerdown = toggle_selection


        }

        create_elems()

        function toggle_selection() {
            if (!all_cards_fixed_in_place) {
                AudioCont.play_sound_effect("card_placed")
                if (is_currently_selected) {
                    is_currently_selected = false
                    CardElem.Container.style.background = Dims.Cards.background_not_selected
                    CardElem.SVGObj.style.opacity = Dims.Cards.opacity_not_selected
                    CardElem.Container.style.border = Dims.Cards.border_not_selected
                } else {
                    is_currently_selected = true
                    CardElem.Container.style.background = Dims.Cards.background_selected
                    CardElem.SVGObj.style.opacity = Dims.Cards.opacity_selected
                    CardElem.Container.style.border = Dims.Cards.border_selected
                }
                card_has_been_pressed()
            }
        }

        this.get_current_selection_state = function () {
            return (is_currently_selected)
        }


        this.set_feedback = function (feedback_type) {
            CardElem.BlurContainer.style.filter = "blur(20px)"
            CardElem.SVGObj.style.filter = "none"

            switch (feedback_type) {
                case("correct"):
                    CardElem.Container.style.background = Dims.Cards.background_correct
                    CardElem.Container.style.borderColor = Dims.Cards.background_correct
                    break
                case("incorrect_omission"):
                    CardElem.Container.style.background = Dims.Cards.background_incorrect_omission
                    break
                case("incorrect_comission"):
                    CardElem.Container.style.background = Dims.Cards.background_incorrect_comission
                    break
            }
        }

        this.get_card_Fennimal_ID = function () {
            return (FenObj.id)
        }


    }

    function card_has_been_pressed() {
        //Find how many cards are currently selected
        let number_cards_selected = 0
        for (let i = 0; i < CardControllers.length; i++) {
            if (CardControllers[i].get_current_selection_state()) {
                number_cards_selected++
            }
        }

        if (number_cards_selected === Arr_of_Correct_Ids.length) {
            CheckAnswerButton.style.display = "inherit"
        } else {
            CheckAnswerButton.style.display = "none"
        }

    }

    function check_answer() {
        //Hide the check button and fix all cards in place
        CheckAnswerButton.style.display = "none"
        all_cards_fixed_in_place = true

        //Blur all the answers and give feedback
        let number_of_errors = 0
        let IDs_selected = []

        for (let i = 0; i < CardControllers.length; i++) {
            if (CardControllers[i].get_current_selection_state()) {
                IDs_selected.push(CardControllers[i].get_card_Fennimal_ID())
                if (Arr_of_Correct_Ids.includes(CardControllers[i].get_card_Fennimal_ID())) {
                    CardControllers[i].set_feedback("correct")
                } else {
                    CardControllers[i].set_feedback("incorrect_comission")
                    number_of_errors++
                }
            } else {
                if (Arr_of_Correct_Ids.includes(CardControllers[i].get_card_Fennimal_ID())) {
                    CardControllers[i].set_feedback("incorrect_omission")
                    number_of_errors++
                } else {
                    CardControllers[i].set_feedback("true_negative")
                }
            }
        }

        //Now return the output

        returnfunc({
            num_errors: number_of_errors,
            correct: number_of_errors === 0,
            Ids_selected: IDs_selected
        })

    }

    start_task()

}

CharacterCreationController  = function(Parent, map_update_func){
    //Defining presets
    const controllerthat = this
    let IconTranslateGroup, PlayerIconBox
    const button_dims = 115, label_x = 850, label_w = 330, xvals_buttons = [1190.797,1316.380, 1441.964, 1567.547 ],
        icon_box_dims = {x: 223, y: 218, w: 540, h: 640}, randomize_button_ytop = 218

    const Presets = {
        type: {
            label: "Gender",
            ytop: 348.614,
            options: {male: "male", female: "female"}
        },
        skin_color: {
            label: "Skin color",
            ytop: 479.489,
            options: {A: "#8d5524", B: "#e0ac69", C: "#f1c27d", D: "#ffdbac"}
        },
        hair_color: {
            label: "Hair color",
            ytop: 610.364,
            options: {A: "#fde8b6", B: "#c37c56",  C: "#8a6030", D: "#341f0a" }
        },
        outfit: {
            label: "Outfit",
            ytop: 741.239,
            options: {
                A: {
                    shirt: "#fef4f7",
                    jacket: "#258522",
                    lapel: "#2c432b",
                    pants: "#5d655e",
                    shoes: "#5d1506"

                },
                B: {
                    shirt: "#e0e9f5",
                    jacket: "#8a508d",
                    lapel: "#642367",
                    pants: "#ac9d93",
                    shoes: "#784421"

                },
                C: {
                    shirt: "#ffcc00",
                    jacket: "#d68b00",
                    lapel: "#d63e00",
                    pants: "#63a2d5",
                    shoes: "#784421"

                },
                D: {
                    shirt: "#272626",
                    jacket: "#aa0000",
                    lapel: "#4d2413",
                    pants: "#6d7d89",
                    shoes: "#000000"

                },


            }

        }

    }

    ButtonCont = function(type, value, xtop, ytop, pressfun){
        let state_selected = false
        let ButtonRect = create_SVG_rect(xtop, ytop, button_dims,button_dims);
        Parent.appendChild(ButtonRect)
        ButtonRect.classList.add("cc_button")
        ButtonRect.onpointerdown = function(){pressfun(type,value)}

        //Now we need to figure out what contents to display.
        //  For the randomization button, type = type buttons: basic fill, but we need to copy an SVG element
        //  If the type is an outfit, use the jacket color.
        //  Otherwise, use the color itself
        if(type === "randomize" || type === "type"){
            let ButtonSVG, ScaleGroup, TranslateGroup
            if(type === "randomize"){
                ButtonSVG = document.getElementById("random_dice").cloneNode(true)
            }else{
                ButtonSVG = document.getElementById("cc_head_"+ value).cloneNode(true)
            }
            ButtonSVG.style.display = "inherit"
            ButtonSVG.style.pointerEvents = "none"

            ScaleGroup = create_SVG_group(0,0,undefined,undefined)
            TranslateGroup = create_SVG_group(0,0,undefined,undefined)
            ScaleGroup.appendChild(ButtonSVG)
            TranslateGroup.appendChild(ScaleGroup)
            Parent.appendChild(TranslateGroup)

            ScaleGroup.style.transform = "scale(1)"
            moveSVGCenterTo(TranslateGroup, ButtonRect.getBBox().x + 0.5*ButtonRect.getBBox().width, ButtonRect.getBBox().y + 0.5 * ButtonRect.getBBox().height)
            ButtonRect.style.fill = "goldenrod"



        }else{
            if(type === "outfit"){
                ButtonRect.style.fill = Presets[type].options[value].jacket
            }else{
                ButtonRect.style.fill = Presets[type].options[value]
            }
        }

        this.set_selected_state = function(bool){
            state_selected = bool
            if(bool){
                //Set the border
                ButtonRect.style.stroke = "#6495ED"
                ButtonRect.style.strokeWidth = "8px"
            }else{
                //Delete the border
                ButtonRect.style.stroke = ""
                ButtonRect.style.strokeWidth = ""

            }
        }
        this.get_state = function(){
            return(state_selected)
        }
        this.get_value = function(){
            return value
        }



    }

    this.buttonClicked = function(buttype, butvalue){
        AudioCont.play_sound_effect("button_click")
        let not_selected_options
        if(buttype === "randomize"){
            randomize_inputs()
        }else{
            //Go through all buttons of this type and select only the current one. Keep track of all not-selected options
            not_selected_options = []
            for(let key in ButtonControllers[buttype]){
                const selected = ButtonControllers[buttype][key].get_value() === butvalue
                ButtonControllers[buttype][key].set_selected_state(selected )
                if(! selected){
                    not_selected_options.push(key)
                }

            }
            //Update the worldstate player
            update_world_state_player_icon(buttype, butvalue)

            //Pick a random not-selected option for the partner
            update_world_state_partner_icon(buttype, shuffleArray(not_selected_options)[0])
        }

        //Update the icon
        update_player_icon_SVG()

    }
    function randomize_inputs(){
        //For each key, pick one at random for the player, and one at random for the partner
        for(let key in Presets){
            let options = shuffleArray( Object.keys(Presets[key].options) )
            update_world_state_player_icon(key, options[0])
            update_world_state_partner_icon(key, options[1])

            //Make sure the select buttons are selected
            for(let butkey in ButtonControllers[key]){
                ButtonControllers[key][butkey].set_selected_state(ButtonControllers[key][butkey].get_value() === options[0])


            }

        }
    }
    function update_world_state_player_icon(type, value){
        if(type === "type" || type === "skin_color" || type === "hair_color"){
            WorldState.change_player_icon_settings(type, Presets[type].options[value])
        }

        if(type === "outfit"){
            for(let key in Presets[type].options[value]){
                WorldState.change_player_icon_settings(key, Presets[type].options[value][key])
            }
        }
    }
    function update_world_state_partner_icon(type, value){
        if(type === "type" || type === "skin_color" || type === "hair_color"){
            WorldState.change_partner_icon_settings(type, Presets[type].options[value])
        }

        if(type === "outfit"){
            for(let key in Presets[type].options[value]){
                WorldState.change_partner_icon_settings(key, Presets[type].options[value][key])
            }
        }
    }

    function update_player_icon_SVG(){
        //If there is a previous rendered icon, delete it.
        if(typeof IconTranslateGroup !== "undefined"){
            IconTranslateGroup.remove()
        }

        //Now populate with a new one
        let IconSVG = WorldState.get_person_icon("player", "front")

        IconSVG.style.transform = "scale(20)"
        IconTranslateGroup  = create_SVG_group(0,0,undefined,undefined);

        IconTranslateGroup.appendChild(IconSVG);
        Parent.appendChild(IconTranslateGroup);

        moveSVGCenterTo(IconTranslateGroup, PlayerIconBox.getBBox().x + 0.5 * PlayerIconBox.getBBox().width, PlayerIconBox.getBBox().y + 0.5 * PlayerIconBox.getBBox().height)

        //Update the map in the background
        map_update_func()



    }

    //Creating SVG elements
    let SVGIcon, ButtonControllers = {}
    function createBasicElems(){
        //Creating the icon and its box
        PlayerIconBox = create_SVG_rect(icon_box_dims.x,icon_box_dims.y,icon_box_dims.w, icon_box_dims.h, undefined,undefined)
        PlayerIconBox.style.rx = "50"
        PlayerIconBox.style.fill = "#FFFFFF99"
        Parent.appendChild(PlayerIconBox)

        //Now we create all the labels and buttons
        ButtonControllers["randomize"] = {}
        ButtonControllers["randomize"]["randomize"] = new ButtonCont("randomize",false, label_x, randomize_button_ytop, controllerthat.buttonClicked)

        for(let type in Presets){
            ButtonControllers[type] = {}
            let yval = Presets[type].ytop
            let count = 0

            //Create label here
            let LabelBox = create_SVG_rect(label_x, yval, label_w,button_dims, undefined,undefined)
            LabelBox.style.fill = "gray"
            LabelBox.style.opacity = 0.5
            LabelBox.style.rx = "25"
            LabelBox.style.ry = "25"
            Parent.appendChild(LabelBox)
            let LabelText = create_SVG_text_in_foreign_element(Presets[type].label,label_x, yval, label_w,button_dims, undefined,undefined )
            LabelText.childNodes[0].style.fontSize = "50px"
            LabelText.childNodes[0].style.textAlign = "center"
            LabelText.childNodes[0].style.marginTop = "27px"
            Parent.appendChild(LabelText)

            for(let value in Presets[type].options){
                let xval = xvals_buttons[count]
                count++
                ButtonControllers[type][value] = new ButtonCont(type,value, xval, yval, controllerthat.buttonClicked)
            }
        }





    }
    createBasicElems()
    randomize_inputs()
    update_player_icon_SVG()


}

//Easy wrapper to hold a little animated startbust
Animated_Starburst_star = function (Parent, start_x, start_y, end_x, end_y, time_on_screen) {
    //Copying the mini star icon
    let Icon = document.getElementById("icon_bonus_star_small").cloneNode(true)
    Icon.removeAttribute("id")
    Icon.classList.remove("interface_element")
    Icon.classList.add("quiz_question_element")

    //Translate to correct position for start
    Parent.appendChild(Icon)
    MoveElemToCoords(Icon, start_x, start_y)

    setTimeout(function () {
        Icon.style.transition = "all " + time_on_screen + "ms ease-in-out"
        Icon.style.opacity = 0
        MoveElemToCoords(Icon, end_x, end_y)
    }, 5)

    //Delete after time window over
    setTimeout(function () {
        Icon.remove()
    }, time_on_screen + 200)

}

function show_bonus_star_on_screen(Parent, center_x, center_y, show_animated_stars, optional_class_name, optional_resize_factor, optional_id) {
    //Create the star elements
    let Star = document.getElementById("icon_bonus_star").cloneNode(true)
    Star.style.display = "inherit"
    Star.style.opacity = 0
    Star.removeAttribute("id")
    Star.classList.remove("interface_element")
    AudioCont.play_sound_effect("star_earned")

    if (optional_class_name !== false && optional_class_name !== "undefined") {
        Star.classList.add(optional_class_name)
    }
    if(optional_id !== undefined && optional_id !== false) {
        Star.id = optional_id
    }

    //Creating container group structure
    let ZeroTransGroup = create_SVG_group(0,0,undefined,undefined)
    let ScaleGroup = create_SVG_group(0,0,undefined,undefined)
    let TransGroup = create_SVG_group(0,0,undefined,undefined)

    ZeroTransGroup.appendChild(Star)
    ScaleGroup.appendChild(ZeroTransGroup)
    TransGroup.appendChild(ScaleGroup)
    Parent.appendChild(TransGroup)

    //Zeroing base coordinates
    let BaseCenter = getSVGInternalCenter(ZeroTransGroup)
    ZeroTransGroup.style.transform = "translate(" + (-BaseCenter.x) + "px, " + (-BaseCenter.y) + "px)";

    //Setting scale
    if(optional_resize_factor !== undefined){
        ScaleGroup.style.transform = "scale(" + optional_resize_factor + ")"
    }

    //Translating to target location
    MoveElemToCoords(TransGroup, center_x , center_y )

    //If requested, show some animated stars bursting out
    let main_star_delay = 0
    if (show_animated_stars) {
        let num_stars = 25

        for (let i = 0; i < num_stars; i++) {
            let x_delta = randomIntFromInterval(0, 500)
            let y_delta = randomIntFromInterval(0, 500)

            if (shuffleArray([true, false])[0]) {
                x_delta = -x_delta
            }

            if (shuffleArray([true, false])[0]) {
                y_delta = -y_delta
            }

            let MiniStar = new Animated_Starburst_star(Parent, center_x + 0.1 * x_delta, center_y + 0.1 * y_delta, center_x + x_delta, center_y + y_delta, 1000)
        }

        main_star_delay = 100

    }

    //After a brief delay, let the star fade in
    setTimeout(function () {
        Star.style.transition = "all 500ms ease-in-out"
        Star.style.opacity = 1
    }, main_star_delay)

    return(Star)
}
