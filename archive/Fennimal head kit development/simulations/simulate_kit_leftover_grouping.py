"""
Compare leftover analyses on the same 12+12 design:

  residual:  prime vs no-prime (signed person Delta*)
  grouping:  triad ABC vs ABD on P(choose C | A-prime)

Does not touch experiment code.

Usage:
  python simulate_kit_leftover_grouping.py
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from simulate_kit_leftover_n_needed import (
    N_MAX,
    N_MIN,
    ncdf,
    t_crit_cached,
)
from simulate_kit_leftover_power import (
    LOGIT_SD,
    P0,
    binomial,
    delta_logit_from_pp,
    invlogit,
    logit,
    t_two_sided_p,
)

OUT = Path(__file__).with_name("simulate_kit_leftover_grouping.json")
SEED = 20260908
N_PRIME = 12
N_NONE = 12
POOL = 30000
N_SIMS_CURVE = 8000
N_SIMS_SEARCH = 5000
N_SIMS_FINAL = 8000
DELTA_CURVE = [0, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15]
DELTA_N = [3, 4, 5, 6, 7, 8, 9, 10, 12, 15]
TARGETS = (0.60, 0.80)
N_FIXED = 40


def make_pools(delta_logit: float, rng: random.Random) -> tuple[list[float], list[float], list[float], list[float]]:
    """ABC/ABD pools of P(C|prime) and of residual Delta = P(C|prime)-P(C|none)."""
    lp0 = logit(P0)
    inv_p = 1.0 / N_PRIME
    inv_n = 1.0 / N_NONE
    half = POOL
    abc_p, abd_p, abc_d, abd_d = [], [], [], []
    for _ in range(half):
        u = rng.gauss(0.0, LOGIT_SD)
        p_none = invlogit(lp0 + u)
        p_prime = invlogit(lp0 + u + delta_logit)
        k_p = binomial(rng, N_PRIME, p_prime) * inv_p
        k_n = binomial(rng, N_NONE, p_none) * inv_n
        abc_p.append(k_p)
        abc_d.append(k_p - k_n)
    for _ in range(half):
        u = rng.gauss(0.0, LOGIT_SD)
        p_none = invlogit(lp0 + u)
        p_prime = invlogit(lp0 + u - delta_logit)
        k_p = binomial(rng, N_PRIME, p_prime) * inv_p
        k_n = binomial(rng, N_NONE, p_none) * inv_n
        abd_p.append(k_p)
        abd_d.append(k_p - k_n)
    return abc_p, abd_p, abc_d, abd_d


def moments(xs: list[float]) -> tuple[float, float]:
    n = len(xs)
    mu = sum(xs) / n
    var = sum((x - mu) ** 2 for x in xs) / (n - 1)
    return mu, math.sqrt(var)


def two_sample_power(
    pool_a: list[float],
    pool_b: list[float],
    n_per: int,
    n_sims: int,
    rng: random.Random,
    higher_is_better: bool = True,
) -> float:
    """Pooled two-sample t, require mean_a > mean_b (or the reverse)."""
    if n_per < 2:
        return 0.0
    df = 2 * n_per - 2
    n_ok = 0
    na = len(pool_a)
    nb = len(pool_b)
    for _ in range(n_sims):
        s1 = sq1 = 0.0
        s2 = sq2 = 0.0
        for _i in range(n_per):
            v = pool_a[rng.randrange(na)]
            s1 += v
            sq1 += v * v
            w = pool_b[rng.randrange(nb)]
            s2 += w
            sq2 += w * w
        m1 = s1 / n_per
        m2 = s2 / n_per
        v1 = (sq1 - s1 * s1 / n_per) / (n_per - 1)
        v2 = (sq2 - s2 * s2 / n_per) / (n_per - 1)
        sp = ((n_per - 1) * v1 + (n_per - 1) * v2) / df
        se = math.sqrt(max(sp, 0.0) * 2.0 / n_per)
        if se <= 1e-15:
            p_two = 0.0 if abs(m1 - m2) > 1e-15 else 1.0
        else:
            p_two = t_two_sided_p((m1 - m2) / se, df)
        if p_two < 0.05:
            if higher_is_better and m1 > m2:
                n_ok += 1
            elif (not higher_is_better) and m1 < m2:
                n_ok += 1
    return n_ok / n_sims


def one_sample_signed_power(pool: list[float], n_people: int, n_sims: int, rng: random.Random) -> float:
    df = n_people - 1
    n_ok = 0
    p_len = len(pool)
    for _ in range(n_sims):
        s = sq = 0.0
        for _i in range(n_people):
            v = pool[rng.randrange(p_len)]
            s += v
            sq += v * v
        mean = s / n_people
        var = (sq - s * s / n_people) / df
        se = math.sqrt(max(var, 0.0) / n_people)
        if se <= 1e-15:
            p_two = 0.0 if abs(mean) > 1e-15 else 1.0
        else:
            p_two = t_two_sided_p(mean / se, df)
        if p_two < 0.05 and mean > 0.0:
            n_ok += 1
    return n_ok / n_sims


def walk_two_sample(pool_a, pool_b, mu_diff, sigma, target, rng) -> dict:
    # Analytic N from equivalent one-sample: ncp = (diff/2) * sqrt(N) / (sigma/sqrt(2))? 
    # Two-sample: ncp = diff / (sigma * 2 / sqrt(N)) = diff * sqrt(N) / (2 sigma)
    # Compare residual one-sample ncp = mu * sqrt(N) / sigma_d
    n0 = N_MIN if N_MIN % 2 == 0 else N_MIN + 1
    while n0 <= N_MAX:
        n_per = n0 // 2
        ncp = mu_diff / (sigma * math.sqrt(2.0 / n_per)) if sigma > 0 else 0.0
        pow_a = 1.0 - ncdf(t_crit_cached(n0 - 1) - ncp)  # slightly wrong df but ok start
        # Use df = n0-2 via a local crit
        tc = t_crit_cached(max(n0 - 1, 3))
        pow_a = 1.0 - ncdf(tc - ncp)
        if pow_a >= target:
            break
        n0 += 2
    else:
        n0 = N_MAX

    def eval_n(n: int, sims: int) -> float:
        return two_sample_power(pool_a, pool_b, n // 2, sims, rng, True)

    n = n0
    p = eval_n(n, N_SIMS_SEARCH)
    if p >= target:
        while n - 2 >= N_MIN:
            p2 = eval_n(n - 2, N_SIMS_SEARCH)
            if p2 >= target:
                n -= 2
                p = p2
            else:
                break
    else:
        while n + 2 <= N_MAX:
            n += 2
            p = eval_n(n, N_SIMS_SEARCH)
            if p >= target:
                break
    p_final = eval_n(n, N_SIMS_FINAL)
    while p_final < target and n + 2 <= N_MAX:
        n += 2
        p_final = eval_n(n, N_SIMS_FINAL)
    return {
        "n": n,
        "power": p_final,
        "power_mc_se": math.sqrt(p_final * (1.0 - p_final) / N_SIMS_FINAL),
        "n_analytic": n0,
        "capped": n >= N_MAX and p_final < target,
    }


def main() -> None:
    rng = random.Random(SEED)
    curve = []
    n_needed = []

    for d in DELTA_CURVE:
        print(f"pool d={d} pp ...", flush=True)
        dl = delta_logit_from_pp(d)
        abc_p, abd_p, abc_d, abd_d = make_pools(dl, rng)
        mu_abc, sd_abc = moments(abc_p)
        mu_abd, sd_abd = moments(abd_p)
        mu_d_abc, sd_d_abc = moments(abc_d)
        signed = [x for x in abc_d] + [-x for x in abd_d]
        mu_star, sd_star = moments(signed)

        n_per = N_FIXED // 2
        p_group = two_sample_power(abc_p, abd_p, n_per, N_SIMS_CURVE, rng, True)
        p_resid = one_sample_signed_power(signed, N_FIXED, N_SIMS_CURVE, rng)
        # Two-sample on residuals should match signed one-sample
        p_resid_2s = two_sample_power(abc_d, abd_d, n_per, N_SIMS_CURVE, rng, True)
        # Pooled 24-trial P(C): (12*p_prime + 12*p_none)/24 = (p_prime + p_none)/2
        abc_all = [(abc_p[i] + (abc_p[i] - abc_d[i])) / 2.0 for i in range(len(abc_p))]
        abd_all = [(abd_p[i] + (abd_p[i] - abd_d[i])) / 2.0 for i in range(len(abd_p))]
        # p_none = p_prime - delta, so (p_prime + p_none)/2
        p_pooled = two_sample_power(abc_all, abd_all, n_per, N_SIMS_CURVE, rng, True)

        rec = {
            "delta_pp": d,
            "delta_logit": dl,
            "mu_p_abc": mu_abc * 100.0,
            "mu_p_abd": mu_abd * 100.0,
            "gap_pp": (mu_abc - mu_abd) * 100.0,
            "sd_p_pp": ((sd_abc + sd_abd) / 2.0) * 100.0,
            "mu_star_pp": mu_star * 100.0,
            "sd_star_pp": sd_star * 100.0,
            "power_n40_grouping": p_group,
            "power_n40_residual": p_resid,
            "power_n40_residual_2s": p_resid_2s,
            "power_n40_pooled24": p_pooled,
        }
        curve.append(rec)
        print(
            f"  N=40  group {p_group*100:.1f}%  residual {p_resid*100:.1f}%  "
            f"resid2s {p_resid_2s*100:.1f}%  pooled {p_pooled*100:.1f}%  "
            f"gap {rec['gap_pp']:.2f} pp",
            flush=True,
        )

        if d in DELTA_N:
            sigma = (sd_abc + sd_abd) / 2.0
            mu_diff = mu_abc - mu_abd
            rec_n = {"delta_pp": d, "gap_pp": rec["gap_pp"], "sd_p_pp": rec["sd_p_pp"], "targets": {}}
            for tgt in TARGETS:
                found = walk_two_sample(abc_p, abd_p, mu_diff, sigma, tgt, rng)
                rec_n["targets"][str(int(tgt * 100))] = found
                print(
                    f"  grouping N for {int(tgt*100)}% = {found['n']}  power={found['power']*100:.1f}%",
                    flush=True,
                )
            n_needed.append(rec_n)

    out = {
        "seed": SEED,
        "n_fixed": N_FIXED,
        "n_prime": N_PRIME,
        "n_none": N_NONE,
        "curve": curve,
        "n_needed_grouping": n_needed,
        "residual_n_needed_prior": {
            "3": {"60": 252, "80": 400},
            "4": {"60": 134, "80": 212},
            "5": {"60": 84, "80": 134},
            "6": {"60": 60, "80": 96},
            "7": {"60": 44, "80": 70},
            "8": {"60": 34, "80": 52},
            "9": {"60": 28, "80": 46},
            "10": {"60": 24, "80": 36},
            "12": {"60": 18, "80": 26},
            "15": {"60": 12, "80": 18},
        },
    }
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")

    print("\n=== Power at N=40, 12+12 ===")
    print(f"{'d':>4} {'gap':>7} {'group':>8} {'resid':>8} {'pool24':>8}")
    for r in curve:
        print(
            f"{r['delta_pp']:4d} {r['gap_pp']:6.2f} "
            f"{r['power_n40_grouping']*100:7.1f}% "
            f"{r['power_n40_residual']*100:7.1f}% "
            f"{r['power_n40_pooled24']*100:7.1f}%"
        )
    print("\n=== N needed, grouping ABC vs ABD on A-prime ===")
    print(f"{'d':>4} {'N60':>6} {'pow':>7} {'N80':>6} {'pow':>7} {'vs resid 80':>12}")
    prior = out["residual_n_needed_prior"]
    for rec in n_needed:
        t60 = rec["targets"]["60"]
        t80 = rec["targets"]["80"]
        old80 = prior[str(rec["delta_pp"])]["80"]
        print(
            f"{rec['delta_pp']:4d} {t60['n']:6d} {t60['power']*100:6.1f}% "
            f"{t80['n']:6d} {t80['power']*100:6.1f}% "
            f"{old80:6d}->{t80['n']:<4d}"
        )
    print(f"\nwrote {OUT}")


if __name__ == "__main__":
    main()
