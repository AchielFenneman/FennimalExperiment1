/**
 * Written memory page for the retro test day.
 * Phase type: "written_memory_page"
 *
 * One scored set, shown as a paper sheet. One question at a time.
 * The day counter and within-day bar at the bottom show progress.
 * A choice fills the answer box on the right. Continue commits it.
 * Questions fade out and back in. Until a choice is made, the empty
 * answer box carries a red glow so the next click is obvious.
 * There is no accuracy feedback.
 *
 * Each question pays on its own, from the phase fields
 * bonus_stars_per_correct / bonus_stars_per_dont_remember /
 * bonus_stars_per_incorrect. Defaults are 1, 0.5, and 0.
 * The page total is the sum, so five questions pay at most 5 stars.
 *
 * A phase may set memory_questions. Without that list, the page stays the
 * Fennimal placement order plus one favorite-toy question per Fennimal.
 */
class WrittenMemoryPageController {
    constructor(parentLayer, phaseData, returnfunc, expCont) {
        this.parentLayer = parentLayer;
        this.phaseData = phaseData;
        this.returnfunc = returnfunc;
        this.expCont = expCont;

        this.W = GenParam.SVG_width;
        this.H = GenParam.SVG_height;
        this.NS = "http://www.w3.org/2000/svg";
        this.DONT_REMEMBER = "dont_remember";

        this.bonus = WrittenMemoryPageController.bonusFromPhase(phaseData);
        this.fennimals = [];
        this.toyIds = [];
        this.pages = [];
        this.answers = [];
        this.pageIndex = 0;
        this.pageCursor = 0;
        this.trayOpen = false;
        this.root = null;
        this.paint = null;
        this._busy = false;
        this._fadeTimer = null;
        this._shownKey = null;
        this._shownPerf = 0;

        this.paper = { x: 70, y: 16, w: 1780, h: 952 };
        this.pad = 22;
        this.well = 230;
        this.icon = 220;
        this.nameH = 42;
        this.idrH = 88;
        this.progressTop = 968;
    }

    static bonusFromPhase(phase) {
        const num = (value, fallback) => (typeof value === "number" ? value : fallback);
        return {
            correct: num(phase && phase.bonus_stars_per_correct, 1),
            dontRemember: num(phase && phase.bonus_stars_per_dont_remember, 0.5),
            incorrect: num(phase && phase.bonus_stars_per_incorrect, 0)
        };
    }

    static questionCountFromStimuli(stimuli) {
        let list = (stimuli && stimuli.get_all_Fennimals_objects_in_array)
            ? stimuli.get_all_Fennimals_objects_in_array()
            : [];
        let n = (list || []).filter((fen) => fen && fen.id).length;
        return 2 + n;
    }

    // memory_questions replaces the default set. favorite_toys is one question per Fennimal.
    static questionCountForPhase(phase, stimuli) {
        let specs = phase && Array.isArray(phase.memory_questions) ? phase.memory_questions : null;
        if (!specs) return WrittenMemoryPageController.questionCountFromStimuli(stimuli);
        let list = (stimuli && stimuli.get_all_Fennimals_objects_in_array)
            ? stimuli.get_all_Fennimals_objects_in_array()
            : [];
        let n = (list || []).filter((fen) => fen && fen.id).length;
        return specs.reduce((sum, spec) => {
            if (!spec || !spec.kind) return sum;
            if (spec.kind === "favorite_toys") return sum + n;
            return sum + 1;
        }, 0);
    }

    static maximumStars(bonus, questionCount) {
        let count = typeof questionCount === "number" ? questionCount : 0;
        return WrittenMemoryPageController.roundHalf((bonus ? bonus.correct : 1) * count);
    }

    static roundHalf(value) {
        return Math.round((value || 0) * 2) / 2;
    }

    static starPhrase(n) {
        if (n === 0.5) return "half a star";
        if (n === 1) return "1 star";
        if (n === 0) return "no stars";
        return n + " stars";
    }

    static bonusParagraph(bonus, maximum) {
        let wrong = bonus.incorrect === 0
            ? "no stars"
            : WrittenMemoryPageController.starPhrase(bonus.incorrect);
        return "You can earn up to " + WrittenMemoryPageController.starPhrase(maximum) + ". " +
            "A correct answer earns " + WrittenMemoryPageController.starPhrase(bonus.correct) + ". " +
            "\"I don't remember\" earns " + WrittenMemoryPageController.starPhrase(bonus.dontRemember) + ". " +
            "A wrong answer earns " + wrong + ". " +
            "If you think you know the answer, choose it. If you would only be guessing, choose \"I don't remember.\"";
    }

    static starsForAnswer(bonus, answer) {
        if (answer && answer.correct) return bonus.correct;
        if (answer && answer.selected_role === "dont_remember") return bonus.dontRemember;
        return bonus.incorrect;
    }

    start_sequence() {
        this._hideLocator();
        this._collectCast();
        this.pages = this._buildPages();
        this.phaseData.memory_pages = this.pages.map((page) => ({
            id: page.id,
            question_ids: page.questions.map((q) => q.question_id)
        }));
        this._fadeInNext = true;
        this._render();
    }

    clean_up() {
        if (this._fadeTimer) {
            clearTimeout(this._fadeTimer);
            this._fadeTimer = null;
        }
        let instr = this.expCont && this.expCont.instrCont;
        if (instr && instr.parentElem) {
            instr.parentElem.style.pointerEvents = "";
            instr.parentElem.style.display = "none";
        }
        let locator = document.getElementById("interface_location");
        if (locator && this._locatorDisplay !== undefined) {
            locator.style.display = this._locatorDisplay;
        }
        if (this.root) this.root.remove();
        this.root = null;
        this.paint = null;
    }

    _hideLocator() {
        let locator = document.getElementById("interface_location");
        if (!locator) return;
        this._locatorDisplay = locator.style.display;
        locator.style.display = "none";
    }

