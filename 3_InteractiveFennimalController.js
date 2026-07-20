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
        if (this.BackgroundMask) this.BackgroundMask.remove();
        if (this.Fennimal) this.Fennimal.remove();

        // NEW: Kill the life support!
        if (this.gaze_tracker) window.removeEventListener('pointermove', this.gaze_tracker);
        if (this.animation_frame_id) cancelAnimationFrame(this.animation_frame_id);
    }
}

class BoxModule {
    BoxBase;
    BoxTop;
    BoxOutline;
    boxname;

    constructor(FenObj) {
        this.FenObj = FenObj;
        this.boxname = GenParam.get_box_printed_name(FenObj.toybox);
    }

    create_and_appear_box(ParentBase, ParentTop, center_x, center_y, scale, fade_in_time) {
        return new Promise(resolve => {
            this.BoxBase = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + this.FenObj.toybox), ParentBase, center_x, center_y , scale);
            this.BoxBase.getElementsByClassName("front")[0].remove();
            this.BoxBase.getElementsByClassName("lid")[0].remove();
            this.BoxBase.style.opacity = 0;

            this.BoxTop = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + this.FenObj.toybox), ParentTop, center_x, center_y , scale);
            this.BoxTop.getElementsByClassName("back")[0].remove();
            this.BoxTop.style.opacity = 0;

            window.getComputedStyle(this.BoxBase).opacity;
            this.BoxTop.style.transition = "all " + fade_in_time + "ms ease-in-out";
            this.BoxBase.style.transition = "all " + fade_in_time + "ms ease-in-out";
            this.BoxBase.style.opacity = 1;
            this.BoxTop.style.opacity = 1;

            setTimeout(() => resolve(), fade_in_time);
        });
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

    charge_car() {
        return new Promise(resolve => {
            Interface.Prompt.show_message("Please pull back the car to charge its spring");

            let totalScale = this.parentScale * this.zoomFactor;
            let friction = 0.95;
            let pull_target = 100;

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
                    currentTx = rawDx * friction;

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

                    if (Math.abs(currentTx) >= pull_target) {
                        // FIX: Only lock the toy (prevent re-grabbing) if they actually pulled it far enough!
                        this.ToyElement.onpointerdown = null;

                        AudioCont.play_sound_effect("success");
                        this.ToyElement.style.transition = "all 600ms cubic-bezier(0.25, 1, 0.5, 1)";
                        this.ToyElement.style.transform = `translate(${this.centered_x}px, ${this.centered_y}px) scale(${this.zoomFactor})`;
                        setTimeout(() => resolve(), 600);
                    } else {
                        // If they didn't pull far enough, it just snaps back, and the cursor resets so they know they can try again!
                        this.ToyElement.style.cursor = "grab";
                        this.ToyElement.style.transition = "all 300ms ease-out";
                        this.ToyElement.style.transform = `translate(${this.centered_x}px, ${this.centered_y}px) scale(${this.zoomFactor})`;
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

            let clicks = 0;
            const required_clicks = 6;

            const handle_click = () => {
                clicks++;
                AudioCont.play_sound_effect("wind_up_plane");

                if (clicks % 2 !== 0) {
                    prop_base.style.opacity = 0;
                    prop_alt.style.opacity = 1;
                } else {
                    prop_base.style.opacity = 1;
                    prop_alt.style.opacity = 0;
                }

                if (clicks >= required_clicks) {
                    prop_base.onpointerdown = null;
                    prop_alt.onpointerdown = null;
                    prop_base.style.cursor = "auto";
                    prop_alt.style.cursor = "auto";

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

            // Part 1: Flip the Switch
            toggle_off.onpointerdown = () => {
                AudioCont.play_sound_effect("switch_flicked");
                toggle_off.onpointerdown = null;
                toggle_off.style.cursor = "auto";

                this.set_robot_state("charging_step_1");

                // Part 2: Press the glowing red Start Button
                start_button.onpointerdown = () => {
                    AudioCont.play_sound_effect("success");
                    start_button.onpointerdown = null;

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
                if (crank_down) crank_down.style.opacity = 1;

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
                    if (crank_down) crank_down.style.opacity = 0;
                    is_cranking = false;

                    if (cranks >= max_cranks) {
                        crankHitbox.remove();

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

            if (wand_assembly) {
                wand_assembly.style.pointerEvents = "all";
                let wand_children = Array.from(wand_assembly.children);
                wand_children.forEach(child => {
                    child.style.pointerEvents = "all";
                });

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
            let dx = getSVGInternalCenter(target_element).x - getSVGInternalCenter(this.PartnerTranslateGroup).x;

            this.PartnerTranslateGroup.style.transition = "all 400ms ease-in-out";
            this.PartnerTranslateGroup.style.transform += "translateX(" + dx + "px)";

            setTimeout(() => action_callback(), 500);
            setTimeout(() => { this.PartnerTranslateGroup.style.transform = basetransform }, 600);
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
            this.PartnerTranslateGroup.style.transform = dx ? `translateX(${dx}px)` : "";
            setTimeout(() => resolve(), 500);
        });
    }

    // Light success reaction: bounce / dance in place (no speech).
    celebrate_success() {
        return new Promise(async resolve => {
            if (!this.is_present || !this.PartnerTranslateGroup) {
                resolve();
                return;
            }

            let base = this.PartnerTranslateGroup.style.transform || "";
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
                    `${base} translateY(${hop.y}px) rotate(${hop.r}deg)`;
                await wait(140);
            }

            this.PartnerTranslateGroup.style.transform = base;
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
        if (this.partner.PartnerTranslateGroup) this.partner.PartnerTranslateGroup.remove();
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

        // Minimum |Δx| from the box center required when dragging an old toy out.
        this.oldToyClearDistance = 400;
        this.old_toy = null;
        this.oldToyDragController = null;
        this.groundY = null;
    }

    getScaledTemplateHalfWidth(elementId, scale) {
        let template = document.getElementById(elementId);
        if (!template) return 180 * (scale / 4);

        let box = template.getBBox();
        return (Math.max(box.width, 1) * scale) / 2;
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

    subtractForbiddenRanges(availableRanges, forbiddenRanges) {
        let remaining = availableRanges.slice();

        forbiddenRanges.forEach(([fStart, fEnd]) => {
            let next = [];
            remaining.forEach(([aStart, aEnd]) => {
                if (fEnd <= aStart || fStart >= aEnd) {
                    next.push([aStart, aEnd]);
                    return;
                }
                if (fStart > aStart) next.push([aStart, Math.min(fStart, aEnd)]);
                if (fEnd < aEnd) next.push([Math.max(fEnd, aStart), aEnd]);
            });
            remaining = next.filter(([start, end]) => end - start > 1);
        });

        return remaining;
    }

    pickNonOccludingBoxX(toyCenterX, toyHalfWidth, boxHalfWidth, partnerCenterX = null, partnerHalfWidth = null) {
        const screenW = this.basics.W;
        const margin = 50;
        const gap = 50;
        const minCenter = margin + boxHalfWidth;
        const maxCenter = screenW - margin - boxHalfWidth;

        const forbidden = [
            [
                toyCenterX - toyHalfWidth - boxHalfWidth - gap,
                toyCenterX + toyHalfWidth + boxHalfWidth + gap
            ]
        ];

        if (partnerCenterX !== null && partnerHalfWidth !== null) {
            forbidden.push([
                partnerCenterX - partnerHalfWidth - boxHalfWidth - gap,
                partnerCenterX + partnerHalfWidth + boxHalfWidth + gap
            ]);
        }

        let ranges = this.subtractForbiddenRanges([[minCenter, maxCenter]], forbidden);

        if (ranges.length === 0) {
            // Prefer the side away from the partner when possible.
            if (partnerCenterX !== null && partnerCenterX > screenW * 0.5) {
                return minCenter;
            }
            return (toyCenterX < screenW / 2) ? maxCenter : minCenter;
        }

        let range = ranges[Math.floor(Math.random() * ranges.length)];
        return range[0] + Math.random() * (range[1] - range[0]);
    }

    async start_sequence() {
        this.basics.create_svg_sublayers();
        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }
        await this.basics.create_background_mask(true, 500);

        const toyScale = 4;
        const boxScale = 4;
        const toyCenterX = 0.5 * this.basics.W;
        const toyCenterY = 0.55 * this.basics.H;

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
        this.toy.ToyElement.style.transform += "translate(50px, 150px)";
        await wait(200);
        this.groundY = getSVGInternalCenter(this.toy.ToyElement).y;

        Interface.Prompt.show_message("Oops! The " + this.FenObj.toy + " has been left behind");
        await wait(750);

        Interface.Prompt.show_message("Let's keep the " + this.FenObj.toy + " safe in the " + this.box.boxname);

        let toyHalfW = this.getScaledTemplateHalfWidth("toy_" + this.FenObj.toy, toyScale);
        let boxHalfW = this.getScaledTemplateHalfWidth("toybox_" + this.FenObj.toybox, boxScale);
        let liveToyCenter = getSVGInternalCenter(this.toy.ToyElement);

        let partnerCenterX = null;
        let partnerHalfW = null;
        if (this.partner.is_present && this.partner.PartnerBaseGroup) {
            partnerCenterX = getSVGInternalCenter(this.partner.PartnerBaseGroup).x;
            partnerHalfW = this.getElementHalfWidthSVG(this.partner.PartnerBaseGroup);
        }

        let boxX = this.pickNonOccludingBoxX(
            liveToyCenter.x,
            toyHalfW,
            boxHalfW,
            partnerCenterX,
            partnerHalfW
        );
        let boxY = 0.7 * this.basics.H;

        await this.box.create_and_appear_box(
            this.basics.ItemLayers.Main,
            this.basics.ItemLayers.Plus2,
            boxX,
            boxY,
            boxScale,
            100
        );
        await wait(750);

        // Treat same-toy contents as empty: participant just stores it again with no clear step.
        let currentContents = WorldState.get_toybox_contents(this.FenObj.toybox);
        this.boxNeedsClearing = (currentContents && currentContents !== this.FenObj.toy);

        if (this.boxNeedsClearing) {
            this.old_toy = new StandardToyModule({ toy: currentContents });
            let boxTarget = getSVGInternalCenter(this.box.BoxTop.getElementsByClassName("box_target_centerpoint")[0]);
            // Sit under the closed lid so opening reveals it.
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

    async clear_occupied_box() {
        let oldToyName = this.old_toy.FenObj.toy;
        let groundY = (this.groundY != null)
            ? this.groundY
            : getSVGInternalCenter(this.toy.ToyElement).y;

        Interface.Prompt.show_message("There is already a " + oldToyName + " in the " + this.box.boxname);
        await wait(1200);

        Interface.Prompt.show_message("Drag the " + oldToyName + " out of the box");
        AudioCont.play_sound_effect("alert_minor");

        await new Promise(resolve => {
            const enableDragAway = () => {
                this.oldToyDragController = new MakeObjectDraggableObject(
                    this.basics.ItemLayers.Main,
                    this.basics.ItemLayers.Plus2,
                    this.old_toy.ToyElement,
                    this.box.BoxBase,
                    this.oldToyClearDistance,
                    async (DraggedToyElement) => {
                        // Accepted: lock in place (no longer draggable), optionally fall to ground.
                        Interface.Prompt.hide();
                        if (this.oldToyDragController && this.oldToyDragController.destroy) {
                            this.oldToyDragController.destroy();
                        }
                        this.oldToyDragController = null;
                        DraggedToyElement.style.pointerEvents = "none";
                        DraggedToyElement.style.cursor = "auto";

                        let current = getSVGInternalCenter(DraggedToyElement);
                        if (current.y < groundY) {
                            let dy = groundY - current.y;
                            DraggedToyElement.style.transition = "transform 350ms ease-in";
                            DraggedToyElement.style.transform += ` translate(0px, ${dy}px)`;
                            await wait(350);
                        }

                        // Same WorldState update as before; visual toy stays on screen.
                        WorldState.clear_toybox_contents(this.FenObj.toybox);
                        resolve();
                    },
                    {
                        validateDrop: (distToBox, event) => {
                            let toyCenter = getSVGInternalCenter(this.old_toy.ToyElement);
                            let boxCenter = getSVGInternalCenter(this.box.BoxBase);
                            return Math.abs(toyCenter.x - boxCenter.x) >= this.oldToyClearDistance;
                        },
                        onMiss: () => {
                            Interface.Prompt.show_message("Move it farther to the side of the box");
                            if (this.oldToyDragController && this.oldToyDragController.enable) {
                                this.oldToyDragController.enable();
                            }
                        }
                    }
                );
            };

            enableDragAway();
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
                    () => this.finish_trial()
                );
            }
        );
    }

    async finish_trial() {
        await wait(750);
        this.returnfunc();
    }

    clean_up() {
        if (this.oldToyDragController && this.oldToyDragController.destroy) {
            this.oldToyDragController.destroy();
            this.oldToyDragController = null;
        }
        this.basics.clean_up();
        this.box.clean_up();
        this.toy.clean_up();
        if (this.old_toy) this.old_toy.clean_up();
        if (this.partner.PartnerTranslateGroup) this.partner.PartnerTranslateGroup.remove();
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

    spawn_dirt_on_element(TargetElement, ParentLayer, num_spots) {
        this.TargetElement = TargetElement;
        this.dirt_remaining = num_spots;
        let targetBBox = TargetElement.getBBox();

        for (let i = 0; i < num_spots; i++) {
            let spot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            let radius = 15 + (Math.random() * 15);
            spot.setAttribute('r', radius);

            const colors = ['#4A3B2C', '#3E2723', '#5D4037', '#4E342E'];
            spot.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);

            let paddingX = targetBBox.width * 0.15;
            let paddingY = targetBBox.height * 0.15;
            let local_x = targetBBox.x + paddingX + (Math.random() * (targetBBox.width - 2 * paddingX));
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
     */
    start_scrub_turn(quota) {
        this.scrubMode = "turn";
        this.turnQuota = quota;
        this.turnCleaned = 0;
        this._rebind_sponge_pointer();
        this._spongeActive = true;
        if (this.SpongeTranslateGroup) {
            this.SpongeTranslateGroup.style.cursor = "grab";
            this.show_sponge_turn_outline();
        }
        return new Promise(resolve => {
            this._turnResolve = resolve;
        });
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
        this.failsafe_timeout = null; // Track the 30s timer
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

        this.failsafe_timeout = setTimeout(() => this.trigger_auto_solve(), 30000);
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
            await this.basics.trigger_comfort_checkin();
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
        this.failsafe_timeout = setTimeout(() => this.trigger_auto_solve(), 30000);
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
        await this.basics.trigger_comfort_checkin();
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
        this.failsafe_timeout = null; // Track the 30s timer for the broken toy part
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
        await this.basics.trigger_comfort_checkin();
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
// ("toybox" now; "fennimal" later). Shared camera / viewfinder / shutter / feedback.
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
        const minX = p.boxXMargin + boxHalfW;
        const maxX = W - p.boxXMargin - boxHalfW;

        let partnerCenterX = null;
        let partnerHalfW = null;
        if (this.partner.is_present && this.partner.PartnerBaseGroup) {
            partnerCenterX = getSVGInternalCenter(this.partner.PartnerBaseGroup).x;
            partnerHalfW = this.getElementHalfWidthSVG(this.partner.PartnerBaseGroup);
        }

        let ranges = [[minX, maxX]];
        if (partnerCenterX !== null && partnerHalfW !== null) {
            const gap = p.partnerAvoidGap;
            const fStart = partnerCenterX - partnerHalfW - boxHalfW - gap;
            const fEnd = partnerCenterX + partnerHalfW + boxHalfW + gap;
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

        return { x, y, scale };
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
                console.warn("PhotoTrialController: fennimal target not implemented yet; falling back to toybox.");
                return this.spawn_toybox_target();
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

    get_target_label() {
        if (this._targetLabelOverride) return this._targetLabelOverride;
        if (this.targetType === "toybox") return this.box.boxname;
        return this.FenObj.name || "target";
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

            return boxIcon;
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
            Interface.Prompt.show_message("Take a photo of the " + this.get_target_label());
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
        Interface.Prompt.show_message("Nice shot! The " + this.get_target_label() + " looks good.");

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
        targetLabel = null
    } = {}) {
        this.photoTargetElements = photoTargetElements || this.photoTargetElements;
        this._polaroidContentsOverride = polaroidContentsFn;
        this._targetLabelOverride = targetLabel;
        this._embeddedMode = true;
        this.is_processing_shot = false;

        Interface.Prompt.show_message(
            "Take a photo of the " + this.get_target_label() + " to remember this moment!"
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
    }

    // --- Orchestrator ---

    async start_sequence() {
        this.basics.create_svg_sublayers();
        await this.basics.create_background_mask(false, 500);

        if (this.partner.is_present) {
            this.basics.ItemLayers.Partner.appendChild(this.partner.PartnerBaseGroup);
        }

        await this.spawn_target();

        Interface.Prompt.show_message(
            "Take a photo of the " + this.get_target_label() + " to check if its still in good shape"
        );
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

        // Hand box to Fennimal (x-axis drag); box stays on screen at end
        await this.run_box_handoff();

        await wait(500);
        this.returnfunc();
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

        this.dirt.spawn_dirt_on_element(this.box.BoxTop, this.basics.ItemLayers.Plus2, p.dirtSpots);
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
            await this.dirt.start_scrub_turn(quota);
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
        let bellows = this.dust.BellowsTranslateGroup;
        let partnerCenter = getSVGInternalCenter(this.partner.PartnerTranslateGroup);
        let bellowsCenter = bellows
            ? getSVGInternalCenter(bellows)
            : { x: this.boxCenter.x - 200, y: this.boxCenter.y };
        // Approach bellows from the corner, puff, then return home
        let approachX = bellowsCenter.x + 140;
        let dx = approachX - partnerCenter.x;
        this.partner.PartnerTranslateGroup.style.transition = "transform 450ms ease-in-out";
        this.partner.PartnerTranslateGroup.style.transform =
            (this.partner.PartnerTranslateGroup.style.transform || "") + ` translateX(${dx}px)`;
        await wait(450);
        await this.dust.puff({ amount: this.params.dustPerPuff, waitForRefill: true });
        await this.partner.return_to_start();
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

        // Return actors
        if (this.partner.is_present) {
            await this.partner.return_to_start();
        }
        let fen = getSVGInternalCenter(this.basics.Fennimal);
        let restOffset = p.fennimalRestOffsetX != null ? p.fennimalRestOffsetX : -150;
        let leftX = Math.max(120, this.boxCenter.x + restOffset);
        await this.basics.Fennimal_move_relative(leftX - fen.x, 0, 400);
        this.fenHome = getSVGInternalCenter(this.basics.Fennimal);

        // Glow + confetti + encoding statement
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

        Interface.Prompt.show_message(
            "This clean " + this.box.boxname + " belongs to " + this.FenObj.name + "!"
        );
        await wait(p.encodingPauseMs);
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
        Interface.Prompt.show_message(
            "Hand the clean " + this.box.boxname + " to " + this.FenObj.name + "."
        );
        AudioCont.play_sound_effect("alert_minor");

        // Pulse Fennimal as drop target
        this.basics.Fennimal.style.transition = "filter 400ms ease-in-out";
        this.basics.Fennimal.style.filter = "drop-shadow(0px 0px 14px gold)";

        let fenTarget = this.basics.TargetPoints.Fennimal_body_center || this.basics.Fennimal;

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
                    onMiss: () => {
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

        // Brief paired tableau, then use the extended celebration before the end photo.
        await wait(500);
        await this.basics.perform_success_celebration(null, { extended: true });
        await wait(400);

        await this.run_end_photo();

        Interface.Prompt.show_message(this.FenObj.name + " has wandered off...");
        fen = getSVGInternalCenter(this.basics.Fennimal);
        await this.basics.Fennimal_move_relative(-(fen.x + 300), 0, 750);
        await wait(500);
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

    create_joint_cleaning_polaroid_contents(groupScale, targetCircle) {
        let template = document.getElementById("toybox_" + this.FenObj.toybox);
        if (!template) return null;

        let contents = create_SVG_group(0, 0);
        groupScale.appendChild(contents);

        // Slight downward bias so the Fennimal+box pair sits in the visual center of the frame.
        let pairCy = targetCircle.y + 35;

        // Fennimal behind the box — larger so the pair fills more of the frame.
        let fenIcon = create_Fennimal_SVG_object(this.FenObj, 0.55, false);
        fenIcon.querySelectorAll(".prep_element_hidden").forEach((el) => el.remove());
        fenIcon.style.display = "inherit";
        // Neutral / frozen pose in the polaroid (no breathing, gaze, or body flair).
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
        let bgRect = groupScale.getElementsByTagName("rect")[0];
        let frameBox = bgRect ? bgRect.getBBox() : { width: 500, height: 600 };
        let fenScale = Math.min(
            (frameBox.width * 0.88) / Math.max(fenBox.width, 1),
            (frameBox.height * 0.78) / Math.max(fenBox.height, 1)
        );
        let fenCx = fenBox.x + fenBox.width / 2;
        let fenCy = fenBox.y + fenBox.height / 2;
        // Keep scale-group identity; place via outer transform only.
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
        let scaleFactorW = frameBox.width / Math.max(rawBox.width, 1);
        let scaleFactorH = (0.62 * frameBox.height) / Math.max(rawBox.height, 1);
        let minScale = Math.min(scaleFactorW, scaleFactorH) * 0.82;
        let scaleGroup = boxIcon.getElementsByClassName("scale_group")[0];
        if (scaleGroup) {
            scaleGroup.style.transform = `scale(${minScale})`;
        }

        return contents;
    }

    async run_end_photo() {
        await this.pose_fennimal_behind_box_for_photo();

        this.photoSession = new PhotoTrialController(
            this.FenObj,
            this.partner.is_present,
            () => {},
            "toybox"
        );
        // Reuse the live scene (do not rebuild basics/box/partner).
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
        this.dirt.clean_up();
        this.dust.clean_up();
        this.foliage.clean_up();
        if (this.ShearsGroup) this.ShearsGroup.remove();
        this.box.clean_up();
        this.basics.clean_up();
        if (this.partner.PartnerBaseGroup) this.partner.PartnerBaseGroup.remove();
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

            case "photo_box":
                return new PhotoTrialController(FenObj, partner_is_present, returnfunc, "toybox");

            case "feed_Fennimal":
                return new FeedFennimalTrialController(FenObj, partner_is_present, returnfunc);

            case "joint_box_cleaning":
                return new JointBoxCleaningTrialController(FenObj, partner_is_present, returnfunc);

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
            back: getIcon("back"),
            left: getIcon("left"),
            right: getIcon("right")
        };

        this.questions = this._normalizeQuestions(TaskObj.questions || []);
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
                    "Options are auto-built as belief / reality / cyclic lure from WorldState."
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

    /**
     * Box-code cycle used for the lure: lure for box i = partner belief of the next box.
     * Defaults to unique target_box codes in questions[] order (e.g. A→B→C→A).
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
            console.error(
                "PartnerBeliefIndividualBoxes: lure cycle needs at least 2 boxes " +
                "(provide lure_cycle or at least two distinct target_box values in questions[])."
            );
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

        return queue;
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
     * Build the fixed 3AFC triad for a target box:
     *   belief trial:  target belief (old), target reality (new), next-box belief (old lure)
     *   reality trial: target belief (old), target reality (new), next-box reality (new lure)
     * The lure source follows lureCycle (A→B→C→A by default).
     * Fails loud if any piece is missing or the three toys are not distinct.
     */
    _buildBeliefRealityCyclicTriad(trial, trialKind) {
        if (!this.lureCycle || this.lureCycle.codes.length < 2) {
            console.error("PartnerBeliefIndividualBoxes: lure cycle is not configured.");
            return null;
        }

        let cycleIndex = this.lureCycle.codes.indexOf(trial.target_box_code);
        if (cycleIndex < 0) {
            console.error(
                `PartnerBeliefIndividualBoxes: target_box "${trial.target_box_code}" is not in the lure cycle ` +
                `[${this.lureCycle.codes.join(", ")}].`
            );
            return null;
        }

        let lureIndex = (cycleIndex + 1) % this.lureCycle.codes.length;
        let lure_source_box_code = this.lureCycle.codes[lureIndex];
        let lure_source_box = this.lureCycle.boxes[lureIndex];

        if (trialKind !== "belief" && trialKind !== "reality") {
            console.error(`PartnerBeliefIndividualBoxes: unsupported triad trial kind "${trialKind}".`);
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
            console.error(
                `PartnerBeliefIndividualBoxes: missing partner belief for target box "${trial.target_box}" ` +
                `(question "${trial.question_id}").`
            );
            return null;
        }
        if (reality === undefined) {
            console.error(
                `PartnerBeliefIndividualBoxes: missing current contents for target box "${trial.target_box}" ` +
                `(question "${trial.question_id}").`
            );
            return null;
        }
        if (lure === undefined) {
            console.error(
                `PartnerBeliefIndividualBoxes: missing ${lure_source_type} for lure-source box "${lure_source_box}" ` +
                `(code "${lure_source_box_code}", question "${trial.question_id}").`
            );
            return null;
        }
        if (belief === reality || belief === lure || reality === lure) {
            console.error(
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

        this.BlackOverlay = create_SVG_rect(0, 0, this.W, this.H);
        this.BlackOverlay.setAttribute("fill", "black");
        this.BlackOverlay.style.opacity = 1;
        this.BlackOverlay.style.pointerEvents = "none";
        this.ItemLayers.Plus2.appendChild(this.BlackOverlay);

        for (let i = 0; i < this.trialQueue.length; i++) {
            this.overall_presentation_index = i + 1;
            await this.run_trial(this.trialQueue[i]);
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
        Array.from(BoxObj.getElementsByClassName("alignment_field")).forEach(t => t.remove());
        BoxObj.style.opacity = 0;
        BoxObj.style.pointerEvents = "none";
        this.BoxElement = BoxObj;
        return BoxObj;
    }

    create_curtain_with_reveal_circle() {
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
        circle.style.cursor = "pointer";
        this.CurtainGroup.appendChild(circle);
        this.RevealCircle = circle;

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
     * mode: "toys" | "features"
     */
    show_radial_options_and_wait(options, { mode = "toys", showBox = false, showCentralTarget = false } = {}) {
        return new Promise(resolve => {
            let n = options.length;
            let baseAngle = Math.random() * Math.PI * 2;
            let layout = [];

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
        } else if (trial.trial_kind === "belief") {
            await this.run_belief_trial(trial);
        } else if (trial.trial_kind === "reality") {
            await this.run_reality_trial(trial);
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

    async run_belief_trial(trial) {
        let triad = this._buildBeliefRealityCyclicTriad(trial, "belief");
        if (!triad) {
            console.error(`PartnerBeliefIndividualBoxes: skipping belief trial "${trial.question_id}" due to invalid triad.`);
            await this.fade_black(0, 200);
            return;
        }

        this.place_target_box(trial.target_box);
        let revealPromise = this.create_curtain_with_reveal_circle();

        await this.setup_partner_at_offscreen();
        await this.fade_black(0, 350);
        await this.animate_partner_enter_and_face_box();

        let printed_box_name = GenParam.get_box_printed_name(trial.target_box);
        Interface.Prompt.show_message("Click on the circle to start the question");
        await revealPromise;

        Interface.Prompt.show_message(
            `What does ${this.partnername} believe is in the ${printed_box_name}? Answer as quickly and accurately as you can.`
        );

        let response = await this.show_radial_options_and_wait(triad.answer_options, {
            mode: "toys",
            showBox: true
        });

        Interface.Prompt.hide();
        AudioCont.play_sound_effect("button_click");

        let is_correct = (response.selected_id === triad.belief_answer);

        this.ParticipantAnswers.push({
            trial_kind: "belief",
            question_id: trial.question_id,
            block_index: trial.block_index,
            trial_index: this.overall_presentation_index,
            target_box: trial.target_box,
            options: this._buildStoredOptions(
                response.option_layout,
                triad.answer_options.map((toyId) => ({
                    id: toyId,
                    role: triad.option_roles[toyId] || "unknown"
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
        let triad = this._buildBeliefRealityCyclicTriad(trial, "reality");
        if (!triad) {
            console.error(`PartnerBeliefIndividualBoxes: skipping reality trial "${trial.question_id}" due to invalid triad.`);
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
            `Which toy is currently in the ${printed_box_name}? Answer as quickly and accurately as you can.`
        );

        let response = await this.show_radial_options_and_wait(triad.answer_options, {
            mode: "toys",
            showBox: true
        });

        Interface.Prompt.hide();
        AudioCont.play_sound_effect("button_click");

        let is_correct = (response.selected_id === triad.reality_answer);

        this.ParticipantAnswers.push({
            trial_kind: "reality",
            question_id: trial.question_id,
            block_index: trial.block_index,
            trial_index: this.overall_presentation_index,
            target_box: trial.target_box,
            options: this._buildStoredOptions(
                response.option_layout,
                triad.answer_options.map((toyId) => ({
                    id: toyId,
                    role: triad.option_roles[toyId] || "unknown"
                }))
            ),
            selected: response.selected_id,
            correct: is_correct,
            reaction_time_ms: response.reaction_time_ms
        });

        await wait(400);
    }

    async finish_task() {
        await this.fade_black(1, 400);
        this.TaskObj.PartnerBeliefAnswers = this.ParticipantAnswers;
        this.returnfunc();
    }

    clean_up() {
        if (this.bubble_float_interval) clearInterval(this.bubble_float_interval);
        if (this.ItemLayers) {
            Object.values(this.ItemLayers).forEach(layer => {
                if (layer && layer.parentNode) layer.remove();
            });
        }
        Interface.Prompt.hide();
    }
}
