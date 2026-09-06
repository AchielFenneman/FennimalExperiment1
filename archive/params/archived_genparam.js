/*
 * ARCHIVED GenParam blocks — not loaded.
 * Paste back onto the GenParam constructor in 1_General_Parameters.js to restore.
 * The first MorphTask object below is the developing-photo snapshot used by
 * MorphTaskTwoCards / TwoStageDevelopment (Object.assign). Live MorphTask stays in GenParam.
 */

    this.ChimeraFeatureId = {
        revealMs: 2000, // fallback if a chimera block omits trial_speed
        startBlurPx: 24,
        maxPoints: 100,
        incorrectPenalty: 25,
        pointsPerStar: 100,
        freezeAfterMs: 1000,
        tutorialDimOpacity: 0.1,
        radialRadius: 300,
        buttonW: 168,
        buttonH: 72,
        fennimalScale: 2.35,
        fennimalX: 0.50,
        fennimalY: 0.70,
        polaroidScale: 0.90,
        polaroidX: 0.50,
        polaroidY: 0.48,
        polaroidPaperFill: "#f4efe4",
        polaroidCaptionFill: "#8a8680",
        indoorBackground: "./Locations/Home_photoroom.png",
        indoorOverlayOpacity: 0.22,
        fogWashOpacity: 0.10,
        barWidth: 68,
        barLeftX: 0.25,
        barRightX: 0.75,
        barTop: 0.12,
        barBottom: 0.92,
        // Day N card copy (stimulus blocks may still override day_title / day_body)
        dayTitle: "photos from this morning",
        dayBody:
            "This morning's polaroids are still developing. Some shots are close-ups; others show more of the Fennimal. The picture takes a moment to appear.<br><br>" +
            "Click the question-mark box to start each trial, then choose the matching name as quickly as you can. Faster correct answers leave you with more points (100 points = 1 bonus star). An incorrect answer quietly costs points — there is no trial-by-trial feedback.",
        patchyOverlayPad: 72,
        patchyOverlayFill: "#c5d0dc",
        patchyOverlayFillPolaroid: "#3e3a44",
        // Reveal curve (holes + mosaic), independent of reveal_mode.
        // "lingering" = longer ambiguous-but-possible window (default).
        // "steep" = the original knife-edge curve (backup).
        // Phase override: reveal_profile: "steep" | "lingering"
        revealProfile: "lingering",
        revealProfiles: {
            steep: {
                patchyHoleCount: 4,
                patchyHoleSoftness: 10,
                patchyMinBlurPx: 28,
                patchyRMaxFactor: 1.15,
                patchyGrowthPower: 3.2,
                patchyColorPower: 1.7,
                patchyHoleStagger: 0,
                patchyPixelSizeStart: 36,
                patchyPixelSizeEnd: 2,
                patchyPixelPower: 1.6
            },
            lingering: {
                // More, staggered, mixed-size bubbles so some diagnostic
                // patches appear early while most of the photo stays covered.
                // Mosaic sits in a mid grain for a long stretch instead of
                // snapping sharp the moment a hole finally opens.
                patchyHoleCount: 7,
                patchyHoleSoftness: 14,
                patchyMinBlurPx: 32,
                patchyRMaxFactor: 1.12,
                patchyGrowthPower: 1.45,
                patchyColorPower: 1.22,
                patchyHoleStagger: 0.32,
                patchyHoleScales: [0.50, 0.88, 0.62, 1.08, 0.46, 0.94, 0.70],
                patchyPixelSizeStart: 40,
                patchyPixelSizeEnd: 2,
                patchyPixelPower: 1.6,
                patchyPixelStops: [
                    { t: 0, size: 40 },
                    { t: 0.32, size: 22 },
                    { t: 0.70, size: 12 },
                    { t: 0.88, size: 6 },
                    { t: 1, size: 2 }
                ]
            }
        },
        // Lead-lag print (easy to forget — see INTERACTION_AND_PHASE_TYPES.md
        // and the header of 4_ChimeraFeatureIdTask.js).
        // After "?" the PRIME part (body or head) prints first; the TARGET
        // part (the feature named in the question) stays under an undeveloped
        // photo veil until targetLagFrac of trial_speed, then prints over a
        // fresh trial_speed window. Fractions of trial_speed, not extra ms.
        // Score clock (bars + points) is frozen until lag, then decays over
        // that same full trial_speed window. Practice / head-only skip the lag.
        primeEndFrac: 0.40,
        targetLagFrac: 0.35,
        targetVeilPad: 22
    }

    this.MorphTask = {
        // Fallback trial window if a morph block omits trial_speed (ms).
        trialSpeedMs: 6000,
        // morph_centerpoint c in [0,1] sets ONLY the resolution midpoint:
        // t_mid = (midpointMinFrac + (midpointMaxFrac - midpointMinFrac) * c) * trial_speed.
        // c = 0 resolves early, c = 1 resolves late. Perceptual ambiguity is
        // controlled independently by each trial's moving binary static noise.
        midpointMinFrac: 0.15,
        midpointMaxFrac: 0.85,
        // Moving static overlay: trial.noise in [0,1] is the *peak* coverage
        // fraction (this-size cells). Envelope: 0 during prime → linear ramp
        // to peak over prime→jumble → hold at peak through jumbleHoldMs →
        // linear ramp to 0 over trial_speed. Speckle positions/fills are fixed
        // for the trial (seeded by trial id); only coverage density animates.
        noiseCellSizePx: 8,
        // Reserved; 0 = no reshuffle (stable static). >0 would re-twinkle.
        noiseRefreshMs: 0,
        // Fade duration when resolve_trial removes leftover static after a choice.
        noiseFadeMs: 350,
        // Logistic steepness as a fraction of trial_speed. The morph weight is
        // m(t) = 0.5 + 0.5 * (sig(t) - sig(0)) / (1 - sig(0)),
        // sig(t) = 1 / (1 + exp(-(t - t_mid) / (tauFrac * trial_speed))).
        // Larger tauFrac = more gradual morph around t_mid.
        // m(0) = 0.5 exactly (fully ambiguous); m keeps rising past the window
        // end, so even the hardest trials fully resolve while a late answer is
        // still pending.
        tauFrac: 0.30,
        // Ambiguity veil: strongest at m = 0.5, gone at m = 1.
        // ambiguity = clamp01(2 * (1 - m)); blur = blurMaxPx * ambiguity^blurPower.
        blurMaxPx: 7,
        blurPower: 1.4,
        // Paper-coloured film over the photo, opacity = filmMaxOpacity * ambiguity.
        filmMaxOpacity: 0.18,
        filmFill: "#f4efe4",
        // Experimental geometric mesh renderer (morph: "mesh"). Sources are
        // rasterized in a fixed square, then automatically landmarked using
        // 24 radial alpha-contour points plus eye/mouth/neck geometry. Both
        // endpoints are warped to one intermediate Delaunay mesh before the
        // pixels are blended, yielding one opaque intermediate head.
        meshRasterSize: 400,
        meshContourPoints: 24,
        meshAlphaThreshold: 18,
        // If true (default): on answer the morph rapidly completes to the TRUE
        // Fennimal (implicit feedback). If false: the frame freezes as-is
        // (chimera-style, no feedback). Block override: resolve_trial.
        resolveTrial: true,
        resolveAnimMs: 450,
        // Scoring (identical scheme to the chimera task).
        maxPoints: 100,
        incorrectPenalty: 25,
        pointsPerStar: 100,
        freezeAfterMs: 1000,
        tutorialDimOpacity: 0.1,
        // Layout (polaroid chrome shared with the chimera task).
        buttonW: 200,
        buttonH: 72,
        buttonRadius: 260,
        // Fixed gray palette for trial.grayscale and prime color_scheme gray*.
        // Applied as real SVG fills (not a CSS filter) so region lightness is
        // not inherited from the original hue intensities.
        grayscaleScheme: {
            primary_color: "#c4c4c4",
            secondary_color: "#8e8e8e",
            tertiary_color: "#5a5a5a",
            eye_color: "#3a3a3a"
        },
        // Toy light/dark slots when a gray prime includes a toy.
        grayscaleToyScheme: {
            light_color: "#c4c4c4",
            dark_color: "#5a5a5a"
        },
        // Radial ring for the unpaid prime-name quiz (centered on the polaroid).
        primeNameRadialRadius: 300,
        radialRadius: 300,
        // Hide name keys + shake polaroid on incorrect pick (ms).
        primeNameIncorrectMs: 1000,
        // Single-polaroid prime develop animation (ms).
        primeRevealMs: 900,
        // Hold named prime before crossfading into the jumble (ms).
        primeHoldMs: 350,
        // Crossfade/mesh morph prime → 50/50 jumble (ms). Independent of trial_speed.
        // Mesh trials use the same geometric mesh warp as jumble→target, with
        // tau = tauFrac * primeToJumbleMs (not trial_speed).
        primeToJumbleMs: 1000,
        // Hold the fully-ambiguous jumble before the target morph / timer arms (ms).
        jumbleHoldMs: 400,
        // Keyboard identity keycaps (F left / J right), vertically near the head.
        identityKeyW: 240,
        identityKeyH: 88,
        identityKeyYFrac: 0.44,
        identityKeyLeftXFrac: 0.30,
        identityKeyRightXFrac: 0.70,
        // Start-trial Space keycap sits lower than the F/J identity row.
        startSpaceKeyYFrac: 0.82,
        startSpaceKeyW: 280,
        startSpaceKeyH: 88,
        // Radial name-quiz keycaps.
        nameKeyW: 220,
        nameKeyH: 80,
        // Fly polaroid to chosen corner after answer (ms) and final scale.
        flyMs: 650,
        flyScale: 0.35,
        // Cross-trial scene fade (ms).
        trialFadeMs: 450,
        polaroidScale: 0.90,
        polaroidX: 0.50,
        polaroidY: 0.48,
        // Legacy dual-polaroid layout (MorphTaskTwoCards only).
        polaroidXWithPrime: 0.62,
        primePolaroidX: 0.34,
        primePolaroidYOffset: 0.04,
        primePolaroidScale: 0.82,
        primePolaroidRotateDeg: -8,
        primeEmptyFill: "#9a9590",
        // Held toy on primed polaroids (same rim as photo_Fennimal / hat-binding retraining).
        primeToyScale: 2.2,
        primeToyDropShadow:
            "drop-shadow(0px 0px 2px rgba(255,255,255,0.95)) drop-shadow(0px 1px 5px rgba(255,255,255,0.7))",
        polaroidPaperFill: "#f4efe4",
        polaroidCaptionFill: "#8a8680",
        occluderFill: "#3e3a44",
        indoorBackground: "./Locations/Home_photoroom.png",
        indoorOverlayOpacity: 0.22,
        barWidth: 136,
        barLeftX: 0.16,
        barRightX: 0.84,
        barTop: 0.12,
        barBottom: 0.92,
        // Day N card copy (stimulus blocks may still override day_title / day_body)
        dayTitle: "a blurry double exposure",
        dayBody:
            "The camera glitched this morning. Each trial starts under a ?. Press Space to develop a preview Fennimal, name who you see (F / J to move, Space to confirm), then the photo becomes a blurry mix of two Fennimals and settles into one of them.<br><br>" +
            "Use F and J to pick which of the two named Fennimals the morph really shows — as quickly as you can. Faster correct answers leave you with more points (100 points = 1 bonus star). An incorrect answer quietly costs points — there is no trial-by-trial feedback."
    }

    // Archived two-polaroid morph (morph_task_two_cards). Frozen copy of the
    // pre-redesign MorphTask tunables (developing-photo + noise + resolve).
    this.MorphTaskTwoCards = Object.assign({}, this.MorphTask);

    // Archived two-stage developing-photo morph (morph_task_two_stage_development).
    // Snapshot of MorphTask before the extra-wide two-spot polaroid redesign.
    this.MorphTaskTwoStageDevelopment = Object.assign({}, this.MorphTask);

    // Stimulus pilot (morph_head_pilot). Merged over MorphTask in the pilot
    // controller. Live morph_task does not read this object.
    this.MorphHeadPilot = {
        jumbleSlot: { x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
        jumbleFillFrac: 0.96,
        morphFitFrac: 0.90,
        identityPrompt: "Which head do you see more clearly?",
        identityPromptPractice: "Which shape does this most look like?",
        polaroidScale: 0.84,
        polaroidFrameW: 560,
        polaroidFrameH: 740,
        identityHatSlotW: 168,
        identityHatSlotH: 168,
        dayTitle: "Your task",
        dayBody:
            "On each trial you will see a picture that mixes two heads. The two original heads appear at the bottom of the screen, next to F and J.<br><br>" +
            "Look at the mix, then press F or J to choose which head it looks more like.<br><br>" +
            "Some mixes will be closer than others. There is no time pressure and no right or wrong answer — go with your first impression.<br><br>" +
            "We will start with two short practice trials using simple shapes."
    };

    this.HatDrop = {
        nReps: 1,
        instructionOrder: ["most_similar", "cousin", "neighbour"],
        gngInstructionOrder: ["neighbour", "cousin"],
        maxPoints: 100,
        minPoints: 25,
        pointsPerStar: 100,
        totalFallTime: 4000,
        previewMs: 750,
        previewTravelMs: 320,
        previewHatScale: 1.35,
        practiceFallScale: 1.5,
        warningMs: 600,
        lockDropMs: 250,
        freezeAfterMs: 800,
        tutorialDimOpacity: 0.1,
        indoorBackground: "./Locations/Home_machineroom.png",
        indoorOverlayOpacity: 0.5,
        columnX: 0.50,
        slotGap: 260,
        promptY: 0.035,
        promptH: 72,
        spigotY: 0.135,
        boxY: 0.80,
        arrowY: 0.945,
        boxW: 300,
        boxH: 240,
        boxHatScale: 2.45,
        fallingHatScale: 2.56,
        pipeHalfW: 52,
        nozzleHalfW: 155,
        // Day N card copy. Stimulus blocks may still override with day_title / day_body.
        dayTitle: "the warehouse chute",
        dayBody:
            "Hats are coming down the warehouse chute. First a small window beside the chute shows which hat is about to drop; the boxes stay covered. Then that hat is pulled into the chute, the boxes open, and you move the sled with the arrow buttons or arrow keys so the hat lands in the box you choose. Press space (or Lock) to freeze the sled and keep your remaining points — the hat then drops at once.<br><br>" +
            "You start each trial at 100 points. They count down as the hat falls, down to 25. A correct landing earns the remaining points; an incorrect landing earns none. Faster correct answers leave more points (100 points = 1 bonus star). You will not be told whether you were right until the end of the experiment.<br><br>" +
            "We will start with two practice rounds using simple shapes.",
        gngDayTitle: "keep or slide",
        gngDayBody:
            "Hats are coming down the chute. First a small window beside the chute shows which hat is about to drop; the box stays covered. Then that hat is pulled into the chute, the box opens, and you choose. One box starts under the chute. Keep the box there if it matches the rule; otherwise slide the box out of the way with the arrow keys. You can move it back. Press space to lock in and keep your remaining points — or wait, and the hat lands wherever the box then is.<br><br>" +
            "You start each trial at 100 points. They count down as the hat falls, down to 25. A correct action earns the remaining points; an incorrect action earns none. Faster correct answers leave more points (100 points = 1 bonus star). You will not be told whether you were right until the end of the experiment.<br><br>" +
            "We will start with two practice rounds using simple shapes."
    }

