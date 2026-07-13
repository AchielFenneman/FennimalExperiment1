INSTRUCTIONSCONTROLLER = function (ExpCont, WorldState, Stimuli) {
    let current_instruction_type;
    let ParentElem = document.getElementById("Instructions_Layer");
    let CurrentInstructionsSVG;
    let boundary_size = 30;
    let that = this;

    function clear_instructions() {
        ParentElem.style.display = "none";
        ParentElem.innerHTML = "";
        if (CurrentInstructionsSVG) CurrentInstructionsSVG.remove();
    }

    function create_basic_instruction_elements() {
        let GroupElem = document.createElementNS("http://www.w3.org/2000/svg", 'g');

        let CoverRect = create_SVG_rect(0, 0, GenParam.SVG_width, GenParam.SVG_height, "instructions_element_cover", undefined);
        CoverRect.classList.add("instruction_element_nonbackground");
        CoverRect.classList.add("instruction_cover_rect");
        GroupElem.appendChild(CoverRect);

        let BackGroundRect = create_SVG_rect(boundary_size, boundary_size, GenParam.SVG_width - 2 * boundary_size, GenParam.SVG_height - 2 * boundary_size, "instructions_element_background", undefined);
        GroupElem.appendChild(BackGroundRect);

        let Title = create_SVG_text_elem(0.5 * GenParam.SVG_width, 90, "TESTING TITLE HERE", "instructions_element_title", "Instructions_Title");
        Title.style.fontWeight = 700;
        Title.classList.add("instruction_element_nonbackground");
        GroupElem.appendChild(Title);

        GroupElem.appendChild(create_progress_elements());
        return GroupElem;
    }

    let ProgressForeign, ProgressDiv, ProgressDayNumberIndicators, ProgressDayNumberNumbers, ProgressWithinDayBar;

    function create_progress_elements() {
        let progress_elements_height = 50;
        let progress_bar_width = 500;
        ProgressForeign = create_SVG_foreignElement(2 * boundary_size, GenParam.SVG_height - boundary_size - 70, GenParam.SVG_width - 4 * boundary_size, progress_elements_height, "instruction_element_nonbackground", undefined);
        ProgressDiv = document.createElement("div");
        ProgressDiv.style.display = "flex";
        ProgressDiv.style.justifyContent = "center";
        ProgressDiv.style.alignItems = "center";
        ProgressForeign.appendChild(ProgressDiv);
        ProgressDayNumberIndicators = [];
        ProgressDayNumberNumbers = [];

        let DayIndicatorDiv = document.createElement("div");
        DayIndicatorDiv.style.display = "flex";
        DayIndicatorDiv.style.alignItems = "center";
        ProgressDiv.appendChild(DayIndicatorDiv);

        for (let i = 0; i < Stimuli.get_number_of_days_in_experiment(); i++) {
            let SVG = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
            SVG.style.height = progress_elements_height;
            SVG.style.width = progress_elements_height;

            let Circle = create_SVG_circle(0.5 * progress_elements_height, 0.5 * progress_elements_height, 0.5 * progress_elements_height, "instruction_element_day_indicator_future", undefined);
            SVG.appendChild(Circle);
            ProgressDayNumberIndicators.push(Circle);

            DayIndicatorDiv.appendChild(SVG);
            Circle.style.transition = "all 200ms ease-in-out";

            let Number = create_SVG_text_elem(0.5 * progress_elements_height, 0.55 * progress_elements_height, i + 1, undefined, undefined);
            Number.style.fontSize = "30px";
            Number.style.textAnchor = "middle";
            Number.style.alignmentBaseline = "middle";
            ProgressDayNumberNumbers.push(Number);
            SVG.appendChild(Number);
        }

        let ProgressBarContainer = document.createElement("div");
        ProgressBarContainer.style.height = progress_elements_height + "px";
        ProgressBarContainer.style.width = progress_bar_width + "px";
        ProgressBarContainer.style.background = "lightgray";
        ProgressBarContainer.style.marginLeft = "20px";
        ProgressBarContainer.style.opacity = 0.5;
        ProgressBarContainer.style.borderRadius = "20px";
        ProgressDiv.appendChild(ProgressBarContainer);

        ProgressWithinDayBar = document.createElement("div");
        ProgressWithinDayBar.style.height = "100%";
        ProgressWithinDayBar.style.background = "goldenrod";
        ProgressWithinDayBar.style.width = "0%";
        ProgressWithinDayBar.style.borderRadius = "20px";
        ProgressWithinDayBar.style.transition = "all 200ms ease-in-out";
        ProgressBarContainer.appendChild(ProgressWithinDayBar);

        return ProgressForeign;
    }

    this.update_progress_within_day = function (percentage_complete) {
        if (percentage_complete === false) {
            ProgressWithinDayBar.parentElement.style.display = "none";
        } else {
            ProgressWithinDayBar.parentElement.style.display = "inherit";
            ProgressWithinDayBar.style.width = percentage_complete + "%";
        }
    };

    function update_progress_new_day(currentday) {
        if (currentday === false) {
            ProgressDayNumberIndicators.forEach(i => i.style.display = "none");
            ProgressDayNumberNumbers.forEach(n => n.style.display = "none");
        } else {
            for (let i = 0; i < ProgressDayNumberIndicators.length; i++) {
                if ((i + 1) < currentday) {
                    ProgressDayNumberIndicators[i].style.fill = "navy";
                    ProgressDayNumberIndicators[i].style.opacity = 0.7;
                    ProgressDayNumberIndicators[i].setAttribute("r", 0.7 * 0.5 * 50);
                    ProgressDayNumberNumbers[i].style.fill = "white";
                    ProgressDayNumberNumbers[i].style.fontSize = "30px";
                }
                if ((i + 1) === currentday) {
                    ProgressDayNumberIndicators[i].style.fill = "goldenrod";
                    ProgressDayNumberIndicators[i].style.opacity = 0.75;
                    ProgressDayNumberIndicators[i].setAttribute("r", 0.5 * 50);
                    ProgressDayNumberNumbers[i].style.fill = "navy";
                    ProgressDayNumberNumbers[i].style.fontSize = "40px";
                    ProgressDayNumberNumbers[i].style.fontWeight = 600;
                }
                if ((i + 1) > currentday) {
                    ProgressDayNumberIndicators[i].style.fill = "gray";
                    ProgressDayNumberIndicators[i].style.opacity = 0.5;
                    ProgressDayNumberIndicators[i].setAttribute("r", 0.7 * 0.5 * 50);
                    ProgressDayNumberNumbers[i].style.fill = "white";
                    ProgressDayNumberNumbers[i].style.fontSize = "30px";
                }
            }
        }
    }

    let ClosingButton;
    function add_closing_button_to_Parent(position, add_keyboard_shortcut_for_closing, optional_additional_function, optional_delay_time) {
        switch (position) {
            case "top-right":
                ClosingButton = create_SVG_buttonElement(1820, 3 * boundary_size, 75, 75, "X", 70);
                break;
            case "bottom-center":
                ClosingButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 70);
                break;
        }
        ParentElem.appendChild(ClosingButton);
        ClosingButton.classList.add("instruction_element_nonbackground");
        AudioCont.play_sound_effect("alert_minimal");
        ClosingButton.onpointerdown = function () {
            if(optional_additional_function) optional_additional_function();
            close_instructions();
            AudioCont.play_sound_effect("close_menu");
        };

        if (add_keyboard_shortcut_for_closing) {
            add_keyboard_shortcuts_to_object(ClosingButton, ["Escape", "Enter", " "], 700, function () {
                close_instructions();
                AudioCont.play_sound_effect("close_menu");
            });
        }

        if (optional_delay_time > 0) {
            ClosingButton.style.display = "none";
            setTimeout(() => { ClosingButton.style.display = "inherit" }, optional_delay_time);
        }
    }

    this.instructions_requested_by_participant = function () {
        switch (current_instruction_type) {
            case "exploration":
                update_and_show_free_exploration_instructions();
                break;
            case "hint_and_search":
                open_instructions_page();
                break;
        }
    };

    function close_instructions() {
        let NonBackGroundElem = ParentElem.getElementsByClassName("instruction_element_nonbackground");
        for (let i = 0; i < NonBackGroundElem.length; i++) {
            NonBackGroundElem[i].style.display = "none";
        }

        let Background = ParentElem.getElementsByClassName("instructions_element_background")[0];
        Background.style.transition = "all 150ms ease-in-out";

        setTimeout(() => {
            Background.setAttribute("x", GenParam.RequestInstructionButtonSettings.center_x - 0.5 * GenParam.RequestInstructionButtonSettings.width);
            Background.setAttribute("y", GenParam.RequestInstructionButtonSettings.center_y - 0.5 * GenParam.RequestInstructionButtonSettings.height);
            Background.setAttribute("width", GenParam.RequestInstructionButtonSettings.width);
            Background.setAttribute("height", GenParam.RequestInstructionButtonSettings.height);
        }, 0);

        setTimeout(() => {
            Background.style.display = "none";
            ParentElem.style.display = "none";
            ExpCont.instructions_page_closed();
        }, 150);

        if (ClosingButton) ClosingButton.remove();
    }

    function open_instructions_page() {
        let Background = ParentElem.getElementsByClassName("instructions_element_background")[0];
        Background.style.display = "inherit";
        Background.style.transition = "all 200ms ease-in-out";
        ParentElem.style.display = "inherit";
        add_closing_button_to_Parent("top-left", true, undefined);

        setTimeout(() => {
            Background.setAttribute("x", boundary_size);
            Background.setAttribute("y", boundary_size);
            Background.setAttribute("width", GenParam.SVG_width - 2 * boundary_size);
            Background.setAttribute("height", GenParam.SVG_height - 2 * boundary_size);
        }, 0);

        setTimeout(() => {
            let NonBackGroundElem = ParentElem.getElementsByClassName("instruction_element_nonbackground");
            for (let i = 0; i < NonBackGroundElem.length; i++) {
                NonBackGroundElem[i].style.display = "inherit";
            }
        }, 250);
    }

    function show_empty_page(include_map_background) {
        current_instruction_type = "general";
        clear_instructions();
        CurrentInstructionsSVG = create_basic_instruction_elements();
        ParentElem.appendChild(CurrentInstructionsSVG);
        ParentElem.style.display = "inherit";
        ProgressDiv.style.display = "none";

        if(include_map_background){
            document.getElementById("Map").style.display = "inherit";
            let CoverRect = document.getElementsByClassName("instruction_cover_rect")[0];
            if(CoverRect) CoverRect.style.opacity = 0.2;
        }else{
            document.getElementById("Map").style.display = "none";
            document.getElementById("Interface").style.display = "none";
        }
    }

    this.show_consent_page = function () {
        show_empty_page(true);
        document.getElementById("Instructions_Title").innerHTML = "Your consent to participate in this study";

        let LeftTextElem = create_SVG_text_in_foreign_element(GenParam.GeneralInstructions.Consent.left_column, 2 * boundary_size, 110, 0.45 * GenParam.SVG_width, 0.8 * GenParam.SVG_height, "instructions_element_text");
        let RightTextElem = create_SVG_text_in_foreign_element(GenParam.GeneralInstructions.Consent.right_column, 0.51 * GenParam.SVG_width, 110, 0.45 * GenParam.SVG_width, 0.8 * GenParam.SVG_height, "instructions_element_text");
        LeftTextElem.childNodes[0].style.fontSize = "30px";
        RightTextElem.childNodes[0].style.fontSize = "30px";
        CurrentInstructionsSVG.appendChild(LeftTextElem);
        CurrentInstructionsSVG.appendChild(RightTextElem);

        let tickboxdims = 0.05 * GenParam.SVG_width;
        let TickBoxForeign = create_SVG_foreignElement(0.3 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, tickboxdims, tickboxdims, undefined, undefined);
        let ConsentTickBox = document.createElement("input");
        ConsentTickBox.type = "checkbox";
        ConsentTickBox.style.width = "90%";
        ConsentTickBox.style.height = "90%";
        ConsentTickBox.style.cursor = "pointer";
        ConsentTickBox.style.outline = "5px solid darkred";

        TickBoxForeign.appendChild(ConsentTickBox);
        CurrentInstructionsSVG.appendChild(TickBoxForeign);

        let ConsentBoxText = create_SVG_text_elem(0.3 * GenParam.SVG_width + 1.5 * tickboxdims, 0.85 * GenParam.SVG_height + 0.6 * tickboxdims, "I consent to these terms", "instructions_element_text", undefined);
        ConsentBoxText.style.fontSize = "50px";
        ConsentBoxText.style.fill = "darkred";
        ConsentBoxText.style.fontWeight = 700;
        CurrentInstructionsSVG.appendChild(ConsentBoxText);

        let ContinueButton = create_SVG_buttonElement(0.8 * GenParam.SVG_width, 0.85 * GenParam.SVG_height + 0.5 * tickboxdims, 400, 75, "Continue", 40);
        CurrentInstructionsSVG.appendChild(ContinueButton);
        ContinueButton.style.display = "none";

        ConsentTickBox.onchange = function () {
            if (ConsentTickBox.checked) {
                ExpCont.consent_provided_by_participant();
                ContinueButton.style.display = "inherit";
                ConsentTickBox.style.outline = "5px solid navy";
                ConsentBoxText.style.fill = "navy";
            } else {
                ContinueButton.style.display = "none";
                ConsentTickBox.style.outline = "5px solid darkred";
                ConsentBoxText.style.fill = "darkred";
            }
        };

        ContinueButton.onpointerdown = function () {
            ExpCont.general_instructions_page_completed();
            AudioCont.play_sound_effect("button_click");
        };
    };

    this.show_browser_check_and_fullscreen_page = function () {
        show_empty_page(true);
        let browser = getBrowser();

        if (browser !== "Chrome") {
            document.getElementById("Instructions_Title").innerHTML = "Oops! This experiment only works in Chrome...";
            let WrongBrowserTextElem = create_SVG_text_in_foreign_element("This experiment is only tested and validated in Chrome. Since you are using a different browser you will not be able to participate in this experiment. Please return this task on Prolific. Our apologies for your inconvenience :(",
                4 * boundary_size, 0.35 * GenParam.SVG_height, GenParam.SVG_width - 8 * boundary_size, 0.5 * GenParam.SVG_height, "instructions_element_text", undefined);
            WrongBrowserTextElem.childNodes[0].style.fontWeight = 600;
            WrongBrowserTextElem.childNodes[0].style.fontStyle = "italic";
            CurrentInstructionsSVG.appendChild(WrongBrowserTextElem);
        } else {
            document.getElementById("Instructions_Title").innerHTML = "This experiment is best experienced in full-screen mode";
            let FullScreenTextElem = create_SVG_text_in_foreign_element("Pressing the button below will toggle full-screen mode. <br>" +
                "On windows, you can exit (and-re-enter) full-screen mode at any time by pressing [F11]. On Mac, you can exit and re-enter full-screen mode by pressing [Command]+[Cntrl]+[F]. <br>" +
                "<br>" +
                "In addition, please make sure that your audio is on! (The sound will enhance your performance during this task). ",
                4 * boundary_size, 0.25 * GenParam.SVG_height, GenParam.SVG_width - 8 * boundary_size, 0.4 * GenParam.SVG_height, "instructions_element_text", undefined);
            CurrentInstructionsSVG.appendChild(FullScreenTextElem);

            let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 500, 75, "Go to full-screen mode", 40);
            ContinueButton.onpointerdown = function (event) {
                toggleFullscreen(event);
                ExpCont.general_instructions_page_completed();
            };
            CurrentInstructionsSVG.appendChild(ContinueButton);
        }
    };

    this.show_single_sitting_page = function () {
        show_empty_page(true);

        let Icon = document.getElementById("icon_attention").cloneNode(true);
        Icon.style.display = "inherit";
        Icon.style.stroke = "darkred";
        CurrentInstructionsSVG.appendChild(Icon);
        MoveElemToCoords(Icon, 0.1 * GenParam.SVG_width,0.4 * GenParam.SVG_height);

        document.getElementById("Instructions_Title").innerHTML = "Please complete this experiment in a single setting";
        let FullScreenTextElem = create_SVG_text_in_foreign_element(
            "For this experiment (and your earnings at the end), it is important that you <u>pay close attention throughout the entire experiment.</u> " +
            "Please avoid any distractions (either on this screen or on a different screen) and complete the experiment in a single sitting. This will help you to complete the experiment faster, and earn more money at the end. ",
            0.2 * GenParam.SVG_width , 0.275 * GenParam.SVG_height, 0.8 * GenParam.SVG_width - 8 * boundary_size, 0.4 * GenParam.SVG_height, "instructions_element_text", undefined);
        CurrentInstructionsSVG.appendChild(FullScreenTextElem);
        FullScreenTextElem.style.color = "darkred";

        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 40);
        ContinueButton.onpointerdown = function () {
            ExpCont.general_instructions_page_completed();
        };
        CurrentInstructionsSVG.appendChild(ContinueButton);
    };

    this.show_character_creation_screen = function(map_update_func){
        show_empty_page(true);
        document.getElementById("Instructions_Title").innerHTML = "Select your icon";

        let CCCont = new CharacterCreationController(CurrentInstructionsSVG, map_update_func);

        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.875 * GenParam.SVG_height, 400, 75, "Continue", 40);
        ContinueButton.onpointerdown = function () {
            ExpCont.general_instructions_page_completed();
        };
        CurrentInstructionsSVG.appendChild(ContinueButton);
    };

    this.show_partner_introduction_screen = function(){
        show_empty_page(true);
        let PartnerInfo = WorldState.get_partner_icon_settings();
        document.getElementById("Instructions_Title").innerHTML = "Meet " + PartnerInfo.name;
        let pronoun = PartnerInfo.type === "female" ? "she" : "he";
        AudioCont.play_sound_effect("alert");

        let IconBox = create_SVG_rect(0.6*GenParam.SVG_width,0.2 * GenParam.SVG_height,540, 640, undefined,undefined);
        IconBox.style.rx = "50";
        IconBox.style.fill = "#FFFFFF99";
        CurrentInstructionsSVG.appendChild(IconBox);

        let IconSVG = WorldState.get_person_icon("partner", "front");
        IconSVG.style.transform = "scale(20)";
        let IconTranslateGroup  = create_SVG_group(0,0,undefined,undefined);
        IconTranslateGroup.appendChild(IconSVG);
        CurrentInstructionsSVG.appendChild(IconTranslateGroup);
        moveSVGCenterTo(IconTranslateGroup, IconBox.getBBox().x + 0.5 * IconBox.getBBox().width, IconBox.getBBox().y + 0.5 * IconBox.getBBox().height);

        let introtext = PartnerInfo.name + " is an intern on the island, who will be shadowing you for the next couple of days to " +
            "get a feel of what's it like to be a caretaker on the island. " + pronoun + " will observe your interactions with the Fennimals on the island, but " +
            pronoun + " will not interact with any of the Fennimals directly. ";
        let TextObj = create_SVG_text_in_foreign_element(introtext, 0.1 * GenParam.SVG_width, 0.3 * GenParam.SVG_height, 0.5 * GenParam.SVG_width, 0.3 * GenParam.SVG_height, undefined,undefined);
        TextObj.style.fontSize = "40px";
        CurrentInstructionsSVG.appendChild(TextObj);

        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.875 * GenParam.SVG_height, 400, 75, "Continue", 40);
        ContinueButton.onpointerdown = function () {
            ExpCont.general_instructions_page_completed();
        };
        CurrentInstructionsSVG.appendChild(ContinueButton);
    };

    let OverviewPage_remaining_steps, OverviewPage_PreviousTextElem = [], OverviewPage_ContinueButton,
        OverviewPage_SearchButton, OverviewPage_Search_ContinueText;

    this.show_overview_page = function () {
        let stars_can_be_earned = Stimuli.get_maximum_number_of_bonus_stars() > 0;
        let story_text_offset = stars_can_be_earned ? 0 : 0.175 * GenParam.SVG_height;
        OverviewPage_remaining_steps = stars_can_be_earned ? ["stars", "movement", "search", "lookout", "instructions"] : ["movement", "search", "lookout", "instructions"];

        show_empty_page(true);
        document.getElementById("Instructions_Title").innerHTML = "Overview";

        GenParam.GeneralInstructions.Overview.story = GenParam.GeneralInstructions.Overview.story.replace("%NUMBERDAYS%", Stimuli.get_number_of_days_in_experiment());
        let StoryTextElem = create_SVG_text_in_foreign_element(GenParam.GeneralInstructions.Overview.story, 2 * boundary_size, 110 + story_text_offset, 0.45 * GenParam.SVG_width, 0.4 * GenParam.SVG_height, "instructions_element_text");
        OverviewPage_PreviousTextElem.push(StoryTextElem);
        StoryTextElem.childNodes[0].style.textAlign = "justify";
        CurrentInstructionsSVG.appendChild(StoryTextElem);

        OverviewPage_ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.92 * GenParam.SVG_height, 400, 75, "Continue", 40);
        CurrentInstructionsSVG.appendChild(OverviewPage_ContinueButton);
        OverviewPage_ContinueButton.onpointerdown = function () {
            overview_page_next_step();
            AudioCont.play_sound_effect("button_click");
        };
    };

    function overview_page_next_step() {
        if (OverviewPage_remaining_steps.length > 0) {
            let background_color = "#EDEDED";
            let boxheight = 0.175 * GenParam.SVG_height, box_offset_top = 150;
            let spacing_boxes = 0.01 * GenParam.SVG_height;
            let nextstep = OverviewPage_remaining_steps.shift();

            OverviewPage_ContinueButton.style.display = "inherit";
            if (OverviewPage_SearchButton) {
                OverviewPage_SearchButton.disable_functionality();
                OverviewPage_Search_ContinueText.style.display = "none";
            }

            OverviewPage_PreviousTextElem.forEach(t => t.childNodes[0].style.color = "gray");

            switch (nextstep) {
                case "stars":
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace(/%CURRENCYSYMBOL%/g, Stimuli.get_bonus_details().currency_symbol);
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace("%AMOUNTPERSTAR%", Stimuli.get_bonus_details().bonus_per_star.toFixed(2));
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace("%MAXNUMBERSTARS%", Stimuli.get_maximum_number_of_bonus_stars());
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace("%MAXBONUSAMOUNT%", (Stimuli.get_maximum_number_of_bonus_stars() * Stimuli.get_bonus_details().bonus_per_star).toFixed(2));
                    show_bonus_star_on_screen(CurrentInstructionsSVG, 0.075 * GenParam.SVG_width, 110 + 0.57 * GenParam.SVG_height, true, undefined, undefined);

                    let StarTextElem = create_SVG_text_in_foreign_element(GenParam.GeneralInstructions.Overview.bonus, 0.15 * GenParam.SVG_width, 110 + 0.42 * GenParam.SVG_height, 0.33 * GenParam.SVG_width, 0.8 * GenParam.SVG_height, "instructions_element_text");
                    OverviewPage_PreviousTextElem.push(StarTextElem);
                    StarTextElem.childNodes[0].style.textAlign = "justify";
                    CurrentInstructionsSVG.appendChild(StarTextElem);
                    break;
                case "movement":
                    let BackgroundRect_Movement = create_SVG_rect(0.51 * GenParam.SVG_width, box_offset_top, 0.45 * GenParam.SVG_width, boxheight, undefined, undefined);
                    BackgroundRect_Movement.style.fill = background_color;
                    BackgroundRect_Movement.setAttribute("rx", 30);
                    CurrentInstructionsSVG.appendChild(BackgroundRect_Movement);

                    let PlayerIcon = WorldState.get_person_icon("player", "front");
                    PlayerIcon.style.transform = "scale(5)";

                    let PlayerIconContainer = create_SVG_group(0, 0, 0, 0, undefined, undefined);
                    PlayerIconContainer.appendChild(PlayerIcon);
                    CurrentInstructionsSVG.appendChild(PlayerIconContainer);
                    PlayerIconContainer.style.transform = `translate(${0.55 * GenParam.SVG_width}px, ${box_offset_top + 0.5 * boxheight}px)`;

                    let MovementText = create_SVG_text_in_foreign_element("This icon represents you. You can move this icon across the map by pressing down with your mouse. ",
                        0.58 * GenParam.SVG_width, box_offset_top, 0.375 * GenParam.SVG_width, boxheight, "instructions_element_text");
                    CurrentInstructionsSVG.appendChild(MovementText);
                    break;
                case "search":
                    let BackgroundRect_Search = create_SVG_rect(0.51 * GenParam.SVG_width, box_offset_top + boxheight + spacing_boxes, 0.45 * GenParam.SVG_width, boxheight, undefined, undefined);
                    BackgroundRect_Search.style.fill = background_color;
                    BackgroundRect_Search.setAttribute("rx", 30);
                    CurrentInstructionsSVG.appendChild(BackgroundRect_Search);

                    let SearchButtonDims = {
                        center_x: 0.545 * GenParam.SVG_width,
                        center_y: box_offset_top + 1.5 * boxheight + 1 * spacing_boxes,
                        width: .55 * boxheight,
                        height: .55 * boxheight
                    };
                    OverviewPage_SearchButton = new ActionButton(CurrentInstructionsSVG, "magnifier", SearchButtonDims, 1000, false, function () {
                        overview_page_next_step();
                        AudioCont.play_sound_effect("success");
                        create_ripple(CurrentInstructionsSVG, SearchButtonDims.center_x, SearchButtonDims.center_y, true, AudioCont);
                    });
                    OverviewPage_ContinueButton.style.display = "none";

                    let SearchButtonText = create_SVG_text_in_foreign_element("Some locations on the map contain Fennimals. Once you are close to a location, a magnifying glass will appear. You can search for a Fennimal by holding down on this button.",
                        0.58 * GenParam.SVG_width, box_offset_top + 0.85 * boxheight + 1 * spacing_boxes, 0.375 * GenParam.SVG_width, 1.1 * boxheight, "instructions_element_text");
                    CurrentInstructionsSVG.appendChild(SearchButtonText);

                    OverviewPage_Search_ContinueText = create_SVG_text_elem(0.5 * GenParam.SVG_width, 0.92 * GenParam.SVG_height, "Hold down on the search button to continue...", "instructions_element_text", undefined);
                    OverviewPage_Search_ContinueText.style.fontStyle = "italic";
                    OverviewPage_Search_ContinueText.style.textAnchor = "middle";
                    CurrentInstructionsSVG.appendChild(OverviewPage_Search_ContinueText);
                    break;
                case "lookout":
                    let BackgroundRect_Lookout = create_SVG_rect(0.51 * GenParam.SVG_width, box_offset_top + 2 * boxheight + 2 * spacing_boxes, 0.45 * GenParam.SVG_width, boxheight, undefined, undefined);
                    BackgroundRect_Lookout.style.fill = background_color;
                    BackgroundRect_Lookout.setAttribute("rx", 30);
                    CurrentInstructionsSVG.appendChild(BackgroundRect_Lookout);

                    let LookoutTowerCopy = document.getElementById("watchtower").cloneNode(true);
                    LookoutTowerCopy.removeAttribute("id");
                    let LookoutTowerScale = create_SVG_group(0, 0, 0, 0, undefined, undefined);
                    let LookoutTowerTranslate = create_SVG_group(0, 0, 0, 0, undefined, undefined);
                    LookoutTowerTranslate.appendChild(LookoutTowerCopy);
                    LookoutTowerScale.appendChild(LookoutTowerTranslate);
                    CurrentInstructionsSVG.appendChild(LookoutTowerScale);

                    LookoutTowerScale.style.transformOrigin = "center";
                    LookoutTowerScale.style.transform = "scale(2)";
                    MoveElemToCoords(LookoutTowerTranslate, 0.52 * GenParam.SVG_width, box_offset_top + 2 * boxheight + 2 * spacing_boxes - 45);

                    let LookoutTowerText = create_SVG_text_in_foreign_element("There is a lookout tower located at the center of the island. If you are unsure where to go, climbing this tower will give you a hint!",
                        0.58 * GenParam.SVG_width, box_offset_top + 2 * boxheight + 2 * spacing_boxes, 0.375 * GenParam.SVG_width, boxheight, "instructions_element_text");
                    CurrentInstructionsSVG.appendChild(LookoutTowerText);
                    break;
                case "instructions":
                    let BackgroundRect_Instructions = create_SVG_rect(0.51 * GenParam.SVG_width, box_offset_top + 3 * boxheight + 3 * spacing_boxes, 0.45 * GenParam.SVG_width, boxheight, undefined, undefined);
                    BackgroundRect_Instructions.style.fill = background_color;
                    BackgroundRect_Instructions.setAttribute("rx", 30);
                    CurrentInstructionsSVG.appendChild(BackgroundRect_Instructions);

                    let ExampleButton = create_SVG_buttonElement(0.545 * GenParam.SVG_width, box_offset_top + 3.5 * boxheight + 3 * spacing_boxes, GenParam.RequestInstructionButtonSettings.width, GenParam.RequestInstructionButtonSettings.height, GenParam.RequestInstructionButtonSettings.text, GenParam.RequestInstructionButtonSettings.textsize);
                    let InstructionsText = create_SVG_text_in_foreign_element("On the top-left of the screen you will find a button labelled '" + GenParam.RequestInstructionButtonSettings.text + "' . Click this button if you are unsure about what to do next.",
                        0.58 * GenParam.SVG_width, box_offset_top + 3 * boxheight + 3 * spacing_boxes, 0.375 * GenParam.SVG_width, boxheight, "instructions_element_text");

                    CurrentInstructionsSVG.appendChild(ExampleButton);
                    CurrentInstructionsSVG.appendChild(InstructionsText);
                    break;
            }
        } else {
            ExpCont.general_instructions_page_completed();
        }
    }

    //FREE EXPLORATION PHASE
    let Exploration_Array_Fennimal_Objects, Array_of_Locations_in_game, FennimalBox, LocationBox, TextElem_Main_Instructions, Fennimals_in_phase;
    this.initialize_free_exploration_instructions = function (interaction_type, current_block_num, can_earn_stars, fennefinder_status, forced_tower_climb_at_start, Fennimals_in_phase_Array) {
        Fennimals_in_phase = Fennimals_in_phase_Array.filter(f => f.name !== undefined);
        current_instruction_type = "exploration";

        clear_instructions();
        CurrentInstructionsSVG = create_basic_instruction_elements();
        ParentElem.appendChild(CurrentInstructionsSVG);
        ParentElem.style.display = "inherit";
        add_closing_button_to_Parent("top-right", false, undefined);

        let Fennefinder_text = fennefinder_status === true ? "The Fennefinder on the bottom-right of the screen will help guide you to the different Fennimals. " :
            fennefinder_status === "low_power_mode" ? "Unfortunately, the Fennefinder has run out of battery - so you'll have to find all Fennimals by memory! " : "";

        let dometext = forced_tower_climb_at_start ? "At the start of the day, you should first climb the watchtower to see the locations of all Fennimals. " : "";

        document.getElementById("Instructions_Title").innerHTML = "Day " + current_block_num + ": find all the Fennimals on the island";

        let instruction_text = "Your task today is to explore the island and find all Fennimals on the island. There are currently " + Fennimals_in_phase.length + " Fennimals spread across the different regions of Fenneland.  <br>" +
            "You can search different locations. If there is a Fennimal present, then please enter the location and follow the instructions. " +
            Fennefinder_text + dometext + "<br>Press the X to close this page and travel the island.";

        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 100, 100, (GenParam.SVG_width - 2 * 100), 500, "instruction_element_text");
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground");
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px";
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions);

        FennimalBox = new Vertical_scollable_box(ParentElem, (0.5 * 1920 - 0.5 * 1800), 450, 1800, 500);
        FennimalBox.change_opacity(0);
        FennimalBox.add_array_of_Fennimal_icons(Fennimals_in_phase, 200, 200, true, true);

        setTimeout(() => FennimalBox.change_opacity(1), 5);
        update_progress_new_day(current_block_num);
    };

    this.update_exploration_phase_instructions_to_show_completion = function () {
        AudioCont.play_sound_effect("alert");
        TextElem_Main_Instructions.remove();
        TextElem_Main_Instructions = create_SVG_text_in_foreign_element("Well done! You have photographed all the Fennimals! You will continue to the next phase of the experiment after closing these instructions!", 100, 150, (1920 - 2 * 100), 500, "instruction_element_text");
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground");
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px";
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontWeight = 700;
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.color = "darkgreen";
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions);

        ClosingButton.style.opacity = 0;
        setTimeout(() => { ClosingButton.style.opacity = 1; }, 2500);
    };

    function update_and_show_free_exploration_instructions() {
        ParentElem.style.display = "inherit";
        FennimalBox.change_opacity(0);
        open_instructions_page();

        setTimeout(() => {
            FennimalBox.clear_all_icons();

            let VisitedFennimals = [];
            let UnvisitedFennimals = [];
            WorldState.get_array_of_Fennimals_on_map().forEach(f => {
                if (f.visited) VisitedFennimals.push(f);
                else UnvisitedFennimals.push(f);
            });

            VisitedFennimals.sort((a, b) => a.num_in_phase - b.num_in_phase);

            FennimalBox.add_array_of_Fennimal_icons([...VisitedFennimals, ...UnvisitedFennimals], 200, 200, true);
            setTimeout(() => FennimalBox.change_opacity(1), 5);

            if (VisitedFennimals.length > 0) {
                TextElem_Main_Instructions.remove();
                TextElem_Main_Instructions = create_SVG_text_in_foreign_element("Your task today is to explore the island and find all Fennimals on the island. You have already found these Fennimals:", 100, 150, (1920 - 2 * 100), 500, "instruction_element_text");
                TextElem_Main_Instructions.classList.add("instruction_element_nonbackground");
                TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px";
                CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions);
                FennimalBox.change_position("y", 0.3 * GenParam.SVG_height);
            }
        }, 210);
    }

    // HINT AND SEARCH PHASES
    this.initialize_hint_and_search_phase_general_instructions = function (interaction_type, hint_type, current_block_num, num_bonus_stars_per_question, fennefinder_status, Fennimals_in_phase_Array) {
        let close_button_pos = "bottom-center";
        current_instruction_type = "hint_and_search";
        let continue_button_time = 500;

        if(num_bonus_stars_per_question === true) num_bonus_stars_per_question = 1;
        let can_earn_stars = num_bonus_stars_per_question > 0;

        clear_instructions();
        CurrentInstructionsSVG = create_basic_instruction_elements();
        ParentElem.appendChild(CurrentInstructionsSVG);
        ParentElem.style.display = "inherit";

        document.getElementById("Instructions_Title").innerHTML = "Day " + current_block_num + ": time to visit some Fennimals!";

        let can_earn_stars_text = "", text_y = 300, text_h = 500;
        if(can_earn_stars){
            continue_button_time += num_bonus_stars_per_question * 500;
            const dx = 0.08 * GenParam.SVG_width;
            const center = 0.5 * GenParam.SVG_width;
            const AllXpos = {
                1: [center],
                2: [center - 0.5*dx, center + 0.5 * dx],
                3: [center - dx,center, center +  dx],
                4: [center - 1.5*dx,center - 0.5*dx, center + 0.5 * dx, center + 1.5 * dx],
                5: [center - 2*dx,center - dx,center, center +  dx, center + 2*dx],
            };
            const starpos = AllXpos[num_bonus_stars_per_question];

            for(let i = 0; i < num_bonus_stars_per_question; i++){
                setTimeout(() => {
                    show_bonus_star_on_screen(ParentElem, starpos[i], 0.53 * GenParam.SVG_height, true, "deletable_bonus_star", 1, undefined);
                }, (i+1)*300);
            }
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;

            let numtext = num_bonus_stars_per_question > 1 ? num_bonus_stars_per_question + " bonus stars" : "a bonus star";
            can_earn_stars_text = "<b><br><br> Please answer carefully, as you will earn " + numtext + " for each question you correctly answer! </b><br><br><br><br><br>";
            text_y = 200;
            text_h = 600;
        }

        let Fennefinder_text = fennefinder_status === true ? "The Fennefinder on the bottom-right of the screen will help guide you to the different Fennimals. " :
            fennefinder_status === "low_power_mode" ? "Unfortunately, the Fennefinder has run out of battery - so you'll have to find all Fennimals by memory! " : "";

        let instruction_text = "It's time to check in on the Fennimals! One at a time, you will be given a hint to find them. " +
            "After you have interacted with them, you will be given the next hint, until you have visited all " + Fennimals_in_phase_Array.length + " Fennimals.<br>" +
            can_earn_stars_text + Fennefinder_text + "<br><i>Tip: don't know where to go next? Try climbing the watchtower!</i>";

        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 100, text_y, (1920 - 2 * 100), text_h, "instruction_element_text");
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground");
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px";
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions);

        update_progress_new_day(current_block_num);

        function delete_bonus_star_icons(){
            Array.from(document.getElementsByClassName("deletable_bonus_star")).forEach(s => s.remove());
        }
        add_closing_button_to_Parent(close_button_pos, false, delete_bonus_star_icons, continue_button_time);
    };

    this.initialize_hint_and_search_phase_trial_instructions = function (FenObj, hint_type, percentage_complete) {
        this.update_progress_within_day(percentage_complete);
        let continue_button_time = 500;

        current_instruction_type = "hint_and_search";
        ParentElem.style.display = "inherit";

        document.getElementById("Instructions_Title").innerHTML = "Find this Fennimal!";
        if(TextElem_Main_Instructions) TextElem_Main_Instructions.remove();

        let icon_y = (FenObj.bonus_stars_earnable === true || FenObj.bonus_stars_earnable > 0) ? 0.375 * GenParam.SVG_height : 0.45 * GenParam.SVG_height;

        if (hint_type === "icon") {
            let Icon = create_Fennimal_SVG_object(FenObj, GenParam.Fennimal_head_size, false);
            CurrentInstructionsSVG.appendChild(Icon);
            let FennimalScaleGroup = Icon.getElementsByClassName("Fennimal_scale_group")[0];
            let Box = FennimalScaleGroup.getBBox();
            let delta_x = (0.5 * GenParam.SVG_width) - (Box.x + 0.5 * Box.width);
            let delta_y = (icon_y) - (Box.y + 0.45 * Box.height);
            Icon.style.transform = `translate(${delta_x}px, ${delta_y}px)`;
            Icon.classList.add("instruction_element_nonbackground");

            TextElem_Main_Instructions = Icon;
            Icon.style.display = "none";
            setTimeout(() => { Icon.style.display = "inherit"; }, 200);
        } else if (hint_type === "toy" || hint_type === "toybox") {
            TextElem_Main_Instructions = create_SVG_group(0,0,undefined,undefined);
            CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions);

            let id = hint_type === "toy" ? "toy_" + FenObj.toy : "toybox_" + FenObj.toybox;
            let ElemIcon = copy_scale_and_move_object_to_position(document.getElementById(id), TextElem_Main_Instructions, 0.5 * GenParam.SVG_width, 0.5 * GenParam.SVG_height, 4);
            if (hint_type === "toy") set_toy_color_scheme(ElemIcon, FenObj.toy, false);

            ElemIcon.style.display = "none";
            ElemIcon.classList.add("instruction_element_nonbackground");
            setTimeout(() => { ElemIcon.style.display = "inherit"; }, 200);
        }

        if(FenObj.bonus_stars_earnable === true || FenObj.bonus_stars_earnable > 0){
            let num_bonus_stars = FenObj.bonus_stars_earnable === true ? 1 : FenObj.bonus_stars_earnable;
            let bonustext = num_bonus_stars > 1 ? "You can earn up to " + num_bonus_stars + " stars!" : "You can earn a bonus star";

            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
            let BonusText = create_SVG_text_in_foreign_element(bonustext, -0.175 * GenParam.SVG_width, 0.29*GenParam.SVG_height, 0.5 * GenParam.SVG_width, 0.1 * GenParam.SVG_height, "questionbar_bonustext");
            BonusText.style.fontSize = "40px";
            BonusText.style.textAlign = "center";
            BonusText.classList.add("instruction_element_nonbackground");
            TextElem_Main_Instructions.appendChild(BonusText);

            continue_button_time = num_bonus_stars * 500;
        } else {
            document.getElementsByClassName("instructions_element_background")[0].style.fill = "";
        }

        open_instructions_page();
    };

    // NAME RECALL TASK
    this.start_name_recall_task = function (current_block_num, bonus_stars_per_correct_answer) {
        current_instruction_type = "name_recall_task";
        let can_earn_stars = bonus_stars_per_correct_answer > 0;
        let bonus_start = can_earn_stars ? "Today you can earn some bonus stars! " : "";
        let bonus_text = can_earn_stars ? (bonus_stars_per_correct_answer === 1 ? "You will earn one star for each name you correctly enter!" : `You will earn ${bonus_stars_per_correct_answer} stars for each name you correctly enter!`) : "";

        clear_instructions();
        CurrentInstructionsSVG = create_basic_instruction_elements();
        ParentElem.appendChild(CurrentInstructionsSVG);
        ParentElem.style.display = "inherit";
        CurrentInstructionsSVG.getElementsByClassName("instructions_element_cover")[0].style.opacity = 1;

        let RBC = new RecallBoxController(CurrentInstructionsSVG, 1700, 400, false, true, "I do not remember any names", name_recall_task_complete);
        RBC.translate_elements(100, 420);

        if (can_earn_stars) {
            document.getElementById("Instructions_Title").innerHTML = "Day " + current_block_num + ": which Fennimals do you remember? (BONUS STAR DAY)";
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
            document.getElementsByClassName("instructions_element_cover")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
        } else {
            document.getElementById("Instructions_Title").innerHTML = "Day " + current_block_num + ": which Fennimals do you remember?";
        }
        document.getElementById("Instructions_Title").style.transform = "translate(0px, -50px)";

        let instruction_text = bonus_start + "Please write down all the names of the different Fennimals which you can remember. " + bonus_text + "<br><br> " +
            "<i>You can enter a name by typing in the box and clicking on the 'Add' button. Your previous answers will be blurred, but if you made a mistake you can click on <span style='color:firebrick'> [x] </span> to remove an answer. If you have listed all the names you remember, then you can click on the 'Done' button to continue (you will not be able to return after pressing the button!) <br>";

        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 100, 50, (1920 - 2 * 100), 350, "instruction_element_text");
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground");
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "35px";
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions);

        update_progress_new_day(current_block_num);
        this.update_progress_within_day(false);
    };

    function name_recall_task_complete(RecalledNames) {
        clear_instructions();
        ExpCont.recalled_names_task_complete(RecalledNames);
    }

    // JUMP TO TRIAL
    this.initialize_jump_to_trial_instructions = function(interaction_type, current_block_num, num_bonus_stars_per_question, fennefinder_status, Fennimals_in_phase_Array){
        let close_button_pos = "bottom-center";
        current_instruction_type = "hint_and_search";
        let continue_button_time = 500;

        if(num_bonus_stars_per_question === true) num_bonus_stars_per_question = 1;
        let can_earn_stars = num_bonus_stars_per_question > 0;

        clear_instructions();
        CurrentInstructionsSVG = create_basic_instruction_elements();
        ParentElem.appendChild(CurrentInstructionsSVG);
        ParentElem.style.display = "inherit";

        document.getElementById("Instructions_Title").innerHTML = "Day " + current_block_num + ": time to visit some Fennimals!";

        let can_earn_stars_text = "", text_y = 100, text_h = 500;
        if(can_earn_stars){
            continue_button_time += num_bonus_stars_per_question * 500;
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
            let numtext = num_bonus_stars_per_question > 1 ? num_bonus_stars_per_question + " bonus stars" : "a bonus star";
            can_earn_stars_text = "<b> Please answer carefully, as you will earn " + numtext + " for each question you correctly answer! </b><br><br><br><br><br>";
            text_y = 100;
            text_h = 700;
        }

        let instruction_text = "To help speed things up, you will be driven across the island (you won't have to walk yourself). " +
            "You will interact with the Fennimals one at a time. " +
            "You will then be taken to the next Fennimal until you have visited all " + Fennimals_in_phase_Array.length + " Fennimals.<br><br>" +
            can_earn_stars_text;

        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 100, text_y, (1920 - 2 * 100), text_h, "instruction_element_text");
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground");
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px";
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions);

        update_progress_new_day(current_block_num);
        add_closing_button_to_Parent(close_button_pos, false, undefined, continue_button_time);
    };

    // SORTING TASKS
    this.start_Fennimal_attribute_sorting_task = function(phasenum, TaskData, attributes_arr, max_earnable_stars){
        current_instruction_type = "match_head_to_region";

        clear_instructions();
        CurrentInstructionsSVG = create_basic_instruction_elements();
        ParentElem.appendChild(CurrentInstructionsSVG);
        ParentElem.style.display = "inherit";
        document.getElementById("Instructions_Title").innerHTML = "Day " + phasenum + " : do you remember the Fennimals you just encountered?";

        let task_instruction = "On the next page you will see " + TaskData.length +  " different boxes, each for a different Fennimal. " +
            "On the top of the page you will see a set of smaller boxes, each containing a different piece of information. " +
            "Your task is to match each of these smaller boxes with the correct Fennimal by dragging the smaller boxes to the correct larger box." +
            "Once you have placed all smaller boxes they will be replaced with a different set of information until you have completed all questions. ";

        if(attributes_arr.includes("name")){
            task_instruction = "First, you will be asked to write down the names of all " + TaskData.length +  " Fennimals you encountered yesterday. " +
                "Then a set of smaller boxes will appear on the top of the page, each containing a different piece of information. " +
                "Your task is to match each of these smaller boxes with the correct Fennimal.";
        }

        let reward_instruction = max_earnable_stars > 0 ? "<br><br><br><br><br>Please pay close attention while answering the questions. You will start the day with " + max_earnable_stars + " bonus stars - but you will lose one star for each mistake you make!" : "";

        let instruction_text = task_instruction + reward_instruction;
        TextElem_Main_Instructions = create_SVG_text_in_foreign_element(instruction_text, 0.1 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, 0.8 * GenParam.SVG_width, 0.6 * GenParam.SVG_height, "instruction_element_text");
        TextElem_Main_Instructions.classList.add("instruction_element_nonbackground");
        TextElem_Main_Instructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px";
        CurrentInstructionsSVG.appendChild(TextElem_Main_Instructions);

        update_progress_new_day(phasenum);
        that.update_progress_within_day(false);

        if(max_earnable_stars > 0) {
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
        }

        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 40);
        CurrentInstructionsSVG.appendChild(ContinueButton);
        ContinueButton.onpointerdown = function () {
            start_Fennimal_attribute_sorting_task(phasenum, TaskData, attributes_arr, max_earnable_stars);
            AudioCont.play_sound_effect("button_click");
        };
    };

    function start_Fennimal_attribute_sorting_task(phasenum, TaskData, attributes_arr, max_earnable_stars) {
        clear_instructions();
        CurrentInstructionsSVG = create_basic_instruction_elements();
        ParentElem.appendChild(CurrentInstructionsSVG);
        ParentElem.style.display = "inherit";
        update_progress_new_day(phasenum);
        that.update_progress_within_day(0);

        if(max_earnable_stars > 0) {
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
        }

        let HeadToRegionSortCont = new FennimalAttributeSortingTask(CurrentInstructionsSVG, document.getElementById("Instructions_Title"),  TaskData, attributes_arr, max_earnable_stars, that, completed_sorting_task);
    }

    function completed_sorting_task(Data) {
        clear_instructions();
        ExpCont.sorting_task_completed(Data);
    }

    this.start_card_sorting_task = function (current_block_num, SpecialSettings) {
        current_instruction_type = "card_sorting_task";
        clear_instructions();

        CurrentInstructionsSVG = create_SVG_group(0, 0, undefined, undefined);
        ParentElem.appendChild(CurrentInstructionsSVG);
        ParentElem.style.display = "inherit";

        let CardSortCont = new CARDSORTINGTASK(current_block_num, ParentElem, Stimuli, this.card_sorting_task_completed, SpecialSettings);
        let ProgressElem = create_progress_elements();
        ProgressElem.setAttribute("y", 1025);
        ProgressElem.style.opacity = 0.5;
        ParentElem.appendChild(ProgressElem);

        update_progress_new_day(current_block_num);
        this.update_progress_within_day(false);
    };

    this.card_sorting_task_completed = function (Data) {
        ExpCont.card_sorting_task_complete(Data);
    };

    // PSEUDODAY CARDS
    this.show_pseudo_day_information_page = function(information_type, title, text, OptionalInformation) {
        if(text) text = text.replaceAll("%PARTNERNAME%", WorldState.get_partner_icon_settings().name);

        clear_instructions();
        CurrentInstructionsSVG = create_basic_instruction_elements();
        ParentElem.appendChild(CurrentInstructionsSVG);
        ParentElem.style.display = "inherit";
        show_empty_page(true);
        AudioCont.play_sound_effect("alert");

        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.875 * GenParam.SVG_height, 400, 75, "Continue", 40);
        ContinueButton.onpointerdown = function (event) {
            ExpCont.instructions_page_closed();
        };
        CurrentInstructionsSVG.appendChild(ContinueButton);

        if(information_type === "partner_leaves" || information_type === "partner_returns"){
            let Partner = WorldState.get_partner_icon_settings();
            let pronoun = Partner.type === "female" ? "she" : "he";
            let pronounC = Partner.type === "female" ? "She" : "He";
            let posses = Partner.type === "female" ? "her" : "his";

            let pTitle = information_type === "partner_leaves" ? `${Partner.name || "Your partner"} has left the island` : `${Partner.name || "Your partner"} has returned to the island!`;
            document.getElementById("Instructions_Title").innerHTML = pTitle;

            let pText = information_type === "partner_leaves" ?
                `${Partner.name || "Your partner"} has to attend some classes away from the island. Until further notice, ${pronoun} will not be present while you take care of the Fennimals. ${pronounC} will not learn what will happen on the island for the duration of the time that ${pronoun} will be gone.` :
                `${Partner.name || "Your partner"} has returned from ${posses} classes away from the island. ${pronounC} has only just stepped of the boat, and has not been told about anything that happened on the island while ${pronoun} was away.`;

            let TextObj = create_SVG_text_in_foreign_element(pText, 0.05 * GenParam.SVG_width, 0.3 * GenParam.SVG_height, 0.4 * GenParam.SVG_width, 0.3 * GenParam.SVG_height, undefined,undefined);
            TextObj.style.fontSize = "40px";
            CurrentInstructionsSVG.appendChild(TextObj);

            let direction = information_type === "partner_leaves" ? "right" : "left";
            let ArrowSVG = document.getElementById("block_arrow_left").cloneNode(true);
            let AZeroT = create_SVG_group(0,0,undefined, undefined);
            let Scale =  create_SVG_group(0,0,undefined, undefined);
            let Inv = create_SVG_group(0,0,undefined, undefined);
            let Trans = create_SVG_group(0,0,undefined, undefined);
            AZeroT.appendChild(ArrowSVG); Scale.appendChild(AZeroT); Inv.appendChild(Scale); Trans.appendChild(Inv);
            CurrentInstructionsSVG.appendChild(Trans);

            ArrowSVG.style.display = "inherit";
            AZeroT.style.transform = `translate(${-getSVGInternalCenter(AZeroT).x}px, ${-getSVGInternalCenter(AZeroT).y}px)`;
            Scale.style.transform = "scale(2.5)";
            if(direction === "left") Inv.style.transform = "scaleX(-1)";
            Trans.style.transform = `translate(${0.75*GenParam.SVG_width}px, ${0.45 * GenParam.SVG_height}px)`;
            ArrowSVG.style.opacity = 0.5;
            ArrowSVG.classList.add("focus_on_SVG_fill");

            let IconSVG = WorldState.get_person_icon("partner", direction);
            IconSVG.style.transform = "scale(15)";
            let IconTranslateGroup  = create_SVG_group(0,0,undefined,undefined);
            let IconAnimationGroup = create_SVG_group(0,0,undefined,undefined);

            IconTranslateGroup.appendChild(IconSVG);
            IconAnimationGroup.appendChild(IconTranslateGroup);
            CurrentInstructionsSVG.appendChild(IconAnimationGroup);
            moveSVGCenterTo(IconTranslateGroup, 0.6 * GenParam.SVG_width, 0.5 * GenParam.SVG_height);
            if(information_type === "partner_leaves") IconAnimationGroup.classList.add("pseudoday_player_icon_leaving_island_translate_group");
            if(information_type === "partner_returns") IconAnimationGroup.classList.add("pseudoday_player_icon_returning_to_island_translate_group");
        }

        if(information_type === "new_Fennimals_spotted"){
            let text_w = OptionalInformation ? 0.4 * GenParam.SVG_width : 0.9 * GenParam.SVG_width;
            let text_y = OptionalInformation ? 0.3 * GenParam.SVG_height : 0.4 * GenParam.SVG_height;
            let text_align = OptionalInformation ? "left" : "center";

            document.getElementById("Instructions_Title").innerHTML = title;
            let TextObj = create_SVG_text_in_foreign_element(text, 0.05 * GenParam.SVG_width, text_y, text_w, 0.3 * GenParam.SVG_height, undefined,undefined);
            TextObj.style.textAlign = text_align;
            TextObj.style.fontSize = "40px";
            CurrentInstructionsSVG.appendChild(TextObj);

            if(OptionalInformation){
                let IconScreenStartCoords = {x:  0.85 * GenParam.SVG_width , y: 0.4 * GenParam.SVG_height};
                let AllIconPositions = {
                    1: [{x: 0, y: 0, rotation: 10}],
                    2: [{x: 100, y: 0, rotation: 10}, {x: -100, y: 0, rotation: -10}],
                    3: [{x: 0, y: 0, rotation: 5}, {x: 200, y: 0, rotation: 10}, {x: -200, y: 0, rotation: -10}],
                    4: [{x: 200, y: 0, rotation: -10}, {x: -200, y: 0, rotation: 10}, {x: -75, y: -50, rotation: 0}, {x: 150, y: 150, rotation: -10}],
                    5: [{x: 250, y: 0, rotation: -10}, {x: -250, y: 0, rotation: 10}, {x: -75, y: -50, rotation: 0}, {x: 150, y: 150, rotation: -10}, {x: -150, y: 150, rotation: 10}],
                    6: [{x: 250, y: 0, rotation: -10}, {x: -250, y: 0, rotation: 10}, {x: -75, y: -50, rotation: 0}, {x: 150, y: 150, rotation: -10}, {x: -150, y: 150, rotation: 10}, {x: 400, y: 150, rotation: 20}]
                };
                let icon_move_positions = AllIconPositions[OptionalInformation.length];

                for(let iconnum = 0; iconnum < OptionalInformation.length; iconnum++){
                    let GroupTranslate = create_SVG_group(0,0,undefined,undefined);
                    let GroupRotate = create_SVG_group(0,0,undefined,undefined);
                    let GroupScale = create_SVG_group(0,0,undefined,undefined);
                    GroupRotate.appendChild(GroupScale); GroupTranslate.appendChild(GroupRotate); CurrentInstructionsSVG.appendChild(GroupTranslate);

                    let Frame = copy_scale_and_move_object_to_position(document.getElementById("polaroid_frame"), GroupScale, IconScreenStartCoords.x, IconScreenStartCoords.y, 1);
                    Frame.getElementsByTagName("rect")[0].style.fill = GenParam.RegionData[OptionalInformation[iconnum].region].surrounding_color;
                    Frame.getElementsByTagName("rect")[0].style.display = "inherit";
                    Frame.getElementsByTagName("text")[0].childNodes[0].innerHTML = OptionalInformation[iconnum].name;
                    let TargetCircle = getSVGInternalCenter(Frame.getElementsByTagName("circle")[0]);

                    let Icon = create_Fennimal_SVG_object(OptionalInformation[iconnum], GenParam.Fennimal_head_size, true);
                    GroupScale.appendChild(Icon);

                    let FennimalScaleGroup = Icon.getElementsByClassName("Fennimal_scale_group")[0];
                    let Box = Icon.getBBox();
                    let delta_x = (TargetCircle.x) - (Box.x + 0.5 * Box.width);
                    let delta_y = (TargetCircle.y) - (Box.y + 0.5 * Box.height) + 50;

                    let FrameBox = Frame.getElementsByTagName("rect")[0].getBBox();
                    let scale_factor_w = 1 / (Box.width / FrameBox.width);
                    let scale_factor_h = 1 / (Box.height / FrameBox.height);
                    let min_scale_factor = Math.floor(Math.min(scale_factor_w, 0.8 * scale_factor_h) * 100) / 100;

                    FennimalScaleGroup.style.transform = `scale(${min_scale_factor})`;
                    Icon.style.transform = `translate(${delta_x}px, ${delta_y}px)`;

                    GroupScale.style.transformOrigin = "center";
                    GroupRotate.style.transformOrigin =  (.6 * GenParam.SVG_width)  + "px " + (0.4 * GenParam.SVG_height) + "px";
                    GroupScale.style.transform = "scale(0.5)";
                    GroupTranslate.style.transition = "all 500ms ease-in-out";
                    GroupRotate.style.transition = "all 500ms ease-in-out";

                    if(iconnum < icon_move_positions.length){
                        GroupRotate.style.transform = `rotate(${icon_move_positions[iconnum].rotation}deg)`;
                        GroupTranslate.style.transform = `translate(${icon_move_positions[iconnum].x}px, ${icon_move_positions[iconnum].y}px)`;
                    }
                }
            }
        }
    };

    // QUESTIONNAIRE PAGES
    let QuestionnaireForeign, QuestionnaireItemsOnScreen, QuestionnaireContinueButton;
    this.show_questionnaire_page = function (page_type) {
        show_empty_page(true);
        document.getElementById("Instructions_Title").innerHTML = "A few questions before we finish...";

        let Text = create_SVG_text_in_foreign_element("You're almost done! Just a few questions left:",
            0.05 * GenParam.SVG_width, 0.12 * GenParam.SVG_height, 0.9 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, "instruction_element_text");
        Text.style.textAlign = "center";
        Text.style.fontSize = "35px";
        CurrentInstructionsSVG.appendChild(Text);

        QuestionnaireForeign = create_SVG_foreignElement(0.2 * GenParam.SVG_width, 0.35 * GenParam.SVG_height, 0.6 * GenParam.SVG_width, 0.5 * GenParam.SVG_height, undefined, undefined);
        CurrentInstructionsSVG.appendChild(QuestionnaireForeign);

        let questions_on_screen = [];
        if (page_type === "demographics_questionnaire") questions_on_screen = ["age", "gender", "colorblind"];

        QuestionnaireItemsOnScreen = [];
        for (let i = 0; i < questions_on_screen.length; i++) {
            QuestionnaireItemsOnScreen.push(new QuestionnaireItem(QuestionnaireForeign, questions_on_screen[i], questionaire_item_value_changed));
        }

        QuestionnaireContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.90 * GenParam.SVG_height, 400, 75, "Continue", 40);
        CurrentInstructionsSVG.appendChild(QuestionnaireContinueButton);
        QuestionnaireContinueButton.onpointerdown = function () {
            questionaire_page_completed();
            AudioCont.play_sound_effect("button_click");
        };
        QuestionnaireContinueButton.style.display = "none";
    };

    function questionaire_item_value_changed() {
        let all_questions_answered = true;
        for (let i = 0; i < QuestionnaireItemsOnScreen.length; i++) {
            if (QuestionnaireItemsOnScreen[i].get_value() === "") {
                all_questions_answered = false;
            }
        }
        if (all_questions_answered) {
            QuestionnaireContinueButton.style.display = "inherit";
        }
    }

    function questionaire_page_completed() {
        clear_instructions();
        let AnswerObj = {};
        for (let i = 0; i < QuestionnaireItemsOnScreen.length; i++) {
            AnswerObj[QuestionnaireItemsOnScreen[i].get_type()] = QuestionnaireItemsOnScreen[i].get_value();
        }
        ExpCont.questionnaire_page_completed(AnswerObj);
    }

    QuestionnaireItem = function (Parent, question_type, onchangefunc) {
        let ContainerDiv = document.createElement("div");
        ContainerDiv.style.width = "100%";
        ContainerDiv.style.marginBottom = "20px";
        ContainerDiv.style.display = "flex";

        let QuestionDiv = document.createElement("div");
        QuestionDiv.style.width = "70%";
        QuestionDiv.style.fontSize = "35px";
        QuestionDiv.style.fontStyle = "italic";
        ContainerDiv.appendChild(QuestionDiv);

        let AnswerDiv = document.createElement("div");
        AnswerDiv.style.width = "30%";
        ContainerDiv.appendChild(AnswerDiv);
        Parent.appendChild(ContainerDiv);

        let InputObj, options;
        switch (question_type) {
            case "age":
                QuestionDiv.innerHTML = "What is your age?";
                InputObj = document.createElement("input");
                InputObj.type = "number";
                InputObj.min = 0;
                InputObj.max = 100;
                break;
            case "gender":
                QuestionDiv.innerHTML = "What gender do you identify as?";
                InputObj = document.createElement("select");
                options = ["man", "woman", "other", "don't want to say"];
                for (let i in options) {
                    let option = document.createElement("option");
                    option.value = options[i];
                    option.text = options[i];
                    InputObj.appendChild(option);
                }
                InputObj.value = "";
                break;
            case "colorblind":
                QuestionDiv.innerHTML = "Do you have any form of color-blindness?";
                InputObj = document.createElement("select");
                options = ["yes", "no", "don't know"];
                for (let i in options) {
                    let option = document.createElement("option");
                    option.value = options[i];
                    option.text = options[i];
                    InputObj.appendChild(option);
                }
                InputObj.value = "";
                break;
        }
        AnswerDiv.appendChild(InputObj);
        InputObj.style.width = "80%";
        InputObj.style.height = "90%";
        InputObj.style.fontSize = "35px";
        InputObj.style.textAlign = "center";

        this.get_value = () => InputObj.value;
        this.get_type = () => question_type;
        InputObj.onchange = onchangefunc;
    };

    // PAYMENT SCREEN AND FINAL SCREENS
    let ExpPaymentData, PaymentCardContainer, AllCardsOnScreen, payment_card_width = 0.15 * GenParam.SVG_width, payment_card_height = 0.275 * GenParam.SVG_height;

    PaymentCard = function (Parent, DayData) {
        let CardDiv = document.createElement("div");
        CardDiv.style.width = payment_card_width + "px";
        CardDiv.style.height = payment_card_height + "px";
        CardDiv.style.marginLeft = "20px";

        let SVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        SVG.style.width = "100%";
        SVG.style.height = "100%";
        SVG.style.borderRadius = "15px";

        let stars_have_been_earned = DayData.stars_earned > 0;
        let is_summary_card = DayData.day_type === "summary";
        let top_text, card_text_color;

        if (is_summary_card) {
            top_text = "Total Stars Earned";
            card_text_color = "white";
            if (stars_have_been_earned) {
                SVG.style.background = "darkgoldenrod";
                SVG.style.border = "3px solid darkgoldenrod";
            } else {
                SVG.style.background = "darkgray";
                SVG.style.border = "3px solid darkgray";
            }
        } else {
            let type_text = DayData.day_type === "name_recall_task" ? "recalled names" : DayData.day_type;
            top_text = "Day " + DayData.day;

            if (stars_have_been_earned) {
                SVG.style.background = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
                SVG.style.border = "3px solid darkgoldenrod";
                card_text_color = "darkgoldenrod";
            } else {
                SVG.style.background = "#EEEEEE";
                SVG.style.border = "3px solid darkgray";
                card_text_color = "dimgray";
            }
        }

        CardDiv.appendChild(SVG);
        Parent.appendChild(CardDiv);
        AudioCont.play_sound_effect("thud");

        let DayText = create_SVG_text_elem(0.5 * payment_card_width, 0.15 * payment_card_height, top_text, "instruction_element_text");
        DayText.style.textAnchor = "middle";
        DayText.style.fontSize = "35px";
        DayText.style.fill = card_text_color;
        SVG.appendChild(DayText);

        if (is_summary_card) DayText.style.fontWeight = 900;
        else DayText.style.fontStyle = "italic";

        if (stars_have_been_earned) {
            show_bonus_star_on_screen(SVG, 0.35 * payment_card_width, 0.4 * payment_card_width, true, undefined, 1.1, undefined);
        } else {
            let NewStar = show_bonus_star_on_screen(SVG, 0.35 * payment_card_width, 0.4 * payment_card_width, true, undefined, 1, undefined);
            let ChildrenPaths = NewStar.getElementsByTagName("path");
            ChildrenPaths[0].style.fill = "lightgray";
            ChildrenPaths[0].style.stroke = "dimgray";
        }

        setTimeout(() => {
            let AmountText = create_SVG_text_elem(0.5 * payment_card_width, 0.8 * payment_card_height, "×" + DayData.stars_earned, "instruction_element_text");
            AmountText.style.textAnchor = "middle";
            AmountText.style.fontSize = "90px";
            AmountText.style.fontWeight = 700;
            AmountText.style.fill = card_text_color;
            SVG.appendChild(AmountText);
        }, 500);

        setTimeout(() => {
            let TotalText = create_SVG_text_elem(0.4 * payment_card_width, 0.95 * payment_card_height, "(out of " + DayData.maximum_possible_stars + ")", "instruction_element_text");
            TotalText.style.textAnchor = "middle";
            TotalText.style.fontSize = "35px";
            TotalText.style.fontStyle = "italic";
            TotalText.style.fill = card_text_color;
            SVG.appendChild(TotalText);
        }, 1000);
    };

    function show_next_payment_card(Parent, Remaining_cards, time_between_cards) {
        if (Remaining_cards.length > 0) {
            AllCardsOnScreen.push(new PaymentCard(Parent, Remaining_cards.shift()));
            setTimeout(() => {
                show_next_payment_card(Parent, Remaining_cards, time_between_cards);
            }, time_between_cards);
        } else {
            all_payment_cards_are_on_screen();
        }
    }

    function all_payment_cards_are_on_screen() {
        let WarningText = create_SVG_text_in_foreign_element("DO NOT CLOSE THIS PAGE YET <br> On the next page you will find your completion code...",
            0.05 * GenParam.SVG_width, 0.7 * GenParam.SVG_height, 0.9 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, "instruction_element_text");
        WarningText.style.textAlign = "center";
        WarningText.style.fontSize = "35px";
        WarningText.style.fontWeight = 600;
        CurrentInstructionsSVG.appendChild(WarningText);

        let ContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.90 * GenParam.SVG_height, 400, 75, "Continue", 40);
        CurrentInstructionsSVG.appendChild(ContinueButton);
        ContinueButton.onpointerdown = function () {
            show_completion_code_screen();
            AudioCont.play_sound_effect("button_click");
        };
    }

    function show_completion_code_screen() {
        show_empty_page(true);
        document.getElementById("Instructions_Title").innerHTML = "Do <u>NOT</u> close this page yet...";

        let text = "Do NOT close or refresh this window before submitting your code to Prolific. <br>" +
            " Your completion code is: <tspan style = 'user-select:all'><b> " + ExpPaymentData.completion_code + " </b></tspan>. <br>" +
            "<br> " +
            "Please go to Prolific now to submit this code. After you have submitted this code to Prolific, then press the button below <br>" +
            "<br>" +
            "<u>Do not close or refresh this window before clicking the button! </u> We can only approve your work if you submitted the code to Prolific and have clicked the button below! <br>" +
            "<br>" +
            "Thank you for participating! :)";

        let CCText = create_SVG_text_in_foreign_element(text, 0.05 * GenParam.SVG_width, 0.2 * GenParam.SVG_height, 0.9 * GenParam.SVG_width, 0.6 * GenParam.SVG_height, "instruction_element_text");
        CCText.style.textAlign = "center";
        CCText.style.fontSize = "35px";
        CurrentInstructionsSVG.appendChild(CCText);

        let SubmitButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.90 * GenParam.SVG_height, 500, 75, "Submit your data", 40);
        CurrentInstructionsSVG.appendChild(SubmitButton);
        SubmitButton.onpointerdown = ExpCont.submit_experiment;
    }

    this.show_payment_screen = function (PaymentData) {
        ExpPaymentData = PaymentData;
        let timer = 1000;
        show_empty_page(true);
        document.getElementById("Instructions_Title").innerHTML = "Your bonus for this experiment";

        let ExplanationText = create_SVG_text_in_foreign_element("Congratulations, you just finished the last day! Below is an overview of the stars you earned during the experiment: ",
            0.05 * GenParam.SVG_width, 0.18 * GenParam.SVG_height, 0.9 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, "instruction_element_text");
        ExplanationText.style.textAlign = "center";
        ExplanationText.style.fontSize = "35px";
        CurrentInstructionsSVG.appendChild(ExplanationText);

        let ForeignDiv = create_SVG_foreignElement(0.1 * GenParam.SVG_width, 0.35 * GenParam.SVG_height, 0.8 * GenParam.SVG_width, 0.4 * GenParam.SVG_height, undefined, undefined);
        CurrentInstructionsSVG.appendChild(ForeignDiv);
        PaymentCardContainer = document.createElement("div");
        PaymentCardContainer.style.display = "flex";
        PaymentCardContainer.style.justifyContent = "center";
        ForeignDiv.appendChild(PaymentCardContainer);

        AllCardsOnScreen = [];
        show_next_payment_card(PaymentCardContainer, JSON.parse(JSON.stringify(PaymentData.phases)), timer);
    };
};

