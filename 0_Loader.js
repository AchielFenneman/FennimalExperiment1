//Defining global variables here.
let GenParam, AudioCont, Interface, WorldState, topController;

// Auto cache-bust so GitHub Pages / browsers do not keep stale SVGs after a deploy.
// No need to bump this by hand — each page load requests a unique asset URL.
function assetUrl(path) {
    let sep = String(path).indexOf("?") >= 0 ? "&" : "?";
    return path + sep + "v=" + Date.now();
}

async function fetchAssetText(path) {
    let response = await fetch(assetUrl(path), { cache: "no-store" });
    if (!response.ok) {
        throw new Error("Failed to load asset " + path + " (" + response.status + ")");
    }
    return response.text();
}

//Defining extraction and loading functions
// Transforms the heads SVG data into an array of strings (one string per head)
async function extract_all_SVG_heads_to_array() {
    //Insert the SVG into a hidden element
    let HiddenDiv = document.createElement("div")
    HiddenDiv.style.display = "none"
    document.body.appendChild(HiddenDiv)

    const string = await fetchAssetText("./SVG/Heads.svg")
    HiddenDiv.innerHTML = string

    //Now transforming all elements to an array of strings (one element per head)
    let OutputArr = []
    let RawHeads = HiddenDiv.getElementsByClassName("Fennimal_head")

    for (let i = 0; i < RawHeads.length; i++) {
        set_Fennimal_color_classes(RawHeads[i])
        OutputArr.push(RawHeads[i])
    }

    //Transferring to the correct place in the main SVG.
    let SVG_Heads_Group = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    SVG_Heads_Group.id = "All_Heads"
    document.getElementById("Fennimal_Templates_Layer").appendChild(SVG_Heads_Group)

    for (let i = 0; i < OutputArr.length; i++) {
        SVG_Heads_Group.appendChild(OutputArr[i])
    }
    //Deleting the hidden DIV and returning the array
    HiddenDiv.remove()
}

async function extract_all_SVG_bodies_to_array() {
    //Insert the SVG into a hidden element
    let HiddenDiv = document.createElement("div")
    HiddenDiv.style.display = "none"
    document.body.appendChild(HiddenDiv)

    const string = await fetchAssetText("./SVG/Bodies.svg")
    HiddenDiv.innerHTML = string

    //Finding all bodies
    let BodiesArr = []
    let RawBodies = HiddenDiv.getElementsByClassName("Fennimal_body")

    //Setting correct colors
    for (let i = 0; i < RawBodies.length; i++) {
        set_Fennimal_color_classes(RawBodies[i])
        BodiesArr.push(RawBodies[i])
    }

    //Transferring to correct place in the main SVG
    let SVG_Bodies_Group = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    SVG_Bodies_Group.id = "All_Bodies"
    document.getElementById("Fennimal_Templates_Layer").appendChild(SVG_Bodies_Group)

    for (let i = 0; i < BodiesArr.length; i++) {
        SVG_Bodies_Group.appendChild(BodiesArr[i])
    }

    //Deleting the hidden DIV and returning the array
    HiddenDiv.remove()

}

async function extract_SVG_elements_by_type(path, source_class_name, new_layer_id, Parent ){
    //Creating a hidden div to contain the source SVG
    let HiddenDiv = document.createElement("div")
    HiddenDiv.style.display = "none"
    document.body.appendChild(HiddenDiv)

    const string = await fetchAssetText(path)
    HiddenDiv.innerHTML = string

    //Creating a new layer in the host
    let SVG_Group = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    SVG_Group.id = new_layer_id
    Parent.appendChild(SVG_Group)

    let RawArr = HiddenDiv.getElementsByClassName(source_class_name)
    while (RawArr.length > 0) {
        let el = RawArr[0];
        // Toyboxes are class="item toybox". If they ride along in the "item" extract they
        // land in #All_Items *and* a second copy is later placed in #All_Boxes. Paint
        // only hits All_Boxes; getElementById then returns the unpainted All_Items node
        // (yellow crate vs cyan-swapped crate). Skip them here so All_Boxes is canonical.
        if (source_class_name === "item" && el.classList && el.classList.contains("toybox")) {
            el.remove();
            continue;
        }
        SVG_Group.appendChild(el);
    }

    HiddenDiv.remove()
}

