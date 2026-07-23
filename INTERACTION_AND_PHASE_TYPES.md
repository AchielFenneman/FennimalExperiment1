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

Some phases are **not** location trials (`partner_belief_multiple` / `partner_belief_individual_boxes`, sorting, `pseudoday`) and never call `TrialFactory`.

### Trial queue: default vs `trial_subblocks`

Map phases that use `TrialGenerator` (`phone_room`, `free_exploration`, `hint_and_search`, `jump_to_trial`, `on_call`, …) build their trial list in one of two ways:

**Default (cartesian)** — omit `trial_subblocks`:

| Field | Meaning |
|---|---|
| `Fennimals_encountered` | Fennimal ids |
| `interaction_type` | String or array — every type is crossed with every Fennimal |

Trials are smart-shuffled (with orthogonal tasks mixed in when present).

**Ordered subblocks** — set `trial_subblocks` (array). Subblocks run in order; each is shuffled internally, then concatenated. Use this when some trials must precede others within a single day/phase.

**Fail loud (required):** when `trial_subblocks` is present you must **not** also set top-level `Fennimals_encountered`, top-level `interaction_type`, or `included_orthogonal_tasks`. Mixing those is a thrown error so setup mistakes show up immediately in testing.

Each subblock is **either** cartesian **or** an explicit trial list — never both:

