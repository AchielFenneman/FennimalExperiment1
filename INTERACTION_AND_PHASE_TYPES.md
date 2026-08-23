# Scannimals — Interaction Types & Phase Types

Living overview of **what trials exist**, **which phase blocks run them**, and **which optional settings** they accept.

**Primary sources**

| Area | File |
|---|---|
| Trial dispatch (`TrialFactory`) | `3_InteractiveFennimalController.js` |
| Phase routing / trial generation | `2_Top_controller.js` |
| Experiment blocks & Fennimal templates | `2_Stimulus_data.js` |
| Tunable parameters | `1_General_Parameters.js` (`GenParam`) |

Stimulus codes for toys / boxes / food (`"A"`, `"B"`, …) are mapped to real SVG ids at experiment setup via the FeatureMap. On FenObjs and in data, you usually see the **mapped** names (e.g. `"plane"`, `"cardboard"`).

---

## How pieces fit together

```
Experiment_Structure block
  ├── type              → how the day/phase runs (phone room, free explore, …)
  ├── interaction_type  → which TrialFactory controller runs at a location
  └── optional flags    → ask_toy, partner_behavior, hint_type, …
        ↓
  TrialGenerator stamps fields onto each FenObj in the phase queue
        ↓
  Location entry → TrialFactory.build(FenObj.interaction_type, …)
```

Some phases are **not** location trials (`partner_belief_multiple` / `partner_belief_individual_boxes`, sorting, `hat_binding_task`, `chimera_feature_id`, `pseudoday`) and never call `TrialFactory`. `chimera_feature_id` runs as indoor polaroids (no map travel).

### Trial queue: default vs `trial_subblocks`

Map phases that use `TrialGenerator` (`phone_room`, `free_exploration`, `hint_and_search`, `jump_to_trial`, `on_call`, …) build their trial list in one of two ways:

**Default (cartesian)** — omit `trial_subblocks`:

| Field | Meaning |
|---|---|
| `Fennimals_encountered` | Fennimal ids |
| `interaction_type` | String or array — every type is crossed with every Fennimal |

Trials are smart-shuffled so consecutive trials do not share a Fennimal **id**, **region**, or **head** (with orthogonal tasks mixed in when present).

**Ordered subblocks** — set `trial_subblocks` (array). Subblocks run in order; each is shuffled internally, then concatenated. Use this when some trials must precede others within a single day/phase.

**Fail loud (required):** when `trial_subblocks` is present you must **not** also set top-level `Fennimals_encountered`, top-level `interaction_type`, or `included_orthogonal_tasks`. Mixing those is a thrown error so setup mistakes show up immediately in testing.

Each subblock is **either** cartesian **or** an explicit trial list — never both:

```js
// Cartesian subblock (same spirit as the default block fields)
{
  Fennimals_encountered: ["S1", "S2", "S3"],
  interaction_type: "toy_to_box"
}

// box_room is special: cartesian form still yields ONE multi-Fennimal trial
{
  Fennimals_encountered: ["S1", "S2"],
  interaction_type: "box_room"
}

// Explicit trials (non-cartesian)
{
  trials: [
    { Fennimal: "S1", interaction_type: "joint_box_cleaning" },
    { Fennimals: ["S1", "S2"], interaction_type: "box_room" },
    { Fennimal: "S2", interaction_type: "photo_box" }
  ]
}
```

Full phase example:

```js
{
  type: "phone_room",
  partner_behavior: "active",
  hint_type: ["icon"],
  include_Fennefinder: false,
  trial_subblocks: [
    {
      Fennimals_encountered: ["S1", "S2", "S3"],
      interaction_type: "toy_to_box"
    },
    {
      trials: [
        { Fennimal: "S1", interaction_type: "joint_box_cleaning" },
        { Fennimal: "S2", interaction_type: "photo_box" },
        { Fennimal: "S3", interaction_type: "photo_box" },
        { Fennimal: "S2", interaction_type: "feed_Fennimal" },
        { Fennimal: "S3", interaction_type: "feed_Fennimal" }
      ]
    }
  ]
}
```

Phase-level stamps (`ask_toy` / `ask_box`, partner, hints, etc.) still apply to every generated trial. Each trial also gets `trial_subblock_index` (0-based) for data analysis.

---

## Phase / block types (`type` in Experiment_Structure)

### Map / location phases (use `interaction_type`)

#### `phone_room`
Sequential trials from a phone UI at Home: ring → hint → auto-travel to location → interaction → (usually) return to phone room.

| Field | Meaning |
|---|---|
| `interaction_type` | String or array of trial types (default / cartesian layout only) |
| `Fennimals_encountered` | Fennimal ids in this block (default / cartesian layout only) |
| `trial_subblocks` | Optional ordered subblocks; see **Trial queue: default vs trial_subblocks** above |
| `partner_behavior` | `"active"` \| `"absent"` (also accepts aliases `"present"`→active, `false`→absent) |
| `hint_type` | e.g. `["icon"]` (phone hint flavour) |
| `include_Fennefinder` | `true` \| `false` \| `"low_power_mode"` |
| `ask_toy` | If `true`, stamp ask-toy quiz onto **all** trials in the block |
| `toys_asked` | Optional stimulus toy codes for the quiz bar; defaults to all unique toys of Fennimals in the block |
| `ask_box` | If `true`, stamp ask-box quiz onto **all** trials in the block |
| `boxes_asked` | Optional stimulus toybox codes for the quiz bar; defaults to all unique toyboxes of Fennimals in the block |
| `ask_Fennimal` | If `true`, stamp ask-Fennimal quiz onto **all** trials (honoured by `joint_box_cleaning`, `hat_laundry`, `hide_and_seek_Fennimal`, `hat_blown_away`, `photo_Fennimal`) |
| `fennimals_asked` | Optional Fennimal ids for the face bar; defaults to all Fennimals in the phase |
| `ask_name` | If `true`, stamp name quiz onto **all** trials (honoured by `hat_laundry`, `hat_blown_away`, `hide_and_seek_Fennimal`, `photo_Fennimal`; fires after the Fennimal is visible) |
| `ask_hat` | If `true`, stamp hat quiz onto **all** trials (honoured by `hat_laundry`, `hat_blown_away`, `hide_and_seek_Fennimal`, `photo_Fennimal`; fires after `ask_name`). Worn hat stays hidden until the quiz is answered |
| `hats_asked` | Optional stimulus hat codes for the quiz bar; defaults to all unique hats of Fennimals in the phase |
| `introduce_name_on_polaroid` | If `true` on `photo_Fennimal` trials, camera prompts stay nameless; the polaroid caption introduces the name |
| `names_asked` | Optional; still stamped for analysis. The live quiz is typed recall, not a name list |
| `return_to_phone_room_after_final_trial` | Stay on map after last trial if `false` |
| `skip_instructions` | If `true`, skip the phase-start instructions page (default: show instructions) |

