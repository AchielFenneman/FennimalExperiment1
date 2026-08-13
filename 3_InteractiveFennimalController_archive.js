/*
 * ARCHIVED INTERACTIVE FENNIMAL CONTROLLERS
 * ------------------------------------------
 * Not loaded by index.html. Parked unused / pilot trial code from
 * 3_InteractiveFennimalController.js (August 2026 spring clean).
 *
 * TO RESTORE one or more of these interactions:
 *   Add this script AFTER 3_InteractiveFennimalController.js in index.html:
 *     <script type="text/javascript" src="3_InteractiveFennimalController_archive.js"></script>
 *   TrialFactory cases (and the partner_belief_multiple phase in Top_controller)
 *   are still wired; they construct these classes once this file is loaded.
 *
 * MANIFEST
 *   interaction_type              class
 *   ----------------------------- ------------------------------------
 *   fly_swat                      FlySwatTrialController
 *   fly_swat_extended             FlySwatExtendedTrialController
 *   reach_hat                     ReachHatTrialController
 *   find_box                      FindBoxTrialController
 *   find_box_extended             FindBoxExtendedTrialController
 *   broken_toy_in_box             BrokenToyInBoxTrialController
 *   dirty_toy                     DirtyToyTrialController
 *   dirty_and_broken_toy          DirtyAndBrokenToyTrialController
 *   feed_Fennimal                 FeedFennimalTrialController
 *   check_box_contents            CheckBoxContentsTrialController
 *   box_room                      BoxRoomTrialController
 *   scan_box_home / scan_box_in_situ
 *                                ScanBoxHomeTrialController
 *   partner_belief_in_situ        PartnerBeliefInSituTrialController
 *
 * PHASE CONTROLLERS (instantiated from 2_Top_controller.js, not TrialFactory)
 *   partner_belief / partner_belief_multiple
 *                                PartnerBeliefMultipleController
 *                                (deprecated alias: PartnerBeliefTaskController)
 *
 * SUPPORT MODULES IN THIS FILE
 *   FlyModule                     (fly-swat trials only)
 *
 * STILL IN THE LIVE CONTROLLER (required dependencies; do not duplicate)
 *   BasicElementsModule, BoxModule, PartnerModule, toy modules,
 *   DirtModule, FoliageModule, DustModule, PhotoTrialController,
 *   BrokenToyModule, GeneralTrialController
 */

// ---------------------------------------------------------------------------
// FlyModule
// ---------------------------------------------------------------------------
class FlyModule {
    RemainingFlyControllers = {};
    current_fly_count = 0;

    constructor(FenObj) {
        this.FenObj = FenObj;
        // FIX: Removed the manual AudioCont.load_audio calls!
        // Our new lazy-loading system handles this automatically.
    }

    spawn_flies(ParentLayer, TargetBoxElement, number_of_flies, on_fly_swatted_callback) {
        this.current_fly_count = number_of_flies;

        for (let i = 0; i < number_of_flies; i++) {
            this.RemainingFlyControllers[i] = new this.SwattableFly(
                ParentLayer,
                TargetBoxElement,
                i,
                (index) => {
                    delete this.RemainingFlyControllers[index];
                    this.current_fly_count--;
                    on_fly_swatted_callback(this.current_fly_count); // Tell the Manager!
                }
            );
        }

        // FIX: Updated to use our new looping function!
        AudioCont.start_looping_sound_effect("fly_buzzing");
    }

    make_flies_swattable() {
        for (let key in this.RemainingFlyControllers) {
            this.RemainingFlyControllers[key].make_swattable();
        }
    }

    get_random_living_fly() {
        let keys = Object.keys(this.RemainingFlyControllers);
        if (keys.length === 0) return null;

        let random_key = shuffleArray(keys)[0];
        return this.RemainingFlyControllers[random_key];
    }

    clean_up() {
        // FIX: Updated to use our new looping stop function!
        AudioCont.stop_looping_sound_effect("fly_buzzing");

        for (let key in this.RemainingFlyControllers) {
            this.RemainingFlyControllers[key].swat(); // Force kill remaining
        }
    }
    // Your exact fly logic, now bound as a subclass to the module
    SwattableFly = class {
        constructor(Parent, TargetObject, index_num, returnfunc) {
            this.FlyElement = document.getElementById("swattable_fly").cloneNode(true);
            this.FlyElement.removeAttribute("id");
            this.FlyElement.classList.add("swattable_fly");
            this.FlyElement.style.display = "inherit";
            Parent.appendChild(this.FlyElement);

            // FIX: Start locked and without a pointer cursor
            this.is_swattable = false;
            this.FlyElement.style.cursor = "auto";

            const TargetCoords = getSVGInternalCenter(TargetObject);
            const targetX = TargetCoords.x + (Math.random() - 0.5) * 200;
            const targetY = TargetCoords.y - 200 - (Math.random() - 0.5) * 100;

            let x = targetX + (Math.random() - 0.5) * 200;
            let y = targetY + (Math.random() - 0.5) * 200;
            let vx = 0, vy = 0;
            let is_dead = false;
            let wanderAngle = Math.random() * Math.PI * 2;

            const animate_fly = () => {
                if (is_dead) return;

                wanderAngle += (Math.random() - 0.5) * 0.3;
                vx += Math.cos(wanderAngle) * 2;
                vy += Math.sin(wanderAngle) * 2;
                vx += (targetX - x) * 0.007;
                vy += (targetY - y) * 0.007;
                vx *= 0.95;
                vy *= 0.95;
                x += vx;
                y += vy;

                const angle = Math.atan2(vy, vx) * (180 / Math.PI);
                this.FlyElement.setAttribute('transform', `translate(${x}, ${y}) rotate(${angle}) scale(3)`);

                requestAnimationFrame(animate_fly);
            };

            // FIX: Only allow the swat function to fire if unlocked
            this.FlyElement.onpointerdown = () => {
                if (this.is_swattable) this.swat();
            };

            // FIX: Internal method to unlock this specific fly
            this.make_swattable = () => {
                this.is_swattable = true;
                this.FlyElement.style.cursor = "pointer";
            };

            this.get_position = () => getSVGInternalCenter(this.FlyElement);

            this.swat = () => {
                if (is_dead) return;
                is_dead = true;
                AudioCont.play_sound_effect("splat");
                this.FlyElement.classList.add('dead');
                returnfunc(index_num);

                setTimeout(() => {
                    this.FlyElement.style.transition = 'opacity 1s';
                    this.FlyElement.style.opacity = '0';
                    setTimeout(() => this.FlyElement.remove(), 1000);
                }, 2000);
            };

            animate_fly();
        }
    }
}

// ---------------------------------------------------------------------------
// FlySwat / ReachHat / FindBox / BrokenToyInBox
// ---------------------------------------------------------------------------
class FlySwatTrialController {

    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        // 1. Instantiate Generic Workers
        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);

        // 2. Instantiate Task-Specific Worker
        this.flyLogic = new FlyModule(FenObj);

        this.max_partner_kills = 5;
        this.partner_kill_count = 0;
    }

    async trigger_initial_spawns_and_prompts() {
        Interface.Prompt.show_message("Ew! There's a bunch of flies around the " + this.box.boxname + "! Gross!");
        AudioCont.play_sound_effect("sad");
        await wait(100);

        let numFlies = this.partner.is_present ? 10 : 7;
        this.flyLogic.spawn_flies(
            this.basics.ItemLayers.Plus2,
            this.box.BoxBase,
            numFlies,
            (remaining) => this.handle_fly_swatted(remaining)
        );
    }

    async start_interaction_phase() {
        Interface.Prompt.show_message("Help " + this.FenObj.name + " by swatting all the flies!");
        this.flyLogic.make_flies_swattable();

        if (this.partner.is_present) {
            this.partner_swatting_loop();
        }
    }

    async handle_fly_swatted(remaining_count) {
        if (remaining_count <= 0) {
            AudioCont.play_sound_effect("success");
            AudioCont.stop_looping_sound_effect("fly_buzzing");
            Interface.Prompt.show_message("All the flies are gone!");
            await this.on_flies_cleared();
        }
    }

    async on_flies_cleared() {
        // Base behavior uses the new standard celebration!
        await this.basics.perform_success_celebration(this.box.BoxBase);
        this.finish_trial();
    }

    async partner_swatting_loop() {
        let targetFly = this.flyLogic.get_random_living_fly();

        if (targetFly && this.partner_kill_count < this.max_partner_kills) {
            await this.partner.move_to_element_and_act(
                targetFly.FlyElement,
                () => targetFly.swat()
            );

            this.partner_kill_count++;
            this.partner.PartnerTranslateGroup.style.transition = "all 500ms ease-in-out";
            this.partner.PartnerTranslateGroup.style.transform = "";
            await wait(500);
            await wait(1500);
            this.partner_swatting_loop();
        }
    }

    async finish_trial() {
        Interface.Prompt.show_message(this.FenObj.name + " really appreciates your help!");
        await wait(1500);
        this.returnfunc();
    }

    // ON START
    async start_sequence() {
        this.basics.create_svg_sublayers();

        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }

        // Setup Scene
        await this.basics.create_background_mask(true, 500);
        await this.basics.create_and_appear_Fennimal(this.basics.ItemLayers.Neg1, 0.35 * this.basics.W, 0.85 * this.basics.H, 1.8, 250);
        await this.box.create_and_appear_box(this.basics.ItemLayers.Main, this.basics.ItemLayers.Plus2, 0.5 * this.basics.W, 0.7 * this.basics.H, 4, 100);

        Interface.Prompt.hide();
        await wait(1000);

        // Extension Point 1
        await this.trigger_initial_spawns_and_prompts();

        await wait(500);
        await this.basics.Fennimal_move_relative(-0.2 * this.basics.W, 0, 250);
        await wait(500);

        Interface.Prompt.show_message(`${this.FenObj.name} looks so sad! Click to cheer ${this.FenObj.name}  up.`);
        await this.basics.trigger_comfort_checkin();
        await wait(500);

        // Extension Point 2
        await this.start_interaction_phase();
    }

    clean_up() {
        this.basics.clean_up();
        this.box.clean_up();
        this.flyLogic.clean_up();
        if (this.partner.PartnerTranslateGroup) this.partner.PartnerTranslateGroup.remove();
    }
}

class FlySwatExtendedTrialController extends FlySwatTrialController {

    constructor(FenObj, partner_is_present, returnfunc) {
        super(FenObj, partner_is_present, returnfunc);
        // Add the extra dirt module
        this.dirtLogic = new DirtModule();
    }

    async trigger_initial_spawns_and_prompts() {
        Interface.Prompt.show_message("Ew! The " + this.box.boxname + " is covered in flies and dirt! Gross!");
        AudioCont.play_sound_effect("sad");
        await wait(100);

        // 1. Spawn Flies
        let numFlies = this.partner.is_present ? 10 : 7;
        this.flyLogic.spawn_flies(
            this.basics.ItemLayers.Plus2,
            this.box.BoxBase,
            numFlies,
            (remaining) => this.handle_fly_swatted(remaining)
        );

        // 2. Spawn Dirt directly on the BoxTop
        let num_dirt = 5 + Math.floor(Math.random() * 5);
        this.dirtLogic.spawn_dirt_on_element(this.box.BoxTop, this.basics.ItemLayers.Plus1, num_dirt);
    }

    async on_flies_cleared() {
        // Intercept the celebration! Make them clean the dirt first.
        Interface.Prompt.hide();
        await wait(1000);

        Interface.Prompt.show_message("Great! Now grab the sponge to clean off the dirt!");
        let sponge_x = 0.65 * this.basics.W;
        let sponge_y = 0.5 * this.basics.H;

        this.dirtLogic.spawn_and_enable_sponge(
            this.basics.ItemLayers.Plus2,
            sponge_x,
            sponge_y,
            () => this.on_dirt_cleared()
        );
    }

    async on_dirt_cleared() {
        Interface.Prompt.hide();
        await wait(1000);
        // NOW we trigger the standard celebration and finish
        await this.basics.perform_success_celebration(this.box.BoxBase);
        this.finish_trial();
    }

    clean_up() {
        super.clean_up();
        this.dirtLogic.clean_up();
    }
}

class ReachHatTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        // 1. Instantiate Generic Workers
        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);

        // 2. Task-Specific Variables
        this.baseline_y = 0.85 * this.basics.H;
        this.Fen_base_x = 0.1 * this.basics.W;
        this.pole_dx = 0.7 * this.basics.W;

        this.number_of_dragging_steps = partner_is_present ? 9 : 5;
        this.draggin_step_counter = 0;
        this.drag_time = 500;
        this.box_is_movable = false;

        const AllPoleNames = {
            North: "Pine tree",
            Mountains: "rock",
            Village: "telephone pole",
            Swamp: "dead tree",
            Desert: "ruin",
            Beach: "palm tree",
            Jungle: "tree",
            Flowerfields: "pillar",
        };
        this.polename = AllPoleNames[this.FenObj.region];
    }

    // --- SCENE SETUP METHODS ---

    create_pole() {
        this.Pole = copy_scale_and_move_object_to_position(document.getElementById("tall_post_" + this.FenObj.region), this.basics.ItemLayers.Neg1, this.Fen_base_x, 0.4 * this.basics.H, 6);
        let BBox = this.Pole.getBBox();
        this.PoleHatTarget = this.Pole.getElementsByClassName("tall_post_target")[0];

        let TargetBox = getSVGInternalCenter(this.PoleHatTarget);
        let delta_x = (this.Fen_base_x + this.pole_dx) - TargetBox.x;
        let delta_y = this.baseline_y - (BBox.y + BBox.height);

        this.Pole.style.transform = `translate(${delta_x}px, ${delta_y - 20}px)`;
    }

    create_hat() {
        let hat_starting_point = getSVGInternalCenter(this.PoleHatTarget);
        this.Hat = copy_scale_and_move_object_to_position(document.getElementById("hat_" + this.FenObj.hat), this.basics.ItemLayers.Plus1, hat_starting_point.x, hat_starting_point.y, 2);
    }

    spawnDust(clickX, clickY, svgElement) {
        const colors = ['#D3D3D3', '#C0C0C0', '#A9A9A9', '#E5E4E2', "#000000"];
        const numParticles = 6;

        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

            const radius = Math.random() * 20 + 20;
            particle.setAttribute('r', radius);
            particle.setAttribute('cx', clickX);
            particle.setAttribute('cy', clickY);
            particle.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);
            particle.classList.add('dust-cloud');

            const endX = ((Math.random() - 0.5) * 120) - 200;
            const endY = -(Math.random() * 50 + 40);
            const finalScale = Math.random() * 1.5 + 2.5;

            particle.style.setProperty('--x', `${endX}px`);
            particle.style.setProperty('--y', `${endY}px`);
            particle.style.setProperty('--s', finalScale);

            svgElement.appendChild(particle);
            setTimeout(() => particle.remove(), 800);
        }
    }

    // --- ANIMATION & LOGIC METHODS ---

    async show_first_attempt_to_reach_box() {
        await wait(1000);

        // Use basic's relative movement calculation
        let dx = getSVGInternalCenter(this.PoleHatTarget).x - getSVGInternalCenter(this.basics.Fennimal).x;
        await this.basics.Fennimal_move_relative(dx, 0, 500);

        await this.basics.Fennimal_jump(200);
        await this.basics.Fennimal_jump(275);
        await this.basics.Fennimal_jump(250);

        Interface.Prompt.show_message(`Oh no, ${this.FenObj.name} can't reach the ${this.FenObj.hat}!`);
        AudioCont.play_sound_effect("sad");

        // Return to start
        this.basics.Fennimal.style.transition = "all 700ms ease-in-out";
        this.basics.Fennimal.style.transform = this.FennimalBaseTransform;
        await wait(850);

        Interface.Prompt.show_message(`${this.FenObj.name} looks so sad! Click to cheer ${this.FenObj.name}  up.`);
        await this.basics.trigger_comfort_checkin();
        await wait(500);

        Interface.Prompt.show_message(`The ${this.box.boxname} can be used as a step-stool!`);
        await wait(1500);

        if (this.partner.is_present) {
            Interface.Prompt.show_message(`Take turns with ${this.partner.partnername} to move the ${this.box.boxname} to the ${this.polename}`);
        } else {
            Interface.Prompt.show_message(`Help ${this.FenObj.name} by moving the ${this.box.boxname} to the ${this.polename}`);
        }

        this.allow_box_being_moved();
    }

    allow_box_being_moved() {
        this.box_is_movable = true;
        this.box.BoxBase.style.cursor = "pointer";
        this.box.BoxTop.style.cursor = "pointer";

        // Calculate step distance dynamically
        this.box_moving_step_distance = Math.round((getSVGInternalCenter(this.PoleHatTarget).x - getSVGInternalCenter(this.box.BoxBase).x) / this.number_of_dragging_steps);

        // Make an outline of both box parts!
        this.BoxOutline = create_SVG_outline_of_multiple_groups(this.box.BoxBase, this.box.BoxTop);
        this.box.BoxBase.parentNode.insertBefore(this.BoxOutline, this.box.BoxBase);
        this.BoxOutline.classList.add("focus_on_SVG_outline");

        this.box.BoxBase.style.transition = `all ${this.drag_time}ms ease-in-out`;
        this.box.BoxTop.style.transition = `all ${this.drag_time}ms ease-in-out`;
        this.BoxOutline.style.transition = `all ${this.drag_time}ms ease-in-out`;

        const box_clicked = () => this.try_moving_box();
        this.box.BoxBase.onpointerdown = box_clicked;
        this.box.BoxTop.onpointerdown = box_clicked;
    }

    async try_moving_box() {
        if (!this.box_is_movable) return;

        this.box_is_movable = false;
        this.BoxOutline.classList.remove("focus_on_SVG_outline");
        await this.move_box();

        if (this.draggin_step_counter >= this.number_of_dragging_steps) {
            this.box_moved_to_final_position();
        } else {
            if (this.partner.is_present) {
                // Partner moves box, bridging the standard module
                await this.partner.move_to_element_and_act(this.box.BoxBase, () => this.move_box());
            }

            if (this.draggin_step_counter >= this.number_of_dragging_steps) {
                this.box_moved_to_final_position();
            } else {
                this.box_is_movable = true;
                this.BoxOutline.classList.add("focus_on_SVG_outline");
            }
        }
    }

    move_box() {
        return new Promise(resolve => {
            AudioCont.play_sound_effect("drag_wood");
            this.draggin_step_counter++;

            this.box.BoxBase.style.transform += `translateX(${this.box_moving_step_distance}px)`;
            this.box.BoxTop.style.transform += `translateX(${this.box_moving_step_distance}px)`;
            this.BoxOutline.style.transform += `translateX(${this.box_moving_step_distance}px)`;

            let Boxpos = getSVGInternalCenter(this.box.BoxBase);
            this.spawnDust(Boxpos.x, Boxpos.y + 0.45 * this.box.BoxBase.getBBox().height, this.basics.ItemLayers.Main);

            setTimeout(() => resolve(), 750);
        });
    }

    // --- CUSTOM FENNIMAL HAT LOGIC ---

    Fennimal_jump_on_box(amount) {
        return new Promise(resolve => {
            AudioCont.play_sound_effect("jump");
            this.basics.Fennimal.style.transition = "all 200ms ease-out";
            this.basics.Fennimal.style.transform += `translateY(-${2 * amount}px)`;

            setTimeout(() => {
                this.basics.Fennimal.style.transition = "all 100ms ease-out";
                this.basics.Fennimal.style.transform += `translateY(${amount}px)`;
            }, 200);

            setTimeout(() => resolve(), 500);
        });
    }

    Fennimal_grabs_hat() {
        return new Promise(resolve => {
            let start_transform = this.basics.Fennimal.style.transform;

            AudioCont.play_sound_effect("jump");
            this.basics.Fennimal.style.transition = "all 200ms ease-out";
            this.basics.Fennimal.style.transform += `translateY(-250px)`;

            setTimeout(() => {
                this.Hat.style.transition = "all 50ms ease-out";
                this.Hat.style.opacity = 0;
                this.basics.Fennimal.style.transition = "all 100ms ease-out";
                this.basics.Fennimal.style.transform = start_transform;
            }, 200);

            setTimeout(() => {
                AudioCont.play_sound_effect("success");
                this.basics.Fennimal.getElementsByClassName("hat")[0].style.opacity = 1;
            }, 300);

            setTimeout(() => resolve(), 500);
        });
    }

    Fennimal_jumps_back_to_ground(ground_transform) {
        return new Promise(resolve => {
            AudioCont.play_sound_effect("jump");
            this.basics.Fennimal.style.transition = "all 200ms ease-out";
            this.basics.Fennimal.style.transform += `translateY(-50px)`;
            setTimeout(() => {
                this.basics.Fennimal.style.transform = ground_transform;
            }, 200);
            setTimeout(() => resolve(), 500);
        });
    }

    async box_moved_to_final_position() {
        // Clean up pointer events
        this.box.BoxBase.onpointerdown = null;
        this.box.BoxTop.onpointerdown = null;
        if(this.BoxOutline) this.BoxOutline.remove();

        AudioCont.play_sound_effect("success");
        Interface.Prompt.hide();
        await wait(1000);

        let dx = getSVGInternalCenter(this.PoleHatTarget).x - getSVGInternalCenter(this.basics.Fennimal).x;
        await this.basics.Fennimal_move_relative(dx, 0, 750);

        let prejump_transform = this.basics.Fennimal.style.transform;

        await this.Fennimal_jump_on_box(175);
        await wait(500);
        await this.basics.Fennimal_jump(250);
        await wait(100);
        await this.Fennimal_grabs_hat();
        await wait(300);
        await this.Fennimal_jumps_back_to_ground(prejump_transform);
        await wait(200);

        // Move to center
        //let center_dx = (0.5 * this.basics.W) - getSVGInternalCenter(this.basics.Fennimal).x;
        //await this.basics.Fennimal_move_relative(center_dx, 0, 500);

        Interface.Prompt.show_message(`${this.FenObj.name} really appreciates your help!`);

        // Standardized celebration! (The box is now at the pole, so we celebrate next to it)
        await this.basics.perform_success_celebration(this.box.BoxBase);


        this.returnfunc();
    }

    // --- ORCHESTRATOR METHODS ---

    async start_sequence() {
        this.basics.create_svg_sublayers();

        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }

        // Setup Scene Elements
        await this.basics.create_background_mask(true, 500);

        // Create basic Fennimal but customize position and hide hat
        await this.basics.create_and_appear_Fennimal(this.basics.ItemLayers.Plus2, this.Fen_base_x, this.baseline_y, 1.5, 250);
        this.basics.Fennimal.getElementsByClassName("hat")[0].style.opacity = 0;
        this.FennimalBaseTransform = this.basics.Fennimal.style.transform;

        // Custom Scene Additions
        this.create_pole();
        this.create_hat();

        // Create the Box and align it to the baseline
        await this.box.create_and_appear_box(this.basics.ItemLayers.Plus1, this.basics.ItemLayers.Plus2, 0.2 * this.basics.W, this.baseline_y, 3, 200);
        let BoxCenterpoint = getSVGInternalCenter(this.box.BoxBase);
        let BBox = this.box.BoxBase.getBBox();
        let box_delta_y = this.baseline_y - (BoxCenterpoint.y + 0.5 * BBox.height);
        this.box.BoxBase.style.transform += ` translateY(${box_delta_y}px)`;
        this.box.BoxTop.style.transform += ` translateY(${box_delta_y}px)`;

        // Bump the Fennimal to the very front of the Plus2 layer!
        this.basics.ItemLayers.Plus2.appendChild(this.basics.Fennimal);

        // Start Interaction
        Interface.Prompt.show_message(`Oh no! ${this.FenObj.name}'s ${this.FenObj.hat} has blown onto a ${this.polename}`);
        AudioCont.play_sound_effect("sad");

        this.show_first_attempt_to_reach_box();
    }

    clean_up() {
        this.basics.clean_up();
        this.box.clean_up();
        if (this.Pole) this.Pole.remove();
        if (this.Hat) this.Hat.remove();
        if (this.BoxOutline) this.BoxOutline.remove();
        if (this.partner.PartnerTranslateGroup) this.partner.PartnerTranslateGroup.remove();
    }
}

class FindBoxTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;
        this.is_task_active = true;

        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);
        this.foliageLogic = new FoliageModule(FenObj, partner_is_present);

        this.Spots = {
            Main: [.25, .35, .45, .55, .65, .75, .85, .95],
            Plus1: [.2, .4, .6, .8, .9],
            Plus2: [.10, .40, .70, .90],
        };


        this.layer_y_pos = { Main: .6, Plus1: .7, Plus2: .75 };
        this.BoxSizes = { Main: 1.25, Plus1: 1.75, Plus2: 2.25 };
        this.FoliageSizes = { Main: 2.25, Plus1: 2.75, Plus2: 3.25 };
    }

    async handle_box_found() {
        if (!this.is_task_active) return;
        this.is_task_active = false;
        this.foliageLogic.stop_partner_cutting();

        this.box.BoxBase.onpointerdown = null;
        this.box.BoxTop.onpointerdown = null;
        this.box.BoxBase.style.cursor = "auto";
        this.box.BoxTop.style.cursor = "auto";

        AudioCont.play_sound_effect("success");
        this.foliageLogic.clear_all();

        if (this.partner.is_present) {
            await this.partner.return_to_start();
        }

        await wait(750);
        Interface.Prompt.show_message(`Yay! You found the ${this.box.boxname}!`);

        // DOM BUMP: Bring Box to front layer
        this.basics.ItemLayers.Plus2.appendChild(this.box.BoxBase);
        this.basics.ItemLayers.Plus2.appendChild(this.box.BoxTop);

        // Move Box Front and Center
        this.box.BoxBase.style.transition = "all 500ms ease-in-out";
        this.box.BoxTop.style.transition = "all 500ms ease-in-out";
        let Boxcenter = getSVGInternalCenter(this.box.BoxBase);
        this.box_dx = (0.6 * this.basics.W) - Boxcenter.x;
        this.box_dy = (0.7 * this.basics.H) - Boxcenter.y;
        this.box.BoxBase.style.transform += ` translate(${this.box_dx}px, ${this.box_dy}px) scale(3)`;
        this.box.BoxTop.style.transform += ` translate(${this.box_dx}px, ${this.box_dy}px) scale(3)`;

        await wait(750);

        // This is where we break out the behavior for the Extended class to intercept!
        await this.trigger_post_discovery_phase();
    }

    async trigger_post_discovery_phase() {
        AudioCont.play_sound_effect("positive");
        Interface.Prompt.show_message(`${this.FenObj.name} is very grateful that you found the ${this.box.boxname}!`);

        await this.basics.perform_success_celebration(this.box.BoxBase);

        this.returnfunc();
    }

    async start_sequence() {
        this.basics.create_svg_sublayers();
        await this.basics.create_background_mask(false, 500);

        if (this.partner.is_present) this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);

        await this.basics.create_and_appear_Fennimal(this.basics.ItemLayers.Neg1, 0.10 * this.basics.W, 0.75 * this.basics.H, 1.25, 250);

        let box_layer = "Main";
        let box_x_pos = shuffleArray(this.Spots[box_layer])[0];

        // Expose coordinates for the extended class
        this.box_start_x = box_x_pos * this.basics.W;
        this.box_start_y = (this.layer_y_pos[box_layer] + 0.05) * this.basics.H;

        await this.box.create_and_appear_box(this.basics.ItemLayers[box_layer], this.basics.ItemLayers[box_layer], this.box_start_x, this.box_start_y, this.BoxSizes[box_layer], 0);

        const box_clicked = () => this.handle_box_found();
        this.box.BoxBase.style.cursor = "pointer";
        this.box.BoxTop.style.cursor = "pointer";
        this.box.BoxBase.onpointerdown = box_clicked;
        this.box.BoxTop.onpointerdown = box_clicked;

        this.foliageLogic.spawn_foliage(this.basics.ItemLayers, this.Spots, this.layer_y_pos, this.FoliageSizes);

        Interface.Prompt.show_message(`Uh oh! ${this.FenObj.name} has lost the ${this.box.boxname}!`);
        AudioCont.play_sound_effect("sad");
        await wait(1000);
        Interface.Prompt.show_message(`${this.FenObj.name} looks so sad! Click to cheer ${this.FenObj.name}  up.`);
        await this.basics.trigger_comfort_checkin();
        await wait(500);

        Interface.Prompt.show_message(`Please cut down the plants until you find the ${this.box.boxname}`);
        this.foliageLogic.make_foliage_cuttable();

        if (this.partner.is_present) {
            // FIX: Pass the X coordinate of the hidden box so the partner knows not to stand on it!
            this.foliageLogic.start_partner_cutting(this.partner, this.box_start_x);
        }
    }

    clean_up() {
        this.basics.clean_up();
        this.box.clean_up();
        this.foliageLogic.clean_up();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
    }
}

class FindBoxExtendedTrialController extends FindBoxTrialController {

    constructor(FenObj, partner_is_present, returnfunc) {
        super(FenObj, partner_is_present, returnfunc);
        this.dustLogic = new DustModule();
    }

    async start_sequence() {
        // Start the parent sequence
        let p = super.start_sequence();

        // Defensively wait until the asynchronous parent function actually creates the box DOM elements
        let checkCount = 0;
        let checkInterval = setInterval(() => {
            if (this.box && this.box.BoxBase) {
                this.dustLogic.apply_dust_filter(this.box.BoxBase, this.box.BoxTop);
                clearInterval(checkInterval);
            }
            checkCount++;
            if (checkCount > 100) clearInterval(checkInterval); // Failsafe: stop checking after 5 seconds
        }, 50);

        await p;
    }

    async trigger_post_discovery_phase() {
        // TWEAK: Dramatically wash out the background mask to pull all focus to the dusty box!
        if (this.basics.BackgroundMask) {
            this.basics.BackgroundMask.style.transition = "opacity 1000ms ease-in-out";
            this.basics.BackgroundMask.style.opacity = "0.8";
        }

        Interface.Prompt.show_message("Oh no! The " + this.box.boxname + " is covered in thick dust!");
        AudioCont.play_sound_effect("sad");
        await wait(1500);

        Interface.Prompt.show_message("Click the bellows repeatedly to blow the dust away!");

        let centered_box_x = 0.6 * this.basics.W;
        let centered_box_y = 0.7 * this.basics.H;

        this.dustLogic.spawn_and_enable_bellows(
            this.basics.ItemLayers.Plus2,
            centered_box_x,
            centered_box_y,
            () => this.on_dust_cleared()
        );
    }

    async on_dust_cleared() {
        Interface.Prompt.hide();
        await wait(1000);

        // TWEAK: Restore the background mask to normal for the vibrant celebration!
        if (this.basics.BackgroundMask) {
            this.basics.BackgroundMask.style.transition = "opacity 1000ms ease-in-out";
            this.basics.BackgroundMask.style.opacity = "0.8";
        }

        // Trigger the standard celebration now that it's clean!
        AudioCont.play_sound_effect("positive");
        Interface.Prompt.show_message(`${this.FenObj.name} is very grateful that you found the clean ${this.box.boxname}!`);

        await this.basics.perform_success_celebration(this.box.BoxBase);

        this.returnfunc();
    }

    clean_up() {
        super.clean_up();
        this.dustLogic.clean_up();
    }
}

class BrokenToyInBoxTrialController {

    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);
        this.brokenToyLogic = new BrokenToyModule(FenObj);

        this.trial_is_active = true;
        this.failsafe_timeout = null; // Track the idle auto-place timer
    }

    handle_part_placed(remaining_count) {
        if (remaining_count === 0) {
            this.handle_all_parts_placed();
        } else {
            this.reset_failsafe_timer();
        }
    }

    reset_failsafe_timer() {
        if (this.failsafe_timeout) clearTimeout(this.failsafe_timeout);

        // Only run failsafe if the trial is active AND there is no partner
        if (!this.trial_is_active || this.partner.is_present) return;

        this.failsafe_timeout = setTimeout(() => this.trigger_auto_solve(), 10000);
    }

    // NEW: The 30-second Auto-Solve
    trigger_auto_solve() {
        if (!this.trial_is_active) return;

        let targetPart = this.brokenToyLogic.get_random_unplaced_part();
        if (!targetPart) return;

        targetPart.is_locked = true;

        // Animate the piece into position automatically (takes 600ms)
        this.brokenToyLogic.set_part_transform(targetPart, 0, 0, 0);

        setTimeout(() => {
            this.brokenToyLogic.snap_part_to_correct(targetPart, (count) => this.handle_part_placed(count));
        }, 600);
    }

    async handle_all_parts_placed() {
        this.trial_is_active = false;
        if (this.failsafe_timeout) clearTimeout(this.failsafe_timeout); // Kill the clock

        // Restore pointer events so the whole toy can be dragged into the box later
        this.brokenToyLogic.restore_pointer_events();

        Interface.Prompt.hide();
        await wait(1000);
        AudioCont.play_sound_effect("positive");
        Interface.Prompt.show_message("You did it! You fixed the " + this.FenObj.toy + "!")

        await this.brokenToyLogic.play_repair_celebration(this.basics.ItemLayers.Plus2);
        await wait(200)
        await this.brokenToyLogic.shrink_to_normal();

        let fenTarget = getSVGInternalCenter(this.basics.TargetPoints.Fennimal_body_center);
        let currentToyCenter = getSVGInternalCenter(this.brokenToyLogic.ToyElement);

        let dx = fenTarget.x - currentToyCenter.x;
        let dy = fenTarget.y - currentToyCenter.y;

        this.brokenToyLogic.ToyElement.style.transition = "all 500ms ease-in-out";
        this.brokenToyLogic.ToyElement.style.transform += ` translate(${dx}px, ${dy}px)`;

        await wait(900);

        await this.brokenToyLogic.charge_toy(this.basics.ItemLayers.Plus2, 0.5 * this.basics.W, 0.4 * this.basics.H,this.basics );
        await this.brokenToyLogic.play_with_toy(this.basics);

        this.brokenToyLogic.ToyElement.style.transition = "all 200ms ease-out";
        this.brokenToyLogic.ToyElement.style.transform += "translate(50px, 150px)";
        await wait(1000);

        Interface.Prompt.show_message("Place the " + this.FenObj.toy + " into the "+ this.box.boxname);
        AudioCont.play_sound_effect("alert_minor");

        new MakeObjectDraggableObject(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            this.brokenToyLogic.ToyElement, // <-- FIXED
            this.box.BoxBase,
            200,
            (DroppedToyElement) => {
                shared_toy_drop_sequence(DroppedToyElement, this.box, this.basics, this.partner, this.FenObj, () => this.finish_trial());
            }
        );
    }

    async partner_repair_loop() {
        if (!this.trial_is_active) return;

        let delay = 5000 + (Math.random() * 5000);
        await wait(delay);

        if (!this.trial_is_active) return;

        let targetPart = this.brokenToyLogic.get_random_unplaced_part();
        if (!targetPart) return;

        targetPart.is_locked = true;

        let partAbsCenter = getSVGInternalCenter(targetPart.element);
        let pTrans = this.partner.PartnerTranslateGroup;
        pTrans.style.transition = "all 1000ms ease-in-out";

        let dxToPart = partAbsCenter.x - getSVGInternalCenter(pTrans).x;
        pTrans.style.transform += `translateX(${dxToPart}px)`;
        await wait(1200);

        let frameAbsCenter = getSVGInternalCenter(this.brokenToyLogic.ToyFrame);
        let dxToFrame = frameAbsCenter.x - getSVGInternalCenter(pTrans).x;
        pTrans.style.transform += `translateX(${dxToFrame}px)`;

        this.brokenToyLogic.set_part_transform(targetPart, 0, 0, 0);
        await wait(600);

        // Notify the central router!
        this.brokenToyLogic.snap_part_to_correct(targetPart, (count) => this.handle_part_placed(count));

        pTrans.style.transform = "";
        await wait(1000);

        this.partner_repair_loop();
    }

    async finish_trial() {
        Interface.Prompt.show_message(this.FenObj.name + " is happy that you're keeping the " + this.FenObj.toy + " safe!");
        await this.basics.perform_success_celebration(this.box.BoxBase);
        this.returnfunc();
    }

    // ON START
    async start_sequence() {
        this.basics.create_svg_sublayers();

        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }

        await this.basics.create_background_mask(true, 500);
        await this.basics.create_and_appear_Fennimal(this.basics.ItemLayers.Main, 0.2 * this.basics.W, 0.8 * this.basics.H, 1.75, 250);
        await this.box.create_and_appear_box(this.basics.ItemLayers.Main, this.basics.ItemLayers.Plus2, 0.5 * this.basics.W, 0.8 * this.basics.H, 4, 100);

        let boxCenter = getSVGInternalCenter(this.box.BoxBase);
        this.brokenToyLogic.setup_overlapping_broken_toy(this.basics.ItemLayers.Main, boxCenter.x, boxCenter.y);

        await wait(1000);
        this.box.wait_for_user_click("open", async () => {
            await wait(500);

            // 1. The Disaster
            await this.brokenToyLogic.move_to_center_and_explode(this.basics.ItemLayers.Plus2, 0.5 * this.basics.W, 0.4 * this.basics.H);

            Interface.Prompt.show_message("Oops! The toy has broken into parts!");
            AudioCont.play_sound_effect("sad");
            await wait(1000); // Pause to let the sadness set in

            // ----------------------------------------------------
            // 2. NEW: The Comfort Roadblock
            // ----------------------------------------------------
            Interface.Prompt.show_message(`Oh no, ${this.FenObj.name} is upset! Click on ${this.FenObj.name}  to cheer ${this.FenObj.name}  up.`);
            await this.brokenToyLogic.set_exploded_toy_opacity(0.6);
            await this.basics.trigger_comfort_checkin();
            await this.brokenToyLogic.set_exploded_toy_opacity(1);
            await wait(500); // Brief pause after the happy jump before giving the next instruction
            // ----------------------------------------------------

            // 3. The Repair
            Interface.Prompt.show_message("Please move all the parts to their correct position!");

            // Activate physics and pass in our central router function
            this.brokenToyLogic.enable_dragging((count) => this.handle_part_placed(count));

            if (this.partner.is_present) {
                this.partner_repair_loop();
            } else {
                // Partner isn't here, start the clock!
                this.reset_failsafe_timer();
            }
        });
    }

    clean_up() {
        if (this.failsafe_timeout) clearTimeout(this.failsafe_timeout);
        this.basics.clean_up();
        this.box.clean_up();
        this.brokenToyLogic.clean_up();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
    }
}

// ---------------------------------------------------------------------------
// DirtyToy / DirtyAndBrokenToy
// ---------------------------------------------------------------------------
class DirtyToyTrialController {

    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        // Workers
        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);

        // We reuse the Foliage and StandardToy logic perfectly!
        this.foliageLogic = new FoliageModule(FenObj);
        this.toyLogic = new StandardToyModule(FenObj);
        this.dirtLogic = new DirtModule();
    }

    // --- PHASE 1: Foliage Cleared ---
    async handle_foliage_cleared() {
        AudioCont.play_sound_effect("success");
        if (this.partner.is_present) {
            await this.partner.return_to_start();
        }

        // Standard Box Opening
        if (this.partner.is_present) {
            Interface.Prompt.show_message(this.partner.partnername + " opens the " + this.box.boxname);
            await this.partner.move_to_element_and_act(this.box.BoxBase, () => this.box.open_box());
            await wait(500);
            this.start_scrubbing_minigame();
        } else {
            this.box.wait_for_user_click("open", () => this.start_scrubbing_minigame());
        }
    }

    // --- PHASE 2: Pop out and Scrub ---
    async start_scrubbing_minigame() {
        Interface.Prompt.hide();
        await wait(500);

        // Move toy out of the box and zoom in
        let center_x = 0.5 * this.basics.W;
        let center_y = 0.4 * this.basics.H;

        this.basics.ItemLayers.Plus2.appendChild(this.toyLogic.ToyElement);
        this.toyLogic.ToyElement.style.transition = "all 500ms ease-in-out";

        let BBox = this.toyLogic.ToyElement.getBBox();
        let delta_x = center_x - (BBox.x + 0.5 * BBox.width);
        let delta_y = center_y - (BBox.y + BBox.height);

        this.toyLogic.ToyElement.style.transform = `translate(${delta_x}px, ${delta_y}px) scale(${this.toyLogic.zoomFactor})`;
        await wait(600);

        // Oh no, it's dirty! Spawn dirt on the toy.
        Interface.Prompt.show_message("Oops! The " + this.FenObj.toy + " is covered in dirt! Grab the sponge to clean it!");
        AudioCont.play_sound_effect("sad");

        let num_dirt = 5 + Math.floor(Math.random() * 5); // 5 to 9 spots
        this.dirtLogic.spawn_dirt_on_element(this.toyLogic.ToyElement, this.basics.ItemLayers.Plus2, num_dirt);

        await wait(1000);

        // Spawn sponge on the right side
        let sponge_x = 0.65 * this.basics.W;
        let sponge_y = 0.5 * this.basics.H;
        this.dirtLogic.spawn_and_enable_sponge(this.basics.ItemLayers.Plus2, sponge_x, sponge_y, () => this.handle_toy_cleaned());
    }

    async handle_toy_cleaned() {
        Interface.Prompt.hide();
        await wait(1000);

        // 1. Move to Fennimal and shrink BEFORE charging
        let fenCenter = getSVGInternalCenter(this.basics.TargetPoints.Fennimal_body_center);
        await this.toyLogic.move_to_center_of_target_and_shrink(fenCenter);
        await wait(200);

        // 2. The toy is clean and with the Fennimal! Now charge it.
        await this.toyLogic.charge_toy(this.basics.ItemLayers.Plus2, 0.5 * this.basics.W, 0.4 * this.basics.H, this.basics);

        // 3. Play and Discard
        await this.toyLogic.play_with_toy(this.basics);
        await wait(500);
        Interface.Prompt.show_message(this.FenObj.name + " has finished playing with the " + this.FenObj.toy);
        await wait(500);

        //this.basics.Fennimal_move_relative(-400, 0, 500);
        await this.toyLogic.done_playing();

        // 4. Setup Dragging Interaction
        Interface.Prompt.show_message("Place the " + this.FenObj.toy + " into the " + this.box.boxname);
        AudioCont.play_sound_effect("alert_minor");

        new MakeObjectDraggableObject(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            this.toyLogic.ToyElement, // <-- FIXED
            this.box.BoxBase,
            200,
            (DroppedToyElement) => {
                shared_toy_drop_sequence(DroppedToyElement, this.box, this.basics, this.partner, this.FenObj, () => this.finish_trial());
            }
        );
    }

    async finish_trial() {
        Interface.Prompt.show_message(this.FenObj.name + " is happy that you're keeping the " + this.FenObj.toy + " safe!");
        await this.basics.perform_success_celebration(this.box.BoxBase);
        this.returnfunc();
    }

    // ON START
    async start_sequence() {
        this.basics.create_svg_sublayers();

        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }

        await this.basics.create_background_mask(true, 500);
        await this.basics.create_and_appear_Fennimal(this.basics.ItemLayers.Main, 0.2 * this.basics.W, 0.8 * this.basics.H, 1.75, 250);

        // Plant the box in the middle of the screen
        let boxCenter = { x: 0.5 * this.basics.W, y: 0.7 * this.basics.H };
        await this.box.create_and_appear_box(this.basics.ItemLayers.Main, this.basics.ItemLayers.Plus2, boxCenter.x, boxCenter.y, 4, 100);

        // Prep the toy inside the box
        await this.toyLogic.create_and_appear_toy(this.basics.ItemLayers.Main, "dirty_toy", boxCenter.x, boxCenter.y, 4, 0);

        // Spawn Foliage
        this.foliageLogic.spawn_foliage_around_target(this.basics.ItemLayers, boxCenter.x, boxCenter.y);

        Interface.Prompt.show_message("Oops! The " + this.box.boxname + " is covered in plants.");
        AudioCont.play_sound_effect("sad");

        await wait(1000);
        Interface.Prompt.show_message(`${this.FenObj.name} looks so sad! Click to cheer ${this.FenObj.name} up.`);
        await this.basics.trigger_comfort_checkin();
        await wait(500);

        Interface.Prompt.show_message("Click on the plants to cut them down")
        this.foliageLogic.make_foliage_cuttable(() => this.handle_foliage_cleared());

        if (this.partner.is_present) {
            this.foliageLogic.start_partner_cutting(this.partner);
        }
    }

    clean_up() {
        this.basics.clean_up();
        this.box.clean_up();
        this.toyLogic.clean_up();
        this.dirtLogic.clean_up();
        this.foliageLogic.clean_up();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
    }
}

