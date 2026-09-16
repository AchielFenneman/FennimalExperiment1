"""
Feature-kit size sitting analysis (frozen trio, between-subjects pack).

Reads an admin dump (feature_kit_size_pilot_all_data.json).
Coverage is 3 pairs × 10 morph-complete 3v2 splits, one each, plus 2 practice
and 3 catch. Pack is baseline / mild / medium.

Primary sample is catch-pass plus strict QC (side bias, median RT
< 1100 ms, session < 90 s, floor-hugging). Pass --no-qc to skip speed/side
cuts (catch floor still applies).

Usage:
  python analyze_feature_kit_size_pilot.py
  python analyze_feature_kit_size_pilot.py path/to/feature_kit_size_pilot_all_data.json
  python analyze_feature_kit_size_pilot.py --no-qc
"""
from __future__ import annotations

import json
import math
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

DEFAULT_DUMP = Path.home() / "Downloads" / "feature_kit_size_pilot_all_data.json"
SLOT = {
    "shell": "Shell",
    "ear": "Ears",
    "eye": "Eyes",
    "lowerFace": "Mouth",
    "hair": "Hair",
    "stamp": "Stamp",
}
PACKS = ["baseline", "mild", "medium"]
PAIRS = ["H1H2", "H1H3", "H2H3"]
FROZEN = {
    "H1": {"shell": "pear", "ear": "mechanical", "eye": "round", "lowerFace": "pig", "stamp": "freckles"},
    "H2": {"shell": "point", "ear": "mushroom", "eye": "square", "lowerFace": "shark", "stamp": "chevrons"},
    "H3": {"shell": "tall", "ear": "seashell", "eye": "slanted", "lowerFace": "elephant", "stamp": "smiley"},
}
PACK_SCALES = {
    "baseline": {"ear": 1, "eye": 1, "lowerFace": 1, "stamp": 1},
    "mild": {"ear": 0.92, "eye": 1.12, "lowerFace": 0.90, "stamp": 1.18},
    "medium": {"ear": 0.82, "eye": 1.22, "lowerFace": 0.85, "stamp": 1.35},
}
# Combo sitting coverage ×1 (any tokens, 82 trials). P(3-slot parent).
FISHING = {
    "ear+lowerFace vs eye+shell+stamp": 0.451,
    "ear+shell vs eye+lowerFace+stamp": 0.427,
    "ear+lowerFace+stamp vs eye+shell": 0.585,
    "ear+eye vs lowerFace+shell+stamp": 0.634,
    "ear+shell+stamp vs eye+lowerFace": 0.646,
    "ear+eye+stamp vs lowerFace+shell": 0.341,
    "ear+eye+lowerFace vs shell+stamp": 0.732,
    "ear+eye+shell vs lowerFace+stamp": 0.756,
    "ear+stamp vs eye+lowerFace+shell": 0.780,
    "ear+lowerFace+shell vs eye+stamp": 0.963,
}
EVEN_IDS = {
    "ear+lowerFace vs eye+shell+stamp",
    "ear+shell vs eye+lowerFace+stamp",
    "ear+lowerFace+stamp vs eye+shell",
}
BLOW_ID = "ear+lowerFace+shell vs eye+stamp"


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


def median(xs):
    xs = [x for x in xs if isinstance(x, (int, float))]
    return statistics.median(xs) if xs else None


def pretty(arr):
    return " + ".join(SLOT.get(s, s) for s in (arr or []))


def answers_of(doc):
    prog = (doc.get("featureKitPilotProgress") or {}).get("answers") or []
    if prog:
        return prog
    stored = doc.get("storedData") or []
    if stored and isinstance(stored, list) and isinstance(stored[0], dict):
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


def fmt(w):
    if not w:
        return "—"
    return f"{round(w['p']*100)}% ({w['k']}/{w['n']})  CI {round(w['lo']*100)}-{round(w['hi']*100)}"


def pack_of(doc, answers):
    prog = doc.get("featureKitPilotProgress") or {}
    if prog.get("pack_id"):
        return prog.get("pack_id")
    pr = (doc.get("phaseRandomizations") or {}).get("feature_kit_size_pilot_pack") or {}
    if pr.get("pack_id"):
        return pr.get("pack_id")
    stored = doc.get("storedData") or []
    if stored and isinstance(stored, list) and isinstance(stored[0], dict) and stored[0].get("pack_id"):
        return stored[0].get("pack_id")
    packs = [r.get("pack_id") for r in answers if r.get("pack_id")]
    return packs[0] if packs else None