async function extract_player_SVG(){
    let HiddenDiv = document.createElement("div")
    HiddenDiv.style.display = "none"
    document.body.appendChild(HiddenDiv)

    const string = await fetchAssetText("./SVG/Player.svg")
    HiddenDiv.innerHTML  = string

    // Finding the target position in the main SVG
    let SVG_Target = document.getElementById("Map_player_level")
    let SVG_Target_Group = create_SVG_group(0,0,false,"PlayerIconResources")

    let Groups = HiddenDiv.getElementsByTagName("svg")[0].childNodes
    for(let i = 0; i < Groups.length; i++) {
        if(Groups[i].tagName === "g"){
            SVG_Target_Group.appendChild(Groups[i])
        }
    }

    //Finding the to-be-inserted SVG of the player icon
    SVG_Target.appendChild(SVG_Target_Group)

    HiddenDiv.remove()
}

async function load_additional_svg_assets(){
    // I previously added a placeholder element to this layer, to ensure it gets properly parsed by the optimizer
    document.getElementById("Fennimal_Templates_Layer").innerHTML = ""
    await extract_all_SVG_heads_to_array()
    await extract_all_SVG_bodies_to_array()
    await extract_SVG_elements_by_type("./SVG/Hats.svg", "hat", "All_Hats",document.getElementById("Fennimal_Templates_Layer") )
    await extract_SVG_elements_by_type("./SVG/Items.svg", "item", "All_Items",document.getElementById("Fennimal_Templates_Layer") )
    await extract_SVG_elements_by_type("./SVG/Items.svg", "misc", "Misc",document.getElementById("Fennimal_Templates_Layer") )
    await extract_SVG_elements_by_type("./SVG/Items.svg", "toybox", "All_Boxes",document.getElementById("Fennimal_Templates_Layer") )
    await extract_player_SVG()
}

// --- OPTIMIZATION: BAKE REGIONS TO RASTER ---
async function attempt_raster_swap_for_regions(regions_array) {
    let promises = regions_array.map(region => {
        return new Promise((resolve) => {
            let img = new Image();

            // IF THE PNG EXISTS:
            img.onload = () => {
                let bottomLayer = document.getElementById(`map_layer_${region}_bottom`);
                if (bottomLayer) {
                    // 1. Delete the millions of vector points
                    bottomLayer.innerHTML = "";

                    // 2. Create the SVG image tag
                    let svgImg = document.createElementNS("http://www.w3.org/2000/svg", 'image');
                    svgImg.setAttribute("href", assetUrl(`./Regions/${region}.png`));
                    svgImg.setAttribute("width", "1920"); // Assuming your master SVG viewbox is 1920x1080
                    svgImg.setAttribute("height", "1080");
                    svgImg.setAttribute("x", "0");
                    svgImg.setAttribute("y", "0");
                    svgImg.setAttribute("preserveAspectRatio", "none");

                    // 3. Drop it in!
                    bottomLayer.appendChild(svgImg);
                    console.log(`%c ✓ Raster optimization loaded for ${region}`, "color:teal");
                }
                resolve();
            };

            // IF THE PNG DOES NOT EXIST (or was deleted during dev):
            img.onerror = () => {
                console.log(`%c - Vector fallback used for ${region} (No PNG found)`, "color:gray");
                resolve();
            };

            // Trigger the network request to check for the file
            img.src = assetUrl(`./Regions/${region}.png`);
        });
    });

    // Wait for all image checks to finish before continuing the boot sequence
    await Promise.all(promises);
}

//This sets all the global variables
async function set_all_global_variables(){
    //Loading SVG Elements
    //SVG_loader = new SVG_LOADER()

    //Creating a General Parameters object
    GenParam = new GENERALPARAM()

    //Creating an audio controller
    AudioCont = new AudioControllerObject()

    //Creating an interface controller
    Interface = new InterfaceController()

    WorldState = new WorldStateObject()

    // Module scripts are deferred; wait briefly so Firebase helpers are on window.
    await waitForFirebaseSessionHelpers();

    // Layer 1: resolve PID claim before building / randomizing the experiment world
    let earlySession = { mode: "anonymous", sessionId: String(Date.now()) };
    if (typeof window.resolveParticipantSessionClaim === "function") {
        try {
            earlySession = await window.resolveParticipantSessionClaim();
        } catch (err) {
            console.warn("Session claim lookup failed; continuing as new session", err);
            let pid = null;
            try {
                let raw = new URL(window.location.href).searchParams.get("PROLIFIC_PID");
                pid = raw ? raw.substring(0, 10) : null;
            } catch (e) { /* ignore */ }
            earlySession = { mode: "new", pid: pid, sessionId: String(Date.now()) };
        }
    }

    if (earlySession.mode === "blocked_completed") {
        showParticipantBlockedScreen(earlySession.message);
        return;
    }

    if (earlySession.expCode) {
        window.__FORCE_EXPERIMENT_CODE__ = earlySession.expCode;
    }

    topController = new ExperimentController();
    await topController.finalizeSession(earlySession);
    topController.startExperiment();
}

