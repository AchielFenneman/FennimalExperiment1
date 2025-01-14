//TODO:



TrialController = function(box_name,array_all_boxes_used_in_exp,array_all_toys_to_pick_from, FenObj, ItemAlreadyInBox, NewItemByFennimal, showPartner, PromptCont, ScreenController, special_trial, AdditionalInfo){
    // Special trial:
    //      If set to false, then a normal trial occurs (used for the private and public parts).
    //      "repeat" is a repeated trial (with or without partner). These trials are shorter, and assume that there is an item in the box, but no new item given.
    //      "measure_partner": elicits which toy the partner believes to be in the box. Ignores the showPartner input.
    //      "measure_self": elicits which toy the participant believes to be in the box.
    let that = this

    //Time for each step of the interation process
    let step_time = 2100

    //If there is no item in the box, and the Fennimal has a new item: play with the item, place it in the box.
    //If there is an item in the box, and the Fennimal does not have a new item (false): take item out of the box and play with it
    //If there is an item in the box, and the Fennimal has a new item: play and replace.
    let trial_type = "play_and_place", animation_step_arr
    if(ItemAlreadyInBox !== false && NewItemByFennimal === false){ trial_type = "take_play_return"}
    if(ItemAlreadyInBox !== false && NewItemByFennimal !== false){ trial_type = "play_and_swap"}

    switch(trial_type){
        case("play_and_place"): animation_step_arr = ["show_partner","show_Fennimal","show_box", "bring_new_item", "play_new", "click_to_open", "place_new", "click_to_close"]; break
        case("take_play_return"): animation_step_arr = ["show_partner","show_Fennimal","show_box","no_new_item","click_to_open", "take", "play_old", "place_old", "click_to_close"]; break
        case("play_and_swap"): animation_step_arr = ["show_partner","show_Fennimal","show_box","bring_new_item", "play_new", "click_to_open", "discard", "place_new", "click_to_close"]; break
    }

    switch(special_trial){
        case("repeat"): animation_step_arr = ["show_partner","show_Fennimal","select_box", "show_box","ask_item_in_box", "open_box", "take", "play_old_short", "place_old", "click_to_close"];
        step_time = 1200; break
        case("measure_partner"): animation_step_arr = ["show_Fennimal_partner_and_box", "move_partner_for_question", "ask_partner_item_in_box", "revert_object_positions", "fade_out"]; break
        case("measure_self"): animation_step_arr = ["show_Fennimal_and_box","move_box_for_question", "ask_self_item_in_box", "revert_object_positions", "fade_out"]; break
        case("items"): animation_step_arr = ["show_Fennimal_center_for_question","ask_which_items_liked", "fade_out"]; break
    }

    //This object will contain all the to-be-stored data collected throughout a trial. Everything stored here will be automatically transfered and saved.
    let CollectedData = {}

    let BoxFront, BoxBack, BoxLid
    let box_is_open = false
    let box_description = Param.BoxDescriptions[box_name]
    let animation_speed = 500

    let PartnerBaseCoords = {
        x: 370,
        y: 150
    }
    let PartnerQuestionMovementValues = {
        Fennimal :{
            x_diff: -50,
            y_diff: 0,
            scale: 0.8
        },
        Box : {
            x_diff: 40,
            y_diff: 0,
        },
        Partner:{
            x_diff: -180,
            y_diff: -100,
        }
    }
    let SelfQuestionMovementValues = {
        Fennimal :{
            x_diff: -60,
            y_diff: 0,
            scale: 0.7
        },
        Box : {
            x_diff: -75,
            y_diff: -20
        },
    }

    //This is the layer in which the items live
    let SVG_layer = document.getElementById("items")
    let Partner_layer = document.getElementById("boxes_partner")
    let QuestionBox_layer = document.getElementById("question_box_layer")

    //The parameters for the question box (x and w are dynamically set on creation)

    let QuestionBox_BaseDimensions =  {
        y: 202,
        h:55,
        min_number_of_element_space: 6,
        single_element_width: 62.5
    }
    let QuestionBox_ItemQuestionDimensions =  {
        y: 190,
        h:55,
        min_number_of_element_space: 6,
        single_element_width: 62.5
    }


    //We need to wrap each item into multiple groups to facilitate animations and movements across the screen
    //TODO If I ever build on this pilot, this needs to be cleaned up at some point...
    let  ItemInBox_SVG_Obj, ItemInBox_TranslationGroup, ItemInBox_Take_From_Box_TranslationGroup, ItemInBox_Play_TranslationGroup, ItemInBox_Play_RotationGroup,
         ItemWithFennimal_SVG_Obj, ItemWithFennimalTranslationGroup, ItemWithFennimal_Play_TranslationGroup, ItemWithFennimal_Play_RotationGroup,
        PartnerObj,PartnerObjContainer, TrialCompletedButton, FennimalOnScreen, PartnerThoughtBubble, QuestionMarkContainerTranslate,
        QuestionBoxContainerElem, ButtonQuestionForeignElem, ButtonQuestionElem, ButtonControllerArr

    //Hearts: Creates a svg object at the x and y position that moves to the top of the y axis, while fading out. Set animations with css. (ONLY HARTS SUPPORTED FOR NOW)
    SmallFeedbackSymbol = function(start_x, start_y, feedback_type){
        //Copy the heart svg element
        let FeedbackObj = document.getElementById("feedback_" + feedback_type + "_small")

        let NewObject = FeedbackObj.cloneNode(true)
        SVG_layer.appendChild(NewObject)
        NewObject.style.display="none"

        let BBox = NewObject.getBBox()


        move_elem_to_coords(NewObject, start_x -  BBox.width ,start_y - BBox.height)
        NewObject.style.opacity = .5

        setTimeout(function(){
            NewObject.style.display = "inherit"
        },10)

        //After a brief waiting period, move upwards
        setTimeout(function(){
            //Select a random movement around the starting xposition to translate to
            let max_deviation = 100
            let random_x = randomIntFromInterval(start_x- max_deviation, start_x + max_deviation)
            move_elem_to_coords(NewObject, random_x,-50)
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
            SVG_layer.removeChild(NewObject)
        },5000)

    }
    let SmallIconGenerator


    //INTERACTION STEPS
    //Steps are managed through this function.
    function start_next_interaction_step(){
        if(animation_step_arr.length > 0){
            let next_step = animation_step_arr.shift()

            switch (next_step){
                case("show_partner"): show_partner(); break;
                case("show_box"): show_box(); break;
                case("show_Fennimal"):show_Fennimal(); break
                case("show_Fennimal_center_for_question"):show_Fennimal_center_for_question(); break
                case("show_Fennimal_and_box"): show_Fennimal_and_box(); break
                case("show_Fennimal_partner_and_box"): show_Fennimal_partner_and_box(); break

                case("no_new_item"): no_new_item_by_Fennimal(); break
                case("bring_new_item"): show_new_item_by_Fennimal(); break

                case("select_box"): ask_select_box(); break;
                case("ask_item_in_box"): ask_item_in_box(); break

                case("move_partner_for_question"): move_partner_for_question(); break;
                case("move_box_for_question"): move_box_for_question(); break
                case("ask_partner_item_in_box"): ask_partner_question(); break
                case("ask_self_item_in_box"): ask_self_item_in_box(); break
                case("revert_object_positions"): revert_object_positions(); break

                case("play_new"): play_with_item("new_item", 6000); break
                case("play_old"): play_with_item("box_item",6000); break
                case("play_old_short"): play_with_item("box_item",4000); break

                case("open_box"): open_box(); break;
                case("close"): close_box(); break
                case("click_to_open"): click_to_open_box(); break;
                case("click_to_close"): click_to_close_box(); break;

                case("take"): take_item_from_box(); break;

                case("place_new"): move_item_from_Fennimal_into_box(); break;
                case("place_old"): return_item_from_Fennimal_back_to_box(); break
                case("discard"): discard_item_in_box(); break

                case("ask_which_items_liked"): ask_which_toys_liked_by_Fennimal(); break

                case("fade_out"): fade_out(); break
            }
        }else{
            show_end_of_trial_button()
        }
    }

    //Shows the Fennimal.
    function show_Fennimal(){

        //Show the prompt message
        if(FenObj.seen_before){
            if(typeof FenObj.name !=="undefined"){
                PromptCont.show_message( FenObj.name +" is back!")
            }else{
                PromptCont.show_message("A familiar Fennimal returns!")
            }
        }else{
            if(typeof FenObj.name !=="undefined"){
                PromptCont.show_message("This Fennimal is called " + FenObj.name)
            }else{
                PromptCont.show_message("You have found a new Fennimal!")
            }
        }

        show_Fennimal_on_screen()

        //Continue to the next step
        setTimeout(function(){
            //ShownFennimalBodyObj.classList.remove("focus_element")
            //ShownFennimalHeadObj.classList.remove("focus_element")
            start_next_interaction_step()
        },step_time)

    }

    function show_Fennimal_on_screen(){
        FennimalOnScreen = new Fennimal(FenObj.head, FenObj.body, {head:1, body:.8, full: 1}, FenObj.ColorScheme, SVG_layer)
        FennimalOnScreen.move_to_coords(Param.ScreenPositions.FennimalCenter.x,Param.ScreenPositions.FennimalCenter.y)
        FennimalOnScreen.change_opacity(1)
    }

    function initalize_box(){
        //Create a reference to all the box elements
        BoxFront = document.getElementById("box_"+box_name + "_front")
        BoxBack = document.getElementById("box_"+box_name + "_back")
        BoxLid = document.getElementById("box_"+box_name + "_lid")

        //Make sure all elements are set to opacity 0 on creation
        BoxFront.style.display = "none"
        BoxBack.style.display = "none"
        BoxLid.style.display = "none"

        BoxFront.style.opacity = 0
        BoxBack.style.opacity = 0
        BoxLid.style.opacity = 0

        //Setting animations to all components
        BoxFront.style.transition = ""
        BoxBack.style.transition = ""
        BoxLid.style.transition = ""

        BoxFront.style.display = "inherit"
        BoxBack.style.display = "inherit"
        BoxLid.style.display = "inherit"

        if(ItemAlreadyInBox && special_trial !== "measure_self" && special_trial !== "measure_partner"){
            add_item_already_in_box()
        }

        //Short timeout to make sure all the animations work
        setTimeout(function(){
            BoxFront.style.transition = "all "+ animation_speed + "ms ease-in-out"
            BoxBack.style.transition = "all "+ animation_speed + "ms ease-in-out"
            BoxLid.style.transition = "all "+ animation_speed + "ms ease-in-out"

            setTimeout(function(){
                BoxFront.style.opacity = 1
                BoxBack.style.opacity = 1
                BoxLid.style.opacity = 1
                box_is_open = false

            },10)
        },10)



    }

    function add_item_already_in_box(){
        //is_item_currently_in_box = true
        ItemInBox_SVG_Obj = document.getElementById("item_"+ItemAlreadyInBox.name).cloneNode(true)

        //Paint the item
        set_fill_color_to_list_of_SVG_Elem(ItemInBox_SVG_Obj.getElementsByClassName("item_col_dark"), ItemAlreadyInBox.ColorScheme.dark_color)
        set_fill_color_to_list_of_SVG_Elem(ItemInBox_SVG_Obj.getElementsByClassName("item_col_light"), ItemAlreadyInBox.ColorScheme.light_color)

        //Adding all the layers of grouping to support animations and movements
        ItemInBox_Take_From_Box_TranslationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        ItemInBox_TranslationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        ItemInBox_Play_TranslationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        ItemInBox_Play_RotationGroup =  document.createElementNS("http://www.w3.org/2000/svg", 'g')

        ItemInBox_Play_RotationGroup.appendChild(ItemInBox_SVG_Obj)
        ItemInBox_Play_TranslationGroup.appendChild(ItemInBox_Play_RotationGroup)
        ItemInBox_TranslationGroup.appendChild(ItemInBox_Play_TranslationGroup)
        ItemInBox_Take_From_Box_TranslationGroup.appendChild(ItemInBox_TranslationGroup)

        SVG_layer.appendChild(ItemInBox_Take_From_Box_TranslationGroup)
        move_elem_to_coords(ItemInBox_SVG_Obj, Param.ScreenPositions.BoxCenter.x,Param.ScreenPositions.BoxCenter.y)

        ItemInBox_SVG_Obj.classList.add("focus_element")

        setTimeout(function(){
            ItemInBox_SVG_Obj.classList.remove("focus_element")
            ItemInBox_SVG_Obj.style.display = "inherit"
        },animation_speed+ 100)

    }

    function show_partner(){
        //Show the partner icon only if the partner is present
        if(showPartner){
            add_partner_icon_on_screen()

            //Show the description text
            PromptCont.show_message("Your partner is here too" )

            //Highlight icon
            PartnerObj.classList.add("focus_element")
        }else{
            //Show the description text
            PromptCont.show_message("Your partner is not here" )
        }


        setTimeout(function(){
            start_next_interaction_step()
            if(showPartner){
                PartnerObj.classList.remove("focus_element")
            }
        },Math.max(0.75*step_time, 1500))
    }
    function add_partner_icon_on_screen(){
        PartnerObjContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        PartnerObj = document.getElementById("partner_icon").cloneNode(true)

        PartnerObjContainer.style.transform = "translate(" + PartnerBaseCoords.x + "px," + PartnerBaseCoords.y + "px)"
        PartnerObjContainer.appendChild(PartnerObj)
        Partner_layer.appendChild(PartnerObjContainer)
        PartnerObjContainer.style.transition = "all 1000ms linear"
        Partner_layer.style.display = "inherit"

        AudioController.play_partner_sound()
    }

    function show_box(){
        initalize_box()

        //Show the description text and visually highlight the box
        PromptCont.show_message("You place the " + Param.BoxDescriptions[box_name] + " on the ground...")
        BoxFront.classList.add("focus_element")
        BoxLid.classList.add("focus_element")

        //Continue to the next step
        setTimeout(function(){
            BoxFront.classList.remove("focus_element")
            BoxLid.classList.remove("focus_element")
            start_next_interaction_step()
        },step_time)

    }

    function show_Fennimal_and_box(){
        show_Fennimal_on_screen()
        initalize_box()

        if(typeof FenObj.name !=="undefined"){
            PromptCont.show_message( FenObj.name +" has come to play with its toy!")
        }else{
            PromptCont.show_message("A familiar Fennimal has come to play with its toy!")
        }

        //Continue to the next step
        setTimeout(function(){
            start_next_interaction_step()
        },step_time)
    }

    function show_Fennimal_partner_and_box() {
        show_Fennimal_on_screen()
        initalize_box()
        add_partner_icon_on_screen()

        if(typeof FenObj.name !=="undefined"){
            PromptCont.show_message( FenObj.name +" has come to play with its toy!")
        }else{
            PromptCont.show_message("A familiar Fennimal has come to play with its toy!")
        }

        //Continue to the next step
        setTimeout(function(){
            start_next_interaction_step()
        },step_time)

    }

    function show_new_item_by_Fennimal(){

        //Add and paint the item
        ItemWithFennimal_SVG_Obj = document.getElementById("item_"+NewItemByFennimal.name).cloneNode(true)
        set_fill_color_to_list_of_SVG_Elem(ItemWithFennimal_SVG_Obj.getElementsByClassName("item_col_dark"), NewItemByFennimal.ColorScheme.dark_color)
        set_fill_color_to_list_of_SVG_Elem(ItemWithFennimal_SVG_Obj.getElementsByClassName("item_col_light"), NewItemByFennimal.ColorScheme.light_color)

        ItemWithFennimalTranslationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        ItemWithFennimal_Play_TranslationGroup =  document.createElementNS("http://www.w3.org/2000/svg", 'g')
        ItemWithFennimal_Play_RotationGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')

        ItemWithFennimal_Play_RotationGroup.appendChild(ItemWithFennimal_SVG_Obj)
        ItemWithFennimal_Play_TranslationGroup.appendChild(ItemWithFennimal_Play_RotationGroup)
        ItemWithFennimalTranslationGroup.appendChild(ItemWithFennimal_Play_TranslationGroup)

        SVG_layer.appendChild(ItemWithFennimalTranslationGroup)
        move_elem_to_coords(ItemWithFennimal_SVG_Obj, Param.ScreenPositions.FennimalCenter.x,Param.ScreenPositions.FennimalCenter.y)
        ItemWithFennimal_SVG_Obj.style.display = "inherit"

        ItemWithFennimal_SVG_Obj.classList.add("focus_element")

        //Show the description text
        if(Param.show_Fennimal_name){
            PromptCont.show_message(FenObj.name + " brought a " + NewItemByFennimal.name )
        }else{
            PromptCont.show_message( "This Fennimal brought a " + NewItemByFennimal.name )
        }

        setTimeout(function(){
            ItemWithFennimal_SVG_Obj.classList.remove("focus_element")
            start_next_interaction_step()
        },step_time)

    }

    function no_new_item_by_Fennimal(){
        //Show the description text
        if(Param.show_Fennimal_name){
            PromptCont.show_message(FenObj.name + " did not bring a new toy" )
        }else{
            PromptCont.show_message( "This Fennimal did not bring a new toy" )
        }

        setTimeout(function(){
            start_next_interaction_step()
        },step_time)

    }

    let object_movement_type

    function move_partner_for_question(){
        PromptCont.show_message("Your partner is moving to open the box...")
        object_movement_type = "partner"

        //Move the Fennimal to the left
        FennimalOnScreen.move_relative(PartnerQuestionMovementValues.Fennimal.x_diff, PartnerQuestionMovementValues.Fennimal.y_diff)
        FennimalOnScreen.rescale(PartnerQuestionMovementValues.Fennimal.scale)

        //Move the box to the right
        BoxFront.style.transform = "translate(" + PartnerQuestionMovementValues.Box.x_diff + "px," + PartnerQuestionMovementValues.Box.y_diff + "px)"
        BoxBack.style.transform = "translate(" + PartnerQuestionMovementValues.Box.x_diff + "px," + PartnerQuestionMovementValues.Box.y_diff + "px)"
        BoxLid.style.transform = "translate(" + PartnerQuestionMovementValues.Box.x_diff + "px," + PartnerQuestionMovementValues.Box.y_diff + "px)"

        //Move the partner to its position
        PartnerObjContainer.style.transform = "translate(" + (PartnerBaseCoords.x + PartnerQuestionMovementValues.Partner.x_diff) + "px," + (PartnerBaseCoords.y + PartnerQuestionMovementValues.Partner.y_diff) + "px)"

        setTimeout(function(){
            start_next_interaction_step()
        },0.75*step_time)


    }

    function move_box_for_question(){
        PromptCont.hide()
        object_movement_type = "self"

        //Move the Fennimal to the left
        FennimalOnScreen.move_relative(SelfQuestionMovementValues.Fennimal.x_diff, SelfQuestionMovementValues.Fennimal.y_diff)
        FennimalOnScreen.rescale(SelfQuestionMovementValues.Fennimal.scale)

        //Move the box to the center
        BoxFront.style.transform = "translate(" + SelfQuestionMovementValues.Box.x_diff + "px," + SelfQuestionMovementValues.Box.y_diff + "px)"
        BoxBack.style.transform = "translate(" + SelfQuestionMovementValues.Box.x_diff + "px," + SelfQuestionMovementValues.Box.y_diff + "px)"
        BoxLid.style.transform = "translate(" + SelfQuestionMovementValues.Box.x_diff + "px," + SelfQuestionMovementValues.Box.y_diff + "px)"

        setTimeout(function(){
            start_next_interaction_step()
        },0.35*step_time)

    }

    function ask_partner_question(){
        PromptCont.show_message("Which toy does your partner think is in the " + box_description + "?")
        //Add the thought bubble and question mark next to the partner
        let xval = (PartnerBaseCoords.x + PartnerQuestionMovementValues.Partner.x_diff) - 40
        let yval = (PartnerBaseCoords.y + PartnerQuestionMovementValues.Partner.y_diff) - 10

        //Thought bubble
        PartnerThoughtBubble = document.getElementById("partner_thought_bubble").cloneNode(true)
        Partner_layer.appendChild(PartnerThoughtBubble)
        PartnerThoughtBubble.style.transform = "translate(" + xval + "px," + yval + "px)"
        PartnerThoughtBubble.classList.add("partner_thought_bubble")

        //Adding the question mark
        QuestionMarkContainerTranslate =  document.createElementNS("http://www.w3.org/2000/svg", 'g')
        let QuestionMarkContainerRotate=  document.createElementNS("http://www.w3.org/2000/svg", 'g')
        let QuestionMark =document.getElementById("partner_question_mark").cloneNode(true)
        QuestionMarkContainerRotate.appendChild(QuestionMark)
        QuestionMarkContainerTranslate.appendChild(QuestionMarkContainerRotate)

        QuestionMark.classList.add("partner_question_mark")
        QuestionMarkContainerRotate.classList.add("shake_element")
        Partner_layer.appendChild(QuestionMarkContainerTranslate)

        QuestionMarkContainerTranslate.style.transform = "translate(" + (xval+15) + "px," + (yval+5) + "px)"

        //After a brief delay for the animations, show the answer buttons
        setTimeout(function(){
            //Show the prompt question
            create_question_box(array_all_toys_to_pick_from.length, QuestionBox_BaseDimensions)

            //Create buttons
            type_of_question_currently_being_waited_for = "measure_partner"
            ButtonControllerArr = []
            for(let button_num =0; button_num< array_all_toys_to_pick_from.length; button_num++){
                ButtonControllerArr.push(new QuestionItemButton(QuestionBoxContainerElem, array_all_toys_to_pick_from[button_num], that, false))
            }
        },500)



    }

    function ask_self_item_in_box(){
        PromptCont.show_message("Which toy is currently in the " + box_description + "?")
        //Add the thought bubble and question mark next to the partner
        let BoxCenter = getViewBoxCenterPoint(BoxFront)
        let xval = BoxCenter.x - 20
        let yval = BoxCenter.y - 50

        //Adding the question mark
        QuestionMarkContainerTranslate =  document.createElementNS("http://www.w3.org/2000/svg", 'g')
        let QuestionMarkContainerRotate=  document.createElementNS("http://www.w3.org/2000/svg", 'g')
        let QuestionMark =document.getElementById("partner_question_mark").cloneNode(true)
        QuestionMarkContainerRotate.appendChild(QuestionMark)
        QuestionMarkContainerTranslate.appendChild(QuestionMarkContainerRotate)

        QuestionMark.classList.add("partner_question_mark")
        QuestionMarkContainerRotate.classList.add("shake_element")
        Partner_layer.appendChild(QuestionMarkContainerTranslate)

        QuestionMarkContainerTranslate.style.transform = "translate(" + (xval) + "px," + (yval) + "px)"

        //After a brief delay for the animations, show the answer buttons
        setTimeout(function(){
            //Show the prompt question
            create_question_box(array_all_toys_to_pick_from.length,  QuestionBox_BaseDimensions)

            //Create buttons
            type_of_question_currently_being_waited_for = "measure_self"
            ButtonControllerArr = []
            for(let button_num =0; button_num< array_all_toys_to_pick_from.length; button_num++){
                ButtonControllerArr.push(new QuestionItemButton(QuestionBoxContainerElem, array_all_toys_to_pick_from[button_num], that, false))
            }
        },500)

    }

    function revert_object_positions(){
        PromptCont.hide()

        //Delete the thought bubble and question mark
        if(typeof QuestionMarkContainerTranslate !== "undefined"){
            QuestionMarkContainerTranslate.remove()
        }

        if(typeof PartnerThoughtBubble !== "undefined"){
            PartnerThoughtBubble.remove()
        }


        //Return and rescale the Fennimal
        if(object_movement_type === "partner"){
            FennimalOnScreen.move_relative(-PartnerQuestionMovementValues.Fennimal.x_diff,-PartnerQuestionMovementValues.Fennimal.y_diff)
        }
        if(object_movement_type === "self"){
            FennimalOnScreen.move_relative(-SelfQuestionMovementValues.Fennimal.x_diff,-SelfQuestionMovementValues.Fennimal.y_diff)
        }
        FennimalOnScreen.rescale(1)

        //Move the box back to its original position
        BoxFront.style.transform = "translate(0,0)"
        BoxBack.style.transform = "translate(0,0)"
        BoxLid.style.transform = "translate(0,0)"

        //Move the partner icon back to its original position
        if(object_movement_type === "partner"){
            PartnerObjContainer.style.transform = "translate(" + (PartnerBaseCoords.x ) + "px," + (PartnerBaseCoords.y) + "px)"
        }


        setTimeout(function(){
            start_next_interaction_step()
        },0.5*step_time)

    }

    function fade_out(){
        trial_completed()
    }

    //BOX SELECTION QUESTION
    ///////////////////////////
    function ask_select_box(){
        CollectedData.question_box_mistake_count = 0
        CollectedData.question_box_mistakes = []
        //Show the prompt question
        if(typeof FenObj.name !=="undefined"){
            PromptCont.show_message( "Which box contains " + FenObj.name + "'s toy?")
        }else{
            PromptCont.show_message("Which box contains this Fennimal's toy?")
        }

        create_question_box(array_all_boxes_used_in_exp.length,  QuestionBox_BaseDimensions)

        //Create buttons
        ButtonControllerArr = []
        for(let button_num =0; button_num< array_all_boxes_used_in_exp.length; button_num++){
            ButtonControllerArr.push(new QuestionBoxButton(QuestionBoxContainerElem, array_all_boxes_used_in_exp[button_num], that))
        }

    }

    function create_question_box(number_of_buttons, Dimensions){
        //Create a new element to hold all the buttons and icons
        ButtonQuestionElem = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        QuestionBox_layer.appendChild(ButtonQuestionElem)
        QuestionBox_layer.style.display = "inherit"

        //Setting the x and w
        Dimensions.w =  Dimensions.single_element_width * Math.max(number_of_buttons, Dimensions.min_number_of_element_space)
        Dimensions.x = 0.5*(508-Dimensions.w)

        ButtonQuestionForeignElem = createNSElemWithDims('http://www.w3.org/2000/svg',"foreignObject",  Dimensions.x, Dimensions.y, Dimensions.w, Dimensions.h)
        ButtonQuestionForeignElem.classList.add("box_question_foreign")
        ButtonQuestionElem.appendChild(ButtonQuestionForeignElem)

        //Setting the colors of the background element
        let color_light = Param.LocationData[FenObj.location].lighter_color
        let color_dark = Param.LocationData[FenObj.location].darker_color
        ButtonQuestionForeignElem.style.background = color_light + "CC"
        ButtonQuestionForeignElem.style.border = "2px solid " +  color_dark + "00"
        ButtonQuestionForeignElem.style.transition = "all 500ms ease-in-out"


        QuestionBoxContainerElem = document.createElement( 'div')
        ButtonQuestionForeignElem.appendChild(QuestionBoxContainerElem)
        QuestionBoxContainerElem.classList.add("box_question_div_container")
    }

    this.box_question_button_pressed = function(answer_given){

        //Check if the answer is correct or not. If it is correct: go to the next step of the interation.
        //  If it is not correct: then increment the mistakes counter, give feedback and ask the question again.
        if(box_name === answer_given ){
            ButtonQuestionElem.remove()
            start_next_interaction_step()
        }else{
            //Disable all buttons
            for(let i = 0;i<ButtonControllerArr.length; i++){
                ButtonControllerArr[i].disable()
            }
            if(typeof CollectedData.question_box_mistake_count !== "undefined"){
                CollectedData.question_box_mistake_count++
                CollectedData.question_box_mistakes.push(JSON.parse(JSON.stringify(answer_given)))
            }

            ButtonQuestionForeignElem.style.opacity = 0

            PromptCont.show_message("Oops! You picked the wrong box!")

            setTimeout(function(){
                if(typeof FenObj.name !=="undefined"){
                    PromptCont.show_message( "Which box contains " + FenObj.name + "'s toy?")
                }else{
                    PromptCont.show_message("Which box contains this Fennimal's toy?")
                }

                //Re-enable buttons
                ButtonQuestionForeignElem.style.opacity = 1
                for(let i = 0;i<ButtonControllerArr.length; i++){
                    ButtonControllerArr[i].enable()
                }

            },step_time)


        }

    }

    //ITEM SELECTION QUESTION
    ////////////////////////////
    let  type_of_question_currently_being_waited_for
    function ask_item_in_box(){
        CollectedData.question_toy_in_box_error_count = 0
        CollectedData.question_toy_mistakes = []
        type_of_question_currently_being_waited_for = "ask_item_in_box"

        //Show the prompt question
        PromptCont.show_message( "Which toy is in the " + box_description + "?")
        create_question_box(array_all_toys_to_pick_from.length,  QuestionBox_BaseDimensions)

        //Create buttons
        ButtonControllerArr = []
        for(let button_num =0; button_num< array_all_toys_to_pick_from.length; button_num++){
            ButtonControllerArr.push(new QuestionItemButton(QuestionBoxContainerElem, array_all_toys_to_pick_from[button_num], that, false))
            //ButtonControllerArr.push(new QuestionBoxButton(QuestionBoxContainerElem, array_all_boxes_used_in_exp[button_num], that))
        }
    }

    this.toy_question_button_pressed = function(answer_given){

        if(type_of_question_currently_being_waited_for === "ask_item_in_box"){
            //Check if the answer is correct or not. If it is correct: go to the next step of the interation.
            //  If it is not correct: then increment the mistakes counter, give feedback and ask the question again.
            if(ItemAlreadyInBox.name === answer_given ){
                ButtonQuestionElem.remove()
                start_next_interaction_step()
            }else{
                //Increase the error count
                CollectedData.question_toy_in_box_error_count++
                CollectedData.question_toy_mistakes.push(JSON.parse(JSON.stringify(answer_given)))

                //Disable all buttons
                for(let i = 0;i<ButtonControllerArr.length; i++){
                    ButtonControllerArr[i].disable()
                }

                ButtonQuestionForeignElem.style.opacity = 0

                PromptCont.show_message("Oops! You picked the wrong toy!")

                setTimeout(function(){
                    PromptCont.show_message( "Which toy is in the " + box_description + "?")

                    //Re-enable buttons
                    ButtonQuestionForeignElem.style.opacity = 1
                    for(let i = 0;i<ButtonControllerArr.length; i++){
                        ButtonControllerArr[i].enable()
                    }

                },step_time)


            }
        }

        if(type_of_question_currently_being_waited_for === "measure_partner" || type_of_question_currently_being_waited_for === "measure_self"){
            //Store the answer
            CollectedData.question_belief = answer_given
            ButtonQuestionElem.remove()
            start_next_interaction_step()
        }

        if(type_of_question_currently_being_waited_for === "select_toys_used_by_Fennimal"){
            //Check if the button was previously already pressed
            if(Question_WhichToysFennimal_Selected.includes(answer_given)){
                //Remove it from the array
                Question_WhichToysFennimal_Selected = Question_WhichToysFennimal_Selected.filter(function(e) { return e !== answer_given })
            }else{
                //Add it to the array
                Question_WhichToysFennimal_Selected.push(answer_given)

            }

            //Check the array length. If no items selected, then remove the continue button. Else, show the button
            if(Question_WhichToysFennimal_Selected.length > 0){
                Question_WhichToysFennimal_ConfirmButton.style.display = "inherit"
            }else{
                Question_WhichToysFennimal_ConfirmButton.style.display = "none"
            }

        }


    }
    //Open the box (no clicking required)

    // QUESTION WHICH TOYS LIKED BY FENNIMAL
    //////////////////////////////////////////
    function show_Fennimal_center_for_question(){
        if(typeof FenObj.name !=="undefined"){
            PromptCont.show_message( "Do you remember "+ FenObj.name +"?")
        }else{
            PromptCont.show_message("Do you remember this Fennimal?")
        }

        show_Fennimal_on_screen()

        //Move the Fennimal to the center of the screen.
        FennimalOnScreen.rescale(0.8)
        FennimalOnScreen.move_to_coords(508/2, 285/2 + 20 )


        //Continue to the next step
        setTimeout(function(){
            //ShownFennimalBodyObj.classList.remove("focus_element")
            //ShownFennimalHeadObj.classList.remove("focus_element")
            start_next_interaction_step()
        },step_time)

    }

    let Question_WhichToysFennimal_Selected, Question_WhichToysFennimal_ConfirmButton
    function ask_which_toys_liked_by_Fennimal(){
        if(typeof FenObj.name !=="undefined"){
            PromptCont.show_message( "Which toy(s) did you see "+ FenObj.name +" play with? (multiple answers possible)")
        }else{
            PromptCont.show_message("Which toy(s) did you see this Fennimal play with? (multiple answers possible)")
        }

        type_of_question_currently_being_waited_for = "select_toys_used_by_Fennimal"
        //For these questions, participants can potentially select multiple items. Therefore, we need a modification to the normal buttons.
        // In particular, we need to keep track of which icons are selected by the participant (and highlight them as feedback).
        // Then, instead of continuing once an icon has been pressed, we need to create a separate continue button.
        create_question_box(array_all_toys_to_pick_from.length,  QuestionBox_ItemQuestionDimensions)

        Question_WhichToysFennimal_Selected = []
        ButtonControllerArr = []
        for(let button_num =0; button_num< array_all_toys_to_pick_from.length; button_num++){
            ButtonControllerArr.push(new QuestionItemButton(QuestionBoxContainerElem, array_all_toys_to_pick_from[button_num], that, true))
            //ButtonControllerArr.push(new QuestionBoxButton(QuestionBoxContainerElem, array_all_boxes_used_in_exp[button_num], that))
        }

        //Creating the confirm button (but hiding it for now)
        Question_WhichToysFennimal_ConfirmButton = createSVGButtonElem((0.5*508)-(0.5*150), 250,150,30,"Confirm selection","instructions_button")
        Question_WhichToysFennimal_ConfirmButton.onclick = ask_which_toys_input_confirmed
        SVG_layer.appendChild(Question_WhichToysFennimal_ConfirmButton)
        Question_WhichToysFennimal_ConfirmButton.style.display = "none"

    }

    function ask_which_toys_input_confirmed(){
        ButtonQuestionElem.remove()
        Question_WhichToysFennimal_ConfirmButton.remove()
        CollectedData.selected_toys_used_Fennimal = JSON.parse(JSON.stringify(Question_WhichToysFennimal_Selected))
        trial_completed()
    }



    //OTHER
    //////////////
    function open_box(){
        BoxLid.style.opacity = 0
        box_is_open = true
        AudioController.play_box_sound(box_name)

        if(Param.show_Fennimal_name){
            PromptCont.show_message(FenObj.name + " opens the " + box_description )
        }else{
            PromptCont.show_message("The Fennimal opens the " + box_description )
        }

        setTimeout(function(){
            if(ItemAlreadyInBox !== false){
                PromptCont.show_message("There is a " + ItemAlreadyInBox.name + " in the " + box_description )
            }else{
                PromptCont.show_message("The "+ box_description + " is empty")
            }

        }, 0.5 * step_time)

        setTimeout(function(){
            start_next_interaction_step()
        },1.5*step_time)

    }

    //Instruct the participant to click to open the box
    function click_to_open_box(){
        PromptCont.show_message("Click to open the " + box_description)
        BoxLid.classList.add("focus_element")
        BoxLid.style.cursor ="pointer"
        BoxLid.onclick = open_box_clicked

    }
    function open_box_clicked(){
        BoxLid.onclick = null
        BoxLid.classList.remove("focus_element")
        BoxLid.style.opacity = 0
        BoxLid.style.cursor = "auto"
        box_is_open = true
        AudioController.play_box_sound(box_name)

        if(ItemAlreadyInBox !== false){
            PromptCont.show_message("There is a " + ItemAlreadyInBox.name + " in the " + box_description )
        }else{
            PromptCont.show_message("The "+ box_description + " is empty")
        }

        setTimeout(function(){
            start_next_interaction_step()
        },step_time)

    }

    //Closes the box (no clicking required)
    function close_box(){
        AudioController.play_box_sound(box_name)
        BoxLid.style.opacity = 1;
        box_is_open = false
        if(Param.show_Fennimal_name){
            PromptCont.show_message(FenObj.name + " closes the " + box_description )
        }else{
            PromptCont.show_message("The Fennimal closes the " + box_description )
        }

        setTimeout(function(){
            start_next_interaction_step()
        },step_time)
    }

    //Closes the box after a click
    function click_to_close_box(){
        PromptCont.show_message("Click to close the " + box_description)
        BoxFront.classList.add("focus_element")
        BoxBack.classList.add("focus_element")
        BoxFront.style.cursor ="pointer"
        BoxFront.onclick = close_box_clicked
    }
    function close_box_clicked(){
        AudioController.play_box_sound(box_name)
        BoxFront.onclick = null
        BoxFront.classList.remove("focus_element")
        BoxBack.classList.remove("focus_element")
        BoxFront.style.cursor ="auto"
        PromptCont.show_message("The " + box_description + " is closed")

        BoxLid.style.opacity = 1;
        box_is_open = false


        setTimeout(function(){
            start_next_interaction_step()
        },step_time)
    }

    // If there is an item in the box, this animates its removal.
    function discard_item_in_box(){
        if(ItemAlreadyInBox !== false){
            //Start the animation to remove the item
            ItemInBox_TranslationGroup.classList.add("discarded_item")

            //Set the description text
            if(Param.show_Fennimal_name){
                PromptCont.show_message(FenObj.name + " throws the " + ItemAlreadyInBox.name + " out of the " + box_description )
            }else{
                PromptCont.show_message( "The Fennimal throws the " + ItemAlreadyInBox.name + " out of the " + box_description )
            }

            //After the animation, remove all elements
            setTimeout(function(){
                start_next_interaction_step()
            },Math.min(2100, step_time))
        }
    }

    //Adds an additional translation group to the item in the box, translates it over to the Fennimal location
    function take_item_from_box(){
        //Set the description text
        if(Param.show_Fennimal_name){
            PromptCont.show_message(FenObj.name + " takes the " + ItemAlreadyInBox.name + " from the " + box_description )
        }else{
            PromptCont.show_message( "The Fennimal takes the " + ItemAlreadyInBox.name + " from the " + box_description )
        }

        FennimalOnScreen.move_relative(65,0)

        setTimeout(function(){
            ItemInBox_Take_From_Box_TranslationGroup.classList.add("item_taken_from_box")
        },600)

        setTimeout(function(){
            FennimalOnScreen.move_relative(-65,0)
        },1800)


        setTimeout(function(){
            start_next_interaction_step()
        },3000)
    }

    //Moves a new item from the Fennimal to the box
    function move_item_from_Fennimal_into_box(){
        if(Param.show_Fennimal_name){
            PromptCont.show_message(FenObj.name + " places the " + NewItemByFennimal.name + " in the "  + box_description )
        }else{
            PromptCont.show_message("The Fennimal places the " + NewItemByFennimal.name + " in the "  + box_description )
        }

        FennimalOnScreen.move_relative(65,0)
        ItemWithFennimalTranslationGroup.classList.add("item_moved_into_box")

        setTimeout(function(){

        },600)

        setTimeout(function(){
            FennimalOnScreen.move_relative(-65,0)
        },2000)


        setTimeout(function(){
            start_next_interaction_step()
        },3000)
    }

    function return_item_from_Fennimal_back_to_box(){
        if(Param.show_Fennimal_name){
            PromptCont.show_message(FenObj.name + " returns the " + ItemAlreadyInBox.name + " to the "  + box_description )
        }else{
            PromptCont.show_message("The Fennimal returns the " + ItemAlreadyInBox.name + " to the "  + box_description )
        }

        FennimalOnScreen.move_relative(65,0)
        ItemInBox_TranslationGroup.classList.add("item_moved_into_box" )

        setTimeout(function(){
            FennimalOnScreen.move_relative(-65,0)
        },2000)

        setTimeout(function(){
            start_next_interaction_step()
        },3000)

    }

    //Play with the item
    function play_with_item(which_item, duration){
        let TargetItemObj
        if(which_item === "new_item"){
            TargetItemObj = ItemWithFennimal_SVG_Obj
            //Set the description text
            if(Param.show_Fennimal_name){
                PromptCont.show_message(FenObj.name + " loves to play with the " + NewItemByFennimal.name  )
            }else{
                PromptCont.show_message( "The Fennimal loves to play with the " + NewItemByFennimal.name )
            }

            //Setting animation classes
            ItemWithFennimal_Play_TranslationGroup.classList.add("translation_"+NewItemByFennimal.name)
            ItemWithFennimal_Play_RotationGroup.classList.add("rotation_"+NewItemByFennimal.name)
            ItemWithFennimal_Play_RotationGroup.classList.add("rotation_"+NewItemByFennimal.name +"_new")
        }

        if(which_item === "box_item"){
            TargetItemObj = ItemInBox_SVG_Obj
            if(Param.show_Fennimal_name){
                PromptCont.show_message(FenObj.name + " loves to play with the " + ItemAlreadyInBox.name  )
            }else{
                PromptCont.show_message( "The Fennimal loves to play with the " + ItemAlreadyInBox.name  )
            }

            //Setting animation classes
            ItemInBox_Play_TranslationGroup.classList.add("translation_"+ItemAlreadyInBox.name)
            ItemInBox_Play_RotationGroup.classList.add("rotation_"+ItemAlreadyInBox.name)
            ItemInBox_Play_RotationGroup.classList.add("rotation_"+ItemAlreadyInBox.name +"_from_box")

        }

        //Showing the hearts
        setTimeout(function(){
            SmallIconGenerator = setInterval(function(){
                let random_x = randomIntFromInterval(-20,20)
                //let random_y = randomIntFromInterval(-20,20)
                let ItemViewBox = getViewBoxCenterPoint(TargetItemObj)

                let NewSymbol = new SmallFeedbackSymbol(ItemViewBox.x +  random_x , ItemViewBox.y -50  , "heart")
            },150)
        },50)

        setTimeout(function(){
            //Removing the playing animations
            if(which_item === "new_item"){
                ItemWithFennimal_Play_TranslationGroup.classList.remove("translation_"+NewItemByFennimal.name)
                ItemWithFennimal_Play_RotationGroup.classList.remove("rotation_"+NewItemByFennimal.name)
                ItemWithFennimal_Play_RotationGroup.classList.remove("rotation_"+NewItemByFennimal.name + "_new")
            }

            if(which_item === "box_item"){
                ItemInBox_Play_TranslationGroup.classList.remove("translation_"+ItemAlreadyInBox.name)
                ItemInBox_Play_RotationGroup.classList.remove("rotation_"+ItemAlreadyInBox.name)
                ItemInBox_Play_RotationGroup.classList.remove("rotation_"+ItemAlreadyInBox.name+"_from_box")

            }

            //Stop making new hearts
            clearInterval(SmallIconGenerator)


            start_next_interaction_step()
        }, duration)


    }

    //Shows the end of trial button
    function show_end_of_trial_button(){
        TrialCompletedButton = createSVGButtonElem((0.5*508)-(0.5*100), 250,100,30,"Continue","instructions_button")
        TrialCompletedButton.onclick = trial_completed
        SVG_layer.appendChild(TrialCompletedButton)
    }

    //STARTS
    start_next_interaction_step()


    //Removes the box from the screen. Call before deleting this controller
    //Informs the screen-controller that this trial has been completed
    function trial_completed(){
        remove_all_elements()

        PromptCont.hide()

        //Fade out Fennimal
        FennimalOnScreen.change_opacity(0)

        //Tell the SC that the trial has been completed
        setTimeout(function(){
            FennimalOnScreen.remove_from_SVG()
            ScreenController.trial_completed(CollectedData)


        },500)



    }

    function remove_all_elements(){
        if(typeof BoxLid !== "undefined"){
            BoxLid.style.display = "none"
            BoxFront.style.display = "none"
            BoxBack.style.display = "none"
        }
        if(typeof ItemInBox_TranslationGroup !== "undefined"){
            ItemInBox_TranslationGroup.remove()
        }

        if(typeof ItemWithFennimalTranslationGroup !== "undefined"){
            ItemWithFennimalTranslationGroup.remove()
        }

        if(typeof PartnerObjContainer !== "undefined"){
            PartnerObjContainer.remove()
        }

        if(typeof TrialCompletedButton !== "undefined"){
            TrialCompletedButton.remove()
        }


    }


}

