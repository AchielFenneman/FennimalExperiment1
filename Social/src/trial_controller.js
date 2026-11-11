// Builds one trial scene and runs it until the apples are collected or the clock runs out.

class LadderRig {
    constructor(group, base, top) {
        this.group = group;
        this.base = base;
        this.top = top;
        this.originX = 0;
        this.originY = 0;
    }

    placeBase(x, y) {
        this.originX = x - this.base.x;
        this.originY = y - this.base.y;
        this.group.setAttribute("transform", "translate(" + this.originX + " " + this.originY + ")");
    }

    basePoint() {
        return { x: this.originX + this.base.x, y: this.originY + this.base.y };
    }

    topPoint() {
        return { x: this.originX + this.top.x, y: this.originY + this.top.y };
    }
}

class Actor {
    constructor(parent, pose, height, makeGraphic) {
        this.makeGraphic = makeGraphic;
        this.height = height;
        this.pose = null;
        this.x = 0;
        this.y = 0;
        this.root = el("g");
        this.inner = el("g");
        this.root.appendChild(this.inner);
        this.root.appendChild(el("circle", { cx: 0, cy: 0, r: 3, class: "invisible_element" }));
        parent.appendChild(this.root);
        this.setPose(pose);
    }

    setPose(pose) {
        if (pose === this.pose) return;
        this.pose = pose;
        const graphic = this.makeGraphic(pose);
        this.inner.replaceChildren(graphic);
        const box = graphic.getBBox();
        const scale = this.height / box.height;
        const feetX = box.x + box.width / 2;
        const feetY = box.y + box.height;
        this.inner.setAttribute("transform", "translate(" + (-feetX * scale) + " " + (-feetY * scale) + ") scale(" + scale + ")");
    }

    setFeet(x, y) {
        this.x = x;
        this.y = y;
        this.root.setAttribute("transform", "translate(" + x + " " + y + ")");
    }
}

class TrialController {
    constructor({ stage, trialDoc, trial, createIcon, partnerName, onOutcome }) {
        this.stage = stage;
        this.trialDoc = trialDoc;
        this.trial = trial;
        this.createIcon = createIcon;
        this.partnerName = partnerName;
        this.onOutcome = onOutcome;

        this.alive = true;
        this.resolved = false;
        this.phase = "walk";
        this.keys = new Set();
        this.dragging = false;
        this.snapped = false;
        this.dragOffset = 0;
        this.climbDone = false;
        this.climbStarted = false;
        this.branchDone = trial.socialCondition === "alone";
        this.partnerIdle = false;
        this.picked = 0;
        this.apples = [];
        this.clockPaused = false;
        this.clockPauseMark = 0;
        this.bubble = null;

        this.onKeyDown = (event) => this.keyDown(event);
        this.onKeyUp = (event) => this.keyUp(event);
        this.onBlur = () => this.keys.clear();

        this.build();
    }

