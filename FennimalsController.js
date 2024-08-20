// Controls the appearance and interactions with all of the Fennimals
console.warn("RUNNING FENNIMALS CONTROLLER")

//Given an item name, generates the feedback hearts and movement until stopped. Includes the prompt on top of the screen
FeedbackController = function(FennimalObject, FennimalSVGContainer, show_icon_on_left){
    //Some shorthand variables
    let item_given = FennimalObject.selected_item
    let fennimal_name = FennimalObject.name
    let ItemObj = document.getElementById("item_" + FennimalObject.selected_item)
    let BasicHTML = ItemObj.innerHTML
    let FeedbackIcon, FeedbackIconBasicHTML, changed_feedback_icon_flag = false, item_classlist_added

    document.getElementById("Feedback_layer").style.display = "inherit"
    let Item = document.getElementById("item_"+item_given)
    let original_transition_style = Item.style.transition
    let animation_interval = false
    let evaluation_time = 800

    //Creates a svg object at the x and y position that moves to the top of the y axis, while fading out. Set animations with css.
    SmallFeedbackSymbol = function(start_x, start_y, feedback_type){
        //Copy the heart svg element
        let FeedbackObj = document.getElementById("feedback_" + feedback_type + "_small")
        let FeedbackLayer = document.getElementById("Feedback_layer")

        let NewObject = FeedbackObj.cloneNode(true)
        FeedbackLayer.appendChild(NewObject)
        NewObject.style.display="none"


        MoveElemToCoords(NewObject, start_x,start_y)
        NewObject.style.opacity = .75

        setTimeout(function(){
            NewObject.style.display = "inherit"
        },10)

        //After a brief waiting period, move upwards
        setTimeout(function(){
            //Select a random movement around the starting xposition to translate to
            let max_deviation = 100
            let random_x = randomIntFromInterval(start_x- max_deviation, start_x + max_deviation)
            MoveElemToCoords(NewObject, random_x,-50)
            NewObject.style.opacity = 0
            switch(feedback_type){
                case("heart"): NewObject.style.fill = "red"; break
                case("bites"): NewObject.style.fill = "gold"; break
                case("frown"): NewObject.style.fill = "red"; break
                case("smile"): NewObject.style.fill = "lightgreen"; NewObject.style.stroke = "lightgreen"; break
            }
        },100)

        //Self-destruct after 5 seconds to prevent cluttering the browser
        setTimeout(function(){
            FeedbackLayer.removeChild(NewObject)
        },5000)

    }

    //Call when leaving an area to clear the intervals
    this.location_left = function(){
        clearInterval(SmallIconGenerator)
        clearInterval(animation_interval)
        Item.style.transition = original_transition_style
        Item.style.display = "none"

        //Clear all remaining hearts
        let Feedback_Symbols = document.getElementsByClassName("feedback_symbol")
        for(let i=0; i<Feedback_Symbols.length ; i++){
            Feedback_Symbols[i].style.display = "none"
        }

        //Item.classList.remove("item_selected_smile")

        //Reset the item opacity
        Item.style.opacity = 1

        //Reset item animation
        reset_item_animation()

        //Make sure that the Fennimal container has an opacity of 1 again
        FennimalSVGContainer.style.opacity = 1

        //Stopping sound effects
        flag_can_play_sound = false
        if(ItemSoundInterval !== false){
            clearInterval(ItemSoundInterval)
            ItemSoundInterval = false
        }
    }

    // CONSTRUCTION //
    //Now we can set an interval to create the hearts and movement
    let SmallIconGenerator = false

    function show_prompt_text(outcome_observed) {
        if (FennimalObject.quiz_trial) {
            //During quiz trials, the text should be slighly different
            if (outcome_observed === "incorrect") {
                Prompt.show_message("Oops! You picked the wrong toy!")
            } else {
                Prompt.show_message("You selected the correct toy!")
            }
        } else {
            switch (outcome_observed) {
                case("heart"):
                    Prompt.show_feedback_message("The " + fennimal_name + " LOVES the " + item_given, "heart")
                    break;
                case("smile"):
                    Prompt.show_feedback_message("The " + fennimal_name + " likes the " + item_given, "smile")
                    break
                case("frown"):
                    Prompt.show_feedback_message("The " + fennimal_name + " does not like the " + item_given, "frown")
                    break;
                case("bites"):
                    Prompt.show_feedback_message("Auch! The " + fennimal_name + " bites you!", "bites")
                    break;
                case("neutral"):
                    Prompt.show_feedback_message("The " + fennimal_name + " feels indifferent about the " + item_given, "neutral")
                    break;
                case("unknown"):
                    Prompt.show_feedback_message("The " + fennimal_name + " takes the toy to its home", "unknown")
                    break;
                case("incorrect"):
                    Prompt.show_feedback_message("Oops! You picked the wrong toy!", "incorrect")
                    break;
                case("correct"):
                    Prompt.show_feedback_message("Yay! You selected the correct toy!", "correct")
                    break
            }
        }
    }

    //ITEM ANIMATIONS //
    function start_item_animation(item, feedback_type){
        let RotationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        let TranslationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        RotationGroup.innerHTML = BasicHTML
        TranslationGroup.appendChild(RotationGroup)
        ItemObj.innerHTML = ""
        ItemObj.appendChild(TranslationGroup)

        //Changing the item colors
        //Change item colors
        item_classlist_added = "item_feedback_"+feedback_type
        Item.classList.add(item_classlist_added)
        //TODO: dissapearing item

        //Now that we have the item name we can assign classes so that the CSS can handle the animations for us
        setTimeout(function(){
            switch (feedback_type){
                case("play"):
                    RotationGroup.classList.add("rotation_" + item)
                    TranslationGroup.classList.add("translation_"+ item)
                    //play_item_sound_effects(item)
                    AudioController.play_sound_effect("positive")
                    break
                case("dislike"):
                    TranslationGroup.classList.add("disliked_translation_item")
                    AudioController.play_sound_effect("rejected")
                    break
                case("neutral"):
                    RotationGroup.classList.add("neutral_rotation_item")
                    break
                case("incorrect"):
                    break
                case("correct"): break
                case("unknown"): TranslationGroup.classList.add("unknown_feedback_item"); break
            }
        },350)
    }

    function show_feedback_icon(feedback_type){
        if (FennimalObject.quiz_trial) {
            //During quiz trials, the text should be slighly different
            if (FennimalObject.outcome_observed === "incorrect") {
                start_feedback_icon_animation("incorrect")
            } else {
                start_feedback_icon_animation("correct")
            }
        } else {
            start_feedback_icon_animation(feedback_type)
        }

    }

    function start_feedback_icon_animation(feedback_type){
        FeedbackIcon = document.getElementById("feedback_"+ feedback_type)

        if(show_icon_on_left || feedback_type === "unknown" || feedback_type === "correct" || feedback_type === "incorrect"){
            let delay_time = 0
            setTimeout(function(){FeedbackIcon.style.display = "inherit"},delay_time)
        }

        //Store basic HTML
        FeedbackIconBasicHTML = FeedbackIcon.innerHTML
        changed_feedback_icon_flag = true

        let RotationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        let TranslationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        RotationGroup.innerHTML = FeedbackIconBasicHTML
        TranslationGroup.appendChild(RotationGroup)
        FeedbackIcon.innerHTML = ""
        FeedbackIcon.appendChild(TranslationGroup)

        switch (feedback_type){
            case("heart"):
                RotationGroup.classList.add("pulse_heart")
                break
            case("smile"):
                break
            case("frown"):
                break
            case("bite"):
                break
            case("neutral"):
                break
            case("incorrect"):
                RotationGroup.classList.add("thumbs_down_rotation")
                TranslationGroup.classList.add("thumbs_down_translation");
                break
            case("correct"):
                RotationGroup.classList.add("thumbs_up_rotation")
                TranslationGroup.classList.add("thumbs_up_translation");break
            case("unknown"):
                TranslationGroup.classList.add("question_mark_appear")
                RotationGroup.classList.add("shake_question_mark")
                break
        }
    }

    function reset_item_animation(){
        ItemObj.innerHTML = BasicHTML
        ItemObj.style.transition = ""
        ItemObj.classList.remove(item_classlist_added)
        if(changed_feedback_icon_flag){
            FeedbackIcon.innerHTML = FeedbackIconBasicHTML
        }
    }

    // A little animation to show the Fennimal evaluating the item
    function evaluate_item(){
        let TranslationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        TranslationGroup.innerHTML = BasicHTML
        ItemObj.innerHTML = ""
        ItemObj.appendChild(TranslationGroup)

        TranslationGroup.classList.add("item_evaluation")
        Prompt.show_message("...")

        setTimeout(function(){
            reset_item_animation()
            show_outcome(FennimalObject.outcome_observed)

        },evaluation_time)



    }

    //Showing the feedback
    function show_outcome(outcome){
        switch(outcome){
            case("heart"):
                start_item_animation(item_given, "play")
                show_feedback_icon("heart")
                setTimeout(function(){
                    SmallIconGenerator = setInterval(function(){
                        let random_x = randomIntFromInterval(-20,20)
                        let random_y = randomIntFromInterval(-20,20)

                        let ItemViewBox = getViewBoxCenterPoint(ItemObj)
                        let BBox = ItemObj.getBoundingClientRect()

                        let NewSymbol = new SmallFeedbackSymbol(ItemViewBox.x + 0.5*BBox.width + random_x + 0, ItemViewBox.y + 0.5*BBox.height + random_y - 30 , "heart")
                    },75)
                },50)

                break;
            case("smile"):
                start_item_animation(item_given, "play");
                show_feedback_icon("smiley")


                setTimeout(function(){
                    SmallIconGenerator = setInterval(function(){
                        let random_x = randomIntFromInterval(-20,20)
                        let random_y = randomIntFromInterval(-20,20)

                        let ItemViewBox = getViewBoxCenterPoint(ItemObj)
                        let BBox = ItemObj.getBoundingClientRect()

                        let NewSymbol = new SmallFeedbackSymbol(ItemViewBox.x + 0.5*BBox.width + random_x + 30, ItemViewBox.y + 0.5*BBox.height + random_y - 60 , "smiley")
                    },150)
                },50)

                break;
            case("frown"):
                start_item_animation(item_given, "dislike")
                show_feedback_icon("frown")

                setTimeout(function(){
                    SmallIconGenerator = setInterval(function(){
                        let random_x = randomIntFromInterval(-20,20)
                        let random_y = randomIntFromInterval(-20,20)

                        let ItemViewBox = getViewBoxCenterPoint(ItemObj)
                        let BBox = ItemObj.getBoundingClientRect()

                        let NewSymbol = new SmallFeedbackSymbol(ItemViewBox.x + 0.5*BBox.width + random_x + -20, ItemViewBox.y -80 + random_y , "frown")
                    },150)
                },50)

                break;
            case("bites"):
                start_item_animation(item_given, "dislike")
                show_feedback_icon("bites")

                setTimeout(function(){
                    SmallIconGenerator = setInterval(function(){
                        let random_x = randomIntFromInterval(50,508)
                        let random_y = randomIntFromInterval(20,263)
                        let NewHeart = new SmallFeedbackSymbol(random_x,random_y, "bites")
                    },75)
                },50)

                break;
            case("neutral"):
                start_item_animation(item_given, "neutral")
                show_feedback_icon("neutral")

                setTimeout(function(){
                    SmallIconGenerator = setInterval(function(){
                        let random_x = randomIntFromInterval(-20,20)
                        let random_y = randomIntFromInterval(-20,20)

                        let ItemViewBox = getViewBoxCenterPoint(ItemObj)
                        let BBox = ItemObj.getBoundingClientRect()

                        let NewSymbol = new SmallFeedbackSymbol(ItemViewBox.x + 0.5*BBox.width + random_x + 30, ItemViewBox.y + 0.5*BBox.height + random_y - 140 , "neutral")
                    },500)
                },50)
                break;

            case("unknown"):
                start_item_animation(item_given, "unknown")
                show_feedback_icon("unknown")
                AudioController.play_sound_effect("mystery")

                FennimalSVGContainer.style.transition = "all 750ms ease-in"

                //Animate the Fennimal and the item disappearing
                setTimeout(function(){
                    FennimalSVGContainer.style.opacity = 0
                },750)

                break;

            case("incorrect"):
                start_item_animation(item_given, "incorrect")
                show_feedback_icon("incorrect")

                break;
            case("correct"):
                start_item_animation(item_given, "correct")
                show_feedback_icon("correct")

                break


        }

        show_prompt_text(outcome)
    }

    function check_if_test_trial_with_hidden_feedback(){
        if(typeof FennimalObject.test_phase_trial !== "undefined"){
            if(typeof FennimalObject.TestPhaseRules !== "undefined"){
                if(FennimalObject.TestPhaseRules.hidden_feedback){
                    return true
                }
            }
        }
        return false
    }

    //SOUND EFFECTS
    let ItemSoundInterval = false, flag_can_play_sound = false
    function play_item_sound_effects(item){
        let animation_duration
        switch (item){
            case("ball"):
                animation_duration = 3000
                flag_can_play_sound = true

                setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("ball_bounce")}}, 0.30 * animation_duration)
                setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("ball_bounce")}}, 0.58 * animation_duration)
                setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("ball_bounce")}}, 0.75 * animation_duration)

                ItemSoundInterval = setInterval(function(){
                    setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("ball_bounce")}}, 0.30 * animation_duration)
                    setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("ball_bounce")}}, 0.58 * animation_duration)
                    setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("ball_bounce")}}, 0.75 * animation_duration)
                }, animation_duration)
                break;
            case("duck"):
                animation_duration = 5000
                flag_can_play_sound = true

                setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("duck_squeeze")}}, 0.50 * animation_duration)
                setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("duck_squeeze")}}, 0.70 * animation_duration)
                setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("duck_squeeze")}}, 0.90 * animation_duration)

                ItemSoundInterval = setInterval(function(){
                    setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("duck_squeeze")}}, 0.40 * animation_duration)
                    setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("duck_squeeze")}}, 0.60 * animation_duration)
                    setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("duck_squeeze")}}, 0.80 * animation_duration)
                }, animation_duration)
                break;
            case("trumpet"):
                animation_duration = 5000
                flag_can_play_sound = true
                setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("trumpet")}}, 0.27 * animation_duration)

                ItemSoundInterval = setInterval(function(){
                    setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("trumpet")}}, 0.27 * animation_duration)

                }, animation_duration)
                break;
            case("car"):
                animation_duration = 10000
                flag_can_play_sound = true

                setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("honk")}}, 0.16 * animation_duration)
                // setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("honk")}}, 0.60 * animation_duration)


                ItemSoundInterval = setInterval(function(){
                    setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("honk")}}, 0.16 * animation_duration)
                    // setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("honk")}}, 0.60 * animation_duration)

                }, animation_duration)
                break;
            case("kite"):
                animation_duration = 10000
                flag_can_play_sound = true

                setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("kite")}}, 0.05 * animation_duration)
                // setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("honk")}}, 0.60 * animation_duration)


                ItemSoundInterval = setInterval(function(){
                    setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("kite")}}, 0.05 * animation_duration)
                    // setTimeout(function(){if(flag_can_play_sound){AudioController.play_sound_effect("honk")}}, 0.60 * animation_duration)

                }, animation_duration)
                break;

        }




    }

    if(check_if_test_trial_with_hidden_feedback()){
        FennimalObject.hidden_outcome_observed = JSON.parse(JSON.stringify(FennimalObject.outcome_observed))
        FennimalObject.outcome_observed = "unknown"
    }

    if( ["heart", "smile", "neutral", "frown", "bites"].includes(FennimalObject.outcome_observed) ){
        evaluate_item()
    }else{
        show_outcome(FennimalObject.outcome_observed)
    }


}

