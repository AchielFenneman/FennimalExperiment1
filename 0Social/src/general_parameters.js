// Shared timings, colors, and helpers. Experiment design lives in stimulus_settings.js.

const GenParam = {
    screen: { width: 1920, height: 1080 },

    // Cash bonus for collected points. The instructions quote this rate.
    bonusExchange: {
        dollars: 0.01,
        points: 10
    },

    offerDelayMs: [2000, 2500],
    appleFadeMs: 500,
    ladderSnapPauseMs: 500,
    partnerSequenceMs: 6000,
    partnerBeatMs: 200,
    partnerDescentMs: 1000,
    vinePullMs: 750,
    branchRotationDeg: 45,
    // Picture units. Cooperation-required only: nudge the branch toward the player.
    branchShiftX: -40,
    branchShiftY: 30,
    vineSagTaut: 0,
    vineSagHold: 20,
    vineAppearMs: 180,
    vinePullBeatMs: 400,
    partnerClimbMs: 620,
    climbDurationMs: 900,
    walkSpeedPxPerSec: 420,
    // Partner travel still lasts the same time. The irregularity is late presses, brief releases, and a small horizontal overshoot or undershoot.
    // A rare mistake adds a fixed beat; the rest of that sequence is sped up so the total stays partnerSequenceMs.
    partnerControl: {
        startDelay: [0.06, 0.16],
        pauseChance: 0.6,
        dragPauseChance: 0.35,
        pauseLength: [0.06, 0.11],
        overshootChance: 0.34,
        undershootChance: 0.28,
        overshoot: [0.04, 0.08],
        undershoot: [0.05, 0.12],
        correctLength: [0.1, 0.16],
        mistakeChance: 0.18,
        mistakeMs: 700
    },
    snapDistancePx: 100,
    grabDistancePx: 100,
    partnerStartOffsetPx: 170,
    wanderRadiusPx: 60,
    wanderPauseMs: [1500, 3000],
    wanderChance: 0.3,
    iconHeightPx: 300,
    edgeMarginPx: 100,
    keyBarHeight: 78,
    medalHeightPx: 150,
    rewardMoveMs: 500,
    rewardHoldMs: 1400,
    rewardAbsorbMs: 780,
    // Matches the score-flash-gain duration. The counter turns green during the flight and is back to normal as the screen moves on.
    rewardFlashMs: 900,
    // Matches score-flash-loss. The offer stays up long enough to see the total drop after a rejection.
    rejectCostFlashMs: 900,
    fadeMs: 400,
    failMoveMs: 650,
    failHoldMs: 1700,
    failClockScale: 2.5,
    timeoutFlashMs: 2500,

    colors: {
        button: "#f4d36a",
        buttonStroke: "#b8860b",
        ink: "#1c1c1c",
        ladderGlow: "#ffd25a",
        mask: "#000000",
        failRed: "#d10c0c",
        previewBox: "#ffffff99",
        labelPill: "#000000",
        selectStroke: "#6495ed"
    },

    // Practice-trial captions. Adapted from the Scannimals partner speech bubble.
    speechBubble: {
        tipGap: 16,
        dimOpacity: 0.2,
        fill: "#faf8eb",
        fillOpacity: 0.92,
        stroke: "#4b5563",
        strokeWidth: 3,
        cornerRadius: 28,
        textColor: "#1e3a5f",
        fontSize: 32,
        maxWidth: 620,
        minWidth: 280,
        paddingX: 28,
        paddingY: 22,
        triangleBase: 36,
        triangleDepth: 28,
        buttonWidth: 320,
        buttonHeight: 70,
        buttonGap: 22,
        fadeTime: 280,
        edgeMargin: 24,
        highlightFilter: "brightness(1.18) drop-shadow(0px 0px 6px #fff6b0) drop-shadow(0px 0px 18px #ffe566) drop-shadow(0px 0px 42px rgba(255, 196, 0, 1))"
    },

    // Sun path shown between trials. baselineY is the horizon the icons and the bar share.
    dayClock: {
        advanceMs: 1000,
        sunsetHoldMs: 1000,
        baselineY: 580,
        arcWidth: 720,
        arcRise: 140,
        arcStrokeWidth: 8,
        // Pull the arc in from each end of the bar so the round caps stay inside it.
        arcInset: 8,
        barHeight: 22,
        iconSize: 136,
        iconGap: 68,
        sunRadius: 25,
        rayInner: 31,
        rayOuter: 48,
        rayHalf: 6,
        captionGap: 72,
        captionSize: 40,
        barTrack: "#f4ecdf",
        barStroke: "#e0d0b4",
        progressStart: "#ffe08a",
        progressMid: "#b7dff2",
        progressEnd: "#ef8f38",
        arc: "#d0d0d0",
        sunFill: "#ffd23a",
        sunStroke: "#e09a14",
        sunRim: "#fffaf0",
        sunRay: "#f0b429",
        sunHighlight: "#fff6c2",
        sunriseSky: "#fff3c9",
        sunriseGround: "#9dbf70",
        sunriseBand: "#86a85c",
        sunriseRay: "#f0b429",
        sunriseSun: "#ffd23a",
        sunriseSunStroke: "#e09a14",
        sunriseFrame: "#ead9a6",
        sunsetSky: "#ffcba3",
        sunsetGround: "#6e8c56",
        sunsetBand: "#5e7848",
        sunsetRay: "#e36b2c",
        sunsetSun: "#f07828",
        sunsetSunStroke: "#d26516",
        sunsetFrame: "#f0c09a"
    }
};