def scales_ok(row, pack):
    want = PACK_SCALES.get(pack) or {}
    got = (row.get("pack_scales") or (row.get("parent_a") or {}).get("scales") or {})
    for k, v in want.items():
        g = got.get(k)
        if g is None or abs(float(g) - float(v)) > 0.001:
            return False
    return True


def sd(xs):
    xs = [x for x in xs if isinstance(x, (int, float))]
    return statistics.pstdev(xs) if len(xs) >= 2 else None


def rmse50(ps):
    errs = [(p - 0.5) ** 2 for p in ps if p is not None]
    return math.sqrt(mean(errs)) if errs else None


def mae50(ps):
    errs = [abs(p - 0.5) for p in ps if p is not None]
    return mean(errs) if errs else None


def bootstrap_rmse(people_duels, n_boot=800, seed=1):
    """people_duels: list of list-of-rows (one list per person)."""
    rng = _mulberry(seed)
    n = len(people_duels)
    if n < 2:
        return None
    out = []
    for _ in range(n_boot):
        picks = [people_duels[int(rng() * n)] for _ in range(n)]
        by = defaultdict(list)
        for rows in picks:
            for r in rows:
                by[r.get("partition_id")].append(r)
        ps = []
        for pid in FISHING:
            rs = by.get(pid, [])
            if not rs:
                ps.append(None)
                continue
            ps.append(sum(1 for r in rs if r.get("chose_3_side")) / len(rs))
        val = rmse50(ps)
        if val is not None:
            out.append(val)
    if not out:
        return None
    out.sort()
    return {
        "mean": mean(out),
        "lo": out[int(0.025 * len(out))],
        "hi": out[min(len(out) - 1, int(0.975 * len(out)))],
        "n_boot": len(out),
    }


def _mulberry(seed):
    a = seed & 0xFFFFFFFF

    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = (a ^ (a >> 15)) & 0xFFFFFFFF
        t = (t * (1 | a) & 0xFFFFFFFF)
        t = (t + ((t ^ (t >> 7)) * 61) & 0xFFFFFFFF) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return rnd


def frozen_ok(row):
    ha = row.get("head_a_id")
    hb = row.get("head_b_id")
    if ha not in FROZEN or hb not in FROZEN:
        return False
    pa = row.get("parent_a") or {}
    pb = row.get("parent_b") or {}
    for rec, hid in ((pa, ha), (pb, hb)):
        for slot, tok in FROZEN[hid].items():
            if rec.get(slot) != tok:
                return False
        if rec.get("hair") not in ("none", None):
            return False
    return True


