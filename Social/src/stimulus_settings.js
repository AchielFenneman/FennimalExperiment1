// Editable experiment design. One block is every reward crossed with every social condition, shuffled per participant.
// The instructions call each block a day.

const StimulusSettings = {
    // Firestore collection for attempt documents. Claims live in {code}_claims.
    experimentCode: "social_dm",
    trialTimeoutMs: 10000,
    blockCount: 1,
    rewards: [5, 10, 20],

    // One guided cooperation-required trial, played before the offers of the first block.
    practiceTrial: {
        enabled: true,
        rewardAmount: 10
    },

    conditions: {
        alone: { apples: "middle_apple", swatch: "#e23b3b" },
        "cooperation-required": { apples: "upper_apple", swatch: "#2f6fed" },
        "cooperation-optional": { apples: "middle_apple", swatch: "#2f9e4f" }
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

function instructionsParagraphs(blockCount, partner) {
    const count = blockCount || 1;
    const dayWord = count === 1 ? "day" : "days";
    const during = count === 1 ? "During this day" : "During these days";
    const seconds = Math.round(StimulusSettings.trialTimeoutMs / 1000);
    const secondWord = seconds === 1 ? "second" : "seconds";
    const subject = partner.gender === "female" ? "She" : "He";
    const pronoun = partner.gender === "female" ? "she" : "he";
    return [
        "The task lasts " + count + " " + dayWord + ". " + during + " you will harvest apples.",
        "Each harvest has to be completed in " + seconds + " " + secondWord + ": this means you need to drag the ladder and pick the apples before the time runs out. If you take longer than " + seconds + " " + secondWord + ", the harvest fails, and you don't earn a reward.",
        partner.name + " will assist you during the harvest. " + subject + " will happily help you whenever " + pronoun + " is available.",
        "Before you accept or reject you will get some information for each offer. Specifically, 3 pieces of information: the amount of points earned for the task, where are the apples, and whether your partner participates in this harvest."
    ];
}

function rewardLegendText(points) {
    return "This task offers a reward of " + points + " points.";
}

function appleLegendText(row) {
    if (row === "upper") {
        return "The apples are up high, and you need some help from your partner to reach them.";
    }
    return "These apples are in the middle of the tree, you can reach them by climbing on the ladder.";
}

function partnerLegendText(name, helping) {
    if (helping) return name + " will participate in this harvest.";
    return name + " is not available.";
}

function practiceBubbleText(partnerName) {
    return {
        time: "Let's try one practice task. This circle shows the time you have left. If it runs out before you finish, you do not earn the reward.",
        reward: "This medal is the reward for picking all the apples in time. Points from this practice are not added to your total.",
        partner: "This is " + partnerName + ". These apples are up high, so you need " + partnerName + " to pull a branch down before you can reach them.",
        ladder: "First, walk to your ladder with A and D, then hold space to drag it over to the tree.",
        apples: "Then click each apple to pick it."
    };
}

function buildTrialList() {
    const trials = [];
    StimulusSettings.rewards.forEach((rewardAmount) => {
        Object.keys(StimulusSettings.conditions).forEach((socialCondition) => {
            trials.push({ rewardAmount: rewardAmount, socialCondition: socialCondition });
        });
    });
    return shuffle(trials);
}