class DirtyAndBrokenToyTrialController {

    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        // Workers
        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);

        // We need all three logic modules for this gauntlet!
        this.foliageLogic = new FoliageModule(FenObj, partner_is_present);
        this.brokenToyLogic = new BrokenToyModule(FenObj);
        this.dirtLogic = new DirtModule();

        this.trial_is_active = true;
        this.failsafe_timeout = null; // Track the idle auto-place timer for the broken toy part
    }

    // --- PHASE 1: Foliage Cleared ---
    async handle_foliage_cleared() {
        AudioCont.play_sound_effect("success");
        if (this.partner.is_present) {
            await this.partner.return_to_start();
        }

        // Standard Box Opening
        if (this.partner.is_present) {
            Interface.Prompt.show_message(this.partner.partnername + " opens the " + this.box.boxname);
            await this.partner.move_to_element_and_act(this.box.BoxBase, () => this.box.open_box());
            await wait(500);
            this.start_broken_toy_minigame();
        } else {
            this.box.wait_for_user_click("open", () => {
                wait(500).then(() => this.start_broken_toy_minigame());
            });
        }
    }

    // --- PHASE 2: Broken Toy Minigame ---
    async start_broken_toy_minigame() {
        // 1. Explode the toy
        await this.brokenToyLogic.move_to_center_and_explode(this.basics.ItemLayers.Plus2, 0.5 * this.basics.W, 0.4 * this.basics.H);

        Interface.Prompt.show_message("Oops! The toy has broken into parts!");
        AudioCont.play_sound_effect("sad");
        await wait(1000);

        // 2. Comfort the sad Fennimal
        Interface.Prompt.show_message(`Oh no, ${this.FenObj.name} is upset! Click on ${this.FenObj.name} to cheer ${this.FenObj.name} up.`);
        await this.brokenToyLogic.set_exploded_toy_opacity(0.6);
        await this.basics.trigger_comfort_checkin();
        await this.brokenToyLogic.set_exploded_toy_opacity(1);
        await wait(500);

        // 3. Start the Repair
        Interface.Prompt.show_message("Please move all the parts to their correct position!");

        this.brokenToyLogic.enable_dragging((count) => this.handle_part_placed(count));

        if (this.partner.is_present) {
            this.partner_repair_loop();
        } else {
            this.reset_failsafe_timer();
        }
    }

    handle_part_placed(remaining_count) {
        if (remaining_count === 0) {
            this.handle_all_parts_placed();
        } else {
            this.reset_failsafe_timer();
        }
    }

    reset_failsafe_timer() {
        if (this.failsafe_timeout) clearTimeout(this.failsafe_timeout);
        if (!this.trial_is_active || this.partner.is_present) return;
        this.failsafe_timeout = setTimeout(() => this.trigger_auto_solve(), 10000);
    }

    trigger_auto_solve() {
        if (!this.trial_is_active) return;
        let targetPart = this.brokenToyLogic.get_random_unplaced_part();
        if (!targetPart) return;

        targetPart.is_locked = true;
        this.brokenToyLogic.set_part_transform(targetPart, 0, 0, 0);

        setTimeout(() => {
            this.brokenToyLogic.snap_part_to_correct(targetPart, (count) => this.handle_part_placed(count));
        }, 600);
    }

    async partner_repair_loop() {
        if (!this.trial_is_active) return;

        let delay = 5000 + (Math.random() * 5000);
        await wait(delay);

        if (!this.trial_is_active) return;

        let targetPart = this.brokenToyLogic.get_random_unplaced_part();
        if (!targetPart) return;

        targetPart.is_locked = true;

        let partAbsCenter = getSVGInternalCenter(targetPart.element);
        let pTrans = this.partner.PartnerTranslateGroup;
        pTrans.style.transition = "all 1000ms ease-in-out";

        let dxToPart = partAbsCenter.x - getSVGInternalCenter(pTrans).x;
        pTrans.style.transform += `translateX(${dxToPart}px)`;
        await wait(1200);

        let frameAbsCenter = getSVGInternalCenter(this.brokenToyLogic.ToyFrame);
        let dxToFrame = frameAbsCenter.x - getSVGInternalCenter(pTrans).x;
        pTrans.style.transform += `translateX(${dxToFrame}px)`;

        this.brokenToyLogic.set_part_transform(targetPart, 0, 0, 0);
        await wait(600);

        this.brokenToyLogic.snap_part_to_correct(targetPart, (count) => this.handle_part_placed(count));

        pTrans.style.transform = "";
        await wait(1000);

        this.partner_repair_loop();
    }

    async handle_all_parts_placed() {
        this.trial_is_active = false; // Stop loops
        if (this.failsafe_timeout) clearTimeout(this.failsafe_timeout);

        this.brokenToyLogic.restore_pointer_events();

        Interface.Prompt.hide();
        await wait(1000);
        AudioCont.play_sound_effect("positive");
        Interface.Prompt.show_message("You did it! You fixed the " + this.FenObj.toy + "!");

        await this.brokenToyLogic.play_repair_celebration(this.basics.ItemLayers.Plus2);
        await wait(200);
        await this.brokenToyLogic.shrink_to_normal();

        // Pass control to Phase 3
        this.start_scrubbing_minigame();
    }

    // --- PHASE 3: Dirty Toy Minigame ---
    async start_scrubbing_minigame() {
        Interface.Prompt.show_message("But wait... The " + this.FenObj.toy + " is covered in dirt! Grab the sponge to clean it!");
        AudioCont.play_sound_effect("sad");

        // Spawn dirt directly on the newly repaired ToyElement
        let num_dirt = 5 + Math.floor(Math.random() * 5);
        this.dirtLogic.spawn_dirt_on_element(this.brokenToyLogic.ToyElement, this.basics.ItemLayers.Plus2, num_dirt);

        await wait(1000);

        let sponge_x = 0.65 * this.basics.W;
        let sponge_y = 0.5 * this.basics.H;
        this.dirtLogic.spawn_and_enable_sponge(this.basics.ItemLayers.Plus2, sponge_x, sponge_y, () => this.handle_toy_cleaned());
    }

    async handle_toy_cleaned() {
        Interface.Prompt.hide();
        await wait(1000);

        // 1. Move to Fennimal and shrink BEFORE charging
        let fenCenter = getSVGInternalCenter(this.basics.TargetPoints.Fennimal_body_center);
        await this.brokenToyLogic.move_to_center_of_target_and_shrink(fenCenter);
        await wait(200);

        // 2. The toy is clean and with the Fennimal! Now charge it.
        await this.brokenToyLogic.charge_toy(this.basics.ItemLayers.Plus2, 0.5 * this.basics.W, 0.4 * this.basics.H, this.basics);

        // 3. Play and Discard
        await this.brokenToyLogic.play_with_toy(this.basics);
        await wait(500);
        Interface.Prompt.show_message(this.FenObj.name + " has finished playing with the " + this.FenObj.toy);
        await wait(500);

        await this.brokenToyLogic.done_playing();

        // 4. Setup Dragging Interaction
        Interface.Prompt.show_message("Place the " + this.FenObj.toy + " into the " + this.box.boxname);
        AudioCont.play_sound_effect("alert_minor");

        new MakeObjectDraggableObject(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            this.brokenToyLogic.ToyElement, // <-- FIXED
            this.box.BoxBase,
            200,
            (DroppedToyElement) => {
                shared_toy_drop_sequence(DroppedToyElement, this.box, this.basics, this.partner, this.FenObj, () => this.finish_trial());
            }
        );
    }

    async finish_trial() {
        Interface.Prompt.show_message(this.FenObj.name + " is happy that you're keeping the " + this.FenObj.toy + " safe!");
        await this.basics.perform_success_celebration(this.box.BoxBase);
        this.returnfunc();
    }

    // ON START
    async start_sequence() {
        this.basics.create_svg_sublayers();

        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }

        await this.basics.create_background_mask(true, 500);
        await this.basics.create_and_appear_Fennimal(this.basics.ItemLayers.Main, 0.2 * this.basics.W, 0.8 * this.basics.H, 1.75, 250);

        let boxCenter = { x: 0.5 * this.basics.W, y: 0.7 * this.basics.H };
        await this.box.create_and_appear_box(this.basics.ItemLayers.Main, this.basics.ItemLayers.Plus2, boxCenter.x, boxCenter.y, 4, 100);

        // Prep the broken toy inside the box
        this.brokenToyLogic.setup_overlapping_broken_toy(this.basics.ItemLayers.Main, boxCenter.x, boxCenter.y);

        // Spawn Foliage
        this.foliageLogic.spawn_foliage_around_target(this.basics.ItemLayers, boxCenter.x, boxCenter.y);

        Interface.Prompt.show_message("Oops! The " + this.box.boxname + " is covered in plants.");
        AudioCont.play_sound_effect("sad");

        await wait(1000);
        Interface.Prompt.show_message(`${this.FenObj.name} looks so sad! Click to cheer ${this.FenObj.name} up.`);
        await this.basics.trigger_comfort_checkin();
        await wait(500);

        Interface.Prompt.show_message("Click on the plants to cut them down");
        this.foliageLogic.make_foliage_cuttable(() => this.handle_foliage_cleared());

        if (this.partner.is_present) {
            this.foliageLogic.start_partner_cutting(this.partner);
        }
    }

    clean_up() {
        if (this.failsafe_timeout) clearTimeout(this.failsafe_timeout);
        this.basics.clean_up();
        this.box.clean_up();
        this.brokenToyLogic.clean_up();
        this.dirtLogic.clean_up();
        this.foliageLogic.clean_up();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
    }
}

// ---------------------------------------------------------------------------
// FeedFennimalTrialController
// ---------------------------------------------------------------------------
// Hungry Fennimal: comfort → get correct food bag (backpack solo / partner handoff) → fill bowl → eat → dance + wander.
class FeedFennimalTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        this.basics = new BasicElementsModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);
        this.params = GenParam.FeedTrial;

        this.flavor = FenObj.food_preference;
        this.FoodBowl = null;
        this.Backpack = null;
        this.bags = []; // { elem, flavor, inColumn }
        this.columnBags = [];
        this.dragControllers = [];
        this.activeDragBag = null;
        this.feedingComplete = false;
    }

    get_all_food_flavors() {
        return Array.from(document.getElementsByClassName("foodbag_flavor"))
            .map(b => b.id.split("_")[2])
            .filter(Boolean);
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
        let bag = copy_scale_and_move_object_to_position(template, parent, x, y, scale);

        Array.from(bag.getElementsByClassName("foodbag_flavor")).forEach(flavorNode => {
            let nodeFlavor = flavorNode.id.split("_")[2];
            if (nodeFlavor !== flavor) {
                flavorNode.remove();
            } else {
                flavorNode.style.display = "inherit";
                flavorNode.removeAttribute("display");
            }
        });

        let accent = this.extract_flavor_accent_color(flavor);
        bag.querySelectorAll(".foodbag_color").forEach(swatch => {
            swatch.setAttribute("fill", accent);
            swatch.style.fill = accent;
        });

        bag.dataset.feedFlavor = flavor;
        return bag;
    }

    pick_distractor_flavors(count) {
        let others = this.get_all_food_flavors().filter(f => f !== this.flavor);
        return shuffleArray(others).slice(0, count);
    }

    set_element_center(elem, x, y, time = 0) {
        let center = getSVGInternalCenter(elem);
        let dx = x - center.x;
        let dy = y - center.y;
        if (time > 0) {
            elem.style.transition = `transform ${time}ms ease-in-out`;
        } else {
            elem.style.transition = "";
        }
        elem.style.transform = (elem.style.transform || "") + ` translate(${dx}px, ${dy}px)`;
        return wait(time);
    }

    async move_bag_to_home(bagInfo, time = 350) {
        if (!bagInfo || !bagInfo.elem) return;
        await this.set_element_center(bagInfo.elem, bagInfo.homeX, bagInfo.homeY, time);
    }

    // --- Bowl ---

    async spawn_empty_bowl() {
        const p = this.params;
        this.FoodBowl = copy_scale_and_move_object_to_position(
            document.getElementById("foodbowl"),
            this.basics.ItemLayers.Main,
            p.bowlX * this.basics.W,
            p.bowlY * this.basics.H,
            p.bowlScale
        );
        this.FoodBowl.id = "feed_trial_foodbowl";

        this.FoodBowl.querySelectorAll(".food").forEach(food => {
            food.style.display = "none";
            food.style.opacity = 0;
        });

        this.FoodBowl.style.opacity = 0;
        window.getComputedStyle(this.FoodBowl).opacity;
        this.FoodBowl.style.transition = "opacity 250ms ease-out";
        this.FoodBowl.style.opacity = 1;
        await wait(250);
    }

    reveal_bowl_food() {
        // Query inside the cloned bowl only — template nodes in Items.svg share the same IDs.
        ["first", "second", "third"].forEach(portion => {
            let food = Array.from(this.FoodBowl.querySelectorAll(".food." + this.flavor))
                .find(el => (el.id || "").includes(portion));
            if (food) {
                food.style.display = "inherit";
                food.style.opacity = 1;
            }
        });
    }

    get_bowl_food_pieces() {
        let pieces = Array.from(this.FoodBowl.querySelectorAll(".food." + this.flavor));
        const order = { first: 0, second: 1, third: 2 };
        pieces.sort((a, b) => {
            let ka = Object.keys(order).find(k => (a.id || "").includes(k));
            let kb = Object.keys(order).find(k => (b.id || "").includes(k));
            return (order[ka] ?? 9) - (order[kb] ?? 9);
        });
        return pieces;
    }

    // --- Backpack (solo) ---

    spawn_backpack() {
        const p = this.params;
        this.Backpack = copy_scale_and_move_object_to_position(
            document.getElementById("backpack"),
            this.basics.ItemLayers.Plus1,
            p.backpackX * this.basics.W,
            p.backpackY * this.basics.H,
            p.backpackScale
        );
        this.Backpack.id = "feed_trial_backpack";

        set_backpack_flaps_open(this.Backpack, false);
    }

    open_backpack() {
        let flaps = this.Backpack.getElementsByClassName("backpack_flap");
        for (let i = 0; i < flaps.length; i++) {
            flaps[i].style.transition = "opacity 250ms ease-in-out";
        }
        set_backpack_flaps_open(this.Backpack, true);
        return wait(280);
    }

    get_column_slot_ys(count) {
        const p = this.params;
        let top = p.bagColumnTopY * this.basics.H;
        let bottom = p.bagColumnBottomY * this.basics.H;
        if (count <= 1) return [(top + bottom) / 2];
        let ys = [];
        for (let i = 0; i < count; i++) {
            ys.push(top + (i / (count - 1)) * (bottom - top));
        }
        return ys;
    }

    get_backpack_column_x() {
        return this.params.backpackX * this.basics.W;
    }

    async pop_bags_from_backpack(flavors) {
        const p = this.params;
        const x = this.get_backpack_column_x();
        const startY = p.backpackY * this.basics.H - 40;
        // First bag out = highest slot; last out = lowest.
        let slotYs = this.get_column_slot_ys(flavors.length);

        this.bags = [];
        this.columnBags = [];

        for (let i = 0; i < flavors.length; i++) {
            let bag = this.create_foodbag(
                flavors[i],
                this.basics.ItemLayers.Plus2,
                x,
                startY,
                p.bagScale
            );
            bag.style.opacity = 0;
            let entry = {
                elem: bag,
                flavor: flavors[i],
                inColumn: true,
                homeX: x,
                homeY: slotYs[i]
            };
            this.bags.push(entry);
            this.columnBags.push(entry);

            window.getComputedStyle(bag).opacity;
            bag.style.transition = `opacity ${p.bagMoveTime}ms ease-out, transform ${p.bagMoveTime}ms ease-in-out`;
            bag.style.opacity = 1;
            await this.set_element_center(bag, x, slotYs[i], p.bagMoveTime);
            await wait(p.bagPopStagger);
        }
    }

    async respread_column_bags(animate = true) {
        let active = this.columnBags.filter(b => b.inColumn && b.elem);
        let slotYs = this.get_column_slot_ys(active.length);
        let x = this.get_backpack_column_x();
        let time = animate ? this.params.bagMoveTime : 0;

        // Tear down drag scaffolding first so outlines aren't left behind when bags move.
        active.forEach(b => {
            if (b.dragController) {
                b.dragController.destroy();
                b.dragController = null;
            }
        });
        this.dragControllers = this.dragControllers.filter(c =>
            this.activeDragBag && this.activeDragBag.dragController === c
        );

        active.forEach((b, i) => {
            b.homeX = x;
            b.homeY = slotYs[i];
        });
        await Promise.all(active.map((b) => this.move_bag_to_home(b, time)));

        // Recreate drag handles for bags still in the column (not the one being held).
        active.forEach(bagInfo => {
            if (!bagInfo.elem || !bagInfo.elem.parentNode) return;
            let controller = MakeObjectDraggableObject(
                this.basics.ItemLayers.Plus2,
                this.basics.ItemLayers.Questions,
                bagInfo.elem,
                this.FoodBowl,
                this.params.dropDistance,
                (elem) => this.on_bag_dropped_on_bowl(elem),
                {
                    onStart: (elem) => this.on_bag_drag_start(elem),
                    onMiss: (elem) => this.on_bag_drag_miss(elem)
                }
            );
            this.dragControllers.push(controller);
            bagInfo.dragController = controller;
        });
    }

    destroy_all_drag_controllers() {
        this.dragControllers.forEach(c => {
            if (c && c.destroy) c.destroy();
        });
        this.dragControllers = [];
        this.bags.forEach(b => { b.dragController = null; });
    }

    enable_bag_dragging() {
        this.destroy_all_drag_controllers();

        this.bags.forEach(bagInfo => {
            if (!bagInfo.elem || !bagInfo.elem.parentNode) return;

            let controller = MakeObjectDraggableObject(
                this.basics.ItemLayers.Plus2,
                this.basics.ItemLayers.Questions,
                bagInfo.elem,
                this.FoodBowl,
                this.params.dropDistance,
                (elem) => this.on_bag_dropped_on_bowl(elem),
                {
                    onStart: (elem) => this.on_bag_drag_start(elem),
                    onMiss: (elem) => this.on_bag_drag_miss(elem)
                }
            );
            this.dragControllers.push(controller);
            bagInfo.dragController = controller;
        });
    }

    find_bag_info(elem) {
        return this.bags.find(b => b.elem === elem);
    }

    on_bag_drag_start(elem) {
        let info = this.find_bag_info(elem);
        if (!info) return;
        this.activeDragBag = info;
        info.inColumn = false;
        this.respread_column_bags(true);
    }

    async on_bag_drag_miss(elem) {
        let info = this.find_bag_info(elem);
        if (!info || this.feedingComplete) return;

        if (this.partner.is_present) {
            await this.move_bag_to_home(info, 300);
            this.enable_bag_dragging();
            return;
        }

        info.inColumn = true;
        if (!this.columnBags.includes(info)) this.columnBags.push(info);
        await this.respread_column_bags(true);
        this.enable_bag_dragging();
    }

    async on_bag_dropped_on_bowl(elem) {
        if (this.feedingComplete) return;

        let info = this.find_bag_info(elem);
        if (!info) return;

        if (info.flavor !== this.flavor) {
            AudioCont.play_sound_effect("rejected");

            if (this.partner.is_present) {
                await this.move_bag_to_home(info, 300);
                this.enable_bag_dragging();
                return;
            }

            info.inColumn = true;
            if (!this.columnBags.includes(info)) this.columnBags.push(info);
            await this.respread_column_bags(true);
            this.enable_bag_dragging();
            return;
        }

        this.feedingComplete = true;
        this.destroy_all_drag_controllers();
        await this.handle_correct_feed(info);
    }

    async wait_for_backpack_open_click() {
        return new Promise(resolve => {
            Interface.Prompt.show_message("Click to open the backpack");
            AudioCont.play_sound_effect("alert_minor");

            this.Backpack.style.cursor = "pointer";
            let outline = create_SVG_outline_of_group_ID(this.Backpack);
            this.Backpack.parentNode.insertBefore(outline, this.Backpack);
            outline.classList.add("focus_on_SVG_outline");

            this.Backpack.onpointerdown = () => {
                this.Backpack.onpointerdown = null;
                this.Backpack.style.cursor = "auto";
                outline.remove();
                resolve();
            };
        });
    }

    async run_solo_backpack_sequence() {
        this.spawn_backpack();
        await this.wait_for_backpack_open_click();
        await this.open_backpack();

        let distractors = this.pick_distractor_flavors(2);
        // Pop order: correct among the three, shuffled for column order but first out = highest slot.
        let flavors = shuffleArray([this.flavor, ...distractors]);
        await this.pop_bags_from_backpack(flavors);

        Interface.Prompt.show_message("This Fennimal likes " + this.flavor);
        await wait(750);
        Interface.Prompt.show_message(
            "Drag the " + this.flavor + " bag to " + this.FenObj.name + "'s bowl"
        );
        this.enable_bag_dragging();
    }

    // --- Partner handoff ---

    async run_partner_handoff_sequence() {
        const p = this.params;
        Interface.Prompt.show_message(
            this.partner.partnername + " has brought some food for " + this.FenObj.name
        );
        await wait(750);

        let partnerCenter = getSVGInternalCenter(this.partner.PartnerBaseGroup);
        let bagStartX = partnerCenter.x + p.partnerBagOffsetX;
        let bagStartY = partnerCenter.y + p.partnerBagOffsetY;

        let bag = this.create_foodbag(
            this.flavor,
            this.basics.ItemLayers.Plus2,
            bagStartX,
            bagStartY,
            p.bagScale
        );
        bag.style.opacity = 0;
        window.getComputedStyle(bag).opacity;
        bag.style.transition = "opacity 250ms ease-out";
        bag.style.opacity = 1;
        await wait(250);

        let entry = { elem: bag, flavor: this.flavor, inColumn: false };
        this.bags = [entry];
        this.columnBags = [];

        let bowlCenter = getSVGInternalCenter(this.FoodBowl);
        let bagTargetX = bowlCenter.x + 140;
        let bagTargetY = bagStartY;
        let partnerDx = bagTargetX - bagStartX;

        // Move partner + bag left together.
        this.partner.PartnerTranslateGroup.style.transition = "transform 700ms ease-in-out";
        this.partner.PartnerTranslateGroup.style.transform =
            (this.partner.PartnerTranslateGroup.style.transform || "") + ` translateX(${partnerDx}px)`;
        await this.set_element_center(bag, bagTargetX, bagTargetY, 700);

        // Bag lifts; partner returns home.
        let liftY = bagTargetY + p.partnerHandoffLift;
        await this.set_element_center(bag, bagTargetX, liftY, 300);
        entry.homeX = bagTargetX;
        entry.homeY = liftY;
        await this.partner.return_to_start();

        Interface.Prompt.show_message(
            "Drag the " + this.flavor + " bag to " + this.FenObj.name + "'s bowl"
        );
        this.enable_bag_dragging();
    }

    // --- Correct feed aftermath ---

    async fade_out_bags_and_backpack() {
        let fadeTargets = this.bags.map(b => b.elem).filter(Boolean);
        if (this.Backpack) fadeTargets.push(this.Backpack);

        fadeTargets.forEach(el => {
            el.style.transition = "opacity 350ms ease-out";
            el.style.opacity = 0;
            el.style.pointerEvents = "none";
        });
        await wait(350);
        fadeTargets.forEach(el => el.remove());
        this.bags = [];
        this.Backpack = null;
    }

    async slide_bowl_to_mouth() {
        let mouth = getSVGInternalCenter(this.basics.TargetPoints.Fennimal_mouth);
        let bowlCenter = getSVGInternalCenter(this.FoodBowl);
        // Align bowl center X with mouth; keep roughly same Y (grounded).
        await this.set_element_center(this.FoodBowl, mouth.x, bowlCenter.y, 500);
        await wait(200);
    }

    async animate_eating() {
        // Food pieces live inside a scaled bowl; reparent into an unscaled layer but keep
        // bowlScale so size matches what was visible in the bowl.
        let mouth = getSVGInternalCenter(this.basics.TargetPoints.Fennimal_mouth);
        let pieces = this.get_bowl_food_pieces();
        let layer = this.basics.ItemLayers.Plus2;
        let scale = this.params.bowlScale;

        Interface.Prompt.show_message(this.FenObj.name + " loves " + this.flavor + "!");

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
            zeroGroup.style.transform = `translate(${-baseCenter.x}px, ${-baseCenter.y}px)`;
            scaleGroup.style.transform = `scale(${scale})`;
            mainPos.style.transition = "none";
            mainPos.style.transform = `translate(${start.x}px, ${start.y}px)`;

            window.getComputedStyle(mainPos).transform;
            mainPos.style.transition = `transform ${this.params.eatMoveTime}ms ease-in-out`;
            mainPos.style.transform = `translate(${mouth.x}px, ${mouth.y}px)`;
            await wait(this.params.eatMoveTime);

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

    async handle_correct_feed(correctBagInfo) {
        AudioCont.play_sound_effect("success");
        await this.fade_out_bags_and_backpack();

        this.reveal_bowl_food();
        await wait(300);
        await this.slide_bowl_to_mouth();
        await this.animate_eating();

        await this.basics.perform_success_celebration(null);
        await wait(750);

        Interface.Prompt.show_message(this.FenObj.name + " has wandered off...");
        let fenCenter = getSVGInternalCenter(this.basics.Fennimal);
        let dxOffscreen = -(fenCenter.x + 300);
        await this.basics.Fennimal_move_relative(dxOffscreen, 0, 750);
        await wait(500);
        this.returnfunc();
    }

    // --- Orchestrator ---

    async start_sequence() {
        if (!this.flavor) {
            console.error("FeedFennimalTrialController: FenObj has no food_preference");
            this.flavor = this.get_all_food_flavors()[0];
        }

        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }
        await this.basics.create_background_mask(true, 500);

        const p = this.params;
        await this.basics.create_and_appear_Fennimal(
            this.basics.ItemLayers.Main,
            p.fennimalX * this.basics.W,
            p.fennimalY * this.basics.H,
            p.fennimalScale,
            250
        );
        await this.spawn_empty_bowl();

        Interface.Prompt.show_message(
            this.FenObj.name + " is hungry. Click to cheer " + this.FenObj.name + " up."
        );
        AudioCont.play_sound_effect("sad");
        await this.basics.trigger_comfort_checkin();
        await wait(400);

        if (this.partner.is_present) {
            await this.run_partner_handoff_sequence();
        } else {
            await this.run_solo_backpack_sequence();
        }
    }

    clean_up() {
        this.destroy_all_drag_controllers();
        this.bags.forEach(b => { if (b.elem) b.elem.remove(); });
        if (this.Backpack) this.Backpack.remove();
        if (this.FoodBowl) this.FoodBowl.remove();
        this.basics.clean_up();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
    }
}

