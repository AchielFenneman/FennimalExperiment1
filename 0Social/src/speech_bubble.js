// Pointing caption used by the practice trial.
// Layout and look follow the Scannimals partner speech bubble.

class SpeechBubble {
    constructor(svg) {
        this.svg = svg;
        this.root = null;
        this.targetElement = null;
        this.targetPrevFilter = "";
        this.resolveConfirm = null;
    }

    show({ target, text, buttonLabel = "Continue", dimOpacity = null, preferredSide = null, tipGap = null, hideButton = false, passThrough = false, highlight = true } = {}) {
        this.hide(true);
        const p = GenParam.speechBubble;
        const blockInput = !hideButton && !passThrough;

        return new Promise((resolve) => {
            this.resolveConfirm = resolve;
            const parent = this.svg;
            if (!parent) {
                this.resolveConfirm = null;
                resolve();
                return;
            }

            let layout;
            if (target) {
                this.targetElement = target;
                if (highlight) {
                    this.targetPrevFilter = target.style.filter || "";
                    target.style.filter = p.highlightFilter;
                }
                layout = this.computeLayout(svgAnchor(target), text, p, {
                    preferredSide: preferredSide,
                    tipGap: tipGap,
                    hideButton: hideButton
                });
            } else {
                layout = this.computeCenteredLayout(text, p, { hideButton: hideButton });
            }

            this.root = el("g", { class: "speech-bubble" });
            this.root.style.opacity = "0";
            this.root.style.transition = "opacity " + (p.fadeTime || 280) + "ms ease-in-out";
            this.root.style.pointerEvents = blockInput ? "auto" : "none";
            this.root.setAttribute("pointer-events", blockInput ? "auto" : "none");

            const dim = el("rect", {
                x: 0,
                y: 0,
                width: GenParam.screen.width,
                height: GenParam.screen.height,
                class: "speech-bubble-dim"
            });
            const dimAmt = dimOpacity != null ? dimOpacity : (p.dimOpacity != null ? p.dimOpacity : 0.2);
            dim.style.fill = "rgba(0,0,0," + dimAmt + ")";
            dim.style.pointerEvents = blockInput ? "all" : "none";
            dim.setAttribute("pointer-events", blockInput ? "all" : "none");
            this.root.appendChild(dim);

            const bubbleGroup = el("g", { class: "speech-bubble-group" });
            bubbleGroup.style.filter = "drop-shadow(0px 10px 18px rgba(0,0,0,0.18))";
            bubbleGroup.style.pointerEvents = blockInput ? "auto" : "none";
            bubbleGroup.setAttribute("pointer-events", blockInput ? "auto" : "none");

            const body = el("rect", {
                x: layout.bubbleX,
                y: layout.bubbleY,
                width: layout.bubbleW,
                height: layout.bubbleH,
                rx: p.cornerRadius || 28,
                ry: p.cornerRadius || 28,
                class: "speech-bubble-body"
            });
            body.style.fill = p.fill || "#faf8eb";
            body.style.fillOpacity = p.fillOpacity != null ? p.fillOpacity : 0.92;
            body.style.stroke = p.stroke || "#4b5563";
            body.style.strokeWidth = (p.strokeWidth || 3) + "px";
            bubbleGroup.appendChild(body);

            if (layout.trianglePoints) {
                const triangle = el("polygon", {
                    points: layout.trianglePoints,
                    class: "speech-bubble-triangle"
                });
                triangle.style.fill = p.fill || "#faf8eb";
                triangle.style.fillOpacity = p.fillOpacity != null ? p.fillOpacity : 0.92;
                triangle.style.stroke = p.stroke || "#4b5563";
                triangle.style.strokeWidth = (p.strokeWidth || 3) + "px";
                triangle.style.strokeLinejoin = "round";
                bubbleGroup.appendChild(triangle);
                bubbleGroup.appendChild(body);
            }

            const padX = p.paddingX || 28;
            const padY = p.paddingY || 22;
            const fo = el("foreignObject", {
                x: layout.bubbleX + padX,
                y: layout.bubbleY + padY,
                width: Math.max(1, layout.bubbleW - 2 * padX),
                height: Math.max(1, layout.bubbleH - 2 * padY)
            });
            fo.style.pointerEvents = "none";
            fo.setAttribute("pointer-events", "none");
            const textDiv = document.createElement("div");
            textDiv.className = "speech-bubble-text";
            textDiv.style.fontSize = layout.fontSize + "px";
            textDiv.style.color = p.textColor || "#1e3a5f";
            textDiv.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
            textDiv.style.fontWeight = "600";
            textDiv.style.lineHeight = "1.35";
            textDiv.style.textAlign = "center";
            textDiv.style.display = "flex";
            textDiv.style.alignItems = "center";
            textDiv.style.justifyContent = "center";
            textDiv.style.height = "100%";
            textDiv.style.width = "100%";
            textDiv.style.pointerEvents = "none";
            textDiv.textContent = text;
            fo.appendChild(textDiv);
            bubbleGroup.appendChild(fo);
            this.root.appendChild(bubbleGroup);

            if (!hideButton) {
                const button = makeButton(
                    buttonLabel,
                    layout.buttonCenterX,
                    layout.buttonCenterY,
                    p.buttonWidth || 320,
                    p.buttonHeight || 70,
                    () => this.confirm()
                );
                this.root.appendChild(button);
            }

            parent.appendChild(this.root);
            void this.root.getBoundingClientRect();
            this.root.style.opacity = "1";
        });
    }

