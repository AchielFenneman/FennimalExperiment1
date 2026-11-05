let StimulusSettings = function () {

    this.Experiment_Code = ["mentalizing_exp1"];
    // Live default: mentalizing_exp1. Open http://localhost:3000 with no query.
    // Other codes: mentalizing_exp2 | mentalizing_between_subjects | test | semantic_learning_star | semantic_learning_kit.
    // mentalizing_exp2: 3 Fennimals. Day 2 is broken toy, workshop X/Y/Z, then play.
    // Then warehouse (toy A into sack A, sack into box X), lost box, then the swap.
    // Lost-box arms are equal weight: boost A | neutral C | cost B.
    //   ?EXP=mentalizing_exp2
    //   ?EXP=mentalizing_exp2&CONDITION=boost|neutral|cost
    // The measurement-preview shortcut stays on mentalizing_between_subjects.
    // Override (no file edit): ?EXP=mentalizing_between_subjects&SKIP_INTRO=1
    // mentalizing_exp1 learning phone room (broken toy, then workshop, then play):
    //   ?EXP=mentalizing_exp1&SKIP_INTRO=1&SKIP_TO_PHASE=phone_room
    // Warehouse arm. CONDITION forces the between-subjects draw (otherwise weights apply):
    //   baseline | enhanced_mentalizing | enhanced_inference_error | enhanced_retrieval_error
    //   ?EXP=mentalizing_exp1&SKIP_TO_INTERACTION=warehouse_cleanup&CONDITION=baseline
    //   &FENNIMAL=A|B picks that Fennimal's cleanup. &PARTNER_LEAVES=1 picks the swap.
    // One warehouse call is one move. toy+box is the participant placing that toy.
    // Measurement preview (encoding seeded, not played). Set false, or open ?FULL=1, for the full session.
    // Lost-box arm: ?CONDITION=boost | neutral | cost (also on a full or decoration run).
    // Decoration capture: ?SEED=slides03&SKIP_TO_DECORATION=1&CONDITION=boost|neutral|cost
    const START_MENTALIZING_AT_MEASUREMENT = true;
    // Binding dropdown sandbox: ?EXP=test&SEED=headdrop01
    // Overlay-fade morph sandbox: ?EXP=test&SKIP_TO_PHASE=morph_task
    // Jump to morph (software QA): &SKIP_TO_PHASE=morph_task
    // Archived kit pilots: archive/Fennimal head kit development/ (see archive/MANIFEST.md)

    // Two names per frozen head (A and B share a recipe; C and D each use one).
    // Head-linked for memorability; gist still uses the overlay family labels.
    // H1 mechanical, H2 sweet, H3 sea (see GenParam.FeatureKitHeads.frozenHeads).
    const KIT_HEAD_NAMES = {
        H1: ["Tinker", "Crank"],
        H2: ["Frosty", "Snack"],
        H3: ["Clammy", "Pearl"],
        // Theme aliases so names stay tied to family if recipe ids shift.
        mechanical: ["Tinker", "Crank"],
        sweet: ["Frosty", "Snack"],
        sea: ["Clammy", "Pearl"]
    };

    // Frozen H1/H2/H3 overlay families, shuffled onto head codes {B, C, D}.
    // A clones B's recipe (shared head). Hair is "none" so hats cannot hide a slot.
    // Scales stay at baseline. Live families: mechanical, sweet, sea.
    const KIT_HEADS = (typeof GenParam !== "undefined" && GenParam.FeatureKitHeads) || {};
    const KIT_BASELINE_SCALES = Object.assign(
        { ear: 1, eye: 1, lowerFace: 1, hair: 1, stamp: 1 },
        KIT_HEADS.baselineScales || {}
    );
    const KIT_RECIPES = (KIT_HEADS.frozenHeads || []).map((head) => Object.assign({}, head, {
        expression: head.expression || "happy",
        pack: "baseline",
        scales: Object.assign({}, KIT_BASELINE_SCALES, head.scales || {})
    }));
    if (KIT_RECIPES.length < 3) {
        throw new Error("semantic_learning_kit needs GenParam.FeatureKitHeads.frozenHeads (H1/H2/H3).");
    }

    // Overlay-fade leftover-of-trio: C vs D parents, mix = percent of target.
    // Unique frills use 0.3+0.7*w so a 50/50 unique token sits at 0.65 opacity.
    // Leftover-A primes only (no empty-prime trials): 8 × 50/50, 4 × 60/40
    // (2 each polarity), 4 × 70/30 (2 each polarity), plus 4 C/D-prime
    // pattern-breakers at 50 = 20 paid.
    const KIT_OVERLAY_FADE_MIXES = [50, 60, 70];

    function buildKitOverlayFadeTrials() {
        const kitTrial = (id, mix, target, prime, extra) => Object.assign({
            id: id,
            fenA: "C",
            fenB: "D",
            target: target,
            mix: mix,
            morph: "overlay_fade",
            jumble_source: "feature_kit",
            p_design: "overlay_fade",
            kit_mix_id: "m" + mix + "_t" + target,
            prime: prime
        }, extra || {});

        let trials = [];
        const repsAt = { 50: 4, 60: 2, 70: 2 };
        KIT_OVERLAY_FADE_MIXES.forEach((mix) => {
            let nReps = repsAt[mix] || 1;
            ["C", "D"].forEach((target) => {
                for (let r = 1; r <= nReps; r++) {
                    trials.push(kitTrial("kit_fade_m" + mix + "_t" + target + "_A_" + r, mix, target, "A"));
                }
            });
        });
        ["C", "D"].forEach((target) => {
            for (let r = 1; r <= 2; r++) {
                trials.push(kitTrial(
                    "kit_fade_m50_t" + target + "_" + target + "_" + r,
                    50,
                    target,
                    target,
                    { kind: "pattern_breaker", role: "pattern_breaker" }
                ));
            }
        });
        return trials;
    }

    const All_Instructions_At_Start = {
        test: [],
        semantic_learning_star: [], //"browser_check_and_full_screen_prompt", "consent", "single_sitting", "character_creation", "overview"
        semantic_learning_kit: ["browser_check_and_full_screen_prompt", "consent", "single_sitting", "character_creation"],
        mentalizing_between_subjects: ["browser_check_and_full_screen_prompt", "consent", "single_sitting", "character_creation", "overview", "partner_introduction"],
        mentalizing_exp2: ["browser_check_and_full_screen_prompt", "consent", "single_sitting", "character_creation", "overview", "partner_introduction"],
        mentalizing_exp1: ["browser_check_and_full_screen_prompt", "consent", "single_sitting", "character_creation", "overview", "partner_introduction"],
    };

    // ----------------------------------------------------
    // DICTIONARY OF FENNIMAL TEMPLATES
    // Key: The unique Fennimal ID
    // Value: The required and optional properties
    //
    // ID / toybox notes (mentalizing / partner-belief experiments):
    //   - Shared `toybox` codes mark co-box mates (sack probes / design);
    //     box→Fennimal memory probes exclude co-box mates from options.
    //   - Optional "S*" / "P*" prefixes still mark shared vs private waves
    //     (prompt wording + preferred same-wave foils). Non-S/P IDs (e.g. A–E)
    //     use the generic box prompt and other-box / other-toy foils.
    // ----------------------------------------------------
    const All_Fennimal_Sets = {
        semantic_learning_star: {
            "A": { head: "B", region: "A", toy: "A", hat: "A" },
            "B": { head: "B", region: "B", toy: "B", hat: "B" },
            "C": { head: "C", region: "B", toy: "C", hat: "C"},
            "D": { head: "D", region: "D", toy: "B", hat: "D" },
        },

        // Same star graph as semantic_learning_star: A and B share head B.
        semantic_learning_kit: {
            "A": { head: "B", region: "A", toy: "A", hat: "A" },
            "B": { head: "B", region: "B", toy: "B", hat: "B" },
            "C": { head: "C", region: "B", toy: "C", hat: "C" , food_preference: "C" },
            "D": { head: "D", region: "D", toy: "B", hat: "D" , food_preference: "D"},
        },

        // One warehouse box (code X) is named by the cleanup trials, not owned here.
        mentalizing_exp1: {
            "A": { head: "A", region: "A", toy: "A" },
            "B": { head: "B", region: "B", toy: "B" },
        },

        mentalizing_between_subjects: {
            "A": { head: "A", region: "A", toy: "A", toybox: "A", sack: "A" },
            "B": { head: "B", region: "B", toy: "B", toybox: "A" },
            "C": { head: "C", region: "C", toy: "C" },
          
        },

        // Sack A is Fennimal A's. Box X is the warehouse box, named on the cleanup trials.
        mentalizing_exp2: {
            "A": { head: "A", region: "A", toy: "A", sack: "A" },
            "B": { head: "B", region: "B", toy: "B" },
            "C": { head: "C", region: "C", toy: "C" },
        },

    };

    let All_Experiment_Structures = {
        mentalizing_exp1: [
            
            // BLOCK 1: meet Fennimals A and B (different head, region, and toy).
            {
                type: "free_exploration",
                interaction_type: ["Fennimal_toy"],
                Fennimals_encountered: ["A", "B"],
                partner_behavior: "active",
                include_Fennefinder: true,
                force_climbing_tower_first: true
            },
            
            
            // BLOCK 2: repair each Fennimal's toy, workshop toys X/Y/Z, then play.
            // Fennimal order is shuffled inside each of those subblocks.
            {
                type: "phone_room",
                partner_behavior: "active",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: false,
                ask_Fennimal: true,
                ask_toy: true,
                ask_box: false,
                trial_subblocks: [
                    {
                        Fennimals_encountered: ["A", "B"],
                        interaction_type: "broken_toy_no_box"
                    },
                   
                    {
                        Fennimals_encountered: ["A", "B"],
                        interaction_type: "Fennimal_toy"
                    }
                ]
            },


            // BLOCK 3: one warehouse box (code X). Two cleanups.
            // Trial 1: partner stays and the box is filled.
            // Trial 2: partner is in the room with the new toy, then leaves, then the swap.
            // One condition is drawn per participant (weight defaults to 1; relative weights).
            // The drawn label is stored on this phase and on both cleanup trials.
            {
                type: "phone_room",
                partner_behavior: "active",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: false,
                skip_instructions: false,
                randomization_id: "warehouse_manipulation",
                conditions: [
                    {
                        label: "baseline",
                        weight: 1,
                        trial_subblocks: [
                            { interaction_type: "warehouse_cleanup", toy: "A", box: "X" },
                            { interaction_type: "warehouse_cleanup", toy: "B", box: "X", partner_leaves_during_interaction: true }
                        ]
                    },/*
                    {
                        label: "enhanced_mentalizing",
                        weight: 1,
                        trial_subblocks: [
                            { interaction_type: "warehouse_cleanup", toy: "A", box: "X" },
                            { interaction_type: "warehouse_cleanup", Fennimal: "B", box: "X", partner_leaves_during_interaction: true }
                        ]
                    },
                    */
                    {
                        label: "enhanced_inference_error",
                        weight: 1,
                        trial_subblocks: [
                            { interaction_type: "warehouse_cleanup", Fennimal: "A", box: "X" },
                            { interaction_type: "warehouse_cleanup", toy: "B", box: "X", partner_leaves_during_interaction: true }
                        ]
                    },
                    {
                        label: "enhanced_retrieval_error",
                        weight: 1,
                        trial_subblocks: [
                            { interaction_type: "warehouse_cleanup", Fennimal: "A", box: "X" },
                            { interaction_type: "warehouse_cleanup", Fennimal: "B", box: "X", partner_leaves_during_interaction: true }
                        ]
                    }
                ]
            },

            // BLOCK 3B: 
            {
                type: "phone_room",
                partner_behavior: "active",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: false,
                ask_Fennimal: true,
                ask_toy: true,
                ask_box: false,
                trial_subblocks: [
                    {
                        interaction_type: "broken_toy_workshop",
                        toys: ["X", "Y", "Z"]
                    },
                  
                ]
            },



            // BLOCK 4: belief about box X, then whether the partner knows the contents,
            // then what is actually in the box, then Fennimal→toy probes.
            // Practice is shape then color. A shape match precedes the belief question,
            // another shape match precedes the knowledge question, and a color match
            // precedes the reality question. The knowledge question is before the
            // "partner has left" screen. Options are Yes / No / I don't know; only No
            // is correct.
            // Belief and reality options are every experiment toy (A, B, X, Y, Z) plus empty.
            // Fennimal→toy probes use that same toy set, without the empty option.
            {
                type: "partner_belief_individual_boxes",
                include_practice_trial: true,
                include_partner_knowledge_trial: true,
                num_belief_blocks: 1,
                include_reality_block_at_end: true,
                include_empty_box_choice_alternative: true,
                bonus_stars_per_correct_answer: 1,
                memory_probe_isi_ms: 1000,
                questions: [
                    { question_id: "belief_X", target_box: "X" },
                    { kind: "memory_probe_fennimal_to_toy", toy_options: "all" }
                ]
            },

        ],

        mentalizing_between_subjects: [
            
            // BLOCK 1: Introduction to all Fennimals
            {
                type: "free_exploration",
                interaction_type: ["Fennimal_toy"],
                Fennimals_encountered: ["A", "B", "C"],
                partner_behavior: "active",
                include_Fennefinder: true,
                force_climbing_tower_first: true
            },
            
            
            // BLOCK 2: 
            // 1) Fennimal->toy, 
            // 2) toy -> sack, 
            // 3) sack -> box, 
            // 4) Fennimal-box [manipulation]
            {
                type: "phone_room",
                partner_behavior: "active",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: false,
                ask_Fennimal: true,
                ask_toy: true,
                ask_box: true,
                trial_subblocks: [
                    // 1) Fennimal->toy, 
                    
                    {
                        Fennimals_encountered: ["A", "B", "C"],
                        interaction_type: "broken_toy_no_box"
                    },
                    
                    {
                        Fennimals_encountered: ["A", "B", "C"],
                        interaction_type: "Fennimal_toy"
                    },
                   
                    // 2) toy -> sack, 
                    {
                        Fennimals_encountered: ["A"],
                        interaction_type: "toy_to_sack"
                    },
                    // 3) sack -> box, 
                    {
                        Fennimals_encountered: ["A"],
                        interaction_type: "sack_to_box"
                    },
                
                   
                ]
            },

            //Block 3: Lost box (manipulation) — between-subjects: one of these options
            {
                type: "retrieve_lost_box",
                n_trials_to_sample: 1,
                randomization_id: "lost_box_manipulation",
                include_decoration: true,
                box_locations: [
                  { label: "boost", Fennimal_finding_box: "A", target_box: "A" },
                  { label: "neutral", Fennimal_finding_box: "C", target_box: "A" },
                  { label: "cost", Fennimal_finding_box: "B", target_box: "A", weight: 2 },
                ],
                partner_behavior: "active"
            },


            // BLOCK 4: Change contents of box A to toy B 
            {
                type: "phone_room",
                partner_behavior: "active",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: true,
                skip_instructions: false,
                Fennimals_encountered: ["B"],
                interaction_type: ["switch_box_without_partner"],
            },

            // BLOCK 5: Partner belief (individual boxes)
            // Memory probes: declare kinds in questions[] (sack kinds auto-gated).
            {
                type: "partner_belief_individual_boxes",
                include_practice_trial: true,
                num_belief_blocks: 1,
                include_reality_block_at_end: true,
                include_empty_box_choice_alternative: true,
                bonus_stars_per_correct_answer: 1,
                memory_probe_isi_ms: 1000,
                gating_boxes: ["A"],
                action_prediction_toys: ["A"],
                questions: [
                    { question_id: "belief_A", target_box: "A" },
                    // Who decorated box A (retrieve_lost_box); options = all experiment heads.
                    { kind: "memory_probe_box_decorator", target_box: "A" },
                    { kind: "memory_probe_fennimal_to_toy" },
                    { kind: "memory_probe_box_to_sack" },
                    { kind: "memory_probe_sack_to_toy" },
                ]
            },

        ],

        // 3 Fennimals. Warehouse box X is not a home box.
        // Lost-box labels are equally likely (weight defaults to 1).
        mentalizing_exp2: [

            // Day 1: meet Fennimals A, B, and C.
            {
                type: "free_exploration",
                interaction_type: ["Fennimal_toy"],
                Fennimals_encountered: ["A", "B", "C"],
                partner_behavior: "active",
                include_Fennefinder: true,
                force_climbing_tower_first: true
            },

            // Day 2: repair each Fennimal's toy, workshop toys X/Y/Z, then play.
            // Order is shuffled inside each subblock.
            {
                type: "phone_room",
                partner_behavior: "active",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: false,
                ask_Fennimal: true,
                ask_toy: true,
                ask_box: false,
                trial_subblocks: [
                    {
                        Fennimals_encountered: ["A", "B", "C"],
                        interaction_type: "broken_toy_no_box"
                    },
                    {
                        interaction_type: "broken_toy_workshop",
                        toys: ["X", "Y", "Z"]
                    },
                    {
                        Fennimals_encountered: ["A", "B", "C"],
                        interaction_type: "Fennimal_toy"
                    }
                ]
            },

            // Day 3: warehouse. Partner stays for both moves.
            // Toy A into sack A, then that sack into box X.
            {
                type: "phone_room",
                partner_behavior: "active",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: false,
                skip_instructions: false,
                trial_subblocks: [
                    { interaction_type: "warehouse_cleanup", toy: "A", sack: "A" },
                    { interaction_type: "warehouse_cleanup", sack: "A", box: "X" }
                ]
            },

            // Day 4: storm. One finder, equal weights.
            // boost A, neutral C, cost B. Partner watches the decoration.
            {
                type: "retrieve_lost_box",
                n_trials_to_sample: 1,
                randomization_id: "lost_box_manipulation",
                include_decoration: true,
                box_locations: [
                    { label: "boost", Fennimal_finding_box: "A", target_box: "X" },
                    { label: "neutral", Fennimal_finding_box: "C", target_box: "X" },
                    { label: "cost", Fennimal_finding_box: "B", target_box: "X" }
                ],
                partner_behavior: "active"
            },

            // Day 5: partner is present, then leaves. Toy B replaces the sack in box X.
            // Partner belief stays toy A.
            {
                type: "phone_room",
                partner_behavior: "active",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: false,
                skip_instructions: false,
                trial_subblocks: [
                    {
                        interaction_type: "warehouse_cleanup",
                        toy: "B",
                        box: "X",
                        partner_leaves_during_interaction: true
                    }
                ]
            },

            // Day 6: belief about box X, then whether the partner knows the contents,
            // then reality. Belief and reality use every toy (A, B, C, X, Y, Z) plus empty.
            // Practice is shape then color. A shape match precedes belief, another shape
            // match precedes the knowledge question, and a color match precedes reality.
            // The knowledge question is before the "partner has left" screen.
            // Options are Yes / No / I don't know; only No is correct.
            // Memory probes: who decorated box X, which sack went in it, which toy
            // is in that sack (every toy plus empty), then Fennimal→toy for A, B,
            // and C (every toy, no empty).
            {
                type: "partner_belief_individual_boxes",
                include_practice_trial: true,
                include_partner_knowledge_trial: true,
                num_belief_blocks: 1,
                include_reality_block_at_end: true,
                include_empty_box_choice_alternative: true,
                bonus_stars_per_correct_answer: 1,
                memory_probe_isi_ms: 1000,
                questions: [
                    { question_id: "belief_X", target_box: "X" },
                    { kind: "memory_probe_box_decorator", target_box: "X" },
                    { kind: "memory_probe_box_to_sack", only_if_placed: true, target_box: "X" },
                    { kind: "memory_probe_sack_to_toy", correct_from: "sack_contents" },
                    { kind: "memory_probe_fennimal_to_toy", toy_options: "all" }
                ]
            },

        ],

        semantic_learning_star: [


            // TRAINING PHASE
            // Block 1: free exploration — photograph each Fennimal; polaroid introduces the name
            { type: "free_exploration",
                interaction_type: ["photo_Fennimal"],
                Fennimals_encountered: ["A", "B", "C", "D"],
                partner_behavior: "absent",
                include_Fennefinder: true,
                force_climbing_tower_first: true,
                introduce_name_on_polaroid: true
            },
            
            // Name-cued toy search, then phone-room toy repair + hat rescue
            // (cartesian: one trial per Fennimal × each interaction_type, then smart-shuffled)
            { type: "hint_and_search",
                hint_type: "name",
                interaction_type: ["Fennimal_toy"],
                Fennimals_encountered: ["A", "B", "C", "D"],
                partner_behavior: "absent",
                include_Fennefinder: true,
                ask_Fennimal: true,
                ask_name: false,
                ask_hat: false,
                ask_toy: false
            },
            {type: "phone_room",
                interaction_type: [ "broken_toy_no_box", "hat_blown_away"],
                Fennimals_encountered: ["A", "B", "C", "D"],
                partner_behavior: "absent",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: true,
                ask_Fennimal: true,
                ask_name: true,
                ask_hat: true,
                ask_toy: true
            },

            // QUIZ
            {type: "Fennimal_attribute_sorting_task",
                Fennimals_asked: ["A", "B", "C", "D"],
                attribute_order: ["region", "head", "hat", "toy"],
                presentation: "single",
                maximum_earnable_stars: 5,
                pass_if_errors_at_most: 3,
                max_attempts: 3,
                on_fail: {
                    type: "phone_room",
                    interaction_type: "Fennimal_toy",
                    partner_behavior: "absent",
                    include_Fennefinder: false,
                    return_to_phone_room_after_final_trial: true,
                    skip_instructions: true,
                    ask_hat: true,
                    ask_toy: false
                }
            },

            //BINDING PHASE
            {type: "hat_binding_task",
                skip_instructions: false,
                randomization_id: "binding_search_condition",
                arm_randomization_id: "binding_star_arms",
                // Weighted by duplicates. One value is drawn per participant and persisted.
                condition: ["group_based"], //["group_based", "pair_based", "control"]
                retraining_fennimals: ["A", "B", "C", "D"],
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
                        kind: "join",
                        flavour: "exam"
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
                        kind: "join",
                        flavour: "shipping"
                    },
                    
                    {
                        kind: "binding",
                        flavour: "gift_shop",
                        cover_story: "Let's buy some new hats for the Fennimals! One hat at a time, we will give you a description of a Fennimal. First, answer a few questions to help you picture that Fennimal. Then place a new version of this Fennimal's hat in the shopping cart."
                    },
                    {
                        kind: "join",
                        flavour: "party"
                    },
                    
                ]
            },

            //TEST PHASE
            {type: "name_recall_task",
                // Prompt-only: "Starting with [NAME]…" — bound conditions: one selected arm; control: any spoke.
                seed_recall_with_arm_name: true,
                bonus_stars_per_correct_answer: 1,
                allowed_Levenshtein_distance_for_match: 2
            },
            
            {
                type: "morph_task",
                skip_instructions: false,
                skip_practice: false,
                partner_behavior: "absent",
                trial_speed: 5000,
                // F/J identity keys: "hats" (default) | "heads" (grayscale) | "names".
                response_key_icons: "names",
                // After the name quiz, lift the head [?]: true = show the prime
                // head; false = hat only (empty space, no head or smear).
                show_head_on_prime: false,
                // leftover-of-trio primes (A/C/D; B is name-quiz lure).
                // MorphTask expands morphs × mixes × pairs × both targets, then
                // assigns one morph from morphs[] per subject (between-subjects).
                names_options: ["A", "B", "C", "D"],
                morphs: ["crossfade"], //"mesh", "silhouette", 
                mixes: [50, 60,65],
                pairs: [
                    { prime: "A", fenA: "C", fenB: "D" },
                    { prime: "C", fenA: "A", fenB: "D" },
                    { prime: "D", fenA: "A", fenB: "C" }
                ]
            }

            

            
        ],

        semantic_learning_kit: [


            // TRAINING PHASE
            // Block 1: free exploration — photograph each Fennimal; polaroid introduces the name
            { type: "free_exploration",
                interaction_type: ["photo_Fennimal"],
                Fennimals_encountered: ["A", "B", "C", "D"],
                partner_behavior: "absent",
                include_Fennefinder: true,
                force_climbing_tower_first: true,
                introduce_name_on_polaroid: true
            },
            
            // Name-cued toy search, then phone-room toy repair + hat rescue
            { type: "hint_and_search",
                hint_type: "name",
                interaction_type: ["Fennimal_toy"],
                Fennimals_encountered: ["A", "B", "C", "D"],
                partner_behavior: "absent",
                include_Fennefinder: true,
                ask_Fennimal: true,
                ask_name: false,
                ask_hat: false,
                ask_toy: false
            },
            {type: "phone_room",
                interaction_type: [ "broken_toy_no_box", "hat_blown_away"],
                Fennimals_encountered: ["A", "B", "C", "D"],
                partner_behavior: "absent",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: true,
                ask_Fennimal: true,
                ask_name: true,
                ask_hat: true,
                ask_toy: true
            },

            // Extra portrait pass — identity questions, then a head close-up + name on the polaroid
            {type: "auto_travel",
                skip_instructions: false,
                partner_behavior: "absent",
                include_Fennefinder: false,
                interaction_type: ["photo_Fennimal"],
                Fennimals_encountered: ["A", "B", "C", "D"],
                ask_Fennimal: true,
                ask_name: true,
                ask_hat: true,
                ask_toy: true,
                introduce_name_on_polaroid: false,
                photo_target: "head",
                polaroid_name_ask: true,
                day_title: "another look",
                day_body:
                    "You'll visit each Fennimal in turn — the route is arranged for you. " +
                    "First answer a few questions about who they are. Then take a close-up of their face, " +
                    "and type their name on the polaroid."
            },

            // QUIZ
            {type: "Fennimal_attribute_sorting_task",
                Fennimals_asked: ["A", "B", "C", "D"],
                attribute_order: ["region", "head", "hat", "toy"],
                presentation: "single",
                maximum_earnable_stars: 5,
                pass_if_errors_at_most: 3,
                max_attempts: 3,
                on_fail: {
                    type: "phone_room",
                    interaction_type: "Fennimal_toy",
                    partner_behavior: "absent",
                    include_Fennefinder: false,
                    return_to_phone_room_after_final_trial: true,
                    skip_instructions: true,
                    ask_hat: true,
                    ask_toy: false
                }
            },

            //BINDING PHASE
            // Always include hub-arm A so the triad is ABC (head+region) or ABD (head+toy).
            {type: "hat_binding_task",
                skip_instructions: false,
                randomization_id: "binding_search_condition",
                arm_randomization_id: "binding_star_arms",
                allowed_arm_pairs: [["A", "C"], ["A", "D"]],
                always_include_arm: "A",
                condition: ["group_based"], //["group_based", "pair_based", "control"]
                retraining_fennimals: ["A", "B", "C", "D"],
                use_head_gist_descriptions: true,
                use_region_gist_descriptions: false,
                use_toy_gist_descriptions: false,
                use_kit_slot_head_gists: false,
                use_head_portrait_choices: false,
                ask_full_question_set: false,
                blocks: [
                    
                   
                    
                    {
                        kind: "binding",
                        flavour: "lost_and_found",
                        cover_story: "Oh no, the Fennimals have lost their hats! Let's help return these hats to their correct owner. Unfortunately, the post office forgot to print the names on the boxes. Instead, we need to rely on your memories. One hat at a time, we will give you a description of a Fennimal. First, answer a few questions to help you picture that Fennimal. Then place this Fennimal's hat in the shipping box."
                    },
                    {
                        kind: "join",
                        flavour: "exam"
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
                        kind: "join",
                        flavour: "shipping"
                    },
                    
                    {
                        kind: "binding",
                        flavour: "gift_shop",
                        cover_story: "Let's buy some new hats for the Fennimals! One hat at a time, we will give you a description of a Fennimal. First, answer a few questions to help you picture that Fennimal. Then place a new version of this Fennimal's hat in the shopping cart."
                    },
                    {
                        kind: "join",
                        flavour: "party"
                    },
                    
                ]
            },

            //TEST PHASE
            // Snack day instead of typed name recall: C/D learn food, then A transfer 2AFC.
            {type: "phone_room",
                skip_instructions: false,
                partner_behavior: "absent",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: false,
                randomization_id: "food_transfer_layout",
                bonus_stars_per_correct_answer: 2,
                day_title: "snack time",
                day_body:
                    "The Fennimals are getting hungry. The phone will ring when someone wants a snack. " +
                    "Answer the phone, travel there, and give them the food they like.",
                trial_subblocks: [
                    {
                        Fennimals_encountered: ["C", "D"],
                        interaction_type: "Fennimal_food"
                    },
                    {
                        trials: [
                            { Fennimal: "A", interaction_type: "Fennimal_food_transfer" }
                        ]
                    }
                ]
            },
            
            {
                type: "morph_task",
                skip_instructions: false,
                skip_practice: false,
                partner_behavior: "absent",
                trial_speed: 7500,
                jumble_source: "feature_kit",
                morphs: ["overlay_fade"],
                mixes: [50, 60, 70],
                prime_quiz: "hat_from_name",
                allow_prime_as_parent: true,
                show_head_on_prime: false,
                response_key_icons: "names",
                names_options: ["A", "B", "C", "D"],
                day_body:
                    "The camera glitched this morning. Each polaroid shows a mixed picture — two Fennimals in one frame.<br><br>" +
                    "When a name appears, pick the hat that Fennimal wears (F / J to move, Space to confirm). The correct hat then appears above the mix.<br><br>" +
                    "Then the mix is uncovered. Use F and J to pick which name the mix looks like, as quickly as you can. Faster answers leave more points (100 points = 1 bonus star). An incorrect answer quietly costs points — there is no trial-by-trial feedback.<br><br>" +
                    "We will start with two practice rounds using simple shapes.",
                trials: buildKitOverlayFadeTrials()
            }

            
            
        ],
    };

    All_Fennimal_Sets.test = JSON.parse(JSON.stringify(All_Fennimal_Sets.semantic_learning_kit));
    (function patchTestKitSandbox() {
        let kit = All_Experiment_Structures.semantic_learning_kit || [];
        let binding = kit.find((p) => p && p.type === "hat_binding_task");
        let morph = kit.find((p) => p && p.type === "morph_task");
        if (!binding) {
            throw new Error("test: kit hat_binding_task is missing.");
        }
        if (!morph) {
            throw new Error("test: kit morph_task is missing.");
        }
        let bindingClone = JSON.parse(JSON.stringify(binding));
        bindingClone.skip_instructions = true;
        let morphClone = JSON.parse(JSON.stringify(morph));
        morphClone.skip_instructions = true;
        All_Experiment_Structures.test = [bindingClone, morphClone];
    })();

    const All_Questionnaire_Page_sets = {
        test: [],
        semantic_learning_star: ["demographics_questionnaire"],
        semantic_learning_kit: ["demographics_questionnaire"],
        mentalizing_between_subjects: ["demographics_questionnaire"],
        mentalizing_exp2: ["demographics_questionnaire"],
        mentalizing_exp1: ["demographics_questionnaire"],
    };

    const All_Allowed_Head_Lists = {};
    const All_Banned_Head_Lists = {};
    // Kit heads are mechanical / sea / sweet — robot toy and party hat clash with those families.
    const All_Banned_Hat_Lists = {
        semantic_learning_kit: ["partyhat"],
        test: ["partyhat"],
    };
    const All_Banned_Toy_Lists = {
        semantic_learning_kit: ["robot"],
        test: ["robot"],
    };
    const All_Forced_Head_Lists = {
        test: ["bell"],
        semantic_learning_star: ["bell", "pig", "bun"],
        semantic_learning_kit: ["bell"],
        mentalizing_between_subjects: ["astro", "cupcake", "tube", "tv", "jackolantern", "elephant", "blockhead", "parrot"],
        mentalizing_exp2: ["astro", "cupcake", "tube", "tv", "jackolantern", "elephant", "blockhead", "parrot"],
        mentalizing_exp1: ["astro", "cupcake", "tube", "tv", "jackolantern", "elephant", "blockhead", "parrot"],
    };

    const All_Allowed_Head_Groups_List = {};
    const All_Banned_Head_Groups_List = {};

    // ----------------------------------------------------
    // INITIALIZATION LOGIC
    // ----------------------------------------------------
    // Layer 1: if a prior incomplete session claimed an expCode, keep it on refresh.
    if (window.__FORCE_EXPERIMENT_CODE__) {
        this.Experiment_Code = window.__FORCE_EXPERIMENT_CODE__;
    } else if (this.Experiment_Code.length > 0) {
        this.Experiment_Code = shuffleArray(this.Experiment_Code)[0];
    }
    console.log("%c Starting experiment with code " + this.Experiment_Code, "color:blue");


    this.Experiment_Structure = All_Experiment_Structures[this.Experiment_Code];
    this.Start_At_Measurement_Phase = START_MENTALIZING_AT_MEASUREMENT
        && this.Experiment_Code === "mentalizing_between_subjects";
    this.Fennimal_Dictionary = All_Fennimal_Sets[this.Experiment_Code];

    if (!this.Experiment_Structure || !this.Fennimal_Dictionary) {
        throw new Error(
            'Unknown experiment code "' + this.Experiment_Code + '". ' +
            'Live codes: test, semantic_learning_star, semantic_learning_kit, mentalizing_between_subjects, mentalizing_exp1, mentalizing_exp2. ' +
            'Archived recipes are in archive/ (see archive/MANIFEST.md).'
        );
    }

    this.Instructions_at_start = All_Instructions_At_Start[this.Experiment_Code] || false;
    this.Pages_at_end = All_Questionnaire_Page_sets[this.Experiment_Code] || false;

    this.allowed_heads = All_Allowed_Head_Lists[this.Experiment_Code] || false;
    this.banned_heads = All_Banned_Head_Lists[this.Experiment_Code] || false;
    this.forced_heads = All_Forced_Head_Lists[this.Experiment_Code] || false;
    this.allowed_head_groups = All_Allowed_Head_Groups_List[this.Experiment_Code] || false;
    this.banned_head_groups = All_Banned_Head_Groups_List[this.Experiment_Code] || false;
    this.banned_hats = All_Banned_Hat_Lists[this.Experiment_Code] || false;
    this.banned_toys = All_Banned_Toy_Lists[this.Experiment_Code] || false;

    this.head_source = (this.Experiment_Code === "semantic_learning_kit" || this.Experiment_Code === "test")
        ? "feature_kit"
        : "svg";
    this.kit_recipes = this.head_source === "feature_kit" ? KIT_RECIPES : null;
    this.kit_head_names = JSON.parse(JSON.stringify(KIT_HEAD_NAMES));

    this.use_region_preferred_body_types = true;
    this.preferred_region_sample_order = [["Jungle", "Village", "North", "Desert"], ["Beach", "Mountains", "Flowerfields", "Swamp"]]; // [["Jungle", "Village", "North", "Desert","Beach", "Mountains", "Flowerfields", "Swamp"]] // [["Jungle", "Village", "North", "Desert"], ["Beach", "Mountains", "Flowerfields", "Swamp"]];
    this.use_constract_color_for_head = false;
    this.name_is_determined_as = "head";

    this.BonusStarValue = {
        currency_symbol: "$",
        bonus_per_star: 0.10
    };
}

