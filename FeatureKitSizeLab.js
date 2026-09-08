/**
 * Locked-trio size lab: three frozen heads, shared scale sliders, 3v2 preview
 * with fishing coverage rates (×1) and the logistic for these recipes (×1).
 */
(function () {
    "use strict";

    const SLOT_LABELS = {
        ear: "Ears",
        eye: "Eyes",
        lowerFace: "Mouth",
        stamp: "Stamps"
    };
    const SCALE_KEYS = ["ear", "eye", "lowerFace", "stamp"];
    const HEADS = [
        { id: "H1", shell: "pear", ear: "mechanical", eye: "round", lowerFace: "pig", stamp: "freckles", hair: "none" },
        { id: "H2", shell: "point", ear: "mushroom", eye: "square", lowerFace: "shark", stamp: "chevrons", hair: "none" },
        { id: "H3", shell: "tall", ear: "seashell", eye: "slanted", lowerFace: "elephant", stamp: "smiley", hair: "none" }
    ];
    const PACKS = {
        baseline: { ear: 1, eye: 1, lowerFace: 1, stamp: 1 },
        mild: { ear: 0.92, eye: 1.12, lowerFace: 0.9, stamp: 1.18 },
        medium: { ear: 0.82, eye: 1.22, lowerFace: 0.85, stamp: 1.35 }
    };
    const PAIRS = [
        { id: "1-2", a: 0, b: 1, label: "H1 vs H2" },
        { id: "1-3", a: 0, b: 2, label: "H1 vs H3" },
        { id: "2-3", a: 1, b: 2, label: "H2 vs H3" }
    ];

    // Coverage 3v2 from feature_kit_combo_pilot (41 completes × 2), any tokens.
    // Model: logistic P(3-side) for these locked recipes at scale ×1.
    const SPLITS = [
        {
            sa: ["shell", "eye", "stamp"],
            sb: ["ear", "lowerFace"],
            fishing: { k: 37, n: 82, p: 0.451, lo: 0.35, hi: 0.56 },
            model: { "1-2": [0.5, 0.5], "1-3": [0.56, 0.57], "2-3": [0.43, 0.43] }
        },
        {
            sa: ["eye", "lowerFace", "stamp"],
            sb: ["shell", "ear"],
            fishing: { k: 35, n: 82, p: 0.427, lo: 0.33, hi: 0.53 },
            model: { "1-2": [0.44, 0.45], "1-3": [0.47, 0.48], "2-3": [0.38, 0.38] }
        },
        {
            sa: ["ear", "lowerFace", "stamp"],
            sb: ["shell", "eye"],
            fishing: { k: 48, n: 82, p: 0.585, lo: 0.48, hi: 0.69 },
            model: { "1-2": [0.54, 0.55], "1-3": [0.52, 0.54], "2-3": [0.6, 0.6] }
        },
        {
            sa: ["shell", "lowerFace", "stamp"],
            sb: ["ear", "eye"],
            fishing: { k: 52, n: 82, p: 0.634, lo: 0.53, hi: 0.73 },
            model: { "1-2": [0.67, 0.68], "1-3": [0.66, 0.67], "2-3": [0.7, 0.7] }
        },
        {
            sa: ["shell", "ear", "stamp"],
            sb: ["eye", "lowerFace"],
            fishing: { k: 53, n: 82, p: 0.646, lo: 0.54, hi: 0.74 },
            model: { "1-2": [0.6, 0.61], "1-3": [0.61, 0.62], "2-3": [0.64, 0.65] }
        },
        {
            sa: ["ear", "eye", "stamp"],
            sb: ["shell", "lowerFace"],
            fishing: { k: 28, n: 82, p: 0.341, lo: 0.25, hi: 0.45 },
            model: { "1-2": [0.37, 0.37], "1-3": [0.41, 0.42], "2-3": [0.32, 0.33] }
        },
        {
            sa: ["ear", "eye", "lowerFace"],
            sb: ["shell", "stamp"],
            fishing: { k: 60, n: 82, p: 0.732, lo: 0.63, hi: 0.82 },
            model: { "1-2": [0.73, 0.74], "1-3": [0.7, 0.71], "2-3": [0.73, 0.74] }
        },
        {
            sa: ["shell", "ear", "eye"],
            sb: ["lowerFace", "stamp"],
            fishing: { k: 62, n: 82, p: 0.756, lo: 0.65, hi: 0.84 },
            model: { "1-2": [0.77, 0.78], "1-3": [0.77, 0.78], "2-3": [0.77, 0.77] }
        },
        {
            sa: ["shell", "eye", "lowerFace"],
            sb: ["ear", "stamp"],
            fishing: { k: 64, n: 82, p: 0.78, lo: 0.68, hi: 0.86 },
            model: { "1-2": [0.82, 0.83], "1-3": [0.81, 0.81], "2-3": [0.81, 0.81] }
        },
        {
            sa: ["shell", "ear", "lowerFace"],
            sb: ["eye", "stamp"],
            fishing: { k: 79, n: 82, p: 0.963, lo: 0.9, hi: 0.99 },
            model: { "1-2": [0.87, 0.88], "1-3": [0.84, 0.85], "2-3": [0.91, 0.91] }
        }
    ];

    const PRETTY = {
        shell: "shell",
        ear: "ears",
        eye: "eyes",
        lowerFace: "mouth",
        stamp: "stamp"
    };

    let kit = new FeatureKit();
    let scales = Object.assign({}, PACKS.baseline);
    let pairIndex = 0;
    let splitIndex = 0;
    let polarity = 0;
    let drawQueued = false;

    function $(id) {
        return document.getElementById(id);
    }

    function setStatus(msg) {
        $("statusLine").textContent = msg;
    }

    function showGray() {
        return !!($("grayInput") && $("grayInput").checked);
    }

    function applyGray() {
        ["trioRow", "trialStage", "mixGallery"].forEach((id) => {
            let el = $(id);
            if (el) el.classList.toggle("kit-gray", showGray());
        });
    }

    function atBaseline() {
        return SCALE_KEYS.every((k) => Math.abs(scales[k] - 1) < 0.001);
    }

    function packName() {
        let names = Object.keys(PACKS);
        for (let i = 0; i < names.length; i++) {
            let pack = PACKS[names[i]];
            if (SCALE_KEYS.every((k) => Math.abs(scales[k] - pack[k]) < 0.001)) return names[i];
        }
        return "custom";
    }

    function prettySlots(arr) {
        return (arr || []).map((s) => PRETTY[s] || s).join(" + ");
    }

    function pct(p) {
        return Math.round(p * 100) + "%";
    }

    function currentScales() {
        return Object.assign(FeatureKit.defaultScales(), { hair: 1 }, scales);
    }

    function recipeFor(head) {
        return kit.normalizeRecipe(Object.assign({}, head, {
            expression: "happy",
            scales: currentScales()
        }));
    }

    function mountFit(host, composed) {
        host.innerHTML = "";
        let svg = composed.svg;
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

    function fillRangeLimits(range, key) {
        range.min = key === "stamp" ? "0.45" : "0.6";
        range.max = key === "stamp" ? "1.8" : "1.4";
        range.step = "0.01";
    }

    function buildScaleControls() {
        let host = $("scaleControls");
        host.innerHTML = "";
        let shellRow = document.createElement("div");
        shellRow.className = "scale-row";
        shellRow.innerHTML = "<label>Shell</label><span class=\"fixed\">fixed at 1.00</span><span class=\"scale-readout\">1.00</span>";
        host.appendChild(shellRow);
        SCALE_KEYS.forEach((key) => {
            let row = document.createElement("div");
            row.className = "scale-row";
            let lab = document.createElement("label");
            lab.setAttribute("for", "scale_" + key);
            lab.textContent = SLOT_LABELS[key];
            let range = document.createElement("input");
            range.type = "range";
            range.id = "scale_" + key;
            fillRangeLimits(range, key);
            range.value = String(scales[key]);
            let read = document.createElement("span");
            read.className = "scale-readout";
            read.id = "scaleRead_" + key;
            read.textContent = Number(scales[key]).toFixed(2);
            range.addEventListener("input", () => {
                scales[key] = Number(range.value);
                read.textContent = scales[key].toFixed(2);
                markPackButtons();
                queueDraw();
            });
            row.appendChild(lab);
            row.appendChild(range);
            row.appendChild(read);
            host.appendChild(row);
        });
    }

    function setScales(next) {
        SCALE_KEYS.forEach((k) => {
            scales[k] = next[k];
            let range = $("scale_" + k);
            let read = $("scaleRead_" + k);
            if (range) range.value = String(next[k]);
            if (read) read.textContent = Number(next[k]).toFixed(2);
        });
        markPackButtons();
        queueDraw();
    }

    function markPackButtons() {
        let current = packName();
        $("packButtons").querySelectorAll("button").forEach((btn) => {
            btn.className = btn.getAttribute("data-pack") === current ? "" : "secondary";
        });
    }

    function buildPackButtons() {
        let host = $("packButtons");
        host.innerHTML = "";
        [
            ["baseline", "Baseline ×1"],
            ["mild", "Mild"],
            ["medium", "Medium"]
        ].forEach((row) => {
            let btn = document.createElement("button");
            btn.type = "button";
            btn.setAttribute("data-pack", row[0]);
            btn.textContent = row[1];
            btn.addEventListener("click", () => setScales(PACKS[row[0]]));
            host.appendChild(btn);
        });
        markPackButtons();
    }

    function buildPairButtons() {
        let host = $("pairButtons");
        host.innerHTML = "";
        PAIRS.forEach((pair, i) => {
            let btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = pair.label;
            btn.className = i === pairIndex ? "" : "secondary";
            btn.addEventListener("click", () => {
                pairIndex = i;
                buildPairButtons();
                buildPolarityButtons();
                renderTrial();
                renderSplitList();
                renderMixGallery();
            });
            host.appendChild(btn);
        });
    }

    function buildPolarityButtons() {
        let host = $("polarityButtons");
        host.innerHTML = "";
        let pair = PAIRS[pairIndex];
        let labels = [
            HEADS[pair.a].id + " donates 3",
            HEADS[pair.b].id + " donates 3"
        ];
        labels.forEach((lab, i) => {
            let btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = lab;
            btn.className = i === polarity ? "" : "secondary";
            btn.addEventListener("click", () => {
                polarity = i;
                buildPolarityButtons();
                renderTrial();
                renderMixGallery();
            });
            host.appendChild(btn);
        });
    }

    function renderTrio() {
        let host = $("trioRow");
        host.innerHTML = "";
        HEADS.forEach((head) => {
            let rec = recipeFor(head);
            let composed = kit.composeSvg(rec, { showMarkers: false });
            let card = document.createElement("div");
            card.className = "trio-card";
            let svgHost = document.createElement("div");
            mountFit(svgHost, composed);
            card.appendChild(svgHost.firstChild);
            let cap = document.createElement("span");
            cap.textContent = head.id + "  ·  " + head.shell + " / " + head.ear + " / " + head.eye + " / " + head.lowerFace + " / " + head.stamp;
            card.appendChild(cap);
            host.appendChild(card);
        });
        applyGray();
    }

    function renderSplitList() {
        let host = $("splitList");
        host.innerHTML = "";
        SPLITS.forEach((split, i) => {
            let btn = document.createElement("button");
            btn.type = "button";
            btn.className = "split-btn" + (i === splitIndex ? " is-active" : "");
            let pctEl = document.createElement("span");
            pctEl.className = "pct";
            pctEl.textContent = pct(split.fishing.p);
            let lab = document.createElement("span");
            lab.className = "split-lab";
            lab.textContent = prettySlots(split.sa) + " vs " + prettySlots(split.sb);
            let mini = document.createElement("div");
            mini.className = "split-mini";
            let fill = document.createElement("span");
            fill.style.width = (split.fishing.p * 100) + "%";
            let fifty = document.createElement("i");
            fifty.className = "fifty";
            mini.appendChild(fill);
            mini.appendChild(fifty);
            btn.appendChild(pctEl);
            btn.appendChild(lab);
            btn.appendChild(mini);
            btn.addEventListener("click", () => {
                splitIndex = i;
                renderSplitList();
                renderTrial();
                renderMixGallery();
            });
            host.appendChild(btn);
        });
    }

    function renderTrial() {
        let pair = PAIRS[pairIndex];
        let split = SPLITS[splitIndex];
        let recA = recipeFor(HEADS[pair.a]);
        let recB = recipeFor(HEADS[pair.b]);
        let three = polarity === 0 ? recA : recB;
        let two = polarity === 0 ? recB : recA;
        let threeHead = polarity === 0 ? HEADS[pair.a] : HEADS[pair.b];
        let twoHead = polarity === 0 ? HEADS[pair.b] : HEADS[pair.a];
        let mix = kit.normalizeRecipe(FeatureKit.mixRecipes(three, two, {
            set_a: split.sa,
            set_b: split.sb
        }, 0));
        mix.scales = currentScales();

        let stage = $("trialStage");
        stage.innerHTML = "";
        let wrap = document.createElement("div");
        wrap.className = "trial-3up";
        function well(rec, className, label) {
            let box = document.createElement("div");
            box.className = className;
            let composed = kit.composeSvg(rec, { showMarkers: false });
            let svgHost = document.createElement("div");
            mountFit(svgHost, composed);
            box.appendChild(svgHost.firstChild);
            let cap = document.createElement("div");
            cap.className = "well-label";
            cap.textContent = label;
            box.appendChild(cap);
            return box;
        }
        wrap.appendChild(well(mix, "trial-mix", "mix (top)"));
        wrap.appendChild(well(three, "trial-parent", threeHead.id + " · three drawers"));
        wrap.appendChild(well(two, "trial-parent", twoHead.id + " · two drawers"));
        stage.appendChild(wrap);
        applyGray();

        $("trialCaption").textContent =
            threeHead.id + " gives " + prettySlots(split.sa) +
            ".  " + twoHead.id + " gives " + prettySlots(split.sb) + ".";

        let fish = split.fishing;
        let model = (split.model && split.model[pair.id]) || null;
        let modelP = model ? model[polarity] : null;
        let panel = $("ratePanel");
        panel.innerHTML = "";
        let meter = document.createElement("div");
        meter.className = "meter";
        let fill = document.createElement("span");
        fill.style.width = (fish.p * 100) + "%";
        let fifty = document.createElement("i");
        fifty.className = "fifty";
        meter.appendChild(fill);
        meter.appendChild(fifty);
        panel.appendChild(meter);

        let p1 = document.createElement("p");
        p1.innerHTML = "<b>Fishing sample at ×1</b> (any tokens, not these exact doodles): " +
            pct(fish.p) + " chose the three-slot parent (" + fish.k + "/" + fish.n +
            ", CI " + Math.round(fish.lo * 100) + "–" + Math.round(fish.hi * 100) + "%). 41 people × 2 coverage reps.";
        panel.appendChild(p1);
        if (modelP != null) {
            let p2 = document.createElement("p");
            p2.innerHTML = "<b>Model for these three heads at ×1</b>: " +
                pct(modelP) + " would pick " + threeHead.id + " on this polarity. " +
                "The other polarity is " + pct(model[1 - polarity]) + ".";
            panel.appendChild(p2);
        }
        $("scaleWarn").hidden = atBaseline();
    }

    function renderMixGallery() {
        let host = $("mixGallery");
        if (!host) return;
        host.innerHTML = "";
        let pair = PAIRS[pairIndex];
        let recA = recipeFor(HEADS[pair.a]);
        let recB = recipeFor(HEADS[pair.b]);
        let three = polarity === 0 ? recA : recB;
        let two = polarity === 0 ? recB : recA;
        SPLITS.forEach((split, i) => {
            let mix = kit.normalizeRecipe(FeatureKit.mixRecipes(three, two, {
                set_a: split.sa,
                set_b: split.sb
            }, 0));
            mix.scales = currentScales();
            let composed = kit.composeSvg(mix, { showMarkers: false });
            let btn = document.createElement("button");
            btn.type = "button";
            btn.className = "mix-card" + (i === splitIndex ? " is-active" : "");
            let svgHost = document.createElement("div");
            mountFit(svgHost, composed);
            btn.appendChild(svgHost.firstChild);
            let pctEl = document.createElement("div");
            pctEl.className = "mix-pct";
            pctEl.textContent = pct(split.fishing.p) + " 3-side";
            let lab = document.createElement("div");
            lab.className = "mix-lab";
            lab.textContent = prettySlots(split.sa) + " vs " + prettySlots(split.sb);
            btn.appendChild(pctEl);
            btn.appendChild(lab);
            btn.addEventListener("click", () => {
                splitIndex = i;
                renderSplitList();
                renderTrial();
                renderMixGallery();
            });
            host.appendChild(btn);
        });
        applyGray();
    }

    function queueDraw() {
        if (drawQueued) return;
        drawQueued = true;
        requestAnimationFrame(() => {
            drawQueued = false;
            renderTrio();
            renderTrial();
            renderMixGallery();
        });
    }

    async function boot() {
        try {
            await kit.load();
            HEADS.forEach((head) => {
                ["shell", "ear", "eye", "lowerFace", "stamp"].forEach((key) => {
                    if (!kit.listTokens(key).includes(head[key]) && head[key] !== "none") {
                        throw new Error("Missing token " + key + ":" + head[key]);
                    }
                });
            });
            buildScaleControls();
            buildPackButtons();
            buildPairButtons();
            buildPolarityButtons();
            renderSplitList();
            if ($("grayInput")) $("grayInput").addEventListener("change", applyGray);
            $("resetScaleBtn").addEventListener("click", () => setScales(PACKS.baseline));
            queueDraw();
            setStatus("Trio locked. Shell fixed. Fishing bars are ×1 coverage from 8 Sep 2026.");
        } catch (err) {
            console.error(err);
            setStatus("Boot error: " + (err && err.message ? err.message : err));
        }
    }

    boot();
})();
