"""
Feature-kit pilot analysis pipeline.

Reads an admin.html dump (feature_kit_pilot_all_data.json) and prints
choice + RT summaries. Re-run on a new dump without changing the task.

Usage:
  python analyze_feature_kit_pilot.py
  python analyze_feature_kit_pilot.py path/to/feature_kit_pilot_all_data.json
  python analyze_feature_kit_pilot.py path/to/dump.json --json out.json

RT notes:
  Catch vs duel uses within-person z of log RT across all paid trials.
  Slot / pair / token speed uses the same z computed on duels only, so
  slow and fast people do not dominate the slot comparison.
"""
from __future__ import annotations

import json
import math
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

SLOTS = ["shell", "ear", "eye", "lowerFace", "hair"]
SLOT_LABEL = {
    "shell": "Shell",
    "ear": "Ears",
    "eye": "Eyes",
    "lowerFace": "Lower face",
    "hair": "Hair",
}
DEV_PREFIXES = ("kitfb",)
DEFAULT_DUMP = Path.home() / "Downloads" / "feature_kit_pilot_all_data.json"


def median(xs):
    xs = [x for x in xs if x is not None]
    return statistics.median(xs) if xs else None


def mean(xs):
    xs = [x for x in xs if x is not None]
    return statistics.mean(xs) if xs else None


def sd(xs):
    xs = [x for x in xs if x is not None]
    if len(xs) < 2:
        return None
    return statistics.pstdev(xs)


def wilson(k, n, z=1.96):
    if n <= 0:
        return None
    p = k / n
    z2 = z * z
    den = 1 + z2 / n
    centre = (p + z2 / (2 * n)) / den
    half = z * math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / den
    return {
        "k": k,
        "n": n,
        "p": p,
        "lo": max(0.0, centre - half),
        "hi": min(1.0, centre + half),
    }


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


def answers_of(doc):
    prog = doc.get("featureKitPilotProgress") or {}
    return prog.get("answers") or []


def is_dev(doc):
    return str(doc.get("pid") or "").startswith(DEV_PREFIXES)


def pair_key(a, b):
    return tuple(sorted([a, b]))


def zscore_log_rt(rows, field="z_log_rt"):
    """Within-person z of log RT, written onto each row[field]."""
    by_pid = defaultdict(list)
    for i, r in enumerate(rows):
        by_pid[r["_pid"]].append(i)
    out_z = [None] * len(rows)
    for pid, idxs in by_pid.items():
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
            out_z[i] = (val - m) / s
    for i, r in enumerate(rows):
        r[field] = out_z[i]
    return rows


def load_duels(docs):
    duels = []
    catch = []
    paid = []
    for d in docs:
        if is_dev(d) or d.get("experimentCompleted") is not True:
            continue
        pid = d.get("pid")
        for r in answers_of(d):
            if r.get("kind") not in ("duel", "catch"):
                continue
            row = dict(r)
            row["_pid"] = pid
            paid.append(row)
            if row["kind"] == "duel":
                duels.append(row)
            else:
                catch.append(row)
    zscore_log_rt(paid, "z_log_rt")
    zscore_log_rt(duels, "z_duel")
    return duels, catch


def slot_choice_stats(duels):
    wins = Counter()
    n = Counter()
    pair_w = defaultdict(Counter)
    pair_n = Counter()
    for r in duels:
        ws, ls = r.get("winner_slot"), r.get("loser_slot")
        if not ws or not ls:
            continue
        wins[ws] += 1
        n[ws] += 1
        n[ls] += 1
        pk = pair_key(ws, ls)
        pair_n[pk] += 1
        pair_w[pk][ws] += 1
    slots = []
    for s in SLOTS:
        w = wilson(wins[s], n[s]) or {"k": 0, "n": 0, "p": None, "lo": None, "hi": None}
        slots.append({"slot": s, "label": SLOT_LABEL[s], **w})
    slots.sort(key=lambda x: -(x["p"] or 0))
    pairs = []
    for a, b in ((x, y) for i, x in enumerate(SLOTS) for y in SLOTS[i + 1 :]):
        pk = pair_key(a, b)
        nn = pair_n[pk]
        ka = pair_w[pk][a]
        p = (ka / nn) if nn else None
        pairs.append({
            "a": a,
            "b": b,
            "label": f"{SLOT_LABEL[a]} vs {SLOT_LABEL[b]}",
            "n": nn,
            "k_a": ka,
            "p_a": p,
            "margin": abs(p - 0.5) if p is not None else None,
        })
    return slots, pairs


