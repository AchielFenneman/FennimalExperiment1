# Writing style

Distilled from three samples in `writing sample/`, for use when drafting the mentalizing supplement (and later the registered report). The samples were used for voice only. Their designs, numbers, and hypotheses are outdated and should not be carried into new text.

Sources, in order of weight for this project:

1. Fenneman & Lamm, registered report, “A Tale of Two Walks” — closest genre. Its expanded methods are the model for a supplement.
2. Fenneman & Lamm, “Retrieving non-cued episodic memories…” — same voice in a finished empirical paper (methods, results, discussion).
3. Fenneman, Malamut & Sanfey (2025), *Cognitive Psychology* — same voice, more theoretical. Useful for how an argument is opened and closed. Heavier coauthor presence, so weigh it less for sentence-level habits.

## Voice

Write in the first person plural. The paper is something we do: “In this work we propose…”, “Here we build on…”, “We next evaluated…”.

Three agents stay distinct:

- **We** design, predict, test, and interpret.
- **Participants** see, travel, select, recall, and earn stars. Call them participants.
- **The software** (or “the experiment software”) randomizes, checks, records, and matches responses. Give the software its own verbs when the procedure is automatic.

Name the paradigm the way the samples do. Participants travel to a fictive island called Fenneland and interact with fantasy animals, dubbed Fennimals. Introduce a coined term once, with “dubbed” or a short apposition, then use it without redefinition.

Prefer past tense for a completed experiment, including its supplement. The registered report’s main methods use future tense (“participants will travel”); its expanded methods switch to past tense (“participants travelled”). For the mentalizing supplement, follow the expanded methods and stay in the past.

## How a section moves

Open with the point of the section, then the procedure that serves it. A block is introduced by what it was designed to do, and only then by what happened on screen.

> The third block was designed to enhance the memorability of each Fennimal’s native region on the map and consisted of a single task.

Purpose clauses are explicit and usually fronted: “In order to prevent any confounding effects…”, “In order to minimize participant’s travel times…”, “To increase the probability that participants drew on their past experiences…”. State why a feature exists in the same sentence as the feature.

When a rule has a boundary, give the boundary immediately, in an “if / if not” pair.

> If the card was released on top of an incorrect region, then the card snapped back to its original position. If the card was released to its correct region, then it snapped to position within this box.

Gloss a technical term in the same sentence, with “that is,” or a parenthetical “i.e.,”.

> …whether the step occurred within the same region (i.e., did both names belong to Fennimals which resided in the same region of Fenneland)

Conceptual labels take single quotes (‘things that belong together’, ‘Safari animals’). Text the participant actually saw takes double quotes, including button labels and question wording (“Check answers”, “What is this Fennimal’s name?”).

## Sentences

Sentences are medium to long, and they carry one extra clause rather than breaking into a stack of short ones. Typical add-ons:

- a purpose clause (“in order to…”)
- a gloss (“that is,…”)
- a constraint (“with the limitation that…”, “such that…”)
- a short contrast (“whilst…”, “In contrast,…”, “Conversely,…”)

“Whilst” and “while” both appear. “Whilst” is the more characteristic connector inside a methods sentence (“Fennimals A and B were encountered in the same region, whilst Fennimals B and C shared the same head”). “While” is fine at the start of a concession (“While maintaining focus on the experiment…”).

Contrasts are staged, not tossed in as a single “not X but Y”. The samples set up two positions and then say what the present work does: “On the one hand… On the other hand…”, “This stands in contrast to…”, “Conversely,…”. Use that shape when distinguishing a prediction, a treatment, or an alternative account. In ordinary procedural prose, describe the thing that happened and leave the contrast out.

Rhetorical questions open an argument (“But how do these systems interact…?”) and are answered in the next sentence. They belong in the introduction and discussion. A supplement stays declarative.

Favourites that are part of the voice, used sparingly: “as a starting point”, “in this work”, “here we”, “key trials of interest”, “on a between-subjects basis”, “did not reach statistical significance”, “unlikely to be the result of chance alone”.

Do not copy recurrent slips from the drafts (misspelled Levenshtein, “to incentive”, “conformation” for confirmation, mismatched “was/were”). Match the constructions, not the typos.

