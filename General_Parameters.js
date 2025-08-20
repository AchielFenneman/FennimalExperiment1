GENERALPARAM = function(){

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
        Overview:{
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
    this.map_zoom_level = 0.35
    this.map_zoom_level_center = 0.375

    //Defined the zoom speed
    this.map_zoom_animation_speed = 500

    //Defined the transition speed (the mask) between the map and location
    this.map_to_location_transition_speed = 750

    //Note: these are denoted in PERCENTAGES
    this.Map_Region_Centers_Percentage = {
        Home: {x: 50, y: 50 },
        North: {x: 50, y: 10 },
        Desert: {x: 50, y: 90 },
        Jungle: {x: 25, y: 50 },
        Village: {x: 75, y: 50 },
        Flowerfields: {x: 35, y: 15 },
        Mountains: {x: 65, y: 15 },
        Swamp: {x: 70, y: 85 },
        Beach: {x: 25, y: 85 },
    }

    //The environment may place additional constraints on speed. These are defined below
    this.Speedlimits = {
        road: 6,
        path: 6,
        default: 6
    }
    this.player_minimum_move_distance = 25 //To prevent wiggling, movement is only initated if the cursor is at least this distance from the player

    //Region data
    this.RegionData = {
        North : {
            lighter_color: "#a2b2fc",
            color: "#0020ac",
            darker_color: "#001987",
            Fennimal_location_colors:{
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
            lighter_color: "#b5e092",
            color: "#588b1e",
            darker_color: "#235412",
            Fennimal_location_colors:{
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
            lighter_color: "#f5f55b",
            color: "#c7c602", //#fffe03
            darker_color: "#757500",

            Fennimal_location_colors:{
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
            lighter_color: "#d6bba9",
            color: "#502d16",
            darker_color: "#26150a",
            Fennimal_location_colors:{
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
            lighter_color: "#ffd0b0",
            color: "#ffe6d5",
            darker_color: "#9e682e", // "#615c58",
            Fennimal_location_colors:{
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
            lighter_color: "#ffcffa",
            color: "#f472e6",
            darker_color: "#783771",
            Fennimal_location_colors:{
                primary_color:  "#4d2f49",
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

            lighter_color: "#fcb1b1",
            color: "#f20000",
            darker_color: "#7d0101",
            Fennimal_location_colors:{
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
            lighter_color: "#adffef",
            color: "#00fdcc",
            darker_color: "#025e4c",
            Fennimal_location_colors:{
                primary_color: "#5b7878",
                secondary_color: "#c2f0ea",
                tertiary_color:  "#00b3b3",
                eye_color: "#8affff",
            },
            contrast_color: "#cb156b",
            preferredBodyType: "mushroom",
            display_name: "The Swamp",
            color_description: "teal"

        },
        Home: {
            lighter_color: "#CCCCCC",
            color: "#AAAAAA",
            darker_color: "#333333",
            display_name: "The Center of Fenneland"
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

    this.get_display_name_of_location = function(location_name){
        if(location_name in this.LocationDisplayNames){
            return(this.LocationDisplayNames[location_name])
        }else{
            return(location_name)
        }
    }

    //Assumes that locations have been set by the map controller! Returns false if location does not exist on the map
    this.find_region_of_location = function(location){
        for(let i in this.RegionData){
            if(typeof this.RegionData[i].Locations !== "undefined"){
                if(this.RegionData[i].Locations.includes(location)){
                    return(i)
                }
            }
        }
        return(false)

    }

    this.HeadDisplayNames  = {
        rhino: "Rhino",
        giraffe: "Giraffey",
        elephant: "Elephant",
        cow: "Moo",
        sheep: "Softy",
        pig: "Oinkers",
        chicken: "Rooster",
        jackolantern: "Jack-o",
        ghost: "Ghostie",
        witch: "Witchy",
        skull: "Skully",
        snowman: "Snowy",
        elf: "Elf",
        christmastree: "Xmastree",
        candycane: "Candy",
        lion: "Leo",
        santa: "Santa",
        stocking: "Stocking",
        eagle: "Eagle",
        giftbox: "Boxy",

        owl: "Owlie",
        bird: "Birdie",
        parrot: "Parrot",
        toucan: "Toucan",
        peacock: "Peacock",
        tombstone: "Tombstone",
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
    this.Similar_Head_Classes = {
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

    //OTHER SETTINGS
    this.DisplayFoundFennimalIconsOnMap = {
        show: true,
        icon_type: 'head', //Can be either "full" or "head"
        display_only_in_current_region: true,
        display_all_icons_on_watchtower: true
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
        center_x: (this.SVG_width / 2)  ,
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
    this.location_detection_distance = 30

    this.Quiz_settings = {
        show_color_when_asking_for_region: true,
        show_color_when_asking_for_location: false,
    }

    //FENNIMAL GENERAL PARAMTERES
    this.Fennimal_head_size = 0.6

    //Instruction settings
    this.RequestInstructionButtonSettings = {
        center_x: 100,
        center_y : 75,
        width: 100,
        height: 100,
        textsize: 100,
        text: "?",
        fontWeight: 900,
    }

}


console.warn("LOADED GENERAL PARAMETERS")

//TODO: assign IDs for outlines on map creation (effiency)