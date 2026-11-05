/**
 * Standalone preview for live kit overlay motion and stamp salience trials.
 * Uses live families from SVG/Heads features compatible.svg:
 * mechanical (gears + moustache), sweet (candles), and sea (spray + pulse).
 */
(function () {
    "use strict";

    const THEME_SVG = "../../../SVG/Heads features compatible.svg?v=clam-3";
    const THEME_FAMILIES = [
        { id: "mechanical", label: "Mechanical" },
        { id: "sweet", label: "Sweet" },
        { id: "sea", label: "Sea" }
    ];

    let kit = new FeatureKit();
    let liveRoots = [];
    let stoppedRoots = [];
    let pointerX = 0;
    let pointerY = 0;
    let gazeRaf = 0;
    let gazeStarted = false;
    let expression = "happy";

    function $(id) {
        return document.getElementById(id);
    }

    function setStatus(msg) {
        $("statusLine").textContent = msg;
    }

    function familySlot(family, key) {
        let aliases = family && family.aliases;
        return (aliases && aliases[key]) || family.id;
    }

    function familyRecipe(family) {
        return {
            shell: familySlot(family, "shell"),
            ear: familySlot(family, "ear"),
            eye: familySlot(family, "eye"),
            lowerFace: familySlot(family, "lowerFace"),
            hair: "none",
            stamp: familySlot(family, "stamp"),
            expression: expression
        };
    }

    function stampOptions() {
        return {
            press: !!($("stampPressInput") && $("stampPressInput").checked),
            lighting: !!($("stampLightInput") && $("stampLightInput").checked),
            outline: !!($("stampOutlineInput") && $("stampOutlineInput").checked),
            expression: ($("stampExprInput") && $("stampExprInput").checked) ? expression : null
        };
    }

    function applyStampOptions(root) {
        if (!root || typeof apply_kit_stamp_salience !== "function") return;
        apply_kit_stamp_salience(root, stampOptions());
    }

    function applyLiveMotion(root) {
        if (!root || typeof apply_kit_ear_wiggle !== "function") return;
        apply_kit_ear_wiggle(root, { expression: expression });
    }

    function applyMoodMotion(root, animated) {
        if (!root) return;
        if (typeof kit_candle_set_mood === "function") {
            kit_candle_set_mood(root, expression, animated !== false);
        }
        if (typeof kit_moustache_set_mood === "function") {
            kit_moustache_set_mood(root, expression, animated !== false);
        }
        if (typeof kit_muffin_set_mood === "function") {
            kit_muffin_set_mood(root, expression, animated !== false);
        }
        if (typeof kit_clam_set_mood === "function") {
            kit_clam_set_mood(root, expression, animated !== false);
        }
        if (typeof kit_sea_nose_set_mood === "function") {
            kit_sea_nose_set_mood(root, expression, animated !== false);
        }
    }

    function recipeCaption(recipe) {
        let family = THEME_FAMILIES.find((row) => row.id === recipe.ear);
        let label = family ? family.label : recipe.ear;
        if (recipe.lowerFace && recipe.lowerFace !== recipe.ear) {
            return label + " family · " + recipe.lowerFace + " mouth";
        }
        return label + " family";
    }

    function makeCard(recipe, title, live) {
        let composed = kit.composeSvg(recipe, {
            showMarkers: false,
            width: "280",
            height: "280",
            viewBox: "-40 -100 480 540"
        });
        composed.svg.style.overflow = "visible";
        let card = document.createElement("div");
        card.className = "ear-card" + (live ? " is-live" : "");
        let h = document.createElement("h3");
        h.textContent = title;
        let sub = document.createElement("p");
        sub.className = "sub";
        sub.textContent = recipeCaption(recipe);
        card.appendChild(h);
        card.appendChild(composed.svg);
        card.appendChild(sub);
        if (live) {
            card.addEventListener("click", () => {
                if (!stampOptions().press) return;
                if (typeof kit_ear_is_live === "function" && !kit_ear_is_live(composed.group)) return;
                play_kit_stamp_press(composed.group);
            });
        }
        return { card: card, root: composed.group, svg: composed.svg };
    }

    function clearGrid(host, roots) {
        (roots || []).forEach((root) => {
            if (typeof apply_fennimal_eye_gaze === "function") {
                apply_fennimal_eye_gaze(root.querySelectorAll(".eye_gaze"), 0, 0, 1.15);
            }
            if (typeof freeze_fennimal_decorative_animations === "function") {
                freeze_fennimal_decorative_animations(root);
            }
        });
        host.innerHTML = "";
    }

    function restEyes(root) {
        if (!root || typeof apply_fennimal_eye_gaze !== "function") return;
        apply_fennimal_eye_gaze(root.querySelectorAll(".eye_gaze"), 0, 0, 1.15);
    }

    function tickGaze() {
        gazeRaf = 0;
        liveRoots.forEach((root) => {
            if (!root || !root.isConnected) return;
            if (typeof kit_ear_is_live === "function" && !kit_ear_is_live(root)) {
                restEyes(root);
                return;
            }
            let rect = root.getBoundingClientRect();
            if (!rect.width && !rect.height) return;
            let dx = pointerX - (rect.x + rect.width / 2);
            let dy = pointerY - (rect.y + rect.height / 2);
            let gx = Math.max(-6, Math.min(6, dx * 0.015)) * 1.2;
            let gy = Math.max(-4, Math.min(4, dy * 0.015)) * 1.2;
            apply_fennimal_eye_gaze(root.querySelectorAll(".eye_gaze"), gx, gy, 1.15);
        });
        gazeRaf = requestAnimationFrame(tickGaze);
    }

    function startGaze() {
        if (gazeStarted) return;
        gazeStarted = true;
        pointerX = window.innerWidth / 2;
        pointerY = window.innerHeight / 2;
        window.addEventListener("pointermove", (e) => {
            pointerX = e.clientX;
            pointerY = e.clientY;
        });
        gazeRaf = requestAnimationFrame(tickGaze);
    }

    function syncExpressionButtons() {
        let happy = $("exprHappyBtn");
        let sad = $("exprSadBtn");
        if (happy) happy.className = expression === "happy" ? "" : "secondary";
        if (sad) sad.className = expression === "sad" ? "" : "secondary";
    }

    function applyFaceExpression(root) {
        if (typeof FeatureKit !== "undefined" && typeof FeatureKit.applyExpression === "function") {
            FeatureKit.applyExpression(root, expression);
        }
    }

    function setExpression(next) {
        expression = next === "sad" ? "sad" : "happy";
        syncExpressionButtons();
        liveRoots.forEach((root) => {
            applyFaceExpression(root);
            applyMoodMotion(root, true);
            applyStampOptions(root);
        });
        setStatus(expression === "sad"
            ? "Sad faces. Mechanical moustache drops, candles snuff, sea shell hangs, stamps dim if the expression trial is on."
            : "Happy faces. Mechanical moustache lifts, candles relight, sea shell rocks, stamps brighten if the expression trial is on.");
    }

    function refreshStampTrials() {
        liveRoots.forEach((root) => {
            if (typeof kit_ear_is_live === "function" && !kit_ear_is_live(root)) return;
            applyStampOptions(root);
        });
    }

    function render() {
        let liveHost = $("liveGrid");
        let frozenHost = $("frozenGrid");
        let stoppedHost = $("stoppedGrid");
        clearGrid(liveHost, liveRoots);
        clearGrid(frozenHost, []);
        clearGrid(stoppedHost, stoppedRoots);
        liveRoots = [];
        stoppedRoots = [];

        THEME_FAMILIES.forEach((family) => {
            let recipe = familyRecipe(family);
            if (!kit.listTokens("ear").includes(recipe.ear)) return;
            let item = makeCard(recipe, "Live · " + family.label, true);
            liveHost.appendChild(item.card);
            applyLiveMotion(item.root);
            applyStampOptions(item.root);
            liveRoots.push(item.root);

            let frozen = makeCard(recipe, "Frozen · " + family.label, false);
            frozen.card.classList.add("is-frozen");
            if (typeof kit_overlay_ensure_static === "function") {
                kit_overlay_ensure_static(frozen.root);
            }
            freeze_fennimal_decorative_animations(frozen.root);
            frozenHost.appendChild(frozen.card);
        });

        THEME_FAMILIES.forEach((family) => {
            let recipe = familyRecipe(family);
            if (!kit.listTokens("ear").includes(recipe.ear)) return;
            let item = makeCard(recipe, "Stopped · " + family.label, false);
            item.card.classList.add("is-frozen");
            stoppedHost.appendChild(item.card);
            applyLiveMotion(item.root);
            apply_kit_stamp_salience(item.root, {
                press: true,
                lighting: true,
                outline: false,
                expression: "happy"
            });
            stoppedRoots.push(item.root);
            freeze_fennimal_decorative_animations(item.root);
        });

        syncExpressionButtons();
        setStatus("Theme heads ready. Live row: mechanical gears + moustache, sweet candles, sea clam blink + pearl shine + shell nose.");
    }

    function freezeLive() {
        liveRoots.forEach((root) => {
            restEyes(root);
            freeze_fennimal_decorative_animations(root);
        });
        setStatus("Live row frozen. Ear motion, gaze, moustache, candles, spores, spray, and stamp pulse should stop.");
    }

    function reviveLive() {
        liveRoots.forEach((root) => {
            applyLiveMotion(root);
            applyFaceExpression(root);
            applyMoodMotion(root, false);
            applyStampOptions(root);
        });
        setStatus("Live row restarted.");
    }

    async function start() {
        try {
            await kit.load(THEME_SVG);
            $("regenBtn").addEventListener("click", render);
            $("freezeLiveBtn").addEventListener("click", freezeLive);
            $("reviveBtn").addEventListener("click", reviveLive);
            $("exprHappyBtn").addEventListener("click", () => setExpression("happy"));
            $("exprSadBtn").addEventListener("click", () => setExpression("sad"));
            ["stampPressInput", "stampExprInput", "stampLightInput", "stampOutlineInput"].forEach((id) => {
                $(id).addEventListener("change", refreshStampTrials);
            });
            startGaze();
            render();
        } catch (err) {
            setStatus("Could not load kit: " + (err && err.message ? err.message : err));
            console.error(err);
        }
    }

    start();
})();