Vertical_scollable_box = function (ParentElem, x, y, width, height) {
    let BoxParam = {
        scroll_button_height: 30,
        border_radius_value: "35px",
        scroll_symbol_size: "55px",
        scroll_speed: 30,
        icon_name_size: 30
    };

    let TopForeignElement, TopDiv, ButtonUpDiv, AreaDiv, ButtonDownDiv, ElementArray = [];

    function create_scroll_button_element(direction) {
        let Div = document.createElement("div");
        Div.style.width = "100%";
        Div.style.height = BoxParam.scroll_button_height + "px";
        Div.classList.add("instructions_scroll_button_element");

        let SymbolElem = document.createElement("div");
        SymbolElem.style.width = "100%";
        SymbolElem.style.height = "100%";
        SymbolElem.style.fontSize = BoxParam.scroll_symbol_size;
        SymbolElem.style.display = "flex";
        SymbolElem.style.justifyContent = "center";

        Div.appendChild(SymbolElem);

        if (direction === "up") {
            Div.style.borderRadius = BoxParam.border_radius_value + " " + BoxParam.border_radius_value + " 0 0";
            SymbolElem.innerHTML = "⯅";
            SymbolElem.style.alignItems = "center";
        }
        if (direction === "down") {
            Div.style.borderRadius = "0 0 " + BoxParam.border_radius_value + " " + BoxParam.border_radius_value;
            SymbolElem.innerHTML = "⯆";
            SymbolElem.style.alignItems = "end";
            SymbolElem.style.paddingTop = "15px";
        }

        return Div;
    }

    function create_area_element() {
        let MainDiv = document.createElement("div");
        MainDiv.style.width = "98%";
        MainDiv.style.height = (height - 2 * BoxParam.scroll_button_height) + "px";
        MainDiv.style.background = "#FFFFFF";
        MainDiv.style.display = "flex";
        MainDiv.style.flexWrap = "wrap";
        MainDiv.style.overflow = "hidden";
        MainDiv.style.alignItems = "center";
        MainDiv.style.justifyContent = "center";
        MainDiv.style.borderRadius = "25px";
        MainDiv.style.border = "2px solid black";
        return MainDiv;
    }

    function initialize() {
        TopForeignElement = create_SVG_foreignElement(x, y, width, height, undefined, undefined);
        ParentElem.appendChild(TopForeignElement);
        TopForeignElement.classList.add("instruction_element_nonbackground");

        TopDiv = document.createElement("div");
        ButtonUpDiv = create_scroll_button_element("up");
        AreaDiv = create_area_element();
        ButtonDownDiv = create_scroll_button_element("down");

        TopForeignElement.appendChild(TopDiv);
        TopDiv.appendChild(ButtonUpDiv);
        TopDiv.appendChild(AreaDiv);
        TopDiv.appendChild(ButtonDownDiv);

        ButtonUpDiv.onpointerdown = scroll_area_up;
        ButtonDownDiv.onpointerdown = scroll_area_down;
    }

    function scroll_area_up() {
        AreaDiv.scrollTop = AreaDiv.scrollTop - BoxParam.scroll_speed;
        update_scroll_button_visibility();
    }

    function scroll_area_down() {
        AreaDiv.scrollTop = AreaDiv.scrollTop + BoxParam.scroll_speed;
        update_scroll_button_visibility();
    }

    function update_scroll_button_visibility() {
        ButtonUpDiv.style.visibility = AreaDiv.scrollTop === 0 ? "hidden" : "visible";
        ButtonDownDiv.style.visibility = ((AreaDiv.scrollHeight - AreaDiv.clientHeight) === AreaDiv.scrollTop) ? "hidden" : "visible";
    }

    let FennimalIcon = function (AreaElem, SVG, OtherProperties) {
        let SVGElem = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        SVGElem.appendChild(SVG);

        let CardDiv = document.createElement("div");
        let NameDiv, icon_card_width, icon_card_height;
        CardDiv.style.width = OtherProperties.width + "px";
        CardDiv.style.height = OtherProperties.height + "px";
        CardDiv.style.borderRadius = "5%";
        CardDiv.style.margin = "4px";
        CardDiv.style.border = "4px solid black";
        CardDiv.appendChild(SVGElem);
        CardDiv.style.opacity = 0;

        if (OtherProperties.blur) CardDiv.style.filter = "blur(1px)";

        if (OtherProperties.name === undefined) {
            icon_card_height = OtherProperties.height;
            icon_card_width = OtherProperties.width;
            SVGElem.style.width = "100%";
            SVGElem.style.height = "100%";
        } else {
            NameDiv = document.createElement("div");
            NameDiv.innerHTML = OtherProperties.name;
            NameDiv.style.fontSize = "38px";
            NameDiv.style.textAlign = "center";
            NameDiv.style.fontWeight = 900;
            NameDiv.style.color = "white";
            NameDiv.style.borderRadius = "10px";
            icon_card_height = OtherProperties.height - BoxParam.icon_name_size;
            icon_card_width = OtherProperties.width - BoxParam.icon_name_size;
        }

        CardDiv.style.background = OtherProperties.backgroundColor || "lightgray";
        if (OtherProperties.nameColor) {
            NameDiv.style.background = OtherProperties.nameColor;
            CardDiv.style.border = "4px solid " + OtherProperties.nameColor;
        } else if (NameDiv) {
            NameDiv.style.background = "dimgray";
        }

        AreaElem.appendChild(CardDiv);
        if (OtherProperties.name !== undefined) CardDiv.appendChild(NameDiv);

        setTimeout(() => {
            let CurrentBox = SVG.getBBox();
            let scale_factor_w = 1 / (CurrentBox.width / icon_card_width);
            let scale_factor_h = 1 / (CurrentBox.height / icon_card_height);
            let min_scale_factor = Math.floor(Math.min(scale_factor_w, scale_factor_h) * 100) / 100;

            let ScaleGroup = SVG.getElementsByClassName("Fennimal_scale_group")[0];
            ScaleGroup.style.transform = `scale(${min_scale_factor})`;

            let NewBox = SVG.getBBox();
            let delta_x, delta_y;
            if (OtherProperties.name === undefined) {
                let TargetCenter = {x: 0.5 * OtherProperties.width, y: 0.5 * OtherProperties.height};
                delta_x = TargetCenter.x - (NewBox.x + 0.5 * NewBox.width);
                delta_y = TargetCenter.y - (NewBox.y + 0.5 * NewBox.height);
            } else {
                delta_x = (0.5 * OtherProperties.width) - (NewBox.x + 0.5 * NewBox.width);
                delta_y = -NewBox.y;
            }
            SVG.style.transform = `translate(${delta_x}px, ${delta_y}px)`;

            if(OtherProperties.bonus_star_earnable === true){
                show_bonus_star_on_screen(SVG, 0.25 * OtherProperties.width, 0.15 * OtherProperties.height, false, 0, 0.5);
            }

            CardDiv.style.transition = "opacity 200ms ease-in-out";
            CardDiv.style.opacity = 1;
        }, 75);

        this.remove_icon = () => CardDiv.remove();
    };

    let LocationIcon = function (AreaElem, SVG, OtherProperties) {
        let SVGElem = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        let ScaleGroup = create_SVG_group(undefined, undefined, undefined, undefined);
        let TranslateGroup = create_SVG_group(undefined, undefined, undefined, undefined);
        TranslateGroup.appendChild(ScaleGroup);
        ScaleGroup.appendChild(SVG);
        SVGElem.appendChild(TranslateGroup);

        let CardDiv = document.createElement("div");
        let NameDiv, icon_card_width, icon_card_height;
        CardDiv.style.width = OtherProperties.width + "px";
        CardDiv.style.height = OtherProperties.height + "px";
        CardDiv.style.borderRadius = "5%";
        CardDiv.style.margin = "5px";
        CardDiv.appendChild(SVGElem);

        if (OtherProperties.name === undefined) {
            icon_card_height = OtherProperties.height;
            icon_card_width = OtherProperties.width;
            SVGElem.style.width = "100%";
            SVGElem.style.height = "100%";
        } else {
            NameDiv = document.createElement("div");
            NameDiv.innerHTML = OtherProperties.name;
            NameDiv.style.fontSize = BoxParam.icon_name_size + "px";
            NameDiv.style.textAlign = "center";
            NameDiv.style.marginTop = -(BoxParam.icon_name_size / 2) + "px";
            icon_card_height = OtherProperties.height - BoxParam.icon_name_size;
            icon_card_width = OtherProperties.width;
        }

        CardDiv.style.background = OtherProperties.backgroundColor ? OtherProperties.backgroundColor + "44" : "lightgray";
        AreaElem.appendChild(CardDiv);
        if (OtherProperties.name !== undefined) CardDiv.appendChild(NameDiv);

        let CurrentBox = SVG.getBBox();
        SVG.removeAttribute("transform");

        let scale_factor_w = 1 / (CurrentBox.width / icon_card_width);
        let scale_factor_h = 1 / (CurrentBox.height / icon_card_height);
        let min_scale_factor = 0.98 * Math.floor(Math.min(scale_factor_w, scale_factor_h) * 100) / 100;
        ScaleGroup.style.transform = `scale(${min_scale_factor})`;

        let NewBox = TranslateGroup.getBBox();
        let delta_x, delta_y;
        if (OtherProperties.name === undefined) {
            let TargetCenter = {x: 0.5 * icon_card_width, y: 0.5 * icon_card_height};
            delta_x = (TargetCenter.x - (NewBox.x + 0.5 * NewBox.width));
            delta_y = (TargetCenter.y - (NewBox.y + 0.5 * NewBox.height));
        } else {
            let TargetCenter = {x: 0.5 * icon_card_width, y: 0.5 * icon_card_height};
            delta_x = TargetCenter.x - (NewBox.x + 0.5 * NewBox.width);
            delta_y = icon_card_height - (NewBox.y + NewBox.height);
        }
        TranslateGroup.style.transform = `translate(${delta_x}px, ${delta_y}px)`;

        this.remove_icon = () => CardDiv.remove();
    };

    this.add_array_of_elements = function (Arr) {
        for (let i = 0; i < Arr.length; i++) {
            ElementArray.push(new FennimalIcon(AreaDiv, Arr[i].Icon, Arr[i].other_properties));
        }
        update_scroll_button_visibility();
    };

    this.add_array_of_Fennimal_icons = function (FenObjArr, icon_width, icon_height, include_names, include_region_color) {
        FenObjArr = FenObjArr.filter(f => f.name !== undefined);

        for (let i = 0; i < FenObjArr.length; i++) {
            let background_color = include_region_color ? GenParam.RegionData[FenObjArr[i].region].lighter_color : "#DDDDDD44";
            let name_color;
            let Fennimal_has_been_found = FenObjArr[i].visited === true;

            if (Fennimal_has_been_found) {
                background_color = GenParam.RegionData[FenObjArr[i].region].lighter_color;
                name_color = GenParam.RegionData[FenObjArr[i].region].darker_color;
            }

            let IconSVG = create_Fennimal_SVG_object(FenObjArr[i], GenParam.Fennimal_head_size, !Fennimal_has_been_found);
            apply_Fennimal_animation_pivots(IconSVG);
            let OtherProperties = {width: icon_width, height: icon_height, backgroundColor: background_color};

            if (Fennimal_has_been_found) {
                OtherProperties.blur = false;
                OtherProperties.nameColor = name_color;
            } else {
                OtherProperties.blur = true;
            }

            if (include_names) OtherProperties.name = Fennimal_has_been_found ? FenObjArr[i].name : "?";

            if (FenObjArr[i].bonus_star_earnable === true && FenObjArr[i].search_status === "unsearched") {
                OtherProperties.backgroundColor = "#D4AF3744";
                OtherProperties.bonus_star_earnable = true;
            }

            ElementArray.push(new FennimalIcon(AreaDiv, IconSVG, OtherProperties));
        }

        update_scroll_button_visibility();
        setTimeout(() => update_scroll_button_visibility(), 25);
    };

    this.add_array_of_Location_icons = function (Arr_of_location_states, icon_width, icon_height, include_names) {
        for (let i = 0; i < Arr_of_location_states.length; i++) {
            let IconSVG = document.getElementById("location_icon_" + Arr_of_location_states[i].location).cloneNode(true);
            IconSVG.removeAttribute("id");

            let location_has_been_visited = true;
            if (Arr_of_location_states[i].state === "empty_unsearched") location_has_been_visited = false;
            else if (typeof Arr_of_location_states[i] === "object" && Arr_of_location_states[i].visited !== true) location_has_been_visited = false;

            if (!location_has_been_visited) {
                set_fill_for_all_elements_in_array(IconSVG.querySelectorAll("*"), "black");
                set_stroke_color_for_all_elements_in_array(IconSVG.querySelectorAll("*"), "black");
            }

            let background_color = "#DDDDDD";
            let OtherProperties = {width: icon_width, height: icon_height, backgroundColor: background_color};
            if (include_names) OtherProperties.name = Arr_of_location_states[i].location;

            ElementArray.push(new LocationIcon(AreaDiv, IconSVG, OtherProperties));
        }
        update_scroll_button_visibility();
    };

    this.clear_all_icons = function () {
        for (let i = 0; i < ElementArray.length; i++) ElementArray[i].remove_icon();
        update_scroll_button_visibility();
    };

    this.change_opacity = (opacity) => TopForeignElement.style.opacity = opacity;
    this.change_position = (dimension, newvalue) => TopForeignElement.setAttribute(dimension, newvalue);

    initialize();
    update_scroll_button_visibility();
};