Tunables: `GenParam.PhoneRoom`, `PhoneRoomFlair`, `AutoTravel`.

#### `free_exploration`
All phase Fennimals on the map; participant explores until all are visited.

| Field | Meaning |
|---|---|
| `interaction_type` | Usually `["basic_intro"]` or `["photo_Fennimal"]` |
| `Fennimals_encountered` | |
| `trial_subblocks` | Optional; same rules as phone_room |
| `partner_behavior` | |
| `include_Fennefinder` | |
| `force_climbing_tower_first` | Force watchtower intro first |
| `ask_toy` / `toys_asked` | Same block-level stamp as phone_room (`toys_asked` optional; defaults to block toys) |
| `introduce_name_on_polaroid` | With `photo_Fennimal`: nameless camera prompt; polaroid caption introduces the name |
| `ask_Fennimal` / `ask_name` / `ask_hat` | Same block-level stamps as phone_room; honoured by `photo_Fennimal` |
| `bonus_stars_per_correct_answer` | Optional |

#### `retrieve_lost_box`
Free-map search like `free_exploration`, but each Fennimal encounter is a lost-box retrieval (clean + tag). Fennefinder is always forced on (`include_Fennefinder` is ignored).

Specify trials with **either** `Fennimals_encountered` **or** `box_locations` (not both).

| Field | Meaning |
|---|---|
| `Fennimals_encountered` | One missing box per Fennimal (home location); box is that Fennimal’s `toybox` |
| `box_locations` | Explicit per-trial pool: `[{ label: "…", Fennimal_finding_box: "A", target_box: "A", weight?: 1 }, …]` — place the finder Fennimal at a **different** location in their native region (not their home); tag the mapped `target_box`. Each `Fennimal_finding_box` and each `label` may appear only once. Optional `weight` is a relative sampling weight (default **1**). Tiny box icons appear on those map locations until each box is retrieved |
| `n_trials_to_sample` | Optional between-subjects draw: keep this many entries from `box_locations`. Requires a unique `label` on every pool entry. `n === 1` is a weighted choice (`P ∝ weight`). `n > 1` is sequential weighted sampling without replacement (console warning if any weight ≠ 1). If omitted, every row runs (one-of-each) and any explicit `weight` other than 1 fails loud |
| `randomization_id` | Optional stable key for the draw (persisted in Layer 1 assignment). Defaults to `retrieve_lost_box__{phasenum}` |
| `include_decoration` | Optional. If `true`, after cleaning (and before tagging) run the joint decoration pile/turns; decorations persist in WorldState (including **which Fennimal decorated** via `get_toybox_decorator`). No photo after decorate — photo is always at the end of the whole interaction |
| `partner_behavior` | Optional; if present, partner helps with cleaning (and decoration turns when `include_decoration`) |
| `force_climbing_tower_first` | Optional watchtower intro |
| `interaction_type` | Not required — always stamped as `"retrieve_lost_box"` |

**Stored manipulation fields** (kept on the phase in `storedData`, and the draw is also in `experimentData.phaseRandomizations`):

| Field | Meaning |
|---|---|
| `selected_box_location_label` / `manipulation_label` | Chosen label when `n_trials_to_sample === 1` |
| `selected_box_location_labels` | All chosen labels |
| `selected_box_locations` | Chosen `{ label, Fennimal_finding_box, target_box, weight, weight_proportion }` entries. `weight_proportion` is `weight / pool sum` |
| `box_location_pool_weights` / `box_location_pool_weight_sum` | Full pool table (same fields) plus the denominator, so the assignment mechanism is in the export |
| trial `label` / `manipulation_label` | Same label on each completed interaction record in `Data[]` |
| trial `weight` / `weight_proportion` | Same sampling weight fields on each completed interaction record |

Flow per location: Fennimal intro → dirty found box + celebration → proud dance → joint clean → optional decorate (`include_decoration`) → drag lost-and-found tag onto box → partner photo tableau → “Somebody will come collect…” → leave (or phase complete when all retrieved). Attached tags (and decorations, when included) persist in WorldState.

Example — between-subjects, one random option:

```js
{
  type: "retrieve_lost_box",
  n_trials_to_sample: 1,
  randomization_id: "lost_box_manipulation",
  include_decoration: true,
  box_locations: [
    { label: "A_finds_A", Fennimal_finding_box: "A", target_box: "A" },
    { label: "C_finds_A", Fennimal_finding_box: "C", target_box: "A" },
    { label: "B_finds_A", Fennimal_finding_box: "B", target_box: "A", weight: 2 }
  ],
  partner_behavior: "active"
}
```

#### `hint_and_search`
One target at a time; hint instruction, then find & interact. Supports orthogonal tasks.

| Field | Meaning |
|---|---|
| `interaction_type` | Array, e.g. `["broken_toy_in_box","dirty_toy"]` |
| `hint_type` | Array or string, e.g. `["icon","toybox","toy","name"]` — **main trials currently get the first element only**. `"name"` shows the Fennimal's name as large text; `"icon"` hides the worn hat if `ask_hat` is set |
| `ask_Fennimal` / `ask_name` / `ask_hat` | Same block-level stamps as phone_room; honoured by `hide_and_seek_Fennimal`, `hat_laundry`, `hat_blown_away`, `photo_Fennimal` |
| `included_orthogonal_tasks` | Extra trial types mixed into the queue (**not** compatible with `trial_subblocks`) |
| `orthogonal_tasks_possible_after_trial` | Present in stimulus; **not enforced in code yet** |
| `ask_toy` / `toys_asked` | Stamped onto main **and** orthogonal trials (`toys_asked` optional; defaults to block toys) |
| `skip_instructions` | Optional |
| `trial_subblocks` | Optional; cannot be combined with `included_orthogonal_tasks` |

#### `jump_to_trial`
Teleport to each trial location in order (no free search).  
Also supported in code: `jump_to_trial_no_instructions`.

#### `on_call`
Island-wide phone booth: return Home → answer → hint → search one Fennimal → next call. Supports orthogonal tasks like `hint_and_search`.

---

### Non-map / special phases (no `TrialFactory`)

#### `partner_belief_multiple`
Warehouse theory-of-mind task (multi-box table): for each asked toybox, what does the partner believe is inside?

