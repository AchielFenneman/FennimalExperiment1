/**
 * Feature-kit head composer (shared baseline + theme overlays).
 * Loads SVG/Heads features compatible.svg and assembles a Fennimal head
 * by cloning one feature root per slot, always showing .baseline parts, and
 * toggling family frills (mechanical / sea / sweet; mushroom leftover in art).
 *
 * Recipe tokens are theme names per slot, or "none" for baseline only.
 * Arrays (or "sea+sweet") stack overlays — overlay lab and overlay-fade morphs.
 * Game recipes are one theme per slot. Hair is unused.
 *
 * composeOverlayFade keeps .baseline at full opacity, omits stacked shell
 * textures by default, and sets family-frill opacity so the jumble swings
 * toward either parent.
 *
 * Used by kit-head training (`semantic_learning_kit`), which registers composed
 * recipes as Fennimal_head_* templates under #All_Heads.
 * Kit pilots and labs are archived under archive/Fennimal head kit development/.
 * Those labs may set window.__FEATURE_KIT_SVG_PATH__ before this file loads.
 */
(function (global) {
    "use strict";

    const NS = "http://www.w3.org/2000/svg";
    const SVG_PATH = (global.__FEATURE_KIT_SVG_PATH__) || "./SVG/Heads features compatible.svg";
    const THEMES = ["mechanical", "mushroom", "sea", "sweet"];
    const LIVE_THEMES = ["mechanical", "sea", "sweet"];

    const SLOTS = [
        { key: "shell", featureId: "feature_shell", overlayClass: "texture", required: true, noneable: true },
        { key: "ear", featureId: "feature_ear", overlayClass: "ear_part", required: true, noneable: true },
        { key: "eye", featureId: "feature_eye", overlayClass: "eye_part", required: true, noneable: true },
        { key: "lowerFace", featureId: "feature_lower_face", overlayClass: "lower_face_part", required: true, noneable: true },
        { key: "hair", featureId: "feature_hair", overlayClass: null, required: false, noneable: true },
        { key: "stamp", featureId: "feature_stamp", overlayClass: null, stampPrefix: "stamp_group_", required: false, noneable: true }
    ];

    const HAPPY_CLASSES = [
        "mouth_happy", "eyebrow_happy", "eyelid_happy", "cheek_happy",
        "moustace_happy", "moustache_happy", "whiskers_happy", "beard_happy", "face_happy",
        "meter_happy"
    ];
    const SAD_CLASSES = [
        "mouth_sad", "eyebrow_sad", "eyelid_sad", "cheek_sad",
        "moustace_sad", "moustache_sad", "whiskers_sad", "beard_sad", "face_sad",
        "meter_sad"
    ];

    let kitClipSeq = 0;

    function FeatureKit() {
        this.svgPath = SVG_PATH;
        this.sourceSvg = null;
        this.catalog = null;
        this.notes = [];
    }

    FeatureKit.SVG_PATH = SVG_PATH;
    FeatureKit.SLOTS = SLOTS;
    FeatureKit.THEMES = THEMES.slice();
    FeatureKit.LIVE_THEMES = LIVE_THEMES.slice();
    FeatureKit.slotKeys = function () {
        return SLOTS.map((s) => s.key);
    };
    FeatureKit.noneableKeys = function () {
        return SLOTS.filter((s) => s.noneable !== false).map((s) => s.key);
    };
    FeatureKit.defaultScales = function () {
        return { ear: 1, eye: 1, lowerFace: 1, hair: 1, stamp: 1 };
    };
    FeatureKit.overlayTokens = overlayTokens;
    FeatureKit.familyRecipe = function (theme, extra) {
        let t = String(theme || "").trim();
        return Object.assign({
            shell: t || "none",
            ear: t || "none",
            eye: t || "none",
            lowerFace: t || "none",
            hair: "none",
            stamp: t || "none",
            expression: "happy",
            scales: FeatureKit.defaultScales()
        }, extra || {});
    };
    FeatureKit.slotDef = function (key) {
        for (let i = 0; i < SLOTS.length; i++) {
            if (SLOTS[i].key === key) return SLOTS[i];
        }
        return null;
    };
    FeatureKit.sharedInstance = null;
    FeatureKit.shared = function () {
        if (!FeatureKit.sharedInstance) FeatureKit.sharedInstance = new FeatureKit();
        return FeatureKit.sharedInstance;
    };

    // Slot jumble: polarity 0 takes set_a from recipeA / set_b from recipeB;
    // polarity 1 swaps those coalitions. Unlisted slots stay on recipeA so the
    // reverse is a clean chance control of the contested set only.
    FeatureKit.mixRecipes = function (recipeA, recipeB, partition, polarity) {
        let a = recipeA || {};
        let b = recipeB || {};
        partition = partition || {};
        let pol = Number(polarity) ? 1 : 0;
        let setA = Array.isArray(partition.set_a) ? partition.set_a : [];
        let setB = Array.isArray(partition.set_b) ? partition.set_b : [];
        let fromFenA = pol === 0 ? setA : setB;
        let fromFenB = pol === 0 ? setB : setA;
        let out = Object.assign({}, a);
        out.scales = Object.assign(FeatureKit.defaultScales());
        FeatureKit.slotKeys().forEach((key) => {
            let src = fromFenA.indexOf(key) >= 0 ? a : (fromFenB.indexOf(key) >= 0 ? b : a);
            out[key] = src[key];
            if (src.scales && src.scales[key] != null) out.scales[key] = src.scales[key];
        });
        out.expression = a.expression === "sad" || b.expression === "sad" ? (a.expression || "happy") : (a.expression || "happy");
        return out;
    };

    // Explicit C-vs-D jumble: each slot names the parent Fennimal id ("C" or "D").
    FeatureKit.mixFromSlotMap = function (recipeByParentId, slotMap) {
        let recipes = recipeByParentId || {};
        let map = slotMap || {};
        let out = {
            expression: "happy",
            scales: FeatureKit.defaultScales()
        };
        FeatureKit.slotKeys().forEach((key) => {
            let parent = map[key];
            let def = FeatureKit.slotDef(key);
            if (parent == null || String(parent).trim() === "") {
                if (def && !def.required) {
                    out[key] = "none";
                    return;
                }
                throw new Error('FeatureKit.mixFromSlotMap: jumble is missing slot "' + key + '".');
            }
            let rec = recipes[parent];
            if (!rec) {
                throw new Error(
                    'FeatureKit.mixFromSlotMap: jumble.' + key + ' parent "' + parent + '" has no recipe.'
                );
            }
            out[key] = rec[key];
            if (rec.scales && rec.scales[key] != null) out.scales[key] = rec.scales[key];
            if (rec.expression) out.expression = rec.expression;
        });
        return out;
    };

    FeatureKit.reverseSlotMap = function (slotMap) {
        let out = {};
        Object.keys(slotMap || {}).forEach((key) => {
            let v = slotMap[key];
            out[key] = v === "C" ? "D" : (v === "D" ? "C" : v);
        });
        return out;
    };

    FeatureKit.CONTESTED_SLOTS = ["shell", "ear", "eye", "lowerFace", "stamp"];
    FeatureKit.WELL_FIT_PAD = 0.86;

    FeatureKit.parentSlotCounts = function (slotMap, keys) {
        let counts = {};
        (keys || FeatureKit.CONTESTED_SLOTS).forEach((key) => {
            let parent = slotMap && slotMap[key];
            if (parent == null || String(parent).trim() === "") return;
            let id = String(parent);
            counts[id] = (counts[id] || 0) + 1;
        });
        return counts;
    };

    FeatureKit.majorityParent = function (slotMap, keys) {
        let counts = FeatureKit.parentSlotCounts(slotMap, keys);
        let best = null;
        let n = 0;
        let tie = false;
        Object.keys(counts).forEach((id) => {
            if (counts[id] > n) {
                best = id;
                n = counts[id];
                tie = false;
            } else if (counts[id] === n && n > 0) {
                tie = true;
            }
        });
        return tie ? null : best;
    };

    FeatureKit.shellSilhouetteBox = function (group) {
        let layer = group && group.querySelector(".kit_shell");
        let sil = null;
        if (layer) {
            let paths = layer.querySelectorAll("path");
            for (let i = 0; i < paths.length; i++) {
                let path = paths[i];
                if ((path.getAttribute("class") || "").indexOf("invisible_element") >= 0) continue;
                if ((path.getAttribute("class") || "").indexOf("texture") >= 0) continue;
                if (path.getAttribute("display") === "none") continue;
                let fill = path.getAttribute("fill");
                if (!fill || fill === "none") continue;
                let opacity = path.getAttribute("opacity");
                if (opacity != null && Number(opacity) < 0.5) continue;
                sil = path;
                break;
            }
        }
        try {
            let b = (sil || layer || group).getBBox();
            if (b && b.width > 0 && b.height > 0) return b;
        } catch (err) { /* not in the render tree yet */ }
        return null;
    };

    FeatureKit.fitGroupInBoxByShell = function (node, box, opts) {
        if (!node || !box) return false;
        opts = opts || {};
        let pad = opts.pad != null ? opts.pad : FeatureKit.WELL_FIT_PAD;
        let align = opts.align || "center";
        let b = FeatureKit.shellSilhouetteBox(node);
        if (!b || !(b.width > 0 && b.height > 0)) return false;
        let wellW = box.width != null ? box.width : box.w;
        let wellH = box.height != null ? box.height : box.h;
        let wellX = box.x != null ? box.x : (box.cx - wellW / 2);
        let wellY = box.y != null ? box.y : (box.cy - wellH / 2);
        if (![wellW, wellH, wellX, wellY].every(Number.isFinite)) return false;
        let span = Math.max(b.width, b.height);
        let scale = (Math.min(wellW, wellH) * pad) / span;
        if (!Number.isFinite(scale) || scale <= 0) return false;
        let cx = b.x + b.width / 2;
        let cy = b.y + b.height / 2;
        let inset = Math.max(4, wellW * 0.02);
        let wellCx = (align === "right")
            ? (wellX + wellW - inset - (b.width * scale) / 2)
            : (wellX + wellW / 2);
        let wellCy = wellY + wellH / 2;
        node.setAttribute(
            "transform",
            "translate(" + wellCx + " " + wellCy + ") scale(" + scale + ") translate(" + (-cx) + " " + (-cy) + ")"
        );
        return true;
    };

    FeatureKit.recipeFamily = function (recipe) {
        recipe = recipe || {};
        let id = String(recipe.id || "");
        if (id === "H1") return "mechanical";
        if (id === "H2") return "sweet";
        if (id === "H3") return "sea";
        let slots = ["shell", "ear", "eye", "lowerFace", "stamp"];
        let tokens = [];
        slots.forEach((slot) => {
            let t = overlayTokens(recipe[slot]);
            if (t.length === 1) tokens.push(t[0]);
        });
        if (!tokens.length) return "";
        if (tokens.every((t) => t === tokens[0])) return tokens[0];
        return "";
    };
    FeatureKit.gistLinesForRecipe = function (recipe) {
        recipe = recipe || {};
        let family = FeatureKit.recipeFamily(recipe);
        let dict = (typeof GenParam !== "undefined" && GenParam.kitFamilyGists) || null;
        let familyLines = family && dict && dict[family];
        if (Array.isArray(familyLines) && familyLines.length) return familyLines.slice();
        function slotWords(value, fallback) {
            let tokens = overlayTokens(value);
            if (!tokens.length) return fallback;
            return tokens.join(" and ").replace(/_/g, " ");
        }
        let familyWord = slotWords(recipe.shell, "plain");
        let ear = slotWords(recipe.ear, "simple") + " ears";
        let eye = slotWords(recipe.eye, "plain") + " eyes";
        let mouth = slotWords(recipe.lowerFace, "simple") + " snout";
        let stamp = overlayTokens(recipe.stamp).length
            ? slotWords(recipe.stamp, "") + " on the cheeks"
            : "no cheek marks";
        return [
            "A round face with " + ear + " and a " + mouth,
            "A face with " + eye + " and " + stamp,
            "A " + familyWord + " face: " + ear + ", " + eye + ", and " + mouth
        ];
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

    FeatureKit.prototype.ensureLoaded = async function (path) {
        if (this.catalog && this.sourceSvg) return this.catalog;
        return this.load(path);
    };

    FeatureKit.prototype.injectGistStub = function (headId, recipe) {
        if (typeof GenParam === "undefined" || !GenParam.gistDescriptions) return;
        if (!GenParam.gistDescriptions.heads) GenParam.gistDescriptions.heads = {};
        let id = String(headId || "").replace(/^Fennimal_head_/, "");
        if (!id) return;
        GenParam.gistDescriptions.heads[id] = FeatureKit.gistLinesForRecipe(recipe);
    };

    // Compose each recipe and register it as Fennimal_head_<id> under #All_Heads
    // so map / polaroids / sorting / hat-binding keep using create_Fennimal_SVG_object*.
    FeatureKit.prototype.registerRoster = function (recipesById) {
        let layer = document.getElementById("All_Heads");
        if (!layer) throw new Error("FeatureKit.registerRoster: missing #All_Heads");
        if (!this.sourceSvg) throw new Error("FeatureKit.load() first.");
        let ids = [];
        Object.keys(recipesById || {}).forEach((rawId) => {
            let id = String(rawId || "").replace(/^Fennimal_head_/, "");
            if (!id) return;
            let old = document.getElementById("Fennimal_head_" + id);
            if (old && old.parentNode) old.parentNode.removeChild(old);
            let result = this.compose(recipesById[rawId], { showMarkers: false });
            let head = result.group;
            head.setAttribute("id", "Fennimal_head_" + id);
            head.classList.add("Fennimal_head", "kit_head", "overlay_head");
            if (typeof set_Fennimal_color_classes === "function") {
                set_Fennimal_color_classes(head);
            }
            layer.appendChild(head);
            this.injectGistStub(id, result.recipe);
            ids.push(id);
        });
        return ids;
    };

    FeatureKit.prototype._buildCatalog = function () {
        let catalog = {};
        SLOTS.forEach((slot) => {
            catalog[slot.key] = [];
            if (slot.key === "hair") return;
            if (slot.stampPrefix) {
                THEMES.forEach((theme) => {
                    let el = this.sourceSvg.getElementById(slot.stampPrefix + theme);
                    if (el) catalog[slot.key].push({ token: theme, id: el.id, element: el });
                });
                return;
            }
            let root = this.sourceSvg.getElementById(slot.featureId);
            if (!root || !slot.overlayClass) return;
            THEMES.forEach((theme) => {
                if (overlayPartNodes(root, slot.overlayClass, theme).length) {
                    catalog[slot.key].push({ token: theme, id: slot.overlayClass + "_" + theme, element: root });
                }
            });
        });
        return catalog;
    };

    FeatureKit.prototype.listTokens = function (slotKey) {
        let rows = (this.catalog && this.catalog[slotKey]) || [];
        return rows.map((row) => row.token);
    };

    FeatureKit.prototype.tokensForPilot = function (slotKey) {
        return this.listTokens(slotKey).filter((token) => {
            return token && token !== "none" && LIVE_THEMES.indexOf(token) >= 0;
        });
    };

    FeatureKit.prototype.familyRecipe = function (theme, extra) {
        let rec = FeatureKit.familyRecipe(theme, extra);
        FeatureKit.slotKeys().forEach((key) => {
            if (key === "hair") {
                rec[key] = "none";
                return;
            }
            if (rec[key] !== "none" && !tokenExists(this, key, rec[key])) rec[key] = "none";
        });
        return rec;
    };

    FeatureKit.prototype.defaultRecipe = function () {
        return this.familyRecipe(LIVE_THEMES[0] || THEMES[0]);
    };

    FeatureKit.prototype.altRecipe = function () {
        return this.familyRecipe(LIVE_THEMES[1] || LIVE_THEMES[0] || THEMES[0]);
    };

    FeatureKit.prototype.randomRecipe = function (locks, base) {
        let recipe = Object.assign(this.defaultRecipe(), base || {});
        recipe.scales = Object.assign(FeatureKit.defaultScales(), recipe.scales || {});
        locks = locks || {};
        FeatureKit.slotKeys().forEach((key) => {
            if (locks[key]) return;
            let tokens = this.listTokens(key).slice();
            tokens.push("none");
            if (!tokens.length) return;
            recipe[key] = tokens[Math.floor(Math.random() * tokens.length)];
        });
        recipe.hair = "none";
        return recipe;
    };

    FeatureKit.prototype.normalizeRecipe = function (recipe) {
        let defaults = this.defaultRecipe();
        let out = Object.assign({}, defaults, recipe || {});
        out.scales = Object.assign(FeatureKit.defaultScales(), defaults.scales, (recipe && recipe.scales) || {});
        out.expression = out.expression === "sad" ? "sad" : "happy";
        FeatureKit.slotKeys().forEach((key) => {
            let tokens = overlayTokens(out[key]).filter((token) => tokenExists(this, key, token));
            if (!tokens.length) out[key] = "none";
            else if (tokens.length === 1) out[key] = tokens[0];
            else out[key] = tokens;
        });
        out.hair = "none";
        return out;
    };

    FeatureKit.prototype.compose = function (recipe, options) {
        if (!this.sourceSvg) throw new Error("FeatureKit.load() first.");
        options = options || {};
        recipe = this.normalizeRecipe(recipe);
        let showMarkers = !!options.showMarkers;
        let slotAttr = function (value) {
            let tokens = overlayTokens(value);
            return tokens.length ? tokens.join("+") : "none";
        };

        let head = createEl("g", {
            class: "Fennimal_head kit_head overlay_head",
            "data-kit-shell": slotAttr(recipe.shell),
            "data-kit-ear": slotAttr(recipe.ear),
            "data-kit-eye": slotAttr(recipe.eye),
            "data-kit-lower-face": slotAttr(recipe.lowerFace),
            "data-kit-hair": "none",
            "data-kit-stamp": slotAttr(recipe.stamp)
        });

        let earsLayer = createEl("g", { class: "kit_layer kit_ears" });
        let shellLayer = createEl("g", { class: "kit_layer kit_shell" });
        let eyesLayer = createEl("g", { class: "kit_layer kit_eyes" });
        let lowerLayer = createEl("g", { class: "kit_layer kit_lower_face" });
        let stampLayer = createEl("g", { class: "kit_layer kit_stamp" });
        let hairLayer = createEl("g", { class: "kit_layer kit_hair" });
        // Paint order: ears → shell → eyes → snout → stamps. Hair unused.
        head.appendChild(earsLayer);
        head.appendChild(shellLayer);
        head.appendChild(eyesLayer);
        head.appendChild(lowerLayer);
        head.appendChild(stampLayer);
        head.appendChild(hairLayer);

        let shellClone = this._cloneFeature("feature_shell");
        if (!shellClone) throw new Error("Missing feature_shell in " + this.svgPath);
        this._applySlotOverlays(shellClone, "texture", recipe.shell);
        this._prepareOverlayClone(shellClone, recipe.expression);
        shellLayer.appendChild(shellClone);

        let leftEarAt = markerPoint(shellClone, [".ear_marker_left"]);
        let rightEarAt = markerPoint(shellClone, [".ear_marker_right"]);
        let leftEyeAt = markerPoint(shellClone, [".eye_marker_left"]);
        let rightEyeAt = markerPoint(shellClone, [".eye_marker_right"]);
        let lowerAt = markerPoint(shellClone, [".lower_face_marker"]);
        let hairAt = markerPoint(shellClone, [".hair_marker"]);
        let leftStampAt = markerPoint(shellClone, [".stamp_marker_left"]);
        let rightStampAt = markerPoint(shellClone, [".stamp_marker_right"]);

        let earSrc = this._cloneFeature("feature_ear");
        this._applySlotOverlays(earSrc, "ear_part", recipe.ear);
        this._prepareOverlayClone(earSrc, recipe.expression);
        if (earSrc && leftEarAt) {
            earsLayer.appendChild(wrapEarForWiggle(this._placeClone(earSrc, {
                dest: leftEarAt,
                srcSelectors: [".ear_marker", ".placement_marker"],
                scale: recipe.scales.ear,
                mirror: false,
                expression: recipe.expression,
                role: "ear_left"
            }), recipe.ear));
        }
        if (earSrc && rightEarAt) {
            earsLayer.appendChild(wrapEarForWiggle(this._placeClone(earSrc, {
                dest: rightEarAt,
                srcSelectors: [".ear_marker", ".placement_marker"],
                scale: recipe.scales.ear,
                mirror: true,
                expression: recipe.expression,
                role: "ear_right"
            }), recipe.ear));
        }

        let lowerSrc = this._cloneFeature("feature_lower_face");
        this._applySlotOverlays(lowerSrc, "lower_face_part", recipe.lowerFace);
        this._prepareOverlayClone(lowerSrc, recipe.expression);
        if (lowerSrc && lowerAt) {
            lowerLayer.appendChild(this._placeClone(lowerSrc, {
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

        let eyeSrc = this._cloneFeature("feature_eye");
        this._applySlotOverlays(eyeSrc, "eye_part", recipe.eye);
        this._prepareOverlayClone(eyeSrc, recipe.expression);
        let leftEye = null;
        let rightEye = null;
        if (eyeSrc && leftEyeAt) {
            leftEye = this._placeClone(eyeSrc, {
                dest: leftEyeAt,
                srcSelectors: [".placement_marker_eye_center", ".eye_marker", ".placement_marker"],
                scale: recipe.scales.eye,
                mirror: false,
                expression: recipe.expression,
                role: "eye_left"
            });
        }
        if (eyeSrc && rightEyeAt) {
            rightEye = this._placeClone(eyeSrc, {
                dest: rightEyeAt,
                srcSelectors: [".placement_marker_eye_center", ".eye_marker", ".placement_marker"],
                scale: recipe.scales.eye,
                mirror: true,
                expression: recipe.expression,
                role: "eye_right"
            });
            unmirrorInnerEye(rightEye);
        }
        let leftParts = splitPlacedEye(leftEye);
        let rightParts = splitPlacedEye(rightEye);
        function appendEyePart(part) {
            if (part) eyesLayer.appendChild(part);
        }
        appendEyePart(rightParts && rightParts.back);
        appendEyePart(leftParts && leftParts.back);
        appendEyePart(rightParts && rightParts.orb);
        appendEyePart(rightParts && rightParts.front);
        appendEyePart(leftParts && leftParts.orb);
        appendEyePart(leftParts && leftParts.front);

        overlayTokens(recipe.stamp).forEach((theme) => {
            let stampSrc = this.sourceSvg.getElementById("stamp_group_" + theme);
            if (!stampSrc) return;
            let stampScale = (recipe.scales && recipe.scales.stamp) || 1;
            if (leftStampAt) {
                stampLayer.appendChild(this._placeClone(stampSrc, {
                    dest: leftStampAt,
                    srcSelectors: [".stamp_marker", ".placement_marker"],
                    scale: stampScale,
                    mirror: false,
                    expression: recipe.expression,
                    role: "stamp_left",
                    theme: theme
                }));
            }
            if (rightStampAt) {
                stampLayer.appendChild(this._placeClone(stampSrc, {
                    dest: rightStampAt,
                    srcSelectors: [".stamp_marker", ".placement_marker"],
                    scale: stampScale,
                    mirror: true,
                    expression: recipe.expression,
                    role: "stamp_right",
                    theme: theme
                }));
            }
        });
        if (stampLayer.childNodes.length) {
            clipLayerToShell(stampLayer, head, pickShellSilhouette(shellClone));
        }

        this._stampMouthPoint(head, lowerLayer);
        this._stampHatPoint(head, shellClone);
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
                hair: hairAt,
                stampLeft: leftStampAt,
                stampRight: rightStampAt
            }
        };
    };

    FeatureKit.overlayFadeOpacity = function (inA, inB, mixTowardA) {
        let a = Math.max(0, Math.min(1, Number(mixTowardA)));
        if (!Number.isFinite(a)) a = 0.5;
        if (inA && inB) return 1;
        function uniqueOp(weight) {
            if (weight <= 0) return 0;
            if (weight >= 1) return 1;
            // Shared baseline stays at 1; lift mid-mix unique frills so they
            // don't wash out. 50/50 → 0.65 instead of 0.5.
            return 0.3 + 0.7 * weight;
        }
        if (inA) return uniqueOp(a);
        if (inB) return uniqueOp(1 - a);
        return 0;
    };

    FeatureKit.applyOverlayFade = function (root, recipeA, recipeB, mixTowardA, options) {
        if (!root) return;
        options = options || {};
        recipeA = recipeA || {};
        recipeB = recipeB || {};
        SLOTS.forEach((slot) => {
            if (slot.key === "shell" && !options.includeShellTexture) return;
            let tokensA = overlayTokens(recipeA[slot.key]);
            let tokensB = overlayTokens(recipeB[slot.key]);
            if (slot.stampPrefix) {
                root.querySelectorAll("[data-kit-role='stamp_left'], [data-kit-role='stamp_right']").forEach((el) => {
                    let theme = el.getAttribute("data-kit-theme");
                    let op = FeatureKit.overlayFadeOpacity(
                        tokensA.indexOf(theme) >= 0,
                        tokensB.indexOf(theme) >= 0,
                        mixTowardA
                    );
                    el.setAttribute("opacity", String(op));
                    el.setAttribute("display", op > 0 ? "inline" : "none");
                });
                return;
            }
            if (!slot.overlayClass) return;
            THEMES.forEach((theme) => {
                overlayPartNodes(root, slot.overlayClass, theme).forEach((el) => {
                    let op = FeatureKit.overlayFadeOpacity(
                        tokensA.indexOf(theme) >= 0,
                        tokensB.indexOf(theme) >= 0,
                        mixTowardA
                    );
                    el.setAttribute("opacity", String(op));
                    el.setAttribute("display", op > 0 ? "inline" : "none");
                });
            });
        });
    };

    FeatureKit.prototype.composeOverlayFade = function (recipeA, recipeB, mixTowardA, options) {
        options = options || {};
        recipeA = this.normalizeRecipe(recipeA);
        recipeB = this.normalizeRecipe(recipeB);
        let mix = Math.max(0, Math.min(1, Number(mixTowardA)));
        if (!Number.isFinite(mix)) mix = 0.5;
        let stacked = {
            expression: recipeA.expression === "sad" || recipeB.expression === "sad" ? "sad" : "happy",
            scales: Object.assign(FeatureKit.defaultScales(), recipeA.scales, recipeB.scales),
            hair: "none"
        };
        FeatureKit.slotKeys().forEach((key) => {
            if (key === "hair") {
                stacked[key] = "none";
                return;
            }
            // Stacked family textures turn the shared shell into camouflage.
            // Overlay fade keeps the homologous baseline shell only.
            if (key === "shell" && !options.includeShellTexture) {
                stacked[key] = "none";
                return;
            }
            let tokens = [];
            overlayTokens(recipeA[key]).concat(overlayTokens(recipeB[key])).forEach((token) => {
                if (token && tokens.indexOf(token) < 0) tokens.push(token);
            });
            stacked[key] = tokens.length ? tokens : "none";
        });
        let result = this.compose(stacked, options);
        FeatureKit.applyOverlayFade(result.group, recipeA, recipeB, mix, options);
        result.group.setAttribute("data-kit-overlay-fade", String(Math.round(mix * 1000) / 1000));
        result.mixTowardA = mix;
        result.recipeA = recipeA;
        result.recipeB = recipeB;
        return result;
    };

    FeatureKit.prototype.composeOverlayFadeSvg = function (recipeA, recipeB, mixTowardA, options) {
        options = options || {};
        let svg = createEl("svg", {
            viewBox: options.viewBox || "-40 -80 480 520",
            xmlns: NS
        });
        svg.setAttribute("width", options.width || "400");
        svg.setAttribute("height", options.height || "400");
        let result = this.composeOverlayFade(recipeA, recipeB, mixTowardA, options);
        svg.appendChild(result.group);
        result.svg = svg;
        return result;
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

    FeatureKit.prototype._cloneFeature = function (id) {
        let src = this.sourceSvg.getElementById(id);
        if (!src) return null;
        let clone = src.cloneNode(true);
        stripIds(clone);
        clone.removeAttribute("id");
        clone.setAttribute("display", "inline");
        return clone;
    };

    FeatureKit.prototype._applySlotOverlays = function (root, partClass, value) {
        if (!root || !partClass) return;
        let on = {};
        overlayTokens(value).forEach((theme) => { on[theme] = true; });
        THEMES.forEach((theme) => {
            overlayPartNodes(root, partClass, theme).forEach((el) => {
                setDisplay(el, !!on[theme]);
            });
        });
    };

    FeatureKit.prototype._prepareOverlayClone = function (root, expression) {
        if (!root) return;
        stripIds(root);
        root.setAttribute("display", "inline");
        root.querySelectorAll(".baseline").forEach((el) => setDisplay(el, true));
        applyExpression(root, expression);
        root.querySelectorAll(".hair_bbox, .lower_face_bbox").forEach((el) => {
            el.setAttribute("display", "none");
        });
    };

    FeatureKit.prototype._placeClone = function (sourceEl, spec) {
        let clone = sourceEl.cloneNode(true);
        preparePlacedClone(clone, spec.expression);
        clone.removeAttribute("id");
        clone.setAttribute("data-kit-role", spec.role);
        if (spec.theme) clone.setAttribute("data-kit-theme", spec.theme);
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

    function unmirrorInnerEye(root) {
        if (!root) return;
        root.querySelectorAll(".eye_gaze").forEach((gaze) => {
            let wrap = createEl("g", { "data-kit-unmirror-gaze": "1" });
            wrap.setAttribute("transform", "scale(-1 1)");
            while (gaze.firstChild) wrap.appendChild(gaze.firstChild);
            gaze.appendChild(wrap);
        });
    }

    function splitPlacedEye(clone) {
        if (!clone) return null;
        let eyeEl = null;
        for (let i = 0; i < clone.childNodes.length; i++) {
            let node = clone.childNodes[i];
            if (node.nodeType === 1 && node.classList && node.classList.contains("eye")) {
                eyeEl = node;
                break;
            }
        }
        if (!eyeEl) return { back: null, orb: clone, front: null };
        let transform = clone.getAttribute("transform") || "";
        let role = clone.getAttribute("data-kit-role") || "eye";
        function layerGroup(suffix, className) {
            let group = createEl("g", {
                class: className,
                "data-kit-role": role + "_" + suffix,
                "data-kit-eye-side": role
            });
            group.setAttribute("transform", transform);
            return group;
        }
        let back = layerGroup("back", "kit_eye_back");
        let orb = layerGroup("orb", "kit_eye_orb");
        let front = layerGroup("front", "kit_eye_front");
        let seenEye = false;
        Array.prototype.slice.call(clone.childNodes).forEach((node) => {
            if (node === eyeEl) {
                seenEye = true;
                orb.appendChild(node);
            } else if (!seenEye) {
                back.appendChild(node);
            } else {
                front.appendChild(node);
            }
        });
        return {
            back: back.childNodes.length ? back : null,
            orb: orb,
            front: front.childNodes.length ? front : null
        };
    }

    function pickShellSilhouette(shellClone) {
        if (!shellClone) return null;
        let paths = shellClone.querySelectorAll("path");
        for (let i = 0; i < paths.length; i++) {
            let path = paths[i];
            if (path.classList.contains("invisible_element")) continue;
            if (path.classList.contains("texture")) continue;
            let fill = path.getAttribute("fill");
            if (!fill || fill === "none") continue;
            let opacity = path.getAttribute("opacity");
            if (opacity != null && Number(opacity) < 0.5) continue;
            return path;
        }
        return null;
    }

    function clipLayerToShell(layer, head, silhouette) {
        if (!layer || !head || !silhouette) return;
        kitClipSeq += 1;
        let id = "kit_shell_clip_" + kitClipSeq;
        let defs = head.querySelector(":scope > defs");
        if (!defs) {
            defs = createEl("defs");
            head.insertBefore(defs, head.firstChild);
        }
        let clip = createEl("clipPath", {
            id: id,
            clipPathUnits: "userSpaceOnUse"
        });
        let shape = silhouette.cloneNode(true);
        shape.removeAttribute("id");
        shape.removeAttribute("class");
        shape.removeAttribute("style");
        shape.setAttribute("fill", "#fff");
        shape.setAttribute("stroke", "none");
        shape.removeAttribute("opacity");
        clip.appendChild(shape);
        defs.appendChild(clip);
        layer.setAttribute("clip-path", "url(#" + id + ")");
    }

    function wrapEarForWiggle(clone, token) {
        if (!clone) return clone;
        let names = overlayTokens(token);
        clone.setAttribute("data-kit-token", names.join("+"));
        let cls = "kit_ear_wiggle" + names.map((name) => " kit_ear_wiggle_" + name).join("");
        let inner = createEl("g", { class: cls });
        while (clone.firstChild) inner.appendChild(clone.firstChild);
        inner.appendChild(createEl("g", { class: "kit_ear_fx" }));
        clone.appendChild(inner);
        return clone;
    }

    FeatureKit.prototype._stampMouthPoint = function (head, lowerLayer) {
        let existing = lowerLayer.querySelector(".Fennimal_head_mouth_point");
        let local = existing ? circleCenter(existing) : { x: 0, y: 0 };
        let placed = lowerLayer.querySelector("[data-kit-role='lower_face']");
        let world = transformPoint(placed, local);
        if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) {
            world = { x: Number.isFinite(local.x) ? local.x : 0, y: Number.isFinite(local.y) ? local.y : 0 };
        }
        // Nested token markers can lack cx (SVG default 0) and still win querySelector.
        // Toy animations then assign NaN to SVGPoint. Keep one stamped circle on the head.
        lowerLayer.querySelectorAll(".Fennimal_head_mouth_point").forEach((el) => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });
        let stamped = head.querySelector(":scope > .Fennimal_head_mouth_point");
        if (!stamped) {
            stamped = createEl("circle", {
                class: "Fennimal_head_mouth_point invisible_element",
                r: "9",
                fill: "#2aff80",
                display: "inline"
            });
            head.appendChild(stamped);
        }
        stamped.setAttribute("cx", String(world.x));
        stamped.setAttribute("cy", String(world.y));
        stamped.setAttribute("display", "inline");
    };

    FeatureKit.prototype._stampHatPoint = function (head, shellClone) {
        let existing = shellClone && shellClone.querySelector(".Fennimal_head_hat_point");
        let pt = existing ? circleCenter(existing) : { x: 200, y: 68 };
        if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) pt = { x: 200, y: 68 };
        let stamped = head.querySelector(":scope > .Fennimal_head_hat_point");
        if (!stamped) {
            stamped = createEl("circle", {
                class: "Fennimal_head_hat_point invisible_element",
                r: "9",
                fill: "#ff0",
                display: "inline"
            });
            head.appendChild(stamped);
        }
        stamped.setAttribute("cx", String(pt.x));
        stamped.setAttribute("cy", String(pt.y));
        stamped.setAttribute("display", "inline");
    };

    FeatureKit.prototype._collectNotes = function () {
        let notes = [];
        let shell = this.sourceSvg.getElementById("feature_shell");
        if (!shell) {
            notes.push("Missing #feature_shell.");
            return notes;
        }
        ["ear_marker_left", "ear_marker_right", "eye_marker_left", "eye_marker_right",
            "lower_face_marker", "stamp_marker_left", "stamp_marker_right"].forEach((cls) => {
            if (!shell.querySelector("." + cls)) notes.push("Shell is missing ." + cls + ".");
        });
        let mouth = this.sourceSvg.querySelector("#feature_lower_face > .Fennimal_head_mouth_point, #feature_lower_face .Fennimal_head_mouth_point");
        if (!mouth) notes.push("Mouth attachment should live on feature_lower_face, not inside an overlay.");
        LIVE_THEMES.forEach((theme) => {
            SLOTS.forEach((slot) => {
                if (slot.key === "hair") return;
                if (this.listTokens(slot.key).indexOf(theme) < 0) {
                    notes.push("Live family \"" + theme + "\" has no " + slot.key + " overlay yet.");
                }
            });
        });
        if (this.listTokens("ear").indexOf("mushroom") >= 0) {
            notes.push("Mushroom overlays are still in the sheet; live recipes use mechanical / sea / sweet.");
        }
        if (this.listTokens("shell").indexOf("sweet") >= 0) {
            notes.push("Sweet shell texture and stamp_group_sweet are present.");
        }
        return notes;
    };

    function overlayTokens(value) {
        if (value == null || value === "" || value === "none") return [];
        if (Array.isArray(value)) {
            return value.map((item) => String(item || "").trim()).filter((item) => item && item !== "none");
        }
        return String(value).split("+").map((item) => item.trim()).filter((item) => item && item !== "none");
    }

    function overlayPartNodes(root, partClass, theme) {
        if (!root) return [];
        let seen = [];
        function add(el) {
            if (el && seen.indexOf(el) < 0) seen.push(el);
        }
        root.querySelectorAll("." + partClass + "." + theme).forEach(add);
        root.querySelectorAll("." + partClass + "_" + theme).forEach(add);
        return seen;
    }

    function setDisplay(el, on) {
        if (!el) return;
        el.setAttribute("display", on ? "inline" : "none");
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

    function preparePlacedClone(root, expression) {
        stripIds(root);
        applyExpression(root, expression);
        root.querySelectorAll(".hair_bbox, .lower_face_bbox").forEach((el) => {
            el.setAttribute("display", "none");
        });
    }

    function stripIds(root) {
        if (root.removeAttribute) root.removeAttribute("id");
        root.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
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
            let cls = el.getAttribute("class") || "";
            // Keep layout anchors visible to the SVG renderer so getScreenCTM()
            // stays finite. CSS .invisible_element already hides them visually.
            if (cls.indexOf("Fennimal_head_mouth_point") >= 0) return;
            if (cls.indexOf("Fennimal_head_neck_point") >= 0) return;
            if (cls.indexOf("Fennimal_head_hat_point") >= 0) return;
            el.setAttribute("display", "none");
        });
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
    FeatureKit.applyExpression = applyExpression;
})(window);