RecallBoxController = function (Page, answer_box_width, answer_box_height, allow_empty_input, add_checkbox_no_answer, checkbox_no_answer_text, returnfunc) {
    let StartTime = Date.now();
    let ypos = 0;
    let Dims = {
        Field: { x: 0, y: ypos, h: answer_box_height, w: answer_box_width },
        InputLine: { x: 10, y: 238, h: 120, w: 750 },
        InputButton: { x: 720, y: 275, h: 70, w: 130 },
        ContinueButton: { x: 900, y: 240, h: 70, w: 200 },
        No_Answer_Checkbox: { x: 500, y: 750, h: 100, w: 408 }
    };
    let max_input_length = 30;

    Dims.InputLine.y = ypos + Dims.Field.h + 4;
    Dims.InputButton.y = ypos + Dims.Field.h + 5;
    Dims.ContinueButton.y = ypos + Dims.Field.h + 5;
    Dims.No_Answer_Checkbox.y = Dims.ContinueButton.y + Dims.ContinueButton.h + 5;

    let TopGroup, ForObjBox, Box, BoxPlaceholderText, ForObjInput, InputText, InputButton, CheckBox, CheckBoxContainer, CheckBoxText, ContinueButton;
    let AnswerArray = [], box_active = false, answer_id = 0, RemovableElements = [];
    let flag_done_button_pressed_once = false, WarningTextForArmedButton;

    function createNSElemWithDims(namespace, elem_name, x, y, w, h) {
        let Elem = document.createElementNS(namespace, elem_name);
        Elem.setAttribute("x", x); Elem.setAttribute("y", y); Elem.setAttribute("width", w); Elem.setAttribute("height", h);
        return Elem;
    }

    function createSVGButtonElem(x, y, width, height, text) {
        let maxfontsize = 50;
        let ButtonContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        ButtonContainer.setAttribute("x", x); ButtonContainer.setAttribute("y", y);
        ButtonContainer.setAttribute("width", width); ButtonContainer.setAttribute("height", height);
        ButtonContainer.classList.add("instructions_button");

        let ButtonBackground = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        ButtonBackground.setAttribute("x", x); ButtonBackground.setAttribute("y", y);
        ButtonBackground.setAttribute("width", width); ButtonBackground.setAttribute("height", height);
        ButtonBackground.setAttribute("rx", "1.5%");

        let Text = document.createElementNS("http://www.w3.org/2000/svg", 'text');
        Text.setAttribute("x", x + 0.5 * width); Text.setAttribute("y", y + 0.5 * height + 2);
        Text.style.dominantBaseline = "middle"; Text.style.textAnchor = "middle"; Text.style.fontSize = maxfontsize + "px";
        Text.append(document.createTextNode(text));

        function try_resize(currentfontsize) {
            if (Text.getBBox().width > 0.95 * width) {
                let newfontsize = currentfontsize - 1;
                Text.style.fontSize = newfontsize + "px";
                setTimeout(() => try_resize(newfontsize), 25);
            }
        }
        setTimeout(() => try_resize(maxfontsize), 5);

        ButtonContainer.appendChild(ButtonBackground);
        ButtonContainer.appendChild(Text);
        return ButtonContainer;
    }

    function initialize_elements() {
        TopGroup = create_SVG_group(0, 0, undefined, undefined);
        Page.appendChild(TopGroup);

        ForObjBox = createNSElemWithDims('http://www.w3.org/2000/svg', "foreignObject", Dims.Field.x, Dims.Field.y, Dims.Field.w, Dims.Field.h);
        ForObjBox.style.padding = "1%";
        TopGroup.appendChild(ForObjBox);
        RemovableElements.push(ForObjBox);

        Box = document.createElement("div");
        Box.classList.add("recall_input_answerbox_start");
        ForObjBox.appendChild(Box);
        reset_box();

        ForObjInput = createNSElemWithDims('http://www.w3.org/2000/svg', "foreignObject", Dims.InputLine.x, Dims.InputLine.y, Dims.InputLine.w, Dims.InputLine.h);
        ForObjInput.style.padding = "1%";
        TopGroup.appendChild(ForObjInput);
        RemovableElements.push(ForObjInput);

        InputText = document.createElement("input");
        InputText.maxLength = max_input_length;
        InputText.placeholder = "Enter name here";
        InputText.classList.add("recall_input_line");
        InputText.addEventListener("keyup", function (event) {
            if (event.key === "Enter") {
                if (InputText.value !== "") {
                    AudioCont.play_sound_effect("button_click");
                    add_answer_button_pressed();
                }
            } else {
                if (InputText.value === "") {
                    ContinueButton.style.display = "inherit";
                } else {
                    ContinueButton.style.display = "none";
                    if (flag_done_button_pressed_once) arm_or_disarm_done_button(false);
                }
            }
        });
        ForObjInput.appendChild(InputText);

        InputButton = createSVGButtonElem(Dims.InputButton.x, Dims.InputButton.y, Dims.InputButton.w, Dims.InputButton.h, "Add");
        InputButton.onclick = function () {
            add_answer_button_pressed();
            AudioCont.play_sound_effect("button_click");
        };
        TopGroup.appendChild(InputButton);
        RemovableElements.push(InputButton);

        ContinueButton = createSVGButtonElem(Dims.ContinueButton.x, Dims.ContinueButton.y, Dims.ContinueButton.w, Dims.ContinueButton.h, "Done");
        ContinueButton.onpointerdown = function () {
            done_button_pressed();
            AudioCont.play_sound_effect("button_click");
        };
        TopGroup.appendChild(ContinueButton);
        RemovableElements.push(ContinueButton);

        if (!allow_empty_input) ContinueButton.style.display = "none";

        if (add_checkbox_no_answer) {
            CheckBoxContainer = createNSElemWithDims('http://www.w3.org/2000/svg', "foreignObject", Dims.No_Answer_Checkbox.x, Dims.No_Answer_Checkbox.y, Dims.No_Answer_Checkbox.w, Dims.No_Answer_Checkbox.h);
            CheckBoxContainer.style.padding = "1%";
            CheckBoxContainer.classList.add("recall_no_answer_container");
            TopGroup.appendChild(CheckBoxContainer);
            RemovableElements.push(CheckBoxContainer);

            CheckBox = document.createElement("input");
            CheckBox.setAttribute("type", "checkbox");
            CheckBox.classList.add("recall_no_answer_checkbox");
            CheckBoxContainer.appendChild(CheckBox);
            CheckBox.onchange = toggle_no_answer_checkbox;

            CheckBoxText = document.createElement("p");
            CheckBoxText.innerHTML = checkbox_no_answer_text;
            CheckBoxText.classList.add("recall_no_answer_text");
            CheckBoxContainer.appendChild(CheckBoxText);
        }
    }

    function activate_box() {
        box_active = true;
        BoxPlaceholderText.remove();
        Box.classList.remove("recall_input_answerbox_start");
        Box.classList.add("recall_input_answerbox_active");
    }

    function reset_box() {
        BoxPlaceholderText = document.createElement("p");
        BoxPlaceholderText.innerHTML = "Your answers will be shown here";
        BoxPlaceholderText.classList.add("recall_input_box_placeholder");
        Box.appendChild(BoxPlaceholderText);
        box_active = false;
        Box.classList.add("recall_input_answerbox_start");
        Box.classList.remove("recall_input_answerbox_active");
    }

    function add_answer_button_pressed() {
        if (InputText.value !== "") {
            if (!box_active) activate_box();
            answer_added(InputText.value);
            InputText.value = "";
        } else if (allow_empty_input && !box_active) {
            activate_box();
        }
    }

    function answer_added(answertext) {
        AnswerArray.push(new Answer(answertext, answer_id, Date.now() - StartTime));
        answer_id++;
        number_of_answers_changed();
    }

    let Answer = function (text, id, time) {
        let removed_by_user = false;
        let AnswerDiv = document.createElement("div");
        AnswerDiv.classList.add("recall_input_answer_div");

        let AnswerText = document.createElement("p");
        AnswerText.classList.add("recall_input_answer_text");
        AnswerText.innerHTML = text;
        AnswerDiv.appendChild(AnswerText);

        let RemoveAnswerMark = document.createElement("p");
        RemoveAnswerMark.classList.add("recall_input_answer_remove");
        RemoveAnswerMark.innerHTML = "[x]";
        RemoveAnswerMark.onpointerdown = function () {
            AnswerDiv.remove();
            removed_by_user = true;
            number_of_answers_changed();
            AudioCont.play_sound_effect("close_menu");
        };
        AnswerDiv.appendChild(RemoveAnswerMark);
        Box.appendChild(AnswerDiv);

        this.get_value_obj = () => ({ ans: text, id: id, time: time, removed_by_user: removed_by_user });
    };

    function toggle_no_answer_checkbox() {
        if (CheckBox.checked) {
            InputButton.style.display = "none";
            InputText.disabled = true;
            ContinueButton.style.display = "inherit";
        } else {
            InputButton.style.display = "inherit";
            InputText.disabled = false;
            ContinueButton.style.display = "none";
        }
    }

    function number_of_answers_changed() {
        let number_of_answers_on_screen = AnswerArray.filter(a => !a.get_value_obj().removed_by_user).length;

        if (number_of_answers_on_screen === 0) {
            ContinueButton.style.display = "none";
            reset_box();
            if (add_checkbox_no_answer) {
                CheckBox.disabled = false;
                CheckBoxText.style.color = "black";
            }
        } else {
            ContinueButton.style.display = "inherit";
            if (add_checkbox_no_answer) {
                CheckBox.disabled = true;
                CheckBoxText.style.color = "gray";
            }
        }
    }

    function done_button_pressed() {
        if (flag_done_button_pressed_once) finish_question();
        else arm_or_disarm_done_button(true);
    }

    function arm_or_disarm_done_button(is_now_armed) {
        if (is_now_armed) {
            ContinueButton.childNodes[0].style.animation = "none";
            ContinueButton.childNodes[0].style.fill = "darkred";
            ContinueButton.childNodes[1].style.fill = "white";

            WarningTextForArmedButton = create_SVG_text_in_foreign_element("<b>Are you sure?</b> You will not be able to return to this page after you press this button again. ", Dims.ContinueButton.x + Dims.ContinueButton.w + 30, Dims.ContinueButton.y, 550, 150, "instruction_element_text");
            WarningTextForArmedButton.style.fontSize = "35px";
            WarningTextForArmedButton.childNodes[0].style.margin = "0";
            WarningTextForArmedButton.childNodes[0].style.lineHeight = "90%";
            WarningTextForArmedButton.childNodes[0].style.fontStyle = "italic";
            WarningTextForArmedButton.style.color = "darkred";
            TopGroup.appendChild(WarningTextForArmedButton);

            setTimeout(() => { flag_done_button_pressed_once = true; }, 500);
        } else {
            ContinueButton.childNodes[0].style.removeProperty("animation");
            flag_done_button_pressed_once = false;
            if (WarningTextForArmedButton) WarningTextForArmedButton.remove();
            WarningTextForArmedButton = undefined;
        }
    }

    function finish_question() {
        let GivenAnswers = AnswerArray.map(a => a.get_value_obj());
        RemovableElements.forEach(e => e.remove());
        RemovableElements = [];
        returnfunc(GivenAnswers);
    }

    initialize_elements();
    this.translate_elements = (x, y) => TopGroup.style.transform = `translate(${x}px, ${y}px)`;
};

