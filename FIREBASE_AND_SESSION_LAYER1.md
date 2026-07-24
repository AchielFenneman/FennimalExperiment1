# Firebase & Layer 1 session continuity

Reference for how experiment data is stored in Firebase, what existed before the Layer 1 work, and what Layer 1 added (soft-lock, assignment restore, overrides).

Validated in pilot testing (July 2026). **Layer 2** (resume at unfinished block) was deferred.

---

## 1. Pre-existing Firebase setup (before Layer 1)

### Client wiring (`index.html`)

- Firebase JS SDK v10.8.1 (Firestore).
- Global helper: `window.saveToFirebase(collection, docId, data)` → `setDoc(..., { merge: true })`.
- No authenticated participant login; participants write as anonymous clients.
- Admin export (`admin.html`) uses **email/password Auth**, then `getDocs` on an experiment collection.

### What got saved (legacy behavior)

| Piece | Behavior |
|---|---|
| **When** | Partial saves after each completed phase (`DataController.storePhaseData` → `storeAllData`); final save when the experiment completes |
| **Collection** | Experiment code string, e.g. `mentalizing`, `test` (from `StimulusSettings.Experiment_Code`) |
| **Document ID** | `PROLIFIC_PID` (first 10 chars), or `NO_PID_{startTime}` if no PID |
| **Payload** | `experimentData`: `expCode`, `pid`, `fennimals` (clean templates), `colorAssignment`, `storedData`, timestamps, questionnaire, payment, avatar, attention, `experimentCompleted`, etc. |
| **Merge** | `merge: true` — refresh with the **same PID** overwrote / mashed into the **same** document |

### Problems that motivated Layer 1

1. Between-subjects randomization re-ran on every page load.
2. Same PID → same Firestore doc → refreshes were **invisible** and could blend incompatible assignments / progress.
3. No soft-lock after completion.

### Admin / analysis

- `admin.html` downloads a collection as JSON (`*_all_data.json`, completed subset).
- R scripts (e.g. `extract_mentalizing_data.R`) key primarily on the **`pid` field** inside each document (not only the document id).

---

## 2. Layer 1 goals (what we implemented)

1. **Unique attempt documents** so refreshes do not silently mash data.
2. **Persist / restore the stimulus assignment** (Fennimals, feature map, item colors) on reload.
3. **Restart progress from the beginning** with that same assignment (no mid-block resume).
4. **Soft-lock** completed PIDs so they cannot start again.
5. **Dev override** to force a new session when testing.

Explicitly **not** in Layer 1: resume at the last unfinished block (Layer 2).

---

## 3. Document layout after Layer 1

### A. Claim registry

| | |
|---|---|
| **Collection** | `fennimals_claims` |
| **Document ID** | `{pid}` (10-char Prolific id) |
| **Purpose** | Soft-lock + pointer to the active attempt |

Typical fields:

```text
pid
expCode              // e.g. "mentalizing" — which attempt collection to use
activeSessionId
attemptDocId         // "{pid}__{sessionId}"
experimentCompleted  // true after successful completion
updatedAt            // ISO string
```

### B. Attempt / data documents

| | |
|---|---|
| **Collection** | `{expCode}` (same as before) |
| **Document ID** | `{pid}__{sessionId}` |
| **No PID** | `NO_PID_{sessionId}` |

Full `experimentData` plus Layer 1 metadata, including:

```text
sessionId
attemptDocId
featureMap                 // code→SVG assignment map (needed for ask_toy / etc.)
assignmentRestored         // true if this boot hydrated a prior assignment
sessionRestartCount        // increments each same-session reload restart
progressResetReason        // e.g. "layer1_same_assignment_restart"
fennimals, colorAssignment, storedData, ...
```

### C. Browser `localStorage`

Key: `fennimals_session_v1_{pid}`

Stores `expCode`, `sessionId`, `experimentCompleted`, `sessionRestartCount`, and an **assignment snapshot** (`fennimals`, `featureMap`, `colorAssignment`) as a fallback if Firestore **reads** fail.

---

## 4. Boot / runtime flow

```text
load SVGs
  → resolveParticipantSessionClaim()     // index.html; may getDoc claim + attempt
  → optional __FORCE_EXPERIMENT_CODE__   // keep same exp on restore
  → new ExperimentController()           // may randomly build a throwaway world
  → finalizeSession(earlySession)        // hydrate if continuing; write claim + seed attempt
  → SVGREDUCER                           // ONLY after final assignment is known
  → startExperiment()
```

### Session modes (`resolveParticipantSessionClaim`)

