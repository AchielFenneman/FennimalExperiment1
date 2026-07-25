class InstructionsController {
    constructor(expCont, worldState, stimuli) {
        this.expCont = expCont;
        this.worldState = worldState;
        this.stimuli = stimuli;

        this.parentElem = document.getElementById("Instructions_Layer");
        this.boundarySize = 30;

        // General UI State
        this.currentInstructionType = null;
        this.currentInstructionsSVG = null;
        this.closingButton = null;

        // Progress Elements
        this.progressForeign = null;
        this.progressDiv = null;
        this.progressDayNumberIndicators = [];
        this.progressDayNumberNumbers = [];
        this.progressWithinDayBar = null;

        // Overview Page State
        this.overviewPageRemainingSteps = [];
        this.overviewPagePreviousTextElem = [];
        this.overviewPageContinueButton = null;
        this.overviewPageSearchButton = null;
        this.overviewPageSearchContinueText = null;

        // Exploration Phase State
        this.explorationRoster = null;
        this.textElemMainInstructions = null;
        this.fennimalsInPhase = [];
        this.explorationDayNum = 1;
        this.explorationFennefinderStatus = false;
        this.explorationForcedTower = false;

        // Questionnaire State
        this.questionnaireForeign = null;
        this.questionnaireItemsOnScreen = [];
        this.questionnaireContinueButton = null;

        // Payment State
        this.expPaymentData = null;
        this.paymentCardContainer = null;
        this.allCardsOnScreen = [];
    }

    clearInstructions() {
        this.parentElem.style.display = "none";
        this.parentElem.innerHTML = "";
        if (this.currentInstructionsSVG) {
            this.currentInstructionsSVG.remove();
        }
        this.currentInstructionsSVG = null;
        this.closingButton = null;
        this.textElemMainInstructions = null;
        if (this.explorationRoster) {
            this.explorationRoster.destroy();
            this.explorationRoster = null;
        }
    }

    createBasicInstructionElements() {
        let groupElem = document.createElementNS("http://www.w3.org/2000/svg", 'g');

        let coverRect = create_SVG_rect(0, 0, GenParam.SVG_width, GenParam.SVG_height, "instructions_element_cover", undefined);
        coverRect.classList.add("instruction_element_nonbackground");
        coverRect.classList.add("instruction_cover_rect");
        groupElem.appendChild(coverRect);

        let backgroundRect = create_SVG_rect(this.boundarySize, this.boundarySize, GenParam.SVG_width - 2 * this.boundarySize, GenParam.SVG_height - 2 * this.boundarySize, "instructions_element_background", undefined);
        groupElem.appendChild(backgroundRect);

        let title = create_SVG_text_elem(0.5 * GenParam.SVG_width, 90, "TESTING TITLE HERE", "instructions_element_title", "Instructions_Title");
        title.style.fontWeight = 700;
        title.classList.add("instruction_element_nonbackground");
        groupElem.appendChild(title);

        groupElem.appendChild(this.createProgressElements());
        return groupElem;
    }

    createProgressElements() {
        let progressElementsHeight = 50;
        let progressBarWidth = 500;

        this.progressForeign = create_SVG_foreignElement(2 * this.boundarySize, GenParam.SVG_height - this.boundarySize - 70, GenParam.SVG_width - 4 * this.boundarySize, progressElementsHeight, "instruction_element_nonbackground", undefined);
        this.progressDiv = document.createElement("div");
        this.progressDiv.style.display = "flex";
        this.progressDiv.style.justifyContent = "center";
        this.progressDiv.style.alignItems = "center";
        this.progressForeign.appendChild(this.progressDiv);

        this.progressDayNumberIndicators = [];
        this.progressDayNumberNumbers = [];

        let dayIndicatorDiv = document.createElement("div");
        dayIndicatorDiv.style.display = "flex";
        dayIndicatorDiv.style.alignItems = "center";
        this.progressDiv.appendChild(dayIndicatorDiv);

        for (let i = 0; i < this.stimuli.get_number_of_days_in_experiment(); i++) {
            let svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
            svg.style.height = progressElementsHeight;
            svg.style.width = progressElementsHeight;

            let circle = create_SVG_circle(0.5 * progressElementsHeight, 0.5 * progressElementsHeight, 0.5 * progressElementsHeight, "instruction_element_day_indicator_future", undefined);
            svg.appendChild(circle);
            this.progressDayNumberIndicators.push(circle);

            dayIndicatorDiv.appendChild(svg);
            circle.style.transition = "all 200ms ease-in-out";

            let number = create_SVG_text_elem(0.5 * progressElementsHeight, 0.55 * progressElementsHeight, i + 1, undefined, undefined);
            number.style.fontSize = "30px";
            number.style.textAnchor = "middle";
            number.style.alignmentBaseline = "middle";
            this.progressDayNumberNumbers.push(number);
            svg.appendChild(number);
        }

        let progressBarContainer = document.createElement("div");
        progressBarContainer.style.height = progressElementsHeight + "px";
        progressBarContainer.style.width = progressBarWidth + "px";
        progressBarContainer.style.background = "lightgray";
        progressBarContainer.style.marginLeft = "20px";
        progressBarContainer.style.opacity = 0.5;
        progressBarContainer.style.borderRadius = "20px";
        this.progressDiv.appendChild(progressBarContainer);

        this.progressWithinDayBar = document.createElement("div");
        this.progressWithinDayBar.style.height = "100%";
        this.progressWithinDayBar.style.background = "goldenrod";
        this.progressWithinDayBar.style.width = "0%";
        this.progressWithinDayBar.style.borderRadius = "20px";
        this.progressWithinDayBar.style.transition = "all 200ms ease-in-out";
        progressBarContainer.appendChild(this.progressWithinDayBar);

        return this.progressForeign;
    }

    updateProgressWithinDay(percentageComplete) {
        if (!this.progressWithinDayBar || !this.progressWithinDayBar.parentElement) {
            return;
        }

        if (percentageComplete === false) {
            this.progressWithinDayBar.parentElement.style.display = "none";
        } else {
            this.progressWithinDayBar.parentElement.style.display = "inherit";
            this.progressWithinDayBar.style.width = percentageComplete + "%";
        }
    }

    updateProgressNewDay(currentDay) {
        if (currentDay === false) {
            this.progressDayNumberIndicators.forEach(i => i.style.display = "none");
            this.progressDayNumberNumbers.forEach(n => n.style.display = "none");
        } else {
            for (let i = 0; i < this.progressDayNumberIndicators.length; i++) {
                if ((i + 1) < currentDay) {
                    this.progressDayNumberIndicators[i].style.fill = "navy";
                    this.progressDayNumberIndicators[i].style.opacity = 0.7;
                    this.progressDayNumberIndicators[i].setAttribute("r", 0.7 * 0.5 * 50);
                    this.progressDayNumberNumbers[i].style.fill = "white";
                    this.progressDayNumberNumbers[i].style.fontSize = "30px";
                }
                if ((i + 1) === currentDay) {
                    this.progressDayNumberIndicators[i].style.fill = "goldenrod";
                    this.progressDayNumberIndicators[i].style.opacity = 0.75;
                    this.progressDayNumberIndicators[i].setAttribute("r", 0.5 * 50);
                    this.progressDayNumberNumbers[i].style.fill = "navy";
                    this.progressDayNumberNumbers[i].style.fontSize = "40px";
                    this.progressDayNumberNumbers[i].style.fontWeight = 600;
                }
                if ((i + 1) > currentDay) {
                    this.progressDayNumberIndicators[i].style.fill = "gray";
                    this.progressDayNumberIndicators[i].style.opacity = 0.5;
                    this.progressDayNumberIndicators[i].setAttribute("r", 0.7 * 0.5 * 50);
                    this.progressDayNumberNumbers[i].style.fill = "white";
                    this.progressDayNumberNumbers[i].style.fontSize = "30px";
                }
            }
        }
    }

    addClosingButtonToParent(position, addKeyboardShortcut, optionalAdditionalFunction, optionalDelayTime) {
        switch (position) {
            case "top-right":
                this.closingButton = create_SVG_buttonElement(1820, 3 * this.boundarySize, 75, 75, "X", 70);
                break;
            case "top-left":
                this.closingButton = create_SVG_buttonElement(3 * this.boundarySize, 3 * this.boundarySize, 75, 75, "X", 70);
                break;
            case "bottom-center":
                this.closingButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 70);
                break;
            default:
                // Defensive fallback: If an unknown position is passed, default to top-right to prevent crashes!
                this.closingButton = create_SVG_buttonElement(1820, 3 * this.boundarySize, 75, 75, "X", 70);
                break;
        }

        this.parentElem.appendChild(this.closingButton);
        this.closingButton.classList.add("instruction_element_nonbackground");
        AudioCont.play_sound_effect("alert_minimal");

        this.closingButton.onpointerdown = () => {
            if (optionalAdditionalFunction) optionalAdditionalFunction();
            this.closeInstructions();
            AudioCont.play_sound_effect("close_menu");
        };

        if (addKeyboardShortcut) {
            add_keyboard_shortcuts_to_object(this.closingButton, ["Escape", "Enter", " "], 700, () => {
                this.closeInstructions();
                AudioCont.play_sound_effect("close_menu");
            });
        }

        if (optionalDelayTime > 0) {
            this.closingButton.style.display = "none";
            setTimeout(() => { this.closingButton.style.display = "inherit"; }, optionalDelayTime);
        }
    }

    instructionsRequestedByParticipant() {
        switch (this.currentInstructionType) {
            case "exploration":
                this.updateAndShowFreeExplorationInstructions();
                break;
            case "hint_and_search":
                this.openInstructionsPage();
                break;
            case "on_call":
                if (this.expCont.isPhoneRinging || this.expCont.waitingForPlayerToReturnHome) {
                    Interface.Prompt.show_message("I should head to the phone booth in the Home region!", 3000);
                    this.expCont.mapCont.enable_map_interactions();
                } else {
                    // It is already built, just open it!
                    this.show_on_call_hint();
                }
                break;
        }
    }

    closeInstructions() {
        let nonBackgroundElem = this.parentElem.getElementsByClassName("instruction_element_nonbackground");
        for (let i = 0; i < nonBackgroundElem.length; i++) {
            nonBackgroundElem[i].style.display = "none";
        }

        let background = this.parentElem.getElementsByClassName("instructions_element_background")[0];
        background.style.transition = "all 150ms ease-in-out";

        setTimeout(() => {
            background.setAttribute("x", GenParam.RequestInstructionButtonSettings.center_x - 0.5 * GenParam.RequestInstructionButtonSettings.width);
            background.setAttribute("y", GenParam.RequestInstructionButtonSettings.center_y - 0.5 * GenParam.RequestInstructionButtonSettings.height);
            background.setAttribute("width", GenParam.RequestInstructionButtonSettings.width);
            background.setAttribute("height", GenParam.RequestInstructionButtonSettings.height);
        }, 0);

        setTimeout(() => {
            background.style.display = "none";
            this.parentElem.style.display = "none";
            this.expCont.instructionsPageClosed(); // CamelCased Hook
        }, 150);

        if (this.closingButton) {
            this.closingButton.remove();
            this.closingButton = null;
        }
    }

    openInstructionsPage() {
        let background = this.parentElem.getElementsByClassName("instructions_element_background")[0];
        background.style.display = "inherit";
        background.style.transition = "all 200ms ease-in-out";
        this.parentElem.style.display = "inherit";
        this.addClosingButtonToParent("top-left", true, undefined);

        setTimeout(() => {
            background.setAttribute("x", this.boundarySize);
            background.setAttribute("y", this.boundarySize);
            background.setAttribute("width", GenParam.SVG_width - 2 * this.boundarySize);
            background.setAttribute("height", GenParam.SVG_height - 2 * this.boundarySize);
        }, 0);

        setTimeout(() => {
            let nonBackgroundElem = this.parentElem.getElementsByClassName("instruction_element_nonbackground");
            for (let i = 0; i < nonBackgroundElem.length; i++) {
                nonBackgroundElem[i].style.display = "inherit";
            }
        }, 250);
    }

    showEmptyPage(includeMapBackground) {
        this.currentInstructionType = "general";
        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";
        this.progressDiv.style.display = "none";

        if (includeMapBackground) {
            document.getElementById("Map").style.display = "inherit";
            let coverRect = document.getElementsByClassName("instruction_cover_rect")[0];
            if (coverRect) coverRect.style.opacity = 0.2;
        } else {
            document.getElementById("Map").style.display = "none";
            document.getElementById("Interface").style.display = "none";
        }
    }

    showConsentPage() {
        this.showEmptyPage(true);
        document.getElementById("Instructions_Title").innerHTML = "Your consent to participate in this study";

        let leftTextElem = create_SVG_text_in_foreign_element(GenParam.GeneralInstructions.Consent.left_column, 2 * this.boundarySize, 110, 0.45 * GenParam.SVG_width, 0.8 * GenParam.SVG_height, "instructions_element_text");
        let rightTextElem = create_SVG_text_in_foreign_element(GenParam.GeneralInstructions.Consent.right_column, 0.51 * GenParam.SVG_width, 110, 0.45 * GenParam.SVG_width, 0.8 * GenParam.SVG_height, "instructions_element_text");
        leftTextElem.childNodes[0].style.fontSize = "30px";
        rightTextElem.childNodes[0].style.fontSize = "30px";
        this.currentInstructionsSVG.appendChild(leftTextElem);
        this.currentInstructionsSVG.appendChild(rightTextElem);

        let tickBoxDims = 0.05 * GenParam.SVG_width;
        let tickBoxForeign = create_SVG_foreignElement(0.3 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, tickBoxDims, tickBoxDims, undefined, undefined);
        let consentTickBox = document.createElement("input");
        consentTickBox.type = "checkbox";
        consentTickBox.style.width = "90%";
        consentTickBox.style.height = "90%";
        consentTickBox.style.cursor = "pointer";
        consentTickBox.style.outline = "5px solid darkred";

        tickBoxForeign.appendChild(consentTickBox);
        this.currentInstructionsSVG.appendChild(tickBoxForeign);

        let consentBoxText = create_SVG_text_elem(0.3 * GenParam.SVG_width + 1.5 * tickBoxDims, 0.85 * GenParam.SVG_height + 0.6 * tickBoxDims, "I consent to these terms", "instructions_element_text", undefined);
        consentBoxText.style.fontSize = "50px";
        consentBoxText.style.fill = "darkred";
        consentBoxText.style.fontWeight = 700;
        this.currentInstructionsSVG.appendChild(consentBoxText);

        let continueButton = create_SVG_buttonElement(0.8 * GenParam.SVG_width, 0.85 * GenParam.SVG_height + 0.5 * tickBoxDims, 400, 75, "Continue", 40);
        this.currentInstructionsSVG.appendChild(continueButton);
        continueButton.style.display = "none";

        consentTickBox.onchange = () => {
            if (consentTickBox.checked) {
                this.expCont.consentProvidedByParticipant(); // CamelCased Hook
                continueButton.style.display = "inherit";
                consentTickBox.style.outline = "5px solid navy";
                consentBoxText.style.fill = "navy";
            } else {
                continueButton.style.display = "none";
                consentTickBox.style.outline = "5px solid darkred";
                consentBoxText.style.fill = "darkred";
            }
        };

        continueButton.onpointerdown = () => {
            this.expCont.generalInstructionsPageCompleted(); // CamelCased Hook
            AudioCont.play_sound_effect("button_click");
        };
    }

    showBrowserCheckAndFullscreenPage() {
        this.showEmptyPage(true);
        let browser = getBrowser();

        if (browser !== "Chrome") {
            document.getElementById("Instructions_Title").innerHTML = "Oops! This experiment only works in Chrome...";
            let wrongBrowserTextElem = create_SVG_text_in_foreign_element("This experiment is only tested and validated in Chrome. Since you are using a different browser you will not be able to participate in this experiment. Please return this task on Prolific. Our apologies for your inconvenience :(",
                4 * this.boundarySize, 0.35 * GenParam.SVG_height, GenParam.SVG_width - 8 * this.boundarySize, 0.5 * GenParam.SVG_height, "instructions_element_text", undefined);
            wrongBrowserTextElem.childNodes[0].style.fontWeight = 600;
            wrongBrowserTextElem.childNodes[0].style.fontStyle = "italic";
            this.currentInstructionsSVG.appendChild(wrongBrowserTextElem);
        } else {
            document.getElementById("Instructions_Title").innerHTML = "This experiment is best experienced in full-screen mode";
            let fullScreenTextElem = create_SVG_text_in_foreign_element("Pressing the button below will toggle full-screen mode. <br>" +
                "On windows, you can exit (and-re-enter) full-screen mode at any time by pressing [F11]. On Mac, you can exit and re-enter full-screen mode by pressing [Command]+[Cntrl]+[F]. <br>" +
                "<br>" +
                "In addition, please make sure that your audio is on! (The sound will enhance your performance during this task). ",
                4 * this.boundarySize, 0.25 * GenParam.SVG_height, GenParam.SVG_width - 8 * this.boundarySize, 0.4 * GenParam.SVG_height, "instructions_element_text", undefined);
            this.currentInstructionsSVG.appendChild(fullScreenTextElem);

            let continueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 500, 75, "Go to full-screen mode", 40);
            continueButton.onpointerdown = (event) => {
                toggleFullscreen(event);
                this.expCont.generalInstructionsPageCompleted(); // CamelCased Hook
            };
            this.currentInstructionsSVG.appendChild(continueButton);
        }
    }

    showSingleSittingPage() {
        this.showEmptyPage(true);

        let icon = document.getElementById("icon_attention").cloneNode(true);
        icon.style.display = "inherit";
        icon.style.stroke = "darkred";
        this.currentInstructionsSVG.appendChild(icon);
        MoveElemToCoords(icon, 0.1 * GenParam.SVG_width, 0.4 * GenParam.SVG_height);

        document.getElementById("Instructions_Title").innerHTML = "Please complete this experiment in a single setting";
        let fullScreenTextElem = create_SVG_text_in_foreign_element(
            "For this experiment (and your earnings at the end), it is important that you <u>pay close attention throughout the entire experiment.</u> " +
            "Please avoid any distractions (either on this screen or on a different screen) and complete the experiment in a single sitting. This will help you to complete the experiment faster, and earn more money at the end. ",
            0.2 * GenParam.SVG_width, 0.275 * GenParam.SVG_height, 0.8 * GenParam.SVG_width - 8 * this.boundarySize, 0.4 * GenParam.SVG_height, "instructions_element_text", undefined);
        this.currentInstructionsSVG.appendChild(fullScreenTextElem);
        fullScreenTextElem.style.color = "darkred";

        let continueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 40);
        continueButton.onpointerdown = () => {
            this.expCont.generalInstructionsPageCompleted(); // CamelCased Hook
        };
        this.currentInstructionsSVG.appendChild(continueButton);
    }

    showCharacterCreationScreen(mapUpdateFunc) {
        this.showEmptyPage(true);
        document.getElementById("Instructions_Title").innerHTML = "Select your icon";

        new CharacterCreationController(this.currentInstructionsSVG, mapUpdateFunc, this.worldState);

        let continueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.875 * GenParam.SVG_height, 400, 75, "Continue", 40);
        continueButton.onpointerdown = () => {
            this.expCont.generalInstructionsPageCompleted(); // CamelCased Hook
        };
        this.currentInstructionsSVG.appendChild(continueButton);
    }

    showPartnerIntroductionScreen() {
        this.showEmptyPage(true);
        let partnerInfo = this.worldState.get_partner_icon_settings();
        document.getElementById("Instructions_Title").innerHTML = "Meet " + partnerInfo.name;
        let pronoun = partnerInfo.type === "female" ? "she" : "he";
        AudioCont.play_sound_effect("alert");

        let iconBox = create_SVG_rect(0.6 * GenParam.SVG_width, 0.2 * GenParam.SVG_height, 540, 640, undefined, undefined);
        iconBox.style.rx = "50";
        iconBox.style.fill = "#FFFFFF99";
        this.currentInstructionsSVG.appendChild(iconBox);

        let iconSVG = this.worldState.get_person_icon("partner", "front");
        iconSVG.style.transform = "scale(20)";
        let iconTranslateGroup = create_SVG_group(0, 0, undefined, undefined);
        iconTranslateGroup.appendChild(iconSVG);
        this.currentInstructionsSVG.appendChild(iconTranslateGroup);
        moveSVGCenterTo(iconTranslateGroup, iconBox.getBBox().x + 0.5 * iconBox.getBBox().width, iconBox.getBBox().y + 0.5 * iconBox.getBBox().height);

        let introText = partnerInfo.name + " is an intern on the island, who will be shadowing you for the next couple of days to " +
            "get a feel of what's it like to be a caretaker on the island. " + pronoun + " will observe your interactions with the Fennimals on the island, but " +
            pronoun + " will not interact with any of the Fennimals directly. ";
        let textObj = create_SVG_text_in_foreign_element(introText, 0.1 * GenParam.SVG_width, 0.3 * GenParam.SVG_height, 0.5 * GenParam.SVG_width, 0.3 * GenParam.SVG_height, undefined, undefined);
        textObj.style.fontSize = "40px";
        this.currentInstructionsSVG.appendChild(textObj);

        let continueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.875 * GenParam.SVG_height, 400, 75, "Continue", 40);
        continueButton.onpointerdown = () => {
            this.expCont.generalInstructionsPageCompleted(); // CamelCased Hook
        };
        this.currentInstructionsSVG.appendChild(continueButton);
    }

    showOverviewPage() {
        let starsCanBeEarned = this.stimuli.get_maximum_number_of_bonus_stars() > 0;
        let storyTextOffset = starsCanBeEarned ? 0 : 0.175 * GenParam.SVG_height;
        this.overviewPageRemainingSteps = starsCanBeEarned ? ["stars", "movement", "search", "lookout", "instructions"] : ["movement", "search", "lookout", "instructions"];

        this.showEmptyPage(true);
        document.getElementById("Instructions_Title").innerHTML = "Overview";

        GenParam.GeneralInstructions.Overview.story = GenParam.GeneralInstructions.Overview.story.replace("%NUMBERDAYS%", this.stimuli.get_number_of_days_in_experiment());
        let storyTextElem = create_SVG_text_in_foreign_element(GenParam.GeneralInstructions.Overview.story, 2 * this.boundarySize, 110 + storyTextOffset, 0.45 * GenParam.SVG_width, 0.4 * GenParam.SVG_height, "instructions_element_text");
        this.overviewPagePreviousTextElem.push(storyTextElem);
        storyTextElem.childNodes[0].style.textAlign = "justify";
        this.currentInstructionsSVG.appendChild(storyTextElem);

        this.overviewPageContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.92 * GenParam.SVG_height, 400, 75, "Continue", 40);
        this.currentInstructionsSVG.appendChild(this.overviewPageContinueButton);
        this.overviewPageContinueButton.onpointerdown = () => {
            this.overviewPageNextStep();
            AudioCont.play_sound_effect("button_click");
        };
    }

    overviewPageNextStep() {
        if (this.overviewPageRemainingSteps.length > 0) {
            let backgroundColor = "#EDEDED";
            let boxHeight = 0.175 * GenParam.SVG_height, boxOffsetTop = 150;
            let spacingBoxes = 0.01 * GenParam.SVG_height;
            let nextStep = this.overviewPageRemainingSteps.shift();

            this.overviewPageContinueButton.style.display = "inherit";
            if (this.overviewPageSearchButton) {
                this.overviewPageSearchButton.disable_functionality();
                this.overviewPageSearchContinueText.style.display = "none";
            }

            this.overviewPagePreviousTextElem.forEach(t => t.childNodes[0].style.color = "gray");

            switch (nextStep) {
                case "stars":
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace(/%CURRENCYSYMBOL%/g, this.stimuli.get_bonus_details().currency_symbol);
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace("%AMOUNTPERSTAR%", this.stimuli.get_bonus_details().bonus_per_star.toFixed(2));
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace("%MAXNUMBERSTARS%", this.stimuli.get_maximum_number_of_bonus_stars());
                    GenParam.GeneralInstructions.Overview.bonus = GenParam.GeneralInstructions.Overview.bonus.replace("%MAXBONUSAMOUNT%", (this.stimuli.get_maximum_number_of_bonus_stars() * this.stimuli.get_bonus_details().bonus_per_star).toFixed(2));
                    showBonusStarOnScreen(this.currentInstructionsSVG, 0.075 * GenParam.SVG_width, 110 + 0.57 * GenParam.SVG_height, true, undefined, undefined);

                    let starTextElem = create_SVG_text_in_foreign_element(GenParam.GeneralInstructions.Overview.bonus, 0.15 * GenParam.SVG_width, 110 + 0.42 * GenParam.SVG_height, 0.33 * GenParam.SVG_width, 0.8 * GenParam.SVG_height, "instructions_element_text");
                    this.overviewPagePreviousTextElem.push(starTextElem);
                    starTextElem.childNodes[0].style.textAlign = "justify";
                    this.currentInstructionsSVG.appendChild(starTextElem);
                    break;
                case "movement":
                    let backgroundRectMovement = create_SVG_rect(0.51 * GenParam.SVG_width, boxOffsetTop, 0.45 * GenParam.SVG_width, boxHeight, undefined, undefined);
                    backgroundRectMovement.style.fill = backgroundColor;
                    backgroundRectMovement.setAttribute("rx", 30);
                    this.currentInstructionsSVG.appendChild(backgroundRectMovement);

                    let playerIcon = this.worldState.get_person_icon("player", "front");
                    playerIcon.style.transform = "scale(5)";

                    let playerIconContainer = create_SVG_group(0, 0, 0, 0, undefined, undefined);
                    playerIconContainer.appendChild(playerIcon);
                    this.currentInstructionsSVG.appendChild(playerIconContainer);
                    playerIconContainer.style.transform = `translate(${0.55 * GenParam.SVG_width}px, ${boxOffsetTop + 0.5 * boxHeight}px)`;

                    let movementText = create_SVG_text_in_foreign_element("This icon represents you. You can move this icon across the map by pressing down with your mouse. ",
                        0.58 * GenParam.SVG_width, boxOffsetTop, 0.375 * GenParam.SVG_width, boxHeight, "instructions_element_text");
                    this.currentInstructionsSVG.appendChild(movementText);
                    break;
                case "search":
                    let backgroundRectSearch = create_SVG_rect(0.51 * GenParam.SVG_width, boxOffsetTop + boxHeight + spacingBoxes, 0.45 * GenParam.SVG_width, boxHeight, undefined, undefined);
                    backgroundRectSearch.style.fill = backgroundColor;
                    backgroundRectSearch.setAttribute("rx", 30);
                    this.currentInstructionsSVG.appendChild(backgroundRectSearch);

                    let searchButtonDims = {
                        center_x: 0.545 * GenParam.SVG_width,
                        center_y: boxOffsetTop + 1.5 * boxHeight + 1 * spacingBoxes,
                        width: .55 * boxHeight,
                        height: .55 * boxHeight
                    };
                    this.overviewPageSearchButton = new ActionButton(this.currentInstructionsSVG, "magnifier", searchButtonDims, 1000, false, () => {
                        this.overviewPageNextStep();
                        AudioCont.play_sound_effect("success");
                        create_ripple(this.currentInstructionsSVG, searchButtonDims.center_x, searchButtonDims.center_y, true, AudioCont);
                    });
                    this.overviewPageContinueButton.style.display = "none";

                    let searchButtonText = create_SVG_text_in_foreign_element("Some locations on the map contain Fennimals. Once you are close to a location, a magnifying glass will appear. You can search for a Fennimal by holding down on this button.",
                        0.58 * GenParam.SVG_width, boxOffsetTop + 0.85 * boxHeight + 1 * spacingBoxes, 0.375 * GenParam.SVG_width, 1.1 * boxHeight, "instructions_element_text");
                    this.currentInstructionsSVG.appendChild(searchButtonText);

                    this.overviewPageSearchContinueText = create_SVG_text_elem(0.5 * GenParam.SVG_width, 0.92 * GenParam.SVG_height, "Hold down on the search button to continue...", "instructions_element_text", undefined);
                    this.overviewPageSearchContinueText.style.fontStyle = "italic";
                    this.overviewPageSearchContinueText.style.textAnchor = "middle";
                    this.currentInstructionsSVG.appendChild(this.overviewPageSearchContinueText);
                    break;
                case "lookout":
                    let backgroundRectLookout = create_SVG_rect(0.51 * GenParam.SVG_width, boxOffsetTop + 2 * boxHeight + 2 * spacingBoxes, 0.45 * GenParam.SVG_width, boxHeight, undefined, undefined);
                    backgroundRectLookout.style.fill = backgroundColor;
                    backgroundRectLookout.setAttribute("rx", 30);
                    this.currentInstructionsSVG.appendChild(backgroundRectLookout);

                    let lookoutTowerCopy = document.getElementById("watchtower").cloneNode(true);
                    lookoutTowerCopy.removeAttribute("id");
                    let lookoutTowerScale = create_SVG_group(0, 0, 0, 0, undefined, undefined);
                    let lookoutTowerTranslate = create_SVG_group(0, 0, 0, 0, undefined, undefined);
                    lookoutTowerTranslate.appendChild(lookoutTowerCopy);
                    lookoutTowerScale.appendChild(lookoutTowerTranslate);
                    this.currentInstructionsSVG.appendChild(lookoutTowerScale);

                    lookoutTowerScale.style.transformOrigin = "center";
                    lookoutTowerScale.style.transform = "scale(2)";
                    MoveElemToCoords(lookoutTowerTranslate, 0.52 * GenParam.SVG_width, boxOffsetTop + 2 * boxHeight + 2 * spacingBoxes - 45);

                    let lookoutTowerText = create_SVG_text_in_foreign_element("There is a lookout tower located at the center of the island. If you are unsure where to go, climbing this tower will give you a hint!",
                        0.58 * GenParam.SVG_width, boxOffsetTop + 2 * boxHeight + 2 * spacingBoxes, 0.375 * GenParam.SVG_width, boxHeight, "instructions_element_text");
                    this.currentInstructionsSVG.appendChild(lookoutTowerText);
                    break;
                case "instructions":
                    let backgroundRectInstructions = create_SVG_rect(0.51 * GenParam.SVG_width, boxOffsetTop + 3 * boxHeight + 3 * spacingBoxes, 0.45 * GenParam.SVG_width, boxHeight, undefined, undefined);
                    backgroundRectInstructions.style.fill = backgroundColor;
                    backgroundRectInstructions.setAttribute("rx", 30);
                    this.currentInstructionsSVG.appendChild(backgroundRectInstructions);

                    let exampleButton = create_SVG_buttonElement(0.545 * GenParam.SVG_width, boxOffsetTop + 3.5 * boxHeight + 3 * spacingBoxes, GenParam.RequestInstructionButtonSettings.width, GenParam.RequestInstructionButtonSettings.height, GenParam.RequestInstructionButtonSettings.text, GenParam.RequestInstructionButtonSettings.textsize);
                    let instructionsText = create_SVG_text_in_foreign_element("On the top-left of the screen you will find a button labelled '" + GenParam.RequestInstructionButtonSettings.text + "' . Click this button if you are unsure about what to do next.",
                        0.58 * GenParam.SVG_width, boxOffsetTop + 3 * boxHeight + 3 * spacingBoxes, 0.375 * GenParam.SVG_width, boxHeight, "instructions_element_text");

                    this.currentInstructionsSVG.appendChild(exampleButton);
                    this.currentInstructionsSVG.appendChild(instructionsText);
                    break;
            }
        } else {
            this.expCont.generalInstructionsPageCompleted(); // CamelCased Hook
        }
    }

    initializeFreeExplorationInstructions(interactionType, currentBlockNum, canEarnStars, fennefinderStatus, forcedTowerClimbAtStart, fennimalsInPhaseArray) {
        // Trial queues can contain duplicate Fennimal ids (cartesian interaction types) — roster must be unique.
        this.fennimalsInPhase = this.uniqueFennimalsById(
            (fennimalsInPhaseArray || []).filter((f) => f && f.name !== undefined)
        );
        this.currentInstructionType = "exploration";
        this.explorationDayNum = currentBlockNum;
        this.explorationFennefinderStatus = fennefinderStatus;
        this.explorationForcedTower = forcedTowerClimbAtStart === true;

        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";

        document.getElementById("Instructions_Title").innerHTML =
            "Day " + currentBlockNum + ": find all the Fennimals on the island";

        let fennefinderText = fennefinderStatus === true
            ? " The Fennefinder (bottom-right) will help guide you."
            : fennefinderStatus === "low_power_mode"
                ? " The Fennefinder is out of battery — you'll need to search by memory."
                : "";
        let domeText = this.explorationForcedTower
            ? " Start by climbing the watchtower to spot their locations."
            : "";

        let n = this.fennimalsInPhase.length;
        let instructionText =
            "Explore the island and find all " + n + " Fennimals." +
            fennefinderText + domeText +
            "<br>These are the Fennimals you are looking for:";

        this.setExplorationInstructionText(instructionText);
        this.buildExplorationRoster("intro", this.fennimalsInPhase);
        this.updateProgressNewDay(currentBlockNum);
        this.updateProgressWithinDay(false);
        this.addClosingButtonToParent("bottom-center", true, undefined, 400);
    }

    uniqueFennimalsById(fenList) {
        let seen = new Set();
        let unique = [];
        (fenList || []).forEach((fen) => {
            if (!fen || fen.id === undefined || fen.id === null) return;
            let key = String(fen.id);
            if (seen.has(key)) return;
            seen.add(key);
            unique.push(fen);
        });
        return unique;
    }

    setExplorationInstructionText(html) {
        if (this.textElemMainInstructions) {
            this.textElemMainInstructions.remove();
            this.textElemMainInstructions = null;
        }
        this.textElemMainInstructions = create_SVG_text_in_foreign_element(
            html,
            0.1 * GenParam.SVG_width,
            0.12 * GenParam.SVG_height,
            0.8 * GenParam.SVG_width,
            0.18 * GenParam.SVG_height,
            "instruction_element_text"
        );
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        let textNode = this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0];
        textNode.style.fontSize = "36px";
        textNode.style.textAlign = "center";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);
    }

    buildExplorationRoster(mode, fenList) {
        if (this.explorationRoster) {
            this.explorationRoster.destroy();
            this.explorationRoster = null;
        }
        let bandX = 0.08 * GenParam.SVG_width;
        let bandY = 0.30 * GenParam.SVG_height;
        let bandW = 0.84 * GenParam.SVG_width;
        let bandH = 0.48 * GenParam.SVG_height;
        this.explorationRoster = new ExplorationFennimalRoster(
            this.parentElem,
            bandX,
            bandY,
            bandW,
            bandH
        );
        this.explorationRoster.render(this.uniqueFennimalsById(fenList), mode);
    }

    getExplorationRosterFennimalsFromWorld() {
        let visited = [];
        let unvisited = [];
        this.worldState.get_array_of_Fennimals_on_map().forEach((f) => {
            if (f.name === undefined) return;
            if (f.visited) visited.push(f);
            else unvisited.push(f);
        });
        visited = this.uniqueFennimalsById(visited);
        unvisited = this.uniqueFennimalsById(unvisited);
        visited.sort((a, b) => (a.num_in_phase || 0) - (b.num_in_phase || 0));
        unvisited.sort((a, b) => (a.num_in_phase || 0) - (b.num_in_phase || 0));
        return { visited, unvisited, all: [...visited, ...unvisited] };
    }

    updateExplorationPhaseInstructionsToShowCompletion() {
        this.showFreeExplorationCompletionScreen();
    }

    showFreeExplorationCompletionScreen() {
        AudioCont.play_sound_effect("positive");

        // Ensure the instruction shell is visible (may already be open from a help reopen).
        if (!this.currentInstructionsSVG || !this.currentInstructionsSVG.parentNode) {
            this.clearInstructions();
            this.currentInstructionType = "exploration";
            this.currentInstructionsSVG = this.createBasicInstructionElements();
            this.parentElem.appendChild(this.currentInstructionsSVG);
            this.updateProgressNewDay(this.explorationDayNum);
        }

        this.parentElem.style.display = "inherit";
        let background = this.parentElem.getElementsByClassName("instructions_element_background")[0];
        if (background) {
            background.style.display = "inherit";
            background.setAttribute("x", this.boundarySize);
            background.setAttribute("y", this.boundarySize);
            background.setAttribute("width", GenParam.SVG_width - 2 * this.boundarySize);
            background.setAttribute("height", GenParam.SVG_height - 2 * this.boundarySize);
        }

        if (this.closingButton) {
            this.closingButton.remove();
            this.closingButton = null;
        }

        document.getElementById("Instructions_Title").innerHTML = "Well done!";
        let n = this.fennimalsInPhase.length;
        this.setExplorationInstructionText(
            "You found all " + n + " Fennimals on the island.<br>Continue when you are ready for the next part of the day."
        );

        let rosterFens = this.getExplorationRosterFennimalsFromWorld().all;
        if (rosterFens.length === 0) rosterFens = this.fennimalsInPhase;
        this.buildExplorationRoster("complete", rosterFens);

        // Reveal non-background elements (in case the page was mid-collapse).
        Array.from(this.parentElem.getElementsByClassName("instruction_element_nonbackground")).forEach((el) => {
            el.style.display = "inherit";
        });

        this.addClosingButtonToParent("bottom-center", true, undefined, 600);
    }

    updateAndShowFreeExplorationInstructions() {
        // If the phase is already complete, show the finish screen instead of the checklist.
        if (this.expCont && this.expCont.flagExplorationPhaseCompleted) {
            this.showFreeExplorationCompletionScreen();
            return;
        }

        let background = this.parentElem.getElementsByClassName("instructions_element_background")[0];
        if (background) {
            background.style.display = "inherit";
            background.style.transition = "all 200ms ease-in-out";
            setTimeout(() => {
                background.setAttribute("x", this.boundarySize);
                background.setAttribute("y", this.boundarySize);
                background.setAttribute("width", GenParam.SVG_width - 2 * this.boundarySize);
                background.setAttribute("height", GenParam.SVG_height - 2 * this.boundarySize);
            }, 0);
        }
        this.parentElem.style.display = "inherit";

        if (this.closingButton) {
            this.closingButton.remove();
            this.closingButton = null;
        }

        setTimeout(() => {
            Array.from(this.parentElem.getElementsByClassName("instruction_element_nonbackground")).forEach((el) => {
                el.style.display = "inherit";
            });

            let { visited, unvisited, all } = this.getExplorationRosterFennimalsFromWorld();
            let foundCount = visited.length;
            let total = all.length || this.fennimalsInPhase.length;

            document.getElementById("Instructions_Title").innerHTML =
                "Day " + this.explorationDayNum + ": find all the Fennimals on the island";

            let statusText = foundCount === 0
                ? "Explore the island and find all " + total + " Fennimals.<br>These are the Fennimals you are looking for:"
                : "You've found <b>" + foundCount + " of " + total + "</b> Fennimals so far.<br>Color portraits are found — grayscale ones are still out there:";

            this.setExplorationInstructionText(statusText);
            this.buildExplorationRoster("progress", all.length ? all : this.fennimalsInPhase);
            this.addClosingButtonToParent("bottom-center", true, undefined, 200);
        }, 210);
    }

    initializeHintAndSearchPhaseGeneralInstructions(interactionType, hintType, currentBlockNum, numBonusStarsPerQuestion, fennefinderStatus, fennimalsInPhaseArray) {
        let closeButtonPos = "bottom-center";
        this.currentInstructionType = "hint_and_search";
        let continueButtonTime = 500;

        if (numBonusStarsPerQuestion === true) numBonusStarsPerQuestion = 1;
        let canEarnStars = numBonusStarsPerQuestion > 0;

        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";

        document.getElementById("Instructions_Title").innerHTML = "Day " + currentBlockNum + ": time to visit some Fennimals!";

        let canEarnStarsText = "", textY = 300, textH = 500;
        if (canEarnStars) {
            continueButtonTime += numBonusStarsPerQuestion * 500;
            const dx = 0.08 * GenParam.SVG_width;
            const center = 0.5 * GenParam.SVG_width;
            const allXPos = {
                1: [center],
                2: [center - 0.5 * dx, center + 0.5 * dx],
                3: [center - dx, center, center + dx],
                4: [center - 1.5 * dx, center - 0.5 * dx, center + 0.5 * dx, center + 1.5 * dx],
                5: [center - 2 * dx, center - dx, center, center + dx, center + 2 * dx],
            };
            const starPos = allXPos[numBonusStarsPerQuestion];

            for (let i = 0; i < numBonusStarsPerQuestion; i++) {
                setTimeout(() => {
                    showBonusStarOnScreen(this.parentElem, starPos[i], 0.53 * GenParam.SVG_height, true, "deletable_bonus_star", 1, undefined);
                }, (i + 1) * 300);
            }
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;

            let numText = numBonusStarsPerQuestion > 1 ? numBonusStarsPerQuestion + " bonus stars" : "a bonus star";
            canEarnStarsText = "<b><br><br> Please answer carefully, as you will earn " + numText + " for each question you correctly answer! </b><br><br><br><br><br>";
            textY = 200;
            textH = 600;
        }

        let fennefinderText = fennefinderStatus === true ? "The Fennefinder on the bottom-right of the screen will help guide you to the different Fennimals. " :
            fennefinderStatus === "low_power_mode" ? "Unfortunately, the Fennefinder has run out of battery - so you'll have to find all Fennimals by memory! " : "";

        let instructionText = "It's time to check in on the Fennimals! One at a time, you will be given a hint to find them. " +
            "After you have interacted with them, you will be given the next hint, until you have visited all " + fennimalsInPhaseArray.length + " Fennimals.<br>" +
            canEarnStarsText + fennefinderText + "<br><i>Tip: don't know where to go next? Try climbing the watchtower!</i>";

        this.textElemMainInstructions = create_SVG_text_in_foreign_element(instructionText, 100, textY, (1920 - 2 * 100), textH, "instruction_element_text");
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

        this.updateProgressNewDay(currentBlockNum);

        const deleteBonusStarIcons = () => {
            Array.from(document.getElementsByClassName("deletable_bonus_star")).forEach(s => s.remove());
        };
        this.addClosingButtonToParent(closeButtonPos, false, deleteBonusStarIcons, continueButtonTime);
    }

    initializeHintAndSearchPhaseTrialInstructions(fenObj, hintType, percentageComplete) {
        // TODO: When hint_and_search supports Fennimal_toy / toy_to_box (and other new
        // interaction types), branch trial hint visuals/copy by fenObj.interaction_type
        // similar to getPhoneRoomHintConfig() / createPhoneRoomHintVisual().
        this.updateProgressWithinDay(percentageComplete);
        let continueButtonTime = 500;

        this.currentInstructionType = "hint_and_search";
        this.parentElem.style.display = "inherit";

        document.getElementById("Instructions_Title").innerHTML = "Find this Fennimal!";
        if (this.textElemMainInstructions) this.textElemMainInstructions.remove();

        let iconY = (fenObj.bonus_stars_earnable === true || fenObj.bonus_stars_earnable > 0) ? 0.375 * GenParam.SVG_height : 0.45 * GenParam.SVG_height;

        if (hintType === "icon") {
            let icon = create_Fennimal_SVG_object(fenObj, GenParam.Fennimal_head_size, false);
            this.currentInstructionsSVG.appendChild(icon);
            let fennimalScaleGroup = icon.getElementsByClassName("Fennimal_scale_group")[0];
            let box = fennimalScaleGroup.getBBox();
            let deltaX = (0.5 * GenParam.SVG_width) - (box.x + 0.5 * box.width);
            let deltaY = (iconY) - (box.y + 0.45 * box.height);
            icon.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            icon.classList.add("instruction_element_nonbackground");

            this.textElemMainInstructions = icon;
            icon.style.display = "none";
            setTimeout(() => { icon.style.display = "inherit"; }, 200);
        } else if (hintType === "toy" || hintType === "toybox") {
            this.textElemMainInstructions = create_SVG_group(0, 0, undefined, undefined);
            this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

            let id = hintType === "toy" ? "toy_" + fenObj.toy : "toybox_" + fenObj.toybox;
            let elemIcon = copy_scale_and_move_object_to_position(document.getElementById(id), this.textElemMainInstructions, 0.5 * GenParam.SVG_width, 0.5 * GenParam.SVG_height, 4);
            if (hintType === "toy") set_toy_color_scheme(elemIcon, fenObj.toy, false);

            elemIcon.style.display = "none";
            elemIcon.classList.add("instruction_element_nonbackground");
            setTimeout(() => { elemIcon.style.display = "inherit"; }, 200);
        }

        if (fenObj.bonus_stars_earnable === true || fenObj.bonus_stars_earnable > 0) {
            let numBonusStars = fenObj.bonus_stars_earnable === true ? 1 : fenObj.bonus_stars_earnable;
            let bonusText = numBonusStars > 1 ? "You can earn up to " + numBonusStars + " stars!" : "You can earn a bonus star";

            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
            let bonusTextElem = create_SVG_text_in_foreign_element(bonusText, -0.175 * GenParam.SVG_width, 0.29 * GenParam.SVG_height, 0.5 * GenParam.SVG_width, 0.1 * GenParam.SVG_height, "questionbar_bonustext");
            bonusTextElem.style.fontSize = "40px";
            bonusTextElem.style.textAlign = "center";
            bonusTextElem.classList.add("instruction_element_nonbackground");
            this.textElemMainInstructions.appendChild(bonusTextElem);

            continueButtonTime = numBonusStars * 500;
        } else {
            document.getElementsByClassName("instructions_element_background")[0].style.fill = "";
        }

        this.openInstructionsPage();
    }

    initializeOnCallPhaseGeneralInstructions(currentBlockNum, fennefinderStatus) {
        this.currentInstructionType = "on_call";

        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";

        // 1. Setup Title and Progress Bar
        document.getElementById("Instructions_Title").innerHTML = `Day ${currentBlockNum}: you're on-call to take care of the Fennimals.`;
        this.updateProgressNewDay(currentBlockNum);
        this.updateProgressWithinDay(false); // Hide the inner progress bar for the intro

        // 2. Dynamic Text Generation
        let partnerRole = this.worldState.get_current_partner_role();
        let partnerPresent = partnerRole && partnerRole !== "absent";
        let partnerName = this.worldState.get_partner_icon_settings().name;

        let baseText = "";
        if (partnerPresent) {
            baseText = `You and ${partnerName} are on-call to take care of the Fennimals today! <br><br> Whenever a Fennimal needs some help, an automated signal will be broadcasted to the phone booth in the center of the island. Your task is to pick up the phone to see which Fennimal requires assistance. You and ${partnerName} should then go to find that Fennimal on the map to figure out what's wrong.<br><br>`;
        } else {
            baseText = `You are on-call to take care of the Fennimals. Whenever a Fennimal needs some help, an automated signal will be broadcasted to the phone booth in the center of the island. Your task is to pick up the phone to see which Fennimal requires assistance. You should then go to find that Fennimal on the map to figure out what's wrong.<br><br>`;
        }

        let fennefinderText = "";
        if (fennefinderStatus === true) {
            fennefinderText = "The Fennefinder on the bottom-right of the screen will help guide you to the Fennimal in need.";
        } else if (fennefinderStatus === "low_power_mode") {
            fennefinderText = "Unfortunately, the Fennefinder has run out of battery - so you'll have to find all Fennimals by memory!";
        }

        // 3. Build the Left-Side Text Box
        let instructionText = baseText + fennefinderText;
        this.textElemMainInstructions = create_SVG_text_in_foreign_element(
            instructionText,
            100, 200, // X, Y
            (0.65 * GenParam.SVG_width - 150), // Width (Takes up the left half)
            600, // Height
            "instruction_element_text"
        );
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

        // 4. Build the Right-Side Visual (Clone the Phone Booth!)
        let boothContainer = create_SVG_group(0, 0);
        this.currentInstructionsSVG.appendChild(boothContainer);

        // Clone the Base
        let baseClone = document.getElementById("phone_booth").cloneNode(true);
        baseClone.removeAttribute("id"); // Prevent ID conflicts with the real map
        boothContainer.appendChild(baseClone);

        // Clone the Top/Antenna
        let topClone = document.getElementById("phone_booth_top");
        if (topClone) {
            let tc = topClone.cloneNode(true);
            tc.removeAttribute("id");
            boothContainer.appendChild(tc);
        }

        boothContainer.classList.add("instruction_element_nonbackground");

        // Strip any active animation classes so it looks clean and static in the instructions
        let animatedElements = boothContainer.querySelectorAll(".ringing_police_light, .ringing_antenna_tip, .scanning_antenna");
        animatedElements.forEach(el => el.classList.remove("ringing_police_light", "ringing_antenna_tip", "scanning_antenna"));

        // Mathematically center the booth on the right half of the screen
        setTimeout(() => {
            let box = boothContainer.getBBox();
            let scaleFactor = 4.5;

            let deltaX = (0.8 * GenParam.SVG_width) - (box.x + 0.5 * box.width);
            let deltaY = (0.5 * GenParam.SVG_height) - (box.y + 0.5 * box.height);

            boothContainer.style.transformOrigin = `${box.x + 0.5 * box.width}px ${box.y + 0.5 * box.height}px`;
            boothContainer.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleFactor})`;
        }, 10);

        // 5. Add the Standard "Continue" button
        this.addClosingButtonToParent("bottom-center", false, undefined, 500);
    }

    initializePhoneRoomPhaseGeneralInstructions(currentBlockNum) {
        this.currentInstructionType = "phone_room";

        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";

        document.getElementById("Instructions_Title").innerHTML = `Day ${currentBlockNum}: staffing the phone room`;
        this.updateProgressNewDay(currentBlockNum);
        this.updateProgressWithinDay(false);

        let partnerRole = this.worldState.get_current_partner_role();
        let partnerPresent = partnerRole && partnerRole !== "absent";
        let partnerName = this.worldState.get_partner_icon_settings().name;

        let instructionText;
        if (partnerPresent) {
            instructionText =
                `You and ${partnerName} will be staffing the island’s phone room today!<br><br>` +
                `Whenever someone on the island needs assistance, the phone will ring. Click the phone to answer it and receive instructions about the task and where you need to go.<br><br>` +
                `During this part of your stay on the island, your route will be arranged for you. You and ${partnerName} will travel automatically to each destination, so you do not need to navigate the map yourself.<br><br>` +
                `After each task, you will automatically return to the phone room. Wait there until the phone rings again.`;
        } else {
            instructionText =
                `Today, you will be staffing the island’s phone room.<br><br>` +
                `Whenever someone on the island needs assistance, the phone will ring. Click the phone to answer it and receive instructions about the task and where you need to go.<br><br>` +
                `During this part of your stay on the island, your route will be arranged for you. You will travel automatically to each destination, so you do not need to navigate the map yourself.<br><br>` +
                `After each task, you will automatically return to the phone room. Wait there until the phone rings again.`;
        }

        let iconBox = create_SVG_rect(0.08 * GenParam.SVG_width, 0.25 * GenParam.SVG_height, 400, 475, undefined, undefined);
        iconBox.style.rx = "30";
        iconBox.style.fill = "transparent";
        this.currentInstructionsSVG.appendChild(iconBox);

        let phoneTemplate = document.getElementById("phone");
        if (phoneTemplate) {
            let phoneCenterX = iconBox.getBBox().x + 0.5 * iconBox.getBBox().width;
            let phoneCenterY = iconBox.getBBox().y + 0.5 * iconBox.getBBox().height;
            let phoneVisual = copy_scale_and_move_object_to_position(
                phoneTemplate,
                this.currentInstructionsSVG,
                phoneCenterX,
                phoneCenterY,
                3.5
            );
            phoneVisual.classList.add("instruction_element_nonbackground");
            phoneVisual.style.pointerEvents = "none";
        }

        this.textElemMainInstructions = create_SVG_text_in_foreign_element(
            instructionText,
            0.35 * GenParam.SVG_width, 230,
            0.55 * GenParam.SVG_width,
            600,
            "instruction_element_text"
        );
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "38px";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

        this.addClosingButtonToParent("bottom-center", false, undefined, 500);
    }

    initializePartnerBeliefInstructions(partnerName, partnerPresent, bonusStarsPerCorrectAnswer, numQuestions, currentBlockNum) {
        this.currentInstructionType = "partner_belief";
        let canEarnStars = bonusStarsPerCorrectAnswer > 0;
        let continueButtonTime = 500;

        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";

        // Set the Title
        document.getElementById("Instructions_Title").innerHTML = `Day ${currentBlockNum}: What does ${partnerName} think?`;

        // 1. Draw Partner Icon on the Left
        let iconBox = create_SVG_rect(0.08 * GenParam.SVG_width, 0.25 * GenParam.SVG_height, 400, 475, undefined, undefined);
        iconBox.style.rx = "30";
        // FIX: Made the box completely transparent (was "#FFFFFF99")
        iconBox.style.fill = "transparent";
        this.currentInstructionsSVG.appendChild(iconBox);

        let iconSVG = this.worldState.get_person_icon("partner", "front");
        iconSVG.style.transform = "scale(15)";
        let iconTranslateGroup = create_SVG_group(0, 0, undefined, undefined);
        iconTranslateGroup.appendChild(iconSVG);
        this.currentInstructionsSVG.appendChild(iconTranslateGroup);
        moveSVGCenterTo(iconTranslateGroup, iconBox.getBBox().x + 0.5 * iconBox.getBBox().width, iconBox.getBBox().y + 0.5 * iconBox.getBBox().height);

        // 2. Build the Instruction Text on the Right
        // FIX: Moved the text block up (was 200)
        let textY = 120;
        let textH = 750;
        let instructionText = `${partnerName} has returned to the warehouse! But remember, they were away attending during the last few days! <br><br>` +
            `Now, we want to test your memory of the events. We will point to the different boxes on the table and ask you a specific question:<br><br>` +
            `<div style='text-align:center; font-size:45px; font-weight:bold; color:navy;'>What toy does ${partnerName} believe is inside the box?</div><br>` +
            `Please think carefully! Do <b>not</b> tell us what is <i>actually</i> in the box, but rather what <i>${partnerName}</i> thinks is inside based on what they saw before they left.`;

        // 3. Handle the Bonus Stars Visuals
        let canEarnStarsText = "";
        if (canEarnStars) {
            continueButtonTime += bonusStarsPerCorrectAnswer * 500;
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;

            const dx = 0.08 * GenParam.SVG_width;
            const center = 0.625 * GenParam.SVG_width;
            const allXPos = {
                1: [center],
                2: [center - 0.5 * dx, center + 0.5 * dx],
                3: [center - dx, center, center + dx],
                4: [center - 1.5 * dx, center - 0.5 * dx, center + 0.5 * dx, center + 1.5 * dx],
                5: [center - 2 * dx, center - dx, center, center + dx, center + 2 * dx],
            };
            const starPos = allXPos[bonusStarsPerCorrectAnswer] || [center];

            for (let i = 0; i < bonusStarsPerCorrectAnswer; i++) {
                setTimeout(() => {
                    // FIX: Moved the stars down slightly to 0.78 (was 0.72) to clear the text
                    showBonusStarOnScreen(this.parentElem, starPos[i], 0.58 * GenParam.SVG_height, true, "deletable_bonus_star", 1, undefined);
                }, (i + 1) * 300);
            }

            let numText = bonusStarsPerCorrectAnswer > 1 ? bonusStarsPerCorrectAnswer + " bonus stars" : "a bonus star";
            canEarnStarsText = `<br><br><br><br><br><br><b> Please answer carefully, as you will earn ${numText} for each question you correctly answer! </b>`;
        }

        instructionText += canEarnStarsText;

        // Render the text box
        this.textElemMainInstructions = create_SVG_text_in_foreign_element(
            instructionText,
            0.35 * GenParam.SVG_width, textY, // X, Y
            0.55 * GenParam.SVG_width, // Width
            textH, // Height
            "instruction_element_text"
        );
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "38px";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

        this.updateProgressNewDay(currentBlockNum);
        this.updateProgressWithinDay(false);

        // 4. Add Continue Button
        const deleteBonusStarIcons = () => {
            Array.from(document.getElementsByClassName("deletable_bonus_star")).forEach(s => s.remove());
        };
        this.addClosingButtonToParent("bottom-center", false, deleteBonusStarIcons, continueButtonTime);
    }

    initializePartnerBeliefIndividualBoxesInstructions(partnerName, bonusStarsPerCorrectAnswer, numQuestions, numBeliefBlocks, includePracticeTrial, includeRealityBlockAtEnd, currentBlockNum) {
        this.currentInstructionType = "partner_belief_individual_boxes";
        let canEarnStars = bonusStarsPerCorrectAnswer > 0;
        let continueButtonTime = 500;

        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";

        document.getElementById("Instructions_Title").innerHTML = `Day ${currentBlockNum}: What does ${partnerName} think?`;

        // Partner icon on the left, raised to leave room for bonus stars underneath.
        let iconBox = create_SVG_rect(0.08 * GenParam.SVG_width, 0.12 * GenParam.SVG_height, 400, 400, undefined, undefined);
        iconBox.style.rx = "30";
        iconBox.style.fill = "transparent";
        this.currentInstructionsSVG.appendChild(iconBox);

        let iconSVG = this.worldState.get_person_icon("partner", "front");
        iconSVG.style.transform = "scale(15)";
        let iconTranslateGroup = create_SVG_group(0, 0, undefined, undefined);
        iconTranslateGroup.appendChild(iconSVG);
        this.currentInstructionsSVG.appendChild(iconTranslateGroup);
        moveSVGCenterTo(iconTranslateGroup, iconBox.getBBox().x + 0.5 * iconBox.getBBox().width, iconBox.getBBox().y + 0.5 * iconBox.getBBox().height);

        let practiceLine = includePracticeTrial
            ? `First, you will complete a short practice with simple shapes and colors so you can learn the controls.<br><br>`
            : "";

        let realityLine = includeRealityBlockAtEnd
            ? `<br><br>Later, you will also be asked which toy is <i>currently</i> inside each box.`
            : "";

        let instructionText =
            `${partnerName} has returned to the warehouse! We will now test what you think ${partnerName} believes is inside each box.<br><br>` +
            practiceLine +
            `On each question, click the highlighted circle to reveal the answer choices. Between box questions, you will also answer a few simple shape or color questions.<br><br>` +
            `<div style='text-align:center; font-size:42px; font-weight:bold; color:navy;'>Please answer as quickly and accurately as you can.</div><br>` +
            `Remember: when asked about ${partnerName}, tell us what <i>${partnerName}</i> believes is inside — not necessarily what is actually inside.` +
            realityLine;

        if (canEarnStars) {
            continueButtonTime += bonusStarsPerCorrectAnswer * 500;
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;

            let leftCenterX = iconBox.getBBox().x + 0.5 * iconBox.getBBox().width;
            let starY = iconBox.getBBox().y + iconBox.getBBox().height + 140;
            let starSpacing = 70;
            let starStartX = leftCenterX - 0.5 * (bonusStarsPerCorrectAnswer - 1) * starSpacing;

            for (let i = 0; i < bonusStarsPerCorrectAnswer; i++) {
                let starX = starStartX + i * starSpacing;
                setTimeout(() => {
                    showBonusStarOnScreen(this.parentElem, starX, starY, true, "deletable_bonus_star", 1, undefined);
                }, (i + 1) * 300);
            }

            let perAnswerLabel = create_SVG_text_elem(
                leftCenterX,
                starY + 95,
                "(per answer!)",
                "pb_indiv_star_caption",
                undefined
            );
            perAnswerLabel.style.textAnchor = "middle";
            perAnswerLabel.style.fontSize = "32px";
            perAnswerLabel.style.fontWeight = 700;
            perAnswerLabel.style.fill = "navy";
            perAnswerLabel.classList.add("instruction_element_nonbackground");
            this.currentInstructionsSVG.appendChild(perAnswerLabel);

            let numText = bonusStarsPerCorrectAnswer > 1 ? bonusStarsPerCorrectAnswer + " bonus stars" : "a bonus star";
            instructionText += `<br><br><b>You can earn ${numText} for each correct answer.</b> You will only learn how many you earned at the end of the experiment.`;
        }

        this.textElemMainInstructions = create_SVG_text_in_foreign_element(
            instructionText,
            0.35 * GenParam.SVG_width, 140,
            0.55 * GenParam.SVG_width,
            720,
            "instruction_element_text"
        );
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "34px";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

        this.updateProgressNewDay(currentBlockNum);
        this.updateProgressWithinDay(false);

        const deleteBonusStarIcons = () => {
            Array.from(document.getElementsByClassName("deletable_bonus_star")).forEach(s => s.remove());
        };
        this.addClosingButtonToParent("bottom-center", false, deleteBonusStarIcons, continueButtonTime);
    }

    setup_on_call_trial_elements(fenObj) {
        // TODO: When on_call supports Fennimal_toy / toy_to_box (and other new
        // interaction types), branch trial hint visuals/copy by fenObj.interaction_type
        // similar to getPhoneRoomHintConfig() / createPhoneRoomHintVisual().
        this.clearInstructions();

        // 1. Initialize AND append the native background and containers
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);

        this.updateProgressNewDay(this.expCont.currentDayNum);
        this.updateProgressWithinDay((this.expCont.currentInteractionNumInPhase / this.expCont.currentPhaseData.number_interactions_in_phase) * 100);

        // Temporarily unhide the parent so SVG math works
        this.parentElem.style.display = "inherit";
        document.getElementById("Instructions_Title").innerHTML = "Emergency Call!";

        // 2. Generate the Hint Icon
        let icon = create_Fennimal_SVG_object(fenObj, GenParam.Fennimal_head_size, false);
        this.currentInstructionsSVG.appendChild(icon);

        moveSVGCenterTo(icon, GenParam.SVG_width / 2, GenParam.SVG_height / 2 - 60);

        // --- THE NATIVE SLUMPED EFFECT ---
        let head = icon.getElementsByClassName("Fennimal_head")[0];
        let body = icon.getElementsByClassName("Fennimal_body")[0];
        if (head) {
            head.style.transformBox = "fill-box";
            head.style.transformOrigin = "center";
        }
        if (body) {
            body.style.transformBox = "fill-box";
            body.style.transformOrigin = "50% 100%";
        }

        icon.classList.add("is-slumped");
        icon.classList.add("instruction_element_nonbackground");
        icon.style.display = "none";

        // --- ADD THE RAINCLOUDS ---
        let cloudGroup = create_SVG_group(0, 0);
        this.currentInstructionsSVG.appendChild(cloudGroup);
        cloudGroup.classList.add("instruction_element_nonbackground");
        cloudGroup.style.display = "none";

        // Anchor the cloud group to the exact same origin as the Fennimal!
        cloudGroup.style.transform = `translate(${GenParam.SVG_width / 2}px, ${(GenParam.SVG_height / 2) - 60}px)`;

        // Using your refined 'dy' vertical placements!
        const cloudConfigs = [
            { dx: -90, dy: -280, scale: 1.7, delay: 0 },
            { dx: -180, dy: -265, scale: 1.3, delay: -400 },
            { dx: 0, dy: -250, scale: 1.4, delay: -800 }
        ];

        cloudConfigs.forEach(config => {
            let cloud = document.getElementsByClassName("raincloud")[0].cloneNode(true);
            cloud.style.display = "inherit";
            cloud.style.opacity = "0.7";
            cloud.style.transformOrigin = "center";
            cloud.style.transformBox = "fill-box";

            // Append first so getBBox() can calculate the geometry
            cloudGroup.appendChild(cloud);

            // THE FIX: Calculate the native offset and subtract it to find "True Zero"!
            let box = cloud.getBBox();
            let nativeCX = box.x + (box.width / 2);
            let nativeCY = box.y + (box.height / 2);

            let trueDx = config.dx - nativeCX;
            let trueDy = config.dy - nativeCY;

            cloud.style.transform = `translate(${trueDx}px, ${trueDy}px) scale(0)`;

            setTimeout(() => {
                cloud.style.transition = "transform 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)";
                cloud.style.transform = `translate(${trueDx}px, ${trueDy}px) scale(${config.scale})`;
            }, 260);

            let targets = Array.from(cloud.querySelectorAll('path, rect, circle, ellipse, polygon'));
            if (cloud.tagName.toLowerCase() !== 'g') targets.push(cloud);

            targets.forEach(t => {
                t.animate([
                    { fill: '#5a6b7c' },
                    { fill: '#3d4a57' },
                    { fill: '#738699' },
                    { fill: '#4a5a6a' }
                ], {
                    duration: 1500 + Math.random() * 500,
                    iterations: Infinity,
                    direction: 'alternate',
                    delay: config.delay
                });
            });

            // Use trueDx and trueDy for the animation loop as well!
            cloud.animate([
                { transform: `translate(${trueDx}px, ${trueDy}px) scale(${config.scale})` },
                { transform: `translate(${trueDx}px, ${trueDy - 8}px) scale(${config.scale})` }
            ], {
                duration: 1200 + Math.random() * 300,
                iterations: Infinity,
                direction: 'alternate',
                easing: 'ease-in-out',
                delay: config.delay
            });
        });

        // 3. Build the native text hierarchy
        let displayName = fenObj.name || fenObj.id;

        let text1 = create_SVG_text_elem(GenParam.SVG_width / 2, GenParam.SVG_height / 2 + 230, `${displayName} is feeling down!`);
        text1.style.fill = "#2c3e50";
        text1.style.fontWeight = "bold";
        text1.style.fontSize = "55px";
        text1.style.textAnchor = "middle";
        text1.classList.add("instruction_element_nonbackground");
        text1.style.display = "none";

        let text2 = create_SVG_text_elem(GenParam.SVG_width / 2, GenParam.SVG_height / 2 + 310, `Go investigate what is wrong at the ${GenParam.get_display_name_of_location(fenObj.location)}`);
        text2.style.fill = "#555555";
        text2.style.fontSize = "40px";
        text2.style.textAnchor = "middle";
        text2.classList.add("instruction_element_nonbackground");
        text2.style.display = "none";

        let text3 = create_SVG_text_elem(GenParam.SVG_width / 2, GenParam.SVG_height / 2 + 360, `in the ${GenParam.RegionData[fenObj.region].display_name}.`);
        text3.style.fill = "#555555";
        text3.style.fontSize = "40px";
        text3.style.textAnchor = "middle";
        text3.classList.add("instruction_element_nonbackground");
        text3.style.display = "none";

        this.currentInstructionsSVG.appendChild(text1);
        this.currentInstructionsSVG.appendChild(text2);
        this.currentInstructionsSVG.appendChild(text3);

        this.parentElem.style.display = "none";
    }

    show_on_call_hint() {
        // --- THE FIX FOR BUG 2: This must match your switch statement exactly! ---
        this.currentInstructionType = "on_call";

        AudioCont.play_sound_effect("alert_minimal");

        // Trigger your native scale-up animation from the origin!
        this.openInstructionsPage();
    }

    setupPhoneRoomHintElements(trialObj) {
        this.clearInstructions();

        this.currentInstructionType = "phone_room";
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);

        this.parentElem.style.display = "inherit";

        this.updateProgressNewDay(this.expCont.currentDayNum);
        this.updateProgressWithinDay(
            ((this.expCont.currentTrialNumInDay - 1) / this.expCont.currentPhaseData.number_interactions_in_phase) * 100
        );

        let hintConfig = this.getPhoneRoomHintConfig(trialObj);

        document.getElementById("Instructions_Title").innerHTML = hintConfig.title;

        this.phoneRoomHintSequentialElements = [];
        this.createPhoneRoomHintVisual(hintConfig);
        this.createPhoneRoomHintText(hintConfig);

        this.parentElem.style.display = "none";
    }

    getPhoneRoomHintConfig(trialObj) {
        let displayName = trialObj.name || trialObj.id || "this Fennimal";
        let locationName = GenParam.get_display_name_of_location(trialObj.location);
        let regionName = GenParam.RegionData[trialObj.region]
            ? GenParam.RegionData[trialObj.region].display_name
            : trialObj.region;

        let baseConfig = {
            title: "Incoming call!",
            locationText: `Go to ${locationName}`,
            regionText: `in ${regionName}.`,
            instructionText: "Close this message to travel there.",
            trialObj: trialObj
        };

        // Phone-room hints are interaction-type aware.
        // TODO: Mirror this interaction-type branching in on_call and hint_and_search
        // trial instruction setup when those block types gain support for
        // Fennimal_toy / toy_to_box / photo_box / photo_Fennimal / check_box_contents / feed_Fennimal.
        switch (trialObj.interaction_type) {
            case "Fennimal_toy":
            case "basic_intro":
                return {
                    ...baseConfig,
                    type: "fennimal",
                    slumped: false,
                    mainText: `${displayName} is bored and wants to play.`
                };

            case "toy_to_box":
                return {
                    ...baseConfig,
                    type: "toy",
                    mainText: `Oops! The ${trialObj.toy} has been left behind`
                };

            case "photo_box":
                return {
                    ...baseConfig,
                    type: "box",
                    mainText: "Go take a photo of the box to check if its still in good shape"
                };

            case "scan_box_inventory":
                return {
                    ...baseConfig,
                    type: "box",
                    mainText: `${GenParam.get_box_printed_name(trialObj.toybox)} needs to be inventoried`,
                    locationText: "We're heading to the warehouse",
                    regionText: "at Home.",
                    instructionText: "Close this message to continue."
                };

            case "photo_Fennimal":
                return {
                    ...baseConfig,
                    type: "fennimal",
                    slumped: false,
                    mainText: `Please take a photo of ${displayName}`
                };

            case "check_box_contents":
                return {
                    ...baseConfig,
                    type: "box",
                    mainText: "Check what's inside the box"
                };

            case "feed_Fennimal":
                return {
                    ...baseConfig,
                    type: "fennimal",
                    slumped: true,
                    mainText: `${displayName} is hungry.`
                };

            case "joint_box_cleaning":
                return {
                    ...baseConfig,
                    type: "box",
                    mainText: `${displayName}'s box needs a good clean!`
                };

            case "joint_box_decoration":
                return {
                    ...baseConfig,
                    type: "box",
                    mainText: `${displayName} wants to decorate their box!`
                };

            case "box_room":
                return {
                    ...baseConfig,
                    type: "boxes",
                    mainText: "Lets store the toys in a safe space",
                    locationText: "We're heading to the warehouse",
                    regionText: "at Home.",
                    instructionText: "Close this message to continue."
                };

            default:
                // Placeholder for other interaction types (broken_toy_in_box, broken_toy_no_box, dirty_toy, fly_swat, etc.).
                // Keep the slumped Fennimal until type-specific copy/visuals are written.
                return {
                    ...baseConfig,
                    type: "fennimal",
                    slumped: true,
                    mainText: `${displayName} needs your help!`
                };
        }
    }

    createPhoneRoomHintVisual(hintConfig) {
        switch (hintConfig.type) {
            case "fennimal":
                this.createPhoneRoomFennimalHintVisual(hintConfig.trialObj, hintConfig.slumped === true);
                break;
            case "toy":
                this.createPhoneRoomToyHintVisual(hintConfig.trialObj);
                break;
            case "box":
                this.createPhoneRoomBoxHintVisual(hintConfig.trialObj);
                break;
            case "boxes":
                this.createPhoneRoomMultiBoxHintVisual(hintConfig.trialObj);
                break;
            default:
                this.createPhoneRoomPlaceholderHintVisual(hintConfig);
                break;
        }
    }

    createPhoneRoomFennimalHintVisual(trialObj, slumped = false) {
        let icon = create_Fennimal_SVG_object(trialObj, GenParam.Fennimal_head_size, false);
        this.currentInstructionsSVG.appendChild(icon);

        moveSVGCenterTo(icon, GenParam.SVG_width / 2, GenParam.SVG_height / 2 - 170);

        let head = icon.getElementsByClassName("Fennimal_head")[0];
        let body = icon.getElementsByClassName("Fennimal_body")[0];

        if (head) {
            head.style.transformBox = "fill-box";
            head.style.transformOrigin = "center";
        }

        if (body) {
            body.style.transformBox = "fill-box";
            body.style.transformOrigin = "50% 100%";
        }

        if (slumped) {
            icon.classList.add("is-slumped");
        }

        icon.classList.add("instruction_element_nonbackground");
        icon.classList.add("phone_room_hint_sequential");
        icon.style.display = "none";
        icon.style.opacity = 0;

        this.phoneRoomHintSequentialElements.push(icon);

        if (slumped && GenParam.PhoneRoomFlair.showHintRainclouds) {
            this.createPhoneRoomHintRainclouds();
        }
    }

    createPhoneRoomToyHintVisual(trialObj) {
        let toyTemplate = document.getElementById("toy_" + trialObj.toy);
        if (!toyTemplate) {
            this.createPhoneRoomPlaceholderHintVisual({ type: "toy" });
            return;
        }

        let toyIcon = copy_scale_and_move_object_to_position(
            toyTemplate,
            this.currentInstructionsSVG,
            GenParam.SVG_width / 2,
            GenParam.SVG_height / 2 - 170,
            4
        );
        set_toy_color_scheme(toyIcon, trialObj.toy, false);
        this.makePhoneRoomToyStatic(toyIcon, trialObj.toy);
        toyIcon.classList.add("instruction_element_nonbackground");
        toyIcon.classList.add("phone_room_hint_sequential");
        toyIcon.style.display = "none";
        toyIcon.style.opacity = 0;

        this.phoneRoomHintSequentialElements.push(toyIcon);
    }

    createPhoneRoomBoxHintVisual(trialObj) {
        let boxTemplate = document.getElementById("toybox_" + trialObj.toybox);
        if (!boxTemplate) {
            this.createPhoneRoomPlaceholderHintVisual({ type: "box" });
            return;
        }

        let boxIcon = copy_scale_and_move_object_to_position(
            boxTemplate,
            this.currentInstructionsSVG,
            GenParam.SVG_width / 2,
            GenParam.SVG_height / 2 - 170,
            3
        );
        apply_toybox_decoration_visibility_to_element(boxIcon, trialObj.toybox);

        // Closed box: keep back + front + lid (front is the visible body).
        boxIcon.classList.add("instruction_element_nonbackground");
        boxIcon.classList.add("phone_room_hint_sequential");
        boxIcon.style.display = "none";
        boxIcon.style.opacity = 0;

        this.phoneRoomHintSequentialElements.push(boxIcon);
    }

    // box_room: show every toybox in the trial side-by-side.
    createPhoneRoomMultiBoxHintVisual(trialObj) {
        let fens = (Array.isArray(trialObj.box_room_fennimals) && trialObj.box_room_fennimals.length > 0)
            ? trialObj.box_room_fennimals
            : [trialObj];

        let group = create_SVG_group(0, 0, "instruction_element_nonbackground", undefined);
        group.classList.add("phone_room_hint_sequential");
        group.style.display = "none";
        group.style.opacity = 0;
        this.currentInstructionsSVG.appendChild(group);

        let n = fens.length;
        let scale = n >= 3 ? 2.3 : 2.7;
        let spacing = n >= 3 ? 320 : 380;
        let centerX = GenParam.SVG_width / 2;
        let centerY = GenParam.SVG_height / 2 - 170;
        let startX = centerX - ((n - 1) * spacing) / 2;

        fens.forEach((fen, i) => {
            if (!fen || !fen.toybox) return;
            let boxTemplate = document.getElementById("toybox_" + fen.toybox);
            if (!boxTemplate) return;

            let boxIcon = copy_scale_and_move_object_to_position(
                boxTemplate,
                group,
                startX + i * spacing,
                centerY,
                scale
            );
            apply_toybox_decoration_visibility_to_element(boxIcon, fen.toybox);
        });

        if (group.childNodes.length === 0) {
            group.remove();
            this.createPhoneRoomPlaceholderHintVisual({ type: "box" });
            return;
        }

        this.phoneRoomHintSequentialElements.push(group);
    }

    makePhoneRoomToyStatic(toyIcon, toyId) {
        // Mirrors ToyChoiceBar.make_toy_static() / PartnerBeliefMultipleController so this hint
        // shows the same inert, display-only version of each toy.
        toyIcon.querySelectorAll(".prep_element_hidden, .invisible_element").forEach((element) => {
            element.style.display = "none";
        });

        switch (toyId) {
            case "plane": {
                let propBase = toyIcon.querySelector(".prop_base");
                let propAlt = toyIcon.querySelector(".prop_alt");
                let propSpinning = toyIcon.querySelector(".prop_spinning");
                if (propBase) {
                    propBase.style.display = "inherit";
                    propBase.style.opacity = 1;
                }
                if (propAlt) propAlt.style.display = "none";
                if (propSpinning) propSpinning.style.display = "none";
                break;
            }

            case "globe":
                toyIcon.querySelectorAll(".arc").forEach((arc) => {
                    arc.style.display = "none";
                });
                toyIcon.querySelectorAll(".light_1, .light_2, .light_3, .light_4").forEach((light) => {
                    light.style.fill = "#555555";
                });
                break;

            case "robot": {
                toyIcon.querySelectorAll(".eye_light, .antenna").forEach((element) => {
                    element.style.fill = "#444444";
                });
                let switchOn = toyIcon.querySelector(".switch_toggle_on");
                let switchOff = toyIcon.querySelector(".switch_toggle_off");
                if (switchOn) switchOn.style.display = "none";
                if (switchOff) switchOff.style.opacity = 1;
                break;
            }

            case "bubblewand": {
                let soap = toyIcon.querySelector(".wand_soap");
                if (soap) soap.style.display = "none";
                break;
            }

            case "jack": {
                let crankDown = toyIcon.querySelector(".crank_down");
                let lidClosed = toyIcon.querySelector(".box_lid_closed");
                if (crankDown) crankDown.style.display = "none";
                if (lidClosed) lidClosed.style.display = "none";
                break;
            }
        }

        toyIcon.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    }

    createPhoneRoomHintRainclouds() {
        let cloudTemplate = document.getElementsByClassName("raincloud")[0];
        if (!cloudTemplate) return;

        let cloudGroup = create_SVG_group(0, 0, "instruction_element_nonbackground", undefined);
        cloudGroup.classList.add("phone_room_hint_sequential");
        cloudGroup.style.display = "none";
        cloudGroup.style.opacity = 0;
        cloudGroup.style.transform = `translate(${GenParam.SVG_width / 2}px, ${GenParam.SVG_height / 2 - 410}px)`;
        this.currentInstructionsSVG.appendChild(cloudGroup);

        const cloudConfigs = [
            { dx: -90, dy: -20, scale: 1.7, delay: 0 },
            { dx: -180, dy: -5, scale: 1.3, delay: -350 },
            { dx: 0, dy: 10, scale: 1.4, delay: -700 }
        ];

        cloudConfigs.forEach(config => {
            let cloud = cloudTemplate.cloneNode(true);
            cloud.style.display = "inherit";
            cloud.style.opacity = "0.72";
            cloud.style.transformOrigin = "center";
            cloud.style.transformBox = "fill-box";

            cloudGroup.appendChild(cloud);

            let box = cloud.getBBox();
            let nativeCX = box.x + (box.width / 2);
            let nativeCY = box.y + (box.height / 2);

            let trueDx = config.dx - nativeCX;
            let trueDy = config.dy - nativeCY;

            cloud.style.transform = `translate(${trueDx}px, ${trueDy}px) scale(${config.scale})`;

            cloud.animate([
                { transform: `translate(${trueDx}px, ${trueDy}px) scale(${config.scale})` },
                { transform: `translate(${trueDx}px, ${trueDy - 10}px) scale(${config.scale})` }
            ], {
                duration: 1200 + Math.random() * 250,
                iterations: Infinity,
                direction: "alternate",
                easing: "ease-in-out",
                delay: config.delay
            });
        });

        this.phoneRoomHintSequentialElements.push(cloudGroup);
    }

    createPhoneRoomPlaceholderHintVisual(hintConfig) {
        let placeholder = create_SVG_circle(
            GenParam.SVG_width / 2,
            GenParam.SVG_height / 2 - 170,
            120,
            undefined,
            undefined
        );
        placeholder.style.fill = "#DDDDDD";
        placeholder.style.stroke = "#555555";
        placeholder.style.strokeWidth = "8px";
        placeholder.classList.add("instruction_element_nonbackground");
        placeholder.style.display = "none";
        this.currentInstructionsSVG.appendChild(placeholder);

        let questionMark = create_SVG_text_elem(
            GenParam.SVG_width / 2,
            GenParam.SVG_height / 2 - 135,
            "?",
            undefined,
            undefined
        );
        questionMark.style.textAnchor = "middle";
        questionMark.style.fontSize = "150px";
        questionMark.style.fontWeight = 900;
        questionMark.style.fill = "#555555";
        questionMark.classList.add("instruction_element_nonbackground");
        questionMark.style.display = "none";
        this.currentInstructionsSVG.appendChild(questionMark);
    }

    createPhoneRoomHintText(hintConfig) {
        let titleText = create_SVG_text_elem(
            GenParam.SVG_width / 2,
            GenParam.SVG_height / 2 + 200,
            hintConfig.mainText,
            undefined,
            undefined
        );
        titleText.style.fill = "#2c3e50";
        titleText.style.fontWeight = "bold";
        titleText.style.fontSize = "55px";
        titleText.style.textAnchor = "middle";
        titleText.classList.add("instruction_element_nonbackground");
        titleText.classList.add("phone_room_hint_sequential");
        titleText.style.display = "none";
        titleText.style.opacity = 0;

        let locationText = create_SVG_text_elem(
            GenParam.SVG_width / 2,
            GenParam.SVG_height / 2 + 280,
            hintConfig.locationText,
            undefined,
            undefined
        );
        locationText.style.fill = "#555555";
        locationText.style.fontSize = "40px";
        locationText.style.textAnchor = "middle";
        locationText.classList.add("instruction_element_nonbackground");
        locationText.classList.add("phone_room_hint_sequential");
        locationText.style.display = "none";
        locationText.style.opacity = 0;

        let regionText = create_SVG_text_elem(
            GenParam.SVG_width / 2,
            GenParam.SVG_height / 2 + 335,
            hintConfig.regionText,
            undefined,
            undefined
        );
        regionText.style.fill = "#555555";
        regionText.style.fontSize = "40px";
        regionText.style.textAnchor = "middle";
        regionText.classList.add("instruction_element_nonbackground");
        regionText.classList.add("phone_room_hint_sequential");
        regionText.style.display = "none";
        regionText.style.opacity = 0;

        let instructionText = create_SVG_text_elem(
            GenParam.SVG_width / 2,
            GenParam.SVG_height / 2 + 410,
            hintConfig.instructionText,
            undefined,
            undefined
        );
        instructionText.style.fill = "#555555";
        instructionText.style.fontSize = "34px";
        instructionText.style.fontStyle = "italic";
        instructionText.style.textAnchor = "middle";
        instructionText.classList.add("instruction_element_nonbackground");
        instructionText.classList.add("phone_room_hint_sequential");
        instructionText.style.display = "none";
        instructionText.style.opacity = 0;

        this.currentInstructionsSVG.appendChild(titleText);
        this.currentInstructionsSVG.appendChild(locationText);
        this.currentInstructionsSVG.appendChild(regionText);
        this.currentInstructionsSVG.appendChild(instructionText);

        this.phoneRoomHintSequentialElements.push(titleText, locationText, regionText, instructionText);
    }

    showPhoneRoomHint() {
        this.currentInstructionType = "phone_room";
        AudioCont.play_sound_effect("alert_minimal");
        this.openInstructionsPage();

        if (GenParam.PhoneRoomFlair.sequentialHintText) {
            setTimeout(() => this.animatePhoneRoomHintSequentialElements(), 320);
        }
    }

    animatePhoneRoomHintSequentialElements() {
        if (!this.phoneRoomHintSequentialElements) return;

        this.phoneRoomHintSequentialElements.forEach((element, index) => {
            setTimeout(() => {
                if (!element || !element.parentNode) return;

                element.style.display = "inherit";
                element.style.transition = "opacity 300ms ease-in-out";
                element.style.opacity = 1;
            }, index * 160);
        });
    }

    startNameRecallTask(currentBlockNum, bonusStarsPerCorrectAnswer) {
        this.currentInstructionType = "name_recall_task";
        let canEarnStars = bonusStarsPerCorrectAnswer > 0;
        let bonusStart = canEarnStars ? "Today you can earn some bonus stars! " : "";
        let bonusText = canEarnStars ? (bonusStarsPerCorrectAnswer === 1 ? "You will earn one star for each name you correctly enter!" : `You will earn ${bonusStarsPerCorrectAnswer} stars for each name you correctly enter!`) : "";

        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";
        this.currentInstructionsSVG.getElementsByClassName("instructions_element_cover")[0].style.opacity = 1;

        let rbc = new RecallBoxController(this.currentInstructionsSVG, 1700, 400, false, true, "I do not remember any names", (recalledNames) => this.nameRecallTaskComplete(recalledNames));
        rbc.translateElements(100, 420);

        if (canEarnStars) {
            document.getElementById("Instructions_Title").innerHTML = "Day " + currentBlockNum + ": which Fennimals do you remember? (BONUS STAR DAY)";
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
            document.getElementsByClassName("instructions_element_cover")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
        } else {
            document.getElementById("Instructions_Title").innerHTML = "Day " + currentBlockNum + ": which Fennimals do you remember?";
        }
        document.getElementById("Instructions_Title").style.transform = "translate(0px, -50px)";

        let instructionText = bonusStart + "Please write down all the names of the different Fennimals which you can remember. " + bonusText + "<br><br> " +
            "<i>You can enter a name by typing in the box and clicking on the 'Add' button. Your previous answers will be blurred, but if you made a mistake you can click on <span style='color:firebrick'> [x] </span> to remove an answer. If you have listed all the names you remember, then you can click on the 'Done' button to continue (you will not be able to return after pressing the button!) <br>";

        this.textElemMainInstructions = create_SVG_text_in_foreign_element(instructionText, 100, 50, (1920 - 2 * 100), 350, "instruction_element_text");
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "35px";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

        this.updateProgressNewDay(currentBlockNum);
        this.updateProgressWithinDay(false);
    }

    nameRecallTaskComplete(recalledNames) {
        this.clearInstructions();
        this.expCont.recalledNamesTaskComplete(recalledNames); // CamelCased Hook
    }

    initializeJumpToTrialInstructions(interactionType, currentBlockNum, numBonusStarsPerQuestion, fennefinderStatus, fennimalsInPhaseArray) {
        let closeButtonPos = "bottom-center";
        this.currentInstructionType = "hint_and_search";
        let continueButtonTime = 500;

        if (numBonusStarsPerQuestion === true) numBonusStarsPerQuestion = 1;
        let canEarnStars = numBonusStarsPerQuestion > 0;

        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";

        document.getElementById("Instructions_Title").innerHTML = "Day " + currentBlockNum + ": time to visit some Fennimals!";

        let canEarnStarsText = "", textY = 100, textH = 500;
        if (canEarnStars) {
            continueButtonTime += numBonusStarsPerQuestion * 500;
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
            let numText = numBonusStarsPerQuestion > 1 ? numBonusStarsPerQuestion + " bonus stars" : "a bonus star";
            canEarnStarsText = "<b> Please answer carefully, as you will earn " + numText + " for each question you correctly answer! </b><br><br><br><br><br>";
            textY = 100;
            textH = 700;
        }

        let instructionText = "To help speed things up, you will be driven across the island (you won't have to walk yourself). " +
            "You will interact with the Fennimals one at a time. " +
            "You will then be taken to the next Fennimal until you have visited all " + fennimalsInPhaseArray.length + " Fennimals.<br><br>" +
            canEarnStarsText;

        this.textElemMainInstructions = create_SVG_text_in_foreign_element(instructionText, 100, textY, (1920 - 2 * 100), textH, "instruction_element_text");
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

        this.updateProgressNewDay(currentBlockNum);
        this.addClosingButtonToParent(closeButtonPos, false, undefined, continueButtonTime);
    }

    startFennimalAttributeSortingTask(phaseNum, taskData, attributesArr, maxEarnableStars, presentation) {
        this.currentInstructionType = "match_head_to_region";
        let presentationMode = (presentation === "single") ? "single" : "multiple";

        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";
        document.getElementById("Instructions_Title").innerHTML = "Day " + phaseNum + " : do you remember the Fennimals you just encountered?";

        let taskInstruction;
        if (attributesArr.includes("name")) {
            taskInstruction = "First, you will be asked to write down the names of all " + taskData.length + " Fennimals you encountered yesterday. " +
                "Then a set of smaller boxes will appear on the top of the page, each containing a different piece of information. " +
                "Your task is to match each of these smaller boxes with the correct Fennimal.";
        } else if (presentationMode === "single") {
            taskInstruction = "On the next pages you will see a box labelled with the name of a Fennimal, one Fennimal at a time. " +
                "On the top of the page you will see smaller boxes, each containing a different piece of information. " +
                "Drag the correct piece of information onto that Fennimal's box. " +
                "When you have finished all questions for that Fennimal, you will move on to the next Fennimal until you have completed all of them.";
        } else {
            taskInstruction = "On the next page you will see " + taskData.length + " different boxes, each for a different Fennimal. " +
                "On the top of the page you will see a set of smaller boxes, each containing a different piece of information. " +
                "Your task is to match each of these smaller boxes with the correct Fennimal by dragging the smaller boxes to the correct larger box. " +
                "Once you have placed all smaller boxes they will be replaced with a different set of information until you have completed all questions. ";
        }

        // FIX: Reduced the number of <br> tags so the text doesn't push down into the stars
        let rewardInstruction = maxEarnableStars > 0 ? "<br><br><br><br><br><br><br><b>Please pay close attention while answering the questions. You will start the day with " + maxEarnableStars + " bonus stars - but you will lose one star for each mistake you make! </b>" : "";

        let instructionText = taskInstruction + rewardInstruction;

        // FIX: Reduced height from 0.6 to 0.5 to make room for the stars at the bottom
        this.textElemMainInstructions = create_SVG_text_in_foreign_element(instructionText, 0.1 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, 0.8 * GenParam.SVG_width, 0.66 * GenParam.SVG_height, "instruction_element_text");
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "40px";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

        this.updateProgressNewDay(phaseNum);
        this.updateProgressWithinDay(false);

        let continueButtonTime = 500;

        // FIX: Added the star animation logic
        if (maxEarnableStars > 0) {
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;

            continueButtonTime += maxEarnableStars * 500;
            const dx = 0.08 * GenParam.SVG_width;
            const center = 0.5 * GenParam.SVG_width;

            // Standard layout for anywhere up to 6 stars
            const allXPos = {
                1: [center],
                2: [center - 0.5 * dx, center + 0.5 * dx],
                3: [center - dx, center, center + dx],
                4: [center - 1.5 * dx, center - 0.5 * dx, center + 0.5 * dx, center + 1.5 * dx],
                5: [center - 2 * dx, center - dx, center, center + dx, center + 2 * dx],
                6: [center - 2.5 * dx, center - 1.5 * dx, center - 0.5 * dx, center + 0.5 * dx, center + 1.5 * dx, center + 2.5 * dx]
            };
            const starPos = allXPos[maxEarnableStars] || [center]; // Safe fallback

            for (let i = 0; i < maxEarnableStars; i++) {
                let posX = starPos[i] || center;
                setTimeout(() => {
                    showBonusStarOnScreen(this.parentElem, posX, 0.50 * GenParam.SVG_height, true, "deletable_bonus_star", 1, undefined);
                }, (i + 1) * 300);
            }
        }

        let continueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.85 * GenParam.SVG_height, 400, 75, "Continue", 40);
        this.currentInstructionsSVG.appendChild(continueButton);

        // FIX: Hide the continue button until the stars are done falling!
        continueButton.style.display = "none";
        setTimeout(() => {
            continueButton.style.display = "inherit";
        }, continueButtonTime);

        continueButton.onpointerdown = () => {
            // Clean up the stars when we leave
            Array.from(document.getElementsByClassName("deletable_bonus_star")).forEach(s => s.remove());
            this.executeFennimalAttributeSortingTask(phaseNum, taskData, attributesArr, maxEarnableStars, presentationMode);
            AudioCont.play_sound_effect("button_click");
        };
    }

    executeFennimalAttributeSortingTask(phaseNum, taskData, attributesArr, maxEarnableStars, presentation) {
        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";
        this.updateProgressNewDay(phaseNum);
        this.updateProgressWithinDay(0);

        if (maxEarnableStars > 0) {
            document.getElementsByClassName("instructions_element_background")[0].style.fill = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
        }

        createFennimalAttributeSortingTask(
            this.currentInstructionsSVG,
            document.getElementById("Instructions_Title"),
            taskData,
            attributesArr,
            maxEarnableStars,
            this,
            (data) => this.completedSortingTask(data),
            presentation
        );
    }

    completedSortingTask(data) {
        this.clearInstructions();
        this.expCont.sortingTaskCompleted(data); // CamelCased Hook
    }

    startCardSortingTask(currentBlockNum, specialSettings) {
        this.currentInstructionType = "card_sorting_task";
        this.clearInstructions();

        this.currentInstructionsSVG = create_SVG_group(0, 0, undefined, undefined);
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";

        new CARDSORTINGTASK(currentBlockNum, this.parentElem, this.stimuli, (data) => this.cardSortingTaskCompleted(data), specialSettings);
        let progressElem = this.createProgressElements();
        progressElem.setAttribute("y", 1025);
        progressElem.style.opacity = 0.5;
        this.parentElem.appendChild(progressElem);

        this.updateProgressNewDay(currentBlockNum);
        this.updateProgressWithinDay(false);
    }

    cardSortingTaskCompleted(data) {
        this.expCont.cardSortingTaskComplete(data); // CamelCased Hook
    }

    showPseudoDayInformationPage(informationType, title, text, optionalInformation) {
        if (text) text = text.replaceAll("%PARTNERNAME%", this.worldState.get_partner_icon_settings().name);

        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";
        this.showEmptyPage(true);
        AudioCont.play_sound_effect("alert");

        let continueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.875 * GenParam.SVG_height, 400, 75, "Continue", 40);
        continueButton.onpointerdown = (event) => {
            this.expCont.instructionsPageClosed(); // CamelCased Hook
        };
        this.currentInstructionsSVG.appendChild(continueButton);

        if (informationType === "partner_leaves" || informationType === "partner_returns") {
            let partner = this.worldState.get_partner_icon_settings();
            let pronoun = partner.type === "female" ? "she" : "he";
            let pronounC = partner.type === "female" ? "She" : "He";
            let posses = partner.type === "female" ? "her" : "his";

            let pTitle = informationType === "partner_leaves" ? `${partner.name || "Your partner"} has left the island` : `${partner.name || "Your partner"} has returned to the island!`;
            document.getElementById("Instructions_Title").innerHTML = pTitle;

            let pText = informationType === "partner_leaves" ?
                `${partner.name || "Your partner"} has to attend some classes away from the island. Until further notice, ${pronoun} will not be present while you take care of the Fennimals. ${pronounC} will not learn what will happen on the island for the duration of the time that ${pronoun} will be gone.` :
                `${partner.name || "Your partner"} has returned from ${posses} classes away from the island. ${pronounC} has only just stepped of the boat, and has not been told about anything that happened on the island while ${pronoun} was away.`;

            let textObj = create_SVG_text_in_foreign_element(pText, 0.05 * GenParam.SVG_width, 0.3 * GenParam.SVG_height, 0.4 * GenParam.SVG_width, 0.3 * GenParam.SVG_height, undefined, undefined);
            textObj.style.fontSize = "40px";
            this.currentInstructionsSVG.appendChild(textObj);

            let direction = informationType === "partner_leaves" ? "right" : "left";
            let arrowSVG = document.getElementById("block_arrow_left").cloneNode(true);
            let aZeroT = create_SVG_group(0, 0, undefined, undefined);
            let scale = create_SVG_group(0, 0, undefined, undefined);
            let inv = create_SVG_group(0, 0, undefined, undefined);
            let trans = create_SVG_group(0, 0, undefined, undefined);
            aZeroT.appendChild(arrowSVG); scale.appendChild(aZeroT); inv.appendChild(scale); trans.appendChild(inv);
            this.currentInstructionsSVG.appendChild(trans);

            arrowSVG.style.display = "inherit";
            aZeroT.style.transform = `translate(${-getSVGInternalCenter(aZeroT).x}px, ${-getSVGInternalCenter(aZeroT).y}px)`;
            scale.style.transform = "scale(2.5)";
            if (direction === "left") inv.style.transform = "scaleX(-1)";
            trans.style.transform = `translate(${0.75 * GenParam.SVG_width}px, ${0.45 * GenParam.SVG_height}px)`;
            arrowSVG.style.opacity = 0.5;
            arrowSVG.classList.add("focus_on_SVG_fill");

            let iconSVG = this.worldState.get_person_icon("partner", direction);
            iconSVG.style.transform = "scale(15)";
            let iconTranslateGroup = create_SVG_group(0, 0, undefined, undefined);
            let iconAnimationGroup = create_SVG_group(0, 0, undefined, undefined);

            iconTranslateGroup.appendChild(iconSVG);
            iconAnimationGroup.appendChild(iconTranslateGroup);
            this.currentInstructionsSVG.appendChild(iconAnimationGroup);
            moveSVGCenterTo(iconTranslateGroup, 0.6 * GenParam.SVG_width, 0.5 * GenParam.SVG_height);
            if (informationType === "partner_leaves") iconAnimationGroup.classList.add("pseudoday_player_icon_leaving_island_translate_group");
            if (informationType === "partner_returns") iconAnimationGroup.classList.add("pseudoday_player_icon_returning_to_island_translate_group");
        }

        if (informationType === "new_Fennimals_spotted") {
            let textW = optionalInformation ? 0.4 * GenParam.SVG_width : 0.9 * GenParam.SVG_width;
            let textY = optionalInformation ? 0.3 * GenParam.SVG_height : 0.4 * GenParam.SVG_height;
            let textAlign = optionalInformation ? "left" : "center";

            document.getElementById("Instructions_Title").innerHTML = title;
            let textObj = create_SVG_text_in_foreign_element(text, 0.05 * GenParam.SVG_width, textY, textW, 0.3 * GenParam.SVG_height, undefined, undefined);
            textObj.style.textAlign = textAlign;
            textObj.style.fontSize = "40px";
            this.currentInstructionsSVG.appendChild(textObj);

            if (optionalInformation) {
                let iconScreenStartCoords = { x: 0.85 * GenParam.SVG_width, y: 0.4 * GenParam.SVG_height };
                let allIconPositions = {
                    1: [{ x: 0, y: 0, rotation: 10 }],
                    2: [{ x: 100, y: 0, rotation: 10 }, { x: -100, y: 0, rotation: -10 }],
                    3: [{ x: 0, y: 0, rotation: 5 }, { x: 200, y: 0, rotation: 10 }, { x: -200, y: 0, rotation: -10 }],
                    4: [{ x: 200, y: 0, rotation: -10 }, { x: -200, y: 0, rotation: 10 }, { x: -75, y: -50, rotation: 0 }, { x: 150, y: 150, rotation: -10 }],
                    5: [{ x: 250, y: 0, rotation: -10 }, { x: -250, y: 0, rotation: 10 }, { x: -75, y: -50, rotation: 0 }, { x: 150, y: 150, rotation: -10 }, { x: -150, y: 150, rotation: 10 }],
                    6: [{ x: 250, y: 0, rotation: -10 }, { x: -250, y: 0, rotation: 10 }, { x: -75, y: -50, rotation: 0 }, { x: 150, y: 150, rotation: -10 }, { x: -150, y: 150, rotation: 10 }, { x: 400, y: 150, rotation: 20 }]
                };
                let iconMovePositions = allIconPositions[optionalInformation.length];

                for (let iconNum = 0; iconNum < optionalInformation.length; iconNum++) {
                    let groupTranslate = create_SVG_group(0, 0, undefined, undefined);
                    let groupRotate = create_SVG_group(0, 0, undefined, undefined);
                    let groupScale = create_SVG_group(0, 0, undefined, undefined);
                    groupRotate.appendChild(groupScale); groupTranslate.appendChild(groupRotate); this.currentInstructionsSVG.appendChild(groupTranslate);

                    let frame = copy_scale_and_move_object_to_position(document.getElementById("polaroid_frame"), groupScale, iconScreenStartCoords.x, iconScreenStartCoords.y, 1);
                    frame.getElementsByTagName("rect")[0].style.fill = GenParam.RegionData[optionalInformation[iconNum].region].surrounding_color;
                    frame.getElementsByTagName("rect")[0].style.display = "inherit";
                    frame.getElementsByTagName("text")[0].childNodes[0].innerHTML = optionalInformation[iconNum].name;
                    let targetCircle = getSVGInternalCenter(frame.getElementsByTagName("circle")[0]);

                    let icon = create_Fennimal_SVG_object(optionalInformation[iconNum], GenParam.Fennimal_head_size, true);
                    groupScale.appendChild(icon);

                    let fennimalScaleGroup = icon.getElementsByClassName("Fennimal_scale_group")[0];
                    let box = icon.getBBox();
                    let deltaX = (targetCircle.x) - (box.x + 0.5 * box.width);
                    let deltaY = (targetCircle.y) - (box.y + 0.5 * box.height) + 50;

                    let frameBox = frame.getElementsByTagName("rect")[0].getBBox();
                    let scaleFactorW = 1 / (box.width / frameBox.width);
                    let scaleFactorH = 1 / (box.height / frameBox.height);
                    let minScaleFactor = Math.floor(Math.min(scaleFactorW, 0.8 * scaleFactorH) * 100) / 100;

                    fennimalScaleGroup.style.transform = `scale(${minScaleFactor})`;
                    icon.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

                    groupScale.style.transformOrigin = "center";
                    groupRotate.style.transformOrigin = (.6 * GenParam.SVG_width) + "px " + (0.4 * GenParam.SVG_height) + "px";
                    groupScale.style.transform = "scale(0.5)";
                    groupTranslate.style.transition = "all 500ms ease-in-out";
                    groupRotate.style.transition = "all 500ms ease-in-out";

                    if (iconNum < iconMovePositions.length) {
                        groupRotate.style.transform = `rotate(${iconMovePositions[iconNum].rotation}deg)`;
                        groupTranslate.style.transform = `translate(${iconMovePositions[iconNum].x}px, ${iconMovePositions[iconNum].y}px)`;
                    }
                }
            }
        }
    }

    showQuestionnairePage(pageType) {
        this.showEmptyPage(true);
        document.getElementById("Instructions_Title").innerHTML = "A few questions before we finish...";

        let text = create_SVG_text_in_foreign_element("You're almost done! Just a few questions left:",
            0.05 * GenParam.SVG_width, 0.12 * GenParam.SVG_height, 0.9 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, "instruction_element_text");
        text.style.textAlign = "center";
        text.style.fontSize = "35px";
        this.currentInstructionsSVG.appendChild(text);

        this.questionnaireForeign = create_SVG_foreignElement(0.2 * GenParam.SVG_width, 0.35 * GenParam.SVG_height, 0.6 * GenParam.SVG_width, 0.5 * GenParam.SVG_height, undefined, undefined);
        this.currentInstructionsSVG.appendChild(this.questionnaireForeign);

        let questionsOnScreen = [];
        if (pageType === "demographics_questionnaire") questionsOnScreen = ["age", "gender", "colorblind"];

        this.questionnaireItemsOnScreen = [];
        for (let i = 0; i < questionsOnScreen.length; i++) {
            this.questionnaireItemsOnScreen.push(new QuestionnaireItem(this.questionnaireForeign, questionsOnScreen[i], () => this.questionnaireItemValueChanged()));
        }

        this.questionnaireContinueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.90 * GenParam.SVG_height, 400, 75, "Continue", 40);
        this.currentInstructionsSVG.appendChild(this.questionnaireContinueButton);
        this.questionnaireContinueButton.onpointerdown = () => {
            this.questionnairePageCompleted();
            AudioCont.play_sound_effect("button_click");
        };
        this.questionnaireContinueButton.style.display = "none";
    }

    questionnaireItemValueChanged() {
        let allQuestionsAnswered = true;
        for (let i = 0; i < this.questionnaireItemsOnScreen.length; i++) {
            if (this.questionnaireItemsOnScreen[i].getValue() === "") {
                allQuestionsAnswered = false;
            }
        }
        if (allQuestionsAnswered) {
            this.questionnaireContinueButton.style.display = "inherit";
        }
    }

    questionnairePageCompleted() {
        this.clearInstructions();
        let answerObj = {};
        for (let i = 0; i < this.questionnaireItemsOnScreen.length; i++) {
            answerObj[this.questionnaireItemsOnScreen[i].getType()] = this.questionnaireItemsOnScreen[i].getValue();
        }
        this.expCont.questionnairePageCompleted(answerObj); // CamelCased Hook
    }

    showNextPaymentCard(parent, remainingCards, timeBetweenCards) {
        if (remainingCards.length > 0) {
            this.allCardsOnScreen.push(new PaymentCard(parent, remainingCards.shift()));
            setTimeout(() => {
                this.showNextPaymentCard(parent, remainingCards, timeBetweenCards);
            }, timeBetweenCards);
        } else {
            this.allPaymentCardsAreOnScreen();
        }
    }

    allPaymentCardsAreOnScreen() {
        let warningText = create_SVG_text_in_foreign_element("DO NOT CLOSE THIS PAGE YET <br> On the next page you will find your completion code...",
            0.05 * GenParam.SVG_width, 0.7 * GenParam.SVG_height, 0.9 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, "instruction_element_text");
        warningText.style.textAlign = "center";
        warningText.style.fontSize = "35px";
        warningText.style.fontWeight = 600;
        this.currentInstructionsSVG.appendChild(warningText);

        let continueButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.90 * GenParam.SVG_height, 400, 75, "Continue", 40);
        this.currentInstructionsSVG.appendChild(continueButton);
        continueButton.onpointerdown = () => {
            this.showCompletionCodeScreen();
            AudioCont.play_sound_effect("button_click");
        };
    }

    showCompletionCodeScreen() {
        this.showEmptyPage(true);
        document.getElementById("Instructions_Title").innerHTML = "Do <u>NOT</u> close this page yet...";

        // FIX: Changed this.expPaymentData.completion_code to this.expPaymentData.completionCode
        let text = "Do NOT close or refresh this window yet! <br>" +
            " As a safety backup, your completion code is: <tspan style='user-select:all'><b> " + this.expPaymentData.completionCode + " </b></tspan>. <br>" +
            "<br> " +
            "Pressing the button below should automatically submit your code to Prolific. However, please copy this code first. <br>" +
            "<br>" +
            "<u>Do not close or refresh this window before clicking the button! </u> We can only approve your work if you submitted the code to Prolific by clicking the button below! <br>" +
            "<br>" +
            "Thank you for participating! :)";

        let ccText = create_SVG_text_in_foreign_element(text, 0.05 * GenParam.SVG_width, 0.2 * GenParam.SVG_height, 0.9 * GenParam.SVG_width, 0.6 * GenParam.SVG_height, "instruction_element_text");
        ccText.style.textAlign = "center";
        ccText.style.fontSize = "35px";
        this.currentInstructionsSVG.appendChild(ccText);

        let submitButton = create_SVG_buttonElement(0.5 * GenParam.SVG_width, 0.90 * GenParam.SVG_height, 500, 75, "Submit your data", 40);
        this.currentInstructionsSVG.appendChild(submitButton);
        submitButton.onpointerdown = () => {
            this.expCont.submitExperiment(); // CamelCased Hook
        };
    }

    showPaymentScreen(paymentData) {
        this.expPaymentData = paymentData;
        let timer = 1000;
        this.showEmptyPage(true);
        document.getElementById("Instructions_Title").innerHTML = "Your bonus for this experiment";

        let explanationText = create_SVG_text_in_foreign_element("Congratulations, you just finished the last day! Below is an overview of the stars you earned during the experiment: ",
            0.05 * GenParam.SVG_width, 0.18 * GenParam.SVG_height, 0.9 * GenParam.SVG_width, 0.15 * GenParam.SVG_height, "instruction_element_text");
        explanationText.style.textAlign = "center";
        explanationText.style.fontSize = "35px";
        this.currentInstructionsSVG.appendChild(explanationText);

        let foreignDiv = create_SVG_foreignElement(0.1 * GenParam.SVG_width, 0.35 * GenParam.SVG_height, 0.8 * GenParam.SVG_width, 0.4 * GenParam.SVG_height, undefined, undefined);
        this.currentInstructionsSVG.appendChild(foreignDiv);
        this.paymentCardContainer = document.createElement("div");
        this.paymentCardContainer.style.display = "flex";
        this.paymentCardContainer.style.justifyContent = "center";
        foreignDiv.appendChild(this.paymentCardContainer);

        this.allCardsOnScreen = [];
        this.showNextPaymentCard(this.paymentCardContainer, JSON.parse(JSON.stringify(paymentData.phases)), timer);
    }
}