// ---------------------------------------------------------------------------
// CheckBoxContents / BoxRoom / ScanBoxHome / PartnerBeliefInSitu
// ---------------------------------------------------------------------------
// Closed box (+ partner): optional contents quiz → open → empty close OR take out → photo → put back → close.
// WorldState is left unchanged (inspection only).
class CheckBoxContentsTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);

        this.contents = null;
        this.toy = null;
        this.dragController = null;
        this.photoSession = null;
        this.toyClearDistance = 400;
    }

    async start_sequence() {
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }
        await this.basics.create_background_mask(true, 500);

        this.contents = WorldState.get_toybox_contents(this.FenObj.toybox);

        const boxScale = 4;
        const boxX = 0.45 * this.basics.W;
        const boxY = 0.7 * this.basics.H;
        await this.box.create_and_appear_box(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            boxX,
            boxY,
            boxScale,
            200
        );
        await wait(600);

        if (this.contents) {
            await this.run_contents_quiz();
            await this.spawn_contents_toy_in_box(boxScale);
        }

        await this.open_box();
        this.box.set_pointer_events_enabled(false);

        if (!this.contents) {
            await this.run_empty_box_path();
        } else {
            await this.run_occupied_box_path();
        }
    }

    async run_contents_quiz() {
        let options = Array.isArray(this.FenObj.toys_asked) ? [...this.FenObj.toys_asked] : [];
        if (!options.includes(this.contents)) options.push(this.contents);
        if (options.length === 0) {
            console.warn("check_box_contents: no toys_asked options; skipping quiz.");
            return;
        }

        this.FenObj.toy_errors_made = [];
        let bar = new ToyChoiceBar(
            this.basics.ItemLayers.Plus2,
            this.basics.W,
            this.basics.H
        );

        while (true) {
            Interface.Prompt.show_message("Which toy is in the " + this.box.boxname + "?");
            let selected = await bar.waitForSelection(shuffleArray([...options]));

            if (selected === this.contents) {
                AudioCont.play_sound_effect("positive");
                await bar.hide();
                let burstCenter = getSVGInternalCenter(this.box.BoxBase);
                await spawn_confetti_burst(
                    this.basics.ItemLayers.Plus2,
                    burstCenter.x,
                    burstCenter.y,
                    { awaitPopMs: 700 }
                );
                return;
            }

            AudioCont.play_sound_effect("rejected");
            this.FenObj.toy_errors_made.push(selected);
            Interface.Prompt.show_message("Oops, you picked the wrong toy!");
            await bar.hide();
            await wait(1000);
        }
    }

    async spawn_contents_toy_in_box(boxScale) {
        this.toy = new StandardToyModule({ toy: this.contents });
        let boxTarget = getSVGInternalCenter(
            this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]
        );
        await this.toy.create_and_appear_toy(
            this.basics.ItemLayers.Plus1,
            "check_contents",
            boxTarget.x,
            boxTarget.y,
            boxScale,
            0
        );
    }

    async open_box() {
        if (this.partner.is_present) {
            Interface.Prompt.show_message(this.partner.partnername + " opens the " + this.box.boxname);
            await this.partner.move_to_element_and_act(this.box.BoxBase, () => this.box.open_box());
            await wait(500);
        } else {
            await new Promise(resolve => {
                this.box.wait_for_user_click("open", () => resolve());
            });
            await wait(500);
        }
    }

    async run_empty_box_path() {
        Interface.Prompt.show_message("The " + this.box.boxname + " is empty");
        await wait(1200);

        // Self-timed: participant always closes, even if partner is present.
        await new Promise(resolve => {
            this.box.set_pointer_events_enabled(true);
            this.box.wait_for_user_click("close", () => resolve());
        });
        this.returnfunc();
    }

    async run_occupied_box_path() {
        await this.drag_toy_out_of_box();
        await this.run_toy_photo();
        await this.drag_toy_back_into_box();
        await this.close_box_and_finish();
    }

    async drag_toy_out_of_box() {
        Interface.Prompt.show_message(
            "Take the " + this.contents + " out of the " + this.box.boxname
        );
        AudioCont.play_sound_effect("alert_minor");

        let groundY = getSVGInternalCenter(this.box.BoxBase).y;

        await new Promise(resolve => {
            const enableDragAway = () => {
                this.dragController = new MakeObjectDraggableObject(
                    this.basics.ItemLayers.Main,
                    this.basics.ItemLayers.Plus2,
                    this.toy.ToyElement,
                    this.box.BoxBase,
                    this.toyClearDistance,
                    async (DraggedToyElement) => {
                        Interface.Prompt.hide();
                        if (this.dragController && this.dragController.destroy) {
                            this.dragController.destroy();
                        }
                        this.dragController = null;
                        DraggedToyElement.style.pointerEvents = "none";
                        DraggedToyElement.style.cursor = "auto";

                        let current = getSVGInternalCenter(DraggedToyElement);
                        if (current.y < groundY) {
                            let dy = groundY - current.y;
                            DraggedToyElement.style.transition = "transform 350ms ease-in";
                            DraggedToyElement.style.transform += ` translate(0px, ${dy}px)`;
                            await wait(350);
                        }
                        // WorldState intentionally unchanged.
                        resolve();
                    },
                    {
                        validateDrop: () => {
                            let toyCenter = getSVGInternalCenter(this.toy.ToyElement);
                            let boxCenter = getSVGInternalCenter(this.box.BoxBase);
                            return Math.abs(toyCenter.x - boxCenter.x) >= this.toyClearDistance;
                        },
                        onMiss: () => {
                            Interface.Prompt.show_message("Move it farther to the side of the box");
                            if (this.dragController && this.dragController.enable) {
                                this.dragController.enable();
                            }
                        }
                    }
                );
            };
            enableDragAway();
        });
    }

    create_toy_polaroid_contents(groupScale, targetCircle) {
        let template = document.getElementById("toy_" + this.contents);
        if (!template) return null;

        let toyIcon = copy_scale_and_move_object_to_position(
            template,
            groupScale,
            targetCircle.x,
            targetCircle.y,
            1
        );
        set_toy_color_scheme(toyIcon, this.contents, false);
        if (typeof ToyChoiceBar !== "undefined" && ToyChoiceBar.make_toy_static) {
            ToyChoiceBar.make_toy_static(toyIcon, this.contents);
        }

        let rawBox = template.getBBox();
        let bgRect = groupScale.getElementsByTagName("rect")[0];
        let frameBox = bgRect ? bgRect.getBBox() : { width: 500, height: 600 };
        let scaleFactorW = frameBox.width / Math.max(rawBox.width, 1);
        let scaleFactorH = (0.75 * frameBox.height) / Math.max(rawBox.height, 1);
        let minScale = Math.min(scaleFactorW, scaleFactorH) * 0.75;

        let scaleGroup = toyIcon.getElementsByClassName("scale_group")[0];
        if (scaleGroup) scaleGroup.style.transform = `scale(${minScale})`;

        return toyIcon;
    }

    async run_toy_photo() {
        this.photoSession = new PhotoTrialController(
            this.FenObj,
            this.partner.is_present,
            () => {},
            "toybox"
        );
        this.photoSession.basics = this.basics;
        this.photoSession.box = this.box;
        this.photoSession.partner = this.partner;

        await this.photoSession.run_embedded_capture_loop({
            photoTargetElements: [this.toy.ToyElement].filter(Boolean),
            polaroidContentsFn: (groupScale, targetCircle) =>
                this.create_toy_polaroid_contents(groupScale, targetCircle),
            targetLabel: this.contents,
            introPrompt: "Take a photo of the " + this.contents,
            successPrompt: "The " + this.contents + " looks good!"
        });

        this.photoSession = null;
    }

    async drag_toy_back_into_box() {
        this.toy.ToyElement.style.pointerEvents = "auto";
        Interface.Prompt.show_message(
            "Please place the " + this.contents + " back in the " + this.box.boxname
        );
        AudioCont.play_sound_effect("alert_minor");

        await new Promise(resolve => {
            this.dragController = new MakeObjectDraggableObject(
                this.basics.ItemLayers.Main,
                this.basics.ItemLayers.Plus2,
                this.toy.ToyElement,
                this.box.BoxBase,
                200,
                async (DroppedToyElement) => {
                    if (this.dragController && this.dragController.destroy) {
                        this.dragController.destroy();
                    }
                    this.dragController = null;

                    let boxTarget = this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0];
                    await animate_magnetic_drop(
                        DroppedToyElement,
                        boxTarget,
                        this.basics.ItemLayers.Plus1
                    );
                    // WorldState intentionally unchanged.
                    resolve();
                }
            );
        });
    }

    async close_box_and_finish() {
        this.box.set_pointer_events_enabled(true);

        if (this.partner.is_present) {
            Interface.Prompt.show_message(this.partner.partnername + " closes the " + this.box.boxname);
            await this.partner.move_to_element_and_act(this.box.BoxBase, () => this.box.close_box());
        } else {
            await new Promise(resolve => {
                this.box.wait_for_user_click("close", () => resolve());
            });
        }
        this.returnfunc();
    }

    clean_up() {
        if (this.photoSession) {
            this.photoSession.clean_up_photo_ui();
            this.photoSession = null;
        }
        if (this.dragController && this.dragController.destroy) this.dragController.destroy();
        if (this.toy) this.toy.clean_up();
        this.box.clean_up();
        this.basics.clean_up();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
    }
}

// Warehouse multi-box sort: open boxes → recycle wrong contents → place each Fennimal's toy → close.
// FenObj is a carrier (map travel); FenObj.box_room_fennimals holds the full set.
// One box per screen: full open → recycle → place → close cycle, then fade to the next.
class BoxRoomTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        this.fennimals = (Array.isArray(FenObj.box_room_fennimals) && FenObj.box_room_fennimals.length > 0)
            ? FenObj.box_room_fennimals
            : [FenObj];

        this.validateUniqueToysAndBoxes();

        this.basics = new BasicElementsModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);

        this.boxScale = 3.2;
        this.toyScale = 3.2;
        this.tableY = 0.72 * this.basics.H;
        this.topRowY = 0.28 * this.basics.H;
        this.binProximityX = 220;
        this.placeDropDistance = 200;
        this.screenFadeMs = 600;

        // Current-screen state (reset between boxes).
        this.currentEntry = null;
        this.topRowToy = null; // { fen, module, startX, startY, fromBox }
        this.recycleToys = []; // { toyName, module, dragController }
        this.binBack = null;
        this.binFront = null;
        this.binCenter = null;
        this.binAboveLeft = null;
        this.binAboveRight = null;
        this.binStackCount = 0;
        this.activeDragController = null;
        this.TableGroup = null;
        this.Background = null;
        this.BackgroundOverlay = null;
        this.FloorStrip = null;
        this.BlackOverlay = null;
        this.presentationOrder = [];
    }

    validateUniqueToysAndBoxes() {
        let toys = {};
        let boxes = {};
        this.fennimals.forEach((fen) => {
            if (toys[fen.toy]) {
                throw new Error(
                    `box_room: duplicate toy "${fen.toy}" for Fennimals "${toys[fen.toy]}" and "${fen.id}".`
                );
            }
            if (boxes[fen.toybox]) {
                throw new Error(
                    `box_room: duplicate toybox "${fen.toybox}" for Fennimals "${boxes[fen.toybox]}" and "${fen.id}".`
                );
            }
            toys[fen.toy] = fen.id;
            boxes[fen.toybox] = fen.id;
        });
    }

    async start_sequence() {
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }

        if (Interface.Locator && Interface.Locator.change_locator_name) {
            Interface.Locator.change_locator_name("Warehouse");
        }

        this.presentationOrder = shuffleArray([...this.fennimals]);
        this.FenObj.box_room_order = this.presentationOrder.map((fen) => fen.id);

        await this.setup_warehouse_background();
        this.draw_table();
        this.create_black_overlay();

        for (let i = 0; i < this.presentationOrder.length; i++) {
            let fen = this.presentationOrder[i];
            let isFirst = i === 0;

            if (!isFirst) {
                await this.fade_black(1);
                this.clear_current_box_scene();
            }

            await this.setup_one_box_screen(fen, { instant: !isFirst });

            if (!isFirst) {
                await this.fade_black(0);
            } else {
                await wait(500);
            }

            await this.run_one_box_cycle();
        }

        this.returnfunc();
    }

    create_black_overlay() {
        this.BlackOverlay = create_SVG_rect(0, 0, this.basics.W, this.basics.H);
        this.BlackOverlay.setAttribute("fill", "black");
        this.BlackOverlay.style.opacity = 0;
        this.BlackOverlay.style.pointerEvents = "none";
        this.BlackOverlay.style.transition = `opacity ${this.screenFadeMs}ms ease-in-out`;
        // Questions is the topmost item layer — covers partner during transitions.
        this.basics.ItemLayers.Questions.appendChild(this.BlackOverlay);
    }

    async fade_black(toOpacity) {
        if (!this.BlackOverlay) return;
        this.BlackOverlay.style.pointerEvents = toOpacity > 0 ? "auto" : "none";
        this.BlackOverlay.style.transition = `opacity ${this.screenFadeMs}ms ease-in-out`;
        window.getComputedStyle(this.BlackOverlay).opacity;
        this.BlackOverlay.style.opacity = toOpacity;
        await wait(this.screenFadeMs);
        if (toOpacity === 0) {
            this.BlackOverlay.style.pointerEvents = "none";
        }
    }

    clear_current_box_scene() {
        if (this.activeDragController && this.activeDragController.destroy) {
            this.activeDragController.destroy();
            this.activeDragController = null;
        }
        this.recycleToys.forEach((rec) => {
            if (rec.dragController && rec.dragController.destroy) rec.dragController.destroy();
            if (rec.module) rec.module.clean_up();
        });
        this.recycleToys = [];
        if (this.topRowToy && this.topRowToy.module) {
            this.topRowToy.module.clean_up();
        }
        this.topRowToy = null;
        if (this.currentEntry) {
            if (this.currentEntry.placedToyModule) this.currentEntry.placedToyModule.clean_up();
            if (this.currentEntry.contentsToyModule) this.currentEntry.contentsToyModule.clean_up();
            if (this.currentEntry.box) this.currentEntry.box.clean_up();
        }
        this.currentEntry = null;
        this.remove_toy_bin();
        this.binStackCount = 0;
    }

    remove_toy_bin() {
        if (this.binBack) this.binBack.remove();
        if (this.binFront) this.binFront.remove();
        this.binBack = null;
        this.binFront = null;
        this.binCenter = null;
        this.binAboveLeft = null;
        this.binAboveRight = null;
    }

    boxNeedsRecycling(fen) {
        let contents = WorldState.get_toybox_contents(fen.toybox);
        return !!(contents && contents !== fen.toy);
    }

    async setup_one_box_screen(fen, { instant = false } = {}) {
        let appearMs = instant ? 0 : 180;
        let toyAppearMs = instant ? 0 : 150;
        let needsBin = this.boxNeedsRecycling(fen);

        if (needsBin) {
            this.create_toy_bin();
        }

        let boxY = this.tableY - 8;
        let boxX = 0.5 * this.basics.W;
        if (this.binCenter) {
            boxX = Math.max(boxX, this.binCenter.x + 280);
            boxX = Math.min(boxX, 0.72 * this.basics.W);
        }

        let box = new BoxModule(fen);
        await box.create_and_appear_box(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            boxX,
            boxY,
            this.boxScale,
            appearMs
        );
        box.set_pointer_events_enabled(false);

        let contents = WorldState.get_toybox_contents(fen.toybox);
        this.currentEntry = {
            fen,
            box,
            boxX,
            boxY,
            contents,
            contentsIsCorrect: !!(contents && contents === fen.toy),
            contentsIsWrong: !!(contents && contents !== fen.toy),
            contentsToyModule: null,
            placedToyModule: null
        };

        // Free toy above the box (skip if the correct toy is already inside — revealed on open).
        if (!this.currentEntry.contentsIsCorrect) {
            let toyMod = new StandardToyModule(fen);
            await toyMod.create_and_appear_toy(
                this.basics.ItemLayers.Plus1,
                "box_room_top_" + fen.id,
                boxX,
                this.topRowY,
                this.toyScale,
                toyAppearMs
            );
            toyMod.ToyElement.style.pointerEvents = "none";
            this.topRowToy = {
                fen,
                module: toyMod,
                startX: boxX,
                startY: this.topRowY,
                fromBox: false
            };
        }
    }

    async run_one_box_cycle() {
        let entry = this.currentEntry;
        if (!entry) return;

        await this.open_one_box(entry);
        await this.recycle_wrong_contents_if_needed();
        await this.place_one_toy(entry);
        await this.close_one_box(entry);
        await this.run_placement_quiz(entry);
    }

    /**
     * Attention check after close: which toy was just placed?
     * Options = all toys in this box_room set; reshuffled each attempt.
     * Wrong → hide bar, reopen (solo click / partner), lift toy briefly, close, retry.
     */
    async run_placement_quiz(entry) {
        let options = this.fennimals.map((fen) => fen.toy).filter(Boolean);
        if (entry.fen.toy && !options.includes(entry.fen.toy)) {
            options.push(entry.fen.toy);
        }
        if (options.length === 0) {
            console.warn("box_room: no toys for placement quiz; skipping.");
            Interface.Prompt.show_message(
                "The " + entry.fen.toy + " is now safely in the " + entry.box.boxname + "!"
            );
            await wait(1600);
            Interface.Prompt.hide();
            return;
        }

        entry.fen.error_toys = [];

        let bar = new ToyChoiceBar(
            this.basics.ItemLayers.Questions,
            this.basics.W,
            this.basics.H
        );

        while (true) {
            Interface.Prompt.show_message("Which toy did you just place in this box?");
            let selected = await bar.waitForSelection(shuffleArray([...options]));

            if (selected === entry.fen.toy) {
                AudioCont.play_sound_effect("positive");
                await bar.hide();
                let burstCenter = getSVGInternalCenter(entry.box.BoxBase);
                await spawn_confetti_burst(
                    this.basics.ItemLayers.Plus2,
                    burstCenter.x,
                    burstCenter.y,
                    { awaitPopMs: 900 }
                );
                Interface.Prompt.show_message(
                    "The " + entry.fen.toy + " is now safely in the " + entry.box.boxname + "!"
                );
                await wait(1600);
                Interface.Prompt.hide();
                return;
            }

            AudioCont.play_sound_effect("rejected");
            entry.fen.error_toys.push(selected);
            await bar.hide();
            await this.reveal_placed_toy(entry);
        }
    }

    /** Wrong-answer remediation: open → fade toy in → lift → present 1s → lower → hide → close. */
    async reveal_placed_toy(entry) {
        let toyMod = entry.placedToyModule;
        if (!toyMod || !toyMod.ToyElement) {
            console.warn("box_room: missing placed toy for reveal; reopening without lift.");
            await this.open_one_box(entry);
            await wait(1000);
            await this.close_one_box(entry);
            return;
        }

        await this.open_one_box(entry);
        await this.set_placed_toy_opacity(entry, 1, 0);

        let boxTarget = getSVGInternalCenter(
            entry.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]
        );
        let presentY = Math.min(this.topRowY + 40, boxTarget.y - 160);

        toyMod.ToyElement.style.pointerEvents = "none";
        await this.animateToyToPoint(toyMod.ToyElement, entry.boxX, presentY, 450);
        await wait(1000);
        await this.animateToyToPoint(toyMod.ToyElement, boxTarget.x, boxTarget.y, 450);

        await this.close_one_box(entry);
    }

    async setup_warehouse_background() {
        let whiteMask = create_SVG_rect(0, 0, this.basics.W, this.basics.H);
        whiteMask.setAttribute("fill", "white");
        whiteMask.style.opacity = 0;
        this.basics.ItemLayers.Neg1.appendChild(whiteMask);

        this.Background = document.createElementNS("http://www.w3.org/2000/svg", "image");
        this.Background.setAttribute("href", "./Locations/Home_lostfound.png");
        this.Background.setAttribute("width", "100%");
        this.Background.setAttribute("height", "100%");
        this.Background.setAttribute("preserveAspectRatio", "none");
        this.Background.style.opacity = 0;
        this.Background.style.transition = "opacity 500ms ease-in-out";
        this.basics.ItemLayers.Neg1.appendChild(this.Background);

        // Dark floor strip under the overlay (image has no floor of its own).
        let floorH = 0.1 * this.basics.H;
        this.FloorStrip = create_SVG_rect(0, this.basics.H - floorH, this.basics.W, floorH);
        this.FloorStrip.setAttribute("fill", "#3E2723");
        this.FloorStrip.style.opacity = 0;
        this.FloorStrip.style.pointerEvents = "none";
        this.FloorStrip.style.transition = "opacity 500ms ease-in-out";
        this.basics.ItemLayers.Neg1.appendChild(this.FloorStrip);

        // Soften the photo + floor so table / toys / bin read clearly on top.
        this.BackgroundOverlay = create_SVG_rect(0, 0, this.basics.W, this.basics.H);
        this.BackgroundOverlay.setAttribute("fill", "white");
        this.BackgroundOverlay.style.opacity = 0;
        this.BackgroundOverlay.style.pointerEvents = "none";
        this.BackgroundOverlay.style.transition = "opacity 500ms ease-in-out";
        this.basics.ItemLayers.Neg1.appendChild(this.BackgroundOverlay);

        window.getComputedStyle(this.Background).opacity;
        whiteMask.style.transition = "opacity 500ms ease-in-out";
        whiteMask.style.opacity = 1;
        this.Background.style.opacity = 1;
        this.FloorStrip.style.opacity = 1;
        this.BackgroundOverlay.style.opacity = 0.5;
        await wait(550);
    }

    draw_table() {
        this.TableGroup = create_SVG_group(0, 0);
        this.basics.ItemLayers.Neg1.appendChild(this.TableGroup);

        let table_w = 0.82 * this.basics.W;
        let table_h = 70;
        let table_x = (this.basics.W - table_w) / 2;
        let table_y = this.tableY;

        const leg_width = 30;
        const leg_height = 220;
        const leg_positions = [
            table_x + 0.05 * table_w,
            table_x + 0.95 * table_w - leg_width,
            table_x + 0.25 * table_w,
            table_x + 0.75 * table_w - leg_width
        ];

        leg_positions.forEach((lx) => {
            let leg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            leg.setAttribute("x", lx);
            leg.setAttribute("y", table_y + 30);
            leg.setAttribute("width", leg_width);
            leg.setAttribute("height", leg_height);
            leg.setAttribute("fill", "#4E342E");
            this.TableGroup.appendChild(leg);
        });

        let top = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        top.setAttribute("x", table_x);
        top.setAttribute("y", table_y);
        top.setAttribute("width", table_w);
        top.setAttribute("height", table_h);
        top.setAttribute("rx", 15);
        top.setAttribute("fill", "#795548");
        this.TableGroup.appendChild(top);

        let lip = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        lip.setAttribute("x", table_x);
        lip.setAttribute("y", table_y + table_h - 10);
        lip.setAttribute("width", table_w);
        lip.setAttribute("height", 10);
        lip.setAttribute("fill", "#3E2723");
        this.TableGroup.appendChild(lip);
    }

    create_toy_bin() {
        let template = document.getElementById("toy_bin");
        if (!template) {
            console.error("box_room: #toy_bin not found in SVG assets");
            return;
        }

        let binX = 0.1 * this.basics.W;
        let binY = this.tableY + 50;
        let scale = this.boxScale;

        // Back mesh on Main (under fallen toys); front mesh on Plus1 (over fallen toys).
        this.binBack = copy_scale_and_move_object_to_position(
            template,
            this.basics.ItemLayers.Main,
            binX,
            binY,
            scale,
            "box_room_toy_bin_back"
        );
        let frontOnBack = this.binBack.querySelector(".toy_bin_front");
        if (frontOnBack) frontOnBack.remove();
        this.binBack.style.pointerEvents = "none";

        this.binFront = copy_scale_and_move_object_to_position(
            template,
            this.basics.ItemLayers.Plus1,
            binX,
            binY,
            scale,
            "box_room_toy_bin_front"
        );
        let backOnFront = this.binFront.querySelector(".toy_bin_back");
        if (backOnFront) backOnFront.remove();
        this.binFront.style.pointerEvents = "none";

        this.binCenter = getSVGInternalCenter(this.binBack);
        this.binAboveLeft = { x: this.binCenter.x - 45, y: this.binCenter.y - 200 };
        this.binAboveRight = { x: this.binCenter.x + 45, y: this.binCenter.y - 200 };
    }

    async animateToyToPoint(toyElement, targetX, targetY, ms = 450) {
        let current = getSVGInternalCenter(toyElement);
        let dx = targetX - current.x;
        let dy = targetY - current.y;
        toyElement.style.transition = `transform ${ms}ms ease-in-out`;
        toyElement.style.transform += ` translate(${dx}px, ${dy}px)`;
        await wait(ms);
    }

    clearBoxWorldState(toybox) {
        WorldState.clear_toybox_contents(toybox);
        if (this.partner.is_present) {
            WorldState.change_partner_belief_in_box_contents(toybox, false);
        }
    }

    async open_one_box(entry) {
        Interface.Prompt.show_message(
            this.partner.is_present
                ? (this.partner.partnername + " will open the " + entry.box.boxname)
                : ("Open the " + entry.box.boxname)
        );
        await wait(700);

        entry.box.set_pointer_events_enabled(true);

        if (entry.contentsIsWrong) {
            entry.contentsToyModule = new StandardToyModule({ toy: entry.contents });
            let boxTarget = getSVGInternalCenter(
                entry.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]
            );
            await entry.contentsToyModule.create_and_appear_toy(
                this.basics.ItemLayers.Plus1,
                "box_room_old_" + entry.fen.id,
                boxTarget.x,
                boxTarget.y,
                this.boxScale,
                0
            );
        } else if (entry.contentsIsCorrect) {
            // Safety path: correct toy is already inside — reveal under lid, then move to top row.
            entry.contentsToyModule = new StandardToyModule(entry.fen);
            let boxTarget = getSVGInternalCenter(
                entry.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]
            );
            await entry.contentsToyModule.create_and_appear_toy(
                this.basics.ItemLayers.Plus1,
                "box_room_correct_from_box_" + entry.fen.id,
                boxTarget.x,
                boxTarget.y,
                this.boxScale,
                0
            );
        }

        if (this.partner.is_present) {
            Interface.Prompt.show_message(
                this.partner.partnername + " opens the " + entry.box.boxname
            );
            await this.partner.move_to_element_and_act(entry.box.BoxBase, () => entry.box.open_box());
            await wait(350);
        } else {
            await new Promise((resolve) => {
                entry.box.wait_for_user_click("open", () => resolve());
            });
            await wait(250);
        }

        entry.box.set_pointer_events_enabled(false);

        if (entry.contentsIsCorrect && entry.contentsToyModule) {
            await this.animateToyToPoint(
                entry.contentsToyModule.ToyElement,
                entry.boxX,
                this.topRowY,
                500
            );
            entry.contentsToyModule.ToyElement.style.pointerEvents = "none";
            this.topRowToy = {
                fen: entry.fen,
                module: entry.contentsToyModule,
                startX: entry.boxX,
                startY: this.topRowY,
                fromBox: true
            };
            entry.contentsToyModule = null;
            this.clearBoxWorldState(entry.fen.toybox);
            entry.contents = false;
            entry.contentsIsCorrect = false;
        } else if (entry.contentsIsWrong && entry.contentsToyModule) {
            this.recycleToys.push({
                toyName: entry.contents,
                module: entry.contentsToyModule,
                dragController: null,
                fen: entry.fen
            });
            entry.contentsToyModule = null;
            this.clearBoxWorldState(entry.fen.toybox);
            entry.contents = false;
            entry.contentsIsWrong = false;
        }
    }

    async recycle_wrong_contents_if_needed() {
        if (this.recycleToys.length === 0) return;

        if (!this.binCenter) {
            this.create_toy_bin();
        }

        Interface.Prompt.show_message("Drag the old toy into the toy bin");
        AudioCont.play_sound_effect("alert_minor");

        await new Promise((resolve) => {
            let remaining = this.recycleToys.length;

            const onOneRecycled = () => {
                remaining--;
                if (remaining <= 0) {
                    Interface.Prompt.hide();
                    resolve();
                } else {
                    Interface.Prompt.show_message("Drag the old toy into the toy bin");
                }
            };

            this.recycleToys.forEach((rec) => {
                rec.module.ToyElement.style.pointerEvents = "auto";
                rec.dragController = new MakeObjectDraggableObject(
                    this.basics.ItemLayers.Main,
                    this.basics.ItemLayers.Plus2,
                    rec.module.ToyElement,
                    this.binBack || this.binFront,
                    this.binProximityX,
                    async (DraggedToyElement) => {
                        if (rec.dragController && rec.dragController.destroy) {
                            rec.dragController.destroy();
                        }
                        rec.dragController = null;
                        DraggedToyElement.style.pointerEvents = "none";
                        DraggedToyElement.style.cursor = "auto";
                        await this.animateToyIntoBin(DraggedToyElement);
                        onOneRecycled();
                    },
                    {
                        validateDrop: () => {
                            if (!this.binCenter) return false;
                            let toyCenter = getSVGInternalCenter(rec.module.ToyElement);
                            return Math.abs(toyCenter.x - this.binCenter.x) <= this.binProximityX;
                        },
                        onMiss: () => {
                            Interface.Prompt.show_message("Drop the toy near the toy bin");
                            if (rec.dragController && rec.dragController.enable) {
                                rec.dragController.enable();
                            }
                        }
                    }
                );
            });
        });
    }

    async animateToyIntoBin(toyElement) {
        let stackIndex = this.binStackCount;
        this.binStackCount++;

        let above = (stackIndex % 2 === 0) ? this.binAboveLeft : this.binAboveRight;
        let finalX = this.binCenter.x + ((stackIndex % 2 === 0) ? -35 : 35);
        let finalY = this.binCenter.y + 55 - stackIndex * 22;

        // Between bin back (Main) and bin front (Plus1) so the mesh occludes the fall.
        this.basics.ItemLayers.Main.appendChild(toyElement);
        await this.animateToyToPoint(toyElement, above.x, above.y, 280);
        toyElement.style.transition = "transform 400ms ease-in";
        let cur = getSVGInternalCenter(toyElement);
        toyElement.style.transform += ` translate(${finalX - cur.x}px, ${finalY - cur.y}px)`;
        await wait(420);
    }

    // Same pattern as BoxModule.wait_for_user_click: Base + Top so the full box pulses.
    highlightBox(box) {
        if (!box || !box.BoxBase || !box.BoxTop) return null;
        let outline = create_SVG_outline_of_multiple_groups(box.BoxBase, box.BoxTop);
        box.BoxBase.parentNode.insertBefore(outline, box.BoxBase);
        outline.classList.add("focus_on_SVG_outline");
        outline.style.pointerEvents = "none";
        return outline;
    }

    async place_one_toy(entry) {
        let topToy = this.topRowToy;
        if (!topToy) {
            console.error("box_room: missing top-row toy for Fennimal " + entry.fen.id);
            return;
        }

        let toyName = entry.fen.toy;
        let boxName = entry.box.boxname;

        Interface.Prompt.show_message(
            "Please place the " + toyName + " into the " + boxName + "."
        );
        AudioCont.play_sound_effect("alert_minor");

        // Toy outline comes from MakeObjectDraggableObject (hides while dragging, like toy_to_box).
        // Box uses Base+Top outline so the full open box highlights, not just the back.
        let boxOutline = this.highlightBox(entry.box);
        entry.box.set_pointer_events_enabled(false);
        topToy.module.ToyElement.style.pointerEvents = "auto";

        // Refresh home position after any prior transforms so miss-snap returns here.
        let home = getSVGInternalCenter(topToy.module.ToyElement);
        topToy.startX = home.x;
        topToy.startY = home.y;

        await new Promise((resolve) => {
            this.activeDragController = new MakeObjectDraggableObject(
                this.basics.ItemLayers.Main,
                this.basics.ItemLayers.Plus2,
                topToy.module.ToyElement,
                entry.box.BoxBase,
                this.placeDropDistance,
                async (DroppedToyElement) => {
                    if (this.activeDragController && this.activeDragController.destroy) {
                        this.activeDragController.destroy();
                    }
                    this.activeDragController = null;
                    if (boxOutline) boxOutline.remove();

                    let boxTarget = entry.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0];
                    await animate_magnetic_drop(
                        DroppedToyElement,
                        boxTarget,
                        this.basics.ItemLayers.Plus1
                    );

                    WorldState.change_toybox_contents(entry.fen.toybox, entry.fen.toy);
                    if (this.partner.is_present) {
                        WorldState.change_partner_belief_in_box_contents(entry.fen.toybox, entry.fen.toy);
                    }

                    DroppedToyElement.style.pointerEvents = "none";
                    entry.placedToyModule = topToy.module;
                    this.topRowToy = null;
                    resolve();
                },
                {
                    validateDrop: (dist) => dist < this.placeDropDistance,
                    onStart: () => {
                        if (boxOutline) boxOutline.classList.remove("focus_on_SVG_outline");
                    },
                    onMiss: () => {
                        Interface.Prompt.show_message(
                            "Please place the " + toyName + " into the " + boxName + "."
                        );
                        if (boxOutline) boxOutline.classList.add("focus_on_SVG_outline");
                        if (this.activeDragController && this.activeDragController.enable) {
                            this.activeDragController.enable();
                        }
                    }
                }
            );
        });
    }

    async set_placed_toy_opacity(entry, opacity, ms = 250) {
        let el = entry && entry.placedToyModule && entry.placedToyModule.ToyElement;
        if (!el) return;
        el.style.transition = `opacity ${ms}ms ease-in-out`;
        window.getComputedStyle(el).opacity;
        el.style.opacity = opacity;
        await wait(ms);
    }

    async close_one_box(entry) {
        Interface.Prompt.show_message(
            this.partner.is_present
                ? (this.partner.partnername + " will close the " + entry.box.boxname)
                : ("Close the " + entry.box.boxname)
        );
        await wait(600);

        entry.box.set_pointer_events_enabled(true);
        if (this.partner.is_present) {
            Interface.Prompt.show_message(
                this.partner.partnername + " closes the " + entry.box.boxname
            );
            await this.partner.move_to_element_and_act(
                entry.box.BoxBase,
                () => entry.box.close_box()
            );
            await wait(250);
        } else {
            await new Promise((resolve) => {
                entry.box.wait_for_user_click("close", () => resolve());
            });
            await wait(150);
        }
        entry.box.set_pointer_events_enabled(false);
        // Hide after shut so protruding parts cannot leak the quiz answer.
        await this.set_placed_toy_opacity(entry, 0, 0);
    }

    clean_up() {
        this.clear_current_box_scene();
        if (this.BlackOverlay) this.BlackOverlay.remove();
        this.BlackOverlay = null;
        if (this.TableGroup) this.TableGroup.remove();
        if (this.Background) this.Background.remove();
        if (this.BackgroundOverlay) this.BackgroundOverlay.remove();
        if (this.FloorStrip) this.FloorStrip.remove();
        this.basics.clean_up();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
    }
}

