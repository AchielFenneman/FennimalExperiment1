class SmallFeedbackSymbol {
    constructor(Parent, feedback_type, speed, start_x, start_y, end_x, end_y) {
        let ScaleGroup = create_SVG_group(0, 0);
        let TranslationGroup = create_SVG_group(0, 0);
        let Elem;

        switch(feedback_type) {
            case "heart":
                Elem = document.getElementById("feedback_heart_small").cloneNode(true);
                Elem.style.fill = "pink";
                break;
            case "bored":
                Elem = document.getElementById("feedback_bored").cloneNode(true);
                Elem.style.fill = "dimgray";
                Elem.style.stroke = "none";
                break;
        }

        if (!Elem) return;

        ScaleGroup.appendChild(Elem);
        TranslationGroup.appendChild(ScaleGroup);

        // Keep it behind the toy
        Parent.insertBefore(TranslationGroup, Parent.firstChild);

        Elem.style.display = "inherit";

        let randomized_start_x = start_x + (Math.random() * 100 - 50);
        let randomized_start_y = start_y + (Math.random() * 100 - 50);

        moveSVGCenterTo(Elem, randomized_start_x, randomized_start_y);

        ScaleGroup.style.transformOrigin = "center";
        ScaleGroup.style.transformBox = "fill-box";

        // TWEAK 1: Start bigger so they are immediately noticeable
        ScaleGroup.style.transform = "scale(1.5)";
        Elem.style.opacity = 0;

        setTimeout(() => {
            TranslationGroup.style.transition = `all ${speed}ms ease-out`;
            moveSVGCenterTo(TranslationGroup, end_x, end_y);

            Elem.style.transition = `all ${speed}ms ease-out`;

            // TWEAK 2: Push opacity almost to maximum
            Elem.style.opacity = 0.95;

            switch(feedback_type) {
                case "heart": Elem.style.fill = "#FF3333"; break; // A bolder, brighter red!
                case "bored": Elem.style.opacity = 0.7; break;
            }

            ScaleGroup.style.transition = `all ${speed}ms ease-out`;

            // TWEAK 3: Massive peak scale to frame the animation beautifully
            ScaleGroup.style.transform = "scale(4.5)";
        }, 20);

        let lifespan = randomIntFromInterval(speed * 0.5, speed);

        setTimeout(() => {
            Elem.style.transition = "all 400ms ease-in";
            Elem.style.opacity = 0;

            ScaleGroup.style.transition = "all 400ms ease-in";
            ScaleGroup.style.transform = "scale(0)";

            setTimeout(() => {
                TranslationGroup.remove();
            }, 450);

        }, lifespan);
    }
}

function create_beautiful_bubble(ParentLayer, start_x, start_y, radius, insert_before_node = null) {
    let group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add("soap-bubble");

    // 1. The Base Film (Tinted core with a bright outline)
    let base = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    base.setAttribute('r', radius);
    base.setAttribute('fill', 'rgba(150, 255, 255, 0.15)'); // Faint cyan/blue tint
    base.setAttribute('stroke', 'rgba(255, 255, 255, 0.8)');
    base.setAttribute('stroke-width', Math.max(2, radius * 0.05));

    // 2. The Crescent Glare (A stretched ellipse rotated along the edge)
    let glare = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    glare.setAttribute('cx', 0);
    glare.setAttribute('cy', -radius * 0.65); // Push it up to the top edge
    glare.setAttribute('rx', radius * 0.45);  // Stretch it wide
    glare.setAttribute('ry', radius * 0.15);  // Keep it thin
    glare.setAttribute('fill', 'rgba(255, 255, 255, 0.9)');
    glare.setAttribute('transform', 'rotate(35)'); // Rotate it around the center so it slides along the curve!

    // 3. The Bounce Light (Small reflection on the opposite side)
    let bounce = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bounce.setAttribute('cx', -radius * 0.5);
    bounce.setAttribute('cy', radius * 0.5);
    bounce.setAttribute('r', radius * 0.12);
    bounce.setAttribute('fill', 'rgba(255, 255, 255, 0.4)');

    group.appendChild(base);
    group.appendChild(glare);
    group.appendChild(bounce);

    // Initial positioning state
    group.style.transform = `translate(${start_x}px, ${start_y}px) scale(0)`;
    group.style.transformOrigin = "center";
    group.style.transformBox = "fill-box";

    // Layering
    if (insert_before_node) {
        ParentLayer.insertBefore(group, insert_before_node);
    } else {
        ParentLayer.appendChild(group);
    }

    return group;
}

class BasicElementsModule {
    ItemLayers = {};
    TargetPoints = {};
    BackgroundMask;
    Fennimal;
    W = GenParam.SVG_width;
    H = GenParam.SVG_height;

    // ----------------------------------------------------
    // Centralized Animation Profiles for all Bodies!
    // ----------------------------------------------------
    BodyProfiles = {
        "beaver":   { speed: 650, squish: 0.04,  bobY: -8.0, shivers: true,  sway: 0 },
        "longneck": { speed: 1200, squish: 0.002, bobY: -1.0, shivers: false, sway: 1.5 },
        "village":  { speed: 350, squish: 0.05,  bobY: -4.0, shivers: false, sway: 0 },
        "scaley":   { speed: 900, squish: 0.004, bobY: -1.0, shivers: false, sway: 0 },
        "climber":  { speed: 850, squish: 0.02,  bobY: -3.5, shivers: false, sway: 1.2 },
        "mushroom": { speed: 1100, squish: 0.06, bobY: -12.0, shivers: false, sway: 0 },
        "turtle":   { speed: 1800, squish: 0.005, bobY: -1.0, shivers: false, sway: 2.5 },
        "cow": { speed: 850, squish: 0.015, bobY: -4.5, shivers: false, sway: 0 },

        "default":  { speed: 475, squish: 0.015, bobY: -2.5, shivers: false, sway: 0 }
    };

    constructor(FenObj) {
        this.FenObj = FenObj;
        this.ParentLayer = document.getElementById("Fennimals_Layer");
        this.ParentLayer.style.display = "inherit"
    }

    create_svg_sublayers() {
        let ItemLayer = create_SVG_group(0,0,undefined,"ItemLayer");
        let ItemLayer_depth_minus_one = create_SVG_group(0,0,undefined,"ItemLayer_neg1");
        let ItemLayer_main = create_SVG_group(0,0,undefined,"ItemLayer_main");
        let ItemLayer_depth_plus_one = create_SVG_group(0,0,undefined,"ItemLayer_plus1");
        let ItemLayer_depth_plus_two = create_SVG_group(0,0,undefined,"ItemLayer_plus2");
        let ItemLayer_partner = create_SVG_group(0,0,undefined,"ItemLayer_partner");
        let ItemLayer_questions = create_SVG_group(0,0,undefined,"ItemLayer_questions");
        let BackgroundLayer = create_SVG_group(0,0, undefined,"BackgroundLayer");
        let FennimalLayer = create_SVG_group(0,0,undefined,"FennimalLayer");

        ItemLayer.appendChild(ItemLayer_depth_minus_one);
        ItemLayer.appendChild(ItemLayer_main);
        ItemLayer.appendChild(ItemLayer_depth_plus_one);
        ItemLayer.appendChild(ItemLayer_depth_plus_two);
        ItemLayer.appendChild(ItemLayer_partner);
        ItemLayer.appendChild(ItemLayer_questions);

        this.ParentLayer.appendChild(BackgroundLayer);
        this.ParentLayer.appendChild(FennimalLayer);
        this.ParentLayer.appendChild(ItemLayer);

        // Keep refs so clean_up can remove the whole scene tree (not just mask + fennimal).
        this.BackgroundLayer = BackgroundLayer;
        this.FennimalLayer = FennimalLayer;
        this.ItemLayers = {
            Layer: ItemLayer,
            Neg1: ItemLayer_depth_minus_one,
            Main: ItemLayer_main,
            Plus1: ItemLayer_depth_plus_one,
            Plus2: ItemLayer_depth_plus_two,
            Partner: ItemLayer_partner,
            Questions: ItemLayer_questions
        };
    }

    create_background_mask(already_fade_in, fade_in_time) {
        return new Promise(resolve => {
            this.BackgroundMask = create_SVG_rect(0,0,this.W,this.H);
            this.BackgroundMask.id = "task_background_mask";
            this.BackgroundMask.style.fill = "white";
            this.ItemLayers.Neg1.appendChild(this.BackgroundMask);
            this.BackgroundMask.style.opacity = 0;

            let returntime = 0;
            if (already_fade_in) {
                this.BackgroundMask.style.transition = "all " + fade_in_time + "ms ease-in-out";
                window.getComputedStyle(this.BackgroundMask).opacity;
                this.BackgroundMask.style.opacity = 0.8;
                returntime = fade_in_time;
            }
            setTimeout(() => resolve(), returntime);
        });
    }

    create_and_appear_Fennimal(Parent, center_x, base_y, scale, fade_in_time) {
        return new Promise(resolve => {
            this.Fennimal = create_Fennimal_SVG_object(this.FenObj, GenParam.Fennimal_head_size, false);
            this.Fennimal.id = "task_Fennimal";
            this.Fennimal.style.opacity = 0;
            Parent.appendChild(this.Fennimal);

            let ScaleGroup = this.Fennimal.getElementsByClassName("Fennimal_scale_group")[0];
            ScaleGroup.style.transform = "scale(" + scale + ")";

            // Save the scale to the class so the render loop can use it!
            this.baseScale = scale;
            this.FennimalScaleGroup = this.Fennimal.getElementsByClassName("Fennimal_scale_group")[0];
            this.FennimalScaleGroup.style.transform = "scale(" + this.baseScale + ")";

            // NEW: Make sure the entire paper doll pivots from the feet!
            this.FennimalScaleGroup.style.transformOrigin = "50% 100%";
            this.FennimalScaleGroup.style.transformBox = "fill-box";

            let BBox = this.Fennimal.getBBox();
            let delta_x = (center_x) - (BBox.x + 0.5 * BBox.width);
            let delta_y = (base_y)- (BBox.y + BBox.height);
            this.Fennimal.style.transform = "translate(" + delta_x + "px, " + delta_y + "px)";
            window.getComputedStyle(this.Fennimal).opacity;

            this.Fennimal.style.transition = "all " + fade_in_time + "ms ease-in-out";
            this.Fennimal.style.opacity = 1;

            this.TargetPoints.Fennimal_body_center = this.Fennimal.getElementsByClassName("Fennimal_body_center_point")[0];
            this.TargetPoints.Fennimal_mouth = this.Fennimal.getElementsByClassName("Fennimal_head_mouth_point")[0];

            // ----------------------------------------------------
            // NEW: Grab the paper-doll layers and set their origins
            // ----------------------------------------------------
            this.FennimalHead = this.Fennimal.getElementsByClassName("Fennimal_head")[0];
            this.FennimalBody = this.Fennimal.getElementsByClassName("Fennimal_body")[0];
            this.FennimalEyes = Array.from(this.Fennimal.querySelectorAll(".eye_gaze"));

            // Ensure the gaze groups scale from their own center points!
            this.FennimalEyes.forEach(eye => {
                eye.style.transformOrigin = "center";
                eye.style.transformBox = "fill-box";
            });

            if (this.FennimalBody) {
                this.FennimalBody.style.transformOrigin = "50% 100%";
                this.FennimalBody.style.transformBox = "fill-box";
            }


            // Kick off the life support system!
            this.setup_character_animation();

            setTimeout(() => resolve(), fade_in_time);
        });
    }

    set_gaze_target(element) {
        this.gaze_target_element = element;
    }

    clear_gaze_target() {
        this.gaze_target_element = null;
    }

    /**
     * Stop breathing / gaze / sway and all body CSS flair (snow, spores, heat, tails, …).
     * Used when the Fennimal should appear frozen (e.g. in a photo).
     */
    freeze_character_pose() {
        // Flag first so an in-flight RAF callback cannot re-schedule the loop.
        this.character_animation_frozen = true;

        if (this.animation_frame_id) {
            cancelAnimationFrame(this.animation_frame_id);
            this.animation_frame_id = null;
        }
        if (this.gaze_tracker) {
            window.removeEventListener("pointermove", this.gaze_tracker);
            this.gaze_tracker = null;
        }

        this.targetGazeX = 0;
        this.targetGazeY = 0;
        this.currentGazeX = 0;
        this.currentGazeY = 0;
        this.gaze_target_element = null;

        if (this.FennimalScaleGroup) {
            this.FennimalScaleGroup.style.transform = `scale(${this.baseScale != null ? this.baseScale : 1})`;
        }
        if (this.FennimalBody) {
            this.FennimalBody.style.transform = "translate(0px, 0px) scale(1, 1)";
        }
        if (this.FennimalHead) {
            this.FennimalHead.style.transform = "translate(0px, 0px) rotate(0deg)";
        }
        if (this.FennimalEyes) {
            this.FennimalEyes.forEach((eye) => {
                eye.style.transform = "translate(0px, 0px) scale(1.15)";
            });
        }

        if (this.Fennimal) {
            freeze_fennimal_decorative_animations(this.Fennimal);
        }
    }

    setup_character_animation() {
        this.character_animation_frozen = false;
        this.is_slumped = false;
        this.gaze_target_element = null; // Add this variable

        this.targetGazeX = 0;
        this.targetGazeY = 0;
        this.currentGazeX = 0;
        this.currentGazeY = 0;
        this.targetEyeScale = 1.15;  // Default: 15% larger than original drawing
        this.currentEyeScale = 1.15;

        this.gaze_tracker = (e) => {
            // FIX: If slumped OR if we are tracking an object, ignore the mouse!
            if (this.is_slumped || !this.FennimalHead || this.gaze_target_element) return;

            let headRect = this.FennimalHead.getBoundingClientRect();
            let headCenterX = headRect.x + (headRect.width / 2);
            let headCenterY = headRect.y + (headRect.height / 2);

            let dx = e.clientX - headCenterX;
            let dy = e.clientY - headCenterY;

            this.targetGazeX = Math.max(-6, Math.min(6, dx * 0.015));
            this.targetGazeY = Math.max(-4, Math.min(4, dy * 0.015));
        };

        window.addEventListener('pointermove', this.gaze_tracker);

        this.animation_start_time = performance.now();
        this.animation_frame_id = requestAnimationFrame((t) => this.render_character_frame(t));
    }

    render_character_frame(timestamp) {
        if (this.character_animation_frozen) return;
        if (!this.FennimalHead || !this.FennimalBody) return;

        // Determine how dilated the eyes should be!
        if (this.is_slumped) {
            this.targetEyeScale = 0.95; // Eyes shrink slightly when sad/slumped
        } else if (this.gaze_target_element) {
            this.targetEyeScale = 1.35; // Eyes dilate heavily when focusing on the toy!
        } else {
            this.targetEyeScale = 1.15; // Normal, slightly enlarged idle state
        }

        // ----------------------------------------------------
        // FIX: Bulletproof SVG Matrix Math for Object Tracking
        // ----------------------------------------------------
        if (this.gaze_target_element && !this.is_slumped) {
            try {
                let pt = GenParam.SVGObject.createSVGPoint();

                // Get perfect screen coordinates of the Head
                let headBBox = this.FennimalHead.getBBox();
                pt.x = headBBox.x + (headBBox.width / 2);
                pt.y = headBBox.y + (headBBox.height / 2);
                let screenHead = pt.matrixTransform(this.FennimalHead.getScreenCTM());

                // Get perfect screen coordinates of the Target Box/Object
                let targetBBox = this.gaze_target_element.getBBox();
                pt.x = targetBBox.x + (targetBBox.width / 2);
                pt.y = targetBBox.y + (targetBBox.height / 2);
                let screenTarget = pt.matrixTransform(this.gaze_target_element.getScreenCTM());

                let dx = screenTarget.x - screenHead.x;
                let dy = screenTarget.y - screenHead.y;

                // Same exact parallax constraints so the eyes don't pop out
                this.targetGazeX = Math.max(-6, Math.min(6, dx * 0.015));
                this.targetGazeY = Math.max(-4, Math.min(4, dy * 0.015));
            } catch(e) {
                // Failsafe in case the object is mid-transition or detached
            }
        }

        // 1. Smoothly interpolate current gaze toward the target gaze
        this.currentGazeX += (this.targetGazeX - this.currentGazeX) * 0.1;
        this.currentGazeY += (this.targetGazeY - this.currentGazeY) * 0.1;
        this.currentEyeScale += (this.targetEyeScale - this.currentEyeScale) * 0.1;

        let elapsed = timestamp - this.animation_start_time;

        // Force lowercase to prevent "Beaver" vs "beaver" mismatches!
        let bodyType = this.FenObj.body ? String(this.FenObj.body).toLowerCase() : "default";
        let profile = this.BodyProfiles[bodyType] || this.BodyProfiles["default"];

        let breathCycle = Math.sin(elapsed / profile.speed);

        //Animations for a cold shiver (beaver)
        let shiverX = 0;
        if (profile.shivers) {
            let shiverCycle = elapsed % 5000;
            if (shiverCycle > 4500) {
                shiverX = (Math.floor(shiverCycle / 30) % 2 === 0) ? 1 : -1;
            }
        }

        // Calculate the sway
        let swayRot = profile.sway ? (Math.sin(elapsed / profile.speed) * profile.sway) : 0;

        let bodySquish = this.is_slumped ? 0.90 : 1 + (breathCycle * profile.squish);
        let headBobY = this.is_slumped ? 12 : (breathCycle * profile.bobY);
        let headRot = this.is_slumped ? 10 : (this.currentGazeX * 0.75);

        // 1. Unify the Sway: Rotate the entire character!
        this.FennimalScaleGroup.style.transform = `scale(${this.baseScale}) rotate(${swayRot}deg)`;

        // 2. The body just squishes and shivers
        this.FennimalBody.style.transform = `translate(${shiverX}px, 0px) scale(1, ${bodySquish})`;

        // 3. The head and eyes gaze and bob (and are safely carried by the sway!)
        this.FennimalHead.style.transform = `translate(${this.currentGazeX + shiverX}px, ${this.currentGazeY + headBobY}px) rotate(${headRot}deg)`;

        this.FennimalEyes.forEach(eye => {
            eye.style.transform = `translate(${(this.currentGazeX * 1.2) + shiverX}px, ${(this.currentGazeY * 1.2)}px) scale(${this.currentEyeScale})`;
        });

        if (this.character_animation_frozen) return;
        this.animation_frame_id = requestAnimationFrame((t) => this.render_character_frame(t));
    }

    trigger_comfort_checkin() {
        return new Promise(resolve => {
            // Drop into sad posture and look at the floor
            this.is_slumped = true;
            this.targetGazeX = 0;
            this.targetGazeY = 5;
            this.Fennimal.classList.add("is-slumped");
            AudioCont.play_sound_effect("sad");

            // ----------------------------------------------------
            // 1. Setup the Thundercloud Cluster
            // ----------------------------------------------------
            let cloudStart = getSVGInternalCenter(this.TargetPoints.Fennimal_mouth);

            this.CloudGroup = create_SVG_group(0, 0);

            // LIFT FIX: Pushed way up from -180 to -320 to accommodate the 4x scale
            this.CloudGroup.style.transform = `translate(${cloudStart.x}px, ${cloudStart.y - 320}px)`;
            this.Fennimal.parentNode.appendChild(this.CloudGroup);

            // SCALE & SPACING FIX:
            // - Scales multiplied by ~4
            // - dx and dy expanded so the giant clouds don't completely overlap
            const cloudConfigs = [
                { dx: 0, dy: -100, scale: 4.3, delay: 0 },
                { dx: -230, dy: -40, scale: 3.2, delay: -400 },
                { dx: 230, dy: -50, scale: 3.6, delay: -800 }
            ];

            cloudConfigs.forEach(config => {
                let cloud = document.getElementsByClassName("raincloud")[0].cloneNode(true);
                cloud.style.display = "inherit";

                // TRANSPARENCY FIX: 85% opacity gives it a nice atmospheric look
                cloud.style.opacity = "0.7";

                cloud.style.transformOrigin = "center";
                cloud.style.transformBox = "fill-box";
                cloud.style.transform = `translate(${config.dx}px, ${config.dy}px) scale(0)`;

                this.CloudGroup.appendChild(cloud);

                // Pop into existence
                setTimeout(() => {
                    cloud.style.transition = "transform 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)";
                    cloud.style.transform = `translate(${config.dx}px, ${config.dy}px) scale(${config.scale})`;
                }, 10);

                let targets = Array.from(cloud.querySelectorAll('path, rect, circle, ellipse, polygon'));
                if (cloud.tagName.toLowerCase() !== 'g') targets.push(cloud);

                targets.forEach(t => {
                    t.animate([
                        { fill: '#5a6b7c' }, // Slate gray
                        { fill: '#3d4a57' }, // Dark thunder blue
                        { fill: '#738699' }, // Lighter gray
                        { fill: '#4a5a6a' }  // Base storm
                    ], {
                        duration: 1500 + Math.random() * 500,
                        iterations: Infinity,
                        direction: 'alternate',
                        delay: config.delay
                    });
                });

                // Drift distance slightly increased to match the new massive scale
                cloud.animate([
                    { transform: `translate(${config.dx}px, ${config.dy}px) scale(${config.scale})` },
                    { transform: `translate(${config.dx}px, ${config.dy - 20}px) scale(${config.scale})` }
                ], {
                    duration: 1200 + Math.random() * 300,
                    iterations: Infinity,
                    direction: 'alternate',
                    easing: 'ease-in-out',
                    delay: config.delay
                });
            });

            // ----------------------------------------------------
            // 2. The Comfort Interaction
            // ----------------------------------------------------
            this.Fennimal.style.cursor = "pointer";
            this.Fennimal.style.filter = "drop-shadow(0px 0px 8px rgba(255, 255, 255, 0.5))";

            this.Fennimal.onpointerdown = () => {
                this.Fennimal.onpointerdown = null;
                this.Fennimal.style.cursor = "auto";
                this.Fennimal.style.filter = "none";
                this.Fennimal.classList.remove("is-slumped");

                // Clear the clouds
                if (this.CloudGroup) {
                    this.CloudGroup.style.transition = "all 400ms ease-in";
                    this.CloudGroup.style.transform += " translateY(-50px) scale(0)";
                    this.CloudGroup.style.opacity = 0;
                    setTimeout(() => this.CloudGroup.remove(), 400);
                }

                this.is_slumped = false;
                AudioCont.play_sound_effect("positive");

                this.Fennimal_jump(60).then(() => {
                    for(let i=0; i<3; i++) {
                        setTimeout(() => {
                            let hStart = getSVGInternalCenter(this.TargetPoints.Fennimal_mouth);
                            this.spawn_happy_heart(hStart.x, hStart.y - 40, this.Fennimal.parentNode);
                        }, i * 150);
                    }
                    setTimeout(() => resolve(), 600);
                });
            };
        });
    }

    // A lightweight, standalone method to generate pure SVG hearts
    spawn_happy_heart(x, y, ParentLayer) {
        let heart = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Crisp, perfect mathematical heart path
        heart.setAttribute('d', 'M0,10 C-15,-10 -35,5 -20,25 L0,50 L20,25 C35,5 15,-10 0,10 Z');
        heart.setAttribute('fill', '#FF4B4B');

        // NEW: Add transparency to match the cartoon, soft-sticker vibe of the clouds
        heart.setAttribute('opacity', '0.85');

        heart.style.transformOrigin = "center";
        heart.style.transformBox = "fill-box";
        heart.style.transform = `translate(${x}px, ${y}px) scale(0)`;
        ParentLayer.appendChild(heart);

        // EXPANDED SPREAD: Pushed out wider and higher to account for the massive scale
        let endX = x + (Math.random() - 0.5) * 240;
        let endY = y - 120 - Math.random() * 80;
        let rot = (Math.random() - 0.5) * 45;

        // MASSIVE SCALE: Base size of 4, with a tiny bit of random variance (3.5 to 4.5)
        let finalScale = 3.5 + Math.random();

        // 1. Pop out massive
        setTimeout(() => {
            heart.style.transition = "transform 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)";
            heart.style.transform = `translate(${endX}px, ${endY}px) scale(${finalScale}) rotate(${rot}deg)`;
        }, 10);

        // 2. Drift up and fade out
        setTimeout(() => {
            heart.style.transition = "all 400ms ease-in";
            // Drift a bit further up and shrink down by half as it fades
            heart.style.transform = `translate(${endX}px, ${endY - 50}px) scale(${finalScale / 2}) rotate(${rot}deg)`;
            heart.style.opacity = 0;

            setTimeout(() => heart.remove(), 400);
        }, 600);
    }

    Fennimal_move_relative(dx, dy, time) {
        return new Promise(resolve => {
            this.Fennimal.style.transition = "all " + time + "ms ease-in-out";
            this.Fennimal.style.transform += "translate(" + dx + "px, " + dy + "px)";
            setTimeout(() => resolve(), time);
        });
    }

    Fennimal_jump(amount, timing = {}) {
        const ms = timing.ms != null ? timing.ms : 200;
        const resolveMs = timing.resolveMs != null ? timing.resolveMs : 500;

        return new Promise(resolve => {
            let prejump_transform = this.Fennimal.style.transform;
            AudioCont.play_sound_effect("jump");
            this.Fennimal.style.transition = `all ${ms}ms ease-out`;
            this.Fennimal.style.transform += "translateY(-" + amount + "px)";

            setTimeout(() => { this.Fennimal.style.transform = prejump_transform }, ms);
            setTimeout(() => resolve(), resolveMs);
        });
    }

    async perform_success_celebration(TargetBoxElement = null, { extended = false } = {}) {
        // Optional walk-to-target (used by box interactions). Skip when celebrating in place.
        if (TargetBoxElement) {
            let boxCenter = getSVGInternalCenter(TargetBoxElement);
            let fenCenter = getSVGInternalCenter(this.Fennimal);

            let targetX = boxCenter.x;
            let dx = targetX - fenCenter.x;

            await this.Fennimal_move_relative(dx, 0, 350);
            await wait(100);

            this.set_gaze_target(TargetBoxElement);
        }

        // Default: two short jumps (jump SFX) with a heart burst between them.
        const shortJump = { ms: 160, resolveMs: 340 };

        await this.Fennimal_jump(104, shortJump);
        let currentFenCenter = getSVGInternalCenter(this.Fennimal);
        const heartCount = extended ? 12 : 8;
        for (let i = 0; i < heartCount; i++) {
            setTimeout(() => {
                this.spawn_happy_heart(
                    currentFenCenter.x + (Math.random() - 0.5) * 140,
                    currentFenCenter.y - 80 - Math.random() * 60,
                    this.ItemLayers.Plus2
                );
            }, i * 35);
        }
        await this.Fennimal_jump(84, shortJump);

        if (!extended) {
            this.clear_gaze_target();
            return;
        }

        // Reserved for special multi-step trials: longer dance + particle bursts.
        AudioCont.play_sound_effect("positive");
        const jump_with_particle_burst = async (jump_height) => {
            let center = getSVGInternalCenter(this.Fennimal);
            if (typeof SmallFeedbackSymbol !== "undefined") {
                for (let p = 0; p < 5; p++) {
                    let randomOffsetX = (Math.random() - 0.5) * 160;
                    let randomOffsetY = (Math.random() - 0.5) * 80;
                    let symbol = Math.random() > 0.5 ? "heart" : "star";
                    new SmallFeedbackSymbol(
                        this.ItemLayers.Plus2,
                        symbol,
                        900,
                        center.x + randomOffsetX, center.y - 150 + randomOffsetY,
                        center.x + randomOffsetX, center.y - 350 + randomOffsetY
                    );
                }
            }
            await this.Fennimal_jump(jump_height);
        };

        await this.Fennimal_move_relative(260, 0, 320);
        await jump_with_particle_burst(110);
        await this.Fennimal_move_relative(-520, 0, 480);
        await jump_with_particle_burst(110);
        await this.Fennimal_move_relative(260, 0, 320);
        this.clear_gaze_target();
    }

    clean_up() {
        // Kill the life support first so late RAF/pointer callbacks cannot resurrect nodes.
        if (this.gaze_tracker) window.removeEventListener('pointermove', this.gaze_tracker);
        if (this.animation_frame_id) cancelAnimationFrame(this.animation_frame_id);
        this.gaze_tracker = null;
        this.animation_frame_id = null;

        // Prefer removing the whole scene trees. Older clean_up only removed the white
        // mask + Fennimal, which left partner/toy/UI nodes (and empty ItemLayers) sitting
        // on Fennimals_Layer above the map — matching participant "frozen overlay" reports.
        if (this.BackgroundLayer && this.BackgroundLayer.parentNode) this.BackgroundLayer.remove();
        if (this.FennimalLayer && this.FennimalLayer.parentNode) this.FennimalLayer.remove();
        if (this.ItemLayers && this.ItemLayers.Layer && this.ItemLayers.Layer.parentNode) {
            this.ItemLayers.Layer.remove();
        } else {
            if (this.BackgroundMask && this.BackgroundMask.parentNode) this.BackgroundMask.remove();
            if (this.Fennimal && this.Fennimal.parentNode) this.Fennimal.remove();
        }

        this.BackgroundMask = null;
        this.Fennimal = null;
        this.BackgroundLayer = null;
        this.FennimalLayer = null;
        this.ItemLayers = {};
        this.TargetPoints = {};

        if (this.ParentLayer) this.ParentLayer.style.display = "none";
    }
}

class BoxModule {
    BoxBase;
    BoxTop;
    BoxOutline;
    boxname;
    boxScale = 1;

    constructor(FenObj) {
        this.FenObj = FenObj;
        this.boxname = GenParam.get_box_printed_name(FenObj.toybox);
    }

    create_and_appear_box(ParentBase, ParentTop, center_x, center_y, scale, fade_in_time) {
        return new Promise(resolve => {
            this.boxScale = (typeof scale === "number") ? scale : 1;
            this.BoxBase = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + this.FenObj.toybox), ParentBase, center_x, center_y , scale);
            this.BoxBase.getElementsByClassName("front")[0].remove();
            this.BoxBase.getElementsByClassName("lid")[0].remove();
            this.BoxBase.style.opacity = 0;

            this.BoxTop = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + this.FenObj.toybox), ParentTop, center_x, center_y , scale);
            this.BoxTop.getElementsByClassName("back")[0].remove();
            this.BoxTop.style.opacity = 0;

            // Decorations are baked into the SVG as visible; honour WorldState by default.
            this.apply_worldstate_decoration_visibility();

            window.getComputedStyle(this.BoxBase).opacity;
            this.BoxTop.style.transition = "all " + fade_in_time + "ms ease-in-out";
            this.BoxBase.style.transition = "all " + fade_in_time + "ms ease-in-out";
            this.BoxBase.style.opacity = 1;
            this.BoxTop.style.opacity = 1;

            setTimeout(() => resolve(), fade_in_time);
        });
    }

    get_decoration_roots(root = null) {
        let targets = [];
        if (root) {
            targets = [root];
        } else {
            if (this.BoxTop) targets.push(this.BoxTop);
            if (this.BoxBase) targets.push(this.BoxBase);
        }
        let found = [];
        targets.forEach((t) => {
            Array.from(t.querySelectorAll(".box_decoration")).forEach((el) => found.push(el));
        });
        return found;
    }

    get_decoration(letter, root = null) {
        let cls = "box_decoration_" + letter;
        let roots = root ? [root] : [this.BoxTop, this.BoxBase].filter(Boolean);
        for (let i = 0; i < roots.length; i++) {
            let el = roots[i].querySelector("." + cls);
            if (el) return el;
        }
        return null;
    }

    set_decoration_visible(letter, visible, root = null) {
        let el = this.get_decoration(letter, root);
        if (!el) return;
        el.style.transition = "";
        el.style.opacity = visible ? "1" : "0";
        el.style.visibility = visible ? "visible" : "hidden";
        el.style.pointerEvents = "none";
    }

    set_all_decorations_visible(visible, root = null) {
        ["A", "B", "C", "D"].forEach((letter) => {
            this.set_decoration_visible(letter, visible, root);
        });
    }

    apply_worldstate_decoration_visibility(root = null) {
        let target = root || this.BoxTop || this.BoxBase;
        if (!target) return false;
        let decorated = apply_toybox_decoration_visibility_to_element(target, this.FenObj.toybox);
        // Keep Base in sync when applying to the live box (not a one-off clone).
        if (!root && this.BoxBase && this.BoxBase !== target) {
            apply_toybox_decoration_visibility_to_element(this.BoxBase, this.FenObj.toybox);
        }
        return decorated;
    }

    async fade_decoration(letter, visible, ms = 400) {
        let el = this.get_decoration(letter);
        if (!el) return;
        el.style.visibility = "visible";
        el.style.pointerEvents = "none";
        el.style.transition = `opacity ${ms}ms ease-in-out`;
        window.getComputedStyle(el).opacity;
        el.style.opacity = visible ? "1" : "0";
        await wait(ms);
        if (!visible) el.style.visibility = "hidden";
    }

    open_box() {
        AudioCont.play_sound_effect("box_open_" + this.FenObj.toybox);
        this.BoxTop.getElementsByClassName("lid")[0].style.opacity = 0;
    }

    close_box() {
        AudioCont.play_sound_effect("box_open_" + this.FenObj.toybox);
        this.BoxTop.getElementsByClassName("lid")[0].style.opacity = 1;
    }

    set_pointer_events_enabled(enabled) {
        let value = enabled ? "auto" : "none";
        if (this.BoxBase) this.BoxBase.style.pointerEvents = value;
        if (this.BoxTop) this.BoxTop.style.pointerEvents = value;
    }

    wait_for_user_click(action, callback) {
        Interface.Prompt.show_message("Click to " + action + " the box");
        AudioCont.play_sound_effect("alert_minor");

        this.BoxOutline = create_SVG_outline_of_multiple_groups(this.BoxBase, this.BoxTop);
        this.BoxBase.parentNode.insertBefore(this.BoxOutline, this.BoxBase);
        this.BoxOutline.classList.add("focus_on_SVG_outline");

        this.BoxBase.style.cursor = "pointer";
        this.BoxTop.style.cursor = "pointer";

        const box_clicked = () => {
            this.BoxBase.onpointerdown = null;
            this.BoxTop.onpointerdown = null;
            this.BoxBase.style.cursor = "auto";
            this.BoxTop.style.cursor = "auto";
            this.BoxOutline.remove();

            if (action === "open") this.open_box();
            else this.close_box();

            callback(); // Tell the Manager we finished!
        };

        this.BoxBase.onpointerdown = box_clicked;
        this.BoxTop.onpointerdown = box_clicked;
    }

    clean_up() {
        if (this.BoxBase) this.BoxBase.remove();
        if (this.BoxTop) this.BoxTop.remove();
    }
}

class SackModule {
    SackBase;
    SackTop;
    SackItem;
    SackOutline;
    sackname;
    sackScale = 1;

    constructor(FenObj) {
        this.FenObj = FenObj;
        this.sackname = GenParam.get_sack_printed_name(FenObj.sack);
    }

    get_template() {
        let template = document.getElementById(this.FenObj.sack);
        if (!template) {
            console.error("SackModule: missing SVG for sack id '" + this.FenObj.sack + "'");
        }
        return template;
    }

    ensure_target_centerpoint(root) {
        if (!root) return null;
        let existing = root.getElementsByClassName("sack_target_centerpoint")[0];
        if (existing) return existing;

        // Place the target inside the scaled sack artwork (same pattern as box_target_centerpoint).
        // Appending to the outer translate group with inner SVG coords was off-center.
        let anchor = root.querySelector(".sack_open") || root.querySelector(".sack_closed");
        let host = anchor || root.querySelector(".sack") || root;
        let bbox;
        try {
            bbox = (anchor || host).getBBox();
        } catch (e) {
            bbox = { x: 70, y: 70, width: 40, height: 40 };
        }

        let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("class", "sack_target_centerpoint invisible_element");
        circle.setAttribute("cx", String(bbox.x + bbox.width / 2));
        circle.setAttribute("cy", String(bbox.y + bbox.height * 0.55));
        circle.setAttribute("r", "3");
        circle.setAttribute("fill", "#37c837");
        circle.style.opacity = "0";
        circle.style.pointerEvents = "none";
        host.appendChild(circle);
        return circle;
    }

    set_group_display(el, visible) {
        if (!el) return;
        el.style.display = visible ? "inline" : "none";
    }

    apply_closed_visual() {
        if (this.SackBase) {
            this.set_group_display(this.SackBase.querySelector(".sack_open"), false);
            this.set_group_display(this.SackBase.querySelector(".sack_closed"), false);
        }
        if (this.SackTop) {
            this.set_group_display(this.SackTop.querySelector(".sack_open"), false);
            this.set_group_display(this.SackTop.querySelector(".sack_closed"), true);
        }
    }

    apply_open_visual() {
        if (this.SackBase) {
            this.set_group_display(this.SackBase.querySelector(".sack_open"), true);
            this.set_group_display(this.SackBase.querySelector(".sack_closed"), false);
        }
        if (this.SackTop) {
            this.set_group_display(this.SackTop.querySelector(".sack_open"), true);
            this.set_group_display(this.SackTop.querySelector(".sack_closed"), false);
        }
    }

    // Container mode: back on Base, front (+ closed overlay) on Top — mirrors BoxModule layering.
    create_and_appear_sack(ParentBase, ParentTop, center_x, center_y, scale, fade_in_time) {
        return new Promise(resolve => {
            let template = this.get_template();
            if (!template) {
                resolve();
                return;
            }

            this.sackScale = (typeof scale === "number") ? scale : 1;
            this.SackBase = copy_scale_and_move_object_to_position(template, ParentBase, center_x, center_y, scale);
            let frontOnBase = this.SackBase.querySelector(".sack_front");
            if (frontOnBase) frontOnBase.remove();
            let closedOnBase = this.SackBase.querySelector(".sack_closed");
            if (closedOnBase) closedOnBase.remove();
            this.SackBase.style.opacity = 0;

            this.SackTop = copy_scale_and_move_object_to_position(template, ParentTop, center_x, center_y, scale);
            let backOnTop = this.SackTop.querySelector(".sack_back");
            if (backOnTop) backOnTop.remove();
            this.SackTop.style.opacity = 0;

            this.ensure_target_centerpoint(this.SackTop);
            this.apply_closed_visual();

            window.getComputedStyle(this.SackBase).opacity;
            this.SackTop.style.transition = "all " + fade_in_time + "ms ease-in-out";
            this.SackBase.style.transition = "all " + fade_in_time + "ms ease-in-out";
            this.SackBase.style.opacity = 1;
            this.SackTop.style.opacity = 1;
            this.play_placed_sfx();

            setTimeout(() => resolve(), fade_in_time);
        });
    }

    // Single closed graphic for dragging a sack as an item (e.g. sack_to_box).
    create_and_appear_closed_sack_item(Parent, center_x, center_y, scale, fade_in_time) {
        return new Promise(resolve => {
            let template = this.get_template();
            if (!template) {
                resolve();
                return;
            }

            this.sackScale = (typeof scale === "number") ? scale : 1;
            this.SackItem = copy_scale_and_move_object_to_position(template, Parent, center_x, center_y, scale);
            let openGroup = this.SackItem.querySelector(".sack_open");
            if (openGroup) openGroup.remove();
            let closedGroup = this.SackItem.querySelector(".sack_closed");
            if (closedGroup) this.set_group_display(closedGroup, true);
            this.SackItem.style.opacity = 0;

            window.getComputedStyle(this.SackItem).opacity;
            this.SackItem.style.transition = "all " + fade_in_time + "ms ease-in-out";
            this.SackItem.style.opacity = 1;
            // Skip SFX for instant under-lid spawns (fade_in_time === 0).
            if (fade_in_time > 0) this.play_placed_sfx();

            setTimeout(() => resolve(), fade_in_time);
        });
    }

    play_placed_sfx() {
        if (this.FenObj && this.FenObj.sack) {
            AudioCont.play_sound_effect("sack_placed_" + this.FenObj.sack);
        }
    }

    play_opened_sfx() {
        if (this.FenObj && this.FenObj.sack) {
            AudioCont.play_sound_effect("sack_opened_" + this.FenObj.sack);
        }
    }

    open_sack() {
        this.play_opened_sfx();
        this.apply_open_visual();
    }

    close_sack() {
        this.play_opened_sfx();
        this.apply_closed_visual();
    }

    set_pointer_events_enabled(enabled) {
        let value = enabled ? "auto" : "none";
        if (this.SackBase) this.SackBase.style.pointerEvents = value;
        if (this.SackTop) this.SackTop.style.pointerEvents = value;
        if (this.SackItem) this.SackItem.style.pointerEvents = value;
    }

    wait_for_user_click(action, callback) {
        Interface.Prompt.show_message("Click to " + action + " the " + this.sackname);
        AudioCont.play_sound_effect("alert_minor");

        if (this.SackBase && this.SackTop) {
            this.SackOutline = create_SVG_outline_of_multiple_groups(this.SackBase, this.SackTop);
            this.SackBase.parentNode.insertBefore(this.SackOutline, this.SackBase);
        } else if (this.SackItem) {
            this.SackOutline = create_SVG_outline_of_multiple_groups(this.SackItem);
            this.SackItem.parentNode.insertBefore(this.SackOutline, this.SackItem);
        }
        if (this.SackOutline) this.SackOutline.classList.add("focus_on_SVG_outline");

        const clickTargets = [this.SackBase, this.SackTop, this.SackItem].filter(Boolean);
        clickTargets.forEach((el) => { el.style.cursor = "pointer"; });

        const sack_clicked = () => {
            clickTargets.forEach((el) => {
                el.onpointerdown = null;
                el.style.cursor = "auto";
            });
            if (this.SackOutline) this.SackOutline.remove();

            if (action === "open") this.open_sack();
            else this.close_sack();

            callback();
        };

        clickTargets.forEach((el) => { el.onpointerdown = sack_clicked; });
    }

    clean_up() {
        if (this.SackBase) this.SackBase.remove();
        if (this.SackTop) this.SackTop.remove();
        if (this.SackItem) this.SackItem.remove();
        if (this.SackOutline) this.SackOutline.remove();
    }
}

class BaseToyModule {
    ToyElement;
    FenObj;
    zoomFactor = 1.5;
    parentScale = 4;
    pre_charge_transform = "";
    centered_x = 0;
    centered_y = 0;

    constructor(FenObj) {
        this.FenObj = FenObj;
    }

    apply_initial_toy_states() {
        if (!this.ToyElement) return;

        let hidden_elements = Array.from(this.ToyElement.getElementsByClassName("prep_element_hidden"));
        hidden_elements.forEach(el => {
            el.style.opacity = 0;
            el.style.pointerEvents = "none";
        });

        switch(this.FenObj.toy) {
            case "robot":
                this.set_robot_state("off");
                break;
            case "bubblewand":
                this.upgrade_wand_soap(); // <-- NEW: Injects the 3D soap layers!
                break;
        }
    }

    // ----------------------------------------------------
    // ROBOT STATE MANAGER
    // ----------------------------------------------------
    set_robot_state(state) {
        if (!this.ToyElement) return;

        let eye_lights = Array.from(this.ToyElement.getElementsByClassName("eye_light"));
        let antennas = Array.from(this.ToyElement.getElementsByClassName("antenna"));
        let toggle_off = this.ToyElement.querySelector(".switch_toggle_off");
        let toggle_on = this.ToyElement.querySelector(".switch_toggle_on");
        let start_button = this.ToyElement.querySelector(".start_button");

        if (state === "off") {
            eye_lights.forEach(el => el.style.fill = "#444444"); // Dark gray
            antennas.forEach(el => el.style.fill = "#444444");
            if (toggle_off) { toggle_off.style.opacity = 1; toggle_off.style.pointerEvents = "auto"; }
            if (toggle_on) { toggle_on.style.opacity = 0; toggle_on.style.pointerEvents = "none"; }
            if (start_button) {
                start_button.style.fill = ""; // Revert to Inkscape default
                start_button.style.pointerEvents = "none";
            }
        }
        else if (state === "charging_step_1") {
            if (toggle_off) toggle_off.style.opacity = 0;
            if (toggle_on) toggle_on.style.opacity = 1;
            if (start_button) {
                start_button.style.fill = "#FF3B30"; // Bright Red prompt
                start_button.style.cursor = "pointer";
                start_button.style.pointerEvents = "auto";
            }
        }
        else if (state === "charged") {
            eye_lights.forEach(el => el.style.fill = "#00FFFF"); // Bright Cyan Glow!
            antennas.forEach(el => el.style.fill = "#00FFFF");
            if (start_button) {
                start_button.style.fill = "#4CD964"; // Green for success
                start_button.style.cursor = "auto";
                start_button.style.pointerEvents = "none";
            }
        }
    }

    // ----------------------------------------------------
    // UNIVERSAL CHARGING LOGIC
    // ----------------------------------------------------
    async charge_toy(TopmostLayer, center_x, center_y, basics = null) {
        if (basics) basics.set_gaze_target(this.ToyElement);

        TopmostLayer.appendChild(this.ToyElement);
        this.pre_charge_transform = this.ToyElement.style.transform;

        this.ToyElement.style.transition = "all 500ms ease-in-out";
        let BBox = this.ToyElement.getBBox();
        this.centered_x = center_x - (BBox.x + 0.5 * BBox.width);
        this.centered_y = center_y - (BBox.y + BBox.height);

        this.ToyElement.style.transform = `translate(${this.centered_x}px, ${this.centered_y}px) scale(${this.zoomFactor})`;

        await wait(600);

        switch(this.FenObj.toy) {
            case "car": await this.charge_car(); break;
            case "plane": await this.charge_plane(); break;
            case "trumpet": await this.charge_trumpet(); break;
            case "robot": await this.charge_robot(); break;
            case "globe": await this.charge_globe(); break;
            case "bubblewand": await this.charge_bubblewand(); break;
            case "jack": await this.charge_jack(); break;
            default: await wait(1000); break;
        }

        this.ToyElement.style.transition = "all 500ms ease-in-out";
        this.ToyElement.style.transform = this.pre_charge_transform;

        await wait(500);

        if (basics) basics.clear_gaze_target();
    }

    // Pulsing interaction cue for toy charging (same visual language as MakeObjectDraggableObject).
    // Half stroke width: outlines live inside the scaled toy, so the global 15px reads too thick.
    create_charge_outline(target, options = {}) {
        if (!target) return null;
        let parent = options.insertInto || target.parentNode;
        if (!parent) return null;

        let outline = create_SVG_outline_of_group_ID(target);
        outline.style.transform = "";
        if (!options.keepSvgTransform) outline.removeAttribute("transform");
        outline.style.pointerEvents = "none";
        outline.style.strokeWidth = "7.5px";
        outline.style.opacity = "";
        outline.classList.add("focus_on_SVG_outline");

        let before = options.insertInto ? parent.firstChild : target;
        parent.insertBefore(outline, before);
        return outline;
    }

    charge_car() {
        return new Promise(resolve => {
            Interface.Prompt.show_message("Please pull back the car to charge its spring");

            let totalScale = this.parentScale * this.zoomFactor;
            let friction = 0.95;
            let pull_target = 100;

            // Animated outline (same cue as MakeObjectDraggableObject) so the car reads as interactive.
            let outline = this.create_charge_outline(this.ToyElement, { insertInto: this.ToyElement });

            // Direction hint: reuse block_arrow_left (points right) — sit at toy mid-y, just to the right.
            let arrowSource = document.getElementById("block_arrow_left");
            let arrowWrap = null;
            if (arrowSource) {
                let arrowSVG = arrowSource.cloneNode(true);
                arrowSVG.removeAttribute("id");
                arrowSVG.style.display = "inherit";
                arrowSVG.style.pointerEvents = "none";
                arrowSVG.style.opacity = 0.55;
                arrowSVG.classList.add("focus_on_SVG_fill");

                let aZeroT = create_SVG_group(0, 0);
                let scale = create_SVG_group(0, 0);
                let pulse = create_SVG_group(0, 0);
                arrowWrap = create_SVG_group(0, 0);
                arrowWrap.style.pointerEvents = "none";

                aZeroT.appendChild(arrowSVG);
                scale.appendChild(aZeroT);
                pulse.appendChild(scale);
                arrowWrap.appendChild(pulse);
                this.ToyElement.parentNode.appendChild(arrowWrap);

                aZeroT.style.transform = `translate(${-getSVGInternalCenter(aZeroT).x}px, ${-getSVGInternalCenter(aZeroT).y}px)`;
                scale.style.transform = "scale(2.5)";
                pulse.classList.add("charge_hint_arrow_pulse_right");

                let carCenter = getSVGInternalCenter(this.ToyElement);
                let carBox = this.ToyElement.getBBox();
                let localRight = GenParam.SVGObject.createSVGPoint();
                localRight.x = carBox.x + carBox.width;
                localRight.y = carBox.y + 0.5 * carBox.height;
                let screenRight = localRight.matrixTransform(this.ToyElement.getScreenCTM());
                let svgRight = screenRight.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());
                arrowWrap.style.transform = `translate(${svgRight.x + 110}px, ${carCenter.y}px)`;
            }

            let clear_charge_cues = () => {
                if (outline && outline.parentNode) outline.remove();
                if (arrowWrap && arrowWrap.parentNode) arrowWrap.remove();
            };

            this.ToyElement.style.cursor = "grab";

            this.ToyElement.onpointerdown = (e) => {
                this.ToyElement.setPointerCapture(e.pointerId);
                this.ToyElement.style.transition = "none";
                this.ToyElement.style.cursor = "grabbing";

                // FIX: Start the wind-up sound as soon as they grab the car!
                AudioCont.start_looping_sound_effect("toy_car_windup");

                let pt = GenParam.SVGObject.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                let startSvgPos = pt.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());

                let currentTx = 0;

                this.ToyElement.onpointermove = (ev) => {
                    pt.x = ev.clientX;
                    pt.y = ev.clientY;
                    let currentSvgPos = pt.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());

                    let rawDx = (currentSvgPos.x - startSvgPos.x) / totalScale;
                    // Car faces left: only allow pulling backwards (to the right).
                    currentTx = Math.max(0, rawDx * friction);

                    let new_x = this.centered_x + currentTx;
                    this.ToyElement.style.transform = `translate(${new_x}px, ${this.centered_y}px) scale(${this.zoomFactor})`;
                };

                this.ToyElement.onpointerup = (ev) => {
                    this.ToyElement.onpointermove = null;
                    this.ToyElement.onpointerup = null;
                    this.ToyElement.releasePointerCapture(ev.pointerId);
                    this.ToyElement.style.cursor = "auto";

                    // FIX: Stop the wind-up sound immediately when they let go!
                    AudioCont.stop_looping_sound_effect("toy_car_windup");

                    if (currentTx >= pull_target) {
                        // FIX: Only lock the toy (prevent re-grabbing) if they actually pulled it far enough!
                        this.ToyElement.onpointerdown = null;
                        clear_charge_cues();

                        AudioCont.play_sound_effect("success");
                        this.ToyElement.style.transition = "all 600ms cubic-bezier(0.25, 1, 0.5, 1)";
                        this.ToyElement.style.transform = `translate(${this.centered_x}px, ${this.centered_y}px) scale(${this.zoomFactor})`;
                        setTimeout(() => resolve(), 600);
                    } else {
                        // If they didn't pull far enough, it just snaps back, and the cursor resets so they know they can try again!
                        this.ToyElement.style.cursor = "grab";
                        this.ToyElement.style.transition = "all 300ms ease-out";
                        this.ToyElement.style.transform = `translate(${this.centered_x}px, ${this.centered_y}px) scale(${this.zoomFactor})`;
                        Interface.Prompt.show_message("Pull the car a little bit further");
                    }
                };
            };
        });
    }

    charge_plane() {
        return new Promise(resolve => {
            Interface.Prompt.show_message("Please charge the plane by moving the propeller");

            let prop_base = this.ToyElement.getElementsByClassName("prop_base")[0];
            let prop_alt = this.ToyElement.getElementsByClassName("prop_alt")[0];
            let prop_spinning = this.ToyElement.getElementsByClassName("prop_spinning")[0];

            if (!prop_base || !prop_alt) {
                console.warn("Propeller classes missing from SVG!");
                resolve();
                return;
            }

            if (prop_spinning) prop_spinning.style.opacity = 0;

            prop_alt.style.opacity = 0;
            prop_base.style.cursor = "pointer";
            prop_alt.style.cursor = "pointer";

            let outline_base = this.create_charge_outline(prop_base);
            let outline_alt = this.create_charge_outline(prop_alt);
            if (outline_alt) outline_alt.style.opacity = "0";

            let clicks = 0;
            const required_clicks = 6;

            const clear_prop_outlines = () => {
                if (outline_base && outline_base.parentNode) outline_base.remove();
                if (outline_alt && outline_alt.parentNode) outline_alt.remove();
            };

            const handle_click = () => {
                clicks++;
                AudioCont.play_sound_effect("wind_up_plane");

                if (clicks % 2 !== 0) {
                    prop_base.style.opacity = 0;
                    prop_alt.style.opacity = 1;
                    if (outline_base) outline_base.style.opacity = "0";
                    if (outline_alt) outline_alt.style.opacity = "";
                } else {
                    prop_base.style.opacity = 1;
                    prop_alt.style.opacity = 0;
                    if (outline_base) outline_base.style.opacity = "";
                    if (outline_alt) outline_alt.style.opacity = "0";
                }

                if (clicks >= required_clicks) {
                    prop_base.onpointerdown = null;
                    prop_alt.onpointerdown = null;
                    prop_base.style.cursor = "auto";
                    prop_alt.style.cursor = "auto";
                    clear_prop_outlines();

                    AudioCont.play_sound_effect("success");
                    resolve();
                }
            };

            prop_base.onpointerdown = handle_click;
            prop_alt.onpointerdown = handle_click;
        });
    }

    charge_trumpet() {
        return new Promise(resolve => {
            Interface.Prompt.show_message("Please play the trumpet by pressing all three valves.");

            this.recorded_notes = [];

            let open_valves = Array.from(this.ToyElement.getElementsByClassName("valve_open"));
            let closed_valves = Array.from(this.ToyElement.getElementsByClassName("valve_closed"));

            let pressed_count = 0;
            const sound_suffixes = ["A", "B", "C"];

            open_valves.forEach((open_valve, index) => {
                let closed_valve = closed_valves[index];
                let valve_outline = this.create_charge_outline(open_valve);

                open_valve.style.transition = "opacity 50ms ease-out";
                open_valve.style.opacity = 1;
                open_valve.style.cursor = "pointer";

                if (closed_valve) {
                    closed_valve.style.transition = "opacity 50ms ease-out";
                    closed_valve.style.opacity = 0;
                }

                let handle_press = () => {
                    open_valve.onpointerdown = null;
                    open_valve.style.cursor = "auto";
                    open_valve.style.opacity = 0;
                    if (closed_valve) closed_valve.style.opacity = 1;
                    if (valve_outline && valve_outline.parentNode) valve_outline.remove();

                    let sound_key = "trumpet_note_" + sound_suffixes[index % 3];
                    AudioCont.play_sound_effect(sound_key);

                    this.recorded_notes.push(sound_key);
                    pressed_count++;

                    if (pressed_count === open_valves.length) {
                        setTimeout(() => {
                            open_valves.forEach(v => v.style.opacity = 1);
                            closed_valves.forEach(v => { if(v) v.style.opacity = 0; });

                            setTimeout(() => {
                                AudioCont.play_sound_effect("success");
                                resolve();
                            }, 400);
                        }, 500);
                    }
                };

                open_valve.onpointerdown = handle_press;
            });
        });
    }

    charge_robot() {
        return new Promise(resolve => {
            Interface.Prompt.show_message("Please turn the robot toy on by flipping the switch, then press START.");

            this.set_robot_state("off");

            let toggle_off = this.ToyElement.querySelector(".switch_toggle_off");
            let start_button = this.ToyElement.querySelector(".start_button");

            if (!toggle_off || !start_button) {
                console.warn("Robot missing switch or button classes!");
                resolve();
                return;
            }

            toggle_off.style.cursor = "pointer";
            let outline_switch = this.create_charge_outline(toggle_off, { keepSvgTransform: true });
            let outline_button = null;

            // Part 1: Flip the Switch
            toggle_off.onpointerdown = () => {
                AudioCont.play_sound_effect("switch_flicked");
                toggle_off.onpointerdown = null;
                toggle_off.style.cursor = "auto";
                if (outline_switch && outline_switch.parentNode) outline_switch.remove();

                this.set_robot_state("charging_step_1");
                outline_button = this.create_charge_outline(start_button);

                // Part 2: Press the glowing red Start Button
                start_button.onpointerdown = () => {
                    AudioCont.play_sound_effect("success");
                    start_button.onpointerdown = null;
                    if (outline_button && outline_button.parentNode) outline_button.remove();

                    this.set_robot_state("charged");

                    // Wait half a second so the user actually sees the eyes turn on!
                    setTimeout(() => resolve(), 500);
                };
            };
        });
    }

    charge_globe() {
        return new Promise(resolve => {
            Interface.Prompt.show_message("Please charge the globe by clicking and shaking it rapidly!");

            let arcs = Array.from(this.ToyElement.getElementsByClassName("arc"));
            let central_pivot = this.ToyElement.querySelector(".toy_pivot_point");

            let lights = [
                this.ToyElement.querySelector(".light_1"),
                this.ToyElement.querySelector(".light_2"),
                this.ToyElement.querySelector(".light_3"),
                this.ToyElement.querySelector(".light_4")
            ];

            // 1. Reset states
            lights.forEach(l => { if (l) l.style.fill = "#555555"; });
            arcs.forEach(arc => arc.style.opacity = 0);

            // 2. Pre-calculate the shared pivot for the occasional charging flashes
            if (central_pivot && arcs.length > 0) {
                let pt = GenParam.SVGObject.createSVGPoint();
                let pBox = central_pivot.getBBox();
                pt.x = pBox.x + pBox.width / 2;
                pt.y = pBox.y + pBox.height / 2;
                let screenPivot = pt.matrixTransform(central_pivot.getScreenCTM());

                arcs.forEach(arc => {
                    arc.style.transformBox = "fill-box";
                    let localPivot = screenPivot.matrixTransform(arc.getScreenCTM().inverse());
                    let aBox = arc.getBBox();
                    arc.style.transformOrigin = `${localPivot.x - aBox.x}px ${localPivot.y - aBox.y}px`;
                    arc.style.transition = "none"; // Ensures instant flashing
                });
            }

            // ----------------------------------------------------
            // 2D SHAKE LOGIC
            // ----------------------------------------------------
            let total_shake = 0;
            // Bumped up slightly because tracking two axes generates numbers faster!
            const required_shake = 4000;

            let outline_globe = this.create_charge_outline(this.ToyElement, { insertInto: this.ToyElement });

            let last_mouse_x = 0;
            let last_mouse_y = 0;

            this.ToyElement.style.cursor = "grab";

            this.ToyElement.onpointerdown = (e) => {
                this.ToyElement.setPointerCapture(e.pointerId);
                this.ToyElement.style.transition = "none";
                this.ToyElement.style.cursor = "grabbing";

                // Track BOTH starting dimensions
                last_mouse_x = e.clientX;
                last_mouse_y = e.clientY;

                this.ToyElement.onpointermove = (ev) => {
                    let deltaX = ev.clientX - last_mouse_x;
                    let deltaY = ev.clientY - last_mouse_y;
                    last_mouse_x = ev.clientX;
                    last_mouse_y = ev.clientY;

                    // Accumulate raw movement distance in all directions
                    total_shake += (Math.abs(deltaX) + Math.abs(deltaY));

                    // Visually shake the toy in 2D space (capped at a 40px radius so it doesn't escape)
                    let raw_offset_x = Math.max(-40, Math.min(40, ev.clientX - e.clientX));
                    let raw_offset_y = Math.max(-40, Math.min(40, ev.clientY - e.clientY));

                    let new_x = this.centered_x + raw_offset_x;
                    let new_y = this.centered_y + raw_offset_y;
                    this.ToyElement.style.transform = `translate(${new_x}px, ${new_y}px) scale(${this.zoomFactor})`;

                    // Progress Calculation
                    let progress = total_shake / required_shake;

                    if (progress >= 0.25 && lights[0]) lights[0].style.fill = "#00FFFF";
                    if (progress >= 0.50 && lights[1]) lights[1].style.fill = "#00FFFF";
                    if (progress >= 0.75 && lights[2]) lights[2].style.fill = "#00FFFF";
                    if (progress >= 1.00 && lights[3]) lights[3].style.fill = "#00FFFF";

                    // Occasional crackle
                    if (Math.random() < 0.08 && arcs.length > 0) {
                        let random_arc = arcs[Math.floor(Math.random() * arcs.length)];
                        random_arc.style.opacity = 1;
                        random_arc.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
                        AudioCont.play_sound_effect("electric_zap_single");
                        setTimeout(() => { random_arc.style.opacity = 0; }, 50);
                    }

                    // Success Condition
                    if (total_shake >= required_shake) {
                        this.ToyElement.onpointermove = null;
                        this.ToyElement.onpointerup = null;
                        this.ToyElement.onpointerdown = null;
                        this.ToyElement.releasePointerCapture(ev.pointerId);
                        this.ToyElement.style.cursor = "auto";
                        if (outline_globe && outline_globe.parentNode) outline_globe.remove();

                        this.ToyElement.style.transition = "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)";
                        this.ToyElement.style.transform = `translate(${this.centered_x}px, ${this.centered_y}px) scale(${this.zoomFactor})`;

                        AudioCont.play_sound_effect("success");
                        arcs.forEach(arc => arc.style.opacity = 0);

                        setTimeout(() => resolve(), 500);
                    }
                };

                this.ToyElement.onpointerup = (ev) => {
                    this.ToyElement.onpointermove = null;
                    this.ToyElement.onpointerup = null;
                    this.ToyElement.releasePointerCapture(ev.pointerId);
                    this.ToyElement.style.cursor = "grab";

                    this.ToyElement.style.transition = "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)";
                    this.ToyElement.style.transform = `translate(${this.centered_x}px, ${this.centered_y}px) scale(${this.zoomFactor})`;
                };
            };
        });
    }

    charge_jack() {
        return new Promise(resolve => {
            Interface.Prompt.show_message("Click the crank to wind up the Jack-in-the-Box!");

            let crank_up = this.ToyElement.querySelector(".crank_up");
            let crank_down = this.ToyElement.querySelector(".crank_down");
            let box_lid_open = this.ToyElement.querySelector(".box_lid_open");
            let box_lid_closed = this.ToyElement.querySelector(".box_lid_closed");
            let jack_assembly = this.ToyElement.querySelector(".jack_assembly");

            // NEW: Grab the individual pieces!
            let spring = this.ToyElement.querySelector(".spring");
            let jack_head = this.ToyElement.querySelector(".jack");
            let pivot = jack_assembly ? jack_assembly.querySelector(".toy_pivot_point") : null;

            if (!crank_up || !jack_assembly || !spring || !jack_head) {
                console.warn("Jack-in-the-Box missing key elements!");
                resolve(); return;
            }

            let spring_height = 0;

            // 1. Establish the exact pivot for the Spring Compression
            if (pivot && spring) {
                let pBox = pivot.getBBox();
                let sBox = spring.getBBox();

                // Calculate percentage position relative to the spring's bounding box
                let pivotX_pct = ((pBox.x + (pBox.width / 2) - sBox.x) / sBox.width) * 100;
                let pivotY_pct = ((pBox.y + (pBox.height / 2) - sBox.y) / sBox.height) * 100;

                spring.style.transformBox = "fill-box";
                spring.style.transformOrigin = `${pivotX_pct}% ${pivotY_pct}%`;

                spring_height = sBox.height;
            }

            // 2. Setup the Crank Button
            let crankBox = crank_up.getBBox();
            let crankHitbox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            crankHitbox.setAttribute('x', crankBox.x - 20);
            crankHitbox.setAttribute('y', crankBox.y - 20);
            crankHitbox.setAttribute('width', crankBox.width + 40);
            crankHitbox.setAttribute('height', crankBox.height + 40);
            crankHitbox.setAttribute('fill', 'rgba(0,0,0,0)');
            crankHitbox.setAttribute('stroke', 'none'); // <-- FIX: Explicitly removes the visible stroke!
            crankHitbox.style.cursor = "pointer";

            crank_up.parentNode.appendChild(crankHitbox);

            // Pulsing outline on the crank (both poses), same cue as car/plane charge.
            let outline_crank_up = this.create_charge_outline(crank_up, { keepSvgTransform: true });
            let outline_crank_down = crank_down ? this.create_charge_outline(crank_down, { keepSvgTransform: true }) : null;
            if (outline_crank_down) outline_crank_down.style.opacity = "0";

            const clear_crank_outlines = () => {
                if (outline_crank_up && outline_crank_up.parentNode) outline_crank_up.remove();
                if (outline_crank_down && outline_crank_down.parentNode) outline_crank_down.remove();
            };

            // 3. The Winding Logic
            let cranks = 0;
            const max_cranks = 6;
            let is_cranking = false;

            crankHitbox.onpointerdown = () => {
                if (is_cranking || cranks >= max_cranks) return;
                is_cranking = true;
                cranks++;

                AudioCont.play_sound_effect("wind_up_spring");
                crank_up.style.opacity = 0;
                if (outline_crank_up) outline_crank_up.style.opacity = "0";
                if (crank_down) crank_down.style.opacity = 1;
                if (outline_crank_down) outline_crank_down.style.opacity = "";

                // --- NEW: Decoupled Animation Math ---
                // 1. Squash the spring
                let max_squish = 0.55;
                let currentScaleY = 1 - ((cranks / max_cranks) * max_squish);

                spring.style.transition = "transform 300ms ease-out";
                spring.style.transform = `scale(1, ${currentScaleY})`;

                // 2. Translate the head down to follow it
                let shiftY = spring_height * (1 - currentScaleY);
                jack_head.style.transition = "transform 300ms ease-out";
                jack_head.style.transform = `translate(0px, ${shiftY}px)`;
                // -------------------------------------

                setTimeout(() => {
                    crank_up.style.opacity = 1;
                    if (outline_crank_up) outline_crank_up.style.opacity = "";
                    if (crank_down) crank_down.style.opacity = 0;
                    if (outline_crank_down) outline_crank_down.style.opacity = "0";
                    is_cranking = false;

                    if (cranks >= max_cranks) {
                        crankHitbox.remove();
                        clear_crank_outlines();

                        setTimeout(() => {
                            AudioCont.play_sound_effect("success");

                            box_lid_open.style.opacity = 0;
                            box_lid_closed.style.opacity = 1;

                            jack_assembly.style.opacity = 0;

                            setTimeout(() => resolve(), 500);
                        }, 200);
                    }
                }, 150);
            };
        });
    }

    upgrade_wand_soap() {
        let old_soap = this.ToyElement.querySelector(".wand_soap");
        if (!old_soap) return;

        // 1. Measure the user's Inkscape placeholder (works perfectly because prep_element_hidden uses opacity, not display:none!)
        let bbox = old_soap.getBBox();
        let radius = Math.min(bbox.width, bbox.height) / 2;
        let cx = bbox.x + bbox.width / 2;
        let cy = bbox.y + bbox.height / 2;

        // 2. Create the new wrapper group
        let soap_group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        // Preserve the original classes so the charging logic can still find and fade it in!
        soap_group.classList.add("wand_soap", "prep_element_hidden");

        // 3. The Stretched Film (Matching the bubble core)
        let base = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        base.setAttribute('cx', cx);
        base.setAttribute('cy', cy);
        base.setAttribute('r', radius);
        base.setAttribute('fill', 'rgba(150, 255, 255, 0.15)');
        base.setAttribute('stroke', 'rgba(255, 255, 255, 0.5)');
        base.setAttribute('stroke-width', '2');

        // 4. The Surface Glare
        let glare = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        glare.classList.add("soap_film_glare"); // Added for CSS animation later!
        glare.setAttribute('cx', cx);
        glare.setAttribute('cy', cy - radius * 0.65);
        glare.setAttribute('rx', radius * 0.45);
        glare.setAttribute('ry', radius * 0.15);
        glare.setAttribute('fill', 'rgba(255, 255, 255, 0.8)');
        glare.style.transformOrigin = `${cx}px ${cy}px`;
        glare.style.transformBox = "user-space-on-use";
        glare.style.transform = 'rotate(35deg)';

        // 5. The Bounce Light
        let bounce = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bounce.setAttribute('cx', cx - radius * 0.5);
        bounce.setAttribute('cy', cy + radius * 0.5);
        bounce.setAttribute('r', radius * 0.12);
        bounce.setAttribute('fill', 'rgba(255, 255, 255, 0.4)');

        // Assemble the new layers
        soap_group.appendChild(base);
        soap_group.appendChild(glare);
        soap_group.appendChild(bounce);

        // 6. Seamlessly swap them in the DOM
        old_soap.parentNode.insertBefore(soap_group, old_soap);
        old_soap.remove();

        // Ensure it starts invisible
        soap_group.style.opacity = 0;
    }

    charge_bubblewand() {
        return new Promise(resolve => {
            Interface.Prompt.show_message("Click the cap to open the soap, then drag the wand to dip it 3 times!");

            let wand_assembly = this.ToyElement.querySelector(".wand_assembly");
            let bottle_cap = this.ToyElement.querySelector(".bottle_cap");
            let wand_soap = this.ToyElement.querySelector(".wand_soap");
            let tube_backside = this.ToyElement.querySelector(".tube_backside");
            let pivot = wand_assembly ? wand_assembly.querySelector(".toy_pivot_point") : null;

            if (!wand_assembly || !bottle_cap) {
                console.warn("Bubblewand missing key elements!");
                resolve(); return;
            }

            // --- Hitbox Fix 2.0 (UPDATED) ---
            let chargeHitRect = null;
            let all_pieces = Array.from(this.ToyElement.querySelectorAll(".toy_part, .toy_frame, .tube_backside"));
            all_pieces.forEach(piece => {
                piece.style.pointerEvents = "none";
            });

            if (bottle_cap) bottle_cap.style.pointerEvents = "all";

            // Cap outline first; wand outline prepared early (before hitbox) so the clone stays clean.
            let outline_cap = this.create_charge_outline(bottle_cap);
            let outline_wand = this.create_charge_outline(wand_assembly, { insertInto: wand_assembly });
            if (outline_wand) outline_wand.style.opacity = "0";

            if (wand_assembly) {
                wand_assembly.style.pointerEvents = "all";
                let wand_children = Array.from(wand_assembly.children);
                wand_children.forEach(child => {
                    child.style.pointerEvents = "all";
                });
                if (outline_wand) outline_wand.style.pointerEvents = "none";

                // Inject a temporary invisible hitbox so the thin stick is always grabbable while charging.
                let wBox = wand_assembly.getBBox();
                if (wBox.width > 0 && wBox.height > 0) {
                    chargeHitRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    chargeHitRect.classList.add("bubblewand_charge_hitbox");
                    chargeHitRect.setAttribute('x', wBox.x - 30);
                    chargeHitRect.setAttribute('y', wBox.y - 30);
                    chargeHitRect.setAttribute('width', wBox.width + 60);
                    chargeHitRect.setAttribute('height', wBox.height + 60);
                    chargeHitRect.setAttribute('fill', 'transparent');
                    chargeHitRect.setAttribute('stroke', 'none');
                    chargeHitRect.style.pointerEvents = "all";
                    wand_assembly.appendChild(chargeHitRect);
                }
            }
            // ---------------------------

            // 1. Establish the exact rotation pivot for the flip
            if (pivot) {
                wand_assembly.style.transformBox = "fill-box";
                let pt = GenParam.SVGObject.createSVGPoint();
                let pBox = pivot.getBBox();
                pt.x = pBox.x + pBox.width / 2;
                pt.y = pBox.y + pBox.height / 2;
                let screenPivot = pt.matrixTransform(pivot.getScreenCTM());
                let localPivot = screenPivot.matrixTransform(wand_assembly.getScreenCTM().inverse());
                let aBox = wand_assembly.getBBox();
                wand_assembly.style.transformOrigin = `${localPivot.x - aBox.x}px ${localPivot.y - aBox.y}px`;
            } else {
                wand_assembly.style.transformOrigin = "center";
            }

            // 2. The Waypoint Curve
            const get_waypoint_transform = (p) => {
                const wp = [
                    { p: 0,   x: 0,   y: 0,    rot: 0 },    // Resting
                    { p: 30,  x: -20, y: -50,  rot: 45 },   // Lifted up
                    { p: 70,  x: 32,  y: -50,  rot: 180 },  // Hovering flipped over the bottle
                    { p: 100, x: 32,  y: -20,  rot: 180 }   // Dipped inside
                ];

                p = Math.max(0, Math.min(100, p)); // Clamp 0-100

                let start = wp[0], end = wp[wp.length - 1];
                for (let i = 0; i < wp.length - 1; i++) {
                    if (p >= wp[i].p && p <= wp[i + 1].p) {
                        start = wp[i]; end = wp[i + 1]; break;
                    }
                }

                let t = (end.p === start.p) ? 0 : (p - start.p) / (end.p - start.p);
                let x = start.x + (end.x - start.x) * t;
                let y = start.y + (end.y - start.y) * t;
                let rot = start.rot + (end.rot - start.rot) * t;

                return `translate(${x}px, ${y}px) rotate(${rot}deg)`;
            };

            // 3. Step One: Click the Cap
            bottle_cap.style.cursor = "pointer";
            bottle_cap.onpointerdown = () => {
                AudioCont.play_sound_effect("plastic_cap_open");
                bottle_cap.onpointerdown = null;
                bottle_cap.style.pointerEvents = "none";
                bottle_cap.style.transition = "opacity 200ms ease-out";
                bottle_cap.style.opacity = 0;
                if (outline_cap && outline_cap.parentNode) outline_cap.remove();
                if (outline_wand) outline_wand.style.opacity = "";

                if (tube_backside) {
                    tube_backside.style.transition = "opacity 200ms ease-in";
                    tube_backside.style.opacity = 1;
                }

                // 4. Step Two: Unlock the Wand Scrubbing
                wand_assembly.style.cursor = "grab";

                let scrub_value = 0;
                let drag_start_x = 0;
                let drag_start_y = 0;
                let scrub_at_drag_start = 0;

                let dip_count = 0;
                let can_dip = true;

                wand_assembly.onpointerdown = (e) => {
                    wand_assembly.setPointerCapture(e.pointerId);
                    wand_assembly.style.transition = "none";
                    wand_assembly.style.cursor = "grabbing";

                    drag_start_x = e.clientX;
                    drag_start_y = e.clientY;
                    scrub_at_drag_start = scrub_value;

                    wand_assembly.onpointermove = (ev) => {
                        let deltaX = ev.clientX - drag_start_x;
                        let deltaY = ev.clientY - drag_start_y;

                        // NEW: Contextual Drag Mapping!
                        // Dragging Right (+X) always drives progress forward.
                        let drag_distance = deltaX * 0.8;

                        if (scrub_at_drag_start > 50) {
                            // Phase 2 (Over the soap): Dragging DOWN (+Y) dips it in.
                            drag_distance += deltaY * 1.2;
                        } else {
                            // Phase 1 (In the bottle): Dragging UP (-Y) pulls it out.
                            drag_distance -= deltaY * 1.2;
                        }

                        // Apply the new, highly intuitive mapping
                        scrub_value = scrub_at_drag_start + (drag_distance * 0.5);
                        scrub_value = Math.max(0, Math.min(100, scrub_value));

                        // Apply the exact frame of the path
                        wand_assembly.style.transform = get_waypoint_transform(scrub_value);

                        // Dip Registration Logic
                        if (scrub_value <= 90) can_dip = true;

                        if (scrub_value >= 100 && can_dip) {
                            can_dip = false;
                            dip_count++;
                            AudioCont.play_sound_effect("water_splash");

                            // 5. Success Condition
                            if (dip_count >= 3) {
                                wand_assembly.onpointermove = null;
                                wand_assembly.onpointerup = null;
                                wand_assembly.onpointerdown = null;
                                wand_assembly.releasePointerCapture(e.pointerId);
                                wand_assembly.style.cursor = "auto";
                                if (outline_wand && outline_wand.parentNode) outline_wand.remove();

                                if (wand_soap) {
                                    wand_soap.style.transition = "opacity 300ms ease-in";
                                    wand_soap.style.opacity = 1;
                                }

                                AudioCont.play_sound_effect("success");

                                let start_scrub = scrub_value;
                                let start_time = performance.now();
                                let duration = 700;

                                const animate_reverse = (time) => {
                                    let elapsed = time - start_time;
                                    let progress = Math.min(elapsed / duration, 1);
                                    let easeProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

                                    let current_scrub = start_scrub * (1 - easeProgress);
                                    wand_assembly.style.transform = get_waypoint_transform(current_scrub);

                                    if (progress < 1) {
                                        requestAnimationFrame(animate_reverse);
                                    } else {
                                        if (bottle_cap) {
                                            bottle_cap.style.transition = "opacity 300ms ease-in";
                                            bottle_cap.style.opacity = 1;
                                            bottle_cap.style.pointerEvents = "";
                                        }
                                        if (tube_backside) {
                                            tube_backside.style.transition = "opacity 300ms ease-out";
                                            tube_backside.style.opacity = 0;
                                        }

                                        let all_pieces = Array.from(this.ToyElement.querySelectorAll(".toy_part, .toy_frame, .tube_backside"));
                                        all_pieces.forEach(piece => {
                                            piece.style.pointerEvents = "";
                                        });

                                        // Remove the temporary charging hitbox so later outlines
                                        // do not include the invisible rectangle.
                                        if (chargeHitRect) {
                                            chargeHitRect.remove();
                                            chargeHitRect = null;
                                        } else {
                                            Array.from(wand_assembly.querySelectorAll(".bubblewand_charge_hitbox")).forEach((rect) => rect.remove());
                                        }

                                        setTimeout(() => resolve(), 200);
                                    }
                                };
                                requestAnimationFrame(animate_reverse);
                            }
                        }
                    };

                    wand_assembly.onpointerup = (ev) => {
                        wand_assembly.onpointermove = null;
                        wand_assembly.onpointerup = null;
                        wand_assembly.releasePointerCapture(ev.pointerId);
                        wand_assembly.style.cursor = "grab";
                    };
                };
            };
        });
    }

    //Play logic
    play_with_toy(basics = null) {
        return new Promise(resolve => {
            Interface.Prompt.show_message(this.FenObj.name + " loves to play with the " + this.FenObj.toy);

            if (basics) basics.set_gaze_target(this.ToyElement);

            let ToyAnimationRotationGroup = create_SVG_group(0,0);
            let ToyAnimationTranslationGroup = create_SVG_group(0,0);
            let ToyParent = this.ToyElement.parentNode;

            // 1. DOM ATTACHMENT (Must happen BEFORE Matrix Math!)
            ToyAnimationRotationGroup.appendChild(this.ToyElement);
            ToyAnimationTranslationGroup.appendChild(ToyAnimationRotationGroup);
            ToyParent.appendChild(ToyAnimationTranslationGroup);

            // 2. TOY-SPECIFIC DELEGATION
            switch(this.FenObj.toy) {
                case "trumpet":
                    this.animate_play_trumpet(ToyAnimationRotationGroup, ToyAnimationTranslationGroup, ToyParent, basics);
                    break;
                case "robot":
                    this.animate_play_robot(ToyAnimationRotationGroup, ToyAnimationTranslationGroup);
                    break;
                case "globe":
                    this.animate_play_globe(ToyAnimationRotationGroup, ToyAnimationTranslationGroup, ToyParent, basics);
                    break;
                case "bubblewand":
                    this.animate_play_bubblewand(ToyAnimationRotationGroup, ToyAnimationTranslationGroup, ToyParent, basics);
                    break;
                case "jack":
                    this.animate_play_jack(ToyAnimationRotationGroup, ToyAnimationTranslationGroup, ToyParent, basics);
                    break;
                default:
                    this.animate_play_generic(ToyAnimationRotationGroup, ToyAnimationTranslationGroup, ToyParent);
                    break;
            }

            // 3. UNIVERSAL EFFECTS
            let HeartGenerator = setInterval(() => {
                let x_delta = randomIntFromInterval(-700,400);
                let y_delta = randomIntFromInterval(-950,-500);
                let heart_start_coords = getSVGInternalCenter(this.ToyElement);
                new SmallFeedbackSymbol(ToyParent, "heart", 2000, heart_start_coords.x, heart_start_coords.y, heart_start_coords.x + x_delta, heart_start_coords.y + y_delta);
            }, 200);

            // 4. RETURN TRIPS (3.5 seconds)
            setTimeout(() => {
                // NEW: Added the robot to the smooth return array!
                if (["trumpet", "globe", "robot", "bubblewand", "jack"].includes(this.FenObj.toy)) {
                    ToyAnimationTranslationGroup.style.transform = "translate(0px, 0px)";
                }
            }, 3500);

            // 5. UNIVERSAL CLEANUP (4.0 seconds)
            setTimeout(() => {
                ToyParent.appendChild(this.ToyElement);
                ToyAnimationTranslationGroup.remove();
                clearInterval(HeartGenerator);

                this.cleanup_play_state(); // Cleans up toy-specific opacity toggles (like the plane)

                if (basics) basics.clear_gaze_target();
                resolve();
            }, 4000);
        });
    }

    // ----------------------------------------------------
    // TOY PLAY ANIMATION DELEGATES
    // ----------------------------------------------------

    animate_play_trumpet(rotGroup, transGroup, parent, basics) {
        if (!this.recorded_notes) return;

        // Sequence Playback
        rotGroup.style.transition = "transform 150ms ease-in-out";
        const playSequence = async () => {
            await wait(400);
            for (let i = 0; i < this.recorded_notes.length; i++) {
                let note = this.recorded_notes[i];
                AudioCont.play_sound_effect(note);
                rotGroup.style.transform = "rotate(-25deg)";
                await wait(300);
                rotGroup.style.transform = "rotate(0deg)";
                await wait(250);
            }
        };
        playSequence();

        // Snap to Mouth Math
        let pivotPoint = this.ToyElement.querySelector(".toy_pivot_point");

        let activeFennimal = basics ? basics.Fennimal : null;
        let mouthPoint = basics ? basics.TargetPoints.Fennimal_mouth : null;

        if (mouthPoint && pivotPoint) {
            let pt = GenParam.SVGObject.createSVGPoint();
            pt.x = parseFloat(mouthPoint.getAttribute("cx"));
            pt.y = parseFloat(mouthPoint.getAttribute("cy"));
            let screenMouth = pt.matrixTransform(mouthPoint.getScreenCTM());

            let raw_cx = parseFloat(pivotPoint.getAttribute("cx"));
            let raw_cy = parseFloat(pivotPoint.getAttribute("cy"));
            if (isNaN(raw_cx) || isNaN(raw_cy)) {
                let pBox = pivotPoint.getBBox();
                pt.x = pBox.x + pBox.width / 2;
                pt.y = pBox.y + pBox.height / 2;
            } else {
                pt.x = raw_cx;
                pt.y = raw_cy;
            }
            let screenPivot = pt.matrixTransform(pivotPoint.getScreenCTM());

            let ToyParentCTM = parent.getScreenCTM().inverse();
            pt.x = screenMouth.x; pt.y = screenMouth.y;
            let localTargetMouth = pt.matrixTransform(ToyParentCTM);

            pt.x = screenPivot.x; pt.y = screenPivot.y;
            let localCurrentPivot = pt.matrixTransform(ToyParentCTM);

            rotGroup.style.transformBox = "view-box";
            rotGroup.style.transformOrigin = `${localCurrentPivot.x}px ${localCurrentPivot.y}px`;

            let dx = localTargetMouth.x - localCurrentPivot.x;
            let dy = localTargetMouth.y - localCurrentPivot.y;
            transGroup.style.transform = "translate(0px, 0px)";
            window.getComputedStyle(transGroup).transform;
            transGroup.style.transition = "transform 400ms ease-in-out";
            transGroup.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    }

    animate_play_robot(rotGroup, transGroup, basics) {
        transGroup.style.transform = "translate(0px, 0px)";
        window.getComputedStyle(transGroup).transform; // Force browser to register start position
        transGroup.style.transition = "transform 400ms ease-in-out";
        transGroup.style.transform = "translate(0px, -150px)"; // Pops up to chest height

        let arms = Array.from(this.ToyElement.getElementsByClassName("arm"));
        let wrists = Array.from(this.ToyElement.getElementsByClassName("wrist"));
        let clamps = Array.from(this.ToyElement.querySelectorAll(".clamp_left, .clamp_right"));
        let antennas = Array.from(this.ToyElement.getElementsByClassName("antenna"));

        const applySafePivot = (element) => {
            if (!element) return;
            let pivot = Array.from(element.children).find(el => el.classList.contains("toy_pivot_point") || el.tagName.toLowerCase() === 'circle');
            if (!pivot && element.parentNode) {
                pivot = Array.from(element.parentNode.children).find(el => el.classList.contains("toy_pivot_point") || el.tagName.toLowerCase() === 'circle');
            }
            element.style.transformBox = "fill-box";
            if (pivot) {
                let pt = GenParam.SVGObject.createSVGPoint();
                let pBox = pivot.getBBox();
                pt.x = pBox.x + pBox.width / 2;
                pt.y = pBox.y + pBox.height / 2;
                let screenPivot = pt.matrixTransform(pivot.getScreenCTM());
                let localPivot = screenPivot.matrixTransform(element.getScreenCTM().inverse());
                let eBox = element.getBBox();
                element.style.transformOrigin = `${localPivot.x - eBox.x}px ${localPivot.y - eBox.y}px`;
            } else {
                element.style.transformOrigin = "center";
            }
        };

        [...arms, ...wrists, ...clamps].forEach(el => {
            applySafePivot(el);
            el.style.transition = "transform 300ms ease-in-out";
        });

        // FIX: Start the looping audio right as the robot starts its routine!
        AudioCont.start_looping_sound_effect("robot_play");

        let isAntennaOn = true;
        let blinkInterval = setInterval(() => {
            isAntennaOn = !isAntennaOn;
            antennas.forEach(a => a.style.fill = isAntennaOn ? "#00FFFF" : "#444444");
        }, 250);

        const playRobotAnim = async () => {
            for(let i = 0; i < 5; i++) {
                arms.forEach(a => a.style.transform = a.classList.contains("arm_left") ? "rotate(40deg)" : "rotate(-40deg)");
                wrists.forEach(w => w.style.transform = "rotate(20deg)");
                clamps.forEach(c => c.style.transform = c.classList.contains("clamp_left") ? "rotate(-30deg)" : "rotate(30deg)");
                await wait(350);

                arms.forEach(a => a.style.transform = a.classList.contains("arm_left") ? "rotate(-10deg)" : "rotate(10deg)");
                wrists.forEach(w => w.style.transform = "rotate(-20deg)");
                clamps.forEach(c => c.style.transform = "rotate(0deg)");
                await wait(350);
            }
        };
        playRobotAnim();

        setTimeout(() => {
            clearInterval(blinkInterval);
            this.set_robot_state("off");
            [...arms, ...wrists, ...clamps].forEach(el => el.style.transform = "rotate(0deg)");

            // FIX: Stop the audio loop perfectly in sync with the robot powering down!
            AudioCont.stop_looping_sound_effect("robot_play");
        }, 3500);
    }

    animate_play_globe(rotGroup, transGroup, parent, basics) {
        let arcs = Array.from(this.ToyElement.getElementsByClassName("arc"));
        let central_pivot = this.ToyElement.querySelector(".toy_pivot_point");

        // 1. Rig the Electric Arcs to the Core
        if (central_pivot && arcs.length > 0) {
            let pt = GenParam.SVGObject.createSVGPoint();
            let pBox = central_pivot.getBBox();
            pt.x = pBox.x + pBox.width / 2;
            pt.y = pBox.y + pBox.height / 2;
            let screenPivot = pt.matrixTransform(central_pivot.getScreenCTM());

            arcs.forEach(arc => {
                arc.style.transformBox = "fill-box";
                let localPivot = screenPivot.matrixTransform(arc.getScreenCTM().inverse());
                let aBox = arc.getBBox();
                arc.style.transformOrigin = `${localPivot.x - aBox.x}px ${localPivot.y - aBox.y}px`;
                arc.style.transition = "none";
            });
        }

        // 2. Smoothly glide to the Fennimal's chest
        let activeFennimal = basics ? basics.Fennimal : null;
        let mouthPoint = basics ? basics.TargetPoints.Fennimal_mouth : null;

        if (mouthPoint && central_pivot) {
            let pt = GenParam.SVGObject.createSVGPoint();

            // Get screen coords of the mouth
            pt.x = parseFloat(mouthPoint.getAttribute("cx"));
            pt.y = parseFloat(mouthPoint.getAttribute("cy"));
            let screenMouth = pt.matrixTransform(mouthPoint.getScreenCTM());

            // Get screen coords of the globe's core
            let pBox = central_pivot.getBBox();
            pt.x = pBox.x + pBox.width / 2;
            pt.y = pBox.y + pBox.height / 2;
            let screenPivot = pt.matrixTransform(central_pivot.getScreenCTM());

            // Project to local space
            let ToyParentCTM = parent.getScreenCTM().inverse();
            pt.x = screenMouth.x; pt.y = screenMouth.y;
            let localTargetMouth = pt.matrixTransform(ToyParentCTM);

            pt.x = screenPivot.x; pt.y = screenPivot.y;
            let localCurrentPivot = pt.matrixTransform(ToyParentCTM);

            // Calculate distance, pushing it 80px DOWN so it sits on the chest/hands!
            let dx = localTargetMouth.x - localCurrentPivot.x;
            let dy = (localTargetMouth.y - localCurrentPivot.y) + 80;

            transGroup.style.transform = "translate(0px, 0px)";
            window.getComputedStyle(transGroup).transform;
            transGroup.style.transition = "transform 400ms ease-in-out";
            transGroup.style.transform = `translate(${dx}px, ${dy}px)`;
        } else {
            // Fallback if no mouth is found
            transGroup.classList.add("translation_" + this.FenObj.toy);
        }

        // FIX: Start the looping audio right as the storm starts!
        AudioCont.start_looping_sound_effect("electric_zap_discharge");

        // 3. The Chaotic Storm Interval
        let stormInterval = setInterval(() => {
            arcs.forEach(a => a.style.opacity = 0);
            let num_to_show = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < num_to_show; i++) {
                let random_arc = arcs[Math.floor(Math.random() * arcs.length)];
                random_arc.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
                random_arc.style.opacity = 1;
            }
        }, 60);

        // 4. Power down exactly as the return trip triggers
        setTimeout(() => {
            clearInterval(stormInterval);
            arcs.forEach(a => a.style.opacity = 0);
            let lights = Array.from(this.ToyElement.querySelectorAll(".light_1, .light_2, .light_3, .light_4"));
            lights.forEach(l => l.style.fill = "#555555");

            // FIX: Stop the audio loop perfectly in sync with the visual power down!
            AudioCont.stop_looping_sound_effect("electric_zap_discharge");
        }, 3500);
    }

    animate_play_bubblewand(rotGroup, transGroup, parent, basics) {
        let activeFennimal = basics ? basics.Fennimal : null;
        let mouthPoint = basics ? basics.TargetPoints.Fennimal_mouth : null;
        let neckPoint = activeFennimal ? activeFennimal.querySelector(".Fennimal_head_neck_point") : null;

        let wand_center = this.ToyElement.querySelector(".bubble_wand_center");
        let wand_assembly = this.ToyElement.querySelector(".wand_assembly");

        let dx = 0, dy = 0;

        // 1. Math to snap ONLY the wand to the mouth, using the Neck to calculate Head Rotation!
        if (mouthPoint && wand_center && wand_assembly) {
            let pt = GenParam.SVGObject.createSVGPoint();

            // Calculate Screen Position of the Mouth
            pt.x = parseFloat(mouthPoint.getAttribute("cx"));
            pt.y = parseFloat(mouthPoint.getAttribute("cy"));
            let screenMouth = pt.matrixTransform(mouthPoint.getScreenCTM());

            // Calculate Screen Position of the Neck
            let screenNeck = screenMouth;
            if (neckPoint) {
                pt.x = parseFloat(neckPoint.getAttribute("cx"));
                pt.y = parseFloat(neckPoint.getAttribute("cy"));
                screenNeck = pt.matrixTransform(neckPoint.getScreenCTM());
            }

            // THE SKELETAL CHECK: If mouth is > 15px to the right of the neck, it is facing right!
            let is_facing_right = (screenMouth.x - screenNeck.x) > 15;

            // Offset (Note: Because we are now inside the toy's coordinate space, this number
            // represents SVG internal pixels. You may need to tweak this to 80 or 120!)
            let x_offset = is_facing_right ? -30 : 30;

            // THE FIX: Project into the wand's IMMEDIATE parent space, not the global space!
            let WandParentCTM = wand_assembly.parentNode.getScreenCTM().inverse();

            pt.x = screenMouth.x; pt.y = screenMouth.y;
            let localTargetMouth = pt.matrixTransform(WandParentCTM);

            let pBox = wand_center.getBBox();
            pt.x = pBox.x + pBox.width / 2;
            pt.y = pBox.y + pBox.height / 2;
            let screenPivot = pt.matrixTransform(wand_center.getScreenCTM());
            pt.x = screenPivot.x; pt.y = screenPivot.y;
            let localCurrentPivot = pt.matrixTransform(WandParentCTM);

            // Calculate exact localized distance!
            dx = (localTargetMouth.x - localCurrentPivot.x) + x_offset;
            dy = (localTargetMouth.y - localCurrentPivot.y);

            // Safely set the rotational pivot to the handle
            let handle_pivot = wand_assembly.querySelector(".toy_pivot_point");
            if (handle_pivot) {
                wand_assembly.style.transformBox = "fill-box";
                let hBox = handle_pivot.getBBox();
                pt.x = hBox.x + hBox.width / 2;
                pt.y = hBox.y + hBox.height / 2;
                let screenHandle = pt.matrixTransform(handle_pivot.getScreenCTM());
                let localHandle = screenHandle.matrixTransform(wand_assembly.getScreenCTM().inverse());
                let aBox = wand_assembly.getBBox();
                wand_assembly.style.transformOrigin = `${localHandle.x - aBox.x}px ${localHandle.y - aBox.y}px`;
            }

            // Fly the wand out of the bottle!
            wand_assembly.style.transform = "translate(0px, 0px) rotate(0deg)";
            window.getComputedStyle(wand_assembly).transform;
            wand_assembly.style.transition = "transform 400ms ease-in-out";
            wand_assembly.style.transform = `translate(${dx}px, ${dy}px) rotate(0deg)`;
        } else {
            transGroup.classList.add("translation_trumpet"); // Ultimate fallback
        }

        // 2. The Epic Bubble Flurry
        const playSequence = async () => {
            await wait(400);

            for (let i = 0; i < 3; i++) {
                if (wand_assembly) {
                    wand_assembly.style.transition = "transform 200ms ease-in-out";
                    wand_assembly.style.transform = `translate(${dx}px, ${dy}px) rotate(-15deg)`;
                }

                AudioCont.play_sound_effect("water_splash");

                let localCenter = {x: 0, y: 0};
                if (wand_center) {
                    let pt = GenParam.SVGObject.createSVGPoint();
                    let pBox = wand_center.getBBox();
                    pt.x = pBox.x + pBox.width / 2; pt.y = pBox.y + pBox.height / 2;
                    let screenCenter = pt.matrixTransform(wand_center.getScreenCTM());
                    localCenter = screenCenter.matrixTransform(parent.getScreenCTM().inverse());
                }

                let bubbleCount = 10 + Math.floor(Math.random() * 5);
                for (let b = 0; b < bubbleCount; b++) {
                    let radius = 10 + Math.random() * 25;
                    let bubble = create_beautiful_bubble(parent, localCenter.x, localCenter.y, radius);

                    // Float rapidly to the RIGHT (positive X) and UP (negative Y)
                    setTimeout(() => {
                        let driftX = 250 + (Math.random() * 400); // Blowing strongly to the right!
                        let driftY = -150 - (Math.random() * 300);
                        bubble.style.transition = "all 2500ms cubic-bezier(0.25, 1, 0.5, 1)";
                        bubble.style.transform = `translate(${localCenter.x + driftX}px, ${localCenter.y + driftY}px) scale(1.5)`;
                    }, 20);

                    setTimeout(() => {
                        bubble.style.transition = "all 100ms ease-in";
                        bubble.style.transform += " scale(1.8)";
                        bubble.style.opacity = 0;
                        setTimeout(() => {bubble.remove(); AudioCont.play_sound_effect("bubble_pop_small")}, 100);

                    }, 1800 + Math.random() * 700);
                }

                await wait(200);
                if (wand_assembly) wand_assembly.style.transform = `translate(${dx}px, ${dy}px) rotate(0deg)`;
                await wait(600);
            }

            // 3. Cleanup: Pop the soap film!
            let wand_soap = this.ToyElement.querySelector(".wand_soap");
            if (wand_soap) {
                wand_soap.style.transition = "all 100ms ease-in";
                wand_soap.style.transform += " scale(1.1)";
                wand_soap.style.opacity = 0;
            }

            // 4. Return the wand to the bottle smoothly
            await wait(300);
            if (wand_assembly) {
                wand_assembly.style.transition = "transform 400ms ease-in-out";
                wand_assembly.style.transform = "translate(0px, 0px) rotate(0deg)";
            }
        };

        if (wand_assembly) playSequence();
    }

    animate_play_jack(rotGroup, transGroup, parent, basics) {
        let activeFennimal = basics ? basics.Fennimal : null;
        let box_lid_open = this.ToyElement.querySelector(".box_lid_open");
        let box_lid_closed = this.ToyElement.querySelector(".box_lid_closed");
        let jack_assembly = this.ToyElement.querySelector(".jack_assembly");

        let spring = this.ToyElement.querySelector(".spring");
        let jack_head = this.ToyElement.querySelector(".jack");
        let pivot = jack_assembly ? jack_assembly.querySelector(".toy_pivot_point") : null;

        let spring_height = spring ? spring.getBBox().height : 100;

        // 1. Establish the Wobble Pivot (100% immune to screen movement!)
        if (pivot && jack_assembly) {
            let pBox = pivot.getBBox();
            let aBox = jack_assembly.getBBox();

            // Calculate the exact percentage position of the invisible pivot circle
            let pivotX_pct = ((pBox.x + (pBox.width / 2) - aBox.x) / aBox.width) * 100;
            let pivotY_pct = ((pBox.y + (pBox.height / 2) - aBox.y) / aBox.height) * 100;

            jack_assembly.style.transformBox = "fill-box";
            jack_assembly.style.transformOrigin = `${pivotX_pct}% ${pivotY_pct}%`;
        }

        // 2. Move the Toy to the floor (Using pure, scalable SVG Math!)
        let dx = 0, dy = 0;
        let mouthPoint = activeFennimal ? activeFennimal.querySelector(".Fennimal_head_mouth_point") : null;

        if (mouthPoint && pivot) {
            let pt = GenParam.SVGObject.createSVGPoint();

            // Get screen coords of the Fennimal's mouth
            pt.x = parseFloat(mouthPoint.getAttribute("cx"));
            pt.y = parseFloat(mouthPoint.getAttribute("cy"));
            let screenMouth = pt.matrixTransform(mouthPoint.getScreenCTM());

            // Get screen coords of the Jack's base (using the pivot we already found!)
            let pBox = pivot.getBBox();
            pt.x = pBox.x + pBox.width / 2;
            pt.y = pBox.y + pBox.height;
            let screenPivot = pt.matrixTransform(pivot.getScreenCTM());

            // Project both into the parent animation layer's internal space
            let ToyParentCTM = parent.getScreenCTM().inverse();
            pt.x = screenMouth.x; pt.y = screenMouth.y;
            let localMouth = pt.matrixTransform(ToyParentCTM);

            pt.x = screenPivot.x; pt.y = screenPivot.y;
            let localPivot = pt.matrixTransform(ToyParentCTM);

            // Calculate distance: Offset slightly to the right (+120x) and down to the floor (+250y)
            // You can safely tweak these SVG units to get the exact visual layout you want!
            dx = (localMouth.x - localPivot.x) + 120;
            dy = (localMouth.y - localPivot.y) + 250;
        }

        transGroup.style.transition = "transform 600ms ease-in-out";
        transGroup.style.transform = `translate(${dx}px, ${dy}px)`;

        // 3. The Epic Pop Sequence
        const playSequence = async () => {
            await wait(800);

            AudioCont.play_sound_effect("spring_release");
            if (box_lid_closed) box_lid_closed.style.opacity = 0;
            if (box_lid_open) box_lid_open.style.opacity = 1;

            if (jack_assembly && spring && jack_head) {
                jack_assembly.style.opacity = 1;

                // --- NEW: The Extreme Pop Extension ---
                let targetScaleY = 2.2; // 180% height! Shoots out way past the default drawing.

                spring.style.transition = "transform 800ms cubic-bezier(0.34, 1.56, 0.64, 1)";
                spring.style.transform = `scale(1, ${targetScaleY})`;

                // Shift negative Y to push the head UP into the air!
                let shiftY = spring_height * (1 - targetScaleY);
                jack_head.style.transition = "transform 800ms cubic-bezier(0.34, 1.56, 0.64, 1)";
                jack_head.style.transform = `translate(0px, ${shiftY}px)`;
                // --------------------------------------
            }

            if (activeFennimal) {
                let style = window.getComputedStyle(activeFennimal);
                let matrix = new DOMMatrix(style.transform);
                let startX = matrix.m41;
                let startY = matrix.m42;

                // Flinch Left
                activeFennimal.style.transition = "transform 150ms ease-out";
                activeFennimal.style.transform = `translate(${startX - 60}px, ${startY}px)`;

                await wait(200); // Wait for the spring to reach its peak extension

                // --- NEW: The Physics Wobble ---
                // We rotate the entire assembly from its base while the Fennimal recovers!
                if (jack_assembly) {
                    for(let i=0; i<3; i++) {
                        jack_assembly.style.transition = "transform 150ms ease-in-out";
                        jack_assembly.style.transform = `rotate(12deg)`;
                        await wait(150);
                        jack_assembly.style.transform = `rotate(-12deg)`;
                        await wait(150);
                    }
                    jack_assembly.style.transform = `rotate(0deg)`;
                }
                // -------------------------------

                activeFennimal.style.transition = "transform 500ms ease-in-out";
                activeFennimal.style.transform = `translate(${startX}px, ${startY}px)`;

                await wait(400);

                // The Happy Jumps (now using the centralized function to trigger sounds!)
                for (let i = 0; i < 3; i++) {
                    await basics.Fennimal_jump(100);
                }
            }

            await wait(1000);

            if (box_lid_closed) box_lid_closed.style.opacity = 0;
            if (box_lid_open) box_lid_open.style.opacity = 1;

            if (jack_assembly) jack_assembly.style.transform = "";
            if (spring) spring.style.transform = "";
            if (jack_head) jack_head.style.transform = "";

            let crank_up = this.ToyElement.querySelector(".crank_up");
            let crank_down = this.ToyElement.querySelector(".crank_down");
            if (crank_up) crank_up.style.opacity = 1;
            if (crank_down) crank_down.style.opacity = 0;
        };

        playSequence();
    }

    animate_play_generic(rotGroup, transGroup, parent) {
        // Plane pre-processing
        if (this.FenObj.toy === "plane") {
            let prop_base = this.ToyElement.querySelector(".prop_base");
            let prop_alt = this.ToyElement.querySelector(".prop_alt");
            let prop_spinning = this.ToyElement.querySelector(".prop_spinning");
            if (prop_base) prop_base.style.opacity = 0;
            if (prop_alt) prop_alt.style.opacity = 0;
            if (prop_spinning) prop_spinning.style.opacity = 1;

            // FIX: Start the looping airplane sound
            AudioCont.start_looping_sound_effect("plane_buzz");

            // Power down the sound when the universal return-trip triggers at 3.5s
            setTimeout(() => {
                AudioCont.stop_looping_sound_effect("plane_buzz");
            }, 3500);
        }

        // FIX: Hardcoded timing sequence for the CSS-driven Car
        if (this.FenObj.toy === "car") {
            // Tweak these millisecond delays to match your CSS keyframes perfectly!
            setTimeout(() => AudioCont.play_sound_effect("toy_car_move"), 200);
            setTimeout(() => AudioCont.play_sound_effect("toy_car_move"), 1400);
            setTimeout(() => AudioCont.play_sound_effect("toy_car_move"), 2600);
        }

        // Generic CSS Animations
        rotGroup.classList.add("rotation_" + this.FenObj.toy);
        transGroup.classList.add("translation_" + this.FenObj.toy);

        // Generic Pivot Math
        rotGroup.style.transformBox = "view-box";
        let pivotPoint = this.ToyElement.querySelector(".toy_pivot_point");

        if (pivotPoint) {
            let pt = GenParam.SVGObject.createSVGPoint();
            pt.x = pivotPoint.getBBox().x + pivotPoint.getBBox().width / 2;
            pt.y = pivotPoint.getBBox().y + pivotPoint.getBBox().height / 2;
            let localPivot = pt.matrixTransform(pivotPoint.getScreenCTM()).matrixTransform(parent.getScreenCTM().inverse());
            rotGroup.style.transformOrigin = `${localPivot.x}px ${localPivot.y}px`;
        } else {
            let ToyCenter = getSVGInternalCenter(this.ToyElement);
            switch(this.FenObj.toy){
                case "spinner": case "duck": case "boomerang": case "plane":
                    rotGroup.style.transformOrigin = `${ToyCenter.x}px ${ToyCenter.y}px`; break;
                default:
                    rotGroup.style.transformOrigin = "center";
            }
        }
    }

    cleanup_play_state() {
        if (this.FenObj.toy === "plane") {
            let prop_base = this.ToyElement.querySelector(".prop_base");
            let prop_alt = this.ToyElement.querySelector(".prop_alt");
            let prop_spinning = this.ToyElement.querySelector(".prop_spinning");
            if (prop_base) prop_base.style.opacity = 1;
            if (prop_alt) prop_alt.style.opacity = 0;
            if (prop_spinning) prop_spinning.style.opacity = 0;
        }
    }

    done_playing() {
        return new Promise(resolve => {
            this.ToyElement.style.transition = "all 200ms ease-out";
            this.ToyElement.style.transform += "translate(50px, 150px)";
            setTimeout(() => resolve(), 1000);
        });
    }

    shimmy_to_target(TargetPoint) {
        return new Promise(resolve => {
            let CurrentPoint = getSVGInternalCenter(this.ToyElement);
            this.ToyElement.style.transition = "all 100ms ease-in-out";

            let dx = TargetPoint.x - CurrentPoint.x;
            let dy = TargetPoint.y - CurrentPoint.y;
            this.ToyElement.style.transform += "translate(" + dx + "px, " + dy + "px)";

            setTimeout(() => resolve(), 100);
        });
    }

    animate_out_of_box_to_target(TargetPoint, slide_callback = null) {
        return new Promise(resolve => {
            this.ToyElement.style.transition = "all 300ms ease-out";
            this.ToyElement.style.transform += "translateY(-150px)";

            setTimeout(() => {
                if (slide_callback) slide_callback();

                let CurrentPoint = getSVGInternalCenter(this.ToyElement);
                this.ToyElement.style.transition = "all 500ms ease-in-out";
                let dx = TargetPoint.x - CurrentPoint.x;
                let dy = TargetPoint.y - CurrentPoint.y;
                this.ToyElement.style.transform += `translate(${dx}px, ${dy}px)`;

                setTimeout(() => resolve(), 500);
            }, 300);
        });
    }

    move_relative(dx, dy, time) {
        return new Promise(resolve => {
            this.ToyElement.style.transition = `all ${time}ms ease-in-out`;
            this.ToyElement.style.transform += `translate(${dx}px, ${dy}px)`;
            setTimeout(() => resolve(), time);
        });
    }

    move_to_center_of_target_and_shrink(TargetPoint) {
        return new Promise(resolve => {
            this.ToyElement.style.transition = "all 500ms ease-in-out";

            let bBox = this.ToyElement.getBBox();
            let dx = TargetPoint.x - (bBox.x + bBox.width / 2);
            let dy = TargetPoint.y - (bBox.y + bBox.height / 2);

            this.ToyElement.style.transform = `translate(${dx}px, ${dy}px)`;

            setTimeout(() => resolve(), 500);
        });
    }

    discard_to_right() {
        return new Promise(resolve => {
            this.ToyElement.style.transition = "all 300ms ease-out";
            window.getComputedStyle(this.ToyElement).opacity;
            this.ToyElement.style.transform += "translateY(-350px)";

            setTimeout(() => {
                this.ToyElement.style.transition = "all 500ms ease-in-out";
                this.ToyElement.style.transform += " translate(400px, 50px) rotate(90deg)";
                this.ToyElement.style.opacity = 0;

                setTimeout(() => resolve(), 500);
            }, 300);
        });
    }

    clean_up() {
        if (this.ToyElement) this.ToyElement.remove();
        AudioCont.stop_looping_sound_effect("electric_zap_discharge");
        AudioCont.stop_looping_sound_effect("robot_play");
        AudioCont.stop_looping_sound_effect("plane_buzz");
        AudioCont.stop_looping_sound_effect("toy_car_windup");
    }
}

class StandardToyModule extends BaseToyModule {

    constructor(FenObj) {
        super(FenObj);
    }

    create_and_appear_toy(Parent, id, center_x, center_y, scale, fade_in_time) {
        return new Promise(resolve => {
            // FIX: Changed this.Toy to this.ToyElement everywhere here!
            this.ToyElement = copy_scale_and_move_object_to_position(document.getElementById("toy_" + this.FenObj.toy), Parent, center_x, center_y , scale);
            this.ToyElement.id = "task_toy_" + id;
            this.ToyElement.style.opacity = 0;
            window.getComputedStyle(this.ToyElement).opacity;

            this.ToyElement.style.transition = "all " + fade_in_time + "ms ease-in-out";
            this.ToyElement.style.opacity = 1;
            set_toy_color_scheme(this.ToyElement, this.FenObj.toy, false);

            this.ToyElement.setAttribute("stroke", "black");
            this.ToyElement.setAttribute("stroke-linejoin", "round");

            this.apply_initial_toy_states();

            setTimeout(() => resolve(), fade_in_time);
        });
    }
}

class BrokenToyModule extends BaseToyModule {

    ToyElement;
    ToyFrame;
    Parts = [];
    parentScale = 4;
    zoomFactor = 1.5;
    unplaced_count = 0;

    constructor(FenObj) {
        super(FenObj); // Hook up to the parent!
    }

    // Create the toy with all repairable parts overlapped at its centre.
    // The caller chooses whether that starting position is a box or a Fennimal.
    setup_overlapping_broken_toy(ParentLayer, center_x, center_y) {
        this.ToyElement = copy_scale_and_move_object_to_position(
            document.getElementById("toy_" + this.FenObj.toy),
            ParentLayer, center_x, center_y, this.parentScale
        );
        this.ToyElement.id = "task_broken_toy";
        set_toy_color_scheme(this.ToyElement, this.FenObj.toy, false);

        this.ToyElement.setAttribute("stroke", "black");
        this.ToyElement.setAttribute("stroke-linejoin", "round");
        this.apply_initial_toy_states();


        this.ToyElement.style.opacity = 0;

        this.ToyFrame = this.ToyElement.getElementsByClassName("toy_frame")[0];

        // FIX: Prevent the frame from blocking mouse clicks!
        this.ToyFrame.style.pointerEvents = "none";

        let rawParts = Array.from(this.ToyElement.getElementsByClassName("toy_part"));

        let frameBox = this.ToyFrame.getBBox();
        let frameCx = frameBox.x + (frameBox.width / 2);
        let frameCy = frameBox.y + (frameBox.height / 2);

        this.unplaced_count = rawParts.length;

        rawParts.forEach(part => {
            part.style.transformOrigin = "center";
            part.style.transformBox = "fill-box";

            // NEW: Create an invisible placeholder to remember the exact Z-Index
            let placeholder = document.createComment("part_z_index_placeholder");
            part.parentNode.insertBefore(placeholder, part);

            let partBox = part.getBBox();
            let partCx = partBox.x + (partBox.width / 2);
            let partCy = partBox.y + (partBox.height / 2);

            let dx = frameCx - partCx;
            let dy = frameCy - partCy;

            part.style.transform = `translate(${dx}px, ${dy}px)`;

            this.Parts.push({
                element: part,
                placeholder: placeholder, // NEW: Save the placeholder!
                initial_dx: dx,
                initial_dy: dy,
                current_tx: dx,
                current_ty: dy,
                current_rot: 0,
                is_placed: false,
                is_locked: false,
                is_held: false
            });
        });
    }

    move_to_center_and_explode(TopmostLayer, target_x, target_y) {
        return new Promise(resolve => {
            TopmostLayer.appendChild(this.ToyElement);
            this.ToyElement.style.opacity = 1;

            this.ToyElement.style.transition = "all 500ms ease-in-out";
            let BBox = this.ToyElement.getBBox();
            let delta_x = target_x - (BBox.x + 0.5 * BBox.width);
            let delta_y = target_y - (BBox.y + BBox.height);
            this.ToyElement.style.transform = `translate(${delta_x}px, ${delta_y}px) scale(${this.zoomFactor})`;

            setTimeout(() => {
                AudioCont.play_sound_effect("splat");

                this.Parts.forEach(p => {
                    // NEW: Flawless SVG outlining using CSS drop-shadow!
                    // You can change the 'gold' to whatever color you prefer
                    p.element.style.filter = "drop-shadow(0px 0px 6px gold)";

                    let angle = Math.random() * Math.PI * 2;
                    let dist = 100 + (Math.random() * 150);
                    let totalScale = this.parentScale * this.zoomFactor;

                    let ex = p.initial_dx + (Math.cos(angle) * (dist / totalScale));
                    let ey = p.initial_dy + (Math.sin(angle) * (dist / totalScale));
                    let rot = (Math.random() - 0.5) * 360;

                    this.set_part_transform(p, ex, ey, rot);
                });

                setTimeout(() => resolve(), 500);
            }, 600);
        });
    }

    set_part_transform(partObj, tx, ty, rot) {
        partObj.current_tx = tx;
        partObj.current_ty = ty;
        partObj.current_rot = rot;
        partObj.element.style.transition = "all 500ms ease-out";
        partObj.element.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
    }

    // Soften (or restore) the whole exploded toy so the Fennimal stays readable during comfort.
    set_exploded_toy_opacity(opacity, ms = 400) {
        return new Promise(resolve => {
            if (!this.ToyElement) {
                resolve();
                return;
            }
            this.ToyElement.style.transition = `opacity ${ms}ms ease-in-out`;
            window.getComputedStyle(this.ToyElement).opacity;
            this.ToyElement.style.opacity = opacity;
            setTimeout(() => resolve(), ms);
        });
    }

    enable_dragging(on_part_placed_callback) {
        let totalScale = this.parentScale * this.zoomFactor;

        this.Parts.forEach(p => {
            p.element.style.cursor = "pointer";

            p.element.onpointerdown = (e) => {
                if (p.is_placed || p.is_locked) return;

                // NEW: Bring the clicked piece to the absolute front of the SVG stack
                p.element.parentNode.appendChild(p.element);

                p.is_held = true;
                p.element.setPointerCapture(e.pointerId);
                p.element.style.transition = "none";

                let pt = GenParam.SVGObject.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                let startSvgPos = pt.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());

                let startTx = p.current_tx;
                let startTy = p.current_ty;

                p.element.onpointermove = (ev) => {
                    pt.x = ev.clientX;
                    pt.y = ev.clientY;
                    let currentSvgPos = pt.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());

                    let dx = (currentSvgPos.x - startSvgPos.x) / totalScale;
                    let dy = (currentSvgPos.y - startSvgPos.y) / totalScale;

                    p.current_tx = startTx + dx;
                    p.current_ty = startTy + dy;
                    p.element.style.transform = `translate(${p.current_tx}px, ${p.current_ty}px) rotate(${p.current_rot}deg)`;
                };

                p.element.onpointerup = (ev) => {
                    p.is_held = false;
                    p.element.onpointermove = null;
                    p.element.onpointerup = null;
                    p.element.releasePointerCapture(ev.pointerId);

                    // NEW: Restore the original Z-Index instantly!
                    if (p.placeholder && p.placeholder.parentNode) {
                        p.placeholder.parentNode.insertBefore(p.element, p.placeholder);
                    }

                    let screenDist = Math.sqrt(p.current_tx*p.current_tx + p.current_ty*p.current_ty) * totalScale;

                    if (screenDist <= 150) {
                        this.snap_part_to_correct(p, on_part_placed_callback);
                    } else {
                        this.set_part_transform(p, startTx, startTy, p.current_rot);
                    }
                };
            };
        });
    }

    snap_part_to_correct(partObj, on_part_placed_callback) {
        partObj.is_placed = true;

        // NEW: Turn off the glow effect and lock the piece
        partObj.element.style.filter = "none";
        partObj.element.style.cursor = "auto";
        partObj.element.style.pointerEvents = "none";

        // If the partner placed it, we need to make sure the Z-index is restored too
        if (partObj.placeholder && partObj.placeholder.parentNode) {
            partObj.placeholder.parentNode.insertBefore(partObj.element, partObj.placeholder);
        }

        this.set_part_transform(partObj, 0, 0, 0);
        AudioCont.play_sound_effect("success");

        this.unplaced_count--;
        on_part_placed_callback(this.unplaced_count);
    }

    restore_pointer_events() {
        // Run this before dragging the toy to the box so it is interactable again
        this.ToyFrame.style.pointerEvents = "auto";
        this.Parts.forEach(p => p.element.style.pointerEvents = "auto");
    }

    shrink_to_normal() {
        return new Promise(resolve => {
            this.ToyElement.style.transition = "all 500ms ease-in-out";

            // We cleanly slice the `scale(1.5)` right off the end of the transform string
            let currentTransform = this.ToyElement.style.transform;
            this.ToyElement.style.transform = currentTransform.replace(/\s*scale\([^)]+\)/, "");

            setTimeout(() => resolve(), 500);
        });
    }

    get_random_unplaced_part() {
        let unplaced = this.Parts.filter(p => !p.is_placed && !p.is_locked && !p.is_held);
        if (unplaced.length === 0) return null;
        return shuffleArray(unplaced)[0];
    }

    play_repair_celebration(ParentLayer) {
        return new Promise(resolve => {
            // ----------------------------------------------------
            // 1. The "Magic Weld" (Extended & Bigger)
            // ----------------------------------------------------
            let baseTransform = this.ToyElement.style.transform;

            // Slower, more pronounced glow and stretch
            this.ToyElement.style.transition = "transform 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 300ms ease-out";
            this.ToyElement.style.filter = "brightness(1.5) drop-shadow(0px 0px 25px gold)";
            this.ToyElement.style.transform += " scale(1.2)";

            // Snap back
            setTimeout(() => {
                this.ToyElement.style.transition = "transform 400ms ease-in-out, filter 600ms ease-in";
                this.ToyElement.style.transform = baseTransform;
                this.ToyElement.style.filter = "none";
            }, 400);

            // ----------------------------------------------------
            // 2. The Giant Confetti Burst
            // ----------------------------------------------------
            let centerSVG = getSVGInternalCenter(this.ToyElement);
            spawn_confetti_burst(ParentLayer, centerSVG.x, centerSVG.y, {
                insertBefore: this.ToyElement,
                awaitPopMs: 2800
            }).then(resolve);
        });
    }
}

class PartnerModule {
    PartnerIcon;
    PartnerScaleGroup;     // Inner Layer
    PartnerTranslateGroup; // Middle Layer
    PartnerBaseGroup;      // Outer Layer
    partnername;
    is_present;

    constructor(is_present) {
        this.is_present = is_present;
        this._offsetX = 0;
        this._offsetY = 0;
        this._scale = 40;
        this._facing = "back";
        this._homeScale = 40;
        if (this.is_present) {
            this.PartnerIcon = WorldState.get_person_icon("partner", "back");
            this.partnername = WorldState.get_partner_icon_settings().name;

            // Get screen dimensions for the starting position
            const W = GenParam.SVG_width;
            const H = GenParam.SVG_height;

            // 1. INNER LAYER: Scale the icon
            this.PartnerScaleGroup = create_SVG_group(0,0);
            this.PartnerScaleGroup.style.transform = "scale(40)";
            // (You might need this to keep it scaling from its center:)
            // this.PartnerScaleGroup.style.transformOrigin = "center";
            this.PartnerScaleGroup.appendChild(this.PartnerIcon);

            // 2. MIDDLE LAYER: The Animation Group
            // This is the group your existing movement functions will slide around!
            this.PartnerTranslateGroup = create_SVG_group(0,0);
            this.PartnerTranslateGroup.appendChild(this.PartnerScaleGroup);

            // 3. OUTER LAYER: The Base Starting Position (Bottom Right)
            this.PartnerBaseGroup = create_SVG_group(0,0);

            // Adjust the 0.8 multipliers to nudge it exactly where you want it
            this.PartnerBaseGroup.style.transform = `translate(${0.9*W}px, ${H}px)`;
            this.PartnerBaseGroup.appendChild(this.PartnerTranslateGroup);
        }
    }

    move_to_element_and_act(target_element, action_callback) {
        return new Promise(resolve => {
            // Your animation logic remains untouched! It slides the middle layer.
            let basetransform = this.PartnerTranslateGroup.style.transform;
            let baseX = this._offsetX;
            let baseY = this._offsetY;
            let dx = getSVGInternalCenter(target_element).x - getSVGInternalCenter(this.PartnerTranslateGroup).x;

            this.PartnerTranslateGroup.style.transition = "all 400ms ease-in-out";
            this.PartnerTranslateGroup.style.transform += "translateX(" + dx + "px)";

            setTimeout(() => action_callback(), 500);
            setTimeout(() => {
                this._offsetX = baseX;
                this._offsetY = baseY;
                this.PartnerTranslateGroup.style.transform = basetransform;
            }, 600);
            setTimeout(() => resolve(), 1000);
        });
    }

    return_to_start(avoid_x = null) {
        return new Promise(resolve => {
            this.PartnerTranslateGroup.style.transition = "all 500ms ease-in-out";

            let dx = 0;
            // NEW: If an avoid_x is provided, check if the partner's home base is too close
            if (avoid_x !== null) {
                let partner_base_x = 0.9 * GenParam.SVG_width; // 0.9 is the multiplier used for its home position

                // If the hidden object is within 400px of the resting spot, shift the partner to the left!
                if (Math.abs(partner_base_x - avoid_x) < 400) {
                    dx = -500;
                }
            }

            // Setting it to a single translateX (or empty string) safely clears any messy appended transforms from walking
            this._offsetX = dx;
            this._offsetY = 0;
            this.PartnerTranslateGroup.style.transform = dx ? `translate(${dx}px, 0px)` : "";
            setTimeout(() => resolve(), 500);
        });
    }

    // Reparent the outer stack (front Partner layer vs behind Neg1 / Main).
    move_to_layer(parentLayer) {
        if (!this.is_present || !this.PartnerBaseGroup || !parentLayer) return;
        parentLayer.appendChild(this.PartnerBaseGroup);
    }

    set_scale(scale, ms = 0) {
        if (!this.is_present || !this.PartnerScaleGroup) return;
        if (ms > 0) {
            this.PartnerScaleGroup.style.transition = "none";
            this.PartnerScaleGroup.style.transform = `scale(${this._scale})`;
            window.getComputedStyle(this.PartnerScaleGroup).transform;
            this.PartnerScaleGroup.style.transition = `transform ${ms}ms ease-in-out`;
            window.getComputedStyle(this.PartnerScaleGroup).transform;
        } else {
            this.PartnerScaleGroup.style.transition = "none";
        }
        this._scale = scale;
        this.PartnerScaleGroup.style.transform = `scale(${scale})`;
    }

    set_offset(x, y, ms = 0) {
        if (!this.is_present || !this.PartnerTranslateGroup) return;
        if (ms > 0) {
            this.PartnerTranslateGroup.style.transition = "none";
            this.PartnerTranslateGroup.style.transform =
                `translate(${this._offsetX}px, ${this._offsetY}px)`;
            window.getComputedStyle(this.PartnerTranslateGroup).transform;
            this.PartnerTranslateGroup.style.transition = `transform ${ms}ms ease-in-out`;
            window.getComputedStyle(this.PartnerTranslateGroup).transform;
        } else {
            this.PartnerTranslateGroup.style.transition = "none";
        }
        this._offsetX = x;
        this._offsetY = y;
        this.PartnerTranslateGroup.style.transform = `translate(${x}px, ${y}px)`;
    }

    async animate_offset(x, y, ms = 400) {
        if (!this.is_present || !this.PartnerTranslateGroup) return;
        this.set_offset(x, y, ms);
        await wait(ms);
    }

    async animate_scale(scale, ms = 400) {
        if (!this.is_present || !this.PartnerScaleGroup) return;
        this.set_scale(scale, ms);
        await wait(ms);
    }

    // Animate scale + offset together (avoids the enter "stumble").
    async animate_pose({ x = null, y = null, scale = null, ms = 450 } = {}) {
        if (!this.is_present || !this.PartnerTranslateGroup || !this.PartnerScaleGroup) return;
        let targetX = x != null ? x : this._offsetX;
        let targetY = y != null ? y : this._offsetY;
        let targetScale = scale != null ? scale : this._scale;

        this.PartnerScaleGroup.style.transition = "none";
        this.PartnerTranslateGroup.style.transition = "none";
        this.PartnerScaleGroup.style.transform = `scale(${this._scale})`;
        this.PartnerTranslateGroup.style.transform =
            `translate(${this._offsetX}px, ${this._offsetY}px)`;
        window.getComputedStyle(this.PartnerScaleGroup).transform;
        window.getComputedStyle(this.PartnerTranslateGroup).transform;

        this.PartnerScaleGroup.style.transition = `transform ${ms}ms ease-in-out`;
        this.PartnerTranslateGroup.style.transition = `transform ${ms}ms ease-in-out`;
        window.getComputedStyle(this.PartnerScaleGroup).transform;

        this._scale = targetScale;
        this._offsetX = targetX;
        this._offsetY = targetY;
        this.PartnerScaleGroup.style.transform = `scale(${targetScale})`;
        this.PartnerTranslateGroup.style.transform =
            `translate(${targetX}px, ${targetY}px)`;
        await wait(ms);
    }

    // Move so the partner's visual center approaches (targetX, targetY).
    async move_center_to(targetX, targetY, ms = 400) {
        if (!this.is_present || !this.PartnerTranslateGroup) return;
        let cur = getSVGInternalCenter(this.PartnerTranslateGroup);
        let nextX = this._offsetX + (targetX - cur.x);
        let nextY = this._offsetY + (targetY - cur.y);
        await this.animate_offset(nextX, nextY, ms);
    }

    async move_center_x_to(targetX, ms = 400) {
        if (!this.is_present || !this.PartnerTranslateGroup) return;
        let cur = getSVGInternalCenter(this.PartnerTranslateGroup);
        await this.move_center_to(targetX, cur.y, ms);
    }

    // Restore bottom-right home pose (optional layer / facing / scale).
    async animate_home({
        ms = 500,
        scale = null,
        direction = null,
        layer = null
    } = {}) {
        if (!this.is_present) return;
        let homeScale = scale != null ? scale : this._homeScale;
        if (layer) this.move_to_layer(layer);
        await this.animate_pose({ x: 0, y: 0, scale: homeScale, ms });
        if (direction) this.set_direction(direction);
    }

    jump(amount = 80, timing = {}) {
        if (!this.is_present || !this.PartnerTranslateGroup) {
            return Promise.resolve();
        }
        const ms = timing.ms != null ? timing.ms : 120;
        const resolveMs = timing.resolveMs != null ? timing.resolveMs : 240;
        const baseX = this._offsetX;
        const baseY = this._offsetY;

        return new Promise(resolve => {
            AudioCont.play_sound_effect("jump");
            this.PartnerTranslateGroup.style.transition = `transform ${ms}ms ease-out`;
            this.PartnerTranslateGroup.style.transform =
                `translate(${baseX}px, ${baseY - amount}px)`;
            setTimeout(() => {
                this.PartnerTranslateGroup.style.transition = `transform ${ms}ms ease-in`;
                this.PartnerTranslateGroup.style.transform =
                    `translate(${baseX}px, ${baseY}px)`;
                this._offsetX = baseX;
                this._offsetY = baseY;
            }, ms);
            setTimeout(() => resolve(), resolveMs);
        });
    }

    // Swap facing sprite (back / left / right / front / front_celebrating).
    set_direction(dir) {
        if (!this.is_present || !this.PartnerScaleGroup) return;
        let icon = WorldState.get_person_icon("partner", dir);
        if (!icon) return;
        while (this.PartnerScaleGroup.firstChild) {
            this.PartnerScaleGroup.removeChild(this.PartnerScaleGroup.firstChild);
        }
        this.PartnerIcon = icon;
        this.PartnerScaleGroup.appendChild(icon);
        this._facing = dir;
    }

    // Light success reaction: bounce / dance in place (no speech).
    // Skipped while holding the celebrating pose (joint photo ending).
    celebrate_success() {
        return new Promise(async resolve => {
            if (!this.is_present || !this.PartnerTranslateGroup) {
                resolve();
                return;
            }
            if (this._facing === "front_celebrating") {
                resolve();
                return;
            }

            let baseX = this._offsetX;
            let baseY = this._offsetY;
            this.PartnerTranslateGroup.style.transition = "transform 140ms ease-out";

            const hops = [
                { y: -32, r: -8 },
                { y: 0, r: 6 },
                { y: -24, r: 8 },
                { y: 0, r: -4 },
                { y: -14, r: 4 },
                { y: 0, r: 0 }
            ];

            for (let i = 0; i < hops.length; i++) {
                let hop = hops[i];
                this.PartnerTranslateGroup.style.transform =
                    `translate(${baseX}px, ${baseY + hop.y}px) rotate(${hop.r}deg)`;
                await wait(140);
            }

            this.set_offset(baseX, baseY, 0);
            resolve();
        });
    }
}

class GeneralTrialController {

    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        // Instantiating our workers
        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.toy = new StandardToyModule(FenObj); // Defaults to the correct toy
        this.wrong_toy = null; // Will instantiate if needed
        this.partner = new PartnerModule(partner_is_present);
    }

    // --- SCENARIO BRANCHING LOGIC ---

    async appear_fennimal_with_name_prompt() {
        if (this.basics.Fennimal) return;
        await this.basics.create_and_appear_Fennimal(
            this.basics.ItemLayers.Main,
            0.4 * this.basics.W,
            0.8 * this.basics.H,
            1.75,
            250
        );
        AudioCont.play_sound_effect("alert");
        Interface.Prompt.show_message("This Fennimal is called " + this.FenObj.name);
        await wait(1000);
    }

    async appear_correct_toy_on_fennimal() {
        let bodyCenter = getSVGInternalCenter(this.basics.TargetPoints.Fennimal_body_center);
        await this.toy.create_and_appear_toy(
            this.basics.ItemLayers.Plus1,
            "main",
            bodyCenter.x,
            bodyCenter.y,
            4,
            200
        );
        Interface.Prompt.show_message(this.FenObj.name + " would like to play with the " + this.FenObj.toy);
        await wait(1000);
    }

    async run_ask_toy_step() {
        if (!this.FenObj.ask_toy) return;

        this.FenObj.toy_errors_made = [];
        let options = Array.isArray(this.FenObj.toys_asked) ? [...this.FenObj.toys_asked] : [];
        if (this.FenObj.toy && !options.includes(this.FenObj.toy)) {
            options.push(this.FenObj.toy);
            console.warn("ask_toy: FenObj.toy was missing from toys_asked; added it.");
        }
        if (options.length === 0) {
            console.warn("ask_toy: no toys_asked options; skipping question.");
            return;
        }

        let bar = new ToyChoiceBar(
            this.basics.ItemLayers.Plus2,
            this.basics.W,
            this.basics.H
        );

        while (true) {
            Interface.Prompt.show_message(
                "Which toy does this " + this.FenObj.name + " like to play with?"
            );
            let selected = await bar.waitForSelection(shuffleArray([...options]));

            if (selected === this.FenObj.toy) {
                AudioCont.play_sound_effect("positive");
                await bar.hide();
                let burstCenter = getSVGInternalCenter(
                    this.basics.TargetPoints.Fennimal_body_center || this.basics.Fennimal
                );
                await spawn_confetti_burst(
                    this.basics.ItemLayers.Plus2,
                    burstCenter.x,
                    burstCenter.y,
                    { awaitPopMs: 900 }
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

    async run_ask_box_step() {
        if (!this.FenObj.ask_box) return;

        this.FenObj.box_errors_made = [];
        let options = Array.isArray(this.FenObj.boxes_asked) ? [...this.FenObj.boxes_asked] : [];
        if (this.FenObj.toybox && !options.includes(this.FenObj.toybox)) {
            options.push(this.FenObj.toybox);
            console.warn("ask_box: FenObj.toybox was missing from boxes_asked; added it.");
        }
        if (options.length === 0) {
            console.warn("ask_box: no boxes_asked options; skipping question.");
            return;
        }

        let bar = new BoxChoiceBar(
            this.basics.ItemLayers.Plus2,
            this.basics.W,
            this.basics.H
        );

        while (true) {
            Interface.Prompt.show_message(
                "Which box does " + this.FenObj.name + " keep their toy in?"
            );
            let selected = await bar.waitForSelection(shuffleArray([...options]));

            if (selected === this.FenObj.toybox) {
                AudioCont.play_sound_effect("positive");
                await bar.hide();
                return;
            }

            AudioCont.play_sound_effect("rejected");
            this.FenObj.box_errors_made.push(selected);
            Interface.Prompt.show_message("Oops, you picked the wrong box!");
            await bar.hide();
            await wait(1000);
        }
    }

    async open_existing_box() {
        if (this.partner.is_present) {
            Interface.Prompt.show_message(this.partner.partnername + " opens the " + this.box.boxname);
            await this.partner.move_to_element_and_act(this.box.BoxBase, () => this.box.open_box());
            await wait(750);
        } else {
            await new Promise(resolve => {
                this.box.wait_for_user_click("open", () => resolve());
            });
            await wait(750);
        }
    }

    async run_empty_box_intro() {
        await this.appear_fennimal_with_name_prompt();
        await this.appear_correct_toy_on_fennimal();
    }

    async run_correct_toy_intro() {
        await Promise.all([
            this.appear_fennimal_with_name_prompt(),
            this.box.create_and_appear_box(this.basics.ItemLayers.Main, this.basics.ItemLayers.Plus2, 0.7 * this.basics.W, 0.7 * this.basics.H, 4, 100)
        ]);
        await wait(500);

        let boxTarget = getSVGInternalCenter(this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]);
        await this.toy.create_and_appear_toy(this.basics.ItemLayers.Plus1, "main", boxTarget.x, boxTarget.y, 4, 0);

        await this.open_existing_box();

        let dx = getSVGInternalCenter(this.box.BoxBase).x - getSVGInternalCenter(this.basics.Fennimal).x - 200;
        await this.basics.Fennimal_move_relative(dx, 0, 500);

        this.basics.ItemLayers.Plus2.appendChild(this.toy.ToyElement);

        // Calculate the *future* center of the Fennimal!
        let bodyCenter = getSVGInternalCenter(this.basics.TargetPoints.Fennimal_body_center);
        let futureBodyCenter = { x: bodyCenter.x - dx, y: bodyCenter.y };

        // The toy pops up, and the moment it starts sliding to the future center,
        // the callback triggers the Fennimal to slide with it!
        await this.toy.animate_out_of_box_to_target(futureBodyCenter, () => {
            this.basics.Fennimal_move_relative(-dx, 0, 500);
        });
    }

    async run_wrong_toy_intro() {
        await Promise.all([
            this.appear_fennimal_with_name_prompt(),
            this.box.create_and_appear_box(this.basics.ItemLayers.Main, this.basics.ItemLayers.Plus2, 0.7 * this.basics.W, 0.7 * this.basics.H, 4, 100)
        ]);
        await wait(500);

        // FIX 1: Use StandardToyModule and pass a mock FenObj with the wrong toy's name
        this.wrong_toy = new StandardToyModule({ toy: this.current_contents });

        let boxTarget = getSVGInternalCenter(this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]);
        await this.wrong_toy.create_and_appear_toy(this.basics.ItemLayers.Plus1, "wrong", boxTarget.x, boxTarget.y, 4, 0);

        await this.open_existing_box();

        // Fennimal approaches box
        let dx = getSVGInternalCenter(this.box.BoxBase).x - getSVGInternalCenter(this.basics.Fennimal).x - 200;
        await this.basics.Fennimal_move_relative(dx, 0, 500);

        // FIX 2: Call .ToyElement instead of .Toy
        this.basics.ItemLayers.Plus2.appendChild(this.wrong_toy.ToyElement);

        // Fire our newly updated 2-step sequence!
        Interface.Prompt.show_message(this.FenObj.name + " throws the " +  this.current_contents + " away");
        await this.wrong_toy.discard_to_right();
        await wait(750)

        // Correct toy magically appears in hands
        let bodyCenter = getSVGInternalCenter(this.basics.TargetPoints.Fennimal_body_center);
        await this.toy.create_and_appear_toy(this.basics.ItemLayers.Plus2, "main", bodyCenter.x, bodyCenter.y, 4, 200);

        Interface.Prompt.show_message(this.FenObj.name + " would like to play with the " +  this.FenObj.toy + " instead");
        await wait(750)

        // Fennimal AND the new correct toy move back to start position together
        this.toy.move_relative(-dx, 0, 500);
        await this.basics.Fennimal_move_relative(-dx, 0, 500);
    }

    // --- ORCHESTRATOR METHODS ---

    async start_sequence() {
        // Setup Layers
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }
        await this.basics.create_background_mask(true, 500);

        // Fennimal first; optional ask_toy quiz before any toy / box branching.
        await this.appear_fennimal_with_name_prompt();
        await this.run_ask_toy_step();

        // Determine World State
        this.current_contents = WorldState.get_toybox_contents(this.FenObj.toybox);

        // BRANCHING INTRO
        if (!this.current_contents) {
            await this.appear_correct_toy_on_fennimal();
        } else if (this.current_contents === this.FenObj.toy) {
            await this.run_correct_toy_intro();
        } else {
            await this.run_wrong_toy_intro();
        }

        //Charging the toy
        await this.toy.charge_toy(this.basics.ItemLayers.Plus2, 0.5 * this.basics.W, 0.4 * this.basics.H, this.basics);

        // CONVERGENCE: Play Sequence
        await this.toy.play_with_toy(this.basics);
        await wait(500);
        Interface.Prompt.show_message(this.FenObj.name + " has finished playing with the " + this.FenObj.toy);
        await wait(500);

        // Move Fennimal aside and discard toy
        this.basics.Fennimal_move_relative(-400, 0, 500);
        await this.toy.done_playing();

        // Box Setup
        if (!this.current_contents) {
            // Box wasn't spawned yet in the Empty Flow
            Interface.Prompt.show_message("Let's keep the " + this.FenObj.toy + " safe in the " + this.box.boxname);
            await this.box.create_and_appear_box(this.basics.ItemLayers.Main, this.basics.ItemLayers.Plus2, 0.7 * this.basics.W, 0.7 * this.basics.H, 4, 100);
            await wait(1500);

            if (this.partner.is_present) {
                Interface.Prompt.show_message(this.partner.partnername + " opens the " + this.box.boxname);
                await this.partner.move_to_element_and_act(this.box.BoxBase, () => this.box.open_box());
                await wait(500);
                this.handle_box_opened();
            } else {
                this.box.wait_for_user_click("open", () => this.handle_box_opened());
            }
        } else {
            // Box is already spawned and open from the Correct/Wrong flows
            this.handle_box_opened();
        }
    }

    async handle_box_opened() {
        Interface.Prompt.show_message("Place the " + this.FenObj.toy + " into the " + this.box.boxname);
        AudioCont.play_sound_effect("alert_minor");

        new MakeObjectDraggableObject(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            this.toy.ToyElement, // Note: Use this.toyLogic or this.brokenToyLogic in the other classes!
            this.box.BoxBase,
            200, // The newly expanded drop radius!

            // The callback now receives the exact SVG element that was dragged
            (DroppedToyElement) => {
                shared_toy_drop_sequence(
                    DroppedToyElement, // The element we just caught
                    this.box,
                    this.basics,
                    this.partner,
                    this.FenObj,
                    () => this.finish_trial() // Safely triggers the end of the trial
                );
            }
        );
    }

    async finish_trial() {
        Interface.Prompt.show_message(this.FenObj.name + " is happy that you're keeping the " + this.FenObj.toy + " safe!");
        await this.basics.perform_success_celebration(this.box.BoxBase);
        this.returnfunc();
    }

    clean_up() {
        this.basics.clean_up();
        this.box.clean_up();
        this.toy.clean_up();
        if (this.wrong_toy) this.wrong_toy.clean_up();
        // Remove the full partner stack (BaseGroup), not only TranslateGroup — a leftover
        // scale(40) partner in the corner covers watchtower / Fennefinder hit targets.
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
        else if (this.partner.PartnerTranslateGroup) this.partner.PartnerTranslateGroup.remove();
    }
}

// Play with the correct toy, celebrate in place (no box), then wander off-screen.
class FennimalToyTrialController extends GeneralTrialController {
    async start_sequence() {
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }
        await this.basics.create_background_mask(true, 500);

        // No box in this trial type: Fennimal → optional ask_toy → toy on Fennimal → play.
        await this.appear_fennimal_with_name_prompt();
        await this.run_ask_toy_step();
        await this.appear_correct_toy_on_fennimal();

        await this.toy.charge_toy(this.basics.ItemLayers.Plus2, 0.5 * this.basics.W, 0.4 * this.basics.H, this.basics);
        await this.toy.play_with_toy(this.basics);
        await wait(500);
        Interface.Prompt.show_message(this.FenObj.name + " has finished playing with the " + this.FenObj.toy);
        await wait(500);

        this.basics.Fennimal_move_relative(-400, 0, 500);
        await this.toy.done_playing();

        await this.basics.perform_success_celebration(null);

        await wait(750);
        Interface.Prompt.show_message(this.FenObj.name + " has wandered off...");

        let fenCenter = getSVGInternalCenter(this.basics.Fennimal);
        let dxOffscreen = -(fenCenter.x + 300);
        await this.basics.Fennimal_move_relative(dxOffscreen, 0, 750);

        await wait(1000);
        this.returnfunc();
    }
}

// No Fennimal: discarded toy in the middle, then store it in its toybox.
class ToyToBoxTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.toy = new StandardToyModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);

        this.old_toy = null;
        this.old_sack = null;
        this.oldItemDragController = null;
        this.groundY = null;
        this.boxY = null;
        this.boxScale = 4;
        this.sackScale = 3;
        this.sackBoxShrinkFactor = 0.65;
        this.binProximityX = 220;
        this.binBack = null;
        this.binFront = null;
        this.binCenter = null;
        this.binAboveLeft = null;
        this.binAboveRight = null;
        this.binStackCount = 0;
        this.clearMode = null; // "sack" | "toy" | null
    }

    getScaledTemplateHalfWidth(elementId, scale) {
        let template = document.getElementById(elementId);
        if (!template) return 180 * (scale / 4);

        let box = template.getBBox();
        return (Math.max(box.width, 1) * scale) / 2;
    }

    async start_sequence() {
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }
        await this.basics.create_background_mask(true, 500);

        const toyScale = this.boxScale;
        const boxScale = this.boxScale;
        const boxCenterX = 0.5 * this.basics.W;
        const toyCenterY = 0.55 * this.basics.H;
        this.boxY = 0.7 * this.basics.H;

        let toyHalfW = this.getScaledTemplateHalfWidth("toy_" + this.FenObj.toy, toyScale);
        let boxHalfW = this.getScaledTemplateHalfWidth("toybox_" + this.FenObj.toybox, boxScale);
        let toyCenterX = pick_flanking_item_x(
            this.basics.W,
            boxCenterX,
            boxHalfW,
            toyHalfW
        );

        await this.toy.create_and_appear_toy(
            this.basics.ItemLayers.Plus1,
            "main",
            toyCenterX,
            toyCenterY,
            toyScale,
            200
        );

        // Match the "discarded" look used after play sequences.
        this.toy.ToyElement.style.transition = "all 200ms ease-out";
        this.toy.ToyElement.style.transform += "translate(0px, 150px)";
        await wait(200);
        this.groundY = getSVGInternalCenter(this.toy.ToyElement).y;

        Interface.Prompt.show_message("Oops! The " + this.FenObj.toy + " has been left behind");
        await wait(750);

        Interface.Prompt.show_message("Let's keep the " + this.FenObj.toy + " safe in the " + this.box.boxname);

        await this.box.create_and_appear_box(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            boxCenterX,
            this.boxY,
            boxScale,
            100
        );
        await wait(750);

        // Prefer showing a wrapping sack over a bare toy when clearing.
        let boxEntry = WorldState.get_toybox_entry(this.FenObj.toybox);
        let currentSack = boxEntry ? boxEntry.sack : false;
        let currentToy = boxEntry ? boxEntry.toy : false;

        if (currentSack) {
            this.clearMode = "sack";
            this.boxNeedsClearing = true;
        } else if (currentToy && currentToy !== this.FenObj.toy) {
            this.clearMode = "toy";
            this.boxNeedsClearing = true;
        } else {
            this.clearMode = null;
            this.boxNeedsClearing = false;
        }

        if (this.clearMode === "sack") {
            this.create_toy_bin();
            this.old_sack = new SackModule({ sack: currentSack });
            let boxTarget = getSVGInternalCenter(this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]);
            await this.old_sack.create_and_appear_closed_sack_item(
                this.basics.ItemLayers.Plus1,
                boxTarget.x,
                boxTarget.y,
                this.sackScale * this.sackBoxShrinkFactor,
                0
            );
        } else if (this.clearMode === "toy") {
            this.create_toy_bin();
            this.old_toy = new StandardToyModule({ toy: currentToy });
            let boxTarget = getSVGInternalCenter(this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]);
            await this.old_toy.create_and_appear_toy(
                this.basics.ItemLayers.Plus1,
                "old_box_contents",
                boxTarget.x,
                boxTarget.y,
                boxScale,
                0
            );
        }

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

        // Let the player grab toys through the open box artwork; restored before close.
        this.box.set_pointer_events_enabled(false);

        if (this.boxNeedsClearing) {
            await this.clear_occupied_box();
        }

        this.handle_box_opened();
    }

    create_toy_bin() {
        let template = document.getElementById("toy_bin");
        if (!template) {
            console.error("toy_to_box: #toy_bin not found in SVG assets");
            return;
        }

        let binX = 0.1 * this.basics.W;
        let binY = this.boxY + 50;
        let scale = this.boxScale;

        this.binBack = copy_scale_and_move_object_to_position(
            template,
            this.basics.ItemLayers.Main,
            binX,
            binY,
            scale,
            "toy_to_box_toy_bin_back"
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
            "toy_to_box_toy_bin_front"
        );
        let backOnFront = this.binFront.querySelector(".toy_bin_back");
        if (backOnFront) backOnFront.remove();
        this.binFront.style.pointerEvents = "none";

        this.binCenter = getSVGInternalCenter(this.binBack);
        this.binAboveLeft = { x: this.binCenter.x - 45, y: this.binCenter.y - 200 };
        this.binAboveRight = { x: this.binCenter.x + 45, y: this.binCenter.y - 200 };
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

    clearBoxWorldState() {
        let oldSackId = this.old_sack ? this.old_sack.FenObj.sack : null;
        WorldState.clear_toybox_contents(this.FenObj.toybox);
        if (oldSackId) {
            WorldState.clear_sack_contents(oldSackId);
        }
        if (this.partner.is_present) {
            WorldState.change_partner_belief_in_box_contents(this.FenObj.toybox, false);
        }
    }

    async animateToyIntoBin(toyElement) {
        let stackIndex = this.binStackCount;
        this.binStackCount++;

        let above = (stackIndex % 2 === 0) ? this.binAboveLeft : this.binAboveRight;
        let finalX = this.binCenter.x + ((stackIndex % 2 === 0) ? -35 : 35);
        let finalY = this.binCenter.y + 55 - stackIndex * 22;

        this.basics.ItemLayers.Main.appendChild(toyElement);
        await this.animateToyToPoint(toyElement, above.x, above.y, 280);
        toyElement.style.transition = "transform 400ms ease-in";
        let cur = getSVGInternalCenter(toyElement);
        toyElement.style.transform += ` translate(${finalX - cur.x}px, ${finalY - cur.y}px)`;
        await wait(420);
    }

    async animateToyToPoint(toyElement, targetX, targetY, ms = 450) {
        let current = getSVGInternalCenter(toyElement);
        let dx = targetX - current.x;
        let dy = targetY - current.y;
        toyElement.style.transition = `transform ${ms}ms ease-in-out`;
        toyElement.style.transform += ` translate(${dx}px, ${dy}px)`;
        await wait(ms);
    }

    async clear_occupied_box() {
        if (!this.binCenter) {
            this.create_toy_bin();
        }

        let dragElement = null;
        let label = "";
        if (this.clearMode === "sack") {
            label = this.old_sack.sackname;
            dragElement = this.old_sack.SackItem;
            Interface.Prompt.show_message("There is already a " + label + " in the " + this.box.boxname);
        } else {
            label = this.old_toy.FenObj.toy;
            dragElement = this.old_toy.ToyElement;
            Interface.Prompt.show_message("There is already a " + label + " in the " + this.box.boxname);
        }
        await wait(1200);

        Interface.Prompt.show_message(
            this.clearMode === "sack"
                ? "Drag the old sack into the toy bin"
                : "Drag the old toy into the toy bin"
        );
        AudioCont.play_sound_effect("alert_minor");

        await new Promise((resolve) => {
            dragElement.style.pointerEvents = "auto";
            this.oldItemDragController = new MakeObjectDraggableObject(
                this.basics.ItemLayers.Main,
                this.basics.ItemLayers.Plus2,
                dragElement,
                this.binBack || this.binFront,
                this.binProximityX,
                async (DraggedElement) => {
                    if (this.oldItemDragController && this.oldItemDragController.destroy) {
                        this.oldItemDragController.destroy();
                    }
                    this.oldItemDragController = null;
                    DraggedElement.style.pointerEvents = "none";
                    DraggedElement.style.cursor = "auto";
                    if (this.clearMode === "sack" && this.old_sack) {
                        this.old_sack.play_placed_sfx();
                    }
                    await this.animateToyIntoBin(DraggedElement);
                    this.clearBoxWorldState();
                    Interface.Prompt.hide();
                    resolve();
                },
                {
                    validateDrop: () => {
                        if (!this.binCenter) return false;
                        let itemCenter = getSVGInternalCenter(dragElement);
                        return Math.abs(itemCenter.x - this.binCenter.x) <= this.binProximityX;
                    },
                    onMiss: () => {
                        Interface.Prompt.show_message(
                            this.clearMode === "sack"
                                ? "Drop the sack near the toy bin"
                                : "Drop the toy near the toy bin"
                        );
                        if (this.oldItemDragController && this.oldItemDragController.enable) {
                            this.oldItemDragController.enable();
                        }
                    }
                }
            );
        });
    }

    handle_box_opened() {
        Interface.Prompt.show_message("Please place the " + this.FenObj.toy + " in the " + this.box.boxname);
        AudioCont.play_sound_effect("alert_minor");

        new MakeObjectDraggableObject(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            this.toy.ToyElement,
            this.box.BoxBase,
            200,
            (DroppedToyElement) => {
                shared_toy_drop_sequence(
                    DroppedToyElement,
                    this.box,
                    this.basics,
                    this.partner,
                    this.FenObj,
                    () => this.after_toy_placed()
                );
            }
        );
    }

    async after_toy_placed() {
        // Hide after shut so protruding parts cannot leak the quiz answer.
        if (this.toy && this.toy.ToyElement) {
            this.toy.ToyElement.style.transition = "opacity 150ms ease-in";
            this.toy.ToyElement.style.opacity = 0;
            await wait(150);
        }
        await this.run_placement_quiz();
    }

    getPlacementQuizOptions() {
        let options = Array.isArray(this.FenObj.placement_quiz_options)
            ? [...this.FenObj.placement_quiz_options]
            : [];
        if (this.FenObj.toy && !options.includes(this.FenObj.toy)) {
            options.push(this.FenObj.toy);
        }
        return options.filter(Boolean);
    }

    /**
     * Attention check after box close: which toy was just placed?
     * Wrong → reopen, lift toy, show, lower, close, retry.
     */
    async run_placement_quiz() {
        let options = this.getPlacementQuizOptions();
        if (options.length === 0) {
            console.warn("toy_to_box: no toys for placement quiz; skipping.");
            Interface.Prompt.show_message(
                "The " + this.FenObj.toy + " is now safely in the " + this.box.boxname + "!"
            );
            await wait(1600);
            Interface.Prompt.hide();
            this.finish_trial();
            return;
        }

        this.FenObj.placement_errors = [];
        let bar = new ToyChoiceBar(
            this.basics.ItemLayers.Questions,
            this.basics.W,
            this.basics.H
        );

        while (true) {
            Interface.Prompt.show_message("Which toy did you just place in this box?");
            let selected = await bar.waitForSelection(shuffleArray([...options]));

            if (selected === this.FenObj.toy) {
                AudioCont.play_sound_effect("positive");
                await bar.hide();
                let burstCenter = getSVGInternalCenter(this.box.BoxBase);
                await spawn_confetti_burst(
                    this.basics.ItemLayers.Plus2,
                    burstCenter.x,
                    burstCenter.y,
                    { awaitPopMs: 900 }
                );
                Interface.Prompt.show_message(
                    "The " + this.FenObj.toy + " is now safely in the " + this.box.boxname + "!"
                );
                await wait(1600);
                Interface.Prompt.hide();
                this.finish_trial();
                return;
            }

            AudioCont.play_sound_effect("rejected");
            this.FenObj.placement_errors.push(selected);
            await bar.hide();
            await this.reveal_placed_toy();
        }
    }

    async open_box_for_reveal() {
        this.box.set_pointer_events_enabled(true);
        if (this.partner.is_present) {
            Interface.Prompt.show_message(this.partner.partnername + " opens the " + this.box.boxname);
            await this.partner.move_to_element_and_act(this.box.BoxBase, () => this.box.open_box());
            await wait(300);
        } else {
            await new Promise((resolve) => {
                this.box.wait_for_user_click("open", () => resolve());
            });
            await wait(200);
        }
        this.box.set_pointer_events_enabled(false);
    }

    async close_box_for_reveal() {
        this.box.set_pointer_events_enabled(true);
        if (this.partner.is_present) {
            Interface.Prompt.show_message(this.partner.partnername + " closes the " + this.box.boxname);
            await this.partner.move_to_element_and_act(this.box.BoxBase, () => this.box.close_box());
            await wait(250);
        } else {
            await new Promise((resolve) => {
                this.box.wait_for_user_click("close", () => resolve());
            });
            await wait(150);
        }
        this.box.set_pointer_events_enabled(false);

        if (this.toy && this.toy.ToyElement) {
            this.toy.ToyElement.style.transition = "opacity 250ms ease-in";
            this.toy.ToyElement.style.opacity = 0;
            await wait(250);
        }
    }

    /** Wrong-answer remediation: open → show toy under lid → lift → present → lower → close. */
    async reveal_placed_toy() {
        let toyEl = this.toy && this.toy.ToyElement;
        if (!toyEl) {
            console.warn("toy_to_box: missing placed toy for reveal; reopening without lift.");
            await this.open_box_for_reveal();
            await wait(1000);
            await this.close_box_for_reveal();
            return;
        }

        // Park behind the still-closed lid at full opacity so it is visible the
        // instant the box opens (no post-open fade lag).
        toyEl.style.pointerEvents = "none";
        this.basics.ItemLayers.Plus1.appendChild(toyEl);
        toyEl.style.transition = "none";
        toyEl.style.opacity = 1;
        void toyEl.getBoundingClientRect();

        await this.open_box_for_reveal();

        let boxTargetEl = this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0];
        let boxTarget = getSVGInternalCenter(boxTargetEl);
        let presentY = boxTarget.y - 400;

        await this.animateToyToPoint(toyEl, boxTarget.x, presentY, 450);
        await wait(1000);
        await this.animateToyToPoint(toyEl, boxTarget.x, boxTarget.y, 450);

        await this.close_box_for_reveal();
    }

    async finish_trial() {
        await wait(500);
        this.returnfunc();
    }

    clean_up() {
        if (this.oldItemDragController && this.oldItemDragController.destroy) {
            this.oldItemDragController.destroy();
            this.oldItemDragController = null;
        }
        if (this.oldToyDragController && this.oldToyDragController.destroy) {
            this.oldToyDragController.destroy();
            this.oldToyDragController = null;
        }
        this.basics.clean_up();
        this.box.clean_up();
        this.toy.clean_up();
        if (this.old_toy) this.old_toy.clean_up();
        if (this.old_sack) this.old_sack.clean_up();
        this.remove_toy_bin();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
        else if (this.partner.PartnerTranslateGroup) this.partner.PartnerTranslateGroup.remove();
    }
}

/**
 * Phone-room variant of toy_to_box: partner is called away, player reuses a box alone,
 * then walks home manually with the partner rejoining on the map.
 * Reality (box contents) updates; partner beliefs do not.
 */
class SwitchBoxWithoutPartnerTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        // Hard-force partner for this interaction type (ignore phase partner_presence).
        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.toy = new StandardToyModule(FenObj);
        this.partner = new PartnerModule(true);

        this.old_toy = null;
        this.old_sack = null;
        this.oldItemDragController = null;
        this.toyDragController = null;
        this.clearMode = null;
        this.boxNeedsClearing = false;
        this.partnerLeftScene = false;

        this.boxScale = 4;
        this.previewBoxScale = 2;
        this.sackScale = 3;
        this.sackBoxShrinkFactor = 0.65;
        this.binProximityX = 220;

        this.Backpack = null;
        this.previewBoxes = []; // { toybox, module, group }
        this.boxY = null;
    }

    getScaledTemplateHalfWidth(elementId, scale) {
        let template = document.getElementById(elementId);
        if (!template) return 180 * (scale / 4);
        let box = template.getBBox();
        return (Math.max(box.width, 1) * scale) / 2;
    }

    pickDiversionLocation() {
        let region = this.FenObj.region;
        let regionData = GenParam.RegionData[region];
        let locations = regionData && Array.isArray(regionData.Locations)
            ? regionData.Locations.slice()
            : [];

        let occupied = new Set();
        if (typeof topController !== "undefined" && topController.currentPhaseData) {
            let phaseFens = topController.currentPhaseData.Fennimals_in_phase || [];
            phaseFens.forEach((f) => {
                if (f && f.location) occupied.add(f.location);
            });
        }
        occupied.add(this.FenObj.location);

        let candidates = locations.filter((loc) => !occupied.has(loc));
        if (candidates.length === 0) {
            candidates = locations.filter((loc) => loc !== this.FenObj.location);
        }
        if (candidates.length === 0) {
            console.warn("switch_box_without_partner: no diversion location found; using current.");
            return this.FenObj.location;
        }
        return shuffleArray(candidates)[0];
    }

    getBoxesInSubblock() {
        if (Array.isArray(this.FenObj.boxes_in_subblock) && this.FenObj.boxes_in_subblock.length > 0) {
            return this.FenObj.boxes_in_subblock.slice();
        }
        return this.FenObj.toybox ? [this.FenObj.toybox] : [];
    }

    async start_sequence() {
        this.FenObj.force_partner_present = true;
        this.FenObj.return_travel = "manual";
        this.FenObj.partner_diversion_location = this.pickDiversionLocation();

        this.basics.create_svg_sublayers();
        this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        await this.basics.create_background_mask(true, 500);

        const toyScale = this.boxScale;
        const toyCenterY = 0.55 * this.basics.H;
        const toyCenterX = 0.32 * this.basics.W;
        this.boxY = 0.7 * this.basics.H;

        await this.toy.create_and_appear_toy(
            this.basics.ItemLayers.Plus1,
            "main",
            toyCenterX,
            toyCenterY,
            toyScale,
            200
        );
        this.toy.ToyElement.style.transition = "all 200ms ease-out";
        this.toy.ToyElement.style.transform += "translate(0px, 150px)";
        await wait(200);

        await this.run_partner_phone_departure();
        await this.run_backpack_box_selection();
        await this.run_box_clear_and_place();
    }

    async run_partner_phone_departure() {
        AudioCont.play_sound_effect("partner_cellphone");
        await wait(1200);

        this.partner.set_direction("back_phone");
        await this.partner.animate_offset(-180, -40, 450);
        await wait(750);

        this.partner.set_direction("front");
        await wait(200);

        let diversionLabel = GenParam.get_display_name_of_location(this.FenObj.partner_diversion_location);
        let bubbleText =
            `There's a minor situation over at ${diversionLabel}. ` +
            `I'll go check it out. I'll leave my backpack here — can you take care of things here while I'm gone?`;
        if (typeof Interface.showPartnerSpeechBubble === "function") {
            await Interface.showPartnerSpeechBubble({
                target: this.partner.PartnerBaseGroup,
                context: "location",
                text: bubbleText,
                buttonLabel: "No problem!"
            });
        } else if (typeof PartnerSpeechBubbleController === "function") {
            Interface.PartnerSpeechBubble = new PartnerSpeechBubbleController();
            await Interface.PartnerSpeechBubble.show({
                target: this.partner.PartnerBaseGroup,
                context: "location",
                text: bubbleText,
                buttonLabel: "No problem!"
            });
        } else {
            console.error(
                "PartnerSpeechBubble missing — hard-refresh the page (Ctrl+Shift+R) so 3_Interface.js reloads."
            );
            // Unblock the trial if a stale Interface.js is cached.
            await wait(800);
        }

        this.partner.set_direction("right");
        await this.partner.animate_offset(700, -40, 650);
        this.partner.PartnerBaseGroup.style.transition = "opacity 300ms ease-in";
        this.partner.PartnerBaseGroup.style.opacity = 0;
        await wait(320);
        this.partner.PartnerBaseGroup.style.display = "none";
        this.partnerLeftScene = true;
        this.partner.is_present = false;

        await wait(250);
    }

    async run_backpack_box_selection() {
        this.spawn_backpack();
        await this.fade_in_backpack(350);
        Interface.Prompt.show_message("Click to open the backpack");
        AudioCont.play_sound_effect("alert_minor");
        await this.wait_for_backpack_open_click();
        await this.open_backpack();

        let boxIds = this.getBoxesInSubblock();
        if (!boxIds.includes(this.FenObj.toybox)) boxIds.push(this.FenObj.toybox);

        await this.pop_boxes_from_backpack(boxIds);
        Interface.Prompt.show_message(
            `Oops! We don't have enough boxes. Lets reuse the ${this.box.boxname}!`
        );
        await wait(900);
        await this.focus_target_box_and_stow_others();
    }

    spawn_backpack() {
        let template = document.getElementById("backpack");
        if (!template) {
            console.error("switch_box_without_partner: #backpack not found");
            return;
        }
        this.Backpack = copy_scale_and_move_object_to_position(
            template,
            this.basics.ItemLayers.Plus1,
            0.88 * this.basics.W,
            0.78 * this.basics.H,
            3
        );
        this.Backpack.id = "switch_box_backpack";
        this.Backpack.style.opacity = 0;
        let flaps = this.Backpack.getElementsByClassName("backpack_flap");
        for (let i = 0; i < flaps.length; i++) {
            flaps[i].style.display = "inherit";
            if (flaps[i].id && flaps[i].id.includes("closed")) flaps[i].style.opacity = 1;
            if (flaps[i].id && flaps[i].id.includes("open")) flaps[i].style.opacity = 0;
        }
    }

    async fade_in_backpack(ms = 350) {
        if (!this.Backpack) return;
        this.Backpack.style.transition = `opacity ${ms}ms ease-in`;
        void this.Backpack.getBoundingClientRect();
        this.Backpack.style.opacity = 1;
        await wait(ms);
    }

    wait_for_backpack_open_click() {
        return new Promise((resolve) => {
            if (!this.Backpack) {
                resolve();
                return;
            }
            this.Backpack.style.cursor = "pointer";
            this.Backpack.style.pointerEvents = "auto";

            let outline = create_SVG_outline_of_group_ID(this.Backpack);
            this.Backpack.parentNode.insertBefore(outline, this.Backpack);
            outline.classList.add("focus_on_SVG_outline");

            const onClick = () => {
                this.Backpack.onpointerdown = null;
                this.Backpack.style.cursor = "auto";
                if (outline && outline.parentNode) outline.remove();
                resolve();
            };
            this.Backpack.onpointerdown = onClick;
        });
    }

    open_backpack() {
        if (!this.Backpack) return wait(0);
        let flaps = this.Backpack.getElementsByClassName("backpack_flap");
        for (let i = 0; i < flaps.length; i++) {
            flaps[i].style.display = "inherit";
            flaps[i].style.transition = "opacity 250ms ease-in-out";
            if (flaps[i].id && flaps[i].id.includes("closed")) flaps[i].style.opacity = 0;
            if (flaps[i].id && flaps[i].id.includes("open")) flaps[i].style.opacity = 1;
        }
        return wait(280);
    }

    get_preview_slot_ys(count) {
        let top = 0.22 * this.basics.H;
        let bottom = 0.55 * this.basics.H;
        if (count <= 1) return [(top + bottom) / 2];
        let ys = [];
        for (let i = 0; i < count; i++) {
            ys.push(top + (i / (count - 1)) * (bottom - top));
        }
        return ys;
    }

    async pop_boxes_from_backpack(boxIds) {
        const x = 0.88 * this.basics.W;
        const startY = 0.78 * this.basics.H - 40;
        const ys = this.get_preview_slot_ys(boxIds.length);
        this.previewBoxes = [];

        for (let i = 0; i < boxIds.length; i++) {
            let toybox = boxIds[i];
            let module = new BoxModule({ toybox: toybox });
            await module.create_and_appear_box(
                this.basics.ItemLayers.Main,
                this.basics.ItemLayers.Plus2,
                x,
                startY,
                this.previewBoxScale,
                120
            );
            let el = module.BoxBase;
            let targetY = ys[i];
            let cur = getSVGInternalCenter(el);
            el.style.transition = "transform 450ms ease-out";
            el.style.transform += ` translate(${0}px, ${targetY - cur.y}px)`;
            if (module.BoxTop) {
                module.BoxTop.style.transition = "transform 450ms ease-out";
                module.BoxTop.style.transform += ` translate(${0}px, ${targetY - cur.y}px)`;
            }
            this.previewBoxes.push({ toybox, module });
            await wait(120);
        }
        await wait(400);
    }

    async focus_target_box_and_stow_others() {
        let targetEntry = this.previewBoxes.find((b) => b.toybox === this.FenObj.toybox);
        let others = this.previewBoxes.filter((b) => b.toybox !== this.FenObj.toybox);
        let backpackCenter = this.Backpack
            ? getSVGInternalCenter(this.Backpack)
            : { x: 0.88 * this.basics.W, y: 0.78 * this.basics.H };

        for (let entry of others) {
            await this.animate_box_into_backpack(entry.module, backpackCenter);
            entry.module.clean_up();
        }

        const boxCenterX = 0.5 * this.basics.W;
        const boxCenterY = this.boxY;

        if (targetEntry && targetEntry.module && targetEntry.module.BoxBase) {
            let start = getSVGInternalCenter(targetEntry.module.BoxBase);
            // Spawn the working-size box on the preview, then slide+scale feel via translate to center.
            await this.box.create_and_appear_box(
                this.basics.ItemLayers.Main,
                this.basics.ItemLayers.Plus2,
                start.x,
                start.y,
                this.boxScale,
                120
            );
            targetEntry.module.clean_up();
            this.previewBoxes = [];
            await this.animate_box_module_to_point(this.box, boxCenterX, boxCenterY, 550);
        } else {
            this.previewBoxes = [];
            await this.box.create_and_appear_box(
                this.basics.ItemLayers.Main,
                this.basics.ItemLayers.Plus2,
                boxCenterX,
                boxCenterY,
                this.boxScale,
                180
            );
            await wait(400);
        }
    }

    async animate_box_module_to_point(boxModule, targetX, targetY, ms = 500) {
        if (!boxModule || !boxModule.BoxBase) return;
        let cur = getSVGInternalCenter(boxModule.BoxBase);
        let dx = targetX - cur.x;
        let dy = targetY - cur.y;
        boxModule.BoxBase.style.transition = `transform ${ms}ms ease-in-out`;
        boxModule.BoxBase.style.transform += ` translate(${dx}px, ${dy}px)`;
        if (boxModule.BoxTop) {
            boxModule.BoxTop.style.transition = `transform ${ms}ms ease-in-out`;
            boxModule.BoxTop.style.transform += ` translate(${dx}px, ${dy}px)`;
        }
        await wait(ms);
    }

    async animate_box_into_backpack(boxModule, backpackCenter, options = {}) {
        let el = boxModule.BoxBase;
        let top = boxModule.BoxTop;
        let includeTop = options.includeTop !== false && top;
        if (!el) return;

        // Keep the crate above the backpack so the shrink/fade is visible (Base lives on Main).
        let overlay = this.basics.ItemLayers.Plus2;
        if (overlay) {
            overlay.appendChild(el);
            if (includeTop) overlay.appendChild(top);
        }

        let cur = getSVGInternalCenter(el);
        let dx = backpackCenter.x - cur.x;
        let dy = backpackCenter.y - cur.y;

        el.style.transition = "none";
        if (includeTop) top.style.transition = "none";
        void el.getBoundingClientRect();

        el.style.transition = "transform 400ms ease-in, opacity 400ms ease-in";
        el.style.transform += ` translate(${dx}px, ${dy}px) scale(0.4)`;
        el.style.opacity = 0;
        if (includeTop) {
            let topCur = getSVGInternalCenter(top);
            top.style.transition = "transform 400ms ease-in, opacity 400ms ease-in";
            top.style.transform += ` translate(${backpackCenter.x - topCur.x}px, ${backpackCenter.y - topCur.y}px) scale(0.4)`;
            top.style.opacity = 0;
        }
        await wait(420);
    }

    async stow_closed_box_in_backpack() {
        if (this.toy && this.toy.ToyElement) {
            this.toy.ToyElement.style.opacity = 0;
            this.toy.ToyElement.style.pointerEvents = "none";
        }

        if (!this.Backpack) {
            this.spawn_backpack();
            await this.fade_in_backpack(280);
            await this.open_backpack();
        }

        if (this.box && typeof this.box.set_pointer_events_enabled === "function") {
            this.box.set_pointer_events_enabled(true);
        }

        // Keep the full closed crate visible: snap front/lid onto the back before dragging.
        this.syncBoxTopToBase();

        Interface.Prompt.show_message("Put the " + this.box.boxname + " into the backpack");
        AudioCont.play_sound_effect("alert_minor");

        await new Promise((resolve) => {
            let dragEl = this.box.BoxBase;
            dragEl.style.pointerEvents = "auto";
            dragEl.style.cursor = "pointer";

            this.boxStowDragController = new MakeObjectDraggableObject(
                this.basics.ItemLayers.Plus2,
                this.basics.ItemLayers.Plus2,
                dragEl,
                this.Backpack,
                this.binProximityX,
                async (DraggedElement) => {
                    if (this.boxStowDragController && this.boxStowDragController.destroy) {
                        this.boxStowDragController.destroy();
                    }
                    this.boxStowDragController = null;
                    DraggedElement.style.pointerEvents = "none";
                    DraggedElement.style.cursor = "auto";

                    await this.animate_box_into_backpack(
                        this.box,
                        getSVGInternalCenter(this.Backpack),
                        { includeTop: true }
                    );
                    await this.close_backpack();
                    Interface.Prompt.hide();
                    resolve();
                },
                {
                    // Front/lid share one drag group with the back → one outline, one snap-back.
                    extraElements: this.box.BoxTop ? [this.box.BoxTop] : [],
                    validateDrop: () => {
                        if (!this.Backpack) return false;
                        let itemCenter = getSVGInternalCenter(dragEl);
                        let bp = getSVGInternalCenter(this.Backpack);
                        return Math.abs(itemCenter.x - bp.x) <= this.binProximityX
                            && Math.abs(itemCenter.y - bp.y) <= this.binProximityX * 1.4;
                    },
                    onMiss: () => {
                        Interface.Prompt.show_message("Drop the box near the backpack");
                        if (this.boxStowDragController && this.boxStowDragController.enable) {
                            this.boxStowDragController.enable();
                        }
                    }
                }
            );
        });
    }

    syncBoxTopToBase() {
        if (!this.box || !this.box.BoxBase || !this.box.BoxTop) return;
        let baseC = getSVGInternalCenter(this.box.BoxBase);
        let topC = getSVGInternalCenter(this.box.BoxTop);
        this.box.BoxTop.style.transition = "none";
        this.box.BoxTop.style.opacity = 1;
        this.box.BoxTop.style.transform += ` translate(${baseC.x - topC.x}px, ${baseC.y - topC.y}px)`;
        void this.box.BoxTop.getBoundingClientRect();
    }

    async run_box_clear_and_place() {
        let boxEntry = WorldState.get_toybox_entry(this.FenObj.toybox);
        let currentSack = boxEntry ? boxEntry.sack : false;
        let currentToy = boxEntry ? boxEntry.toy : false;

        if (currentSack) {
            this.clearMode = "sack";
            this.boxNeedsClearing = true;
        } else if (currentToy && currentToy !== this.FenObj.toy) {
            this.clearMode = "toy";
            this.boxNeedsClearing = true;
        } else {
            this.clearMode = null;
            this.boxNeedsClearing = false;
        }

        if (this.clearMode === "sack") {
            this.old_sack = new SackModule({ sack: currentSack });
            let boxTarget = getSVGInternalCenter(this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]);
            await this.old_sack.create_and_appear_closed_sack_item(
                this.basics.ItemLayers.Plus1,
                boxTarget.x,
                boxTarget.y,
                this.sackScale * this.sackBoxShrinkFactor,
                0
            );
        } else if (this.clearMode === "toy") {
            this.old_toy = new StandardToyModule({ toy: currentToy });
            let boxTarget = getSVGInternalCenter(this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]);
            await this.old_toy.create_and_appear_toy(
                this.basics.ItemLayers.Plus1,
                "old_box_contents",
                boxTarget.x,
                boxTarget.y,
                this.boxScale,
                0
            );
        }

        Interface.Prompt.show_message("Click to open the " + this.box.boxname);
        await new Promise((resolve) => this.box.wait_for_user_click("open", () => resolve()));
        await wait(400);
        this.box.set_pointer_events_enabled(false);

        if (this.boxNeedsClearing) {
            await this.clear_occupied_box_into_backpack();
        }

        this.handle_box_opened();
    }

    async clear_occupied_box_into_backpack() {
        let dragElement = null;
        let label = "";
        if (this.clearMode === "sack") {
            label = this.old_sack.sackname;
            dragElement = this.old_sack.SackItem;
        } else {
            label = this.old_toy.FenObj.toy;
            dragElement = this.old_toy.ToyElement;
        }

        Interface.Prompt.show_message(`Lets put the ${label} back into the backpack`);
        AudioCont.play_sound_effect("alert_minor");

        let backpackTarget = this.Backpack;
        await new Promise((resolve) => {
            dragElement.style.pointerEvents = "auto";
            this.oldItemDragController = new MakeObjectDraggableObject(
                this.basics.ItemLayers.Main,
                this.basics.ItemLayers.Plus2,
                dragElement,
                backpackTarget,
                this.binProximityX,
                async (DraggedElement) => {
                    if (this.oldItemDragController && this.oldItemDragController.destroy) {
                        this.oldItemDragController.destroy();
                    }
                    this.oldItemDragController = null;
                    DraggedElement.style.pointerEvents = "none";
                    DraggedElement.style.cursor = "auto";
                    await this.animate_item_fade_into_backpack(DraggedElement);
                    this.clearBoxWorldStateRealityOnly();
                    Interface.Prompt.hide();
                    resolve();
                },
                {
                    validateDrop: () => {
                        if (!backpackTarget) return false;
                        let itemCenter = getSVGInternalCenter(dragElement);
                        let bp = getSVGInternalCenter(backpackTarget);
                        return Math.abs(itemCenter.x - bp.x) <= this.binProximityX
                            && Math.abs(itemCenter.y - bp.y) <= this.binProximityX * 1.4;
                    },
                    onMiss: () => {
                        Interface.Prompt.show_message("Drop it near the backpack");
                        if (this.oldItemDragController && this.oldItemDragController.enable) {
                            this.oldItemDragController.enable();
                        }
                    }
                }
            );
        });
    }

    async animate_item_fade_into_backpack(element) {
        if (!element) return;
        let bp = this.Backpack
            ? getSVGInternalCenter(this.Backpack)
            : { x: 0.88 * this.basics.W, y: 0.78 * this.basics.H };
        let cur = getSVGInternalCenter(element);
        element.style.transition = "transform 350ms ease-in, opacity 350ms ease-in";
        element.style.transform += ` translate(${bp.x - cur.x}px, ${bp.y - cur.y}px) scale(0.35)`;
        element.style.opacity = 0;
        await wait(380);
    }

    clearBoxWorldStateRealityOnly() {
        let oldSackId = this.old_sack ? this.old_sack.FenObj.sack : null;
        WorldState.clear_toybox_contents(this.FenObj.toybox);
        if (oldSackId) {
            WorldState.clear_sack_contents(oldSackId);
        }
        // Intentionally do NOT update partner beliefs — partner was not present.
    }

    handle_box_opened() {
        Interface.Prompt.show_message("Please place the " + this.FenObj.toy + " in the " + this.box.boxname);
        AudioCont.play_sound_effect("alert_minor");

        this.toyDragController = new MakeObjectDraggableObject(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            this.toy.ToyElement,
            this.box.BoxBase,
            200,
            (DroppedToyElement) => {
                this.toyDragController = null;
                shared_toy_drop_sequence(
                    DroppedToyElement,
                    this.box,
                    this.basics,
                    this.partner,
                    this.FenObj,
                    () => this.after_toy_placed(),
                    { updatePartnerBelief: false, forceUserClose: true }
                );
            }
        );
    }

    async after_toy_placed() {
        // Keep backpack visible; hide the placed toy so the closed box doesn't leak the answer.
        if (this.toy && this.toy.ToyElement) {
            this.toy.ToyElement.style.transition = "opacity 150ms ease-in";
            this.toy.ToyElement.style.opacity = 0;
            await wait(150);
        }
        await this.run_placement_quiz();
    }

    getPlacementQuizOptions() {
        let options = Array.isArray(this.FenObj.placement_quiz_options)
            ? [...this.FenObj.placement_quiz_options]
            : [];
        if (this.FenObj.toy && !options.includes(this.FenObj.toy)) {
            options.push(this.FenObj.toy);
        }
        return options.filter(Boolean);
    }

    async run_placement_quiz() {
        let options = this.getPlacementQuizOptions();
        if (options.length === 0) {
            Interface.Prompt.show_message(
                "The " + this.FenObj.toy + " is now safely in the " + this.box.boxname + "!"
            );
            await wait(1200);
            Interface.Prompt.hide();
            await this.stow_closed_box_in_backpack();
            this.finish_trial();
            return;
        }

        this.FenObj.placement_errors = [];
        let bar = new ToyChoiceBar(
            this.basics.ItemLayers.Questions,
            this.basics.W,
            this.basics.H
        );

        while (true) {
            Interface.Prompt.show_message(
                "Which toy did you just place in the " + this.box.boxname + "?"
            );
            let selected = await bar.waitForSelection(shuffleArray([...options]));

            if (selected === this.FenObj.toy) {
                AudioCont.play_sound_effect("positive");
                await bar.hide();
                let burstCenter = getSVGInternalCenter(this.box.BoxBase);
                await spawn_confetti_burst(
                    this.basics.ItemLayers.Plus2,
                    burstCenter.x,
                    burstCenter.y,
                    { awaitPopMs: 900 }
                );
                Interface.Prompt.hide();
                await this.stow_closed_box_in_backpack();
                this.finish_trial();
                return;
            }

            AudioCont.play_sound_effect("rejected");
            this.FenObj.placement_errors.push(selected);
            await bar.hide();
            await this.reveal_placed_toy();
        }
    }

    close_backpack() {
        if (!this.Backpack) return wait(0);
        let flaps = this.Backpack.getElementsByClassName("backpack_flap");
        for (let i = 0; i < flaps.length; i++) {
            flaps[i].style.display = "inherit";
            flaps[i].style.transition = "opacity 250ms ease-in-out";
            if (flaps[i].id && flaps[i].id.includes("closed")) flaps[i].style.opacity = 1;
            if (flaps[i].id && flaps[i].id.includes("open")) flaps[i].style.opacity = 0;
        }
        return wait(280);
    }

    async open_box_for_reveal() {
        this.box.set_pointer_events_enabled(true);
        await new Promise((resolve) => this.box.wait_for_user_click("open", () => resolve()));
        await wait(200);
        this.box.set_pointer_events_enabled(false);
    }

    async close_box_for_reveal() {
        this.box.set_pointer_events_enabled(true);
        await new Promise((resolve) => this.box.wait_for_user_click("close", () => resolve()));
        await wait(150);
        this.box.set_pointer_events_enabled(false);
        if (this.toy && this.toy.ToyElement) {
            this.toy.ToyElement.style.transition = "opacity 250ms ease-in";
            this.toy.ToyElement.style.opacity = 0;
            await wait(250);
        }
    }

    async reveal_placed_toy() {
        let toyEl = this.toy && this.toy.ToyElement;
        if (!toyEl) {
            await this.open_box_for_reveal();
            await wait(1000);
            await this.close_box_for_reveal();
            return;
        }

        toyEl.style.transition = "none";
        toyEl.style.opacity = 1;
        await this.open_box_for_reveal();

        let target = this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0];
        let boxPt = getSVGInternalCenter(target || this.box.BoxBase);
        let cur = getSVGInternalCenter(toyEl);
        toyEl.style.transition = "transform 350ms ease-out";
        toyEl.style.transform += ` translate(${boxPt.x - cur.x}px, ${boxPt.y - 120 - cur.y}px)`;
        await wait(900);
        cur = getSVGInternalCenter(toyEl);
        toyEl.style.transition = "transform 300ms ease-in";
        toyEl.style.transform += ` translate(${boxPt.x - cur.x}px, ${boxPt.y - cur.y}px)`;
        await wait(320);
        await this.close_box_for_reveal();
    }

    finish_trial() {
        this.returnfunc();
    }

    clean_up() {
        if (this.oldItemDragController && this.oldItemDragController.destroy) {
            this.oldItemDragController.destroy();
            this.oldItemDragController = null;
        }
        if (this.toyDragController && this.toyDragController.destroy) {
            this.toyDragController.destroy();
            this.toyDragController = null;
        }
        if (Interface.PartnerSpeechBubble) Interface.PartnerSpeechBubble.hide(true);
        this.previewBoxes.forEach((entry) => {
            try { entry.module.clean_up(); } catch (e) { /* ignore */ }
        });
        this.previewBoxes = [];
        if (this.Backpack) {
            this.Backpack.remove();
            this.Backpack = null;
        }
        this.basics.clean_up();
        this.box.clean_up();
        this.toy.clean_up();
        if (this.old_toy) this.old_toy.clean_up();
        if (this.old_sack) this.old_sack.clean_up();
        if (this.boxStowDragController && this.boxStowDragController.destroy) {
            this.boxStowDragController.destroy();
            this.boxStowDragController = null;
        }
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
        else if (this.partner.PartnerTranslateGroup) this.partner.PartnerTranslateGroup.remove();
    }
}

class ToyToSackTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        this.basics = new BasicElementsModule(FenObj);
        this.sack = new SackModule(FenObj);
        this.toy = new StandardToyModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);

        this.old_toy = null;
        this.oldToyDragController = null;
        this.groundY = null;
        this.sackY = null;
        this.itemScale = 4;
        // Dialable: sack size relative to the shared item scale (boxes stay at itemScale).
        this.sackScale = 3;
        // Dialable: toys shrink to this fraction of their drag size when settling into a sack.
        this.sackToyShrinkFactor = 0.82;
        this.binProximityX = 220;
        this.binBack = null;
        this.binFront = null;
        this.binCenter = null;
        this.binAboveLeft = null;
        this.binAboveRight = null;
        this.binStackCount = 0;
    }

    getScaledTemplateHalfWidth(elementId, scale) {
        let template = document.getElementById(elementId);
        if (!template) return 180 * (scale / 4);

        let box = template.getBBox();
        return (Math.max(box.width, 1) * scale) / 2;
    }

    async start_sequence() {
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }
        await this.basics.create_background_mask(true, 500);

        const isFoundToy = this.FenObj.special_role === "found_toy";
        const toyScale = this.itemScale;
        const sackScale = this.sackScale;
        // Leave room on the left for the finder Fennimal in the found_toy special case.
        const sackCenterX = isFoundToy ? 0.62 * this.basics.W : 0.5 * this.basics.W;
        const toyCenterY = 0.55 * this.basics.H;
        this.sackY = 0.7 * this.basics.H;

        if (isFoundToy) {
            await this.basics.create_and_appear_Fennimal(
                this.basics.ItemLayers.Main,
                0.16 * this.basics.W,
                0.82 * this.basics.H,
                1.55,
                250
            );
            AudioCont.play_sound_effect("alert");
            Interface.Prompt.show_message("This Fennimal is called " + this.FenObj.name);
            await wait(1000);
        }

        let toyHalfW = this.getScaledTemplateHalfWidth("toy_" + this.FenObj.toy, toyScale);
        let sackHalfW = this.getScaledTemplateHalfWidth(this.FenObj.sack, sackScale);
        let toyCenterX;
        if (isFoundToy) {
            // Keep the toy on the right of the sack so it doesn't collide with the Fennimal.
            toyCenterX = sackCenterX + sackHalfW + 70 + toyHalfW;
            let maxCenter = this.basics.W - 0.12 * this.basics.W - toyHalfW;
            toyCenterX = Math.min(toyCenterX, maxCenter);
        } else {
            toyCenterX = pick_flanking_item_x(
                this.basics.W,
                sackCenterX,
                sackHalfW,
                toyHalfW
            );
        }

        await this.toy.create_and_appear_toy(
            this.basics.ItemLayers.Plus1,
            "main",
            toyCenterX,
            toyCenterY,
            toyScale,
            200
        );

        this.toy.ToyElement.style.transition = "all 200ms ease-out";
        this.toy.ToyElement.style.transform += "translate(0px, 150px)";
        await wait(200);
        this.groundY = getSVGInternalCenter(this.toy.ToyElement).y;

        if (isFoundToy && this.basics.Fennimal) {
            this.basics.set_gaze_target(this.toy.ToyElement);
        }

        if (isFoundToy) {
            Interface.Prompt.show_message(this.FenObj.name + " found a " + this.FenObj.toy + "!");
            await wait(750);
            Interface.Prompt.show_message(
                "Let's keep the found " + this.FenObj.toy + " safe in the " + this.sack.sackname
            );
        } else {
            Interface.Prompt.show_message("Oops! The " + this.FenObj.toy + " has been left behind");
            await wait(750);
            Interface.Prompt.show_message(
                "Let's keep the " + this.FenObj.toy + " safe in the " + this.sack.sackname
            );
        }

        await this.sack.create_and_appear_sack(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            sackCenterX,
            this.sackY,
            sackScale,
            100
        );
        await wait(750);

        let currentContents = WorldState.get_sack_contents(this.FenObj.sack);
        this.sackNeedsClearing = (currentContents && currentContents !== this.FenObj.toy);

        if (this.sackNeedsClearing) {
            this.create_toy_bin();
            this.old_toy = new StandardToyModule({ toy: currentContents });
            let sackTarget = this.sack.SackTop.getElementsByClassName("sack_target_centerpoint")[0]
                || this.sack.ensure_target_centerpoint(this.sack.SackTop);
            let targetCenter = getSVGInternalCenter(sackTarget);
            // Already-in-sack size matches the post-drop shrink.
            await this.old_toy.create_and_appear_toy(
                this.basics.ItemLayers.Plus1,
                "old_sack_contents",
                targetCenter.x,
                targetCenter.y,
                toyScale * this.sackToyShrinkFactor,
                0
            );
        }

        if (this.partner.is_present) {
            Interface.Prompt.show_message(this.partner.partnername + " opens the " + this.sack.sackname);
            await this.partner.move_to_element_and_act(this.sack.SackBase, () => this.sack.open_sack());
            await wait(500);
        } else {
            await new Promise(resolve => {
                this.sack.wait_for_user_click("open", () => resolve());
            });
            await wait(500);
        }

        this.sack.set_pointer_events_enabled(false);

        if (this.sackNeedsClearing) {
            await this.clear_occupied_sack();
        }

        this.handle_sack_opened();
    }

    create_toy_bin() {
        let template = document.getElementById("toy_bin");
        if (!template) {
            console.error("toy_to_sack: #toy_bin not found in SVG assets");
            return;
        }

        let binX = 0.1 * this.basics.W;
        let binY = this.sackY + 50;
        let scale = this.itemScale;

        this.binBack = copy_scale_and_move_object_to_position(
            template,
            this.basics.ItemLayers.Main,
            binX,
            binY,
            scale,
            "toy_to_sack_toy_bin_back"
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
            "toy_to_sack_toy_bin_front"
        );
        let backOnFront = this.binFront.querySelector(".toy_bin_back");
        if (backOnFront) backOnFront.remove();
        this.binFront.style.pointerEvents = "none";

        this.binCenter = getSVGInternalCenter(this.binBack);
        this.binAboveLeft = { x: this.binCenter.x - 45, y: this.binCenter.y - 200 };
        this.binAboveRight = { x: this.binCenter.x + 45, y: this.binCenter.y - 200 };
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

    clearSackWorldState() {
        WorldState.clear_sack_contents(this.FenObj.sack);
    }

    async animateItemIntoBin(itemElement) {
        let stackIndex = this.binStackCount;
        this.binStackCount++;

        let above = (stackIndex % 2 === 0) ? this.binAboveLeft : this.binAboveRight;
        let finalX = this.binCenter.x + ((stackIndex % 2 === 0) ? -35 : 35);
        let finalY = this.binCenter.y + 55 - stackIndex * 22;

        this.basics.ItemLayers.Main.appendChild(itemElement);
        await this.animateItemToPoint(itemElement, above.x, above.y, 280);
        itemElement.style.transition = "transform 400ms ease-in";
        let cur = getSVGInternalCenter(itemElement);
        itemElement.style.transform += ` translate(${finalX - cur.x}px, ${finalY - cur.y}px)`;
        await wait(420);
    }

    async animateItemToPoint(itemElement, targetX, targetY, ms = 450) {
        let current = getSVGInternalCenter(itemElement);
        let dx = targetX - current.x;
        let dy = targetY - current.y;
        itemElement.style.transition = `transform ${ms}ms ease-in-out`;
        itemElement.style.transform += ` translate(${dx}px, ${dy}px)`;
        await wait(ms);
    }

    async clear_occupied_sack() {
        let oldToyName = this.old_toy.FenObj.toy;

        if (!this.binCenter) {
            this.create_toy_bin();
        }

        Interface.Prompt.show_message("There is already a " + oldToyName + " in the " + this.sack.sackname);
        await wait(1200);

        Interface.Prompt.show_message("Drag the old toy into the toy bin");
        AudioCont.play_sound_effect("alert_minor");

        await new Promise((resolve) => {
            this.old_toy.ToyElement.style.pointerEvents = "auto";
            this.oldToyDragController = new MakeObjectDraggableObject(
                this.basics.ItemLayers.Main,
                this.basics.ItemLayers.Plus2,
                this.old_toy.ToyElement,
                this.binBack || this.binFront,
                this.binProximityX,
                async (DraggedToyElement) => {
                    if (this.oldToyDragController && this.oldToyDragController.destroy) {
                        this.oldToyDragController.destroy();
                    }
                    this.oldToyDragController = null;
                    DraggedToyElement.style.pointerEvents = "none";
                    DraggedToyElement.style.cursor = "auto";
                    await this.animateItemIntoBin(DraggedToyElement);
                    this.clearSackWorldState();
                    Interface.Prompt.hide();
                    resolve();
                },
                {
                    validateDrop: () => {
                        if (!this.binCenter) return false;
                        let toyCenter = getSVGInternalCenter(this.old_toy.ToyElement);
                        return Math.abs(toyCenter.x - this.binCenter.x) <= this.binProximityX;
                    },
                    onMiss: () => {
                        Interface.Prompt.show_message("Drop the toy near the toy bin");
                        if (this.oldToyDragController && this.oldToyDragController.enable) {
                            this.oldToyDragController.enable();
                        }
                    }
                }
            );
        });
    }

    handle_sack_opened() {
        let placePrompt = this.FenObj.special_role === "found_toy"
            ? "Please place the found " + this.FenObj.toy + " in the " + this.sack.sackname
            : "Please place the " + this.FenObj.toy + " in the " + this.sack.sackname;
        Interface.Prompt.show_message(placePrompt);
        AudioCont.play_sound_effect("alert_minor");

        new MakeObjectDraggableObject(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            this.toy.ToyElement,
            this.sack.SackBase,
            200,
            (DroppedToyElement) => {
                shared_toy_to_sack_drop_sequence(
                    DroppedToyElement,
                    this.sack,
                    this.basics,
                    this.partner,
                    this.FenObj,
                    () => this.run_placement_quiz(),
                    { shrinkFactor: this.sackToyShrinkFactor }
                );
            }
        );
    }

    getPlacementQuizOptions() {
        let options = Array.isArray(this.FenObj.placement_quiz_options)
            ? [...this.FenObj.placement_quiz_options]
            : [];
        if (this.FenObj.toy && !options.includes(this.FenObj.toy)) {
            options.push(this.FenObj.toy);
        }
        return options.filter(Boolean);
    }

    /**
     * Attention check after sack close: which toy was just placed?
     * Wrong → reopen, lift toy to full size, show, lower+shrink, close, retry.
     */
    async run_placement_quiz() {
        let options = this.getPlacementQuizOptions();
        if (options.length === 0) {
            console.warn("toy_to_sack: no toys for placement quiz; skipping.");
            Interface.Prompt.show_message(
                "The " + this.FenObj.toy + " is now safely in the " + this.sack.sackname + "!"
            );
            await wait(1600);
            Interface.Prompt.hide();
            this.finish_trial();
            return;
        }

        this.FenObj.placement_errors = [];
        let bar = new ToyChoiceBar(
            this.basics.ItemLayers.Questions,
            this.basics.W,
            this.basics.H
        );

        while (true) {
            Interface.Prompt.show_message("Which toy did you just place in the " + this.sack.sackname + "?");
            let selected = await bar.waitForSelection(shuffleArray([...options]));

            if (selected === this.FenObj.toy) {
                AudioCont.play_sound_effect("positive");
                await bar.hide();
                let burstCenter = getSVGInternalCenter(this.sack.SackBase || this.sack.SackTop);
                await spawn_confetti_burst(
                    this.basics.ItemLayers.Plus2,
                    burstCenter.x,
                    burstCenter.y,
                    { awaitPopMs: 900 }
                );
                Interface.Prompt.show_message(
                    "The " + this.FenObj.toy + " is now safely in the " + this.sack.sackname + "!"
                );
                await wait(1600);
                Interface.Prompt.hide();
                this.finish_trial();
                return;
            }

            AudioCont.play_sound_effect("rejected");
            this.FenObj.placement_errors.push(selected);
            await bar.hide();
            await this.reveal_placed_toy();
        }
    }

    async open_sack_for_reveal() {
        this.sack.set_pointer_events_enabled(true);
        if (this.partner.is_present) {
            Interface.Prompt.show_message(this.partner.partnername + " opens the " + this.sack.sackname);
            await this.partner.move_to_element_and_act(this.sack.SackBase, () => this.sack.open_sack());
            await wait(300);
        } else {
            await new Promise((resolve) => {
                this.sack.wait_for_user_click("open", () => resolve());
            });
            await wait(200);
        }
        this.sack.set_pointer_events_enabled(false);
    }

    async close_sack_for_reveal() {
        this.sack.set_pointer_events_enabled(true);
        if (this.partner.is_present) {
            Interface.Prompt.show_message(this.partner.partnername + " closes the " + this.sack.sackname);
            await this.partner.move_to_element_and_act(this.sack.SackBase, () => this.sack.close_sack());
            await wait(250);
        } else {
            await new Promise((resolve) => {
                this.sack.wait_for_user_click("close", () => resolve());
            });
            await wait(150);
        }
        this.sack.set_pointer_events_enabled(false);

        if (this.toy && this.toy.ToyElement) {
            this.toy.ToyElement.style.transition = "opacity 250ms ease-in";
            this.toy.ToyElement.style.opacity = 0;
            await wait(250);
        }
    }

    /** Wrong-answer remediation: open → fade/grow toy up → present → shrink/lower → close. */
    async reveal_placed_toy() {
        let toyEl = this.toy && this.toy.ToyElement;
        if (!toyEl) {
            console.warn("toy_to_sack: missing placed toy for reveal; reopening without lift.");
            await this.open_sack_for_reveal();
            await wait(1000);
            await this.close_sack_for_reveal();
            return;
        }

        await this.open_sack_for_reveal();

        let sackTarget = this.sack.SackTop.getElementsByClassName("sack_target_centerpoint")[0]
            || this.sack.ensure_target_centerpoint(this.sack.SackTop);
        let sackCenter = getSVGInternalCenter(sackTarget);
        // Lift clear of the open sack mouth while staying behind the front panel.
        let presentY = sackCenter.y - 400;

        toyEl.style.pointerEvents = "none";
        // Stay between sack back (Main) and sack front (Plus2) for the whole reveal.
        this.basics.ItemLayers.Plus1.appendChild(toyEl);
        toyEl.style.transition = "opacity 200ms ease-in";
        toyEl.style.opacity = 1;
        await wait(200);

        set_nested_scale(toyEl, this.itemScale, 450);
        await this.animateItemToPoint(toyEl, sackCenter.x, presentY, 450);
        await wait(1000);

        set_nested_scale(toyEl, this.itemScale * this.sackToyShrinkFactor, 450);
        await this.animateItemToPoint(toyEl, sackCenter.x, sackCenter.y, 450);

        await this.close_sack_for_reveal();
    }

    async finish_trial() {
        await wait(500);
        this.returnfunc();
    }

    clean_up() {
        if (this.oldToyDragController && this.oldToyDragController.destroy) {
            this.oldToyDragController.destroy();
            this.oldToyDragController = null;
        }
        this.basics.clean_up();
        this.sack.clean_up();
        this.toy.clean_up();
        if (this.old_toy) this.old_toy.clean_up();
        this.remove_toy_bin();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
        else if (this.partner.PartnerTranslateGroup) this.partner.PartnerTranslateGroup.remove();
    }
}

class SackToBoxTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;

        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.sack = new SackModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);

        this.old_toy = null;
        this.old_sack = null;
        this.oldItemDragController = null;
        this.groundY = null;
        this.boxY = null;
        this.itemScale = 4;
        // Dialable: sack size relative to the shared item scale (boxes stay at itemScale).
        this.sackScale = 3;
        // Dialable: sacks shrink to this fraction when settling into a box.
        this.sackBoxShrinkFactor = 0.65;
        this.sackDropDistance = 300;
        this.binProximityX = 220;
        this.binBack = null;
        this.binFront = null;
        this.binCenter = null;
        this.binAboveLeft = null;
        this.binAboveRight = null;
        this.binStackCount = 0;
        this.clearMode = null; // "sack" | "toy" | null
    }

    getScaledTemplateHalfWidth(elementId, scale) {
        let template = document.getElementById(elementId);
        if (!template) return 180 * (scale / 4);

        let box = template.getBBox();
        return (Math.max(box.width, 1) * scale) / 2;
    }

    async start_sequence() {
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }
        await this.basics.create_background_mask(true, 500);

        const sackScale = this.sackScale;
        const boxScale = this.itemScale;
        const boxCenterX = 0.5 * this.basics.W;
        const sackCenterY = 0.55 * this.basics.H;
        this.boxY = 0.7 * this.basics.H;

        let sackHalfW = this.getScaledTemplateHalfWidth(this.FenObj.sack, sackScale);
        let boxHalfW = this.getScaledTemplateHalfWidth("toybox_" + this.FenObj.toybox, boxScale);
        let sackCenterX = pick_flanking_item_x(
            this.basics.W,
            boxCenterX,
            boxHalfW,
            sackHalfW
        );

        await this.sack.create_and_appear_closed_sack_item(
            this.basics.ItemLayers.Plus1,
            sackCenterX,
            sackCenterY,
            sackScale,
            200
        );

        this.sack.SackItem.style.transition = "all 200ms ease-out";
        this.sack.SackItem.style.transform += "translate(0px, 150px)";
        await wait(200);
        this.groundY = getSVGInternalCenter(this.sack.SackItem).y;

        Interface.Prompt.show_message("Oops! The " + this.sack.sackname + " has been left behind");
        await wait(750);

        Interface.Prompt.show_message("Let's keep the " + this.sack.sackname + " safe in the " + this.box.boxname);

        await this.box.create_and_appear_box(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            boxCenterX,
            this.boxY,
            boxScale,
            100
        );
        await wait(750);

        let boxEntry = WorldState.get_toybox_entry(this.FenObj.toybox);
        let currentSackInBox = boxEntry ? boxEntry.sack : false;
        let currentToyInBox = boxEntry ? boxEntry.toy : false;

        // Prefer sack over bare toy when clearing. Same sack already in this box ⇒ treat as empty.
        if (currentSackInBox && currentSackInBox === this.FenObj.sack) {
            this.clearMode = null;
        } else if (currentSackInBox) {
            this.clearMode = "sack";
        } else if (currentToyInBox && currentToyInBox !== false) {
            this.clearMode = "toy";
        } else {
            this.clearMode = null;
        }

        if (this.clearMode === "sack") {
            this.create_toy_bin();
            this.old_sack = new SackModule({ sack: currentSackInBox });
            let boxTarget = getSVGInternalCenter(this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]);
            // Closed sack under the lid — never open it; participant bins it closed.
            // Already-in-box size matches the post-drop shrink.
            await this.old_sack.create_and_appear_closed_sack_item(
                this.basics.ItemLayers.Plus1,
                boxTarget.x,
                boxTarget.y,
                sackScale * this.sackBoxShrinkFactor,
                0
            );
        } else if (this.clearMode === "toy") {
            this.create_toy_bin();
            this.old_toy = new StandardToyModule({ toy: currentToyInBox });
            let boxTarget = getSVGInternalCenter(this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]);
            await this.old_toy.create_and_appear_toy(
                this.basics.ItemLayers.Plus1,
                "old_box_contents",
                boxTarget.x,
                boxTarget.y,
                boxScale,
                0
            );
        }

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

        this.box.set_pointer_events_enabled(false);

        if (this.clearMode) {
            await this.clear_occupied_box();
        }

        this.handle_box_opened();
    }

    create_toy_bin() {
        let template = document.getElementById("toy_bin");
        if (!template) {
            console.error("sack_to_box: #toy_bin not found in SVG assets");
            return;
        }

        let binX = 0.1 * this.basics.W;
        let binY = this.boxY + 50;
        let scale = this.itemScale;

        this.binBack = copy_scale_and_move_object_to_position(
            template,
            this.basics.ItemLayers.Main,
            binX,
            binY,
            scale,
            "sack_to_box_toy_bin_back"
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
            "sack_to_box_toy_bin_front"
        );
        let backOnFront = this.binFront.querySelector(".toy_bin_back");
        if (backOnFront) backOnFront.remove();
        this.binFront.style.pointerEvents = "none";

        this.binCenter = getSVGInternalCenter(this.binBack);
        this.binAboveLeft = { x: this.binCenter.x - 45, y: this.binCenter.y - 200 };
        this.binAboveRight = { x: this.binCenter.x + 45, y: this.binCenter.y - 200 };
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

    clearBoxWorldStateAfterBin() {
        let oldSackId = this.old_sack ? this.old_sack.FenObj.sack : null;
        WorldState.clear_toybox_contents(this.FenObj.toybox);
        if (oldSackId) {
            WorldState.clear_sack_contents(oldSackId);
        }
        if (this.partner.is_present) {
            WorldState.change_partner_belief_in_box_contents(this.FenObj.toybox, false);
        }
    }

    async animateItemIntoBin(itemElement) {
        let stackIndex = this.binStackCount;
        this.binStackCount++;

        let above = (stackIndex % 2 === 0) ? this.binAboveLeft : this.binAboveRight;
        let finalX = this.binCenter.x + ((stackIndex % 2 === 0) ? -35 : 35);
        let finalY = this.binCenter.y + 55 - stackIndex * 22;

        this.basics.ItemLayers.Main.appendChild(itemElement);
        await this.animateItemToPoint(itemElement, above.x, above.y, 280);
        itemElement.style.transition = "transform 400ms ease-in";
        let cur = getSVGInternalCenter(itemElement);
        itemElement.style.transform += ` translate(${finalX - cur.x}px, ${finalY - cur.y}px)`;
        await wait(420);
    }

    async animateItemToPoint(itemElement, targetX, targetY, ms = 450) {
        let current = getSVGInternalCenter(itemElement);
        let dx = targetX - current.x;
        let dy = targetY - current.y;
        itemElement.style.transition = `transform ${ms}ms ease-in-out`;
        itemElement.style.transform += ` translate(${dx}px, ${dy}px)`;
        await wait(ms);
    }

    async clear_occupied_box() {
        if (!this.binCenter) {
            this.create_toy_bin();
        }

        let dragElement = null;
        let label = "";

        if (this.clearMode === "sack") {
            label = this.old_sack.sackname;
            Interface.Prompt.show_message("There is already a " + label + " in the " + this.box.boxname);
            dragElement = this.old_sack.SackItem;
        } else {
            label = this.old_toy.FenObj.toy;
            Interface.Prompt.show_message("There is already a " + label + " in the " + this.box.boxname);
            dragElement = this.old_toy.ToyElement;
        }
        await wait(1200);

        Interface.Prompt.show_message(
            this.clearMode === "sack"
                ? "Drag the old sack into the toy bin"
                : "Drag the old toy into the toy bin"
        );
        AudioCont.play_sound_effect("alert_minor");

        await new Promise((resolve) => {
            dragElement.style.pointerEvents = "auto";
            this.oldItemDragController = new MakeObjectDraggableObject(
                this.basics.ItemLayers.Main,
                this.basics.ItemLayers.Plus2,
                dragElement,
                this.binBack || this.binFront,
                this.binProximityX,
                async (DraggedElement) => {
                    if (this.oldItemDragController && this.oldItemDragController.destroy) {
                        this.oldItemDragController.destroy();
                    }
                    this.oldItemDragController = null;
                    DraggedElement.style.pointerEvents = "none";
                    DraggedElement.style.cursor = "auto";
                    if (this.clearMode === "sack" && this.old_sack) {
                        this.old_sack.play_placed_sfx();
                    }
                    await this.animateItemIntoBin(DraggedElement);
                    this.clearBoxWorldStateAfterBin();
                    Interface.Prompt.hide();
                    resolve();
                },
                {
                    validateDrop: () => {
                        if (!this.binCenter) return false;
                        let itemCenter = getSVGInternalCenter(dragElement);
                        return Math.abs(itemCenter.x - this.binCenter.x) <= this.binProximityX;
                    },
                    onMiss: () => {
                        Interface.Prompt.show_message(
                            this.clearMode === "sack"
                                ? "Drop the sack near the toy bin"
                                : "Drop the toy near the toy bin"
                        );
                        if (this.oldItemDragController && this.oldItemDragController.enable) {
                            this.oldItemDragController.enable();
                        }
                    }
                }
            );
        });
    }

    handle_box_opened() {
        Interface.Prompt.show_message("Please place the " + this.sack.sackname + " in the " + this.box.boxname);
        AudioCont.play_sound_effect("alert_minor");

        new MakeObjectDraggableObject(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            this.sack.SackItem,
            this.box.BoxBase,
            this.sackDropDistance,
            (DroppedSackElement) => {
                shared_sack_to_box_drop_sequence(
                    DroppedSackElement,
                    this.box,
                    this.basics,
                    this.partner,
                    this.FenObj,
                    () => this.after_sack_placed(),
                    { shrinkFactor: this.sackBoxShrinkFactor }
                );
            }
        );
    }

    async after_sack_placed() {
        // Hide after shut so the sack cannot leak the quiz answer.
        if (this.sack && this.sack.SackItem) {
            this.sack.SackItem.style.transition = "opacity 150ms ease-in";
            this.sack.SackItem.style.opacity = 0;
            await wait(150);
        }
        await this.run_placement_quiz();
    }

    getPlacementQuizOptions() {
        let options = Array.isArray(this.FenObj.placement_quiz_options)
            ? [...this.FenObj.placement_quiz_options]
            : [];
        if (this.FenObj.sack && !options.includes(this.FenObj.sack)) {
            options.push(this.FenObj.sack);
        }
        return options.filter(Boolean);
    }

    /**
     * Attention check after box close: which sack was just placed?
     * Wrong → reopen, lift sack to full size, show, shrink/lower, close, retry.
     */
    async run_placement_quiz() {
        let options = this.getPlacementQuizOptions();
        if (options.length === 0) {
            console.warn("sack_to_box: no sacks for placement quiz; skipping.");
            Interface.Prompt.show_message(
                "The " + this.sack.sackname + " is now safely in the " + this.box.boxname + "!"
            );
            await wait(1600);
            Interface.Prompt.hide();
            this.finish_trial();
            return;
        }

        this.FenObj.placement_errors = [];
        let bar = new SackChoiceBar(
            this.basics.ItemLayers.Questions,
            this.basics.W,
            this.basics.H
        );

        while (true) {
            Interface.Prompt.show_message("Which sack did you just place in the " + this.box.boxname + "?");
            let selected = await bar.waitForSelection(shuffleArray([...options]));

            if (selected === this.FenObj.sack) {
                AudioCont.play_sound_effect("positive");
                await bar.hide();
                let burstCenter = getSVGInternalCenter(this.box.BoxBase);
                await spawn_confetti_burst(
                    this.basics.ItemLayers.Plus2,
                    burstCenter.x,
                    burstCenter.y,
                    { awaitPopMs: 900 }
                );
                Interface.Prompt.show_message(
                    "The " + this.sack.sackname + " is now safely in the " + this.box.boxname + "!"
                );
                await wait(1600);
                Interface.Prompt.hide();
                this.finish_trial();
                return;
            }

            AudioCont.play_sound_effect("rejected");
            this.FenObj.placement_errors.push(selected);
            await bar.hide();
            await this.reveal_placed_sack();
        }
    }

    async open_box_for_reveal() {
        this.box.set_pointer_events_enabled(true);
        if (this.partner.is_present) {
            Interface.Prompt.show_message(this.partner.partnername + " opens the " + this.box.boxname);
            await this.partner.move_to_element_and_act(this.box.BoxBase, () => this.box.open_box());
            await wait(300);
        } else {
            await new Promise((resolve) => {
                this.box.wait_for_user_click("open", () => resolve());
            });
            await wait(200);
        }
        this.box.set_pointer_events_enabled(false);
    }

    async close_box_for_reveal() {
        this.box.set_pointer_events_enabled(true);
        if (this.partner.is_present) {
            Interface.Prompt.show_message(this.partner.partnername + " closes the " + this.box.boxname);
            await this.partner.move_to_element_and_act(this.box.BoxBase, () => this.box.close_box());
            await wait(250);
        } else {
            await new Promise((resolve) => {
                this.box.wait_for_user_click("close", () => resolve());
            });
            await wait(150);
        }
        this.box.set_pointer_events_enabled(false);

        if (this.sack && this.sack.SackItem) {
            this.sack.SackItem.style.transition = "opacity 250ms ease-in";
            this.sack.SackItem.style.opacity = 0;
            await wait(250);
        }
    }

    /** Wrong-answer remediation: open → show/grow sack up → present → shrink/lower → close. */
    async reveal_placed_sack() {
        let sackEl = this.sack && this.sack.SackItem;
        if (!sackEl) {
            console.warn("sack_to_box: missing placed sack for reveal; reopening without lift.");
            await this.open_box_for_reveal();
            await wait(1000);
            await this.close_box_for_reveal();
            return;
        }

        // Park behind the still-closed lid at full opacity so it is visible the
        // instant the box opens (no post-open fade lag).
        sackEl.style.pointerEvents = "none";
        this.basics.ItemLayers.Plus1.appendChild(sackEl);
        sackEl.style.transition = "none";
        sackEl.style.opacity = 1;
        void sackEl.getBoundingClientRect();

        await this.open_box_for_reveal();

        let boxTargetEl = this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0];
        let boxTarget = getSVGInternalCenter(boxTargetEl);
        // Lift clear of the open box while staying behind the lid/front panel.
        let presentY = boxTarget.y - 400;

        set_nested_scale(sackEl, this.sackScale, 450);
        await this.animateItemToPoint(sackEl, boxTarget.x, presentY, 450);
        await wait(1000);

        set_nested_scale(sackEl, this.sackScale * this.sackBoxShrinkFactor, 450);
        await this.animateItemToPoint(sackEl, boxTarget.x, boxTarget.y, 450);

        await this.close_box_for_reveal();
    }

    async finish_trial() {
        await wait(500);
        this.returnfunc();
    }

    clean_up() {
        if (this.oldItemDragController && this.oldItemDragController.destroy) {
            this.oldItemDragController.destroy();
            this.oldItemDragController = null;
        }
        this.basics.clean_up();
        this.box.clean_up();
        this.sack.clean_up();
        if (this.old_sack) this.old_sack.clean_up();
        if (this.old_toy) this.old_toy.clean_up();
        this.remove_toy_bin();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
        else if (this.partner.PartnerTranslateGroup) this.partner.PartnerTranslateGroup.remove();
    }
}

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

class DirtModule {
    Spots = [];
    SpongeScaleGroup;
    SpongeTranslateGroup;
    SpongeBaseTransform;
    dirt_remaining = 0;
    parentScale = 4;

    constructor() {
        AudioCont.load_audio("scrub", "scrub.mp3", false);
        AudioCont.load_audio("water_splash", "water_splash.mp3", false);
    }

    spawn_dirt_on_element(TargetElement, ParentLayer, num_spots, options = {}) {
        this.TargetElement = TargetElement;
        this.dirt_remaining = num_spots;
        let targetBBox = TargetElement.getBBox();
        const colors = (options.colors && options.colors.length)
            ? options.colors
            : ['#4A3B2C', '#3E2723', '#5D4037', '#4E342E'];
        // Fraction of usable width to skip on the left (e.g. plant occlusion).
        let avoidLeft = Math.max(0, Math.min(0.7,
            typeof options.avoidLeftFraction === "number" ? options.avoidLeftFraction : 0
        ));

        for (let i = 0; i < num_spots; i++) {
            let spot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            let radius = 15 + (Math.random() * 15);
            spot.setAttribute('r', radius);

            spot.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);
            // Light edge so spots stay readable on dark box faces.
            spot.setAttribute('stroke', 'rgba(255,255,255,0.35)');
            spot.setAttribute('stroke-width', '2');

            let paddingX = targetBBox.width * 0.15;
            let paddingY = targetBBox.height * 0.15;
            let usableLeft = targetBBox.x + paddingX;
            let usableRight = targetBBox.x + targetBBox.width - paddingX;
            let usableWidth = Math.max(1, usableRight - usableLeft);
            usableLeft = usableLeft + avoidLeft * usableWidth;
            usableWidth = Math.max(1, usableRight - usableLeft);

            let local_x = usableLeft + (Math.random() * usableWidth);
            let local_y = targetBBox.y + paddingY + (Math.random() * (targetBBox.height - 2 * paddingY));

            spot.setAttribute('cx', local_x);
            spot.setAttribute('cy', local_y);

            spot.style.transform = `scale(${0.8 + Math.random() * 0.4})`;
            spot.style.transformOrigin = "center";
            spot.style.transformBox = "fill-box";

            TargetElement.appendChild(spot);

            this.Spots.push({
                element: spot,
                is_cleaned: false,
                health: 100 // NEW: The spot requires 100 'pixels' of scrubbing to remove
            });
        }
        this._initialTotalHealth = num_spots * 100;
        this.scrubMode = "normal";
        this.turnCleaned = 0;
        this.turnQuota = 0;
        this._turnResolve = null;
        this._spongeInputBound = false;
    }

    get_remaining_health() {
        return this.Spots
            .filter(s => !s.is_cleaned)
            .reduce((sum, s) => sum + Math.max(0, s.health), 0);
    }

    get_initial_total_health() {
        return this._initialTotalHealth || (this.Spots.length * 100);
    }

    // ----------------------------------------------------
    // PHASE 2: SPONGE & SCRUBBING
    // ----------------------------------------------------
    spawn_and_enable_sponge(ParentLayer, center_x, center_y, on_all_clean_callback) {
        let rawSponge = document.getElementsByClassName("item_sponge")[0].cloneNode(true);
        rawSponge.style.display = "inherit";

        // We will animate this specific group!
        let SpongeCenterGroup = create_SVG_group(0,0);
        SpongeCenterGroup.appendChild(rawSponge);

        let rawBBox = rawSponge.getBBox();
        let dx = -(rawBBox.x + (rawBBox.width / 2));
        let dy = -(rawBBox.y + (rawBBox.height / 2));
        rawSponge.style.transform = `translate(${dx}px, ${dy}px)`;

        this.SpongeScaleGroup = create_SVG_group(0,0);
        this.SpongeScaleGroup.style.transform = `scale(${this.parentScale})`;
        this.SpongeScaleGroup.appendChild(SpongeCenterGroup);

        this.SpongeTranslateGroup = create_SVG_group(0,0);
        this.SpongeTranslateGroup.appendChild(this.SpongeScaleGroup);
        ParentLayer.appendChild(this.SpongeTranslateGroup);

        this.SpongeBaseTransform = `translate(${center_x}px, ${center_y}px)`;
        this.SpongeTranslateGroup.style.transform = this.SpongeBaseTransform;

        this.SpongeTranslateGroup.style.opacity = 0;
        window.getComputedStyle(this.SpongeTranslateGroup).opacity;
        this.SpongeTranslateGroup.style.transition = "all 500ms ease-out";
        this.SpongeTranslateGroup.style.opacity = 1;

        this.SpongeTranslateGroup.style.cursor = "grab";

        // NEW: A variable to hold our "spring back" timer
        let squishTimeout;

        this.SpongeTranslateGroup.onpointerdown = (e) => {
            if (this._spongeActive === false) return;
            this.SpongeTranslateGroup.setPointerCapture(e.pointerId);
            this.SpongeTranslateGroup.style.transition = "none";
            this.SpongeTranslateGroup.style.cursor = "grabbing";

            let pt = GenParam.SVGObject.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            let startSvgPos = pt.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());
            let lastSvgPos = startSvgPos;

            let bubbleDistanceTracker = 0;

            this.SpongeTranslateGroup.onpointermove = (ev) => {
                pt.x = ev.clientX;
                pt.y = ev.clientY;
                let currentSvgPos = pt.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());

                let moveDx = currentSvgPos.x - startSvgPos.x;
                let moveDy = currentSvgPos.y - startSvgPos.y;

                let newX = center_x + moveDx;
                let newY = center_y + moveDy;

                let frameDx = currentSvgPos.x - lastSvgPos.x;
                let frameDy = currentSvgPos.y - lastSvgPos.y;
                let distanceMoved = Math.sqrt(frameDx * frameDx + frameDy * frameDy);
                lastSvgPos = currentSvgPos;

                // ----------------------------------------------------
                // NEW: THE SQUISH PHYSICS
                // ----------------------------------------------------
                // Calculate deformation (caps out at 0.75 squish and 1.15 stretch)
                let squish = Math.max(0.75, 1 - (distanceMoved * 0.015));
                let stretch = Math.min(1.15, 1 + (distanceMoved * 0.005));

                SpongeCenterGroup.style.transition = "transform 50ms ease-out";
                SpongeCenterGroup.style.transform = `scale(${stretch}, ${squish})`;

                // Reset the spring timer every time the mouse moves
                clearTimeout(squishTimeout);
                squishTimeout = setTimeout(() => {
                    SpongeCenterGroup.style.transition = "transform 250ms cubic-bezier(0.25, 1.5, 0.5, 1)"; // Bouncy spring back
                    SpongeCenterGroup.style.transform = `scale(1, 1)`;
                }, 80);
                // ----------------------------------------------------

                let targetRect = this.TargetElement.getBoundingClientRect();
                let isOverTarget = (
                    ev.clientX >= targetRect.left &&
                    ev.clientX <= targetRect.right &&
                    ev.clientY >= targetRect.top &&
                    ev.clientY <= targetRect.bottom
                );

                if (isOverTarget) {
                    bubbleDistanceTracker += distanceMoved;
                    if (bubbleDistanceTracker > 25) {
                        let bubbleCount = Math.floor(bubbleDistanceTracker / 25);
                        this.spawn_bubbles(currentSvgPos.x, currentSvgPos.y, ParentLayer, bubbleCount);
                        bubbleDistanceTracker %= 25;
                    }
                }

                this.SpongeTranslateGroup.style.transform = `translate(${newX}px, ${newY}px)`;
                this.check_scrub_collision(newX, newY, distanceMoved, ParentLayer, on_all_clean_callback);
            };

            this.SpongeTranslateGroup.onpointerup = (ev) => {
                this.SpongeTranslateGroup.onpointermove = null;
                this.SpongeTranslateGroup.onpointerup = null;
                this.SpongeTranslateGroup.releasePointerCapture(ev.pointerId);
                this.SpongeTranslateGroup.style.cursor = "grab";

                // Ensure sponge snaps back on release
                clearTimeout(squishTimeout);
                SpongeCenterGroup.style.transition = "transform 250ms ease-out";
                SpongeCenterGroup.style.transform = `scale(1, 1)`;

                this.SpongeTranslateGroup.style.transition = "all 400ms cubic-bezier(0.25, 1, 0.5, 1)";
                this.SpongeTranslateGroup.style.transform = this.SpongeBaseTransform;
            };
        };
        this._spongeInputBound = true;
        this._SpongeCenterGroup = SpongeCenterGroup;
        this._spongeParentLayer = ParentLayer;
        this._on_all_clean_callback = on_all_clean_callback;
        this._spongeActiveX = center_x;
        this._spongeActiveY = center_y;
    }

    /**
     * Turn-based sponge: enable scrubbing until `quota` health is cleaned (or all dirt gone).
     * Does not auto-despawn on full clean — caller handles finale.
     *
     * safety (optional):
     *   idleHintMs / idleFailsafeMs — wall-clock idle without scrub progress
     *   onIdleHint / onIdleFailsafe — optional callbacks
     */
    start_scrub_turn(quota, safety = {}) {
        this.scrubMode = "turn";
        this.turnQuota = quota;
        this.turnCleaned = 0;
        this._scrubStarted = false;
        this._scrubStartResolve = null;
        this._idleHintFired = false;
        this._idleFailsafeFired = false;
        this._lastProgressAt = Date.now();
        this._scrubIdleHintMs = safety.idleHintMs != null ? safety.idleHintMs : 12000;
        this._scrubIdleFailsafeMs = safety.idleFailsafeMs != null ? safety.idleFailsafeMs : 25000;
        this._onIdleHint = typeof safety.onIdleHint === "function" ? safety.onIdleHint : null;
        this._onIdleFailsafe = typeof safety.onIdleFailsafe === "function" ? safety.onIdleFailsafe : null;
        this.clear_scrub_idle_watch();
        this.stop_dirt_hint_pulse();
        this._rebind_sponge_pointer();
        this._spongeActive = true;
        if (this.SpongeTranslateGroup) {
            this.SpongeTranslateGroup.style.cursor = "grab";
            this.show_sponge_turn_outline();
        }
        this._scrubIdleWatch = setInterval(() => this._check_scrub_idle_safety(), 400);
        return new Promise(resolve => {
            this._turnResolve = resolve;
        });
    }

    /** Resolves once the player has actually scrubbed dirt this turn. */
    wait_for_scrub_start() {
        if (this._scrubStarted) return Promise.resolve();
        return new Promise(resolve => {
            this._scrubStartResolve = resolve;
        });
    }

    _notify_scrub_started() {
        if (this._scrubStarted) return;
        this._scrubStarted = true;
        if (this._scrubStartResolve) {
            let resolve = this._scrubStartResolve;
            this._scrubStartResolve = null;
            resolve();
        }
    }

    _note_scrub_progress() {
        this._lastProgressAt = Date.now();
        // Player found dirt again — stop the idle pulse cue.
        this.stop_dirt_hint_pulse();
    }

    clear_scrub_idle_watch() {
        if (this._scrubIdleWatch) {
            clearInterval(this._scrubIdleWatch);
            this._scrubIdleWatch = null;
        }
    }

    _check_scrub_idle_safety() {
        if (this.scrubMode !== "turn" || !this._turnResolve || this._spongeActive === false) {
            this.clear_scrub_idle_watch();
            return;
        }
        let idleMs = Date.now() - (this._lastProgressAt || Date.now());

        if (!this._idleHintFired && idleMs >= this._scrubIdleHintMs) {
            this._idleHintFired = true;
            this.pulse_remaining_dirt_hint();
            if (this._onIdleHint) this._onIdleHint();
        }

        if (!this._idleFailsafeFired && idleMs >= this._scrubIdleFailsafeMs) {
            this._idleFailsafeFired = true;
            if (this._onIdleFailsafe) this._onIdleFailsafe();
            this.auto_complete_scrub_turn();
        }
    }

    pulse_remaining_dirt_hint() {
        this.stop_dirt_hint_pulse();
        let remaining = this.Spots.filter(s => !s.is_cleaned && s.element);
        if (!remaining.length) return;

        let pulses = 0;
        this._dirtHintPulse = setInterval(() => {
            pulses++;
            remaining.forEach((spot) => {
                if (spot.is_cleaned || !spot.element) return;
                let on = pulses % 2 === 1;
                spot.element.style.transition = "filter 280ms ease, opacity 280ms ease";
                spot.element.style.filter = on
                    ? "brightness(1.55) drop-shadow(0px 0px 14px gold)"
                    : "none";
                // Nudge nearly-invisible partial spots back into view during the hint.
                let baseOpacity = Math.max(0.25, Math.min(1, spot.health / 100));
                spot.element.style.opacity = on ? Math.max(baseOpacity, 0.85) : baseOpacity;
            });
            if (pulses >= 8) this.stop_dirt_hint_pulse();
        }, 320);
    }

    stop_dirt_hint_pulse() {
        if (this._dirtHintPulse) {
            clearInterval(this._dirtHintPulse);
            this._dirtHintPulse = null;
        }
        this.Spots.forEach((spot) => {
            if (!spot.element || spot.is_cleaned) return;
            spot.element.style.filter = "none";
            spot.element.style.opacity = Math.max(0, Math.min(1, spot.health / 100));
        });
    }

    /**
     * Failsafe: instantly clean enough remaining dirt to finish this turn.
     * Also marks scrub as started so decoration wash-off can still fire.
     */
    auto_complete_scrub_turn() {
        if (this.scrubMode !== "turn" || !this._turnResolve) return;

        this.clear_scrub_idle_watch();
        this.stop_dirt_hint_pulse();
        this._notify_scrub_started();

        for (let i = 0; i < this.Spots.length; i++) {
            if (this.turnCleaned >= this.turnQuota || this.dirt_remaining <= 0) break;
            let spot = this.Spots[i];
            if (spot.is_cleaned || !spot.element) continue;
            this._instant_clean_spot(spot);
        }

        this._resolve_scrub_turn_if_ready(true);
    }

    _instant_clean_spot(spot) {
        let remainingHealth = Math.max(0, spot.health);
        spot.health = 0;
        if (!spot.is_cleaned) {
            spot.is_cleaned = true;
            this.dirt_remaining = Math.max(0, this.dirt_remaining - 1);
        }
        if (this.scrubMode === "turn") {
            this.turnCleaned += remainingHealth;
        }

        AudioCont.play_sound_effect("scrub");
        spot.element.style.transition = "all 280ms ease-out";
        spot.element.style.filter = "brightness(1.6) drop-shadow(0px 0px 10px gold)";
        spot.element.style.transform += " scale(0)";
        spot.element.style.opacity = "0";
        let el = spot.element;
        setTimeout(() => {
            if (el && el.parentNode) el.remove();
        }, 300);
    }

    _resolve_scrub_turn_if_ready(force = false) {
        if (this.scrubMode !== "turn" || !this._turnResolve) return;
        if (!force && !(this.turnCleaned >= this.turnQuota || this.dirt_remaining <= 0)) return;

        this.clear_scrub_idle_watch();
        this.stop_dirt_hint_pulse();
        let resolveTurn = this._turnResolve;
        this._turnResolve = null;
        this._spongeActive = false;
        this.hide_sponge_turn_outline();
        if (this.SpongeTranslateGroup) {
            this.SpongeTranslateGroup.onpointermove = null;
            this.SpongeTranslateGroup.style.cursor = "auto";
        }
        resolveTurn();
    }

    show_sponge_turn_outline() {
        this.hide_sponge_turn_outline();
        if (!this.SpongeTranslateGroup) return;
        // Outline the visible sponge content (scale group), not the empty translate wrapper.
        let target = this.SpongeScaleGroup || this.SpongeTranslateGroup;
        this._spongeOutline = create_SVG_outline_of_group_ID(target);
        this._spongeOutline.classList.add("focus_on_SVG_outline");
        this.SpongeTranslateGroup.insertBefore(this._spongeOutline, this.SpongeTranslateGroup.firstChild);
    }

    hide_sponge_turn_outline() {
        if (this._spongeOutline) {
            this._spongeOutline.remove();
            this._spongeOutline = null;
        }
    }

    set_sponge_active(active) {
        if (!this.SpongeTranslateGroup) return;
        if (active) {
            this.SpongeTranslateGroup.style.cursor = "grab";
            this.SpongeTranslateGroup.style.filter = "none";
            this.SpongeTranslateGroup.style.opacity = 1;
            // Pulse outline cue
            this.SpongeTranslateGroup.style.outline = "none";
            if (!this._spongePulse) {
                this.SpongeTranslateGroup.style.transition = "filter 300ms ease-in-out";
                this.SpongeTranslateGroup.style.filter = "drop-shadow(0px 0px 12px gold)";
                setTimeout(() => {
                    if (this.SpongeTranslateGroup) this.SpongeTranslateGroup.style.filter = "none";
                }, 500);
            }
            // Re-bind if previously cleared
            if (!this.SpongeTranslateGroup.onpointerdown && this._spongeActiveX != null) {
                // Input already bound in spawn_and_enable_sponge; only null it when disabling
            }
        } else {
            this.SpongeTranslateGroup.onpointermove = null;
            this.SpongeTranslateGroup.onpointerup = null;
            // Keep onpointerdown but gate via scrubMode / flag
            this.SpongeTranslateGroup.style.cursor = "auto";
            this.SpongeTranslateGroup.style.filter = "grayscale(0.7) brightness(0.85)";
        }
        this._spongeActive = active;
    }

    async drop_sponge_to_floor(floor_y) {
        if (!this.SpongeTranslateGroup) return;
        this._spongeActive = false;
        this.hide_sponge_turn_outline();
        this.SpongeTranslateGroup.onpointerdown = null;
        this.SpongeTranslateGroup.style.cursor = "auto";
        let x = this._spongeActiveX;
        this.SpongeFloorTransform = `translate(${x}px, ${floor_y}px)`;
        this.SpongeTranslateGroup.style.transition = "all 450ms cubic-bezier(0.4, 0, 0.6, 1.2)";
        this.SpongeTranslateGroup.style.transform = this.SpongeFloorTransform;
        this.SpongeTranslateGroup.style.filter = "grayscale(0.7) brightness(0.85)";
        await wait(450);
    }

    async raise_sponge_to_active() {
        if (!this.SpongeTranslateGroup) return;
        this._spongeActive = false;
        this.SpongeTranslateGroup.onpointerdown = null;
        this.SpongeBaseTransform = `translate(${this._spongeActiveX}px, ${this._spongeActiveY}px)`;
        this.SpongeTranslateGroup.style.transition = "all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)";
        this.SpongeTranslateGroup.style.transform = this.SpongeBaseTransform;
        this.SpongeTranslateGroup.style.filter = "none";
        this.SpongeTranslateGroup.style.opacity = 1;
        await wait(400);
    }

    _rebind_sponge_pointer() {
        if (!this.SpongeTranslateGroup) return;
        let center_x = this._spongeActiveX;
        let center_y = this._spongeActiveY;
        let ParentLayer = this._spongeParentLayer;
        let SpongeCenterGroup = this._SpongeCenterGroup;
        let squishTimeout;
        let on_all_clean_callback = this._on_all_clean_callback;

        this.SpongeTranslateGroup.onpointerdown = (e) => {
            if (this._spongeActive === false) return;
            this.SpongeTranslateGroup.setPointerCapture(e.pointerId);
            this.SpongeTranslateGroup.style.transition = "none";
            this.SpongeTranslateGroup.style.cursor = "grabbing";
            // Hide focus outline while dragging to avoid CSS artifacts.
            this.hide_sponge_turn_outline();

            let pt = GenParam.SVGObject.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            let startSvgPos = pt.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());
            let lastSvgPos = startSvgPos;
            let bubbleDistanceTracker = 0;

            this.SpongeTranslateGroup.onpointermove = (ev) => {
                if (this._spongeActive === false) return;
                pt.x = ev.clientX;
                pt.y = ev.clientY;
                let currentSvgPos = pt.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());

                let moveDx = currentSvgPos.x - startSvgPos.x;
                let moveDy = currentSvgPos.y - startSvgPos.y;
                let newX = center_x + moveDx;
                let newY = center_y + moveDy;

                let frameDx = currentSvgPos.x - lastSvgPos.x;
                let frameDy = currentSvgPos.y - lastSvgPos.y;
                let distanceMoved = Math.sqrt(frameDx * frameDx + frameDy * frameDy);
                lastSvgPos = currentSvgPos;

                let squish = Math.max(0.75, 1 - (distanceMoved * 0.015));
                let stretch = Math.min(1.15, 1 + (distanceMoved * 0.005));
                SpongeCenterGroup.style.transition = "transform 50ms ease-out";
                SpongeCenterGroup.style.transform = `scale(${stretch}, ${squish})`;
                clearTimeout(squishTimeout);
                squishTimeout = setTimeout(() => {
                    SpongeCenterGroup.style.transition = "transform 250ms cubic-bezier(0.25, 1.5, 0.5, 1)";
                    SpongeCenterGroup.style.transform = `scale(1, 1)`;
                }, 80);

                let targetRect = this.TargetElement.getBoundingClientRect();
                let isOverTarget = (
                    ev.clientX >= targetRect.left &&
                    ev.clientX <= targetRect.right &&
                    ev.clientY >= targetRect.top &&
                    ev.clientY <= targetRect.bottom
                );
                if (isOverTarget) {
                    bubbleDistanceTracker += distanceMoved;
                    if (bubbleDistanceTracker > 25) {
                        let bubbleCount = Math.floor(bubbleDistanceTracker / 25);
                        this.spawn_bubbles(currentSvgPos.x, currentSvgPos.y, ParentLayer, bubbleCount);
                        bubbleDistanceTracker %= 25;
                    }
                }

                this.SpongeTranslateGroup.style.transform = `translate(${newX}px, ${newY}px)`;
                this.check_scrub_collision(newX, newY, distanceMoved, ParentLayer, on_all_clean_callback);
            };

            this.SpongeTranslateGroup.onpointerup = (ev) => {
                this.SpongeTranslateGroup.onpointermove = null;
                this.SpongeTranslateGroup.onpointerup = null;
                this.SpongeTranslateGroup.releasePointerCapture(ev.pointerId);
                clearTimeout(squishTimeout);
                SpongeCenterGroup.style.transition = "transform 250ms ease-out";
                SpongeCenterGroup.style.transform = `scale(1, 1)`;

                // Turn still open: snap home and restore the turn cue outline.
                if (this.scrubMode === "turn" && this._spongeActive && this._turnResolve) {
                    this.SpongeTranslateGroup.style.cursor = "grab";
                    this.SpongeTranslateGroup.style.transition = "all 400ms cubic-bezier(0.25, 1, 0.5, 1)";
                    this.SpongeTranslateGroup.style.transform = this.SpongeBaseTransform;
                    this.show_sponge_turn_outline();
                } else {
                    this.SpongeTranslateGroup.style.cursor = this._spongeActive ? "grab" : "auto";
                }
            };
        };
    }

    async fade_out_sponge(ms = 400) {
        if (!this.SpongeTranslateGroup) return;
        this.hide_sponge_turn_outline();
        this.SpongeTranslateGroup.onpointerdown = null;
        this.SpongeTranslateGroup.style.transition = `opacity ${ms}ms ease-in`;
        this.SpongeTranslateGroup.style.opacity = 0;
        await wait(ms);
        this.SpongeTranslateGroup.remove();
        this.SpongeTranslateGroup = null;
    }

    check_scrub_collision(spongeGlobalX, spongeGlobalY, distanceMoved, ParentLayer, on_all_clean_callback) {
        let pt = GenParam.SVGObject.createSVGPoint();
        let spongeRect = this.SpongeScaleGroup.getBoundingClientRect();

        pt.x = spongeRect.x + (spongeRect.width / 2);
        pt.y = spongeRect.y + (spongeRect.height / 2);
        let spongeSVG = pt.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());

        // A multiplier to tune the difficulty. Lower = harder to clean.
        let scrubPowerMultiplier = 0.5;

        this.Spots.forEach(spot => {
            if (!spot.is_cleaned) {
                let spotRect = spot.element.getBoundingClientRect();

                pt.x = spotRect.x + (spotRect.width / 2);
                pt.y = spotRect.y + (spotRect.height / 2);
                let spotSVG = pt.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());

                let dx = spongeSVG.x - spotSVG.x;
                let dy = spongeSVG.y - spotSVG.y;
                let dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < 60) {
                    //Subtract the movement distance from the spot's health
                    let damage = (distanceMoved * scrubPowerMultiplier);
                    spot.health -= damage;

                    if (this.scrubMode === "turn") {
                        this.turnCleaned += damage;
                        this._notify_scrub_started();
                        this._note_scrub_progress();
                    }

                    //Fade out the spot dynamically as it gets cleaner
                    spot.element.style.opacity = Math.max(0, spot.health / 100);

                    if (Math.random() < 0.3) {
                        this.spawn_water_particles(spotSVG.x, spotSVG.y, ParentLayer);
                    }

                    // Only trigger the "clean" logic when health drops below zero
                    if (spot.health <= 0) {
                        spot.is_cleaned = true;
                        this.dirt_remaining--;

                        AudioCont.play_sound_effect("scrub");
                        this.spawn_water_particles(spotSVG.x, spotSVG.y, ParentLayer);
                        this.spawn_water_particles(spotSVG.x, spotSVG.y, ParentLayer);

                        spot.element.style.transition = "all 200ms ease-out";
                        spot.element.style.transform += " scale(0)";
                        setTimeout(() => spot.element.remove(), 200);

                        if (this.dirt_remaining <= 0 && this.scrubMode !== "turn") {
                            Interface.Prompt.show_message("Great job! All the dirt is gone!")
                            this.SpongeTranslateGroup.onpointerdown = null;
                            this.SpongeTranslateGroup.style.transition = "all 500ms ease-in";
                            this.SpongeTranslateGroup.style.transform += " rotate(180deg) scale(0)";
                            this.SpongeTranslateGroup.style.opacity = 0;

                            AudioCont.play_sound_effect("success");

                            // ----------------------------------------------------
                            // NEW: The Suds Purge
                            // ----------------------------------------------------
                            // Grab every active bubble currently on the screen
                            let activeBubbles = document.querySelectorAll('.soap-bubble');
                            activeBubbles.forEach(b => {
                                // Override their drift transition and force an instant fade out
                                b.style.transition = "opacity 100ms ease-out";
                                b.style.opacity = "0";
                            });

                            // Delay the sparkles by 300ms so the screen is completely clear
                            setTimeout(() => {
                                this.spawn_squeaky_clean_sparkles(this.TargetElement, ParentLayer);
                            }, 300);

                            // Extended slightly to accommodate the new 300ms delay
                            setTimeout(() => on_all_clean_callback(), 3500);
                        }
                    }

                    if (this.scrubMode === "turn" && this._turnResolve &&
                        (this.turnCleaned >= this.turnQuota || this.dirt_remaining <= 0)) {
                        this._resolve_scrub_turn_if_ready(true);
                    }
                }
            }
        });
    }

    spawn_bubbles(cursorX, cursorY, ParentLayer, count) {
        const manual_offset_x = 75;
        const manual_offset_y = 75;

        for (let i = 0; i < count; i++) {
            let radius = 20 + Math.random() * 40; // Bubble size
            let startX = cursorX + manual_offset_x + (Math.random() - 0.5) * 140;
            let startY = cursorY + manual_offset_y + (Math.random() - 0.5) * 140;

            // Generate the beautiful bubble!
            let bubble = create_beautiful_bubble(ParentLayer, startX, startY, radius, this.SpongeTranslateGroup);

            // Pop into existence
            bubble.style.transition = "transform 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275)";
            setTimeout(() => {
                bubble.style.transform = `translate(${startX}px, ${startY}px) scale(1)`;
            }, 10);

            // Drift outward
            let driftX = (Math.random() - 0.5) * 80;
            let driftY = -30 - Math.random() * 50;

            setTimeout(() => {
                bubble.style.transition = "all 800ms ease-out";
                bubble.style.transform = `translate(${startX + driftX}px, ${startY + driftY}px) scale(1)`;
            }, 160);

            // Swell and pop
            setTimeout(() => {
                bubble.style.transition = "all 100ms ease-out";
                bubble.style.transform = `translate(${startX + driftX}px, ${startY + driftY - 20}px) scale(1.4)`;
                bubble.style.opacity = "0";

                setTimeout(() => {
                    bubble.remove();
                    AudioCont.play_sound_effect("bubble_pop_small");
                }, 100);
            }, 600 + Math.random() * 500);
        }
    }
    spawn_water_particles(x, y, ParentLayer) {
        // Spawn 1 to 3 little dirty droplets per hit
        let count = 1 + Math.floor(Math.random() * 2);

        for (let i = 0; i < count; i++) {
            let drop = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            let radius = 20 + Math.random() * 20;
            drop.setAttribute('r', radius);
            drop.setAttribute('cx', 0);
            drop.setAttribute('cy', 0);

            // Slightly dingy/soapy water colors
            const colors = ['#8CA5B5', '#A5B5C1', '#C2D1D9', '#E0FFFF'];
            drop.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);
            drop.setAttribute('opacity', '0.8');

            // Start at the center of the dirt spot
            drop.style.transform = `translate(${x}px, ${y}px) scale(1)`;

            ParentLayer.insertBefore(drop, this.SpongeTranslateGroup);

            // Splash outwards, and fall far down (300 to 500 pixels)
            let endX = x + (Math.random() - 0.5) * 120;
            let endY = y + 300 + Math.random() * 200;

            setTimeout(() => {
                // cubic-bezier(0.4, 0, 1, 1) is a true "Gravity/Accelerate" curve!
                drop.style.transition = "transform 500ms cubic-bezier(0.4, 0.0, 1, 1), opacity 400ms ease-in";

                // Shrink slightly as it falls, and trigger the fall
                drop.style.transform = `translate(${endX}px, ${endY}px) scale(0.4)`;

                // Wait slightly before fading out so it stays visible while falling
                setTimeout(() => drop.style.opacity = "0", 100);

                // Cleanup
                setTimeout(() => drop.remove(), 500);
            }, 10); // 10ms delay ensures the browser registers the starting coordinates
        }
    }

    spawn_squeaky_clean_sparkles(TargetElement, ParentLayer) {
        let pt = GenParam.SVGObject.createSVGPoint();
        let targetRect = TargetElement.getBoundingClientRect();
        pt.x = targetRect.x + (targetRect.width / 2);
        pt.y = targetRect.y + (targetRect.height / 2);
        let centerSVG = pt.matrixTransform(GenParam.SVGObject.getScreenCTM().inverse());

        // BIGGER AND WIDER: Increased scales and pushed the offsets out further
        const offsets = [
            { dx: -90, dy: -80, delay: 0, scale: 2.2 },
            { dx: 100, dy: -30, delay: 200, scale: 1.6 },
            { dx: -40, dy: 90, delay: 400, scale: 1.9 }
        ];

        offsets.forEach(pos => {
            setTimeout(() => {
                let sparkle = document.createElementNS('http://www.w3.org/2000/svg', 'path');

                sparkle.setAttribute('d', 'M 0 -30 Q 0 0 30 0 Q 0 0 0 30 Q 0 0 -30 0 Q 0 0 0 -30 Z');
                sparkle.setAttribute('fill', 'gold');
                sparkle.setAttribute('stroke', 'white');
                sparkle.setAttribute('stroke-width', '3');

                let startX = centerSVG.x + pos.dx;
                let startY = centerSVG.y + pos.dy;

                sparkle.style.transformOrigin = "center";
                sparkle.style.transformBox = "fill-box";
                sparkle.style.transform = `translate(${startX}px, ${startY}px) scale(0) rotate(-45deg)`;

                ParentLayer.appendChild(sparkle);

                // 1. Grand Entrance (Pop in and spin)
                setTimeout(() => {
                    sparkle.style.transition = "all 600ms cubic-bezier(0.175, 0.885, 0.32, 1.275)";
                    sparkle.style.transform = `translate(${startX}px, ${startY}px) scale(${pos.scale}) rotate(135deg)`;
                }, 20);

                // 2. The Linger (Slowly spin and pulse slightly larger)
                setTimeout(() => {
                    sparkle.style.transition = "all 1500ms linear";
                    sparkle.style.transform = `translate(${startX}px, ${startY}px) scale(${pos.scale + 0.2}) rotate(225deg)`;
                }, 650);

                // 3. The Fade Out (Massively delayed!)
                setTimeout(() => {
                    sparkle.style.transition = "all 400ms ease-in";
                    sparkle.style.transform = `translate(${startX}px, ${startY}px) scale(0) rotate(315deg)`;
                    sparkle.style.opacity = 0;

                    setTimeout(() => sparkle.remove(), 400);
                }, 2100); // Lingers for a full 2 seconds before fading!

            }, pos.delay);
        });
    }

    clean_up() {
        this.clear_scrub_idle_watch();
        this.stop_dirt_hint_pulse();
        this.Spots.forEach(s => {
            if (s.element) s.element.remove();
        });
        if (this.SpongeTranslateGroup) this.SpongeTranslateGroup.remove();
    }
}

class FoliageModule {
    AllFoliageControllers = [];
    RemainingFoliageControllersByLocation = { Main: {}, Plus1: {}, Plus2: {} };
    on_all_cleared_callback = null;

    constructor(FenObj, partner_is_present) {
        this.FenObj = FenObj;
        this.foliage_base_health = partner_is_present ? 7 : 5;
    }

    spawn_foliage(ItemLayers, Spots, layer_y_pos, FoliageSizes) {
        for (let layer in Spots) {
            for (let spotnum in Spots[layer]) {
                let x_pos = Spots[layer][spotnum] * GenParam.SVG_width;
                let FoliageCont = new this.FoliageSubController(
                    this,
                    ItemLayers[layer],
                    layer,
                    x_pos,
                    layer_y_pos[layer] * GenParam.SVG_height,
                    FoliageSizes[layer],
                    ItemLayers.Plus2 // Target layer for particles
                );
                this.AllFoliageControllers.push(FoliageCont);
                this.RemainingFoliageControllersByLocation[layer][x_pos] = FoliageCont;
            }
        }
    }

    spawn_foliage_around_target(ItemLayers, target_x, target_y) {
        // We define a tight cluster of plants relative to the target's center.
        // FIX: Removed all "Plus1" (background) plants so participants aren't forced
        // to cut plants that aren't physically blocking the box.
        let cluster = [
            { layer: "Plus2", offset_x: -140, offset_y: 80, size: 2.8 }, // Front Far Left
            { layer: "Plus2", offset_x: -50,  offset_y: 50, size: 3.0 }, // Front Inner Left
            { layer: "Plus2", offset_x: 50,   offset_y: 50, size: 3.0 }, // Front Inner Right
            { layer: "Plus2", offset_x: 140,  offset_y: 80, size: 2.8 }  // Front Far Right
        ];

        cluster.forEach(spot => {
            let actual_x = target_x + spot.offset_x;
            let actual_y = target_y + spot.offset_y;

            let FoliageCont = new this.FoliageSubController(
                this,
                ItemLayers[spot.layer],
                spot.layer,
                actual_x,
                actual_y,
                spot.size,
                ItemLayers.Plus2
            );

            this.AllFoliageControllers.push(FoliageCont);

            // Register it in the dictionary so the Partner AI can find it!
            this.RemainingFoliageControllersByLocation[spot.layer][actual_x] = FoliageCont;
        });
    }

    /** Single plant to the left of a box (joint_box_cleaning). */
    spawn_one_plant_left_of(ItemLayers, target_x, target_y, offset_x = -200, offset_y = 60, size = 3.0) {
        let actual_x = target_x + offset_x;
        let actual_y = target_y + offset_y;
        let FoliageCont = new this.FoliageSubController(
            this,
            ItemLayers.Plus2,
            "Plus2",
            actual_x,
            actual_y,
            size,
            ItemLayers.Plus2
        );
        this.AllFoliageControllers.push(FoliageCont);
        this.RemainingFoliageControllersByLocation.Plus2[actual_x] = FoliageCont;
        return FoliageCont;
    }

    /** Apply one cut hit to a remaining plant (NPC / Fennimal turn). */
    apply_one_cut_hit() {
        let target = this.get_target_tree();
        if (!target) return false;
        let Cutsite = target.get_center_pos_on_screen();
        Cutsite.x += (Math.random() - 0.5) * 40;
        Cutsite.y += (Math.random() - 0.5) * 40;
        target.cut_external(Cutsite);
        return true;
    }

    async fade_out_all(ms = 400) {
        for (let cont of this.AllFoliageControllers) {
            if (cont && cont.Foliage) {
                cont.Foliage.style.transition = `opacity ${ms}ms ease-in`;
                cont.Foliage.style.opacity = 0;
                cont.is_cuttable = false;
            }
        }
        await wait(ms);
        this.clear_all();
    }

    make_foliage_cuttable(callback = null) {
        this.on_all_cleared_callback = callback;
        for (let contnum in this.AllFoliageControllers) {
            this.AllFoliageControllers[contnum].toggle_cuttable(true);
        }
    }

    check_if_all_cleared() {
        // If no callback was provided (like in FindBox), do nothing
        if (!this.on_all_cleared_callback) return;

        let total_remaining = 0;
        let layers = ["Main", "Plus1", "Plus2"];

        for (let layer of layers) {
            // Count how many keys are left in the dictionary for each layer
            total_remaining += Object.keys(this.RemainingFoliageControllersByLocation[layer]).length;
        }

        if (total_remaining === 0) {
            // Fire the callback and clear it so it only ever triggers once
            let cb = this.on_all_cleared_callback;
            this.on_all_cleared_callback = null;
            cb();
        }
    }

    get_target_tree() {
        let layers_by_order = ["Plus2", "Plus1", "Main"];
        for (let layer of layers_by_order) {
            let keys = Object.keys(this.RemainingFoliageControllersByLocation[layer]);
            if (keys.length > 0) {
                let random_key = shuffleArray(keys)[0];
                return this.RemainingFoliageControllersByLocation[layer][random_key];
            }
        }
        return null; // All trees cut
    }

    clear_all() {
        for (let contnum in this.AllFoliageControllers) {
            this.AllFoliageControllers[contnum].remove();
        }
    }

    clean_up() {
        this.clear_all();
    }

    start_partner_cutting(PartnerObj, avoid_x = null) {
        this.partner_is_cutting = true;
        this.partner_cutting_loop(PartnerObj, avoid_x);
    }

    stop_partner_cutting() {
        this.partner_is_cutting = false;
    }

    async partner_cutting_loop(PartnerObj, avoid_x = null) {
        if (!this.partner_is_cutting) return;

        let target = this.get_target_tree();

        if (!target) {
            // FIX: Out of targets! Return to the starting corner, but safely avoid the hidden object if specified.
            PartnerObj.return_to_start(avoid_x);
            return;
        }

        // 1. Move to tree
        PartnerObj.PartnerTranslateGroup.style.transition = "all 500ms ease-in-out";
        let target_x = target.get_center_pos_on_screen().x;
        let dx = target_x - getSVGInternalCenter(PartnerObj.PartnerTranslateGroup).x;
        let offset = (target_x - 200 < 0) ? 200 : -200;

        PartnerObj.PartnerTranslateGroup.style.transform += `translateX(${dx + offset}px)`;
        await wait(600);

        // 2. Cut until destroyed
        while (target.get_health() > 0 && this.partner_is_cutting) {
            let Cutsite = target.get_center_pos_on_screen();
            Cutsite.x += (Math.random() - 0.5) * 100;
            Cutsite.y += (Math.random() - 0.5) * 100;
            target.cut_external(Cutsite);
            await wait(250);
        }

        // 3. Recurse
        if (this.partner_is_cutting) {
            this.partner_cutting_loop(PartnerObj, avoid_x);
        }
    }

    // Bound Subclass for individual plants
    FoliageSubController = class {
        constructor(ParentModule, LayerElement, layer_name, xpos, ypos, size, ParticleLayer) {
            this.ParentModule = ParentModule;
            this.layer_name = layer_name;
            this.xpos = xpos;

            this.Foliage = copy_scale_and_move_object_to_position(document.getElementById("foliage_" + ParentModule.FenObj.region), LayerElement, xpos, ypos, size);
            this.Foliage.style.cursor = "pointer";

            this.Cut_Elem = this.Foliage.getElementsByClassName("cut_foliage")[0];
            this.Uncut_Elem = this.Foliage.getElementsByClassName("uncut_foliage")[0];

            this.Cut_Elem.style.opacity = 0;
            this.Uncut_Elem.style.transition = "all 300ms ease-out";

            this.foliage_health = ParentModule.foliage_base_health;
            this.is_cuttable = false;
            this.has_been_cut = false;

            this.Foliage.onpointerdown = (event) => {
                if (this.is_cuttable && !this.has_been_cut) {
                    this.cut(getMousePosition(event));
                }
            };

            // Particle Generator
            this.spawnParticles = (clickX, clickY) => {
                const colors = ['#8B4513', '#A0522D', '#CD853F', '#D2B48C'];
                for (let i = 0; i < 12; i++) {
                    const particle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    const p_size = Math.random() * 50 + 20;

                    particle.setAttribute('width', p_size);
                    particle.setAttribute('height', p_size);
                    particle.setAttribute('x', clickX - p_size / 2);
                    particle.setAttribute('y', clickY - p_size / 2);
                    particle.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);
                    particle.classList.add('wood-splinter');

                    const endX = (Math.random() - 0.5) * 650;
                    const endY = Math.random() * 150 + 80;
                    const jump = -(Math.random() * 140 + 20);
                    const rot = (Math.random() - 0.5) * 720;

                    particle.style.setProperty('--x', `${endX}px`);
                    particle.style.setProperty('--y', `${endY}px`);
                    particle.style.setProperty('--jump', `${jump}px`);
                    particle.style.setProperty('--rot', `${rot}deg`);

                    ParticleLayer.appendChild(particle);
                    setTimeout(() => particle.remove(), 500);
                }
            };
        }

        cut(coords) {
            AudioCont.play_sound_effect("chop");
            if (this.foliage_health > 1) {
                this.foliage_health--;
                this.spawnParticles(coords.x, coords.y);
            } else {
                this.foliage_health = 0;
                this.has_been_cut = true;
                this.Cut_Elem.style.opacity = 1;
                this.Uncut_Elem.style.opacity = 0;
                this.Foliage.style.pointerEvents = "none";
                this.Foliage.style.cursor = "auto";
                delete this.ParentModule.RemainingFoliageControllersByLocation[this.layer_name][this.xpos];

                this.ParentModule.check_if_all_cleared();
            }
        }

        toggle_cuttable(bool) { this.is_cuttable = bool; }
        get_center_pos_on_screen() { return getSVGInternalCenter(this.Foliage); }
        cut_external(Coords) { this.cut(Coords); }
        get_health() { return this.foliage_health; }

        remove() {
            this.Foliage.style.transition = "all 300ms ease-in";
            this.Foliage.style.opacity = 0;
            this.is_cuttable = false;
            setTimeout(() => this.Foliage.remove(), 400);
        }
    }
}

class DustModule {
    constructor() {
        // Preload sounds
        AudioCont.load_audio("air_puff", "air_puff.mp3", false); // Add a puffy air sound to your Audio folder!
        AudioCont.load_audio("success", "success.mp3", false);
    }

    apply_dust_filter(BoxBase, BoxTop) {
        if (!BoxBase && !BoxTop) return;

        this.BoxBase = BoxBase || null;
        this.BoxTop = BoxTop || null;

        this.dust_level = 100;

        let filter_string = `sepia(0.4) grayscale(0.6) brightness(0.7) contrast(0.8) blur(1px)`;
        if (this.BoxBase) {
            this.BoxBase.style.filter = filter_string;
            this.BoxBase.style.transition = "filter 400ms ease-out";
        }
        if (this.BoxTop) {
            this.BoxTop.style.filter = filter_string;
            this.BoxTop.style.transition = "filter 400ms ease-out";
        }
    }

    spawn_and_enable_bellows(ParentLayer, box_center_x, box_center_y, on_clean_callback, options = {}) {
        this.spawn_bellows(ParentLayer, box_center_x, box_center_y, options);
        this._on_dust_clean_callback = on_clean_callback;
        this._bellows_player_enabled = options.playerEnabled !== false;

        if (this._bellows_player_enabled) {
            this.BellowsTranslateGroup.style.cursor = "pointer";
            this.BellowsTranslateGroup.onpointerdown = () => {
                this.puff();
            };
        } else {
            this.BellowsTranslateGroup.style.cursor = "auto";
            this.BellowsTranslateGroup.onpointerdown = null;
        }
    }

    /**
     * Place bellows without requiring player input (NPC-driven trials).
     * options: { offsetX, offsetY, scale, playerEnabled }
     */
    spawn_bellows(ParentLayer, box_center_x, box_center_y, options = {}) {
        let rawBellows = document.getElementById("bellows").cloneNode(true);
        rawBellows.id = "active_bellows";
        rawBellows.style.display = "inherit";

        this._bellowsOutline = null;
        if (options.showOutline !== false) {
            this._bellowsOutline = create_SVG_outline_of_group_ID(rawBellows);
            this._bellowsOutline.classList.add("focus_on_SVG_outline");
        }

        this.BellowsScaleGroup = create_SVG_group(0, 0);
        this.BellowsScaleGroup.style.transform = `scale(${options.scale != null ? options.scale : 3.5})`;
        if (this._bellowsOutline) this.BellowsScaleGroup.appendChild(this._bellowsOutline);
        this.BellowsScaleGroup.appendChild(rawBellows);

        this.BellowsTranslateGroup = create_SVG_group(0, 0);
        this.BellowsTranslateGroup.appendChild(this.BellowsScaleGroup);
        ParentLayer.appendChild(this.BellowsTranslateGroup);

        let offsetX = options.offsetX != null ? options.offsetX : 180;
        let offsetY = options.offsetY != null ? options.offsetY : -40;
        let start_x = box_center_x + offsetX;
        let start_y = box_center_y + offsetY - 760;
        this._bellowsRestTransform = `translate(${box_center_x + offsetX}px, ${box_center_y + offsetY}px)`;
        this.BellowsTranslateGroup.style.transform = `translate(${start_x}px, ${start_y}px)`;

        this._bellows_top = rawBellows.querySelector(".bellows_top");
        this._bellows_gasket = rawBellows.querySelector(".bellows_gasket");
        this._bellows_nozzle = rawBellows.querySelector(".nozzle_point");
        this._bellows_parent = ParentLayer;
        this._bellows_box_cx = box_center_x;
        this._bellows_box_cy = box_center_y;
        this._bellows_puff_amount = options.puffAmount != null ? options.puffAmount : 10;
        this._bellows_animating = false;

        let pivot = this._bellows_top ? this._bellows_top.querySelector(".bellows_pivot_point") : null;
        if (this._bellows_top && pivot) {
            this._bellows_top.style.transformBox = "fill-box";
            let pBox = pivot.getBBox();
            let bBox = this._bellows_top.getBBox();
            let px = ((pBox.x + pBox.width / 2 - bBox.x) / bBox.width) * 100;
            let py = ((pBox.y + pBox.height / 2 - bBox.y) / bBox.height) * 100;
            this._bellows_top.style.transformOrigin = `${px}% ${py}%`;
        }
        if (this._bellows_gasket && pivot) {
            this._bellows_gasket.style.transformBox = "fill-box";
            let pBox = pivot.getBBox();
            let gBox = this._bellows_gasket.getBBox();
            let px = ((pBox.x + pBox.width / 2 - gBox.x) / gBox.width) * 100;
            let py = ((pBox.y + pBox.height / 2 - gBox.y) / gBox.height) * 100;
            this._bellows_gasket.style.transformOrigin = `${px}% ${py}%`;
        }

        this.BellowsTranslateGroup.style.opacity = 0;
        window.getComputedStyle(this.BellowsTranslateGroup).opacity;
        this.BellowsTranslateGroup.style.transition = "all 600ms cubic-bezier(0.34, 1.56, 0.64, 1)";
        this.BellowsTranslateGroup.style.opacity = 1;
        this.BellowsTranslateGroup.style.transform = this._bellowsRestTransform;

        this._baseBoxBaseTransform = this.BoxBase ? this.BoxBase.style.transform : "";
        this._baseBoxTopTransform = this.BoxTop ? this.BoxTop.style.transform : "";
    }

    /**
     * One bellows puff. Returns a Promise that resolves when the refill animation finishes.
     * options.amount overrides dust reduction for this puff.
     */
    puff(options = {}) {
        if (this._bellows_animating || this.dust_level <= 0 || !this.BellowsTranslateGroup) {
            return Promise.resolve(false);
        }
        this._bellows_animating = true;

        if (this._bellowsOutline) {
            this._bellowsOutline.remove();
            this._bellowsOutline = null;
        }

        let amount = options.amount != null ? options.amount : this._bellows_puff_amount;
        let ParentLayer = this._bellows_parent;
        let box_center_x = this._bellows_box_cx;
        let box_center_y = this._bellows_box_cy;

        AudioCont.play_sound_effect("air_puff");

        if (this._bellows_top) {
            this._bellows_top.style.transition = "transform 50ms ease-in";
            this._bellows_top.style.transform = "rotate(32deg)";
        }
        if (this._bellows_gasket) {
            this._bellows_gasket.style.transition = "transform 50ms ease-in";
            this._bellows_gasket.style.transform = "rotate(12deg) scale(0.9, 0.5)";
        }

        if (this.BoxBase || this.BoxTop) {
            if (this.BoxBase) {
                this.BoxBase.style.transition = "transform 50ms ease-in-out";
                this.BoxBase.style.transform = this._baseBoxBaseTransform + " translate(-8px, 8px)";
            }
            if (this.BoxTop) {
                this.BoxTop.style.transition = "transform 50ms ease-in-out";
                this.BoxTop.style.transform = this._baseBoxTopTransform + " translate(-8px, 8px)";
            }
        }

        if (this._bellows_nozzle && ParentLayer) {
            let pt = GenParam.SVGObject.createSVGPoint();
            let nBox = this._bellows_nozzle.getBBox();
            pt.x = nBox.x + nBox.width / 2;
            pt.y = nBox.y + nBox.height / 2;
            let screenNozzle = pt.matrixTransform(this._bellows_nozzle.getScreenCTM());
            let localNozzle = screenNozzle.matrixTransform(ParentLayer.getScreenCTM().inverse());
            this.spawn_wind_streaks(ParentLayer, localNozzle.x, localNozzle.y, box_center_x, box_center_y);
            this.spawn_dislodged_dust(ParentLayer, box_center_x, box_center_y);
        }

        this.dust_level = Math.max(0, this.dust_level - amount);
        let p = this.dust_level / 100;
        let filter_string = `sepia(${0.4 * p}) grayscale(${0.6 * p}) brightness(${1 - (0.3 * p)}) contrast(${1 - (0.2 * p)}) blur(${1 * p}px)`;
        if (this.BoxBase) this.BoxBase.style.filter = filter_string;
        if (this.BoxTop) this.BoxTop.style.filter = filter_string;

        return new Promise(resolve => {
            setTimeout(() => {
                if (this.BoxBase) this.BoxBase.style.transform = this._baseBoxBaseTransform;
                if (this.BoxTop) this.BoxTop.style.transform = this._baseBoxTopTransform;

                if (this._bellows_top) {
                    this._bellows_top.style.transition = "transform 700ms cubic-bezier(0.25, 1.5, 0.5, 1)";
                    this._bellows_top.style.transform = "rotate(0deg)";
                }
                if (this._bellows_gasket) {
                    this._bellows_gasket.style.transition = "transform 700ms cubic-bezier(0.25, 1.5, 0.5, 1)";
                    this._bellows_gasket.style.transform = "rotate(0deg) scale(1, 1)";
                }

                if (this.dust_level <= 0) {
                    this.BellowsTranslateGroup.onpointerdown = null;
                    this.BellowsTranslateGroup.style.cursor = "auto";
                    setTimeout(() => {
                        if (typeof this._on_dust_clean_callback === "function") {
                            // Legacy find_box_extended path: fly away + callback
                            AudioCont.play_sound_effect("success");
                            this.BellowsTranslateGroup.style.transition = "all 500ms ease-in";
                            this.BellowsTranslateGroup.style.transform += " translate(200px, -200px) scale(0)";
                            this.BellowsTranslateGroup.style.opacity = 0;
                            setTimeout(() => {
                                this._bellows_animating = false;
                                this._on_dust_clean_callback();
                                resolve(true);
                            }, 600);
                        } else {
                            this._bellows_animating = false;
                            resolve(true);
                        }
                    }, 700);
                } else {
                    let unlockMs = options.waitForRefill ? 750 : 50;
                    setTimeout(() => {
                        this._bellows_animating = false;
                        resolve(true);
                    }, unlockMs);
                }
            }, 50);
        });
    }

    async fade_out_bellows(ms = 400) {
        if (!this.BellowsTranslateGroup) return;
        this.BellowsTranslateGroup.onpointerdown = null;
        this.BellowsTranslateGroup.style.transition = `opacity ${ms}ms ease-in`;
        this.BellowsTranslateGroup.style.opacity = 0;
        await wait(ms);
        this.BellowsTranslateGroup.remove();
        this.BellowsTranslateGroup = null;
    }

    spawn_wind_streaks(ParentLayer, startX, startY, targetX, targetY) {
        // Doubled the wind streaks for more power!
        for (let i = 0; i < 10; i++) {
            let streak = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            streak.setAttribute('width', 80 + Math.random() * 60); // Longer streaks
            streak.setAttribute('height', 5 + Math.random() * 5);  // Thicker streaks
            streak.setAttribute('rx', 4);
            streak.setAttribute('fill', 'rgba(255, 255, 255, 0.85)');
            streak.setAttribute('x', 0);
            streak.setAttribute('y', 0);

            let dx = targetX - startX;
            let dy = targetY - startY;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);

            // Wider spread from the nozzle
            let ox = startX + (Math.random() - 0.5) * 60;
            let oy = startY + (Math.random() - 0.5) * 60;

            streak.style.transformOrigin = "left center";
            streak.style.transformBox = "fill-box";
            streak.style.transform = `translate(${ox}px, ${oy}px) rotate(${angle + (Math.random()-0.5)*10}deg) scale(0)`;
            ParentLayer.appendChild(streak);

            setTimeout(() => {
                // Faster wind!
                streak.style.transition = "transform 150ms ease-in, opacity 150ms ease-in";
                let endX = ox + (dx * 0.9);
                let endY = oy + (dy * 0.9);
                streak.style.transform = `translate(${endX}px, ${endY}px) rotate(${angle}deg) scale(1)`;
                streak.style.opacity = 0;

                setTimeout(() => streak.remove(), 150);
            }, 10);
        }
    }

    spawn_dislodged_dust(ParentLayer, boxX, boxY) {
        let colors = ['#A9A9A9', '#808080', '#696969', '#8B7355'];

        // Doubled dust clouds!
        for (let i = 0; i < 12; i++) {
            let dust = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dust.setAttribute('r', 25 + Math.random() * 40); // Bigger dust
            dust.setAttribute('cx', 0);
            dust.setAttribute('cy', 0);
            dust.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);
            dust.setAttribute('opacity', 0.7);

            // Start around the box, covering a wider area
            let startX = boxX + (Math.random() - 0.5) * 200;
            let startY = boxY + (Math.random() - 0.5) * 200;

            dust.style.transformOrigin = "center";
            dust.style.transformBox = "fill-box";
            dust.style.transform = `translate(${startX}px, ${startY}px) scale(0.2)`;
            ParentLayer.appendChild(dust);

            // Blow further and faster!
            setTimeout(() => {
                dust.style.transition = "all 500ms cubic-bezier(0.25, 1, 0.5, 1)";
                let endX = startX - 300 - (Math.random() * 300);
                let endY = startY + (Math.random() - 0.5) * 300;

                dust.style.transform = `translate(${endX}px, ${endY}px) scale(1.8)`;
                dust.style.opacity = 0;

                setTimeout(() => dust.remove(), 500);
            }, 50);
        }
    }

    clean_up() {
        if (this.BellowsTranslateGroup) this.BellowsTranslateGroup.remove();
        if (this.BoxBase) this.BoxBase.style.filter = "none";
        if (this.BoxTop) this.BoxTop.style.filter = "none";
    }
}

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

// Repair a broken toy without a box: Fennimal → optional toy question → repair → charge/play → toy left behind.
class BrokenToyNoBoxTrialController extends GeneralTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        super(FenObj, partner_is_present, returnfunc);
        this.brokenToyLogic = new BrokenToyModule(FenObj);
        this.trial_is_active = true;
        this.failsafe_timeout = null;
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
            this.brokenToyLogic.snap_part_to_correct(
                targetPart,
                (count) => this.handle_part_placed(count)
            );
        }, 600);
    }

    async partner_repair_loop() {
        if (!this.trial_is_active) return;

        await wait(5000 + (Math.random() * 5000));
        if (!this.trial_is_active) return;

        let targetPart = this.brokenToyLogic.get_random_unplaced_part();
        if (!targetPart) return;

        targetPart.is_locked = true;
        let partnerGroup = this.partner.PartnerTranslateGroup;
        partnerGroup.style.transition = "all 1000ms ease-in-out";

        let dxToPart = getSVGInternalCenter(targetPart.element).x - getSVGInternalCenter(partnerGroup).x;
        partnerGroup.style.transform += `translateX(${dxToPart}px)`;
        await wait(1200);

        let dxToFrame = getSVGInternalCenter(this.brokenToyLogic.ToyFrame).x - getSVGInternalCenter(partnerGroup).x;
        partnerGroup.style.transform += `translateX(${dxToFrame}px)`;
        this.brokenToyLogic.set_part_transform(targetPart, 0, 0, 0);
        await wait(600);

        this.brokenToyLogic.snap_part_to_correct(
            targetPart,
            (count) => this.handle_part_placed(count)
        );
        partnerGroup.style.transform = "";
        await wait(1000);
        this.partner_repair_loop();
    }

    async handle_all_parts_placed() {
        this.trial_is_active = false;
        if (this.failsafe_timeout) clearTimeout(this.failsafe_timeout);

        this.brokenToyLogic.restore_pointer_events();
        Interface.Prompt.hide();
        await wait(1000);
        AudioCont.play_sound_effect("positive");
        Interface.Prompt.show_message("You did it! You fixed the " + this.FenObj.toy + "!");
        await this.brokenToyLogic.play_repair_celebration(this.basics.ItemLayers.Plus2);
        await wait(200);
        await this.brokenToyLogic.shrink_to_normal();

        let fennimalCenter = getSVGInternalCenter(this.basics.TargetPoints.Fennimal_body_center);
        await this.brokenToyLogic.move_to_center_of_target_and_shrink(fennimalCenter);
        await this.brokenToyLogic.charge_toy(
            this.basics.ItemLayers.Plus2,
            0.5 * this.basics.W,
            0.4 * this.basics.H,
            this.basics
        );
        await this.brokenToyLogic.play_with_toy(this.basics);
        await wait(500);
        Interface.Prompt.show_message(this.FenObj.name + " has finished playing with the " + this.FenObj.toy);
        await wait(500);

        // Match Fennimal_toy: the Fennimal leaves and the repaired toy remains on the ground.
        await this.basics.Fennimal_move_relative(-400, 0, 500);
        await this.brokenToyLogic.done_playing();
        await this.basics.perform_success_celebration(null);
        await wait(750);
        Interface.Prompt.show_message(this.FenObj.name + " has wandered off...");

        let fennimal = getSVGInternalCenter(this.basics.Fennimal);
        await this.basics.Fennimal_move_relative(-(fennimal.x + 300), 0, 750);
        await wait(1000);
        this.returnfunc();
    }

    async start_sequence() {
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }
        await this.basics.create_background_mask(true, 500);

        await this.appear_fennimal_with_name_prompt();
        await this.run_ask_toy_step();

        let fennimalCenter = getSVGInternalCenter(this.basics.TargetPoints.Fennimal_body_center);
        this.brokenToyLogic.setup_overlapping_broken_toy(
            this.basics.ItemLayers.Plus1,
            fennimalCenter.x,
            fennimalCenter.y
        );
        this.brokenToyLogic.ToyElement.style.opacity = 1;
        Interface.Prompt.show_message("Oh no! The " + this.FenObj.toy + " is broken!");
        AudioCont.play_sound_effect("sad");
        await wait(900);

        await this.brokenToyLogic.move_to_center_and_explode(
            this.basics.ItemLayers.Plus2,
            0.5 * this.basics.W,
            0.4 * this.basics.H
        );
        await wait(500);
        Interface.Prompt.show_message(
            `Oh no, ${this.FenObj.name} is upset! Click on ${this.FenObj.name} to cheer ${this.FenObj.name} up.`
        );
        await this.brokenToyLogic.set_exploded_toy_opacity(0.6);
        await this.basics.trigger_comfort_checkin();
        await this.brokenToyLogic.set_exploded_toy_opacity(1);
        await wait(500);

        Interface.Prompt.show_message("Please move all the parts to their correct position!");
        this.brokenToyLogic.enable_dragging((count) => this.handle_part_placed(count));
        if (this.partner.is_present) {
            this.partner_repair_loop();
        } else {
            this.reset_failsafe_timer();
        }
    }

    clean_up() {
        if (this.failsafe_timeout) clearTimeout(this.failsafe_timeout);
        this.basics.clean_up();
        this.brokenToyLogic.clean_up();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
    }
}

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

// Generalized photo trial. targetType selects spawn + polaroid contents only
// ("toybox" / "fennimal"). Shared camera / viewfinder / shutter / feedback.
class PhotoTrialController {
    constructor(FenObj, partner_is_present, returnfunc, targetType = "toybox") {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;
        this.targetType = targetType;

        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);

        this.params = GenParam.PhotoTrial;
        this.is_photo_mode = false;
        this.is_processing_shot = false;
        this.reticlePos = { x: 0.5 * GenParam.SVG_width, y: 0.5 * GenParam.SVG_height };

        this.CameraButton = null;
        this.ViewfinderGroup = null;
        this.ViewfinderDim = null;
        this.ViewfinderReticle = null;
        this.PolaroidGroup = null;
        this.CloseButton = null;

        this._onPointerMove = null;
        this._onPointerDown = null;
    }

    getElementHalfWidthSVG(elem) {
        if (!elem) return 0;

        let rect = elem.getBoundingClientRect();
        let svg = GenParam.SVGObject;
        if (!svg || !svg.getScreenCTM) {
            return Math.max(rect.width / 2, 120);
        }

        let inv = svg.getScreenCTM().inverse();
        let p1 = svg.createSVGPoint();
        let p2 = svg.createSVGPoint();
        p1.x = rect.left;
        p1.y = rect.top;
        p2.x = rect.right;
        p2.y = rect.bottom;
        p1 = p1.matrixTransform(inv);
        p2 = p2.matrixTransform(inv);
        return Math.max(Math.abs(p2.x - p1.x) / 2, 80);
    }

    getElementHalfHeightSVG(elem) {
        if (!elem) return 0;

        let rect = elem.getBoundingClientRect();
        let svg = GenParam.SVGObject;
        if (!svg || !svg.getScreenCTM) {
            return Math.max(rect.height / 2, 120);
        }

        let inv = svg.getScreenCTM().inverse();
        let p1 = svg.createSVGPoint();
        let p2 = svg.createSVGPoint();
        p1.x = rect.left;
        p1.y = rect.top;
        p2.x = rect.right;
        p2.y = rect.bottom;
        p1 = p1.matrixTransform(inv);
        p2 = p2.matrixTransform(inv);
        return Math.max(Math.abs(p2.y - p1.y) / 2, 80);
    }

    pickRandomInRange(min, max) {
        return min + Math.random() * (max - min);
    }

    pickBoxPlacement() {
        const W = this.basics.W;
        const H = this.basics.H;
        const p = this.params;
        const scale = this.pickRandomInRange(p.boxScaleMin, p.boxScaleMax);
        const y = this.pickRandomInRange(p.boxYMin, p.boxYMax) * H;

        const boxHalfW = this.getScaledTemplateHalfWidth("toybox_" + this.FenObj.toybox, scale);
        let place = this.pickHorizontalPlacementAvoidingPartner(boxHalfW, p.boxXMargin, y);
        return { x: place.x, y: place.y, scale };
    }

    pickFennimalPlacement() {
        const H = this.basics.H;
        const p = this.params;
        const scale = this.pickRandomInRange(p.fennimalScaleMin, p.fennimalScaleMax);
        // create_and_appear_Fennimal treats y as the feet / baseline.
        const y = this.pickRandomInRange(p.fennimalYMin, p.fennimalYMax) * H;
        const fenHalfW = this.estimateFennimalHalfWidth(scale);
        let place = this.pickHorizontalPlacementAvoidingPartner(fenHalfW, p.fennimalXMargin, y);
        return { x: place.x, y: place.y, scale };
    }

    estimateFennimalHalfWidth(scale) {
        let temp = create_Fennimal_SVG_object(this.FenObj, GenParam.Fennimal_head_size, false);
        temp.style.opacity = 0;
        temp.style.pointerEvents = "none";
        this.basics.ItemLayers.Main.appendChild(temp);
        let scaleGroup = temp.getElementsByClassName("Fennimal_scale_group")[0];
        if (scaleGroup) scaleGroup.style.transform = `scale(${scale})`;
        let box = temp.getBBox();
        temp.remove();
        return Math.max((box.width * scale) / 2, 80);
    }

    pickHorizontalPlacementAvoidingPartner(halfW, xMargin, y) {
        const W = this.basics.W;
        const p = this.params;
        const minX = xMargin + halfW;
        const maxX = W - xMargin - halfW;

        let partnerCenterX = null;
        let partnerHalfW = null;
        if (this.partner.is_present && this.partner.PartnerBaseGroup) {
            partnerCenterX = getSVGInternalCenter(this.partner.PartnerBaseGroup).x;
            partnerHalfW = this.getElementHalfWidthSVG(this.partner.PartnerBaseGroup);
        }

        let ranges = [[minX, maxX]];
        if (partnerCenterX !== null && partnerHalfW !== null) {
            const gap = p.partnerAvoidGap;
            const fStart = partnerCenterX - partnerHalfW - halfW - gap;
            const fEnd = partnerCenterX + partnerHalfW + halfW + gap;
            let next = [];
            ranges.forEach(([aStart, aEnd]) => {
                if (fEnd <= aStart || fStart >= aEnd) {
                    next.push([aStart, aEnd]);
                    return;
                }
                if (fStart > aStart) next.push([aStart, Math.min(fStart, aEnd)]);
                if (fEnd < aEnd) next.push([Math.max(fEnd, aStart), aEnd]);
            });
            ranges = next.filter(([start, end]) => end - start > 1);
        }

        let x;
        if (ranges.length === 0) {
            x = (partnerCenterX !== null && partnerCenterX > W * 0.5) ? minX : maxX;
        } else {
            let range = ranges[Math.floor(Math.random() * ranges.length)];
            x = range[0] + Math.random() * (range[1] - range[0]);
        }

        return { x, y };
    }

    getScaledTemplateHalfWidth(elementId, scale) {
        let template = document.getElementById(elementId);
        if (!template) return 180 * (scale / 4);

        let box = template.getBBox();
        return (Math.max(box.width, 1) * scale) / 2;
    }

    // --- Target spawn / polaroid contents (only pieces that differ by targetType) ---

    async spawn_target() {
        switch (this.targetType) {
            case "toybox":
                return this.spawn_toybox_target();
            case "fennimal":
                return this.spawn_fennimal_target();
            default:
                console.error("PhotoTrialController: unknown targetType " + this.targetType);
                return this.spawn_toybox_target();
        }
    }

    async spawn_toybox_target() {
        let place = this.pickBoxPlacement();
        this.box_start_x = place.x;
        this.box_start_y = place.y;
        this.box_scale = place.scale;

        await this.box.create_and_appear_box(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus1,
            place.x,
            place.y,
            place.scale,
            200
        );

        this.photoTargetElements = [this.box.BoxBase, this.box.BoxTop].filter(Boolean);
    }

    async spawn_fennimal_target() {
        let place = this.pickFennimalPlacement();
        this.fen_start_x = place.x;
        this.fen_start_y = place.y;
        this.fen_scale = place.scale;

        await this.basics.create_and_appear_Fennimal(
            this.basics.ItemLayers.Main,
            place.x,
            place.y,
            place.scale,
            250
        );

        this.photoTargetElements = [this.basics.Fennimal].filter(Boolean);
    }

    get_target_label() {
        if (this._targetLabelOverride) return this._targetLabelOverride;
        if (this.targetType === "toybox") return this.box.boxname;
        return this.FenObj.name || "Fennimal";
    }

    get_intro_prompt() {
        if (this.targetType === "fennimal") {
            return "Please take a photo of " + this.get_target_label();
        }
        return "Take a photo of the " + this.get_target_label() + " to check if its still in good shape";
    }

    get_retry_prompt() {
        if (this.targetType === "fennimal") {
            return "Take a photo of " + this.get_target_label();
        }
        return "Take a photo of the " + this.get_target_label();
    }

    get_success_prompt() {
        if (this._successPromptOverride) return this._successPromptOverride;
        if (this.targetType === "fennimal") {
            return "Nice shot! Thats a great photo of " + this.get_target_label();
        }
        return "Nice shot! The " + this.get_target_label() + " looks good.";
    }

    create_polaroid_contents(groupScale, targetCircle) {
        if (typeof this._polaroidContentsOverride === "function") {
            return this._polaroidContentsOverride(groupScale, targetCircle);
        }

        if (this.targetType === "toybox") {
            let template = document.getElementById("toybox_" + this.FenObj.toybox);
            if (!template) return null;

            // Full closed box: back + front + lid (do not strip front — that is the body).
            let boxIcon = copy_scale_and_move_object_to_position(
                template,
                groupScale,
                targetCircle.x,
                targetCircle.y,
                1
            );

            let rawBox = template.getBBox();
            let bgRect = groupScale.getElementsByTagName("rect")[0];
            let frameBox = bgRect ? bgRect.getBBox() : { width: 500, height: 600 };
            let scaleFactorW = frameBox.width / Math.max(rawBox.width, 1);
            let scaleFactorH = (0.75 * frameBox.height) / Math.max(rawBox.height, 1);
            let minScale = Math.min(scaleFactorW, scaleFactorH) * 0.75;

            let scaleGroup = boxIcon.getElementsByClassName("scale_group")[0];
            if (scaleGroup) {
                scaleGroup.style.transform = `scale(${minScale})`;
            }
            apply_toybox_decoration_visibility_to_element(boxIcon, this.FenObj.toybox);

            return boxIcon;
        }

        if (this.targetType === "fennimal") {
            let fenIcon = create_Fennimal_SVG_object(this.FenObj, GenParam.Fennimal_head_size, false);
            fenIcon.querySelectorAll(".prep_element_hidden").forEach((el) => el.remove());
            fenIcon.style.display = "inherit";

            let fenScaleGroup = fenIcon.getElementsByClassName("Fennimal_scale_group")[0];
            let fenBody = fenIcon.getElementsByClassName("Fennimal_body")[0];
            let fenHead = fenIcon.getElementsByClassName("Fennimal_head")[0];
            if (fenBody) fenBody.style.transform = "translate(0px, 0px) scale(1, 1)";
            if (fenHead) fenHead.style.transform = "translate(0px, 0px) rotate(0deg)";
            fenIcon.querySelectorAll(".eye_gaze").forEach((eye) => {
                eye.style.transform = "translate(0px, 0px) scale(1.15)";
            });
            freeze_fennimal_decorative_animations(fenIcon);
            groupScale.appendChild(fenIcon);

            let fenBox = fenIcon.getBBox();
            let bgRect = groupScale.getElementsByTagName("rect")[0];
            let frameBox = bgRect ? bgRect.getBBox() : { width: 500, height: 600 };
            let fenScale = Math.min(
                (frameBox.width * 0.82) / Math.max(fenBox.width, 1),
                (frameBox.height * 0.78) / Math.max(fenBox.height, 1)
            );
            let fenCx = fenBox.x + fenBox.width / 2;
            let fenCy = fenBox.y + fenBox.height / 2;
            if (fenScaleGroup) fenScaleGroup.style.transform = "";
            fenIcon.setAttribute(
                "transform",
                `translate(${targetCircle.x}, ${targetCircle.y}) scale(${fenScale}) translate(${-fenCx}, ${-fenCy})`
            );

            return fenIcon;
        }

        return null;
    }

    // --- Camera button / idle ---

    show_camera_button() {
        this.hide_camera_button();

        let dims = Object.assign({}, GenParam.ActionButtonParameters_Center);
        this.CameraButton = create_Action_Button_SVG_Element("camera", dims, false, false);
        this.CameraButton.style.cursor = "pointer";
        this.CameraButton.classList.add("photo_trial_camera_button");
        this.basics.ItemLayers.Questions.appendChild(this.CameraButton);

        this.CameraButton.onpointerdown = (evt) => {
            evt.stopPropagation();
            this.enter_photo_mode();
        };
    }

    hide_camera_button() {
        if (this.CameraButton) {
            this.CameraButton.onpointerdown = null;
            this.CameraButton.remove();
            this.CameraButton = null;
        }
    }

    // --- Viewfinder (built in JS) ---

    build_viewfinder() {
        this.remove_viewfinder();

        const W = this.basics.W;
        const H = this.basics.H;
        const p = this.params;

        this.ViewfinderGroup = create_SVG_group(0, 0, "photo_viewfinder", "photo_viewfinder");
        this.ViewfinderGroup.style.cursor = "none";
        this.basics.ItemLayers.Questions.appendChild(this.ViewfinderGroup);

        // Dim overlay with a clear rectangular lens hole (evenodd).
        this.ViewfinderDim = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.ViewfinderDim.setAttribute("fill", "#000");
        this.ViewfinderDim.setAttribute("fill-rule", "evenodd");
        this.ViewfinderDim.style.opacity = p.viewfinderDimOpacity;
        this.ViewfinderDim.style.pointerEvents = "all";
        this.ViewfinderGroup.appendChild(this.ViewfinderDim);

        this.ViewfinderReticle = create_SVG_group(0, 0, "photo_viewfinder_reticle", undefined);
        this.ViewfinderReticle.style.pointerEvents = "none";
        this.ViewfinderGroup.appendChild(this.ViewfinderReticle);

        const stroke = "#fff";
        const strokeW = 5;
        const r = p.reticleRadius;
        const bl = p.bracketLength;
        const halfLensW = 0.5 * p.lensWidth;
        const halfLensH = 0.5 * p.lensHeight;

        // Corner brackets relative to lens corners (updated each move via group transform).
        const corners = [
            { x: -halfLensW, y: -halfLensH, dx: 1, dy: 1 },
            { x: halfLensW, y: -halfLensH, dx: -1, dy: 1 },
            { x: -halfLensW, y: halfLensH, dx: 1, dy: -1 },
            { x: halfLensW, y: halfLensH, dx: -1, dy: -1 }
        ];

        corners.forEach((c) => {
            let h = document.createElementNS("http://www.w3.org/2000/svg", "line");
            h.setAttribute("x1", c.x);
            h.setAttribute("y1", c.y);
            h.setAttribute("x2", c.x + c.dx * bl);
            h.setAttribute("y2", c.y);
            h.setAttribute("stroke", stroke);
            h.setAttribute("stroke-width", strokeW);
            h.setAttribute("stroke-linecap", "round");
            this.ViewfinderReticle.appendChild(h);

            let v = document.createElementNS("http://www.w3.org/2000/svg", "line");
            v.setAttribute("x1", c.x);
            v.setAttribute("y1", c.y);
            v.setAttribute("x2", c.x);
            v.setAttribute("y2", c.y + c.dy * bl);
            v.setAttribute("stroke", stroke);
            v.setAttribute("stroke-width", strokeW);
            v.setAttribute("stroke-linecap", "round");
            this.ViewfinderReticle.appendChild(v);
        });

        let circle = create_SVG_circle(0, 0, r, "photo_viewfinder_focus", undefined);
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", stroke);
        circle.setAttribute("stroke-width", strokeW);
        this.ViewfinderReticle.appendChild(circle);

        let crossH = document.createElementNS("http://www.w3.org/2000/svg", "line");
        crossH.setAttribute("x1", -12);
        crossH.setAttribute("y1", 0);
        crossH.setAttribute("x2", 12);
        crossH.setAttribute("y2", 0);
        crossH.setAttribute("stroke", stroke);
        crossH.setAttribute("stroke-width", 3);
        this.ViewfinderReticle.appendChild(crossH);

        let crossV = document.createElementNS("http://www.w3.org/2000/svg", "line");
        crossV.setAttribute("x1", 0);
        crossV.setAttribute("y1", -12);
        crossV.setAttribute("x2", 0);
        crossV.setAttribute("y2", 12);
        crossV.setAttribute("stroke", stroke);
        crossV.setAttribute("stroke-width", 3);
        this.ViewfinderReticle.appendChild(crossV);

        this.update_viewfinder_at(this.reticlePos.x, this.reticlePos.y);
    }

    update_viewfinder_at(x, y) {
        const W = this.basics.W;
        const H = this.basics.H;
        const p = this.params;
        const halfW = 0.5 * p.lensWidth;
        const halfH = 0.5 * p.lensHeight;

        this.reticlePos = { x, y };

        if (this.ViewfinderDim) {
            // Outer full-screen rect, inner lens hole (evenodd punch-out).
            const d = [
                `M 0 0 H ${W} V ${H} H 0 Z`,
                `M ${x - halfW} ${y - halfH} H ${x + halfW} V ${y + halfH} H ${x - halfW} Z`
            ].join(" ");
            this.ViewfinderDim.setAttribute("d", d);
        }

        if (this.ViewfinderReticle) {
            this.ViewfinderReticle.style.transform = `translate(${x}px, ${y}px)`;
        }
    }

    remove_viewfinder() {
        if (this.ViewfinderGroup) {
            this.ViewfinderGroup.remove();
            this.ViewfinderGroup = null;
            this.ViewfinderDim = null;
            this.ViewfinderReticle = null;
        }
    }

    bind_photo_mode_listeners() {
        this.unbind_photo_mode_listeners();

        this._onPointerMove = (evt) => {
            if (!this.is_photo_mode || this.is_processing_shot) return;
            let pos = getMousePosition(evt);
            this.update_viewfinder_at(pos.x, pos.y);
        };

        this._onPointerDown = (evt) => {
            if (!this.is_photo_mode || this.is_processing_shot) return;
            // Ignore clicks that bubbled from UI we already handled.
            if (evt.target && evt.target.closest && evt.target.closest(".photo_trial_camera_button")) return;
            this.take_shot();
        };

        GenParam.SVGObject.addEventListener("pointermove", this._onPointerMove);
        GenParam.SVGObject.addEventListener("pointerdown", this._onPointerDown);
    }

    unbind_photo_mode_listeners() {
        if (this._onPointerMove) {
            GenParam.SVGObject.removeEventListener("pointermove", this._onPointerMove);
            this._onPointerMove = null;
        }
        if (this._onPointerDown) {
            GenParam.SVGObject.removeEventListener("pointerdown", this._onPointerDown);
            this._onPointerDown = null;
        }
    }

    enter_photo_mode() {
        if (this.is_photo_mode || this.is_processing_shot) return;

        this.is_photo_mode = true;
        this.hide_camera_button();
        AudioCont.play_sound_effect("camera_pickup");
        Interface.Prompt.show_message("Aim at the " + this.get_target_label() + " and click to take a photo");

        this.reticlePos = { x: 0.5 * this.basics.W, y: 0.5 * this.basics.H };
        this.build_viewfinder();

        // Defer listeners so the camera-button click cannot also fire the shutter.
        setTimeout(() => {
            if (this.is_photo_mode) this.bind_photo_mode_listeners();
        }, 0);
    }

    exit_photo_mode() {
        this.is_photo_mode = false;
        this.unbind_photo_mode_listeners();
        this.remove_viewfinder();
    }

    reticle_overlaps_target() {
        if (!this.photoTargetElements || this.photoTargetElements.length === 0) return false;

        // Union AABB of target pieces in SVG space.
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let any = false;

        this.photoTargetElements.forEach((elem) => {
            if (!elem) return;
            let cx = getSVGInternalCenter(elem).x;
            let cy = getSVGInternalCenter(elem).y;
            let hw = this.getElementHalfWidthSVG(elem);
            let hh = this.getElementHalfHeightSVG(elem);
            minX = Math.min(minX, cx - hw);
            maxX = Math.max(maxX, cx + hw);
            minY = Math.min(minY, cy - hh);
            maxY = Math.max(maxY, cy + hh);
            any = true;
        });

        if (!any) return false;

        let rx = this.reticlePos.x;
        let ry = this.reticlePos.y;
        let pad = this.params.reticleRadius * 0.35;

        return rx >= (minX - pad) && rx <= (maxX + pad) && ry >= (minY - pad) && ry <= (maxY + pad);
    }

    async take_shot() {
        if (this.is_processing_shot) return;
        this.is_processing_shot = true;

        AudioCont.play_sound_effect("photo");
        await this.play_shutter_flash();

        let hit = this.reticle_overlaps_target();
        this.exit_photo_mode();

        // Beat between flash and polaroid so the reveal feels less abrupt.
        await wait(this.params.polaroidAppearDelay);

        if (hit) {
            await this.handle_success();
        } else {
            await this.handle_miss();
            this.is_processing_shot = false;
            this.show_camera_button();
            Interface.Prompt.show_message(this.get_retry_prompt());
        }
    }

    async play_shutter_flash() {
        const p = this.params;
        let flash = create_SVG_rect(0, 0, this.basics.W, this.basics.H, "photo_trial_flash", undefined);
        flash.style.fill = "#fff";
        flash.style.opacity = 0;
        flash.style.pointerEvents = "none";
        flash.style.transition = `opacity ${p.flashInTime}ms ease-out`;
        this.basics.ItemLayers.Questions.appendChild(flash);

        window.getComputedStyle(flash).opacity;
        flash.style.opacity = p.flashPeakOpacity;
        await wait(p.flashInTime + p.flashHoldTime);

        flash.style.transition = `opacity ${p.flashOutTime}ms ease-in`;
        flash.style.opacity = 0;
        await wait(p.flashOutTime);
        flash.remove();
    }

    // --- Polaroid feedback ---

    remove_polaroid() {
        if (this.CloseButton) {
            this.CloseButton.onpointerdown = null;
            this.CloseButton.remove();
            this.CloseButton = null;
        }
        if (this.PolaroidGroup) {
            this.PolaroidGroup.remove();
            this.PolaroidGroup = null;
        }
    }

    async show_polaroid(withContents, { awaitClose = false } = {}) {
        this.remove_polaroid();

        const W = this.basics.W;
        const H = this.basics.H;
        const p = this.params;
        const cx = 0.5 * W;
        const cy = p.polaroidCenterY * H;

        let groupTranslate = create_SVG_group(0, 0, undefined, "photo_trial_polaroid");
        let groupRotate = create_SVG_group(0, 0, undefined, undefined);
        let groupScale = create_SVG_group(0, 0, undefined, undefined);
        groupRotate.appendChild(groupScale);
        groupTranslate.appendChild(groupRotate);
        this.basics.ItemLayers.Questions.appendChild(groupTranslate);
        this.PolaroidGroup = groupTranslate;

        let frame = copy_scale_and_move_object_to_position(
            document.getElementById("polaroid_frame"),
            groupScale,
            cx,
            cy,
            1
        );

        let bgRect = frame.getElementsByTagName("rect")[0];
        if (bgRect) {
            let regionColor = GenParam.RegionData[this.FenObj.region]
                ? GenParam.RegionData[this.FenObj.region].surrounding_color
                : "#ffffff";
            bgRect.style.fill = withContents ? regionColor : "#e8e8e8";
            bgRect.style.display = "inherit";
        }

        let nameNode = frame.getElementsByTagName("text")[0];
        if (nameNode && nameNode.childNodes[0]) {
            nameNode.childNodes[0].innerHTML = withContents ? this.get_target_label() : "???";
        }

        let targetCircle = getSVGInternalCenter(frame.getElementsByTagName("circle")[0]);

        if (withContents) {
            this.create_polaroid_contents(groupScale, targetCircle);
        }

        groupScale.style.transformOrigin = "center";
        groupRotate.style.transformOrigin = `${cx}px ${cy}px`;
        groupScale.style.transform = `scale(${p.polaroidScale})`;
        groupRotate.style.transform = "rotate(-3deg)";

        groupTranslate.style.opacity = 0;
        groupTranslate.style.transition = `opacity ${p.polaroidFadeTime}ms ease-out`;
        window.getComputedStyle(groupTranslate).opacity;
        groupTranslate.style.opacity = 1;
        await wait(p.polaroidFadeTime);

        if (awaitClose) {
            await this.attach_polaroid_close_button(frame, groupTranslate);
        }

        return groupTranslate;
    }

    attach_polaroid_close_button(frame, parentGroup) {
        return new Promise(resolve => {
            const p = this.params;
            const size = p.closeButtonSize;

            // Screen → SVG for the scaled frame's top-left corner.
            let screenRect = frame.getBoundingClientRect();
            let svg = GenParam.SVGObject;
            let inv = svg.getScreenCTM().inverse();
            let topLeft = svg.createSVGPoint();
            topLeft.x = screenRect.left;
            topLeft.y = screenRect.top;
            topLeft = topLeft.matrixTransform(inv);

            let btnX = topLeft.x + 0.55 * size;
            let btnY = topLeft.y + 0.55 * size;

            this.CloseButton = create_SVG_buttonElement(btnX, btnY, size, size, "X", Math.round(0.7 * size));
            this.CloseButton.classList.add("photo_trial_close_button");
            this.CloseButton.style.cursor = "pointer";
            this.CloseButton.style.opacity = 0;
            this.CloseButton.style.transition = "opacity 200ms ease-out";
            parentGroup.appendChild(this.CloseButton);

            window.getComputedStyle(this.CloseButton).opacity;
            this.CloseButton.style.opacity = 1;

            this.CloseButton.onpointerdown = (evt) => {
                evt.stopPropagation();
                AudioCont.play_sound_effect("close_menu");
                if (this.CloseButton) this.CloseButton.onpointerdown = null;
                resolve();
            };
        });
    }

    async handle_miss() {
        AudioCont.play_sound_effect("rejected");
        let polaroid = await this.show_polaroid(false);
        await wait(this.params.missPolaroidTime);

        if (polaroid) {
            polaroid.classList.add("photo_trial_polaroid_shake");
            await wait(450);
            polaroid.classList.remove("photo_trial_polaroid_shake");
        }

        this.remove_polaroid();
    }

    async handle_success() {
        AudioCont.play_sound_effect("success");
        Interface.Prompt.show_message(this.get_success_prompt());

        let celebratePromise = this.partner.is_present
            ? this.partner.celebrate_success()
            : Promise.resolve();

        await this.show_polaroid(true, { awaitClose: true });
        await celebratePromise;

        this.remove_polaroid();

        if (this._embeddedMode) {
            this.is_processing_shot = false;
            let resolve = this._embeddedResolve;
            this._embeddedResolve = null;
            this._embeddedMode = false;
            this.clean_up_photo_ui();
            if (resolve) resolve();
            return;
        }

        this.returnfunc();
    }

    /**
     * Run camera → shot loop on an already-built scene.
     * Resolves after a successful polaroid is closed. Does not call returnfunc / clean_up basics.
     */
    async run_embedded_capture_loop({
        photoTargetElements,
        polaroidContentsFn = null,
        targetLabel = null,
        introPrompt = null,
        successPrompt = null
    } = {}) {
        this.photoTargetElements = photoTargetElements || this.photoTargetElements;
        this._polaroidContentsOverride = polaroidContentsFn;
        this._targetLabelOverride = targetLabel;
        this._successPromptOverride = successPrompt;
        this._embeddedMode = true;
        this.is_processing_shot = false;

        Interface.Prompt.show_message(
            introPrompt || ("Take a photo of the " + this.get_target_label() + " to remember this moment!")
        );
        AudioCont.play_sound_effect("alert_minor");
        this.show_camera_button();

        return new Promise((resolve) => {
            this._embeddedResolve = resolve;
        });
    }

    clean_up_photo_ui() {
        this.hide_camera_button();
        this.exit_photo_mode();
        this.remove_polaroid();
        this.unbind_photo_mode_listeners();
        this._polaroidContentsOverride = null;
        this._targetLabelOverride = null;
        this._successPromptOverride = null;
    }

    // --- Orchestrator ---

    async start_sequence() {
        this.basics.create_svg_sublayers();
        await this.basics.create_background_mask(false, 500);

        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }

        await this.spawn_target();

        Interface.Prompt.show_message(this.get_intro_prompt());
        AudioCont.play_sound_effect("alert_minor");
        this.show_camera_button();
    }

    clean_up() {
        this.unbind_photo_mode_listeners();
        this.hide_camera_button();
        this.remove_viewfinder();
        this.remove_polaroid();
        this.basics.clean_up();
        this.box.clean_up();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
    }
}

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

        let flaps = this.Backpack.getElementsByClassName("backpack_flap");
        for (let i = 0; i < flaps.length; i++) {
            flaps[i].style.display = "inherit";
            if (flaps[i].id && flaps[i].id.includes("closed")) flaps[i].style.opacity = 1;
            if (flaps[i].id && flaps[i].id.includes("open")) flaps[i].style.opacity = 0;
        }
    }

    open_backpack() {
        let flaps = this.Backpack.getElementsByClassName("backpack_flap");
        for (let i = 0; i < flaps.length; i++) {
            flaps[i].style.display = "inherit";
            flaps[i].style.transition = "opacity 250ms ease-in-out";
            if (flaps[i].id && flaps[i].id.includes("closed")) flaps[i].style.opacity = 0;
            if (flaps[i].id && flaps[i].id.includes("open")) flaps[i].style.opacity = 1;
        }
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

// Bind Fennimal ↔ toybox: optional ask_Fennimal → joint turn-based cleaning → handoff → photo → walk off.
class JointBoxCleaningTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        this.FenObj = FenObj;
        this.returnfunc = returnfunc;
        this.params = GenParam.JointBoxCleaning;

        this.basics = new BasicElementsModule(FenObj);
        this.box = new BoxModule(FenObj);
        this.partner = new PartnerModule(partner_is_present);
        this.dirt = new DirtModule();
        this.dust = new DustModule();
        this.foliage = new FoliageModule(FenObj, partner_is_present);
        this.foliage.foliage_base_health = this.params.cleaningRounds;

        this.ShearsGroup = null;
        this.fenHome = null;
        this.boxCenter = null;
        this.dragController = null;
        this.photoSession = null;
        this.bindingOutlineGroup = null;
        this._fenHandoffBaseTransform = null;
        this._decorationRemovalOrder = null;
    }

    async start_sequence() {
        const p = this.params;
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }
        await this.basics.create_background_mask(true, 500);

        if (this.FenObj.ask_Fennimal) {
            // Box first (no Fennimal) → identity quiz → Fennimal appears
            await this.spawn_closed_box({ announce: true });
            this.prepare_decoration_removal_queue();
            await this.run_ask_fennimal_question();
            await this.appear_fennimal_for_trial();
            await this.add_dirt_to_existing_box();
        } else {
            // Legacy opening: Fennimal first, then dirty box (no ask_box)
            await this.basics.create_and_appear_Fennimal(
                this.basics.ItemLayers.Main,
                p.fennimalX * this.basics.W,
                p.fennimalY * this.basics.H,
                p.fennimalScale,
                250
            );
            AudioCont.play_sound_effect("alert");
            Interface.Prompt.show_message("This Fennimal is called " + this.FenObj.name);
            await wait(900);
            await this.spawn_dirty_scene();
            this.prepare_decoration_removal_queue();
        }

        // Fennimal walks left of box (behind / around on x)
        await this.move_fennimal_beside_box();

        // Comfort
        Interface.Prompt.show_message(
            this.FenObj.name + " is sad that their box is so dirty. Click on " + this.FenObj.name + " to comfort them!"
        );
        await this.basics.trigger_comfort_checkin();

        // Introduce collaborators, then turn-based cleaning
        await this.introduce_cleaning_tools();
        await this.run_cleaning_rounds();

        // Clean reveal + encoding pause
        await this.play_clean_reveal();

        // Persist undecorated state before handoff/photo so polaroids match the live box.
        this.commit_box_undecorated_to_worldstate();

        // Hand box to Fennimal (x-axis drag); box stays on screen at end
        await this.run_box_handoff();

        await wait(500);
        this.returnfunc();
    }

    prepare_decoration_removal_queue() {
        let decorated = typeof WorldState !== "undefined"
            && WorldState.get_toybox_is_decorated
            && WorldState.get_toybox_is_decorated(this.FenObj.toybox);
        this._decorationRemovalOrder = decorated
            ? shuffleArray(["A", "B", "C", "D"])
            : [];
    }

    commit_box_undecorated_to_worldstate() {
        if (typeof WorldState === "undefined" || !WorldState.change_toybox_is_decorated) return;
        // Cleaning always ends with an undecorated box (removed during sponge turns, or never present).
        WorldState.change_toybox_is_decorated(this.FenObj.toybox, false);
    }

    async remove_one_decoration_during_sponge_turn() {
        if (!this._decorationRemovalOrder || this._decorationRemovalOrder.length === 0) return;
        let letter = this._decorationRemovalOrder.shift();
        await this.wash_off_decoration(letter);
    }

    /**
     * Inverse of decoration placing: pick up (scale to 2x), then drop off-screen.
     */
    async wash_off_decoration(letter) {
        let original = this.box.get_decoration(letter);
        if (!original) return;

        let slot = getSVGInternalCenter(original);
        let parentLayer = this.basics.ItemLayers.Plus2;
        let boxScale = this.box.boxScale != null ? this.box.boxScale : 4;
        let heldScale = 2;

        // Detach a flying copy so we can animate freely above the box.
        let wrapper = create_SVG_group(0, 0);
        let scaleGroup = create_SVG_group(0, 0);
        let zeroGroup = create_SVG_group(0, 0);
        let clone = original.cloneNode(true);
        clone.style.opacity = "1";
        clone.style.visibility = "visible";
        clone.style.pointerEvents = "none";
        clone.style.transition = "";
        zeroGroup.appendChild(clone);
        scaleGroup.appendChild(zeroGroup);
        wrapper.appendChild(scaleGroup);
        parentLayer.appendChild(wrapper);

        let localBox = clone.getBBox();
        let localCx = localBox.x + localBox.width / 2;
        let localCy = localBox.y + localBox.height / 2;
        zeroGroup.style.transform = `translate(${-localCx}px, ${-localCy}px)`;
        scaleGroup.style.transform = `scale(${boxScale})`;

        // Pin at the live slot with no transition first (avoids a 0,0 flash).
        wrapper.style.transition = "none";
        wrapper.style.transform = `translate(${slot.x}px, ${slot.y}px) scale(1)`;
        wrapper.style.opacity = "1";
        window.getComputedStyle(wrapper).transform;

        // Hide the baked-in decoration once the clone is sitting on top of it.
        this.box.set_decoration_visible(letter, false);
        await wait(30);

        // 1) Pick up: scale up in place (inverse of the drop-on-box shrink).
        AudioCont.play_sound_effect("alert_minor");
        wrapper.style.transition = "transform 280ms ease-out";
        wrapper.style.transform = `translate(${slot.x}px, ${slot.y}px) scale(${heldScale})`;
        await wait(300);

        // 2) Fall down off-screen.
        let fallX = slot.x + (Math.random() - 0.5) * 80;
        let fallY = this.basics.H + 160;
        wrapper.style.transition =
            "transform 650ms cubic-bezier(0.4, 0.0, 0.8, 0.6), opacity 650ms ease-in";
        wrapper.style.transform =
            `translate(${fallX}px, ${fallY}px) scale(${heldScale}) rotate(${(Math.random() - 0.5) * 50}deg)`;
        wrapper.style.opacity = "0";
        await wait(680);

        if (wrapper.parentNode) wrapper.remove();
    }

    get_handoff_prompt_message() {
        return "Hand the clean " + this.box.boxname + " to " + this.FenObj.name + ".";
    }

    get_encoding_prompt_message() {
        return "This clean " + this.box.boxname + " belongs to " + this.FenObj.name + "!";
    }

    async spawn_closed_box({ announce = false } = {}) {
        const p = this.params;
        let bx = p.boxX * this.basics.W;
        let by = p.boxY * this.basics.H;

        await this.box.create_and_appear_box(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            bx,
            by,
            p.boxScale,
            200
        );
        if (this.box.BoxBase) {
            this.box.BoxBase.remove();
            this.box.BoxBase = null;
        }
        this.boxCenter = getSVGInternalCenter(this.box.BoxTop);

        if (announce) {
            Interface.Prompt.show_message("Look at this " + this.box.boxname + "!");
            await wait(900);
        }
    }

    async run_ask_fennimal_question() {
        this.FenObj.fennimal_errors_made = [];

        let optionObjs = Array.isArray(this.FenObj.fennimals_asked_objects)
            ? this.FenObj.fennimals_asked_objects.map((f) => JSON.parse(JSON.stringify(f)))
            : [];

        // Ensure the correct Fennimal is always among the choices
        if (!optionObjs.some((f) => f.id === this.FenObj.id)) {
            optionObjs.push(JSON.parse(JSON.stringify(this.FenObj)));
            console.warn("ask_Fennimal: trial Fennimal was missing from fennimals_asked; added it.");
        }

        if (optionObjs.length === 0) {
            console.warn("ask_Fennimal: no fennimals_asked options; skipping question.");
            return;
        }

        let bar = new FennimalChoiceBar(
            this.basics.ItemLayers.Plus2,
            this.basics.W,
            this.basics.H
        );

        while (true) {
            Interface.Prompt.show_message("Which Fennimal keeps their toy in this box?");
            let selected = await bar.waitForSelection(shuffleArray([...optionObjs]));
            if (selected === this.FenObj.id) {
                AudioCont.play_sound_effect("positive");
                await bar.hide();
                let burstCenter = this.boxCenter || getSVGInternalCenter(this.box.BoxTop);
                await spawn_confetti_burst(
                    this.basics.ItemLayers.Plus2,
                    burstCenter.x,
                    burstCenter.y,
                    { awaitPopMs: 900 }
                );
                return;
            }
            AudioCont.play_sound_effect("rejected");
            this.FenObj.fennimal_errors_made.push(selected);
            Interface.Prompt.show_message("Oops, you picked the wrong Fennimal!");
            await bar.hide();
            await wait(1000);
        }
    }

    async appear_fennimal_for_trial() {
        const p = this.params;
        await this.basics.create_and_appear_Fennimal(
            this.basics.ItemLayers.Main,
            p.fennimalX * this.basics.W,
            p.fennimalY * this.basics.H,
            p.fennimalScale,
            250
        );
        AudioCont.play_sound_effect("alert");
        Interface.Prompt.show_message("This Fennimal is called " + this.FenObj.name);
        await wait(900);
    }

    async add_dirt_to_existing_box() {
        const p = this.params;
        this.boxCenter = getSVGInternalCenter(this.box.BoxTop);

        this.dirt.spawn_dirt_on_element(
            this.box.BoxTop,
            this.basics.ItemLayers.Plus2,
            p.dirtSpots,
            {
                colors: this.get_region_dirt_colors(),
                avoidLeftFraction: p.dirtAvoidLeftFraction != null ? p.dirtAvoidLeftFraction : 0.35
            }
        );
        this.foliage.spawn_one_plant_left_of(
            this.basics.ItemLayers,
            this.boxCenter.x,
            this.boxCenter.y,
            p.foliageOffsetX,
            p.foliageOffsetY,
            p.foliageSize
        );
        this.dust.apply_dust_filter(null, this.box.BoxTop);

        Interface.Prompt.show_message("Oh no, the " + this.box.boxname + " is dirty!");
        await wait(2000);
    }

    get_region_dirt_colors() {
        let region = this.FenObj && this.FenObj.region;
        let rd = (region && GenParam.RegionData && GenParam.RegionData[region])
            ? GenParam.RegionData[region]
            : null;
        // Solid region dark only (no brown mix) so the tint reads clearly.
        let dark = this.sanitize_hex_color(
            (rd && rd.darker_color) || '#4E342E'
        ) || '#4E342E';
        return [dark];
    }

    sanitize_hex_color(raw) {
        if (typeof raw !== "string" || !raw.length) return null;
        if (raw[0] === "#" && raw.length === 9) return raw.slice(0, 7);
        return raw;
    }

    get_binding_outline_color() {
        // Prefer a bright fill sampled from the box artwork; fall back to region accent.
        let boxColor = this.sample_box_accent_color();
        if (boxColor) return boxColor;

        let region = this.FenObj && this.FenObj.region;
        let rd = (region && GenParam.RegionData && GenParam.RegionData[region])
            ? GenParam.RegionData[region]
            : null;
        if (!rd) return '#FFD54F';
        return this.sanitize_hex_color(rd.lighter_color || rd.contrast_color || '#FFD54F') || '#FFD54F';
    }

    sample_box_accent_color() {
        let template = document.getElementById("toybox_" + this.FenObj.toybox);
        if (!template) return null;
        let nodes = template.querySelectorAll("[fill]");
        let goldBest = null;
        let goldScore = -1;
        let brightBest = null;
        let brightLum = -1;
        for (let i = 0; i < nodes.length; i++) {
            let fill = nodes[i].getAttribute("fill");
            if (!fill || fill === "none" || fill === "transparent") continue;
            if (fill[0] === "#" && fill.length >= 7) {
                let hex = fill.slice(0, 7);
                let r = parseInt(hex.slice(1, 3), 16);
                let g = parseInt(hex.slice(3, 5), 16);
                let b = parseInt(hex.slice(5, 7), 16);
                let lum = (r + g + b) / 3;
                if (lum < 40) continue;
                if (lum > brightLum) {
                    brightLum = lum;
                    brightBest = hex;
                }
                // Prefer bright gold / yellow accents (crate hardware, etc.).
                if (r >= 200 && g >= 160 && b <= 160) {
                    let score = lum + (r + g - b);
                    if (score > goldScore) {
                        goldScore = score;
                        goldBest = hex;
                    }
                }
            }
        }
        return goldBest || brightBest;
    }

    async spawn_dirty_scene() {
        await this.spawn_closed_box({ announce: false });
        await this.add_dirt_to_existing_box();
    }

    async move_fennimal_beside_box() {
        const p = this.params;
        let fen = getSVGInternalCenter(this.basics.Fennimal);
        let restOffset = p.fennimalRestOffsetX != null ? p.fennimalRestOffsetX : -150;
        let targetX = this.boxCenter.x + restOffset;
        targetX = Math.max(120, targetX);
        let dx = targetX - fen.x;
        // Walk past then settle at rest (further right / closer to the box)
        await this.basics.Fennimal_move_relative(dx * 0.55, 0, 400);
        await this.basics.Fennimal_move_relative(dx * 0.45, 0, 400);
        this.fenHome = getSVGInternalCenter(this.basics.Fennimal);
    }

    async introduce_cleaning_tools() {
        const p = this.params;
        Interface.Prompt.show_message("Let's clean the box together!");
        await wait(2000);

        // Bellows (left of box, raised) — NPC operated, no player click outline
        this.dust.spawn_bellows(
            this.basics.ItemLayers.Plus2,
            this.boxCenter.x,
            this.boxCenter.y,
            {
                offsetX: p.bellowsOffsetX,
                offsetY: p.bellowsOffsetY,
                puffAmount: p.dustPerPuff,
                playerEnabled: false,
                showOutline: false
            }
        );
        this.dust._on_dust_clean_callback = null;
        await this.flash_attention(this.dust.BellowsTranslateGroup);

        if (this.partner.is_present) {
            Interface.Prompt.show_message(
                this.partner.partnername + " will clean the dust off of the " + this.box.boxname + "!"
            );
            // Stay in the corner while idle; only approach during their turn
            await this.partner.return_to_start();
            await wait(1000);
        }

        // Fennimal + shears at the cleaning rest position
        Interface.Prompt.show_message(
            this.FenObj.name + " will cut down the plants!"
        );
        this.spawn_garden_shears();
        await this.flash_attention(this.ShearsGroup);
        await wait(800);

        // Sponge between box and partner corner
        let spongeX = p.spongeActiveX * this.basics.W;
        let spongeY = p.spongeActiveY * this.basics.H;
        this.dirt.spawn_and_enable_sponge(
            this.basics.ItemLayers.Plus2,
            spongeX,
            spongeY,
            () => {}
        );
        this.dirt._spongeActive = false;
        this.dirt.SpongeTranslateGroup.onpointerdown = null;
        await this.flash_attention(this.dirt.SpongeTranslateGroup);
        Interface.Prompt.show_message(
            "You have to wash away the dirt from the " + this.box.boxname + "."
        );
        await wait(1800);

        Interface.Prompt.show_message("Let's clean the " + this.box.boxname + " together!");
        await wait(1200);
    }

    async flash_attention(elem, popMs = 400) {
        if (!elem) return;
        AudioCont.play_sound_effect("alert_minor");
        let baseTransform = elem.style.transform || "";
        elem.style.transition =
            `transform ${popMs}ms cubic-bezier(0.175, 0.885, 0.32, 1.275), filter ${Math.round(popMs * 0.75)}ms ease-out`;
        elem.style.filter = "brightness(1.5) drop-shadow(0px 0px 25px gold)";
        elem.style.transform = baseTransform + " scale(1.18)";
        await wait(popMs);
        elem.style.transition =
            `transform ${popMs}ms ease-in-out, filter ${Math.round(popMs * 1.4)}ms ease-in`;
        elem.style.transform = baseTransform;
        elem.style.filter = "none";
        await wait(popMs);
    }

    spawn_garden_shears() {
        const p = this.params;
        let template = document.getElementById("gardenshears");
        let fen = getSVGInternalCenter(
            this.basics.TargetPoints.Fennimal_body_center || this.basics.Fennimal
        );
        let x = fen.x + p.shearsOffsetX;
        let y = fen.y + p.shearsOffsetY;

        this.ShearsGroup = create_SVG_group(0, 0);
        this.basics.ItemLayers.Plus2.appendChild(this.ShearsGroup);

        if (!template) {
            console.warn("gardenshears SVG missing; shears visual skipped");
            this._shearsOpen = null;
            this._shearsClosed = null;
            return;
        }

        let shears = template.cloneNode(true);
        shears.style.display = "inherit";
        shears.id = "active_garden_shears";
        shears.classList.remove("invisible_element");
        this.ShearsGroup.appendChild(shears);

        this._shearsOpen = shears.querySelector(".garden_shears_open");
        this._shearsClosed = shears.querySelector(".garden_shears_closed");

        // Baseline: open visible, closed hidden
        if (this._shearsOpen) {
            this._shearsOpen.style.opacity = 1;
            this._shearsOpen.style.pointerEvents = "none";
        }
        if (this._shearsClosed) {
            this._shearsClosed.classList.remove("invisible_element");
            this._shearsClosed.style.opacity = 0;
            this._shearsClosed.style.pointerEvents = "none";
        }

        let bbox = shears.getBBox();
        let cx = bbox.x + bbox.width / 2;
        let cy = bbox.y + bbox.height / 2;
        let scale = p.shearsScale != null ? p.shearsScale : 2.2;
        shears.style.transformOrigin = `${cx}px ${cy}px`;
        shears.style.transform = `translate(${x - cx}px, ${y - cy}px) scale(${scale})`;
        this._shearsElem = shears;

        this.ShearsGroup.style.opacity = 0;
        window.getComputedStyle(this.ShearsGroup).opacity;
        this.ShearsGroup.style.transition = "opacity 300ms ease-out";
        this.ShearsGroup.style.opacity = 1;
    }

    async animate_shears_snap() {
        if (!this._shearsOpen || !this._shearsClosed) return;

        const p = this.params;
        let closeMs = p.shearsCloseMs != null ? p.shearsCloseMs : 100;
        let openMs = p.shearsOpenMs != null ? p.shearsOpenMs : 180;

        this._shearsOpen.style.transition = `opacity ${closeMs}ms ease-in`;
        this._shearsClosed.style.transition = `opacity ${closeMs}ms ease-in`;
        this._shearsOpen.style.opacity = 0;
        this._shearsClosed.style.opacity = 1;
        AudioCont.play_sound_effect("garden_shear_snip");
        await wait(closeMs);

        this._shearsOpen.style.transition = `opacity ${openMs}ms ease-out`;
        this._shearsClosed.style.transition = `opacity ${openMs}ms ease-out`;
        this._shearsOpen.style.opacity = 1;
        this._shearsClosed.style.opacity = 0;
        await wait(openMs);
    }

    async run_cleaning_rounds() {
        const p = this.params;
        let rounds = p.cleaningRounds;
        let totalHealth = this.dirt.get_initial_total_health();
        let quota = totalHealth / rounds;
        let floorY = p.spongeFloorY * this.basics.H;

        for (let r = 0; r < rounds; r++) {
            // Player sponge turn
            Interface.Prompt.show_message(
                "Please clean the " + this.box.boxname + " with the sponge"
            );
            await this.dirt.raise_sponge_to_active();
            // Wash-off only after the player actually starts scrubbing dirt.
            let scrubPromise = this.dirt.start_scrub_turn(quota, {
                idleHintMs: p.scrubIdleHintMs != null ? p.scrubIdleHintMs : 12000,
                idleFailsafeMs: p.scrubIdleFailsafeMs != null ? p.scrubIdleFailsafeMs : 25000,
                onIdleHint: () => {
                    Interface.Prompt.show_message(
                        "Keep scrubbing — look for the remaining dirt on the " + this.box.boxname + "!"
                    );
                },
                onIdleFailsafe: () => {
                    Interface.Prompt.show_message(
                        "I'll help finish this bit of dirt!"
                    );
                }
            });
            let decoPromise = Promise.resolve();
            if (this._decorationRemovalOrder && this._decorationRemovalOrder.length) {
                decoPromise = this.dirt.wait_for_scrub_start().then(() =>
                    this.remove_one_decoration_during_sponge_turn()
                );
            }
            await scrubPromise;
            await decoPromise;
            await this.dirt.drop_sponge_to_floor(floorY);
            Interface.Prompt.hide();
            await wait(400);

            if (this.partner.is_present) {
                // Partner → bellows, then Fennimal → shears
                await this.partner_bellows_turn();
                await this.fennimal_shears_turn();
            } else {
                // Solo: Fennimal shears, then Fennimal bellows
                await this.fennimal_shears_turn();
                await this.fennimal_bellows_turn();
            }
        }
    }

    async partner_bellows_turn() {
        Interface.Prompt.hide();
        const p = this.params;
        let homeScale = p.partnerHomeScale != null ? p.partnerHomeScale : 40;
        let enterScale = p.partnerCleanEnterScale != null ? p.partnerCleanEnterScale : 32;
        let liftY = p.partnerCleanEnterLiftY != null ? p.partnerCleanEnterLiftY : -60;
        let approachGap = p.partnerCleanApproachGapX != null ? p.partnerCleanApproachGapX : 140;

        let bellows = this.dust.BellowsTranslateGroup;
        let bellowsCenter = bellows
            ? getSVGInternalCenter(bellows)
            : { x: this.boxCenter.x - 200, y: this.boxCenter.y };

        // Enter a bit into the scene (behind Fennimal/box), then face the bellows.
        // Measure target first, then animate scale+offset together (no stumble).
        let cur = getSVGInternalCenter(this.partner.PartnerTranslateGroup);
        let approachX = bellowsCenter.x + approachGap;
        let nextX = this.partner._offsetX + (approachX - cur.x);
        this.partner.move_to_layer(this.basics.ItemLayers.Neg1);
        await this.partner.animate_pose({
            x: nextX,
            y: liftY,
            scale: enterScale,
            ms: 500
        });
        this.partner.set_direction("left");
        await wait(120);

        // Jump with each bellows puff, then retreat home (front layer, back pose).
        this.partner.jump(90, { ms: 120, resolveMs: 240 });
        await this.dust.puff({ amount: this.params.dustPerPuff, waitForRefill: true });

        this.partner.set_direction("back");
        await this.partner.animate_home({
            ms: 450,
            scale: homeScale,
            layer: this.basics.ItemLayers.Partner
        });
        await wait(200);
    }

    async move_fennimal_and_shears(dx, time) {
        this.basics.Fennimal.style.transition = "all " + time + "ms ease-in-out";
        this.basics.Fennimal.style.transform += "translate(" + dx + "px, 0px)";
        if (this.ShearsGroup) {
            this.ShearsGroup.style.transition = "transform " + time + "ms ease-in-out";
            this.ShearsGroup.style.transform =
                (this.ShearsGroup.style.transform || "") + " translate(" + dx + "px, 0px)";
        }
        await wait(time);
    }

    async fennimal_shears_turn() {
        Interface.Prompt.hide();
        let fen = getSVGInternalCenter(this.basics.Fennimal);
        let plant = this.foliage.get_target_tree();
        if (plant) {
            let plantPos = plant.get_center_pos_on_screen();
            let dx = (plantPos.x - 80) - fen.x;
            await this.move_fennimal_and_shears(dx, 350);
        }
        await this.animate_shears_snap();
        this.foliage.apply_one_cut_hit();
        await wait(200);
        // Return toward rest position together
        let now = getSVGInternalCenter(this.basics.Fennimal);
        let homeX = this.fenHome ? this.fenHome.x : now.x;
        await this.move_fennimal_and_shears(homeX - now.x, 350);
    }

    async fennimal_bellows_turn() {
        Interface.Prompt.hide();
        // Walk behind box toward bellows, puff, return — shears travel with Fennimal
        let fen = getSVGInternalCenter(this.basics.Fennimal);
        let bellows = this.dust.BellowsTranslateGroup;
        let bx = bellows ? getSVGInternalCenter(bellows).x : this.boxCenter.x - 200;
        let dx = (bx + 40) - fen.x;
        await this.move_fennimal_and_shears(dx, 450);
        // Small hop as Fennimal works the bellows
        this.basics.Fennimal_jump(110, { ms: 120, resolveMs: 240 });
        await this.dust.puff({ amount: this.params.dustPerPuff, waitForRefill: true });
        let now = getSVGInternalCenter(this.basics.Fennimal);
        let homeX = this.fenHome ? this.fenHome.x : now.x;
        await this.move_fennimal_and_shears(homeX - now.x, 450);
    }

    async play_clean_reveal() {
        const p = this.params;

        // Fade cleaning tools / foliage remnants
        await Promise.all([
            this.dirt.fade_out_sponge(400),
            this.dust.fade_out_bellows(400),
            this.fade_out_shears(400),
            this.foliage.fade_out_all(400)
        ]);

        // Clear any leftover dust filter / dirt
        if (this.box.BoxBase) this.box.BoxBase.style.filter = "none";
        if (this.box.BoxTop) this.box.BoxTop.style.filter = "none";
        this.dirt.Spots.forEach(s => {
            if (s.element && s.element.parentNode) s.element.remove();
        });
        this.dirt.Spots = [];
        this.dirt.dirt_remaining = 0;

        // Ensure any remaining baked decorations are gone before the reveal.
        if (this._decorationRemovalOrder && this._decorationRemovalOrder.length) {
            this.box.set_all_decorations_visible(false);
            this._decorationRemovalOrder = [];
        }

        // Keep partner in the corner during handoff so they don't block the drag path.
        if (this.partner.is_present) {
            this.partner.move_to_layer(this.basics.ItemLayers.Partner);
            this.partner.set_scale(
                p.partnerHomeScale != null ? p.partnerHomeScale : 40,
                400
            );
            await this.partner.return_to_start();
            this.partner.set_direction("back");
        }
        let fen = getSVGInternalCenter(this.basics.Fennimal);
        let restOffset = p.fennimalRestOffsetX != null ? p.fennimalRestOffsetX : -150;
        let leftX = Math.max(120, this.boxCenter.x + restOffset);
        await this.basics.Fennimal_move_relative(leftX - fen.x, 0, 400);
        this.fenHome = getSVGInternalCenter(this.basics.Fennimal);

        // Brief solo box sparkle (binding silhouette comes after handoff).
        let baseT = this.box.BoxTop.style.transform || "";
        this.box.BoxTop.style.transition = "transform 350ms ease-out, filter 350ms ease-out";
        this.box.BoxTop.style.filter = "brightness(1.25) drop-shadow(0px 0px 18px gold)";
        this.box.BoxTop.style.transform = baseT + " scale(1.06)";

        AudioCont.play_sound_effect("positive");
        Interface.Prompt.show_message("Yay! The " + this.box.boxname + " is all clean again!");
        let c = getSVGInternalCenter(this.box.BoxTop);
        spawn_confetti_burst(this.basics.ItemLayers.Plus2, c.x, c.y, { awaitPopMs: 700 });
        await wait(900);

        this.box.BoxTop.style.transform = baseT;
        this.box.BoxTop.style.filter = "none";

        Interface.Prompt.show_message(this.get_encoding_prompt_message());
        await wait(p.encodingPauseMs);
    }

    create_or_update_binding_outline() {
        const p = this.params;
        if (!this.basics.Fennimal || !this.box.BoxTop) return null;

        this.remove_binding_outline();

        let color = this.get_binding_outline_color();
        let strokeW = p.bindingOutlineStrokeWidth != null ? p.bindingOutlineStrokeWidth : 22;

        // Silhouette clone of Fennimal + box together (same technique as draggable outlines).
        let outline = create_SVG_outline_of_multiple_groups(
            this.basics.Fennimal,
            this.box.BoxTop
        );
        outline.classList.add("binding_ownership_outline");
        outline.style.stroke = color;
        outline.style.strokeWidth = strokeW + "px";
        outline.style.filter = `drop-shadow(0px 0px 12px ${color})`;
        outline.style.pointerEvents = "none";

        // Outline-only look: strip fills so the clone reads as a halo, not a duplicate.
        outline.querySelectorAll("*").forEach((child) => {
            child.removeAttribute("fill");
            child.style.fill = "none";
            child.removeAttribute("stroke");
            child.style.stroke = "";
            child.removeAttribute("stroke-width");
            child.style.strokeWidth = "";
        });

        // Behind the live Fennimal so only the outer halo shows (not internal strokes).
        // Box lives on Plus2, so its outline on Main still peeks around the box edges.
        let fenParent = this.basics.Fennimal.parentNode || this.basics.ItemLayers.Main;
        fenParent.insertBefore(outline, this.basics.Fennimal);
        this.bindingOutlineGroup = outline;

        // Matching live-element glow in box/region color.
        let glow = `drop-shadow(0px 0px 16px ${color})`;
        this.basics.Fennimal.style.filter = glow;
        this.box.BoxTop.style.filter = glow;

        return outline;
    }

    async pulse_binding_outline() {
        if (!this.bindingOutlineGroup) return;
        let el = this.bindingOutlineGroup;
        el.style.transition = "opacity 350ms ease-out";
        el.style.opacity = 0;
        window.getComputedStyle(el).opacity;
        el.style.opacity = 0.9;
        await wait(400);
    }

    async partner_pose_for_photo_celebration() {
        if (!this.partner.is_present || !this.partner.PartnerTranslateGroup) return;

        const p = this.params;
        let enterScale = p.partnerPhotoEnterScale != null ? p.partnerPhotoEnterScale : 28;
        let liftY = p.partnerPhotoEnterLiftY != null ? p.partnerPhotoEnterLiftY : -110;
        let behindGap = p.partnerPhotoBehindGapX != null ? p.partnerPhotoBehindGapX : 40;
        let besideGap = p.partnerPhotoBesideGapX != null ? p.partnerPhotoBesideGapX : 130;
        let side = this.get_partner_photo_beside_side();
        this._partnerPhotoBesideSide = side;

        let fen = getSVGInternalCenter(this.basics.Fennimal);
        let box = getSVGInternalCenter(this.box.BoxTop);
        let besideX = side === "right"
            ? fen.x + besideGap
            : fen.x - besideGap;

        // 1) Step straight back into the scene (up + shrink only — no diagonal).
        this.partner.move_to_layer(this.basics.ItemLayers.Neg1);
        await this.partner.animate_pose({
            x: this.partner._offsetX,
            y: liftY,
            scale: enterScale,
            ms: 550
        });

        // 2) Horizontal walk to the beside slot (left of Fennimal by default;
        //    right side for wide left-extending bodies like North/beaver).
        this.partner.set_direction("left");
        await wait(100);
        if (side === "left" && behindGap != null) {
            await this.partner.move_center_x_to(box.x + Math.max(behindGap, 120), 350);
        }
        await this.partner.move_center_x_to(besideX, 500);
        this.partner.set_direction("front");
        await wait(100);
        this.partner.set_direction("front_celebrating");
        await wait(200);
    }

    // Default left; North / beaver bodies prefer right so the partner stays visible.
    get_partner_photo_beside_side() {
        const p = this.params || {};
        let rightRegions = p.partnerPhotoRightSideRegions || ["North"];
        let rightBodies = p.partnerPhotoRightSideBodies || ["beaver"];
        let region = this.FenObj && this.FenObj.region;
        let body = this.FenObj && this.FenObj.body;
        if (region && rightRegions.indexOf(region) >= 0) return "right";
        if (body && rightBodies.indexOf(body) >= 0) return "right";
        return "left";
    }

    remove_binding_outline() {
        if (this.bindingOutlineGroup && this.bindingOutlineGroup.parentNode) {
            this.bindingOutlineGroup.remove();
        }
        this.bindingOutlineGroup = null;
        this._bindingEllipse = null;
        if (this.basics && this.basics.Fennimal) {
            this.basics.Fennimal.style.filter = "none";
        }
        if (this.box && this.box.BoxTop) {
            this.box.BoxTop.style.filter = "none";
        }
    }

    async fade_out_shears(ms = 400) {
        if (!this.ShearsGroup) return;
        this.ShearsGroup.style.transition = `opacity ${ms}ms ease-in`;
        this.ShearsGroup.style.opacity = 0;
        await wait(ms);
        this.ShearsGroup.remove();
        this.ShearsGroup = null;
        this._shearsElem = null;
        this._shearsOpen = null;
        this._shearsClosed = null;
    }

    async run_box_handoff() {
        const p = this.params;
        Interface.Prompt.show_message(this.get_handoff_prompt_message());
        AudioCont.play_sound_effect("alert_minor");

        // Pulse Fennimal as drop target
        this.basics.Fennimal.style.transition = "filter 400ms ease-in-out";
        this.basics.Fennimal.style.filter = "drop-shadow(0px 0px 14px gold)";

        let fenTarget = this.basics.TargetPoints.Fennimal_body_center || this.basics.Fennimal;
        this._fenHandoffBaseTransform = this.basics.Fennimal.style.transform || "";
        let fenStart = getSVGInternalCenter(this.basics.Fennimal);
        let boxStart = getSVGInternalCenter(this.box.BoxTop);
        let maxApproach = p.handoffApproachMaxPx != null ? p.handoffApproachMaxPx : 95;
        let approachDir = fenStart.x < boxStart.x ? 1 : -1;

        await new Promise(resolve => {
            this.dragController = MakeObjectDraggableObject(
                this.basics.ItemLayers.Plus2,
                this.basics.ItemLayers.Questions,
                this.box.BoxTop,
                fenTarget,
                p.dropDistance,
                (elem) => {
                    this.basics.Fennimal.style.filter = "none";
                    resolve(elem);
                },
                {
                    axis: "x",
                    onMove: (dx) => {
                        let boxNowX = boxStart.x + dx;
                        let dist0 = Math.abs(boxStart.x - fenStart.x);
                        let distNow = Math.abs(boxNowX - fenStart.x);
                        let progress = dist0 > 1
                            ? Math.max(0, Math.min(1, 1 - (distNow / dist0)))
                            : 0;
                        let approach = progress * maxApproach;
                        this.basics.Fennimal.style.transition = "none";
                        this.basics.Fennimal.style.transform =
                            this._fenHandoffBaseTransform +
                            ` translate(${approachDir * approach}px, 0px)`;
                    },
                    onMiss: () => {
                        this.basics.Fennimal.style.transition = "transform 280ms ease-out";
                        this.basics.Fennimal.style.transform = this._fenHandoffBaseTransform;
                        if (this.dragController) this.dragController.enable();
                    }
                }
            );
        });

        // Snap / accept: align box beside Fennimal
        let fen = getSVGInternalCenter(this.basics.Fennimal);
        let boxNow = getSVGInternalCenter(this.box.BoxTop);
        let dx = (fen.x + 160) - boxNow.x;
        this.box.BoxTop.style.transition = "transform 400ms ease-in-out";
        this.box.BoxTop.style.transform += ` translate(${dx}px, 0px)`;
        await wait(450);

        // Joint move to center
        let midX = 0.5 * this.basics.W;
        fen = getSVGInternalCenter(this.basics.Fennimal);
        boxNow = getSVGInternalCenter(this.box.BoxTop);
        let fenDx = midX - 140 - fen.x;
        let boxDx = midX + 40 - boxNow.x;
        this.basics.Fennimal_move_relative(fenDx, 0, 600);
        this.box.BoxTop.style.transition = "transform 600ms ease-in-out";
        this.box.BoxTop.style.transform += ` translate(${boxDx}px, 0px)`;
        await wait(650);

        this.fenHome = getSVGInternalCenter(this.basics.Fennimal);
        this.boxCenter = getSVGInternalCenter(this.box.BoxTop);

        // Ownership celebration first, then freeze + bind so the outline matches a still pose.
        await this.play_jump_on_box_celebration();

        this.basics.freeze_character_pose();
        this.create_or_update_binding_outline();
        await this.pulse_binding_outline();

        if (this.partner.is_present) {
            await this.partner_pose_for_photo_celebration();
        }

        // Freeze-frame tableau (no prompt — keep focus on the pair / partner).
        Interface.Prompt.hide();
        let freezeMs = p.freezeTableauMs != null ? p.freezeTableauMs : 1800;
        await wait(freezeMs);

        await this.run_end_photo();

        if (this.partner.is_present) {
            this.partner.set_direction("front");
            await wait(500);
        }

        this.remove_binding_outline();

        Interface.Prompt.show_message(this.FenObj.name + " has wandered off...");
        fen = getSVGInternalCenter(this.basics.Fennimal);
        await this.basics.Fennimal_move_relative(-(fen.x + 300), 0, 750);
        await wait(500);
    }

    async play_jump_on_box_celebration() {
        const p = this.params;
        let amount = p.jumpOnBoxAmount != null ? p.jumpOnBoxAmount : 150;
        let holdMs = p.jumpOnBoxHoldMs != null ? p.jumpOnBoxHoldMs : 450;

        // Walk a bit closer under/onto the box landing zone
        let fen = getSVGInternalCenter(this.basics.Fennimal);
        let box = getSVGInternalCenter(this.box.BoxTop);
        let landX = box.x - 40;
        await this.basics.Fennimal_move_relative(landX - fen.x, 0, 280);

        let groundTransform = this.basics.Fennimal.style.transform || "";

        AudioCont.play_sound_effect("jump");
        this.basics.Fennimal.style.transition = "all 220ms ease-out";
        this.basics.Fennimal.style.transform += ` translateY(-${2 * amount}px)`;
        await wait(220);

        this.basics.Fennimal.style.transition = "all 120ms ease-in";
        this.basics.Fennimal.style.transform =
            groundTransform + ` translateY(-${amount}px)`;
        await wait(120);

        // Brief "on the box" hold + hearts
        let center = getSVGInternalCenter(this.basics.Fennimal);
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.basics.spawn_happy_heart(
                    center.x + (Math.random() - 0.5) * 120,
                    center.y - 60 - Math.random() * 50,
                    this.basics.ItemLayers.Plus2
                );
            }, i * 30);
        }
        await wait(holdMs);

        // Hop once on top, then jump back to ground
        await this.basics.Fennimal_jump(70, { ms: 140, resolveMs: 280 });

        AudioCont.play_sound_effect("jump");
        this.basics.Fennimal.style.transition = "all 200ms ease-out";
        this.basics.Fennimal.style.transform += " translateY(-40px)";
        await wait(200);
        this.basics.Fennimal.style.transition = "all 180ms ease-in";
        this.basics.Fennimal.style.transform = groundTransform;
        await wait(220);

        // Settle back beside the box for the freeze / photo pose
        fen = getSVGInternalCenter(this.basics.Fennimal);
        box = getSVGInternalCenter(this.box.BoxTop);
        await this.basics.Fennimal_move_relative((box.x - 140) - fen.x, 0, 300);
        this.fenHome = getSVGInternalCenter(this.basics.Fennimal);
    }

    async pose_fennimal_behind_box_for_photo() {
        this.basics.freeze_character_pose();
        this.boxCenter = getSVGInternalCenter(this.box.BoxTop);
        let fen = getSVGInternalCenter(this.basics.Fennimal);
        // Same y-level; only slide behind the box on x.
        let targetX = this.boxCenter.x - 90;
        await this.basics.Fennimal_move_relative(targetX - fen.x, 0, 500);
        // Re-snap in case a late animation frame ran during the slide.
        this.basics.freeze_character_pose();
        this.fenHome = getSVGInternalCenter(this.basics.Fennimal);
    }

    get_polaroid_photo_svg_rect(bgRect, targetCircle, frameSize) {
        // Convert the photo rect into the same SVG space as targetCircle.
        // (getBBox alone is local to the polaroid template and breaks placement/clip.)
        if (bgRect && bgRect.ownerSVGElement) {
            let svg = bgRect.ownerSVGElement;
            let screen = bgRect.getBoundingClientRect();
            let inv = svg.getScreenCTM().inverse();
            let tl = svg.createSVGPoint();
            tl.x = screen.left;
            tl.y = screen.top;
            let br = svg.createSVGPoint();
            br.x = screen.right;
            br.y = screen.bottom;
            let p1 = tl.matrixTransform(inv);
            let p2 = br.matrixTransform(inv);
            return {
                x: Math.min(p1.x, p2.x),
                y: Math.min(p1.y, p2.y),
                width: Math.abs(p2.x - p1.x),
                height: Math.abs(p2.y - p1.y)
            };
        }
        return {
            x: targetCircle.x - frameSize.width / 2,
            y: targetCircle.y - frameSize.height / 2,
            width: frameSize.width,
            height: frameSize.height
        };
    }

    create_joint_cleaning_polaroid_contents(groupScale, targetCircle) {
        let template = document.getElementById("toybox_" + this.FenObj.toybox);
        if (!template) return null;

        let contents = create_SVG_group(0, 0);
        groupScale.appendChild(contents);

        let bgRect = groupScale.getElementsByTagName("rect")[0];
        let frameSize = bgRect
            ? bgRect.getBBox()
            : { width: 500, height: 600 };
        let color = this.get_binding_outline_color();

        // Slight downward bias so the Fennimal+box pair sits in the visual center.
        let pairCy = targetCircle.y + 35;

        // Fennimal + box use the same unclipped placement as the working toybox polaroid.
        let fenIcon = create_Fennimal_SVG_object(this.FenObj, 0.55, false);
        fenIcon.querySelectorAll(".prep_element_hidden").forEach((el) => el.remove());
        fenIcon.style.display = "inherit";
        let fenScaleGroup = fenIcon.getElementsByClassName("Fennimal_scale_group")[0];
        let fenBody = fenIcon.getElementsByClassName("Fennimal_body")[0];
        let fenHead = fenIcon.getElementsByClassName("Fennimal_head")[0];
        if (fenBody) fenBody.style.transform = "translate(0px, 0px) scale(1, 1)";
        if (fenHead) fenHead.style.transform = "translate(0px, 0px) rotate(0deg)";
        fenIcon.querySelectorAll(".eye_gaze").forEach((eye) => {
            eye.style.transform = "translate(0px, 0px) scale(1.15)";
        });
        freeze_fennimal_decorative_animations(fenIcon);
        contents.appendChild(fenIcon);

        let fenBox = fenIcon.getBBox();
        let fenScale = Math.min(
            (frameSize.width * 0.88) / Math.max(fenBox.width, 1),
            (frameSize.height * 0.78) / Math.max(fenBox.height, 1)
        );
        let fenCx = fenBox.x + fenBox.width / 2;
        let fenCy = fenBox.y + fenBox.height / 2;
        if (fenScaleGroup) fenScaleGroup.style.transform = "";
        fenIcon.setAttribute(
            "transform",
            `translate(${targetCircle.x}, ${pairCy - 70}) scale(${fenScale}) translate(${-fenCx}, ${-fenCy})`
        );

        let boxIcon = copy_scale_and_move_object_to_position(
            template,
            contents,
            targetCircle.x,
            pairCy + 70,
            1
        );
        let rawBox = template.getBBox();
        let scaleFactorW = frameSize.width / Math.max(rawBox.width, 1);
        let scaleFactorH = (0.62 * frameSize.height) / Math.max(rawBox.height, 1);
        let minScale = Math.min(scaleFactorW, scaleFactorH) * 0.82;
        let scaleGroup = boxIcon.getElementsByClassName("scale_group")[0];
        if (scaleGroup) {
            scaleGroup.style.transform = `scale(${minScale})`;
        }
        this.box.apply_worldstate_decoration_visibility(boxIcon);

        // Memory-stamp silhouette behind Fennimal + box.
        let stamp = create_SVG_outline_of_multiple_groups(fenIcon, boxIcon);
        stamp.classList.add("binding_ownership_outline");
        stamp.style.stroke = color;
        stamp.style.strokeWidth = "14px";
        stamp.style.filter = `drop-shadow(0px 0px 6px ${color})`;
        stamp.style.pointerEvents = "none";
        stamp.querySelectorAll("*").forEach((child) => {
            child.removeAttribute("fill");
            child.style.fill = "none";
            child.removeAttribute("stroke");
            child.style.stroke = "";
            child.removeAttribute("stroke-width");
            child.style.strokeWidth = "";
        });
        contents.insertBefore(stamp, fenIcon);

        // Partner celebrating beside Fennimal (left by default; right for North/beaver), behind the pair.
        if (this.partner.is_present) {
            let partnerIcon = WorldState.get_person_icon("partner", "front_celebrating");
            if (partnerIcon) {
                contents.insertBefore(partnerIcon, stamp);
                let pBox = partnerIcon.getBBox();
                let pCx = pBox.x + pBox.width / 2;
                let pCy = pBox.y + pBox.height / 2;
                let partnerScale = Math.min(
                    (frameSize.width * 0.40) / Math.max(pBox.width, 1),
                    (frameSize.height * 0.62) / Math.max(pBox.height, 1)
                );
                let side = this._partnerPhotoBesideSide || this.get_partner_photo_beside_side();
                let partnerX = side === "right"
                    ? targetCircle.x + frameSize.width * 0.28
                    : targetCircle.x - frameSize.width * 0.28;
                let partnerY = pairCy - 20;
                partnerIcon.setAttribute(
                    "transform",
                    `translate(${partnerX}, ${partnerY}) scale(${partnerScale}) translate(${-pCx}, ${-pCy})`
                );
            }
        }

        return contents;
    }

    async run_end_photo() {
        this.remove_binding_outline();
        await this.pose_fennimal_behind_box_for_photo();
        // Keep celebrating partner tucked beside the (possibly reposed) Fennimal.
        if (this.partner.is_present && this.partner._facing === "front_celebrating") {
            const p = this.params;
            let besideGap = p.partnerPhotoBesideGapX != null ? p.partnerPhotoBesideGapX : 130;
            let side = this._partnerPhotoBesideSide || this.get_partner_photo_beside_side();
            let fen = getSVGInternalCenter(this.basics.Fennimal);
            let besideX = side === "right" ? fen.x + besideGap : fen.x - besideGap;
            this.partner.move_to_layer(this.basics.ItemLayers.Neg1);
            await this.partner.move_center_x_to(besideX, 280);
        }
        this.create_or_update_binding_outline();

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
            photoTargetElements: [this.box.BoxTop].filter(Boolean),
            polaroidContentsFn: (groupScale, targetCircle) =>
                this.create_joint_cleaning_polaroid_contents(groupScale, targetCircle),
            targetLabel: this.box.boxname
        });

        this.photoSession = null;
    }

    clean_up() {
        if (this.photoSession) {
            this.photoSession.clean_up_photo_ui();
            this.photoSession = null;
        }
        if (this.dragController && this.dragController.destroy) this.dragController.destroy();
        this.remove_binding_outline();
        this.dirt.clean_up();
        this.dust.clean_up();
        this.foliage.clean_up();
        if (this.ShearsGroup) this.ShearsGroup.remove();
        this.box.clean_up();
        this.basics.clean_up();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
    }
}

// Bind Fennimal ↔ toybox via joint decoration: ask_Fennimal → place decorations in turns → handoff → photo.
// Extends the cleaning controller to reuse ask-bar / handoff / celebration / photo ending.
class JointBoxDecorationTrialController extends JointBoxCleaningTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        super(FenObj, partner_is_present, returnfunc);
        this.params = GenParam.JointBoxDecoration;
        this.pilePieces = {};
        this._decoDragController = null;
        this._decorationLetters = ["A", "B", "C", "D"];
    }

    get_handoff_prompt_message() {
        return "Hand the decorated " + this.box.boxname + " to " + this.FenObj.name + ".";
    }

    get_encoding_prompt_message() {
        return "This decorated " + this.box.boxname + " belongs to " + this.FenObj.name + "!";
    }

    async start_sequence() {
        const p = this.params;
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }
        await this.basics.create_background_mask(true, 500);

        if (this.FenObj.ask_Fennimal) {
            await this.spawn_closed_box({ announce: true });
            // Always treat as undecorated for this interaction (even if WorldState was true).
            this.box.set_all_decorations_visible(false);
            await this.run_ask_fennimal_question();
            await this.appear_fennimal_for_trial();
        } else {
            await this.basics.create_and_appear_Fennimal(
                this.basics.ItemLayers.Main,
                p.fennimalX * this.basics.W,
                p.fennimalY * this.basics.H,
                p.fennimalScale,
                250
            );
            AudioCont.play_sound_effect("alert");
            Interface.Prompt.show_message("This Fennimal is called " + this.FenObj.name);
            await wait(900);
            await this.spawn_closed_box({ announce: false });
            this.box.set_all_decorations_visible(false);
        }

        await this.move_fennimal_beside_box();

        Interface.Prompt.show_message(
            this.FenObj.name + " would like to decorate their " + this.box.boxname + "!"
        );
        await wait(1600);

        await this.spawn_decoration_pile();
        await this.run_decoration_turns();
        await this.play_decoration_reveal();

        if (typeof WorldState !== "undefined" && WorldState.change_toybox_is_decorated) {
            WorldState.change_toybox_is_decorated(this.FenObj.toybox, true);
        }

        await this.run_box_handoff();
        await wait(500);
        this.returnfunc();
    }

    build_turn_plan(letters) {
        if (this.partner.is_present) {
            return [
                { actor: "participant", letter: letters[0] },
                { actor: "fennimal", letter: letters[1] },
                { actor: "partner", letter: letters[2] },
                { actor: "participant", letter: letters[3] }
            ];
        }
        return [
            { actor: "participant", letter: letters[0] },
            { actor: "fennimal", letter: letters[1] },
            { actor: "participant", letter: letters[2] },
            { actor: "fennimal", letter: letters[3] }
        ];
    }

    get_pile_base_position() {
        const p = this.params;
        return {
            x: this.boxCenter.x + (p.pileOffsetX != null ? p.pileOffsetX : -280),
            y: this.boxCenter.y + (p.pileOffsetY != null ? p.pileOffsetY : 20)
        };
    }

    create_detached_decoration(letter, startX, startY) {
        let original = this.box.get_decoration(letter);
        if (!original) {
            console.warn("joint_box_decoration: missing decoration " + letter);
            return null;
        }

        // Slot position on the live box (used for magnetic snap later).
        let slotCenter = getSVGInternalCenter(original);
        this.box.set_decoration_visible(letter, false);

        let wrapper = create_SVG_group(0, 0);
        let scaleGroup = create_SVG_group(0, 0);
        let zeroGroup = create_SVG_group(0, 0);
        let clone = original.cloneNode(true);
        clone.style.opacity = "1";
        clone.style.visibility = "visible";
        clone.style.pointerEvents = "auto";
        clone.style.transition = "";
        zeroGroup.appendChild(clone);
        scaleGroup.appendChild(zeroGroup);
        wrapper.appendChild(scaleGroup);
        this.basics.ItemLayers.Plus2.appendChild(wrapper);

        // Match the box's on-screen scale; center the clone locally.
        let localBox = clone.getBBox();
        let localCx = localBox.x + localBox.width / 2;
        let localCy = localBox.y + localBox.height / 2;
        zeroGroup.style.transform = `translate(${-localCx}px, ${-localCy}px)`;
        let scale = this.box.boxScale != null ? this.box.boxScale : 4;
        scaleGroup.style.transform = `scale(${scale})`;
        wrapper.style.transform = `translate(${startX}px, ${startY}px)`;
        wrapper.style.opacity = "0";
        wrapper.style.pointerEvents = "none";

        return {
            letter,
            original,
            clone,
            wrapper,
            scaleGroup,
            zeroGroup,
            slotCenter,
            pileX: startX,
            pileY: startY,
            baseTransform: `translate(${startX}px, ${startY}px)`
        };
    }

    async spawn_decoration_pile() {
        const p = this.params;
        let base = this.get_pile_base_position();
        let spread = p.pileSpread != null ? p.pileSpread : 28;
        let letters = shuffleArray([...this._decorationLetters]);
        this._turnPlan = this.build_turn_plan(letters);

        // Stable pile order (visual stack), independent of turn assignment.
        let pileOrder = shuffleArray([...this._decorationLetters]);
        for (let i = 0; i < pileOrder.length; i++) {
            let letter = pileOrder[i];
            let ox = (Math.random() - 0.5) * spread;
            let oy = (Math.random() - 0.5) * spread * 0.6 - i * 4;
            let piece = this.create_detached_decoration(letter, base.x + ox, base.y + oy);
            if (!piece) continue;
            this.pilePieces[letter] = piece;
            piece.wrapper.style.transition = "opacity 350ms ease-out, transform 450ms ease-out";
            window.getComputedStyle(piece.wrapper).opacity;
            piece.wrapper.style.opacity = "1";
            await wait(120);
        }
        await wait(400);
        await this.flash_attention(
            this.pilePieces[pileOrder[0]] ? this.pilePieces[pileOrder[0]].wrapper : null
        );
    }

    async run_decoration_turns() {
        for (let i = 0; i < this._turnPlan.length; i++) {
            let turn = this._turnPlan[i];
            let piece = this.pilePieces[turn.letter];
            if (!piece) continue;
            if (turn.actor === "participant") {
                await this.participant_decoration_turn(piece);
            } else if (turn.actor === "fennimal") {
                await this.fennimal_decoration_turn(piece);
            } else if (turn.actor === "partner") {
                await this.partner_decoration_turn(piece);
            }
            await wait(250);
        }
    }

    async lift_piece(piece, ms = 300) {
        const p = this.params;
        let lift = p.decorationLiftY != null ? p.decorationLiftY : -90;
        let held = p.decorationHeldScale != null ? p.decorationHeldScale : 2;
        piece.heldScale = held;
        piece.wrapper.style.transition = `transform ${ms}ms ease-out`;
        piece.wrapper.style.transform =
            `translate(${piece.pileX}px, ${piece.pileY + lift}px) scale(${held})`;
        await wait(ms);
        piece.liftTransform =
            `translate(${piece.pileX}px, ${piece.pileY + lift}px) scale(${held})`;
    }

    async move_piece_to(piece, x, y, ms = 400, scale = null) {
        let s = scale != null ? scale : (piece.heldScale != null ? piece.heldScale : 1);
        piece.wrapper.style.transition = `transform ${ms}ms ease-in-out`;
        piece.wrapper.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
        await wait(ms);
    }

    async snap_piece_onto_box(piece) {
        // Re-measure slot in case anything shifted (box is still fixed during decoration).
        if (piece.original) {
            piece.slotCenter = getSVGInternalCenter(piece.original);
        }
        // Drop onto the box: shrink from held size back to normal box scale.
        await this.move_piece_to(piece, piece.slotCenter.x, piece.slotCenter.y, 350, 1);
        piece.heldScale = 1;
        piece.wrapper.style.transition = "opacity 280ms ease-in";
        piece.wrapper.style.opacity = "0";
        await this.box.fade_decoration(piece.letter, true, 280);
        await wait(50);
        if (piece.wrapper && piece.wrapper.parentNode) piece.wrapper.remove();
        delete this.pilePieces[piece.letter];
        AudioCont.play_sound_effect("positive");
    }

    async return_piece_to_pile(piece) {
        piece.heldScale = 1;
        piece.wrapper.style.transition = "transform 300ms ease-in-out";
        piece.wrapper.style.transform = piece.baseTransform;
        await wait(320);
    }

    async participant_decoration_turn(piece) {
        const p = this.params;
        Interface.Prompt.show_message(
            "Place this decoration on the " + this.box.boxname + "!"
        );
        AudioCont.play_sound_effect("alert_minor");

        await this.lift_piece(piece);
        // Bring this piece visually to the front of the pile.
        if (piece.wrapper.parentNode) {
            piece.wrapper.parentNode.appendChild(piece.wrapper);
        }

        let dropTarget =
            (this.box.BoxTop &&
                this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]) ||
            this.box.BoxTop;
        let dropDistance = p.dropDistance != null ? p.dropDistance : 150;

        piece.wrapper.style.pointerEvents = "auto";

        await new Promise((resolve) => {
            this._decoDragController = MakeObjectDraggableObject(
                this.basics.ItemLayers.Plus2,
                this.basics.ItemLayers.Questions,
                piece.wrapper,
                dropTarget,
                dropDistance,
                async () => {
                    if (this._decoDragController && this._decoDragController.destroy) {
                        this._decoDragController.destroy();
                    }
                    this._decoDragController = null;
                    Interface.Prompt.hide();
                    await this.snap_piece_onto_box(piece);
                    resolve();
                },
                {
                    onMiss: () => {
                        // MakeObjectDraggableObject already snapped the drag group back;
                        // re-enable for another attempt.
                        if (this._decoDragController) this._decoDragController.enable();
                    }
                }
            );
        });
    }

    async fennimal_decoration_turn(piece) {
        const p = this.params;
        Interface.Prompt.hide();
        Interface.Prompt.show_message(
            this.FenObj.name + " adds a decoration to the " + this.box.boxname + "!"
        );

        let fen = getSVGInternalCenter(this.basics.Fennimal);
        let pile = getSVGInternalCenter(piece.wrapper);
        let gap = p.fennimalApproachPileGap != null ? p.fennimalApproachPileGap : 90;
        let approachX = pile.x - gap;
        await this.basics.Fennimal_move_relative(approachX - fen.x, 0, 400);

        await this.lift_piece(piece, 280);

        // Walk toward the box together with the decoration.
        let fenNow = getSVGInternalCenter(this.basics.Fennimal);
        let boxApproachX = this.boxCenter.x - 120;
        let fenDx = boxApproachX - fenNow.x;
        let decoTargetX = piece.slotCenter.x;
        let decoTargetY = piece.slotCenter.y;

        this.basics.Fennimal_move_relative(fenDx, 0, 500);
        await this.move_piece_to(piece, decoTargetX, decoTargetY - 40, 500);
        await this.snap_piece_onto_box(piece);

        let homeX = this.fenHome ? this.fenHome.x : fen.x;
        let back = getSVGInternalCenter(this.basics.Fennimal);
        await this.basics.Fennimal_move_relative(homeX - back.x, 0, 400);
        Interface.Prompt.hide();
    }

    async partner_decoration_turn(piece) {
        if (!this.partner.is_present) return;
        const p = this.params;
        Interface.Prompt.hide();
        Interface.Prompt.show_message(
            this.partner.partnername + " adds a decoration to the " + this.box.boxname + "!"
        );

        let homeScale = p.partnerHomeScale != null ? p.partnerHomeScale : 40;
        let enterScale = p.partnerDecorEnterScale != null ? p.partnerDecorEnterScale : 26;
        let liftY = p.partnerDecorEnterLiftY != null ? p.partnerDecorEnterLiftY : -140;
        let enterShiftX = p.partnerDecorEnterShiftX != null ? p.partnerDecorEnterShiftX : -100;
        let boxPassGap = p.partnerDecorBoxPassGapX != null ? p.partnerDecorBoxPassGapX : 200;
        let pileGap = p.partnerDecorPileGapX != null ? p.partnerDecorPileGapX : 110;
        let placeGap = p.partnerDecorPlaceGapX != null ? p.partnerDecorPlaceGapX : 70;

        let pile = getSVGInternalCenter(piece.wrapper);
        let boxX = this.boxCenter.x;

        // 1) Enter deeper into the scene, then face left.
        this.partner.move_to_layer(this.basics.ItemLayers.Partner);
        await this.partner.animate_pose({
            x: enterShiftX,
            y: liftY,
            scale: enterScale,
            ms: 600
        });
        this.partner.set_direction("left");
        await wait(120);

        // 2) Walk behind the box (right side first, then left to the pile).
        this.partner.move_to_layer(this.basics.ItemLayers.Neg1);
        await this.partner.move_center_x_to(boxX + boxPassGap, 400);
        await this.partner.move_center_x_to(pile.x + pileGap, 500);

        // 3) Face forward, pick up, slide behind the box to place.
        this.partner.set_direction("front");
        await wait(100);
        await this.lift_piece(piece, 280);

        let placeX = boxX + placeGap;
        let partnerMove = this.partner.move_center_x_to(placeX, 500);
        await this.move_piece_to(piece, piece.slotCenter.x, piece.slotCenter.y - 40, 500);
        await partnerMove;
        await this.snap_piece_onto_box(piece);

        // 4) Turn right, walk past the box on the right, then exit without a diagonal clip.
        // Stay on the behind layer until fully home so they don't pop in front of the box.
        this.partner.set_direction("right");
        await wait(100);
        await this.partner.move_center_x_to(boxX + boxPassGap, 400);
        this.partner.set_direction("front");
        await wait(80);

        // Horizontal return to home X first (still deep in-scene)...
        await this.partner.animate_pose({
            x: 0,
            y: liftY,
            scale: enterScale,
            ms: 400
        });
        // ...then grow/lower straight forward to the corner.
        await this.partner.animate_pose({
            x: 0,
            y: 0,
            scale: homeScale,
            ms: 500
        });
        this.partner.move_to_layer(this.basics.ItemLayers.Partner);
        this.partner.set_direction("back");
        Interface.Prompt.hide();
    }

    async play_decoration_reveal() {
        const p = this.params;

        if (this.partner.is_present) {
            this.partner.move_to_layer(this.basics.ItemLayers.Partner);
            this.partner.set_scale(
                p.partnerHomeScale != null ? p.partnerHomeScale : 40,
                400
            );
            await this.partner.return_to_start();
            this.partner.set_direction("back");
        }
        let fen = getSVGInternalCenter(this.basics.Fennimal);
        let restOffset = p.fennimalRestOffsetX != null ? p.fennimalRestOffsetX : -150;
        let leftX = Math.max(120, this.boxCenter.x + restOffset);
        await this.basics.Fennimal_move_relative(leftX - fen.x, 0, 400);
        this.fenHome = getSVGInternalCenter(this.basics.Fennimal);

        let baseT = this.box.BoxTop.style.transform || "";
        this.box.BoxTop.style.transition = "transform 350ms ease-out, filter 350ms ease-out";
        this.box.BoxTop.style.filter = "brightness(1.25) drop-shadow(0px 0px 18px gold)";
        this.box.BoxTop.style.transform = baseT + " scale(1.06)";

        AudioCont.play_sound_effect("positive");
        Interface.Prompt.show_message(
            "Yay! The " + this.box.boxname + " looks wonderful!"
        );
        let c = getSVGInternalCenter(this.box.BoxTop);
        spawn_confetti_burst(this.basics.ItemLayers.Plus2, c.x, c.y, { awaitPopMs: 700 });
        await wait(900);

        this.box.BoxTop.style.transform = baseT;
        this.box.BoxTop.style.filter = "none";

        Interface.Prompt.show_message(this.get_encoding_prompt_message());
        await wait(p.encodingPauseMs);
    }

    clear_pile_pieces() {
        Object.keys(this.pilePieces).forEach((key) => {
            let piece = this.pilePieces[key];
            if (piece && piece.wrapper && piece.wrapper.parentNode) {
                piece.wrapper.remove();
            }
        });
        this.pilePieces = {};
    }

    clean_up() {
        if (this._decoDragController && this._decoDragController.destroy) {
            this._decoDragController.destroy();
            this._decoDragController = null;
        }
        this.clear_pile_pieces();
        super.clean_up();
    }
}

/**
 * retrieve_lost_box phase interaction: Fennimal intro → dirty found box + celebration dance →
 * joint cleaning (partner helps if present) → drag lost-and-found tag onto box → collect prompt.
 */
class RetrieveLostBoxTrialController extends JointBoxCleaningTrialController {
    constructor(FenObj, partner_is_present, returnfunc) {
        super(FenObj, partner_is_present, returnfunc);
        this._tagDragController = null;
        this._looseTagWrapper = null;
        this.tagDropDistance = 300;
    }

    async start_sequence() {
        const p = this.params;
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }
        await this.basics.create_background_mask(true, 500);

        await this.basics.create_and_appear_Fennimal(
            this.basics.ItemLayers.Main,
            p.fennimalX * this.basics.W,
            p.fennimalY * this.basics.H,
            p.fennimalScale,
            250
        );
        AudioCont.play_sound_effect("alert");
        Interface.Prompt.show_message("This is " + this.FenObj.name);
        await wait(1000);

        await this.spawn_found_dirty_box();
        this.prepare_decoration_removal_queue();

        await this.move_fennimal_beside_box();

        Interface.Prompt.show_message(
            this.FenObj.name + " is proud to have found the " + this.box.boxname
        );
        await this.basics.perform_success_celebration(this.box.BoxTop);

        // Celebration walks up to the box — return to the left-side rest pose before cleaning.
        let fenAfterCelebrate = getSVGInternalCenter(this.basics.Fennimal);
        let homeX = this.fenHome ? this.fenHome.x : fenAfterCelebrate.x;
        await this.basics.Fennimal_move_relative(homeX - fenAfterCelebrate.x, 0, 400);

        await this.introduce_cleaning_tools();
        await this.run_cleaning_rounds();

        await this.play_clean_reveal();
        this.commit_box_undecorated_to_worldstate();

        await this.run_lost_found_tagging();

        Interface.Prompt.show_message(
            "Somebody will come collect the " + this.box.boxname + " soon!"
        );
        await wait(2200);
        Interface.Prompt.hide();

        await wait(400);
        this.returnfunc();
    }

    async spawn_found_dirty_box() {
        const p = this.params;
        await this.spawn_closed_box({ announce: false });
        this.boxCenter = getSVGInternalCenter(this.box.BoxTop);

        this.dirt.spawn_dirt_on_element(
            this.box.BoxTop,
            this.basics.ItemLayers.Plus2,
            p.dirtSpots,
            {
                colors: this.get_region_dirt_colors(),
                avoidLeftFraction: p.dirtAvoidLeftFraction != null ? p.dirtAvoidLeftFraction : 0.35
            }
        );
        this.foliage.spawn_one_plant_left_of(
            this.basics.ItemLayers,
            this.boxCenter.x,
            this.boxCenter.y,
            p.foliageOffsetX,
            p.foliageOffsetY,
            p.foliageSize
        );
        this.dust.apply_dust_filter(null, this.box.BoxTop);

        AudioCont.play_sound_effect("positive");
        Interface.Prompt.show_message(
            this.FenObj.name + " has found the " + this.box.boxname
        );
        let c = this.boxCenter || getSVGInternalCenter(this.box.BoxTop);
        await spawn_confetti_burst(
            this.basics.ItemLayers.Plus2,
            c.x,
            c.y,
            { awaitPopMs: 900 }
        );
        await wait(700);
    }

    async play_clean_reveal() {
        const p = this.params;

        await Promise.all([
            this.dirt.fade_out_sponge(400),
            this.dust.fade_out_bellows(400),
            this.fade_out_shears(400),
            this.foliage.fade_out_all(400)
        ]);

        if (this.box.BoxBase) this.box.BoxBase.style.filter = "none";
        if (this.box.BoxTop) this.box.BoxTop.style.filter = "none";
        this.dirt.Spots.forEach(s => {
            if (s.element && s.element.parentNode) s.element.remove();
        });
        this.dirt.Spots = [];
        this.dirt.dirt_remaining = 0;

        if (this._decorationRemovalOrder && this._decorationRemovalOrder.length) {
            this.box.set_all_decorations_visible(false);
            this._decorationRemovalOrder = [];
        }

        if (this.partner.is_present) {
            this.partner.move_to_layer(this.basics.ItemLayers.Partner);
            this.partner.set_scale(
                p.partnerHomeScale != null ? p.partnerHomeScale : 40,
                400
            );
            await this.partner.return_to_start();
            this.partner.set_direction("back");
        }
        let fen = getSVGInternalCenter(this.basics.Fennimal);
        let restOffset = p.fennimalRestOffsetX != null ? p.fennimalRestOffsetX : -150;
        let leftX = Math.max(120, this.boxCenter.x + restOffset);
        await this.basics.Fennimal_move_relative(leftX - fen.x, 0, 400);
        this.fenHome = getSVGInternalCenter(this.basics.Fennimal);

        let baseT = this.box.BoxTop.style.transform || "";
        this.box.BoxTop.style.transition = "transform 350ms ease-out, filter 350ms ease-out";
        this.box.BoxTop.style.filter = "brightness(1.25) drop-shadow(0px 0px 18px gold)";
        this.box.BoxTop.style.transform = baseT + " scale(1.06)";

        AudioCont.play_sound_effect("positive");
        Interface.Prompt.show_message("Yay! The " + this.box.boxname + " is all clean again!");
        let c = getSVGInternalCenter(this.box.BoxTop);
        spawn_confetti_burst(this.basics.ItemLayers.Plus2, c.x, c.y, { awaitPopMs: 700 });
        await wait(900);

        this.box.BoxTop.style.transform = baseT;
        this.box.BoxTop.style.filter = "none";
    }

    get_baked_loose_tag() {
        if (!this.box.BoxTop) return null;
        return this.box.BoxTop.querySelector(".lost_found_tag_loose");
    }

    get_baked_attached_tag() {
        if (!this.box.BoxTop) return null;
        return this.box.BoxTop.querySelector(".lost_found_tag_attached");
    }

    set_baked_tag_visible(el, visible) {
        if (!el) return;
        el.classList.toggle("invisible_element", !visible);
        el.style.transition = "";
        el.style.opacity = visible ? "1" : "0";
        el.style.visibility = visible ? "visible" : "hidden";
        el.style.pointerEvents = "none";
    }

    create_detached_loose_tag(startX, startY) {
        let original = this.get_baked_loose_tag();
        if (!original) {
            console.warn("retrieve_lost_box: missing lost_found_tag_loose on box SVG");
            return null;
        }

        let parentLayer = this.basics.ItemLayers.Plus2;
        let boxScale = this.box.boxScale != null ? this.box.boxScale : 4;

        let wrapper = create_SVG_group(0, 0);
        let scaleGroup = create_SVG_group(0, 0);
        let zeroGroup = create_SVG_group(0, 0);
        let clone = original.cloneNode(true);
        clone.classList.remove("invisible_element");
        clone.style.opacity = "1";
        clone.style.visibility = "visible";
        // Must receive hits — MakeObjectDraggableObject listens on the wrapper,
        // which only receives events through painted descendants (same as decorations).
        clone.style.pointerEvents = "auto";
        clone.querySelectorAll("*").forEach((el) => {
            el.classList.remove("invisible_element");
            el.style.pointerEvents = "auto";
        });
        clone.style.transition = "";
        zeroGroup.appendChild(clone);
        scaleGroup.appendChild(zeroGroup);
        wrapper.appendChild(scaleGroup);
        parentLayer.appendChild(wrapper);

        let localBox = clone.getBBox();
        let localCx = localBox.x + localBox.width / 2;
        let localCy = localBox.y + localBox.height / 2;
        zeroGroup.style.transform = `translate(${-localCx}px, ${-localCy}px)`;
        scaleGroup.style.transform = `scale(${boxScale})`;

        wrapper.style.transition = "none";
        wrapper.style.transform = `translate(${startX}px, ${startY}px)`;
        wrapper.style.opacity = "0";
        wrapper.style.pointerEvents = "auto";
        window.getComputedStyle(wrapper).opacity;

        this.set_baked_tag_visible(original, false);
        this._looseTagWrapper = wrapper;
        this._looseTagStart = { x: startX, y: startY };
        return wrapper;
    }

    async run_lost_found_tagging() {
        let startX = this.boxCenter.x - 320;
        let startY = this.boxCenter.y;
        let wrapper = this.create_detached_loose_tag(startX, startY);
        if (!wrapper) return;

        wrapper.style.transition = "opacity 350ms ease-in";
        wrapper.style.opacity = "1";
        await wait(400);

        Interface.Prompt.show_message("Lets tag the cleaned " + this.box.boxname);
        AudioCont.play_sound_effect("alert_minor");

        let dropTarget =
            (this.box.BoxTop &&
                this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]) ||
            this.box.BoxTop;

        await new Promise((resolve) => {
            this._tagDragController = MakeObjectDraggableObject(
                this.basics.ItemLayers.Plus2,
                this.basics.ItemLayers.Questions,
                wrapper,
                dropTarget,
                this.tagDropDistance,
                async () => {
                    if (this._tagDragController && this._tagDragController.destroy) {
                        this._tagDragController.destroy();
                    }
                    this._tagDragController = null;
                    Interface.Prompt.hide();
                    await this.attach_lost_found_tag(wrapper);
                    resolve();
                },
                {
                    onMiss: () => {
                        if (this._tagDragController) this._tagDragController.enable();
                    }
                }
            );
        });
    }

    async attach_lost_found_tag(wrapper) {
        AudioCont.play_sound_effect("positive");

        if (wrapper) {
            wrapper.style.pointerEvents = "none";
            wrapper.style.transition = "opacity 350ms ease-out";
            wrapper.style.opacity = "0";
        }

        let attached = this.get_baked_attached_tag();
        if (attached) {
            attached.classList.remove("invisible_element");
            attached.style.pointerEvents = "none";
            attached.style.visibility = "visible";
            attached.style.transition = "none";
            attached.style.opacity = "0";
            window.getComputedStyle(attached).opacity;
            attached.style.transition = "opacity 350ms ease-in";
            attached.style.opacity = "1";
        }

        await wait(400);

        if (wrapper && wrapper.parentNode) wrapper.remove();
        this._looseTagWrapper = null;

        if (typeof WorldState !== "undefined" && WorldState.change_toybox_has_lost_found_tag) {
            WorldState.change_toybox_has_lost_found_tag(this.FenObj.toybox, true);
        }
    }

    clean_up() {
        if (this._tagDragController && this._tagDragController.destroy) {
            this._tagDragController.destroy();
            this._tagDragController = null;
        }
        if (this._looseTagWrapper && this._looseTagWrapper.parentNode) {
            this._looseTagWrapper.remove();
            this._looseTagWrapper = null;
        }
        super.clean_up();
    }
}

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

class TrialFactory {
    // The "static" keyword lets us call this function directly on the class
    static build(interaction_type, FenObj, partner_is_present, returnfunc) {

        switch (interaction_type) {
            case "fly_swat":
                return new FlySwatTrialController(FenObj, partner_is_present, returnfunc);

            case "fly_swat_extended":
                return new FlySwatExtendedTrialController(FenObj, partner_is_present, returnfunc);

            case "reach_hat":
                return new ReachHatTrialController(FenObj, partner_is_present, returnfunc);

            case "find_box":
                return new FindBoxTrialController(FenObj, partner_is_present, returnfunc);

            case "find_box_extended": // <--- ADD THIS
                return new FindBoxExtendedTrialController(FenObj, partner_is_present, returnfunc);

            case "basic_intro":
                // Your standard box interaction from earlier
                return new GeneralTrialController(FenObj, partner_is_present, returnfunc);

            case "Fennimal_toy":
                return new FennimalToyTrialController(FenObj, partner_is_present, returnfunc);

            case "toy_to_box":
                return new ToyToBoxTrialController(FenObj, partner_is_present, returnfunc);

            case "switch_box_without_partner":
                return new SwitchBoxWithoutPartnerTrialController(FenObj, partner_is_present, returnfunc);

            case "toy_to_sack":
                return new ToyToSackTrialController(FenObj, partner_is_present, returnfunc);

            case "sack_to_box":
                return new SackToBoxTrialController(FenObj, partner_is_present, returnfunc);

            case "box_room":
                return new BoxRoomTrialController(FenObj, partner_is_present, returnfunc);

            case "partner_belief_in_situ":
                return new PartnerBeliefInSituTrialController(FenObj, partner_is_present, returnfunc);

            case "photo_box":
                return new PhotoTrialController(FenObj, partner_is_present, returnfunc, "toybox");

            case "photo_Fennimal":
                return new PhotoTrialController(FenObj, partner_is_present, returnfunc, "fennimal");

            case "scan_box_home":
            case "scan_box_in_situ":
                return new ScanBoxHomeTrialController(FenObj, partner_is_present, returnfunc);

            case "check_box_contents":
                return new CheckBoxContentsTrialController(FenObj, partner_is_present, returnfunc);

            case "feed_Fennimal":
                return new FeedFennimalTrialController(FenObj, partner_is_present, returnfunc);

            case "joint_box_cleaning":
                return new JointBoxCleaningTrialController(FenObj, partner_is_present, returnfunc);

            case "joint_box_decoration":
                return new JointBoxDecorationTrialController(FenObj, partner_is_present, returnfunc);

            case "retrieve_lost_box":
                return new RetrieveLostBoxTrialController(FenObj, partner_is_present, returnfunc);

            case "broken_toy_in_box":
                return new BrokenToyInBoxTrialController(FenObj, partner_is_present, returnfunc);

            case "broken_toy_no_box":
                return new BrokenToyNoBoxTrialController(FenObj, partner_is_present, returnfunc);

            case "dirty_toy":
                return new DirtyToyTrialController(FenObj, partner_is_present, returnfunc);

            case "dirty_and_broken_toy":
                return new DirtyAndBrokenToyTrialController(FenObj, partner_is_present, returnfunc);

            default:
                console.error("Unknown interaction type: " + interaction_type);
                return null;
        }
    }
}

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

/**
 * One-box-at-a-time partner-belief DV task with radial 3AFC (flexible N) and RT.
 * Stimulus phase type: "partner_belief_individual_boxes"
 */
class PartnerBeliefIndividualBoxesController {
    constructor(ParentLayer, TaskObj, returnfunc, expCont) {
        this.ParentLayer = ParentLayer;
        this.TaskObj = TaskObj;
        this.returnfunc = returnfunc;
        this.expCont = expCont;

        this.W = GenParam.SVG_width;
        this.H = GenParam.SVG_height;

        this.bonus_stars = (typeof TaskObj.bonus_stars_per_correct_answer === "number")
            ? TaskObj.bonus_stars_per_correct_answer
            : 0;

        // Prefer num_belief_blocks; accept deprecated num_repeated_blocks as an alias.
        if (typeof TaskObj.num_belief_blocks === "number" && TaskObj.num_belief_blocks > 0) {
            this.num_belief_blocks = TaskObj.num_belief_blocks;
        } else if (typeof TaskObj.num_repeated_blocks === "number" && TaskObj.num_repeated_blocks > 0) {
            console.warn("PartnerBeliefIndividualBoxes: num_repeated_blocks is deprecated; use num_belief_blocks.");
            this.num_belief_blocks = TaskObj.num_repeated_blocks;
        } else {
            this.num_belief_blocks = 1;
        }

        this.include_reality_block_at_end = TaskObj.include_reality_block_at_end === true;
        this.include_practice_trial = TaskObj.include_practice_trial === true;
        this.include_memory_probe_at_end = TaskObj.include_memory_probe_at_end === true;
        this.include_empty_box_choice_alternative = TaskObj.include_empty_box_choice_alternative === true;
        this.EMPTY_OPTION_ID = "empty";
        this.memory_probe_isi_ms = (typeof TaskObj.memory_probe_isi_ms === "number" && TaskObj.memory_probe_isi_ms >= 0)
            ? TaskObj.memory_probe_isi_ms
            : 1000;
        this._realityBlockIntroShown = false;
        this._memoryProbeIntroShown = false;

        this.FEATURE_SHAPES = ["circle", "triangle", "square"];
        this.FEATURE_COLORS = [
            { id: "blue", fill: "#4FC3F7", stroke: "#0277BD" },
            { id: "orange", fill: "#FFB74D", stroke: "#EF6C00" },
            { id: "purple", fill: "#BA68C8", stroke: "#7B1FA2" }
        ];

        this.partnername = "your partner";
        this.Icons = {};
        this.ParticipantAnswers = [];
        this.overall_presentation_index = 0;
        this.distractor_rule_counter = 0;

        this.table_center_x = 0.5 * this.W;
        this.table_center_y = 0.58 * this.H;
        this.box_center_x = this.table_center_x;
        this.box_center_y = this.table_center_y - 10;
        this.radial_radius = 260;
        this.btn_size = 150;

        this.expStartPerf = expCont ? expCont.experimentStartPerf : performance.now();
        this.expStartDate = expCont ? expCont.experimentStartTime : Date.now();

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
            front: getIcon("front"),
            back: getIcon("back"),
            left: getIcon("left"),
            right: getIcon("right")
        };

        this.questions = this._normalizeQuestions(TaskObj.questions || []);
        this.gatingBoxes = this._normalizeBoxCodeArray(TaskObj.gating_boxes || [], "gating_boxes");
        this.actionPredictionToys = this._normalizeToyCodeArray(TaskObj.action_prediction_toys || [], "action_prediction_toys");
        this.experimentToys = this._collectExperimentToys();
        this.lureCycle = this._normalizeLureCycle(TaskObj.lure_cycle);
        this.trialQueue = this._buildTrialQueue();
    }

    _elapsedPerfMs() {
        return Math.round(performance.now() - this.expStartPerf);
    }

    _elapsedDateMs() {
        return Date.now() - this.expStartDate;
    }

    _normalizeQuestions(rawQuestions) {
        if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
            console.error("PartnerBeliefIndividualBoxes: questions[] is required and must be non-empty.");
            return [];
        }

        let seenIds = new Set();
        let mapped = [];

        rawQuestions.forEach((q, index) => {
            if (!q || typeof q.question_id !== "string" || !q.question_id.length) {
                console.error(`PartnerBeliefIndividualBoxes: question at index ${index} is missing mandatory question_id.`);
                return;
            }
            if (seenIds.has(q.question_id)) {
                console.error(`PartnerBeliefIndividualBoxes: duplicate question_id "${q.question_id}".`);
                return;
            }
            seenIds.add(q.question_id);

            if (!q.target_box) {
                console.error(`PartnerBeliefIndividualBoxes: question "${q.question_id}" needs target_box.`);
                return;
            }
            if (Object.prototype.hasOwnProperty.call(q, "answer_options")) {
                console.error(
                    `PartnerBeliefIndividualBoxes: question "${q.question_id}" must not set answer_options. ` +
                    "Options are auto-built from all experiment toys (plus optional empty)."
                );
                return;
            }

            let boxMapped = this.expCont.stimuli.get_assigned_names_of_code_array("toybox", [q.target_box]);
            let target_box = boxMapped && boxMapped[0];
            if (!target_box) {
                console.error(`PartnerBeliefIndividualBoxes: failed to map target_box code for question "${q.question_id}".`);
                return;
            }

            mapped.push({
                question_id: q.question_id,
                target_box_code: q.target_box,
                target_box: target_box
            });
        });

        return mapped;
    }

    _normalizeBoxCodeArray(rawCodes, fieldName) {
        if (!Array.isArray(rawCodes) || rawCodes.length === 0) return [];

        let mapped = [];
        let seen = new Set();
        rawCodes.forEach((code, index) => {
            if (!code) {
                console.error(`PartnerBeliefIndividualBoxes: ${fieldName}[${index}] is missing.`);
                return;
            }
            if (seen.has(code)) {
                console.error(`PartnerBeliefIndividualBoxes: duplicate ${fieldName} entry "${code}".`);
                return;
            }
            seen.add(code);
            let boxMapped = this.expCont.stimuli.get_assigned_names_of_code_array("toybox", [code]);
            let target_box = boxMapped && boxMapped[0];
            if (!target_box) {
                console.error(`PartnerBeliefIndividualBoxes: failed to map ${fieldName} code "${code}".`);
                return;
            }
            mapped.push({
                target_box_code: code,
                target_box: target_box
            });
        });
        return mapped;
    }

    _normalizeToyCodeArray(rawCodes, fieldName) {
        if (!Array.isArray(rawCodes) || rawCodes.length === 0) return [];

        let mapped = [];
        let seen = new Set();
        rawCodes.forEach((code, index) => {
            if (!code) {
                console.error(`PartnerBeliefIndividualBoxes: ${fieldName}[${index}] is missing.`);
                return;
            }
            if (seen.has(code)) {
                console.error(`PartnerBeliefIndividualBoxes: duplicate ${fieldName} entry "${code}".`);
                return;
            }
            seen.add(code);
            let toyMapped = this.expCont.stimuli.get_assigned_names_of_code_array("toy", [code]);
            let target_toy = toyMapped && toyMapped[0];
            if (!target_toy) {
                console.error(`PartnerBeliefIndividualBoxes: failed to map ${fieldName} code "${code}".`);
                return;
            }
            mapped.push({
                target_toy_code: code,
                target_toy: target_toy
            });
        });
        return mapped;
    }

    _collectExperimentToys() {
        let fens = this._getProbeFennimals();
        let toys = [];
        let seen = new Set();
        fens.forEach((fen) => {
            if (!fen || !fen.toy || seen.has(fen.toy)) return;
            seen.add(fen.toy);
            toys.push(fen.toy);
        });
        return toys;
    }

    /**
     * Box-code cycle used for the lure: lure for box i = partner belief of the next box.
     * Defaults to unique target_box codes in questions[] order (e.g. A→B→C→A).
     * Kept for legacy / diagnostics; belief and reality now use all-toy options.
     */
    _normalizeLureCycle(rawCycle) {
        let codes;
        if (Array.isArray(rawCycle) && rawCycle.length >= 2) {
            codes = [...rawCycle];
        } else {
            codes = [];
            this.questions.forEach(q => {
                if (!codes.includes(q.target_box_code)) codes.push(q.target_box_code);
            });
        }

        if (codes.length < 2) {
            return { codes: [], boxes: [] };
        }

        let boxes = this.expCont.stimuli.get_assigned_names_of_code_array("toybox", codes);
        if (!boxes || boxes.includes(false) || boxes.some(b => !b)) {
            console.error("PartnerBeliefIndividualBoxes: failed to map lure_cycle toybox codes.", codes);
            return { codes: [], boxes: [] };
        }

        return { codes, boxes };
    }

    _codeForAssignedName(type, assignedName) {
        let map = this.expCont.stimuli.get_Feature_maps()[type];
        if (!map || assignedName === undefined || assignedName === null || assignedName === false) return null;
        for (let code in map) {
            if (map[code] === assignedName) return code;
        }
        return null;
    }

    _buildTrialQueue() {
        let queue = [];

        if (this.include_practice_trial) {
            queue.push(this._makeFeatureMatchTrial({
                section: "practice",
                trial_kind: "practice",
                match_rule: "shape",
                question_id: "practice_shape",
                trial_instance_id: "practice_shape",
                block_index: 0,
                position_in_block: 1,
                is_practice: true
            }));
            queue.push(this._makeFeatureMatchTrial({
                section: "practice",
                trial_kind: "practice",
                match_rule: "color",
                question_id: "practice_color",
                trial_instance_id: "practice_color",
                block_index: 0,
                position_in_block: 2,
                is_practice: true
            }));
        }

        if (this.gatingBoxes.length > 0) {
            let gatingTrials = shuffleArray([...this.gatingBoxes]);
            gatingTrials.forEach((box, i) => {
                let qid = `gating_${box.target_box_code}`;
                queue.push(this._makeFeatureMatchTrial({
                    section: "gating",
                    trial_kind: "distractor",
                    match_rule: this._nextDistractorRule(),
                    question_id: `distractor_before_${qid}`,
                    trial_instance_id: `distractor_${qid}`,
                    block_index: 1,
                    position_in_block: i + 1,
                    is_practice: false,
                    precedes_question_id: qid
                }));
                queue.push({
                    section: "gating",
                    trial_kind: "gating",
                    is_practice: false,
                    question_id: qid,
                    trial_instance_id: qid,
                    block_index: 1,
                    position_in_block: i + 1,
                    target_box_code: box.target_box_code,
                    target_box: box.target_box
                });
            });
        }

        for (let b = 1; b <= this.num_belief_blocks; b++) {
            let blockTrials = shuffleArray([...this.questions]);
            blockTrials.forEach((q, i) => {
                queue.push(this._makeFeatureMatchTrial({
                    section: "belief",
                    trial_kind: "distractor",
                    match_rule: this._nextDistractorRule(),
                    question_id: `distractor_before_${q.question_id}_b${b}`,
                    trial_instance_id: `distractor_${q.question_id}_b${b}`,
                    block_index: b,
                    position_in_block: i + 1,
                    is_practice: false,
                    precedes_question_id: q.question_id
                }));

                queue.push({
                    section: "belief",
                    trial_kind: "belief",
                    is_practice: false,
                    question_id: q.question_id,
                    trial_instance_id: `${q.question_id}_belief_b${b}`,
                    block_index: b,
                    belief_block_index: b,
                    position_in_block: i + 1,
                    presentation_number_for_box: b,
                    target_box_code: q.target_box_code,
                    target_box: q.target_box
                });
            });
        }

        if (this.actionPredictionToys.length > 0) {
            let actionTrials = shuffleArray([...this.actionPredictionToys]);
            actionTrials.forEach((toy, i) => {
                let qid = `action_${toy.target_toy_code}`;
                queue.push(this._makeFeatureMatchTrial({
                    section: "action_prediction",
                    trial_kind: "distractor",
                    match_rule: this._nextDistractorRule(),
                    question_id: `distractor_before_${qid}`,
                    trial_instance_id: `distractor_${qid}`,
                    block_index: 1,
                    position_in_block: i + 1,
                    is_practice: false,
                    precedes_question_id: qid
                }));
                queue.push({
                    section: "action_prediction",
                    trial_kind: "action_prediction",
                    is_practice: false,
                    question_id: qid,
                    trial_instance_id: qid,
                    block_index: 1,
                    position_in_block: i + 1,
                    target_toy_code: toy.target_toy_code,
                    target_toy: toy.target_toy
                });
            });
        }

        if (this.include_reality_block_at_end) {
            let realityTrials = shuffleArray([...this.questions]);
            realityTrials.forEach((q, i) => {
                queue.push(this._makeFeatureMatchTrial({
                    section: "reality",
                    trial_kind: "distractor",
                    match_rule: this._nextDistractorRule(),
                    question_id: `distractor_before_${q.question_id}_reality`,
                    trial_instance_id: `distractor_${q.question_id}_reality`,
                    block_index: 1,
                    position_in_block: i + 1,
                    is_practice: false,
                    precedes_question_id: q.question_id
                }));

                queue.push({
                    section: "reality",
                    trial_kind: "reality",
                    is_practice: false,
                    question_id: q.question_id,
                    trial_instance_id: `${q.question_id}_reality`,
                    block_index: 1,
                    position_in_block: i + 1,
                    presentation_number_for_box: 1,
                    target_box_code: q.target_box_code,
                    target_box: q.target_box
                });
            });
        }

        if (this.include_memory_probe_at_end) {
            this._appendMemoryProbeSection(queue);
        }

        return queue;
    }

    _getProbeFennimals() {
        if (!this.expCont || !this.expCont.stimuli) return [];
        let fens = this.expCont.stimuli.get_Fennimals_in_array("all");
        return Array.isArray(fens) ? fens : [];
    }

    // Optional S/P wave from ID prefix (mentalizing / mentalizing_AB).
    // Non-S/P IDs (e.g. mentalizing_AC A–E) share one "default" wave; box→Fennimal
    // foils are always other-box Fennimals (co-box mates excluded from options).
    _waveForFennimal(fen) {
        let id = (fen && fen.id) ? String(fen.id) : "";
        if (id.startsWith("S")) return "S";
        if (id.startsWith("P")) return "P";
        return "default";
    }

    _appendMemoryProbeSection(queue) {
        let fennimals = this._getProbeFennimals();
        if (fennimals.length === 0) {
            console.error("PartnerBeliefIndividualBoxes: memory probes requested but no Fennimals are available.");
            return;
        }

        let boxToFen = this._makeBoxToFennimalProbeTrials(fennimals);
        let fenToToy = this._makeFennimalToToyProbeTrials(fennimals);

        let includeSackProbes = this._shouldIncludeSackMemoryProbes();
        this.TaskObj.include_sack_memory_probes = includeSackProbes;
        let boxToSack = includeSackProbes ? this._makeBoxToSackProbeTrials(fennimals) : [];
        let sackToToy = includeSackProbes ? this._makeSackToToyProbeTrials(fennimals) : [];

        let blockOrder = (Math.random() < 0.5)
            ? ["box_to_fennimal", "fennimal_to_toy"]
            : ["fennimal_to_toy", "box_to_fennimal"];
        this.TaskObj.memory_probe_block_order = blockOrder;

        blockOrder.forEach((probeType, blockOrd) => {
            let blockIndex = blockOrd + 1;
            let trials = (probeType === "box_to_fennimal")
                ? [...boxToFen, ...boxToSack]
                : [...fenToToy, ...sackToToy];
            shuffleArray(trials).forEach((trial, i) => {
                queue.push({
                    ...trial,
                    section: "memory_probe",
                    is_practice: false,
                    block_index: blockIndex,
                    position_in_block: i + 1
                });
            });
        });
    }

    _shouldIncludeSackMemoryProbes() {
        if (!this.expCont || !this.expCont.stimuli || !this.expCont.stimuli.should_include_sack_memory_probes) {
            return false;
        }
        return this.expCont.stimuli.should_include_sack_memory_probes() === true;
    }

    /**
     * Pick `n` items from `eligible`, preferring those with the lowest counts so far.
     * Ties broken at random. Updates `counts` in place.
     */
    _pickBalancedItems(eligible, counts, n) {
        let picked = [];
        let remaining = [...eligible];
        for (let i = 0; i < n; i++) {
            if (remaining.length === 0) break;
            let minCount = Math.min(...remaining.map((id) => counts[id] || 0));
            let tied = remaining.filter((id) => (counts[id] || 0) === minCount);
            let choice = shuffleArray(tied)[0];
            picked.push(choice);
            counts[choice] = (counts[choice] || 0) + 1;
            remaining = remaining.filter((id) => id !== choice);
        }
        return picked;
    }

    _makeBoxToFennimalProbeTrials(fennimals) {
        // Triad per Fennimal: correct + two other-box foils.
        // Require both toy and toybox (e.g. skip lost-box control Fennimal E).
        // Co-box mates are excluded — with a generic box cue they would also be
        // correct answers. Prefer same-wave foils when S/P prefixes exist.
        let withBoxes = fennimals.filter((fen) => fen && fen.toybox && fen.toy);
        let wavesPresent = new Set(withBoxes.map((f) => this._waveForFennimal(f)));
        let hasSpWaves = wavesPresent.has("S") && wavesPresent.has("P");

        let specs = withBoxes.map((fen) => {
            let wave = this._waveForFennimal(fen);
            let otherBox = withBoxes.filter((other) =>
                other.id !== fen.id && other.toybox !== fen.toybox
            );
            let preferred = hasSpWaves
                ? otherBox.filter((other) => this._waveForFennimal(other) === wave)
                : [];
            let preferredIds = preferred.map((f) => f.id);
            let fillIds = otherBox
                .filter((other) => !preferredIds.includes(other.id))
                .map((f) => f.id);

            if (otherBox.length < 2) {
                console.error(
                    `PartnerBeliefIndividualBoxes: need at least 2 other-box foils for box→Fennimal probe "${fen.id}" ` +
                    `(box "${fen.toybox}", found ${otherBox.length}).`
                );
            }

            return {
                fen,
                wave,
                preferredFoilIds: preferredIds,
                fillFoilIds: fillIds,
                foilRolePreferred: hasSpWaves ? "same_wave_foil" : "other_box_foil",
                foilRoleFill: "other_box_foil"
            };
        });

        let foilCounts = {};
        withBoxes.forEach((f) => { foilCounts[f.id] = 0; });

        let foilsByTarget = {};
        shuffleArray([...specs]).forEach((spec) => {
            let picked = this._pickBalancedItems(spec.preferredFoilIds, foilCounts, 2);
            if (picked.length < 2) {
                let fill = this._pickBalancedItems(
                    spec.fillFoilIds.filter((id) => !picked.includes(id)),
                    foilCounts,
                    2 - picked.length
                );
                picked = picked.concat(fill);
            }
            foilsByTarget[spec.fen.id] = picked;
        });

        return specs.map((spec) => {
            let { fen, wave, preferredFoilIds, foilRolePreferred, foilRoleFill } = spec;
            let correctId = fen.id;
            let foils = foilsByTarget[fen.id] || [];
            let foilA = foils[0] || null;
            let foilB = foils[1] || null;
            if (!foilA || !foilB || foilA === foilB || foilA === correctId || foilB === correctId) {
                console.error(
                    `PartnerBeliefIndividualBoxes: could not build triad for box→Fennimal probe "${fen.id}" ` +
                    `(correct=${correctId}, foils=${JSON.stringify(foils)}).`
                );
                return null;
            }

            let option_roles = {};
            option_roles[correctId] = "correct";
            option_roles[foilA] = preferredFoilIds.includes(foilA) ? foilRolePreferred : foilRoleFill;
            option_roles[foilB] = preferredFoilIds.includes(foilB) ? foilRolePreferred : foilRoleFill;

            return {
                trial_kind: "memory_probe_box_to_fennimal",
                question_id: `probe_box_${fen.id}`,
                trial_instance_id: `probe_box_${fen.id}`,
                target_box: fen.toybox,
                target_fennimal: fen.id,
                probe_wave: wave,
                foil_ids: [foilA, foilB],
                correct_option_id: correctId,
                answer_options: shuffleArray([correctId, foilA, foilB]),
                option_roles
            };
        }).filter(Boolean);
    }

    _makeFennimalToToyProbeTrials(fennimals) {
        // Skip Fennimals with no assigned toy (e.g. lost-box control Fennimal E).
        let withToys = fennimals.filter((fen) => fen && fen.toy);
        if (withToys.length < 3) {
            console.error(
                "PartnerBeliefIndividualBoxes: need at least 3 Fennimals with toys for Fennimal→toy probes."
            );
            return [];
        }

        let byWave = {};
        withToys.forEach((fen) => {
            let wave = this._waveForFennimal(fen);
            if (!byWave[wave]) byWave[wave] = [];
            byWave[wave].push(fen);
        });
        let waveKeys = Object.keys(byWave);
        // Classic S/P wave foils only when both prefixes are present; otherwise
        // pick any two distinct other toys (ABCDE-style sets).
        let hasTwoWaves = waveKeys.includes("S") && waveKeys.includes("P");

        let foilToyCounts = {};
        withToys.forEach((f) => { foilToyCounts[f.toy] = 0; });

        // Assign foils in random trial order so count-balancing is not ID-order biased.
        let foilsByTarget = {};
        shuffleArray([...withToys]).forEach((fen) => {
            let correctToy = fen.toy;
            let ownWave = this._waveForFennimal(fen);
            let sameWaveFoilToy = null;
            let otherWaveFoilToy = null;
            let usedWaveRoles = false;

            if (hasTwoWaves) {
                let sameWaveToys = [...new Set(
                    byWave[ownWave]
                        .filter((f) => f.id !== fen.id && f.toy && f.toy !== correctToy)
                        .map((f) => f.toy)
                )];
                let otherWave = waveKeys.find((w) => w !== ownWave);
                let otherWaveToys = [...new Set(
                    (byWave[otherWave] || []).filter((f) => f.toy).map((f) => f.toy)
                )].filter((t) => t !== correctToy);

                sameWaveFoilToy = this._pickBalancedItems(sameWaveToys, foilToyCounts, 1)[0];
                otherWaveToys = otherWaveToys.filter((t) => t !== sameWaveFoilToy);
                otherWaveFoilToy = this._pickBalancedItems(otherWaveToys, foilToyCounts, 1)[0];
                usedWaveRoles = !!(sameWaveFoilToy && otherWaveFoilToy);
            }

            if (!usedWaveRoles) {
                let otherToys = [...new Set(
                    withToys.filter((f) => f.toy && f.toy !== correctToy).map((f) => f.toy)
                )];
                let picked = this._pickBalancedItems(otherToys, foilToyCounts, 2);
                sameWaveFoilToy = picked[0];
                otherWaveFoilToy = picked[1];
            }

            foilsByTarget[fen.id] = {
                sameWaveFoilToy,
                otherWaveFoilToy,
                usedWaveRoles
            };
        });

        return withToys.map((fen) => {
            let correctToy = fen.toy;
            let assigned = foilsByTarget[fen.id] || {};
            let sameWaveFoilToy = assigned.sameWaveFoilToy;
            let otherWaveFoilToy = assigned.otherWaveFoilToy;
            let option_roles = {};
            option_roles[correctToy] = "correct";

            if (assigned.usedWaveRoles) {
                option_roles[sameWaveFoilToy] = "same_wave_foil";
                option_roles[otherWaveFoilToy] = "other_wave_foil";
            } else {
                if (sameWaveFoilToy) option_roles[sameWaveFoilToy] = "foil";
                if (otherWaveFoilToy) option_roles[otherWaveFoilToy] = "foil";
            }

            if (!sameWaveFoilToy || !otherWaveFoilToy || sameWaveFoilToy === otherWaveFoilToy) {
                console.error(
                    `PartnerBeliefIndividualBoxes: could not build distinct toy triad for Fennimal→toy probe "${fen.id}".`
                );
                return null;
            }

            return {
                trial_kind: "memory_probe_fennimal_to_toy",
                question_id: `probe_toy_${fen.id}`,
                trial_instance_id: `probe_toy_${fen.id}`,
                target_fennimal: fen.id,
                correct_option_id: correctToy,
                answer_options: shuffleArray([correctToy, sameWaveFoilToy, otherWaveFoilToy]),
                option_roles
            };
        }).filter(Boolean);
    }

    /**
     * Sacks that would also be correct for "which sack did you place in this box?"
     * (other Fennimals who share the box but use a different sack).
     */
    _competingSacksForBox(fen, fennimals) {
        let competing = new Set();
        fennimals.forEach((other) => {
            if (!other || other.id === fen.id) return;
            if (other.toybox !== fen.toybox) return;
            if (other.sack && other.sack !== fen.sack) competing.add(other.sack);
        });
        return competing;
    }

    /**
     * Toys that would also be correct for "which toy did you place in this sack?"
     * (other Fennimals who share the same sack type).
     */
    _competingToysForSack(fen, fennimals) {
        let competing = new Set();
        fennimals.forEach((other) => {
            if (!other || other.id === fen.id) return;
            if (other.sack !== fen.sack) return;
            if (other.toy && other.toy !== fen.toy) competing.add(other.toy);
        });
        return competing;
    }

    _sackFoilPool(fennimals, correctSack, competingSacks) {
        let pool = [];
        let seen = new Set([correctSack, ...competingSacks]);
        fennimals.forEach((fen) => {
            if (!fen.sack || seen.has(fen.sack)) return;
            seen.add(fen.sack);
            pool.push(fen.sack);
        });
        if (this.expCont && this.expCont.stimuli && this.expCont.stimuli.get_unused_items_of_type) {
            let free = this.expCont.stimuli.get_unused_items_of_type("sack", 10) || [];
            free.forEach((sackId) => {
                if (!sackId || seen.has(sackId)) return;
                seen.add(sackId);
                pool.push(sackId);
            });
        }
        return pool;
    }

    _toyFoilPool(fennimals, correctToy, competingToys) {
        let pool = [];
        let seen = new Set([correctToy, ...competingToys]);
        fennimals.forEach((fen) => {
            if (!fen.toy || seen.has(fen.toy)) return;
            seen.add(fen.toy);
            pool.push(fen.toy);
        });
        return pool;
    }

    _makeBoxToSackProbeTrials(fennimals) {
        let withSacks = fennimals.filter((fen) => fen && fen.sack && fen.toybox);
        let foilCounts = {};
        withSacks.forEach((fen) => {
            this._sackFoilPool(fennimals, fen.sack, this._competingSacksForBox(fen, fennimals))
                .forEach((id) => { if (foilCounts[id] == null) foilCounts[id] = 0; });
        });

        let foilsByTarget = {};
        shuffleArray([...withSacks]).forEach((fen) => {
            let competing = this._competingSacksForBox(fen, fennimals);
            let pool = this._sackFoilPool(fennimals, fen.sack, competing);

            // Prefer a co-box mate's sack only when it is not also a correct answer for this box.
            let coBoxMate = fennimals.find((other) =>
                other.id !== fen.id && other.toybox === fen.toybox && other.sack
            );
            let preferred = null;
            if (
                coBoxMate &&
                coBoxMate.sack !== fen.sack &&
                !competing.has(coBoxMate.sack) &&
                pool.includes(coBoxMate.sack)
            ) {
                preferred = coBoxMate.sack;
                foilCounts[preferred] = (foilCounts[preferred] || 0) + 1;
            }

            let remaining = preferred ? pool.filter((id) => id !== preferred) : pool;
            let needed = preferred ? 1 : 2;
            let picked = this._pickBalancedItems(remaining, foilCounts, needed);
            foilsByTarget[fen.id] = preferred ? [preferred, picked[0]].filter(Boolean) : picked;
        });

        return withSacks.map((fen) => {
            let correctId = fen.sack;
            let foils = (foilsByTarget[fen.id] || []).filter((id) => id && id !== correctId);
            foils = [...new Set(foils)];
            if (foils.length < 2) {
                console.error(
                    `PartnerBeliefIndividualBoxes: could not build safe sack triad for box→sack probe "${fen.id}" ` +
                    `(correct=${correctId}, foils=${JSON.stringify(foils)}).`
                );
                return null;
            }

            let foilA = foils[0];
            let foilB = foils[1];
            let competing = this._competingSacksForBox(fen, fennimals);
            let option_roles = {};
            option_roles[correctId] = "correct";
            option_roles[foilA] = competing.has(foilA) ? "competing_excluded_bug" : "foil";
            option_roles[foilB] = competing.has(foilB) ? "competing_excluded_bug" : "foil";

            let coBoxMate = fennimals.find((other) =>
                other.id !== fen.id && other.toybox === fen.toybox
            );
            if (coBoxMate && (foilA === coBoxMate.sack || foilB === coBoxMate.sack)) {
                option_roles[coBoxMate.sack] = "co_box_sack";
            }

            return {
                trial_kind: "memory_probe_box_to_sack",
                question_id: `probe_box_sack_${fen.id}`,
                trial_instance_id: `probe_box_sack_${fen.id}`,
                target_box: fen.toybox,
                target_fennimal: fen.id,
                correct_option_id: correctId,
                answer_options: shuffleArray([correctId, foilA, foilB]),
                option_roles
            };
        }).filter(Boolean);
    }

    _makeSackToToyProbeTrials(fennimals) {
        let withSacks = fennimals.filter((fen) => fen && fen.sack && fen.toy);
        let foilCounts = {};
        withSacks.forEach((fen) => {
            this._toyFoilPool(fennimals, fen.toy, this._competingToysForSack(fen, fennimals))
                .forEach((id) => { if (foilCounts[id] == null) foilCounts[id] = 0; });
        });

        let foilsByTarget = {};
        shuffleArray([...withSacks]).forEach((fen) => {
            let competing = this._competingToysForSack(fen, fennimals);
            let pool = this._toyFoilPool(fennimals, fen.toy, competing);

            let coBoxMate = fennimals.find((other) =>
                other.id !== fen.id && other.toybox === fen.toybox && other.toy
            );
            let preferred = null;
            if (
                coBoxMate &&
                coBoxMate.toy !== fen.toy &&
                !competing.has(coBoxMate.toy) &&
                pool.includes(coBoxMate.toy)
            ) {
                preferred = coBoxMate.toy;
                foilCounts[preferred] = (foilCounts[preferred] || 0) + 1;
            }

            let remaining = preferred ? pool.filter((id) => id !== preferred) : pool;
            let needed = preferred ? 1 : 2;
            let picked = this._pickBalancedItems(remaining, foilCounts, needed);
            foilsByTarget[fen.id] = preferred ? [preferred, picked[0]].filter(Boolean) : picked;
        });

        return withSacks.map((fen) => {
            let correctId = fen.toy;
            let foils = (foilsByTarget[fen.id] || []).filter((id) => id && id !== correctId);
            foils = [...new Set(foils)];
            if (foils.length < 2) {
                console.error(
                    `PartnerBeliefIndividualBoxes: could not build safe toy triad for sack→toy probe "${fen.id}" ` +
                    `(correct=${correctId}, foils=${JSON.stringify(foils)}).`
                );
                return null;
            }

            let foilA = foils[0];
            let foilB = foils[1];
            let option_roles = {};
            option_roles[correctId] = "correct";
            option_roles[foilA] = "foil";
            option_roles[foilB] = "foil";

            let coBoxMate = fennimals.find((other) =>
                other.id !== fen.id && other.toybox === fen.toybox
            );
            if (coBoxMate && (foilA === coBoxMate.toy || foilB === coBoxMate.toy)) {
                option_roles[coBoxMate.toy] = "co_box_toy";
            }

            return {
                trial_kind: "memory_probe_sack_to_toy",
                question_id: `probe_sack_toy_${fen.id}`,
                trial_instance_id: `probe_sack_toy_${fen.id}`,
                target_sack: fen.sack,
                target_fennimal: fen.id,
                correct_option_id: correctId,
                answer_options: shuffleArray([correctId, foilA, foilB]),
                option_roles
            };
        }).filter(Boolean);
    }

    _nextDistractorRule() {
        // Alternate shape/color so both appear about equally often.
        this.distractor_rule_counter++;
        return (this.distractor_rule_counter % 2 === 1) ? "shape" : "color";
    }

    /**
     * Build an orthogonal shape/color match trial (practice or distractor).
     * Exactly one option matches the rule; features are orthogonalized.
     */
    _makeFeatureMatchTrial(meta) {
        let match_rule = meta.match_rule;
        let shapes = shuffleArray([...this.FEATURE_SHAPES]);
        let colors = shuffleArray([...this.FEATURE_COLORS]);

        let targetShape = shapes[0];
        let otherShape = shapes[1];
        let lureShape = shapes[2];
        let targetColor = colors[0];
        let otherColor = colors[1];
        let lureColor = colors[2];

        let target = { id: "target", shape: targetShape, color: targetColor };
        let correct, foil, lure;

        if (match_rule === "shape") {
            correct = { id: "opt_correct", shape: targetShape, color: otherColor, role: "correct" };
            foil = { id: "opt_foil", shape: otherShape, color: targetColor, role: "color_foil" };
            lure = { id: "opt_lure", shape: lureShape, color: lureColor, role: "lure" };
        } else {
            correct = { id: "opt_correct", shape: otherShape, color: targetColor, role: "correct" };
            foil = { id: "opt_foil", shape: targetShape, color: otherColor, role: "shape_foil" };
            lure = { id: "opt_lure", shape: lureShape, color: lureColor, role: "lure" };
        }

        return {
            ...meta,
            match_rule,
            target_features: target,
            answer_options: shuffleArray([correct, foil, lure]),
            correct_option_id: correct.id
        };
    }

    /**
     * Build radial options for belief/reality: all experiment toys (+ optional empty).
     */
    _normalizeContentId(value) {
        if (value === false || value === null || value === undefined) return this.EMPTY_OPTION_ID;
        return value;
    }

    _partnerKnowsBoxContents(boxId) {
        let belief = WorldState.get_partner_belief_in_box_contents(boxId);
        if (belief === undefined) return false;
        let reality = WorldState.get_toybox_contents(boxId);
        return this._normalizeContentId(belief) === this._normalizeContentId(reality);
    }

    _findPartnerBelievedLocationForToy(toyId) {
        let boxes = this._uniqueBoxesForActionPrediction();
        for (let i = 0; i < boxes.length; i++) {
            let belief = WorldState.get_partner_belief_in_box_contents(boxes[i].target_box);
            if (belief === toyId) {
                return {
                    option_id: boxes[i].target_box,
                    option_type: "box",
                    target_box: boxes[i].target_box,
                    target_box_code: boxes[i].target_box_code
                };
            }
        }
        return {
            option_id: "backpack",
            option_type: "backpack"
        };
    }

    _uniqueBoxesForActionPrediction() {
        let byCode = new Map();
        this.questions.forEach((q) => {
            if (!byCode.has(q.target_box_code)) {
                byCode.set(q.target_box_code, {
                    target_box_code: q.target_box_code,
                    target_box: q.target_box
                });
            }
        });
        this.gatingBoxes.forEach((q) => {
            if (!byCode.has(q.target_box_code)) {
                byCode.set(q.target_box_code, {
                    target_box_code: q.target_box_code,
                    target_box: q.target_box
                });
            }
        });
        return Array.from(byCode.values());
    }

    _buildAllToyChoiceSet(trial, trialKind) {
        if (trialKind !== "belief" && trialKind !== "reality") {
            console.error(`PartnerBeliefIndividualBoxes: unsupported all-toy trial kind "${trialKind}".`);
            return null;
        }

        let belief = WorldState.get_partner_belief_in_box_contents(trial.target_box);
        let reality = WorldState.get_toybox_contents(trial.target_box);

        if (trialKind === "belief" && belief === undefined) {
            console.error(
                `PartnerBeliefIndividualBoxes: missing partner belief for target box "${trial.target_box}" ` +
                `(question "${trial.question_id}").`
            );
            return null;
        }

        let correctRaw = (trialKind === "belief") ? belief : reality;
        let correct_option_id = this._normalizeContentId(correctRaw);

        if (correct_option_id !== this.EMPTY_OPTION_ID && !this.experimentToys.includes(correct_option_id)) {
            console.error(
                `PartnerBeliefIndividualBoxes: correct ${trialKind} answer "${correct_option_id}" ` +
                `is not in the experiment toy set for question "${trial.question_id}".`
            );
            return null;
        }
        if (correct_option_id === this.EMPTY_OPTION_ID && !this.include_empty_box_choice_alternative) {
            console.error(
                `PartnerBeliefIndividualBoxes: ${trialKind} answer is empty for "${trial.question_id}" ` +
                "but include_empty_box_choice_alternative is false."
            );
            return null;
        }

        let answer_options = [...this.experimentToys];
        if (this.include_empty_box_choice_alternative) {
            answer_options.push(this.EMPTY_OPTION_ID);
        }
        answer_options = shuffleArray(answer_options);

        let option_roles = {};
        answer_options.forEach((id) => {
            option_roles[id] = (id === correct_option_id) ? "correct" : "foil";
        });

        return {
            answer_options,
            answer_option_codes: answer_options.map((toy) =>
                toy === this.EMPTY_OPTION_ID ? "empty" : this._codeForAssignedName("toy", toy)
            ),
            belief_answer: this._normalizeContentId(belief),
            reality_answer: this._normalizeContentId(reality),
            correct_option_id,
            option_roles
        };
    }

    /**
     * Build the fixed 3AFC triad for a target box (legacy helper, unused by current DV options).
     *   belief trial:  target belief (old), target reality (new), next-box belief (old lure)
     *   reality trial: target belief (old), target reality (new), next-box reality (new lure)
     * The lure source follows lureCycle (A→B→C→A by default).
     * Fails loud if any piece is missing or the three toys are not distinct.
     */
    _buildBeliefRealityCyclicTriad(trial, trialKind, options = {}) {
        let silent = options.silent === true;
        let logError = (msg) => { if (!silent) console.error(msg); };

        if (!this.lureCycle || this.lureCycle.codes.length < 2) {
            logError("PartnerBeliefIndividualBoxes: lure cycle is not configured.");
            return null;
        }

        let cycleIndex = this.lureCycle.codes.indexOf(trial.target_box_code);
        if (cycleIndex < 0) {
            logError(
                `PartnerBeliefIndividualBoxes: target_box "${trial.target_box_code}" is not in the lure cycle ` +
                `[${this.lureCycle.codes.join(", ")}].`
            );
            return null;
        }

        let lureIndex = (cycleIndex + 1) % this.lureCycle.codes.length;
        let lure_source_box_code = this.lureCycle.codes[lureIndex];
        let lure_source_box = this.lureCycle.boxes[lureIndex];

        if (trialKind !== "belief" && trialKind !== "reality") {
            logError(`PartnerBeliefIndividualBoxes: unsupported triad trial kind "${trialKind}".`);
            return null;
        }

        let belief = WorldState.get_partner_belief_in_box_contents(trial.target_box);
        let reality = WorldState.get_toybox_contents(trial.target_box);
        if (reality === false) reality = undefined;
        let lure_source_type = (trialKind === "belief")
            ? "partner_belief"
            : "current_contents";
        let lure = (trialKind === "belief")
            ? WorldState.get_partner_belief_in_box_contents(lure_source_box)
            : WorldState.get_toybox_contents(lure_source_box);
        if (lure === false) lure = undefined;

        if (belief === undefined) {
            logError(
                `PartnerBeliefIndividualBoxes: missing partner belief for target box "${trial.target_box}" ` +
                `(question "${trial.question_id}").`
            );
            return null;
        }
        if (reality === undefined) {
            logError(
                `PartnerBeliefIndividualBoxes: missing current contents for target box "${trial.target_box}" ` +
                `(question "${trial.question_id}").`
            );
            return null;
        }
        if (lure === undefined) {
            logError(
                `PartnerBeliefIndividualBoxes: missing ${lure_source_type} for lure-source box "${lure_source_box}" ` +
                `(code "${lure_source_box_code}", question "${trial.question_id}").`
            );
            return null;
        }
        if (belief === reality || belief === lure || reality === lure) {
            logError(
                `PartnerBeliefIndividualBoxes: belief/reality/lure are not three distinct toys for ` +
                `question "${trial.question_id}" (box "${trial.target_box}"): ` +
                `belief=${belief}, reality=${reality}, lure=${lure} (from ${lure_source_box_code}).`
            );
            return null;
        }

        let option_roles = {};
        option_roles[belief] = "belief";
        option_roles[reality] = "reality";
        option_roles[lure] = "lure";

        let answer_options = shuffleArray([belief, reality, lure]);
        let answer_option_codes = answer_options.map(toy => this._codeForAssignedName("toy", toy));

        return {
            answer_options,
            answer_option_codes,
            belief_answer: belief,
            reality_answer: reality,
            lure_answer: lure,
            lure_source_box_code,
            lure_source_box,
            lure_source_type,
            option_roles
        };
    }

    /**
     * Belief/reality need partner belief and current contents for each asked box.
     * When WorldState is still empty and Experiment_Code is "test", seed a valid false-belief layout.
     */
    _ensureWorldStateSupportsTriads() {
        let allValid = this.questions.every(q =>
            this._buildAllToyChoiceSet(q, "belief") &&
            (!this.include_reality_block_at_end || this._buildAllToyChoiceSet(q, "reality"))
        );
        if (allValid) return;

        let anyFilled = this.questions.some(q => {
            let belief = WorldState.get_partner_belief_in_box_contents(q.target_box);
            let reality = WorldState.get_toybox_contents(q.target_box);
            return belief !== undefined || (reality !== false && reality !== undefined);
        });

        if (anyFilled) {
            console.error(
                "PartnerBeliefIndividualBoxes: WorldState has box belief/contents but they do not form " +
                "valid belief/reality option sets. Trials will be skipped. " +
                "Ensure partner saw the initial put-away, then contents changed while partner was away."
            );
            return;
        }

        // Auto-seed only for the local "test" experiment code — never in real runs.
        let expCode = this.expCont && this.expCont.stimuli
            ? this.expCont.stimuli.get_experiment_code()
            : null;
        if (expCode !== "test") {
            console.error(
                "PartnerBeliefIndividualBoxes: WorldState has no box beliefs/contents for the asked boxes. " +
                "Trials will be skipped. (Auto-seed is only enabled when Experiment_Code is \"test\".)"
            );
            return;
        }

        this._seedFalseBeliefWorldState();
        allValid = this.questions.every(q =>
            this._buildAllToyChoiceSet(q, "belief") &&
            (!this.include_reality_block_at_end || this._buildAllToyChoiceSet(q, "reality"))
        );
        if (!allValid) {
            console.error("PartnerBeliefIndividualBoxes: auto-seeded WorldState still cannot build valid option sets.");
        }
    }

    _seedFalseBeliefWorldState() {
        let uniqueBoxes = [];
        this.questions.forEach(q => {
            if (!uniqueBoxes.includes(q.target_box)) uniqueBoxes.push(q.target_box);
        });
        let n = uniqueBoxes.length;
        if (n < 2) {
            console.error("PartnerBeliefIndividualBoxes: need at least 2 boxes to seed false-belief WorldState.");
            return false;
        }

        let mappedToys = Object.values((this.expCont.stimuli.get_Feature_maps() || {}).toy || {});
        let svgToys = Array.from(document.getElementsByClassName("toy"))
            .map(t => (t.id || "").split("_")[1])
            .filter(Boolean);
        let toyPool = [...new Set([...mappedToys, ...svgToys])];

        // Cyclic lure needs belief_i, reality_i, belief_{i+1} (and likewise for realities) all distinct,
        // so we need two disjoint toy sets of size n (partner-seen vs actual).
        if (toyPool.length < 2 * n) {
            console.error(
                `PartnerBeliefIndividualBoxes: cannot auto-seed false-belief WorldState — ` +
                `need ${2 * n} distinct toys for ${n} boxes, found ${toyPool.length}.`
            );
            return false;
        }

        console.warn(
            "PartnerBeliefIndividualBoxes: WorldState had no box beliefs/contents; " +
            "auto-seeding a false-belief layout for this session (partner beliefs ≠ current contents)."
        );

        for (let i = 0; i < n; i++) {
            WorldState.change_partner_belief_in_box_contents(uniqueBoxes[i], toyPool[i]);
            WorldState.change_toybox_contents(uniqueBoxes[i], toyPool[n + i]);
        }
        return true;
    }

    async start_sequence() {
        this.ParentLayer.style.display = "inherit";

        if (typeof Interface !== "undefined") {
            if (Interface.player_moved_to_new_region) Interface.player_moved_to_new_region("Home");
            if (Interface.Locator && Interface.Locator.change_locator_name) Interface.Locator.change_locator_name("Warehouse");
            Interface.Prompt.hide();
        }

        this._ensureWorldStateSupportsTriads();

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

        this.BlackOverlay = create_SVG_rect(0, 0, this.W, this.H);
        this.BlackOverlay.setAttribute("fill", "black");
        this.BlackOverlay.style.opacity = 1;
        this.BlackOverlay.style.pointerEvents = "none";
        this.ItemLayers.Plus2.appendChild(this.BlackOverlay);

        for (let i = 0; i < this.trialQueue.length; i++) {
            this.overall_presentation_index = i + 1;
            let trial = this.trialQueue[i];
            if (!this._realityBlockIntroShown && trial.section === "reality") {
                await this.run_reality_block_intro();
                this._realityBlockIntroShown = true;
            }
            if (!this._memoryProbeIntroShown && trial.section === "memory_probe") {
                await this.run_memory_probe_intro();
                this._memoryProbeIntroShown = true;
            }
            await this.run_trial(trial);
        }

        await this.finish_task();
    }

    async fade_black(toOpacity, ms = 350) {
        this.BlackOverlay.style.transition = `opacity ${ms}ms ease-in-out`;
        window.getComputedStyle(this.BlackOverlay).opacity;
        this.BlackOverlay.style.opacity = toOpacity;
        await wait(ms);
    }

    clear_scene_contents() {
        if (this.bubble_float_interval) {
            clearInterval(this.bubble_float_interval);
            this.bubble_float_interval = null;
        }
        if (this.box_qmark_float_interval) {
            clearInterval(this.box_qmark_float_interval);
            this.box_qmark_float_interval = null;
        }
        [this.ItemLayers.Neg1, this.ItemLayers.Main, this.ItemLayers.Plus1].forEach(layer => {
            while (layer.firstChild) layer.removeChild(layer.firstChild);
        });
        // Keep BlackOverlay in Plus2; remove other Plus2 children
        Array.from(this.ItemLayers.Plus2.childNodes).forEach(child => {
            if (child !== this.BlackOverlay) child.remove();
        });
        this.PartnerTranslateGroup = null;
        this.PartnerScaleGroup = null;
        this.QuestionBubbleGroup = null;
        this.radialUIGroup = null;
        this.BoxElement = null;
        this.CurtainGroup = null;
        this.CentralTargetGroup = null;
        this.CentralFennimalElement = null;
        this.BoxQuestionMarkGroup = null;
        this.BackpackElement = null;
        this.ActionTargetElements = null;
        this.GatingOverlay = null;
    }

    setup_background_and_table(smaller = true) {
        this.OpaqueBackdrop = create_SVG_rect(0, 0, this.W, this.H);
        this.OpaqueBackdrop.setAttribute("fill", "white");
        this.ItemLayers.Neg1.appendChild(this.OpaqueBackdrop);

        this.Background = document.createElementNS("http://www.w3.org/2000/svg", "image");
        this.Background.setAttribute("href", "./Locations/Home_warehouse.png");
        this.Background.setAttribute("width", "100%");
        this.Background.setAttribute("height", "100%");
        this.Background.setAttribute("preserveAspectRatio", "none");
        this.ItemLayers.Neg1.appendChild(this.Background);

        this.BackgroundMask = create_SVG_rect(0, 0, this.W, this.H);
        this.BackgroundMask.setAttribute("fill", GenParam.RegionData ? GenParam.RegionData["Home"].surrounding_color : "#f4f4f9");
        this.BackgroundMask.style.opacity = 0.3;
        this.BackgroundMask.style.mixBlendMode = "multiply";
        this.ItemLayers.Neg1.appendChild(this.BackgroundMask);

        this.TableGroup = create_SVG_group(0, 0);
        this.ItemLayers.Neg1.appendChild(this.TableGroup);

        let table_w = smaller ? 0.58 * this.W : 0.85 * this.W;
        let table_h = 70;
        let table_x = (this.W - table_w) / 2;
        let table_y = this.table_center_y;

        const leg_width = 28;
        const leg_height = 320;
        [table_x + 0.08 * table_w, table_x + 0.92 * table_w - leg_width].forEach(lx => {
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

    place_target_box(boxId) {
        let template = document.getElementById("toybox_" + boxId);
        if (!template) {
            console.error("PartnerBeliefIndividualBoxes: missing toybox_" + boxId);
            return null;
        }
        let BoxObj = copy_scale_and_move_object_to_position(
            template,
            this.ItemLayers.Main,
            this.box_center_x,
            this.box_center_y,
            2.5
        );
        apply_toybox_decoration_visibility_to_element(BoxObj, boxId);
        Array.from(BoxObj.getElementsByClassName("alignment_field")).forEach(t => t.remove());
        BoxObj.style.opacity = 0;
        BoxObj.style.pointerEvents = "none";
        this.BoxElement = BoxObj;
        return BoxObj;
    }

    create_curtain_with_reveal_circle({ armed = true } = {}) {
        this.CurtainGroup = create_SVG_group(0, 0, "pb_curtain", undefined);
        this.ItemLayers.Plus1.appendChild(this.CurtainGroup);

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
        // Not clickable until enable_curtain_reveal() — prevents queued early clicks
        // (e.g. during partner walk-in) from auto-resolving once the trial is ready.
        circle.style.pointerEvents = "none";
        circle.style.cursor = "default";
        this.CurtainGroup.appendChild(circle);
        this.RevealCircle = circle;

        if (armed) return this.enable_curtain_reveal();
        return null;
    }

    enable_curtain_reveal() {
        let circle = this.RevealCircle;
        if (!circle) {
            return Promise.resolve({
                reveal_click_elapsed_perf_ms: this._elapsedPerfMs(),
                reveal_click_elapsed_date_ms: this._elapsedDateMs(),
                reveal_click_perf: performance.now(),
                input_type: this.last_input_type || "unknown"
            });
        }

        circle.style.pointerEvents = "all";
        circle.style.cursor = "pointer";

        return new Promise(resolve => {
            circle.onpointerdown = (evt) => {
                if (evt && evt.pointerType) this.last_input_type = evt.pointerType;
                circle.onpointerdown = null;
                circle.style.cursor = "auto";
                resolve({
                    reveal_click_elapsed_perf_ms: this._elapsedPerfMs(),
                    reveal_click_elapsed_date_ms: this._elapsedDateMs(),
                    reveal_click_perf: performance.now(),
                    input_type: this.last_input_type || "unknown"
                });
            };
        });
    }

    async setup_partner_at_offscreen() {
        this.PartnerTranslateGroup = create_SVG_group(0, 0);
        this.ItemLayers.Plus2.insertBefore(this.PartnerTranslateGroup, this.BlackOverlay);

        this.PartnerScaleGroup = create_SVG_group(0, 0);
        this.PartnerTranslateGroup.appendChild(this.PartnerScaleGroup);

        for (let dir in this.Icons) {
            if (!this.Icons[dir]) continue;
            let icon = this.Icons[dir];
            icon.style.display = (dir === "back") ? "inherit" : "none";
            icon.querySelectorAll(".prep_element_hidden").forEach(el => el.remove());
            icon.style.transform = "";
            icon.removeAttribute("transform");
            this.PartnerScaleGroup.appendChild(icon);
        }

        this.partner_x = 0.9 * this.W;
        this.partner_y = this.H + 300;
        this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;
        this.PartnerScaleGroup.style.transform = "scale(40)";
        this.PartnerTranslateGroup.style.opacity = 1;
        window.getComputedStyle(this.PartnerTranslateGroup).transform;
    }

    set_partner_direction(dir) {
        for (let key in this.Icons) {
            if (this.Icons[key]) this.Icons[key].style.display = (key === dir) ? "inherit" : "none";
        }
    }

    async animate_partner_enter_and_face_box() {
        this.set_partner_direction("back");
        this.partner_y = 0.95 * this.H;
        this.PartnerTranslateGroup.style.transition = "transform 600ms ease-out";
        this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;
        await wait(800);

        this.PartnerTranslateGroup.style.transition = "transform 1200ms ease-in-out";
        this.PartnerScaleGroup.style.transition = "transform 1200ms ease-in-out";
        this.partner_y = 0.65 * this.H;
        this.partner_x = 0.85 * this.W;
        this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;
        this.PartnerScaleGroup.style.transform = "scale(30)";
        await wait(1400);

        this.set_partner_direction("back");
        this.partner_y = this.box_center_y + 40;
        this.PartnerTranslateGroup.style.transition = "transform 800ms ease-out";
        this.PartnerScaleGroup.style.transition = "transform 800ms ease-out";
        this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;
        this.PartnerScaleGroup.style.transform = "scale(24)";
        await wait(800);

        // Stop on the right of the box (outside the radial button ring), then face left toward it
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

    async animate_partner_exit() {
        if (!this.PartnerTranslateGroup) return;
        this.hide_question_bubble();
        this.set_partner_direction("right");
        this.PartnerTranslateGroup.style.transition = "transform 1200ms ease-in, opacity 400ms ease-in 800ms";
        let currentTransform = this.PartnerTranslateGroup.style.transform;
        this.PartnerTranslateGroup.style.transform = currentTransform + " translateX(1500px)";
        this.PartnerTranslateGroup.style.opacity = 0;
        await wait(1200);
    }

    _add_focus_outline_to_button(BtnGroup, btn_bg) {
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
        return outline;
    }

    _create_toy_choice_button(parent, toy_id, btn_x, btn_y, onSelect) {
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
        this._add_focus_outline_to_button(BtnGroup, btn_bg);

        if (toy_id === this.EMPTY_OPTION_ID) {
            let emptyInner = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            emptyInner.setAttribute("x", btn_x + 22);
            emptyInner.setAttribute("y", btn_y + 28);
            emptyInner.setAttribute("width", this.btn_size - 44);
            emptyInner.setAttribute("height", this.btn_size - 56);
            emptyInner.setAttribute("rx", 10);
            emptyInner.setAttribute("fill", "none");
            emptyInner.setAttribute("stroke", "#8d6e63");
            emptyInner.setAttribute("stroke-width", "4");
            emptyInner.setAttribute("stroke-dasharray", "10 8");
            BtnGroup.appendChild(emptyInner);

            let emptyLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            let emptyCx = btn_x + this.btn_size / 2;
            let emptyCy = btn_y + this.btn_size / 2 + 6;
            emptyLabel.setAttribute("x", emptyCx);
            emptyLabel.setAttribute("y", emptyCy);
            emptyLabel.setAttribute("text-anchor", "middle");
            emptyLabel.setAttribute("font-size", "26");
            emptyLabel.setAttribute("font-weight", "700");
            emptyLabel.setAttribute("fill", "#5d4037");
            emptyLabel.setAttribute("font-family", "Arial, sans-serif");
            emptyLabel.setAttribute("transform", `rotate(-45 ${emptyCx} ${emptyCy})`);
            emptyLabel.textContent = "empty";
            BtnGroup.appendChild(emptyLabel);
        } else {
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
        }

        let click_catcher = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        click_catcher.setAttribute("x", btn_x);
        click_catcher.setAttribute("y", btn_y);
        click_catcher.setAttribute("width", this.btn_size);
        click_catcher.setAttribute("height", this.btn_size);
        click_catcher.setAttribute("fill", "transparent");
        click_catcher.style.cursor = "pointer";
        BtnGroup.appendChild(click_catcher);

        click_catcher.onpointerenter = () => {
            btn_bg.setAttribute("fill", "#ebd89b");
            btn_bg.setAttribute("stroke", "gold");
        };
        click_catcher.onpointerleave = () => {
            btn_bg.setAttribute("fill", "#d8c381");
            btn_bg.setAttribute("stroke", "#b89f5d");
        };
        click_catcher.onpointerdown = (evt) => onSelect(toy_id, evt, BtnGroup);

        return BtnGroup;
    }

    _create_sack_choice_button(parent, sack_id, btn_x, btn_y, onSelect) {
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
        this._add_focus_outline_to_button(BtnGroup, btn_bg);

        let template = document.getElementById(sack_id);
        if (template) {
            let RawSack = template.cloneNode(true);
            RawSack.style.display = "inherit";
            let openGroup = RawSack.querySelector(".sack_open");
            if (openGroup) openGroup.remove();
            let closedGroup = RawSack.querySelector(".sack_closed");
            if (closedGroup) closedGroup.style.display = "inline";
            Array.from(RawSack.getElementsByClassName("prep_element_hidden")).forEach((el) => {
                el.style.display = "none";
            });
            BtnGroup.appendChild(RawSack);

            let TBox = RawSack.getBBox();
            let max_dim = Math.max(TBox.width, TBox.height) || 100;
            let scale = (this.btn_size * 0.85) / max_dim;
            let raw_cx = TBox.x + (TBox.width / 2);
            let raw_cy = TBox.y + (TBox.height / 2);
            let target_cx = btn_x + (this.btn_size / 2);
            let target_cy = btn_y + (this.btn_size / 2);
            RawSack.style.transformOrigin = `${raw_cx}px ${raw_cy}px`;
            RawSack.style.transform = `translate(${target_cx - raw_cx}px, ${target_cy - raw_cy}px) scale(${scale})`;
        } else {
            console.warn("PartnerBeliefIndividualBoxes: missing sack id " + sack_id);
        }

        let click_catcher = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        click_catcher.setAttribute("x", btn_x);
        click_catcher.setAttribute("y", btn_y);
        click_catcher.setAttribute("width", this.btn_size);
        click_catcher.setAttribute("height", this.btn_size);
        click_catcher.setAttribute("fill", "transparent");
        click_catcher.style.cursor = "pointer";
        BtnGroup.appendChild(click_catcher);

        click_catcher.onpointerenter = () => {
            btn_bg.setAttribute("fill", "#ebd89b");
            btn_bg.setAttribute("stroke", "gold");
        };
        click_catcher.onpointerleave = () => {
            btn_bg.setAttribute("fill", "#d8c381");
            btn_bg.setAttribute("stroke", "#b89f5d");
        };
        click_catcher.onpointerdown = (evt) => onSelect(sack_id, evt, BtnGroup);

        return BtnGroup;
    }

    _drawFeatureShape(parent, shape, color, cx, cy, size = 42) {
        let el;
        if (shape === "circle") {
            el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            el.setAttribute("cx", cx);
            el.setAttribute("cy", cy);
            el.setAttribute("r", size);
        } else if (shape === "square") {
            el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            el.setAttribute("x", cx - size);
            el.setAttribute("y", cy - size);
            el.setAttribute("width", size * 2);
            el.setAttribute("height", size * 2);
            el.setAttribute("rx", 8);
        } else {
            el = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            el.setAttribute("points", `${cx},${cy - size - 6} ${cx + size + 6},${cy + size} ${cx - size - 6},${cy + size}`);
        }
        el.setAttribute("fill", color.fill);
        el.setAttribute("stroke", color.stroke);
        el.setAttribute("stroke-width", "4");
        parent.appendChild(el);
        return el;
    }

    place_central_feature_target(targetFeatures) {
        this.CentralTargetGroup = create_SVG_group(0, 0);
        this.CentralTargetGroup.style.opacity = 0;
        this.ItemLayers.Main.appendChild(this.CentralTargetGroup);
        this._drawFeatureShape(
            this.CentralTargetGroup,
            targetFeatures.shape,
            targetFeatures.color,
            this.box_center_x,
            this.box_center_y - 20,
            48
        );
        return this.CentralTargetGroup;
    }

    _create_feature_choice_button(parent, option, btn_x, btn_y, onSelect) {
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
        this._add_focus_outline_to_button(BtnGroup, btn_bg);

        this._drawFeatureShape(
            BtnGroup,
            option.shape,
            option.color,
            btn_x + this.btn_size / 2,
            btn_y + this.btn_size / 2,
            42
        );

        let click_catcher = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        click_catcher.setAttribute("x", btn_x);
        click_catcher.setAttribute("y", btn_y);
        click_catcher.setAttribute("width", this.btn_size);
        click_catcher.setAttribute("height", this.btn_size);
        click_catcher.setAttribute("fill", "transparent");
        click_catcher.style.cursor = "pointer";
        BtnGroup.appendChild(click_catcher);

        click_catcher.onpointerenter = () => {
            btn_bg.setAttribute("fill", "#ebd89b");
            btn_bg.setAttribute("stroke", "gold");
        };
        click_catcher.onpointerleave = () => {
            btn_bg.setAttribute("fill", "#d8c381");
            btn_bg.setAttribute("stroke", "#b89f5d");
        };
        click_catcher.onpointerdown = (evt) => onSelect(option.id, evt, BtnGroup);

        return BtnGroup;
    }

    /**
     * Reveal box/target (optional) + radial options on the same frame; resolve on first pointerdown.
     * mode: "toys" | "features" | "heads" | "sacks"
     */
    show_radial_options_and_wait(options, { mode = "toys", showBox = false, showCentralTarget = false, showQuestionMark = false } = {}) {
        return new Promise(resolve => {
            let n = options.length;
            let baseAngle = Math.random() * Math.PI * 2;
            let layout = [];
            let prevRadius = this.radial_radius;
            // Keep distractor-sized buttons; widen the ring when there are more options.
            if (n >= 5) {
                this.radial_radius = 330;
            } else if (n === 4) {
                this.radial_radius = 300;
            }

            this.radialUIGroup = create_SVG_group(0, 0);
            this.radialUIGroup.style.opacity = 0;
            this.ItemLayers.Plus2.insertBefore(this.radialUIGroup, this.BlackOverlay);

            let disabled = false;
            let handleSelect = (selected_id, evt) => {
                if (disabled) return;
                disabled = true;
                let response_perf = performance.now();
                let input_type = (evt && evt.pointerType) ? evt.pointerType : (this.last_input_type || "unknown");

                if (this.radialUIGroup) {
                    this.radialUIGroup.style.transition = "opacity 150ms ease-in";
                    this.radialUIGroup.style.opacity = 0;
                    setTimeout(() => {
                        if (this.radialUIGroup) this.radialUIGroup.remove();
                        this.radialUIGroup = null;
                    }, 160);
                }

                this.radial_radius = prevRadius;

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
                layout.push({
                    option_id,
                    x: Math.round(bx),
                    y: Math.round(by)
                });

                if (mode === "features") {
                    this._create_feature_choice_button(this.radialUIGroup, opt, bx, by, handleSelect);
                } else if (mode === "heads") {
                    this._create_head_choice_button(this.radialUIGroup, option_id, bx, by, handleSelect);
                } else if (mode === "sacks") {
                    this._create_sack_choice_button(this.radialUIGroup, option_id, bx, by, handleSelect);
                } else {
                    this._create_toy_choice_button(this.radialUIGroup, opt, bx, by, handleSelect);
                }
            });

            requestAnimationFrame(() => {
                if (this.CurtainGroup) {
                    this.CurtainGroup.remove();
                    this.CurtainGroup = null;
                }
                if (showBox && this.BoxElement) {
                    this.BoxElement.style.opacity = 1;
                }
                if (showCentralTarget && this.CentralTargetGroup) {
                    this.CentralTargetGroup.style.opacity = 1;
                }
                if (showCentralTarget && this.CentralFennimalElement) {
                    this.CentralFennimalElement.style.opacity = 1;
                }
                if (showQuestionMark) {
                    this.show_box_question_mark();
                }
                this.radialUIGroup.style.opacity = 1;

                this._responseOnsetPerf = performance.now();
                this._responseOnsetElapsedPerf = this._elapsedPerfMs();
                this._responseOnsetElapsedDate = this._elapsedDateMs();
            });
        });
    }

    async run_trial(trial) {
        await this.fade_black(1, 300);
        this.clear_scene_contents();
        this.setup_background_and_table(true);

        if (trial.trial_kind === "practice" || trial.trial_kind === "distractor") {
            await this.run_feature_match_trial(trial);
        } else if (trial.trial_kind === "gating") {
            await this.run_gating_trial(trial);
        } else if (trial.trial_kind === "belief") {
            await this.run_belief_trial(trial);
        } else if (trial.trial_kind === "action_prediction") {
            await this.run_action_prediction_trial(trial);
        } else if (trial.trial_kind === "reality") {
            await this.run_reality_trial(trial);
        } else if (trial.trial_kind === "memory_probe_box_to_fennimal") {
            await this.run_box_to_fennimal_probe_trial(trial);
        } else if (trial.trial_kind === "memory_probe_fennimal_to_toy") {
            await this.run_fennimal_to_toy_probe_trial(trial);
        } else if (trial.trial_kind === "memory_probe_box_to_sack") {
            await this.run_box_to_sack_probe_trial(trial);
        } else if (trial.trial_kind === "memory_probe_sack_to_toy") {
            await this.run_sack_to_toy_probe_trial(trial);
        }
    }

    async run_reality_block_intro() {
        await this.fade_black(1, 300);
        this.clear_scene_contents();
        this.setup_background_and_table(true);

        await this.setup_partner_at_offscreen();
        this.set_partner_direction("left");
        this.partner_x = 0.85 * this.W;
        this.partner_y = 0.65 * this.H;
        this.PartnerTranslateGroup.style.transition = "none";
        this.PartnerScaleGroup.style.transition = "none";
        this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;
        this.PartnerScaleGroup.style.transform = "scale(24)";
        this.PartnerTranslateGroup.style.opacity = 1;
        window.getComputedStyle(this.PartnerTranslateGroup).transform;

        await this.fade_black(0, 350);
        await wait(500);
        await this.animate_partner_exit();
        await wait(300);

        await this.show_reality_block_instructions_overlay();
    }

    show_reality_block_instructions_overlay() {
        return new Promise(resolve => {
            let overlay = create_SVG_group(0, 0, undefined, "pb_reality_block_intro");
            // Above the black fade rect so the continue control stays clickable.
            this.ItemLayers.Plus2.appendChild(overlay);

            let dim = create_SVG_rect(0, 0, this.W, this.H);
            dim.setAttribute("fill", "#111");
            dim.style.opacity = 0.82;
            dim.style.pointerEvents = "all";
            overlay.appendChild(dim);

            let panel = create_SVG_rect(0.12 * this.W, 0.22 * this.H, 0.76 * this.W, 0.42 * this.H);
            panel.setAttribute("rx", 24);
            panel.setAttribute("fill", "#f7f1e4");
            panel.setAttribute("stroke", "#b89f5d");
            panel.setAttribute("stroke-width", "6");
            overlay.appendChild(panel);

            let body = create_SVG_text_in_foreign_element(
                `${this.partnername} has left.<br><br>` +
                `The next questions are about which toys are <b>actually</b> currently in the boxes — ` +
                `not what ${this.partnername} believes.`,
                0.16 * this.W,
                0.28 * this.H,
                0.68 * this.W,
                0.28 * this.H,
                "instruction_element_text"
            );
            body.style.fontSize = "42px";
            body.style.textAlign = "center";
            overlay.appendChild(body);

            let continueButton = create_SVG_buttonElement(
                0.5 * this.W,
                0.78 * this.H,
                400,
                75,
                "Continue",
                40
            );
            overlay.appendChild(continueButton);
            continueButton.style.cursor = "pointer";
            continueButton.onpointerdown = () => {
                continueButton.onpointerdown = null;
                overlay.remove();
                resolve();
            };
        });
    }

    async run_memory_probe_intro() {
        await this.fade_black(1, 300);
        this.clear_scene_contents();
        this.setup_background_and_table(true);
        await this.fade_black(0, 350);
        await this.show_memory_probe_instructions_overlay();
    }

    show_memory_probe_instructions_overlay() {
        return new Promise(resolve => {
            let overlay = create_SVG_group(0, 0, undefined, "pb_memory_probe_intro");
            this.ItemLayers.Plus2.appendChild(overlay);

            let dim = create_SVG_rect(0, 0, this.W, this.H);
            dim.setAttribute("fill", "#111");
            dim.style.opacity = 0.82;
            dim.style.pointerEvents = "all";
            overlay.appendChild(dim);

            let panel = create_SVG_rect(0.12 * this.W, 0.22 * this.H, 0.76 * this.W, 0.42 * this.H);
            panel.setAttribute("rx", 24);
            panel.setAttribute("fill", "#f7f1e4");
            panel.setAttribute("stroke", "#b89f5d");
            panel.setAttribute("stroke-width", "6");
            overlay.appendChild(panel);

            let body = create_SVG_text_in_foreign_element(
                this.TaskObj.include_sack_memory_probes
                    ? (`We will now ask you about the Fennimals and their toys, boxes, and sacks.<br><br>` +
                        `Answer as quickly and accurately as you can.`)
                    : (`We will now ask you about the Fennimals and their toys and boxes.<br><br>` +
                        `Answer as quickly and accurately as you can.`),
                0.16 * this.W,
                0.28 * this.H,
                0.68 * this.W,
                0.28 * this.H,
                "instruction_element_text"
            );
            body.style.fontSize = "42px";
            body.style.textAlign = "center";
            overlay.appendChild(body);

            let continueButton = create_SVG_buttonElement(
                0.5 * this.W,
                0.78 * this.H,
                400,
                75,
                "Continue",
                40
            );
            overlay.appendChild(continueButton);
            continueButton.style.cursor = "pointer";
            continueButton.onpointerdown = () => {
                continueButton.onpointerdown = null;
                overlay.remove();
                resolve();
            };
        });
    }

    _fenObjById(fenId) {
        let fens = this._getProbeFennimals();
        return fens.find((f) => f.id === fenId) || null;
    }

    _create_head_choice_button(parent, fenId, btn_x, btn_y, onSelect) {
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
        this._add_focus_outline_to_button(BtnGroup, btn_bg);

        let fenObj = this._fenObjById(fenId);
        if (fenObj) {
            let head = create_Fennimal_SVG_object_head_only(fenObj, false);
            head.style.display = "inherit";
            BtnGroup.appendChild(head);

            let HBox = head.getBBox();
            let max_dim = Math.max(HBox.width, HBox.height) || 100;
            let scale = (this.btn_size * 0.8) / max_dim;
            let raw_cx = HBox.x + (HBox.width / 2);
            let raw_cy = HBox.y + (HBox.height / 2);
            let target_cx = btn_x + (this.btn_size / 2);
            let target_cy = btn_y + (this.btn_size / 2);
            head.style.transformOrigin = `${raw_cx}px ${raw_cy}px`;
            head.style.transform = `translate(${target_cx - raw_cx}px, ${target_cy - raw_cy}px) scale(${scale})`;
        }

        let click_catcher = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        click_catcher.setAttribute("x", btn_x);
        click_catcher.setAttribute("y", btn_y);
        click_catcher.setAttribute("width", this.btn_size);
        click_catcher.setAttribute("height", this.btn_size);
        click_catcher.setAttribute("fill", "transparent");
        click_catcher.style.cursor = "pointer";
        BtnGroup.appendChild(click_catcher);

        click_catcher.onpointerenter = () => {
            btn_bg.setAttribute("fill", "#ebd89b");
            btn_bg.setAttribute("stroke", "gold");
        };
        click_catcher.onpointerleave = () => {
            btn_bg.setAttribute("fill", "#d8c381");
            btn_bg.setAttribute("stroke", "#b89f5d");
        };
        click_catcher.onpointerdown = (evt) => onSelect(fenId, evt, BtnGroup);

        return BtnGroup;
    }

    place_central_fennimal(fenObj) {
        if (!fenObj) return null;

        let fen = create_Fennimal_SVG_object(fenObj, GenParam.Fennimal_head_size, false);
        fen.style.opacity = 0;
        fen.style.pointerEvents = "none";
        this.ItemLayers.Main.appendChild(fen);

        let scale = 1.15;
        let scaleGroup = fen.getElementsByClassName("Fennimal_scale_group")[0];
        if (scaleGroup) {
            scaleGroup.style.transformOrigin = "50% 100%";
            scaleGroup.style.transformBox = "fill-box";
            scaleGroup.style.transform = `scale(${scale})`;
        }

        // Center the full Fennimal bbox on the radial-option origin (same point
        // the three choice buttons orbit), not on the feet.
        let BBox = fen.getBBox();
        let fenCx = BBox.x + 0.5 * BBox.width;
        let fenCy = BBox.y + 0.5 * BBox.height;
        fen.style.transform = `translate(${this.box_center_x - fenCx}px, ${this.box_center_y - fenCy}px)`;

        this.CentralFennimalElement = fen;
        this.CentralTargetGroup = fen;
        return fen;
    }

    place_central_sack(sackId) {
        let template = document.getElementById(sackId);
        if (!template) {
            console.error("PartnerBeliefIndividualBoxes: missing sack id " + sackId);
            return null;
        }

        let SackObj = copy_scale_and_move_object_to_position(
            template,
            this.ItemLayers.Main,
            this.box_center_x,
            this.box_center_y,
            2.2
        );
        let openGroup = SackObj.querySelector(".sack_open");
        if (openGroup) openGroup.remove();
        let closedGroup = SackObj.querySelector(".sack_closed");
        if (closedGroup) closedGroup.style.display = "inline";
        Array.from(SackObj.getElementsByClassName("prep_element_hidden")).forEach((el) => {
            el.style.display = "none";
        });
        SackObj.style.opacity = 0;
        SackObj.style.pointerEvents = "none";
        this.CentralTargetGroup = SackObj;
        return SackObj;
    }

    /**
     * Same gold "?" used in the partner thought bubble, anchored above the target box.
     */
    show_box_question_mark() {
        this.hide_box_question_mark();

        this.BoxQuestionMarkGroup = create_SVG_group(0, 0, undefined, "pb_box_question_mark");
        // Sit above the curtain so it remains visible as a box-focused cue.
        this.ItemLayers.Plus1.appendChild(this.BoxQuestionMarkGroup);

        let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", "0");
        text.setAttribute("y", "0");
        text.setAttribute("font-family", "Arial, sans-serif");
        text.setAttribute("font-weight", "bold");
        text.setAttribute("font-size", "95");
        text.setAttribute("fill", "gold");
        text.setAttribute("stroke", "#b8860b");
        text.setAttribute("stroke-width", "2");
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.textContent = "?";
        this.BoxQuestionMarkGroup.appendChild(text);

        let x = this.box_center_x;
        let y = this.box_center_y;
        this.BoxQuestionMarkGroup.style.pointerEvents = "none";
        this.BoxQuestionMarkGroup.style.transformOrigin = "0px 0px";
        this.BoxQuestionMarkGroup.style.transform = `translate(${x}px, ${y}px) scale(0)`;
        this.BoxQuestionMarkGroup.style.transition = "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)";
        window.getComputedStyle(this.BoxQuestionMarkGroup).transform;
        this.BoxQuestionMarkGroup.style.transform = `translate(${x}px, ${y}px) scale(1.35)`;

        this.box_qmark_float_interval = setInterval(() => {
            if (!this.BoxQuestionMarkGroup) return;
            this.BoxQuestionMarkGroup.style.transition = "transform 1000ms ease-in-out";
            this.BoxQuestionMarkGroup.style.transform = `translate(${x}px, ${y - 12}px) scale(1.35)`;
            setTimeout(() => {
                if (!this.BoxQuestionMarkGroup) return;
                this.BoxQuestionMarkGroup.style.transform = `translate(${x}px, ${y + 8}px) scale(1.35)`;
            }, 1000);
        }, 2000);
    }

    hide_box_question_mark() {
        if (this.box_qmark_float_interval) {
            clearInterval(this.box_qmark_float_interval);
            this.box_qmark_float_interval = null;
        }
        if (this.BoxQuestionMarkGroup) {
            this.BoxQuestionMarkGroup.remove();
            this.BoxQuestionMarkGroup = null;
        }
    }

    _featureMatchPrompt(match_rule) {
        return match_rule === "shape"
            ? "Choose the object with the same shape."
            : "Choose the object with the same color.";
    }

    /**
     * Compact on-screen choice buttons for storage:
     * id + meaning-in-context (role) + content fields + rounded x/y.
     */
    _buildStoredOptions(responseLayout, optionInfos) {
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

    async run_feature_match_trial(trial) {
        this.place_central_feature_target(trial.target_features);
        let revealPromise = this.create_curtain_with_reveal_circle();
        await this.fade_black(0, 350);

        Interface.Prompt.show_message("Click on the circle to start the question");
        await revealPromise;
        Interface.Prompt.show_message(this._featureMatchPrompt(trial.match_rule));

        let response = await this.show_radial_options_and_wait(trial.answer_options, {
            mode: "features",
            showBox: false,
            showCentralTarget: true
        });

        Interface.Prompt.hide();
        AudioCont.play_sound_effect("button_click");

        this.ParticipantAnswers.push({
            trial_kind: trial.trial_kind,
            question_id: trial.question_id,
            block_index: trial.block_index,
            trial_index: this.overall_presentation_index,
            match_rule: trial.match_rule,
            target: {
                shape: trial.target_features.shape,
                color_id: trial.target_features.color.id
            },
            options: this._buildStoredOptions(
                response.option_layout,
                trial.answer_options.map((o) => ({
                    id: o.id,
                    role: o.role,
                    shape: o.shape,
                    color_id: o.color.id
                }))
            ),
            selected: response.selected_id,
            correct: response.selected_id === trial.correct_option_id,
            reaction_time_ms: response.reaction_time_ms
        });

        await wait(400);
    }

    async run_gating_trial(trial) {
        this.place_target_box(trial.target_box);
        if (this.BoxElement) {
            this.BoxElement.style.opacity = 1;
            this.BoxElement.style.pointerEvents = "none";
        }

        await this.setup_partner_facing_participant({ x: 0.72 * this.W });
        await this.fade_black(0, 350);

        let printed_box_name = GenParam.get_box_printed_name(trial.target_box);
        let correct_answer = this._partnerKnowsBoxContents(trial.target_box) ? "yes" : "no";
        let response = await this.show_gating_yes_no_overlay(
            `Does ${this.partnername} know which toy is currently in the ${printed_box_name}?`
        );

        AudioCont.play_sound_effect("button_click");
        let is_correct = (response.selected_id === correct_answer);

        this.ParticipantAnswers.push({
            trial_kind: "gating",
            question_id: trial.question_id,
            block_index: trial.block_index,
            trial_index: this.overall_presentation_index,
            target_box: trial.target_box,
            target_box_code: trial.target_box_code,
            options: [
                { id: "yes", role: correct_answer === "yes" ? "correct" : "foil" },
                { id: "no", role: correct_answer === "no" ? "correct" : "foil" }
            ],
            selected: response.selected_id,
            correct: is_correct,
            correct_option_id: correct_answer,
            partner_knows: correct_answer === "yes",
            reaction_time_ms: response.reaction_time_ms
        });

        await this.fade_black(1, 350);
    }

    setup_partner_facing_participant({ x = null, y = null } = {}) {
        this.PartnerTranslateGroup = create_SVG_group(0, 0);
        this.ItemLayers.Plus2.insertBefore(this.PartnerTranslateGroup, this.BlackOverlay);

        this.PartnerScaleGroup = create_SVG_group(0, 0);
        this.PartnerTranslateGroup.appendChild(this.PartnerScaleGroup);

        for (let dir in this.Icons) {
            if (!this.Icons[dir]) continue;
            let icon = this.Icons[dir];
            icon.style.display = (dir === "front") ? "inherit" : "none";
            icon.querySelectorAll(".prep_element_hidden").forEach(el => el.remove());
            icon.style.transform = "";
            icon.removeAttribute("transform");
            this.PartnerScaleGroup.appendChild(icon);
        }

        this.partner_x = (typeof x === "number") ? x : (0.5 * this.W);
        this.partner_y = (typeof y === "number") ? y : (0.88 * this.H);
        this.PartnerTranslateGroup.style.transition = "none";
        this.PartnerScaleGroup.style.transition = "none";
        this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;
        this.PartnerScaleGroup.style.transform = "scale(28)";
        this.PartnerTranslateGroup.style.opacity = 1;
        window.getComputedStyle(this.PartnerTranslateGroup).transform;
    }

    show_gating_yes_no_overlay(questionText) {
        return new Promise(resolve => {
            let overlay = create_SVG_group(0, 0, undefined, "pb_gating_overlay");
            this.ItemLayers.Plus2.appendChild(overlay);
            this.GatingOverlay = overlay;

            // Transparent full-screen catcher so clicks outside buttons don't fall through,
            // but no dark dim over the scene.
            let catcher = create_SVG_rect(0, 0, this.W, this.H);
            catcher.setAttribute("fill", "transparent");
            catcher.style.pointerEvents = "all";
            overlay.appendChild(catcher);

            let panelW = 0.62 * this.W;
            let panelH = 0.16 * this.H;
            let panelX = (this.W - panelW) / 2;
            let panelY = 0.06 * this.H;
            let panel = create_SVG_rect(panelX, panelY, panelW, panelH);
            panel.setAttribute("rx", 20);
            panel.setAttribute("fill", "#f7f1e4");
            panel.setAttribute("stroke", "#b89f5d");
            panel.setAttribute("stroke-width", "5");
            overlay.appendChild(panel);

            let body = create_SVG_text_in_foreign_element(
                questionText,
                panelX + 0.03 * this.W,
                panelY + 0.02 * this.H,
                panelW - 0.06 * this.W,
                panelH - 0.03 * this.H,
                "instruction_element_text"
            );
            body.style.fontSize = "36px";
            body.style.textAlign = "center";
            overlay.appendChild(body);

            let onset = performance.now();
            let answered = false;
            let buttonY = panelY + panelH + 0.055 * this.H;
            let makeButton = (label, optionId, cx) => {
                let btn = create_SVG_buttonElement(cx, buttonY, 240, 70, label, 36);
                overlay.appendChild(btn);
                btn.style.cursor = "pointer";
                btn.onpointerdown = () => {
                    if (answered) return;
                    answered = true;
                    btn.onpointerdown = null;
                    overlay.remove();
                    this.GatingOverlay = null;
                    resolve({
                        selected_id: optionId,
                        reaction_time_ms: Math.round(performance.now() - onset)
                    });
                };
            };

            makeButton("Yes", "yes", 0.38 * this.W);
            makeButton("No", "no", 0.62 * this.W);
        });
    }

    async run_action_prediction_trial(trial) {
        let boxes = this._uniqueBoxesForActionPrediction();
        if (boxes.length === 0) {
            console.error(`PartnerBeliefIndividualBoxes: no boxes available for action prediction "${trial.question_id}".`);
            await this.fade_black(0, 200);
            return;
        }

        let correctLoc = this._findPartnerBelievedLocationForToy(trial.target_toy);
        this.place_action_prediction_targets(boxes);

        let rightmostX = Math.max(
            ...(this.ActionTargetElements || []).map((t) => t.x),
            this.table_center_x
        );
        let clearX = Math.min(0.88 * this.W, rightmostX + 220);
        await this.setup_partner_facing_participant({ x: clearX });
        await this.fade_black(0, 350);

        await Interface.showPartnerSpeechBubble({
            target: this.PartnerTranslateGroup || this.PartnerScaleGroup,
            context: "location",
            text: `I'll go and find the ${trial.target_toy}`,
            buttonLabel: "OK"
        });

        this.set_partner_direction("back");
        await wait(200);

        // Short step toward the table from the already-cleared x position.
        this.PartnerTranslateGroup.style.transition = "transform 450ms ease-out";
        this.partner_y = this.partner_y - 0.06 * this.H;
        this.PartnerTranslateGroup.style.transform = `translate(${this.partner_x}px, ${this.partner_y}px)`;
        await wait(500);

        this.highlight_action_prediction_targets();
        Interface.Prompt.show_message(
            `Where will ${this.partnername} first look for the ${trial.target_toy}?`
        );

        let response = await this.wait_for_action_prediction_selection();
        Interface.Prompt.hide();
        AudioCont.play_sound_effect("button_click");

        let is_correct = (response.selected_id === correctLoc.option_id);

        this.ParticipantAnswers.push({
            trial_kind: "action_prediction",
            question_id: trial.question_id,
            block_index: trial.block_index,
            trial_index: this.overall_presentation_index,
            target_toy: trial.target_toy,
            target_toy_code: trial.target_toy_code,
            options: (this.ActionTargetElements || []).map((t) => ({
                id: t.option_id,
                option_type: t.option_type,
                role: (t.option_id === correctLoc.option_id) ? "correct" : "foil",
                x: t.x,
                y: t.y
            })),
            selected: response.selected_id,
            correct: is_correct,
            correct_option_id: correctLoc.option_id,
            correct_option_type: correctLoc.option_type,
            reaction_time_ms: response.reaction_time_ms
        });

        await this.fade_black(1, 350);
    }

    place_action_prediction_targets(boxes) {
        let items = boxes.map((b) => ({
            option_id: b.target_box,
            option_type: "box",
            target_box: b.target_box,
            target_box_code: b.target_box_code
        }));
        items.push({ option_id: "backpack", option_type: "backpack" });
        items = shuffleArray(items);

        let n = items.length;
        let spacing = Math.min(280, (0.7 * this.W) / Math.max(n, 1));
        let total = (n - 1) * spacing;
        let startX = this.table_center_x - total / 2;
        let y = this.table_center_y - 10;

        this.ActionTargetElements = [];

        items.forEach((item, i) => {
            let x = startX + i * spacing;
            let elem = null;

            if (item.option_type === "box") {
                let template = document.getElementById("toybox_" + item.target_box);
                if (!template) {
                    console.error("PartnerBeliefIndividualBoxes: missing toybox_" + item.target_box);
                    return;
                }
                elem = copy_scale_and_move_object_to_position(
                    template,
                    this.ItemLayers.Main,
                    x,
                    y,
                    2.1
                );
                apply_toybox_decoration_visibility_to_element(elem, item.target_box);
                Array.from(elem.getElementsByClassName("alignment_field")).forEach(t => t.remove());
                elem.style.opacity = 1;
            } else {
                let template = document.getElementById("backpack");
                if (!template) {
                    console.error("PartnerBeliefIndividualBoxes: missing #backpack");
                    return;
                }
                elem = copy_scale_and_move_object_to_position(
                    template,
                    this.ItemLayers.Main,
                    x,
                    y + 20,
                    1.6
                );
                elem.style.opacity = 1;
                this.BackpackElement = elem;
            }

            this.ActionTargetElements.push({
                ...item,
                element: elem,
                outline: null,
                catcher: null,
                x: Math.round(x),
                y: Math.round(y)
            });
        });
    }

    highlight_action_prediction_targets() {
        (this.ActionTargetElements || []).forEach((target) => {
            if (!target.element) return;

            let outline = null;
            if (typeof create_SVG_outline_of_multiple_groups === "function") {
                outline = create_SVG_outline_of_multiple_groups(target.element);
                target.element.parentNode.insertBefore(outline, target.element);
                outline.classList.add("focus_on_SVG_outline");
            }

            // Placement uses CSS transforms, so getBBox is unreliable for hit targets.
            let hitW = 180;
            let hitH = 180;
            let catcher = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            catcher.setAttribute("x", target.x - hitW / 2);
            catcher.setAttribute("y", target.y - hitH / 2);
            catcher.setAttribute("width", hitW);
            catcher.setAttribute("height", hitH);
            catcher.setAttribute("fill", "transparent");
            catcher.style.cursor = "pointer";
            catcher.style.pointerEvents = "all";
            this.ItemLayers.Plus1.appendChild(catcher);

            target.outline = outline;
            target.catcher = catcher;
        });
    }

    wait_for_action_prediction_selection() {
        return new Promise(resolve => {
            let disabled = false;
            let onset = performance.now();
            (this.ActionTargetElements || []).forEach((target) => {
                if (!target.catcher) return;
                target.catcher.onpointerdown = (evt) => {
                    if (disabled) return;
                    disabled = true;
                    (this.ActionTargetElements || []).forEach((other) => {
                        if (other.catcher) {
                            other.catcher.onpointerdown = null;
                            other.catcher.style.pointerEvents = "none";
                            other.catcher.style.cursor = "default";
                        }
                        if (other !== target && other.outline) {
                            other.outline.classList.remove("focus_on_SVG_outline");
                            other.outline.style.opacity = 0.25;
                        }
                        if (other !== target && other.element) {
                            other.element.style.opacity = 0.45;
                        }
                    });
                    resolve({
                        selected_id: target.option_id,
                        reaction_time_ms: Math.round(performance.now() - onset),
                        input_type: (evt && evt.pointerType) ? evt.pointerType : "unknown"
                    });
                };
            });
        });
    }

    async run_belief_trial(trial) {
        let choiceSet = this._buildAllToyChoiceSet(trial, "belief");
        if (!choiceSet) {
            console.error(`PartnerBeliefIndividualBoxes: skipping belief trial "${trial.question_id}" due to invalid options.`);
            await this.fade_black(0, 200);
            return;
        }

        this.place_target_box(trial.target_box);
        // Curtain is visible during partner walk-in, but reveal is armed only after arrival
        // so an early click cannot queue-resolve and auto-lift the curtain.
        this.create_curtain_with_reveal_circle({ armed: false });

        await this.setup_partner_at_offscreen();
        await this.fade_black(0, 350);
        await this.animate_partner_enter_and_face_box();

        let printed_box_name = GenParam.get_box_printed_name(trial.target_box);
        Interface.Prompt.show_message("Click on the circle to start the question");
        await this.enable_curtain_reveal();

        Interface.Prompt.show_message(
            `What does ${this.partnername} believe is in the ${printed_box_name}? Answer as accurately as you can.`
        );

        let response = await this.show_radial_options_and_wait(choiceSet.answer_options, {
            mode: "toys",
            showBox: true
        });

        Interface.Prompt.hide();
        AudioCont.play_sound_effect("button_click");

        let is_correct = (response.selected_id === choiceSet.correct_option_id);

        this.ParticipantAnswers.push({
            trial_kind: "belief",
            question_id: trial.question_id,
            block_index: trial.block_index,
            trial_index: this.overall_presentation_index,
            target_box: trial.target_box,
            options: this._buildStoredOptions(
                response.option_layout,
                choiceSet.answer_options.map((toyId) => ({
                    id: toyId,
                    role: choiceSet.option_roles[toyId] || "unknown"
                }))
            ),
            selected: response.selected_id,
            correct: is_correct,
            reaction_time_ms: response.reaction_time_ms
        });

        await this.animate_partner_exit();
        await wait(200);
    }

    async run_reality_trial(trial) {
        let choiceSet = this._buildAllToyChoiceSet(trial, "reality");
        if (!choiceSet) {
            console.error(`PartnerBeliefIndividualBoxes: skipping reality trial "${trial.question_id}" due to invalid options.`);
            await this.fade_black(0, 200);
            return;
        }

        this.place_target_box(trial.target_box);
        let revealPromise = this.create_curtain_with_reveal_circle();
        await this.fade_black(0, 350);

        let printed_box_name = GenParam.get_box_printed_name(trial.target_box);
        Interface.Prompt.show_message("Click on the circle to start the question");
        await revealPromise;

        Interface.Prompt.show_message(
            `What is really in the ${printed_box_name} right now? Answer as accurately as you can.`
        );

        let response = await this.show_radial_options_and_wait(choiceSet.answer_options, {
            mode: "toys",
            showBox: true,
            showQuestionMark: true
        });

        Interface.Prompt.hide();
        this.hide_box_question_mark();
        AudioCont.play_sound_effect("button_click");

        let is_correct = (response.selected_id === choiceSet.correct_option_id);

        this.ParticipantAnswers.push({
            trial_kind: "reality",
            question_id: trial.question_id,
            block_index: trial.block_index,
            trial_index: this.overall_presentation_index,
            target_box: trial.target_box,
            options: this._buildStoredOptions(
                response.option_layout,
                choiceSet.answer_options.map((toyId) => ({
                    id: toyId,
                    role: choiceSet.option_roles[toyId] || "unknown"
                }))
            ),
            selected: response.selected_id,
            correct: is_correct,
            reaction_time_ms: response.reaction_time_ms
        });

        await wait(400);
    }

    _boxToFennimalProbePrompt(probeWave) {
        // Prompt text lives in an SVG <tspan>; use nested <tspan font-weight="bold">
        // (HTML <b> is stripped and leaves a blank before the "?").
        if (probeWave === "S") {
            return (
                `Which Fennimal's toy did you place in this box ` +
                `<tspan font-weight="bold">together with ${this.partnername}</tspan>?`
            );
        }
        if (probeWave === "P") {
            return (
                `Which Fennimal's toy did you place in this box ` +
                `<tspan font-weight="bold">after ${this.partnername} left</tspan>?`
            );
        }
        return "Which Fennimal keeps its toy in this box?";
    }

    async run_box_to_fennimal_probe_trial(trial) {
        this.place_target_box(trial.target_box);
        let revealPromise = this.create_curtain_with_reveal_circle();
        await this.fade_black(0, 350);

        Interface.Prompt.show_message("Click on the circle to start the question");
        await revealPromise;

        Interface.Prompt.show_message(this._boxToFennimalProbePrompt(trial.probe_wave));

        let response = await this.show_radial_options_and_wait(trial.answer_options, {
            mode: "heads",
            showBox: true
        });

        Interface.Prompt.hide();
        AudioCont.play_sound_effect("button_click");

        let is_correct = (response.selected_id === trial.correct_option_id);

        this.ParticipantAnswers.push({
            trial_kind: "memory_probe_box_to_fennimal",
            question_id: trial.question_id,
            block_index: trial.block_index,
            trial_index: this.overall_presentation_index,
            target_box: trial.target_box,
            target_fennimal: trial.target_fennimal,
            probe_wave: trial.probe_wave,
            foil_ids: trial.foil_ids,
            options: this._buildStoredOptions(
                response.option_layout,
                trial.answer_options.map((fenId) => ({
                    id: fenId,
                    role: (trial.option_roles && trial.option_roles[fenId]) || "unknown"
                }))
            ),
            selected: response.selected_id,
            correct: is_correct,
            reaction_time_ms: response.reaction_time_ms
        });

        await wait(this.memory_probe_isi_ms);
    }

    async run_fennimal_to_toy_probe_trial(trial) {
        let fenObj = this._fenObjById(trial.target_fennimal);
        if (!fenObj) {
            console.error(
                `PartnerBeliefIndividualBoxes: missing Fennimal "${trial.target_fennimal}" for Fennimal→toy probe.`
            );
            await this.fade_black(0, 200);
            return;
        }

        this.place_central_fennimal(fenObj);
        let revealPromise = this.create_curtain_with_reveal_circle();
        await this.fade_black(0, 350);

        Interface.Prompt.show_message("Click on the circle to start the question");
        await revealPromise;

        Interface.Prompt.show_message(
            "Which toy belongs to this Fennimal? Answer as quickly and accurately as you can."
        );

        let response = await this.show_radial_options_and_wait(trial.answer_options, {
            mode: "toys",
            showCentralTarget: true
        });

        Interface.Prompt.hide();
        AudioCont.play_sound_effect("button_click");

        let is_correct = (response.selected_id === trial.correct_option_id);

        this.ParticipantAnswers.push({
            trial_kind: "memory_probe_fennimal_to_toy",
            question_id: trial.question_id,
            block_index: trial.block_index,
            trial_index: this.overall_presentation_index,
            target_fennimal: trial.target_fennimal,
            options: this._buildStoredOptions(
                response.option_layout,
                trial.answer_options.map((toyId) => ({
                    id: toyId,
                    role: (trial.option_roles && trial.option_roles[toyId]) || "unknown"
                }))
            ),
            selected: response.selected_id,
            correct: is_correct,
            reaction_time_ms: response.reaction_time_ms
        });

        await wait(this.memory_probe_isi_ms);
    }

    async run_box_to_sack_probe_trial(trial) {
        this.place_target_box(trial.target_box);
        let revealPromise = this.create_curtain_with_reveal_circle();
        await this.fade_black(0, 350);

        Interface.Prompt.show_message("Click on the circle to start the question");
        await revealPromise;

        Interface.Prompt.show_message("Which sack did you previously place in this box?");

        let response = await this.show_radial_options_and_wait(trial.answer_options, {
            mode: "sacks",
            showBox: true
        });

        Interface.Prompt.hide();
        AudioCont.play_sound_effect("button_click");

        let is_correct = (response.selected_id === trial.correct_option_id);

        this.ParticipantAnswers.push({
            trial_kind: "memory_probe_box_to_sack",
            question_id: trial.question_id,
            block_index: trial.block_index,
            trial_index: this.overall_presentation_index,
            target_box: trial.target_box,
            target_fennimal: trial.target_fennimal,
            options: this._buildStoredOptions(
                response.option_layout,
                trial.answer_options.map((sackId) => ({
                    id: sackId,
                    role: (trial.option_roles && trial.option_roles[sackId]) || "unknown"
                }))
            ),
            selected: response.selected_id,
            correct: is_correct,
            reaction_time_ms: response.reaction_time_ms
        });

        await wait(this.memory_probe_isi_ms);
    }

    async run_sack_to_toy_probe_trial(trial) {
        this.place_central_sack(trial.target_sack);
        let revealPromise = this.create_curtain_with_reveal_circle();
        await this.fade_black(0, 350);

        Interface.Prompt.show_message("Click on the circle to start the question");
        await revealPromise;

        Interface.Prompt.show_message("Which toy did you previously place in this sack?");

        let response = await this.show_radial_options_and_wait(trial.answer_options, {
            mode: "toys",
            showCentralTarget: true
        });

        Interface.Prompt.hide();
        AudioCont.play_sound_effect("button_click");

        let is_correct = (response.selected_id === trial.correct_option_id);

        this.ParticipantAnswers.push({
            trial_kind: "memory_probe_sack_to_toy",
            question_id: trial.question_id,
            block_index: trial.block_index,
            trial_index: this.overall_presentation_index,
            target_sack: trial.target_sack,
            target_fennimal: trial.target_fennimal,
            options: this._buildStoredOptions(
                response.option_layout,
                trial.answer_options.map((toyId) => ({
                    id: toyId,
                    role: (trial.option_roles && trial.option_roles[toyId]) || "unknown"
                }))
            ),
            selected: response.selected_id,
            correct: is_correct,
            reaction_time_ms: response.reaction_time_ms
        });

        await wait(this.memory_probe_isi_ms);
    }

    async finish_task() {
        await this.fade_black(1, 400);
        this.TaskObj.PartnerBeliefAnswers = this.ParticipantAnswers;
        this.returnfunc();
    }

    clean_up() {
        if (this.bubble_float_interval) clearInterval(this.bubble_float_interval);
        if (this.box_qmark_float_interval) clearInterval(this.box_qmark_float_interval);
        if (this.ItemLayers) {
            Object.values(this.ItemLayers).forEach(layer => {
                if (layer && layer.parentNode) layer.remove();
            });
        }
        if (this.ParentLayer) this.ParentLayer.style.display = "none";
        Interface.Prompt.hide();
    }
}
