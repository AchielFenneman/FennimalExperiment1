class AudioControllerObject {
    constructor() {
        this.pathname = ""; // "https://achielfenneman.github.io/FennimalExperiment1//"

        // 1. CORE AMBIENCE: We still preload regions because they play immediately and constantly
        this.RegionSoundScapes = {
            North: new Audio(this.pathname + "./Audio/North.wav"),
            Jungle: new Audio(this.pathname + "./Audio/Jungle.mp3"),
            Desert: new Audio(this.pathname + "./Audio/Desert.mp3"),
            Mountains: new Audio(this.pathname + "./Audio/Mountains.wav"),
            Beach: new Audio(this.pathname + "./Audio/Beach.wav"),
            Flowerfields: new Audio(this.pathname + "./Audio/Flowerfields.mp3"),
            Village: new Audio(this.pathname + "./Audio/Village.mp3"),
            Swamp: new Audio(this.pathname + "./Audio/Swamp.wav"),
            Home: new Audio(this.pathname + "./Audio/Home.mp3")
        };

        // Ensure all region tracks loop
        for (let region in this.RegionSoundScapes) {
            this.RegionSoundScapes[region].loop = true;
        }

        // 2. THE MANIFEST: Just the filenames! No memory is used here.
        this.SoundEffectManifest = {
            rejected: "rejected.wav",
            positive: "positive.wav",
            mystery: "mystery.wav",
            button_click: "button_click.wav",
            close_menu: "close_menu.mp3",
            alert_minimal: "alert_minimal.wav",
            success: "success.wav",
            photo: "photo.mp3",
            click: "click.wav",
            notification: "notification.wav",
            alert: "alert.wav",
            alert_minor: "alert_minor.wav",
            phone_ring: "phone_ringing.wav",

            search_loop: "search.wav",
            beep: "beep.wav",

            robot_play: "robot_play.wav",
            chop: "chop.wav",
            box_open_A: "box_open_A.wav",
            box_open_B: "box_open_B.wav",
            box_open_C: "box_open_C.wav",
            box_open_cardboard: "cardboard_open.wav",
            box_open_chest: "chest_open.wav",
            box_open_crate: "crate_open.wav",
            box_open_container: "plastic_box_open.wav",
            box_open_giftbox: "giftbox_open.wav",
            box_open_picknick: "wicker.wav",


            fly_buzzing: "fly_buzzing.wav",
            splat: "splat.wav",
            water_splash: "water_splash.wav",
            scrub: "scrub.wav",
            pop: "pop.wav",
            jump: "jump.wav",
            thud: "thud.wav",
            star_earned: "star_earned.wav",
            drag_wood: "drag_wood.wav",
            sad: "sad.wav",
            toy_car_windup: "toy_car_windup.wav",
            toy_car_move: "toy_car_roll.wav",
            electric_zap_single: "electric_zap_single.wav",
            electric_zap_discharge: "electric_zap_discharge.wav",
            plane_buzz: "plane_buzz.wav",
            trumpet_note_A: "trumpet_note_A.wav",
            trumpet_note_B: "trumpet_note_B.wav",
            trumpet_note_C: "trumpet_note_C.wav",
            heartbeat: "heartbeat.wav",
            radar_blip: "radar_blip.wav",
            battery_low: "battery_low.wav",
            teleport: "teleport.wav",
            scanner_start: "scanner_start.wav",
            scanner_loop: "scanner_loop.wav",
            scanner_success: "scanner_success.wav",
            wrong_buzz: "wrong_buzz.wav",
            drawer_open: "drawer_open.wav",
            drawer_close: "drawer_close.wav",
            wind_up_plane: "wind_up_prop.wav",
            switch_flicked: "switch.wav",

            plastic_cap_open: "plastic_cap_open.wav",
            bubble_pop_small: "bubble_pop_small.wav",

            wind_up_spring: "wind_up_spring.wav",
            spring_release: "spring_release.wav",
        };

        // 3. MEMORY MANAGEMENT
        this.ActiveSoundCache = {}; // Holds the actual Audio objects
        this.LastPlayedTimestamps = {}; // Tracks when they were last used

        this.ActiveRegionSounds = [];
        this.ActiveSoundEffects = []; // History array for the "stop all" function

        this.start_garbage_collector();
    }

    // ----------------------------------------------------
    // BACKGROUND GARBAGE COLLECTOR
    // ----------------------------------------------------
    start_garbage_collector() {
        // Runs every 60 seconds
        setInterval(() => {
            let now = Date.now();
            for (let effect in this.ActiveSoundCache) {
                let audioObj = this.ActiveSoundCache[effect];

                // NEVER unload a sound that is actively set to loop, or currently playing
                if (audioObj.loop || !audioObj.paused) continue;

                // If the sound hasn't been played in 3 minutes, free up the memory!
                if (now - this.LastPlayedTimestamps[effect] > 180000) {
                    this.unload_audio(effect);
                }
            }
        }, 60000);
    }

    // ----------------------------------------------------
    // EXPOSED PUBLIC API
    // ----------------------------------------------------

    play_region_sound(region) {
        if (this.RegionSoundScapes[region]) {
            this.RegionSoundScapes[region].play().catch(e => console.warn("Audio blocked:", e));
            this.ActiveRegionSounds.push(this.RegionSoundScapes[region]);
        }
    }

    play_sound_effect(effect) {
        // LAZY LOAD: If it's not in RAM, load it right now!
        if (!this.ActiveSoundCache[effect]) {
            if (this.SoundEffectManifest[effect]) {
                this.load_audio(effect, this.SoundEffectManifest[effect], false);
            } else {
                console.warn("Unknown sound effect requested: " + effect);
                return;
            }
        }

        let audio = this.ActiveSoundCache[effect];

        // Update the timestamp so the garbage collector knows it was just used
        this.LastPlayedTimestamps[effect] = Date.now();

        // Specific volume logic
        audio.volume = 1.0;
        if (effect === "heartbeat") audio.volume = 0.10;
        if (effect === "battery_low") audio.volume = 0.20;

        // Reset and play
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("[" + effect + "] Audio blocked:", e));

        // Keep track of recent sounds for the "stop all" function (Limit to 10)
        this.ActiveSoundEffects.push(audio);
        if (this.ActiveSoundEffects.length > 10) {
            this.ActiveSoundEffects.shift();
        }
    }

    start_looping_sound_effect(effect) {
        if (!this.ActiveSoundCache[effect]) {
            if (this.SoundEffectManifest[effect]) {
                this.load_audio(effect, this.SoundEffectManifest[effect], true);
            } else {
                console.warn("Unknown sound effect requested: " + effect);
                return;
            }
        }

        let audio = this.ActiveSoundCache[effect];
        this.LastPlayedTimestamps[effect] = Date.now();
        audio.loop = true;
        audio.play().catch(e => console.warn("Audio blocked:", e));
    }

    stop_looping_sound_effect(effect) {
        if (this.ActiveSoundCache[effect]) {
            let audio = this.ActiveSoundCache[effect];
            audio.pause();
            audio.currentTime = 0;
            audio.loop = false;
        }
    }

    stop_all_region_sounds() {
        for (let i = 0; i < this.ActiveRegionSounds.length; i++) {
            this.ActiveRegionSounds[i].pause();
        }
        this.ActiveRegionSounds = [];
    }

    stop_all_sound_effects() {
        for (let i = 0; i < this.ActiveSoundEffects.length; i++) {
            this.ActiveSoundEffects[i].pause();
        }
    }

    close_audio_for_unused_region(region) {
        if (this.RegionSoundScapes[region]) {
            this.RegionSoundScapes[region].pause();
            this.RegionSoundScapes[region].src = ""; // Force garbage collection of the audio buffer
            delete this.RegionSoundScapes[region];
        }
    }

    load_audio(audio_name, filename, looped) {
        let newAudio = new Audio(this.pathname + "./Audio/" + filename);
        newAudio.loop = looped;
        this.ActiveSoundCache[audio_name] = newAudio;
        this.LastPlayedTimestamps[audio_name] = Date.now();
    }

    unload_audio(audio_name) {
        if (this.ActiveSoundCache[audio_name]) {
            this.ActiveSoundCache[audio_name].pause();
            this.ActiveSoundCache[audio_name].src = ""; // Severs the connection to the file, freeing RAM
            delete this.ActiveSoundCache[audio_name];
            delete this.LastPlayedTimestamps[audio_name];
        }
    }
}