CharacterCreationController  = function(Parent, map_update_func) {
    const controllerthat = this;
    let IconTranslateGroup, PlayerIconBox;
    const button_dims = 115, label_x = 850, label_w = 330, xvals_buttons = [1190.797,1316.380, 1441.964, 1567.547 ], icon_box_dims = {x: 223, y: 218, w: 540, h: 640}, randomize_button_ytop = 218;

    const Presets = {
        type: { label: "Gender", ytop: 348.614, options: {male: "male", female: "female"} },
        skin_color: { label: "Skin color", ytop: 479.489, options: {A: "#8d5524", B: "#e0ac69", C: "#f1c27d", D: "#ffdbac"} },
        hair_color: { label: "Hair color", ytop: 610.364, options: {A: "#fde8b6", B: "#c37c56",  C: "#8a6030", D: "#341f0a" } },
        outfit: { label: "Outfit", ytop: 741.239, options: {
                A: { shirt: "#fef4f7", jacket: "#258522", lapel: "#2c432b", pants: "#5d655e", shoes: "#5d1506" },
                B: { shirt: "#e0e9f5", jacket: "#8a508d", lapel: "#642367", pants: "#ac9d93", shoes: "#784421" },
                C: { shirt: "#ffcc00", jacket: "#d68b00", lapel: "#d63e00", pants: "#63a2d5", shoes: "#784421" },
                D: { shirt: "#272626", jacket: "#aa0000", lapel: "#4d2413", pants: "#6d7d89", shoes: "#000000" }
            }}
    };

    let ButtonCont = function(type, value, xtop, ytop, pressfun) {
        let state_selected = false;
        let ButtonRect = create_SVG_rect(xtop, ytop, button_dims,button_dims);
        Parent.appendChild(ButtonRect);
        ButtonRect.classList.add("cc_button");
        ButtonRect.onpointerdown = () => pressfun(type,value);

        if (type === "randomize" || type === "type") {
            let ButtonSVG = type === "randomize" ? document.getElementById("random_dice").cloneNode(true) : document.getElementById("cc_head_"+ value).cloneNode(true);
            ButtonSVG.style.display = "inherit";
            ButtonSVG.style.pointerEvents = "none";

            let ScaleGroup = create_SVG_group(0,0);
            let TranslateGroup = create_SVG_group(0,0);
            ScaleGroup.appendChild(ButtonSVG);
            TranslateGroup.appendChild(ScaleGroup);
            Parent.appendChild(TranslateGroup);

            ScaleGroup.style.transform = "scale(1)";
            moveSVGCenterTo(TranslateGroup, ButtonRect.getBBox().x + 0.5*ButtonRect.getBBox().width, ButtonRect.getBBox().y + 0.5 * ButtonRect.getBBox().height);
            ButtonRect.style.fill = "goldenrod";
        } else {
            ButtonRect.style.fill = type === "outfit" ? Presets[type].options[value].jacket : Presets[type].options[value];
        }

        this.set_selected_state = (bool) => {
            state_selected = bool;
            if (bool) {
                ButtonRect.style.stroke = "#6495ED";
                ButtonRect.style.strokeWidth = "8px";
            } else {
                ButtonRect.style.stroke = "";
                ButtonRect.style.strokeWidth = "";
            }
        };
        this.get_value = () => value;
    };

    this.buttonClicked = function(buttype, butvalue) {
        AudioCont.play_sound_effect("button_click");
        if (buttype === "randomize") {
            randomize_inputs();
        } else {
            let not_selected_options = [];
            for (let key in ButtonControllers[buttype]) {
                const selected = ButtonControllers[buttype][key].get_value() === butvalue;
                ButtonControllers[buttype][key].set_selected_state(selected);
                if (!selected) not_selected_options.push(key);
            }
            update_world_state_player_icon(buttype, butvalue);
            update_world_state_partner_icon(buttype, shuffleArray(not_selected_options)[0]);
        }
        update_player_icon_SVG();
    };

    function randomize_inputs() {
        for (let key in Presets) {
            let options = shuffleArray(Object.keys(Presets[key].options));
            update_world_state_player_icon(key, options[0]);
            update_world_state_partner_icon(key, options[1]);
            for (let butkey in ButtonControllers[key]) {
                ButtonControllers[key][butkey].set_selected_state(ButtonControllers[key][butkey].get_value() === options[0]);
            }
        }
    }

    function update_world_state_player_icon(type, value) {
        if (type === "type" || type === "skin_color" || type === "hair_color") WorldState.change_player_icon_settings(type, Presets[type].options[value]);
        if (type === "outfit") for (let key in Presets[type].options[value]) WorldState.change_player_icon_settings(key, Presets[type].options[value][key]);
    }

    function update_world_state_partner_icon(type, value) {
        if (type === "type" || type === "skin_color" || type === "hair_color") WorldState.change_partner_icon_settings(type, Presets[type].options[value]);
        if (type === "outfit") for (let key in Presets[type].options[value]) WorldState.change_partner_icon_settings(key, Presets[type].options[value][key]);
    }

    function update_player_icon_SVG() {
        if (IconTranslateGroup) IconTranslateGroup.remove();
        let IconSVG = WorldState.get_person_icon("player", "front");
        IconSVG.style.transform = "scale(20)";
        IconTranslateGroup  = create_SVG_group(0,0);
        IconTranslateGroup.appendChild(IconSVG);
        Parent.appendChild(IconTranslateGroup);
        moveSVGCenterTo(IconTranslateGroup, PlayerIconBox.getBBox().x + 0.5 * PlayerIconBox.getBBox().width, PlayerIconBox.getBBox().y + 0.5 * PlayerIconBox.getBBox().height);
        map_update_func();
    }

    let ButtonControllers = {};
    function createBasicElems() {
        PlayerIconBox = create_SVG_rect(icon_box_dims.x,icon_box_dims.y,icon_box_dims.w, icon_box_dims.h);
        PlayerIconBox.style.rx = "50";
        PlayerIconBox.style.fill = "#FFFFFF99";
        Parent.appendChild(PlayerIconBox);

        ButtonControllers["randomize"] = { randomize: new ButtonCont("randomize",false, label_x, randomize_button_ytop, controllerthat.buttonClicked) };

        for (let type in Presets) {
            ButtonControllers[type] = {};
            let yval = Presets[type].ytop;
            let count = 0;

            let LabelBox = create_SVG_rect(label_x, yval, label_w,button_dims);
            LabelBox.style.fill = "gray"; LabelBox.style.opacity = 0.5; LabelBox.style.rx = "25"; LabelBox.style.ry = "25";
            Parent.appendChild(LabelBox);

            let LabelText = create_SVG_text_in_foreign_element(Presets[type].label,label_x, yval, label_w,button_dims);
            LabelText.childNodes[0].style.fontSize = "50px"; LabelText.childNodes[0].style.textAlign = "center"; LabelText.childNodes[0].style.marginTop = "27px";
            Parent.appendChild(LabelText);

            for (let value in Presets[type].options) {
                let xval = xvals_buttons[count];
                count++;
                ButtonControllers[type][value] = new ButtonCont(type,value, xval, yval, controllerthat.buttonClicked);
            }
        }
    }
    createBasicElems();
    randomize_inputs();
    update_player_icon_SVG();
};