| Field | Meaning |
|---|---|
| `toyboxes_asked` | Stimulus box codes (mapped at phase setup) |
| `toys_asked` | Stimulus toy codes for the choice bar |
| `bonus_stars_per_correct_answer` | Number of stars per correct pick |

Controller: `PartnerBeliefMultipleController` (uses shared `ToyChoiceBar`).

> Deprecated alias: `"partner_belief"` still routes to this phase for now (spring-cleaning candidate).

#### `partner_belief_individual_boxes`
One-box-at-a-time DV task with curtain reveal, radial forced-choice options, and reaction-time measurement.

| Field | Meaning |
|---|---|
| `questions` | Mixed array of **belief questions** and optional **memory-probe declarations** (see below). Belief entries: `{ question_id, target_box }` (stimulus codes). `question_id` is mandatory and unique for belief entries. Do **not** set `answer_options` |
| `lure_cycle` | Optional box-code cycle for the lure (default = unique `target_box` values in belief `questions` order, e.g. A→B→C→A) |
| `num_belief_blocks` | How many shuffled belief blocks (default `1`). Deprecated alias: `num_repeated_blocks` |
| `include_reality_block_at_end` | If `true`, after all belief blocks run one shuffled reality-memory block (no partner). Includes the existing reality-block intro overlay |
| `include_practice_trial` | If `true`, prepend shape-match and color-match practice trials |
| `memory_probe_isi_ms` | Pause after each memory-probe response before the next trial (default `1000`) |
| `bonus_stars_per_correct_answer` | Silent stars per correct practice/distractor/belief/reality/memory-probe answer |

**`questions` belief entries:** `{ question_id, target_box }` — used for belief blocks and (when enabled) the reality block.

**`questions` memory-probe declarations** (typed; order in the array is the run order):

| `kind` | Expands to |
|---|---|
| `memory_probe_box_to_fennimal` | One trial per eligible Fennimal with toybox + toy (3AFC heads; needs ≥2 other-box foils — skip when co-box mates leave too few foils) |
| `memory_probe_box_decorator` | **One trial** for `target_box` (required). Cue = box; options = **all** experiment Fennimal heads; correct = WorldState decorator (who decorated, not necessarily the owner). Written by `joint_box_decoration` / `retrieve_lost_box` decoration |
| `memory_probe_fennimal_to_toy` | One trial per eligible Fennimal with a toy |
| `memory_probe_box_to_sack` | One trial per eligible Fennimal with sack + toybox (**skipped** unless sacks are templated and `toy_to_sack` appears in the experiment) |
| `memory_probe_sack_to_toy` | One trial per eligible Fennimal with sack + toy (same sack auto-gate) |

Optional `fennimals: ["A","B",…]` limits/orders **targets** for expandable kinds (foil options still use the full Fennimal pool). For `memory_probe_box_decorator`, optional `fennimals` limits the **option heads** (correct decorator is always included). Omit `fennimals` to include all eligible Fennimals / all heads. Optional `question_id` on a probe declaration is only for uniqueness bookkeeping — expanded trials keep their own ids (`probe_box_*`, etc.).

Example:

```js
questions: [
  { question_id: "belief_A", target_box: "A" },
  { kind: "memory_probe_box_decorator", target_box: "A" },
  { kind: "memory_probe_box_to_fennimal", fennimals: ["A", "B", "C"] },
  { kind: "memory_probe_fennimal_to_toy" },
  { kind: "memory_probe_box_to_sack" },
  { kind: "memory_probe_sack_to_toy" },
]
```

**Answer options (fixed rule `belief_reality_cyclic_lure`):** for each belief/reality question the controller auto-builds a shuffled 3AFC triad from `WorldState`:

- **Belief trials:** target-box partner belief (old; correct) + target-box current contents (new) + partner belief about the *next* box in `lure_cycle` (old lure).
- **Reality trials:** target-box partner belief (old) + target-box current contents (new; correct) + current contents of the *next* box in `lure_cycle` (new lure).

Thus, with A→B→C→A, A’s lure comes from B, B’s from C, and C’s from A; only the source type changes by trial kind. Fails loud if any piece is missing or the three toys are not distinct. Logged fields include `lure_source_box`, `lure_source_box_code`, `lure_source_type`, `lure_answer`, and `option_roles`.

**Trial structure:** optional practice → for each belief block: (distractor → belief)×N → optional final reality block: (distractor → reality)×N → memory probes in `questions` declaration order. Distractors alternate shape/color matching with orthogonal features. Belief/reality presentation order is shuffled within each block.

**Memory probes** (when declared in `questions`):

1. **Box→Fennimal** (`memory_probe_box_to_fennimal`): empty closed box cue; radial colored heads; triad = correct + two other-box foils (co-box mates excluded; prefer same S/P wave when those prefixes exist).
2. **Box decorator** (`memory_probe_box_decorator`): empty closed box cue; radial colored heads for **all** experiment Fennimals; correct = Fennimal recorded as decorator in WorldState.
3. **Fennimal→toy** (`memory_probe_fennimal_to_toy`): full-body Fennimal cue; radial toys; foils = one same-wave + one other-wave toy when S/P IDs are present, otherwise any two other toys.
4. **Box→sack / sack→toy** when declared and the sack auto-gate passes.

No distractors between probes (ISI instead). Solo intro overlay before the first probe. Logged answer rows match belief/reality density (`trial_kind`, ids, `block_index`, `trial_index`, target, `options` with roles, `selected`, `correct`, `reaction_time_ms`).

Controller: `PartnerBeliefIndividualBoxesController`.

#### `Fennimal_attribute_sorting_task`
Attribute sorting / quiz over Fennimals.

| Field | Meaning |
|---|---|
| `Fennimals_encountered` (or `Fennimals_asked`) | |
| `attribute_order` | e.g. `["location","head","toy","toybox"]` |
| `presentation` | `"multiple"` (default) or `"single"`. Multiple shows all Fennimal boxes at once; single shows one Fennimal per page (pages shuffled once at start), with one card per unique attribute value, celebrating after each Fennimal before advancing |
| `maximum_earnable_stars` | Cap on bonus stars |
| `pass_if_errors_at_most` / `max_attempts` | Fail the quiz if errors exceed the cap; retry up to `max_attempts` |
| `on_fail` | Optional remedial phase after a failed attempt (cloned into `setupTrialBasedPhase`). Typical: `phone_room` + `photo_Fennimal`. Honour `ask_hat` / `ask_name` / `ask_Fennimal` if set |

