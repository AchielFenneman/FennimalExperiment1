/*
 * ARCHIVED — not loaded.
 * Paste onto the GENERALPARAM constructor in 1_General_Parameters.js.
 * Live semantic_learning_kit reads GenParam.FeatureKitHeads instead
 * (frozen H1/H2/H3 families + baseline scales). This snapshot is what the
 * size and fade pilots used, including the mild/medium scale packs.
 */

    // Stimulus pilot: slot-duel 2AFC on kit heads (no morph, names, hats, or stars).
    this.FeatureKitPilot = {
        trialSpeedMs: 7500,
        minChoiceMs: 750,
        nTokensSampled: 3,
        nDuelReps: 3,
        nCatch: 3,
        adaptive: true,
        excludeSlots: ["hair"],
        itiMs: 280,
        prompt: "Which one looks more like the top head?",
        practicePrompt: "Which one looks more like the top head?",
        promptSize: 34,
        promptY: 0.072,
        wellSize: 390,
        probeX: 0.50,
        probeY: 0.34,
        answerLeftX: 0.33,
        answerRightX: 0.67,
        answerY: 0.72,
        keyGap: 48,
        grayscaleFilter: "grayscale(100%)",
        indoorBackground: "./Locations/Home_photoroom.png",
        indoorOverlayOpacity: 0.42,
        barWidth: 52,
        keyW: 92,
        keyH: 72,
        dayTitle: "Which heads look most alike?",
        dayBody:
            "You'll see three heads at a time. The one on top is made of pieces from the two below.<br><br>" +
            "Which of the lower heads looks more like the top one? Press <b>F</b> for the left head or <b>J</b> for the right (clicking a side head also works).<br><br>" +
            "The green bars are a gentle pace cue (about 7 seconds). Even after they run out, please still choose — there is no right or wrong answer.<br><br>" +
            "We'll start with two practice rounds using simple shapes."
    };

    this.FeatureKitComboPilot = {
        nTokensSampled: 4,
        nDuelReps: 2,
        nAdaptiveDuels: 16,
        excludeSlots: ["hair"],
        dayTitle: "Which heads look most alike?",
        dayBody:
            "You'll see three heads at a time. The one on top is made of pieces from the two below.<br><br>" +
            "Which of the lower heads looks more like the top one? Press <b>F</b> for the left head or <b>J</b> for the right (clicking a side head also works).<br><br>" +
            "The green bars are a gentle pace cue (about 7 seconds). Even after they run out, please still choose — there is no right or wrong answer.<br><br>" +
            "We'll start with two practice rounds using simple shapes."
    };

    // Size sitting: frozen trio, one between-subjects scale pack, 30 coverage
    // 3v2 duels + 2 practice + 3 catch. Same UI as combo. Override pack with ?PACK=.
    this.FeatureKitSizePilot = {
        nTokensSampled: 4,
        nDuelReps: 1,
        nAdaptiveDuels: 0,
        nCatch: 3,
        adaptive: false,
        excludeSlots: ["hair"],
        packs: {
            baseline: { ear: 1, eye: 1, lowerFace: 1, stamp: 1 },
            mild: { ear: 0.92, eye: 1.12, lowerFace: 0.90, stamp: 1.18 },
            medium: { ear: 0.82, eye: 1.22, lowerFace: 0.85, stamp: 1.35 }
        },
        frozenHeads: [
            { id: "H1", shell: "mechanical", ear: "mechanical", eye: "mechanical", lowerFace: "mechanical", stamp: "mechanical", hair: "none" },
            { id: "H2", shell: "sweet", ear: "sweet", eye: "sweet", lowerFace: "sweet", stamp: "sweet", hair: "none" },
            { id: "H3", shell: "sea", ear: "sea", eye: "sea", lowerFace: "sea", stamp: "sea", hair: "none" }
        ],
        dayTitle: "Which heads look most alike?",
        dayBody:
            "You'll see three heads at a time. The one on top is made of pieces from the two below.<br><br>" +
            "Which of the lower heads looks more like the top one? Press <b>F</b> for the left head or <b>J</b> for the right (clicking a side head also works).<br><br>" +
            "The green bars are a gentle pace cue (about 7 seconds). Even after they run out, please still choose — there is no right or wrong answer.<br><br>" +
            "We'll start with two practice rounds using simple shapes."
    };

    // Overlay-fade sitting: same-slot 1v1 at 50 + cross-slot 1v1 at 50 (both polarities).
    // Launch: ?EXP=feature_kit_fade_pilot&SKIP_INTRO=1
    this.FeatureKitFadePilot = {
        nCatch: 3,
        adaptive: false,
        nAdaptiveDuels: 0,
        excludeSlots: ["hair"],
        fadeSlots: ["ear", "eye", "lowerFace", "stamp"],
        dayTitle: "Which heads look most alike?",
        dayBody:
            "You'll see three heads at a time. The one on top is a mix of the two below — sometimes the same part from each parent, sometimes one part from one parent against a different part from the other.<br><br>" +
            "Which of the lower heads looks more like the top one? Press <b>F</b> for the left head or <b>J</b> for the right (clicking a side head also works).<br><br>" +
            "The green bars are a gentle pace cue (about 7 seconds). Even after they run out, please still choose — there is no right or wrong answer.<br><br>" +
            "We'll start with two practice rounds using simple shapes."
    };
