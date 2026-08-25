/**
 * Hat binding phase: one day, multiple internal blocks (binding flavours + retraining).
 * Network is a hub plus arms (a 2-arm triad, or a 3-arm star with one pair drawn).
 * Between-subjects condition and the arm pair are sampled from phaseData,
 * persisted under experimentData.phaseRandomizations (Layer 1 refresh), and
 * mirrored to experimentData.hatBindingAssignment for easy top-level export.
 */

class HatBindingTaskController {
    constructor(parentLayer, phaseData, returnfunc, expCont) {
        this.ParentLayer = parentLayer;
        this.phaseData = phaseData;
        this.returnfunc = returnfunc;
        this.expCont = expCont;
        this.params = GenParam.HatBinding || {};
        this.W = GenParam.SVG_width;
        this.H = GenParam.SVG_height;

        this.fensById = this._indexFennimals(expCont && expCont.stimuli);
        this.condition = this._resolveCondition();
        this.graph = this._buildAndValidateGraph();
        this.hatFens = this._resolveHatFennimals();
        this.expandedTrials = this._expandBindingTrials();
        this.blocks = this._normalizeBlocks();

        this.answers = [];
        this.destroyed = false;
        this.responseArmed = false;
        this.dragCleanup = null;
        this.hats = [];
        this.dropTarget = null;
        this.shippingBox = null;
        this.tagView = null;
        this.tagDragOutline = null;
        this.laundryWire = null;
        this.occluders = [];
        this.shelfHats = [];
        this.dummyHats = [];
        this.shoppingCart = null;
        this.clipboardView = null;
        this.sceneRoot = null;
        this.overlayRoot = null;
        this.taskBanner = null;
        this.currentBlock = null;
        this.currentBlockIndex = -1;
        this.currentTrialIndex = -1;

        // Phase-level stamps (same idea as retrieve_lost_box's selected_box_location_*),
        // plus a top-level DataController mirror for analysts.
        this.phaseData.binding_search_condition = this.condition;
        this.phaseData.binding_selected_arms = this.graph.selectedArmIds.slice();
        this.phaseData.binding_selected_triad = this.graph.selectedTriad.slice();
        this.phaseData.answers = this.answers;
        if (this.expCont && this.expCont.dataCont && this.expCont.dataCont.setHatBindingAssignment) {
            this.expCont.dataCont.setHatBindingAssignment({
                condition: this.condition,
                selected_arms: this.graph.selectedArmIds.slice(),
                selected_triad: this.graph.selectedTriad.slice(),
                hub: this.graph.hubId,
                fillers: this.graph.fillerIds.slice(),
                all_arms: this.graph.armIds.slice()
            });
        }
    }

    _fail(message) {
        throw new Error("HatBindingTask: " + message);
    }

    _indexFennimals(stimuli) {
        if (!stimuli || typeof stimuli.get_all_Fennimals_objects_in_array !== "function") {
            this._fail("missing stimuli accessor.");
        }
        let map = {};
        stimuli.get_all_Fennimals_objects_in_array().forEach((fen) => {
            if (fen && fen.id) map[fen.id] = fen;
        });
        return map;
    }

    _getFen(id, path) {
        let fen = this.fensById[id];
        if (!fen) this._fail(`${path || "id"} refers to unknown Fennimal "${id}".`);
        return fen;
    }

    _allowedConditions() {
        return ["pair_based", "group_based", "control"];
    }

    _resolveCondition() {
        let allowed = this._allowedConditions();
        let key = this.phaseData.randomization_id || "binding_search_condition";
        let pool = this.phaseData.condition;
        if (!Array.isArray(pool) || pool.length === 0) {
            this._fail('condition must be a non-empty array of "pair_based" | "group_based" | "control".');
        }
        pool.forEach((c, i) => {
            if (!allowed.includes(c)) {
                this._fail(`condition[${i}] must be "pair_based", "group_based", or "control" (got "${c}").`);
            }
        });
        if (this.expCont && this.expCont.dataCont && this.expCont.dataCont.getOrCreateBindingSearchCondition) {
            return this.expCont.dataCont.getOrCreateBindingSearchCondition(key, pool);
        }
        return pool[Math.floor(Math.random() * pool.length)];
    }

    _allowedRelations() {
        return ["cousin", "neighbour", "playmate"];
    }

    _relationMatches(fen, other, relation) {
        if (!fen || !other || fen.id === other.id) return false;
        if (relation === "cousin") return fen.head === other.head;
        if (relation === "neighbour") return fen.region === other.region;
        if (relation === "playmate") return !!(fen.toy && other.toy && fen.toy === other.toy);
        this._fail(`unknown relation "${relation}". Use "cousin", "neighbour", or "playmate".`);
    }

    _relationsBetween(fen, other) {
        return this._allowedRelations().filter((rel) => this._relationMatches(fen, other, rel));
    }

    _stepRelation(fromFen, relation, pathLabel, pool) {
        let candidates = pool
            || (this.graph && this.graph.walkPool)
            || Object.values(this.fensById);
        let matches = candidates.filter((fen) => this._relationMatches(fromFen, fen, relation));
        if (matches.length === 0) {
            this._fail(`${pathLabel}: ${fromFen.id} has no ${relation} in the selected triad.`);
        }
        if (matches.length > 1) {
            this._fail(
                `${pathLabel}: ${fromFen.id} has ${matches.length} ${relation}s (` +
                matches.map((f) => f.id).join(", ") + `). Relation steps must be unique.`
            );
        }
        return matches[0];
    }

    _walkPath(cueFen, path, pathLabel) {
        let current = cueFen;
        (path || []).forEach((rel, i) => {
            current = this._stepRelation(current, rel, `${pathLabel} path[${i}] "${rel}"`);
        });
        return current;
    }

    _inferPath(cueFen, targetFen, pathLabel) {
        if (!cueFen || !targetFen) {
            this._fail(`${pathLabel}: cannot infer path (missing cue or target).`);
        }
        if (cueFen.id === targetFen.id) return [];
        let direct = this._relationsBetween(cueFen, targetFen);
        if (direct.length === 1) return [direct[0]];
        if (direct.length > 1) {
            this._fail(
                `${pathLabel}: ${cueFen.id} and ${targetFen.id} share multiple relations (${direct.join(", ")}).`
            );
        }
        let hub = this.graph.hub;
        let poolIds = new Set(this.graph.selectedIds);
        if (!poolIds.has(cueFen.id) || !poolIds.has(targetFen.id)) {
            this._fail(
                `${pathLabel}: cannot infer path from ${cueFen.id} to ${targetFen.id} ` +
                `(not both in the selected triad).`
            );
        }
        if (cueFen.id !== hub.id && targetFen.id !== hub.id) {
            let toHub = this._relationsBetween(cueFen, hub);
            let fromHub = this._relationsBetween(hub, targetFen);
            if (toHub.length === 1 && fromHub.length === 1) return [toHub[0], fromHub[0]];
        }
        this._fail(`${pathLabel}: no unique path from ${cueFen.id} to ${targetFen.id} in the selected triad.`);
    }

    _uniqueIds(ids, path) {
        let seen = new Set();
        ids.forEach((id, i) => {
            if (seen.has(id)) this._fail(`duplicate Fennimal id "${id}" in ${path}.`);
            seen.add(id);
        });
    }

    _resolveSelectedArms(armIds) {
        let key = this.phaseData.arm_randomization_id || "binding_star_arms";
        if (this.expCont && this.expCont.dataCont && this.expCont.dataCont.getOrCreateBindingArmPair) {
            return this.expCont.dataCont.getOrCreateBindingArmPair(key, armIds);
        }
        if (armIds.length === 2) return armIds.slice();
        let combos = [];
        for (let i = 0; i < armIds.length; i++) {
            for (let j = i + 1; j < armIds.length; j++) {
                combos.push([armIds[i], armIds[j]]);
            }
        }
        return combos[Math.floor(Math.random() * combos.length)].slice();
    }

    _buildAndValidateGraph() {
        let hubId = this.phaseData.hub;
        let armIds = this.phaseData.arms;
        if (!hubId) this._fail("hub must be a Fennimal id.");
        if (!Array.isArray(armIds) || armIds.length < 2) {
            this._fail("arms must be an array of at least 2 Fennimal ids.");
        }
        this._uniqueIds(armIds, "arms");
        if (armIds.includes(hubId)) this._fail(`hub "${hubId}" must not also appear in arms.`);

        let hub = this._getFen(hubId, "hub");
        let armFens = armIds.map((id, i) => this._getFen(id, `arms[${i}]`));

        let explicitFillers = Array.isArray(this.phaseData.fillers) ? this.phaseData.fillers.slice() : [];
        this._uniqueIds(explicitFillers, "fillers");
        explicitFillers.forEach((id, i) => {
            this._getFen(id, `fillers[${i}]`);
            if (id === hubId || armIds.includes(id)) {
                this._fail(`fillers must not repeat hub or arms (got "${id}").`);
            }
        });

        let hubRelationByArm = new Map();
        armFens.forEach((arm) => {
            let rels = this._relationsBetween(hub, arm);
            if (rels.length === 0) {
                this._fail(
                    `hub "${hubId}" does not overlap arm "${arm.id}" ` +
                    `(cousin / neighbour / playmate).`
                );
            }
            if (rels.length > 1) {
                this._fail(
                    `hub "${hubId}" overlaps arm "${arm.id}" on multiple relations (${rels.join(", ")}).`
                );
            }
            let rel = rels[0];
            for (let [otherId, otherRel] of hubRelationByArm) {
                if (otherRel === rel) {
                    this._fail(
                        `hub "${hubId}" has two ${rel} arms ("${otherId}" and "${arm.id}"). ` +
                        `Each relation from the hub must be unique.`
                    );
                }
            }
            hubRelationByArm.set(arm.id, rel);
        });

        for (let i = 0; i < armFens.length; i++) {
            for (let j = i + 1; j < armFens.length; j++) {
                let rels = this._relationsBetween(armFens[i], armFens[j]);
                if (rels.length) {
                    this._fail(
                        `arms "${armFens[i].id}" and "${armFens[j].id}" overlap (${rels.join(", ")}); ` +
                        `star arms must not overlap each other.`
                    );
                }
            }
        }

        let selectedArmIds = this._resolveSelectedArms(armIds);
        if (!Array.isArray(selectedArmIds) || selectedArmIds.length !== 2) {
            this._fail("selected arm pair must be two Fennimal ids.");
        }
        selectedArmIds.forEach((id) => {
            if (!armIds.includes(id)) this._fail(`selected arm "${id}" is not in arms.`);
        });
        selectedArmIds = armIds.filter((id) => selectedArmIds.includes(id));

        let unusedArmIds = armIds.filter((id) => !selectedArmIds.includes(id));
        let fillerIds = explicitFillers.concat(unusedArmIds);
        let selectedIds = [selectedArmIds[0], hubId, selectedArmIds[1]];
        let walkPool = selectedIds.map((id) => this._getFen(id));
        let rosterIds = [hubId].concat(armIds, explicitFillers);

        selectedArmIds.forEach((armId) => {
            let rel = hubRelationByArm.get(armId);
            this._stepRelation(hub, rel, "selected triad", walkPool);
        });

        return {
            hub,
            hubId,
            armIds: armIds.slice(),
            selectedArmIds: selectedArmIds.slice(),
            fillerIds: fillerIds.slice(),
            selectedIds: selectedIds.slice(),
            selectedTriad: selectedIds.slice(),
            walkPool,
            rosterIds: rosterIds.slice(),
            hubRelationByArm
        };
    }

    _resolveHatFennimals() {
        let ids = Array.isArray(this.phaseData.hats) && this.phaseData.hats.length
            ? this.phaseData.hats.slice()
            : this.graph.rosterIds.slice();
        let fens = ids.map((id, i) => this._getFen(id, `hats[${i}]`));
        let seenHats = new Map();
        fens.forEach((fen) => {
            if (!fen.hat) this._fail(`Fennimal "${fen.id}" has no hat.`);
            if (seenHats.has(fen.hat)) {
                this._fail(`hat "${fen.hat}" is worn by both "${seenHats.get(fen.hat)}" and "${fen.id}".`);
            }
            seenHats.set(fen.hat, fen.id);
        });
        return fens;
    }

    _pathKey(path) {
        return (path || []).join(">");
    }

    _trialRole(cueId, targetId) {
        if (this.graph.fillerIds.includes(targetId) || this.graph.fillerIds.includes(cueId)) {
            return "filler";
        }
        if (targetId === this.graph.hubId && cueId === this.graph.hubId) return "hub";
        if (this.graph.selectedArmIds.includes(targetId)) return "arm";
        if (targetId === this.graph.hubId) return "hub";
        return "other";
    }

    _isRoleToken(value) {
        return typeof value === "string" && value.charAt(0) === "$";
    }

    _specTokenValues(spec) {
        let vals = [];
        const take = (obj) => {
            if (!obj || typeof obj !== "object") return;
            if (typeof obj.cue === "string") vals.push(obj.cue);
            if (typeof obj.target === "string") vals.push(obj.target);
        };
        take(spec);
        take(spec.pair_based);
        take(spec.group_based);
        take(spec.control);
        return vals;
    }

    _roleMap(ctx) {
        ctx = ctx || {};
        return {
            $hub: this.graph.hubId,
            $arm1: this.graph.selectedArmIds[0],
            $arm2: this.graph.selectedArmIds[1],
            $arm: ctx.arm,
            $this_arm: ctx.arm,
            $other_arm: ctx.other,
            $member: ctx.member,
            $filler: ctx.filler,
            $fillers: ctx.filler
        };
    }

    _resolveRoleValue(value, ctx, path) {
        if (!this._isRoleToken(value)) return value;
        let mapped = this._roleMap(ctx)[value];
        if (mapped == null || mapped === "") {
            this._fail(`${path || "role"}: unknown or unbound role token "${value}".`);
        }
        return mapped;
    }

    _bindSpecRoles(spec, ctx) {
        const bindBranch = (branch, path) => {
            if (!branch || typeof branch !== "object") return branch;
            let out = Object.assign({}, branch);
            if (out.cue != null) out.cue = this._resolveRoleValue(out.cue, ctx, path + ".cue");
            if (out.target != null) out.target = this._resolveRoleValue(out.target, ctx, path + ".target");
            return out;
        };
        let out = Object.assign({}, spec);
        if (out.cue != null) out.cue = this._resolveRoleValue(out.cue, ctx, `${spec.id}.cue`);
        if (out.target != null) out.target = this._resolveRoleValue(out.target, ctx, `${spec.id}.target`);
        ["pair_based", "group_based", "control"].forEach((key) => {
            if (out[key]) out[key] = bindBranch(out[key], `${spec.id}.${key}`);
        });
        return out;
    }

