// Persists the session to Firestore, using the same attempt / claim layout as Fennimals.
// A refresh of an unfinished Prolific id keeps the character and the offer order, then restarts progress.
// A finished id is turned away until the claim expires. Add FORCE_NEW_SESSION=1 to the URL to start over.

const OPEN_RESPONSE_FIELDS = [
    "partnerHelpful",
    "cooperationDifference",
    "instructionsAndTaskClear",
    "generalComments"
];

function emptyOpenResponses() {
    const responses = {};
    OPEN_RESPONSE_FIELDS.forEach((field) => {
        responses[field] = "";
    });
    return responses;
}

function detectBrowser() {
    const userAgent = navigator.userAgent || "";
    if (/Edg\//.test(userAgent)) return "Edge";
    if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent)) return "Chrome";
    if (/Firefox\//.test(userAgent)) return "Firefox";
    if (/Safari\//.test(userAgent)) return "Safari";
    return "Unknown";
}

function localSessionKey(pid) {
    const prefix = window.SESSION_LOCAL_PREFIX
        || ((StimulusSettings.experimentCode || "social_dm") + "_session_v1_");
    return prefix + pid;
}

function copyValue(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
}

class DataController {
    constructor() {
        this.startTime = Date.now();
        this.trials = [];
        this.totalPoints = 0;
        this.openQuestions = emptyOpenResponses();
        this.attemptDocId = null;
        this.refreshGuardArmed = false;
        this.questionsMarked = false;
        this.completionRequested = false;
        this.responseTimer = 0;
        this.saveChain = Promise.resolve();
        this.experimentData = {
            storageVersion: 1,
            expCode: this.getExpFolderName(),
            startDate: new Date().toString(),
            browser: detectBrowser(),
            pid: null,
            prolificPid: null,
            prolificStudyId: null,
            prolificSessionId: null,
            sessionId: null,
            attemptDocId: null,
            assignmentRestored: false,
            sessionRestartCount: 0,
            progressResetReason: null,
            cast: null,
            trialsByBlock: null,
            trials: this.trials,
            openQuestions: this.openQuestions,
            totalPoints: 0,
            timeStamps: [],
            totalDuration: 0,
            experimentCompleted: false,
            entryUrl: window.location.href
        };
        this.readIdentity();
        this.installRefreshGuard();
    }

    getExpFolderName() {
        return (typeof StimulusSettings !== "undefined" && StimulusSettings.experimentCode) || "social_dm";
    }

    readIdentity() {
        let params;
        try {
            params = new URL(window.location.href).searchParams;
        } catch (error) {
            params = new URLSearchParams();
        }
        const rawPid = params.get("PROLIFIC_PID");
        this.experimentData.prolificPid = rawPid || null;
        this.experimentData.pid = rawPid ? rawPid.substring(0, 10) : null;
        this.experimentData.prolificStudyId = params.get("STUDY_ID") || null;
        this.experimentData.prolificSessionId = params.get("SESSION_ID") || null;
    }

    async finalizeSession(earlySession) {
        earlySession = earlySession || { mode: "anonymous" };
        const pid = this.experimentData.pid;

        if (earlySession.mode === "anonymous" || !pid) {
            this.experimentData.sessionId = earlySession.sessionId || String(this.startTime);
            this.attemptDocId = "NO_PID_" + this.experimentData.sessionId;
            this.experimentData.attemptDocId = this.attemptDocId;
            this.recordTimestamp("session_started");
            await this.storeAllData(false);
            return;
        }

        if (earlySession.mode === "continue_assignment") {
            this.experimentData.sessionId = earlySession.sessionId;
            this.attemptDocId = earlySession.attemptDocId || (pid + "__" + earlySession.sessionId);
            this.experimentData.attemptDocId = this.attemptDocId;
            this.experimentData.sessionRestartCount = (earlySession.priorRestartCount || 0) + 1;
            this.experimentData.progressResetReason = "layer1_same_assignment_restart";
            this.experimentData.experimentCompleted = false;
            const assignment = earlySession.assignment || {};
            if (assignment.cast) {
                this.experimentData.cast = copyValue(assignment.cast);
                this.experimentData.assignmentRestored = true;
                this.refreshGuardArmed = true;
            }
            if (assignment.trialsByBlock) {
                this.experimentData.trialsByBlock = copyValue(assignment.trialsByBlock);
            }
            this.trials.length = 0;
            this.totalPoints = 0;
            this.openQuestions = emptyOpenResponses();
        } else {
            this.experimentData.sessionId = earlySession.sessionId || String(this.startTime);
            this.attemptDocId = pid + "__" + this.experimentData.sessionId;
            this.experimentData.attemptDocId = this.attemptDocId;
            this.experimentData.sessionRestartCount = 0;
            this.experimentData.assignmentRestored = false;
        }

        this.recordTimestamp("session_started");
        await this.writeSessionClaim(false);
        await this.storeAllData(false);
    }

    hasRestoredCast() {
        return !!(this.experimentData.assignmentRestored && this.experimentData.cast && this.experimentData.cast.partner);
    }

    applyCast(cast) {
        const saved = this.experimentData.cast;
        if (!saved) return;
        cast.player.gender = saved.player.gender;
        cast.player.colors = Object.assign({}, saved.player.colors);
        cast.partner.gender = saved.partner.gender;
        cast.partner.colors = Object.assign({}, saved.partner.colors);
        cast.partner.name = saved.partner.name;
    }

    async lockCast(cast) {
        this.experimentData.cast = {
            player: {
                gender: cast.player.gender,
                colors: Object.assign({}, cast.player.colors)
            },
            partner: {
                gender: cast.partner.gender,
                colors: Object.assign({}, cast.partner.colors),
                name: cast.partner.name
            }
        };
        this.recordTimestamp("character_confirmed");
        this.refreshGuardArmed = true;
        await this.writeSessionClaim(false);
        await this.storeAllData(false);
    }

    async getOrCreateTrials(blockIndex) {
        const key = String(blockIndex);
        if (!this.experimentData.trialsByBlock || typeof this.experimentData.trialsByBlock !== "object") {
            this.experimentData.trialsByBlock = {};
        }
        const existing = this.experimentData.trialsByBlock[key];
        if (Array.isArray(existing) && existing.length) {
            return existing.map((trial) => ({
                rewardAmount: trial.rewardAmount,
                socialCondition: trial.socialCondition
            }));
        }
        const trials = buildTrialList().map((trial) => ({
            rewardAmount: trial.rewardAmount,
            socialCondition: trial.socialCondition
        }));
        this.experimentData.trialsByBlock[key] = trials;
        this.recordTimestamp("trial_order_set");
        await this.writeSessionClaim(false);
        await this.storeAllData(false);
        return trials.map((trial) => ({
            rewardAmount: trial.rewardAmount,
            socialCondition: trial.socialCondition
        }));
    }

    recordTrial(entry) {
        const accepted = entry.accepted === true;
        this.trials.push({
            blockNumber: entry.blockIndex == null ? null : entry.blockIndex + 1,
            trialNumber: entry.trialIndex == null ? null : entry.trialIndex + 1,
            rewardAmount: entry.rewardAmount,
            socialCondition: entry.socialCondition,
            accepted: accepted,
            decisionTimeMs: entry.decisionTimeMs == null ? null : entry.decisionTimeMs,
            completionTimeMs: accepted && entry.completionTimeMs != null ? entry.completionTimeMs : null,
            completedInTime: accepted && entry.completedInTime === true,
            practice: !!entry.practice
        });
        if (entry.completedInTime && !entry.practice) this.totalPoints += entry.rewardAmount;
        this.storeAllData(false);
    }

    recordOpenResponses(responses) {
        const next = emptyOpenResponses();
        OPEN_RESPONSE_FIELDS.forEach((field) => {
            next[field] = responses && responses[field] ? String(responses[field]) : "";
        });
        this.openQuestions = next;
        clearTimeout(this.responseTimer);
        this.responseTimer = setTimeout(() => this.storeAllData(false), 800);
    }

    markQuestionsReached() {
        if (this.questionsMarked) return;
        this.questionsMarked = true;
        this.recordTimestamp("questions_reached");
        this.storeAllData(false);
    }

    complete() {
        clearTimeout(this.responseTimer);
        this.completionRequested = true;
        this.recordTimestamp("experiment_completed");
        return this.storeAllData(true);
    }

    recordTimestamp(eventName) {
        this.experimentData.timeStamps.push({
            type: eventName,
            time: Math.round((Date.now() - this.startTime) / 1000)
        });
    }

    async writeSessionClaim(experimentCompleted) {
        if (!this.experimentData.pid || !window.saveToFirebase || !window.SESSION_CLAIM_COLLECTION) {
            return false;
        }
        const payload = {
            pid: this.experimentData.pid,
            expCode: this.getExpFolderName(),
            activeSessionId: this.experimentData.sessionId,
            attemptDocId: this.attemptDocId,
            experimentCompleted: experimentCompleted === true,
            updatedAt: new Date().toISOString()
        };
        try {
            localStorage.setItem(localSessionKey(this.experimentData.pid), JSON.stringify({
                expCode: payload.expCode,
                sessionId: payload.activeSessionId,
                experimentCompleted: payload.experimentCompleted,
                updatedAt: payload.updatedAt,
                sessionRestartCount: this.experimentData.sessionRestartCount || 0,
                assignment: {
                    cast: this.experimentData.cast,
                    trialsByBlock: this.experimentData.trialsByBlock
                }
            }));
        } catch (error) { /* private mode / quota */ }
        return window.saveToFirebase(window.SESSION_CLAIM_COLLECTION, this.experimentData.pid, payload);
    }

    storeAllData(experimentCompleted) {
        const completed = experimentCompleted === true;
        if (!completed && this.completionRequested) return this.saveChain;

        this.experimentData.totalDuration = Math.round((Date.now() - this.startTime) / 1000);
        this.experimentData.totalPoints = this.totalPoints;
        this.experimentData.trials = this.trials;
        this.experimentData.openQuestions = this.openQuestions;
        this.experimentData.attemptDocId = this.attemptDocId;
        if (completed) this.experimentData.experimentCompleted = true;

        let payload;
        try {
            payload = JSON.parse(JSON.stringify(this.experimentData));
        } catch (error) {
            console.error("Could not snapshot experiment data", error);
            if (completed) this.experimentData.experimentCompleted = false;
            return Promise.resolve(false);
        }
        // Keep the leave-page warning up until the completed write lands.
        if (completed) this.experimentData.experimentCompleted = false;

        const folder = this.getExpFolderName();
        const docName = this.attemptDocId
            || (this.experimentData.pid
                ? (this.experimentData.pid + "__" + (this.experimentData.sessionId || this.startTime))
                : ("NO_PID_" + this.startTime));
        const pid = this.experimentData.pid;

        const run = async () => {
            console.log("Storing data...");
            let ok = false;
            try {
                ok = window.saveToFirebase
                    ? await window.saveToFirebase(folder, docName, payload)
                    : false;
                if (!window.saveToFirebase) console.warn("Firebase helpers missing; data kept in memory only");
            } catch (error) {
                console.error(error);
                ok = false;
            }
            if (completed && ok) {
                this.experimentData.experimentCompleted = true;
                this.refreshGuardArmed = false;
                if (pid) {
                    try {
                        await this.writeSessionClaim(true);
                    } catch (error) {
                        console.error(error);
                    }
                }
            } else if (completed) {
                this.refreshGuardArmed = true;
            }
            return ok;
        };

        this.saveChain = this.saveChain.then(run, run);
        return this.saveChain;
    }

    installRefreshGuard() {
        window.addEventListener("beforeunload", (event) => {
            if (!this.refreshGuardArmed) return;
            if (this.experimentData.experimentCompleted) return;
            event.preventDefault();
            event.returnValue = "";
        });
    }
}

function waitForFirebaseSessionHelpers(timeoutMs) {
    const limit = timeoutMs || 8000;
    const start = Date.now();
    return new Promise((resolve) => {
        function poll() {
            if (typeof window.resolveParticipantSessionClaim === "function") {
                resolve(true);
                return;
            }
            if (Date.now() - start > limit) {
                console.warn("Firebase session helpers not ready; session lock may be inactive this load");
                resolve(false);
                return;
            }
            setTimeout(poll, 40);
        }
        poll();
    });
}

function showStudyCompletedScreen(message) {
    const overlay = document.createElement("div");
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

    const card = document.createElement("div");
    card.style.cssText = [
        "max-width:640px",
        "width:100%",
        "background:#fff",
        "border:1px solid #d7d2c8",
        "padding:36px 40px",
        "line-height:1.5"
    ].join(";");

    const title = document.createElement("h1");
    title.textContent = "Study already completed";
    title.style.cssText = "margin:0 0 16px 0;font-size:28px;font-weight:700;";

    const body = document.createElement("p");
    body.textContent = message || "You have already completed this study.";
    body.style.cssText = "margin:0;font-size:18px;";

    card.appendChild(title);
    card.appendChild(body);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
}
