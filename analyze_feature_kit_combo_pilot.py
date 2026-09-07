"""
Feature-kit combo pilot analysis.

Reads an admin dump (feature_kit_combo_pilot_all_data.json) and prints
coalition choice + RT summaries. Coverage is the unbiased map; all-trials
tightens the close races that adaptive oversampled.

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
}
STRONG = {"shell", "lowerFace"}
FAMILIES = [
    "balanced_2v2",
    "strong1_vs_weak2",
    "strong2_vs_weak2",
    "strong2_vs_weak3",
]


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


def spearman(xs, ys):
    pairs = [(x, y) for x, y in zip(xs, ys) if x is not None and y is not None]
    if len(pairs) < 3:
        return None
    n = len(pairs)

    def ranks(vals):
        order = sorted(range(n), key=lambda i: vals[i])
        out = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j + 1 < n and vals[order[j + 1]] == vals[order[i]]:
                j += 1
            avg = (i + j) / 2 + 1
            for k in range(i, j + 1):
                out[order[k]] = avg
            i = j + 1
        return out

    rx = ranks([p[0] for p in pairs])
    ry = ranks([p[1] for p in pairs])
    mx, my = mean(rx), mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = math.sqrt(sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry))
    return (num / den) if den else None


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
                row["a_n_strong"] = sum(1 for s in sa if s in STRONG)
                row["b_n_strong"] = sum(1 for s in sb if s in STRONG)
                if row["a_n_strong"] != row["b_n_strong"]:
                    row["chose_more_strong"] = (
                        row["chose_a"] and row["a_n_strong"] > row["b_n_strong"]
                    ) or ((not row["chose_a"]) and row["b_n_strong"] > row["a_n_strong"])
                else:
                    row["chose_more_strong"] = None
                row["chose_shell_side"] = ("shell" in sa and row["chose_a"]) or (
                    "shell" in sb and not row["chose_a"]
                )
                row["chose_mouth_side"] = ("lowerFace" in sa and row["chose_a"]) or (
                    "lowerFace" in sb and not row["chose_a"]
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


def filt(rows, wave=None, family=None, pred=None):
    out = rows
    if wave:
        out = [r for r in out if r.get("wave") == wave]
    if family:
        out = [r for r in out if r.get("family") == family]
    if pred:
        out = [r for r in out if pred(r)]
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
        sh = rs[0].get("shared_slots") or []
        if fam.startswith("strong"):
            metric = p_true(rs, "chose_more_strong")
            metric_name = "P(stronger side)"
        else:
            metric = p_true(rs, "chose_mouth_side")
            metric_name = "P(mouth-side)"
        n_adp = sum(1 for r in duels if r["partition_id"] == pid and r.get("wave") == "adaptive")
        n_cov = sum(1 for r in duels if r["partition_id"] == pid and r.get("wave") == "coverage")
        out.append({
            "id": pid,
            "family": fam,
            "sa": sa,
            "sb": sb,
            "shared": sh,
            "label": f"{pretty(sa)} vs {pretty(sb)}"
            + (f" | shared {pretty(sh)}" if sh else " | none shared"),
            "metric_name": metric_name,
            "metric": metric,
            "pA": wilson(sum(1 for r in rs if r["chose_a"]), len(rs)),
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
    print()

    print("=== Families (coverage / all) ===")
    fam_out = {}
    for fam in FAMILIES:
        cov = filt(duels, "coverage", fam)
        allr = filt(duels, None, fam)
        if fam.startswith("strong"):
            cov_m = p_true(cov, "chose_more_strong")
            all_m = p_true(allr, "chose_more_strong")
            name = "P(stronger)"
        else:
            cov_m = p_true(cov, "chose_mouth_side")
            all_m = p_true(allr, "chose_mouth_side")
            name = "P(mouth-side)"
        fam_out[fam] = {"coverage": cov_m, "all": all_m, "name": name}
        print(f"{fam:20s} {name:16s} cov {fmt(cov_m)}")
        print(f"{'':20s} {'':16s} all {fmt(all_m)}  adaptive n={len(filt(duels,'adaptive',fam))}")
        print(f"{'':20s} RT cov median {median([r.get('reaction_time_ms') for r in cov]):.0f} ms  z {mean([r.get('z_duel') for r in cov]):+.2f}")
    print()

    print("=== strong1 by which strong (coverage) ===")
    for one in ["shell", "lowerFace"]:
        rows = filt(duels, "coverage", "strong1_vs_weak2", lambda r, o=one: r["sa"] == [o])
        print(f"  {one:10s} vs two weaks  {fmt(p_true(rows, 'chose_more_strong'))}")
        by = defaultdict(list)
        for r in rows:
            by[tuple(sorted(r["sb"]))].append(r)
        for pair, rs in sorted(by.items()):
            print(f"    vs {pretty(pair):20s} {fmt(p_true(rs, 'chose_more_strong'))}")
    print()

    print("=== strong2 vs which weak pair (coverage) ===")
    rows = filt(duels, "coverage", "strong2_vs_weak2")
    by = defaultdict(list)
    for r in rows:
        by[tuple(sorted(r["sb"]))].append(r)
    for pair, rs in sorted(by.items()):
        print(f"  vs {pretty(pair):20s} {fmt(p_true(rs, 'chose_more_strong'))}")
    print()

    print("=== balanced 2v2: which weak rides with mouth vs shell (coverage) ===")
    rows = filt(duels, "coverage", "balanced_2v2")
    print("  P(mouth-side)", fmt(p_true(rows, "chose_mouth_side")))
    print("  P(shell-side)", fmt(p_true(rows, "chose_shell_side")))
    by = defaultdict(list)
    for r in rows:
        mouth_weak = [s for s in (r["sa"] if "lowerFace" in r["sa"] else r["sb"]) if s not in STRONG]
        shell_weak = [s for s in (r["sa"] if "shell" in r["sa"] else r["sb"]) if s not in STRONG]
        by[(tuple(mouth_weak), tuple(shell_weak), tuple(sorted(r.get("shared_slots") or [])))].append(r)
    for key, rs in sorted(by.items(), key=lambda kv: abs(p_true(kv[1], "chose_mouth_side")["p"] - 0.5)):
        mw, sw, sh = key
        print(f"  mouth+{pretty(mw):8s} vs shell+{pretty(sw):8s} | {pretty(sh):8s}  {fmt(p_true(rs, 'chose_mouth_side'))}")
    print()

    print("=== Partitions by closeness to 50/50 (coverage, primary) ===")
    parts_cov = partition_stats(duels, "coverage")
    for p in parts_cov:
        m = p["metric"]
        print(f"  {p['close']*100:4.1f}pp  {fmt(m):32s}  {p['family']:18s}  {p['label']}  z={p['z']:+.2f}  adp={p['n_adp']}")
    print()

    print("=== Partitions all-trials (adaptive tightens close races) ===")
    parts_all = partition_stats(duels, None)
    for p in parts_all:
        m = p["metric"]
        print(f"  {p['close']*100:4.1f}pp  {fmt(m):32s}  {p['family']:18s}  {p['label']}")
    print()

    print("=== Person-level (coverage) ===")
    for fam, key in [
        ("strong1_vs_weak2", "chose_more_strong"),
        ("strong2_vs_weak2", "chose_more_strong"),
        ("strong2_vs_weak3", "chose_more_strong"),
        ("balanced_2v2", "chose_mouth_side"),
    ]:
        ps = []
        for d in completed:
            rs = [r for r in duels if r["_pid"] == d.get("pid") and r["family"] == fam and r.get("wave") == "coverage"]
            if rs:
                ps.append(sum(1 for r in rs if r.get(key) is True) / len(rs))
        print(f"  {fam:20s} mean {mean(ps):.2f}  sd {sd(ps):.2f}  median {median(ps):.2f}  <40% {sum(1 for p in ps if p < 0.4)}  >60% {sum(1 for p in ps if p > 0.6)}")
    print()

    xs = [p["close"] for p in parts_cov]
    ys = [p["med_rt"] for p in parts_cov]
    zs = [p["z"] for p in parts_cov]
    print("Spearman |p-0.5| vs median RT (coverage partitions)", spearman(xs, ys))
    print("Spearman |p-0.5| vs z(log RT)", spearman(xs, zs))

    # token: when token is on winner coalition
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
    for slot in ["shell", "lowerFace", "ear", "eye", "hair"]:
        toks = [(tok, win_n[(slot, tok)], present_n[(slot, tok)]) for (_, tok) in present_n if _ == slot]
        toks.sort(key=lambda t: -((t[1] / t[2]) if t[2] else 0))
        print(f"  {slot}")
        for tok, k, n in toks:
            print(f"    {tok:12s} {fmt(wilson(k, n))}")

    out = {
        "n_completed": len(completed),
        "n_duels": len(duels),
        "families": fam_out,
        "partitions_coverage": parts_cov,
        "partitions_all": parts_all,
    }
    if "--json" in sys.argv:
        dest = Path(sys.argv[sys.argv.index("--json") + 1])
        dest.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")


if __name__ == "__main__":
    main()