    confirm() {
        const done = this.resolveConfirm;
        this.resolveConfirm = null;
        this.hide(false, done);
    }

    hide(immediate, onDone) {
        if (this.targetElement) {
            this.targetElement.style.filter = this.targetPrevFilter || "";
            this.targetElement = null;
            this.targetPrevFilter = "";
        }
        if (!this.root) {
            if (onDone) onDone();
            return;
        }

        const root = this.root;
        this.root = null;
        const fade = immediate ? 0 : (GenParam.speechBubble.fadeTime || 280);
        if (fade <= 0) {
            root.remove();
            if (onDone) onDone();
            return;
        }

        root.style.transition = "opacity " + fade + "ms ease-in-out";
        root.style.opacity = "0";
        setTimeout(() => {
            root.remove();
            if (onDone) onDone();
        }, fade);
    }

    measureTextSize(text, fontSize, maxWidth) {
        const probe = document.createElement("div");
        probe.style.position = "absolute";
        probe.style.left = "-9999px";
        probe.style.top = "0";
        probe.style.maxWidth = maxWidth + "px";
        probe.style.width = "max-content";
        probe.style.fontSize = fontSize + "px";
        probe.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
        probe.style.fontWeight = "600";
        probe.style.lineHeight = "1.35";
        probe.style.textAlign = "center";
        probe.textContent = text;
        document.body.appendChild(probe);
        const bounds = probe.getBoundingClientRect();
        probe.remove();
        return {
            width: Math.min(maxWidth, Math.max(Math.ceil(bounds.width), 120)),
            height: Math.max(Math.ceil(bounds.height) + 4, fontSize * 1.4)
        };
    }

    computeCenteredLayout(text, p, opts) {
        const width = GenParam.screen.width;
        const height = GenParam.screen.height;
        const margin = p.edgeMargin != null ? p.edgeMargin : 24;
        const padX = p.paddingX || 28;
        const padY = p.paddingY || 22;
        const hideButton = !!opts.hideButton;
        const buttonW = hideButton ? 0 : (p.buttonWidth || 320);
        const buttonH = hideButton ? 0 : (p.buttonHeight || 70);
        const buttonGap = hideButton ? 0 : (p.buttonGap || 22);
        const fontSize = p.fontSize || 32;
        const maxWidth = p.maxWidth || 520;
        const minWidth = p.minWidth || 280;
        const textSize = this.measureTextSize(text, fontSize, maxWidth - 2 * padX);
        const bubbleW = Math.max(minWidth, Math.min(maxWidth, textSize.width + 2 * padX));
        const bubbleH = textSize.height + 2 * padY;
        const totalH = bubbleH + buttonGap + buttonH;
        const bubbleX = Math.max(margin, (width - bubbleW) / 2);
        const bubbleY = Math.max(margin, (height - totalH) / 2);
        return {
            bubbleX: bubbleX,
            bubbleY: bubbleY,
            bubbleW: bubbleW,
            bubbleH: bubbleH,
            trianglePoints: null,
            buttonCenterX: bubbleX + 0.5 * bubbleW,
            buttonCenterY: bubbleY + bubbleH + buttonGap + 0.5 * buttonH,
            fontSize: fontSize,
            fits: true
        };
    }

