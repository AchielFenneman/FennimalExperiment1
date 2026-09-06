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
    const DEFAULT_MIXES = [50, 55, 60, 65];
    const MORPH_KINDS = ["crossfade", "interlace", "mesh", "mesh_landmark", "feature_anchored_mesh", "layer_morph", "mesh_shell", "composite_morph", "mesh_regions", "mean_shape", "beier_neely", "silhouette"];

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

        let raw = await Promise.all([
            this._meshRasterSource(trial.targetFen, schemes.target),
            this._meshRasterSource(trial.otherFen, schemes.other)
        ]);

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

    async function loadHeadTemplates() {
        if (document.getElementById("All_Heads")) return;

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
        let allHeads = document.createElementNS(ns, "g");
        allHeads.id = "All_Heads";
        templates.appendChild(allHeads);
        svg.appendChild(templates);
        document.body.appendChild(svg);

        let hidden = document.createElement("div");
        hidden.style.display = "none";
        document.body.appendChild(hidden);

        let response = await fetch("./SVG/Heads.svg?v=" + Date.now(), { cache: "no-store" });
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

    function assertHeadsExist(heads) {
        let missing = heads.filter((h) => !document.getElementById("Fennimal_head_" + h));
        if (missing.length) {
            throw new Error("Missing head template(s): " + missing.join(", "));
        }
    }

    function readUrlConfig() {
        try {
            let params = new URL(window.location.href).searchParams;
            if (params.get("heads")) {
                document.getElementById("headsInput").value = params.get("heads");
            }
            if (params.get("mixes")) {
                document.getElementById("mixesInput").value = params.get("mixes");
            }
            if (params.get("blind") === "1") {
                document.getElementById("blindInput").checked = true;
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
        img.width = 104;
        img.height = 104;
        return img;
    }

    const THUMB_PX = 104;

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
        cell.appendChild(visual);
        let label = document.createElement("div");
        label.className = "cell-label" + (extraClass === "parent" ? " parent-label" : "");
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
        let columns = ladderColumns(options.mixes);
        let total = pairs.length * options.morphs.length * (2 + columns.length);
        let done = 0;

        function tick(msg) {
            done++;
            options.onStatus("Rendering " + done + " / " + total + (msg ? " — " + msg : ""));
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
            pairBlock.appendChild(title);

            let parentA = await renderer.renderParentCanvas(headA);
            tick(headA);
            let parentB = await renderer.renderParentCanvas(headB);
            tick(headB);

            let parentACtx = parentA.getContext("2d").getImageData(0, 0, parentA.width, parentA.height).data;
            let parentBCtx = parentB.getContext("2d").getImageData(0, 0, parentB.width, parentB.height).data;

            for (let mi = 0; mi < options.morphs.length; mi++) {
                let morph = options.morphs[mi];
                let methodBlock = document.createElement("div");
                methodBlock.className = "method-block";

                let methodTitle = document.createElement("h3");
                methodTitle.className = "method-title";
                methodTitle.textContent = morph;
                methodBlock.appendChild(methodTitle);

                let row = document.createElement("div");
                row.className = "ladder-row";

                if (options.showParents) {
                    row.appendChild(makeCell(headA, canvasToImg(parentA), "parent"));
                }

                for (let ci = 0; ci < columns.length; ci++) {
                    let col = columns[ci];
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

    async function exportSheet() {
        let gridRoot = document.getElementById("gridRoot");
        let blocks = gridRoot.querySelectorAll(".pair-block");
        if (!blocks.length) return;

        let pad = 24;
        let cell = 120;
        let labelH = 28;
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
            sheetH += 36;
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
            ctx.fillText(block.querySelector(".pair-title").textContent, pad, y + 14);
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
                    let img = cells[ci].querySelector("img");
                    if (img && img.complete) {
                        ctx.drawImage(img, x, y, cell, cell);
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

    async function init() {
        if (typeof GenParam === "undefined") {
            window.GenParam = new GENERALPARAM();
        }

        readUrlConfig();

        let statusLine = document.getElementById("statusLine");
        let renderBtn = document.getElementById("renderBtn");
        let shuffleBtn = document.getElementById("shuffleBtn");
        let restoreOrderBtn = document.getElementById("restoreOrderBtn");
        let revealBtn = document.getElementById("revealBtn");
        let exportBtn = document.getElementById("exportBtn");

        statusLine.textContent = "Loading head templates…";

        try {
            await loadHeadTemplates();
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

            let heads = parseList(document.getElementById("headsInput").value, DEFAULT_HEADS);
            let mixes = parseMixes(document.getElementById("mixesInput").value);
            let morphs = [];
            document.querySelectorAll('input[name="morph"]:checked').forEach((el) => {
                morphs.push(el.value);
            });
            if (!morphs.length) morphs = ["crossfade"];

            let blind = document.getElementById("blindInput").checked;
            let showParents = document.getElementById("parentsInput").checked;

            try {
                assertHeadsExist(heads);
                await buildGrid({
                    heads,
                    mixes,
                    morphs,
                    blind,
                    showParents,
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
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => init().catch((err) => bootError("Init failed: " + err.message)));
    } else {
        init().catch((err) => bootError("Init failed: " + err.message));
    }
})();