    _cloneSpec(spec) {
        return JSON.parse(JSON.stringify(spec));
    }

    _materializeTrialSpecs(specs) {
        let out = [];
        specs.forEach((spec, index) => {
            if (!spec || typeof spec !== "object") this._fail(`binding_trials[${index}] is invalid.`);
            if (!spec.id) this._fail(`binding_trials[${index}] is missing id.`);
            let tokens = this._specTokenValues(spec);
            let expand = spec.expand;
            let usesArm = expand === "each_arm"
                || tokens.some((t) => t === "$arm" || t === "$this_arm" || t === "$other_arm");
            let usesFiller = expand === "each_filler"
                || tokens.some((t) => t === "$fillers" || t === "$filler");
            let usesMember = expand === "each_triad_member" || tokens.some((t) => t === "$member");

            if (usesArm) {
                this.graph.selectedArmIds.forEach((arm) => {
                    let other = this.graph.selectedArmIds.find((id) => id !== arm);
                    let clone = this._bindSpecRoles(this._cloneSpec(spec), { arm, other });
                    clone.id = spec.id + "_" + arm;
                    delete clone.expand;
                    out.push(clone);
                });
                return;
            }
            if (usesFiller) {
                if (!this.graph.fillerIds.length) return;
                this.graph.fillerIds.forEach((filler) => {
                    let clone = this._bindSpecRoles(this._cloneSpec(spec), { filler });
                    clone.id = spec.id + "_" + filler;
                    delete clone.expand;
                    out.push(clone);
                });
                return;
            }
            if (usesMember) {
                this.graph.selectedIds.forEach((member) => {
                    let clone = this._bindSpecRoles(this._cloneSpec(spec), { member });
                    clone.id = spec.id + "_" + member;
                    delete clone.expand;
                    out.push(clone);
                });
                return;
            }
            let bound = this._bindSpecRoles(this._cloneSpec(spec), {});
            delete bound.expand;
            out.push(bound);
        });
        return out;
    }

    _defaultBindingTrialSpecs() {
        let hubId = this.graph.hubId;
        let arm1 = this.graph.selectedArmIds[0];
        let arm2 = this.graph.selectedArmIds[1];
        let specs = [
            {
                id: "to_" + arm1,
                conditions: ["pair_based", "group_based"],
                pair_based: { cue: hubId, target: arm1 },
                group_based: { cue: arm2, target: arm1 }
            },
            {
                id: "to_" + arm2,
                conditions: ["pair_based", "group_based"],
                pair_based: { cue: hubId, target: arm2 },
                group_based: { cue: arm1, target: arm2 }
            },
            { id: "self_" + arm1, conditions: ["control"], cue: arm1, path: [] },
            { id: "self_" + hubId, conditions: ["control"], cue: hubId, path: [] },
            { id: "self_" + arm2, conditions: ["control"], cue: arm2, path: [] }
        ];
        this.graph.fillerIds.forEach((id) => {
            specs.push({ id: "self_" + id, cue: id, path: [] });
        });
        return specs;
    }

    _trialRunsInCondition(spec, condition) {
        if (!spec) return false;
        if (Array.isArray(spec.conditions) && spec.conditions.length) {
            if (!spec.conditions.includes(condition)) return false;
        }
        let hasNested = !!(spec.pair_based || spec.group_based || spec.control);
        if (hasNested && !spec[condition] && (spec.cue == null || spec.cue === "")) {
            return false;
        }
        return true;
    }

    _resolveBranchPath(branch, cue, pathLabel) {
        let hasPath = Array.isArray(branch.path);
        let hasTarget = branch.target != null && branch.target !== "";
        if (hasPath && hasTarget) {
            let walked = this._walkPath(cue, branch.path, pathLabel);
            let expected = this._getFen(branch.target, pathLabel + ".target");
            if (walked.id !== expected.id) {
                this._fail(
                    `${pathLabel}: path lands on "${walked.id}" but target is "${expected.id}".`
                );
            }
            return { path: branch.path.slice(), target: walked };
        }
        if (hasPath) {
            let walked = this._walkPath(cue, branch.path, pathLabel);
            return { path: branch.path.slice(), target: walked };
        }
        if (hasTarget) {
            let target = this._getFen(branch.target, pathLabel + ".target");
            let path = this._inferPath(cue, target, pathLabel);
            return { path, target };
        }
        this._fail(`${pathLabel}: needs path (use [] for self) or target.`);
    }

    _expandBindingTrials() {
        let rawSpecs = Array.isArray(this.phaseData.binding_trials) && this.phaseData.binding_trials.length
            ? this.phaseData.binding_trials
            : this._defaultBindingTrialSpecs();
        let specs = this._materializeTrialSpecs(rawSpecs);
        let seenIds = new Set();
        let expanded = [];
        specs.forEach((spec, index) => {
            if (!spec || typeof spec !== "object") this._fail(`binding_trials[${index}] is invalid.`);
            if (!spec.id) this._fail(`binding_trials[${index}] is missing id.`);
            if (seenIds.has(spec.id)) this._fail(`duplicate binding trial id "${spec.id}".`);
            seenIds.add(spec.id);

            if (Array.isArray(spec.conditions)) {
                spec.conditions.forEach((c, ci) => {
                    if (!this._allowedConditions().includes(c)) {
                        this._fail(`binding_trials[${index}].conditions[${ci}] "${c}" is unknown.`);
                    }
                });
            }

            if (!this._trialRunsInCondition(spec, this.condition)) return;

            let hasNested = !!(spec.pair_based || spec.group_based || spec.control);
            let branch = (hasNested && spec[this.condition]) ? spec[this.condition] : spec;
            if (!branch.cue) this._fail(`binding_trials[${index}] ("${spec.id}") is missing cue.`);

            let cue = this._getFen(branch.cue, `binding_trials[${index}].cue`);
            let resolved = this._resolveBranchPath(branch, cue, `binding_trials[${index}] "${spec.id}"`);
            expanded.push({
                id: spec.id,
                role: this._trialRole(cue.id, resolved.target.id),
                selected_triad: this.graph.selectedTriad.slice(),
                cue_id: cue.id,
                target_id: resolved.target.id,
                path: resolved.path.slice(),
                cue,
                target: resolved.target
            });
        });
        if (expanded.length === 0) {
            this._fail(`no binding_trials apply to condition "${this.condition}".`);
        }
        return expanded;
    }

    _normalizeBlocks() {
        let blocks = this.phaseData.blocks;
        if (!Array.isArray(blocks) || blocks.length === 0) {
            this._fail("blocks must be a non-empty array.");
        }
        let knownFlavours = new Set(["lost_and_found", "laundry", "gift_shop"]);
        return blocks.map((block, index) => {
            if (!block || typeof block !== "object") this._fail(`blocks[${index}] is invalid.`);
            let kind = block.kind;
            if (kind !== "binding" && kind !== "retraining") {
                this._fail(`blocks[${index}].kind must be "binding" or "retraining".`);
            }
            if (kind === "binding") {
                if (!knownFlavours.has(block.flavour)) {
                    this._fail(`blocks[${index}].flavour "${block.flavour}" is unknown.`);
                }
            }
            let retrainingIds = block.retraining_fennimals || this.phaseData.retraining_fennimals;
            if (kind === "retraining") {
                if (!Array.isArray(retrainingIds) || retrainingIds.length === 0) {
                    this._fail(`blocks[${index}] retraining_fennimals is missing.`);
                }
                retrainingIds.forEach((id, i) => this._getFen(id, `blocks[${index}].retraining_fennimals[${i}]`));
            }
            return {
                kind,
                flavour: block.flavour || (kind === "retraining" ? "retraining" : null),
                cover_story: block.cover_story || this._defaultCoverStory(kind, block.flavour),
                hop_catch_after_errors: (typeof block.hop_catch_after_errors === "number")
                    ? block.hop_catch_after_errors
                    : null,
                retraining_fennimals: retrainingIds ? retrainingIds.slice() : null
            };
        });
    }

    _defaultCoverStory(kind, flavour) {
        if (kind === "retraining") {
            return "Let's double-check that we can still match each Fennimal to their hat.";
        }
        if (flavour === "lost_and_found") {
            return "Oh no, the Fennimals have lost their hats! Let's help return these hats to their correct owner. Unfortunately, the post office forgot to print the names on the boxes. Instead, we need to rely on your memories. One hat at a time, we will give you a description of a Fennimal. Your task is to first visualize this Fennimal. You then have to place this Fennimal's hat in the shipping box.";
        }
        if (flavour === "laundry") {
            return "It's laundry day! All the Fennimals have had their hats washed and dried. Unfortunately, the name-tags also got washed and are now unusable. Instead, you will have to help match a new tag to the correct hat.";
        }
        if (flavour === "gift_shop") {
            return "Let's buy some new hats for the Fennimals! One hat at a time, we will give you a description of a Fennimal. Your task is to first visualize this Fennimal. You then have to place a new version of this Fennimal's hat in the shopping cart.";
        }
        return "Let's get to work.";
    }

    _promptText(trial, revealedNames) {
        let key = this._pathKey(trial.path);
        let names = revealedNames || [];
        let overrides = (this.phaseData.prompt_templates && typeof this.phaseData.prompt_templates === "object")
            ? this.phaseData.prompt_templates
            : {};
        if (!names.length && overrides[key]) return overrides[key];
        return this._pathPromptHtml(trial, names);
    }

    _pathPromptHtml(trial, revealedNames) {
        let names = revealedNames || [];
        let cueName = trial.cue && trial.cue.name ? trial.cue.name : "this Fennimal";
        let path = trial.path || [];
        if (!path.length) return "Visualize this Fennimal.";

        let html = "Visualize <b>" + cueName + "</b>. ";
        let subjectHtml = "<b>" + cueName + "</b>";
        for (let i = 0; i < path.length; i++) {
            let rel = path[i];
            let desc = this._relationDescription(rel);
            let known = names[i];
            let isLast = i === path.length - 1;
            html += subjectHtml + " has " + desc;
            if (known) {
                html += ": <b>" + known + "</b>.";
                if (isLast) {
                    html += " Visualize <b>" + known + "</b>.";
                } else {
                    html += " Think about <b>" + known + "</b>. ";
                    subjectHtml = "<b>" + known + "</b>";
                }
            } else {
                html += ".";
                if (isLast) {
                    html += " Visualize " + (path.length > 1 ? "this " : "that ") + this._targetRoleCaps(rel) + ".";
                } else {
                    let role = this._relationLabel(rel);
                    html += " Think about that " + role + ". ";
                    subjectHtml = "That " + role;
                }
            }
        }
        return html;
    }

    _pathTargetLabel(trial) {
        let name = (trial && trial.cue && trial.cue.name) ? String(trial.cue.name) : "this Fennimal";
        let path = (trial && trial.path) ? trial.path : [];
        if (!path.length) return name;
        let label = name;
        path.forEach((rel, i) => {
            let isLast = i === path.length - 1;
            let word;
            if (rel === "neighbour") word = isLast ? "NEIGHBOR" : "neighbor";
            else if (rel === "cousin") word = isLast ? "COUSIN" : "cousin";
            else if (rel === "playmate") word = isLast ? "PLAYMATE" : "playmate";
            else word = isLast ? String(rel).toUpperCase() : String(rel);
            label += "'s " + word;
        });
        return label;
    }

    _laundryTagLabel(trial) {
        return this._pathTargetLabel(trial);
    }

    _clipboardItemLabel(trial, revealedNames) {
        let names = revealedNames || [];
        for (let i = names.length - 1; i >= 0; i--) {
            if (names[i]) return names[i];
        }
        return this._pathTargetLabel(trial);
    }

    _isSelfTrial(trial) {
        return !trial.path || trial.path.length === 0;
    }

    _relationLabel(relation) {
        if (relation === "neighbour") return "neighbour";
        if (relation === "cousin") return "cousin";
        if (relation === "playmate") return "playmate";
        return relation;
    }

    _relationDescription(relation) {
        if (relation === "neighbour") return "a neighbour — a Fennimal who lives in the same region";
        if (relation === "cousin") return "a cousin — a Fennimal with the same head";
        if (relation === "playmate") return "a playmate — a Fennimal who plays with the same toy";
        return "a " + this._relationLabel(relation);
    }

    _targetRoleCaps(relation) {
        if (relation === "neighbour") return "NEIGHBOR";
        if (relation === "cousin") return "COUSIN";
        if (relation === "playmate") return "PLAYMATE";
        return "Fennimal";
    }

    _visualizePromptSteps(trial) {
        let cueName = trial.cue && trial.cue.name ? trial.cue.name : "this Fennimal";
        let path = trial.path || [];
        if (!path.length) return ["Visualize this Fennimal."];

        let steps = ["Visualize <b>" + cueName + "</b>."];
        for (let i = 0; i < path.length; i++) {
            let rel = path[i];
            let isLast = i === path.length - 1;
            let subject = (i === 0)
                ? ("<b>" + cueName + "</b>")
                : ("That " + this._relationLabel(path[i - 1]));
            let visualizeBit;
            if (isLast && path.length > 1) {
                visualizeBit = "Visualize this " + this._targetRoleCaps(rel) + ".";
            } else if (isLast) {
                visualizeBit = "Visualize that " + this._targetRoleCaps(rel) + ".";
            } else {
                visualizeBit = "Visualize that " + this._relationLabel(rel) + ".";
            }
            steps.push(subject + " has " + this._relationDescription(rel) + ". " + visualizeBit);
        }
        return steps;
    }

    _hopCatchQuestionHtml(trial, revealedNames, askIndex) {
        let truncated = {
            cue: trial.cue,
            path: (trial.path || []).slice(0, askIndex + 1)
        };
        return this._pathPromptHtml(truncated, revealedNames) + "<br>Please type the name below.";
    }

