// Directs the session: character creation, partner introduction, instructions, the day between offers, the point total, and the closing questions.
// Session records are written by DataController in data_storage.js.

class IconFactory {
    constructor(playerDoc) {
        this.playerDoc = playerDoc;
    }

    create(gender, pose, colors) {
        const source = this.playerDoc.getElementById("icon_player_" + gender + "_" + pose);
        if (!source) throw new Error("Missing icon icon_player_" + gender + "_" + pose);
        const clone = document.importNode(source, true);
        clone.removeAttribute("id");
        clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
        Object.keys(colors).forEach((key) => {
            clone.querySelectorAll("." + key).forEach((node) => {
                node.style.fill = colors[key];
            });
        });
        return clone;
    }
}

// Icon art is drawn on a 120-unit grid. The horizon sits at y = 82.
const DAY_ICON_UNIT = 120;
const DAY_ICON_HORIZON = 82;

function rayTriangle(angle, inner, outer, half) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const px = Math.cos(angle + Math.PI / 2) * half;
    const py = Math.sin(angle + Math.PI / 2) * half;
    const baseX = cos * inner;
    const baseY = sin * inner;
    return "M " + (baseX + px) + " " + (baseY + py) +
        " L " + (cos * outer) + " " + (sin * outer) +
        " L " + (baseX - px) + " " + (baseY - py) + " Z";
}

class DayClock {
    constructor(parent) {
        const spec = GenParam.dayClock;
        const icon = spec.iconSize;
        const gap = spec.iconGap;
        const total = icon + gap + spec.arcWidth + gap + icon;
        const left = (GenParam.screen.width - total) / 2;

        this.x0 = left + icon + gap;
        this.x1 = this.x0 + spec.arcWidth;
        this.baseline = spec.baselineY;
        this.rise = spec.arcRise;
        this.barX = this.x0;
        this.barY = this.baseline - spec.barHeight / 2;
        this.barW = spec.arcWidth;
        this.barH = spec.barHeight;
        this.progress = 0;

        this.group = el("g", { id: "day-clock" });
        parent.appendChild(this.group);

        const scale = icon / DAY_ICON_UNIT;
        this.captionY = this.baseline + (DAY_ICON_UNIT - DAY_ICON_HORIZON) * scale + spec.captionGap;

        this.group.appendChild(this.makeEndIcon("sunrise", left));
        this.group.appendChild(this.makeEndIcon("sunset", this.x1 + gap));
        this.group.appendChild(this.makeArc());
        this.makeBar();
        this.sun = this.makeSun();
        this.group.appendChild(this.sun);
        this.setProgress(0);
    }

    // Quadratic arch. The control point is twice the peak, so the sun reaches `rise` at midday.
    arcPoint(t) {
        const height = this.rise * 2;
        return {
            x: lerp(this.x0, this.x1, t),
            y: this.baseline - 2 * t * (1 - t) * height
        };
    }

    makeArc() {
        const spec = GenParam.dayClock;
        const inset = spec.arcInset;
        const x0 = this.x0 + inset;
        const x1 = this.x1 - inset;
        const mid = (x0 + x1) / 2;
        const controlY = this.baseline - this.rise * 2;
        return el("path", {
            d: "M " + x0 + " " + this.baseline + " Q " + mid + " " + controlY + " " + x1 + " " + this.baseline,
            fill: "none",
            stroke: spec.arc,
            "stroke-width": spec.arcStrokeWidth,
            "stroke-linecap": "round",
            class: "day-arc"
        });
    }