QuestionBoxButton = function(HostElem, box_name, Contr){
    let disabled = false

    this.enable = function(){
        disabled = false
        BoxButton.style.cursor = "pointer"
    }
    this.disable = function(){
        disabled = true
        BoxButton.style.cursor = "auto"
    }

    let ButtonDims = {
        w: 57,
        h: 48
    }

    let BoxButton = document.getElementById("button_box_" + box_name ).cloneNode(true)

    //Create a new SVG element to hold all elements
    let SVGElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    SVGElem.setAttribute("width", ButtonDims.w)
    SVGElem.setAttribute("height", ButtonDims.h)
    SVGElem.classList.add("question_button_svg_elem")
    SVGElem.appendChild(BoxButton)

    HostElem.appendChild(SVGElem)

    //Setting styles
    BoxButton.style.cursor = "pointer"
    let BackgroundRect = BoxButton.getElementsByClassName("item_button_background_rect")[0]//ItemButton.getElementById("item_icon_" + ItemObj.name + "_background")
    BackgroundRect.classList.add("button_item_rect_inactive")

    BoxButton.onmouseenter = function(){
        BackgroundRect.classList.add("button_item_rect_active")
        BackgroundRect.classList.remove("button_item_rect_inactive")
    }
    BoxButton.onmouseleave= function(){
        BackgroundRect.classList.remove("button_item_rect_active")
        BackgroundRect.classList.add("button_item_rect_inactive")
    }
    BoxButton.onclick = function(){
        if(! disabled){
            Contr.box_question_button_pressed(box_name)
        }
    }


}

