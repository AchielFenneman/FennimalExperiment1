
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
        // Accept common aliases so stimulus typos don't silently hide the partner.
        if (new_role === "present" || new_role === true) new_role = "active";
        if (new_role === "absent" || new_role === false) new_role = null;
        current_partner_role = new_role
    }
    this.get_current_partner_role = function(){
        return current_partner_role
    }

    this.change_partner_belief_in_box_contents = function(box, contents){
        PartnerBeliefs_Boxes[box] = contents
    }
    this.get_partner_belief_in_box_contents = function(box){
        if(typeof PartnerBeliefs_Boxes[box] === "undefined"){
            return undefined
        }else{
            return PartnerBeliefs_Boxes[box]
        }
    }

    //Returns an SVG element. Person can be "player" or "partner", direction can be front,back,left,right
    this.get_person_icon = function(person, direction, applied_scale_factor){
        let IconSettings
        if(person === "player"){
            IconSettings = PlayerIcon_Settings
        }
        if(person === "partner"){
            IconSettings = PartnerIcon_Settings
        }

        let Elem = create_SVG_group(0,0,false,false)
        let Contents = document.getElementById("icon_player_" + IconSettings.type + "_" + direction).cloneNode(true)
        Contents.id = ""
        Contents.style.display = "inherit"
        Elem.style.display = "inherit"
        Elem.appendChild(Contents);

        //Setting optional scale
        if(applied_scale_factor !== "undefined"){
            if(typeof applied_scale_factor === "number"){
                Elem.style.transform = "scale(" + applied_scale_factor + ")"
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
    // Chronological contents history per box: [{ toy, changed_at_ms }]
    let ToyBoxHistory = {}

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
        if (typeof ToyBoxHistory[boxtype] === "undefined") {
            ToyBoxHistory[boxtype] = []
        }
        ToyBoxHistory[boxtype].push({
            toy: toy,
            changed_at_ms: Date.now()
        })
    }

    // Clears current contents (box becomes empty). Records the clear in history.
    this.clear_toybox_contents = function(boxtype){
        delete ToyBoxes[boxtype]
        if (typeof ToyBoxHistory[boxtype] === "undefined") {
            ToyBoxHistory[boxtype] = []
        }
        ToyBoxHistory[boxtype].push({
            toy: null,
            changed_at_ms: Date.now()
        })
    }

    // Full chronological history for a box (empty array if never filled).
    this.get_toybox_contents_history = function(boxtype){
        if (typeof ToyBoxHistory[boxtype] === "undefined") {
            return []
        }
        return JSON.parse(JSON.stringify(ToyBoxHistory[boxtype]))
    }

    // Previous contents before the current one (false if fewer than 2 entries).
    this.get_previous_toybox_contents = function(boxtype){
        let history = ToyBoxHistory[boxtype]
        if (!history || history.length < 2) {
            return false
        }
        return history[history.length - 2].toy
    }

    // BOX DECORATIONS (all-or-nothing flag per box; default undecorated)
    /////////////////////////////////////////////////////////////////
    let ToyBoxDecorations = {}

    this.get_toybox_is_decorated = function(boxtype){
        return ToyBoxDecorations[boxtype] === true
    }

    this.change_toybox_is_decorated = function(boxtype, is_decorated){
        ToyBoxDecorations[boxtype] = is_decorated === true
    }

    // LOST AND FOUND
    ///////////////////////
    const w = GenParam.SVG_width, h = GenParam.SVG_height
    const FreeItemPositionsInLostAndFound = [
        //Middle shelf (not in front of sign)
        {x: 0.23 * w, y: 0.5*h},
        {x: 0.45 * w, y: 0.5*h},

        //Bottom shelf
        {x: 0.23 * w, y: 0.83*h},
        {x: 0.45 * w, y: 0.83*h},
        {x: 0.70 * w, y: 0.83*h},
        {x: 0.9 * w, y: 0.83*h},

        //Top shelf
        {x: 0.33 * w, y: 0.2*h},
        {x: 0.8 * w, y: 0.2*h},

        //Middle, in front of sign
        {x: 0.9 * w, y: 0.5*h},
        {x: 0.70 * w, y: 0.5*h},

    ]

    let ItemsInLostAndFound = {}, ItemsInLostAndFoundArr = []
    this.set_items_in_lost_and_found = function(arr){
        //Assumes an array of objects, with each object having the following properties:\
        //  name:
        //  type
        //  SVG_name
        for(let i = 0;i < arr.length; i++){
            ItemsInLostAndFound[arr[i].name] = arr[i]
        }
    }
    this.add_item_to_lost_and_found = function(Item){
        //Assumes the following properties
        //  name:
        //  type
        //  SVG_name
        ItemsInLostAndFoundArr = ItemsInLostAndFoundArr.filter(function( obj ) {
            return obj.name !== Item.name;
        });

        ItemsInLostAndFound[Item.name] = Item
        ItemsInLostAndFoundArr.push(Item)
    }
    this.remove_item_from_lost_and_found = function(item_name){
        delete ItemsInLostAndFound[item_name];
        ItemsInLostAndFoundArr = ItemsInLostAndFoundArr.filter(function( obj ) {
            return obj.name !== item_name;
        });
    }
    this.shuffle_lost_and_found_order_and_assign_positions = function(){
        const RemainingPositions = JSON.parse(JSON.stringify(FreeItemPositionsInLostAndFound))
        ItemsInLostAndFoundArr = shuffleArray(ItemsInLostAndFoundArr)
        for(let i = 0; i < ItemsInLostAndFoundArr.length; i++){
            let name = ItemsInLostAndFoundArr[i].name
            let pos = RemainingPositions.shift()

            ItemsInLostAndFoundArr[i].shelf_position = pos
            ItemsInLostAndFound[name].shelf_position = pos
        }

    }
    this.get_all_items_in_lost_and_found_array = function(){
        return(JSON.parse(JSON.stringify(ItemsInLostAndFoundArr)))
    }

    // REPLACEMENT TOYS
    ///////////////////////
    const FreeItemPositionsToyRoom = shuffleArray([
        //Top
        {x: 0.27 * w, y: 0.2*h},
        {x: 0.5 * w, y: 0.2*h},
        {x: 0.73 * w, y: 0.2*h},

        //Middle
        {x: 0.27 * w, y: 0.5*h},
        {x: 0.5 * w, y: 0.5*h},
        {x: 0.73 * w, y: 0.5*h},

        //Bottom
        {x: 0.27 * w, y: 0.85*h},
        {x: 0.5 * w, y: 0.85*h},
        {x: 0.73 * w, y: 0.85*h},

    ])
    let ItemsInToyRoom = {}, ItemsInToyRoomArr = []
    this.add_item_to_toy_room = function(Item){
        ItemsInToyRoomArr = ItemsInToyRoomArr.filter(function( obj ) {
            return obj.name !== Item.name;
        });

        ItemsInToyRoom[Item.name] = Item
        ItemsInToyRoomArr.push(Item)
    }
    this.shuffle_toy_room_order_and_assign_positions = function(){
        const RemainingPositions = JSON.parse(JSON.stringify(FreeItemPositionsToyRoom))
        for(let i = 0; i < ItemsInToyRoomArr.length; i++){
            let name = ItemsInToyRoomArr[i].name
            let pos = RemainingPositions.shift()

            ItemsInToyRoomArr[i].shelf_position = pos
            ItemsInToyRoom[name].shelf_position = pos
        }
    }
    this.remove_item_from_toy_room= function(item_name){
        delete ItemsInToyRoom[item_name];
        ItemsInToyRoomArr = ItemsInToyRoomArr.filter(function( obj ) {
            return obj.name !== item_name;
        });
    }
    this.get_all_items_in_toy_room_array = function(){
        return(JSON.parse(JSON.stringify(ItemsInToyRoomArr)))
    }




}