    makeBar() {
        const spec = GenParam.dayClock;
        const defs = el("defs");
        const gradient = el("linearGradient", {
            id: "day-bar-gradient",
            gradientUnits: "userSpaceOnUse",
            x1: this.barX,
            y1: 0,
            x2: this.barX + this.barW,
            y2: 0
        });
        gradient.appendChild(el("stop", { offset: "0%", "stop-color": spec.progressStart }));
        gradient.appendChild(el("stop", { offset: "32%", "stop-color": spec.progressMid }));
        gradient.appendChild(el("stop", { offset: "68%", "stop-color": spec.progressMid }));
        gradient.appendChild(el("stop", { offset: "100%", "stop-color": spec.progressEnd }));
        defs.appendChild(gradient);
        this.group.appendChild(defs);

        this.group.appendChild(el("rect", {
            x: this.barX,
            y: this.barY,
            width: this.barW,
            height: this.barH,
            rx: this.barH / 2,
            fill: spec.barTrack,
            class: "day-bar"
        }));
        this.barFill = el("rect", {
            x: this.barX,
            y: this.barY,
            width: 0,
            height: this.barH,
            rx: this.barH / 2,
            fill: "url(#day-bar-gradient)"
        });
        this.group.appendChild(this.barFill);
        this.group.appendChild(el("rect", {
            x: this.barX,
            y: this.barY,
            width: this.barW,
            height: this.barH,
            rx: this.barH / 2,
            fill: "none",
            stroke: spec.barStroke,
            "stroke-width": 2
        }));
    }

    makeSun() {
        const spec = GenParam.dayClock;
        const sun = el("g", { class: "day-sun" });
        for (let i = 0; i < 8; i++) {
            const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 8;
            sun.appendChild(el("path", {
                d: rayTriangle(angle, spec.rayInner, spec.rayOuter, spec.rayHalf),
                fill: spec.sunRay
            }));
        }
        sun.appendChild(el("circle", { r: spec.sunRadius + 3, fill: spec.sunRim }));
        sun.appendChild(el("circle", {
            r: spec.sunRadius,
            fill: spec.sunFill,
            stroke: spec.sunStroke,
            "stroke-width": 2.5
        }));
        sun.appendChild(el("circle", {
            cx: -spec.sunRadius * 0.28,
            cy: -spec.sunRadius * 0.32,
            r: spec.sunRadius * 0.22,
            fill: spec.sunHighlight
        }));
        return sun;
    }

    makeEndIcon(kind, originX) {
        const spec = GenParam.dayClock;
        const rising = kind === "sunrise";
        const scale = spec.iconSize / DAY_ICON_UNIT;
        const originY = this.baseline - DAY_ICON_HORIZON * scale;
        const size = spec.iconSize;
        const u = (unit) => unit * scale;
        const clipId = "day-icon-" + kind;

        const wrap = el("g", { class: "day-end-icon" });
        const defs = el("defs");
        const clip = el("clipPath", { id: clipId, clipPathUnits: "userSpaceOnUse" });
        clip.appendChild(el("rect", {
            x: originX,
            y: originY,
            width: size,
            height: size,
            rx: size * 0.22
        }));
        defs.appendChild(clip);
        wrap.appendChild(defs);

        const art = el("g", { "clip-path": "url(#" + clipId + ")" });
        art.appendChild(el("rect", {
            x: originX,
            y: originY,
            width: size,
            height: size,
            fill: rising ? spec.sunriseSky : spec.sunsetSky
        }));

        const sunR = u(rising ? 22 : 23);
        const sunCx = originX + u(60);
        const sunCy = originY + u(rising ? 60 : 90);
        const rayCount = 7;
        for (let i = 0; i < rayCount; i++) {
            const angle = Math.PI + (Math.PI * i) / (rayCount - 1);
            const inner = sunR + u(4);
            const outer = sunR + u(rising ? 16 : 13);
            art.appendChild(el("line", {
                x1: sunCx + Math.cos(angle) * inner,
                y1: sunCy + Math.sin(angle) * inner,
                x2: sunCx + Math.cos(angle) * outer,
                y2: sunCy + Math.sin(angle) * outer,
                stroke: rising ? spec.sunriseRay : spec.sunsetRay,
                "stroke-width": 3.5,
                "stroke-linecap": "round"
            }));
        }
        art.appendChild(el("circle", {
            cx: sunCx,
            cy: sunCy,
            r: sunR,
            fill: rising ? spec.sunriseSun : spec.sunsetSun,
            stroke: rising ? spec.sunriseSunStroke : spec.sunsetSunStroke,
            "stroke-width": 2
        }));
        const groundY = originY + u(DAY_ICON_HORIZON);
        art.appendChild(el("rect", {
            x: originX,
            y: groundY,
            width: size,
            height: size - u(DAY_ICON_HORIZON) + 2,
            fill: rising ? spec.sunriseGround : spec.sunsetGround
        }));
        art.appendChild(el("rect", {
            x: originX,
            y: groundY,
            width: size,
            height: u(7),
            fill: rising ? spec.sunriseBand : spec.sunsetBand
        }));
        art.appendChild(this.makeArrow(
            originX + u(98),
            originY + u(30),
            rising,
            rising ? spec.sunriseSunStroke : spec.sunsetSunStroke,
            u(30)
        ));
        wrap.appendChild(art);
        wrap.appendChild(el("rect", {
            x: originX,
            y: originY,
            width: size,
            height: size,
            rx: size * 0.22,
            fill: "none",
            stroke: rising ? spec.sunriseFrame : spec.sunsetFrame,
            "stroke-width": 2.5
        }));
        return wrap;
    }