QuestionItemButton = function(HostElem, ItemObj, Contr, multiple_possible){

    this.enable = function(){
        disabled = false
        ItemButton.style.cursor = "pointer"
    }
    this.disable = function(){
        disabled = true
        ItemButton.style.cursor = "auto"
    }

    //The selected state only applies of multiple items are possible
    let selected_state = "inactive"
    function toggle_selected_state(){
        if(selected_state === "active"){
            selected_state = "inactive"
            BackgroundRect.classList.remove("button_item_rect_selected")

        }else{
            selected_state = "active"
            BackgroundRect.classList.add("button_item_rect_selected")
        }
    }

    let ButtonDims = {
        w: 57,
        h: 48
    }

    let ItemButton = document.getElementById("item_button_" + ItemObj.name ).cloneNode(true)

    //Create a new SVG element to hold all elements
    let SVGElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    SVGElem.setAttribute("width", ButtonDims.w)
    SVGElem.setAttribute("height", ButtonDims.h)
    SVGElem.classList.add("question_button_svg_elem")
    SVGElem.appendChild(ItemButton)

    HostElem.appendChild(SVGElem)

    //Coloring the items
    set_fill_color_to_list_of_SVG_Elem(ItemButton.getElementsByClassName("item_col_dark"), ItemObj.ColorScheme.dark_color)
    set_fill_color_to_list_of_SVG_Elem(ItemButton.getElementsByClassName("item_col_light"), ItemObj.ColorScheme.light_color)

    //Setting styles
    ItemButton.style.cursor = "pointer"
    let BackgroundRect = ItemButton.getElementsByClassName("item_button_background_rect")[0]//ItemButton.getElementById("item_icon_" + ItemObj.name + "_background")
    BackgroundRect.classList.add("button_item_rect_inactive")

    ItemButton.onmouseenter = function(){
        BackgroundRect.classList.add("button_item_rect_active")
        BackgroundRect.classList.remove("button_item_rect_inactive")
    }
    ItemButton.onmouseleave= function(){
        BackgroundRect.classList.remove("button_item_rect_active")
        BackgroundRect.classList.add("button_item_rect_inactive")
    }
    ItemButton.onclick = function(){
        Contr.toy_question_button_pressed(ItemObj.name)
        if(multiple_possible){
            toggle_selected_state()
        }
    }






}

