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
        rejected: new Audio("rejected.wav"),
        positive: new Audio("positive.wav"),
        mystery: new Audio("mystery.wav"),

    }


    //Call to play a region sound
    let ActiveRegionSounds = [], ActiveSoundEffects = []
    this.play_region_sound=function(region_name){
        switch(region_name){
            case("Desert"): RegionSoundScapes[region_name].volume = 0.025; break
            case("Beach"): RegionSoundScapes[region_name].volume = 0.15; break
            case("North"): RegionSoundScapes[region_name].volume = 0.25; break
            case("Jungle"): RegionSoundScapes[region_name].volume = 0.5; break
            case("Swamp"): RegionSoundScapes[region_name].volume = 0.05; break
        }

        RegionSoundScapes[region_name].play()
        RegionSoundScapes[region_name].loop = true
        ActiveRegionSounds.push(RegionSoundScapes[region_name])


    }

    //Call to play a sound effect
    this.play_sound_effect = function (effect){
        if(Object.hasOwn(SoundEffects, effect)){
            ActiveSoundEffects.push(SoundEffects[effect])

            switch (effect){
                case("success"): SoundEffects[effect].volume = 0.25; break
            }

            SoundEffects[effect].pause()
            SoundEffects[effect].currentTime = 0
            SoundEffects[effect].play()
        }
    }

    //Stop playing all sounds
    this.stop_all_region_sounds = function(){
        for(let i=0;i<ActiveRegionSounds.length; i++){
            ActiveRegionSounds[i].pause()
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