    makeArrow(cx, cy, pointingUp, color, length) {
        const head = length * 0.46;
        const half = length * 0.34;
        const dir = pointingUp ? -1 : 1;
        const tipY = cy + dir * (length / 2);
        const tailY = cy - dir * (length / 2);
        const neckY = tipY - dir * head;
        const arrow = el("g", { class: "day-arrow" });
        arrow.appendChild(el("line", {
            x1: cx,
            y1: tailY,
            x2: cx,
            y2: neckY,
            stroke: color,
            "stroke-width": Math.max(3, length * 0.16),
            "stroke-linecap": "round"
        }));
        arrow.appendChild(el("path", {
            d: "M " + cx + " " + tipY +
                " L " + (cx - half) + " " + neckY +
                " L " + (cx + half) + " " + neckY + " Z",
            fill: color
        }));
        return arrow;
    }

    setProgress(t) {
        const shown = clamp(t, 0, 1);
        this.progress = shown;
        this.barFill.setAttribute("width", String(this.barW * shown));
        const point = this.arcPoint(shown);
        this.sun.setAttribute("transform", "translate(" + point.x + " " + point.y + ")");
    }

    animateTo(t) {
        const from = this.progress;
        const to = clamp(t, 0, 1);
        if (Math.abs(to - from) < 0.0001) {
            this.setProgress(to);
            return Promise.resolve();
        }
        return tween(GenParam.dayClock.advanceMs, (u) => {
            const eased = u * u * (3 - 2 * u);
            this.setProgress(lerp(from, to, eased));
        });
    }
}

class ExperimentController {
    constructor(svg) {
        this.svg = svg;
        this.dataController = new DataController();
        this.stage = el("g", { id: "stage" });
        this.scoreNode = null;
        this.svg.appendChild(this.stage);
        this.cast = {
            player: { gender: "male", colors: {} },
            partner: { gender: "female", colors: {}, name: "" }
        };
    }

    async start() {
        try {
            this.showMessage("Loading…");
            const helpersReady = await waitForFirebaseSessionHelpers();
            let earlySession = { mode: "anonymous", sessionId: String(Date.now()) };
            if (helpersReady) {
                try {
                    earlySession = await window.resolveParticipantSessionClaim();
                } catch (error) {
                    console.warn("Session claim lookup failed; continuing as a new session", error);
                }
            }
            if (earlySession.mode === "blocked_completed") {
                this.clearStage();
                showStudyCompletedScreen(earlySession.message);
                return;
            }
            await this.dataController.finalizeSession(earlySession);
            await this.loadAssets();
            if (this.dataController.hasRestoredCast()) {
                this.dataController.applyCast(this.cast);
            } else {
                await this.showCharacterCreation();
                await this.dataController.lockCast(this.cast);
            }
            await this.showPartnerIntro();
            await this.showInstructions();
            const blockCount = StimulusSettings.blockCount || 1;
            for (let block = 0; block < blockCount; block++) await this.runBlock(block);
            await this.showEnd();
            const saved = await this.showOpenQuestions();
            this.showMessage(saved
                ? "Thank you. Your responses have been saved."
                : "Thank you. The save did not reach the server. Please leave this page open and contact the researcher.");
        } catch (error) {
            console.error(error);
            this.showMessage(error.message || "Something went wrong.");
        }
    }

