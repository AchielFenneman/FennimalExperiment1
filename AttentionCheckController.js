// This object tracks the participant's time away from the window and idle time.
// Call to create at the start of the experiment, call at end the extract data.
let AttentionCheckController = function(exp_start_time, idle_time_minimum_threshold_seconds){
    //The controller can be set to start and stop recording at well. Notably, it should not record during instruction pages.
    let current_idle_time_recoding_state = "passive"
    this.toggle_recording_state = function(newstate){
        if(newstate === "passive" || newstate === "active"){
            current_idle_time_recoding_state = newstate
        }

        //Just for extra safety, reset the idle timer when the state is set to active
        if(newstate === "active"){
            idle_time_timer_start = Date.now()
        }

        console.log("Setting idle recording state to " + newstate)
    }

    //Output values
    let Window_out_of_focus_events_array = []
    let Idle_time_event_array = []

    let total_time_window_out_of_focus = 0
    let total_idle_time = 0

    //Functions for window-out-of-focus events
    let out_of_focus_start_time

    //Event listener for focus out
    window.addEventListener("blur", function (event) {
        out_of_focus_start_time = Date.now()
    })

    //Event listener for focus in
    window.addEventListener("focus", function (event) {
        Window_out_of_focus_events_array.push({
            start: Math.round((out_of_focus_start_time - exp_start_time ) / 1000) ,
            dur: Math.round((Date.now() - out_of_focus_start_time) / 1000)
        })
        total_time_window_out_of_focus = total_time_window_out_of_focus + Math.round((Date.now() - out_of_focus_start_time) / 1000)
    })

    //Functions for the idle time.
    //  This works by resetting a timer every time the mouse moves or a keyboard input is provided./
    //  Before resetting, tests the time elapsed on the timer. If it is more than a critical threshold, note it as an idle-time event.
    let idle_time_timer_start
    function reset_idle_time(){
        //Check how much time has elapsed since the last reset (and whether this reaches the minimum threshold)
        if( (Date.now() - idle_time_timer_start)> (idle_time_minimum_threshold_seconds *1000) ){
            //We have passed the threshold, so note an idle event
            if(current_idle_time_recoding_state === "active"){
                Idle_time_event_array.push({
                    start: Math.round((idle_time_timer_start - exp_start_time)/1000) ,
                    dur: Math.round((Date.now() - idle_time_timer_start) / 1000)
                })
                total_idle_time = total_time_window_out_of_focus + Math.round( (Date.now() - idle_time_timer_start) / 1000)
            }
        }

        //Resetting the idle timer
        idle_time_timer_start = Date.now()
    }

    window.addEventListener("keydown", function (event) {
        reset_idle_time()
    })
    window.addEventListener("mousemove", function (event) {
        reset_idle_time()
    })
    window.addEventListener("mousedown", function (event) {
        reset_idle_time()
    })

    //Call at the end of the experiment to get an overview of all collected metrics
    this.get_attention_rep = function(){
        return({
            total_time_window_out: total_time_window_out_of_focus,
            total_time_idle: total_idle_time,
            OutFocusEvents: Window_out_of_focus_events_array,
            IdleEvents: Idle_time_event_array,
            idle_time_threshold: idle_time_minimum_threshold_seconds
        })
    }

}