// ----------------------------------------------------------------------
// EXPORTED COMPONENT CLASSES
// ----------------------------------------------------------------------

/**
 * Adaptive Fennimal-head roster for free-exploration intro / progress / complete screens.
 * mode: "intro" (all grayscale) | "progress" (found color, else gray) | "complete" (all color)
 */
class ExplorationFennimalRoster {
    constructor(parentElem, x, y, width, height) {
        this.parentElem = parentElem;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.foreign = null;
        this.rootDiv = null;
    }

    destroy() {
        if (this.foreign && this.foreign.parentNode) this.foreign.remove();
        this.foreign = null;
        this.rootDiv = null;
    }

    getLayout(n) {
        let cols;
        let rows;
        let maxCell;

        if (n <= 3) {
            cols = Math.max(n, 1);
            rows = 1;
            maxCell = 280;
        } else if (n <= 6) {
            cols = n;
            rows = 1;
            maxCell = 200;
        } else if (n <= 12) {
            cols = Math.ceil(n / 2);
            rows = 2;
            maxCell = 160;
        } else {
            cols = 6;
            rows = Math.ceil(n / 6);
            maxCell = 140;
        }

        let gap = n <= 3 ? 36 : 22;
        let cellW = (this.width - gap * (cols + 1)) / cols;
        let cellH = (this.height - gap * (rows + 1)) / Math.min(rows, n <= 12 ? rows : 3);
        let size = Math.max(90, Math.min(cellW, cellH, maxCell));

        return { cols, rows, gap, size, needsScroll: n > 12 };
    }

