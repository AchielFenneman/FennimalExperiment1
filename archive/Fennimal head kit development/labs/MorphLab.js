/**
 * Morph Lab — local stimulus QA for head morphs.
 * Reuses MorphTaskController raster / align / blend pipeline from 4_MorphTask.js.
 */
(function () {
    "use strict";

    function bootError(message) {
        let el = document.getElementById("statusLine");
        if (el) el.textContent = message;
        console.error(message);
    }

    if (typeof MorphTaskController === "undefined") {
        bootError("Boot error: MorphTaskController not loaded (check 4_MorphTask.js).");
        return;
    }

    const DEFAULT_HEADS = ["tomato", "bun", "bell", "cloud"];
    const KIT_DEFAULT_HEADS = ["mechanical", "sweet", "sea"];
    const DEFAULT_MIXES = [50, 55, 60, 65];
    const SVG_MORPH_KINDS = ["kit", "overlay_fade"];
    const MORPH_KINDS = ["kit", "overlay_fade", "crossfade", "split", "interlace", "mesh", "mesh_landmark", "feature_anchored_mesh", "layer_morph", "mesh_shell", "composite_morph", "mesh_regions", "mean_shape", "beier_neely", "silhouette"];
    const SHELVED_MORPH_KINDS = ["interlace", "mesh", "mesh_landmark", "feature_anchored_mesh", "layer_morph", "mesh_shell", "composite_morph", "mesh_regions", "mean_shape"];
    const RASTER_MORPH_KINDS = MORPH_KINDS.filter((k) => SVG_MORPH_KINDS.indexOf(k) < 0);
    // Live semantic_learning_kit jumble: shell + eyes + stamp vs ears + mouth.
    const KIT_EVEN_3_SLOTS = ["shell", "eye", "stamp"];
    const KIT_EVEN_2_SLOTS = ["ear", "lowerFace"];
    const KIT_LIVE_JUMBLE = { shell: "A", ear: "B", eye: "A", lowerFace: "B", hair: "A", stamp: "A" };

    function MorphLabRenderer() {
        this.params = Object.assign({}, (typeof GenParam !== "undefined" && GenParam.MorphTask) || {});
    }

    MorphLabRenderer.prototype = Object.create(MorphTaskController.prototype);
    MorphLabRenderer.prototype.constructor = MorphLabRenderer;

    MorphLabRenderer.prototype._fen = function (headId) {
        return { id: headId, head: headId };
    };

    /**
     * Build morph pair data and render at mix m (0–1) into a new canvas.
     */
    MorphLabRenderer.prototype.renderMorphCanvas = async function (headA, headB, morph, mixPercent, targetHead) {
        const targetIsA = targetHead === headA;
        const trial = {
            morph: morph,
            mix: mixPercent,
            targetFen: this._fen(targetIsA ? headA : headB),
            otherFen: this._fen(targetIsA ? headB : headA)
        };

        let size = Math.max(200, Math.round(this._num("meshRasterSize", 400)));
        let schemes = this._schemesForMorphTrial(trial);
        let kind = morph;
        if (MORPH_KINDS.indexOf(kind) < 0) kind = "crossfade";

        let raw = await this._loadMorphRasterPair(
            trial.targetFen, schemes.target, trial.otherFen, schemes.other
        );

        let threshold = Math.max(1, Math.min(255, Math.round(this._num("meshAlphaThreshold", 18))));
        let aligned = this._alignMorphSources(raw[0], raw[1], size, threshold);
        let target = aligned.target;
        let other = aligned.other;
        let fillGray = this._meanOpaqueGray([target.canvas, other.canvas], threshold);
        let contourCount = Math.max(12, Math.round(this._num("meshContourPoints", 48)));
        let innerFrac = Math.max(0, Math.min(0.9, this._num("meshInnerRingFrac", 0.55)));
        let center = aligned.frame.eyeMid;
        let landmarkSlots = this._sharedMorphLandmarkSlots(target, other);
        target.points = this._homologousMeshPoints(
            target, center, contourCount, innerFrac, threshold, landmarkSlots
        );
        other.points = this._homologousMeshPoints(
            other, center, contourCount, innerFrac, threshold, landmarkSlots
        );

        let triangles = null;
        let sparseTriangles = null;
        let otherLines = null;
        let targetLines = null;

        if (kind === "mesh" || kind === "mesh_landmark" || kind === "feature_anchored_mesh"
            || kind === "layer_morph" || kind === "mesh_shell" || kind === "composite_morph"
            || kind === "mesh_regions") {
            let average = other.points.map((p, i) => ({
                x: (p.x + target.points[i].x) / 2,
                y: (p.y + target.points[i].y) / 2
            }));
            triangles = this._meshDelaunay(average);
            if (!triangles.length) {
                console.warn("MorphLab: mesh fell back to crossfade for", headA, headB);
                kind = "crossfade";
                triangles = null;
            }
        }

        if (kind === "mean_shape") {
            target.sparsePoints = this._sparseMorphPoints(target, center, contourCount, threshold);
            other.sparsePoints = this._sparseMorphPoints(other, center, contourCount, threshold);
            let average = other.sparsePoints.map((p, i) => ({
                x: (p.x + target.sparsePoints[i].x) / 2,
                y: (p.y + target.sparsePoints[i].y) / 2
            }));
            sparseTriangles = this._meshDelaunay(average);
            if (!sparseTriangles.length) {
                console.warn("MorphLab: mean_shape fell back to crossfade for", headA, headB);
                kind = "crossfade";
                sparseTriangles = null;
            }
        }

        if (kind === "beier_neely") {
            otherLines = this._buildBeierNeelyLines(other, contourCount);
            targetLines = this._buildBeierNeelyLines(target, contourCount);
            if (!otherLines.length || otherLines.length !== targetLines.length) {
                console.warn("MorphLab: beier_neely fell back to crossfade for", headA, headB);
                kind = "crossfade";
                otherLines = null;
                targetLines = null;
            }
        }

        if (kind === "silhouette") {
            let blur = Math.max(0, Math.round(this._num("silhouetteSdfBlur", 1)));
            target.sdf = this._blurSignedDistance(
                this._signedDistanceFromAlpha(target.canvas, threshold), size, blur
            );
            other.sdf = this._blurSignedDistance(
                this._signedDistanceFromAlpha(other.canvas, threshold), size, blur
            );
        }

        let pair = {
            size,
            target,
            other,
            triangles: kind === "mean_shape" ? sparseTriangles : triangles,
            otherLines,
            targetLines,
            fillGray,
            renderer: kind,
            headTarget: headA,
            headOther: headB
        };

        if (kind === "layer_morph") {
            this._prepareLayerMorphPair(target, other);
        }

        if (kind === "composite_morph") {
            target.compositeLayers = await this._buildCompositeLayerSet(
                trial.targetFen, schemes.target, size
            );
            other.compositeLayers = await this._buildCompositeLayerSet(
                trial.otherFen, schemes.other, size
            );
            let compositeSetup = this._prepareCompositePair(target, other, landmarkSlots);
            if (!compositeSetup) {
                console.warn("MorphLab: composite_morph fell back to layer_morph for", headA, headB);
                kind = "layer_morph";
                pair.renderer = kind;
                this._prepareLayerMorphPair(target, other);
            } else {
                Object.assign(pair, compositeSetup);
            }
        }

        if (kind === "mesh_regions") {
            let regionSetup = this._prepareMeshRegionsPair(target, other, landmarkSlots);
            if (!regionSetup) {
                console.warn("MorphLab: mesh_regions fell back to mesh for", headA, headB);
                kind = "mesh";
                pair.renderer = kind;
                let average = other.points.map((p, i) => ({
                    x: (p.x + target.points[i].x) / 2,
                    y: (p.y + target.points[i].y) / 2
                }));
                pair.triangles = this._meshDelaunay(average);
            } else {
                Object.assign(pair, regionSetup);
            }
        }

        if (kind === "feature_anchored_mesh") {
            let profile = this._morphPairProfile(headA, headB);
            let anchoredSetup = this._prepareFeatureAnchoredPair(target, other, profile, headA, headB);
            if (!anchoredSetup) {
                console.warn("MorphLab: feature_anchored_mesh fell back to mesh_landmark for", headA, headB);
                kind = "mesh_landmark";
                pair.renderer = kind;
            } else {
                Object.assign(pair, anchoredSetup);
                pair.shellProfile = profile;
            }
        }

        if (kind === "mesh_shell") {
            let profile = this._morphPairProfile(headA, headB);
            let shellSetup = this._prepareMeshShellPair(target, other, profile);
            if (!shellSetup) {
                console.warn("MorphLab: mesh_shell fell back to layer_morph for", headA, headB);
                kind = "layer_morph";
                pair.renderer = kind;
                this._prepareLayerMorphPair(target, other);
            } else {
                Object.assign(pair, shellSetup);
            }
        }

        let canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        this.morphCanvas = canvas;
        this.morphPair = pair;
        this.meshData = pair;
        this.activeRenderer = kind;
        this.morphRenderTrial = trial;
        if (kind === "interlace") {
            // Scale band height so stripes stay visible after thumb downscale.
            let visStripePx = Math.max(2, Math.round(this._num("interlaceVisStripePx", 3)));
            let rowH = Math.max(4, Math.round(visStripePx * size / THUMB_PX));
            let savedRowH = this.params.interlaceRowHeight;
            this.params.interlaceRowHeight = rowH;
            this._interlaceCanvases(other.canvas, target.canvas, mixPercent / 100, canvas);
            this.params.interlaceRowHeight = savedRowH;
        } else {
            this._applyMorph(mixPercent / 100);
        }
        return canvas;
    };

    /** Parent head at mix 0 / 100 for flanking reference. */
    MorphLabRenderer.prototype.renderParentCanvas = async function (headId) {
        return this.renderMorphCanvas(headId, headId, "crossfade", 100, headId);
    };

    MorphLabRenderer.prototype.residualMetrics = function (canvas, headA, headB, targetHead) {
        let size = canvas.width;
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        let morphData = ctx.getImageData(0, 0, size, size).data;
        // Cheap diagnostic: compare morph to each parent at same mix endpoints.
        // Full async parent fetch is done by caller when building the grid.
        return {
            target: targetHead,
            note: "residual_vs_parents_computed_in_grid"
        };
    };

    function parseList(raw, fallback) {
        if (!raw || !String(raw).trim()) return fallback.slice();
        return String(raw)
            .split(/[,;\s]+/)
            .map((s) => s.trim().replace(/^Fennimal_head_/, ""))
            .filter(Boolean);
    }

    function parseMixes(raw) {
        let mixes = parseList(raw, DEFAULT_MIXES).map((s) => Number(s));
        mixes = mixes.filter((n) => Number.isFinite(n) && n >= 1 && n <= 99);
        mixes = mixes.filter((n, i) => mixes.indexOf(n) === i);
        mixes.sort((a, b) => a - b);
        return mixes.length ? mixes : DEFAULT_MIXES.slice();
    }

    function orderedPairs(heads) {
        let pairs = [];
        for (let i = 0; i < heads.length; i++) {
            for (let j = i + 1; j < heads.length; j++) {
                pairs.push([heads[i], heads[j]]);
            }
        }
        return pairs;
    }

    function ladderColumns(mixes) {
        let cols = [];
        let above = [];
        let below = [];
        let has50 = false;
        mixes.forEach((mix) => {
            if (mix === 50) {
                has50 = true;
                return;
            }
            if (mix > 50) {
                above.push(mix);
            } else {
                below.push(mix);
            }
        });
        above.sort((a, b) => b - a);
        below.sort((a, b) => b - a);
        above.forEach((mix) => {
            cols.push({ mix, target: "A", label: mix + "% \u2192 A" });
        });
        if (has50) {
            cols.push({ mix: 50, target: null, label: "50 / 50" });
        }
        below.forEach((mix) => {
            cols.push({ mix, target: "B", label: mix + "% \u2192 B" });
        });
        above.slice().reverse().forEach((mix) => {
            cols.push({ mix, target: "B", label: mix + "% \u2192 B" });
        });
        return cols;
    }

    function residualEnergy(morphPx, parentPx) {
        let n = 0;
        let sum = 0;
        for (let i = 0; i < morphPx.length; i += 4) {
            let aM = morphPx[i + 3];
            if (aM < 12) continue;
            let aP = parentPx[i + 3];
            if (aP < 12) continue;
            let dr = morphPx[i] - parentPx[i];
            let dg = morphPx[i + 1] - parentPx[i + 1];
            let db = morphPx[i + 2] - parentPx[i + 2];
            sum += dr * dr + dg * dg + db * db;
            n++;
        }
        return n ? sum / n : null;
    }

    function ensureTemplateLayer() {
        let allHeads = document.getElementById("All_Heads");
        if (allHeads) return allHeads;
        let ns = "http://www.w3.org/2000/svg";
        let svg = document.createElementNS(ns, "svg");
        svg.setAttribute("width", "0");
        svg.setAttribute("height", "0");
        svg.style.position = "absolute";
        svg.style.left = "-9999px";
        svg.style.top = "0";
        svg.style.overflow = "hidden";
        let templates = document.createElementNS(ns, "g");
        templates.id = "Fennimal_Templates_Layer";
        allHeads = document.createElementNS(ns, "g");
        allHeads.id = "All_Heads";
        templates.appendChild(allHeads);
        svg.appendChild(templates);
        document.body.appendChild(svg);
        return allHeads;
    }

    async function loadHeadTemplates() {
        let allHeads = ensureTemplateLayer();
        if (document.getElementById("Fennimal_head_tomato")) return;

        let hidden = document.createElement("div");
        hidden.style.display = "none";
        document.body.appendChild(hidden);

        let response = await fetch("../../../SVG/Heads.svg?v=" + Date.now(), { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load SVG/Heads.svg");
        hidden.innerHTML = await response.text();

        let raw = hidden.getElementsByClassName("Fennimal_head");
        let heads = [];
        for (let i = 0; i < raw.length; i++) {
            heads.push(raw[i]);
        }
        heads.forEach((head) => {
            if (typeof set_Fennimal_color_classes === "function") {
                set_Fennimal_color_classes(head);
            }
            allHeads.appendChild(head);
        });
        hidden.remove();
    }

    function reverseKitJumble(jumble) {
        let out = {};
        Object.keys(jumble || {}).forEach((slot) => {
            let v = jumble[slot];
            out[slot] = v === "A" ? "B" : (v === "B" ? "A" : v);
        });
        return out;
    }

    function prettySlots(keys) {
        return (keys || []).map((k) => k === "lowerFace" ? "mouth" : k).join(" · ");
    }

    function kitJumbleHint(jumble, headA, headB) {
        let fromA = [];
        let fromB = [];
        Object.keys(jumble || {}).forEach((slot) => {
            if (slot === "hair") return;
            if (jumble[slot] === "A") fromA.push(slot);
            else if (jumble[slot] === "B") fromB.push(slot);
        });
        return prettySlots(fromA) + " \u2190 " + headA + "  ·  " + prettySlots(fromB) + " \u2190 " + headB;
    }

    function mixTowardAFromColumn(col) {
        if (!col || col.mix === 50 || !col.target) return 0.5;
        let t = col.mix / 100;
        return col.target === "B" ? (1 - t) : t;
    }

    function familyRecipeFor(theme) {
        if (typeof FeatureKit === "undefined") {
            throw new Error("FeatureKit.js is required for overlay kit morphs.");
        }
        return FeatureKit.shared().normalizeRecipe(FeatureKit.shared().familyRecipe(theme));
    }

    async function loadKitFamilies(themes) {
        if (typeof FeatureKit === "undefined") {
            throw new Error("FeatureKit.js is required for overlay kit morphs.");
        }
        ensureTemplateLayer();
        let kit = FeatureKit.shared();
        await kit.ensureLoaded();
        let recipes = {};
        (themes || []).forEach((theme) => {
            recipes[theme] = familyRecipeFor(theme);
        });
        kit.registerRoster(recipes);
        return kit;
    }

    function prepareKitThumb(svg, opts) {
        if (!svg) return svg;
        opts = opts || {};
        if (opts.candles !== false && typeof apply_kit_candle_flames === "function") {
            apply_kit_candle_flames(svg, { dance: false, lit: true });
        }
        if (typeof freeze_fennimal_decorative_animations === "function") {
            freeze_fennimal_decorative_animations(svg);
        }
        svg.classList.add("morph-output", "morph-output-kit");
        svg.setAttribute("width", "188");
        svg.setAttribute("height", "188");
        svg.removeAttribute("xmlns");
        return svg;
    }

    function applyKitPaletteGray(svg) {
        if (!svg) return svg;
        if (typeof set_Fennimal_color_classes === "function") set_Fennimal_color_classes(svg);
        let s = (typeof GenParam !== "undefined" && GenParam.MorphTask && GenParam.MorphTask.grayscaleScheme) || {};
        let scheme = {
            primary_color: s.primary_color || "#c4c4c4",
            secondary_color: s.secondary_color || "#8e8e8e",
            tertiary_color: s.tertiary_color || "#5a5a5a",
            eye_color: s.eye_color || "#3a3a3a"
        };
        if (typeof set_fill_for_all_elements_in_array !== "function") {
            svg.style.filter = "grayscale(100%)";
            return svg;
        }
        set_fill_for_all_elements_in_array(svg.getElementsByClassName("Fennimal_primary_color"), scheme.primary_color);
        set_fill_for_all_elements_in_array(svg.getElementsByClassName("Fennimal_secondary_color"), scheme.secondary_color);
        set_fill_for_all_elements_in_array(svg.getElementsByClassName("Fennimal_tertiary_color"), scheme.tertiary_color);
        set_fill_for_all_elements_in_array(svg.getElementsByClassName("Fennimal_eye_color"), scheme.eye_color);
        return svg;
    }

    function composeKitThumb(recipe, gray, paletteGray) {
        let kit = FeatureKit.shared();
        let composed = kit.composeSvg(recipe, { showMarkers: false, width: "188", height: "188" });
        prepareKitThumb(composed.svg);
        if (gray) {
            if (paletteGray) applyKitPaletteGray(composed.svg);
            else composed.svg.style.filter = "grayscale(100%)";
        }
        return composed.svg;
    }

    function composeOverlayFadeThumb(headA, headB, mixTowardA, gray) {
        let kit = FeatureKit.shared();
        let composed = kit.composeOverlayFadeSvg(
            familyRecipeFor(headA),
            familyRecipeFor(headB),
            mixTowardA,
            { showMarkers: false, width: "188", height: "188" }
        );
        prepareKitThumb(composed.svg, { candles: false });
        composed.svg.classList.add("morph-output-overlay-fade");
        if (gray) applyKitPaletteGray(composed.svg);
        return composed.svg;
    }

    function mixKitPair(headA, headB, jumble) {
        let recipes = {};
        recipes.A = familyRecipeFor(headA);
        recipes.B = familyRecipeFor(headB);
        return FeatureKit.mixFromSlotMap(recipes, jumble);
    }

    function assertHeadsExist(heads) {
        let missing = heads.filter((h) => !document.getElementById("Fennimal_head_" + h));
        if (missing.length) {
            throw new Error("Missing head template(s): " + missing.join(", "));
        }
    }

    function readUrlConfig() {
        try {
            let params = new URL(window.location.href).searchParams;
            if (params.get("source") === "svg" || params.get("source") === "kit") {
                document.getElementById("sourceInput").value = params.get("source");
            }
            if (params.get("heads")) {
                document.getElementById("headsInput").value = params.get("heads");
            }
            if (params.get("mixes")) {
                document.getElementById("mixesInput").value = params.get("mixes");
            }
            if (params.get("blind") === "1") {
                document.getElementById("blindInput").checked = true;
            }
            if (params.get("gray") === "0") {
                document.getElementById("grayInput").checked = false;
            }
            let morphs = params.get("morphs");
            if (morphs) {
                let wanted = new Set(parseList(morphs, MORPH_KINDS));
                document.querySelectorAll('input[name="morph"]').forEach((el) => {
                    el.checked = wanted.has(el.value);
                });
            }
        } catch (e) { /* ignore */ }
    }

    function canvasToImg(canvas) {
        let img = document.createElement("img");
        img.src = canvas.toDataURL("image/png");
        img.alt = "";
        img.width = THUMB_PX;
        img.height = THUMB_PX;
        return img;
    }

    const THUMB_PX = 188;

    function canvasToDisplay(canvas, morphKind) {
        if (morphKind === "interlace") {
            // Nearest-neighbor downscale keeps horizontal bands crisp at thumb size.
            let thumb = document.createElement("canvas");
            thumb.width = THUMB_PX;
            thumb.height = THUMB_PX;
            let ctx = thumb.getContext("2d");
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(canvas, 0, 0, THUMB_PX, THUMB_PX);
            thumb.className = "morph-output morph-output-interlace";
            thumb.style.width = THUMB_PX + "px";
            thumb.style.height = THUMB_PX + "px";
            thumb.style.imageRendering = "pixelated";
            return thumb;
        }
        canvas.className = "morph-output" + (morphKind ? " morph-output-" + morphKind : "");
        canvas.style.width = THUMB_PX + "px";
        canvas.style.height = THUMB_PX + "px";
        return canvas;
    }

    function makeCell(labelText, visual, extraClass, hint) {
        let cell = document.createElement("div");
        cell.className = "morph-cell" + (extraClass ? " " + extraClass : "");
        visual.setAttribute("title", "Click to enlarge");
        cell.appendChild(visual);
        let label = document.createElement("div");
        label.className = "cell-label" + (/\bparent\b/.test(extraClass || "") ? " parent-label" : "");
        label.textContent = labelText;
        if (hint) {
            let span = document.createElement("span");
            span.className = "hint";
            span.textContent = hint;
            label.appendChild(span);
        }
        cell.appendChild(label);
        return cell;
    }

    async function buildGrid(options) {
        let renderer = new MorphLabRenderer();
        let gridRoot = document.getElementById("gridRoot");
        gridRoot.innerHTML = "";
        let pairs = orderedPairs(options.heads);
        let kitMorphs = options.morphs.filter((m) => m === "kit");
        let fadeMorphs = options.morphs.filter((m) => m === "overlay_fade");
        let rasterMorphs = options.morphs.filter((m) => m !== "kit" && m !== "overlay_fade");
        let rasterColumns = ladderColumns(options.mixes);
        let kitColumns = [
            { id: "E", jumble: KIT_LIVE_JUMBLE, label: "E · 3-side A", three: "A" },
            { id: "Ep", jumble: reverseKitJumble(KIT_LIVE_JUMBLE), label: "E\u2032 · 3-side B", three: "B" }
        ];
        let total = pairs.length * (
            (kitMorphs.length ? ((options.showParents ? 2 : 0) + kitColumns.length) : 0)
            + (fadeMorphs.length ? ((options.showParents ? 2 : 0) + rasterColumns.length) : 0)
            + (rasterMorphs.length ? (2 + rasterColumns.length * rasterMorphs.length) : 0)
        );
        let done = 0;

        function tick(msg) {
            done++;
            options.onStatus("Rendering " + done + " / " + Math.max(1, total) + (msg ? " — " + msg : ""));
        }

        if (kitMorphs.length || fadeMorphs.length || options.source === "kit") {
            await loadKitFamilies(options.heads);
        }

        for (let pi = 0; pi < pairs.length; pi++) {
            let headA = pairs[pi][0];
            let headB = pairs[pi][1];
            let pairBlock = document.createElement("section");
            pairBlock.className = "pair-block" + (options.blind ? " is-blind" : "");
            pairBlock.dataset.pair = headA + "__" + headB;

            let title = document.createElement("h2");
            title.className = "pair-title";
            title.textContent = headA + " \u00d7 " + headB;
            if (kitMorphs.length) {
                let note = document.createElement("div");
                note.className = "jumble-chip";
                note.textContent = "Live split: " + prettySlots(KIT_EVEN_3_SLOTS) + " vs " + prettySlots(KIT_EVEN_2_SLOTS) + ". Reverse swaps every slot.";
                title.appendChild(note);
            }
            if (fadeMorphs.length) {
                let note = document.createElement("div");
                note.className = "jumble-chip";
                note.textContent = "Overlay fade: one baseline shell (no stacked textures). Unique frills swing toward either parent.";
                title.appendChild(note);
            }
            pairBlock.appendChild(title);

            let parentA = null;
            let parentB = null;
            let parentACtx = null;
            let parentBCtx = null;
            if (rasterMorphs.length) {
                parentA = await renderer.renderParentCanvas(headA);
                tick(headA);
                parentB = await renderer.renderParentCanvas(headB);
                tick(headB);
                parentACtx = parentA.getContext("2d").getImageData(0, 0, parentA.width, parentA.height).data;
                parentBCtx = parentB.getContext("2d").getImageData(0, 0, parentB.width, parentB.height).data;
            }

            if (kitMorphs.length) {
                let methodBlock = document.createElement("div");
                methodBlock.className = "method-block";
                let methodTitle = document.createElement("h3");
                methodTitle.className = "method-title";
                methodTitle.textContent = "kit jumble";
                methodBlock.appendChild(methodTitle);

                let row = document.createElement("div");
                row.className = "ladder-row";
                let gray = !!options.gray;

                if (options.showParents) {
                    row.appendChild(makeCell(headA, composeKitThumb(familyRecipeFor(headA), gray), "parent kit"));
                    tick(headA + " kit parent");
                }
                kitColumns.forEach((col, ci) => {
                    let mixed = mixKitPair(headA, headB, col.jumble);
                    let hint = options.blind ? "" : kitJumbleHint(col.jumble, headA, headB);
                    let label = options.blind ? "???" : col.label;
                    row.appendChild(makeCell(label, composeKitThumb(mixed, gray), "kit", hint));
                    let cell = row.lastElementChild;
                    cell.dataset.ladderOrder = String(ci);
                    cell.dataset.truth = col.label;
                    cell.dataset.hint = hint;
                    cell.dataset.target = col.three === "B" ? headB : headA;
                    cell.dataset.morph = "kit";
                    tick(col.label);
                });
                if (options.showParents) {
                    row.appendChild(makeCell(headB, composeKitThumb(familyRecipeFor(headB), gray), "parent kit"));
                    tick(headB + " kit parent");
                }
                methodBlock.appendChild(row);
                pairBlock.appendChild(methodBlock);
            }

            if (fadeMorphs.length) {
                let methodBlock = document.createElement("div");
                methodBlock.className = "method-block";
                let methodTitle = document.createElement("h3");
                methodTitle.className = "method-title";
                methodTitle.textContent = "overlay fade";
                methodBlock.appendChild(methodTitle);

                let row = document.createElement("div");
                row.className = "ladder-row";
                let gray = !!options.gray;

                if (options.showParents) {
                    row.appendChild(makeCell(headA, composeKitThumb(familyRecipeFor(headA), gray, true), "parent kit"));
                    tick(headA + " overlay-fade parent");
                }
                rasterColumns.forEach((col, ci) => {
                    let mixTowardA = mixTowardAFromColumn(col);
                    let targetHead = col.target === "B" ? headB : headA;
                    if (col.mix === 50) targetHead = headA;
                    let hint = options.blind
                        ? ""
                        : ("no shell texture · " + headA + " " + Math.round(mixTowardA * 100)
                            + "% · " + headB + " " + Math.round((1 - mixTowardA) * 100) + "%");
                    let label = options.blind ? "???" : col.label;
                    row.appendChild(makeCell(
                        label,
                        composeOverlayFadeThumb(headA, headB, mixTowardA, gray),
                        "kit overlay-fade",
                        hint
                    ));
                    let cell = row.lastElementChild;
                    cell.dataset.ladderOrder = String(ci);
                    cell.dataset.truth = col.label;
                    cell.dataset.hint = hint;
                    cell.dataset.target = targetHead;
                    cell.dataset.morph = "overlay_fade";
                    tick(col.label + " overlay_fade");
                });
                if (options.showParents) {
                    row.appendChild(makeCell(headB, composeKitThumb(familyRecipeFor(headB), gray, true), "parent kit"));
                    tick(headB + " overlay-fade parent");
                }
                methodBlock.appendChild(row);
                pairBlock.appendChild(methodBlock);
            }

            for (let mi = 0; mi < rasterMorphs.length; mi++) {
                let morph = rasterMorphs[mi];
                let methodBlock = document.createElement("div");
                methodBlock.className = "method-block";

                let methodTitle = document.createElement("h3");
                methodTitle.className = "method-title";
                methodTitle.textContent = (morph === "crossfade" && options.source === "kit")
                    ? "crossfade (locked overlap)"
                    : (morph === "split" ? "split (left/right clip)" : morph);
                methodBlock.appendChild(methodTitle);

                let row = document.createElement("div");
                row.className = "ladder-row";

                if (options.showParents) {
                    row.appendChild(makeCell(headA, canvasToImg(parentA), "parent"));
                }

                for (let ci = 0; ci < rasterColumns.length; ci++) {
                    let col = rasterColumns[ci];
                    let targetHead = col.target === "B" ? headB : headA;
                    if (col.mix === 50) targetHead = headA;

                    let canvas = await renderer.renderMorphCanvas(
                        headA, headB, morph, col.mix, targetHead
                    );
                    tick(col.label + " " + morph);

                    let morphPx = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
                    let eA = residualEnergy(morphPx, parentACtx);
                    let eB = residualEnergy(morphPx, parentBCtx);
                    let delta = (eA != null && eB != null) ? Math.abs(eA - eB) : null;
                    let hint = "";
                    if (eA != null && eB != null) {
                        let fav = eA < eB ? "A" : "B";
                        hint = "\u0394res " + (delta != null ? Math.round(delta) : "?") + " fav " + fav;
                    }

                    let displayLabel = options.blind ? "???" : col.label;
                    let hintText = options.blind ? "" : hint;
                    row.appendChild(makeCell(displayLabel, canvasToDisplay(canvas, morph), morph, hintText));
                    let cell = row.lastElementChild;
                    cell.dataset.ladderOrder = String(ci);
                    cell.dataset.truth = col.label;
                    cell.dataset.hint = hint;
                    cell.dataset.target = targetHead;
                    cell.dataset.morph = morph;
                }

                if (options.showParents) {
                    row.appendChild(makeCell(headB, canvasToImg(parentB), "parent"));
                }

                methodBlock.appendChild(row);
                pairBlock.appendChild(methodBlock);
            }

            gridRoot.appendChild(pairBlock);
        }

        options.onStatus("Done — " + pairs.length + " pair(s), " + options.morphs.length + " method(s).");
        return gridRoot;
    }

    function svgToImage(svg) {
        return new Promise((resolve, reject) => {
            let xml = new XMLSerializer().serializeToString(svg);
            let img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Could not rasterize kit SVG for export."));
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
        });
    }

    async function exportSheet() {
        let gridRoot = document.getElementById("gridRoot");
        let blocks = gridRoot.querySelectorAll(".pair-block");
        if (!blocks.length) return;

        let pad = 24;
        let cell = 200;
        let labelH = 36;
        let rowH = cell + labelH + 12;
        let maxCols = 0;
        blocks.forEach((block) => {
            block.querySelectorAll(".ladder-row").forEach((row) => {
                maxCols = Math.max(maxCols, row.querySelectorAll(".morph-cell").length);
            });
        });

        let sheetW = pad * 2 + maxCols * (cell + 8);
        let sheetH = pad * 2;
        blocks.forEach((block) => {
            sheetH += 48;
            sheetH += block.querySelectorAll(".method-block").length * rowH;
            sheetH += 16;
        });

        let sheet = document.createElement("canvas");
        sheet.width = sheetW;
        sheet.height = sheetH;
        let ctx = sheet.getContext("2d");
        ctx.fillStyle = "#f4f1ea";
        ctx.fillRect(0, 0, sheetW, sheetH);

        let y = pad;
        ctx.fillStyle = "#1f2a33";
        ctx.font = "600 16px 'Source Sans 3', sans-serif";

        for (let bi = 0; bi < blocks.length; bi++) {
            let block = blocks[bi];
            ctx.fillText(block.querySelector(".pair-title").textContent.split("\n")[0], pad, y + 14);
            y += 32;

            let methods = block.querySelectorAll(".method-block");
            for (let mi = 0; mi < methods.length; mi++) {
                let method = methods[mi];
                ctx.font = "600 12px 'Source Sans 3', sans-serif";
                ctx.fillStyle = "#4a5560";
                ctx.fillText(method.querySelector(".method-title").textContent, pad, y + 10);
                y += 18;

                let row = method.querySelector(".ladder-row");
                let cells = row.querySelectorAll(".morph-cell");
                let x = pad;
                for (let ci = 0; ci < cells.length; ci++) {
                    let visual = cells[ci].querySelector("canvas, img, svg");
                    if (visual) {
                        if (visual.tagName === "svg" || visual.tagName === "SVG") {
                            try {
                                let img = await svgToImage(visual);
                                ctx.drawImage(img, x, y, cell, cell);
                            } catch (err) { /* skip */ }
                        } else if (visual.complete !== false) {
                            ctx.drawImage(visual, x, y, cell, cell);
                        }
                    }
                    let label = cells[ci].querySelector(".cell-label");
                    ctx.font = "11px 'Source Sans 3', sans-serif";
                    ctx.fillStyle = "#4a5560";
                    ctx.fillText(label.textContent.split("\n")[0], x, y + cell + 14);
                    x += cell + 8;
                }
                y += rowH;
            }
            y += 12;
        }

        let link = document.createElement("a");
        link.download = "morph_lab_" + Date.now() + ".png";
        link.href = sheet.toDataURL("image/png");
        link.click();
    }

    function morphCellsInRow(row) {
        return Array.from(row.querySelectorAll(".morph-cell")).filter((c) => !c.classList.contains("parent"));
    }

    function shuffleArrayInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    }

    function shuffleLadderRows() {
        let rows = document.querySelectorAll(".ladder-row");
        if (!rows.length) return 0;
        rows.forEach((row) => {
            let morphCells = morphCellsInRow(row);
            let shuffled = shuffleArrayInPlace(morphCells.slice());
            let anchor = row.querySelector(".morph-cell.parent:last-of-type");
            morphCells.forEach((c) => c.remove());
            if (anchor) {
                shuffled.forEach((c) => row.insertBefore(c, anchor));
            } else {
                shuffled.forEach((c) => row.appendChild(c));
            }
            row.dataset.shuffled = "1";
        });
        return rows.length;
    }

    function restoreLadderRows() {
        let rows = document.querySelectorAll(".ladder-row");
        if (!rows.length) return 0;
        rows.forEach((row) => {
            let morphCells = morphCellsInRow(row);
            morphCells.sort((a, b) => Number(a.dataset.ladderOrder) - Number(b.dataset.ladderOrder));
            let anchor = row.querySelector(".morph-cell.parent:last-of-type");
            morphCells.forEach((c) => c.remove());
            if (anchor) {
                morphCells.forEach((c) => row.insertBefore(c, anchor));
            } else {
                morphCells.forEach((c) => row.appendChild(c));
            }
            row.dataset.shuffled = "0";
        });
        return rows.length;
    }

    function anyRowShuffled() {
        return Array.from(document.querySelectorAll(".ladder-row")).some((row) => row.dataset.shuffled === "1");
    }

    function updateOrderButtons(shuffleBtn, restoreOrderBtn) {
        let hasGrid = document.querySelectorAll(".ladder-row").length > 0;
        let revealed = document.querySelector(".pair-block.is-blind.revealed");
        shuffleBtn.disabled = !hasGrid || !!revealed;
        restoreOrderBtn.disabled = !hasGrid || !anyRowShuffled();
    }

    function currentSource() {
        let el = document.getElementById("sourceInput");
        return el && el.value === "svg" ? "svg" : "kit";
    }

    function syncSourceUi(resetHeads) {
        let kit = currentSource() === "kit";
        let headsLabel = document.getElementById("headsLabel");
        let headsInput = document.getElementById("headsInput");
        let mixesField = document.getElementById("mixesField");
        let grayToggle = document.getElementById("grayToggle");
        if (headsLabel) {
            headsLabel.textContent = kit ? "Families (comma-separated)" : "Heads (comma-separated SVG ids)";
        }
        if (mixesField) mixesField.hidden = false;
        if (grayToggle) grayToggle.hidden = !kit;
        document.querySelectorAll("[data-kit-method]").forEach((el) => { el.hidden = !kit; });
        document.querySelectorAll("[data-raster-method]").forEach((el) => {
            // Raster methods still work on registered overlay heads; keep them visible
            // but unchecked in kit mode so the live jumble is the default.
        });
        if (resetHeads && headsInput) {
            headsInput.value = kit ? KIT_DEFAULT_HEADS.join(",") : DEFAULT_HEADS.join(",");
        }
        let kitBox = document.querySelector('input[name="morph"][value="kit"]');
        let meshBox = document.querySelector('input[name="morph"][value="feature_anchored_mesh"]');
        if (kit && kitBox) kitBox.checked = true;
        if (!kit && kitBox) kitBox.checked = false;
        if (!kit && meshBox) {
            let anyRaster = Array.from(document.querySelectorAll("[data-raster-method] input")).some((el) => el.checked);
            if (!anyRaster) meshBox.checked = true;
        }
        if (kit && resetHeads) {
            document.querySelectorAll("[data-raster-method] input").forEach((el) => { el.checked = false; });
            let fadeBox = document.querySelector('input[name="morph"][value="overlay_fade"]');
            if (fadeBox) fadeBox.checked = false;
        }
    }

    async function init() {
        if (typeof GenParam === "undefined") {
            window.GenParam = new GENERALPARAM();
        }

        readUrlConfig();
        syncSourceUi(false);

        let statusLine = document.getElementById("statusLine");
        let renderBtn = document.getElementById("renderBtn");
        let shuffleBtn = document.getElementById("shuffleBtn");
        let restoreOrderBtn = document.getElementById("restoreOrderBtn");
        let revealBtn = document.getElementById("revealBtn");
        let exportBtn = document.getElementById("exportBtn");
        let sourceInput = document.getElementById("sourceInput");

        sourceInput.addEventListener("change", () => {
            syncSourceUi(true);
        });

        statusLine.textContent = currentSource() === "kit"
            ? "Loading overlay kit…"
            : "Loading head templates…";

        try {
            if (currentSource() === "kit") {
                let heads = parseList(document.getElementById("headsInput").value, KIT_DEFAULT_HEADS);
                await loadKitFamilies(heads);
            } else {
                await loadHeadTemplates();
            }
            statusLine.textContent = "Ready. Adjust settings and generate.";
        } catch (err) {
            statusLine.textContent = "Failed to load heads: " + err.message;
            renderBtn.disabled = true;
            return;
        }

        renderBtn.addEventListener("click", async () => {
            renderBtn.disabled = true;
            exportBtn.disabled = true;
            revealBtn.disabled = true;
            shuffleBtn.disabled = true;
            restoreOrderBtn.disabled = true;

            let source = currentSource();
            let fallbackHeads = source === "kit" ? KIT_DEFAULT_HEADS : DEFAULT_HEADS;
            let heads = parseList(document.getElementById("headsInput").value, fallbackHeads);
            let mixes = parseMixes(document.getElementById("mixesInput").value);
            let morphs = [];
            document.querySelectorAll('input[name="morph"]:checked').forEach((el) => {
                if (el.closest("[hidden]")) return;
                if (SHELVED_MORPH_KINDS.indexOf(el.value) >= 0) return;
                morphs.push(el.value);
            });
            if (source === "svg") morphs = morphs.filter((m) => m !== "kit" && m !== "overlay_fade");
            if (!morphs.length) morphs = source === "kit" ? ["kit"] : ["crossfade"];

            let blind = document.getElementById("blindInput").checked;
            let showParents = document.getElementById("parentsInput").checked;
            let gray = !!(document.getElementById("grayInput") && document.getElementById("grayInput").checked);

            try {
                if (source === "kit" || morphs.indexOf("kit") >= 0 || morphs.indexOf("overlay_fade") >= 0) {
                    await loadKitFamilies(heads);
                }
                if (source === "svg" || morphs.some((m) => RASTER_MORPH_KINDS.indexOf(m) >= 0)) {
                    if (source === "svg") await loadHeadTemplates();
                }
                assertHeadsExist(heads);
                await buildGrid({
                    source,
                    heads,
                    mixes,
                    morphs,
                    blind,
                    showParents,
                    gray,
                    onStatus: (msg) => { statusLine.textContent = msg; }
                });
                revealBtn.disabled = !blind;
                exportBtn.disabled = false;
                updateOrderButtons(shuffleBtn, restoreOrderBtn);
                if (blind) {
                    revealBtn.onclick = () => {
                        document.querySelectorAll(".morph-cell[data-truth]").forEach((cell) => {
                            let label = cell.querySelector(".cell-label");
                            if (!label) return;
                            label.textContent = cell.dataset.truth || "";
                            if (cell.dataset.hint) {
                                let span = document.createElement("span");
                                span.className = "hint";
                                span.textContent = cell.dataset.hint;
                                label.appendChild(span);
                            }
                        });
                        document.querySelectorAll(".pair-block.is-blind").forEach((el) => {
                            el.classList.add("revealed");
                        });
                        revealBtn.disabled = true;
                        updateOrderButtons(shuffleBtn, restoreOrderBtn);
                    };
                }
            } catch (err) {
                console.error(err);
                statusLine.textContent = "Error: " + err.message;
            } finally {
                renderBtn.disabled = false;
            }
        });

        shuffleBtn.addEventListener("click", () => {
            let n = shuffleLadderRows();
            if (!n) return;
            statusLine.textContent = "Shuffled " + n + " row(s) for silicon pass. Restore ladder order when done.";
            updateOrderButtons(shuffleBtn, restoreOrderBtn);
        });

        restoreOrderBtn.addEventListener("click", () => {
            let n = restoreLadderRows();
            if (!n) return;
            statusLine.textContent = "Restored ladder order in " + n + " row(s).";
            updateOrderButtons(shuffleBtn, restoreOrderBtn);
        });

        exportBtn.addEventListener("click", () => {
            exportSheet().catch((err) => {
                statusLine.textContent = "Export failed: " + err.message;
            });
        });

        bindHeadLightbox();
    }

    function cloneHeadVisual(visual) {
        if (!visual) return null;
        if (visual.tagName === "CANVAS") {
            let copy = document.createElement("canvas");
            copy.width = visual.width;
            copy.height = visual.height;
            copy.className = visual.className;
            copy.getContext("2d").drawImage(visual, 0, 0);
            return copy;
        }
        return visual.cloneNode(true);
    }

    function bindHeadLightbox() {
        let box = document.getElementById("headLightbox");
        let stage = box && box.querySelector(".head-lightbox-stage");
        let gridRoot = document.getElementById("gridRoot");
        if (!box || !stage || !gridRoot) return;

        function closeLightbox() {
            box.hidden = true;
            stage.innerHTML = "";
        }

        gridRoot.addEventListener("click", (e) => {
            let visual = e.target.closest(".morph-cell canvas, .morph-cell img, .morph-cell svg");
            if (!visual || visual.closest("#headLightbox")) return;
            let copy = cloneHeadVisual(visual);
            if (!copy) return;
            if (copy.tagName !== "CANVAS") {
                copy.removeAttribute("width");
                copy.removeAttribute("height");
            }
            copy.style.width = "";
            copy.style.height = "";
            stage.innerHTML = "";
            stage.appendChild(copy);
            box.hidden = false;
        });

        box.addEventListener("click", (e) => {
            if (e.target === box || e.target.closest(".head-lightbox-close")) closeLightbox();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !box.hidden) closeLightbox();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => init().catch((err) => bootError("Init failed: " + err.message)));
    } else {
        init().catch((err) => bootError("Init failed: " + err.message));
    }
})();
