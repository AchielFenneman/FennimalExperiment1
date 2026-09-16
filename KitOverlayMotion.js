/**
 * Kit overlay motion — FeatureKit head decorations for live closeups.
 * Candles, clam/pearl, moustache, sea-nose, sprockets, stamps.
 *
 * Static experiments (premade SVG heads) no-op via marker detection.
 * create_Fennimal_* calls kit_overlay_ensure_static (flames/clam only).
 * InteractiveFennimal closeup calls apply_kit_closeup_decorations (live).
 */
const KIT_EAR_NS = "http://www.w3.org/2000/svg";
const KIT_EAR_SPORE_FILLS = ["#FFEA00", "#FF9900", "#FFCC44", "#FF6600"];
const KIT_EAR_DROP_FILLS = ["#7EB8D4", "#A8D8EA", "#5B9BB8", "#E0F4FF"];
let kit_stamp_glimmer_seq = 0;

function kit_ear_is_live(root) {
    return !!(root
        && root.isConnected
        && root.classList
        && !root.classList.contains("fennimal_pose_frozen")
        && (root.classList.contains("kit_ear_live") || root.classList.contains("kit_stamp_live")));
}

function kit_ear_stop_timers(root) {
    let bag = root && root._kitEarAnim;
    if (!bag || !bag.timeouts) return;
    bag.timeouts.forEach((id) => clearTimeout(id));
    bag.timeouts.length = 0;
}

function kit_ear_schedule(root, delay, fn) {
    if (!root) return 0;
    if (!root._kitEarAnim) root._kitEarAnim = { timeouts: [] };
    let id = setTimeout(() => {
        let bag = root._kitEarAnim;
        if (bag && bag.timeouts) {
            let i = bag.timeouts.indexOf(id);
            if (i >= 0) bag.timeouts.splice(i, 1);
        }
        if (!kit_ear_is_live(root)) return;
        fn();
    }, delay);
    root._kitEarAnim.timeouts.push(id);
    return id;
}

function kit_ear_strip_motion(root) {
    if (!root) return;
    root.querySelectorAll("animateTransform.kit_ear_wiggle_anim, animateTransform.kit_ear_anim").forEach((el) => {
        try { if (typeof el.endElement === "function") el.endElement(); } catch (err) {}
        if (el.parentNode) el.parentNode.removeChild(el);
    });
    root.querySelectorAll(".kit_ear_particle").forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });
    root.querySelectorAll(".kit_ear_motion_scale").forEach((el) => {
        el.removeAttribute("transform");
        el.style.transform = "";
    });
    root.querySelectorAll(".sprocket.sprocket_upper, .sprocket.sprocket_middle, .sprocket.sprocket_lower, .sprocket").forEach((el) => {
        el.removeAttribute("transform");
        el.style.transform = "";
    });
    root.querySelectorAll(".kit_overlay_candle_dance, .kit_overlay_candle_flicker").forEach((el) => {
        el.removeAttribute("transform");
        el.style.transform = "";
    });
    root.querySelectorAll(".moustache_left, .moustache_right, .moustache_sprocket_left, .moustache_sprocket_right").forEach((el) => {
        el.removeAttribute("transform");
        el.style.transform = "";
    });
    root.querySelectorAll(".lower_face_part.mechanical, .lower_face_part_mechanical").forEach((host) => {
        if (host._kitMoustache) delete host._kitMoustache;
    });
    root.querySelectorAll(".lower_face_part.sweet, .lower_face_part_sweet").forEach((host) => {
        if (host._kitMuffin) delete host._kitMuffin;
        Array.from(host.querySelectorAll(":scope > .kit_muffin_fx, .kit_muffin_sprinkle, .kit_muffin_sprinkle_wrap")).forEach((el) => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });
        let topping = host.querySelector(".muffin_topping");
        if (topping) {
            topping.removeAttribute("transform");
            topping.style.transform = "";
        }
    });
    root.querySelectorAll(".lower_face_part.sea, .lower_face_part_sea").forEach((host) => {
        if (host._kitSeaNose) delete host._kitSeaNose;
        let pose = host.querySelector(".kit_sea_nose_pose");
        let rock = host.querySelector(".kit_sea_nose_rock");
        if (pose) {
            pose.removeAttribute("transform");
            pose.style.transform = "";
        }
        if (rock) {
            rock.removeAttribute("transform");
            rock.style.transform = "";
        }
    });
    root.querySelectorAll(".eye_part.sea, .eye_part_sea").forEach((host) => {
        if (host._kitClam) delete host._kitClam;
        kit_clam_clear_shine(kit_clam_pearl(host));
    });
}

function kit_ear_el(name, attrs) {
    let el = document.createElementNS(KIT_EAR_NS, name);
    Object.keys(attrs || {}).forEach((key) => {
        if (attrs[key] == null) return;
        el.setAttribute(key, attrs[key]);
    });
    return el;
}

function kit_ear_point(root, selector) {
    let el = root && root.querySelector(selector);
    if (!el) return { x: 0, y: 0 };
    return {
        x: parseFloat(el.getAttribute("cx") || "0") || 0,
        y: parseFloat(el.getAttribute("cy") || "0") || 0
    };
}

function kit_ear_token_name(el) {
    let cls = (el && el.getAttribute("class")) || "";
    let names = ["mechanical", "mushroom", "seashell", "bat", "sea", "sweet"];
    for (let i = 0; i < names.length; i++) {
        if (cls.indexOf("kit_ear_wiggle_" + names[i]) >= 0) return names[i];
    }
    return "";
}

function kit_ear_ensure_fx(earInner) {
    let fx = earInner.querySelector(":scope > .kit_ear_fx");
    if (!fx) {
        fx = kit_ear_el("g", { class: "kit_ear_fx" });
        earInner.appendChild(fx);
    }
    return fx;
}

function kit_ear_wrap_element_for_scale(el, cx, cy, scaleClass) {
    let parent = el && el.parentNode;
    if (!parent) return null;
    if (parent.getAttribute && parent.getAttribute("data-kit-unpivot") === "1") {
        let scaleG = parent.parentNode;
        if (scaleG && scaleG.classList && scaleG.classList.contains("kit_ear_motion_scale")) return scaleG;
    }
    let pivot = kit_ear_el("g", {
        class: "kit_ear_pivot",
        transform: "translate(" + cx + " " + cy + ")"
    });
    let scaleG = kit_ear_el("g", { class: "kit_ear_motion_scale " + scaleClass });
    let unpivot = kit_ear_el("g", {
        "data-kit-unpivot": "1",
        transform: "translate(" + (-cx) + " " + (-cy) + ")"
    });
    parent.insertBefore(pivot, el);
    pivot.appendChild(scaleG);
    scaleG.appendChild(unpivot);
    unpivot.appendChild(el);
    return scaleG;
}

function kit_ear_wrap_children_for_scale(earInner, cx, cy, scaleClass) {
    let existing = earInner.querySelector(":scope > .kit_ear_pivot");
    if (existing) {
        let scaleG = existing.querySelector(".kit_ear_motion_scale");
        if (scaleG) return scaleG;
    }
    let fx = kit_ear_ensure_fx(earInner);
    let pivot = kit_ear_el("g", {
        class: "kit_ear_pivot",
        transform: "translate(" + cx + " " + cy + ")"
    });
    let scaleG = kit_ear_el("g", { class: "kit_ear_motion_scale " + scaleClass });
    let unpivot = kit_ear_el("g", {
        "data-kit-unpivot": "1",
        transform: "translate(" + (-cx) + " " + (-cy) + ")"
    });
    Array.from(earInner.children).forEach((ch) => {
        if (ch !== fx) unpivot.appendChild(ch);
    });
    scaleG.appendChild(unpivot);
    pivot.appendChild(scaleG);
    earInner.insertBefore(pivot, fx);
    return scaleG;
}

function kit_ear_add_smil(el, attrs) {
    let anim = kit_ear_el("animateTransform", Object.assign({
        class: "kit_ear_anim kit_ear_wiggle_anim",
        attributeName: "transform",
        attributeType: "XML"
    }, attrs));
    el.appendChild(anim);
    // Experiment SVG has been open for minutes. begin="0.18s" is document time,
    // so a late-inserted animation never starts unless we kick it now.
    if ((attrs && attrs.begin) !== "indefinite" && typeof anim.beginElement === "function") {
        try { anim.beginElement(); } catch (err) {}
    }
    return anim;
}

function kit_ear_rotate_values(angles, cx, cy) {
    return angles.map((a) => a + " " + cx + " " + cy).join("; ");
}

function kit_ear_clock_steps(stepDeg, nSteps) {
    let angles = [];
    for (let i = 0; i <= nSteps; i++) angles.push(i * stepDeg);
    return angles;
}

function apply_kit_ear_mechanical(earInner, earIndex) {
    let specs = [
        { sel: ".sprocket_upper", step: 20, ticks: 18, dur: 7.4, extraBegin: 0 },
        { sel: ".sprocket_lower", step: 30, ticks: 12, dur: 5.1, extraBegin: 0.24 },
        {
            sel: ".sprocket_middle",
            angles: [0, 12, 25, 12, 0, -12, -25, -12, 0],
            dur: 4.6,
            extraBegin: 0.12
        }
    ];
    specs.forEach((spec) => {
        let sprocket = earInner.querySelector(spec.sel);
        if (!sprocket) return;
        if (sprocket.querySelector("animateTransform.kit_ear_anim")) return;
        let pt = kit_ear_point(sprocket, ".sprocket_rotation_point");
        let angles = spec.angles || kit_ear_clock_steps(spec.step, spec.ticks);
        kit_ear_add_smil(sprocket, {
            type: "rotate",
            values: kit_ear_rotate_values(angles, pt.x, pt.y),
            calcMode: "discrete",
            dur: spec.dur + "s",
            repeatCount: "indefinite",
            begin: (earIndex * 0.2 + spec.extraBegin) + "s"
        });
    });
}

function apply_kit_ear_bat(earInner, earIndex) {
    let attach = kit_ear_point(earInner, ".ear_marker");
    let scaleG = kit_ear_wrap_children_for_scale(earInner, attach.x, attach.y, "kit_ear_bat_flutter");
    if (!scaleG || scaleG.querySelector("animateTransform.kit_ear_anim")) return;
    kit_ear_add_smil(scaleG, {
        type: "scale",
        values: "1 1; 1.11 0.9; 0.9 1.1; 1.08 0.93; 0.96 1.05; 1 1; 1 1",
        keyTimes: "0; 0.019; 0.041; 0.063; 0.085; 0.102; 1",
        calcMode: "spline",
        keySplines: "0.37 0 0.63 1; 0.37 0 0.63 1; 0.37 0 0.63 1; 0.37 0 0.63 1; 0.37 0 0.63 1; 0 0 1 1",
        dur: "11.3s",
        repeatCount: "indefinite",
        begin: (earIndex * 0.18) + "s"
    });
}