    render(fenList, mode) {
        this.destroy();

        let fens = (fenList || []).filter((f) => f && f.name !== undefined);
        this.foreign = create_SVG_foreignElement(this.x, this.y, this.width, this.height, undefined, undefined);
        this.foreign.classList.add("instruction_element_nonbackground");
        this.parentElem.appendChild(this.foreign);

        this.rootDiv = document.createElement("div");
        this.rootDiv.style.width = "100%";
        this.rootDiv.style.height = "100%";
        this.rootDiv.style.display = "flex";
        this.rootDiv.style.flexWrap = "wrap";
        this.rootDiv.style.justifyContent = "center";
        this.rootDiv.style.alignContent = "center";
        this.rootDiv.style.alignItems = "center";
        this.rootDiv.style.boxSizing = "border-box";
        this.rootDiv.style.padding = "8px";
        this.foreign.appendChild(this.rootDiv);

        if (fens.length === 0) return;

        let layout = this.getLayout(fens.length);
        if (layout.needsScroll) {
            this.rootDiv.style.overflowY = "auto";
            this.rootDiv.style.alignContent = "flex-start";
        }

        fens.forEach((fen) => {
            let isFound = mode === "complete" || (mode === "progress" && fen.visited === true);
            // Intro: all unfound. Progress: visited found. Complete: all found.
            if (mode === "intro") isFound = false;

            this.rootDiv.appendChild(this.createHeadCard(fen, isFound, layout.size, layout.gap));
        });
    }