    async loadAssets() {
        this.trialDoc = await loadSvgDocument("SVG/Trial_SVG.svg");
        this.playerDoc = await loadSvgDocument("SVG/Player.svg");
        const defs = this.trialDoc.querySelector("defs");
        if (defs) this.svg.insertBefore(document.importNode(defs, true), this.svg.firstChild);
        this.icons = new IconFactory(this.playerDoc);
    }

    clearStage() {
        this.stage.replaceChildren();
    }

    showMessage(text) {
        this.clearStage();
        this.stage.appendChild(centerText(text, GenParam.screen.width / 2, GenParam.screen.height / 2, 40));
    }

    refreshScore() {
        if (this.scoreNode) this.scoreNode.remove();
        this.scoreNode = centerText("Points: " + this.dataController.totalPoints, GenParam.screen.width / 2, 64, 36, "score-label");
        this.svg.appendChild(this.scoreNode);
    }

    showCharacterCreation() {
        this.clearStage();
        return new Promise((resolve) => new CharacterCreation(this, resolve));
    }

    showPartnerIntro() {
        this.clearStage();
        const width = GenParam.screen.width;
        const name = this.cast.partner.name;
        this.stage.appendChild(centerText("Meet " + name, width / 2, 170, 64));

        const box = el("rect", {
            x: width / 2 - 220,
            y: 250,
            width: 440,
            height: 520,
            rx: 40,
            fill: GenParam.colors.previewBox
        });
        this.stage.appendChild(box);

        const icon = this.icons.create(this.cast.partner.gender, "front", this.cast.partner.colors);
        this.stage.appendChild(icon);
        fitInBox(icon, width / 2 - 220, 250, 440, 520, 80);

        this.stage.appendChild(centerText(partnerIntroText(name), width / 2, 840, 40));
        return new Promise((resolve) => {
            this.stage.appendChild(makeButton("Continue", width / 2, 970, 400, 75, resolve));
        });
    }

    async showInstructions() {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        this.clearStage();
        const width = GenParam.screen.width;
        const name = this.cast.partner.name;
        const blockCount = StimulusSettings.blockCount || 1;
        const board = el("g", { id: "instructions" });
        this.stage.appendChild(board);

        board.appendChild(centerText("Instructions", width / 2, 36, 48));

        const textWidth = 1500;
        const textBottom = drawWrappedParagraphs(
            board,
            instructionsParagraphs(blockCount, this.cast.partner),
            (width - textWidth) / 2,
            136,
            textWidth,
            30,
            42,
            18,
            "instructions-copy"
        );

        const margin = 56;
        const gap = 28;
        const tableTop = textBottom + 36;
        const tableH = 400;
        const tableW = (width - margin * 2 - gap * 2) / 3;
        const columns = [
            StimulusSettings.rewards.slice().sort((a, b) => b - a).map((amount) => ({
                icon: cloneSvgById(this.trialDoc, "point_" + amount + "_medal"),
                text: rewardLegendText(amount)
            })),
            [
                { icon: this.cloneTypeIcon("upper_apple"), text: appleLegendText("upper") },
                { icon: this.cloneTypeIcon("middle_apple"), text: appleLegendText("middle") }
            ],
            [
                {
                    icon: this.icons.create(this.cast.partner.gender, "front", this.cast.partner.colors),
                    text: partnerLegendText(name, true)
                },
                { icon: null, text: partnerLegendText(name, false) }
            ]
        ];
        columns.forEach((rows, index) => {
            this.drawLegendTable(board, margin + index * (tableW + gap), tableTop, tableW, tableH, rows);
        });

        const buttonY = tableTop + tableH + 78;
        return new Promise((resolve) => {
            board.appendChild(makeButton("Continue", width / 2, buttonY, 400, 75, resolve));
            const bounds = board.getBBox();
            const shift = (GenParam.screen.height - bounds.height) / 2 - bounds.y;
            board.setAttribute("transform", "translate(0 " + shift + ")");
        });
    }

