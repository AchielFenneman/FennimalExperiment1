"""
Feature-kit combo pilot analysis (disjoint 3v2 sitting).

Reads an admin dump (feature_kit_combo_pilot_all_data.json).
Coverage is two reps of every 3-vs-2 split. Adaptive may add 1-vs-4.

Usage:
  python analyze_feature_kit_combo_pilot.py
  python analyze_feature_kit_combo_pilot.py path/to/feature_kit_combo_pilot_all_data.json
"""
from __future__ import annotations

import json
import math
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

DEV_PREFIXES = ("kitfb", "kitcombo")
DEFAULT_DUMP = Path.home() / "Downloads" / "feature_kit_combo_pilot_all_data.json"
SLOT = {
    "shell": "Shell",
    "ear": "Ears",
    "eye": "Eyes",
    "lowerFace": "Mouth",
    "hair": "Hair",
    "stamp": "Stamp",
}
FAMILIES = ["morph_complete", "morph_1vRest"]


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


def pretty(arr):
    return " + ".join(SLOT.get(s, s) for s in (arr or []))


def answers_of(doc):
    return ((doc.get("featureKitPilotProgress") or {}).get("answers")) or []


def is_dev(doc):
    pid = str(doc.get("pid") or "")
    return pid.startswith(DEV_PREFIXES) or doc.get("pid") in (False, None, "")


def zscore_log_rt(rows, field):
    by = defaultdict(list)
    for i, r in enumerate(rows):
        by[r["_pid"]].append(i)
    for _, idxs in by.items():
        logs = []
        keep = []
        for i in idxs:
            rt = rows[i].get("reaction_time_ms")
            if isinstance(rt, (int, float)) and rt > 0:
                logs.append(math.log(rt))
                keep.append(i)
        if len(keep) < 2:
            continue
        m = mean(logs)
        s = sd(logs) or 1.0
        if s == 0:
            s = 1.0
        for i, val in zip(keep, logs):
            rows[i][field] = (val - m) / s
    return rows


def fmt(w):
    if not w:
        return "—"
    return f"{round(w['p']*100)}% ({w['k']}/{w['n']})  CI {round(w['lo']*100)}–{round(w['hi']*100)}"


def load_duels(docs):
    duels = []
    catch = []
    prac = []
    paid = []
    for d in docs:
        if is_dev(d) or d.get("experimentCompleted") is not True:
            continue
        pid = d.get("pid")
        for r in answers_of(d):
            row = dict(r)
            row["_pid"] = pid
            kind = row.get("kind")
            if kind == "duel":
                sa = list(row.get("set_a") or [])
                sb = list(row.get("set_b") or [])
                row["sa"] = sa
                row["sb"] = sb
                row["chose_a"] = row.get("selected_parent") == "A"
                row["chose_larger"] = (
                    row["chose_a"] if len(sa) > len(sb) else (not row["chose_a"] if len(sb) > len(sa) else None)
                )
                duels.append(row)
                paid.append(row)
            elif kind == "catch":
                catch.append(row)
                paid.append(row)
            elif kind == "practice":
                prac.append(row)
    zscore_log_rt(paid, "z_log_rt")
    zscore_log_rt(duels, "z_duel")
    return duels, catch, prac, paid


def filt(rows, wave=None, family=None):
    out = rows
    if wave:
        out = [r for r in out if r.get("wave") == wave]
    if family:
        out = [r for r in out if r.get("family") == family]
    return out


def p_true(rows, key):
    k = sum(1 for r in rows if r.get(key) is True)
    return wilson(k, len(rows))


