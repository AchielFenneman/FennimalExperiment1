
//Defining the world state object here
WorldStateObject = function () {
    let that = this
    //This keeps track of which Fennimals are on the map, which locations exist, which have been searched already etc.
    //Before use, call to update the list of available regions and locations.

    // State will be keyed on location: State[location] yields an object containing {state, region}
    let State

    //CREATION FUNCTIONS
    //////////////////////

    this.populate_map_with_array_of_Fennimals = function (Arr, require_search_before_entering) {
        console.log(Arr)
        for (let i = 0; i < Arr.length; i++) {
            State[Arr[i].location] = Arr[i]
            if (require_search_before_entering) {
                State[Arr[i].location].search_status = "unsearched"
            } else {
                State[Arr[i].location].search_status = "searched_Fennimal_not_visited"
            }
        }
    }

    this.add_Fennimal_to_map = function (Fennimal) {
        State[Fennimal.location] = Fennimal
        State[Fennimal.location].search_status = "unsearched"
    }

    this.rebuild_state_from_available_locations = function (Array_of_visited_locations_and_regions) {
        State = {}
        for (let i = 0; i < Array_of_visited_locations_and_regions.length; i++) {
            State[Array_of_visited_locations_and_regions[i][0]] = {
                state: "empty_unsearched",
                region: Array_of_visited_locations_and_regions[i][1]
            }
        }
    }

    this.clear_all_locations = function (require_search_before_entering) {
        for (let key in State) {
            if (require_search_before_entering) {
                State[key] = {
                    search_status: "unsearched"
                }
            } else {
                State[key] = {
                    search_status: "searched_empty"
                }
            }
        }

    }

    // MAP SEARCH FUNCTIONS
    ////////////////////////

    //Returns true if the location is search-able, false if not
    this.check_if_location_can_be_searched = function (location_name) {
        if (State.hasOwnProperty(location_name)) {
            //If this location's state holds an object, then return this object (this is the Fennimal).
            if (typeof State[location_name].state === "object") {
                return (true)
            }

            // Same if this location's state is a string. However, in this case we want to make sure that any unsearched location is now updated to be searched
            if (typeof State[location_name].state === "string") {
                if (State[location_name].state === "empty_searched") {
                    return (true)
                }

                if (State[location_name].state === "empty_unsearched") {
                    return (true)
                }


            }

        } else {
            //console.error("Attempting to check searability of location not listed in Worldstate: " + location_name + ". Returning false")
            return (false)
        }
    }

    this.check_if_location_has_already_been_searched = function (location_name) {
        if (State.hasOwnProperty(location_name)) {
            if (State[location_name].state === "empty_searched") {
                return (true)
            }

        } else {
            console.error("Attempting to check location not listed in Worldstate: " + location_name + ". Returning false")

        }
        return (false)
    }

    //Returns whether the location has been searched. If searched, returns whether the location empty, has an unvisited Fennimal or a visited Fennimal.
    this.get_search_status_of_location = function (location_name) {
        let search_status = false

        if (typeof State[location_name] === "object") {
            if (typeof State[location_name].search_status === "undefined") {
                return false
            } else {
                return State[location_name].search_status
            }
        }

        return (search_status)

    }

    //If a Fennimal is present at this location, return A REFERENCE TO the Fennimal Object. Else, returns a string "empty"
    this.perform_search_at_location = function (location_name) {
        if (State.hasOwnProperty(location_name)) {
            //If the object in this location has an property "name", then it is a Fennimal. Else, its an empty location
            if (typeof State[location_name].name === "undefined") {
                State[location_name].search_status = "searched_empty"
                return ("empty")
            } else {
                // Return here depends on whether the Fennimal has already been visited or not
                let has_been_visited
                if (typeof State[location_name].visited === undefined) {
                    has_been_visited = false
                } else {
                    if (State[location_name].visited) {
                        has_been_visited = true
                    } else {
                        has_been_visited = false
                    }
                }

                if (has_been_visited) {
                    State[location_name].search_status = "searched_Fennimal_visited"
                } else {
                    State[location_name].search_status = "searched_Fennimal_not_visited"
                }

                return (State[location_name].search_status)
            }


        } else {
            console.error("Attempting to search location not included in Worldstate: " + location_name + ". Returning false")
            return (false)
        }

    }

    // FENNIMAL INTERACTION FUNCTIONS
    /////////////////////////////////
    //NB: THIS DOES NOT PASS BY VALUE! THIS IS BY DESIGN.
    this.get_reference_to_Fennimal_object_at_location = function (location) {
        if (typeof State[location] !== "undefined") {
            if (typeof State[location].name !== "undefined") {
                return State[location]
            } else {
                return false
            }
        } else {
            return false
        }
    }

    ///GENERAL RETRIEVAL FUNCTIONS
    //////////////////////////////

    this.get_location_states_in_array = function () {
        let Arr = []
        for (let key in State) {
            let NewObj = JSON.parse(JSON.stringify(State[key]))
            NewObj.location = key
            Arr.push(NewObj)
        }
        return (Arr)
    }

    this.get_location_states_as_object = function () {
        return (State)
    }

    //Get an array of all Fennimals currently present on the map (deep copy!).
    this.get_array_of_Fennimals_on_map = function () {
        let Arr = []
        for (let key in State) {
            if (typeof State[key] === 'object') {
                Arr.push(JSON.parse(JSON.stringify(State[key])))
            }
        }

        return (Arr)

    }

    //EXPERIMENT FLOW FUNCTIONS
    //////////////////////////////

    //This keeps track of which Fennimals have been encountered already during the experiment.
    //  This facilitates flow by not having to re-introduce Fennimals at  the start of their interactions
    //  Stores by name (assumes that each name is unique, which is should be...)
    let Fennimals_previously_encountered_during_experiment = []
    this.Fennimal_encounter_finshed = function(name){
        Fennimals_previously_encountered_during_experiment.push(name)
        Fennimals_previously_encountered_during_experiment = [...new Set(Fennimals_previously_encountered_during_experiment)]
    }
    this.get_array_of_Fennimals_already_encounted_during_experiment = function(){
        return(Fennimals_previously_encountered_during_experiment)
    }

    //PARTNER FUNCTIONS
    ///////////////////
    let PlayerIcon_Settings = {
        type: 'male',
        scale_factor: 2,


    }
    let PartnerIcon_Settings = {
        type: "female",
        scale_factor:2,
        confined_to_center: false,
        visiblity: true,
        custom_color_scheme : {
            hair:  "gold",
            skin: "red",
            pants: "red",
            lapel: "gold",
            shirt: "lightblue",
            jacket: "blue",
            shoes: "black",
        },
        name: "Testany"
    }
    let PartnerBeliefs_Boxes = {}

    this.get_player_icon_settings = function(){
        return(JSON.parse(JSON.stringify(PlayerIcon_Settings)))
    }
    this.change_player_icon_settings = function(setting, newvalue){
        if(setting === "type"){
            PlayerIcon_Settings.type = newvalue;
            return true
        }

        let colorsetting
        switch(setting){
            case("skin_color"): colorsetting = "skin"; break
            case("hair_color"): colorsetting = "hair"; break
            default: colorsetting = setting; break
        }

        if(typeof PlayerIcon_Settings.custom_color_scheme === "undefined" ){
            PlayerIcon_Settings.custom_color_scheme = {}
        }
        PlayerIcon_Settings.custom_color_scheme[colorsetting] = newvalue


    }
    this.get_partner_icon_settings = function(){
        return(JSON.parse(JSON.stringify(PartnerIcon_Settings)))
    }
    this.change_partner_icon_settings = function(setting, newvalue){
        if(setting === "type"){
            PartnerIcon_Settings.type = newvalue;
            switch(newvalue){
                case("male"): PartnerIcon_Settings.name = shuffleArray(["Liam", "Matt", "Oliver", "James", "John"])[0]; break
                case("female"): PartnerIcon_Settings.name = shuffleArray(["Mary", "Jenn", "Linda", "Susan", "Sarah"])[0]; break
            }
            return true
        }

        let colorsetting
        switch(setting){
            case("skin_color"): colorsetting = "skin"; break
            case("hair_color"): colorsetting = "hair"; break
            default: colorsetting = setting; break
        }

        if(typeof PartnerIcon_Settings.custom_color_scheme === "undefined" ){
            PartnerIcon_Settings.custom_color_scheme = {}
        }
        PartnerIcon_Settings.custom_color_scheme[colorsetting] = newvalue

    }

    //Can be active (following player), passive (confined to center) or null (absent entirely).
    // Changes only go into effect after the map is reset!
    let current_partner_role = null
    this.change_partner_role_behavior = function(new_role){
        current_partner_role = new_role
    }
    this.get_current_partner_role = function(){
        return current_partner_role
    }

    this.change_partner_belief_in_box_contents = function(box, contents){
        PartnerBeliefs_Boxes[box] = contents
        console.log(PartnerBeliefs_Boxes)
    }
    this.get_partner_belief_in_box_contents = function(box){
        if(typeof PartnerBeliefs_Boxes[box] === "undefined"){
            return undefined
        }else{
            return PartnerBeliefs_Boxes[box]
        }
    }

    //Returns an SVG element. Person can be "player" or "partner", direction can be front,back,left,right
    this.get_person_icon = function(person, direction){
        let IconSettings
        if(person === "player"){
            IconSettings = PlayerIcon_Settings
        }
        if(person === "partner"){
            IconSettings = PartnerIcon_Settings
        }

        let Elem = create_SVG_group(false,false,false,false)
        let Contents = document.getElementById("icon_player_" + IconSettings.type + "_" + direction).cloneNode(true)
        Contents.id = ""
        Contents.style.display = "inherit"
        Elem.style.display = "inherit"
        Elem.appendChild(Contents);

        //Setting optional scale
        if(Object.hasOwn(IconSettings, "scale_factor")){
            if(typeof IconSettings.scale_factor === "number"){
                Elem.style.transform = "scale(" + IconSettings.scale_factor + ")"
            }
        }

        //Setting optional colorscheme
        if(Object.hasOwn(IconSettings, "custom_color_scheme")){
            if(IconSettings.custom_color_scheme !== false){
                for(let key in IconSettings.custom_color_scheme){
                    let SubElemArr = Elem.getElementsByClassName(key)
                    if(SubElemArr.length > 0){
                        for(let i = 0; i < SubElemArr.length; i++){
                            SubElemArr[i].style.fill = IconSettings.custom_color_scheme[key]
                        }
                    }
                }
            }
        }

        return Elem
    }



    //BOX FUNCTIONS
    ////////////////
    let ToyBoxes = {}

    //Checks the contents of a box. If this box has not been encountered yet, returns false.
    this.get_toybox_contents = function(boxtype){
        if(typeof ToyBoxes[boxtype] === "undefined"){
            return false
        }else{
            return(ToyBoxes[boxtype])
        }
    }
    //Changes the contents of a box. If this box has not been encountered, it will create a new entry
    this.change_toybox_contents = function(boxtype, toy){
        ToyBoxes[boxtype] = toy

    }



}