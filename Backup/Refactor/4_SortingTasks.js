// --- HELPER FUNCTIONS ---
function alignSVGElementToTarget(element, targetCx, targetCy, maxW, maxH, anchorMode = "center") {
    let retryCount = 0;

    const align = () => {
        // Clear any old alignment transforms before measuring
        element.removeAttribute("transform");
        element.style.transform = "";

        let box = element.getBBox();

        // If the browser has actually rendered the SVG and given it dimensions...
        if (box.width > 0 && box.height > 0) {
            let scale = Math.min(maxW / box.width, maxH / box.height);
            let boxCx = box.x + box.width / 2;
            let boxCy = box.y + box.height / 2;

            // Visual Weight Adjustments
            if (anchorMode === "toy") {
                scale *= 1.1;
            } else if (anchorMode === "toybox") {
                scale *= 1.4;
            } else if (anchorMode === "head") {
                scale *= 0.9;
            } else if (anchorMode === "bottom_edge") {
                // Ignore internal 0,0 and anchor the absolute lowest measured pixel
                boxCy = box.y + box.height;
            }

            element.setAttribute("transform", `translate(${targetCx}, ${targetCy}) scale(${scale}) translate(${-boxCx}, ${-boxCy})`);
        }
        // Wait 50ms for the browser to paint if BBox is 0x0
        else if (retryCount < 10) {
            retryCount++;
            setTimeout(align, 50);
        }
    };

    align();
}

function cleanSVGElements(element) {
    if (!element) return;
    // Physically destroy debris from the DOM so it doesn't inflate the BBox measurements
    element.querySelectorAll('.prep_element_hidden').forEach(el => {
        el.remove();
    });
}


// --- MAIN CONTROLLER ---
class FennimalAttributeSortingTask {
    constructor(parentElem, titleElem, fennimalObjectArray, attributesArr, maxEarnableStars, instructionsCont, returnFunc) {
        this.parentElem = parentElem;
        this.titleElem = titleElem;
        this.fennimalObjectArray = fennimalObjectArray;

        // Defensive mapping: seamlessly translate legacy "head" requests to our new "Fennimal" logic
        this.attributesArr = (attributesArr || ["Fennimal"]).map(a => a === "head" ? "Fennimal" : a);

        this.maxEarnableStars = maxEarnableStars || 0;
        this.currentStars = this.maxEarnableStars;

        this.instructionsCont = instructionsCont;
        this.returnFunc = returnFunc;

        this.errorsMade = [];
        this.currentAttributeIndex = 0;
        this.correctlyPlacedCardsThisStep = 0;

        this.targetBoxes = [];
        this.cardsInReservoir = [];
        this.activeCard = null;

        this.init();
    }

    init() {
        // 1. Setup a SINGLE Full-Screen Foreign Object to prevent all clipping
        this.mainForeign = create_SVG_foreignElement(0, 0, GenParam.SVG_width, GenParam.SVG_height);
        this.parentElem.appendChild(this.mainForeign);

        this.mainDiv = document.createElement("div");
        this.mainDiv.style.width = "100%";
        this.mainDiv.style.height = "100%";
        this.mainDiv.style.position = "relative";
        this.mainForeign.appendChild(this.mainDiv);

        // 2. Setup the Reservoir (Flexbox guarantees perfect alignment and snap-backs)
        this.reservoirDiv = document.createElement("div");
        this.reservoirDiv.style.position = "absolute";
        this.reservoirDiv.style.top = "12%";
        this.reservoirDiv.style.left = "10%";
        this.reservoirDiv.style.width = "80%";
        this.reservoirDiv.style.height = "18%";
        this.reservoirDiv.style.display = "flex";
        this.reservoirDiv.style.justifyContent = "center";
        this.reservoirDiv.style.alignItems = "center";
        this.reservoirDiv.style.gap = "30px";
        this.mainDiv.appendChild(this.reservoirDiv);

        // 3. Setup the Targets (Multi-Row Support Added)
        this.targetDiv = document.createElement("div");
        this.targetDiv.style.position = "absolute";
        this.targetDiv.style.top = "32%";
        this.targetDiv.style.left = "5%";
        this.targetDiv.style.width = "90%";
        this.targetDiv.style.height = "60%";
        this.targetDiv.style.display = "flex";
        this.targetDiv.style.flexWrap = "wrap";
        this.targetDiv.style.justifyContent = "center";
        this.targetDiv.style.alignContent = "flex-start";
        this.targetDiv.style.gap = "20px";
        this.mainDiv.appendChild(this.targetDiv);

        // Build the Scene Boxes
        this.fennimalObjectArray.forEach((fenObj) => {
            this.targetBoxes.push(new FennimalSortingTargetSceneBox(this.targetDiv, fenObj, this.attributesArr, this.fennimalObjectArray.length));
        });

        // 4. UI: Star Counter
        if (this.maxEarnableStars > 0) {
            this.starDiv = document.createElement("div");
            this.starDiv.style.position = "absolute";
            this.starDiv.style.top = "3%";
            this.starDiv.style.right = "5%";
            this.starDiv.style.fontSize = "80px";
            this.starDiv.style.fontWeight = "bold";
            this.starDiv.style.color = "darkgoldenrod";
            this.mainDiv.appendChild(this.starDiv);
            this.updateStarUI();
        }

        // 5. Bind Global Drag Handlers safely
        this.pointerMoveHandler = (e) => this.onPointerMove(e);
        this.pointerUpHandler = (e) => this.onPointerUp(e);
        document.addEventListener("pointermove", this.pointerMoveHandler);
        document.addEventListener("pointerup", this.pointerUpHandler);

        this.startNextAttribute();
    }

