// The stimuli parameters contain all the general (decontextualized) settings to create the Fennimals and their interactions.
//  Also includes the flow of the experiment (phases and structure).
let StimulusSettings = function(){
    //Bonus payment details
    this.BonusStarValue = {
        currency_symbol: "$",
        bonus_per_star: 0.10
    }

    //Which instructions pages are shown to participants before the first day?
    this.Instructions_at_start = ["browser_check_and_full_screen_prompt","consent",  "overview"  ] //"browser_check_and_full_screen_prompt","consent",  "overview"      "browser_check_and_full_screen_prompt","consent", "card_sorting_task", "overview"

    //Which pages are shown to participants after the last day but BEFORE the payment screen?
    //     "demographics_questionnaire": contains a question on age, gender and color-blindness
    this.Pages_at_end = ["demographics_questionnaire"]

    //This defines which experiment will be run (definitions follow below).
    // NOTE: If there are multiple codes in an array, then one will be picked at random!
    this.Experiment_Code = ["schema_experiment_searchlearn"] // "schema_experiment_offset"

    //Now we determine the experiment structure
    let All_Experiment_Structures = {
        test : [

            {
                //Defining the quiz here
                type: 'quiz',

                QuestionSets: [
                    {
                        question_set_type: "normal",
                        //Defining which information is presented. Can be icon or name
                        cue: 'gray_head',
                        show_name: false,

                        //Defining which questions are asked
                        questions_asked: ["name","region"],

                        //Defining which Fennimals are included
                        Fennimals_included: "all"
                    },

                    {
                        question_set_type: "treatment",
                        cue: "gray_head",
                        show_name: true,
                        question_groups:[
                            {Fennimals_included: "TEST", questions_asked: ["other_heads_in_region"]},
                            {Fennimals_included: "CNTRL", questions_asked: ["color", "body_type"]},
                        ]
                    }
                ],

                //Defining the complement conditions.
                //      If set to true, then an incorrectly answered question will be repeated at the end of the cue untill all answers have been completed.
                require_perfect_answers: false,

                //If set to anything but false, participants can freely travel the island to explore the Fennimals.
                //    Non-false value should refer to the interaction style of the observed Fennimal.
                //TODO
                //allow_participant_to_travel_map: "passive_observation",

                //If set to true, participants will earn a bonus star for each correct answer
                award_star_for_correct_answer: true
            } ,

            /*


            {
                type: "name_recall_task",

                //If set to true, participants will earn a bonus star for each correct answer
                award_star_for_each_correct_name: true,

                //Allowed Levenshtein distance to still assign a correct match
                allowed_Levenshtein_distance_for_match: 2,

            },





            {
                type: "head_region_sorting_task",
                Fennimals_included: "all"
            },


            {
                type: "match_head_to_region",
                Fennimals_encountered: "all",
            },

            {
                //Defining the block type
                type: "hint_and_search",
                hint_type: "name",

                //Defining which Fennimals are encountered in this block
                Fennimals_encountered: "all",
                sort_trials_by: "region",

                //Defining the Fennimal interaction type
                Fennimal_interaction_type: "polaroid_photo_active",
                allowed_attempts_before_answer_given: 3,
            },

            {
                type: "free_exploration",
                Fennimal_interaction_type: "polaroid_photo_passive",
                Fennimals_encountered: "all"
            },



             */







        ],

        schema_experiment_searchlearn:  [

            {
                type: "free_exploration",
                Fennimal_interaction_type: "polaroid_photo_passive",
                Fennimals_encountered: "all"
            },

            {
                //Defining the block type
                type: "hint_and_search",
                hint_type: "icon",

                //Defining which Fennimals are encountered in this block
                Fennimals_encountered: "all",
                sort_trials_by: "region",

                //Defining the Fennimal interaction type
                Fennimal_interaction_type: "polaroid_photo_active",
                allowed_attempts_before_answer_given: 3,
            },
            {
                type: "head_region_sorting_task",
                Fennimals_included: "all",
            },
            {
                //Defining the block type
                type: "hint_and_search",
                hint_type: "name",

                //Defining which Fennimals are encountered in this block
                Fennimals_encountered: "all",
                sort_trials_by: "random",

                //Defining the Fennimal interaction type
                Fennimal_interaction_type: "polaroid_photo_active",
                allowed_attempts_before_answer_given: 3,
            },

            {
                //Defining the quiz here
                type: 'quiz',

                QuestionSets: [{
                    question_set_type: "normal",
                    //Defining which information is presented. Can be icon or name
                    cue: 'gray_head',
                    show_name: false,

                    //Defining which questions are asked
                    questions_asked: ["name","region"],

                    //Defining which Fennimals are included
                    Fennimals_included: "all"
                },
                    {
                        question_set_type: "treatment",
                        cue: "gray_head",
                        show_name: true,
                        question_groups:[
                            {Fennimals_included: "TEST", questions_asked: ["other_heads_in_region"]},
                            {Fennimals_included: "CNTRL", questions_asked: ["color", "body_type"]},
                        ]
                    }
                ],

                //Defining the complement conditions.
                //      If set to true, then an incorrectly answered question will be repeated at the end of the cue untill all answers have been completed.
                require_perfect_answers: false,

                //If set to anything but false, participants can freely travel the island to explore the Fennimals.
                //    Non-false value should refer to the interaction style of the observed Fennimal.
                //TODO
                //allow_participant_to_travel_map: "passive_observation",

                //If set to true, participants will earn a bonus star for each correct answer
                award_star_for_correct_answer: true
            } ,

            {
                type: "name_recall_task",

                //If set to true, participants will earn a bonus star for each correct answer
                award_star_for_each_correct_name: true,

                //Allowed Levenshtein distance to still assign a correct match
                allowed_Levenshtein_distance_for_match: 2,

            },
            {
                type: "card_sorting_task",
                SpecialSettings: {
                    skip_second_phase: true,
                    fix_number_of_groups: false,
                    minimum_group_size: 2

                }
            },


        ],

        schema_experiment_baseline:  [

            {
                type: "free_exploration",
                Fennimal_interaction_type: "polaroid_photo_passive",
                Fennimals_encountered: "all"
            },

            {
                //Defining the block type
                type: "hint_and_search",
                hint_type: "icon",

                //Defining which Fennimals are encountered in this block
                Fennimals_encountered: "all",
                sort_trials_by: "region",

                //Defining the Fennimal interaction type
                Fennimal_interaction_type: "polaroid_photo_active",
                allowed_attempts_before_answer_given: 3,
            },
            {
                type: "head_region_sorting_task",
                Fennimals_included: "all"
            },

            {
                //Defining the block type
                type: "hint_and_search",
                hint_type: "name",

                //Defining which Fennimals are encountered in this block
                Fennimals_encountered: "all",
                sort_trials_by: "random",

                //Defining the Fennimal interaction type
                Fennimal_interaction_type: "polaroid_photo_active",
                allowed_attempts_before_answer_given: 3,
            },

            {
                //Defining the quiz here
                type: 'quiz',

                QuestionSets: [{
                    //Defining which information is presented. Can be icon or name
                    cue: 'gray_head',

                    //Defining which questions are asked
                    questions_asked: ["name","region"],

                    //Defining which Fennimals are included
                    Fennimals_included: "all"
                }
                ],

                //Defining the complement conditions.
                //      If set to true, then an incorrectly answered question will be repeated at the end of the cue untill all answers have been completed.
                require_perfect_answers: false,

                //If set to anything but false, participants can freely travel the island to explore the Fennimals.
                //    Non-false value should refer to the interaction style of the observed Fennimal.
                //TODO
                //allow_participant_to_travel_map: "passive_observation",

                //If set to true, participants will earn a bonus star for each correct answer
                award_star_for_correct_answer: true
            } ,


            {
                type: "name_recall_task",

                //If set to true, participants will earn a bonus star for each correct answer
                award_star_for_each_correct_name: true,

                //Allowed Levenshtein distance to still assign a correct match
                allowed_Levenshtein_distance_for_match: 2,

            },


        ],

        schema_experiment_offset: [

            {
                type: "free_exploration",
                Fennimal_interaction_type: "polaroid_photo_passive",
                Fennimals_encountered: "all"
            },

            {
                //Defining the block type
                type: "hint_and_search",
                hint_type: "icon",

                //Defining which Fennimals are encountered in this block
                Fennimals_encountered: "all",
                sort_trials_by: "region",

                //Defining the Fennimal interaction type
                Fennimal_interaction_type: "polaroid_photo_active",
                allowed_attempts_before_answer_given: 3,
            },
            {
                type: "head_region_sorting_task",
                Fennimals_included: "all"
            },

            {
                //Defining the block type
                type: "hint_and_search",
                hint_type: "name",

                //Defining which Fennimals are encountered in this block
                Fennimals_encountered: "all",
                sort_trials_by: "random",

                //Defining the Fennimal interaction type
                Fennimal_interaction_type: "polaroid_photo_active",
                allowed_attempts_before_answer_given: 3,
            },

            {
                //Defining the quiz here
                type: 'quiz',

                QuestionSets: [{
                    //Defining which information is presented. Can be icon or name
                    cue: 'gray_head',

                    //Defining which questions are asked
                    questions_asked: ["name","region"],

                    //Defining which Fennimals are included
                    Fennimals_included: "all"
                }
                ],

                //Defining the complement conditions.
                //      If set to true, then an incorrectly answered question will be repeated at the end of the cue untill all answers have been completed.
                require_perfect_answers: false,

                //If set to anything but false, participants can freely travel the island to explore the Fennimals.
                //    Non-false value should refer to the interaction style of the observed Fennimal.
                //TODO
                //allow_participant_to_travel_map: "passive_observation",

                //If set to true, participants will earn a bonus star for each correct answer
                award_star_for_correct_answer: true
            } ,


            {
                type: "name_recall_task",

                //If set to true, participants will earn a bonus star for each correct answer
                award_star_for_each_correct_name: true,

                //Allowed Levenshtein distance to still assign a correct match
                allowed_Levenshtein_distance_for_match: 2,

            },


        ],
    }

    //Nowe we need to determine the Fennimals encountered during this experiment. As for the structure, the experiment code MUST have a key in this object.
    //TODO: NOTE FOR FUTURE ACHIEL: Right now all Fennimals are listed in the object below. The experiment controller will call these when Fennimals encountered is set to "all".
    //      If subsets are required in the future, create an object with [subset_key] = [Template, Template]. Then flatten this array to Fennimals_Encountered...

    let All_Fennimal_Sets = {
        schema_experiment_baseline: {
            all: [
                {id: "RA_CA_1", head_group: "A", region: "A"},
                {id: "RA_CA_2", head_group: "A", region: "A"},
                {id: "RA_CA_3", head_group: "A", region: "A"},
                {id: "RA_CA_4", head_group: "A", region: "A"},
                {id: "RB_CB_5", head_group: "B", region: "B"},
                {id: "RB_CB_6", head_group: "B", region: "B"},
                {id: "RB_CB_7", head_group: "B", region: "B"},
                {id: "RB_CB_8", head_group: "B", region: "B"},
                {id: "RC_CC_9", head_group: "C", region: "C"},
                {id: "RC_CC_10", head_group: "C", region: "C"},
                {id: "RC_CC_11", head_group: "C", region: "C"},
                {id: "RC_CC_12", head_group: "C", region: "C"},
                {id: "RD_CD_13", head_group: "D", region: "D"},
                {id: "RD_CD_14", head_group: "D", region: "D"},
                {id: "RD_CD_15", head_group: "D", region: "D"},
                {id: "RD_CD_16", head_group: "D", region: "D"},
            ],

            //If added, this defines whether the head groups should be drawn based on similar types.
            //  Each to-be-clustered group should have a key in this object. The value refers to which groups will be co-sampled.
            //  NOTE: only very limited similar groups are currently defined... TODO: this is currently very finnicky and can easily be derailed...
            head_group_clusters : {
                A: "X",
                B: "X",
                C: "Y",
                D: "Y"
            }

        },

        schema_experiment_offset: {
            all: [
                {id: "RA_CA_1", head_group: "A", region: "A"},
                {id: "RA_CA_2", head_group: "A", region: "A"},
                {id: "RA_CC_3", head_group: "C", region: "A"},
                {id: "RA_CC_4", head_group: "C", region: "A"},
                {id: "RB_CC_5", head_group: "C", region: "B"},
                {id: "RB_CC_6", head_group: "C", region: "B"},
                {id: "RB_CB_7", head_group: "B", region: "B"},
                {id: "RB_CB_8", head_group: "B", region: "B"},
                {id: "RC_CA_9", head_group: "A", region: "C"},
                {id: "RC_CA_10", head_group: "A", region: "C"},
                {id: "RC_CD_11", head_group: "D", region: "C"},
                {id: "RC_CD_12", head_group: "D", region: "C"},
                {id: "RD_CD_13", head_group: "D", region: "D"},
                {id: "RD_CD_14", head_group: "D", region: "D"},
                {id: "RD_CB_15", head_group: "B", region: "D"},
                {id: "RD_CB_16", head_group: "B", region: "D"},
            ],

            //If added, this defines whether the head groups should be drawn based on similar types.
            //  Each to-be-clustered group should have a key in this object. The value refers to which groups will be co-sampled.
            //  NOTE: only very limited similar groups are currently defined... TODO: this is currently very finnicky and can easily be derailed...
            head_group_clusters : {
                A: "X",
                B: "X",
                C: "Y",
                D: "Y"
            }

        },

        schema_experiment_searchlearn: {
            all: [
                {id: "RA_CA_1_T", head_group: "A", region: "A"},
                {id: "RA_CB_2_T", head_group: "B", region: "A"},
                {id: "RA_CC_3_T", head_group: "C", region: "A"},
                {id: "RA_CD_4_T", head_group: "D", region: "A"},
                {id: "RB_CA_5_T", head_group: "A", region: "B"},
                {id: "RB_CB_6_T", head_group: "B", region: "B"},
                {id: "RB_CC_7_T", head_group: "C", region: "B"},
                {id: "RB_CD_8_T", head_group: "D", region: "B"},
                {id: "RC_CA_9_C", head_group: "A", region: "C"},
                {id: "RC_CB_10_C", head_group: "B", region: "C"},
                {id: "RC_CC_11_C", head_group: "C", region: "C"},
                {id: "RC_CD_12_C", head_group: "D", region: "C"},
                {id: "RD_CA_13_C", head_group: "A", region: "D"},
                {id: "RD_CB_14_C", head_group: "B", region: "D"},
                {id: "RD_CC_15_C", head_group: "C", region: "D"},
                {id: "RD_CD_16_C", head_group: "D", region: "D"},
            ],
            subgroups: {
                TEST: [
                    {id: "RA_CA_1_T"},
                    {id: "RA_CB_2_T"},
                    {id: "RA_CC_3_T"},
                    {id: "RA_CD_4_T"},

                    {id: "RB_CA_5_T"},
                    {id: "RB_CB_6_T"},
                    {id: "RB_CC_7_T"},
                    {id: "RB_CD_8_T"},
                ],
                CNTRL: [
                    {id: "RC_CA_9_C"},
                    {id: "RC_CB_10_C"},
                    {id: "RC_CC_11_C"},
                    {id: "RC_CD_12_C"},

                    {id: "RD_CA_13_C"},
                    {id: "RD_CB_14_C"},
                    {id: "RD_CC_15_C"},
                    {id: "RD_CD_16_C"},
                ],
            },




        },

        test: {
            all: [
                {id: "A1", head_group: "A", region: "A"},
                {id: "A2", head_group: "A", region: "A"},
                {id: "A3", head_group: "A", region: "A"},
                {id: "A4", head_group: "A", region: "A"},
                {id: "B1", head_group: "B", region: "B"},
                {id: "B2", head_group: "B", region: "B"},
                {id: "B3", head_group: "B", region: "B"},
                {id: "B4", head_group: "B", region: "B"},
                {id: "C1", head_group: "C", region: "C"},
                //{id: "C2", head_group: "C", region: "C"},
                //{id: "C3", head_group: "C", region: "C"},
                //{id: "C4", head_group: "C", region: "C"},
                {id: "D1", head_group: "D", region: "D"},
                //{id: "D2", head_group: "D", region: "D"},
                //{id: "D3", head_group: "D", region: "D"},
                //{id: "D4", head_group: "D", region: "D"},




            ],
            subgroups: {
                TEST: [ {id: "A1"},
                    {id: "A2"},
                    {id: "A3"},
                    {id: "A4"}],
                CNTRL: [ {id: "B1"},
                    {id: "B2"},
                    {id: "B3"},
                    {id: "B4"}],
            },

            head_group_clusters : {
                A: "X",
                B: "X",
                C: "Y",
                D: "Y"
            }
        }
    }


    //EXPERIMENT STRUCTURES.
    //  All codes defined above MUST be matched to an entry here.
    //  Each entry should specify the following public variables:
    //      Experiment_Structure: containing all the phases of the experiment in an array of objects.
    //      Fennimals_Encountered_During_Experiment.

    //NOTES ON EXPERIMENT STRUCTURE
    //Supported block types:
    //      free_exploration: the map is populated with Fennimals, and the participant can freely roam untill all Fennimals have been visited
    //      jump_trials: No travel on the map - participant goes from one location to another. TODO: not yet supported!
    //      hint_and_search: phase consists of tasks. In each task, participant get a hint and has to find a Fennimal. After interaction completed, participant gets the next hint. This continues untill all Fennimals have been interacted with
    //          Additionally: this also requires a hint_type variable. This can be "location", "icon", "name".
    //          Additionally: requires a "sort_trials_by" variable. This can be random, head_type or region. This governs the order in which trials are presented. Defaults to random.
    //      name_recall_task: participants are prompted to list all the names of the Fennimals they remember.
    //          This task always has a plain background (to prevent any accidental cues).
    //          Assignment to an ID is done case-insensitive!
    //          This task has the following parameters:
    //              award_star_for_each_correct_name: if set to true, participants will earn a star for each name they correctly remembered. No punishment for errors or duplicates. Defaults to no award earned. Adjusts the instructions accordingly
    //              allowed_Levenshtein_distance_for_match: if set to a non-zero positive integer, this denotes the amount of typos allowed to still match a typed name to an ID.
    //                  note: be sure that all names are sufficiently different to prevent double IDs from being submitted by the participant (the data will include a flag if this occurs)
    //      quiz: this starts a card-quiz phase. Participants are given a set of cards, each of which contains a hint (targetting a specific Fennimal) and a set of questions.
    //              QuestionSets: these define which question are shown to the participant. This should be an array of object, with each object containing the following properties:
    //                  question_set_type: two modes of quiz are currently supported
    //                      normal: participants will see the requested questions for ALL Fennimals.
    //                      treatment: questions differ for different subgroups.
    //                          must contain an array "subgroups". Each element in this array should have:
    //                              a string property "Fennimals_included", which must refer to one of the subgruops defined in the All_Fennimal_Sets
    //                              an array property "questions_included". This can contain "head_select_task

    //                  cue: the type of que presented on the left side of the card, to define the target Fennimal. Supported cue types are:
    //                      "name" (text containing the name of the Fennimal),
    //                      "icon" (presenting the icon of a Fennimal without name)
    //                      "gray_icon", which is presented with a gray color-scheme
    //                      "sepia_icon", which is represented in a sepia color
    //                  show_name: if set to true, the Fennimal's name is displayed on the question part. Defaults to false.
    //                  questions_asked: an array defining which questions are presented on the card. Currently supported are "name", "region", "location", "color",  "body_type" and "other_heads_in_region". NB: this last one CANNOT BE COMBINED WITH OTHER QUESTIONS
    //                  Fennimals_included: defines which Fennimals are shown (one question per included Fennimal). TODO: right now, only allows ALL - update for more specified options later
    //              NOTE: card questions are randomized within a 'block', but the blocks are presented in order of specification.
    //          require_perfect_answers: if set to true, then any cards with mistakes will be re-appended at the end of the stack. Therefore, participants will need to correctly answer ALL questions before finishing this phase.
    //          allow_participant_to_travel_map: TODO: not yet supported
    //          award_star_for_correct_answer: if set to true, then participants will earn a star for each CARD where they correctly answered all questions. Also modifies the instructions accordingly.
    //      card_sorting_task: gives the participant a series of cards (one for each Fennimal), and asks participants to first sort them into groups, then sort these groups based on their similarity
    //          NOTE: this task is a bit more plugged-in-later-on in terms of coding. All parameters are specified in the CardSortingTask javascript file.
    //      head_region_sorting_task: Participants see all heads, sort them into their region.
    //          fennimals_included: which heads need to be sorted
    //          reveal_at_end: during the task, all placed Fennimals are blurred. Will be revealed on completion, unless this is set to false (defaults to true)

    //Supported interaction types for free_exploration, jump_trials and hint_and_search:
    //      passive_observation
    //      polaroid_photo_passive
    //      polaroid_photo_active
    //          Additionally: define number of allowed_attempts_before_answer_given.
    //          If set to false, then participant is forced to get it right before continuing.
    //          defaults to 1 attempt before correct answer given.

    //DETERMENING CONTENTS OF THE EXPERIMENT
    ///////////////////////////////////////

    //If multiple experiment codes are provided, then select one at random here
    if(this.Experiment_Code.length > 0){ this.Experiment_Code = shuffleArray(this.Experiment_Code)[0]}
    console.log("Starting experiment with code " + this.Experiment_Code)

    //Setting the correct structure for this experiment
    this.Experiment_Structure = All_Experiment_Structures[this.Experiment_Code]
    this.Fennimals_Encountered_During_Experiment = All_Fennimal_Sets[this.Experiment_Code]

    //GENERAL SETTINGS
    ////////////////////

    this.use_region_preferred_body_types = true
    this.preferred_region_sample_order = ["North", "Desert", "Village", "Jungle"] // [[ "Beach",  "Mountains", "Jungle", "Desert", "Village", "Flowerfields"], ["North", "Swamp"]] // [["Flowerfields", "Beach", "Swamp", "Mountains"], ["Jungle", "Desert", "Village"], ["North"]]

    this.allowed_head_groups = ["bird", "safari", "halloween", "xmas"]

    this.use_constract_color_for_head = false

    this.name_is_determined_as = "head"

    this.excluded_head_types = ["chicken",  "owl", "bird", "snowman", "elf", "candycane", "witch"]



}