function apply_kit_ear_mushroom(earInner, root, earIndex) {
    let cap = earInner.querySelector(".cap");
    if (!cap) return;
    let attach = kit_ear_point(cap, ".cap_attachment_point");
    let scaleG = kit_ear_wrap_element_for_scale(cap, attach.x, attach.y, "kit_ear_cap_squash");
    if (!scaleG) return;
    let anim = scaleG.querySelector("animateTransform.kit_ear_anim");
    if (!anim) {
        anim = kit_ear_add_smil(scaleG, {
            type: "scale",
            values: "1 1; 1.16 0.78; 1.05 0.94; 1 1",
            keyTimes: "0; 0.38; 0.7; 1",
            dur: "0.72s",
            begin: "indefinite",
            fill: "freeze",
            restart: "always"
        });
    }
    let fx = kit_ear_ensure_fx(earInner);
    let points = Array.from(earInner.querySelectorAll(".spore_release_point")).map((el) => ({
        x: parseFloat(el.getAttribute("cx") || "0") || 0,
        y: parseFloat(el.getAttribute("cy") || "0") || 0
    }));
    let beat = () => {
        if (!kit_ear_is_live(root)) return;
        try { if (typeof anim.beginElement === "function") anim.beginElement(); } catch (err) {}
        points.forEach((pt, i) => {
            let n = 1 + Math.floor(Math.random() * 2);
            for (let s = 0; s < n; s++) {
                kit_ear_schedule(root, i * 40 + s * 55, () => kit_ear_spawn_spore(fx, pt.x, pt.y, root));
            }
        });
        kit_ear_schedule(root, 9600 + Math.random() * 4400, beat);
    };
    kit_ear_schedule(root, 420 + earIndex * 900, beat);
}

function apply_kit_ear_seashell(earInner, root, earIndex) {
    let attach = kit_ear_point(earInner, ".ear_marker");
    let scaleG = kit_ear_wrap_children_for_scale(earInner, attach.x, attach.y, "kit_ear_shell_squeeze");
    if (!scaleG) return;
    let anim = scaleG.querySelector("animateTransform.kit_ear_anim");
    if (!anim) {
        anim = kit_ear_add_smil(scaleG, {
            type: "scale",
            values: "1 1; 0.93 1.07; 1.04 0.97; 1 1",
            keyTimes: "0; 0.32; 0.62; 1",
            dur: "0.48s",
            begin: "indefinite",
            fill: "freeze",
            restart: "always"
        });
    }
    let fx = kit_ear_ensure_fx(earInner);
    let sprout = kit_ear_point(earInner, ".water_sprout");
    let beat = () => {
        if (!kit_ear_is_live(root)) return;
        try { if (typeof anim.beginElement === "function") anim.beginElement(); } catch (err) {}
        kit_ear_schedule(root, 160, () => kit_ear_spawn_water(fx, sprout.x, sprout.y, root));
        kit_ear_schedule(root, 12400 + Math.random() * 4400, beat);
    };
    kit_ear_schedule(root, 700 + earIndex * 1100, beat);
}

function kit_ear_spawn_spore(fx, x, y, root) {
    if (!fx || !kit_ear_is_live(root)) return;
    let r = 3.4 + Math.random() * 3.2;
    let spore = kit_ear_el("circle", {
        class: "kit_ear_particle kit_ear_spore",
        cx: String(x + (Math.random() - 0.5) * 8),
        cy: String(y + (Math.random() - 0.5) * 6),
        r: String(r),
        fill: KIT_EAR_SPORE_FILLS[Math.floor(Math.random() * KIT_EAR_SPORE_FILLS.length)],
        stroke: "#111",
        "stroke-width": "1.7"
    });
    spore.style.pointerEvents = "none";
    spore.style.opacity = "0.95";
    spore.style.transform = "translate(0px, 0px)";
    fx.appendChild(spore);
    let drift = (Math.random() - 0.5) * 46;
    requestAnimationFrame(() => {
        if (!kit_ear_is_live(root) || !spore.parentNode) {
            if (spore.parentNode) spore.parentNode.removeChild(spore);
            return;
        }
        // Fall and fade share 1.15s so opacity hits 0 as they reach the floor.
        spore.style.transition =
            "transform 1.15s cubic-bezier(0.4, 0, 1, 1), opacity 1.15s cubic-bezier(0.45, 0, 1, 1)";
        spore.style.transform = "translate(" + drift + "px, 200px)";
        spore.style.opacity = "0";
        kit_ear_schedule(root, 1200, () => {
            if (spore.parentNode) spore.parentNode.removeChild(spore);
        });
    });
}

function kit_ear_spawn_water(fx, x, y, root) {
    if (!fx || !kit_ear_is_live(root)) return;
    let count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
        kit_ear_schedule(root, i * 28, () => {
            if (!kit_ear_is_live(root)) return;
            let drop = kit_ear_el("g", { class: "kit_ear_particle kit_ear_droplet" });
            let rx = 6.2 + Math.random() * 4.4;
            let body = kit_ear_el("ellipse", {
                rx: String(rx),
                ry: String(rx * 1.35),
                fill: KIT_EAR_DROP_FILLS[Math.floor(Math.random() * KIT_EAR_DROP_FILLS.length)],
                stroke: "#111",
                "stroke-width": "1.7"
            });
            let shine = kit_ear_el("ellipse", {
                rx: String(rx * 0.35),
                ry: String(rx * 0.42),
                cy: String(-rx * 0.35),
                fill: "#fff",
                opacity: "0.45"
            });
            drop.appendChild(body);
            drop.appendChild(shine);
            drop.style.pointerEvents = "none";
            drop.style.opacity = "0.95";
            drop.style.transform = "translate(" + x + "px, " + y + "px)";
            fx.appendChild(drop);
            let dx = (Math.random() - 0.5) * 36;
            let up = 42 + Math.random() * 38;
            requestAnimationFrame(() => {
                if (!kit_ear_is_live(root) || !drop.parentNode) {
                    if (drop.parentNode) drop.parentNode.removeChild(drop);
                    return;
                }
                drop.style.transition = "transform 0.28s cubic-bezier(0.15, 0.75, 0.25, 1)";
                drop.style.transform = "translate(" + (x + dx) + "px, " + (y - up) + "px)";
                kit_ear_schedule(root, 280, () => {
                    if (!drop.parentNode) return;
                    drop.style.transition = "transform 0.9s cubic-bezier(0.4, 0, 1, 1), opacity 0.7s ease-in";
                    drop.style.transform = "translate(" + (x + dx * 1.15) + "px, " + (y + 170) + "px)";
                    kit_ear_schedule(root, 280, () => { drop.style.opacity = "0"; });
                    kit_ear_schedule(root, 950, () => {
                        if (drop.parentNode) drop.parentNode.removeChild(drop);
                    });
                });
            });
        });
    }
}

function kit_overlay_is_fennimal_root(node) {
    return !!(node && node.classList && (
        node.classList.contains("Fennimal_translation_group")
        || node.classList.contains("Fennimal_head")
        || node.classList.contains("overlay_head")
        || node.classList.contains("kit_head")
    ));
}

function kit_overlay_is_shown(el) {
    let node = el;
    while (node && node.getAttribute) {
        if (node.getAttribute("display") === "none") return false;
        if (kit_overlay_is_fennimal_root(node)) break;
        node = node.parentElement;
    }
    return !!el;
}

function kit_overlay_part_shown(root, partClass, theme) {
    if (!root) return false;
    let sel = "." + partClass + "." + theme + ", ." + partClass + "_" + theme;
    return Array.from(root.querySelectorAll(sel)).some(kit_overlay_is_shown);
}

function kit_overlay_sprocket_mode(sprocket) {
    let pt = sprocket.querySelector(".sprocket_rotation_point");
    let cls = (pt && pt.getAttribute("class")) || "";
    if (cls.indexOf("swivel") >= 0) return "swivel";
    if (cls.indexOf("counterclockwise") >= 0) return "counterclockwise";
    return "clockwise";
}

function apply_kit_sprocket_spin(root) {
    if (!root) return;
    Array.from(root.querySelectorAll(".sprocket")).filter(kit_overlay_is_shown).forEach((sprocket, i) => {
        if (sprocket.querySelector("animateTransform.kit_ear_anim")) return;
        let pt = kit_ear_point(sprocket, ".sprocket_rotation_point");
        let mode = kit_overlay_sprocket_mode(sprocket);
        let extra = i * 0.18;
        if (mode === "swivel") {
            kit_ear_add_smil(sprocket, {
                type: "rotate",
                values: kit_ear_rotate_values([0, 20, 0, -20, 0], pt.x, pt.y),
                keyTimes: "0; 0.25; 0.5; 0.75; 1",
                calcMode: "spline",
                keySplines: "0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1",
                dur: "5.2s",
                repeatCount: "indefinite",
                begin: extra + "s"
            });
            return;
        }
        let turn = mode === "counterclockwise" ? -360 : 360;
        kit_ear_add_smil(sprocket, {
            type: "rotate",
            values: kit_ear_rotate_values([0, turn], pt.x, pt.y),
            calcMode: "linear",
            dur: (mode === "counterclockwise" ? 6.2 : 7.4) + "s",
            repeatCount: "indefinite",
            begin: extra + "s"
        });
    });
}

function apply_kit_ear_sea_overlay(earInner, root, earIndex) {
    let sea = earInner.querySelector(".ear_part.sea, .ear_part_sea");
    if (!sea || !kit_overlay_is_shown(sea)) return;
    let attach = kit_ear_point(earInner, ".ear_marker");
    let scaleG = kit_ear_wrap_element_for_scale(sea, attach.x, attach.y, "kit_ear_shell_squeeze");
    if (!scaleG) return;
    let anim = scaleG.querySelector("animateTransform.kit_ear_anim");
    if (!anim) {
        anim = kit_ear_add_smil(scaleG, {
            type: "scale",
            values: "1 1; 0.93 1.07; 1.04 0.97; 1 1",
            keyTimes: "0; 0.32; 0.62; 1",
            dur: "0.48s",
            begin: "indefinite",
            fill: "freeze",
            restart: "always"
        });
    }
    let fx = kit_ear_ensure_fx(earInner);
    let sprout = kit_ear_point(earInner, ".water_sprout");
    let beat = () => {
        if (!kit_ear_is_live(root)) return;
        try { if (typeof anim.beginElement === "function") anim.beginElement(); } catch (err) {}
        kit_ear_schedule(root, 160, () => kit_ear_spawn_water(fx, sprout.x, sprout.y, root));
        kit_ear_schedule(root, 12400 + Math.random() * 4400, beat);
    };
    kit_ear_schedule(root, 700 + earIndex * 1100, beat);
}

function kit_overlay_bbox_center(el) {
    if (!el) return null;
    let box;
    try { box = el.getBBox(); } catch (err) { return null; }
    if (!box || !(box.width > 0 || box.height > 0)) return null;
    return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2
    };
}

