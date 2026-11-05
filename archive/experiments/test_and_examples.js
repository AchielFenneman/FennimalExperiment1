/*
 * ARCHIVED — not loaded by index.html.
 * Paste the relevant keys back into 2_Stimulus_data.js to restore.
 * See archive/MANIFEST.md.
 */

// All_Fennimal_Sets leftovers
        test: {
            "A": { head: "B", region: "A", toy: "A", hat: "A" },
            "B": { head: "B", region: "B", toy: "B", hat: "B" },
            "C": { head: "C", region: "B", toy: "C", hat: "C" },
            "D": { head: "D", region: "D", toy: "B", hat: "D" },
         
        },


        example: {
            "A": { head: "B", region: "A", toy: "A", hat: "A" },
            "B": { head: "B", region: "B", toy: "B", hat: "B" },
            "C": { head: "C", region: "B", toy: "C", hat: "C" },
            "D": { head: "D", region: "D", toy: "B", hat: "D" },
            "E": { head: "E", region: "E", toy: "D", hat: "E" },
        },
        // 4 regions × 4 unique heads. head_group / head_cluster are abstract
        // labels (matched by size, not by SVG class name). Pair the two
        // animal-cluster categories on one cluster and the two holiday
        // categories on the other — the SVG consumes a whole cluster at once.
        // Do not set hat/toy. Do not use forced_heads (that path skips grouping).
        example_semantic_exp1: {
            "A1": { head: "A1", region: "A", head_group: "A", head_cluster: "AB" },
            "A2": { head: "A2", region: "A", head_group: "A", head_cluster: "AB" },
            "A3": { head: "A3", region: "A", head_group: "A", head_cluster: "AB" },
            "A4": { head: "A4", region: "A", head_group: "A", head_cluster: "AB" },

            "B1": { head: "B1", region: "B", head_group: "B", head_cluster: "AB" },
            "B2": { head: "B2", region: "B", head_group: "B", head_cluster: "AB" },
            "B3": { head: "B3", region: "B", head_group: "B", head_cluster: "AB" },
            "B4": { head: "B4", region: "B", head_group: "B", head_cluster: "AB" },

            "C1": { head: "C1", region: "C", head_group: "C", head_cluster: "CD" },
            "C2": { head: "C2", region: "C", head_group: "C", head_cluster: "CD" },
            "C3": { head: "C3", region: "C", head_group: "C", head_cluster: "CD" },
            "C4": { head: "C4", region: "C", head_group: "C", head_cluster: "CD" },

            "D1": { head: "D1", region: "D", head_group: "D", head_cluster: "CD" },
            "D2": { head: "D2", region: "D", head_group: "D", head_cluster: "CD" },
            "D3": { head: "D3", region: "D", head_group: "D", head_cluster: "CD" },
            "D4": { head: "D4", region: "D", head_group: "D", head_cluster: "CD" },
        },
        // Same 4×4 categories as exp1, but two Fennimals are swapped
        // between A↔C and B↔D so each region is mixed (2 home + 2 other):
        //   A: A+C,  B: B+D,  C: C+A,  D: D+B
        // Keep four groups of 4. The matcher maps head_group by SIZE onto
        // SVG categories (safari / bird / halloween / xmas); a group of 6
        // cannot fit a 4-head SVG category.
        example_semantic_exp2: {
            "A1": { head: "A1", region: "A", head_group: "A", head_cluster: "AB" },
            "A2": { head: "A2", region: "A", head_group: "A", head_cluster: "AB" },
            "A3": { head: "A3", region: "A", head_group: "C", head_cluster: "CD" },
            "A4": { head: "A4", region: "A", head_group: "C", head_cluster: "CD" },

            "B1": { head: "B1", region: "B", head_group: "B", head_cluster: "AB" },
            "B2": { head: "B2", region: "B", head_group: "B", head_cluster: "AB" },
            "B3": { head: "B3", region: "B", head_group: "C", head_cluster: "CD" },
            "B4": { head: "B4", region: "B", head_group: "C", head_cluster: "CD" },

            "C1": { head: "C1", region: "C", head_group: "D", head_cluster: "CD" },
            "C2": { head: "C2", region: "C", head_group: "D", head_cluster: "CD" },
            "C3": { head: "C3", region: "C", head_group: "A", head_cluster: "AB" },
            "C4": { head: "C4", region: "C", head_group: "A", head_cluster: "AB" },

            "D1": { head: "D1", region: "D", head_group: "D", head_cluster: "CD" },
            "D2": { head: "D2", region: "D", head_group: "D", head_cluster: "CD" },
            "D3": { head: "D3", region: "D", head_group: "B", head_cluster: "AB" },
            "D4": { head: "D4", region: "D", head_group: "B", head_cluster: "AB" },
        },
        example_sem_star: {
            "A": { head: "B", region: "A", toy: "A", hat: "A" },
            "B": { head: "B", region: "B", toy: "B", hat: "B" },
            "C": { head: "C", region: "B", toy: "C", hat: "C" },
            "D": { head: "D", region: "D", toy: "B", hat: "D" },
        },
        
        
        
    };

