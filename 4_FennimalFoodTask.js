/**
 * Two-bag snack encounters.
 *   Fennimal_food          — C/D learning: comfort, empty bowl, both bags,
 *                            drag onto bowl, fill, slide to mouth, eat.
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
        this.FoodBowl = null;
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
            this.enable_bag_dragging((event) => this.hit_bowl(event));
        }
    }

    hit_target_fennimal(event) {
        if (!this.basics.Fennimal) return null;
        if (!this.point_over_element(event, this.basics.Fennimal)) return null;
        return { id: this.FenObj.id, el: this.basics.Fennimal, flavor: this.flavor };
    }

    hit_bowl(event) {
        if (!this.FoodBowl) return null;
        let pad = this.params.bowlDropPad != null ? this.params.bowlDropPad : 56;
        if (!this.point_over_element(event, this.FoodBowl, pad)) return null;
        return { id: "bowl", el: this.FoodBowl, flavor: this.flavor };
    }

    set_element_center(elem, x, y, time) {
        if (!elem) return Promise.resolve();
        let center = getSVGInternalCenter(elem);
        let dx = x - center.x;
        let dy = y - center.y;
        let ms = time || 0;
        elem.style.transition = ms > 0 ? ("transform " + ms + "ms ease-in-out") : "";
        elem.style.transform = (elem.style.transform || "") + " translate(" + dx + "px, " + dy + "px)";
        return ms > 0 ? wait(ms) : Promise.resolve();
    }

    async spawn_empty_bowl() {
        const p = this.params;
        let template = document.getElementById("foodbowl");
        if (!template) {
            throw new Error("FennimalFood: missing #foodbowl template in Items.svg.");
        }
        this.FoodBowl = copy_scale_and_move_object_to_position(
            template,
            this.basics.ItemLayers.Main,
            (p.bowlX != null ? p.bowlX : 0.58) * this.basics.W,
            (p.bowlY != null ? p.bowlY : 0.78) * this.basics.H,
            p.bowlScale != null ? p.bowlScale : 3.5
        );
        this.FoodBowl.id = "food_trial_foodbowl";
        this.FoodBowl.querySelectorAll(".food").forEach((food) => {
            food.style.display = "none";
            food.style.opacity = 0;
        });
        this.FoodBowl.style.opacity = 0;
        window.getComputedStyle(this.FoodBowl).opacity;
        this.FoodBowl.style.transition = "opacity 250ms ease-out";
        this.FoodBowl.style.opacity = 1;
        await wait(250);
    }

    reveal_bowl_food(options) {
        if (!this.FoodBowl || !this.flavor) return;
        let fadeMs = options && options.fadeMs;
        ["first", "second", "third"].forEach((portion) => {
            let food = Array.from(this.FoodBowl.querySelectorAll(".food." + this.flavor))
                .find((el) => (el.id || "").includes(portion));
            if (!food) return;
            food.style.display = "inherit";
            if (fadeMs) {
                food.style.transition = "none";
                food.style.opacity = 0;
                window.getComputedStyle(food).opacity;
                food.style.transition = "opacity " + fadeMs + "ms ease-out";
                food.style.opacity = 1;
            } else {
                food.style.opacity = 1;
            }
        });
    }

    get_bowl_food_pieces() {
        if (!this.FoodBowl || !this.flavor) return [];
        let pieces = Array.from(this.FoodBowl.querySelectorAll(".food." + this.flavor));
        const order = { first: 0, second: 1, third: 2 };
        pieces.sort((a, b) => {
            let ka = Object.keys(order).find((k) => (a.id || "").includes(k));
            let kb = Object.keys(order).find((k) => (b.id || "").includes(k));
            return (order[ka] != null ? order[ka] : 9) - (order[kb] != null ? order[kb] : 9);
        });
        return pieces;
    }

    async fade_out_bags(fadeMs) {
        let ms = fadeMs != null ? fadeMs : 350;
        let fadeTargets = this.bags.map((b) => b.elem).filter(Boolean);
        fadeTargets.forEach((el) => {
            el.style.transition = "opacity " + ms + "ms ease-out";
            window.getComputedStyle(el).opacity;
            el.style.opacity = 0;
            el.style.pointerEvents = "none";
        });
        await wait(ms);
        fadeTargets.forEach((el) => { if (el.parentNode) el.remove(); });
        this.bags = [];
    }

    async slide_bowl_to_mouth() {
        if (!this.FoodBowl) return;
        let mouthEl = this.basics.TargetPoints.Fennimal_mouth;
        let mouth = mouthEl
            ? getSVGInternalCenter(mouthEl)
            : getSVGInternalCenter(this.basics.Fennimal);
        let bowlCenter = getSVGInternalCenter(this.FoodBowl);
        let slideMs = this.params.bowlSlideTime != null ? this.params.bowlSlideTime : 500;
        await this.set_element_center(this.FoodBowl, mouth.x, bowlCenter.y, slideMs);
        await wait(200);
    }

    async animate_eating() {
        let mouthEl = this.basics.TargetPoints.Fennimal_mouth;
        let mouth = mouthEl
            ? getSVGInternalCenter(mouthEl)
            : getSVGInternalCenter(this.basics.Fennimal);
        let pieces = this.get_bowl_food_pieces();
        let layer = this.basics.ItemLayers.Plus2;
        let scale = this.params.bowlScale != null ? this.params.bowlScale : 3.5;
        let eatMs = this.params.eatMoveTime != null ? this.params.eatMoveTime : 420;

        Interface.Prompt.show_message(
            this.FenObj.name + " loves " + this.flavor_label(this.flavor) + "!"
        );

        for (let i = 0; i < pieces.length; i++) {
            let food = pieces[i];
            let start = getSVGInternalCenter(food);

            food.removeAttribute("transform");
            food.style.transition = "none";
            food.style.transform = "";
            food.style.opacity = 1;
            food.style.display = "inherit";

            let zeroGroup = create_SVG_group(0, 0, "zero_translate_group");
            let scaleGroup = create_SVG_group(0, 0, "scale_group");
            let mainPos = create_SVG_group(0, 0, "main_translate_group");
            zeroGroup.appendChild(food);
            scaleGroup.appendChild(zeroGroup);
            mainPos.appendChild(scaleGroup);
            layer.appendChild(mainPos);

            let baseCenter = getSVGInternalCenter(zeroGroup);
            zeroGroup.style.transform = "translate(" + (-baseCenter.x) + "px, " + (-baseCenter.y) + "px)";
            scaleGroup.style.transform = "scale(" + scale + ")";
            mainPos.style.transition = "none";
            mainPos.style.transform = "translate(" + start.x + "px, " + start.y + "px)";

            window.getComputedStyle(mainPos).transform;
            mainPos.style.transition = "transform " + eatMs + "ms ease-in-out";
            mainPos.style.transform = "translate(" + mouth.x + "px, " + mouth.y + "px)";
            await wait(eatMs);

            food.style.transition = "opacity 150ms ease-out";
            food.style.opacity = 0;
            AudioCont.play_sound_effect("chew");

            for (let h = 0; h < 2; h++) {
                setTimeout(() => {
                    this.basics.spawn_happy_heart(
                        mouth.x + (Math.random() - 0.5) * 40,
                        mouth.y - 20,
                        layer
                    );
                }, h * 80);
            }
            await wait(180);
            mainPos.style.display = "none";
        }
    }

    hit_quiz_slot(event) {
        let pad = this.params.quizDropPad != null ? this.params.quizDropPad : 12;
        for (let i = 0; i < this.quizSlots.length; i++) {
            let slot = this.quizSlots[i];
            if (this.point_over_element(event, slot.el, pad)) return slot;
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
        let restX = hit.cx != null ? hit.cx : hit.x;
        let restY = hit.cy != null ? (hit.cy + 90) : (hit.y - 40);
        await this.move_bag_to(info, restX, restY, this.params.bagMoveTime || 280);

        let bothPlaced = this.quizSlots.every((slot) => this.placedQuizFlavors[slot.id]);
        if (!bothPlaced) {
            this.rearm_dragging();
            return;
        }

        this.FenObj.quiz_rt_ms = Math.round(this.now_ms() - (this.quizArmedAt || this.now_ms()));
        let cx = 0.5 * this.basics.W;
        let cy = 0.42 * this.basics.H;
        await spawn_confetti_burst(this.overlayGroup || this.basics.ItemLayers.Questions, cx, cy, { awaitPopMs: 700 });
        await wait(250);
        if (this.overlayGroup) {
            this.overlayGroup.style.transition = "opacity 280ms ease-out";
            this.overlayGroup.style.opacity = 0;
            await wait(280);
            this.overlayGroup.remove();
            this.overlayGroup = null;
        }
        this.bags.forEach((b) => { if (b.elem && b.elem.parentNode) b.elem.remove(); });
        this.bags = [];
        this.quizSlots = [];
        await wait(this.params.quizClearBeatMs != null ? this.params.quizClearBeatMs : 750);
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
        let pourMs = this.params.bagPourFadeMs != null ? this.params.bagPourFadeMs : 320;
        this.reveal_bowl_food({ fadeMs: pourMs });
        await this.fade_out_bags(pourMs);
        await wait(180);
        await this.slide_bowl_to_mouth();
        await this.animate_eating();
        await this.basics.perform_success_celebration(null);
        await wait(750);
        Interface.Prompt.show_message(this.FenObj.name + " has wandered off...");
        let fenCenter = getSVGInternalCenter(this.basics.Fennimal);
        await this.basics.Fennimal_move_relative(-(fenCenter.x + 300), 0, 750);
        await wait(500);
        this.returnfunc();
    }

    async fade_scene_out() {
        if (typeof Interface !== "undefined" && Interface.Prompt && Interface.Prompt.hide) {
            Interface.Prompt.hide();
        }
        let fadeTargets = [];
        if (this.basics.Fennimal) fadeTargets.push(this.basics.Fennimal);
        if (this.FoodBowl) fadeTargets.push(this.FoodBowl);
        this.bags.forEach((b) => { if (b.elem) fadeTargets.push(b.elem); });
        fadeTargets.forEach((el) => {
            el.style.transition = "opacity 450ms ease-out";
            el.style.opacity = 0;
            el.style.pointerEvents = "none";
        });
        await wait(480);
    }

    hide_prompt() {
        if (typeof Interface !== "undefined" && Interface.Prompt && Interface.Prompt.hide) {
            Interface.Prompt.hide();
        }
    }

    quiz_card_layout() {
        const p = this.params;
        const W = this.basics.W;
        const H = this.basics.H;
        const gap = (p.quizCardGap != null ? p.quizCardGap : 0.04) * W;
        const cardW = (p.quizCardW != null ? p.quizCardW : 0.28) * W;
        const cardY = (p.quizCardY != null ? p.quizCardY : 0.185) * H;
        const cardH = (p.quizCardH != null ? p.quizCardH : 0.74) * H;
        const leftX = gap;
        return {
            W: W,
            H: H,
            cardW: cardW,
            cardH: cardH,
            cardY: cardY,
            gap: gap,
            leftX: leftX,
            midX: leftX + cardW + gap,
            rightX: leftX + 2 * (cardW + gap),
            instructionY: (p.quizInstructionY != null ? p.quizInstructionY : 0.045) * H,
            instructionH: (p.quizInstructionH != null ? p.quizInstructionH : 0.12) * H
        };
    }

    apply_sorting_card_chrome(rect) {
        rect.style.fill = "#FFFFFFBB";
        rect.style.stroke = "#B0BEC5";
        rect.style.strokeWidth = "6px";
        rect.setAttribute("rx", "20");
        rect.setAttribute("ry", "20");
        rect.style.pointerEvents = "none";
        return rect;
    }

    create_quiz_instruction_panel(text, x, y, w, h) {
        let group = create_SVG_group(0, 0);
        group.style.transform = "translate(" + x + "px, " + y + "px)";
        let rect = this.apply_sorting_card_chrome(create_SVG_rect(0, 0, w, h));
        rect.style.fill = "#FFFFFF";
        rect.style.fillOpacity = "0.94";
        group.appendChild(rect);
        let fo = create_SVG_foreignElement(18, 8, Math.max(40, w - 36), Math.max(24, h - 16));
        fo.style.pointerEvents = "none";
        let div = document.createElement("div");
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
        div.style.textAlign = "center";
        div.style.fontWeight = "700";
        div.style.fontSize = "30px";
        div.style.lineHeight = "1.3";
        div.style.color = "#37474F";
        div.style.fontFamily = "'Source Sans 3', 'PT Sans', sans-serif";
        div.style.boxSizing = "border-box";
        div.style.padding = "0 8px";
        div.textContent = text;
        fo.appendChild(div);
        group.appendChild(fo);
        return group;
    }

    create_quiz_name_banner(name, width, height, fill) {
        let banner = create_SVG_group(0, 0);
        let rect = create_SVG_rect(0, 0, width, height);
        rect.style.fill = fill || "#37474F";
        rect.style.pointerEvents = "none";
        banner.appendChild(rect);
        let label = create_SVG_text_elem(0.5 * width, 0.68 * height, name || "");
        label.setAttribute("text-anchor", "middle");
        label.style.fontSize = Math.max(26, Math.min(40, 0.48 * height)) + "px";
        label.style.fontWeight = "700";
        label.style.fill = "white";
        label.style.pointerEvents = "none";
        banner.appendChild(label);
        return banner;
    }

    fit_local_svg_element(element, cx, cy, maxW, maxH) {
        if (!element) return;
        const apply = (attempt) => {
            let box = { width: 0, height: 0, x: 0, y: 0 };
            try { box = element.getBBox(); } catch (err) { box = { width: 0, height: 0, x: 0, y: 0 }; }
            if ((!box || box.width <= 0 || box.height <= 0) && attempt < 8) {
                setTimeout(() => apply(attempt + 1), 40);
                return;
            }
            if (!box || box.width <= 0 || box.height <= 0) return;
            let scale = Math.min(maxW / box.width, maxH / box.height);
            let boxCx = box.x + 0.5 * box.width;
            let boxCy = box.y + 0.5 * box.height;
            element.setAttribute(
                "transform",
                "translate(" + cx + ", " + cy + ") scale(" + scale + ") translate(" + (-boxCx) + ", " + (-boxCy) + ")"
            );
        };
        apply(0);
    }

    create_quiz_portrait_card(fenObj, x, y, w, h) {
        let group = create_SVG_group(0, 0);
        group.style.transform = "translate(" + x + "px, " + y + "px)";
        group.style.pointerEvents = "none";

        let region = fenObj && fenObj.region;
        let regionData = (typeof GenParam !== "undefined" && GenParam.RegionData && region)
            ? GenParam.RegionData[region]
            : null;
        let bannerFill = (regionData && regionData.darker_color) ? regionData.darker_color : "#37474F";
        let bannerH = Math.max(62, (this.params.quizBannerH != null ? this.params.quizBannerH : 0.13) * h);
        let sceneH = Math.max(40, h - bannerH);

        let clipId = "food_quiz_scene_" + String(fenObj && fenObj.id != null ? fenObj.id : "x") + "_" + Math.floor(Math.random() * 1e6);
        let defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        let clip = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
        clip.setAttribute("id", clipId);
        let clipRect = create_SVG_rect(0, bannerH, w, sceneH);
        clip.appendChild(clipRect);
        defs.appendChild(clip);
        group.appendChild(defs);

        let fill = this.apply_sorting_card_chrome(create_SVG_rect(0, 0, w, h));
        group.appendChild(fill);

        let scene = create_SVG_group(0, 0);
        scene.setAttribute("clip-path", "url(#" + clipId + ")");

        let bgImage = document.createElementNS("http://www.w3.org/2000/svg", "image");
        let locName = fenObj && fenObj.location ? fenObj.location : "lake";
        let regName = region ? capitalize_first_letter_in_string(region) : "North";
        if (typeof set_location_background_image === "function") {
            set_location_background_image(bgImage, regName, locName);
        }
        bgImage.setAttribute("width", String(w));
        bgImage.setAttribute("height", String(sceneH));
        bgImage.setAttribute("y", String(bannerH));
        bgImage.setAttribute("preserveAspectRatio", "xMidYMid slice");
        scene.appendChild(bgImage);

        let bgMask = create_SVG_rect(0, bannerH, w, sceneH);
        bgMask.style.fill = "white";
        bgMask.style.opacity = "0.75";
        bgMask.style.pointerEvents = "none";
        scene.appendChild(bgMask);

        let fenGroup = create_SVG_group(0, 0);
        let fenIcon = create_Fennimal_SVG_object(fenObj, 0.5, false);
        if (typeof apply_Fennimal_animation_pivots === "function") {
            apply_Fennimal_animation_pivots(fenIcon);
        }
        if (typeof cleanSVGElements === "function") {
            cleanSVGElements(fenIcon);
        }
        fenGroup.appendChild(fenIcon);
        fenGroup.style.pointerEvents = "none";
        scene.appendChild(fenGroup);
        group.appendChild(scene);

        group.appendChild(this.create_quiz_name_banner(fenObj && fenObj.name, w, bannerH, bannerFill));

        let stroke = this.apply_sorting_card_chrome(create_SVG_rect(0, 0, w, h));
        stroke.style.fill = "none";
        group.appendChild(stroke);

        this.fit_local_svg_element(
            fenGroup,
            0.5 * w,
            bannerH + 0.58 * sceneH,
            0.62 * w,
            0.64 * sceneH
        );

        return {
            group: group,
            dropEl: group,
            x: x,
            y: y,
            w: w,
            h: h,
            bannerH: bannerH,
            cx: x + 0.5 * w,
            cy: y + bannerH + 0.55 * sceneH
        };
    }

    create_quiz_snacks_card(x, y, w, h) {
        let group = create_SVG_group(0, 0);
        group.style.transform = "translate(" + x + "px, " + y + "px)";
        group.style.pointerEvents = "none";
        let fill = this.apply_sorting_card_chrome(create_SVG_rect(0, 0, w, h));
        group.appendChild(fill);
        let bannerH = Math.max(56, (this.params.quizBannerH != null ? this.params.quizBannerH : 0.13) * h);
        group.appendChild(this.create_quiz_name_banner("Snacks", w, bannerH, "#37474F"));
        return { group: group, x: x, y: y, w: w, h: h, bannerH: bannerH };
    }

    async show_transfer_decision_bubble(text) {
        this.hide_prompt();
        let dim = (this.params.transferDecisionDim != null) ? this.params.transferDecisionDim : 0.5;
        if (typeof Interface !== "undefined" && typeof Interface.showPartnerSpeechBubble === "function") {
            await Interface.showPartnerSpeechBubble({
                target: this.basics.Fennimal,
                context: "location",
                text: text,
                buttonLabel: "Continue",
                dimOpacity: dim,
                preferredSide: "up"
            });
            return;
        }
        if (Interface && Interface.Prompt) {
            Interface.Prompt.show_message(String(text).replace(/<br\s*\/?>/gi, " "));
            await wait(1600);
        }
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

        await this.spawn_empty_bowl();

        let leftX = (p.bagLeftX != null ? p.bagLeftX : 0.68) * this.basics.W;
        let rightX = (p.bagRightX != null ? p.bagRightX : 0.86) * this.basics.W;
        let bagY = (p.bagY != null ? p.bagY : 0.72) * this.basics.H;
        this.spawn_bag_pair(this.choiceFlavors, leftX, rightX, bagY, this.basics.ItemLayers.Plus2);
        Interface.Prompt.show_message(
            this.FenObj.name + " likes " + this.flavor_label(this.flavor) +
            ". Drag that bag onto " + this.FenObj.name + "'s bowl!"
        );
        AudioCont.play_sound_effect("alert_minor");
        this.enable_bag_dragging((event) => this.hit_bowl(event));
    }

    async run_food_match_overlay() {
        let leftFen = this.FenObj.quiz_left_fen;
        let rightFen = this.FenObj.quiz_right_fen;
        if (!leftFen || !rightFen) {
            throw new Error("FennimalFood: transfer trial is missing quiz Fennimal copies.");
        }
        this.hide_prompt();
        let layout = this.quiz_card_layout();
        this.overlayGroup = create_SVG_group(0, 0, undefined, "food_match_overlay");
        this.basics.ItemLayers.Questions.appendChild(this.overlayGroup);

        let dim = create_SVG_rect(0, 0, layout.W, layout.H);
        dim.style.fill = "rgba(255,255,255,0.55)";
        dim.style.pointerEvents = "none";
        this.overlayGroup.appendChild(dim);

        let instruction = this.FenObj.name +
            " isn’t here yet. First, can you remember who likes which food? " +
            "Drag each snack to the Fennimal who likes it.";
        this.overlayGroup.appendChild(this.create_quiz_instruction_panel(
            instruction,
            layout.leftX,
            layout.instructionY,
            layout.rightX + layout.cardW - layout.leftX,
            layout.instructionH
        ));

        let snacks = this.create_quiz_snacks_card(layout.midX, layout.cardY, layout.cardW, layout.cardH);
        this.overlayGroup.appendChild(snacks.group);

        let leftCard = this.create_quiz_portrait_card(leftFen, layout.leftX, layout.cardY, layout.cardW, layout.cardH);
        let rightCard = this.create_quiz_portrait_card(rightFen, layout.rightX, layout.cardY, layout.cardW, layout.cardH);
        this.overlayGroup.appendChild(leftCard.group);
        this.overlayGroup.appendChild(rightCard.group);

        this.quizSlots = [
            {
                id: leftFen.id,
                el: leftCard.dropEl,
                flavor: leftFen.food_preference,
                x: leftCard.cx,
                y: leftCard.cy,
                cx: leftCard.cx,
                cy: leftCard.cy,
                side: "left"
            },
            {
                id: rightFen.id,
                el: rightCard.dropEl,
                flavor: rightFen.food_preference,
                x: rightCard.cx,
                y: rightCard.cy,
                cx: rightCard.cx,
                cy: rightCard.cy,
                side: "right"
            }
        ];

        let foodOrder = Array.isArray(this.FenObj.quiz_food_order) && this.FenObj.quiz_food_order.length === 2
            ? this.FenObj.quiz_food_order.slice()
            : this.choiceFlavors.slice();
        let foodX = snacks.x + 0.5 * snacks.w;
        let sceneTop = snacks.y + snacks.bannerH;
        let sceneH = snacks.h - snacks.bannerH;
        let topY = sceneTop + 0.32 * sceneH;
        let bottomY = sceneTop + 0.70 * sceneH;
        this.spawn_bag_pair(foodOrder, foodX, foodX, topY, this.overlayGroup);
        if (this.bags[1]) {
            this.bags[1].homeY = bottomY;
            this.bags[1].elem.style.transform = "translate(" + foodX + "px, " + bottomY + "px)";
        }

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
        await this.show_transfer_decision_bubble(
            this.FenObj.name + " is here! Give them the snack you think they will like.<br><br>" +
            "You can earn " + stars + " bonus stars for a correct answer. " +
            "You won’t find out how you did until the end of the experiment."
        );
        this.hide_prompt();
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
        if (this.FoodBowl && this.FoodBowl.parentNode) this.FoodBowl.remove();
        this.FoodBowl = null;
        if (this.overlayGroup && this.overlayGroup.parentNode) this.overlayGroup.remove();
        this.basics.clean_up();
    }
}