    drawLegendTable(parent, x, y, width, height, rows) {
        const iconWidth = 176;
        const fontSize = 24;
        const leading = 32;
        const group = el("g", { class: "legend-table" });
        group.appendChild(el("rect", {
            x: x,
            y: y,
            width: iconWidth,
            height: height,
            fill: "#f4f4f4"
        }));
        group.appendChild(el("rect", {
            x: x,
            y: y,
            width: width,
            height: height,
            fill: "none",
            stroke: "#d0d0d0",
            "stroke-width": 2
        }));
        group.appendChild(el("line", {
            x1: x + iconWidth,
            y1: y,
            x2: x + iconWidth,
            y2: y + height,
            stroke: "#d0d0d0",
            "stroke-width": 2
        }));

        const rowH = height / rows.length;
        for (let i = 1; i < rows.length; i++) {
            const lineY = y + i * rowH;
            group.appendChild(el("line", {
                x1: x,
                y1: lineY,
                x2: x + width,
                y2: lineY,
                stroke: "#d0d0d0",
                "stroke-width": 2
            }));
        }
        parent.appendChild(group);

        const textX = x + iconWidth + 22;
        const textWidth = width - iconWidth - 44;
        rows.forEach((row, index) => {
            const rowY = y + index * rowH;
            if (row.icon) {
                group.appendChild(row.icon);
                fitInBox(row.icon, x, rowY, iconWidth, rowH, 26);
            }
            const lines = wrapTextLines(this.stage, row.text, fontSize, textWidth);
            const blockH = (lines.length - 1) * leading;
            const textY = rowY + rowH / 2 - blockH / 2;
            group.appendChild(leftTextBlock(lines, textX, textY, fontSize, leading, "legend-copy"));
        });
    }

    // One block is one day. The sun advances only after an accepted harvest finished in time.
    // Rejections and timed-out harvests leave it where it is. Practice does not spend a step.
    async runBlock(blockIndex) {
        const trials = await this.dataController.getOrCreateTrials(blockIndex);
        const budget = trials.length;
        if (blockIndex === 0) await this.runPracticeTrial();
        if (!budget) return;
        let completed = 0;
        let advance = false;
        for (let i = 0; i < budget; i++) {
            await this.showDayInterval(completed, budget, true, advance);
            advance = false;
            const decision = await this.showOffer(trials[i]);
            const meta = {
                blockIndex: blockIndex,
                trialIndex: i,
                decisionTimeMs: decision.decisionTimeMs
            };
            if (!decision.accepted) {
                this.dataController.recordTrial({
                    rewardAmount: trials[i].rewardAmount,
                    socialCondition: trials[i].socialCondition,
                    accepted: false,
                    decisionTimeMs: meta.decisionTimeMs,
                    completionTimeMs: null,
                    completedInTime: false,
                    blockIndex: meta.blockIndex,
                    trialIndex: meta.trialIndex
                });
                continue;
            }
            const result = await this.runTrial(trials[i], meta);
            if (result && result.rewardObtained) {
                completed += 1;
                advance = true;
            }
        }
        await this.showDayInterval(completed, budget, false, advance);
    }

    // Between offers the sun shows how many harvests have been completed.
    // It animates one step only when the previous harvest was accepted and finished in time.
    async showDayInterval(completed, budget, searching, advance) {
        this.clearStage();
        this.refreshScore();
        const clock = new DayClock(this.stage);
        const shown = budget > 0 ? completed / budget : 0;
        clock.setProgress(advance ? (completed - 1) / budget : shown);
        if (searching) {
            this.stage.appendChild(centerText(
                StimulusSettings.daySearchText,
                GenParam.screen.width / 2,
                clock.captionY,
                GenParam.dayClock.captionSize,
                "day-search"
            ));
        }
        if (advance) await clock.animateTo(shown);
        await wait(searching
            ? uniform(GenParam.offerDelayMs[0], GenParam.offerDelayMs[1])
            : GenParam.dayClock.sunsetHoldMs);
    }

