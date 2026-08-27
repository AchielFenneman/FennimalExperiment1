/**
 * Join tasks mixed onto HatBindingTaskController (exam / shipping / party).
 * Inclusive-OR hat selection: bound triad vs leftover unused arm.
 * Loaded after 4_HatBindingTask.js.
 */
(function () {
    if (typeof HatBindingTaskController === "undefined") {
        throw new Error("4_HatBindingJoinTasks.js must load after 4_HatBindingTask.js");
    }

    const P = HatBindingTaskController.prototype;

    P._joinCfg = function () {
        return (this.params && this.params.join) || {};
    };

    P._joinPlay = function (name) {
        if (typeof AudioCont !== "undefined") AudioCont.play_sound_effect(name);
    };

    P._joinEscape = function (s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    };

    P._joinDecap = function (s) {
        let t = String(s || "");
        if (!t) return t;
        return t.charAt(0).toLowerCase() + t.slice(1);
    };

    P._joinFeatureValue = function (fen, kind) {
        return this._normalizeFeatureId(kind, this._fenFeatureId(fen, kind));
    };

    P._joinFillTemplate = function (tmpl, map) {
        let out = String(tmpl || "");
        Object.keys(map).forEach((key) => {
            out = out.split("{" + key + "}").join(map[key]);
        });
        return out;
    };

    P._joinClauseHtml = function (kind, gistText) {
        let gist = "<i>" + this._joinEscape(this._joinDecap(gistText)) + "</i>";
        if (kind === "head") return "whose head is " + gist;
        if (kind === "region") return "who resides in " + gist;
        if (kind === "toy") return "who plays with a toy which is " + gist;
        if (kind === "hat") return "whose hat is " + gist;
        return gist;
    };

    P._joinWhoTailHtml = function (kind, gistText) {
        let gist = "<i>" + this._joinEscape(this._joinDecap(gistText)) + "</i>";
        if (kind === "head") return "has a head which is " + gist;
        if (kind === "region") return "resides in " + gist;
        if (kind === "toy") return "plays with a toy which is " + gist;
        if (kind === "hat") return "has a hat which is " + gist;
        return gist;
    };

    P._joinPromptHtml = function (gists) {
        let cfg = this._joinCfg();
        let tmpl = cfg.promptTemplate
            || "Please select the hat(s) of every Fennimal {clause1}, <b>and/or</b> every Fennimal who {who2}.";
        return this._joinFillTemplate(tmpl, {
            clause1: this._joinClauseHtml(gists[0].kind, gists[0].text),
            clause2: this._joinClauseHtml(gists[1].kind, gists[1].text),
            who2: this._joinWhoTailHtml(gists[1].kind, gists[1].text),
            gist2: "<i>" + this._joinEscape(this._joinDecap(gists[1].text)) + "</i>"
        });
    };

    P._joinPartyCaptionHtml = function (n, gists) {
        let cfg = this._joinCfg();
        let tmpl = cfg.partyCaptionTemplate
            || "Table {n}: {clause1}, <b>and/or</b> every Fennimal who {who2}";
        return this._joinFillTemplate(tmpl, {
            n: String(n),
            clause1: this._joinClauseHtml(gists[0].kind, gists[0].text),
            clause2: this._joinClauseHtml(gists[1].kind, gists[1].text),
            who2: this._joinWhoTailHtml(gists[1].kind, gists[1].text),
            gist2: "<i>" + this._joinEscape(this._joinDecap(gists[1].text)) + "</i>"
        });
    };

    P._joinStripHtml = function (s) {
        return String(s || "").replace(/<[^>]+>/g, "");
    };

    P._joinMatchingIds = function (valuesByKind) {
        let kinds = Object.keys(valuesByKind);
        return this.hatFens.filter((fen) => {
            return kinds.some((kind) => this._joinFeatureValue(fen, kind) === valuesByKind[kind]);
        }).map((fen) => fen.id);
    };

    P._joinBuildOneQuestion = function (role, valuesByKind) {
        let kinds = shuffleArray(Object.keys(valuesByKind).slice());
        if (kinds.length !== 2) this._fail("join questions need exactly two gist types.");
        let gists = kinds.map((kind) => {
            let value = valuesByKind[kind];
            if (!value) this._fail(`join ${role} is missing a ${kind} value.`);
            return {
                kind: kind,
                value: value,
                text: this._sampleGistText(kind, value)
            };
        });
        let correctIds = this._joinMatchingIds(valuesByKind);
        if (!correctIds.length) {
            this._fail(`join ${role} question matched no hats.`);
        }
        let promptHtml = this._joinPromptHtml(gists);
        let captionHtml = this._joinPartyCaptionHtml(1, gists);
        return {
            role: role,
            kinds: kinds.slice(),
            valuesByKind: Object.assign({}, valuesByKind),
            gists: gists,
            prompt: this._joinStripHtml(promptHtml),
            promptHtml: promptHtml,
            caption: this._joinStripHtml(captionHtml),
            captionHtml: captionHtml,
            correctIds: correctIds.slice(),
            hatOrder: shuffleArray(this.hatFens.map((fen) => fen.id))
        };
    };

    P._buildJoinQuestions = function () {
        let unused = this.graph.unusedArmIds || [];
        if (unused.length !== 1) {
            this._fail(
                `join tasks need exactly one leftover arm (got ${unused.length}: ${unused.join(", ")}).`
            );
        }
        let kinds = this.graph.joiningFeatureKinds;
        if (!kinds || kinds.length !== 2) {
            this._fail("join tasks need two joining feature kinds.");
        }
        let boundValues = {};
        kinds.forEach((kind) => {
            boundValues[kind] = this._joinFeatureValue(this.graph.hub, kind);
        });
        let leftover = this._getFen(unused[0], "unused arm");
        let unboundValues = {};
        kinds.forEach((kind) => {
            unboundValues[kind] = this._joinFeatureValue(leftover, kind);
        });

        let bound = this._joinBuildOneQuestion("bound", boundValues);
        let unbound = this._joinBuildOneQuestion("unbound", unboundValues);
        let overlap = bound.correctIds.filter((id) => unbound.correctIds.indexOf(id) >= 0);
        if (overlap.length) {
            this._fail(`join bound/unbound hat sets overlap (${overlap.join(", ")}).`);
        }
        if (this.hatFens.length === 4) {
            if (bound.correctIds.length !== 3) {
                this._fail(`join bound question should match 3 hats (got ${bound.correctIds.join(", ")}).`);
            }
            if (unbound.correctIds.length !== 1) {
                this._fail(`join unbound question should match 1 hat (got ${unbound.correctIds.join(", ")}).`);
            }
        }
        let questions = shuffleArray([bound, unbound]);
        questions.forEach((q, i) => {
            q.index = i;
            q.captionHtml = this._joinPartyCaptionHtml(i + 1, q.gists);
            q.caption = this._joinStripHtml(q.captionHtml);
            q.hatOrder = shuffleArray(this.hatFens.map((fen) => fen.id));
        });
        return questions;
    };

    P._joinQuestionMistakes = function (question, selectedIds) {
        let selected = selectedIds || [];
        let n = 0;
        this.hatFens.forEach((fen) => {
            let should = question.correctIds.indexOf(fen.id) >= 0;
            let isOn = selected.indexOf(fen.id) >= 0;
            if (should !== isOn) n += 1;
        });
        return n;
    };

    P._joinMistakeCount = function (questions, selectedByQ) {
        let total = 0;
        questions.forEach((q, i) => {
            total += this._joinQuestionMistakes(q, selectedByQ[i] || []);
        });
        return total;
    };

    P._joinGrade = function (mistakes) {
        if (mistakes <= 0) return { letter: "A+", line: "Perfect!" };
        if (mistakes === 1) return { letter: "B", line: "Almost there!" };
        if (mistakes <= 3) return { letter: "C", line: "Keep trying!" };
        return { letter: "F", line: "Please read\ncarefully!" };
    };

    P._joinFillTextLines = function (el, text) {
        if (!el) return;
        let x = el.getAttribute("x") || "0";
        let lines = String(text == null ? "" : text).split("\n");
        while (el.firstChild) el.removeChild(el.firstChild);
        lines.forEach((line, i) => {
            let tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            tspan.setAttribute("x", x);
            tspan.setAttribute("dy", i === 0 ? "0" : "1.15em");
            tspan.textContent = line;
            el.appendChild(tspan);
        });
    };

    P._joinTopBanner = function (parent, text) {
        if (!text) return null;
        let w = 0.72 * this.W;
        let h = 58;
        let x = (this.W - w) / 2;
        let y = 0.016 * this.H;
        let bg = create_SVG_rect(x, y, w, h);
        bg.setAttribute("rx", 16);
        bg.setAttribute("fill", "rgba(250, 246, 236, 0.94)");
        bg.setAttribute("stroke", "rgba(92, 74, 42, 0.55)");
        bg.setAttribute("stroke-width", "3");
        bg.style.pointerEvents = "none";
        parent.appendChild(bg);
        return this._joinForeignHtml(
            parent,
            x + 16,
            y + 6,
            w - 32,
            h - 12,
            this._joinEscape(text),
            {
                fontFamily: "Arial, sans-serif",
                fontSize: "28px",
                lineHeight: "1.2",
                textAlign: "center",
                fontWeight: "700",
                color: "#3b2f14"
            }
        );
    };

    P._joinSelectedFromCells = function (cells) {
        return (cells || []).filter((c) => c.selected).map((c) => c.fenId);
    };

    P._joinFenById = function (id) {
        return this.hatFens.find((fen) => fen.id === id) || this._getFen(id);
    };

    P._joinHatScale = function (flavour) {
        let cfg = this._joinCfg();
        if (flavour === "exam") return cfg.examHatScale != null ? cfg.examHatScale : 2.15;
        if (flavour === "shipping") return cfg.shippingHatScale != null ? cfg.shippingHatScale : 2.35;
        return this.params.hatScale || 3;
    };

    P._joinConfetti = function (x, y, count, parent) {
        if (typeof spawn_confetti_burst !== "function") return;
        spawn_confetti_burst(parent || this.ItemLayers.Plus2, x, y, {
            count: count != null ? count : 28,
            awaitPopMs: 0
        });
    };

    P._joinSuccessBeat = async function (flavour) {
        let cfg = this._joinCfg();
        let ms = cfg.successBeatMs;
        if (flavour === "exam" && cfg.examSuccessBeatMs != null) ms = cfg.examSuccessBeatMs;
        await wait(ms != null ? ms : 1000);
    };

    P._joinForeignHtml = function (parent, x, y, w, h, html, style) {
        let fo = create_SVG_foreignElement(x, y, w, h);
        fo.style.pointerEvents = "none";
        let div = document.createElement("div");
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.boxSizing = "border-box";
        div.style.fontFamily = (style && style.fontFamily) || "Georgia, 'Times New Roman', serif";
        div.style.fontSize = (style && style.fontSize) || "22px";
        div.style.lineHeight = (style && style.lineHeight) || "1.35";
        div.style.color = (style && style.color) || "#1a1a1a";
        div.style.fontWeight = (style && style.fontWeight) || "500";
        div.style.textAlign = (style && style.textAlign) || "left";
        div.innerHTML = html;
        fo.appendChild(div);
        parent.appendChild(fo);
        return { fo: fo, div: div };
    };

    P._showJoinBubble = async function (text) {
        return new Promise((resolve) => {
            let group = create_SVG_group(0, 0, undefined, "hat_binding_join_bubble");
            this.ItemLayers.Plus2.appendChild(group);

            let catcher = create_SVG_rect(0, 0, this.W, this.H);
            catcher.setAttribute("fill", "#111");
            catcher.style.opacity = 0.18;
            catcher.style.pointerEvents = "all";
            group.appendChild(catcher);

            let panelW = 0.62 * this.W;
            let panelX = (this.W - panelW) / 2;
            let panel = create_SVG_rect(panelX, 0, panelW, 200);
            panel.setAttribute("rx", 42);
            panel.setAttribute("fill", "rgba(255, 252, 245, 0.97)");
            panel.setAttribute("stroke", "#3b2f14");
            panel.setAttribute("stroke-width", "5");
            group.appendChild(panel);

            let wrap = create_SVG_foreignElement(panelX + 36, 0, panelW - 72, 800);
            let div = document.createElement("div");
            div.style.width = "100%";
            div.style.fontFamily = "Arial, sans-serif";
            div.style.fontSize = "32px";
            div.style.lineHeight = "140%";
            div.style.color = "#3b2f14";
            div.style.textAlign = "center";
            div.innerHTML = this._joinEscape(text);
            wrap.appendChild(div);
            group.appendChild(wrap);

            let btnHolder = create_SVG_group(0, 0);
            let btn = create_SVG_buttonElement(this.W / 2, 0, 420, 72, "Continue", 26);
            btn.style.cursor = "pointer";
            btnHolder.appendChild(btn);
            group.appendChild(btnHolder);

            const layout = () => {
                void div.offsetHeight;
                let textH = Math.max(div.scrollHeight, 48);
                let padTop = 32;
                let padBot = 28;
                let btnH = 72;
                let panelH = padTop + textH + 20 + btnH + padBot;
                panelH = Math.min(panelH, 0.72 * this.H);
                let panelY = Math.max(0.16 * this.H, (this.H - panelH) / 2 - 20);
                panel.setAttribute("y", panelY);
                panel.setAttribute("height", panelH);
                wrap.setAttribute("y", panelY + padTop);
                wrap.setAttribute("height", textH);
                btnHolder.style.transform = "translate(0px, " + (panelY + panelH - padBot - btnH / 2) + "px)";
            };
            layout();
            requestAnimationFrame(layout);

            btn.onpointerdown = () => {
                btn.onpointerdown = null;
                this._joinPlay("button_click");
                if (group.parentNode) group.remove();
                resolve();
            };
        });
    };

    P._joinStatusBubble = function () {
        let cfg = this._joinCfg();
        let group = create_SVG_group(0, 0, undefined, "hat_binding_join_status");
        this.ItemLayers.Plus2.appendChild(group);
        let w = 0.62 * this.W;
        let x = (this.W - w) / 2;
        let y = (cfg.shippingErrorY != null ? cfg.shippingErrorY : 0.82) * this.H;
        let h = 64;
        let fadeMs = cfg.shippingErrorFadeMs != null ? cfg.shippingErrorFadeMs : 400;
        let holdMs = cfg.shippingErrorMs != null ? cfg.shippingErrorMs : 1000;
        let hideTimer = null;
        let rect = create_SVG_rect(x, y, w, h);
        rect.setAttribute("rx", 28);
        rect.setAttribute("fill", "rgba(255, 252, 245, 0.96)");
        rect.setAttribute("stroke", "#3b2f14");
        rect.setAttribute("stroke-width", "4");
        group.appendChild(rect);
        let fo = this._joinForeignHtml(
            group,
            x + 24,
            y + 10,
            w - 48,
            h - 20,
            "",
            { fontFamily: "Arial, sans-serif", fontSize: "22px", textAlign: "center", color: "#3b2f14" }
        );
        fo.div.style.display = "flex";
        fo.div.style.alignItems = "center";
        fo.div.style.justifyContent = "center";
        group.style.opacity = "0";
        group.style.pointerEvents = "none";
        const clearHide = () => {
            if (hideTimer) {
                clearTimeout(hideTimer);
                hideTimer = null;
            }
        };
        return {
            group: group,
            show: (text) => {
                clearHide();
                fo.div.textContent = text;
                group.style.transition = "none";
                group.style.opacity = "1";
                void group.getBoundingClientRect();
                group.style.transition = "opacity " + fadeMs + "ms ease";
                hideTimer = setTimeout(() => {
                    group.style.opacity = "0";
                    hideTimer = null;
                }, holdMs);
            },
            hide: () => {
                clearHide();
                group.style.opacity = "0";
            }
        };
    };

    P._joinPlaceCheckButton = function (label, yFrac) {
        let y = (yFrac != null ? yFrac : 0.925) * this.H;
        let btn = create_SVG_buttonElement(
            this.W / 2,
            y,
            Math.max(420, 16 * String(label || "Check Answers").length),
            76,
            label,
            26
        );
        btn.style.cursor = "pointer";
        this.ItemLayers.Plus2.appendChild(btn);
        return btn;
    };

    P._joinDrawPrintBox = function (parent, cx, cy, w, h) {
        let outer = create_SVG_rect(cx - w / 2, cy - h / 2, w, h);
        outer.setAttribute("fill", "#b9b9b9");
        outer.setAttribute("stroke", "#7a7a7a");
        outer.setAttribute("stroke-width", "3");
        parent.appendChild(outer);
        let inner = create_SVG_rect(cx - w / 2 + 5, cy - h / 2 + 5, w - 10, h - 10);
        inner.setAttribute("fill", "#d2d2d2");
        inner.setAttribute("stroke", "#9a9a9a");
        inner.setAttribute("stroke-width", "1.5");
        parent.appendChild(inner);
        return outer;
    };

    // copy_scale_and_move_object_to_position zeros with getSVGInternalCenter (root SVG
    // space). That is wrong inside a rotated exam sheet: hats get translated off the paper.
    P._placeJoinHat = function (fen, parent, x, y, opts) {
        opts = opts || {};
        let template = document.getElementById("hat_" + fen.hat);
        if (!template) this._fail(`missing SVG hat_${fen.hat} for Fennimal "${fen.id}".`);
        let svg = template.cloneNode(true);
        if (typeof strip_svg_ids_from_subtree === "function") strip_svg_ids_from_subtree(svg);
        svg.removeAttribute("display");
        svg.style.display = "inherit";

        let zero = create_SVG_group(0, 0, "zero_translate_group");
        let scaleG = create_SVG_group(0, 0, "scale_group");
        let pos = create_SVG_group(0, 0, "main_translate_group");
        zero.appendChild(svg);
        scaleG.appendChild(zero);
        pos.appendChild(scaleG);
        parent.appendChild(pos);

        let b = { x: 0, y: 0, width: 0, height: 0 };
        try {
            b = zero.getBBox();
        } catch (err) { /* template may still be hidden for one frame */ }
        zero.style.transform = "translate(" +
            (-(b.x + b.width / 2)) + "px, " +
            (-(b.y + b.height / 2)) + "px)";
        let scale = opts.scale != null ? opts.scale : (this.params.hatScale || 3);
        scaleG.style.transform = "scale(" + scale + ")";
        pos.style.transform = "translate(" + x + "px, " + y + "px)";
        if (opts.id) pos.id = opts.id;
        pos.style.pointerEvents = opts.pointerEvents === false ? "none" : "all";
        return { fenId: fen.id, hatId: fen.hat, elem: pos };
    };

    P._joinMakeHatCell = function (parent, fen, cx, cy, opts) {
        opts = opts || {};
        let cfg = this._joinCfg();
        let boxW = opts.boxW != null ? opts.boxW : (cfg.hatBoxW || 156);
        let boxH = opts.boxH != null ? opts.boxH : (cfg.hatBoxH || 140);
        let boxCy = cy + 8;
        let hatY = cy + 14;
        let cell = create_SVG_group(0, 0);
        cell.style.cursor = "pointer";
        parent.appendChild(cell);

        if (opts.printBox) this._joinDrawPrintBox(cell, cx, boxCy, boxW, boxH);

        this._placeJoinHat(fen, cell, cx, hatY, {
            scale: opts.scale,
            id: opts.id,
            pointerEvents: false
        });

        let mark = create_SVG_group(0, 0);
        mark.style.pointerEvents = "none";
        cell.appendChild(mark);

        let selected = false;
        const setSelected = (on) => {
            selected = !!on;
            while (mark.firstChild) mark.removeChild(mark.firstChild);
            if (!selected) return;
            if (opts.mode === "stamp") {
                let stamp = create_SVG_group(0, 0);
                let stampR = opts.stampR != null ? opts.stampR
                    : (cfg.shippingStampR != null ? cfg.shippingStampR : 93);
                let stampStroke = Math.max(8, stampR * 0.14);
                let stampFont = Math.round(stampR * 0.55);
                stamp.style.transform = "translate(" + cx + "px, " + hatY + "px) rotate(-18deg)";
                let ring = create_SVG_circle(0, 0, stampR);
                ring.setAttribute("fill", "none");
                ring.setAttribute("stroke", "#c62828");
                ring.setAttribute("stroke-width", String(stampStroke));
                stamp.appendChild(ring);
                let ok = create_SVG_text_elem(0, Math.round(stampFont * 0.35), "OK");
                ok.setAttribute("text-anchor", "middle");
                ok.setAttribute("font-size", String(stampFont));
                ok.setAttribute("font-weight", "800");
                ok.setAttribute("font-family", "Georgia, serif");
                ok.setAttribute("fill", "#c62828");
                stamp.appendChild(ok);
                stamp.style.opacity = "0.88";
                mark.appendChild(stamp);
            } else {
                let box = 32;
                let x = cx - boxW / 2 + 8;
                let y = boxCy - boxH / 2 + 6;
                let bg = create_SVG_rect(x, y, box, box);
                bg.setAttribute("fill", "#f4f4f4");
                bg.setAttribute("stroke", "#333");
                bg.setAttribute("stroke-width", "2.5");
                mark.appendChild(bg);
                let tick = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                tick.setAttribute(
                    "points",
                    (x + 6) + "," + (y + 16) + " " +
                    (x + 13) + "," + (y + 24) + " " +
                    (x + 26) + "," + (y + 7)
                );
                tick.setAttribute("fill", "none");
                tick.setAttribute("stroke", "#1b5e20");
                tick.setAttribute("stroke-width", "4.5");
                tick.setAttribute("stroke-linecap", "round");
                tick.setAttribute("stroke-linejoin", "round");
                mark.appendChild(tick);
            }
        };

        let hit = create_SVG_rect(cx - boxW / 2, boxCy - boxH / 2, boxW, boxH);
        hit.setAttribute("fill", "#000");
        hit.style.opacity = "0";
        hit.style.pointerEvents = "all";
        cell.appendChild(hit);

        let locked = false;
        const toggle = (event) => {
            if (event) event.preventDefault();
            if (locked) return;
            this._joinPlay("button_click");
            setSelected(!selected);
        };
        hit.onpointerdown = toggle;

        return {
            fenId: fen.id,
            hatId: fen.hat,
            group: cell,
            get selected() { return selected; },
            setSelected: setSelected,
            setLocked: (v) => { locked = !!v; cell.style.cursor = locked ? "default" : "pointer"; }
        };
    };

    P._joinPlaceHatRow = function (parent, question, y, opts) {
        opts = opts || {};
        let n = question.hatOrder.length;
        let innerW = opts.innerW != null ? opts.innerW : 0.58 * this.W;
        let left = opts.left != null ? opts.left : (this.W - innerW) / 2;
        let cellW = innerW / Math.max(n, 1);
        return question.hatOrder.map((id, i) => {
            let fen = this._joinFenById(id);
            let cx = left + cellW * (i + 0.5);
            return this._joinMakeHatCell(parent, fen, cx, y, {
                mode: opts.mode || "checkbox",
                printBox: opts.printBox !== false,
                scale: opts.scale,
                boxW: opts.boxW,
                boxH: opts.boxH,
                id: "join_hat_" + question.index + "_" + fen.id
            });
        });
    };

    P._joinPlaceHatGrid = function (parent, question, cx, cy, opts) {
        opts = opts || {};
        let ids = question.hatOrder;
        let dx = opts.dx != null ? opts.dx : 110;
        let dy = opts.dy != null ? opts.dy : 120;
        let cols = 2;
        return ids.map((id, i) => {
            let fen = this._joinFenById(id);
            let col = i % cols;
            let row = Math.floor(i / cols);
            let x = cx + (col === 0 ? -dx : dx);
            let y = cy + (row === 0 ? -dy : dy);
            return this._joinMakeHatCell(parent, fen, x, y, {
                mode: opts.mode || "stamp",
                printBox: !!opts.printBox,
                scale: opts.scale,
                stampR: opts.stampR,
                boxW: opts.boxW || 150,
                boxH: opts.boxH || 150,
                id: "join_hat_" + question.index + "_" + fen.id
            });
        });
    };

    P._joinDrawLinedPaper = function (parent, x, y, w, h) {
        let shadow = create_SVG_rect(x + 10, y + 12, w, h);
        shadow.setAttribute("fill", "rgba(40, 28, 10, 0.22)");
        parent.appendChild(shadow);
        let paper = create_SVG_rect(x, y, w, h);
        paper.setAttribute("fill", "#f6f1de");
        paper.setAttribute("stroke", "#d7c9a3");
        paper.setAttribute("stroke-width", "3");
        parent.appendChild(paper);
        let margin = document.createElementNS("http://www.w3.org/2000/svg", "line");
        margin.setAttribute("x1", x + 72);
        margin.setAttribute("x2", x + 72);
        margin.setAttribute("y1", y + 18);
        margin.setAttribute("y2", y + h - 18);
        margin.setAttribute("stroke", "#e38a8a");
        margin.setAttribute("stroke-width", "2");
        parent.appendChild(margin);
        for (let i = 0; i < 22; i++) {
            let ly = y + 86 + i * 36;
            if (ly > y + h - 90) break;
            let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", x + 28);
            line.setAttribute("x2", x + w - 28);
            line.setAttribute("y1", ly);
            line.setAttribute("y2", ly);
            line.setAttribute("stroke", "#b9cde4");
            line.setAttribute("stroke-width", "1.5");
            parent.appendChild(line);
        }
        return paper;
    };

    P._joinLogBase = function (block, blockIndex, questions) {
        return {
            block_kind: "join",
            flavour: block.flavour,
            block_index: blockIndex,
            condition: this.condition,
            selected_triad: this.graph.selectedTriad.slice(),
            selected_arms: this.graph.selectedArmIds.slice(),
            joining_features: this.graph.joiningFeatureKinds.slice(),
            unused_arm: this.graph.unusedArmIds[0],
            questions: questions.map((q) => ({
                role: q.role,
                prompt: q.prompt,
                gists: q.gists.map((g) => ({ kind: g.kind, value: g.value, text: g.text })),
                correct_ids: q.correctIds.slice(),
                hat_order: q.hatOrder.slice()
            })),
            n_submits: 0,
            submits: [],
            time_ms: 0
        };
    };

    P._joinRecordSubmit = function (log, questions, selectedByQ, mistakes, grade) {
        log.n_submits += 1;
        log.submits.push({
            mistakes: mistakes,
            grade: grade ? grade.letter : null,
            selected: selectedByQ.map((ids) => ids.slice())
        });
        questions.forEach((q, i) => {
            q.selectedIds = (selectedByQ[i] || []).slice();
        });
        log.questions.forEach((q, i) => {
            q.selected_ids = (selectedByQ[i] || []).slice();
        });
        log.mistakes_final = mistakes;
        if (grade) log.grade_final = grade.letter;
    };

    P._runJoinBlock = async function (block, blockIndex) {
        let questions = this._buildJoinQuestions();
        this._clearScene();
        this._setSceneOpacity(1);
        let started = performance.now();
        let log = this._joinLogBase(block, blockIndex, questions);
        if (block.flavour === "exam") {
            await this._runJoinExam(block, questions, log);
        } else if (block.flavour === "shipping") {
            await this._runJoinShipping(block, questions, log);
        } else if (block.flavour === "party") {
            await this._runJoinParty(block, questions, log);
        } else {
            this._fail(`unknown join flavour "${block.flavour}".`);
        }
        log.time_ms = Math.round(performance.now() - started);
        this.answers.push(log);
        await this._fadeTrialOut();
    };

    P._runJoinExam = async function (block, questions, log) {
        let cfg = this._joinCfg();
        let root = create_SVG_group(0, 0, undefined, "hat_binding_join_exam");
        this.ItemLayers.Main.appendChild(root);
        let paperG = create_SVG_group(0, 0);
        root.appendChild(paperG);

        let pw = 0.64 * this.W;
        let ph = 0.84 * this.H;
        let px = (this.W - pw) / 2;
        let py = 0.06 * this.H;
        let paperCx = px + pw / 2;
        this._joinDrawLinedPaper(paperG, px, py, pw, ph);

        let title = create_SVG_text_elem(paperCx, py + 48, cfg.examTitle || "Fenneland Natural History");
        title.setAttribute("text-anchor", "middle");
        title.setAttribute("font-size", "22");
        title.setAttribute("font-family", "Georgia, 'Times New Roman', serif");
        title.setAttribute("font-weight", "700");
        title.setAttribute("letter-spacing", "2");
        title.setAttribute("fill", "#2c2416");
        paperG.appendChild(title);
        let sub = create_SVG_text_elem(paperCx, py + 82, cfg.examSubtitle || "Hat Identification Quiz");
        sub.setAttribute("text-anchor", "middle");
        sub.setAttribute("font-size", "34");
        sub.setAttribute("font-family", "Georgia, 'Times New Roman', serif");
        sub.setAttribute("font-weight", "700");
        sub.setAttribute("fill", "#2c2416");
        paperG.appendChild(sub);
        let rule = document.createElementNS("http://www.w3.org/2000/svg", "line");
        rule.setAttribute("x1", px + 90);
        rule.setAttribute("x2", px + pw - 40);
        rule.setAttribute("y1", py + 96);
        rule.setAttribute("y2", py + 96);
        rule.setAttribute("stroke", "#2c2416");
        rule.setAttribute("stroke-width", "2");
        paperG.appendChild(rule);

        let hatScale = this._joinHatScale("exam");
        let cellGroups = [];
        questions.forEach((q, i) => {
            let qTop = py + 118 + i * 0.34 * this.H;
            let num = create_SVG_text_elem(px + 96, qTop + 28, (i + 1) + ".");
            num.setAttribute("font-size", "28");
            num.setAttribute("font-family", "Georgia, serif");
            num.setAttribute("font-weight", "700");
            num.setAttribute("fill", "#2c2416");
            paperG.appendChild(num);
            this._joinForeignHtml(
                paperG,
                px + 128,
                qTop,
                pw - 180,
                124,
                q.promptHtml || this._joinEscape(q.prompt),
                { fontSize: "22px", lineHeight: "1.3" }
            );
            cellGroups[i] = this._joinPlaceHatRow(paperG, q, qTop + 186, {
                left: px + 90,
                innerW: pw - 140,
                scale: hatScale,
                mode: "checkbox",
                printBox: true
            });
        });

        let submit = create_SVG_buttonElement(
            paperCx,
            py + ph - 52,
            280,
            70,
            cfg.submitLabel || "Submit",
            26
        );
        submit.style.cursor = "pointer";
        paperG.appendChild(submit);

        let tilt = cfg.examTiltDeg != null ? cfg.examTiltDeg : -3.5;
        paperG.style.transformOrigin = paperCx + "px " + (py + ph / 2) + "px";
        paperG.style.transform = "rotate(" + tilt + "deg)";

        let gradeG = create_SVG_group(0, 0, undefined, "hat_binding_join_grade");
        paperG.appendChild(gradeG);
        let gx = px + pw - 118;
        let gy = py + 78;
        let handFont = "Segoe Script, 'Bradley Hand', 'Snell Roundhand', 'Comic Sans MS', cursive";
        let letterEl = create_SVG_text_elem(gx, gy + 8, "");
        letterEl.setAttribute("text-anchor", "middle");
        letterEl.setAttribute("font-size", "88");
        letterEl.setAttribute("font-weight", "700");
        letterEl.setAttribute("font-family", handFont);
        letterEl.setAttribute("font-style", "italic");
        letterEl.setAttribute("fill", "#b42318");
        gradeG.appendChild(letterEl);
        let lineEl = create_SVG_text_elem(gx, gy + 58, "");
        lineEl.setAttribute("text-anchor", "middle");
        lineEl.setAttribute("font-size", "26");
        lineEl.setAttribute("font-family", handFont);
        lineEl.setAttribute("font-style", "italic");
        lineEl.setAttribute("font-weight", "600");
        lineEl.setAttribute("fill", "#b42318");
        gradeG.appendChild(lineEl);
        gradeG.style.transformOrigin = gx + "px " + gy + "px";
        gradeG.style.transform = "rotate(-16deg)";
        gradeG.style.opacity = "0";
        gradeG.style.pointerEvents = "none";

        let revise = this._joinForeignHtml(
            this.ItemLayers.Plus2,
            0.12 * this.W,
            0.935 * this.H,
            0.76 * this.W,
            48,
            "",
            { fontFamily: "Arial, sans-serif", fontSize: "24px", textAlign: "center", color: "#b42318", fontWeight: "700" }
        );
        revise.fo.style.opacity = "0";

        let busy = false;
        await new Promise((resolve) => {
            submit.onpointerdown = () => {
                if (busy) return;
                busy = true;
                this._joinPlay("button_click");
                let selectedByQ = cellGroups.map((cells) => this._joinSelectedFromCells(cells));
                let mistakes = this._joinMistakeCount(questions, selectedByQ);
                let grade = this._joinGrade(mistakes);
                this._joinRecordSubmit(log, questions, selectedByQ, mistakes, grade);
                letterEl.innerHTML = grade.letter;
                this._joinFillTextLines(lineEl, grade.line);
                gradeG.style.opacity = "1";
                if (mistakes === 0) {
                    revise.fo.style.opacity = "0";
                    cellGroups.forEach((cells) => cells.forEach((c) => c.setLocked(true)));
                    submit.style.pointerEvents = "none";
                    this._joinPlay("positive");
                    this._joinConfetti(gx, gy, 36, paperG);
                    this._joinSuccessBeat("exam").then(() => resolve());
                    return;
                }
                revise.div.textContent = cfg.reviseLine || "Please revise your answers and submit again!";
                revise.fo.style.opacity = "1";
                this._joinPlay("rejected");
                busy = false;
            };
        });
    };

    P._joinDrawManifest = function (parent, x, y, w, h, title) {
        let shadow = create_SVG_rect(x + 8, y + 10, w, h);
        shadow.setAttribute("fill", "rgba(20, 24, 32, 0.22)");
        parent.appendChild(shadow);
        let card = create_SVG_rect(x, y, w, h);
        card.setAttribute("rx", 10);
        card.setAttribute("fill", "#f3efe4");
        card.setAttribute("stroke", "#5c5346");
        card.setAttribute("stroke-width", "5");
        parent.appendChild(card);
        let clip = create_SVG_rect(x + w / 2 - 28, y - 10, 56, 22);
        clip.setAttribute("rx", 4);
        clip.setAttribute("fill", "#8d99a6");
        clip.setAttribute("stroke", "#4a5560");
        clip.setAttribute("stroke-width", "3");
        parent.appendChild(clip);
        let t = create_SVG_text_elem(x + w / 2, y + 56, title);
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("font-size", "42");
        t.setAttribute("font-weight", "800");
        t.setAttribute("font-family", "Arial, sans-serif");
        t.setAttribute("fill", "#2c2416");
        parent.appendChild(t);
        return card;
    };

    P._runJoinShipping = async function (block, questions, log) {
        let cfg = this._joinCfg();
        let root = create_SVG_group(0, 0, undefined, "hat_binding_join_shipping");
        this.ItemLayers.Main.appendChild(root);
        let scale = this._joinHatScale("shipping");
        let cellGroups = [];
        let centers = [];
        questions.forEach((q, i) => {
            let w = 0.44 * this.W;
            let h = 0.68 * this.H;
            let x = i === 0 ? 0.04 * this.W : 0.52 * this.W;
            let y = 0.05 * this.H;
            let title = i === 0 ? "Route A" : "Route B";
            this._joinDrawManifest(root, x, y, w, h, title);
            this._joinForeignHtml(
                root,
                x + 24,
                y + 80,
                w - 48,
                150,
                q.promptHtml || this._joinEscape(q.prompt),
                { fontFamily: "Arial, sans-serif", fontSize: "26px", lineHeight: "1.3", textAlign: "center" }
            );
            let cx = x + w / 2;
            let cy = y + 0.58 * h;
            centers.push({ x: cx, y: cy });
            cellGroups[i] = this._joinPlaceHatGrid(root, q, cx, cy, {
                mode: "stamp",
                printBox: false,
                scale: scale,
                stampR: cfg.shippingStampR != null ? cfg.shippingStampR : 93,
                dx: Math.min(120, w * 0.22),
                dy: 118,
                boxW: 180,
                boxH: 170
            });
        });

        let status = this._joinStatusBubble();
        let btn = this._joinPlaceCheckButton(cfg.checkLabel || "Check Answers", 0.925);
        let busy = false;
        await new Promise((resolve) => {
            btn.onpointerdown = () => {
                if (busy) return;
                busy = true;
                this._joinPlay("button_click");
                status.hide();
                let selectedByQ = cellGroups.map((cells) => this._joinSelectedFromCells(cells));
                let mistakes = this._joinMistakeCount(questions, selectedByQ);
                this._joinRecordSubmit(log, questions, selectedByQ, mistakes, null);
                if (mistakes === 0) {
                    cellGroups.forEach((cells) => cells.forEach((c) => c.setLocked(true)));
                    btn.style.pointerEvents = "none";
                    this._joinPlay("positive");
                    centers.forEach((c) => this._joinConfetti(c.x, c.y, 24));
                    this._joinSuccessBeat().then(() => resolve());
                    return;
                }
                status.show(cfg.shippingError || "There are some mistakes on your answers — please check again.");
                this._joinPlay("rejected");
                busy = false;
            };
        });
    };

    P._joinSeeded = function (seedStr) {
        let n = 2166136261;
        String(seedStr || "").split("").forEach((ch) => {
            n ^= ch.charCodeAt(0);
            n = Math.imul(n, 16777619);
        });
        return function () {
            n += 0x6D2B79F5;
            let t = Math.imul(n ^ (n >>> 15), 1 | n);
            t = t + Math.imul(t ^ (t >>> 7), 61 | t);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };

    P._joinSmudgeHead = function (fenIcon, fenId) {
        let hats = fenIcon.querySelectorAll(".hat");
        let headScale = fenIcon.querySelector(".Fennimal_head_tilt > g");
        if (!headScale) {
            let scaleGroup = fenIcon.getElementsByClassName("Fennimal_scale_group")[0];
            let headGroup = scaleGroup && scaleGroup.firstElementChild;
            headScale = headGroup && headGroup.firstElementChild;
        }
        let headSvg = null;
        if (headScale) {
            Array.from(headScale.children).forEach((node) => {
                if (node && node.classList && !node.classList.contains("hat")) headSvg = node;
            });
        }
        if (!headSvg) return;
        let box;
        try {
            box = headSvg.getBBox();
        } catch (err) {
            return;
        }
        let rnd = this._joinSeeded("smudge-" + fenId);
        let smear = create_SVG_group(0, 0);
        smear.classList.add("join_party_smear");
        smear.style.pointerEvents = "none";
        smear.style.transformOrigin = (box.x + box.width / 2) + "px " + (box.y + box.height / 2) + "px";
        smear.style.transform = "scale(1.45, 1.02)";
        let blobs = 8;
        for (let i = 0; i < blobs; i++) {
            let el = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            let cx = box.x + box.width * (0.10 + rnd() * 0.80);
            let cy = box.y + box.height * (0.2 + rnd() * 0.55);
            el.setAttribute("cx", cx);
            el.setAttribute("cy", cy);
            el.setAttribute("rx", box.width * (0.38 + rnd() * 0.42));
            el.setAttribute("ry", box.height * (0.14 + rnd() * 0.22));
            el.setAttribute("fill", i % 2 ? "#5c5c5c" : "#3a3a3a");
            el.setAttribute("opacity", String(0.55 + rnd() * 0.3));
            el.setAttribute("transform", "rotate(" + ((rnd() - 0.5) * 80) + " " + cx + " " + cy + ")");
            smear.appendChild(el);
        }
        headSvg.style.opacity = "0";
        if (hats.length && hats[0].parentNode) {
            hats[0].parentNode.insertBefore(smear, hats[0]);
        } else if (headSvg.parentNode) {
            headSvg.parentNode.appendChild(smear);
        }
        Array.from(hats).forEach((hat) => {
            hat.style.filter = "drop-shadow(0px 1px 2px rgba(0,0,0,0.45))";
        });
    };

    P._placeJoinPartyPolaroid = function (fen, parent, cx, cy, qIndex) {
        let cfg = this._joinCfg();
        let paperW = cfg.partyPolaroidW != null ? cfg.partyPolaroidW : 186;
        let paperH = cfg.partyPolaroidH != null ? cfg.partyPolaroidH : 232;
        let rnd = this._joinSeeded("tilt-" + fen.id + "-" + qIndex);
        let tilt = (rnd() - 0.5) * 10;

        let rotG = create_SVG_group(0, 0);
        let pos = create_SVG_group(0, 0, undefined, "join_party_polaroid_" + qIndex + "_" + fen.id);
        pos.appendChild(rotG);
        parent.appendChild(pos);

        let card = create_SVG_group(0, 0);
        card.style.pointerEvents = "none";
        rotG.appendChild(card);

        let x0 = -paperW / 2;
        let y0 = -paperH / 2;
        let pad = 12;
        let footer = 22;
        let wellX = x0 + pad;
        let wellY = y0 + pad;
        let wellW = paperW - pad * 2;
        let wellH = paperH - pad - footer;
        if (!(wellW > 8 && wellH > 8)) {
            this._fail("party polaroid photo well is too small.");
        }

        let shadow = create_SVG_rect(x0 + 4, y0 + 6, paperW, paperH);
        shadow.setAttribute("rx", 14);
        shadow.setAttribute("fill", "rgba(0,0,0,0.22)");
        card.appendChild(shadow);

        let paper = create_SVG_rect(x0, y0, paperW, paperH);
        paper.setAttribute("rx", 14);
        paper.setAttribute("fill", "#f4f1ea");
        paper.setAttribute("stroke", "#ece7dc");
        paper.setAttribute("stroke-width", "2");
        card.appendChild(paper);

        let clipId = "join_party_clip_" + qIndex + "_" + fen.id;
        let defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        let clip = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
        clip.setAttribute("id", clipId);
        let clipRect = create_SVG_rect(wellX, wellY, wellW, wellH);
        clipRect.setAttribute("rx", 10);
        clip.appendChild(clipRect);
        defs.appendChild(clip);
        card.appendChild(defs);

        let photo = create_SVG_group(0, 0);
        photo.setAttribute("clip-path", "url(#" + clipId + ")");
        card.appendChild(photo);

        let well = create_SVG_rect(wellX, wellY, wellW, wellH);
        well.setAttribute("rx", 10);
        well.setAttribute("fill", "#d5d1c8");
        photo.appendChild(well);

        let fenIcon = create_Fennimal_SVG_object_head_only(fen, false, true);
        fenIcon.querySelectorAll(".prep_element_hidden").forEach((el) => el.remove());
        fenIcon.style.display = "inherit";
        fenIcon.style.pointerEvents = "none";
        if (typeof freeze_fennimal_decorative_animations === "function") {
            freeze_fennimal_decorative_animations(fenIcon);
        }
        photo.appendChild(fenIcon);

        let fenBox = { x: 0, y: 0, width: 1, height: 1 };
        try {
            let b = fenIcon.getBBox();
            if (b && b.width > 0 && b.height > 0) fenBox = b;
        } catch (err) { /* fit with fallback box */ }
        let fenScale = Math.min(
            (wellW * 0.78) / Math.max(fenBox.width, 1),
            (wellH * 0.70) / Math.max(fenBox.height, 1)
        );
        let wellCx = wellX + wellW / 2;
        let wellCy = wellY + wellH * 0.54;
        fenIcon.setAttribute(
            "transform",
            "translate(" + wellCx + ", " + wellCy + ") scale(" + fenScale + ") translate(" +
            (-(fenBox.x + fenBox.width / 2)) + ", " +
            (-(fenBox.y + fenBox.height / 2)) + ")"
        );
        this._joinSmudgeHead(fenIcon, fen.id);

        rotG.style.transform = "rotate(" + tilt + "deg)";
        pos.style.transform = "translate(" + cx + "px, " + cy + "px)";

        return {
            group: pos,
            fenIcon: fenIcon,
            cx: cx,
            cy: cy,
            paperW: paperW,
            paperH: paperH
        };
    };

    P._joinMakePolaroidCell = function (parent, fen, cx, cy, qIndex) {
        let placed = this._placeJoinPartyPolaroid(fen, parent, cx, cy, qIndex);
        let cell = placed.group;
        cell.style.cursor = "pointer";
        let marker = create_SVG_group(0, 0);
        marker.style.pointerEvents = "none";
        marker.style.opacity = "0";
        cell.appendChild(marker);

        let ringR = Math.round(Math.min(placed.paperW || 186, placed.paperH || 232) * 0.42);
        let ring = create_SVG_circle(0, 0, ringR);
        ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", "#c0392b");
        ring.setAttribute("stroke-width", "8");
        ring.setAttribute("stroke-linecap", "round");
        ring.setAttribute("stroke-dasharray", String(Math.round(2 * Math.PI * ringR)));
        ring.setAttribute("stroke-dashoffset", String(Math.round(2 * Math.PI * ringR)));
        marker.appendChild(ring);

        let selected = false;
        let locked = false;
        const setSelected = (on) => {
            selected = !!on;
            let circ = 2 * Math.PI * ringR;
            ring.style.transition = "stroke-dashoffset 280ms ease, opacity 200ms ease";
            marker.style.transition = "opacity 200ms ease";
            if (selected) {
                marker.style.opacity = "1";
                ring.style.opacity = "1";
                ring.setAttribute("stroke-dashoffset", "0");
            } else {
                marker.style.opacity = "0";
                ring.setAttribute("stroke-dashoffset", String(Math.round(circ)));
            }
        };

        let hitW = placed.paperW || 186;
        let hitH = placed.paperH || 232;
        let hit = create_SVG_rect(-hitW / 2, -hitH / 2, hitW, hitH);
        hit.setAttribute("fill", "#000");
        hit.style.opacity = "0";
        hit.style.pointerEvents = "all";
        cell.appendChild(hit);
        hit.onpointerdown = (event) => {
            event.preventDefault();
            if (locked) return;
            this._joinPlay("button_click");
            setSelected(!selected);
        };

        return {
            fenId: fen.id,
            group: cell,
            get selected() { return selected; },
            setSelected: setSelected,
            setLocked: (v) => { locked = !!v; cell.style.cursor = locked ? "default" : "pointer"; }
        };
    };

    P._joinDrawTable = function (parent, cx, cy) {
        let rx = 0.22 * this.W;
        let ry = 0.255 * this.H;
        let shadow = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        shadow.setAttribute("cx", cx + 6);
        shadow.setAttribute("cy", cy + 16);
        shadow.setAttribute("rx", rx);
        shadow.setAttribute("ry", ry);
        shadow.setAttribute("fill", "rgba(0,0,0,0.22)");
        shadow.style.pointerEvents = "none";
        parent.appendChild(shadow);
        let table = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        table.setAttribute("cx", cx);
        table.setAttribute("cy", cy);
        table.setAttribute("rx", rx);
        table.setAttribute("ry", ry);
        table.setAttribute("fill", "#8d6e63");
        table.setAttribute("stroke", "#4e342e");
        table.setAttribute("stroke-width", "10");
        table.style.pointerEvents = "none";
        parent.appendChild(table);
        let shine = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        shine.setAttribute("cx", cx);
        shine.setAttribute("cy", cy - 0.07 * this.H);
        shine.setAttribute("rx", rx * 0.62);
        shine.setAttribute("ry", ry * 0.38);
        shine.setAttribute("fill", "rgba(255,255,255,0.14)");
        shine.style.pointerEvents = "none";
        parent.appendChild(shine);
        return { table: table, rx: rx, ry: ry };
    };

    P._runJoinParty = async function (block, questions, log) {
        let cfg = this._joinCfg();
        let root = create_SVG_group(0, 0, undefined, "hat_binding_join_party");
        this.ItemLayers.Main.appendChild(root);
        this._joinTopBanner(
            root,
            cfg.partyTopPrompt || "Circle the correct photos on each table"
        );
        let cellGroups = [];
        let centers = [];
        questions.forEach((q, i) => {
            let cx = (i === 0 ? 0.26 : 0.74) * this.W;
            let cy = 0.40 * this.H;
            centers.push({ x: cx, y: cy });
            let table = this._joinDrawTable(root, cx, cy);
            let capW = 0.46 * this.W;
            let capH = 210;
            let capX = cx - capW / 2;
            let capY = cy + table.ry + 18;
            let capBg = create_SVG_rect(capX, capY, capW, capH);
            capBg.setAttribute("rx", 16);
            capBg.setAttribute("fill", "rgba(250, 246, 236, 0.94)");
            capBg.setAttribute("stroke", "rgba(92, 74, 42, 0.55)");
            capBg.setAttribute("stroke-width", "3");
            capBg.style.pointerEvents = "none";
            root.appendChild(capBg);
            this._joinForeignHtml(
                root,
                capX + 16,
                capY + 10,
                capW - 32,
                capH - 20,
                q.captionHtml || this._joinEscape(q.caption),
                { fontFamily: "Arial, sans-serif", fontSize: "30px", lineHeight: "1.28", textAlign: "center", fontWeight: "600", color: "#3b2f14" }
            );
            let dx = 0.090 * this.W;
            let dy = 0.112 * this.H;
            let spots = [
                { x: cx - dx, y: cy - dy },
                { x: cx + dx, y: cy - dy },
                { x: cx - dx, y: cy + dy },
                { x: cx + dx, y: cy + dy }
            ];
            cellGroups[i] = q.hatOrder.map((id, n) => {
                let fen = this._joinFenById(id);
                let spot = spots[n] || spots[spots.length - 1];
                return this._joinMakePolaroidCell(root, fen, spot.x, spot.y, q.index);
            });
        });

        let status = this._joinStatusBubble();
        let btn = this._joinPlaceCheckButton(cfg.checkLabel || "Check Answers", 0.93);
        let busy = false;
        await new Promise((resolve) => {
            btn.onpointerdown = () => {
                if (busy) return;
                busy = true;
                this._joinPlay("button_click");
                status.hide();
                let selectedByQ = cellGroups.map((cells) => this._joinSelectedFromCells(cells));
                let mistakes = this._joinMistakeCount(questions, selectedByQ);
                this._joinRecordSubmit(log, questions, selectedByQ, mistakes, null);
                if (mistakes === 0) {
                    cellGroups.forEach((cells) => cells.forEach((c) => c.setLocked(true)));
                    btn.style.pointerEvents = "none";
                    this._joinPlay("positive");
                    centers.forEach((c) => this._joinConfetti(c.x, c.y, 24));
                    this._joinSuccessBeat().then(() => resolve());
                    return;
                }
                status.show(cfg.shippingError || "There are some mistakes on your answers — please check again.");
                this._joinPlay("rejected");
                busy = false;
            };
        });
    };
})();