def qc_reasons(rec):
    """Strict QC on top of catch >= 2/3.

    1100 ms is 350 ms above the 750 ms response lock — not enough to look
    at three heads. 90 s is a speed-run of the whole session clock
    (instructions + 35 trials). Floor-hug is >=8/30 duels at <=850 ms.
    Side bias is P(F) >= 80% or <= 20% on 30 duels.
    """
    reasons = []
    if not rec.get("pass_catch"):
        reasons.append("catch<2/3")
    f = rec.get("p_f")
    if f is not None and (f >= 0.80 or f <= 0.20):
        reasons.append("side-bias")
    if rec.get("med_rt") is not None and rec["med_rt"] < 1100:
        reasons.append("medRT<1100")
    if rec.get("duration_s") is not None and rec["duration_s"] < 90:
        reasons.append("dur<90s")
    if rec.get("n_floor850", 0) >= 8:
        reasons.append("floor-hug")
    return reasons


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--") and a != "json"]
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
    duels = []
    catch = []
    prac = []
    issues = []

    for d in completed:
        pid = d.get("pid")
        answers = answers_of(d)
        pack = pack_of(d, answers)
        kinds = Counter(r.get("kind") for r in answers)
        n_duel = kinds.get("duel", 0)
        n_catch = kinds.get("catch", 0)
        n_prac = kinds.get("practice", 0)
        if n_duel != 30 or n_catch != 3 or n_prac != 2 or len(answers) != 35:
            issues.append(f"{pid}: trial mix {dict(kinds)} n={len(answers)}")
        catch_rows = [r for r in answers if r.get("kind") == "catch"]
        catch_ok = sum(1 for r in catch_rows if r.get("catch_correct") is True)
        prac_rows = [r for r in answers if r.get("kind") == "practice"]
        prac_ok = sum(1 for r in prac_rows if r.get("catch_correct") is True)
        duel_rows = [r for r in answers if r.get("kind") == "duel"]
        pairs = Counter(r.get("pair_id") for r in duel_rows)
        parts = Counter(r.get("partition_id") for r in duel_rows)
        if any(pairs.get(p, 0) != 10 for p in PAIRS):
            issues.append(f"{pid}: pair counts {dict(pairs)}")
        if len(parts) != 10 or any(v != 3 for v in parts.values()):
            issues.append(f"{pid}: partition counts {len(parts)} {dict(parts)}")
        if not all(frozen_ok(r) for r in duel_rows):
            issues.append(f"{pid}: frozen-head mismatch")
        if not all(r.get("pack_id") == pack for r in answers if r.get("kind") != "practice"):
            issues.append(f"{pid}: pack_id drift")
        if not all(scales_ok(r, pack) for r in duel_rows):
            issues.append(f"{pid}: pack scales mismatch")
        if any(r.get("chose_3_side") is None for r in duel_rows):
            issues.append(f"{pid}: missing chose_3_side")
        p3 = sum(1 for r in duel_rows if r.get("chose_3_side") is True)
        rts = [r.get("reaction_time_ms") for r in duel_rows]
        rec = {
            "pid": pid,
            "pack": pack,
            "n": len(answers),
            "catch_ok": catch_ok,
            "n_catch": n_catch,
            "prac_ok": prac_ok,
            "pass_catch": catch_ok >= 2,
            "p3": p3 / len(duel_rows) if duel_rows else None,
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
            "queue": (d.get("storedData") or [{}])[0].get("queue_version") if d.get("storedData") else None,
            "_duels": duel_rows,
            "_catch": catch_rows,
        }
        rec["qc"] = qc_reasons(rec)
        people.append(rec)
        for r in catch_rows:
            row = dict(r)
            row["_pid"] = pid
            row["_pack"] = pack
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
        for r in p["_duels"]:
            row = dict(r)
            row["_pid"] = p["pid"]
            row["_pack"] = p["pack"]
            duels.append(row)

    print(f"dump {path}")
    print(f"docs {len(docs)}  paid {len(paid_docs)}  completed {len(completed)}  incomplete {len(incompletes)}  local {len(local)}")
    print(f"catch-pass (>=2/3) {len(catch_pass)}  catch-fail {len(fail)}")
    print(f"QC keep {len(keep)}  QC drop {len(dropped)}" + ("  (--no-qc, catch-pass only)" if skip_qc else ""))
    pack_n = Counter(p["pack"] for p in keep)
    pack_n_all = Counter(p["pack"] for p in people)
    print("packs completes", dict(pack_n_all), "  after QC", dict(pack_n))
    print("issues", issues or "none")
    leftover = []
    for d in incompletes:
        ans = answers_of(d)
        if len(ans) >= 30:
            leftover.append((d.get("pid"), len(ans), d.get("totalDuration"), pack_of(d, ans)))
    if leftover:
        print("incomplete with >=30 answers (excluded)", leftover)
    if fail:
        print("catch-fail", [(p["pid"], p["pack"], f"{p['catch_ok']}/{p['n_catch']}") for p in fail])
    if dropped and not skip_qc:
        print("QC drops:")
        for p in dropped:
            dur = f"{p['duration_s']/60:.1f} min" if p["duration_s"] else "-"
            print(
                f"  {p['pid']}  {p['pack']:8s}  {','.join(p['qc'])}  "
                f"P(3) {p['p3']*100:.0f}%  RT {p['med_rt']:.0f} ms  F {p['p_f']*100:.0f}%  {dur}"
            )
    print()
    print("catch all completes", fmt(wilson(sum(1 for r in catch if r.get("catch_correct")), len(catch))))
    print("practice", fmt(wilson(sum(1 for r in prac if r.get("catch_correct")), len(prac))))
    print("P(3-side) QC keep", fmt(wilson(sum(1 for r in duels if r.get("chose_3_side")), len(duels))))
    print("median duel RT", f"{median([r.get('reaction_time_ms') for r in duels]):.0f} ms")
    print("median duration", f"{median([p['duration_s'] for p in keep])/60:.1f} min" if keep else "-")
    print()

    print("=== Person-mean P(3-side) by pack ===")
    pack_stats = {}
    people_by_pack = defaultdict(list)
    for p in keep:
        people_by_pack[p["pack"]].append(p)
    for pack in PACKS:
        rs = [r for r in duels if r.get("_pack") == pack]
        w = wilson(sum(1 for r in rs if r.get("chose_3_side")), len(rs))
        pers = [x["p3"] for x in people_by_pack[pack]]
        pack_stats[pack] = {
            "trial": w,
            "person_mean": mean(pers),
            "person_sd": sd(pers),
            "n_people": len(pers),
        }
        se = (sd(pers) / math.sqrt(len(pers))) if pers and len(pers) >= 2 else None
        print(
            f"  {pack:8s} trials {fmt(w)}  people {len(pers)}  "
            f"mean {mean(pers)*100:.1f}%  sd {((sd(pers) or 0)*100):.1f} pp  "
            f"se {((se or 0)*100):.1f} pp"
        )
    print()

    print("=== P(3-side) by pack × split (vs fishing) ===")
    by = defaultdict(list)
    for r in duels:
        by[(r.get("_pack"), r.get("partition_id"))].append(r)
    split_rows = []
    EVEN = EVEN_IDS
    BLOW = BLOW_ID
    for pack in PACKS:
        ps = []
        print(f"  -- {pack} n={pack_n.get(pack,0)} --")
        for pid in FISHING:
            rs = by.get((pack, pid), [])
            w = wilson(sum(1 for r in rs if r.get("chose_3_side")), len(rs))
            fish = FISHING[pid]
            p = w["p"] if w else None
            if p is not None:
                ps.append(p)
            sa = rs[0].get("set_a") if rs else None
            label = pretty(sa) + " vs " + pretty(rs[0].get("set_b") if rs else None) if rs else pid
            print(f"    {fmt(w):32s}  fish {round(fish*100):2d}%  {label}")
            split_rows.append({
                "pack": pack,
                "id": pid,
                "label": label if rs else pid,
                "k": w["k"] if w else 0,
                "n": w["n"] if w else 0,
                "p": p,
                "lo": w["lo"] if w else None,
                "hi": w["hi"] if w else None,
                "fish": fish,
                "dist50": abs(p - 0.5) if p is not None else None,
                "even": pid in EVEN,
                "blowout": pid == BLOW,
            })
        r = rmse50(ps)
        m = mae50(ps)
        n40 = sum(1 for p in ps if abs(p - 0.5) <= 0.10)
        groups = [p["_duels"] for p in people_by_pack[pack]]
        boot = bootstrap_rmse(groups, n_boot=800, seed=7)
        pack_stats[pack]["rmse"] = r
        pack_stats[pack]["mae"] = m
        pack_stats[pack]["n_within_10"] = n40
        pack_stats[pack]["boot"] = boot
        boot_s = (
            f"  boot {boot['mean']*100:.1f} pp  CI {boot['lo']*100:.1f}-{boot['hi']*100:.1f}"
            if boot else ""
        )
        print(f"    RMSE {r*100:.1f} pp  MAE {m*100:.1f} pp  |p-50|<=10pp: {n40}/10{boot_s}")
    print()

    print("=== Pairs ===")
    for pack in PACKS:
        for pair in PAIRS:
            rs = [r for r in duels if r.get("_pack") == pack and r.get("pair_id") == pair]
            print(f"  {pack:8s} {pair} {fmt(wilson(sum(1 for r in rs if r.get('chose_3_side')), len(rs)))}")

    print()
    print("=== RMSE differences (person bootstrap, 800) ===")
    rng = _mulberry(11)
    groups = {pack: [p["_duels"] for p in people_by_pack[pack]] for pack in PACKS}

    def rmse_of(picked):
        byp = defaultdict(list)
        for rows in picked:
            for r in rows:
                byp[r.get("partition_id")].append(r)
        ps = []
        for pid in FISHING:
            rs = byp.get(pid, [])
            ps.append(sum(1 for r in rs if r.get("chose_3_side")) / len(rs) if rs else None)
        return rmse50(ps)

    diffs = []
    for _ in range(800):
        boots = {}
        for pack, g in groups.items():
            n = len(g)
            if n < 2:
                boots[pack] = None
                continue
            boots[pack] = rmse_of([g[int(rng() * n)] for _ in range(n)])
        if None in boots.values():
            continue
        diffs.append({
            "mild-base": boots["mild"] - boots["baseline"],
            "med-base": boots["medium"] - boots["baseline"],
            "mild-med": boots["mild"] - boots["medium"],
        })
    if diffs:
        for key in ("mild-base", "med-base", "mild-med"):
            xs = sorted(d[key] for d in diffs)
            lo = xs[int(0.025 * len(xs))]
            hi = xs[min(len(xs) - 1, int(0.975 * len(xs)))]
            pneg = sum(1 for x in xs if x < 0) / len(xs)
            print(
                f"  {key:10s}  {mean(xs)*100:+.1f} pp  CI {lo*100:.1f} to {hi*100:.1f}  "
                f"P(first smaller)={pneg:.2f}"
            )

    if not skip_qc and dropped:
        print()
        print("=== Sensitivity: catch-pass, no speed/side QC ===")
        by_all = defaultdict(list)
        for p in catch_pass:
            for r in p["_duels"]:
                by_all[(p["pack"], r.get("partition_id"))].append(r)
        for pack in PACKS:
            ps = []
            n = sum(1 for p in catch_pass if p["pack"] == pack)
            for pid in FISHING:
                rs = by_all.get((pack, pid), [])
                if rs:
                    ps.append(sum(1 for r in rs if r.get("chose_3_side")) / len(rs))
            print(
                f"  {pack:8s} n={n:2d}  RMSE {rmse50(ps)*100:.1f} pp  MAE {mae50(ps)*100:.1f} pp  "
                f"|p-50|<=10pp: {sum(1 for x in ps if abs(x-0.5)<=0.10)}/10"
            )

    print()
    print("=== RT ===")
    for p in keep:
        logs = [math.log(max(r.get("reaction_time_ms") or 1, 1)) for r in p["_duels"]]
        p["_z_mu"] = mean(logs)
        p["_z_sd"] = sd(logs) or 1.0
    print("person-median RT by pack")
    for pack in PACKS:
        xs = [p["med_rt"] for p in people_by_pack[pack]]
        print(f"  {pack:8s} median {median(xs):.0f} ms  p10 {sorted(xs)[max(0,int(0.1*(len(xs)-1)))]:.0f}  p90 {sorted(xs)[int(0.9*(len(xs)-1))]:.0f}")
    trial_rt = [r.get("reaction_time_ms") for r in duels]
    print(
        f"trial RT min {min(t for t in trial_rt if t is not None):.0f}  "
        f"median {median(trial_rt):.0f}  p90 {sorted(t for t in trial_rt if t is not None)[int(0.9*len(trial_rt))]:.0f}  "
        f"max {max(t for t in trial_rt if t is not None):.0f}"
    )
    print(f"late trials {sum(p['n_late'] or 0 for p in keep)} / {len(duels)}")

    def z_of(p, r):
        t = r.get("reaction_time_ms") or 1
        return (math.log(max(t, 1)) - p["_z_mu"]) / p["_z_sd"]

    z3, z2, t3, t2 = [], [], [], []
    zb = {"even": [], "blow": [], "other": []}
    tb = {"even": [], "blow": [], "other": []}
    catch_adv = []
    for p in keep:
        for r in p["_duels"]:
            t = r.get("reaction_time_ms")
            if not isinstance(t, (int, float)):
                continue
            z = z_of(p, r)
            if r.get("chose_3_side"):
                z3.append(z)
                t3.append(t)
            else:
                z2.append(z)
                t2.append(t)
            pid = r.get("partition_id")
            key = "even" if pid in EVEN_IDS else ("blow" if pid == BLOW_ID else "other")
            zb[key].append(z)
            tb[key].append(t)
        cm = median([r.get("reaction_time_ms") for r in p.get("_catch") or []])
        if p["med_rt"] is not None and cm is not None:
            catch_adv.append(p["med_rt"] - cm)
    print(
        f"chose 3-side  med {median(t3):.0f} ms  z {mean(z3):+.3f}   "
        f"chose 2-side  med {median(t2):.0f} ms  z {mean(z2):+.3f}"
    )
    for key in ("even", "blow", "other"):
        print(f"  {key:6s}  med {median(tb[key]):.0f} ms  z {mean(zb[key]):+.3f}")
    print(
        f"catch faster than own duels {sum(1 for a in catch_adv if a>0)}/{len(catch_adv)}  "
        f"median advantage {median(catch_adv):.0f} ms"
    )
    xs = sorted(keep, key=lambda p: p["med_rt"] or 0)
    n = len(xs)
    if n >= 3:
        terc = [("fast", xs[: n // 3]), ("mid", xs[n // 3 : 2 * n // 3]), ("slow", xs[2 * n // 3 :])]
        print("person RT tercile vs P(3-side)")
        for name, sl in terc:
            print(
                f"  {name:4s} n={len(sl):2d}  medRT {median([p['med_rt'] for p in sl]):.0f}  "
                f"P(3) {mean([p['p3'] for p in sl])*100:.1f}%"
            )
    by_split_rt = defaultdict(list)
    by_split_p = defaultdict(list)
    for r in duels:
        pid = r.get("partition_id")
        by_split_rt[pid].append(r.get("reaction_time_ms"))
        by_split_p[pid].append(1 if r.get("chose_3_side") else 0)
    split_pts = []
    print("split |p-50| vs median RT (packs pooled)")
    for pid in FISHING:
        p = mean(by_split_p[pid])
        mrt = median(by_split_rt[pid])
        split_pts.append((abs(p - 0.5) if p is not None else None, mrt, pid, p))
        print(f"  |p-50| {abs(p-0.5)*100:4.1f} pp  medRT {mrt:.0f}  p {p*100:.0f}%  {pid}")

    print()
    print("=== N vs plan (32/arm) ===")
    for pack in PACKS:
        n = pack_n.get(pack, 0)
        remain = max(0, 32 - n)
        boot = pack_stats[pack].get("boot")
        width = (boot["hi"] - boot["lo"]) if boot else None
        scaled = (width * math.sqrt(n / 32)) if width and n else None
        print(
            f"  {pack:8s} n={n:2d}  remain {remain:2d}  "
            f"RMSE CI width {width*100:.1f} pp now" if width else f"  {pack:8s} n={n}"
        )
        if scaled is not None:
            print(f"           expected CI width at n=32 ~ {scaled*100:.1f} pp (if SE ~ 1/sqrt(n))")

    if "--json" in sys.argv:
        dest = Path(sys.argv[sys.argv.index("--json") + 1])
        slim_people = [{k: v for k, v in p.items() if k != "_duels"} for p in keep]
        dest.write_text(
            json.dumps({
                "n_docs": len(docs),
                "n_completed": len(completed),
                "n_incomplete": len(incompletes),
                "n_local": len(local),
                "n_qc_drop": len(dropped),
                "qc_drops": [
                    {"pid": p["pid"], "pack": p["pack"], "reasons": p["qc"],
                     "med_rt": p["med_rt"], "duration_s": p["duration_s"], "p3": p["p3"], "p_f": p["p_f"]}
                    for p in dropped
                ],
                "pack_n": dict(pack_n),
                "pack_n_all": dict(pack_n_all),
                "issues": issues,
                "people": slim_people,
                "catch": wilson(sum(1 for r in catch if r.get("catch_correct")), len(catch)),
                "practice": wilson(sum(1 for r in prac if r.get("catch_correct")), len(prac)),
                "p3": wilson(sum(1 for r in duels if r.get("chose_3_side")), len(duels)),
                "pack_stats": pack_stats,
                "splits": split_rows,
                "med_rt": median([r.get("reaction_time_ms") for r in duels]),
                "med_duration": median([p["duration_s"] for p in keep]),
            }, indent=2, default=str),
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