const SVG_NS = "http://www.w3.org/2000/svg";

function el(name, attrs) {
    const node = document.createElementNS(SVG_NS, name);
    if (attrs) {
        Object.keys(attrs).forEach((key) => {
            if (attrs[key] !== undefined && attrs[key] !== null) node.setAttribute(key, attrs[key]);
        });
    }
    return node;
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function tween(ms, frame, keepGoing) {
    return new Promise((resolve) => {
        const t0 = performance.now();
        function step(now) {
            if (keepGoing && !keepGoing()) return resolve();
            const t = ms <= 0 ? 1 : Math.min(1, (now - t0) / ms);
            frame(t);
            if (t < 1) requestAnimationFrame(step);
            else resolve();
        }
        requestAnimationFrame(step);
    });
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpHex(from, to, t) {
    const channel = (hex, index) => parseInt(hex.slice(index, index + 2), 16);
    const mixed = [1, 3, 5].map((index) => Math.round(channel(from, index) + (channel(to, index) - channel(from, index)) * t));
    return "#" + mixed.map((value) => value.toString(16).padStart(2, "0")).join("");
}

function uniform(min, max) {
    return min + Math.random() * (max - min);
}

function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const swap = copy[i];
        copy[i] = copy[j];
        copy[j] = swap;
    }
    return copy;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

async function loadSvgDocument(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not load " + url);
    const doc = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
    if (doc.querySelector("parsererror")) throw new Error("Could not parse " + url);
    return doc;
}

function cloneSvgById(doc, id) {
    const node = doc.getElementById(id);
    if (!node) throw new Error("Missing SVG element #" + id);
    const clone = document.importNode(node, true);
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((child) => child.removeAttribute("id"));
    return clone;
}

function placeByHeight(node, cx, cy, height) {
    const box = node.getBBox();
    const scale = height / box.height;
    const bx = box.x + box.width / 2;
    const by = box.y + box.height / 2;
    node.setAttribute("transform", "translate(" + cx + " " + cy + ") scale(" + scale + ") translate(" + (-bx) + " " + (-by) + ")");
}

function fitInBox(node, x, y, width, height, pad) {
    const box = node.getBBox();
    const scale = Math.min((width - pad) / box.width, (height - pad) / box.height);
    const bx = box.x + box.width / 2;
    const by = box.y + box.height / 2;
    const cx = x + width / 2;
    const cy = y + height / 2;
    node.setAttribute("transform", "translate(" + cx + " " + cy + ") scale(" + scale + ") translate(" + (-bx) + " " + (-by) + ")");
}

function centerText(text, x, y, size, className) {
    const node = el("text", { x: x, y: y, class: className || "center-copy" });
    node.textContent = text;
    node.setAttribute("text-anchor", "middle");
    node.setAttribute("dominant-baseline", "central");
    node.setAttribute("font-size", size);
    return node;
}

function wrapTextLines(parent, text, fontSize, maxWidth, className) {
    const probe = el("text", { "font-size": fontSize, visibility: "hidden" });
    if (className) probe.setAttribute("class", className);
    parent.appendChild(probe);
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    words.forEach((word) => {
        const candidate = line ? line + " " + word : word;
        probe.textContent = candidate;
        if (line && probe.getComputedTextLength() > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    });
    if (line) lines.push(line);
    probe.remove();
    return lines;
}

function leftTextBlock(lines, x, y, fontSize, leading, className) {
    const group = el("g");
    lines.forEach((line, index) => {
        const node = el("text", { x: x, y: y + index * leading, "font-size": fontSize, class: className || "left-copy" });
        node.setAttribute("dominant-baseline", "central");
        node.textContent = line;
        group.appendChild(node);
    });
    return group;
}

function drawWrappedParagraphs(parent, paragraphs, x, y, maxWidth, fontSize, leading, paragraphGap, className) {
    let baseline = y;
    paragraphs.forEach((paragraph, index) => {
        const lines = wrapTextLines(parent, paragraph, fontSize, maxWidth);
        if (!lines.length) return;
        parent.appendChild(leftTextBlock(lines, x, baseline, fontSize, leading, className));
        baseline += (lines.length - 1) * leading;
        if (index < paragraphs.length - 1) baseline += leading + paragraphGap;
    });
    return baseline + fontSize / 2;
}

function makeTextArea(x, y, width, height, onInput, label) {
    const frame = el("foreignObject", {
        x: x,
        y: y,
        width: width,
        height: height,
        class: "open-answer-frame"
    });
    const field = document.createElementNS("http://www.w3.org/1999/xhtml", "textarea");
    field.className = "open-answer";
    if (label) field.setAttribute("aria-label", label);
    field.addEventListener("input", () => onInput(field.value));
    frame.appendChild(field);
    return frame;
}

// Small point token for the Reject button. Drawn directly so the amount stays readable at button size.
function makeRejectCostIcon(amount) {
    const group = el("g", { class: "reject-cost-icon" });
    group.appendChild(el("circle", {
        cx: 0,
        cy: 0,
        r: 28,
        fill: "#f3b2a8",
        stroke: "#8a3028",
        "stroke-width": 3
    }));
    group.appendChild(el("circle", {
        cx: 0,
        cy: 0,
        r: 21,
        fill: "#d6453c"
    }));
    const label = centerText("-" + amount, 0, 1, 28, "reject-cost-label");
    label.style.pointerEvents = "none";
    group.appendChild(label);
    return group;
}

// Puts an icon on the right side of a button label and keeps the pair centered.
function placeButtonIcon(button, icon, height, gap) {
    const label = button.querySelector(".ui-button-label");
    const face = button.querySelector(".ui-button-face");
    const width = Number(face.getAttribute("width"));
    const faceX = Number(face.getAttribute("x"));
    const faceY = Number(face.getAttribute("y"));
    const faceH = Number(face.getAttribute("height"));
    icon.style.pointerEvents = "none";
    button.appendChild(icon);

    const token = icon.querySelector(".reject-cost-label");
    const plate = icon.querySelector("path");
    if (token && plate) {
        const plateBox = plate.getBBox();
        token.setAttribute("x", plateBox.x + plateBox.width / 2);
        token.setAttribute("y", plateBox.y + plateBox.height / 2);
    }

    const raw = icon.getBBox();
    let iconH = height;
    const textW = label.getComputedTextLength();
    let iconW = raw.height > 0 ? raw.width * (iconH / raw.height) : height;
    const available = width - 36;
    if (textW + gap + iconW > available && raw.width > 0) {
        iconW = Math.max(32, available - gap - textW);
        iconH = iconW * (raw.height / raw.width);
    }
    const total = textW + gap + iconW;
    const left = faceX + (width - total) / 2;
    label.setAttribute("x", left + textW / 2);
    placeByHeight(icon, left + textW + gap + iconW / 2, faceY + faceH / 2, iconH);
}

function makeButton(label, cx, cy, width, height, onPress) {
    const group = el("g", { class: "ui-button" });
    group.appendChild(el("rect", {
        x: cx - width / 2,
        y: cy - height / 2,
        width: width,
        height: height,
        rx: 18,
        class: "ui-button-face"
    }));
    const text = centerText(label, cx, cy, Math.round(height * 0.42), "ui-button-label");
    text.style.pointerEvents = "none";
    group.appendChild(text);
    group.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        onPress();
    });
    return group;
}

