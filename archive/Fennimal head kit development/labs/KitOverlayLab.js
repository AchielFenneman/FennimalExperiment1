/**
 * Overlay lab UI for FeatureKit's shared-baseline + theme-frill composer.
 * Checkboxes can stack families per slot; game recipes stay one theme per slot.
 */
(function () {
    "use strict";

    const NS = "http://www.w3.org/2000/svg";
    const SLOTS = [
        { key: "shell", label: "Shell" },
        { key: "ear", label: "Ears" },
        { key: "eye", label: "Eyes" },
        { key: "lowerFace", label: "Snout" },
        { key: "stamp", label: "Stamps" }
    ];

    let kit = null;
    let liveRoot = null;
    let pointerX = 0;
    let pointerY = 0;
    let gazeRaf = 0;
    let gazeStarted = false;

    let state = {
        overlays: emptyOverlays(),
        expression: "happy",
        animate: true,
        showMarkers: false,
        hideHatMouth: true,
        grayscale: false
    };

    function themes() {
        return (typeof FeatureKit !== "undefined" && FeatureKit.THEMES)
            ? FeatureKit.THEMES.slice()
            : ["mechanical", "mushroom", "sea", "sweet"];
    }

    function emptyOverlays() {
        let out = {};
        SLOTS.forEach((slot) => {
            let flags = {};
            themes().forEach((theme) => {
                flags[theme] = false;
            });
            out[slot.key] = flags;
        });
        return out;
    }

    function $(id) {
        return document.getElementById(id);
    }

    function setStatus(msg) {
        $("statusLine").textContent = msg;
    }

    function createEl(name, attrs) {
        let el = document.createElementNS(NS, name);
        Object.keys(attrs || {}).forEach((key) => {
            if (attrs[key] == null) return;
            el.setAttribute(key, attrs[key]);
        });
        return el;
    }

    function overlayRecipe() {
        let recipe = {
            hair: "none",
            expression: state.expression,
            scales: (typeof FeatureKit !== "undefined" && FeatureKit.defaultScales)
                ? FeatureKit.defaultScales()
                : { ear: 1, eye: 1, lowerFace: 1, hair: 1, stamp: 1 }
        };
        SLOTS.forEach((slot) => {
            let on = themes().filter((theme) => state.overlays[slot.key] && state.overlays[slot.key][theme]);
            recipe[slot.key] = on.length ? on : "none";
        });
        return recipe;
    }

    function restEyes(root) {
        if (!root || typeof apply_fennimal_eye_gaze !== "function") return;
        apply_fennimal_eye_gaze(root.querySelectorAll(".eye_gaze"), 0, 0, 1.15);
    }

    function tickGaze() {
        gazeRaf = 0;
        if (liveRoot && liveRoot.isConnected && state.animate && typeof kit_ear_is_live === "function" && kit_ear_is_live(liveRoot)) {
            let rect = liveRoot.getBoundingClientRect();
            if (rect.width || rect.height) {
                let dx = pointerX - (rect.x + rect.width / 2);
                let dy = pointerY - (rect.y + rect.height / 2);
                let gx = Math.max(-6, Math.min(6, dx * 0.015)) * 1.2;
                let gy = Math.max(-4, Math.min(4, dy * 0.015)) * 1.2;
                apply_fennimal_eye_gaze(liveRoot.querySelectorAll(".eye_gaze"), gx, gy, 1.15);
            }
        } else if (liveRoot) {
            restEyes(liveRoot);
        }
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

    function overlayCaption() {
        let bits = SLOTS.map((slot) => {
            let on = themes().filter((theme) => state.overlays[slot.key] && state.overlays[slot.key][theme]);
            return slot.label.toLowerCase() + ": " + (on.length ? on.join("+") : "base");
        });
        return bits.join(" · ");
    }

    function syncStageClasses(stage) {
        stage.classList.toggle("kit-show-markers", state.showMarkers);
        stage.classList.toggle("kit-hide-hat-mouth", state.hideHatMouth);
        stage.classList.toggle("kit-gray", state.grayscale);
    }

    function disposeLive() {
        if (!liveRoot) return;
        restEyes(liveRoot);
        if (typeof freeze_fennimal_decorative_animations === "function") {
            freeze_fennimal_decorative_animations(liveRoot);
        }
        liveRoot = null;
    }

    function applyMotion(head) {
        if (typeof apply_kit_overlay_motion === "function") {
            apply_kit_overlay_motion(head, {
                animate: state.animate,
                expression: state.expression
            });
            return;
        }
        if (typeof apply_kit_ear_wiggle === "function" && state.animate) {
            apply_kit_ear_wiggle(head);
        }
    }

    function render() {
        let stage = $("mainStage");
        disposeLive();
        stage.innerHTML = "";
        syncStageClasses(stage);

        let svg = createEl("svg", {
            viewBox: "-40 -100 480 540",
            xmlns: NS,
            width: "520",
            height: "520"
        });
        svg.style.overflow = "visible";
        let result = kit.compose(overlayRecipe(), { showMarkers: state.showMarkers });
        let head = result.group;
        svg.appendChild(head);
        stage.appendChild(svg);
        liveRoot = head;
        applyMotion(head);
        $("recipeLine").textContent = overlayCaption();
        setStatus(state.animate
            ? "Base is always on. Toggle decorations, or use a family preset."
            : "Animation off. Toggles still change which decorations are visible.");
    }

    function setExpression(next) {
        let prev = state.expression;
        state.expression = next;
        if (!liveRoot) {
            render();
            return;
        }
        if (typeof FeatureKit !== "undefined" && typeof FeatureKit.applyExpression === "function") {
            FeatureKit.applyExpression(liveRoot, next);
        }
        if (typeof kit_candle_set_mood === "function") {
            kit_candle_set_mood(liveRoot, next, state.animate);
        }
        if (typeof kit_moustache_set_mood === "function") {
            kit_moustache_set_mood(liveRoot, next, state.animate);
        }
        if (typeof kit_muffin_set_mood === "function") {
            kit_muffin_set_mood(liveRoot, next, state.animate);
        }
        if (typeof kit_clam_set_mood === "function") {
            kit_clam_set_mood(liveRoot, next, state.animate);
        }
        if (typeof kit_sea_nose_set_mood === "function") {
            kit_sea_nose_set_mood(liveRoot, next, state.animate);
        }
        if (prev === next) return;
    }

    function bindOverlayControls() {
        let host = $("overlayControls");
        host.innerHTML = "";
        SLOTS.forEach((slot) => {
            let row = document.createElement("div");
            row.className = "overlay-grid";
            let name = document.createElement("div");
            name.className = "slot-name";
            name.textContent = slot.label;
            let checks = document.createElement("div");
            checks.className = "theme-checks";
            themes().forEach((theme) => {
                let id = "ov_" + slot.key + "_" + theme;
                let label = document.createElement("label");
                let input = document.createElement("input");
                input.type = "checkbox";
                input.id = id;
                input.checked = !!(state.overlays[slot.key] && state.overlays[slot.key][theme]);
                input.addEventListener("change", () => {
                    state.overlays[slot.key][theme] = input.checked;
                    render();
                });
                label.appendChild(input);
                label.appendChild(document.createTextNode(theme));
                checks.appendChild(label);
            });
            row.appendChild(name);
            row.appendChild(checks);
            host.appendChild(row);
        });
    }

    function syncOverlayInputs() {
        SLOTS.forEach((slot) => {
            themes().forEach((theme) => {
                let input = $("ov_" + slot.key + "_" + theme);
                if (input) input.checked = !!(state.overlays[slot.key] && state.overlays[slot.key][theme]);
            });
        });
    }

    function applyPreset(theme) {
        SLOTS.forEach((slot) => {
            themes().forEach((name) => {
                state.overlays[slot.key][name] = name === theme;
            });
        });
        syncOverlayInputs();
        render();
        setStatus(theme
            ? ("Whole face set to " + theme + ". Checkboxes stay independent from here.")
            : "Back to baseline only.");
    }

    function applyClear() {
        state.overlays = emptyOverlays();
        syncOverlayInputs();
        render();
        setStatus("Baseline only.");
    }

    function fillNotes() {
        let notes = (kit && kit.notes && kit.notes.length)
            ? kit.notes.slice()
            : [];
        notes.push("This lab stacks overlays per slot. semantic_learning_kit recipes use one live family per head (mechanical / sea / sweet).");
        notes.push("Sweet candles snuff on Sad and relight on Happy without rebuilding the head.");
        notes.push("Stamps paint above the snout and clip to the shared shell silhouette.");
        let list = $("notesList");
        list.innerHTML = "";
        notes.forEach((text) => {
            let li = document.createElement("li");
            li.textContent = text;
            list.appendChild(li);
        });
    }

    async function start() {
        try {
            if (typeof FeatureKit === "undefined") {
                throw new Error("FeatureKit.js must load before KitOverlayLab.js.");
            }
            kit = new FeatureKit();
            await kit.load();
            bindOverlayControls();
            fillNotes();
            $("presetMechanical").addEventListener("click", () => applyPreset("mechanical"));
            $("presetMushroom").addEventListener("click", () => applyPreset("mushroom"));
            $("presetSea").addEventListener("click", () => applyPreset("sea"));
            $("presetSweet").addEventListener("click", () => applyPreset("sweet"));
            $("presetClear").addEventListener("click", applyClear);
            $("exprHappy").addEventListener("change", () => {
                if ($("exprHappy").checked) setExpression("happy");
            });
            $("exprSad").addEventListener("change", () => {
                if ($("exprSad").checked) setExpression("sad");
            });
            $("animateInput").addEventListener("change", () => {
                state.animate = $("animateInput").checked;
                render();
            });
            $("markersInput").addEventListener("change", () => {
                state.showMarkers = $("markersInput").checked;
                render();
            });
            $("hideHatMouthInput").addEventListener("change", () => {
                state.hideHatMouth = $("hideHatMouthInput").checked;
                render();
            });
            $("grayInput").addEventListener("change", () => {
                state.grayscale = $("grayInput").checked;
                render();
            });
            render();
            startGaze();
        } catch (err) {
            setStatus(String(err && err.message ? err.message : err));
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
