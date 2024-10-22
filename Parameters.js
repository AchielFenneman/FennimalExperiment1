// Public constant, holding experiment parameters
console.warn("CREATING PARAMETERS ")

//Defines all global parameters which are not part of the stimuli
ParameterObject = function() {

    // LOCATION PARAMETERS //
    /////////////////////////
    //Sets the number of visitable locations for all regions. If 3: all locations available. If 2: picks the left and right. If 1: go straight from map to location.
    // Can be overwritten: just change the Available_Location_Names vector
    let number_of_visitable_locations_per_region = 2

    this.show_colors_with_icon_hints = false

    this.Preferred_Region_Selections = {
        2: ["North", "Desert"],
        3: ["North", "Desert", "Village"],
        4: ["North", "Desert", "Village", "Jungle"],
        5: ["North", "Desert", "Village", "Jungle", "Mountains"],
        6: ["North", "Desert", "Village", "Jungle", "Mountains", "Swamp"],
        7: ["North", "Desert", "Village", "Jungle", "Mountains", "Swamp", "Flowerfields"],
        8: ["North", "Desert", "Village", "Jungle", "Mountains", "Swamp", "Flowerfields", "Beach"],

    }

    this.Available_Location_Names = []

    this.All_Possible_Locations = ["Igloo", "Pineforest", "Iceberg", "Windmill", "Orchard", "Garden", "Waterfall", "Cliff", "Mine", "Manor", "Church", "Farm","Marsh", "Creek", "Cottage", "Camp", "Oasis", "Cactus", "Dunes", "Beachbar", "Port", "Lake", "Bush", "Jungleforest"]
    switch(number_of_visitable_locations_per_region){
        case(1): this.Available_Location_Names =  ["Iceberg", "Windmill", "Cliff", "Church", "Cottage","Oasis","Port", "Jungleforest"]; break
        case(2): this.Available_Location_Names =  ["Igloo", "Iceberg","Windmill", "Garden", "Waterfall", "Mine", "Manor", "Farm","Marsh", "Cottage","Camp", "Cactus", "Dunes", "Port", "Lake", "Jungleforest"]; break
        case(3): this.Available_Location_Names =  this.All_Possible_Locations
    }

    // FENNIMAL FEATURE PARAMETERS //
    /////////////////////////////////
    this.Available_Fennimal_Heads = [ "C", "D", "E", "F","G","H","I","J", "K", "L"]
    this.Available_Fennimal_Bodies = ["B", "C", "D", "E", "G", "I","J","L", "N"] // ["A", "B", "C", "D", "F","G","H", "I","J","K"] //["A", "B", "C", "D", "E", "F","G","H", "I","J","K","L","M","N"]
    this.Regionfree_Fennimal_Bodies = ["A", "E", "F","H","K","M"] // ["A", "B", "C", "D", "F","G","H", "I","J","K"] //["A", "B", "C", "D", "E", "F","G","H", "I","J","K","L","M","N"]

    this.Heads_Set_A = ["D", "E", "G", "I", "K"]
    this.Heads_Set_B = ["C", "F", "H", "J", "L"]
    this.Heads_Semantic_Pairs = [ ["I", "J"], ["C", "D"], ["K", "L"], ["E", "F"], ["G", "H"]] // [ ["I", "J"], ["D", "C"], ["K", "L"]]//[ ["I", "J"], ["C", "D"], ["K", "L"], ["E", "F"], ["G", "H"]]

    // COLOR SCHEMES
    /////////////////
    this.GrayColorScheme ={
        primary_color: "#AAAAAA",
        secondary_color: "#DDDDDD",
        tertiary_color: "#777777",
        eye_color: "#a7cdfe"
    }

    //HEX Color schemes (used if not tied to location). Call with number of different colorschemes needed to ensure maximum differentials.
    this.CustomColorSchemes = {
        1: [],
        2: [],
        3: [],
        4: [
            {primary_color: "#7f4c4cff",secondary_color: "#c1ababff",tertiary_color: "#790f43ff",eye_color: "#c7dfd9ff"},
            {primary_color: "#4f6d7aff",secondary_color: "#adbabfff",tertiary_color: "#664f7aff",eye_color: "#e0d4eaff"},
            {primary_color: "#b58c48ff",secondary_color: "#cdcf83ff",tertiary_color: "#83801cff",eye_color: "#e8e7c8ff"},
            {primary_color: "#60695bff",secondary_color: "#b8ccacff",tertiary_color: "#7d9b5eff",eye_color: "#b7d2a7ff"}],
        5: [
            {primary_color: "#8b4513ff",secondary_color: "#c6a893ff",tertiary_color: "#b5ded0ff",eye_color: "#add8e6ff"},
            {primary_color: "#6b8e23ff",secondary_color: "#b9c89aff",tertiary_color: "#d6b609ff",eye_color: "#752964ff"},
            {primary_color: "#708090ff",secondary_color: "#bbc2c9ff",tertiary_color: "#ffdab9ff",eye_color: "#8e7618ff"},
            {primary_color: "#b9a24fff",secondary_color: "#dad0adff",tertiary_color: "#b46546ff",eye_color: "#50c878ff"},
            {primary_color: "#c67fd9ff",secondary_color: "#e3cceaff",tertiary_color: "#594866ff",eye_color: "#a9a9a9ff"}],
        6: [
            {primary_color: "#7f4e52ff",secondary_color: "#c1acaeff",tertiary_color: "#c49739ff",eye_color: "#abe9bfff"},
            {primary_color: "#397c7eff",secondary_color: "#80b3b4ff",tertiary_color: "#a6517cff",eye_color: "#8e7618ff"},
            {primary_color: "#b1a940ff",secondary_color: "#d7d3a6ff",tertiary_color: "#69685cff",eye_color: "#752964ff"},
            {primary_color: "#7b6d8dff",secondary_color: "#c0bac7ff",tertiary_color: "#354ca1ff",eye_color: "#d8bd6dff"},
            {primary_color: "#67903bff",secondary_color: "#b7c9a4ff",tertiary_color: "#cca78bff",eye_color: "#add8e6ff"},
            {primary_color: "#e5ba8eff",secondary_color: "#dcd2c9ff",tertiary_color: "#239c9aff",eye_color: "#a9a9a9ff"}]
    }

    //Given the number of colors requested and a string denoting color intensity (vivid, baseline, muted), returns an array of n colors
    this.getColorSchemeArray = function(n,intensity){
        //Denotes the hue value for the color schemes
        let HSL_hue_values = {
            4: [{pri: 0, sec: 353, ter: 331, eye: 331},
                {pri: 37, sec: 44, ter: 55, eye: 55},
                {pri: 100, sec: 100, ter: 90, eye: 90},
                {pri: 200, sec: 200, ter: 255, eye: 255}],
            5: [{pri: 25, sec: 25, ter: 160, eye: 160},
                {pri: 80, sec: 80, ter: 51, eye: 51},
                {pri: 210, sec: 210, ter: 28, eye: 28},
                {pri: 47, sec: 47, ter: 17, eye: 17},
                {pri: 287, sec: 287, ter: 300, eye: 300}],
            6: [{pri: 355, sec: 355, ter: 41, eye: 41},
                {pri: 182, sec: 182, ter: 330, eye: 330},
                {pri: 56, sec: 56, ter: 162, eye: 162},
                {pri: 266, sec: 266, ter: 227, eye: 227},
                {pri: 89, sec: 89, ter: 26, eye: 26},
                {pri: 30, sec: 30, ter: 179, eye: 179}],
        }

        //Retrieving correct sample of hue values
        let Hues = HSL_hue_values[n]

        //HSL-based color schemes. These have 3 versions: vivid, baseline and muted.
        let saturation
        switch(intensity){
            case("vivid"): saturation = 40; break
            case("baseline"): saturation = 25; break
            case("muted"): saturation = 14; break
        }

        //Now we can create the color objects.
        //  Here we use the following lightness values. Primary = 40, secondary = 75, tertiary = 40 (saturation * 1.5), eye color = 90
        let Arr = []
        for(let i =0; i<n;i++){
            Arr.push({
                primary_color: hslToHex(Hues[i].pri, saturation, 40),
                secondary_color: hslToHex(Hues[i].sec, saturation, 75),
                tertiary_color: hslToHex(Hues[i].ter, saturation * 1.5, 40),
                eye_color: hslToHex(Hues[i].eye, saturation, 90)
            })
        }

        return Arr
    }

    //Specialty color-schemes
    this.SpecialColorSchemes = [{
        primary_color: "#1773e0ff",
        secondary_color: "#e8c792ff",
        tertiary_color: "#b31613ff",
        eye_color: "#efef36ff"
    }, {
        primary_color: "#2d7136ff",
        secondary_color: "#f598a3ff",
        tertiary_color: "#ffa600ff",
        eye_color: "#dcfaf8ff"
    }, {
        primary_color: "#dc441cff",
        secondary_color: "#a9d5dfff",
        tertiary_color: "#9922a2ff",
        eye_color: "#dcfae4ff"
    }]


    // WORLD INFORMATION
    //////////////////////
    this.LocationTransitionData = {
        //This object holds all the location transitions.
        //  Each location (start, intersection, terminal) has the following properties
        //      zoomable: a bool indicating whether this area can be crossed by walking into it. Set to true for start and intersection, false for the terminal points.
        //          If set to true, makes the forward / backwards arrows dissapear.
        //      may_contain_fennimals: a bool indicated whether or not Fennimals can appear in this region. If set to yes, makes the item bar appear on region entry.
        //  AdjacentRegions: an array of objects, each indicating a potential successor to this region.
        //      Each object is keyed with its associated zoomDepth. If there are one or more arrows to-be-displayed at this depth, then they are stored in an array.
        //          Each array contains the following properties:
        //              arrow_ID: string referring to the SVG object.
        //              target_region: when the arrow is clicked, this is the region to transition to.
        //              target_zoom_depth: the zoom depth in which the target region is initalialized at
        intersection_North: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "North",
            sky: "sky_North_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Igloo",
                },{
                    arrow_id: "arrow_intersection_middle",
                    target_region: "location_Pineforest",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Iceberg",
                },]
        },
        location_Igloo : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Igloo",
            region: "North",
            sky: "sky_North_3x",
            AdjacentRegions: [{
                arrow_id: "arrow_return_to_previous_region_right",
                target_region: "intersection_North",
            }]
        },
        location_Pineforest : {
            zoomable: false,
            may_contain_Fennimals: true,
            region: "North",
            location_name: "Pineforest",
            sky: "sky_North_3x",
            AdjacentRegions: [{
                arrow_id: "arrow_back",
                target_region: "intersection_North",
            }]
        },
        location_Iceberg : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Iceberg",
            region: "North",
            sky: "sky_North_3x",
            AdjacentRegions: [{
                arrow_id: "arrow_return_to_previous_region_left",
                target_region: "intersection_North",
            }]
        },

        intersection_Flowerfields: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Flowerfields",
            sky: "sky_Flowerfields_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Windmill",
                },{
                    arrow_id: "arrow_intersection_middle",
                    target_region: "location_Orchard",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Garden",
                },]

        },
        location_Windmill : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Windmill",
            region: "Flowerfields",
            sky: "sky_Flowerfields_2x",
            AdjacentRegions: [{
                arrow_id: "arrow_return_to_previous_region_right",
                target_region: "intersection_Flowerfields",
            }]
        },
        location_Orchard : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Orchard",
            region: "Flowerfields",
            sky: "sky_Flowerfields_2x",
            AdjacentRegions: [{
                arrow_id: "arrow_back",
                target_region: "intersection_Flowerfields",
            }]
        },
        location_Garden : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Garden",
            region: "Flowerfields",
            sky: "sky_Flowerfields_2x",
            AdjacentRegions: [{
                arrow_id: "arrow_return_to_previous_region_left",
                target_region: "intersection_Flowerfields",
            }]
        },

        intersection_Mountains: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Mountains",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Waterfall",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Mine",
                },{
                    arrow_id: "arrow_intersection_middle",
                    target_region: "location_Cliff",
                },]

        },
        location_Waterfall : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Waterfall",
            region: "Mountains",
            AdjacentRegions: [{
                arrow_id: "arrow_return_to_previous_region_right",
                target_region: "intersection_Mountains",
            }]

        },
        location_Cliff : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Cliff",
            region: "Mountains",
            AdjacentRegions:  [{
                arrow_id: "arrow_back",
                target_region: "intersection_Mountains",
            }]
        },
        location_Mine : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Mine",
            region: "Mountains",
            AdjacentRegions:  [{
                arrow_id: "arrow_return_to_previous_region_left",
                target_region: "intersection_Mountains",
            }]
        },

        intersection_Village: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Village",
            sky: "sky_Village_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Manor",
                },{
                    arrow_id: "arrow_intersection_middle",
                    target_region: "location_Church",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Farm",
                },]
        },
        location_Manor : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Manor",
            region: "Village",
            sky: "sky_Village_2x",
            AdjacentRegions:  [{
                arrow_id: "arrow_return_to_previous_region_right",
                target_region: "intersection_Village",
            }]
        },
        location_Church: {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Church",
            region: "Village",
            sky: "sky_Village_2x",
            AdjacentRegions:  [{
                arrow_id: "arrow_back",
                target_region: "intersection_Village",
            }]

        },
        location_Farm : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Farm",
            region: "Village",
            sky: "sky_Village_2x",
            AdjacentRegions:  [{
                arrow_id: "arrow_return_to_previous_region_left",
                target_region: "intersection_Village",
            }]
        },


        intersection_Swamp: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Swamp",
            sky: "sky_Swamp_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Marsh",
                },{
                    arrow_id: "arrow_intersection_middle",
                    target_region: "location_Creek",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Cottage",
                },]
        },
        location_Marsh: {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Marsh",
            region: "Swamp",
            sky: "sky_Swamp_2x",
            AdjacentRegions:  [{
                arrow_id: "arrow_return_to_previous_region_right",
                target_region: "intersection_Swamp",
            }]

        },
        location_Creek : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Creek",
            region: "Swamp",
            sky: "sky_Swamp_2x",
            AdjacentRegions: [{
                arrow_id: "arrow_back",
                target_region: "intersection_Swamp",
            }]
        },
        location_Cottage : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Cottage",
            region: "Swamp",
            sky: "sky_Swamp_2x",
            AdjacentRegions: [{
                arrow_id: "arrow_return_to_previous_region_left",
                target_region: "intersection_Swamp",
            }]
        },

        intersection_Desert: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Desert",
            sky: "sky_Desert_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Camp",
                }, {
                    arrow_id: "arrow_intersection_middle",
                    target_region: "location_Oasis",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Cactus",
                },]
        },
        location_Camp : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Camp",
            region: "Desert",
            sky: "sky_Desert_2x",
            AdjacentRegions:  [{
                arrow_id: "arrow_return_to_previous_region_right",
                target_region: "intersection_Desert",
            }]
        },
        location_Oasis: {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Oasis",
            region: "Desert",
            sky: "sky_Desert_2x",
            AdjacentRegions:  [{
                arrow_id: "arrow_back",
                target_region: "intersection_Desert",
            }]
        },
        location_Cactus : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Cactus",
            region: "Desert",
            sky: "sky_Desert_2x",
            AdjacentRegions:  [{
                arrow_id: "arrow_return_to_previous_region_left",
                target_region: "intersection_Desert",
            }]
        },


        intersection_Beach: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Beach",
            sky: "sky_Beach_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Dunes",
                }, {
                    arrow_id: "arrow_intersection_middle",
                    target_region: "location_Beachbar",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Port",
                },]
        },
        location_Dunes: {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Dunes",
            region: "Beach",
            sky: "sky_Beach_3x",
            AdjacentRegions:  [{
                arrow_id: "arrow_return_to_previous_region_right",
                target_region: "intersection_Beach",
            }]
        },
        location_Beachbar: {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Beachbar",
            region: "Beach",
            sky: "sky_Beach_3x",
            AdjacentRegions:  [{
                arrow_id: "arrow_back",
                target_region: "intersection_Beach",
            }]
        },
        location_Port : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Port",
            region: "Beach",
            sky: "sky_Beach_3x",
            AdjacentRegions:  [{
                arrow_id: "arrow_return_to_previous_region_left",
                target_region: "intersection_Beach",
            }]
        },

        intersection_Jungle: {
            zoomable: true,
            may_contain_Fennimals: false,
            region: "Jungle",
            sky: "sky_Jungle_1x",
            AdjacentRegions: [
                {
                    arrow_id: "arrow_return_to_previous_region_bottom",
                    target_region: "map",
                }, {
                    arrow_id: "arrow_intersection_left",
                    target_region: "location_Lake",
                }, {
                    arrow_id: "arrow_intersection_middle",
                    target_region: "location_Bush",
                },{
                    arrow_id: "arrow_intersection_right",
                    target_region: "location_Jungleforest",
                },]
        },
        location_Lake: {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Lake",
            region: "Jungle",
            sky: "sky_Jungle_3x",
            AdjacentRegions:  [{
                arrow_id: "arrow_return_to_previous_region_right",
                target_region: "intersection_Jungle",
            }]
        },
        location_Bush: {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Bush",
            region: "Jungle",
            sky: "sky_Jungle_3x",
            AdjacentRegions:  [{
                arrow_id: "arrow_back",
                target_region: "intersection_Jungle",
            }]
        },
        location_Jungleforest : {
            zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Jungleforest",
            region: "Jungle",
            sky: "sky_Jungle_3x",
            AdjacentRegions: [{
                arrow_id: "arrow_return_to_previous_region_left",
                target_region: "intersection_Jungle",
            }]
        },

        location_Neutral : { zoomable: false,
            may_contain_Fennimals: true,
            location_name: "Neutral",
            region: "Neutral",
            sky: "sky_basic",
            AdjacentRegions: []
        },

        //In addition, there are a number of general parameters.
        //These points allow for a non-linear zoom. Should contain 10 points, starting at 1 and ending at 10

        //Time between steps before the forward / backwards arrows appear. Make sure that this matches with the animation time in the css
        zoom_arrow_reappear_speed : 1000,

        // The default sky
        default_sky: "sky_basic"
    }

    //NB: Home should always be the last element.
    this.RegionData = {
        North : {
            Locations : ["Pineforest", "Iceberg", "Igloo"],
            Location_selection_order: {
                1: ["Igloo"],
                2: ["Iceberg", "Igloo"],
                3: ["Pineforest", "Iceberg", "Igloo"]
            },
            lighter_color: "#a2b2fc",
            color: "#0020ac",
            darker_color: "#001987",
            prefix: "Arctic",
            hint: "can be found in cold places...",
            Fennimal_location_colors:{
                primary_color: "#526785",
                secondary_color: "#b0c9d4",
                tertiary_color: "#1a46b8",
                eye_color: "#d2dfff",
            },
            contrast_color: "#edc25e",
            preferredBodyType: "B",
        },
        Jungle: {
            Locations : ["Bush", "Jungleforest", "Lake"],
            Location_selection_order: {
                1: ["Bush"],
                2: ["Jungleforest", "Lake"],
                3: ["Bush", "Jungleforest", "Lake"]
            },
            lighter_color: "#b5e092",
            color: "#588b1e",
            darker_color: "#235412",
            prefix: "Jungle",
            hint: "lives in tropical forests...",
            Fennimal_location_colors:{
                primary_color: "#566e44",
                secondary_color: "#cfedbe",
                tertiary_color: "#78ab09",
                eye_color: "#dcff8f",
            },
            contrast_color: "#ac7dd7ff",
            preferredBodyType: "N",
        },
        Desert: {
            Locations : ["Oasis", "Cactus", "Camp"],
            Location_selection_order: {
                1: ["Oasis"],
                2: ["Cactus", "Camp"],
                3: ["Oasis", "Cactus", "Camp"]
            },
            lighter_color: "#f5f55b",
            color: "#c7c602", //#fffe03
            darker_color: "#757500",
            prefix: "Desert",
            hint: "likes the extreme heat...",
            Fennimal_location_colors:{
                primary_color: "#969239",
                secondary_color: "#d1caa9",
                tertiary_color: "#d2d911",
                eye_color: "#f7fe25",
            },
            contrast_color: "#47395b",
            preferredBodyType: "I",
        },
        Mountains: {
            Locations : ["Waterfall", "Mine", "Cliff"],
            Location_selection_order: {
                1: ["Cliff"],
                2: ["Waterfall", "Mine"],
                3: ["Cliff", "Mine", "Waterfall"]
            },
            lighter_color: "#d6bba9",
            color: "#502d16",
            darker_color: "#26150a",
            prefix: "Mountain",
            hint: "can be found in high places...",
            Fennimal_location_colors:{
                primary_color: "#953f05", //"#ded3d6",
                secondary_color: "#b09a90",//"#dedcdc",
                tertiary_color: "#502d16",
                eye_color: "#47230a",
            },
            contrast_color: "#9fd8ee",
            preferredBodyType: "J",
        },
        Beach: {
            Locations : ["Beachbar", "Port", "Dunes"],
            Location_selection_order: {
                1: ["Port"],
                2: ["Port", "Dunes"],
                3: ["Beachbar", "Port", "Dunes"]
            },
            lighter_color: "#ffd0b0",
            color: "#ffe6d5",
            darker_color: "#615c58",
            prefix: "Beach",
            hint: "lives near the shore...",
            Fennimal_location_colors:{
                primary_color: "#f5a149",//"#665244",
                secondary_color: "#ffe6d5",//"#dedcdc",//"#f7cdbc",
                tertiary_color: "#ffd0b0",//"#f2e7df",
                eye_color: "#f6e8da",
            },
            contrast_color: "#c30b69",
            preferredBodyType: "D",
        },
        Flowerfields: {
            Locations : ["Windmill", "Garden", "Orchard"],
            Location_selection_order: {
                1: ["Windmill", ],
                2: ["Windmill", "Garden"],
                3: ["Orchard", "Garden", "Windmill"]
            },
            lighter_color: "#ffcffa",
            color: "#f472e6",
            darker_color: "#783771",
            prefix: "Flowerland",
            hint: "likes to live near flowers...",
            Fennimal_location_colors:{
                primary_color:  "#4d2f49",
                secondary_color: "#d3bfd9",
                tertiary_color: "#890fbd",
                eye_color: "#e8b3ff",
            },
            contrast_color: "#799742",
            preferredBodyType: "E",

        },
        Village: {
            Locations : ["Church", "Farm", "Manor"],
            Location_selection_order: {
                1: ["Church"],
                2: ["Farm", "Manor"],
                3: ["Church", "Farm", "Manor"],
            },
            lighter_color: "#fcb1b1",
            color: "#f20000",
            darker_color: "#7d0101",
            prefix: "Domestic",
            hint: "likes to live near people...",
            Fennimal_location_colors:{
                primary_color: "#734b53",
                secondary_color: "#ccb1b8",
                tertiary_color: "#d10f0f",
                eye_color: "#ffbdbd",
            },
            contrast_color: "#80eeca",
            preferredBodyType: "L",

        },
        Swamp: {
            Locations : ["Marsh", "Cottage", "Creek"],
            Location_selection_order: {
                1: ["Marsh"],
                2: ["Marsh", "Cottage"],
                3: ["Marsh", "Cottage", "Creek"]
            },
            lighter_color: "#adffef",
            color: "#00fdcc",
            darker_color: "#025e4c",
            prefix: "Wetland",
            hint: "lives in the wetlands...",
            Fennimal_location_colors:{
                primary_color: "#5b7878",
                secondary_color: "#c2f0ea",
                tertiary_color:  "#00b3b3",
                eye_color: "#8affff",
            },
            contrast_color: "#cb156b",
            preferredBodyType: "C",
        },
        Home: {
            color: "#cccccc"
        },
        Neutral : {
            Locations : ["Neutral"],
            lighter_color: "#CCCCCC",
            color: "#AAAAAA",
            darker_color: "#333333",
            prefix: "Fog-covered ",
            Fennimal_location_colors:{
                primary_color: "#AAAAAA",
                secondary_color: "#DDDDDD",
                tertiary_color: "#777777",
                eye_color: "#CCCCCC",

            },
            contrast_color: "#444444"
        }
    }
    this.region_Names = Object.getOwnPropertyNames(this.RegionData)

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

    //Given a location name, returns its associated region. If no region contains this location, returns false
    this.get_region_of_location = function(location){
        let RegionNames = Object.getOwnPropertyNames(this.RegionData)
        for(let i = 0; i<RegionNames.length; i++){
            if(this.RegionData[RegionNames[i]].Locations.includes(location)){
                return(RegionNames[i])
            }
        }
        return(false)
    }

    //ITEM PARAMETERS
    /////////////////
    this.Available_items = ["ball", "duck", "car", "trumpet", "kite"] // ["car","spinner","boomerang","balloon","shovel","trumpet"]

    this.ItemBackgroundColors = {
        1: ["#bc5090"],
        2: ["#003f5c","#ffa600"],
        3: ["#003f5c","#bc5090","#ffa600"],
        4: ["#003f5c","#7a5195","#ef5675","#ffa600"],
        5: ["#003f5c","#58508d","#bc5090","#ff6361","#ffa600"],
        6: ["#003f5c","#444e86","#955196","#dd5182","#ff6e54","#ffa600"],
    }

    //Denotes the relative x-positions in which (multiple) items should be displayed on the item bar. Keyed by the number of items
    this.ItemRelativeXPositions = {
        1: [.5],
        2: [.333,.666],
        3: [.25,.50,.75],
        4: [.20,.40,.60,.80],
        5: [.167, .333, .50, .667, .833 ],
        6: [1/12, 3/12, 5/12, 7/12, 9/12, 11/12 ],
    }

    //Denotes the X and Y positions for all items. First key denotes the total number of items, next keys indicate the coords on-screen
    this.ItemCoords = {
        flashlight: {x: 0, y: 0},
        1: {
            0: {x: 252, y: 255},
        },
        2: {
            1: {x: 140, y: 203},
            3: {x: 370, y: 203},
        },
        3: {
            0: {x: 140, y: 203},
            1: {x: 252, y: 255},
            2: {x: 370, y: 203},
        },
        4: {
            0: {x: 126, y: 132},
            1: {x: 140, y: 203},
            2: {x: 370, y: 203},
            3: {x: 389, y: 132},
        },
        5: {
            0: {x: 126, y: 132},
            1: {x: 140, y: 203},
            2: {x: 252, y: 255},
            3: {x: 370, y: 203},
            4: {x: 389, y: 132},
        },
        6: {
            0: {x: 126, y: 132},
            1: {x: 140, y: 203},
            2: {x: 215, y: 256},
            3: {x: 300, y: 256},
            4: {x: 370, y: 203},
            5: {x: 389, y: 132},
        }
    }

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
        Used_Unique_Fennimal_Names.push(newname)
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

    // UNIQUE NAMES (if names are not based on the Fennimal's features)
    let Unique_Fennimal_Names = ["Zylo", "Tarka", "Jorren", "Farlin", "Nerina", "Rylor", "Elvan", "Grana", "Dorril", "Lera","Ardy" ] // "Cyrin", "Ardelis"
    let Used_Unique_Fennimal_Names = []
    this.draw_unique_name = function(){
        let newname = Unique_Fennimal_Names.shift()
        Used_Unique_Fennimal_Names.push(newname)
        return(newname)
    }
    this.shuffle_unique_names = function(){
        shuffleArray(Unique_Fennimal_Names)
    }
    this.get_used_unique_names = function(){
        return(JSON.parse(JSON.stringify(Used_Unique_Fennimal_Names)))
    }

    //The bonus earned per star. If set to false, then no bonus is mentioned throughout the instructions
    this.BonusEarnedPerStar = {
        currency_symbol: "$",
        bonus_per_star: "0.20"
    }

    this.flashlight_radius = 50
    this.flashlight_target_sensitivity = 50

    this.OutcomesToPoints = {
        heart: 1,
        smile: 1,
        neutral: 0,
        unknown: 0,
        frown: -1,
        bites: -2,
        correct: 1,
        incorrect: 0
    }

    //Minimum distance to the target before a dropped item is registered as given
    this.minimum_drop_target_distance = 35

}

let Param = new ParameterObject()

