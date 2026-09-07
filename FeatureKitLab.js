/**
 * Interactive mix-and-match lab for FeatureKit heads.
 */
(function () {
    "use strict";

    const SLOT_LABELS = {
        shell: "Shell",
        ear: "Ears",
        eye: "Eyes",
        lowerFace: "Lower",
        hair: "Hair",
        stamp: "Stamps"
    };

    function slotKeys() {
        return FeatureKit.slotKeys();
    }

    function noneable(key) {
        return FeatureKit.noneableKeys().indexOf(key) >= 0;
    }

    let kit = new FeatureKit();
    let recipe = null;
    let parentB = null;
    let mixFrom = {
        shell: "A",
        ear: "A",
        eye: "B",
        lowerFace: "B",
        hair: "A",
        stamp: "B"
    };
    let varySlot = "stamp";
    let locks = {};

    function $(id) {
        return document.getElementById(id);
    }

    function setStatus(msg) {
        $("statusLine").textContent = msg;
    }

    function recipeLabel(r) {
        return [
            "shell:" + r.shell,
            "ear:" + r.ear,
            "eye:" + r.eye,
            "lower:" + r.lowerFace,
            "hair:" + (r.hair || "none"),
            "stamp:" + (r.stamp || "none"),
            r.expression
        ].join("  ·  ");
    }

    function currentExpression() {
        let sad = $("exprSad");
        return sad && sad.checked ? "sad" : "happy";
    }

    function showMarkers() {
        return !!($("markersInput") && $("markersInput").checked);
    }

    function showGray() {
        return !!($("grayInput") && $("grayInput").checked);
    }

    function applyGray() {
        ["mainStage", "variantRow", "chimeraRow", "shellRow"].forEach((id) => {
            let el = $(id);
            if (el) el.classList.toggle("kit-gray", showGray());
        });
    }

    function pickToken(key, preferred) {
        let tokens = kit.listTokens(key);
        if (preferred && tokens.indexOf(preferred) >= 0) return preferred;
        return tokens[0] || (noneable(key) ? "none" : "");
    }

    function readControlsIntoRecipe() {
        recipe.expression = currentExpression();
        slotKeys().forEach((key) => {
            let sel = $("slot_" + key);
            if (sel) recipe[key] = sel.value;
            let scale = $("scale_" + key);
            if (scale && recipe.scales) recipe.scales[key] = Number(scale.value);
        });
    }

    function fillSelect(sel, tokens, withNone) {
        sel.innerHTML = "";
        let list = tokens.slice();
        if (withNone) list.push("none");
        list.forEach((token) => {
            let opt = document.createElement("option");
            opt.value = token;
            opt.textContent = token;
            sel.appendChild(opt);
        });
    }

    function buildSlotControls() {
        let host = $("slotControls");
        host.innerHTML = "";
        slotKeys().forEach((key) => {
            let row = document.createElement("div");
            row.className = "slot-row";

            let lab = document.createElement("label");
            lab.setAttribute("for", "slot_" + key);
            lab.textContent = SLOT_LABELS[key];

            let mid = document.createElement("div");
            let sel = document.createElement("select");
            sel.id = "slot_" + key;
            fillSelect(sel, kit.listTokens(key), noneable(key));
            sel.value = recipe[key];
            sel.addEventListener("change", onControlChange);

            let lockLab = document.createElement("label");
            lockLab.className = "lock";
            let lock = document.createElement("input");
            lock.type = "checkbox";
            lock.id = "lock_" + key;
            lock.addEventListener("change", () => {
                locks[key] = lock.checked;
            });
            lockLab.appendChild(lock);
            lockLab.appendChild(document.createTextNode(" lock"));

            mid.appendChild(sel);
            if (key !== "shell") {
                let scaleWrap = document.createElement("div");
                scaleWrap.style.display = "flex";
                scaleWrap.style.alignItems = "center";
                scaleWrap.style.gap = "6px";
                scaleWrap.style.marginTop = "4px";
                let range = document.createElement("input");
                range.type = "range";
                range.id = "scale_" + key;
                range.min = key === "stamp" ? "0.45" : "0.6";
                range.max = key === "stamp" ? "1.8" : "1.4";
                range.step = "0.05";
                range.value = String((recipe.scales && recipe.scales[key]) || 1);
                let readout = document.createElement("span");
                readout.className = "scale-readout";
                readout.id = "scaleRead_" + key;
                readout.textContent = Number(range.value).toFixed(2);
                range.addEventListener("input", () => {
                    readout.textContent = Number(range.value).toFixed(2);
                    onControlChange();
                });
                scaleWrap.appendChild(range);
                scaleWrap.appendChild(readout);
                mid.appendChild(scaleWrap);
            }

            row.appendChild(lab);
            row.appendChild(mid);
            row.appendChild(lockLab);
            host.appendChild(row);
        });
    }

    function mountSvg(host, composed, className) {
        host.innerHTML = "";
        let svg = composed.svg;
        if (className) svg.setAttribute("class", className);
        host.appendChild(svg);
        try {
            let box = composed.group.getBBox();
            if (box && box.width && box.height) {
                let pad = 18;
                svg.setAttribute("viewBox", [
                    box.x - pad,
                    box.y - pad,
                    box.width + pad * 2,
                    box.height + pad * 2
                ].join(" "));
            }
        } catch (err) {
            // getBBox can fail if the node is not rendered yet.
        }
    }

    function drawMain() {
        let stage = $("mainStage");
        stage.classList.toggle("kit-show-markers", showMarkers());
        let composed = kit.composeSvg(recipe, { showMarkers: showMarkers() });
        mountSvg(stage, composed);
        $("recipeLine").textContent = recipeLabel(composed.recipe);
        applyGray();
        drawShellStrip();
    }

    function drawVariants() {
        let host = $("variantRow");
        host.innerHTML = "";
        host.classList.toggle("stamp-lineup", varySlot === "stamp");
        let tokens = kit.listTokens(varySlot).slice();
        if (noneable(varySlot)) tokens.push("none");
        tokens.forEach((token) => {
            let next = Object.assign({}, recipe, { scales: Object.assign({}, recipe.scales) });
            next[varySlot] = token;
            let composed = kit.composeSvg(next, { showMarkers: false });
            let btn = document.createElement("button");
            btn.type = "button";
            btn.className = "mini-head" + (recipe[varySlot] === token ? " is-active" : "");
            btn.appendChild(composed.svg);
            let cap = document.createElement("span");
            cap.textContent = token;
            btn.appendChild(cap);
            btn.addEventListener("click", () => {
                recipe[varySlot] = token;
                let sel = $("slot_" + varySlot);
                if (sel) sel.value = token;
                renderAll();
            });
            host.appendChild(btn);
        });
        applyGray();
    }

    function buildVaryButtons() {
        let host = $("varySlotButtons");
        host.innerHTML = "";
        slotKeys().forEach((key) => {
            let btn = document.createElement("button");
            btn.type = "button";
            btn.className = varySlot === key ? "" : "secondary";
            btn.textContent = SLOT_LABELS[key];
            btn.addEventListener("click", () => {
                varySlot = key;
                buildVaryButtons();
                drawVariants();
            });
            host.appendChild(btn);
        });
    }

    function mixRecipe() {
        let a = recipe;
        let b = parentB || kit.altRecipe();
        let out = {
            expression: a.expression,
            scales: Object.assign({}, a.scales)
        };
        slotKeys().forEach((key) => {
            out[key] = mixFrom[key] === "B" ? b[key] : a[key];
            if (key !== "shell") {
                let src = mixFrom[key] === "B" ? b : a;
                out.scales[key] = (src.scales && src.scales[key]) || 1;
            }
        });
        return { mixed: kit.normalizeRecipe(out), a: a, b: b };
    }

    function drawChimera() {
        let host = $("chimeraRow");
        host.innerHTML = "";
        let parts = mixRecipe();
        [
            { label: "A", rec: parts.a },
            { label: "Mix", rec: parts.mixed },
            { label: "B", rec: parts.b }
        ].forEach((item) => {
            let composed = kit.composeSvg(item.rec, { showMarkers: false });
            let box = document.createElement("div");
            box.className = "mini-head preview-only";
            box.appendChild(composed.svg);
            let cap = document.createElement("span");
            cap.textContent = item.label === "Mix" ? "chimera" : "parent " + item.label;
            box.appendChild(cap);
            host.appendChild(box);
        });
        applyGray();
    }

    function drawShellStrip() {
        let host = $("shellRow");
        if (!host) return;
        host.innerHTML = "";
        kit.listTokens("shell").forEach((shell) => {
            let next = Object.assign({}, recipe, { scales: Object.assign({}, recipe.scales) });
            next.shell = shell;
            let composed = kit.composeSvg(next, { showMarkers: false });
            let box = document.createElement("div");
            box.className = "mini-head preview-only" + (recipe.shell === shell ? " is-active" : "");
            box.appendChild(composed.svg);
            let cap = document.createElement("span");
            cap.textContent = shell;
            box.appendChild(cap);
            host.appendChild(box);
        });
        applyGray();
    }

    function buildMixToggles() {
        let host = $("mixToggles");
        host.innerHTML = "";
        slotKeys().forEach((key) => {
            let wrap = document.createElement("label");
            wrap.appendChild(document.createTextNode(SLOT_LABELS[key] + " "));
            let sel = document.createElement("select");
            sel.id = "mix_" + key;
            ["A", "B"].forEach((side) => {
                let opt = document.createElement("option");
                opt.value = side;
                opt.textContent = side;
                sel.appendChild(opt);
            });
            sel.value = mixFrom[key];
            sel.addEventListener("change", () => {
                mixFrom[key] = sel.value;
                drawChimera();
            });
            wrap.appendChild(sel);
            host.appendChild(wrap);
        });
    }

    function renderAll() {
        readControlsIntoRecipe();
        recipe = kit.normalizeRecipe(recipe);
        drawMain();
        drawVariants();
        drawChimera();
    }

    function onControlChange() {
        renderAll();
    }

    function writeNotes() {
        let list = $("notesList");
        list.innerHTML = "";
        let notes = kit.notes && kit.notes.length
            ? kit.notes
            : ["No structural warnings."];
        notes.forEach((text) => {
            let li = document.createElement("li");
            li.textContent = text;
            list.appendChild(li);
        });
    }

    async function boot() {
        try {
            await kit.load();
            recipe = kit.normalizeRecipe({
                shell: pickToken("shell", "pear"),
                ear: pickToken("ear", "bat"),
                eye: pickToken("eye", "round"),
                lowerFace: pickToken("lowerFace", "elephant"),
                hair: "none",
                stamp: pickToken("stamp", "freckles"),
                expression: "happy",
                scales: FeatureKit.defaultScales()
            });
            parentB = kit.normalizeRecipe({
                shell: pickToken("shell", "point"),
                ear: pickToken("ear", "seashell"),
                eye: pickToken("eye", "square"),
                lowerFace: pickToken("lowerFace", "pig"),
                hair: "none",
                stamp: pickToken("stamp", "heart"),
                expression: "happy",
                scales: FeatureKit.defaultScales()
            });
            locks.hair = true;
            buildSlotControls();
            let hairLock = $("lock_hair");
            if (hairLock) hairLock.checked = true;
            buildVaryButtons();
            buildMixToggles();
            writeNotes();
            ["exprHappy", "exprSad", "markersInput"].forEach((id) => {
                let el = $(id);
                if (el) el.addEventListener("change", renderAll);
            });
            if ($("grayInput")) $("grayInput").addEventListener("change", applyGray);
            $("randomBtn").addEventListener("click", () => {
                recipe = kit.randomRecipe(locks, recipe);
                slotKeys().forEach((key) => {
                    let sel = $("slot_" + key);
                    if (sel) sel.value = recipe[key];
                    let scale = $("scale_" + key);
                    if (scale) {
                        scale.value = String(recipe.scales[key] || 1);
                        let read = $("scaleRead_" + key);
                        if (read) read.textContent = Number(scale.value).toFixed(2);
                    }
                });
                renderAll();
            });
            $("resetScaleBtn").addEventListener("click", () => {
                recipe.scales = FeatureKit.defaultScales();
                slotKeys().forEach((key) => {
                    let scale = $("scale_" + key);
                    if (scale) {
                        scale.value = "1";
                        let read = $("scaleRead_" + key);
                        if (read) read.textContent = "1.00";
                    }
                });
                renderAll();
            });
            $("saveBBtn").addEventListener("click", () => {
                parentB = kit.normalizeRecipe(recipe);
                drawChimera();
                setStatus("Parent B snapshot saved: " + recipeLabel(parentB));
            });
            renderAll();
            let n = slotKeys().map((k) => k + "=" + kit.listTokens(k).length).join(", ");
            setStatus("Kit loaded (" + n + ").");
        } catch (err) {
            console.error(err);
            setStatus("Boot error: " + (err && err.message ? err.message : err));
        }
    }

    boot();
})();