def rt_by_winner(duels):
    """Median RT and mean within-person z(log RT) when that slot wins / is present."""
    win_rt = defaultdict(list)
    win_z = defaultdict(list)
    present_rt = defaultdict(list)
    present_z = defaultdict(list)
    lose_rt = defaultdict(list)
    lose_z = defaultdict(list)
    for r in duels:
        rt, z = r.get("reaction_time_ms"), r.get("z_duel") if r.get("z_duel") is not None else r.get("z_log_rt")
        ws, ls = r.get("winner_slot"), r.get("loser_slot")
        if ws:
            win_rt[ws].append(rt)
            win_z[ws].append(z)
            present_rt[ws].append(rt)
            present_z[ws].append(z)
        if ls:
            lose_rt[ls].append(rt)
            lose_z[ls].append(z)
            present_rt[ls].append(rt)
            present_z[ls].append(z)
    out = []
    for s in SLOTS:
        out.append({
            "slot": s,
            "label": SLOT_LABEL[s],
            "n_win": len(win_rt[s]),
            "median_rt_win_ms": median(win_rt[s]),
            "mean_z_win": mean(win_z[s]),
            "n_lose": len(lose_rt[s]),
            "median_rt_lose_ms": median(lose_rt[s]),
            "mean_z_lose": mean(lose_z[s]),
            "n_present": len(present_rt[s]),
            "median_rt_present_ms": median(present_rt[s]),
            "mean_z_present": mean(present_z[s]),
        })
    return out


def rt_by_pair(duels, pair_choice):
    bucket_rt = defaultdict(list)
    bucket_z = defaultdict(list)
    for r in duels:
        sx, sy = r.get("slot_x"), r.get("slot_y")
        if not sx or not sy:
            continue
        pk = pair_key(sx, sy)
        bucket_rt[pk].append(r.get("reaction_time_ms"))
        z = r.get("z_duel") if r.get("z_duel") is not None else r.get("z_log_rt")
        bucket_z[pk].append(z)
    margin_of = {pair_key(p["a"], p["b"]): p["margin"] for p in pair_choice}
    out = []
    for p in pair_choice:
        pk = pair_key(p["a"], p["b"])
        out.append({
            **p,
            "median_rt_ms": median(bucket_rt[pk]),
            "mean_z": mean(bucket_z[pk]),
        })
    out.sort(key=lambda x: (x["median_rt_ms"] is None, x["median_rt_ms"] or 0))
    return out


def rt_by_token(duels):
    win_rt = defaultdict(list)
    win_z = defaultdict(list)
    n = defaultdict(int)
    k = defaultdict(int)
    for r in duels:
        ws, wt = r.get("winner_slot"), r.get("winner_token")
        ls, lt = r.get("loser_slot"), r.get("loser_token")
        if ws and wt:
            key = (ws, wt)
            k[key] += 1
            n[key] += 1
            win_rt[key].append(r.get("reaction_time_ms"))
            z = r.get("z_duel") if r.get("z_duel") is not None else r.get("z_log_rt")
            win_z[key].append(z)
        if ls and lt:
            n[(ls, lt)] += 1
    out = []
    for slot in SLOTS:
        toks = sorted({t for s, t in n if s == slot})
        for tok in toks:
            key = (slot, tok)
            w = wilson(k[key], n[key])
            out.append({
                "slot": slot,
                "token": tok,
                **(w or {"k": 0, "n": 0, "p": None}),
                "median_rt_win_ms": median(win_rt[key]),
                "mean_z_win": mean(win_z[key]),
                "n_win": len(win_rt[key]),
            })
    return out


def strong_vs_weak(duels, slot_p):
    """RT when the chosen slot is the stronger vs weaker of the pair (by pooled P(win))."""
    p = {row["slot"]: row["p"] for row in slot_p}
    strong_rt, weak_rt, strong_z, weak_z = [], [], [], []
    for r in duels:
        ws, ls = r.get("winner_slot"), r.get("loser_slot")
        if not ws or not ls or p.get(ws) is None or p.get(ls) is None:
            continue
        if p[ws] == p[ls]:
            continue
        if p[ws] > p[ls]:
            strong_rt.append(r.get("reaction_time_ms"))
            strong_z.append(r.get("z_duel") if r.get("z_duel") is not None else r.get("z_log_rt"))
        else:
            weak_rt.append(r.get("reaction_time_ms"))
            weak_z.append(r.get("z_duel") if r.get("z_duel") is not None else r.get("z_log_rt"))
    return {
        "n_chose_stronger": len(strong_rt),
        "median_rt_stronger_ms": median(strong_rt),
        "mean_z_stronger": mean(strong_z),
        "n_chose_weaker": len(weak_rt),
        "median_rt_weaker_ms": median(weak_rt),
        "mean_z_weaker": mean(weak_z),
    }


def kind_rt(duels, catch):
    def pack(rows, label):
        rts = [r.get("reaction_time_ms") for r in rows]
        zs = [r.get("z_log_rt") for r in rows]
        return {
            "kind": label,
            "n": len(rows),
            "median_rt_ms": median(rts),
            "mean_z": mean(zs),
        }
    return {
        "duel": pack(duels, "duel"),
        "catch": pack(catch, "catch"),
        "coverage": pack([r for r in duels if r.get("wave") == "coverage"], "coverage"),
        "adaptive": pack([r for r in duels if r.get("wave") == "adaptive"], "adaptive"),
    }


def rnd(x, nd=3):
    if x is None:
        return None
    if isinstance(x, float):
        return round(x, nd)
    return x