    _collectCast() {
        let stimuli = this.expCont && this.expCont.stimuli;
        let fennimals = (stimuli && stimuli.get_all_Fennimals_objects_in_array)
            ? stimuli.get_all_Fennimals_objects_in_array()
            : [];
        this.fennimals = (fennimals || []).filter((fen) => fen && fen.id);
        this.fennimals.sort((a, b) => String(a.id).localeCompare(String(b.id)));

        let toys = (stimuli && stimuli.get_mapped_asset_ids)
            ? stimuli.get_mapped_asset_ids("toy")
            : [];
        this.toyIds = [...new Set((toys || []).filter(Boolean))];
        this.fennimals.forEach((fen) => {
            if (fen.toy && !this.toyIds.includes(fen.toy)) this.toyIds.push(fen.toy);
        });
    }

    _buildPages() {
        let declared = this.phaseData && this.phaseData.memory_questions;
        if (Array.isArray(declared) && declared.length > 0) return this._buildDeclaredPages(declared);

        let boxCode = (this.phaseData && this.phaseData.target_box) || "X";
        let boxAssetId = this._mappedId("toybox", boxCode);
        let boxName = boxAssetId && GenParam.get_box_printed_name
            ? GenParam.get_box_printed_name(boxAssetId)
            : "box";
        let order = this._placementFennimalIds(boxCode, boxAssetId);
        if (order.length < 2) {
            console.error(
                "WrittenMemoryPage: could not find two placements in box \"" + boxCode + "\"."
            );
        }

        let boxPhrase = "the " + this._escape(boxName);
        let cue = { kind: "box", boxAssetId: boxAssetId };
        let orderPage = {
            id: "placement_order",
            questions: [
                this._orderQuestion("placement_first", "first", order[0] || null, boxPhrase, cue),
                this._orderQuestion("placement_second", "second", order[1] || null, boxPhrase, cue)
            ]
        };

        let toyFens = shuffleArray(this.fennimals.map((fen) => fen));
        let toyPage = {
            id: "favorite_toys",
            questions: toyFens.map((fen) => this._toyQuestion(fen))
        };
        return [orderPage, toyPage];
    }

    _buildDeclaredPages(specs) {
        let boxCode = (this.phaseData && this.phaseData.target_box) || "X";
        let boxAssetId = this._mappedId("toybox", boxCode);
        let boxName = boxAssetId && GenParam.get_box_printed_name
            ? GenParam.get_box_printed_name(boxAssetId)
            : "box";
        let boxPhrase = "the " + this._escape(boxName);
        let placed = this._participantPlacedObjects(boxCode, boxAssetId);
        let pages = [];

        specs.forEach((spec) => {
            if (!spec || !spec.kind) return;
            if (spec.kind === "placement_object") {
                let word = spec.place === "second" ? "second" : "first";
                let index = word === "second" ? 1 : 0;
                this._pushQuestion(pages, "placement_order", this._objectOrderQuestion(
                    word,
                    placed[index] || null,
                    boxPhrase,
                    boxAssetId
                ));
                return;
            }
            if (spec.kind === "sack_toy") {
                this._pushQuestion(pages, "sack_toy", this._sackToyQuestion(spec));
                return;
            }
            if (spec.kind === "box_decorator") {
                this._pushQuestion(pages, "box_decorator", this._decoratorQuestion(boxPhrase, boxAssetId));
                return;
            }
            if (spec.kind === "favorite_toys") {
                let toyFens = shuffleArray(this.fennimals.map((fen) => fen));
                toyFens.forEach((fen) => this._pushQuestion(pages, "favorite_toys", this._toyQuestion(fen)));
                return;
            }
            console.error("WrittenMemoryPage: unknown memory question kind \"" + spec.kind + "\".");
        });
        return pages;
    }

    _pushQuestion(pages, pageId, question) {
        let last = pages[pages.length - 1];
        if (!last || last.id !== pageId) {
            last = { id: pageId, questions: [] };
            pages.push(last);
        }
        last.questions.push(question);
    }

    _objectOrderQuestion(placeWord, placed, boxPhrase, boxAssetId) {
        if (!placed) {
            console.error("WrittenMemoryPage: missing the " + placeWord + " object placed in the box.");
        }
        return {
            question_id: "placement_" + placeWord,
            page_id: "placement_order",
            kind: "placement_object",
            place: placeWord,
            promptHtml: "Which object did you place in " + boxPhrase + " <b>" + placeWord + "</b>?",
            cue: { kind: "box", boxAssetId: boxAssetId },
            correct_option_id: placed ? (placed.kind + ":" + placed.id) : null,
            options: this._objectOptions(placed),
            selectedId: null
        };
    }

    _sackToyQuestion(spec) {
        let sackCode = (spec && spec.sack) || this._sackCodeFromStimulus() || "A";
        let sackId = this._mappedId("sack", sackCode);
        let toyId = this._toyPlacedInSack(sackId, sackCode);
        let sackName = sackId && GenParam.get_sack_printed_name
            ? GenParam.get_sack_printed_name(sackId)
            : "sack";
        if (!toyId) {
            console.error("WrittenMemoryPage: could not find the toy placed in sack \"" + sackCode + "\".");
        }
        return {
            question_id: "sack_toy_" + sackCode,
            page_id: "sack_toy",
            kind: "sack_toy",
            promptHtml: "Which toy did you place in the " + this._escape(sackName) + "?",
            cue: { kind: "sack", sackId: sackId },
            correct_option_id: toyId,
            options: this._toyOptions(toyId),
            selectedId: null
        };
    }

    _decoratorQuestion(boxPhrase, boxAssetId) {
        let correctId = this._decoratorId(boxAssetId);
        if (!correctId) {
            console.error("WrittenMemoryPage: no Fennimal is recorded as decorating the box.");
        }
        return {
            question_id: "box_decorator",
            page_id: "box_decorator",
            kind: "box_decorator",
            promptHtml: "Which Fennimal helped decorate " + boxPhrase + "?",
            cue: { kind: "box", boxAssetId: boxAssetId },
            correct_option_id: correctId,
            options: this._headOptions(correctId),
            selectedId: null
        };
    }