BoxQuestionController_NoClue =function(ParentElem, self_or_other, box, ItemsArr, PromptCont, ScreenCont){
    let that = this

    //For flexible formatting, we stick all the buttons elements in a foreign element.
    let ForeignElemDimensions = {
        x: 29,
        y: 165,
        w: 450,
        h:110,
    }

    let QuestionElem, ForeignElem,ContainerElem, ButtonControllerArr = [],Background,
        BoxContainer, BoxFront, BoxLid, PartnerIcon,QuestionMark, QuestionMarkContainerTranslate, QuestionMarkContainerRotate, PartnerThoughtBubble
    function initialize_elem(){
        // Setting the parent element to visible
        ParentElem.style.display = "inherit"

        //Adding a background element
        Background = createNSElemWithDims('http://www.w3.org/2000/svg',"rect",  0, 0, "100%", "100%")
        Background.classList.add("question_background_rect")
        ParentElem.appendChild(Background)

        //Setting the prompt colors
        PromptCont.change_colors_to_default()

        //Create a new element to hold all the buttons and icons
        QuestionElem = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        ParentElem.appendChild(QuestionElem)

        ForeignElem = createNSElemWithDims('http://www.w3.org/2000/svg',"foreignObject",  ForeignElemDimensions.x, ForeignElemDimensions.y, ForeignElemDimensions.w, ForeignElemDimensions.h)
        ForeignElem.classList.add("box_question_foreign")
        QuestionElem.appendChild(ForeignElem)

        ContainerElem = document.createElement( 'div')
        ForeignElem.appendChild(ContainerElem)
        ContainerElem.classList.add("box_question_div_container")

        create_item_button_controllers()

        //Show the target box (only the lid and front)
        BoxContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        BoxFront = document.getElementById("box_"+ box + "_front").cloneNode(true)
        BoxFront.style.display ="inherit"
        BoxLid = document.getElementById("box_"+ box + "_lid").cloneNode(true)
        BoxLid.style.display = "inherit"

        BoxContainer.appendChild(BoxFront)
        BoxContainer.appendChild(BoxLid)
        ParentElem.appendChild(BoxContainer)

        //Adding the question mark
        QuestionMarkContainerTranslate =  document.createElementNS("http://www.w3.org/2000/svg", 'g')
        QuestionMarkContainerRotate=  document.createElementNS("http://www.w3.org/2000/svg", 'g')
        QuestionMark =document.getElementById("partner_question_mark").cloneNode(true)
        QuestionMarkContainerRotate.appendChild(QuestionMark)
        QuestionMarkContainerTranslate.appendChild(QuestionMarkContainerRotate)

        QuestionMark.classList.add("partner_question_mark")
        QuestionMarkContainerRotate.classList.add("shake_element")

        //Positioning the items for self v other questions
        if(self_or_other === "self"){
            BoxContainer.style.transform = "translate(-85px,-45px)"
            QuestionMarkContainerTranslate.style.transform = "translate(240px,65px)"
        }else{
            BoxContainer.style.transform = "translate(-20px,-45px)"
            PartnerIcon = document.getElementById("partner_icon").cloneNode(true)
            ParentElem.appendChild(PartnerIcon)
            PartnerIcon.style.transform = "translate(160px,40px)"
            QuestionMarkContainerTranslate.style.transform = "translate(120px,40px)"

            PartnerThoughtBubble = document.getElementById("partner_thought_bubble").cloneNode(true)
            ParentElem.appendChild(PartnerThoughtBubble)
            PartnerThoughtBubble.style.transform = "translate(105px,35px)"
            PartnerThoughtBubble.classList.add("partner_thought_bubble")


        }

        ParentElem.appendChild(QuestionMarkContainerTranslate)





    }

    function create_item_button_controllers(){
        for(let item_num =0; item_num< ItemsArr.length; item_num++){
            ButtonControllerArr.push(new QuestionItemButton(ContainerElem, ItemsArr[item_num], that, false))
        }
    }

    function delete_questions(){
        QuestionElem.remove()
        ButtonControllerArr = []
        Background.remove()
        PromptCont.hide()
        BoxContainer.remove()
        QuestionMarkContainerTranslate.remove()

        if(typeof PartnerIcon !== "undefined"){
            PartnerIcon.remove()
        }
        if(typeof PartnerThoughtBubble !== "undefined"){
            PartnerThoughtBubble.remove()
        }

    }

    //This is called by the button controller to indicate a response
    this.button_pressed = function(item_name){
        delete_questions()
        ScreenCont.box_question_answered(item_name)
    }

    //Initialize all the screen elements
    initialize_elem()

    //Ask the question
    if(self_or_other === "self"){
        PromptCont.show_message("Which toy is now in the " + Param.BoxDescriptions[box]+ "?")
    }else{
        PromptCont.show_message("Which toy does YOUR PARTNER believe to be in the " + Param.BoxDescriptions[box]+ "?")
    }





}