    showOffer(trial) {
        this.clearStage();
        this.refreshScore();
        const condition = StimulusSettings.conditions[trial.socialCondition];
        const cx = GenParam.screen.width / 2;
        const cy = GenParam.screen.height / 2 - 40;
        const boxW = 600;
        const boxH = 300;

        this.stage.appendChild(el("rect", {
            x: cx - boxW / 2,
            y: cy - boxH / 2,
            width: boxW,
            height: boxH,
            rx: 28,
            fill: "#ffffff",
            stroke: "#d9d9d9",
            "stroke-width": 3
        }));

        const medal = cloneSvgById(this.trialDoc, "point_" + trial.rewardAmount + "_medal");
        this.stage.appendChild(medal);
        placeByHeight(medal, cx - 170, cy, GenParam.medalHeightPx);

        const typeIcon = this.cloneTypeIcon(condition.apples);
        this.stage.appendChild(typeIcon);
        const withPartner = trial.socialCondition !== "alone";
        const iconX = withPartner ? cx + 40 : cx + 130;
        placeByHeight(typeIcon, iconX, cy, 200);
        if (withPartner) {
            const partner = this.icons.create(this.cast.partner.gender, "front", this.cast.partner.colors);
            this.stage.appendChild(partner);
            placeByHeight(partner, iconX + 128, cy + 10, 180);
        }

        const shownAt = performance.now();
        return new Promise((resolve) => {
            let chosen = false;
            const choose = (accepted) => {
                if (chosen) return;
                chosen = true;
                resolve({
                    accepted: accepted,
                    decisionTimeMs: Math.round(performance.now() - shownAt)
                });
            };
            this.stage.appendChild(makeButton("Accept", cx - 160, cy + boxH / 2 + 90, 240, 74, () => choose(true)));
            this.stage.appendChild(makeButton("Reject", cx + 160, cy + boxH / 2 + 90, 240, 74, () => choose(false)));
        });
    }

    cloneTypeIcon(appleClass) {
        const row = appleClass.replace("_apple", "");
        const marker = this.trialDoc.getElementById("preview_icon_apples_" + row);
        if (!marker) throw new Error("Missing preview icon for " + appleClass);
        const clone = document.importNode(marker.parentNode, true);
        clone.removeAttribute("display");
        clone.querySelectorAll(".preview_icon_apples").forEach((group) => {
            if (!group.id.endsWith("_" + row)) group.style.display = "none";
        });
        clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
        return clone;
    }

    runPracticeTrial() {
        const practice = StimulusSettings.practiceTrial;
        if (!practice || practice.enabled === false) return Promise.resolve();
        return this.runTrial({
            rewardAmount: practice.rewardAmount,
            socialCondition: "cooperation-required",
            practice: true
        });
    }

    runTrial(trial, meta) {
        meta = meta || {};
        return new Promise((resolve) => {
            this.clearStage();
            this.refreshScore();
            const trialController = new TrialController({
                stage: this.stage,
                trialDoc: this.trialDoc,
                trial: trial,
                createIcon: (person, pose) => this.icons.create(this.cast[person].gender, pose, this.cast[person].colors),
                partnerName: this.cast.partner.name,
                onOutcome: (result) => {
                    this.dataController.recordTrial({
                        rewardAmount: trial.rewardAmount,
                        socialCondition: trial.socialCondition,
                        accepted: true,
                        decisionTimeMs: meta.decisionTimeMs == null ? null : meta.decisionTimeMs,
                        completionTimeMs: result.completionTimeMs,
                        completedInTime: result.rewardObtained === true,
                        practice: !!trial.practice,
                        blockIndex: meta.blockIndex == null ? null : meta.blockIndex,
                        trialIndex: meta.trialIndex == null ? null : meta.trialIndex
                    });
                    this.refreshScore();
                }
            });
            trialController.start().then(resolve);
        });
    }