    build() {
        const viewBox = this.trialDoc.documentElement.viewBox.baseVal;
        this.sceneWidth = viewBox.width;
        this.sceneHeight = viewBox.height;
        const stageHeight = GenParam.screen.height - GenParam.keyBarHeight;
        this.scale = Math.min(GenParam.screen.width / viewBox.width, stageHeight / viewBox.height);
        const offsetX = (GenParam.screen.width - viewBox.width * this.scale) / 2;
        const offsetY = (stageHeight - viewBox.height * this.scale) / 2;
        this.pictureX = offsetX;
        this.pictureY = offsetY;
        this.pictureW = viewBox.width * this.scale;
        this.speed = GenParam.walkSpeedPxPerSec / this.scale;

        this.root = el("g", { id: "trial-root" });
        this.scene = el("g", { id: "trial-scene" });
        this.scene.setAttribute("transform", "translate(" + offsetX + " " + offsetY + ") scale(" + this.scale + ")");
        this.root.appendChild(this.scene);
        this.stage.appendChild(this.root);

        Array.from(this.trialDoc.documentElement.children).forEach((child) => {
            if (child.localName === "defs") return;
            this.scene.appendChild(document.importNode(child, true));
        });

        const medals = this.scene.querySelector("#point_medals");
        if (medals) medals.remove();
        const border = this.scene.querySelector("#image_border");
        if (border) {
            border.remove();
            const path = border.querySelector("path");
            if (path) path.setAttribute("fill-rule", "evenodd");
            this.frame = border;
        }

        const background = this.scene.querySelector("#background");
        const tree = this.scene.querySelector("#player_starting_point").parentNode;
        const playerLadderGroup = this.scene.querySelector("#player_ladder");
        const partnerLadderGroup = this.scene.querySelector("#partner_ladder");
        partnerLadderGroup.remove();
        playerLadderGroup.remove();
        background.after(partnerLadderGroup);
        tree.after(playerLadderGroup);

        this.playerLadder = new LadderRig(
            playerLadderGroup,
            this.pointIn(playerLadderGroup, playerLadderGroup.querySelector("#player_ladder_base_point")),
            this.pointIn(playerLadderGroup, playerLadderGroup.querySelector("#player_ladder_top_point"))
        );
        this.partnerLadder = new LadderRig(
            partnerLadderGroup,
            this.pointIn(partnerLadderGroup, partnerLadderGroup.querySelector("#partner_ladder_base_point")),
            this.pointIn(partnerLadderGroup, partnerLadderGroup.querySelector("#partner_ladder_top_point"))
        );

        this.playerStart = this.pointIn(this.scene, this.scene.querySelector("#player_starting_point"));
        this.playerTreeBase = this.pointIn(this.scene, this.scene.querySelector("#player_ladder_tree_base_point"));
        this.partnerTreeBase = this.pointIn(this.scene, this.scene.querySelector("#partner_ladder_tree_base_point"));
        const playerLadderStart = this.pointIn(this.scene, this.scene.querySelector("#player_ladder_starting_base_point"));
        const partnerLadderStart = this.pointIn(this.scene, this.scene.querySelector("#partner_ladder_starting_base_point"));

        this.playerLadder.placeBase(playerLadderStart.x, playerLadderStart.y);
        this.partnerLadder.placeBase(partnerLadderStart.x, partnerLadderStart.y);
        this.ladderGroundY = playerLadderStart.y;

        const iconHeight = GenParam.iconHeightPx / this.scale;
        this.player = new Actor(this.scene, "left", iconHeight, (pose) => this.createIcon("player", pose));
        this.partner = new Actor(this.scene, "front", iconHeight, (pose) => this.createIcon("partner", pose));
        this.minX = GenParam.edgeMarginPx / this.scale;
        this.maxX = this.sceneWidth - this.minX;
        const besidePlayer = this.playerStart.x - GenParam.partnerStartOffsetPx / this.scale;
        this.partnerStart = { x: clamp(besidePlayer, this.minX, this.maxX), y: this.playerStart.y };
        this.player.setFeet(this.playerStart.x, this.playerStart.y);
        this.partner.setFeet(this.partnerStart.x, this.partnerStart.y);
        if (this.trial.socialCondition !== "alone") this.buildVine();
        if (this.frame) this.scene.appendChild(this.frame);

        const appleClass = StimulusSettings.conditions[this.trial.socialCondition].apples;
        this.scene.querySelectorAll(".apple").forEach((apple) => {
            if (apple.classList.contains(appleClass)) this.apples.push(apple);
            else apple.style.display = "none";
        });
        if (this.apples.length === 0) throw new Error("No apples found for " + this.trial.socialCondition);
        this.apples.forEach((apple) => {
            apple.addEventListener("pointerdown", (event) => this.pickApple(apple, event));
        });

        this.branch = this.scene.querySelector("#rotating_branch");
        const pivot = this.branch.querySelector("#branch_pivot_point");
        this.pivot = this.pointIn(this.branch.parentNode, pivot);
        this.branchRest = this.branch.getAttribute("transform") || "";

        const corner = GenParam.medalHeightPx / 2 + 36;
        this.cornerX = this.pictureX + corner;
        this.cornerY = this.pictureY + corner;
        this.clock = this.makeClock(this.cornerX, this.cornerY);
        this.root.appendChild(this.clock);
        this.buildHint();
        this.mask = el("rect", {
            x: 0, y: 0,
            width: GenParam.screen.width,
            height: GenParam.screen.height,
            fill: GenParam.colors.mask,
            class: "trial-mask"
        });
        this.mask.style.opacity = "0";
        this.root.appendChild(this.mask);
        this.mountMedal();
        this.partnerScale = GenParam.partnerSequenceMs / this.cooperationAnimationMs();
        this.animationMs = GenParam.partnerSequenceMs;
        this.climbGateOpen = false;
        this.prepareAloneProps();
    }

    pointIn(ancestor, circle) {
        if (!circle) throw new Error("A trial marker is missing from the SVG");
        const from = circle.parentNode.getScreenCTM();
        const to = ancestor.getScreenCTM();
        if (!from || !to) throw new Error("Could not read a marker position");
        const point = this.stage.ownerSVGElement.createSVGPoint();
        point.x = circle.cx.baseVal.value;
        point.y = circle.cy.baseVal.value;
        const local = point.matrixTransform(from).matrixTransform(to.inverse());
        return { x: local.x, y: local.y };
    }