let StimulusTransformer = function (StimTemplate) {

    let SVG_Heads_Layer = document.getElementById("All_Heads");
    let SVG_Hats_Layer = document.getElementById("All_Hats");

    let Experiment_Code = StimTemplate.Experiment_Code;
    this.Experiment_Structure = StimTemplate.Experiment_Structure;
    let All_Names = {};

    // Subblocks declared on the phase, plus every condition's subblocks.
    // Unselected conditions still name toys and boxes that must be mapped.
    function each_structure_subblock(fn) {
        let structure = StimTemplate.Experiment_Structure || [];
        structure.forEach((phase) => {
            if (!phase) return;
            if (Array.isArray(phase.trial_subblocks)) phase.trial_subblocks.forEach(fn);
            if (!Array.isArray(phase.conditions)) return;
            phase.conditions.forEach((cond) => {
                if (cond && Array.isArray(cond.trial_subblocks)) cond.trial_subblocks.forEach(fn);
            });
        });
    }

    // Stimulus toy codes named by broken_toy_workshop subblocks. Fennimal toy
    // codes are assigned first; a shared code keeps that toy, and any other
    // code is filled from SVG toys no Fennimal received.
    function list_broken_toy_workshop_codes() {
        let codes = [];
        each_structure_subblock((sb) => {
            if (!sb || sb.interaction_type !== "broken_toy_workshop" || !Array.isArray(sb.toys)) return;
            sb.toys.forEach((code) => {
                if (typeof code === "string" && code && !codes.includes(code)) codes.push(code);
            });
        });
        return codes;
    }

    // warehouse_cleanup names the toy, sack, and box codes for that one move.
    function list_participant_toy_box_specs() {
        let specs = [];
        each_structure_subblock((sb) => {
            if (!sb || sb.interaction_type !== "warehouse_cleanup") return;
            specs.push({
                toy: typeof sb.toy === "string" ? sb.toy : "",
                box: typeof sb.box === "string" ? sb.box : "",
                sack: typeof sb.sack === "string" ? sb.sack : ""
            });
        });
        return specs;
    }

    function list_fennimal_toy_box_boxes() {
        let codes = [];
        each_structure_subblock((sb) => {
            if (!sb || sb.interaction_type !== "warehouse_cleanup") return;
            if (typeof sb.box === "string" && sb.box && !codes.includes(sb.box)) codes.push(sb.box);
        });
        return codes;
    }

    function list_warehouse_sack_codes() {
        let codes = [];
        each_structure_subblock((sb) => {
            if (!sb || sb.interaction_type !== "warehouse_cleanup") return;
            if (typeof sb.sack === "string" && sb.sack && !codes.includes(sb.sack)) codes.push(sb.sack);
        });
        return codes;
    }

    function create_feature_maps() {

        function get_array_of_heads_in_svg() {
            let SVGHeads = SVG_Heads_Layer.childNodes;
            let Heads_array = [];

            for (let i = 0; i < SVGHeads.length; i++) {
                if (SVGHeads[i].nodeType !== Node.ELEMENT_NODE) continue;

                // Use replace (not split("_")[2]) so multi-underscore ids stay intact.
                let name = SVGHeads[i].id.replace(/^Fennimal_head_/, "");
                const defined_names = SVGHeads[i].getAttribute("name");

                if (defined_names === null) {
                    console.warn(`Warning: head type ${name} has no defined name property!`);
                } else {
                    All_Names[name] = defined_names.split(" ");
                }

                let assigned_classes = SVGHeads[i].classList;
                let head_group = false;
                let head_cluster = false;

                for (let cls of assigned_classes) {
                    if (cls !== "Fennimal_head") {
                        if (cls.includes("cluster")) {
                            head_cluster = cls.split("_")[3];
                        } else if (cls.includes("Fennimal_head_")) {
                            head_group = cls.split("_")[2];
                        }
                    }
                }

                // ----------------------------------------------------
                // NEW: Constraint Satisfaction Fallbacks
                // ----------------------------------------------------
                if (head_cluster && !head_group) {
                    console.error(`ERROR: Head ${name} has a cluster (${head_cluster}) but no group! Check your Inkscape classes.`);
                }

                if (!head_group) {
                    // No group specified? Give it a completely unique private group ID
                    head_group = `private_group_${name}`;
                }

                if (!head_cluster) {
                    // No cluster specified? Give it a completely unique private cluster ID
                    head_cluster = `private_cluster_${name}`;
                }

                let can_wear_hat = SVGHeads[i].getElementsByClassName("Fennimal_head_hat_point").length > 0;
                Heads_array.push({ name: name, group: head_group, cluster: head_cluster, can_wear_hat: can_wear_hat });
            }
            return Heads_array;
        }

        function get_all_allowed_heads_in_SVG() {
            let Heads_SVG_array = get_array_of_heads_in_svg();
            let Filtered_array_first = [];
            let Filtered_array_second = [];

            if (!StimTemplate.allowed_heads && !StimTemplate.forced_heads) {
                if (StimTemplate.banned_heads) {
                    Filtered_array_first = Heads_SVG_array.filter(h => !StimTemplate.banned_heads.includes(h.name));
                } else {
                    Filtered_array_first = Heads_SVG_array;
                }
            } else {
                if (StimTemplate.forced_heads) {
                    Filtered_array_first = Heads_SVG_array.filter(h => StimTemplate.forced_heads.includes(h.name));
                } else {
                    Filtered_array_first = Heads_SVG_array.filter(h => StimTemplate.allowed_heads.includes(h.name));
                }
            }

            if (!StimTemplate.allowed_head_groups) {
                if (StimTemplate.banned_head_groups) {
                    Filtered_array_second = Filtered_array_first.filter(h => !StimTemplate.banned_head_groups.includes(h.group));
                } else {
                    Filtered_array_second = Filtered_array_first;
                }
            } else {
                Filtered_array_second = Filtered_array_first.filter(h => StimTemplate.allowed_head_groups.includes(h.group));
            }

            // Always strip the hat flag for the final structure
            return Filtered_array_second.map(h => {
                let clean = {...h};
                delete clean.can_wear_hat;
                return clean;
            });
        }

        function get_heads_structure(HeadsArray) {
            let ClusterStructure = {};

            for (let head of HeadsArray) {
                if (!ClusterStructure[head.cluster]) {
                    ClusterStructure[head.cluster] = { Elems: [] };
                }
                ClusterStructure[head.cluster].Elems.push(head);
            }

            for (let key in ClusterStructure) {
                ClusterStructure[key].groups = {};
                for (let elem of ClusterStructure[key].Elems) {
                    if (!ClusterStructure[key].groups[elem.group]) {
                        ClusterStructure[key].groups[elem.group] = [];
                    }
                    ClusterStructure[key].groups[elem.group].push(elem.name);
                }

                ClusterStructure[key].total_heads = ClusterStructure[key].Elems.length;
                ClusterStructure[key].group_sizes = Object.values(ClusterStructure[key].groups).map(g => g.length);
                delete ClusterStructure[key].Elems;
            }
            return ClusterStructure;
        }

        function get_head_stimuli_in_arr() {
            let HeadCodes = {};

            for (let id in StimTemplate.Fennimal_Dictionary) {
                let fen = StimTemplate.Fennimal_Dictionary[id];
                let head = fen.head;
                let group = fen.head_group || `private_group_req_${head}`;
                let cluster = fen.head_cluster || `private_cluster_req_${head}`;

                if (!HeadCodes[head]) {
                    HeadCodes[head] = { group: group, cluster: cluster };
                } else {
                    if (HeadCodes[head].group !== group || HeadCodes[head].cluster !== cluster) {
                        console.error(`ERROR: Conflicting group/cluster requirements for head code ${head}!`);
                    }
                }
            }

            let HeadsArr = [];
            for (let key in HeadCodes) {
                HeadsArr.push({ name: key, group: HeadCodes[key].group, cluster: HeadCodes[key].cluster });
            }
            return HeadsArr;
        }

        function summarize_cluster_structure(structure) {
            let summary = {};
            for (let cluster in structure) {
                let info = structure[cluster];
                let groups = {};
                for (let group in info.groups) {
                    groups[group] = info.groups[group].length;
                }
                summary[cluster] = {
                    total_heads: info.total_heads,
                    group_sizes: info.group_sizes,
                    groups: groups
                };
            }
            return summary;
        }

        function can_requested_group_fit_in_available_group(Req, Available) {
            if (Available.total_heads >= Req.total_heads) {
                if (Available.group_sizes.length >= Req.group_sizes.length) {
                    let avail_sorted = [...Available.group_sizes].sort((a,b) => b-a);
                    let req_sorted = [...Req.group_sizes].sort((a,b) => b-a);

                    for (let i = 0; i < req_sorted.length; i++) {
                        if (req_sorted[i] > avail_sorted[i]) return false;
                    }
                    return true;
                }
            }
            return false;
        }

        function match_head_codes_to_head_names() {
            // Identity map: dictionary codes are already SVG ids.
            // Do not shuffle forced_heads onto abstract A/B/C codes.
            if (StimTemplate.literal_svg_heads === true) {
                let MatchedHeads = {};
                let availableNames = new Set(get_array_of_heads_in_svg().map((h) => h.name));
                let requested = [...new Set(Object.values(StimTemplate.Fennimal_Dictionary).map((f) => f.head))];
                let missing = requested.filter((code) => !availableNames.has(code));
                if (missing.length) {
                    throw new Error(
                        "literal_svg_heads: Heads.svg is missing template(s): " + missing.join(", ") +
                        " (ids must match Fennimal_head_*)."
                    );
                }
                requested.forEach((code) => { MatchedHeads[code] = code; });
                return MatchedHeads;
            }

            let AvailableInSVG = get_heads_structure(get_all_allowed_heads_in_SVG());
            let MatchedHeads = {};

            if (StimTemplate.forced_heads) {
                let AvailableArr = shuffleArray(get_all_allowed_heads_in_SVG());
                let RequestedHeadCodes = [...new Set(Object.values(StimTemplate.Fennimal_Dictionary).map(f => f.head))];

                if (AvailableArr.length < RequestedHeadCodes.length) {
                    let missingForced = StimTemplate.forced_heads.filter(
                        h => !AvailableArr.some(a => a.name === h)
                    );
                    console.error(
                        "ERROR: forced_heads list does not yield enough SVG heads.",
                        {
                            requested: RequestedHeadCodes.length,
                            available: AvailableArr.length,
                            forced_heads: StimTemplate.forced_heads,
                            missing_from_svg: missingForced
                        }
                    );
                }

                RequestedHeadCodes.forEach((code, i) => {
                    if (!AvailableArr[i] || !AvailableArr[i].name) {
                        console.error(
                            `ERROR: No SVG head available for head code "${code}" (forced_heads index ${i}).`
                        );
                        return;
                    }
                    MatchedHeads[code] = AvailableArr[i].name;
                });
            } else {
                let RequestedHeads = get_heads_structure(get_head_stimuli_in_arr());
                let ReqHeads_Arr = Object.entries(RequestedHeads)
                    .map(([cluster, info]) => ({ cluster, ...info }))
                    .sort((a,b) => b.total_heads - a.total_heads);

                let AssignedGroups = [];
                for (let req of ReqHeads_Arr) {
                    let possible_keys = Object.keys(AvailableInSVG).filter(k => can_requested_group_fit_in_available_group(req, AvailableInSVG[k]));

                    if (possible_keys.length === 0) {
                        throw new Error(
                            "Cannot assign requested head cluster \"" + req.cluster +
                            "\" to any remaining SVG cluster. Requested group sizes must fit " +
                            "inside one unused SVG cluster (matched by size, not by label). " +
                            JSON.stringify({
                                requested_cluster: req.cluster,
                                requested_group_sizes: req.group_sizes,
                                requested_groups: Object.fromEntries(
                                    Object.entries(req.groups).map(([g, heads]) => [g, heads])
                                ),
                                remaining_svg_clusters: summarize_cluster_structure(AvailableInSVG)
                            })
                        );
                    } else {
                        let selected_key = shuffleArray(possible_keys)[0];
                        AssignedGroups.push({ Requested: req, Matched: JSON.parse(JSON.stringify(AvailableInSVG[selected_key])) });
                        delete AvailableInSVG[selected_key];
                    }
                }

                for (let pair of AssignedGroups) {
                    let AllReqGroupsArr = Object.values(pair.Requested.groups).sort((a,b) => b.length - a.length);

                    for (let reqGroup of AllReqGroupsArr) {
                        let possible_group_names = Object.keys(pair.Matched.groups).filter(k => pair.Matched.groups[k].length >= reqGroup.length);
                        if (!possible_group_names.length) {
                            throw new Error(
                                "Cannot assign requested head_group of size " + reqGroup.length +
                                " (" + reqGroup.join(", ") + ") inside cluster \"" +
                                pair.Requested.cluster + "\". Remaining SVG groups in this cluster: " +
                                JSON.stringify(
                                    Object.fromEntries(
                                        Object.entries(pair.Matched.groups).map(([g, heads]) => [g, heads.length])
                                    )
                                )
                            );
                        }

                        let selected_group_name = shuffleArray(possible_group_names)[0];
                        let selected_group = shuffleArray([...pair.Matched.groups[selected_group_name]]);
                        delete pair.Matched.groups[selected_group_name];

                        reqGroup.forEach((code, index) => {
                            MatchedHeads[code] = selected_group[index];
                        });
                    }
                }
            }

            let requestedCodes = [...new Set(Object.values(StimTemplate.Fennimal_Dictionary).map(f => f.head))];
            let missingCodes = requestedCodes.filter(code => !MatchedHeads[code]);
            if (missingCodes.length) {
                throw new Error(
                    "Head codes did not resolve to SVG heads: " + missingCodes.join(", ") +
                    ". Check head_group / head_cluster sizes against the SVG categories."
                );
            }
            return MatchedHeads;
        }

        // ----------------------------------------------------
        // SVG DOM EXTRACTION HELPERS
        // ----------------------------------------------------
        function get_all_available_hats() {
            let hats = Array.from(SVG_Hats_Layer.childNodes)
                .filter(n => n.nodeType === Node.ELEMENT_NODE)
                .map(n => n.id.replace("hat_", ""));
            if (StimTemplate.banned_hats) {
                hats = hats.filter(h => !StimTemplate.banned_hats.includes(h));
            }
            return hats;
        }

        function get_all_available_toys() {
            let toys = Array.from(document.getElementsByClassName("toy")).map(t => t.id.split("_")[1]);
            if (StimTemplate.banned_toys) {
                toys = toys.filter(t => !StimTemplate.banned_toys.includes(t));
            }
            return toys;
        }

        function get_all_food_flavors_in_SVG() {
            let All_Bags_Arr = Array.from(document.getElementsByClassName("foodbag_flavor")).map(b => b.id.split("_")[2]);
            let All_Foods_Arr = [...new Set(Array.from(document.getElementsByClassName("food")).map(f => f.id.split("_")[1]))];
            return All_Bags_Arr.filter(x => All_Foods_Arr.includes(x));
        }

        function get_all_boxes_in_SVG() {
            return [...new Set(Array.from(document.getElementsByClassName("toybox")).map(b => b.id.split("_")[1]))];
        }

        // Sack SVG roots use the bare id (e.g. velvet_purse), class "sack".
        function get_all_sacks_in_SVG() {
            return [...new Set(Array.from(document.getElementsByClassName("sack")).map(s => s.id).filter(Boolean))];
        }

        function get_all_locations_in_SVG() {
            let Regions = {};
            Array.from(document.getElementsByClassName("location_marker")).forEach(marker => {
                let location_name = marker.id.split("_")[2];
                let region = marker.classList[1].split("_")[2];
                if (!Regions[region]) Regions[region] = [];
                Regions[region].push(location_name);
            });
            return Regions;
        }

        function get_region_sample_order() {
            let Arr = [];
            for (let group of StimTemplate.preferred_region_sample_order) {
                Arr.push(...shuffleArray(group));
            }
            return Arr;
        }

        // ----------------------------------------------------
        // VARIABLE EXTRACTION
        // ----------------------------------------------------
        let Variable_Features = {};

        function extract_required_variables() {
            // Count unique requested properties across the entire dictionary
            let Counts = {};
            // Behavioral tags (not SVG-mapped features) — copied onto FenObj separately.
            const passthroughKeys = new Set(["special_role"]);

            for (let id in StimTemplate.Fennimal_Dictionary) {
                let fenReq = StimTemplate.Fennimal_Dictionary[id];
                for (let key in fenReq) {
                    if (passthroughKeys.has(key)) continue;
                    if (fenReq[key] !== false) {
                        if (!Counts[key]) Counts[key] = new Set();
                        Counts[key].add(fenReq[key]);
                    }
                }
            }

            for (let key in Counts) {
                Variable_Features[key] = Array.from(Counts[key]); // Convert Set to Array of unique requests
            }

            list_broken_toy_workshop_codes().forEach((code) => {
                if (!Variable_Features.toy) Variable_Features.toy = [];
                if (!Variable_Features.toy.includes(code)) Variable_Features.toy.push(code);
            });

            list_participant_toy_box_specs().forEach((spec) => {
                if (spec.toy) {
                    if (!Variable_Features.toy) Variable_Features.toy = [];
                    if (!Variable_Features.toy.includes(spec.toy)) Variable_Features.toy.push(spec.toy);
                }
                if (spec.box) {
                    if (!Variable_Features.toybox) Variable_Features.toybox = [];
                    if (!Variable_Features.toybox.includes(spec.box)) Variable_Features.toybox.push(spec.box);
                }
                if (spec.sack) {
                    if (!Variable_Features.sack) Variable_Features.sack = [];
                    if (!Variable_Features.sack.includes(spec.sack)) Variable_Features.sack.push(spec.sack);
                }
            });
            list_warehouse_sack_codes().forEach((sack) => {
                if (!Variable_Features.sack) Variable_Features.sack = [];
                if (!Variable_Features.sack.includes(sack)) Variable_Features.sack.push(sack);
            });
            list_fennimal_toy_box_boxes().forEach((box) => {
                if (!Variable_Features.toybox) Variable_Features.toybox = [];
                if (!Variable_Features.toybox.includes(box)) Variable_Features.toybox.push(box);
            });
        }

        function assign_map_values() {
            extract_required_variables();
            let Map = {};
            let UnMappedItems = {};

            if (StimTemplate.head_source === "feature_kit") {
                Map.head = {};
                let seen = {};
                Object.keys(StimTemplate.Fennimal_Dictionary || {}).forEach((fenId) => {
                    let code = StimTemplate.Fennimal_Dictionary[fenId].head || fenId;
                    if (seen[code]) return;
                    seen[code] = true;
                    Map.head[code] = "kit" + code;
                });
            } else if (Variable_Features.head) {
                Map.head = match_head_codes_to_head_names();
            }

            if (Variable_Features.region) {
                Map.region = {};
                let Selected_Region_Order = get_region_sample_order();
                let Available_Locations = get_all_locations_in_SVG();

                // Group the requested regions so we assign a consistent real region to each code
                Variable_Features.region.forEach(req_region => {
                    let selected_region_name = Selected_Region_Order.shift();
                    Map.region[req_region] = {
                        region: selected_region_name,
                        Locations: shuffleArray([...Available_Locations[selected_region_name]])
                    };
                });
            }

            const map_simple_feature = (feature_name, available_svg_elements) => {
                if (!Variable_Features[feature_name]) return;
                Map[feature_name] = {};
                let available = shuffleArray(available_svg_elements);

                Variable_Features[feature_name].forEach(req => {
                    let picked = available.shift();
                    if (!picked) {
                        throw new Error(
                            `StimulusTransformer: not enough ${feature_name} assets to assign code "${req}". ` +
                            (feature_name === "toy"
                                ? "Fennimal toy codes are assigned first; workshop codes use the SVG toys that remain."
                                : "")
                        );
                    }
                    Map[feature_name][req] = picked;
                });
                UnMappedItems[feature_name] = available; // Save leftovers for distractors
            };

            map_simple_feature("hat", get_all_available_hats());
            map_simple_feature("food_preference", get_all_food_flavors_in_SVG());
            map_simple_feature("toy", get_all_available_toys());
            map_simple_feature("toybox", get_all_boxes_in_SVG());
            map_simple_feature("sack", get_all_sacks_in_SVG());

            return { Map: Map, Free: UnMappedItems };
        }

        return assign_map_values();
    }

    let Maps = create_feature_maps();
    let FeatureMap = Maps.Map;
    let FeatureMapConstant = JSON.parse(JSON.stringify(FeatureMap));

    // ----------------------------------------------------
    // CREATING FINAL STIMULI
    // ----------------------------------------------------
    function assertDisjointKitRecipes(recipes) {
        let slots = ["shell", "ear", "eye", "lowerFace", "hair", "stamp"];
        slots.forEach((slot) => {
            let tokens = recipes.map((r) => r && r[slot]);
            let meaningful = tokens.filter((t) => t != null && t !== "" && t !== "none");
            if (meaningful.length === 0) return;
            let unique = new Set(tokens.filter((t) => t != null && t !== ""));
            if (unique.size !== recipes.length) {
                throw new Error(
                    'semantic_learning_kit recipes must be disjoint on "' + slot + '" (got [' +
                    tokens.join(", ") + "])."
                );
            }
        });
    }

    function assignKitRecipesToHeadCodes(Dict) {
        let recipes = (StimTemplate.kit_recipes || []).slice();
        if (!Array.isArray(recipes) || recipes.length < 3) {
            throw new Error("semantic_learning_kit needs at least 3 kit_recipes to shuffle onto head codes B, C, D.");
        }
        assertDisjointKitRecipes(recipes);
        let headCodes = [];
        let seen = {};
        Object.keys(Dict || {}).forEach((fenId) => {
            let code = Dict[fenId].head || fenId;
            if (seen[code]) return;
            seen[code] = true;
            headCodes.push(code);
        });
        if (recipes.length < headCodes.length) {
            throw new Error(
                "semantic_learning_kit has " + headCodes.length + " head codes but only " +
                recipes.length + " recipes."
            );
        }
        let shuffled = shuffleArray(recipes.slice());
        let byCode = {};
        let namesByCode = {};
        headCodes.forEach((code, i) => {
            let recipe = JSON.parse(JSON.stringify(shuffled[i]));
            let family = recipe.shell || recipe.ear || recipe.eye || recipe.lowerFace || recipe.stamp;
            let pair = (StimTemplate.kit_head_names && (
                StimTemplate.kit_head_names[recipe.id]
                || (family && StimTemplate.kit_head_names[family])
            )) || null;
            if (!pair || pair.length < 2) {
                throw new Error(
                    'semantic_learning_kit head "' + (recipe.id || family || "?") +
                    '" needs two names in KIT_HEAD_NAMES.'
                );
            }
            byCode[code] = recipe;
            namesByCode[code] = shuffleArray(pair.slice());
        });
        return { recipes: byCode, names: namesByCode };
    }

    function create_Fennimals_from_stimulus_template(Dict, Map) {
        let Arr = [];
        let kitAssign = StimTemplate.head_source === "feature_kit"
            ? assignKitRecipesToHeadCodes(Dict)
            : null;
        let kitRecipeByHeadCode = kitAssign && kitAssign.recipes;
        let kitNamesByHeadCode = kitAssign && kitAssign.names;

        let Region_in_map = Object.values(Map.region || {}).map(r => r.region);
        let Unmapped_regions = StimTemplate.preferred_region_sample_order.flat().filter(x => !Region_in_map.includes(x));

        // Iterate over the dictionary!
        for (let fenID in Dict) {
            let req = Dict[fenID];
            let FenObj = {};

            // NEW: Automatically inject the Dictionary Key back into the object!
            FenObj.id = fenID;

            // Region & Location
            if (req.region) {
                FenObj.region = Map.region[req.region].region;
                // literal_svg_heads: every head shares one dummy region code. Do
                // not consume unique map spots (this experiment never travels).
                if (StimTemplate.literal_svg_heads === true) {
                    FenObj.location = (Map.region[req.region].Locations || [])[0];
                } else {
                    FenObj.location = Map.region[req.region].Locations.shift(); // Destructive pull
                }
            } else {
                FenObj.region = shuffleArray(Unmapped_regions)[0];
            }

            // Body
            if (req.body) {
                FenObj.body = Map.body[req.body];
            } else {
                if (StimTemplate.use_region_preferred_body_types) {
                    FenObj.body = GenParam.RegionData[FenObj.region].preferredBodyType;
                }
            }

            // Head & Name
            if (StimTemplate.head_source === "feature_kit") {
                let headCode = req.head || fenID;
                FenObj.head = Map.head[headCode];
                if (!FenObj.head) {
                    throw new Error('Fennimal "' + fenID + '" head code "' + headCode + '" did not map to a kit template.');
                }
                let recipe = kitRecipeByHeadCode && kitRecipeByHeadCode[headCode];
                if (!recipe) {
                    throw new Error('Fennimal "' + fenID + '" is missing a kit recipe for head code "' + headCode + '".');
                }
                FenObj.kit_recipe = JSON.parse(JSON.stringify(recipe));
                let namePool = kitNamesByHeadCode && kitNamesByHeadCode[headCode];
                if (!namePool || namePool.length < 1) {
                    throw new Error(
                        'Fennimal "' + fenID + '" has no leftover name for head "' +
                        (recipe.id || headCode) + '".'
                    );
                }
                FenObj.name = namePool.shift();
            } else {
                FenObj.head = Map.head[req.head];
                if (!FenObj.head) {
                    throw new Error(
                        `Fennimal "${fenID}" head code "${req.head}" did not resolve to an SVG head id. ` +
                        `Check head_group / head_cluster (matcher maps groups by size onto SVG categories).`
                    );
                }

                if (StimTemplate.name_is_determined_as === "head") {
                    if (All_Names[FenObj.head] && All_Names[FenObj.head].length > 0) {
                        FenObj.name = All_Names[FenObj.head].shift();
                    } else {
                        FenObj.name = capitalize_first_letter_in_string(FenObj.head);
                        console.warn(`No custom names left for ${FenObj.head}. Using default.`);
                    }
                }
            }

            // Color Scheme
            if (req.ColorScheme) {
                FenObj.color_scheme_origin = "custom";
            } else {
                FenObj.ColorScheme = {
                    Head: {
                        primary_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.primary_color,
                        secondary_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.secondary_color,
                        tertiary_color: StimTemplate.use_constract_color_for_head
                            ? GenParam.RegionData[FenObj.region].contrast_color
                            : GenParam.RegionData[FenObj.region].Fennimal_location_colors.tertiary_color,
                        eye_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.eye_color,
                    },
                    Body: {
                        primary_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.primary_color,
                        secondary_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.secondary_color,
                        tertiary_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.tertiary_color,
                    }
                };
                FenObj.color_scheme_origin = "region";
            }

            // Simple Mappings
            if (req.hat) FenObj.hat = Map.hat[req.hat];
            if (req.food_preference) FenObj.food_preference = Map.food_preference[req.food_preference];
            if (req.toy) FenObj.toy = Map.toy[req.toy];
            if (req.toybox) FenObj.toybox = Map.toybox[req.toybox];
            if (req.sack) FenObj.sack = Map.sack[req.sack];
            if (req.special_role) FenObj.special_role = req.special_role;

            if (req.play_orthogonal_tasks) FenObj.play_orthogonal_tasks = true;

            Arr.push(FenObj);
        }

        // Randomize the final array order so they aren't processed linearly by ID
        return shuffleArray(Arr);
    }

    const FennimalObjArr = create_Fennimals_from_stimulus_template(StimTemplate.Fennimal_Dictionary, FeatureMap);
    let kitRoster = null;

    function rebuildKitRosterFromFennimals() {
        if (StimTemplate.head_source !== "feature_kit") {
            kitRoster = null;
            return;
        }
        kitRoster = { recipes: {}, names: {}, headIds: {}, recipesByHeadId: {} };
        FennimalObjArr.forEach((fen) => {
            if (!fen || !fen.id) return;
            kitRoster.headIds[fen.id] = fen.head;
            kitRoster.names[fen.id] = fen.name;
            kitRoster.recipes[fen.id] = fen.kit_recipe
                ? JSON.parse(JSON.stringify(fen.kit_recipe))
                : null;
            if (fen.head && fen.kit_recipe && !kitRoster.recipesByHeadId[fen.head]) {
                kitRoster.recipesByHeadId[fen.head] = JSON.parse(JSON.stringify(fen.kit_recipe));
            }
        });
    }
    rebuildKitRosterFromFennimals();

    // ----------------------------------------------------
    // ITEM COLOR ASSIGNMENT (toys + boxes)
    // ----------------------------------------------------
    // Hybrid (default): keep baked box colors; swap light/mid palette only on region conflicts.
    // Optional legacy: curated full-box recolor when use_curated_color_sets is true.
    let colorAssignmentOverview = null;
    if (GenParam.use_color_algorithm_to_pick_colors === true) {
        if (GenParam.use_curated_color_sets === true) {
            colorAssignmentOverview = pick_and_apply_curated_color_set(FennimalObjArr);
            paint_all_box_color_templates();
            console.log(
                "%c Curated color set assigned: " + colorAssignmentOverview.set_id
                    + (GenParam.use_color_algorithm_for_toy_colors === true ? " (boxes + toys)" : " (boxes only)"),
                "color:teal",
                colorAssignmentOverview
            );
        } else {
            colorAssignmentOverview = assign_experiment_item_colors(FennimalObjArr);
            paint_all_box_color_templates();
            let nSwap = Object.keys(GenParam.BoxColorSchemes || {}).length;
            console.log(
                "%c Hybrid color assignment: " + nSwap + " box swap(s)"
                    + (GenParam.use_color_algorithm_for_toy_colors === true ? "; toys recolored" : "; toys keep ToyData defaults"),
                "color:teal",
                colorAssignmentOverview
            );
        }
    }
    paint_all_toy_color_templates();

    // ----------------------------------------------------
    // GETTERS & PUBLIC METHODS
    // ----------------------------------------------------
    this.get_experiment_code = () => JSON.parse(JSON.stringify(Experiment_Code));

    this.get_color_assignment_overview = () => (
        colorAssignmentOverview ? JSON.parse(JSON.stringify(colorAssignmentOverview)) : null
    );

    this.get_feature_map = () => JSON.parse(JSON.stringify(FeatureMapConstant));

    this.get_kit_roster = function () {
        return kitRoster ? JSON.parse(JSON.stringify(kitRoster)) : null;
    };

    this.get_head_source = function () {
        return StimTemplate.head_source === "feature_kit" ? "feature_kit" : "svg";
    };

    this.ensureKitHeadsRegistered = async function () {
        if (StimTemplate.head_source !== "feature_kit") return [];
        if (typeof FeatureKit === "undefined") {
            throw new Error("semantic_learning_kit needs FeatureKit.js loaded before StimulusTransformer.");
        }
        let kit = FeatureKit.shared();
        await kit.ensureLoaded();
        let recipesByHeadId = {};
        FennimalObjArr.forEach((fen) => {
            if (!fen || !fen.head || !fen.kit_recipe) return;
            recipesByHeadId[fen.head] = fen.kit_recipe;
        });
        let ids = kit.registerRoster(recipesByHeadId);
        console.log("%c FeatureKit roster registered: " + ids.join(", "), "color:teal");
        return ids;
    };

    /**
     * Layer 1: replace the freshly randomized world with a saved assignment.
     * Returns false if the payload looks unusable (caller keeps the fresh randomization).
     */
    this.hydrate_assignment = function (savedFennimals, savedFeatureMap, savedColorOverview, savedKitRoster) {
        if (!Array.isArray(savedFennimals) || savedFennimals.length === 0) {
            console.warn("hydrate_assignment: missing fennimals");
            return false;
        }

        if (savedFeatureMap && typeof savedFeatureMap === "object") {
            FeatureMap = JSON.parse(JSON.stringify(savedFeatureMap));
            FeatureMapConstant = JSON.parse(JSON.stringify(savedFeatureMap));
        } else {
            console.warn("hydrate_assignment: missing featureMap; fennimal templates restored without code map");
        }

        // Replace array contents in place so any held references stay valid.
        FennimalObjArr.length = 0;
        JSON.parse(JSON.stringify(savedFennimals)).forEach((fen) => FennimalObjArr.push(fen));

        // Clean Firebase/local snapshots strip region ColorSchemes; map/trial rendering needs them.
        FennimalObjArr.forEach((fen) =>
            ensure_fennimal_runtime_color_scheme(fen, StimTemplate.use_constract_color_for_head)
        );

        if (savedColorOverview && GenParam.use_color_algorithm_to_pick_colors === true) {
            apply_saved_color_assignment(savedColorOverview);
            paint_all_box_color_templates();
            paint_all_toy_color_templates();
            colorAssignmentOverview = JSON.parse(JSON.stringify(savedColorOverview));
        }

        if (savedKitRoster && typeof savedKitRoster === "object") {
            kitRoster = JSON.parse(JSON.stringify(savedKitRoster));
        } else {
            rebuildKitRosterFromFennimals();
        }

        this.fill_missing_workshop_toy_codes();
        this.fill_missing_participant_toy_box_codes();

        console.log("%c Restored saved stimulus assignment for this session", "color:teal");
        return true;
    };

    // A restored FeatureMap predates workshop codes. Keep the saved Fennimal
    // toys, and give any missing workshop code an SVG toy that map does not use.
    this.fill_missing_workshop_toy_codes = function () {
        let codes = list_broken_toy_workshop_codes();
        if (!codes.length) return;
        if (!FeatureMap.toy) FeatureMap.toy = {};

        let used = new Set(Object.values(FeatureMap.toy));
        let banned = StimTemplate.banned_toys || [];
        let available = shuffleArray(
            Array.from(document.getElementsByClassName("toy"))
                .map((t) => (t.id || "").split("_")[1])
                .filter((id) => id && !used.has(id) && !banned.includes(id))
        );

        let added = false;
        codes.forEach((code) => {
            if (FeatureMap.toy[code]) return;
            let pick = available.shift();
            if (!pick) {
                throw new Error(
                    `StimulusTransformer: no SVG toy left for workshop code "${code}".`
                );
            }
            FeatureMap.toy[code] = pick;
            used.add(pick);
            added = true;
        });

        if (added) FeatureMapConstant = JSON.parse(JSON.stringify(FeatureMap));
    };

    // A restored FeatureMap may predate participant_toy_box codes. Keep saved
    // Fennimal assignments, and give any missing code an unused SVG asset.
    this.fill_missing_participant_toy_box_codes = function () {
        let specs = list_participant_toy_box_specs();
        list_fennimal_toy_box_boxes().forEach((box) => specs.push({ toy: "", box: box, sack: "" }));
        list_warehouse_sack_codes().forEach((sack) => specs.push({ toy: "", box: "", sack: sack }));
        if (!specs.length) return;
        if (!FeatureMap.toy) FeatureMap.toy = {};
        if (!FeatureMap.toybox) FeatureMap.toybox = {};
        if (!FeatureMap.sack) FeatureMap.sack = {};

        let usedToys = new Set(Object.values(FeatureMap.toy));
        let usedBoxes = new Set(Object.values(FeatureMap.toybox));
        let usedSacks = new Set(Object.values(FeatureMap.sack));
        let bannedToys = StimTemplate.banned_toys || [];
        let toyPool = shuffleArray(
            Array.from(document.getElementsByClassName("toy"))
                .map((t) => (t.id || "").split("_")[1])
                .filter((id) => id && !usedToys.has(id) && !bannedToys.includes(id))
        );
        let boxPool = shuffleArray(
            Array.from(document.getElementsByClassName("toybox"))
                .map((b) => (b.id || "").split("_")[1])
                .filter((id) => id && !usedBoxes.has(id))
        );
        let sackPool = shuffleArray(
            Array.from(document.getElementsByClassName("sack"))
                .map((s) => s.id)
                .filter((id) => id && !usedSacks.has(id))
        );

        let added = false;
        specs.forEach((spec) => {
            if (spec.toy && !FeatureMap.toy[spec.toy]) {
                let pick = toyPool.shift();
                if (!pick) {
                    throw new Error(
                        `StimulusTransformer: no SVG toy left for participant_toy_box code "${spec.toy}".`
                    );
                }
                FeatureMap.toy[spec.toy] = pick;
                usedToys.add(pick);
                added = true;
            }
            if (spec.box && !FeatureMap.toybox[spec.box]) {
                let pick = boxPool.shift();
                if (!pick) {
                    throw new Error(
                        `StimulusTransformer: no SVG box left for participant_toy_box code "${spec.box}".`
                    );
                }
                FeatureMap.toybox[spec.box] = pick;
                usedBoxes.add(pick);
                added = true;
            }
            if (spec.sack && !FeatureMap.sack[spec.sack]) {
                let pick = sackPool.shift();
                if (!pick) {
                    throw new Error(
                        `StimulusTransformer: no SVG sack left for warehouse sack code "${spec.sack}".`
                    );
                }
                FeatureMap.sack[spec.sack] = pick;
                usedSacks.add(pick);
                added = true;
            }
        });

        if (added) FeatureMapConstant = JSON.parse(JSON.stringify(FeatureMap));
    };

    // Every SVG id currently assigned to a stimulus code, including workshop
    // toys that no Fennimal received.
    this.get_mapped_asset_ids = function (type) {
        if (!FeatureMap[type] || typeof FeatureMap[type] !== "object") return [];
        return [...new Set(Object.values(FeatureMap[type]).filter((id) => !!id))];
    };

    this.get_all_Fennimals_objects_in_array = () => JSON.parse(JSON.stringify(FennimalObjArr));

    this.get_all_locations_visited_during_experiment_as_participant_facing_names = function () {
        let All_Locations = this.get_all_x_encountered_during_experiment("location");
        return All_Locations.map(loc => GenParam.LocationDisplayNames[loc]);
    };

    this.get_all_x_encountered_during_experiment = function(x) {
        let Arr = [];
        FennimalObjArr.forEach(fen => {
            if (fen[x] !== undefined) Arr.push(JSON.parse(JSON.stringify(fen[x])));
        });
        return [...new Set(Arr)];
    };

    /** All Fennimal template ids defined for this experiment. */
    this.get_all_Fennimal_ids_in_experiment = function () {
        return FennimalObjArr.map((fen) => fen.id);
    };

    /**
     * All asset ids of a given type currently loaded in the SVG (software catalog).
     * Used as the widest ask_* distractor fallback when the experiment only has one option.
     */
    this.get_all_software_options_of_type = function (type) {
        const withoutBanned = (ids, banned) => {
            if (!banned || !banned.length) return ids;
            return ids.filter((id) => !banned.includes(id));
        };
        if (type === "toy") {
            return withoutBanned([...new Set(
                Array.from(document.getElementsByClassName("toy"))
                    .map((t) => (t.id || "").split("_")[1])
                    .filter(Boolean)
            )], StimTemplate.banned_toys || []);
        }
        if (type === "toybox") {
            return [...new Set(
                Array.from(document.getElementsByClassName("toybox"))
                    .map((b) => (b.id || "").split("_")[1])
                    .filter(Boolean)
            )];
        }
        if (type === "sack") {
            return [...new Set(
                Array.from(document.getElementsByClassName("sack"))
                    .map((s) => s.id)
                    .filter(Boolean)
            )];
        }
        if (type === "hat") {
            return withoutBanned([...new Set(
                Array.from(document.getElementsByClassName("hat"))
                    .map((h) => {
                        let id = h.id || "";
                        return id.startsWith("hat_") ? id.slice(4) : null;
                    })
                    .filter(Boolean)
            )], StimTemplate.banned_hats || []);
        }
        return [];
    };

    this.get_assigned_names_of_code_array = function(type, Arr) {
        if (FeatureMap[type]) {
            return Arr.map(req => FeatureMap[type][req] ? JSON.parse(JSON.stringify(FeatureMap[type][req])) : false);
        } else {
            console.warn(`Requesting assigned name of unknown property ${type}`);
            return false;
        }
    };

    this.get_all_locations_visited_during_experiment_with_regions = function () {
        return FennimalObjArr.filter((fen) => fen && fen.location && fen.region).map((fen) => [
            JSON.parse(JSON.stringify(fen.location)),
            JSON.parse(JSON.stringify(fen.region))
        ]);
    };

    this.get_all_map_codes_of_array = function (property_name, arr) {
        if (!property_name || !FeatureMap[property_name] || !Array.isArray(arr)) return false;
        let OutArr = [];
        arr.forEach(req => {
            if (FeatureMap[property_name][req]) OutArr.push(FeatureMap[property_name][req]);
        });
        return OutArr;
    };

    this.get_number_of_days_in_experiment = function () {
        return this.Experiment_Structure.filter(block => block.type !== "pseudoday").length;
    };

    /** True if any Fennimal template in this experiment was assigned a sack. */
    this.fennimal_templates_include_sacks = function () {
        return Array.isArray(FennimalObjArr) && FennimalObjArr.some((fen) => !!fen.sack);
    };

    /**
     * Walk the experiment structure for an interaction_type string
     * (top-level, arrays, trial_subblocks cartesian / explicit trials, orthogonal tasks).
     */
    this.experiment_includes_interaction_type = function (interactionType) {
        if (!interactionType || !Array.isArray(this.Experiment_Structure)) return false;

        const typeMatches = (value) => {
            if (value === interactionType) return true;
            return Array.isArray(value) && value.includes(interactionType);
        };

        for (let block of this.Experiment_Structure) {
            if (!block) continue;
            if (typeMatches(block.interaction_type)) return true;
            if (typeMatches(block.included_orthogonal_tasks)) return true;
            let lists = [];
            if (Array.isArray(block.trial_subblocks)) lists.push(block.trial_subblocks);
            if (Array.isArray(block.conditions)) {
                block.conditions.forEach((cond) => {
                    if (cond && Array.isArray(cond.trial_subblocks)) lists.push(cond.trial_subblocks);
                });
            }
            for (let list of lists) {
                for (let sb of list) {
                    if (!sb) continue;
                    if (typeMatches(sb.interaction_type)) return true;
                    if (Array.isArray(sb.trials) && sb.trials.some((t) => t && t.interaction_type === interactionType)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    /** True when a warehouse cleanup names a sack (toy into that sack, or that sack into a box). */
    this.experiment_includes_warehouse_sack = function () {
        if (!Array.isArray(this.Experiment_Structure)) return false;
        for (let block of this.Experiment_Structure) {
            if (!block) continue;
            let lists = [];
            if (Array.isArray(block.trial_subblocks)) lists.push(block.trial_subblocks);
            if (Array.isArray(block.conditions)) {
                block.conditions.forEach((cond) => {
                    if (cond && Array.isArray(cond.trial_subblocks)) lists.push(cond.trial_subblocks);
                });
            }
            for (let list of lists) {
                for (let sb of list) {
                    if (!sb || sb.interaction_type !== "warehouse_cleanup") continue;
                    if (typeof sb.sack === "string" && sb.sack.trim() !== "") return true;
                }
            }
        }
        return false;
    };

    /**
     * Sack memory probes after the participant has packed a sack:
     * toy_to_sack at a Fennimal's home, or a warehouse cleanup that names a sack.
     */
    this.should_include_sack_memory_probes = function () {
        let practicedAtHome = this.fennimal_templates_include_sacks()
            && this.experiment_includes_interaction_type("toy_to_sack");
        return practicedAtHome || this.experiment_includes_warehouse_sack();
    };

    this._isPartnerBeliefMemoryProbeKind = function (kind) {
        return kind === "memory_probe_box_to_fennimal"
            || kind === "memory_probe_box_decorator"
            || kind === "memory_probe_fennimal_to_toy"
            || kind === "memory_probe_box_to_sack"
            || kind === "memory_probe_sack_to_toy";
    };

    this._isSackMemoryProbeKind = function (kind) {
        return kind === "memory_probe_box_to_sack" || kind === "memory_probe_sack_to_toy";
    };

    /**
     * Count expandable memory-probe trials from typed questions[] declarations.
     * Mirrors PartnerBeliefIndividualBoxesController eligibility / sack auto-gate.
     */
    this._countPartnerBeliefMemoryProbeTrials = function (probeSpecs) {
        if (!Array.isArray(probeSpecs) || probeSpecs.length === 0) return 0;
        let fens = Array.isArray(FennimalObjArr) ? FennimalObjArr : [];
        let includeSack = this.should_include_sack_memory_probes();
        let total = 0;

        probeSpecs.forEach((spec) => {
            if (!spec || !this._isPartnerBeliefMemoryProbeKind(spec.kind)) return;
            if (this._isSackMemoryProbeKind(spec.kind) && !includeSack) return;

            let pool = fens;
            if (Array.isArray(spec.fennimals) && spec.fennimals.length > 0) {
                let wanted = new Set(spec.fennimals.map(String));
                pool = fens.filter((f) => f && wanted.has(String(f.id)));
            }

            switch (spec.kind) {
                case "memory_probe_box_to_fennimal":
                    total += pool.filter((f) => f && f.toybox && f.toy).length;
                    break;
                case "memory_probe_box_decorator":
                    // One trial per declaration (requires target_box in questions[]).
                    total += (spec.target_box) ? 1 : 0;
                    break;
                case "memory_probe_fennimal_to_toy":
                    total += pool.filter((f) => f && f.toy).length;
                    break;
                case "memory_probe_box_to_sack":
                    // only_if_placed: one question, and only if a sack actually entered the box.
                    total += (spec.only_if_placed === true)
                        ? 1
                        : pool.filter((f) => f && f.sack && f.toybox).length;
                    break;
                case "memory_probe_sack_to_toy":
                    // correct_from "sack_contents": one question, scored from the sack's toy.
                    total += (spec.correct_from === "sack_contents")
                        ? 1
                        : pool.filter((f) => f && f.sack && f.toy).length;
                    break;
            }
        });
        return total;
    };

    this.get_Feature_maps = () => FeatureMapConstant;
    this.get_forced_heads = function () {
        return Array.isArray(StimTemplate.forced_heads) ? StimTemplate.forced_heads.slice() : [];
    };
    this.get_leftover_forced_heads = function () {
        let used = this.get_all_x_encountered_during_experiment("head") || [];
        return this.get_forced_heads().filter((h) => h && !used.includes(h));
    };
    this.get_instruction_pages_arr = () => JSON.parse(JSON.stringify(StimTemplate.Instructions_at_start || []));
    this.get_questionnaire_pages_arr = () => JSON.parse(JSON.stringify(StimTemplate.Pages_at_end || []));
    this.get_bonus_details = () => JSON.parse(JSON.stringify(StimTemplate.BonusStarValue));

    // NEW: Updated to parse your block structure cleanly
    this.get_maximum_number_of_bonus_stars = function () {
        let max_stars = 0;
        this.Experiment_Structure.forEach(block => {
            if ((block.type === "partner_belief" || block.type === "partner_belief_multiple") && typeof block.bonus_stars_per_correct_answer === "number") {
                max_stars += block.bonus_stars_per_correct_answer * block.toyboxes_asked.length;
            }

            if (block.type === "partner_belief_individual_boxes" && typeof block.bonus_stars_per_correct_answer === "number") {
                let bonus = block.bonus_stars_per_correct_answer;
                let nBlocks = (typeof block.num_belief_blocks === "number" && block.num_belief_blocks > 0)
                    ? block.num_belief_blocks
                    : ((typeof block.num_repeated_blocks === "number" && block.num_repeated_blocks > 0) ? block.num_repeated_blocks : 1);
                let beliefQuestions = (block.questions || []).filter((q) =>
                    q && !this._isPartnerBeliefMemoryProbeKind(q.kind)
                );
                let memoryProbeSpecs = (block.questions || []).filter((q) =>
                    q && this._isPartnerBeliefMemoryProbeKind(q.kind)
                );
                let nQuestions = beliefQuestions.length;
                let nGating = (block.gating_boxes || []).length;
                let nAction = (block.action_prediction_toys || []).length;
                let nBeliefTrials = nQuestions * nBlocks;
                let nRealityTrials = (block.include_reality_block_at_end === true) ? nQuestions : 0;
                // Gating / belief / action / reality each earn stars; each is preceded by a distractor that also earns stars.
                max_stars += bonus * (nGating + nBeliefTrials + nAction + nRealityTrials) * 2;
                if (block.include_partner_knowledge_trial === true) {
                    // Shape match, then the partner-knowledge question. Both earn a star.
                    max_stars += bonus * 2;
                }
                if (block.include_practice_trial === true) {
                    // Shape-match + color-match practice.
                    max_stars += bonus * 2;
                }
                max_stars += bonus * this._countPartnerBeliefMemoryProbeTrials(memoryProbeSpecs);
            }

            if (block.type === "name_recall_task" && typeof block.bonus_stars_per_correct_answer === "number") {
                let nFens = (typeof this.get_all_Fennimals_objects_in_array === "function")
                    ? this.get_all_Fennimals_objects_in_array().length
                    : 0;
                max_stars += block.bonus_stars_per_correct_answer * nFens;
            }

            if (block.type === "phone_room" && typeof block.bonus_stars_per_correct_answer === "number") {
                let hasTransfer = false;
                const noteType = (value) => {
                    if (value === "Fennimal_food_transfer") hasTransfer = true;
                    if (Array.isArray(value) && value.indexOf("Fennimal_food_transfer") >= 0) hasTransfer = true;
                };
                noteType(block.interaction_type);
                (block.trial_subblocks || []).forEach((sb) => {
                    if (!sb) return;
                    noteType(sb.interaction_type);
                    (sb.trials || []).forEach((t) => { if (t) noteType(t.interaction_type); });
                });
                if (hasTransfer) max_stars += block.bonus_stars_per_correct_answer;
            }

            if (block.type === "morph_task") {
                if (typeof MorphTaskController !== "undefined"
                    && typeof MorphTaskController.countMaxEarnableStars === "function") {
                    max_stars += MorphTaskController.countMaxEarnableStars(block);
                } else {
                    let mixes = Array.isArray(block.mixes) ? block.mixes : [];
                    let pairs = Array.isArray(block.pairs) ? block.pairs : [];
                    if (mixes.length && pairs.length) {
                        max_stars += mixes.length * pairs.length * 2;
                    } else if (Array.isArray(block.trials) && block.trials.length) {
                        if (Array.isArray(block.trials[0])) {
                            let sizes = block.trials.map((b) => Array.isArray(b) ? b.length : 0);
                            max_stars += sizes.length ? Math.max.apply(null, sizes) : 0;
                        } else {
                            max_stars += block.trials.length;
                        }
                    }
                }
            }

            // FIX: Ensure the sorting task's stars are included in the global estimate
            if (block.type === "Fennimal_attribute_sorting_task") {
                if (typeof block.maximum_earnable_stars === "number") {
                    max_stars += block.maximum_earnable_stars;
                } else if (typeof block.maximum_bonus_stars_earned === "number") {
                    max_stars += block.maximum_bonus_stars_earned;
                }
            }
        });
        return max_stars;
    };

    this.get_Fennimals_in_array = function (Arr_of_ids) {
        if (Arr_of_ids === "all") return JSON.parse(JSON.stringify(FennimalObjArr));
        return FennimalObjArr.filter(fen => Arr_of_ids.includes(fen.id));
    };

    this.get_unused_items_of_type = function(type, number) {
        let Available = JSON.parse(JSON.stringify(shuffleArray(Maps.Free[type] || [])));
        return Available.length >= number ? Available.slice(0, number) : Available;
    };

    this.get_clean_Fennimal_templates = function () {
        let rawArr = this.get_all_Fennimals_objects_in_array();
        return rawArr.map(fen => {
            let cleanFen = JSON.parse(JSON.stringify(fen));
            if (cleanFen.color_scheme_origin !== "custom") delete cleanFen.ColorScheme;
            return cleanFen;
        });
    };
};

console.log("P-READY")