    createHeadCard(fenObj, isFound, size, gap) {
        let regionDark = GenParam.RegionData[fenObj.region]
            ? GenParam.RegionData[fenObj.region].darker_color
            : "#37474F";
        let regionLight = GenParam.RegionData[fenObj.region]
            ? GenParam.RegionData[fenObj.region].lighter_color
            : "#ECEFF1";

        let card = document.createElement("div");
        card.style.width = size + "px";
        card.style.height = (size + 42) + "px";
        card.style.margin = Math.max(8, gap / 2) + "px";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.alignItems = "center";
        card.style.justifyContent = "flex-start";
        card.style.opacity = "0";
        card.style.transition = "opacity 280ms ease-out";

        let headWrap = document.createElement("div");
        headWrap.style.width = size + "px";
        headWrap.style.height = size + "px";
        headWrap.style.borderRadius = "22px";
        headWrap.style.display = "flex";
        headWrap.style.alignItems = "center";
        headWrap.style.justifyContent = "center";
        headWrap.style.boxSizing = "border-box";
        headWrap.style.border = isFound
            ? ("4px solid " + regionDark)
            : "4px solid #90A4AE";
        headWrap.style.background = isFound ? regionLight : "#CFD8DC";
        headWrap.style.overflow = "hidden";
        if (!isFound) {
            headWrap.style.opacity = "0.7";
            headWrap.style.filter = "blur(1.5px)";
        }
        card.appendChild(headWrap);

        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.overflow = "visible";
        headWrap.appendChild(svg);

        let headIcon = create_Fennimal_SVG_object_head_only(fenObj, false);
        if (!isFound) {
            headIcon.style.filter = "grayscale(100%) brightness(1.05)";
        }
        svg.appendChild(headIcon);

        let label = document.createElement("div");
        label.style.marginTop = "8px";
        label.style.fontSize = Math.max(22, Math.round(size * 0.16)) + "px";
        label.style.fontWeight = "700";
        label.style.textAlign = "center";
        label.style.color = isFound ? regionDark : "#546E7A";
        if (!isFound) label.style.opacity = "0.7";
        label.textContent = isFound ? fenObj.name : "?";
        card.appendChild(label);

        setTimeout(() => {
            try {
                let box = headIcon.getBBox();
                if (box.width > 0 && box.height > 0) {
                    let pad = size * 0.82;
                    let scale = Math.min(pad / box.width, pad / box.height);
                    let cx = box.x + box.width / 2;
                    let cy = box.y + box.height / 2;
                    headIcon.setAttribute(
                        "transform",
                        `translate(${size / 2}, ${size / 2}) scale(${scale}) translate(${-cx}, ${-cy})`
                    );
                }
            } catch (e) { /* bbox unavailable */ }
            card.style.opacity = "1";
        }, 40);

        return card;
    }
}