Controllers: `FennimalAttributeSortingMultipleTask` / `FennimalAttributeSortingSingleTask` via `createFennimalAttributeSortingTask`.

#### `hat_binding_task`
Card-based hat-binding day (no map travel). One phase contains ordered internal `blocks` (binding flavours interleaved with retraining). Between-subjects condition (`pair_based` / `group_based` / `control`) is sampled once from the `condition` array (duplicates raise odds) and stored on `experimentData.phaseRandomizations`.

| Field | Meaning |
|---|---|
| `randomization_id` | Persistence key for the condition draw (default `binding_search_condition`) |
| `condition` | Non-empty array of `"pair_based"` \| `"group_based"` \| `"control"`. One entry is drawn at random per participant; duplicates weight the draw (e.g. `["group_based", "control", "control"]` → ⅓ group, ⅔ control). Refresh restores the stored draw |
| `searched_triad` | `[F1, F2, F3]` in role order. F2 must be the hub (cousin of F1, neighbour of F3) |
| `singletons` | Fennimal ids with no triad structure (self-visualization fillers in every condition) |
| `hats` | Fennimal ids whose hats appear as options (default: searched triad + singletons) |
| `binding_trials` | Trial templates. Optional `conditions` lists which draws run the trial (omit = all). Searched pair/group trials typically use `{ cue, path }` per condition branch. `path` is walked on the head/region graph (`[]` = visualize self). Control uses self-visualization for the triad *and* the singletons |
| `retraining_fennimals` | Fennimal ids for retraining blocks |
| `blocks` | Ordered `{ kind: "binding" \| "retraining", flavour?, cover_story?, hop_catch_after_errors? }` |
| `day_title` / `day_body` | Copy for the Day N instruction page |
| `prompt_templates` | Optional overrides keyed by path (`""`, `"neighbour"`, `"cousin>neighbour"`, …) |
| `skip_instructions` | Skip the Day N page and start at the first block cover story |

**Conditions**

- `pair_based` — retrieve the triad in pairs: B→A (cousin) and B→C (neighbour), plus singleton self-visualization.
- `group_based` — retrieve the full triad length: A→C (cousin then neighbour) and C→A (neighbour then cousin); B is only an intermediate hop. Plus singleton self-visualization.
- `control` — self-visualization only for A, B, C and the singletons (no relational hops).

Binding trial: occluded hats → name-tag visualization prompt → reveal → flavour response (retry until correct). Hop-catch (block 1): typed name per path hop, then click-hat, then return to the original drag. Retraining: polaroid of the Fennimal without hat; hat appears after the correct pick.

Controller: `HatBindingTaskController` (`4_HatBindingTask.js`). Layout tunables: `GenParam.HatBinding`.

#### `chimera_feature_id`
Speeded feature-identification DV. All trials are **indoor polaroids** (Home overlay, no map travel, no region wallpaper). Head-query trials wear no hat. Head and body share the **prime’s** colour scheme (body-prime → body palette; head-prime → head palette) so region colour cannot give away the other part. Name buttons come from `names_options`, always unioned with every trial `answer` so a forgotten name cannot leave a trial without a valid button. Buttons are visible before `?` but inert until the reveal clock starts. HUD points freeze on click and never reflect accuracy; stars are recorded for the end-of-experiment payment overview only.

| Field | Meaning |
|---|---|
| `names_options` | Fennimal ids for the name ring (e.g. `["A","B","C","D1","D2"]`). Missing trial answers are appended automatically. |
| `trials` | Paid trialset. `region` / `head` / `object` / `answer` are Fennimal ids. `region: "neutral"` = close-up with no body; `object: "none"` = no hat. |
| `reveal_mode` | `"blur-silhouette"` (default), `"patchy-holes"`, or `"patchy-holes-with-pixalation"`. Gated per block. |
| `reveal_profile` | Optional. `"lingering"` (default) or `"steep"`. Curve only — same holes+mosaic technique. Lives on `GenParam.ChimeraFeatureId.revealProfile` if omitted. `"steep"` is the original knife-edge backup. |
| `trial_speed` | Full trial window in ms. Default `2000` if omitted. Drives time bars, point decay, and the **denominator** of the lead-lag fractions below. |
| `skip_practice` | If `true`, omit the square/triangle practice trials and start on the first paid (true-head) trial. Names-layout bubbles still run on that first paid trial. Default / unset / `false` keeps shape practice. |
| `day_title` / `day_body` | Optional override of `GenParam.ChimeraFeatureId.dayTitle` / `dayBody` |
| `skip_instructions` | Skip the Day N page |
| `partner_behavior` | Use `"absent"` |

Lead-lag fractions live on `GenParam.ChimeraFeatureId` (not the block): `primeEndFrac` (default `0.40`) and `targetLagFrac` (default `0.35`). Do not “fix” this by revealing the whole animal at once — the DV needs the prime to be identifiable before the questioned part prints.

**Block 1 — true heads** (`kind: "face"`, shuffled, paid): one clean polaroid per name — `Face_A`, `Face_B` (B body + B head, not the cousin mix), `Face_C`, `Face_D1`, `Face_D2`.

**Block 2 — keys + leftovers** (shuffled, paid):

- `S1` — A body + C head, “Whose head?” → C. Prime: body. Target: head. Test mix-up.
- `S4` — C head + A hat, no body, “Whose hat?” → A. Prime: head. Target: hat. Test card.
- `C1` / `C4` — D1/D2 mix-up and card (test setup only; omitted from `semantic_learning`).
- `Fill_C` — B body + shared A/B head, “Whose head?” → B. Cousin mix, not a simple B face.
- `Fill_E` — A head + B hat, close-up, “Whose hat?” → B.

**Name options:** `names_options` plus any trial `answer` not already listed. Practice shapes stay Square / Triangle. **Mismatch:** if the prime (and any other on-screen part) belongs to a Fennimal that is not the correct answer, that name is omitted for that trial. **Lookalike:** if the questioned feature is shared (A and B share a head), the other animal’s name is omitted too, so “Whose head?” is not a two-way cousin guess.

**Lead-lag reveal (do not drop this)**

One polaroid, two clocks, both fractions of `trial_speed`:

