let StimulusSettings = function () {

    this.Experiment_Code = ["mentalizing_AB"];

    const All_Instructions_At_Start = {
        test: [],
        mentalizing_network: ["browser_check_and_full_screen_prompt", "consent", "single_sitting", "character_creation", "overview", "partner_introduction"],
        mentalizing: ["browser_check_and_full_screen_prompt", "consent", "single_sitting", "character_creation", "overview", "partner_introduction"],
        mentalizing_AB: ["browser_check_and_full_screen_prompt", "consent", "single_sitting", "character_creation", "overview", "partner_introduction"],
    };

    // ----------------------------------------------------
    // DICTIONARY OF FENNIMAL TEMPLATES
    // Key: The unique Fennimal ID
    // Value: The required and optional properties
    // ----------------------------------------------------
    const All_Fennimal_Sets = {
        test: {
            "S1": { head: "A", region: "A", toy: "A", toybox: "A" },
            "S2": { head: "B", region: "B", toy: "B", toybox: "B" },
          
            "P1": { head: "D", region: "D", toy: "D", toybox: "A" },
            "P2": { head: "E", region: "E", toy: "E", toybox: "B" },
        
        },

        mentalizing: {
            "S1": { head: "A", region: "A", toy: "A", toybox: "A" },
            "S2": { head: "B", region: "B", toy: "B", toybox: "B" },
            "S3": { head: "C", region: "C", toy: "C", toybox: "C" },
            "P1": { head: "D", region: "D", toy: "D", toybox: "A" },
            "P2": { head: "E", region: "E", toy: "E", toybox: "B" },
            "P3": { head: "F", region: "F", toy: "F", toybox: "C" }
        },
        mentalizing_AB: {
            "S1": { head: "A", region: "A", toy: "A", toybox: "A" },
            "S2": { head: "B", region: "B", toy: "B", toybox: "B" },
            "P1": { head: "D", region: "D", toy: "D", toybox: "A" },
            "P2": { head: "E", region: "E", toy: "E", toybox: "B" },
        },
    };

    // ----------------------------------------------------
    // EXPERIMENT STRUCTURE (BLOCKS & TRIALS)
    // ----------------------------------------------------
    let All_Experiment_Structures = {
        test: [

            
            
            {
                type: "phone_room",
                partner_behavior: "active",
                trial_subblocks: [
                    {
                        Fennimals_encountered: ["S1", "S2"],
                        interaction_type: "box_room"
                    }
                ]
            },

            {
                type: "phone_room",
                partner_behavior: "passive",
                trial_subblocks: [
                    {
                        Fennimals_encountered: ["P1", "P2"],
                        interaction_type: "box_room"
                    }
                ]
            },
            
           
            // Starts here for UI testing. Controller auto-seeds false-belief WorldState when
            // boxes are empty (partner beliefs ≠ current contents). In the full mentalizing
            // structure this state is created by shared then private toy_to_box play.
           
        ],


        mentalizing: [

            // BLOCK 1: Introduction to shared Fennimals
            {
                type: "free_exploration",
                interaction_type: ["Fennimal_toy"],
                Fennimals_encountered: ["S1", "S2", "S3"],
                partner_behavior: "active",
                include_Fennefinder: true,
                force_climbing_tower_first: true
            },

            // BLOCK 2: Main shared block (toy_to_box first, then mixed joint/photo/feed)
            {
                type: "phone_room",
                partner_behavior: "active",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: false,
                ask_Fennimal: true,
                ask_toy: true,
                ask_box: true,
                trial_subblocks: [
                    {
                        Fennimals_encountered: ["S1", "S2", "S3"],
                        interaction_type: "broken_toy_no_box"
                    },
                    {
                        Fennimals_encountered: ["S1", "S2", "S3"],
                        interaction_type: "Fennimal_toy"
                    },
                    {
                        Fennimals_encountered: ["S1", "S2", "S3"],
                        interaction_type: "toy_to_box"
                    },
                    {
                        trials: [
                            { Fennimal: "S1", interaction_type: "joint_box_decoration" },
                        ]
                    },
                    {
                        trials: [
                            { Fennimal: "S2", interaction_type: "photo_box" },
                            { Fennimal: "S3", interaction_type: "photo_box" },
                            { Fennimal: "S2", interaction_type: "photo_Fennimal" },
                            { Fennimal: "S3", interaction_type: "photo_Fennimal" }
                        ]
                    },
                    {
                        trials: [
                            { Fennimal: "S1", interaction_type: "joint_box_cleaning" },
                        ]
                    },
                ]
            },

            {
                type: "pseudoday",
                information: "partner_leaves"
            },
            {
                type: "pseudoday",
                information: "new_Fennimals_spotted",
                displayed_icons: ["P1", "P2", "P3"],
                title: "Get to know some more Fennimals on the island",
                display_text: "While %PARTNERNAME% is away, there are some Fennimals on the island who would love to get to know you! Unfortunately, we ran out of boxes to store the toys in, so we will have to reuse some of the boxes."
            },

            // BLOCK 3: Introduction to private Fennimals
            {
                type: "free_exploration",
                interaction_type: ["Fennimal_toy"],
                Fennimals_encountered: ["P1", "P2", "P3"],
                partner_behavior: "absent",
                include_Fennefinder: true,
                force_climbing_tower_first: true
            },

            // BLOCK 4: Main private block (toy_to_box first, then mixed joint/photo/feed)
            {
                type: "phone_room",
                partner_behavior: "absent",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: false,
                ask_Fennimal: true,
                ask_toy: true,
                ask_box: true,
                trial_subblocks: [
                    {
                        Fennimals_encountered: ["P1", "P2", "P3"],
                        interaction_type: "broken_toy_no_box"
                    },
                    {
                        Fennimals_encountered: ["P1", "P2", "P3"],
                        interaction_type: "Fennimal_toy"
                    },
                    {
                        Fennimals_encountered: ["P1", "P2", "P3"],
                        interaction_type: "toy_to_box"
                    },
                    {
                        trials: [
                            { Fennimal: "P2", interaction_type: "joint_box_decoration" },
                         
                        ]
                    },
                    {
                        trials: [
                            { Fennimal: "P1", interaction_type: "photo_box" },
                            { Fennimal: "P3", interaction_type: "photo_box" },
                            { Fennimal: "P1", interaction_type: "photo_Fennimal" },
                            { Fennimal: "P3", interaction_type: "photo_Fennimal" }
                        ]
                    },
                    {
                        trials: [
                            { Fennimal: "P2", interaction_type: "joint_box_cleaning" },
                         
                        ]
                    },
                ]
            },

            {
                type: "pseudoday",
                information: "partner_returns"
            },

            // BLOCK 5: Partner belief (individual boxes)
            {
                type: "partner_belief_individual_boxes",
                include_practice_trial: true,
                num_belief_blocks: 1,
                include_reality_block_at_end: true,
                include_memory_probe_at_end: true,
                bonus_stars_per_correct_answer: 1,
                memory_probe_isi_ms: 1000,
                questions: [
                    { question_id: "belief_A", target_box: "A" },
                    { question_id: "belief_B", target_box: "B" },
                    { question_id: "belief_C", target_box: "C" }
                ]
            },



        ],
        mentalizing_AB: [

            // BLOCK 1: Introduction to shared Fennimals
            {
                type: "free_exploration",
                interaction_type: ["Fennimal_toy"],
                Fennimals_encountered: ["S1", "S2"],
                partner_behavior: "active",
                include_Fennefinder: true,
                force_climbing_tower_first: true
            },

            // BLOCK 2: Main shared block (toy_to_box first, then mixed joint/photo/feed)
            {
                type: "phone_room",
                partner_behavior: "active",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: false,
                ask_Fennimal: true,
                ask_toy: true,
                ask_box: true,
                trial_subblocks: [
                    {
                        Fennimals_encountered: ["S1", "S2"],
                        interaction_type: "broken_toy_no_box"
                    },
                    {
                        Fennimals_encountered: ["S1", "S2"],
                        interaction_type: "Fennimal_toy"
                    },
                    
                    {
                        Fennimals_encountered: ["S1", "S2"],
                        interaction_type: "box_room"
                    },
                    {
                        trials: [
                            { Fennimal: "S1", interaction_type: "joint_box_decoration" },
                        ]
                    },
                    {
                        trials: [
                            { Fennimal: "S2", interaction_type: "photo_box" },
                            { Fennimal: "S2", interaction_type: "photo_Fennimal" },
                        ]
                    },
                    {
                        trials: [
                            { Fennimal: "S1", interaction_type: "joint_box_cleaning" },
                        ]
                    },
                ]
            },

            {
                type: "pseudoday",
                information: "partner_leaves"
            },
            {
                type: "pseudoday",
                information: "new_Fennimals_spotted",
                displayed_icons: ["P1", "P2"],
                title: "Get to know some more Fennimals on the island",
                display_text: "While %PARTNERNAME% is away, there are some Fennimals on the island who would love to get to know you! Unfortunately, we ran out of boxes to store the toys in, so we will have to reuse some of the boxes."
            },

            // BLOCK 3: Introduction to private Fennimals
            {
                type: "free_exploration",
                interaction_type: ["Fennimal_toy"],
                Fennimals_encountered: ["P1", "P2"],
                partner_behavior: "absent",
                include_Fennefinder: true,
                force_climbing_tower_first: true
            },

            // BLOCK 4: Main private block (toy_to_box first, then mixed joint/photo/feed)
            {
                type: "phone_room",
                partner_behavior: "absent",
                include_Fennefinder: false,
                return_to_phone_room_after_final_trial: false,
                ask_Fennimal: true,
                ask_toy: true,
                ask_box: true,
                trial_subblocks: [
                    {
                        Fennimals_encountered: ["P1", "P2"],
                        interaction_type: "broken_toy_no_box"
                    },
                    {
                        Fennimals_encountered: ["P1", "P2"],
                        interaction_type: "Fennimal_toy"
                    },
                    {
                        Fennimals_encountered: ["P1", "P2"],
                        interaction_type: "box_room"
                    },
                    {
                        trials: [
                            { Fennimal: "P2", interaction_type: "joint_box_decoration" },
                         
                        ]
                    },
                    {
                        trials: [
                            { Fennimal: "P1", interaction_type: "photo_box" },
                            { Fennimal: "P1", interaction_type: "photo_Fennimal" },
                        ]
                    },
                    {
                        trials: [
                            { Fennimal: "P2", interaction_type: "joint_box_cleaning" },
                         
                        ]
                    },
                ]
            },

            {
                type: "pseudoday",
                information: "partner_returns"
            },

            // BLOCK 5: Partner belief (individual boxes)
            {
                type: "partner_belief_individual_boxes",
                include_practice_trial: true,
                num_belief_blocks: 1,
                include_reality_block_at_end: true,
                include_memory_probe_at_end: true,
                bonus_stars_per_correct_answer: 1,
                memory_probe_isi_ms: 1000,
                questions: [
                    { question_id: "belief_A", target_box: "A" },
                    { question_id: "belief_B", target_box: "B" },
                ]
            },



        ]
    };

    const All_Questionnaire_Page_sets = {
        test: [],
      
        mentalizing: ["demographics_questionnaire"],
        mentalizing_AB: ["demographics_questionnaire"],
    };

    const All_Allowed_Head_Lists = { test: false, mentalizing_1: false };
    const All_Banned_Head_Lists = { test: false, mentalizing_1: false };
    const All_Forced_Head_Lists = {
        test: ["astro", "cupcake", "tube", "tv", "jackolantern", "elephant", "blockhead", "parrot"],

        mentalizing: ["astro", "cupcake", "tube", "tv", "jackolantern", "elephant", "blockhead", "parrot"],
        mentalizing_AB: ["astro", "cupcake", "tube", "tv", "jackolantern", "elephant", "blockhead", "parrot"],
    };

    const All_Allowed_Head_Groups_List = { test: false, mentalizing_1: false };
    const All_Banned_Head_Groups_List = { test: false, mentalizing_1: false };

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

    // NEW: We grab the dictionary of Fennimals directly!
    this.Fennimal_Dictionary = All_Fennimal_Sets[this.Experiment_Code];

    this.Instructions_at_start = All_Instructions_At_Start[this.Experiment_Code] || false;
    this.Pages_at_end = All_Questionnaire_Page_sets[this.Experiment_Code] || false;

    this.allowed_heads = All_Allowed_Head_Lists[this.Experiment_Code] || false;
    this.banned_heads = All_Banned_Head_Lists[this.Experiment_Code] || false;
    this.forced_heads = All_Forced_Head_Lists[this.Experiment_Code] || false;
    this.allowed_head_groups = All_Allowed_Head_Groups_List[this.Experiment_Code] || false;
    this.banned_head_groups = All_Banned_Head_Groups_List[this.Experiment_Code] || false;

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
                let ReqHeads_Arr = Object.values(RequestedHeads).sort((a,b) => b.total_heads - a.total_heads);

                let AssignedGroups = [];
                for (let req of ReqHeads_Arr) {
                    let possible_keys = Object.keys(AvailableInSVG).filter(k => can_requested_group_fit_in_available_group(req, AvailableInSVG[k]));

                    if (possible_keys.length === 0) {
                        console.error("ERROR: CANNOT RESOLVE HEAD ASSIGNMENT FROM AVAILABLE SVG HEADS.");
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

                        let selected_group_name = shuffleArray(possible_group_names)[0];
                        let selected_group = shuffleArray([...pair.Matched.groups[selected_group_name]]);
                        delete pair.Matched.groups[selected_group_name];

                        reqGroup.forEach((code, index) => {
                            MatchedHeads[code] = selected_group[index];
                        });
                    }
                }
            }
            return MatchedHeads;
        }

        // ----------------------------------------------------
        // SVG DOM EXTRACTION HELPERS
        // ----------------------------------------------------
        function get_all_available_hats() {
            return Array.from(SVG_Hats_Layer.childNodes)
                .filter(n => n.nodeType === Node.ELEMENT_NODE)
                .map(n => n.id.replace("hat_", ""));
        }

        function get_all_available_toys() {
            return Array.from(document.getElementsByClassName("toy")).map(t => t.id.split("_")[1]);
        }

        function get_all_food_flavors_in_SVG() {
            let All_Bags_Arr = Array.from(document.getElementsByClassName("foodbag_flavor")).map(b => b.id.split("_")[2]);
            let All_Foods_Arr = [...new Set(Array.from(document.getElementsByClassName("food")).map(f => f.id.split("_")[1]))];
            return All_Bags_Arr.filter(x => All_Foods_Arr.includes(x));
        }

        function get_all_boxes_in_SVG() {
            return [...new Set(Array.from(document.getElementsByClassName("toybox")).map(b => b.id.split("_")[1]))];
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
            for (let id in StimTemplate.Fennimal_Dictionary) {
                let fenReq = StimTemplate.Fennimal_Dictionary[id];
                for (let key in fenReq) {
                    if (fenReq[key] !== false) {
                        if (!Counts[key]) Counts[key] = new Set();
                        Counts[key].add(fenReq[key]);
                    }
                }
            }

            for (let key in Counts) {
                Variable_Features[key] = Array.from(Counts[key]); // Convert Set to Array of unique requests
            }
        }

        function assign_map_values() {
            extract_required_variables();
            let Map = {};
            let UnMappedItems = {};

            if (Variable_Features.head) Map.head = match_head_codes_to_head_names();

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

                if (available.length < Variable_Features[feature_name].length) {
                    console.error(`ERROR: Not enough ${feature_name}s in SVG for requirements!`);
                }

                Variable_Features[feature_name].forEach(req => {
                    Map[feature_name][req] = available.shift();
                });
                UnMappedItems[feature_name] = available; // Save leftovers for distractors
            };

            map_simple_feature("hat", get_all_available_hats());
            map_simple_feature("food_preference", get_all_food_flavors_in_SVG());
            map_simple_feature("toy", get_all_available_toys());
            map_simple_feature("toybox", get_all_boxes_in_SVG());

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
    function create_Fennimals_from_stimulus_template(Dict, Map) {
        let Arr = [];

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
                FenObj.location = Map.region[req.region].Locations.shift(); // Destructive pull
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
            FenObj.head = Map.head[req.head];
            if (!FenObj.head) {
                console.error(
                    `ERROR: Fennimal "${fenID}" head code "${req.head}" did not resolve to an SVG head id.`,
                    { MapHead: Map.head, req }
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

            if (req.play_orthogonal_tasks) FenObj.play_orthogonal_tasks = true;

            Arr.push(FenObj);
        }

        // Randomize the final array order so they aren't processed linearly by ID
        return shuffleArray(Arr);
    }

    const FennimalObjArr = create_Fennimals_from_stimulus_template(StimTemplate.Fennimal_Dictionary, FeatureMap);

    // ----------------------------------------------------
    // ITEM COLOR ASSIGNMENT (toys + boxes)
    // ----------------------------------------------------
    // When the algorithm flag is on: reassign BoxColorSchemes (and optionally ToyData) from hue-space rules.
    // Either way: paint toy SVG templates once from ToyData so clones inherit fills.
    // Box templates are only painted when the algorithm ran (otherwise keep baked SVG fills).
    let colorAssignmentOverview = null;
    if (GenParam.use_color_algorithm_to_pick_colors === true) {
        colorAssignmentOverview = assign_experiment_item_colors(FennimalObjArr);
        paint_all_box_color_templates();
        console.log(
            "%c Color algorithm assigned item palettes"
                + (GenParam.use_color_algorithm_for_toy_colors === true ? " (boxes + toys)" : " (boxes only; toys keep ToyData defaults)"),
            "color:teal",
            colorAssignmentOverview
        );
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

    /**
     * Layer 1: replace the freshly randomized world with a saved assignment.
     * Returns false if the payload looks unusable (caller keeps the fresh randomization).
     */
    this.hydrate_assignment = function (savedFennimals, savedFeatureMap, savedColorOverview) {
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

        console.log("%c Restored saved stimulus assignment for this session", "color:teal");
        return true;
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

    this.get_assigned_names_of_code_array = function(type, Arr) {
        if (FeatureMap[type]) {
            return Arr.map(req => FeatureMap[type][req] ? JSON.parse(JSON.stringify(FeatureMap[type][req])) : false);
        } else {
            console.warn(`Requesting assigned name of unknown property ${type}`);
            return false;
        }
    };

    this.get_all_locations_visited_during_experiment_with_regions = function () {
        return FennimalObjArr.map(fen => [JSON.parse(JSON.stringify(fen.location)), JSON.parse(JSON.stringify(fen.region))]);
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

    this.get_Feature_maps = () => FeatureMapConstant;
    this.get_instruction_pages_arr = () => JSON.parse(JSON.stringify(StimTemplate.Instructions_at_start));
    this.get_questionnaire_pages_arr = () => JSON.parse(JSON.stringify(StimTemplate.Pages_at_end));
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
                let nQuestions = (block.questions || []).length;
                let nBeliefTrials = nQuestions * nBlocks;
                let nRealityTrials = (block.include_reality_block_at_end === true) ? nQuestions : 0;
                // Belief/reality each earn stars; each is preceded by a distractor that also earns stars.
                max_stars += bonus * (nBeliefTrials + nRealityTrials) * 2;
                if (block.include_practice_trial === true) {
                    // Shape-match + color-match practice.
                    max_stars += bonus * 2;
                }
                if (block.include_memory_probe_at_end === true) {
                    // One box→Fennimal and one Fennimal→toy probe per Fennimal in the set.
                    let nFennimals = (typeof FennimalObjArr !== "undefined" && Array.isArray(FennimalObjArr))
                        ? FennimalObjArr.length
                        : 0;
                    max_stars += bonus * nFennimals * 2;
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