// Closed toybox inventory scan: place box in scanner → start → laser pass → return to table.
class ScanBoxHomeTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);
        this.params = GenParam.ScanBoxHome;

        this.TableGroup = null;
        this.Background = null;
        this.BackgroundOverlay = null;
        this.FloorStrip = null;

        this.Scanner = null;
        this.ShieldHost = null;
        this.safetyShield = null;
        this.safetyShieldDown = null;
        this.scannerBoxTarget = null;
        this.startButton = null;
        this.startButtonOutline = null;
        this.laserNozzle = null;
        this.laserOutput = null;
        this.laserBeamGroup = null;
        this._laserBeamRaf = null;

        this.BoxCarrier = null;
        this.boxHomeTarget = null;
        this.dragController = null;

        this.crankHandle = null;
        this.crankPivot = null;
        this.powerRelease = null;
        this.powerNeedle = null;
        this.powerNeedlePivot = null;
        this.powerIndicator = null;
        this.indicatorAreas = null;
        this.releaseOutline = null;
        this.crankOutline = null;

        this.powerAngle = 0;
        this.crankVisualAngle = 0;
        this._crankVisualTarget = 0;
        this._crankAnimRaf = null;
        this._powerScanActive = false;
        this._venting = false;
        this._scanProgress = 0;
        this._wasPowerOk = true;
        this._powerRaf = null;
        this._partnerSpikeTimeout = null;
        this._crankPointer = null;
        this._scanningSfxOn = false;
        this._startHitProxy = null;
    }

    async start_sequence() {
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }

        if (Interface.Locator && Interface.Locator.change_locator_name) {
            Interface.Locator.change_locator_name("Warehouse");
        }
        if (Interface.Prompt && Interface.Prompt.change_colors_based_on_region) {
            Interface.Prompt.change_colors_based_on_region("Home");
        }
        if (Interface.Locator && Interface.Locator.change_region_colors) {
            Interface.Locator.change_region_colors("Home");
        }

        await this.setup_warehouse_background();
        this.draw_tables();
        await this.spawn_scanner();
        await this.spawn_closed_box();

        Interface.Prompt.show_message(
            "For inventory reasons, we need to scan the " + this.box.boxname
        );
        AudioCont.play_sound_effect("alert_minor");
        await wait(this.params.introPromptMs);

        await this.phase_place_box_in_scanner();
        await this.phase_press_start_and_scan();
        await this.phase_return_box_to_table();

        Interface.Prompt.show_message(
            "Well done, the " + this.box.boxname + " has now been scanned and tracked!"
        );
        AudioCont.play_sound_effect("positive");
        await wait(this.params.outroPromptMs);
        await this.fade_out_scene();
        Interface.Prompt.hide();

        this.returnfunc();
    }

    async setup_warehouse_background() {
        let whiteMask = create_SVG_rect(0, 0, this.basics.W, this.basics.H);
        whiteMask.setAttribute("fill", "white");
        whiteMask.style.opacity = 0;
        this.basics.ItemLayers.Neg1.appendChild(whiteMask);

        this.Background = document.createElementNS("http://www.w3.org/2000/svg", "image");
        this.Background.setAttribute("href", "./Locations/Home_lostfound.png");
        this.Background.setAttribute("width", "100%");
        this.Background.setAttribute("height", "100%");
        this.Background.setAttribute("preserveAspectRatio", "none");
        this.Background.style.opacity = 0;
        this.Background.style.transition = "opacity 500ms ease-in-out";
        this.basics.ItemLayers.Neg1.appendChild(this.Background);

        let floorH = 0.1 * this.basics.H;
        this.FloorStrip = create_SVG_rect(0, this.basics.H - floorH, this.basics.W, floorH);
        this.FloorStrip.setAttribute("fill", "#3E2723");
        this.FloorStrip.style.opacity = 0;
        this.FloorStrip.style.pointerEvents = "none";
        this.FloorStrip.style.transition = "opacity 500ms ease-in-out";
        this.basics.ItemLayers.Neg1.appendChild(this.FloorStrip);

        this.BackgroundOverlay = create_SVG_rect(0, 0, this.basics.W, this.basics.H);
        this.BackgroundOverlay.setAttribute("fill", "white");
        this.BackgroundOverlay.style.opacity = 0;
        this.BackgroundOverlay.style.pointerEvents = "none";
        this.BackgroundOverlay.style.transition = "opacity 500ms ease-in-out";
        this.basics.ItemLayers.Neg1.appendChild(this.BackgroundOverlay);

        window.getComputedStyle(this.Background).opacity;
        whiteMask.style.transition = "opacity 500ms ease-in-out";
        whiteMask.style.opacity = 1;
        this.Background.style.opacity = 1;
        this.FloorStrip.style.opacity = 1;
        this.BackgroundOverlay.style.opacity = 0.5;
        await wait(550);
    }

    draw_tables() {
        this.TableGroup = create_SVG_group(0, 0);
        this.basics.ItemLayers.Neg1.appendChild(this.TableGroup);

        let tableY = this.params.tableY * this.basics.H;
        let tableW = this.params.tableWidth * this.basics.W;
        this.draw_one_table(this.params.boxX * this.basics.W, tableY, tableW);
        this.draw_one_table(this.params.scannerX * this.basics.W, tableY, tableW);
    }

    draw_one_table(centerX, tableY, tableW) {
        let table_h = 70;
        let table_x = centerX - tableW / 2;

        const leg_width = 24;
        const leg_height = 200;
        const leg_positions = [
            table_x + 0.08 * tableW,
            table_x + 0.92 * tableW - leg_width
        ];

        leg_positions.forEach((lx) => {
            let leg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            leg.setAttribute("x", lx);
            leg.setAttribute("y", tableY + 30);
            leg.setAttribute("width", leg_width);
            leg.setAttribute("height", leg_height);
            leg.setAttribute("fill", "#4E342E");
            this.TableGroup.appendChild(leg);
        });

        let top = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        top.setAttribute("x", table_x);
        top.setAttribute("y", tableY);
        top.setAttribute("width", tableW);
        top.setAttribute("height", table_h);
        top.setAttribute("rx", 15);
        top.setAttribute("fill", "#795548");
        this.TableGroup.appendChild(top);

        let lip = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        lip.setAttribute("x", table_x);
        lip.setAttribute("y", tableY + table_h - 10);
        lip.setAttribute("width", tableW);
        lip.setAttribute("height", 10);
        lip.setAttribute("fill", "#3E2723");
        this.TableGroup.appendChild(lip);
    }

    async spawn_scanner() {
        let template = document.getElementById("box_scanner");
        if (!template) {
            console.error("scan_box_home: #box_scanner not found");
            return;
        }

        let sx = this.params.scannerX * this.basics.W;
        let sy = this.params.tableY * this.basics.H - this.params.scannerLift;
        let scale = this.params.scannerScale;

        // Body behind the box (Main). Shield host in front of the box (Plus2).
        this.Scanner = copy_scale_and_move_object_to_position(
            template,
            this.basics.ItemLayers.Main,
            sx,
            sy,
            scale,
            "scan_box_home_scanner"
        );
        let bodyShield = this.Scanner.querySelector(".safety_shield");
        if (bodyShield) bodyShield.remove();

        this.ShieldHost = copy_scale_and_move_object_to_position(
            template,
            this.basics.ItemLayers.Plus2,
            sx,
            sy,
            scale,
            "scan_box_home_shield"
        );
        this.strip_shield_host_to_safety_shield_only();

        this.scannerBoxTarget = this.Scanner.querySelector(".scanner_box_target");
        this.startButton = this.Scanner.querySelector(".start_button");
        this.laserNozzle = this.Scanner.querySelector(".scanner_laser_nozzle");
        this.laserOutput = this.Scanner.querySelector(".scanner_laser_nozzle_output");
        this.crankHandle = this.Scanner.querySelector(".crank_handle");
        this.crankPivot = this.Scanner.querySelector(".crank_handle_pivot_point");
        this.powerRelease = this.Scanner.querySelector(".power_release_button");
        // Meter lives on the shield layer (above the box).
        this.powerIndicator = this.ShieldHost.querySelector(".power_level_indicator");
        this.powerNeedle = this.ShieldHost.querySelector(".power_needle");
        this.powerNeedlePivot = this.ShieldHost.querySelector(".power_needle_pivot_point");
        this.cache_indicator_areas();
        this.safetyShield = this.ShieldHost.querySelector(".safety_shield");
        this.safetyShieldDown = this.ShieldHost.querySelector(".safety_shield_down");

        this.prepare_safety_shield();
        this.prepare_power_controls_idle();
        this.set_scanner_status("load_box");
        this.set_start_button_state("off");
        this.set_laser_output_active(false);
        this.set_power_needle_angle(0);
        this.set_crank_visual_angle(0);

        this.Scanner.style.opacity = 0;
        this.ShieldHost.style.opacity = 0;
        window.getComputedStyle(this.Scanner).opacity;
        this.Scanner.style.transition = "opacity 200ms ease-in-out";
        this.ShieldHost.style.transition = "opacity 200ms ease-in-out";
        this.Scanner.style.opacity = 1;
        this.ShieldHost.style.opacity = 1;
        await wait(220);
    }

    strip_shield_host_to_safety_shield_only() {
        let item = this.ShieldHost.querySelector(".item_boxscanner") || this.ShieldHost.querySelector(".item");
        if (!item) return;
        Array.from(item.children).forEach((child) => {
            if (!child.classList.contains("safety_shield")) child.remove();
        });
        // Parent pointer-events:none does NOT block SVG descendants from receiving hits.
        this.ShieldHost.style.pointerEvents = "none";
        this.ShieldHost.querySelectorAll("*").forEach((el) => {
            el.style.pointerEvents = "none";
        });
    }

    prepare_safety_shield() {
        if (!this.safetyShield) return;
        this.safetyShield.removeAttribute("display");
        this.safetyShield.style.display = "inline";
        this.safetyShield.style.pointerEvents = "none";

        if (this.safetyShieldDown) {
            this.safetyShieldDown.style.opacity = "0";
            this.safetyShieldDown.style.display = "none";
            this.safetyShieldDown.style.pointerEvents = "none";
        }

        this.set_power_indicator_visible(false);
    }

    set_power_indicator_visible(visible) {
        if (!this.powerIndicator) return;
        let op = this.params.powerIndicatorOpacity != null
            ? this.params.powerIndicatorOpacity
            : 0.8;
        this.powerIndicator.style.opacity = visible ? String(op) : "0";
        this.powerIndicator.style.display = visible ? "inline" : "none";
        this.powerIndicator.style.pointerEvents = "none";
        if (visible) this.update_indicator_area_highlights(this.get_power_band());
    }

    cache_indicator_areas() {
        if (!this.powerIndicator) {
            this.indicatorAreas = null;
            return;
        }
        let low = this.powerIndicator.querySelector(".indicator_area_too_low");
        let good = this.powerIndicator.querySelector(".indicator_area_good");
        let high = this.powerIndicator.querySelector(".indicator_area_too_high");
        this.indicatorAreas = {
            low: low ? {
                el: low,
                activeFill: low.getAttribute("fill") || "#d4aa00"
            } : null,
            green: good ? {
                el: good,
                activeFill: good.getAttribute("fill") || "#217821"
            } : null,
            high: high ? {
                el: high,
                activeFill: high.getAttribute("fill") || "#a02c2c"
            } : null
        };
    }

    update_indicator_area_highlights(band) {
        if (!this.indicatorAreas) return;
        let inactive = this.params.indicatorInactiveFill || "#d0d0d0";
        ["low", "green", "high"].forEach((key) => {
            let entry = this.indicatorAreas[key];
            if (!entry || !entry.el) return;
            let fill = (key === band) ? entry.activeFill : inactive;
            entry.el.setAttribute("fill", fill);
            entry.el.style.fill = fill;
            entry.el.setAttribute("opacity", "1");
            entry.el.style.opacity = "1";
        });
    }

    async spawn_closed_box() {
        let bx = this.params.boxX * this.basics.W;
        let by = this.params.tableY * this.basics.H - 10;

        this.BoxCarrier = create_SVG_group(0, 0);
        this.BoxCarrier.id = "scan_box_home_box_carrier";
        this.basics.ItemLayers.Plus1.appendChild(this.BoxCarrier);

        // Both base + lid in the same carrier so the closed box moves as one unit.
        await this.box.create_and_appear_box(
            this.BoxCarrier,
            this.BoxCarrier,
            bx,
            by,
            this.params.boxScale,
            200
        );
        this.box.set_pointer_events_enabled(false);

        // Invisible home target for magnetic return to the left table.
        this.boxHomeTarget = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        this.boxHomeTarget.setAttribute("cx", bx);
        this.boxHomeTarget.setAttribute("cy", by);
        this.boxHomeTarget.setAttribute("r", 4);
        this.boxHomeTarget.classList.add("invisible_element");
        this.basics.ItemLayers.Neg1.appendChild(this.boxHomeTarget);
    }

    set_scanner_status(status) {
        if (!this.Scanner) return;
        let map = {
            load_box: ".scanner_text_load_box",
            scanning: ".scanner_text_scanning",
            done: ".scanner_text_done",
            error_low: ".scanner_error_low",
            error_high: ".scanner_error_high"
        };
        this.Scanner.querySelectorAll(".scanner_text").forEach((el) => {
            el.style.display = "none";
        });
        if (this.ShieldHost) {
            this.ShieldHost.querySelectorAll(".scanner_text").forEach((el) => {
                el.style.display = "none";
            });
        }
        let sel = map[status];
        let el = sel ? this.Scanner.querySelector(sel) : null;
        if (el) el.style.display = "";
    }

    prepare_power_controls_idle() {
        if (this.crankHandle) {
            this.crankHandle.style.pointerEvents = "none";
            this.crankHandle.style.cursor = "auto";
            this.crankHandle.style.opacity = "0.85";
        }
        if (this.powerRelease) {
            this.powerRelease.style.pointerEvents = "none";
            this.powerRelease.style.cursor = "auto";
            this.powerRelease.style.opacity = "0.85";
        }
        this.clear_control_outlines();
    }

    clear_control_outlines() {
        if (this.releaseOutline) {
            this.releaseOutline.remove();
            this.releaseOutline = null;
        }
        if (this.crankOutline) {
            this.crankOutline.remove();
            this.crankOutline = null;
        }
    }

    set_power_needle_angle(deg) {
        this.powerAngle = deg;
        if (!this.powerNeedle || !this.powerNeedlePivot) return;
        let cx = parseFloat(this.powerNeedlePivot.getAttribute("cx"));
        let cy = parseFloat(this.powerNeedlePivot.getAttribute("cy"));
        this.powerNeedle.setAttribute("transform", `rotate(${deg} ${cx} ${cy})`);
    }

    set_crank_visual_angle(deg) {
        this.crankVisualAngle = deg;
        if (!this.crankHandle || !this.crankPivot) return;
        let cx = parseFloat(this.crankPivot.getAttribute("cx"));
        let cy = parseFloat(this.crankPivot.getAttribute("cy"));
        let t = `rotate(${deg} ${cx} ${cy})`;
        this.crankHandle.setAttribute("transform", t);
        if (this.crankOutline) this.crankOutline.setAttribute("transform", t);
    }

    /** Queue a smooth crank spin (overlapping spikes extend the target angle). */
    queue_crank_spin(deltaDeg) {
        if (!this.crankHandle || !this.crankPivot) {
            this.crankVisualAngle += deltaDeg;
            this._crankVisualTarget = this.crankVisualAngle;
            return;
        }
        this._crankVisualTarget = (this._crankVisualTarget != null
            ? this._crankVisualTarget
            : this.crankVisualAngle) + deltaDeg;
        if (this._crankAnimRaf) return;

        let start = this.crankVisualAngle;
        let startTarget = this._crankVisualTarget;
        let ms = this.params.crankSpinMs != null ? this.params.crankSpinMs : 240;
        let t0 = performance.now();

        const tick = (now) => {
            // If more spikes arrived, restart easing from current angle toward new target.
            if (this._crankVisualTarget !== startTarget) {
                start = this.crankVisualAngle;
                startTarget = this._crankVisualTarget;
                t0 = now;
            }
            let t = Math.min(1, (now - t0) / ms);
            let eased = 1 - (1 - t) * (1 - t);
            this.set_crank_visual_angle(start + (startTarget - start) * eased);
            if (t < 1) {
                this._crankAnimRaf = requestAnimationFrame(tick);
            } else {
                this._crankAnimRaf = null;
                this.set_crank_visual_angle(this._crankVisualTarget);
            }
        };
        this._crankAnimRaf = requestAnimationFrame(tick);
    }

    stop_crank_spin_anim() {
        if (this._crankAnimRaf) {
            cancelAnimationFrame(this._crankAnimRaf);
            this._crankAnimRaf = null;
        }
        this._crankVisualTarget = this.crankVisualAngle;
    }

    is_power_in_green() {
        return Math.abs(this.powerAngle) <= this.params.powerGreenDeg;
    }

    get_power_band() {
        if (this.powerAngle > this.params.powerGreenDeg) return "high";
        if (this.powerAngle < -this.params.powerGreenDeg) return "low";
        return "green";
    }

    apply_power_spike(baseDeg, jitterDeg) {
        let jitter = (Math.random() * 2 - 1) * (jitterDeg || 0);
        let next = this.powerAngle + baseDeg + jitter;
        let max = this.params.powerMaxDeg;
        this.set_power_needle_angle(Math.max(-max, Math.min(max, next)));
        this.queue_crank_spin(this.params.crankVisualStepDeg);
    }

    update_power_ui_feedback() {
        let band = this.get_power_band();
        this.update_indicator_area_highlights(band);
        if (band === "green") {
            this.set_scanner_status("scanning");
        } else if (band === "high") {
            this.set_scanner_status("error_high");
        } else {
            this.set_scanner_status("error_low");
        }

        // Outline release when overloaded (player should vent).
        let releaseInteractive = this.powerRelease
            && this.powerRelease.style.pointerEvents !== "none";
        if (band === "high" && this._powerScanActive && releaseInteractive) {
            if (!this.releaseOutline) {
                this.releaseOutline = create_SVG_outline_of_group_ID(this.powerRelease);
                this.releaseOutline.style.pointerEvents = "none";
                this.releaseOutline.classList.add("focus_on_SVG_outline");
                this.powerRelease.parentNode.insertBefore(this.releaseOutline, this.powerRelease);
            }
        } else if (this.releaseOutline) {
            this.releaseOutline.remove();
            this.releaseOutline = null;
        }
    }

    set_scanning_sfx(on) {
        if (on && !this._scanningSfxOn) {
            AudioCont.start_looping_sound_effect("scanning");
            this._scanningSfxOn = true;
        } else if (!on && this._scanningSfxOn) {
            AudioCont.stop_looping_sound_effect("scanning");
            this._scanningSfxOn = false;
        }
    }

    async pose_partner_for_scan() {
        if (!this.partner.is_present) return;

        let boxCenter = getSVGInternalCenter(this.BoxCarrier || this.box.BoxBase);
        let targetX = boxCenter.x + this.params.partnerScanOffsetX;
        let targetY = boxCenter.y + this.params.partnerScanOffsetY;
        let scale = this.params.partnerScanScale;

        // 1) Step up from the bottom-right home (still facing back).
        let cur = getSVGInternalCenter(this.partner.PartnerTranslateGroup);
        let upOffsetY = this.partner._offsetY + (targetY - cur.y);
        await this.partner.animate_pose({
            x: this.partner._offsetX,
            y: upOffsetY,
            scale: scale,
            ms: 840
        });

        // 2) Face left, then walk horizontally to the crank side.
        this.partner.set_direction("left");
        await wait(240);
        cur = getSVGInternalCenter(this.partner.PartnerTranslateGroup);
        let walkX = this.partner._offsetX + (targetX - cur.x);
        await this.partner.animate_offset(walkX, this.partner._offsetY, 1100);

        // 3) Turn right to face the crank.
        await wait(160);
        this.partner.set_direction("right");
    }

    async restore_partner_after_scan() {
        if (!this.partner.is_present) return;
        let homeScale = this.partner._homeScale || 40;

        // 1) Face right, walk horizontally back to the right-side column (keep current height).
        this.partner.set_direction("right");
        await wait(160);
        await this.partner.animate_offset(0, this.partner._offsetY, 1100);

        // 2) Face forward, then step down to home (and restore home scale).
        this.partner.set_direction("front");
        await wait(160);
        await this.partner.animate_pose({
            x: 0,
            y: 0,
            scale: homeScale,
            ms: 840
        });

        // 3) Turn around to the default back-facing pose.
        await wait(160);
        this.partner.set_direction("back");
    }

    enable_player_crank() {
        if (!this.crankHandle || !this.crankPivot) return;
        this.crankHandle.style.pointerEvents = "auto";
        this.crankHandle.style.cursor = "pointer";
        this.crankHandle.style.opacity = "1";

        if (!this.crankOutline) {
            this.crankOutline = create_SVG_outline_of_group_ID(this.crankHandle);
            this.crankOutline.style.pointerEvents = "none";
            this.crankOutline.classList.add("focus_on_SVG_outline");
            this.crankHandle.parentNode.insertBefore(this.crankOutline, this.crankHandle);
        }

        let pivotScreen = () => getSVGInternalCenter(this.crankPivot);
        let angleAt = (evt) => {
            let m = getMousePosition(evt);
            let p = pivotScreen();
            return Math.atan2(m.y - p.y, m.x - p.x) * 180 / Math.PI;
        };

        this._crankPointer = {
            dragging: false,
            lastAngle: 0,
            accum: 0,
            mask: null
        };

        this.crankHandle.onpointerdown = (evt) => {
            if (!this._powerScanActive) return;
            evt.preventDefault();
            // Immediate click-crank.
            this.apply_power_spike(this.params.playerSpikeDeg, this.params.playerSpikeDegJitter);
            AudioCont.play_sound_effect("button_click");

            let state = this._crankPointer;
            state.dragging = true;
            state.lastAngle = angleAt(evt);
            state.accum = 0;

            let mask = create_SVG_rect(0, 0, this.basics.W, this.basics.H);
            mask.style.opacity = 0;
            this.basics.ItemLayers.Questions.appendChild(mask);
            state.mask = mask;

            const onMove = (e) => {
                if (!state.dragging) return;
                let a = angleAt(e);
                let d = a - state.lastAngle;
                // Normalize to [-180, 180]
                while (d > 180) d -= 360;
                while (d < -180) d += 360;
                state.lastAngle = a;
                state.accum += Math.abs(d);
                let quantum = this.params.crankQuantumDeg;
                while (state.accum >= quantum) {
                    state.accum -= quantum;
                    this.apply_power_spike(this.params.playerSpikeDeg, this.params.playerSpikeDegJitter);
                    AudioCont.play_sound_effect("button_click");
                }
            };
            const onUp = () => {
                state.dragging = false;
                if (state.mask) {
                    state.mask.remove();
                    state.mask = null;
                }
            };
            mask.onpointermove = onMove;
            mask.onpointerup = onUp;
            mask.onpointercancel = onUp;
            mask.onpointerleave = onUp;
        };
    }

    disable_player_crank() {
        if (this.crankHandle) {
            this.crankHandle.onpointerdown = null;
            this.crankHandle.style.pointerEvents = "none";
            this.crankHandle.style.cursor = "auto";
        }
        if (this._crankPointer && this._crankPointer.mask) {
            this._crankPointer.mask.remove();
            this._crankPointer.mask = null;
        }
        if (this.crankOutline) {
            this.crankOutline.remove();
            this.crankOutline = null;
        }
    }

    enable_player_release() {
        if (!this.powerRelease) return;
        this.powerRelease.style.pointerEvents = "auto";
        this.powerRelease.style.cursor = "pointer";
        this.powerRelease.style.opacity = "1";

        this.powerRelease.onpointerdown = (evt) => {
            if (!this._powerScanActive) return;
            evt.preventDefault();
            this._venting = true;
            this.powerRelease.style.filter = "brightness(1.15)";
            if (this.powerRelease.setPointerCapture) {
                try { this.powerRelease.setPointerCapture(evt.pointerId); } catch (e) { /* ignore */ }
            }
        };
        const stopVent = () => {
            this._venting = false;
            if (this.powerRelease) this.powerRelease.style.filter = "";
        };
        this.powerRelease.onpointerup = stopVent;
        this.powerRelease.onpointercancel = stopVent;
        // Don't stop on leave while captured — pointerup handles release.
    }

    disable_player_release() {
        this._venting = false;
        if (this.powerRelease) {
            this.powerRelease.onpointerdown = null;
            this.powerRelease.onpointerup = null;
            this.powerRelease.onpointercancel = null;
            this.powerRelease.style.pointerEvents = "none";
            this.powerRelease.style.cursor = "auto";
            this.powerRelease.style.filter = "";
        }
        if (this.releaseOutline) {
            this.releaseOutline.remove();
            this.releaseOutline = null;
        }
    }

    schedule_partner_spike() {
        if (!this._powerScanActive || !this.partner.is_present) return;
        let base = this.params.partnerSpikeIntervalMs;
        let jitter = this.params.partnerSpikeIntervalJitterMs;
        let waitMs = Math.max(120, base + (Math.random() * 2 - 1) * jitter);
        this._partnerSpikeTimeout = setTimeout(() => {
            if (!this._powerScanActive) return;
            // Partner pauses while overloaded — player must vent first.
            if (this.get_power_band() !== "high") {
                this.apply_power_spike(this.params.partnerSpikeDeg, this.params.partnerSpikeDegJitter);
                // Quiet bob on the crank — no jump SFX (would spam every spike).
                if (this.partner.PartnerTranslateGroup) {
                    let bob = this.params.partnerBobPx != null ? this.params.partnerBobPx : 7;
                    let bx = this.partner._offsetX;
                    let by = this.partner._offsetY;
                    this.partner.PartnerTranslateGroup.style.transition = "transform 70ms ease-out";
                    this.partner.PartnerTranslateGroup.style.transform =
                        `translate(${bx}px, ${by - bob}px)`;
                    setTimeout(() => {
                        if (!this.partner.PartnerTranslateGroup) return;
                        this.partner.PartnerTranslateGroup.style.transition = "transform 90ms ease-in";
                        this.partner.PartnerTranslateGroup.style.transform =
                            `translate(${bx}px, ${by}px)`;
                    }, 75);
                }
            }
            this.schedule_partner_spike();
        }, waitMs);
    }

    stop_partner_spikes() {
        if (this._partnerSpikeTimeout) {
            clearTimeout(this._partnerSpikeTimeout);
            this._partnerSpikeTimeout = null;
        }
    }

    set_nozzle_progress(progress01) {
        if (!this.laserNozzle) return;
        let delta = this.get_nozzle_travel_delta();
        let t = Math.max(0, Math.min(1, progress01));
        this.laserNozzle.style.transition = "none";
        this.laserNozzle.style.transform = `translate(${delta.x * t}px, ${delta.y * t}px)`;
    }

    run_powered_scan_loop() {
        return new Promise((resolve) => {
            this._powerScanActive = true;
            this._scanProgress = 0;
            this._wasPowerOk = true;
            this._venting = false;
            this.set_power_needle_angle(0);
            this.stop_crank_spin_anim();
            this.set_crank_visual_angle(0);
            this._crankVisualTarget = 0;
            this.set_nozzle_progress(0);

            // Must start after _powerScanActive is true (schedule_partner_spike guards on it).
            if (this.partner.is_present) {
                // First crank promptly so power doesn't just decay from the start.
                this.apply_power_spike(this.params.partnerSpikeDeg, this.params.partnerSpikeDegJitter);
                this.schedule_partner_spike();
            }

            let last = performance.now();
            let tick = (now) => {
                if (!this._powerScanActive) return;
                let dt = Math.min(0.05, (now - last) / 1000);
                last = now;

                // Natural decay toward low power; vent drains faster.
                let drain = this.params.powerDecayDegPerSec;
                if (this._venting) drain += this.params.powerVentDegPerSec;
                let next = this.powerAngle - drain * dt;
                let max = this.params.powerMaxDeg;
                this.set_power_needle_angle(Math.max(-max, Math.min(max, next)));

                let ok = this.is_power_in_green();
                this.update_power_ui_feedback();

                if (ok && !this._wasPowerOk) {
                    // Resumed — no SFX
                }
                if (!ok && this._wasPowerOk) {
                    AudioCont.play_sound_effect("rejected");
                }
                this._wasPowerOk = ok;

                this.set_laser_output_active(ok);
                this.set_scanning_sfx(ok);
                if (this.laserBeamGroup) {
                    this.laserBeamGroup.style.opacity = ok ? "1" : "0";
                }

                if (ok) {
                    this._scanProgress += dt * 1000 / this.params.scanDurationMs;
                    this.set_nozzle_progress(this._scanProgress);
                }

                if (this._scanProgress >= 1) {
                    this._powerScanActive = false;
                    this.stop_partner_spikes();
                    this.disable_player_crank();
                    this.disable_player_release();
                    this.set_scanning_sfx(false);
                    this.clear_control_outlines();
                    resolve();
                    return;
                }

                this._powerRaf = requestAnimationFrame(tick);
            };
            this._powerRaf = requestAnimationFrame(tick);
        });
    }

    async phase_press_start_and_scan() {
        Interface.Prompt.show_message("Press the button to start scanning");
        AudioCont.play_sound_effect("alert_minor");
        await this.wait_for_start_button();

        await this.fade_safety_shield_down(true);
        await this.pose_partner_for_scan();

        this.set_power_indicator_visible(true);

        if (this.partner.is_present) {
            Interface.Prompt.show_message(
                this.partner.partnername
                    + " is powering the scanner — hold RELEASE when power is too high!"
            );
            this.enable_player_release();
            // Crank visible but partner-operated only.
            if (this.crankHandle) {
                this.crankHandle.style.opacity = "1";
                this.crankHandle.style.pointerEvents = "none";
            }
            // Spikes start inside run_powered_scan_loop once _powerScanActive is true.
        } else {
            Interface.Prompt.show_message(
                "Crank to power the scan — keep the needle in the green! Hold RELEASE if it overloads."
            );
            this.enable_player_crank();
            this.enable_player_release();
        }
        AudioCont.play_sound_effect("alert_minor");

        this.start_laser_beam_effect();
        await this.run_powered_scan_loop();

        this.stop_laser_beam_effect();
        this.set_laser_output_active(false);
        this.set_power_indicator_visible(false);
        this.set_scanner_status("done");
        AudioCont.play_sound_effect("scanner_return");
        await this.animate_nozzle_to({ x: 0, y: 0 }, this.params.nozzleReturnMs, "ease-in");

        await this.fade_safety_shield_down(false);
        await this.restore_partner_after_scan();
        Interface.Prompt.hide();
    }

    set_start_button_state(state) {
        if (!this.startButton) return;
        let bg = this.startButton.querySelector(".start_button_button");
        let text = this.startButton.querySelector(".start_button_text");

        if (this.startButtonOutline) {
            this.startButtonOutline.remove();
            this.startButtonOutline = null;
        }

        if (state === "on") {
            if (bg) bg.style.fill = this.params.startButtonOnBg;
            if (text) text.style.fill = this.params.startButtonOnText;
            this.startButton.style.cursor = "pointer";
            this.startButton.style.pointerEvents = "auto";
            this.startButtonOutline = create_SVG_outline_of_group_ID(this.startButton);
            this.startButtonOutline.style.pointerEvents = "none";
            this.startButtonOutline.classList.add("focus_on_SVG_outline");
            this.startButton.parentNode.insertBefore(this.startButtonOutline, this.startButton);
        } else {
            if (bg) bg.style.fill = this.params.startButtonOffBg;
            if (text) text.style.fill = this.params.startButtonOffText;
            this.startButton.style.cursor = "auto";
            this.startButton.style.pointerEvents = "none";
            this.startButton.onpointerdown = null;
        }
    }

    set_laser_output_active(active) {
        if (!this.laserOutput) return;
        this.laserOutput.style.fill = active
            ? this.params.laserOutputActive
            : this.params.laserOutputIdle;
    }

    async fade_safety_shield_down(visible) {
        if (!this.safetyShieldDown) return;
        let ms = this.params.shieldFadeMs;
        this.safetyShieldDown.style.display = "inline";
        this.safetyShieldDown.style.pointerEvents = "none";
        this.safetyShieldDown.style.transition = `opacity ${ms}ms ease-in-out`;
        window.getComputedStyle(this.safetyShieldDown).opacity;
        this.safetyShieldDown.style.opacity = visible ? "1" : "0";
        await wait(ms);
        if (!visible) {
            this.safetyShieldDown.style.display = "none";
            this.safetyShieldDown.style.pointerEvents = "none";
        }
    }

    get_nozzle_travel_delta() {
        let startEl = this.Scanner.querySelector(".scanner_laser_nozzle_start_point");
        let endEl = this.Scanner.querySelector(".scanner_laser_nozzle_end_point");
        if (!startEl || !endEl) return { x: 100, y: 0 };
        let sx = parseFloat(startEl.getAttribute("cx"));
        let sy = parseFloat(startEl.getAttribute("cy"));
        let ex = parseFloat(endEl.getAttribute("cx"));
        let ey = parseFloat(endEl.getAttribute("cy"));
        return { x: ex - sx, y: ey - sy };
    }

    async animate_nozzle_to(delta, ms, easing = "linear") {
        if (!this.laserNozzle) return;
        this.laserNozzle.style.transition = `transform ${ms}ms ${easing}`;
        window.getComputedStyle(this.laserNozzle).transform;
        this.laserNozzle.style.transform = `translate(${delta.x}px, ${delta.y}px)`;
        await wait(ms);
    }

    /**
     * JS-only laser beam fan (tweak via GenParam.ScanBoxHome).
     * Drawn on Plus2 so it sits in front of the box and behind the safety shield.
     * Several beams share the nozzle output origin, fanned by small angles,
     * with a light tip-wiggle (origin fixed).
     */
    start_laser_beam_effect() {
        this.stop_laser_beam_effect();
        if (!this.laserOutput || !this.basics.ItemLayers.Plus2) return;

        this.laserBeamGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.laserBeamGroup.setAttribute("class", "scanner_laser_beam_fx");
        this.laserBeamGroup.style.pointerEvents = "none";

        let angles = Array.isArray(this.params.laserBeamAnglesDeg)
            ? this.params.laserBeamAnglesDeg
            : [0];
        let baseLen = this.params.laserBeamLength;
        let wiggleDeg = this.params.laserBeamWiggleDeg != null ? this.params.laserBeamWiggleDeg : 2.5;
        let wiggleHz = this.params.laserBeamWiggleHz != null ? this.params.laserBeamWiggleHz : 2.8;
        let maxAbsAngle = Math.max(...angles.map(Math.abs).concat([1]));
        let beams = [];

        angles.forEach((deg, i) => {
            let edge = Math.abs(deg) / maxAbsAngle;
            let lenScale = 1 - 0.12 * edge;

            let glow = document.createElementNS("http://www.w3.org/2000/svg", "line");
            glow.setAttribute("x1", 0);
            glow.setAttribute("y1", 0);
            glow.setAttribute("x2", 0);
            glow.setAttribute("y2", baseLen * lenScale);
            glow.setAttribute("stroke", this.params.laserBeamGlow);
            glow.setAttribute("stroke-width", String(6 - edge * 2));
            glow.setAttribute("stroke-linecap", "round");
            glow.style.opacity = String(0.28 + 0.12 * (1 - edge));

            let core = document.createElementNS("http://www.w3.org/2000/svg", "line");
            core.setAttribute("x1", 0);
            core.setAttribute("y1", 0);
            core.setAttribute("x2", 0);
            core.setAttribute("y2", baseLen * lenScale);
            core.setAttribute("stroke", this.params.laserBeamColor);
            core.setAttribute("stroke-width", String(i === Math.floor(angles.length / 2) ? 2.5 : 1.8));
            core.setAttribute("stroke-linecap", "round");
            core.style.opacity = String(0.7 + 0.2 * (1 - edge));

            this.laserBeamGroup.appendChild(glow);
            this.laserBeamGroup.appendChild(core);
            beams.push({
                glow,
                core,
                deg,
                lenScale,
                // Unique phase / slight frequency jitter so beams don't wiggle in lockstep.
                phase: i * 1.7 + Math.random() * Math.PI,
                freqScale: 0.85 + (i % 3) * 0.12
            });
        });

        // Insert behind the shield host so the glass still covers the beam tip.
        if (this.ShieldHost && this.ShieldHost.parentNode === this.basics.ItemLayers.Plus2) {
            this.basics.ItemLayers.Plus2.insertBefore(this.laserBeamGroup, this.ShieldHost);
        } else {
            this.basics.ItemLayers.Plus2.appendChild(this.laserBeamGroup);
        }

        let svg = GenParam.SVGObject;
        let start = performance.now();
        let tick = (now) => {
            if (!this.laserBeamGroup || !this.laserOutput) return;

            let bb = this.laserOutput.getBBox();
            let local = svg.createSVGPoint();
            local.x = bb.x + bb.width / 2;
            local.y = bb.y + bb.height;
            let screen = local.matrixTransform(this.laserOutput.getScreenCTM());
            let inPlus2 = screen.matrixTransform(this.basics.ItemLayers.Plus2.getScreenCTM().inverse());
            this.laserBeamGroup.setAttribute(
                "transform",
                `translate(${inPlus2.x}, ${inPlus2.y})`
            );

            let elapsed = (now - start) / 1000;
            let t = ((now - start) % 400) / 400;
            let pulse = 0.55 + 0.45 * Math.sin(t * Math.PI * 2);

            beams.forEach((b) => {
                let edge = Math.abs(b.deg) / maxAbsAngle;
                let lenPulse = (0.85 + 0.15 * pulse) * b.lenScale;
                let wiggle = wiggleDeg * Math.sin(
                    elapsed * wiggleHz * b.freqScale * Math.PI * 2 + b.phase
                );
                // Secondary harmonic for a less mechanical sway.
                wiggle += 0.35 * wiggleDeg * Math.sin(
                    elapsed * wiggleHz * b.freqScale * 1.7 * Math.PI * 2 + b.phase * 1.3
                );

                let rad = ((b.deg + wiggle) * Math.PI) / 180;
                let dx = Math.sin(rad) * baseLen * lenPulse;
                let dy = Math.cos(rad) * baseLen * lenPulse;

                b.core.style.opacity = String((0.7 + 0.25 * pulse) * (1 - 0.15 * edge));
                b.glow.style.opacity = String((0.22 + 0.28 * pulse) * (1 - 0.2 * edge));
                // Origin stays fixed at (0, 0); only the tip moves.
                b.glow.setAttribute("x2", dx);
                b.glow.setAttribute("y2", dy);
                b.core.setAttribute("x2", dx * 0.98);
                b.core.setAttribute("y2", dy * 0.98);
            });
            this._laserBeamRaf = requestAnimationFrame(tick);
        };
        this._laserBeamRaf = requestAnimationFrame(tick);
    }

    stop_laser_beam_effect() {
        if (this._laserBeamRaf) {
            cancelAnimationFrame(this._laserBeamRaf);
            this._laserBeamRaf = null;
        }
        if (this.laserBeamGroup) {
            this.laserBeamGroup.remove();
            this.laserBeamGroup = null;
        }
    }

    async snap_element_to_target(elem, targetEl, ms) {
        if (!elem || !targetEl) return;
        ms = ms != null ? ms : this.params.snapMs;
        let current = getSVGInternalCenter(elem);
        let target = getSVGInternalCenter(targetEl);
        let dx = target.x - current.x;
        let dy = target.y - current.y;
        elem.style.transition = `transform ${ms}ms ease-out`;
        elem.style.transform = (elem.style.transform || "") + ` translate(${dx}px, ${dy}px)`;
        await wait(ms);
        elem.style.transition = "";
    }

    enable_box_drag_to(targetEl) {
        return new Promise((resolve) => {
            if (this.dragController && this.dragController.destroy) {
                this.dragController.destroy();
                this.dragController = null;
            }
            this.box.set_pointer_events_enabled(true);
            if (this.box.BoxBase) this.box.BoxBase.style.cursor = "pointer";
            if (this.box.BoxTop) this.box.BoxTop.style.cursor = "pointer";
            this.dragController = new MakeObjectDraggableObject(
                this.basics.ItemLayers.Plus1,
                this.basics.ItemLayers.Questions,
                this.BoxCarrier,
                targetEl,
                this.params.dropDistance,
                async (dropped) => {
                    if (this.dragController && this.dragController.destroy) {
                        this.dragController.destroy();
                        this.dragController = null;
                    }
                    this.box.set_pointer_events_enabled(false);
                    if (this.box.BoxBase) this.box.BoxBase.style.cursor = "auto";
                    if (this.box.BoxTop) this.box.BoxTop.style.cursor = "auto";
                    if (this.BoxCarrier) this.BoxCarrier.style.pointerEvents = "none";
                    await this.snap_element_to_target(dropped, targetEl);
                    resolve();
                }
            );
        });
    }

    async phase_place_box_in_scanner() {
        Interface.Prompt.show_message(
            "Please place the " + this.box.boxname + " in the scanner"
        );
        AudioCont.play_sound_effect("alert_minor");
        await this.enable_box_drag_to(this.scannerBoxTarget);
        this.set_scanner_status("load_box");
    }

    wait_for_start_button() {
        return new Promise((resolve) => {
            this.set_start_button_state("on");
            // Hit proxy on Questions layer so Plus1/Plus2 content cannot steal the click.
            let hit = null;
            if (this.startButton && this.basics.ItemLayers.Questions) {
                let bb = this.startButton.getBBox();
                let svg = GenParam.SVGObject;
                let tl = svg.createSVGPoint();
                tl.x = bb.x;
                tl.y = bb.y;
                let br = svg.createSVGPoint();
                br.x = bb.x + bb.width;
                br.y = bb.y + bb.height;
                let ctm = this.startButton.getScreenCTM();
                let invRoot = this.basics.ItemLayers.Questions.getScreenCTM().inverse();
                let p1 = tl.matrixTransform(ctm).matrixTransform(invRoot);
                let p2 = br.matrixTransform(ctm).matrixTransform(invRoot);
                let x = Math.min(p1.x, p2.x);
                let y = Math.min(p1.y, p2.y);
                let w = Math.abs(p2.x - p1.x);
                let h = Math.abs(p2.y - p1.y);
                // Slightly enlarge hit area for easier pressing.
                let pad = 12;
                hit = create_SVG_rect(x - pad, y - pad, w + pad * 2, h + pad * 2);
                hit.style.opacity = 0;
                hit.style.cursor = "pointer";
                hit.style.pointerEvents = "auto";
                this.basics.ItemLayers.Questions.appendChild(hit);
                this._startHitProxy = hit;
            }

            const onStart = () => {
                if (this.startButton) this.startButton.onpointerdown = null;
                if (hit) {
                    hit.onpointerdown = null;
                    hit.remove();
                }
                this._startHitProxy = null;
                AudioCont.play_sound_effect("button_click");
                this.set_start_button_state("off");
                resolve();
            };
            if (this.startButton) this.startButton.onpointerdown = onStart;
            if (hit) hit.onpointerdown = onStart;
        });
    }

    async phase_return_box_to_table() {
        Interface.Prompt.show_message(
            "Place the " + this.box.boxname + " back on the table"
        );
        AudioCont.play_sound_effect("alert_minor");
        await this.enable_box_drag_to(this.boxHomeTarget);
    }

    async fade_out_scene() {
        let ms = this.params.outroFadeMs != null ? this.params.outroFadeMs : 500;
        this.FadeOverlay = create_SVG_rect(0, 0, this.basics.W, this.basics.H);
        this.FadeOverlay.setAttribute("fill", "black");
        this.FadeOverlay.style.opacity = 0;
        this.FadeOverlay.style.pointerEvents = "none";
        this.FadeOverlay.style.transition = `opacity ${ms}ms ease-in-out`;
        this.basics.ItemLayers.Questions.appendChild(this.FadeOverlay);

        window.getComputedStyle(this.FadeOverlay).opacity;
        this.FadeOverlay.style.opacity = 1;
        await wait(ms);
    }

    clean_up() {
        this._powerScanActive = false;
        this.stop_partner_spikes();
        this.stop_crank_spin_anim();
        this.disable_player_crank();
        this.disable_player_release();
        this.clear_control_outlines();
        if (this._powerRaf) {
            cancelAnimationFrame(this._powerRaf);
            this._powerRaf = null;
        }
        this.stop_laser_beam_effect();
        this.set_scanning_sfx(false);
        AudioCont.stop_looping_sound_effect("scanning");
        if (this.dragController && this.dragController.destroy) {
            this.dragController.destroy();
            this.dragController = null;
        }
        if (this.startButtonOutline) {
            this.startButtonOutline.remove();
            this.startButtonOutline = null;
        }
        if (this._startHitProxy) {
            this._startHitProxy.remove();
            this._startHitProxy = null;
        }
        if (this.box) this.box.clean_up();
        if (this.BoxCarrier) this.BoxCarrier.remove();
        if (this.Scanner) this.Scanner.remove();
        if (this.ShieldHost) this.ShieldHost.remove();
        if (this.boxHomeTarget) this.boxHomeTarget.remove();
        if (this.TableGroup) this.TableGroup.remove();
        if (this.Background) this.Background.remove();
        if (this.BackgroundOverlay) this.BackgroundOverlay.remove();
        if (this.FloorStrip) this.FloorStrip.remove();
        if (this.FadeOverlay) this.FadeOverlay.remove();
        this.basics.clean_up();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
    }
}