    _objectOptions(correct) {
        let options = [];
        this.toyIds.forEach((id) => {
            options.push({
                id: "toy:" + id,
                kind: "toy",
                toyId: id,
                role: correct && correct.kind === "toy" && correct.id === id ? "correct" : "foil"
            });
        });
        this._sackAssetIds().forEach((id) => {
            options.push({
                id: "sack:" + id,
                kind: "sack",
                sackId: id,
                role: correct && correct.kind === "sack" && correct.id === id ? "correct" : "foil"
            });
        });
        let correctKey = correct ? (correct.kind + ":" + correct.id) : null;
        if (correctKey && !options.some((opt) => opt.id === correctKey)) {
            options.push(correct.kind === "sack"
                ? { id: correctKey, kind: "sack", sackId: correct.id, role: "correct" }
                : { id: correctKey, kind: "toy", toyId: correct.id, role: "correct" });
        }
        options = shuffleArray(options);
        options.push(this._dontRememberOption());
        return options;
    }

    _sackAssetIds() {
        let stimuli = this.expCont && this.expCont.stimuli;
        let ids = [];
        const add = (id) => {
            if (id && !ids.includes(id)) ids.push(id);
        };
        if (stimuli && stimuli.get_mapped_asset_ids) {
            (stimuli.get_mapped_asset_ids("sack") || []).forEach(add);
        }
        if (stimuli && stimuli.get_all_software_options_of_type) {
            (stimuli.get_all_software_options_of_type("sack") || []).forEach(add);
        }
        return ids;
    }

    _participantPlacedObjects(boxCode, boxAssetId) {
        let fromHistory = this._placedObjectsFromHistory(boxAssetId);
        if (fromHistory.length >= 2) return fromHistory;
        return this._placedObjectsFromStimulus(boxCode);
    }

    _placedObjectsFromHistory(boxAssetId) {
        if (!boxAssetId || typeof WorldState === "undefined" || !WorldState.get_toybox_contents_history) {
            return [];
        }
        let history = WorldState.get_toybox_contents_history(boxAssetId) || [];
        let placed = [];
        history.forEach((entry) => {
            if (!entry || (entry.toy == null && !entry.sack)) return;
            let object = entry.sack
                ? { kind: "sack", id: entry.sack }
                : (entry.toy ? { kind: "toy", id: entry.toy } : null);
            if (!object) return;
            let previous = placed[placed.length - 1];
            if (previous && previous.kind === object.kind && previous.id === object.id) return;
            placed.push(object);
        });
        return placed;
    }

    _placedObjectsFromStimulus(boxCode) {
        let placed = [];
        this._eachWarehouseCleanup((block) => {
            if (!block || block.Fennimal || block.box !== boxCode) return;
            if (block.sack) {
                let id = this._mappedId("sack", block.sack);
                if (id) placed.push({ kind: "sack", id: id });
                return;
            }
            if (block.toy) {
                let id = this._mappedId("toy", block.toy);
                if (id) placed.push({ kind: "toy", id: id });
            }
        });
        return placed;
    }

    _toyPlacedInSack(sackId, sackCode) {
        if (sackId && typeof WorldState !== "undefined" && WorldState.get_sack_contents) {
            let current = WorldState.get_sack_contents(sackId);
            if (current) return current;
            if (WorldState.get_sack_contents_history) {
                let history = WorldState.get_sack_contents_history(sackId) || [];
                for (let i = history.length - 1; i >= 0; i--) {
                    if (history[i] && history[i].toy) return history[i].toy;
                }
            }
        }
        let toyCode = null;
        this._eachWarehouseCleanup((block) => {
            if (toyCode || !block || block.Fennimal) return;
            if (block.sack === sackCode && block.toy) toyCode = block.toy;
        });
        return toyCode ? this._mappedId("toy", toyCode) : null;
    }

    _sackCodeFromStimulus() {
        let code = null;
        this._eachWarehouseCleanup((block) => {
            if (code || !block || block.Fennimal) return;
            if (block.sack && block.toy && !block.box) code = block.sack;
        });
        return code;
    }

    _decoratorId(boxAssetId) {
        if (boxAssetId && typeof WorldState !== "undefined" && WorldState.get_toybox_decorator) {
            let recorded = WorldState.get_toybox_decorator(boxAssetId);
            if (recorded) return String(recorded);
        }
        let phase = this._experimentStructure().find((item) => item && item.type === "retrieve_lost_box");
        if (!phase || !Array.isArray(phase.box_locations)) return null;
        let label = this._storedConditionLabel(phase.randomization_id || "lost_box_manipulation");
        if (!label && typeof getUrlSearchParam === "function") {
            label = getUrlSearchParam("CONDITION") || getUrlSearchParam("condition");
            if (label) label = String(label).trim();
        }
        let row = phase.box_locations.find((item) => item && String(item.label) === String(label));
        return row && row.Fennimal_finding_box ? String(row.Fennimal_finding_box) : null;
    }

    _storedConditionLabel(key) {
        let stored = this.expCont && this.expCont.dataCont && this.expCont.dataCont.experimentData
            && this.expCont.dataCont.experimentData.phaseRandomizations;
        if (!key || !stored || !stored[key] || !stored[key].label) return null;
        return stored[key].label;
    }

    _experimentStructure() {
        return (this.expCont && this.expCont.stimulusSettings
            && this.expCont.stimulusSettings.Experiment_Structure) || [];
    }

    _eachWarehouseCleanup(visit) {
        this._experimentStructure().forEach((phase) => {
            if (!phase || phase.type !== "warehouse_task") return;
            let blocks = phase.trial_subblocks;
            if (!Array.isArray(blocks) && Array.isArray(phase.conditions)) {
                let label = this._storedConditionLabel(phase.randomization_id);
                let condition = phase.conditions.find((item) => item && item.label === label) || phase.conditions[0];
                blocks = condition && condition.trial_subblocks;
            }
            (blocks || []).forEach((block) => {
                if (block && block.interaction_type === "warehouse_cleanup") visit(block);
            });
        });
    }