1. After `?`, the **prime** part prints with the block’s `reveal_mode` and is fully clear at `primeEndFrac` (default 40% of the window).
2. Until `targetLagFrac` (default 35%), the **target** part (whatever the question names) stays under a veil the same colour as the undeveloped photo, clipped to that part — not a second rectangle on the screen. Hats sit on the head, so the veil is per SVG part (`body` / head-face / `hat`), not per region of the photo.
3. From lag, that veil prints with the **same** bubbles / mosaic / colour as the prime over a **fresh** `trial_speed` window (not a fading silhouette of the target).
4. **Score clock:** until `targetLagFrac`, points and time bars are frozen (bars pulse) and name buttons are locked. From target print onset, they count down over a full `trial_speed` (5s in the test block). Practice / no-prime trials start the clock immediately.
5. Practice shapes: `targetLagFrac` is forced to 0 (whole object prints together).
6. The trial starts only on a click **on or very near the `?`**, not anywhere on the photo well.

**Reveal modes** (applied to whatever is currently printing)

- `blur-silhouette` — black silhouette + Gaussian blur; colour fade.
- `patchy-holes` — Gosselin & Schyns (2001, *Vision Research*) “bubbles”.
- `patchy-holes-with-pixalation` — same bubbles plus a mosaic that starts coarse and refines. The mosaic snapshot hides the target part so the veil does not uncover a already-sharp hat/head.

**Reveal curve** (`reveal_profile`, independent of `reveal_mode`): `lingering` (default) opens staggered mixed-size bubbles earlier and holds the mosaic in a mid grain so identity is ambiguous-but-possible for longer. `steep` is the original knife-edge backup (tiny holes until late, then a sudden clear view). Tunables live on `GenParam.ChimeraFeatureId.revealProfiles`. Day-card copy (`dayTitle` / `dayBody`) also lives there; a block may still override with `day_title` / `day_body`.

**Logged answer rows** (one object per trial on `phase.answers` / `phase.Data`):

| Field | What it is |
|---|---|
| `trial_id`, `kind`, `role` | Stimulus id (`Face_A`, `S1`, `Fill_C`, …); `kind` is `face` / `key` / `filler` / `practice`; `role` is the design tag |
| `region_id`, `head_id`, `hat_id`, `question`, `target` | Photo contents and the queried part |
| `presented_options` | Buttons on this trial: `{ id, label, clock_hour }` in clockwise order (`clock_hour` is 1–12, 12 = top). Also `presented_ids` |
| `button_order_ids` | Participant-level name ring (full roster, before per-trial omissions) |
| `excluded_options` | Names dropped this trial (mismatch / lookalike / extra) |
| `selected_id`, `selected_clock_hour` | Chosen name and its clock position |
| `correct` | `true` / `false` |
| `timeout` (alias `late`) | `true` if they answered after the points/bars hit zero. They still must click; there is no missing response |
| `reaction_time_ms` | From `?` |
| `reaction_time_from_target_onset_ms` | From target print. Prefer this for facilitation |

Also logged: `correct_id`, `clicked_before_target_onset`, `prime_part`, `target_lag_ms`, `n_options`, `option_layout` (x/y plus `clock_hour`).

**Logged RTs** (both, always):

- `reaction_time_ms` — from `?` / reveal start (same meaning as before).
- `reaction_time_from_target_onset_ms` — from target print onset (`target_lag_ms`). Negative if they clicked before the target started printing (`clicked_before_target_onset: true`). Use this one to test facilitation.

Also logged: `prime_part`, `target_part`, `target_lag_ms`, `prime_end_ms`.

**Order:** practice square (tutorial bubbles) → practice triangle → shuffled true-head block → shuffled keys+leftovers. There is no unpaid names-practice polaroid. The first paid trial (always a true-head photo) gets the names-layout bubbles (“names stay in the same places”; start on `?`). If `skip_practice` is true, shape practice is omitted and those same bubbles still run on the first paid trial. Name buttons stay in a between-subjects order for the whole phase.

Name buttons are **not** reshuffled each trial. One order is drawn per participant, stored on `experimentData.phaseRandomizations.chimera_button_order`, and reused for every name trial.

**Scoring:** 100 points decay linearly to 0 over a full `trial_speed` from target onset (lag trials) or from `?` (practice / no-prime). Correct → frozen remaining. Incorrect → 0 + silent −25, session floor 0. Shape practice unpaid; all face / key / filler trials paid. Stars = `floor(session_points / 100)`, max = number of paid trials (`block.trials.length`).

Controller: `ChimeraFeatureIdController` (`4_ChimeraFeatureIdTask.js`). Tunables: `GenParam.ChimeraFeatureId`.

#### `pseudoday`
Narrative day card only (no trials). Does not advance the “real day” counter the same way trial phases do.

| `information` | Typical extras |
|---|---|
| `"new_Fennimals_spotted"` | `title`, `display_text`, `displayed_icons` |
| `"partner_leaves"` | |
| `"partner_returns"` | |

#### Supported in Top controller but rare / unused in current structures
- `name_recall_task`
- `card_sorting_task`

---

## Interaction types (`TrialFactory`)

Exact string keys required. Unknown keys log an error and return `null`.

### Core play / store

#### `basic_intro` → `GeneralTrialController`
Classic meet → play → store toy in toybox. Branches on world state: empty box / correct toy already in box / wrong toy in box.

**Optional features**
- `ask_toy` + `toys_asked` (from phase block): quiz before any toy appears; records `FenObj.toy_errors_made` (array of incorrect toy names, in order). Correct answer → confetti burst.
- Partner present/absent (opens/closes box, etc.).

**Needs on FenObj:** `name`, `toy`, `toybox`.

#### `Fennimal_toy` → `FennimalToyTrialController`
Like a simplified intro: Fennimal + toy play + celebrate + wander off. **No box.**

**Optional:** same `ask_toy` / `toys_asked` / `toy_errors_made` as `basic_intro`.

**Needs:** `name`, `toy`.

#### `toy_to_box` → `ToyToBoxTrialController`
No Fennimal: abandoned toy on screen → open box → drag toy in.

If the box already holds a **different** toy: a toy bin appears on the far left → opening reveals the old toy → participant drags it into the bin (magnetic snap above bin → fall between bin back/front mesh, same as `box_room`) → WorldState box contents and partner belief are cleared → then place the new toy. Same-toy contents are treated as an empty box. Partner (if present) only opens the box and otherwise observes.

**Needs:** `toy`, `toybox`.

#### `partner_belief_in_situ` → `PartnerBeliefInSituTrialController`
Location-based partner-belief probe (map trial, not a warehouse phase). Stimulus is keyed by **box code**, not Fennimal id. At phase setup, TrialGenerator reads `WorldState` box contents, finds the Fennimal who owns that toy, and uses that Fennimal as the travel carrier (their `region` / `location`). Partner is **always forced present** for this type.