/**
 * Location-based partner-belief probe: travel to the Fennimal whose toy is currently
 * in the target box → closed box center + static Fennimal left + partner walk-in →
 * curtain reveal → radial 3AFC (belief / reality / cyclic lure) → fade out.
 * Partner is always forced present regardless of phase partner_behavior.
 */
class PartnerBeliefInSituTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;
        // Always force partner presence for this interaction type.
        this.partner_is_present = true;

        this.basics = new BasicElementsModule(FenObj);
        this.W = this.basics.W;
        this.H = this.basics.H;

        this.target_box = FenObj.target_box;
        this.target_box_code = FenObj.target_box_code;
        this.lure_cycle_codes = FenObj.lure_cycle_codes || [];
        this.lure_cycle_boxes = FenObj.lure_cycle_boxes || [];

        if (!this.target_box || !this.target_box_code) {
            throw new Error(
                "partner_belief_in_situ: FenObj is missing target_box / target_box_code " +
                `(Fennimal "${FenObj.id}").`
            );
        }
        if (!Array.isArray(this.lure_cycle_codes) || this.lure_cycle_codes.length < 2
            || !Array.isArray(this.lure_cycle_boxes) || this.lure_cycle_boxes.length < 2) {
            throw new Error(
                "partner_belief_in_situ: FenObj is missing a valid lure_cycle " +
                `(codes=${JSON.stringify(this.lure_cycle_codes)}, boxes=${JSON.stringify(this.lure_cycle_boxes)}).`
            );
        }

        this.box_center_x = 0.5 * this.W;
        this.box_center_y = 0.58 * this.H;
        this.radial_radius = 260;
        this.btn_size = 150;
        this.fennimal_x = 0.22 * this.W;
        this.fennimal_y = 0.82 * this.H;

        this.partnername = "your partner";
        this.Icons = {};
        this.BoxElement = null;
        this.CurtainGroup = null;
        this.RevealCircle = null;
        this.BlackOverlay = null;
        this.PartnerTranslateGroup = null;
        this.PartnerScaleGroup = null;
        this.QuestionBubbleGroup = null;
        this.radialUIGroup = null;
        this.bubble_float_interval = null;
        this.last_input_type = "unknown";

        let settings = WorldState.get_partner_icon_settings();
        if (settings && settings.name) this.partnername = settings.name;
        let gender = (settings && settings.type) ? settings.type : "male";

        let getIcon = (dir) => {
            let icon = WorldState.get_person_icon("partner", dir);
            if (!icon) {
                let el = document.getElementById(`icon_player_${gender}_${dir}`);
                icon = el ? el.cloneNode(true) : null;
            }
            return icon;
        };
        this.Icons = {
            back: getIcon("back"),
            left: getIcon("left"),
            right: getIcon("right")
        };
    }

    async start_sequence() {
        this.basics.create_svg_sublayers();
        await this.basics.create_background_mask(true, 500);

        this.BlackOverlay = create_SVG_rect(0, 0, this.W, this.H);
        this.BlackOverlay.setAttribute("fill", "black");
        this.BlackOverlay.style.opacity = 0;
        this.BlackOverlay.style.pointerEvents = "none";
        this.basics.ItemLayers.Questions.appendChild(this.BlackOverlay);

        await this.basics.create_and_appear_Fennimal(
            this.basics.ItemLayers.Main,
            this.fennimal_x,
            this.fennimal_y,
            1.75,
            250
        );
        if (this.basics.Fennimal) {
            this.basics.Fennimal.style.pointerEvents = "none";
        }

        this.place_target_box(this.target_box);

        let triad = this.buildBeliefTriad();
        this.create_curtain_with_reveal_circle({ armed: false });

        await this.setup_partner_at_bottom_right();
        await this.animate_partner_enter_and_face_box();

        let printed_box_name = GenParam.get_box_printed_name(this.target_box);
        Interface.Prompt.show_message("Click on the circle to start the question");
        await this.enable_curtain_reveal();

        Interface.Prompt.show_message(
            `Which toy does ${this.partnername} believe is in the ${printed_box_name}?`
        );

        let response = await this.show_radial_options_and_wait(triad.answer_options);
        Interface.Prompt.hide();
        AudioCont.play_sound_effect("button_click");

        let is_correct = (response.selected_id === triad.belief_answer);
        this.FenObj.partner_belief_in_situ_answer = {
            trial_kind: "belief",
            target_box: this.target_box,
            target_box_code: this.target_box_code,
            scene_fennimal_id: this.FenObj.partner_belief_in_situ_scene_fennimal_id || this.FenObj.id,
            options: this.buildStoredOptions(
                response.option_layout,
                triad.answer_options.map((toyId) => ({
                    id: toyId,
                    role: triad.option_roles[toyId] || "unknown"
                }))
            ),
            selected: response.selected_id,
            correct: is_correct,
            reaction_time_ms: response.reaction_time_ms,
            belief_answer: triad.belief_answer,
            reality_answer: triad.reality_answer,
            lure_answer: triad.lure_answer,
            lure_source_box: triad.lure_source_box,
            lure_source_box_code: triad.lure_source_box_code,
            lure_source_type: triad.lure_source_type
        };

        await this.fade_black(1, 400);
        this.returnfunc();
    }

    buildBeliefTriad() {
        let cycleIndex = this.lure_cycle_codes.indexOf(this.target_box_code);
        if (cycleIndex < 0) {
            throw new Error(
                `partner_belief_in_situ: target_box "${this.target_box_code}" is not in lure_cycle ` +
                `[${this.lure_cycle_codes.join(", ")}].`
            );
        }

        let lureIndex = (cycleIndex + 1) % this.lure_cycle_codes.length;
        let lure_source_box_code = this.lure_cycle_codes[lureIndex];
        let lure_source_box = this.lure_cycle_boxes[lureIndex];

        let belief = WorldState.get_partner_belief_in_box_contents(this.target_box);
        let reality = WorldState.get_toybox_contents(this.target_box);
        if (reality === false) reality = undefined;
        let lure = WorldState.get_partner_belief_in_box_contents(lure_source_box);
        if (lure === false) lure = undefined;

        if (belief === undefined || belief === false) {
            throw new Error(
                `partner_belief_in_situ: missing partner belief for box "${this.target_box}".`
            );
        }
        if (reality === undefined) {
            throw new Error(
                `partner_belief_in_situ: missing current contents for box "${this.target_box}".`
            );
        }
        if (lure === undefined) {
            throw new Error(
                `partner_belief_in_situ: missing partner belief for lure-source box ` +
                `"${lure_source_box}" (code "${lure_source_box_code}").`
            );
        }
        if (belief === reality || belief === lure || reality === lure) {
            throw new Error(
                `partner_belief_in_situ: belief/reality/lure are not three distinct toys for ` +
                `box "${this.target_box}": belief=${belief}, reality=${reality}, lure=${lure} ` +
                `(from ${lure_source_box_code}).`
            );
        }

        let option_roles = {};
        option_roles[belief] = "belief";
        option_roles[reality] = "reality";
        option_roles[lure] = "lure";

        return {
            answer_options: shuffleArray([belief, reality, lure]),
            belief_answer: belief,
            reality_answer: reality,
            lure_answer: lure,
            lure_source_box_code,
            lure_source_box,
            lure_source_type: "partner_belief",
            option_roles
        };
    }

    place_target_box(boxId) {
        let template = document.getElementById("toybox_" + boxId);
        if (!template) {
            throw new Error(`partner_belief_in_situ: missing toybox_${boxId}`);
        }
        let BoxObj = copy_scale_and_move_object_to_position(
            template,
            this.basics.ItemLayers.Main,
            this.box_center_x,
            this.box_center_y,
            2.5
        );
        apply_toybox_decoration_visibility_to_element(BoxObj, boxId);
        Array.from(BoxObj.getElementsByClassName("alignment_field")).forEach((t) => t.remove());
        BoxObj.style.opacity = 0;
        BoxObj.style.pointerEvents = "none";
        this.BoxElement = BoxObj;
        return BoxObj;
    }

    create_curtain_with_reveal_circle({ armed = true } = {}) {
        this.CurtainGroup = create_SVG_group(0, 0, "pb_insitu_curtain", undefined);
        this.basics.ItemLayers.Plus1.appendChild(this.CurtainGroup);

        let curtain_w = 220;
        let curtain_h = 200;
        let cx = this.box_center_x;
        let cy = this.box_center_y - 20;

        let fabric = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        fabric.setAttribute("x", cx - curtain_w / 2);
        fabric.setAttribute("y", cy - curtain_h / 2);
        fabric.setAttribute("width", curtain_w);
        fabric.setAttribute("height", curtain_h);
        fabric.setAttribute("rx", 18);
        fabric.setAttribute("fill", "#6d4c41");
        fabric.setAttribute("stroke", "#3e2723");
        fabric.setAttribute("stroke-width", "6");
        this.CurtainGroup.appendChild(fabric);

        let fold = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        fold.setAttribute("x", cx - curtain_w / 2 + 18);
        fold.setAttribute("y", cy - curtain_h / 2);
        fold.setAttribute("width", 28);
        fold.setAttribute("height", curtain_h);
        fold.setAttribute("fill", "rgba(0,0,0,0.18)");
        this.CurtainGroup.appendChild(fold);

        let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", cx);
        circle.setAttribute("cy", cy);
        circle.setAttribute("r", 42);
        circle.setAttribute("fill", "rgba(255,255,255,0.15)");
        circle.setAttribute("stroke", "gold");
        circle.setAttribute("stroke-width", "7");
        circle.style.filter = "drop-shadow(0px 0px 12px gold)";
        circle.style.pointerEvents = "none";
        circle.style.cursor = "default";
        this.CurtainGroup.appendChild(circle);
        this.RevealCircle = circle;

        if (armed) return this.enable_curtain_reveal();
        return null;
    }

    enable_curtain_reveal() {
        let circle = this.RevealCircle;
        if (!circle) return Promise.resolve();

        circle.style.pointerEvents = "all";
        circle.style.cursor = "pointer";

        return new Promise((resolve) => {
            circle.onpointerdown = (evt) => {
                if (evt && evt.pointerType) this.last_input_type = evt.pointerType;
                circle.onpointerdown = null;
                circle.style.cursor = "auto";
                resolve();
            };
        });
    }

    async setup_partner_at_bottom_right() {
        this.PartnerTranslateGroup = create_SVG_group(0, 0);
        this.basics.ItemLayers.Partner.appendChild(this.PartnerTranslateGroup);

        this.PartnerScaleGroup = create_SVG_group(0, 0);
        this.PartnerTranslateGroup.appendChild(this.PartnerScaleGroup);

        for (let dir in this.Icons) {
            if (!this.Icons[dir]) continue;
            let icon = this.Icons[dir];
            icon.style.display = (dir === "back") ? "inherit" : "none";
            icon.querySelectorAll(".prep_element_hidden").forEach((el) => el.remove());
            icon.style.transform = "";
            icon.removeAttribute("transform");
            this.PartnerScaleGroup.appendChild(icon);
        }

        // Start already in the bottom-right of the scene.
        this.partner_x = 0.88 * this.W;
        this.partner_y = 0.95 * this.H;
        this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;
        this.PartnerScaleGroup.style.transform = "scale(30)";
        this.PartnerTranslateGroup.style.opacity = 1;
        window.getComputedStyle(this.PartnerTranslateGroup).transform;
    }

    set_partner_direction(dir) {
        for (let key in this.Icons) {
            if (this.Icons[key]) this.Icons[key].style.display = (key === dir) ? "inherit" : "none";
        }
    }

    async animate_partner_enter_and_face_box() {
        // Forward (up the screen) — no diagonal.
        this.set_partner_direction("back");
        this.partner_y = this.box_center_y + 40;
        this.PartnerTranslateGroup.style.transition = "transform 1000ms ease-in-out";
        this.PartnerScaleGroup.style.transition = "transform 1000ms ease-in-out";
        this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;
        this.PartnerScaleGroup.style.transform = "scale(24)";
        await wait(1100);

        // Then turn left and approach the box horizontally.
        let targetX = this.box_center_x + 400;
        this.set_partner_direction(targetX < this.partner_x ? "left" : "right");
        this.partner_x = targetX;
        this.PartnerTranslateGroup.style.transition = "transform 1000ms ease-in-out";
        this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;
        await wait(1000);

        this.set_partner_direction("left");
        this.show_question_bubble();
        AudioCont.play_sound_effect("alert_minor");
    }

    show_question_bubble() {
        this.QuestionBubbleGroup = create_SVG_group(0, 0);
        this.PartnerTranslateGroup.appendChild(this.QuestionBubbleGroup);

        let dot1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot1.setAttribute("cx", "-25"); dot1.setAttribute("cy", "30"); dot1.setAttribute("r", "12");
        dot1.setAttribute("fill", "rgba(255, 255, 255, 0.85)");
        dot1.setAttribute("stroke", "#ccc"); dot1.setAttribute("stroke-width", "2");

        let dot2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot2.setAttribute("cx", "5"); dot2.setAttribute("cy", "-5"); dot2.setAttribute("r", "18");
        dot2.setAttribute("fill", "rgba(255, 255, 255, 0.85)");
        dot2.setAttribute("stroke", "#ccc"); dot2.setAttribute("stroke-width", "2");

        let bubble = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        bubble.setAttribute("cx", "50"); bubble.setAttribute("cy", "-70");
        bubble.setAttribute("rx", "70"); bubble.setAttribute("ry", "55");
        bubble.setAttribute("fill", "rgba(255, 255, 255, 0.85)");
        bubble.setAttribute("stroke", "#ccc"); bubble.setAttribute("stroke-width", "4");

        let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", "50"); text.setAttribute("y", "-35");
        text.setAttribute("font-family", "Arial, sans-serif");
        text.setAttribute("font-weight", "bold");
        text.setAttribute("font-size", "95");
        text.setAttribute("fill", "gold");
        text.setAttribute("stroke", "#b8860b");
        text.setAttribute("stroke-width", "2");
        text.setAttribute("text-anchor", "middle");
        text.textContent = "?";

        this.QuestionBubbleGroup.appendChild(dot1);
        this.QuestionBubbleGroup.appendChild(dot2);
        this.QuestionBubbleGroup.appendChild(bubble);
        this.QuestionBubbleGroup.appendChild(text);

        this.QuestionBubbleGroup.style.transformOrigin = "0px 40px";
        this.QuestionBubbleGroup.style.transform = "translate(50px, -300px) scale(0)";
        this.QuestionBubbleGroup.style.transition = "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)";
        window.getComputedStyle(this.QuestionBubbleGroup).transform;
        this.QuestionBubbleGroup.style.transform = "translate(50px, -300px) scale(1.6)";

        this.bubble_float_interval = setInterval(() => {
            if (!this.QuestionBubbleGroup) return;
            this.QuestionBubbleGroup.style.transition = "transform 1000ms ease-in-out";
            this.QuestionBubbleGroup.style.transform = "translate(50px, -315px) scale(1.6)";
            setTimeout(() => {
                if (!this.QuestionBubbleGroup) return;
                this.QuestionBubbleGroup.style.transform = "translate(50px, -285px) scale(1.6)";
            }, 1000);
        }, 2000);
    }

    hide_question_bubble() {
        if (this.bubble_float_interval) {
            clearInterval(this.bubble_float_interval);
            this.bubble_float_interval = null;
        }
        if (this.QuestionBubbleGroup) {
            this.QuestionBubbleGroup.remove();
            this.QuestionBubbleGroup = null;
        }
    }

    show_radial_options_and_wait(options) {
        return new Promise((resolve) => {
            let n = options.length;
            let baseAngle = Math.random() * Math.PI * 2;
            let layout = [];

            this.radialUIGroup = create_SVG_group(0, 0);
            this.radialUIGroup.style.opacity = 0;
            this.basics.ItemLayers.Questions.insertBefore(
                this.radialUIGroup,
                this.BlackOverlay
            );

            let disabled = false;
            let handleSelect = (selected_id, evt) => {
                if (disabled) return;
                disabled = true;
                let response_perf = performance.now();
                let input_type = (evt && evt.pointerType)
                    ? evt.pointerType
                    : (this.last_input_type || "unknown");

                this.hide_question_bubble();
                if (this.radialUIGroup) {
                    this.radialUIGroup.style.transition = "opacity 150ms ease-in";
                    this.radialUIGroup.style.opacity = 0;
                    setTimeout(() => {
                        if (this.radialUIGroup) this.radialUIGroup.remove();
                        this.radialUIGroup = null;
                    }, 160);
                }

                resolve({
                    selected_id,
                    option_layout: layout,
                    reaction_time_ms: Math.round(response_perf - this._responseOnsetPerf),
                    input_type
                });
            };

            options.forEach((opt, i) => {
                let angle = baseAngle + (i * 2 * Math.PI / n);
                let bx = this.box_center_x + Math.cos(angle) * this.radial_radius - this.btn_size / 2;
                let by = this.box_center_y + Math.sin(angle) * this.radial_radius - this.btn_size / 2;
                let option_id = (typeof opt === "string") ? opt : opt.id;
                layout.push({ option_id, x: Math.round(bx), y: Math.round(by) });
                this.create_toy_choice_button(this.radialUIGroup, option_id, bx, by, handleSelect);
            });

            requestAnimationFrame(() => {
                if (this.CurtainGroup) {
                    this.CurtainGroup.remove();
                    this.CurtainGroup = null;
                }
                if (this.BoxElement) this.BoxElement.style.opacity = 1;
                this.radialUIGroup.style.opacity = 1;
                this._responseOnsetPerf = performance.now();
            });
        });
    }

    create_toy_choice_button(parent, toy_id, btn_x, btn_y, onSelect) {
        let BtnGroup = create_SVG_group(0, 0);
        parent.appendChild(BtnGroup);

        let btn_bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        btn_bg.setAttribute("x", btn_x);
        btn_bg.setAttribute("y", btn_y);
        btn_bg.setAttribute("width", this.btn_size);
        btn_bg.setAttribute("height", this.btn_size);
        btn_bg.setAttribute("rx", 15);
        btn_bg.setAttribute("fill", "#d8c381");
        btn_bg.setAttribute("stroke", "#b89f5d");
        btn_bg.setAttribute("stroke-width", "3");
        BtnGroup.appendChild(btn_bg);

        let outline = btn_bg.cloneNode(true);
        outline.removeAttribute("fill");
        outline.setAttribute("fill", "none");
        outline.removeAttribute("stroke");
        outline.style.stroke = "";
        outline.removeAttribute("stroke-width");
        outline.style.strokeWidth = "";
        outline.style.pointerEvents = "none";
        outline.classList.add("focus_on_SVG_outline");
        BtnGroup.insertBefore(outline, btn_bg.nextSibling);

        let template = document.getElementById("toy_" + toy_id);
        if (template) {
            let RawToy = template.cloneNode(true);
            RawToy.style.display = "inherit";
            set_toy_color_scheme(RawToy, toy_id, false);
            ToyChoiceBar.make_toy_static(RawToy, toy_id);
            BtnGroup.appendChild(RawToy);

            let TBox = RawToy.getBBox();
            let max_dim = Math.max(TBox.width, TBox.height) || 100;
            let scale = (this.btn_size * 0.85) / max_dim;
            let raw_cx = TBox.x + (TBox.width / 2);
            let raw_cy = TBox.y + (TBox.height / 2);
            let target_cx = btn_x + (this.btn_size / 2);
            let target_cy = btn_y + (this.btn_size / 2);
            RawToy.style.transformOrigin = `${raw_cx}px ${raw_cy}px`;
            RawToy.style.transform = `translate(${target_cx - raw_cx}px, ${target_cy - raw_cy}px) scale(${scale})`;
        }

        let click_catcher = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        click_catcher.setAttribute("x", btn_x);
        click_catcher.setAttribute("y", btn_y);
        click_catcher.setAttribute("width", this.btn_size);
        click_catcher.setAttribute("height", this.btn_size);
        click_catcher.setAttribute("fill", "transparent");
        click_catcher.style.cursor = "pointer";
        click_catcher.onpointerdown = (evt) => onSelect(toy_id, evt);
        BtnGroup.appendChild(click_catcher);
    }

    buildStoredOptions(responseLayout, optionInfos) {
        let byId = {};
        (responseLayout || []).forEach((loc) => {
            byId[loc.option_id] = loc;
        });
        return (optionInfos || []).map((info) => {
            let loc = byId[info.id] || {};
            return {
                ...info,
                x: (typeof loc.x === "number") ? loc.x : null,
                y: (typeof loc.y === "number") ? loc.y : null
            };
        });
    }

    async fade_black(toOpacity, ms = 400) {
        if (!this.BlackOverlay) return;
        this.BlackOverlay.style.pointerEvents = toOpacity > 0 ? "auto" : "none";
        this.BlackOverlay.style.transition = `opacity ${ms}ms ease-in-out`;
        window.getComputedStyle(this.BlackOverlay).opacity;
        this.BlackOverlay.style.opacity = toOpacity;
        await wait(ms);
    }

    clean_up() {
        this.hide_question_bubble();
        if (this.radialUIGroup) this.radialUIGroup.remove();
        if (this.CurtainGroup) this.CurtainGroup.remove();
        if (this.BlackOverlay) this.BlackOverlay.remove();
        if (this.PartnerTranslateGroup) this.PartnerTranslateGroup.remove();
        if (this.BoxElement) this.BoxElement.remove();
        this.basics.clean_up();
    }
}

