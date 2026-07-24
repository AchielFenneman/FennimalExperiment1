class PhoneRoomController {
    constructor(expCont, worldState, instructionsController) {
        this.expCont = expCont;
        this.worldState = worldState;
        this.instructionsController = instructionsController;

        this.parentLayer = document.getElementById("Fennimals_Layer");
        this.mapLayer = document.getElementById("Map");
        this.interfaceLayer = document.getElementById("Interface");

        this.roomGroup = null;
        this.phoneGroup = null;
        this.phoneHandle = null;
        this.phoneAnswerLabel = null;
        this.partnerGroup = null;
        this.ringInterval = null;
        this.currentTrialObj = null;
        this.ringStartTimeout = null;
        this.phoneAnsweredCallback = null;

        this.attentionGroup = null;
        this.attentionPulseGroup = null;
        this.phoneRippleInterval = null;
        this.answerDimOverlay = null;
    }

    showRoom(trialObj, phoneAnsweredCallback) {
        this.clear();

        this.currentTrialObj = trialObj;
        this.phoneAnsweredCallback = phoneAnsweredCallback;

        this.mapLayer.style.display = "none";
        this.interfaceLayer.style.display = "none";
        this.parentLayer.style.display = "inherit";

        this.roomGroup = create_SVG_group(0, 0, "phone_room_scene", "PhoneRoomScene");
        this.parentLayer.appendChild(this.roomGroup);

        this.createPlaceholderBackground();
        this.createPartnerIfPresent();
        this.createPlaceholderTable();
        this.createPhone();
        this.createPhoneAttentionIndicator();

        this.ringStartTimeout = setTimeout(() => {
            this.ringStartTimeout = null;
            this.startRinging();
        }, GenParam.PhoneRoom.ringStartDelay);
    }

    createPlaceholderBackground() {
        let background = document.createElementNS("http://www.w3.org/2000/svg", "image");
        background.setAttribute("href", "./Locations/Home_warehouse.png");
        background.setAttribute("width", "100%");
        background.setAttribute("height", "100%");
        background.setAttribute("preserveAspectRatio", "none");
        this.roomGroup.appendChild(background);

        let bgMask = create_SVG_rect(0, 0, GenParam.SVG_width, GenParam.SVG_height, undefined, undefined);
        bgMask.style.fill = "white";
        bgMask.style.opacity = 0.3;
        bgMask.style.pointerEvents = "none";
        this.roomGroup.appendChild(bgMask);
    }

    createPartnerIfPresent() {
        let role = this.worldState.get_current_partner_role();
        if (!role || role === "absent") return;

        this.partnerGroup = create_SVG_group(0, 0, undefined, undefined);
        let partnerIcon = this.worldState.get_person_icon("partner", "front");
        partnerIcon.style.transform = `scale(${GenParam.PhoneRoom.partnerScale})`;

        this.partnerGroup.appendChild(partnerIcon);
        this.roomGroup.appendChild(this.partnerGroup);

        setTimeout(() => {
            moveSVGCenterTo(
                this.partnerGroup,
                GenParam.PhoneRoom.partnerCenter.x,
                GenParam.PhoneRoom.partnerCenter.y
            );
        }, 0);
    }

    createPlaceholderTable() {
        let table = create_SVG_rect(
            GenParam.PhoneRoom.table.x,
            GenParam.PhoneRoom.table.y,
            GenParam.PhoneRoom.table.width,
            GenParam.PhoneRoom.table.height,
            undefined,
            undefined
        );
        table.style.fill = GenParam.PhoneRoom.tableColor;
        table.style.stroke = "#4b2e1f";
        table.style.strokeWidth = "8px";
        table.style.rx = "35px";
        this.roomGroup.appendChild(table);

        let tableFront = create_SVG_rect(
            GenParam.PhoneRoom.table.x,
            GenParam.PhoneRoom.table.y + GenParam.PhoneRoom.table.height * 0.55,
            GenParam.PhoneRoom.table.width,
            GenParam.PhoneRoom.table.height * 0.45,
            undefined,
            undefined
        );
        tableFront.style.fill = GenParam.PhoneRoom.tableFrontColor;
        tableFront.style.rx = "25px";
        this.roomGroup.appendChild(tableFront);
    }

    createPhone() {
        const phoneTemplate = document.getElementById("phone");
        const phoneScale = 1.5;
        const { x: centerX, y: centerY } = GenParam.PhoneRoom.phoneCenter;

        this.phoneGroup = copy_scale_and_move_object_to_position(
            phoneTemplate,
            this.roomGroup,
            centerX,
            centerY,
            phoneScale,
            "phone_room_phone"
        );

        this.phoneHandle = this.phoneGroup.querySelector(".phone_handle");
        if (this.phoneHandle) {
            this.phoneHandle.style.transformBox = "fill-box";
            this.phoneHandle.style.transformOrigin = "50% 50%";
        }

        this.phoneGroup.style.cursor = "pointer";
        this.phoneGroup.onpointerdown = () => this.answerPhone();

        this.phoneAnswerLabel = create_SVG_text_elem(
            centerX,
            centerY + 145,
            "Click to answer",
            "phone_room_answer_label",
            "phone_room_answer_label"
        );
        this.phoneAnswerLabel.style.textAnchor = "middle";
        this.phoneAnswerLabel.style.fontSize = "34px";
        this.phoneAnswerLabel.style.fontWeight = 700;
        this.phoneAnswerLabel.style.fill = "#1f2933";
        this.phoneAnswerLabel.style.cursor = "pointer";
        this.phoneAnswerLabel.onpointerdown = () => this.answerPhone();
        this.roomGroup.appendChild(this.phoneAnswerLabel);
    }

    createPhoneAttentionIndicator() {
        if (!GenParam.PhoneRoomFlair.showExclamationMark || !this.roomGroup) return;

        this.attentionGroup = create_SVG_group(0, 0, "phone_room_attention", undefined);
        this.attentionGroup.style.pointerEvents = "none";
        this.attentionGroup.style.transform = `translate(${GenParam.PhoneRoom.phoneCenter.x}px, ${GenParam.PhoneRoom.phoneCenter.y}px)`;

        let pulseGroup = create_SVG_group(0, 0, undefined, "PhoneRoomAttention");
        pulseGroup.style.pointerEvents = "none";
        pulseGroup.style.transformOrigin = "0px -30px";

        let bar = create_SVG_rect(-15, -188, 30, 76, undefined, undefined);
        bar.style.fill = "#FFE566";
        bar.style.stroke = "#1f2937";
        bar.style.strokeWidth = "6px";
        bar.style.rx = "15px";
        bar.style.pointerEvents = "none";

        let dot = create_SVG_circle(0, -98, 12, undefined, undefined);
        dot.style.fill = "#FFE566";
        dot.style.stroke = "#1f2937";
        dot.style.strokeWidth = "6px";
        dot.style.pointerEvents = "none";

        let highlight = create_SVG_rect(-7, -176, 9, 44, undefined, undefined);
        highlight.style.fill = "rgba(255, 255, 255, 0.42)";
        highlight.style.rx = "4px";
        highlight.style.pointerEvents = "none";

        pulseGroup.appendChild(bar);
        pulseGroup.appendChild(dot);
        pulseGroup.appendChild(highlight);
        this.attentionGroup.appendChild(pulseGroup);
        this.attentionPulseGroup = pulseGroup;
        this.roomGroup.appendChild(this.attentionGroup);
    }

    startPhoneAttentionSignal() {
        const pulseTime = `${GenParam.PhoneRoomFlair.attentionPulseTime}ms`;

        if (this.attentionPulseGroup) {
            this.attentionPulseGroup.style.setProperty("--phone-room-attention-pulse-time", pulseTime);
            this.attentionPulseGroup.classList.add("phone_room_attention_active");
        }

        if (this.phoneAnswerLabel) {
            this.phoneAnswerLabel.style.setProperty("--phone-room-attention-pulse-time", pulseTime);
            this.phoneAnswerLabel.classList.add("phone_room_attention_active");
        }
    }

    stopPhoneAttentionSignal() {
        if (this.attentionPulseGroup) {
            this.attentionPulseGroup.classList.remove("phone_room_attention_active");
        }

        if (this.phoneAnswerLabel) {
            this.phoneAnswerLabel.classList.remove("phone_room_attention_active");
        }
    }

    spawnPhoneRipple() {
        if (!GenParam.PhoneRoomFlair.showPhoneRipples || !this.roomGroup || !this.phoneGroup) return;

        let ripple = create_SVG_circle(
            GenParam.PhoneRoom.phoneCenter.x,
            GenParam.PhoneRoom.phoneCenter.y - 45,
            GenParam.PhoneRoomFlair.phoneRippleStartRadius,
            "phone_room_ripple",
            undefined
        );

        ripple.style.fill = "none";
        ripple.style.stroke = GenParam.PhoneRoomFlair.phoneRippleColor;
        ripple.style.strokeWidth = `${GenParam.PhoneRoomFlair.phoneRippleStrokeWidth}px`;
        ripple.style.opacity = GenParam.PhoneRoomFlair.phoneRippleOpacity;
        ripple.style.pointerEvents = "none";

        this.roomGroup.insertBefore(ripple, this.phoneGroup);

        setTimeout(() => {
            ripple.style.transition = `all ${GenParam.PhoneRoomFlair.phoneRippleDuration}ms cubic-bezier(0.1, 0.8, 0.3, 1)`;
            ripple.setAttribute("r", GenParam.PhoneRoomFlair.phoneRippleMaxRadius);
            ripple.style.strokeWidth = "2px";
            ripple.style.opacity = 0;
        }, 10);

        setTimeout(() => ripple.remove(), GenParam.PhoneRoomFlair.phoneRippleDuration + 100);
    }

    createAnswerDimOverlay() {
        if (!GenParam.PhoneRoomFlair.dimRoomOnAnswer || !this.roomGroup) return;

        this.answerDimOverlay = create_SVG_rect(0, 0, GenParam.SVG_width, GenParam.SVG_height, undefined, undefined);
        this.answerDimOverlay.style.fill = "rgba(0, 0, 0, 0)";
        this.answerDimOverlay.style.pointerEvents = "none";
        this.answerDimOverlay.style.transition = `fill ${GenParam.PhoneRoomFlair.answerDimTime}ms ease-in-out`;
        this.roomGroup.appendChild(this.answerDimOverlay);

        setTimeout(() => {
            if (this.answerDimOverlay) {
                this.answerDimOverlay.style.fill = "rgba(0, 0, 0, 0.28)";
            }
        }, 10);
    }

    startRinging() {
        this.stopRinging();

        const ringOnce = () => {
            AudioCont.play_sound_effect("phone_ring");

            if (this.phoneHandle) {
                this.phoneHandle.animate([
                    { transform: "translate(0px, 0px) rotate(0deg)" },
                    { transform: "translate(-8px, 0px) rotate(-4deg)" },
                    { transform: "translate(8px, 0px) rotate(4deg)" },
                    { transform: "translate(0px, 0px) rotate(0deg)" }
                ], {
                    duration: GenParam.PhoneRoom.phoneShakeDuration,
                    iterations: 2,
                    easing: "ease-in-out"
                });
            }

            this.spawnPhoneRipple();
        };

        this.startPhoneAttentionSignal();

        ringOnce();
        this.ringInterval = setInterval(() => {
            ringOnce();
        }, GenParam.PhoneRoom.phoneRingInterval);

        if (GenParam.PhoneRoomFlair.showPhoneRipples) {
            this.phoneRippleInterval = setInterval(() => {
                this.spawnPhoneRipple();
            }, GenParam.PhoneRoomFlair.phoneRippleInterval);
        }
    }

    stopRinging() {
        if (this.ringInterval) {
            clearInterval(this.ringInterval);
            this.ringInterval = null;
        }

        if (this.phoneRippleInterval) {
            clearInterval(this.phoneRippleInterval);
            this.phoneRippleInterval = null;
        }

        this.stopPhoneAttentionSignal();
    }

    answerPhone() {
        if (!this.phoneGroup) return;

        this.phoneGroup.onpointerdown = null;
        this.phoneGroup.style.cursor = "auto";

        if (this.phoneAnswerLabel) {
            this.phoneAnswerLabel.onpointerdown = null;
            this.phoneAnswerLabel.style.cursor = "auto";
        }
        this.stopRinging();

        AudioCont.play_sound_effect("button_click");

        this.phoneGroup.animate([
            { transform: `translate(${GenParam.PhoneRoom.phoneCenter.x}px, ${GenParam.PhoneRoom.phoneCenter.y}px) scale(1)` },
            { transform: `translate(${GenParam.PhoneRoom.phoneCenter.x}px, ${GenParam.PhoneRoom.phoneCenter.y}px) scale(1.08)` },
            { transform: `translate(${GenParam.PhoneRoom.phoneCenter.x}px, ${GenParam.PhoneRoom.phoneCenter.y}px) scale(1)` }
        ], {
            duration: GenParam.PhoneRoomFlair.answerDimTime,
            easing: "ease-out"
        });

        this.createAnswerDimOverlay();

        setTimeout(() => {
            if (this.phoneAnsweredCallback) {
                this.phoneAnsweredCallback(this.currentTrialObj);
            }
        }, GenParam.PhoneRoomFlair.answerDimTime);
    }


    exitRoomBeforeMap(onComplete) {
        if (!this.roomGroup) {
            if (onComplete) onComplete();
            return;
        }

        const fadeOutRoom = () => {
            this.roomGroup.style.transition = `opacity ${GenParam.PhoneRoom.roomFadeTime}ms ease-in-out`;
            this.roomGroup.style.opacity = 0;

            setTimeout(() => {
                this.clear();
                // Hide Fennimals_Layer after clearing so orphans cannot cover the map.
                if (this.parentLayer) this.parentLayer.style.display = "none";
                this.mapLayer.style.display = "inherit";
                this.interfaceLayer.style.display = "inherit";
                if (onComplete) onComplete();
            }, GenParam.PhoneRoom.roomFadeTime);
        };

        if (this.partnerGroup) {
            this.animatePartnerExit(fadeOutRoom);
        } else {
            fadeOutRoom();
        }
    }

    animatePartnerExit(onComplete) {
        if (!this.partnerGroup) {
            onComplete();
            return;
        }

        this.partnerGroup.innerHTML = "";
        let partnerIcon = this.worldState.get_person_icon("partner", "left");
        partnerIcon.style.transform = `scale(${GenParam.PhoneRoom.partnerScale})`;
        this.partnerGroup.appendChild(partnerIcon);

        let startTransform = `translate(${GenParam.PhoneRoom.partnerCenter.x}px, ${GenParam.PhoneRoom.partnerCenter.y}px)`;
        let endTransform = `translate(${GenParam.PhoneRoom.partnerExitX}px, ${GenParam.PhoneRoom.partnerCenter.y}px)`;

        this.partnerGroup.style.transform = startTransform;

        setTimeout(() => {
            this.partnerGroup.classList.add("phone_room_partner_exiting");
            this.partnerGroup.style.transition = `transform ${GenParam.PhoneRoom.partnerExitTime}ms ease-in-out, opacity 300ms ease-in ${Math.max(0, GenParam.PhoneRoom.partnerExitTime - 300)}ms`;
            this.partnerGroup.style.transform = endTransform;
            this.partnerGroup.style.opacity = 0;
        }, GenParam.PhoneRoomFlair.polishPartnerExit ? GenParam.PhoneRoomFlair.partnerTurnPause : 0);

        setTimeout(
            onComplete,
            GenParam.PhoneRoom.partnerExitTime + (GenParam.PhoneRoomFlair.polishPartnerExit ? GenParam.PhoneRoomFlair.partnerTurnPause : 0)
        );
    }

    clear() {
        this.stopRinging();

        if (this.ringStartTimeout) {
            clearTimeout(this.ringStartTimeout);
            this.ringStartTimeout = null;
        }

        if (this.roomGroup) {
            this.roomGroup.remove();
            this.roomGroup = null;
        }

        this.phoneGroup = null;
        this.phoneHandle = null;
        this.phoneAnswerLabel = null;
        this.partnerGroup = null;
        this.currentTrialObj = null;
        this.phoneAnsweredCallback = null;
        this.attentionGroup = null;
        this.attentionPulseGroup = null;
        this.phoneRippleInterval = null;
        this.answerDimOverlay = null;
    }
}

console.log("%c SCRIPTS - LOADED PHONE ROOM CONTROLLER", "color:darkgreen");
console.log("Go!")