function makeKeyCap(label, cx, cy, width, height) {
    const group = el("g", { class: "hat_drop_key" });
    const lip = el("rect", {
        x: cx - width / 2,
        y: cy - height / 2 + 5,
        width: width,
        height: height,
        rx: 14,
        fill: "#cfc8b8",
        stroke: "#4b5563",
        "stroke-width": 4,
        class: "hat_drop_key_lip"
    });
    const face = el("rect", {
        x: cx - width / 2,
        y: cy - height / 2 - 2,
        width: width,
        height: height,
        rx: 14,
        fill: "#f4efe4",
        stroke: "#4b5563",
        "stroke-width": 4,
        class: "hat_drop_key_face"
    });
    const glyph = centerText(label, cx, cy - 2, width >= 140 ? 22 : 28, "hat_drop_key_glyph");
    glyph.style.pointerEvents = "none";
    group.append(lip, face, glyph);
    group._face = face;
    group._lip = lip;
    group._glyph = glyph;
    group._faceY = cy - height / 2 - 2;
    group._lipY = cy - height / 2 + 5;
    group._glyphY = cy - 2;
    group._pressed = false;
    return group;
}

function setKeyCapPressed(group, pressed) {
    if (!group || group._pressed === pressed) return;
    group._pressed = pressed;
    const dy = pressed ? 7 : 0;
    group._face.setAttribute("y", group._faceY + dy);
    group._lip.setAttribute("y", group._lipY + dy);
    group._glyph.setAttribute("y", group._glyphY + dy);
    group.classList.toggle("is-pressed", pressed);
}