// ---------------------------------------------------------------------------
// PartnerBeliefMultipleController
// ---------------------------------------------------------------------------
class PartnerBeliefMultipleController {

    constructor(ParentLayer, TaskObj, partner_is_present, returnfunc) {
        this.ParentLayer = ParentLayer;
        this.TaskObj = TaskObj;
        this.returnfunc = returnfunc;

        // Record the exact millisecond the task begins for elapsed time calculations
        this.task_start_time = Date.now();

        this.W = GenParam.SVG_width;
        this.H = GenParam.SVG_height;

        // 1. Data State
        this.BoxesToTest = shuffleArray([...this.TaskObj.toyboxes_asked]);
        this.AllToyOptions = this.TaskObj.toys_asked;
        this.CurrentBoxIndex = 0;
        this.ParticipantAnswers = [];

        this.bonus_stars = (typeof this.TaskObj.bonus_stars_per_correct_answer === "number")
            ? this.TaskObj.bonus_stars_per_correct_answer
            : 0;

        // 2. Partner State & Icons
        // FIX 1: Hardcode this to TRUE. The partner MUST be present for this specific task!
        this.is_partner_present = true;
        this.partnername = "your partner";
        this.BoxObjects = [];
        this.Icons = {};

        // Extract Partner gender/name
        let gender = "male"; // Fallback
        if (typeof WorldState !== "undefined" && WorldState.get_partner_icon_settings) {
            let settings = WorldState.get_partner_icon_settings();
            if (settings) {
                if (settings.name) this.partnername = settings.name;
                if (settings.gender) gender = settings.gender.toLowerCase();
            }
        }

        // FIX 2: Bulletproof custom icon fetcher using your exact DOM IDs
        let getIcon = (dir) => {
            let icon = null;

            // Try the WorldState method first just in case
            if (typeof WorldState !== "undefined" && WorldState.get_person_icon) {
                icon = WorldState.get_person_icon("partner", dir);
            }

            // If WorldState fails, manually query the exact DOM IDs you provided
            if (!icon) {
                let primaryId = `icon_player_${gender}_${dir}`;
                let fallbackId = `icon_partner_${gender}_${dir}`;

                icon = document.getElementById(primaryId) ||
                    document.getElementById(fallbackId) ||
                    document.getElementById(`icon_player_male_${dir}`); // Ultimate failsafe
            }

            return icon ? icon.cloneNode(true) : null;
        };

        this.Icons = {
            back: getIcon("back"),
            left: getIcon("left"),
            right: getIcon("right")
        };
    }