```js
// Cartesian subblock (same spirit as the default block fields)
{
  Fennimals_encountered: ["S1", "S2", "S3"],
  interaction_type: "toy_to_box"
}

// Explicit trials (non-cartesian)
{
  trials: [
    { Fennimal: "S1", interaction_type: "joint_box_cleaning" },
    { Fennimal: "S2", interaction_type: "photo_box" },
    { Fennimal: "S3", interaction_type: "photo_box" },
    { Fennimal: "S2", interaction_type: "feed_Fennimal" },
    { Fennimal: "S3", interaction_type: "feed_Fennimal" }
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
| `ask_Fennimal` | If `true`, stamp ask-Fennimal quiz onto **all** trials (honoured by `joint_box_cleaning`) |
| `fennimals_asked` | Optional Fennimal ids for the face bar; defaults to all Fennimals in the phase |
| `return_to_phone_room_after_final_trial` | Stay on map after last trial if `false` |
| `skip_instructions` | If `true`, skip the phase-start instructions page (default: show instructions) |

Tunables: `GenParam.PhoneRoom`, `PhoneRoomFlair`, `AutoTravel`.

#### `free_exploration`
All phase Fennimals on the map; participant explores until all are visited.

| Field | Meaning |
|---|---|
| `interaction_type` | Usually `["basic_intro"]` (array allowed) |
| `Fennimals_encountered` | |
| `trial_subblocks` | Optional; same rules as phone_room |
| `partner_behavior` | |
| `include_Fennefinder` | |
| `force_climbing_tower_first` | Force watchtower intro first |
| `ask_toy` / `toys_asked` | Same block-level stamp as phone_room (`toys_asked` optional; defaults to block toys) |
| `bonus_stars_per_correct_answer` | Optional |

#### `hint_and_search`
One target at a time; hint instruction, then find & interact. Supports orthogonal tasks.

| Field | Meaning |
|---|---|
| `interaction_type` | Array, e.g. `["broken_toy_in_box","dirty_toy"]` |
| `hint_type` | Array, e.g. `["icon","toybox","toy"]` — **main trials currently get the first element only** |
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
| `questions` | Array of `{ question_id, target_box }` (stimulus codes). `question_id` is mandatory and unique. Do **not** set `answer_options` |
| `lure_cycle` | Optional box-code cycle for the lure (default = unique `target_box` values in `questions` order, e.g. A→B→C→A) |
| `num_belief_blocks` | How many shuffled belief blocks (default `1`). Deprecated alias: `num_repeated_blocks` |
| `include_reality_block_at_end` | If `true`, after all belief blocks run one shuffled reality-memory block (no partner). Includes the existing reality-block intro overlay |
| `include_practice_trial` | If `true`, prepend shape-match and color-match practice trials |
| `include_memory_probe_at_end` | If `true`, after reality (or after belief if no reality block) run a solo memory-probe section (no partner, no distractors) |
| `memory_probe_isi_ms` | Pause after each memory-probe response before the next trial (default `1000`) |
| `bonus_stars_per_correct_answer` | Silent stars per correct belief/reality/memory-probe answer |

**Answer options (fixed rule `belief_reality_cyclic_lure`):** for each question the controller auto-builds a shuffled 3AFC triad from `WorldState`:

- **Belief trials:** target-box partner belief (old; correct) + target-box current contents (new) + partner belief about the *next* box in `lure_cycle` (old lure).
- **Reality trials:** target-box partner belief (old) + target-box current contents (new; correct) + current contents of the *next* box in `lure_cycle` (new lure).

Thus, with A→B→C→A, A’s lure comes from B, B’s from C, and C’s from A; only the source type changes by trial kind. Fails loud if any piece is missing or the three toys are not distinct. Logged fields include `lure_source_box`, `lure_source_box_code`, `lure_source_type`, `lure_answer`, and `option_roles`.

**Trial structure:** optional practice → for each belief block: (distractor → belief)×N → optional final reality block: (distractor → reality)×N → optional memory probes. Distractors alternate shape/color matching with orthogonal features. Question presentation order is shuffled within each block.

**Memory probes** (when `include_memory_probe_at_end`): two homogeneous blocks, order counterbalanced between participants (`memory_probe_block_order` on the phase):

1. **Box→Fennimal** (`memory_probe_box_to_fennimal`): one trial per Fennimal; empty closed box cue; radial colored heads; foils exclude co-box mates.
2. **Fennimal→toy** (`memory_probe_fennimal_to_toy`): one trial per Fennimal; full-body Fennimal cue; radial toys; foils = one same-wave + one other-wave toy (S vs P).

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

Controllers: `FennimalAttributeSortingMultipleTask` / `FennimalAttributeSortingSingleTask` via `createFennimalAttributeSortingTask`.

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

If the box already holds a **different** toy: opening reveals it → participant must drag it far enough sideways (`|Δx| ≥ 300` from box; tunable via `oldToyClearDistance`) → on release it locks in place, falls to the discarded-toy ground line if above it, and stays on screen → WorldState box contents are cleared → then place the new toy. Same-toy contents are treated as an empty box. Partner (if present) only opens the box and otherwise observes.

**Needs:** `toy`, `toybox`.

---

### Photo & feed

#### `photo_box` → `PhotoTrialController` (`targetType: "toybox"`)
Photograph the toybox with a camera viewfinder; polaroid feedback.

**Needs:** `toybox`.  
**Tunables:** `GenParam.PhotoTrial` (box spawn range, lens size, flash, polaroid scale, etc.).

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
**No WorldState writes.**

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

#### `reach_hat` → `ReachHatTrialController`
Hat stuck on a region pole; drag toybox as a step-stool (turn-taking with partner if present).

**Needs:** `hat`, `region`, `toybox`, `name`.

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

Set on the **phase block** (stamped onto every trial FenObj; currently honoured by `joint_box_cleaning`):

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

**Data:** `fennimal_errors_made` — ordered array of wrong Fennimal ids.  
**UI:** `FennimalChoiceBar` (head icons via `create_Fennimal_SVG_object_head_only`).

---

## Orthogonal tasks

On blocks with `included_orthogonal_tasks`:

1. For each listed task string × each Fennimal with `play_orthogonal_tasks: true` in the template dictionary, a copy is queued.
2. Those copies get `interaction_type` = the task string and forced `hint_type: "icon"`.
3. Main + orthogonal trials are smart-shuffled (avoid back-to-back same Fennimal id).

**Valid `TrialFactory` keys for orthogonal tasks**

| Use this string | Controller |
|---|---|
| `find_box` | `FindBoxTrialController` |
| `find_box_extended` | `FindBoxExtendedTrialController` |
| `reach_hat` | `ReachHatTrialController` |
| `fly_swat` | `FlySwatTrialController` |
| `fly_swat_extended` | `FlySwatExtendedTrialController` |

**Gotcha:** some older stimulus blocks still list `"hat_blown_away"` and `"fly_swatting"`, which are **not** `TrialFactory` keys (likely meant `reach_hat` / `fly_swat`). Prefer the table above.

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
| `photo_box` | Toybox |
| `feed_Fennimal` | Slumped Fennimal (hungry) |
| `joint_box_cleaning` | Toybox hint |
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
photo_box
feed_Fennimal
joint_box_cleaning
broken_toy_in_box
broken_toy_no_box
dirty_toy
dirty_and_broken_toy
fly_swat
fly_swat_extended
reach_hat
find_box
find_box_extended
```

---

## Maintenance notes

- When adding a new interaction type: register in `TrialFactory`, add a phone-room hint branch if needed, document it here, and note any `GenParam` object.
- When adding a block-level optional feature (like `ask_toy`): stamp it in `TrialGenerator.applyAskToySettingsToTrials` (or a sibling helper), implement the step in the relevant controllers, and document which interaction types honour it.
- Keep stimulus `included_orthogonal_tasks` strings identical to `TrialFactory` case labels.