class VerticalScrollableBox {
    constructor(parentElem, x, y, width, height) {
        this.parentElem = parentElem;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.boxParam = {
            scrollButtonHeight: 30,
            borderRadiusValue: "35px",
            scrollSymbolSize: "55px",
            scrollSpeed: 30,
            iconNameSize: 30
        };

        this.topForeignElement = null;
        this.topDiv = null;
        this.buttonUpDiv = null;
        this.areaDiv = null;
        this.buttonDownDiv = null;
        this.elementArray = [];

        this.initialize();
        this.updateScrollButtonVisibility();
    }

    createScrollButtonElement(direction) {
        let div = document.createElement("div");
        div.style.width = "100%";
        div.style.height = this.boxParam.scrollButtonHeight + "px";
        div.classList.add("instructions_scroll_button_element");

        let symbolElem = document.createElement("div");
        symbolElem.style.width = "100%";
        symbolElem.style.height = "100%";
        symbolElem.style.fontSize = this.boxParam.scrollSymbolSize;
        symbolElem.style.display = "flex";
        symbolElem.style.justifyContent = "center";

        div.appendChild(symbolElem);

        if (direction === "up") {
            div.style.borderRadius = this.boxParam.borderRadiusValue + " " + this.boxParam.borderRadiusValue + " 0 0";
            symbolElem.innerHTML = "⯅";
            symbolElem.style.alignItems = "center";
        }
        if (direction === "down") {
            div.style.borderRadius = "0 0 " + this.boxParam.borderRadiusValue + " " + this.boxParam.borderRadiusValue;
            symbolElem.innerHTML = "⯆";
            symbolElem.style.alignItems = "end";
            symbolElem.style.paddingTop = "15px";
        }

        return div;
    }