    computeLayout(anchor, text, p, opts) {
        const width = GenParam.screen.width;
        const height = GenParam.screen.height;
        const tipGap = opts.tipGap != null ? opts.tipGap : (p.tipGap != null ? p.tipGap : 16);
        const margin = p.edgeMargin != null ? p.edgeMargin : 24;
        const padX = p.paddingX || 28;
        const padY = p.paddingY || 22;
        const hideButton = !!opts.hideButton;
        const buttonW = hideButton ? 0 : (p.buttonWidth || 320);
        const buttonH = hideButton ? 0 : (p.buttonHeight || 70);
        const buttonGap = hideButton ? 0 : (p.buttonGap || 22);
        const triBase = p.triangleBase || 36;
        const triDepth = p.triangleDepth || 28;
        let fontSize = p.fontSize || 32;
        const maxWidth = p.maxWidth || 520;
        const minWidth = p.minWidth || 280;
        let textSize = this.measureTextSize(text, fontSize, maxWidth - 2 * padX);
        let bubbleW = Math.max(minWidth, Math.min(maxWidth, textSize.width + 2 * padX));
        let bubbleH = textSize.height + 2 * padY;

        for (let shrink = 0; shrink < 8; shrink++) {
            const sides = this.rankSides(anchor, tipGap, margin, width, height, opts.preferredSide);
            let chosen = null;
            for (let i = 0; i < sides.length; i++) {
                const side = sides[i];
                const needed = side.id === "left" || side.id === "right"
                    ? bubbleW + triDepth + buttonH + buttonGap
                    : bubbleH + triDepth + buttonH + buttonGap;
                if (side.free >= needed) {
                    chosen = side;
                    break;
                }
            }
            if (!chosen) chosen = sides[0];
            const layout = this.layoutForSide(chosen.id, anchor, tipGap, bubbleW, bubbleH, triBase, triDepth, buttonW, buttonH, buttonGap, margin, width, height, fontSize);
            if (layout.fits || shrink === 7) return layout;
            bubbleW = Math.max(minWidth, bubbleW * 0.9);
            bubbleH = Math.max(fontSize * 2 + 2 * padY, bubbleH * 0.92);
            fontSize = Math.max(22, fontSize - 2);
            textSize = this.measureTextSize(text, fontSize, bubbleW - 2 * padX);
            bubbleH = Math.max(bubbleH, textSize.height + 2 * padY);
        }

        return this.layoutForSide("left", anchor, tipGap, bubbleW, bubbleH, triBase, triDepth, buttonW, buttonH, buttonGap, margin, width, height, fontSize);
    }

    rankSides(anchor, tipGap, margin, width, height, preferredSide) {
        const sides = [
            { id: "left", free: anchor.x - anchor.halfW - tipGap - margin, tie: 0 },
            { id: "right", free: width - (anchor.x + anchor.halfW + tipGap) - margin, tie: 1 },
            { id: "up", free: anchor.y - anchor.halfH - tipGap - margin, tie: 2 },
            { id: "down", free: height - (anchor.y + anchor.halfH + tipGap) - margin, tie: 3 }
        ];
        sides.sort((a, b) => {
            if (preferredSide) {
                if (a.id === preferredSide && b.id !== preferredSide) return -1;
                if (b.id === preferredSide && a.id !== preferredSide) return 1;
            }
            if (b.free !== a.free) return b.free - a.free;
            return a.tie - b.tie;
        });
        return sides;
    }