    updateStarUI() {
        if (this.starDiv) this.starDiv.innerHTML = `⭐ x ${this.currentStars}`;
    }

    startNextAttribute() {
        if (this.currentAttributeIndex >= this.attributesArr.length) {
            return this.triggerCompletionSequence();
        }

        let attr = this.attributesArr[this.currentAttributeIndex];
        let printedAttr = attr === "Fennimal" ? "Fennimal face" : attr;
        this.titleElem.innerHTML = `Match the ${printedAttr} to the correct Fennimal!`;

        this.correctlyPlacedCardsThisStep = 0;
        this.cardsInReservoir = [];

        // Unlock all boxes for this new step
        this.targetBoxes.forEach(box => box.satisfiedThisStep = false);

        let fensToSpawn = shuffleArray([...this.fennimalObjectArray]);
        fensToSpawn.forEach((fenObj, index) => {
            let card = new FennimalSortingCard(this.reservoirDiv, this.mainDiv, fenObj, attr, index, (c, e) => this.onGrab(c, e));
            this.cardsInReservoir.push(card);
        });
    }

    triggerCompletionSequence() {
        // 1. Update Title and Play Sound
        this.titleElem.innerHTML = "Well done! You have completed the sorting task.";
        AudioCont.play_sound_effect("positive");

        // 2. Play a staggered "Wave" animation on all completed boxes
        this.targetBoxes.forEach((box, index) => {
            setTimeout(() => {
                box.boxDiv.style.transition = "all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)";
                box.boxDiv.style.transform = "translateY(-20px) scale(1.05)";
                box.boxDiv.style.borderColor = "gold";
                box.boxDiv.style.boxShadow = "0px 20px 40px rgba(255, 215, 0, 0.6)";
                box.boxDiv.style.zIndex = "100";

                setTimeout(() => {
                    box.boxDiv.style.transform = "translateY(0) scale(1)";
                    box.boxDiv.style.borderColor = "#B0BEC5";
                    box.boxDiv.style.boxShadow = "0px 10px 20px rgba(0,0,0,0.15)";
                    box.boxDiv.style.zIndex = "1";
                }, 400);
            }, index * 150);
        });

        // 3. Repurpose the empty reservoir space for the native SVG Continue Button!
        this.reservoirDiv.innerHTML = "";

        let btnWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        btnWrapper.style.width = "400px";
        btnWrapper.style.height = "100px";
        btnWrapper.style.overflow = "visible";

        let continueBtn = create_SVG_buttonElement(200, 50, 400, 75, "Continue", 40);
        btnWrapper.appendChild(continueBtn);

        btnWrapper.style.opacity = "0";
        btnWrapper.style.transform = "scale(0)";
        btnWrapper.style.transition = "all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)";
        btnWrapper.style.cursor = "pointer";

        this.reservoirDiv.appendChild(btnWrapper);

        setTimeout(() => {
            btnWrapper.style.opacity = "1";
            btnWrapper.style.transform = "scale(1)";
        }, 100 + (this.targetBoxes.length * 150));

        continueBtn.onpointerdown = () => {
            AudioCont.play_sound_effect("button_click");
            this.finishTask();
        };
    }

