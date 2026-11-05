/*
 * ARCHIVED snippet from 3_InstructionsController.js — not loaded.
 * Paste back as a method on the instructions controller.
 */

    initializeFeatureKitPilotInstructions(currentBlockNum, dayTitle, dayBody) {
        this.currentInstructionType = "feature_kit_pilot";
        this.clearInstructions();
        this.currentInstructionsSVG = this.createBasicInstructionElements();
        this.parentElem.appendChild(this.currentInstructionsSVG);
        this.parentElem.style.display = "inherit";

        let copy = (typeof GenParam !== "undefined" && GenParam.FeatureKitPilot) || {};
        if (this.expCont && this.expCont.currentPhaseType === "feature_kit_combo_pilot"
            && typeof GenParam !== "undefined" && GenParam.FeatureKitComboPilot) {
            copy = Object.assign({}, copy, GenParam.FeatureKitComboPilot);
        }
        if (this.expCont && this.expCont.currentPhaseType === "feature_kit_size_pilot"
            && typeof GenParam !== "undefined" && GenParam.FeatureKitSizePilot) {
            copy = Object.assign({}, copy, GenParam.FeatureKitSizePilot);
        }
        if (this.expCont && this.expCont.currentPhaseType === "feature_kit_fade_pilot"
            && typeof GenParam !== "undefined" && GenParam.FeatureKitFadePilot) {
            copy = Object.assign({}, copy, GenParam.FeatureKitSizePilot || {}, GenParam.FeatureKitFadePilot);
        }
        let title = dayTitle || copy.dayTitle || "Which heads look most alike?";
        document.getElementById("Instructions_Title").innerHTML = title;

        let body = dayBody || copy.dayBody ||
            "You'll see three heads. Which lower head looks more like the top one? Press F for the left head, J for the right.";
        this.textElemMainInstructions = create_SVG_text_in_foreign_element(
            body,
            0.12 * GenParam.SVG_width, 160,
            0.76 * GenParam.SVG_width,
            560,
            "instruction_element_text"
        );
        this.textElemMainInstructions.classList.add("instruction_element_nonbackground");
        this.textElemMainInstructions.getElementsByClassName("instruction_element_text")[0].style.fontSize = "32px";
        this.currentInstructionsSVG.appendChild(this.textElemMainInstructions);

        this.updateProgressNewDay(false);
        this.updateProgressWithinDay(false);
        this.addClosingButtonToParent("bottom-center", false, undefined, 800);
    }