| Mode | Meaning |
|---|---|
| `anonymous` | No `PROLIFIC_PID` — no soft-lock; `NO_PID_…` docs |
| `new` | First claim for this PID (or forced new) |
| `continue_assignment` | Incomplete claim → same `sessionId`, restore assignment, **reset progress** |
| `blocked_completed` | Claim has `experimentCompleted: true` → overlay, experiment does not start |

### Important restore details (bugs we hit / fixed)

1. **Clean fennimal templates** strip region `ColorScheme` → rebuild via `ensure_fennimal_runtime_color_scheme` inside `hydrate_assignment`.
2. **`SVGREDUCER` must run after hydrate** — otherwise the fresh random world deletes heads (e.g. `tv`) that the restored assignment still needs.
3. On continue, in-memory / attempt **progress** is cleared (`storedData`, etc.); first save replaces progress on that attempt doc while keeping the same assignment fields.

---

## 5. URL parameters & overrides

| Parameter | Effect |
|---|---|
| `PROLIFIC_PID` | Participant id (truncated to 10 chars). Drives claim + attempt naming. |
| `FORCE_NEW_SESSION=1` | Ignores existing claim/completion for this boot; creates a **new** `sessionId` and updates the claim. Use for re-testing a PID. |

Examples:

```text
?PROLIFIC_PID=testdemo02
?PROLIFIC_PID=testdemo02&FORCE_NEW_SESSION=1
```

(No PID → anonymous / local testing path.)

---

## 6. Key code touchpoints

| File | Role |
|---|---|
| `index.html` | `saveToFirebase`, `getFromFirebase`, `resolveParticipantSessionClaim`, `SESSION_CLAIM_COLLECTION` |
| `0_Loader.js` | Async boot; claim resolve; blocked screen; SVG `fetchAssetText` cache-bust (`?v=Date.now()`, `cache: "no-store"`) |
| `2_Top_controller.js` | `DataController.finalizeSession`, `writeSessionClaim`, attempt doc ids, refresh `beforeunload` guard; `ExperimentController.finalizeSession` + deferred `SVGREDUCER` |
| `2_Stimulus_data.js` | `__FORCE_EXPERIMENT_CODE__`, `get_feature_map`, `hydrate_assignment` |
| `1_General_functions.js` | `apply_saved_color_assignment`, `ensure_fennimal_runtime_color_scheme` |
| `admin.html` | Unchanged pattern: auth + list collection (attempt docs now have ids `pid__sessionId`) |

---

## 7. Firestore security rules (required for Layer 1)

Participants need **single-document `get`** (not necessarily `list`). Example used in testing:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /fennimals_claims/{pid} {
      allow get: if true;
      allow list: if request.auth != null;
      allow create, update: if true;
      allow delete: if false;
    }

    match /{collectionName}/{documentId} {
      allow get: if true;
      allow list: if request.auth != null;
      allow create, update: if true;
      allow delete: if false;
    }
  }
}
```

- **`get: true`** — soft-lock + assignment restore.
- **`list: auth`** — only logged-in admin can dump a whole collection (`admin.html`).
- If `get` is denied, code falls back to `localStorage` (same browser only; weaker soft-lock).

---

## 8. Validation checklist (Layer 1)

1. **New PID** → claim + `{pid}__{sessionId}` attempt created; assignment fields present.
2. **Reload same PID (incomplete)** → same Fennimals/colors; instructions restart; same `sessionId`; `sessionRestartCount` increments.
3. **Complete → reload** → blocked screen.
4. **`FORCE_NEW_SESSION=1`** → new attempt doc / session id.
5. **No PID** → still runs; `NO_PID_…` saves; no claim lock.

---

## 9. Analysis notes

- Prefer the **`pid` field** inside documents; document ids are no longer bare PIDs.
- Multiple attempts for one PID are possible if `FORCE_NEW_SESSION` was used or claims were reset manually.
- Useful filters: `experimentCompleted`, `sessionId`, `sessionRestartCount`, `assignmentRestored`.
- Inclusion rule suggestion: first (or only) `experimentCompleted: true` per `pid`.

---

## 10. Manual claim reset (researcher)

In Firebase console:

- Delete or edit `fennimals_claims/{pid}` (e.g. set `experimentCompleted: false`), **or**
- Use `FORCE_NEW_SESSION=1` in the study URL, **or**
- Clear site data for the origin (localStorage) if testing read-fallback behavior.

---

## 11. Deferred: Layer 2

Resume at the **start of the most recently unfinished block** (keep completed `storedData`, skip ahead in `Experiment_Structure`). Harder (payment/stars, WorldState, instructions). Not implemented; Layer 1 is the pilot-safe baseline.
