// The stimuli parameters contain all the general (decontextualized) settings to create the Fennimals and their interactions.
//  Also includes the flow of the experiment (phases and structure).
let StimulusSettings = function () {

    //This defines which experiment will be run (definitions follow below).
    // NOTE: If there are multiple codes in an array, then one will be picked at random!
    this.Experiment_Code = ["mentalizing_network"] // "schema_experiment_offset"

    // SETTING THE INSTRUCTIONS SHOWN TO PARTICIPANTS AT THE START OF THE EXPERIMENT (BEFORE FIRST DAY)
    //  Allowed values:
    //      browser_check_and_full_screen_prompt
    //      consent
    //      single_sitting
    //      card_sorting_task
    //      overview
    //      character_creation
    //      partner_introduction
    const All_Instructions_At_Start = {
        test: [],
        mentalizing_1: [], //"browser_check_and_full_screen_prompt", "consent", "single_sitting", "character_creation", "overview", "partner_introduction"
        mentalizing_1B : [],
        mentalizing_2: [], //"browser_check_and_full_screen_prompt", "consent", "single_sitting", "character_creation", "overview", "partner_introduction"
        mentalizing_network: ["browser_check_and_full_screen_prompt", "consent", "single_sitting", "character_creation", "overview", "partner_introduction"]
    }

    //DETERMINING FENNIMALS ENCOUNTERED DURING EXPERIMENT
    // Note: the experiment code MUST have a key in this object.
    // Supported Fennimal properties
    //  id, head & region: required properties
    //  head_group: if set, creates all Fennimals in the same group-code with heads from the same semantic group.
    //  head_cluster: if set, creates all Fennimals in the same cluster-code with heads from the same semantic cluster.
    //  hat
    //  food_preference
    //  toy:
    //  toybox: if set, changes the behavior of toy interaction trials. If a toy box is present, the Fennimal will retrieve and/or place the toys from a box.
    const All_Fennimal_Sets = {
        test: [
            {id: "A1", head: "A1", head_group: "A", head_cluster: "A", region: "A", food_preference: "A" },
            {id: "A2", head: "A2", head_group: "A", head_cluster: "A", region: "A", hat: "B",  toy: "B", toybox: "B"},
            {id: "A3", head: "A3", head_group: "A", head_cluster: "A", region: "B", hat: "C", toy: "C", toybox: "C"},
            {id: "A4", head: "A4", head_group: "A", head_cluster: "A", region: "B", hat: "C", food_preference: "C", toy: "D", toybox: "D"},

            {id: "B", head: "A3", region: "B", toy: "E", toybox: "E"},
            {id: "B2", head: "A3", region: "B", toy: "F"},
            {id: "C", head: "A3", region: "C", toy: "A"},
            {id: "D", head: "A3", region: "D", toy: "H"},
            {id: "E", head: "A3", region: "E"},
            {id: "F", head: "A3", region: "F"},


        ],

        mentalizing_2: [
            {id: "S1", head: "A", region: "A", toy: "A", toybox: "A"},
            {id: "S2", head: "B", region: "B", toy: "B", toybox: "B"},
            //{id: "S3", head: "C", region: "C", toy: "C", toybox: "C"},

            {id: "P1", head: "D", region: "D", toy: "D", toybox: "A"},
            {id: "P2", head: "E", region: "E", toy: "E", toybox: "B"},
            //{id: "P3", head: "F", region: "C", toy: "F", toybox: "C"},

            {id: "X", head: "G", region: "A", food_preference: "A"},
            {id: "Y", head: "H", region: "E", food_preference: "B"},

            {id: "I1", head: "G", region: "F", toybox: "A"},
            {id: "I2", head: "H", region: "G", toybox: "B"},
           // {id: "I3", head: "I", region: "H", toybox: "C"},


        ],
        mentalizing_network: [
            {id: "S1", head: "A", region: "A", toy: "A", toybox: "A"},
            {id: "S2", head: "B", region: "B", toy: "B", toybox: "B"},
            {id: "W", head: "C", region: "A", food_preference: "A"},
            {id: "X", head: "D", region: "C", food_preference: "B"},

            {id: "P1", head: "E", region: "D", toy: "C", toybox: "A"},
            {id: "P2", head: "D", region: "E", toy: "D", toybox: "B"},
            {id: "Y", head: "A", region: "F", food_preference: "A"},
            {id: "Z", head: "E", region: "E", food_preference: "B"},

            /*
            * {id: "S1", head: "A", region: "A", toy: "A", toybox: "A"},
            {id: "S2", head: "B", region: "B", toy: "B", toybox: "B"},
            {id: "W", head: "A", region: "C", food_preference: "A"},
            {id: "X", head: "C", region: "A", hat:"A", food_preference: "B"},

            {id: "P1", head: "D", region: "D", toy: "C", toybox: "A"},
            {id: "P2", head: "E", region: "A", hat:"A", toy: "D", toybox: "B"},
            {id: "Y", head: "A", region: "E", food_preference: "A"},
            {id: "Z", head: "E", region: "E",hat:"A", food_preference: "C"},*/



        ]


    }

    //SETTING THE EXPERIMENT PROCEDURE
    //Required information:
    //  Fennimals_encountered: this should be an array of Fennimals.
    //  type: determines the structure of the phase. Supported types:
    //  *   jump-to-trial: participants do not interact with the map, but instead are sequentially teleported to all trials
    //      jump_to_trial_no_instructions: used for testing only, goes straight into a trial
    //  *   free_exploration: participants are given a list of icons and can freely explore the map to find all Fennimals.
    //  *   hint_and_search
    //          requires hint_type = "icon", "name", "toy", "toybox".
    //          Supports multiple hint types, in which case the trials are presented in pseudorandom order with no two Fennimals of the same ID back-to-back.
    //          NOTE: multiple hint types does NOT co-exist with multiple interaction types! A warning will be thrown, and only the first hint type will be used.
    //      head_region_sorting_task (requires Fennimals_encountered)
    //      Fennimal_attribute_sorting_task
    //          requires Fennimals_encountered and attribute_order = ["name", "region", "head", "toybox", "toy", "food_preference"]
    //          optionally allowed for max_earnable_bonus_stars. Note that this is a negatively-scored task: participants lose one star for each mistake.
    //          Advised to include stars when asking name: allows participants to buy out mistakes.
    //              Replaces text %PARTNERNAME% with partner's name
    //      collect_items_in_warehouse: shows the warehouse background.
    //          questions: ["ask_partner_belief_toyboxes"]: requires an array "questions_toyboxes" and an array "question_options_toys". For each toybox, shows the partner moving forward and grabbing the box. Participant is then asked to state which toy is in this box.
    //              querries the world state to determine correct answer.
    //          bonus_stars_per_correct_answer = int: defines the number of stars earned per correct answer.
    //
    //      quiz
    //      name_recall_task
    //      pseudoday: these are used to include information screens without being a task in and by themselves.
    //          Requires an "information" property. Supported information types:
    //              partner_leaves:
    //              partner_returns: informs the participant that their partner is now back on the island (with no knowledge of what occured in-between leaving and returning)
    //              new_Fennimals_spotted:
    //                  Used to start new blocks of Fennimals.
    //                  Takes a title and text to display.
    //                  Optionally supports displayed_icons = [id,id...] to display outlined photographs of the Fennimals on the screen
    //  *Note: trial TYPES with a * suport multiple sets of different interations (but be careful with free-exlporation: multiple interactions in the same location can result in misleading instructions)
    //      If provided with an array of Fennimal_interaction_types, then this creates multiple interactions in the same day.
    //      Order will be randomized within a type, but the order of types will be maintained.
    //      This only works for trial types with a *. For all others the software ignores this array.
    //      IF multiple hint types are specified, then first creates all combinations of interactions in a type, then duplicates per hint type. But check ordering if you want to do both
    //#####################################################################
    //NOTES ON EXPERIMENT STRUCTURE
    //Supported block types:
    //      free_exploration: the map is populated with Fennimals, and the participant can freely roam untill all Fennimals have been visited
    //      jump_trials: No travel on the map - participant goes from one location to another. TODO: not yet supported!
    //      hint_and_search: phase consists of tasks. In each task, participant get a hint and has to find a Fennimal. After interaction completed, participant gets the next hint. This continues untill all Fennimals have been interacted with
    //          Additionally: this also requires a hint_type variable. This can be "location", "icon", "name", "toy", "toybox", "food".
    //          NOPE Additionally: requires a "sort_trials_by" variable. This can be random, head_type or region. This governs the order in which trials are presented. Defaults to random.
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
    //###########################################################################
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
    //#######################################################################################
    //Supported interaction types for free_exploration, jump_trials and hint_and_search:
    //      passive_observation
    //      polaroid_photo_passive
    //      polaroid_photo_active
    //          Additionally: define number of allowed_attempts_before_answer_given.
    //          If set to false, then participant is forced to get it right before continuing.
    //          defaults to 1 attempt before correct answer given.
    //###############################################################################################
    //  Fennimal_interaction_type: determines the way in which the participants interact with the Fennimal (trial types). Supported interaction types
    //      polaroid_photo_passive (participants do not need to enter name)
    //      polaroid_photo_active (participants need to enter name)
    //      give_food_active(participants only get a single choice in food items, always correct)
    //      give_food_passive (participants have to select the correct food item)
    //      play_with_toy_passive (participants do not need to select toy / [optional] box)
    //      play_with_toy_passive (participants do  need to select correct toy / [optional] box)
    // +     ask_belief_partner_contents_box: displays partner on right, box in the center and Fennimal left. Then asks partner's beliefs. Ends trial. This enforces partner presence!
    // +     ask_contents_box: asks contents of box, then ends trial
    // +     ask_food: TODO
    // +     ask_Fennimal_toy: ask which toy was previously associated to Fennimal, then ends trial.
    //      NOTE: only interaction types with a + can be set to earn bonus stars.
    //############################################################################################################
    //Optional additional settings:
    //      partner_behavior (active / passive / false): determines whether the partner :
    //          active: follows during the block
    //          passive: stays at the center
    //          absent: is not displayed, but mentioned at the start of a trial
    //          false: is not mentioned/included at all (false)
    //      question_options_food = [],question_options_toys = [], question_options_toyboxes = []: if provided, determines the answers for any mid-trial questions (active trials only).
    //          Call by the codes of the food/toys/boxes used in the Fennimal sets. Unused codes will be ignored. The software will always force-include the correct answer, even if not provided here!
    //          If these properties are not included (or included but set to false), then the software will default to all options encountered during the entire experiment.
    //      bonus_star_for_correct_answer (applies only to ask_x trials): if set to true, participants will earn a gold star if they answer all questions correctly.
    //          if set to an integer, then this is the number of stars earned per correct answer
    //      include_Fennefinder (applies only to hint-and-search and free_exploration):
    //          if set to true, displays a radio beacon to the side of the screen during the map phase.
    //          if set to "low_power_mode", then the Fennefinder appears but is inoperable
    let All_Experiment_Structures = {
        test: [
            {
                type: "collect_items_in_warehouse",
                questions: ["ask_partner_belief_toyboxes"],
                bonus_stars_per_correct_answer: 5,
                question_options_toyboxes: ["C", "B"],
                question_options_toys: ["A", "B"]
            },
            /*
            {
                type:"free_exploration",
                Fennimal_interaction_type: ["play_with_toy_active", "give_food_active"], // "ask_contents_box", "play_with_toy_passive"
                Fennimals_encountered: ["A1", "A2", "A3"],
                partner_behavior: "absent",
                question_options_food: ["A", "B", "C", "X"],
                question_options_toys: ["A", "B", "C", "X"],
                question_options_toyboxes: ["A", "B", "C", "X"],
                bonus_stars_for_correct_answer: 3,
                hint_type: ["food", "toybox"],
                allowed_attempts_before_answer_given: 3,
                include_Fennefinder: "low_power_mode"
            },


            {
                type: "collect_items_in_warehouse",
                questions: ["ask_partner_belief_toyboxes"],
                bonus_stars_per_correct_answer: 5,
                question_options_toyboxes: ["A"],
                question_options_toys: ["A", "B", "C", "D"]
            },
            {
                type: "pseudoday",
                information: "new_Fennimals_spotted",
                displayed_icons: ["A1", "A2", "A3", "A4", "B"],
                title: "New Fennimals spotted on the island!",
                display_text: "Exciting news! Some new Fennimals have previously been spotted on the island!" +
                    " <br> They're still very shy, but this is the perfect moment to introduce yourself to them!"
            },



            {
                type:"hint_and_search",
                Fennimal_interaction_type: ["play_with_toy_passive"], // "ask_contents_box", "play_with_toy_passive"
                Fennimals_encountered: ["A1", "A2" ],
                partner_behavior: "absent",
                question_options_food: ["A", "B", "C", "X"],
                question_options_toys: ["A", "B", "C", "X"],
                question_options_toyboxes: ["A", "B", "C", "X"],
                bonus_star_for_correct_answer: true,
                hint_type: ["icon"],
                allowed_attempts_before_answer_given: 3,
                include_Fennefinder: true
            },

            {
                //Fennimal_attribute_sorting_task (requires Fennimals_encountered and
                type: "Fennimal_attribute_sorting_task", // "head_region_sorting_task", "Fennimal_attribute_sorting_task",
                Fennimals_encountered: ["A1" ],
                attribute_order: ["region", "head", "food_preference"],
                maximum_earnable_stars: 5
            },

            {
                type:"hint_and_search",
                Fennimal_interaction_type: ["play_with_toy_passive"], // "ask_contents_box", "play_with_toy_passive"
                Fennimals_encountered: ["A1",  "A2", "A3" ],
                partner_behavior: "absent",
                question_options_food: ["A", "B", "C", "X"],
                question_options_toys: ["A", "B", "C", "X"],
                question_options_toyboxes: ["A", "B", "C", "X"],
                bonus_star_for_correct_answer: true,
                hint_type: ["icon", "toybox", "toy"],
                allowed_attempts_before_answer_given: 3,
                include_Fennefinder: true
            },

             */


            /*



            {
                type:"hint_and_search",
                Fennimal_interaction_type: ["play_with_toy_passive", "ask_contents_box"], // "ask_contents_box", "play_with_toy_passive"
                Fennimals_encountered: ["A1"  ],
                partner_behavior: false,
                question_options_food: ["A", "B", "C", "X"],
                question_options_toys: ["A", "B", "C", "X"],
                question_options_toyboxes: ["A", "B", "C", "X"],
                bonus_star_for_correct_answer: true,
                hint_type: "icon",
                allowed_attempts_before_answer_given: 3,
                include_Fennefinder: "low_power_mode"
            },
            {
                type: "pseudoday",
                information: "partner_leaves"
            },


             */


            /*
            {
                type: "pseudoday",
                information: "partner_leaves"

            },
            {
                type: "pseudoday",
                information: "partner_returns"

            },

            {
                type: "head_region_sorting_task",
                Fennimals_included: "all"
            },

            {
                //Defining the quiz here
                type: 'quiz',

                QuestionSets: [{
                    //Defining which information is presented. Can be icon or name
                    cue: 'gray_head',

                    //Defining which questions are asked
                    questions_asked: ["name", "region"],

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
            },


            {
                type: "name_recall_task",

                //If set to true, participants will earn a bonus star for each correct answer
                award_star_for_each_correct_name: true,

                //Allowed Levenshtein distance to still assign a correct match
                allowed_Levenshtein_distance_for_match: 2,

            },

             */


        ],
        mentalizing_1: [





            // PUBLIC INFORMATION PHASE
            {
                type:"free_exploration",
                Fennimal_interaction_type:"play_with_toy_passive",
                Fennimals_encountered: ["S1" , "S2", "S3", "S4" ],
                partner_behavior: "active",
                include_Fennefinder: true
            },

            {
                type:"hint_and_search",
                Fennimal_interaction_type:"play_with_toy_active",
                question_options_toys: ["A", "B", "C", "D"],
                question_options_toyboxes: ["A", "B", "C", "D"],
                Fennimals_encountered: ["S1" , "S2", "S3", "S4" ],
                partner_behavior: "active",
                hint_type: "icon",
                include_Fennefinder: "low_power_mode"
            },

            //PARTNER LEAVES
            {
                type: "pseudoday",
                information: "partner_leaves"
            },

            //PRIVATE INFORMATION: BOXES
            {
                type:"free_exploration",
                Fennimal_interaction_type:"play_with_toy_passive",
                Fennimals_encountered: ["P1" , "P2", "P3", "P4" ],
                partner_behavior: "absent",
                include_Fennefinder: true
            },
            {
                type:"hint_and_search",
                Fennimal_interaction_type:"play_with_toy_active",
                Fennimals_encountered: ["P1" , "P2", "P3", "P4" ],
                question_options_toys: ["E", "F", "G", "H"],
                question_options_toyboxes: ["A", "B", "C", "D"],
                partner_behavior: "absent",
                hint_type: "icon",
                include_Fennefinder: "low_power_mode"
            },

            //PRIVATE INFORMATION: FEEDING (NETWORK TASK)
            {
                type:"free_exploration",
                Fennimal_interaction_type:"give_food_passive",
                Fennimals_encountered: ["W" , "X", "Y", "Z" ],
                partner_behavior: "absent",
                include_Fennefinder: true
            },
            {
                type:"hint_and_search",
                Fennimal_interaction_type:"give_food_active",
                Fennimals_encountered: ["W" , "X", "Y", "Z" ],
                question_options_food: ["A", "B", ],
                partner_behavior: "absent",
                hint_type: "icon",
                include_Fennefinder: "low_power_mode"
            },

            //PARTNER RETURNS
            {
                type: "pseudoday",
                information: "partner_returns"
            },

            //INFERENCE TRIALS
            {
                type:"hint_and_search",
                Fennimal_interaction_type:"ask_belief_partner_contents_box",
                Fennimals_encountered: ["I1" , "I2", "I3", "I4" ],
                partner_behavior: "active",
                hint_type: "icon",
                include_Fennefinder: "low_power_mode"
            },

            {
                type:"jump_to_trial",
                Fennimal_interaction_type:"ask_Fennimal_toy",
                Fennimals_encountered: ["S1" , "S2", "S3", "S4", "P1" , "P2", "P3", "P4"  ],
                partner_behavior: "active",
                hint_type: "icon",
                include_Fennefinder: true,
                bonus_star_for_correct_answer: true,
            },



        ],
        mentalizing_1B: [
            // PUBLIC INFORMATION PHASE
            {
                type:"free_exploration",
                Fennimal_interaction_type:"play_with_toy_passive",
                Fennimals_encountered: ["S1" , "S2", "S3" ],
                partner_behavior: "active",
                include_Fennefinder: true
            },

            {
                type:"hint_and_search",
                Fennimal_interaction_type:"play_with_toy_active",
                question_options_toys: ["A", "B", "C"],
                question_options_toyboxes: ["A", "B", "C"],
                Fennimals_encountered: ["S1" , "S2", "S3"],
                partner_behavior: "active",
                hint_type: "icon",
                include_Fennefinder: "low_power_mode"
            },

            {
                type:"hint_and_search",
                Fennimal_interaction_type:"play_with_toy_active",
                question_options_toys: ["A", "B", "C"],
                question_options_toyboxes: ["A", "B", "C"],
                Fennimals_encountered: ["S1" , "S2", "S3"],
                partner_behavior: "active",
                hint_type: "toybox",
                include_Fennefinder: "low_power_mode"
            },

            {
                type:"hint_and_search",
                Fennimal_interaction_type:"play_with_toy_active",
                question_options_toys: ["A", "B", "C"],
                question_options_toyboxes: ["A", "B", "C"],
                Fennimals_encountered: ["S1" , "S2", "S3"],
                partner_behavior: "active",
                hint_type: "toy",
                include_Fennefinder: "low_power_mode"
            },


            //PARTNER LEAVES
            {
                type: "pseudoday",
                information: "partner_leaves"
            },

            //PRIVATE INFORMATION: BOXES
            {
                type:"free_exploration",
                Fennimal_interaction_type:"play_with_toy_passive",
                Fennimals_encountered: ["P1" , "P2" ],
                partner_behavior: "absent",
                include_Fennefinder: true
            },
            {
                type:"hint_and_search",
                Fennimal_interaction_type:"play_with_toy_active",
                Fennimals_encountered: ["P1" , "P2",],
                question_options_toys: ["D", "E", "F"],
                question_options_toyboxes: ["A", "B", "C"],
                partner_behavior: "absent",
                hint_type: "icon",
                include_Fennefinder: "low_power_mode"
            },
            {
                type:"hint_and_search",
                Fennimal_interaction_type:"play_with_toy_active",
                Fennimals_encountered: ["P1" , "P2",],
                question_options_toys: ["D", "E", "F"],
                question_options_toyboxes: ["A", "B", "C"],
                partner_behavior: "absent",
                hint_type: "toybox",
                include_Fennefinder: "low_power_mode"
            },
            {
                type:"hint_and_search",
                Fennimal_interaction_type:"play_with_toy_active",
                Fennimals_encountered: ["P1" , "P2",],
                question_options_toys: ["D", "E", "F"],
                question_options_toyboxes: ["A", "B", "C"],
                partner_behavior: "absent",
                hint_type: "toy",
                include_Fennefinder: "low_power_mode"
            },


            //PRIVATE INFORMATION: FEEDING (NETWORK TASK)
            {
                type:"free_exploration",
                Fennimal_interaction_type:"give_food_passive",
                Fennimals_encountered: ["W" , "X", "Y", "Z" ],
                partner_behavior: "absent",
                include_Fennefinder: true
            },
            {
                type:"hint_and_search",
                Fennimal_interaction_type:"give_food_active",
                Fennimals_encountered: ["W" , "X", "Y", "Z" ],
                question_options_food: ["A", "B", ],
                partner_behavior: "absent",
                hint_type: "icon",
                include_Fennefinder: "low_power_mode"
            },

            //PARTNER RETURNS
            {
                type: "pseudoday",
                information: "partner_returns"
            },

            //INFERENCE TRIALS
            {
                type:"hint_and_search",
                Fennimal_interaction_type:"ask_belief_partner_contents_box",
                Fennimals_encountered: ["I1" , "I2", "I3" ],
                partner_behavior: "active",
                hint_type: "icon",
                include_Fennefinder: "low_power_mode",
                bonus_star_for_correct_answer: true,
            },

            {
                type:"jump_to_trial",
                Fennimal_interaction_type:"ask_Fennimal_toy",
                Fennimals_encountered: ["S1" , "S2", "S3",  "P1" , "P2", "P3"  ],
                partner_behavior: "active",
                hint_type: "icon",
                include_Fennefinder: true,
                bonus_star_for_correct_answer: true,
            },



        ],
        mentalizing_2: [

            // PUBLIC INFORMATION PHASE
            {
                type: "pseudoday",
                information: "new_Fennimals_spotted",
                displayed_icons: ["S1", "S2"],
                title: "Get to know some of the Fennimals on the island",
                display_text: "There are some Fennimals on the island who would love to get to know you and %PARTNERNAME%! " +
                    "Today, take %PARTNERNAME% with you to explore the island, find the Fennimals and play with them. "
            },
           /* {
                type:"free_exploration",
                Fennimal_interaction_type:"play_with_toy_passive",
                Fennimals_encountered: ["S1" , "S2" ],
                partner_behavior: "active",
                include_Fennefinder: true
            },

            */
            {
                type:"hint_and_search",
                Fennimal_interaction_type:"play_with_toy_active",
                question_options_toys: ["A", "B"],
                question_options_toyboxes: ["A", "B"],
                Fennimals_encountered: ["S1" , "S2"],
                partner_behavior: "active",
                hint_type: ["icon", "toybox", "toy"],
                include_Fennefinder: "low_power_mode"
            },
            {
                //Fennimal_attribute_sorting_task (requires Fennimals_encountered and
                type: "Fennimal_attribute_sorting_task", // "head_region_sorting_task", "Fennimal_attribute_sorting_task",
                Fennimals_encountered: ["S1", "S2"],
                attribute_order: ["region", "head", "toybox", "toy"],
                maximum_earnable_stars: 5
            },

            //PRIVATE INFORMATION: BOXES
            {
                type: "pseudoday",
                information: "partner_leaves"
            },
            {
                type: "pseudoday",
                information: "new_Fennimals_spotted",
                displayed_icons: ["P1", "P2"],
                title: "Get to know some more Fennimals on the island",
                display_text: "While %PARTNERNAME% is away, there are some Fennimals on the island who would love to get to know you!" +
                    "Unfortunately, we ran out of boxes to store the toys in, so we will have to reuse some of the boxes."
            },
            {
                type:"free_exploration",
                Fennimal_interaction_type:"play_with_toy_passive",
                Fennimals_encountered: ["P1" , "P2" ],
                partner_behavior: "absent",
                include_Fennefinder: true
            },
            {
                type:"hint_and_search",
                Fennimal_interaction_type:"play_with_toy_active",
                Fennimals_encountered: ["P1" , "P2"],
                question_options_toys: ["D", "E" ],
                question_options_toyboxes: ["A", "B" ],
                partner_behavior: "absent",
                hint_type: ["icon", "toybox", "toy", "name"],
                include_Fennefinder: "low_power_mode"
            },
            {
                type: "Fennimal_attribute_sorting_task", // "head_region_sorting_task", "Fennimal_attribute_sorting_task",
                Fennimals_encountered: ["P1", "P2" ],
                attribute_order: ["name", "region", "head", "toybox", "toy"],
                maximum_earnable_stars: 5
            },

            //PRIVATE INFORMATION: FEEDING (NETWORK TASK)


            //PARTNER RETURNS
            {
                type: "pseudoday",
                information: "partner_returns"
            },

            //INFERENCE TRIALS
            {
                type:"hint_and_search",
                Fennimal_interaction_type:"ask_belief_partner_contents_box",
                Fennimals_encountered: ["I1" , "I2"],
                partner_behavior: "active",
                hint_type: "icon",
                include_Fennefinder: true,
                bonus_star_for_correct_answer: true,
            },

            {
                type:"jump_to_trial",
                Fennimal_interaction_type:"ask_Fennimal_toy",
                Fennimals_encountered: ["S1" , "S2",   "P1" , "P2" ],
                partner_behavior: false,
                include_Fennefinder: false,
                bonus_star_for_correct_answer: true,
            },



        ],
        mentalizing_network: [

            // PUBLIC INFORMATION PHASE
            {
                type: "pseudoday",
                information: "new_Fennimals_spotted",
                displayed_icons: ["S1", "S2", "W", "X"],
                title: "Get to know some of the Fennimals on the island",
                display_text: "There are some Fennimals on the island who would love to get to know you and %PARTNERNAME%! " +
                    "Today, take %PARTNERNAME% with you to explore the island, find the Fennimals and play with them. "
            },
             {
                 type:"free_exploration",
                 Fennimal_interaction_type:["play_with_toy_passive", "give_food_passive"],
                 Fennimals_encountered: ["S1" , "S2", "W", "X" ],
                 partner_behavior: "active",
                 include_Fennefinder: true
             },

            {
                type:"hint_and_search",
                Fennimal_interaction_type:["play_with_toy_active", "give_food_active"],
                question_options_toys: ["A", "B"],
                question_options_toyboxes: ["A", "B"],
                Fennimals_encountered: ["S1" , "S2", "W", "X"],
                partner_behavior: "active",
                hint_type: ["icon", "toybox", "food", "toy"],
                include_Fennefinder: "low_power_mode"
            },
            {
                type: "Fennimal_attribute_sorting_task", // "head_region_sorting_task", "Fennimal_attribute_sorting_task",
                Fennimals_encountered: ["S1", "S2", "W", "X"],
                attribute_order: ["region", "head", "toybox", "toy", "food_preference"],
                maximum_earnable_stars: 5
            },

            //PRIVATE INFORMATION: BOXES
            {
                type: "pseudoday",
                information: "partner_leaves"
            },
            {
                type: "pseudoday",
                information: "new_Fennimals_spotted",
                displayed_icons: ["P1", "P2", "Y", "Z"],
                title: "Get to know some more Fennimals on the island",
                display_text: "While %PARTNERNAME% is away, there are some Fennimals on the island who would love to get to know you!" +
                    "Unfortunately, we ran out of boxes to store the toys in, so we will have to reuse some of the boxes."
            },
            {
                type:"free_exploration",
                Fennimal_interaction_type:["play_with_toy_passive", "give_food_passive"],
                Fennimals_encountered: ["P1" , "P2", "Y", "Z" ],
                partner_behavior: "absent",
                include_Fennefinder: true
            },
            {
                type:"hint_and_search",
                Fennimal_interaction_type:["play_with_toy_active", "give_food_active"],
                Fennimals_encountered: ["P1" , "P2", "Y", "Z"],
                question_options_toys: ["C", "D" ],
                question_options_toyboxes: ["A", "B" ],
                partner_behavior: "absent",
                hint_type: ["icon", "toybox","food","toy", "name"],
                include_Fennefinder: "low_power_mode"
            },
            {
                type: "Fennimal_attribute_sorting_task", // "head_region_sorting_task", "Fennimal_attribute_sorting_task",
                Fennimals_encountered: ["P1", "P2", "Y", "Z" ],
                attribute_order: ["name", "region", "head", "toybox", "toy", "food_preference"],
                maximum_earnable_stars: 5
            },

            //PARTNER RETURNS
            {
                type: "pseudoday",
                information: "partner_returns"
            },

            //INFERENCE TRIALS
            {
                type: "collect_items_in_warehouse",
                questions: ["ask_partner_belief_toyboxes"],
                bonus_stars_per_correct_answer: 5,
                question_options_toyboxes: ["A", "B"],
                question_options_toys: ["A", "B", "C", "D"]
            },
            {
                type:"jump_to_trial",
                Fennimal_interaction_type:"ask_Fennimal_toy",
                Fennimals_encountered: ["S1" , "S2",   "P1" , "P2" ],
                partner_behavior: false,
                bonus_star_for_correct_answer: true,
            }

        ]

    }

    /// POST-EXPERIMENT QUESTIONNAIRE
    //Which pages are shown to participants after the last day but BEFORE the payment screen?
    //     "demographics_questionnaire": contains a question on age, gender and color-blindness
    const All_Questionnaire_Page_sets = {
        test: [],
        mentalizing_1: ["demographics_questionnaire"],
        mentalizing_1B: ["demographics_questionnaire"],
        mentalizing_2: ["demographics_questionnaire"],
        mentalizing_network: ["demographics_questionnaire"],

    }

    //The below variables determine which heads are allowed or not allowed in the experiment.
    // Here the allowed list takes precedence. If it is NOT set to false, then ONLY the names in this array are used. This is still subject to cluster restrictions.
    //  If the banned list is not equal to false, then remove all the names listed in the banned aray.
    // The forced list is the strongest of them all: if set to anything but false, then it forces the usage of these heads (in random order), IGNORING CLUSTER STRUCTURE.
    const All_Allowed_Head_Lists = {
        test: false,
        mentalizing_1: false,
    }
    const All_Banned_Head_Lists = {
        test: ["chicken", "owl", "bird", "snowman", "elf", "candycane", "witch"],
        mentalizing_1: false,
    }
    const All_Forced_Head_Lists = {
        test: false,
        mentalizing_1: ["astro", "cupcake", "carrot", "pencil", "tv", "skull", "elephant", "fly", "shark", "blockhead"],
        mentalizing_1B: ["astro", "cupcake", "carrot", "pencil", "tv", "skull", "elephant", "fly", "shark", "blockhead"],
        mentalizing_2: ["astro", "cupcake", "carrot", "pencil", "tv", "skull", "elephant", "fly", "shark", "blockhead"],
        mentalizing_network: ["astro", "cupcake", "carrot", "pencil", "tv", "skull", "elephant", "fly", "shark", "blockhead"],
    }

    //Same as for heads, but now on a group level.
    //  If the allowed list is not set to false, then all heads must be a member of those groups.
    //  If the allowed list is set for false, then removes all heads which are a part of the banned array
    const All_Allowed_Head_Groups_List = {
        test: false,
        mentalizing_1: false
    }
    const All_Banned_Head_Groups_List = {
        test: false,
        mentalizing_1: false
    }

    // STIMULUES CREATION AND MORE GENERAL STIMULUS SETTINGS
    ///////////////////////////////////////
    //If multiple experiment codes are provided, then select one at random here
    if (this.Experiment_Code.length > 0) {
        this.Experiment_Code = shuffleArray(this.Experiment_Code)[0]
    }
    console.log("%c Starting experiment with code " + this.Experiment_Code, "color:blue")

    //Setting the correct structure for this experiment
    this.Experiment_Structure = All_Experiment_Structures[this.Experiment_Code]
    this.Fennimals_Encountered_During_Experiment = All_Fennimal_Sets[this.Experiment_Code]

    this.Instructions_at_start = false
    if(typeof All_Instructions_At_Start[this.Experiment_Code] !== "undefined"){ this.Instructions_at_start  = All_Instructions_At_Start[this.Experiment_Code] }

    this.Pages_at_end = false
    if(typeof All_Questionnaire_Page_sets[this.Experiment_Code] !== "undefined"){ this.Pages_at_end  = All_Questionnaire_Page_sets[this.Experiment_Code] }


    this.allowed_heads = false
    if(typeof All_Allowed_Head_Lists[this.Experiment_Code] !== "undefined"){ this.allowed_heads = All_Allowed_Head_Lists[this.Experiment_Code] }

    this.banned_heads = false
    if(typeof All_Banned_Head_Lists[this.Experiment_Code] !== "undefined"){ this.banned_heads = All_Banned_Head_Lists[this.Experiment_Code] }

    this.forced_heads = false
    if(typeof All_Forced_Head_Lists[this.Experiment_Code] !== "undefined"){ this.forced_heads = All_Forced_Head_Lists[this.Experiment_Code] }

    this.allowed_head_groups = false
    if(typeof All_Allowed_Head_Groups_List[this.Experiment_Code] !== "undefined"){ this.allowed_head_groups = All_Allowed_Head_Groups_List[this.Experiment_Code] }

    this.banned_head_groups = false
    if(typeof All_Banned_Head_Groups_List[this.Experiment_Code] !== "undefined"){ this.banned_head_groups = All_Banned_Head_Groups_List[this.Experiment_Code] }

        //GENERAL SETTINGS
    ////////////////////

    this.use_region_preferred_body_types = true


    //This defines the preferential order in which the regions are sampled. Note that this is sampled group by grou: [[region group 1, region group 1...,] , [region group 2...], ...]
    this.preferred_region_sample_order = [["Jungle", "Village", "North", "Desert"],["Beach", "Mountains", "Flowerfields", "Swamp"]]

    //If set to true, all heads will be drawn with contrasting tertiary colors. Helps to place focus on heads.
    this.use_constract_color_for_head = false

    //Determines the Fennimals naming convention.
    this.name_is_determined_as = "head"


    //Bonus payment details
    this.BonusStarValue = {
        currency_symbol: "$",
        bonus_per_star: 0.10
    }


}

