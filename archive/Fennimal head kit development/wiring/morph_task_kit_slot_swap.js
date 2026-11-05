/*
 * ARCHIVED slot-swap kit jumble ("morph": "kit") — not loaded.
 * Live kit heads use morph "overlay_fade" (FeatureKit.composeOverlayFade).
 *
 * Restore:
 *   1. Paste _placeKitJumble back onto MorphTaskController, replacing the throw.
 *   2. Paste the StimulusSpec check back into 2_Top_controller.js, replacing
 *      the "morph kit is archived" error.
 *   3. In MorphTaskController._morphPool, the feature_kit fallback may return
 *      ["kit"] again (live code falls back to ["overlay_fade"]).
 */

// --- 2_Top_controller.js, inside morph_task trial validation ---
                        if ((kitJumble || trial.morph === "kit") && trial.morph !== "overlay_fade") {
                            let jumble = trial.jumble;
                            let slots = (typeof FeatureKit !== "undefined" && FeatureKit.SLOTS)
                                ? FeatureKit.SLOTS
                                : [
                                    { key: "shell", required: true },
                                    { key: "ear", required: true },
                                    { key: "eye", required: true },
                                    { key: "lowerFace", required: true },
                                    { key: "hair", required: false },
                                    { key: "stamp", required: false }
                                ];
                            if (!jumble || typeof jumble !== "object" || Array.isArray(jumble)) {
                                if (!trial.kit_partition) {
                                    errors.push(`${label} ${path} needs jumble: { shell, ear, eye, lowerFace } (hair/stamp optional).`);
                                }
                            } else {
                                slots.forEach((slot) => {
                                    let key = slot.key || slot;
                                    let required = slot.required !== false;
                                    let parent = jumble[key];
                                    if (parent == null || String(parent).trim() === "") {
                                        if (!required) return;
                                        errors.push(`${label} ${path} jumble.${key} is missing.`);
                                        return;
                                    }
                                    let sid = String(parent).trim();
                                    if (trial.fenA && trial.fenB && sid !== trial.fenA && sid !== trial.fenB) {
                                        errors.push(
                                            `${label} ${path} jumble.${key} "${sid}" must be fenA or fenB.`
                                        );
                                    }
                                });
                            }
                        }

// --- 4_MorphTask.js method ---
    _placeKitJumble(trial, opts) {
        let slot = this._slotBox("jumble") || this._photoWellBox();
        if (!slot || !trial || !trial.fenA || !trial.fenB) return false;
        if (typeof FeatureKit === "undefined") {
            this._fail("kit jumble needs FeatureKit.js loaded.");
        }
        let kit = FeatureKit.shared();
        if (!kit.catalog) {
            this._fail("kit jumble needs FeatureKit.load() before morph_task.");
        }
        let mixed;
        if (trial.kit_jumble) {
            let recipes = {};
            recipes[trial.fenA.id] = trial.fenA.kit_recipe;
            recipes[trial.fenB.id] = trial.fenB.kit_recipe;
            mixed = FeatureKit.mixFromSlotMap(recipes, trial.kit_jumble);
        } else {
            let partition = trial.kit_partition || {};
            let polarity = trial.kit_polarity != null ? trial.kit_polarity : 0;
            mixed = FeatureKit.mixRecipes(
                trial.fenA.kit_recipe,
                trial.fenB.kit_recipe,
                partition,
                polarity
            );
            trial.set_from_fenA = polarity === 1
                ? (partition.set_b || []).slice()
                : (partition.set_a || []).slice();
            trial.set_from_fenB = polarity === 1
                ? (partition.set_a || []).slice()
                : (partition.set_b || []).slice();
        }
        trial.kit_probe_recipe = mixed;
        let composed = kit.compose(mixed, { showMarkers: false });
        let group = create_SVG_group(0, 0, "morph_stimulus");
        group.style.pointerEvents = "none";
        group.appendChild(composed.group);
        this._applyJumbleComponentGrayscale(group);
        this.morphGroup = group;
        this.activeRenderer = "kit";
        this._insertInPhotoWell(group, opts && opts.before ? opts.before : this.jumbleOccluder);
        // Shell silhouette only — matching the size sitting. Fit width is
        // capped so a wider polaroid does not enlarge the head; extra paper
        // is for ears that used to clip at the well edge.
        let fitBox = slot;
        let capW = this._num("kitJumbleFitWidth", 454);
        if (slot.width > capW + 1) {
            fitBox = {
                x: slot.x + (slot.width - capW) / 2,
                y: slot.y,
                width: capW,
                height: slot.height
            };
        }
        if (!(typeof FeatureKit !== "undefined" && FeatureKit.fitGroupInBoxByShell
            && FeatureKit.fitGroupInBoxByShell(group, fitBox, { align: "center", pad: FeatureKit.WELL_FIT_PAD }))) {
            this._fitNodeInBox(group, fitBox, 0.86, 0.86, "center");
        }
        group.style.opacity = "1";
        this._currentMorphLevel = 0.5;
        return true;
    }
