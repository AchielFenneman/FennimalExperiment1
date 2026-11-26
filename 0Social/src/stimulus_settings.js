// Editable experiment design. One block is one day. The day ends when enough harvests
// have been accepted. Each day has a fixed offer set, shuffled at the start of the experiment.

const StimulusSettings = {
    // Firestore collection for attempt documents. Claims live in {code}_claims.
    experimentCode: "social_dm",
    trialTimeoutMs: 10000,
    // Waiting screen before an offer is presented.
    daySearchText: "Searching for trees with ripe apples",

    // Medal values. The legend lists these, and each day's reward counts refer to these names.
    rewardLevels: {
        low: 5,
        medium: 10,
        high: 20
    },

    // One entry per day. dayLength is how many accepted harvests fill the sun's path.
    // rewardCounts is how often each reward appears for every social condition.
    // The offer set crosses that profile with alone, cooperation-required, and
    // cooperation-optional, so the three trial types are equally common and share
    // the same rewards. That set is shuffled once per day at the start of the experiment.
    // A rejected offer spends a place in the set and does not fill the day. When the
    // set runs out first, it is shuffled again and presented from the start.
    blocks: [
        {
            dayLength: 15,
            // One 20, three 10s, and one 5 for each of the three conditions: 15 offers.
            rewardCounts: {
                high: 1,
                medium: 3,
                low: 1
            }
        }
    ],

    // One guided cooperation-required trial, played before the offers of the first block.
    // It does not spend a step of the day's trial budget. A successful practice adds its reward.
    practiceTrial: {
        enabled: true,
        rewardAmount: 10
    },

    // Taken off the point total each time an offer is rejected. The first offer points this out.
    rejectCost: 1,

    conditions: {
        alone: { apples: "middle_apple", swatch: "#e23b3b" },
        "cooperation-required": { apples: "upper_apple", swatch: "#2f6fed" },
        "cooperation-optional": { apples: "middle_apple", swatch: "#2f9e4f" }
    },

    // Completion code: one word from each list, then the bonus in cents.
    // HappyCat15 is a bonus of $0.15. The cents keep the code a plain number, as in Fennimals.
    completionCodeWords: {
        first: ["Happy", "Bright", "Clean", "Soft", "Warm", "Kind", "Sweet"],
        second: ["Cat", "Rabbit", "Owl", "Fox", "Koala", "Frog", "Panda"]
    },

    partnerNames: {
        male: ["Liam", "Matt", "Oliver", "James", "John"],
        female: ["Mary", "Jenn", "Linda", "Susan", "Sarah"]
    },

    characterPresets: {
        type: {
            label: "Gender",
            options: { male: "male", female: "female" }
        },
        skin_color: {
            label: "Skin color",
            options: { A: "#8d5524", B: "#e0ac69", C: "#f1c27d", D: "#ffdbac" }
        },
        hair_color: {
            label: "Hair color",
            options: { A: "#fde8b6", B: "#c37c56", C: "#8a6030", D: "#341f0a" }
        },
        outfit: {
            label: "Outfit",
            options: {
                A: { shirt: "#fef4f7", jacket: "#258522", lapel: "#2c432b", pants: "#5d655e", shoes: "#5d1506" },
                B: { shirt: "#e0e9f5", jacket: "#8a508d", lapel: "#642367", pants: "#ac9d93", shoes: "#784421" },
                C: { shirt: "#ffcc00", jacket: "#d68b00", lapel: "#d63e00", pants: "#63a2d5", shoes: "#784421" },
                D: { shirt: "#272626", jacket: "#aa0000", lapel: "#4d2413", pants: "#6d7d89", shoes: "#000000" }
            }
        }
    }
};

// Classic scripts do not share lexical bindings with the Firebase module.
window.EXPERIMENT_CODE = StimulusSettings.experimentCode;

function partnerIntroText(name) {
    return name + " will be your partner for this experiment";
}

function bonusRateText() {
    const rate = GenParam.bonusExchange;
    return bonusMoneyText(rate.dollars) + " per " + rate.points + " earned points";
}

function bonusMoneyText(dollars) {
    return Number(dollars).toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
}

function instructionsParagraphs(blockCount, partner) {
    const count = blockCount || 1;
    const dayWord = count === 1 ? "day" : "days";
    const during = count === 1 ? "During this day" : "During these days";
    const seconds = Math.round(StimulusSettings.trialTimeoutMs / 1000);
    const secondWord = seconds === 1 ? "second" : "seconds";
    const subject = partner.gender === "female" ? "She" : "He";
    const pronoun = partner.gender === "female" ? "she" : "he";
    return [
        "Your goal is to earn as many points as possible. You can earn points for each successful harvest. The number of points you collect throughout the experiment determines your bonus - so the more you harvest, the more you get paid. You will earn a bonus of " + bonusRateText() + ".",
        "The task lasts " + count + " " + dayWord + ". " + during + " you will harvest apples.",
        "Each harvest has to be completed in " + seconds + " " + secondWord + ": this means you need to drag the ladder and pick the apples before the time runs out. If you take longer than " + seconds + " " + secondWord + ", the harvest fails, and you don't earn a reward.",
        partner.name + " will assist you during the harvest. " + subject + " will happily help you whenever " + pronoun + " is available.",
        "Before you accept or reject you will get some information for each offer. Specifically, 3 pieces of information: the amount of points earned for the task, where are the apples, and whether your partner participates in this harvest. " + rejectCostSentence()
    ];
}

