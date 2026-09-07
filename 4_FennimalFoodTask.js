/**
 * Two-bag snack encounters.
 *   Fennimal_food          — C/D learning: comfort, both bags, wrong snaps back, eat.
 *   Fennimal_food_transfer — A: empty scene, simultaneous C/D matching overlay,
 *                            A appears, comfort, 2AFC with no eat / no feedback.
 */
class FennimalFoodTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;
        this.params = (typeof GenParam !== "undefined" && GenParam.FennimalFood)
            ? GenParam.FennimalFood
            : {};
        this.basics = new BasicElementsModule(FenObj);
        this.isTransfer = FenObj.interaction_type === "Fennimal_food_transfer";
        this.flavor = FenObj.food_preference;
        this.choiceFlavors = Array.isArray(FenObj.food_choice_flavors)
            ? FenObj.food_choice_flavors.slice()
            : (this.flavor ? [this.flavor] : []);
        this.bags = [];
        this.dragControllers = [];
        this.dragLayer = null;
        this.dropLocked = false;
        this.trialComplete = false;
        this.overlayGroup = null;
        this.quizSlots = [];
        this.placedQuizFlavors = {};
        this.quizArmedAt = null;
        this.transferArmedAt = null;
        this._pendingHit = null;
    }

    flavor_label(flavor) {
        return capitalize_first_letter_in_string(String(flavor || "food"));
    }

    extract_flavor_accent_color(flavor) {
        let flavorEl = document.getElementById("foodbag_flavor_" + flavor);
        if (!flavorEl) return "#892ca0";
        let fill = flavorEl.getAttribute("fill");
        if (fill && fill !== "none") return fill;
        let painted = flavorEl.querySelector("[fill]:not([fill='none'])");
        if (painted) {
            let childFill = painted.getAttribute("fill");
            if (childFill && childFill !== "none") return childFill;
        }
        return "#892ca0";
    }

    create_foodbag(flavor, parent, x, y, scale) {
        let template = document.getElementById("foodbag");
        if (!template) {
            throw new Error("FennimalFood: missing #foodbag template in Items.svg.");
        }
        let bag = copy_scale_and_move_object_to_position(template, parent, x, y, scale);
        Array.from(bag.getElementsByClassName("foodbag_flavor")).forEach((flavorNode) => {
            let nodeFlavor = (flavorNode.id || "").split("_")[2];
            if (nodeFlavor !== flavor) {
                flavorNode.remove();
            } else {
                flavorNode.style.display = "inherit";
                flavorNode.removeAttribute("display");
            }
        });
        let accent = this.extract_flavor_accent_color(flavor);
        bag.querySelectorAll(".foodbag_color").forEach((swatch) => {
            swatch.setAttribute("fill", accent);
            swatch.style.fill = accent;
        });
        bag.dataset.feedFlavor = flavor;
        return bag;
    }

    get_svg_bounds(element) {
        const svg = element && element.ownerSVGElement;
        if (!element || !svg) {
            return { left: 0, top: 0, right: 0, bottom: 0 };
        }
        try {
            const r = element.getBoundingClientRect();
            const screenCTM = svg.getScreenCTM();
            if (!screenCTM) throw new Error("no screen CTM");
            const inv = screenCTM.inverse();
            const toSvg = (x, y) => {
                const pt = svg.createSVGPoint();
                pt.x = x;
                pt.y = y;
                return pt.matrixTransform(inv);
            };
            const a = toSvg(r.left, r.top);
            const b = toSvg(r.right, r.bottom);
            return {
                left: Math.min(a.x, b.x),
                top: Math.min(a.y, b.y),
                right: Math.max(a.x, b.x),
                bottom: Math.max(a.y, b.y)
            };
        } catch (err) {
            let box = element.getBBox();
            return {
                left: box.x,
                top: box.y,
                right: box.x + box.width,
                bottom: box.y + box.height
            };
        }
    }

    point_over_element(event, element, pad) {
        if (!element) return false;
        let mouse = getMousePosition(event);
        let b = this.get_svg_bounds(element);
        let extra = pad != null ? pad : (this.params.dropPad != null ? this.params.dropPad : 48);
        return mouse.x >= b.left - extra && mouse.x <= b.right + extra
            && mouse.y >= b.top - extra && mouse.y <= b.bottom + extra;
    }

    place_fennimal_svg(fenObj, parent, centerX, baseY, scale) {
        let el = create_Fennimal_SVG_object(fenObj, GenParam.Fennimal_head_size, false);
        parent.appendChild(el);
        let scaleGroup = el.getElementsByClassName("Fennimal_scale_group")[0];
        if (scaleGroup) {
            scaleGroup.style.transform = "scale(" + scale + ")";
            scaleGroup.style.transformOrigin = "50% 100%";
            scaleGroup.style.transformBox = "fill-box";
        }
        let box = el.getBBox();
        let dx = centerX - (box.x + 0.5 * box.width);
        let dy = baseY - (box.y + box.height);
        el.style.transform = "translate(" + dx + "px, " + dy + "px)";
        el.style.pointerEvents = "none";
        return el;
    }

    reset_bag_home(info) {
        if (!info || !info.elem) return;
        info.elem.style.transition = "";
        info.elem.style.transform = "translate(" + info.homeX + "px, " + info.homeY + "px)";
    }

    async move_bag_to(info, x, y, time) {
        if (!info || !info.elem) return;
        info.homeX = x;
        info.homeY = y;
        info.elem.style.transition = time
            ? ("transform " + time + "ms ease-in-out")
            : "";
        info.elem.style.transform = "translate(" + x + "px, " + y + "px)";
        if (time) await wait(time);
        info.elem.style.transition = "";
    }

    destroy_all_drag_controllers() {
        this.dragControllers.forEach((c) => {
            if (c && c.destroy) c.destroy();
        });
        this.dragControllers = [];
        this.bags.forEach((b) => { b.dragController = null; });
    }

    find_bag_info(elem) {
        return this.bags.find((b) => b.elem === elem);
    }

    spawn_bag_pair(flavors, leftX, rightX, y, parent) {
        const p = this.params;
        let scale = p.bagScale != null ? p.bagScale : 3.2;
        let xs = [leftX, rightX];
        this.bags = [];
        this.dragLayer = parent || this.basics.ItemLayers.Plus2;
        flavors.forEach((flavor, i) => {
            let x = xs[i];
            let bag = this.create_foodbag(flavor, this.dragLayer, x, y, scale);
            bag.style.opacity = 0;
            window.getComputedStyle(bag).opacity;
            bag.style.transition = "opacity 220ms ease-out";
            bag.style.opacity = 1;
            this.bags.push({
                elem: bag,
                flavor: flavor,
                homeX: x,
                homeY: y,
                placed: false
            });
        });
    }

    enable_bag_dragging(getHit) {
        this.destroy_all_drag_controllers();
        this.bags.forEach((bagInfo) => {
            if (!bagInfo.elem || !bagInfo.elem.parentNode || bagInfo.placed) return;
            let dummyTarget = bagInfo.elem;
            let controller = MakeObjectDraggableObject(
                this.dragLayer || this.basics.ItemLayers.Plus2,
                this.basics.ItemLayers.Questions,
                bagInfo.elem,
                dummyTarget,
                9999,
                (elem) => this.on_bag_dropped(elem),
                {
                    onMiss: (elem) => this.on_bag_miss(elem),
                    validateDrop: (dist, event) => {
                        this._pendingHit = getHit(event);
                        return !!this._pendingHit;
                    }
                }
            );
            this.dragControllers.push(controller);
            bagInfo.dragController = controller;
        });
    }

    on_bag_miss(elem) {
        if (this.trialComplete) return;
        let info = this.find_bag_info(elem);
        if (!info || info.placed) return;
        this.destroy_all_drag_controllers();
        this.reset_bag_home(info);
        this.rearm_dragging();
    }

    on_bag_dropped(elem) {
        if (this.trialComplete || this.dropLocked) return;
        let info = this.find_bag_info(elem);
        let hit = this._pendingHit;
        this._pendingHit = null;
        if (!info || info.placed) return;
        this.dropLocked = true;
        Promise.resolve(this.handle_bag_drop(info, hit)).then(() => {
            if (!this.trialComplete) this.dropLocked = false;
        }).catch((err) => {
            console.error(err);
            this.dropLocked = false;
        });
    }

    rearm_dragging() {
        if (this.isTransfer && this.overlayGroup) {
            this.enable_bag_dragging((event) => this.hit_quiz_slot(event));
        } else if (this.isTransfer) {
            this.enable_bag_dragging((event) => this.hit_target_fennimal(event));
        } else {
            this.enable_bag_dragging((event) => this.hit_target_fennimal(event));
        }
    }

    hit_target_fennimal(event) {
        if (!this.basics.Fennimal) return null;
        if (!this.point_over_element(event, this.basics.Fennimal)) return null;
        return { id: this.FenObj.id, el: this.basics.Fennimal, flavor: this.flavor };
    }

    hit_quiz_slot(event) {
        for (let i = 0; i < this.quizSlots.length; i++) {
            let slot = this.quizSlots[i];
            if (this.point_over_element(event, slot.el)) return slot;
        }
        return null;
    }

    now_ms() {
        return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    }

    log_food_error(flavor, targetId) {
        if (!Array.isArray(this.FenObj.food_errors_made)) this.FenObj.food_errors_made = [];
        this.FenObj.food_errors_made.push({
            flavor: flavor,
            target: targetId,
            t: Math.round(this.now_ms())
        });
    }

    log_quiz_error(flavor, targetId) {
        if (!Array.isArray(this.FenObj.quiz_errors)) this.FenObj.quiz_errors = [];
        this.FenObj.quiz_errors.push({
            flavor: flavor,
            target: targetId,
            t: Math.round(this.now_ms() - (this.quizArmedAt || this.now_ms()))
        });
    }

    async handle_bag_drop(info, hit) {
        if (!hit) {
            this.destroy_all_drag_controllers();
            this.reset_bag_home(info);
            this.rearm_dragging();
            return;
        }

        if (this.overlayGroup) {
            await this.handle_quiz_drop(info, hit);
            return;
        }

        if (this.isTransfer) {
            await this.handle_transfer_drop(info);
            return;
        }

        await this.handle_learning_drop(info, hit);
    }

    async handle_learning_drop(info) {
        if (info.flavor !== this.flavor) {
            AudioCont.play_sound_effect("rejected");
            this.log_food_error(info.flavor, this.FenObj.id);
            Interface.Prompt.show_message("That's not what " + this.FenObj.name + " likes!");
            this.destroy_all_drag_controllers();
            this.reset_bag_home(info);
            this.rearm_dragging();
            return;
        }
        this.trialComplete = true;
        this.destroy_all_drag_controllers();
        await this.handle_correct_feed(info);
    }

    async handle_quiz_drop(info, hit) {
        let correctFlavor = hit.flavor;
        if (info.flavor !== correctFlavor || this.placedQuizFlavors[hit.id]) {
            AudioCont.play_sound_effect("rejected");
            this.log_quiz_error(info.flavor, hit.id);
            this.destroy_all_drag_controllers();
            this.reset_bag_home(info);
            this.rearm_dragging();
            return;
        }

        AudioCont.play_sound_effect("success");
        info.placed = true;
        this.placedQuizFlavors[hit.id] = info.flavor;
        this.destroy_all_drag_controllers();
        let restX = hit.side === "left"
            ? hit.x + 0.08 * this.basics.W
            : hit.x - 0.08 * this.basics.W;
        await this.move_bag_to(info, restX, hit.y - 40, this.params.bagMoveTime || 280);

        let bothPlaced = this.quizSlots.every((slot) => this.placedQuizFlavors[slot.id]);
        if (!bothPlaced) {
            this.rearm_dragging();
            return;
        }

        this.FenObj.quiz_rt_ms = Math.round(this.now_ms() - (this.quizArmedAt || this.now_ms()));
        let cx = 0.5 * this.basics.W;
        let cy = 0.42 * this.basics.H;
        await spawn_confetti_burst(this.basics.ItemLayers.Questions, cx, cy, { awaitPopMs: 700 });
        await wait(250);
        if (this.overlayGroup) {
            this.overlayGroup.style.transition = "opacity 280ms ease-out";
            this.overlayGroup.style.opacity = 0;
            await wait(280);
            this.overlayGroup.remove();
            this.overlayGroup = null;
        }
        this.bags.forEach((b) => { if (b.elem) b.elem.remove(); });
        this.bags = [];
        this.quizSlots = [];
        if (this._quizResolve) {
            this._quizResolve();
            this._quizResolve = null;
        }
    }

    async handle_transfer_drop(info) {
        this.trialComplete = true;
        this.destroy_all_drag_controllers();
        this.FenObj.chosen_flavor = info.flavor;
        this.FenObj.chose_in_triad = info.flavor === this.FenObj.flavor_in;
        this.FenObj.transfer_rt_ms = Math.round(this.now_ms() - (this.transferArmedAt || this.now_ms()));
        let earnable = (typeof this.FenObj.bonus_stars_earnable === "number")
            ? this.FenObj.bonus_stars_earnable
            : 2;
        this.FenObj.bonus_stars_earned = this.FenObj.chose_in_triad ? earnable : 0;

        let mouth = this.basics.TargetPoints.Fennimal_mouth
            ? getSVGInternalCenter(this.basics.TargetPoints.Fennimal_mouth)
            : getSVGInternalCenter(this.basics.Fennimal);
        await this.move_bag_to(info, mouth.x, mouth.y + 40, 280);
        await this.fade_scene_out();
        this.returnfunc();
    }

    async handle_correct_feed(correctBag) {
        AudioCont.play_sound_effect("success");
        this.bags.forEach((b) => {
            if (b === correctBag || !b.elem) return;
            b.elem.style.transition = "opacity 280ms ease-out";
            b.elem.style.opacity = 0;
            b.elem.style.pointerEvents = "none";
        });
        let mouth = this.basics.TargetPoints.Fennimal_mouth
            ? getSVGInternalCenter(this.basics.TargetPoints.Fennimal_mouth)
            : getSVGInternalCenter(this.basics.Fennimal);
        await this.move_bag_to(
            correctBag,
            mouth.x,
            mouth.y + 20,
            this.params.eatMoveTime || 420
        );
        correctBag.elem.style.transition = "opacity 180ms ease-out";
        correctBag.elem.style.opacity = 0;
        if (AudioCont.play_sound_effect) {
            try { AudioCont.play_sound_effect("chew"); } catch (err) { /* optional */ }
        }
        Interface.Prompt.show_message(
            this.FenObj.name + " loves " + this.flavor_label(this.flavor) + "!"
        );
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this.basics.spawn_happy_heart(
                    mouth.x + (Math.random() - 0.5) * 50,
                    mouth.y - 20,
                    this.basics.ItemLayers.Plus2
                );
            }, i * 90);
        }
        await wait(400);
        await this.basics.perform_success_celebration(null);
        await wait(600);
        Interface.Prompt.show_message(this.FenObj.name + " has wandered off...");
        let fenCenter = getSVGInternalCenter(this.basics.Fennimal);
        await this.basics.Fennimal_move_relative(-(fenCenter.x + 300), 0, 750);
        await wait(400);
        this.returnfunc();
    }

    async fade_scene_out() {
        let fadeTargets = [];
        if (this.basics.Fennimal) fadeTargets.push(this.basics.Fennimal);
        this.bags.forEach((b) => { if (b.elem) fadeTargets.push(b.elem); });
        fadeTargets.forEach((el) => {
            el.style.transition = "opacity 450ms ease-out";
            el.style.opacity = 0;
            el.style.pointerEvents = "none";
        });
        await wait(480);
    }

    async run_learning_trial() {
        if (!this.flavor) {
            throw new Error('FennimalFood: Fennimal "' + this.FenObj.id + '" has no food_preference.');
        }
        if (!this.choiceFlavors.length) this.choiceFlavors = [this.flavor];
        const p = this.params;
        await this.basics.create_and_appear_Fennimal(
            this.basics.ItemLayers.Main,
            (p.fennimalX != null ? p.fennimalX : 0.38) * this.basics.W,
            (p.fennimalY != null ? p.fennimalY : 0.82) * this.basics.H,
            p.fennimalScale != null ? p.fennimalScale : 1.75,
            250
        );
        Interface.Prompt.show_message(
            this.FenObj.name + " is hungry. Click on " + this.FenObj.name + " to comfort them!"
        );
        await this.basics.trigger_comfort_checkin();
        await wait(300);

        let leftX = (p.bagLeftX != null ? p.bagLeftX : 0.68) * this.basics.W;
        let rightX = (p.bagRightX != null ? p.bagRightX : 0.86) * this.basics.W;
        let bagY = (p.bagY != null ? p.bagY : 0.72) * this.basics.H;
        this.spawn_bag_pair(this.choiceFlavors, leftX, rightX, bagY, this.basics.ItemLayers.Plus2);
        Interface.Prompt.show_message(
            this.FenObj.name + " likes " + this.flavor_label(this.flavor) +
            ". Drag that bag onto " + this.FenObj.name + "!"
        );
        AudioCont.play_sound_effect("alert_minor");
        this.enable_bag_dragging((event) => this.hit_target_fennimal(event));
    }

    async run_food_match_overlay() {
        let leftFen = this.FenObj.quiz_left_fen;
        let rightFen = this.FenObj.quiz_right_fen;
        if (!leftFen || !rightFen) {
            throw new Error("FennimalFood: transfer trial is missing quiz Fennimal copies.");
        }
        const p = this.params;
        let W = this.basics.W;
        let H = this.basics.H;
        this.overlayGroup = create_SVG_group(0, 0, undefined, "food_match_overlay");
        this.basics.ItemLayers.Questions.appendChild(this.overlayGroup);

        let dim = create_SVG_rect(0, 0, W, H);
        dim.style.fill = "rgba(255,255,255,0.55)";
        dim.style.pointerEvents = "none";
        this.overlayGroup.appendChild(dim);

        const card = (x, y, w, h) => {
            let rect = create_SVG_rect(x, y, w, h);
            rect.style.fill = "rgba(255,255,255,0.92)";
            rect.style.stroke = "rgba(40,40,70,0.18)";
            rect.style.strokeWidth = "4";
            rect.setAttribute("rx", "28");
            rect.setAttribute("ry", "28");
            rect.style.pointerEvents = "none";
            this.overlayGroup.appendChild(rect);
            return rect;
        };
        card(0.04 * W, 0.16 * H, 0.28 * W, 0.72 * H);
        card(0.36 * W, 0.16 * H, 0.28 * W, 0.72 * H);
        card(0.68 * W, 0.16 * H, 0.28 * W, 0.72 * H);

        let leftX = (p.quizLeftX != null ? p.quizLeftX : 0.18) * W;
        let rightX = (p.quizRightX != null ? p.quizRightX : 0.82) * W;
        let fenY = (p.quizFenY != null ? p.quizFenY : 0.70) * H;
        let fenScale = p.quizFenScale != null ? p.quizFenScale : 1.35;
        let leftEl = this.place_fennimal_svg(leftFen, this.overlayGroup, leftX, fenY, fenScale);
        let rightEl = this.place_fennimal_svg(rightFen, this.overlayGroup, rightX, fenY, fenScale);

        let nameY = (p.quizNameY != null ? p.quizNameY : 0.82) * H;
        [ [leftFen, leftX], [rightFen, rightX] ].forEach((entry) => {
            let label = create_SVG_text_elem(entry[1], nameY, entry[0].name);
            label.setAttribute("text-anchor", "middle");
            label.style.fontSize = "34px";
            label.style.fontWeight = "700";
            label.style.fill = "#2b2b40";
            label.style.pointerEvents = "none";
            this.overlayGroup.appendChild(label);
        });

        this.quizSlots = [
            { id: leftFen.id, el: leftEl, flavor: leftFen.food_preference, x: leftX, y: fenY, side: "left" },
            { id: rightFen.id, el: rightEl, flavor: rightFen.food_preference, x: rightX, y: fenY, side: "right" }
        ];

        let foodOrder = Array.isArray(this.FenObj.quiz_food_order) && this.FenObj.quiz_food_order.length === 2
            ? this.FenObj.quiz_food_order.slice()
            : this.choiceFlavors.slice();
        let foodX = (p.quizFoodX != null ? p.quizFoodX : 0.50) * W;
        let topY = (p.quizFoodTopY != null ? p.quizFoodTopY : 0.38) * H;
        let bottomY = (p.quizFoodBottomY != null ? p.quizFoodBottomY : 0.58) * H;
        this.spawn_bag_pair(foodOrder, foodX, foodX, topY, this.overlayGroup);
        if (this.bags[1]) {
            this.bags[1].homeY = bottomY;
            this.bags[1].elem.style.transform = "translate(" + foodX + "px, " + bottomY + "px)";
        }

        Interface.Prompt.show_message(
            this.FenObj.name + " isn’t here yet. First, can you remember who likes which food? " +
            "Drag each snack to the Fennimal who likes it."
        );
        AudioCont.play_sound_effect("alert_minor");
        this.quizArmedAt = this.now_ms();
        this.placedQuizFlavors = {};
        this.enable_bag_dragging((event) => this.hit_quiz_slot(event));

        await new Promise((resolve) => { this._quizResolve = resolve; });
    }

    async run_transfer_trial() {
        const p = this.params;
        await this.run_food_match_overlay();

        await this.basics.create_and_appear_Fennimal(
            this.basics.ItemLayers.Main,
            (p.transferFennimalX != null ? p.transferFennimalX : 0.50) * this.basics.W,
            (p.transferFennimalY != null ? p.transferFennimalY : 0.82) * this.basics.H,
            p.fennimalScale != null ? p.fennimalScale : 1.75,
            280
        );
        Interface.Prompt.show_message(
            this.FenObj.name + " is here! Click on " + this.FenObj.name + " to comfort them."
        );
        await this.basics.trigger_comfort_checkin();
        await wait(250);

        let stars = (typeof this.FenObj.bonus_stars_earnable === "number")
            ? this.FenObj.bonus_stars_earnable
            : 2;
        Interface.Prompt.show_message(
            this.FenObj.name + " is here! Give them the snack you think they will like. " +
            "You can earn " + stars + " bonus stars for a correct answer. " +
            "You won’t find out how you did until the end of the experiment."
        );
        AudioCont.play_sound_effect("alert_minor");

        let leftX = (p.transferBagLeftX != null ? p.transferBagLeftX : 0.28) * this.basics.W;
        let rightX = (p.transferBagRightX != null ? p.transferBagRightX : 0.72) * this.basics.W;
        let bagY = (p.transferBagY != null ? p.transferBagY : 0.74) * this.basics.H;
        this.spawn_bag_pair(this.choiceFlavors, leftX, rightX, bagY, this.basics.ItemLayers.Plus2);
        this.transferArmedAt = this.now_ms();
        this.enable_bag_dragging((event) => this.hit_target_fennimal(event));
    }

    async start_sequence() {
        this.basics.create_svg_sublayers();
        await this.basics.create_background_mask(true, 500);
        if (this.isTransfer) await this.run_transfer_trial();
        else await this.run_learning_trial();
    }

    clean_up() {
        this.trialComplete = true;
        this.destroy_all_drag_controllers();
        this.bags.forEach((b) => { if (b.elem && b.elem.parentNode) b.elem.remove(); });
        if (this.overlayGroup && this.overlayGroup.parentNode) this.overlayGroup.remove();
        this.basics.clean_up();
    }
}