    onGrab(card, e) {
        AudioCont.play_sound_effect("button_click");
        this.activeCard = card;

        this.mainDiv.appendChild(this.activeCard.cardDiv);
        this.onPointerMove(e);
    }

    onPointerMove(e) {
        if (this.activeCard) {
            let svgPos = getMousePosition(e);
            this.activeCard.moveTo(svgPos.x, svgPos.y);
        }
    }

    onPointerUp(e) {
        if (this.activeCard) {
            let droppedOnBox = null;

            for (let box of this.targetBoxes) {
                if (box.checkCollision(e.clientX, e.clientY)) {
                    droppedOnBox = box;
                    break;
                }
            }

            if (droppedOnBox) {
                // THE LOGIC FIX: Check feature parity, not instance parity!
                // We map "Fennimal" to "head" since the object property is .head
                let attrKey = this.activeCard.attribute === "Fennimal" ? "head" : this.activeCard.attribute;

                let isMatch = droppedOnBox.fenObj[attrKey] === this.activeCard.fenObj[attrKey];

                // Check if it's a match AND the box hasn't already received a correct card this round
                if (isMatch && !droppedOnBox.satisfiedThisStep) {

                    // Lock the box so it can't eat duplicate cards
                    droppedOnBox.satisfiedThisStep = true;

                    AudioCont.play_sound_effect("success");
                    droppedOnBox.acceptAttribute(this.activeCard.attribute);
                    this.activeCard.destroy();
                    this.activeCard = null;
                    this.correctlyPlacedCardsThisStep++;

                    if (this.correctlyPlacedCardsThisStep === this.fennimalObjectArray.length) {
                        setTimeout(() => {
                            this.currentAttributeIndex++;
                            this.startNextAttribute();
                        }, 1000);
                    }
                } else {
                    // INCORRECT (or trying to double-dip an already full box)
                    AudioCont.play_sound_effect("rejected");
                    this.errorsMade.push({ expected: droppedOnBox.fenObj.id, dropped: this.activeCard.fenObj.id, attribute: this.activeCard.attribute });

                    if (this.currentStars > 0) {
                        this.currentStars--;
                        this.updateStarUI();
                    }

                    this.activeCard.returnToReservoir();
                    this.activeCard = null;
                }
            } else {
                // DROPPED IN EMPTY SPACE
                this.activeCard.returnToReservoir();
                this.activeCard = null;
            }
        }
    }

    finishTask() {
        document.removeEventListener("pointermove", this.pointerMoveHandler);
        document.removeEventListener("pointerup", this.pointerUpHandler);
        this.mainForeign.remove();
        console.log(this.errorsMade)
        this.returnFunc(this.errorsMade);
    }
}