    createAreaElement() {
        let mainDiv = document.createElement("div");
        mainDiv.style.width = "98%";
        mainDiv.style.height = (this.height - 2 * this.boxParam.scrollButtonHeight) + "px";
        mainDiv.style.background = "#FFFFFF";
        mainDiv.style.display = "flex";
        mainDiv.style.flexWrap = "wrap";
        mainDiv.style.overflow = "hidden";
        mainDiv.style.alignItems = "center";
        mainDiv.style.justifyContent = "center";
        mainDiv.style.borderRadius = "25px";
        mainDiv.style.border = "2px solid black";
        return mainDiv;
    }

    initialize() {
        this.topForeignElement = create_SVG_foreignElement(this.x, this.y, this.width, this.height, undefined, undefined);
        this.parentElem.appendChild(this.topForeignElement);
        this.topForeignElement.classList.add("instruction_element_nonbackground");

        this.topDiv = document.createElement("div");
        this.buttonUpDiv = this.createScrollButtonElement("up");
        this.areaDiv = this.createAreaElement();
        this.buttonDownDiv = this.createScrollButtonElement("down");

        this.topForeignElement.appendChild(this.topDiv);
        this.topDiv.appendChild(this.buttonUpDiv);
        this.topDiv.appendChild(this.areaDiv);
        this.topDiv.appendChild(this.buttonDownDiv);

        this.buttonUpDiv.onpointerdown = () => this.scrollAreaUp();
        this.buttonDownDiv.onpointerdown = () => this.scrollAreaDown();
    }