**Stimulus forms**
```js
// Explicit trial list
{ target_box: "A", interaction_type: "partner_belief_in_situ" }

// Cartesian-style (subblock or top-level for jump_to_trial / hint_and_search / phone_room)
{
  target_boxes: ["A", "B"],
  interaction_type: "partner_belief_in_situ"
}
```

**Phase-level `lure_cycle`** (optional): e.g. `lure_cycle: ["A", "B"]`. If omitted, inferred from distinct `target_box` / `target_boxes` values in the phase (order of first appearance). Needs ≥ 2 codes.

**Answer options** (same rule as `partner_belief_individual_boxes` belief trials): partner belief about target (correct) + current contents of target + partner belief about the *next* box in `lure_cycle` (lure). Fail loud if WorldState cannot build a distinct triad, or if box contents / owning Fennimal / partner belief are missing.

**Sequence**
1. Travel to the scene Fennimal’s location (normal phone-room / jump / hint-and-search travel).
2. Static Fennimal on the left; closed target box in the center (under curtain); partner starts bottom-right.
3. Partner walks **forward**, then **left** to the box (no diagonal), question bubble appears.
4. Curtain reveal click → radial 3AFC toys → answer logged on `FenObj.partner_belief_in_situ_answer`.
5. Fade to black → trial complete (phone_room returns home as usual).

**Needs at generation time:** WorldState contents + partner belief for the target (and lure) boxes; a unique Fennimal whose `.toy` matches the target box contents.

**Supported phases:** `phone_room`, `jump_to_trial`, `hint_and_search`.

#### `box_room` → `BoxRoomTrialController`
Multi-Fennimal warehouse sort (one trial for the whole set — **not** cartesian-expanded per Fennimal). One box per screen: each Fennimal gets a full open → recycle → place → close cycle before a fade-to-black transition to the next. Home warehouse background + low table persist across screens.

**Stimulus forms (both create a single trial)**
```js
// Cartesian / subblock — one trial for the full Fennimal list
{ Fennimals_encountered: ["S1", "S2"], interaction_type: "box_room" }

// Explicit trial list
{ Fennimals: ["S1", "S2"], interaction_type: "box_room" }
// or single: { Fennimal: "S1", interaction_type: "box_room" }
```

Carrier FenObj (first id) is used for map / phone-room travel. Full set is stored on `FenObj.box_room_fennimals` / `box_room_fennimal_ids`. Presentation order (shuffled at runtime) is stored on `FenObj.box_room_order` (array of Fennimal ids).

**Throws at trial generation** if the set has duplicate `toy` or duplicate `toybox` values.

**Per-box sequence** (boxes in shuffled `box_room_order`; only the current box + its toy are on screen)
1. Open the box (partner walks in and opens if present; else click).
2. Wrong contents → recyclable; WorldState + partner belief cleared to empty. Toy bin appears only on screens that need recycling.
3. Correct contents already in box (safety) → animate to the top row; same clear.
4. If wrong toy present: drag to toy bin (magnetic near bin X → snap L/R above bin → fall between bin back/front mesh).
5. Place the matching top-row toy into the open box; WorldState + partner belief updated on drop.
6. Close the box (partner walks in if present; else click).
7. Confirmation: “The [toy] is now safely in the [box name]!”
8. If more boxes remain: fade to black (600ms ease-in-out), set up the next box under black, fade in.

**Needs on each FenObj in the set:** `toy`, `toybox`. No Fennimals drawn on screen.

---

### Photo & feed

#### `photo_box` → `PhotoTrialController` (`targetType: "toybox"`)
Photograph the toybox with a camera viewfinder; polaroid feedback.

**Needs:** `toybox`.  
**Tunables:** `GenParam.PhotoTrial` (box spawn range, lens size, flash, polaroid scale, etc.).

#### `photo_Fennimal` → `PhotoTrialController` (`targetType: "fennimal"`)
Photograph the Fennimal; polaroid caption is their name.

**Optional:** `introduce_name_on_polaroid` — camera prompts stay nameless (“Please take a photo of this Fennimal!”); the polaroid caption introduces the name.  
`ask_Fennimal` / `ask_name` / `ask_hat` — same overlays as the training phone-room trials. If `ask_hat` is set, the worn hat stays hidden until after the hat quiz, then the camera/polaroid show the hat.

**Needs:** `name` (and a visible Fennimal).  
**Tunables:** `GenParam.PhotoTrial`.

#### `feed_Fennimal` → `FeedFennimalTrialController`
Hungry Fennimal → comfort → get food (solo backpack with 1 correct + 2 distractor bags, or partner handoff) → drag correct bag to bowl → eat → dance → wander.

**Needs:** `food_preference` (mapped flavor id).  
**Tunables:** `GenParam.FeedTrial` (layout, bag scale/column, partner bag offsets, eat timing, drop distance).

#### `joint_box_cleaning` → `JointBoxCleaningTrialController`
Memory-binding trial for `{Fennimal, box}` (no toy). With `ask_Fennimal`: closed box first → face quiz → Fennimal appears → dirty box (dirt + dust + one plant) → comfort → 4 turn-based cleaning rounds → clean encoding reveal → drag box (x-axis) to Fennimal → celebrate → **photo of box** (Fennimal posed behind; success = box in frame) → Fennimal leaves, **box stays**.

**Turn order**
- Partner present: player sponge → partner bellows → Fennimal shears  
- Solo: player sponge → Fennimal shears → Fennimal bellows  

Each sponge turn ends after ~25% of total dirt-mask health is cleaned; sponge drops until NPCs finish their steps.

**Optional features**
- `ask_Fennimal` + `fennimals_asked` (see shared feature section): identity quiz before Fennimal appears; records `FenObj.fennimal_errors_made`.
- End photo is **always** included (not optional).

**Needs on FenObj:** `name`, `toybox`, `region` (foliage art).  
**Tunables:** `GenParam.JointBoxCleaning`, `GenParam.PhotoTrial` (camera / polaroid).  
**WorldState:** clears decoration flag on the cleaned box.

#### `retrieve_lost_box` → `RetrieveLostBoxTrialController`
Used by the `retrieve_lost_box` phase. Fennimal intro → dirty found box + celebration → proud dance → joint cleaning → optional decoration (if `include_decoration`) → drag lost-and-found tag onto box → partner photo (no ownership handoff) → collect prompt. With `box_locations`, the trial’s `toybox` is the mapped `target_box`, and map travel uses a non-home location in the finder Fennimal’s region (`home_location` keeps the original).

**Needs on FenObj:** `name`, `toybox`, `region`.  
**WorldState:** clears decoration; sets lost-and-found tag flag (attached tag persists on later box appearances).