## Spelling

The samples mix forms. Keep the mix:

- British: travelled, whilst, towards
- American: behavior, color, randomized, color-scheme

Hyphenate design terms: between-subjects, training-phase, cued-recall, one-sided, dead-end. Compound contrasts often take hyphens too (narrow-but-rich, wide-but-austere).

Numbers: digits for counts, durations, and proportions (16 Fennimals, 4 regions, 0.10 USD, 64%). Percentages sit next to the count when both matter (“1.92 out of 3 trials (64%)”). Ages are means with SD. Experiment duration is the median. *p* values have no leading zero (*p* = .008, *p* < .001).

## Methods and supplements

The main methods are an overview. They name the phases, the manipulation, and the reason each phase exists, and they point to the supplement for the full procedure.

The supplement is organized in time, under plain headings:

1. Materials (the island, the creatures, how an interaction works)
2. Procedure, one phase or block at a time
3. Between-subjects randomization, after the procedure, as its own section
4. Anything analytic (preprocessing, tests, simulations) only after the procedure is done

Each phase gets a purpose sentence, then the sequence the participant went through, then what the software checked or stored. Describe the screen at the grain of the psychological event: what was shown, what the participant had to do, what counted as success or failure, and what was recorded. Quote on-screen wording when the wording is part of the manipulation or the measure.

The registered-report supplement sometimes continues down to individual button labels, pixel-level success rules, and sound effects. For the mentalizing supplement, stop one step above that. Include a timing, a threshold, or a label when it changes what the participant experienced or what the data contain. Leave the rest to the released code.

A procedure paragraph walks forward. It does not list implementation objects, function names, or parameter keys.

## Randomization

Describe a randomization as an ordered series of draws, in the order the software made them. For each draw, say:

- what was drawn from
- whether sampling was with or without replacement
- what was held fixed
- any constraint (“with the limitation that two main trials could not be presented back-to-back”)
- the reason, when it is not obvious (“to prevent any confounding effects of the stimuli”, “to minimize the visual complexity”)

“On a between-subjects basis” means the draw was made once at the start and then kept for that participant. Within-block or within-trial shuffles are described separately, and the constraint that makes them pseudo-random is stated in the same sentence.

Name the resulting groups in plain language (‘Safari-Halloween’, baseline versus partial-dead-end) rather than by internal labels.

## Figures

Figures are cited in the sentence that needs them, as Figure 5A or Figure S3E. Captions are written so they can stand alone. They open with a title phrase, then walk the panels in order. Each panel starts with its letter.

> Figure S3: interaction with a single Fennimal during the training phase. A: at the start of each block…

Panel captions use the same past tense and the same purpose clauses as the body. A caption may repeat a procedural point that the body also states. Example stimuli are introduced as examples, with an explicit note that assignment was randomized between subjects.

## Results

Lead with the finding, then the number, then the test.

> Participants on average selected toy b in 1.92 out of 3 trials (64%, SD = 0.87). We conducted a permutation test… The results of this permutation suggest that our results are unlikely to be the result of chance alone (one-sided permuted *p* < .001).

A permutation test is described by what was held fixed and what was shuffled, then by the comparison to the simulated distribution. Predictions about order or frequency are tested against a chance process that preserves the observed constraints (same participants, same number of recalls, labels or order shuffled). Say “one-sided permuted *p*” when the test is one-sided.

Sample descriptions come before the inferential results: how many completed the experiment, how many were removed and by which criterion, then age (mean and SD), gender as percentages, and median time to complete.

When a control analysis speaks against an alternative account, say so in that shape: we did not observe evidence that the result was driven by a difference in memorability. Report the robustness check in one sentence (“All reported main results are robust to…”).

## Discussion

Restate the question the introduction asked, then say what the results support. Place the finding against the alternative the design was built to distinguish. Close a theoretical section by saying what the result offers for a neighboring literature, and mark speculation as such (“future research is needed”, “putatively”). Keep the constraints on generality in their own short section: duration, number of stimuli, and which cognitive processes the design does not speak to.

## What this file is for

Use it to match rhythm, agents, headings, and the grain of procedural detail. Do not use the sample papers as a source for the mentalizing design. That design is whatever the current experiment code implements.
