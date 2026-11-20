// Firestore connection for the fennimals project. Attempt documents live in the
// experiment-code collection. Claims and last-resort dumps live beside it, so
// this study does not share the Fennimals soft-lock.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBLYsCJDNs9JO3bNi3RSCBZFHegtH1OI_I",
    authDomain: "fennimals.firebaseapp.com",
    projectId: "fennimals",
    storageBucket: "fennimals.firebasestorage.app",
    messagingSenderId: "416848310750",
    appId: "1:416848310750:web:1fd80297bf7b6389472d4f"
};

const experimentCode = window.EXPERIMENT_CODE || "social_dm";
window.EXPERIMENT_CODE = experimentCode;
window.SESSION_CLAIM_COLLECTION = experimentCode + "_claims";
window.SAVE_DUMP_COLLECTION = experimentCode + "_save_dumps";
window.SESSION_LOCAL_PREFIX = experimentCode + "_session_v1_";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore rejects arrays-of-arrays, undefined, and NaN. JSON.stringify
// allows all three, so a log can look fine in memory and still fail the write.
function sanitizeForFirestore(value, path, stats) {
    if (value === undefined) return undefined;
    if (typeof value === "number" && !Number.isFinite(value)) return null;
    if (Array.isArray(value)) {
        return value.map((item, i) => {
            const nextPath = path + "[" + i + "]";
            const converted = sanitizeForFirestore(item, nextPath, stats);
            if (Array.isArray(converted)) {
                stats.nestedArrays.push(nextPath);
                return { values: converted };
            }
            return converted;
        });
    }
    if (value && typeof value === "object") {
        if (typeof Node !== "undefined" && value instanceof Node) return null;
        if (value instanceof Date) return value;
        const out = {};
        Object.keys(value).forEach((key) => {
            if (value[key] === undefined) return;
            out[key] = sanitizeForFirestore(value[key], path ? path + "." + key : key, stats);
        });
        return out;
    }
    return value;
}

function experimentDataToJsonString(experimentData) {
    try {
        return JSON.stringify(experimentData);
    } catch (error) {
        try {
            return JSON.stringify(sanitizeForFirestore(experimentData, "", { nestedArrays: [] }));
        } catch (secondError) {
            return JSON.stringify({
                stringifyFailed: String(error),
                sanitizeFailed: String(secondError),
                pid: experimentData && experimentData.pid || null
            });
        }
    }
}

// Last-resort backup when the structured experiment write fails.
// Strings are legal Firestore values, so this bypasses nested-array rejections.
// Does not throw — a failed dump must never block the participant.
async function dumpExperimentLastResort(originalCollection, originalDocId, experimentData, error) {
    const json = experimentDataToJsonString(experimentData);
    const chunkSize = 800000;
    const chunks = [];
    for (let i = 0; i < json.length; i += chunkSize) chunks.push(json.slice(i, i + chunkSize));

    const dumpedAt = new Date().toISOString();
    const dumpId = String(originalDocId || ("unknown_" + Date.now()));
    const col = window.SAVE_DUMP_COLLECTION;
    const meta = {
        kind: "meta",
        pid: (experimentData && experimentData.pid) || null,
        expCode: (experimentData && experimentData.expCode) || originalCollection,
        attemptDocId: dumpId,
        originalCollection: originalCollection,
        originalDocId: originalDocId,
        dumpedAt: dumpedAt,
        saveError: (error && (error.message || String(error))) || "unknown",
        saveErrorCode: (error && error.code) || null,
        experimentCompleted: !!(experimentData && experimentData.experimentCompleted),
        nChunks: chunks.length,
        jsonChars: json.length,
        encoding: "json-string-chunks",
        howToReassemble: "Concatenate json (if present) or jsonChunk from __c0..__c{nChunks-1} in order, then JSON.parse."
    };

    if (chunks.length === 1) {
        meta.json = chunks[0];
        await setDoc(doc(db, col, dumpId), meta);
        console.warn("Last-resort save dump written to", col + "/" + dumpId, "(" + json.length + " chars)");
        return true;
    }

    meta.json = null;
    await setDoc(doc(db, col, dumpId), meta);
    for (let i = 0; i < chunks.length; i++) {
        await setDoc(doc(db, col, dumpId + "__c" + i), {
            kind: "chunk",
            attemptDocId: dumpId,
            originalCollection: originalCollection,
            expCode: meta.expCode,
            pid: meta.pid,
            chunkIndex: i,
            nChunks: chunks.length,
            jsonChunk: chunks[i],
            dumpedAt: dumpedAt
        });
    }
    console.warn("Last-resort save dump written to", col + "/" + dumpId, "in", chunks.length, "chunks");
    return true;
}

window.saveToFirebase = async function (collectionName, docId, experimentData) {
    const stats = { nestedArrays: [] };
    const payload = sanitizeForFirestore(experimentData, "", stats);
    if (stats.nestedArrays.length) {
        console.warn(
            "Firestore sanitize: wrapped nested arrays at",
            stats.nestedArrays.slice(0, 12),
            stats.nestedArrays.length > 12 ? ("… +" + (stats.nestedArrays.length - 12) + " more") : ""
        );
    }
    try {
        await setDoc(doc(db, collectionName, docId), payload, { merge: true });
        return true;
    } catch (error) {
        console.error("Error saving to Firebase: ", error);
        const skipDump = collectionName === window.SESSION_CLAIM_COLLECTION
            || collectionName === window.SAVE_DUMP_COLLECTION;
        if (!skipDump) {
            try {
                await dumpExperimentLastResort(collectionName, docId, experimentData, error);
            } catch (dumpError) {
                console.error("Last-resort dump also failed:", dumpError);
            }
        }
        return false;
    }
};

