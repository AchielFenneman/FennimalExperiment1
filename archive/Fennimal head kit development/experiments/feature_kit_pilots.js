/*
 * ARCHIVED — not loaded by index.html.
 * Paste these keys back into 2_Stimulus_data.js to restore the four
 * kit stimulus pilots (1-vs-1, combo, size, fade).
 * Also restore tasks/4_FeatureKitPilotTask.js, params/feature_kit_pilot_genparam.js,
 * and the wiring snippets. See archive/MANIFEST.md.
 *
 * Live training (semantic_learning_kit) does not use these codes.
 * Its frozen heads live on GenParam.FeatureKitHeads.
 */

// All_Instructions_At_Start
        feature_kit_pilot: ["browser_check_and_full_screen_prompt", "consent", "single_sitting"],
        feature_kit_combo_pilot: ["browser_check_and_full_screen_prompt", "consent", "single_sitting"],
        feature_kit_size_pilot: ["browser_check_and_full_screen_prompt", "consent", "single_sitting"],
        feature_kit_fade_pilot: ["browser_check_and_full_screen_prompt", "consent", "single_sitting"],

// All_Fennimal_Sets — dummy roster so FeatureMap / the map can boot.
        feature_kit_pilot: {
            "P": { head: "A", region: "A" }
        },
        feature_kit_combo_pilot: {
            "P": { head: "A", region: "A" }
        },
        feature_kit_size_pilot: {
            "P": { head: "A", region: "A" }
        },
        feature_kit_fade_pilot: {
            "P": { head: "A", region: "A" }
        },

// All_Experiment_Structures
        feature_kit_pilot: [
            {
                type: "feature_kit_pilot",
                skip_instructions: false,
                skip_practice: false,
                partner_behavior: "absent",
                trial_speed: 7500,
                n_tokens_sampled: 3,
                n_duel_reps: 3,
                n_catch: 3,
                adaptive: true,
                exclude_slots: ["hair"]
            }
        ],
        feature_kit_combo_pilot: [
            {
                type: "feature_kit_combo_pilot",
                combo: true,
                skip_instructions: false,
                skip_practice: false,
                partner_behavior: "absent",
                trial_speed: 7500,
                n_tokens_sampled: 4,
                n_duel_reps: 2,
                n_catch: 3,
                n_adaptive_duels: 16,
                adaptive: true,
                exclude_slots: ["hair"]
            }
        ],
        feature_kit_size_pilot: [
            {
                type: "feature_kit_size_pilot",
                skip_instructions: false,
                skip_practice: false,
                partner_behavior: "absent",
                trial_speed: 7500,
                n_catch: 3,
                adaptive: false,
                exclude_slots: ["hair"]
            }
        ],
        feature_kit_fade_pilot: [
            {
                type: "feature_kit_fade_pilot",
                skip_instructions: false,
                skip_practice: false,
                partner_behavior: "absent",
                trial_speed: 7500,
                n_catch: 3,
                adaptive: false,
                exclude_slots: ["hair"]
            }
        ],

// All_Questionnaire_Page_sets
        feature_kit_pilot: [],
        feature_kit_combo_pilot: [],
        feature_kit_size_pilot: [],
        feature_kit_fade_pilot: ["demographics_questionnaire"],

// All_Forced_Head_Lists
        feature_kit_pilot: ["bell"],
        feature_kit_combo_pilot: ["bell"],
        feature_kit_size_pilot: ["bell"],
        feature_kit_fade_pilot: ["bell"],