    _orderQuestion(questionId, placeWord, correctId, boxPhrase, cue) {
        return {
            question_id: questionId,
            page_id: "placement_order",
            kind: "placement_order",
            place: placeWord,
            promptHtml: "Which Fennimal's favorite toy was placed in " + boxPhrase + " <b>" + placeWord + "</b>?",
            cue: cue,
            correct_option_id: correctId,
            options: this._headOptions(correctId),
            selectedId: null
        };
    }

    _toyQuestion(fen) {
        let name = fen.name || fen.id;
        return {
            question_id: "favorite_toy_" + fen.id,
            page_id: "favorite_toys",
            kind: "favorite_toy",
            promptHtml: "What is <b>" + this._escape(name) + "</b>'s favorite toy?",
            cue: { kind: "fennimal", fennimal: fen },
            correct_option_id: fen.toy || null,
            options: this._toyOptions(fen.toy || null),
            selectedId: null
        };
    }

    _headOptions(correctId) {
        let options = shuffleArray(this.fennimals.map((fen) => ({
            id: fen.id,
            kind: "fennimal",
            fennimal: fen,
            role: fen.id === correctId ? "correct" : "foil"
        })));
        options.push(this._dontRememberOption());
        return options;
    }

    _toyOptions(correctId) {
        let ids = this.toyIds.slice();
        if (correctId && !ids.includes(correctId)) ids.push(correctId);
        let options = shuffleArray(ids.map((id) => ({
            id: id,
            kind: "toy",
            toyId: id,
            role: id === correctId ? "correct" : "foil"
        })));
        options.push(this._dontRememberOption());
        return options;
    }

    _dontRememberOption() {
        return { id: this.DONT_REMEMBER, kind: "dont_remember", role: "dont_remember" };
    }

    _placementFennimalIds(boxCode, boxAssetId) {
        let fromHistory = this._placementsFromHistory(boxAssetId);
        if (fromHistory.length >= 2) return fromHistory;
        return this._placementsFromStimulus(boxCode);
    }

    _placementsFromHistory(boxAssetId) {
        if (!boxAssetId || typeof WorldState === "undefined" || !WorldState.get_toybox_contents_history) {
            return [];
        }
        let history = WorldState.get_toybox_contents_history(boxAssetId) || [];
        let ids = [];
        history.forEach((entry) => {
            if (!entry || !entry.toy) return;
            let owner = this.fennimals.find((fen) => fen.toy === entry.toy);
            if (!owner) return;
            if (ids[ids.length - 1] === owner.id) return;
            ids.push(owner.id);
        });
        return ids;
    }

    _placementsFromStimulus(boxCode) {
        let structure = (this.expCont && this.expCont.stimulusSettings
            && this.expCont.stimulusSettings.Experiment_Structure) || [];
        let phase = structure.find((item) =>
            item && item.type === "warehouse_task" && item.randomization_id === "belief_formation"
        );
        if (!phase) return [];

        let conditions = Array.isArray(phase.conditions) ? phase.conditions : [];
        let label = null;
        let stored = this.expCont && this.expCont.dataCont && this.expCont.dataCont.experimentData
            && this.expCont.dataCont.experimentData.phaseRandomizations;
        if (stored && stored.belief_formation && stored.belief_formation.label) {
            label = stored.belief_formation.label;
        }
        let condition = conditions.find((item) => item && item.label === label) || conditions[0];
        let blocks = (condition && condition.trial_subblocks) || phase.trial_subblocks || [];
        return blocks
            .filter((block) => block && block.interaction_type === "warehouse_cleanup" && block.box === boxCode && block.Fennimal)
            .map((block) => block.Fennimal);
    }

    _mappedId(type, code) {
        let stimuli = this.expCont && this.expCont.stimuli;
        if (!stimuli || !stimuli.get_assigned_names_of_code_array) return null;
        let mapped = stimuli.get_assigned_names_of_code_array(type, [code]);
        return mapped && mapped[0] ? mapped[0] : null;
    }

    _currentPage() {
        return this.pages[this.pageIndex] || null;
    }

    _currentQuestion() {
        let page = this._currentPage();
        if (!page) return null;
        return page.questions[this.pageCursor] || null;
    }

    _totalQuestions() {
        return this.pages.reduce((sum, page) => sum + page.questions.length, 0);
    }

    _globalQuestionNumber() {
        let prior = 0;
        for (let i = 0; i < this.pageIndex; i++) prior += this.pages[i].questions.length;
        return prior + this.pageCursor + 1;
    }

    _render() {
        let fadeIn = this._fadeInNext;
        this._fadeInNext = false;
        this._busy = !!fadeIn;
        if (this.root) this.root.remove();
        this.root = create_SVG_group(0, 0, "written_memory_page", undefined);
        this.parentLayer.appendChild(this.root);

        let backdrop = create_SVG_rect(0, 0, this.W, this.H, undefined, undefined);
        backdrop.setAttribute("fill", "#e4d2b4");
        this.root.appendChild(backdrop);

        let shadow = create_SVG_rect(this.paper.x + 10, this.paper.y + 12, this.paper.w, this.paper.h, undefined, undefined);
        shadow.setAttribute("rx", 22);
        shadow.setAttribute("fill", "rgba(92, 64, 32, 0.18)");
        this.root.appendChild(shadow);

        let paper = create_SVG_rect(this.paper.x, this.paper.y, this.paper.w, this.paper.h, undefined, undefined);
        paper.setAttribute("rx", 18);
        paper.setAttribute("fill", "#fbf6ec");
        paper.setAttribute("stroke", "#e0d3bc");
        paper.setAttribute("stroke-width", "3");
        this.root.appendChild(paper);

        let question = this._currentQuestion();
        if (!question) return;

        this.paint = create_SVG_group(0, 0, "written_memory_content", undefined);
        this.root.appendChild(this.paint);
        if (fadeIn) this._armFadeIn(this.paint);

        let shownKey = question.question_id;
        if (this._shownKey !== shownKey) {
            this._shownKey = shownKey;
            this._shownPerf = performance.now();
        }

        let sheet = this.root;
        this.root = this.paint;
        try {
            let columnX = this.paper.x + 36;
            let columnW = this.paper.w - 72;
            let y = this.paper.y + 28;
            let cardH = this._cardHeight(question);
            this._drawCard(question, columnX, y, columnW, cardH);
            y += cardH + 18;

            let buttonY = Math.min(this.progressTop - 46, y + 36);
            this._drawContinue(question, buttonY);
        } finally {
            this.root = sheet;
        }
        this._showTaskProgress();
    }