function kit_overlay_pulse_around(el, className, attrs, delay) {
    if (!el || !kit_overlay_is_shown(el)) return;
    let pt = kit_overlay_bbox_center(el);
    if (!pt) return;
    let scaleG = kit_ear_wrap_element_for_scale(el, pt.x, pt.y, className);
    if (!scaleG || scaleG.querySelector("animateTransform.kit_ear_anim")) return;
    let smil = Object.assign({}, attrs);
    if (delay != null) smil.begin = delay + "s";
    kit_ear_add_smil(scaleG, smil);
}

function apply_kit_seastar_pulse(root) {
    if (!root) return;
    let marked = [];
    [
        { sel: ".seastar_top", delay: 0 },
        { sel: ".seastar_middle", delay: 0.45 },
        { sel: ".seastar_bottom", delay: 0.9 }
    ].forEach((spec) => {
        root.querySelectorAll(spec.sel).forEach((el, i) => {
            let host = el.closest(".eye_part.sea, .eye_part_sea");
            if (host && !kit_overlay_is_shown(host)) return;
            marked.push(el);
            kit_overlay_pulse_around(el, "kit_overlay_seastar", {
                type: "scale",
                values: "1 1; 1.07 1.07; 1 1; 1 1",
                keyTimes: "0; 0.12; 0.28; 1",
                calcMode: "spline",
                keySplines: "0.4 0 0.6 1; 0.45 0 0.55 1; 0 0 1 1",
                dur: "4.2s",
                repeatCount: "indefinite"
            }, spec.delay + i * 0.12);
        });
    });
    if (marked.length) return;
    // Skip clam-style sea eyes — those use kit_clam_* open/close instead of a whole-overlay pulse.
    Array.from(root.querySelectorAll(".eye_part.sea, .eye_part_sea"))
        .filter(kit_overlay_is_shown)
        .filter((host) => !host.querySelector(".seashell_bottom, .seashell_top_open, .seashell_top_closed"))
        .forEach((host, i) => {
            kit_overlay_pulse_around(host, "kit_overlay_seastar", {
                type: "scale",
                values: "1 1; 1.045 1.045; 0.985 0.985; 1 1; 1 1",
                keyTimes: "0; 0.14; 0.3; 0.42; 1",
                calcMode: "spline",
                keySplines: "0.4 0 0.6 1; 0.45 0 0.55 1; 0.4 0 0.6 1; 0 0 1 1",
                dur: "5.4s",
                repeatCount: "indefinite"
            }, i * 0.35);
        });
}

function apply_kit_sweet_eye_settle(root) {
    if (!root) return;
    Array.from(root.querySelectorAll(".eye_part.sweet, .eye_part_sweet"))
        .filter(kit_overlay_is_shown)
        .forEach((host, i) => {
            // Continuous soft cream bob — never rests flat.
            kit_overlay_pulse_around(host, "kit_overlay_cream_settle", {
                type: "scale",
                values: "1 1; 1.045 0.92; 0.975 1.045; 1.03 0.955; 1 1",
                keyTimes: "0; 0.22; 0.48; 0.74; 1",
                calcMode: "spline",
                keySplines: "0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1",
                dur: "2.9s",
                repeatCount: "indefinite"
            }, i * 0.45);
        });
}

function kit_candle_host(pt) {
    return pt.closest(".ear_part.sweet, .eye_part.sweet, .lower_face_part.sweet")
        || pt.closest(".ear_part_sweet, .eye_part_sweet, .lower_face_part_sweet")
        || pt.closest(".ear_part, .eye_part, .lower_face_part");
}

function kit_candle_begin(el) {
    if (!el || typeof el.beginElement !== "function") return;
    try { el.beginElement(); } catch (err) {}
}

function kit_candle_clear_life(lifeG) {
    if (!lifeG) return;
    lifeG.querySelectorAll("animateTransform.kit_overlay_candle_life_anim").forEach((el) => {
        try { if (typeof el.endElement === "function") el.endElement(); } catch (err) {}
        if (el.parentNode) el.parentNode.removeChild(el);
    });
}

function kit_candle_set_life_scale(lifeG, sx, sy) {
    kit_candle_clear_life(lifeG);
    if (lifeG) lifeG.setAttribute("transform", "scale(" + sx + " " + sy + ")");
}

function kit_candle_play_life_scale(lifeG, values, dur) {
    if (!lifeG) return null;
    kit_candle_clear_life(lifeG);
    let anim = kit_ear_add_smil(lifeG, {
        class: "kit_ear_anim kit_ear_wiggle_anim kit_overlay_candle_life_anim",
        type: "scale",
        values: values,
        keyTimes: "0; 0.38; 0.72; 1",
        calcMode: "spline",
        keySplines: "0.4 0 0.6 1; 0.45 0 0.55 1; 0.4 0 1 1",
        dur: dur,
        fill: "freeze",
        begin: "indefinite"
    });
    kit_candle_begin(anim);
    return anim;
}

function kit_candle_spawn_spark(flame, root, delay) {
    if (!flame || !root) return;
    kit_ear_schedule(root, delay, () => {
        if (!flame.isConnected || !kit_ear_is_live(root)) return;
        let dx = (Math.random() - 0.5) * 16;
        let up = 18 + Math.random() * 14;
        let spark = kit_ear_el("g", { class: "kit_overlay_candle_spark kit_ear_particle" });
        if (Math.random() > 0.4) {
            spark.appendChild(kit_ear_el("path", {
                d: "M0 -5.6 L 1.05 -1 L 5.6 0 L 1.05 1 L 0 5.6 L -1.05 1 L -5.6 0 L -1.05 -1 Z",
                fill: "#ffea00",
                stroke: "#000",
                "stroke-width": "1.15",
                "stroke-linejoin": "round"
            }));
        } else {
            spark.appendChild(kit_ear_el("circle", {
                r: String(2.15 + Math.random() * 1.35),
                fill: Math.random() > 0.35 ? "#ffea00" : "#fff4c8",
                stroke: "#000",
                "stroke-width": "1.05"
            }));
        }
        flame.appendChild(spark);
        let move = kit_ear_add_smil(spark, {
            type: "translate",
            values: "0 0; " + (dx * 0.4) + " " + (-up * 0.58) + "; " + dx + " " + (-up),
            keyTimes: "0; 0.42; 1",
            dur: "0.52s",
            fill: "freeze",
            begin: "indefinite"
        });
        let fade = kit_ear_el("animate", {
            class: "kit_ear_anim",
            attributeName: "opacity",
            values: "1; 1; 0",
            keyTimes: "0; 0.28; 1",
            dur: "0.52s",
            fill: "freeze",
            begin: "indefinite"
        });
        spark.appendChild(fade);
        kit_candle_begin(move);
        kit_candle_begin(fade);
        kit_ear_schedule(root, 560, () => {
            if (spark.parentNode) spark.parentNode.removeChild(spark);
        });
    });
}

function kit_candle_spawn_smoke(flame, root, delay) {
    if (!flame || !root) return;
    kit_ear_schedule(root, delay, () => {
        if (!flame.isConnected || !kit_ear_is_live(root)) return;
        if (flame.getAttribute("data-kit-candle-mood") !== "out") return;
        let dx = (Math.random() - 0.5) * 10;
        let up = 14 + Math.random() * 12;
        let puff = kit_ear_el("g", { class: "kit_overlay_candle_smoke kit_ear_particle" });
        let grow = kit_ear_el("g", { class: "kit_overlay_candle_smoke_grow" });
        grow.appendChild(kit_ear_el("ellipse", {
            rx: String(3.1 + Math.random() * 1.3),
            ry: String(2.4 + Math.random() * 1.1),
            fill: Math.random() > 0.5 ? "#d2ccc4" : "#b8b2aa",
            stroke: "#000",
            "stroke-width": "1.2"
        }));
        puff.appendChild(grow);
        flame.appendChild(puff);
        let move = kit_ear_add_smil(puff, {
            type: "translate",
            values: "0 -2; " + (dx * 0.45) + " " + (-up * 0.55) + "; " + dx + " " + (-up),
            keyTimes: "0; 0.45; 1",
            dur: "0.62s",
            fill: "freeze",
            begin: "indefinite"
        });
        let swell = kit_ear_add_smil(grow, {
            type: "scale",
            values: "0.55 0.55; 1.15 1.1; 1.55 1.4",
            keyTimes: "0; 0.4; 1",
            dur: "0.62s",
            fill: "freeze",
            begin: "indefinite"
        });
        let fade = kit_ear_el("animate", {
            class: "kit_ear_anim",
            attributeName: "opacity",
            values: "0.9; 0.75; 0",
            keyTimes: "0; 0.35; 1",
            dur: "0.62s",
            fill: "freeze",
            begin: "indefinite"
        });
        puff.appendChild(fade);
        kit_candle_begin(move);
        kit_candle_begin(swell);
        kit_candle_begin(fade);
        kit_ear_schedule(root, 680, () => {
            if (puff.parentNode) puff.parentNode.removeChild(puff);
        });
    });
}

function kit_make_candle_flame(x, y, index, dance, lit) {
    let flame = kit_ear_el("g", {
        class: "kit_overlay_candle_flame",
        transform: "translate(" + x + " " + y + ")",
        "data-kit-candle": String(index),
        "data-kit-candle-mood": lit ? "lit" : "out"
    });
    let lifeG = kit_ear_el("g", {
        class: "kit_overlay_candle_life",
        transform: lit ? "scale(1 1)" : "scale(0 0)"
    });
    let danceG = kit_ear_el("g", { class: "kit_overlay_candle_dance" });
    let sizeG = kit_ear_el("g", {
        class: "kit_overlay_candle_size",
        transform: "scale(1.72)"
    });
    let flickerG = kit_ear_el("g", { class: "kit_overlay_candle_flicker" });
    flickerG.appendChild(kit_ear_el("ellipse", {
        class: "kit_overlay_candle_glow",
        cx: "0",
        cy: "-8.2",
        rx: "7.4",
        ry: "11.6",
        fill: "#ff9900",
        opacity: "0.4"
    }));
    flickerG.appendChild(kit_ear_el("path", {
        d: "M0 1.15 C 4.35 -3.1 5.05 -10.4 1.55 -16.7 C 0.75 -18.55 0.18 -19.7 0 -20.1 C -0.18 -19.7 -0.75 -18.55 -1.55 -16.7 C -5.05 -10.4 -4.35 -3.1 0 1.15 Z",
        fill: "#ea6208",
        stroke: "#000",
        "stroke-width": "1.85",
        "stroke-linejoin": "round"
    }));
    flickerG.appendChild(kit_ear_el("path", {
        d: "M0 -2.4 C 2.15 -5.2 2.45 -9.4 0.7 -13.15 C 0.28 -14.35 0.05 -15 0 -15.2 C -0.05 -15 -0.28 -14.35 -0.7 -13.15 C -2.45 -9.4 -2.15 -5.2 0 -2.4 Z",
        fill: "#ffea00"
    }));
    flickerG.appendChild(kit_ear_el("ellipse", {
        cx: "-0.85",
        cy: "-6.4",
        rx: "1.05",
        ry: "2.15",
        fill: "#fff",
        opacity: "0.55"
    }));
    sizeG.appendChild(flickerG);
    danceG.appendChild(sizeG);
    lifeG.appendChild(danceG);
    flame.appendChild(lifeG);
    if (dance) kit_candle_add_dance(flame, index);
    return flame;
}

