//CAll after the stimuli have been defined. This removes all bodies, heads and regions not used during the experiment.
SVGREDUCER = function (Stimuli) {

    //Finds and deletes all regions NOT visited during the experiment
    function remove_unused_regions() {
        let all_regions = []
        for (let key in GenParam.RegionData) {
            if (key !== "Home") {
                all_regions.push(key)
            }
        }

        let used_regions = Stimuli.get_all_x_encountered_during_experiment("region")
        let unused_regions = all_regions.filter(x => !used_regions.includes(x))

        //Now we can start removing elements from the SVG
        for (let i = 0; i < unused_regions.length; i++) {
            let region = unused_regions[i]

            //Closing the audio file
            AudioCont.close_audio_for_unused_region(region)

            //Removing the top and bottom layers, as well as the opacity mask and the sky layer
            document.getElementById("map_layer_" + region + "_bottom").remove()

            if (document.getElementById("map_layer_" + region + "_top") !== null) {
                document.getElementById("map_layer_" + region + "_top").remove()
            }

            document.getElementById("map_region_opacity_mask_" + region).remove()
            document.getElementById("sky_" + region).remove()

            //Changing the class of the transition item to a blocking item
            let TransitionItem = document.getElementById("map_region_enter_" + region)
            TransitionItem.removeAttribute("id")
            TransitionItem.classList.remove("map_region_enter")
            TransitionItem.classList.add("map_block")

            let LeaveItem = document.getElementById("map_region_leave_" + region)
            LeaveItem.removeAttribute("id")
            LeaveItem.classList.remove("map_region_leave")
            LeaveItem.classList.add("map_block")

        }
    }

    function remove_unused_map_locations(){
        let AllMapLocations = document.getElementsByClassName("map_location_icon")

        let Locations_visited_in_experiment = Stimuli.get_all_x_encountered_during_experiment("location")
        for(let num = 0; num < Locations_visited_in_experiment.length; num++) {
            Locations_visited_in_experiment[num] = Locations_visited_in_experiment[num].toLowerCase()
        }

        let ToBeDeletedIds = []

        for (let i = 0; i < AllMapLocations.length; i++) {
            let location_name = AllMapLocations[i].id.replace("map_location_icon_", "")
            if (!Locations_visited_in_experiment.includes(location_name)) {
                ToBeDeletedIds.push(AllMapLocations[i].id)
                ToBeDeletedIds.push("map_opacity_mark_location_" + location_name)
            }
        }
        console.log(ToBeDeletedIds)

        for (let i = 0; i < ToBeDeletedIds.length; i++) {
            if(document.getElementById(ToBeDeletedIds[i]) !== null){
                document.getElementById(ToBeDeletedIds[i]).remove()
            }else{
                console.log(ToBeDeletedIds[i])
            }
        }
    }

    function remove_unused_locations() {
        //Finding all locations on the map
        let AllLocations = document.getElementsByClassName("location")
        let Locations_visited_in_experiment = Stimuli.get_all_x_encountered_during_experiment("location")

        let ToBeDeletedIds = []

        for (let i = 0; i < AllLocations.length; i++) {
            let location_name = AllLocations[i].id.replace("location_", "")
            if (!Locations_visited_in_experiment.includes(location_name)) {
                ToBeDeletedIds.push(AllLocations[i].id)
            }
        }

        for (let i = 0; i < ToBeDeletedIds.length; i++) {
            document.getElementById(ToBeDeletedIds[i]).remove()
        }
    }

    //Find all HEADS not used during the experiment
    function remove_unused_heads() {
        let AllHeadsInSVG = document.getElementsByClassName("Fennimal_head")
        let ALl_head_Ids = []
        for (let i = 0; i < AllHeadsInSVG.length; i++) {
            ALl_head_Ids.push(AllHeadsInSVG[i].id.replace("Fennimal_head_", ""))
        }

        let Heads_in_exp = Stimuli.get_all_x_encountered_during_experiment("head")
        let Unused_heads = ALl_head_Ids.filter(x => !Heads_in_exp.includes(x))

        for (let i = 0; i < Unused_heads.length; i++) {
            document.getElementById("Fennimal_head_" + Unused_heads[i]).remove()
        }


    }

    //Find all Bodies not used during the experiment
    function remove_unused_bodies() {
        let AllBodiesInSVG = document.getElementsByClassName("Fennimal_body")
        let ALl_body_Ids = []
        for (let i = 0; i < AllBodiesInSVG.length; i++) {
            ALl_body_Ids.push(AllBodiesInSVG[i].id.replace("Fennimal_body_", ""))
        }

        let Bodies_in_exp = Stimuli.get_all_x_encountered_during_experiment("body")
        let Unused_bodies = ALl_body_Ids.filter(x => !Bodies_in_exp.includes(x))

        for (let i = 0; i < Unused_bodies.length; i++) {
            document.getElementById("Fennimal_body_" + Unused_bodies[i]).remove()
        }
    }

    //Find all hats not used during the experiment
    function remove_unused_hats(){
        let AllHatsInSVG = document.getElementsByClassName("hat")
        let HatIds = []
        for (let i = 0; i < AllHatsInSVG.length; i++) {
            HatIds.push(AllHatsInSVG[i].id.replace("hat_", ""))
        }

        let Hats_in_exp =Stimuli.get_all_x_encountered_during_experiment("hat")
        let UnusedHats = HatIds.filter(x => !Hats_in_exp.includes(x))

        for(let i=0; i < UnusedHats.length; i++) {
            document.getElementById("hat_" + UnusedHats[i]).remove()
        }

    }

    function remove_unused_items(){
        let Items_in_exp = Stimuli.get_all_x_encountered_during_experiment("item")
    }

    //TODO: remove unused items

    // On initialization
    remove_unused_regions()
   // remove_unused_map_locations()
   // remove_unused_locations()
    remove_unused_heads()
    remove_unused_bodies()
    remove_unused_hats()
    remove_unused_items()


}