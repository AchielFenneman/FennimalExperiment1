/*
 * ARCHIVED snippets from 3_InstructionsController.js — not loaded.
 */

    initializeChimeraFeatureIdInstructions(currentBlockNum, dayTitle, dayBody) {
        this.currentInstructionType = "chimera_feature_id";
        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";

        let chimeraCopy = (typeof GenParam !== "undefined" && GenParam.ChimeraFeatureId) || {};
        let title = dayTitle || chimeraCopy.dayTitle || "photos from this morning";
        document.getElementById("Instructions_Title").innerHTML = `Day ${currentBlockNum}: ${title} (BONUS STAR DAY)`;
        document.getElementsByClassName("instructions_element_background")[0].style.fill =
            GenParam.background_fill_for_instructions_where_stars_can_be_earned;
        document.getElementsByClassName("instructions_element_cover")[0].style.fill =
            GenParam.background_fill_for_instructions_where_stars_can_be_earned;

        let body = dayBody || chimeraCopy.dayBody || (
            "This morning's polaroids are still developing. Some shots are close-ups; others show more of the Fennimal. The picture takes a moment to appear."
        );
        this.textElemMainInstructions = create_SVG_text_in_foreign_element(
            body + "<br><br><br><br><br>",
            0.12 * GenParam.SVG_width, 140,
            0.76 * GenParam.SVG_width,
            620,
            "instruction_element_text"
        );
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "34px";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

        setTimeout(() => {
            showBonusStarOnScreen(
                this.parentElem,
                0.5 * GenParam.SVG_width,
                0.62 * GenParam.SVG_height,
                true,
                "deletable_bonus_star",
                1,
                undefined
            );
        }, 300);

        this.updateProgressNewDay(currentBlockNum);
        this.updateProgressWithinDay(false);
        const deleteBonusStarIcons = () => {
            Array.from(document.getElementsByClassName("deletable_bonus_star")).forEach((s) => s.remove());
        };
        this.addClosingButtonToParent("bottom-center", false, deleteBonusStarIcons, 1300);
    }

    initializeMorphHeadPilotInstructions(currentBlockNum, dayTitle, dayBody) {
        this.showEmptyPage(false);
        this.currentInstructionType = "morph_head_pilot";

        let copy = (typeof GenParam !== "undefined" && GenParam.MorphHeadPilot) || {};
        let title = dayTitle || copy.dayTitle || "Your task";
        document.getElementById("Instructions_Title").innerHTML = title;

        let body = dayBody || copy.dayBody || (
            "On each trial you will see a picture that mixes two heads. Press F or J to choose which head it looks more like."
        );
        this.textElemMainInstructions = create_SVG_text_in_foreign_element(
            body,
            0.12 * GenParam.SVG_width, 180,
            0.76 * GenParam.SVG_width,
            520,
            "instruction_element_text"
        );
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "36px";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

        this.addClosingButtonToParent("bottom-center", false, undefined, 1300);
    }

    initializeHatDropInstructions(currentBlockNum, dayTitle, dayBody, phaseType) {
        this.currentInstructionType = phaseType || "hat_drop_task";
        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";

        let copy = (typeof GenParam !== "undefined" && GenParam.HatDrop) || {};
        let isGng = phaseType === "hat_drop_gonogo";
        let title = dayTitle || (isGng ? copy.gngDayTitle : copy.dayTitle) || "the warehouse chute";
        document.getElementById("Instructions_Title").innerHTML = `Day ${currentBlockNum}: ${title} (BONUS STAR DAY)`;
        document.getElementsByClassName("instructions_element_background")[0].style.fill =
            GenParam.background_fill_for_instructions_where_stars_can_be_earned;
        document.getElementsByClassName("instructions_element_cover")[0].style.fill =
            GenParam.background_fill_for_instructions_where_stars_can_be_earned;

        let body = dayBody || (isGng ? copy.gngDayBody : copy.dayBody) || (
            "Hats are coming down the warehouse chute. Move the sled so each hat lands in the box you choose."
        );
        this.textElemMainInstructions = create_SVG_text_in_foreign_element(
            body + "<br><br><br><br><br>",
            0.12 * GenParam.SVG_width, 140,
            0.76 * GenParam.SVG_width,
            620,
            "instruction_element_text"
        );
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "32px";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

        setTimeout(() => {
            showBonusStarOnScreen(
                this.parentElem,
                0.5 * GenParam.SVG_width,
                0.70 * GenParam.SVG_height,
                true,
                "deletable_bonus_star",
                1,
                undefined
            );
        }, 300);

        this.updateProgressNewDay(currentBlockNum);
        this.updateProgressWithinDay(false);
        const deleteBonusStarIcons = () => {
            Array.from(document.getElementsByClassName("deletable_bonus_star")).forEach((s) => s.remove());
        };
        this.addClosingButtonToParent("bottom-center", true, deleteBonusStarIcons, 1300);
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