    // ----------------------------------------------------
    // VISUAL SETUP
    // ----------------------------------------------------
    // ----------------------------------------------------
    // VISUAL SETUP
    // ----------------------------------------------------
    async start_sequence() {
        this.ParentLayer.style.display = "inherit";

        if (typeof Interface !== "undefined") {
            if (Interface.player_moved_to_new_region) Interface.player_moved_to_new_region("Home");
            if (Interface.Locator && Interface.Locator.change_locator_name) Interface.Locator.change_locator_name("Warehouse");
            Interface.Prompt.hide();
        }

        this.ItemLayers = {
            Neg1: create_SVG_group(0, 0),
            Main: create_SVG_group(0, 0),
            Plus1: create_SVG_group(0, 0),
            Plus2: create_SVG_group(0, 0)
        };

        this.ParentLayer.appendChild(this.ItemLayers.Neg1);
        this.ParentLayer.appendChild(this.ItemLayers.Main);
        this.ParentLayer.appendChild(this.ItemLayers.Plus1);
        this.ParentLayer.appendChild(this.ItemLayers.Plus2);

        this.OpaqueBackdrop = create_SVG_rect(0, 0, this.W, this.H);
        this.OpaqueBackdrop.setAttribute('fill', 'white');
        this.ItemLayers.Neg1.appendChild(this.OpaqueBackdrop);

        this.Background = document.createElementNS("http://www.w3.org/2000/svg", 'image');
        this.Background.setAttribute("href", "./Locations/Home_warehouse.png");
        this.Background.setAttribute("width", "100%");
        this.Background.setAttribute("height", "100%");
        this.Background.setAttribute('preserveAspectRatio', 'none');
        this.Background.style.opacity = 0;
        this.Background.style.transition = "opacity 800ms ease-in-out";
        this.ItemLayers.Neg1.appendChild(this.Background);

        this.BackgroundMask = create_SVG_rect(0, 0, this.W, this.H);
        this.BackgroundMask.setAttribute('fill', GenParam.RegionData ? GenParam.RegionData["Home"].surrounding_color : '#f4f4f9');
        this.BackgroundMask.style.opacity = 0;
        this.BackgroundMask.style.mixBlendMode = "multiply";
        this.ItemLayers.Neg1.appendChild(this.BackgroundMask);

        window.getComputedStyle(this.Background).opacity;
        this.Background.style.opacity = 1;
        this.BackgroundMask.style.opacity = 0.3;

        await wait(600);

        this.draw_table();
        this.place_boxes_on_table();

        if (this.is_partner_present) {
            this.PartnerTranslateGroup = create_SVG_group(0, 0);
            this.ItemLayers.Plus2.appendChild(this.PartnerTranslateGroup);

            this.PartnerScaleGroup = create_SVG_group(0, 0);
            this.PartnerTranslateGroup.appendChild(this.PartnerScaleGroup);

            for (let dir in this.Icons) {
                if (this.Icons[dir]) {
                    let icon = this.Icons[dir];

                    icon.style.display = (dir === "back") ? "inherit" : "none";
                    icon.querySelectorAll('.prep_element_hidden').forEach(el => el.remove());

                    // Wipe the static SVG transform so CSS can smoothly animate it
                    icon.style.transform = "";
                    icon.removeAttribute("transform");

                    this.PartnerScaleGroup.appendChild(icon);
                }
            }

            // Start off-screen at full normal size (40)
            this.partner_x = 0.9 * this.W;
            this.partner_y = this.H + 300;
            this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;
            this.PartnerScaleGroup.style.transform = `scale(40)`;

            // Force the browser to register the starting coordinates
            window.getComputedStyle(this.PartnerTranslateGroup).transform;

            // Step 1: Step into the scene (Bottom Right)
            this.partner_y = 0.95 * this.H;
            this.PartnerTranslateGroup.style.transition = "transform 600ms ease-out";
            this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;

            await wait(800);

            // Step 2: Walk away from the camera (Shrink & Move Up to table depth)
            this.PartnerTranslateGroup.style.transition = "transform 1200ms ease-in-out";
            this.PartnerScaleGroup.style.transition = "transform 1200ms ease-in-out";

            this.partner_y = 0.65 * this.H; // Depth of the boxes on the table
            this.partner_x = 0.85 * this.W; // Shift slightly left to align with walking path

            this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;
            this.PartnerScaleGroup.style.transform = `scale(30)`; // Zoom out illusion

            await wait(1400); // Wait for the walk-away animation to complete
        } else {
            await wait(800); // Fallback wait if partner is missing
        }

        this.start_next_box_trial();
    }

    draw_table() {
        this.TableGroup = create_SVG_group(0, 0);
        this.ItemLayers.Neg1.appendChild(this.TableGroup);

        let table_w = 0.85 * this.W;
        let table_h = 70;
        let table_x = (this.W - table_w) / 2;
        let table_y = 0.58 * this.H;

        const leg_width = 30;
        const leg_height = 270;
        const leg_positions = [
            table_x + 0.05 * table_w,
            table_x + 0.95 * table_w - leg_width,
            table_x + 0.25 * table_w,
            table_x + 0.75 * table_w - leg_width
        ];

        leg_positions.forEach(lx => {
            let leg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            leg.setAttribute('x', lx);
            leg.setAttribute('y', table_y + 30);
            leg.setAttribute('width', leg_width);
            leg.setAttribute('height', leg_height);
            leg.setAttribute('fill', '#4E342E');
            this.TableGroup.appendChild(leg);
        });

        let top = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        top.setAttribute('x', table_x); top.setAttribute('y', table_y);
        top.setAttribute('width', table_w); top.setAttribute('height', table_h);
        top.setAttribute('rx', 15);
        top.setAttribute('fill', '#795548');
        this.TableGroup.appendChild(top);

        let lip = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        lip.setAttribute('x', table_x); lip.setAttribute('y', table_y + table_h - 10);
        lip.setAttribute('width', table_w); lip.setAttribute('height', 10);
        lip.setAttribute('fill', '#3E2723');
        this.TableGroup.appendChild(lip);
    }

    place_boxes_on_table() {
        let table_w = 0.85 * this.W;
        let table_x = (this.W - table_w) / 2;
        let table_y = 0.55 * this.H;
        let spacing = table_w / (this.BoxesToTest.length + 1);

        this.BoxesToTest.forEach((box_id, index) => {
            let target_x = table_x + (spacing * (index + 1));
            let target_y = table_y - 10;

            let BoxObj = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + box_id), this.ItemLayers.Main, target_x, target_y, 2.5);
            apply_toybox_decoration_visibility_to_element(BoxObj, box_id);
            let trash = Array.from(BoxObj.getElementsByClassName("alignment_field"));
            trash.forEach(t => t.remove());

            // FIX: Safely grab the transform string generated by your helper function!
            let baseTransform = BoxObj.style.transform || "";

            // Append translateY so it starts slightly higher in the air
            BoxObj.style.opacity = 0;
            BoxObj.style.transform = baseTransform + " translateY(-50px)";

            // Force the browser to register this start frame
            window.getComputedStyle(BoxObj).transform;

            setTimeout(() => {
                BoxObj.style.transition = "all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)";
                BoxObj.style.opacity = 1;
                // Return exactly to the helper's transform (which drops it down onto the table)
                BoxObj.style.transform = baseTransform;
            }, index * 150 + 20);

            this.BoxObjects.push({ id: box_id, element: BoxObj, cx: target_x });
        });
    }

    make_toy_static(SVG_Elem, toy_id) {
        ToyChoiceBar.make_toy_static(SVG_Elem, toy_id);
    }

    set_partner_direction(dir) {
        for (let key in this.Icons) {
            if (this.Icons[key]) this.Icons[key].style.display = (key === dir) ? "inherit" : "none";
        }
    }

    show_question_bubble() {
        if (!this.is_partner_present) return;

        this.QuestionBubbleGroup = create_SVG_group(0, 0);
        this.PartnerTranslateGroup.appendChild(this.QuestionBubbleGroup);

        let dot1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot1.setAttribute('cx', '-25'); dot1.setAttribute('cy', '30'); dot1.setAttribute('r', '12');
        dot1.setAttribute('fill', 'rgba(255, 255, 255, 0.85)'); dot1.setAttribute('stroke', '#ccc'); dot1.setAttribute('stroke-width', '2');

        let dot2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot2.setAttribute('cx', '5'); dot2.setAttribute('cy', '-5'); dot2.setAttribute('r', '18');
        dot2.setAttribute('fill', 'rgba(255, 255, 255, 0.85)'); dot2.setAttribute('stroke', '#ccc'); dot2.setAttribute('stroke-width', '2');

        let bubble = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        bubble.setAttribute('cx', '50'); bubble.setAttribute('cy', '-70');
        bubble.setAttribute('rx', '70'); bubble.setAttribute('ry', '55');
        bubble.setAttribute('fill', 'rgba(255, 255, 255, 0.85)');
        bubble.setAttribute('stroke', '#ccc'); bubble.setAttribute('stroke-width', '4');

        let text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '50'); text.setAttribute('y', '-35');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-size', '95');
        text.setAttribute('fill', 'gold');
        text.setAttribute('stroke', '#b8860b');
        text.setAttribute('stroke-width', '2');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = '?';

        this.QuestionBubbleGroup.appendChild(dot1);
        this.QuestionBubbleGroup.appendChild(dot2);
        this.QuestionBubbleGroup.appendChild(bubble);
        this.QuestionBubbleGroup.appendChild(text);

        this.QuestionBubbleGroup.style.transformOrigin = "0px 40px";
        this.QuestionBubbleGroup.style.transform = "translate(50px, -300px) scale(0)";
        this.QuestionBubbleGroup.style.transition = "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)";

        window.getComputedStyle(this.QuestionBubbleGroup).transform;
        this.QuestionBubbleGroup.style.transform = "translate(50px, -300px) scale(1.6)";

        this.bubble_float_interval = setInterval(() => {
            if (!this.QuestionBubbleGroup) return;
            this.QuestionBubbleGroup.style.transition = "transform 1000ms ease-in-out";
            this.QuestionBubbleGroup.style.transform = "translate(50px, -315px) scale(1.6)";
            setTimeout(() => {
                if (!this.QuestionBubbleGroup) return;
                this.QuestionBubbleGroup.style.transform = "translate(50px, -285px) scale(1.6)";
            }, 1000);
        }, 2000);
    }

    hide_question_bubble() {
        if (this.bubble_float_interval) clearInterval(this.bubble_float_interval);
        if (this.QuestionBubbleGroup) {
            this.QuestionBubbleGroup.style.transition = "all 200ms ease-in";
            this.QuestionBubbleGroup.style.transform = "translate(50px, -280px) scale(0)";
            this.QuestionBubbleGroup.style.opacity = 0;
            setTimeout(() => {
                if (this.QuestionBubbleGroup) this.QuestionBubbleGroup.remove();
                this.QuestionBubbleGroup = null;
            }, 200);
        }
    }

    // ----------------------------------------------------
    // THE CORE MEASUREMENT LOOP
    // ----------------------------------------------------
    async start_next_box_trial() {
        if (this.CurrentBoxIndex >= this.BoxesToTest.length) {
            return this.finish_task();
        }

        let current_box_data = this.BoxObjects[this.CurrentBoxIndex];
        let printed_box_name = GenParam.get_box_printed_name(current_box_data.id);

        if (this.is_partner_present) {
            if (this.CurrentBoxIndex === 0) {
                this.set_partner_direction("back");
                this.partner_y = 0.55 * this.H;
                this.PartnerTranslateGroup.style.transition = "transform 800ms ease-out";
                this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;

                // THE FIX: Maintain our perspective scale instead of shrinking to 0.85!
                this.PartnerScaleGroup.style.transition = "transform 800ms ease-out";
                this.PartnerScaleGroup.style.transform = "scale(24)";

                await wait(800);
            }

            let targetX = current_box_data.cx - 200;
            let move_dir = (targetX < this.partner_x) ? "left" : "right";
            this.set_partner_direction(move_dir);

            this.partner_x = targetX;
            this.PartnerTranslateGroup.style.transition = "transform 1000ms ease-in-out";
            this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;

            await wait(1000);

            let look_dir = (current_box_data.cx < this.partner_x) ? "left" : "right";
            this.set_partner_direction(look_dir);

            this.show_question_bubble();
            AudioCont.play_sound_effect("alert_minor");
        }

        current_box_data.element.style.transition = "filter 300ms ease-in-out";
        current_box_data.element.style.filter = "drop-shadow(0px 0px 15px gold) brightness(1.1)";

        Interface.Prompt.show_message(`What does ${this.partnername} believe is in the ${printed_box_name}?`);
        await wait(400);

        this.show_toy_selection_grid();
    }

    show_toy_selection_grid() {
        this.choiceBar = new ToyChoiceBar(
            this.ItemLayers.Plus2,
            this.W,
            this.H,
            { bonus_stars: this.bonus_stars }
        );
        this.choiceBar.show(this.AllToyOptions, (toy_id) => this.on_toy_selected(toy_id));
        this.UIGroup = this.choiceBar.UIGroup;
    }

    on_toy_selected(selected_toy_id) {
        let current_box_data = this.BoxObjects[this.CurrentBoxIndex];
        let actual_belief = WorldState.get_partner_belief_in_box_contents(current_box_data.id);
        let is_correct = (selected_toy_id === actual_belief);

        // --- NEW: Find Associated Fennimals ---
        // Look through the global Fennimal templates to see which ones own this box
        let associated_fennimals = [];
        if (typeof topController !== "undefined" && topController.dataCont && topController.dataCont.experimentData) {
            let templates = topController.dataCont.experimentData.fennimals;
            associated_fennimals = templates.filter(f => f.toybox === current_box_data.id).map(f => f.id);
        }

        let answer_data = {
            type: "partner_belief_multiple_box",
            box: current_box_data.id,
            associated_fennimals: associated_fennimals, // <-- ADDED THIS FOR EASY REFERENCE
            selected_toy: selected_toy_id,
            partner_actual_belief: actual_belief,
            correct: is_correct,
            time: Date.now() - this.task_start_time
        };

        if (this.bonus_stars > 0) {
            answer_data.stars_earned = is_correct ? this.bonus_stars : 0;
        }

        this.ParticipantAnswers.push(answer_data);

        this.hide_question_bubble();
        this.UIGroup.style.transition = "all 200ms ease-in";
        this.UIGroup.style.opacity = 0;
        this.UIGroup.style.transform = "scale(0.9)";
        setTimeout(() => this.UIGroup.remove(), 200);
        Interface.Prompt.hide();

        current_box_data.element.style.filter = "none";
        this.CurrentBoxIndex++;

        setTimeout(() => this.start_next_box_trial(), 600);
    }
    async finish_task() {
        this.TaskObj.PartnerBeliefAnswers = this.ParticipantAnswers;

        // STEP 1: The partner leaves the scene first
        if (this.is_partner_present) {
            // Make sure they are facing the direction they are walking!
            this.set_partner_direction("right");

            // Smooth 1.5-second walk off the screen
            this.PartnerTranslateGroup.style.transition = "transform 1500ms ease-in, opacity 500ms ease-in 1000ms";

            // Safely append a massive horizontal shift
            let currentTransform = this.PartnerTranslateGroup.style.transform;
            this.PartnerTranslateGroup.style.transform = currentTransform + " translateX(1500px)";
            this.PartnerTranslateGroup.style.opacity = 0;

            // Wait for the partner to completely leave the screen before fading the warehouse
            await wait(1500);
        }

        // STEP 2: Fade out the warehouse, table, and boxes
        this.OpaqueBackdrop.style.transition = "opacity 400ms ease-in";
        this.OpaqueBackdrop.style.opacity = 0;

        this.Background.style.transition = "opacity 400ms ease-in";
        this.Background.style.opacity = 0;

        if (this.BackgroundMask) {
            this.BackgroundMask.style.transition = "opacity 400ms ease-in";
            this.BackgroundMask.style.opacity = 0;
        }

        this.TableGroup.style.transition = "opacity 400ms ease-in";
        this.TableGroup.style.opacity = 0;

        this.BoxObjects.forEach(b => {
            b.element.style.transition = "opacity 400ms ease-in";
            b.element.style.opacity = 0;
        });

        // Wait for the environmental fade-out to finish
        await wait(500);

        // Return control to the top controller
        this.returnfunc();
    }

    clean_up() {
        if (this.bubble_float_interval) clearInterval(this.bubble_float_interval);
        this.ItemLayers.Neg1.remove();
        this.ItemLayers.Main.remove();
        this.ItemLayers.Plus1.remove();
        this.ItemLayers.Plus2.remove();
        if (this.ParentLayer) this.ParentLayer.style.display = "none";
    }
}

// DEPRECATED: temporary alias for PartnerBeliefMultipleController.
// Remove during a future spring-cleaning pass once all callers use the new name / partner_belief_multiple phase type.
const PartnerBeliefTaskController = PartnerBeliefMultipleController;