// --- SCENE BOX CONTROLLER ---
class FennimalSortingTargetSceneBox {
    constructor(parentDiv, fenObj, attributesToAsk, totalBoxes) {
        this.fenObj = fenObj;
        this.attributesToAsk = attributesToAsk;

        // Multi-Row Math
        this.isTwoRows = totalBoxes > 3;
        let columnsPerRow = this.isTwoRows ? Math.ceil(totalBoxes / 2) : totalBoxes;

        // Anti-Double-Dip Lock
        this.satisfiedThisStep = false;

        this.sceneState = {
            bg: !this.attributesToAsk.includes("region") && !this.attributesToAsk.includes("location"),
            fennimal: !this.attributesToAsk.includes("Fennimal"),
            toy: !this.attributesToAsk.includes("toy"),
            toybox: !this.attributesToAsk.includes("toybox")
        };

        this.regionDarkColor = GenParam.RegionData[this.fenObj.region] ? GenParam.RegionData[this.fenObj.region].darker_color : "#4CAF50";

        this.boxDiv = document.createElement("div");
        this.boxDiv.style.width = `calc(${100 / columnsPerRow}% - 20px)`;
        this.boxDiv.style.height = this.isTwoRows ? "48%" : "100%";

        this.boxDiv.style.border = "6px solid #B0BEC5";
        this.boxDiv.style.borderRadius = "20px";
        this.boxDiv.style.background = "#FFFFFFBB";
        this.boxDiv.style.boxShadow = "0px 10px 20px rgba(0,0,0,0.15)";
        this.boxDiv.style.display = "flex";
        this.boxDiv.style.flexDirection = "column";
        this.boxDiv.style.overflow = "hidden";
        this.boxDiv.style.boxSizing = "border-box";
        this.boxDiv.style.transition = "border 200ms";

        // Anchor: Responsive Fennimal Name Banner
        this.nameBanner = document.createElement("div");
        this.nameBanner.innerHTML = fenObj.name;
        this.nameBanner.style.width = "100%";
        this.nameBanner.style.padding = this.isTwoRows ? "10px 0" : "15px 0";
        this.nameBanner.style.fontSize = this.isTwoRows ? "30px" : "40px";
        this.nameBanner.style.textAlign = "center";
        this.nameBanner.style.color = "white";
        this.nameBanner.style.fontWeight = "bold";
        this.nameBanner.style.zIndex = 10;
        this.nameBanner.style.background = "#37474F";
        this.nameBanner.style.transition = "background 300ms ease";
        this.boxDiv.appendChild(this.nameBanner);

        // The Scene Canvas
        this.sceneSvg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        this.sceneSvg.style.width = "100%";
        this.sceneSvg.style.height = "100%";
        this.boxDiv.appendChild(this.sceneSvg);

        parentDiv.appendChild(this.boxDiv);
        this.buildSceneElements();
        this.updateSceneVisuals();
    }

    buildSceneElements() {
        // 1. Background Image
        this.bgImage = document.createElementNS("http://www.w3.org/2000/svg", 'image');
        let locName = this.fenObj.location ? this.fenObj.location.toLowerCase() : "lake";
        let regName = this.fenObj.region ? capitalize_first_letter_in_string(this.fenObj.region) : "North";
        this.bgImage.setAttribute("href", `./Locations/${regName}_${locName}.png`);
        this.bgImage.setAttribute("width", "100%");
        this.bgImage.setAttribute("height", "100%");
        this.bgImage.setAttribute("preserveAspectRatio", "xMidYMid slice");
        this.sceneSvg.appendChild(this.bgImage);

        // 2. Background Mask (Bumped up to 0.75 for better brightness/contrast)
        this.bgMask = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        this.bgMask.setAttribute("width", "100%");
        this.bgMask.setAttribute("height", "100%");
        this.bgMask.setAttribute("fill", "white");
        this.bgMask.setAttribute("opacity", "0.75");
        this.sceneSvg.appendChild(this.bgMask);

        // 3. Fennimal (Left Side)
        this.fennimalGroup = create_SVG_group(0, 0);
        let fenIcon = create_Fennimal_SVG_object(this.fenObj, 0.5, false);
        apply_Fennimal_animation_pivots(fenIcon);
        cleanSVGElements(fenIcon);
        this.fennimalGroup.appendChild(fenIcon);
        this.sceneSvg.appendChild(this.fennimalGroup);

        // 4. Toybox (Bottom Right Quadrant)
        this.toyboxGroup = create_SVG_group(0, 0);
        let toyboxSource = document.getElementById("toybox_" + this.fenObj.toybox) || document.getElementById(this.fenObj.toybox);
        if (toyboxSource) {
            let tboxClone = toyboxSource.cloneNode(true);
            tboxClone.style.display = "inherit";
            cleanSVGElements(tboxClone);
            this.toyboxGroup.appendChild(tboxClone);
        }
        this.sceneSvg.appendChild(this.toyboxGroup);

        // 5. Toy (Top Right Quadrant)
        this.toyGroup = create_SVG_group(0, 0);
        let cleanToyId = this.fenObj.toy ? this.fenObj.toy.replace("toy_", "") : null;
        let toySource = document.getElementById("toy_" + cleanToyId) || document.getElementById(cleanToyId);
        if (toySource) {
            let toyClone = toySource.cloneNode(true);
            toyClone.style.display = "inherit";
            set_toy_color_scheme(toyClone, cleanToyId, false);
            cleanSVGElements(toyClone);
            this.toyGroup.appendChild(toyClone);
        }
        this.sceneSvg.appendChild(this.toyGroup);

        setTimeout(() => this.alignElementsInQuadrants(), 50);
    }

