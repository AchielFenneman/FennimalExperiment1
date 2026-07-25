class AudioControllerObject {
    constructor() {
        this.pathname = ""; // "https://achielfenneman.github.io/FennimalExperiment1//"

        this.RegionSoundScapes = {};

        const regionFiles = {
            North: "North.mp3",
            Jungle: "Jungle.mp3",
            Desert: "Desert.mp3",
            Mountains: "Mountains.mp3",
            Beach: "Beach.mp3",
            Flowerfields: "Flowerfields.mp3",
            Village: "Village.mp3",
            Swamp: "Swamp.mp3",
            Home: "Home.mp3"
        };

        for (const [region, filename] of Object.entries(regionFiles)) {
            let audio = new Audio(this.pathname + "./Audio/" + filename);

            // THE MAGIC BULLET: Tells the browser "Do not download this until I hit play"
            audio.preload = "none";

            audio.loop = true;
            audio.volume = 0.15;
            this.RegionSoundScapes[region] = audio;
        }

        // 2. THE MANIFEST: Just the filenames! No memory is used here.
        this.SoundEffectManifest = {
            rejected: "rejected.mp3",
            positive: "positive.mp3",
            mystery: "mystery.mp3",
            button_click: "button_click.mp3",
            close_menu: "close_menu.mp3",
            alert_minimal: "alert_minimal.mp3",
            stars_earned: "star_earned.mp3",
            star_earned: "star_earned.mp3",
            success: "success.mp3",
            photo: "photo.mp3",
            camera_pickup: "camera_pickup.mp3",
            chew: "chew.mp3",
            click: "click.wav", //TODO: add SFX
            notification: "notification.wav", //TODO: add SFX
            alert: "alert.mp3",
            alert_minor: "alert_minor.mp3",
            phone_ring: "phone_ring.mp3",

            search_loop: "search.mp3",
            beep: "beep.mp3",

            robot_play: "robot_play.mp3",
            chop: "chop.wav",
            box_open_A: "box_open_A.wav", //TODO: check if used - no SFX
            box_open_B: "box_open_B.wav", //TODO: check if used - no SFX
            box_open_C: "box_open_C.wav", //TODO: check if used - no SFX
            box_open_cardboard: "cardboard_open.mp3",
            box_open_chest: "chest_open.mp3",
            box_open_crate: "crate_open.mp3",
            box_open_container: "plastic_box_open.mp3",
            box_open_giftbox: "giftbox_open.mp3",
            box_open_picknick: "wicker.mp3",


            fly_buzzing: "fly_buzzing.mp3",
            splat: "splat.mp3",
            water_splash: "water_splash.mp3",

            pop: "pop.mp3",
            jump: "jump.mp3",
            thud: "thud.mp3",
            drag_wood: "drag_wood.mp3",
            sad: "sad.mp3",
            toy_car_windup: "toy_car_windup.mp3",
            toy_car_move: "toy_car_roll.mp3",
            electric_zap_single: "electric_zap_single.mp3",
            electric_zap_discharge: "electric_zap_discharge.mp3",
            plane_buzz: "plane_buzz.mp3",
            trumpet_note_A: "trumpet_note_A.wav",
            trumpet_note_B: "trumpet_note_B.wav",
            trumpet_note_C: "trumpet_note_C.wav",
            heartbeat: "heartbeat.wav", //TODO: check if used - no SFX
            radar_blip: "radar_blip.wav", //TODO: check if used - no SFX
            battery_low: "battery_low.wav",
            teleport: "teleport.wav", //TODO: check if used - no SFX
            scanner_start: "scanner_start.wav", //TODO: check if used - no SFX
            scanner_loop: "scanner_loop.wav", //TODO: check if used - no SFX
            scanner_success: "scanner_success.wav", //TODO: check if used - no SFX
            wrong_buzz: "wrong_buzz.wav",
            drawer_open: "drawer_open.wav",
            drawer_close: "drawer_close.wav",
            wind_up_plane: "wind_up_prop.wav",
            switch_flicked: "switch.wav",

            plastic_cap_open: "plastic_cap_open.wav",
            bubble_pop_small: "bubble_pop_small.wav",

            wind_up_spring: "wind_up_spring.wav",
            spring_release: "spring_release.wav",

            scrub: "scrub.mp3",
            garden_shear_snip: "garden_shears_snip.mp3",
            travel: "travel.mp3",

            scanning: "scanning.mp3",
            scanner_return: "scanner_return.mp3",

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
        if (effect === "travel") audio.volume = 0.50;

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
        audio.volume = 1.0;
        if (effect === "scanning") audio.volume = 0.35;
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