//Handles the flashlight elements. Presents the outline for a given FennimalObject (call with false if no Fennimal is present at this location).
//Creates its own FennimalController
Flashlight_Controller = function(FennimalObj, LocCont){
    let that = this

    //We need the references to the SVG elements of the flashlight
    let FlashlightIcon = document.getElementById("flashlight")
    let FlashlightIcon_symbol = document.getElementById("flashlight_light")
    let FlashlightIcon_box = document.getElementById("flashlight_background")

    let Flashlight_Mask_Black = document.getElementById("spotlight_background_mask_black")
    let Flashlight_Mask_Yellow = document.getElementById("spotlight_background_mask")
    let FlashlightPrompt = document.getElementById("prompt_flashlight")
    let SVG = document.getElementById("SVG_container").childNodes[0]

    //Stores the state of the flashlight. True is on, False is off. Toggle with the correct function.
    let flashlight_state_on = false

    //Creates a radial gradient object, appends it to the SVG and returns a reference
    function createRadialGradient(id, maxopacity, color){
        //Check if the gradient already exists or not
        if(document.getElementById(id) === null){
            let svgns = 'http://www.w3.org/2000/svg';
            let gradient = document.createElementNS(svgns, 'radialGradient');
            gradient.id = id
            gradient.setAttribute('cx', '9999');
            gradient.setAttribute('cy', '9999');
            gradient.setAttribute('r', Param.flashlight_radius);
            gradient.setAttribute("gradientUnits","userSpaceOnUse")
            SVG.childNodes[1].appendChild(gradient)

            //Creating the stops
            let stop1 = document.createElementNS(svgns, 'stop');
            stop1.setAttribute("offset",0)
            stop1.setAttribute("stop-color", color)
            gradient.appendChild(stop1)

            let stop2 =  document.createElementNS(svgns, 'stop');
            stop2.setAttribute("offset",.7)
            stop2.setAttribute("stop-opacity",maxopacity)
            stop2.setAttribute("stop-color", color)
            gradient.appendChild(stop2)

            let stop3 =  document.createElementNS(svgns, 'stop');
            stop3.setAttribute("offset",1)
            stop3.setAttribute("stop-opacity",0)
            gradient.appendChild(stop3)

            return(gradient)
        }else{
            return(document.getElementById(id))
        }

    }

    let SpotlightGradient_FennimalOutline = createRadialGradient("spotlight_gradient",1, "black")
    let SpotlightGradient_Background = createRadialGradient("spotlight_gradient_background",1, "yellow")

    function show_Fennimal_background_mask(){
        document.getElementById("Fennimals_Mask_Layer").style.display = "inherit"
    }

    function hide_Fennimal_background_mask(){
        document.getElementById("Fennimals_Mask_Layer").style.display = "none"
    }

    ///////////////////
    //EVENT HANDLERS //
    ///////////////////
    //Once the flashlight is active, we need to listen for mouseup and mouse leave events all over the documents.
    // Leaving the document or lifting the mouse should trigger the flashlight off (if it is on)
    document.onmouseup = function(){
        if(flashlight_state_on){
            toggleFlashlight(false)
        }
    }
    document.onmouseleave = function(){
        if(flashlight_state_on){
            toggleFlashlight(false)
        }
    }

    //The flashlight should be triggered to active once the icon has been pressed
    FlashlightIcon.onmousedown = function(){
        toggleFlashlight(true)
    }

    //If the mouse moves anywhere on the document AND the flashlight is active, then the gradient of the outline needs to be adjusted
    // (This gives the splotlight effect!)
    document.onmousemove = function(event){
        if(flashlight_state_on){
            //Get the correct mouse position in the SVG coordinates
            let mouse_pos = getMousePosition(event)

            //Keep track of how much the subject has searched across the screen
            amount_dragged++

            //Set the gradients
            changeOutlineGradient(mouse_pos.x,mouse_pos.y)

            if(FennimalObj !== false){
                //Scan if any Targets are in range
                scanForTargets(mouse_pos.x,mouse_pos.y)
            }


        }
    }

    function changeOutlineGradient(mouseX,mouseY){
        //Change the Fennimal outline
        SpotlightGradient_FennimalOutline.setAttribute("cx", mouseX)
        SpotlightGradient_FennimalOutline.setAttribute("cy", mouseY)

        //Change the flashlight background shine
        SpotlightGradient_Background.setAttribute("cx", mouseX)
        SpotlightGradient_Background.setAttribute("cy", mouseY)

    }

    //Show the item bar with the flashlight icon
    function showFlashLightIcon(){
        //Make sure that the item layer is set to visible
        document.getElementById("Item_bar_layer").style.display = "inherit"

        //Make sure that the item bar is displayed
        //document.getElementById("item_bar").style.display = "inherit"

        //Show the Flashlight icon on the item bar
        FlashlightIcon.style.display = "inherit"
    }

    function hideFlashLightIcon(){
        //Hidng the item bar
        document.getElementById("Item_bar_layer").style.display = "none"

        //Hide the Flashlight icon on the item bar
        FlashlightIcon.style.display = "none"
    }

    //New state should be a bool. True for on, false for off.
    function toggleFlashlight(new_state){
        //Change the icon color
        if(new_state){
            FlashlightIcon_box.style.fill = "#2c5aa0"
            FlashlightIcon_symbol.style.fill =  "#ffff00"
            FlashlightIcon_box.classList.remove("shimmered_object")
            FlashlightPrompt.style.opacity = 0

        }else{
            FlashlightIcon_box.style.fill = "#b3b3b3"
            FlashlightIcon_symbol.style.fill = "black"
            FlashlightIcon_box.classList.add("shimmered_object")
            FlashlightPrompt.style.opacity = 1
        }

        //Set the correct state
        flashlight_state_on = new_state

        //Hide or show the outline
        if(new_state){
            if(FennimalObj !== false){
                Container.style.display = "inherit"
            }
        }else{
            if(FennimalObj !== false){
                Container.style.display = "none"
            }
        }

        //Set the masks (make the background darker, and show the spotlight yellow) and set the correct gradients
        if(new_state){
            Flashlight_Mask_Black.style.display = "inherit"
            Flashlight_Mask_Yellow.style.display = "inherit"
            document.getElementById("Fennimal_outlines_spotlight_background").style.display = "inherit"

        }else{
            Flashlight_Mask_Black.style.display = "none"
            Flashlight_Mask_Yellow.style.display = "none"
            document.getElementById("Fennimal_outlines_spotlight_background").style.display = "none"

            //Reset the gradients
            SpotlightGradient_FennimalOutline.setAttribute("cx", 9999)
            SpotlightGradient_FennimalOutline.setAttribute("cy", 9999)
            SpotlightGradient_Background.setAttribute("cx", 9999)
            SpotlightGradient_Background.setAttribute("cy", 9999)
        }
    }

    /////////////
    // TARGETS //
    /////////////
    //Returns an array of targets associated to the Fennimal. Each target has
    function createTargets(List_of_Elem){
        //Get all target circles from the SVG
        let TargetCircles = List_of_Elem
        let arr = []

        for(let i=0;i<TargetCircles.length;i++){
            let x = TargetCircles[i].getAttribute("cx")
            let y = TargetCircles[i].getAttribute("cy")
            arr.push(new Target(x,y, Param.flashlight_target_sensitivity))
        }
        return arr
    }

    Target = function(x,y, minimum_dist){
        this.has_been_found = false

        this.checkIfFound = function(mouseX,mouseY){
            if(!this.has_been_found){
                //Get the distance between the target and the mouse.
                let dist = EUDist(x,y, mouseX, mouseY)

                //If this distance is smaller than the threshold determined by Param, then this target has been found
                if(dist <= minimum_dist){
                    this.has_been_found = true

                }
            }
        }
    }

    //Call to check if the cursors is sufficiently close to any of the targets.
    function scanForTargets(mouseX,mouseY){
        for(let i=0;i<Targets.length;i++){
            Targets[i].checkIfFound(mouseX,mouseY)
        }

        //Check if all the targets have been found, if yes, call the proper function.
        if(checkIfAllTargetsFound()){
            AllTargetsFound()
        }
    }

    //Call to check how many Targets have not been found yet. Returns true if all targets have been found
    function checkIfAllTargetsFound(){
        let remainingTargets = 0
        for(let i=0;i<Targets.length;i++){
            if(! Targets[i].has_been_found){
                return false
            }
        }
        return true

    }

    //Call when all Targets have been found. This concludes the spotlight portion of the trial
    function AllTargetsFound(){
        //Turn off the flashlight
        toggleFlashlight(false)

        //Hide the items bar
        FlashlightPrompt.style.display = "none"

        //Mellow the background
        show_Fennimal_background_mask()

        //Hide the item bar
        FlashlightIcon.style.display = "none"

        //For a short period, show the entire outline
        Container.style.display = "none"
        Container.style.opacity = 0
        Container.style.transition = "all 500ms ease-out"

        setTimeout(function(){
            Container.style.display = "inherit"
            HeadObject.style.stroke = "black"
            HeadObject.style.fill = "black"
            BodyObject.style.stroke = "black"
            BodyObject.style.fill = "black"

        }, 5)

        //Fade the outline in
        setTimeout(function(){
            Container.style.opacity = 1
        },100)

        //After a brief delay, fade the outline out and continue with the remaining portion of the trial
        setTimeout(function(){
            Container.style.opacity = 0
            //Wait for the animation to finish before hiding the outline
            setTimeout(function(){
                that.leaving_area();
                Container.style.transition = ""
                Container.style.opacity = 1
                LocCont.flashlight_finished(FennimalObj)
            },600)

        }, 750)



    }

    //Call when leaving the area (before deleting this controller
    this.leaving_area = function(){
        //Hide the prompt
        FlashlightPrompt.style.display = "none"

        //Hiding the item bar and the flashlight icon
        toggleFlashlight(false)
        hideFlashLightIcon()
        hide_Fennimal_background_mask()

        //Clear the Container
        document.getElementById("Fennimal_Container").innerHTML = ""
    }

    /////////////////////
    // ON CONSTRUCTION //
    /////////////////////
    let Targets, Container, HeadObject, BodyObject
    document.getElementById("Fennimal_Container").innerHTML = ""

    //Check if there is a Fennimal in this location
    Container = document.getElementById("Fennimal_Container")
    //Creating the outline object and attaching it to the Container
    let OutlineObject = createFennimalOutline(FennimalObj.head,FennimalObj.body, true)
    Container.appendChild(OutlineObject)

    //Storing references to the head and body part of the outline
    HeadObject = document.getElementById("outline_head")
    BodyObject = document.getElementById("outline_body")

    //Setting the correct fills
    HeadObject.style.fill = "url(#spotlight_gradient)"
    HeadObject.style.stroke = "url(#spotlight_gradient)"
    BodyObject.style.fill = "url(#spotlight_gradient)"
    BodyObject.style.stroke = "url(#spotlight_gradient)"

    //Finding the targets
    let TargetsList = OutlineObject.getElementsByClassName("outline_target")
    Targets = createTargets(TargetsList)

    //Showing the layers on screen
    document.getElementById("Fennimals_Stage_Layer").style.display = "inherit"

    //Creating and setting elements
    showFlashLightIcon()
    toggleFlashlight(false)

    Flashlight_Mask_Yellow.style.fill = "url(#spotlight_gradient_background)"
    FlashlightPrompt.style.display = "inherit"

    // DISPLAYING INGAME HINTS
    //When the first flashlight controller is generated, show subjects a hint on how to use the flashlight.
    let amount_dragged = 0


}