    scrollAreaUp() {
        this.areaDiv.scrollTop = this.areaDiv.scrollTop - this.boxParam.scrollSpeed;
        this.updateScrollButtonVisibility();
    }

    scrollAreaDown() {
        this.areaDiv.scrollTop = this.areaDiv.scrollTop + this.boxParam.scrollSpeed;
        this.updateScrollButtonVisibility();
    }

    updateScrollButtonVisibility() {
        this.buttonUpDiv.style.visibility = this.areaDiv.scrollTop === 0 ? "hidden" : "visible";
        this.buttonDownDiv.style.visibility = ((this.areaDiv.scrollHeight - this.areaDiv.clientHeight) === this.areaDiv.scrollTop) ? "hidden" : "visible";
    }

    addArrayOfElements(arr) {
        for (let i = 0; i < arr.length; i++) {
            this.elementArray.push(new FennimalIconCard(this.areaDiv, arr[i].Icon, arr[i].otherProperties, this.boxParam));
        }
        this.updateScrollButtonVisibility();
    }

    addArrayOfFennimalIcons(fenObjArr, iconWidth, iconHeight, includeNames, includeRegionColor) {
        fenObjArr = fenObjArr.filter(f => f.name !== undefined);

        for (let i = 0; i < fenObjArr.length; i++) {
            let backgroundColor = includeRegionColor ? GenParam.RegionData[fenObjArr[i].region].lighter_color : "#DDDDDD44";
            let nameColor;
            let fennimalHasBeenFound = fenObjArr[i].visited === true;

            if (fennimalHasBeenFound) {
                backgroundColor = GenParam.RegionData[fenObjArr[i].region].lighter_color;
                nameColor = GenParam.RegionData[fenObjArr[i].region].darker_color;
            }

            let iconSVG = create_Fennimal_SVG_object(fenObjArr[i], GenParam.Fennimal_head_size, !fennimalHasBeenFound);
            apply_Fennimal_animation_pivots(iconSVG);
            let otherProperties = { width: iconWidth, height: iconHeight, backgroundColor: backgroundColor };

            if (fennimalHasBeenFound) {
                otherProperties.blur = false;
                otherProperties.nameColor = nameColor;
            } else {
                otherProperties.blur = true;
            }

            if (includeNames) otherProperties.name = fennimalHasBeenFound ? fenObjArr[i].name : "?";

            if (fenObjArr[i].bonus_star_earnable === true && fenObjArr[i].search_status === "unsearched") {
                otherProperties.backgroundColor = "#D4AF3744";
                otherProperties.bonus_star_earnable = true;
            }

            this.elementArray.push(new FennimalIconCard(this.areaDiv, iconSVG, otherProperties, this.boxParam));
        }

        this.updateScrollButtonVisibility();
        setTimeout(() => this.updateScrollButtonVisibility(), 25);
    }

    addArrayOfLocationIcons(arrOfLocationStates, iconWidth, iconHeight, includeNames) {
        for (let i = 0; i < arrOfLocationStates.length; i++) {
            let iconSVG = document.getElementById("location_icon_" + arrOfLocationStates[i].location).cloneNode(true);
            iconSVG.removeAttribute("id");

            let locationHasBeenVisited = true;
            if (arrOfLocationStates[i].state === "empty_unsearched") locationHasBeenVisited = false;
            else if (typeof arrOfLocationStates[i] === "object" && arrOfLocationStates[i].visited !== true) locationHasBeenVisited = false;

            if (!locationHasBeenVisited) {
                set_fill_for_all_elements_in_array(iconSVG.querySelectorAll("*"), "black");
                set_stroke_color_for_all_elements_in_array(iconSVG.querySelectorAll("*"), "black");
            }

            let backgroundColor = "#DDDDDD";
            let otherProperties = { width: iconWidth, height: iconHeight, backgroundColor: backgroundColor };
            if (includeNames) otherProperties.name = arrOfLocationStates[i].location;

            this.elementArray.push(new LocationIconCard(this.areaDiv, iconSVG, otherProperties, this.boxParam));
        }
        this.updateScrollButtonVisibility();
    }

    clearAllIcons() {
        for (let i = 0; i < this.elementArray.length; i++) this.elementArray[i].removeIcon();
        this.updateScrollButtonVisibility();
    }

    changeOpacity(opacity) {
        this.topForeignElement.style.opacity = opacity;
    }

    changePosition(dimension, newValue) {
        this.topForeignElement.setAttribute(dimension, newValue);
    }
}

class FennimalIconCard {
    constructor(areaElem, svg, otherProperties, boxParam) {
        let svgElem = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        svgElem.appendChild(svg);

        this.cardDiv = document.createElement("div");
        let nameDiv, iconCardWidth, iconCardHeight;

        this.cardDiv.style.width = otherProperties.width + "px";
        this.cardDiv.style.height = otherProperties.height + "px";
        this.cardDiv.style.borderRadius = "5%";
        this.cardDiv.style.margin = "4px";
        this.cardDiv.style.border = "4px solid black";
        this.cardDiv.appendChild(svgElem);
        this.cardDiv.style.opacity = 0;

        if (otherProperties.blur) this.cardDiv.style.filter = "blur(1px)";

        if (otherProperties.name === undefined) {
            iconCardHeight = otherProperties.height;
            iconCardWidth = otherProperties.width;
            svgElem.style.width = "100%";
            svgElem.style.height = "100%";
        } else {
            nameDiv = document.createElement("div");
            nameDiv.innerHTML = otherProperties.name;
            nameDiv.style.fontSize = "38px";
            nameDiv.style.textAlign = "center";
            nameDiv.style.fontWeight = 900;
            nameDiv.style.color = "white";
            nameDiv.style.borderRadius = "10px";
            iconCardHeight = otherProperties.height - boxParam.iconNameSize;
            iconCardWidth = otherProperties.width - boxParam.iconNameSize;
        }

        this.cardDiv.style.background = otherProperties.backgroundColor || "lightgray";

        if (otherProperties.nameColor) {
            nameDiv.style.background = otherProperties.nameColor;
            this.cardDiv.style.border = "4px solid " + otherProperties.nameColor;
        } else if (nameDiv) {
            nameDiv.style.background = "dimgray";
        }

        areaElem.appendChild(this.cardDiv);
        if (otherProperties.name !== undefined) this.cardDiv.appendChild(nameDiv);

        setTimeout(() => {
            let currentBox = svg.getBBox();
            let scaleFactorW = 1 / (currentBox.width / iconCardWidth);
            let scaleFactorH = 1 / (currentBox.height / iconCardHeight);
            let minScaleFactor = Math.floor(Math.min(scaleFactorW, scaleFactorH) * 100) / 100;

            let scaleGroup = svg.getElementsByClassName("Fennimal_scale_group")[0];
            scaleGroup.style.transform = `scale(${minScaleFactor})`;

            let newBox = svg.getBBox();
            let deltaX, deltaY;
            if (otherProperties.name === undefined) {
                let targetCenter = { x: 0.5 * otherProperties.width, y: 0.5 * otherProperties.height };
                deltaX = targetCenter.x - (newBox.x + 0.5 * newBox.width);
                deltaY = targetCenter.y - (newBox.y + 0.5 * newBox.height);
            } else {
                deltaX = (0.5 * otherProperties.width) - (newBox.x + 0.5 * newBox.width);
                deltaY = -newBox.y;
            }
            svg.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

            if (otherProperties.bonus_star_earnable === true) {
                showBonusStarOnScreen(svg, 0.25 * otherProperties.width, 0.15 * otherProperties.height, false, 0, 0.5);
            }

            this.cardDiv.style.transition = "opacity 200ms ease-in-out";
            this.cardDiv.style.opacity = 1;
        }, 75);
    }

    removeIcon() {
        this.cardDiv.remove();
    }
}

class LocationIconCard {
    constructor(areaElem, svg, otherProperties, boxParam) {
        let svgElem = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        let scaleGroup = create_SVG_group(undefined, undefined, undefined, undefined);
        let translateGroup = create_SVG_group(undefined, undefined, undefined, undefined);

        translateGroup.appendChild(scaleGroup);
        scaleGroup.appendChild(svg);
        svgElem.appendChild(translateGroup);

        this.cardDiv = document.createElement("div");
        let nameDiv, iconCardWidth, iconCardHeight;

        this.cardDiv.style.width = otherProperties.width + "px";
        this.cardDiv.style.height = otherProperties.height + "px";
        this.cardDiv.style.borderRadius = "5%";
        this.cardDiv.style.margin = "5px";
        this.cardDiv.appendChild(svgElem);

        if (otherProperties.name === undefined) {
            iconCardHeight = otherProperties.height;
            iconCardWidth = otherProperties.width;
            svgElem.style.width = "100%";
            svgElem.style.height = "100%";
        } else {
            nameDiv = document.createElement("div");
            nameDiv.innerHTML = otherProperties.name;
            nameDiv.style.fontSize = boxParam.iconNameSize + "px";
            nameDiv.style.textAlign = "center";
            nameDiv.style.marginTop = -(boxParam.iconNameSize / 2) + "px";
            iconCardHeight = otherProperties.height - boxParam.iconNameSize;
            iconCardWidth = otherProperties.width;
        }

        this.cardDiv.style.background = otherProperties.backgroundColor ? otherProperties.backgroundColor + "44" : "lightgray";
        areaElem.appendChild(this.cardDiv);
        if (otherProperties.name !== undefined) this.cardDiv.appendChild(nameDiv);

        let currentBox = svg.getBBox();
        svg.removeAttribute("transform");

        let scaleFactorW = 1 / (currentBox.width / iconCardWidth);
        let scaleFactorH = 1 / (currentBox.height / iconCardHeight);
        let minScaleFactor = 0.98 * Math.floor(Math.min(scaleFactorW, scaleFactorH) * 100) / 100;
        scaleGroup.style.transform = `scale(${minScaleFactor})`;

        let newBox = translateGroup.getBBox();
        let deltaX, deltaY;
        if (otherProperties.name === undefined) {
            let targetCenter = { x: 0.5 * iconCardWidth, y: 0.5 * iconCardHeight };
            deltaX = (targetCenter.x - (newBox.x + 0.5 * newBox.width));
            deltaY = (targetCenter.y - (newBox.y + 0.5 * newBox.height));
        } else {
            let targetCenter = { x: 0.5 * iconCardWidth, y: 0.5 * iconCardHeight };
            deltaX = targetCenter.x - (newBox.x + 0.5 * newBox.width);
            deltaY = iconCardHeight - (newBox.y + newBox.height);
        }
        translateGroup.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }

    removeIcon() {
        this.cardDiv.remove();
    }
}

class RecallBoxController {
    constructor(page, answerBoxWidth, answerBoxHeight, allowEmptyInput, addCheckboxNoAnswer, checkboxNoAnswerText, returnFunc) {
        this.page = page;
        this.allowEmptyInput = allowEmptyInput;
        this.addCheckboxNoAnswer = addCheckboxNoAnswer;
        this.checkboxNoAnswerText = checkboxNoAnswerText;
        this.returnFunc = returnFunc;

        this.startTime = Date.now();
        let ypos = 0;
        this.dims = {
            field: { x: 0, y: ypos, h: answerBoxHeight, w: answerBoxWidth },
            inputLine: { x: 10, y: 238, h: 120, w: 750 },
            inputButton: { x: 720, y: 275, h: 70, w: 130 },
            continueButton: { x: 900, y: 240, h: 70, w: 200 },
            noAnswerCheckbox: { x: 500, y: 750, h: 100, w: 408 }
        };
        this.maxInputLength = 30;

        this.dims.inputLine.y = ypos + this.dims.field.h + 4;
        this.dims.inputButton.y = ypos + this.dims.field.h + 5;
        this.dims.continueButton.y = ypos + this.dims.field.h + 5;
        this.dims.noAnswerCheckbox.y = this.dims.continueButton.y + this.dims.continueButton.h + 5;

        this.topGroup = null;
        this.forObjBox = null;
        this.box = null;
        this.boxPlaceholderText = null;
        this.forObjInput = null;
        this.inputText = null;
        this.inputButton = null;
        this.checkBox = null;
        this.checkBoxContainer = null;
        this.checkBoxText = null;
        this.continueButton = null;
        this.warningTextForArmedButton = null;

        this.answerArray = [];
        this.boxActive = false;
        this.answerId = 0;
        this.removableElements = [];
        this.flagDoneButtonPressedOnce = false;

        this.initializeElements();
    }

    createNSElemWithDims(namespace, elemName, x, y, w, h) {
        let elem = document.createElementNS(namespace, elemName);
        elem.setAttribute("x", x);
        elem.setAttribute("y", y);
        elem.setAttribute("width", w);
        elem.setAttribute("height", h);
        return elem;
    }

    createSVGButtonElem(x, y, width, height, text) {
        let maxFontSize = 50;
        let buttonContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        buttonContainer.setAttribute("x", x);
        buttonContainer.setAttribute("y", y);
        buttonContainer.setAttribute("width", width);
        buttonContainer.setAttribute("height", height);
        buttonContainer.classList.add("instructions_button");

        let buttonBackground = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        buttonBackground.setAttribute("x", x);
        buttonBackground.setAttribute("y", y);
        buttonBackground.setAttribute("width", width);
        buttonBackground.setAttribute("height", height);
        buttonBackground.setAttribute("rx", "1.5%");

        let svgText = document.createElementNS("http://www.w3.org/2000/svg", 'text');
        svgText.setAttribute("x", x + 0.5 * width);
        svgText.setAttribute("y", y + 0.5 * height + 2);
        svgText.style.dominantBaseline = "middle";
        svgText.style.textAnchor = "middle";
        svgText.style.fontSize = maxFontSize + "px";
        svgText.append(document.createTextNode(text));

        const tryResize = (currentFontSize) => {
            if (svgText.getBBox().width > 0.95 * width) {
                let newFontSize = currentFontSize - 1;
                svgText.style.fontSize = newFontSize + "px";
                setTimeout(() => tryResize(newFontSize), 25);
            }
        };
        setTimeout(() => tryResize(maxFontSize), 5);

        buttonContainer.appendChild(buttonBackground);
        buttonContainer.appendChild(svgText);
        return buttonContainer;
    }

    initializeElements() {
        this.topGroup = create_SVG_group(0, 0, undefined, undefined);
        this.page.appendChild(this.topGroup);

        this.forObjBox = this.createNSElemWithDims('http://www.w3.org/2000/svg', "foreignObject", this.dims.field.x, this.dims.field.y, this.dims.field.w, this.dims.field.h);
        this.forObjBox.style.padding = "1%";
        this.topGroup.appendChild(this.forObjBox);
        this.removableElements.push(this.forObjBox);

        this.box = document.createElement("div");
        this.box.classList.add("recall_input_answerbox_start");
        this.forObjBox.appendChild(this.box);
        this.resetBox();

        this.forObjInput = this.createNSElemWithDims('http://www.w3.org/2000/svg', "foreignObject", this.dims.inputLine.x, this.dims.inputLine.y, this.dims.inputLine.w, this.dims.inputLine.h);
        this.forObjInput.style.padding = "1%";
        this.topGroup.appendChild(this.forObjInput);
        this.removableElements.push(this.forObjInput);

        this.inputText = document.createElement("input");
        this.inputText.maxLength = this.maxInputLength;
        this.inputText.placeholder = "Enter name here";
        this.inputText.classList.add("recall_input_line");
        this.inputText.addEventListener("keyup", (event) => {
            if (event.key === "Enter") {
                if (this.inputText.value !== "") {
                    AudioCont.play_sound_effect("button_click");
                    this.addAnswerButtonPressed();
                }
            } else {
                if (this.inputText.value === "") {
                    this.continueButton.style.display = "inherit";
                } else {
                    this.continueButton.style.display = "none";
                    if (this.flagDoneButtonPressedOnce) this.armOrDisarmDoneButton(false);
                }
            }
        });
        this.forObjInput.appendChild(this.inputText);

        this.inputButton = this.createSVGButtonElem(this.dims.inputButton.x, this.dims.inputButton.y, this.dims.inputButton.w, this.dims.inputButton.h, "Add");
        this.inputButton.onclick = () => {
            this.addAnswerButtonPressed();
            AudioCont.play_sound_effect("button_click");
        };
        this.topGroup.appendChild(this.inputButton);
        this.removableElements.push(this.inputButton);

        this.continueButton = this.createSVGButtonElem(this.dims.continueButton.x, this.dims.continueButton.y, this.dims.continueButton.w, this.dims.continueButton.h, "Done");
        this.continueButton.onpointerdown = () => {
            this.doneButtonPressed();
            AudioCont.play_sound_effect("button_click");
        };
        this.topGroup.appendChild(this.continueButton);
        this.removableElements.push(this.continueButton);

        if (!this.allowEmptyInput) this.continueButton.style.display = "none";

        if (this.addCheckboxNoAnswer) {
            this.checkBoxContainer = this.createNSElemWithDims('http://www.w3.org/2000/svg', "foreignObject", this.dims.noAnswerCheckbox.x, this.dims.noAnswerCheckbox.y, this.dims.noAnswerCheckbox.w, this.dims.noAnswerCheckbox.h);
            this.checkBoxContainer.style.padding = "1%";
            this.checkBoxContainer.classList.add("recall_no_answer_container");
            this.topGroup.appendChild(this.checkBoxContainer);
            this.removableElements.push(this.checkBoxContainer);

            this.checkBox = document.createElement("input");
            this.checkBox.setAttribute("type", "checkbox");
            this.checkBox.classList.add("recall_no_answer_checkbox");
            this.checkBoxContainer.appendChild(this.checkBox);
            this.checkBox.onchange = () => this.toggleNoAnswerCheckbox();

            this.checkBoxText = document.createElement("p");
            this.checkBoxText.innerHTML = this.checkboxNoAnswerText;
            this.checkBoxText.classList.add("recall_no_answer_text");
            this.checkBoxContainer.appendChild(this.checkBoxText);
        }
    }

    activateBox() {
        this.boxActive = true;
        this.boxPlaceholderText.remove();
        this.box.classList.remove("recall_input_answerbox_start");
        this.box.classList.add("recall_input_answerbox_active");
    }

    resetBox() {
        this.boxPlaceholderText = document.createElement("p");
        this.boxPlaceholderText.innerHTML = "Your answers will be shown here";
        this.boxPlaceholderText.classList.add("recall_input_box_placeholder");
        this.box.appendChild(this.boxPlaceholderText);
        this.boxActive = false;
        this.box.classList.add("recall_input_answerbox_start");
        this.box.classList.remove("recall_input_answerbox_active");
    }

    addAnswerButtonPressed() {
        if (this.inputText.value !== "") {
            if (!this.boxActive) this.activateBox();
            this.answerAdded(this.inputText.value);
            this.inputText.value = "";
        } else if (this.allowEmptyInput && !this.boxActive) {
            this.activateBox();
        }
    }

    answerAdded(answerText) {
        this.answerArray.push(new RecallAnswer(this, answerText, this.answerId, Date.now() - this.startTime));
        this.answerId++;
        this.numberOfAnswersChanged();
    }

    toggleNoAnswerCheckbox() {
        if (this.checkBox.checked) {
            this.inputButton.style.display = "none";
            this.inputText.disabled = true;
            this.continueButton.style.display = "inherit";
        } else {
            this.inputButton.style.display = "inherit";
            this.inputText.disabled = false;
            this.continueButton.style.display = "none";
        }
    }