    async start_sequence() {
        try {
            this.ParentLayer.style.display = "inherit";
        if (typeof Interface !== "undefined") {
            if (Interface.FenneFinder && Interface.FenneFinder.hide) Interface.FenneFinder.hide();
            if (Interface.Prompt) Interface.Prompt.hide();
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

        console.log(
            "%c HatBindingTask condition: " + this.condition +
            "  triad: " + this.graph.selectedTriad.join("-"),
            "color:teal"
        );

        for (let b = 0; b < this.blocks.length; b++) {
            if (this.destroyed) return;
            this.currentBlockIndex = b;
            this.currentBlock = this.blocks[b];
            this._setLocator(this.currentBlock.flavour);
            this._clearScene();
            this._setSceneOpacity(1);
            this._paintBackground(this.currentBlock.flavour);
            await this._showCoverStory(this.currentBlock.cover_story);
            if (this.currentBlock.kind === "binding") {
                await this._runBindingBlock(this.currentBlock, b);
            } else {
                await this._runRetrainingBlock(this.currentBlock, b);
            }
        }

        if (typeof this.returnfunc === "function") this.returnfunc();
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    _setLocator(flavour) {
        if (typeof Interface === "undefined" || !Interface.Locator) return;
        let name = (this.params.flavourNames && this.params.flavourNames[flavour]) || "Center of Fenneland";
        if (Interface.player_moved_to_new_region) Interface.player_moved_to_new_region("Home");
        Interface.Locator.change_locator_name(name);
    }

    _paintBackground(flavour) {
        while (this.ItemLayers.Neg1.firstChild) this.ItemLayers.Neg1.removeChild(this.ItemLayers.Neg1.firstChild);
        let map = document.getElementById("Map");
        if (map) map.style.display = "inherit";
        if (flavour === "lost_and_found") {
            this._paintLostAndFoundRoom();
            return;
        }
        if (flavour === "laundry") {
            this._paintLaundryRoom();
            return;
        }
        if (flavour === "gift_shop") {
            this._paintGiftShopRoom();
            return;
        }
        let bg = create_SVG_rect(0, 0, this.W, this.H);
        bg.setAttribute("fill", "#ffffff");
        bg.style.opacity = "0.92";
        this.ItemLayers.Neg1.appendChild(bg);
    }

    _paintRoomPhoto(p) {
        p = p || {};
        let backdrop = create_SVG_rect(0, 0, this.W, this.H);
        backdrop.setAttribute("fill", "white");
        this.ItemLayers.Neg1.appendChild(backdrop);

        if (p.background) {
            let photo = document.createElementNS("http://www.w3.org/2000/svg", "image");
            photo.setAttribute("href", p.background);
            photo.setAttribute("width", "100%");
            photo.setAttribute("height", "100%");
            photo.setAttribute("preserveAspectRatio", "none");
            this.ItemLayers.Neg1.appendChild(photo);
        }

        if (p.floorHeight != null) {
            let floorH = p.floorHeight * this.H;
            let floor = create_SVG_rect(0, this.H - floorH, this.W, floorH);
            floor.setAttribute("fill", p.floorColor || "#3E2723");
            floor.style.pointerEvents = "none";
            this.ItemLayers.Neg1.appendChild(floor);
        }

        if (p.overlayOpacity) {
            let overlay = create_SVG_rect(0, 0, this.W, this.H);
            overlay.setAttribute("fill", "white");
            overlay.style.opacity = String(p.overlayOpacity);
            overlay.style.pointerEvents = "none";
            this.ItemLayers.Neg1.appendChild(overlay);
        }
    }

    _paintLostAndFoundRoom() {
        let p = this.params.lostAndFound || {};
        this._paintRoomPhoto(p);
        this._drawLostAndFoundTable(p);
    }

    _paintLaundryRoom() {
        this._paintRoomPhoto(this.params.laundry || {});
    }

    _paintGiftShopRoom() {
        this._paintRoomPhoto(this.params.giftShop || {});
    }

    _drawWoodenTable(opts) {
        opts = opts || {};
        if (opts.id) {
            let old = document.getElementById(opts.id);
            if (old && old.parentNode) old.remove();
        }
        let parent = opts.parent || this.ItemLayers.Neg1;
        let tableX = opts.tableX;
        let tableY = opts.tableY;
        let tableW = opts.tableW;
        let tableH = opts.tableH != null ? opts.tableH : 70;
        let legW = opts.legW != null ? opts.legW : 22;
        let lipH = opts.lipH != null ? opts.lipH : 8;
        let rx = opts.rx != null ? opts.rx : 12;
        let legInset = opts.legInset != null ? opts.legInset : 0.10;
        let legTopOffset = opts.legTopOffset != null ? opts.legTopOffset : 24;
        let legH = opts.legH != null ? opts.legH : Math.max(140, this.H - tableY - 20);

        let group = create_SVG_group(0, 0, undefined, opts.id);
        parent.appendChild(group);

        [tableX + legInset * tableW, tableX + (1 - legInset) * tableW - legW].forEach((lx) => {
            let leg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            leg.setAttribute("x", lx);
            leg.setAttribute("y", tableY + legTopOffset);
            leg.setAttribute("width", legW);
            leg.setAttribute("height", legH);
            leg.setAttribute("fill", "#4E342E");
            group.appendChild(leg);
        });

        let top = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        top.setAttribute("x", tableX);
        top.setAttribute("y", tableY);
        top.setAttribute("width", tableW);
        top.setAttribute("height", tableH);
        top.setAttribute("rx", rx);
        top.setAttribute("fill", "#795548");
        group.appendChild(top);

        let lip = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        lip.setAttribute("x", tableX);
        lip.setAttribute("y", tableY + tableH - lipH);
        lip.setAttribute("width", tableW);
        lip.setAttribute("height", lipH);
        lip.setAttribute("fill", "#3E2723");
        group.appendChild(lip);

        return {
            group: group,
            tableX: tableX,
            tableY: tableY,
            tableW: tableW,
            tableH: tableH,
            cx: tableX + tableW / 2
        };
    }

    _drawLostAndFoundTable(p, boxBottomY) {
        p = p || {};
        let dropY = (p.dropY != null ? p.dropY : 0.78) * this.H;
        let dropH = p.dropH || 200;
        let tableH = p.tableHeight || 70;
        let tableW = (p.tableWidth != null ? p.tableWidth : 0.58) * this.W;
        // Sit the tabletop just under the shipping-box bottom.
        let tableY = (typeof boxBottomY === "number")
            ? (boxBottomY - 14)
            : ((p.tableY != null) ? p.tableY * this.H : (dropY + dropH / 2 - 14));
        let tableX = (this.W - tableW) / 2;
        return this._drawWoodenTable({
            id: "hat_binding_lf_table",
            parent: this.ItemLayers.Neg1,
            tableX: tableX,
            tableY: tableY,
            tableW: tableW,
            tableH: tableH,
            legW: 28,
            lipH: 10,
            rx: 15,
            legInset: 0.08,
            legTopOffset: 30,
            legH: Math.max(180, this.H - tableY - 20)
        });
    }

    _targetRelationPossessive(trial) {
        let last = (trial.path && trial.path.length) ? trial.path[trial.path.length - 1] : "";
        if (last === "neighbour") return "this NEIGHBOR'S";
        if (last === "cousin") return "this COUSIN'S";
        if (last === "playmate") return "this PLAYMATE'S";
        return "this Fennimal's";
    }

    _dragActionLine(trial, flavour, revealedNames) {
        if (this._isSelfTrial(trial)) {
            let name = trial.cue && trial.cue.name ? trial.cue.name : "this Fennimal";
            if (flavour === "laundry") return "Place the laundry tag on " + name + "'s hat.";
            if (flavour === "gift_shop") return "Drag " + name + "'s hat to the shopping cart.";
            return "Drag " + name + "'s hat to the shipping box.";
        }
        let names = revealedNames || [];
        let lastName = null;
        for (let i = names.length - 1; i >= 0; i--) {
            if (names[i]) {
                lastName = names[i];
                break;
            }
        }
        if (lastName) {
            if (flavour === "laundry") return "Place the laundry tag on " + lastName + "'s hat.";
            if (flavour === "gift_shop") return "Drag " + lastName + "'s hat to the shopping cart.";
            return "Drag " + lastName + "'s hat to the shipping box.";
        }
        let whose = this._targetRelationPossessive(trial);
        if (flavour === "laundry") return "Place the laundry tag on " + whose + " hat.";
        if (flavour === "gift_shop") return "Drag " + whose + " hat to the shopping cart.";
        return "Drag " + whose + " hat to the shipping box.";
    }

    async _showSummaryBanner(trial, flavour, revealedNames, opts) {
        this._hideSummaryBanner();
        let group = create_SVG_group(0, 0, undefined, "hat_binding_summary");
        group.style.opacity = "0";
        this.ItemLayers.Plus2.appendChild(group);
        this.taskBanner = group;

        let selfTrial = this._isSelfTrial(trial);
        let barX = 0.04 * this.W;
        let barY = 0.012 * this.H;
        let barW = 0.92 * this.W;
        let bar = create_SVG_rect(barX, barY, barW, 80);
        bar.setAttribute("rx", 20);
        bar.setAttribute("fill", "rgba(250, 246, 236, 0.96)");
        bar.setAttribute("stroke", "rgba(184, 159, 93, 0.95)");
        bar.setAttribute("stroke-width", "5");
        bar.style.pointerEvents = "none";
        group.appendChild(bar);

        let tagGroup = create_SVG_group(0, 0);
        this._drawNameTag(tagGroup, barX + 190, 0, selfTrial ? trial.cue.name : "????", true);
        group.appendChild(tagGroup);

        let wrap = create_SVG_foreignElement(barX + 370, barY + 12, barW - 400, 400);
        wrap.style.pointerEvents = "none";
        let div = document.createElement("div");
        div.style.width = "100%";
        div.style.height = "auto";
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.justifyContent = "center";
        div.style.gap = "6px";
        div.style.color = "#3b2f14";
        div.style.fontFamily = "Arial, sans-serif";

        if (!selfTrial) {
            let descr = document.createElement("div");
            descr.style.fontSize = "26px";
            descr.style.fontWeight = "700";
            descr.style.lineHeight = "125%";
            descr.innerHTML = this._promptText(trial, revealedNames);
            div.appendChild(descr);
        }

        let action = document.createElement("div");
        action.style.fontSize = selfTrial ? "32px" : "28px";
        action.style.fontWeight = "700";
        action.style.lineHeight = "125%";
        action.textContent = this._dragActionLine(trial, flavour, revealedNames);
        div.appendChild(action);
        wrap.appendChild(div);
        group.appendChild(wrap);

        const layoutBanner = () => {
            wrap.setAttribute("height", 500);
            div.style.height = "auto";
            void div.offsetHeight;
            let contentH = Math.max(div.scrollHeight, 36);
            let padY = 14;
            let tagH = 70;
            let barH = Math.max(tagH + 16, contentH + 2 * padY);
            barH = Math.min(barH, 0.40 * this.H);
            bar.setAttribute("height", barH);
            let innerH = Math.max(20, barH - 2 * padY);
            wrap.setAttribute("y", barY + padY);
            wrap.setAttribute("height", innerH);
            tagGroup.style.transform = "translate(0px, " + (barY + barH / 2) + "px)";
        };
        layoutBanner();
        requestAnimationFrame(layoutBanner);
        if (flavour === "gift_shop") this._setClipboardItem(this._clipboardItemLabel(trial, revealedNames));

        void group.getBoundingClientRect();
        if (opts && opts.instant) {
            group.style.opacity = "1";
            return;
        }
        group.style.transition = "opacity 380ms ease-out";
        group.style.opacity = "1";
        await wait(380);
    }

    _hideSummaryBanner() {
        if (this.taskBanner && this.taskBanner.parentNode) this.taskBanner.remove();
        this.taskBanner = null;
    }

    _raiseSummaryBanner() {
        if (this.taskBanner && this.taskBanner.parentNode) {
            this.ItemLayers.Plus2.appendChild(this.taskBanner);
        }
    }

    _hideTaskBanner() {
        this._hideSummaryBanner();
    }

    _clearScene() {
        this._teardownDrag();
        this._hideTaskBanner();
        this.responseArmed = false;
        this.hats = [];
        this.dropTarget = null;
        this.shippingBox = null;
        this.tagView = null;
        this.tagDragOutline = null;
        this.laundryWire = null;
        this.occluders = [];
        this.shelfHats = [];
        this.dummyHats = [];
        this.shoppingCart = null;
        this.clipboardView = null;
        [this.ItemLayers.Main, this.ItemLayers.Plus1, this.ItemLayers.Plus2].forEach((layer) => {
            while (layer.firstChild) layer.removeChild(layer.firstChild);
        });
    }

    _sceneFadeLayers() {
        return [this.ItemLayers.Main, this.ItemLayers.Plus1, this.ItemLayers.Plus2].filter(Boolean);
    }

    _setSceneOpacity(opacity) {
        this._sceneFadeLayers().forEach((layer) => {
            layer.style.opacity = String(opacity);
        });
    }

    async _fadeScene(toOpacity, ms) {
        let dur = ms != null ? ms : 300;
        this._sceneFadeLayers().forEach((layer) => {
            layer.style.transition = "opacity " + dur + "ms ease";
            layer.style.opacity = String(toOpacity);
        });
        await wait(dur);
        this._sceneFadeLayers().forEach((layer) => {
            layer.style.transition = "";
        });
    }

    async _fadeTrialIn() {
        this._sceneFadeLayers().forEach((layer) => { void layer.getBoundingClientRect(); });
        await this._fadeScene(1, 300);
    }

    async _fadeTrialOut() {
        await this._fadeScene(0, 300);
        this._clearScene();
    }

    _showCoverStory(text) {
        return this._showPanel({
            html: `<div style="font-size:34px; line-height:140%; color:#3b2f14; text-align:center">${text}</div>`,
            buttonLabel: "Continue"
        });
    }

    async _showVisualizePrompt(trial) {
        let steps = this._visualizePromptSteps(trial);
        let selfTrial = this._isSelfTrial(trial);
        let group = create_SVG_group(0, 0, undefined, "hat_binding_panel");
        this.ItemLayers.Plus2.appendChild(group);

        let catcher = create_SVG_rect(0, 0, this.W, this.H);
        catcher.setAttribute("fill", "#111");
        catcher.style.opacity = 0.22;
        catcher.style.pointerEvents = "all";
        group.appendChild(catcher);

        let panelW = 0.72 * this.W;
        let panelX = (this.W - panelW) / 2;
        let panelY = 0.06 * this.H;
        let panel = create_SVG_rect(panelX, panelY, panelW, 200);
        panel.setAttribute("rx", 28);
        panel.setAttribute("fill", "rgba(250, 246, 236, 0.96)");
        panel.setAttribute("stroke", "rgba(184, 159, 93, 0.9)");
        panel.setAttribute("stroke-width", "6");
        group.appendChild(panel);

        let nameTag = selfTrial ? trial.cue.name : "????";
        let tagGroup = create_SVG_group(0, 0);
        this._drawNameTag(tagGroup, this.W / 2, 0, nameTag);
        group.appendChild(tagGroup);

        let wrap = create_SVG_foreignElement(panelX + 40, panelY + 140, panelW - 80, 400);
        let linesWrap = document.createElement("div");
        linesWrap.style.width = "100%";
        linesWrap.style.height = "auto";
        linesWrap.style.display = "flex";
        linesWrap.style.flexDirection = "column";
        linesWrap.style.justifyContent = "flex-start";
        linesWrap.style.alignItems = "center";
        linesWrap.style.gap = "18px";
        linesWrap.style.textAlign = "center";
        linesWrap.style.color = "#3b2f14";
        linesWrap.style.fontFamily = "Arial, sans-serif";
        wrap.appendChild(linesWrap);
        group.appendChild(wrap);

        let btnHolder = create_SVG_group(0, 0);
        let btn = create_SVG_buttonElement(
            this.W / 2,
            0,
            Math.max(420, 18 * "I can picture this Fennimal".length),
            72,
            "I can picture this Fennimal",
            26
        );
        btn.style.cursor = "pointer";
        btnHolder.appendChild(btn);
        group.appendChild(btnHolder);

        const layout = () => {
            let padTop = 28;
            let padBot = 28;
            let gap = 20;
            let tagH = 96;
            let tagGap = 16;
            let btnH = 72;
            wrap.setAttribute("x", panelX + 40);
            wrap.setAttribute("width", panelW - 80);
            wrap.setAttribute("height", 900);
            linesWrap.style.height = "auto";
            void linesWrap.offsetHeight;
            let textH = Math.max(linesWrap.scrollHeight, 40);
            let panelH = padTop + tagH + tagGap + textH + gap + btnH + padBot;
            let maxH = this.H - panelY - 16;
            if (panelH > maxH) {
                textH = Math.max(40, textH - (panelH - maxH));
                panelH = maxH;
            }
            panel.setAttribute("height", panelH);
            tagGroup.style.transform = "translate(0px, " + (panelY + padTop + tagH / 2) + "px)";
            wrap.setAttribute("y", panelY + padTop + tagH + tagGap);
            wrap.setAttribute("height", textH);
            btnHolder.style.transform = "translate(0px, " + (panelY + panelH - padBot - btnH / 2) + "px)";
        };

        const addLine = (html) => {
            let line = document.createElement("div");
            line.style.fontSize = "32px";
            line.style.fontWeight = "700";
            line.style.lineHeight = "140%";
            line.style.opacity = "0";
            line.style.transition = "opacity 280ms ease-out";
            line.innerHTML = html;
            linesWrap.appendChild(line);
            void line.offsetWidth;
            line.style.opacity = "1";
            layout();
        };

        addLine(steps[0]);
        requestAnimationFrame(layout);

        const hideBtn = () => {
            btn.style.visibility = "hidden";
            btn.style.pointerEvents = "none";
        };
        const showBtn = () => {
            btn.style.visibility = "visible";
            btn.style.pointerEvents = "auto";
            btn.style.cursor = "pointer";
        };

        return new Promise((resolve) => {
            let stepIndex = 0;
            let busy = false;
            btn.onpointerdown = async () => {
                if (busy) return;
                busy = true;
                if (typeof AudioCont !== "undefined") AudioCont.play_sound_effect("button_click");
                hideBtn();
                if (stepIndex >= steps.length - 1) {
                    await this._animateGroupUpAndOut(group);
                    resolve();
                    return;
                }
                stepIndex += 1;
                addLine(steps[stepIndex]);
                await wait(1000);
                if (this.destroyed) return;
                showBtn();
                busy = false;
            };
        });
    }

    async _showPanel({ html, buttonLabel, nameTag, buttonWidth, animateOut }) {
        return new Promise((resolve) => {
            let group = create_SVG_group(0, 0, undefined, "hat_binding_panel");
            this.ItemLayers.Plus2.appendChild(group);

            let catcher = create_SVG_rect(0, 0, this.W, this.H);
            catcher.setAttribute("fill", "#111");
            catcher.style.opacity = 0.22;
            catcher.style.pointerEvents = "all";
            group.appendChild(catcher);

            let panelW = 0.72 * this.W;
            let panelX = (this.W - panelW) / 2;
            let panel = create_SVG_rect(panelX, 0, panelW, 200);
            panel.setAttribute("rx", 28);
            panel.setAttribute("fill", "rgba(250, 246, 236, 0.96)");
            panel.setAttribute("stroke", "rgba(184, 159, 93, 0.9)");
            panel.setAttribute("stroke-width", "6");
            group.appendChild(panel);

            let tagGroup = null;
            if (nameTag) {
                tagGroup = create_SVG_group(0, 0);
                this._drawNameTag(tagGroup, this.W / 2, 0, nameTag);
                group.appendChild(tagGroup);
            }

            let wrap = create_SVG_foreignElement(panelX + 40, 0, panelW - 80, 800);
            let div = document.createElement("div");
            div.style.width = "100%";
            div.style.height = "auto";
            div.style.display = "flex";
            div.style.alignItems = "center";
            div.style.justifyContent = "center";
            div.innerHTML = html;
            wrap.appendChild(div);
            group.appendChild(wrap);

            let btnHolder = create_SVG_group(0, 0);
            let btn = create_SVG_buttonElement(
                this.W / 2,
                0,
                buttonWidth || Math.max(420, 18 * String(buttonLabel || "Continue").length),
                72,
                buttonLabel,
                26
            );
            btn.style.cursor = "pointer";
            btnHolder.appendChild(btn);
            group.appendChild(btnHolder);

            const layout = () => {
                let padTop = 28;
                let padBot = 28;
                let gap = 20;
                let tagH = nameTag ? 96 : 0;
                let tagGap = nameTag ? 16 : 0;
                let btnH = 72;
                wrap.setAttribute("width", panelW - 80);
                wrap.setAttribute("height", 900);
                div.style.height = "auto";
                void div.offsetHeight;
                let textH = Math.max(div.scrollHeight, 40);
                let panelH = padTop + tagH + tagGap + textH + gap + btnH + padBot;
                panelH = Math.min(panelH, 0.90 * this.H);
                let panelY = Math.max(0.04 * this.H, (this.H - panelH) / 2);
                panel.setAttribute("x", panelX);
                panel.setAttribute("y", panelY);
                panel.setAttribute("width", panelW);
                panel.setAttribute("height", panelH);
                if (tagGroup) {
                    tagGroup.style.transform = "translate(0px, " + (panelY + padTop + tagH / 2) + "px)";
                }
                wrap.setAttribute("x", panelX + 40);
                wrap.setAttribute("y", panelY + padTop + tagH + tagGap);
                wrap.setAttribute("height", textH);
                btnHolder.style.transform = "translate(0px, " + (panelY + panelH - padBot - btnH / 2) + "px)";
            };
            layout();
            requestAnimationFrame(layout);

            btn.onpointerdown = () => {
                btn.onpointerdown = null;
                if (typeof AudioCont !== "undefined") AudioCont.play_sound_effect("button_click");
                let finish = async () => {
                    if (animateOut) await this._animateGroupUpAndOut(group);
                    else if (group.parentNode) group.remove();
                    resolve();
                };
                finish();
            };
        });
    }

    async _animateGroupUpAndOut(group) {
        if (!group) return;
        group.style.transition = "transform 480ms ease-in, opacity 420ms ease-in";
        group.style.transformOrigin = (this.W / 2) + "px " + (this.H / 2) + "px";
        void group.getBoundingClientRect();
        group.style.transform = "translateY(" + (-0.28 * this.H) + "px)";
        group.style.opacity = "0";
        await wait(480);
        if (group.parentNode) group.remove();
    }

    _drawNameTag(parent, cx, cy, name, compact) {
        let fontSize = compact
            ? (String(name).length > 10 ? 34 : 42)
            : (String(name).length > 10 ? 52 : 64);
        let w = Math.max(compact ? 240 : 340, (compact ? 56 : 80) + String(name).length * (fontSize * 0.72));
        let h = compact ? 70 : 96;
        let rect = create_SVG_rect(cx - w / 2, cy - h / 2, w, h);
        rect.setAttribute("rx", 16);
        rect.setAttribute("fill", "#f7f1dc");
        rect.setAttribute("stroke", "#7a5a1e");
        rect.setAttribute("stroke-width", "6");
        parent.appendChild(rect);

        let hole = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hole.setAttribute("cx", cx - w / 2 + 28);
        hole.setAttribute("cy", cy);
        hole.setAttribute("r", 11);
        hole.setAttribute("fill", "#efe6d4");
        hole.setAttribute("stroke", "#7a5a1e");
        hole.setAttribute("stroke-width", "4");
        parent.appendChild(hole);

        let text = create_SVG_text_elem(cx + 12, cy + 12, name);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", String(fontSize));
        text.setAttribute("font-weight", "800");
        text.setAttribute("font-family", "Arial, sans-serif");
        text.setAttribute("fill", "#3b2f14");
        parent.appendChild(text);
        return h;
    }

    async _runBindingBlock(block, blockIndex) {
        let trials = shuffleArray(this.expandedTrials.slice());
        for (let t = 0; t < trials.length; t++) {
            if (this.destroyed) return;
            this.currentTrialIndex = t;
            await this._runBindingTrial(block, blockIndex, trials[t], t);
        }
    }

    async _runRetrainingBlock(block, blockIndex) {
        let ids = shuffleArray(block.retraining_fennimals.slice());
        for (let t = 0; t < ids.length; t++) {
            if (this.destroyed) return;
            this.currentTrialIndex = t;
            await this._runRetrainingTrial(block, blockIndex, this._getFen(ids[t]), t);
        }
    }

    _hatSlotPositions(flavour, count) {
        let spread = this.params.hatSpread || { left: 0.12, right: 0.88 };
        let xs = [];
        for (let i = 0; i < count; i++) {
            let t = count === 1 ? 0.5 : i / (count - 1);
            xs.push((spread.left + t * (spread.right - spread.left)) * this.W);
        }
        if (flavour === "gift_shop") {
            let g = this.params.giftShop || {};
            let topY = (g.shelf1Y != null ? g.shelf1Y : 0.26) * this.H;
            let botY = (g.shelf2Y != null ? g.shelf2Y : 0.50) * this.H;
            let mid = Math.ceil(count / 2);
            return xs.map((x, i) => ({ x, y: i < mid ? topY : botY }));
        }
        let yFrac = flavour === "laundry"
            ? (this.params.laundry && this.params.laundry.hatY)
            : (this.params.lostAndFound && this.params.lostAndFound.hatY);
        let y = (yFrac != null ? yFrac : 0.28) * this.H;
        return xs.map((x) => ({ x, y }));
    }

    _placeHat(fen, x, y, opts) {
        opts = opts || {};
        let template = document.getElementById("hat_" + fen.hat);
        if (!template) this._fail(`missing SVG hat_${fen.hat} for Fennimal "${fen.id}".`);
        let parent = opts.parent || this.ItemLayers.Plus1;
        let elem = copy_scale_and_move_object_to_position(
            template,
            parent,
            x,
            y,
            opts.scale || this.params.hatScale || 3,
            opts.id || ("binding_hat_" + fen.id)
        );
        elem.style.pointerEvents = opts.pointerEvents === false ? "none" : "all";
        if (opts.opacity != null) elem.style.opacity = opts.opacity;
        return { fenId: fen.id, hatId: fen.hat, elem, homeX: x, homeY: y, homeParent: parent };
    }

    _placeMovableLabel(parent, x, y, w, h, fill, label, extra) {
        let g = create_SVG_group(0, 0);
        g.style.transform = `translate(${x}px, ${y}px)`;
        g.style.cursor = "pointer";
        parent.appendChild(g);
        this._drawPlaceholderRect(g, 0, 0, w, h, fill, label, extra);
        return { elem: g, homeX: x, homeY: y };
    }

    _drawPlaceholderRect(parent, cx, cy, w, h, fill, label, extra) {
        let rect = create_SVG_rect(cx - w / 2, cy - h / 2, w, h);
        rect.setAttribute("rx", 18);
        rect.setAttribute("fill", fill);
        rect.setAttribute("stroke", "#5c4a2a");
        rect.setAttribute("stroke-width", "5");
        parent.appendChild(rect);
        if (label) {
            let text = create_SVG_text_elem(cx, cy + 8, label);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-size", "26");
            text.setAttribute("font-weight", "700");
            text.setAttribute("fill", "#3b2f14");
            text.style.pointerEvents = "none";
            parent.appendChild(text);
        }
        if (extra) {
            let sub = create_SVG_text_elem(cx, cy + 36, extra);
            sub.setAttribute("text-anchor", "middle");
            sub.setAttribute("font-size", "20");
            sub.setAttribute("fill", "#5c4a2a");
            sub.style.pointerEvents = "none";
            parent.appendChild(sub);
        }
        return rect;
    }

    _removeShippingBoxParts(root, selectors) {
        if (!root) return;
        selectors.forEach((sel) => {
            root.querySelectorAll(sel).forEach((el) => el.remove());
        });
    }

    _placeShippingBox(trial) {
        let template = document.getElementById("shipping_box");
        if (!template) this._fail("missing SVG shipping_box.");
        let p = this.params.lostAndFound || {};
        let x = (p.dropX != null ? p.dropX : 0.5) * this.W;
        let y = (p.dropY != null ? p.dropY : 0.78) * this.H;
        let grow = 1.44;
        let scale = (p.boxScale != null ? p.boxScale : 2.5) * grow;

        let back = copy_scale_and_move_object_to_position(
            template,
            this.ItemLayers.Main,
            x,
            y,
            scale,
            "binding_shipping_box_back"
        );
        this._removeShippingBoxParts(back, [".shipping_box_front", ".shipping_box_lid_closed"]);
        back.style.pointerEvents = "none";

        let front = copy_scale_and_move_object_to_position(
            template,
            this.ItemLayers.Plus2,
            x,
            y,
            scale,
            "binding_shipping_box_front"
        );
        this._removeShippingBoxParts(front, [".shipping_box_back", ".shipping_box_lid_open"]);
        front.style.pointerEvents = "none";

        let openLid = back.querySelector(".shipping_box_lid_open");
        let closedLid = front.querySelector(".shipping_box_lid_closed");
        if (openLid) openLid.style.opacity = "1";
        if (closedLid) {
            closedLid.style.opacity = "0";
            closedLid.style.pointerEvents = "none";
        }

        this.shippingBox = { back, front, openLid, closedLid };
        this.dropTarget = front;
        this._setShippingBoxAddress(trial);

        // Grow the box upward so the table-sitting bottom stays put.
        let bounds = this.getSvgBounds(back);
        if (bounds && bounds.height) {
            let shiftUp = bounds.height * (1 - 1 / grow) / 2;
            let plantedY = y - shiftUp;
            back.style.transform = "translate(" + x + "px, " + plantedY + "px)";
            front.style.transform = "translate(" + x + "px, " + plantedY + "px)";
            bounds = this.getSvgBounds(back);
            if (bounds && bounds.height) this._drawLostAndFoundTable(p, bounds.bottom);
        }
    }

    _setShippingBoxAddress(trial) {
        if (!this.shippingBox || !this.shippingBox.front) return;
        let label;
        if (this._isSelfTrial(trial)) {
            label = String((trial.target && trial.target.name) || (trial.cue && trial.cue.name) || "????");
        } else {
            let last = (trial.path && trial.path.length) ? trial.path[trial.path.length - 1] : "";
            label = this._targetRoleCaps(last);
        }
        let textEl = this.shippingBox.front.querySelector(".shipping_box_address_text")
            || this.shippingBox.front.querySelector("#shipping_box_address_text");
        if (!textEl) return;
        let tspan = textEl.querySelector("tspan");
        let target = tspan || textEl;
        target.textContent = label;
        if (label.length > 8) {
            let size = label.length > 12 ? "8.2px" : "9.4px";
            textEl.setAttribute("font-size", size);
            if (tspan) tspan.setAttribute("font-size", size);
        }
    }

    async _closeShippingBoxLid() {
        if (!this.shippingBox) return;
        let openLid = this.shippingBox.openLid || (this.shippingBox.back && this.shippingBox.back.querySelector(".shipping_box_lid_open"));
        let closedLid = this.shippingBox.closedLid || (this.shippingBox.front && this.shippingBox.front.querySelector(".shipping_box_lid_closed"));
        if (typeof AudioCont !== "undefined") AudioCont.play_sound_effect("box_open_cardboard");
        if (openLid) {
            openLid.style.transition = "opacity 320ms ease";
            openLid.style.opacity = "0";
        }
        if (closedLid) {
            closedLid.style.transition = "opacity 320ms ease";
            closedLid.style.opacity = "1";
        }
        await wait(340);
    }

    async _buildBindingRoom(flavour, trial) {
        this._clearScene();
        this._setSceneOpacity(0);
        this._paintBackground(flavour);

        if (flavour === "laundry") {
            this._buildLaundryRoom(trial);
            await this._fadeTrialIn();
            return;
        }
        if (flavour === "gift_shop") {
            this._buildGiftShop(trial);
            await this._fadeTrialIn();
            return;
        }

        let slots = shuffleArray(this._hatSlotPositions(flavour, this.hatFens.length));
        this.hats = this.hatFens.map((fen, i) => this._placeHat(fen, slots[i].x, slots[i].y, { opacity: 0 }));

        if (flavour === "lost_and_found") {
            this._placeShippingBox(trial);
        }

        await wait(40);
        this._placeOccluders();
        await this._fadeTrialIn();
    }

    _laundryWireY(x) {
        let w = this.laundryWire;
        if (!w) return 0.10 * this.H;
        let t = (x - w.x0) / Math.max(1, w.x1 - w.x0);
        t = Math.max(0, Math.min(1, t));
        return w.y0 + 4 * w.sag * t * (1 - t);
    }

    _drawLaundryWire(x0, x1, y0, sag) {
        let postL = document.createElementNS("http://www.w3.org/2000/svg", "line");
        postL.setAttribute("x1", x0);
        postL.setAttribute("x2", x0);
        postL.setAttribute("y1", 0);
        postL.setAttribute("y2", y0);
        postL.setAttribute("stroke", "#6a7a88");
        postL.setAttribute("stroke-width", "10");
        postL.setAttribute("stroke-linecap", "round");
        this.ItemLayers.Main.appendChild(postL);

        let postR = document.createElementNS("http://www.w3.org/2000/svg", "line");
        postR.setAttribute("x1", x1);
        postR.setAttribute("x2", x1);
        postR.setAttribute("y1", 0);
        postR.setAttribute("y2", y0);
        postR.setAttribute("stroke", "#6a7a88");
        postR.setAttribute("stroke-width", "10");
        postR.setAttribute("stroke-linecap", "round");
        this.ItemLayers.Main.appendChild(postR);

        let wire = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let midX = (x0 + x1) / 2;
        wire.setAttribute("d", "M " + x0 + " " + y0 + " Q " + midX + " " + (y0 + 2 * sag) + " " + x1 + " " + y0);
        wire.setAttribute("fill", "none");
        wire.setAttribute("stroke", "#8a9aa8");
        wire.setAttribute("stroke-width", "8");
        wire.setAttribute("stroke-linecap", "round");
        this.ItemLayers.Main.appendChild(wire);
    }

    _drawLaundryClip(x, wireY) {
        let clip = create_SVG_rect(x - 8, wireY - 11, 16, 26);
        clip.setAttribute("rx", 3);
        clip.setAttribute("fill", "#c4a574");
        clip.setAttribute("stroke", "#5c4a2a");
        clip.setAttribute("stroke-width", "3");
        clip.style.pointerEvents = "none";
        this.ItemLayers.Plus1.appendChild(clip);
    }

    _hangHatFromWire(hat, x, wireY) {
        let b = this.getSvgBounds(hat.elem);
        if (!b.height) return;
        let desiredTop = wireY + 5;
        hat.homeY = hat.homeY + (desiredTop - b.top);
        hat.elem.style.transform = "translate(" + x + "px, " + hat.homeY + "px)";
    }

    _drawLaundryTable(p) {
        p = p || {};
        let tableH = p.tableHeight || 58;
        let tableW = (p.tableWidth != null ? p.tableWidth : 0.34) * this.W;
        let tableY = (p.tableY != null ? p.tableY : 0.66) * this.H;
        let tableX = (this.W - tableW) / 2;
        let drawn = this._drawWoodenTable({
            id: "hat_binding_laundry_table",
            parent: this.ItemLayers.Neg1,
            tableX: tableX,
            tableY: tableY,
            tableW: tableW,
            tableH: tableH,
            legW: 22,
            lipH: 8,
            rx: 12,
            legInset: 0.10,
            legTopOffset: 24
        });
        return { cx: drawn.cx, tableY: drawn.tableY, tableH: drawn.tableH };
    }

    _placeLaundryTag(trial, x, tableTop) {
        let label = this._laundryTagLabel(trial);
        let w = Math.min(0.48 * this.W, Math.max(340, 17 * label.length));
        let h = label.length > 20 ? 128 : 108;
        let y = tableTop - h / 2 + 18;
        let g = create_SVG_group(0, 0);
        g.style.transform = "translate(" + x + "px, " + y + "px)";
        g.style.cursor = "pointer";
        this.ItemLayers.Plus2.appendChild(g);

        let rect = create_SVG_rect(-w / 2, -h / 2, w, h);
        rect.setAttribute("rx", 16);
        rect.setAttribute("fill", "#f7f1dc");
        rect.setAttribute("stroke", "#7a5a1e");
        rect.setAttribute("stroke-width", "6");
        g.appendChild(rect);

        let hole = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hole.setAttribute("cx", -w / 2 + 28);
        hole.setAttribute("cy", 0);
        hole.setAttribute("r", 11);
        hole.setAttribute("fill", "#efe6d4");
        hole.setAttribute("stroke", "#7a5a1e");
        hole.setAttribute("stroke-width", "4");
        g.appendChild(hole);

        let wrap = create_SVG_foreignElement(-w / 2 + 48, -h / 2 + 12, w - 64, h - 24);
        wrap.style.pointerEvents = "none";
        let div = document.createElement("div");
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
        div.style.textAlign = "center";
        div.style.color = "#3b2f14";
        div.style.fontFamily = "Arial, sans-serif";
        div.style.fontSize = label.length > 22 ? "28px" : "32px";
        div.style.fontWeight = "800";
        div.style.lineHeight = "125%";
        div.textContent = label;
        wrap.appendChild(div);
        g.appendChild(wrap);

        this.tagView = { elem: g, homeX: x, homeY: y, w: w, h: h };
    }

    _buildLaundryRoom(trial) {
        let p = this.params.laundry || {};
        let x0 = (p.wireLeft != null ? p.wireLeft : 0.10) * this.W;
        let x1 = (p.wireRight != null ? p.wireRight : 0.90) * this.W;
        let y0 = (p.wireY != null ? p.wireY : 0.10) * this.H;
        let sag = (p.wireSag != null ? p.wireSag : 0.055) * this.H;
        this.laundryWire = { x0: x0, x1: x1, y0: y0, sag: sag };
        this._drawLaundryWire(x0, x1, y0, sag);

        let fens = shuffleArray(this.hatFens.slice());
        this.hats = fens.map((fen, i) => {
            let t = fens.length === 1 ? 0.5 : (i + 0.5) / fens.length;
            let x = x0 + t * (x1 - x0);
            let wireY = this._laundryWireY(x);
            let hat = this._placeHat(fen, x, wireY + 90, { opacity: 1, pointerEvents: false });
            this._hangHatFromWire(hat, x, wireY);
            this._drawLaundryClip(x, wireY);
            return hat;
        });

        let table = this._drawLaundryTable(p);
        this._placeLaundryTag(trial, table.cx, table.tableY);
    }

    _sitHatOnTable(hat, tableY) {
        if (!hat || !hat.elem) return;
        let b = this.getSvgBounds(hat.elem);
        if (!b.height) return;
        let desiredBottom = tableY + 8;
        hat.homeY = hat.homeY + (desiredBottom - b.bottom);
        hat.elem.style.transform = "translate(" + hat.homeX + "px, " + hat.homeY + "px)";
    }

    _buildGiftShop(trial) {
        let p = this.params.giftShop || {};
        let cols = p.cols || [0.26, 0.50, 0.74];
        let backY = (p.backRowY != null ? p.backRowY : 0.34) * this.H + (p.tableYOffset != null ? p.tableYOffset : 20);
        let frontY = (p.frontRowY != null ? p.frontRowY : 0.55) * this.H
            + (p.tableYOffset != null ? p.tableYOffset : 20)
            + (p.frontRowYOffset != null ? p.frontRowYOffset : 50);
        let tableW = (p.tableWidth != null ? p.tableWidth : 0.18) * this.W;
        let dummyN = p.dummyCount != null ? p.dummyCount : 3;
        let dx = p.stackDx != null ? p.stackDx : 22;
        let hatScale = p.hatScale != null ? p.hatScale : (this.params.hatScale || 3);
        let fens = shuffleArray(this.hatFens.slice());
        this.hats = [];
        this.dummyHats = [];

        let rows = [
            { y: backY, h: p.tallTableHeight || 58, parent: this.ItemLayers.Main, tall: true },
            { y: frontY, h: p.shortTableHeight || 48, parent: this.ItemLayers.Plus1, tall: false }
        ];

        fens.forEach((fen, i) => {
            let row = i < 3 ? rows[0] : rows[1];
            let cx = (cols[i % 3] != null ? cols[i % 3] : 0.50) * this.W;
            this._drawWoodenTable({
                parent: row.parent,
                tableX: cx - tableW / 2,
                tableY: row.y,
                tableW: tableW,
                tableH: row.h,
                legW: row.tall ? 24 : 20,
                lipH: row.tall ? 10 : 8,
                rx: 12,
                legInset: 0.10,
                legTopOffset: 24
            });

            let n = dummyN + 1;
            let startX = cx - ((n - 1) * dx) / 2;
            for (let d = 0; d < dummyN; d++) {
                let dummy = this._placeHat(fen, startX + d * dx, row.y, {
                    parent: row.parent,
                    pointerEvents: false,
                    opacity: 1,
                    scale: hatScale,
                    id: "binding_hat_" + fen.id + "_d" + d + "_" + i
                });
                this._sitHatOnTable(dummy, row.y);
                this.dummyHats.push(dummy);
            }
            let active = this._placeHat(fen, startX + dummyN * dx, row.y, {
                parent: row.parent,
                pointerEvents: false,
                opacity: 1,
                scale: hatScale,
                id: "binding_hat_" + fen.id
            });
            this._sitHatOnTable(active, row.y);
            this.hats.push(active);
        });

        this._placeShoppingCart(p);
        this._placeClipboard(trial, p);
    }

    _placeShoppingCart(p) {
        p = p || {};
        let template = document.getElementById("shopping_cart");
        if (!template) this._fail("missing SVG shopping_cart.");
        let x = (p.cartX != null ? p.cartX : 0.14) * this.W;
        let y = (p.cartY != null ? p.cartY : 0.86) * this.H;
        let scale = p.cartScale != null ? p.cartScale : 3.055;
        let elem = copy_scale_and_move_object_to_position(
            template,
            this.ItemLayers.Plus2,
            x,
            y,
            scale,
            "binding_shopping_cart"
        );
        elem.style.pointerEvents = "none";
        this.shoppingCart = { elem: elem, homeX: x, homeY: y };
        this.dropTarget = elem;
    }

    _placeClipboard(trial, p) {
        p = p || {};
        let template = document.getElementById("clipboard");
        if (!template) this._fail("missing SVG clipboard.");
        let x = (p.clipboardX != null ? p.clipboardX : 0.88) * this.W;
        let y = (p.clipboardY != null ? p.clipboardY : 0.84) * this.H;
        let scale = p.clipboardScale != null ? p.clipboardScale : 2.86;
        let elem = copy_scale_and_move_object_to_position(
            template,
            this.ItemLayers.Plus2,
            x,
            y,
            scale,
            "binding_clipboard"
        );
        elem.style.pointerEvents = "none";

        let inner = elem.querySelector(".clipboard") || elem;
        let wrap = create_SVG_foreignElement(40, 66, 78, 72, "clipboard_item_text");
        wrap.style.pointerEvents = "none";
        let box = document.createElement("div");
        box.style.position = "relative";
        box.style.width = "100%";
        box.style.height = "100%";
        box.style.display = "flex";
        box.style.alignItems = "center";
        box.style.justifyContent = "center";
        let div = document.createElement("div");
        div.style.width = "100%";
        div.style.textAlign = "center";
        div.style.color = "#333333";
        div.style.fontFamily = "Arial, sans-serif";
        div.style.fontWeight = "800";
        div.style.lineHeight = "120%";
        div.style.overflow = "hidden";
        div.style.overflowWrap = "break-word";
        box.appendChild(div);
        let strikeWrap = document.createElement("div");
        strikeWrap.style.position = "absolute";
        strikeWrap.style.left = "0";
        strikeWrap.style.top = "0";
        strikeWrap.style.width = "100%";
        strikeWrap.style.height = "100%";
        strikeWrap.style.pointerEvents = "none";
        box.appendChild(strikeWrap);
        wrap.appendChild(box);
        inner.appendChild(wrap);

        this.clipboardView = { elem: elem, textDiv: div, strikeWrap: strikeWrap, homeX: x, homeY: y };
        this._setClipboardItem(this._pathTargetLabel(trial));
    }

    _setClipboardItem(label) {
        if (!this.clipboardView || !this.clipboardView.textDiv) return;
        let text = String(label || "");
        this.clipboardView.textDiv.textContent = text;
        this.clipboardView.textDiv.style.fontSize = text.length > 18 ? "9px" : "11px";
        if (this.clipboardView.strikeWrap) this.clipboardView.strikeWrap.innerHTML = "";
    }

    _clipboardTextLineRects() {
        let div = this.clipboardView && this.clipboardView.textDiv;
        let wrap = this.clipboardView && this.clipboardView.strikeWrap;
        if (!div || !wrap) return [];
        let range = document.createRange();
        range.selectNodeContents(div);
        let rects = Array.from(range.getClientRects()).filter((r) => r.width > 1 && r.height > 1);
        if (!rects.length && div.getBoundingClientRect) {
            let r = div.getBoundingClientRect();
            if (r.width > 1) rects = [r];
        }
        return rects;
    }

    async _strikethroughClipboard() {
        if (!this.clipboardView || !this.clipboardView.strikeWrap || !this.clipboardView.textDiv) return;
        let wrap = this.clipboardView.strikeWrap;
        wrap.innerHTML = "";
        let parent = wrap.getBoundingClientRect();
        if (!parent.width || !parent.height) return;
        let rects = this._clipboardTextLineRects();
        if (!rects.length) {
            rects = [{
                left: parent.left + parent.width * 0.08,
                width: parent.width * 0.84,
                top: parent.top + parent.height * 0.5,
                height: 8
            }];
        }
        let lines = rects.map((r) => {
            let el = document.createElement("div");
            let leftPct = ((r.left - parent.left) / parent.width) * 100;
            let widthPct = (r.width / parent.width) * 100;
            let topPct = ((r.top - parent.top + r.height / 2) / parent.height) * 100;
            el.style.position = "absolute";
            el.style.left = Math.max(0, leftPct - 2) + "%";
            el.style.top = topPct + "%";
            el.style.width = "0";
            el.style.height = "3px";
            el.style.borderRadius = "2px";
            el.style.background = "#2b2b2b";
            el.style.transform = "translateY(-50%)";
            el.style.transition = "width 320ms ease";
            wrap.appendChild(el);
            return { el: el, width: Math.min(100, widthPct + 4) + "%" };
        });
        for (let i = 0; i < lines.length; i++) {
            void lines[i].el.offsetWidth;
            lines[i].el.style.width = lines[i].width;
            await wait(340);
        }
    }

    _uniformOccluderSize() {
        let maxW = 0;
        let maxH = 0;
        this.hats.forEach((hat) => {
            let b = this.getSvgBounds(hat.elem);
            if (b.width > maxW) maxW = b.width;
            if (b.height > maxH) maxH = b.height;
        });
        let pad = 28;
        let fallback = this.params.occluderSize || 150;
        return {
            w: Math.max(fallback, Math.ceil(maxW + pad * 2)),
            h: Math.max(fallback, Math.ceil(maxH + pad * 2))
        };
    }

    _placeOccluders() {
        this.occluders = [];
        let size = this._uniformOccluderSize();
        this.hats.forEach((hat) => {
            let b = this.getSvgBounds(hat.elem);
            let cx = b.width ? b.cx : hat.homeX;
            let cy = b.height ? b.cy : hat.homeY;
            let g = create_SVG_group(0, 0);
            this.ItemLayers.Plus2.appendChild(g);
            let rect = create_SVG_rect(cx - size.w / 2, cy - size.h / 2, size.w, size.h);
            rect.setAttribute("rx", 14);
            rect.setAttribute("fill", "#1a1613");
            rect.setAttribute("stroke", "#0b0908");
            rect.setAttribute("stroke-width", "5");
            g.appendChild(rect);
            let q = create_SVG_text_elem(cx, cy + 8, "?");
            q.setAttribute("text-anchor", "middle");
            q.setAttribute("dominant-baseline", "middle");
            q.setAttribute("font-size", String(Math.round(Math.min(size.w, size.h) * 0.58)));
            q.setAttribute("font-weight", "900");
            q.setAttribute("fill", "#f4ead8");
            g.appendChild(q);
            this.occluders.push(g);
        });
    }

    _removeOccluders() {
        this.occluders.forEach((el) => { if (el.parentNode) el.remove(); });
        this.occluders = [];
        this.hats.forEach((hat) => {
            if (!hat || !hat.elem) return;
            hat.elem.style.transition = "opacity 280ms ease-out";
            hat.elem.style.opacity = "1";
        });
        (this.shelfHats || []).forEach((hat) => {
            if (!hat || !hat.elem) return;
            hat.elem.style.transition = "opacity 280ms ease-out";
            hat.elem.style.opacity = "0.35";
        });
    }

    getSvgBounds(element) {
        const svg = element && element.ownerSVGElement;
        if (!element || !svg) {
            return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, cx: 0, cy: 0 };
        }
        try {
            const r = element.getBoundingClientRect();
            const screenCTM = svg.getScreenCTM();
            if (!screenCTM) throw new Error("no ctm");
            const inv = screenCTM.inverse();
            const toSvg = (x, y) => {
                const pt = svg.createSVGPoint();
                pt.x = x;
                pt.y = y;
                return pt.matrixTransform(inv);
            };
            const a = toSvg(r.left, r.top);
            const b = toSvg(r.right, r.bottom);
            const left = Math.min(a.x, b.x);
            const top = Math.min(a.y, b.y);
            const right = Math.max(a.x, b.x);
            const bottom = Math.max(a.y, b.y);
            return { left, top, right, bottom, width: right - left, height: bottom - top, cx: (left + right) / 2, cy: (top + bottom) / 2 };
        } catch (err) {
            let b = element.getBBox();
            return {
                left: b.x, top: b.y, right: b.x + b.width, bottom: b.y + b.height,
                width: b.width, height: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2
            };
        }
    }

    _pointHits(mouse, element, pad) {
        if (!mouse || !element) return false;
        let b = this.getSvgBounds(element);
        let p = pad != null ? pad : (this.params.hatHitPad || 24);
        return mouse.x >= b.left - p && mouse.x <= b.right + p && mouse.y >= b.top - p && mouse.y <= b.bottom + p;
    }

    async _runBindingTrial(block, blockIndex, trial, trialIndex) {
        await this._buildBindingRoom(block.flavour, trial);
        let visStart = performance.now();
        await this._showVisualizePrompt(trial);
        let visualizationRt = Math.round(performance.now() - visStart);
        if (this._usesHatOccluders(block.flavour)) this._removeOccluders();
        await this._showSummaryBanner(trial, block.flavour);

        let log = {
            block_index: blockIndex,
            block_kind: "binding",
            flavour: block.flavour,
            condition: this.condition,
            trial_id: trial.id,
            role: trial.role,
            selected_triad: (trial.selected_triad || this.graph.selectedTriad).slice(),
            selected_arms: this.graph.selectedArmIds.slice(),
            cue_id: trial.cue_id,
            target_id: trial.target_id,
            path: trial.path.slice(),
            cue_name: trial.cue.name,
            target_name: trial.target.name,
            target_hat: trial.target.hat,
            visualization_rt_ms: visualizationRt,
            time_to_first_hat_ms: null,
            time_to_correct_hat_ms: null,
            first_hat: null,
            first_correct: null,
            hat_errors: [],
            hop_catch: null
        };
        let revealAt = performance.now();
        let finished = false;

        const recordAttempt = (hatId, correct) => {
            if (log.first_hat == null) {
                log.first_hat = hatId;
                log.first_correct = correct;
                log.time_to_first_hat_ms = Math.round(performance.now() - revealAt);
            }
            if (!correct) log.hat_errors.push(hatId);
        };

        await new Promise((resolve) => {
            const finishCorrect = (hatId) => {
                if (finished) return;
                finished = true;
                this._hideSummaryBanner();
                this._teardownDrag();
                this.responseArmed = false;
                recordAttempt(hatId, true);
                log.time_to_correct_hat_ms = Math.round(performance.now() - revealAt);
                if (typeof AudioCont !== "undefined") AudioCont.play_sound_effect("positive");
                (async () => {
                    if (block.flavour === "laundry") await this._animateTagOntoHat(hatId);
                    else if (block.flavour === "gift_shop") await this._animateHatIntoCart(hatId);
                    else if (this.dropTarget) await this._animateHatIntoDrop(hatId);
                    this.answers.push(log);
                    await wait(500);
                    await this._fadeTrialOut();
                    resolve();
                })();
            };

            const handleDropAway = async () => {
                if (finished) return;
                this.responseArmed = false;
                this._teardownDrag();
                if (typeof AudioCont !== "undefined") AudioCont.play_sound_effect("rejected");
                if (block.flavour === "laundry") await this._dropTagToFloor();
                else await this._snapMoversHome();
                if (finished || this.destroyed) return;
                this._armBindingResponse(block.flavour, trial, finishCorrect, handleMiss, handleDropAway);
            };

            const handleMiss = async (hatId) => {
                if (finished) return;
                this.responseArmed = false;
                this._teardownDrag();
                recordAttempt(hatId, false);
                if (typeof AudioCont !== "undefined") AudioCont.play_sound_effect("rejected");
                if (block.flavour === "laundry") await this._dropTagToFloor();
                let threshold = block.hop_catch_after_errors;
                if (!this._isSelfTrial(trial) && typeof threshold === "number" && log.hat_errors.length >= threshold) {
                    let revealedNames = await this._runHopCatch(trial, log);
                    if (finished || this.destroyed) return;
                    await this._showSummaryBanner(trial, block.flavour, revealedNames, { instant: true });
                }
                if (block.flavour !== "laundry") await this._snapMoversHome();
                if (finished || this.destroyed) return;
                this._armBindingResponse(block.flavour, trial, finishCorrect, handleMiss, handleDropAway);
            };

            this._armBindingResponse(block.flavour, trial, finishCorrect, handleMiss, handleDropAway);
        });
    }

    _armBindingResponse(flavour, trial, onCorrect, onMiss, onDropAway) {
        this._teardownDrag();
        this.responseArmed = true;
        if (flavour === "laundry") {
            this._armTagDrag(trial, onCorrect, onMiss, onDropAway);
        } else {
            this._armHatDrags(trial, onCorrect, onMiss, onDropAway);
        }
    }

    _teardownDrag() {
        if (typeof this.dragCleanup === "function") {
            this.dragCleanup();
            this.dragCleanup = null;
        }
        this._clearHatDragOutlines();
        this._clearTagDragOutline();
    }

    _usesHatOccluders(flavour) {
        return flavour === "lost_and_found";
    }

    _usesHatDragOutlines() {
        let flavour = this.currentBlock && this.currentBlock.flavour;
        return flavour === "lost_and_found" || flavour === "gift_shop";
    }

    _clearHatDragOutlines() {
        (this.hats || []).forEach((hat) => {
            if (hat.dragOutline && hat.dragOutline.parentNode) hat.dragOutline.remove();
            hat.dragOutline = null;
        });
    }

    _showHatDragOutlines() {
        if (!this._usesHatDragOutlines()) return;
        this._clearHatDragOutlines();
        this.hats.forEach((hat) => {
            if (!hat || !hat.elem || !hat.elem.parentNode) return;
            let outline = create_SVG_outline_of_group_ID(hat.elem);
            outline.removeAttribute("stroke");
            outline.querySelectorAll("*").forEach((child) => {
                child.removeAttribute("stroke");
                child.style.stroke = "";
            });
            outline.style.pointerEvents = "none";
            hat.elem.parentNode.insertBefore(outline, hat.elem);
            outline.classList.add("focus_on_SVG_outline");
            hat.dragOutline = outline;
        });
    }

    _clearTagDragOutline() {
        if (this.tagDragOutline && this.tagDragOutline.parentNode) this.tagDragOutline.remove();
        this.tagDragOutline = null;
    }

    _showTagDragOutline() {
        this._clearTagDragOutline();
        if (!this.tagView || !this.tagView.elem || !this.tagView.elem.parentNode) return;
        let outline = create_SVG_outline_of_group_ID(this.tagView.elem);
        outline.removeAttribute("stroke");
        outline.querySelectorAll("*").forEach((child) => {
            child.removeAttribute("stroke");
            child.style.stroke = "";
        });
        outline.style.pointerEvents = "none";
        this.tagView.elem.parentNode.insertBefore(outline, this.tagView.elem);
        outline.classList.add("focus_on_SVG_outline");
        this.tagDragOutline = outline;
    }

    _setElemCenter(elem, x, y) {
        elem.style.transition = "none";
        elem.style.transform = `translate(${x}px, ${y}px)`;
    }

    _forceStyle(elem) {
        if (elem) void elem.getBoundingClientRect();
    }

    _reparentKeepTransform(elem, parent, before) {
        if (!elem || !parent) return;
        let transform = elem.style.transform;
        if (before) parent.insertBefore(elem, before);
        else parent.appendChild(elem);
        elem.style.transition = "none";
        elem.style.transform = transform;
        this._forceStyle(elem);
    }

    async _animateTranslate(elem, x, y, ms, easing) {
        if (!elem) return;
        this._forceStyle(elem);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        elem.style.transition = "transform " + ms + "ms " + (easing || "ease");
        elem.style.transform = "translate(" + x + "px, " + y + "px)";
        await wait(ms);
        elem.style.transition = "";
    }

    async _animateHatIntoCart(hatId) {
        let hat = this.hats.find((h) => h.hatId === hatId);
        if (!hat || !hat.elem || !this.shoppingCart || !this.shoppingCart.elem) return;
        let cart = this.shoppingCart.elem;
        let box = this.getSvgBounds(cart);
        if (!box.width) return;

        hat.elem.style.pointerEvents = "none";
        let hoverX = box.cx;
        let hoverY = box.top - Math.max(70, 0.08 * this.H);
        await this._animateTranslate(hat.elem, hoverX, hoverY, 420, "cubic-bezier(0.15, 0.85, 0.25, 1.08)");

        this._reparentKeepTransform(hat.elem, this.ItemLayers.Plus2, cart);
        let sinkX = box.cx + 8;
        let sinkY = box.top + box.height * 0.36;
        await this._animateTranslate(hat.elem, sinkX, sinkY, 480, "ease-in");

        await this._strikethroughClipboard();

        let delta = this.W - this.shoppingCart.homeX + 240;
        this._forceStyle(cart);
        this._forceStyle(hat.elem);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        cart.style.transition = "transform 780ms ease-in";
        hat.elem.style.transition = "transform 780ms ease-in";
        cart.style.transform = "translate(" + (this.shoppingCart.homeX + delta) + "px, " + this.shoppingCart.homeY + "px)";
        hat.elem.style.transform = "translate(" + (sinkX + delta) + "px, " + sinkY + "px)";
        await wait(800);
    }

    async _animateHatIntoDrop(hatId) {
        let hat = this.hats.find((h) => h.hatId === hatId);
        if (!hat || !hat.elem || !this.dropTarget) return;
        let dropEl = (this.shippingBox && this.shippingBox.front)
            ? (this.shippingBox.front.querySelector(".shipping_box_front") || this.shippingBox.front)
            : this.dropTarget;
        let box = this.getSvgBounds(dropEl);
        if (!box.width) return;

        hat.elem.style.pointerEvents = "none";
        this._reparentKeepTransform(hat.elem, this.ItemLayers.Plus1);
        let hoverX = box.cx;
        let hoverY = box.top - Math.max(90, 0.10 * this.H);
        await this._animateTranslate(hat.elem, hoverX, hoverY, 420, "cubic-bezier(0.15, 0.85, 0.25, 1.08)");

        let sinkY = box.cy + Math.min(28, box.height * 0.12);
        let hatScale = this.params.hatScale || 3;
        if (typeof set_nested_scale === "function") {
            set_nested_scale(hat.elem, hatScale * 0.5, 560);
        }
        await this._animateTranslate(hat.elem, box.cx, sinkY, 560, "ease-in");

        hat.elem.style.transition = "opacity 320ms ease-in";
        hat.elem.style.opacity = "0";
        await wait(340);

        if (this.shippingBox) await this._closeShippingBoxLid();
    }

    async _animateTagOntoHat(hatId) {
        if (!this.tagView || !this.tagView.elem) return;
        let hat = this.hats.find((h) => h.hatId === hatId);
        if (!hat || !hat.elem) return;
        let box = this.getSvgBounds(hat.elem);
        if (!box.width) return;
        this.ItemLayers.Plus2.appendChild(this.tagView.elem);
        this.tagView.elem.style.pointerEvents = "none";
        this.tagView.elem.style.transition = "transform 420ms cubic-bezier(0.15, 0.85, 0.25, 1.08)";
        this.tagView.elem.style.transform = "translate(" + box.cx + "px, " + box.cy + "px) scale(0.75)";
        await wait(440);

        this.tagView.elem.style.transition = "opacity 320ms ease-in";
        hat.elem.style.transition = "opacity 320ms ease-in";
        this.tagView.elem.style.opacity = "0";
        hat.elem.style.opacity = "0";
        await wait(340);
    }

    async _dropTagToFloor() {
        if (!this.tagView || !this.tagView.elem) return;
        let b = this.getSvgBounds(this.tagView.elem);
        let x = b.width ? b.cx : this.tagView.homeX;
        let p = this.params.laundry || {};
        let y = (p.tagFloorY != null ? p.tagFloorY : 0.80) * this.H;
        this.tagView.homeX = x;
        this.tagView.homeY = y;
        this.tagView.elem.style.transition = "transform 420ms ease-in";
        this.tagView.elem.style.transform = "translate(" + x + "px, " + y + "px)";
        await wait(420);
        this.tagView.elem.style.transition = "";
    }

    async _snapMoversHome() {
        let movers = this.hats.slice();
        if (this.tagView) movers.push(this.tagView);
        let ms = this.params.snapBackMs || 280;
        await Promise.all(movers.map((item) => {
            if (!item || !item.elem) return Promise.resolve();
            return this._animateTranslate(item.elem, item.homeX, item.homeY, ms, "ease-in-out");
        }));
        movers.forEach((item) => {
            if (item && item.elem && item.homeParent && item.elem.parentNode !== item.homeParent) {
                this._reparentKeepTransform(item.elem, item.homeParent);
            }
        });
    }

    _armHatDrags(trial, onCorrect, onMiss, onDropAway) {
        let cleanups = [];
        this.hats.forEach((hat) => {
            let handler = (event) => {
                if (!this.responseArmed) return;
                event.preventDefault();
                this._clearHatDragOutlines();
                this.ItemLayers.Plus2.appendChild(hat.elem);
                this._beginDrag(hat.elem, event, (mouse) => {
                    let overDrop = this._pointHits(mouse, this.dropTarget, this.params.dropHitPad);
                    if (overDrop && hat.fenId === trial.target_id) onCorrect(hat.hatId);
                    else if (overDrop) onMiss(hat.hatId);
                    else if (typeof onDropAway === "function") onDropAway();
                    else {
                        (async () => {
                            await this._snapMoversHome();
                            if (this.responseArmed && !this.destroyed) this._showHatDragOutlines();
                        })();
                    }
                });
            };
            hat.elem.style.cursor = "pointer";
            hat.elem.style.pointerEvents = "auto";
            hat.elem.addEventListener("pointerdown", handler);
            cleanups.push(() => hat.elem.removeEventListener("pointerdown", handler));
        });
        this.dragCleanup = () => cleanups.forEach((fn) => fn());
        this._showHatDragOutlines();
    }

    _armTagDrag(trial, onCorrect, onMiss, onDropAway) {
        if (!this.tagView) return;
        let handler = (event) => {
            if (!this.responseArmed) return;
            event.preventDefault();
            this._clearTagDragOutline();
            this._beginDrag(this.tagView.elem, event, (mouse) => {
                let hit = this.hats.find((hat) => this._pointHits(mouse, hat.elem, this.params.hatHitPad));
                if (hit && hit.fenId === trial.target_id) onCorrect(hit.hatId);
                else if (hit) onMiss(hit.hatId);
                else if (typeof onDropAway === "function") onDropAway();
                else onMiss(null);
            });
        };
        this.tagView.elem.style.cursor = "pointer";
        this.tagView.elem.style.pointerEvents = "auto";
        this.tagView.elem.addEventListener("pointerdown", handler);
        this.dragCleanup = () => {
            if (this.tagView && this.tagView.elem) {
                this.tagView.elem.removeEventListener("pointerdown", handler);
            }
        };
        this._showTagDragOutline();
    }

    _beginDrag(elem, startEvent, onRelease) {
        let mask = create_SVG_rect(0, 0, this.W, this.H);
        mask.style.opacity = 0;
        mask.style.pointerEvents = "all";
        this.ItemLayers.Plus2.appendChild(mask);
        let move = (ev) => {
            let pos = getMousePosition(ev);
            this._setElemCenter(elem, pos.x, pos.y);
        };
        let finished = false;
        let up = (ev) => {
            if (finished) return;
            finished = true;
            mask.removeEventListener("pointermove", move);
            mask.removeEventListener("pointerup", up);
            mask.removeEventListener("pointercancel", up);
            if (mask.parentNode) mask.remove();
            if (ev) onRelease(getMousePosition(ev));
        };
        mask.addEventListener("pointermove", move);
        mask.addEventListener("pointerup", up);
        mask.addEventListener("pointercancel", up);
        let previousCleanup = this.dragCleanup;
        this.dragCleanup = () => {
            up(null);
            this.dragCleanup = previousCleanup;
            if (typeof previousCleanup === "function") previousCleanup();
        };
        move(startEvent);
    }

    async _runHopCatch(trial, log) {
        if (!trial.path || !trial.path.length) return [];
        if (!Array.isArray(log.hop_catch)) log.hop_catch = [];
        if (!this.currentBlock || this.currentBlock.flavour !== "laundry") {
            await this._snapMoversHome();
        }

        let dim = create_SVG_rect(0, 0, this.W, this.H);
        dim.setAttribute("fill", "#111");
        dim.style.opacity = 0.52;
        dim.style.pointerEvents = "none";
        this.ItemLayers.Plus2.appendChild(dim);
        this._raiseSummaryBanner();

        let current = trial.cue;
        let revealedNames = [];
        for (let i = 0; i < trial.path.length; i++) {
            let relation = trial.path[i];
            let next = this._stepRelation(current, relation, "hop-catch");
            let stepStart = performance.now();
            let result = await this._askHopCatchName(this._hopCatchQuestionHtml(trial, revealedNames, i), next);
            log.hop_catch.push({
                kind: "name",
                relation,
                from_id: current.id,
                correct_name: next.name,
                failed_attempts: result ? result.failedAttempts : 0,
                name_revealed: !!(result && result.nameRevealed),
                rt_ms: Math.round(performance.now() - stepStart)
            });
            revealedNames.push(next.name);
            current = next;
        }

        if (dim.parentNode) dim.remove();
        return revealedNames;
    }

    _askHopCatchName(questionHtml, correctFen) {
        let panelTop = 0.08 * this.H;
        if (this.taskBanner) {
            let bar = this.taskBanner.querySelector("rect");
            if (bar) {
                panelTop = Number(bar.getAttribute("y")) + Number(bar.getAttribute("height")) + 16;
            }
        }
        let overlay = new TypedNameAskOverlay(this.ItemLayers.Plus2, this.W, this.H, {
            maxFailedAttempts: 5,
            closeDistance: 2,
            largePanel: true,
            panelTop: panelTop,
            panelFill: "rgba(250, 246, 236, 0.96)",
            getQuestionHtml: ({ feedbackKind, nameRevealed, correctName }) => {
                let html = questionHtml;
                if (feedbackKind === "close") html += "<br><br>Close, but not quite yet";
                if (feedbackKind === "far") html += "<br><br>Oops, that's not it!";
                if (nameRevealed && correctName) {
                    html += "<br><br><span style='display:inline-block;padding:8px 14px;background:#ffe566;border-radius:10px;'>This Fennimal is called <b>"
                        + correctName + "</b>. Please type it below.</span>";
                }
                return html;
            }
        });
        return overlay.waitForCorrectName(correctFen.name);
    }

    _getBoundsInParent(element, parent) {
        if (!element || !parent) return { left: 0, top: 0, width: 0, height: 0, cx: 0, cy: 0 };
        try {
            let svg = element.ownerSVGElement;
            let r = element.getBoundingClientRect();
            let inv = parent.getScreenCTM().inverse();
            let a = svg.createSVGPoint();
            a.x = r.left;
            a.y = r.top;
            let b = svg.createSVGPoint();
            b.x = r.right;
            b.y = r.bottom;
            a = a.matrixTransform(inv);
            b = b.matrixTransform(inv);
            let left = Math.min(a.x, b.x);
            let top = Math.min(a.y, b.y);
            let right = Math.max(a.x, b.x);
            let bottom = Math.max(a.y, b.y);
            return {
                left, top, right, bottom,
                width: right - left,
                height: bottom - top,
                cx: (left + right) / 2,
                cy: (top + bottom) / 2
            };
        } catch (err) {
            let box = element.getBBox();
            return {
                left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height,
                width: box.width, height: box.height,
                cx: box.x + box.width / 2, cy: box.y + box.height / 2
            };
        }
    }

    _placeRetrainingPolaroid(fen, cx) {
        let template = document.getElementById("polaroid_frame");
        if (!template) this._fail("missing SVG polaroid_frame template.");

        let photoP = (typeof GenParam !== "undefined" && GenParam.PhotoTrial) ? GenParam.PhotoTrial : {};
        let p = this.params.retraining || {};
        if (cx == null) cx = (p.polaroidX != null ? p.polaroidX : 0.26) * this.W;
        let cy = (p.polaroidCenterY != null ? p.polaroidCenterY : (photoP.polaroidCenterY || 0.48)) * this.H;
        let polaroidScale = p.polaroidScale != null ? p.polaroidScale : (photoP.polaroidScale || 0.78);

        let groupTranslate = create_SVG_group(0, 0, undefined, "hat_binding_retraining_polaroid");
        let groupRotate = create_SVG_group(0, 0);
        let groupScale = create_SVG_group(0, 0);
        groupRotate.appendChild(groupScale);
        groupTranslate.appendChild(groupRotate);
        this.ItemLayers.Main.appendChild(groupTranslate);

        let frame = copy_scale_and_move_object_to_position(template, groupScale, cx, cy, 1);
        let bgRect = frame.getElementsByTagName("rect")[0];
        if (bgRect) {
            let regionColor = (typeof GenParam !== "undefined" && GenParam.RegionData && GenParam.RegionData[fen.region])
                ? GenParam.RegionData[fen.region].surrounding_color
                : "#ffffff";
            bgRect.style.fill = regionColor;
            bgRect.style.display = "inherit";
        }
        let nameNode = frame.getElementsByTagName("text")[0];
        if (nameNode && nameNode.childNodes[0]) {
            nameNode.childNodes[0].innerHTML = fen.name;
        }

        let circle = frame.getElementsByTagName("circle")[0];
        let targetCircle = circle ? getSVGInternalCenter(circle) : { x: cx, y: cy };

        let headSize = (typeof GenParam !== "undefined" && GenParam.Fennimal_head_size != null)
            ? GenParam.Fennimal_head_size
            : 0.6;
        let fenIcon = create_Fennimal_SVG_object(fen, headSize, false);
        fenIcon.querySelectorAll(".prep_element_hidden").forEach((el) => el.remove());
        fenIcon.style.display = "inherit";
        fenIcon.style.pointerEvents = "none";
        let fenScaleGroup = fenIcon.getElementsByClassName("Fennimal_scale_group")[0];
        let fenBody = fenIcon.getElementsByClassName("Fennimal_body")[0];
        let fenHead = fenIcon.getElementsByClassName("Fennimal_head")[0];
        if (fenBody) fenBody.style.transform = "translate(0px, 0px) scale(1, 1)";
        if (fenHead) fenHead.style.transform = "translate(0px, 0px) rotate(0deg)";
        fenIcon.querySelectorAll(".eye_gaze").forEach((eye) => {
            eye.style.transform = "translate(0px, 0px) scale(1.15)";
        });
        freeze_fennimal_decorative_animations(fenIcon);
        groupScale.appendChild(fenIcon);
        this._attachRetrainingToy(fen, fenIcon, p);

        let fenBox = fenIcon.getBBox();
        let frameBox = bgRect ? bgRect.getBBox() : { width: 500, height: 600 };
        let fenScale = Math.min(
            (frameBox.width * 0.82) / Math.max(fenBox.width, 1),
            (frameBox.height * 0.78) / Math.max(fenBox.height, 1)
        );
        let fenCx = fenBox.x + fenBox.width / 2;
        let fenCy = fenBox.y + fenBox.height / 2;
        if (fenScaleGroup) fenScaleGroup.style.transform = "";
        fenIcon.setAttribute(
            "transform",
            `translate(${targetCircle.x}, ${targetCircle.y}) scale(${fenScale}) translate(${-fenCx}, ${-fenCy})`
        );

        groupScale.style.transformOrigin = "center";
        groupRotate.style.transformOrigin = `${cx}px ${cy}px`;
        groupScale.style.transform = `scale(${polaroidScale})`;
        groupRotate.style.transform = "rotate(-3deg)";

        return { group: groupTranslate, fenIcon, groupScale, cx, cy };
    }

    _attachRetrainingToy(fen, fenIcon, retrainingParams) {
        if (!fen || !fen.toy) return null;
        let bodyGroup = fenIcon && fenIcon.getElementsByClassName("Fennimal_body")[0];
        let bodyScaleGroup = bodyGroup && bodyGroup.firstElementChild;
        let bodySvg = bodyScaleGroup && bodyScaleGroup.firstElementChild;
        if (!bodySvg) {
            this._fail(`retraining: Fennimal "${fen.id}" has a toy but no body SVG to attach it to.`);
        }
        let bodyPoint = bodySvg.getElementsByClassName("Fennimal_body_center_point")[0];
        if (!bodyPoint) {
            this._fail(
                `retraining: body "${fen.body}" (Fennimal "${fen.id}") is missing Fennimal_body_center_point.`
            );
        }
        let p = retrainingParams || {};
        let toyScale = (p.toyScale != null) ? p.toyScale : 2.2;
        // Draw the toy after the head so a chest placement is not hidden under the head.
        let parent = fenIcon.getElementsByClassName("Fennimal_scale_group")[0] || bodyScaleGroup;
        let toyGroup = attach_toy_to_fennimal_body(parent, bodySvg, fen, toyScale);
        if (!toyGroup) {
            this._fail(`retraining: could not print toy "${fen.toy}" on Fennimal "${fen.id}".`);
        }
        toyGroup.style.filter = p.toyDropShadow ||
            "drop-shadow(0px 0px 2px rgba(255,255,255,0.95)) drop-shadow(0px 1px 5px rgba(255,255,255,0.7))";
        return toyGroup;
    }

    _placePolaroidHatOccluder(fenIcon, parent) {
        let hats = fenIcon ? Array.from(fenIcon.querySelectorAll(".hat")) : [];
        if (!hats.length) this._fail("retraining polaroid Fennimal is missing a hat to occlude.");
        let union = null;
        hats.forEach((hatEl) => {
            let b = this._getBoundsInParent(hatEl, parent);
            if (!union) {
                union = { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
            } else {
                union.left = Math.min(union.left, b.left);
                union.top = Math.min(union.top, b.top);
                union.right = Math.max(union.right, b.right);
                union.bottom = Math.max(union.bottom, b.bottom);
            }
        });
        let pad = 18;
        let w = Math.max(70, (union.right - union.left) + pad * 2);
        let h = Math.max(70, (union.bottom - union.top) + pad * 2);
        let cx = (union.left + union.right) / 2;
        let cy = (union.top + union.bottom) / 2;

        let g = create_SVG_group(0, 0, undefined, "hat_binding_retraining_occluder");
        g.style.pointerEvents = "none";
        parent.appendChild(g);
        let rect = create_SVG_rect(cx - w / 2, cy - h / 2, w, h);
        rect.setAttribute("rx", 12);
        rect.setAttribute("fill", "#1a1613");
        rect.setAttribute("stroke", "#0b0908");
        rect.setAttribute("stroke-width", "4");
        g.appendChild(rect);
        let q = create_SVG_text_elem(cx, cy + 6, "?");
        q.setAttribute("text-anchor", "middle");
        q.setAttribute("dominant-baseline", "middle");
        q.setAttribute("font-size", String(Math.round(Math.min(w, h) * 0.58)));
        q.setAttribute("font-weight", "900");
        q.setAttribute("fill", "#f4ead8");
        g.appendChild(q);
        return g;
    }

    _setRetrainingHatButtonSelected(btn, selected) {
        if (!btn || !btn.rect) return;
        if (selected) {
            btn.rect.setAttribute("fill", "#ffe08a");
            btn.rect.setAttribute("stroke", "#5c3a10");
            btn.rect.setAttribute("stroke-width", "8");
            btn.group.style.filter = "drop-shadow(0px 0px 10px rgba(218, 165, 32, 0.85))";
        } else {
            btn.rect.setAttribute("fill", "#f7f1dc");
            btn.rect.setAttribute("stroke", "#7a5a1e");
            btn.rect.setAttribute("stroke-width", "4");
            btn.group.style.filter = "";
        }
    }

    _setRetrainingSelectVisible(selectBtn, visible) {
        if (!selectBtn) return;
        selectBtn.style.visibility = visible ? "visible" : "hidden";
        selectBtn.style.pointerEvents = visible ? "auto" : "none";
    }

    _placeCenteredHatIcon(parent, template, cx, cy, targetSize) {
        let clone = template.cloneNode(true);
        if (typeof strip_svg_ids_from_subtree === "function") strip_svg_ids_from_subtree(clone);
        clone.removeAttribute("id");
        clone.removeAttribute("display");
        clone.style.display = "inherit";
        let holder = create_SVG_group(0, 0);
        holder.style.pointerEvents = "none";
        parent.appendChild(holder);
        holder.appendChild(clone);
        let b;
        try {
            b = clone.getBBox();
        } catch (err) {
            b = { x: 0, y: 0, width: 0, height: 0 };
        }
        if (!b.width || !b.height) {
            b = { x: 0, y: 0, width: 106, height: 106 };
        }
        let s = targetSize / Math.max(b.width, b.height);
        holder.setAttribute(
            "transform",
            "translate(" + cx + ", " + cy + ") scale(" + s + ") translate(" +
                (-(b.x + b.width / 2)) + ", " + (-(b.y + b.height / 2)) + ")"
        );
        return holder;
    }

    _createRetrainingHatButton(fen, cx, cy, w, h, hatScale) {
        let template = document.getElementById("hat_" + fen.hat);
        if (!template) this._fail(`missing SVG hat_${fen.hat} for Fennimal "${fen.id}".`);
        let group = create_SVG_group(0, 0);
        group.setAttribute("transform", "translate(" + cx + ", " + cy + ")");
        group.style.cursor = "pointer";
        let shake = create_SVG_group(0, 0);
        group.appendChild(shake);
        let rect = create_SVG_rect(-w / 2, -h / 2, w, h);
        rect.setAttribute("rx", 18);
        shake.appendChild(rect);
        let icon = this._placeCenteredHatIcon(shake, template, 0, 0, Math.min(w, h) * 0.78);
        let btn = { group, shake, rect, icon, fenId: fen.id, hatId: fen.hat };
        this._setRetrainingHatButtonSelected(btn, false);
        return btn;
    }

    async _shakeRetrainingHatButtons(buttons) {
        buttons.forEach((btn) => {
            btn.shake.classList.remove("hat_choice_button_shake");
            void btn.shake.getBoundingClientRect();
            btn.shake.classList.add("hat_choice_button_shake");
        });
        await wait(420);
        buttons.forEach((btn) => btn.shake.classList.remove("hat_choice_button_shake"));
    }

    _buildRetrainingChoiceUI(fen) {
        let p = this.params.retraining || {};
        let ui = create_SVG_group(0, 0, undefined, "hat_binding_retraining_ui");
        this.ItemLayers.Plus2.appendChild(ui);

        let colX = 0.52 * this.W;
        let colW = 0.44 * this.W;
        let promptY = 0.05 * this.H;
        let bar = create_SVG_rect(colX, promptY, colW, 72);
        bar.setAttribute("rx", 20);
        bar.setAttribute("fill", "rgba(250, 246, 236, 0.96)");
        bar.setAttribute("stroke", "rgba(184, 159, 93, 0.95)");
        bar.setAttribute("stroke-width", "5");
        ui.appendChild(bar);

        let promptWrap = create_SVG_foreignElement(colX + 16, promptY + 8, colW - 32, 200);
        promptWrap.style.pointerEvents = "none";
        let promptDiv = document.createElement("div");
        promptDiv.style.width = "100%";
        promptDiv.style.height = "auto";
        promptDiv.style.display = "flex";
        promptDiv.style.alignItems = "center";
        promptDiv.style.justifyContent = "center";
        promptDiv.style.textAlign = "center";
        promptDiv.style.color = "#3b2f14";
        promptDiv.style.fontFamily = "Arial, sans-serif";
        promptDiv.style.fontSize = "34px";
        promptDiv.style.fontWeight = "800";
        promptDiv.style.lineHeight = "125%";
        promptDiv.textContent = "Which is " + fen.name + "'s hat?";
        promptWrap.appendChild(promptDiv);
        ui.appendChild(promptWrap);

        const layoutPrompt = () => {
            promptWrap.setAttribute("height", 240);
            promptDiv.style.height = "auto";
            void promptDiv.offsetHeight;
            let padY = 10;
            let contentH = Math.max(promptDiv.scrollHeight, 40);
            let barH = Math.min(0.22 * this.H, Math.max(64, contentH + 2 * padY));
            bar.setAttribute("height", barH);
            promptWrap.setAttribute("y", promptY + padY);
            promptWrap.setAttribute("height", Math.max(20, barH - 2 * padY));
        };
        layoutPrompt();
        requestAnimationFrame(layoutPrompt);

        let choiceGroup = create_SVG_group(0, 0);
        ui.appendChild(choiceGroup);

        let cols = 3;
        let fens = shuffleArray(this.hatFens.slice());
        let rows = Math.ceil(fens.length / cols);
        let gridTop = 0.22 * this.H;
        let gridBottom = 0.72 * this.H;
        let gridH = gridBottom - gridTop;
        let gapX = 18;
        let gapY = 18;
        let cellW = (colW - gapX * (cols - 1)) / cols;
        let cellH = (gridH - gapY * (rows - 1)) / rows;
        let hatScale = p.hatButtonScale != null ? p.hatButtonScale : 1.75;

        let buttons = fens.map((hatFen, i) => {
            let col = i % cols;
            let row = Math.floor(i / cols);
            let cx = colX + cellW / 2 + col * (cellW + gapX);
            let cy = gridTop + cellH / 2 + row * (cellH + gapY);
            let btn = this._createRetrainingHatButton(hatFen, cx, cy, cellW, cellH, hatScale);
            choiceGroup.appendChild(btn.group);
            return btn;
        });

        let selectBtn = create_SVG_buttonElement(
            colX + colW / 2,
            0.84 * this.H,
            Math.min(420, colW * 0.7),
            76,
            "Select",
            28
        );
        selectBtn.style.cursor = "pointer";
        choiceGroup.appendChild(selectBtn);
        this._setRetrainingSelectVisible(selectBtn, false);

        return {
            root: ui,
            promptDiv,
            choiceGroup,
            buttons,
            selectBtn,
            setPrompt: (text) => {
                promptDiv.textContent = text;
                layoutPrompt();
            }
        };
    }

    async _runRetrainingTrial(block, blockIndex, fen, trialIndex) {
        this._clearScene();
        this._setSceneOpacity(0);
        this._paintBackground("retraining");

        let p = this.params.retraining || {};
        let leftCx = (p.polaroidX != null ? p.polaroidX : 0.26) * this.W;
        let polaroid = this._placeRetrainingPolaroid(fen, leftCx);
        await wait(40);
        let occluder = this._placePolaroidHatOccluder(polaroid.fenIcon, polaroid.groupScale);

        let ui = this._buildRetrainingChoiceUI(fen);
        await this._fadeTrialIn();
        let selectedBtn = null;
        let locked = false;
        let log = {
            block_index: blockIndex,
            block_kind: "retraining",
            flavour: "retraining",
            condition: this.condition,
            trial_id: "retraining_" + fen.id,
            role: this._trialRole(fen.id, fen.id),
            selected_triad: this.graph.selectedTriad.slice(),
            selected_arms: this.graph.selectedArmIds.slice(),
            cue_id: fen.id,
            target_id: fen.id,
            cue_name: fen.name,
            target_name: fen.name,
            target_hat: fen.hat,
            time_to_first_hat_ms: null,
            time_to_correct_hat_ms: null,
            first_hat: null,
            first_correct: null,
            hat_errors: []
        };
        let startAt = performance.now();
        let finished = false;

        const setLocked = (value) => {
            locked = value;
            ui.buttons.forEach((btn) => {
                btn.group.style.cursor = value || finished ? "default" : "pointer";
                btn.group.style.pointerEvents = value || finished ? "none" : "auto";
            });
        };

        const selectHat = (btn) => {
            if (locked || finished) return;
            if (selectedBtn === btn) return;
            selectedBtn = btn;
            ui.buttons.forEach((other) => this._setRetrainingHatButtonSelected(other, other === btn));
            this._setRetrainingSelectVisible(ui.selectBtn, true);
        };

        const commit = async () => {
            if (locked || finished || !selectedBtn) return;
            setLocked(true);
            this._setRetrainingSelectVisible(ui.selectBtn, false);
            let hatId = selectedBtn.hatId;
            let correct = selectedBtn.fenId === fen.id;
            if (log.first_hat == null) {
                log.first_hat = hatId;
                log.first_correct = correct;
                log.time_to_first_hat_ms = Math.round(performance.now() - startAt);
            }
            if (!correct) {
                log.hat_errors.push(hatId);
                if (typeof AudioCont !== "undefined") AudioCont.play_sound_effect("rejected");
                selectedBtn = null;
                ui.buttons.forEach((btn) => this._setRetrainingHatButtonSelected(btn, false));
                await this._shakeRetrainingHatButtons(ui.buttons);
                await wait(1000);
                setLocked(false);
                return;
            }

            finished = true;
            log.time_to_correct_hat_ms = Math.round(performance.now() - startAt);
            ui.choiceGroup.style.transition = "opacity 380ms ease-out";
            ui.choiceGroup.style.opacity = "0";
            ui.choiceGroup.style.pointerEvents = "none";
            await wait(380);

            let centerCx = 0.5 * this.W;
            polaroid.group.style.transition = "transform 560ms ease-in-out";
            polaroid.group.style.transform = `translate(${centerCx - leftCx}px, 0px)`;
            await wait(560);

            ui.setPrompt("Correct!");
            if (typeof AudioCont !== "undefined") AudioCont.play_sound_effect("positive");
            occluder.style.transition = "opacity 420ms ease-out";
            occluder.style.opacity = "0";
            spawn_confetti_burst(this.ItemLayers.Plus2, centerCx, polaroid.cy, { count: 22, awaitPopMs: 0 });
            await wait(1500);
            this.answers.push(log);
            await this._fadeTrialOut();
        };

        ui.buttons.forEach((btn) => {
            btn.group.onpointerdown = (event) => {
                event.preventDefault();
                selectHat(btn);
            };
        });

        await new Promise((resolve) => {
            ui.selectBtn.onpointerdown = (event) => {
                event.preventDefault();
                commit().then(() => {
                    if (finished) resolve();
                });
            };
        });
    }

    clean_up() {
        this.destroyed = true;
        this._teardownDrag();
        this._clearScene();
        if (this.ParentLayer) this.ParentLayer.style.display = "none";
    }
}
