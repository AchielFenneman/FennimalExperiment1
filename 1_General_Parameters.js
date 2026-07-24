GENERALPARAM = function () {

    // When true: assign box colors via the hue-space algorithm, fill BoxColorSchemes, and paint box SVG templates.
    // Toy recoloring is controlled separately by use_color_algorithm_for_toy_colors.
    // When false/undefined: keep baked box SVG fills and the predefined ToyData ColorSchemes.
    this.use_color_algorithm_to_pick_colors = true;

    // When true (and use_color_algorithm_to_pick_colors): also overwrite ToyData ColorSchemes from the algorithm.
    // When false: keep the predefined ToyData palettes (pilot default while box colors are tested).
    this.use_color_algorithm_for_toy_colors = false;

    // Hue families aligned with RegionData.color_description (+ gray). Used by the color algorithm.
    // `cluster` groups perceptually similar families — boxes may take at most one hue per cluster.
    // Box colors use light_color/dark_color (punchier). Toys use the muted toy_* variants.
    this.ColorHuePalettes = {
        blue:     { angle: 220, cluster: "cool",    light_color: "#8ea4f8", dark_color: "#0020ac", toy_light_color: "#9aa8c8", toy_dark_color: "#3d4f7a" },
        green:    { angle: 110, cluster: "cool",    light_color: "#b5e092", dark_color: "#235412", toy_light_color: "#b0c49a", toy_dark_color: "#4a5e3a" },
        yellow:   { angle: 58,  cluster: "warm",    light_color: "#f5e84a", dark_color: "#757500", toy_light_color: "#d4ce8e", toy_dark_color: "#7a7538" },
        brown:    { angle: 25,  cluster: "warm",    light_color: "#c4a882", dark_color: "#3d220f", toy_light_color: "#c4b5a5", toy_dark_color: "#5c4535" },
        sand:     { angle: 40,  cluster: "warm",    light_color: "#efe0c4", dark_color: "#8a6a3a", toy_light_color: "#e0d5c5", toy_dark_color: "#8a7a60" },
        lavender: { angle: 310, cluster: "cool",    light_color: "#e8b3ff", dark_color: "#890fbd", toy_light_color: "#cbb8d4", toy_dark_color: "#6a5080" },
        red:      { angle: 5,   cluster: "warm",    light_color: "#ff6b6b", dark_color: "#9a0000", toy_light_color: "#d4a4a4", toy_dark_color: "#7a3838" },
        teal:     { angle: 170, cluster: "cool",    light_color: "#6bb8ae", dark_color: "#0d4a40", toy_light_color: "#a8c4c0", toy_dark_color: "#3d5c58" },
        gray:     { angle: null, cluster: "neutral", light_color: "#d4d4d4", dark_color: "#555555", toy_light_color: "#d0d0d0", toy_dark_color: "#666666" },
    };

    // Boxes must be at least this many degrees apart on the hue wheel (gray is always "far").
    this.ColorAlgorithmMinBoxHueDistance = 75;
    // Toy light vs dark channels should be at least this far apart (dual-tone, not monochrome).
    this.ColorAlgorithmMinToyDualToneDistance = 90;
    // Toy identity hues (primary or secondary) should stay at least this far from other toys' hues.
    this.ColorAlgorithmMinToyPairwiseDistance = 50;

    // Box accent materials (box_color_accent). Assigned uniquely across boxes in an experiment.
    this.ColorAccentMaterials = {
        gold:    { accent_color: "#d4aa00" },
        silver:  { accent_color: "#b0b8c0" },
        copper:  { accent_color: "#b87333" },
        wood:    { accent_color: "#8b6914" },
        neutral: { accent_color: "#6e6e6e" },
    };

    // Filled at runtime when use_color_algorithm_to_pick_colors is true.
    // { [boxId]: { light_color, dark_color, accent_color, hue_family, accent_material } }
    this.BoxColorSchemes = {};

    //Defines the sequence of the starting instructions

    this.GeneralInstructions = {
        Consent: {
            left_column: "On this website you will participate in an experiment conducted on behalf of the University of Vienna (Austria). " +
                "Your participation in this study is voluntary. You can refuse to participate at any time without having to give a reason. " +
                "There will be no negative consequences if you refuse to participate or withdraw from the study early. <br>" +
                "<br>" +
                "The aim of this study is to investigate how people interact with novel situations. This kind of study is necessary to gain new, " +
                "reliable academic research results. Your informed consent to participate in this study is an indispensible prerequisite for us to conduct this study. " +
                "Please take time to read the following information carefully. If you have any questions regarding the information provided, please do not hesitate the " +
                "study team by sending a message via Prolific or by sending an email to the study leader (Achiel Fenneman; achiel.fenneman@univie.ac.at). <br>" +
                "<br>" +
                "<b>Study contents. </b> We will <u>not</u> provide any deceiving of erroneous information to you at any point. You will <u>not</u> be shown any aversive, " +
                "shocking, adult or otherwise inappropriate content at any point during the experiment. ",
            right_column: "<b> Data protection. </b> All the data that you provide is completely anonymous. We will <u>not</u> store or record any personally identifiable information at any point. " +
                "By participating in this experiment you agree that data collected during the study are recorded and analyzed. You agree that your data are " +
                "permanently saved electronically in anonymized form, that this data will be archived in an open-access database and may be shared with other researchers " +
                "in the future. If you want your data to be deleted at a later time, you can arrange for this by contacting Achiel Fenneman, and without having to give a reason. " +
                "You can do so up to one month after completing the experiment. You can freely contact the research team to receive a copy of your data " +
                "(due to the steps taken by the research team to ensure anonymity, you will have to provide your Prolific ID code to fulfil this request). <br>" +
                "<br>" +
                "By ticking the box below, you indicate that you are above the age of 18, that you have been provided with clear and detailed information about the objective " +
                "and scope of the study and that you consent to these terms, and that you are aware of your rights as a participant. "
        },
        Overview: {
            story: "<b>Your task in this experiment. </b>In this experiment you will travel to an island called Fenneland. This remote island has a unique wildlife, and is filled with many smart animals called <u>Fennimals</u>. " +
                "These Fennimals are unique to Fenneland and are unlike any other creatures. <br>" +
                "<br>" +
                "This experiment will consist of %NUMBERDAYS% days. At the start of each day you will receive further instructions on how to interact with the Fennimals on the island. ",
            bonus: "<tspan style='color: darkgoldenrod'> <b>Bonus stars.</b></tspan> During some days you be able to earn Bonus Stars. You will earn a bonus of %CURRENCYSYMBOL%%AMOUNTPERSTAR% per star that you earn during the experiment. " +
                "You can earn up to %MAXNUMBERSTARS% bonus stars during the experiment (for a maximum bonus of %CURRENCYSYMBOL%%MAXBONUSAMOUNT%)"
        }

    }

    this.get_hint_on_top_of_watchtower = true

    //Finding the dimensions of the SVG object
    this.SVGObject = document.getElementById("Scannimals_Task_SVG")
    this.SVG_width = parseFloat(document.getElementById("Scannimals_Task_SVG").getAttribute("width"))
    this.SVG_height = parseFloat(document.getElementById("Scannimals_Task_SVG").getAttribute("height"))

    //General parameters for interactions
    //Can the participant enter empty locations?
    this.can_enter_empty_locations = false

    //Defines the fraction of the map covered by the zoomed-in view
    this.map_zoom_level = 0.3 //0.35
    this.map_zoom_level_center = 0.375

    //Defined the zoom speed
    this.map_zoom_animation_speed = 500

    //Defined the transition speed (the mask) between the map and location
    this.map_to_location_transition_speed = 750

    //Note: these are denoted in PERCENTAGES
    this.Map_Region_Centers_Percentage = {
        Home: {x: 50, y: 50},
        North: {x: 50, y: 24},
        Desert: {x: 50, y: 75},
        Jungle: {x: 35, y: 50},
        Village: {x: 67, y: 50},
        Flowerfields: {x: 35, y: 30},
        Mountains: {x: 65, y: 30},
        Swamp: {x: 65, y: 70},
        Beach: {x: 35, y: 70},
    }

    /*
    this.Map_Region_Centers_Percentage = {
        Home: {x: 50, y: 50},
        North: {x: 50, y: 10},
        Desert: {x: 50, y: 85},
        Jungle: {x: 25, y: 50},
        Village: {x: 75, y: 50},
        Flowerfields: {x: 35, y: 20},
        Mountains: {x: 65, y: 20},
        Swamp: {x: 65, y: 80},
        Beach: {x: 35, y: 80},
    }
     */

    //The environment may place additional constraints on speed. These are defined below
    this.Speedlimits = {
        road: 6,
        path: 6,
        default: 6
    }
    this.player_minimum_move_distance = 25 //To prevent wiggling, movement is only initated if the cursor is at least this distance from the player

    //Region data
    this.RegionData = {
        North: {
            surrounding_color : "#b7b9c4",
            lighter_color: "#a2b2fc",
            color: "#0020ac",
            darker_color: "#001987",
            Fennimal_location_colors: {
                primary_color: "#526785",
                secondary_color: "#b0c9d4",
                tertiary_color: "#1a46b8",
                eye_color: "#d2dfff",
            },
            contrast_color: "#edc25e",
            preferredBodyType: "beaver",
            display_name: "The Frozen North",
            color_description: "blue"
        },
        Jungle: {
            surrounding_color : "#b0bfaf",
            lighter_color: "#b5e092",
            color: "#588b1e",
            darker_color: "#235412",
            Fennimal_location_colors: {
                primary_color: "#566e44",
                secondary_color: "#cfedbe",
                tertiary_color: "#78ab09",
                eye_color: "#dcff8f",
            },
            contrast_color: "#ac7dd7ff",
            preferredBodyType: "longneck",
            display_name: "The Jungle",
            color_description: "green"
        },
        Desert: {
            surrounding_color : "#e5d5b7",
            lighter_color: "#f5f55b",
            color: "#c7c602", //#fffe03
            darker_color: "#757500",

            Fennimal_location_colors: {
                primary_color: "#969239",
                secondary_color: "#d1caa9",
                tertiary_color: "#d2d911",
                eye_color: "#f7fe25",
            },
            contrast_color: "#47395b",
            preferredBodyType: "scaley",
            display_name: "The Desert",
            color_description: "yellow"
        },
        Mountains: {
            surrounding_color : "#b1a59c",
            lighter_color: "#d6bba9",
            color: "#502d16",
            darker_color: "#26150a",
            Fennimal_location_colors: {
                primary_color: "#953f05", //"#ded3d6",
                secondary_color: "#b09a90",//"#dedcdc",
                tertiary_color: "#502d16",
                eye_color: "#47230a",
            },
            contrast_color: "#9fd8ee",
            preferredBodyType: "climber",
            display_name: "The Mountains",
            color_description: "brown"
        },
        Beach: {
            surrounding_color : "#f2e6dd",
            lighter_color: "#ffd0b0",
            color: "#ffe6d5",
            darker_color: "#9e682e", // "#615c58",
            Fennimal_location_colors: {
                primary_color: "#f5a149",//"#665244",
                secondary_color: "#ffe6d5",//"#dedcdc",//"#f7cdbc",
                tertiary_color: "#ffd0b0",//"#f2e7df",
                eye_color: "#f6e8da",
            },
            contrast_color: "#c30b69",
            preferredBodyType: "turtle",
            display_name: "The Beach",
            color_description: "sand"
        },
        Flowerfields: {
            surrounding_color : "#d2becf",
            lighter_color: "#ffcffa",
            color: "#f472e6",
            darker_color: "#783771",
            Fennimal_location_colors: {
                primary_color: "#4d2f49",
                secondary_color: "#d3bfd9",
                tertiary_color: "#890fbd",
                eye_color: "#e8b3ff",
            },
            contrast_color: "#799742",
            preferredBodyType: "cow",
            display_name: "The Fields of Flowers",
            color_description: "lavender"

        },
        Village: {
            surrounding_color : "#ddc2c2",
            lighter_color: "#fcb1b1",
            color: "#f20000",
            darker_color: "#7d0101",
            Fennimal_location_colors: {
                primary_color: "#734b53",
                secondary_color: "#ccb1b8",
                tertiary_color: "#d10f0f",
                eye_color: "#ffbdbd",
            },
            contrast_color: "#80eeca",
            preferredBodyType: "rotund",
            display_name: "The Village",
            color_description: "red"

        },
        Swamp: {
            surrounding_color : "#d4dfdd",
            lighter_color: "#adffef",
            color: "#00fdcc",
            darker_color: "#025e4c",
            Fennimal_location_colors: {
                primary_color: "#5b7878",
                secondary_color: "#c2f0ea",
                tertiary_color: "#00b3b3",
                eye_color: "#8affff",
            },
            contrast_color: "#cb156b",
            preferredBodyType: "mushroom",
            display_name: "The Swamp",
            color_description: "teal"

        },
        Home: {
            surrounding_color : "#e6e6e6",
            lighter_color: "#CCCCCC",
            color: "#AAAAAA",
            darker_color: "#333333",
            display_name: "The Center of Fenneland",
            center_radius: 150,
        },

    }

    //Opacity of the region masks (when not visited)
    this.RegionMaskSetings = {
        color: "dimgray",
        base_opacity: 0.8

    }

    //Location data
    this.LocationDisplayNames = {
        Snowman: "The Snowman",
        Pineforest: "The frozen pineforest",
        Igloo: "The Igloo",
        Iceberg: "The Iceberg",
        Statue: "The Garden Statue",
        Orchard: "The Apple Orchard",
        Windmill: "The Windmills",
        Fountain: "The Garden Fountains",
        Limestone: "The Limestone Hills",
        Rainforest: "The Tropical Rainforest",
        Bush: "The Thick Bush",
        Lake: "The Tropical Lake",
        Hammock: "The Hammock",
        Beachbar: "The Beachbar",
        Lighthouse: "The Lighthouse",
        Port: "The Port",
        Wagon: "The Derelict Wagon",
        Cactus: "The Cactus Garden",
        Oasis: "The Oasis",
        Camp: "The Tent Camp",
        Tree: "The Giant Tree",
        Cottage: "The Abandoned Cottage",
        Marsh: "The Foggy Marsh",
        Bayou: "The Bayou",
        Gatehouse: "The Old Gatehouse",
        Manor: "The Manor",
        Church: "The Church",
        Farm: "The Farm",
        Dam: "The Dam",
        Mine: "The Mine",
        Waterfall: "The Waterfall",
        Cliff: "The Cliff"

    }

    this.get_display_name_of_location = function (location_name) {
        if (location_name in this.LocationDisplayNames) {
            return (this.LocationDisplayNames[location_name])
        } else {
            return (location_name)
        }
    }

    //Assumes that locations have been set by the map controller! Returns false if location does not exist on the map
    this.find_region_of_location = function (location) {
        for (let i in this.RegionData) {
            if (typeof this.RegionData[i].Locations !== "undefined") {
                if (this.RegionData[i].Locations.includes(location)) {
                    return (i)
                }
            }
        }
        return (false)

    }

    this.BodyDisplayNames = {
        beaver: "Furry, with a big tail",
        longneck: "Long neck with leaves on its shoulders",
        scaley: "Scaled and spikey",
        climber: "Long and thin",
        turtle: "Armoured like a turtle",
        cow: "Spotted like a cow",
        rotund: "Chubby with a scarf",
        mushroom: "Shaped like a mushroom",
    }

    //DEFINES WHICH HEAD GROUPS ARE SIMILAR TO EACHOTHER
    /*this.Similar_Head_Classes = {
        xmas: "halloween",
        halloween: "xmas",
        bird: "safari",
        safari: "bird"
    }
    this.Head_Group_Cluster_Types = {
        xmas: "holiday",
        halloween: "holiday",
        bird: "animal",
        safari: "animal"
    }

     */

    //OTHER SETTINGS
    this.DisplayFoundFennimalIconsOnMap = {
        show: true,
        icon_type: 'head', //Can be either "full" or "head"
        display_only_in_current_region: true,
        display_all_icons_on_watchtower: true,
        clear_Fennimal_icons_from_map_at_start_of_new_day: false
    }

    this.ToyData = {
        bear: {
            ColorScheme: {
                light_color: "#e3dbde",
                dark_color: "#48373e"
            },
            AlternateColorScheme: {
                light_color: "#c87137",
                dark_color: "#006680"
            },
        },
        jack: {
            ColorScheme: {
                light_color: "#ed4845",
                dark_color: "#c87137"
            },
            AlternateColorScheme: {
                light_color: "#0000ff",
                dark_color: "#c8c8c8"
            }
        },
        car: {
            ColorScheme: {
                light_color: "#575959",
                dark_color: "#c96457"
            },
            AlternateColorScheme: {
                light_color: "#8080ff",
                dark_color: "#d400aa"
            }
        },
        bubblewand: {
            ColorScheme: {
                light_color: "#b5bbe3",
                dark_color: "#b970d4"
            },
            AlternateColorScheme: {
                light_color: "#ffcc00",
                dark_color: "#554400"
            }
        },
        globe: {
            ColorScheme: {
                light_color: "#bdb94a",
                dark_color: "#602ead"
            },
            AlternateColorScheme: {
                light_color: "#00aa88",
                dark_color: "#93ac93"
            }
        },
        trumpet: {
            ColorScheme: {
                light_color: "#e6e6e6",
                dark_color: "#999999"
            },
            AlternateColorScheme: {
                light_color: "#4d4d4d",
                dark_color: "#f2f2f2"
            }
        },
        plane: {
            ColorScheme: {
                light_color: "#7ad6d1",
                dark_color: "#ac7e19"
            },
            AlternateColorScheme: {
                light_color: "#d40000",
                dark_color: "#666666"
            }
        },
        duck: {
            ColorScheme: {
                light_color: "#eeda22",
                dark_color: "#bd5555"
            },
            AlternateColorScheme: {
                light_color: "#008000",
                dark_color: "#002b00"
            }
        },
        spinner: {
            ColorScheme: {
                light_color: "#d7a4d4",
                dark_color: "#a03da5"
            },
            AlternateColorScheme: {
                light_color: "#d4aa00",
                dark_color: "#00aad4"
            }
        },
        robot: {
            ColorScheme: {
                light_color: "#eeda22",
                dark_color: "#bd5555"

            },
            AlternateColorScheme: {
                light_color: "#d7a4d4",
                dark_color: "#a03da5"
            }
        },
    }

    this.get_box_printed_name = function(box){
        switch(box){
            case("cardboard"): return("cardboard box")
            case("picknick"): return("picnic basket")
        }
        return(box)
    }

    //ACTION BUTTON PARAMETERS
    // This is the action button if it is NOT shown on top of an object. (Presented on a fix location on the screen instead)
    // Note: this coordinate system is in the SCEEN space
    this.ActionButtonParameters_Default = {
        center_x: 400,
        center_y: 850,
        height: 250,
        width: 250,
    }
    this.ActionButtonParameters_Center = {
        center_x: (this.SVG_width / 2),
        center_y: 950,
        height: 250,
        width: 250,
    }
    //Note: this coordinate system is in the MAP space
    this.ActionButtonParameters_OnObject = {
        height: 50,
        width: 50,
        warmup_time: 750
    }
    this.location_detection_distance = 35

    this.Quiz_settings = {
        show_color_when_asking_for_region: true,
        show_color_when_asking_for_location: false,
    }

    //FENNIMAL GENERAL PARAMTERES
    this.Fennimal_head_size = 0.6

    //Instruction settings
    this.RequestInstructionButtonSettings = {
        center_x: 100,
        center_y: 75,
        width: 100,
        height: 100,
        textsize: 100,
        text: "?",
        fontWeight: 900,
    }

    //In phases where stars can be earned, this color defined the background of the instructions
    this.background_fill_for_instructions_where_stars_can_be_earned = "#faf8eb"

    // AUTOTRAVEL AND PHONE ROOM SETTINGS
    this.AutoTravel = {
        speed: 4,
        arrivalDistance: 8,
        partnerCatchupDelay: 800,
        partnerFollowStopDistance: 4,
        startDelay: 250,
        iconFadeTime: 450,
        iconHoldDelay: 300,
        travellingLabel: "Travelling...",
        partnerStartOffset: {
            x: 0,
            y: 0
        }
    }

    this.MapFlair = {
        showAutoTravelTrackmarks: true,
        trackmarkSpacing: 22,
        trackmarkRadius: 5,
        trackmarkFadeTime: 2400,
        trackmarkColor: "#5c4030",
        trackmarkOpacity: 0.7
    }

    this.PhoneRoom = {
        backgroundColor: "#d9e7ef",
        floorColor: "#b7c8d2",
        roomFadeTime: 500,
        ringStartDelay: 500,
        phoneRingInterval: 2600,
        phoneShakeDuration: 450,
        returnToPhoneRoomAfterFinalTrial: true,

        table: {
            x: 0.25 * this.SVG_width,
            y: 0.73 * this.SVG_height,
            width: 0.5 * this.SVG_width,
            height: 0.22 * this.SVG_height
        },
        tableColor: "#8b5e3c",
        tableFrontColor: "#6f452b",

        phoneCenter: {
            x: 0.5 * this.SVG_width,
            y: 0.65 * this.SVG_height
        },

        partnerCenter: {
            x: 0.5 * this.SVG_width,
            y: 0.61 * this.SVG_height
        },
        partnerScale: 21,
        partnerExitTime: 900,
        partnerExitX: -250
    }
    this.PhoneRoomFlair = {
        showPhoneRipples: true,
        showExclamationMark: true,
        dimRoomOnAnswer: true,
        polishPartnerExit: true,
        showHintRainclouds: true,
        sequentialHintText: true,

        answerDimTime: 250,
        attentionPulseTime: 1100,
        phoneRippleInterval: 700,
        phoneRippleDuration: 1400,
        phoneRippleStartRadius: 28,
        phoneRippleMaxRadius: 260,
        phoneRippleStrokeWidth: 14,
        phoneRippleOpacity: 0.95,
        phoneRippleColor: "#FFE566",
        partnerTurnPause: 220
    }

    // Photo trial (photo_box / photo_Fennimal via same controller)
    this.PhotoTrial = {
        boxScaleMin: 2.5,
        boxScaleMax: 4,
        boxYMin: 0.45,
        boxYMax: 0.75,
        boxXMargin: 80,
        // Tighter jitter than the box — stay near a natural standing pose
        fennimalScaleMin: 1.6,
        fennimalScaleMax: 1.9,
        fennimalYMin: 0.78,
        fennimalYMax: 0.86,
        fennimalXMargin: 80,
        partnerAvoidGap: 100,
        lensWidth: 420,
        lensHeight: 480,
        reticleRadius: 36,
        bracketLength: 48,
        viewfinderDimOpacity: 0.55,
        flashPeakOpacity: 0.5,
        flashInTime: 70,
        flashHoldTime: 40,
        flashOutTime: 220,
        polaroidAppearDelay: 500,
        polaroidFadeTime: 350,
        missPolaroidTime: 750,
        polaroidScale: 0.825,
        polaroidCenterY: 0.42,
        closeButtonSize: 72
    }

    // Feed Fennimal trial
    this.FeedTrial = {
        fennimalX: 0.38,
        fennimalY: 0.82,
        fennimalScale: 1.75,
        bowlX: 0.58,
        bowlY: 0.78,
        bowlScale: 3.5,
        backpackX: 0.88,
        backpackY: 0.78,
        backpackScale: 3,
        bagScale: 3.5,
        bagColumnTopY: 0.18,
        bagColumnBottomY: 0.55,
        bagPopStagger: 90,
        bagMoveTime: 250,
        dropDistance: 200,
        eatMoveTime: 400,
        partnerBagOffsetX: -55,
        partnerBagOffsetY: -40,
        partnerHandoffLift: -50
    }

    // Joint Fennimal + box cleaning (memory binding, no toy)
    this.JointBoxCleaning = {
        fennimalX: 0.28,
        fennimalY: 0.82,
        fennimalScale: 1.75,
        boxX: 0.55,
        boxY: 0.72,
        boxScale: 4,
        cleaningRounds: 4,
        dirtSpots: 8,
        dustPerPuff: 25,
        // Between box (~0.55) and partner corner (~0.9)
        spongeActiveX: 0.55,
        spongeActiveY: 0.58,
        spongeFloorY: 0.88,
        bellowsOffsetX: 200,
        bellowsOffsetY: -700,
        // Closer to box / higher / smaller
        foliageOffsetX: -210,
        foliageOffsetY: 50,
        foliageSize: 1.5,
        foliageHitsPerRound: 1,
        // Resting spot while waiting (closer to box = further right)
        fennimalRestOffsetX: -650,
        // Ownership encoding / freeze after clean + before photo
        encodingPauseMs: 2200,
        freezeTableauMs: 1800,
        // Mutual handoff: how far Fennimal leans toward the approaching box
        handoffApproachMaxPx: 95,
        // Jump onto closed box, then back down
        jumpOnBoxAmount: 150,
        jumpOnBoxHoldMs: 450,
        dropDistance: 220,
        shearsOffsetX: 90,
        shearsOffsetY: -80,
        shearsScale: 2.2,
        shearsCloseMs: 200,
        shearsOpenMs: 360,
        // Partner "steps into scene" after handoff (still facing back)
        partnerHomeScale: 40,
        partnerWitnessScale: 30,
        partnerWitnessLiftY: -90,
        partnerWitnessGapX: 220,
        // Shared Fennimal+box silhouette outline
        bindingOutlineStrokeWidth: 22,
        // Soft-lock safety (idle = no scrub progress, not total turn time)
        scrubIdleHintMs: 12000,
        scrubIdleFailsafeMs: 25000,
        // Keep dirt off the plant side (left of box)
        dirtAvoidLeftFraction: 0.35
    }

    // Joint Fennimal + box decoration (memory binding, no toy)
    this.JointBoxDecoration = {
        fennimalX: 0.28,
        fennimalY: 0.82,
        fennimalScale: 1.75,
        boxX: 0.55,
        boxY: 0.72,
        boxScale: 4,
        fennimalRestOffsetX: -650,
        encodingPauseMs: 2200,
        freezeTableauMs: 1800,
        handoffApproachMaxPx: 95,
        jumpOnBoxAmount: 150,
        jumpOnBoxHoldMs: 450,
        dropDistance: 300,
        // Decoration pile between Fennimal and box (offsets from box center)
        pileOffsetX: -280,
        pileOffsetY: 95,
        pileSpread: 28,
        decorationLiftY: -90,
        decorationHeldScale: 2,
        fennimalApproachPileGap: 90,
        partnerApproachPileGap: 110,
        partnerHomeScale: 40,
        partnerWitnessScale: 30,
        partnerWitnessLiftY: -90,
        partnerWitnessGapX: 220,
        bindingOutlineStrokeWidth: 22
    }
}


console.log("%c LOADED GENERAL PARAMETERS", "color:darkgreen")

//TODO: assign IDs for outlines on map creation (effiency)