// All_Experiment_Structures leftovers
    let All_Experiment_Structures = {
        test: [
            {type: "hat_binding_task",
                skip_instructions: false,
                randomization_id: "binding_search_condition",
                arm_randomization_id: "binding_star_arms",
                // Weighted by duplicates. One value is drawn per participant and persisted.
                condition: ["group_based"], //["group_based", "pair_based", "control"]
                retraining_fennimals: ["A", "B", "C", "D"],
                // true = gistDescriptions for that linking feature; anything else = generic names.
                use_head_gist_descriptions: true,
                use_region_gist_descriptions: true,
                use_toy_gist_descriptions: true,
                blocks: [
                    {
                        kind: "join",
                        flavour: "exam"
                    },
                    {
                        kind: "join",
                        flavour: "shipping"
                    },
                    {
                        kind: "join",
                        flavour: "party"
                    },
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
                        kind: "binding",
                        flavour: "gift_shop",
                        cover_story: "Let's buy some new hats for the Fennimals! One hat at a time, we will give you a description of a Fennimal. First, answer a few questions to help you picture that Fennimal. Then place a new version of this Fennimal's hat in the shopping cart."
                    },
                    
                ]
            },
            {
                type: "morph_task",
                skip_instructions: true,
                skip_practice: true,
                partner_behavior: "absent",
                trial_speed: 5000,
                // F/J identity keys: "hats" (default) | "heads" (grayscale) | "names".
                response_key_icons: "hats",
                // After the name quiz, lift the head [?]: true = show the prime
                // head; false = hat only (empty space, no head or smear).
                show_head_on_prime: false,
                // leftover-of-trio primes (A/C/D; B is name-quiz lure).
                // MorphTask expands morphs × mixes × pairs × both targets, then
                // assigns one morph from morphs[] per subject (between-subjects).
                names_options: ["A", "B", "C", "D"],
                morphs: ["crossfade", "silhouette"], //"mesh", 
                mixes: [50, 65],
                pairs: [
                    { prime: "A", fenA: "C", fenB: "D" },
                    { prime: "C", fenA: "A", fenB: "D" },
                    { prime: "D", fenA: "A", fenB: "C" }
                ]
            }
        ],

        example: [
            // BLOCK 1: Introduction to all Fennimals
            {
               type: "free_exploration",
               interaction_type: ["photo_Fennimal"],
               Fennimals_encountered: ["A", "B", "C", "D", "E"],
             
               include_Fennefinder: true,
               force_climbing_tower_first: false
           },
       ],
       example_semantic_exp1: [
        // BLOCK 1: Introduction to all Fennimals
        {
           type: "free_exploration",
           interaction_type: ["photo_Fennimal"],
           Fennimals_encountered: ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4", "D1", "D2", "D3", "D4"],
         
           include_Fennefinder: true,
           force_climbing_tower_first: false
       },
    ],
    example_semantic_exp2: [
        // BLOCK 1: Introduction to all Fennimals
        {
           type: "free_exploration",
           interaction_type: ["photo_Fennimal"],
           Fennimals_encountered: ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4", "D1", "D2", "D3", "D4"],
         
           include_Fennefinder: true,
           force_climbing_tower_first: false
       },
    ],
    example_sem_star: [
        // BLOCK 1: Introduction to all Fennimals
        /*{
           type: "free_exploration",
           interaction_type: ["photo_Fennimal"],
           Fennimals_encountered: ["A", "B", "C", "D"],
         
           include_Fennefinder: true,
           force_climbing_tower_first: false
       },
       */

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
    },
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


   ],

// Head-pool leftovers
    const All_Allowed_Head_Lists = {
        test: false,
        mentalizing_1: false,
        // Pin the 4×4 semantic categories. Use allowed_heads (not forced_heads)
        // so group/cluster matching still runs. SVG id is christmastree, not xmastree.
        example_semantic_exp1: [
            "rhino", "giraffe", "lion", "elephant",
            "toucan", "peacock", "parrot", "eagle",
            "jackolantern", "ghost", "skull", "tombstone",
            "santa", "giftbox", "stocking", "christmastree"
        ],
        example_semantic_exp2: [
            "rhino", "giraffe", "lion", "elephant",
            "toucan", "peacock", "parrot", "eagle",
            "jackolantern", "ghost", "skull", "tombstone",
            "santa", "giftbox", "stocking", "christmastree"
        ],
    };

    const All_Forced_Head_Lists = {
        // Four unique head codes in the test dictionary (A/B share one). The
        // forced-head pool below limits assignment to four concrete SVG heads
        // so mesh trials always morph between distinct shapes.
        test: ["tomato", "pig", "aliengrey", "cupcake"],
        semantic_learning: ["astro", "cupcake", "tube", "tv", "jackolantern", "elephant", "blockhead", "parrot"],
        semantic_learning_star: ["bell", "pig", "bun"],

        mentalizing: ["astro", "cupcake", "tube", "tv", "jackolantern", "elephant", "blockhead", "parrot"],
        mentalizing_AB: ["astro", "cupcake", "tube", "tv", "jackolantern", "elephant", "blockhead", "parrot"],
        mentalizing_AC: ["astro", "cupcake", "tube", "tv", "jackolantern", "elephant", "blockhead", "parrot"], //["alien", "donut", "radio", "jackolantern", "rhino",  "eagle", "brush"]
        mentalizing_between_subjects: ["astro", "cupcake", "tube", "tv", "jackolantern", "elephant", "blockhead", "parrot"],
        example: ["elephant", "jackolantern", "giraffe", "stocking"],
        example_sem_star: ["bell", "pig", "bun"],
       

