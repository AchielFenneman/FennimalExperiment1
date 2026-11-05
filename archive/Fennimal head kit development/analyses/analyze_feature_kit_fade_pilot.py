"""
Feature-kit fade sitting analysis (overlay-fade dominance).

Reads an admin dump (feature_kit_fade_pilot_all_data.json).
Coverage is 3 family pairs × (4 same-slot 1v1 + 6 cross-slot 1v1 × 2 polarities)
= 12 + 36 paid, plus 2 practice and 3 catch (53 total). Mix is overlay-fade at 50.

Block S (single): both parents' token of one unique slot; others baseline.
  Far from 50 → that family's token of this slot is louder.

Block C (cross): one unique slot from A vs a different unique slot from B.
  Far from 50 → that slot beats the other slot.

Primary sample is catch-pass plus QC (side bias, very fast RT, short session,
floor-hugging). Pass --no-qc to skip speed/side cuts (catch floor still applies).

Usage:
  python analyze_feature_kit_fade_pilot.py
  python analyze_feature_kit_fade_pilot.py path/to/feature_kit_fade_pilot_all_data.json
  python analyze_feature_kit_fade_pilot.py --no-qc
  python analyze_feature_kit_fade_pilot.py --json out.json
"""
from __future__ import annotations

import json
import math
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

DEFAULT_DUMP = Path.home() / "Downloads" / "feature_kit_fade_pilot_all_data.json"
SLOT = {
    "ear": "Ears",
    "eye": "Eyes",
    "lowerFace": "Mouth",
    "stamp": "Stamp",
}
SLOTS = ["ear", "eye", "lowerFace", "stamp"]
PAIRS = ["H1H2", "H1H3", "H2H3"]
FAMILY = {"H1": "mechanical", "H2": "sweet", "H3": "sea"}
PAIR_FAMILIES = {
    "H1H2": ("mechanical", "sweet"),
    "H1H3": ("mechanical", "sea"),
    "H2H3": ("sweet", "sea"),
}
CROSS_UNORDERED = [
    ("ear", "eye"),
    ("ear", "lowerFace"),
    ("ear", "stamp"),
    ("eye", "lowerFace"),
    ("eye", "stamp"),
    ("lowerFace", "stamp"),
]
WANT_N = 53
WANT_SINGLE = 12
WANT_CROSS = 36
WANT_CATCH = 3
WANT_PRAC = 2
WANT_QUEUE = 4


def wilson(k, n, z=1.96):
    if n <= 0:
        return None
    p = k / n
    z2 = z * z
    den = 1 + z2 / n
    centre = (p + z2 / (2 * n)) / den
    half = z * math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / den
    return {
        "k": int(k),
        "n": int(n),
        "p": p,
        "lo": max(0.0, centre - half),
        "hi": min(1.0, centre + half),
    }


def mean(xs):
    xs = [x for x in xs if isinstance(x, (int, float))]
    return statistics.mean(xs) if xs else None


def sd(xs):
    xs = [x for x in xs if isinstance(x, (int, float))]
    return statistics.pstdev(xs) if len(xs) >= 2 else None


def median(xs):
    xs = [x for x in xs if isinstance(x, (int, float))]
    return statistics.median(xs) if xs else None


def fmt(w):
    if not w:
        return "-"
    return f"{round(w['p']*100)}% ({w['k']}/{w['n']})  CI {round(w['lo']*100)}-{round(w['hi']*100)}"


def as_list(value):
    if value is None:
        return []
    if isinstance(value, dict) and "values" in value:
        return as_list(value.get("values"))
    if isinstance(value, list):
        return value
    return [value]


def answers_of(doc):
    fade = (doc.get("featureKitFadeResults") or {}).get("answers") or []
    if fade:
        return fade
    prog = (doc.get("featureKitPilotProgress") or {}).get("answers") or []
    if prog:
        return prog
    stored = doc.get("storedData") or []
    if stored and isinstance(stored[0], dict):
        return stored[0].get("answers") or stored[0].get("Data") or []
    return []