def parse_args():
    args = sys.argv[1:]
    dump = DEFAULT_DUMP
    json_out = None
    i = 0
    while i < len(args):
        if args[i] == "--json" and i + 1 < len(args):
            json_out = Path(args[i + 1])
            i += 2
        else:
            dump = Path(args[i])
            i += 1
    return dump, json_out


def main():
    path, json_out = parse_args()
    docs = json.loads(path.read_text(encoding="utf-8"))
    duels, catch = load_duels(docs)
    slot_p, pair_p = slot_choice_stats(duels)
    winner_rt = rt_by_winner(duels)
    pairs_rt = rt_by_pair(duels, pair_p)
    tokens_rt = rt_by_token(duels)
    follow = strong_vs_weak(duels, slot_p)
    kinds = kind_rt(duels, catch)

    p_map = {r["slot"]: r["p"] for r in slot_p}
    z_win_map = {r["slot"]: r["mean_z_win"] for r in winner_rt}
    rho_choice_vs_speed = spearman(
        [p_map[s] for s in SLOTS],
        [-(z_win_map[s] or 0) for s in SLOTS],
    )
    rho_margin_vs_rt = spearman(
        [p["margin"] for p in pairs_rt],
        [p["median_rt_ms"] for p in pairs_rt],
    )
    rho_margin_vs_z = spearman(
        [p["margin"] for p in pairs_rt],
        [p["mean_z"] for p in pairs_rt],
    )

    n_people = len({r["_pid"] for r in duels})
    by_pid_duel = defaultdict(list)
    by_pid_catch = defaultdict(list)
    for r in duels:
        by_pid_duel[r["_pid"]].append(r.get("reaction_time_ms"))
    for r in catch:
        by_pid_catch[r["_pid"]].append(r.get("reaction_time_ms"))
    catch_faster = []
    for pid, drt in by_pid_duel.items():
        dm, cm = median(drt), median(by_pid_catch.get(pid) or [])
        if dm is not None and cm is not None:
            catch_faster.append(dm - cm)
    n_catch_faster = sum(1 for d in catch_faster if d > 0)

    summary = {
        "dump": str(path),
        "n_people": n_people,
        "n_duels": len(duels),
        "n_catch": len(catch),
        "kinds": kinds,
        "slot_choice": slot_p,
        "rt_by_winner": winner_rt,
        "pairs": pairs_rt,
        "tokens": tokens_rt,
        "follow_strength": follow,
        "spearman_slot_pwin_vs_speed": rho_choice_vs_speed,
        "spearman_pair_margin_vs_median_rt": rho_margin_vs_rt,
        "spearman_pair_margin_vs_z": rho_margin_vs_z,
        "catch_faster_than_duel_people": n_catch_faster,
        "n_people_with_catch": len(catch_faster),
        "median_catch_advantage_ms": median(catch_faster),
    }

    print(f"dump {path}")
    print(f"people {n_people}  duels {len(duels)}  catch {len(catch)}")
    print(
        f"catch faster than own duels: {n_catch_faster}/{len(catch_faster)}"
        f"  median advantage {rnd(median(catch_faster), 0)} ms"
    )
    print("\nRT by trial kind (median ms, mean within-person z log-RT)")
    for key in ("catch", "coverage", "adaptive", "duel"):
        k = kinds[key]
        print(f"  {key:10} n={k['n']:3}  med={rnd(k['median_rt_ms'], 0)}  z={rnd(k['mean_z'])}")

    print("\nSlot: P(win) vs RT when that slot wins")
    choice_by = {r["slot"]: r for r in slot_p}
    for rt in winner_rt:
        choice = choice_by[rt["slot"]]
        print(
            f"  {rt['label']:12} p={rnd(choice['p'])} {choice['k']}/{choice['n']}"
            f"  win_med={rnd(rt['median_rt_win_ms'], 0)}"
            f"  z_win={rnd(rt['mean_z_win'])}"
            f"  z_lose={rnd(rt['mean_z_lose'])}"
            f"  z_present={rnd(rt['mean_z_present'])}"
        )
    print(f"\nSpearman P(win) vs speed (-z when wins): {rnd(rho_choice_vs_speed)}")
    print("Follow stronger slot of the pair:", {k: rnd(v) for k, v in follow.items()})

    print("\nPairs (fastest first)")
    for p in pairs_rt:
        print(
            f"  {p['label']:28} n={p['n']:2}  p_first={rnd(p['p_a'])}"
            f"  margin={rnd(p['margin'])}  med={rnd(p['median_rt_ms'], 0)}  z={rnd(p['mean_z'])}"
        )
    print(f"Spearman |P-0.5| vs median RT: {rnd(rho_margin_vs_rt)}  vs z: {rnd(rho_margin_vs_z)}")

    print("\nTokens (win RT)")
    for t in tokens_rt:
        print(
            f"  {t['slot']:10} {t['token']:12} {t['k']}/{t['n']} p={rnd(t['p'])}"
            f"  win_med={rnd(t['median_rt_win_ms'], 0)}  z={rnd(t['mean_z_win'])}"
        )

    if json_out:
        json_out.write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")
        print(f"\nwrote {json_out}")


if __name__ == "__main__":
    main()