//Given an array  of items, manages all the item interactions.
ItemController = function(FennimalObj,LocCont, FenCont, limited_backpack_item_array){
    //References to the item bar
    let ItemBar = document.getElementById("item_bar_circular")
    ItemBar.style.pointerEvents = "none"
    ItemBar.style.opacity = 1
    ItemBar.style.transition = "all 500ms ease-in-out"

    document.getElementById("Item_bar_layer").style.display = "inherit"

    //Reference to the open-backpack icon
    let OpenBackpackIcon = document.getElementById("open_backpack_icon")
    let OpenBackpackIconPressable = document.getElementById("open_backpack_icon_center")

    //Calculate the number of items to be shown on the screen
    let number_of_available_items_on_screen = 0

    //Keep track of the drop target
    let DropTarget = document.getElementById("Fennimal_Container").getElementsByClassName("Fennimal_droptarget")[0]

    //Reference to the feedback controller
    let FeedbackCont = false

    //Set to true if this is a quiz trial
    let is_quiz_trial = false

    //Stores the starting time (used for calculating RT measurements, start when backpack is opened)
    let starting_time

    //Timeout function for the prompt message
    let promptTimeout = false

    //Controls the interactions for a single button. Create with an item name and the relative X location on the item bar
    ItemIcon = function (item_name, index, background_color, Controller){
        //Find a reference to the icon element in the SVG
        let IconElem = document.getElementById("item_icon_" + item_name)
        IconElem.style.display = "inherit"

        //Set the correct color to the background rect
        let IconElem_background = document.getElementById("item_icon_" + item_name + "_background")
        IconElem_background.style.fill = background_color

        //Get the correct x and y pos on the screen
        let x = Param.ItemCoords[FennimalObj.ItemDetails.All_Items.length][index].x
        let y = Param.ItemCoords[FennimalObj.ItemDetails.All_Items.length][index].y

        //Translate the icon to the right position on the item bar
        MoveElemToCoords(IconElem,x,y)

        //Hides the icon button element
        this.hideButton = function(){
            IconElem.style.display = "none"
        }

        //Shows the icon button element
        this.showButton = function(){
            IconElem.style.display = "inherit"
        }

        //Shimmers the icon button element
        this.shimmerButton = function(){
            IconElem_background.classList.add("shimmered_object")
        }

        //Set an event listener for when the icon is pressed. If so, then let the subcontroller know
        IconElem.onmousedown = function(event){
            let mouse_pos = getMousePosition(event)
            Controller.buttonSelected(item_name, mouse_pos.x,mouse_pos.y)
        }

    }

    //Adds a not-available icon on the item bar
    NotAvailableIcon = function(item_name, index){
        //Find a reference to the icon element in the SVG
        let IconElem = document.getElementById("item_icon_" + item_name + "_not_available")
        IconElem.style.display = "inherit"
        IconElem.style.opacity = 0.7
        IconElem.style.pointerEvents = "none"

        //Get the correct x and y pos on the item bar
        let x = Param.ItemCoords[FennimalObj.ItemDetails.All_Items.length][index].x
        let y = Param.ItemCoords[FennimalObj.ItemDetails.All_Items.length][index].y

        //Translate the icon to the right position on the item bar
        MoveElemToCoords(IconElem,x,y)

        this.hideButton = function(){
            IconElem.style.display = "none"
        }
        //Shows the icon button element
        this.showButton = function(){
            IconElem.style.display = "inherit"
        }
    }

    // DRAGGING STATE //
    //Keeps track of the dragging state, which determines whether (and which) items are being dragged by the subject
    let dragging_state = false

    //Dragging state functions
    function stoppedDragging(mouse_x,mouse_y){
        //Get distance between the mouse and the center of the drop target
        let drop_center = getViewBoxCenterPoint(DropTarget)
        let distance_to_target = EUDist(mouse_x,mouse_y,drop_center.x,drop_center.y)

        //Hide the drop target
        DropTarget.style.display = "none"

        if(distance_to_target <= Param.minimum_drop_target_distance){
            //Snap item to the center of the target
            let ItemObj = document.getElementById("item_"+dragging_state)
            MoveElemToCoords(ItemObj, drop_center.x,drop_center.y)

            //Item has been given. Freeze for feedback
            let item_selected_by_subject = dragging_state
            dragging_state = "frozen"

            Fennimal_interaction_completed(item_selected_by_subject)

        }else{
            //Nothing has been given yet
            resetDraggedItem()

            //Change the dragging state to false
            dragging_state = false

            //Show all item icons
            showIconButtons();
            document.getElementById("item_bar_circular").style.display = "inherit"

            promptTimeout = setTimeout(function(){Prompt.show_message(prompt_message)}, 300)
        }

    }
    function resetDraggedItem(){
        //Remove the currently dragged item
        let ItemObj = document.getElementById("item_"+dragging_state)
        ItemObj.style.display = "none"
        MoveElemToCoords(ItemObj,-500,-500)
    }
    function dragItemtoCursor(mouse_x,mouse_y){
        //Find the correct item, based on the current dragging state
        let ItemObj = document.getElementById("item_"+dragging_state)
        MoveElemToCoords(ItemObj, mouse_x,mouse_y)
    }


    document.onmouseup = function(event){
        if(dragging_state !== false && dragging_state!== "frozen"){
            let mouse_pos = getMousePosition(event)
            stoppedDragging(mouse_pos.x,mouse_pos.y)
        }
    }
    document.onmouseleave = function(event){
        if(dragging_state !== false && dragging_state!== "frozen"){
            let mouse_pos = getMousePosition(event)
            stoppedDragging(mouse_pos.x,mouse_pos.y)
        }
    }
    document.onmousemove = function(event){
        if(dragging_state!==false && dragging_state!== "frozen"){
            //Get the correct mouse position in the SVG coordinates
            let mouse_pos = getMousePosition(event)
            dragItemtoCursor(mouse_pos.x,mouse_pos.y)
        }
    }

    //Call on construction to generate all the item icon buttons.
    // If an item is not included in Available_Items_On_Screen, then shows the not_available icon instead
    let that = this
    function createIconButtonObjects(){
        //Creating the buttons, keeping track of the number of evailable items.
        for(let i=0;i<FennimalObj.ItemDetails.All_Items.length;i++){

            let itemname = FennimalObj.ItemDetails.All_Items[i]

            let item_unavailable = FennimalObj.ItemResponses[itemname] === "unavailable"
            if(limited_backpack_item_array !== false){
                if(! limited_backpack_item_array.includes(itemname)){
                    item_unavailable = true
                }
            }
            let backgroundcolor = FennimalObj.ItemDetails[itemname].backgroundColor

            if(item_unavailable){
                IconNotAvailable[itemname] = new NotAvailableIcon(itemname,i)
            }else{
                number_of_available_items_on_screen++
                IconButtons[itemname] = new ItemIcon(itemname, i, backgroundcolor,that)

                //Making sure that the associated item is set to have a full opacity
                let ItemObj = document.getElementById("item_"+itemname)
                ItemObj.style.opacity = 1

            }
        }

    }

    //Shimmer all icon buttons
    function shimmerAllButtons(){
        let buttonrefs = Object.keys(IconButtons)

        for(let i=0;i<buttonrefs.length;i++){
            IconButtons[buttonrefs[i]].shimmerButton()
        }
    }

    //Hide all icon buttons
    function hideIconButtons(){
        let buttonrefs = Object.keys(IconButtons)

        for(let i=0;i<buttonrefs.length;i++){
            IconButtons[buttonrefs[i]].hideButton()
        }

        let notavailable_refs = Object.keys(IconNotAvailable)
        for(let i=0;i<notavailable_refs.length;i++){
            IconNotAvailable[notavailable_refs[i]].hideButton()
        }
    }

    //Hides all items
    function hide_all_items(){
        for(let i =0;i<FennimalObj.ItemDetails.All_Items.length;i++){
            let SVGobj = document.getElementById("item_"+FennimalObj.ItemDetails.All_Items[i])
            MoveElemToCoords(SVGobj, -200,-200)
        }

    }

    //Show all icon buttons
    function showIconButtons(){
        let buttonrefs = Object.keys(IconButtons)

        for(let i=0;i<buttonrefs.length;i++){
            IconButtons[buttonrefs[i]].showButton()
        }

        let notavailable_refs = Object.keys(IconNotAvailable)
        for(let i=0;i<notavailable_refs.length;i++){
            IconNotAvailable[notavailable_refs[i]].showButton()
        }
    }

    // BUTTON INTERACTIONS //
    //Call when one of the icon buttons is clicked
    this.buttonSelected = function (item_name, mouse_x,mouse_y){
        //Hide all item icons
        hideIconButtons();
        document.getElementById("item_bar_circular").style.display = "none"

        //Set the correct dragging state
        dragging_state = item_name

        //Hide the prompt
        Prompt.minimize()

        //Show the dragged item
        let ItemObj = document.getElementById("item_"+dragging_state)
        ItemObj.style.display = "inherit"
        ItemObj.style.transition = ""
        MoveElemToCoords(ItemObj, mouse_x,mouse_y)

        //Show the target outline
        DropTarget.style.display = "inherit"

        //If the prompt was about to show a message, then cancel it
        if(promptTimeout !== false){
            clearTimeout(promptTimeout)
            promptTimeout = false
        }


    }

    //Call when the interaction is aborted
    this.interactionAborted = function(){
        ItemBar.style.display = "none"
        OpenBackpackIcon.style.display = "none"
        hideIconButtons()
        hide_all_items()
        if(dragging_state !== false && dragging_state!== "frozen"){

            stoppedDragging(0,0)
        }

        if(FeedbackCont !== false){
            FeedbackCont.location_left()
            FeedbackCont = false
        }
    }

    //Call after feedback to resolve the Fennimal interaction.
    function Fennimal_interaction_completed(selected_item){
        //Store the RT
        FennimalObj.rt = Date.now() - starting_time

        //Inform the FC that a Fennimal interaction has been completed
        //LocCont.prevent_subject_from_leaving_location(false)
        FenCont.interactionCompleted(selected_item)

    }

    //Call when the backpack is opened
    let prompt_message
    function backpack_opened(){
        AudioController.play_sound_effect("zipper")
        OpenBackpackIcon.style.display = "none"
        ItemBar.style.display = "inherit"
        createIconButtonObjects()
        shimmerAllButtons()

        //Set and show the prompt text
        if(number_of_available_items_on_screen=== 0){
            prompt_message = "Oops! You did not bring the correct toy with you"
            ItemBar.style.opacity = 0.1
            LocCont.Fennimal_interaction_completed(FennimalObj)
        }else{
            if(number_of_available_items_on_screen === 1){
                //One item is not unavailable, so find the name
                let available_item_name = Object.keys(FennimalObj.ItemResponses).find(x=>FennimalObj.ItemResponses[x]!=="unavailable");
                prompt_message = "Give the " + available_item_name + " to the " + FennimalObj.name


            }else{
                if(is_quiz_trial){
                    prompt_message = "Which toy did you PREVIOUSLY GIVE to the " + FennimalObj.name + "?"
                }else{
                    prompt_message = "Give one of the available toys to " + FennimalObj.name
                }
            }
        }

        Prompt.show_message(prompt_message)

        //Log the current time
        starting_time = Date.now()

    }

    //Create objects for the icons on the item bar
    let IconButtons = {}
    let IconNotAvailable = []

    // CONSTRUCTION ///
    //Hide the rectangular bar
    function start_normal_interaction(){
        if(typeof FennimalObj.max_decision_time !== "undefined"){
            backpack_opened()
        }else{
            ItemBar.style.display = "none"
            //Show the backpack open icon
            OpenBackpackIcon.style.display = "inherit"
            Prompt.show_message("Click on the icon to open your backpack")

            OpenBackpackIconPressable.onclick = function(){backpack_opened()}

        }
    }

    function feedback_only(){

        let ItemObj = document.getElementById("item_"+FennimalObj.selected_item)
        ItemObj.style.display = "inherit"
        DropTarget.style.display = "inherit"
        let drop_center = getViewBoxCenterPoint(DropTarget)
        MoveElemToCoords(ItemObj, drop_center.x,drop_center.y)
        DropTarget.style.display = "none"

    }

    //SPECIAL TRIALS
    function set_to_quiz_trial(){
        is_quiz_trial = true
        //If this is a quiz trial, then all items should be available. BUT only the special item should result in correct feedback (all else in incorrect)
        let All_Items = FennimalObj.ItemDetails.All_Items
        let correct_item
        if(typeof FennimalObj.special_item !== "undefined"){
            correct_item = FennimalObj.special_item
        }else{
            if(typeof FennimalObj.cued_item !== "undefined"){
                correct_item = FennimalObj.cued_item
            }else{
                console.warn("Warning: mo clear correct answer for Fennimal")
            }
        }

        let NewItemResponses = {}
        for(let i=0;i<All_Items.length;i++){
            if(All_Items[i] === correct_item){
                //NewItemResponses[All_Items[i]] = "correct"
                NewItemResponses[All_Items[i]] = FennimalObj.ItemResponses[All_Items[i]]
            }else{
                NewItemResponses[All_Items[i]] = "incorrect"
            }
        }
        FennimalObj.ItemResponses = NewItemResponses
    }

    function set_to_test_phase_trial(){
        //Test trials have some potential rules guiding which items may be allowed
        if(FennimalObj.test_phase_trial !== "undefined"){
            if(typeof FennimalObj.TestPhaseRules !== "undefined"){
                //Check if the cued item is allowed
                if(FennimalObj.TestPhaseRules.cued_item_allowed === false ){
                    //Cued item not allowed, so set this item to unavailable in the ItemResponses
                    if(FennimalObj.cued_item !== false){
                        FennimalObj.ItemResponses[FennimalObj.cued_item] = "unavailable"
                    }
                }

                //Check if the search item is allowed.
                if(FennimalObj.TestPhaseRules.search_item_allowed === false ){
                    //Cued item not allowed, so set this item to unavailable in the ItemResponses
                    if(FennimalObj.search_item !== false){
                        FennimalObj.ItemResponses[FennimalObj.search_item] = "unavailable"
                    }
                }

            }
        }else{
            console.warn("WARNING: Test phase rules not defined for this interaction. Defaulting to standard rules. ")
        }

    }

    //INITIALIZATION
    //Check if this is a quiz trial. If so, change the ItemResponses
    if(typeof FennimalObj.quiz_trial !== "undefined"){
        if(FennimalObj.quiz_trial){
            set_to_quiz_trial()
        }
    }
    if(typeof FennimalObj.test_phase_trial !== "undefined"){
        if(FennimalObj.test_phase_trial){
            set_to_test_phase_trial()
        }
        if(typeof FennimalObj.TestPhaseRules !== "undefined"){
            if(typeof FennimalObj.TestPhaseRules.is_repeat_trial !== "undefined"){
                if(FennimalObj.TestPhaseRules.is_repeat_trial){
                    set_to_quiz_trial()
                }
            }
        }
    }

    if(typeof FennimalObj.outcome_observed === "undefined"){
        start_normal_interaction()
    }else{
        feedback_only()
    }



}