    makeClock(cx, cy) {
        const radius = 51;
        this.clockLength = 2 * Math.PI * radius;
        const group = el("g", { class: "countdown" });
        group.appendChild(el("circle", {
            cx: cx, cy: cy, r: radius,
            class: "countdown-track"
        }));
        this.ring = el("circle", {
            cx: cx, cy: cy, r: radius,
            class: "countdown-ring"
        });
        this.ring.setAttribute("stroke-dasharray", this.clockLength);
        this.ring.setAttribute("stroke-dashoffset", "0");
        this.ring.setAttribute("transform", "rotate(-90 " + cx + " " + cy + ")");
        group.appendChild(this.ring);
        return group;
    }

    mountMedal() {
        const medal = cloneSvgById(this.trialDoc, "point_" + this.trial.rewardAmount + "_medal");
        this.medalSpin = el("g");
        this.medalInner = el("g");
        this.medalSpin.appendChild(this.medalInner);
        this.medalInner.appendChild(medal);
        this.root.appendChild(this.medalSpin);
        const box = medal.getBBox();
        const scale = GenParam.medalHeightPx / box.height;
        const bx = box.x + box.width / 2;
        const by = box.y + box.height / 2;
        this.medalInner.setAttribute("transform", "translate(" + (-bx * scale) + " " + (-by * scale) + ") scale(" + scale + ")");
        const cornerInset = this.cornerX - this.pictureX;
        this.placeMedal(this.pictureX + this.pictureW - cornerInset, this.cornerY);
    }

    placeMedal(x, y, scale) {
        this.medalX = x;
        this.medalY = y;
        this.medalScale = scale || 1;
        this.medalSpin.setAttribute("transform", "translate(" + x + " " + y + ") scale(" + this.medalScale + ")");
    }

    buildHint() {
        const height = GenParam.keyBarHeight;
        const top = GenParam.screen.height - height;
        const cy = top + height / 2 + 1;
        const keyH = 52;
        const letterW = 64;

        this.hint = el("g", { class: "key-hint" });
        this.hint.appendChild(el("rect", {
            x: 0,
            y: top,
            width: GenParam.screen.width,
            height: height,
            fill: "#f6f3ec"
        }));
        this.hint.appendChild(el("line", {
            x1: 0,
            y1: top,
            x2: GenParam.screen.width,
            y2: top,
            stroke: "#d9d3c7",
            "stroke-width": 2
        }));

        this.hintMove = el("g");
        this.hintClimb = el("g");
        this.hintWait = el("g");
        this.hintPick = el("g");
        this.hintClimb.style.display = "none";
        this.hintWait.style.display = "none";
        this.hintPick.style.display = "none";
        this.hint.append(this.hintMove, this.hintClimb, this.hintWait, this.hintPick);

        this.keyCaps = {
            a: this.addKey(this.hintMove, "A", 689, cy, letterW, keyH),
            d: this.addKey(this.hintMove, "D", 763, cy, letterW, keyH),
            space: this.addKey(this.hintMove, "SPACE", 1021, cy, 148, keyH),
            w: this.addKey(this.hintClimb, "W", 860, cy, letterW, keyH)
        };
        this.hintMove.appendChild(centerText("move", 848, cy, 28, "key-hint-caption"));
        this.hintMove.appendChild(centerText("drag ladder", 1188, cy, 28, "key-hint-caption"));
        this.hintClimb.appendChild(centerText("climb ladder", 1002, cy, 28, "key-hint-caption"));
        const waitLine = this.trial.socialCondition === "alone"
            ? "Let's wait for the wind to die down"
            : "Let's wait for " + this.partnerName + " to help pull down a branch";
        this.hintWait.appendChild(centerText(waitLine, GenParam.screen.width / 2, cy, 32, "key-hint-caption"));
        this.hintPick.appendChild(centerText("Click to pick all apples", GenParam.screen.width / 2, cy, 32, "key-hint-caption"));
        this.root.appendChild(this.hint);
    }

    addKey(parent, label, cx, cy, width, height) {
        const key = makeKeyCap(label, cx, cy, width, height);
        parent.appendChild(key);
        return key;
    }

    showHint(mode) {
        if (!this.hintMove) return;
        this.hintMove.style.display = mode === "move" ? "" : "none";
        this.hintClimb.style.display = mode === "climb" ? "" : "none";
        this.hintWait.style.display = mode === "wait" ? "" : "none";
        this.hintPick.style.display = mode === "pick" ? "" : "none";
    }

    updateClimbGate(now) {
        if (!this.climbGateOpen) {
            const sequenceDone = this.trial.socialCondition === "alone"
                ? now >= this.t0 + this.animationMs
                : this.branchDone;
            if (!sequenceDone) return;
            this.climbGateOpen = true;
        }
        if (this.playerAtLadder) this.beginClimb();
    }

