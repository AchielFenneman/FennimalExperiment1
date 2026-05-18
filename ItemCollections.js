ItemsCollectionFromWarehouseController = function(TaskData, outputfunc){
    console.log(TaskData)

    //The main elements are presented in the Fennimals layer
    let ParentLayer = document.getElementById("Fennimals_Layer")
    let Background, IntroMask, FocusMask,InteractionElements = {}, Settings, RemainingQuestionSteps, currentstep, partner_y_pos = 0.6 * GenParam.SVG_height,
        step_speed = 1000
    let current_partner_x_transform_value  = 0
    let CurrentQuestion, AllQuestions = []

    let MainContainer = create_SVG_group(0,0,undefined,undefined)
    ParentLayer.append(MainContainer)
    ParentLayer.style.display = "inherit"

    function show_background(){
        Background = document.createElementNS("http://www.w3.org/2000/svg", 'image')
        Background.setAttribute("href", "./Locations/Home_warehouse.png")
        Background.setAttribute("width", "100%")
        Background.setAttribute("height", "100%")
        Background.setAttribute('preserveAspectRatio', 'none')
        MainContainer.appendChild( Background )

        IntroMask = create_SVG_rect(0,0,GenParam.SVG_width, GenParam.SVG_height);
        IntroMask.style.fill = GenParam.RegionData["Home"].surrounding_color
        ParentLayer.appendChild(IntroMask)
    }

    function set_interface_elements(){
        if(typeof Interface.FenneFinder !== "undefined"){Interface.FenneFinder.hide()}

        Interface.player_moved_to_new_region("Home")
        Interface.Locator.change_locator_name("The Warehouse")
    }

    //Create the relevant SVG elements
    function fade_in_to_task(time){
        IntroMask.style.transition = "all " + time + "ms ease-in-out"
        setTimeout(function(){IntroMask.style.opacity = 0}, 100)
        setTimeout(function(){IntroMask.remove()}, 1.5*time)
    }

    function determine_task_settings(){
        Settings = {
            has_boxes: false,
            has_partner: false
        }

        //Check if this task includes boxes, partner
        for(let num in TaskData.questions){
            if(TaskData.questions[num].includes("partner")){Settings.has_partner = true}
            if(TaskData.questions[num].includes("toybox")){Settings.has_boxes = true}
        }

        //Shuffling here
        if(Settings.has_boxes){
            Settings.Boxes = shuffleArray(TaskData.question_options_toyboxes)
            Settings.options_toys = shuffleArray(TaskData.question_options_toys)
        }

        if(Settings.has_partner){
            Settings.partner = {
                name: WorldState.get_partner_icon_settings().name,
                type: WorldState.get_partner_icon_settings().type,
                colors: WorldState.get_partner_icon_settings().custom_color_scheme
            }
        }
    }

    function set_question_steps(){
        RemainingQuestionSteps = []
        for(let qnum = 0; qnum < TaskData.questions.length; qnum++){
            switch(TaskData.questions[qnum]){
                case("ask_partner_belief_toyboxes"):
                    for(let boxnum in TaskData.question_options_toyboxes){
                        let box = TaskData.question_options_toyboxes[boxnum]

                        RemainingQuestionSteps.push({type: "partner_moves_to_box", target: box  })
                        RemainingQuestionSteps.push({type: "partner_moves_box_to_backpack", target:box })
                        RemainingQuestionSteps.push({type: "ask_belief_partner_box", target: box })
                        RemainingQuestionSteps.push({type: "put_box_in_backpack", target: box })

                    }
                    break

            }
        }
    }

    function add_all_interaction_elements_on_screen(){
        add_items_on_screen()
        add_backpack_on_screen()
        add_partner_on_screen()
    }

    function add_backpack_on_screen(){
        InteractionElements.Backpack = copy_scale_and_move_object_to_position(document.getElementById("backpack"), MainContainer,0.1*GenParam.SVG_width, 0.78* GenParam.SVG_height, 3 )

        let Flaps = InteractionElements.Backpack.getElementsByClassName("backpack_flap")
        for(let i =0;i<Flaps.length;i++){
            if(Flaps[i].id === "backpack_flap_closed") {
                Flaps[i].style.opacity = 1
            }
            if(Flaps[i].id === "backpack_flap_open") {
                Flaps[i].style.opacity = 0
            }

            Flaps[i].style.transition = "all 500ms ease-in-out"
            Flaps[i].style.display = "inherit";
        }
    }

    function open_or_close_backpack(option){
        AudioCont.play_sound_effect("zipper")
        let Flaps = InteractionElements.Backpack.getElementsByClassName("backpack_flap")
        if(option === "open"){
            for(let i =0;i<Flaps.length;i++){
                if(Flaps[i].id === "backpack_flap_closed") {
                    Flaps[i].style.opacity = 0
                }
                if(Flaps[i].id === "backpack_flap_open") {
                    Flaps[i].style.opacity = 1
                }
            }
        }else{
            for(let i =0;i<Flaps.length;i++){
                if(Flaps[i].id === "backpack_flap_closed") {
                    Flaps[i].style.opacity = 1
                }
                if(Flaps[i].id === "backpack_flap_open") {
                    Flaps[i].style.opacity = 0
                }
            }

        }
    }

    function add_items_on_screen(){
        //Adding a table and backpack if required
        if(Settings.has_boxes){
            InteractionElements.Table = copy_scale_and_move_object_to_position(document.getElementById("table"), MainContainer,0.45*GenParam.SVG_width, 0.75* GenParam.SVG_height, 7 )

            //Finding table centerpoint and the corresponding locations for the boxes
            let CP = getViewBoxCenterPoint(InteractionElements.Table.getElementsByClassName("centerpoint")[0])
            let num_boxes_on_table = Settings.Boxes.length
            let xdelta = 0.125 * GenParam.SVG_width
            let AllPos = {
                1: [CP.x],
                2 : [CP.x - xdelta, CP.x + xdelta ],
                3 : [CP.x - 1.5*xdelta,CP.x, CP.x + 1.5*xdelta ],
                4 : [CP.x - 2*xdelta ,CP.x - 0.7*xdelta, CP.x + 0.7*xdelta,  CP.x + 2*xdelta ],
                5 : [CP.x - 2*xdelta, CP.x - 1*xdelta,CP.x, CP.x + 1*xdelta, CP.x + 2*xdelta ],
            }
            let pos_on_table = shuffleArray(AllPos[num_boxes_on_table])

            //Adding the boxes
            InteractionElements.Boxes = {}

            for(let boxnum =0; boxnum < Settings.Boxes.length; boxnum++){
                let BoxGroup = create_SVG_group(0,0,undefined,undefined);
                MainContainer.appendChild(BoxGroup)
                let BoxObj = copy_scale_and_move_object_to_position(document.getElementById("toybox_" + Settings.Boxes[boxnum]), BoxGroup,pos_on_table[boxnum], CP.y - 0.06* GenParam.SVG_height, 2.5 )

                InteractionElements.Boxes[Settings.Boxes[boxnum]] = BoxGroup
                InteractionElements.Boxes[Settings.Boxes[boxnum]].style.transition = "all " + (0.25 * step_speed) + "ms ease-in-out"


            }

        }

        FocusMask = create_SVG_rect(0,0,GenParam.SVG_width, GenParam.SVG_height)
        FocusMask.style.opacity = "0"
        FocusMask.style.fill = "white"
        FocusMask.style.transition = "all 200ms ease-in-out"

        MainContainer.appendChild(FocusMask)

    }

    function add_partner_on_screen(){
        InteractionElements.Partner = {}
        InteractionElements.Partner.IconLeft = WorldState.get_person_icon("partner", "left")
        InteractionElements.Partner.IconRight = WorldState.get_person_icon("partner", "right")

        InteractionElements.Partner.IconLeft.style.transform = "scale(26)"
        InteractionElements.Partner.IconRight.style.transform = "scale(26)"
        InteractionElements.Partner.Group  = create_SVG_group(0,0,undefined,undefined);
        InteractionElements.Partner.TranslateGroup  = create_SVG_group(0,0,undefined,undefined);

        InteractionElements.Partner.OutlineLeft = InteractionElements.Partner.IconLeft.getElementsByClassName("outline")[0]
        InteractionElements.Partner.OutlineRight = InteractionElements.Partner.IconRight.getElementsByClassName("outline")[0]
        InteractionElements.Partner.Group.appendChild(InteractionElements.Partner.IconLeft);
        InteractionElements.Partner.Group.appendChild(InteractionElements.Partner.IconRight);

        MainContainer.appendChild(InteractionElements.Partner.TranslateGroup);
        InteractionElements.Partner.TranslateGroup.appendChild(InteractionElements.Partner.Group);
        InteractionElements.Partner.OutlineLeft.style.strokeWidth = "2px"
        InteractionElements.Partner.OutlineRight.style.strokeWidth = "2px"

        moveSVGCenterTo(InteractionElements.Partner.Group, 0.89 * GenParam.SVG_width, partner_y_pos)


        InteractionElements.Partner.OutlineLeft.style.opacity = 0
        InteractionElements.Partner.OutlineRight.style.opacity = 0
        InteractionElements.Partner.IconRight.style.display = "none"

        InteractionElements.Partner.TranslateGroup.style.transition = "all " + step_speed + "ms ease-in-out"
    }

    function move_partner_to_object(Target){

        let targetPos = getViewBoxCenterPoint(Target)
        let offset = 250
        let x_delta =  Math.floor(getViewBoxCenterPoint(Target).x - getViewBoxCenterPoint(InteractionElements.Partner.Group).x) + offset

        let direction = "left"
        if(x_delta > 0) {direction = "right"}

        switch(direction){
            case "left":
                InteractionElements.Partner.IconRight.style.display = "none"
                InteractionElements.Partner.IconLeft.style.display = "inherit"
                break
            case "right":
                InteractionElements.Partner.IconRight.style.display = "inherit"
                InteractionElements.Partner.IconLeft.style.display = "none"
                break
        }


        InteractionElements.Partner.TranslateGroup.style.transform = "translate(" + (current_partner_x_transform_value + x_delta) + "px, 0px)"
        current_partner_x_transform_value += x_delta

        setTimeout(function(){
            InteractionElements.Partner.IconRight.style.display = "none"
            InteractionElements.Partner.IconLeft.style.display = "inherit"
        }, step_speed)





    }

    function move_partner_and_box_to_backpack(Box){
        //First move the box up
        Box.animate([
            { transform: 'translate(00px, -100px)' } // Ending state
        ], { duration: 0.25 * step_speed, easing: 'ease-in-out', fill: 'forwards'   });
        MainContainer.appendChild(Box)

        let BoxOutline = Box.getElementsByClassName("box_outline_group")[0].getElementsByClassName("box_outline")[0]
        BoxOutline.style.display = "inherit"
        BoxOutline.classList.add("focus_on_SVG_outline")
        BoxOutline.style.strokeWidth = "8px"
        let boxname = Box.getElementsByClassName("toybox")[0].id.split("_")[1]
        AudioCont.play_sound_effect("box_open_" + boxname)

        //Then move the box over
        setTimeout(function(){
            let targetPos = getViewBoxCenterPoint(InteractionElements.Backpack)
            let offset = 200
            let x_delta =  Math.floor(getViewBoxCenterPoint(InteractionElements.Backpack).x - getViewBoxCenterPoint(InteractionElements.Partner.Group).x) + offset

            move_partner_to_object(InteractionElements.Backpack)
            Box.animate([
                { transform: "translate(" + x_delta + "px, -100px)" } // Ending state
            ], { duration: step_speed, easing: 'ease-in-out', fill: 'forwards' });


            setTimeout(function(){
                execute_next_step()
            }, 1.1* step_speed)

        }, 0.3 * step_speed)


    }

    function get_array_of_toy_SVGs_from_arr_of_names(arr_of_names, shuffle){
        let Arr = []
        for(let toynum = 0; toynum < arr_of_names.length; toynum++){
            //Getting the correct SVG
            let SVG =  document.getElementById("toy_" + arr_of_names[toynum]).cloneNode(true);

            let LightElem = SVG.getElementsByClassName("item_col_light")
            for(let i =0;i<LightElem.length;i++){
                LightElem[i].style.fill = GenParam.ToyData[arr_of_names[toynum]].ColorScheme.light_color
            }

            let DarkElem = SVG.getElementsByClassName("item_col_dark")
            for(let i =0;i<DarkElem.length;i++){
                DarkElem[i].style.fill = GenParam.ToyData[arr_of_names[toynum]].ColorScheme.dark_color
            }
            SVG.style.display = "inherit"
            Arr.push({name: arr_of_names[toynum], SVG: SVG})
        }
        if(shuffle){
            return(shuffleArray(Arr))
        }else{
            return(Arr)
        }
    }

    function ask_partner_belief_in_contents_box(boxname){
        CurrentQuestion = {
            type: "ask_partner_belief_in_contents_box",
            target: boxname,
            options: [],
            startTime: Date.now()
        }

        //Setting (and shuffling) the toy options
        const ToyOptions = get_array_of_toy_SVGs_from_arr_of_names(Settings.options_toys, true)
        CurrentQuestion.options = get_all_values_in_array_of_objects("name", ToyOptions)

        InteractionElements.Boxes[boxname].getElementsByClassName("scale_group")[0].animate([
            { transform: "scale(3.5)" } // Ending state
        ], { duration: 0.25 * step_speed, easing: 'ease-in-out', fill: 'forwards'   });

        Interface.Prompt.show_message("What toy does " + Settings.partner.name.toUpperCase() + "  think is currently in the " +  GenParam.get_box_printed_name(boxname) + "?")
        const bubble_center = {x: 0.45 * GenParam.SVG_width, y: 0.3 * GenParam.SVG_height}

        InteractionElements.QuestionBubble = create_SVG_group(0,0)
        MainContainer.appendChild(InteractionElements.QuestionBubble)
        copy_scale_and_move_object_to_position(document.getElementById("partner_thought_bubble_left"),InteractionElements.QuestionBubble,bubble_center.x, bubble_center.y, "4")

        const OutlineElem = InteractionElements.QuestionBubble.getElementsByClassName("partner_thought_bubble_outline")[0]
        const Qmark = InteractionElements.QuestionBubble.getElementsByClassName("partner_thought_bubble_questionmark")[0]
        const ScaleGroup = InteractionElements.QuestionBubble.getElementsByClassName("scale_group")[0]
        OutlineElem.classList.add("focus_on_SVG_outline")
        OutlineElem.style.strokeWidth = "5px"
        OutlineElem.style.fill = "#FFFFFFAA"
        Qmark.classList.add("focus_on_SVG_fill")
        ScaleGroup.classList.add("scale_pulse_qmark")
        OutlineElem.style.opacity = 1
        Qmark.style.opacity = 1

        //Creating the questionbar
        FocusMask.style.opacity = 0.6
        const QuestionBarSettings = {
            top_y: 0.60 * GenParam.SVG_height,
            height: 0.28 * GenParam.SVG_height,
            backgroundcolor: "gold"//"#faf8eb"
        }
        InteractionElements.QuestionBar = new QuestionBar(MainContainer, ToyOptions, QuestionBarSettings,TaskData.bonus_stars_per_correct_answer, question_answered)

    }

    function question_answered(answer){
        InteractionElements.QuestionBar.collapse_bar()
        InteractionElements.QuestionBubble.remove()
        delete InteractionElements.QuestionBubble
        FocusMask.style.opacity = 0
        CurrentQuestion.answer = answer

        CurrentQuestion.correct_answer = WorldState.get_partner_belief_in_box_contents(CurrentQuestion.target)
        CurrentQuestion.is_correct = CurrentQuestion.answer === CurrentQuestion.correct_answer
        CurrentQuestion.time = Date.now() - CurrentQuestion.startTime
        delete CurrentQuestion.startTime
        AllQuestions.push(JSON.parse(JSON.stringify(CurrentQuestion)))

        CurrentQuestion = {}
        setTimeout(function(){
            InteractionElements.QuestionBar.remove()
        },500)
        execute_next_step()
    }

    function put_box_in_backpack(Box){
        //This assumes that the box is already positioned near the backpack
        let targetPos = getViewBoxCenterPoint(InteractionElements.Backpack)
        let CurrentPos = getViewBoxCenterPoint(Box)
        let dx = CurrentPos.x - targetPos.x
        let dy =  targetPos.y - CurrentPos.y

        let TG = Box.getElementsByClassName("main_translate_group")[0]
        TG.style.transition = "all 500ms ease-in-out"
        TG.style.transform = TG.style.transform + " " + "translate(" + dx + "px, " + dy + "px)"

        Box.getElementsByClassName("scale_group")[0].animate([
            { transform: "scale(2)" } // Ending state
        ], { duration: 500, easing: 'ease-in-out', fill: 'forwards'   });

        TG.style.opacity = 0

        setTimeout(function(){
            Box.remove()
            execute_next_step()
        },550)


    }

    function task_finished(){
        //Close the backpack
        Interface.Prompt.show_message("Great work! Now we've collected all items!")
        open_or_close_backpack("close")
        InteractionElements.Partner.TranslateGroup.style.transition = "all 500ms ease-in-out"

        //Move backpack to player
        let TargetPos = getSVGInternalCenter(InteractionElements.Partner.Group)
        let CurrentPos = getSVGInternalCenter(InteractionElements.Backpack)
        let dx =  TargetPos.x - CurrentPos.x + 100
        let dy =  CurrentPos.x - TargetPos.y + 300
        MainContainer.appendChild(InteractionElements.Backpack)

        setTimeout(function(){
            InteractionElements.Backpack.style.transition = "all 500ms ease-in-out"
            InteractionElements.Backpack.style.transform = InteractionElements.Backpack.style.transform + " " + "translate(" + dx + "px, " + dy + "px)"
        }, 50)

        //Move the partner out with the backpack
        setTimeout(function(){
            InteractionElements.Partner.TranslateGroup.style.transform = InteractionElements.Partner.TranslateGroup.style.transform + " " + "translate(-700px, 0 )"
            InteractionElements.Backpack.style.transform = InteractionElements.Backpack.style.transform + " " + "translate(-700px, 0)"
        }, 600)

        //Fade out
        setTimeout(function(){
            let Rect = create_SVG_rect(0,0,GenParam.SVG_width, GenParam.SVG_height)
            Rect.style.transition = "all 500ms ease-in-out"
            Rect.style.opacity = 0
            Rect.style.fill = GenParam.RegionData["Home"].surrounding_color
            MainContainer.appendChild(Rect)
            setTimeout(function(){
                Rect.style.opacity = 1
                Interface.Prompt.hide()
            },100)
        },650)


        setTimeout(function(){
            MainContainer.remove()
            return_data()
        }, 1600)
    }

    function execute_next_step(){
        if(RemainingQuestionSteps.length === 0){
            Interface.Prompt.hide()
            setTimeout(function(){
                task_finished()
            }, 400)
        }else{
            currentstep = RemainingQuestionSteps.shift()
            console.log(currentstep)
            switch(currentstep.type){
                case("partner_moves_to_box"):
                    setTimeout(function(){
                        execute_next_step()
                    }, 1.1*step_speed)
                    move_partner_to_object(InteractionElements.Boxes[currentstep.target])
                    Interface.Prompt.show_message(Settings.partner.name + " walks over to the " + GenParam.get_box_printed_name(currentstep.target))
                    break
                case("partner_moves_box_to_backpack"):
                    Interface.Prompt.show_message(Settings.partner.name + " brings the " + GenParam.get_box_printed_name(currentstep.target) + " to the backpack")
                    move_partner_and_box_to_backpack(InteractionElements.Boxes[currentstep.target])
                    break
                case("ask_belief_partner_box"):
                    ask_partner_belief_in_contents_box(currentstep.target)
                    break
                case("put_box_in_backpack"):
                    put_box_in_backpack(InteractionElements.Boxes[currentstep.target])
                    break
            }
        }
    }

    function return_data(){
        TaskData.Data = JSON.parse(JSON.stringify(AllQuestions))
        delete TaskData.question_options_toyboxes
        delete TaskData.question_options_toys
        delete TaskData.questions

        //Calculating number of bonus stars earned and the maximum earnable amount
        if(TaskData.bonus_stars_per_correct_answer !== false && typeof TaskData.bonus_stars_per_correct_answer !== "undefined"){
            TaskData.max_bonus_stars = TaskData.bonus_stars_per_correct_answer * TaskData.Data.length
        }

        //Calculating the number of bonus stars actually earned
        let num_stars_earned = 0
        for(let i = 0; i < TaskData.Data.length; i++){
            if(TaskData.Data[i].is_correct){
                num_stars_earned = num_stars_earned + TaskData.bonus_stars_per_correct_answer
            }
        }
        TaskData.bonus_stars_earned = num_stars_earned

        outputfunc(JSON.parse(JSON.stringify(TaskData)))
    }


    //On creation
    show_background()
    set_interface_elements()
    determine_task_settings()
    set_question_steps()
    add_all_interaction_elements_on_screen()
    Interface.Prompt.show_message("We are now in the warehouse")

    setTimeout(function(){
        open_or_close_backpack("open")
    }, 0.5*step_speed)

    setTimeout(function(){execute_next_step()}, 2 * step_speed)


    fade_in_to_task(750)
}