    alignElementsInQuadrants() {
        let boxRect = this.sceneSvg.getBoundingClientRect();
        let w = boxRect.width;
        let h = boxRect.height;

        if (w === 0 || h === 0) {
            setTimeout(() => this.alignElementsInQuadrants(), 50);
            return;
        }

        if (this.sceneState.fennimal) {
            // THE SCALING FIX: If two rows, anchor to 100% of the box bottom and allow full 100% height!
            let targetY = this.isTwoRows ? h * 1.0 : h * 0.85;
            let maxH = this.isTwoRows ? h * 1.0 : h * 0.85;
            let maxW = this.isTwoRows ? w * 0.50 : w * 0.45;

            alignSVGElementToTarget(this.fennimalGroup, w * 0.25, targetY, maxW, maxH, "bottom_edge");
        }
        if (this.sceneState.toy) {
            alignSVGElementToTarget(this.toyGroup, w * 0.75, h * 0.30, w * 0.40, h * 0.40, "toy");
        }
        if (this.sceneState.toybox) {
            alignSVGElementToTarget(this.toyboxGroup, w * 0.75, h * 0.75, w * 0.40, h * 0.40, "toybox");
        }
    }

    acceptAttribute(attribute) {
        if (attribute === "region" || attribute === "location") this.sceneState.bg = true;
        if (attribute === "Fennimal") this.sceneState.fennimal = true;
        if (attribute === "toy") this.sceneState.toy = true;
        if (attribute === "toybox") this.sceneState.toybox = true;

        this.boxDiv.style.borderColor = "#4CAF50";
        setTimeout(() => { this.boxDiv.style.borderColor = "#B0BEC5"; }, 500);

        this.updateSceneVisuals();
    }

    updateSceneVisuals() {
        this.bgImage.style.display = this.sceneState.bg ? "inherit" : "none";
        this.bgMask.style.display = this.sceneState.bg ? "inherit" : "none";

        this.toyGroup.style.display = this.sceneState.toy ? "inherit" : "none";
        this.toyboxGroup.style.display = this.sceneState.toybox ? "inherit" : "none";
        this.fennimalGroup.style.display = this.sceneState.fennimal ? "inherit" : "none";

        let needsBgToColorize = this.attributesToAsk.includes("region") || this.attributesToAsk.includes("location");

        if (needsBgToColorize && !this.sceneState.bg) {
            this.nameBanner.style.background = "#37474F";
        } else {
            this.nameBanner.style.background = this.regionDarkColor;
        }

        if (this.sceneState.fennimal && needsBgToColorize && !this.sceneState.bg) {
            this.fennimalGroup.style.filter = "grayscale(100%)";
        } else {
            this.fennimalGroup.style.filter = "none";
        }

        this.alignElementsInQuadrants();
    }

    checkCollision(x, y) {
        let rect = this.boxDiv.getBoundingClientRect();
        return (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
    }
}


// --- DRAGGABLE CARD ---
class FennimalSortingCard {
    constructor(reservoirDiv, mainDiv, fenObj, attribute, index, onGrab) {
        this.reservoirDiv = reservoirDiv;
        this.mainDiv = mainDiv;
        this.fenObj = fenObj;
        this.attribute = attribute;
        this.onGrab = onGrab;

        this.width = 150;
        this.height = 150;

        this.cardDiv = document.createElement("div");
        this.cardDiv.style.width = this.width + "px";
        this.cardDiv.style.height = this.height + "px";
        this.cardDiv.style.flexShrink = "0";
        this.cardDiv.style.background = "white";
        this.cardDiv.style.border = "4px solid #37474F";
        this.cardDiv.style.borderRadius = "15px";
        this.cardDiv.style.cursor = "grab";
        this.cardDiv.style.display = "flex";
        this.cardDiv.style.alignItems = "center";
        this.cardDiv.style.justifyContent = "center";
        this.cardDiv.style.boxShadow = "0px 5px 15px rgba(0,0,0,0.25)";
        this.cardDiv.style.overflow = "hidden";

        // THE DEAL ANIMATION
        this.cardDiv.style.position = "relative";
        this.cardDiv.style.zIndex = 10;
        this.cardDiv.style.opacity = "0";
        this.cardDiv.style.transform = "translateY(-150px) scale(0.5) rotate(-10deg)";
        this.cardDiv.style.transition = "all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)";

        this.reservoirDiv.appendChild(this.cardDiv);
        this.renderAttribute();

        // Stagger the pop-in animation using the index
        setTimeout(() => {
            this.cardDiv.style.opacity = "1";
            this.cardDiv.style.transform = "translateY(0) scale(1) rotate(0deg)";

            setTimeout(() => {
                this.cardDiv.style.transition = "none";
            }, 500);
        }, 100 + (index * 120));

        this.cardDiv.onpointerdown = (e) => {
            e.preventDefault();
            this.onGrab(this, e);
        };
    }

