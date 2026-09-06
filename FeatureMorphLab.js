/**
 * Feature Morph Lab — per-feature SVG path morphs (compose onto head later).
 */
(function () {
    "use strict";

    function bootError(message) {
        let el = document.getElementById("statusLine");
        if (el) el.textContent = message;
        console.error(message);
    }

    if (typeof MorphTaskController === "undefined") {
        bootError("Boot error: MorphTaskController not loaded.");
        return;
    }

    const DEFAULT_HEADS = ["tomato", "pig", "bell"];
    const DEFAULT_MIXES = [50, 55, 60, 65];
    const DEFAULT_ROLES = MorphTaskController.featureMorphRoles();

    function FeatureMorphLabRenderer() {
        this.params = Object.assign({}, (typeof GenParam !== "undefined" && GenParam.MorphTask) || {});
    }

    FeatureMorphLabRenderer.prototype = Object.create(MorphTaskController.prototype);
    FeatureMorphLabRenderer.prototype.constructor = FeatureMorphLabRenderer;

    function parseList(raw, fallback) {
        if (!raw || !String(raw).trim()) return fallback.slice();
        return String(raw)
            .split(/[,;\s]+/)
            .map((s) => s.trim().replace(/^Fennimal_head_/, ""))
            .filter(Boolean);
    }

    function parseMixes(raw) {
        let mixes = parseList(raw, DEFAULT_MIXES).map((s) => Number(s));
        mixes = mixes.filter((n) => Number.isFinite(n) && n >= 1 && n <= 99);
        mixes = mixes.filter((n, i) => mixes.indexOf(n) === i);
        mixes.sort((a, b) => a - b);
        return mixes.length ? mixes : DEFAULT_MIXES.slice();
    }

    function orderedPairs(heads) {
        let pairs = [];
        for (let i = 0; i < heads.length; i++) {
            for (let j = i + 1; j < heads.length; j++) {
                pairs.push([heads[i], heads[j]]);
            }
        }
        return pairs;
    }

    function ladderColumns(mixes) {
        let cols = [];
        let above = [];
        let below = [];
        let has50 = false;
        mixes.forEach((mix) => {
            if (mix === 50) {
                has50 = true;
                return;
            }
            if (mix > 50) above.push(mix);
            else below.push(mix);
        });
        above.sort((a, b) => b - a);
        below.sort((a, b) => b - a);
        above.forEach((mix) => {
            cols.push({ mix, target: "A", label: mix + "% \u2192 A" });
        });
        if (has50) cols.push({ mix: 50, target: null, label: "50 / 50" });
        below.forEach((mix) => {
            cols.push({ mix, target: "B", label: mix + "% \u2192 B" });
        });
        above.slice().reverse().forEach((mix) => {
            cols.push({ mix, target: "B", label: mix + "% \u2192 B" });
        });
        return cols;
    }

    async function loadHeadTemplates() {
        if (document.getElementById("All_Heads")) return;

        let ns = "http://www.w3.org/2000/svg";
        let svg = document.createElementNS(ns, "svg");
        svg.setAttribute("width", "0");
        svg.setAttribute("height", "0");
        svg.style.position = "absolute";
        svg.style.left = "-9999px";
        svg.style.top = "0";
        svg.style.overflow = "hidden";

        let templates = document.createElementNS(ns, "g");
        templates.id = "Fennimal_Templates_Layer";
        let allHeads = document.createElementNS(ns, "g");
        allHeads.id = "All_Heads";
        templates.appendChild(allHeads);
        svg.appendChild(templates);
        document.body.appendChild(svg);

        let hidden = document.createElement("div");
        hidden.style.display = "none";
        document.body.appendChild(hidden);

        let response = await fetch("./SVG/Heads.svg?v=" + Date.now(), { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load SVG/Heads.svg");
        hidden.innerHTML = await response.text();

        let raw = hidden.getElementsByClassName("Fennimal_head");
        let heads = [];
        for (let i = 0; i < raw.length; i++) {
            heads.push(raw[i]);
        }
        heads.forEach((head) => {
            if (typeof set_Fennimal_color_classes === "function") {
                set_Fennimal_color_classes(head);
            }
            allHeads.appendChild(head);
        });
        hidden.remove();
    }

    function assertHeadsExist(heads) {
        let missing = heads.filter((h) => !document.getElementById("Fennimal_head_" + h));
        if (missing.length) {
            throw new Error("Missing head template(s): " + missing.join(", "));
        }
    }

    function makeCell(labelText, svgNode) {
        let cell = document.createElement("div");
        cell.className = "morph-cell feature-morph-cell";
        let holder = document.createElement("div");
        holder.className = "feature-svg-holder";
        holder.appendChild(svgNode);
        cell.appendChild(holder);
        let label = document.createElement("div");
        label.className = "cell-label";
        label.textContent = labelText;
        cell.appendChild(label);
        return cell;
    }

    function parentFeatureSvg(renderer, headId, role, opts) {
        let trial = {
            targetFen: { id: headId, head: headId },
            otherFen: { id: headId, head: headId }
        };
        let schemes = renderer._schemesForMorphTrial(trial);
        let spec = renderer.buildFeatureMorphSpec(trial.targetFen, schemes.target, role);
        return renderer.renderFeatureMorphSvg(spec, spec, 0, opts);
    }

    async function buildGrid(options) {
        let renderer = new FeatureMorphLabRenderer();
        let gridRoot = document.getElementById("gridRoot");
        gridRoot.innerHTML = "";
        let pairs = orderedPairs(options.heads);
        let columns = ladderColumns(options.mixes);
        let roles = options.roles;
        let renderOpts = {
            frame: options.frame,
            showShell: options.showShell,
            shapeMode: options.shapeMode
        };

        let total = pairs.length * roles.length * (2 + columns.length);
        let done = 0;
        function tick(msg) {
            done++;
            options.onStatus("Rendering " + done + " / " + total + (msg ? " — " + msg : ""));
        }

        for (let pi = 0; pi < pairs.length; pi++) {
            let headA = pairs[pi][0];
            let headB = pairs[pi][1];
            let pairBlock = document.createElement("section");
            pairBlock.className = "pair-block";
            let title = document.createElement("h2");
            title.className = "pair-title";
            title.textContent = headA + " \u00d7 " + headB;
            pairBlock.appendChild(title);

            for (let ri = 0; ri < roles.length; ri++) {
                let role = roles[ri];
                let roleBlock = document.createElement("div");
                roleBlock.className = "method-block feature-role-block";

                let roleTitle = document.createElement("h3");
                roleTitle.className = "method-title";
                roleTitle.textContent = role;
                roleBlock.appendChild(roleTitle);

                let row = document.createElement("div");
                row.className = "ladder-row";

                let parentA = parentFeatureSvg(renderer, headA, role, renderOpts);
                tick(headA + " " + role);
                let parentB = parentFeatureSvg(renderer, headB, role, renderOpts);
                tick(headB + " " + role);

                row.appendChild(makeCell(headA, parentA));
                for (let ci = 0; ci < columns.length; ci++) {
                    let col = columns[ci];
                    let targetHead = col.target === "B" ? headB : headA;
                    if (col.mix === 50) targetHead = headA;
                    let svg = renderer.renderFeatureMorphForPair(
                        headA, headB, role, col.mix, targetHead, renderOpts
                    );
                    tick(col.label + " " + role);
                    row.appendChild(makeCell(col.label, svg));
                }
                row.appendChild(makeCell(headB, parentB));
                roleBlock.appendChild(row);
                pairBlock.appendChild(roleBlock);
            }
            gridRoot.appendChild(pairBlock);
        }

        options.onStatus("Done — " + pairs.length + " pair(s), " + roles.length + " feature(s).");
    }

    async function init() {
        if (typeof GenParam === "undefined") {
            window.GenParam = new GENERALPARAM();
        }

        let statusLine = document.getElementById("statusLine");
        let renderBtn = document.getElementById("renderBtn");

        statusLine.textContent = "Loading head templates…";
        try {
            await loadHeadTemplates();
            statusLine.textContent = "Ready. Each cell is a vector path morph for one feature.";
        } catch (err) {
            statusLine.textContent = "Failed to load heads: " + err.message;
            renderBtn.disabled = true;
            return;
        }

        renderBtn.addEventListener("click", async () => {
            renderBtn.disabled = true;
            try {
                let heads = parseList(document.getElementById("headsInput").value, DEFAULT_HEADS);
                let mixes = parseMixes(document.getElementById("mixesInput").value);
                let roles = [];
                document.querySelectorAll('input[name="role"]:checked').forEach((el) => {
                    roles.push(el.value);
                });
                if (!roles.length) roles = DEFAULT_ROLES.slice();
                assertHeadsExist(heads);
                await buildGrid({
                    heads,
                    mixes,
                    roles,
                    frame: document.getElementById("frameInput").value,
                    showShell: document.getElementById("shellInput").checked,
                    shapeMode: Number(document.getElementById("shapeModeInput").value),
                    onStatus: (msg) => { statusLine.textContent = msg; }
                });
            } catch (err) {
                console.error(err);
                statusLine.textContent = "Error: " + err.message;
            } finally {
                renderBtn.disabled = false;
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => init().catch((err) => bootError("Init failed: " + err.message)));
    } else {
        init().catch((err) => bootError("Init failed: " + err.message));
    }
})();