    showEnd() {
        this.clearStage();
        if (this.scoreNode) this.scoreNode.remove();
        this.scoreNode = null;
        const cx = GenParam.screen.width / 2;
        const cy = GenParam.screen.height / 2;
        this.stage.appendChild(centerText("You earned " + this.dataController.totalPoints + " points.", cx, cy - 70, 64));
        return new Promise((resolve) => {
            this.stage.appendChild(makeButton("Continue", cx, cy + 80, 400, 75, resolve));
        });
    }

    async showOpenQuestions() {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        this.clearStage();
        if (this.scoreNode) {
            this.scoreNode.remove();
            this.scoreNode = null;
        }

        const width = GenParam.screen.width;
        const name = this.cast.partner.name;
        const questions = [
            {
                id: "partnerHelpful",
                text: "Was " + name + " helpful?"
            },
            {
                id: "cooperationDifference",
                text: "Did you notice a difference between the trials in which " + name + " cooperated, versus the other trials?"
            },
            {
                id: "instructionsAndTaskClear",
                text: "Were the instructions and the task sufficiently easy and clear?"
            },
            {
                id: "generalComments",
                text: "Do you have any general comments on the experiment?"
            }
        ];
        const responses = {
            partnerHelpful: "",
            cooperationDifference: "",
            instructionsAndTaskClear: "",
            generalComments: ""
        };
        this.dataController.markQuestionsReached();

        const columnW = 1480;
        const columnX = (width - columnW) / 2;
        const top = 24;
        const bottom = 908;
        const bandH = (bottom - top) / questions.length;
        const fontSize = 32;
        const leading = 42;
        const fieldGap = 16;
        const fieldH = bandH - fontSize - fieldGap - 44;
        questions.forEach((question, index) => {
            const bandY = top + index * bandH;
            const fieldY = bandY + bandH - fieldH;
            const lines = wrapTextLines(this.stage, question.text, fontSize, columnW, "open-question");
            const firstCenter = fieldY - fieldGap - fontSize / 2 - (lines.length - 1) * leading;
            this.stage.appendChild(leftTextBlock(lines, columnX, firstCenter, fontSize, leading, "open-question"));
            this.stage.appendChild(makeTextArea(columnX, fieldY, columnW, fieldH, (value) => {
                responses[question.id] = value;
                this.dataController.recordOpenResponses(responses);
            }, question.text));
        });

        let submitted = false;
        return new Promise((resolve) => {
            this.stage.appendChild(makeButton("Continue", width / 2, 990, 400, 75, () => {
                if (submitted) return;
                submitted = true;
                this.dataController.recordOpenResponses(responses);
                this.showMessage("Saving…");
                this.dataController.complete().then(resolve);
            }));
        });
    }
}

class CharacterCreation {
    constructor(experiment, onContinue) {
        this.experiment = experiment;
        this.stage = experiment.stage;
        this.choices = {};
        this.partnerChoices = {};
        this.swatches = {};
        this.randomize(true);
        this.draw(onContinue);
    }

    randomize(isFirst) {
        const presets = StimulusSettings.characterPresets;
        Object.keys(presets).forEach((key) => {
            const optionIds = shuffle(Object.keys(presets[key].options));
            this.choices[key] = optionIds[0];
            this.partnerChoices[key] = optionIds[1];
        });
        this.applyCast(isFirst);
    }

    applyCast(rerollName) {
        const previousGender = this.experiment.cast.partner.gender;
        this.applyPerson(this.experiment.cast.player, this.choices);
        this.applyPerson(this.experiment.cast.partner, this.partnerChoices);
        const partner = this.experiment.cast.partner;
        if (rerollName || partner.gender !== previousGender || !partner.name) {
            const names = StimulusSettings.partnerNames[partner.gender];
            partner.name = names[Math.floor(Math.random() * names.length)];
        }
    }