    partnerMs(ms) {
        return ms * this.partnerScale;
    }

    updateWind(now) {
        if (this.trial.socialCondition !== "alone") return;
        const remaining = this.t0 + this.animationMs - now;
        const strength = this.climbGateOpen ? 0 : Math.min(1, Math.max(0, remaining / 500));
        if (strength <= 0) {
            this.stopWind();
            return;
        }
        if (!this.wind) this.startWind();
        const period = 1400;
        this.gusts.forEach((gust) => {
            const u = ((now / period) + gust._lane * 0.33) % 1;
            const x = lerp(420, 150, u);
            const y = 58 + gust._lane * 26;
            const d = "M " + x + " " + y + " Q " + (x - 26) + " " + (y - 9) + " " + (x - 54) + " " + y;
            gust._paths.forEach((path) => path.setAttribute("d", d));
            gust.style.opacity = String(Math.sin(u * Math.PI) * 0.8 * strength);
        });
        this.setBranchPose(Math.sin(now / 260) * 2.4 * strength, 0);
    }

    startWind() {
        this.wind = el("g", { class: "trial-wind" });
        this.gusts = [0, 1, 2].map((lane) => {
            const gust = el("g");
            const under = el("path", {
                fill: "none",
                stroke: "#9aaf86",
                "stroke-width": 2.6,
                "stroke-linecap": "round"
            });
            const over = el("path", {
                fill: "none",
                stroke: "#ffffff",
                "stroke-width": 1.15,
                "stroke-linecap": "round"
            });
            gust.append(under, over);
            gust._lane = lane;
            gust._paths = [under, over];
            this.wind.appendChild(gust);
            return gust;
        });
        if (this.frame) this.frame.before(this.wind);
        else this.scene.appendChild(this.wind);
    }

    stopWind() {
        if (!this.wind) return;
        this.wind.remove();
        this.wind = null;
        this.gusts = null;
        this.setBranchPose(0, 0);
    }

    cooperationAnimationMs() {
        const ladderStart = this.partnerLadder.basePoint();
        const walkMs = Math.hypot(ladderStart.x - this.partnerStart.x, ladderStart.y - this.partnerStart.y) / this.speed * 1000;
        const dragMs = Math.hypot(this.partnerTreeBase.x - ladderStart.x, this.partnerTreeBase.y - ladderStart.y) / this.speed * 1000;
        return walkMs + dragMs
            + GenParam.partnerClimbMs
            + GenParam.partnerBeatMs
            + GenParam.vineAppearMs
            + GenParam.partnerDescentMs
            + GenParam.vinePullBeatMs
            + GenParam.vinePullMs;
    }

    updateHintKeys() {
        if (!this.keyCaps) return;
        setKeyCapPressed(this.keyCaps.a, this.keys.has("a") || this.keys.has("arrowleft"));
        setKeyCapPressed(this.keyCaps.d, this.keys.has("d") || this.keys.has("arrowright"));
        setKeyCapPressed(this.keyCaps.space, this.keys.has("space"));
        setKeyCapPressed(this.keyCaps.w, this.keys.has("w") || this.keys.has("arrowup"));
    }

    start() {
        const done = new Promise((resolve) => { this.finish = resolve; });
        this.open().catch((error) => {
            console.error(error);
            if (this.resolved) return;
            if (this.t0) this.fail();
            else this.close({ completionTimeMs: null, rewardObtained: false });
        });
        return done;
    }

    async open() {
        if (this.trial.practice) await this.guidePractice();
        if (!this.alive || this.resolved) return;
        this.t0 = performance.now();
        this.prev = this.t0;
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
        window.addEventListener("blur", this.onBlur);
        this.stage.ownerSVGElement.focus();
        if (this.trial.socialCondition !== "alone") this.runPartner().catch((error) => console.error(error));
        if (this.trial.practice) {
            this.setClockPaused(true);
            this.showPracticeBubble("ladder");
        }
        this.tick(this.t0);
    }