def is_dev(doc):
    pid = doc.get("pid")
    if pid in (False, None, ""):
        return True
    pid = str(pid)
    if pid.startswith("NO_PID") or pid.startswith("seed_"):
        return True
    return False


def family_of_parent(row, parent):
    hid = row.get("head_a_id") if parent == "A" else row.get("head_b_id")
    return FAMILY.get(hid)


def chosen_family(row):
    return family_of_parent(row, "A" if row.get("chose_a") else "B")


def qc_reasons(rec):
    """QC on top of catch >= 2/3.

    1100 ms is 350 ms above the 750 ms response lock. 120 s is a speed-run
    of the session clock (instructions + 53 trials). Floor-hug is >=12/48
    duels at <=850 ms. Side bias is P(F) >= 80% or <= 20% on 48 duels.
    """
    reasons = []
    if not rec.get("pass_catch"):
        reasons.append("catch<2/3")
    f = rec.get("p_f")
    if f is not None and (f >= 0.80 or f <= 0.20):
        reasons.append("side-bias")
    if rec.get("med_rt") is not None and rec["med_rt"] < 1100:
        reasons.append("medRT<1100")
    if rec.get("duration_s") is not None and rec["duration_s"] < 120:
        reasons.append("dur<120s")
    if rec.get("n_floor850", 0) >= 12:
        reasons.append("floor-hug")
    return reasons