async function waitForFirebaseSessionHelpers(timeoutMs = 8000) {
    let start = Date.now();
    while (typeof window.resolveParticipantSessionClaim !== "function") {
        if (Date.now() - start > timeoutMs) {
            console.warn("Firebase session helpers not ready; session lock may be inactive this load");
            return false;
        }
        await new Promise((resolve) => setTimeout(resolve, 40));
    }
    return true;
}

function showParticipantBlockedScreen(message) {
    let overlay = document.createElement("div");
    overlay.id = "session_blocked_overlay";
    overlay.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:99999",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "padding:32px",
        "box-sizing:border-box",
        "background:#f7f4ef",
        "font-family:'Source Sans 3', 'PT Sans', sans-serif",
        "color:#1f2a33"
    ].join(";");

    let card = document.createElement("div");
    card.style.cssText = [
        "max-width:640px",
        "width:100%",
        "background:#fff",
        "border:1px solid #d7d2c8",
        "padding:36px 40px",
        "line-height:1.5"
    ].join(";");

    let title = document.createElement("h1");
    title.textContent = "Study already completed";
    title.style.cssText = "margin:0 0 16px 0;font-size:28px;font-weight:700;";

    let body = document.createElement("p");
    body.textContent = message || "You have already completed this study.";
    body.style.cssText = "margin:0;font-size:18px;";

    card.appendChild(title);
    card.appendChild(body);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
}

//This object loads all the location images to their correct place (called after stimulus determination)
ImageLoader = function(Array_of_visited_regions_and_locations, LocationHolderElem){

    for(let i = 0; i < Array_of_visited_regions_and_locations.length; i++){
        let locationName = Array_of_visited_regions_and_locations[i][0];
        let regionName = Array_of_visited_regions_and_locations[i][1];
        if (document.getElementById("location_" + locationName)) continue;

        let NewGroup = create_SVG_group(0,0,"location","location_" + locationName )
        let Img = document.createElementNS("http://www.w3.org/2000/svg", 'image')
        set_location_background_image(Img, regionName, locationName)
        Img.setAttribute("width", "100%")
        Img.setAttribute("height", "100%")
        Img.setAttribute('preserveAspectRatio', 'none')

        NewGroup.appendChild(Img)
        //let NewImg = load_location_image(filename)

        LocationHolderElem.appendChild(NewGroup)
    }

}

//Loading the main SVG
async function loadMainElements(){
    try {
        //1. Loading main map elements
        const SVG_main_string = await fetchAssetText('./SVG/Main.svg')
        document.getElementById("Scannimals_container_div").innerHTML = SVG_main_string;
        document.getElementById("Scannimals_container_div").getElementsByTagName("svg")[0].id = "Scannimals_Task_SVG"

        await load_additional_svg_assets()

        // ----------------------------------------------------
        // 2. Attempt to swap heavy vectors for PNGs
        //  Looks in the Regions subfolder to see if there is a PNG for each region.
        //  If so, then swap the SVG for the map bottom layer of this region with the PNG.
        //  If no such file exists, keep the SVG.
        // ----------------------------------------------------
        let regions_to_check = ["North", "Jungle", "Desert", "Mountains", "Beach", "Flowerfields", "Village", "Swamp", "Home"];
        await attempt_raster_swap_for_regions(regions_to_check);



        //Setting all globals
        await set_all_global_variables()

    }
    catch (ex) {
        console.error("Error while loading assets: ", ex)
    }
}

loadMainElements()

//TODO:
//  re-enable quiz questions
//  SVG garbage collection (items, boxes, cc screen)
// Loading screen


//Adapt head sorting task to two rows if more than 4 regions selected
console.log("Ready new!")