AudioControllerObject = function(){
    //Creates soundcontrollers for the files in the Audio subfolder
    let RegionSoundScapes = {
        North : new Audio("North.wav", loop=true),
        Jungle: new Audio("Jungle.mp3", loop=true),
        Desert: new Audio("Desert.mp3", loop=true),
        Mountains: new Audio("Mountains.wav", loop=true),
        Beach: new Audio("Beach.wav", loop=true),
        Flowerfields: new Audio("Flowerfields.mp3", loop=true),
        Village: new Audio("Village.mp3", loop=true),
        Swamp: new Audio("Swamp.wav", loop=true),
    }

    let SoundEffects = {
        giftbox: new Audio("giftbox_open.wav"),
        chest: new Audio("chest_open.wav"),
        crate: new Audio("crate_open.wav"),
        container: new Audio("plastic_box_open.wav"),
        cardboard: new Audio("cardboard_open.wav"),
        wicker:new Audio("wicker.wav"),
        partner:new Audio("plop.wav"),

    }



    //Call to play a region sound
    let ActiveRegionSounds = [], ActiveSoundEffects = []
    this.play_region_sound=function(location_name){
        if(Param.sound_on){
            let region_name = Param.LocationData[location_name].region
            RegionSoundScapes[region_name].volume = 0.08
            switch(region_name){
                case("Desert"): RegionSoundScapes[region_name].volume = 0.01; break
                case("Beach"): RegionSoundScapes[region_name].volume = 0.15; break
                //case("North"): RegionSoundScapes[region_name].volume = 0.10; break
                case("Jungle"): RegionSoundScapes[region_name].volume = 0.18; break
                case("Swamp"): RegionSoundScapes[region_name].volume = 0.02; break
                case("Village"): RegionSoundScapes[region_name].volume = 0.1; break
            }

            RegionSoundScapes[region_name].play()
            RegionSoundScapes[region_name].loop = true
            ActiveRegionSounds.push(RegionSoundScapes[region_name])

        }

    }

    this.play_box_sound = function(box){
        if(Param.sound_on){
            switch(box){
                case("a"): SoundEffects.giftbox.play(); break
                case("b"): SoundEffects.cardboard.play(); break
                case("c"): SoundEffects.chest.play(); break
                case("d"): SoundEffects.crate.play(); break
                case("e"): SoundEffects.container.play(); break
                case("f"): SoundEffects.wicker.play(); break
            }
        }
    }


    //Stop playing all sounds
    this.stop_all_region_sounds = function(){
        for(let i=0;i<ActiveRegionSounds.length; i++){
            ActiveRegionSounds[i].pause()
        }
    }

    this.play_partner_sound = function(){
        if(Param.sound_on){
            SoundEffects.partner.play()
        }
    }

    //Stops playing all sound effects
    this.stop_all_sound_effects = function(){
        for(let i=0;i<ActiveSoundEffects.length; i++){
            ActiveSoundEffects[i].pause()
        }
    }

}

let AudioController = new AudioControllerObject()