FennimalController = function(FennimalObj, LocCont, limited_backpack_item_array){
    let that = this
    //ItemAvailability: should contain an object with one key for each element in ItemDetails.All_Items. Each key should be set to either invisible (item not displayed on the bar), "available" (present and availalbe) or "unavailable" (present, but grayed out).
    //The FennimalController gets created AFTER the subject has uncovered the Fennimal outline.

    //Determine the type of Fennimal interaction.
    //  "normal": regular interaction, check which items are in the backpack.
    //  "completed": feedback only, item has already been given
    let type_of_interaction
    if(typeof FennimalObj.outcome_observed === "undefined"){
        type_of_interaction = "normal"
    }else{
        type_of_interaction = "completed"
    }

    //Subcontroller for the item interactions stored here
    let ItemCont = false
    let FeedbackCont = false
    let ItemDetails = FennimalObj.ItemDetails
    let Fennimal, Container

    let SVG_references = {
        Mask:  document.getElementById("Fennimals_Mask_Layer"),
        Layer: document.getElementById("Fennimals_Stage_Layer"),
        Item_Bar: document.getElementById("Item_bar_layer"),
        Item_Bar_circle: document.getElementById("item_bar_circular"),

    }

    SVG_references.Mask.style.opacity = 0
    SVG_references.Mask.style.pointerEvents = "none"

    function show_Fennimal_background_mask(){
        //SVGObjects.Splashscreen_Fennimal.Mask.style.opacity = 0
        SVG_references.Mask.style.transition = "all 500ms linear"
        SVG_references.Mask.style.display = "inherit"

        setTimeout(function(){
            SVG_references.Mask.style.opacity = 1
        },150)
    }
    function hide_Fennimal_background_mask(){
        SVG_references.Mask.style.display = "none"
    }

    // Call when the interaction is aborted (probably by the subject leaving the area), before deletion of this controller
    this.location_left = function(){
        document.getElementById("Fennimal_Container").innerHTML = ""
        hide_Fennimal_background_mask()
        if(ItemCont !== false){
            ItemCont.interactionAborted()
        }
        //Prompt.minimize()

        SVG_references.Layer.style.display = "none"

        if(FeedbackCont!== false){
            FeedbackCont.location_left()
            FeedbackCont = false
        }
    }

    //Call when a limited item has been given
    function limited_backpack_item_given(given_item){
        LocCont.remove_item_from_backpack(given_item)
    }

    this.interactionCompleted = function(selected_item){
        FennimalObj.selected_item = selected_item
        FennimalObj.outcome_observed = FennimalObj.ItemResponses[selected_item]

        if(limited_backpack_item_array !== false){
            limited_backpack_item_given(selected_item)
        }


        FeedbackCont = new FeedbackController(FennimalObj,Container, true)

        //After a brief delay the interaction is completed.
        setTimeout(function(){
            LocCont.Fennimal_interaction_completed(FennimalObj)

        },3000)


    }


    // ON CONSTRUCTION
    function initialize_elements(){
        //Remove any existing Fennimals on the screen
        document.getElementById("Fennimal_Container").innerHTML = ""

        //Creating the Fennimal SVG group and a container to hold it in
        Fennimal = createFennimal(FennimalObj)
        Fennimal.style.opacity = 0
        Fennimal.style.transition = "all 500ms linear"
        Container = document.getElementById("Fennimal_Container")
        Container.appendChild(Fennimal)
        Container.style.display = "inherit"
        SVG_references.Layer.style.display = "inherit"

        //First give the prompt while animating in the background mask
        //Set and show the prompt text
        document.getElementById("item_bar_circular").style.display = "none"
        SVG_references.Item_Bar.style.display = "inherit"
        Prompt.show_message("You have found a "+ FennimalObj.name)


    }

    function show_trial(){
        if(type_of_interaction === "normal"){
            setTimeout(function(){show_Fennimal_background_mask()}, 500)

            //Next animate in the Fennimal
            setTimeout(function(){
                Fennimal.style.opacity = 1
            }, 1000)

            //After a brief delay, show the items by creating an item subcontroller
            setTimeout(function(){
                ItemCont = new ItemController(FennimalObj,LocCont, that, limited_backpack_item_array)
            },2500)

        }
        if(type_of_interaction === "completed"){
            show_Fennimal_background_mask()
            Fennimal.style.opacity = 1
            FeedbackCont = new FeedbackController(FennimalObj,Container, false)

            //If this Fennimal had an "end_trial" event, change it to "continue" (finding this Fennimal should no longer end the trial after all)
            if(FennimalObj.end_of_interaction_event === "end_trial"){
                FennimalObj.end_of_interaction_event = "continue"
            }

            setTimeout(function(){LocCont.Fennimal_interaction_completed(FennimalObj)}, 1500)
            ItemCont = new ItemController(FennimalObj,LocCont, that)

        }

    }

    initialize_elements()
    show_trial()



}