function rewardLegendText(points) {
    return "This task offers a reward of " + points + " points.";
}

function appleLegendText(row) {
    if (row === "upper") {
        return "The apples are up high, but your partner will help you reach them.";
    }
    return "These apples are in the middle of the tree, you can reach them by climbing on the ladder.";
}

function partnerLegendText(name, helping) {
    if (helping) return name + " will participate in this harvest.";
    return "There's a strong wind blowing. " + name + " can't help you pick the apples, and you have to wait a short while to let the wind die down.";
}

function dayClockBubbleText() {
    return "Accepted harvests take time. Each one you accept moves the day forward, whether you finish it in time or run out of time.";
}

function rejectCostSentence() {
    const cost = StimulusSettings.rejectCost;
    const word = cost === 1 ? "point" : "points";
    return "Rejecting an offer costs " + cost + " " + word + ".";
}

function offerBubbleText(partnerName, trial) {
    const upper = trial.socialCondition === "cooperation-required";
    const helping = trial.socialCondition !== "alone";
    return {
        intro: "This is the offer screen. Accept or reject.",
        reward: "This medal is the reward for finishing the harvest in time. Those points are added to your total.",
        apples: upper
            ? "The apples are up high. " + partnerName + " will pull a branch down so you can reach them."
            : "The apples are in the middle of the tree. You can reach them by climbing the ladder.",
        partner: helping
            ? partnerName + " will take part in this harvest."
            : "A strong wind is blowing, so " + partnerName + " can't help you. You have to wait a short while for the wind to die down.",
        reject: rejectCostSentence() + " That cost is taken off your total."
    };
}

function practiceBubbleText(partnerName) {
    return {
        time: "Let's try one practice task. This circle shows the time you have left. If it runs out before you finish, you do not earn the reward.",
        reward: "This medal is the reward for picking all the apples in time. Those points are added to your total.",
        total: "This is the total points you have earned during the experiment.",
        partner: "This is " + partnerName + ". These apples are up high, so you need " + partnerName + " to pull a branch down before you can reach them.",
        ladder: "First, walk to your ladder with A and D, then hold space to drag it over to the tree.",
        apples: "Then click each apple to pick it."
    };
}

// One copy of the day's offer set, before it is shuffled. Each condition gets
// the same reward profile, so the set size is the profile length times three.
function buildDayTrialSet(block, dayNumber) {
    const dayLabel = dayNumber ? "Day " + dayNumber : "A day";
    const levels = StimulusSettings.rewardLevels;
    const counts = block && block.rewardCounts;
    if (!counts) throw new Error(dayLabel + " is missing reward counts.");
    const conditions = Object.keys(StimulusSettings.conditions);
    if (!conditions.length) throw new Error("No social conditions are defined.");

    const profile = [];
    Object.keys(counts).forEach((name) => {
        if (!Object.prototype.hasOwnProperty.call(levels, name)) {
            throw new Error(dayLabel + " counts an unknown reward: " + name);
        }
        const count = Number(counts[name]);
        if (!isFinite(count) || count < 0 || Math.floor(count) !== count) {
            throw new Error(dayLabel + " count for " + name + " must be a whole number that is zero or above.");
        }
        for (let i = 0; i < count; i++) profile.push(levels[name]);
    });
    if (!profile.length) throw new Error(dayLabel + " reward counts produce an empty set.");

    const trials = [];
    conditions.forEach((socialCondition) => {
        profile.forEach((rewardAmount) => {
            trials.push({
                rewardAmount: rewardAmount,
                socialCondition: socialCondition
            });
        });
    });
    return trials;
}

function trialKey(trial) {
    return trial && trial.rewardAmount + "|" + trial.socialCondition;
}

function sameTrialMultiset(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    const counts = {};
    left.forEach((trial) => {
        const key = trialKey(trial);
        counts[key] = (counts[key] || 0) + 1;
    });
    for (let i = 0; i < right.length; i++) {
        const key = trialKey(right[i]);
        if (!counts[key]) return false;
        counts[key] -= 1;
    }
    return true;
}

// True when the saved order is one shuffled copy of each day's current set.
function trialOrderMatchesSettings(order) {
    const blocks = StimulusSettings.blocks;
    if (!Array.isArray(order) || order.length !== blocks.length) return false;
    return blocks.every((block, index) => sameTrialMultiset(order[index], buildDayTrialSet(block, index + 1)));
}
