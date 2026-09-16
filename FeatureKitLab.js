/**
 * Interactive mix-and-match lab for FeatureKit heads.
 * Optional window.FEATURE_KIT_LAB:
 *   svgPath, recipeA, recipeB, families: [{ id, label, aliases }]
 */
(function () {
    "use strict";

    const LAB_CFG = window.FEATURE_KIT_LAB || {};

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

    function hideHatMouth() {
        return !!($("hideHatMouthInput") && $("hideHatMouthInput").checked);
    }

    function applyPreviewFlags() {
        ["mainStage", "variantRow", "chimeraRow", "shellRow", "familyRow"].forEach((id) => {
            let el = $(id);
            if (!el) return;
            el.classList.toggle("kit-gray", showGray());
            el.classList.toggle("kit-hide-hat-mouth", hideHatMouth());
        });
    }

    function familyToken(family, key) {
        if (key === "hair") return "none";
        let aliases = family && family.aliases;
        let want = (aliases && aliases[key]) || family.id;
        let tokens = kit.listTokens(key);
        if (tokens.indexOf(want) >= 0) return want;
        return null;
    }

    function cloneRecipe(rec) {
        return kit.normalizeRecipe(Object.assign({}, rec, {
            scales: Object.assign({}, rec && rec.scales)
        }));
    }

    function recipeEquals(a, b) {
        if (!a || !b) return false;
        if ((a.expression || "happy") !== (b.expression || "happy")) return false;
        return slotKeys().every((key) => {
            if ((a[key] || "none") !== (b[key] || "none")) return false;
            if (key === "shell") return true;
            let sa = Number((a.scales && a.scales[key]) || 1);
            let sb = Number((b.scales && b.scales[key]) || 1);
            return Math.abs(sa - sb) < 0.001;
        });
    }

    function writeControlsFromRecipe() {
        slotKeys().forEach((key) => {
            let sel = $("slot_" + key);
            if (sel) sel.value = recipe[key];
            let scale = $("scale_" + key);
            if (scale) {
                scale.value = String((recipe.scales && recipe.scales[key]) || 1);
                let read = $("scaleRead_" + key);
                if (read) read.textContent = Number(scale.value).toFixed(2);
            }
        });
        let sad = $("exprSad");
        let happy = $("exprHappy");
        if (recipe.expression === "sad" && sad) sad.checked = true;
        else if (happy) happy.checked = true;
    }

    function adoptRecipe(rec) {
        if (!rec) return;
        recipe = cloneRecipe(rec);
        writeControlsFromRecipe();
        renderAll();
    }

    function applyFamily(family) {
        if (!family) return;
        slotKeys().forEach((key) => {
            let token = familyToken(family, key);
            if (token) recipe[key] = token;
        });
        writeControlsFromRecipe();
        renderAll();
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
        applyPreviewFlags();
        drawShellStrip();
        drawFamilyStrip();
    }

    function familyList() {
        return Array.isArray(LAB_CFG.families) ? LAB_CFG.families : [];
    }

    function buildFamilyButtons() {
        let host = $("familyButtons");
        if (!host) return;
        host.innerHTML = "";
        familyList().forEach((family) => {
            let btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = family.label || family.id;
            btn.addEventListener("click", () => applyFamily(family));
            host.appendChild(btn);
        });
    }

    function drawFamilyStrip() {
        let host = $("familyRow");
        if (!host) return;
        host.innerHTML = "";
        familyList().forEach((family) => {
            let next = Object.assign({}, recipe, { scales: Object.assign({}, recipe.scales) });
            slotKeys().forEach((key) => {
                let token = familyToken(family, key);
                if (token) next[key] = token;
            });
            next = kit.normalizeRecipe(next);
            let composed = kit.composeSvg(next, { showMarkers: false });
            let btn = document.createElement("button");
            btn.type = "button";
            btn.className = "mini-head" + (recipeEquals(recipe, next) ? " is-active" : "");
            btn.appendChild(composed.svg);
            let cap = document.createElement("span");
            cap.textContent = family.label || family.id;
            btn.appendChild(cap);
            btn.addEventListener("click", () => applyFamily(family));
            host.appendChild(btn);
        });
        applyPreviewFlags();
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
        applyPreviewFlags();
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

    function mixWithMap(a, b, fromMap) {
        let map = fromMap || mixFrom;
        let out = {
            expression: (a && a.expression) || currentExpression(),
            scales: Object.assign({}, FeatureKit.defaultScales(), a && a.scales)
        };
        slotKeys().forEach((key) => {
            let src = map[key] === "B" ? b : a;
            out[key] = src[key];
            if (key !== "shell") {
                out.scales[key] = (src.scales && src.scales[key]) || 1;
            }
        });
        return kit.normalizeRecipe(out);
    }

    function invertMixMap(map) {
        let out = {};
        slotKeys().forEach((key) => {
            out[key] = map[key] === "B" ? "A" : "B";
        });
        return out;
    }

    function familyRecipeFrom(family) {
        let next = {
            expression: currentExpression(),
            scales: Object.assign({}, FeatureKit.defaultScales(), recipe && recipe.scales)
        };
        slotKeys().forEach((key) => {
            let token = familyToken(family, key);
            if (token) next[key] = token;
            else if (noneable(key)) next[key] = "none";
            else if (recipe) next[key] = recipe[key];
        });
        return kit.normalizeRecipe(next);
    }

    function mixRecipe() {
        let a = recipe;
        let b = parentB || kit.altRecipe();
        return { mixed: mixWithMap(a, b, mixFrom), a: a, b: b };
    }

    function chimeraExampleItems(parts) {
        let fams = familyList();
        if (fams.length >= 2) {
            let items = [];
            for (let i = 0; i < fams.length; i++) {
                for (let j = i + 1; j < fams.length; j++) {
                    let recA = familyRecipeFrom(fams[i]);
                    let recB = familyRecipeFrom(fams[j]);
                    items.push({
                        label: (fams[i].label || fams[i].id) + " + " + (fams[j].label || fams[j].id),
                        rec: mixWithMap(recA, recB, mixFrom)
                    });
                }
            }
            return items;
        }
        let a = parts.a;
        let b = parts.b;
        return [
            {
                label: "swap A/B",
                rec: mixWithMap(a, b, invertMixMap(mixFrom))
            },
            {
                label: "even 3v2",
                rec: mixWithMap(a, b, {
                    shell: "A",
                    ear: "B",
                    eye: "A",
                    lowerFace: "B",
                    hair: "A",
                    stamp: "A"
                })
            },
            {
                label: "shell·ears from B",
                rec: mixWithMap(a, b, {
                    shell: "B",
                    ear: "B",
                    eye: "A",
                    lowerFace: "A",
                    hair: "A",
                    stamp: "A"
                })
            }
        ];
    }

    function appendChimeraHead(host, label, rec) {
        let composed = kit.composeSvg(rec, { showMarkers: false });
        let btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mini-head" + (recipeEquals(recipe, rec) ? " is-active" : "");
        btn.appendChild(composed.svg);
        let cap = document.createElement("span");
        cap.textContent = label;
        btn.appendChild(cap);
        btn.addEventListener("click", () => adoptRecipe(rec));
        host.appendChild(btn);
    }

    function drawChimera() {
        let host = $("chimeraRow");
        if (!host) return;
        host.innerHTML = "";
        let parts = mixRecipe();
        appendChimeraHead(host, "parent A", parts.a);
        appendChimeraHead(host, "chimera", parts.mixed);
        appendChimeraHead(host, "parent B", parts.b);
        chimeraExampleItems(parts).forEach((item) => {
            appendChimeraHead(host, item.label, item.rec);
        });
        applyPreviewFlags();
    }

    function drawShellStrip() {
        let host = $("shellRow");
        if (!host) return;
        host.innerHTML = "";
        kit.listTokens("shell").forEach((shell) => {
            let next = Object.assign({}, recipe, { scales: Object.assign({}, recipe.scales) });
            next.shell = shell;
            let composed = kit.composeSvg(next, { showMarkers: false });
            let btn = document.createElement("button");
            btn.type = "button";
            btn.className = "mini-head" + (recipe.shell === shell ? " is-active" : "");
            btn.appendChild(composed.svg);
            let cap = document.createElement("span");
            cap.textContent = shell;
            btn.appendChild(cap);
            btn.addEventListener("click", () => {
                recipe.shell = shell;
                let sel = $("slot_shell");
                if (sel) sel.value = shell;
                renderAll();
            });
            host.appendChild(btn);
        });
        applyPreviewFlags();
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
            await kit.load(LAB_CFG.svgPath);
            let fallbackA = {
                shell: pickToken("shell", "mechanical"),
                ear: pickToken("ear", "mechanical"),
                eye: pickToken("eye", "mechanical"),
                lowerFace: pickToken("lowerFace", "mechanical"),
                hair: "none",
                stamp: pickToken("stamp", "mechanical"),
                expression: "happy",
                scales: FeatureKit.defaultScales()
            };
            let fallbackB = {
                shell: pickToken("shell", "sea"),
                ear: pickToken("ear", "sea"),
                eye: pickToken("eye", "sea"),
                lowerFace: pickToken("lowerFace", "sea"),
                hair: "none",
                stamp: pickToken("stamp", "sea"),
                expression: "happy",
                scales: FeatureKit.defaultScales()
            };
            recipe = kit.normalizeRecipe(LAB_CFG.recipeA || fallbackA);
            parentB = kit.normalizeRecipe(LAB_CFG.recipeB || fallbackB);
            locks.hair = true;
            buildSlotControls();
            buildFamilyButtons();
            let hairLock = $("lock_hair");
            if (hairLock) hairLock.checked = true;
            buildVaryButtons();
            buildMixToggles();
            writeNotes();
            ["exprHappy", "exprSad", "markersInput"].forEach((id) => {
                let el = $(id);
                if (el) el.addEventListener("change", renderAll);
            });
            if ($("grayInput")) $("grayInput").addEventListener("change", applyPreviewFlags);
            if ($("hideHatMouthInput")) $("hideHatMouthInput").addEventListener("change", applyPreviewFlags);
            $("randomBtn").addEventListener("click", () => {
                recipe = kit.randomRecipe(locks, recipe);
                writeControlsFromRecipe();
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