//The stimulus-generator transforms the abstract setup outlined in the stimulus settings into actual Fennimals
let StimulusTransformer = function (StimTemplate) {
    //RETRIEVING DATA FROM SVG
    //Defining the templates SVG layer
    let SVGTemplatesLayer = document.getElementById("Fennimal_Templates_Layer"),
        SVG_Heads_Layer = document.getElementById("All_Heads"),
        SVG_Hats_Layer = document.getElementById("All_Hats")

    //Copying the experiment code and structure
    let Experiment_Code = StimTemplate.Experiment_Code
    this.Experiment_Structure = StimTemplate.Experiment_Structure
    let All_Names = {}

    //CREATING MAPS
    function create_feature_maps() {
        //Returns an array of all heads included in the SVG. Assumes the heads already exist in the templates layer
        let Variable_Features

        function get_array_of_heads_in_svg(){
            let SVGHeads = SVG_Heads_Layer.childNodes

            //For each head, create an object to represent its name (string), its group membership (array, false if none) and cluster (string, false if none)
            let Heads_array =[]
            for(let i =0; i<SVGHeads.length;i++){
                //Finding a placeholder name for now, but also copying all actual names to a separate object (we need to sample these later)
                let name = SVGHeads[i].id.split("_")[2]
                const defined_names = SVGHeads[i].getAttribute("name")
                if(defined_names === null){
                    console.warn("Warning: head type " + name + " has no defined name property!")
                }else{
                    All_Names[name] = SVGHeads[i].getAttribute("name").split(" ")
                }


                let assigned_classes = SVGHeads[i].classList
                let head_group = []
                let head_cluster = []
                for(let classnum = 0; classnum<assigned_classes.length; classnum++){
                    let cls = assigned_classes[classnum]
                    if(cls !== "Fennimal_head"){
                        if(cls.includes("cluster")){
                            head_cluster.push(cls.split("_")[3] )
                        }else{
                            head_group.push(cls.split("_")[2] )
                        }
                    }
                }

                //For now, we impose that each Fennimal may have AT MOST as single group and a single cluster. If this is not the case, print a warning and select the first
                if(head_group.length === 0){head_group = false} else { if(head_group.length === 1){head_group = head_group[0]}else {head_group = head_group[0]; console.warn("SVG Element " + name + " has multiple assigned groups. Ignoring all but the first")}}
                if(head_cluster.length === 0){head_cluster = false} else{ if(head_cluster.length === 1){head_cluster = head_cluster[0]}else {head_cluster = head_cluster[0]; console.warn("SVG Element " + name + " has multiple assigned clusters. Ignoring all but the first")}}

                //Finally, figure out if the svg head has an attachment point for hats


                Heads_array.push({name: name, group: head_group, cluster: head_cluster, can_wear_hat: SVGHeads[i].getElementsByClassName("Fennimal_head_hat_point").length > 0})
            }
            return(Heads_array)
        }

        //Given an array of heads in the svg (each containing an object with a name property), returns a sub-array containing the heads allowed by the stimulus settings.
        function get_all_allowed_heads_in_SVG(){
            //Get all heads in the SVG (this also stores all the actual, subject-facing, names in an object
            let Heads_SVG_array = get_array_of_heads_in_svg()

            let Filtered_array_first = []
            let Filtered_array_second = []

            //First, sort out all the allowed heads (we do a second pass on groups below).
            // If there is an allowed list, use only those. Else, filter out the heads from the banned list.
            if(StimTemplate.allowed_heads === false && StimTemplate.forced_heads === false){
                //Ban any names if they occur in the ban list. If there is no ban list, then move them to the filtered array right away
                if(StimTemplate.banned_heads !== false){
                    for(let i=0; i < Heads_SVG_array.length; i++){
                        if(! StimTemplate.banned_heads.includes(Heads_SVG_array[i].name)){
                            Filtered_array_first.push(Heads_SVG_array[i])
                        }
                    }
                }else{
                    Filtered_array_first = Heads_SVG_array
                }

            }else{
                //If there is an allowed and/or forced heads list, then only use the allowed heads
                // Here forced heads takes precedence!
                if(StimTemplate.forced_heads !== false){
                    for(let i = 0;i<Heads_SVG_array.length;i++){
                        if(StimTemplate.forced_heads.includes(Heads_SVG_array[i].name)){
                            Filtered_array_first.push(Heads_SVG_array[i])
                        }
                    }

                }else{
                    for(let i = 0;i<Heads_SVG_array.length;i++){
                        if(StimTemplate.allowed_heads.includes(Heads_SVG_array[i].name)){
                            Filtered_array_first.push(Heads_SVG_array[i])
                        }
                    }
                }
            }

            //Second pass: make sure that all the remaining heads are consistent with the limitations placed on groups
            if(StimTemplate.allowed_head_groups === false){
                if(StimTemplate.banned_head_groups !== false){
                    for(let i=0; i < Filtered_array_first.length; i++){
                        if(! StimTemplate.banned_head_groups.includes(Filtered_array_first[i].group)){
                            Filtered_array_second.push(Filtered_array_first[i])
                        }
                    }
                }else{
                    Filtered_array_second = Filtered_array_first
                }
            }else{
                //Only using allowed head groups
                for(let i = 0;i<Filtered_array_first.length;i++){
                    if( StimTemplate.allowed_head_groups.includes(Filtered_array_first[i].group) ){
                        Filtered_array_second.push(Filtered_array_first[i])
                    }
                }
            }

            //Third pass: if hats are included in the experiment, remove all heads which do not have a hat attachment point
            let Filtered_array_third = []
            if(typeof Variable_Features.hat !== "undefined"){
                console.log("%c Stimulus creation: ignoring heads which are unable to wear hats ", "color:orange")
                for(let i=0; i< Filtered_array_second.length;i++){
                    if(Filtered_array_second[i].can_wear_hat){
                        let NewElem = Filtered_array_second[i]
                        delete NewElem.can_wear_hat
                        Filtered_array_third.push(NewElem)
                    }
                }


            }else{
                for(let i=0; i< Filtered_array_second.length;i++){
                    let NewElem = Filtered_array_second[i]
                    delete NewElem.can_wear_hat
                    Filtered_array_third.push(NewElem)
                }

            }

            return(Filtered_array_third)
        }

        //Find all allowed heads in the SVG, then transforms them into an ordered structure. Top object contains all clusters. Obj[cluster] contains properties groups, etc
        // HeadsArray should be an array with [{name, group, cluster}... ]
        function get_heads_structure(HeadsArray){
            //Returns an array [{cluster}, {cluster}, ... ,] (Fennimals without a cluster will be EACH assigned to a different cluster)
            // Sorted biggest-to-smallest clusters in terms of total heads
            //In turn, each cluster:
            //      {cluster_name: name, total_number_of_heads_in_cluster, groups_in_cluster: [group, group, ...] (Fennimals without a group will be placed in different groups)
            //      In turn, earch group:
            //          {group_name, cluster_name, total_number_of_heads_in_group, heads_in_group: [name, name, name]

            //First pass: creating all the clusters (we worry about groups later)
            let ClusterStructure = {}
            let inferred_cluster_counter = 0

            for(let i=0;i<HeadsArray.length;i++){
                if(HeadsArray[i].cluster === false){
                    //This head has no cluster, so we create a new one
                    ClusterStructure["infc_" + inferred_cluster_counter ] = {Elems: [HeadsArray[i]]}
                    inferred_cluster_counter++
                }else{
                    if(typeof ClusterStructure[HeadsArray[i].cluster] === "undefined"){
                        ClusterStructure[HeadsArray[i].cluster] = {Elems: [HeadsArray[i]]}
                    }else{
                        ClusterStructure[HeadsArray[i].cluster].Elems.push(HeadsArray[i])
                    }
                }
            }

            //Next sweep: count the total number in the cluster, then move its elements to an array of groups
            let inferred_group_counter = 0
            for(let key in ClusterStructure){
                ClusterStructure[key].groups = {}
                for(let i =0;i < ClusterStructure[key].Elems.length; i++){
                    if(ClusterStructure[key].Elems[i].group === false){
                        ClusterStructure[key].groups["infg_" + inferred_group_counter ] = [ClusterStructure[key].Elems[i].name]
                        inferred_group_counter++
                    }else{
                        if(typeof ClusterStructure[key].groups[ ClusterStructure[key].Elems[i].group ] === "undefined"){
                            ClusterStructure[key].groups[ ClusterStructure[key].Elems[i].group ] = [ClusterStructure[key].Elems[i].name]
                        }else{
                            ClusterStructure[key].groups[ ClusterStructure[key].Elems[i].group ].push( ClusterStructure[key].Elems[i].name)
                        }
                    }
                }

                //Adding counts
                ClusterStructure[key].total_heads = ClusterStructure[key].Elems.length
                ClusterStructure[key].group_sizes = []
                for(let group in ClusterStructure[key].groups){
                    ClusterStructure[key].group_sizes.push(ClusterStructure[key].groups[group].length)
                }
                delete ClusterStructure[key].Elems


            }

            return(ClusterStructure)


        }

        //Groups the stimuli demands into a more managable array, with each Fennimal having a {name, group, cluster}
        function get_head_stimuli_in_arr(){

            //First: we want to make sure that all head codes have AT MOST a single group or cluster.
            //  If two head codes have different groups of clusters, then check if one of them has an unspecified group or cluster.
            //      If so, assign the group/cluster of the others. Print a warning.
            //      If not (they are both assigned to different groups or clusters, then print an error and pick one (this should not happen!)
            let FensInExp = StimTemplate.Fennimals_Encountered_During_Experiment
            let HeadCodes = {}
            for(let i=0;i<FensInExp.length;i++){
                let head = FensInExp[i].head
                let group = false, cluster = false
                if(typeof FensInExp[i].head_group !== "undefined"){group = FensInExp[i].head_group }
                if(typeof FensInExp[i].head_cluster !== "undefined"){cluster = FensInExp[i].head_cluster }

                //Check if we have seen this head code before. If not, add it (with the associated head group and head cluster)
                if(typeof HeadCodes[head] === "undefined"){
                    HeadCodes[head] = {group: group, cluster: cluster}
                }else{
                    //This head code is already represented. Check if it has the same head code and same cluster. If so, then nothing happens.
                    if( !(HeadCodes[head].group === group && HeadCodes[head].cluster === cluster) ){
                        //Now there is a problem: there may be different head groups and/or clusters associated to the same head code.

                        //First, we check for the biggest potential problem: if both have different NON-FALSE groups or clusters, then the groups are double-assigned - in this case, print an error.
                        if((group !== false &&  HeadCodes[head].group !== false && group !== HeadCodes[head].group) || (cluster !== false &&  HeadCodes[head].cluster !== false && cluster !== HeadCodes[head].cluster)  ){
                            console.error("ERROR: INVALID HEAD GROUP OR CLUSTER SPECIFICATION. DO NOT RUN EXPERIMENT. Detected at Fennimal with ID " + FensInExp[i].id)
                        }else{
                            //Now we know for either the groups and clusters there is at most one non-false entry. Print a warning and use that one.
                            if(group !== HeadCodes[head].group){
                                console.warn("WARNING: inferring missing group for Fennimal with ID " + FensInExp[i].id)
                                if(HeadCodes[head].group === false){
                                    HeadCodes[head].group = group
                                }
                            }

                            if(cluster !== HeadCodes[head].cluster){
                                console.warn("WARNING: inferring missing cluster for Fennimal with ID " + FensInExp[i].id)
                                if(HeadCodes[head].cluster === false){
                                    HeadCodes[head].cluster = cluster
                                }
                            }


                        }

                    }
                }
            }

            //Here we know that each head CODE has a unique combination of a group and cluster.
            //  However, there could be another error: two of the same groups could be associated to different clusters.
            //  So now we go through the head codes and made sure that this does not happen.
            let GroupCodes = {}
            let already_checked_keys = []

            for(let key in HeadCodes){
                let group = HeadCodes[key].group, cluster = HeadCodes[key].cluster

                //Group has not been seen before, add it to the object.
                if(typeof GroupCodes[group] === "undefined"){
                    GroupCodes[group] = cluster
                }else{
                    if(GroupCodes[group] !== cluster){
                        //Groups do not match the correct cluster structure.
                        if(GroupCodes[group] !== false && cluster !== false){
                            console.error("ERROR: SAME HEAD GROUP " + group + " HAS BEEN ASSIGNED TO MULTIPLE CLUSTERS. DO NOT RUN EXPERIMENT!")
                        }else{
                            //One of the two has a missing cluster declaration. Fix and print warning.
                            if(GroupCodes[group] === false){
                                //The previous head code with this group did not have the correct cluster. Now we have to go over all the previously checked keys and assigned a correct value
                                for(let prevcheckkeynum = 0; prevcheckkeynum < already_checked_keys.length; prevcheckkeynum ++){
                                    if(HeadCodes[already_checked_keys[prevcheckkeynum]].group === group){
                                        if(HeadCodes[already_checked_keys[prevcheckkeynum]].cluster === false){
                                            console.warn("Warning: cluster for group " + HeadCodes[already_checked_keys[prevcheckkeynum]].group + " missing. Inferring from context, CHECK STIMULI")
                                            HeadCodes[already_checked_keys[prevcheckkeynum]].cluster = cluster
                                        }
                                    }
                                }
                            }else{
                                //The current head does not have the correct cluster
                                console.warn("Warning: cluster for group " + group + " missing. Inferring from context, CHECK STIMULI")
                                HeadCodes[key].cluster = GroupCodes[group]
                            }
                        }



                    }
                }
                already_checked_keys.push(key)
            }

            //Now we know that each head code has a unique combination of group/cluster, and that each occurence of the same group is in the same cluster.
            //Creating inferred clusters: a single group can be entered multiple times - but ALWAYS without correctly specifying that they should be in the same cluster. Again, we need to go fix
            let inferred_group_counter = 0
            let inferred_cluster_counter = 0
            for(let gkey in GroupCodes){
                if(GroupCodes[gkey]=== false){
                    //Found a group without a cluster. Assining an inferred code here.
                    console.warn("Assigning inferred cluster code for " + gkey)
                    GroupCodes[gkey] = "infc" + inferred_cluster_counter
                    inferred_cluster_counter++

                    //Going over all the HeadCodes to fix
                    for(let hkey in HeadCodes){
                        if(HeadCodes[hkey].group === gkey){
                            HeadCodes[hkey].cluster = GroupCodes[gkey]
                        }
                    }
                }
            }


            // Time to transform all the heads into an array
            let HeadsArr = []
            for(let key in HeadCodes){
                HeadsArr.push({name: key, group: HeadCodes[key].group, cluster: HeadCodes[key].cluster})
            }
            return(HeadsArr)



        }

        //Given a requested cluster and an available clsuter, checks if the available cluster can fulfill the demands of the requested (returns bool)
        function can_requested_group_fit_in_available_group(Req, Available){
            if(Available.total_heads >= Req.total_heads){
                //Check if there are enough subgroups
                if(Available.group_sizes.length >= Req.group_sizes.length){
                    //Check if all subgroups can fit
                    let available_group_sizes = JSON.parse(JSON.stringify(Available.group_sizes)).sort().reverse()
                    let required_group_sizes = JSON.parse(JSON.stringify(Req.group_sizes)).sort().reverse()
                    let possible = true
                    for(let subgroupsize = 0; subgroupsize < required_group_sizes.length; subgroupsize++){
                        if(required_group_sizes[subgroupsize] < available_group_sizes[subgroupsize]){
                            possible = false
                        }
                        return(true)
                    }

                }else{
                    return false
                }
            }else{
                return false;
            }
        }

        // Returns a mapping of head-codes to head names
        function match_head_codes_to_head_names(){
            //First, we find all the heads requested by the stimulus settings and the heads available in the SVG.
            // These are both extracted are created by the functions above; {cluster_name, cluster_name}, where each cluster contains a group_sizes and a groups property

            let AvailableInSVG = get_heads_structure(get_all_allowed_heads_in_SVG())
            let MatchedHeads = {}

            //If there is a forced heads list, then we ignore clustering.
            if(StimTemplate.forced_heads !== false){
                //Here we simply assign all heads in random order
                AvailableInSVG = shuffleArray(get_all_allowed_heads_in_SVG())

                let RequestedHeadCodes = []
                for(let i =0;i<StimTemplate.Fennimals_Encountered_During_Experiment.length;i++){
                    RequestedHeadCodes.push(StimTemplate.Fennimals_Encountered_During_Experiment[i].head)
                }
                RequestedHeadCodes = [...new Set(RequestedHeadCodes)]

                for(let i = 0; i<RequestedHeadCodes.length; i++){
                    MatchedHeads[RequestedHeadCodes[i]] = AvailableInSVG[i].name
                }

                console.log(MatchedHeads)




            }else{
                //The best way to assign available groups/clusters to requested ones is in order of size.
                //For each requested group (starting from the biggest number of total heads):
                //      Find all available clusters which have a sufficient number of groups / heads per group.
                //      Pick one at random, remove it from the list of remaining available clusters.
                let RequestedHeads = get_heads_structure(get_head_stimuli_in_arr())

                //Sorting the Reuqested heads by group size
                let ReqHeads_Arr = []
                for(let key in RequestedHeads){
                    ReqHeads_Arr.push(RequestedHeads[key])
                }
                ReqHeads_Arr = sortArrayByKey(ReqHeads_Arr, "total_heads").reverse()

                //Now we will iteratively go over these, assigning an available group at random as we go
                let AssignedGroups = []
                for(let i=0; i<ReqHeads_Arr.length; i++){

                    //Find all possible groups of available hats (sort as an array of keys). Here we want to make sure that all subgroups are possible
                    let Subset_Available_keys = []
                    for(let key in AvailableInSVG){
                        if(can_requested_group_fit_in_available_group(ReqHeads_Arr[i], AvailableInSVG[key])){
                            Subset_Available_keys.push(key)
                        }
                    }

                    //Check if there are any available groups. If not, print an error
                    if(Subset_Available_keys.length === 0){
                        console.error("ERROR: CANNOT RESOLVE HEAD ASSIGNMENT FROM AVAILABLE SVG HEADS. DO NOT RUN EXPERIMENT! ")
                    }else{
                        //Pick one possibily cluster at random
                        let selected_key = shuffleArray(Subset_Available_keys)[0]

                        //Create a new object containing both the requested object and the matched availble object
                        AssignedGroups.push({Requested: ReqHeads_Arr[i], Matched: JSON.parse(JSON.stringify(AvailableInSVG[selected_key]))})

                        //Delete from the availabe set
                        delete AvailableInSVG[selected_key]

                    }

                }

                //Next step: for each pair of assigned clusters, match the associated groups (storing in a new array)
                for(let pairnum = 0; pairnum < AssignedGroups.length; pairnum++){
                    //As above, beginning assignments with the largest requested group first
                    let AllReqGroupsArr = []
                    for(let groupkey in AssignedGroups[pairnum].Requested.groups){
                        AllReqGroupsArr.push(AssignedGroups[pairnum].Requested.groups[groupkey])
                    }

                    //Sort by length
                    AllReqGroupsArr.sort((a, b) => b.length - a.length)

                    //Now for each requested group, find all the possible available groups and pick one at random.
                    // This is comparatively much simpler than before, we just need to find all subgroups with a sufficient length.
                    for(let groupnum =0;groupnum < AllReqGroupsArr.length; groupnum++){
                        let possible_group_names = []
                        for(let groupkey in AssignedGroups[pairnum].Matched.groups){
                            if(AssignedGroups[pairnum].Matched.groups[groupkey].length >= AllReqGroupsArr[groupnum].length){
                                possible_group_names.push(groupkey)
                            }
                        }

                        //Selecting the group and removing it from the matched object (in the process, shuffle the selected group)
                        let selected_group_name = shuffleArray(possible_group_names)[0]
                        let selected_group = shuffleArray( JSON.parse(JSON.stringify(AssignedGroups[pairnum].Matched.groups[selected_group_name])) )
                        delete AssignedGroups[pairnum].Matched.groups[selected_group_name]

                        // Now that we have a group, assign to the requested codes. These can be pushed directly into the final object
                        for(let elemnum = 0; elemnum < AllReqGroupsArr[groupnum].length; elemnum++){
                            MatchedHeads[AllReqGroupsArr[groupnum][elemnum]] = selected_group[elemnum]
                        }
                    }

                }

            }


            return(MatchedHeads)

        }

        function get_all_available_hats(){
            let Available_hats = []
            let Children = SVG_Hats_Layer.childNodes
            for(let i =0;i<Children.length;i++){
                let name = Children[i].id
                Available_hats.push(name.replace("hat_", ""))
            }
            return(Available_hats)

        }

        function get_all_available_toys(){
            let All_Toys = document.getElementsByClassName("toy")
            let All_Toys_Arr = []

            for(let i =0;i<All_Toys.length;i++){
                All_Toys_Arr.push(All_Toys[i].id.split("_")[1])
            }
            return(All_Toys_Arr)

        }

        function get_region_sample_order() {
            let Arr = []
            for (let i = 0; i < StimTemplate.preferred_region_sample_order.length; i++) {
                let randomized = shuffleArray(StimTemplate.preferred_region_sample_order[i])
                Arr.push(randomized)
            }
            return (Arr.flat())
        }

        function find_all_variable_features() {
            let Counts = []

            //First we make a count of which values are requested
            for (let i = 0; i < StimTemplate.Fennimals_Encountered_During_Experiment.length; i++) {
                for (let key in StimTemplate.Fennimals_Encountered_During_Experiment[i]) {
                    if(StimTemplate.Fennimals_Encountered_During_Experiment[i][key] !== false){
                        //If our summary object does not yet contain this type of variable feature, add it as an empty array.
                        if (typeof Counts[key] === "undefined") {
                            Counts[key] = []
                        }

                        //If the array does not yet contain this specific value, add it to the array
                        let value = StimTemplate.Fennimals_Encountered_During_Experiment[i][key]
                        Counts[key].push(value)
                    }
                }
            }

            //Summarizing these requested variable elements.
            Variable_Features = {}
            for (let key in Counts) {
                let Elem = Counts[key]
                let CountsInVar = {}

                for (let i = 0; i < Elem.length; i++) {
                    if (typeof CountsInVar[Elem[i]] === "undefined") {
                        CountsInVar[Elem[i]] = 0
                    }

                    CountsInVar[Elem[i]]++
                }
                Variable_Features[key] = CountsInVar
            }

        }

        function get_all_locations_in_SVG() {
            let All_Markers = document.getElementsByClassName("location_marker")
            let Regions = {}

            //Transform into an object keyed on region (with value being an array of locations)
            for (let i = 0; i < All_Markers.length; i++) {
                let location_name = All_Markers[i].id.split("_")[2]
                let region = All_Markers[i].classList[1].split("_")[2]

                if (typeof Regions[region] === "undefined") {
                    Regions[region] = []
                }

                Regions[region].push(location_name)

            }

            return (Regions)

        }

        function get_all_food_flavors_in_SVG() {
            //Get all food flavors of the bags
            let All_Bags = document.getElementsByClassName("foodbag_flavor")
            let All_Bags_Arr = []
            for(let i =0;i<All_Bags.length;i++){
                All_Bags_Arr.push(All_Bags[i].id.split("_")[2])
            }

            //Get all food flavors in the bowl
            let All_Foods = document.getElementsByClassName("food")
            let All_Foods_Arr = []
            for(let i =0;i<All_Foods.length;i++){
                All_Foods_Arr.push(All_Foods[i].id.split("_")[1])
            }
            All_Foods_Arr = [...new Set(All_Foods_Arr)]

            //Find flavors which are supported by both
            let Available_Foods = All_Bags_Arr.filter(x => All_Foods_Arr.includes(x))
            return(Available_Foods)
        }

        function get_all_boxes_in_SVG() {
            let All_Boxes = document.getElementsByClassName("toybox")
            let All_Boxes_Arr = []

            for(let i =0;i<All_Boxes.length;i++){
                All_Boxes_Arr.push(All_Boxes[i].id.split("_")[1])
            }
            return( [...new Set(All_Boxes_Arr)])
        }

        //Now we can create a map: for each variable feature, map all unique values to different properties which can be used to determine the Fennimals.
        //NOTE: here we assume that all SVG heads and bodies have been loaded!
        function assign_map_values() {
            let Map = {}

            for (let variable_feature_type in Variable_Features) {
                switch (variable_feature_type) {

                    case("head"):
                        Map.head = match_head_codes_to_head_names()
                        break;

                    case("region"):
                        Map.region = {}
                        //Get a random shuffle of the regions (but presevering a preferential order!)
                        let Selected_Region_Order = get_region_sample_order() // shuffleArray( get_region_sample_order() ) //TODO CHECK ORDER PRESERVATION

                        //Find out which locations and regions are present in the SVG
                        let Available_Locations = get_all_locations_in_SVG()

                        //Now we need to figure out how many regions we need. As before, sort these by the number of required locations, start sampling the locations with a sufficient number of locations.
                        // Right now this does not matter; all regions have 4 locations. But this step is for future-proofing, if I ever want to add just a few locations.
                        let requested_region_groups_by_size = Object.keys(Variable_Features.region).sort(function (a, b) {
                            return Variable_Features.region[b] - Variable_Features.region[a]
                        })

                        for (let group_ind = 0; group_ind < requested_region_groups_by_size.length; group_ind++) {
                            let group_id = requested_region_groups_by_size[group_ind]
                            let required_num_of_locations = Variable_Features.region[group_id]

                            //Find out which of the available regions have a sufficient number of groups (preserving the order)
                            let Possible_regions = []

                            for (let region_ind = 0; region_ind < Selected_Region_Order.length; region_ind++) {
                                if (Available_Locations[Selected_Region_Order[region_ind]].length >= required_num_of_locations) {
                                    Possible_regions.push(Selected_Region_Order[region_ind])
                                }
                            }
                            let selected_region_name = Possible_regions[0] // Preserving the order

                            //Retrieving locations, removing from available locations
                            let Selected_Region = JSON.parse(JSON.stringify(Available_Locations[selected_region_name]))
                            Selected_Region_Order = Selected_Region_Order.filter(function (e) {
                                return e !== selected_region_name
                            })

                            //Adding to the map
                            Map.region[group_id] = {
                                region: selected_region_name,
                                Locations: shuffleArray(JSON.parse(JSON.stringify(Selected_Region)))
                            }


                        }

                        break
                    case("hat"):
                        Map.hat = {}

                        //Find out which hats are present in the SVG
                        let Available_Hats = get_all_available_hats()

                        //Making sure we have enough hats
                        if(Available_Hats.length < Object.keys(Variable_Features.hat).length) {
                            console.error("ERROR: Too many hats requested")
                        }

                        //Shuffling the hats
                        Available_Hats = shuffleArray(Available_Hats)

                        //Now assigning each id variable with a different hat
                        for(let key in Variable_Features.hat) {
                            Map.hat[key] = Available_Hats.splice(0,1)[0]
                        }
                        break
                    case("food_preference"):
                        //Shorthand for all required flavors
                        let Required_Flavors = Object.keys(Variable_Features.food_preference)

                        //Get all the available flavors supported by the SVG
                        let Available_Bags = shuffleArray(get_all_food_flavors_in_SVG())

                        //Check if there are enough bags to support all flavors. If not, print an error
                        if(Required_Flavors.length > Available_Bags.length){
                            console.error("ERROR: Too many food flavors requested. Do not run experiment")
                        }else{
                            Map.food_preference = {}
                            for(let foodnum =0; foodnum<Required_Flavors.length; foodnum++){
                                Map.food_preference[Required_Flavors[foodnum]] = Available_Bags[foodnum]
                            }
                        }

                        break
                    case("toy"):
                        let Available_Toys = shuffleArray(get_all_available_toys())
                        let Required_Toys = Object.keys(Variable_Features.toy)
                        if(Available_Toys.length < Required_Toys.length){
                            console.error("ERROR: Too many different toys requested. DO NOT RUN EXPERIMENT.")
                        }else{
                            Map.toy = {}
                            for(let toynum = 0; toynum<Required_Toys.length; toynum++){
                                Map.toy[Required_Toys[toynum]] = Available_Toys[toynum]
                            }
                        }

                        break
                    case("toybox"):
                        let Available_Boxes = shuffleArray(get_all_boxes_in_SVG())
                        let Required_Boxes = Object.keys(Variable_Features.toybox)
                        if(Required_Boxes.length > Available_Boxes.length){
                            console.error("ERROR: Too many different boxes requested. DO NOT RUN EXPERIMENT.")
                        }else{
                            Map.toybox = {}
                            for(let boxnum = 0; boxnum<Required_Boxes.length; boxnum++){
                                Map.toybox[Required_Boxes[boxnum]] = Available_Boxes[boxnum]
                            }
                        }

                        break





                }
            }
            return (Map)
        }

        find_all_variable_features()
        return (assign_map_values())

    }

    // CREATING STIMULI
    //Transforming the stimulus templates into Fennimal objects
    function create_Fennimals_from_stimulus_template(StimTemp, Map) {
        //We randomize the order of created Fennimals (prevents regularities from occuring in setting some of the unmapped variables)
        let FenTemplates = shuffleArray(JSON.parse(JSON.stringify(StimTemp.Fennimals_Encountered_During_Experiment)))

        //Now we keep track of which features have already been sampled in the Map, and which ones remain un-used
        //REGIONS
        let Region_in_map = []
        for (let key in Map.region) {
            Region_in_map.push(JSON.parse(JSON.stringify(Map.region[key].region)))
        }
        let Unmapped_regions = StimTemplate.preferred_region_sample_order.flat().filter(x => !Region_in_map.includes(x));

        //CREATING FENNIMALS HERE
        let Arr = []
        for (let i = 0; i < FenTemplates.length; i++) {
            //Now we transform each Fennimal template into an actual object.
            let FenObj = {}
            //  Note: we will first try to use the features specified in the object. If a feature is not specified, use a default option.

            //Starting with region: if a region is specified, then use one of the regions in the map. If not, then use a random region
            if (typeof FenTemplates[i].region !== "undefined") {
                //Region is defined by the template
                FenObj.region = Map.region[FenTemplates[i].region].region

                //Now DESTRUCTIVELY pick one of the available regions (these have already been shuffled at random)
                FenObj.location = JSON.parse(JSON.stringify(Map.region[FenTemplates[i].region].Locations.splice(0, 1)[0]))

            } else {
                //The template does not specify a region. Pick an unmapped region at random
                FenObj.region = shuffleArray(Unmapped_regions)[0]
                //TODO... locations

            }

            //Continuing to body. If no body is mapped, then check if we need to select a region-preferred body
            if (typeof FenTemplates[i].body !== "undefined") {
                FenObj.body = Map.body[FenTemplates[i]]
            } else {
                if (StimTemp.use_region_preferred_body_types) {
                    FenObj.body = GenParam.RegionData[FenObj.region].preferredBodyType

                } else {
                    //TODO: pick a random body
                }
            }

            //Continuing to head. All Fennimals have a head.
            FenObj.head = Map.head[FenTemplates[i].head]

            //COLORSCHEME
            if (typeof FenTemplates[i].ColorScheme !== "undefined") {
                //TODO: mapped color schemes here
                FenObj.color_scheme_origin = "custom"
            } else {
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

                if (StimTemp.use_constract_color_for_head) {
                    FenObj.ColorScheme.Head.tertiary_color = GenParam.RegionData[FenObj.region].contrast_color
                }
            }

            //NAME
            switch (StimTemp.name_is_determined_as) {
                case("head"):

                    if(typeof All_Names[FenObj.head] !== "undefined"){
                        if(All_Names[FenObj.head].length > 0 ){
                            FenObj.name = All_Names[FenObj.head].shift()
                        }else{
                            FenObj.name = capitalize_first_letter_in_string(FenObj.head)
                            console.warn("Insufficient number of custom names for " + FenObj.head + "... Using default.")
                        }
                    }else{
                        FenObj.name = capitalize_first_letter_in_string(FenObj.head)
                        console.warn("No custom names for " + FenObj.head + "... Using default.")
                    }

                    break;
            }

            //ID (if assigned in the template)
            if (typeof FenTemplates[i].id !== 'undefined') {
                FenObj.id = FenTemplates[i].id
            }

            // Hats
            if(typeof FenTemplates[i].hat !== "undefined") {
                if(FenTemplates[i].hat !== false){
                    FenObj.hat = Map.hat[FenTemplates[i].hat]

                }
            }

            //Food preference
            if(typeof FenTemplates[i].food_preference !== "undefined") {
                if(FenTemplates[i].food_preference !== false){
                    FenObj.food_preference = Map.food_preference[FenTemplates[i].food_preference]
                }
            }

            //Toy and toybox
            if(typeof FenTemplates[i].toy !== "undefined") {
                if(FenTemplates[i].toy!== false){
                    FenObj.toy = Map.toy[FenTemplates[i].toy]
                }
            }
            if(typeof FenTemplates[i].toybox !== "undefined") {
                if(FenTemplates[i].toybox!== false){
                    FenObj.toybox = Map.toybox[FenTemplates[i].toybox]
                }
            }

            Arr.push(FenObj)
        }
        return (Arr)

    }

    let FeatureMap = create_feature_maps()
    console.log(FeatureMap)
    let FeatureMapConstant = JSON.parse(JSON.stringify(FeatureMap))

    const FennimalObjArr = create_Fennimals_from_stimulus_template(StimTemplate, FeatureMap)

    //Returns the experiment code
    this.get_experiment_code = function () {
        return (JSON.parse(JSON.stringify(Experiment_Code)))
    }

    //Returns an array of all the Fennimal objects
    this.get_all_Fennimals_objects_in_array = function () {
        return (JSON.parse(JSON.stringify(FennimalObjArr)))
    }

    //Returns an array of all the locations visited in the experiment
    /*this.get_all_locations_visited_during_experiment = function () {
        let LocationsVisited = []
        for (let i = 0; i < FennimalObjArr.length; i++) {
            LocationsVisited.push(JSON.parse(JSON.stringify(FennimalObjArr[i].location)))
        }
        return ([...new Set(LocationsVisited)])

    }

     */

    //Returns and array of all locations visited in the experiment, as can be shown to participants
    this.get_all_locations_visited_during_experiment_as_participant_facing_names = function () {
        let All_Locations = this.get_all_x_encountered_during_experiment("location")
        let Arr = []
        for (let i = 0; i < All_Locations.length; i++) {
            Arr.push(GenParam.LocationDisplayNames[All_Locations[i]])
        }
        return (Arr)
    }

    this.get_all_x_encountered_during_experiment = function(x){
        let Arr = []
        for (let i = 0; i < FennimalObjArr.length; i++) {
            if(typeof FennimalObjArr[i][x] !== "undefined") {
                Arr.push(JSON.parse(JSON.stringify(FennimalObjArr[i][x])))
            }
        }
        return ([...new Set(Arr)])
    }

    this.get_assigned_names_of_code_array = function(type, Arr){
        console.log(type, Arr)
        if(type in FeatureMap){
            console.log(FeatureMap)
            let OutArr = []
            for(let i in Arr){
                if(Arr[i] in FeatureMap[type]){
                    OutArr.push(JSON.parse(JSON.stringify(FeatureMap[type][Arr[i]])))
                }else{
                    OutArr.push(false)
                }

            }
            return OutArr
        }else{
            console.warn("Requesting assigned name of unknown property " + type)
            return false
        }

    }

    //Returns an array with one element for each location visited. Each element is coded as [location, region]
    this.get_all_locations_visited_during_experiment_with_regions = function () {
        let Arr = []
        for (let i = 0; i < FennimalObjArr.length; i++) {
            Arr.push([JSON.parse(JSON.stringify(FennimalObjArr[i].location)), JSON.parse(JSON.stringify(FennimalObjArr[i].region))])
        }
        return (Arr)

    }

    //Given an array of creation-codes, returns the mapped values of this Fennimal property
    this.get_all_map_codes_of_array = function (property_name, arr) {
        if(property_name === false){ return false}
        if(typeof FeatureMap[property_name] === "undefined") { return false}
        if(! Array.isArray(arr)) { return false }

        let OutArr = []
        for(let i = 0; i < arr.length; i++) {

            if( typeof FeatureMap[property_name][arr[i]] !== "undefined" ) {
                OutArr.push(FeatureMap[property_name][arr[i]])
            }
        }


        return(OutArr)



    }

    //Does NOT count the pseudodays
    this.get_number_of_days_in_experiment = function () {
        let count = 0
        for (let i = 0; i < this.Experiment_Structure.length; i++) {
            if (this.Experiment_Structure[i].type !== "pseudoday") {
                count++
            }
        }
        return (count)
    }

    //Returns a copy of the featuremaps (before they got modified during assignment)
    this.get_Feature_maps = function () {
        return (FeatureMapConstant)
    }

    this.get_instruction_pages_arr = function () {
        return (JSON.parse(JSON.stringify(StimTemplate.Instructions_at_start)))
    }

    this.get_questionnaire_pages_arr = function () {
        return (JSON.parse(JSON.stringify(StimTemplate.Pages_at_end)))
    }

    //BONUS DETAILS
    ////////////////

    //Returns the maximum number of stars which can be earned during the experiment
    this.get_maximum_number_of_bonus_stars = function () {
        //TODO: so far, only supports the name recall task and the quiz.
        //  For MIXED type interactions, only counts interactions with "ask_x"

        let max_stars = 0
        for (let i = 0; i < this.Experiment_Structure.length; i++) {

            //The quiz types may have stars associated to them
            if (this.Experiment_Structure[i].type === "quiz") {

                if (typeof this.Experiment_Structure[i].award_star_for_correct_answer !== "undefined") {
                    if (this.Experiment_Structure[i].award_star_for_correct_answer) {
                        //There is a quiz in which participants can earn a star for each correct answer.
                        for (let setnum = 0; setnum < this.Experiment_Structure[i].QuestionSets.length; setnum++) {

                            if (typeof this.Experiment_Structure[i].QuestionSets[setnum].question_set_type === "undefined" || this.Experiment_Structure[i].QuestionSets[setnum].question_set_type === "normal") {
                                max_stars = max_stars + this.get_Fennimals_in_array(this.Experiment_Structure[i].QuestionSets[setnum].Fennimals_included).length
                            }

                            if (this.Experiment_Structure[i].QuestionSets[setnum].question_set_type === "treatment") {
                                for (let subsetnum = 0; subsetnum < this.Experiment_Structure[i].QuestionSets[setnum].question_groups.length; subsetnum++) {
                                    max_stars = max_stars + this.get_Fennimals_in_array(this.Experiment_Structure[i].QuestionSets[setnum].question_groups[subsetnum].Fennimals_included).length
                                }
                            }

                        }
                    }
                }
            }

            //The recalled names may earn a bonus for each correctly recalled name
            //TODO update
            if (this.Experiment_Structure[i].type === "name_recall_task") {
                if (typeof this.Experiment_Structure[i].award_star_for_each_correct_name !== "undefined") {
                    if (this.Experiment_Structure[i].award_star_for_each_correct_name) {
                        max_stars = max_stars + this.get_Fennimals_in_array("all").length
                    }
                }
            }

            //The attribute sorting task may be set with a maximum number of earnable stars
            if (this.Experiment_Structure[i].type === "Fennimal_attribute_sorting_task") {
                if (typeof this.Experiment_Structure[i].maximum_earnable_stars !== "undefined") {
                    if (this.Experiment_Structure[i].maximum_earnable_stars !== false) {
                        max_stars = max_stars + this.Experiment_Structure[i].maximum_earnable_stars
                    }
                }
            }

            if(this.Experiment_Structure[i].type === "collect_items_in_warehouse") {
                if(typeof this.Experiment_Structure[i].bonus_stars_per_correct_answer !== "undefined"){
                    if(this.Experiment_Structure[i].bonus_stars_per_correct_answer !== false){
                        //Going through all question types
                        for(let qnum = 0; qnum < this.Experiment_Structure[i].questions.length; qnum++) {
                            switch(this.Experiment_Structure[i].questions[qnum]){
                                case("ask_partner_belief_toyboxes"):
                                    max_stars = max_stars + this.Experiment_Structure[i].bonus_stars_per_correct_answer * this.Experiment_Structure[i].question_options_toyboxes.length
                            }
                        }

                    }
                }
            }


            //The trial-based phases contain "ask_x" interactions. Note that they can have mixed types!
            if( ["free_exploration", "hint_and_search", "jump_to_trial"].includes(this.Experiment_Structure[i].type)){
                if(typeof this.Experiment_Structure[i].Fennimal_interaction_type === "string"){
                    if(this.Experiment_Structure[i].Fennimal_interaction_type.includes("ask_")){
                        max_stars = max_stars + this.Experiment_Structure[i].Fennimals_encountered.length
                    }
                }

                if(Array.isArray(this.Experiment_Structure[i].Fennimal_interaction_type)){
                    for(let intnum = 0; intnum<this.Experiment_Structure[i].Fennimal_interaction_type.length; intnum++) {
                        if(this.Experiment_Structure[i].Fennimal_interaction_type[intnum].includes("ask_")){
                            max_stars = max_stars + this.Experiment_Structure[i].Fennimals_encountered.length
                        }
                    }
                }



            }

        }

        return (max_stars)

    }

    //Returns the bonus details
    this.get_bonus_details = function () {
        return (JSON.parse(JSON.stringify(StimTemplate.BonusStarValue)))
    }

    this.get_Fennimals_in_array = function (Arr_of_ids) {
        console.log(Arr_of_ids)
        if(Arr_of_ids === "all"){
            return(JSON.parse(JSON.stringify(FennimalObjArr)))
        }else{
            let OutArr = []
            for(let i = 0; i < Arr_of_ids.length; i++) {
                for(let fennum = 0; fennum < FennimalObjArr.length; fennum++) {
                    if(FennimalObjArr[fennum].id === Arr_of_ids[i]) {
                        OutArr.push(JSON.parse(JSON.stringify(FennimalObjArr[fennum])))
                    }
                }
            }
            return OutArr
        }

    }

    //Returns the Fennimals in a specified subgroup. Returns as an array of Fennimal objects. If this subgroup does not exist, returns false and print a warning
    this.get_Fennimals_in_subgroup = function (subgroup_name) {

        //Check if theres is a key with this name in Fennimals Encountered During Experiment.
        //If the group to search for is not "all", then search for subgroups...
        if (subgroup_name === "all") {
            let Arr = []
            for (let i = 0; i < StimTemplate.Fennimals_Encountered_During_Experiment.length; i++) {
                let id = StimTemplate.Fennimals_Encountered_During_Experiment[i].id
                for (let fen = 0; fen < FennimalObjArr.length; fen++) {
                    if (FennimalObjArr[fen].id === id) {
                        Arr.push(JSON.parse(JSON.stringify(FennimalObjArr[fen])))
                    }
                }
            }
            return (Arr)
        } else {
            if (typeof StimTemplate.Fennimals_Encountered_During_Experiment.subgroups === "undefined") {
                console.warn("WARNING: REQUEST WAS MADE FOR SUBGROUP OF FENNIMALS, BUT NONE ARE DEFINED. RETURNING FALSE")
                return (false)
            }

            if (typeof StimTemplate.Fennimals_Encountered_During_Experiment.subgroups[subgroup_name] === "undefined") {
                console.warn("WARNING: REQUEST WAS MADE FOR SUBGROUP WITH UNKONWN NAME: " + subgroup_name + ". THIS GROUP HAS NOT BEEN SPECIFIED IN STIMULI. RETURNING FALSE")
                return (false)
            }

            let Arr = []
            for (let i = 0; i < StimTemplate.Fennimals_Encountered_During_Experiment.subgroups[subgroup_name].length; i++) {
                let id = StimTemplate.Fennimals_Encountered_During_Experiment.subgroups[subgroup_name][i].id
                for (let fen = 0; fen < FennimalObjArr.length; fen++) {
                    if (FennimalObjArr[fen].id === id) {
                        Arr.push(JSON.parse(JSON.stringify(FennimalObjArr[fen])))
                    }
                }
            }
            return (Arr)
        }


        return (Arr)

    }

    //Returns false if there are no subgroups, otherwise returns object with one key for each subgroup, each containing the ID of the Fennimal in this group
    this.get_Fennimal_subgroups = function () {
        if (typeof StimTemplate.Fennimals_Encountered_During_Experiment.subgroups === "undefined") {
            return false
        } else {
            let Out = {}
            for (let key in StimTemplate.Fennimals_Encountered_During_Experiment.subgroups) {
                Out[key] = []
                let Elem = StimTemplate.Fennimals_Encountered_During_Experiment.subgroups[key]
                for (let i = 0; i < Elem.length; i++) {
                    Out[key].push(Elem[i].id)
                }
            }
            return (Out)
        }

    }


}

//TODO: set seed (for shufflearray)