---

### Repair / clean / hazards

#### `broken_toy_in_box` → `BrokenToyInBoxTrialController`
Open box → toy breaks into parts → comfort → drag-repair (partner helps, or solo auto-solve timer) → charge/play → store in box.

**Needs:** `toy`, `toybox`.

#### `broken_toy_no_box` → `BrokenToyNoBoxTrialController`
Fennimal appears → optional `ask_toy` choice bar → the broken toy appears overlapping on the Fennimal → pieces move and zoom to the centre → comfort → drag-repair (partner helps, or solo auto-solve timer) → charge/play → toy is left on the ground as the Fennimal walks away.

**Needs:** `name`, `toy`. Does not render a box or write toybox contents to `WorldState`.

#### `dirty_toy` → `DirtyToyTrialController`
Box hidden in foliage → cut plants → open → scrub dirty toy → play → store.

**Needs:** `toy`, `toybox`, `region` (foliage).

#### `dirty_and_broken_toy` → `DirtyAndBrokenToyTrialController`
Combined gauntlet: foliage → open → repair → scrub → play → store.

**Needs:** `toy`, `toybox`, `region`.

#### `fly_swat` → `FlySwatTrialController`
Flies on toybox → comfort → swat all flies (partner can help).

**Needs:** `toybox`, `name` (region used for flavour).

#### `fly_swat_extended` → `FlySwatExtendedTrialController`
Same as `fly_swat`, then sponge-clean dirt on the box.

#### `hat_blown_away` → `HatBlownAwayTrialController`
Hat stuck on a region pole; drag a closed box as a step-stool (turn-taking with partner if present). The box is never opened.

**Optional:** `ask_Fennimal` on the empty scene (`await AskFennimalOverlay.run(this)`), then the Fennimal appears (hat hidden if `ask_hat`), then `ask_name`, then `ask_hat`, then the hat is shown and blown onto the pole.

**Needs:** `hat`, `region`, `name`. `toybox` is optional — if missing, a crate **prop** is used and recolored from that region's hue-algorithm palette (`ColorHuePalettes[color_description]`, including accents).

#### `hat_laundry` → `HatLaundryTrialController`
Empty screen. Optional `ask_Fennimal` (unique heads from the block) → Fennimal appears **without** a hat → optional `ask_name` → optional `ask_hat` → sad/comfort → unique hats from the current cohort pile in a laundry basket, then rise into a column → drag the correct hat onto the Fennimal (retry until correct). Partner, if present, is passive.

**Needs:** `hat`.  
**Tunables:** `GenParam.HatLaundry`.  
**Data:** `fennimal_errors_made`, `name_errors_made`, `name_was_revealed`, `ask_hat_errors_made`, `hat_errors_made`.

#### `hide_and_seek_Fennimal` → `HideAndSeekFennimalTrialController`
Hide-and-seek in a dense foliage field. The Fennimal is scaled down and planted at a random mid-field spot (middle 80% of width; feet in the upper part of the bottom third). Cut plants until you can click them (front plants block clicks; gaps work). Remaining plants fade; the Fennimal steps forward to the usual foreground pose and celebrates. No box, no comfort check-in.

**Optional:** `ask_Fennimal` on the empty scene (before hiding). `ask_name` after they step forward. `ask_hat` after `ask_name` (worn hat hidden until then).

**Partner:** solo by default. Set `partner_behavior: "active"` on the phase (or `force_partner_present: true` on the trial) to include a helper who cuts plants and avoids the hide spot.

**Needs:** `name`, `region` (foliage art).

#### `find_box` → `FindBoxTrialController`
Lost toybox behind foliage → cut plants → find/click box → celebrate.

**Needs:** `toybox`, `name`, `region`.

#### `find_box_extended` → `FindBoxExtendedTrialController`
Same find flow, then bellows minigame to blow dust off the box.

---

## Shared optional feature: `ask_toy`

Set on the **phase block** (applies to every trial FenObj in that block, including orthogonal copies):

```js
{
  type: "phone_room",
  interaction_type: "Fennimal_toy",
  ask_toy: true,
  // Optional. Defaults to all unique toys of Fennimals in this block
  // (union across trial_subblocks when present).
  toys_asked: ["A", "B", "C"],
  // …
}
```

**Currently implemented in:** `basic_intro`, `Fennimal_toy`, `broken_toy_no_box`.  
**Data:** `toy_errors_made` — ordered array of wrong toy names.

**UI:** `ToyChoiceBar`.

---

## Shared optional feature: `ask_box`

```js
{
  type: "phone_room",
  interaction_type: "basic_intro", // or any type that calls run_ask_box_step
  ask_box: true,
  // Optional. Defaults to all unique toyboxes of Fennimals in this block
  // (union across trial_subblocks when present).
  boxes_asked: ["A", "B"],  // stimulus toybox codes
  // …
}
```

Mapped via FeatureMap `"toybox"` when `boxes_asked` is set explicitly (same as partner_belief_multiple’s `toyboxes_asked`). Default values come straight from Fennimal `.toybox` assignments.

**Currently implemented in:** `GeneralTrialController.run_ask_box_step()` (reusable).  
**Not used by:** `joint_box_cleaning` (uses `ask_Fennimal` instead).  
**Data:** `box_errors_made` — ordered array of wrong box ids.  
**UI:** `BoxChoiceBar` (mirrors toy bar; clones `#toybox_*`).

---

## Shared optional feature: `ask_Fennimal`

Set on the **phase block** (stamped onto every trial FenObj; currently honoured by `joint_box_cleaning`, `hat_laundry`, `hide_and_seek_Fennimal`, `hat_blown_away`):

```js
{
  type: "phone_room",
  ask_Fennimal: true,
  // Optional. Defaults to all Fennimal ids in the phase
  // (union across trial_subblocks when present).
  fennimals_asked: ["A1", "A2", "A3"],
  trial_subblocks: [
    // …
    { trials: [{ Fennimal: "A1", interaction_type: "joint_box_cleaning" }] }
  ]
}
```

**Flow in `joint_box_cleaning`:** closed box appears (no Fennimal) → face-choice bar (“Which Fennimal keeps their toy in this box?”) → correct answer → Fennimal appears → dirty/cleaning continues as before → after celebration, embedded photo of the box (Fennimal posed behind; hit = box in frame) → Fennimal walks off.

**Flow in training interactions (`hat_laundry`, `hide_and_seek_Fennimal`, `hat_blown_away`):** empty location → `await AskFennimalOverlay.run(this)` (“Which Fennimal lives here?”; unique heads) → rest of trial.