function kit_candle_add_dance(flame, index) {
    if (!flame) return;
    let danceG = flame.querySelector(".kit_overlay_candle_dance");
    let flickerG = flame.querySelector(".kit_overlay_candle_flicker");
    if (danceG && !danceG.querySelector("animateTransform.kit_ear_anim")) {
        let lean = index % 2 === 0 ? 1 : -1;
        let phase = (index % 6) * 0.45;
        kit_ear_add_smil(danceG, {
            type: "rotate",
            values: kit_ear_rotate_values(
                [0, 11 * lean, -7.5 * lean, 9.2 * lean, -10.5 * lean, 4.2 * lean, 0],
                0,
                0
            ),
            keyTimes: "0; 0.16; 0.34; 0.52; 0.7; 0.86; 1",
            calcMode: "spline",
            keySplines: "0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1",
            dur: (5.6 + (index % 3) * 1.1) + "s",
            repeatCount: "indefinite",
            begin: phase + "s"
        });
        if (flickerG && !flickerG.querySelector("animateTransform.kit_ear_anim")) {
            kit_ear_add_smil(flickerG, {
                type: "scale",
                values: "1 1; 1.08 1.16; 0.94 0.9; 1.1 1.12; 0.97 1.04; 1 1",
                keyTimes: "0; 0.18; 0.38; 0.6; 0.8; 1",
                calcMode: "spline",
                keySplines: "0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1",
                dur: (4.4 + (index % 3) * 0.9) + "s",
                repeatCount: "indefinite",
                begin: (phase * 0.55) + "s"
            });
        }
    }
}

function apply_kit_candle_flames(root, opts) {
    if (!root) return;
    opts = opts || {};
    let dance = opts.dance !== false;
    let lit = opts.lit !== false;
    Array.from(root.querySelectorAll(".candle_fire_point")).forEach((pt, i) => {
        let host = kit_candle_host(pt);
        if (!host || !kit_overlay_is_shown(host)) return;
        if (pt.getAttribute("data-kit-candle-lit") === "1") {
            let flame = host.querySelector(".kit_overlay_candle_flame[data-kit-candle='" + i + "']")
                || host.querySelector(".kit_overlay_candle_flame");
            if (flame) {
                let sizeG = flame.querySelector(".kit_overlay_candle_size");
                if (sizeG) sizeG.setAttribute("transform", "scale(1.72)");
                let glow = flame.querySelector(".kit_overlay_candle_glow");
                if (glow) {
                    glow.setAttribute("rx", "7.4");
                    glow.setAttribute("ry", "11.6");
                    glow.setAttribute("opacity", "0.4");
                }
            }
            if (dance) kit_candle_add_dance(flame, i);
            return;
        }
        pt.setAttribute("data-kit-candle-lit", "1");
        let x = parseFloat(pt.getAttribute("cx") || "0") || 0;
        let y = parseFloat(pt.getAttribute("cy") || "0") || 0;
        host.appendChild(kit_make_candle_flame(x, y, i, dance, lit));
    });
}

function kit_candle_set_mood(root, next, animated) {
    if (!root) return;
    let lit = next !== "sad";
    Array.from(root.querySelectorAll(".kit_overlay_candle_flame")).forEach((flame, i) => {
        let lifeG = flame.querySelector(".kit_overlay_candle_life");
        if (!lifeG) return;
        if (lit) {
            flame.setAttribute("data-kit-candle-mood", "lit");
            if (!animated) {
                kit_candle_set_life_scale(lifeG, 1, 1);
                return;
            }
            kit_ear_schedule(root, i * 70, () => {
                if (!flame.isConnected) return;
                if (flame.getAttribute("data-kit-candle-mood") !== "lit") return;
                kit_candle_set_life_scale(lifeG, 0, 0);
                kit_candle_spawn_spark(flame, root, 0);
                kit_candle_spawn_spark(flame, root, 40);
                kit_candle_spawn_spark(flame, root, 85);
                kit_ear_schedule(root, 50, () => {
                    if (!flame.isConnected) return;
                    if (flame.getAttribute("data-kit-candle-mood") !== "lit") return;
                    kit_candle_play_life_scale(lifeG, "0 0; 1.18 1.22; 1.02 1.04; 1 1", "0.58s");
                });
            });
            return;
        }
        if (flame.getAttribute("data-kit-candle-mood") === "out") {
            kit_candle_set_life_scale(lifeG, 0, 0);
            return;
        }
        flame.setAttribute("data-kit-candle-mood", "out");
        if (!animated) {
            kit_candle_set_life_scale(lifeG, 0, 0);
            return;
        }
        kit_ear_schedule(root, i * 32, () => {
            if (!flame.isConnected) return;
            if (flame.getAttribute("data-kit-candle-mood") !== "out") return;
            kit_candle_set_life_scale(lifeG, 1, 1);
            kit_candle_spawn_smoke(flame, root, 0);
            kit_candle_spawn_smoke(flame, root, 55);
            kit_candle_play_life_scale(lifeG, "1 1; 0.55 0.62; 0.12 0.14; 0 0", "0.42s");
        });
    });
}

function kit_moustache_hosts(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(".lower_face_part.mechanical, .lower_face_part_mechanical"))
        .filter(kit_overlay_is_shown);
}

function kit_moustache_parts(host) {
    if (!host) return [];
    return [
        { el: host.querySelector(".moustache_sprocket_left"), pivotSel: ".moustache_sprocket_center", sign: 1, kind: "sprocket" },
        { el: host.querySelector(".moustache_sprocket_right"), pivotSel: ".moustache_sprocket_center", sign: -1, kind: "sprocket" },
        { el: host.querySelector(".moustache_left"), pivotSel: ".moustache_pivot_point", sign: -1, kind: "whisker" },
        { el: host.querySelector(".moustache_right"), pivotSel: ".moustache_pivot_point", sign: 1, kind: "whisker" }
    ].filter((part) => part.el);
}

function kit_moustache_pose_amounts(pose) {
    if (pose === "sad") return { sprocket: 90, whisker: 30 };
    if (pose === "wiggle") return { sprocket: 45, whisker: 15 };
    return { sprocket: 0, whisker: 0 };
}

function kit_moustache_bag(host) {
    if (!host._kitMoustache) {
        host._kitMoustache = {
            pose: "up",
            gen: 0,
            angles: { sprocket: 0, whisker: 0 }
        };
    }
    return host._kitMoustache;
}

function kit_moustache_clear_anims(el) {
    if (!el) return;
    Array.from(el.querySelectorAll(":scope > animateTransform.kit_moustache_anim")).forEach((anim) => {
        try { if (typeof anim.endElement === "function") anim.endElement(); } catch (err) {}
        if (anim.parentNode) anim.parentNode.removeChild(anim);
    });
}

function kit_moustache_set_part_angle(part, angleDeg) {
    if (!part || !part.el) return;
    let pt = kit_ear_point(part.el, part.pivotSel);
    kit_moustache_clear_anims(part.el);
    if (!angleDeg) {
        part.el.removeAttribute("transform");
        return;
    }
    part.el.setAttribute("transform", "rotate(" + angleDeg + " " + pt.x + " " + pt.y + ")");
}

function kit_moustache_apply_amounts(host, amounts) {
    let bag = kit_moustache_bag(host);
    bag.angles = {
        sprocket: amounts.sprocket || 0,
        whisker: amounts.whisker || 0
    };
    kit_moustache_parts(host).forEach((part) => {
        let mag = part.kind === "sprocket" ? bag.angles.sprocket : bag.angles.whisker;
        kit_moustache_set_part_angle(part, part.sign * mag);
    });
}

function kit_moustache_animate_to(root, host, targetPose, durMs, onDone) {
    let bag = kit_moustache_bag(host);
    let gen = ++bag.gen;
    let target = kit_moustache_pose_amounts(targetPose === "sad" ? "sad" : (targetPose === "wiggle" ? "wiggle" : "up"));
    let from = {
        sprocket: bag.angles.sprocket || 0,
        whisker: bag.angles.whisker || 0
    };
    let parts = kit_moustache_parts(host);
    if (!parts.length) {
        if (onDone) onDone();
        return;
    }
    if (!(durMs > 0)) {
        kit_moustache_apply_amounts(host, target);
        bag.pose = targetPose === "sad" ? "sad" : (targetPose === "wiggle" ? "wiggle" : "up");
        if (onDone) onDone();
        return;
    }
    parts.forEach((part) => {
        let pt = kit_ear_point(part.el, part.pivotSel);
        let fromAng = part.sign * (part.kind === "sprocket" ? from.sprocket : from.whisker);
        let toAng = part.sign * (part.kind === "sprocket" ? target.sprocket : target.whisker);
        kit_moustache_clear_anims(part.el);
        part.el.setAttribute("transform", "rotate(" + fromAng + " " + pt.x + " " + pt.y + ")");
        let anim = kit_ear_add_smil(part.el, {
            class: "kit_ear_anim kit_ear_wiggle_anim kit_moustache_anim",
            type: "rotate",
            from: fromAng + " " + pt.x + " " + pt.y,
            to: toAng + " " + pt.x + " " + pt.y,
            dur: (durMs / 1000) + "s",
            fill: "freeze",
            begin: "indefinite",
            restart: "always"
        });
        try { if (typeof anim.beginElement === "function") anim.beginElement(); } catch (err) {}
    });
    bag.angles = { sprocket: target.sprocket, whisker: target.whisker };
    kit_ear_schedule(root, durMs + 16, () => {
        if (!host.isConnected) return;
        if (kit_moustache_bag(host).gen !== gen) return;
        kit_moustache_apply_amounts(host, target);
        bag.pose = targetPose === "sad" ? "sad" : (targetPose === "wiggle" ? "wiggle" : "up");
        if (onDone) onDone();
    });
}

function kit_moustache_cancel_wiggle(host) {
    let bag = kit_moustache_bag(host);
    bag.gen += 1;
    bag.wiggleArmed = false;
}

function kit_moustache_schedule_wiggle(root, host) {
    let bag = kit_moustache_bag(host);
    if (!kit_ear_is_live(root)) return;
    if (bag.pose === "sad") return;
    if (bag.wiggleArmed) return;
    bag.wiggleArmed = true;
    let wait = 1000 + Math.random() * 1000;
    let gen = bag.gen;
    kit_ear_schedule(root, wait, () => {
        if (!host.isConnected) return;
        let live = kit_moustache_bag(host);
        if (live.gen !== gen) return;
        live.wiggleArmed = false;
        if (!kit_ear_is_live(root)) return;
        if (live.pose === "sad") return;
        // Occasional happy wiggle: down 750ms → pause 500ms → up 750ms.
        kit_moustache_animate_to(root, host, "wiggle", 750, () => {
            let pauseGen = kit_moustache_bag(host).gen;
            kit_ear_schedule(root, 500, () => {
                if (kit_moustache_bag(host).gen !== pauseGen) return;
                kit_moustache_animate_to(root, host, "up", 750, () => {
                    kit_moustache_bag(host).pose = "up";
                    kit_moustache_schedule_wiggle(root, host);
                });
            });
        });
    });
}

