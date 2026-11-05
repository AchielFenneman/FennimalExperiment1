/*
 * ARCHIVED — not loaded by index.html.
 * Paste the relevant keys back into 2_Stimulus_data.js to restore.
 * See archive/MANIFEST.md.
 */

// Instructions_at_start.semantic_learning
semantic_learning: ["browser_check_and_full_screen_prompt", "consent", "single_sitting", "character_creation", "overview"],

// All_Fennimal_Sets.semantic_learning
        semantic_learning: {
            "A": { head: "A", region: "A", hat: "A" },
            "B": { head: "A", region: "B", hat: "B" },
            "C": { head: "C", region: "B", hat: "C" },
            "D1": { head: "D", region: "D", hat: "D" },
            "D2": { head: "E", region: "E", hat: "E" },
            
           
        },

// All_Experiment_Structures.semantic_learning
        semantic_learning: [

            // TRAINING PHASE
            // Block 1: free exploration — photograph each Fennimal; polaroid introduces the name
            {
                type: "free_exploration",
                interaction_type: ["photo_Fennimal"],
                Fennimals_encountered: ["A", "B", "C", "D1", "D2"],
                partner_behavior: "absent",
                include_Fennefinder: true,
                force_climbing_tower_first: true,
                introduce_name_on_polaroid: true
            },
            
            // Blocks 2–4 in one phone-room day: hide_and_seek, hat_laundry, hat_blown_away
            // (cartesian: one trial per Fennimal × each interaction_type, then smart-shuffled)
            {
                type: "hint_and_search",
                hint_type: "name",
                interaction_type: ["hide_and_seek_Fennimal"],
                Fennimals_encountered: ["A", "B", "C", "D1", "D2"],
                partner_behavior: "absent",
                include_Fennefinder: true,
                ask_Fennimal: true,
                ask_name: false,
                ask_hat: false
            },
            {
                type: "phone_room",
                interaction_type: [ "hat_laundry", "hat_blown_away"],
                Fennimals_encountered: ["A", "B", "C", "D1", "D2"],
                partner_behavior: "absent",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: true,
                ask_Fennimal: true,
                ask_name: true,
                ask_hat: true
            },



            // QUIZ
            {type: "Fennimal_attribute_sorting_task",
                Fennimals_asked: ["A", "B", "C", "D1", "D2"],
                attribute_order: ["region", "head", "hat"],
                presentation: "single",
                maximum_earnable_stars: 5,
                pass_if_errors_at_most: 3,
                max_attempts: 3,
                on_fail: {
                    type: "phone_room",
                    interaction_type: "photo_Fennimal",
                    partner_behavior: "absent",
                    include_Fennefinder: false,
                    return_to_phone_room_after_final_trial: true,
                    skip_instructions: true,
                    ask_hat: true
                }
            },

            //BINDING PHASE
            {type: "hat_binding_task",
                skip_instructions: false,
                randomization_id: "binding_search_condition",
                // Weighted by duplicates. One value is drawn per participant and persisted.
                condition: ["group_based", "control"], //["group_based", "pair_based", "control"],
                retraining_fennimals: ["A", "B", "C", "D1", "D2"],
                // true = gistDescriptions for that linking feature; anything else = generic names.
                use_head_gist_descriptions: true,
                use_region_gist_descriptions: false,
                use_toy_gist_descriptions: false,
                blocks: [
                    {
                        kind: "binding",
                        flavour: "lost_and_found",
                        cover_story: "Oh no, the Fennimals have lost their hats! Let's help return these hats to their correct owner. Unfortunately, the post office forgot to print the names on the boxes. Instead, we need to rely on your memories. One hat at a time, we will give you a description of a Fennimal. First, answer a few questions to help you picture that Fennimal. Then place this Fennimal's hat in the shipping box."
                    },
                    {
                        kind: "retraining",
                        cover_story: "Let's double-check that we can still match each Fennimal to their hat. You will see a photo of a Fennimal — pick the hat that belongs to them."
                    },
                    {
                        kind: "binding",
                        flavour: "laundry",
                        cover_story: "It's laundry day! All the Fennimals have had their hats washed and dried. Unfortunately, the name-tags also got washed and are now unusable. Instead, you will have to help match a new tag to the correct hat. First, answer a few questions to help you picture the Fennimal. Then place the tag on that Fennimal's hat."
                    },
                    {
                        kind: "retraining",
                        cover_story: "Another quick check: match each Fennimal to their hat."
                    },
                    {
                        kind: "binding",
                        flavour: "gift_shop",
                        cover_story: "Let's buy some new hats for the Fennimals! One hat at a time, we will give you a description of a Fennimal. First, answer a few questions to help you picture that Fennimal. Then place a new version of this Fennimal's hat in the shopping cart."
                    }
                ]
            },

            //TEST PHASE
            {type: "name_recall_task",
                bonus_stars_per_correct_answer: 1,
                allowed_Levenshtein_distance_for_match: 2
            },
            {type: "chimera_feature_id",
                skip_instructions: false,
                skip_practice: false,
                partner_behavior: "absent",
                // "blur-silhouette" | "patchy-holes" | "patchy-holes-with-pixalation"
                // patchy-holes ≈ Gosselin & Schyns (2001, Vision Research) "bubbles"
                // Curve: GenParam.ChimeraFeatureId.revealProfile. Backup: reveal_profile: "steep"
                reveal_mode: "patchy-holes-with-pixalation",
                trial_speed: 7500,
                // Lead-lag is NOT a block field. Prime prints by primeEndFrac of
                // trial_speed; the questioned part stays veiled until targetLagFrac
                // (GenParam.ChimeraFeatureId). Logged RTs: reaction_time_ms from "?"
                // and reaction_time_from_target_onset_ms from target print.
                names_options: ["A", "B", "C", "D1", "D2"],
                // region / head / object / answer are Fennimal ids.
                // region: "neutral" = close-up (no body). object: "none" = no hat.
                // Block 1 (shuffled): true-head polaroids, one per name.
                // Block 2 (shuffled): keys + leftover fillers.
                trials: [
                    { id: "Face_A", region: "A", head: "A", object: "none", q: "Whose head?", answer: "A", role: "true_head", kind: "face" },
                    { id: "Face_B", region: "B", head: "B", object: "none", q: "Whose head?", answer: "B", role: "true_head", kind: "face" },
                    { id: "Face_C", region: "C", head: "C", object: "none", q: "Whose head?", answer: "C", role: "true_head", kind: "face" },
                    { id: "Face_D1", region: "D1", head: "D1", object: "none", q: "Whose head?", answer: "D1", role: "true_head", kind: "face" },
                    { id: "Face_D2", region: "D2", head: "D2", object: "none", q: "Whose head?", answer: "D2", role: "true_head", kind: "face" },
                    { id: "S1", region: "A", head: "C", object: "none", q: "Whose head?", answer: "C", role: "test_mixup", kind: "key" },
                    { id: "S4", region: "neutral", head: "C", object: "A", q: "Whose hat?", answer: "A", role: "test_card", kind: "key" },
                    { id: "Fill_C", region: "B", head: "A", object: "none", q: "Whose head?", answer: "B", role: "filler_B_same_face", kind: "filler" },
                    { id: "Fill_E", region: "neutral", head: "A", object: "B", q: "Whose hat?", answer: "B", role: "filler_trained_card", kind: "filler" }
                ]
                // Day card copy: GenParam.ChimeraFeatureId.dayTitle / dayBody
                // Reveal curve: GenParam.ChimeraFeatureId.revealProfile ("lingering").
                // Backup of the old punchy curve: reveal_profile: "steep"
            },
            {type: "hat_drop_task",
                skip_instructions: false,
                skip_practice: false,
                partner_behavior: "absent",
                // Testing gates — bump n_reps to add extra full passes.
                // Rep 1 uses instruction_order as written; extra reps rotate
                // that order (Latin square) and reshuffle trials inside each subblock.
                n_reps: 1,
                instruction_order: ["most_similar", "cousin", "neighbour"],
                min_points: 25,
                max_points: 100,
                total_fall_time: 2000,
                // Cue hat sits in the chute window, then is sucked in; boxes stay covered until then.
                preview_ms: 1000,
                preview_travel_ms: 320,
                // Trial dropped/correct/lure are Fennimal ids.
                // 2AFC: dropped = falling hat; correct = Box 1 (paid); lure = Box 2.
                // Left/right of correct vs lure is counterbalanced in the controller.
                //TODO: CHECK TRIALS FOR CORRECTNESS
                trials: [
                    { id: "MS1", instruction: "most_similar", dropped: "A", correct: "C", lure: "D2", role: "help_test" },
                    { id: "MS2", instruction: "most_similar", dropped: "C", correct: "A", lure: "D1", role: "help_reverse" },
                   
                    { id: "C1", instruction: "cousin", dropped: "A", correct: "B", lure: "C", role: "hurt_lure_endpoint" },
                    { id: "N1", instruction: "neighbour", dropped: "C", correct: "B", lure: "A", role: "hurt" },
                    { id: "C2", instruction: "cousin", dropped: "A", correct: "B", lure: "D2", role: "easy_cousin" },
                    { id: "N2", instruction: "neighbour", dropped: "C", correct: "B", lure: "D2", role: "easy_neighbour" }
                ]
                // Day card copy: GenParam.HatDrop.dayTitle / dayBody
            },
            {type: "hat_drop_gonogo",
                skip_instructions: false,
                skip_practice: false,
                partner_behavior: "absent",
                n_reps: 1,
                instruction_order: ["neighbour", "cousin"],
                min_points: 25,
                max_points: 100,
                total_fall_time: 2000,
                // Cue hat sits in the chute window, then is sucked in; boxes stay covered until then.
                preview_ms: 1000,
                preview_travel_ms: 320,
                // Region block = neighbour instruction; Head block = cousin instruction.
                // correct: "go" = keep box under chute; "nogo" = slide it aside.
                trials: [
                    // Region (neighbour)
                    { id: "R01", instruction: "neighbour", dropped: "A", box: "C", correct: "nogo", role: "hurt" },
                    { id: "R02", instruction: "neighbour", dropped: "C", box: "A", correct: "nogo", role: "hurt_reverse" },
                
                    { id: "R05", instruction: "neighbour", dropped: "A", box: "B", correct: "nogo", role: "secondary_hurt_cousins_as_neighbours" },
                    { id: "R06", instruction: "neighbour", dropped: "B", box: "A", correct: "nogo", role: "secondary_hurt_reverse" },
                    { id: "R07", instruction: "neighbour", dropped: "B", box: "C", correct: "go", role: "neighbour_spoke" },
                    { id: "R08", instruction: "neighbour", dropped: "C", box: "B", correct: "go", role: "neighbour_spoke_reverse" },
                    // Head (cousin)
                    { id: "H01", instruction: "cousin", dropped: "A", box: "B", correct: "go", role: "cousin_spoke" },
                    { id: "H02", instruction: "cousin", dropped: "B", box: "A", correct: "go", role: "cousin_spoke_reverse" },
                    { id: "H03", instruction: "cousin", dropped: "A", box: "C", correct: "nogo", role: "hurt_not_cousins" },
                    { id: "H04", instruction: "cousin", dropped: "C", box: "A", correct: "nogo", role: "hurt_not_cousins_reverse" },
                
                    { id: "H07", instruction: "cousin", dropped: "B", box: "C", correct: "nogo", role: "secondary_hurt_neighbours_as_cousins" },
                    { id: "H08", instruction: "cousin", dropped: "C", box: "B", correct: "nogo", role: "secondary_hurt_reverse" }
                ]
                // Day card copy: GenParam.HatDrop.gngDayTitle / gngDayBody
            },
            
            

            
        ],

// Questionnaire + forced heads
semantic_learning: ["demographics_questionnaire"],
semantic_learning: ["astro", "cupcake", "tube", "tv", "jackolantern", "elephant", "blockhead", "parrot"],
