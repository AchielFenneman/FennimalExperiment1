/*
 * ARCHIVED — not loaded by index.html.
 * Paste the relevant keys back into 2_Stimulus_data.js to restore.
 * See archive/MANIFEST.md.
 */

// Constructor special-case (literal SVG heads) lived in StimulusSettings.
// Transformer still supports StimTemplate.literal_svg_heads if restored.

        morph_head_pilot: ["browser_check_and_full_screen_prompt", "consent", "single_sitting"],

        // Head-selection stimulus pilot. Author heads here only — do not also
        // fill All_Forced_Head_Lists / All_Fennimal_Sets for this code.
        // Fennimals are synthesized (id === SVG head id) with an identity map.
        morph_head_pilot: [
            {
                type: "morph_head_pilot",
                skip_instructions: false,
                skip_practice: false,
                partner_behavior: "absent",
                trial_speed: 60000,
                // Compact "blob + face" prior: similar silhouette mass, no long
                // appendages. Dropped elephant, cupcake, aliengrey, jackolantern.
                // Tomato / pig / bell / cloud / bun. Astro is a temporary extra
                // (visor may still pop).
                heads: ["tomato", "pig", "bell", "cloud", "bun"],
                n_heads_sampled: 3,
                morphs: ["crossfade", "silhouette"],
                mixes: [50,55,60]
            }
        ],

    // morph_head_pilot: one authoring list (phase.heads). Copies onto
    // forced_heads for SVGREDUCER and builds a 1:1 Fennimal dictionary so the
    // FeatureMap does not shuffle SVG ids. Other experiment codes skip this.
    if (this.Experiment_Code === "morph_head_pilot") {
        let structure = this.Experiment_Structure;
        if (!Array.isArray(structure) || !structure.length) {
            throw new Error("morph_head_pilot: Experiment_Structure is missing.");
        }
        let phases = structure.filter((p) => p && p.type === "morph_head_pilot");
        if (phases.length !== 1) {
            throw new Error("morph_head_pilot: expected exactly one morph_head_pilot phase.");
        }
        if (All_Forced_Head_Lists.morph_head_pilot) {
            throw new Error(
                "morph_head_pilot: do not set All_Forced_Head_Lists; list SVG ids on phase.heads only."
            );
        }
        if (All_Fennimal_Sets.morph_head_pilot) {
            throw new Error(
                "morph_head_pilot: do not set All_Fennimal_Sets; Fennimals are synthesized from phase.heads."
            );
        }
        let heads = [];
        let seen = {};
        let rawHeads = phases[0].heads;
        if (!Array.isArray(rawHeads) || rawHeads.length < 2) {
            throw new Error("morph_head_pilot: phase.heads must list at least two SVG head ids.");
        }
        rawHeads.forEach((item, i) => {
            let name = String(item == null ? "" : item).trim().replace(/^Fennimal_head_/, "");
            if (!name) throw new Error("morph_head_pilot: heads[" + i + "] is empty.");
            if (seen[name]) throw new Error('morph_head_pilot: duplicate head "' + name + '".');
            seen[name] = true;
            heads.push(name);
        });
        phases[0].heads = heads;
        this.literal_svg_heads = true;
        this.forced_heads = heads.slice();
        this.Fennimal_Dictionary = {};
        heads.forEach((name) => {
            this.Fennimal_Dictionary[name] = { head: name, region: "A" };
        });
    }

morph_head_pilot: ["demographics_questionnaire"],

// Wiring: 2_Top_controller.js setupMorphHeadPilotPhase +
// 3_InstructionsController.js initializeMorphHeadPilotInstructions +
// archive/tasks/morph_head_pilot/4_MorphHeadPilotTask.js