function apply_kit_moustache_motion(root, opts) {
    if (!root) return;
    opts = opts || {};
    let animate = opts.animate !== false;
    let expression = opts.expression === "sad" ? "sad" : "happy";
    let hosts = kit_moustache_hosts(root);
    hosts.forEach((host) => {
        kit_moustache_cancel_wiggle(host);
        if (expression === "sad") {
            kit_moustache_apply_amounts(host, kit_moustache_pose_amounts("sad"));
            kit_moustache_bag(host).pose = "sad";
            return;
        }
        kit_moustache_apply_amounts(host, kit_moustache_pose_amounts("up"));
        kit_moustache_bag(host).pose = "up";
        if (animate) kit_moustache_schedule_wiggle(root, host);
    });
}

function kit_moustache_set_mood(root, next, animated) {
    if (!root) return;
    let sad = next === "sad";
    let hosts = kit_moustache_hosts(root);
    hosts.forEach((host) => {
        let bag = kit_moustache_bag(host);
        let want = sad ? "sad" : "up";
        if (bag.pose === want && !bag.wiggleArmed && (bag.angles.sprocket || 0) === (sad ? 90 : 0)) {
            if (!sad && animated && kit_ear_is_live(root)) kit_moustache_schedule_wiggle(root, host);
            return;
        }
        kit_moustache_cancel_wiggle(host);
        if (!animated || !kit_ear_is_live(root)) {
            kit_moustache_apply_amounts(host, kit_moustache_pose_amounts(want === "sad" ? "sad" : "up"));
            bag.pose = want;
            if (!sad && kit_ear_is_live(root)) kit_moustache_schedule_wiggle(root, host);
            return;
        }
        // Interrupt mid-wiggle by animating from current baked angles to target.
        kit_moustache_animate_to(root, host, want === "sad" ? "sad" : "up", 750, () => {
            bag.pose = want;
            if (!sad) kit_moustache_schedule_wiggle(root, host);
        });
    });
}

function kit_muffin_hosts(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(".lower_face_part.sweet, .lower_face_part_sweet"))
        .filter(kit_overlay_is_shown);
}

function kit_muffin_bag(host) {
    if (!host._kitMuffin) {
        host._kitMuffin = {
            pose: "happy",
            gen: 0
        };
    }
    return host._kitMuffin;
}

function kit_muffin_clear_fx(host) {
    if (!host) return;
    Array.from(host.querySelectorAll(":scope > .kit_muffin_fx, .kit_muffin_sprinkle, .kit_muffin_sprinkle_wrap")).forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });
}

function kit_muffin_reset_art(host) {
    if (!host) return;
    kit_muffin_clear_fx(host);
    let topping = host.querySelector(".muffin_topping");
    if (topping) {
        Array.from(topping.querySelectorAll(":scope > animateTransform.kit_muffin_anim")).forEach((anim) => {
            try { if (typeof anim.endElement === "function") anim.endElement(); } catch (err) {}
            if (anim.parentNode) anim.parentNode.removeChild(anim);
        });
        topping.removeAttribute("transform");
        topping.style.transform = "";
    }
    // Unwrap leftover scale transforms from earlier squash experiments.
    let scaleG = null;
    let node = host.parentNode;
    while (node) {
        if (node.classList && node.classList.contains("kit_overlay_muffin")) {
            scaleG = node;
            break;
        }
        node = node.parentNode;
    }
    if (scaleG) {
        scaleG.removeAttribute("transform");
        Array.from(scaleG.querySelectorAll(":scope > animateTransform.kit_muffin_anim")).forEach((anim) => {
            if (anim.parentNode) anim.parentNode.removeChild(anim);
        });
    }
}

function kit_muffin_cancel(host) {
    let bag = kit_muffin_bag(host);
    bag.gen += 1;
}

function apply_kit_muffin_motion(root, opts) {
    if (!root) return;
    opts = opts || {};
    let expression = opts.expression === "sad" ? "sad" : "happy";
    kit_muffin_hosts(root).forEach((host) => {
        kit_muffin_reset_art(host);
        kit_muffin_cancel(host);
        kit_muffin_bag(host).pose = expression === "sad" ? "sad" : "happy";
    });
}

function kit_muffin_set_mood(root, next, animated) {
    if (!root) return;
    let sad = next === "sad";
    kit_muffin_hosts(root).forEach((host) => {
        kit_muffin_reset_art(host);
        kit_muffin_cancel(host);
        kit_muffin_bag(host).pose = sad ? "sad" : "happy";
    });
}

function kit_sea_nose_hosts(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(".lower_face_part.sea, .lower_face_part_sea"))
        .filter(kit_overlay_is_shown);
}

function kit_sea_nose_bag(host) {
    if (!host._kitSeaNose) {
        host._kitSeaNose = {
            pose: "happy",
            gen: 0,
            dripArmed: false
        };
    }
    return host._kitSeaNose;
}

function kit_sea_nose_pivot(host) {
    let layer = host && host.parentNode;
    let marker = layer && layer.querySelector(".lower_face_marker, .placement_marker.lower_face_marker");
    if (marker) {
        return {
            x: parseFloat(marker.getAttribute("cx") || "0") || 0,
            y: parseFloat(marker.getAttribute("cy") || "0") || 0
        };
    }
    try {
        let bb = host.getBBox();
        return { x: bb.x + bb.width / 2, y: bb.y + bb.height * 0.12 };
    } catch (err) {
        return { x: 0, y: 0 };
    }
}

function kit_sea_nose_ensure_structure(host) {
    if (!host) return null;
    let pose = host.querySelector(":scope > .kit_sea_nose_pose");
    if (pose) {
        if (!host.querySelector(":scope > .kit_sea_nose_fx")) {
            host.appendChild(kit_ear_el("g", { class: "kit_ear_fx kit_sea_nose_fx" }));
        }
        return pose;
    }
    let rock = kit_ear_el("g", { class: "kit_sea_nose_rock" });
    pose = kit_ear_el("g", { class: "kit_sea_nose_pose" });
    Array.from(host.childNodes).forEach((ch) => rock.appendChild(ch));
    pose.appendChild(rock);
    host.appendChild(pose);
    host.appendChild(kit_ear_el("g", { class: "kit_ear_fx kit_sea_nose_fx" }));
    return pose;
}

function kit_sea_nose_clear_rock(host) {
    let rock = host && host.querySelector(".kit_sea_nose_rock");
    if (!rock) return;
    Array.from(rock.querySelectorAll(":scope > animateTransform.kit_ear_anim")).forEach((anim) => {
        try { if (typeof anim.endElement === "function") anim.endElement(); } catch (err) {}
        if (anim.parentNode) anim.parentNode.removeChild(anim);
    });
    rock.removeAttribute("transform");
    rock.style.transform = "";
}

function kit_sea_nose_apply_pose(host, pose) {
    let poseG = kit_sea_nose_ensure_structure(host);
    if (!poseG) return;
    if (pose === "sad") {
        poseG.setAttribute("transform", "translate(0 14)");
    } else {
        poseG.removeAttribute("transform");
        poseG.style.transform = "";
    }
}

function kit_sea_nose_add_rock(host) {
    let poseG = kit_sea_nose_ensure_structure(host);
    let rock = poseG && poseG.querySelector(".kit_sea_nose_rock");
    if (!rock || rock.querySelector("animateTransform.kit_ear_anim")) return;
    let pt = kit_sea_nose_pivot(host);
    kit_ear_add_smil(rock, {
        type: "rotate",
        values: kit_ear_rotate_values([0, 5.2, -4.2, 4.6, -3.4, 2.2, 0], pt.x, pt.y),
        keyTimes: "0; 0.16; 0.34; 0.52; 0.7; 0.86; 1",
        calcMode: "spline",
        keySplines: "0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1",
        dur: "8.2s",
        repeatCount: "indefinite"
    });
}

function kit_sea_nose_tip(host) {
    let rock = host.querySelector(".kit_sea_nose_rock") || host;
    try {
        let bb = rock.getBBox();
        return { x: bb.x + bb.width * 0.42, y: bb.y + 6 };
    } catch (err) {
        let pt = kit_sea_nose_pivot(host);
        return { x: pt.x, y: pt.y - 70 };
    }
}

function kit_sea_nose_spawn_drip(fx, x, y, root) {
    if (!fx || !kit_ear_is_live(root)) return;
    let count = 1 + (Math.random() > 0.55 ? 1 : 0);
    for (let i = 0; i < count; i++) {
        kit_ear_schedule(root, i * 90, () => {
            if (!kit_ear_is_live(root)) return;
            let drop = kit_ear_el("g", { class: "kit_ear_particle kit_ear_droplet" });
            let rx = 4.2 + Math.random() * 2.4;
            drop.appendChild(kit_ear_el("ellipse", {
                rx: String(rx),
                ry: String(rx * 1.35),
                fill: KIT_EAR_DROP_FILLS[Math.floor(Math.random() * KIT_EAR_DROP_FILLS.length)],
                stroke: "#111",
                "stroke-width": "1.5"
            }));
            drop.appendChild(kit_ear_el("ellipse", {
                rx: String(rx * 0.32),
                ry: String(rx * 0.4),
                cy: String(-rx * 0.32),
                fill: "#fff",
                opacity: "0.45"
            }));
            drop.style.pointerEvents = "none";
            drop.style.opacity = "0.95";
            let dx0 = (Math.random() - 0.5) * 8;
            drop.style.transform = "translate(" + (x + dx0) + "px, " + y + "px)";
            fx.appendChild(drop);
            let dx = dx0 + (Math.random() - 0.5) * 18;
            requestAnimationFrame(() => {
                if (!kit_ear_is_live(root) || !drop.parentNode) {
                    if (drop.parentNode) drop.parentNode.removeChild(drop);
                    return;
                }
                drop.style.transition = "transform 0.95s cubic-bezier(0.4, 0, 1, 1), opacity 0.7s ease-in";
                drop.style.transform = "translate(" + (x + dx) + "px, " + (y + 110) + "px)";
                kit_ear_schedule(root, 420, () => { drop.style.opacity = "0"; });
                kit_ear_schedule(root, 1000, () => {
                    if (drop.parentNode) drop.parentNode.removeChild(drop);
                });
            });
        });
    }
}

function kit_sea_nose_cancel(host) {
    let bag = kit_sea_nose_bag(host);
    bag.gen += 1;
    bag.dripArmed = false;
}