def validate_row(row):
    issues = []
    if row.get("kind") != "duel":
        return issues
    if row.get("mixTowardA") != 0.5:
        issues.append("mix!=0.5")
    live_a = as_list(row.get("live_slots_a"))
    live_b = as_list(row.get("live_slots_b"))
    if len(live_a) != 1 or len(live_b) != 1:
        issues.append(f"n_live {len(live_a)}:{len(live_b)}")
    probe = row.get("probe") or {}
    if not probe.get("overlayFade"):
        issues.append("probe not overlayFade")
    rec_a = probe.get("recipeA") or {}
    rec_b = probe.get("recipeB") or {}
    for slot in SLOTS:
        a_tok = rec_a.get(slot)
        b_tok = rec_b.get(slot)
        if slot in live_a:
            if a_tok in (None, "none"):
                issues.append(f"A live {slot} none")
        elif a_tok not in (None, "none"):
            issues.append(f"A extra {slot}={a_tok}")
        if slot in live_b:
            if b_tok in (None, "none"):
                issues.append(f"B live {slot} none")
        elif b_tok not in (None, "none"):
            issues.append(f"B extra {slot}={b_tok}")
    if row.get("chose_a") != (row.get("selected_parent") == "A"):
        issues.append("chose_a mismatch")
    block = row.get("fade_block")
    if block == "single":
        if live_a != live_b or (live_a and live_a[0] != row.get("only_slot")):
            issues.append("single live mismatch")
        if row.get("polarity") not in (None,):
            issues.append("single has polarity")
    elif block == "cross":
        pair = tuple(sorted((row.get("slot_x"), row.get("slot_y"))))
        if pair not in {tuple(sorted(p)) for p in CROSS_UNORDERED}:
            issues.append(f"bad cross pair {pair}")
        if live_a == live_b:
            issues.append("cross same live")
        if row.get("polarity") not in (0, 1):
            issues.append("cross missing polarity")
    else:
        issues.append(f"bad fade_block {block}")
    return issues


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--") and a != "json"]
    json_dest = None
    if "--json" in sys.argv:
        json_at = sys.argv.index("--json")
        json_dest = sys.argv[json_at + 1] if json_at + 1 < len(sys.argv) else None
        args = [a for a in args if a != json_dest]
    path = Path(args[0]) if args else DEFAULT_DUMP
    docs = json.loads(path.read_text(encoding="utf-8"))
    paid_docs = [d for d in docs if not is_dev(d)]
    completed = [d for d in paid_docs if d.get("experimentCompleted") is True]
    incompletes = [d for d in paid_docs if d.get("experimentCompleted") is not True]
    local = [d for d in docs if is_dev(d)]

    people = []
    issues = []
    singles = []
    crosses = []
    catch = []
    prac = []

    for d in completed:
        pid = d.get("pid")
        answers = answers_of(d)
        meta = d.get("featureKitFadeResults") or d.get("featureKitPilotProgress") or {}
        kinds = Counter(r.get("kind") for r in answers)
        blocks = Counter(r.get("fade_block") for r in answers if r.get("kind") == "duel")
        n_duel = kinds.get("duel", 0)
        n_catch = kinds.get("catch", 0)
        n_prac = kinds.get("practice", 0)
        if (
            n_duel != WANT_SINGLE + WANT_CROSS
            or n_catch != WANT_CATCH
            or n_prac != WANT_PRAC
            or len(answers) != WANT_N
        ):
            issues.append(f"{pid}: trial mix {dict(kinds)} blocks {dict(blocks)} n={len(answers)}")
        if meta.get("queue_version") != WANT_QUEUE:
            issues.append(f"{pid}: queue_version {meta.get('queue_version')}")
        if meta.get("planned_count") != WANT_N:
            issues.append(f"{pid}: planned_count {meta.get('planned_count')}")

        catch_rows = [r for r in answers if r.get("kind") == "catch"]
        catch_ok = sum(1 for r in catch_rows if r.get("catch_correct") is True)
        prac_rows = [r for r in answers if r.get("kind") == "practice"]
        prac_ok = sum(1 for r in prac_rows if r.get("catch_correct") is True)
        duel_rows = [r for r in answers if r.get("kind") == "duel"]
        single_rows = [r for r in duel_rows if r.get("fade_block") == "single"]
        cross_rows = [r for r in duel_rows if r.get("fade_block") == "cross"]
        pair_n = Counter(r.get("pair_id") for r in duel_rows)
        if any(pair_n.get(p, 0) != 16 for p in PAIRS):
            issues.append(f"{pid}: pair counts {dict(pair_n)}")
        slot_single = Counter(r.get("only_slot") for r in single_rows)
        if any(slot_single.get(s, 0) != 3 for s in SLOTS):
            issues.append(f"{pid}: single slot counts {dict(slot_single)}")
        cross_cells = Counter((r.get("pair_id"), r.get("slot_x"), r.get("slot_y")) for r in cross_rows)
        if len(cross_cells) != WANT_CROSS or any(v != 1 for v in cross_cells.values()):
            issues.append(f"{pid}: cross cells {len(cross_cells)}")

        row_issues = []
        for r in duel_rows:
            row_issues.extend(validate_row(r)[:1])
        if row_issues:
            issues.append(f"{pid}: row issues {Counter(row_issues)}")

        rts = [r.get("reaction_time_ms") for r in duel_rows]
        rec = {
            "pid": pid,
            "n": len(answers),
            "catch_ok": catch_ok,
            "n_catch": n_catch,
            "prac_ok": prac_ok,
            "pass_catch": catch_ok >= 2,
            "p_a": (
                sum(1 for r in duel_rows if r.get("chose_a")) / len(duel_rows)
                if duel_rows else None
            ),
            "p_f": (
                sum(1 for r in duel_rows if r.get("selected_key") == "F") / len(duel_rows)
                if duel_rows else None
            ),
            "med_rt": median(rts),
            "n_floor850": sum(1 for t in rts if isinstance(t, (int, float)) and t <= 850),
            "n_late": sum(1 for r in duel_rows if r.get("late")),
            "n_click": sum(1 for r in answers if r.get("response_mode") == "click"),
            "duration_s": d.get("totalDuration"),
            "exp": d.get("expCode"),
            "queue": meta.get("queue_version"),
            "questionnaire": bool(d.get("questionnaire")),
            "_singles": single_rows,
            "_crosses": cross_rows,
            "_catch": catch_rows,
        }
        rec["qc"] = qc_reasons(rec)
        people.append(rec)
        for r in catch_rows:
            row = dict(r)
            row["_pid"] = pid
            catch.append(row)
        for r in prac_rows:
            row = dict(r)
            row["_pid"] = pid
            prac.append(row)

    skip_qc = "--no-qc" in sys.argv
    catch_pass = [p for p in people if p["pass_catch"]]
    fail = [p for p in people if not p["pass_catch"]]
    dropped = [p for p in catch_pass if p["qc"]]
    keep = catch_pass if skip_qc else [p for p in catch_pass if not p["qc"]]
    for p in keep:
        for r in p["_singles"]:
            row = dict(r)
            row["_pid"] = p["pid"]
            singles.append(row)
        for r in p["_crosses"]:
            row = dict(r)
            row["_pid"] = p["pid"]
            crosses.append(row)

    print(f"dump {path}")
    print(
        f"docs {len(docs)}  paid {len(paid_docs)}  completed {len(completed)}  "
        f"incomplete {len(incompletes)}  local {len(local)}"
    )
    print(f"catch-pass (>=2/3) {len(catch_pass)}  catch-fail {len(fail)}")
    print(
        f"QC keep {len(keep)}  QC drop {len(dropped)}"
        + ("  (--no-qc, catch-pass only)" if skip_qc else "")
    )
    print("issues", issues or "none")
    leftover = []
    for d in incompletes:
        ans = answers_of(d)
        leftover.append((d.get("pid"), len(ans), d.get("totalDuration")))
    if leftover:
        print("incomplete (excluded)", leftover)
    if fail:
        print("catch-fail", [(p["pid"], f"{p['catch_ok']}/{p['n_catch']}") for p in fail])
    if dropped and not skip_qc:
        print("QC drops:")
        for p in dropped:
            dur = f"{p['duration_s']/60:.1f} min" if p["duration_s"] else "-"
            print(
                f"  {p['pid']}  {','.join(p['qc'])}  "
                f"P(A) {p['p_a']*100:.0f}%  RT {p['med_rt']:.0f} ms  "
                f"F {p['p_f']*100:.0f}%  {dur}"
            )
    print()
    print("catch all completes", fmt(wilson(sum(1 for r in catch if r.get("catch_correct")), len(catch))))
    print("practice", fmt(wilson(sum(1 for r in prac if r.get("catch_correct")), len(prac))))
    print("median duel RT", f"{median([r.get('reaction_time_ms') for r in singles + crosses]):.0f} ms" if (singles or crosses) else "-")
    print("median duration", f"{median([p['duration_s'] for p in keep])/60:.1f} min" if keep else "-")
    print("P(choose A) QC keep", fmt(wilson(sum(1 for r in singles + crosses if r.get("chose_a")), len(singles) + len(crosses))))
    print("P(press F) QC keep", fmt(wilson(sum(1 for r in singles + crosses if r.get("selected_key") == "F"), len(singles) + len(crosses))))
    print()

    print("=== Person roster (completes) ===")
    print(f"  {'pid':12s} {'catch':5s} {'P(A)':6s} {'P(F)':6s} {'medRT':6s} {'dur':5s} qc")
    for p in people:
        flag = ",".join(p["qc"]) if p["qc"] else "ok"
        if p not in keep:
            flag = flag + "  [out]"
        dur = f"{p['duration_s']/60:.1f}" if p["duration_s"] else "-"
        print(
            f"  {str(p['pid']):12s} {p['catch_ok']}/{p['n_catch']}   "
            f"{p['p_a']*100:5.0f}% {p['p_f']*100:5.0f}%  {p['med_rt']:5.0f}  {dur:>4s}  {flag}"
        )
    print()

    print("=== Block S: P(choose first family of pair) by slot ===")
    print("  Same unique slot from both parents. 50 = matched loudness within the slot.")
    single_rows_out = []
    by_pair_slot = defaultdict(list)
    for r in singles:
        by_pair_slot[(r.get("pair_id"), r.get("only_slot"))].append(r)
    for pair in PAIRS:
        fam_a, fam_b = PAIR_FAMILIES[pair]
        print(f"  -- {pair}  {fam_a} vs {fam_b} --")
        for slot in SLOTS:
            rs = by_pair_slot.get((pair, slot), [])
            w = wilson(sum(1 for r in rs if r.get("chose_a")), len(rs))
            print(f"    {SLOT[slot]:6s}  {fmt(w)}")
            single_rows_out.append({
                "pair": pair,
                "slot": slot,
                "family_a": fam_a,
                "family_b": fam_b,
                "k": w["k"] if w else 0,
                "n": w["n"] if w else 0,
                "p": w["p"] if w else None,
                "lo": w["lo"] if w else None,
                "hi": w["hi"] if w else None,
            })
    print()

    print("=== Block S: P(choose family | family is on the trial) by slot ===")
    fam_slot = defaultdict(list)
    for r in singles:
        slot = r.get("only_slot")
        for parent, hid in (("A", r.get("head_a_id")), ("B", r.get("head_b_id"))):
            fam = FAMILY.get(hid)
            if not fam:
                continue
            chose = (parent == "A" and r.get("chose_a")) or (parent == "B" and not r.get("chose_a"))
            fam_slot[(fam, slot)].append(chose)
    family_slot_out = []
    for fam in ("mechanical", "sweet", "sea"):
        print(f"  -- {fam} --")
        for slot in SLOTS:
            xs = fam_slot.get((fam, slot), [])
            w = wilson(sum(1 for x in xs if x), len(xs))
            print(f"    {SLOT[slot]:6s}  {fmt(w)}")
            family_slot_out.append({
                "family": fam,
                "slot": slot,
                "k": w["k"] if w else 0,
                "n": w["n"] if w else 0,
                "p": w["p"] if w else None,
            })
    print()

    print("=== Block C: P(row slot beats column slot) ===")
    print("  Count-matched 1v1, both polarities pooled. 50 = same weight class.")
    win = defaultdict(int)
    nxy = defaultdict(int)
    for r in crosses:
        x = r.get("winner_slot")
        y = r.get("loser_slot")
        if not x or not y or x == y:
            continue
        win[(x, y)] += 1
        nxy[tuple(sorted((x, y)))] += 1
    print("         " + "  ".join(f"{SLOT[s]:^10s}" for s in SLOTS))
    pairwise = []
    for a in SLOTS:
        cells = []
        for b in SLOTS:
            if a == b:
                cells.append("     -     ")
                continue
            n = win[(a, b)] + win[(b, a)]
            w = wilson(win[(a, b)], n)
            cells.append(f"{round(w['p']*100):3d}% ({w['k']}/{w['n']})" if w else "     -     ")
            if SLOTS.index(a) < SLOTS.index(b):
                pairwise.append({
                    "a": a,
                    "b": b,
                    "k_a": win[(a, b)],
                    "n": n,
                    "p_a": (win[(a, b)] / n) if n else None,
                    "lo": w["lo"] if w else None,
                    "hi": w["hi"] if w else None,
                })
        print(f"  {SLOT[a]:6s} " + "  ".join(cells))
    print()

    print("=== Block C: P(slot wins | slot is on the probe) ===")
    slot_out = []
    for slot in SLOTS:
        rs = [r for r in crosses if slot in (r.get("slot_x"), r.get("slot_y"))]
        w = wilson(sum(1 for r in rs if r.get("winner_slot") == slot), len(rs))
        print(f"  {SLOT[slot]:6s}  {fmt(w)}")
        slot_out.append({
            "slot": slot,
            "k": w["k"] if w else 0,
            "n": w["n"] if w else 0,
            "p": w["p"] if w else None,
            "lo": w["lo"] if w else None,
            "hi": w["hi"] if w else None,
        })
    print()

    print("=== Block C: family token vs other family's other slot (both polarities) ===")
    # Mechanical ear vs sweet eye is a different cell from sweet ear vs mechanical eye.
    fam_cross = defaultdict(list)
    for r in crosses:
        fa = family_of_parent(r, "A")
        fb = family_of_parent(r, "B")
        sa = r.get("slot_x")
        sb = r.get("slot_y")
        if not (fa and fb and sa and sb):
            continue
        fam_cross[(fa, sa, fb, sb)].append(bool(r.get("chose_a")))
        fam_cross[(fb, sb, fa, sa)].append(not bool(r.get("chose_a")))
    print("  (shown: P(row family-slot chosen). Small n; both polarities are separate cells.)")
    # Compact: for each slot, P(this family's token of this slot wins its cross trials)
    fam_slot_cross = defaultdict(list)
    for r in crosses:
        for parent in ("A", "B"):
            fam = family_of_parent(r, parent)
            slot = r.get("slot_x") if parent == "A" else r.get("slot_y")
            won = (parent == "A" and r.get("chose_a")) or (parent == "B" and not r.get("chose_a"))
            if fam and slot:
                fam_slot_cross[(fam, slot)].append(won)
    fam_cross_out = []
    for fam in ("mechanical", "sweet", "sea"):
        print(f"  -- {fam} --")
        for slot in SLOTS:
            xs = fam_slot_cross.get((fam, slot), [])
            w = wilson(sum(1 for x in xs if x), len(xs))
            print(f"    {SLOT[slot]:6s}  {fmt(w)}")
            fam_cross_out.append({
                "family": fam,
                "slot": slot,
                "k": w["k"] if w else 0,
                "n": w["n"] if w else 0,
                "p": w["p"] if w else None,
            })
    print()

    print("=== RT ===")
    trial_rt = [r.get("reaction_time_ms") for r in singles + crosses]
    if trial_rt:
        xs = [t for t in trial_rt if isinstance(t, (int, float))]
        print(
            f"trial RT min {min(xs):.0f}  median {median(xs):.0f}  "
            f"p90 {sorted(xs)[int(0.9*len(xs))]:.0f}  max {max(xs):.0f}"
        )
        print(f"late {sum(1 for r in singles + crosses if r.get('late'))} / {len(singles)+len(crosses)}")
        print(
            f"single med {median([r.get('reaction_time_ms') for r in singles]):.0f}  "
            f"cross med {median([r.get('reaction_time_ms') for r in crosses]):.0f}"
        )
    print()
    print(
        f"n={len(keep)} completes; slot-ranking CIs are tight, pair cells are still one trial per person."
    )

    if json_dest:
        dest = Path(json_dest)
        slim = [{k: v for k, v in p.items() if not k.startswith("_")} for p in keep]
        dest.write_text(
            json.dumps({
                "n_docs": len(docs),
                "n_completed": len(completed),
                "n_incomplete": len(incompletes),
                "n_local": len(local),
                "n_qc_drop": len(dropped),
                "issues": issues,
                "people": slim,
                "catch": wilson(sum(1 for r in catch if r.get("catch_correct")), len(catch)),
                "practice": wilson(sum(1 for r in prac if r.get("catch_correct")), len(prac)),
                "single": single_rows_out,
                "family_slot_single": family_slot_out,
                "pairwise_cross": pairwise,
                "slot_cross": slot_out,
                "family_slot_cross": fam_cross_out,
                "med_rt": median(trial_rt),
                "med_duration": median([p["duration_s"] for p in keep]),
            }, indent=2, default=str),
            encoding="utf-8",
        )
        print(f"wrote {dest}")


if __name__ == "__main__":
    main()