def partition_stats(duels, wave=None):
    rows = filt(duels, wave=wave)
    by = defaultdict(list)
    for r in rows:
        by[r["partition_id"]].append(r)
    out = []
    for pid, rs in by.items():
        fam = rs[0]["family"]
        sa, sb = rs[0]["sa"], rs[0]["sb"]
        metric = p_true(rs, "chose_a")
        n_adp = sum(1 for r in duels if r["partition_id"] == pid and r.get("wave") == "adaptive")
        n_cov = sum(1 for r in duels if r["partition_id"] == pid and r.get("wave") == "coverage")
        out.append({
            "id": pid,
            "family": fam,
            "sa": sa,
            "sb": sb,
            "label": f"{pretty(sa)} vs {pretty(sb)}",
            "metric_name": "P(set A)",
            "metric": metric,
            "pA": metric,
            "close": abs((metric["p"] if metric else 0.5) - 0.5),
            "n": len(rs),
            "n_cov": n_cov,
            "n_adp": n_adp,
            "med_rt": median([r.get("reaction_time_ms") for r in rs]),
            "z": mean([r.get("z_duel") for r in rs]),
        })
    out.sort(key=lambda x: (x["close"], x["family"], x["id"]))
    return out


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DUMP
    docs = json.loads(path.read_text(encoding="utf-8"))
    completed = [d for d in docs if d.get("experimentCompleted") is True and not is_dev(d)]
    duels, catch, prac, paid = load_duels(docs)

    print(f"dump {path}")
    print(f"completed {len(completed)}  duels {len(duels)}  catch {len(catch)}")
    print("catch", fmt(wilson(sum(1 for r in catch if r.get("catch_correct")), len(catch))))
    print("practice", fmt(wilson(sum(1 for r in prac if r.get("catch_correct")), len(prac))))
    print("P(set A) all duels", fmt(p_true(duels, "chose_a")))
    print("P(larger coalition)", fmt(p_true(duels, "chose_larger")))
    print()

    print("=== Families (coverage / all) ===")
    for fam in FAMILIES:
        cov = filt(duels, "coverage", fam)
        allr = filt(duels, None, fam)
        print(f"{fam:16s} cov P(A) {fmt(p_true(cov, 'chose_a'))}  n={len(cov)}")
        print(f"{'':16s} all P(A) {fmt(p_true(allr, 'chose_a'))}  adaptive n={len(filt(duels,'adaptive',fam))}")
        if cov:
            print(f"{'':16s} RT cov median {median([r.get('reaction_time_ms') for r in cov]):.0f} ms")
    print()

    print("=== Partitions by closeness to 50/50 (coverage) ===")
    parts_cov = partition_stats(duels, "coverage")
    for p in parts_cov:
        print(f"  {p['close']*100:4.1f}pp  {fmt(p['metric']):32s}  {p['family']:16s}  {p['label']}  adp={p['n_adp']}")
    print()

    print("=== Token on winning coalition (all duels; confounded) ===")
    win_n = Counter()
    present_n = Counter()
    for r in duels:
        winners = set(r.get("winner_slots") or [])
        for slot, tok in (r.get("tokens_a") or {}).items():
            present_n[(slot, tok)] += 1
            if slot in winners:
                win_n[(slot, tok)] += 1
        for slot, tok in (r.get("tokens_b") or {}).items():
            present_n[(slot, tok)] += 1
            if slot in winners:
                win_n[(slot, tok)] += 1
    for slot in ["shell", "lowerFace", "ear", "eye", "stamp", "hair"]:
        toks = [(tok, win_n[(slot, tok)], present_n[(slot, tok)]) for (_, tok) in present_n if _ == slot]
        if not toks:
            continue
        toks.sort(key=lambda t: -((t[1] / t[2]) if t[2] else 0))
        print(f"  {slot}")
        for tok, k, n in toks:
            print(f"    {tok:12s} {fmt(wilson(k, n))}")

    if "--json" in sys.argv:
        dest = Path(sys.argv[sys.argv.index("--json") + 1])
        dest.write_text(
            json.dumps({
                "n_completed": len(completed),
                "n_duels": len(duels),
                "partitions_coverage": parts_cov,
            }, indent=2, default=str),
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