function kit_sea_nose_schedule_drip(root, host) {
    let bag = kit_sea_nose_bag(host);
    if (!kit_ear_is_live(root)) return;
    if (bag.pose === "sad") return;
    if (bag.dripArmed) return;
    bag.dripArmed = true;
    let wait = 4200 + Math.random() * 5200;
    let gen = bag.gen;
    kit_ear_schedule(root, wait, () => {
        if (!host.isConnected) return;
        let live = kit_sea_nose_bag(host);
        if (live.gen !== gen) return;
        live.dripArmed = false;
        if (!kit_ear_is_live(root)) return;
        if (live.pose === "sad") return;
        let fx = host.querySelector(":scope > .kit_sea_nose_fx");
        let tip = kit_sea_nose_tip(host);
        if (fx) kit_sea_nose_spawn_drip(fx, tip.x, tip.y, root);
        kit_sea_nose_schedule_drip(root, host);
    });
}

function apply_kit_sea_nose_motion(root, opts) {
    if (!root) return;
    opts = opts || {};
    let animate = opts.animate !== false;
    let expression = opts.expression === "sad" ? "sad" : "happy";
    kit_sea_nose_hosts(root).forEach((host) => {
        kit_sea_nose_cancel(host);
        kit_sea_nose_clear_rock(host);
        let bag = kit_sea_nose_bag(host);
        if (expression === "sad") {
            kit_sea_nose_apply_pose(host, "sad");
            bag.pose = "sad";
            return;
        }
        kit_sea_nose_apply_pose(host, "happy");
        bag.pose = "happy";
        if (animate) {
            kit_sea_nose_add_rock(host);
            kit_sea_nose_schedule_drip(root, host);
        }
    });
}

function kit_sea_nose_set_mood(root, next, animated) {
    if (!root) return;
    let sad = next === "sad";
    kit_sea_nose_hosts(root).forEach((host) => {
        kit_sea_nose_cancel(host);
        kit_sea_nose_clear_rock(host);
        let bag = kit_sea_nose_bag(host);
        if (sad) {
            kit_sea_nose_apply_pose(host, "sad");
            bag.pose = "sad";
            return;
        }
        kit_sea_nose_apply_pose(host, "happy");
        bag.pose = "happy";
        if ((animated || kit_ear_is_live(root)) && kit_ear_is_live(root)) {
            kit_sea_nose_add_rock(host);
            kit_sea_nose_schedule_drip(root, host);
        }
    });
}

function kit_clam_hosts(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(".eye_part.sea, .eye_part_sea"))
        .filter(kit_overlay_is_shown)
        .filter((host) => !!(
            host.querySelector(".seashell_bottom")
            || host.querySelector(".seashell_top_open")
            || host.querySelector(".seashell_top_closed")
        ));
}

function kit_clam_bag(host) {
    if (!host._kitClam) {
        host._kitClam = {
            pose: "open",
            gen: 0,
            blinkArmed: false
        };
    }
    return host._kitClam;
}

function kit_clam_set_parts(host, open) {
    if (!host) return;
    let topOpen = host.querySelector(".seashell_top_open");
    let topClosed = host.querySelector(".seashell_top_closed");
    let pearl = kit_clam_pearl(host);
    if (topOpen) topOpen.setAttribute("display", open ? "inline" : "none");
    if (topClosed) topClosed.setAttribute("display", open ? "none" : "inline");
    if (pearl) pearl.setAttribute("display", open ? "inline" : "none");
}

function kit_clam_pearl(host) {
    if (!host) return null;
    return host.querySelector(".pearl") || host.querySelector(".seashell_pearl");
}

function kit_pearl_add_glimmer(pearl) {
    if (!pearl || pearl.querySelector(":scope > .kit_pearl_glimmer")) return;
    let bb;
    try { bb = pearl.getBBox(); } catch (err) { return; }
    if (!bb || !(bb.width > 1 && bb.height > 1)) return;
    let wrap = kit_ear_el("g", {
        class: "kit_pearl_glimmer",
        "pointer-events": "none"
    });
    let defs = kit_ear_el("defs", { class: "kit_pearl_glimmer_defs" });
    wrap.appendChild(defs);
    let cx = bb.x + bb.width / 2;
    let cy = bb.y + bb.height / 2;
    let diag = Math.sqrt(bb.width * bb.width + bb.height * bb.height);
    let bandW = Math.max(10, diag * 0.42);
    let travel = diag * 1.9 + bandW;
    let ux = 0.7071;
    let uy = 0.7071;
    let x0 = ux * travel;
    let y0 = uy * travel;
    let x1 = -ux * travel;
    let y1 = -uy * travel;
    let clipId = "kit_pearl_glim_clip_" + (++kit_stamp_glimmer_seq);
    let clip = kit_ear_el("clipPath", {
        id: clipId,
        clipPathUnits: "userSpaceOnUse"
    });
    Array.from(pearl.querySelectorAll(":scope > circle, :scope > ellipse, :scope > path")).forEach((el) => {
        let piece = el.cloneNode(true);
        piece.removeAttribute("class");
        piece.removeAttribute("opacity");
        piece.removeAttribute("display");
        clip.appendChild(piece);
    });
    defs.appendChild(clip);
    let clipped = kit_ear_el("g", {
        class: "kit_pearl_glimmer_clip",
        "clip-path": "url(#" + clipId + ")",
        opacity: "0"
    });
        // Slower sweep — same band trick as stamps, but less frequent so the pearl feels precious.
        clipped.appendChild(kit_ear_el("animate", {
            class: "kit_ear_anim kit_clam_shine_anim",
            attributeName: "opacity",
            values: "0.55;0.55;0;0",
            keyTimes: "0;0.12;0.1201;1",
            dur: "18s",
            repeatCount: "indefinite",
            calcMode: "linear"
        }));
        let move = kit_ear_el("g", { class: "kit_pearl_glimmer_move" });
        move.appendChild(kit_ear_el("animateTransform", {
            class: "kit_ear_anim kit_clam_shine_anim",
            attributeName: "transform",
            type: "translate",
            values: x0 + " " + y0 + ";" + x1 + " " + y1 + ";" + x1 + " " + y1,
            keyTimes: "0;0.12;1",
            dur: "18s",
            repeatCount: "indefinite",
            calcMode: "linear"
        }));
    move.appendChild(kit_ear_el("rect", {
        class: "kit_pearl_glimmer_band",
        x: String(cx - bandW / 2),
        y: String(cy - diag * 1.2),
        width: String(bandW),
        height: String(diag * 2.4),
        fill: "#fff",
        transform: "rotate(45 " + cx + " " + cy + ")"
    }));
    clipped.appendChild(move);
    wrap.appendChild(clipped);
    pearl.appendChild(wrap);
    wrap.querySelectorAll("animate, animateTransform").forEach((anim) => {
        try { if (typeof anim.beginElement === "function") anim.beginElement(); } catch (err) {}
    });
}

function kit_clam_clear_shine(pearl) {
    if (!pearl) return;
    Array.from(pearl.querySelectorAll(":scope > .kit_pearl_glimmer, .kit_pearl_glimmer_defs")).forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });
    Array.from(pearl.querySelectorAll("animate.kit_clam_shine_anim, animateTransform.kit_clam_shine_anim")).forEach((anim) => {
        try { if (typeof anim.endElement === "function") anim.endElement(); } catch (err) {}
        if (anim.parentNode) anim.parentNode.removeChild(anim);
    });
    pearl.classList.remove("kit_pearl_glow");
    pearl.style.filter = "";
    pearl.removeAttribute("opacity");
}

function kit_clam_start_shine(pearl) {
    if (!pearl) return;
    kit_clam_clear_shine(pearl);
    kit_pearl_add_glimmer(pearl);
    // Steady soft halo, with a brief brighter pulse after each glimmer sweep.
    pearl.classList.add("kit_pearl_glow");
}

function kit_clam_stop_shine(host) {
    kit_clam_clear_shine(kit_clam_pearl(host));
}

function kit_clam_cancel(host) {
    let bag = kit_clam_bag(host);
    bag.gen += 1;
    bag.blinkArmed = false;
}

function kit_clam_schedule_blink(root, host) {
    let bag = kit_clam_bag(host);
    if (!kit_ear_is_live(root)) return;
    if (bag.pose !== "open") return;
    if (bag.blinkArmed) return;
    bag.blinkArmed = true;
    let wait = 2800 + Math.random() * 4200;
    let gen = bag.gen;
    kit_ear_schedule(root, wait, () => {
        if (!host.isConnected) return;
        let live = kit_clam_bag(host);
        if (live.gen !== gen) return;
        live.blinkArmed = false;
        if (!kit_ear_is_live(root)) return;
        if (live.pose !== "open") return;
        // Quick blink closed, then reopen with pearl shine.
        kit_clam_set_parts(host, false);
        kit_clam_stop_shine(host);
        let blinkGen = ++live.gen;
        kit_ear_schedule(root, 160 + Math.random() * 80, () => {
            if (kit_clam_bag(host).gen !== blinkGen) return;
            if (kit_clam_bag(host).pose !== "open") return;
            kit_clam_set_parts(host, true);
            kit_clam_start_shine(kit_clam_pearl(host));
            kit_clam_schedule_blink(root, host);
        });
    });
}

function apply_kit_clam_motion(root, opts) {
    if (!root) return;
    opts = opts || {};
    let animate = opts.animate !== false;
    let expression = opts.expression === "sad" ? "sad" : "happy";
    kit_clam_hosts(root).forEach((host) => {
        kit_clam_cancel(host);
        let bag = kit_clam_bag(host);
        if (expression === "sad") {
            kit_clam_set_parts(host, false);
            kit_clam_stop_shine(host);
            bag.pose = "closed";
            return;
        }
        kit_clam_set_parts(host, true);
        bag.pose = "open";
        if (animate) {
            kit_clam_start_shine(kit_clam_pearl(host));
            kit_clam_schedule_blink(root, host);
        } else {
            kit_clam_stop_shine(host);
        }
    });
}

function kit_clam_set_mood(root, next, animated) {
    if (!root) return;
    let sad = next === "sad";
    kit_clam_hosts(root).forEach((host) => {
        kit_clam_cancel(host);
        let bag = kit_clam_bag(host);
        if (sad) {
            kit_clam_set_parts(host, false);
            kit_clam_stop_shine(host);
            bag.pose = "closed";
            return;
        }
        kit_clam_set_parts(host, true);
        bag.pose = "open";
        if ((animated || kit_ear_is_live(root)) && kit_ear_is_live(root)) {
            kit_clam_start_shine(kit_clam_pearl(host));
            kit_clam_schedule_blink(root, host);
        } else {
            kit_clam_stop_shine(host);
        }
    });
}