    _armFadeIn(node) {
        node.style.opacity = "0";
        node.style.pointerEvents = "none";
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (!node.isConnected) return;
            node.style.transition = "opacity 380ms ease";
            node.style.opacity = "1";
        }));
        let release = () => {
            if (!node.isConnected || this.paint !== node) return;
            node.style.pointerEvents = "auto";
            this._busy = false;
        };
        node.addEventListener("transitionend", (event) => {
            if (event.propertyName === "opacity") release();
        });
        setTimeout(release, 480);
    }

    _fadeOutThen(next) {
        this._busy = true;
        let content = this.root && this.root.querySelector(".written_memory_content");
        let go = () => {
            this._fadeTimer = null;
            if (!this.root) return;
            next();
        };
        if (!content) {
            go();
            return;
        }
        content.style.pointerEvents = "none";
        content.style.transition = "opacity 280ms ease";
        content.style.opacity = "0";
        this._fadeTimer = setTimeout(go, 280);
    }

    _showTaskProgress() {
        let instr = this.expCont && this.expCont.instrCont;
        if (!instr || !instr.parentElem || !instr.progressForeign) return;
        instr.parentElem.style.display = "inherit";
        instr.parentElem.style.pointerEvents = "none";
        let cover = instr.parentElem.querySelector(".instruction_cover_rect");
        if (cover) cover.style.display = "none";
        let background = instr.parentElem.querySelector(".instructions_element_background");
        if (background) background.style.display = "none";
        instr.progressForeign.style.display = "inherit";
        if (instr.progressDiv) instr.progressDiv.style.display = "flex";
        if (typeof instr.updateProgressNewDay === "function") {
            instr.updateProgressNewDay(this.expCont.currentDayNum);
        }
        let total = this._totalQuestions();
        let answered = Math.max(0, this._globalQuestionNumber() - 1);
        if (typeof instr.updateProgressWithinDay === "function") {
            instr.updateProgressWithinDay(total ? (answered / total) * 100 : 0);
        }
    }

    _cardHeight(question) {
        let height = this.pad + this.well + this.pad;
        if (this.trayOpen) height += 16 + this._trayHeight(question);
        return height;
    }

    _trayMetrics(question) {
        let icons = question.options.filter((opt) => opt.kind !== "dont_remember");
        if (question.kind === "placement_object") {
            let cols = Math.min(5, Math.max(1, icons.length));
            let icon = 146;
            return { icons, cols, icon, rowH: icon, rowGap: 16, gap: 16, cellW: icon + 8 };
        }
        let compact = question.kind === "favorite_toy" || question.kind === "sack_toy";
        return {
            icons,
            cols: compact ? Math.min(3, icons.length) : Math.max(1, icons.length),
            icon: this.icon,
            rowH: compact ? this.icon : this.icon + this.nameH,
            rowGap: 16,
            gap: 22,
            cellW: this.icon + 24
        };
    }

    _trayHeight(question) {
        let metrics = this._trayMetrics(question);
        let rows = Math.max(1, Math.ceil(metrics.icons.length / metrics.cols));
        return rows * metrics.rowH + Math.max(0, rows - 1) * metrics.rowGap + 20 + this.idrH;
    }

    _drawCard(question, x, y, width, height) {
        let card = create_SVG_rect(x, y, width, height, undefined, undefined);
        card.setAttribute("rx", 16);
        card.setAttribute("fill", "#fffdf8");
        card.setAttribute("stroke", "#e4d5be");
        card.setAttribute("stroke-width", "2");
        this.root.appendChild(card);

        let innerX = x + this.pad;
        let innerY = y + this.pad;
        let slotX = x + width - this.pad - this.well;
        let well = create_SVG_rect(innerX, innerY, this.well, this.well, undefined, undefined);
        well.setAttribute("rx", 16);
        well.setAttribute("fill", "#fff");
        well.setAttribute("stroke", "#eadfcb");
        well.setAttribute("stroke-width", "2");
        this.root.appendChild(well);
        this._drawCue(question, innerX + this.well / 2, innerY + this.well / 2, this.well - 48);

        let textX = innerX + this.well + 28;
        let textW = slotX - textX - 28;
        let text = create_SVG_text_in_foreign_element(question.promptHtml, textX, innerY, textW, this.well, "written_memory_question");
        let paragraph = text.querySelector("p");
        if (paragraph) {
            // Keep the sentence in one block. Flex on the paragraph itself
            // turns each <b> into its own item and eats the spaces around it.
            let wrap = document.createElement("div");
            wrap.style.display = "flex";
            wrap.style.alignItems = "center";
            wrap.style.height = "100%";
            wrap.style.width = "100%";
            paragraph.parentNode.insertBefore(wrap, paragraph);
            wrap.appendChild(paragraph);
            paragraph.style.margin = "0";
            paragraph.style.height = "auto";
            paragraph.style.display = "block";
            paragraph.style.fontFamily = "Myriad Pro, Source Sans 3, Segoe UI, sans-serif";
            paragraph.style.fontSize = "40px";
            paragraph.style.lineHeight = "1.3";
            paragraph.style.fontWeight = "600";
            paragraph.style.color = "#1a237e";
            paragraph.style.userSelect = "none";
            paragraph.querySelectorAll("b").forEach((node) => {
                node.style.fontWeight = "800";
            });
        }
        this.root.appendChild(text);

        this._drawAnswerSlot(question, slotX, innerY, this.well);

        if (this.trayOpen) {
            let trayW = width - this.pad * 2;
            this._drawTray(question, innerX, innerY + this.well + 20, trayW);
        }
    }

    _drawCue(question, cx, cy, size) {
        if (!question.cue) return;
        if (question.cue.kind === "box") this._drawBox(question.cue.boxAssetId, cx, cy, size);
        if (question.cue.kind === "sack") this._drawSack(question.cue.sackId, cx, cy, size);
        if (question.cue.kind === "fennimal") this._drawHead(question.cue.fennimal, cx, cy, size);
    }

    _drawAnswerSlot(question, x, y, size) {
        let selected = question.options.find((opt) => opt.id === question.selectedId) || null;
        let well = create_SVG_rect(x, y, size, size, undefined, undefined);
        well.setAttribute("rx", 16);
        well.setAttribute("fill", selected ? "#fff4d2" : "#fff");
        well.setAttribute("stroke", selected ? "#1a237e" : "#c4b49a");
        well.setAttribute("stroke-width", selected ? "4" : "2");
        well.style.cursor = "pointer";
        if (!selected) well.classList.add("written_memory_answer_cue");
        well.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (this._busy) return;
            this.trayOpen = !this.trayOpen;
            this._render();
        });
        this.root.appendChild(well);

        if (!selected) {
            let prompt = create_SVG_foreignElement(x + 16, y + 28, size - 32, size - 80, undefined, undefined);
            let line = document.createElement("div");
            line.textContent = "Choose an answer";
            line.style.height = "100%";
            line.style.display = "flex";
            line.style.alignItems = "center";
            line.style.justifyContent = "center";
            line.style.textAlign = "center";
            line.style.fontFamily = "Myriad Pro, Source Sans 3, Segoe UI, sans-serif";
            line.style.fontSize = "28px";
            line.style.fontWeight = "700";
            line.style.lineHeight = "1.2";
            line.style.color = "#8d6e63";
            line.style.userSelect = "none";
            prompt.appendChild(line);
            prompt.style.pointerEvents = "none";
            this.root.appendChild(prompt);

            let chevron = create_SVG_text_elem(x + size / 2, y + size - 36, "▾", undefined, undefined);
            chevron.style.fontSize = "40px";
            chevron.style.fill = "#8d6e63";
            chevron.style.textAnchor = "middle";
            chevron.style.dominantBaseline = "central";
            chevron.style.pointerEvents = "none";
            this.root.appendChild(chevron);
            return;
        }

        if (selected.kind === "fennimal") {
            this._drawHead(selected.fennimal, x + size / 2, y + size * 0.40, size * 0.58);
            this._slotLabel(selected.fennimal.name || selected.fennimal.id, x + size / 2, y + size - 28);
            return;
        }
        if (selected.kind === "toy") {
            this._drawToy(selected.toyId, x + size / 2, y + size / 2, size * 0.72);
            return;
        }
        if (selected.kind === "sack") {
            this._drawSack(selected.sackId, x + size / 2, y + size / 2, size * 0.72);
            return;
        }
        let remembered = create_SVG_foreignElement(x + 14, y + 20, size - 28, size - 40, undefined, undefined);
        let words = document.createElement("div");
        words.textContent = "I don't remember";
        words.style.height = "100%";
        words.style.display = "flex";
        words.style.alignItems = "center";
        words.style.justifyContent = "center";
        words.style.textAlign = "center";
        words.style.fontFamily = "Myriad Pro, Source Sans 3, Segoe UI, sans-serif";
        words.style.fontSize = "28px";
        words.style.fontWeight = "700";
        words.style.lineHeight = "1.25";
        words.style.color = "#1a237e";
        words.style.userSelect = "none";
        remembered.appendChild(words);
        remembered.style.pointerEvents = "none";
        this.root.appendChild(remembered);
    }

    _slotLabel(text, cx, cy) {
        let label = create_SVG_text_elem(cx, cy, text, undefined, undefined);
        label.style.textAnchor = "middle";
        label.style.dominantBaseline = "central";
        label.style.fontSize = "26px";
        label.style.fontWeight = "700";
        label.style.fill = "#1a237e";
        label.style.fontFamily = "Myriad Pro, Source Sans 3, Segoe UI, sans-serif";
        label.style.pointerEvents = "none";
        this.root.appendChild(label);
    }

    _drawTray(question, x, y, width) {
        let metrics = this._trayMetrics(question);
        let icons = metrics.icons;
        let cols = metrics.cols;
        let rowH = metrics.rowH;
        let gap = metrics.gap;
        let cellW = metrics.cellW;
        icons.forEach((opt, index) => {
            let col = index % cols;
            let row = Math.floor(index / cols);
            let rowCount = Math.min(cols, icons.length - row * cols);
            let rowWidth = rowCount * cellW + (rowCount - 1) * gap;
            let rowX = x + (width - rowWidth) / 2;
            let cx = rowX + col * (cellW + gap) + cellW / 2;
            let top = y + row * (rowH + metrics.rowGap);
            this._drawIconOption(question, opt, cx, top, cellW, rowH, metrics.icon);
        });

        let idr = question.options.find((opt) => opt.kind === "dont_remember");
        if (!idr) return;
        let idrW = 460;
        let idrX = x + (width - idrW) / 2;
        let idrY = y + this._trayHeight(question) - this.idrH;
        this._drawWordOption(question, idr, idrX, idrY, idrW, this.idrH);
    }

    _drawIconOption(question, opt, cx, top, cellW, rowH, iconSize) {
        let selected = question.selectedId === opt.id;
        let rect = create_SVG_rect(cx - cellW / 2, top, cellW, rowH, undefined, undefined);
        rect.setAttribute("rx", 16);
        rect.setAttribute("fill", selected ? "#fff4d2" : "#fffdf8");
        rect.setAttribute("stroke", selected ? "#1a237e" : "#e0d3bc");
        rect.setAttribute("stroke-width", selected ? "4" : "2");
        rect.style.cursor = "pointer";
        rect.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (this._busy) return;
            question.selectedId = opt.id;
            this.trayOpen = true;
            this._render();
        });
        this.root.appendChild(rect);

        let icon = iconSize || this.icon;
        if (opt.kind === "fennimal") {
            this._drawHead(opt.fennimal, cx, top + icon * 0.42, icon - 52);
            let name = create_SVG_text_elem(cx, top + icon + 8, opt.fennimal.name || opt.fennimal.id, undefined, undefined);
            name.style.textAnchor = "middle";
            name.style.fontSize = "30px";
            name.style.fontWeight = "700";
            name.style.fill = "#1a237e";
            name.style.fontFamily = "Myriad Pro, Source Sans 3, Segoe UI, sans-serif";
            name.style.pointerEvents = "none";
            this.root.appendChild(name);
        } else if (opt.kind === "sack") {
            this._drawSack(opt.sackId, cx, top + rowH / 2, icon - 32);
        } else {
            this._drawToy(opt.toyId, cx, top + rowH / 2, icon - 32);
        }
    }

    _drawWordOption(question, opt, x, y, width, height) {
        let selected = question.selectedId === opt.id;
        let rect = create_SVG_rect(x, y, width, height, undefined, undefined);
        rect.setAttribute("rx", 14);
        rect.setAttribute("fill", selected ? "#fff4d2" : "#fff");
        rect.setAttribute("stroke", selected ? "#1a237e" : "#c4b49a");
        rect.setAttribute("stroke-width", selected ? "4" : "2");
        rect.style.cursor = "pointer";
        rect.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (this._busy) return;
            question.selectedId = opt.id;
            this.trayOpen = true;
            this._render();
        });
        this.root.appendChild(rect);

        let label = create_SVG_text_elem(x + width / 2, y + height / 2, "I don't remember", undefined, undefined);
        label.style.textAnchor = "middle";
        label.style.dominantBaseline = "central";
        label.style.fontSize = "32px";
        label.style.fontWeight = "700";
        label.style.fill = "#5d4037";
        label.style.fontFamily = "Myriad Pro, Source Sans 3, Segoe UI, sans-serif";
        label.style.pointerEvents = "none";
        this.root.appendChild(label);
    }

    _drawContinue(question, centerY) {
        let enabled = !!question.selectedId;
        let button = create_SVG_buttonElement(
            this.paper.x + this.paper.w / 2,
            centerY,
            320,
            72,
            "Continue",
            34
        );
        button.style.cursor = enabled ? "pointer" : "default";
        button.style.opacity = enabled ? "1" : "0.38";
        button.style.pointerEvents = enabled ? "auto" : "none";
        if (enabled) {
            button.addEventListener("pointerdown", (event) => {
                event.preventDefault();
                event.stopPropagation();
                this._commit();
            });
        }
        this.root.appendChild(button);
    }

    _drawHead(fen, cx, cy, size) {
        if (!fen || typeof create_Fennimal_SVG_object_head_only !== "function") return;
        try {
            let node = create_Fennimal_SVG_object_head_only(fen, false, false);
            this._placeGraphic(node, cx, cy, size);
        } catch (err) {
            console.error("WrittenMemoryPage: could not draw Fennimal head", fen && fen.id, err);
        }
    }

    _drawToy(toyId, cx, cy, size) {
        let template = document.getElementById("toy_" + toyId);
        if (!template) {
            console.error("WrittenMemoryPage: missing toy_" + toyId);
            return;
        }
        let node = template.cloneNode(true);
        node.removeAttribute("id");
        node.style.display = "inherit";
        if (typeof set_toy_color_scheme === "function") set_toy_color_scheme(node, toyId, false);
        if (typeof ToyChoiceBar !== "undefined" && ToyChoiceBar.make_toy_static) {
            ToyChoiceBar.make_toy_static(node, toyId);
        }
        this._placeGraphic(node, cx, cy, size);
    }

    _drawSack(sackId, cx, cy, size) {
        if (!sackId) return;
        let template = document.getElementById(sackId);
        if (!template) {
            console.error("WrittenMemoryPage: missing sack " + sackId);
            return;
        }
        let node = template.cloneNode(true);
        node.removeAttribute("id");
        node.style.display = "inherit";
        let openGroup = node.querySelector(".sack_open");
        if (openGroup) openGroup.remove();
        let closedGroup = node.querySelector(".sack_closed");
        if (closedGroup) closedGroup.style.display = "inline";
        Array.from(node.getElementsByClassName("prep_element_hidden")).forEach((el) => {
            el.style.display = "none";
        });
        this._placeGraphic(node, cx, cy, size);
    }

    _drawBox(boxAssetId, cx, cy, size) {
        if (!boxAssetId || typeof get_toybox_template !== "function") return;
        let template = get_toybox_template(boxAssetId);
        if (!template) {
            console.error("WrittenMemoryPage: missing toybox_" + boxAssetId);
            return;
        }
        let node = template.cloneNode(true);
        if (typeof strip_svg_ids_from_subtree === "function") strip_svg_ids_from_subtree(node);
        node.style.display = "inherit";
        if (typeof apply_toybox_decoration_visibility_to_element === "function") {
            apply_toybox_decoration_visibility_to_element(node, boxAssetId);
        }
        this._placeGraphic(node, cx, cy, size);
    }

    _placeGraphic(node, cx, cy, size) {
        node.style.pointerEvents = "none";
        this.root.appendChild(node);
        Array.from(node.getElementsByClassName("alignment_field")).forEach((el) => el.remove());
        let box = node.getBBox();
        let dim = Math.max(box.width, box.height);
        if (!dim) return;
        let scale = size / dim;
        let ox = box.x + box.width / 2;
        let oy = box.y + box.height / 2;
        node.setAttribute("transform", "translate(" + cx + " " + cy + ") scale(" + scale + ") translate(" + (-ox) + " " + (-oy) + ")");
    }

    _commit() {
        if (this._busy) return;
        let question = this._currentQuestion();
        if (!question || !question.selectedId) return;
        this._busy = true;

        this.answers.push(this._answerRecord(question));

        this.pageCursor += 1;
        this.trayOpen = false;
        let page = this._currentPage();
        if (page && this.pageCursor >= page.questions.length) {
            this.pageIndex += 1;
            this.pageCursor = 0;
        }
        if (this.pageIndex >= this.pages.length) {
            this._fadeOutThen(() => this._finish());
            return;
        }
        this._fadeOutThen(() => {
            this._fadeInNext = true;
            this._render();
        });
    }

    _codeForAsset(type, assetId) {
        if (assetId == null || assetId === "") return null;
        let stimuli = this.expCont && this.expCont.stimuli;
        if (!stimuli || !stimuli.get_Feature_maps) return null;
        let map = stimuli.get_Feature_maps()[type];
        if (!map) return null;
        let want = String(assetId);
        let code = Object.keys(map).find((key) => String(map[key]) === want);
        return code || null;
    }

    _storedOption(opt, index) {
        let stored = {
            id: opt.id,
            role: opt.role,
            kind: opt.kind,
            position: index
        };
        if (opt.kind === "fennimal" && opt.fennimal) stored.fennimal_id = opt.fennimal.id;
        if (opt.kind === "toy") {
            stored.toy_id = opt.toyId;
            stored.toy_code = this._codeForAsset("toy", opt.toyId);
        }
        if (opt.kind === "sack") {
            stored.sack_id = opt.sackId;
            stored.sack_code = this._codeForAsset("sack", opt.sackId);
        }
        return stored;
    }

    _answerRecord(question) {
        let selected = question.options.find((opt) => opt.id === question.selectedId) || null;
        let correct = !!question.correct_option_id && question.selectedId === question.correct_option_id;
        let cue = question.cue || {};
        let isBox = cue.kind === "box";
        let isFennimal = cue.kind === "fennimal" && cue.fennimal;
        let record = {
            trial_kind: question.kind,
            question_id: question.question_id,
            page_id: question.page_id,
            place: question.place || null,
            trial_index: this.answers.length,
            target_box: isBox ? (cue.boxAssetId || null) : null,
            target_box_code: isBox ? ((this.phaseData && this.phaseData.target_box) || null) : null,
            target_fennimal: isFennimal ? cue.fennimal.id : null,
            target_fennimal_name: isFennimal ? (cue.fennimal.name || null) : null,
            options: question.options.map((opt, index) => this._storedOption(opt, index)),
            selected: question.selectedId,
            selected_role: selected ? selected.role : null,
            correct_option_id: question.correct_option_id,
            correct: correct,
            response_ms: Math.max(0, Math.round(performance.now() - this._shownPerf))
        };
        if (question.kind === "favorite_toy") {
            record.correct_toy_code = this._codeForAsset("toy", question.correct_option_id);
            if (selected && selected.kind === "toy") {
                record.selected_toy_code = this._codeForAsset("toy", selected.toyId);
            }
        }
        if (question.kind === "placement_order") {
            record.correct_fennimal = question.correct_option_id || null;
            if (selected && selected.kind === "fennimal") record.selected_fennimal = selected.id;
        }
        if (question.kind === "placement_object") {
            let correctParts = question.correct_option_id ? String(question.correct_option_id).split(":") : [];
            record.correct_object_kind = correctParts[0] || null;
            record.correct_object_id = correctParts.length > 1 ? correctParts.slice(1).join(":") : null;
            if (selected && selected.kind === "toy") {
                record.selected_object_kind = "toy";
                record.selected_object_id = selected.toyId;
                record.selected_toy_code = this._codeForAsset("toy", selected.toyId);
            }
            if (selected && selected.kind === "sack") {
                record.selected_object_kind = "sack";
                record.selected_object_id = selected.sackId;
                record.selected_sack_code = this._codeForAsset("sack", selected.sackId);
            }
        }
        if (question.kind === "sack_toy") {
            record.correct_toy_code = this._codeForAsset("toy", question.correct_option_id);
            record.target_sack = question.cue && question.cue.sackId;
            record.target_sack_code = this._codeForAsset("sack", record.target_sack);
            if (selected && selected.kind === "toy") {
                record.selected_toy_code = this._codeForAsset("toy", selected.toyId);
            }
        }
        if (question.kind === "box_decorator") {
            record.correct_fennimal = question.correct_option_id || null;
            if (selected && selected.kind === "fennimal") record.selected_fennimal = selected.id;
        }
        record.stars_earned = WrittenMemoryPageController.starsForAnswer(this.bonus, record);
        return record;
    }

    _finish() {
        let earned = this.answers.reduce((sum, answer) => sum + (answer.stars_earned || 0), 0);
        let dontRemember = this.answers.filter((answer) => answer.selected_role === "dont_remember").length;
        let incorrect = this.answers.filter((answer) => !answer.correct && answer.selected_role !== "dont_remember").length;
        this.phaseData.answers = this.answers;
        this.phaseData.memory_page_dont_remember = dontRemember;
        this.phaseData.memory_page_incorrect = incorrect;
        this.phaseData.bonus_stars_earned = WrittenMemoryPageController.roundHalf(earned);
        this.phaseData.bonus_stars_possible = WrittenMemoryPageController.maximumStars(this.bonus, this._totalQuestions());
        if (typeof this.returnfunc === "function") this.returnfunc();
    }

    _escape(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
}