BoxQuestionController_Clue =function(ParentElem, array_all_boxes_used_in_exp, FenObj, self_or_other, box, ItemsArr, PromptCont, ScreenCont){
    let that = this

    //For flexible formatting, we stick all the buttons elements in a foreign element.
    let ForeignElemDimensions = {
        x: 29,
        y: 165,
        w: 450,
        h:110,
    }

    let QuestionElem, ForeignElem,ContainerElem, ButtonControllerArr = [],Background,
        BoxContainer, BoxFront, BoxLid, PartnerIcon,QuestionMark, QuestionMarkContainerTranslate, QuestionMarkContainerRotate, PartnerThoughtBubble
    function initialize_elem(){
        // Setting the parent element to visible
        ParentElem.style.display = "inherit"

        //Adding a background element
        Background = createNSElemWithDims('http://www.w3.org/2000/svg',"rect",  0, 0, "100%", "100%")
        Background.classList.add("question_background_rect")
        ParentElem.appendChild(Background)

        //Setting the prompt colors
        PromptCont.change_colors_to_default()

        //Create a new element to hold all the buttons and icons
        QuestionElem = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        ParentElem.appendChild(QuestionElem)

        ForeignElem = createNSElemWithDims('http://www.w3.org/2000/svg',"foreignObject",  ForeignElemDimensions.x, ForeignElemDimensions.y, ForeignElemDimensions.w, ForeignElemDimensions.h)
        ForeignElem.classList.add("box_question_foreign")
        QuestionElem.appendChild(ForeignElem)

        ContainerElem = document.createElement( 'div')
        ForeignElem.appendChild(ContainerElem)
        ContainerElem.classList.add("box_question_div_container")

        create_item_button_controllers()

        //Show the target box (only the lid and front)
        BoxContainer = document.createElementNS("http://www.w3.org/2000/svg", 'g')
        BoxFront = document.getElementById("box_"+ box + "_front").cloneNode(true)
        BoxFront.style.display ="inherit"
        BoxLid = document.getElementById("box_"+ box + "_lid").cloneNode(true)
        BoxLid.style.display = "inherit"

        BoxContainer.appendChild(BoxFront)
        BoxContainer.appendChild(BoxLid)
        ParentElem.appendChild(BoxContainer)

        //Adding the question mark
        QuestionMarkContainerTranslate =  document.createElementNS("http://www.w3.org/2000/svg", 'g')
        QuestionMarkContainerRotate=  document.createElementNS("http://www.w3.org/2000/svg", 'g')
        QuestionMark =document.getElementById("partner_question_mark").cloneNode(true)
        QuestionMarkContainerRotate.appendChild(QuestionMark)
        QuestionMarkContainerTranslate.appendChild(QuestionMarkContainerRotate)

        QuestionMark.classList.add("partner_question_mark")
        QuestionMarkContainerRotate.classList.add("shake_element")

        //Positioning the items for self v other questions
        if(self_or_other === "self"){
            BoxContainer.style.transform = "translate(-85px,-45px)"
            QuestionMarkContainerTranslate.style.transform = "translate(240px,65px)"
        }else{
            BoxContainer.style.transform = "translate(-20px,-45px)"
            PartnerIcon = document.getElementById("partner_icon").cloneNode(true)
            ParentElem.appendChild(PartnerIcon)
            PartnerIcon.style.transform = "translate(160px,40px)"
            QuestionMarkContainerTranslate.style.transform = "translate(120px,40px)"

            PartnerThoughtBubble = document.getElementById("partner_thought_bubble").cloneNode(true)
            ParentElem.appendChild(PartnerThoughtBubble)
            PartnerThoughtBubble.style.transform = "translate(105px,35px)"
            PartnerThoughtBubble.classList.add("partner_thought_bubble")


        }

        ParentElem.appendChild(QuestionMarkContainerTranslate)





    }

    function create_item_button_controllers(){
        for(let item_num =0; item_num< ItemsArr.length; item_num++){
            ButtonControllerArr.push(new QuestionItemButton(ContainerElem, ItemsArr[item_num], that, false))
        }
    }

    function delete_questions(){
        QuestionElem.remove()
        ButtonControllerArr = []
        Background.remove()
        PromptCont.hide()
        BoxContainer.remove()
        QuestionMarkContainerTranslate.remove()

        if(typeof PartnerIcon !== "undefined"){
            PartnerIcon.remove()
        }
        if(typeof PartnerThoughtBubble !== "undefined"){
            PartnerThoughtBubble.remove()
        }

    }

    //This is called by the button controller to indicate a response
    this.button_pressed = function(item_name){
        delete_questions()
        ScreenCont.box_question_answered(item_name)
    }

    //Initialize all the screen elements
    initialize_elem()

    //Ask the question
    if(self_or_other === "self"){
        PromptCont.show_message("Which toy is now in the " + Param.BoxDescriptions[box]+ "?")
    }else{
        PromptCont.show_message("Which toy does YOUR PARTNER believe to be in the " + Param.BoxDescriptions[box]+ "?")
    }





}