function apply_kit_overlay_motion(root, opts) {
    if (!root) return;
    opts = opts || {};
    let animate = opts.animate !== false;
    let expression = opts.expression === "sad" ? "sad" : "happy";
    if (animate) {
        root.classList.add("kit_ear_live");
        root.classList.remove("fennimal_pose_frozen");
    }
    apply_kit_candle_flames(root, { dance: animate, lit: expression !== "sad" });
    apply_kit_moustache_motion(root, { animate: animate, expression: expression });
    apply_kit_muffin_motion(root, { animate: animate, expression: expression });
    apply_kit_clam_motion(root, { animate: animate, expression: expression });
    apply_kit_sea_nose_motion(root, { animate: animate, expression: expression });
    if (!animate) return;
    apply_kit_sprocket_spin(root);
    Array.from(root.querySelectorAll(".kit_ear_wiggle")).forEach((earInner, i) => {
        kit_ear_ensure_fx(earInner);
        let token = kit_ear_token_name(earInner);
        if (kit_overlay_part_shown(earInner, "ear_part", "mushroom") || token === "mushroom") {
            apply_kit_ear_mushroom(earInner, root, i);
        }
        if (kit_overlay_part_shown(earInner, "ear_part", "sea")) {
            apply_kit_ear_sea_overlay(earInner, root, i);
        } else if (token === "seashell") {
            apply_kit_ear_seashell(earInner, root, i);
        }
        if (token === "bat") apply_kit_ear_bat(earInner, i);
        if (token === "mechanical" && !root.querySelector(".sprocket")) {
            apply_kit_ear_mechanical(earInner, i);
        }
    });
    apply_kit_seastar_pulse(root);
    apply_kit_sweet_eye_settle(root);
}

function kit_overlay_root_has_motion(root) {
    if (!root || !root.querySelector) return false;
    return !!(
        root.querySelector(".kit_ear_wiggle")
        || root.querySelector(".sprocket")
        || root.querySelector(".candle_fire_point")
        || root.querySelector(".ear_part.sea, .ear_part_sea, .ear_part.mushroom, .ear_part_mushroom")
        || root.querySelector(".eye_part.sea, .eye_part_sea, .eye_part.sweet, .eye_part_sweet")
        || root.querySelector(".lower_face_part.mechanical, .lower_face_part_mechanical")
        || root.querySelector(".lower_face_part.sweet, .lower_face_part_sweet")
        || root.querySelector(".lower_face_part.sea, .lower_face_part_sea")
        || root.querySelector(".seastar_top, .seastar_middle, .seastar_bottom")
    );
}

function apply_kit_ear_wiggle(root, opts) {
    if (!root) return;
    opts = opts || {};
    kit_ear_stop_timers(root);
    kit_ear_strip_motion(root);
    root.classList.remove("fennimal_pose_frozen");
    if (!kit_overlay_root_has_motion(root)) {
        root.classList.remove("kit_ear_live");
        return;
    }
    apply_kit_overlay_motion(root, {
        animate: opts.animate !== false,
        expression: opts.expression === "sad" ? "sad" : "happy"
    });
}

/**
 * Create-time kit bits only: lit candles (no dance) + open clam/pearl.
 * Live loops start from apply_kit_closeup_decorations / apply_kit_ear_wiggle.
 */
function kit_overlay_ensure_static(root) {
    if (!root || !kit_overlay_root_has_motion(root)) return;
    apply_kit_candle_flames(root, { dance: false, lit: true });
    if (typeof apply_kit_clam_motion === "function") {
        apply_kit_clam_motion(root, { animate: false, expression: "happy" });
    }
}

function kit_stamp_nodes(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll("[data-kit-role='stamp_left'], [data-kit-role='stamp_right']"));
}

function kit_stamp_strip(root) {
    if (!root) return;
    root.classList.remove("kit_stamp_lighting");
    root.querySelectorAll(".kit_stamp_motion").forEach((motion) => {
        if (motion._stampGlimmerTimer) {
            clearTimeout(motion._stampGlimmerTimer);
            motion._stampGlimmerTimer = null;
        }
    });
    root.querySelectorAll("animate.kit_stamp_anim, animateTransform.kit_stamp_anim").forEach((el) => {
        try { if (typeof el.endElement === "function") el.endElement(); } catch (err) {}
        if (el.parentNode) el.parentNode.removeChild(el);
    });
    root.querySelectorAll(".kit_stamp_spec, .kit_stamp_shadow_filter, .kit_stamp_shadow_blob, .kit_stamp_outline, .kit_stamp_glimmer_defs").forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });
    root.querySelectorAll(".kit_stamp_press, .kit_stamp_expr, .kit_stamp_motion, .kit_stamp_art_box").forEach((el) => {
        el.removeAttribute("transform");
        el.removeAttribute("filter");
        el.style.transform = "";
        el.style.filter = "";
        el.style.animation = "";
    });
}

function kit_stamp_ensure_motion(stamp) {
    if (!stamp) return null;
    let existing = stamp.querySelector(":scope > .kit_stamp_motion");
    if (existing) {
        let press = existing.querySelector(".kit_stamp_press");
        if (press) {
            press.querySelectorAll(":scope > animateTransform.kit_stamp_anim").forEach((el) => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            press.appendChild(kit_stamp_press_anim());
            let art = kit_stamp_art_group(press);
            if (art) art.classList.add("kit_stamp_art_box");
        }
        return existing;
    }
    let pt = kit_ear_point(stamp, ".stamp_marker");
    let motion = kit_ear_el("g", { class: "kit_stamp_motion" });
    let expr = kit_ear_el("g", { class: "kit_stamp_expr" });
    let pivot = kit_ear_el("g", {
        class: "kit_stamp_pivot",
        transform: "translate(" + pt.x + " " + pt.y + ")"
    });
    let press = kit_ear_el("g", { class: "kit_stamp_press" });
    let unpivot = kit_ear_el("g", {
        class: "kit_stamp_art_box",
        transform: "translate(" + (-pt.x) + " " + (-pt.y) + ")"
    });
    while (stamp.firstChild) unpivot.appendChild(stamp.firstChild);
    press.appendChild(unpivot);
    press.appendChild(kit_stamp_press_anim());
    pivot.appendChild(press);
    expr.appendChild(pivot);
    motion.appendChild(expr);
    stamp.appendChild(motion);
    return motion;
}

function kit_stamp_press_anim() {
    return kit_ear_el("animateTransform", {
        class: "kit_stamp_anim",
        attributeName: "transform",
        attributeType: "XML",
        type: "scale",
        values: "1.32 1.32; 1.26 1.26; 0.9 0.9; 1.04 1.04; 1 1",
        keyTimes: "0; 0.16; 0.42; 0.7; 1",
        dur: "0.72s",
        begin: "indefinite",
        fill: "freeze",
        restart: "always",
        calcMode: "spline",
        keySplines: "0.2 0.7 0.3 1; 0.3 0 0.5 1; 0.2 0.7 0.3 1; 0.2 0.6 0.3 1"
    });
}

function kit_stamp_clear_shadow(motion) {
    if (!motion) return;
    if (motion._stampGlimmerTimer) {
        clearTimeout(motion._stampGlimmerTimer);
        motion._stampGlimmerTimer = null;
    }
    motion.removeAttribute("filter");
    motion.style.filter = "";
    motion.style.animation = "";
    let host = motion.parentNode || motion;
    host.querySelectorAll(":scope > .kit_stamp_shadow_filter, :scope > defs.kit_stamp_shadow_filter").forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });
    motion.querySelectorAll(".kit_stamp_shadow_filter, .kit_stamp_shadow_blob, .kit_stamp_outline, .kit_stamp_spec").forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });
    if (host && host.querySelectorAll) {
        host.querySelectorAll(":scope > .kit_stamp_glimmer_defs").forEach((el) => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });
    }
}

function kit_stamp_art_group(press) {
    if (!press) return null;
    return Array.from(press.children).find((el) => {
        return el.tagName && el.tagName.toLowerCase() === "g"
            && !el.classList.contains("kit_stamp_outline");
    }) || null;
}

function kit_stamp_prepare_stroke_outline(root) {
    if (!root) return;
    root.querySelectorAll(".placement_marker, .stamp_marker, animate, animateTransform").forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });
    root.querySelectorAll("path, polygon, polyline, circle, ellipse, rect, line").forEach((el) => {
        let sw = parseFloat(el.getAttribute("stroke-width") || "0") || 0;
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", "#fff6e8");
        el.setAttribute("stroke-linejoin", "round");
        el.setAttribute("stroke-linecap", "round");
        el.setAttribute("opacity", "1");
        el.setAttribute("stroke-opacity", "0.22");
        el.setAttribute("stroke-width", String(sw > 4 ? sw + 3.2 : 3.6));
        el.style.fill = "none";
        el.removeAttribute("display");
    });
}

function kit_stamp_add_outline(motion) {
    if (!motion) return;
    let press = motion.querySelector(".kit_stamp_press");
    let art = kit_stamp_art_group(press);
    if (!art) return;
    let wrap = kit_ear_el("g", {
        class: "kit_stamp_outline kit_stamp_outline_pulse",
        "pointer-events": "none"
    });
    let scaled = kit_ear_el("g", { transform: "scale(1.08)" });
    let clone = art.cloneNode(true);
    kit_stamp_prepare_stroke_outline(clone);
    scaled.appendChild(clone);
    wrap.appendChild(scaled);
    press.insertBefore(wrap, art);
    wrap.querySelectorAll("path, polygon, polyline, circle, ellipse, rect, line").forEach((el, i) => {
        let begin = (i * 0.08) + "s";
        el.appendChild(kit_ear_el("animate", {
            class: "kit_stamp_anim",
            attributeName: "stroke-opacity",
            values: "0.1; 0.5; 0.24; 0.1",
            keyTimes: "0; 0.3; 0.62; 1",
            dur: "3.2s",
            repeatCount: "indefinite",
            begin: begin
        }));
        let sw = parseFloat(el.getAttribute("stroke-width") || "3.6") || 3.6;
        el.appendChild(kit_ear_el("animate", {
            class: "kit_stamp_anim",
            attributeName: "stroke-width",
            values: sw + ";" + (sw * 1.22) + ";" + sw,
            dur: "3.2s",
            repeatCount: "indefinite",
            begin: begin
        }));
    });
}

