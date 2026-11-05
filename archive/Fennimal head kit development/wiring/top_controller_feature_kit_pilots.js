/*
 * ARCHIVED snippets from 2_Top_controller.js — not loaded.
 * Paste back into ExperimentController. Also add these four strings to
 * getKnownPhaseTypes(), and load tasks/4_FeatureKitPilotTask.js from index.html.
 */

// getKnownPhaseTypes()
            "feature_kit_pilot",
            "feature_kit_combo_pilot",
            "feature_kit_size_pilot",
            "feature_kit_fade_pilot",

// startNextExperimentPhase switch
            case "feature_kit_pilot":
            case "feature_kit_combo_pilot":
            case "feature_kit_size_pilot":
            case "feature_kit_fade_pilot":
                this.flagFeatureKitPilotInstructionsShown = false;
                if (this.currentPhaseData.skip_instructions === true) {
                    this.flagFeatureKitPilotInstructionsShown = true;
                    this.setupFeatureKitPilotPhase();
                } else {
                    this.instrCont.initializeFeatureKitPilotInstructions(
                        this.currentDayNum,
                        this.currentPhaseData.day_title,
                        this.currentPhaseData.day_body
                    );
                }
                break;

    setupFeatureKitPilotPhase() {
        this.mapCont.disable_map_interactions();
        if (this.mapCont.hide_request_instructions_button) this.mapCont.hide_request_instructions_button();
        document.getElementById("Map").style.display = "none";
        let iface = document.getElementById("Interface");
        if (iface) iface.style.display = "inherit";
        if (typeof Interface !== "undefined" && Interface.FenneFinder && Interface.FenneFinder.hide) {
            Interface.FenneFinder.hide();
        }

        this.currentPhaseData.Data = [];
        let pLayer = document.getElementById("Fennimals_Layer");
        if (pLayer) pLayer.style.display = "inherit";
        if (this.mapCont && this.mapCont.Map_Layer) this.mapCont.Map_Layer.style.display = "none";
        this.mapCont.hide_all_locations();
        this.mapCont.currently_in_location = false;

        let currentTask = new FeatureKitPilotController(
            pLayer,
            this.currentPhaseData,
            () => {
                this.currentPhaseData.Data = this.currentPhaseData.answers || [];
                currentTask.clean_up();
                this.featureKitPilotCont = null;
                clear_Fennimals_interaction_layer();
                document.getElementById("Map").style.display = "inherit";
                this.phaseCompleted();
            },
            this
        );
        this.featureKitPilotCont = currentTask;
        currentTask.start_sequence();
    }

// instruction-closed resume switch
            case "feature_kit_pilot":
            case "feature_kit_combo_pilot":
            case "feature_kit_size_pilot":
            case "feature_kit_fade_pilot":
                if (!this.flagFeatureKitPilotInstructionsShown) {
                    this.flagFeatureKitPilotInstructionsShown = true;
                    this.setupFeatureKitPilotPhase();
                }
                break;