window.getFromFirebase = async function (collectionName, docId) {
    try {
        const snap = await getDoc(doc(db, collectionName, docId));
        return snap.exists() ? snap.data() : null;
    } catch (error) {
        const code = error && error.code ? String(error.code) : "";
        if (code.includes("permission-denied")) {
            console.warn(
                "Firebase read blocked by security rules for",
                collectionName + "/" + docId,
                "— using local fallback if available. Allow 'get' (not necessarily 'list') for session restore."
            );
        } else {
            console.error("Error reading from Firebase: ", error);
        }
        return null;
    }
};

function getPidFromUrl() {
    try {
        const pid = new URL(window.location.href).searchParams.get("PROLIFIC_PID");
        return pid ? pid.substring(0, 10) : null;
    } catch (error) {
        return null;
    }
}

function makeSessionId() {
    return Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

function localSessionKey(pid) {
    return window.SESSION_LOCAL_PREFIX + pid;
}

// Refresh restore and the completion block both expire after this.
// A claim with no timestamp is treated as already expired.
const SESSION_CLAIM_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

function sessionClaimIsCurrent(claim) {
    if (!claim) return false;
    const stamped = Date.parse(claim.updatedAt || "");
    if (!isFinite(stamped)) {
        console.log(
            "%c Session claim has no timestamp; not restoring or blocking",
            "color:purple; font-weight:bold"
        );
        return false;
    }
    const ageMs = Date.now() - stamped;
    if (ageMs > SESSION_CLAIM_MAX_AGE_MS) {
        const days = Math.max(1, Math.round(ageMs / 86400000));
        console.log(
            "%c Session claim is " + days + " days old; starting a new session",
            "color:purple; font-weight:bold"
        );
        return false;
    }
    return true;
}

function claimMatchesThisStudy(claim) {
    return !!(claim && claim.expCode === experimentCode);
}

function readLocalSession(pid) {
    try {
        const localRaw = localStorage.getItem(localSessionKey(pid));
        const local = localRaw ? JSON.parse(localRaw) : null;
        if (!local || local.expCode !== experimentCode) return null;
        return local;
    } catch (error) {
        return null;
    }
}

// Prefer the attempt document, and fill any missing piece from this browser's copy.
function assignmentFromAttempt(attempt, localAssignment) {
    const local = localAssignment || {};
    return {
        cast: (attempt && attempt.cast) || local.cast || null,
        trialsByBlock: (attempt && attempt.trialsByBlock) || local.trialsByBlock || null
    };
}

/**
 * Soft-lock / session continuity.
 * Looks up {experimentCode}_claims/{pid} before the study starts.
 * A claim older than SESSION_CLAIM_MAX_AGE_MS is ignored.
 * Modes: anonymous | new | continue_assignment | blocked_completed
 */
window.resolveParticipantSessionClaim = async function () {
    const pid = getPidFromUrl();
    let forceNew = false;
    try {
        forceNew = new URL(window.location.href).searchParams.get("FORCE_NEW_SESSION") === "1";
    } catch (error) { /* ignore */ }

    if (!pid) {
        return { mode: "anonymous", pid: null, sessionId: makeSessionId() };
    }

    let claim = await window.getFromFirebase(window.SESSION_CLAIM_COLLECTION, pid);

    if (!claim && !forceNew) {
        const local = readLocalSession(pid);
        if (local && local.sessionId) {
            claim = {
                activeSessionId: local.sessionId,
                expCode: local.expCode,
                attemptDocId: pid + "__" + local.sessionId,
                experimentCompleted: local.experimentCompleted === true,
                localAssignment: local.assignment || null,
                localRestartCount: local.sessionRestartCount || 0,
                updatedAt: local.updatedAt || null
            };
        }
    }

    if (claim && !claimMatchesThisStudy(claim)) claim = null;

    if (claim && !forceNew && !sessionClaimIsCurrent(claim)) claim = null;

    if (!forceNew && claim && claim.experimentCompleted === true) {
        return {
            mode: "blocked_completed",
            pid: pid,
            message: "It looks like you have already completed this study. Please return the task on Prolific if it is still listed. Thank you!"
        };
    }

    if (!forceNew && claim && claim.activeSessionId && claim.expCode) {
        const attemptDocId = claim.attemptDocId || (pid + "__" + claim.activeSessionId);
        const attempt = await window.getFromFirebase(claim.expCode, attemptDocId);

        let localAssignment = claim.localAssignment || null;
        let localRestartCount = claim.localRestartCount || 0;
        if (!localAssignment) {
            const local = readLocalSession(pid);
            if (local && local.assignment) localAssignment = local.assignment;
            if (local && local.sessionRestartCount) localRestartCount = local.sessionRestartCount;
        }

        const assignment = assignmentFromAttempt(attempt, localAssignment);
        const priorRestartCount = (attempt && attempt.sessionRestartCount) || localRestartCount || 0;

        try {
            localStorage.setItem(localSessionKey(pid), JSON.stringify({
                expCode: claim.expCode,
                sessionId: claim.activeSessionId,
                experimentCompleted: false,
                updatedAt: claim.updatedAt || new Date().toISOString(),
                assignment: assignment,
                sessionRestartCount: priorRestartCount
            }));
        } catch (error) { /* private mode / quota */ }

        return {
            mode: "continue_assignment",
            pid: pid,
            expCode: claim.expCode,
            sessionId: claim.activeSessionId,
            attemptDocId: attemptDocId,
            assignment: assignment,
            priorRestartCount: priorRestartCount
        };
    }

    return {
        mode: "new",
        pid: pid,
        sessionId: makeSessionId(),
        forceNew: forceNew
    };
};
