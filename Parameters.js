// Public constant, holding experiment parameters
console.warn("CREATING PARAMETERS ")

//Defines all global parameters which are not part of the stimuli
ParameterObject = function() {
    this.sound_on = true

    this.Instructions = {
        Fullscreen_Prompt: {
            title: "Best in Full-screen mode",
            text: "This experiment is best experienced by setting your browser to full-screen mode.<br><br>" +
                "Pressing the button below will toggle full-screen mode. On windows you can exit (and re-enter) full-screen mode at any time by pressing [F11]. " +
                "On Mac, you can enter and leave full-screen mode at any time by pressing [Command]+[Cntrl]+[F].<br>" +
                "<br>" +
                "In addition, please make sure that your audio is on! (The sound will enhance your performance during this task. <br>" +
                "<br>" +
                "<i>Important note: this experiment is only supported for Chrome. Using any other browsers may result in unforeseen errors! </i>"

        },
        Start: {
            title: "Welcome to the experiment",
            text: "This experiment is expected to last about %EXPERIMENT_MEAN_TIME% minutes, during which you will take a trip to a fantasy island called Fenneland." +
                " This island is home to a wide variety of smart and friendly animals called <b>Fennimals</b>. " +
                "These Fennimals are unique to Fenneland and are unlike any other creatures. <br>" +
                "<br>" +
                "During this experiment, you be a caretaker for these Fennimals. " +
                "The Fennimals on this island love playing with toys, but are very particular about which toys they like. " +
                "They are also very chaotic, and are prone to losing their favorite toy. " +
                "It will be your task to hold on to these toys on behalf of the Fennimals. <br>" +
                "<br>" +
                "You will do so by storing each Fennimal's toy in different boxes. " +
                "The Fennimals can then retrieve their toys from their box, and return them when they finish playing." +
                "There are %NUMBER_OF_BOXES% boxes: %BOXES_USED_STRING%. You are the only person who is allowed to open and close these boxes.<br>" +
                "<br>" +
                "This experiment  consists of %NUMBER_OF_BLOCKS% in-game days. During the last day, you will be asked a number of questions. " +
                "You can earn an additional bonus of up to %BONUS_CURRENCY_SYMBOL%%MAX_BONUS_AMOUNT% based on your answer to these questions - so please pay close attention to the entire experiment."
        },
        Public_information_initial: {
            title: "THE FIRST %NUMBER_OF_PUBLIC_BLOCKS% DAYS",
            text: "During the first %NUMBER_OF_PUBLIC_BLOCKS% days of the experiment, you will be taken to different Fennimals. " +
                "Each Fennimal likes to play with a different toy, and each Fennimal will store their toy in a different box.  <br>" +
                "<br>" +
                "You will travel the island together with a <b>partner</b>. " +
                "This partner is a trainee on the island, who will follow you around to observe which Fennimals like which toys, and which boxes these toys are stored in."
        },
        Public_information_repeat: {
            title: "Day %TRIALBLOCKNUM%",
            text: "The Fennimals are out and active again! You and your partner will go around the island to give the Fennimals their toys. " +
                "After they're done playing with them, they will place the toys back in the box. "
        },
        Private_information_initial : {
            title: "THE NEXT %NUMBER_OF_PRIVATE_BLOCKS% DAYS",
            text: "The Fennimals have been getting a bit restless, and some new Fennimals have appeared on the island. " +
                "Time to go around the island again! But heads up: some Fennimals may have found some new toys to play with... <br>" +
                "<br>" +
                "Unfortunately, you only have a limited number of boxes available. So when you encounter some new Fennimals, you will have to re-use a box which currently holds a different Fennimal's toy... <br> " +
                "<br>" +
                "Your partner has been given some other tasks on a different part of the island. " +
                "As a result, <b>your partner will not know about the upcoming interactions with the Fennimals.</b>"
        },
        Private_information_repeat : {
            title: "Day %TRIALBLOCKNUM%",
            text: "The Fennimals are out and active again! Time to go around the island and give each Fennimal its toy. <br>" +
                "<br>" +
                "Your partner is still on a different part of the island, and will not learn about any interactions you have with the Fennimals today."
        },
        Questions : {
            title: "THE LAST DAY",
            text: "Your partner has returned, just in time to start the last day of the experiment! " +
                "Your partner has not been in touch with anyone else during the last few days, and so does not know about any events which transpired since " +
                "the start of their leave. <br>" +
                "<br>" +
                "This day will be a bit different from the previous days. " +
                "Today, you will be asked a series of questions. For each question you answer correctly, you will <b>earn a bonus of %BONUS_CURRENCY_SYMBOL%%BONUS_AMOUNT_PER_QUESTION%. </b>. <br>" +
                "<br>" +
                "Place answer each question carefully. You will only learn how many questions you got correct after the day is over. "
        },
        Payment : {
            title: "YOUR RESULTS",
            text: "There were %BONUS_NUMBER_OF_QUESTIONS% questions. You answered a total of %BONUS_QUESTIONS_CORRECT% questions correctly. <br>" +
                "Therefore, you have earned a total bonus of <b> %BONUS_CURRENCY_SYMBOL%%BONUS_TOTAL% for this experiment.</b><br>" +
                "<br>" +
                "Your completion code is <b>%COMPLETION_CODE%</b>. Please submit this code to prolific now, but do NOT close or refresh this window!<br>" +
                "<br>" +
                "After you have submitted this code to Prolific, then press the button below. Do not close this window before clicking the button! Thank you for participating!"
        }
    }
    // General parameters
    this.show_location_name = true
    this.show_Fennimal_name = true
    this.ScreenPositions = {
        BoxCenter: {x: 346, y:145},
        FennimalCenter: {x:155,y:170}
    }

    //Boxnames
    this.BoxDescriptions = {
        a: "giftbox",
        b: "cardboard box",
        c: "chest",
        d: "crate",
        e: "container",
        f:"basket"
    }

    //Item data
    this.ItemData = {
        bear: {
            name: "bear",
            ColorScheme: {
                light_color: "#e3dbde",
                dark_color: "#48373e"
            }
        },
        ball: {
            name: "ball",
            ColorScheme: {
                light_color: "#c87137",
                dark_color: "#808080"
            }
        },
        car: {
            name: "car",
            ColorScheme: {
                light_color: "#a9efac",
                dark_color: "#457834"
            }
        },
        shovel: {
            name: "shovel",
            ColorScheme: {
                light_color: "#b5bbe3",
                dark_color: "#7581d0"
            }
        },
        boomerang: {
            name: "boomerang",
            ColorScheme: {
                light_color: "#e99598",
                dark_color: "#602ead"
            }
        },
        trumpet: {
            name: "trumpet",
            ColorScheme: {
                light_color: "#e6e6e6",
                dark_color: "#999999"
            }
        },
        plane: {
            name: "plane",
            ColorScheme: {
                light_color: "#7ad6d1",
                dark_color: "#ac7e19"
            }
        },
        duck: {
            name: "duck",
            ColorScheme: {
                light_color: "#eeda22",
                dark_color: "#bd5555"
            }
        },
        spinner: {
            name: "spinner",
            ColorScheme: {
                light_color: "#d7a4d4",
                dark_color: "#a03da5"
            }
        },
    }

    // FENNIMAL FEATURE PARAMETERS //
    /////////////////////////////////
    this.Included_Heads =["B","C", "E", "G", "J", "K", "N"]
    this.Included_Bodies = ["B","C", "D", "E","I","J","L","N" ]


    //NB: Home should always be the last element.
    this.LocationData = {
        Igloo : {
            lighter_color: "#a2b2fc",
            color: "#0020ac",
            darker_color: "#001987",
            prefix: "Arctic",
            Fennimal_location_colors:{
                primary_color: "#526785",
                secondary_color: "#b0c9d4",
                tertiary_color: "#1a46b8",
                eye_color: "#d2dfff",
            },
            contrast_color: "#edc25e",
            preferredBodyType: "B",
            preferredHeadType: "N",
            sky: "sky_North_3x",
            region: "North"
        },
        Jungleforest: {
            lighter_color: "#b5e092",
            color: "#588b1e",
            darker_color: "#235412",
            prefix: "Jungle",
            Fennimal_location_colors:{
                primary_color: "#566e44",
                secondary_color: "#cfedbe",
                tertiary_color: "#78ab09",
                eye_color: "#dcff8f",
            },
            contrast_color: "#ac7dd7ff",
            preferredBodyType: "N",
            preferredHeadType: "B",
            sky: "sky_Jungle_3x",
            region: "Jungle"
        },
        Oasis: {
            lighter_color: "#f5f55b",
            color: "#c7c602", //#fffe03
            darker_color: "#757500",
            prefix: "Desert",
            Fennimal_location_colors:{
                primary_color: "#969239",
                secondary_color: "#d1caa9",
                tertiary_color: "#d2d911",
                eye_color: "#f7fe25",
            },
            contrast_color: "#47395b",
            preferredBodyType: "I",
            preferredHeadType: "K",
            sky: "sky_Desert_2x",
            region: "Desert"
        },
        Mine: {
            lighter_color: "#d6bba9",
            color: "#502d16",
            darker_color: "#26150a",
            prefix: "Mountain",
            Fennimal_location_colors:{
                primary_color: "#953f05", //"#ded3d6",
                secondary_color: "#b09a90",//"#dedcdc",
                tertiary_color: "#502d16",
                eye_color: "#47230a",
            },
            contrast_color: "#9fd8ee",
            preferredBodyType: "J",
            preferredHeadType: "E",
            region: "Mountains"
        },
        Port: {
            lighter_color: "#ffd0b0",
            color: "#ffe6d5",
            darker_color: "#615c58",
            prefix: "Beach",
            Fennimal_location_colors:{
                primary_color: "#f5a149",//"#665244",
                secondary_color: "#ffe6d5",//"#dedcdc",//"#f7cdbc",
                tertiary_color: "#ffd0b0",//"#f2e7df",
                eye_color: "#f6e8da",
            },
            contrast_color: "#c30b69",
            preferredBodyType: "D",
            preferredHeadType: "G",
            sky: "sky_Beach_3x",
            region: "Beach"
        },
        Windmill: {
            lighter_color: "#ffcffa",
            color: "#f472e6",
            darker_color: "#783771",
            prefix: "Flowerland",
            Fennimal_location_colors:{
                primary_color:  "#4d2f49",
                secondary_color: "#d3bfd9",
                tertiary_color: "#890fbd",
                eye_color: "#e8b3ff",
            },
            contrast_color: "#799742",
            preferredBodyType: "E",
            preferredHeadType: "J",
            sky: "sky_Flowerfields_2x",
            region: "Flowerfields"

        },
        Church: {
            lighter_color: "#fcb1b1",
            color: "#f20000",
            darker_color: "#7d0101",
            prefix: "Domestic",
            Fennimal_location_colors:{
                primary_color: "#734b53",
                secondary_color: "#ccb1b8",
                tertiary_color: "#d10f0f",
                eye_color: "#ffbdbd",
            },
            contrast_color: "#80eeca",
            preferredBodyType: "L",
            preferredHeadType: "A",
            sky: "sky_Village_2x",
            region: "Village"

        },
        Cottage: {
            lighter_color: "#adffef",
            color: "#00fdcc",
            darker_color: "#025e4c",
            prefix: "Wetland",
            Fennimal_location_colors:{
                primary_color: "#5b7878",
                secondary_color: "#c2f0ea",
                tertiary_color:  "#00b3b3",
                eye_color: "#8affff",
            },
            contrast_color: "#cb156b",
            preferredBodyType: "C",
            preferredHeadType: "C",
            sky: "sky_Swamp_2x",
            region: "Swamp"
        },

    }
    this.location_Names = Object.getOwnPropertyNames(this.LocationData)

    //This object contains the subject-facing names for the locations
    this.SubjectFacingLocationNames = {
        Pineforest: "The Pineforest",
        Iceberg: "The Iceberg",
        Igloo: "The Igloo",
        Windmill: "The Windmills",
        Garden: "The Walled Garden",
        Orchard: "The Orchard",
        Waterfall: "The Waterfall",
        Mine: "The Mines",
        Cliff: "The Cliff",
        Church: "The Church",
        Farm: "The Farm",
        Manor: "The Manor",
        Marsh: "The Marshes",
        Cottage: "The Cottage in the Swamp",
        Creek: "Creek",
        Oasis: "The Oasis",
        Cactus: "The Cactus Garden",
        Camp: "The Desert Camp",
        Beachbar: "The Beachbar",
        Port: "The Port",
        Dunes: "The Dunes",
        Bush: "The Bush",
        Jungleforest: "The Deep Jungle",
        Lake: "The Lake"
    }

    //ITEM PARAMETERS
    /////////////////
    this.Available_items = ["ball", "duck", "car", "trumpet", "kite"]

    //NAMES
    // Adjective of a name based on the body
    // Determines the naming scheme. Options include: "region-head", "body-head"
    this.namingscheme = 'unique_per_head' // 'unique': random names. 'unique_per_head' creates names based on the Fennimal's head, with each Fennimal having a different name. 'unique_combo" draws a unique prefix (region-based) and head name.
    // 'region_head' and 'location_head' create conjunctive names.

    this.NamePrefixes_Body = {
        A: "Striped",
        B: "Furry",
        C: "Sprouting",
        D: "Armoured",
        E: "Spotted",
        F: "Boxy",
        G: "Six-legged",
        H: "Big-armed",
        I: "Scaled",
        J: "Twiggy",
        K: "Spiked",
        L: "Chubby",
        M: "Bearded",
        N: "Long-necked"
    }
    this.NamePrefixes_Region = {
        North : "Northern",
        Jungle:  "Jungle",
        Desert: "Desert",
        Mountains: "Mountain",
        Beach:  "Beach",
        Flowerfields: "Flowerland",
        Village: "Domestic",
        Swamp: "Swamp",
    }
    this.NamePrefixes_Location = {
        Pineforest: "Pine",
        Iceberg: "Iceberg",
        Igloo: "Igloo",
        Windmill: "Windmill",
        Garden: "Garden",
        Orchard: "Orchard",
        Waterfall: "Waterfall",
        Mine: "Subterranean",
        Cliff: "Cliff",
        Church: "Church",
        Farm: "Farm",
        Manor: "Household",
        Marsh: "Marsh",
        Cottage: "Cottage",
        Creek: "Creek",
        Oasis: "Oasis",
        Cactus: "Cactus",
        Camp: "Camp",
        Beachbar: "Bar",
        Port: "Port",
        Dunes: "Dune",
        Bush: "Bush",
        Jungleforest: "Tree",
        Lake: "Freshwater"
    }

    // Description of the head
    this.Names_Head = {
        A: "Kitty",
        B: "Leo",
        C: "Worker",
        D: "Buzzer",
        E: "Chirpy",
        F: "Hoot",
        G: "Finny",
        H: "Hammer",
        I: "Piggy",
        J: "Boar",
        K: "Hisser",
        L: "Slither",
        M: "Squeaky",
        N: "Nibbler",
    }

    let Multiple_Names_Head = {
        A: ["Whiskers","Kitty", "Purrcy"],
        B: ["Leo","Aslan", "Simba"],
        C: ["Bugsy","Marcher", "Chompo"],
        D: ["Buzzer","Whizz", "Zoomba"],
        E: ["Chirpo","Tweeter", "Beaky"],
        F: ["Hoot", "Echo", "Peeper"],
        G: ["Finny","Mako", "Bubbles"],
        H: ["Hammer", "Cutter", "Broad-face"],
        I: ["Piggy", "Oinkers", "Squeala"],
        J: ["Boar", "Tusker", "Hogzilla"],
        K: ["Hisser","Slinky","Fango"],
        L: ["Cobra", "Venom", "Serpenty"],
        M: ["Squeaky", "Fidget", "Jerry"],
        N: ["Nibbles", "Rascal", "Chipper"]
    }
    let Multiple_Names_Region = {
        North : ["Arctica", "Winter", "Snowy"],
        Jungle:  ["Jungler", "Leafy", "Tropicala"],
        Desert: ["Sahara", "Mirage", "Scaley"],
        Mountains: ["Boulder", "Spindly", "Climbo"],
        Beach:  ["Waverly","Ocean", "Surfer"],
        Flowerfields: ["Moo","Angus", "Grazer"],
        Village: ["Cozy","Roundo", "Chunker"],
        Swamp: ["Toad","Muddy", "Laguna"],
    }

    let Multiple_Prefixes_Region= {
        North : ["Arctic", "Winter", "Snowy"],
        Jungle:  ["Jungle", "Leafy", "Tropical"],
        Desert: ["Desert", "Arid", "Scaley"],
        Mountains: ["Mountain", "Spindly", "Climbing"],
        Beach:  ["Beach","Ocean", "Surfing"],
        Flowerfields: ["Mooing","Spotted", "Grazing"],
        Village: ["Cozy","Domestic", "Village"],
        Swamp: ["Swamp","Muddy", "Marshland"],
    }
    this.draw_unique_name_by_head = function(head){
        let newname =  shuffleArray(Multiple_Names_Head[head]).shift()
        //Used_Unique_Fennimal_Names.push(newname)
        return(newname)
    }

    this.draw_unique_name_by_region = function(region){
        let newname =  shuffleArray(Multiple_Names_Region[region]).shift()
        Used_Unique_Fennimal_Names.push(newname)
        return(newname)
    }

    this.draw_unique_compound_name = function(region, head){
        let regionname = shuffleArray(Multiple_Prefixes_Region[region]).shift()
        let headname =  shuffleArray(Multiple_Names_Head[head]).shift()
        let newname = regionname + " " + headname
        //Used_Unique_Fennimal_Names.push(newname)
        return(newname)
    }






}

let Param = new ParameterObject()