//The stimulus-generator transforms the abstract setup outlined in the stimulus settings into actual Fennimals
let StimulusTransformer = function(StimTemplate){
    //RETRIEVING DATA FROM SVG
    //Defining the templates SVG layer
    let SVGTemplatesLayer = document.getElementById("Fennimal_Templates_Layer"),
        SVG_Heads_Layer = document.getElementById("All_Heads")

    //Copying the experiment code and structure
    let Experiment_Code = StimTemplate.Experiment_Code
    this.Experiment_Structure = StimTemplate.Experiment_Structure

    //CREATING MAPS
    function create_feature_maps(){
        //Returns an array of all heads included in the SVG. Assumes the heads already exist in the templates layer
        let Variable_Features
        function get_all_available_head_names(){
            let Available_Heads_Names = []

            let Children = SVG_Heads_Layer.childNodes
            for(let i = 0;i<Children.length;i++){
                //Finding the name
                let name = Children[i].id.split("_")[2]
                Available_Heads_Names.push(name)

            }

            return(Available_Heads_Names.filter(value => ! StimTemplate.excluded_head_types.includes(value)))

        }

        function get_all_available_head_groups(){
            let Available_Heads_Groups = {}

            let Children = SVG_Heads_Layer.childNodes
            for(let i = 0;i<Children.length;i++){
                //Finding the name
                let name = Children[i].id.split("_")[2]

                //Find the group. This is the SECOND element in the classlist. These are defined as "Fennimal_head_CLASS".
                // Note: A head can have multiple group classes (all but the first element should be ignored
                let classes = Children[i].classList
                for(let classind = 1; classind<classes.length; classind++){
                    let group = classes[classind].split("_")[2]
                    if(typeof Available_Heads_Groups[group] === "undefined"){
                        Available_Heads_Groups[group] = []
                    }
                    //Making sure that this head is NOT excluded manually
                    if(! StimTemplate.excluded_head_types.includes(name)){
                        Available_Heads_Groups[group].push(name)
                    }

                }


            }

            //If the stimulus template includes a restriction on the allowed head groups, then apply this here
            if(typeof StimTemplate.allowed_head_groups !== "undefined"){
                if(StimTemplate.allowed_head_groups !== "" && StimTemplate.allowed_head_groups !== false && StimTemplate.allowed_head_groups !== undefined){
                    for(let key in Available_Heads_Groups){
                        if(! StimTemplate.allowed_head_groups.includes(key)){
                            delete Available_Heads_Groups[key]
                        }
                    }
                }
            }


            return(Available_Heads_Groups)

        }

        function get_region_sample_order(){
            let Arr = []
            for(let i = 0;i<StimTemplate.preferred_region_sample_order.length; i++){
                let randomized = shuffleArray(StimTemplate.preferred_region_sample_order[i])
                Arr.push(randomized)
            }
            return(Arr.flat())
        }

        function find_all_variable_features(){
            let Counts = []

            //First we make a count of which values are requested
            for(let i =0;i<StimTemplate.Fennimals_Encountered_During_Experiment.all.length; i++){
                for(let key in StimTemplate.Fennimals_Encountered_During_Experiment.all[i]){
                    //If our summary object does not yet contain this type of variable feature, add it as an empty array.
                    if(typeof Counts[key] === "undefined"){
                        Counts[key] = []
                    }

                    //If the array does not yet contain this specific value, add it to the array
                    let value = StimTemplate.Fennimals_Encountered_During_Experiment.all[i][key]
                    Counts[key].push(value)
                }
            }

            //Summarizing these requested variable elements.
            Variable_Features = {}
            for(let key in Counts){
                let Elem = Counts[key]
                let CountsInVar = {}

                for(let i =0;i<Elem.length;i++){
                    if(typeof CountsInVar[Elem[i]] === "undefined"){
                        CountsInVar[Elem[i]] = 0
                    }

                    CountsInVar[Elem[i]]++
                }

                Variable_Features[key] = CountsInVar

            }

        }

        function get_all_locations_in_SVG(){
            let All_Markers = document.getElementsByClassName("location_marker")
            let Regions = {}

            //Transform into an object keyed on region (with value being an array of locations)
            for(let i = 0;i<All_Markers.length;i++){
                let location_name = All_Markers[i].id.split("_")[2]
                let region = All_Markers[i].classList[1].split("_")[2]

                if(typeof Regions[region] === "undefined"){
                    Regions[region] = []
                }

                Regions[region].push(location_name)

            }

            return(Regions)

        }

        //Now we can create a map: for each variable feature, map all unique values to different properties which can be used to determine the Fennimals.
        //NOTE: here we assume that all SVG heads and bodies have been loaded!
        function assign_map_values(){
            let Map = {}

            for(let variable_feature_type in Variable_Features){
                switch (variable_feature_type){
                    case("head_group"):
                        Map.head_group = {}
                        let Available_Head_Groups = get_all_available_head_groups()
                        //Head group is a bit tricky: we want to first figure out how many different groups / heads per group are available.
                        //We will go through the requested groups in order of number of requested elements.
                        let requested_groups_by_size = Object.keys(Variable_Features.head_group).sort(function(a,b){return Variable_Features.head_group[b]-Variable_Features.head_group[a]})

                        for(let req_group_ind = 0; req_group_ind < requested_groups_by_size.length; req_group_ind++){
                            let group_id = requested_groups_by_size[req_group_ind]

                            //Figure out how many different heads we need for this group.
                            let required_num_of_heads = Variable_Features.head_group[group_id]

                            //Find a subset of all possible classes which have enough elements to fulfill this demand.
                            let Possible_groups = []
                            for(let key in Available_Head_Groups){
                               if(Available_Head_Groups[key].length >= required_num_of_heads){
                                   Possible_groups.push(key)
                               }
                            }
                            shuffleArray(Possible_groups)

                            //Select one of these possible classes, and remove it from the available object.
                            let selected_group_name = shuffleArray(Possible_groups)[0]
                            let Selected_Group = shuffleArray( JSON.parse(JSON.stringify(Available_Head_Groups[selected_group_name])))
                            delete Available_Head_Groups[selected_group_name]

                            Map.head_group[group_id] = {class: selected_group_name, Heads: Selected_Group}

                        }

                        //At this point we have a head_group object with keys for each group. Each key contains a class and an array of heads.
                        //  If there is NO specification for a head cluster, then all is good.

                        //HOWEVER: in some experiments we want to further impose another restriction: some head groups should be clustered together.
                        //  If this is the case, then there should be an object "head_group_clusters" in the Fennimal Sets object
                        if(typeof StimTemplate.Fennimals_Encountered_During_Experiment.head_group_clusters !== "undefined"){
                            //Now we first figure out all the head classes which we have defined above
                            let all_head_classes_assigned = []
                            let HeadGroups = {}
                            for(let group in Map.head_group){
                                all_head_classes_assigned.push(Map.head_group[group].class)
                                HeadGroups[Map.head_group[group].class] = JSON.parse(JSON.stringify(Map.head_group[group].Heads))
                            }

                            //Figuring out which unique clusters we should look for
                            let unique_clusters = []
                            for(let group in StimTemplate.Fennimals_Encountered_During_Experiment.head_group_clusters){
                                unique_clusters.push(StimTemplate.Fennimals_Encountered_During_Experiment.head_group_clusters[group])
                            }
                            unique_clusters = [...new Set(unique_clusters)]

                            //Now we know which clusters to look for, and the sets whichs already work.
                            //In the general parameters, there is an object defining the cluster group for each of the head groups.
                            let clusters_of_head_classes = []
                            for(let i =0;i<all_head_classes_assigned.length; i++){
                                clusters_of_head_classes.push(GenParam.Head_Group_Cluster_Types[all_head_classes_assigned[i]])
                            }
                            let unique_clusters_of_head_classes = [...new Set(clusters_of_head_classes)]
                            let Clusters = {}
                            for(let i =0;i<unique_clusters_of_head_classes.length;i++){
                                let groups_in_cluster = []
                                for(let groupnum =0;groupnum<clusters_of_head_classes.length;groupnum++){
                                    if(clusters_of_head_classes[groupnum] === unique_clusters_of_head_classes[i]){
                                        groups_in_cluster.push(all_head_classes_assigned[groupnum])
                                    }
                                }
                                Clusters[unique_clusters_of_head_classes[i]] = groups_in_cluster
                            }

                            //Now we need to check if there are enough clusters. If not, throw an error
                            if(Object.keys(Clusters).length < unique_clusters.length ){
                                console.error("ERROR: Not enough head groups with the correct clusters to satisfy stimulus requirements")
                            }

                            //Now assigning the keys of the requested clusters to one of the defined clusters.
                            let AssignedKeys = {}
                            let shuffled_clusters = shuffleArray(Object.keys(Clusters) )

                            for(let keynum=0;keynum< unique_clusters.length; keynum++ ){
                                AssignedKeys[unique_clusters[keynum]] = shuffled_clusters[keynum]
                            }

                            //Now we know which key is assigned to which cluster, which head groups is assigned to each cluster, and which heads are assigned to each head group.
                            //We can now create a new Map.head_groups object to replace the old one
                            let NewMapping = {}
                            for(let groupkey in Map.head_group ){
                                let clusterKey = StimTemplate.Fennimals_Encountered_During_Experiment.head_group_clusters[groupkey]
                                let clusterName = AssignedKeys[clusterKey]
                                let drawnGroup = Clusters[clusterName].shift()
                                let headsInGroup = HeadGroups[drawnGroup]

                                NewMapping[groupkey] = {
                                    class: drawnGroup,
                                    Heads: headsInGroup
                                }

                            }

                            //Assigning
                            Map.head_group = NewMapping


                        }





                        break;

                    case("region"):
                        Map.region = {}
                        //Get a random shuffle of the regions (but presevering a preferential order!)
                        let Selected_Region_Order = get_region_sample_order()

                        //Find out which locations and regions are present in the SVG
                        let Available_Locations = get_all_locations_in_SVG()

                        //Now we need to figure out how many regions we need. As before, sort these by the number of required locations, start sampling the locations with a sufficient number of locations.
                        // Right now this does not matter; all regions have 4 locations. But this step is for future-proofing, if I ever want to add just a few locations.
                        let requested_region_groups_by_size = Object.keys(Variable_Features.region).sort(function(a,b){return Variable_Features.region[b]-Variable_Features.region[a]})

                        for(let group_ind = 0; group_ind < requested_region_groups_by_size.length; group_ind++){
                            let group_id = requested_region_groups_by_size[group_ind]
                            let required_num_of_locations = Variable_Features.region[group_id]

                            //Find out which of the available regions have a sufficient number of groups (preserving the order)
                            let Possible_regions = []

                            for(let region_ind = 0; region_ind < Selected_Region_Order.length; region_ind++){
                                if(Available_Locations[Selected_Region_Order[region_ind]].length >= required_num_of_locations){
                                    Possible_regions.push(Selected_Region_Order[region_ind])
                                }
                            }
                            let selected_region_name = Possible_regions[0] // Preserving the order

                            //Retrieving locations, removing from available locations
                            let Selected_Region = JSON.parse(JSON.stringify(Available_Locations[selected_region_name]))
                            Selected_Region_Order =  Selected_Region_Order.filter(function(e) { return e !== selected_region_name})

                            //Adding to the map
                            Map.region[group_id] = {region: selected_region_name, Locations: shuffleArray(JSON.parse(JSON.stringify(Selected_Region)))}


                        }

                        break




                }
            }

            return(Map)



        }

        find_all_variable_features()
        return(assign_map_values())

    }

    // CREATING STIMULI
    //Transforming the stimulus templates into Fennimal objects
    function create_Fennimals_from_stimulus_template(StimTemp, Map){
        //We randomize the order of created Fennimals (prevents regularities from occuring in setting some of the unmapped variables)
        let FenTemplates = shuffleArray(JSON.parse(JSON.stringify(StimTemp.Fennimals_Encountered_During_Experiment.all)))

        //Now we keep track of which features have already been sampled in the Map, and which ones remain un-used
        //REGIONS
        let Region_in_map = []
        for(let key in Map.region){
            Region_in_map.push(JSON.parse(JSON.stringify(Map.region[key].region)))
        }
        let Unmapped_regions = StimTemplate.preferred_region_sample_order.flat().filter(x => !Region_in_map.includes(x));

        //HEADS
        //TODO: deal with unmapped features here..

        //CREATING FENNIMALS HERE
        let Arr = []
        for(let i =0;i<FenTemplates.length;i++){
            //Now we transform each Fennimal template into an actual object.
            let FenObj = {}
            //  Note: we will first try to use the features specified in the object. If a feature is not specified, use a default option.

            //Starting with region: if a region is specified, then use one of the regions in the map. If not, then use a random region
            if(typeof FenTemplates[i].region !== "undefined"){
                //Region is defined by the template
                FenObj.region = Map.region[FenTemplates[i].region].region

                //Now DESTRUCTIVELY pick one of the available regions (these have already been shuffled at random)
                FenObj.location = JSON.parse(JSON.stringify(Map.region[FenTemplates[i].region].Locations.splice(0,1)[0]))

            }else{
                //The template does not specify a region. Pick an unmapped region at random
                FenObj.region = shuffleArray(Unmapped_regions)[0]
                //TODO... locations

            }

            //Continuing to body. If no body is mapped, then check if we need to select a region-preferred body
            if(typeof  FenTemplates[i].body !== "undefined"){
                FenObj.body = Map.body[FenTemplates[i]]
            }else{
                if(StimTemp.use_region_preferred_body_types){
                    FenObj.body = GenParam.RegionData[FenObj.region].preferredBodyType

                }else{
                    //TODO: pick a random body
                }
            }

            //Continuing to head. There are two ways a head can be specified: either as a group, or individually.
            if(typeof FenTemplates[i].head_group !== "undefined"){
                //Heads are assigned by a grouping. Draw one of these heads DESTRUCITIVELY
                FenObj.head_group = Map.head_group[FenTemplates[i].head_group].class
                FenObj.head = Map.head_group[FenTemplates[i].head_group].Heads.splice(0,1)[0]
            }else{
                //Heads are assigned invididually. Todo later
            }

            //COLORSCHEME
            if(typeof FenTemplates[i].ColorScheme !== "undefined"){
                //TODO: mapped color schemes here
                FenObj.color_scheme_origin = "custom"
            }else{
                //Use region colors
                FenObj.ColorScheme = {
                    Head: {
                        primary_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.primary_color,
                        secondary_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.secondary_color,
                        tertiary_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.tertiary_color,
                        eye_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.eye_color,
                    },
                    Body: {
                        primary_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.primary_color,
                        secondary_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.secondary_color,
                        tertiary_color: GenParam.RegionData[FenObj.region].Fennimal_location_colors.tertiary_color,
                    }
                }
                FenObj.color_scheme_origin = "region"

                if(StimTemp.use_constract_color_for_head){
                    FenObj.ColorScheme.Head.tertiary_color = GenParam.RegionData[FenObj.region].contrast_color
                }


            }

            //NAME
            switch(StimTemp.name_is_determined_as){
                case("head"):
                    if(typeof GenParam.HeadDisplayNames[FenObj.head] !== "undefined"){
                        FenObj.name = GenParam.HeadDisplayNames[FenObj.head]
                    }else{
                        FenObj.name = FenObj.head
                    }


                    break;
            }

            //ID (if assigned in the template)
            if(typeof FenTemplates[i].id !== 'undefined'){
                FenObj.id = FenTemplates[i].id
            }


            Arr.push(FenObj)

        }



        return(Arr)

    }

    let FeatureMap = create_feature_maps()
    let FeatureMapConstant = JSON.parse(JSON.stringify(FeatureMap))

    let FennimalObjArr = create_Fennimals_from_stimulus_template(StimTemplate, FeatureMap)

    //Returns the experiment code
    this.get_experiment_code = function(){
        return(JSON.parse(JSON.stringify(Experiment_Code)))
    }


    //Returns an array of all the Fennimal objects
    this.get_Fennimals_objects_in_array = function(){
        return(JSON.parse(JSON.stringify(FennimalObjArr)))
    }

    //Returns an array of all the locations visited in the experiment
    this.get_all_locations_visited_during_experiment = function(){
        let LocationsVisited = []
        for(let i =0;i<FennimalObjArr.length; i++){
            LocationsVisited.push(JSON.parse(JSON.stringify(FennimalObjArr[i].location)))
        }
        return([... new Set(LocationsVisited)])

    }

    //Returns and array of all locations visited in the experiment, as can be shown to participants
    this.get_all_locations_visited_during_experiment_as_participant_facing_names = function(){
        let All_Locations = this.get_all_locations_visited_during_experiment()
        let Arr = []
        for(let i = 0;i<All_Locations.length;i++){
            Arr.push(GenParam.LocationDisplayNames[All_Locations[i]])
        }
        return(Arr)
    }

    //Returns an array of all the regions visited in the experiment
    this.get_all_regions_visited_during_experiment = function(){
        let RegionsVisited = []
        for(let i =0;i<FennimalObjArr.length; i++){
            RegionsVisited.push(JSON.parse(JSON.stringify(FennimalObjArr[i].region)))
        }
        return([... new Set(RegionsVisited)])

    }

    //Returns an array with one element for each location visited. Each element is coded as [location, region]
    this.get_all_locations_visited_during_experiment_with_regions = function(){
        let Arr = []
        for(let i =0;i<FennimalObjArr.length; i++){
            Arr.push([JSON.parse(JSON.stringify(FennimalObjArr[i].location)),JSON.parse(JSON.stringify(FennimalObjArr[i].region))])
        }
        return(Arr)

    }

    //Returns an array with one element for each head encountered during the experiment
    this.get_all_heads_encountered_during_experiment = function(){
        let Arr = []
        for(let i =0;i<FennimalObjArr.length; i++){
            Arr.push(JSON.parse(JSON.stringify(FennimalObjArr[i].head)))
        }
        return([... new Set(Arr)])
    }

    //Returns an array with one element for each body encounterd during the experiment
    this.get_all_bodies_encountered_during_experiment = function(){
        let Arr = []
        for(let i =0;i<FennimalObjArr.length; i++){
            Arr.push(JSON.parse(JSON.stringify(FennimalObjArr[i].body)))
        }
        return([... new Set(Arr)])
    }

    //Does NOT count the pseudodays
    this.get_number_of_days_in_experiment = function(){
        let count = 0
        for(let i =0;i<this.Experiment_Structure.length;i++){
            if(this.Experiment_Structure[i].type !== "pseudoday"){
                count++
            }
        }
        return(count)
    }

    //Returns a copy of the featuremaps (before they got modified during assignment)
    this.get_Feature_maps= function(){
        return(FeatureMapConstant)
    }

    //Defining all the training templates
    let TrainingFennimalTemplateArr = []

    this.get_instruction_pages_arr = function(){
        return(JSON.parse(JSON.stringify(StimTemplate.Instructions_at_start)))
    }

    this.get_questionnaire_pages_arr = function(){
        return(JSON.parse(JSON.stringify(StimTemplate.Pages_at_end)))
    }

    //BONUS DETAILS
    ////////////////

    //Returns the maximum number of stars which can be earned during the experiment
    this.get_maximum_number_of_bonus_stars = function(){
        //TODO: so far, only supports the name recall task and the quiz.
        let max_stars = 0
        for(let i =0;i<this.Experiment_Structure.length;i++){

            //The quiz types may have stars associated to them
            if(this.Experiment_Structure[i].type === "quiz"){
                if(typeof this.Experiment_Structure[i].award_star_for_correct_answer !== "undefined"){
                    if(this.Experiment_Structure[i].award_star_for_correct_answer){
                        //There is a quiz in which participants can earn a star for each correct answer.
                        for(let setnum = 0;setnum < this.Experiment_Structure[i].QuestionSets.length; setnum++){

                            if(this.Experiment_Structure[i].QuestionSets[setnum].question_set_type === "normal"){
                                max_stars = max_stars + this.get_Fennimals_in_set(this.Experiment_Structure[i].QuestionSets[setnum].Fennimals_included).length
                            }

                            if(this.Experiment_Structure[i].QuestionSets[setnum].question_set_type === "treatment"){
                                for(let subsetnum = 0; subsetnum < this.Experiment_Structure[i].QuestionSets[setnum].question_groups.length; subsetnum++){
                                    max_stars = max_stars + this.get_Fennimals_in_set(this.Experiment_Structure[i].QuestionSets[setnum].question_groups[subsetnum].Fennimals_included).length
                                }
                            }

                        }
                    }
                }
            }

            //The recalled names may earn a bonus for each correctly recalled name
            if(this.Experiment_Structure[i].type === "name_recall_task"){
                if(typeof this.Experiment_Structure[i].award_star_for_each_correct_name !== "undefined"){
                    if(this.Experiment_Structure[i].award_star_for_each_correct_name){
                        max_stars = max_stars + this.get_Fennimals_objects_in_array().length
                    }
                }
            }

        }

        return(max_stars)

    }

    //Returns the bonus details
    this.get_bonus_details = function(){
        return(JSON.parse(JSON.stringify(StimTemplate.BonusStarValue)))
    }

    this.get_Fennimals_in_set = function(setname){

        if(setname === "all"){
            return(this.get_Fennimals_objects_in_array())
        }else{
            return(this.get_Fennimals_in_subgroup(setname))
        }
    }

    //Returns the Fennimals in a specified subgroup. Returns as an array of Fennimal objects. If this subgroup does not exist, returns false and print a warning
    this.get_Fennimals_in_subgroup = function(subgroup_name){
        if(typeof StimTemplate.Fennimals_Encountered_During_Experiment.subgroups === "undefined"){
            console.warn("WARNING: REQUEST WAS MADE FOR SUBGROUP OF FENNIMALS, BUT NONE ARE DEFINED. RETURNING FALSE")
            return(false)
        }

        if(typeof StimTemplate.Fennimals_Encountered_During_Experiment.subgroups[subgroup_name] === "undefined"){
        console.warn("WARNING: REQUEST WAS MADE FOR SUBGROUP WITH UNKONWN NAME: " + subgroup_name + ". THIS GROUP HAS NOT BEEN SPECIFIED IN STIMULI. RETURNING FALSE")
            return(false)
        }

        let Arr = []
        for(let i =0;i<StimTemplate.Fennimals_Encountered_During_Experiment.subgroups[subgroup_name].length; i++){
            let id = StimTemplate.Fennimals_Encountered_During_Experiment.subgroups[subgroup_name][i].id
            for(let fen =0;fen<FennimalObjArr.length;fen++){
                if(FennimalObjArr[fen].id === id){
                    Arr.push(JSON.parse(JSON.stringify(FennimalObjArr[fen])))
                }
            }
        }
        return(Arr)

    }

    //Returns false if there are no subgroups, otherwise returns object with one key for each subgroup, each containing the ID of the Fennimal in this group
    this.get_Fennimal_subgroups = function(){
        if(typeof StimTemplate.Fennimals_Encountered_During_Experiment.subgroups === "undefined"){
            return false
        }else{
            let Out = {}
            for(let key in StimTemplate.Fennimals_Encountered_During_Experiment.subgroups){
                Out[key] = []
                let Elem = StimTemplate.Fennimals_Encountered_During_Experiment.subgroups[key]
                for(let i = 0;i<Elem.length;i++){
                    Out[key].push(Elem[i].id)
                }
            }
            return(Out)
        }

    }

}

//TODO: set seed (for shufflearray)