function makeWindIcon() {
    const group = el("g", { class: "wind-icon" });
    const strokes = [
        { d: "M 8 28 C 26 28 30 4 48 4 C 62 4 68 22 80 22", width: 5.5 },
        { d: "M 2 54 C 26 54 32 26 54 26 C 72 26 80 48 96 48", width: 6 },
        { d: "M 14 80 C 34 80 40 56 58 56 C 72 56 78 74 90 74", width: 5.5 }
    ];
    strokes.forEach((line) => {
        group.appendChild(el("path", {
            d: line.d,
            fill: "none",
            stroke: "#767c82",
            "stroke-width": line.width,
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        }));
    });
    return group;
}

function spawnSparkles(parent, cx, cy) {
    const bursts = [
        { dx: -90, dy: -80, delay: 0, scale: 2.2 },
        { dx: 100, dy: -30, delay: 160, scale: 1.6 },
        { dx: -40, dy: 90, delay: 320, scale: 1.9 }
    ];
    bursts.forEach((burst) => {
        setTimeout(() => {
            const sparkle = el("path", {
                d: "M 0 -30 Q 0 0 30 0 Q 0 0 0 30 Q 0 0 -30 0 Q 0 0 0 -30 Z",
                fill: "gold",
                stroke: "white",
                "stroke-width": 3
            });
            const x = cx + burst.dx;
            const y = cy + burst.dy;
            sparkle.style.transformBox = "fill-box";
            sparkle.style.transformOrigin = "center";
            sparkle.style.transform = "translate(" + x + "px, " + y + "px) scale(0) rotate(-45deg)";
            parent.appendChild(sparkle);
            setTimeout(() => {
                sparkle.style.transition = "transform 420ms cubic-bezier(0.175, 0.885, 0.32, 1.275)";
                sparkle.style.transform = "translate(" + x + "px, " + y + "px) scale(" + burst.scale + ") rotate(135deg)";
            }, 20);
            setTimeout(() => {
                sparkle.style.transition = "transform 500ms linear, opacity 400ms ease-in";
                sparkle.style.transform = "translate(" + x + "px, " + y + "px) scale(0) rotate(300deg)";
                sparkle.style.opacity = "0";
                setTimeout(() => sparkle.remove(), 420);
            }, 700);
        }, burst.delay);
    });
}