    applyPerson(person, choices) {
        const presets = StimulusSettings.characterPresets;
        person.gender = presets.type.options[choices.type];
        person.colors = Object.assign(
            {
                skin: presets.skin_color.options[choices.skin_color],
                hair: presets.hair_color.options[choices.hair_color]
            },
            presets.outfit.options[choices.outfit]
        );
    }

    draw(onContinue) {
        const width = GenParam.screen.width;
        this.stage.appendChild(centerText("Select your icon", width / 2, 110, 56));
        this.stage.appendChild(makeButton("Randomize", 1560, 110, 280, 70, () => {
            this.randomize(true);
            this.markSelected();
            this.renderPreview();
        }));

        this.previewBox = { x: 160, y: 180, w: 560, h: 700 };
        const box = el("rect", {
            x: this.previewBox.x,
            y: this.previewBox.y,
            width: this.previewBox.w,
            height: this.previewBox.h,
            rx: 40,
            fill: GenParam.colors.previewBox
        });
        this.stage.appendChild(box);
        this.previewHolder = el("g");
        this.stage.appendChild(this.previewHolder);
        this.renderPreview();

        const presets = StimulusSettings.characterPresets;
        const keys = Object.keys(presets);
        keys.forEach((key, index) => {
            const y = 230 + index * 150;
            this.stage.appendChild(el("rect", {
                x: 820,
                y: y,
                width: 280,
                height: 110,
                rx: 24,
                fill: GenParam.colors.labelPill,
                opacity: 0.12
            }));
            this.stage.appendChild(centerText(presets[key].label, 960, y + 55, 32));

            this.swatches[key] = {};
            Object.keys(presets[key].options).forEach((optionId, optionIndex) => {
                const x = 1180 + optionIndex * 140;
                const face = el("rect", {
                    x: x,
                    y: y,
                    width: 110,
                    height: 110,
                    rx: 16,
                    class: "swatch"
                });
                if (key === "type") {
                    face.setAttribute("fill", GenParam.colors.button);
                    const word = optionId === "male" ? "Male" : "Female";
                    const label = centerText(word, x + 55, y + 55, 28);
                    label.style.pointerEvents = "none";
                    this.stage.appendChild(face);
                    this.stage.appendChild(label);
                } else if (key === "outfit") {
                    face.setAttribute("fill", presets.outfit.options[optionId].jacket);
                    this.stage.appendChild(face);
                } else {
                    face.setAttribute("fill", presets[key].options[optionId]);
                    this.stage.appendChild(face);
                }
                face.addEventListener("pointerdown", () => this.pick(key, optionId));
                this.swatches[key][optionId] = face;
            });
        });
        this.markSelected();
        this.stage.appendChild(makeButton("Continue", width / 2, 990, 400, 75, onContinue));
    }

    pick(key, optionId) {
        this.choices[key] = optionId;
        const optionIds = Object.keys(StimulusSettings.characterPresets[key].options).filter((id) => id !== optionId);
        this.partnerChoices[key] = optionIds[Math.floor(Math.random() * optionIds.length)];
        this.applyCast(false);
        this.markSelected();
        this.renderPreview();
    }

    markSelected() {
        Object.keys(this.swatches).forEach((key) => {
            Object.keys(this.swatches[key]).forEach((optionId) => {
                const face = this.swatches[key][optionId];
                const selected = this.choices[key] === optionId;
                face.setAttribute("stroke", selected ? GenParam.colors.selectStroke : "none");
                face.setAttribute("stroke-width", selected ? 8 : 0);
            });
        });
    }

    renderPreview() {
        this.previewHolder.replaceChildren();
        const player = this.experiment.cast.player;
        const icon = this.experiment.icons.create(player.gender, "front", player.colors);
        this.previewHolder.appendChild(icon);
        fitInBox(icon, this.previewBox.x, this.previewBox.y, this.previewBox.w, this.previewBox.h, 80);
    }
}

window.experiment = new ExperimentController(document.getElementById("Experiment_Task_SVG"));
window.experiment.start();