    layoutForSide(side, anchor, tipGap, bubbleW, bubbleH, triBase, triDepth, buttonW, buttonH, buttonGap, margin, width, height, fontSize) {
        let tipX = anchor.x;
        let tipY = anchor.y;
        let bubbleX;
        let bubbleY;
        let trianglePoints;

        if (side === "left") {
            tipX = anchor.x - anchor.halfW - tipGap;
            bubbleX = tipX - triDepth - bubbleW;
            bubbleY = tipY - 0.5 * bubbleH;
            trianglePoints = tipX + "," + tipY + " " + (tipX - triDepth) + "," + (tipY - 0.5 * triBase) + " " + (tipX - triDepth) + "," + (tipY + 0.5 * triBase);
        } else if (side === "right") {
            tipX = anchor.x + anchor.halfW + tipGap;
            bubbleX = tipX + triDepth;
            bubbleY = tipY - 0.5 * bubbleH;
            trianglePoints = tipX + "," + tipY + " " + (tipX + triDepth) + "," + (tipY - 0.5 * triBase) + " " + (tipX + triDepth) + "," + (tipY + 0.5 * triBase);
        } else if (side === "up") {
            tipY = anchor.y - anchor.halfH - tipGap;
            bubbleX = tipX - 0.5 * bubbleW;
            bubbleY = tipY - triDepth - bubbleH;
            trianglePoints = tipX + "," + tipY + " " + (tipX - 0.5 * triBase) + "," + (tipY - triDepth) + " " + (tipX + 0.5 * triBase) + "," + (tipY - triDepth);
        } else {
            tipY = anchor.y + anchor.halfH + tipGap;
            bubbleX = tipX - 0.5 * bubbleW;
            bubbleY = tipY + triDepth;
            trianglePoints = tipX + "," + tipY + " " + (tipX - 0.5 * triBase) + "," + (tipY + triDepth) + " " + (tipX + 0.5 * triBase) + "," + (tipY + triDepth);
        }

        bubbleX = Math.max(margin, Math.min(bubbleX, width - margin - bubbleW));
        if (side === "up") bubbleY = Math.max(margin + buttonH + buttonGap, Math.min(bubbleY, height - margin - bubbleH));
        else bubbleY = Math.max(margin, Math.min(bubbleY, height - margin - bubbleH - buttonH - buttonGap));

        let buttonCenterX = bubbleX + 0.5 * bubbleW;
        let buttonCenterY = side === "up"
            ? bubbleY - buttonGap - 0.5 * buttonH
            : bubbleY + bubbleH + buttonGap + 0.5 * buttonH;
        buttonCenterX = Math.max(margin + 0.5 * buttonW, Math.min(buttonCenterX, width - margin - 0.5 * buttonW));
        buttonCenterY = Math.max(margin + 0.5 * buttonH, Math.min(buttonCenterY, height - margin - 0.5 * buttonH));

        const fits = bubbleX >= margin - 1
            && bubbleY >= margin - 1
            && bubbleX + bubbleW <= width - margin + 1
            && buttonCenterY - 0.5 * buttonH >= margin - 1
            && buttonCenterY + 0.5 * buttonH <= height - margin + 1;

        return {
            bubbleX: bubbleX,
            bubbleY: bubbleY,
            bubbleW: bubbleW,
            bubbleH: bubbleH,
            trianglePoints: trianglePoints,
            buttonCenterX: buttonCenterX,
            buttonCenterY: buttonCenterY,
            fontSize: fontSize,
            fits: fits
        };
    }
}

function svgAnchor(node) {
    const svg = node.ownerSVGElement;
    const bounds = node.getBoundingClientRect();
    const matrix = svg && svg.getScreenCTM();
    if (!svg || !matrix || (bounds.width === 0 && bounds.height === 0)) {
        return { x: GenParam.screen.width / 2, y: GenParam.screen.height / 2, halfW: 0, halfH: 0 };
    }
    const local = (x, y) => {
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        return point.matrixTransform(matrix.inverse());
    };
    const corners = [local(bounds.left, bounds.top), local(bounds.right, bounds.bottom)];
    const minX = Math.min(corners[0].x, corners[1].x);
    const maxX = Math.max(corners[0].x, corners[1].x);
    const minY = Math.min(corners[0].y, corners[1].y);
    const maxY = Math.max(corners[0].y, corners[1].y);
    return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        halfW: (maxX - minX) / 2,
        halfH: (maxY - minY) / 2
    };
}
