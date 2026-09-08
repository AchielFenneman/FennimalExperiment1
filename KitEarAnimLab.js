/**
 * Standalone preview for live kit-ear motion and stamp salience trials.
 */
(function () {
    "use strict";

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

    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function stampToken() {
        let stamps = kit.listTokens("stamp").filter((t) => t && t !== "none");
        return stamps.length ? pick(stamps) : "none";
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

    function randomRecipe(earToken) {
        let locks = { hair: true };
        let base = { hair: "none", expression: expression };
        if (earToken) {
            locks.ear = true;
            base.ear = earToken;
        }
        let recipe = kit.randomRecipe(locks, base);
        recipe.hair = "none";
        recipe.stamp = stampToken();
        recipe.expression = expression;
        if (earToken) recipe.ear = earToken;
        return recipe;
    }

    function recipeCaption(recipe) {
        return [
            recipe.ear + " ears",
            recipe.shell + " shell",
            recipe.eye + " eyes",
            recipe.lowerFace + " face",
            recipe.stamp + " stamp"
        ].join(" · ");
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

    function liveRecipes() {
        let ears = kit.listTokens("ear");
        let list = ears.map((ear) => randomRecipe(ear));
        while (list.length < 8) list.push(randomRecipe());
        return list;
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
            applyStampOptions(root);
        });
        setStatus(expression === "sad" ? "Sad faces. Stamps dim and shrink if the expression trial is on." : "Happy faces. Stamps brighten and grow if the expression trial is on.");
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

        liveRecipes().forEach((recipe, i) => {
            let item = makeCard(recipe, "Live · " + recipe.ear, true);
            liveHost.appendChild(item.card);
            apply_kit_ear_wiggle(item.root);
            applyStampOptions(item.root);
            liveRoots.push(item.root);
            if (i < 4) {
                let frozen = makeCard(recipe, "Frozen · " + recipe.ear, false);
                frozen.card.classList.add("is-frozen");
                freeze_fennimal_decorative_animations(frozen.root);
                frozenHost.appendChild(frozen.card);
            }
        });

        ["bat", "mushroom", "mechanical", "seashell"].forEach((ear) => {
            if (kit.listTokens("ear").indexOf(ear) < 0) return;
            let item = makeCard(randomRecipe(ear), "Stopped · " + ear, false);
            item.card.classList.add("is-frozen");
            stoppedHost.appendChild(item.card);
            apply_kit_ear_wiggle(item.root);
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
        setStatus("Heads ready. Click a live head to press stamps and pulse their outlines. Frozen rows stay still.");
    }

    function freezeLive() {
        liveRoots.forEach((root) => {
            restEyes(root);
            freeze_fennimal_decorative_animations(root);
        });
        setStatus("Live row frozen. Ear motion, gaze, spores, and stamp pulse should stop.");
    }

    function reviveLive() {
        liveRoots.forEach((root) => {
            apply_kit_ear_wiggle(root);
            applyFaceExpression(root);
            applyStampOptions(root);
        });
        setStatus("Live row restarted.");
    }

    async function start() {
        try {
            await kit.load();
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