    numberOfAnswersChanged() {
        let numberOfAnswersOnScreen = this.answerArray.filter(a => !a.getValueObj().removedByUser).length;

        if (numberOfAnswersOnScreen === 0) {
            this.continueButton.style.display = "none";
            this.resetBox();
            if (this.addCheckboxNoAnswer) {
                this.checkBox.disabled = false;
                this.checkBoxText.style.color = "black";
            }
        } else {
            this.continueButton.style.display = "inherit";
            if (this.addCheckboxNoAnswer) {
                this.checkBox.disabled = true;
                this.checkBoxText.style.color = "gray";
            }
        }
    }

    doneButtonPressed() {
        if (this.flagDoneButtonPressedOnce) this.finishQuestion();
        else this.armOrDisarmDoneButton(true);
    }

    armOrDisarmDoneButton(isNowArmed) {
        if (isNowArmed) {
            this.continueButton.childNodes[0].style.animation = "none";
            this.continueButton.childNodes[0].style.fill = "darkred";
            this.continueButton.childNodes[1].style.fill = "white";

            this.warningTextForArmedButton = create_SVG_text_in_foreign_element("<b>Are you sure?</b> You will not be able to return to this page after you press this button again. ", this.dims.continueButton.x + this.dims.continueButton.w + 30, this.dims.continueButton.y, 550, 150, "instruction_element_text");
            this.warningTextForArmedButton.style.fontSize = "35px";
            this.warningTextForArmedButton.childNodes[0].style.margin = "0";
            this.warningTextForArmedButton.childNodes[0].style.lineHeight = "90%";
            this.warningTextForArmedButton.childNodes[0].style.fontStyle = "italic";
            this.warningTextForArmedButton.style.color = "darkred";
            this.topGroup.appendChild(this.warningTextForArmedButton);

            setTimeout(() => { this.flagDoneButtonPressedOnce = true; }, 500);
        } else {
            this.continueButton.childNodes[0].style.removeProperty("animation");
            this.flagDoneButtonPressedOnce = false;
            if (this.warningTextForArmedButton) this.warningTextForArmedButton.remove();
            this.warningTextForArmedButton = undefined;
        }
    }

    finishQuestion() {
        let givenAnswers = this.answerArray.map(a => a.getValueObj());
        this.removableElements.forEach(e => e.remove());
        this.removableElements = [];
        this.returnFunc(givenAnswers);
    }

    translateElements(x, y) {
        this.topGroup.style.transform = `translate(${x}px, ${y}px)`;
    }
}

class RecallAnswer {
    constructor(controller, text, id, time) {
        this.controller = controller;
        this.text = text;
        this.id = id;
        this.time = time;
        this.removedByUser = false;

        this.answerDiv = document.createElement("div");
        this.answerDiv.classList.add("recall_input_answer_div");

        let answerText = document.createElement("p");
        answerText.classList.add("recall_input_answer_text");
        answerText.innerHTML = text;
        this.answerDiv.appendChild(answerText);

        let removeAnswerMark = document.createElement("p");
        removeAnswerMark.classList.add("recall_input_answer_remove");
        removeAnswerMark.innerHTML = "[x]";
        removeAnswerMark.onpointerdown = () => {
            this.answerDiv.remove();
            this.removedByUser = true;
            this.controller.numberOfAnswersChanged();
            AudioCont.play_sound_effect("close_menu");
        };

        this.answerDiv.appendChild(removeAnswerMark);
        this.controller.box.appendChild(this.answerDiv);
    }

    getValueObj() {
        return { ans: this.text, id: this.id, time: this.time, removedByUser: this.removedByUser };
    }
}

class CharacterCreationController {
    constructor(parent, mapUpdateFunc, worldState) {
        this.parent = parent;
        this.mapUpdateFunc = mapUpdateFunc;
        this.worldState = worldState;

        this.iconTranslateGroup = null;
        this.playerIconBox = null;
        this.buttonControllers = {};

        this.buttonDims = 115;
        this.labelX = 850;
        this.labelW = 330;
        this.xValsButtons = [1190.797, 1316.380, 1441.964, 1567.547];
        this.iconBoxDims = { x: 223, y: 218, w: 540, h: 640 };
        this.randomizeButtonYTop = 218;

        this.presets = {
            type: { label: "Gender", ytop: 348.614, options: { male: "male", female: "female" } },
            skin_color: { label: "Skin color", ytop: 479.489, options: { A: "#8d5524", B: "#e0ac69", C: "#f1c27d", D: "#ffdbac" } },
            hair_color: { label: "Hair color", ytop: 610.364, options: { A: "#fde8b6", B: "#c37c56", C: "#8a6030", D: "#341f0a" } },
            outfit: { label: "Outfit", ytop: 741.239, options: {
                    A: { shirt: "#fef4f7", jacket: "#258522", lapel: "#2c432b", pants: "#5d655e", shoes: "#5d1506" },
                    B: { shirt: "#e0e9f5", jacket: "#8a508d", lapel: "#642367", pants: "#ac9d93", shoes: "#784421" },
                    C: { shirt: "#ffcc00", jacket: "#d68b00", lapel: "#d63e00", pants: "#63a2d5", shoes: "#784421" },
                    D: { shirt: "#272626", jacket: "#aa0000", lapel: "#4d2413", pants: "#6d7d89", shoes: "#000000" }
                }}
        };

        this.createBasicElems();
        this.randomizeInputs();
        this.updatePlayerIconSVG();
    }

    buttonClicked(butType, butValue) {
        AudioCont.play_sound_effect("button_click");
        if (butType === "randomize") {
            this.randomizeInputs();
        } else {
            let notSelectedOptions = [];
            for (let key in this.buttonControllers[butType]) {
                const selected = this.buttonControllers[butType][key].getValue() === butValue;
                this.buttonControllers[butType][key].setSelectedState(selected);
                if (!selected) notSelectedOptions.push(key);
            }
            this.updateWorldStatePlayerIcon(butType, butValue);
            this.updateWorldStatePartnerIcon(butType, shuffleArray(notSelectedOptions)[0]);
        }
        this.updatePlayerIconSVG();
    }

    randomizeInputs() {
        for (let key in this.presets) {
            let options = shuffleArray(Object.keys(this.presets[key].options));
            this.updateWorldStatePlayerIcon(key, options[0]);
            this.updateWorldStatePartnerIcon(key, options[1]);
            for (let butKey in this.buttonControllers[key]) {
                this.buttonControllers[key][butKey].setSelectedState(this.buttonControllers[key][butKey].getValue() === options[0]);
            }
        }
    }

    updateWorldStatePlayerIcon(type, value) {
        if (type === "type" || type === "skin_color" || type === "hair_color") this.worldState.change_player_icon_settings(type, this.presets[type].options[value]);
        if (type === "outfit") for (let key in this.presets[type].options[value]) this.worldState.change_player_icon_settings(key, this.presets[type].options[value][key]);
    }

    updateWorldStatePartnerIcon(type, value) {
        if (type === "type" || type === "skin_color" || type === "hair_color") this.worldState.change_partner_icon_settings(type, this.presets[type].options[value]);
        if (type === "outfit") for (let key in this.presets[type].options[value]) this.worldState.change_partner_icon_settings(key, this.presets[type].options[value][key]);
    }

    updatePlayerIconSVG() {
        if (this.iconTranslateGroup) this.iconTranslateGroup.remove();
        let iconSVG = this.worldState.get_person_icon("player", "front");
        iconSVG.style.transform = "scale(20)";
        this.iconTranslateGroup = create_SVG_group(0, 0);
        this.iconTranslateGroup.appendChild(iconSVG);
        this.parent.appendChild(this.iconTranslateGroup);
        moveSVGCenterTo(this.iconTranslateGroup, this.playerIconBox.getBBox().x + 0.5 * this.playerIconBox.getBBox().width, this.playerIconBox.getBBox().y + 0.5 * this.playerIconBox.getBBox().height);
        this.mapUpdateFunc();
    }

    createBasicElems() {
        this.playerIconBox = create_SVG_rect(this.iconBoxDims.x, this.iconBoxDims.y, this.iconBoxDims.w, this.iconBoxDims.h);
        this.playerIconBox.style.rx = "50";
        this.playerIconBox.style.fill = "#FFFFFF99";
        this.parent.appendChild(this.playerIconBox);

        this.buttonControllers["randomize"] = { randomize: new CharacterCreationButton(this.parent, "randomize", false, this.labelX, this.randomizeButtonYTop, this.buttonDims, this.presets, (t, v) => this.buttonClicked(t, v)) };

        for (let type in this.presets) {
            this.buttonControllers[type] = {};
            let yval = this.presets[type].ytop;
            let count = 0;

            let labelBox = create_SVG_rect(this.labelX, yval, this.labelW, this.buttonDims);
            labelBox.style.fill = "gray";
            labelBox.style.opacity = 0.5;
            labelBox.style.rx = "25";
            labelBox.style.ry = "25";
            this.parent.appendChild(labelBox);

            let labelText = create_SVG_text_in_foreign_element(this.presets[type].label, this.labelX, yval, this.labelW, this.buttonDims);
            labelText.childNodes[0].style.fontSize = "50px";
            labelText.childNodes[0].style.textAlign = "center";
            labelText.childNodes[0].style.marginTop = "27px";
            this.parent.appendChild(labelText);

            for (let value in this.presets[type].options) {
                let xval = this.xValsButtons[count];
                count++;
                this.buttonControllers[type][value] = new CharacterCreationButton(this.parent, type, value, xval, yval, this.buttonDims, this.presets, (t, v) => this.buttonClicked(t, v));
            }
        }
    }
}

class CharacterCreationButton {
    constructor(parent, type, value, xTop, yTop, buttonDims, presets, pressFunc) {
        this.stateSelected = false;
        this.value = value;

        this.buttonRect = create_SVG_rect(xTop, yTop, buttonDims, buttonDims);
        parent.appendChild(this.buttonRect);
        this.buttonRect.classList.add("cc_button");
        this.buttonRect.onpointerdown = () => pressFunc(type, value);

        if (type === "randomize" || type === "type") {
            let buttonSVG = type === "randomize" ? document.getElementById("random_dice").cloneNode(true) : document.getElementById("cc_head_" + value).cloneNode(true);
            buttonSVG.style.display = "inherit";
            buttonSVG.style.pointerEvents = "none";

            let scaleGroup = create_SVG_group(0, 0);
            let translateGroup = create_SVG_group(0, 0);
            scaleGroup.appendChild(buttonSVG);
            translateGroup.appendChild(scaleGroup);
            parent.appendChild(translateGroup);

            scaleGroup.style.transform = "scale(1)";
            moveSVGCenterTo(translateGroup, this.buttonRect.getBBox().x + 0.5 * this.buttonRect.getBBox().width, this.buttonRect.getBBox().y + 0.5 * this.buttonRect.getBBox().height);
            this.buttonRect.style.fill = "goldenrod";
        } else {
            this.buttonRect.style.fill = type === "outfit" ? presets[type].options[value].jacket : presets[type].options[value];
        }
    }

    setSelectedState(bool) {
        this.stateSelected = bool;
        if (bool) {
            this.buttonRect.style.stroke = "#6495ED";
            this.buttonRect.style.strokeWidth = "8px";
        } else {
            this.buttonRect.style.stroke = "";
            this.buttonRect.style.strokeWidth = "";
        }
    }

    getValue() {
        return this.value;
    }
}

class QuestionnaireItem {
    constructor(parent, questionType, onChangeFunc) {
        this.questionType = questionType;

        let containerDiv = document.createElement("div");
        containerDiv.style.width = "100%";
        containerDiv.style.marginBottom = "20px";
        containerDiv.style.display = "flex";

        let questionDiv = document.createElement("div");
        questionDiv.style.width = "70%";
        questionDiv.style.fontSize = "35px";
        questionDiv.style.fontStyle = "italic";
        containerDiv.appendChild(questionDiv);

        let answerDiv = document.createElement("div");
        answerDiv.style.width = "30%";
        containerDiv.appendChild(answerDiv);
        parent.appendChild(containerDiv);

        let options;
        switch (questionType) {
            case "age":
                questionDiv.innerHTML = "What is your age?";
                this.inputObj = document.createElement("input");
                this.inputObj.type = "number";
                this.inputObj.min = 0;
                this.inputObj.max = 100;
                break;
            case "gender":
                questionDiv.innerHTML = "What gender do you identify as?";
                this.inputObj = document.createElement("select");
                options = ["man", "woman", "other", "don't want to say"];
                for (let i in options) {
                    let option = document.createElement("option");
                    option.value = options[i];
                    option.text = options[i];
                    this.inputObj.appendChild(option);
                }
                this.inputObj.value = "";
                break;
            case "colorblind":
                questionDiv.innerHTML = "Do you have any form of color-blindness?";
                this.inputObj = document.createElement("select");
                options = ["yes", "no", "don't know"];
                for (let i in options) {
                    let option = document.createElement("option");
                    option.value = options[i];
                    option.text = options[i];
                    this.inputObj.appendChild(option);
                }
                this.inputObj.value = "";
                break;
        }

        answerDiv.appendChild(this.inputObj);
        this.inputObj.style.width = "80%";
        this.inputObj.style.height = "90%";
        this.inputObj.style.fontSize = "35px";
        this.inputObj.style.textAlign = "center";
        this.inputObj.onchange = onChangeFunc;
    }

    getValue() {
        return this.inputObj.value;
    }

    getType() {
        return this.questionType;
    }
}

class PaymentCard {
    constructor(parent, dayData) {
        let paymentCardWidth = 0.15 * GenParam.SVG_width;
        let paymentCardHeight = 0.275 * GenParam.SVG_height;

        let cardDiv = document.createElement("div");
        cardDiv.style.width = paymentCardWidth + "px";
        cardDiv.style.height = paymentCardHeight + "px";
        cardDiv.style.marginLeft = "20px";

        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.borderRadius = "15px";

        // FIX: Updated from snake_case to camelCase to match DataController
        let starsHaveBeenEarned = dayData.starsEarned > 0;
        let isSummaryCard = dayData.dayType === "summary";
        let topText, cardTextColor;

        if (isSummaryCard) {
            topText = "Total Stars Earned";
            cardTextColor = "white";
            if (starsHaveBeenEarned) {
                svg.style.background = "darkgoldenrod";
                svg.style.border = "3px solid darkgoldenrod";
            } else {
                svg.style.background = "darkgray";
                svg.style.border = "3px solid darkgray";
            }
        } else {
            topText = "Day " + dayData.day;
            if (starsHaveBeenEarned) {
                svg.style.background = GenParam.background_fill_for_instructions_where_stars_can_be_earned;
                svg.style.border = "3px solid darkgoldenrod";
                cardTextColor = "darkgoldenrod";
            } else {
                svg.style.background = "#EEEEEE";
                svg.style.border = "3px solid darkgray";
                cardTextColor = "dimgray";
            }
        }

        cardDiv.appendChild(svg);
        parent.appendChild(cardDiv);
        AudioCont.play_sound_effect("thud");

        let dayText = create_SVG_text_elem(0.5 * paymentCardWidth, 0.15 * paymentCardHeight, topText, "instruction_element_text");
        dayText.style.textAnchor = "middle";
        dayText.style.fontSize = "35px";
        dayText.style.fill = cardTextColor;
        svg.appendChild(dayText);

        if (isSummaryCard) dayText.style.fontWeight = 900;
        else dayText.style.fontStyle = "italic";

        if (starsHaveBeenEarned) {
            showBonusStarOnScreen(svg, 0.35 * paymentCardWidth, 0.4 * paymentCardWidth, true, undefined, 1.1, undefined);
        } else {
            let newStar = showBonusStarOnScreen(svg, 0.35 * paymentCardWidth, 0.4 * paymentCardWidth, true, undefined, 1, undefined);
            let childrenPaths = newStar.getElementsByTagName("path");
            childrenPaths[0].style.fill = "lightgray";
            childrenPaths[0].style.stroke = "dimgray";
        }

        setTimeout(() => {
            // FIX: Updated from dayData.stars_earned to dayData.starsEarned
            let amountText = create_SVG_text_elem(0.5 * paymentCardWidth, 0.8 * paymentCardHeight, "×" + dayData.starsEarned, "instruction_element_text");
            amountText.style.textAnchor = "middle";
            amountText.style.fontSize = "90px";
            amountText.style.fontWeight = 700;
            amountText.style.fill = cardTextColor;
            svg.appendChild(amountText);
        }, 500);

        setTimeout(() => {
            // FIX: Updated from dayData.maximum_possible_stars to dayData.maximumPossibleStars
            let totalText = create_SVG_text_elem(0.4 * paymentCardWidth, 0.95 * paymentCardHeight, "(out of " + dayData.maximumPossibleStars + ")", "instruction_element_text");
            totalText.style.textAnchor = "middle";
            totalText.style.fontSize = "35px";
            totalText.style.fontStyle = "italic";
            totalText.style.fill = cardTextColor;
            svg.appendChild(totalText);
        }, 1000);
    }
}

class AnimatedStarburstStar {
    constructor(parent, startX, startY, endX, endY, timeOnScreen) {
        let icon = document.getElementById("icon_bonus_star_small").cloneNode(true);
        icon.removeAttribute("id");
        icon.classList.remove("interface_element");
        icon.classList.add("quiz_question_element");

        parent.appendChild(icon);
        MoveElemToCoords(icon, startX, startY);

        setTimeout(() => {
            icon.style.transition = `all ${timeOnScreen}ms ease-in-out`;
            icon.style.opacity = 0;
            MoveElemToCoords(icon, endX, endY);
        }, 5);

        setTimeout(() => icon.remove(), timeOnScreen + 200);
    }
}

function showBonusStarOnScreen(parent, centerX, centerY, showAnimatedStars, optionalClassName, optionalResizeFactor, optionalId) {
    let star = document.getElementById("icon_bonus_star").cloneNode(true);
    star.style.display = "inherit";
    star.style.opacity = 0;
    star.removeAttribute("id");
    star.classList.remove("interface_element");
    AudioCont.play_sound_effect("star_earned");

    if (optionalClassName) star.classList.add(optionalClassName);
    if (optionalId) star.id = optionalId;

    let zeroTransGroup = create_SVG_group(0, 0);
    let scaleGroup = create_SVG_group(0, 0);
    let transGroup = create_SVG_group(0, 0);

    zeroTransGroup.appendChild(star);
    scaleGroup.appendChild(zeroTransGroup);
    transGroup.appendChild(scaleGroup);
    parent.appendChild(transGroup);

    let baseCenter = getSVGInternalCenter(zeroTransGroup);
    zeroTransGroup.style.transform = `translate(${-baseCenter.x}px, ${-baseCenter.y}px)`;

    if (optionalResizeFactor !== undefined) scaleGroup.style.transform = `scale(${optionalResizeFactor})`;
    MoveElemToCoords(transGroup, centerX, centerY);

    let mainStarDelay = 0;
    if (showAnimatedStars) {
        for (let i = 0; i < 25; i++) {
            let xDelta = randomIntFromInterval(0, 500) * (shuffleArray([true, false])[0] ? -1 : 1);
            let yDelta = randomIntFromInterval(0, 500) * (shuffleArray([true, false])[0] ? -1 : 1);
            new AnimatedStarburstStar(parent, centerX + 0.1 * xDelta, centerY + 0.1 * yDelta, centerX + xDelta, centerY + yDelta, 1000);
        }
        mainStarDelay = 100;
    }

    setTimeout(() => {
        star.style.transition = "all 500ms ease-in-out";
        star.style.opacity = 1;
    }, mainStarDelay);

    return star;
}