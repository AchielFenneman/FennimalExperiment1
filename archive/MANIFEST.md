# Archive

Parked pilots, leftover experiment recipes, and unused DVs from the 2026-09-03 cleanup. **Not loaded.** Live codes in `2_Stimulus_data.js` are `semantic_learning_star`, `mentalizing_between_subjects`, and stimulus-pilot `feature_kit_pilot`.

Restore a piece by copying it back to the repo root (or pasting a recipe/param/wiring snippet into the live file) and adding the matching `<script>` tag in `index.html`. Details per folder below.

## Layout

```
archive/
  MANIFEST.md                          this file
  experiments/                         old StimulusSettings recipes
  tasks/                               unused DV controllers (whole files)
  controllers/                         parked TrialFactory interactions
  params/                              unused GenParam blocks
  wiring/                              snippets stripped from live controllers
  figures/                             pilot-4 slides
  notes/                               Dropbox-conflict check + one-off inspect script
```

## Live vs archived

| Keep in the running app | Archived |
|---|---|
| `mentalizing_between_subjects` | `semantic_learning` (chimera + hat-drop DVs) |
| `semantic_learning_star` (training, quiz, hat-binding + join, name recall, morph_task) | `morph_head_pilot` |
| Map / phone-room / partner-belief-individual-boxes | `test`, `example`, `example_semantic_exp1/2`, `example_sem_star` |
| Hat binding, join tasks, sorting, live `morph_task` | Chimera, hat-drop / go-nogo, morph two-cards, morph two-stage |
| | Leftover `mentalizing` / `_AB` / `_AC` questionnaire keys (no structures) |

Still in the live `TrialFactory` (used by archived `semantic_learning`, harmless if unused): `hide_and_seek_Fennimal`, `hat_laundry`. Extract those only if we want a stricter controller later.

## experiments/

Copy-paste recipes for `2_Stimulus_data.js` (`All_Instructions_At_Start`, `All_Fennimal_Sets`, `All_Experiment_Structures`, questionnaires, forced heads).

| File | What it was |
|---|---|
| `semantic_learning.js` | Earlier linear semantic study: photo training, hide-and-seek / laundry, chimera, hat-drop 2AFC + go-nogo |
| `morph_head_pilot.js` | Head-only jumble 2AFC (no map). Also has the `literal_svg_heads` constructor special-case |
| `test_and_examples.js` | Scratch `test` structure plus `example*` authoring sketches |
| `mentalizing_legacy_codes.js` | Questionnaire/head-pool keys with no matching structure |

`?EXP=` still overrides the live code. Unknown codes now throw and point here.

## tasks/

Move the file back to the repo root and add a script tag **after** `4_MorphTask.js` where the DV depends on it.

| Folder | Phase type | Restore also needs |
|---|---|---|
| `chimera/4_ChimeraFeatureIdTask.js` | `chimera_feature_id` | `params/archived_genparam.js` (`ChimeraFeatureId`) + chimera snippets in `wiring/` |
| `hat_drop/4_HatDropTask.js` | `hat_drop_task`, `hat_drop_gonogo` | `HatDrop` params + hat-drop wiring. `gonogo_trials.csv` is authoring notes |
| `morph_head_pilot/4_MorphHeadPilotTask.js` | `morph_head_pilot` | `MorphHeadPilot` params, constructor special-case in `experiments/morph_head_pilot.js`, wiring |
| `morph_two_cards/4_MorphTaskTwoCards.js` | `morph_task_two_cards` | developing-photo `MorphTask` snapshot in `params/archived_genparam.js` |
| `morph_two_stage/4_MorphTaskTwoStageDevelopment.js` | `morph_task_two_stage_development` | same param snapshot |

## controllers/

`3_InteractiveFennimalController_archive.js` — August 2026 park of unused location trials (`fly_swat`, `find_box`, `box_room`, `partner_belief_in_situ`, `partner_belief_multiple`, …). Load after `3_InteractiveFennimalController.js`. `partner_belief_multiple` phase routing now lives in `wiring/top_controller_archived_phases.js`.

## params/

`archived_genparam.js` — `ChimeraFeatureId`, developing-photo `MorphTask` (source for TwoCards / TwoStage `Object.assign`), `MorphHeadPilot`, `HatDrop`. Paste onto the `GENERALPARAM` constructor. Live `MorphTask` (two-spot polaroid) stays in `1_General_Parameters.js`.

## wiring/

Snippets removed from live files so archived phases fail loud instead of calling missing classes.

| File | Paste back into |
|---|---|
| `top_controller_archived_phases.js` | `2_Top_controller.js` (validation, setup, dispatch) |
| `instructions_archived_phases.js` | `3_InstructionsController.js` |

## figures/

Pilot-4 keep/drop slides (`pilot4_keep_*.svg`). Not used by the task.

## notes/

| File | Why |
|---|---|
| `dropbox_conflicts_2026-08-26.md` | Compared five Dropbox conflicted copies to the live originals; nothing unique needed merging; copies deleted |
| `_tmp_inspect_new.py` | One-off pilot-4 JSON inspect (paths outside this repo) |

## Dropbox conflicted copies

See `notes/dropbox_conflicts_2026-08-26.md`. The 2026-08-26 laptop copies were older snapshots (hub/arms hat-binding API, old jumble canvas, older cache-bust strings). Live files already had the later work.
