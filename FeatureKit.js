/**
 * Feature-kit head composer.
 * Loads SVG/Heads features.svg, catalogs tokens, and assembles a Fennimal head
 * by placing shell / ears / eyes / lower-face / hair on the shell markers.
 *
 * Used by feature_kit_lab.html and the feature_kit_pilot / feature_kit_combo_pilot experiments.
 */
(function (global) {
    "use strict";

    const NS = "http://www.w3.org/2000/svg";
    const SVG_PATH = "./SVG/Heads features.svg";

    const SLOTS = [
        { key: "shell", featureId: "feature_shell", groupClass: "shell_group", idPrefix: "shell_group_", required: true },
        { key: "ear", featureId: "feature_ear", groupClass: "ear_group", idPrefix: "ear_group_", required: true },
        { key: "eye", featureId: "feature_eye", groupClass: "eye_group", idPrefix: "eye_group_", required: true },
        { key: "lowerFace", featureId: "feature_lower_face", groupClass: "lower_face_group", idPrefix: "lower_face_group_", required: true },
        { key: "hair", featureId: "feature_hair", groupClass: "hair_group", idPrefix: "hair_group_", required: false }
    ];

    const HAPPY_CLASSES = [
        "mouth_happy", "eyebrow_happy", "eyelid_happy", "cheek_happy",
        "moustace_happy", "moustache_happy"
    ];
    const SAD_CLASSES = [
        "mouth_sad", "eyebrow_sad", "eyelid_sad", "cheek_sad",
        "moustace_sad", "moustache_sad"
    ];

    function FeatureKit() {
        this.svgPath = SVG_PATH;
        this.sourceSvg = null;
        this.catalog = null;
        this.notes = [];
    }

    FeatureKit.SVG_PATH = SVG_PATH;
    FeatureKit.SLOTS = SLOTS;
    FeatureKit.slotKeys = function () {
        return SLOTS.map((s) => s.key);
    };
    FeatureKit.unorderedPairs = function (arr) {
        let out = [];
        let list = arr || [];
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                out.push([list[i], list[j]]);
            }
        }
        return out;
    };

    FeatureKit.prototype.load = async function (path) {
        this.svgPath = path || SVG_PATH;
        let response = await fetch(encodeURI(this.svgPath) + "?v=" + Date.now(), { cache: "no-store" });
        if (!response.ok) {
            throw new Error("Could not load " + this.svgPath + " (" + response.status + ")");
        }
        let text = await response.text();
        let doc = new DOMParser().parseFromString(text, "image/svg+xml");
        let parsed = doc.documentElement;
        if (!parsed || parsed.nodeName.toLowerCase() === "parsererror") {
            throw new Error("Could not parse " + this.svgPath);
        }
        if (this.sourceSvg && this.sourceSvg.parentNode) this.sourceSvg.parentNode.removeChild(this.sourceSvg);
        parsed.id = "feature_kit_source";
        parsed.setAttribute("width", "0");
        parsed.setAttribute("height", "0");
        parsed.style.position = "absolute";
        parsed.style.left = "-9999px";
        parsed.style.overflow = "hidden";
        document.body.appendChild(parsed);
        this.sourceSvg = parsed;
        this.catalog = this._buildCatalog();
        this.notes = this._collectNotes();
        return this.catalog;
    };

    FeatureKit.prototype._buildCatalog = function () {
        let catalog = {};
        SLOTS.forEach((slot) => {
            let root = this.sourceSvg.getElementById(slot.featureId);
            if (!root) {
                catalog[slot.key] = [];
                return;
            }
            let groups = Array.prototype.slice.call(root.querySelectorAll("." + slot.groupClass));
            catalog[slot.key] = groups.map((el) => {
                let id = el.getAttribute("id") || "";
                let token = id.indexOf(slot.idPrefix) === 0 ? id.slice(slot.idPrefix.length) : id;
                return { token: token, id: id, element: el };
            }).filter((row) => row.token);
        });
        return catalog;
    };

    FeatureKit.prototype.listTokens = function (slotKey) {
        let rows = (this.catalog && this.catalog[slotKey]) || [];
        return rows.map((row) => row.token);
    };

    FeatureKit.prototype.tokensForPilot = function (slotKey) {
        return this.listTokens(slotKey).filter((token) => token && token !== "none");
    };

    FeatureKit.prototype.defaultRecipe = function () {
        return {
            shell: firstToken(this, "shell", "pear"),
            ear: firstToken(this, "ear", "elephant"),
            eye: firstToken(this, "eye", "round"),
            lowerFace: firstToken(this, "lowerFace", "smile"),
            hair: firstToken(this, "hair", "horns"),
            expression: "happy",
            scales: { ear: 1, eye: 1, lowerFace: 1, hair: 1 }
        };
    };

    FeatureKit.prototype.altRecipe = function () {
        return {
            shell: firstToken(this, "shell", "point"),
            ear: firstToken(this, "ear", "spikes"),
            eye: firstToken(this, "eye", "square"),
            lowerFace: firstToken(this, "lowerFace", "teeth"),
            hair: firstToken(this, "hair", "spikes"),
            expression: "happy",
            scales: { ear: 1, eye: 1, lowerFace: 1, hair: 1 }
        };
    };

    FeatureKit.prototype.randomRecipe = function (locks, base) {
        let recipe = Object.assign(this.defaultRecipe(), base || {});
        recipe.scales = Object.assign({ ear: 1, eye: 1, lowerFace: 1, hair: 1 }, recipe.scales || {});
        locks = locks || {};
        ["shell", "ear", "eye", "lowerFace", "hair"].forEach((key) => {
            if (locks[key]) return;
            let tokens = this.listTokens(key).slice();
            if (key === "hair") tokens.push("none");
            if (!tokens.length) return;
            recipe[key] = tokens[Math.floor(Math.random() * tokens.length)];
        });
        return recipe;
    };

    FeatureKit.prototype.normalizeRecipe = function (recipe) {
        let defaults = this.defaultRecipe();
        let out = Object.assign({}, defaults, recipe || {});
        out.scales = Object.assign({ ear: 1, eye: 1, lowerFace: 1, hair: 1 }, defaults.scales, (recipe && recipe.scales) || {});
        out.expression = out.expression === "sad" ? "sad" : "happy";
        ["shell", "ear", "eye", "lowerFace"].forEach((key) => {
            if (!tokenExists(this, key, out[key])) out[key] = defaults[key];
        });
        if (out.hair !== "none" && !tokenExists(this, "hair", out.hair)) out.hair = defaults.hair;
        return out;
    };

    FeatureKit.prototype.compose = function (recipe, options) {
        if (!this.sourceSvg) throw new Error("FeatureKit.load() first.");
        options = options || {};
        recipe = this.normalizeRecipe(recipe);
        let showMarkers = !!options.showMarkers;

        let head = createEl("g", {
            class: "Fennimal_head kit_head",
            "data-kit-shell": recipe.shell,
            "data-kit-ear": recipe.ear,
            "data-kit-eye": recipe.eye,
            "data-kit-lower-face": recipe.lowerFace,
            "data-kit-hair": recipe.hair || "none"
        });

        let earsLayer = createEl("g", { class: "kit_layer kit_ears" });
        let shellLayer = createEl("g", { class: "kit_layer kit_shell" });
        let lowerLayer = createEl("g", { class: "kit_layer kit_lower_face" });
        let eyesLayer = createEl("g", { class: "kit_layer kit_eyes" });
        let hairLayer = createEl("g", { class: "kit_layer kit_hair" });
        // Ears behind the shell; everything else in front, hair last.
        head.appendChild(earsLayer);
        head.appendChild(shellLayer);
        head.appendChild(lowerLayer);
        head.appendChild(eyesLayer);
        head.appendChild(hairLayer);

        let shellClone = this._cloneToken("shell", recipe.shell, recipe.expression);
        if (!shellClone) throw new Error("Missing shell token: " + recipe.shell);
        shellLayer.appendChild(shellClone);

        let leftEarAt = markerPoint(shellClone, [".ear_marker_left"]);
        let rightEarAt = markerPoint(shellClone, [".ear_marker_right"]);
        let leftEyeAt = markerPoint(shellClone, [".eye_marker_left"]);
        let rightEyeAt = markerPoint(shellClone, [".eye_marker_right"]);
        let lowerAt = markerPoint(shellClone, [".lower_face_marker"]);
        let hairAt = markerPoint(shellClone, [".hair_marker"]);

        let earToken = this._findToken("ear", recipe.ear);
        if (earToken && leftEarAt) {
            earsLayer.appendChild(this._placeClone(earToken.element, {
                dest: leftEarAt,
                srcSelectors: [".ear_marker", ".placement_marker"],
                scale: recipe.scales.ear,
                mirror: false,
                expression: recipe.expression,
                role: "ear_left"
            }));
        }
        if (earToken && rightEarAt) {
            earsLayer.appendChild(this._placeClone(earToken.element, {
                dest: rightEarAt,
                srcSelectors: [".ear_marker", ".placement_marker"],
                scale: recipe.scales.ear,
                mirror: true,
                expression: recipe.expression,
                role: "ear_right"
            }));
        }

        let lowerToken = this._findToken("lowerFace", recipe.lowerFace);
        if (lowerToken && lowerAt) {
            lowerLayer.appendChild(this._placeClone(lowerToken.element, {
                dest: lowerAt,
                srcSelectors: [
                    ".placement_marker_lower_face_center",
                    ".placement_marker.lower_face_marker",
                    ".lower_face_marker"
                ],
                scale: recipe.scales.lowerFace,
                mirror: false,
                expression: recipe.expression,
                role: "lower_face",
                preferOrigin: true
            }));
        }

        let eyeToken = this._findToken("eye", recipe.eye);
        if (eyeToken && leftEyeAt) {
            eyesLayer.appendChild(this._placeClone(eyeToken.element, {
                dest: leftEyeAt,
                srcSelectors: [".placement_marker_eye_center", ".eye_marker", ".placement_marker"],
                scale: recipe.scales.eye,
                mirror: false,
                expression: recipe.expression,
                role: "eye_left"
            }));
        }
        if (eyeToken && rightEyeAt) {
            eyesLayer.appendChild(this._placeClone(eyeToken.element, {
                dest: rightEyeAt,
                srcSelectors: [".placement_marker_eye_center", ".eye_marker", ".placement_marker"],
                scale: recipe.scales.eye,
                mirror: true,
                expression: recipe.expression,
                role: "eye_right"
            }));
        }

        if (recipe.hair && recipe.hair !== "none") {
            let hairToken = this._findToken("hair", recipe.hair);
            if (hairToken && hairAt) {
                hairLayer.appendChild(this._placeClone(hairToken.element, {
                    dest: hairAt,
                    srcSelectors: [".hair_marker", ".placement_marker"],
                    scale: recipe.scales.hair,
                    mirror: false,
                    expression: recipe.expression,
                    role: "hair"
                }));
            }
        }

        this._stampMouthPoint(head, lowerLayer);
        if (!showMarkers) hideConstruction(head);

        return {
            group: head,
            recipe: recipe,
            markers: {
                earLeft: leftEarAt,
                earRight: rightEarAt,
                eyeLeft: leftEyeAt,
                eyeRight: rightEyeAt,
                lowerFace: lowerAt,
                hair: hairAt
            }
        };
    };

    FeatureKit.prototype.composeSvg = function (recipe, options) {
        options = options || {};
        let svg = createEl("svg", {
            viewBox: options.viewBox || "-40 -80 480 520",
            xmlns: NS
        });
        svg.setAttribute("width", options.width || "400");
        svg.setAttribute("height", options.height || "400");
        let result = this.compose(recipe, options);
        svg.appendChild(result.group);
        result.svg = svg;
        return result;
    };

    FeatureKit.prototype._findToken = function (slotKey, token) {
        let rows = (this.catalog && this.catalog[slotKey]) || [];
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].token === token) return rows[i];
        }
        return null;
    };

    FeatureKit.prototype._cloneToken = function (slotKey, token, expression) {
        let row = this._findToken(slotKey, token);
        if (!row) return null;
        let clone = row.element.cloneNode(true);
        prepareClone(clone, expression);
        clone.removeAttribute("id");
        clone.setAttribute("data-kit-token", token);
        return clone;
    };

    FeatureKit.prototype._placeClone = function (sourceEl, spec) {
        let clone = sourceEl.cloneNode(true);
        prepareClone(clone, spec.expression);
        clone.removeAttribute("id");
        clone.setAttribute("data-kit-role", spec.role);
        let src = pickSourceMarker(clone, spec.srcSelectors, spec.preferOrigin);
        let srcPt = src || { x: 0, y: 0 };
        let scale = Number(spec.scale);
        if (!Number.isFinite(scale) || scale <= 0) scale = 1;
        let sx = spec.mirror ? -scale : scale;
        let parts = [
            "translate(" + spec.dest.x + " " + spec.dest.y + ")",
            "scale(" + sx + " " + scale + ")",
            "translate(" + (-srcPt.x) + " " + (-srcPt.y) + ")"
        ];
        clone.setAttribute("transform", parts.join(" "));
        clone.setAttribute("display", "inline");
        return clone;
    };

    FeatureKit.prototype._stampMouthPoint = function (head, lowerLayer) {
        let existing = lowerLayer.querySelector(".Fennimal_head_mouth_point");
        let local = existing ? circleCenter(existing) : { x: 0, y: 0 };
        let placed = lowerLayer.querySelector("[data-kit-role='lower_face']");
        let world = transformPoint(placed, local);
        if (existing) existing.setAttribute("display", "none");
        let stamped = head.querySelector(":scope > .Fennimal_head_mouth_point");
        if (!stamped) {
            stamped = createEl("circle", {
                class: "Fennimal_head_mouth_point invisible_element",
                r: "9",
                fill: "#2aff80"
            });
            head.appendChild(stamped);
        }
        stamped.setAttribute("cx", String(world.x));
        stamped.setAttribute("cy", String(world.y));
    };

    FeatureKit.prototype._collectNotes = function () {
        let notes = [];
        let shells = this.listTokens("shell");
        let visibleShells = [];
        (this.catalog.shell || []).forEach((row) => {
            if (!isDisplayNone(row.element)) visibleShells.push(row.token);
        });
        if (visibleShells.length > 1) {
            notes.push("Multiple shells are visible in the SVG (" + visibleShells.join(", ") + "). Hide unused shells with display=\"none\".");
        }
        let visibleHair = [];
        (this.catalog.hair || []).forEach((row) => {
            if (!isDisplayNone(row.element)) visibleHair.push(row.token);
        });
        if (visibleHair.length > 1) {
            notes.push("Multiple hair groups are visible (" + visibleHair.join(", ") + ").");
        }
        let hairOnShell = this.sourceSvg.querySelector("#feature_shell .hair_marker.ear_marker");
        if (hairOnShell) {
            notes.push("Shell hair markers also have class ear_marker. The composer uses .hair_marker / .ear_marker_left specifically; dropping ear_marker from hair points would avoid future collisions.");
        }
        let human = this.sourceSvg.getElementById("ear_group_human");
        if (human && human.querySelector("path[display='none']")) {
            notes.push("ear_group_human: the ear path itself is display=\"none\" (the composer unhides it).");
        }
        ["pig", "teeth"].forEach((token) => {
            let row = this._findToken("lowerFace", token);
            if (!row) return;
            if (!row.element.querySelector(".placement_marker_lower_face_center")) {
                notes.push("lower_face_group_" + token + " is missing placement_marker_lower_face_center; falling back to origin / lower_face_marker.");
            }
        });
        let moustache = this._findToken("lowerFace", "moustace") || this._findToken("lowerFace", "moustache");
        if (moustache) {
            let extras = moustache.element.querySelectorAll(".lower_face_marker");
            if (extras.length > 1) {
                notes.push("lower_face_group_moustace has extra lower_face_marker circles far from the origin (leftover construction).");
            }
            if (moustache.token === "moustace") {
                notes.push("Token id is moustace (missing 'h'). Fine for now; rename later if you want the spelling in recipes.");
            }
        }
        let square = this._findToken("eye", "square");
        if (square && square.element.querySelector(".eye_marker_right")) {
            notes.push("eye_group_square is a left-eye template but includes class eye_marker_right. Composer places from placement_marker_eye_center.");
        }
        let pearBbox = this.sourceSvg.querySelector("#shell_group_pear .hair_bbox");
        if (pearBbox) {
            notes.push("shell_group_pear has a hair_bbox path far outside the 400² artboard (ignored).");
        }
        if (shells.indexOf("point") >= 0 && shells.indexOf("pint") < 0) {
            notes.push("Shell token is point (not pint).");
        }
        return notes;
    };

    function firstToken(kit, slotKey, preferred) {
        let tokens = kit.listTokens(slotKey);
        if (preferred && tokens.indexOf(preferred) >= 0) return preferred;
        return tokens[0] || "";
    }

    function tokenExists(kit, slotKey, token) {
        return kit.listTokens(slotKey).indexOf(token) >= 0;
    }

    function createEl(name, attrs) {
        let el = document.createElementNS(NS, name);
        Object.keys(attrs || {}).forEach((key) => {
            if (attrs[key] == null) return;
            el.setAttribute(key, attrs[key]);
        });
        return el;
    }

    function circleCenter(el) {
        return {
            x: parseFloat(el.getAttribute("cx") || "0") || 0,
            y: parseFloat(el.getAttribute("cy") || "0") || 0
        };
    }

    function markerPoint(root, selectors) {
        for (let i = 0; i < selectors.length; i++) {
            let el = root.querySelector(selectors[i]);
            if (el) return circleCenter(el);
        }
        return null;
    }

    function pickSourceMarker(root, selectors, preferOrigin) {
        let candidates = [];
        selectors.forEach((sel) => {
            root.querySelectorAll(sel).forEach((el) => {
                if (candidates.indexOf(el) < 0) candidates.push(el);
            });
        });
        if (!candidates.length) return { x: 0, y: 0 };
        if (preferOrigin && candidates.length > 1) {
            candidates.sort((a, b) => {
                let pa = circleCenter(a);
                let pb = circleCenter(b);
                return (pa.x * pa.x + pa.y * pa.y) - (pb.x * pb.x + pb.y * pb.y);
            });
        }
        return circleCenter(candidates[0]);
    }

    function prepareClone(root, expression) {
        stripIds(root);
        revealArt(root);
        applyExpression(root, expression);
        root.querySelectorAll(".hair_bbox, .lower_face_bbox").forEach((el) => {
            el.setAttribute("display", "none");
        });
    }

    function stripIds(root) {
        if (root.removeAttribute) root.removeAttribute("id");
        root.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    }

    function revealArt(root) {
        function show(el) {
            if (el.nodeType !== 1) return;
            if (el.hasAttribute("display") && el.getAttribute("display") === "none") {
                if (isConstruction(el) || isExpressionVariant(el)) return;
                el.setAttribute("display", "inline");
            }
        }
        show(root);
        root.querySelectorAll("*").forEach(show);
    }

    function isConstruction(el) {
        let cls = el.getAttribute("class") || "";
        return cls.indexOf("invisible_element") >= 0
            || cls.indexOf("placement_marker") >= 0
            || cls.indexOf("_bbox") >= 0;
    }

    function isExpressionVariant(el) {
        let cls = el.getAttribute("class") || "";
        return HAPPY_CLASSES.concat(SAD_CLASSES).some((name) => cls.indexOf(name) >= 0);
    }

    function applyExpression(root, expression) {
        let hide = expression === "sad" ? HAPPY_CLASSES : SAD_CLASSES;
        let show = expression === "sad" ? SAD_CLASSES : HAPPY_CLASSES;
        hide.forEach((name) => {
            root.querySelectorAll("." + name).forEach((el) => el.setAttribute("display", "none"));
        });
        show.forEach((name) => {
            root.querySelectorAll("." + name).forEach((el) => el.setAttribute("display", "inline"));
        });
    }

    function hideConstruction(root) {
        root.querySelectorAll(".invisible_element, .placement_marker, .hair_bbox, .lower_face_bbox").forEach((el) => {
            el.setAttribute("display", "none");
        });
    }

    function isDisplayNone(el) {
        let d = el.getAttribute("display");
        if (d === "none") return true;
        let parent = el.parentElement;
        while (parent) {
            if (parent.getAttribute && parent.getAttribute("display") === "none") return true;
            parent = parent.parentElement;
        }
        return false;
    }

    function transformPoint(el, pt) {
        if (!el) return pt;
        let raw = el.getAttribute("transform") || "";
        let t = parseTranslateScaleTranslate(raw);
        if (!t) return pt;
        return {
            x: t.tx + t.sx * (pt.x + t.ux),
            y: t.ty + t.sy * (pt.y + t.uy)
        };
    }

    function parseTranslateScaleTranslate(raw) {
        let m = String(raw).trim().match(
            /^translate\(\s*([-0-9.eE+]+)\s+([-0-9.eE+]+)\s*\)\s*scale\(\s*([-0-9.eE+]+)\s+([-0-9.eE+]+)\s*\)\s*translate\(\s*([-0-9.eE+]+)\s+([-0-9.eE+]+)\s*\)$/
        );
        if (!m) return null;
        return {
            tx: parseFloat(m[1]),
            ty: parseFloat(m[2]),
            sx: parseFloat(m[3]),
            sy: parseFloat(m[4]),
            ux: parseFloat(m[5]),
            uy: parseFloat(m[6])
        };
    }

    global.FeatureKit = FeatureKit;
})(window);
