// Editable experiment design. One block is one day. The day ends when enough harvests
// have been accepted. Each offer draws a reward level and a social condition separately.

const StimulusSettings = {
    // Firestore collection for attempt documents. Claims live in {code}_claims.
    experimentCode: "social_dm",
    trialTimeoutMs: 10000,
    // Waiting screen before an offer is presented.
    daySearchText: "Searching for trees with ripe apples",

    // Medal values. The legend lists these, and each day's reward weights refer to these names.
    rewardLevels: {
        low: 5,
        medium: 10,
        high: 20
    },

    // One entry per day. dayLength is how many accepted harvests fill the sun's path.
    // Each offer draws a reward and a social condition independently, then combines them.
    // Because the reward roll does not depend on the condition, alone and cooperation-optional
    // offers have the same mix of 5-, 10-, and 20-point harvests.
    // Weights are percentages. If a table does not sum to 100 it is rescaled, and the console warns.
    blocks: [
        {
            dayLength: 15,
            // High offers are almost always taken and low offers almost always refused,
            // so most of the day is the medium reward, where the choice still varies.
            rewardWeights: {
                low: 15,
                medium: 70,
                high: 15
            },
            // Alone and cooperation-optional are the matched pair (same apple height).
            // Cooperation-required stays in the day, at half that rate, because those apples are up high.
            conditionWeights: {
                alone: 40,
                "cooperation-optional": 40,
                "cooperation-required": 20
            }
        }
    ],

    // One guided cooperation-required trial, played before the offers of the first block.
    // It does not spend a step of the day's trial budget. A successful practice adds its reward.
    practiceTrial: {
        enabled: true,
        rewardAmount: 10
    },

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
        "Before you accept or reject you will get some information for each offer. Specifically, 3 pieces of information: the amount of points earned for the task, where are the apples, and whether your partner participates in this harvest."
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

const weightWarningsShown = {};

function weightedPick(weights, label, known) {
    const entries = [];
    let total = 0;
    Object.keys(weights || {}).forEach((name) => {
        if (known && !known[name]) throw new Error(label + " uses an unknown name: " + name);
        const weight = Number(weights[name]);
        if (!isFinite(weight) || weight < 0) {
            throw new Error(label + " for " + name + " must be a number that is zero or above.");
        }
        if (weight === 0) return;
        entries.push({ name: name, weight: weight });
        total += weight;
    });
    if (!entries.length) throw new Error(label + " has no positive weight.");
    if (Math.abs(total - 100) > 0.01) {
        const key = label + "|" + JSON.stringify(weights);
        if (!weightWarningsShown[key]) {
            weightWarningsShown[key] = true;
            console.warn(
                "\n%c  WARNING  %c " + label + " sum to " + total + ", not 100. " +
                "Treating these values as relative weights and rescaling them to 100.\n",
                "background:#b00020;color:#fff;font-size:22px;font-weight:800;padding:8px 14px;",
                "color:#b00020;font-size:16px;font-weight:700;"
            );
            console.warn(weights);
        }
    }
    let roll = Math.random() * total;
    for (let i = 0; i < entries.length; i++) {
        roll -= entries[i].weight;
        if (roll < 0) return entries[i].name;
    }
    return entries[entries.length - 1].name;
}

function drawRewardTrial(block) {
    const levels = StimulusSettings.rewardLevels;
    const rewardName = weightedPick(block.rewardWeights, "Reward weights", levels);
    const socialCondition = weightedPick(block.conditionWeights, "Social-condition weights", StimulusSettings.conditions);
    return {
        rewardAmount: levels[rewardName],
        socialCondition: socialCondition
    };
}
