AudioControllerObject = function () {
    //Creates soundcontrollers for the files in the Audio subfolder
    let pathname = "" // "https://achielfenneman.github.io/FennimalExperiment1//"

    let RegionSoundScapes = {
        North: new Audio(pathname + "./Audio/North.wav", loop = true),
        Jungle: new Audio(pathname + "./Audio/Jungle.mp3", loop = true),
        Desert: new Audio(pathname + "./Audio/Desert.mp3", loop = true),
        Mountains: new Audio(pathname + "./Audio/Mountains.wav", loop = true),
        Beach: new Audio(pathname + "./Audio/Beach.wav", loop = true),
        Flowerfields: new Audio(pathname + "./Audio/Flowerfields.mp3", loop = true),
        Village: new Audio(pathname + "./Audio/Village.mp3", loop = true),
        Swamp: new Audio(pathname + "./Audio/Swamp.wav", loop = true),
        Home: new Audio(pathname + "./Audio/Home.mp3", loop = true),
    }

    let SoundEffects = {
        rejected: new Audio(pathname + "./Audio/rejected.wav"),
        positive: new Audio(pathname + "./Audio/positive.wav"),
        mystery: new Audio(pathname + "./Audio/mystery.wav"),
        button_click: new Audio(pathname + "./Audio/button_click.wav"),
        success: new Audio(pathname + "./Audio/success.wav"),
        photo: new Audio(pathname + "./Audio/photo.wav"),
        camera_pickup: new Audio(pathname + "./Audio/camera_pickup.mp3"),
        star_earned: new Audio(pathname + "./Audio/star_earned.mp3"),
        Fennimal_appears: new Audio(pathname + "./Audio/Fennimal_appears.mp3"),
        close_menu: new Audio(pathname + "./Audio/close_menu.mp3"),
        search_loop: new Audio(pathname + "./Audio/search.wav", loop = true),
        alert: new Audio(pathname + "./Audio/alert.wav"),
        alert_minor: new Audio(pathname + "./Audio/alert_minor.wav"),
        alert_minimal: new Audio(pathname + "./Audio/alert_minimal.wav"),
        thud: new Audio(pathname + "./Audio/thud.wav"),
        thumb: new Audio(pathname + "./Audio/thumb.wav"),
        card_placed: new Audio(pathname + "./Audio/card_placed.wav"),
        nearby_location: new Audio(pathname + "./Audio/nearby_location.mp3"),
        chew: new Audio(pathname + "./Audio/chew.wav"),
        pop: new Audio(pathname + "./Audio/pop.wav"),
        zipper: new Audio(pathname + "./Audio/zipper.wav"),
        absent_chime: new Audio(pathname + "./Audio/absent_chime.wav"),
        beep: new Audio(pathname + "./Audio/beep.wav"),
        battery_low: new Audio(pathname + "./Audio/battery_low.wav"),

        box_open_cardboard: new Audio(pathname + "./Audio/cardboard_open.wav"),
        box_open_chest: new Audio(pathname + "./Audio/chest_open.wav"),
        box_open_crate: new Audio(pathname + "./Audio/crate_open.wav"),
        box_open_container: new Audio(pathname + "./Audio/plastic_box_open.wav"),
        box_open_giftbox: new Audio(pathname + "./Audio/giftbox_open.wav"),
        box_open_picknick: new Audio(pathname + "./Audio/wicker.wav"),


    }


    //Call to play a region sound
    let ActiveRegionSounds = [], ActiveSoundEffects = []
    this.play_region_sound = function (region_name) {
        switch (region_name) {
            case("Desert"):
                RegionSoundScapes[region_name].volume = 0.025;
                break
            case("Beach"):
                RegionSoundScapes[region_name].volume = 0.15;
                break
            case("North"):
                RegionSoundScapes[region_name].volume = 0.25;
                break
            case("Jungle"):
                RegionSoundScapes[region_name].volume = 0.5;
                break
            case("Swamp"):
                RegionSoundScapes[region_name].volume = 0.05;
                break
            case("Home"):
                RegionSoundScapes[region_name].volume = 0.025;
                break
        }

        RegionSoundScapes[region_name].play()
        RegionSoundScapes[region_name].loop = true
        ActiveRegionSounds.push(RegionSoundScapes[region_name])


    }

    //Call to play a sound effect
    this.play_sound_effect = function (effect) {
        if (Object.hasOwn(SoundEffects, effect)) {
            ActiveSoundEffects.push(SoundEffects[effect])

            switch (effect) {
                case("success"):
                    SoundEffects[effect].volume = 0.25;
                    break
                case("search_loop"):
                    SoundEffects[effect].volume = 0.25;
                    break
                case("Fennimal_appears"):
                    SoundEffects[effect].volume = 0.25;
                    break
                case("pop"):
                    SoundEffects[effect].volume = 0.10;
                    break
                case("battery_low"):
                    SoundEffects[effect].volume = 0.20;
                    break
            }

            SoundEffects[effect].pause()
            SoundEffects[effect].currentTime = 0
            SoundEffects[effect].play()
        }
    }

    //Stop playing all sounds
    this.stop_all_region_sounds = function () {
        for (let i = 0; i < ActiveRegionSounds.length; i++) {
            ActiveRegionSounds[i].pause()
        }
    }

    //Stops playing all sound effects
    this.stop_all_sound_effects = function () {
        for (let i = 0; i < ActiveSoundEffects.length; i++) {
            ActiveSoundEffects[i].pause()
        }
    }

    //Call to unload (close) the sound effects of unvisted regions
    this.close_audio_for_unused_region = function(region){
        delete RegionSoundScapes[region]
    }


}

console.log("%c RESOURCES - LOADED AUDIOCONTROLLER", "color:darkgreen")