    renderAttribute() {
        if (this.attribute === "region" || this.attribute === "location") {
            let color = GenParam.RegionData[this.fenObj.region] ? GenParam.RegionData[this.fenObj.region].darker_color : "#444";
            let displayName = this.attribute === "region"
                ? (GenParam.RegionData[this.fenObj.region] ? GenParam.RegionData[this.fenObj.region].display_name : this.fenObj.region)
                : (this.fenObj.location);

            this.cardDiv.style.background = color;
            this.cardDiv.innerHTML = `<span style="font-size:32px; font-weight:bold; color:white; text-align:center;">${displayName}</span>`;
        }
        else if (this.attribute === "toy" || this.attribute === "toybox" || this.attribute === "Fennimal") {
            let svgElem = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
            svgElem.style.width = "100%";
            svgElem.style.height = "100%";
            this.cardDiv.appendChild(svgElem);

            let sourceElem, clone;

            // Create alignment wrapper group
            let alignGroup = create_SVG_group(0, 0);
            svgElem.appendChild(alignGroup);

            let mode = "center";

            if (this.attribute === "toy") {
                let cleanId = this.fenObj.toy.replace("toy_", "");
                sourceElem = document.getElementById("toy_" + cleanId) || document.getElementById(cleanId);
                if (sourceElem) {
                    clone = sourceElem.cloneNode(true);
                    set_toy_color_scheme(clone, cleanId, false);
                    mode = "toy";
                }
            } else if (this.attribute === "toybox") {
                let cleanId = this.fenObj.toybox.replace("toybox_", "");
                sourceElem = document.getElementById("toybox_" + cleanId) || document.getElementById(cleanId);
                if (sourceElem) {
                    clone = sourceElem.cloneNode(true);
                    mode = "toybox";
                }
            } else if (this.attribute === "Fennimal") {
                clone = create_Fennimal_SVG_object_head_only(this.fenObj, false);
                svgElem.style.filter = "grayscale(100%) brightness(1.2)";
                mode = "head";
            }

            if (clone) {
                clone.style.display = "inherit";
                cleanSVGElements(clone);
                alignGroup.appendChild(clone);

                setTimeout(() => {
                    alignSVGElementToTarget(alignGroup, this.width / 2, this.height / 2, this.width * 0.9, this.height * 0.9, mode);
                }, 50);
            } else {
                this.cardDiv.innerHTML = `<span style="color:gray;">Missing</span>`;
            }
        }
    }

    moveTo(x, y) {
        this.cardDiv.style.position = "absolute";
        this.cardDiv.style.left = (x - (this.width / 2)) + "px";
        this.cardDiv.style.top = (y - (this.height / 2)) + "px";
        this.cardDiv.style.zIndex = 1000;
        this.cardDiv.style.transform = "scale(1.15)";
        this.cardDiv.style.cursor = "grabbing";
        this.cardDiv.style.boxShadow = "0px 15px 30px rgba(0,0,0,0.3)";
    }

    returnToReservoir(animated = true) {
        this.cardDiv.style.position = "relative";
        this.cardDiv.style.left = "0";
        this.cardDiv.style.top = "0";
        this.cardDiv.style.zIndex = 10;
        this.cardDiv.style.transform = "scale(1)";
        this.cardDiv.style.cursor = "grab";
        this.cardDiv.style.boxShadow = "0px 5px 15px rgba(0,0,0,0.25)";

        this.reservoirDiv.appendChild(this.cardDiv);
    }

    destroy() {
        this.cardDiv.style.transition = "all 200ms ease-in";
        this.cardDiv.style.transform = "scale(0)";
        this.cardDiv.style.opacity = "0";
        setTimeout(() => this.cardDiv.remove(), 200);
    }
}