    async guidePractice() {
        const lines = practiceBubbleText(this.partnerName);
        const bubble = this.speechBubble();
        const blockKeys = (event) => {
            const key = event.key === " " ? "space" : event.key.toLowerCase();
            if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "space"].indexOf(key) !== -1) {
                event.preventDefault();
            }
        };
        window.addEventListener("keydown", blockKeys);
        try {
            await bubble.show({ target: this.clock, text: lines.time, preferredSide: "down" });
            if (!this.alive) return;
            await bubble.show({ target: this.medalSpin, text: lines.reward, preferredSide: "down" });
            if (!this.alive) return;
            await bubble.show({ target: this.partner.root, text: lines.partner, preferredSide: "up" });
        } finally {
            window.removeEventListener("keydown", blockKeys);
        }
    }

    showPracticeBubble(step) {
        const lines = practiceBubbleText(this.partnerName);
        const action = step === "ladder"
            ? { target: this.playerLadder.group, text: lines.ladder, preferredSide: "up" }
            : {
                target: this.apples[Math.floor((this.apples.length - 1) / 2)],
                text: lines.apples,
                preferredSide: "left"
            };
        this.setClockPaused(true);
        this.speechBubble().show({
            target: action.target,
            text: action.text,
            hideButton: true,
            passThrough: true,
            dimOpacity: 0,
            highlight: false,
            preferredSide: action.preferredSide
        });
    }

    speechBubble() {
        if (!this.bubble) this.bubble = new SpeechBubble(this.stage.ownerSVGElement);
        return this.bubble;
    }

    elapsedMs() {
        if (!this.t0) return null;
        const now = performance.now();
        const paused = this.clockPaused && this.clockPauseMark ? now - this.clockPauseMark : 0;
        return Math.round(now - this.t0 - paused);
    }

    setClockPaused(paused) {
        if (this.clockPaused === paused) return;
        const now = performance.now();
        if (paused) {
            this.clockPaused = true;
            this.clockPauseMark = now;
            return;
        }
        this.clockPaused = false;
        if (this.t0 && this.clockPauseMark) this.t0 += now - this.clockPauseMark;
        this.clockPauseMark = 0;
    }

    keyDown(event) {
        const key = event.key.toLowerCase();
        const name = key === " " ? "space" : key;
        if (["arrowleft", "arrowright", "arrowup", "a", "d", "w", "space"].indexOf(name) === -1) return;
        event.preventDefault();
        this.keys.add(name);
        if ((name === "w" || name === "arrowup") && this.phase === "ready-to-climb") this.beginClimb();
    }

    keyUp(event) {
        const key = event.key.toLowerCase();
        const name = key === " " ? "space" : key;
        this.keys.delete(name);
        if (name === "space") this.dragging = false;
    }

    tick(now) {
        if (!this.alive || this.resolved) return;
        const dt = Math.min(0.05, (now - this.prev) / 1000);
        this.prev = now;
        this.updateHintKeys();
        this.updateClimbGate(now);
        this.updateWind(now);
        this.updatePartnerIdle(now);
        if (this.phase === "walk") this.updatePlayer(dt);
        this.updateTimer(now);
        if (this.alive && !this.resolved) requestAnimationFrame((time) => this.tick(time));
    }

    updatePlayer(dt) {
        let direction = 0;
        if (this.keys.has("arrowleft") || this.keys.has("a")) direction -= 1;
        if (this.keys.has("arrowright") || this.keys.has("d")) direction += 1;

        if (direction !== 0) {
            this.player.setPose(direction < 0 ? "left" : "right");
            const next = clamp(this.player.x + direction * this.speed * dt, this.minX, this.maxX);
            this.player.setFeet(next, this.player.y);
        }

        if (this.snapped) return;

        if (this.dragging) {
            this.playerLadder.placeBase(this.player.x + this.dragOffset, this.ladderGroundY);
            this.setLadderStyle("held");
            if (this.ladderNearTree()) this.snapLadder();
            return;
        }

        if (this.keys.has("space") && this.playerNearLadder()) {
            this.dragging = true;
            this.dragOffset = this.playerLadder.basePoint().x - this.player.x;
            this.setLadderStyle("held");
            return;
        }

        this.setLadderStyle(this.playerNearLadder() ? "near" : null);
    }

    playerNearLadder() {
        const base = this.playerLadder.basePoint();
        return Math.hypot(this.player.x - base.x, this.player.y - base.y) <= GenParam.grabDistancePx / this.scale;
    }

    ladderNearTree() {
        const base = this.playerLadder.basePoint();
        return Math.hypot(base.x - this.playerTreeBase.x, base.y - this.playerTreeBase.y) <= GenParam.snapDistancePx / this.scale;
    }

    setLadderStyle(mode) {
        this.playerLadder.group.classList.toggle("ladder-near", mode === "near");
        this.playerLadder.group.classList.toggle("ladder-held", mode === "held");
    }

    snapLadder() {
        this.snapped = true;
        this.dragging = false;
        this.phase = "ready-to-climb";
        this.playerLadder.placeBase(this.playerTreeBase.x, this.playerTreeBase.y);
        this.setLadderStyle(null);
        this.showHint("wait");
        if (this.trial.practice) {
            if (this.bubble) this.bubble.hide(true);
            this.setClockPaused(false);
        }
        this.movePlayerToLadder().catch((error) => console.error(error));
    }

    async movePlayerToLadder() {
        await wait(GenParam.ladderSnapPauseMs);
        if (!this.alive || this.resolved) return;
        const base = this.playerLadder.basePoint();
        await this.walkTo(this.player, base.x, base.y);
        if (!this.alive || this.resolved) return;
        this.playerAtLadder = true;
        this.beginClimb();
    }

    beginClimb() {
        if (this.climbStarted) return;
        if (!this.climbGateOpen || !this.playerAtLadder) return;
        this.climbStarted = true;
        this.phase = "cinematic";
        this.climb().catch((error) => console.error(error));
    }

    async climb() {
        if (!this.alive || this.resolved) return;
        this.player.setPose("back");
        const top = this.playerLadder.topPoint();
        await this.moveActor(this.player, top.x, top.y, GenParam.climbDurationMs);
        if (!this.alive || this.resolved) return;
        this.climbDone = true;
        this.showHint("pick");
        this.enableApplesIfReady();
    }

    async runPartner() {
        this.partner.inner.classList.add("partner-active");
        this.showPartnerName();
        const foot = this.partnerLadder.basePoint();
        await this.walkTo(this.partner, foot.x, foot.y, this.speed / this.partnerScale);
        if (!this.alive || this.resolved) return;

        this.partnerLadder.group.classList.add("partner-held");
        const from = this.partnerLadder.basePoint();
        const dx = this.partnerTreeBase.x - from.x;
        const dy = this.partnerTreeBase.y - from.y;
        const partnerX = this.partner.x;
        const partnerY = this.partner.y;
        if (Math.abs(dx) > 1) this.partner.setPose(dx < 0 ? "left" : "right");
        const ms = this.partnerMs(Math.hypot(dx, dy) / this.speed * 1000);
        await tween(ms, (t) => {
            this.partnerLadder.placeBase(from.x + dx * t, from.y + dy * t);
            this.partner.setFeet(partnerX + dx * t, partnerY + dy * t);
        }, () => this.alive && !this.resolved);
        if (!this.alive || this.resolved) return;
        this.partnerLadder.placeBase(this.partnerTreeBase.x, this.partnerTreeBase.y);
        this.partner.setFeet(this.partnerTreeBase.x, this.partnerTreeBase.y);
        this.partner.setPose("back");
        const top = this.partnerLadder.topPoint();
        await this.moveActor(this.partner, top.x, top.y, this.partnerMs(GenParam.partnerClimbMs));
        if (!this.alive || this.resolved) return;
        await wait(this.partnerMs(GenParam.partnerBeatMs));
        if (!this.alive || this.resolved) return;

        this.setVine(GenParam.vineSagHold);
        await tween(this.partnerMs(GenParam.vineAppearMs), (t) => {
            this.vine.style.opacity = String(t);
            this.setVine(GenParam.vineSagHold);
        }, () => this.alive && !this.resolved);
        if (!this.alive || this.resolved) return;

        const base = this.partnerLadder.basePoint();
        const fromX = this.partner.x;
        const fromY = this.partner.y;
        await tween(this.partnerMs(GenParam.partnerDescentMs), (t) => {
            this.partner.setFeet(lerp(fromX, base.x, t), lerp(fromY, base.y, t));
            this.setVine(GenParam.vineSagHold);
        }, () => this.alive && !this.resolved);
        if (!this.alive || this.resolved) return;

        await wait(this.partnerMs(GenParam.vinePullBeatMs));
        if (!this.alive || this.resolved) return;

        await tween(this.partnerMs(GenParam.vinePullMs), (t) => {
            this.setBranchPose(GenParam.branchRotationDeg * t, t);
            this.setVine(lerp(GenParam.vineSagHold, GenParam.vineSagTaut, t));
        }, () => this.alive && !this.resolved);
        if (!this.alive || this.resolved) return;
        this.setVine(GenParam.vineSagTaut);
        this.partner.inner.classList.remove("partner-active");
        this.partnerLadder.group.classList.remove("partner-held");
        this.branch.classList.add("support-flash");
        this.apples.forEach((apple) => apple.classList.add("support-flash"));
        this.fadePartnerName();
        this.branchDone = true;
        this.enableApplesIfReady();
    }

    setBranchPose(angle, shiftT) {
        const slide = this.trial.socialCondition === "cooperation-required" ? shiftT : 0;
        const dx = GenParam.branchShiftX * slide;
        const dy = GenParam.branchShiftY * slide;
        const motion = "translate(" + dx + " " + dy + ") rotate(" + angle + " " + this.pivot.x + " " + this.pivot.y + ")";
        this.branch.setAttribute("transform", motion + (this.branchRest ? " " + this.branchRest : ""));
    }

    buildVine() {
        this.vine = el("g", { class: "partner-vine" });
        this.vine.style.opacity = "0";
        const marker = this.scene.querySelector("#branch_vine_attachment_point");
        if (!marker) throw new Error("Missing branch vine attachment point");
        this.knotLocal = { x: marker.cx.baseVal.value, y: marker.cy.baseVal.value };
        this.loopBowLocal = { x: this.knotLocal.x - 7, y: this.knotLocal.y - 7 };
        this.loopEndLocal = { x: this.knotLocal.x - 14, y: this.knotLocal.y + 2 };
        const cord = {
            fill: "none",
            stroke: "#3d6e32",
            "stroke-width": 1.6,
            "stroke-linecap": "round"
        };
        this.vineCord = el("path", cord);
        this.vineLoop = el("path", cord);
        this.vine.append(this.vineCord, this.vineLoop);
        this.vineLeaves = [0.38, 0.62].map((t, index) => {
            const leaf = el("ellipse", {
                rx: index === 0 ? 5.4 : 4,
                ry: index === 0 ? 2.15 : 1.6,
                fill: index === 0 ? "#7cbc4e" : "#2f6d30"
            });
            leaf._along = t;
            this.vine.appendChild(leaf);
            return leaf;
        });
        this.player.root.before(this.vine);
    }

    partnerHand() {
        return {
            x: this.partner.x - 18,
            y: this.partner.y - this.partner.height * 0.46
        };
    }

    branchPoint(local) {
        const point = this.stage.ownerSVGElement.createSVGPoint();
        point.x = local.x;
        point.y = local.y;
        const from = this.branch.getScreenCTM();
        const to = this.scene.getScreenCTM();
        return point.matrixTransform(from).matrixTransform(to.inverse());
    }

    setVine(sag) {
        const hand = this.partnerHand();
        const knot = this.branchPoint(this.knotLocal);
        const bow = this.branchPoint(this.loopBowLocal);
        const back = this.branchPoint(this.loopEndLocal);
        const cx = (hand.x + knot.x) / 2;
        const cy = (hand.y + knot.y) / 2 + sag;
        const control = { x: cx, y: cy };
        this.vineCord.setAttribute("d", "M " + hand.x + " " + hand.y + " Q " + cx + " " + cy + " " + knot.x + " " + knot.y);
        this.vineLoop.setAttribute("d", "M " + knot.x + " " + knot.y + " Q " + bow.x + " " + bow.y + " " + back.x + " " + back.y);
        const span = Math.hypot(knot.x - hand.x, knot.y - hand.y);
        this.vineLeaves.forEach((leaf) => {
            if (span < 36) {
                leaf.style.display = "none";
                return;
            }
            leaf.style.display = "";
            const at = this.curvePoint(hand, control, knot, leaf._along);
            const ahead = this.curvePoint(hand, control, knot, Math.min(1, leaf._along + 0.08));
            const angle = Math.atan2(ahead.y - at.y, ahead.x - at.x) * 180 / Math.PI;
            leaf.setAttribute("transform", "translate(" + at.x + " " + at.y + ") rotate(" + angle + ")");
        });
    }

    curvePoint(start, control, end, t) {
        const u = 1 - t;
        return {
            x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
            y: u * u * start.y + 2 * u * t * control.y + t * t * end.y
        };
    }

    showPartnerName() {
        const label = centerText(this.partnerName, 0, -(this.partner.height + 8), 8, "partner-name");
        label.setAttribute("stroke", "#ffffff");
        label.setAttribute("stroke-width", "1.4");
        label.setAttribute("paint-order", "stroke fill");
        this.partner.root.appendChild(label);
        this.partnerLabel = label;
    }

    fadePartnerName() {
        const label = this.partnerLabel;
        if (!label) return;
        tween(GenParam.fadeMs, (t) => {
            label.style.opacity = String(1 - t);
        }, () => this.alive).then(() => {
            if (label.parentNode) label.remove();
        });
    }

    prepareAloneProps() {
        const broom = this.scene.querySelector("#broom");
        const leafSet = this.scene.querySelector("#fallen_leaves");
        if (broom) broom.remove();
        if (leafSet) leafSet.remove();
        if (this.trial.socialCondition !== "alone") return;
        this.partnerLadder.group.style.display = "none";
        const spot = this.pointIn(this.scene, this.scene.querySelector("#partner_starting_point"));
        this.partner.setFeet(clamp(spot.x, this.minX, this.maxX), spot.y);
        this.partner.setPose("back");
        this.partnerIdle = true;
    }

    updatePartnerIdle(now) {
        if (!this.partnerIdle || !this.t0) return;
        const cycle = 2400;
        const u = ((now - this.t0) % cycle) / cycle;
        let angle = 0;
        if (u > 0.7 && u < 0.94) {
            const w = (u - 0.7) / 0.24;
            angle = Math.sin(w * Math.PI * 2) * 2.2;
        }
        this.partner.root.setAttribute("transform", "translate(" + this.partner.x + " " + this.partner.y + ") rotate(" + angle + ")");
    }

    async walkTo(actor, x, y, speed) {
        if (Math.abs(x - actor.x) > 1) actor.setPose(x < actor.x ? "left" : "right");
        const distance = Math.hypot(x - actor.x, y - actor.y);
        if (distance < 0.5) {
            actor.setFeet(x, y);
            return;
        }
        await this.moveActor(actor, x, y, distance / (speed || this.speed) * 1000);
    }

    moveActor(actor, x, y, ms) {
        const fromX = actor.x;
        const fromY = actor.y;
        return tween(ms, (t) => actor.setFeet(lerp(fromX, x, t), lerp(fromY, y, t)), () => this.alive && !this.resolved);
    }

    enableApplesIfReady() {
        if (!this.climbDone || !this.branchDone || this.resolved) return;
        const starting = this.phase !== "pick";
        this.phase = "pick";
        this.apples.forEach((apple) => apple.classList.add("apple-ready"));
        if (starting && this.trial.practice) this.showPracticeBubble("apples");
    }

    pickApple(apple, event) {
        event.stopPropagation();
        if (this.resolved || !apple.classList.contains("apple-ready") || apple.dataset.picked === "1") return;
        apple.dataset.picked = "1";
        apple.classList.remove("apple-ready");
        apple.style.pointerEvents = "none";
        apple.style.transition = "opacity " + GenParam.appleFadeMs + "ms linear";
        apple.style.opacity = "0";
        this.picked += 1;
        if (this.picked >= this.apples.length) this.succeed();
    }

    updateTimer(now) {
        if (this.clockPaused) return;
        const elapsed = now - this.t0;
        const remaining = 1 - elapsed / StimulusSettings.trialTimeoutMs;
        this.ring.setAttribute("stroke-dashoffset", String(this.clockLength * (1 - Math.max(0, remaining))));
        if (elapsed >= StimulusSettings.trialTimeoutMs) this.fail();
    }

    succeed() {
        if (this.resolved) return;
        this.resolved = true;
        this.phase = "resolve";
        if (this.bubble) this.bubble.hide(true);
        this.clock.remove();
        const result = {
            completionTimeMs: this.elapsedMs(),
            rewardObtained: true
        };
        this.onOutcome(result);
        this.playReward().then(() => this.close(result));
    }

    fail() {
        if (this.resolved) return;
        this.resolved = true;
        this.phase = "resolve";
        if (this.bubble) this.bubble.hide(true);
        this.clock.remove();
        const result = {
            completionTimeMs: this.elapsedMs(),
            rewardObtained: false
        };
        this.onOutcome(result);
        this.playFail().then(() => this.close(result));
    }

    async playReward() {
        const centerX = GenParam.screen.width / 2;
        const centerY = GenParam.screen.height / 2;
        const fromX = this.medalX;
        const fromY = this.medalY;
        const fade = GenParam.fadeMs / 2;
        await tween(fade, (t) => { this.mask.style.opacity = String(t); }, () => this.alive);
        await tween(fade, (t) => {
            this.mask.setAttribute("fill", lerpHex(GenParam.colors.mask, "#ffffff", t));
        }, () => this.alive);
        await tween(GenParam.rewardMoveMs / 2, (t) => {
            this.placeMedal(lerp(fromX, centerX, t), lerp(fromY, centerY, t), lerp(1, 3, t));
        }, () => this.alive);
        spawnSparkles(this.root, centerX, centerY);
        await tween(240, (t) => {
            const scale = 3 * (1 + 0.16 * Math.sin(t * Math.PI));
            this.medalSpin.setAttribute("transform", "translate(" + centerX + " " + centerY + ") scale(" + scale + ")");
        }, () => this.alive);
        await wait(GenParam.rewardHoldMs / 2);
    }

    async playFail() {
        this.medalInner.classList.add("medal-fail");
        await Promise.all([
            tween(GenParam.failMedalMs, (t) => { this.medalSpin.style.opacity = String(1 - t); }, () => this.alive),
            tween(GenParam.fadeMs, (t) => { this.mask.style.opacity = String(t); }, () => this.alive)
        ]);
    }

    close(result) {
        if (!this.alive) return;
        this.alive = false;
        if (this.bubble) this.bubble.hide(true);
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        window.removeEventListener("blur", this.onBlur);
        this.root.remove();
        this.finish(result);
    }
}