Animated_Starburst_star = function (Parent, start_x, start_y, end_x, end_y, time_on_screen) {
    let Icon = document.getElementById("icon_bonus_star_small").cloneNode(true);
    Icon.removeAttribute("id");
    Icon.classList.remove("interface_element");
    Icon.classList.add("quiz_question_element");

    Parent.appendChild(Icon);
    MoveElemToCoords(Icon, start_x, start_y);

    setTimeout(() => {
        Icon.style.transition = `all ${time_on_screen}ms ease-in-out`;
        Icon.style.opacity = 0;
        MoveElemToCoords(Icon, end_x, end_y);
    }, 5);

    setTimeout(() => Icon.remove(), time_on_screen + 200);
};

function show_bonus_star_on_screen(Parent, center_x, center_y, show_animated_stars, optional_class_name, optional_resize_factor, optional_id) {
    let Star = document.getElementById("icon_bonus_star").cloneNode(true);
    Star.style.display = "inherit";
    Star.style.opacity = 0;
    Star.removeAttribute("id");
    Star.classList.remove("interface_element");
    AudioCont.play_sound_effect("star_earned");

    if (optional_class_name) Star.classList.add(optional_class_name);
    if (optional_id) Star.id = optional_id;

    let ZeroTransGroup = create_SVG_group(0,0);
    let ScaleGroup = create_SVG_group(0,0);
    let TransGroup = create_SVG_group(0,0);

    ZeroTransGroup.appendChild(Star);
    ScaleGroup.appendChild(ZeroTransGroup);
    TransGroup.appendChild(ScaleGroup);
    Parent.appendChild(TransGroup);

    let BaseCenter = getSVGInternalCenter(ZeroTransGroup);
    ZeroTransGroup.style.transform = `translate(${-BaseCenter.x}px, ${-BaseCenter.y}px)`;

    if(optional_resize_factor !== undefined) ScaleGroup.style.transform = `scale(${optional_resize_factor})`;
    MoveElemToCoords(TransGroup, center_x , center_y );

    let main_star_delay = 0;
    if (show_animated_stars) {
        for (let i = 0; i < 25; i++) {
            let x_delta = randomIntFromInterval(0, 500) * (shuffleArray([true, false])[0] ? -1 : 1);
            let y_delta = randomIntFromInterval(0, 500) * (shuffleArray([true, false])[0] ? -1 : 1);
            new Animated_Starburst_star(Parent, center_x + 0.1 * x_delta, center_y + 0.1 * y_delta, center_x + x_delta, center_y + y_delta, 1000);
        }
        main_star_delay = 100;
    }

    setTimeout(() => {
        Star.style.transition = "all 500ms ease-in-out";
        Star.style.opacity = 1;
    }, main_star_delay);

    return Star;
}