**Data:** `fennimal_errors_made` — ordered array of wrong Fennimal ids.  
**UI:** `AskFennimalOverlay` / `FennimalChoiceBar` (head icons via `create_Fennimal_SVG_object_head_only`).

---

## Shared optional feature: `ask_name`

Set `ask_name: true` on the **phase block** (stamped onto every trial FenObj).

**Currently implemented in:** `hat_laundry`, `hat_blown_away`, `hide_and_seek_Fennimal`, `photo_Fennimal`. Add to any other trial **after the Fennimal is on screen** with:

```js
await TypedNameAskOverlay.run(this);
```

No-ops unless `FenObj.ask_name` is true. Optional second argument: `{ pauseMs, playSuccess, parentLayer, anchorElement }`. Not wired into `joint_box_cleaning` (that intro names the Fennimal aloud).

**Flow in `hat_laundry`:** face quiz on empty screen (`AskFennimalOverlay`) → Fennimal appears hatless → typed overlay (`TypedNameAskOverlay`) → hat quiz (`AskHatOverlay`) → sad/comfort / laundry matching.

**Data:** `name_errors_made` — ordered array of `{ ans, LSdist }` for wrong typed answers. `name_was_revealed` — `true` if the 3-attempt catch showed the name.  
**UI:** `TypedNameAskOverlay` in `1_General_functions.js`.

---

## Shared optional feature: `ask_hat`

Set `ask_hat: true` on the **phase block** (stamped onto every trial FenObj).

```js
{
  type: "phone_room",
  ask_hat: true,
  // Optional. Defaults to all unique hats of Fennimals in this phase
  hats_asked: ["A", "B", "C"],
}
```

**Currently implemented in:** `hat_laundry`, `hat_blown_away`, `hide_and_seek_Fennimal`, `photo_Fennimal`. After `ask_name` (and after the Fennimal is visible):

```js
AskHatOverlay.hideWornHat(this); // before ask_name, if the hat would otherwise be visible
await AskHatOverlay.run(this);
await AskHatOverlay.revealWornHat(this); // skip on hat_laundry — matching is the reveal
```

No-ops unless `FenObj.ask_hat` is true. Retry until correct (same loop as `ask_Fennimal`). Prompt: “What hat did [name] wear?”. Worn hat stays hidden for `ask_Fennimal` / `ask_name` (head-only choice bar; live Fennimal hat opacity 0). Phone-room Fennimal hints show the hat. `hint_and_search` icon hints hide the hat when `ask_hat` is set. Quiz `on_fail` remedial can set `ask_hat: true` the same way.

**Data:** `ask_hat_errors_made` — ordered array of wrong hat ids. Separate from laundry `hat_errors_made`.  
**UI:** `AskHatOverlay` / `HatChoiceBar` in `1_General_functions.js`.

---

## Orthogonal tasks

On blocks with `included_orthogonal_tasks`:

1. For each listed task string × each Fennimal with `play_orthogonal_tasks: true` in the template dictionary, a copy is queued.
2. Those copies get `interaction_type` = the task string and forced `hint_type: "icon"`.
3. Main + orthogonal trials are smart-shuffled (avoid back-to-back same Fennimal id, region, or head).

**Valid `TrialFactory` keys for orthogonal tasks**

| Use this string | Controller |
|---|---|
| `hide_and_seek_Fennimal` | `HideAndSeekFennimalTrialController` |
| `find_box` | `FindBoxTrialController` |
| `find_box_extended` | `FindBoxExtendedTrialController` |
| `hat_blown_away` | `HatBlownAwayTrialController` |
| `fly_swat` | `FlySwatTrialController` |
| `fly_swat_extended` | `FlySwatExtendedTrialController` |

**Gotcha:** some older stimulus blocks still list `"fly_swatting"`, which is **not** a `TrialFactory` key (likely meant `fly_swat`). Prefer the table above.

---

## Partner behavior

Block field `partner_behavior`:

| Value | Effect |
|---|---|
| `"active"` | Partner present in trials (`partner_is_present === true`) |
| `"absent"` | Solo |

Exact help per trial varies (open box, cut foliage, swat flies, hand off food bag, etc.).

---

## Phone-room hint flavours

`3_InstructionsController.js` → `getPhoneRoomHintConfig()` (copy / icon only):

| `interaction_type` | Hint flavour |
|---|---|
| `Fennimal_toy`, `basic_intro` | Happy Fennimal |
| `toy_to_box` | Toy |
| `partner_belief_in_situ` | Toybox |
| `box_room` | Toybox (warehouse sort) |
| `photo_box` | Toybox |
| `feed_Fennimal` | Slumped Fennimal (hungry) |
| `joint_box_cleaning` | Toybox hint |
| `hide_and_seek_Fennimal` | Happy Fennimal (hide-and-seek) |
| `hat_laundry` / `hat_blown_away` | Slumped Fennimal (“needs help”) |
| *(default)* | Slumped Fennimal (“needs help”) |

---

## GenParam namespaces (trial-specific)

| Namespace | Used by |
|---|---|
| `PhotoTrial` | `photo_box` |
| `FeedTrial` | `feed_Fennimal` |
| `JointBoxCleaning` | `joint_box_cleaning` |
| `PhoneRoom` / `PhoneRoomFlair` | `phone_room` phase |
| `AutoTravel` / `MapFlair` | Phone-room travel legs |
| `ToyData` | Toy colours / charge visuals |
| `ActionButtonParameters_*` | Search / camera / watchtower buttons |
| `Quiz_settings` | Attribute / region quiz colour hints |

Full knobs live in `1_General_Parameters.js`.

---

## Quick reference: TrialFactory keys

```
basic_intro
Fennimal_toy
toy_to_box
partner_belief_in_situ
box_room
photo_box
photo_Fennimal
feed_Fennimal
joint_box_cleaning
retrieve_lost_box
broken_toy_in_box
broken_toy_no_box
dirty_toy
dirty_and_broken_toy
fly_swat
fly_swat_extended
hat_blown_away
hat_laundry
hide_and_seek_Fennimal
find_box
find_box_extended
```

---

## Maintenance notes

- When adding a new interaction type: register in `TrialFactory`, add a phone-room hint branch if needed, document it here, and note any `GenParam` object.
- When adding a block-level optional feature (like `ask_toy`): stamp it in `TrialGenerator.applyAskToySettingsToTrials` (or a sibling helper), implement the step in the relevant controllers, and document which interaction types honour it.
- Keep stimulus `included_orthogonal_tasks` strings identical to `TrialFactory` case labels.
