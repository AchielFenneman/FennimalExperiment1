// Directs the session: character creation, partner introduction, instructions, the offer loop, the point total, and the closing questions.

class DataController {
    constructor() {
        this.records = [];
        this.totalPoints = 0;
        this.openResponses = {
            partnerHelpful: "",
            cooperationDifference: "",
            instructionsAndTaskClear: "",
            generalComments: ""
        };
    }

    recordTrial(entry) {
        this.records.push({
            rewardAmount: entry.rewardAmount,
            socialCondition: entry.socialCondition,
            accepted: entry.accepted,
            completionTimeMs: entry.completionTimeMs,
            rewardObtained: entry.rewardObtained,
            practice: !!entry.practice
        });
        if (entry.rewardObtained && !entry.practice) this.totalPoints += entry.rewardAmount;
    }

    recordOpenResponses(responses) {
        this.openResponses = {
            partnerHelpful: responses.partnerHelpful || "",
            cooperationDifference: responses.cooperationDifference || "",
            instructionsAndTaskClear: responses.instructionsAndTaskClear || "",
            generalComments: responses.generalComments || ""
        };
    }
}

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
            await this.loadAssets();
            await this.showCharacterCreation();
            await this.showPartnerIntro();
            await this.showInstructions();
            const blockCount = StimulusSettings.blockCount || 1;
            for (let block = 0; block < blockCount; block++) await this.runBlock(block);
            await this.showEnd();
            await this.showOpenQuestions();
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

    async runBlock(blockIndex) {
        if (blockIndex === 0) await this.runPracticeTrial();
        const trials = buildTrialList();
        for (let i = 0; i < trials.length; i++) {
            this.clearStage();
            this.refreshScore();
            await wait(uniform(GenParam.offerDelayMs[0], GenParam.offerDelayMs[1]));
            const accepted = await this.showOffer(trials[i]);
            if (!accepted) {
                this.dataController.recordTrial({
                    rewardAmount: trials[i].rewardAmount,
                    socialCondition: trials[i].socialCondition,
                    accepted: false,
                    completionTimeMs: null,
                    rewardObtained: false
                });
                continue;
            }
            await this.runTrial(trials[i]);
        }
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

        return new Promise((resolve) => {
            let chosen = false;
            const choose = (accepted) => {
                if (chosen) return;
                chosen = true;
                resolve(accepted);
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

    runTrial(trial) {
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
                        completionTimeMs: result.completionTimeMs,
                        rewardObtained: result.rewardObtained,
                        practice: !!trial.practice
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
        this.dataController.recordOpenResponses(responses);

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

        this.stage.appendChild(makeButton("Continue", width / 2, 990, 400, 75, () => {}));
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