function kit_stamp_ensure_click_pulse(motion) {
    if (!motion) return null;
    let press = motion.querySelector(".kit_stamp_press");
    let art = kit_stamp_art_group(press);
    if (!art) return null;
    let wrap = press.querySelector(":scope > .kit_stamp_outline_click");
    if (wrap) return wrap;
    wrap = kit_ear_el("g", {
        class: "kit_stamp_outline kit_stamp_outline_pulse kit_stamp_outline_click",
        "pointer-events": "none",
        opacity: "0"
    });
    let scaled = kit_ear_el("g", {
        class: "kit_stamp_outline_click_scale",
        transform: "scale(1.08)"
    });
    let clone = art.cloneNode(true);
    kit_stamp_prepare_stroke_outline(clone);
    clone.querySelectorAll("path, polygon, polyline, circle, ellipse, rect, line").forEach((el) => {
        el.setAttribute("stroke-opacity", "0.55");
    });
    scaled.appendChild(clone);
    wrap.appendChild(scaled);
    wrap.appendChild(kit_ear_el("animate", {
        class: "kit_stamp_anim kit_stamp_click_pulse",
        attributeName: "opacity",
        values: "0; 1; 0.4; 0",
        keyTimes: "0; 0.22; 0.58; 1",
        dur: "0.82s",
        begin: "indefinite",
        fill: "freeze",
        restart: "always",
        calcMode: "spline",
        keySplines: "0.2 0.7 0.3 1; 0.25 0 0.5 1; 0.2 0.6 0.3 1"
    }));
    scaled.appendChild(kit_ear_el("animateTransform", {
        class: "kit_stamp_anim kit_stamp_click_pulse",
        attributeName: "transform",
        attributeType: "XML",
        type: "scale",
        values: "1.08; 1.22; 1.1; 1.08",
        keyTimes: "0; 0.28; 0.62; 1",
        dur: "0.82s",
        begin: "indefinite",
        fill: "freeze",
        restart: "always",
        calcMode: "spline",
        keySplines: "0.2 0.7 0.3 1; 0.25 0 0.5 1; 0.2 0.6 0.3 1"
    }));
    press.insertBefore(wrap, art);
    return wrap;
}

function kit_stamp_fire_click_pulse(wrap) {
    if (!wrap || !wrap.querySelectorAll) return;
    wrap.querySelectorAll(".kit_stamp_click_pulse").forEach((anim) => {
        try { if (typeof anim.beginElement === "function") anim.beginElement(); } catch (err) {}
    });
}

function kit_stamp_prepare_outline(root, paint) {
    if (!root) return;
    root.querySelectorAll(".placement_marker, .stamp_marker, animate, animateTransform").forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });
    root.querySelectorAll("path, polygon, polyline, circle, ellipse, rect, line").forEach((el) => {
        let fill = ((el.getAttribute("fill") || "") + "").toLowerCase();
        let sw = parseFloat(el.getAttribute("stroke-width") || "0") || 0;
        el.removeAttribute("opacity");
        el.removeAttribute("display");
        el.style.opacity = "";
        if (fill === "none") {
            el.setAttribute("fill", "none");
            el.setAttribute("stroke", paint);
            el.setAttribute("stroke-linejoin", "round");
            el.setAttribute("stroke-linecap", "round");
            if (!(sw > 1)) el.setAttribute("stroke-width", "5.5");
            el.style.fill = "none";
        } else {
            el.setAttribute("fill", paint);
            el.setAttribute("stroke", paint);
            el.setAttribute("stroke-width", String(Math.max(1.4, sw || 1.4)));
            el.style.fill = paint;
        }
    });
}

function kit_stamp_glimmer_bbox(art) {
    try {
        if (art && typeof art.getBBox === "function") {
            let bb = art.getBBox();
            if (bb && bb.width > 2 && bb.height > 2) return bb;
        }
    } catch (err) {}
    return { x: -40, y: -40, width: 80, height: 80 };
}

function kit_stamp_start_anims(host) {
    if (!host || !host.querySelectorAll) return;
    host.querySelectorAll("animate.kit_stamp_anim, animateTransform.kit_stamp_anim").forEach((anim) => {
        try { if (typeof anim.beginElement === "function") anim.beginElement(); } catch (err) {}
    });
}

function kit_stamp_glimmer_band_points(cx, cy, ux, uy, band, span) {
    let vx = -uy;
    let vy = ux;
    let hx = ux * band / 2;
    let hy = uy * band / 2;
    let lx = vx * span / 2;
    let ly = vy * span / 2;
    return [
        [cx + hx + lx, cy + hy + ly],
        [cx + hx - lx, cy + hy - ly],
        [cx - hx - lx, cy - hy - ly],
        [cx - hx + lx, cy - hy + ly]
    ].map(function (p) {
        return (Math.round(p[0] * 10) / 10) + "," + (Math.round(p[1] * 10) / 10);
    }).join(" ");
}

function kit_stamp_clip_shapes(art) {
    if (!art) return [];
    return Array.from(art.querySelectorAll("path, polygon, polyline, circle, ellipse, rect")).filter((el) => {
        let cls = el.getAttribute("class") || "";
        return cls.indexOf("placement_marker") < 0 && cls.indexOf("stamp_marker") < 0;
    });
}

function kit_stamp_add_glimmer(motion) {
    if (!motion) return;
    let press = motion.querySelector(".kit_stamp_press");
    let art = kit_stamp_art_group(press);
    if (!art) return;
    let bb = kit_stamp_glimmer_bbox(art);
    if (!(bb.width > 1 && bb.height > 1)) return;
    let wrap = kit_ear_el("g", {
        class: "kit_stamp_outline kit_stamp_glimmer",
        "pointer-events": "none"
    });
    let defs = kit_ear_el("defs", { class: "kit_stamp_glimmer_defs" });
    let shapes = kit_stamp_clip_shapes(art);
    let filled = shapes.filter((el) => ((el.getAttribute("fill") || "") + "").toLowerCase() !== "none");
    let strokeOnly = !filled.length && shapes.length;
    wrap.appendChild(defs);

    let cx = bb.x + bb.width / 2;
    let cy = bb.y + bb.height / 2;
    let diag = Math.sqrt(bb.width * bb.width + bb.height * bb.height);
    let bandW = Math.max(16, diag * 0.4);
    let travel = diag * 1.85 + bandW;
    let ux = 0.7071;
    let uy = 0.7071;
    let x0 = ux * travel;
    let y0 = uy * travel;
    let x1 = -ux * travel;
    let y1 = -uy * travel;

    if (strokeOnly) {
        wrap.classList.add("kit_stamp_glimmer_stroke");
        let clone = art.cloneNode(true);
        kit_stamp_prepare_stroke_outline(clone);
        clone.querySelectorAll("path, polygon, polyline, circle, ellipse, rect, line").forEach((el) => {
            el.setAttribute("stroke", "#fff");
            el.setAttribute("stroke-opacity", "1");
            el.setAttribute("opacity", "1");
        });
        wrap.appendChild(clone);
        if (art.nextSibling) press.insertBefore(wrap, art.nextSibling);
        else press.appendChild(wrap);
        return;
    }

    let clipId = "kit_stamp_glim_clip_" + (++kit_stamp_glimmer_seq);
    let clip = kit_ear_el("clipPath", {
        id: clipId,
        clipPathUnits: "userSpaceOnUse"
    });
    if (filled.length) {
        filled.forEach((el) => {
            let piece = el.cloneNode(true);
            piece.removeAttribute("class");
            piece.removeAttribute("opacity");
            piece.removeAttribute("display");
            clip.appendChild(piece);
        });
    } else {
        clip.appendChild(kit_ear_el("circle", {
            cx: String(bb.x + bb.width / 2),
            cy: String(bb.y + bb.height / 2),
            r: String(Math.max(bb.width, bb.height) * 0.62)
        }));
    }
    defs.appendChild(clip);
    let clipped = kit_ear_el("g", {
        class: "kit_stamp_glimmer_clip",
        "clip-path": "url(#" + clipId + ")",
        "clip-rule": "nonzero",
        opacity: "0"
    });
    clipped.appendChild(kit_ear_el("animate", {
        class: "kit_stamp_anim",
        attributeName: "opacity",
        values: "0.4;0.4;0;0",
        keyTimes: "0;0.14;0.1401;1",
        dur: "15.2s",
        repeatCount: "indefinite",
        calcMode: "linear"
    }));
    let move = kit_ear_el("g", { class: "kit_stamp_glimmer_move" });
    move.appendChild(kit_ear_el("animateTransform", {
        class: "kit_stamp_anim",
        attributeName: "transform",
        type: "translate",
        values: x0 + " " + y0 + ";" + x1 + " " + y1 + ";" + x1 + " " + y1,
        keyTimes: "0;0.14;1",
        dur: "15.2s",
        repeatCount: "indefinite",
        calcMode: "linear"
    }));
    move.appendChild(kit_ear_el("rect", {
        class: "kit_stamp_glimmer_band",
        x: String(cx - bandW / 2),
        y: String(cy - diag * 1.2),
        width: String(bandW),
        height: String(diag * 2.4),
        fill: "#fff",
        transform: "rotate(45 " + cx + " " + cy + ")"
    }));
    clipped.appendChild(move);
    wrap.appendChild(clipped);
    if (art.nextSibling) press.insertBefore(wrap, art.nextSibling);
    else press.appendChild(wrap);
    kit_stamp_start_anims(wrap);
}
function set_kit_stamp_expression(root, expression) {
    if (!root || !root.classList) return;
    root.classList.remove("kit_stamp_mood_happy", "kit_stamp_mood_sad");
    if (expression === "happy") root.classList.add("kit_stamp_mood_happy");
    else if (expression === "sad") root.classList.add("kit_stamp_mood_sad");
}

function apply_kit_stamp_salience(root, options) {
    if (!root) return;
    options = options || {};
    let stamps = kit_stamp_nodes(root);
    if (!stamps.length) {
        root.classList.remove("kit_stamp_live", "kit_stamp_lighting", "kit_stamp_outline_live");
        set_kit_stamp_expression(root, null);
        return;
    }
    stamps.forEach((stamp) => {
        let motion = kit_stamp_ensure_motion(stamp);
        kit_stamp_clear_shadow(motion);
        if (options.outline) kit_stamp_add_outline(motion);
        if (options.lighting) kit_stamp_add_glimmer(motion);
    });
    root.classList.toggle("kit_stamp_lighting", !!options.lighting);
    root.classList.toggle("kit_stamp_outline_live", !!options.outline);
    set_kit_stamp_expression(root, options.expression || null);
    if (options.lighting || options.outline || options.expression || options.press) {
        root.classList.add("kit_stamp_live");
        root.classList.remove("fennimal_pose_frozen");
    } else {
        root.classList.remove("kit_stamp_live", "kit_stamp_lighting", "kit_stamp_outline_live");
    }
}

function apply_kit_closeup_decorations(root) {
    if (!root) return;
    apply_kit_ear_wiggle(root);
    if (!kit_stamp_nodes(root).length) return;
    apply_kit_stamp_salience(root, {
        press: true,
        lighting: true,
        outline: false,
        expression: null
    });
}

function play_kit_stamp_press(root) {
    if (!root || !root.classList || root.classList.contains("fennimal_pose_frozen")) return;
    let stamps = kit_stamp_nodes(root);
    if (!stamps.length) return;
    stamps.forEach((stamp, i) => {
        let motion = kit_stamp_ensure_motion(stamp);
        let anim = stamp.querySelector(".kit_stamp_press > animateTransform.kit_stamp_anim");
        let pulse = kit_stamp_ensure_click_pulse(motion);
        if (!anim && !pulse) return;
        let fire = function () {
            try { if (anim && typeof anim.beginElement === "function") anim.beginElement(); } catch (err) {}
            kit_stamp_fire_click_pulse(pulse);
        };
        if (i === 0) fire();
        else if (kit_ear_is_live(root)) kit_ear_schedule(root, i * 45, fire);
        else setTimeout(fire, i * 45);
    });
}