ScreenController = function(ExpCont, PromptCont){
    let that = this

    //Defining all SVG elements
    let SVG_layers = {
        ResponseButtons: document.getElementById("response_buttons"),
        BoxesAndItems: document.getElementById("boxes_and_items"),
        Fennimals: document.getElementById("Fennimals"),
        PartnerIcons: document.getElementById("partner_icons"),
        Locations: document.getElementById("World"),
        Skies: document.getElementById("Sky_Layer"),
        Instructions: document.getElementById("Instructions_Layer")
    }
    let SVGObjects = {
        LocationMask: document.getElementById("Fennimals_Mask_Layer"),
        LocationBoxLayer: document.getElementById("HUD_Layer"),
        LocationBox: document.getElementById("HUD_locator")
    }

    let FennimalsMask = document.getElementById("mask_Fennimals")
    FennimalsMask.style.transition = "all 500ms ease-in-out"

    //Keeping track of controllers for the boxes and items
    let ItemBoxCon,  QuestionCont

    //Hides all layers, Fennimals, boxes, locations, items
    function reset_all_SVG_elements(){
        //Hide all Layers
        for(let elem in SVG_layers){
            SVG_layers[elem].style.display = "none"
        }

        //Fennimals: show the two sublayers, but hide all elements
        document.getElementById("heads").style.display = "inherit"
        document.getElementById("bodies").style.display = "inherit"
        hide_Elem_by_class_name("Fennimal")

        //Boxes and item: hide all, but show sublayers
        document.getElementById("boxes_lids").style.display = "inherit"
        document.getElementById("boxes_front").style.display = "inherit"
        document.getElementById("boxes_back").style.display = "inherit"
        document.getElementById("items").style.display = "inherit"
        hide_Elem_by_class_name("box")
        hide_Elem_by_class_name("item")

        //Locations: show the mask, set the regions to visible but hide all locations
        //TODO: HUD
        SVGObjects.LocationMask.style.display = "inherit"
        document.getElementById("Regions_Layer").style.display = "inherit"

        hide_Elem_by_class_name("location")
        hide_Elem_by_class_name("location_sky")

        //Setting the mask to its default 0 opacity
        FennimalsMask.style.opacity = 0
        AudioController.stop_all_region_sounds()

    }

    //Shows a location name in the bottom corner. If set to false, hides this box
    function show_location_name(location_name, box_color, text_color){

        if(location_name === false){
            SVGObjects.LocationBox.style.display = "none"
        }else{
            SVGObjects.LocationBoxLayer.style.display = "inherit"
            SVGObjects.LocationBoxLayer.style.opacity = 1
            SVGObjects.LocationBox.style.display = "inherit"

            let Text = document.getElementById("HUD_locator_text")
            let Box = document.getElementById("HUD_locator_box")

            //Setting colors
            Text.style.fill = text_color
            Box.style.fill = box_color

            Text.style.opacity = 0

            let minwidth = 15
            Text.childNodes[0].innerHTML = location_name
            Text.style.transition = ""
            Text.style.opacity = 0

            Box.style.transition = "all 200ms ease-in-out"

            //First we are reducing the side of the box to the minimum
            setTimeout(function(){
                Box.setAttribute("width", minwidth)
                Text.style.transition = "all 300ms ease-in-out"
            },5)

            //Then we expand the box
            setTimeout(function(){
                Box.setAttribute("width", minwidth + Text.getBBox().width + 15)
            },205)

            //Then we show the text
            setTimeout(function(){
                Text.style.opacity = 1
            }, 405)

            //Later on, reset the transitions
            setTimeout(function(){
                Text.style.transition = ""
                Box.style.transition = ""
            }, 700)
        }

    }

    // Shows a location background
    function show_location(location_name, location_has_been_visited_before){
        // Show the background
        SVG_layers.Locations.style.display = "inherit"
        document.getElementById("location_" + location_name).style.display = "inherit"

        //Chang the prompt colors and show a message
        PromptCont.change_colors_based_on_location(location_name)
        if(location_has_been_visited_before){
            PromptCont.show_message("We are back at the " + Param.SubjectFacingLocationNames[location_name])
        }else{
            PromptCont.show_message("We are now at the " + Param.SubjectFacingLocationNames[location_name])
        }

        //Show the sky
        SVG_layers.Skies.style.display = "inherit"
        if(typeof Param.LocationData[location_name].sky !== "undefined"){
            document.getElementById(Param.LocationData[location_name].sky).style.display = "inherit"
        }

        //Optionally show the location tag
        if(Param.show_location_name){
            show_location_name(Param.SubjectFacingLocationNames[location_name], Param.LocationData[location_name].lighter_color + "ee", Param.LocationData[location_name].darker_color)
        }

        FennimalsMask.style.opacity = 0

        //Optionally play the background sound
        AudioController.play_region_sound(location_name)

    }

    //Show a new box on the screen
    function show_trial(box_name, FennimalObj, ItemAlreadyInBox, NewItemByFennimal, showPartner, special_trial_type, arr_items_to_show, AdditionalInfo ){
        //Making sure the layer is visible
        SVG_layers.BoxesAndItems.style.display = "inherit"

        //Show the location
        show_location(FennimalObj.location,FennimalObj.seen_before)

        setTimeout(function(){
            //Partially mask the location
            FennimalsMask.style.opacity = 0.9

            //Make suer that the Fennimals layer is visible
            SVG_layers.Fennimals.style.display = "inherit"

            //Figuring out some details about the to-be-shown trial
            ItemBoxCon = new TrialController(box_name,ExpCont.get_array_of_all_boxes_in_exp(),arr_items_to_show, FennimalObj, ItemAlreadyInBox, NewItemByFennimal, showPartner, PromptCont, that, special_trial_type, AdditionalInfo)

        },1500)
    }

    //Stores all relevant trial-level data.
    function store_trial_data(CollectedData){
        //Here we append a bunch of variables to the CollectedData object to facilitate analysis later.
        CollectedData.blocktype = currentblocktype
        CollectedData.trialtype = CurrentTrial.trial_type
        CollectedData.Fennimal = CurrentTrial.Fennimal

        CollectedData.NewItem = CurrentTrial.NewItem
        CollectedData.ItemInBox = CurrentTrial.ItemInBox
        CollectedData.box = CurrentTrial.box


        //For the measurement questions, store the correct answer and a boolean to denote whether the answer was correct
        if(currentblocktype === "questions"){
            CollectedData.correct_answer = CurrentTrial.correct_answer

            if(CurrentTrial.qtype === "other" || CurrentTrial.qtype === "self"){

                CollectedData.correct_answer_given = CurrentTrial.correct_answer === CollectedData.question_belief
                if(CurrentTrial.qtype === "other"){CollectedData.perspective = "partner"}
                if(CurrentTrial.qtype === "self"){CollectedData.perspective = "self"}

            }

            if(CurrentTrial.qtype === "items"){
                //Check if the correct number of items have been selected. If so, check if the correct items themselves have been selected.
                let correct = false
                if(CollectedData.selected_toys_used_Fennimal.length === CurrentTrial.correct_answer.length){
                    let wrong_item = false
                    for(let i = 0;i<CollectedData.selected_toys_used_Fennimal.length;i++){
                        if(! CurrentTrial.correct_answer.includes(CollectedData.selected_toys_used_Fennimal[i])){
                            wrong_item = true
                        }
                    }
                    if(! wrong_item){
                        correct = true
                    }
                }

                CollectedData.correct_answer_given = correct
            }

        }


        ExpCont.storeTrialData(JSON.parse(JSON.stringify(CollectedData)))

    }

    this.trial_completed = function(CollectedData){
        //Animate out the Fennimal and the location
        SVGObjects.LocationBoxLayer.style.opacity = 0

        FennimalsMask.style.opacity = 1

        //Store the trial-level data
        store_trial_data(CollectedData)

        setTimeout(function(){
            reset_all_SVG_elements()
            show_next_trial()}, 500)
    }

    // QUESTION FUNCTIONS
    function ask_box_question(self_or_other, box, ItemsArr){
        //Show the page and create an element to hold the question
        QuestionCont = new BoxQuestionController_NoClue(SVG_layers.BoxesAndItems, self_or_other, box, ItemsArr, PromptCont, that)
    }

    this.box_question_answered =function (answer){
        CurrentTrial.answer_given = answer

        setTimeout(function(){
            show_next_trial()
        },500)

    }

    // INSTRUCTION SCREEN FUNCTIONS
    let CurrentInstructionsPage = false, RemainingTrials = false, currentblocktype, CurrentTrial, CurrentBlockData
    function delete_instructions_page(){
        if(CurrentInstructionsPage !== false){
            CurrentInstructionsPage.remove()
            CurrentInstructionsPage = false
        }
    }

    function show_instructions_page(){
        //Delete any previous instructions and create a new instructions object
        delete_instructions_page()

        //Showing the instructions layer
        SVG_layers.Instructions.style.display = "inherit"

        //Creating a container to hold all the instructions elements
        CurrentInstructionsPage = createInstructionContainer()
        SVG_layers.Instructions.appendChild(CurrentInstructionsPage)

        //Retrieving the correct title and text
        let PageInstructions = ExpCont.get_instruction_text_object(currentblocktype)

        //Adding the title, text and continue-button
        CurrentInstructionsPage.appendChild(createInstructionTitleElem(PageInstructions.title))
        CurrentInstructionsPage.appendChild(createTextField(20,30,508 - 2*20,200, PageInstructions.text))
        let Button = createSVGButtonElem((0.5*508)-(0.5*100), 250,100,30,"Continue","instructions_button")

        CurrentInstructionsPage.appendChild(Button)

        if(currentblocktype === "fullscreen"){
            Button.addEventListener("mousedown", toggleFullscreen)
            Button.addEventListener("mousedown", instructions_button_pressed)
        }else{
            Button.onclick = instructions_button_pressed
        }


    }

    this.show_payment_page = function(){
        currentblocktype = "payment"
        show_instructions_page()
    }

    function show_next_trial(){

        //Loading in next trial
        if(RemainingTrials.length > 0){
            CurrentTrial = RemainingTrials.shift()

            //Figuring out smoe details about which sort of trial to show.
            let special_trial_type = false, items_to_show, AdditionalInfo = false
            if(currentblocktype ==="private_repeat" || currentblocktype === "public_repeat") { special_trial_type = "repeat"}
            if(currentblocktype === "questions"){
                if(CurrentTrial.qtype === "other") {special_trial_type = "measure_partner"}
                if(CurrentTrial.qtype === "self") {special_trial_type = "measure_self"}
                if(CurrentTrial.qtype === "items") {special_trial_type = "items";}

            }

            if(currentblocktype === "public" || currentblocktype === "public_repeat"){
                items_to_show = ExpCont.get_array_of_all_toys_in_public_phase()
            } else{
                items_to_show = ExpCont.get_array_of_all_toys_in_exp()
            }

            shuffleArray(items_to_show)

            //Show the trial
            show_trial(CurrentTrial.box,CurrentTrial.Fennimal, CurrentTrial.ItemInBox,CurrentTrial.NewItem,currentblocktype ==="public" || currentblocktype === "public_repeat", special_trial_type, items_to_show, false)
            //ask_box_question(CurrentTrial.qtype,CurrentTrial.box, CurrentTrial.ItemArr)


        }else{
            //Block completed!
            ExpCont.block_completed()
        }


    }

    function instructions_button_pressed(){
        delete_instructions_page()
        SVG_layers.Instructions.style.display = "none"

        if(RemainingTrials !== false  && typeof RemainingTrials !== "undefined"){
            show_next_trial()
        }else{
            ExpCont.block_completed()
        }

    }

    this.start_next_block = function(blocktype, Trials){
        currentblocktype = blocktype
        RemainingTrials = Trials
        CurrentBlockData = []
        CurrentTrial = false

        show_instructions_page()
    }


    //On initialization, hide all SVG layers
    function initialize(){
        reset_all_SVG_elements()
    }

    initialize()




    //TESTING
    /*

    setTimeout(function(){
        that.ask_box_question("other", "e", [Param.ItemData["ball"], Param.ItemData["bear"],  Param.ItemData["spinner"], Param.ItemData["duck"], Param.ItemData["boomerang"] , Param.ItemData["shovel"] , Param.ItemData["trumpet"], Param.ItemData["plane"], Param.ItemData["car"]])
    },1000)


    show_location("Oasis")

    let TestFen = {
        name: "Testname",
        head: "B",
        body: "B",
        ColorScheme: {
            primary_color: "#AAAAAA",
            secondary_color: "#DDDDDD",
            tertiary_color: "#777777",
            eye_color: "#a7cdfe"
        }
    }


    setTimeout(function(){
        show_Fennimal(TestFen)
    },500)

    setTimeout(function(){
        show_trial("f", Param.ItemData["spinner"], Param.ItemData["ball"])
    }, 1000)

     */




}


